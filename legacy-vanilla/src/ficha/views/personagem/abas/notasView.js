import { atualizarPersonagem } from '../../../services/personagensService.js';
import {
  criarNota,
  criarTopico,
  tocarNota,
} from '../../../services/notasService.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

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
  controle.value = valor ?? '';
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

function formatarData(valor) {
  if (!valor) return 'Sem data registrada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Sem data registrada';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resumoTexto(texto, limite = 190) {
  const limpo = String(texto || '').replace(/\s+/g, ' ').trim();
  return limpo.length > limite ? `${limpo.slice(0, limite).trim()}…` : limpo;
}

export function renderNotas(container, personagem, ctx) {
  let notas = [...(personagem.notas || [])];
  let apenasFavoritas = false;

  const pagina = el('section', 'ficha-notas-pagina');
  const topo = el('header', 'ficha-notas-topo');
  const topoTexto = el('div');
  topoTexto.append(
    el('h2', '', 'Diário e notas'),
    el('p', '', 'Organize pistas, pessoas, lugares e acontecimentos sem misturar tudo em um único campo.'),
  );
  const topoLado = el('div', 'ficha-notas-topo-lado');
  const resumo = el('div', 'ficha-notas-resumo');
  const resumoTotal = el('strong');
  resumo.append(resumoTotal, el('span', '', 'notas salvas'));
  topoLado.append(resumo, botao('+ Nova nota', 'ficha-cta-btn', () => abrirEditor()));
  topo.append(topoTexto, topoLado);

  const ferramentas = el('div', 'ficha-notas-ferramentas');
  const busca = input('Buscar em notas', '', { tipo: 'search', placeholder: 'Buscar título, categoria, texto ou tópico...' });
  const filtroCategoria = el('select', 'ficha-campo-select');
  filtroCategoria.setAttribute('aria-label', 'Filtrar notas por categoria');
  const favoritas = botao('☆ Favoritas', 'ficha-notas-favoritas-filtro', () => {
    apenasFavoritas = !apenasFavoritas;
    favoritas.classList.toggle('ficha-notas-favoritas-filtro--ativo', apenasFavoritas);
    favoritas.textContent = apenasFavoritas ? '★ Favoritas' : '☆ Favoritas';
    favoritas.setAttribute('aria-pressed', String(apenasFavoritas));
    atualizarTela();
  });
  favoritas.setAttribute('aria-pressed', 'false');
  const contador = el('span', 'ficha-notas-contador');
  ferramentas.append(busca, filtroCategoria, favoritas, contador);
  const grade = el('div', 'ficha-notas-grade');
  pagina.append(topo, ferramentas, grade);
  container.appendChild(pagina);

  function salvar(novaLista, mensagem = '') {
    const resultado = atualizarPersonagem(personagem.id, { notas: novaLista });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return false;
    }
    Object.assign(personagem, resultado.personagem);
    notas = [...personagem.notas];
    atualizarTela();
    if (mensagem) ctx.mostrarToast(mensagem, 'sucesso');
    return true;
  }

  function abrirEditor(nota = null) {
    const form = el('form', 'ficha-nota-form');
    const titulo = input('Título da nota', nota?.titulo, { placeholder: 'Ex.: A chave da torre', maxLength: 120 });
    const categoria = input('Categoria da nota', nota?.categoria || 'Geral', { placeholder: 'Ex.: Sessão, NPC, Pista, Lugar...', maxLength: 60 });
    const conteudo = input('Anotações principais', nota?.conteudo, {
      textarea: true,
      linhas: 11,
      placeholder: 'Escreva aqui os detalhes importantes...',
      maxLength: 10000,
    });
    const favorito = input('Favoritar nota', '', { tipo: 'checkbox' });
    favorito.checked = Boolean(nota?.favorito);
    const favoritoCampo = el('label', 'ficha-nota-favorito-campo');
    favoritoCampo.append(favorito, el('span', '', 'Manter esta nota entre as favoritas'));
    form.append(
      campo('Título', titulo, 'ficha-nota-form-titulo'),
      campo('Categoria / etiqueta', categoria),
      favoritoCampo,
      campo('Anotações principais', conteudo, 'ficha-nota-form-largo'),
    );

    let topicos = (nota?.topicos || []).map(item => ({ ...item }));
    const secaoTopicos = el('section', 'ficha-nota-topicos ficha-nota-form-largo');
    const topicosTopo = el('header');
    const topicosTexto = el('div');
    topicosTexto.append(
      el('strong', '', 'Tópicos extras'),
      el('span', '', 'Separe informações que precisam ser encontradas rapidamente.'),
    );
    const adicionarTopico = botao('+ Adicionar tópico', 'ficha-cta-btn ficha-cta-btn--secundario', () => {
      capturarTopicos();
      topicos.push(criarTopico());
      renderizarTopicos();
    });
    topicosTopo.append(topicosTexto, adicionarTopico);
    const listaTopicos = el('div', 'ficha-nota-topicos-lista');
    secaoTopicos.append(topicosTopo, listaTopicos);
    form.appendChild(secaoTopicos);

    const erro = el('p', 'ficha-modal-erro ficha-nota-form-largo');
    erro.hidden = true;
    const acoes = el('div', 'ficha-colecao-form-acoes ficha-nota-form-largo');
    const cancelar = botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples);
    const confirmar = el('button', 'ficha-cta-btn', nota ? 'Salvar alterações' : 'Salvar no diário');
    confirmar.type = 'submit';
    acoes.append(cancelar, confirmar);
    form.append(erro, acoes);

    function capturarTopicos() {
      topicos = [...listaTopicos.querySelectorAll('[data-topico-id]')].map(linha => ({
        id: linha.dataset.topicoId,
        titulo: linha.querySelector('[data-campo="titulo"]')?.value || '',
        conteudo: linha.querySelector('[data-campo="conteudo"]')?.value || '',
      }));
    }

    function renderizarTopicos() {
      listaTopicos.replaceChildren();
      if (!topicos.length) {
        listaTopicos.appendChild(el('p', 'ficha-nota-topicos-vazio', 'Nenhum tópico extra. A nota principal pode ser usada sozinha.'));
        return;
      }
      topicos.forEach((topico, indice) => {
        const linha = el('div', 'ficha-nota-topico-editor');
        linha.dataset.topicoId = topico.id;
        const cabecalho = el('div');
        const tituloTopico = input(`Título do tópico ${indice + 1}`, topico.titulo, { placeholder: 'Título do tópico', maxLength: 100 });
        tituloTopico.dataset.campo = 'titulo';
        const remover = botao('×', 'ficha-info-btn ficha-colecao-excluir', () => {
          capturarTopicos();
          topicos = topicos.filter(item => item.id !== topico.id);
          renderizarTopicos();
        }, `Remover tópico ${indice + 1}`);
        cabecalho.append(tituloTopico, remover);
        const valor = input(`Conteúdo do tópico ${indice + 1}`, topico.conteudo, {
          textarea: true,
          linhas: 4,
          placeholder: 'Detalhes deste tópico...',
          maxLength: 3000,
        });
        valor.dataset.campo = 'conteudo';
        linha.append(cabecalho, valor);
        listaTopicos.appendChild(linha);
      });
    }

    form.addEventListener('submit', evento => {
      evento.preventDefault();
      if (titulo.value.trim().length < 2) {
        erro.textContent = 'Informe um título com pelo menos 2 caracteres.';
        erro.hidden = false;
        titulo.focus();
        return;
      }
      capturarTopicos();
      const dados = {
        titulo: titulo.value,
        categoria: categoria.value,
        conteudo: conteudo.value,
        topicos,
        favorito: favorito.checked,
      };
      const novaNota = nota ? tocarNota(nota, dados) : criarNota(dados);
      const novaLista = nota
        ? notas.map(item => item.id === nota.id ? novaNota : item)
        : [...notas, novaNota];
      if (salvar(novaLista, nota ? 'Nota atualizada.' : 'Nota salva no diário.')) fecharModalSimples();
    });
    renderizarTopicos();
    abrirModalSimples({
      titulo: nota ? `Editar — ${nota.titulo}` : 'Nova nota',
      corpo: form,
      classeExtra: 'ficha-modal--nota-editor',
    });
    titulo.focus();
  }

  function abrirLeitura(nota) {
    const corpo = el('article', 'ficha-nota-leitura');
    const meta = el('div', 'ficha-nota-leitura-meta');
    meta.append(
      el('span', '', nota.categoria || 'Geral'),
      el('time', '', `Atualizada em ${formatarData(nota.atualizadoEm || nota.criadoEm)}`),
    );
    corpo.append(meta, el('p', 'ficha-nota-leitura-conteudo', nota.conteudo || 'Nenhuma anotação principal.'));
    if (nota.topicos?.length) {
      const topicos = el('div', 'ficha-nota-leitura-topicos');
      nota.topicos.forEach(topico => {
        const secao = el('section');
        secao.append(
          el('h3', '', topico.titulo || 'Tópico sem título'),
          el('p', '', topico.conteudo || 'Sem conteúdo.'),
        );
        topicos.appendChild(secao);
      });
      corpo.appendChild(topicos);
    }
    const acoes = el('div', 'ficha-colecao-detalhe-acoes');
    acoes.append(
      botao('Editar nota', 'ficha-cta-btn', () => abrirEditor(nota)),
      botao('Duplicar', 'ficha-cta-btn ficha-cta-btn--secundario', () => duplicar(nota)),
    );
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: nota.titulo, corpo, classeExtra: 'ficha-modal--nota-leitura' });
  }

  function duplicar(nota) {
    const copia = criarNota({
      ...nota,
      titulo: `${nota.titulo} (cópia)`,
      topicos: nota.topicos?.map(item => criarTopico(item)) || [],
    });
    if (salvar([...notas, copia], 'Cópia da nota criada.')) fecharModalSimples();
  }

  function alternarFavorito(nota) {
    const atualizada = tocarNota(nota, { favorito: !nota.favorito });
    salvar(notas.map(item => item.id === nota.id ? atualizada : item));
  }

  function abrirExclusao(nota) {
    const corpo = el('div', 'ficha-colecao-exclusao');
    corpo.appendChild(el('p', '', `Apagar a nota “${nota.titulo}”?`));
    const acoes = el('div', 'ficha-colecao-form-acoes');
    acoes.append(
      botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples),
      botao('Apagar nota', 'ficha-cta-btn ficha-colecao-excluir-confirmar', () => {
        if (salvar(notas.filter(item => item.id !== nota.id), 'Nota apagada.')) fecharModalSimples();
      }),
    );
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: 'Apagar nota', corpo, classeExtra: 'ficha-modal--confirmacao' });
  }

  function criarCard(nota) {
    const card = el('article', 'ficha-nota-card');
    if (nota.favorito) card.classList.add('ficha-nota-card--favorita');
    const header = el('header');
    const identidade = el('div');
    identidade.append(
      el('span', 'ficha-nota-categoria', nota.categoria || 'Geral'),
      el('h3', '', nota.titulo),
      el('time', '', formatarData(nota.atualizadoEm || nota.criadoEm)),
    );
    const favorito = botao(nota.favorito ? '★' : '☆', 'ficha-nota-favorito', () => alternarFavorito(nota), `${nota.favorito ? 'Desfavoritar' : 'Favoritar'} ${nota.titulo}`);
    favorito.classList.toggle('ficha-nota-favorito--ativo', nota.favorito);
    favorito.setAttribute('aria-pressed', String(Boolean(nota.favorito)));
    header.append(identidade, favorito);
    const conteudo = el('p', 'ficha-nota-card-conteudo', resumoTexto(nota.conteudo) || 'Nenhuma anotação principal.');
    const topicos = el('div', 'ficha-nota-card-topicos');
    if (nota.topicos?.length) {
      nota.topicos.slice(0, 3).forEach(topico => topicos.appendChild(el('span', '', topico.titulo || 'Tópico')));
      if (nota.topicos.length > 3) topicos.appendChild(el('span', '', `+${nota.topicos.length - 3}`));
    } else topicos.appendChild(el('span', 'ficha-nota-card-sem-topicos', 'Sem tópicos extras'));
    const footer = el('footer');
    const abrir = botao('Abrir nota', 'ficha-nota-abrir', () => abrirLeitura(nota));
    const acoes = el('div');
    acoes.append(
      botao('Editar', 'ficha-nota-acao', () => abrirEditor(nota)),
      botao('Duplicar', 'ficha-nota-acao', () => duplicar(nota)),
      botao('×', 'ficha-info-btn ficha-colecao-excluir', () => abrirExclusao(nota), `Apagar ${nota.titulo}`),
    );
    footer.append(abrir, acoes);
    card.append(header, conteudo, topicos, footer);
    return card;
  }

  function atualizarCategorias() {
    const atual = filtroCategoria.value;
    const categorias = [...new Set(notas.map(nota => nota.categoria || 'Geral'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    filtroCategoria.replaceChildren();
    [{ id: '', titulo: 'Todas as categorias' }, ...categorias.map(item => ({ id: item, titulo: item }))].forEach(item => {
      const option = el('option', '', item.titulo);
      option.value = item.id;
      option.selected = item.id === atual;
      filtroCategoria.appendChild(option);
    });
  }

  function atualizarTela() {
    resumoTotal.textContent = String(notas.length);
    atualizarCategorias();
    grade.replaceChildren();
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const visiveis = notas.filter(nota => {
      const texto = `${nota.titulo} ${nota.categoria} ${nota.conteudo} ${(nota.topicos || []).map(item => `${item.titulo} ${item.conteudo}`).join(' ')}`.toLocaleLowerCase('pt-BR');
      return (!termo || texto.includes(termo))
        && (!filtroCategoria.value || nota.categoria === filtroCategoria.value)
        && (!apenasFavoritas || nota.favorito);
    });
    contador.textContent = `${visiveis.length} de ${notas.length}`;
    if (!visiveis.length) {
      const vazio = el('div', 'ficha-colecao-vazio ficha-notas-vazio');
      vazio.append(
        el('strong', '', notas.length ? 'Nenhuma nota corresponde aos filtros.' : 'O diário está vazio.'),
        el('span', '', notas.length ? 'Altere a busca, categoria ou filtro de favoritas.' : 'Crie uma nota para registrar o que aconteceu na campanha.'),
      );
      grade.appendChild(vazio);
      return;
    }
    visiveis.sort((a, b) => Number(b.favorito) - Number(a.favorito)
      || new Date(b.atualizadoEm || b.criadoEm || 0) - new Date(a.atualizadoEm || a.criadoEm || 0)
      || a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .forEach(nota => grade.appendChild(criarCard(nota)));
  }

  busca.addEventListener('input', atualizarTela);
  filtroCategoria.addEventListener('change', atualizarTela);
  atualizarTela();
}
