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
  /** Quem fez a imagem, de onde veio e com que licença ela pode ser usada (anotado pelo Mestre). */
  autoria?: string | null;
  origem?: string | null;
  licenca?: LicencaAcervo | null;
}

export type LicencaAcervo = 'propria' | 'cc0' | 'cc-by' | 'cc-by-sa' | 'uso-pessoal' | 'comprada' | 'desconhecida';

export const LICENCAS_ACERVO: Array<{ id: LicencaAcervo; nome: string; dica: string }> = [
  { id: 'propria', nome: 'Feita por mim', dica: 'Você fez a imagem (ou ela veio do construtor).' },
  { id: 'cc0', nome: 'CC0 (domínio público)', dica: 'Pode usar e mudar sem dar crédito.' },
  { id: 'cc-by', nome: 'CC BY', dica: 'Pode usar e mudar dando crédito a quem fez.' },
  { id: 'cc-by-sa', nome: 'CC BY-SA', dica: 'Crédito a quem fez, e o que sair dela fica com a mesma licença.' },
  { id: 'uso-pessoal', nome: 'Uso pessoal', dica: 'Só para a sua mesa; não espalhe nem publique.' },
  { id: 'comprada', nome: 'Comprada', dica: 'Vale a licença de quem vendeu.' },
  { id: 'desconhecida', nome: 'Não sei', dica: 'Sem licença conhecida: o autor pode não ter autorizado o uso.' },
];

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
  editarItem: (itemId: string, dados: { nome?: string; tipo?: TipoItemAcervo; pasta_id?: string; mover_para_raiz?: boolean; autoria?: string; origem?: string; licenca?: LicencaAcervo | '' }) =>
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
