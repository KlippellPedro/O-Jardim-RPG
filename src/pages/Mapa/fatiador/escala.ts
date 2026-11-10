// Tamanho das peças fatiadas, em casas da grade. O Acervo não guarda "casas", então o
// fatiador anota o tamanho numa etiqueta (`casas:2.32`) e o construtor de mapas lê dela
// ao escolher a peça (src/pages/Mapa/construtor/ConstrutorMapa.tsx).

import { ESCALA_PECA_MAX } from '../construtor/projeto';

export const PREFIXO_CASAS = 'casas:';
const CASAS_MINIMAS = 0.1;

function arredondar(valor: number): number {
  return Number(valor.toFixed(2));
}

/** Largura em casas de uma imagem de `larguraPx`, se cada casa da folha mede `pxPorCasa`. */
export function casasDaPeca(larguraPx: number, pxPorCasa: number): number {
  if (!(pxPorCasa > 0) || !(larguraPx > 0)) return 1;
  return Math.min(ESCALA_PECA_MAX, Math.max(CASAS_MINIMAS, arredondar(larguraPx / pxPorCasa)));
}

/** Quantos pixels da folha formam uma casa, sabendo que uma peça de `larguraPx` mede `casas`. */
export function pxPorCasaDe(larguraPx: number, casas: number): number {
  if (!(casas > 0) || !(larguraPx > 0)) return 0;
  return arredondar(larguraPx / casas);
}

export function etiquetaDeCasas(casas: number): string {
  return `${PREFIXO_CASAS}${arredondar(casas)}`;
}

/** Largura em casas anotada nas etiquetas de um item do Acervo, ou null se não há. */
export function casasDaEtiqueta(etiquetas: readonly string[] | undefined): number | null {
  for (const etiqueta of etiquetas ?? []) {
    if (!etiqueta.startsWith(PREFIXO_CASAS)) continue;
    const valor = Number(etiqueta.slice(PREFIXO_CASAS.length));
    if (Number.isFinite(valor) && valor >= CASAS_MINIMAS && valor <= ESCALA_PECA_MAX) return valor;
  }
  return null;
}

export type EscalaMelhoria = 1 | 2 | 4;

/**
 * Quanto ampliar as peças para ficarem nítidas na grade: o bom é de 140 a 280 px por casa.
 * Folha que já tem 140 px por casa ou mais fica como está.
 */
export function escalaDaMelhoria(pxPorCasa: number): EscalaMelhoria {
  if (pxPorCasa >= 140) return 1;
  if (pxPorCasa >= 70) return 2;
  return 4;
}

/** "Quarto 07": o prefixo e o número com zeros à esquerda para a lista ficar em ordem. */
export function nomeDaPeca(prefixo: string, posicao: number, total: number): string {
  const digitos = Math.max(2, String(total).length);
  return `${prefixo.trim() || 'Peça'} ${String(posicao).padStart(digitos, '0')}`;
}

/** Etiqueta curta (até 30 letras, em minúsculas) com o nome da folha, para achar as peças depois. */
export function etiquetaDaFolha(nomeArquivo: string): string {
  const limpo = nomeArquivo.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[\s_]+/g, '-').toLowerCase().slice(0, 30);
  return limpo || 'folha';
}
