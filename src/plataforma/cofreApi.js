import { api } from './apiClient.js?v=2';

export const cofreApi = {
  obter(campanhaId) {
    return api(`/cofre?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  transferirItem(campanhaId, personagemId, itemId, quantidade = 1) {
    return api('/cofre/transferir-item', {
      method: 'POST',
      body: {
        campanha_id: campanhaId,
        personagem_id: personagemId,
        item_id: itemId,
        quantidade,
      },
    });
  },
  transferirMoeda(campanhaId, personagemId, moeda, quantidade) {
    return api('/cofre/transferir-moeda', {
      method: 'POST',
      body: {
        campanha_id: campanhaId,
        personagem_id: personagemId,
        moeda,
        quantidade,
      },
    });
  },
};
