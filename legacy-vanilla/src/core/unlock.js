import { storage } from './storage.js';

const UNLOCK_KEY = 'unlocks';
const DEFAULT_UNLOCKS = ['inicial'];

export const unlock = {
  getAtivos() {
    return storage.get(UNLOCK_KEY) || [...DEFAULT_UNLOCKS];
  },

  ativar(tag) {
    const ativos = this.getAtivos();
    if (!ativos.includes(tag)) {
      ativos.push(tag);
      storage.set(UNLOCK_KEY, ativos);
    }
  },

  desativar(tag) {
    if (tag === 'inicial') return;
    const ativos = this.getAtivos().filter(t => t !== tag);
    storage.set(UNLOCK_KEY, ativos);
  },

  estaAtivo(tag) {
    if (!tag) return true;
    return this.getAtivos().includes(tag);
  },

  filtrar(lista) {
    return lista.filter(item => this.estaAtivo(item.unlock));
  }
};
