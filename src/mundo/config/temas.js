const FLUXO_TEMAS = {
  'fluxo-do-sangue': { cor: 'var(--blood)', simbolo: '✥' },
  'fluxo-da-tecnologia': { cor: 'var(--neon)', simbolo: '⬡' },
};

export const TEMA_PADRAO = { cor: 'var(--gold)', simbolo: '✦' };

export function temaDeEntrada(entrada) {
  const fluxoId = entrada.conteudo?.fluxo || (entrada.tipo === 'fluxo' ? entrada.id : null);
  if (fluxoId && FLUXO_TEMAS[fluxoId]) return FLUXO_TEMAS[fluxoId];

  if (typeof entrada.conteudo?.cor === 'string' && entrada.conteudo.cor.trim()) {
    return { cor: entrada.conteudo.cor, simbolo: TEMA_PADRAO.simbolo };
  }

  return TEMA_PADRAO;
}
