import { api } from './apiClient.js?v=2';

export const avisosApi = {
  listar({ apenasNaoLidos = false, limite = 40 } = {}) {
    const query = new URLSearchParams({ limite: String(limite) });
    if (apenasNaoLidos) query.set('apenas_nao_lidos', 'true');
    return api(`/avisos?${query}`);
  },
  marcarLidos(ids = []) {
    return api('/avisos/lidos', { method: 'POST', body: { ids } });
  },
  limparLidos() {
    return api('/avisos', { method: 'DELETE' });
  },
};
