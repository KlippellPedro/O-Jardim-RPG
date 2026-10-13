import { api } from './apiClient';

export type RaridadeConquista = 'comum' | 'rara' | 'lendaria';

export interface IConquista {
  chave: string;
  nome: string;
  descricao: string;
  raridade: RaridadeConquista;
  icone: string;
  desbloqueada: boolean;
  desbloqueada_em: string | null;
  progresso: { atual: number; minimo: number };
}

/** O que a rolagem e o uso devolvem quando algo acabou de ser desbloqueado. */
export interface IConquistaNova {
  chave: string;
  nome: string;
  descricao: string;
  raridade: RaridadeConquista;
  icone: string;
}

export interface IConquistasResposta {
  catalogo: IConquista[];
  /** Chaves desbloqueadas nesta chamada (a tela comemora uma vez). */
  novas: string[];
  total: number;
  desbloqueadas: number;
}

// O servidor decide o que é conquista e avalia tudo; o cliente só mostra.
export const conquistasApi = {
  listar(personagemId: string) {
    return api<IConquistasResposta>(`/personagens/${encodeURIComponent(personagemId)}/conquistas`);
  },
};
