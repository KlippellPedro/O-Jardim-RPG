import { api } from './apiClient';

/** Página aberta: a lenda já caiu nesta campanha. */
export interface IPaginaAberta {
  id: string;
  caida: true;
  retida?: undefined;
  nome: string;
  epiteto: string;
  verdade: string[];
  consequencia: string;
  /** O que mudou no mundo e na mesa, dito por inteiro. */
  acontece: string[];
  /** O que a queda mudou de verdade no site (estação forçada, preço), por alguns meses. */
  efeitos: string[];
  caiu_em: string | null;
  sessao: string | null;
  por: string[];
}

/** Só o Mestre recebe: a lenda ainda de pé, com o texto que vai abrir quando ela cair. */
export interface IPaginaDeLendaEmPe {
  id: string;
  caida: false;
  retida?: undefined;
  nome: string;
  epiteto: string;
  vd: number;
  verdade: string[];
  consequencia: string;
  acontece: string[];
  efeitos: string[];
  /** O que o site publica sozinho na queda: a manchete no Discord e o selo secreto de quem estava na cena. */
  manchete: string;
  selo: string;
}

/** Para a mesa: uma página rasurada, sem nome nem pista. */
export interface IPaginaRetida {
  id: string;
  caida: false;
  retida: true;
}

export type PaginaDoLivro = IPaginaAberta | IPaginaDeLendaEmPe | IPaginaRetida;

export interface ILivroDaVerdade {
  total: number;
  caidas: number;
  gestor: boolean;
  entradas: PaginaDoLivro[];
}

export const paginaEstaRetida = (pagina: PaginaDoLivro): pagina is IPaginaRetida => pagina.retida === true;

const base = (campanhaId: string) => `/livro-da-verdade/${encodeURIComponent(campanhaId)}`;

export const livroDaVerdadeApi = {
  obter: (campanhaId: string) => api<ILivroDaVerdade>(base(campanhaId)),
  marcarQueda: (campanhaId: string, lendaId: string) =>
    api<ILivroDaVerdade>(`${base(campanhaId)}/${encodeURIComponent(lendaId)}/queda`, { method: 'POST' }),
  desfazerQueda: (campanhaId: string, lendaId: string) =>
    api<ILivroDaVerdade>(`${base(campanhaId)}/${encodeURIComponent(lendaId)}/queda`, { method: 'DELETE' }),
};
