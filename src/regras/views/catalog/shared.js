export function escapar(valor = '') {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function tituloCampo(campo) {
  return campo.replaceAll('_', ' ').replace(/\b\w/g, letra => letra.toUpperCase());
}

export function objetoEmTexto(objeto) {
  if (!objeto || typeof objeto !== 'object') return '';

  return Object.entries(objeto)
    .map(([chave, valor]) => {
      const formatado = typeof valor === 'number' && valor > 0 ? `+${valor}` : String(valor);
      return `${tituloCampo(chave)} ${formatado}`;
    })
    .join(' · ');
}

export function listaHtml(itens, classe = 'regras-entity-list') {
  if (!Array.isArray(itens) || !itens.length) return '';
  return `<ul class="${classe}">${itens.map(item => `<li>${escapar(item)}</li>`).join('')}</ul>`;
}

export function selo(texto, tom = 'neutro') {
  return `<span class="regras-source-badge regras-source-badge--${tom}">${escapar(texto)}</span>`;
}
