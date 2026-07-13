import { atualizarPersonagem } from '../../services/personagensService.js';
import { entradaTemEfeitoAoUsar } from '../../services/modificadoresService.js';
import { NOMES_ATRIBUTOS } from '../../config/nomesAtributos.js';
import { abrirModalSimples, fecharModalSimples } from './modalSimples.js';

const TIPOS = [
  { valor: 'ativa', rotulo: 'Ativa' },
  { valor: 'passiva', rotulo: 'Passiva' },
  { valor: 'reacao', rotulo: 'Reação' },
  { valor: 'sustentada', rotulo: 'Sustentada' },
  { valor: 'outro', rotulo: 'Outro' },
];

const RECURSOS = ['Nenhum', 'Mana', 'Vida', 'Sanidade', 'Cansaço'];

const TIPOS_EFEITO = [
  { valor: 'recurso_maximo', rotulo: 'Máximo de recurso' },
  { valor: 'atributo', rotulo: 'Atributo' },
  { valor: 'combate', rotulo: 'Estatística de combate' },
  { valor: 'pericia_bonus', rotulo: 'Bônus de perícia' },
  { valor: 'pericia_vantagem', rotulo: 'Vantagem em perícia' },
  { valor: 'pericia_desvantagem', rotulo: 'Desvantagem em perícia' },
];

const ALVOS_FIXOS = {
  recurso_maximo: [
    { valor: 'vida', rotulo: 'Vida máxima' },
    { valor: 'mana', rotulo: 'Mana máxima' },
    { valor: 'sanidade', rotulo: 'Sanidade máxima' },
  ],
  atributo: Object.entries(NOMES_ATRIBUTOS).map(([valor, rotulo]) => ({ valor, rotulo })),
  combate: [
    { valor: 'defesa', rotulo: 'Defesa' },
    { valor: 'iniciativa', rotulo: 'Iniciativa' },
    { valor: 'movimento', rotulo: 'Movimento' },
  ],
};

function gerarId(prefixo) {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefixo}-${token}`;
}

function rotuloTipo(tipo) {
  return TIPOS.find(item => item.valor === tipo)?.rotulo || 'Outro';
}

function criarCampo(rotulo, controle, { largo = false } = {}) {
  const campo = document.createElement('label');
  campo.className = largo ? 'ficha-campo ficha-colecao-campo--largo' : 'ficha-campo';
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  campo.append(label, controle);
  return campo;
}

function criarInput(aria, valor = '', opcoes = {}) {
  const input = document.createElement(opcoes.textarea ? 'textarea' : 'input');
  input.className = 'ficha-campo-input';
  input.setAttribute('aria-label', aria);
  if (!opcoes.textarea) input.type = opcoes.tipo || 'text';
  if (opcoes.textarea) input.rows = opcoes.linhas || 4;
  if (opcoes.maxLength) input.maxLength = opcoes.maxLength;
  if (opcoes.min !== undefined) input.min = String(opcoes.min);
  if (opcoes.max !== undefined) input.max = String(opcoes.max);
  if (opcoes.placeholder) input.placeholder = opcoes.placeholder;
  input.value = valor;
  return input;
}

function criarSelect(aria, opcoes, valorAtual) {
  const select = document.createElement('select');
  select.className = 'ficha-campo-select';
  select.setAttribute('aria-label', aria);
  opcoes.forEach(item => {
    const option = document.createElement('option');
    option.value = item.valor ?? item;
    option.textContent = item.rotulo ?? item;
    option.selected = option.value === valorAtual;
    select.appendChild(option);
  });
  return select;
}

function salvarLista(personagem, ctx, chave, lista, mensagem) {
  const resultado = atualizarPersonagem(personagem.id, { [chave]: lista });
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return false;
  }
  Object.assign(personagem, resultado.personagem);
  fecharModalSimples();
  ctx.mostrarToast(mensagem, 'sucesso');
  ctx.recarregar();
  return true;
}

function custoTexto(item) {
  if (!item.custo || item.tipoCusto === 'Nenhum') return 'Sem custo';
  return `${item.custo} ${item.tipoCusto}`;
}

function opcoesAlvoEfeito(tipo, personagem, ctx) {
  if (ALVOS_FIXOS[tipo]) return ALVOS_FIXOS[tipo];
  const pericias = [
    ...(ctx.catalogo.pericias || []),
    ...(personagem.periciasPersonalizadas || []),
  ].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  return pericias.map(pericia => ({ valor: pericia.id, rotulo: pericia.titulo }));
}

function rotuloAlvoEfeito(efeito, personagem, ctx) {
  return opcoesAlvoEfeito(efeito.tipo, personagem, ctx)
    .find(item => item.valor === efeito.alvo)?.rotulo || efeito.alvo;
}

function rotuloTipoEfeito(tipo) {
  return TIPOS_EFEITO.find(item => item.valor === tipo)?.rotulo || tipo;
}

export function abrirModificadores(personagem, ctx, config, item) {
  let efeitos = (item.efeitos || []).map(efeito => ({ ...efeito }));
  const corpo = document.createElement('div');
  corpo.className = 'ficha-modificadores-modal';
  const intro = document.createElement('p');
  intro.className = 'ficha-calculo-formula';
  intro.textContent = 'Escolha exatamente o que o efeito altera. “Sempre ativo” vale enquanto estiver na ficha; “Ao usar” fica ativo depois do botão Usar até ser encerrado.';
  corpo.appendChild(intro);

  const form = document.createElement('div');
  form.className = 'ficha-modificadores-form';
  const tipo = criarSelect('Tipo do modificador', TIPOS_EFEITO, 'recurso_maximo');
  const alvo = criarSelect('Alvo do modificador', opcoesAlvoEfeito(tipo.value, personagem, ctx), 'vida');
  const valor = criarInput('Valor do modificador', '1', { tipo: 'number', min: -999, max: 999 });
  const modo = criarSelect('Ativação do modificador', [
    { valor: 'sempre', rotulo: 'Sempre ativo' },
    { valor: 'ao_usar', rotulo: 'Ao usar' },
  ], item.tipo === 'passiva' ? 'sempre' : 'ao_usar');
  const descricao = criarInput('Descrição do modificador', '', { maxLength: 160, placeholder: 'Ex.: Armadura espectral, bônus racial...' });
  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.className = 'ficha-cta-btn';
  adicionar.textContent = '+ Adicionar efeito';
  form.append(
    criarCampo('Afeta', tipo),
    criarCampo('Alvo', alvo),
    criarCampo('Valor', valor),
    criarCampo('Ativação', modo),
    criarCampo('Origem / observação', descricao),
    adicionar,
  );
  corpo.appendChild(form);

  const lista = document.createElement('div');
  lista.className = 'ficha-modificadores-lista';
  corpo.appendChild(lista);

  const acoes = document.createElement('div');
  acoes.className = 'ficha-colecao-form-acoes';
  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fecharModalSimples);
  const salvar = document.createElement('button');
  salvar.type = 'button';
  salvar.className = 'ficha-cta-btn';
  salvar.textContent = 'Salvar modificadores';
  salvar.addEventListener('click', () => {
    const novaLista = (personagem[config.chave] || []).map(entrada =>
      entrada.id === item.id ? { ...entrada, efeitos } : entrada);
    const efeitosAtivos = { ...(personagem.efeitosAtivos || {}) };
    if (!efeitos.some(efeito => efeito.modo === 'ao_usar')) delete efeitosAtivos[item.id];
    const resultado = atualizarPersonagem(personagem.id, { [config.chave]: novaLista, efeitosAtivos });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return;
    }
    Object.assign(personagem, resultado.personagem);
    fecharModalSimples();
    ctx.mostrarToast(`Modificadores de ${item.nome} foram atualizados.`, 'sucesso');
    ctx.recarregar();
  });
  acoes.append(cancelar, salvar);
  corpo.appendChild(acoes);

  function atualizarAlvos() {
    const opcoes = opcoesAlvoEfeito(tipo.value, personagem, ctx);
    alvo.innerHTML = '';
    opcoes.forEach(itemAlvo => {
      const option = document.createElement('option');
      option.value = itemAlvo.valor;
      option.textContent = itemAlvo.rotulo;
      alvo.appendChild(option);
    });
    const ehRolagem = tipo.value === 'pericia_vantagem' || tipo.value === 'pericia_desvantagem';
    if (ehRolagem && Number(valor.value) <= 0) valor.value = '1';
  }

  function renderizarLista() {
    lista.innerHTML = '';
    if (!efeitos.length) {
      const vazio = document.createElement('p');
      vazio.className = 'ficha-colecao-vazio';
      vazio.textContent = 'Nenhum modificador configurado.';
      lista.appendChild(vazio);
      return;
    }
    efeitos.forEach(efeito => {
      const card = document.createElement('div');
      card.className = 'ficha-modificador-card';
      const texto = document.createElement('div');
      const titulo = document.createElement('strong');
      const sinal = efeito.valor >= 0 ? `+${efeito.valor}` : String(efeito.valor);
      titulo.textContent = `${rotuloTipoEfeito(efeito.tipo)} · ${rotuloAlvoEfeito(efeito, personagem, ctx)} · ${sinal}`;
      const meta = document.createElement('span');
      meta.textContent = `${efeito.modo === 'sempre' ? 'Sempre ativo' : 'Ao usar'}${efeito.descricao ? ` · ${efeito.descricao}` : ''}`;
      texto.append(titulo, meta);
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'ficha-info-btn ficha-colecao-excluir';
      remover.textContent = '×';
      remover.setAttribute('aria-label', `Remover modificador ${titulo.textContent}`);
      remover.addEventListener('click', () => {
        efeitos = efeitos.filter(atual => atual.id !== efeito.id);
        renderizarLista();
      });
      card.append(texto, remover);
      lista.appendChild(card);
    });
  }

  tipo.addEventListener('change', atualizarAlvos);
  adicionar.addEventListener('click', () => {
    let valorNumerico = Math.trunc(Number(valor.value) || 0);
    if (tipo.value === 'pericia_vantagem' || tipo.value === 'pericia_desvantagem') {
      valorNumerico = Math.max(1, Math.abs(valorNumerico));
    }
    if (!valorNumerico || !alvo.value) {
      ctx.mostrarToast('Escolha um alvo e informe um valor diferente de zero.', 'erro');
      return;
    }
    efeitos.push({
      id: gerarId('efeito'),
      tipo: tipo.value,
      alvo: alvo.value,
      valor: Math.max(-999, Math.min(999, valorNumerico)),
      modo: modo.value === 'ao_usar' ? 'ao_usar' : 'sempre',
      descricao: descricao.value.trim(),
    });
    descricao.value = '';
    renderizarLista();
  });
  atualizarAlvos();
  renderizarLista();

  abrirModalSimples({
    titulo: `Modificadores — ${item.nome}`,
    corpo,
    classeExtra: 'ficha-modal--modificadores',
  });
}

function abrirEditor(personagem, ctx, config, existente = null) {
  const singular = config.singular.toLocaleLowerCase('pt-BR');
  const novoRotulo = config.genero === 'f' ? 'Nova' : 'Novo';
  const artigo = config.genero === 'f' ? 'da' : 'do';
  const form = document.createElement('form');
  form.className = 'ficha-colecao-form';

  const nome = criarInput(`Nome ${artigo} ${singular}`, existente?.nome || '', {
    maxLength: 80,
    placeholder: `Nome ${artigo} ${singular}`,
  });
  nome.required = true;
  const fonte = criarInput(`Fonte ${artigo} ${singular}`, existente?.fonte || 'Geral', {
    maxLength: 60,
    placeholder: 'Ex.: Guerreiro, Humano, Item, Legado...',
  });
  const tipo = criarSelect(`Tipo ${artigo} ${singular}`, TIPOS, existente?.tipo || 'ativa');
  const nivel = criarInput(`Nível ${artigo} ${singular}`, existente?.nivel || 0, { tipo: 'number', min: 0, max: 40 });
  const custo = criarInput(`Custo ${artigo} ${singular}`, existente?.custo || 0, { tipo: 'number', min: 0, max: 999 });
  const tipoCusto = criarSelect(`Recurso ${artigo} ${singular}`, RECURSOS, existente?.tipoCusto || 'Nenhum');
  const custoGrupo = document.createElement('div');
  custoGrupo.className = 'ficha-colecao-custo-campo';
  custoGrupo.append(custo, tipoCusto);
  const acao = criarInput(`Ação ${artigo} ${singular}`, existente?.acao || '', { maxLength: 80, placeholder: 'Ex.: Ação padrão, reação...' });
  const duracao = criarInput(`Duração ${artigo} ${singular}`, existente?.duracao || '', { maxLength: 80, placeholder: 'Ex.: Instantânea, 3 rodadas...' });
  const alcance = criarInput(`Alcance ${artigo} ${singular}`, existente?.alcance || '', { maxLength: 80, placeholder: 'Ex.: Pessoal, 9 m...' });
  const modificadoresChamada = document.createElement('div');
  modificadoresChamada.className = 'ficha-colecao-modificadores-chamada ficha-colecao-campo--largo';
  const modificadoresTexto = document.createElement('div');
  const modificadoresTitulo = document.createElement('strong');
  modificadoresTitulo.textContent = 'Buffs / modificadores';
  const modificadoresAjuda = document.createElement('span');
  modificadoresAjuda.textContent = existente
    ? `${existente.efeitos?.length || 0} efeito(s) configurado(s).`
    : 'Salve a entrada primeiro; depois configure exatamente onde ela afeta a ficha.';
  modificadoresTexto.append(modificadoresTitulo, modificadoresAjuda);
  modificadoresChamada.appendChild(modificadoresTexto);
  if (existente) {
    const configurar = document.createElement('button');
    configurar.type = 'button';
    configurar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
    configurar.textContent = 'Configurar modificadores';
    configurar.addEventListener('click', () => abrirModificadores(personagem, ctx, config, existente));
    modificadoresChamada.appendChild(configurar);
  }
  const descricao = criarInput(`Descrição ${artigo} ${singular}`, existente?.descricao || '', {
    textarea: true,
    linhas: 6,
    maxLength: 2000,
    placeholder: 'Descreva o efeito e as condições de uso.',
  });

  const erro = document.createElement('p');
  erro.className = 'ficha-modal-erro ficha-colecao-campo--largo';
  erro.hidden = true;
  erro.setAttribute('role', 'alert');

  const acoes = document.createElement('div');
  acoes.className = 'ficha-colecao-form-acoes ficha-colecao-campo--largo';
  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fecharModalSimples);
  const salvar = document.createElement('button');
  salvar.type = 'submit';
  salvar.className = 'ficha-cta-btn';
  salvar.textContent = existente ? 'Salvar alterações' : `Criar ${singular}`;
  acoes.append(cancelar, salvar);

  form.append(
    criarCampo('Nome', nome),
    criarCampo('Fonte', fonte),
    criarCampo('Tipo de efeito', tipo),
    criarCampo('Nível adquirido', nivel),
    criarCampo('Custo', custoGrupo),
    criarCampo('Ação', acao),
    criarCampo('Duração', duracao),
    criarCampo('Alcance', alcance),
    modificadoresChamada,
    criarCampo('Descrição e efeito', descricao, { largo: true }),
    erro,
    acoes,
  );

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const nomeLimpo = nome.value.trim();
    const listaAtual = personagem[config.chave] || [];
    const duplicado = listaAtual.some(item => item.id !== existente?.id
      && item.nome.toLocaleLowerCase('pt-BR') === nomeLimpo.toLocaleLowerCase('pt-BR'));
    if (nomeLimpo.length < 2) {
      erro.textContent = 'Informe um nome com pelo menos 2 caracteres.';
      erro.hidden = false;
      nome.focus();
      return;
    }
    if (duplicado) {
      erro.textContent = `Já existe ${singular} com esse nome.`;
      erro.hidden = false;
      nome.focus();
      return;
    }

    const novoItem = {
      id: existente?.id || gerarId(config.prefixo),
      nome: nomeLimpo,
      fonte: fonte.value.trim() || 'Geral',
      tipo: TIPOS.some(item => item.valor === tipo.value) ? tipo.value : 'ativa',
      nivel: Math.max(0, Math.min(40, Math.trunc(Number(nivel.value) || 0))),
      custo: Math.max(0, Math.min(999, Math.trunc(Number(custo.value) || 0))),
      tipoCusto: RECURSOS.includes(tipoCusto.value) ? tipoCusto.value : 'Nenhum',
      acao: acao.value.trim(),
      duracao: duracao.value.trim(),
      alcance: alcance.value.trim(),
      modificadores: existente?.modificadores || '',
      efeitos: existente?.efeitos || [],
      descricao: descricao.value.trim(),
    };
    const novaLista = existente
      ? listaAtual.map(item => item.id === existente.id ? novoItem : item)
      : [...listaAtual, novoItem];
    salvarLista(personagem, ctx, config.chave, novaLista, `${nomeLimpo} ${existente ? 'foi atualizado' : 'foi criado'}.`);
  });

  abrirModalSimples({
    titulo: existente ? `Editar ${singular}` : `${novoRotulo} ${singular}`,
    corpo: form,
    classeExtra: 'ficha-modal--colecao',
  });
  requestAnimationFrame(() => nome.focus());
}

function criarLinhaDetalhe(rotulo, valor) {
  const grupo = document.createElement('div');
  grupo.className = 'ficha-colecao-detalhe-item';
  const dt = document.createElement('dt');
  dt.textContent = rotulo;
  const dd = document.createElement('dd');
  dd.textContent = valor || '—';
  grupo.append(dt, dd);
  return grupo;
}

function abrirDetalhes(personagem, ctx, config, item) {
  const corpo = document.createElement('div');
  corpo.className = 'ficha-colecao-detalhes';
  const meta = document.createElement('dl');
  meta.className = 'ficha-colecao-detalhes-grade';
  meta.append(
    criarLinhaDetalhe('Fonte', item.fonte),
    criarLinhaDetalhe('Tipo', rotuloTipo(item.tipo)),
    criarLinhaDetalhe('Nível adquirido', item.nivel ? String(item.nivel) : 'Não informado'),
    criarLinhaDetalhe('Custo', custoTexto(item)),
    criarLinhaDetalhe('Ação', item.acao),
    criarLinhaDetalhe('Duração', item.duracao),
    criarLinhaDetalhe('Alcance', item.alcance),
  );
  corpo.appendChild(meta);
  if (item.efeitos?.length || item.modificadores) {
    const bloco = document.createElement('section');
    bloco.className = 'ficha-colecao-detalhe-bloco';
    const titulo = document.createElement('h3');
    titulo.textContent = 'Buffs / modificadores';
    bloco.appendChild(titulo);
    if (item.efeitos?.length) {
      const lista = document.createElement('div');
      lista.className = 'ficha-modificadores-resumo';
      item.efeitos.forEach(efeito => {
        const linha = document.createElement('span');
        const sinal = efeito.valor >= 0 ? `+${efeito.valor}` : String(efeito.valor);
        linha.textContent = `${rotuloTipoEfeito(efeito.tipo)} · ${rotuloAlvoEfeito(efeito, personagem, ctx)} · ${sinal} · ${efeito.modo === 'sempre' ? 'sempre' : 'ao usar'}`;
        lista.appendChild(linha);
      });
      bloco.appendChild(lista);
    }
    if (item.modificadores) {
      const texto = document.createElement('p');
      texto.textContent = item.modificadores;
      bloco.appendChild(texto);
    }
    corpo.appendChild(bloco);
  }
  const blocoDescricao = document.createElement('section');
  blocoDescricao.className = 'ficha-colecao-detalhe-bloco';
  const tituloDescricao = document.createElement('h3');
  tituloDescricao.textContent = 'Descrição e efeito';
  const textoDescricao = document.createElement('p');
  textoDescricao.textContent = item.descricao || 'Nenhuma descrição informada.';
  blocoDescricao.append(tituloDescricao, textoDescricao);
  corpo.appendChild(blocoDescricao);

  const acoes = document.createElement('div');
  acoes.className = 'ficha-colecao-detalhe-acoes';
  const configurar = document.createElement('button');
  configurar.type = 'button';
  configurar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  configurar.textContent = 'Configurar modificadores';
  configurar.addEventListener('click', () => abrirModificadores(personagem, ctx, config, item));
  acoes.appendChild(configurar);
  if (item.tipo !== 'passiva') {
    const usar = document.createElement('button');
    usar.type = 'button';
    usar.className = 'ficha-cta-btn';
    usar.textContent = `Usar ${config.singular.toLocaleLowerCase('pt-BR')}`;
    usar.addEventListener('click', () => usarEntrada(personagem, ctx, config, item));
    acoes.appendChild(usar);
  }
  if (personagem.efeitosAtivos?.[item.id]) {
    const encerrar = document.createElement('button');
    encerrar.type = 'button';
    encerrar.className = 'ficha-cta-btn ficha-colecao-encerrar';
    encerrar.textContent = 'Encerrar efeitos';
    encerrar.addEventListener('click', () => desativarEntrada(personagem, ctx, item));
    acoes.appendChild(encerrar);
  }
  const editar = document.createElement('button');
  editar.type = 'button';
  editar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  editar.textContent = 'Editar';
  editar.addEventListener('click', () => abrirEditor(personagem, ctx, config, item));
  acoes.appendChild(editar);
  corpo.appendChild(acoes);

  abrirModalSimples({
    titulo: item.nome,
    corpo,
    classeExtra: 'ficha-modal--colecao-detalhes',
  });
}

function abrirExclusao(personagem, ctx, config, item) {
  const corpo = document.createElement('div');
  corpo.className = 'ficha-colecao-exclusao';
  const texto = document.createElement('p');
  texto.textContent = `Excluir “${item.nome}”? Essa ação remove somente esta entrada da ficha.`;
  const acoes = document.createElement('div');
  acoes.className = 'ficha-colecao-form-acoes';
  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fecharModalSimples);
  const excluir = document.createElement('button');
  excluir.type = 'button';
  excluir.className = 'ficha-cta-btn ficha-colecao-excluir-confirmar';
  excluir.textContent = 'Excluir definitivamente';
  excluir.addEventListener('click', () => {
    const novaLista = (personagem[config.chave] || []).filter(atual => atual.id !== item.id);
    const efeitosAtivos = { ...(personagem.efeitosAtivos || {}) };
    delete efeitosAtivos[item.id];
    const resultado = atualizarPersonagem(personagem.id, {
      [config.chave]: novaLista,
      efeitosAtivos,
    });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return;
    }
    Object.assign(personagem, resultado.personagem);
    fecharModalSimples();
    ctx.mostrarToast(`${item.nome} foi excluído.`, 'sucesso');
    ctx.recarregar();
  });
  acoes.append(cancelar, excluir);
  corpo.append(texto, acoes);
  abrirModalSimples({ titulo: `Excluir ${config.singular.toLocaleLowerCase('pt-BR')}`, corpo, classeExtra: 'ficha-modal--confirmacao' });
}

export function usarEntrada(personagem, ctx, config, item) {
  const custo = Math.max(0, Number(item.custo) || 0);
  const recursos = { ...(personagem.recursos || {}) };
  const tipoCusto = item.tipoCusto || 'Nenhum';
  const mapa = {
    Mana: { chave: 'manaAtual', direcao: -1, minimo: 0 },
    Vida: { chave: 'vidaAtual', direcao: -1, minimo: 0 },
    Sanidade: { chave: 'sanidade', direcao: -1, minimo: 0 },
    Cansaço: { chave: 'cansaco', direcao: 1, maximo: 6 },
  };
  const regra = mapa[tipoCusto];
  if (custo > 0 && regra) {
    const atual = Number(recursos[regra.chave]) || 0;
    const novo = atual + (custo * regra.direcao);
    if ((regra.minimo !== undefined && novo < regra.minimo)
      || (regra.maximo !== undefined && novo > regra.maximo)) {
      const mensagem = tipoCusto === 'Cansaço'
        ? `Usar ${item.nome} ultrapassaria o limite de Cansaço.`
        : `Não há ${tipoCusto} suficiente para usar ${item.nome}.`;
      ctx.mostrarToast(mensagem, 'erro');
      return false;
    }
    recursos[regra.chave] = novo;
  }
  const historicoUsos = [...(personagem.historicoUsos || []), {
    id: item.id,
    colecao: config.chave,
    nome: item.nome,
    custo,
    tipoCusto,
    usadoEm: new Date().toISOString(),
  }].slice(-100);
  const efeitosAtivos = { ...(personagem.efeitosAtivos || {}) };
  if (entradaTemEfeitoAoUsar(item)) efeitosAtivos[item.id] = true;
  const resultado = atualizarPersonagem(personagem.id, { recursos, historicoUsos, efeitosAtivos });
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return false;
  }
  Object.assign(personagem, resultado.personagem);
  ctx.mostrarToast(`${item.nome} foi usado${custo ? ` por ${custoTexto(item)}` : ''}.`, 'sucesso');
  if (entradaTemEfeitoAoUsar(item)) ctx.recarregar();
  return true;
}

export function desativarEntrada(personagem, ctx, item) {
  const efeitosAtivos = { ...(personagem.efeitosAtivos || {}) };
  delete efeitosAtivos[item.id];
  const resultado = atualizarPersonagem(personagem.id, { efeitosAtivos });
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return;
  }
  Object.assign(personagem, resultado.personagem);
  ctx.mostrarToast(`Efeitos de ${item.nome} foram encerrados.`, 'info');
  ctx.recarregar();
}

function duplicarEntrada(personagem, ctx, config, item) {
  const copia = { ...item, id: gerarId(config.prefixo), nome: `Cópia de ${item.nome}`.slice(0, 80) };
  salvarLista(personagem, ctx, config.chave, [...(personagem[config.chave] || []), copia], `${copia.nome} foi criada.`);
}

function formatarData(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Data desconhecida';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function abrirHistorico(personagem, config) {
  const registros = (personagem.historicoUsos || [])
    .filter(item => item.colecao === config.chave)
    .slice()
    .reverse();
  const corpo = document.createElement('div');
  corpo.className = 'ficha-colecao-historico-lista';
  if (!registros.length) {
    const vazio = document.createElement('p');
    vazio.className = 'ficha-colecao-vazio';
    vazio.textContent = `Nenhum uso de ${config.plural.toLocaleLowerCase('pt-BR')} foi registrado.`;
    corpo.appendChild(vazio);
  } else {
    registros.forEach(registro => {
      const linha = document.createElement('div');
      linha.className = 'ficha-colecao-historico-item';
      const nome = document.createElement('strong');
      nome.textContent = registro.nome;
      const meta = document.createElement('span');
      meta.textContent = `${formatarData(registro.usadoEm)} · ${registro.custo ? `${registro.custo} ${registro.tipoCusto}` : 'sem custo'}`;
      linha.append(nome, meta);
      corpo.appendChild(linha);
    });
  }
  abrirModalSimples({ titulo: `Histórico de ${config.plural.toLocaleLowerCase('pt-BR')}`, corpo, classeExtra: 'ficha-modal--historico' });
}

function criarCard(personagem, ctx, config, item) {
  const card = document.createElement('article');
  card.className = 'ficha-colecao-card';
  if (personagem.efeitosAtivos?.[item.id]) card.classList.add('ficha-colecao-card--ativo');
  card.dataset.nome = `${item.nome} ${item.descricao || ''} ${item.modificadores || ''} ${(item.efeitos || []).map(efeito => efeito.descricao).join(' ')}`.toLocaleLowerCase('pt-BR');
  card.dataset.tipo = item.tipo;
  card.dataset.fonte = item.fonte.toLocaleLowerCase('pt-BR');

  const cabecalho = document.createElement('header');
  cabecalho.className = 'ficha-colecao-card-cabecalho';
  const tituloGrupo = document.createElement('div');
  const titulo = document.createElement('h3');
  titulo.textContent = item.nome;
  const fonte = document.createElement('span');
  fonte.textContent = item.fonte;
  tituloGrupo.append(titulo, fonte);
  const tipo = document.createElement('span');
  tipo.className = `ficha-colecao-tipo ficha-colecao-tipo--${item.tipo}`;
  tipo.textContent = rotuloTipo(item.tipo);
  cabecalho.append(tituloGrupo, tipo);

  const descricao = document.createElement('p');
  descricao.className = 'ficha-colecao-card-descricao';
  descricao.textContent = item.descricao || 'Nenhuma descrição informada.';

  const meta = document.createElement('div');
  meta.className = 'ficha-colecao-card-meta';
  [
    custoTexto(item),
    item.acao || null,
    item.alcance || null,
    item.nivel ? `Nível ${item.nivel}` : null,
    item.efeitos?.length ? `${item.efeitos.length} modificador(es)` : null,
  ].filter(Boolean).forEach(texto => {
    const tag = document.createElement('span');
    tag.textContent = texto;
    meta.appendChild(tag);
  });

  const acoes = document.createElement('div');
  acoes.className = 'ficha-colecao-card-acoes';
  const modificadores = document.createElement('button');
  modificadores.type = 'button';
  modificadores.className = 'ficha-info-btn ficha-colecao-modificadores-btn';
  modificadores.textContent = '±';
  modificadores.setAttribute('aria-label', `Configurar modificadores de ${item.nome}`);
  modificadores.addEventListener('click', () => abrirModificadores(personagem, ctx, config, item));
  acoes.appendChild(modificadores);
  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'ficha-info-btn';
  info.textContent = '?';
  info.setAttribute('aria-label', `Detalhes de ${item.nome}`);
  info.addEventListener('click', () => abrirDetalhes(personagem, ctx, config, item));
  acoes.appendChild(info);
  if (item.tipo !== 'passiva') {
    const usar = document.createElement('button');
    usar.type = 'button';
    usar.className = 'ficha-colecao-usar';
    usar.textContent = 'Usar';
    usar.setAttribute('aria-label', `Usar ${item.nome}`);
    usar.addEventListener('click', () => usarEntrada(personagem, ctx, config, item));
    acoes.appendChild(usar);
  }
  if (personagem.efeitosAtivos?.[item.id]) {
    const encerrar = document.createElement('button');
    encerrar.type = 'button';
    encerrar.className = 'ficha-colecao-encerrar';
    encerrar.textContent = 'Encerrar';
    encerrar.setAttribute('aria-label', `Encerrar efeitos de ${item.nome}`);
    encerrar.addEventListener('click', () => desativarEntrada(personagem, ctx, item));
    acoes.appendChild(encerrar);
  }
  const duplicar = document.createElement('button');
  duplicar.type = 'button';
  duplicar.className = 'ficha-info-btn ficha-colecao-duplicar';
  duplicar.textContent = '⧉';
  duplicar.setAttribute('aria-label', `Duplicar ${item.nome}`);
  duplicar.addEventListener('click', () => duplicarEntrada(personagem, ctx, config, item));
  const editar = document.createElement('button');
  editar.type = 'button';
  editar.className = 'ficha-info-btn';
  editar.textContent = '✎';
  editar.setAttribute('aria-label', `Editar ${item.nome}`);
  editar.addEventListener('click', () => abrirEditor(personagem, ctx, config, item));
  const excluir = document.createElement('button');
  excluir.type = 'button';
  excluir.className = 'ficha-info-btn ficha-colecao-excluir';
  excluir.textContent = '×';
  excluir.setAttribute('aria-label', `Excluir ${item.nome}`);
  excluir.addEventListener('click', () => abrirExclusao(personagem, ctx, config, item));
  acoes.append(duplicar, editar, excluir);

  card.append(cabecalho, descricao, meta, acoes);
  return card;
}

export function renderizarColecaoPoderesHabilidades(container, personagem, ctx, config) {
  const pagina = document.createElement('section');
  pagina.className = `ficha-colecao-pagina ficha-colecao-pagina--${config.chave}`;
  const itens = personagem[config.chave] || [];

  const topo = document.createElement('header');
  topo.className = 'ficha-colecao-topo';
  const texto = document.createElement('div');
  const titulo = document.createElement('h2');
  titulo.textContent = config.plural;
  const intro = document.createElement('p');
  intro.textContent = config.descricao;
  texto.append(titulo, intro);
  const acoesTopo = document.createElement('div');
  acoesTopo.className = 'ficha-colecao-topo-acoes';
  const total = document.createElement('span');
  const totalNumero = document.createElement('strong');
  totalNumero.textContent = String(itens.length);
  total.append(totalNumero, document.createTextNode(' cadastrados'));
  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.className = 'ficha-cta-btn';
  adicionar.textContent = `+ ${config.genero === 'f' ? 'Nova' : 'Novo'} ${config.singular.toLocaleLowerCase('pt-BR')}`;
  adicionar.addEventListener('click', () => abrirEditor(personagem, ctx, config));
  acoesTopo.append(total, adicionar);
  topo.append(texto, acoesTopo);
  pagina.appendChild(topo);

  const ferramentas = document.createElement('div');
  ferramentas.className = 'ficha-colecao-ferramentas';
  const busca = criarInput(`Buscar ${config.plural.toLocaleLowerCase('pt-BR')}`, '', { placeholder: `Buscar ${config.singular.toLocaleLowerCase('pt-BR')}...` });
  busca.type = 'search';
  const filtroTipo = criarSelect(`Filtrar ${config.plural.toLocaleLowerCase('pt-BR')} por tipo`, [
    { valor: '', rotulo: 'Todos os tipos' },
    ...TIPOS,
  ], '');
  const fontes = [...new Set(itens.map(item => item.fonte))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const filtroFonte = criarSelect(`Filtrar ${config.plural.toLocaleLowerCase('pt-BR')} por fonte`, [
    { valor: '', rotulo: 'Todas as fontes' },
    ...fontes.map(fonte => ({ valor: fonte.toLocaleLowerCase('pt-BR'), rotulo: fonte })),
  ], '');
  const historico = document.createElement('button');
  historico.type = 'button';
  historico.className = 'ficha-colecao-historico';
  historico.textContent = 'Histórico';
  historico.addEventListener('click', () => abrirHistorico(personagem, config));
  ferramentas.append(busca, filtroTipo, filtroFonte, historico);
  pagina.appendChild(ferramentas);

  const visiveis = document.createElement('p');
  visiveis.className = 'ficha-colecao-visiveis';
  pagina.appendChild(visiveis);
  const grade = document.createElement('div');
  grade.className = 'ficha-colecao-grade';
  const cards = itens.map(item => {
    const card = criarCard(personagem, ctx, config, item);
    grade.appendChild(card);
    return card;
  });
  pagina.appendChild(grade);

  const vazio = document.createElement('div');
  vazio.className = 'ficha-colecao-vazio';
  const vazioTitulo = document.createElement('strong');
  vazioTitulo.textContent = `${config.genero === 'f' ? 'Nenhuma' : 'Nenhum'} ${config.singular.toLocaleLowerCase('pt-BR')} ${config.genero === 'f' ? 'encontrada' : 'encontrado'}.`;
  const vazioTexto = document.createElement('span');
  vazioTexto.textContent = `Crie uma entrada quando o personagem receber ${config.singular.toLocaleLowerCase('pt-BR')} na campanha.`;
  vazio.append(vazioTitulo, vazioTexto);
  pagina.appendChild(vazio);

  function aplicarFiltros() {
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const tipo = filtroTipo.value;
    const fonte = filtroFonte.value;
    let quantidade = 0;
    cards.forEach(card => {
      const mostrar = (!termo || card.dataset.nome.includes(termo))
        && (!tipo || card.dataset.tipo === tipo)
        && (!fonte || card.dataset.fonte === fonte);
      card.hidden = !mostrar;
      if (mostrar) quantidade += 1;
    });
    visiveis.textContent = `${quantidade} de ${cards.length} ${config.plural.toLocaleLowerCase('pt-BR')} visíveis`;
    vazio.hidden = quantidade !== 0;
    grade.hidden = quantidade === 0;
  }
  busca.addEventListener('input', aplicarFiltros);
  filtroTipo.addEventListener('change', aplicarFiltros);
  filtroFonte.addEventListener('change', aplicarFiltros);
  aplicarFiltros();

  container.appendChild(pagina);
}
