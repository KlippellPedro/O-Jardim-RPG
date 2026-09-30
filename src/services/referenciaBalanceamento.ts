import type { IClasse } from '../types/catalogo';
import {
  BONUS_GRAU,
  GRAUS_PERICIA,
  calcularDerivadosComClasses,
  modificador,
  type TAtributo,
} from './calculoService';
import {
  NIVEL_MAXIMO_CLASSE,
  aumentosAtributoPorNivel,
  indiceDoMaiorGrauPorNivel,
  rotuloDoPatamar,
} from './progressaoNiveis';

/**
 * Números de referência para o Mestre montar personagens, NPCs e inimigos, do
 * nível 1 ao 200. Tudo sai da MESMA fórmula da ficha (`calcularDerivadosComClasses`),
 * então a referência não descola do que o site mostra. tools/audit-balance.mjs
 * usa este módulo para gerar data/regras/balanceamento-referencia-v1.json e o
 * relatório em Markdown; as premissas estão nas constantes abaixo.
 */

export const NIVEIS_DE_REFERENCIA = [1, 5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 150, 200] as const;

/** Atributos da tabela de comparação entre classes: fixos, para as classes
 * serem comparáveis entre si. */
export const ATRIBUTOS_DE_REFERENCIA: Record<TAtributo, number> = {
  forca: 12, destreza: 14, constituicao: 14, inteligencia: 13, sabedoria: 10, carisma: 8, fluxo: 14,
};

/** Depois do teto de uma classe (nível 50) a referência soma níveis de uma
 * classe neutra que gasta o orçamento de 9 pontos igualmente. */
export const CLASSE_NEUTRA = {
  id: 'classe-neutra', titulo: 'Classe neutra', categoria: 'padrao', vida: 3, mana: 3, estamina: 3,
} as unknown as IClasse;

/** Para o NPC de referência: a Força é o atributo principal (ataque e dano) e
 * começa em 15, o melhor valor do conjunto padrão. */
export const ATRIBUTO_PRINCIPAL_BASE = 15;
/** Cada aumento de atributo por nível vai, em rodízio, para o principal (2 de 4),
 * a Constituição e a Destreza. */
const ORDEM_DOS_AUMENTOS: TAtributo[] = ['forca', 'constituicao', 'forca', 'destreza'];

/** O Guia do Mestre manda um encontro padrão aguentar cerca de quatro rodadas e
 * meia de dano do grupo; o grupo de referência tem quatro personagens. */
export const RODADAS_DO_ENCONTRO_PADRAO = 4.5;
export const TAMANHO_DO_GRUPO = 4;

/** Média de uma expressão de dados ("8d12+20"), ou null se não houver dado. */
export function mediaDeDados(expressao: unknown): number | null {
  const texto = String(expressao || '').replace(/\s+/g, '');
  let media = 0;
  let achou = false;
  for (const achado of texto.matchAll(/(\d+)d(\d+)/gi)) {
    media += (Number(achado[1]) * (Number(achado[2]) + 1)) / 2;
    achou = true;
  }
  const semDados = texto.replace(/\d+d\d+/gi, '');
  for (const achado of semDados.matchAll(/([+-])(\d+(?:[.,]\d+)?)/g)) {
    media += (achado[1] === '-' ? -1 : 1) * Number(achado[2].replace(',', '.'));
  }
  return achou ? Math.max(0, media) : null;
}

/** A classe até o teto e, se o nível passar dele, o resto numa classe neutra. */
export function classesDeReferencia(classe: IClasse, nivel: number): Array<{ classeId: string; nivel: number }> {
  const propria = Math.min(nivel, NIVEL_MAXIMO_CLASSE);
  const resto = nivel - propria;
  return [
    { classeId: classe.id, nivel: propria },
    ...(resto > 0 ? [{ classeId: CLASSE_NEUTRA.id, nivel: resto }] : []),
  ];
}

export interface IDerivadosDeReferencia {
  vida: number;
  mana: number;
  estamina: number;
  defesaNatural: number;
}

/** Vida, Mana, Estamina e Defesa que a ficha mostraria para a classe naquele nível. */
export function derivadosDeReferencia(
  classe: IClasse,
  nivel: number,
  atributos: Record<TAtributo, number> = ATRIBUTOS_DE_REFERENCIA,
): IDerivadosDeReferencia {
  const derivados = calcularDerivadosComClasses(
    atributos, null, classesDeReferencia(classe, nivel), [classe, CLASSE_NEUTRA], nivel, {},
  );
  return {
    vida: derivados.vida,
    mana: derivados.mana,
    estamina: Number(derivados.estamina),
    defesaNatural: derivados.defesaNatural,
  };
}

/** Atributos do NPC de referência no nível: o conjunto padrão com o principal
 * em 15 e os aumentos de nível distribuídos em rodízio. */
export function atributosDoNpcDeReferencia(nivel: number): Record<TAtributo, number> {
  const atributos = { ...ATRIBUTOS_DE_REFERENCIA, forca: ATRIBUTO_PRINCIPAL_BASE };
  const aumentos = aumentosAtributoPorNivel(nivel);
  for (let indice = 0; indice < aumentos; indice += 1) {
    atributos[ORDEM_DOS_AUMENTOS[indice % ORDEM_DOS_AUMENTOS.length]] += 1;
  }
  return atributos;
}

/** Nível em que uma arma de cada raridade entra na conta, quando o catálogo não
 * traz `nivel_recomendado` (só Lendárias e Relíquias da Criação trazem: 25 e 35). */
export const NIVEL_DA_RARIDADE_DE_ARMA: Record<string, number> = {
  comum: 1, incomum: 5, raro: 10, epico: 15, lendario: 25, reliquia: 35, 'reliquia da criacao': 35,
};

export interface IArmaDeReferencia {
  /** Nível recomendado no catálogo, quando existe. */
  nivelRecomendado: number | null;
  raridade?: string;
  mediaNormal: number | null;
}

const nivelDaArma = (arma: IArmaDeReferencia): number => arma.nivelRecomendado
  ?? NIVEL_DA_RARIDADE_DE_ARMA[String(arma.raridade ?? '')]
  ?? 1;

/** Dano médio da melhor arma que o nível já alcança (0 se nenhuma serve). */
export function melhorDanoDeArmaAteONivel(armas: readonly IArmaDeReferencia[], nivel: number): number {
  return armas
    .filter((arma) => arma.mediaNormal !== null && nivelDaArma(arma) <= nivel)
    .reduce((melhor, arma) => Math.max(melhor, arma.mediaNormal as number), 0);
}

export interface IReferenciaDoNivel {
  nivel: number;
  /** "Patamar I" a partir do 60; null dentro do padrão. */
  patamar: string | null;
  /** ⌊nível ÷ 2⌋, somado a testes, Defesa e Iniciativa. */
  bonusDeNivel: number;
  /** Atributo principal (Força) e modificador dele no nível. */
  atributoPrincipal: number;
  modificadorPrincipal: number;
  /** Vida das 18 classes comuns: a menor, a média e a maior. */
  vida: { minima: number; media: number; maxima: number };
  defesaNatural: number;
  /** Bônus de ataque de quem investe os graus na perícia de combate: nível/2 +
   * modificador + o maior grau que o nível permite. */
  bonusDeAtaque: number;
  /** Dano por acerto: melhor arma que o nível alcança + modificador. */
  danoPorAcerto: number;
  /** DT da situação: 10, 15, 20 e 25 mais nível/2 (o Guia do Mestre). */
  dt: { rotineira: number; padrao: number; dificil: number; extrema: number };
  /** Vida de um inimigo que aguenta 4,5 rodadas de um grupo de quatro. */
  vidaDeInimigoPadrao: number;
}

const arredondar = (valor: number, passo: number) => Math.round(valor / passo) * passo;

export function referenciaDoNivel(
  nivel: number,
  classesComuns: readonly IClasse[],
  armas: readonly IArmaDeReferencia[],
): IReferenciaDoNivel {
  const atributos = atributosDoNpcDeReferencia(nivel);
  const derivados = classesComuns.map((classe) => derivadosDeReferencia(classe, nivel, atributos));
  const vidas = derivados.map((item) => item.vida);
  const bonusDeNivel = Math.floor(nivel / 2);
  const modificadorPrincipal = modificador(atributos.forca);
  const grau = GRAUS_PERICIA[indiceDoMaiorGrauPorNivel(nivel)];
  const bonusDeAtaque = bonusDeNivel + modificadorPrincipal + (BONUS_GRAU[grau] ?? 0);
  const danoPorAcerto = melhorDanoDeArmaAteONivel(armas, nivel) + modificadorPrincipal;
  const defesaNatural = derivados[0]?.defesaNatural ?? 10 + bonusDeNivel;
  // d20 + ataque contra a Defesa do inimigo do mesmo nível: 1 e 20 naturais
  // sempre contam, então a chance fica entre 5% e 95%.
  const chanceDeAcertar = Math.min(0.95, Math.max(0.05, (21 - (defesaNatural - bonusDeAtaque)) / 20));
  const danoDoGrupoPorRodada = TAMANHO_DO_GRUPO * chanceDeAcertar * danoPorAcerto;
  return {
    nivel,
    patamar: rotuloDoPatamar(nivel),
    bonusDeNivel,
    atributoPrincipal: atributos.forca,
    modificadorPrincipal,
    vida: {
      minima: Math.min(...vidas),
      media: Math.round(vidas.reduce((total, valor) => total + valor, 0) / vidas.length),
      maxima: Math.max(...vidas),
    },
    defesaNatural,
    bonusDeAtaque,
    danoPorAcerto: Math.round(danoPorAcerto * 10) / 10,
    dt: {
      rotineira: 10 + bonusDeNivel,
      padrao: 15 + bonusDeNivel,
      dificil: 20 + bonusDeNivel,
      extrema: 25 + bonusDeNivel,
    },
    vidaDeInimigoPadrao: arredondar(RODADAS_DO_ENCONTRO_PADRAO * danoDoGrupoPorRodada, 10),
  };
}
