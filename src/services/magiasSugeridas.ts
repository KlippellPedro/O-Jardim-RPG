import { MAGIAS_CATALOGO, type FluxoDeMagia, type IMagiaCatalogo } from './magiaService';

/**
 * Listas sugeridas por Fluxo (pedido do Pedro, 2026-11-12): para quem não quer
 * ler as 30 magias do Fluxo, três caminhos de uma magia por círculo. Ataque,
 * Controle e Apoio. Cada Fluxo tem três magias por círculo, e a escolha divide
 * essas três entre os caminhos pelo papel de cada uma, então os caminhos não
 * repetem magia e, juntos, cobrem o Fluxo.
 *
 * A conta sai do catálogo na hora: magia nova ou papel trocado já entra.
 */

export type EstiloSugerido = 'ataque' | 'controle' | 'apoio';

export const ESTILOS_SUGERIDOS: Array<{ id: EstiloSugerido; titulo: string; para: string }> = [
  { id: 'ataque', titulo: 'Ataque', para: 'Para quem quer derrubar o inimigo: dano direto, golpes que gastam a vida do outro lado.' },
  { id: 'controle', titulo: 'Controle', para: 'Para quem quer decidir a luta sem bater: prender, atrasar, tirar ação e mudar o campo.' },
  { id: 'apoio', titulo: 'Apoio', para: 'Para quem quer manter o grupo de pé: curar, proteger, mover e preparar os aliados.' },
];

// Quanto cada papel do catálogo combina com cada caminho.
const AFINIDADE: Record<EstiloSugerido, Record<string, number>> = {
  ataque: { ataque: 4, 'ataque-risco': 4, 'ataque-controle': 3, controle: 1 },
  controle: { controle: 4, 'ataque-controle': 3, 'controle-utilidade': 3, ataque: 1, defesa: 1 },
  apoio: {
    suporte: 4, cura: 4, defesa: 3, 'suporte-movimento': 3, movimento: 3, utilidade: 2,
    investigacao: 2, 'controle-utilidade': 1,
  },
};

const ORDEM: EstiloSugerido[] = ['ataque', 'controle', 'apoio'];

const pontos = (magia: IMagiaCatalogo, estilo: EstiloSugerido) => {
  const base = AFINIDADE[estilo][String(magia.papel || '')] ?? 0;
  // Desempate: no caminho de Ataque, magia que fala em dano conta um pouco mais.
  const dano = estilo === 'ataque' && /\bdano\b/i.test(String(magia.efeito || '')) ? 0.5 : 0;
  return base + dano;
};

/** Melhor divisão das magias de um círculo entre os três caminhos (uma para cada). */
function dividirCirculo(magias: IMagiaCatalogo[]): Partial<Record<EstiloSugerido, IMagiaCatalogo>> {
  let melhor: { total: number; escolha: Partial<Record<EstiloSugerido, IMagiaCatalogo>> } = { total: -1, escolha: {} };
  const tentar = (indice: number, usadas: Set<string>, escolha: Partial<Record<EstiloSugerido, IMagiaCatalogo>>, total: number) => {
    if (indice === ORDEM.length) {
      if (total > melhor.total) melhor = { total, escolha: { ...escolha } };
      return;
    }
    const estilo = ORDEM[indice];
    let usou = false;
    for (const magia of magias) {
      if (usadas.has(magia.id)) continue;
      usou = true;
      usadas.add(magia.id);
      tentar(indice + 1, usadas, { ...escolha, [estilo]: magia }, total + pontos(magia, estilo));
      usadas.delete(magia.id);
    }
    // Círculo com menos magias que caminhos: o caminho fica sem nesse círculo.
    if (!usou) tentar(indice + 1, usadas, escolha, total);
  };
  tentar(0, new Set(), {}, 0);
  return melhor.escolha;
}

export interface IListaSugerida {
  estilo: EstiloSugerido;
  titulo: string;
  para: string;
  /** Uma magia por círculo, do 1º ao 10º (círculo sem magia no caminho fica de fora). */
  magias: IMagiaCatalogo[];
  /** Quantas das magias do caminho são mesmo do papel dele (o resto completa o círculo). */
  noPapel: number;
}

/** Se a magia é do papel do caminho, ou só completa o círculo. */
export const magiaNoPapel = (magia: IMagiaCatalogo, estilo: EstiloSugerido) => (AFINIDADE[estilo][String(magia.papel || '')] ?? 0) >= 2;

const cache = new Map<string, IListaSugerida[]>();

/** Os três caminhos de um Fluxo. */
export function listasSugeridas(fluxo: FluxoDeMagia, catalogo: IMagiaCatalogo[] = MAGIAS_CATALOGO): IListaSugerida[] {
  const chave = catalogo === MAGIAS_CATALOGO ? fluxo : '';
  if (chave && cache.has(chave)) return cache.get(chave)!;
  const doFluxo = catalogo.filter((magia) => magia.fluxo === fluxo);
  const circulos = [...new Set(doFluxo.map((magia) => Number(magia.circulo)))].sort((a, b) => a - b);
  const porEstilo: Record<EstiloSugerido, IMagiaCatalogo[]> = { ataque: [], controle: [], apoio: [] };
  for (const circulo of circulos) {
    const divisao = dividirCirculo(doFluxo.filter((magia) => Number(magia.circulo) === circulo).sort((a, b) => a.id.localeCompare(b.id)));
    for (const estilo of ORDEM) if (divisao[estilo]) porEstilo[estilo].push(divisao[estilo]!);
  }
  const listas = ESTILOS_SUGERIDOS.map(({ id, titulo, para }) => ({
    estilo: id, titulo, para, magias: porEstilo[id], noPapel: porEstilo[id].filter((magia) => magiaNoPapel(magia, id)).length,
  }));
  if (chave) cache.set(chave, listas);
  return listas;
}

/** Em que caminho sugerido a magia está, para a ficha marcar no catálogo. */
export function estiloSugeridoDaMagia(magia: Pick<IMagiaCatalogo, 'id' | 'fluxo'>): EstiloSugerido | null {
  if (!magia.fluxo || magia.fluxo === 'universal') return null;
  const lista = listasSugeridas(magia.fluxo as FluxoDeMagia).find((item) => item.magias.some((outra) => outra.id === magia.id));
  return lista?.estilo ?? null;
}

export const tituloDoEstilo = (estilo: EstiloSugerido) => ESTILOS_SUGERIDOS.find((item) => item.id === estilo)?.titulo ?? estilo;
