/**
 * Ambiente na ficha: clima, fome e sede e fôlego (Perigos do Ambiente).
 *
 * Os números vêm todos de data/regras/perigosAmbiente.ts; aqui só fica o que a
 * ficha precisa guardar (`ficha.ambiente`) e as contas que transformam um
 * "falhei no teste" num novo `ficha.status`. Nada trava: a ficha mostra a
 * consequência e aplica quando o jogador aperta, como o botão de combate intenso.
 */
import {
  GRAUS_DE_CLIMA,
  custoDeFolego,
  danoDeClima,
  diasDeFolgaSemComida,
  dtDeSufocar,
  grauEfetivoDeClima,
  type GrauDeClima,
  type IGrauDeClima,
} from '../../data/regras/perigosAmbiente';
import { atualizarStatusVital, limiteMorrendo, type IStatusVital } from './statusService';

export type TipoDeClima = 'frio' | 'calor';

export interface IClimaFicha {
  /** Grau do lugar onde o personagem está; nulo quando o clima não pesa. */
  grau: GrauDeClima | null;
  tipo: TipoDeClima;
  roupaCerta: boolean;
  /** Traje com Resistência contra este clima. */
  traje: boolean;
  abrigo: boolean;
}

export interface IFomeFicha {
  diasSemComer: number;
  diasSemBeber: number;
}

export interface IFolegoFicha {
  semAr: boolean;
  /** Rodadas seguidas sem ar depois que a Estamina acabou. */
  rodadasSufocando: number;
}

export interface IAmbienteFicha {
  clima: IClimaFicha;
  fome: IFomeFicha;
  folego: IFolegoFicha;
}

/** O Traje do catálogo dá Resistência 5 contra Frio ou Calor. */
export const RESISTENCIA_DO_TRAJE = 5;

export const AMBIENTE_PADRAO: IAmbienteFicha = {
  clima: { grau: null, tipo: 'frio', roupaCerta: false, traje: false, abrigo: false },
  fome: { diasSemComer: 0, diasSemBeber: 0 },
  folego: { semAr: false, rodadasSufocando: 0 },
};

const GRAUS_VALIDOS = new Set<string>(GRAUS_DE_CLIMA.map((grau) => grau.id));
const inteiroPositivo = (valor: unknown, teto = 999) => {
  const numero = Math.trunc(Number(valor));
  return Number.isFinite(numero) ? Math.max(0, Math.min(teto, numero)) : 0;
};

/** Aceita o que estiver salvo na ficha e devolve um ambiente utilizável. */
export function normalizarAmbiente(bruto: unknown): IAmbienteFicha {
  const dados = bruto && typeof bruto === 'object' ? bruto as Record<string, any> : {};
  const clima = dados.clima && typeof dados.clima === 'object' ? dados.clima : {};
  const fome = dados.fome && typeof dados.fome === 'object' ? dados.fome : {};
  const folego = dados.folego && typeof dados.folego === 'object' ? dados.folego : {};
  return {
    clima: {
      grau: GRAUS_VALIDOS.has(String(clima.grau)) ? clima.grau as GrauDeClima : null,
      tipo: clima.tipo === 'calor' ? 'calor' : 'frio',
      roupaCerta: clima.roupaCerta === true,
      traje: clima.traje === true,
      abrigo: clima.abrigo === true,
    },
    fome: {
      diasSemComer: inteiroPositivo(fome.diasSemComer),
      diasSemBeber: inteiroPositivo(fome.diasSemBeber),
    },
    folego: {
      semAr: folego.semAr === true,
      rodadasSufocando: inteiroPositivo(folego.rodadasSufocando),
    },
  };
}

// ------------------------------------------------------------------ clima

export interface IResumoDoClima {
  /** Grau que vale depois da roupa, do Traje e do abrigo. */
  efetivo: IGrauDeClima | null;
  /** Dano de ambiente da falha (Extremo) ou do fim de turno (Mortal), já sem a Resistência do Traje. */
  dano: number;
  /** O que a proteção fez, em palavras. */
  protecao: string | null;
}

export function resumoDoClima(clima: IClimaFicha, vidaMaxima: number): IResumoDoClima {
  if (!clima.grau) return { efetivo: null, dano: 0, protecao: null };
  const id = grauEfetivoDeClima(clima.grau, { roupaCerta: clima.roupaCerta, traje: clima.traje, abrigo: clima.abrigo });
  const efetivo = GRAUS_DE_CLIMA.find((grau) => grau.id === id) ?? null;
  const bruto = id ? danoDeClima(id, vidaMaxima) : 0;
  const dano = Math.max(0, bruto - (clima.traje && bruto > 0 ? RESISTENCIA_DO_TRAJE : 0));
  let protecao: string | null = null;
  if (clima.abrigo) protecao = 'O abrigo suspende os testes enquanto você estiver nele.';
  else if (clima.traje) protecao = id ? 'O Traje desce o clima um grau e subtrai 5 do dano.' : 'O Traje anula este clima.';
  else if (clima.roupaCerta && clima.grau === 'severo') protecao = 'A roupa certa anula o clima Severo.';
  else if (clima.roupaCerta) protecao = 'A roupa certa só anula o Severo; aqui ela não basta.';
  return { efetivo, dano, protecao };
}

export interface IConsequenciaDoClima {
  cansaco: number;
  dano: number;
  /** Condição de longo prazo que a falha deixa, quando deixa. */
  condicao: 'congelamento' | null;
}

/** O que uma falha (ou o fim de um turno, no Mortal) custa. */
export function consequenciaDoClima(
  clima: IClimaFicha,
  vidaMaxima: number,
  { critica = false }: { critica?: boolean } = {},
): IConsequenciaDoClima {
  const { efetivo, dano } = resumoDoClima(clima, vidaMaxima);
  if (!efetivo) return { cansaco: 0, dano: 0, condicao: null };
  if (efetivo.id === 'mortal') return { cansaco: 0, dano, condicao: null };
  if (efetivo.id === 'severo') return { cansaco: 1, dano: 0, condicao: null };
  return {
    cansaco: critica && clima.tipo === 'calor' ? 2 : 1,
    dano,
    condicao: critica && clima.tipo === 'frio' ? 'congelamento' : null,
  };
}

// ---------------------------------------------------------- fome e sede

export function fimDoDiaSemComer(fome: IFomeFicha, modConstituicao: number): { fome: IFomeFicha; cansaco: number } {
  const dias = fome.diasSemComer + 1;
  return { fome: { ...fome, diasSemComer: dias }, cansaco: dias > diasDeFolgaSemComida(modConstituicao) ? 1 : 0 };
}

export function fimDoDiaSemBeber(fome: IFomeFicha): { fome: IFomeFicha; cansaco: number } {
  return { fome: { ...fome, diasSemBeber: fome.diasSemBeber + 1 }, cansaco: 1 };
}

/** A causa continua enquanto um dos dois contadores pesa: o Cansaço dela não sai no descanso. */
export function fomeOuSedePesando(fome: IFomeFicha, modConstituicao: number): boolean {
  return fome.diasSemBeber > 0 || fome.diasSemComer > diasDeFolgaSemComida(modConstituicao);
}

// ----------------------------------------------------------------- fôlego

export type RodadaSemAr = 'normal' | 'esforco' | 'surpresa';

export function custoDaRodadaSemAr(estaminaMaxima: number, rodada: RodadaSemAr): number {
  return custoDeFolego(estaminaMaxima, { esforco: rodada === 'esforco', surpresa: rodada === 'surpresa' });
}

/** Gasta a Estamina de uma rodada sem ar. Quando ela já está em 0, a rodada
 *  passa a pedir Fortitude, e quem chama deve contar `rodadasSufocando`. */
export function gastarFolego(status: IStatusVital, estaminaMaxima: number, rodada: RodadaSemAr): { status: IStatusVital; sufocando: boolean } {
  const atual = Math.max(0, Number(status.estaminaAtual ?? estaminaMaxima) || 0);
  if (atual <= 0) return { status, sufocando: true };
  const custo = custoDaRodadaSemAr(estaminaMaxima, rodada);
  return { status: { ...status, estaminaAtual: Math.max(0, atual - custo) }, sufocando: false };
}

/** A DT do livro é a do nível 1; a ficha soma o ajuste do nível do personagem. */
export const dtDaRodadaSufocando = (rodadasSufocando: number, ajusteDeDt = 0) => dtDeSufocar(rodadasSufocando + 1) + ajusteDeDt;

/** A primeira falha sem ar: a Vida cai a 0 e começa o Morrendo 1. */
export function apagarSemAr(status: IStatusVital, vidaMaxima: number, constituicao: unknown): IStatusVital {
  const vida = Number(status.vidaAtual ?? vidaMaxima) || 0;
  if (vida > 0) return atualizarStatusVital(status, 'vidaAtual', -vida, vidaMaxima, constituicao, { ignorarTemporario: true });
  return { ...status, morrendo: Math.max(1, Number(status.morrendo) || 0) };
}

/** Fim de turno sem ar depois de apagar: o Morrendo sobe 1, sem teste. */
export function morrendoSemAr(status: IStatusVital, constituicao: unknown): IStatusVital {
  const limite = limiteMorrendo(constituicao);
  const morrendo = Math.min(limite, (Number(status.morrendo) || 0) + 1);
  return { ...status, morrendo, morto: morrendo >= limite ? true : status.morto, estabilizado: false };
}

// ------------------------------------------------------------- inventário

/** Porções de Ração de viagem no inventário central, para a ficha mostrar o que ainda há. */
export function racoesNoInventario(inventario: unknown): number {
  if (!Array.isArray(inventario)) return 0;
  return inventario.reduce((total, item) => {
    const nome = String(item?.nome ?? item?.titulo ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (!nome.includes('racao de viagem')) return total;
    return total + Math.max(0, Math.trunc(Number(item?.quantidade) || 1));
  }, 0);
}
