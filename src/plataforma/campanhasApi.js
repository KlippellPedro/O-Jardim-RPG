import { api } from './apiClient.js?v=2';

export const campanhasApi = {
  listar() {
    return api('/campanhas');
  },
  obter(campanhaId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`);
  },
  criar(dados) {
    return api('/campanhas', { method: 'POST', body: dados });
  },
  editar(campanhaId, dados) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`, {
      method: 'PUT',
      body: dados,
    });
  },
  arquivar(campanhaId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`, { method: 'DELETE' });
  },
  entrar(codigo) {
    return api('/campanhas/entrar', { method: 'POST', body: { codigo } });
  },
  criarConvite(campanhaId, dados = {}) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/convites`, {
      method: 'POST',
      body: {
        papel: dados.papel || 'jogador',
        expira_em_dias: dados.expira_em_dias || 7,
        max_usos: dados.max_usos || 1,
      },
    });
  },
  listarConvites(campanhaId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/convites`);
  },
  revogarConvite(campanhaId, conviteId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/convites/${encodeURIComponent(conviteId)}`, {
      method: 'DELETE',
    });
  },
  removerMembro(campanhaId, membroId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/membros/${encodeURIComponent(membroId)}`, {
      method: 'DELETE',
    });
  },
  alterarPapel(campanhaId, membroId, papel) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/membros/${encodeURIComponent(membroId)}/papel`, {
      method: 'PUT',
      body: { papel },
    });
  },
  transferirPropriedade(campanhaId, novoDonoId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/dono`, {
      method: 'PUT',
      body: { novo_dono_id: novoDonoId },
    });
  },
  auditoria(campanhaId, limite = 100) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/auditoria?limite=${encodeURIComponent(limite)}`);
  },
  selecionarPersonagem(campanhaId, personagemId) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/personagem-ativo`, {
      method: 'PUT',
      body: { personagem_id: personagemId },
    });
  },
};
