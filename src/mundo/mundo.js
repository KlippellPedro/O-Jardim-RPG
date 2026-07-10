/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Mundo
   Tela navegável por categoria + import de conteúdo.
   ───────────────────────────────────────────────────────── */

import { router } from '../core/router.js';
import { CATEGORIAS, categoriaPorTipo } from './categorias.js';
import { getEntradas, entradasPorCategoria, processarArquivo } from './mundoImport.js';

const content = document.getElementById('mundo-content');
const toast   = document.getElementById('mundo-toast');
let toastTimer = null;

// ── Atmosfera de fundo — galhos cósmicos nos cantos ──────

function initAtmosphere() {
  const canvas = document.getElementById('mundo-tree-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const PALETA = [
    '201,162,39',   // ouro — Aethel
    '124,69,204',   // arkania — Erebus
    '210,195,168',  // lua — Ousias
  ];

  let W, H, segments = [], rafId = null, pulseStart = null;

  function grow(x, y, angle, len, depth, maxDepth, paletaIdx) {
    if (depth > maxDepth || len < 5) return;
    const wobble = (Math.random() - 0.5) * 0.30;
    const ex = x + Math.cos(angle + wobble) * len;
    const ey = y + Math.sin(angle + wobble) * len;
    const alpha = Math.max(0.007, 0.085 - depth * 0.014);
    const width  = Math.max(0.2,  0.75  - depth * 0.13);
    segments.push({ x1: x, y1: y, x2: ex, y2: ey, alpha, width, depth, paletaIdx });
    const spread  = 0.28 + Math.random() * 0.22;
    const nextLen = len * 0.68;
    grow(ex, ey, angle - spread, nextLen, depth + 1, maxDepth, paletaIdx);
    grow(ex, ey, angle + spread, nextLen, depth + 1, maxDepth, paletaIdx);
  }

  function build() {
    segments = [];
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    grow(W * 0.02, H, -Math.PI * 0.42, H * 0.44, 0, 4, 0);
    grow(W * 0.98, H, -Math.PI * 0.58, H * 0.44, 0, 4, 1);
    segments.sort((a, b) => a.depth - b.depth);
    if (rafId) cancelAnimationFrame(rafId);
    pulseStart = null;
    rafId = requestAnimationFrame(pulse);
  }

  function pulse(now) {
    if (!pulseStart) pulseStart = now;
    const p = 0.78 + 0.22 * Math.sin(((now - pulseStart) / 8000) * Math.PI * 2);
    ctx.clearRect(0, 0, W, H);
    for (const seg of segments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = `rgba(${PALETA[seg.paletaIdx % PALETA.length]},${(seg.alpha * p).toFixed(3)})`;
      ctx.lineWidth = seg.width;
      ctx.lineCap  = 'round';
      ctx.stroke();
    }
    rafId = requestAnimationFrame(pulse);
  }

  build();
  window.addEventListener('resize', build);
}

// ── Toast de feedback ────────────────────────────────────

function mostrarToast(mensagem, tipo) {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

// ── Utilitários ──────────────────────────────────────────

function humanizarChave(chave) {
  const MAPA = {
    terminologia: 'Terminologia',
    regra_racial: 'Regra racial',
    historico:    'Histórico',
    observacoes:  'Observações',
    nota:         'Nota',
  };
  if (MAPA[chave]) return MAPA[chave];
  const texto = chave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Caminho "canônico" de uma entrada. Árvores e tudo que pertence à cascata
// delas (Galho, Dimensão, Local) usam o esquema achatado
// /deidades/{arvoreId}/{id} — não existe mais navegação por categoria
// separada (as abas saíram). As demais categorias (Personagens, Eventos,
// Idiomas, Cosmologia) continuam no esquema antigo /{catId}/{id}.
function caminhoDaEntrada(entrada) {
  const cat = categoriaPorTipo(entrada.tipo);
  if (!cat) return null;

  if (entrada.tipo === 'deidade') {
    return `/deidades/${entrada.id}`;
  }

  const mapa = getEntradas();

  if (entrada.tipo === 'galho' || entrada.tipo === 'realidade') {
    const arvoreId = entrada.conteudo?.arvore;
    if (arvoreId) return `/deidades/${arvoreId}/${entrada.id}`;
  }

  if (entrada.tipo === 'dimensao') {
    const galho = entrada.conteudo?.galho ? mapa[entrada.conteudo.galho] : null;
    const arvoreId = galho?.conteudo?.arvore;
    if (arvoreId) return `/deidades/${arvoreId}/${entrada.id}`;
  }

  if (entrada.tipo === 'reino' || entrada.tipo === 'mundo') {
    const dimensao = entrada.conteudo?.dimensao ? mapa[entrada.conteudo.dimensao] : null;
    const galho = dimensao?.conteudo?.galho ? mapa[dimensao.conteudo.galho] : null;
    const arvoreId = galho?.conteudo?.arvore;
    if (arvoreId) return `/deidades/${arvoreId}/${entrada.id}`;
  }

  return `/${cat.id}/${entrada.id}`;
}

function irParaEntrada(id) {
  const entrada = getEntradas()[id];
  if (!entrada) return;
  const caminho = caminhoDaEntrada(entrada);
  if (caminho) router.navegar(caminho);
}

// ── Temas por Fluxo — identidade visual de deidades/fluxos ──

const FLUXO_TEMAS = {
  'fluxo-do-sangue':     { cor: 'var(--blood)', simbolo: '✥' },
  'fluxo-da-tecnologia': { cor: 'var(--neon)',  simbolo: '⬡' },
};
const TEMA_PADRAO = { cor: 'var(--gold)', simbolo: '✦' };

function temaDeEntrada(entrada) {
  const fluxoKey = entrada.conteudo?.fluxo || (entrada.tipo === 'fluxo' ? entrada.id : null);
  if (fluxoKey && FLUXO_TEMAS[fluxoKey]) return FLUXO_TEMAS[fluxoKey];
  if (typeof entrada.conteudo?.cor === 'string' && entrada.conteudo.cor.trim()) {
    return { cor: entrada.conteudo.cor, simbolo: TEMA_PADRAO.simbolo };
  }
  return TEMA_PADRAO;
}

function humanizarSlug(slug) {
  const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos']);
  return slug
    .split('-')
    .map((palavra, i) => (i > 0 && PREPOSICOES.has(palavra) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1)))
    .join(' ');
}

// Acha entradas de outras categorias que referenciam o id informado —
// direta ou transitivamente (ex.: Dimensão → Galho → Deidade).
function encontrarReferencias(idAlvo, tiposAlvo) {
  const mapa = getEntradas();
  const todas = Object.values(mapa).filter(e => tiposAlvo.includes(e.tipo));

  const diretas = todas.filter(e => Object.values(e.conteudo).some(v => v === idAlvo));
  const idsDiretas = new Set(diretas.map(e => e.id));

  const indiretas = todas.filter(e =>
    !idsDiretas.has(e.id) && Object.values(e.conteudo).some(v => idsDiretas.has(v))
  );

  return [...diretas, ...indiretas];
}

// ── Render genérico de campos + cross-links ───────────────
// Mantido para categorias que ainda usam a lista de cards genérica.

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
    btn.className = 'entry-link';
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
  dl.className = 'entry-fields';
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

// ── Helpers de layout compartilhados ─────────────────────

function resetarAnimacao() {
  content.style.animation = 'none';
  void content.offsetHeight;
  content.style.animation = '';
}

function renderCatHeader(cat) {
  const header = document.createElement('div');
  header.className = 'mundo-cat-header';

  const h2 = document.createElement('h2');
  h2.className = 'mundo-cat-title';
  h2.textContent = cat.titulo;

  const desc = document.createElement('p');
  desc.className = 'mundo-cat-desc';
  desc.textContent = cat.descricao;

  header.append(h2, desc);
  content.appendChild(header);
}

function renderVazio(cat) {
  const vazio = document.createElement('div');
  vazio.className = 'mundo-empty';
  vazio.innerHTML = `
    <div class="mundo-empty-ornament" aria-hidden="true">
      <span class="mundo-empty-ornament-line"></span>
      <span class="mundo-empty-ornament-rune">✦</span>
      <span class="mundo-empty-ornament-line"></span>
    </div>
    <p class="mundo-empty-text"></p>
    <button type="button" class="mundo-cta-btn" data-action="importar">Importar conteúdo</button>
  `;
  vazio.querySelector('.mundo-empty-text').textContent = cat.vazio;
  content.appendChild(vazio);
}

// ── Lista genérica de entradas (categorias sem renderer próprio) ──

function renderListaGenerica(cat, entradas) {
  const mapaCompleto = getEntradas();
  const lista = document.createElement('div');
  lista.className = 'mundo-entry-list';

  entradas
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(entrada => {
      const card = document.createElement('article');
      card.className = 'mundo-entry';
      card.dataset.entryId = entrada.id;

      const h3 = document.createElement('h3');
      h3.className = 'mundo-entry-title';
      h3.textContent = entrada.titulo;
      card.appendChild(h3);
      card.appendChild(renderConteudo(entrada.conteudo, mapaCompleto));

      lista.appendChild(card);
    });

  content.appendChild(lista);
}

// ── Cosmologia — índice ───────────────────────────────────

function criarTile(entrada) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'entry-tile';

  const titulo = document.createElement('span');
  titulo.className = 'entry-tile-title';
  titulo.textContent = entrada.titulo;
  btn.appendChild(titulo);

  const descTexto = typeof entrada.conteudo?.descricao === 'string'
    ? entrada.conteudo.descricao
    : '';

  if (descTexto) {
    const desc = document.createElement('span');
    desc.className = 'entry-tile-desc';
    desc.textContent = descTexto;
    btn.appendChild(desc);
  }

  btn.addEventListener('click', () => {
    const cat = categoriaPorTipo(entrada.tipo);
    if (cat) router.navegar(`/${cat.id}/${entrada.id}`);
  });

  return btn;
}

function renderDiagramaHierarquia(entrada) {
  const niveis = Array.isArray(entrada.conteudo?.ordem) ? entrada.conteudo.ordem : [];
  if (niveis.length === 0) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'cosmo-diagram';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Hierarquia do Jardim — clique para ver detalhes');

  niveis.forEach((nivel, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cosmo-node';
    btn.dataset.nivel = i;
    btn.textContent = nivel;
    btn.addEventListener('click', () => {
      const cat = categoriaPorTipo(entrada.tipo);
      if (cat) router.navegar(`/${cat.id}/${entrada.id}`);
    });
    wrapper.appendChild(btn);

    if (i < niveis.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'cosmo-connector';
      connector.setAttribute('aria-hidden', 'true');
      wrapper.appendChild(connector);
    }
  });

  content.appendChild(wrapper);
}

function renderCosmologiaIndex(cat, entradas) {
  const hierarquia = entradas.find(e => e.id === 'hierarquia-do-jardim');
  const resto = entradas
    .filter(e => e.id !== 'hierarquia-do-jardim')
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

  if (hierarquia) {
    renderDiagramaHierarquia(hierarquia);
  }

  if (resto.length > 0) {
    const tilesWrapper = document.createElement('div');
    tilesWrapper.className = 'entry-tiles';
    resto.forEach(entrada => tilesWrapper.appendChild(criarTile(entrada)));
    content.appendChild(tilesWrapper);
  }
}

// ── Deidades e Fluxos — índice em galeria de cards ───────

function criarCardDeidade(entrada) {
  const tema = temaDeEntrada(entrada);

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'deidade-card';
  card.style.setProperty('--accent', tema.cor);

  const simbolo = document.createElement('span');
  simbolo.className = 'deidade-card-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = tema.simbolo;
  card.appendChild(simbolo);

  const titulo = document.createElement('span');
  titulo.className = 'deidade-card-titulo';
  titulo.textContent = entrada.titulo;
  card.appendChild(titulo);

  const fluxoKey = entrada.conteudo?.fluxo;
  if (fluxoKey) {
    const fluxo = document.createElement('span');
    fluxo.className = 'deidade-card-fluxo';
    fluxo.textContent = humanizarSlug(fluxoKey);
    card.appendChild(fluxo);
  }

  card.addEventListener('click', () => {
    const cat = categoriaPorTipo(entrada.tipo);
    if (cat) router.navegar(`/${cat.id}/${entrada.id}`);
  });

  return card;
}

function renderDeidadesIndex(cat, entradas) {
  const grid = document.createElement('div');
  grid.className = 'deidade-grid';

  entradas
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(entrada => grid.appendChild(criarCardDeidade(entrada)));

  content.appendChild(grid);
}

// ── Galhos e Dimensões — índice agrupado por Árvore-mãe ──

function criarGrupoArvore(arvore, arvoreId, galhos) {
  const tema = arvore ? temaDeEntrada(arvore) : TEMA_PADRAO;
  const titulo = arvore ? arvore.titulo : humanizarSlug(arvoreId);
  const mapa = getEntradas();

  const grupo = document.createElement('section');
  grupo.className = 'galho-grupo';

  const header = document.createElement('div');
  header.className = 'galho-grupo-header';
  header.style.setProperty('--accent', tema.cor);

  const simbolo = document.createElement('span');
  simbolo.className = 'galho-grupo-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = tema.simbolo;

  const h3 = document.createElement('h3');
  h3.className = 'galho-grupo-titulo';
  h3.textContent = titulo;

  header.append(simbolo, h3);
  grupo.appendChild(header);

  const lista = document.createElement('div');
  lista.className = 'galho-lista';

  galhos
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(galho => {
      const item = document.createElement('div');
      item.className = 'galho-item';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'galho-item-link';
      btn.textContent = galho.titulo;
      btn.addEventListener('click', () => {
        const cat = categoriaPorTipo(galho.tipo);
        if (cat) router.navegar(`/${cat.id}/${galho.id}`);
      });
      item.appendChild(btn);

      const dimensoes = Object.values(mapa).filter(e => e.tipo === 'dimensao' && e.conteudo?.galho === galho.id);
      if (dimensoes.length > 0) {
        const subLista = document.createElement('div');
        subLista.className = 'dimensao-sublista';
        dimensoes
          .slice()
          .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
          .forEach(dim => {
            const subBtn = document.createElement('button');
            subBtn.type = 'button';
            subBtn.className = 'dimensao-sublista-link';
            subBtn.textContent = dim.titulo;
            subBtn.addEventListener('click', () => {
              const cat = categoriaPorTipo(dim.tipo);
              if (cat) router.navegar(`/${cat.id}/${dim.id}`);
            });
            subLista.appendChild(subBtn);
          });
        item.appendChild(subLista);
      }

      lista.appendChild(item);
    });

  grupo.appendChild(lista);
  return grupo;
}

function criarGrupoDimensoesOrfas(dimensoes) {
  const grupo = document.createElement('section');
  grupo.className = 'galho-grupo';

  const header = document.createElement('div');
  header.className = 'galho-grupo-header';
  header.style.setProperty('--accent', TEMA_PADRAO.cor);

  const simbolo = document.createElement('span');
  simbolo.className = 'galho-grupo-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = TEMA_PADRAO.simbolo;

  const h3 = document.createElement('h3');
  h3.className = 'galho-grupo-titulo';
  h3.textContent = 'Outras Dimensões';

  header.append(simbolo, h3);
  grupo.appendChild(header);

  const subLista = document.createElement('div');
  subLista.className = 'dimensao-sublista dimensao-sublista--solta';
  dimensoes
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(dim => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dimensao-sublista-link';
      btn.textContent = dim.titulo;
      btn.addEventListener('click', () => {
        const cat = categoriaPorTipo(dim.tipo);
        if (cat) router.navegar(`/${cat.id}/${dim.id}`);
      });
      subLista.appendChild(btn);
    });
  grupo.appendChild(subLista);
  return grupo;
}

function renderGalhosIndex(cat, entradas) {
  const mapaCompleto = getEntradas();
  const galhos = entradas.filter(e => e.tipo === 'galho' || e.tipo === 'realidade');
  const dimensoes = entradas.filter(e => e.tipo === 'dimensao');

  // Agrupa Galhos pela Árvore-mãe — grupos só existem se houver ao menos 1 Galho.
  const porArvore = new Map();
  galhos.forEach(g => {
    const arvoreId = g.conteudo?.arvore || null;
    if (!porArvore.has(arvoreId)) porArvore.set(arvoreId, []);
    porArvore.get(arvoreId).push(g);
  });

  Array.from(porArvore.entries())
    .map(([arvoreId, galhosDoGrupo]) => ({
      arvore: arvoreId ? mapaCompleto[arvoreId] : null,
      arvoreId,
      titulo: arvoreId && mapaCompleto[arvoreId] ? mapaCompleto[arvoreId].titulo : humanizarSlug(arvoreId || 'arvore-nao-identificada'),
      galhos: galhosDoGrupo,
    }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(grupo => {
      content.appendChild(criarGrupoArvore(grupo.arvore, grupo.arvoreId, grupo.galhos));
    });

  // Dimensões cujo Galho ainda não foi importado — não ficam escondidas
  const idsGalhosConhecidos = new Set(galhos.map(g => g.id));
  const orfas = dimensoes.filter(d => !idsGalhosConhecidos.has(d.conteudo?.galho));
  if (orfas.length > 0) {
    content.appendChild(criarGrupoDimensoesOrfas(orfas));
  }
}

// ── Árvores — tela de entrada com círculos flutuantes ────
// Protótipo: cada círculo é uma Árvore do Jardim. Aethel vem sempre
// descoberta; as demais só aparecem nomeadas se a deidade já tiver
// sido importada (mesmo critério de "descoberta" usado no resto do Mundo).

const ARVORES = [
  { id: 'aethel',         titulo: 'Aethel',         rgb: '201,162,39'  },
  { id: 'ousias',         titulo: 'Ousias',         rgb: '210,195,168' },
  { id: 'keryx',          titulo: 'Keryx',          rgb: '74,158,187'  },
  { id: 'haemus',         titulo: 'Haemus',         rgb: '120,185,130' },
  { id: 'ignis',          titulo: 'Ignis',          rgb: '200,100,60'  },
  { id: 'moros',          titulo: 'Moros',          rgb: '140,158,174' },
  { id: 'aperion',        titulo: 'Aperion',        rgb: '85,170,204'  },
  { id: 'chronus',        titulo: 'Chronus',        rgb: '190,160,60'  },
  { id: 'erebus',         titulo: 'Erebus',         rgb: '100,68,136'  },
  { id: 'mulher-carmesim', titulo: 'Mulher Carmesim', rgb: '139,26,42' },
];

function corDaArvore(arvoreId) {
  return ARVORES.find(a => a.id === arvoreId)?.rgb || '160,160,170';
}

let clustersAtivos = [];
let zoomCirculoEmAndamento = false;

// Para todo cluster de círculos ativo (tela de Árvores + qualquer cluster
// aninhado em páginas de Galho/Dimensão).
function pararAnimacoesCirculos() {
  clustersAtivos.forEach(parar => parar());
  clustersAtivos = [];
  zoomCirculoEmAndamento = false;
}

// Desenha um galho fino em miniatura dentro do círculo — mesma lógica
// recursiva da árvore cósmica da home, só que em escala de ícone.
function desenharGalhoMini(canvas, rgb, intensidade) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  function ramo(x, y, angle, len, depth, maxDepth) {
    if (depth > maxDepth || len < 3) return;
    const wobble = (Math.random() - 0.5) * 0.5;
    const ex = x + Math.cos(angle + wobble) * len;
    const ey = y + Math.sin(angle + wobble) * len;
    const alpha = Math.max(0.12, intensidade - depth * 0.16);
    const largura = Math.max(0.5, 2.4 - depth * 0.45);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `rgba(${rgb},${alpha.toFixed(2)})`;
    ctx.lineWidth = largura;
    ctx.lineCap = 'round';
    ctx.stroke();

    const spread = 0.35 + Math.random() * 0.3;
    ramo(ex, ey, angle - spread, len * 0.68, depth + 1, maxDepth);
    ramo(ex, ey, angle + spread, len * 0.68, depth + 1, maxDepth);
  }

  ramo(W / 2, H * 0.9, -Math.PI / 2, H * 0.32, 0, 3);
}

// Portal de entrada — um disco de cor pura (sem chrome de botão) que
// cresce a partir da posição exata do círculo clicado até cobrir a tela,
// simulando entrar NELE em vez de o próprio card inflar.
function abrirPortalArvore(circuloEl, rgb, aoCobrir) {
  const rect = circuloEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const diametroInicial = rect.width;
  const diagonalTela = Math.hypot(window.innerWidth, window.innerHeight);
  const escala = (diagonalTela * 1.15) / diametroInicial;

  const portal = document.createElement('div');
  portal.className = 'arvore-portal';
  portal.style.left   = `${cx}px`;
  portal.style.top    = `${cy}px`;
  portal.style.width  = `${diametroInicial}px`;
  portal.style.height = `${diametroInicial}px`;
  portal.style.background = `radial-gradient(circle, rgba(${rgb},1) 0%, rgba(${rgb},0.92) 65%, rgba(${rgb},0.75) 100%)`;
  document.body.appendChild(portal);

  void portal.offsetWidth;
  portal.style.setProperty('--portal-escala', escala.toFixed(2));
  portal.classList.add('arvore-portal--crescendo');

  setTimeout(() => {
    aoCobrir();
    setTimeout(() => {
      portal.classList.add('arvore-portal--revelando');
      setTimeout(() => portal.remove(), 400);
    }, 120);
  }, 600);
}

// Cluster reutilizável de círculos flutuantes — usado na tela de entrada
// (Árvores) e em qualquer nível aninhado da cascata (Galhos, Dimensões,
// Locais). `itens`: [{ id, titulo, rgb, catId, bloqueada? }]. `resolverDestino`
// recebe o item clicado e devolve o path pra navegar. Retorna uma função
// de limpeza que para o loop de movimento desse cluster específico.
function montarClusterCirculos(host, itens, resolverDestino, opts = {}) {
  const { stageClass = 'arvore-cluster-stage' } = opts;

  const stage = document.createElement('div');
  stage.className = stageClass;
  host.appendChild(stage);

  const circulos = itens.map(item => {
    const bloqueada = !!item.bloqueada;

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'arvore-circulo';
    if (bloqueada) el.classList.add('arvore-circulo--bloqueada');
    else el.style.setProperty('--accent', `rgb(${item.rgb})`);
    el.setAttribute('aria-label', bloqueada ? 'Ainda não descoberta' : item.titulo);

    const canvas = document.createElement('canvas');
    canvas.className = 'arvore-circulo-canvas';
    canvas.width = 108;
    canvas.height = 108;
    el.appendChild(canvas);

    const label = document.createElement('span');
    label.className = 'arvore-circulo-label';
    label.textContent = bloqueada ? '??' : item.titulo;
    el.appendChild(label);

    stage.appendChild(el);
    desenharGalhoMini(canvas, bloqueada ? '90,94,122' : item.rgb, bloqueada ? 0.35 : 0.9);

    const c = {
      el,
      item,
      x: 12 + Math.random() * 76,
      y: 18 + Math.random() * 64,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      pausado: false,
      saindo: false,
    };
    el.style.left = `${c.x}%`;
    el.style.top  = `${c.y}%`;
    return c;
  });

  circulos.forEach(c => {
    c.el.addEventListener('mouseenter', () => { c.pausado = true; c.el.style.zIndex = '5'; });
    c.el.addEventListener('mouseleave', () => { c.pausado = false; c.el.style.zIndex = ''; });
    c.el.addEventListener('click', () => {
      if (zoomCirculoEmAndamento) return;

      if (c.item.bloqueada) {
        c.el.classList.remove('arvore-circulo--negada');
        void c.el.offsetWidth;
        c.el.classList.add('arvore-circulo--negada');
        mostrarToast('Ainda não descoberta.', 'erro');
        return;
      }

      zoomCirculoEmAndamento = true;
      c.saindo = true;
      circulos.forEach(outro => outro.el.classList.add('arvore-circulo--esmaecendo'));

      abrirPortalArvore(c.el, c.item.rgb, () => {
        pararAnimacoesCirculos();
        router.navegar(resolverDestino(c.item));
      });
    });
  });

  // Distância mínima entre centros (% do stage) — evita que dois círculos
  // se sobreponham a ponto de um "roubar" o clique do outro por baixo.
  const SEPARACAO_MINIMA = 16;

  let rafId = null;
  function passo() {
    circulos.forEach(c => {
      if (c.pausado || c.saindo) return;
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < 6 || c.x > 94) { c.vx *= -1; c.x = Math.min(94, Math.max(6, c.x)); }
      if (c.y < 6 || c.y > 94) { c.vy *= -1; c.y = Math.min(94, Math.max(6, c.y)); }
    });

    // Repulsão par a par — afasta círculos que ficaram grudados demais
    for (let i = 0; i < circulos.length; i++) {
      for (let j = i + 1; j < circulos.length; j++) {
        const a = circulos[i], b = circulos[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist >= SEPARACAO_MINIMA) continue;
        const empurra = (SEPARACAO_MINIMA - dist) / 2;
        const nx = dx / dist, ny = dy / dist;
        if (!a.pausado && !a.saindo) { a.x -= nx * empurra; a.y -= ny * empurra; }
        if (!b.pausado && !b.saindo) { b.x += nx * empurra; b.y += ny * empurra; }
      }
    }

    circulos.forEach(c => {
      c.x = Math.min(94, Math.max(6, c.x));
      c.y = Math.min(94, Math.max(6, c.y));
      c.el.style.left = `${c.x}%`;
      c.el.style.top  = `${c.y}%`;
    });

    rafId = requestAnimationFrame(passo);
  }
  rafId = requestAnimationFrame(passo);

  return () => { if (rafId) cancelAnimationFrame(rafId); };
}

function renderArvoresScreen() {
  pararAnimacoesCirculos();
  resetarAnimacao();
  content.innerHTML = '';

  const mapa = getEntradas();
  const itens = ARVORES.map(arvore => ({
    id: arvore.id,
    titulo: arvore.titulo,
    rgb: arvore.rgb,
    catId: 'deidades',
    bloqueada: !(arvore.id === 'aethel' || mapa[arvore.id]?.tipo === 'deidade'),
  }));

  const parar = montarClusterCirculos(
    content,
    itens,
    item => `/${item.catId}/${item.id}`,
    { stageClass: 'arvores-stage' }
  );
  clustersAtivos.push(parar);
}

// ── Página de detalhe de entrada ─────────────────────────

function renderSecao(titulo, items) {
  const section = document.createElement('section');
  section.className = 'entry-detail-section';

  const h3 = document.createElement('h3');
  h3.className = 'entry-detail-section-title';
  h3.textContent = titulo;
  section.appendChild(h3);

  if (Array.isArray(items)) {
    const ul = document.createElement('ul');
    ul.className = 'entry-detail-list';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = String(item);
      ul.appendChild(li);
    });
    section.appendChild(ul);
  } else {
    const p = document.createElement('p');
    p.className = 'entry-detail-prose';
    p.textContent = String(items);
    section.appendChild(p);
  }

  return section;
}

function renderProsa(conteudo, ignorar = []) {
  const article = document.createElement('article');
  article.className = 'entry-detail';

  // Sequência horizontal de camadas (campo `ordem`)
  if (Array.isArray(conteudo.ordem) && conteudo.ordem.length > 0) {
    const ordemEl = document.createElement('div');
    ordemEl.className = 'cosmo-ordem';
    ordemEl.setAttribute('aria-label', 'Sequência da hierarquia');
    conteudo.ordem.forEach((nivel, i) => {
      const item = document.createElement('span');
      item.className = 'cosmo-ordem-item';
      item.textContent = nivel;
      ordemEl.appendChild(item);
      if (i < conteudo.ordem.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'cosmo-ordem-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '›';
        ordemEl.appendChild(sep);
      }
    });
    article.appendChild(ordemEl);
  }

  // Descrição principal como prosa
  if (conteudo.descricao) {
    const p = document.createElement('p');
    p.className = 'entry-detail-prose';
    p.textContent = conteudo.descricao;
    article.appendChild(p);
  }

  // Campos exemplo_N agrupados numa seção "Exemplos"
  const exemplos = Object.entries(conteudo)
    .filter(([k]) => /^exemplo_\d+$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  if (exemplos.length > 0) {
    article.appendChild(renderSecao('Exemplos', exemplos));
  }

  // Campos restantes — cada um vira uma seção com título humanizado
  const jaUsados = new Set([
    'descricao',
    'ordem',
    ...ignorar,
    ...Object.keys(conteudo).filter(k => /^exemplo_\d+$/.test(k)),
  ]);

  Object.entries(conteudo).forEach(([k, v]) => {
    if (jaUsados.has(k) || v === null || v === undefined || v === '') return;
    const valor = Array.isArray(v) ? v : String(v);
    article.appendChild(renderSecao(humanizarChave(k), valor));
  });

  return article;
}

// Seção de links cruzados reutilizável (ex.: "Presença no Jardim", "Dimensões", "Contexto")
function criarSecaoLinks(titulo, itens) {
  const section = document.createElement('section');
  section.className = 'entry-detail-section';

  const h3 = document.createElement('h3');
  h3.className = 'entry-detail-section-title';
  h3.textContent = titulo;
  section.appendChild(h3);

  const ul = document.createElement('ul');
  ul.className = 'entry-detail-list entry-detail-list--links';
  itens.forEach(item => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'entry-link';
    btn.textContent = item.titulo;
    btn.addEventListener('click', item.aoClicar);
    li.appendChild(btn);
    ul.appendChild(li);
  });
  section.appendChild(ul);
  return section;
}

// Título de seção "solto" (fora do <article>) — usado pra separar
// visualmente blocos como "Galhos desta Árvore".
function criarTituloSecao(texto) {
  const h3 = document.createElement('h3');
  h3.className = 'entry-detail-section-title';
  h3.textContent = texto;
  return h3;
}

function criarProsaVazia(texto) {
  const p = document.createElement('p');
  p.className = 'entry-detail-prose entry-detail-prose--vazio';
  p.textContent = texto;
  return p;
}

function criarProsaTexto(texto) {
  const p = document.createElement('p');
  p.className = 'entry-detail-prose';
  p.textContent = texto;
  return p;
}

function truncar(texto, tamanho) {
  const t = String(texto || '').trim();
  return t.length > tamanho ? `${t.slice(0, tamanho).trim()}…` : t;
}

// Card clicável e compacto — usado pelos 3 "resuminhos" da página raiz de
// uma Árvore (Árvore / Deidade / Fluxo). Cada um leva pra sua própria
// página dedicada (rota /deidades/{arvoreId}/{faceta}), onde o conteúdo
// completo vive.
function criarCardCategoria(titulo, resumo, corCss, aoClicar) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'arvore-categoria-card';
  card.style.setProperty('--accent', corCss);
  card.addEventListener('click', aoClicar);

  const h3 = document.createElement('h3');
  h3.className = 'arvore-categoria-card-titulo';
  h3.textContent = titulo;
  card.appendChild(h3);

  const p = document.createElement('p');
  p.className = 'arvore-categoria-card-resumo';
  p.textContent = resumo;
  card.appendChild(p);

  return card;
}

// Decorador de detalhe — Deidades e Fluxos: agora é a página raiz da
// cascata Árvore → Galhos → Dimensões → Locais. As 3 categorias principais
// (Árvore / Deidade / Fluxo) aparecem como cards clicáveis, cada um levando
// pra uma página própria — o conteúdo completo mora lá, não aqui. Sempre na
// cor fixa da Árvore (não a cor de fluxo genérica), mesmo quando a deidade
// em si ainda não foi importada (`entrada._semDados`).
function decorarDetalheDeidade(entrada, { headerWrap, h2, article }) {
  const mapa = getEntradas();
  const corArvore = corDaArvore(entrada.id);
  const corArvoreCss = `rgb(${corArvore})`;

  const simbolo = document.createElement('span');
  simbolo.className = 'entry-detail-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.style.setProperty('--accent', corArvoreCss);
  simbolo.textContent = temaDeEntrada(entrada).simbolo;
  h2.prepend(simbolo);

  const fluxoKey = entrada.conteudo?.fluxo;
  if (fluxoKey) {
    const subtitulo = document.createElement('p');
    subtitulo.className = 'entry-detail-subtitulo';
    subtitulo.style.setProperty('--accent', corArvoreCss);
    subtitulo.textContent = humanizarSlug(fluxoKey);
    headerWrap.appendChild(subtitulo);
  }

  // A prosa genérica (Epíteto/Descrição/Status) já renderizada em `article`
  // não é mais mostrada aqui — ela mora na página dedicada da Deidade.
  article.innerHTML = '';

  const grade = document.createElement('div');
  grade.className = 'arvore-tres-categorias';

  grade.appendChild(criarCardCategoria(
    'Árvore',
    `${entrada.titulo} é uma das Árvores do Jardim.`,
    corArvoreCss,
    () => router.navegar(`/deidades/${entrada.id}/arvore`)
  ));

  const resumoDeidade = entrada._semDados
    ? 'Nada foi descoberto ainda.'
    : truncar(entrada.conteudo?.descricao, 90) || 'Ver detalhes.';
  grade.appendChild(criarCardCategoria(
    'Deidade', resumoDeidade, corArvoreCss,
    () => router.navegar(`/deidades/${entrada.id}/deidade`)
  ));

  const fluxoEntrada = fluxoKey ? mapa[fluxoKey] : null;
  const resumoFluxo = fluxoEntrada
    ? (truncar(fluxoEntrada.conteudo?.descricao, 90) || 'Ver detalhes.')
    : 'Nada foi descoberto ainda.';
  grade.appendChild(criarCardCategoria(
    'Fluxo', resumoFluxo, corArvoreCss,
    () => router.navegar(`/deidades/${entrada.id}/fluxo`)
  ));

  article.appendChild(grade);

  // Galhos desta Árvore — cluster de círculos
  const galhos = Object.values(mapa).filter(e =>
    (e.tipo === 'galho' || e.tipo === 'realidade') && e.conteudo?.arvore === entrada.id
  );
  if (galhos.length > 0) {
    article.appendChild(criarTituloSecao('Galhos desta Árvore'));
    const host = document.createElement('div');
    article.appendChild(host);

    const itens = galhos.map(g => ({
      id: g.id, titulo: g.titulo, rgb: corArvore, caminho: caminhoDaEntrada(g),
    }));
    clustersAtivos.push(montarClusterCirculos(host, itens, item => item.caminho));
  }
}

// Página dedicada de uma faceta da Árvore (Árvore / Deidade / Fluxo) —
// destino dos cards clicáveis da página raiz. Rota: /deidades/{arvoreId}/{faceta}.
function renderArvoreFaceta(arvoreId, faceta) {
  const arvoreInfo = ARVORES.find(a => a.id === arvoreId);
  if (!arvoreInfo) { router.navegar('/arvores'); return; }

  const mapa = getEntradas();
  const entradaDeidade = mapa[arvoreId];
  const corArvore = corDaArvore(arvoreId);
  const corArvoreCss = `rgb(${corArvore})`;
  const nomeArvore = entradaDeidade?.titulo || arvoreInfo.titulo;

  pararAnimacoesCirculos();
  resetarAnimacao();
  content.innerHTML = '';

  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'entry-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Caminho de navegação');

  const voltarArvores = document.createElement('button');
  voltarArvores.type = 'button';
  voltarArvores.className = 'entry-breadcrumb-link';
  voltarArvores.textContent = '‹ Árvores';
  voltarArvores.addEventListener('click', () => router.navegar('/arvores'));
  breadcrumb.appendChild(voltarArvores);

  const voltarArvore = document.createElement('button');
  voltarArvore.type = 'button';
  voltarArvore.className = 'entry-breadcrumb-link';
  voltarArvore.textContent = `‹ ${nomeArvore}`;
  voltarArvore.addEventListener('click', () => router.navegar(`/deidades/${arvoreId}`));
  breadcrumb.appendChild(voltarArvore);

  content.appendChild(breadcrumb);

  const TITULOS_FACETA = { arvore: 'Árvore', deidade: 'Deidade', fluxo: 'Fluxo' };

  const headerWrap = document.createElement('div');
  headerWrap.className = 'entry-detail-header';

  const h2 = document.createElement('h2');
  h2.className = 'entry-detail-title';

  const simbolo = document.createElement('span');
  simbolo.className = 'entry-detail-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.style.setProperty('--accent', corArvoreCss);
  simbolo.textContent = entradaDeidade ? temaDeEntrada(entradaDeidade).simbolo : '✦';
  h2.appendChild(simbolo);
  h2.append(TITULOS_FACETA[faceta]);
  headerWrap.appendChild(h2);

  const subtitulo = document.createElement('p');
  subtitulo.className = 'entry-detail-subtitulo';
  subtitulo.style.setProperty('--accent', corArvoreCss);
  subtitulo.textContent = nomeArvore;
  headerWrap.appendChild(subtitulo);

  content.appendChild(headerWrap);

  const article = document.createElement('article');
  article.className = 'entry-detail';
  content.appendChild(article);

  if (faceta === 'arvore') {
    article.appendChild(criarProsaTexto(
      `${nomeArvore} é uma das Árvores do Jardim. A deidade e o Fluxo que ela abriga são a mesma entidade.`
    ));
  } else if (faceta === 'deidade') {
    if (entradaDeidade) {
      article.appendChild(renderProsa(entradaDeidade.conteudo, ['fluxo', 'cor']));
    } else {
      article.appendChild(criarProsaVazia('Nada foi descoberto sobre esta deidade ainda.'));
    }
  } else if (faceta === 'fluxo') {
    const fluxoKey = entradaDeidade?.conteudo?.fluxo;
    const fluxoEntrada = fluxoKey ? mapa[fluxoKey] : null;
    if (fluxoEntrada) {
      article.appendChild(renderProsa(fluxoEntrada.conteudo, ['arvore', 'cor']));
    } else {
      article.appendChild(criarProsaVazia('Nada foi descoberto sobre o Fluxo desta Árvore ainda.'));
    }
  }
}

// Decorador de detalhe — Galhos e Dimensões: tema herdado da Árvore-raiz
// (mesma cor fixa da paleta ARVORES, não a cor de fluxo) + o próximo nível
// da cascata como cluster de círculos (Galho → Dimensões, Dimensão → Locais).
function decorarDetalheRealidade(entrada, { headerWrap, h2, article }) {
  const mapa = getEntradas();

  if (entrada.tipo === 'galho' || entrada.tipo === 'realidade') {
    const arvoreId = entrada.conteudo?.arvore;
    const arvore = arvoreId ? mapa[arvoreId] : null;
    const corArvore = corDaArvore(arvoreId);

    if (arvore) {
      const tema = temaDeEntrada(arvore);

      const simbolo = document.createElement('span');
      simbolo.className = 'entry-detail-simbolo';
      simbolo.setAttribute('aria-hidden', 'true');
      simbolo.style.setProperty('--accent', tema.cor);
      simbolo.textContent = tema.simbolo;
      h2.prepend(simbolo);

      const subtitulo = document.createElement('p');
      subtitulo.className = 'entry-detail-subtitulo';
      subtitulo.style.setProperty('--accent', tema.cor);
      subtitulo.textContent = `Galho de ${arvore.titulo}`;
      headerWrap.appendChild(subtitulo);
    }

    const dimensoes = Object.values(mapa).filter(e => e.tipo === 'dimensao' && e.conteudo?.galho === entrada.id);
    if (dimensoes.length > 0) {
      article.appendChild(criarTituloSecao('Dimensões'));
      const host = document.createElement('div');
      article.appendChild(host);

      const itens = dimensoes.map(d => ({
        id: d.id, titulo: d.titulo, rgb: corArvore, caminho: caminhoDaEntrada(d),
      }));
      clustersAtivos.push(montarClusterCirculos(host, itens, item => item.caminho));
    }

    if (arvore) {
      article.appendChild(criarSecaoLinks('Árvore', [{ titulo: arvore.titulo, aoClicar: () => irParaEntrada(arvore.id) }]));
    }
    return;
  }

  if (entrada.tipo === 'dimensao') {
    const galho = entrada.conteudo?.galho ? mapa[entrada.conteudo.galho] : null;
    const arvoreId = galho?.conteudo?.arvore;
    const arvore = arvoreId ? mapa[arvoreId] : null;
    const corArvore = corDaArvore(arvoreId);

    // Locais desta Dimensão (Mundos/Reinos) — próximo nível da cascata
    const locais = Object.values(mapa).filter(e =>
      (e.tipo === 'reino' || e.tipo === 'mundo') && e.conteudo?.dimensao === entrada.id
    );
    if (locais.length > 0) {
      article.appendChild(criarTituloSecao('Locais'));
      const host = document.createElement('div');
      article.appendChild(host);

      const itens = locais.map(l => ({
        id: l.id, titulo: l.titulo, rgb: corArvore, caminho: caminhoDaEntrada(l),
      }));
      clustersAtivos.push(montarClusterCirculos(host, itens, item => item.caminho));
    }

    const links = [];
    if (galho) links.push({ titulo: galho.titulo, aoClicar: () => irParaEntrada(galho.id) });
    if (arvore) links.push({ titulo: arvore.titulo, aoClicar: () => irParaEntrada(arvore.id) });

    if (links.length > 0) {
      article.appendChild(criarSecaoLinks('Contexto', links));
    }
  }
}

// Decorador de detalhe — Reinos e Mundos: fim da cascata (Local). Só
// mostra o caminho de volta (Dimensão → Galho → Árvore), sem próximo nível.
function decorarDetalheLocal(entrada, { article }) {
  const mapa = getEntradas();
  const dimensao = entrada.conteudo?.dimensao ? mapa[entrada.conteudo.dimensao] : null;
  const galho = dimensao?.conteudo?.galho ? mapa[dimensao.conteudo.galho] : null;
  const arvore = galho?.conteudo?.arvore ? mapa[galho.conteudo.arvore] : null;

  const links = [];
  if (dimensao) links.push({ titulo: dimensao.titulo, aoClicar: () => irParaEntrada(dimensao.id) });
  if (galho) links.push({ titulo: galho.titulo, aoClicar: () => irParaEntrada(galho.id) });
  if (arvore) links.push({ titulo: arvore.titulo, aoClicar: () => irParaEntrada(arvore.id) });

  if (links.length > 0) {
    article.appendChild(criarSecaoLinks('Contexto', links));
  }
}

const RENDERERS_DETALHE = {
  deidades: decorarDetalheDeidade,
  realidades: decorarDetalheRealidade,
  reinos: decorarDetalheLocal,
};

// Campos já usados pela decoração temática — não repetir como seção genérica
const CAMPOS_IGNORADOS_PROSA = {
  deidades: ['fluxo', 'cor'],
  realidades: ['arvore', 'galho'],
  reinos: ['dimensao'],
};

// Categorias que fazem parte da cascata Árvore → Galho → Dimensão → Local —
// não têm mais índice próprio navegável (as abas saíram), então o "voltar"
// do breadcrumb sempre aponta pra tela de Árvores.
const CATEGORIAS_SEM_INDICE_PROPRIO = new Set(['deidades', 'realidades', 'reinos']);

// Breadcrumbs extras — categorias com hierarquia aninhada injetam níveis intermediários
const CRUMBS_EXTRAS = {
  realidades: (entrada) => {
    const mapa = getEntradas();
    const crumbs = [];

    if (entrada.tipo === 'dimensao') {
      const galho = entrada.conteudo?.galho ? mapa[entrada.conteudo.galho] : null;
      if (!galho) return crumbs;
      const arvore = galho.conteudo?.arvore ? mapa[galho.conteudo.arvore] : null;
      if (arvore) crumbs.push({ label: arvore.titulo, path: caminhoDaEntrada(arvore) });
      crumbs.push({ label: galho.titulo, path: caminhoDaEntrada(galho) });
      return crumbs;
    }

    const arvoreId = entrada.conteudo?.arvore;
    const arvore = arvoreId ? mapa[arvoreId] : null;
    if (arvore) crumbs.push({ label: arvore.titulo, path: caminhoDaEntrada(arvore) });
    return crumbs;
  },

  reinos: (entrada) => {
    const mapa = getEntradas();
    const crumbs = [];
    const dimensao = entrada.conteudo?.dimensao ? mapa[entrada.conteudo.dimensao] : null;
    if (!dimensao) return crumbs;
    const galho = dimensao.conteudo?.galho ? mapa[dimensao.conteudo.galho] : null;
    const arvore = galho?.conteudo?.arvore ? mapa[galho.conteudo.arvore] : null;
    if (arvore) crumbs.push({ label: arvore.titulo, path: caminhoDaEntrada(arvore) });
    if (galho) crumbs.push({ label: galho.titulo, path: caminhoDaEntrada(galho) });
    crumbs.push({ label: dimensao.titulo, path: caminhoDaEntrada(dimensao) });
    return crumbs;
  },
};

function construirCrumbsExtras(catId, entrada) {
  const gerador = CRUMBS_EXTRAS[catId];
  return gerador ? gerador(entrada) : [];
}

function renderEntrada(catId, entradaId) {
  const cat = CATEGORIAS.find(c => c.id === catId);
  if (!cat) { router.navegar(`/${CATEGORIAS[0].id}`); return; }

  const mapaCompleto = getEntradas();
  let entrada = mapaCompleto[entradaId];

  if (!entrada) {
    // Uma das 10 Árvores fixas sem deidade importada ainda — mostra a
    // página da cascata com placeholders em vez de voltar pro índice da
    // categoria (senão a tela mostraria qualquer outra coisa que já
    // tenha sido importada, o que é bem confuso).
    const arvoreFixa = catId === 'deidades' && ARVORES.find(a => a.id === entradaId);
    if (arvoreFixa) {
      entrada = { id: entradaId, titulo: arvoreFixa.titulo, tipo: 'deidade', conteudo: {}, _semDados: true };
    } else {
      router.navegar(`/${catId}`);
      return;
    }
  }

  pararAnimacoesCirculos();
  resetarAnimacao();
  content.innerHTML = '';

  // Breadcrumb — volta pro índice da categoria (ou pra tela de Árvores, no
  // caso de Deidades e Fluxos — o índice antigo dessa categoria não faz
  // mais parte da navegação principal), mais níveis intermediários para
  // categorias com hierarquia aninhada (ex.: Galho dentro de uma Árvore).
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'entry-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Caminho de navegação');

  // Deidades/Realidades/Reinos não têm mais índice próprio navegável (as
  // abas saíram) — o "voltar" delas é sempre pra tela de Árvores.
  const voltarCat = document.createElement('button');
  voltarCat.type = 'button';
  voltarCat.className = 'entry-breadcrumb-link';
  if (CATEGORIAS_SEM_INDICE_PROPRIO.has(catId)) {
    voltarCat.textContent = '‹ Árvores';
    voltarCat.addEventListener('click', () => router.navegar('/arvores'));
  } else {
    voltarCat.textContent = `‹ ${cat.titulo}`;
    voltarCat.addEventListener('click', () => router.navegar(`/${catId}`));
  }
  breadcrumb.appendChild(voltarCat);

  construirCrumbsExtras(catId, entrada).forEach(crumb => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'entry-breadcrumb-link';
    btn.textContent = `‹ ${crumb.label}`;
    if (crumb.path) btn.addEventListener('click', () => router.navegar(crumb.path));
    breadcrumb.appendChild(btn);
  });

  content.appendChild(breadcrumb);

  // Título da entrada (envolto num wrapper para permitir subtítulo temático)
  const headerWrap = document.createElement('div');
  headerWrap.className = 'entry-detail-header';

  const h2 = document.createElement('h2');
  h2.className = 'entry-detail-title';
  h2.textContent = entrada.titulo;
  headerWrap.appendChild(h2);
  content.appendChild(headerWrap);

  // Conteúdo em prosa
  const article = renderProsa(entrada.conteudo, CAMPOS_IGNORADOS_PROSA[catId] || []);
  content.appendChild(article);

  // Decoração específica da categoria (tema de cor, links cruzados, etc.)
  const decorador = RENDERERS_DETALHE[catId];
  if (decorador) decorador(entrada, { headerWrap, h2, article });
}

// ── Dispatcher de índice por categoria ───────────────────

const RENDERERS_INDICE = {
  cosmologia: renderCosmologiaIndex,
  deidades: renderDeidadesIndex,
  realidades: renderGalhosIndex,
};

function renderCategoria(catId) {
  const cat = CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[0];

  pararAnimacoesCirculos();
  resetarAnimacao();
  content.innerHTML = '';

  renderCatHeader(cat);

  const entradas = entradasPorCategoria(cat);

  if (entradas.length === 0) {
    renderVazio(cat);
    return;
  }

  const renderer = RENDERERS_INDICE[cat.id] || renderListaGenerica;
  renderer(cat, entradas);
}

// ── Import ───────────────────────────────────────────────

function initImport() {
  const btn   = document.getElementById('mundo-import-btn');
  const input = document.getElementById('mundo-import-input');

  function disparar() { input.click(); }

  btn.addEventListener('click', disparar);
  content.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="importar"]')) disparar();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const raw = await file.text();
    const resultado = processarArquivo(raw);
    mostrarToast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
    input.value = '';

    if (resultado.ok) {
      // Ao importar na detail page, volta para o índice da categoria
      // (ou permanece na tela de Árvores, se for de onde o import partiu).
      const partes = router.atual().split('/').filter(Boolean);
      const catAtual = partes[0] || CATEGORIAS[0].id;
      if (catAtual === 'arvores') {
        renderArvoresScreen();
      } else {
        renderCategoria(catAtual);
      }
    }
  });
}

// ── Init ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAtmosphere();

  // Tela de entrada — círculos flutuantes representando as Árvores
  router.registrar('/arvores', () => renderArvoresScreen());

  // Rotas de índice — uma por categoria
  CATEGORIAS.forEach(cat => {
    router.registrar(`/${cat.id}`, () => renderCategoria(cat.id));
  });

  // Rota de detalhe — /<catId>/<entradaId> (genérico, reutilizável por qualquer categoria)
  // + rota achatada — /deidades/<arvoreId>/<terceiro>, onde <terceiro> é ou uma
  // faceta fixa (arvore|deidade|fluxo) ou o id de qualquer descendente da
  // Árvore (Galho, Dimensão, Local) — o esquema de URL não espelha mais a
  // categoria interna, já que a navegação por abas não existe mais.
  router.registrarFallback((path) => {
    const partes = path.split('/').filter(Boolean);

    if (partes.length === 3 && partes[0] === 'deidades') {
      const [, arvoreId, terceiro] = partes;
      if (['arvore', 'deidade', 'fluxo'].includes(terceiro)) {
        renderArvoreFaceta(arvoreId, terceiro);
        return;
      }
      const entradaDescendente = getEntradas()[terceiro];
      const catDescendente = entradaDescendente && categoriaPorTipo(entradaDescendente.tipo);
      if (catDescendente) {
        renderEntrada(catDescendente.id, terceiro);
        return;
      }
      router.navegar(`/deidades/${arvoreId}`);
      return;
    }

    if (partes.length === 2) {
      const [catId, entradaId] = partes;
      if (CATEGORIAS.some(c => c.id === catId)) {
        renderEntrada(catId, entradaId);
        return;
      }
    }
    router.navegar('/arvores');
  });

  const titulo = document.querySelector('.mundo-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/arvores'));

  initImport();
  router.iniciar();
});
