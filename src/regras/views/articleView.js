function slugSecao(texto, indice) {
  const slug = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `regra-secao-${slug || indice}`;
}

export function estruturarArtigo(html) {
  const article = document.createElement('article');
  article.className = 'regras-detail';
  article.innerHTML = html;

  const elementos = [...article.children];
  const secoes = [];
  article.innerHTML = '';
  let secaoAtual = null;

  function criarSecao(titulo, mostrarTitulo = true) {
    const section = document.createElement('section');
    section.className = 'regras-rule-section';
    section.id = slugSecao(titulo, secoes.length);
    section.style.setProperty('--section-index', secoes.length);

    if (mostrarTitulo) {
      const h3 = document.createElement('h3');
      h3.className = 'regras-rule-section-title';
      h3.textContent = titulo;
      section.appendChild(h3);
    }

    article.appendChild(section);
    secoes.push({ titulo, elemento: section });
    return section;
  }

  elementos.forEach(elemento => {
    if (elemento.matches('.regras-subtitle')) {
      secaoAtual = criarSecao(elemento.textContent.trim());
      return;
    }
    if (!secaoAtual) secaoAtual = criarSecao('Visão geral', false);
    secaoAtual.appendChild(elemento);
  });

  return { article, secoes };
}

export function criarNavegacaoSecoes(secoes) {
  const nav = document.createElement('nav');
  nav.className = 'regras-section-nav';
  nav.setAttribute('aria-label', 'Seções desta regra');

  const rotulo = document.createElement('span');
  rotulo.className = 'regras-section-nav-label';
  rotulo.textContent = 'Nesta regra';
  nav.appendChild(rotulo);

  secoes.forEach(({ titulo, elemento }, indice) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'regras-section-link';
    botao.textContent = titulo;
    if (indice === 0) botao.classList.add('is-active');
    botao.addEventListener('click', () => {
      nav.querySelectorAll('.regras-section-link')
        .forEach(link => link.classList.remove('is-active'));
      botao.classList.add('is-active');
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(botao);
  });

  return nav;
}

export function criarDestaques(itens) {
  const dl = document.createElement('dl');
  dl.className = 'regras-overview';

  itens.forEach(([rotulo, valor]) => {
    const grupo = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = rotulo;
    dd.textContent = valor;
    grupo.append(dt, dd);
    dl.appendChild(grupo);
  });

  return dl;
}
