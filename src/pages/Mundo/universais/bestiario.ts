/** Regras puras da ficha de criatura dos Registros Universais: habilidades separadas,
 * degrau de peso pelo VD e faixas para o filtro. Sem React, para ser testável. */

export type TipoHabilidade = 'regra' | 'passiva' | 'sinal' | 'evitar';

export interface IHabilidade {
  nome: string;
  /** A regra sem o selo de abertura, com a primeira letra maiúscula. */
  regra: string;
  tipo: TipoHabilidade;
  /** Selos curtos: o jeito de usar (Reação, 3 por dia) e o efeito (Medo, Mutilação). */
  selos: string[];
}

/** O nome vem antes do primeiro "(", a regra é o que está dentro do último par. */
const FORMATO = /^([^()]{1,70}?)\s*\(([\s\S]*)\)\s*$/;

const maiuscula = (texto: string) => `${texto.charAt(0).toLocaleUpperCase('pt-BR')}${texto.slice(1)}`;

/** Selos pelo nome da habilidade: o que ela faz com quem a enfrenta. */
const SELO_PELO_NOME: Record<string, string> = {
  'Presença Aterradora': 'Medo',
  'Arrancar': 'Mutilação',
  'Golpe Anunciado': 'Anunciado',
  'Sequência de Ataques': 'Combo',
  'Regeneração': 'Cura',
};

/** Aberturas da regra que viram selo, em vez de ficar no texto ("Reação, 1/rodada: ..."). */
const ABERTURAS = ['golpe anunciado', 'anunciado', 'presença aterradora', 'sequência de ataques', 'reação', 'ação padrão', 'ação de movimento', 'ação livre', 'ação bônus', 'gatilho', 'passivo'];

/** O selo que cada abertura vira; `null` quando ela só repete o que o nome já diz. */
const SELO_DA_ABERTURA: Record<string, string | null> = {
  'golpe anunciado': 'Anunciado',
  'anunciado': 'Anunciado',
  'presença aterradora': 'Medo',
  'sequência de ataques': 'Combo',
  'gatilho': 'Gatilho',
  'passivo': null,
};

/** "3/dia", "1/cena", "1/rodada" viram "3 por dia" e assim por diante. */
const FREQUENCIA = /^(\d+)\/(dia|cena|rodada|turno|sessão|combate)$/i;

/** A cabeça da regra: tudo antes do primeiro ":" quando é curto e traz abertura ou frequência
 * ("Reação, 1/rodada", "1/cena, Ação Padrão", "gatilho"). */
const CABECA = /^([^:()]{1,48}):\s*/;

function selosDaCabeca(regra: string): { selos: string[]; resto: string } | null {
  const cabeca = regra.match(CABECA);
  if (!cabeca) return null;
  const pedacos = cabeca[1].split(',').map((pedaco) => pedaco.trim()).filter(Boolean);
  if (pedacos.length === 0 || pedacos.some((pedaco) => pedaco.length > 28)) return null;
  const reconhece = (pedaco: string) => FREQUENCIA.test(pedaco) || ABERTURAS.includes(pedaco.toLowerCase());
  if (!pedacos.some(reconhece)) return null;
  const selos: string[] = [];
  for (const pedaco of pedacos) {
    const frequencia = pedaco.match(FREQUENCIA);
    if (frequencia) { selos.push(`${frequencia[1]} por ${frequencia[2].toLowerCase()}`); continue; }
    const chave = pedaco.toLowerCase();
    const selo = chave in SELO_DA_ABERTURA ? SELO_DA_ABERTURA[chave] : maiuscula(pedaco);
    if (selo) selos.push(selo);
  }
  return { selos, resto: regra.slice(cabeca[0].length) };
}

export function separarHabilidade(texto: string): IHabilidade {
  const bruto = String(texto ?? '').trim();
  const casamento = bruto.match(FORMATO);
  if (!casamento) return { nome: '', regra: maiuscula(bruto), tipo: 'regra', selos: [] };

  const nome = casamento[1].trim();
  let regra = casamento[2].trim();
  const selos: string[] = [];

  const cabeca = selosDaCabeca(regra);
  if (cabeca) {
    selos.push(...cabeca.selos);
    regra = cabeca.resto;
  }

  const efeito = SELO_PELO_NOME[nome];
  if (efeito && !selos.includes(efeito)) selos.push(efeito);

  const unicos = selos.filter((selo, indice) => selos.findIndex((outro) => outro.toLowerCase() === selo.toLowerCase()) === indice);
  const tipo: TipoHabilidade = nome === 'Sinais' ? 'sinal' : nome === 'Como Evitar' ? 'evitar' : 'regra';
  return { nome, regra: maiuscula(regra.trim()), tipo, selos: unicos };
}

export interface IHabilidadesAgrupadas {
  /** Habilidades com regra: o que a criatura faz na cena. */
  ativas: IHabilidade[];
  /** Linhas curtas e sem número (Corpo de Maré, Presa ao Estreito): uma linha só, sem cartão. */
  passivas: IHabilidade[];
  sinais: IHabilidade[];
  evitar: IHabilidade[];
}

/** Uma habilidade curta, sem teste, dano, DT nem selo de uso, é uma característica: cabe numa linha.
 * Regra comprida (mais de 150 letras) é regra de combate mesmo sem número, como "Quem Fala Perde". */
const temNumero = (habilidade: IHabilidade) => habilidade.regra.length > 150 || /\bDT\b|\d+d\d+|[+-]\d+|\d+\s*m\b|\d+\s*%/.test(habilidade.regra);

export function agruparHabilidades(textos: readonly string[]): IHabilidadesAgrupadas {
  const grupos: IHabilidadesAgrupadas = { ativas: [], passivas: [], sinais: [], evitar: [] };
  for (const texto of textos) {
    const habilidade = separarHabilidade(texto);
    if (!habilidade.regra) continue;
    if (habilidade.tipo === 'sinal') grupos.sinais.push(habilidade);
    else if (habilidade.tipo === 'evitar') grupos.evitar.push(habilidade);
    else if (habilidade.selos.length === 0 && !temNumero(habilidade)) grupos.passivas.push({ ...habilidade, tipo: 'passiva' });
    else grupos.ativas.push(habilidade);
  }
  return grupos;
}

// ---------------------------------------------------------------- degraus de peso

export type DegrauId = 'comum' | 'perigosa' | 'temivel' | 'calamidade' | 'lenda';

export interface IDegrau {
  id: DegrauId;
  rotulo: string;
  /** Primeiro VD do degrau. */
  de: number;
  /** Último VD do degrau (`null` no último, sem teto). */
  ate: number | null;
  /** Cor do degrau: sobe do cinza ao vermelho vivo. */
  cor: string;
  /** 0 a 4: quanto o cartão cresce (moldura, selo, título). */
  peso: number;
}

export const DEGRAUS: readonly IDegrau[] = [
  { id: 'comum', rotulo: 'Comum', de: 0, ate: 10, cor: '#8b8f98', peso: 0 },
  { id: 'perigosa', rotulo: 'Perigosa', de: 11, ate: 25, cor: '#d9a441', peso: 1 },
  { id: 'temivel', rotulo: 'Temível', de: 26, ate: 44, cor: '#e0703a', peso: 2 },
  { id: 'calamidade', rotulo: 'Calamidade', de: 45, ate: 99, cor: '#d9435a', peso: 3 },
  { id: 'lenda', rotulo: 'Lenda', de: 100, ate: null, cor: '#c04bd9', peso: 4 },
];

/** "VD 1 a 10", "VD 100+": a faixa do degrau para o filtro. */
export const faixaDoDegrau = (degrau: IDegrau): string =>
  degrau.ate === null ? `VD ${degrau.de}+` : `VD ${Math.max(1, degrau.de)} a ${degrau.ate}`;

/** A cor do degrau em `r,g,b`, para as variáveis CSS da tela. */
export const rgbDoDegrau = (degrau: IDegrau): string =>
  (degrau.cor.replace('#', '').match(/../g) ?? ['80', '80', '80']).map((par) => parseInt(par, 16)).join(',');

export function degrauDoVd(vd: number | null | undefined): IDegrau {
  const valor = Number.isFinite(vd) ? Number(vd) : 0;
  let achado = DEGRAUS[0];
  for (const degrau of DEGRAUS) if (valor >= degrau.de) achado = degrau;
  return achado;
}

/** Texto do tipo "+287, 52d10+193 Vazio" ou "Luta +287" quebrado em nome e número. */
export function numeroDaPericia(texto: string): { nome: string; valor: string } {
  const casamento = String(texto ?? '').trim().match(/^(.*?)\s*([+-]\s*\d+)$/);
  return casamento ? { nome: casamento[1].trim(), valor: casamento[2].replace(/\s+/g, '') } : { nome: String(texto ?? '').trim(), valor: '' };
}
