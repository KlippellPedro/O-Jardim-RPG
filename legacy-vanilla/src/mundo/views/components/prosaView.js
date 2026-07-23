import { humanizarChave } from '../../utils/texto.js';

function renderizarSecao(titulo, itens) {
  const secao = document.createElement('section');
  secao.className = 'entry-detail-section';

  const h3 = document.createElement('h3');
  h3.className = 'entry-detail-section-title';
  h3.textContent = titulo;
  secao.appendChild(h3);

  if (Array.isArray(itens)) {
    const lista = document.createElement('ul');
    lista.className = 'entry-detail-list';
    itens.forEach(item => {
      const linha = document.createElement('li');
      linha.textContent = String(item);
      lista.appendChild(linha);
    });
    secao.appendChild(lista);
  } else {
    const paragrafo = document.createElement('p');
    paragrafo.className = 'entry-detail-prose';
    paragrafo.textContent = String(itens);
    secao.appendChild(paragrafo);
  }

  return secao;
}

export function renderizarProsa(conteudo, ignorar = []) {
  const artigo = document.createElement('article');
  artigo.className = 'entry-detail';

  if (Array.isArray(conteudo.ordem) && conteudo.ordem.length > 0) {
    const ordem = document.createElement('div');
    ordem.className = 'cosmo-ordem';
    ordem.setAttribute('aria-label', 'Sequência da hierarquia');

    conteudo.ordem.forEach((nivel, indice) => {
      const item = document.createElement('span');
      item.className = 'cosmo-ordem-item';
      item.textContent = nivel;
      ordem.appendChild(item);

      if (indice < conteudo.ordem.length - 1) {
        const separador = document.createElement('span');
        separador.className = 'cosmo-ordem-sep';
        separador.setAttribute('aria-hidden', 'true');
        separador.textContent = '›';
        ordem.appendChild(separador);
      }
    });

    artigo.appendChild(ordem);
  }

  if (conteudo.descricao) {
    const descricao = document.createElement('p');
    descricao.className = 'entry-detail-prose';
    descricao.textContent = conteudo.descricao;
    artigo.appendChild(descricao);
  }

  const exemplos = Object.entries(conteudo)
    .filter(([chave]) => /^exemplo_\d+$/.test(chave))
    .sort(([chaveA], [chaveB]) => chaveA.localeCompare(chaveB))
    .map(([, valor]) => valor);

  if (exemplos.length > 0) artigo.appendChild(renderizarSecao('Exemplos', exemplos));

  const camposUsados = new Set([
    'descricao',
    'ordem',
    ...ignorar,
    ...Object.keys(conteudo).filter(chave => /^exemplo_\d+$/.test(chave)),
  ]);

  Object.entries(conteudo).forEach(([chave, valor]) => {
    if (camposUsados.has(chave) || valor === null || valor === undefined || valor === '') return;
    artigo.appendChild(renderizarSecao(
      humanizarChave(chave),
      Array.isArray(valor) ? valor : String(valor),
    ));
  });

  return artigo;
}

export function criarSecaoLinks(titulo, itens) {
  const secao = document.createElement('section');
  secao.className = 'entry-detail-section';

  const h3 = document.createElement('h3');
  h3.className = 'entry-detail-section-title';
  h3.textContent = titulo;
  secao.appendChild(h3);

  const lista = document.createElement('ul');
  lista.className = 'entry-detail-list entry-detail-list--links';

  itens.forEach(item => {
    const linha = document.createElement('li');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'entry-link';
    botao.textContent = item.titulo;
    botao.addEventListener('click', item.aoClicar);
    linha.appendChild(botao);
    lista.appendChild(linha);
  });

  secao.appendChild(lista);
  return secao;
}

export function criarTituloSecao(texto) {
  const titulo = document.createElement('h3');
  titulo.className = 'entry-detail-section-title';
  titulo.textContent = texto;
  return titulo;
}

export function criarProsaVazia(texto) {
  const paragrafo = document.createElement('p');
  paragrafo.className = 'entry-detail-prose entry-detail-prose--vazio';
  paragrafo.textContent = texto;
  return paragrafo;
}

export function criarProsaTexto(texto) {
  const paragrafo = document.createElement('p');
  paragrafo.className = 'entry-detail-prose';
  paragrafo.textContent = texto;
  return paragrafo;
}
