import { api, ApiError, lerCookie, traduzirFalhaDeRede } from './apiClient';

export type TipoItemAcervo = 'mapa' | 'token' | 'objeto';

export interface IPastaAcervo {
  id: string;
  pai_id: string | null;
  nome: string;
}

export interface IItemAcervo {
  id: string;
  nome: string;
  tipo: TipoItemAcervo;
  largura: number;
  altura: number;
  pasta_id: string | null;
  etiquetas: string[];
  estado: 'enviando' | 'pronto';
  bytes: number;
  chaves: string[];
  criado_em: string;
}

export interface IAcervo {
  pastas: IPastaAcervo[];
  itens: IItemAcervo[];
  uso_bytes: number;
  /** A partir daqui o Painel avisa (não trava nada). */
  aviso_bytes: number;
}

export const acervoApi = {
  listar: () => api<IAcervo>('/acervo'),
  criarPasta: (nome: string, paiId: string | null) =>
    api<{ id: string }>('/acervo/pastas', { method: 'POST', body: { nome, pai_id: paiId } }),
  garantirCaminho: (caminho: string) =>
    api<{ id: string }>('/acervo/pastas/caminho', { method: 'POST', body: { caminho } }),
  renomearPasta: (pastaId: string, nome: string) =>
    api(`/acervo/pastas/${pastaId}`, { method: 'PUT', body: { nome } }),
  apagarPasta: (pastaId: string) => api<null>(`/acervo/pastas/${pastaId}`, { method: 'DELETE' }),
  criarItem: (dados: { nome: string; tipo: TipoItemAcervo; largura: number; altura: number; pasta_id: string | null }) =>
    api<{ id: string; chaves: string[]; ladrilho: number }>('/acervo/itens', { method: 'POST', body: dados }),
  concluirItem: (itemId: string) => api<IItemAcervo>(`/acervo/itens/${itemId}/concluir`, { method: 'POST' }),
  editarItem: (itemId: string, dados: { nome?: string; tipo?: TipoItemAcervo; pasta_id?: string; mover_para_raiz?: boolean }) =>
    api<IItemAcervo>(`/acervo/itens/${itemId}`, { method: 'PUT', body: dados }),
  apagarItem: (itemId: string) => api<null>(`/acervo/itens/${itemId}`, { method: 'DELETE' }),

  /** Um pedaço por pedido, com o corpo cru: nenhum envio passa de alguns megabytes. */
  async subirPedaco(itemId: string, chave: string, blob: Blob): Promise<void> {
    const csrf = lerCookie('oj_csrf');
    let resposta: Response;
    try {
      resposta = await fetch(`/api/v1/acervo/itens/${itemId}/arquivos/${chave}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': blob.type || 'image/webp', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
        body: blob,
        signal: AbortSignal.timeout(60_000),
      });
    } catch (erro) {
      throw traduzirFalhaDeRede(erro);
    }
    if (!resposta.ok) {
      let detalhe: unknown = null;
      try {
        detalhe = (await resposta.json())?.detail;
      } catch {
        detalhe = null;
      }
      throw new ApiError(typeof detalhe === 'string' ? detalhe : `Falha ${resposta.status} ao subir a imagem.`, resposta.status, detalhe);
    }
  },
};
