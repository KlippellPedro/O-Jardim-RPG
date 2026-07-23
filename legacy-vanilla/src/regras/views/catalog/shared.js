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

export function barraCatalogo({ total, rotulo, expansivel = false }) {
  return `
    <div class="regras-catalog-toolbar" data-catalog-toolbar data-catalog-label="${escapar(rotulo)}">
      <label class="regras-catalog-search">
        <span class="regras-catalog-search-icon" aria-hidden="true">⌕</span>
        <span class="sr-only">Buscar ${escapar(rotulo)}</span>
        <input type="search" data-catalog-search placeholder="Buscar por nome, origem ou característica..." autocomplete="off">
      </label>
      <span class="regras-catalog-count" data-catalog-count>${escapar(total)} ${escapar(rotulo)}</span>
      ${expansivel ? `<div class="regras-catalog-actions" aria-label="Controlar detalhes">
        <button type="button" data-catalog-expand="open">Abrir todos</button>
        <button type="button" data-catalog-expand="close">Recolher</button>
      </div>` : ''}
    </div>
    <p class="regras-catalog-empty" data-catalog-empty hidden>Nenhum resultado encontrado. Tente outro termo.</p>`;
}
