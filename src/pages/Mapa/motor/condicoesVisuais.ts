// O que cada condição faz o token parecer: o contorno animado (fogo, veneno, gelo...) e o dano contínuo da virada do turno.
// Sem Pixi nem React, para testar. O desenho em si mora em contornoCondicao.ts.

import { CONDICOES_OFICIAIS, CRISES_SANIDADE, type ICondicaoRegra } from '../../../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../../../data/regras/condicoes-longo-prazo';

export type FamiliaDeContorno = 'fogo' | 'sangue' | 'veneno' | 'raio' | 'gelo' | 'medo' | 'atordoado' | 'bencao';

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** A ordem também é a prioridade: com muitas condições, só as duas primeiras desta lista ganham contorno. */
export const FAMILIAS_EM_ORDEM: readonly FamiliaDeContorno[] = ['fogo', 'sangue', 'veneno', 'raio', 'gelo', 'medo', 'atordoado', 'bencao'];

export const FAMILIA_DA_CONDICAO: Readonly<Record<string, FamiliaDeContorno>> = {
  queimando: 'fogo',
  sangramento: 'sangue',
  envenenado: 'veneno',
  enjoado: 'veneno',
  paralisado: 'raio',
  lento: 'gelo',
  imobilizado: 'gelo',
  amedrontado: 'medo',
  panico: 'medo',
  paranoia: 'medo',
  atordoado: 'atordoado',
  desorientado: 'atordoado',
  fascinado: 'atordoado',
  dissociacao: 'atordoado',
  catatonia: 'atordoado',
  inspirado: 'bencao',
  favorecido: 'bencao',
  resguardado: 'bencao',
  focado: 'bencao',
  apressado: 'bencao',
  revigorado: 'bencao',
};

export const MAXIMO_DE_CONTORNOS = 2;

/** Os contornos que o token ganha pelas condições que tem (no máximo dois, pela prioridade acima). */
export function contornosDoToken(condicoes: readonly string[]): FamiliaDeContorno[] {
  const presentes = new Set<FamiliaDeContorno>();
  for (const nome of condicoes) {
    const familia = FAMILIA_DA_CONDICAO[semAcento(nome)];
    if (familia) presentes.add(familia);
  }
  return FAMILIAS_EM_ORDEM.filter((familia) => presentes.has(familia)).slice(0, MAXIMO_DE_CONTORNOS);
}

// ---------------------------------------------------------------- dano contínuo

export type MomentoDoDano = 'fim' | 'inicio';

export interface IDanoContinuo {
  condicao: string;
  /** A fórmula como o Livro escreve (1d6). */
  formula: string;
  /** "Fogo", "veneno" ou nulo quando o texto não diz o tipo. */
  tipo: string | null;
  momento: MomentoDoDano;
}

const TODAS: readonly ICondicaoRegra[] = [...CONDICOES_OFICIAIS, ...CRISES_SANIDADE, ...CONDICOES_LONGO_PRAZO];

// "Sofra 1d6 de dano de Fogo no fim do turno." / "Sofra 1d6 de dano no fim do turno."
const PADRAO_DO_DANO = /Sofra (\d+d\d+(?:\s*[+-]\s*\d+)?) de dano(?: (?:de|do) ([A-Za-zÀ-ú]+))? no (fim|início|inicio|começo) do turno/i;

/** O dano que a condição causa sozinho a cada turno, lido do texto do Livro de Regras (null se ela não causa). */
export function danoContinuoDaCondicao(nome: string): IDanoContinuo | null {
  const alvo = semAcento(nome);
  const regra = TODAS.find((condicao) => semAcento(condicao.titulo) === alvo);
  if (!regra) return null;
  for (const linha of regra.efeitos) {
    const achou = PADRAO_DO_DANO.exec(linha);
    if (!achou) continue;
    const momento = /fim/i.test(achou[3]) ? 'fim' : 'inicio';
    return { condicao: regra.titulo, formula: achou[1].replace(/\s+/g, ''), tipo: achou[2] ?? null, momento };
  }
  return null;
}

/** O que o token deve sofrer neste momento do turno dele. */
export function danoContinuoDoToken(condicoes: readonly string[], momento: MomentoDoDano): IDanoContinuo[] {
  return condicoes.flatMap((nome) => {
    const dano = danoContinuoDaCondicao(nome);
    return dano && dano.momento === momento ? [dano] : [];
  });
}

/** A frase do lembrete que o Mestre lê na virada do turno. */
export function lembreteDoDanoContinuo(nomeDoToken: string, lista: readonly IDanoContinuo[], momento: MomentoDoDano): string {
  const partes = lista.map((dano) => `${dano.condicao}: ${dano.formula}${dano.tipo ? ` de ${dano.tipo}` : ''}`);
  return `${nomeDoToken} ${momento === 'fim' ? 'terminou o turno' : 'começou o turno'} com ${partes.join(' e ')}.`;
}
