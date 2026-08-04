import { api } from './apiClient';

export interface ParticipantePayload {
  nome?: string;
  tipo?: 'jogador' | 'aliado' | 'inimigo';
  iniciativa?: number;
  vida_atual?: number | null;
  vida_maxima?: number;
  dano?: number;
  cura?: number;
  condicoes?: Array<string | { nome: string; turnos: number | null }>;
  anotacao?: string;
  visivel?: boolean;
  vida_visivel?: boolean;
}

export interface SessaoParticipanteResponse {
  id: string;
  personagem_id?: string | null;
  nome: string;
  tipo: 'jogador' | 'aliado' | 'inimigo';
  iniciativa: number;
  vida_atual?: number;
  vida_maxima?: number;
  condicoes?: Array<string | { nome: string; turnos: number | null }>;
  ordem?: number;
  estado_vida?: string;
  e_meu?: boolean;
  visivel?: boolean;
  vida_visivel?: boolean;
}

export interface SessaoResponse {
  sessao: null | {
    id: string;
    campanha_id: string;
    titulo: string;
    status: 'preparacao' | 'aberta';
    rodada: number;
    em_combate: boolean;
    versao: number;
    iniciada_em: string;
    turno_de: null | { id: string | null; nome: string; indice: number };
  };
  participantes: SessaoParticipanteResponse[];
  meu_papel: string;
  comando: boolean;
  bloqueada: boolean;
}

export const sessaoApi = {
  obterSessao(campanhaId: string) {
    return api<SessaoResponse>(`/sessao?campanha_id=${campanhaId}`);
  },

  abrirSessao(campanhaId: string, titulo: string, incluirPersonagens: boolean = true) {
    return api<SessaoResponse>('/sessao', {
      method: 'POST',
      body: { campanha_id: campanhaId, titulo, incluir_personagens: incluirPersonagens },
    });
  },

  encerrarSessao(sessaoId: string) {
    return api(`/sessao/${sessaoId}`, { method: 'DELETE' });
  },

  publicarAoVivo(sessaoId: string) {
    return api<SessaoResponse>(`/sessao/${sessaoId}/ao-vivo`, { method: 'POST' });
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
