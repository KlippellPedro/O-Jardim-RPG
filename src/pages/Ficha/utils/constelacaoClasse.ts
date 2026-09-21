import type { IRecompensaClasse, TipoRecompensaClasse } from '../../../types/catalogo';

/** Qual recompensa dá a forma da estrela daquele nível. */
const PRIORIDADE: TipoRecompensaClasse[] = ['habilidade_final', 'poder', 'evento', 'habilidade', 'grau_pericia'];

export function tipoPrincipalDoNivel(recompensas: IRecompensaClasse[] | undefined): TipoRecompensaClasse | null {
  const tipos = new Set((recompensas ?? []).map((recompensa) => recompensa.tipo));
  return PRIORIDADE.find((tipo) => tipos.has(tipo)) ?? null;
}

export interface PosicaoEstrela {
  /** Em % da largura, de 0 a 100. */
  x: number;
  /** Em % da altura, de 0 a 100. */
  y: number;
}

const POR_LINHA = 10;
const MARGEM_X = 7;

/** Os 20 níveis viram duas linhas onduladas de 10 estrelas: 1 a 10 em cima e
 * 11 a 20 embaixo (de volta), para caber em tela de celular sem encolher demais. */
export function posicaoDaEstrela(nivel: number): PosicaoEstrela {
  const indice = Math.max(1, Math.min(20, Math.trunc(nivel) || 1)) - 1;
  const linha = Math.floor(indice / POR_LINHA);
  // A segunda linha volta da direita para a esquerda, para o 10 e o 11 ficarem vizinhos.
  const ordem = indice % POR_LINHA;
  const coluna = linha === 0 ? ordem : POR_LINHA - 1 - ordem;
  const passo = (100 - MARGEM_X * 2) / (POR_LINHA - 1);
  const onda = Math.sin(ordem * 0.95 + linha * 1.7) * 7;
  const base = linha === 0 ? 27 : 74;
  return {
    x: Number((MARGEM_X + coluna * passo).toFixed(2)),
    y: Number((base + onda).toFixed(2)),
  };
}
