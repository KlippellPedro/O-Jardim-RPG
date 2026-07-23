/* Feedback visual entre páginas do site.
   O desfoque e as três bolinhas aparecem enquanto a navegação nativa busca a
   próxima página, sem acrescentar espera quando ela já está em cache. */

const ATRIBUTO_CARREGANDO = 'data-pagina-carregando';
let navegacaoAgendada = false;

function criarIndicador() {
  let indicador = document.querySelector('[data-pagina-carregamento]');
  if (indicador) return indicador;

  indicador = document.createElement('div');
  indicador.className = 'pagina-carregamento';
  indicador.dataset.paginaCarregamento = '';
  indicador.setAttribute('aria-hidden', 'true');
  indicador.innerHTML = `
    <div class="pagina-carregamento__centro" role="status" aria-live="polite">
      <span class="pagina-carregamento__pontos" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="pagina-carregamento__texto">Carregando página…</span>
    </div>
  `;
  document.body.append(indicador);
  return indicador;
}

export function mostrarCarregamentoDePagina() {
  const indicador = criarIndicador();
  document.documentElement.setAttribute(ATRIBUTO_CARREGANDO, 'true');
  indicador.setAttribute('aria-hidden', 'false');
}

export function ocultarCarregamentoDePagina() {
  navegacaoAgendada = false;
  document.documentElement.removeAttribute(ATRIBUTO_CARREGANDO);
  document.querySelector('[data-pagina-carregamento]')?.setAttribute('aria-hidden', 'true');
}

export function navegarComCarregamento(destino) {
  if (navegacaoAgendada) return;
  navegacaoAgendada = true;
  mostrarCarregamentoDePagina();
  const url = destino instanceof URL ? destino.href : String(destino);
  window.location.assign(url);
}

function destinoElegivel(evento, link) {
  if (evento.defaultPrevented || evento.button !== 0) return null;
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return null;
  if (link.hasAttribute('download') || link.dataset.semCarregamento !== undefined) return null;
  if (link.target && link.target.toLowerCase() !== '_self') return null;

  let destino;
  try {
    destino = new URL(link.href, window.location.href);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(destino.protocol) || destino.origin !== window.location.origin) return null;

  const mesmaPagina = destino.pathname === window.location.pathname
    && destino.search === window.location.search;
  if (mesmaPagina && (destino.hash || destino.href === window.location.href)) return null;
  return destino;
}

document.addEventListener('click', evento => {
  const link = evento.target.closest?.('a[href]');
  if (!link) return;
  const destino = destinoElegivel(evento, link);
  if (!destino) return;
  navegacaoAgendada = true;
  mostrarCarregamentoDePagina();
  // A navegação continua nativa: o navegador começa a buscar a próxima página
  // sem a espera artificial de um timeout, enquanto o documento atual mostra
  // o feedback durante qualquer demora real.
}, false);

// Ao voltar pelo histórico, a página pode vir inteira do bfcache com o estado
// visual anterior. pageshow limpa o indicador nesse cenário.
window.addEventListener('pageshow', ocultarCarregamentoDePagina);
