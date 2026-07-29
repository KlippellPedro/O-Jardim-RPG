import type { IRaca } from '../types/catalogo';
import { obterOpcaoRacialSelecionada } from './racaService';

export const ATRIBUTOS = ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'] as const;
export type TAtributo = typeof ATRIBUTOS[number];
export type TMetodoAtributos = 'padrao' | 'pontos' | 'rolado';

export const ROTULOS_ATRIBUTOS: Record<TAtributo, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

// O conjunto padrão custa exatamente 24 pontos quando todos os sete
// atributos começam em 8: (15-8)+(14-8)+(13-8)+(12-8)+(10-8) = 24.
export const VALORES_ATRIBUTOS_PADRAO = [15, 14, 13, 12, 10, 8, 8] as const;
export const COMPRA_PONTOS_ORCAMENTO = 24;
export const COMPRA_PONTOS_BASE = 8;
export const COMPRA_PONTOS_MAXIMO = 15;
export const ATRIBUTO_VALOR_MINIMO = 1;
export const ATRIBUTO_VALOR_MAXIMO = 20;

export function distribuirValoresAtributos(valores: readonly number[]): Record<TAtributo, number> {
  return Object.fromEntries(ATRIBUTOS.map((atributo, indice) => [
    atributo,
    Number(valores[indice]) || COMPRA_PONTOS_BASE,
  ])) as Record<TAtributo, number>;
}

export function criarCompraPontosVazia(): Record<TAtributo, number> {
  return distribuirValoresAtributos(ATRIBUTOS.map(() => COMPRA_PONTOS_BASE));
}

export function calcularPontosAtributos(atribuicao: Record<string, number>): number {
  return ATRIBUTOS.reduce(
    (total, atributo) => total + (Number(atribuicao?.[atributo]) - COMPRA_PONTOS_BASE),
    0,
  );
}

export function compraPontosValida(atribuicao: Record<string, number>): boolean {
  const valoresValidos = ATRIBUTOS.every((atributo) => {
    const valor = Number(atribuicao?.[atributo]);
    return Number.isInteger(valor) && valor >= COMPRA_PONTOS_BASE && valor <= COMPRA_PONTOS_MAXIMO;
  });
  return valoresValidos && calcularPontosAtributos(atribuicao) === COMPRA_PONTOS_ORCAMENTO;
}

export function conjuntoAtributosValido(
  atribuicao: Record<string, number>,
  valores: readonly number[],
): boolean {
  const atribuidos = ATRIBUTOS.map(atributo => Number(atribuicao?.[atributo])).sort((a, b) => a - b);
  const esperados = [...valores].map(Number).sort((a, b) => a - b);
  return atribuidos.length === esperados.length
    && atribuidos.every((valor, indice) => Number.isInteger(valor) && valor === esperados[indice]);
}

export function rolarAtributos(): number[] {
  return Array.from({ length: ATRIBUTOS.length }, () => 1 + Math.floor(Math.random() * 20));
}

export function modificador(valor: number | string): number {
  return Math.floor(((Number(valor) || 0) - 10) / 2);
}

export function normalizarAtributosIniciais(atribuicao: Record<string, number>): Record<TAtributo, number> {
  const finais = {} as Record<TAtributo, number>;
  ATRIBUTOS.forEach(chave => {
    const base = Number(atribuicao?.[chave]) || 0;
    finais[chave] = Math.max(
      ATRIBUTO_VALOR_MINIMO,
      Math.min(ATRIBUTO_VALOR_MAXIMO, base),
    );
  });
  return finais;
}

export function obterVarianteRacial(raca: IRaca | null, escolhaRacial: any = {}) {
  return obterOpcaoRacialSelecionada(raca, escolhaRacial);
}

function somarMapasNumericos(...mapas: any[]) {
  const chaves = new Set(mapas.flatMap(mapa => Object.keys(mapa || {})));
  return Object.fromEntries([...chaves].flatMap(chave => {
    const total = mapas.reduce((soma, mapa) => soma + (Number(mapa?.[chave]) || 0), 0);
    return total === 0 ? [] : [[chave, total]];
  }));
}

export function obterAjustesAtributosRaciais(raca: IRaca, escolhaRacial: any = {}) {
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const configuracao = raca?.escolha_atributos;
  const campo = String(configuracao?.campo || 'atributosRaciais');
  const total = Math.max(0, Math.trunc(Number(configuracao?.total) || 0));
  const bonus = Number(configuracao?.bonus_por_escolha) || 0;
  
  const rawChoices = Array.isArray(escolhaRacial?.[campo]) ? escolhaRacial[campo] : [];
  const escolhas = [...new Set(rawChoices.filter((a: any) => ATRIBUTOS.includes(a as TAtributo)))].slice(0, total);
  
  const ajustesEscolhidos = Object.fromEntries(escolhas.map(atributo => [atributo, bonus]));
  return somarMapasNumericos(
    raca?.ajustes_atributos,
    variante?.ajustes_atributos,
    ajustesEscolhidos,
  );
}

export function aplicarAjusteAtributoRacial(valorBase: number, ajuste = 0, limite: number | null = null) {
  const base = Number(valorBase) || 0;
  const bonus = Number(ajuste);
  if (!Number.isFinite(bonus) || bonus === 0) return base;

  const teto = Number(limite);
  if (!Number.isFinite(teto) || bonus < 0) {
    return Math.max(ATRIBUTO_VALOR_MINIMO, base + bonus);
  }
  return Math.max(
    ATRIBUTO_VALOR_MINIMO,
    base + Math.min(bonus, Math.max(0, teto - base)),
  );
}

export function aplicarAjustesAtributosRaciais(atributosFinais: Record<string, number>, raca: IRaca, escolhaRacial: any = {}) {
  const ajustes = obterAjustesAtributosRaciais(raca, escolhaRacial);
  // Omitindo limitadores estritos por agora para simplificar Wizard
  return Object.fromEntries(ATRIBUTOS.map(chave => [
    chave,
    aplicarAjusteAtributoRacial(
      atributosFinais?.[chave],
      ajustes[chave],
      null, // Limites can be implemented fully later if needed
    ),
  ]));
}

export const TABELA_XP = Array.from(
  { length: 40 },
  (_, indice) => 500 * (indice + 1) * indice,
);

export function nivelPorXp(xp: number) {
  const valor = typeof xp === 'number' && xp >= 0 ? xp : 0;
  let nivel = 1;
  TABELA_XP.forEach((limite, indice) => {
    if (valor >= limite) nivel = indice + 1;
  });
  return nivel;
}

export function obterFragmentosRaciaisExpressos(_raca: IRaca | null, _escolhaRacial: any = {}) {
  // Simplified for Phase 1
  return [];
}

export function obterModificacoesRaciaisInstaladas(_raca: IRaca | null, _escolhaRacial: any = {}, _nivel = 1) {
  // Simplified for Phase 1
  return [];
}

export function calcularDerivados(atributosFinais: Record<string, number>, raca: IRaca | null, nivel = 1, escolhaRacial: any = {}) {
  const atributosEfetivos = raca ? aplicarAjustesAtributosRaciais(atributosFinais, raca, escolhaRacial) : atributosFinais;
  const metadeNivel = Math.floor(Math.max(1, Number(nivel) || 1) / 2);
  
  const modForca = modificador(atributosEfetivos.forca);
  const modDestreza = modificador(atributosEfetivos.destreza);
  const modConstituicao = modificador(atributosEfetivos.constituicao);
  const modInteligencia = modificador(atributosEfetivos.inteligencia);
  const modSabedoria = modificador(atributosEfetivos.sabedoria);
  
  const varianteRacial = obterVarianteRacial(raca, escolhaRacial);
  
  const baseVidaRaca = Number(raca?.vida) || 0;
  const baseVidaVariante = Number(varianteRacial?.vida) || 0;
  const bonusVidaRacial = baseVidaRaca + baseVidaVariante;

  const baseManaRaca = Number(raca?.mana) || 0;
  const baseManaVariante = Number(varianteRacial?.mana) || 0;
  const bonusManaRacial = baseManaRaca + baseManaVariante;

  const baseMovimentoRaca = Number(raca?.movimento) || 0;
  const baseMovimentoVariante = Number(varianteRacial?.movimento) || 0;
  const bonusMovimentoRacial = baseMovimentoRaca + baseMovimentoVariante;

  const bonusVidaVariantePorNivel = (Number(varianteRacial?.vida_por_nivel) || 0) * Math.max(1, Number(nivel) || 1);

  const movimentoFixo = Number(varianteRacial?.movimento_fixo);
  const movimentoBase = Number.isFinite(movimentoFixo)
    ? movimentoFixo
    : 9 + (1.5 * modDestreza) + bonusMovimentoRacial;

  return {
    vida: Math.max(1, 10 + (2 * modForca) + (2 * modConstituicao) + bonusVidaRacial + bonusVidaVariantePorNivel),
    mana: Math.max(1, 6 + (2 * modInteligencia) + modSabedoria + bonusManaRacial),
    movimento: Math.max(4.5, movimentoBase),
    defesaNatural: 10 + metadeNivel + modDestreza,
    iniciativa: 10 + metadeNivel + modDestreza,
  };
}
