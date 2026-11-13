// A conta da central de comandos do mapa (Ctrl+K): o que entra na lista e em que ordem, sem React.
// A página monta os comandos (ferramentas, painéis, cenas, tokens); aqui só se filtra e se ordena.

export interface ComandoBase {
  id: string;
  /** Seção em que o comando aparece ("Ferramentas", "Cena", "Ir até"...). */
  grupo: string;
  rotulo: string;
  /** Uma linha curta sobre o que o comando faz. */
  descricao?: string;
  /** Outras palavras que levam a ele ("chuva" acha "Clima da cena"). */
  palavras?: string;
  disabled?: boolean;
}

/** Minúsculas e sem acento: "Névoa" e "nevoa" batem. */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

/**
 * Quanto um comando combina com a busca: 0 não combina; quanto maior, mais em cima. O nome vale mais que a
 * descrição e as palavras extras, e começo de nome ou de palavra vale mais que o meio.
 */
export function pontuarComando(comando: ComandoBase, busca: string): number {
  const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return 1;
  const rotulo = normalizarBusca(comando.rotulo);
  const resto = normalizarBusca(`${comando.descricao ?? ''} ${comando.palavras ?? ''} ${comando.grupo}`);
  let total = 0;
  for (const termo of termos) {
    let pontos = 0;
    if (rotulo.startsWith(termo)) pontos = 100;
    else if (rotulo.split(/\s+/).some((palavra) => palavra.startsWith(termo))) pontos = 70;
    else if (rotulo.includes(termo)) pontos = 45;
    else if (resto.split(/\s+/).some((palavra) => palavra.startsWith(termo))) pontos = 25;
    else if (resto.includes(termo)) pontos = 10;
    // Todo termo digitado precisa aparecer em algum lugar.
    if (!pontos) return 0;
    total += pontos;
  }
  return total;
}

export interface GrupoDaPaleta<T extends ComandoBase> {
  titulo: string;
  itens: T[];
}

/**
 * Sem busca: os comandos na ordem em que a página os deu, por seção. Com busca: uma lista só ("Resultados"),
 * do que mais combina para o que menos; o que não pode ser usado agora vai para o fim.
 */
export function filtrarComandos<T extends ComandoBase>(comandos: readonly T[], busca: string, limite = 40): GrupoDaPaleta<T>[] {
  if (!normalizarBusca(busca)) {
    const grupos: GrupoDaPaleta<T>[] = [];
    for (const comando of comandos) {
      const grupo = grupos.find((g) => g.titulo === comando.grupo);
      if (grupo) grupo.itens.push(comando);
      else grupos.push({ titulo: comando.grupo, itens: [comando] });
    }
    return grupos;
  }
  const achados = comandos
    .map((comando, ordem) => ({ comando, ordem, pontos: pontuarComando(comando, busca) }))
    .filter((item) => item.pontos > 0)
    .sort((a, b) => Number(Boolean(a.comando.disabled)) - Number(Boolean(b.comando.disabled)) || b.pontos - a.pontos || a.ordem - b.ordem)
    .slice(0, limite)
    .map((item) => item.comando);
  return achados.length ? [{ titulo: 'Resultados', itens: achados }] : [];
}

/** O índice seguinte ao andar com as setas, pulando o que está desligado e dando a volta nas pontas. */
export function proximoIndice(itens: readonly ComandoBase[], atual: number, passo: 1 | -1): number {
  if (!itens.length) return -1;
  let indice = atual;
  for (let i = 0; i < itens.length; i++) {
    indice = (indice + passo + itens.length) % itens.length;
    if (!itens[indice].disabled) return indice;
  }
  return atual;
}
