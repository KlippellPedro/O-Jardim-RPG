// Construtor de mapas do Mestre (plataforma/routers/construtor.py). O projeto é só de quem
// conduz a campanha; publicar devolve o estado do mapa já na cena que recebeu o desenho.

import { api } from './apiClient';
import type { IEstadoMapa } from './mapaApi';
import type { IConteudoProjeto } from '../pages/Mapa/construtor/projeto';

export interface IResumoProjeto {
  id: string;
  nome: string;
  /** Em casas. */
  largura: number;
  altura: number;
  /** Tamanho da casa em px do mapa. */
  casa: number;
  /** A cena que recebeu a última publicação. */
  cena_id: string | null;
  cena_nome?: string | null;
  versao: number;
  atualizado_em: string | null;
}

export interface IProjeto extends IResumoProjeto {
  conteudo: IConteudoProjeto;
}

const base = (campanhaId: string) => `/mapa/${campanhaId}/projetos`;
const ESTADO = { exigirCorpo: true } as const;

export const construtorApi = {
  listar: (campanhaId: string) => api<{ projetos: IResumoProjeto[] }>(base(campanhaId), ESTADO),
  criar: (campanhaId: string, dados: { nome: string; largura: number; altura: number; casa?: number }) =>
    api<IProjeto>(base(campanhaId), { method: 'POST', body: dados, ...ESTADO }),
  obter: (campanhaId: string, projetoId: string) => api<IProjeto>(`${base(campanhaId)}/${projetoId}`, ESTADO),
  salvar: (campanhaId: string, projetoId: string, dados: Partial<Pick<IProjeto, 'nome' | 'largura' | 'altura' | 'casa' | 'conteudo'>>) =>
    api<IProjeto>(`${base(campanhaId)}/${projetoId}`, { method: 'PUT', body: dados, ...ESTADO }),
  apagar: (campanhaId: string, projetoId: string) => api<null>(`${base(campanhaId)}/${projetoId}`, { method: 'DELETE' }),
  publicar: (campanhaId: string, projetoId: string, dados: { mapa_id: string; cena_id: string | null; nome?: string }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/${projetoId}/publicar`, { method: 'POST', body: dados, ...ESTADO }),
};
