export type SecaoCronicaArvore = 'tese' | 'atmosfera' | 'historia' | 'cronologia';

/** Chave usada em `cronica_secoes_ocultas` pra uma seção de uma Árvore. */
export function chaveSecaoCronica(arvoreId: string, secao: SecaoCronicaArvore): string {
  return `${arvoreId}:${secao}`;
}

/** Se uma seção inteira da crônica (Essência/Tese, Atmosfera, História ou
 * Linha do tempo) está oculta pro jogador. O Mestre sempre vê tudo, igual
 * `loreBloqueado` em `loreVisibility.ts` - é o mesmo padrão, só que essas
 * seções não vêm do Códice (`MUNDO_CATALOG`), vêm de `cronicas-arvores.json`,
 * então não têm um `id` de entrada individual pra reaproveitar aquela função. */
export function secaoCronicaOculta(
  arvoreId: string,
  secao: SecaoCronicaArvore,
  { isMestre, seccoesOcultas }: { isMestre: boolean; seccoesOcultas: string[] },
): boolean {
  if (isMestre) return false;
  return seccoesOcultas.includes(chaveSecaoCronica(arvoreId, secao));
}

/** Se um evento específico da Linha do tempo de uma Árvore está oculto pro
 * jogador. Diferente das seções acima, o evento some da lista inteiro (não
 * some só o resumo) - não faz sentido mostrar um marco na linha do tempo sem
 * dizer o que aconteceu nele. */
export function eventoCronicaOculto(
  eventoId: string,
  { isMestre, eventosOcultos }: { isMestre: boolean; eventosOcultos: string[] },
): boolean {
  if (isMestre) return false;
  return eventosOcultos.includes(eventoId);
}
