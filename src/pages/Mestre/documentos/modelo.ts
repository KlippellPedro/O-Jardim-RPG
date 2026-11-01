/**
 * Documentos do Mestre: o que é um modelo e as contas que não dependem do navegador.
 *
 * Um modelo é um papel do Jardim (cartaz de procurado, carta, edital...) com uma lista de
 * campos e uma função que desenha tudo num canvas. O Mestre só preenche os campos; o servidor
 * guarda os valores como texto (core/documentos.py) e o desenho acontece sempre aqui, o mesmo
 * para a prévia, para a imagem baixada e para a impressão.
 */

import type { Pincel } from './pincel';

export type TipoDeCampo = 'texto' | 'paragrafo' | 'imagem' | 'escolha';

export interface IOpcaoDeCampo {
  valor: string;
  rotulo: string;
}

export interface ICampoDoModelo {
  /** Chave do valor salvo: letras e números, começando por letra (o servidor confere). */
  id: string;
  rotulo: string;
  tipo: TipoDeCampo;
  /** O exemplo que já vem preenchido quando o Mestre escolhe o modelo. Imagem começa vazia. */
  padrao: string;
  dica?: string;
  opcoes?: IOpcaoDeCampo[];
  /** Limite de caracteres no formulário. */
  maximo?: number;
  /** Altura da caixa de um parágrafo, em linhas. */
  linhas?: number;
}

export type CategoriaDeModelo = 'Cartazes' | 'Cartas e bilhetes' | 'Cartões' | 'Papéis oficiais' | 'Imprensa';

export type IconeDeModelo = 'procurado' | 'carta' | 'bilhete' | 'cartao' | 'credencial' | 'edital' | 'contrato' | 'jornal' | 'relatorio';

export interface IModeloDeDocumento {
  id: string;
  nome: string;
  categoria: CategoriaDeModelo;
  icone: IconeDeModelo;
  descricao: string;
  /** Tamanho do desenho, em pixels do canvas. */
  largura: number;
  altura: number;
  /** Tamanho da peça impressa, em milímetros. */
  impressao: { largura: number; altura: number };
  /** Peças pequenas (cartão) saem repetidas na folha, prontas para recortar. */
  copiasNaFolha?: boolean;
  campos: ICampoDoModelo[];
  /** Campo que dá nome ao documento na lista enquanto o Mestre não escolher outro. */
  campoDoTitulo: string;
  desenhar: (pincel: Pincel, valores: Readonly<Record<string, string>>) => void;
}

export type ValoresDoDocumento = Record<string, string>;

/** O valor de cada campo: o que o Mestre salvou ou, se o campo ainda não existia no documento, o exemplo do modelo. */
export function valoresComPadrao(modelo: IModeloDeDocumento, campos: Readonly<Record<string, string>> = {}): ValoresDoDocumento {
  const valores: ValoresDoDocumento = {};
  for (const campo of modelo.campos) {
    const salvo = campos[campo.id];
    let valor = typeof salvo === 'string' ? salvo : campo.padrao;
    if (campo.tipo === 'escolha' && campo.opcoes && !campo.opcoes.some((opcao) => opcao.valor === valor)) {
      valor = campo.padrao;
    }
    valores[campo.id] = valor;
  }
  return valores;
}

/** Só os campos que o modelo conhece, para não mandar ao servidor sobra de um modelo antigo. */
export function camposParaSalvar(modelo: IModeloDeDocumento, valores: Readonly<Record<string, string>>): ValoresDoDocumento {
  const campos: ValoresDoDocumento = {};
  for (const campo of modelo.campos) {
    const valor = valores[campo.id];
    if (typeof valor === 'string') campos[campo.id] = valor;
  }
  return campos;
}

/** Os textos voltam vazios; escolhas e imagens ficam como estão. */
export function limparTextos(modelo: IModeloDeDocumento, valores: Readonly<Record<string, string>>): ValoresDoDocumento {
  const limpos: ValoresDoDocumento = { ...valores };
  for (const campo of modelo.campos) {
    if (campo.tipo === 'texto' || campo.tipo === 'paragrafo') limpos[campo.id] = '';
  }
  return limpos;
}

export function tituloSugerido(modelo: IModeloDeDocumento, valores: Readonly<Record<string, string>>): string {
  const destaque = (valores[modelo.campoDoTitulo] ?? '').replace(/\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim();
  const titulo = destaque ? `${modelo.nome}: ${destaque}` : modelo.nome;
  return titulo.slice(0, 120);
}

export function nomeDoArquivo(titulo: string, extensao = 'png'): string {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${base || 'documento'}.${extensao}`;
}

// ---------------------------------------------------------------- texto em bloco

/** Um pedaço de texto e se ele sai tarjado. O Mestre tarja um trecho escrevendo [[assim]]. */
export interface IPedaco {
  texto: string;
  tarja: boolean;
}

export function segmentarTarjas(texto: string): IPedaco[] {
  const pedacos: IPedaco[] = [];
  const padrao = /\[\[([\s\S]*?)\]\]/g;
  let inicio = 0;
  for (let achado = padrao.exec(texto); achado; achado = padrao.exec(texto)) {
    if (achado.index > inicio) pedacos.push({ texto: texto.slice(inicio, achado.index), tarja: false });
    if (achado[1]) pedacos.push({ texto: achado[1], tarja: true });
    inicio = achado.index + achado[0].length;
  }
  if (inicio < texto.length) pedacos.push({ texto: texto.slice(inicio), tarja: false });
  return pedacos;
}

export interface ILinhaDeTexto {
  palavras: IPedaco[];
  /** Última linha do parágrafo: no texto justificado ela fica alinhada à esquerda. */
  fimDeParagrafo: boolean;
}

/** Palavra mais larga que a linha é cortada por letra, para nunca vazar do papel. */
function cortarPalavra(palavra: IPedaco, larguraMaxima: number, medir: (texto: string) => number): IPedaco[] {
  if (medir(palavra.texto) <= larguraMaxima) return [palavra];
  const partes: IPedaco[] = [];
  let atual = '';
  for (const letra of palavra.texto) {
    if (atual && medir(atual + letra) > larguraMaxima) {
      partes.push({ texto: atual, tarja: palavra.tarja });
      atual = letra;
    } else {
      atual += letra;
    }
  }
  if (atual) partes.push({ texto: atual, tarja: palavra.tarja });
  return partes;
}

/** Quebra o texto em linhas que cabem na largura. `medir` devolve a largura de um texto na fonte em uso. */
export function quebrarEmLinhas(texto: string, larguraMaxima: number, medir: (texto: string) => number): ILinhaDeTexto[] {
  const linhas: ILinhaDeTexto[] = [];
  const espaco = medir(' ');
  for (const paragrafo of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const palavras = segmentarTarjas(paragrafo).flatMap((pedaco) => pedaco.texto
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((palavra) => cortarPalavra({ texto: palavra, tarja: pedaco.tarja }, larguraMaxima, medir)));
    if (!palavras.length) {
      linhas.push({ palavras: [], fimDeParagrafo: true });
      continue;
    }
    let atual: IPedaco[] = [];
    let largura = 0;
    for (const palavra of palavras) {
      const larguraDaPalavra = medir(palavra.texto);
      const proxima = atual.length ? largura + espaco + larguraDaPalavra : larguraDaPalavra;
      if (atual.length && proxima > larguraMaxima) {
        linhas.push({ palavras: atual, fimDeParagrafo: false });
        atual = [palavra];
        largura = larguraDaPalavra;
      } else {
        atual.push(palavra);
        largura = proxima;
      }
    }
    linhas.push({ palavras: atual, fimDeParagrafo: true });
  }
  return linhas;
}

/** Cláusulas de contrato: uma por linha, sem as linhas vazias e sem a numeração que o Mestre já tenha posto. */
export function itensDaLista(texto: string): string[] {
  return texto
    .split('\n')
    .map((linha) => linha.replace(/^\s*(?:\d+[.)-]|[-*•])\s*/, '').trim())
    .filter(Boolean);
}
