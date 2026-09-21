import type { ChaveEstacao, IEventoCalendario } from '../../services/calendarioMundoApi';

export const ESTACOES_DO_ANO: ChaveEstacao[] = ['primavera', 'verao', 'outono', 'inverno'];

export const COR_DA_ESTACAO: Record<ChaveEstacao, string> = {
  primavera: '#4ade80',
  verao: '#fbbf24',
  outono: '#fb923c',
  inverno: '#7dd3fc',
  noite_eterna: '#818cf8',
  eclipse: '#c084fc',
};

/** Navega de mês em mês virando o ano (12 meses por ano). */
export function somarMes(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const total = ano * 12 + mes + delta;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

/** "hoje", "amanhã" ou "em 12 dias". */
export function textoEmDias(dias: number): string {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

/** Rótulo curto para o Mestre: grau de revelação e se repete todo ano. */
export function rotuloDoEvento(evento: Pick<IEventoCalendario, 'revelacao' | 'anual'>): string {
  const grau = evento.revelacao === 'oculto' ? 'oculto' : evento.revelacao === 'rasurado' ? 'rasurado' : 'aberto';
  return `${grau}${evento.anual ? ' · todo ano' : ''}`;
}
