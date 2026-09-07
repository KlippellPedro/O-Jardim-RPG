/**
 * Carga e normalização das fontes canônicas usadas pelos documentos de mesa.
 *
 * Nada aqui inventa conteúdo: tudo sai de data/mundo, data/ficha/racas.json e
 * data/mundo/arvoresCatalog.ts. Se a lore mudar lá, basta rodar o gerador de
 * novo. É esse o motivo de a paleta ser lida por regex do catálogo .ts em vez
 * de copiada: uma cor de Árvore só existe num lugar no projeto.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ler = (rel) => readFileSync(join(RAIZ, rel), 'utf8');
const lerJson = (rel) => JSON.parse(ler(rel));

/* ------------------------------------------------------------------ */
/* Paleta canônica das Árvores                                         */
/* ------------------------------------------------------------------ */

/** Lê ARVORES de data/mundo/arvoresCatalog.ts sem precisar compilar TypeScript. */
export function carregarPaleta() {
  const ts = ler('data/mundo/arvoresCatalog.ts');
  const bloco = ts.slice(ts.indexOf('export const ARVORES'), ts.indexOf('export const VAZIO_ID'));
  const re = /id:\s*'([^']+)'[\s\S]*?nome:\s*'([^']+)'[\s\S]*?deidadeTitulo:\s*'([^']+)'[\s\S]*?rgb:\s*'([^']+)'/g;
  const mapa = new Map();
  for (const m of bloco.matchAll(re)) {
    mapa.set(m[1], { id: m[1], nome: m[2], deidade: m[3], rgb: m[4] });
  }
  // O preto de Erebus é a cor certa na paleta, mas some quando vira filete e
  // texto sobre papel claro. O catálogo já prevê isso com rgbInterface.
  const vazio = mapa.get('erebus');
  if (vazio) vazio.rgb = '92,84,104';
  return mapa;
}

export const PALETA = carregarPaleta();
export const COR_NEUTRA = '112,104,126';

export const cor = (arvoreId) => PALETA.get(arvoreId)?.rgb || COR_NEUTRA;

/* ------------------------------------------------------------------ */
/* Entradas de data/mundo                                              */
/* ------------------------------------------------------------------ */

/** Pasta de data/mundo -> id da Deidade padroeira, que é a chave usada em
 *  arvoresCatalog.ts, racas.json e no catálogo React. */
const PASTA_PARA_ARVORE = {
  'Gênese': 'aethel',
  'Alétheia': 'ousias',
  'Parley (subjulgado)': 'keryx',
  'Anima': 'haemus',
  'Vórtice': 'ignis',
  'Baluarte': 'moros',
  'Matriz': 'aperion',
  'Éon': 'chronus',
  'Abismo': 'erebus',
  'Limiar': 'mulher-carmesim',
};

/** Varre data/mundo recursivamente e devolve todas as entradas, cada uma com a
 *  Árvore de origem anotada (null para o conteúdo transversal do Jardim). */
export function carregarMundo() {
  const base = join(RAIZ, 'data', 'mundo');
  const saida = [];
  const anda = (dir, pastaRaiz) => {
    for (const nome of readdirSync(dir)) {
      const alvo = join(dir, nome);
      if (statSync(alvo).isDirectory()) { anda(alvo, pastaRaiz || nome); continue; }
      if (!nome.endsWith('.json')) continue;
      const json = JSON.parse(readFileSync(alvo, 'utf8'));
      if (!Array.isArray(json.entradas)) continue;
      for (const entrada of json.entradas) {
        saida.push({ ...entrada, arvoreId: PASTA_PARA_ARVORE[pastaRaiz] ?? null });
      }
    }
  };
  anda(base, null);
  return saida;
}

export const MUNDO = carregarMundo();

export const porTipo = (tipo) => MUNDO.filter((e) => e.tipo === tipo);
export const porId = (id) => MUNDO.find((e) => e.id === id);
export const daArvore = (arvoreId, tipo) =>
  MUNDO.filter((e) => e.arvoreId === arvoreId && (!tipo || e.tipo === tipo));

/* ------------------------------------------------------------------ */
/* Crônicas, facções, raças                                            */
/* ------------------------------------------------------------------ */

export const CRONICAS = lerJson('data/mundo/cronicas-arvores.json');
export const FACCOES = lerJson('data/mundo/faccoes.json');
export const RACAS = lerJson('data/ficha/racas.json');

/** A entrada "Outra coisa (personalizada)" é um espaço em branco da ficha, não
 *  um povo do Jardim — fica de fora do corpo do documento e vira uma nota. */
export const RACAS_REAIS = RACAS.filter((r) => r.id !== 'raca-personalizada');

/**
 * Idioma por povo, transcrito da entrada 'idiomas-do-jardim'
 * (data/mundo/Jardim/jardim.json). Só os doze com língua própria aparecem
 * aqui; o Universal é de todos e por isso não entra no mapa.
 */
export const IDIOMAS = {
  vampiro: { lingua: 'Romeno', criador: 'Davinor' },
  elfo: { lingua: 'Finlandês', criador: 'os Finwë' },
  gigante: { lingua: 'Grego', criador: null },
  goblim: { lingua: 'Alemão', criador: null },
  anao: { lingua: 'Nórdico Antigo', criador: null },
  golem: { lingua: 'Libras', criador: null },
  espirito: { lingua: 'Enoquiano', criador: null },
  sereia: { lingua: 'Latim', criador: null },
  animalia: { lingua: 'Sumeriano', criador: null },
  clone: { lingua: 'Ao Contrário', criador: null },
  automato: { lingua: 'Inglês', criador: null },
  bruxa: { lingua: 'Celta', criador: null },
};

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Quebra em parágrafos nos \n\n do JSON e devolve HTML. */
export function paragrafos(texto, classe = '') {
  if (!texto) return '';
  return String(texto)
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => `<p class="${i === 0 ? classe : ''}">${esc(t).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * Lista de itens. Alguns campos do data/mundo guardam um array de tópicos e
 * outros uma frase corrida (é o caso de `caracteristicas`, que varia de entrada
 * pra entrada). Um tópico só não merece marcador, então a frase vira parágrafo.
 */
export function lista(itens) {
  if (!itens) return '';
  if (typeof itens === 'string') return itens.trim() ? `<p>${esc(itens)}</p>` : '';
  if (!itens.length) return '';
  return `<ul class="limpa">${itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

/** Linhas rótulo/valor. Entradas com valor vazio somem sozinhas. */
export function fichaDados(pares) {
  const linhas = pares
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<div class="linha"><dt>${esc(k)}</dt><dd>${v}</dd></div>`);
  return linhas.length ? `<dl class="ficha">${linhas.join('')}</dl>` : '';
}

export const pilulas = (itens) =>
  !itens?.length ? '' : `<div class="pilulas">${itens.map((i) => `<span class="pilula">${esc(i)}</span>`).join('')}</div>`;

/**
 * Achata um campo que ora vem como array, ora como frase. Vários campos do
 * data/mundo (`envolvidos`, `caracteristicas`) foram escritos das duas formas
 * ao longo do tempo, e o documento não deveria quebrar por causa disso.
 */
export function emLinha(valor, separador = ', ') {
  if (!valor) return '';
  return Array.isArray(valor) ? valor.filter(Boolean).join(separador) : String(valor);
}

/** Modificador numérico da ficha, no formato que o jogador lê ("+3", "-2", "—"). */
export const sinal = (n) => (!n ? '—' : n > 0 ? `+${n}` : String(n));
