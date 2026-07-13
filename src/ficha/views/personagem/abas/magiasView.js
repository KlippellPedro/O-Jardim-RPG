import { atualizarPersonagem } from '../../../services/personagensService.js';
import { criarMagia, normalizarMagia } from '../../../services/magiasService.js';
import {
  entradaTemEfeitoAoUsar,
  somarModificadores,
} from '../../../services/modificadoresService.js';
import {
  abrirModificadores,
  desativarEntrada,
  usarEntrada,
} from '../colecaoPoderesHabilidades.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

const RECURSOS = ['Nenhum', 'Mana', 'Vida', 'Sanidade', 'Cansaço'];
const CONFIG = { chave: 'magias', singular: 'Magia', plural: 'Magias', prefixo: 'magia', genero: 'f' };

function el(tag, classe = '', texto = '') {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== '') elemento.textContent = texto;
  return elemento;
}

function input(aria, valor = '', opcoes = {}) {
  const controle = document.createElement(opcoes.textarea ? 'textarea' : 'input');
  controle.className = 'ficha-campo-input';
  controle.setAttribute('aria-label', aria);
  if (opcoes.textarea) controle.rows = opcoes.linhas || 4;
  else controle.type = opcoes.tipo || 'text';
  if (opcoes.placeholder) controle.placeholder = opcoes.placeholder;
  if (opcoes.maxLength) controle.maxLength = opcoes.maxLength;
  if (opcoes.min !== undefined) controle.min = String(opcoes.min);
  if (opcoes.max !== undefined) controle.max = String(opcoes.max);
  controle.value = valor ?? '';
  return controle;
}

function select(aria, opcoes, atual = '') {
  const controle = el('select', 'ficha-campo-select');
  controle.setAttribute('aria-label', aria);
  opcoes.forEach(item => {
    const valor = item.id ?? item;
    const option = el('option', '', item.titulo ?? item);
    option.value = valor;
    option.selected = valor === atual;
    controle.appendChild(option);
  });
  return controle;
}

function campo(rotulo, controle, classe = '') {
  const label = el('label', `ficha-campo ${classe}`.trim());
  label.append(el('span', 'ficha-campo-label', rotulo), controle);
  return label;
}

function botao(texto, classe, acao, aria = '') {
  const controle = el('button', classe, texto);
  controle.type = 'button';
  if (aria) controle.setAttribute('aria-label', aria);
  if (acao) controle.addEventListener('click', acao);
  return controle;
}

function custoTexto(magia) {
  return magia.custo && magia.tipoCusto !== 'Nenhum' ? `${magia.custo} ${magia.tipoCusto}` : 'Sem custo';
}

function formatarData(valor) {
  if (!valor) return 'Data não registrada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Data não registrada';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function somaAjustes(lista) {
  return (lista || []).reduce((total, item) => total + (Number(item.valor) || 0), 0);
}

function rotuloEfeito(efeito, catalogo) {
  const tipos = {
    recurso_maximo: 'Máximo de recurso',
    atributo: 'Atributo',
    combate: 'Combate',
    pericia_bonus: 'Bônus de perícia',
    pericia_vantagem: 'Vantagem',
    pericia_desvantagem: 'Desvantagem',
  };
  const pericia = (catalogo?.pericias || []).find(item => item.id === efeito.alvo)?.titulo;
  const sinal = Number(efeito.valor) >= 0 ? `+${efeito.valor}` : String(efeito.valor);
  return `${tipos[efeito.tipo] || efeito.tipo} · ${pericia || efeito.alvo} · ${sinal}`;
}

export function renderMagias(container, personagem, ctx) {
  let magias = [...(personagem.magias || [])];
  const pagina = el('section', 'ficha-magias-pagina');
  const topo = el('header', 'ficha-magias-topo');
  const topoTexto = el('div');
  topoTexto.append(
    el('h2', '', 'Grimório'),
    el('p', '', 'Cadastre as magias recebidas na campanha e deixe os dados de conjuração prontos para a sessão.'),
  );
  const topoLado = el('div', 'ficha-magias-topo-lado');
  const resumo = el('div', 'ficha-magias-resumo');
  const resumoTotal = el('strong');
  resumo.append(resumoTotal, el('span', '', 'magias registradas'));
  topoLado.append(resumo, botao('+ Nova magia', 'ficha-cta-btn', () => abrirEditor()));
  topo.append(topoTexto, topoLado);

  const aviso = el('div', 'ficha-magias-aviso');
  aviso.append(
    el('span', '', '✦'),
    el('p', '', 'As regras oficiais de círculos, DT e Fluxo ainda não foram publicadas no projeto. A página registra e usa apenas os dados informados por você, sem inventar cálculos.'),
  );

  const recursos = el('div', 'ficha-magias-recursos');
  const manaAtual = el('strong');
  const manaMaxima = el('span');
  const historico = botao('Histórico de conjuração', 'ficha-cta-btn ficha-cta-btn--secundario', abrirHistorico);
  recursos.append(el('span', '', 'Mana disponível'), manaAtual, manaMaxima, historico);

  const ferramentas = el('div', 'ficha-magias-ferramentas');
  const busca = input('Buscar magia', '', { tipo: 'search', placeholder: 'Buscar magia, escola, fonte ou efeito...' });
  const filtroCirculo = select('Filtrar magias por círculo', [{ id: '', titulo: 'Todos os círculos' }]);
  const filtroRecurso = select('Filtrar magias por recurso', [
    { id: '', titulo: 'Todos os recursos' },
    ...RECURSOS.map(item => ({ id: item, titulo: item })),
  ]);
  const contador = el('span', 'ficha-magias-contador');
  ferramentas.append(busca, filtroCirculo, filtroRecurso, contador);
  const grade = el('div', 'ficha-magias-grade');
  pagina.append(topo, aviso, recursos, ferramentas, grade);
  container.appendChild(pagina);

  const ctxLocal = {
    ...ctx,
    recarregar: () => {
      magias = [...(personagem.magias || [])];
      atualizarTela();
    },
  };

  function atualizarResumo() {
    resumoTotal.textContent = String(magias.length);
    const atual = Math.max(0, Number(personagem.recursos?.manaAtual) || 0);
    const maxima = Math.max(
      1,
      (Number(personagem.derivados?.mana) || 0)
        + somaAjustes(personagem.recursos?.ajustesMana)
        + somarModificadores(personagem, 'recurso_maximo', 'mana'),
    );
    manaAtual.textContent = String(atual);
    manaMaxima.textContent = `/ ${maxima}`;
  }

  function salvar(novaLista, mensagem = '') {
    const resultado = atualizarPersonagem(personagem.id, { magias: novaLista });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return false;
    }
    Object.assign(personagem, resultado.personagem);
    magias = [...personagem.magias];
    atualizarTela();
    if (mensagem) ctx.mostrarToast(mensagem, 'sucesso');
    return true;
  }

  function abrirEditor(magia = null) {
    const form = el('form', 'ficha-magia-form');
    const nome = input('Nome da magia', magia?.nome, { placeholder: 'Ex.: Véu de Cinzas', maxLength: 100 });
    const circulo = input('Círculo ou nível', magia?.circulo, { placeholder: 'Ex.: I, 2 ou Ritual', maxLength: 40 });
    const escola = input('Escola ou tipo', magia?.escola || 'Geral', { placeholder: 'Ex.: Elemental, Divina, Sangue...', maxLength: 80 });
    const fonte = input('Fonte da magia', magia?.fonte || 'Grimório', { placeholder: 'Ex.: Classe, Legado, Item...', maxLength: 80 });
    const custo = input('Custo de conjuração', magia?.custo || 0, { tipo: 'number', min: 0, max: 999 });
    const tipoCusto = select('Recurso da magia', RECURSOS, magia?.tipoCusto || 'Nenhum');
    const custoGrupo = el('div', 'ficha-magia-custo-grupo');
    custoGrupo.append(custo, tipoCusto);
    const acao = input('Ação da magia', magia?.acao, { placeholder: 'Ex.: Ação padrão', maxLength: 80 });
    const duracao = input('Duração da magia', magia?.duracao, { placeholder: 'Ex.: Instantânea, 3 rodadas', maxLength: 80 });
    const alcance = input('Alcance da magia', magia?.alcance, { placeholder: 'Ex.: Pessoal, 18 m', maxLength: 80 });
    const teste = input('Teste ou resistência', magia?.teste, { placeholder: 'Ex.: Misticismo contra Vontade', maxLength: 120 });
    const descricao = input('Descrição e efeito da magia', magia?.descricao, {
      textarea: true,
      linhas: 8,
      placeholder: 'Descreva o efeito, condições e aprimoramentos conhecidos...',
      maxLength: 3000,
    });
    form.append(
      campo('Nome', nome, 'ficha-magia-form-nome'),
      campo('Círculo / nível', circulo),
      campo('Escola / tipo', escola),
      campo('Fonte', fonte),
      campo('Custo de conjuração', custoGrupo),
      campo('Ação', acao),
      campo('Duração', duracao),
      campo('Alcance', alcance),
      campo('Teste / resistência', teste),
      campo('Descrição e efeito', descricao, 'ficha-magia-form-largo'),
    );
    if (magia) {
      const modificadores = el('div', 'ficha-magia-modificadores-chamada ficha-magia-form-largo');
      const texto = el('div');
      texto.append(
        el('strong', '', 'Buffs e modificadores'),
        el('span', '', `${magia.efeitos?.length || 0} efeito(s) configurado(s).`),
      );
      modificadores.append(texto, botao('Configurar', 'ficha-cta-btn ficha-cta-btn--secundario', () => abrirModificadores(personagem, ctxLocal, CONFIG, magia)));
      form.appendChild(modificadores);
    }
    const erro = el('p', 'ficha-modal-erro ficha-magia-form-largo');
    erro.hidden = true;
    const acoes = el('div', 'ficha-colecao-form-acoes ficha-magia-form-largo');
    const cancelar = botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples);
    const confirmar = el('button', 'ficha-cta-btn', magia ? 'Salvar magia' : 'Adicionar ao grimório');
    confirmar.type = 'submit';
    acoes.append(cancelar, confirmar);
    form.append(erro, acoes);
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      if (nome.value.trim().length < 2) {
        erro.textContent = 'Informe um nome com pelo menos 2 caracteres.';
        erro.hidden = false;
        nome.focus();
        return;
      }
      const dados = {
        ...(magia || {}),
        nome: nome.value,
        circulo: circulo.value,
        escola: escola.value,
        fonte: fonte.value,
        custo: custo.value,
        tipoCusto: tipoCusto.value,
        acao: acao.value,
        duracao: duracao.value,
        alcance: alcance.value,
        teste: teste.value,
        descricao: descricao.value,
      };
      const normalizada = magia ? normalizarMagia(dados) : criarMagia(dados);
      const novaLista = magia
        ? magias.map(item => item.id === magia.id ? normalizada : item)
        : [...magias, normalizada];
      if (salvar(novaLista, magia ? 'Magia atualizada.' : 'Magia adicionada ao grimório.')) fecharModalSimples();
    });
    abrirModalSimples({
      titulo: magia ? `Editar — ${magia.nome}` : 'Nova magia',
      corpo: form,
      classeExtra: 'ficha-modal--magia-editor',
    });
    nome.focus();
  }

  function abrirDetalhes(magia) {
    const corpo = el('div', 'ficha-magia-detalhes');
    const gradeDetalhes = el('dl', 'ficha-magia-detalhes-grade');
    [
      ['Círculo / nível', magia.circulo || 'Não informado'],
      ['Escola / tipo', magia.escola || 'Não informado'],
      ['Fonte', magia.fonte || 'Não informada'],
      ['Custo', custoTexto(magia)],
      ['Ação', magia.acao || 'Não informada'],
      ['Duração', magia.duracao || 'Não informada'],
      ['Alcance', magia.alcance || 'Não informado'],
      ['Teste / resistência', magia.teste || 'Não informado'],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('dt', '', rotulo), el('dd', '', valor));
      gradeDetalhes.appendChild(item);
    });
    corpo.appendChild(gradeDetalhes);
    const efeito = el('section');
    efeito.append(el('h3', '', 'Efeito registrado'), el('p', '', magia.descricao || 'Nenhuma descrição informada.'));
    corpo.appendChild(efeito);
    const modificadores = el('section');
    modificadores.appendChild(el('h3', '', 'O que esta magia afeta na ficha'));
    if (magia.efeitos?.length) {
      const lista = el('ul', 'ficha-magia-efeitos-lista');
      magia.efeitos.forEach(item => {
        const modo = item.modo === 'sempre' ? 'sempre ativo' : 'ativo ao conjurar';
        lista.appendChild(el('li', '', `${rotuloEfeito(item, ctx.catalogo)} · ${modo}${item.descricao ? ` · ${item.descricao}` : ''}`));
      });
      modificadores.appendChild(lista);
    } else modificadores.appendChild(el('p', '', 'Nenhum modificador mecânico configurado.'));
    corpo.appendChild(modificadores);
    const avisoCalculo = el('p', 'ficha-magias-aviso-calculo', 'Não há cálculo automático de DT ou círculo porque essas regras ainda não estão publicadas nos arquivos do projeto.');
    corpo.appendChild(avisoCalculo);
    const acoes = el('div', 'ficha-colecao-detalhe-acoes');
    acoes.append(
      botao('Editar magia', 'ficha-cta-btn', () => abrirEditor(magia)),
      botao('Configurar modificadores', 'ficha-cta-btn ficha-cta-btn--secundario', () => abrirModificadores(personagem, ctxLocal, CONFIG, magia)),
    );
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: magia.nome, corpo, classeExtra: 'ficha-modal--magia-detalhes' });
  }

  function abrirExclusao(magia) {
    const corpo = el('div', 'ficha-colecao-exclusao');
    corpo.appendChild(el('p', '', `Remover “${magia.nome}” do grimório?`));
    const acoes = el('div', 'ficha-colecao-form-acoes');
    acoes.append(
      botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples),
      botao('Remover magia', 'ficha-cta-btn ficha-colecao-excluir-confirmar', () => {
        const efeitosAtivos = { ...(personagem.efeitosAtivos || {}) };
        delete efeitosAtivos[magia.id];
        const resultado = atualizarPersonagem(personagem.id, {
          magias: magias.filter(item => item.id !== magia.id),
          efeitosAtivos,
        });
        if (!resultado.ok) {
          ctx.mostrarToast(resultado.mensagem, 'erro');
          return;
        }
        Object.assign(personagem, resultado.personagem);
        magias = [...personagem.magias];
        atualizarTela();
        fecharModalSimples();
        ctx.mostrarToast('Magia removida do grimório.', 'sucesso');
      }),
    );
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: 'Remover magia', corpo, classeExtra: 'ficha-modal--confirmacao' });
  }

  function abrirHistorico() {
    const registros = (personagem.historicoUsos || []).filter(item => item.colecao === 'magias').slice().reverse();
    const corpo = el('div', 'ficha-colecao-historico-lista');
    if (!registros.length) corpo.appendChild(el('p', 'ficha-colecao-vazio', 'Nenhuma conjuração foi registrada ainda.'));
    else registros.forEach(registro => {
      const linha = el('div', 'ficha-colecao-historico-item');
      linha.append(
        el('strong', '', registro.nome),
        el('span', '', `${registro.custo ? `${registro.custo} ${registro.tipoCusto} · ` : ''}${formatarData(registro.usadoEm)}`),
      );
      corpo.appendChild(linha);
    });
    abrirModalSimples({ titulo: 'Histórico de conjuração', corpo, classeExtra: 'ficha-modal--historico-magias' });
  }

  function conjurar(magia) {
    if (usarEntrada(personagem, ctxLocal, CONFIG, magia)) atualizarResumo();
  }

  function duplicar(magia) {
    const copia = criarMagia({ ...magia, nome: `${magia.nome} (cópia)`, efeitos: magia.efeitos || [] });
    salvar([...magias, copia], 'Cópia da magia criada.');
  }

  function criarCard(magia) {
    const ativo = Boolean(personagem.efeitosAtivos?.[magia.id]);
    const card = el('article', 'ficha-magia-card');
    if (ativo) card.classList.add('ficha-magia-card--ativa');
    const header = el('header');
    const identidade = el('div');
    identidade.append(
      el('span', 'ficha-magia-escola', magia.escola || 'Geral'),
      el('h3', '', magia.nome),
      el('span', '', magia.fonte || 'Grimório'),
    );
    const circulo = el('div', 'ficha-magia-circulo');
    circulo.append(el('span', '', 'Círculo'), el('strong', '', magia.circulo || '—'));
    header.append(identidade, circulo);
    const dados = el('div', 'ficha-magia-dados');
    [
      ['Custo', custoTexto(magia)],
      ['Ação', magia.acao || '—'],
      ['Alcance', magia.alcance || '—'],
      ['Duração', magia.duracao || '—'],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('span', '', rotulo), el('strong', '', valor));
      dados.appendChild(item);
    });
    const descricao = el('p', 'ficha-magia-descricao', magia.descricao || 'Nenhum efeito descrito.');
    const estado = el('div', 'ficha-magia-estado');
    if (ativo) estado.append(el('strong', '', 'Efeito ativo'), el('span', '', 'Os modificadores permanecem aplicados até serem encerrados.'));
    else if (magia.efeitos?.length) estado.append(el('strong', '', `${magia.efeitos.length} modificador(es)`), el('span', '', entradaTemEfeitoAoUsar(magia) ? 'Ativados ao conjurar.' : 'Sempre ativos.'));
    else estado.append(el('strong', '', 'Sem modificadores'), el('span', '', magia.teste || 'Somente dados descritivos.'));
    const footer = el('footer');
    const primarias = el('div');
    primarias.appendChild(ativo
      ? botao('Encerrar efeito', 'ficha-magia-conjurar ficha-magia-encerrar', () => desativarEntrada(personagem, ctxLocal, magia))
      : botao('Conjurar', 'ficha-magia-conjurar', () => conjurar(magia)));
    const acoes = el('div');
    acoes.append(
      botao('?', 'ficha-info-btn', () => abrirDetalhes(magia), `Ver detalhes e efeitos de ${magia.nome}`),
      botao('Efeitos', 'ficha-magia-acao', () => abrirModificadores(personagem, ctxLocal, CONFIG, magia)),
      botao('Editar', 'ficha-magia-acao', () => abrirEditor(magia)),
      botao('Duplicar', 'ficha-magia-acao ficha-magia-duplicar', () => duplicar(magia)),
      botao('×', 'ficha-info-btn ficha-colecao-excluir', () => abrirExclusao(magia), `Remover ${magia.nome}`),
    );
    footer.append(primarias, acoes);
    card.append(header, dados, descricao, estado, footer);
    return card;
  }

  function atualizarFiltros() {
    const atualCirculo = filtroCirculo.value;
    const circulos = [...new Set(magias.map(item => item.circulo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
    filtroCirculo.replaceChildren();
    [{ id: '', titulo: 'Todos os círculos' }, ...circulos.map(item => ({ id: item, titulo: `Círculo ${item}` }))].forEach(item => {
      const option = el('option', '', item.titulo);
      option.value = item.id;
      option.selected = item.id === atualCirculo;
      filtroCirculo.appendChild(option);
    });
  }

  function atualizarTela() {
    atualizarResumo();
    atualizarFiltros();
    grade.replaceChildren();
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const visiveis = magias.filter(magia => {
      const texto = `${magia.nome} ${magia.escola} ${magia.fonte} ${magia.descricao} ${magia.teste}`.toLocaleLowerCase('pt-BR');
      return (!termo || texto.includes(termo))
        && (!filtroCirculo.value || magia.circulo === filtroCirculo.value)
        && (!filtroRecurso.value || magia.tipoCusto === filtroRecurso.value);
    });
    contador.textContent = `${visiveis.length} de ${magias.length}`;
    if (!visiveis.length) {
      const vazio = el('div', 'ficha-colecao-vazio ficha-magias-vazio');
      vazio.append(
        el('strong', '', magias.length ? 'Nenhuma magia corresponde aos filtros.' : 'O grimório está vazio.'),
        el('span', '', magias.length ? 'Altere a busca ou os filtros.' : 'Adicione uma magia quando o personagem aprendê-la na campanha.'),
      );
      grade.appendChild(vazio);
      return;
    }
    visiveis.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).forEach(magia => grade.appendChild(criarCard(magia)));
  }

  busca.addEventListener('input', atualizarTela);
  filtroCirculo.addEventListener('change', atualizarTela);
  filtroRecurso.addEventListener('change', atualizarTela);
  atualizarTela();
}
