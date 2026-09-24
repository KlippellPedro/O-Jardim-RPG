import type { ChaveEstacao, IEventoCalendario, Repeticao } from '../../services/calendarioMundoApi';

export const ESTACOES_DO_ANO: ChaveEstacao[] = ['primavera', 'verao', 'outono', 'inverno'];

export const COR_DA_ESTACAO: Record<ChaveEstacao, string> = {
  primavera: '#4ade80',
  verao: '#fbbf24',
  outono: '#fb923c',
  inverno: '#7dd3fc',
  noite_eterna: '#818cf8',
  eclipse: '#c084fc',
};

/** Um mês por Árvore (mais O Vazio). */
export const MESES_POR_ANO = 10;

/** Navega de mês em mês virando o ano. */
export function somarMes(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const total = ano * MESES_POR_ANO + mes + delta;
  return { ano: Math.floor(total / MESES_POR_ANO), mes: ((total % MESES_POR_ANO) + MESES_POR_ANO) % MESES_POR_ANO };
}

/** "hoje", "amanhã" ou "em 12 dias". */
export function textoEmDias(dias: number): string {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

/** Rótulo curto para o Mestre: grau de revelação, se repete e quantos dias dura. */
export function rotuloDoEvento(evento: Pick<IEventoCalendario, 'revelacao' | 'anual'> & { repeticao?: Repeticao; duracao?: number }): string {
  const grau = evento.revelacao === 'oculto' ? 'oculto' : evento.revelacao === 'rasurado' ? 'rasurado' : 'aberto';
  const repeticao = evento.repeticao ?? (evento.anual ? 'anual' : 'unico');
  const partes = [grau];
  if (repeticao === 'mensal') partes.push('todo mês');
  if (repeticao === 'anual') partes.push('todo ano');
  if ((evento.duracao ?? 1) > 1) partes.push(`${evento.duracao} dias`);
  return partes.join(' · ');
}

export interface IFaseDaLua {
  /** Posição no ciclo, de 0 (Nova) a 1 (a Nova seguinte). */
  ciclo: number;
  nome: string;
  /** 0 a 7, na ordem Nova, Crescente, Quarto Crescente, Crescente Gibosa, Cheia, Minguante Gibosa, Quarto Minguante, Minguante. 8 é a Lua Carmesim. */
  indice: number;
}

const NOMES_DAS_FASES = [
  'Lua Nova',
  'Lua Crescente',
  'Quarto Crescente',
  'Crescente Gibosa',
  'Lua Cheia',
  'Minguante Gibosa',
  'Quarto Minguante',
  'Lua Minguante',
];

/** Cada mês é uma lunação de 28 dias: Nova no dia 1 e Cheia no dia 15. */
export const DIAS_DA_LUNACAO = 28;
export const INDICE_LUA_CARMESIM = 8;

/** O dia 29 (dia extra) fecha a lunação em Lua Nova, menos o do Limiar, onde a lua é a Carmesim. */
export function faseDaLua(dia: number, carmesim = false): IFaseDaLua {
  const inteiro = Math.trunc(dia);
  if (inteiro > DIAS_DA_LUNACAO && carmesim) return { ciclo: 0.5, nome: 'Lua Carmesim', indice: INDICE_LUA_CARMESIM };
  const normalizado = (((inteiro - 1) % DIAS_DA_LUNACAO) + DIAS_DA_LUNACAO) % DIAS_DA_LUNACAO;
  const ciclo = normalizado / DIAS_DA_LUNACAO;
  const indice = Math.round(ciclo * 8) % 8;
  return { ciclo, nome: NOMES_DAS_FASES[indice], indice };
}

interface IConfigDeDatas {
  dias_por_mes: number[];
  estacao_por_mes: ChaveEstacao[];
  dias_especiais: Array<{ mes: number; dia: number; nome: string }>;
}

interface IHoje {
  mes: number;
  dia: number;
}

export const DIA_DA_LUA_CHEIA = 15;

/** Quantos dias faltam até o primeiro dia (a partir de amanhã) que satisfaz o teste. Nulo se nenhum em dois anos. */
export function diasAteProximo(
  hoje: IHoje,
  config: Pick<IConfigDeDatas, 'dias_por_mes'>,
  quando: (data: IHoje) => boolean,
): number | null {
  const total = config.dias_por_mes.reduce((soma, dias) => soma + dias, 0);
  let mes = hoje.mes;
  let dia = hoje.dia;
  for (let passo = 1; passo <= total * 2; passo += 1) {
    dia += 1;
    if (dia > (config.dias_por_mes[mes] ?? 0)) {
      dia = 1;
      mes = (mes + 1) % config.dias_por_mes.length;
    }
    if (quando({ mes, dia })) return passo;
  }
  return null;
}

export interface IAtalhoDeTempo {
  id: string;
  rotulo: string;
  dias: number;
}

/** Os pulos que o Mestre mais faz: até o começo do mês, a Lua Cheia, a próxima estação, o dia da Lua Carmesim e o próximo acontecimento. */
export function atalhosDeTempo(
  hoje: IHoje,
  config: IConfigDeDatas,
  proximos: Array<{ em_dias: number }>,
): IAtalhoDeTempo[] {
  const candidatos: Array<{ id: string; rotulo: string; dias: number | null }> = [
    { id: 'mes', rotulo: 'Próximo mês', dias: diasAteProximo(hoje, config, (data) => data.dia === 1) },
    { id: 'cheia', rotulo: 'Próxima Lua Cheia', dias: diasAteProximo(hoje, config, (data) => data.dia === DIA_DA_LUA_CHEIA) },
    {
      id: 'estacao',
      rotulo: 'Próxima estação',
      dias: diasAteProximo(hoje, config, (data) => data.dia === 1 && config.estacao_por_mes[data.mes] !== config.estacao_por_mes[hoje.mes]),
    },
    ...config.dias_especiais.map((especial) => ({
      id: `especial-${especial.mes}-${especial.dia}`,
      rotulo: especial.nome,
      dias: diasAteProximo(hoje, config, (data) => data.mes === especial.mes && data.dia === especial.dia),
    })),
    { id: 'evento', rotulo: 'Próximo acontecimento', dias: proximos.find((evento) => evento.em_dias > 0)?.em_dias ?? null },
  ];
  return candidatos.filter((atalho): atalho is IAtalhoDeTempo => atalho.dias !== null);
}

/** "agora há pouco", "há 5 min", "há 2 h" ou "há 3 dias". */
export function tempoDesde(iso: string, agora: number = Date.now()): string {
  const minutos = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000));
  if (Number.isNaN(minutos) || minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 60 * 24) return `há ${Math.round(minutos / 60)} h`;
  return `há ${Math.round(minutos / (60 * 24))} dias`;
}
