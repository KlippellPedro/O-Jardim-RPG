/* Blocos visuais compartilhados pelas telas do portal (conta, mestre, admin).
   Tudo aqui é DOM puro: nada de innerHTML com dado vindo do servidor. */

export const ROTULOS_CARGO = {
  player: 'Player',
  mestre: 'Mestre',
  admin: 'Administrador',
  criador: 'Criador',
};

export const ROTULOS_PAPEL = {
  mestre: 'Mestre',
  assistente: 'Assistente',
  jogador: 'Jogador',
  observador: 'Observador',
};

export const ROTULOS_ACESSO = {
  oculto: 'Oculto',
  rumor: 'Rumor',
  parcial: 'Parcial',
  completo: 'Completo',
};

export const ROTULOS_MODULO = {
  loja: 'Itens',
  mundo: 'Mundo',
  regras: 'Área do mestre',
};

export function texto(erro, fallback = 'Não foi possível concluir a operação.') {
  return erro instanceof Error && erro.message ? erro.message : fallback;
}

export function elemento(tag, classe = '', conteudo = null) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (conteudo !== null && conteudo !== undefined) node.textContent = String(conteudo);
  return node;
}

let sequenciaCampo = 0;

export function campo(rotulo, tipo, nome, extras = {}) {
  const label = elemento('div', 'plataforma-campo');
  const { descricao = '', classe = '', ...atributos } = extras;
  if (classe) label.classList.add(classe);
  const span = elemento('label', 'plataforma-campo-rotulo', rotulo);
  const input = document.createElement('input');
  input.type = tipo;
  input.name = nome;
  Object.entries(atributos).forEach(([chave, valor]) => {
    if (valor === false || valor === null || valor === undefined) return;
    input.setAttribute(chave, valor === true ? '' : valor);
  });
  if (!input.id) input.id = `plataforma-campo-${++sequenciaCampo}`;
  span.htmlFor = input.id;
  label.dataset.obrigatorio = String(input.required);
  label.append(span);

  if (tipo === 'password') {
    const linha = elemento('span', 'plataforma-input-acao');
    const alternar = elemento('button', 'plataforma-input-acao-botao', 'Mostrar');
    alternar.type = 'button';
    alternar.setAttribute('aria-label', `Mostrar ${rotulo.toLocaleLowerCase('pt-BR')}`);
    alternar.setAttribute('aria-pressed', 'false');
    alternar.addEventListener('click', () => {
      const visivel = input.type === 'text';
      input.type = visivel ? 'password' : 'text';
      alternar.textContent = visivel ? 'Mostrar' : 'Ocultar';
      alternar.setAttribute('aria-pressed', String(!visivel));
      alternar.setAttribute('aria-label', `${visivel ? 'Mostrar' : 'Ocultar'} ${rotulo.toLocaleLowerCase('pt-BR')}`);
    });
    linha.append(input, alternar);
    label.append(linha);
  } else {
    label.append(input);
  }

  if (descricao) label.append(elemento('small', 'plataforma-campo-ajuda', descricao));
  label.input = input;
  return label;
}

export function areaTexto(rotulo, nome, extras = {}) {
  const label = elemento('label', 'plataforma-campo');
  const { descricao = '', classe = '', ...atributos } = extras;
  if (classe) label.classList.add(classe);
  const textarea = document.createElement('textarea');
  textarea.name = nome;
  Object.entries(atributos).forEach(([chave, valor]) => {
    if (valor === false || valor === null || valor === undefined) return;
    if (chave === 'value') textarea.value = valor;
    else textarea.setAttribute(chave, valor === true ? '' : valor);
  });
  label.dataset.obrigatorio = String(textarea.required);
  label.append(elemento('span', 'plataforma-campo-rotulo', rotulo), textarea);
  if (descricao) label.append(elemento('small', 'plataforma-campo-ajuda', descricao));
  label.input = textarea;
  return label;
}

export function seletor(rotulo, opcoes, valorAtual = null) {
  const label = elemento('label', 'plataforma-campo');
  if (rotulo) label.append(elemento('span', 'plataforma-campo-rotulo', rotulo));
  const select = document.createElement('select');
  opcoes.forEach(([valor, nome]) => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = nome;
    option.selected = valor === valorAtual;
    select.append(option);
  });
  label.append(select);
  label.select = select;
  return label;
}

export function botao(rotulo, classe = '', aoClicar = null) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = `plataforma-botao ${classe}`.trim();
  node.textContent = rotulo;
  if (aoClicar) node.addEventListener('click', aoClicar);
  return node;
}

/* Botão que se desabilita durante a ação e volta sozinho se der erro — sem
   isso cada tela repetia o mesmo try/finally com `disabled`. */
export function acao(rotulo, classe, executar, { confirmar = null } = {}) {
  const node = botao(rotulo, classe);
  node.addEventListener('click', async () => {
    if (confirmar && !window.confirm(confirmar)) return;
    node.disabled = true;
    node.setAttribute('aria-busy', 'true');
    try {
      await executar();
    } finally {
      node.disabled = false;
      node.removeAttribute('aria-busy');
    }
  });
  return node;
}

export function ajuda(explicacao) {
  const wrapper = elemento('span', 'plataforma-ajuda');
  const trigger = elemento('button', 'plataforma-ajuda-botao', '?');
  trigger.type = 'button';
  trigger.setAttribute('aria-label', explicacao);
  trigger.setAttribute('aria-expanded', 'false');
  const textoAjuda = elemento('span', 'plataforma-ajuda-texto', explicacao);
  textoAjuda.hidden = true;
  trigger.addEventListener('click', () => {
    textoAjuda.hidden = !textoAjuda.hidden;
    trigger.setAttribute('aria-expanded', String(!textoAjuda.hidden));
  });
  wrapper.append(trigger, textoAjuda);
  return wrapper;
}

export function cartao(titulo, descricao = '', { larga = false, classe = '' } = {}) {
  const card = elemento('section', `plataforma-card ${larga ? 'plataforma-card--larga' : ''} ${classe}`.trim());
  if (titulo) {
    const linha = elemento('div', 'plataforma-titulo-linha');
    const bloco = elemento('div');
    bloco.append(elemento('h3', '', titulo));
    if (descricao) bloco.append(elemento('p', '', descricao));
    linha.append(bloco);
    card.append(linha);
    card.cabecalho = linha;
  }
  return card;
}

export function subcartao(titulo, descricao = '') {
  const bloco = elemento('div', 'plataforma-subcard');
  if (titulo) bloco.append(elemento('h4', '', titulo));
  if (descricao) bloco.append(elemento('p', '', descricao));
  return bloco;
}

export function vazio(mensagem) {
  const node = elemento('p', 'plataforma-vazio', mensagem);
  node.setAttribute('role', 'status');
  return node;
}

export function aviso(mensagem) {
  return elemento('p', 'plataforma-aviso', mensagem);
}

export function selo(rotulo, tom = 'neutro') {
  const node = elemento('span', 'plataforma-selo', rotulo);
  node.dataset.tom = tom;
  return node;
}

export function carregando(mensagem = 'Carregando…') {
  const bloco = elemento('div', 'plataforma-carregando');
  bloco.append(elemento('span', 'plataforma-spinner'), elemento('span', '', mensagem));
  return bloco;
}

/* Subnavegação interna (usada pelo painel do mestre e pelo admin). */
export function subabas(itens, ativa, aoTrocar) {
  const nav = elemento('nav', 'plataforma-subabas');
  nav.setAttribute('aria-label', 'Seções do painel');
  itens.forEach(([id, rotulo]) => {
    const item = botao(rotulo, 'plataforma-subaba', () => aoTrocar(id));
    item.dataset.ativo = String(id === ativa);
    if (id === ativa) item.setAttribute('aria-current', 'page');
    nav.append(item);
  });
  return nav;
}

export function dataCurta(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dataRelativa(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const segundos = Math.round((Date.now() - data.getTime()) / 1000);
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  if (segundos < 604800) return `há ${Math.floor(segundos / 86400)} d`;
  return dataCurta(valor);
}

/* Filtro por texto sem acento — "Aethel" acha "aethel" e "AETHEL". */
export function normalizar(valor) {
  return String(valor || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
