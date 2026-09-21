import { api } from './apiClient';
import type { IIdentidade } from '../pages/Campanha/campanha';

export interface IMembroDoPainel {
  usuario_id: string;
  nome: string;
  papel: string;
  visto_em: string | null;
  personagem: { id: string; nome: string; nivel: number } | null;
}

export interface IAnteriormente {
  sessao_id: string;
  titulo: string;
  encerrada_em: string | null;
  duracao_min: number | null;
  rodadas: number;
  rolagens: number;
  criticos: number;
}

export interface IPainelCampanha {
  campanha: { id: string; nome: string; descricao: string; identidade: IIdentidade };
  meu_papel: string;
  gestor: boolean;
  ao_vivo: { sessao_id: string; titulo: string } | null;
  membros: IMembroDoPainel[];
  anteriormente: IAnteriormente[];
}

export interface IEpilogo {
  sessoes: number;
  minutos: number;
  primeira: string | null;
  ultima: string | null;
  jogadores: number;
  rolagens: number;
  criticos: number;
  falhas: number;
  mvp: { nome: string; votos: number } | null;
  titulos: Array<{ chave: string; titulo: string; nome: string; valor: number; frase: string }>;
}

const base = (id: string) => `/campanhas/${encodeURIComponent(id)}`;

export const campanhaPainelApi = {
  painel: (id: string) => api<IPainelCampanha>(`${base(id)}/painel`),
  epilogo: (id: string) => api<IEpilogo>(`${base(id)}/epilogo`),
  identidade: (id: string, dados: { cor?: string | null; frase?: string; capa?: string | null }) =>
    api<{ identidade: IIdentidade }>(`${base(id)}/identidade`, { method: 'PUT', body: dados }),
  duplicar: (id: string) => api<{ id: string; nome: string }>(`${base(id)}/duplicar`, { method: 'POST' }),
};
