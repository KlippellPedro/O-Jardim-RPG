/** A fila da cena está na ordem da iniciativa? Quem comanda a mesa pode arrastar os
 * participantes ou apertar "Ordenar fila"; ao iniciar o combate o servidor só começa
 * pelo primeiro da fila, então uma fila fora de ordem faz o de iniciativa menor jogar antes. */

export interface ParticipanteDaFila {
  nome: string;
  iniciativa: number;
}

export interface InversaoDeFila {
  /** Quem está antes na fila, mas tem iniciativa menor. */
  antes: ParticipanteDaFila;
  /** Quem está depois na fila, mas tem iniciativa maior. */
  depois: ParticipanteDaFila;
}

/** O primeiro par em que a iniciativa sobe de um participante para o seguinte, ou null se a fila está em ordem.
 * Iniciativa igual conta como em ordem: o desempate é decisão do Mestre. */
export function primeiraInversaoDaFila(fila: readonly ParticipanteDaFila[]): InversaoDeFila | null {
  for (let indice = 1; indice < fila.length; indice += 1) {
    if (fila[indice].iniciativa > fila[indice - 1].iniciativa) {
      return { antes: fila[indice - 1], depois: fila[indice] };
    }
  }
  return null;
}

export function filaEstaEmOrdem(fila: readonly ParticipanteDaFila[]): boolean {
  return primeiraInversaoDaFila(fila) === null;
}

/** O texto da pergunta feita ao Mestre quando ele inicia o combate com a fila fora de ordem. */
export function mensagemDeFilaForaDeOrdem(inversao: InversaoDeFila): string {
  return `${inversao.antes.nome} (iniciativa ${inversao.antes.iniciativa}) joga antes de ${inversao.depois.nome} (iniciativa ${inversao.depois.iniciativa}). Ordenar a fila pela iniciativa antes de começar?`;
}
