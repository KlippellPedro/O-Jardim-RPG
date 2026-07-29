import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => JSON.parse(fs.readFileSync(path.join(root, ...parts), 'utf8'));
const classes = read('data', 'ficha', 'classes.json');
const catalog = read('bots', 'banqueiro', 'data', 'catalogo.json').entradas || [];
const spells = read('data', 'ficha', 'magias.json').magias || [];
const levels = [1, 5, 10, 15, 20, 30, 40];

function diceAverage(expression) {
  const text = String(expression || '').replace(/\s+/g, '');
  let average = 0;
  let found = false;
  for (const match of text.matchAll(/(\d+)d(\d+)/gi)) {
    average += Number(match[1]) * (Number(match[2]) + 1) / 2;
    found = true;
  }
  const withoutDice = text.replace(/\d+d\d+/gi, '');
  for (const match of withoutDice.matchAll(/([+-])(\d+(?:[.,]\d+)?)/g)) {
    average += (match[1] === '-' ? -1 : 1) * Number(match[2].replace(',', '.'));
  }
  return found ? Math.max(0, average) : null;
}

function rewardCount(clazz, level, type) {
  return (clazz.progressao || []).reduce((total, milestone) => milestone.nivel <= Math.min(level, 20)
    ? total + (milestone.recompensas || []).filter((reward) => reward.tipo === type).length
    : total, 0);
}

function reference(clazz, level) {
  const own = Math.min(level, 20);
  const neutral = Math.max(0, level - 20);
  return {
    nivel: level,
    vida: Math.round(16 + Math.max(0, own - 1) * (Number(clazz.vida) + 2) + neutral * 5.5),
    mana: Math.round(8 + Math.max(0, own - 1) * Number(clazz.mana) + neutral * 3.5),
    defesaNatural: 11 + Math.floor(level / 2),
    poderes: rewardCount(clazz, level, 'poder'),
    grausTreinamento: rewardCount(clazz, level, 'grau_pericia'),
    habilidades: rewardCount(clazz, level, 'habilidade') + rewardCount(clazz, level, 'habilidade_final'),
  };
}

const classAudit = classes.map((clazz) => ({
  id: clazz.id,
  titulo: clazz.titulo,
  categoria: clazz.categoria === 'padrao' ? 'comum' : 'especial',
  recursosPorNivel: Number(clazz.vida) + Number(clazz.mana),
  referencias: levels.map((level) => reference(clazz, level)),
  alertasTexto: [...(clazz.habilidades || []), ...(clazz.poderes || [])]
    .filter((item) => /ação extra|reação extra|dobra|triplica|automaticamente|sem limite|qualquer dano/i.test(item.descricao || ''))
    .map((item) => item.titulo),
}));

const weapons = catalog.filter((item) => item.tipo === 'arma').map((entry) => {
  const content = entry.conteudo || {};
  const normal = diceAverage(content.dano);
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
  const damageAverage = diceAverage(spell.dano);
  const numbered = Number.isInteger(circle) && circle >= 1 && circle <= 5;
  const issues = [];
  if (numbered && Number(spell.custo_mana) !== circle * 2) issues.push('custo fora da curva');
  if (numbered && damageAverage !== null && damageAverage > circle * 9) issues.push('dano acima do teto');
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

const invalidClasses = classAudit.filter((item) => item.recursosPorNivel !== 7);
const unboundedWeapons = weapons.filter((item) => item.mediaNormal !== null && item.mediaNormal > 75 && !item.autorizacaoMestre);
const highestWeapons = weapons.filter((item) => item.mediaNormal !== null).sort((a, b) => b.mediaNormal - a.mediaNormal).slice(0, 15);
const invalidSpells = spellAudit.filter((item) => item.problemas.length > 0);
const report = {
  generatedAt: new Date().toISOString(),
  levels,
  assumptions: {
    attributes: 'Força 12, Destreza 14, Constituição 14, Inteligência 13, Sabedoria 10, Carisma 8 e Fluxo 8.',
    multiclass: 'Depois do nível 20, a referência usa uma segunda classe neutra com 3,5 de Vida e 3,5 de Mana por nível.',
    scope: 'Mede recursos, vagas, dano médio e palavras de risco. Efeitos narrativos e controle ainda exigem playtest.',
  },
  summary: { classes: classAudit.length, weapons: weapons.length, spells: spellAudit.length, invalidResourceBudgets: invalidClasses.length, unboundedWeapons: unboundedWeapons.length, invalidSpells: invalidSpells.length },
  classes: classAudit,
  spells: spellAudit,
  highestWeapons,
};

const jsonPath = path.join(root, 'data', 'regras', 'balanceamento-referencia-v1.json');
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const levelHeaders = levels.map((level) => `N${level}`).join(' | ');
const levelSeparators = levels.map(() => '---:').join(' | ');
const classLines = classAudit.map((item) => `| ${item.titulo} | ${item.categoria} | ${item.recursosPorNivel} | ${item.referencias.map((ref) => `${ref.vida}/${ref.mana}/${ref.poderes}`).join(' | ')} | ${item.alertasTexto.join(', ') || 'nenhum'} |`).join('\n');
const weaponLines = highestWeapons.map((item) => `| ${item.titulo} | ${item.raridade} | ${item.dano} | ${item.mediaNormal?.toFixed(1)} | ${item.mediaComCritico?.toFixed(1)} | ${item.nivelRecomendado || 'não definido'} | ${item.autorizacaoMestre ? 'sim' : 'não'} |`).join('\n');
const spellLines = spellAudit.map((item) => `| ${item.titulo} | ${item.circulo} | ${item.perfil} | ${item.custoMana} | ${item.dano || 'sem dano'} | ${item.mediaDano?.toFixed(1) || 'n/a'} | ${item.problemas.join(', ') || 'nenhum'} |`).join('\n');
const markdown = `# Relatório de balanceamento v1\n\nGerado por \`npm run audit:balance\`. Esta é uma verificação quantitativa, não substitui playtest.\n\n## Premissas\n\n- ${report.assumptions.attributes}\n- ${report.assumptions.multiclass}\n- ${report.assumptions.scope}\n\n## Resultado automático\n\n- ${classAudit.length} classes analisadas.\n- ${weapons.length} armas analisadas.\n- ${invalidClasses.length} classes fora do orçamento de 7 pontos de Vida + Mana.\n- ${unboundedWeapons.length} armas acima de 75 de dano médio sem bloqueio do Mestre.\n\nCada célula mostra \`Vida/Mana/vagas de poder\`.\n\n| Classe | Tipo | Orçamento | ${levelHeaders} | Alertas qualitativos |\n|---|---|---:|${levelSeparators}|---|\n${classLines}\n\n## Maiores danos do arsenal\n\n| Arma | Raridade | Dano | Média normal | Média com crítico | Nível recomendado | Mestre |\n|---|---|---|---:|---:|---:|---|\n${weaponLines}\n\n## Interpretação\n\nO orçamento estrutural das classes está fechado. Alertas qualitativos indicam efeitos que alteram economia de ações ou escala e precisam de cenários de mesa. Armas lendárias normalizadas começam no nível 25; relíquias da criação no 35 e exigem autorização do Mestre.\n`;
const markdownWithSpells = markdown.replace('\n## Interpretação', `\n## Magias publicadas para playtest\n\n- ${spellAudit.length} magias analisadas.\n- ${invalidSpells.length} magias fora do custo, teto de dano, crítico ou acesso ritual.\n\n| Magia | Círculo | Perfil | Mana | Dano | Média | Alertas |\n|---|---:|---|---:|---|---:|---|\n${spellLines}\n\n## Interpretação`);
const markdownPath = path.join(root, 'docs', 'regras', 'relatorio-balanceamento-v1.md');
fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
fs.writeFileSync(markdownPath, markdownWithSpells, 'utf8');

if (invalidClasses.length || unboundedWeapons.length || invalidSpells.length) {
  console.error(`Auditoria reprovada: ${invalidClasses.length} classes; ${unboundedWeapons.length} armas sem limite; ${invalidSpells.length} magias fora da curva.`);
  process.exitCode = 1;
} else console.log(`Auditoria aprovada: ${classAudit.length} classes, ${weapons.length} armas e ${spellAudit.length} magias.`);
