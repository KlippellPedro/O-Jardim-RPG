import { getEntradas } from '../../services/entradasService.js';
import { irParaEntrada } from '../../services/navegacaoService.js';
import { humanizarChave } from '../../utils/texto.js';

function renderizarValor(valor, mapa) {
  if (Array.isArray(valor)) {
    const lista = document.createElement('span');
    valor.forEach((item, indice) => {
      if (indice > 0) lista.append(', ');
      lista.appendChild(renderizarValor(item, mapa));
    });
    return lista;
  }

  if (valor && typeof valor === 'object') {
    return renderizarConteudo(valor, mapa);
  }

  if (typeof valor === 'string' && mapa[valor]) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'entry-link';
    botao.textContent = mapa[valor].titulo;
    botao.addEventListener('click', () => irParaEntrada(valor));
    return botao;
  }

  const texto = document.createElement('span');
  texto.textContent = String(valor);
  return texto;
}

export function renderizarConteudo(conteudo, mapa = getEntradas()) {
  const lista = document.createElement('dl');
  lista.className = 'entry-fields';

  Object.entries(conteudo).forEach(([chave, valor]) => {
    if (valor === null || valor === undefined || valor === '') return;

    const termo = document.createElement('dt');
    termo.textContent = humanizarChave(chave);

    const descricao = document.createElement('dd');
    descricao.appendChild(renderizarValor(valor, mapa));
    lista.append(termo, descricao);
  });

  return lista;
}
