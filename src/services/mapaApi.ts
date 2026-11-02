import { api } from './apiClient';
import type { IGrade } from '../pages/Mapa/motor/geometria';

export type LadoToken = 'jogador' | 'aliado' | 'inimigo' | 'neutro';
export type TipoBarra = 'vida' | 'mana' | 'estamina' | 'sanidade';
export type ParaQuem = 'todos' | 'dono' | 'ninguem';

/** Barra com número (degrau total) ou só o estado da Vida (degrau parcial da Sessão). */
export interface IBarraToken {
  tipo: TipoBarra;
  atual?: number;
  maximo?: number;
  rotulo?: string;
  fracao?: number;
}

export interface IConfigBarras {
  mostrar: TipoBarra[];
  para: ParaQuem;
}

export interface ITokenMapa {
  id: string;
  x: number;
  y: number;
  porte: number;
  lado: LadoToken;
  nome: string;
  /** Versão do retrato (entra no endereço da imagem) ou null quando não há retrato para quem olha. */
  imagem: string | null;
  /** Nível do personagem: escolhe a moldura. */
  nivel: number | null;
  barras: IBarraToken[];
  condicoes: string[];
  /** Moldura já resolvida (mesa, token, personagem ou padrão); ver motor/molduras.ts. */
  moldura: string;
  /** Zoom e deslocamento da foto da ficha dentro do círculo. */
  enquadramento: { zoom: number; x: number; y: number };
  e_meu: boolean;
  pode_mover: boolean;
  desconhecido: boolean;
  /** Só para o dono e o Mestre. */
  config_barras?: IConfigBarras;
  /** Só para o Mestre. */
  oculto?: boolean;
  participante_id?: string | null;
  personagem_id?: string | null;
  imagem_id?: string | null;
  visibilidade?: string | null;
}

export interface IMapaDaCena {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  ladrilho: number;
  chaves: string[];
}

export interface IResumoCena {
  id: string;
  nome: string;
  ativa: boolean;
  versao: number;
}

export interface ICena extends IResumoCena {
  largura: number;
  altura: number;
  grade: IGrade;
  livre: boolean;
  mapa: IMapaDaCena | null;
}

export interface IEstadoMapa {
  gestor: boolean;
  usuario_id: string;
  ao_vivo: boolean;
  /** Jogador antes da sessão ficar ao vivo. */
  bloqueado: boolean;
  /** Só para o Mestre. */
  cenas: IResumoCena[];
  cena: ICena | null;
  tokens: ITokenMapa[];
  /** Quando o Mestre trava uma moldura, todos os tokens usam ela. */
  moldura_mesa: string | null;
  trazidos?: number;
}

export interface ICenaPayload {
  nome?: string;
  mapa_id?: string | null;
  sem_mapa?: boolean;
  largura?: number;
  altura?: number;
  grade?: Partial<IGrade>;
  livre?: boolean;
  ordem?: number;
}

export interface ITokenPayload {
  personagem_id?: string;
  participante_id?: string;
  imagem_id?: string;
  nome?: string;
  x: number;
  y: number;
  porte?: number;
  lado?: LadoToken;
  oculto?: boolean;
  moldura?: string;
}

export interface ITokenEdicao {
  nome?: string;
  porte?: number;
  lado?: LadoToken;
  oculto?: boolean;
  imagem_id?: string;
  sem_imagem?: boolean;
  barras?: Partial<IConfigBarras>;
  moldura?: string;
  sem_moldura?: boolean;
}

const base = (campanhaId: string) => `/mapa/${campanhaId}`;

export const mapaApi = {
  obter: (campanhaId: string, cenaId?: string | null) =>
    api<IEstadoMapa>(`${base(campanhaId)}${cenaId ? `?cena_id=${encodeURIComponent(cenaId)}` : ''}`),
  criarCena: (campanhaId: string, dados: ICenaPayload & { nome: string }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas`, { method: 'POST', body: dados }),
  editarCena: (campanhaId: string, cenaId: string, dados: ICenaPayload) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}`, { method: 'PUT', body: dados }),
  ativarCena: (campanhaId: string, cenaId: string) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/ativar`, { method: 'POST' }),
  apagarCena: (campanhaId: string, cenaId: string) =>
    api<null>(`${base(campanhaId)}/cenas/${cenaId}`, { method: 'DELETE' }),
  criarToken: (campanhaId: string, cenaId: string, dados: ITokenPayload) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/tokens`, { method: 'POST', body: dados }),
  trazerParticipantes: (campanhaId: string, cenaId: string, ponto: { x: number; y: number }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/trazer`, { method: 'POST', body: ponto }),
  editarToken: (campanhaId: string, tokenId: string, dados: ITokenEdicao) =>
    api<IEstadoMapa>(`${base(campanhaId)}/tokens/${tokenId}`, { method: 'PUT', body: dados }),
  moverToken: (campanhaId: string, tokenId: string, ponto: { x: number; y: number }) =>
    api<{ x: number; y: number; versao: number }>(`${base(campanhaId)}/tokens/${tokenId}/mover`, { method: 'POST', body: ponto }),
  apagarToken: (campanhaId: string, tokenId: string) =>
    api<null>(`${base(campanhaId)}/tokens/${tokenId}`, { method: 'DELETE' }),
  /** Moldura e enquadramento do personagem: valem em todas as cenas. */
  editarTokenDoPersonagem: (campanhaId: string, personagemId: string, dados: { moldura?: string; sem_moldura?: boolean; enquadramento?: Partial<{ zoom: number; x: number; y: number }> }) =>
    api<{ moldura: string | null; enquadramento: { zoom: number; x: number; y: number } }>(`${base(campanhaId)}/personagens/${personagemId}/token`, { method: 'PUT', body: dados }),
  configurar: (campanhaId: string, dados: { moldura_mesa: string | null }) =>
    api<{ moldura_mesa: string | null }>(`${base(campanhaId)}/config`, { method: 'PUT', body: dados }),
};

export function urlImagemDoToken(campanhaId: string, tokenId: string, versao: string): string {
  return `/api/v1/mapa/${campanhaId}/tokens/${tokenId}/imagem?v=${encodeURIComponent(versao)}`;
}

export function urlPedaco(itemId: string, chave: string): string {
  return `/api/v1/acervo/itens/${itemId}/arquivos/${chave}`;
}
