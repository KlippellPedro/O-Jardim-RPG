// Sons de ambiente da mesa (chuva, vento, fogueira, taverna...). Os arquivos não
// ficam no site nem no banco: tocam de um repositório público do GitHub pelo
// jsDelivr, e o Mestre liga cada um pelo painel Trilha sonora. Este módulo é a
// conta (catálogo, endereço de cada som, as camadas ligadas); quem toca é o
// AmbienteDaMesa. O servidor só aceita os ids do catálogo (core/sons_ambiente.py).

import catalogo from '../../../../data/mapa/sons-ambiente-v1.json';
import type { ICamadaAmbiente } from '../../../services/mapaRecursosApi';

export type { ICamadaAmbiente };

export interface ISomDeAmbiente {
  id: string;
  nome: string;
  categoria: string;
  arquivo: string;
  /** Volume sugerido de 0 a 1 quando o som é ligado. */
  volume: number;
}

export interface ICategoriaDeSom {
  id: string;
  nome: string;
}

export const FONTE_DOS_SONS = catalogo.fonte;
export const CATEGORIAS_DE_SOM: readonly ICategoriaDeSom[] = catalogo.categorias;
export const SONS_DE_AMBIENTE: readonly ISomDeAmbiente[] = catalogo.sons;
export const MAXIMO_DE_CAMADAS: number = catalogo.maximo_ao_mesmo_tempo;

const PORID = new Map(SONS_DE_AMBIENTE.map((som) => [som.id, som]));

export const somPorId = (id: string): ISomDeAmbiente | undefined => PORID.get(id);

/** O endereço do arquivo: base do repositório (com o commit fixado) mais o caminho do som. */
export function urlDoSom(som: ISomDeAmbiente): string {
  return `${FONTE_DOS_SONS.base}${som.arquivo}`;
}

const limitar = (valor: number) => Math.round(Math.max(0, Math.min(1, valor)) * 100) / 100;

/**
 * As camadas que chegam do servidor ou do tempo real, limpas: só sons que o catálogo conhece, sem repetir,
 * dentro do limite e com o volume entre 0 e 1. Um registro quebrado vira silêncio.
 */
export function normalizarCamadas(bruto: unknown): ICamadaAmbiente[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const camadas: ICamadaAmbiente[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== 'object') continue;
    const { id, volume } = item as { id?: unknown; volume?: unknown };
    if (typeof id !== 'string' || !PORID.has(id) || vistos.has(id)) continue;
    vistos.add(id);
    const sugerido = PORID.get(id)!.volume;
    camadas.push({ id, volume: limitar(typeof volume === 'number' && Number.isFinite(volume) ? volume : sugerido) });
    if (camadas.length >= MAXIMO_DE_CAMADAS) break;
  }
  return camadas;
}

/** Liga o som se está desligado (com o volume sugerido) e desliga se está ligado. Passou do limite, fica como estava. */
export function alternarCamada(camadas: readonly ICamadaAmbiente[], id: string): ICamadaAmbiente[] {
  const som = PORID.get(id);
  if (!som) return [...camadas];
  if (camadas.some((camada) => camada.id === id)) return camadas.filter((camada) => camada.id !== id);
  if (camadas.length >= MAXIMO_DE_CAMADAS) return [...camadas];
  return [...camadas, { id, volume: limitar(som.volume) }];
}

export function mudarVolumeDaCamada(camadas: readonly ICamadaAmbiente[], id: string, volume: number): ICamadaAmbiente[] {
  return camadas.map((camada) => (camada.id === id ? { ...camada, volume: limitar(volume) } : camada));
}

export const estaLigado = (camadas: readonly ICamadaAmbiente[], id: string) => camadas.some((camada) => camada.id === id);

/** O volume que sai do alto-falante: o do Mestre vezes o ajuste deste aparelho; mudo zera. */
export function volumeNoAparelho(camada: ICamadaAmbiente, ajusteLocal: number, mudo: boolean): number {
  return mudo ? 0 : limitar(camada.volume * limitar(ajusteLocal));
}

/** Sons de uma categoria (ou de todas, com `null`), filtrados por um termo sem acento nem caixa. */
export function filtrarSons(categoria: string | null, termo: string): ISomDeAmbiente[] {
  const normal = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const busca = normal(termo.trim());
  return SONS_DE_AMBIENTE.filter((som) => (categoria === null || som.categoria === categoria) && (!busca || normal(som.nome).includes(busca)));
}

// ---------------------------------------------------------------- ajuste deste aparelho

export interface IAjusteLocalDoAmbiente {
  /** Quanto deste aparelho ouve dos sons do Mestre, de 0 a 1. */
  volume: number;
  mudo: boolean;
}

const CHAVE_DO_AJUSTE = 'jardim.mapa.ambiente.v1';
export const AJUSTE_LOCAL_PADRAO: IAjusteLocalDoAmbiente = { volume: 1, mudo: false };

export function lerAjusteLocal(): IAjusteLocalDoAmbiente {
  try {
    const bruto = JSON.parse(window.localStorage.getItem(CHAVE_DO_AJUSTE) ?? 'null') as Partial<IAjusteLocalDoAmbiente> | null;
    return {
      volume: typeof bruto?.volume === 'number' && Number.isFinite(bruto.volume) ? limitar(bruto.volume) : AJUSTE_LOCAL_PADRAO.volume,
      mudo: bruto?.mudo === true,
    };
  } catch {
    return { ...AJUSTE_LOCAL_PADRAO };
  }
}

export function guardarAjusteLocal(ajuste: IAjusteLocalDoAmbiente) {
  try {
    window.localStorage.setItem(CHAVE_DO_AJUSTE, JSON.stringify({ volume: limitar(ajuste.volume), mudo: ajuste.mudo }));
  } catch {
    // Sem armazenamento, o ajuste vale até fechar a página.
  }
}
