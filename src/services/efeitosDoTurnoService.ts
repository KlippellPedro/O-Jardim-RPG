import { atualizarStatusVital, type IStatusVital } from './statusService';
import { normalizarResistencias } from '../pages/Ficha/utils/catalogoResistProf';

export interface IEfeitoDoTurno {
  formula: string;
  tipo: 'dano' | 'cura';
  rotulo: string;
  /** Id da Resistência do catálogo que reduz este dano (ver catalogoResistProf). */
  resistenciaId?: string;
  /** Nome do tipo de dano para o aviso. */
  tipoDeDano?: string;
}

/** Condições do catálogo que cobram ou dão Vida no fim ou no começo do turno (texto em data/regras/condicoes.ts). */
export const EFEITOS_DO_TURNO: Readonly<Record<string, IEfeitoDoTurno>> = {
  sangramento: { formula: '1d6', tipo: 'dano', rotulo: 'Sangramento', resistenciaId: 'sangramento', tipoDeDano: 'Sangramento' },
  queimando: { formula: '1d6', tipo: 'dano', rotulo: 'Queimando', resistenciaId: 'elemento-fogo', tipoDeDano: 'Fogo' },
  envenenado: { formula: '1d6', tipo: 'dano', rotulo: 'Envenenado', resistenciaId: 'veneno-dano', tipoDeDano: 'Veneno' },
  revigorado: { formula: '1d4', tipo: 'cura', rotulo: 'Revigorado' },
};

const normalizar = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

/** O efeito de turno da condição salva na ficha, achada por id ou por nome. `null` quando ela não cobra nada por turno. */
export function efeitoDoTurnoDaCondicao(condicao: unknown): IEfeitoDoTurno | null {
  if (!condicao || typeof condicao !== 'object') return null;
  const dados = condicao as Record<string, unknown>;
  for (const chave of [dados.id, dados.nome, dados.titulo]) {
    const efeito = EFEITOS_DO_TURNO[normalizar(chave)];
    if (efeito) return efeito;
  }
  return null;
}

export interface IDanoResolvido {
  /** Dano que de fato entra na Vida. */
  final: number;
  /** Quanto a Resistência tirou (depois de dobrar, se houver vulnerabilidade). */
  reduzido: number;
  imune: boolean;
  /** Vulnerabilidade dobrou o dano antes da Resistência. */
  dobrado: boolean;
}

/**
 * Aplica a ficha ao dano do turno, na ordem do livro: Imunidade zera; Vulnerabilidade dobra; depois a
 * Resistência do tipo é subtraída, até o mínimo 0.
 */
export function resolverDanoDoTurno(dano: number, resistenciasDaFicha: unknown, resistenciaId?: string): IDanoResolvido {
  const bruto = Math.max(0, Math.trunc(Number(dano) || 0));
  if (!resistenciaId) return { final: bruto, reduzido: 0, imune: false, dobrado: false };
  const entradas = normalizarResistencias(resistenciasDaFicha).filter((entrada) => entrada.id === resistenciaId);
  if (entradas.some((entrada) => entrada.modo === 'imunidade')) return { final: 0, reduzido: bruto, imune: true, dobrado: false };
  const dobrado = entradas.some((entrada) => entrada.modo === 'vulnerabilidade');
  const base = dobrado ? bruto * 2 : bruto;
  const resistencia = entradas
    .filter((entrada) => entrada.modo === 'resistencia')
    .reduce((soma, entrada) => soma + Math.max(0, entrada.valor ?? 0), 0);
  const final = Math.max(0, base - resistencia);
  return { final, reduzido: base - final, imune: false, dobrado };
}

/** Tira ou devolve Vida pelo mesmo caminho do painel de status (Vida temporária, Morrendo e Ferido incluídos). */
export function aplicarEfeitoNaVida(
  status: IStatusVital,
  tipo: 'dano' | 'cura',
  valor: number,
  maxVida: number,
  constituicao: unknown,
): IStatusVital {
  const quantidade = Math.max(0, Math.trunc(Number(valor) || 0));
  if (quantidade === 0) return status;
  return atualizarStatusVital(status, 'vidaAtual', tipo === 'dano' ? -quantidade : quantidade, maxVida, constituicao);
}
