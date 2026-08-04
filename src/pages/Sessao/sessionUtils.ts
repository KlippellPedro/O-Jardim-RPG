import type { IRegistro } from '../../services/registrosApi';

export type RollTone = 'critical' | 'failure' | 'neutral';
export type RollFilter = 'todos' | 'rolagem' | 'dano' | 'uso';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getRollTone(registro: IRegistro): RollTone {
  const details = isRecord(registro.detalhes) ? registro.detalhes : {};
  if (details.critico_natural === true) return 'critical';
  if (details.falha_natural === true) return 'failure';
  return 'neutral';
}

export function getRollBreakdown(registro: IRegistro): string | null {
  const details = isRecord(registro.detalhes) ? registro.detalhes : {};
  const dice = Array.isArray(details.dados)
    ? details.dados.filter((value): value is number => typeof value === 'number')
    : [];
  const bonus = typeof details.bonus === 'number' ? details.bonus : null;
  if (!dice.length) return null;
  const diceText = dice.join(', ');
  const bonusText = bonus === null || bonus === 0 ? '' : ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}`;
  return `Dados: ${diceText}${bonusText}`;
}

export function matchesRollFilter(registro: IRegistro, filter: RollFilter): boolean {
  if (filter === 'todos') return true;
  if (filter === 'rolagem') return registro.tipo === 'rolagem';
  if (filter === 'dano') return registro.tipo === 'dano';
  return registro.tipo !== 'rolagem' && registro.tipo !== 'dano';
}

export function validateDiceFormula(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return 'Informe uma expressão, como 1d20 ou 2d6+3.';
  if (normalized.length > 20) return 'A expressão pode ter no máximo 20 caracteres.';
  if (!/^(?:[1-9]\d?#)?[+-]?(?:(?:\d*)d\d+|\d+)(?:[+-](?:(?:\d*)d\d+|\d+))*$/.test(normalized)) {
    return 'Use dados e modificadores, como 1d20, 2d6+3 ou 2#d20.';
  }
  return null;
}

export function roleLabel(role: string | null): string {
  const labels: Record<string, string> = {
    mestre: 'Mestre',
    assistente: 'Assistente',
    jogador: 'Jogador',
    player: 'Jogador',
    observador: 'Observador',
  };
  return role ? labels[role] ?? role : 'Participante';
}
