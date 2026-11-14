// As contas do visor de imagens da mesa e da cena narrativa: de que pedaços do Acervo uma imagem é montada na tela.
// Sem React, para testar. Os pedaços e os níveis são os do Acervo (plataforma/core/acervo.py).

export const LADO_DO_PEDACO = 1024;
/** Imagem com o maior lado acima disto tem também a versão em 1/4, que é a que o visor usa para não baixar dezenas de pedaços. */
export const LIMIAR_DO_NIVEL_REDUZIDO = 2048;

export interface IPedacoDoVisor {
  /** A chave no Acervo (`n0/0/1`, `n2/1/0`). */
  chave: string;
  /** Posição e tamanho do pedaço em fração da imagem inteira (0 a 1), para montar com porcentagem. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IMontagemDoVisor {
  nivel: 'n0' | 'n2';
  /** O tamanho da imagem no nível usado. */
  largura: number;
  altura: number;
  pedacos: IPedacoDoVisor[];
}

/** Os pedaços a baixar para ver a imagem inteira: o nível normal até 2048 px, e a versão em 1/4 acima disso. */
export function montagemDoVisor(larguraOriginal: number, alturaOriginal: number): IMontagemDoVisor | null {
  if (!(larguraOriginal >= 1) || !(alturaOriginal >= 1)) return null;
  const reduzida = Math.max(larguraOriginal, alturaOriginal) > LIMIAR_DO_NIVEL_REDUZIDO;
  const largura = reduzida ? Math.ceil(larguraOriginal / 4) : Math.ceil(larguraOriginal);
  const altura = reduzida ? Math.ceil(alturaOriginal / 4) : Math.ceil(alturaOriginal);
  const nivel = reduzida ? 'n2' : 'n0';
  const pedacos: IPedacoDoVisor[] = [];
  for (let coluna = 0; coluna * LADO_DO_PEDACO < largura; coluna++) {
    for (let linha = 0; linha * LADO_DO_PEDACO < altura; linha++) {
      const x = coluna * LADO_DO_PEDACO;
      const y = linha * LADO_DO_PEDACO;
      pedacos.push({
        chave: `${nivel}/${coluna}/${linha}`,
        x: x / largura,
        y: y / altura,
        w: Math.min(LADO_DO_PEDACO, largura - x) / largura,
        h: Math.min(LADO_DO_PEDACO, altura - y) / altura,
      });
    }
  }
  return { nivel, largura, altura, pedacos };
}

/** A legenda que sobe com a imagem: espaços limpos e no máximo o tamanho que o servidor aceita. */
export function legendaLimpa(texto: string, maximo = 200): string {
  return texto.split(/\s+/).filter(Boolean).join(' ').slice(0, maximo);
}

export interface IFalanteDaCena {
  id: string;
  nome: string;
  /** O token tem retrato para quem olha (nulo: só as iniciais). */
  retrato: string | null;
}

/**
 * Quem aparece embaixo da cena narrativa para quem olha: os falantes que o Mestre escolheu e que esta pessoa enxerga (o
 * mapa só manda os tokens que ela vê, então um NPC escondido nunca aparece), na ordem em que o Mestre os pôs.
 */
export function falantesVisiveis<T extends { id: string }>(ids: readonly string[], tokens: readonly T[]): T[] {
  const porId = new Map(tokens.map((token) => [token.id, token]));
  return ids.map((id) => porId.get(id)).filter((token): token is T => Boolean(token));
}
