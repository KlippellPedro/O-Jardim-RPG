/**
 * O emblema de O Jardim: a árvore dourada do ícone do app
 * (public/assets/img/icons/app-icon.svg), em SVG para a capa e as aberturas
 * de capítulo do livro.
 *
 * É desenho vetorial puro, sem imagem e sem gradiente com transparência, de
 * propósito: no PDF isso vira poucos traços de caneta em vez de bitmap, e o
 * arquivo precisa caber no pacote da plataforma (o teto de upload da
 * hospedagem é de 100 MB e o pacote já passa de 90).
 */

const TRONCO_E_GALHOS = [
  ['M256 430 L256 250', 18],
  ['M256 300 C220 260 196 232 180 196', 12],
  ['M256 300 C292 260 316 232 332 196', 12],
  ['M256 262 C246 224 240 196 244 158', 12],
  ['M256 262 C266 224 272 196 268 158', 12],
  ['M180 196 C168 176 150 166 132 160', 8],
  ['M180 196 C186 172 182 152 172 132', 8],
  ['M332 196 C344 176 362 166 380 160', 8],
  ['M332 196 C326 172 330 152 340 132', 8],
  ['M244 158 C230 138 214 128 196 122', 8],
  ['M268 158 C282 138 298 128 316 122', 8],
  ['M206 430 Q256 452 306 430', 16],
];

const FOLHAS = [
  [132, 160, 9], [172, 132, 9], [380, 160, 9], [340, 132, 9], [196, 122, 9], [316, 122, 9], [256, 104, 11],
];

const VIEWBOX = '104 92 304 372';

const caminhos = (traco) => TRONCO_E_GALHOS
  .map(([d, largura]) => `<path d="${d}" stroke-width="${largura}"/>`)
  .join('');

const pontos = (cor) => FOLHAS
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}"/>`)
  .join('');

/** A árvore em ouro, com o mesmo degradê do ícone (de cima para baixo). */
export const emblemaDourado = (classe = 'emblema') => `
<svg class="${classe}" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="ouro-${classe}" gradientUnits="userSpaceOnUse" x1="0" y1="104" x2="0" y2="452">
      <stop offset="0%" stop-color="#e7cf6a"/>
      <stop offset="100%" stop-color="#b8901f"/>
    </linearGradient>
  </defs>
  <g stroke="url(#ouro-${classe})" fill="none" stroke-linecap="round" stroke-linejoin="round">${caminhos()}</g>
  ${pontos('#e7cf6a')}
</svg>`;

/** A árvore numa cor só (r,g,b), para marca d'água nas aberturas, onde cada capítulo tem a sua cor. */
export const emblemaEmCor = (rgb, opacidade = 1, classe = 'emblema') => `
<svg class="${classe}" viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="rgb(${rgb})" stroke-opacity="${opacidade}" fill="none" stroke-linecap="round" stroke-linejoin="round">${caminhos()}</g>
  <g fill="rgb(${rgb})" fill-opacity="${opacidade}">${FOLHAS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
</svg>`;

/** Fio com um losango no meio, para separar partes de uma folha. */
export const fioComLosango = (rgb) => `
<svg class="fio-losango" viewBox="0 0 120 8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="rgb(${rgb})" stroke-width="0.6" fill="none"><path d="M0 4 H52 M68 4 H120"/></g>
  <path d="M60 0.6 L63.4 4 L60 7.4 L56.6 4 Z" fill="rgb(${rgb})"/>
</svg>`;
