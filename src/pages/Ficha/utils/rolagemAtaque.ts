import { formulaDanoCritico } from '../../../services/criticalService';

const semAcento = (texto: string) => texto
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

export const TIPO_CORPO_A_CORPO = 'Corpo a Corpo';
export const TIPO_DISTANCIA = 'Distância';

/** Limite de tamanho que o servidor aceita para a fórmula de dano. */
export const LIMITE_FORMULA_DANO = 60;

/**
 * Como a arma ataca. `tipoAtaque` é a escolha explícita do jogador; sem ela vale o `modo` do catálogo
 * (À distância, Corpo a corpo ou Híbrida). Arma híbrida começa corpo a corpo e o jogador troca na hora de atacar.
 */
export function tipoAtaqueDaArma(dados: Record<string, any> | null | undefined): { tipo: string; hibrida: boolean } {
  const explicito = String(dados?.tipoAtaque || '').trim();
  if (explicito) return { tipo: explicito, hibrida: false };
  const modo = semAcento(String(dados?.modo || ''));
  if (modo.includes('hibrid')) return { tipo: TIPO_CORPO_A_CORPO, hibrida: true };
  if (modo.includes('dist')) return { tipo: TIPO_DISTANCIA, hibrida: false };
  return { tipo: TIPO_CORPO_A_CORPO, hibrida: false };
}

export const ATRIBUTOS_DANO: ReadonlyArray<{ id: string; nome: string }> = [
  { id: 'forca', nome: 'Força' },
  { id: 'destreza', nome: 'Destreza' },
  { id: 'constituicao', nome: 'Constituição' },
  { id: 'inteligencia', nome: 'Inteligência' },
  { id: 'sabedoria', nome: 'Sabedoria' },
  { id: 'carisma', nome: 'Carisma' },
  { id: 'fluxo', nome: 'Fluxo' },
];

/** `auto` segue o atributo da perícia de combate (Luta ou Pontaria), então uma troca de atributo na ficha vale para o dano também. */
export const ATRIBUTO_DANO_AUTO = 'auto';

export interface IConfigDanoTipo {
  ativo: boolean;
  atributo: string;
}

export interface IConfigDanoAtaque {
  corpo: IConfigDanoTipo;
  distancia: IConfigDanoTipo;
}

/** Corpo a corpo soma o atributo da perícia por padrão. À distância vem desligado: somar atributo ali é raro. */
export const CONFIG_DANO_PADRAO: IConfigDanoAtaque = {
  corpo: { ativo: true, atributo: ATRIBUTO_DANO_AUTO },
  distancia: { ativo: false, atributo: ATRIBUTO_DANO_AUTO },
};

const ids_atributo = new Set(ATRIBUTOS_DANO.map((atributo) => atributo.id));

/** Lê a configuração salva na ficha, caindo no padrão para o que faltar ou vier inválido. */
export function normalizarConfigDano(bruto: unknown): IConfigDanoAtaque {
  const origem = bruto && typeof bruto === 'object' ? (bruto as Record<string, any>) : {};
  const ler = (chave: 'corpo' | 'distancia'): IConfigDanoTipo => {
    const dado = origem[chave] && typeof origem[chave] === 'object' ? origem[chave] : {};
    const atributo = String(dado.atributo ?? '');
    return {
      ativo: typeof dado.ativo === 'boolean' ? dado.ativo : CONFIG_DANO_PADRAO[chave].ativo,
      atributo: ids_atributo.has(atributo) ? atributo : ATRIBUTO_DANO_AUTO,
    };
  };
  return { corpo: ler('corpo'), distancia: ler('distancia') };
}

/** Atributo que entra no dano: o configurado, ou o da perícia de combate quando está em `auto`. */
export function resolverAtributoDano(
  config: IConfigDanoAtaque,
  tipoAtaque: string,
  atributoDaPericia: string,
): { ativo: boolean; atributoId: string } {
  const regra = tipoAtaque === TIPO_CORPO_A_CORPO ? config.corpo : config.distancia;
  return { ativo: regra.ativo, atributoId: regra.atributo === ATRIBUTO_DANO_AUTO ? atributoDaPericia : regra.atributo };
}

const TERMO = '(?:\\d*d\\d+|\\d+)';
const EXPRESSAO_EXTRA = new RegExp(`^[+-]?${TERMO}(?:[+-]${TERMO})*$`, 'i');

/** Confere o dado ou bônus extra digitado (`1d4`, `+2`, `-1d6`, `1d4+1`). Vazio é válido e significa "sem extra". */
export function validarDadoExtra(texto: string): { ok: boolean; formula: string } {
  const limpo = String(texto || '').replace(/\s+/g, '').toLowerCase();
  if (!limpo) return { ok: true, formula: '' };
  if (limpo.length > 30 || !EXPRESSAO_EXTRA.test(limpo)) return { ok: false, formula: '' };
  return { ok: true, formula: limpo };
}

const comSinal = (valor: number) => (valor >= 0 ? `+${valor}` : String(valor));
const juntar = (expressao: string) => (/^[+-]/.test(expressao) ? expressao : `+${expressao}`);

export interface IEntradaDano {
  /** Fórmula escrita na arma (`1d4`, `2d6+1`). */
  dano: string;
  /** Modificador de atributo somado ao golpe. Corpo a corpo soma Força; à distância não soma nada. */
  modificadorAtributo?: number;
  /** Bônus de dano vindo de itens, poderes e habilidades. */
  bonusEquipamento?: number;
  /** O que as condições em vigor tiram do dano (Enfraquecido). */
  ajusteCondicoes?: number;
  /** Bônus pontual que o jogador acrescentou na hora. */
  bonusExtra?: number;
  /** Dado pontual (`1d6`). Não multiplica no crítico. */
  dadoExtra?: string;
  critico?: boolean;
  multiplicadorCritico?: number;
}

export interface IMontagemDano {
  formula: string;
  /** Fórmula sem crítico, usada no registro como referência. */
  formulaBase: string;
  erro?: string;
}

/**
 * Monta a fórmula que o servidor rola. No crítico só os dados da arma são multiplicados: bônus fixos entram uma
 * vez e dado extra só multiplica quando a fonte disser, então ele fica de fora da multiplicação.
 */
export function montarDano(entrada: IEntradaDano): IMontagemDano {
  const base = String(entrada.dano || '').replace(/\s+/g, '').toLowerCase();
  if (!base) return { formula: '', formulaBase: '', erro: 'Esta arma não tem dano informado.' };
  const extra = validarDadoExtra(entrada.dadoExtra || '');
  if (!extra.ok) return { formula: '', formulaBase: '', erro: 'Dado extra inválido. Use algo como 1d4, +2 ou -1d6.' };

  const fixo = Math.trunc(Number(entrada.modificadorAtributo) || 0)
    + Math.trunc(Number(entrada.bonusEquipamento) || 0)
    + Math.trunc(Number(entrada.ajusteCondicoes) || 0)
    + Math.trunc(Number(entrada.bonusExtra) || 0);
  const resto = `${fixo !== 0 ? comSinal(fixo) : ''}${extra.formula ? juntar(extra.formula) : ''}`;
  const formulaBase = `${base}${resto}`;
  const dadosDaArma = entrada.critico ? formulaDanoCritico(base, entrada.multiplicadorCritico) || base : base;
  const formula = `${dadosDaArma}${resto}`;
  if (formula.length > LIMITE_FORMULA_DANO) {
    return { formula: '', formulaBase, erro: 'A fórmula ficou longa demais. Tire algum dado ou bônus extra.' };
  }
  return { formula, formulaBase };
}

/** Saldo de vantagens e desvantagens: as fontes se anulam uma a uma, como no servidor. */
export function resumirVantagens(vantagens: number, desvantagens: number): {
  saldo: number;
  modo: 'vantagem' | 'desvantagem' | 'normal';
  texto: string;
} {
  const saldo = Math.max(0, vantagens) - Math.max(0, desvantagens);
  if (saldo > 0) return { saldo, modo: 'vantagem', texto: `Vantagem: 2d20, vale o maior (${vantagens}V − ${desvantagens}D)` };
  if (saldo < 0) return { saldo, modo: 'desvantagem', texto: `Desvantagem: 2d20, vale o menor (${vantagens}V − ${desvantagens}D)` };
  return {
    saldo,
    modo: 'normal',
    texto: vantagens > 0 || desvantagens > 0 ? `Fontes se anulam (${vantagens}V − ${desvantagens}D): 1d20` : '1d20',
  };
}
