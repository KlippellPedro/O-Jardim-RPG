import { api } from './apiClient';

export const personagensApi = {
  listar(campanhaId: string, completo = false) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    if (completo) query.set('completo', 'true');
    return api<{ personagens: any[] }>(`/personagens?${query.toString()}`);
  },
  obter(personagemId: string) {
    return api<any>(`/personagens/${encodeURIComponent(personagemId)}`);
  },
  criar(campanhaId: string, personagem: any, donoUsuarioId: string | null = null) {
    return api('/personagens', {
      method: 'POST',
      body: {
        campanha_id: campanhaId,
        nome: personagem.nome,
        dono_usuario_id: donoUsuarioId,
        ficha: personagem,
      },
    });
  },
  atualizar(personagemId: string, payload: any) {
    return api(`/personagens/${encodeURIComponent(personagemId)}`, {
      method: 'PUT',
      body: payload
    });
  },
  arquivar(personagemId: string) {
    return api(`/personagens/${encodeURIComponent(personagemId)}`, { method: 'DELETE' });
  },
  // Carteira e inventário centralizado ficam fora de `ficha` (o backend os
  // remove antes de gravar) — só este endpoint os persiste de verdade.
  sincronizarEconomia(
    personagemId: string,
    payload: {
      versaoEsperada: number;
      carteira: { moeda: string; saldo: number; simbolo?: string }[];
      inventario: { item_id: string; titulo: string; quantidade: number; dados: Record<string, any> }[];
    }
  ) {
    return api<{ economia_versao: number }>(`/personagens/${encodeURIComponent(personagemId)}/economia`, {
      method: 'PUT',
      body: {
        versao_esperada: payload.versaoEsperada,
        carteira: payload.carteira,
        inventario: payload.inventario,
      },
    });
  },
};
