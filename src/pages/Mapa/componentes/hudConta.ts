// A conta do HUD do jogador no mapa, sem React: quanto de cada barra está cheio e de quem é a vez.

interface BarraParaConta {
  fracao?: number | null;
  atual?: number | null;
  maximo?: number | null;
}

/** Quanto da barra está cheio, de 0 a 1 (o servidor manda a fração quando esconde os números). */
export function fracaoDaBarra(barra: BarraParaConta): number {
  if (typeof barra.fracao === 'number') return Math.max(0, Math.min(1, barra.fracao));
  if (!barra.maximo) return 0;
  return Math.max(0, Math.min(1, (barra.atual ?? 0) / barra.maximo));
}

interface TokenParaConta {
  id: string;
  e_meu: boolean;
  participante_id?: string | null;
  personagem_id?: string | null;
}

/** O token do jogador que está com a vez (pelo participante da Sessão ou pelo personagem), ou nulo. */
export function meuTokenDaVez(tokens: readonly TokenParaConta[], turnoAtualId: string | null, personagemDaVez: string | null): string | null {
  if (!turnoAtualId) return null;
  const achado = tokens.find((token) => token.e_meu && (
    token.participante_id === turnoAtualId
    || (Boolean(personagemDaVez) && token.personagem_id === personagemDaVez)
  ));
  return achado?.id ?? null;
}
