import { api } from './apiClient.js?v=2';

export const registrosApi = {
  // O servidor é quem rola: o corpo diz o que rolar, nunca o resultado.
  rolar(pedido) {
    return api('/registros/rolagem', { method: 'POST', body: pedido });
  },
  registrarUso(pedido) {
    return api('/registros/uso', { method: 'POST', body: pedido });
  },
  listar(campanhaId, { apenasSessao = false, limite = 60 } = {}) {
    const query = new URLSearchParams({ campanha_id: campanhaId, limite: String(limite) });
    if (apenasSessao) query.set('apenas_sessao', 'true');
    return api(`/registros?${query}`);
  },
};
