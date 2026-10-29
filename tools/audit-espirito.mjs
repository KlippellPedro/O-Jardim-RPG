// Auditoria de equilíbrio das habilidades do Espírito (as 26 marcas e os degraus das três
// Naturezas). Compara o que cada habilidade faz com a referência do próprio jogo,
// data/regras/balanceamento-referencia-v1.json: o dano de um acerto de NPC e a Vida de
// uma classe, por nível. Também aplica algumas regras de desenho que um número sozinho não pega.
//
//   node tools/audit-espirito.mjs          tabela legível
//   node tools/audit-espirito.mjs --json   relatório em JSON (os testes usam este)
//   node tools/audit-espirito.mjs --check  sai com erro se houver violação
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (...partes) => JSON.parse(fs.readFileSync(path.join(raiz, ...partes), 'utf8'));

const referencia = ler('data', 'regras', 'balanceamento-referencia-v1.json');
const espirito = ler('data', 'ficha', 'racas.json').find((raca) => raca.id === 'espirito');

/** Modificador de atributo que a referência supõe para "+ Mod.Sabedoria". */
const MOD_SABEDORIA = 3;
/** Uma habilidade só de dados não deve passar de um acerto de NPC do mesmo nível. */
const TETO_EM_ACERTOS = 1;
/** Efeito de combate de 1 minuto cobre o encontro inteiro (a referência manda 4,5 rodadas). */
const DURACOES_LONGAS_PERMITIDAS = new Set(['mente-na-rede']);
const NIVEL_DO_ULTIMO_DEGRAU = 60;

/** O que a magia rende pelo mesmo custo: mediana do dano médio por círculo em data/ficha/magias.json
 * (custo base do círculo → dano). É a régua do Guia das classes estendida até o 10º círculo. */
const MAGIA_POR_MANA = { 2: 5, 4: 9, 7: 11, 10: 18, 14: 20, 19: 27, 25: 28, 32: 36, 42: 36, 55: 55 };
/** A tabela é uma mediana, então a régua tem folga: até uma vez e meia a magia do mesmo custo. Acima
 * disso, o custo sobe (questionário final, rodada 5: "subir o custo"). */
const TETO_EM_MAGIAS = 1.5;
/** As convenções do questionário final (perguntas 8 e 20) valem para os Pecados, as Virtudes e as
 * escadas demoníaca e angelical. As marcas naturais passaram pela revisão das raças. */
const NATUREZAS_COM_CONVENCOES = new Set(['demoniaca', 'angelical']);

const acertoPorNivel = Object.fromEntries(referencia.referenciaNpc.map((item) => [item.nivel, item.danoPorAcerto]));
const vidaPorNivel = Object.fromEntries(referencia.classes[0].referencias.map((item) => [item.nivel, item.vida]));

function interpolar(tabela, nivel) {
  const chaves = Object.keys(tabela).map(Number).sort((a, b) => a - b);
  if (nivel <= chaves[0]) return tabela[chaves[0]];
  for (let i = 0; i < chaves.length - 1; i += 1) {
    const [a, b] = [chaves[i], chaves[i + 1]];
    if (nivel >= a && nivel <= b) return tabela[a] + ((tabela[b] - tabela[a]) * (nivel - a)) / (b - a);
  }
  return tabela[chaves[chaves.length - 1]];
}

/** Além do 10º círculo, a magia rende cerca de 1 de dano por Mana. */
const magiaDeMesmoCusto = (mana) => (mana > 55 ? mana : interpolar(MAGIA_POR_MANA, mana));

/** Maior média de dados do texto ("8d6", "2d6 + Mod.Sabedoria"), ou 0 se não houver dado. */
function maiorMediaDeDados(texto) {
  let maior = 0;
  for (const m of texto.matchAll(/(\d+)d(\d+)(\s*\+\s*Mod\.Sabedoria)?/g)) {
    const media = (Number(m[1]) * (Number(m[2]) + 1)) / 2 + (m[3] ? MOD_SABEDORIA : 0);
    maior = Math.max(maior, media);
  }
  return maior;
}

function habilidades() {
  const lista = [];
  for (const marca of espirito.variantes) {
    for (const traco of marca.caracteristicas) lista.push({ origem: marca.titulo, natureza: marca.natureza, traco });
  }
  for (const degrau of espirito.estagios) {
    for (const traco of degrau.caracteristicas) lista.push({ origem: degrau.titulo, natureza: degrau.natureza, traco });
  }
  // A Possessão e a Encarnação moram na própria Natureza, fora das escadas.
  for (const natureza of espirito.naturezas) {
    for (const traco of natureza.caracteristicas || []) lista.push({ origem: natureza.titulo, natureza: natureza.id, traco });
  }
  return lista;
}

export function analisarEspirito() {
  const linhas = [];
  const violacoes = [];

  for (const { origem, natureza, traco } of habilidades()) {
    const nivel = traco.nivel_minimo;
    const texto = traco.descricao;
    const media = maiorMediaDeDados(texto);
    const acerto = interpolar(acertoPorNivel, nivel);
    const vida = interpolar(vidaPorNivel, nivel);
    const sessaoCurta = traco.recuperacao === 'sessao';
    const mana = Number(traco.custo_mana) || 0;

    linhas.push({
      id: traco.id,
      titulo: traco.titulo,
      origem,
      nivel,
      mana,
      usos: traco.usos ? `${traco.usos}/${sessaoCurta ? 'sessão' : 'cena'}` : '-',
      mediaDeDados: media,
      emAcertosDeNpc: media ? Number((media / acerto).toFixed(2)) : 0,
      emPorcentoDaVida: media ? Math.round((100 * media) / vida) : 0,
      // Quantas magias do mesmo custo a habilidade rende (ver docs/propostas/revisao-espirito-2026-10).
      emMagiaDeMesmoCusto: media && mana ? Number((media / magiaDeMesmoCusto(mana)).toFixed(2)) : 0,
    });

    const problema = (regra, detalhe) => violacoes.push({ id: traco.id, titulo: traco.titulo, origem, regra, detalhe });

    // R1: dados de uma única habilidade nunca passam de um acerto de NPC do nível.
    if (media > TETO_EM_ACERTOS * acerto) {
      problema('dados-acima-do-acerto', `${media} de média contra ${acerto} de um acerto de NPC no nível ${nivel}`);
    }
    // R2: efeito de combate de 1 minuto cobre o encontro inteiro e só vale para quem está na lista.
    if (/(?<!menos de )\b1 minuto\b/.test(texto) &&!DURACOES_LONGAS_PERMITIDAS.has(traco.id) && nivel >= NIVEL_DO_ULTIMO_DEGRAU) {
      problema('duracao-de-1-minuto', 'o efeito dura o encontro inteiro; use 3 rodadas');
    }
    // R3: "custa 0 Mana" sem teto de usos vira repetição infinita.
    if (/custam 0 Mana/.test(texto) && !/(uso|vez) a mais/.test(texto)) {
      problema('sem-teto-de-usos', 'característica a 0 Mana precisa dizer que ganha só um uso a mais');
    }
    // R4: no último degrau, habilidade cara tem de ser por sessão e no máximo três vezes.
    if (nivel >= NIVEL_DO_ULTIMO_DEGRAU && (Number(traco.custo_mana) || 0) >= 10) {
      if (!sessaoCurta || traco.usos > 3) problema('uso-demais-no-ultimo-degrau', 'no máximo 3 usos por sessão');
    }
    // R5: imunidade a um tipo de dano só existe no último degrau.
    if (/imune a dano/.test(texto) && nivel < NIVEL_DO_ULTIMO_DEGRAU) {
      problema('imunidade-cedo-demais', 'imunidade a dano só no nível 60');
    }
    // R6: o último degrau só vale depois da Provação.
    if (nivel >= NIVEL_DO_ULTIMO_DEGRAU && traco.requer_condicao !== 'provacao-primordial') {
      problema('sem-provacao', 'traço do nível 60 precisa exigir a Provação Primordial');
    }
    // R12: dano ou cura em dados não passa de uma vez e meia a magia do mesmo custo.
    const emMagias = linhas[linhas.length - 1].emMagiaDeMesmoCusto;
    if (emMagias > TETO_EM_MAGIAS) {
      problema('acima-da-regua', `${media} de média por ${mana} Mana rende ${emMagias} magias do mesmo custo; suba o custo`);
    }

    if (!NATUREZAS_COM_CONVENCOES.has(natureza)) continue;
    // R7: dano em mais de uma criatura dá teste, e quem passa sofre metade.
    if (/criaturas|toda criatura|até três/.test(texto) && /(sofre[m]?|perde[m]?) \d+d\d+/.test(texto) && !/ou metade|metade se pass/.test(texto)) {
      problema('area-sem-metade', 'dano em várias criaturas precisa de teste com metade no sucesso');
    }
    // R8: o que tira a criatura da luta (paralisar, atordoar, possuir, mandar) pede teste repetido.
    if ((/[Pp]aralisad|[Aa]tordoad|obedece|como aliado/.test(texto) || traco.id === 'possessao') && !/repete/.test(texto)) {
      problema('trava-sem-teste-repetido', 'a criatura repete o teste no fim de cada turno');
    }
    // R9: 1 minuto cobre o encontro inteiro em qualquer degrau.
    if (/\b1 minuto\b/.test(texto)) problema('duracao-de-1-minuto', 'use 3 rodadas');
    // R10: nomes que as regras não conhecem (encantamento é manifestação da magia, não controle mental).
    if (/[Ee]ncantad|encantamento|psíquic|\bespiritual\b/.test(texto)) problema('nome-fora-das-regras', 'use Fascinado, controle mental ou o tipo de dano oficial');
    // R11: perder a ação é forte demais para repetir: ninguém perde a ação em duas rodadas seguidas.
    if (/perde[m]? a ação(?! de movimento)/.test(texto) && !/duas rodadas seguidas/.test(texto)) {
      problema('perde-a-acao-seguida', 'a mesma criatura não perde a ação em duas rodadas seguidas');
    }
  }

  return { linhas, violacoes };
}

const executadoDiretamente = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  const { linhas, violacoes } = analisarEspirito();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ linhas, violacoes }, null, 2)}\n`);
  } else {
    const comDados = linhas.filter((linha) => linha.mediaDeDados > 0).sort((a, b) => a.nivel - b.nivel || b.emAcertosDeNpc - a.emAcertosDeNpc);
    console.log('Habilidades com dados, por nível (média / acerto de NPC do nível / Vida de classe do nível):');
    for (const l of comDados) {
      console.log(`  nv ${String(l.nivel).padStart(2)}  ${l.titulo.padEnd(26)} ${l.origem.padEnd(14)} ${String(l.mana).padStart(2)} Mana ${l.usos.padEnd(10)} média ${String(l.mediaDeDados).padStart(5)}  ${l.emAcertosDeNpc}x acerto  ${l.emPorcentoDaVida}% Vida`);
    }
    const caras = linhas.filter((linha) => linha.emMagiaDeMesmoCusto > 1).sort((a, b) => b.emMagiaDeMesmoCusto - a.emMagiaDeMesmoCusto);
    console.log(`\nRendem mais que a magia do mesmo custo (a régua aceita até ${String(TETO_EM_MAGIAS).replace('.', ',')}):`);
    for (const l of caras) console.log(`  nv ${String(l.nivel).padStart(2)}  ${l.titulo.padEnd(26)} ${l.origem.padEnd(18)} ${String(l.mana).padStart(2)} Mana ${l.usos.padEnd(10)} ${l.emMagiaDeMesmoCusto}x a magia`);
    console.log(`\n${linhas.length} habilidades analisadas, ${violacoes.length} violações.`);
    for (const v of violacoes) console.log(`  [${v.regra}] ${v.origem} / ${v.titulo}: ${v.detalhe}`);
  }
  if (process.argv.includes('--check') && violacoes.length > 0) process.exit(1);
}
