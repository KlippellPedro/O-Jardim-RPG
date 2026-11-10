import { api } from './apiClient';

/** Como o documento aparece na lista: sem os campos, que podem trazer imagem. */
export interface IResumoDocumento {
  id: string;
  modelo: string;
  titulo: string;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface IDocumentoDoServidor extends IResumoDocumento {
  campos: Record<string, string>;
}

export interface IDocumentoParaSalvar {
  modelo: string;
  titulo: string;
  campos: Record<string, string>;
}

/** Documento pronto da lore (data/documentos/universais.json), só de leitura. As notas são para o Mestre. */
export interface IDocumentoUniversal {
  id: string;
  tema: string;
  titulo: string;
  ensina: string;
  entregar: string;
  fontes: string[];
  inventado: string[];
  modelo: string;
  campos: Record<string, string>;
}

const base = (campanhaId: string) => `/documentos/${encodeURIComponent(campanhaId)}`;

// Só Mestre e assistente: o servidor recusa jogador em todas as rotas.
export const documentosApi = {
  universais: (campanhaId: string) => api<{ documentos: IDocumentoUniversal[] }>(`${base(campanhaId)}/universais`),
  listar: (campanhaId: string) => api<{ documentos: IResumoDocumento[] }>(base(campanhaId)),
  obter: (campanhaId: string, id: string) => api<IDocumentoDoServidor>(`${base(campanhaId)}/${encodeURIComponent(id)}`),
  criar: (campanhaId: string, documento: IDocumentoParaSalvar) =>
    api<IDocumentoDoServidor>(base(campanhaId), { method: 'POST', body: documento }),
  editar: (campanhaId: string, id: string, documento: IDocumentoParaSalvar) =>
    api<IDocumentoDoServidor>(`${base(campanhaId)}/${encodeURIComponent(id)}`, { method: 'PUT', body: documento }),
  apagar: (campanhaId: string, id: string) =>
    api<{ ok: boolean }>(`${base(campanhaId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
