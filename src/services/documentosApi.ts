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

/**
 * Documento pronto da lore ou de uma missão (data/documentos/universais.json). As notas são para o Mestre.
 * `editado`: o Criador mudou pelo site, e a versão dele vale para todas as campanhas.
 */
export interface IDocumentoUniversal {
  id: string;
  tema: string;
  missao: string | null;
  papel_na_missao: string | null;
  titulo: string;
  ensina: string;
  entregar: string;
  fontes: string[];
  inventado: string[];
  modelo: string;
  campos: Record<string, string>;
  editado: boolean;
  editado_em: string | null;
}

/** Kit de missão secundária: o resumo é só do Mestre, os papéis são documentos com `missao` igual ao id. */
export interface IMissaoUniversal {
  id: string;
  titulo: string;
  tamanho: string;
  resumo: string;
  perguntas: string[];
  relogio: string;
  pistas: string[];
  desfecho: string;
  tom: string;
  texto_da_carta_em_universal: string[];
}

export interface IEdicaoUniversal {
  titulo: string;
  ensina: string;
  entregar: string;
  campos: Record<string, string>;
}

const base = (campanhaId: string) => `/documentos/${encodeURIComponent(campanhaId)}`;

// Só Mestre e assistente: o servidor recusa jogador em todas as rotas.
export const documentosApi = {
  universais: (campanhaId: string) =>
    api<{ missoes: IMissaoUniversal[]; documentos: IDocumentoUniversal[]; pode_editar: boolean }>(`${base(campanhaId)}/universais`),
  // Só o Criador: a edição vale para todas as campanhas, e apagar devolve o texto do arquivo.
  editarUniversal: (id: string, edicao: IEdicaoUniversal) =>
    api<IDocumentoUniversal>(`/documentos/universais/${encodeURIComponent(id)}`, { method: 'PUT', body: edicao }),
  restaurarUniversal: (id: string) =>
    api<IDocumentoUniversal>(`/documentos/universais/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listar: (campanhaId: string) => api<{ documentos: IResumoDocumento[] }>(base(campanhaId)),
  obter: (campanhaId: string, id: string) => api<IDocumentoDoServidor>(`${base(campanhaId)}/${encodeURIComponent(id)}`),
  criar: (campanhaId: string, documento: IDocumentoParaSalvar) =>
    api<IDocumentoDoServidor>(base(campanhaId), { method: 'POST', body: documento }),
  editar: (campanhaId: string, id: string, documento: IDocumentoParaSalvar) =>
    api<IDocumentoDoServidor>(`${base(campanhaId)}/${encodeURIComponent(id)}`, { method: 'PUT', body: documento }),
  apagar: (campanhaId: string, id: string) =>
    api<{ ok: boolean }>(`${base(campanhaId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
