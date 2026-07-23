import { api } from './apiClient.js?v=2';

export const discordApi = {
  obter() {
    return api('/discord');
  },
  criarCodigo() {
    return api('/discord/codigo', { method: 'POST' });
  },
  desvincular() {
    return api('/discord', { method: 'DELETE' });
  },
};
