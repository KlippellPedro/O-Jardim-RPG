/**
 * Gera o kit do Mestre em PDF.
 *
 *   node tools/documentos-mundo/gerar-mestre.mjs     (ou: npm run docs:mestre)
 *
 * São páginas de tamanho fixo, desenhadas folha a folha: diferente do livro e
 * dos cadernos, aqui não existe texto corrido para paginar. O que existe é o
 * risco oposto, o de uma folha encher demais e empurrar uma linha para uma
 * segunda página quase vazia, e por isso o gerador mede cada folha montada
 * antes de imprimir e avisa quanto passou.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { CSS_MESTRE } from './estilo-mestre.mjs';
import { RAIZ } from './dados.mjs';
import { abrirChrome, imprimir } from './render.mjs';
import { folhaDePreparacao } from './folha-preparacao.mjs';
import { aventuraInicial } from './aventura-inicial.mjs';

const SAIDA = join(RAIZ, 'docs', 'mestre');
const HTML_DIR = join(SAIDA, '_html');
mkdirSync(HTML_DIR, { recursive: true });

const INSPECAO = `(function () {
  var MM = 96 / 25.4;
  var LIMITE = 297 * MM;
  var achados = [];
  document.querySelectorAll('section.folha').forEach(function (folha, i) {
    var caixa = folha.getBoundingClientRect();
    var padBaixo = parseFloat(getComputedStyle(folha).paddingBottom) || 0;
    var fundo = 0;
    Array.prototype.forEach.call(folha.children, function (filho) {
      if (getComputedStyle(filho).position === 'absolute') return;
      fundo = Math.max(fundo, filho.getBoundingClientRect().bottom - caixa.top);
    });
    var precisa = fundo + padBaixo;
    achados.push({ pagina: i + 1, excesso: Math.round((precisa - LIMITE) / MM) });
  });
  return JSON.stringify(achados);
})()`;

const montarHtml = (titulo, paginas) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${titulo}</title>
<style>${CSS_MESTRE}</style>
</head><body>
${paginas.join('\n')}
</body></html>`;

const documentos = [folhaDePreparacao(), aventuraInicial()];
// Com --folga, o gerador também diz quanto espaço sobra em cada folha. Serve
// para reescrever um texto sabendo de antemão quanto ele pode crescer.
const mostrarFolga = process.argv.includes('--folga');

const chrome = await abrirChrome({ perfil: join(HTML_DIR, '.chrome-perfil'), porta: 9413 });
const resumo = [];
let transbordos = 0;

try {
  for (const doc of documentos) {
    const arqHtml = join(HTML_DIR, `${doc.arquivo}.html`);
    writeFileSync(arqHtml, montarHtml(doc.titulo, doc.paginas), 'utf8');

    const t0 = Date.now();
    process.stdout.write(`  ${doc.titulo} ... `);
    const { pdf, inspecao } = await imprimir(chrome, arqHtml, { espera: 1600, inspecionar: INSPECAO });
    console.log(`${doc.paginas.length} páginas, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const folha of JSON.parse(inspecao || '[]')) {
      if (folha.excesso > 0) {
        console.log(`      transbordo: folha ${folha.pagina} passa ${folha.excesso}mm da página`);
        transbordos += 1;
      } else if (mostrarFolga) {
        console.log(`      folga: folha ${folha.pagina} tem ${-folha.excesso}mm livres`);
      }
    }
    writeFileSync(join(SAIDA, `${doc.arquivo}.pdf`), pdf);
    resumo.push(`docs/mestre/${doc.arquivo}.pdf`);
  }
} finally {
  chrome.fechar();
}

console.log('');
for (const r of resumo) console.log(`  ${r}`);
console.log(transbordos ? `\n${transbordos} folha(s) transbordando: enxugue o texto.` : '\nPronto, sem transbordo.');
