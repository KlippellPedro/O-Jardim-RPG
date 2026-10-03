import { api } from './apiClient';

export type MoedaTroca = 'Lunaris' | 'Solares' | 'Fragmentos de Estrela' | 'Créditos Sombrios';
export const MOEDAS_TROCA: MoedaTroca[] = ['Lunaris', 'Solares', 'Fragmentos de Estrela', 'Créditos Sombrios'];

export interface LadoTroca {
  itens: Array<{ item_id: string; titulo?: string; quantidade: number }>;
  moedas: Array<{ moeda: MoedaTroca; valor: number }>;
}

export interface PropostaTroca {
  id: string;
  de: { id: string; nome: string };
  para: { id: string; nome: string };
  oferta: LadoTroca;
  pedido: LadoTroca;
  mensagem: string;
  status: 'aberta' | 'aceita' | 'recusada' | 'cancelada';
  criado_em: string;
  resolvida_em: string | null;
  /** A proposta chegou para este personagem (é ele quem aceita ou recusa). */
  recebida: boolean;
}

export interface ItemTrocavel {
  item_id: string;
  titulo: string;
  quantidade: number;
  raridade: string | null;
}

/** Troca com aceite: nada muda de mão até o outro lado aceitar. */
export const trocasApi = {
  listar(personagemId: string) {
    return api<{ propostas: PropostaTroca[] }>(`/trocas?personagem_id=${encodeURIComponent(personagemId)}`);
  },

  itensParaPedir(alvoId: string, dePersonagemId: string) {
    return api<{ itens: ItemTrocavel[] }>(
      `/trocas/itens/${encodeURIComponent(alvoId)}?de_personagem_id=${encodeURIComponent(dePersonagemId)}`,
    );
  },

  propor(payload: { dePersonagemId: string; paraPersonagemId: string; oferta: LadoTroca; pedido: LadoTroca; mensagem: string }) {
    return api<{ proposta: PropostaTroca }>('/trocas', {
      method: 'POST',
      body: {
        de_personagem_id: payload.dePersonagemId,
        para_personagem_id: payload.paraPersonagemId,
        oferta: { itens: payload.oferta.itens.map(({ item_id, quantidade }) => ({ item_id, quantidade })), moedas: payload.oferta.moedas },
        pedido: { itens: payload.pedido.itens.map(({ item_id, quantidade }) => ({ item_id, quantidade })), moedas: payload.pedido.moedas },
        mensagem: payload.mensagem,
      },
    });
  },

  aceitar(propostaId: string) {
    return api<{ proposta: PropostaTroca }>(`/trocas/${propostaId}/aceitar`, { method: 'POST' });
  },

  recusar(propostaId: string) {
    return api(`/trocas/${propostaId}/recusar`, { method: 'POST' });
  },

  cancelar(propostaId: string) {
    return api(`/trocas/${propostaId}/cancelar`, { method: 'POST' });
  },
};

/** "2x Adaga, 30 Lunaris" ou "nada". */
export function resumoDoLado(lado: LadoTroca): string {
  const partes = [
    ...lado.itens.map((item) => `${item.quantidade}x ${item.titulo ?? item.item_id}`),
    ...lado.moedas.map((moeda) => `${moeda.valor} ${moeda.moeda}`),
  ];
  return partes.length ? partes.join(', ') : 'nada';
}
