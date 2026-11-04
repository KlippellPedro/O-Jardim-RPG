import { api } from './apiClient';

export interface ITrilhaMesa {
  faixa_id: string | null;
  nome: string | null;
  mime: string | null;
  reproduzindo: boolean;
  posicao_ms: number;
  servidor_ms: number;
}

export interface IFaixaMesa {
  id: string;
  nome: string;
  mime: string;
  bytes: number;
}

const base = (campanhaId: string) => `/mapa/${encodeURIComponent(campanhaId)}`;
const COM_CORPO = { exigirCorpo: true } as const;

export const mapaRecursosApi = {
  mostrarDocumento: (campanhaId: string, documentoId: string, personagens: string[] | null) =>
    api<{ ok: boolean }>(`${base(campanhaId)}/documentos/${encodeURIComponent(documentoId)}/mostrar`, {
      method: 'POST', body: { personagens },
    }),
  listarTrilhas: (campanhaId: string) =>
    api<{ faixas: IFaixaMesa[]; estado: ITrilhaMesa; gestor: boolean }>(`${base(campanhaId)}/trilhas`, COM_CORPO),
  enviarTrilha: (campanhaId: string, arquivo: File) => {
    const mimePorExtensao: Record<string, string> = {
      mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm',
    };
    const mimeDeclarado = arquivo.type.toLowerCase().split(';', 1)[0];
    const mimeAceito = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/webm'];
    const extensao = arquivo.name.toLowerCase().split('.').pop() ?? '';
    const mime = mimeAceito.includes(mimeDeclarado) ? mimeDeclarado : mimePorExtensao[extensao];
    if (!mime) throw new Error('Use um arquivo MP3, Ogg, WAV ou WebM de áudio.');
    return api<IFaixaMesa>(`${base(campanhaId)}/trilhas`, {
      method: 'POST', body: arquivo,
      headers: { 'Content-Type': mime, 'X-Trilha-Nome': encodeURIComponent(arquivo.name) },
      signal: AbortSignal.timeout(60_000),
      exigirCorpo: true,
    });
  },
  definirTrilha: (campanhaId: string, estado: Pick<ITrilhaMesa, 'faixa_id' | 'reproduzindo' | 'posicao_ms'>) =>
    api<ITrilhaMesa>(`${base(campanhaId)}/trilha`, { method: 'PUT', body: estado, ...COM_CORPO }),
  apagarTrilha: (campanhaId: string, faixaId: string) =>
    api<{ ok: boolean }>(`${base(campanhaId)}/trilhas/${encodeURIComponent(faixaId)}`, { method: 'DELETE' }),
  audioUrl: (campanhaId: string, faixaId: string) =>
    `/api/v1${base(campanhaId)}/trilhas/${encodeURIComponent(faixaId)}/audio`,
};
