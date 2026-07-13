/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Loja
   Loja de jogo: barra lateral de categorias sempre visível +
   grade de cards (imagem, raridade, preço) + modal estilo carta
   pro detalhe. Conteúdo chega por import de JSON (ver
   services/entradasService.js) — sem senha, sem dado de exemplo embutido.
   O botão de ação é só visual por enquanto: a compra de verdade
   vai rodar pelo Banqueiro, um bot no Discord, fora deste app.
   ───────────────────────────────────────────────────────── */

import { router } from '../core/router.js';
import { CATEGORIAS, categoriaPorId, categoriaPorTipo } from './config/categorias.js';
import {
  entradasPorCategoria,
  getEntradas,
  processarArquivo,
} from './services/entradasService.js';
import {
  candidataUnicaEhMoeda,
  definirMoedaAtiva,
  getMoedaAtiva,
  getMoedas,
  processarArquivoMoedas,
  removerMoeda,
} from './services/moedasService.js';

const content       = document.getElementById('loja-content');
const sidebarEl      = document.getElementById('loja-sidebar');
const quickfiltersEl = document.getElementById('loja-quickfilters');
const searchInput    = document.getElementById('loja-search-input');
const modalLayer     = document.getElementById('loja-modal-layer');
const toast          = document.getElementById('loja-toast');
const walletIconEl   = document.getElementById('loja-wallet-icon');
const walletValorEl  = document.getElementById('loja-wallet-valor');
const moedaSeletorEl = document.getElementById('loja-moeda-seletor');
let toastTimer = null;

const TODOS_ID = 'todos';

// Categoria "Todos" — visão combinada, não é um tipo de conteúdo de verdade
// (não existe em categorias.js, que só descreve categorias importáveis).
const CATEGORIA_TODOS = {
  id: TODOS_ID,
  titulo: 'Todos',
  simbolo: '✦',
  accent: 'var(--gold)',
  descricao: 'Tudo que já foi descoberto, num só lugar.',
  vazio: 'Nada foi descoberto ainda. A loja está vazia.',
  acao: 'Comprar',
};

// Estado central da grade — busca e raridade se aplicam à categoria atual;
// trocar de categoria reseta os dois (recomeço limpo por seção).
const estado = { categoria: TODOS_ID, busca: '', raridade: null };
let gridArea = null; // sub-container reaproveitado por renderizarGradeFiltrada()
let modalTriggerEl = null; // pra devolver o foco ao fechar o modal

// ── Raridade — convenção nova só da Loja, não é regra oficial do jogo ───
// "Comum" é o único termo já usado nas regras (item inicial); os outros 4
// níveis são inventados aqui, reaproveitando cores que já existem na
// paleta (variables.css) — nenhuma cor nova.

const RARIDADES = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

const RARIDADE_INFO = {
  comum:    { label: 'Comum',    cor: 'var(--star)' },
  incomum:  { label: 'Incomum',  cor: 'var(--moss)' },
  raro:     { label: 'Raro',     cor: 'var(--frost)' },
  epico:    { label: 'Épico',    cor: 'var(--arkania)' },
  lendario: { label: 'Lendário', cor: 'var(--gold)' },
};

// Aceita "Épico", "epico", "ÉPICO"... — cai em "comum" se ausente/desconhecida.
const MAPA_SEM_ACENTO = {
  á: 'a', à: 'a', â: 'a', ã: 'a',
  é: 'e', ê: 'e',
  í: 'i',
  ó: 'o', ô: 'o', õ: 'o',
  ú: 'u',
  ç: 'c',
};

// Compartilhada com o preço por moeda (ver precoParaMoeda) — mesma dobra de
// acento/caixa serve pra casar "raridade"/nome de moeda escritos de formas
// diferentes ("Épico"/"epico", "Solares"/"SÓIS") com a chave certa.
function normalizarChave(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .split('')
    .map(ch => MAPA_SEM_ACENTO[ch] || ch)
    .join('');
}

function normalizarRaridade(valor) {
  const chave = normalizarChave(valor);
  return RARIDADE_INFO[chave] ? chave : 'comum';
}

// ── Toast de feedback ────────────────────────────────────

function mostrarToast(mensagem, tipo) {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

// ── Transição de página — View Transitions API quando o
// navegador suporta; sem suporte, cai pra troca instantânea. ──

function comTransicao(fn) {
  if (document.startViewTransition) {
    const transicao = document.startViewTransition(fn);
    transicao.ready.catch(() => {});
    transicao.finished.catch(() => {});
  } else {
    fn();
  }
}

// `.loja-content` é reaproveitado entre renders — precisa reiniciar
// a própria animação manualmente a cada troca de rota (não a cada
// filtro/busca, que só atualiza a grade interna — ver renderizarGradeFiltrada).
function resetarAnimacao() {
  content.style.animation = 'none';
  void content.offsetHeight;
  content.style.animation = '';
}

function truncar(texto, tamanho) {
  const t = String(texto || '').trim();
  return t.length > tamanho ? `${t.slice(0, tamanho).trim()}…` : t;
}

function humanizarChave(chave) {
  const texto = chave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ── Render genérico de campos de `conteudo` + cross-links ──
// O schema de arma/veículo/monstro/drop ainda não foi definido,
// então qualquer chave vira uma linha — sem supor nomes de campo
// (exceto os curados: descricao/imagem/raridade/preco/atributos/
// nivel/classe, tratados à parte no card e no modal).

function irParaEntrada(id) {
  const entrada = getEntradas()[id];
  if (!entrada) return;
  const cat = categoriaPorTipo(entrada.tipo);
  if (cat) router.navegar(`/${cat.id}/${entrada.id}`);
}

function renderValor(valor, mapa) {
  if (Array.isArray(valor)) {
    const span = document.createElement('span');
    valor.forEach((item, i) => {
      if (i > 0) span.append(', ');
      span.appendChild(renderValor(item, mapa));
    });
    return span;
  }

  if (valor && typeof valor === 'object') {
    return renderConteudo(valor, mapa);
  }

  if (typeof valor === 'string' && mapa[valor]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'loja-entry-link';
    btn.textContent = mapa[valor].titulo;
    btn.addEventListener('click', () => irParaEntrada(valor));
    return btn;
  }

  const span = document.createElement('span');
  span.textContent = String(valor);
  return span;
}

function renderConteudo(conteudo, mapa) {
  const dl = document.createElement('dl');
  dl.className = 'loja-fields';
  Object.entries(conteudo).forEach(([chave, valor]) => {
    if (valor === null || valor === undefined || valor === '') return;
    const dt = document.createElement('dt');
    dt.textContent = humanizarChave(chave);
    const dd = document.createElement('dd');
    dd.appendChild(renderValor(valor, mapa));
    dl.append(dt, dd);
  });
  return dl;
}

// ── Categorias + "Todos" ─────────────────────────────────

function categoriaOuTodos(id) {
  return id === TODOS_ID ? CATEGORIA_TODOS : categoriaPorId(id);
}

function entradasDaVisao(categoriaId) {
  if (categoriaId === TODOS_ID) return Object.values(getEntradas());
  const categoria = categoriaPorId(categoriaId);
  return categoria ? entradasPorCategoria(categoria) : [];
}

// ── Barra lateral — montada uma vez, estado ativo por rota ──

function renderSidebar() {
  sidebarEl.innerHTML = '';
  [CATEGORIA_TODOS, ...CATEGORIAS].forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'loja-sidebar-item';
    btn.dataset.categoria = cat.id;
    btn.style.setProperty('--accent', cat.accent);
    btn.setAttribute('aria-label', cat.titulo);

    const icone = document.createElement('span');
    icone.className = 'loja-sidebar-icon';
    icone.setAttribute('aria-hidden', 'true');
    icone.textContent = cat.simbolo;

    const label = document.createElement('span');
    label.className = 'loja-sidebar-label';
    label.textContent = cat.titulo;

    btn.append(icone, label);
    btn.addEventListener('click', () => {
      router.navegar(cat.id === TODOS_ID ? '/' : `/${cat.id}`);
    });
    sidebarEl.appendChild(btn);
  });
  atualizarSidebarAtiva(estado.categoria);
}

function atualizarSidebarAtiva(categoriaId) {
  sidebarEl.querySelectorAll('.loja-sidebar-item').forEach(btn => {
    const ativo = btn.dataset.categoria === categoriaId;
    btn.classList.toggle('loja-sidebar-item--ativo', ativo);
    btn.setAttribute('aria-current', ativo ? 'true' : 'false');
  });
}

// ── Filtros rápidos de raridade — montados uma vez ───────

function renderQuickFilters() {
  quickfiltersEl.innerHTML = '';

  const todas = document.createElement('button');
  todas.type = 'button';
  todas.className = 'loja-filter-pill';
  todas.dataset.raridade = '';
  todas.textContent = 'Todas as raridades';
  quickfiltersEl.appendChild(todas);

  RARIDADES.forEach(r => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'loja-filter-pill';
    pill.dataset.raridade = r;
    pill.style.setProperty('--accent', RARIDADE_INFO[r].cor);
    pill.textContent = RARIDADE_INFO[r].label;
    quickfiltersEl.appendChild(pill);
  });

  quickfiltersEl.addEventListener('click', (e) => {
    const pill = e.target.closest('.loja-filter-pill');
    if (!pill) return;
    estado.raridade = pill.dataset.raridade || null;
    atualizarQuickFiltersAtivo();
    renderizarGradeFiltrada();
  });

  atualizarQuickFiltersAtivo();
}

function atualizarQuickFiltersAtivo() {
  quickfiltersEl.querySelectorAll('.loja-filter-pill').forEach(pill => {
    const ativo = (pill.dataset.raridade || null) === estado.raridade;
    pill.classList.toggle('loja-filter-pill--ativo', ativo);
    pill.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  });
}

// ── Carteira — seletor de moeda ──────────────────────────
// Lunaris vem por padrão; outras moedas chegam por import de JSON, igual
// os itens (ver initImport, mais abaixo, e services/moedasService.js) —
// não tem campo de texto pra digitar uma moeda nova aqui. Trocar a ativa
// ou remover uma já cadastrada continua sendo ação direta no painel; nunca
// mexe em busca/raridade/rota — só atualiza rótulo, ícone e preços em tela.

let moedaPainelAberto = false;

function fecharMoedaPainel() {
  if (!moedaPainelAberto) return;
  moedaPainelAberto = false;
  const painel = moedaSeletorEl.querySelector('.loja-moeda-painel');
  const btn = moedaSeletorEl.querySelector('.loja-moeda-btn');
  if (painel) painel.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function abrirMoedaPainel() {
  if (moedaPainelAberto) return;
  moedaPainelAberto = true;
  const painel = moedaSeletorEl.querySelector('.loja-moeda-painel');
  const btn = moedaSeletorEl.querySelector('.loja-moeda-btn');
  if (painel) painel.hidden = false;
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function selecionarMoeda(id) {
  if (!definirMoedaAtiva(id)) return;
  fecharMoedaPainel();
  renderMoedaSeletor();
  // O modal (se algum estiver aberto) fica atrás do próprio backdrop, que
  // cobre a carteira inteira — não dá pra trocar de moeda sem fechá-lo
  // primeiro, então só a grade por trás precisa atualizar o preço em tela.
  renderizarGradeFiltrada();
}

function renderMoedaSeletor() {
  const moedaAtiva = getMoedaAtiva();
  const moedas = getMoedas();

  walletIconEl.textContent = moedaAtiva.simbolo;
  walletValorEl.textContent = moedaAtiva.saldo.toLocaleString('pt-BR');

  moedaSeletorEl.innerHTML = '';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'loja-moeda-btn';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', moedaPainelAberto ? 'true' : 'false');

  const nome = document.createElement('span');
  nome.className = 'loja-moeda-nome';
  nome.textContent = moedaAtiva.nome;

  const seta = document.createElement('span');
  seta.className = 'loja-moeda-seta';
  seta.setAttribute('aria-hidden', 'true');
  seta.textContent = '▾';

  btn.append(nome, seta);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (moedaPainelAberto) fecharMoedaPainel(); else abrirMoedaPainel();
  });

  const painel = document.createElement('div');
  painel.className = 'loja-moeda-painel';
  painel.hidden = !moedaPainelAberto;
  painel.setAttribute('role', 'menu');
  painel.setAttribute('aria-label', 'Escolher moeda');
  painel.addEventListener('click', (e) => e.stopPropagation());

  moedas.forEach(moeda => {
    const linha = document.createElement('div');
    linha.className = 'loja-moeda-opcao-linha';

    const opcao = document.createElement('button');
    opcao.type = 'button';
    opcao.className = 'loja-moeda-opcao';
    if (moeda.id === moedaAtiva.id) opcao.classList.add('loja-moeda-opcao--ativa');
    opcao.setAttribute('role', 'menuitemradio');
    opcao.setAttribute('aria-checked', moeda.id === moedaAtiva.id ? 'true' : 'false');

    const simbolo = document.createElement('span');
    simbolo.className = 'loja-moeda-opcao-simbolo';
    simbolo.setAttribute('aria-hidden', 'true');
    simbolo.textContent = moeda.simbolo;

    const nomeOpcao = document.createElement('span');
    nomeOpcao.textContent = moeda.nome;

    opcao.append(simbolo, nomeOpcao);
    opcao.addEventListener('click', () => selecionarMoeda(moeda.id));
    linha.appendChild(opcao);

    if (moedas.length > 1) {
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'loja-moeda-remover';
      remover.setAttribute('aria-label', `Remover moeda ${moeda.nome}`);
      remover.textContent = '×';
      remover.addEventListener('click', () => {
        if (removerMoeda(moeda.id)) { renderMoedaSeletor(); renderizarGradeFiltrada(); }
      });
      linha.appendChild(remover);
    }

    painel.appendChild(linha);
  });

  const dica = document.createElement('p');
  dica.className = 'loja-moeda-dica';
  dica.textContent = 'Novas moedas entram por "Importar conteúdo", no topo.';
  painel.appendChild(dica);

  moedaSeletorEl.append(btn, painel);
}

// ── Card de item ──────────────────────────────────────────

function atributosResumo(entrada) {
  const at = entrada.conteudo?.atributos;
  if (Array.isArray(at) && at.length) return at.slice(0, 2).join(' · ');
  if (typeof at === 'string' && at.trim()) return at.trim();
  const desc = entrada.conteudo?.descricao;
  return typeof desc === 'string' ? truncar(desc, 80) : '';
}

function criarPlaceholderGlyph(categoria) {
  const span = document.createElement('span');
  span.className = 'loja-item-card-placeholder';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = categoria.simbolo;
  return span;
}

function criarImagemBloco(entrada, categoria) {
  const bloco = document.createElement('div');
  bloco.className = 'loja-item-card-imagem';

  const imagem = entrada.conteudo?.imagem;
  if (typeof imagem === 'string' && imagem.trim()) {
    const img = document.createElement('img');
    img.src = imagem;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      bloco.classList.add('loja-item-card-imagem--vazia');
      bloco.appendChild(criarPlaceholderGlyph(categoria));
    }, { once: true });
    bloco.appendChild(img);
  } else {
    bloco.classList.add('loja-item-card-imagem--vazia');
    bloco.appendChild(criarPlaceholderGlyph(categoria));
  }
  return bloco;
}

// `conteudo.preco` aceita número (mesmo valor em qualquer moeda — o autor
// ainda não diferenciou) ou objeto { "NomeDaMoeda": valor, ... } pra um preço
// próprio por moeda (nomes casam sem acento/caixa, ver normalizarChave).
function precoParaMoeda(entrada, moeda) {
  const preco = entrada.conteudo?.preco;

  if (preco && typeof preco === 'object' && !Array.isArray(preco)) {
    const alvo = normalizarChave(moeda.nome);
    const chave = Object.keys(preco).find(k => normalizarChave(k) === alvo);
    return chave ? preco[chave] : null;
  }

  return typeof preco === 'number' ? preco : null;
}

function criarPrecoEl(entrada, comMoeda) {
  const moeda = getMoedaAtiva();

  const preco = document.createElement('span');
  preco.className = 'loja-preco';

  const icone = document.createElement('span');
  icone.className = 'loja-preco-icone';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = moeda.simbolo;
  preco.appendChild(icone);

  const texto = document.createElement('span');
  const valor = precoParaMoeda(entrada, moeda);
  if (typeof valor === 'number') {
    texto.textContent = comMoeda ? `${valor.toLocaleString('pt-BR')} ${moeda.nome}` : valor.toLocaleString('pt-BR');
  } else {
    texto.textContent = comMoeda ? 'Preço a definir' : '—';
  }
  preco.appendChild(texto);

  return preco;
}

function criarBotaoAcao(categoria, extraClasse) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = extraClasse ? `loja-acao-btn ${extraClasse}` : 'loja-acao-btn';
  btn.textContent = categoria.acao || 'Comprar';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.classList.remove('loja-acao-btn--pulso');
    void btn.offsetWidth;
    btn.classList.add('loja-acao-btn--pulso');
    mostrarToast('Em breve — as compras serão feitas com o Banqueiro, no Discord.', 'info');
  });
  return btn;
}

function criarSelos(entrada, categoria, { comCategoria }) {
  const raridade = RARIDADE_INFO[normalizarRaridade(entrada.conteudo?.raridade)];

  const selos = document.createElement('div');
  selos.className = 'loja-selos';

  const seloRaridade = document.createElement('span');
  seloRaridade.className = 'loja-selo loja-selo--raridade';
  seloRaridade.style.setProperty('--rarity', raridade.cor);
  seloRaridade.textContent = raridade.label;
  selos.appendChild(seloRaridade);

  if (entrada.conteudo?.nivel !== undefined && entrada.conteudo?.nivel !== null && entrada.conteudo?.nivel !== '') {
    const selo = document.createElement('span');
    selo.className = 'loja-selo';
    selo.textContent = `Nv. ${entrada.conteudo.nivel}`;
    selos.appendChild(selo);
  }

  if (typeof entrada.conteudo?.classe === 'string' && entrada.conteudo.classe.trim()) {
    const selo = document.createElement('span');
    selo.className = 'loja-selo';
    selo.textContent = entrada.conteudo.classe;
    selos.appendChild(selo);
  }

  if (comCategoria) {
    const selo = document.createElement('span');
    selo.className = 'loja-selo loja-selo--categoria';
    selo.title = categoria.titulo;
    selo.textContent = categoria.simbolo;
    selos.appendChild(selo);
  }

  return selos;
}

function criarItemCard(entrada, indice) {
  const categoria = categoriaPorTipo(entrada.tipo);
  if (!categoria) return document.createDocumentFragment();

  const raridadeChave = normalizarRaridade(entrada.conteudo?.raridade);

  // Não pode ser <button> — o rodapé tem um <button> de ação próprio, e
  // botão dentro de botão é HTML inválido (leitor de tela não expõe o
  // interno direito). role="button" + tabindex cobre teclado/a11y.
  const card = document.createElement('div');
  card.className = 'loja-item-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.style.setProperty('--rarity', RARIDADE_INFO[raridadeChave].cor);
  card.style.setProperty('--accent', categoria.accent);
  card.style.animationDelay = `${Math.min(indice, 12) * 45}ms`;
  card.setAttribute('aria-label', `Ver ${entrada.titulo}`);

  card.appendChild(criarImagemBloco(entrada, categoria));

  const corpo = document.createElement('div');
  corpo.className = 'loja-item-card-corpo';

  corpo.appendChild(criarSelos(entrada, categoria, { comCategoria: estado.categoria === TODOS_ID }));

  const titulo = document.createElement('span');
  titulo.className = 'loja-item-card-title';
  titulo.textContent = entrada.titulo;
  corpo.appendChild(titulo);

  const resumo = atributosResumo(entrada);
  if (resumo) {
    const desc = document.createElement('span');
    desc.className = 'loja-item-card-desc';
    desc.textContent = resumo;
    corpo.appendChild(desc);
  }

  const rodape = document.createElement('div');
  rodape.className = 'loja-item-card-rodape';
  rodape.appendChild(criarPrecoEl(entrada, false));
  rodape.appendChild(criarBotaoAcao(categoria));
  corpo.appendChild(rodape);

  card.appendChild(corpo);
  const abrir = () => router.navegar(`/${categoria.id}/${entrada.id}`);
  card.addEventListener('click', abrir);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
  });
  return card;
}

// ── Grade — cabeçalho de categoria (estável) + área filtrável ──

function renderEmptyGrade(categoria, semResultadoDeFiltro) {
  const vazio = document.createElement('div');
  vazio.className = 'loja-empty';
  vazio.style.setProperty('--accent', categoria.accent);

  if (semResultadoDeFiltro) {
    vazio.innerHTML = `
      <div class="loja-empty-ornament" aria-hidden="true">
        <span class="loja-empty-ornament-line"></span>
        <span class="loja-empty-ornament-rune">${categoria.simbolo}</span>
        <span class="loja-empty-ornament-line"></span>
      </div>
      <p class="loja-empty-text">Nada bate com esse filtro. Tente outra busca ou raridade.</p>
    `;
  } else {
    vazio.innerHTML = `
      <div class="loja-empty-ornament" aria-hidden="true">
        <span class="loja-empty-ornament-line"></span>
        <span class="loja-empty-ornament-rune">${categoria.simbolo}</span>
        <span class="loja-empty-ornament-line"></span>
      </div>
      <p class="loja-empty-text"></p>
      <button type="button" class="loja-cta-btn" data-action="importar">Importar conteúdo</button>
    `;
    vazio.querySelector('.loja-empty-text').textContent = categoria.vazio;
  }
  gridArea.appendChild(vazio);
}

function aplicarFiltros(entradas) {
  return entradas.filter(entrada => {
    if (estado.busca && !entrada.titulo.toLowerCase().includes(estado.busca)) return false;
    if (estado.raridade && normalizarRaridade(entrada.conteudo?.raridade) !== estado.raridade) return false;
    return true;
  });
}

// Só redesenha a grade (cards/estado vazio) — não mexe no cabeçalho da
// categoria nem reinicia a animação da página. Chamada a cada tecla da
// busca e a cada clique nas pills de raridade, então precisa ser leve.
function renderizarGradeFiltrada() {
  if (!gridArea) return;
  const categoria = categoriaOuTodos(estado.categoria);
  if (!categoria) return;

  gridArea.innerHTML = '';

  const todasDaCategoria = entradasDaVisao(categoria.id);
  if (todasDaCategoria.length === 0) { renderEmptyGrade(categoria, false); return; }

  const filtradas = aplicarFiltros(todasDaCategoria)
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

  if (filtradas.length === 0) { renderEmptyGrade(categoria, true); return; }

  const grid = document.createElement('div');
  grid.className = 'loja-item-grid';
  filtradas.forEach((entrada, i) => grid.appendChild(criarItemCard(entrada, i)));
  gridArea.appendChild(grid);
}

// Troca de categoria de verdade (sidebar/rota) — reconstrói o cabeçalho,
// reseta busca/raridade e reinicia a animação da página.
function montarGrade(categoriaId) {
  const categoria = categoriaOuTodos(categoriaId);
  if (!categoria) { router.navegar('/'); return; }

  // Chegar numa rota de grade (clique, mas também botão voltar/avançar do
  // navegador, ou edição manual do hash) significa que nenhum item deveria
  // estar em modal — fecha um modal esquecido de uma navegação anterior,
  // sem disparar outra navegação (já estamos indo pro lugar certo).
  fecharModal({ navegar: false });

  estado.categoria = categoria.id;
  estado.busca = '';
  estado.raridade = null;
  if (searchInput) searchInput.value = '';
  atualizarSidebarAtiva(categoria.id);
  atualizarQuickFiltersAtivo();

  resetarAnimacao();
  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'loja-cat-header';
  header.style.setProperty('--accent', categoria.accent);

  const h2 = document.createElement('h2');
  h2.className = 'loja-cat-title';
  const icone = document.createElement('span');
  icone.className = 'loja-cat-icon';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = categoria.simbolo;
  h2.append(icone, categoria.titulo);
  header.appendChild(h2);

  const desc = document.createElement('p');
  desc.className = 'loja-cat-desc';
  desc.textContent = categoria.descricao;
  header.appendChild(desc);

  content.appendChild(header);

  gridArea = document.createElement('div');
  gridArea.className = 'loja-grid-area';
  content.appendChild(gridArea);

  renderizarGradeFiltrada();
}

// ── Modal — detalhe de item, estilo carta ────────────────

function fecharModal({ navegar = true } = {}) {
  if (modalLayer.hidden) return;
  modalLayer.hidden = true;
  modalLayer.innerHTML = '';
  document.body.classList.remove('loja-modal-aberto');
  const trigger = modalTriggerEl;
  modalTriggerEl = null;
  if (trigger && trigger.isConnected) trigger.focus();

  if (navegar) {
    const rotaAlvo = estado.categoria === TODOS_ID ? '/' : `/${estado.categoria}`;
    if (router.atual() !== rotaAlvo) router.navegar(rotaAlvo);
  }
}

function abrirModalItem(catId, itemId) {
  const categoria = categoriaPorId(catId);
  const mapa = getEntradas();
  const entrada = mapa[itemId];
  if (!categoria || !entrada) { router.navegar(catId ? `/${catId}` : '/'); return; }

  modalTriggerEl = document.activeElement;

  modalLayer.innerHTML = '';
  modalLayer.hidden = false;
  document.body.classList.add('loja-modal-aberto');

  const backdrop = document.createElement('div');
  backdrop.className = 'loja-modal-backdrop';
  backdrop.addEventListener('click', () => fecharModal());

  const raridadeChave = normalizarRaridade(entrada.conteudo?.raridade);

  const modal = document.createElement('div');
  modal.className = 'loja-modal';
  modal.style.setProperty('--rarity', RARIDADE_INFO[raridadeChave].cor);
  modal.style.setProperty('--accent', categoria.accent);
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', entrada.titulo);
  modal.addEventListener('click', (e) => e.stopPropagation());

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'loja-modal-fechar';
  fechar.setAttribute('aria-label', 'Fechar');
  fechar.textContent = '×';
  fechar.addEventListener('click', () => fecharModal());
  modal.appendChild(fechar);

  const imagemBloco = criarImagemBloco(entrada, categoria);
  imagemBloco.classList.add('loja-modal-imagem');
  modal.appendChild(imagemBloco);

  const corpo = document.createElement('div');
  corpo.className = 'loja-modal-corpo';

  corpo.appendChild(criarSelos(entrada, categoria, { comCategoria: true }));

  const titulo = document.createElement('h2');
  titulo.className = 'loja-modal-title';
  titulo.textContent = entrada.titulo;
  corpo.appendChild(titulo);

  if (typeof entrada.conteudo?.descricao === 'string' && entrada.conteudo.descricao.trim()) {
    const p = document.createElement('p');
    p.className = 'loja-detail-descricao';
    p.textContent = entrada.conteudo.descricao;
    corpo.appendChild(p);
  }

  const CAMPOS_CURADOS = ['descricao', 'imagem', 'raridade', 'preco', 'atributos', 'nivel', 'classe'];
  const demaisCampos = { ...entrada.conteudo };
  CAMPOS_CURADOS.forEach(chave => delete demaisCampos[chave]);
  if (Object.keys(demaisCampos).length > 0) {
    corpo.appendChild(renderConteudo(demaisCampos, mapa));
  }

  const rodape = document.createElement('div');
  rodape.className = 'loja-modal-rodape';
  rodape.appendChild(criarPrecoEl(entrada, true));
  rodape.appendChild(criarBotaoAcao(categoria, 'loja-modal-acao'));
  corpo.appendChild(rodape);

  modal.appendChild(corpo);
  backdrop.appendChild(modal);
  modalLayer.appendChild(backdrop);

  fechar.focus();
}

// ── Import ───────────────────────────────────────────────
// Um botão só, dois conteúdos possíveis: itens (entradas) e moedas — ver
// candidataUnicaEhMoeda em moedasService.js. Um pacote pode trazer as duas
// chaves juntas ({"entradas":[...],"moedas":[...]}); um arquivo solto (sem
// nenhuma das duas chaves no topo) decide pelo formato do objeto.

function decidirImportadores(json) {
  const temChaveEntradas = Array.isArray(json?.entradas);
  const temChaveMoedas = Array.isArray(json?.moedas);
  if (temChaveEntradas || temChaveMoedas) return { entradas: temChaveEntradas, moedas: temChaveMoedas };

  const ehMoedaSolta = candidataUnicaEhMoeda(json);
  return { entradas: !ehMoedaSolta, moedas: ehMoedaSolta };
}

function initImport() {
  const btn   = document.getElementById('loja-import-btn');
  const input = document.getElementById('loja-import-input');

  function disparar() { input.click(); }

  btn.addEventListener('click', disparar);
  content.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="importar"]')) disparar();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const raw = await file.text();
    let json = null;
    try { json = JSON.parse(raw); } catch { /* processador de entradas relata o JSON malformado abaixo */ }

    const { entradas: rodarEntradas, moedas: rodarMoedas } = decidirImportadores(json);
    const resultadoMoedas   = rodarMoedas ? processarArquivoMoedas(raw) : null;
    const resultadoEntradas = rodarEntradas ? processarArquivo(raw) : null;

    const mensagem = [resultadoMoedas?.mensagem, resultadoEntradas?.mensagem].filter(Boolean).join(' ');
    const ok = Boolean(resultadoMoedas?.ok || resultadoEntradas?.ok);
    mostrarToast(mensagem, ok ? 'sucesso' : 'erro');
    input.value = '';

    // Atualiza só o que mudou (sem reanimar a página inteira, sem fechar
    // um modal aberto de outro item) — permanece onde o usuário está.
    if (resultadoMoedas?.ok) renderMoedaSeletor();
    if (resultadoEntradas?.ok) renderizarGradeFiltrada();
  });
}

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  renderQuickFilters();
  renderMoedaSeletor();

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      estado.busca = searchInput.value.trim().toLowerCase();
      renderizarGradeFiltrada();
    });
  }

  document.addEventListener('click', () => fecharMoedaPainel());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalLayer.hidden) fecharModal();
    if (e.key === 'Escape' && moedaPainelAberto) fecharMoedaPainel();
  });

  router.registrar('/', () => comTransicao(() => montarGrade(TODOS_ID)));
  CATEGORIAS.forEach(categoria => {
    router.registrar(`/${categoria.id}`, () => comTransicao(() => montarGrade(categoria.id)));
  });

  router.registrarFallback((path) => {
    const partes = path.split('/').filter(Boolean);
    if (partes.length === 2 && categoriaPorId(partes[0])) {
      const [catId, itemId] = partes;
      // Grade já renderizada (navegação normal dentro do app) — mantém o
      // pano de fundo como está (pode ser "Todos", pode ser outra
      // categoria) e só abre o modal por cima. Só remonta a grade quando
      // não há nada renderizado ainda (link direto/reload).
      if (content.children.length === 0) montarGrade(catId);
      abrirModalItem(catId, itemId);
      return;
    }
    router.navegar('/');
  });

  const titulo = document.querySelector('.loja-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/'));

  initImport();
  router.iniciar();
});
