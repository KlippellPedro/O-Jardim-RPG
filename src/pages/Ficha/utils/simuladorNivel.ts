import { ATRIBUTOS, ROTULOS_ATRIBUTOS, TABELA_XP, modificador, type TAtributo } from '../../../services/calculoService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../../services/catalogoService';
import { formatarRecompensaClasse } from '../../../services/classeService';
import { obterEstagiosRaciaisAlcancados } from '../../../services/racaService';
import {
  podeSelecionarPoder,
  selecoesPoderValidas,
  vagasPoderDaClasse,
} from '../../../services/progressaoFichaService';
import { recalcularDerivadosSalvos } from '../../../store/useCharacterStore';
import type { IClasse, IPoderClasse } from '../../../types/catalogo';

export const NIVEL_MAXIMO_SIMULADO = 20;
export const AJUSTE_ATRIBUTO_MAXIMO = 10;

export interface ISlotClasse {
  classeId: string;
  nivel: number;
}

/** O que a pessoa quer testar: outro nível em cada classe e pontos a mais ou a
 * menos em cada atributo. Nada disso é gravado na ficha. */
export interface ICenarioSimulacao {
  niveis: Record<string, number>;
  atributos: Partial<Record<TAtributo, number>>;
}

export type FormatoLinha = 'inteiro' | 'decimal' | 'modificador';

export interface ILinhaComparacao {
  chave: string;
  grupo: 'recursos' | 'atributos';
  rotulo: string;
  atual: number;
  simulado: number;
  delta: number;
  formato: FormatoLinha;
}

export interface IRecompensasDoNivel {
  nivel: number;
  classeId: string;
  classeTitulo: string;
  itens: string[];
}

export type SituacaoPoder = 'agora' | 'libera' | 'bloqueado';

export interface IOpcaoPoder {
  id: string;
  titulo: string;
  custoMana: number;
  descricao: string;
  situacao: SituacaoPoder;
  /** Por que não dá para escolher, quando `situacao` é 'bloqueado'. */
  motivo?: string;
}

export interface IPoderesDaClasse {
  classeId: string;
  classeTitulo: string;
  vagasAtuais: number;
  vagasSimuladas: number;
  vagasLivresAtuais: number;
  vagasLivresSimuladas: number;
  opcoes: IOpcaoPoder[];
}

export interface IResultadoSimulacao {
  nivelAtual: number;
  nivelSimulado: number;
  linhas: ILinhaComparacao[];
  recompensas: IRecompensasDoNivel[];
  poderes: IPoderesDaClasse[];
  novosEstagiosRaciais: string[];
  xp: { atual: number; necessario: number; faltam: number };
  /** Falso quando o cenário é idêntico à ficha (nada a comparar). */
  mudou: boolean;
}

const limitarNivel = (valor: unknown) =>
  Math.max(1, Math.min(NIVEL_MAXIMO_SIMULADO, Math.trunc(Number(valor) || 1)));

export function limitarAjusteAtributo(valor: unknown): number {
  const numero = Math.trunc(Number(valor) || 0);
  return Math.max(-AJUSTE_ATRIBUTO_MAXIMO, Math.min(AJUSTE_ATRIBUTO_MAXIMO, numero));
}

/** As classes da ficha na forma {classeId, nivel}, com o mesmo fallback da
 * ficha antiga que só tinha `classeId`. */
export function slotsDaFicha(ficha: any): ISlotClasse[] {
  const brutos: Array<{ classeId?: string; id?: string; nivel?: number }> = Array.isArray(ficha?.classes) && ficha.classes.length
    ? ficha.classes
    : ficha?.classeId ? [{ classeId: ficha.classeId, nivel: ficha.nivel || 1 }] : [];
  return brutos
    .map((slot) => ({ classeId: String(slot.classeId || slot.id || ''), nivel: limitarNivel(slot.nivel) }))
    .filter((slot) => slot.classeId);
}

export const cenarioInicial = (ficha: any): ICenarioSimulacao => ({
  niveis: Object.fromEntries(slotsDaFicha(ficha).map((slot) => [slot.classeId, slot.nivel])),
  atributos: {},
});

/** O simulador só olha para frente: nunca fica abaixo do nível que a ficha já tem. */
const nivelDoCenario = (slot: ISlotClasse, cenario: ICenarioSimulacao) =>
  Math.max(slot.nivel, limitarNivel(cenario.niveis[slot.classeId] ?? slot.nivel));

const houveMudanca = (ficha: any, cenario: ICenarioSimulacao) => {
  const niveisDiferem = slotsDaFicha(ficha).some((slot) => nivelDoCenario(slot, cenario) !== slot.nivel);
  const atributosDiferem = ATRIBUTOS.some((atributo) => limitarAjusteAtributo(cenario.atributos[atributo]) !== 0);
  return niveisDiferem || atributosDiferem;
};

/** Ficha idêntica à real, só com os níveis e atributos do cenário. */
export function aplicarCenario(ficha: any, cenario: ICenarioSimulacao): Record<string, any> {
  const slots = slotsDaFicha(ficha).map((slot) => ({
    ...slot,
    nivel: nivelDoCenario(slot, cenario),
  }));
  const atributosBase = ficha?.atributosFinais && typeof ficha.atributosFinais === 'object' ? ficha.atributosFinais : {};
  const atributosFinais = { ...atributosBase };
  ATRIBUTOS.forEach((atributo) => {
    const delta = limitarAjusteAtributo(cenario.atributos[atributo]);
    if (delta !== 0) atributosFinais[atributo] = Math.max(1, Number(atributosBase[atributo] ?? 10) + delta);
  });
  return {
    ...ficha,
    classes: slots,
    nivel: slots.reduce((total, slot) => total + slot.nivel, 0) || ficha?.nivel || 1,
    atributosFinais,
  };
}

const RECURSOS: Array<{ chave: string; rotulo: string; formato: FormatoLinha }> = [
  { chave: 'vida', rotulo: 'Vida', formato: 'inteiro' },
  { chave: 'mana', rotulo: 'Mana', formato: 'inteiro' },
  { chave: 'defesaNatural', rotulo: 'Defesa natural', formato: 'inteiro' },
  { chave: 'iniciativa', rotulo: 'Iniciativa', formato: 'inteiro' },
  { chave: 'movimento', rotulo: 'Movimento (m)', formato: 'decimal' },
];

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

function classificarPoder(
  poder: IPoderClasse,
  classe: IClasse,
  fichaAtual: any,
  fichaSimulada: any,
  nivelAtual: number,
  nivelSimulado: number,
): IOpcaoPoder {
  const selecoes = selecoesPoderValidas(fichaAtual);
  const agora = podeSelecionarPoder(poder, classe, nivelAtual, selecoes, fichaAtual);
  const simulado = podeSelecionarPoder(poder, classe, nivelSimulado, selecoes, fichaSimulada);
  const situacao: SituacaoPoder = agora.permitido ? 'agora' : simulado.permitido ? 'libera' : 'bloqueado';
  return {
    id: poder.id,
    titulo: poder.titulo,
    custoMana: Math.max(0, Number(poder.custo_mana) || 0),
    descricao: poder.descricao,
    situacao,
    motivo: situacao === 'bloqueado' ? simulado.motivo : undefined,
  };
}

const ORDEM_SITUACAO: Record<SituacaoPoder, number> = { libera: 0, agora: 1, bloqueado: 2 };

/** Compara a ficha de hoje com um cenário: recursos, atributos, o que a classe
 * entrega nos níveis novos, os poderes que passam a poder ser escolhidos e
 * quanto XP falta. Só lê a ficha, nunca escreve nela. */
export function simularCenario(ficha: any, cenario: ICenarioSimulacao): IResultadoSimulacao {
  const slots = slotsDaFicha(ficha);
  const fichaSimulada = aplicarCenario(ficha, cenario);
  const slotsSimulados = slotsDaFicha(fichaSimulada);
  const nivelAtual = slots.reduce((total, slot) => total + slot.nivel, 0) || Number(ficha?.nivel) || 1;
  const nivelSimulado = slotsSimulados.reduce((total, slot) => total + slot.nivel, 0) || nivelAtual;

  const base = recalcularDerivadosSalvos(ficha)?.derivados ?? {};
  const simulada = recalcularDerivadosSalvos(fichaSimulada)?.derivados ?? {};

  const linhas: ILinhaComparacao[] = RECURSOS.map(({ chave, rotulo, formato }) => {
    const atual = arredondar(Number(base[chave]) || 0);
    const simulado = arredondar(Number(simulada[chave]) || 0);
    return { chave, grupo: 'recursos', rotulo, atual, simulado, delta: arredondar(simulado - atual), formato };
  });
  ATRIBUTOS.forEach((atributo) => {
    const antes = Number(ficha?.atributosFinais?.[atributo] ?? 10);
    const depois = Number(fichaSimulada.atributosFinais?.[atributo] ?? 10);
    if (antes === depois) return;
    linhas.push({
      chave: atributo,
      grupo: 'atributos',
      rotulo: ROTULOS_ATRIBUTOS[atributo],
      atual: modificador(antes),
      simulado: modificador(depois),
      delta: modificador(depois) - modificador(antes),
      formato: 'modificador',
    });
  });

  const recompensas: IRecompensasDoNivel[] = [];
  const poderes: IPoderesDaClasse[] = [];
  slots.forEach((slot, indice) => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === slot.classeId);
    if (!classe) return;
    const nivelNovo = slotsSimulados[indice]?.nivel ?? slot.nivel;
    (classe.progressao || [])
      .filter((marco) => marco.nivel > slot.nivel && marco.nivel <= nivelNovo && marco.recompensas?.length)
      .forEach((marco) => recompensas.push({
        nivel: marco.nivel,
        classeId: classe.id,
        classeTitulo: classe.titulo,
        itens: marco.recompensas.map(formatarRecompensaClasse),
      }));

    const escolhidos = selecoesPoderValidas(ficha).filter((item) => item.classeId === classe.id).length;
    const vagasAtuais = vagasPoderDaClasse(classe, slot.nivel);
    const vagasSimuladas = vagasPoderDaClasse(classe, nivelNovo);
    if (!classe.poderes?.length && vagasSimuladas === vagasAtuais) return;
    poderes.push({
      classeId: classe.id,
      classeTitulo: classe.titulo,
      vagasAtuais,
      vagasSimuladas,
      vagasLivresAtuais: Math.max(0, vagasAtuais - escolhidos),
      vagasLivresSimuladas: Math.max(0, vagasSimuladas - escolhidos),
      opcoes: (classe.poderes || [])
        .map((poder) => classificarPoder(poder, classe, ficha, fichaSimulada, slot.nivel, nivelNovo))
        .sort((a, b) => ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] || a.titulo.localeCompare(b.titulo, 'pt-BR')),
    });
  });
  recompensas.sort((a, b) => a.nivel - b.nivel || a.classeTitulo.localeCompare(b.classeTitulo, 'pt-BR'));

  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId) || null;
  const estagiosAntes = new Set(obterEstagiosRaciaisAlcancados(raca, nivelAtual).map((estagio) => estagio.id));
  const novosEstagiosRaciais = obterEstagiosRaciaisAlcancados(raca, nivelSimulado)
    .filter((estagio) => !estagiosAntes.has(estagio.id))
    .map((estagio) => estagio.titulo);

  const xpAtual = Math.max(0, Number(ficha?.xp) || 0);
  const xpNecessario = TABELA_XP[Math.max(0, Math.min(TABELA_XP.length - 1, nivelSimulado - 1))] ?? 0;

  return {
    nivelAtual,
    nivelSimulado,
    linhas,
    recompensas,
    poderes,
    novosEstagiosRaciais,
    xp: { atual: xpAtual, necessario: xpNecessario, faltam: Math.max(0, xpNecessario - xpAtual) },
    mudou: houveMudanca(ficha, cenario),
  };
}

export function formatarValorLinha(valor: number, formato: FormatoLinha): string {
  if (formato === 'modificador') return valor > 0 ? `+${valor}` : String(valor);
  if (formato === 'decimal') return String(arredondar(valor)).replace('.', ',');
  return String(Math.round(valor));
}

export function formatarDelta(delta: number, formato: FormatoLinha): string {
  if (delta === 0) return '=';
  const texto = formato === 'decimal' ? String(arredondar(Math.abs(delta))).replace('.', ',') : String(Math.abs(Math.round(delta)));
  return `${delta > 0 ? '+' : '−'}${texto}`;
}
