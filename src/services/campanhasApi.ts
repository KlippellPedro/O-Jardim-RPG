import { api } from './apiClient';

export const campanhasApi = {
  listar() {
    return api('/campanhas');
  },
  obter(campanhaId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`);
  },
  criar(dados: { nome: string; descricao?: string }) {
    return api('/campanhas', { method: 'POST', body: dados });
  },
  editar(campanhaId: string, dados: any) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`, {
      method: 'PUT',
      body: dados,
    });
  },
  arquivar(campanhaId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`, { method: 'DELETE' });
  },
  entrar(codigo: string) {
    return api('/campanhas/entrar', { method: 'POST', body: { codigo } });
  },
  criarConvite(campanhaId: string, dados: { papel?: string; expira_em_dias?: number; max_usos?: number } = {}) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/convites`, {
      method: 'POST',
      body: {
        papel: dados.papel || 'jogador',
        expira_em_dias: dados.expira_em_dias || 7,
        max_usos: dados.max_usos || 1,
      },
    });
  },
  listarConvites(campanhaId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/convites`);
  },
  revogarConvite(campanhaId: string, conviteId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/convites/${encodeURIComponent(conviteId)}`, {
      method: 'DELETE',
    });
  },
  removerMembro(campanhaId: string, membroId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/membros/${encodeURIComponent(membroId)}`, {
      method: 'DELETE',
    });
  },
  alterarPapel(campanhaId: string, membroId: string, papel: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/membros/${encodeURIComponent(membroId)}/papel`, {
      method: 'PUT',
      body: { papel },
    });
  },
  transferirPropriedade(campanhaId: string, novoDonoId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/dono`, {
      method: 'PUT',
      body: { novo_dono_id: novoDonoId },
    });
  },
  auditoria(campanhaId: string, limite = 100) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/auditoria?limite=${encodeURIComponent(limite)}`);
  },
  selecionarPersonagem(campanhaId: string, personagemId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/personagem-ativo`, {
      method: 'PUT',
      body: { personagem_id: personagemId },
    });
  },
};
