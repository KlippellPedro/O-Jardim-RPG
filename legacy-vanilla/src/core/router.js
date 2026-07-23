const routes = new Map();
let fallback = null;
let iniciado = false;

function normalizarPath(path) {
  const valor = String(path || '/').trim().replace(/^#/, '');
  const comBarra = valor.startsWith('/') ? valor : `/${valor}`;
  return comBarra.length > 1 ? comBarra.replace(/\/+$/, '') : '/';
}

function executarHandler(handler, path) {
  try {
    const resultado = handler(path);
    if (resultado && typeof resultado.catch === 'function') {
      resultado.catch(erro => console.error(`Erro ao renderizar a rota "${path}".`, erro));
    }
    return resultado;
  } catch (erro) {
    console.error(`Erro ao renderizar a rota "${path}".`, erro);
    return null;
  }
}

export const router = {
  registrar(path, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('O handler da rota precisa ser uma função.');
    }
    routes.set(normalizarPath(path), handler);
  },

  registrarFallback(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('O fallback da rota precisa ser uma função.');
    }
    fallback = handler;
  },

  navegar(path) {
    const destino = normalizarPath(path);

    // Alterar o hash dispara `hashchange`, que faz o despacho. Quando o
    // destino já é o atual, o navegador não emite o evento e despachamos aqui.
    if (destino === this.atual()) {
      return this._despachar(destino);
    }

    window.location.hash = destino;
    return null;
  },

  atual() {
    return normalizarPath(window.location.hash);
  },

  _despachar(path) {
    const destino = normalizarPath(path);
    const handler = routes.get(destino);
    if (handler) return executarHandler(handler, destino);
    if (fallback) return executarHandler(fallback, destino);
    return null;
  },

  iniciar() {
    if (iniciado) return;
    iniciado = true;
    window.addEventListener('hashchange', () => this._despachar(this.atual()));
    this._despachar(this.atual());
  }
};
