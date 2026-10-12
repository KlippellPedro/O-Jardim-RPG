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
    for (const traco of marca.caracteristicas) lista.push({ origem: marca.titulo, traco });
  }
  for (const degrau of espirito.estagios) {
    for (const traco of degrau.caracteristicas) lista.push({ origem: degrau.titulo, traco });
  }
  return lista;
}

export function analisarEspirito() {
  const linhas = [];
  const violacoes = [];

  for (const { origem, traco } of habilidades()) {
    const nivel = traco.nivel_minimo;
    const texto = traco.descricao;
    const media = maiorMediaDeDados(texto);
    const acerto = interpolar(acertoPorNivel, nivel);
    const vida = interpolar(vidaPorNivel, nivel);
    const sessaoCurta = traco.recuperacao === 'sessao';

    linhas.push({
      id: traco.id,
      titulo: traco.titulo,
      origem,
      nivel,
      mana: Number(traco.custo_mana) || 0,
      usos: traco.usos ? `${traco.usos}/${sessaoCurta ? 'sessão' : 'cena'}` : '-',
      mediaDeDados: media,
      emAcertosDeNpc: media ? Number((media / acerto).toFixed(2)) : 0,
      emPorcentoDaVida: media ? Math.round((100 * media) / vida) : 0,
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
    console.log(`\n${linhas.length} habilidades analisadas, ${violacoes.length} violações.`);
    for (const v of violacoes) console.log(`  [${v.regra}] ${v.origem} / ${v.titulo}: ${v.detalhe}`);
  }
  if (process.argv.includes('--check') && violacoes.length > 0) process.exit(1);
}
