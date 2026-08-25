import { api } from './apiClient';

export interface LoreDocument {
  tipo: string;
  id: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  revelado?: boolean;
}

export interface EditorialState {
  id: string;
  titulo: string;
  rascunho: LoreDocument | null;
  dados_completos?: LoreDocument | Record<string, never>;
  versao_editorial: number;
  publicado_em: string | null;
  atualizado_em: string;
}

export interface EditorialLibraryEntry {
  chave: string;
  tipo: string;
  chave_recurso: string;
  titulo: string;
  dados_base: LoreDocument;
  editorial: EditorialState | null;
}

export interface EditorialRevision {
  id: string;
  versao: number;
  titulo: string;
  dados: LoreDocument;
  criado_em: string;
  autor_nome: string | null;
}

export interface EditorialExportSnapshot {
  formato: 'o-jardim-conteudo-publicado';
  versao_formato: 1;
  gerado_em: string;
  campanha: { id: string; nome: string };
  conteudo: Array<{
    modulo: 'mundo' | 'regras';
    chave_recurso: string;
    titulo: string;
    dados: LoreDocument;
    versao: number;
    publicado_em: string;
  }>;
  loja: Array<{
    item_id: string;
    dados: Record<string, unknown>;
    versao: number;
    publicado_em: string;
  }>;
}

export const conteudoEditorialApi = {
  listarMundo(campanhaId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'mundo' });
    return api<{ modulo: string; entradas: EditorialLibraryEntry[] }>(`/conteudo/editor?${query}`, { signal });
  },

  listarRegras(campanhaId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'regras' });
    return api<{ modulo: string; entradas: EditorialLibraryEntry[] }>(`/conteudo/editor?${query}`, { signal });
  },

  salvarRascunho(payload: {
    campanha_id: string;
    tipo: string;
    chave_recurso: string;
    titulo: string;
    conteudo: Record<string, unknown>;
    revelado?: boolean;
    versao_esperada: number | null;
    modulo?: 'mundo' | 'regras';
  }) {
    return api<{ editorial: EditorialState }>('/conteudo/editor/rascunho', {
      method: 'PUT',
      body: { ...payload, modulo: payload.modulo ?? 'mundo' },
    });
  },

  publicar(conteudoId: string, campanhaId: string, versaoEsperada: number) {
    return api<{ editorial: EditorialState }>(
      `/conteudo/editor/${encodeURIComponent(conteudoId)}/publicar`,
      {
        method: 'POST',
        body: { campanha_id: campanhaId, versao_esperada: versaoEsperada },
      },
    );
  },

  listarRevisoes(conteudoId: string, campanhaId: string) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    return api<{ revisoes: EditorialRevision[] }>(
      `/conteudo/editor/${encodeURIComponent(conteudoId)}/revisoes?${query}`,
    );
  },

  restaurarRevisao(conteudoId: string, revisaoId: string, campanhaId: string, versaoEsperada: number) {
    return api<{ editorial: EditorialState }>(
      `/conteudo/editor/${encodeURIComponent(conteudoId)}/revisoes/${encodeURIComponent(revisaoId)}/restaurar`,
      { method: 'POST', body: { campanha_id: campanhaId, versao_esperada: versaoEsperada } },
    );
  },

  exportarPublicados(campanhaId: string) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    return api<EditorialExportSnapshot>(`/conteudo/editor/exportar?${query}`);
  },

  carregarMundoResolvido(campanhaId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'mundo' });
    return api<{ modulo: string; entradas: LoreDocument[] }>(`/conteudo/resolvido?${query}`, { signal });
  },

  carregarRegrasResolvidas(campanhaId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'regras' });
    return api<{ modulo: string; entradas: LoreDocument[] }>(`/conteudo/resolvido?${query}`, { signal });
  },
};
