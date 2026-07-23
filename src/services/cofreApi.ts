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

export const cofreApi = {
  obter(campanhaId: string) {
    return api<{ itens: ICofreItem[]; moedas: ICofreMoeda[] }>(`/cofre?campanha_id=${encodeURIComponent(campanhaId)}`);
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
};
