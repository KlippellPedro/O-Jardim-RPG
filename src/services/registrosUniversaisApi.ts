import { api } from './apiClient';

export type SecaoUniversal = 'bestiario' | 'seres' | 'faccoes' | 'locais' | 'artefatos' | 'personagens' | 'glossario' | 'rumores';
export type RevelacaoRegistro = 'oculto' | 'rasurado' | 'aberto';

export interface IBlocoRegistro {
  titulo: string;
  itens: string[];
}

/** Só o que o Mestre escreveu: campo ausente significa "usa o original". */
export interface IDadosRegistro {
  titulo?: string;
  subtitulo?: string;
  descricao?: string;
  campos?: Array<[string, string]>;
  blocos?: IBlocoRegistro[];
  etiquetas?: string[];
}

export interface IRegistroDoServidor {
  id: string;
  secao: SecaoUniversal;
  /** Preenchido quando é ajuste de um registro de fábrica; nulo quando o Mestre criou o registro. */
  origem_id: string | null;
  revelacao: RevelacaoRegistro;
  dados: IDadosRegistro;
}

interface IResposta {
  id?: string;
  registros: IRegistroDoServidor[];
  gestor?: boolean;
}

const base = (campanhaId: string) => `/registros-universais/${encodeURIComponent(campanhaId)}`;

// O servidor decide o que cada papel enxerga: registro rasurado chega sem texto e oculto nem chega.
export const registrosUniversaisApi = {
  obter: (campanhaId: string) => api<IResposta>(base(campanhaId)),
  salvar: (campanhaId: string, dados: { secao: SecaoUniversal; origem_id?: string | null; revelacao: RevelacaoRegistro; dados: IDadosRegistro }) =>
    api<IResposta>(base(campanhaId), { method: 'PUT', body: dados }),
  editar: (campanhaId: string, id: string, dados: { secao: SecaoUniversal; revelacao: RevelacaoRegistro; dados: IDadosRegistro }) =>
    api<IResposta>(`${base(campanhaId)}/${encodeURIComponent(id)}`, { method: 'PUT', body: dados }),
  apagar: (campanhaId: string, id: string) =>
    api<IResposta>(`${base(campanhaId)}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
