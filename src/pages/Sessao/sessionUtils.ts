import type { IRegistro } from '../../services/registrosApi';
import type { NivelVisibilidade } from '../../services/sessaoApi';

export type RollTone = 'critical' | 'failure' | 'neutral';
export type RollFilter = 'todos' | 'rolagem' | 'dano' | 'uso';

/** Do mais fechado ao mais aberto - é a ordem que aparece nos seletores. */
export const OPCOES_VISIBILIDADE: Array<{ valor: NivelVisibilidade; rotulo: string; descricao: string }> = [
  { valor: 'oculto', rotulo: 'Oculto', descricao: 'Não aparece na cena. Ideal para emboscadas.' },
  { valor: 'desconhecido', rotulo: 'Desconhecido', descricao: 'Aparece sem nome nem número, só a posição na iniciativa.' },
  { valor: 'parcial', rotulo: 'Parcial', descricao: 'Nome e estado ("Ferido"), sem o número exato de Vida.' },
  { valor: 'total', rotulo: 'Total', descricao: 'Tudo, inclusive o número exato de Vida.' },
];

export function rotuloVisibilidade(nivel: NivelVisibilidade | null | undefined): string {
  return OPCOES_VISIBILIDADE.find((opcao) => opcao.valor === nivel)?.rotulo ?? 'Total';
}

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
