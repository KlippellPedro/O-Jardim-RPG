import { api } from './apiClient';

export const avisosApi = {
  listar(apenasNaoLidos = false, limite = 40) {
    const query = new URLSearchParams({ limite: String(limite) });
    if (apenasNaoLidos) query.set('apenas_nao_lidos', 'true');
    return api<{ avisos: any[]; nao_lidos: number }>(`/avisos?${query.toString()}`);
  },
  marcarLidos(ids: string[] = []) {
    return api<{ nao_lidos: number }>('/avisos/lidos', { method: 'POST', body: { ids } });
  },
  limparLidos() {
    return api('/avisos', { method: 'DELETE' });
  },
};
