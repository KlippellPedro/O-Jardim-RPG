// A conta da bandeja de dados do mapa, sem React: monta e confere a fórmula que vai para o servidor.
// O sorteio é sempre do servidor (ver registrosApi.rolar); aqui só se escreve o pedido.

export const FACES_DA_BANDEJA = [4, 6, 8, 10, 12, 20, 100] as const;
/** Mais que isto de um mesmo dado numa fórmula é engano de clique. */
export const MAXIMO_DO_MESMO_DADO = 30;
export const LIMITE_DA_FORMULA = 60;

const TERMO = String.raw`(?:\d{0,3}d\d{1,4}|\d{1,5})`;
const FORMULA = new RegExp(String.raw`^(?:\d{1,2}#)?${TERMO}(?:[+-]${TERMO})*$`, 'i');

/** Tira os espaços e põe o "d" minúsculo: "2D6 + 3" vira "2d6+3". */
export function limparFormula(formula: string): string {
  return formula.replace(/\s+/g, '').toLowerCase();
}

/** A fórmula tem pelo menos um dado e só usa o que o servidor entende (2d6+3, 1d20+1d4-2, 2#d20). */
export function formulaValida(formula: string): boolean {
  const limpa = limparFormula(formula);
  return limpa.length <= LIMITE_DA_FORMULA && limpa.includes('d') && FORMULA.test(limpa);
}

/** Mais um dado daquele tipo: soma no termo que já existe ("2d6" vira "3d6") ou acrescenta "+1dN" no fim. */
export function acrescentarDado(formula: string, faces: number): string {
  const limpa = limparFormula(formula);
  if (!limpa) return `1d${faces}`;
  const termo = new RegExp(String.raw`(^|[+#])(\d*)d${faces}(?!\d)`);
  const achado = limpa.match(termo);
  if (!achado) return `${limpa}+1d${faces}`;
  const quantos = Math.min(MAXIMO_DO_MESMO_DADO, Number(achado[2] || 1) + 1);
  return limpa.replace(termo, `${achado[1]}${quantos}d${faces}`);
}

/** O número solto no fim da fórmula (o modificador), ou 0. */
export function modificadorDaFormula(formula: string): number {
  const achado = limparFormula(formula).match(/([+-]\d{1,5})$/);
  return achado ? Number(achado[1]) : 0;
}

/** Soma `passo` ao modificador do fim da fórmula; quando ele zera, some. Sem dado nenhum, nada muda. */
export function ajustarModificador(formula: string, passo: number): string {
  const limpa = limparFormula(formula);
  if (!limpa.includes('d')) return limpa;
  const atual = modificadorDaFormula(limpa);
  const base = atual ? limpa.replace(/[+-]\d{1,5}$/, '') : limpa;
  const novo = Math.max(-999, Math.min(999, atual + passo));
  if (!novo) return base;
  return `${base}${novo > 0 ? '+' : ''}${novo}`;
}

/**
 * Um d20 sozinho, com ou sem modificador, é um teste: vai pelo caminho de teste do servidor, que aceita
 * vantagem e desvantagem e avisa a mesa do 20 e do 1 natural. Qualquer outra fórmula é rolagem livre.
 */
export function testeDeD20(formula: string): { bonus: number } | null {
  const achado = limparFormula(formula).match(/^1?d20([+-]\d{1,3})?$/);
  return achado ? { bonus: achado[1] ? Number(achado[1]) : 0 } : null;
}

interface RegistroParaResumo {
  resultado: number | null;
  detalhes?: { dados?: unknown; rolagens?: unknown } | null;
}

/** "11 (4, 4)" para mostrar no histórico da bandeja; rolagens separadas (2#d20) saem como "15 e 7". */
export function resumoDaRolagem(registro: RegistroParaResumo): string {
  const rolagens = registro.detalhes?.rolagens;
  if (Array.isArray(rolagens) && rolagens.length > 1) {
    return rolagens.map((r) => String((r as { total?: number })?.total ?? '?')).join(' e ');
  }
  const dados = Array.isArray(registro.detalhes?.dados) ? (registro.detalhes?.dados as unknown[]).filter((v) => typeof v === 'number') : [];
  const total = registro.resultado ?? '?';
  return dados.length > 1 || (dados.length === 1 && dados[0] !== registro.resultado) ? `${total} (${dados.join(', ')})` : String(total);
}
