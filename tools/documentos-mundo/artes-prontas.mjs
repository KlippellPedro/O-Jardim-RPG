/**
 * Artes prontas das capas do livro.
 *
 * A capa, a contracapa e a abertura de cada capítulo (e de cada parte do Compêndio) nascem com o emblema da Árvore em
 * vetor. Quem preferir uma arte própria guarda a imagem em docs/livro/artes/ com o nome combinado e roda
 * `npm run docs:livro`: o gerador troca o emblema pela imagem naquela página e deixa o resto como está. Cada capa é
 * independente, então dá para manter o emblema numas e trocar noutras.
 *
 * Nomes (a extensão pode ser jpg, jpeg, png ou webp):
 *   capa                         capa do livro
 *   contracapa                   contracapa
 *   abertura-<id da parte>       abertura de capítulo, como abertura-combate ou abertura-compendio-classes
 *
 * A imagem vira a página inteira (210 × 297 mm), com um véu escuro por baixo do texto da abertura. O que não for
 * JPEG é reduzido e regravado como JPEG dentro do próprio Chrome, no momento de imprimir, para o PDF não crescer
 * com PNG de 2 MB por página.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RAIZ } from './dados.mjs';

export const PASTA_DAS_ARTES = join(RAIZ, 'docs', 'livro', 'artes');

/** A pasta pode ser trocada pela variável LIVRO_PASTA_DAS_ARTES (os testes usam uma pasta temporária). */
const pastaDasArtes = () => process.env.LIVRO_PASTA_DAS_ARTES || PASTA_DAS_ARTES;

const TIPOS = [
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
];

/** Os nomes de arquivo que o livro procura, na ordem em que as capas aparecem. */
export const nomesDasArtes = (partes) => [
  'capa',
  'contracapa',
  ...partes.map((parte) => `abertura-${parte.id}`),
];

/** A arte pronta de uma capa, ou null quando não há arquivo com esse nome. */
export const artePronta = (nome, pasta = pastaDasArtes()) => {
  for (const [extensao, tipo] of TIPOS) {
    const caminho = join(pasta, `${nome}.${extensao}`);
    if (!existsSync(caminho)) continue;
    const bytes = readFileSync(caminho);
    return {
      nome,
      arquivo: `${nome}.${extensao}`,
      tipo,
      bytes: bytes.length,
      hash: createHash('sha256').update(bytes).digest('hex').slice(0, 12),
      // Data URI porque o Chrome só deixa regravar a imagem (canvas) quando ela é da própria página.
      src: `data:${tipo};base64,${bytes.toString('base64')}`,
    };
  }
  return null;
};

/** A tag da imagem de página inteira, ou string vazia. */
export const imagemDePagina = (arte) => (arte
  ? `<img class="pagina-imagem" alt="" src="${arte.src}" data-arte-pronta="${arte.arquivo}" data-hash="${arte.hash}" data-tipo="${arte.tipo}" data-bytes="${arte.bytes}">`
  : '');
