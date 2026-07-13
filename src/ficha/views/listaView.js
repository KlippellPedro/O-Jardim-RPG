import { router } from '../../core/router.js';
import {
  listarPersonagens,
  excluirPersonagem,
  atualizarPersonagem,
  exportarPersonagem,
  importarPersonagem,
} from '../services/personagensService.js';
import { listarArvoresDisponiveis } from '../services/arvoresService.js';
import { abrirWizardCriacao } from './wizard/wizardCriacao.js';

const CONFIRMAR_EXCLUSAO_MS = 3500;
const FOTO_LIMITE_MB = 2;
const IMPORTACAO_LIMITE_MB = 5;

function formatarData(iso) {
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelCatalogo(lista, id) {
  if (!id) return null;
  const item = lista.find(i => i.id === id);
  return item ? item.titulo : null;
}

function labelArvore(id) {
  if (!id) return null;
  const arvore = listarArvoresDisponiveis().find(a => a.id === id);
  return arvore ? arvore.titulo : null;
}

function dispararCriacao(ctx) {
  abrirWizardCriacao(ctx.catalogo, {
    aoCriar: (personagem) => {
      ctx.mostrarToast(`${personagem.nome} foi criado.`, 'sucesso');
      renderizarLista(ctx.content, ctx.catalogo, { mostrarToast: ctx.mostrarToast });
    },
  });
}

function criarBotaoImportar(ctx) {
  const wrapper = document.createDocumentFragment();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-cta-btn ficha-cta-btn--secundario';
  btn.textContent = 'Importar personagem';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.hidden = true;
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > IMPORTACAO_LIMITE_MB * 1024 * 1024) {
      ctx.mostrarToast(`Arquivo muito grande (máx. ${IMPORTACAO_LIMITE_MB}MB).`, 'erro');
      input.value = '';
      return;
    }
    try {
      const raw = await file.text();
      const resultado = importarPersonagem(raw);
      ctx.mostrarToast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
      if (resultado.ok) renderizarLista(ctx.content, ctx.catalogo, { mostrarToast: ctx.mostrarToast });
    } catch {
      ctx.mostrarToast('Não foi possível ler o arquivo selecionado.', 'erro');
    } finally {
      input.value = '';
    }
  });

  wrapper.append(btn, input);
  return wrapper;
}

function criarEstadoVazio(ctx) {
  const vazio = document.createElement('div');
  vazio.className = 'ficha-empty';

  const ornamento = document.createElement('div');
  ornamento.className = 'ficha-empty-ornament';
  ornamento.setAttribute('aria-hidden', 'true');
  ornamento.innerHTML = `
    <span class="ficha-empty-ornament-line"></span>
    <img class="ficha-empty-ornament-icon" src="../assets/img/icons/menu/ficha.png" alt="">
    <span class="ficha-empty-ornament-line"></span>
  `;
  vazio.appendChild(ornamento);

  const texto = document.createElement('p');
  texto.className = 'ficha-empty-text';
  texto.textContent = 'Nenhum personagem criado ainda. Comece a escrever a sua história.';
  vazio.appendChild(texto);

  const acoes = document.createElement('div');
  acoes.className = 'ficha-lista-acoes';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-cta-btn';
  btn.textContent = 'Criar meu primeiro personagem';
  btn.addEventListener('click', () => dispararCriacao(ctx));
  acoes.appendChild(btn);
  acoes.appendChild(criarBotaoImportar(ctx));

  vazio.appendChild(acoes);

  return vazio;
}

function criarAvatarPersonagem(personagem, ctx) {
  const avatar = document.createElement('div');
  avatar.className = 'ficha-personagem-avatar';
  avatar.setAttribute('aria-hidden', 'true');

  if (personagem.foto) {
    const img = document.createElement('img');
    img.src = personagem.foto;
    img.alt = '';
    avatar.appendChild(img);
  } else {
    const glyph = document.createElement('span');
    glyph.className = 'ficha-personagem-avatar-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = (personagem.nome || '?').trim().charAt(0).toUpperCase() || '?';
    avatar.appendChild(glyph);
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    // Sem limpar o input, escolher o mesmo arquivo de novo (depois de um
    // erro) não dispara `change` e o clique parece morto.
    if (!file.type.startsWith('image/')) {
      ctx.mostrarToast('Escolha um arquivo de imagem.', 'erro');
      input.value = '';
      return;
    }
    if (file.size > FOTO_LIMITE_MB * 1024 * 1024) {
      ctx.mostrarToast(`Imagem muito grande (máx. ${FOTO_LIMITE_MB}MB).`, 'erro');
      input.value = '';
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = atualizarPersonagem(personagem.id, { foto: leitor.result });
      if (!resultado.ok) { ctx.mostrarToast(resultado.mensagem, 'erro'); return; }
      renderizarLista(ctx.content, ctx.catalogo, { mostrarToast: ctx.mostrarToast });
    };
    leitor.onerror = () => ctx.mostrarToast('Não foi possível ler essa imagem.', 'erro');
    leitor.readAsDataURL(file);
  });

  avatar.appendChild(input);
  return avatar;
}

function criarBotaoExportar(personagem, ctx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-exportar-btn';
  btn.textContent = 'Exportar';
  btn.setAttribute('aria-label', `Exportar ${personagem.nome} como JSON`);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const raw = exportarPersonagem(personagem.id);
    if (!raw) { ctx.mostrarToast('Não foi possível exportar este personagem.', 'erro'); return; }

    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(personagem.nome || 'personagem').trim() || 'personagem'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  return btn;
}

function criarBotaoExcluir(personagem, ctx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-excluir-btn';
  btn.textContent = 'Excluir';
  btn.setAttribute('aria-label', `Excluir ${personagem.nome}`);

  let confirmando = false;
  let timer = null;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    if (!confirmando) {
      confirmando = true;
      btn.textContent = 'Confirmar exclusão?';
      btn.classList.add('ficha-excluir-btn--confirmando');
      timer = setTimeout(() => {
        confirmando = false;
        btn.textContent = 'Excluir';
        btn.classList.remove('ficha-excluir-btn--confirmando');
      }, CONFIRMAR_EXCLUSAO_MS);
      return;
    }

    clearTimeout(timer);
    if (!excluirPersonagem(personagem.id)) {
      ctx.mostrarToast('Não foi possível excluir o personagem do navegador.', 'erro');
      confirmando = false;
      btn.textContent = 'Excluir';
      btn.classList.remove('ficha-excluir-btn--confirmando');
      return;
    }
    ctx.mostrarToast(`${personagem.nome} foi excluído.`, 'info');
    renderizarLista(ctx.content, ctx.catalogo, { mostrarToast: ctx.mostrarToast });
  });

  return btn;
}

function criarCard(personagem, ctx, indice) {
  const card = document.createElement('div');
  card.className = 'ficha-personagem-card';
  card.style.animationDelay = `${Math.min(indice, 12) * 45}ms`;

  const corpo = document.createElement('div');
  corpo.className = 'ficha-personagem-card-corpo';
  corpo.setAttribute('role', 'button');
  corpo.setAttribute('tabindex', '0');
  corpo.setAttribute('aria-label', `Abrir ficha de ${personagem.nome}`);

  const topo = document.createElement('div');
  topo.className = 'ficha-personagem-card-topo';
  const avatar = criarAvatarPersonagem(personagem, ctx);
  topo.appendChild(avatar);

  const info = document.createElement('div');
  info.className = 'ficha-personagem-card-info';

  const nivel = document.createElement('span');
  nivel.className = 'ficha-personagem-nivel';
  nivel.textContent = `Nv. ${personagem.nivel}`;
  info.appendChild(nivel);

  const nome = document.createElement('span');
  nome.className = 'ficha-personagem-nome';
  nome.textContent = personagem.nome;
  info.appendChild(nome);

  topo.appendChild(info);
  corpo.appendChild(topo);

  const arvoreTitulo = labelArvore(personagem.arvoreId);
  const racaTitulo = labelCatalogo(ctx.catalogo.racas, personagem.racaId);
  const classeTitulo = (personagem.classes || [])
    .map(item => `${labelCatalogo(ctx.catalogo.classes, item.id) || 'Classe'} ${item.nivel}`)
    .join(' / ') || labelCatalogo(ctx.catalogo.classes, personagem.classeId);
  const subtitulo = document.createElement('span');
  subtitulo.className = 'ficha-personagem-subtitulo';
  subtitulo.textContent = [arvoreTitulo, racaTitulo, classeTitulo].filter(Boolean).join(' · ') || 'Raça e classe a definir';
  corpo.appendChild(subtitulo);

  if (personagem.derivados) {
    const stats = document.createElement('span');
    stats.className = 'ficha-personagem-stats';
    stats.textContent = `Vida ${personagem.derivados.vida} · Mana ${personagem.derivados.mana} · Mov. ${personagem.derivados.movimento} m`;
    corpo.appendChild(stats);
  }

  const dataEl = document.createElement('span');
  dataEl.className = 'ficha-personagem-data';
  dataEl.textContent = `Criado em ${formatarData(personagem.criadoEm)}`;
  corpo.appendChild(dataEl);

  const abrir = () => router.navegar(`/personagem/${personagem.id}`);
  corpo.addEventListener('click', abrir);
  corpo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
  });

  card.appendChild(corpo);

  const rodape = document.createElement('div');
  rodape.className = 'ficha-personagem-card-rodape';
  const foto = document.createElement('button');
  foto.type = 'button';
  foto.className = 'ficha-exportar-btn';
  foto.textContent = personagem.foto ? 'Trocar foto' : 'Adicionar foto';
  foto.setAttribute('aria-label', personagem.foto ? `Trocar foto de ${personagem.nome}` : `Adicionar foto de ${personagem.nome}`);
  foto.addEventListener('click', () => avatar.querySelector('input[type="file"]')?.click());
  rodape.appendChild(foto);
  rodape.appendChild(criarBotaoExportar(personagem, ctx));
  rodape.appendChild(criarBotaoExcluir(personagem, ctx));
  card.appendChild(rodape);

  return card;
}

export function renderizarLista(content, catalogo, { mostrarToast }) {
  const ctx = { content, catalogo, mostrarToast };

  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'ficha-lista-header';

  const h2 = document.createElement('h2');
  h2.className = 'ficha-lista-titulo';
  h2.textContent = 'Seus personagens';
  header.appendChild(h2);

  const acoes = document.createElement('div');
  acoes.className = 'ficha-lista-acoes';

  acoes.appendChild(criarBotaoImportar(ctx));

  const criarBtn = document.createElement('button');
  criarBtn.type = 'button';
  criarBtn.className = 'ficha-cta-btn';
  criarBtn.textContent = '+ Criar personagem';
  criarBtn.addEventListener('click', () => dispararCriacao(ctx));
  acoes.appendChild(criarBtn);

  header.appendChild(acoes);

  content.appendChild(header);

  const personagens = listarPersonagens();

  if (personagens.length === 0) {
    content.appendChild(criarEstadoVazio(ctx));
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'ficha-personagem-grid';
  personagens.forEach((p, i) => grid.appendChild(criarCard(p, ctx, i)));
  content.appendChild(grid);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
