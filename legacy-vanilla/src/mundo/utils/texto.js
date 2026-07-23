const ROTULOS_CAMPOS = {
  terminologia: 'Terminologia',
  regra_racial: 'Regra racial',
  historico: 'Histórico',
  observacoes: 'Observações',
  nota: 'Nota',
};

const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos']);

export function humanizarChave(chave) {
  if (ROTULOS_CAMPOS[chave]) return ROTULOS_CAMPOS[chave];

  const texto = chave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function humanizarSlug(slug) {
  return slug
    .split('-')
    .map((palavra, indice) => (
      indice > 0 && PREPOSICOES.has(palavra)
        ? palavra
        : palavra.charAt(0).toUpperCase() + palavra.slice(1)
    ))
    .join(' ');
}

export function truncar(texto, tamanho) {
  const valor = String(texto || '').trim();
  return valor.length > tamanho ? `${valor.slice(0, tamanho).trim()}…` : valor;
}
