/**
 * Gera os props de mesa (documentos in-game) em PDF.
 *
 *   node tools/documentos-mundo/gerar-props.mjs     (ou: npm run docs:props)
 *
 * Props não levam rodapé de número de página: quem numera é a própria
 * pesquisadora, à mão, no canto da folha. Por isso aqui não existe a costura
 * capa/miolo que o gerador dos guias precisava.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { CSS_PROPS } from './estilo-props.mjs';
import { RAIZ } from './dados.mjs';
import { abrirChrome, imprimir } from './render.mjs';
import { dossieJogador } from './dossie.mjs';
import { folhaDoMestre } from './mestre.mjs';
import { avulsos } from './avulsos.mjs';

const SAIDA = join(RAIZ, 'docs', 'props');
const HTML_DIR = join(SAIDA, '_html');
mkdirSync(HTML_DIR, { recursive: true });

/**
 * Paginador dos cadernos. Um caderno é escrito como um bloco corrido e é aqui
 * que ele vira folha. A alternativa (deixar o Chrome quebrar) faz a folha
 * seguinte nascer colada na borda do papel, porque padding de bloco só entra no
 * começo e no fim dele, nunca no meio.
 *
 * De quebra, cada folha nova ganha a própria mancha e o próprio número à mão,
 * em posição sorteada de forma determinística: assim duas gerações seguidas do
 * mesmo PDF saem idênticas, e ainda assim nenhuma folha é igual à anterior.
 */
const PAGINADOR = `
(function () {
  var MM = 96 / 25.4;
  // 6mm de folga: margem do último bloco não entra no scrollHeight medido
  var UTIL = (297 - 22 - 24 - 6) * MM;

  /* Grão do papel. Desenhado uma vez num canvas e servido como bitmap às
     dezenas de folhas, em vez de um filtro SVG que o Chrome refaz por página.
     O ruído é semeado, então o mesmo PDF sai igual em duas execuções. */
  (function grao() {
    var lado = 128;
    var tela = document.createElement('canvas');
    tela.width = tela.height = lado;
    var ctx = tela.getContext('2d');
    var img = ctx.createImageData(lado, lado);
    var s = 987654321;
    for (var i = 0; i < img.data.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var v = 150 + (s % 106);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grao', 'url(' + tela.toDataURL('image/png') + ')');
  })();

  // gerador determinístico, pra sujeira do papel não mudar a cada execução
  function sorteio(semente) {
    var s = semente * 9301 + 49297;
    return (s % 233280) / 233280;
  }
  function ehTitulo(el) {
    return /^(H1|H2|H3|HEADER)$/.test(el.tagName) || el.classList.contains('olho');
  }

  document.querySelectorAll('section.fluxo').forEach(function (bloco, iBloco) {
    var classe = bloco.getAttribute('data-classe') || 'prop';
    var folioInicial = parseInt(bloco.getAttribute('data-folio') || '0', 10);
    var filhos = Array.prototype.filter.call(bloco.childNodes, function (n) {
      return n.nodeType === 1;
    });

    var corpo = null, conta = 0;

    function novaFolha() {
      conta += 1;
      var folha = document.createElement('section');
      folha.className = classe;

      var semente = (iBloco + 1) * 97 + conta * 31;
      var mancha = document.createElement('div');
      mancha.className = 'mancha';
      var tam = 22 + sorteio(semente) * 42;
      mancha.style.width = tam + 'mm';
      mancha.style.height = tam + 'mm';
      mancha.style.top = (5 + sorteio(semente + 7) * 78) + '%';
      mancha.style.left = (4 + sorteio(semente + 13) * 74) + '%';
      folha.appendChild(mancha);

      if (sorteio(semente + 21) > 0.55) {
        var vinco = document.createElement('div');
        vinco.className = 'vinco';
        vinco.style.top = (30 + sorteio(semente + 29) * 200) + 'mm';
        folha.appendChild(vinco);
      }

      corpo = document.createElement('div');
      corpo.className = 'corpo';
      folha.appendChild(corpo);

      if (folioInicial) {
        var folio = document.createElement('div');
        folio.className = 'folio' + (conta % 2 === 0 ? ' esquerda' : '');
        folio.textContent = String(folioInicial + conta - 1);
        folha.appendChild(folio);
      }

      bloco.parentNode.insertBefore(folha, bloco);
    }
    novaFolha();

    filhos.forEach(function (filho) {
      corpo.appendChild(filho);
      if (corpo.scrollHeight <= UTIL || corpo.children.length === 1) return;

      corpo.removeChild(filho);
      // título não fica órfão no pé da folha: desce junto com o que ele abre
      var arrastar = [];
      var ultimo = corpo.lastElementChild;
      if (ultimo && ehTitulo(ultimo) && corpo.children.length > 1) {
        arrastar.push(ultimo);
        corpo.removeChild(ultimo);
      }
      novaFolha();
      arrastar.forEach(function (el) { corpo.appendChild(el); });
      corpo.appendChild(filho);
    });

    bloco.remove();
  });
})();`;

/**
 * Medição de transbordo. Prop é peça de página fixa, e uma folha que passa de
 * 297mm vira uma segunda página quase vazia no PDF. Como isso só aparece quando
 * alguém abre o arquivo, o gerador mede antes e avisa.
 */
const INSPECAO = `(function () {
  var MM = 96 / 25.4;
  var LIMITE = 297 * MM;
  var achados = [];
  document.querySelectorAll('section.prop').forEach(function (folha, i) {
    var caixa = folha.getBoundingClientRect();
    var padBaixo = parseFloat(getComputedStyle(folha).paddingBottom) || 0;

    // Só o conteúdo conta. Mancha, carimbo, nota de margem e número de folha são
    // decoração posicionada de forma absoluta: passam da borda de propósito e o
    // overflow:hidden da folha já corta o que sobra.
    var fundo = 0;
    Array.prototype.forEach.call(folha.children, function (filho) {
      if (getComputedStyle(filho).position === 'absolute') return;
      fundo = Math.max(fundo, filho.getBoundingClientRect().bottom - caixa.top);
    });

    var precisa = fundo + padBaixo;
    if (precisa > LIMITE + 2) {
      achados.push({ pagina: i + 1, sobra: Math.round((precisa - LIMITE) / MM) });
    }
  });
  return JSON.stringify(achados);
})()`;

const montarHtml = (titulo, paginas) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${titulo}</title>
<style>${CSS_PROPS}</style>
</head><body>
${paginas.join('\n')}
<script>${PAGINADOR}</script>
</body></html>`;

/* ------------------------------------------------------------------ */

const documentos = [dossieJogador(), folhaDoMestre(), ...avulsos()];

const chrome = await abrirChrome({ perfil: join(HTML_DIR, '.chrome-perfil'), porta: 9412 });
const resumo = [];
let transbordos = 0;

try {
  for (const doc of documentos) {
    const arqHtml = join(HTML_DIR, `${doc.arquivo}.html`);
    writeFileSync(arqHtml, montarHtml(doc.titulo, doc.paginas), 'utf8');

    const t0 = Date.now();
    process.stdout.write(`  ${doc.titulo} ... `);
    const { pdf, inspecao } = await imprimir(chrome, arqHtml, { espera: 2200, inspecionar: INSPECAO });
    console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const t of JSON.parse(inspecao || '[]')) {
      console.log(`      transbordo: folha ${t.pagina} passa ${t.sobra}mm da página`);
      transbordos += 1;
    }
    const destino = join(SAIDA, `${doc.arquivo}.pdf`);
    writeFileSync(destino, pdf);

    resumo.push({ titulo: doc.titulo, arquivo: `docs/props/${doc.arquivo}.pdf` });
  }
} finally {
  chrome.fechar();
}

console.log('\nPronto.');
for (const r of resumo) console.log(`  ${r.arquivo}`);
if (!existsSync(SAIDA)) console.error('Saída não criada.');
