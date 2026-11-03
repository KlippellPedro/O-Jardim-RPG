import { api } from './apiClient';

export type PapelCampanha = 'mestre' | 'assistente' | 'jogador' | 'observador';

export interface IMembroCampanha {
  id: string;
  nome_exibicao: string;
  papel: PapelCampanha;
  status: 'ativo' | 'removido';
  nome_mesa: string | null;
  cor_mesa: string | null;
  permissoes_mesa: Record<string, unknown>;
}

export interface IDetalheCampanha {
  campanha: { id: string; nome: string; dono_id: string; [chave: string]: unknown };
  meu_papel: PapelCampanha;
  membros: IMembroCampanha[];
}

export interface IConviteCampanha {
  id: string;
  papel: Exclude<PapelCampanha, 'mestre'>;
  max_usos: number;
  usos: number;
  expira_em: string;
  criado_em: string;
  criado_por_nome: string | null;
  revogado_em: string | null;
}

export interface AuditoriaFiltros {
  limite?: number;
  pagina?: number;
  ator_id?: string;
  personagem_id?: string;
  categoria?: string;
  busca?: string;
  desde?: string;
  ate?: string;
}

export interface MudancaAuditoria {
  caminho: string;
  operacao: 'adicionado' | 'removido' | 'alterado' | string;
  antes?: unknown;
  depois?: unknown;
}

export interface EventoAuditoriaCampanha {
  id: string;
  ator_usuario_id: string | null;
  ator_nome: string | null;
  ator_servico: string | null;
  acao: string;
  alvo_tipo: string | null;
  alvo_id: string | null;
  alvo_nome: string | null;
  alvo_dono_usuario_id: string | null;
  alvo_dono_nome: string | null;
  detalhes: Record<string, any>;
  criado_em: string;
}

export interface AuditoriaCampanhaResponse {
  eventos: EventoAuditoriaCampanha[];
  pagina: number;
  limite: number;
  total: number;
  paginas: number;
}

export const campanhasApi = {
  listar() {
    return api('/campanhas');
  },
  obter(campanhaId: string) {
    return api<IDetalheCampanha>(`/campanhas/${encodeURIComponent(campanhaId)}`);
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
  /** Exclusivo do criador da plataforma - ver core/dependencies.py:require_creator_campaign. */
  /** Com `mesclar`, só as chaves enviadas mudam (o botão de visibilidade de uma entrada manda só as listas dela). */
  atualizarVisibilidade(campanhaId: string, configuracoes: Record<string, any>, opcoes: { mesclar?: boolean } = {}) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/visibilidade`, {
      method: 'PUT',
      body: { configuracoes, ...(opcoes.mesclar ? { mesclar: true } : {}) },
    });
  },
  arquivar(campanhaId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}`, { method: 'DELETE' });
  },
  entrar(codigo: string) {
    return api('/campanhas/entrar', { method: 'POST', body: { codigo } });
  },
  criarConvite(campanhaId: string, dados: { papel?: string; expira_em_dias?: number; max_usos?: number } = {}) {
    return api<{ id: string; codigo: string; expira_em: string; papel: string }>(`/campanhas/${encodeURIComponent(campanhaId)}/convites`, {
      method: 'POST',
      body: {
        papel: dados.papel || 'jogador',
        expira_em_dias: dados.expira_em_dias || 7,
        max_usos: dados.max_usos || 1,
      },
    });
  },
  listarConvites(campanhaId: string) {
    return api<{ convites: IConviteCampanha[] }>(`/campanhas/${encodeURIComponent(campanhaId)}/convites`);
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
  atualizarIdentidadeMesa(campanhaId: string, membroId: string, identidade: { nome_mesa: string | null; cor_mesa: string | null }) {
    return api<{ nome_mesa: string | null; cor_mesa: string | null }>(
      `/campanhas/${encodeURIComponent(campanhaId)}/membros/${encodeURIComponent(membroId)}/identidade-mesa`,
      { method: 'PUT', body: identidade },
    );
  },
  atualizarPermissoesMesa(campanhaId: string, membroId: string, permissoes: Record<string, unknown>) {
    return api<{ permissoes_mesa: Record<string, unknown> }>(
      `/campanhas/${encodeURIComponent(campanhaId)}/membros/${encodeURIComponent(membroId)}/permissoes-mesa`,
      { method: 'PUT', body: permissoes },
    );
  },
  transferirPropriedade(campanhaId: string, novoDonoId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/dono`, {
      method: 'PUT',
      body: { novo_dono_id: novoDonoId },
    });
  },
  auditoria(campanhaId: string, filtros: AuditoriaFiltros | number = {}, signal?: AbortSignal) {
    const normalized = typeof filtros === 'number' ? { limite: filtros } : filtros;
    const params = new URLSearchParams();
    Object.entries(normalized).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value));
      }
    });
    const query = params.toString();
    return api<AuditoriaCampanhaResponse>(
      `/campanhas/${encodeURIComponent(campanhaId)}/auditoria${query ? `?${query}` : ''}`,
      { signal },
    );
  },
  selecionarPersonagem(campanhaId: string, personagemId: string) {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/personagem-ativo`, {
      method: 'PUT',
      body: { personagem_id: personagemId },
    });
  },
};
