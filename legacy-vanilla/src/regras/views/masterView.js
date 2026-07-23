import { escapar } from './catalog/shared.js';

function renderizarSecao(secao) {
  if (secao.tipo === 'texto') {
    return `
      <h3 class="regras-subtitle">${escapar(secao.titulo)}</h3>
      ${secao.paragrafos.map(paragrafo => `<p>${escapar(paragrafo)}</p>`).join('')}`;
  }

  if (secao.tipo === 'lista') {
    return `
      <h3 class="regras-subtitle">${escapar(secao.titulo)}</h3>
      <ul class="regras-list">${secao.itens.map(item => `<li>${escapar(item)}</li>`).join('')}</ul>`;
  }

  return `
    <h3 class="regras-subtitle">${escapar(secao.titulo)}</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr>${secao.colunas.map(coluna => `<th>${escapar(coluna)}</th>`).join('')}</tr></thead>
      <tbody>${secao.linhas.map(linha => `<tr>${linha.map(valor => `<td>${escapar(valor)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

export function criarPaginaMestre(pacote) {
  return {
    status: `Arquivo local · ${pacote.versao}`,
    resumo: pacote.resumo,
    destaques: pacote.destaques || [],
    corpo: `
      <p class="regras-lead">Este conteúdo veio do arquivo local do mestre e não faz parte da página pública dos jogadores.</p>
      ${pacote.secoes.map(renderizarSecao).join('')}
    `,
  };
}
