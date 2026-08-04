import { api } from './apiClient';

export interface ICofreItem {
  item_id: string;
  titulo: string;
  quantidade: number;
  dados: Record<string, any>;
  origem: string;
  atualizado_em: string;
}

export interface ICofreMoeda {
  moeda: string;
  saldo: number;
  atualizado_em: string;
}

export interface ICofreTierInfo {
  id: string;
  nome: string;
  capacidade: number;
  capacidade_moeda: number;
  custos: Record<string, number>;
  custos_base: Record<string, number>;
  limite_pratico?: boolean;
  reputacao_exigida: number;
}

export interface ICofreSegurancaInfo {
  id: string;
  nome: string;
  defesa: number;
  custos: Record<string, number>;
  custos_base: Record<string, number>;
  reputacao_exigida: number;
}

export interface ICofreNivel {
  vinculado: boolean;
  reputacao_bancaria?: number;
  tier_nivel?: number;
  tier_total?: number;
  tier?: ICofreTierInfo;
  proximo_tier?: ICofreTierInfo | null;
  seguranca_nivel?: number;
  seguranca_total?: number;
  seguranca?: ICofreSegurancaInfo;
  proxima_seguranca?: ICofreSegurancaInfo | null;
  saldos_guardados?: { moeda: string; saldo: number }[];
  itens_no_inventario?: number;
}

export const cofreApi = {
  obter(campanhaId: string) {
    return api<{ itens: ICofreItem[]; moedas: ICofreMoeda[] }>(`/cofre?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  nivel(campanhaId: string) {
    return api<ICofreNivel>(`/cofre/nivel?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  movimentos(campanhaId: string) {
    return api<{ movimentos: any[] }>(`/cofre/movimentos?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  transferirItem(campanhaId: string, personagemId: string, itemId: string, quantidade = 1) {
    return api('/cofre/transferir-item', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, item_id: itemId, quantidade },
    });
  },
  transferirMoeda(campanhaId: string, personagemId: string, moeda: string, quantidade: number) {
    return api('/cofre/transferir-moeda', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, moeda, quantidade },
    });
  },
  /** Saca do Cofre bancário do Banqueiro (saldos_guardados, tabela do bot)
   * direto pro personagem — é outro estoque, não o cofre de recompensas. */
  sacarDoBanco(campanhaId: string, personagemId: string, moeda: string, quantidade: number) {
    return api('/cofre/sacar-banco', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, moeda, quantidade },
    });
  },
};
