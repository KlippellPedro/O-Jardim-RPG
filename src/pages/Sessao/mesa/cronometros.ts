import type { ICronometro } from '../../../services/mesaApi';

/** "5:00", "0:07" ou "1:02:03" quando passa de uma hora. */
export function formatarTempo(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;
  const dois = (valor: number) => String(valor).padStart(2, '0');
  return horas > 0 ? `${horas}:${dois(minutos)}:${dois(resto)}` : `${minutos}:${dois(resto)}`;
}

/** Quanto falta agora, contando a partir do instante em que a resposta chegou. */
export function restanteAgora(cronometro: Pick<ICronometro, 'restante_s' | 'situacao'>, recebidoEm: number, agora: number): number {
  if (cronometro.situacao !== 'correndo') return cronometro.restante_s;
  return Math.max(0, cronometro.restante_s - Math.floor((agora - recebidoEm) / 1000));
}

export type NivelUrgencia = 'calmo' | 'atencao' | 'urgente' | 'zerado';

/** Sobe a tensão conforme o tempo acaba: nos últimos 10 segundos (ou 15% da duração) o cartão pulsa. */
export function nivelDeUrgencia(restante: number, duracao: number, situacao: ICronometro['situacao']): NivelUrgencia {
  if (restante <= 0) return 'zerado';
  if (situacao !== 'correndo') return 'calmo';
  if (restante <= 10 || restante <= duracao * 0.15) return 'urgente';
  if (restante <= 30 || restante <= duracao * 0.35) return 'atencao';
  return 'calmo';
}

/** Duração a partir de minutos e segundos digitados; 0 quando inválida. */
export function duracaoDe(minutos: string | number, segundos: string | number): number {
  const m = Math.max(0, Math.floor(Number(minutos) || 0));
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  return m * 60 + s;
}

export const ATALHOS_DURACAO = [
  { rotulo: '30 s', segundos: 30 },
  { rotulo: '1 min', segundos: 60 },
  { rotulo: '5 min', segundos: 300 },
  { rotulo: '10 min', segundos: 600 },
  { rotulo: '30 min', segundos: 1800 },
] as const;

/** Cronômetros que chegaram a zero entre duas leituras locais (tocar o gongo uma vez só). */
export function cronometrosQueZeraram(
  cronometros: ICronometro[],
  recebidoEm: number,
  agora: number,
  jaAvisados: Set<string>,
): ICronometro[] {
  return cronometros.filter((cronometro) => {
    if (cronometro.situacao !== 'correndo') return false;
    const chave = `${cronometro.id}:${recebidoEm}`;
    if (jaAvisados.has(chave) || restanteAgora(cronometro, recebidoEm, agora) > 0) return false;
    jaAvisados.add(chave);
    return true;
  });
}
