// Lógica do menu de seleção do site (MenusDeSelecaoHost), sem React: ler as
// opções de um <select>, filtrar, andar pelas opções e gravar o valor escolhido.
//
// O <select> nativo entrega a lista ao sistema, que ignora o CSS (no Windows ela
// abre branca, com a letra branca do site por cima). O host troca essa lista por
// uma nossa, e o <select> continua sendo a fonte da verdade: ele é quem guarda o
// valor e quem dispara o `change` que o React escuta.

export interface ItemGrupo {
  tipo: 'grupo';
  rotulo: string;
}

export interface ItemOpcao {
  tipo: 'opcao';
  rotulo: string;
  valor: string;
  desativada: boolean;
  selecionada: boolean;
}

export type ItemDoMenu = ItemGrupo | ItemOpcao;

/** Acima disso a lista ganha um campo de busca no topo. */
export const OPCOES_PARA_BUSCA = 10;

interface OpcaoLida {
  tagName: string;
  value: string;
  label?: string;
  text?: string;
  disabled?: boolean;
  hidden?: boolean;
  selected?: boolean;
}

interface GrupoLido {
  tagName: string;
  label?: string;
  disabled?: boolean;
  children: ArrayLike<OpcaoLida>;
}

interface SelectLido {
  multiple?: boolean;
  size?: number;
  disabled?: boolean;
  dataset?: Record<string, string | undefined>;
  children: ArrayLike<OpcaoLida | GrupoLido>;
}

/** O select que o menu do site assume: lista simples, ligada, que não pediu para ficar como veio. */
export function ehSelectEstilizavel(elemento: unknown): elemento is HTMLSelectElement {
  const select = elemento as (SelectLido & { tagName?: string }) | null | undefined;
  if (!select || String(select.tagName).toUpperCase() !== 'SELECT') return false;
  if (select.multiple || (select.size ?? 0) > 1 || select.disabled) return false;
  if (select.dataset?.menuNativo !== undefined) return false;
  return select.children.length > 0;
}

const ehGrupo = (no: OpcaoLida | GrupoLido): no is GrupoLido => String(no.tagName).toUpperCase() === 'OPTGROUP';

const rotuloDaOpcao = (opcao: OpcaoLida) => String(opcao.label ?? opcao.text ?? '').trim();

/** As opções do select na ordem em que aparecem, com um cabeçalho para cada grupo. */
export function lerItens(select: HTMLSelectElement | SelectLido): ItemDoMenu[] {
  const itens: ItemDoMenu[] = [];
  const opcao = (no: OpcaoLida, grupoDesativado = false) => {
    if (no.hidden) return;
    itens.push({
      tipo: 'opcao',
      rotulo: rotuloDaOpcao(no),
      valor: no.value,
      desativada: Boolean(no.disabled) || grupoDesativado,
      selecionada: Boolean(no.selected),
    });
  };
  for (const no of Array.from((select as SelectLido).children)) {
    if (ehGrupo(no)) {
      const filhos = Array.from(no.children).filter((filho) => !filho.hidden);
      if (!filhos.length) continue;
      itens.push({ tipo: 'grupo', rotulo: String(no.label ?? '').trim() });
      filhos.forEach((filho) => opcao(filho, Boolean(no.disabled)));
    } else if (String(no.tagName).toUpperCase() === 'OPTION') {
      opcao(no);
    }
  }
  return itens;
}

export const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Só o que combina com o termo, sem acento nem caixa. O cabeçalho de um grupo fica se sobrar opção nele. */
export function filtrar(itens: ItemDoMenu[], termo: string): ItemDoMenu[] {
  const busca = semAcento(termo.trim());
  if (!busca) return itens;
  const saida: ItemDoMenu[] = [];
  let grupo: ItemGrupo | null = null;
  let grupoJaPosto = false;
  for (const item of itens) {
    if (item.tipo === 'grupo') {
      grupo = item;
      grupoJaPosto = false;
      continue;
    }
    if (!semAcento(item.rotulo).includes(busca)) continue;
    if (grupo && !grupoJaPosto) {
      saida.push(grupo);
      grupoJaPosto = true;
    }
    saida.push(item);
  }
  return saida;
}

export const indicesDasOpcoes = (itens: ItemDoMenu[]): number[] =>
  itens.flatMap((item, indice) => (item.tipo === 'opcao' ? [indice] : []));

/** A primeira opção marcada, ou a primeira que se pode escolher. -1 se não houver. */
export function opcaoInicial(itens: ItemDoMenu[]): number {
  const habilitadas = indicesDasOpcoes(itens).filter((i) => !(itens[i] as ItemOpcao).desativada);
  const marcada = habilitadas.find((i) => (itens[i] as ItemOpcao).selecionada);
  return marcada ?? habilitadas[0] ?? -1;
}

/** Anda `passo` opções que se podem escolher a partir de `atual`, dando a volta nas pontas. */
export function andar(itens: ItemDoMenu[], atual: number, passo: number): number {
  const habilitadas = indicesDasOpcoes(itens).filter((i) => !(itens[i] as ItemOpcao).desativada);
  if (!habilitadas.length) return -1;
  const posicao = habilitadas.indexOf(atual);
  if (posicao < 0) return passo >= 0 ? habilitadas[0] : habilitadas[habilitadas.length - 1];
  const destino = posicao + passo;
  // Passos grandes (Page Up/Down) param na ponta; o passo de um em um dá a volta.
  if (Math.abs(passo) > 1) return habilitadas[Math.max(0, Math.min(habilitadas.length - 1, destino))];
  return habilitadas[(destino + habilitadas.length) % habilitadas.length];
}

export const primeira = (itens: ItemDoMenu[]) => andar(itens, -1, 1);

export const ultima = (itens: ItemDoMenu[]) => andar(itens, -1, -1);

/** A próxima opção cujo rótulo começa com o que foi digitado, procurando a partir da atual. */
export function acharPorPrefixo(itens: ItemDoMenu[], atual: number, digitado: string): number {
  const prefixo = semAcento(digitado);
  if (!prefixo) return -1;
  const habilitadas = indicesDasOpcoes(itens).filter((i) => !(itens[i] as ItemOpcao).desativada);
  const depois = habilitadas.filter((i) => i > atual);
  const antes = habilitadas.filter((i) => i <= atual);
  return [...depois, ...antes].find((i) => semAcento((itens[i] as ItemOpcao).rotulo).startsWith(prefixo)) ?? -1;
}

/** Grava o valor no <select> do jeito que o React percebe: pelo setter nativo, avisando `input` e `change`. */
export function aplicarValor(select: HTMLSelectElement, valor: string): boolean {
  if (select.value === valor) return false;
  select.value = valor;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/** Onde pôr o menu: logo abaixo do select, ou acima dele quando embaixo não cabe, sempre dentro da janela. */
export function posicionar(
  ancora: { left: number; top: number; bottom: number; width: number },
  janela: { largura: number; altura: number },
  alturaDoMenu: number,
  larguraMinima = 220,
  folga = 8,
): { top: number; left: number; width: number; maxHeight: number } {
  const largura = Math.min(Math.max(ancora.width, larguraMinima), janela.largura - folga * 2);
  const left = Math.max(folga, Math.min(ancora.left, janela.largura - largura - folga));
  const embaixo = janela.altura - ancora.bottom - folga - 4;
  const emcima = ancora.top - folga - 4;
  const abreParaCima = alturaDoMenu > embaixo && emcima > embaixo;
  const espaco = abreParaCima ? emcima : embaixo;
  const maxHeight = Math.max(120, Math.min(360, espaco));
  const altura = Math.min(alturaDoMenu, maxHeight);
  const top = abreParaCima ? ancora.top - altura - 4 : ancora.bottom + 4;
  return { top: Math.max(folga, top), left, width: largura, maxHeight };
}
