import { atualizarPersonagem } from '../../../services/personagensService.js';
import {
  BONUS_GRAU,
  GRAUS_INFO,
  calcularBonusPericia,
  modificador,
} from '../../../services/calculoService.js';
import { NOMES_ATRIBUTOS } from '../../../config/nomesAtributos.js';
import {
  listarEfeitosAtivos,
  somarModificadores,
  valorAtributoEfetivo,
} from '../../../services/modificadoresService.js';
import { criarLinhaGrauPericia } from '../linhaGrauPericia.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

function salvarGrau(personagem, item, novoGrau, ctx) {
  const pericias = { ...(personagem.pericias || {}) };
  if (novoGrau === 'iniciante') delete pericias[item.id];
  else pericias[item.id] = novoGrau;
  const resultado = atualizarPersonagem(personagem.id, { pericias });
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return false;
  }
  Object.assign(personagem, resultado.personagem);
  return true;
}

function salvarAtributo(personagem, item, novoAtributo, ctx) {
  if (!Object.hasOwn(NOMES_ATRIBUTOS, novoAtributo)) return false;
  const atributosPericias = { ...(personagem.atributosPericias || {}) };
  if (novoAtributo === item.atributo) delete atributosPericias[item.id];
  else atributosPericias[item.id] = novoAtributo;
  const resultado = atualizarPersonagem(personagem.id, { atributosPericias });
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return false;
  }
  Object.assign(personagem, resultado.personagem);
  return true;
}

function salvarRolagem(personagem, item, novaRolagem, ctx) {
  const rolagensPericias = { ...(personagem.rolagensPericias || {}) };
  const vantagens = Math.max(0, Math.min(20, Math.trunc(Number(novaRolagem.vantagens) || 0)));
  const desvantagens = Math.max(0, Math.min(20, Math.trunc(Number(novaRolagem.desvantagens) || 0)));
  if (!vantagens && !desvantagens) delete rolagensPericias[item.id];
  else rolagensPericias[item.id] = { vantagens, desvantagens };
  const resultado = atualizarPersonagem(personagem.id, { rolagensPericias });
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return false;
  }
  Object.assign(personagem, resultado.personagem);
  return true;
}

function textoSinal(valor) {
  return valor >= 0 ? `+${valor}` : String(valor);
}

function resumoRolagem({ vantagens = 0, desvantagens = 0 } = {}) {
  const saldo = vantagens - desvantagens;
  if (saldo > 0) return { tipo: 'vantagem', titulo: `Vantagem +${saldo}`, saldo };
  if (saldo < 0) return { tipo: 'desvantagem', titulo: `Desvantagem +${Math.abs(saldo)}`, saldo };
  if (vantagens || desvantagens) return { tipo: 'neutra', titulo: 'Fontes neutralizadas', saldo };
  return { tipo: 'normal', titulo: 'Rolagem normal', saldo };
}

function instrucaoRolagem(rolagem, bonus) {
  const { vantagens = 0, desvantagens = 0 } = rolagem;
  const estado = resumoRolagem(rolagem);
  const fontes = `${vantagens}V − ${desvantagens}D`;
  if (estado.saldo > 0) {
    return `${fontes} = V +${estado.saldo}. Role 2d20, use o maior resultado e some ${textoSinal(bonus)}.`;
  }
  if (estado.saldo < 0) {
    return `${fontes} = D +${Math.abs(estado.saldo)}. Role 2d20, use o menor resultado e some ${textoSinal(bonus)}.`;
  }
  if (vantagens || desvantagens) {
    return `${fontes}: as fontes se anulam. Role 1d20 e some ${textoSinal(bonus)}.`;
  }
  return `Role 1d20 e some ${textoSinal(bonus)}.`;
}

function abrirCalculoPericia(personagem, item, grau, configuracao) {
  const atributoAtual = configuracao.atributo || item.atributo;
  const valorAtributo = valorAtributoEfetivo(personagem, atributoAtual) || 10;
  const modAtributo = modificador(valorAtributo);
  const metadeNivel = Math.floor(Math.max(1, Number(personagem.nivel) || 1) / 2);
  const bonusGrau = BONUS_GRAU[grau] ?? 0;
  const bonusEfeitos = somarModificadores(personagem, 'pericia_bonus', item.id);
  const total = calcularBonusPericia(grau, modAtributo, personagem.nivel) + bonusEfeitos;

  const corpo = document.createElement('div');
  corpo.className = 'ficha-calculo-modal ficha-calculo-pericia';
  const descricao = document.createElement('p');
  descricao.className = 'ficha-calculo-formula';
  descricao.textContent = item.uso || item.descricao || `Teste baseado em ${NOMES_ATRIBUTOS[atributoAtual] || atributoAtual}.`;
  corpo.appendChild(descricao);

  const lista = document.createElement('div');
  lista.className = 'ficha-calculo-lista';
  [
    { nome: `${NOMES_ATRIBUTOS[atributoAtual] || atributoAtual} ${valorAtributo} · modificador`, valor: modAtributo },
    { nome: `Metade do nível ${personagem.nivel}`, valor: metadeNivel },
    { nome: `Grau ${GRAUS_INFO[grau]?.titulo || grau}`, valor: bonusGrau },
  ].forEach(itemCalculo => {
    const linha = document.createElement('div');
    linha.className = 'ficha-calculo-linha';
    const nome = document.createElement('span');
    nome.textContent = itemCalculo.nome;
    const valor = document.createElement('strong');
    valor.textContent = textoSinal(itemCalculo.valor);
    if (itemCalculo.valor < 0) linha.classList.add('ficha-calculo-linha--negativa');
    linha.append(nome, valor);
    lista.appendChild(linha);
  });
  listarEfeitosAtivos(personagem, 'pericia_bonus', item.id).forEach(efeito => {
    const linha = document.createElement('div');
    linha.className = 'ficha-calculo-linha';
    const nome = document.createElement('span');
    nome.textContent = efeito.origemNome;
    const valor = document.createElement('strong');
    valor.textContent = textoSinal(efeito.valor);
    linha.append(nome, valor);
    lista.appendChild(linha);
  });
  corpo.appendChild(lista);

  const situacaoEl = document.createElement('div');
  const estado = resumoRolagem(configuracao);
  situacaoEl.className = `ficha-pericia-modal-situacao ficha-pericia-modal-situacao--${estado.tipo}`;
  const situacaoTitulo = document.createElement('strong');
  situacaoTitulo.textContent = estado.titulo;
  const situacaoTexto = document.createElement('span');
  situacaoTexto.textContent = instrucaoRolagem(configuracao, total);
  situacaoEl.append(situacaoTitulo, situacaoTexto);
  corpo.appendChild(situacaoEl);

  const totalEl = document.createElement('div');
  totalEl.className = 'ficha-calculo-total';
  const totalRotulo = document.createElement('span');
  totalRotulo.textContent = 'Resultado da perícia';
  const totalValor = document.createElement('strong');
  totalValor.textContent = textoSinal(total);
  totalEl.append(totalRotulo, totalValor);
  corpo.appendChild(totalEl);

  abrirModalSimples({
    titulo: `Cálculo — ${item.titulo}`,
    corpo,
    classeExtra: 'ficha-modal--calculo',
  });
}

function abrirEditorRolagem(personagem, item, rolagemAtual, ctx, aoAplicar, automaticas = null) {
  const estado = {
    vantagens: Math.max(0, Number(rolagemAtual.vantagens) || 0),
    desvantagens: Math.max(0, Number(rolagemAtual.desvantagens) || 0),
  };
  const corpo = document.createElement('div');
  corpo.className = 'ficha-rolagem-modal';

  const explicacao = document.createElement('p');
  explicacao.className = 'ficha-calculo-formula';
  explicacao.textContent = 'As fontes se anulam uma a uma. O saldo define se a rolagem tem vantagem, desvantagem ou fica neutra.';
  corpo.appendChild(explicacao);
  if (automaticas && (automaticas.vantagens || automaticas.desvantagens)) {
    const avisoAutomatico = document.createElement('p');
    avisoAutomatico.className = 'ficha-wizard-aviso';
    avisoAutomatico.textContent = `Efeitos ativos acrescentam automaticamente ${automaticas.vantagens} vantagem(ns) e ${automaticas.desvantagens} desvantagem(ns). Os contadores abaixo registram apenas ajustes manuais.`;
    corpo.appendChild(avisoAutomatico);
  }

  const contadores = document.createElement('div');
  contadores.className = 'ficha-rolagem-contadores';
  const valores = {};

  function criarContador(chave, rotulo, classe) {
    const grupo = document.createElement('div');
    grupo.className = `ficha-rolagem-contador ficha-rolagem-contador--${classe}`;
    const titulo = document.createElement('strong');
    titulo.textContent = rotulo;
    const controles = document.createElement('div');
    controles.className = 'ficha-rolagem-stepper';
    const diminuir = document.createElement('button');
    diminuir.type = 'button';
    diminuir.textContent = '−';
    diminuir.setAttribute('aria-label', `Diminuir ${rotulo.toLocaleLowerCase('pt-BR')}`);
    const valor = document.createElement('output');
    valor.setAttribute('aria-label', `Quantidade de ${rotulo.toLocaleLowerCase('pt-BR')}`);
    const aumentar = document.createElement('button');
    aumentar.type = 'button';
    aumentar.textContent = '+';
    aumentar.setAttribute('aria-label', `Aumentar ${rotulo.toLocaleLowerCase('pt-BR')}`);
    diminuir.addEventListener('click', () => {
      estado[chave] = Math.max(0, estado[chave] - 1);
      atualizar();
    });
    aumentar.addEventListener('click', () => {
      estado[chave] = Math.min(20, estado[chave] + 1);
      atualizar();
    });
    valores[chave] = valor;
    controles.append(diminuir, valor, aumentar);
    grupo.append(titulo, controles);
    return grupo;
  }

  contadores.append(
    criarContador('vantagens', 'Vantagens', 'vantagem'),
    criarContador('desvantagens', 'Desvantagens', 'desvantagem'),
  );
  corpo.appendChild(contadores);

  const saldo = document.createElement('div');
  saldo.className = 'ficha-rolagem-saldo';
  saldo.setAttribute('role', 'status');
  const saldoTitulo = document.createElement('strong');
  const saldoTexto = document.createElement('span');
  saldo.append(saldoTitulo, saldoTexto);
  corpo.appendChild(saldo);

  const acoes = document.createElement('div');
  acoes.className = 'ficha-rolagem-acoes';
  const zerar = document.createElement('button');
  zerar.type = 'button';
  zerar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  zerar.textContent = 'Zerar';
  zerar.addEventListener('click', () => {
    estado.vantagens = 0;
    estado.desvantagens = 0;
    atualizar();
  });
  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fecharModalSimples);
  const confirmar = document.createElement('button');
  confirmar.type = 'button';
  confirmar.className = 'ficha-cta-btn';
  confirmar.textContent = 'Aplicar saldo';
  confirmar.addEventListener('click', () => {
    const novaRolagem = { vantagens: estado.vantagens, desvantagens: estado.desvantagens };
    if (salvarRolagem(personagem, item, novaRolagem, ctx) === false) return;
    aoAplicar(novaRolagem);
    fecharModalSimples();
  });
  acoes.append(zerar, cancelar, confirmar);
  corpo.appendChild(acoes);

  function atualizar() {
    valores.vantagens.textContent = String(estado.vantagens);
    valores.desvantagens.textContent = String(estado.desvantagens);
    const resumo = resumoRolagem(estado);
    saldo.dataset.situacao = resumo.tipo;
    saldoTitulo.textContent = resumo.titulo;
    saldoTexto.textContent = `Fontes: ${instrucaoRolagem(estado, 0).replace(' e some +0', '')}`;
  }

  atualizar();
  abrirModalSimples({
    titulo: `Vantagens e desvantagens — ${item.titulo}`,
    corpo,
    classeExtra: 'ficha-modal--rolagem',
  });
}

function gerarIdPersonalizado() {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `personalizada-${token}`;
}

function criarCampoFormulario(rotulo, controle) {
  const campo = document.createElement('label');
  campo.className = 'ficha-campo';
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  campo.append(label, controle);
  return campo;
}

function abrirEditorPericia(personagem, ctx, existente = null) {
  const form = document.createElement('form');
  form.className = 'ficha-pericia-personalizada-form';

  const tipo = document.createElement('select');
  tipo.className = 'ficha-campo-select';
  tipo.setAttribute('aria-label', 'Tipo da perícia personalizada');
  [
    { valor: 'oficio', rotulo: 'Ofício' },
    { valor: 'pericia', rotulo: 'Perícia' },
  ].forEach(opcao => {
    const option = document.createElement('option');
    option.value = opcao.valor;
    option.textContent = opcao.rotulo;
    option.selected = (existente?.tipo || 'oficio') === opcao.valor;
    tipo.appendChild(option);
  });

  const nome = document.createElement('input');
  nome.type = 'text';
  nome.className = 'ficha-campo-input';
  nome.maxLength = 60;
  nome.required = true;
  nome.autocomplete = 'off';
  nome.placeholder = 'Ex.: Ferreiro, Culinária, Alquimia...';
  nome.setAttribute('aria-label', 'Nome da perícia personalizada');
  nome.value = existente?.titulo || '';

  const atributo = document.createElement('select');
  atributo.className = 'ficha-campo-select';
  atributo.setAttribute('aria-label', 'Atributo da perícia personalizada');
  Object.entries(NOMES_ATRIBUTOS).forEach(([id, titulo]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = titulo;
    option.selected = (existente?.atributo || 'inteligencia') === id;
    atributo.appendChild(option);
  });

  const descricao = document.createElement('textarea');
  descricao.className = 'ficha-campo-input ficha-pericia-personalizada-descricao';
  descricao.maxLength = 180;
  descricao.rows = 3;
  descricao.placeholder = 'Quando essa perícia é usada?';
  descricao.setAttribute('aria-label', 'Descrição da perícia personalizada');
  descricao.value = existente?.descricao || '';

  const erro = document.createElement('p');
  erro.className = 'ficha-modal-erro';
  erro.hidden = true;
  erro.setAttribute('role', 'alert');

  const acoes = document.createElement('div');
  acoes.className = 'ficha-pericia-personalizada-acoes';
  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fecharModalSimples);
  const salvar = document.createElement('button');
  salvar.type = 'submit';
  salvar.className = 'ficha-cta-btn';
  salvar.textContent = existente ? 'Salvar alterações' : 'Criar perícia';
  acoes.append(cancelar, salvar);

  form.append(
    criarCampoFormulario('Tipo', tipo),
    criarCampoFormulario('Nome', nome),
    criarCampoFormulario('Atributo-base', atributo),
    criarCampoFormulario('Descrição ou uso (opcional)', descricao),
    erro,
    acoes,
  );

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const titulo = nome.value.trim();
    const todas = [
      ...(ctx.catalogo.pericias || []),
      ...(personagem.periciasPersonalizadas || []),
    ];
    const duplicada = todas.some(item => item.id !== existente?.id
      && item.titulo.toLocaleLowerCase('pt-BR') === titulo.toLocaleLowerCase('pt-BR'));
    if (titulo.length < 2) {
      erro.textContent = 'Informe um nome com pelo menos 2 caracteres.';
      erro.hidden = false;
      nome.focus();
      return;
    }
    if (duplicada) {
      erro.textContent = 'Já existe uma perícia com esse nome.';
      erro.hidden = false;
      nome.focus();
      return;
    }

    const nova = {
      id: existente?.id || gerarIdPersonalizado(),
      titulo,
      tipo: tipo.value === 'oficio' ? 'oficio' : 'pericia',
      atributo: Object.hasOwn(NOMES_ATRIBUTOS, atributo.value) ? atributo.value : 'inteligencia',
      descricao: descricao.value.trim(),
      personalizada: true,
    };
    const atuais = personagem.periciasPersonalizadas || [];
    const periciasPersonalizadas = existente
      ? atuais.map(item => item.id === existente.id ? nova : item)
      : [...atuais, nova];
    const resultado = atualizarPersonagem(personagem.id, { periciasPersonalizadas });
    if (!resultado.ok) {
      erro.textContent = resultado.mensagem;
      erro.hidden = false;
      return;
    }
    Object.assign(personagem, resultado.personagem);
    fecharModalSimples();
    ctx.mostrarToast(`${titulo} ${existente ? 'foi atualizada' : 'foi criada'}.`, 'sucesso');
    ctx.recarregar();
  });

  abrirModalSimples({
    titulo: existente ? 'Editar perícia personalizada' : 'Criar ofício ou perícia',
    corpo: form,
    classeExtra: 'ficha-modal--pericia-personalizada',
  });
  requestAnimationFrame(() => nome.focus());
}

function criarSecao(personagem, itens, ctx) {
  const secao = document.createElement('section');
  secao.className = 'ficha-pericias-secao';
  const cabecalho = document.createElement('div');
  cabecalho.className = 'ficha-pericias-secao-cabecalho';
  const titulo = document.createElement('h3');
  titulo.className = 'ficha-secao-titulo';
  titulo.textContent = 'Todas as perícias';
  const descricao = document.createElement('p');
  descricao.className = 'ficha-pericias-secao-descricao';
  descricao.textContent = 'Fortitude, Reflexos e Vontade seguem a mesma escala e contam como perícias.';
  cabecalho.append(titulo, descricao);
  secao.appendChild(cabecalho);

  const tabela = document.createElement('div');
  tabela.className = 'ficha-pericias-tabela';
  const linhas = itens.map(item => {
    const linha = criarLinhaGrauPericia(personagem, item, {
      aoMudarGrau: novoGrau => salvarGrau(personagem, item, novoGrau, ctx),
      aoMudarAtributo: novoAtributo => salvarAtributo(personagem, item, novoAtributo, ctx),
      aoEditarRolagem: (rolagem, aplicar, automaticas) => abrirEditorRolagem(personagem, item, rolagem, ctx, aplicar, automaticas),
      aoAbrirDetalhes: (pericia, grau, configuracao) => abrirCalculoPericia(personagem, pericia, grau, configuracao),
      aoEditar: item.personalizada ? pericia => abrirEditorPericia(personagem, ctx, pericia) : null,
    });
    tabela.appendChild(linha);
    return linha;
  });
  secao.appendChild(tabela);

  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.className = 'ficha-pericias-adicionar';
  adicionar.textContent = '+ Criar ofício ou perícia personalizada';
  adicionar.addEventListener('click', () => abrirEditorPericia(personagem, ctx));
  secao.appendChild(adicionar);
  return { secao, linhas };
}

export function renderAbaPericias(container, personagem, ctx) {
  const pagina = document.createElement('div');
  pagina.className = 'ficha-pericias-pagina';
  const itens = [
    ...(ctx.catalogo.pericias || []),
    ...(personagem.periciasPersonalizadas || []),
  ].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

  const topo = document.createElement('header');
  topo.className = 'ficha-pericias-topo';
  const tituloGrupo = document.createElement('div');
  const titulo = document.createElement('h2');
  titulo.className = 'ficha-pericias-titulo';
  titulo.textContent = 'Perícias';
  const intro = document.createElement('p');
  intro.className = 'ficha-pericias-intro';
  intro.textContent = 'Consulte rapidamente os resultados, ajuste o Grau e marque vantagem ou desvantagem.';
  tituloGrupo.append(titulo, intro);

  const contarTreinadas = () => itens
    .filter(item => (personagem.pericias?.[item.id] || 'iniciante') !== 'iniciante').length;
  const treinadas = contarTreinadas();
  const resumo = document.createElement('div');
  resumo.className = 'ficha-pericias-resumo';
  const totalTreinadas = document.createElement('strong');
  totalTreinadas.textContent = String(treinadas);
  const resumoTexto = document.createElement('span');
  resumoTexto.textContent = 'perícias treinadas';
  resumo.append(totalTreinadas, resumoTexto);
  if (treinadas < 6) resumo.classList.add('ficha-pericias-resumo--pendente');
  topo.append(tituloGrupo, resumo);
  pagina.appendChild(topo);

  const ferramentas = document.createElement('div');
  ferramentas.className = 'ficha-pericias-ferramentas';
  const buscaGrupo = document.createElement('label');
  buscaGrupo.className = 'ficha-pericias-busca';
  const buscaIcone = document.createElement('span');
  buscaIcone.setAttribute('aria-hidden', 'true');
  buscaIcone.textContent = '⌕';
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.className = 'ficha-campo-input';
  busca.placeholder = 'Buscar perícia, ofício ou descrição...';
  busca.setAttribute('aria-label', 'Buscar perícias');
  buscaGrupo.append(buscaIcone, busca);

  const filtro = document.createElement('select');
  filtro.className = 'ficha-campo-select ficha-pericias-filtro';
  filtro.setAttribute('aria-label', 'Filtrar perícias por atributo');
  const todos = document.createElement('option');
  todos.value = '';
  todos.textContent = 'Todos os atributos';
  filtro.appendChild(todos);
  Object.keys(NOMES_ATRIBUTOS).forEach(atributo => {
    const option = document.createElement('option');
    option.value = atributo;
    option.textContent = NOMES_ATRIBUTOS[atributo] || atributo;
    filtro.appendChild(option);
  });

  const contador = document.createElement('span');
  contador.className = 'ficha-pericias-contador';
  ferramentas.append(buscaGrupo, filtro, contador);
  pagina.appendChild(ferramentas);

  const secao = criarSecao(personagem, itens, ctx);
  pagina.appendChild(secao.secao);

  const vazio = document.createElement('p');
  vazio.className = 'ficha-pericias-vazio';
  vazio.textContent = 'Nenhuma perícia corresponde a esses filtros.';
  vazio.hidden = true;
  pagina.appendChild(vazio);

  function aplicarFiltros() {
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const atributo = filtro.value;
    let visiveis = 0;
    secao.linhas.forEach(linha => {
      const corresponde = (!termo || linha.dataset.nome.includes(termo))
        && (!atributo || linha.dataset.atributo === atributo);
      linha.hidden = !corresponde;
      if (corresponde) visiveis += 1;
    });
    secao.secao.classList.toggle('ficha-pericias-secao--sem-resultados', visiveis === 0);
    contador.textContent = `${visiveis} de ${secao.linhas.length}`;
    vazio.hidden = visiveis !== 0;
  }
  busca.addEventListener('input', aplicarFiltros);
  filtro.addEventListener('change', aplicarFiltros);
  pagina.addEventListener('pericia:atributo-alterado', aplicarFiltros);
  pagina.addEventListener('pericia:grau-alterado', () => {
    const total = contarTreinadas();
    totalTreinadas.textContent = String(total);
    resumo.classList.toggle('ficha-pericias-resumo--pendente', total < 6);
  });
  aplicarFiltros();

  container.appendChild(pagina);
}
