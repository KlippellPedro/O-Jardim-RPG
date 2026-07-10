const routes = {};
let fallback = null;

export const router = {
  registrar(path, handler) {
    routes[path] = handler;
  },

  registrarFallback(handler) {
    fallback = handler;
  },

  navegar(path) {
    window.location.hash = path;
    this._despachar(path);
  },

  atual() {
    return window.location.hash.replace('#', '') || '/';
  },

  _despachar(path) {
    if (routes[path]) {
      routes[path]();
    } else if (fallback) {
      fallback(path);
    }
  },

  iniciar() {
    window.addEventListener('hashchange', () => this._despachar(this.atual()));
    this._despachar(this.atual());
  }
};
