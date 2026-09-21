import { api } from './apiClient';

export interface IDescoberta {
  chave: string;
  /** "???" enquanto ninguém da campanha achou. */
  nome: string;
  raridade: 'comum' | 'rara';
  achei: boolean;
  achei_em: string | null;
  /** Só vem enquanto eu não achei: um empurrão vago, nunca o lugar. */
  dica: string | null;
  descobridores: string[];
}

export interface IDescobertasDaCampanha {
  itens: IDescoberta[];
  total: number;
  achadas_por_mim: number;
  ranking: Array<{ nome: string; total: number }>;
}

// O gatilho de cada descoberta vive no cliente; o servidor só valida a chave e
// guarda quem achou. Nada aqui diz onde as coisas estão.
export const descobertasApi = {
  registrar: (chave: string) =>
    api<{ nova: boolean; chave: string; nome: string; raridade: 'comum' | 'rara' }>(
      `/descobertas/registrar/${encodeURIComponent(chave)}`,
      { method: 'POST' },
    ),
  minhas: () => api<{ achadas: string[] }>('/descobertas/minhas'),
  daCampanha: (campanhaId: string) => api<IDescobertasDaCampanha>(`/descobertas/${encodeURIComponent(campanhaId)}`),
};
