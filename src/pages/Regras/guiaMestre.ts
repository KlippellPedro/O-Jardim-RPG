/** Estrutura do Guia do Mestre, lida do próprio HTML do capítulo.
 *
 * O guia chega do servidor como um capítulo só (a chave `mestre` é a que o
 * servidor esconde de quem não conduz a mesa), e cresceu até virar uma parede
 * de vinte seções e quarenta tabelas. Em vez de partir o capítulo em vários,
 * que faria o conteúdo vazar pela regra de visibilidade, o texto marca as
 * próprias estantes com `<section class="regras-estante regras-estante--id">`
 * e esta função devolve essa organização para a tela montar o mapa.
 *
 * Tudo aqui é leitura por expressão regular, sem DOM, para rodar igual no
 * navegador e nos testes em Node. O HTML continua passando pelo sanitizador
 * na hora de virar innerHTML: esta etapa só mede e recorta.
 */

export interface TabelaDoGuia {
  id: string;
  titulo: string;
  dado: string | null;
}

export interface SecaoDoGuia {
  id: string;
  titulo: string;
  tabelas: TabelaDoGuia[];
}

export interface EstanteDoGuia {
  id: string;
  titulo: string;
  quando: string;
  html: string;
  secoes: SecaoDoGuia[];
  totalTabelas: number;
}

export interface GuiaDoMestreEstruturado {
  introducao: string;
  estantes: EstanteDoGuia[];
}

export interface ResultadoBuscaGuia {
  estanteId: string;
  estanteTitulo: string;
  secaoId: string;
  secaoTitulo: string;
  tabelaTitulo: string | null;
  trecho: string;
}

const semAcento = (valor: string) => valor
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('pt-BR');

const decodificar = (valor: string) => valor
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

export const textoDoHtml = (html: string) => decodificar(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Mesmo id que o RegrasContent grava em cada h3. Os dois precisam bater para
 *  o mapa conseguir rolar a leitura até a seção certa. */
export const idDaSecao = (titulo: string) => {
  const slug = semAcento(titulo).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `secao-${slug || 'topico'}`;
};

const idDaTabela = (titulo: string) => `tabela-${semAcento(titulo).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

const REGEX_ESTANTE = /<section class="regras-estante regras-estante--([a-z0-9-]+)">([\s\S]*?)<\/section>/g;
const REGEX_CABECA = /<div class="regras-estante-cabeca">([\s\S]*?)<\/div>/;
const REGEX_H3 = /<h3[^>]*>([\s\S]*?)<\/h3>/g;
const REGEX_SUMMARY = /<summary>([\s\S]*?)<\/summary>/g;

function tabelasDe(html: string): TabelaDoGuia[] {
  return [...html.matchAll(REGEX_SUMMARY)].map((achado) => {
    const dado = achado[1].match(/<span class="regras-details-contagem">([\s\S]*?)<\/span>/);
    const titulo = textoDoHtml(achado[1].replace(/<span class="regras-details-contagem">[\s\S]*?<\/span>/, ''));
    return { id: idDaTabela(titulo), titulo, dado: dado ? textoDoHtml(dado[1]) : null };
  });
}

/** Recorta o HTML de uma estante em pedaços que começam em cada h3. O trecho
 *  antes do primeiro h3, quando existe, fica sem seção. */
function pedacosPorSecao(html: string): Array<{ titulo: string | null; html: string }> {
  const inicios = [...html.matchAll(REGEX_H3)].map((achado) => ({ indice: achado.index ?? 0, titulo: textoDoHtml(achado[1]) }));
  if (!inicios.length) return [{ titulo: null, html }];
  const pedacos: Array<{ titulo: string | null; html: string }> = [];
  if (inicios[0].indice > 0) pedacos.push({ titulo: null, html: html.slice(0, inicios[0].indice) });
  inicios.forEach((inicio, posicao) => {
    const fim = posicao + 1 < inicios.length ? inicios[posicao + 1].indice : html.length;
    pedacos.push({ titulo: inicio.titulo, html: html.slice(inicio.indice, fim) });
  });
  return pedacos;
}

export function estruturarGuiaMestre(html: string): GuiaDoMestreEstruturado {
  const fonte = html || '';
  const estantes: EstanteDoGuia[] = [];
  let introducao = '';
  let cursor = 0;

  for (const achado of fonte.matchAll(REGEX_ESTANTE)) {
    const inicio = achado.index ?? 0;
    introducao += fonte.slice(cursor, inicio);
    cursor = inicio + achado[0].length;

    const [, id, interno] = achado;
    const cabeca = interno.match(REGEX_CABECA);
    const titulo = cabeca ? textoDoHtml(cabeca[1].match(/<h4[^>]*>([\s\S]*?)<\/h4>/)?.[1] || '') : '';
    const quando = cabeca ? textoDoHtml(cabeca[1].match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] || '') : '';
    const corpo = cabeca ? interno.replace(REGEX_CABECA, '') : interno;

    const secoes = pedacosPorSecao(corpo)
      .filter((pedaco): pedaco is { titulo: string; html: string } => Boolean(pedaco.titulo))
      .map((pedaco) => ({ id: idDaSecao(pedaco.titulo), titulo: pedaco.titulo, tabelas: tabelasDe(pedaco.html) }));

    estantes.push({
      id,
      titulo: titulo || id,
      quando,
      html: corpo,
      secoes,
      totalTabelas: secoes.reduce((total, secao) => total + secao.tabelas.length, 0),
    });
  }
  introducao += fonte.slice(cursor);

  // Conteúdo sem estantes (uma edição de campanha que apagou as marcas, por
  // exemplo) continua legível: vira uma estante única com o capítulo inteiro.
  if (!estantes.length) {
    const secoes = pedacosPorSecao(fonte)
      .filter((pedaco): pedaco is { titulo: string; html: string } => Boolean(pedaco.titulo))
      .map((pedaco) => ({ id: idDaSecao(pedaco.titulo), titulo: pedaco.titulo, tabelas: tabelasDe(pedaco.html) }));
    return {
      introducao: '',
      estantes: [{
        id: 'guia',
        titulo: 'Guia do Mestre',
        quando: '',
        html: fonte,
        secoes,
        totalTabelas: secoes.reduce((total, secao) => total + secao.tabelas.length, 0),
      }],
    };
  }

  return { introducao: introducao.trim(), estantes };
}

/** A Biblioteca não mora no HTML do capítulo: ela é montada na tela com as
 *  tabelas de calibragem e as notas internas que vêm da API da campanha. Entra
 *  na navegação como a última estante para o Mestre achar tudo no mesmo mapa. */
export const ESTANTE_BIBLIOTECA = {
  id: 'biblioteca',
  titulo: 'Biblioteca da campanha',
  quando: 'Tabelas de calibragem sincronizadas com a campanha ativa e as notas internas que só quem conduz vê.',
} as const;

export function estantesParaNavegacao(guia: GuiaDoMestreEstruturado): Array<{ id: string; titulo: string }> {
  return [
    ...guia.estantes.map(({ id, titulo }) => ({ id, titulo })),
    { id: ESTANTE_BIBLIOTECA.id, titulo: ESTANTE_BIBLIOTECA.titulo },
  ];
}

const TAMANHO_TRECHO = 110;

function trechoEm(texto: string, termo: string) {
  const posicao = semAcento(texto).indexOf(termo);
  if (posicao < 0) return texto.slice(0, TAMANHO_TRECHO);
  // Começa e termina em palavra inteira: trecho cortado no meio da palavra
  // parece erro de digitação no resultado.
  let inicio = Math.max(0, posicao - 40);
  if (inicio > 0) {
    const espaco = texto.indexOf(' ', inicio);
    if (espaco > -1 && espaco < posicao) inicio = espaco + 1;
  }
  let fim = Math.min(texto.length, inicio + TAMANHO_TRECHO);
  if (fim < texto.length) {
    const espaco = texto.lastIndexOf(' ', fim);
    if (espaco > posicao) fim = espaco;
  }
  return `${inicio > 0 ? '…' : ''}${texto.slice(inicio, fim)}${fim < texto.length ? '…' : ''}`;
}

/** Procura em títulos, tabelas e texto. Cada palavra do termo precisa aparecer
 *  no mesmo pedaço, e acento não importa: quem digita "relogio" acha Relógio. */
export function buscarNoGuia(guia: GuiaDoMestreEstruturado, busca: string, limite = 12): ResultadoBuscaGuia[] {
  const palavras = semAcento(busca.trim()).split(/\s+/).filter((palavra) => palavra.length > 1);
  if (!palavras.length) return [];
  const resultados: ResultadoBuscaGuia[] = [];
  const contem = (texto: string) => {
    const alvo = semAcento(texto);
    return palavras.every((palavra) => alvo.includes(palavra));
  };

  for (const estante of guia.estantes) {
    for (const pedaco of pedacosPorSecao(estante.html)) {
      if (!pedaco.titulo) continue;
      const secaoId = idDaSecao(pedaco.titulo);
      const blocosTabela = [...pedaco.html.matchAll(/<details[\s\S]*?<\/details>/g)].map((bloco) => bloco[0]);
      const textoSemTabelas = textoDoHtml(blocosTabela.reduce((resto, bloco) => resto.replace(bloco, ' '), pedaco.html));

      if (contem(`${pedaco.titulo} ${textoSemTabelas}`)) {
        resultados.push({
          estanteId: estante.id,
          estanteTitulo: estante.titulo,
          secaoId,
          secaoTitulo: pedaco.titulo,
          tabelaTitulo: null,
          trecho: trechoEm(textoSemTabelas, palavras[0]),
        });
      }
      for (const bloco of blocosTabela) {
        const [tabela] = tabelasDe(bloco);
        const texto = textoDoHtml(bloco);
        if (!tabela || !contem(`${pedaco.titulo} ${texto}`)) continue;
        resultados.push({
          estanteId: estante.id,
          estanteTitulo: estante.titulo,
          secaoId,
          secaoTitulo: pedaco.titulo,
          tabelaTitulo: tabela.titulo,
          trecho: trechoEm(texto, palavras[0]),
        });
      }
      if (resultados.length >= limite) return resultados.slice(0, limite);
    }
  }
  return resultados;
}
