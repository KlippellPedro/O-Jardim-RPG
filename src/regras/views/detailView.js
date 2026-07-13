import { criarIcone } from './iconView.js';

export function criarCabecalhoDetalhe({ topico, dados }) {
  const header = document.createElement('div');
  header.className = 'regras-detail-header';
  header.style.setProperty('--accent', topico.accent);

  const h2 = document.createElement('h2');
  h2.className = 'regras-detail-title';
  h2.append(criarIcone(topico, 'regras-detail-icon'), topico.titulo);
  header.appendChild(h2);

  const status = document.createElement('span');
  status.className = 'regras-detail-status';
  status.textContent = topico.status === 'desenvolvimento'
    ? 'Em desenvolvimento'
    : dados.status || 'Regra oficial';
  header.appendChild(status);

  const resumo = document.createElement('p');
  resumo.className = 'regras-detail-resumo';
  resumo.textContent = dados.resumo;
  header.appendChild(resumo);

  return header;
}
