import { api } from './apiClient';
import type { EconomyOperation } from './economyOperations';

export interface CarteiraPersonagemItem {
  moeda: string;
  saldo: number;
  simbolo?: string;
}

export interface InventarioPersonagemItem {
  item_id: string;
  titulo: string;
  quantidade: number;
  dados: Record<string, any>;
}

export interface PersonagemApiRecord {
  id: string;
  nome: string;
  dono_usuario_id?: string | null;
  dono_nome?: string | null;
  criado_por?: string | null;
  criado_por_nome?: string | null;
  ficha: Record<string, any>;
  versao: number;
  economia_versao?: number;
  carteira?: CarteiraPersonagemItem[];
  inventario_central?: InventarioPersonagemItem[];
  criado_em?: string;
  atualizado_em?: string;
  somente_leitura?: boolean;
  [key: string]: unknown;
}

export interface AtualizarPersonagemPayload {
  versao_esperada: number;
  nome: string;
  ficha: Record<string, any>;
}

export interface AplicarOperacoesEconomiaPayload {
  versaoEsperada: number;
  operacoes: EconomyOperation[];
}

export interface EconomiaPersonagemResponse {
  economia_versao: number;
  carteira: CarteiraPersonagemItem[];
  inventario: InventarioPersonagemItem[];
}

export interface AliadoComplexoResumo {
  personagem_id: string;
  nome: string;
  foto?: string | null;
  vida_atual: number;
  vida_maxima: number;
  mana_atual: number;
  mana_maxima: number;
  defesa: number;
  movimento: number | string;
  iniciativa: number;
  nivel: number;
}

export interface ConsumirFrutoEdenPayload {
  versaoFichaEsperada: number;
  economiaVersaoEsperada: number;
  substituir?: boolean;
}

export const personagensApi = {
  listar(campanhaId: string, completo = false) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    if (completo) query.set('completo', 'true');
    return api<{ personagens: PersonagemApiRecord[] }>(`/personagens?${query.toString()}`);
  },
  obter(personagemId: string) {
    return api<{ personagem: PersonagemApiRecord }>(`/personagens/${encodeURIComponent(personagemId)}`);
  },
  listarAliadosComplexos(personagemId: string) {
    return api<{ aliados: AliadoComplexoResumo[] }>(
      `/personagens/${encodeURIComponent(personagemId)}/aliados-complexos`,
    );
  },
  criar(campanhaId: string, personagem: any, donoUsuarioId: string | null = null) {
    return api<PersonagemApiRecord>('/personagens', {
      method: 'POST',
      body: {
        campanha_id: campanhaId,
        nome: personagem.nome,
        dono_usuario_id: donoUsuarioId,
        ficha: personagem,
      },
    });
  },
  atualizar(personagemId: string, payload: AtualizarPersonagemPayload) {
    return api<{ personagem: PersonagemApiRecord }>(`/personagens/${encodeURIComponent(personagemId)}`, {
      method: 'PUT',
      body: payload
    });
  },
  arquivar(personagemId: string) {
    return api(`/personagens/${encodeURIComponent(personagemId)}`, { method: 'DELETE' });
  },
  transferirDono(personagemId: string, novoDonoUsuarioId: string) {
    return api<{ personagem_id: string; dono_usuario_id: string; dono_nome: string }>(
      `/personagens/${encodeURIComponent(personagemId)}/dono`,
      {
        method: 'PUT',
        body: { novo_dono_usuario_id: novoDonoUsuarioId },
      },
    );
  },
  aplicarOperacoesEconomia(
    personagemId: string,
    payload: AplicarOperacoesEconomiaPayload,
    keepalive = false,
  ) {
    return api<EconomiaPersonagemResponse>(
      `/personagens/${encodeURIComponent(personagemId)}/economia/operacoes`,
      {
        method: 'POST',
        body: {
          versao_esperada: payload.versaoEsperada,
          operacoes: payload.operacoes,
        },
        keepalive: keepalive || undefined,
      },
    );
  },
  consumirFrutoEden(
    personagemId: string,
    itemId: string,
    payload: ConsumirFrutoEdenPayload,
  ) {
    return api<{
      fruto: Record<string, any>;
      versao: number;
      economia_versao: number;
    }>(
      `/personagens/${encodeURIComponent(personagemId)}/inventario/${encodeURIComponent(itemId)}/consumir-fruto-eden`,
      {
        method: 'POST',
        body: {
          versao_ficha_esperada: payload.versaoFichaEsperada,
          economia_versao_esperada: payload.economiaVersaoEsperada,
          substituir: Boolean(payload.substituir),
        },
      },
    );
  },

};
