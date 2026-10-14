/** Estrutura de livro do Livro de Regras, compartilhada pelo site e pelo PDF.
 *
 * O site mostra um tópico por página e o PDF corre como um livro de verdade, mas os dois
 * precisam concordar em quatro coisas: quais tópicos formam cada capítulo, que número cada
 * um recebe (3.4 é o quarto tópico do capítulo 3), a cor de cada capítulo e por onde um
 * leitor novo deveria começar. Tudo isso mora aqui, num módulo sem dependências de tela,
 * para uma mudança na navegação reordenar o livro inteiro de uma vez.
 *
 * Fica direto em data/regras/ (e não numa subpasta) porque o plugin de fronteira do Vite
 * só limpa o conteúdo reservado ao Mestre dos arquivos desta pasta. Aqui não há texto do
 * Mestre: só ids de tópicos, títulos e a apresentação de cada capítulo. */
import { GRUPOS_NAVEGACAO } from './navegacao';
import { tituloTopico } from './titulos';

export type CorRgb = readonly [number, number, number];

export interface AcentoDoCapitulo {
  /** Cor viva: filete, cabeçalho de tabela, moldura. */
  vivo: CorRgb;
  /** Cor rebaixada: texto sobre papel claro, onde a viva não teria contraste. */
  escuro: CorRgb;
  /** Cor clareada: texto e detalhes sobre o fundo escuro do site. */
  claro: CorRgb;
}

const misturar = (cor: CorRgb, com: CorRgb, peso: number): CorRgb => [
  Math.round(cor[0] + (com[0] - cor[0]) * peso),
  Math.round(cor[1] + (com[1] - cor[1]) * peso),
  Math.round(cor[2] + (com[2] - cor[2]) * peso),
];

/** Uma cor por capítulo, no espírito das cores que a navegação do site usa. Cada par é
 * (cor viva, cor rebaixada); a clara sai da viva misturada com branco. */
const PARES_DE_COR: Record<string, readonly [CorRgb, CorRgb]> = {
  'primeiros-passos': [[74, 140, 104], [54, 104, 78]],
  personagem: [[66, 116, 168], [46, 86, 128]],
  combate: [[160, 62, 74], [124, 44, 56]],
  cenas: [[180, 104, 52], [136, 74, 32]],
  magia: [[118, 80, 164], [88, 58, 126]],
  itens: [[166, 120, 52], [126, 88, 34]],
  veiculos: [[54, 130, 140], [36, 96, 106]],
  mundo: [[104, 138, 58], [74, 102, 38]],
  mestre: [[166, 132, 58], [124, 96, 34]],
};
const PAR_PADRAO: readonly [CorRgb, CorRgb] = [[118, 108, 138], [86, 78, 104]];
const BRANCO: CorRgb = [255, 255, 255];

export const acentoDoCapitulo = (idDoCapitulo: string | undefined): AcentoDoCapitulo => {
  const [vivo, escuro] = (idDoCapitulo && PARES_DE_COR[idDoCapitulo]) || PAR_PADRAO;
  return { vivo, escuro, claro: misturar(vivo, BRANCO, 0.5) };
};

/** Formata uma cor para CSS: "74 140 104" (rgb(var(--x) / .4)) ou "74,140,104" (rgba(var(--x), .4)). */
export const cssRgb = (cor: CorRgb, separador: ' ' | ',' = ' '): string => cor.join(separador);

/** Algarismos romanos de 1 a 20, para a numeração dos capítulos nas aberturas. */
export const romano = (numero: number): string => {
  const tabela: Array<[number, string]> = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let restante = Math.max(1, Math.min(39, Math.trunc(numero)));
  let texto = '';
  for (const [valor, simbolo] of tabela) {
    while (restante >= valor) {
      texto += simbolo;
      restante -= valor;
    }
  }
  return texto;
};

/** Apresentação de cada capítulo: abre a página do capítulo no PDF e o cartão dele no site. */
export const APRESENTACAO_DOS_CAPITULOS: Record<string, string> = {
  'primeiros-passos': 'Se esta é a sua primeira vez, comece por aqui. Os três tópicos explicam o que é o jogo, levam você pela criação de um personagem de nível 1 e reúnem as contas que a ficha faz sozinha.',
  personagem: 'Quem o seu personagem é e no que ele vira. Raças e classes dão a base, perícias e poderes dizem o que ele sabe fazer, e o resto cuida do que acontece entre uma aventura e outra: treino, descanso, experiência, aliados e escolhas permanentes.',
  combate: 'A luta, do primeiro turno à cicatriz que fica depois. Estão aqui as ações de cada turno, os tipos de dano, o que acontece quando alguém cai, como o corpo se recupera e o que pode grudar em quem apanha.',
  cenas: 'Nem toda tensão vira combate. Estes tópicos tratam das cenas em que o grupo age junto: ajudar, atacar ao mesmo tempo, correr atrás de alguém, negociar duro e jogar com a mesa ao vivo no site.',
  magia: 'Como a magia funciona no Jardim: de onde ela vem, quanto custa conjurar, como os elementos se derivam e o que rituais, selos e marcas acrescentam. A lista completa de magias está no Catálogo Mágico.',
  itens: 'Tudo o que se carrega, se melhora e se fabrica: equipamentos, raridades, modificações, criação e os materiais que entram nelas.',
  veiculos: 'Quem dirige, o que acontece numa perseguição, quanto custa manter uma máquina rodando e como se paga uma viagem.',
  mundo: 'O mundo ao redor do grupo: criaturas e companheiros, dinheiro e loja, propriedades e bases, e o que a fama de cada um abre ou fecha.',
  mestre: 'Preparação, dificuldades e condução da campanha. Este capítulo só aparece para quem conduz a mesa.',
};

/** Trilhas de leitura: por onde começar conforme o que você vai fazer na mesa. */
export interface TrilhaDeLeitura {
  id: string;
  titulo: string;
  para: string;
  passos: readonly string[];
  /** A trilha termina num tópico que só existe para quem conduz a mesa. */
  soMestre?: boolean;
}

export const TRILHAS_DE_LEITURA: readonly TrilhaDeLeitura[] = [
  {
    id: 'nunca-joguei',
    titulo: 'Nunca joguei RPG',
    para: 'Comece pelo que a primeira sessão exige e deixe o resto para quando aparecer na mesa.',
    passos: ['como-jogar', 'criacao-personagem', 'pericias', 'combate'],
  },
  {
    id: 'ja-jogo',
    titulo: 'Já jogo RPG',
    para: 'Pegue as fórmulas e vá direto para onde O Jardim mais se afasta do que você conhece.',
    passos: ['sistema-base', 'pericias', 'combate', 'ferimentos'],
  },
  {
    id: 'vou-conjurar',
    titulo: 'Vou conjurar',
    para: 'Entenda os Fluxos e o custo de cada círculo antes de abrir o catálogo de magias.',
    passos: ['magia-fluxo', 'elementos', 'rituais-selos', 'catalogo-magico'],
  },
  {
    id: 'vou-mestrar',
    titulo: 'Vou mestrar',
    para: 'Comece pelo Guia do Mestre e deixe Condições e Ferimentos abertos na primeira sessão.',
    passos: ['mestre', 'condicoes', 'ferimentos'],
    soMestre: true,
  },
];

/** Tópicos que convém ter lido antes de um tópico. Aparece no cabeçalho dele, como atalho.
 * Só entram os pré-requisitos de verdade (o tópico usa um termo ou uma conta que o outro
 * ensina), no máximo dois por tópico. Nenhum alvo é de uso exclusivo do Mestre. */
export const ANTES_DE_LER: Record<string, readonly string[]> = {
  'criacao-personagem': ['como-jogar'],
  pericias: ['sistema-base'],
  'acoes-coletivas': ['pericias'],
  'ataques-combinados': ['combate'],
  'perseguicao-a-pe': ['pericias'],
  'conflito-social': ['pericias'],
  combate: ['sistema-base', 'pericias'],
  'tipos-de-dano': ['combate'],
  distancias: ['combate'],
  ferimentos: ['combate'],
  coreografia: ['combate'],
  descanso: ['ferimentos'],
  treinar: ['pericias'],
  'entre-aventuras': ['descanso'],
  legados: ['xp'],
  'raridades-modificacoes': ['equipamentos'],
  'modificacoes-equipamentos': ['raridades-modificacoes'],
  crafting: ['equipamentos'],
  materiais: ['crafting'],
  'veiculos-cenas': ['veiculos'],
  'veiculos-manutencao': ['veiculos'],
  'magia-fluxo': ['pericias'],
  elementos: ['magia-fluxo'],
  'marcas-cicatrizes': ['magia-fluxo'],
  'rituais-selos': ['magia-fluxo'],
  'catalogo-magico': ['magia-fluxo', 'elementos'],
  condicoes: ['combate'],
  aflicoes: ['condicoes'],
  'poderes-habilidades': ['classes'],
  loja: ['economia'],
  bases: ['economia'],
};

/** Para onde seguir depois de um tópico, além do próximo da fila: até três tópicos
 * relacionados, mostrados no rodapé do tópico no site e como "Veja também" no PDF. */
export const CONTINUE_EM: Record<string, readonly string[]> = {
  'sistema-base': ['pericias', 'combate'],
  pericias: ['acoes-coletivas', 'combate'],
  'criacao-personagem': ['racas', 'classes', 'equipamentos'],
  'acoes-coletivas': ['ataques-combinados', 'conflito-social'],
  'ataques-combinados': ['combate', 'acoes-coletivas'],
  'perseguicao-a-pe': ['distancias', 'veiculos-cenas'],
  'conflito-social': ['mundo-faccoes', 'acoes-coletivas'],
  combate: ['tipos-de-dano', 'ferimentos', 'condicoes'],
  'tipos-de-dano': ['elementos', 'aflicoes'],
  distancias: ['combate', 'perseguicao-a-pe'],
  ferimentos: ['descanso', 'condicoes'],
  descanso: ['ferimentos', 'entre-aventuras'],
  treinar: ['xp', 'entre-aventuras'],
  'entre-aventuras': ['treinar', 'crafting', 'bases'],
  xp: ['legados', 'treinar'],
  legados: ['xp', 'frutos-implantes'],
  aliados: ['bestiario', 'combate'],
  'frutos-implantes': ['economia', 'loja'],
  equipamentos: ['raridades-modificacoes', 'loja'],
  'raridades-modificacoes': ['modificacoes-equipamentos', 'crafting'],
  'modificacoes-equipamentos': ['crafting', 'loja'],
  crafting: ['materiais', 'loja'],
  materiais: ['crafting', 'veiculos-manutencao'],
  veiculos: ['veiculos-cenas', 'veiculos-manutencao'],
  'veiculos-cenas': ['combate', 'distancias'],
  'veiculos-manutencao': ['materiais', 'transporte'],
  transporte: ['veiculos', 'economia'],
  'magia-fluxo': ['elementos', 'rituais-selos', 'catalogo-magico'],
  elementos: ['tipos-de-dano', 'catalogo-magico'],
  'marcas-cicatrizes': ['magia-fluxo', 'catalogo-magico'],
  'rituais-selos': ['materiais', 'marcas-cicatrizes'],
  condicoes: ['aflicoes', 'descanso'],
  aflicoes: ['condicoes', 'descanso'],
  classes: ['poderes-habilidades', 'racas'],
  'poderes-habilidades': ['classes', 'magia-fluxo'],
  racas: ['classes', 'criacao-personagem'],
  bestiario: ['aliados', 'loja'],
  economia: ['loja', 'transporte', 'entre-aventuras'],
  loja: ['economia', 'bestiario', 'bases'],
  bases: ['entre-aventuras', 'crafting'],
  'mundo-faccoes': ['conflito-social', 'economia'],
};

/** Palavras por minuto de leitura de um texto de regras, que se lê devagar e volta atrás. */
const PALAVRAS_POR_MINUTO = 150;

const semMarcacao = (html: string): string => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&[a-z]+;/gi, ' ');

/** Quantas palavras tem um trecho de HTML de regra. */
export const contarPalavras = (html: string): number => (semMarcacao(html).match(/\S+/g) || []).length;

/** Tempo de leitura em minutos (no mínimo 1). */
export const tempoDeLeituraEmMinutos = (html: string): number => (
  Math.max(1, Math.round(contarPalavras(html) / PALAVRAS_POR_MINUTO))
);

export interface TopicoNumerado {
  id: string;
  titulo: string;
  /** "3.4": quarto tópico do terceiro capítulo. */
  numero: string;
}

export interface CapituloNumerado {
  id: string;
  /** Posição do capítulo no livro, a partir de 1. */
  numero: number;
  titulo: string;
  /** Uma linha, como na navegação. */
  descricao: string;
  /** Duas ou três frases, para a abertura do capítulo. */
  apresentacao: string;
  topicos: TopicoNumerado[];
}

export interface OpcoesDaNumeracao {
  /** Títulos que sobrescrevem os de fábrica (edição editorial por campanha). */
  titulos?: Record<string, string>;
  /** Inclui o capítulo do Guia do Mestre. */
  comMestre?: boolean;
}

/** Capítulos e tópicos já numerados, na ordem da navegação.
 *
 * Só entra o que está em `disponiveis`. Tópico disponível que não esteja em nenhum capítulo
 * vai para um capítulo final de "Regras avulsas", para nunca sumir do livro por esquecimento. */
export function numerarLivro(
  disponiveis: Iterable<string>,
  { titulos, comMestre = false }: OpcoesDaNumeracao = {},
): CapituloNumerado[] {
  const existentes = new Set(disponiveis);
  const usados = new Set<string>();
  const capitulos: CapituloNumerado[] = [];

  GRUPOS_NAVEGACAO.filter((grupo) => comMestre || grupo.id !== 'mestre').forEach((grupo) => {
    const numero = capitulos.length + 1;
    const topicos = grupo.topicos
      .filter((id) => existentes.has(id))
      .map((id, indice): TopicoNumerado => {
        usados.add(id);
        return { id, titulo: tituloTopico(id, titulos), numero: `${numero}.${indice + 1}` };
      });
    if (!topicos.length) return;
    capitulos.push({
      id: grupo.id,
      numero,
      titulo: grupo.titulo,
      descricao: grupo.descricao,
      apresentacao: APRESENTACAO_DOS_CAPITULOS[grupo.id] || grupo.descricao,
      topicos,
    });
  });

  const soltos = [...existentes].filter((id) => !usados.has(id) && (comMestre || id !== 'mestre'));
  if (soltos.length) {
    const numero = capitulos.length + 1;
    capitulos.push({
      id: 'avulsos',
      numero,
      titulo: 'Regras avulsas',
      descricao: 'Tópicos que ainda não foram colocados em nenhum capítulo da navegação.',
      apresentacao: 'Tópicos que ainda não foram colocados em nenhum capítulo da navegação.',
      topicos: soltos.map((id, indice) => ({ id, titulo: tituloTopico(id, titulos), numero: `${numero}.${indice + 1}` })),
    });
  }
  return capitulos;
}

/** O capítulo e o número de um tópico, ou null se ele não estiver no livro. */
export function localizarTopico(
  capitulos: readonly CapituloNumerado[],
  idDoTopico: string,
): { capitulo: CapituloNumerado; topico: TopicoNumerado; indiceNoLivro: number } | null {
  let indiceNoLivro = 0;
  for (const capitulo of capitulos) {
    for (const topico of capitulo.topicos) {
      if (topico.id === idDoTopico) return { capitulo, topico, indiceNoLivro };
      indiceNoLivro += 1;
    }
  }
  return null;
}
