import progressaoData from '../../data/ficha/progressao-niveis.json';

/**
 * Ritmos de nível (XP, Legado, atributo, item especial, patamares) lidos de
 * data/ficha/progressao-niveis.json, o mesmo arquivo que a plataforma lê em
 * plataforma/core/progressao_niveis.py. O nível total não tem teto: nada aqui
 * bloqueia, só diz quanto vale cada faixa.
 */

interface IFaixaRitmo { a_partir_do_nivel: number; a_cada: number }
interface IFaixaXp { a_partir_do_nivel: number; custo_por_nivel: number }

const porInicio = <T extends { a_partir_do_nivel: number }>(faixas: readonly T[]) =>
  [...faixas].sort((a, b) => a.a_partir_do_nivel - b.a_partir_do_nivel);

const XP_FORMULA = progressaoData.xp.formula;
const XP_FAIXAS: IFaixaXp[] = porInicio(progressaoData.xp.faixas);
const FAIXAS_LEGADO: IFaixaRitmo[] = porInicio(progressaoData.legados.faixas);
const FAIXAS_ATRIBUTO: IFaixaRitmo[] = porInicio(progressaoData.aumento_atributo.faixas);
const FAIXAS_ITEM_ESPECIAL: IFaixaRitmo[] = porInicio(progressaoData.item_especial.faixas);
const ITEM_ESPECIAL_MINIMO = Math.max(0, Math.trunc(Number(progressaoData.item_especial.minimo) || 0));

/** Onde a classe deixa de ter recompensa escrita (poderes, habilidades). */
export const NIVEL_CONTEUDO_CLASSE: number = progressaoData.classe.nivel_conteudo;
/** Teto do nível de uma classe: nem o botão de subir nem o campo de nível passam dele. */
export const NIVEL_MAXIMO_CLASSE: number = progressaoData.classe.nivel_maximo;

/** Nível de classe depois de uma edição: pelo menos 1 e nunca acima do teto. Uma
 * ficha antiga que já estava acima do teto pode ser reduzida, mas não sobe mais. */
export function limitarNivelClasse(novo: unknown, atual: unknown = 0): number {
  const pedido = Math.max(1, Math.trunc(Number(novo) || 1));
  const teto = Math.max(NIVEL_MAXIMO_CLASSE, Math.trunc(Number(atual) || 0));
  return Math.min(pedido, teto);
}
/** Níveis totais em que o personagem muda de patamar, em ordem crescente. */
export const PATAMARES_NIVEL: readonly number[] = [...progressaoData.patamares.niveis].sort((a, b) => a - b);
export interface IGrauPericia {
  id: string;
  rotulo: string;
  bonus: number;
  /** Fontes de vantagem que o grau dá sozinho em todo teste da perícia. */
  vantagens: number;
  nivel_minimo: number;
  /** Dias de treino para subir até este grau (0 = o grau de partida). */
  treino_dias: number;
  /** Condição extra do treino além do tempo e do nível; vazio quando não há. */
  requisito: string;
}

/** Os graus de perícia do menor para o maior: fonte única do site e da plataforma. */
export const GRAUS_PERICIA_DADOS: readonly IGrauPericia[] = progressaoData.graus_pericia.graus;
/** Ids dos graus na ordem (iniciante ... absoluto), para comparar treinamento por índice. */
export const GRAUS_PERICIA: readonly string[] = GRAUS_PERICIA_DADOS.map((grau) => grau.id);
/** Bônus de cada grau no teste, por id. */
export const BONUS_GRAU: Record<string, number> = Object.fromEntries(
  GRAUS_PERICIA_DADOS.map((grau) => [grau.id, grau.bonus]),
);
/** Fontes de vantagem de cada grau, por id (0 nos graus de baixo). */
export const VANTAGENS_GRAU: Record<string, number> = Object.fromEntries(
  GRAUS_PERICIA_DADOS.map((grau) => [grau.id, Math.max(0, Math.trunc(Number(grau.vantagens)) || 0)]),
);
/** Fontes de vantagem que o grau dá no teste da perícia; entram junto das de
 * itens e poderes e se cancelam uma a uma com as desvantagens. */
export function vantagensDoGrau(grau: unknown): number {
  return VANTAGENS_GRAU[String(grau ?? '').trim().toLowerCase()] ?? 0;
}
/** Nome de cada grau para mostrar (com acento), por id. */
export const ROTULO_GRAU: Record<string, string> = Object.fromEntries(
  GRAUS_PERICIA_DADOS.map((grau) => [grau.id, grau.rotulo]),
);
/** Nível total mínimo de cada grau de perícia, na ordem dos graus. */
export const NIVEL_MINIMO_GRAU: readonly number[] = GRAUS_PERICIA_DADOS.map((grau) => grau.nivel_minimo);

/** Nome do grau para mostrar; devolve o próprio texto quando o id é desconhecido. */
export function nomeDoGrauPericia(grau: unknown): string {
  const id = String(grau ?? '').trim().toLowerCase();
  return ROTULO_GRAU[id] ?? (id ? `${id.charAt(0).toLocaleUpperCase('pt-BR')}${id.slice(1)}` : '');
}

/** Índice (0 = iniciante ... 11 = absoluto) do maior grau que o nível total permite. */
export function indiceDoMaiorGrauPorNivel(nivelTotal: unknown): number {
  const alvo = nivelInteiro(nivelTotal, 0);
  let indice = 0;
  NIVEL_MINIMO_GRAU.forEach((minimo, posicao) => {
    if (alvo >= minimo) indice = posicao;
  });
  return indice;
}

/** Onde terminam as regras padrão (duas classes comuns + uma especial): o primeiro patamar. */
export const NIVEL_TOTAL_PADRAO: number = PATAMARES_NIVEL[0];

const NIVEL_BUSCA_MAXIMO = 1_000_000;

const nivelInteiro = (nivel: unknown, minimo: number) =>
  Math.max(minimo, Math.trunc(Number(nivel) || 0));

/** XP acumulado necessário para ALCANÇAR o nível (o nível 1 custa 0). */
export function xpParaNivel(nivel: unknown): number {
  const alvo = nivelInteiro(nivel, 1);
  const naFormula = Math.min(alvo, XP_FORMULA.ate_nivel);
  let total = (XP_FORMULA.custo_por_nivel * naFormula * (naFormula - 1)) / 2;
  XP_FAIXAS.forEach((faixa, indice) => {
    const fim = XP_FAIXAS[indice + 1]?.a_partir_do_nivel ?? Infinity;
    const niveis = Math.min(alvo, fim) - faixa.a_partir_do_nivel;
    if (niveis > 0) total += niveis * faixa.custo_por_nivel;
  });
  return total;
}

/** XP para sair do nível informado e chegar ao seguinte. */
export function custoDoNivel(nivel: unknown): number {
  const atual = nivelInteiro(nivel, 1);
  return xpParaNivel(atual + 1) - xpParaNivel(atual);
}

/** Maior Valor de Desafio aceito (criaturas únicas podem passar do 100). */
export const VD_MAXIMO: number = progressaoData.combate.vd_maximo;
const XP_DIVISOR_POR_VD: number = progressaoData.combate.xp_divisor_por_vd;

/** XP de uma criatura solo de um VD (o VD é o nível do grupo que ela desafia):
 * um quinto do custo do nível de mesmo número. Vazio ou zero paga 0. */
export function xpPorVd(vd: unknown): number {
  if (vd === null || vd === undefined || vd === '') return 0;
  const alvo = Math.min(VD_MAXIMO, nivelInteiro(vd, 1));
  return Math.floor(custoDoNivel(alvo) / XP_DIVISOR_POR_VD);
}

/** O VD antigo ia de 1 a 10 (cada um uma faixa de 5 níveis de criatura). Devolve o
 * VD de hoje no meio da faixa: 1 vira 3, 2 vira 8, ..., 10 vira 48. */
export function vdAntigoParaNivel(vdAntigo: number): number {
  return 5 * Math.trunc(vdAntigo) - 2;
}

/** Maior nível cujo XP acumulado cabe no valor informado. */
export function nivelPorXp(xp: number): number {
  const valor = typeof xp === 'number' && Number.isFinite(xp) && xp >= 0 ? xp : 0;
  let baixo = 1;
  let alto = 2;
  while (alto < NIVEL_BUSCA_MAXIMO && xpParaNivel(alto) <= valor) {
    baixo = alto;
    alto *= 2;
  }
  while (alto - baixo > 1) {
    const meio = Math.floor((baixo + alto) / 2);
    if (xpParaNivel(meio) <= valor) baixo = meio;
    else alto = meio;
  }
  return baixo;
}

function contarPorFaixas(nivel: unknown, faixas: readonly IFaixaRitmo[]): number {
  const alvo = nivelInteiro(nivel, 0);
  return faixas.reduce((total, faixa, indice) => {
    const fim = faixas[indice + 1]?.a_partir_do_nivel ?? Infinity;
    const niveis = Math.min(alvo, fim) - faixa.a_partir_do_nivel;
    return niveis > 0 ? total + Math.floor(niveis / faixa.a_cada) : total;
  }, 0);
}

/** Legados de Ascensão a que o nível total dá direito (sem contar os raciais). */
export function legadosPorNivel(nivelTotal: unknown): number {
  return contarPorFaixas(nivelTotal, FAIXAS_LEGADO);
}

/** Aumentos de +1 em atributo a que o nível total dá direito. */
export function aumentosAtributoPorNivel(nivelTotal: unknown): number {
  return contarPorFaixas(nivelTotal, FAIXAS_ATRIBUTO);
}

/** Vagas de item especial: pelo menos 1, depois seguem o ritmo do atributo. */
export function vagasItemEspecialPorNivel(nivelTotal: unknown): number {
  return Math.max(ITEM_ESPECIAL_MINIMO, contarPorFaixas(nivelTotal, FAIXAS_ITEM_ESPECIAL));
}

/** Patamares já alcançados pelo nível total (vazio abaixo do primeiro). */
export function patamaresAlcancados(nivelTotal: unknown): number[] {
  const alvo = nivelInteiro(nivelTotal, 0);
  return PATAMARES_NIVEL.filter((patamar) => alvo >= patamar);
}

const ALGARISMOS_ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** "Patamar I" para o 60, "Patamar II" para o 100 e assim por diante; null
 * enquanto o personagem está nas regras padrão. */
export function rotuloDoPatamar(nivelTotal: unknown): string | null {
  const alcancados = patamaresAlcancados(nivelTotal).length;
  if (!alcancados) return null;
  return `Patamar ${ALGARISMOS_ROMANOS[alcancados - 1] ?? alcancados}`;
}

/** Maior patamar alcançado, ou null enquanto o personagem está nas regras padrão. */
export function patamarAtual(nivelTotal: unknown): number | null {
  const alcancados = patamaresAlcancados(nivelTotal);
  return alcancados.length ? alcancados[alcancados.length - 1] : null;
}
