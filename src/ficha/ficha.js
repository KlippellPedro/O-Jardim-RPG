/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Ficha
   Lista, criação e ficha completa persistidas na conta e campanha.
   ───────────────────────────────────────────────────────── */

import { router } from '../core/router.js';
import { executarComTransicao, reiniciarAnimacao } from '../core/viewTransition.js';
import { carregarCatalogo } from './services/catalogoService.js';
import { renderizarLista } from './views/listaView.js';
import { renderizarPersonagem } from './views/personagem/shell.js';
import { carregarPersonagensCampanha } from './services/personagensService.js';
import { inicializarPlataforma } from '../plataforma/portal.js?v=5';
import { carregarEntradas as carregarItensLiberados } from '../loja/services/entradasService.js';
import { carregarEntradas as carregarMundoLiberado } from '../mundo/services/entradasService.js';

const content = document.getElementById('ficha-content');
const toast = document.getElementById('ficha-toast');
const backLink = document.querySelector('.ficha-back');
let toastTimer = null;

function mostrarToast(mensagem, tipo) {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

// Link do topo é o único "voltar" da página — na lista, sai do app (link de
// verdade); na ficha de um personagem, volta pra lista (navegação da SPA,
// substitui o antigo breadcrumb duplicado que ficava embaixo dele).
function apontarBackParaApp() {
  backLink.textContent = '‹ O Jardim RPG';
  backLink.href = '/';
  backLink.onclick = null;
}

function apontarBackParaPersonagens() {
  backLink.textContent = '‹ Seus personagens';
  backLink.href = '#/';
  backLink.onclick = (e) => {
    e.preventDefault();
    router.navegar('/');
  };
}

async function comCatalogo(renderizar) {
  try {
    const catalogo = await carregarCatalogo();
    renderizar(catalogo);
  } catch (erro) {
    console.error(erro);
    content.innerHTML = '<p class="ficha-erro-carregamento">Não foi possível carregar os dados de raças e classes. Recarregue a página ou confira se o site está sendo servido por HTTP.</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  let campanhaAtivaId;
  try {
    const contexto = await inicializarPlataforma({ exigirCampanha: true });
    campanhaAtivaId = contexto.campanha.id;
    await Promise.all([
      carregarItensLiberados(campanhaAtivaId),
      carregarMundoLiberado(campanhaAtivaId),
    ]);
    await carregarPersonagensCampanha(campanhaAtivaId);
  } catch (erro) {
    console.error('Falha ao carregar personagens da conta:', erro);
    content.innerHTML = '<p class="ficha-erro-carregamento">Não foi possível carregar os personagens desta campanha. Tente recarregar a página.</p>';
    return;
  }

  document.addEventListener('jardim:erro-sincronizacao', evento => {
    mostrarToast(evento.detail?.mensagem || 'Não foi possível sincronizar a ficha. Recarregue antes de continuar.', 'erro');
  });
  document.addEventListener('jardim:contexto-alterado', evento => {
    const novaCampanha = evento.detail?.campanha?.id;
    if (campanhaAtivaId && novaCampanha && novaCampanha !== campanhaAtivaId) window.location.reload();
  });

  router.registrar('/', () => executarComTransicao(() => {
    apontarBackParaApp();
    reiniciarAnimacao(content);
    return comCatalogo(catalogo => renderizarLista(content, catalogo, { mostrarToast }));
  }));

  router.registrarFallback((path) => {
    const partes = path.split('/').filter(Boolean);
    if (partes[0] === 'personagem' && partes[1]) {
      const aba = partes[2] || 'ficha';
      executarComTransicao(() => {
        apontarBackParaPersonagens();
        reiniciarAnimacao(content);
        return comCatalogo(catalogo => renderizarPersonagem(content, catalogo, partes[1], aba, { mostrarToast }));
      });
      return;
    }
    router.navegar('/');
  });

  router.iniciar();
});
