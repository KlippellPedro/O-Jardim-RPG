import { api } from './apiClient';

export type ChaveEstacao = 'primavera' | 'verao' | 'outono' | 'inverno' | 'noite_eterna' | 'eclipse';
export type Revelacao = 'oculto' | 'rasurado' | 'aberto';
export type Repeticao = 'unico' | 'mensal' | 'anual';

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
  repeticao: Repeticao;
  /** Quantos dias o acontecimento dura (1 a 28). */
  duracao: number;
  /** No calendário de um mês: qual dia do acontecimento é este (1, 2, 3...). */
  parte?: number;
  revelacao: Revelacao;
  rasurado: boolean;
}

export interface IProximoEvento extends IEventoCalendario {
  em_dias: number;
  /** Vem dos eventos do ano do calendário, não do Mestre. */
  fixo?: boolean;
}

/** Acontecimento como o Mestre o vê na lista completa. */
export interface IEventoDoMestre extends IEventoCalendario {
  /** Único e com data anterior a hoje. */
  passou: boolean;
}

export interface IMudancaDeTempo {
  quando: string;
  texto: string;
}

export interface IDiaEspecialDoAno {
  mes: number;
  dia: number;
  nome: string;
}

export type TipoEventoDoAno = 'fixo' | 'extra' | 'aleatorio';

/** Evento que o calendário já traz (Baile, Chuva Roxa, Dia da Lua Carmesim). */
export interface IEventoDoAnoNoDia {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoEventoDoAno;
  /** Cai num dia sorteado do mês, diferente a cada ano. */
  sorteado: boolean;
  /** Qual dia do evento é este, de `duracao` (os Bailes duram 7). */
  parte: number;
  duracao: number;
}

export interface IDiaCalendario {
  dia: number;
  hoje: boolean;
  eventos: IEventoCalendario[];
  do_ano: IEventoDoAnoNoDia[];
  /** Dia a mais (o 29), que só existe em certos meses. */
  extra: boolean;
  lua_carmesim: boolean;
}

/** Como o Mestre vê cada evento do ano: ligado ou não, e o dia em que cai no ano de hoje. */
export interface IEventoDoAnoDoMestre {
  id: string;
  nome: string;
  descricao: string;
  mes: number;
  tipo: TipoEventoDoAno;
  dia: number;
  duracao: number;
  ativo: boolean;
  /** Dia a mais criado pelo Mestre nesta campanha (pode ser apagado). */
  criado: boolean;
}

export interface ICalendarioMundo {
  hoje: { ano: number; mes: number; dia: number };
  hoje_extenso: string;
  estacao: IEstacao;
  estacao_especial: ChaveEstacao | null;
  /** A estação do mês de hoje, sem contar a especial. */
  estacao_normal: ChaveEstacao;
  /** Hoje é o dia da Lua Carmesim (e o evento está ligado). */
  hoje_lua_carmesim: boolean;
  config: {
    meses: string[];
    dias_por_mes: number[];
    estacao_por_mes: ChaveEstacao[];
    dias_especiais: IDiaEspecialDoAno[];
    sincronizar_discord?: boolean;
    /** Só o Mestre: os dias a mais que ele criou e os meses que ainda podem receber um. */
    dias_extras_criados?: Array<{ mes: number; nome: string; descricao: string }>;
    meses_para_dia_extra?: number[];
  };
  mes: { ano: number; mes: number; nome: string; estacao: ChaveEstacao; estacao_normal: ChaveEstacao; dias: IDiaCalendario[] };
  proximos: IProximoEvento[];
  gestor: boolean;
  /** Só o Mestre recebe: todos os acontecimentos e as últimas mudanças de data. */
  todos_eventos?: IEventoDoMestre[];
  eventos_do_ano?: IEventoDoAnoDoMestre[];
  historico?: IMudancaDeTempo[];
}

export interface INovoEvento {
  titulo: string;
  nota: string;
  mes: number;
  dia: number;
  ano?: number | null;
  anual: boolean;
  repeticao?: Repeticao;
  duracao?: number;
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
  config: (campanhaId: string, dados: { meses?: string[]; sincronizar_discord?: boolean; eventos_desligados?: string[] }) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/config`, { method: 'PUT', body: dados }),
  desfazer: (campanhaId: string) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/desfazer`, { method: 'POST' }),
  revelarPassados: (campanhaId: string) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/revelar-passados`, { method: 'POST' }),
  criarDiaExtra: (campanhaId: string, dados: { mes: number; nome: string; descricao: string }) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/dias-extras`, { method: 'POST', body: dados }),
  apagarDiaExtra: (campanhaId: string, mes: number) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/dias-extras/${mes}`, { method: 'DELETE' }),
  criarEvento: (campanhaId: string, dados: INovoEvento) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/eventos`, { method: 'POST', body: dados }),
  editarEvento: (campanhaId: string, id: string, dados: Partial<INovoEvento>) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/eventos/${encodeURIComponent(id)}`, { method: 'PATCH', body: dados }),
  apagarEvento: (campanhaId: string, id: string) =>
    api<ICalendarioMundo>(`${base(campanhaId)}/eventos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
