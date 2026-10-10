/** O miolo da Busca do Jardim: normaliza, indexa e ranqueia. Não sabe de onde vêm os dados nem o que cada
 * pessoa pode ver: quem monta as entradas (`buscaDoJardimFontes.ts`) já entrega só o que a pessoa enxerga. */

export type GrupoDaBusca = 'ir' | 'ficha' | 'regra' | 'mundo' | 'registro' | 'item';

export const GRUPOS_DA_BUSCA: Record<GrupoDaBusca, { rotulo: string; ordem: number }> = {
  ir: { rotulo: 'Ir para', ordem: 0 },
  ficha: { rotulo: 'Fichas', ordem: 1 },
  regra: { rotulo: 'Livro', ordem: 2 },
  mundo: { rotulo: 'Mundo', ordem: 3 },
  registro: { rotulo: 'Registros Universais', ordem: 4 },
  item: { rotulo: 'Loja', ordem: 5 },
};

export interface EntradaDaBusca {
  /** Único no índice inteiro. */
  id: string;
  grupo: GrupoDaBusca;
  titulo: string;
  /** A linha de baixo do resultado ("Classe", "Armas · Raro"). Também entra na busca. */
  detalhe?: string;
  /** Caminho completo, com a query se a tela aceitar. */
  rota: string;
  /** Texto corrido, sem HTML. Vale menos que o título e aparece como trecho. */
  corpo?: string;
  /** Outras formas de chamar a mesma coisa ("combate" para a Sessão). */
  chaves?: readonly string[];
}

export interface ResultadoDaBusca {
  entrada: EntradaDaBusca;
  pontos: number;
  /** Pedaço do corpo em volta do primeiro termo achado, quando foi o corpo que casou. */
  trecho?: string;
}

export interface EntradaIndexada {
  entrada: EntradaDaBusca;
  titulo: string;
  detalhe: string;
  chaves: string;
  corpo: string;
}

export const normalizarBusca = (texto: string): string => texto
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('pt-BR');

/** Tira as marcas de HTML e comprime os espaços. */
export const limparHtml = (html: string): string => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function indexar(entradas: readonly EntradaDaBusca[]): EntradaIndexada[] {
  return entradas.map((entrada) => ({
    entrada,
    titulo: normalizarBusca(entrada.titulo),
    detalhe: normalizarBusca(entrada.detalhe ?? ''),
    chaves: normalizarBusca((entrada.chaves ?? []).join(' ')),
    corpo: normalizarBusca(entrada.corpo ?? ''),
  }));
}

export const termosDaBusca = (consulta: string): string[] => normalizarBusca(consulta).split(/\s+/).filter(Boolean);

const PONTOS = { tituloIgual: 100, tituloComeca: 80, palavraDoTitulo: 65, tituloTem: 45, chaves: 40, detalhe: 20, corpo: 10 };

/** Quanto este termo vale nesta entrada (0 se não aparece em lugar nenhum). Pega o melhor lugar, não a soma. */
function pontosDoTermo(item: EntradaIndexada, termo: string): { pontos: number; noCorpo: boolean } {
  if (item.titulo === termo) return { pontos: PONTOS.tituloIgual, noCorpo: false };
  if (item.titulo.startsWith(termo)) return { pontos: PONTOS.tituloComeca, noCorpo: false };
  if (item.titulo.includes(` ${termo}`)) return { pontos: PONTOS.palavraDoTitulo, noCorpo: false };
  if (item.titulo.includes(termo)) return { pontos: PONTOS.tituloTem, noCorpo: false };
  if (item.chaves.includes(termo)) return { pontos: PONTOS.chaves, noCorpo: false };
  if (item.detalhe.includes(termo)) return { pontos: PONTOS.detalhe, noCorpo: false };
  if (item.corpo.includes(termo)) return { pontos: PONTOS.corpo, noCorpo: true };
  return { pontos: 0, noCorpo: false };
}

/** O pedaço do texto original em volta do termo, com reticências nas pontas cortadas. */
export function trechoEmVolta(corpo: string, termo: string, folga = 56): string {
  const normalizado = normalizarBusca(corpo);
  // A normalização mantém o tamanho em texto composto (á vira a); se mudar, o índice não serve no original.
  const posicao = normalizado.length === corpo.length ? normalizado.indexOf(termo) : -1;
  if (posicao < 0) return corpo.length > folga * 2 ? `${corpo.slice(0, folga * 2).trimEnd()}…` : corpo;
  const inicio = Math.max(0, posicao - folga);
  const fim = Math.min(corpo.length, posicao + termo.length + folga);
  return `${inicio > 0 ? '…' : ''}${corpo.slice(inicio, fim).trim()}${fim < corpo.length ? '…' : ''}`;
}

export interface OpcoesDaBusca {
  /** Quantos resultados cada grupo mostra. */
  limitePorGrupo?: number;
  limite?: number;
}

/** Todos os termos precisam aparecer (em lugares quaisquer da entrada). Os grupos saem em ordem de relevância;
 * dentro do grupo, pelos pontos, depois pelo título mais curto e por fim em ordem alfabética. */
export function buscar(
  indice: readonly EntradaIndexada[],
  consulta: string,
  { limitePorGrupo = 6, limite = 30 }: OpcoesDaBusca = {},
): ResultadoDaBusca[] {
  const termos = termosDaBusca(consulta);
  if (!termos.length) return [];
  const juntos = termos.join(' ');

  const achados: ResultadoDaBusca[] = [];
  for (const item of indice) {
    let pontos = 0;
    let termoDoCorpo: string | null = null;
    let casou = true;
    for (const termo of termos) {
      const parcial = pontosDoTermo(item, termo);
      if (parcial.pontos === 0) { casou = false; break; }
      pontos += parcial.pontos;
      if (parcial.noCorpo && termoDoCorpo === null) termoDoCorpo = termo;
    }
    if (!casou) continue;
    // A consulta inteira no começo do título (ex.: "bola de f") vale mais do que termos soltos.
    if (termos.length > 1 && item.titulo.startsWith(juntos)) pontos += 30;
    achados.push({
      entrada: item.entrada,
      pontos,
      trecho: termoDoCorpo !== null && item.entrada.corpo ? trechoEmVolta(item.entrada.corpo, termoDoCorpo) : undefined,
    });
  }

  const porPontos = (a: ResultadoDaBusca, b: ResultadoDaBusca) => (
    b.pontos - a.pontos
    || a.entrada.titulo.length - b.entrada.titulo.length
    || a.entrada.titulo.localeCompare(b.entrada.titulo, 'pt-BR')
  );

  const porGrupo = new Map<GrupoDaBusca, ResultadoDaBusca[]>();
  for (const achado of achados.sort(porPontos)) {
    const lista = porGrupo.get(achado.entrada.grupo) ?? [];
    if (lista.length < limitePorGrupo) lista.push(achado);
    porGrupo.set(achado.entrada.grupo, lista);
  }

  return [...porGrupo.entries()]
    .sort(([grupoA, listaA], [grupoB, listaB]) => (
      listaB[0].pontos - listaA[0].pontos || GRUPOS_DA_BUSCA[grupoA].ordem - GRUPOS_DA_BUSCA[grupoB].ordem
    ))
    .flatMap(([, lista]) => lista)
    .slice(0, limite);
}

/** O que a caixa mostra antes de a pessoa digitar: os atalhos e, em seguida, as fichas dela. */
export function sugestoesIniciais(entradas: readonly EntradaDaBusca[], limitePorGrupo = 8): EntradaDaBusca[] {
  const grupos: GrupoDaBusca[] = ['ir', 'ficha'];
  return grupos.flatMap((grupo) => entradas.filter((entrada) => entrada.grupo === grupo).slice(0, limitePorGrupo));
}

export interface ParteDoTexto {
  texto: string;
  marcado: boolean;
}

/** O texto cortado em pedaços, com os trechos que casam com algum termo marcados (para o `<mark>` do resultado).
 * Se a normalização mudou o tamanho do texto, os índices não valem e ele volta inteiro, sem marcas. */
export function destacarTermos(texto: string, termos: readonly string[]): ParteDoTexto[] {
  const normalizado = normalizarBusca(texto);
  const utilizaveis = termos.filter(Boolean);
  if (!utilizaveis.length || normalizado.length !== texto.length) return [{ texto, marcado: false }];

  const marcas: Array<[number, number]> = [];
  for (const termo of utilizaveis) {
    let de = 0;
    while (de <= normalizado.length) {
      const posicao = normalizado.indexOf(termo, de);
      if (posicao < 0) break;
      marcas.push([posicao, posicao + termo.length]);
      de = posicao + termo.length;
    }
  }
  if (!marcas.length) return [{ texto, marcado: false }];

  marcas.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const unidas: Array<[number, number]> = [];
  for (const marca of marcas) {
    const ultima = unidas[unidas.length - 1];
    if (ultima && marca[0] <= ultima[1]) ultima[1] = Math.max(ultima[1], marca[1]);
    else unidas.push([marca[0], marca[1]]);
  }

  const partes: ParteDoTexto[] = [];
  let cursor = 0;
  for (const [inicio, fim] of unidas) {
    if (inicio > cursor) partes.push({ texto: texto.slice(cursor, inicio), marcado: false });
    partes.push({ texto: texto.slice(inicio, fim), marcado: true });
    cursor = fim;
  }
  if (cursor < texto.length) partes.push({ texto: texto.slice(cursor), marcado: false });
  return partes;
}
