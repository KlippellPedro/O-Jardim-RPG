/**
 * Gera os cartões imprimíveis de condição em PDF (A4, 9 cartões por folha).
 *
 *   npm run docs:cartoes
 *
 * Três arquivos em docs/cartoes/, para cada um poder ser impresso e entregue
 * separado:
 *
 *   Cartoes-Cena-e-Crises.pdf        condições de combate e de cena + crises de Sanidade
 *   Cartoes-Lesoes-e-Sequelas.pdf    ossos, ferimentos, perdas e sequelas do corpo
 *   Cartoes-Saude-Mental.pdf         transtornos, humor e comportamento, fobias
 *
 * O texto sai literal de data/regras/condicoes.ts e condicoes-longo-prazo.ts,
 * as mesmas fontes da ficha e do livro: corrigir a condição lá corrige o
 * cartão na próxima geração.
 *
 * Cada cartão encolhe a fonte sozinho, dentro de um piso, até o texto caber.
 * Se mesmo no piso não couber, o gerador avisa em vez de entregar um cartão
 * cortado.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes.ts';
import { CONDICOES_LONGO_PRAZO, FILTRO_DO_GRUPO } from '../../data/regras/condicoes-longo-prazo.ts';
import {
  CSS_CARTOES, LARGURA_CARTAO, ALTURA_CARTAO, MARGEM_X, MARGEM_Y,
} from './estilo-cartoes.mjs';
import { RAIZ } from './dados.mjs';
import { abrirChrome, imprimir } from './render.mjs';

const SAIDA = join(RAIZ, 'docs', 'cartoes');
const HTML_DIR = join(SAIDA, '_html');
mkdirSync(HTML_DIR, { recursive: true });

const esc = (t) => String(t)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const CLASSE_CATEGORIA = { 'física': 'fisica', mental: 'mental', combate: 'combate' };

function cartao(condicao, rotuloTopo) {
  return `<article class="cartao ${CLASSE_CATEGORIA[condicao.categoria] ?? ''}">
  <header class="topo">
    <div class="linha"><span>${esc(rotuloTopo)}</span></div>
    <h2>${esc(condicao.titulo)}</h2>
  </header>
  <div class="miolo">
    <p class="duracao"><span>${esc(condicao.duracao)}</span>${condicao.permanente ? '<span class="selo">Permanente</span>' : ''}</p>
    <ul class="efeitos">${condicao.efeitos.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
  </div>
  <div class="saida"><b>Como sair</b>${esc(condicao.remocao)}</div>
</article>`;
}

/** Marcas de corte nas quatro linhas verticais e nas quatro horizontais da grade. */
function marcasDeCorte() {
  const xs = [0, 1, 2, 3].map((i) => MARGEM_X + i * LARGURA_CARTAO);
  const ys = [0, 1, 2, 3].map((i) => MARGEM_Y + i * ALTURA_CARTAO);
  const topo = MARGEM_Y - 5;
  const base = MARGEM_Y + ALTURA_CARTAO * 3 + 1;
  const esq = MARGEM_X - 5;
  const dir = MARGEM_X + LARGURA_CARTAO * 3 + 1;
  return [
    ...xs.flatMap((x) => [
      `<i class="marca v" style="left:${x - 0.1}mm;top:${topo}mm"></i>`,
      `<i class="marca v" style="left:${x - 0.1}mm;top:${base}mm"></i>`,
    ]),
    ...ys.flatMap((y) => [
      `<i class="marca h" style="top:${y - 0.1}mm;left:${esq}mm"></i>`,
      `<i class="marca h" style="top:${y - 0.1}mm;left:${dir}mm"></i>`,
    ]),
  ].join('');
}

/** Distribui os cartões em folhas de 9. A última folha completa com vazios. */
function folhas(cartoes) {
  const paginas = [];
  for (let i = 0; i < cartoes.length; i += 9) {
    const grupo = cartoes.slice(i, i + 9);
    while (grupo.length < 9) grupo.push('<div class="cartao vazio"></div>');
    paginas.push(`<section class="folha">${marcasDeCorte()}<div class="grade">${grupo.join('')}</div></section>`);
  }
  return paginas;
}

/** Roda dentro do Chrome: encolhe a fonte de cada cartão até o texto caber. */
const AJUSTE = `
(function () {
  var MAXIMO = 9, PISO = 6, PASSO = 0.1;
  document.querySelectorAll('.cartao:not(.vazio)').forEach(function (c) {
    var fs = MAXIMO;
    c.style.setProperty('--fs', fs + 'pt');
    function estoura() {
      var miolo = c.querySelector('.miolo');
      var saida = c.querySelector('.saida');
      var topo = c.querySelector('.topo');
      var usado = topo.offsetHeight + miolo.scrollHeight + saida.offsetHeight
        + parseFloat(getComputedStyle(saida).marginBottom);
      return usado > c.clientHeight + 0.5;
    }
    while (estoura() && fs > PISO) {
      fs = Math.round((fs - PASSO) * 10) / 10;
      c.style.setProperty('--fs', fs + 'pt');
    }
    c.setAttribute('data-fs', String(fs));
    if (estoura()) c.setAttribute('data-estoura', '1');
  });
})();`;

const INSPECAO = `(function () {
  var achados = [];
  document.querySelectorAll('.cartao:not(.vazio)').forEach(function (c) {
    var titulo = c.querySelector('h2').textContent;
    if (c.getAttribute('data-estoura')) achados.push({ titulo: titulo, tipo: 'estoura', fs: c.getAttribute('data-fs') });
    else if (parseFloat(c.getAttribute('data-fs')) < 6.6) achados.push({ titulo: titulo, tipo: 'apertado', fs: c.getAttribute('data-fs') });
  });
  return JSON.stringify(achados);
})()`;

const montarHtml = (titulo, paginas) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(titulo)}</title>
<style>${CSS_CARTOES}</style>
</head><body>
${paginas.join('\n')}
<script>${AJUSTE}</script>
</body></html>`;

/* ------------------------------------------------------------------ */

const doFiltro = (filtro) => CONDICOES_LONGO_PRAZO.filter((c) => FILTRO_DO_GRUPO[c.grupo] === filtro);

const documentos = [
  {
    arquivo: 'Cartoes-Cena-e-Crises',
    titulo: 'Cartões de condição: cena e crises de Sanidade',
    cartoes: [
      ...CONDICOES_OFICIAIS.map((c) => cartao(c, c.categoria === 'combate' ? 'Combate' : `Condição ${c.categoria}`)),
      ...CRISES_SANIDADE.map((c) => cartao(c, 'Crise de Sanidade')),
    ],
  },
  {
    arquivo: 'Cartoes-Lesoes-e-Sequelas',
    titulo: 'Cartões de condição: lesões e sequelas',
    cartoes: [...doFiltro('lesoes'), ...doFiltro('sequelas')].map((c) => cartao(c, c.grupo)),
  },
  {
    arquivo: 'Cartoes-Saude-Mental',
    titulo: 'Cartões de condição: saúde mental',
    cartoes: doFiltro('mente').map((c) => cartao(c, c.grupo)),
  },
];

const chrome = await abrirChrome({ perfil: join(HTML_DIR, '.chrome-perfil'), porta: 9413 });
let problemas = 0;

try {
  for (const doc of documentos) {
    const paginas = folhas(doc.cartoes);
    const arqHtml = join(HTML_DIR, `${doc.arquivo}.html`);
    writeFileSync(arqHtml, montarHtml(doc.titulo, paginas), 'utf8');

    process.stdout.write(`  ${doc.titulo} (${doc.cartoes.length} cartões, ${paginas.length} folhas) ... `);
    const { pdf, inspecao } = await imprimir(chrome, arqHtml, { espera: 1200, inspecionar: INSPECAO });
    console.log('ok');
    for (const a of JSON.parse(inspecao || '[]')) {
      problemas += a.tipo === 'estoura' ? 1 : 0;
      console.log(`      ${a.tipo === 'estoura' ? 'NÃO CABE' : 'fonte apertada'}: ${a.titulo} (${a.fs}pt)`);
    }
    writeFileSync(join(SAIDA, `${doc.arquivo}.pdf`), pdf);
  }
} finally {
  chrome.fechar();
}

console.log(problemas ? `\n${problemas} cartão(ões) não cabem. Encurte o texto na fonte.` : '\nPronto: docs/cartoes/');
process.exitCode = problemas ? 1 : 0;
