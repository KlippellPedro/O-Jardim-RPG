import { api } from './apiClient';

export interface Recompensa {
  personagem_id: string;
  personagem_nome: string;
  discord_alvo_id: string;
  valor_total: number;
  dono_usuario_id: string;
  origem_sistema: boolean;
}

export interface ReivindicarPayload {
  cacador_personagem_id: string;
  alvo_personagem_id: string;
  idempotencia: string;
}

export interface ResolverPayload {
  claim_id: string;
  aprovado: boolean;
  idempotencia: string;
}

export interface ReivindicarResult {
  operacao_id: string;
  repetida: boolean;
  claim_id: string;
  status: 'pendente';
  valor_total: number;
}

export interface ResolverResult {
  operacao_id: string;
  repetida: boolean;
  claim_id: string;
  status: 'aprovada' | 'rejeitada';
  valor_pago: number;
  saldo: number | null;
  economia_versao: number | null;
}

export interface ReivindicacaoPendente {
  id: string;
  campanha_id: string;
  categoria: 'economia';
  mensagem: string;
  criado_em: string;
  dados: {
    tipo: 'claim_recompensa';
    status: 'pendente';
    cacador_personagem_id: string;
    alvo_personagem_id: string;
    cacador_nome?: string;
    alvo_nome?: string;
    valor_no_pedido: number;
    valor_total: number;
  };
}

export async function listarRecompensas(campanhaId: string, signal?: AbortSignal): Promise<Recompensa[]> {
  const result = await api<{ recompensas: Recompensa[] }>(`/campanhas/${campanhaId}/recompensas`, { signal });
  return result.recompensas;
}

export async function listarReivindicacoesPendentes(campanhaId: string, signal?: AbortSignal): Promise<ReivindicacaoPendente[]> {
  const result = await api<{ reivindicacoes: ReivindicacaoPendente[] }>(
    `/campanhas/${campanhaId}/recompensas/pendentes`,
    { signal },
  );
  return result.reivindicacoes;
}

export function reivindicarRecompensa(campanhaId: string, payload: ReivindicarPayload): Promise<ReivindicarResult> {
  return api<ReivindicarResult>(`/campanhas/${campanhaId}/recompensas/reivindicar`, {
    method: 'POST',
    body: payload,
  });
}

export function resolverRecompensa(campanhaId: string, payload: ResolverPayload): Promise<ResolverResult> {
  return api<ResolverResult>(`/campanhas/${campanhaId}/recompensas/resolver`, {
    method: 'POST',
    body: payload,
  });
}
