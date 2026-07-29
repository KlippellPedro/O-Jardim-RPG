interface LoreRevelavel {
  id: string;
  revelado?: boolean;
}

/** Resolve a visibilidade respeitando a hierarquia do Mundo. */
export function loreBloqueado(
  entry: LoreRevelavel,
  {
    isMestre,
    loreRevelado,
    loreOculto,
    paiBloqueado = false,
  }: {
    isMestre: boolean;
    loreRevelado: string[];
    loreOculto: string[];
    paiBloqueado?: boolean;
  },
): boolean {
  if (isMestre) return false;
  if (paiBloqueado) return true;

  const inicialmenteRevelado = entry.revelado !== false;
  return inicialmenteRevelado
    ? loreOculto.includes(entry.id)
    : !loreRevelado.includes(entry.id);
}
