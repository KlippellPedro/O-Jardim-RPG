// A conta da faixa de iniciativa, sem React, para testar: a lista do turno começando por quem age agora.

/** O mínimo que a conta precisa de cada participante da iniciativa. */
export interface ParticipanteDaOrdem {
  id: string;
}

/**
 * A ordem de iniciativa girada para começar na vez de agora: quem age, depois os próximos, e quem já agiu nesta
 * rodada por último. Sem vez conhecida (ou com uma vez que não está na lista), fica na ordem original.
 */
export function ordemDaFaixa<T extends ParticipanteDaOrdem>(iniciativa: readonly T[], turnoAtualId: string | null): T[] {
  const lista = [...iniciativa];
  const indice = turnoAtualId === null ? -1 : lista.findIndex((participante) => participante.id === turnoAtualId);
  if (indice <= 0) return lista;
  return [...lista.slice(indice), ...lista.slice(0, indice)];
}
