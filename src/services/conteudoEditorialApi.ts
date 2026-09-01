import { api } from './apiClient';

export interface LoreDocument {
  tipo: string;
  id: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  chave_origem?: string;
  revelado?: boolean;
  excluido?: boolean;
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
  origem?: 'global';
  excluido?: boolean;
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

export interface GlobalEditorialExportSnapshot {
  formato: 'o-jardim-conteudo-global';
  versao_formato: 1;
  gerado_em: string;
  conteudo: Array<{
    modulo: 'mundo';
    chave_origem: string;
    titulo: string;
    dados: LoreDocument;
    versao: number;
    publicado_em: string;
  }>;
}

export const conteudoEditorialApi = {
  listarMundoGlobal(signal?: AbortSignal) {
    return api<{ modulo: string; escopo: 'global'; entradas: EditorialLibraryEntry[] }>('/conteudo/editor-global', { signal });
  },

  listarRegras(campanhaId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'regras' });
    return api<{ modulo: string; entradas: EditorialLibraryEntry[] }>(`/conteudo/editor?${query}`, { signal });
  },

  salvarRascunho(payload: {
    campanha_id: string;
    tipo: string;
    chave_recurso: string;
    chave_origem?: string;
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

  salvarRascunhoGlobal(payload: {
    tipo: string;
    chave_recurso: string;
    chave_origem?: string;
    titulo: string;
    conteudo: Record<string, unknown>;
    revelado?: boolean;
    versao_esperada: number | null;
  }) {
    return api<{ editorial: EditorialState }>('/conteudo/editor-global/rascunho', {
      method: 'PUT',
      body: payload,
    });
  },

  publicarGlobal(conteudoId: string, versaoEsperada: number) {
    return api<{ editorial: EditorialState }>(
      `/conteudo/editor-global/${encodeURIComponent(conteudoId)}/publicar`,
      { method: 'POST', body: { versao_esperada: versaoEsperada } },
    );
  },

  excluirConteudoGlobal(conteudoId: string, versaoEsperada: number) {
    return api<void>(`/conteudo/editor-global/${encodeURIComponent(conteudoId)}`, {
      method: 'DELETE',
      body: { versao_esperada: versaoEsperada },
    });
  },

  listarRevisoesGlobais(conteudoId: string) {
    return api<{ revisoes: EditorialRevision[] }>(
      `/conteudo/editor-global/${encodeURIComponent(conteudoId)}/revisoes`,
    );
  },

  restaurarRevisaoGlobal(conteudoId: string, revisaoId: string, versaoEsperada: number) {
    return api<{ editorial: EditorialState }>(
      `/conteudo/editor-global/${encodeURIComponent(conteudoId)}/revisoes/${encodeURIComponent(revisaoId)}/restaurar`,
      { method: 'POST', body: { versao_esperada: versaoEsperada } },
    );
  },

  exportarPublicadosGlobais() {
    return api<GlobalEditorialExportSnapshot>('/conteudo/editor-global/exportar');
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

  excluirConteudoCampanha(conteudoId: string, campanhaId: string, versaoEsperada: number) {
    return api<void>(`/conteudo/editor/${encodeURIComponent(conteudoId)}`, {
      method: 'DELETE',
      body: { campanha_id: campanhaId, versao_esperada: versaoEsperada },
    });
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
