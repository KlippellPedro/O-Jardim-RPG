import { api } from './apiClient';

export interface ParticipantePayload {
  nome?: string;
  tipo?: 'jogador' | 'aliado' | 'inimigo';
  iniciativa?: number;
  vida_atual?: number | null;
  vida_maxima?: number;
  dano?: number;
  cura?: number;
  condicoes?: any;
  anotacao?: string;
  visivel?: boolean;
  vida_visivel?: boolean;
}

export const sessaoApi = {
  obterSessao(campanhaId: string) {
    return api(`/sessao?campanha_id=${campanhaId}`);
  },

  abrirSessao(campanhaId: string, titulo: string, incluirPersonagens: boolean = true) {
    return api('/sessao', {
      method: 'POST',
      body: { campanha_id: campanhaId, titulo, incluir_personagens: incluirPersonagens },
    });
  },

  encerrarSessao(sessaoId: string) {
    return api(`/sessao/${sessaoId}`, { method: 'DELETE' });
  },

  adicionarParticipante(sessaoId: string, payload: ParticipantePayload) {
    return api(`/sessao/${sessaoId}/participantes`, {
      method: 'POST',
      body: payload,
    });
  },

  atualizarParticipante(sessaoId: string, participanteId: string, payload: ParticipantePayload) {
    return api(`/sessao/${sessaoId}/participantes/${participanteId}`, {
      method: 'PUT',
      body: payload,
    });
  },

  removerParticipante(sessaoId: string, participanteId: string) {
    return api(`/sessao/${sessaoId}/participantes/${participanteId}`, { method: 'DELETE' });
  },

  controlarTurno(sessaoId: string, acao: 'iniciar' | 'encerrar' | 'proximo' | 'anterior' | 'ordenar') {
    return api(`/sessao/${sessaoId}/turno`, {
      method: 'POST',
      body: { acao },
    });
  },

  sincronizarIniciativa(sessaoId: string) {
    return api(`/sessao/${sessaoId}/iniciativa`, { method: 'POST' });
  },
};
