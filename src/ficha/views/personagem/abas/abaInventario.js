import { atualizarPersonagem } from '../../../services/personagensService.js';
import {
  TIPOS_INVENTARIO,
  RARIDADES_INVENTARIO,
  normalizarItemInventario,
  raridadeInventario,
  resumirInventario,
  tipoInventario,
} from '../../../services/inventarioService.js';
import { sincronizarAtaquesComInventario } from '../../../services/ataquesService.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

function gerarId(prefixo = 'item') {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefixo}-${token}`;
}

function sinal(valor) {
  const numero = Number(valor) || 0;
  return numero >= 0 ? `+${numero}` : String(numero);
}

function criarInput(aria, valor = '', opcoes = {}) {
  const input = document.createElement(opcoes.textarea ? 'textarea' : 'input');
  input.className = 'ficha-campo-input';
  input.setAttribute('aria-label', aria);
  if (opcoes.textarea) input.rows = opcoes.linhas || 4;
  else input.type = opcoes.tipo || 'text';
  if (opcoes.placeholder) input.placeholder = opcoes.placeholder;
  if (opcoes.min !== undefined) input.min = String(opcoes.min);
  if (opcoes.max !== undefined) input.max = String(opcoes.max);
  if (opcoes.step !== undefined) input.step = String(opcoes.step);
  if (opcoes.maxLength) input.maxLength = opcoes.maxLength;
  input.value = valor ?? '';
  return input;
}

function criarSelect(aria, opcoes, valorAtual = '') {
  const select = document.createElement('select');
  select.className = 'ficha-campo-select';
  select.setAttribute('aria-label', aria);
  opcoes.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id ?? item.valor ?? item;
    option.textContent = item.titulo ?? item.rotulo ?? item;
    option.selected = option.value === valorAtual;
    select.appendChild(option);
  });
  return select;
}

function criarCampo(rotulo, controle, opcoes = {}) {
  const campo = document.createElement('label');
  campo.className = 'ficha-campo ficha-inventario-form-campo';
  if (opcoes.largo) campo.classList.add('ficha-inventario-form-campo--largo');
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  campo.append(label, controle);
  return campo;
}

function criarCheckbox(rotulo, marcado = false) {
  const label = document.createElement('label');
  label.className = 'ficha-inventario-checkbox';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = marcado;
  const texto = document.createElement('span');
  texto.textContent = rotulo;
  label.append(input, texto);
  return { label, input };
}

function criarLinhaDetalhe(rotulo, valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const linha = document.createElement('div');
  linha.className = 'ficha-inventario-detalhe-linha';
  const dt = document.createElement('dt');
  dt.textContent = rotulo;
  const dd = document.createElement('dd');
  dd.textContent = String(valor);
  linha.append(dt, dd);
  return linha;
}

function criarVisualItem(item, classe, fallback) {
  const visual = document.createElement('span');
  visual.className = classe;
  if (!item.imagem) {
    visual.textContent = fallback;
    return visual;
  }
  const imagem = document.createElement('img');
  imagem.src = item.imagem;
  imagem.alt = '';
  imagem.loading = 'lazy';
  imagem.addEventListener('error', () => {
    imagem.remove();
    visual.textContent = fallback;
  }, { once: true });
  visual.appendChild(imagem);
  return visual;
}

export function renderAbaInventario(container, personagem, ctx) {
  let inventario = [...(personagem.inventario || [])];
  let config = { ...(personagem.inventarioConfig || {}) };
  let carteiraMoedas = [...(personagem.carteira || [])];

  const pagina = document.createElement('section');
  pagina.className = 'ficha-inventario-pagina';

  const topo = document.createElement('header');
  topo.className = 'ficha-inventario-topo';
  const topoTexto = document.createElement('div');
  const titulo = document.createElement('h2');
  titulo.textContent = 'Inventário';
  const intro = document.createElement('p');
  intro.textContent = 'Equipamentos para a sessão, consumíveis prontos para uso e uma garagem separada para veículos e montarias.';
  topoTexto.append(titulo, intro);
  const topoAcoes = document.createElement('div');
  topoAcoes.className = 'ficha-inventario-topo-acoes';
  const lojaLink = document.createElement('a');
  lojaLink.href = './loja.html';
  lojaLink.className = 'ficha-cta-btn ficha-cta-btn--secundario ficha-inventario-loja-link';
  lojaLink.textContent = 'Abrir Loja';
  lojaLink.setAttribute('aria-label', 'Abrir Loja e consultar o catálogo');
  const novoItemBtn = document.createElement('button');
  novoItemBtn.type = 'button';
  novoItemBtn.className = 'ficha-cta-btn';
  novoItemBtn.textContent = '+ Novo item';
  const novoVeiculoBtn = document.createElement('button');
  novoVeiculoBtn.type = 'button';
  novoVeiculoBtn.className = 'ficha-cta-btn ficha-inventario-veiculo-btn';
  novoVeiculoBtn.textContent = '+ Veículo';
  topoAcoes.append(lojaLink, novoItemBtn, novoVeiculoBtn);
  topo.append(topoTexto, topoAcoes);
  pagina.appendChild(topo);

  const painelResumo = document.createElement('div');
  painelResumo.className = 'ficha-inventario-resumo-painel';
  const carteira = document.createElement('button');
  carteira.type = 'button';
  carteira.className = 'ficha-inventario-carteira ficha-inventario-carteira--nova';
  carteira.setAttribute('aria-label', 'Abrir carteira do personagem');
  const carteiraIcone = document.createElement('span');
  carteiraIcone.className = 'ficha-inventario-carteira-icone';
  carteiraIcone.textContent = '◈';
  const carteiraTexto = document.createElement('div');
  carteiraTexto.className = 'ficha-inventario-carteira-texto';
  const carteiraTitulo = document.createElement('span');
  carteiraTitulo.className = 'ficha-inventario-carteira-titulo';
  carteiraTitulo.textContent = 'Carteira';
  const carteiraDesc = document.createElement('span');
  carteiraDesc.className = 'ficha-inventario-carteira-desc';
  carteiraDesc.textContent = 'Clique para consultar e ajustar todas as moedas.';
  carteiraTexto.append(carteiraTitulo, carteiraDesc);
  const carteiraPreview = document.createElement('div');
  carteiraPreview.className = 'ficha-inventario-carteira-preview';
  const carteiraSeta = document.createElement('span');
  carteiraSeta.className = 'ficha-inventario-carteira-seta';
  carteiraSeta.textContent = '›';
  carteira.append(carteiraIcone, carteiraTexto, carteiraPreview, carteiraSeta);
  carteira.addEventListener('click', abrirCarteira);
  painelResumo.appendChild(carteira);

  const resumoCards = document.createElement('div');
  resumoCards.className = 'ficha-inventario-resumo-cards';
  const resumoRefs = {};
  [
    ['itens', 'Itens', 'unidades prontas'],
    ['equipados', 'Equipados', 'em uso agora'],
    ['carga', 'Ocupação', 'espaços na mochila'],
    ['veiculos', 'Garagem', 'veículos e montarias'],
  ].forEach(([chave, rotulo, descricao]) => {
    const card = document.createElement(chave === 'carga' ? 'button' : 'div');
    if (card instanceof HTMLButtonElement) card.type = 'button';
    card.className = 'ficha-inventario-resumo-card';
    const valor = document.createElement('strong');
    const label = document.createElement('span');
    label.textContent = rotulo;
    const desc = document.createElement('small');
    desc.textContent = descricao;
    card.append(valor, label, desc);
    resumoRefs[chave] = valor;
    resumoCards.appendChild(card);
    if (chave === 'carga') card.addEventListener('click', abrirCapacidade);
  });
  painelResumo.appendChild(resumoCards);
  pagina.appendChild(painelResumo);

  const ferramentas = document.createElement('div');
  ferramentas.className = 'ficha-inventario-ferramentas';
  const busca = criarInput('Buscar no inventário', '', { tipo: 'search', placeholder: 'Buscar item, efeito, local ou descrição...' });
  const filtroTipo = criarSelect('Filtrar inventário por tipo', [
    { id: '', titulo: 'Todos os tipos' },
    ...TIPOS_INVENTARIO,
  ], '');
  const filtroEstado = criarSelect('Filtrar inventário por estado', [
    { id: '', titulo: 'Todos os estados' },
    { id: 'equipado', titulo: 'Equipados / em uso' },
    { id: 'favorito', titulo: 'Favoritos' },
    { id: 'mochila', titulo: 'Na mochila' },
    { id: 'veiculo', titulo: 'Guardados em veículo' },
  ], '');
  const contador = document.createElement('span');
  contador.className = 'ficha-inventario-contador';
  ferramentas.append(busca, filtroTipo, filtroEstado, contador);
  pagina.appendChild(ferramentas);

  const conteudo = document.createElement('div');
  conteudo.className = 'ficha-inventario-conteudo';
  pagina.appendChild(conteudo);
  container.appendChild(pagina);

  function persistir(novaLista, opcoes = {}) {
    const listaNormalizada = novaLista.map((item, indice) => normalizarItemInventario(item, indice)).filter(Boolean);
    const idsVeiculos = new Set(listaNormalizada.filter(item => item.tipo === 'veiculo').map(item => item.id));
    const listaComLocais = listaNormalizada.map(item => item.localTipo === 'veiculo' && !idsVeiculos.has(item.localId)
      ? { ...item, localTipo: 'personagem', localId: '', localizacao: 'Mochila' }
      : item);
    const ataques = sincronizarAtaquesComInventario(listaComLocais, personagem.ataques || []);
    const resultado = atualizarPersonagem(personagem.id, {
      inventario: listaComLocais,
      ataques,
      ...(opcoes.config ? { inventarioConfig: opcoes.config } : {}),
    });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return false;
    }
    Object.assign(personagem, resultado.personagem);
    inventario = [...personagem.inventario];
    config = { ...personagem.inventarioConfig };
    atualizarTela();
    return true;
  }

  function renderizarCarteiraResumo() {
    carteiraPreview.innerHTML = '';
    carteiraIcone.textContent = carteiraMoedas[0]?.simbolo || '◈';
    carteiraMoedas.slice(0, 3).forEach(moeda => {
      const chip = document.createElement('span');
      chip.className = 'ficha-inventario-moeda-chip';
      const simbolo = document.createElement('i');
      simbolo.textContent = moeda.simbolo || '◈';
      const saldo = document.createElement('strong');
      saldo.textContent = String(moeda.saldo);
      const nome = document.createElement('small');
      nome.textContent = moeda.nome;
      chip.append(simbolo, saldo, nome);
      carteiraPreview.appendChild(chip);
    });
    if (carteiraMoedas.length > 3) {
      const restantes = document.createElement('span');
      restantes.className = 'ficha-inventario-moedas-restantes';
      restantes.textContent = `+${carteiraMoedas.length - 3}`;
      carteiraPreview.appendChild(restantes);
    }
  }

  function salvarCarteira(novaCarteira) {
    const lunaris = novaCarteira.find(moeda => moeda.id === 'lunaris'
      || moeda.nome.toLocaleLowerCase('pt-BR') === 'lunaris')?.saldo ?? personagem.lunaris;
    const resultado = atualizarPersonagem(personagem.id, {
      carteira: novaCarteira,
      lunaris,
    });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return false;
    }
    Object.assign(personagem, resultado.personagem);
    carteiraMoedas = [...novaCarteira];
    renderizarCarteiraResumo();
    return true;
  }

  function abrirCarteira() {
    const corpo = document.createElement('div');
    corpo.className = 'ficha-carteira-modal';
    const intro = document.createElement('p');
    intro.className = 'ficha-calculo-formula';
    intro.textContent = 'As moedas disponíveis vêm da Loja, mas os saldos abaixo pertencem somente a este personagem. A aquisição continua sendo registrada depois da negociação na mesa.';
    corpo.appendChild(intro);

    const lista = document.createElement('div');
    lista.className = 'ficha-carteira-moedas';
    carteiraMoedas.forEach(moeda => {
      const linha = document.createElement('section');
      linha.className = 'ficha-carteira-moeda';
      const identidade = document.createElement('div');
      identidade.className = 'ficha-carteira-moeda-identidade';
      const simbolo = document.createElement('span');
      simbolo.className = 'ficha-carteira-moeda-simbolo';
      simbolo.textContent = moeda.simbolo || '◈';
      const textos = document.createElement('div');
      const nome = document.createElement('strong');
      nome.textContent = moeda.nome;
      const origem = document.createElement('small');
      origem.textContent = 'Moeda disponível na Loja';
      textos.append(nome, origem);
      identidade.append(simbolo, textos);

      const controles = document.createElement('div');
      controles.className = 'ficha-carteira-moeda-controles';
      const input = criarInput(`Saldo de ${moeda.nome}`, moeda.saldo, {
        tipo: 'number', min: 0, max: 999999999, step: 1,
      });

      const aplicar = valor => {
        const saldo = Math.max(0, Math.min(999999999, Math.trunc(Number(valor) || 0)));
        const novaCarteira = carteiraMoedas.map(atual => atual.id === moeda.id ? { ...atual, saldo } : atual);
        if (!salvarCarteira(novaCarteira)) return;
        moeda.saldo = saldo;
        input.value = String(saldo);
      };

      [-10, -1].forEach(delta => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = String(delta);
        botao.setAttribute('aria-label', `Diminuir ${Math.abs(delta)} ${moeda.nome}`);
        botao.addEventListener('click', () => aplicar(moeda.saldo + delta));
        controles.appendChild(botao);
      });
      controles.appendChild(input);
      [1, 10].forEach(delta => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = `+${delta}`;
        botao.setAttribute('aria-label', `Aumentar ${delta} ${moeda.nome}`);
        botao.addEventListener('click', () => aplicar(moeda.saldo + delta));
        controles.appendChild(botao);
      });
      input.addEventListener('change', () => aplicar(input.value));
      linha.append(identidade, controles);
      lista.appendChild(linha);
    });
    corpo.appendChild(lista);

    const rodape = document.createElement('div');
    rodape.className = 'ficha-carteira-rodape';
    const dica = document.createElement('span');
    dica.textContent = 'Novas moedas são cadastradas ou importadas pela Loja.';
    const abrirLoja = document.createElement('a');
    abrirLoja.href = './loja.html';
    abrirLoja.className = 'ficha-cta-btn ficha-cta-btn--secundario';
    abrirLoja.textContent = 'Abrir Loja';
    rodape.append(dica, abrirLoja);
    corpo.appendChild(rodape);
    abrirModalSimples({ titulo: 'Carteira', corpo, classeExtra: 'ficha-modal--carteira' });
  }

  function abrirCapacidade() {
    const corpo = document.createElement('div');
    corpo.className = 'ficha-inventario-capacidade-modal';
    const texto = document.createElement('p');
    texto.className = 'ficha-calculo-formula';
    texto.textContent = 'Defina um limite apenas se a campanha usar espaços. Zero deixa a capacidade sem limite. Itens guardados em veículos não ocupam a mochila.';
    const input = criarInput('Limite de espaços da mochila', config.limiteEspacos || 0, { tipo: 'number', min: 0, max: 999999, step: 0.5 });
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
    salvar.textContent = 'Salvar capacidade';
    salvar.addEventListener('click', () => {
      const limiteEspacos = Math.max(0, Number(input.value) || 0);
      if (!persistir(inventario, { config: { limiteEspacos } })) return;
      fecharModalSimples();
      ctx.mostrarToast('Capacidade da mochila atualizada.', 'sucesso');
    });
    acoes.append(cancelar, salvar);
    corpo.append(texto, criarCampo('Limite de espaços', input), acoes);
    abrirModalSimples({ titulo: 'Capacidade da mochila', corpo, classeExtra: 'ficha-modal--inventario-pequeno' });
  }

  function abrirEditor(existente = null, tipoInicial = 'equipamento') {
    const base = existente || normalizarItemInventario({
      id: gerarId(tipoInicial === 'veiculo' ? 'veiculo' : 'item'),
      nome: 'Novo item',
      tipo: tipoInicial,
      quantidade: 1,
      espacos: tipoInicial === 'veiculo' ? 0 : 1,
      integridadeAtual: tipoInicial === 'veiculo' ? 100 : 1,
      integridadeMaxima: tipoInicial === 'veiculo' ? 100 : 1,
    });
    const form = document.createElement('form');
    form.className = 'ficha-inventario-form';
    const nome = criarInput('Nome do item', existente?.nome || '', { maxLength: 100, placeholder: 'Nome do item' });
    nome.required = true;
    const tipo = criarSelect('Tipo do item', TIPOS_INVENTARIO, base.tipo);
    const raridade = criarSelect('Raridade do item', RARIDADES_INVENTARIO, base.raridade);
    const quantidade = criarInput('Quantidade do item', base.quantidade, { tipo: 'number', min: 1, max: 9999 });
    const espacos = criarInput('Espaços por unidade', base.espacos, { tipo: 'number', min: 0, max: 9999, step: 0.5 });
    const peso = criarInput('Peso por unidade', base.peso, { tipo: 'number', min: 0, max: 999999, step: 0.1 });
    const preco = criarInput('Preço em Lunaris', base.precos?.Lunaris || 0, { tipo: 'number', min: 0, max: 999999 });
    const descricao = criarInput('Descrição do item', base.descricao, { textarea: true, linhas: 4, maxLength: 2000, placeholder: 'Aparência, história e função do item.' });
    const efeito = criarInput('Efeito resumido', base.efeito, { textarea: true, linhas: 2, maxLength: 500, placeholder: 'Efeito mecânico ou benefício principal.' });
    const notas = criarInput('Notas do item', base.notas, { textarea: true, linhas: 3, maxLength: 1200, placeholder: 'Condições, modificações, dono anterior...' });
    const equipado = criarCheckbox('Equipado', base.equipado);
    const favorito = criarCheckbox('Favorito', base.favorito);
    const emUso = criarCheckbox('Veículo em uso', base.emUso);

    const locais = [
      { id: 'personagem:', titulo: 'Mochila do personagem' },
      ...inventario.filter(item => item.tipo === 'veiculo' && item.id !== base.id)
        .map(item => ({ id: `veiculo:${item.id}`, titulo: `Veículo · ${item.nome}` })),
    ];
    const localAtual = base.localTipo === 'veiculo' && base.localId ? `veiculo:${base.localId}` : 'personagem:';
    const local = criarSelect('Local do item', locais, localAtual);

    const principal = document.createElement('div');
    principal.className = 'ficha-inventario-form-grade';
    principal.append(
      criarCampo('Nome', nome, { largo: true }),
      criarCampo('Tipo', tipo),
      criarCampo('Raridade', raridade),
      criarCampo('Quantidade', quantidade),
      criarCampo('Local', local),
      criarCampo('Espaços / unidade', espacos),
      criarCampo('Peso / unidade', peso),
      criarCampo('Preço em Lunaris', preco),
    );
    const flags = document.createElement('div');
    flags.className = 'ficha-inventario-form-flags';
    principal.appendChild(flags);
    form.appendChild(principal);

    const especificos = document.createElement('section');
    especificos.className = 'ficha-inventario-form-especificos';
    const refs = new Map();
    form.appendChild(especificos);

    const textos = document.createElement('div');
    textos.className = 'ficha-inventario-form-grade';
    textos.append(
      criarCampo('Descrição', descricao, { largo: true }),
      criarCampo('Efeito resumido', efeito, { largo: true }),
      criarCampo('Notas', notas, { largo: true }),
    );
    form.appendChild(textos);

    const erro = document.createElement('p');
    erro.className = 'ficha-modal-erro';
    erro.hidden = true;
    form.appendChild(erro);
    const acoes = document.createElement('div');
    acoes.className = 'ficha-colecao-form-acoes';
    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
    cancelar.textContent = 'Cancelar';
    cancelar.addEventListener('click', fecharModalSimples);
    const salvar = document.createElement('button');
    salvar.type = 'submit';
    salvar.className = 'ficha-cta-btn';
    salvar.textContent = existente ? 'Salvar alterações' : 'Adicionar ao inventário';
    acoes.append(cancelar, salvar);
    form.appendChild(acoes);

    function campoEspecifico(chave, rotulo, opcoes = {}) {
      let controle;
      if (opcoes.select) controle = criarSelect(rotulo, opcoes.select, base[chave]);
      else controle = criarInput(rotulo, base[chave], opcoes);
      refs.set(chave, { controle, numero: opcoes.tipo === 'number' });
      return criarCampo(rotulo, controle, { largo: opcoes.largo });
    }

    function renderizarEspecificos() {
      especificos.innerHTML = '';
      refs.clear();
      flags.innerHTML = '';
      const tituloSecao = document.createElement('h3');
      tituloSecao.textContent = tipo.value === 'veiculo' ? 'Painel do veículo' : 'Dados do equipamento';
      const grade = document.createElement('div');
      grade.className = 'ficha-inventario-form-grade';
      especificos.append(tituloSecao, grade);

      const ehVeiculo = tipo.value === 'veiculo';
      quantidade.disabled = ehVeiculo;
      local.disabled = ehVeiculo;
      espacos.disabled = ehVeiculo;
      if (ehVeiculo) flags.append(favorito.label, emUso.label);
      else flags.append(favorito.label, equipado.label);

      if (tipo.value === 'arma') {
        grade.append(
          campoEspecifico('pericia', 'Perícia', { select: [{ id: 'luta', titulo: 'Luta' }, { id: 'pontaria', titulo: 'Pontaria' }] }),
          campoEspecifico('dano', 'Dano', { maxLength: 100, placeholder: 'Ex.: 1d8 + 2' }),
          campoEspecifico('tipoDano', 'Tipo de dano', { maxLength: 100, placeholder: 'Ex.: Corte' }),
          campoEspecifico('critico', 'Crítico', { maxLength: 80, placeholder: 'Ex.: 19/x2' }),
          campoEspecifico('alcance', 'Alcance', { maxLength: 100, placeholder: 'Ex.: Corpo a corpo' }),
          campoEspecifico('municaoAtual', 'Munição atual', { tipo: 'number', min: 0, max: 9999 }),
          campoEspecifico('municaoMaxima', 'Munição máxima', { tipo: 'number', min: 0, max: 9999 }),
          campoEspecifico('propriedades', 'Propriedades', { textarea: true, linhas: 2, maxLength: 500, largo: true }),
          campoEspecifico('durabilidadeAtual', 'Durabilidade atual', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('durabilidadeMaxima', 'Durabilidade máxima', { tipo: 'number', min: 0, max: 999999 }),
        );
        const sincronizar = criarCheckbox(
          'Criar ataque automaticamente quando equipada',
          existente ? base.sincronizarAtaque !== false : true,
        );
        refs.set('sincronizarAtaque', { controle: sincronizar.input, booleano: true });
        grade.appendChild(sincronizar.label);
      } else if (tipo.value === 'armadura') {
        grade.append(
          campoEspecifico('defesa', 'Bônus de Defesa', { tipo: 'number', min: -999, max: 999 }),
          campoEspecifico('penalidade', 'Penalidade', { tipo: 'number', min: -999, max: 999 }),
          campoEspecifico('durabilidadeAtual', 'Durabilidade atual', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('durabilidadeMaxima', 'Durabilidade máxima', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('propriedades', 'Propriedades', { textarea: true, linhas: 2, maxLength: 500, largo: true }),
        );
      } else if (tipo.value === 'consumivel') {
        grade.append(
          campoEspecifico('usosAtuais', 'Usos atuais', { tipo: 'number', min: 0, max: 9999 }),
          campoEspecifico('usosMaximos', 'Usos máximos', { tipo: 'number', min: 0, max: 9999 }),
          campoEspecifico('propriedades', 'Condições de uso', { textarea: true, linhas: 2, maxLength: 500, largo: true }),
        );
      } else if (ehVeiculo) {
        grade.append(
          campoEspecifico('categoriaVeiculo', 'Categoria', { maxLength: 80, placeholder: 'Montaria, carro, nave...' }),
          campoEspecifico('velocidade', 'Velocidade / movimento', { maxLength: 100, placeholder: 'Ex.: 18 m ou 120 km/h' }),
          campoEspecifico('defesa', 'Defesa', { tipo: 'number', min: -999, max: 999 }),
          campoEspecifico('tripulacao', 'Tripulação', { maxLength: 100, placeholder: 'Ex.: 1 piloto + 1 operador' }),
          campoEspecifico('passageiros', 'Passageiros', { tipo: 'number', min: 0, max: 9999 }),
          campoEspecifico('integridadeAtual', 'Integridade atual', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('integridadeMaxima', 'Integridade máxima', { tipo: 'number', min: 1, max: 999999 }),
          campoEspecifico('combustivelAtual', 'Combustível atual', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('combustivelMaximo', 'Combustível máximo', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('cargaAtual', 'Carga atual', { tipo: 'number', min: 0, max: 999999, step: 0.5 }),
          campoEspecifico('cargaMaxima', 'Carga máxima', { tipo: 'number', min: 0, max: 999999, step: 0.5 }),
          campoEspecifico('propriedades', 'Recursos / armamentos', { textarea: true, linhas: 2, maxLength: 500, largo: true }),
        );
      } else {
        grade.append(
          campoEspecifico('durabilidadeAtual', 'Durabilidade atual', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('durabilidadeMaxima', 'Durabilidade máxima', { tipo: 'number', min: 0, max: 999999 }),
          campoEspecifico('propriedades', 'Propriedades', { textarea: true, linhas: 2, maxLength: 500, largo: true }),
        );
      }
    }

    tipo.addEventListener('change', renderizarEspecificos);
    renderizarEspecificos();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const nomeLimpo = nome.value.trim();
      if (nomeLimpo.length < 2) {
        erro.textContent = 'Informe um nome com pelo menos 2 caracteres.';
        erro.hidden = false;
        nome.focus();
        return;
      }
      const [localTipo, localId] = local.value.split(':');
      const detalhes = {};
      refs.forEach(({ controle, numero, booleano }, chave) => {
        detalhes[chave] = booleano ? controle.checked : numero ? Number(controle.value) || 0 : controle.value.trim();
      });
      const novo = normalizarItemInventario({
        ...base,
        ...detalhes,
        id: base.id,
        nome: nomeLimpo,
        tipo: tipo.value,
        raridade: raridade.value,
        quantidade: tipo.value === 'veiculo' ? 1 : Number(quantidade.value) || 1,
        espacos: tipo.value === 'veiculo' ? 0 : Number(espacos.value) || 0,
        peso: Number(peso.value) || 0,
        precos: { ...(base.precos || {}), Lunaris: Number(preco.value) || 0 },
        descricao: descricao.value.trim(),
        efeito: efeito.value.trim(),
        notas: notas.value.trim(),
        equipado: tipo.value !== 'veiculo' && equipado.input.checked,
        emUso: tipo.value === 'veiculo' && emUso.input.checked,
        favorito: favorito.input.checked,
        localTipo: tipo.value === 'veiculo' ? 'personagem' : localTipo,
        localId: tipo.value === 'veiculo' ? '' : localId,
        localizacao: localTipo === 'veiculo'
          ? inventario.find(item => item.id === localId)?.nome || 'Veículo'
          : 'Mochila',
      });
      const novaLista = existente
        ? inventario.map(item => item.id === existente.id ? novo : item)
        : [...inventario, novo];
      if (!persistir(novaLista)) return;
      fecharModalSimples();
      ctx.mostrarToast(existente
        ? `Alterações em ${novo.nome} foram salvas.`
        : `${novo.nome} entrou no inventário.`, 'sucesso');
    });

    abrirModalSimples({
      titulo: existente ? `Editar — ${existente.nome}` : tipoInicial === 'veiculo' ? 'Novo veículo ou montaria' : 'Novo item',
      corpo: form,
      classeExtra: 'ficha-modal--inventario-editor',
    });
    requestAnimationFrame(() => nome.focus());
  }

  function abrirDetalhes(item) {
    const corpo = document.createElement('div');
    corpo.className = 'ficha-inventario-detalhes';
    const destaque = document.createElement('div');
    destaque.className = `ficha-inventario-detalhe-destaque ficha-inventario-detalhe-destaque--${item.raridade}`;
    const icone = criarVisualItem(item, 'ficha-inventario-detalhe-visual', tipoInventario(item.tipo).icone);
    const texto = document.createElement('div');
    const nome = document.createElement('strong');
    nome.textContent = item.nome;
    const meta = document.createElement('span');
    meta.textContent = `${tipoInventario(item.tipo).titulo} · ${raridadeInventario(item.raridade).titulo}`;
    texto.append(nome, meta);
    destaque.append(icone, texto);
    corpo.appendChild(destaque);

    const grade = document.createElement('dl');
    grade.className = 'ficha-inventario-detalhes-grade';
    const comuns = [
      ['Quantidade', item.quantidade],
      ['Local', item.localTipo === 'veiculo' ? `Veículo · ${item.localizacao}` : item.localizacao],
      ['Espaços', item.tipo === 'veiculo' ? null : item.espacos * item.quantidade],
      ['Peso', item.peso ? `${item.peso * item.quantidade}` : null],
      ['Preço', item.precos?.Lunaris ? `${item.precos.Lunaris} Lunaris` : null],
      ['Estado', item.equipado ? 'Equipado' : item.emUso ? 'Em uso' : null],
    ];
    const especificos = item.tipo === 'arma' ? [
      ['Perícia', item.pericia === 'pontaria' ? 'Pontaria' : 'Luta'],
      ['Dano', item.dano], ['Tipo de dano', item.tipoDano], ['Crítico', item.critico],
      ['Alcance', item.alcance], ['Munição', item.municaoMaxima ? `${item.municaoAtual} / ${item.municaoMaxima}` : null],
    ] : item.tipo === 'armadura' ? [
      ['Defesa', item.defesa ? sinal(item.defesa) : null], ['Penalidade', item.penalidade ? sinal(-Math.abs(item.penalidade)) : null],
    ] : item.tipo === 'consumivel' ? [
      ['Usos', item.usosMaximos ? `${item.usosAtuais} / ${item.usosMaximos}` : null],
    ] : item.tipo === 'veiculo' ? [
      ['Categoria', item.categoriaVeiculo], ['Velocidade', item.velocidade], ['Defesa', item.defesa || null],
      ['Tripulação', item.tripulacao], ['Passageiros', item.passageiros || null],
      ['Integridade', `${item.integridadeAtual} / ${item.integridadeMaxima}`],
      ['Combustível', item.combustivelMaximo ? `${item.combustivelAtual} / ${item.combustivelMaximo}` : 'Não utiliza'],
      ['Carga', item.cargaMaxima ? `${item.cargaAtual} / ${item.cargaMaxima}` : null],
    ] : [];
    [...comuns, ...especificos].forEach(([rotulo, valor]) => {
      const linha = criarLinhaDetalhe(rotulo, valor);
      if (linha) grade.appendChild(linha);
    });
    corpo.appendChild(grade);

    [
      ['Efeito', item.efeito],
      ['Propriedades', item.propriedades],
      ['Descrição', item.descricao],
      ['Notas', item.notas],
    ].forEach(([rotulo, valor]) => {
      if (!valor) return;
      const secao = document.createElement('section');
      const h = document.createElement('h3');
      h.textContent = rotulo;
      const p = document.createElement('p');
      p.textContent = valor;
      secao.append(h, p);
      corpo.appendChild(secao);
    });

    if (item.origemCatalogo) {
      const origem = document.createElement('p');
      origem.className = 'ficha-inventario-origem';
      origem.textContent = `Origem: Loja · ${item.origemCatalogo.titulo || item.origemCatalogo.id}. Esta é uma cópia independente do catálogo.`;
      corpo.appendChild(origem);
    }

    const acoes = document.createElement('div');
    acoes.className = 'ficha-colecao-detalhe-acoes';
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'ficha-cta-btn';
    editar.textContent = 'Editar item';
    editar.addEventListener('click', () => abrirEditor(item));
    acoes.appendChild(editar);
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: item.nome, corpo, classeExtra: 'ficha-modal--inventario-detalhes' });
  }

  function abrirExclusao(item) {
    const corpo = document.createElement('div');
    corpo.className = 'ficha-colecao-exclusao';
    const p = document.createElement('p');
    const guardados = item.tipo === 'veiculo'
      ? inventario.filter(atual => atual.localTipo === 'veiculo' && atual.localId === item.id).length
      : 0;
    p.textContent = guardados
      ? `Remover “${item.nome}”? ${guardados} item(ns) guardado(s) nele voltarão para a mochila.`
      : `Remover “${item.nome}” do inventário?`;
    const acoes = document.createElement('div');
    acoes.className = 'ficha-colecao-form-acoes';
    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
    cancelar.textContent = 'Cancelar';
    cancelar.addEventListener('click', fecharModalSimples);
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'ficha-cta-btn ficha-colecao-excluir-confirmar';
    remover.textContent = 'Remover definitivamente';
    remover.addEventListener('click', () => {
      if (!persistir(inventario.filter(atual => atual.id !== item.id))) return;
      fecharModalSimples();
      ctx.mostrarToast(`${item.nome} saiu do inventário.`, 'info');
    });
    acoes.append(cancelar, remover);
    corpo.append(p, acoes);
    abrirModalSimples({ titulo: 'Remover do inventário', corpo, classeExtra: 'ficha-modal--confirmacao' });
  }

  function abrirConsumoFinal(item) {
    const corpo = document.createElement('div');
    corpo.className = 'ficha-colecao-exclusao';
    const p = document.createElement('p');
    p.textContent = `Usar a última unidade de “${item.nome}” e removê-la do inventário?`;
    const acoes = document.createElement('div');
    acoes.className = 'ficha-colecao-form-acoes';
    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
    cancelar.textContent = 'Cancelar';
    cancelar.addEventListener('click', fecharModalSimples);
    const usar = document.createElement('button');
    usar.type = 'button';
    usar.className = 'ficha-cta-btn';
    usar.textContent = 'Usar última unidade';
    usar.addEventListener('click', () => {
      if (!persistir(inventario.filter(atual => atual.id !== item.id))) return;
      fecharModalSimples();
      ctx.mostrarToast(`${item.nome} foi consumido.`, 'sucesso');
    });
    acoes.append(cancelar, usar);
    corpo.append(p, acoes);
    abrirModalSimples({ titulo: 'Consumir item', corpo, classeExtra: 'ficha-modal--confirmacao' });
  }

  function alterarItem(item, alteracoes, mensagem = '') {
    const novaLista = inventario.map(atual => atual.id === item.id ? { ...atual, ...alteracoes } : atual);
    if (!persistir(novaLista)) return;
    if (mensagem) ctx.mostrarToast(mensagem, 'sucesso');
  }

  function criarMedidor(item, chaveAtual, chaveMaxima, rotulo, cor) {
    const maximo = Math.max(1, Number(item[chaveMaxima]) || 1);
    const atual = Math.max(0, Math.min(maximo, Number(item[chaveAtual]) || 0));
    const grupo = document.createElement('div');
    grupo.className = 'ficha-veiculo-medidor';
    grupo.style.setProperty('--veiculo-medidor-cor', cor);
    const cabecalho = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = rotulo;
    const valor = document.createElement('strong');
    valor.textContent = `${atual} / ${maximo}`;
    cabecalho.append(label, valor);
    const linha = document.createElement('div');
    const menos = document.createElement('button');
    menos.type = 'button';
    menos.textContent = '−';
    menos.setAttribute('aria-label', `Diminuir ${rotulo} de ${item.nome}`);
    const barra = document.createElement('div');
    barra.className = 'ficha-veiculo-medidor-barra';
    const preenchido = document.createElement('span');
    preenchido.style.width = `${(atual / maximo) * 100}%`;
    barra.appendChild(preenchido);
    const mais = document.createElement('button');
    mais.type = 'button';
    mais.textContent = '+';
    mais.setAttribute('aria-label', `Aumentar ${rotulo} de ${item.nome}`);
    menos.addEventListener('click', () => alterarItem(item, { [chaveAtual]: Math.max(0, atual - 1) }));
    mais.addEventListener('click', () => alterarItem(item, { [chaveAtual]: Math.min(maximo, atual + 1) }));
    linha.append(menos, barra, mais);
    grupo.append(cabecalho, linha);
    return grupo;
  }

  function criarCardItem(item) {
    const card = document.createElement('article');
    card.className = `ficha-inventario-item ficha-inventario-item--${item.tipo} ficha-raridade--${item.raridade}`;
    if (item.equipado) card.classList.add('ficha-inventario-item--equipado');
    if (item.durabilidadeMaxima && item.durabilidadeAtual <= 0) card.classList.add('ficha-inventario-item--quebrado');
    else if (item.durabilidadeMaxima && item.durabilidadeAtual / item.durabilidadeMaxima <= 0.25) card.classList.add('ficha-inventario-item--danificado');
    const cabecalho = document.createElement('header');
    const icone = criarVisualItem(item, 'ficha-inventario-item-icone', tipoInventario(item.tipo).icone);
    const identidade = document.createElement('div');
    const nome = document.createElement('h3');
    nome.textContent = item.nome;
    const meta = document.createElement('span');
    meta.textContent = `${tipoInventario(item.tipo).titulo} · ${raridadeInventario(item.raridade).titulo}`;
    identidade.append(nome, meta);
    const favorito = document.createElement('button');
    favorito.type = 'button';
    favorito.className = 'ficha-inventario-favorito';
    favorito.classList.toggle('ficha-inventario-favorito--ativo', item.favorito);
    favorito.textContent = item.favorito ? '★' : '☆';
    favorito.setAttribute('aria-pressed', String(Boolean(item.favorito)));
    favorito.setAttribute('aria-label', `${item.favorito ? 'Remover' : 'Marcar'} ${item.nome} como favorito`);
    favorito.addEventListener('click', () => alterarItem(item, { favorito: !item.favorito }));
    cabecalho.append(icone, identidade, favorito);

    const descricao = document.createElement('p');
    descricao.className = 'ficha-inventario-item-desc';
    descricao.textContent = item.descricao || item.efeito || 'Sem descrição registrada.';
    const dados = document.createElement('div');
    dados.className = 'ficha-inventario-item-dados';
    const etiquetas = [
      item.dano ? `Dano ${item.dano}` : null,
      item.defesa ? `Defesa ${sinal(item.defesa)}` : null,
      item.usosMaximos ? `Usos ${item.usosAtuais}/${item.usosMaximos}` : null,
      item.durabilidadeMaxima ? `Durabilidade ${item.durabilidadeAtual}/${item.durabilidadeMaxima}` : null,
      item.durabilidadeMaxima && item.durabilidadeAtual <= 0 ? 'Quebrado' : null,
      item.localTipo === 'veiculo' ? `Em ${item.localizacao}` : item.localizacao,
      `${item.espacos} esp.`,
    ].filter(Boolean);
    etiquetas.forEach(texto => {
      const tag = document.createElement('span');
      tag.textContent = texto;
      dados.appendChild(tag);
    });

    const rodape = document.createElement('footer');
    const quantidade = document.createElement('div');
    quantidade.className = 'ficha-inventario-quantidade';
    const menos = document.createElement('button');
    menos.type = 'button';
    menos.textContent = '−';
    menos.setAttribute('aria-label', `Diminuir quantidade de ${item.nome}`);
    menos.disabled = item.quantidade <= 1;
    menos.addEventListener('click', () => alterarItem(item, { quantidade: item.quantidade - 1 }));
    const valor = document.createElement('strong');
    valor.textContent = String(item.quantidade);
    valor.setAttribute('aria-label', `Quantidade de ${item.nome}`);
    const mais = document.createElement('button');
    mais.type = 'button';
    mais.textContent = '+';
    mais.setAttribute('aria-label', `Aumentar quantidade de ${item.nome}`);
    mais.addEventListener('click', () => alterarItem(item, { quantidade: item.quantidade + 1 }));
    quantidade.append(menos, valor, mais);

    const acoes = document.createElement('div');
    acoes.className = 'ficha-inventario-item-acoes';
    const tipoInfo = tipoInventario(item.tipo);
    if (tipoInfo.equipavel) {
      const equipar = document.createElement('button');
      equipar.type = 'button';
      equipar.className = 'ficha-inventario-acao-principal';
      equipar.textContent = item.equipado ? 'Guardar' : 'Equipar';
      equipar.setAttribute('aria-label', `${item.equipado ? 'Guardar' : 'Equipar'} ${item.nome}`);
      equipar.addEventListener('click', () => alterarItem(item, { equipado: !item.equipado }, `${item.nome} foi ${item.equipado ? 'guardado' : 'equipado'}.`));
      acoes.appendChild(equipar);
    } else if (tipoInfo.consumivel) {
      const usar = document.createElement('button');
      usar.type = 'button';
      usar.className = 'ficha-inventario-acao-principal';
      usar.textContent = 'Usar';
      usar.setAttribute('aria-label', `Usar ${item.nome}`);
      usar.addEventListener('click', () => {
        if (item.usosMaximos && item.usosAtuais > 0) {
          alterarItem(item, { usosAtuais: item.usosAtuais - 1 }, `Um uso de ${item.nome} foi gasto.`);
        } else if (item.quantidade > 1) {
          alterarItem(item, { quantidade: item.quantidade - 1 }, `${item.nome} foi usado.`);
        } else abrirConsumoFinal(item);
      });
      acoes.appendChild(usar);
    }
    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'ficha-info-btn';
    info.textContent = '?';
    info.setAttribute('aria-label', `Detalhes de ${item.nome}`);
    info.addEventListener('click', () => abrirDetalhes(item));
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'ficha-info-btn';
    editar.textContent = '✎';
    editar.setAttribute('aria-label', `Editar ${item.nome}`);
    editar.addEventListener('click', () => abrirEditor(item));
    const excluir = document.createElement('button');
    excluir.type = 'button';
    excluir.className = 'ficha-info-btn ficha-colecao-excluir';
    excluir.textContent = '×';
    excluir.setAttribute('aria-label', `Remover ${item.nome}`);
    excluir.addEventListener('click', () => abrirExclusao(item));
    acoes.append(info, editar, excluir);
    rodape.append(quantidade, acoes);
    card.append(cabecalho, descricao, dados, rodape);
    return card;
  }

  function criarCardVeiculo(item) {
    const card = document.createElement('article');
    card.className = `ficha-veiculo-card ficha-raridade--${item.raridade}`;
    if (item.emUso) card.classList.add('ficha-veiculo-card--em-uso');
    const cabecalho = document.createElement('header');
    const icone = criarVisualItem(item, 'ficha-veiculo-icone', '⚙');
    const identidade = document.createElement('div');
    const titulo = document.createElement('h3');
    titulo.textContent = item.nome;
    const meta = document.createElement('span');
    meta.textContent = [item.categoriaVeiculo || 'Veículo', raridadeInventario(item.raridade).titulo].join(' · ');
    identidade.append(titulo, meta);
    const uso = document.createElement('button');
    uso.type = 'button';
    uso.className = 'ficha-veiculo-em-uso';
    uso.textContent = item.emUso ? 'Em uso' : 'Na garagem';
    uso.setAttribute('aria-label', `${item.emUso ? 'Guardar' : 'Usar'} ${item.nome}`);
    uso.addEventListener('click', () => alterarItem(item, { emUso: !item.emUso }));
    cabecalho.append(icone, identidade, uso);

    const stats = document.createElement('div');
    stats.className = 'ficha-veiculo-stats';
    [
      ['Velocidade', item.velocidade || '—'],
      ['Defesa', item.defesa || '—'],
      ['Tripulação', item.tripulacao || '—'],
      ['Passageiros', item.passageiros || '—'],
      ['Carga', item.cargaMaxima ? `${item.cargaAtual}/${item.cargaMaxima}` : '—'],
    ].forEach(([rotulo, valor]) => {
      const stat = document.createElement('div');
      const label = document.createElement('span');
      label.textContent = rotulo;
      const strong = document.createElement('strong');
      strong.textContent = String(valor);
      stat.append(label, strong);
      stats.appendChild(stat);
    });

    const medidores = document.createElement('div');
    medidores.className = 'ficha-veiculo-medidores';
    medidores.appendChild(criarMedidor(item, 'integridadeAtual', 'integridadeMaxima', 'Integridade', 'var(--blood)'));
    if (item.combustivelMaximo > 0) medidores.appendChild(criarMedidor(item, 'combustivelAtual', 'combustivelMaximo', 'Combustível', 'var(--neon)'));

    const rodape = document.createElement('footer');
    const guardados = inventario.filter(atual => atual.localTipo === 'veiculo' && atual.localId === item.id);
    const carga = document.createElement('span');
    carga.textContent = `${guardados.reduce((total, atual) => total + atual.quantidade, 0)} item(ns) guardado(s)`;
    const acoes = document.createElement('div');
    acoes.className = 'ficha-inventario-item-acoes';
    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'ficha-info-btn';
    info.textContent = '?';
    info.setAttribute('aria-label', `Detalhes de ${item.nome}`);
    info.addEventListener('click', () => abrirDetalhes(item));
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'ficha-info-btn';
    editar.textContent = '✎';
    editar.setAttribute('aria-label', `Editar ${item.nome}`);
    editar.addEventListener('click', () => abrirEditor(item));
    const excluir = document.createElement('button');
    excluir.type = 'button';
    excluir.className = 'ficha-info-btn ficha-colecao-excluir';
    excluir.textContent = '×';
    excluir.setAttribute('aria-label', `Remover ${item.nome}`);
    excluir.addEventListener('click', () => abrirExclusao(item));
    acoes.append(info, editar, excluir);
    rodape.append(carga, acoes);
    card.append(cabecalho, stats, medidores, rodape);
    return card;
  }

  function atualizarResumo() {
    const resumo = resumirInventario(inventario, config);
    resumoRefs.itens.textContent = String(resumo.unidades);
    resumoRefs.equipados.textContent = String(resumo.equipados);
    resumoRefs.carga.textContent = resumo.limiteEspacos
      ? `${resumo.espacosUsados}/${resumo.limiteEspacos}`
      : `${resumo.espacosUsados}`;
    resumoRefs.veiculos.textContent = String(resumo.veiculos);
    resumoRefs.carga.parentElement.classList.toggle(
      'ficha-inventario-resumo-card--excedido',
      Boolean(resumo.limiteEspacos && resumo.espacosUsados > resumo.limiteEspacos),
    );
  }

  function atualizarTela() {
    atualizarResumo();
    conteudo.innerHTML = '';
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const corresponde = item => {
      const buscaItem = `${item.nome} ${item.descricao} ${item.efeito} ${item.propriedades} ${item.localizacao}`.toLocaleLowerCase('pt-BR');
      const estadoOk = !filtroEstado.value
        || (filtroEstado.value === 'equipado' && (item.equipado || item.emUso))
        || (filtroEstado.value === 'favorito' && item.favorito)
        || (filtroEstado.value === 'mochila' && item.tipo !== 'veiculo' && item.localTipo !== 'veiculo')
        || (filtroEstado.value === 'veiculo' && item.tipo !== 'veiculo' && item.localTipo === 'veiculo');
      return (!termo || buscaItem.includes(termo))
        && (!filtroTipo.value || item.tipo === filtroTipo.value)
        && estadoOk;
    };
    const visiveis = inventario.filter(corresponde);
    contador.textContent = `${visiveis.length} de ${inventario.length}`;

    const itens = visiveis.filter(item => item.tipo !== 'veiculo');
    const veiculos = visiveis.filter(item => item.tipo === 'veiculo');
    const secaoItens = document.createElement('section');
    secaoItens.className = 'ficha-inventario-secao';
    const cabecalhoItens = document.createElement('header');
    const tituloItens = document.createElement('h3');
    tituloItens.textContent = 'Equipamentos e suprimentos';
    const totalItens = document.createElement('span');
    totalItens.textContent = `${itens.length} entrada(s)`;
    cabecalhoItens.append(tituloItens, totalItens);
    secaoItens.appendChild(cabecalhoItens);
    if (itens.length) {
      const grade = document.createElement('div');
      grade.className = 'ficha-inventario-grade';
      itens.sort((a, b) => Number(b.equipado) - Number(a.equipado)
        || Number(b.favorito) - Number(a.favorito)
        || a.nome.localeCompare(b.nome, 'pt-BR'))
        .forEach(item => grade.appendChild(criarCardItem(item)));
      secaoItens.appendChild(grade);
    } else {
      const vazio = document.createElement('div');
      vazio.className = 'ficha-colecao-vazio';
      const strong = document.createElement('strong');
      strong.textContent = inventario.length ? 'Nenhum item corresponde aos filtros.' : 'A mochila está vazia.';
      const span = document.createElement('span');
      span.textContent = 'Adicione manualmente ou copie um item já descoberto na Loja.';
      vazio.append(strong, span);
      secaoItens.appendChild(vazio);
    }
    conteudo.appendChild(secaoItens);

    const secaoVeiculos = document.createElement('section');
    secaoVeiculos.className = 'ficha-inventario-secao ficha-inventario-secao--garagem';
    const cabecalhoVeiculos = document.createElement('header');
    const tituloVeiculos = document.createElement('h3');
    tituloVeiculos.textContent = 'Garagem e montarias';
    const totalVeiculos = document.createElement('span');
    totalVeiculos.textContent = `${veiculos.length} veículo(s)`;
    cabecalhoVeiculos.append(tituloVeiculos, totalVeiculos);
    secaoVeiculos.appendChild(cabecalhoVeiculos);
    if (veiculos.length) {
      const grade = document.createElement('div');
      grade.className = 'ficha-veiculos-grade';
      veiculos.sort((a, b) => Number(b.emUso) - Number(a.emUso) || a.nome.localeCompare(b.nome, 'pt-BR'))
        .forEach(item => grade.appendChild(criarCardVeiculo(item)));
      secaoVeiculos.appendChild(grade);
    } else {
      const vazio = document.createElement('div');
      vazio.className = 'ficha-colecao-vazio ficha-inventario-garagem-vazia';
      const strong = document.createElement('strong');
      const existemVeiculos = inventario.some(item => item.tipo === 'veiculo');
      strong.textContent = existemVeiculos
        ? 'Nenhum veículo corresponde aos filtros.'
        : 'Nenhum veículo ou montaria registrado.';
      const span = document.createElement('span');
      span.textContent = existemVeiculos
        ? 'Limpe os filtros para voltar a exibir a Garagem.'
        : 'Veículos ficam fora da mochila e possuem painel próprio de Integridade, combustível e carga.';
      vazio.append(strong, span);
      secaoVeiculos.appendChild(vazio);
    }
    conteudo.appendChild(secaoVeiculos);
  }

  busca.addEventListener('input', atualizarTela);
  filtroTipo.addEventListener('change', atualizarTela);
  filtroEstado.addEventListener('change', atualizarTela);
  novoItemBtn.addEventListener('click', () => abrirEditor());
  novoVeiculoBtn.addEventListener('click', () => abrirEditor(null, 'veiculo'));
  renderizarCarteiraResumo();
  atualizarTela();
}
