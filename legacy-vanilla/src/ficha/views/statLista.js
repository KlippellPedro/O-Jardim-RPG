// Grade de estatísticas (label + valor) — cada par vira UM item de grid só
// (ver ficha.css: .ficha-wizard-preview-lista) pra não embaralhar label e
// valor quando a grade quebra em várias colunas.

export function criarListaStats(linhas) {
  const lista = document.createElement('div');
  lista.className = 'ficha-wizard-preview-lista';
  linhas.forEach(([rotulo, valor]) => {
    const item = document.createElement('div');
    item.className = 'ficha-wizard-stat';

    const label = document.createElement('span');
    label.className = 'ficha-wizard-stat-label';
    label.textContent = rotulo;

    const valorEl = document.createElement('span');
    valorEl.className = 'ficha-wizard-stat-valor';
    valorEl.textContent = valor;

    item.append(label, valorEl);
    lista.appendChild(item);
  });
  return lista;
}
