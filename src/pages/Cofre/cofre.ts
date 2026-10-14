/**
 * Para quem o Cofre já manda as coisas quando a pessoa abre a tela: o único personagem dela na mesa ou, havendo vários,
 * o personagem ativo. Sem resposta óbvia devolve '' e a pessoa escolhe; escolha dela nunca é trocada à força.
 */
export function personagemInicialDoCofre(
  personagens: ReadonlyArray<{ id: string }>,
  personagemAtivoId?: string | null,
): string {
  if (personagens.length === 1) return personagens[0].id;
  if (personagemAtivoId && personagens.some((personagem) => personagem.id === personagemAtivoId)) return personagemAtivoId;
  return '';
}

/** Mantém a escolha atual enquanto ela ainda existe na lista; senão volta ao personagem inicial. */
export function personagemDoCofre(
  atual: string,
  personagens: ReadonlyArray<{ id: string }>,
  personagemAtivoId?: string | null,
): string {
  if (atual && personagens.some((personagem) => personagem.id === atual)) return atual;
  return personagemInicialDoCofre(personagens, personagemAtivoId);
}
