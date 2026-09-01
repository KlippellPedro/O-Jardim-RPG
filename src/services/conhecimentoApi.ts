import { api } from './apiClient';

export type NivelAcesso = 'oculto' | 'rumor' | 'parcial' | 'completo';
export type DestinatarioTipo = 'usuario' | 'personagem' | 'papel';

export interface InformacaoConhecimento {
  id: string;
  tipo: string;
  chave_recurso: string;
  titulo: string;
  resumo_rumor: string;
  dados_parciais: Record<string, unknown>;
  dados_completos: Record<string, unknown>;
  acesso_padrao: NivelAcesso;
  atualizado_em: string;
}

export interface LiberacaoConhecimento {
  id: string;
  informacao_id: string;
  destinatario_tipo: DestinatarioTipo;
  destinatario_id: string;
  acesso: Exclude<NivelAcesso, 'oculto'>;
  liberado_em: string;
}

export interface ConhecimentoAdministravel {
  informacoes: InformacaoConhecimento[];
  liberacoes: LiberacaoConhecimento[];
}

export const conhecimentoApi = {
  /** Exclusivo do criador da plataforma - ver routers/knowledge.py:list_knowledge. */
  listarAdministravel(campanhaId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ campanha_id: campanhaId, administrar: 'true' });
    return api<ConhecimentoAdministravel>(`/conhecimento?${query.toString()}`, { signal });
  },

  liberar(informacaoId: string, dados: { destinatario_tipo: DestinatarioTipo; destinatario_id: string; acesso: Exclude<NivelAcesso, 'oculto'> }) {
    return api<LiberacaoConhecimento>(`/conhecimento/${encodeURIComponent(informacaoId)}/liberacoes`, {
      method: 'PUT',
      body: dados,
    });
  },

  revogar(informacaoId: string, destinatarioTipo: DestinatarioTipo, destinatarioId: string) {
    const query = new URLSearchParams({ destinatario_tipo: destinatarioTipo, destinatario_id: destinatarioId });
    return api<void>(`/conhecimento/${encodeURIComponent(informacaoId)}/liberacoes?${query.toString()}`, {
      method: 'DELETE',
    });
  },
};
