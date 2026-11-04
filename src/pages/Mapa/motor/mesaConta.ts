// Contas dos extras da mesa, sem React (para testar): cronômetro e relógio novo.

import type { ICronometroMesa, IRelogioMesa } from '../../../services/mapaApi';

/** Quanto falta no cronômetro (ms), pelo relógio do servidor. Nunca menos que zero. */
export function faltaNoCronometro(cronometro: ICronometroMesa, agoraServidor: number): number {
  if (cronometro.fim !== null) return Math.max(0, cronometro.fim - agoraServidor);
  return Math.max(0, cronometro.restante ?? 0);
}

/** "4:05", ou "1:02:09" passando de uma hora. Arredonda para cima: o zero só aparece no fim. */
export function textoDoCronometro(cronometro: ICronometroMesa, agoraServidor: number): string {
  const total = Math.ceil(faltaNoCronometro(cronometro, agoraServidor) / 1000);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const ss = String(segundos).padStart(2, '0');
  return horas ? `${horas}:${String(minutos).padStart(2, '0')}:${ss}` : `${minutos}:${ss}`;
}

export function relogioNovo(nome: string, partes: number): IRelogioMesa {
  return {
    id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    nome: nome.trim() || 'Relógio',
    partes: Math.max(2, Math.min(12, Math.round(partes))),
    cheias: 0,
    visivel: true,
  };
}
