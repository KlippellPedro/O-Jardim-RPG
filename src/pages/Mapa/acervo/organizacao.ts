// Contas da organização do Acervo: arrastar imagens e pastas para dentro de pastas, escolher várias de uma vez,
// ordenar e contar. Sem React nem rede, para testar. A gaveta do Acervo e a janela da barra de baixo usam o
// mesmo arrasto (mesmos tipos de dado), então o que sai de uma cai na outra.

import type { IItemAcervo, IPastaAcervo } from '../../../services/acervoApi';

/** O arrasto de uma ou mais imagens do Acervo para uma pasta: leva a lista de ids. */
export const MIME_MOVER_ITENS = 'application/x-jardim-acervo-mover';
/** O arrasto de uma pasta do Acervo para dentro de outra: leva o id dela. */
export const MIME_MOVER_PASTA = 'application/x-jardim-acervo-pasta';

/** Quantas imagens um arrasto leva (o resto da seleção ficaria pesado de mandar um a um). */
export const MAX_ITENS_POR_ARRASTO = 200;

export function empacotarIds(ids: readonly string[]): string {
  return JSON.stringify(ids.slice(0, MAX_ITENS_POR_ARRASTO));
}

/** Lê o pacote de um arrasto de imagens; o que vier torto vira lista vazia. */
export function lerIds(bruto: string | null | undefined): string[] {
  if (!bruto) return [];
  try {
    const dado: unknown = JSON.parse(bruto);
    if (!Array.isArray(dado)) return [];
    const vistos = new Set<string>();
    for (const valor of dado) {
      if (typeof valor === 'string' && valor && valor.length <= 64) vistos.add(valor);
      if (vistos.size >= MAX_ITENS_POR_ARRASTO) break;
    }
    return [...vistos];
  } catch {
    return [];
  }
}

/** O arrasto de agora leva imagens do Acervo para mudar de pasta? (`types` do dataTransfer; o conteúdo só se lê ao soltar.) */
export function arrastaItens(tipos: readonly string[] | DOMStringList): boolean {
  return Array.from(tipos).includes(MIME_MOVER_ITENS);
}

/** O arrasto de agora leva uma pasta? */
export function arrastaPasta(tipos: readonly string[] | DOMStringList): boolean {
  return Array.from(tipos).includes(MIME_MOVER_PASTA);
}

/** Quem pode soltar em cima de uma pasta: imagens ou outra pasta (arquivos do computador têm o tratamento deles). */
export function arrastaOrganizacao(tipos: readonly string[] | DOMStringList): boolean {
  return arrastaItens(tipos) || arrastaPasta(tipos);
}

/** Todas as pastas de dentro de uma pasta, em qualquer profundidade (sem contar ela mesma). */
export function descendentesDaPasta(pastas: readonly IPastaAcervo[], pastaId: string): Set<string> {
  const achadas = new Set<string>();
  const fila = [pastaId];
  while (fila.length) {
    const atual = fila.pop()!;
    for (const pasta of pastas) {
      if (pasta.pai_id === atual && !achadas.has(pasta.id) && pasta.id !== pastaId) {
        achadas.add(pasta.id);
        fila.push(pasta.id);
      }
    }
  }
  return achadas;
}

/** A pasta pode ir para `destinoId` (nulo é a raiz)? Não vale para dentro dela mesma, de uma filha, nem para onde já está. */
export function podeMoverPasta(pastas: readonly IPastaAcervo[], pastaId: string, destinoId: string | null): boolean {
  const pasta = pastas.find((p) => p.id === pastaId);
  if (!pasta) return false;
  if (destinoId === null) return pasta.pai_id !== null;
  if (destinoId === pastaId || pasta.pai_id === destinoId) return false;
  if (!pastas.some((p) => p.id === destinoId)) return false;
  return !descendentesDaPasta(pastas, pastaId).has(destinoId);
}

/** Das imagens pedidas, as que de fato mudam de lugar ao ir para `destinoId` (as que já estão lá ficam de fora). */
export function itensQueMudam(itens: readonly IItemAcervo[], ids: readonly string[], destinoId: string | null): IItemAcervo[] {
  const pedidos = new Set(ids);
  return itens.filter((item) => pedidos.has(item.id) && item.pasta_id !== destinoId);
}

export interface ContagemDasPastas {
  /** Imagens prontas de cada pasta, contando as das subpastas (para dizer o que some ao apagar a pasta). */
  porPasta: Map<string, number>;
  /** Imagens prontas que estão na própria pasta, sem as das subpastas: é o que a grade mostra ao abrir a pasta. */
  diretas: Map<string, number>;
  foraDePasta: number;
  total: number;
}

/** Quantas imagens prontas há em cada pasta (com e sem as de dentro das subpastas), fora de pasta e no total. */
export function contarPorPasta(pastas: readonly IPastaAcervo[], itens: readonly IItemAcervo[]): ContagemDasPastas {
  const pai = new Map(pastas.map((p) => [p.id, p.pai_id]));
  const porPasta = new Map<string, number>();
  const diretas = new Map<string, number>();
  let foraDePasta = 0;
  let total = 0;
  for (const item of itens) {
    if (item.estado !== 'pronto') continue;
    total++;
    if (!item.pasta_id) {
      foraDePasta++;
      continue;
    }
    if (pai.has(item.pasta_id)) diretas.set(item.pasta_id, (diretas.get(item.pasta_id) ?? 0) + 1);
    const vistas = new Set<string>();
    let atual: string | null | undefined = item.pasta_id;
    while (atual && pai.has(atual) && !vistas.has(atual)) {
      vistas.add(atual);
      porPasta.set(atual, (porPasta.get(atual) ?? 0) + 1);
      atual = pai.get(atual);
    }
  }
  return { porPasta, diretas, foraDePasta, total };
}

export interface OpcaoDePasta {
  id: string;
  nome: string;
  /** Quantos níveis abaixo da raiz (0 é a raiz). */
  nivel: number;
  /** "Mapas › Cavernas › Andar 1". */
  caminho: string;
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });

/** As pastas em ordem de árvore (cada uma logo antes das suas filhas), para listar com recuo. `excluir` tira as pastas dadas e o que há dentro delas. */
export function opcoesDePasta(pastas: readonly IPastaAcervo[], excluir: ReadonlySet<string> = new Set()): OpcaoDePasta[] {
  const saida: OpcaoDePasta[] = [];
  const idsDasPastas = new Set(pastas.map((p) => p.id));
  const visitar = (pai: string | null, nivel: number, trilha: string[]) => {
    const filhas = pastas
      .filter((p) => (p.pai_id && idsDasPastas.has(p.pai_id) ? p.pai_id : null) === pai && !excluir.has(p.id))
      .sort((a, b) => comparar(a.nome, b.nome));
    for (const pasta of filhas) {
      const caminho = [...trilha, pasta.nome];
      saida.push({ id: pasta.id, nome: pasta.nome, nivel, caminho: caminho.join(' › ') });
      visitar(pasta.id, nivel + 1, caminho);
    }
  };
  visitar(null, 0, []);
  return saida;
}

/** Quem são os ancestrais de uma pasta, do começo da árvore até ela (inclusive). Id desconhecido dá lista vazia. */
export function trilhaDaPasta(pastas: readonly IPastaAcervo[], pastaId: string): IPastaAcervo[] {
  const trilha: IPastaAcervo[] = [];
  const vistas = new Set<string>();
  let atual = pastas.find((p) => p.id === pastaId);
  while (atual && !vistas.has(atual.id)) {
    vistas.add(atual.id);
    trilha.unshift(atual);
    const paiId: string | null = atual.pai_id;
    atual = paiId ? pastas.find((p) => p.id === paiId) : undefined;
  }
  return trilha;
}

export type CriterioDeOrdem = 'nome' | 'novas' | 'maiores' | 'tamanho';

export const CRITERIOS_DE_ORDEM: Array<{ id: CriterioDeOrdem; rotulo: string }> = [
  { id: 'nome', rotulo: 'Nome' },
  { id: 'novas', rotulo: 'Mais novas' },
  { id: 'maiores', rotulo: 'Mais pesadas' },
  { id: 'tamanho', rotulo: 'Maior resolução' },
];

/** As imagens em ordem (uma cópia): por nome (com números na ordem natural), as mais novas, as mais pesadas ou as de maior resolução. */
export function ordenarItens(itens: readonly IItemAcervo[], criterio: CriterioDeOrdem): IItemAcervo[] {
  const copia = [...itens];
  if (criterio === 'novas') copia.sort((a, b) => b.criado_em.localeCompare(a.criado_em) || comparar(a.nome, b.nome));
  else if (criterio === 'maiores') copia.sort((a, b) => b.bytes - a.bytes || comparar(a.nome, b.nome));
  else if (criterio === 'tamanho') copia.sort((a, b) => b.largura * b.altura - a.largura * a.altura || comparar(a.nome, b.nome));
  else copia.sort((a, b) => comparar(a.nome, b.nome));
  return copia;
}

/** Shift-clique: os ids entre dois pontos da lista (inclusive), na ordem em que a tela mostra. Ponto fora da lista dá só o `ate`. */
export function intervaloDeIds(ordem: readonly string[], de: string | null, ate: string): string[] {
  const fim = ordem.indexOf(ate);
  if (fim < 0) return [];
  const comeco = de ? ordem.indexOf(de) : -1;
  if (comeco < 0) return [ate];
  const [a, b] = comeco <= fim ? [comeco, fim] : [fim, comeco];
  return ordem.slice(a, b + 1);
}

/** Tira da seleção o que não existe mais (apagado, ainda subindo ou fora do filtro de agora). */
export function podarSelecao(selecao: ReadonlySet<string>, existentes: readonly string[]): Set<string> {
  const vivos = new Set(existentes);
  const podada = new Set<string>();
  for (const id of selecao) if (vivos.has(id)) podada.add(id);
  return podada.size === selecao.size ? (selecao as Set<string>) : podada;
}

/** "3 imagens", "1 imagem". */
export function quantasImagens(n: number): string {
  return `${n} ${n === 1 ? 'imagem' : 'imagens'}`;
}

/** Roda `tarefa` em cada elemento, com no máximo `simultaneas` ao mesmo tempo. Devolve os que falharam (com o erro), na ordem da lista. */
export async function emLotes<T>(
  lista: readonly T[],
  tarefa: (elemento: T) => Promise<unknown>,
  simultaneas = 4,
): Promise<Array<{ elemento: T; erro: unknown }>> {
  const falhas = new Map<number, { elemento: T; erro: unknown }>();
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < lista.length) {
      const indice = proximo++;
      try {
        await tarefa(lista[indice]);
      } catch (erro) {
        falhas.set(indice, { elemento: lista[indice], erro });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(simultaneas, lista.length) }, trabalhador));
  return [...falhas.entries()].sort((a, b) => a[0] - b[0]).map(([, falha]) => falha);
}
