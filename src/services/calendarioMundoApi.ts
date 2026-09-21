import { api } from './apiClient';

export type ChaveEstacao = 'primavera' | 'verao' | 'outono' | 'inverno' | 'noite_eterna' | 'eclipse';
export type Revelacao = 'oculto' | 'rasurado' | 'aberto';

export interface IEstacao {
  chave: ChaveEstacao;
  rotulo: string;
  tipo: 'normal' | 'especial';
  descricao: string;
}

export interface IEventoCalendario {
  id: string;
  /** Vazio quando o evento está rasurado para o jogador. */
  titulo: string;
  nota: string;
  mes: number;
  dia: number;
  ano: number | null;
  anual: boolean;
  revelacao: Revelacao;
  rasurado: boolean;
}

export interface IProximoEvento extends IEventoCalendario {
  em_dias: number;
}

export interface IDiaCalendario {
  dia: number;
  hoje: boolean;
  eventos: IEventoCalendario[];
}

export interface ICalendarioMundo {
  hoje: { ano: number; mes: number; dia: number };
  hoje_extenso: string;
  estacao: IEstacao;
  estacao_especial: ChaveEstacao | null;
  config: { meses: string[]; sincronizar_discord?: boolean };
  mes: { ano: number; mes: number; nome: string; estacao: ChaveEstacao; dias: IDiaCalendario[] };
  proximos: IProximoEvento[];
  gestor: boolean;
}

export interface INovoEvento {
  titulo: string;
  nota: string;
  mes: number;
  dia: number;
  ano?: number | null;
  anual: boolean;
  revelacao: Revelacao;
}

const base = (campanhaId: string) => `/calendario/${encodeURIComponent(campanhaId)}`;

// As regras e o recorte por papel são do servidor: evento rasurado chega sem texto.
export const calendarioMundoApi = {
  obter: (campanhaId: string, ano?: number, mes?: number) => {
    const consulta = ano !== undefined && mes !== undefined ? `?ano=${ano}&mes=${mes}` : '';
    return api<ICalendarioMundo>(`${base(campanhaId)}${consulta}`);
  },
  definirHoje: (campanhaId: string, dados: { ano: number; mes: number; dia: number }) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/hoje`, { method: 'PUT', body: dados }),
  avancar: (campanhaId: string, dias: number) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/avancar`, { method: 'POST', body: { dias } }),
  estacaoEspecial: (campanhaId: string, estacao: ChaveEstacao | null) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/estacao-especial`, { method: 'PUT', body: { estacao } }),
  config: (campanhaId: string, dados: { meses?: string[]; sincronizar_discord?: boolean }) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/config`, { method: 'PUT', body: dados }),
  criarEvento: (campanhaId: string, dados: INovoEvento) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/eventos`, { method: 'POST', body: dados }),
  editarEvento: (campanhaId: string, id: string, dados: Partial<INovoEvento>) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/eventos/${encodeURIComponent(id)}`, { method: 'PATCH', body: dados }),
  apagarEvento: (campanhaId: string, id: string) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/eventos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
