/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Menu
   Animação: 10 Árvores/deidades crescendo a partir do centro
   ───────────────────────────────────────────────────────── */

import { storage } from '../core/storage.js';

// ── Constantes ────────────────────────────────────────────

const KERYX_IDX = 2; // Árvore presa por Jota — tratamento visual especial

// Cada deidade tem um tom de cor. Não tão saturado — o fundo é quase tudo dourado.
const DEITY_RGBA = [
  '201,162,39',   // 0 Aethel   — ouro (Origem)
  '210,195,168',  // 1 Ousias   — branco-lua (Essência)
  '74,158,187',   // 2 Keryx    — azul-gelo (Tecnologia — preso)
  '120,185,130',  // 3 Haemus   — verde-sálvia (Vida)
  '200,100,60',   // 4 Ignis    — âmbar-brasa (Mutação)
  '140,158,174',  // 5 Moros    — aço (Matéria)
  '85,170,204',   // 6 Aperion  — azul-céu (Espaço)
  '190,160,60',   // 7 Chronus  — âmbar (Tempo)
  '100,68,136',   // 8 Erebus   — violeta (Vazio)
  '139,26,42',    // 9 Carmesim — sangue (Sangue)
];

// ── Árvore Cósmica ────────────────────────────────────────

function initCosmicTree() {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, CX, CY;
  let segments = [];
  let sparks   = [];

  // ── Geração dos galhos ──

  function build() {
    segments = [];
    CX = W / 2;
    // Tronco nasce rente à borda inferior — os galhos se abrem pra cima,
    // atravessando o título. A árvore é o cenário, não um detalhe.
    CY = H * 0.98;
    const baseLen = H * 0.7;

    // 10 Árvores espalhadas num arco de 270°, centrado no topo
    const ARC   = Math.PI * 1.5;
    const START = -Math.PI / 2 - ARC / 2;

    for (let i = 0; i < 10; i++) {
      const t     = i / 9;
      const angle = START + t * ARC;
      // Galhos apontando para cima são mais longos
      const upness  = Math.max(0, -Math.sin(angle));
      const lenMult = 0.55 + 0.45 * upness;
      // Keryx: galhos menores (preso — crescimento truncado)
      const maxD = i === KERYX_IDX ? 4 : 5;
      grow(CX, CY, angle, baseLen * lenMult, 0, maxD, i, 0);
    }

    // Ordenar por profundidade: galhos grossos primeiro
    segments.sort((a, b) => a.depth - b.depth);
  }

  function grow(x, y, angle, len, depth, maxDepth, deityIdx, waveStart) {
    if (depth > maxDepth || len < 4) return;

    const wobble = (Math.random() - 0.5) * 0.24;
    const ex = x + Math.cos(angle + wobble) * len;
    const ey = y + Math.sin(angle + wobble) * len;

    // Cada "onda" de crescimento dura 0.15 da animação total
    const WAVE_DUR = 0.15;
    const t0 = waveStart;
    const t1 = waveStart + WAVE_DUR;

    // Linhas finas e esmaecidas — um esboço mágico atmosférico, não uma
    // ilustração cheia. O pulso (fase 2) oscila isso entre ~15% e ~25%.
    const alpha = Math.max(0.02, 0.26 - depth * 0.032);
    const width = Math.max(0.15, 1.4 - depth * 0.22);

    segments.push({
      x1: x, y1: y, x2: ex, y2: ey,
      t0, t1, alpha, width, depth, deityIdx,
      broken: deityIdx === KERYX_IDX, // Keryx flickerará
    });

    const spread    = 0.25 + Math.random() * 0.22;
    const nextLen   = len * (deityIdx === KERYX_IDX ? 0.62 : 0.68);
    const nextWave  = waveStart + WAVE_DUR * 0.62;

    grow(ex, ey, angle - spread, nextLen, depth + 1, maxDepth, deityIdx, nextWave);
    grow(ex, ey, angle + spread, nextLen, depth + 1, maxDepth, deityIdx, nextWave);
  }

  // ── Fase 1: Crescimento ──

  const GROW_MS = 2800;
  let growStart = null;
  let grown     = false;

  function drawGrowth(now) {
    if (!growStart) growStart = now;
    const t = Math.min(1, (now - growStart) / GROW_MS);
    // Easing suave: ease-out cubic
    const te = 1 - Math.pow(1 - t, 3);

    ctx.clearRect(0, 0, W, H);

    for (const seg of segments) {
      if (te <= seg.t0) continue;

      const localT = Math.min(1, (te - seg.t0) / Math.max(0.001, seg.t1 - seg.t0));
      const px = seg.x1 + (seg.x2 - seg.x1) * localT;
      const py = seg.y1 + (seg.y2 - seg.y1) * localT;
      const a  = seg.alpha * Math.min(1, localT * 5);

      drawSeg(seg.x1, seg.y1, px, py, seg.deityIdx, a, seg.width, false);
    }

    if (t < 1) {
      requestAnimationFrame(drawGrowth);
    } else {
      grown = true;
      requestAnimationFrame(drawPulse);
    }
  }

  // ── Fase 2: Respiração + faíscas ──

  let pulseStart = null;

  function drawPulse(now) {
    if (!pulseStart) pulseStart = now;
    const elapsed = now - pulseStart;
    // Ciclo de 5 segundos, pulso suave
    const pulse = 0.80 + 0.20 * Math.sin((elapsed / 5000) * Math.PI * 2);
    const flicker = Math.random();

    ctx.clearRect(0, 0, W, H);

    for (const seg of segments) {
      let a = seg.alpha * pulse;
      // Keryx: galhos piscam aleatoriamente — conexão instável
      if (seg.broken) {
        a *= flicker < 0.08 ? 0.1 : flicker < 0.15 ? 0.5 : 1.0;
      }
      drawSeg(seg.x1, seg.y1, seg.x2, seg.y2, seg.deityIdx, a, seg.width, seg.depth === 5);
    }

    // Faíscas saindo das pontas
    spawnSparks();
    updateSparks(now);
    drawSparks();

    requestAnimationFrame(drawPulse);
  }

  // ── Linha de galho ──

  function drawSeg(x1, y1, x2, y2, di, alpha, width, glow) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (glow && alpha > 0.05) {
      // Leve brilho nas folhas finais
      ctx.shadowBlur   = 4;
      ctx.shadowColor  = `rgba(${DEITY_RGBA[di]},0.6)`;
    }

    ctx.strokeStyle = `rgba(${DEITY_RGBA[di]},${alpha.toFixed(3)})`;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.stroke();

    if (glow) {
      ctx.shadowBlur  = 0;
      ctx.shadowColor = 'transparent';
    }
  }

  // ── Partículas (faíscas/folhas) ──

  function spawnSparks() {
    if (sparks.length >= 35 || Math.random() > 0.12) return;
    // Escolher um segmento profundo aleatório como origem
    const deep = segments.filter(s => s.depth >= 4);
    if (!deep.length) return;
    const src = deep[Math.floor(Math.random() * deep.length)];
    sparks.push({
      x:  src.x2,
      y:  src.y2,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.4 - Math.random() * 0.6,
      life: 1,
      decay: 0.008 + Math.random() * 0.006,
      size:  0.8 + Math.random() * 1.0,
      di:    src.deityIdx,
    });
  }

  function updateSparks() {
    for (const sp of sparks) {
      sp.x    += sp.vx;
      sp.y    += sp.vy;
      sp.vy   += 0.008; // leve gravidade (flutua um pouco, então cai)
      sp.life -= sp.decay;
    }
    // Remover mortas
    for (let i = sparks.length - 1; i >= 0; i--) {
      if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
  }

  function drawSparks() {
    for (const sp of sparks) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${DEITY_RGBA[sp.di]},${(sp.life * 0.7).toFixed(3)})`;
      ctx.fill();
    }
  }

  // ── Resize ──

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    build();
    if (grown) {
      // Redesenhar instantaneamente após resize
      for (const seg of segments) {
        drawSeg(seg.x1, seg.y1, seg.x2, seg.y2, seg.deityIdx, seg.alpha, seg.width, false);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(drawGrowth);
}

// ── Cards ──────────────────────────────────────────────────

function initCards() {
  document.querySelectorAll('.menu-card:not([data-wip])').forEach(card => {
    card.addEventListener('click', () => {
      const mod = card.dataset.module;
      if (!mod) return;
      card.style.transform = 'translateX(6px) scale(0.98)';
      setTimeout(() => { window.location.href = `templates/${mod}.html`; }, 180);
    });
  });
}

// ── Configurações ────────────────────────────────────────────

function initSettings() {
  const btn   = document.getElementById('settings-btn');
  const panel = document.getElementById('settings-panel');
  if (!btn || !panel) return;

  function open() {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  function close() {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const exportBtn   = document.getElementById('settings-export');
  const importBtn   = document.getElementById('settings-import');
  const importInput = document.getElementById('settings-import-input');

  exportBtn.addEventListener('click', () => storage.exportar('jardim-rpg-ficha'));
  importBtn.addEventListener('click', () => importInput.click());

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await storage.importar(file);
      window.location.reload();
    } catch {
      alert('Não foi possível importar o arquivo. Verifique se é um .json exportado por este sistema.');
    }
  });
}

// ── Init ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initCosmicTree();
  initCards();
  initSettings();
});
