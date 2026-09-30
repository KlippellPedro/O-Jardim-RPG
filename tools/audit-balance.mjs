// Auditoria de balanceamento: gera data/regras/balanceamento-referencia-v1.json e
// data/regras/relatorio-balanceamento-v1.md. Roda com o carregador de TypeScript
// (`npm run audit:balance`) porque usa a MESMA fórmula da ficha para Vida, Mana,
// Estamina e Defesa (src/services/referenciaBalanceamento.ts), em vez de uma
// cópia que descola. Com `--check` só confere se os arquivos estão em dia.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ATRIBUTOS_DE_REFERENCIA,
  ATRIBUTO_PRINCIPAL_BASE,
  CLASSE_NEUTRA,
  NIVEIS_DE_REFERENCIA,
  RODADAS_DO_ENCONTRO_PADRAO,
  TAMANHO_DO_GRUPO,
  derivadosDeReferencia,
  mediaDeDados,
  referenciaDoNivel,
} from '../src/services/referenciaBalanceamento.ts';
import { grausDeMaestria } from '../src/services/maestriaClasse.ts';
import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE } from '../src/services/progressaoNiveis.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const read = (...parts) => JSON.parse(fs.readFileSync(path.join(root, ...parts), 'utf8'));
const classes = read('data', 'ficha', 'classes.json');
const catalog = read('data', 'loja', 'catalogo.json').entradas || [];
const spells = read('data', 'ficha', 'magias.json').magias || [];
const levels = [...NIVEIS_DE_REFERENCIA];

function rewardCount(clazz, level, type) {
  return (clazz.progressao || []).reduce((total, milestone) => milestone.nivel <= Math.min(level, NIVEL_CONTEUDO_CLASSE)
    ? total + (milestone.recompensas || []).filter((reward) => reward.tipo === type).length
    : total, 0);
}

function reference(clazz, level) {
  const derivados = derivadosDeReferencia(clazz, level);
  return {
    nivel: level,
    vida: derivados.vida,
    mana: derivados.mana,
    estamina: derivados.estamina,
    defesaNatural: derivados.defesaNatural,
    poderes: rewardCount(clazz, level, 'poder'),
    // Os graus de perícia da Maestria (níveis 30, 40 e 50 da classe) entram junto.
    grausTreinamento: rewardCount(clazz, level, 'grau_pericia') + grausDeMaestria(Math.min(level, NIVEL_MAXIMO_CLASSE)),
    habilidades: rewardCount(clazz, level, 'habilidade') + rewardCount(clazz, level, 'habilidade_final'),
  };
}

const classAudit = classes.map((clazz) => ({
  id: clazz.id,
  titulo: clazz.titulo,
  categoria: clazz.categoria === 'padrao' ? 'comum' : 'especial',
  recursosPorNivel: Number(clazz.vida) + Number(clazz.mana) + Number(clazz.estamina ?? 0),
  orcamentoEsperado: 9,
  referencias: levels.map((level) => reference(clazz, level)),
  // Habilidade em estágios e habilidade com catálogo próprio (as Engenhocas)
  // guardam o texto fora de `descricao`, então varrer só ela deixava passar a
  // maior parte do que a classe realmente faz.
  alertasTexto: [...(clazz.habilidades || []), ...(clazz.poderes || [])]
    .filter((item) => [
      item.descricao,
      ...(item.estagios || []).map((estagio) => estagio.descricao),
      ...(item.opcoes || []).map((opcao) => opcao.descricao),
    ].some((texto) => /ação extra|reação extra|\bdobra|\btriplica|automaticamente|sem limite|qualquer dano/i.test(texto || '')))
    .map((item) => item.titulo),
}));

const weapons = catalog.filter((item) => item.tipo === 'arma').map((entry) => {
  const content = entry.conteudo || {};
  const normal = mediaDeDados(content.dano);
  const multiplier = Math.max(2, Number(content.multiplicador_critico) || 2);
  const chance = Math.max(1, Math.min(20, 21 - Number(content.margem_ameaca || 20))) / 20;
  return {
    id: entry.id,
    titulo: entry.titulo,
    raridade: content.raridade || 'sem raridade',
    dano: content.dano,
    mediaNormal: normal,
    mediaComCritico: normal === null ? null : normal * (1 + chance * (multiplier - 1)),
    nivelRecomendado: content.nivel_recomendado || null,
    autorizacaoMestre: Boolean(content.requer_autorizacao_mestre),
  };
});

const spellAudit = spells.map((spell) => {
  const circle = Number(spell.circulo);
  const damageAverage = mediaDeDados(spell.dano);
  const numbered = Number.isInteger(circle) && circle >= 1 && circle <= 10;
  const issues = [];
  if (typeof spell.circulo === 'number' && !numbered) issues.push('círculo fora de 1 a 10');
  if (spell.ataque && spell.perfil !== 'alvo') issues.push('crítico fora de alvo único');
  if (spell.circulo === 'ritual' && !spell.somente_mestre) issues.push('ritual sem concessão');
  return {
    id: spell.id,
    titulo: spell.titulo,
    circulo: spell.circulo,
    perfil: spell.perfil,
    custoMana: spell.custo_mana,
    dano: spell.dano || null,
    mediaDano: damageAverage,
    problemas: issues,
  };
});

const invalidClasses = classAudit.filter((item) => item.recursosPorNivel !== item.orcamentoEsperado);
const unboundedWeapons = weapons.filter((item) => item.mediaNormal !== null && item.mediaNormal > 75 && !item.autorizacaoMestre);
const highestWeapons = weapons.filter((item) => item.mediaNormal !== null).sort((a, b) => b.mediaNormal - a.mediaNormal).slice(0, 15);
const invalidSpells = spellAudit.filter((item) => item.problemas.length > 0);
const commonClasses = classes.filter((clazz) => clazz.categoria === 'padrao');
const npcReference = levels.map((level) => referenciaDoNivel(level, commonClasses, weapons));

// Vida mediana do bestiário por faixa de nível, contra a Vida de inimigo padrão
// do nível mais alto da faixa: mostra se os monstros escritos acompanham a curva.
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};
const monsters = catalog.filter((item) => item.tipo === 'monstro' && Number(item.conteudo?.nivel) > 0 && Number(item.conteudo?.pv) > 0);
const bestiaryBands = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50]].flatMap(([from, to]) => {
  const inBand = monsters.filter((item) => item.conteudo.nivel >= from && item.conteudo.nivel <= to);
  if (!inBand.length) return [];
  return [{
    faixa: `${from} a ${to}`,
    monstros: inBand.length,
    vidaMediana: median(inBand.map((item) => Number(item.conteudo.pv))),
    vidaDeInimigoPadraoNoNivel: npcReference.find((ref) => ref.nivel === to)?.vidaDeInimigoPadrao ?? null,
  }];
});
const highestMonsterLevel = Math.max(0, ...monsters.map((item) => Number(item.conteudo.nivel)));

const attributeLine = Object.entries({
  Força: ATRIBUTOS_DE_REFERENCIA.forca,
  Destreza: ATRIBUTOS_DE_REFERENCIA.destreza,
  Constituição: ATRIBUTOS_DE_REFERENCIA.constituicao,
  Inteligência: ATRIBUTOS_DE_REFERENCIA.inteligencia,
  Sabedoria: ATRIBUTOS_DE_REFERENCIA.sabedoria,
  Carisma: ATRIBUTOS_DE_REFERENCIA.carisma,
  Fluxo: ATRIBUTOS_DE_REFERENCIA.fluxo,
}).map(([nome, valor]) => `${nome} ${valor}`).join(', ').replace(/, ([^,]*)$/, ' e $1');

const report = {
  levels,
  assumptions: {
    attributes: `${attributeLine}. Os atributos ficam fixos na tabela de classes, para compará-las entre si.`,
    formula: 'Vida, Mana, Estamina e Defesa saem da mesma fórmula da ficha (calcularDerivadosComClasses), sem raça e com a Maestria da classe (níveis 25, 35 e 45).',
    multiclass: `Cada classe vai até o nível ${NIVEL_MAXIMO_CLASSE}, o teto de uma classe. Depois disso a referência soma níveis de uma classe neutra com ${CLASSE_NEUTRA.vida} de Vida, ${CLASSE_NEUTRA.mana} de Mana e ${CLASSE_NEUTRA.estamina} de Estamina por nível.`,
    npc: `O NPC de referência tem Força ${ATRIBUTO_PRINCIPAL_BASE} (atributo principal) e os aumentos de nível vão em rodízio: metade na Força, um quarto na Constituição e um quarto na Destreza. Ataca com a melhor arma que o nível alcança (Comum no 1, Incomum no 5, Rara no 10, Épica no 15, Lendária no 25 e Relíquia da Criação no 35) e com o maior grau de perícia que o nível permite. A Vida de inimigo padrão é a que aguenta ${RODADAS_DO_ENCONTRO_PADRAO} rodadas de um grupo de ${TAMANHO_DO_GRUPO}.`,
    scope: 'Mede recursos, vagas, dano médio e palavras de risco. Efeitos narrativos e controle ainda exigem playtest.',
  },
  summary: { classes: classAudit.length, weapons: weapons.length, spells: spellAudit.length, invalidResourceBudgets: invalidClasses.length, unboundedWeapons: unboundedWeapons.length, invalidSpells: invalidSpells.length },
  classes: classAudit,
  referenciaNpc: npcReference,
  bestiario: { nivelMaisAlto: highestMonsterLevel, faixas: bestiaryBands },
  spells: spellAudit,
  highestWeapons,
};

const levelHeaders = levels.map((level) => `N${level}`).join(' | ');
const levelSeparators = levels.map(() => '---:').join(' | ');
const classLines = classAudit.map((item) => `| ${item.titulo} | ${item.categoria} | ${item.recursosPorNivel} | ${item.referencias.map((ref) => `${ref.vida}/${ref.mana}/${ref.estamina}`).join(' | ')} | ${item.alertasTexto.join(', ') || 'nenhum'} |`).join('\n');
const npcLines = npcReference.map((ref) => `| ${ref.nivel} | ${ref.patamar || 'padrão'} | ${ref.vida.minima} / ${ref.vida.media} / ${ref.vida.maxima} | ${ref.defesaNatural} | +${ref.bonusDeAtaque} | ${ref.danoPorAcerto} | ${ref.dt.padrao} | ${ref.dt.extrema} | ${ref.vidaDeInimigoPadrao} |`).join('\n');
const bestiaryLines = bestiaryBands.map((band) => `| ${band.faixa} | ${band.monstros} | ${band.vidaMediana} | ${band.vidaDeInimigoPadraoNoNivel} |`).join('\n');
const weaponLines = highestWeapons.map((item) => `| ${item.titulo} | ${item.raridade} | ${item.dano} | ${item.mediaNormal?.toFixed(1)} | ${item.mediaComCritico?.toFixed(1)} | ${item.nivelRecomendado || 'não definido'} | ${item.autorizacaoMestre ? 'sim' : 'não'} |`).join('\n');
const spellLines = spellAudit.map((item) => `| ${item.titulo} | ${item.circulo} | ${item.perfil} | ${item.custoMana} | ${item.dano || 'sem dano'} | ${item.mediaDano?.toFixed(1) || 'n/a'} | ${item.problemas.join(', ') || 'nenhum'} |`).join('\n');
const markdown = `# Relatório de balanceamento v1\n\nGerado por \`npm run audit:balance\`. Esta é uma verificação quantitativa, não substitui playtest.\n\n## Premissas\n\n- ${report.assumptions.attributes}\n- ${report.assumptions.formula}\n- ${report.assumptions.multiclass}\n- ${report.assumptions.scope}\n\n## Resultado automático\n\n- ${classAudit.length} classes analisadas.\n- ${weapons.length} armas analisadas.\n- ${invalidClasses.length} classes fora do orçamento de 9 pontos de Vida + Mana + Estamina.\n- ${unboundedWeapons.length} armas acima de 75 de dano médio sem bloqueio do Mestre.\n\nCada célula mostra \`Vida/Mana/Estamina\`. As vagas de poder chegam a 8 no nível 20 e não mudam depois; ficam no JSON.\n\n| Classe | Tipo | Orçamento | ${levelHeaders} | Alertas qualitativos |\n|---|---|---:|${levelSeparators}|---|\n${classLines}\n\n## Referência para NPCs e inimigos\n\n${report.assumptions.npc}\n\nA Vida mostra a menor, a média e a maior entre as ${commonClasses.length} classes comuns. O dano da arma para de subir no nível 35 (as relíquias da criação): daí em diante quem escala é o modificador de atributo, e a Vida de inimigo padrão cresce com ele.\n\n| Nível | Patamar | Vida (mín / média / máx) | Defesa | Ataque | Dano por acerto | DT padrão | DT extrema | Vida de inimigo padrão |\n|---:|---|---|---:|---:|---:|---:|---:|---:|\n${npcLines}\n\n## Bestiário contra a referência\n\nVida mediana dos monstros escritos por faixa de nível, ao lado da Vida de inimigo padrão do nível mais alto da faixa. O bestiário vai até o nível ${highestMonsterLevel}; acima disso a tabela de NPCs e inimigos é o guia. A Defesa da tabela é a natural, sem armadura: a partir do nível 29 quem investe na perícia de combate acerta quase sempre um inimigo do mesmo nível, então armadura, escudo e efeitos de cena é que sustentam a Defesa dos NPCs fortes.\n\n| Faixa de nível | Monstros | Vida mediana | Vida de inimigo padrão |\n|---|---:|---:|---:|\n${bestiaryLines}\n\n## Maiores danos do arsenal\n\n| Arma | Raridade | Dano | Média normal | Média com crítico | Nível recomendado | Mestre |\n|---|---|---|---:|---:|---:|---|\n${weaponLines}\n\n## Interpretação\n\nO orçamento estrutural das classes está fechado. Alertas qualitativos indicam efeitos que alteram economia de ações ou escala e precisam de cenários de mesa. Armas lendárias normalizadas começam no nível 25; relíquias da criação no 35 e exigem autorização do Mestre.\n`;
const markdownWithSpells = markdown.replace('\n## Interpretação', `\n## Magias publicadas para playtest\n\n- ${spellAudit.length} magias analisadas.\n- ${invalidSpells.length} magias fora do custo, teto de dano, crítico ou acesso ritual.\n\n| Magia | Círculo | Perfil | Mana | Dano | Média | Alertas |\n|---|---:|---|---:|---|---:|---|\n${spellLines}\n\n## Interpretação`);

const jsonPath = path.join(root, 'data', 'regras', 'balanceamento-referencia-v1.json');
const markdownPath = path.join(root, 'data', 'regras', 'relatorio-balanceamento-v1.md');
const jsonOutput = `${JSON.stringify(report, null, 2)}\n`;

if (checkOnly) {
  const emDia = fs.existsSync(jsonPath) && fs.existsSync(markdownPath)
    && fs.readFileSync(jsonPath, 'utf8') === jsonOutput
    && fs.readFileSync(markdownPath, 'utf8') === markdownWithSpells;
  if (!emDia) {
    console.error('A referência de balanceamento está desatualizada. Rode `npm run audit:balance` e revise o resultado.');
    process.exitCode = 1;
  } else console.log('A referência de balanceamento está em dia.');
} else {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, jsonOutput, 'utf8');
  fs.writeFileSync(markdownPath, markdownWithSpells, 'utf8');
}

if (invalidClasses.length || unboundedWeapons.length || invalidSpells.length) {
  console.error(`Auditoria reprovada: ${invalidClasses.length} classes; ${unboundedWeapons.length} armas sem limite; ${invalidSpells.length} magias fora da curva.`);
  process.exitCode = 1;
} else if (!checkOnly) console.log(`Auditoria aprovada: ${classAudit.length} classes, ${weapons.length} armas e ${spellAudit.length} magias.`);
