import { api, ApiError, MENSAGEM_DEMORA, MENSAGEM_RESPOSTA_INCOMPLETA, type IDetalheDeRespostaVazia } from './apiClient';

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

/** Resposta "ok" com JSON que não é um calendário vira erro legível, em vez de quebrar quem lê `.mes` e `.hoje`. */
function garantirCalendario(resposta: ICalendarioMundo | null | undefined): ICalendarioMundo {
  if (!resposta || !resposta.mes || !resposta.hoje) {
    const detalhes: IDetalheDeRespostaVazia = { http: 0, tipo: 'application/json', motivo: 'formato inesperado' };
    throw new ApiError(MENSAGEM_RESPOSTA_INCOMPLETA, 0, detalhes);
  }
  return resposta;
}

/** Uma linha com o que o navegador recebeu (status, tipo e o que faltou), para quem for ajudar a achar o defeito. */
export function detalheTecnico(erro: unknown): string {
  if (!(erro instanceof ApiError)) return '';
  const detalhes = erro.details as Partial<IDetalheDeRespostaVazia> | null;
  if (!detalhes || typeof detalhes !== 'object' || typeof detalhes.tipo !== 'string') return '';
  return [detalhes.http ? `HTTP ${detalhes.http}` : '', detalhes.tipo, detalhes.motivo].filter(Boolean).join(' · ');
}

const PAUSA_ENTRE_TENTATIVAS_MS = 600;
const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/** Falha que costuma passar sozinha: a resposta não chegou inteira ou a rede piscou. Demora e erro do servidor ficam de fora. */
const valeTentarDeNovo = (erro: unknown) => erro instanceof ApiError && erro.status === 0 && erro.message !== MENSAGEM_DEMORA;

/** Ler o calendário não muda nada, então uma segunda tentativa é segura. */
async function lerCalendario(caminho: string): Promise<ICalendarioMundo> {
  const uma = async () => garantirCalendario(await api<ICalendarioMundo>(caminho, { exigirCorpo: true }));
  try {
    return await uma();
  } catch (erro) {
    if (!valeTentarDeNovo(erro)) throw erro;
    await esperar(PAUSA_ENTRE_TENTATIVAS_MS);
    return uma();
  }
}

/** Ação do Mestre: o servidor devolve o calendário novo. Sem segunda tentativa, porque agir duas vezes não é a mesma coisa. */
const mudar = async (caminho: string, method: string, body?: unknown) =>
  garantirCalendario(await api<ICalendarioMundo>(caminho, { method, body, exigirCorpo: true }));

// As regras e o recorte por papel são do servidor: evento rasurado chega sem texto.
export const calendarioMundoApi = {
  obter: (campanhaId: string, ano?: number, mes?: number) => {
    const consulta = ano !== undefined && mes !== undefined ? `?ano=${ano}&mes=${mes}` : '';
    return lerCalendario(`${base(campanhaId)}${consulta}`);
  },
  definirHoje: (campanhaId: string, dados: { ano: number; mes: number; dia: number }) =>
    mudar(`${base(campanhaId)}/hoje`, 'PUT', dados),
  avancar: (campanhaId: string, dias: number) =>
    mudar(`${base(campanhaId)}/avancar`, 'POST', { dias }),
  estacaoEspecial: (campanhaId: string, estacao: ChaveEstacao | null) =>
    mudar(`${base(campanhaId)}/estacao-especial`, 'PUT', { estacao }),
  config: (campanhaId: string, dados: { meses?: string[]; sincronizar_discord?: boolean; eventos_desligados?: string[] }) =>
    mudar(`${base(campanhaId)}/config`, 'PUT', dados),
  desfazer: (campanhaId: string) =>
    mudar(`${base(campanhaId)}/desfazer`, 'POST'),
  revelarPassados: (campanhaId: string) =>
    mudar(`${base(campanhaId)}/revelar-passados`, 'POST'),
  criarDiaExtra: (campanhaId: string, dados: { mes: number; nome: string; descricao: string }) =>
    mudar(`${base(campanhaId)}/dias-extras`, 'POST', dados),
  apagarDiaExtra: (campanhaId: string, mes: number) =>
    mudar(`${base(campanhaId)}/dias-extras/${mes}`, 'DELETE'),
  criarEvento: (campanhaId: string, dados: INovoEvento) =>
    mudar(`${base(campanhaId)}/eventos`, 'POST', dados),
  editarEvento: (campanhaId: string, id: string, dados: Partial<INovoEvento>) =>
    mudar(`${base(campanhaId)}/eventos/${encodeURIComponent(id)}`, 'PATCH', dados),
  apagarEvento: (campanhaId: string, id: string) =>
    mudar(`${base(campanhaId)}/eventos/${encodeURIComponent(id)}`, 'DELETE'),
};
