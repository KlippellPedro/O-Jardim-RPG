// Contas da barra de baixo do mapa (o dock do Acervo, como a do Owlbear): que itens uma pasta ou um tipo
// mostra, o caminho de uma subpasta e o pacote que viaja quando o Mestre arrasta uma imagem até o mapa.
// Sem React nem rede, para testar.

import type { IAcervo, IItemAcervo, IPastaAcervo, TipoItemAcervo } from '../../../services/acervoApi';

/** O tipo de dado que o arrasto de uma imagem do Acervo leva (só o mapa entende). */
export const MIME_ACERVO = 'application/x-jardim-acervo';

/** O que a cena precisa saber de uma imagem do Acervo para pô-la no mapa. */
export type ItemParaCena = Pick<IItemAcervo, 'id' | 'nome' | 'tipo' | 'largura' | 'altura'>;

/**
 * O que a janela mostra: tudo que casa com a busca, um tipo inteiro (Mapas, Tokens, Objetos), o conteúdo de uma pasta,
 * as imagens usadas por último ou as marcadas com estrela.
 */
export type VistaDoDock =
  | { modo: 'busca' }
  | { modo: 'tipo'; tipo: TipoItemAcervo }
  | { modo: 'pasta'; pastaId: string }
  | { modo: 'recentes' }
  | { modo: 'favoritos' };

/** As listas que o aparelho guarda: ids das imagens usadas por último (a mais nova primeiro) e das favoritas. */
export interface ListasDoDock {
  recentes: readonly string[];
  favoritos: readonly string[];
}

/** Quantas imagens usadas por último o aparelho lembra. */
export const LIMITE_DE_RECENTES = 16;
/** Teto de segurança para o que se lê do armazenamento do navegador. */
const LIMITE_DA_LISTA_GUARDADA = 500;

/** A imagem acabou de ser usada: vai para o começo dos recentes, sem repetir e sem passar do limite. */
export function registrarRecente(recentes: readonly string[], id: string, limite = LIMITE_DE_RECENTES): string[] {
  return [id, ...recentes.filter((outro) => outro !== id)].slice(0, limite);
}

/** Põe ou tira a estrela da imagem. */
export function alternarFavorito(favoritos: readonly string[], id: string): string[] {
  return favoritos.includes(id) ? favoritos.filter((outro) => outro !== id) : [...favoritos, id];
}

/** Lê uma lista de ids guardada como JSON; o que vier torto vira lista vazia, e valor repetido ou que não é texto é descartado. */
export function lerListaDeIds(bruto: string | null | undefined): string[] {
  if (!bruto) return [];
  try {
    const dado: unknown = JSON.parse(bruto);
    if (!Array.isArray(dado)) return [];
    const vistos = new Set<string>();
    for (const valor of dado) {
      if (typeof valor === 'string' && valor && valor.length <= 64) vistos.add(valor);
      if (vistos.size >= LIMITE_DA_LISTA_GUARDADA) break;
    }
    return [...vistos];
  } catch {
    return [];
  }
}

/** Quantas imagens a janela desenha de uma vez (o Acervo não tem limite; a busca afina o resto). */
export const LIMITE_DA_JANELA = 120;

const TIPOS: readonly TipoItemAcervo[] = ['mapa', 'token', 'objeto'];

export function empacotarItem(item: ItemParaCena): string {
  const { id, nome, tipo, largura, altura } = item;
  return JSON.stringify({ id, nome, tipo, largura, altura });
}

/** Lê o pacote de um arrasto; devolve nulo se não for do Acervo ou vier torto (o servidor ainda confere o dono). */
export function lerItemArrastado(bruto: string): ItemParaCena | null {
  try {
    const dado = JSON.parse(bruto) as Partial<ItemParaCena> | null;
    if (!dado || typeof dado !== 'object') return null;
    const { id, nome, tipo, largura, altura } = dado;
    if (typeof id !== 'string' || !id || typeof nome !== 'string' || !TIPOS.includes(tipo as TipoItemAcervo)) return null;
    if (typeof largura !== 'number' || typeof altura !== 'number' || !Number.isFinite(largura) || !Number.isFinite(altura)) return null;
    return { id, nome, tipo: tipo as TipoItemAcervo, largura, altura };
  } catch {
    return null;
  }
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** As pastas de dentro de uma pasta (ou da raiz, com nulo), em ordem alfabética. */
export function subpastas(pastas: readonly IPastaAcervo[], paiId: string | null): IPastaAcervo[] {
  return pastas.filter((p) => p.pai_id === paiId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Do começo da árvore até a pasta (inclusive): o caminho para mostrar e voltar. Id desconhecido dá lista vazia. */
export function caminhoDaPasta(pastas: readonly IPastaAcervo[], pastaId: string): IPastaAcervo[] {
  const caminho: IPastaAcervo[] = [];
  const vistas = new Set<string>();
  let atual = pastas.find((p) => p.id === pastaId);
  while (atual && !vistas.has(atual.id)) {
    vistas.add(atual.id);
    caminho.unshift(atual);
    const paiId = atual.pai_id;
    atual = paiId ? pastas.find((p) => p.id === paiId) : undefined;
  }
  return caminho;
}

/** A pasta da raiz em que uma pasta mora (a dela mesma, se já é da raiz): é o botão do dock que fica aceso. */
export function raizDaPasta(pastas: readonly IPastaAcervo[], pastaId: string): string | null {
  return caminhoDaPasta(pastas, pastaId)[0]?.id ?? null;
}

export interface ResultadoDaJanela {
  itens: IItemAcervo[];
  /** Quantos casaram, mesmo os que passaram do limite. */
  total: number;
}

/** As imagens prontas que a vista mostra, filtradas pela busca (nome e etiquetas, sem acento), em ordem de nome. */
export function itensDaVista(
  acervo: Pick<IAcervo, 'itens'> | null,
  vista: VistaDoDock,
  busca: string,
  limite = LIMITE_DA_JANELA,
  listas: ListasDoDock = { recentes: [], favoritos: [] },
): ResultadoDaJanela {
  const termo = semAcento(busca.trim());
  const naVista = (item: IItemAcervo) => {
    if (vista.modo === 'tipo') return item.tipo === vista.tipo;
    if (vista.modo === 'pasta') return item.pasta_id === vista.pastaId;
    if (vista.modo === 'favoritos') return listas.favoritos.includes(item.id);
    if (vista.modo === 'recentes') return listas.recentes.includes(item.id);
    return true;
  };
  const casam = (acervo?.itens ?? [])
    .filter((item) => item.estado === 'pronto')
    .filter(naVista)
    .filter((item) => !termo || semAcento(item.nome).includes(termo) || item.etiquetas.some((etiqueta) => semAcento(etiqueta).includes(termo)));
  // Recentes seguem a ordem de uso (a mais nova primeiro); o resto, a ordem do nome.
  if (vista.modo === 'recentes') casam.sort((a, b) => listas.recentes.indexOf(a.id) - listas.recentes.indexOf(b.id));
  else casam.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
  return { itens: casam.slice(0, limite), total: casam.length };
}

/** Uma busca sem texto na vista de busca não lista o Acervo inteiro: a janela pede para digitar. */
export function buscaVazia(vista: VistaDoDock, busca: string): boolean {
  return vista.modo === 'busca' && !busca.trim();
}
