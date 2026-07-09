const routes = {};

export const router = {
  registrar(path, handler) {
    routes[path] = handler;
  },

  navegar(path) {
    const handler = routes[path];
    if (handler) {
      window.location.hash = path;
      handler();
    }
  },

  atual() {
    return window.location.hash.replace('#', '') || '/';
  },

  iniciar() {
    window.addEventListener('hashchange', () => {
      const handler = routes[this.atual()];
      if (handler) handler();
    });
    const handler = routes[this.atual()];
    if (handler) handler();
  }
};
