/**
 * Gera os PDFs de mesa do Jardim a partir das fontes canônicas.
 *
 *   node tools/documentos-mundo/gerar.mjs        (ou: npm run docs:mundo)
 *
 * A impressão é feita pelo Chrome em modo headless, falando o protocolo de
 * depuração direto: é o único caminho que aceita rodapé com número de página.
 * A capa é impressa num passe separado, sem rodapé, e depois costurada na
 * frente do miolo, pra que o número não apareça em cima dela.
 *
 * O HTML intermediário fica em docs/players/_html/ de propósito. Quando um
 * bloco quebrar feio entre páginas, é mais rápido abrir o HTML no navegador e
 * mexer no CSS de tools/documentos-mundo/estilo.mjs do que caçar no PDF.
 */
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { CSS } from './estilo.mjs';
import { DOCUMENTOS } from './documentos.mjs';
import { RAIZ } from './dados.mjs';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const CHROME = CHROMES.find((c) => existsSync(c));
if (!CHROME) {
  console.error('Nenhum Chrome ou Edge encontrado. Ajuste a lista CHROMES em gerar.mjs.');
  process.exit(1);
}

const SAIDA = join(RAIZ, 'docs', 'players');
const HTML_DIR = join(SAIDA, '_html');
const PORTA = 9411;
mkdirSync(HTML_DIR, { recursive: true });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const paraUrl = (caminho) => `file:///${caminho.replace(/\\/g, '/')}`;

/* ------------------------------------------------------------------ */
/* Casca HTML                                                          */
/* ------------------------------------------------------------------ */

/**
 * Paginador. O Chrome quebra sozinho uma seção que passa de uma página, mas a
 * continuação nasce colada na borda do papel, porque padding de bloco só é
 * aplicado no começo e no fim do bloco, e não em cada fragmento. Então em vez
 * de deixar o navegador quebrar, medimos cada filho aqui e montamos as páginas
 * na mão: assim toda página ganha a mesma margem e a mesma barra de topo.
 */
const PAGINADOR = `
(function () {
  var MM = 96 / 25.4;
  var UTIL = (297 - 20 - 24) * MM;   // altura de conteúdo de uma folha A4

  function ehTitulo(el) {
    return /^(H2|H3|H4|HEADER)$/.test(el.tagName) || el.classList.contains('rotulo');
  }

  document.querySelectorAll('section.fluxo').forEach(function (bloco) {
    var ac = bloco.getAttribute('data-ac');
    var filhos = Array.prototype.filter.call(bloco.childNodes, function (n) {
      return n.nodeType === 1;
    });

    var corpo = null;
    function novaPagina() {
      var folha = document.createElement('section');
      folha.className = 'folha';
      folha.style.setProperty('--ac', ac);
      corpo = document.createElement('div');
      corpo.className = 'corpo';
      folha.appendChild(corpo);
      bloco.parentNode.insertBefore(folha, bloco);
    }
    novaPagina();

    filhos.forEach(function (filho) {
      corpo.appendChild(filho);
      if (corpo.scrollHeight <= UTIL || corpo.children.length === 1) return;

      corpo.removeChild(filho);
      // Um título sozinho no pé da página vai junto com o bloco que ele abre.
      var arrastar = [];
      var ultimo = corpo.lastElementChild;
      if (ultimo && ehTitulo(ultimo) && corpo.children.length > 1) {
        arrastar.push(ultimo);
        corpo.removeChild(ultimo);
      }
      novaPagina();
      arrastar.forEach(function (el) { corpo.appendChild(el); });
      corpo.appendChild(filho);
    });

    bloco.remove();
  });

  document.documentElement.setAttribute('data-paginado', 'sim');
})();`;

const pagina = (titulo, corpo, paginar = false) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${titulo}</title>
<style>${CSS}</style>
</head><body>${corpo}
${paginar ? `<script>${PAGINADOR}</script>` : ''}
</body></html>`;

const RODAPE = `<div style="width:100%;font:8.5pt Constantia,Georgia,serif;color:#9d94a8;
  text-align:center;padding:0 18mm 9mm;"><span class="pageNumber"></span></div>`;

/* ------------------------------------------------------------------ */
/* Chrome via protocolo de depuração                                   */
/* ------------------------------------------------------------------ */

async function abrirChrome() {
  const perfil = join(HTML_DIR, '.chrome-perfil');
  const proc = spawn(CHROME, [
    '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--no-sandbox', '--disable-extensions',
    `--remote-debugging-port=${PORTA}`,
    `--user-data-dir=${perfil}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let versao = null;
  for (let i = 0; i < 60; i++) {
    try {
      versao = await (await fetch(`http://127.0.0.1:${PORTA}/json/version`)).json();
      break;
    } catch { await dormir(250); }
  }
  if (!versao) { proc.kill(); throw new Error('O Chrome não respondeu na porta de depuração.'); }

  const ws = new WebSocket(versao.webSocketDebuggerUrl);
  await new Promise((ok, falha) => { ws.onopen = ok; ws.onerror = () => falha(new Error('WebSocket recusado')); });

  let seq = 0;
  const pendentes = new Map();
  ws.onmessage = (evento) => {
    const msg = JSON.parse(evento.data);
    if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id); }
  };
  const enviar = (metodo, params = {}, sessionId) => new Promise((ok, falha) => {
    const id = ++seq;
    pendentes.set(id, (m) => (m.error ? falha(new Error(`${metodo}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method: metodo, params, sessionId }));
  });

  return {
    enviar,
    fechar: () => { try { ws.close(); } catch {} proc.kill(); },
  };
}

/** Imprime um arquivo HTML e devolve o PDF em Buffer. */
async function imprimir(chrome, arquivoHtml, comRodape) {
  const { targetId } = await chrome.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await chrome.enviar('Target.attachToTarget', { targetId, flatten: true });
  await chrome.enviar('Page.enable', {}, sessionId);

  await chrome.enviar('Page.navigate', { url: paraUrl(arquivoHtml) }, sessionId);
  // A página é um arquivo local sem rede nem fonte externa, então uma espera
  // fixa dá conta: o custo real é a paginação do Chrome, não o carregamento.
  await dormir(1500);

  const { data } = await chrome.enviar('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: comRodape,
    headerTemplate: '<div></div>',
    footerTemplate: comRodape ? RODAPE : '<div></div>',
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  }, sessionId);

  await chrome.enviar('Target.closeTarget', { targetId });
  return Buffer.from(data, 'base64');
}

/* ------------------------------------------------------------------ */
/* Costura capa + miolo                                                */
/* ------------------------------------------------------------------ */

const PY_JUNTAR = `
import sys
from pypdf import PdfReader, PdfWriter
capa, miolo, saida = sys.argv[1], sys.argv[2], sys.argv[3]
w = PdfWriter()
for caminho in (capa, miolo):
    for p in PdfReader(caminho).pages:
        w.add_page(p)
with open(saida, 'wb') as f:
    w.write(f)
print(len(PdfReader(saida).pages))
`;

function juntar(capa, miolo, saida) {
  const r = spawnSync('python', ['-c', PY_JUNTAR, capa, miolo, saida], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`Falha ao juntar o PDF: ${r.stderr || r.stdout}`);
  return Number(r.stdout.trim());
}

/* ------------------------------------------------------------------ */
/* Execução                                                            */
/* ------------------------------------------------------------------ */

const chrome = await abrirChrome();
const resumo = [];

try {
  for (const construir of DOCUMENTOS) {
    const doc = construir();
    const [capaHtml, ...mioloHtml] = doc.paginas;

    const arqCapa = join(HTML_DIR, `${doc.arquivo}--capa.html`);
    const arqMiolo = join(HTML_DIR, `${doc.arquivo}--miolo.html`);
    writeFileSync(arqCapa, pagina(doc.titulo, capaHtml), 'utf8');
    writeFileSync(arqMiolo, pagina(doc.titulo, mioloHtml.join('\n'), true), 'utf8');

    const pdfCapa = join(HTML_DIR, `${doc.arquivo}--capa.pdf`);
    const pdfMiolo = join(HTML_DIR, `${doc.arquivo}--miolo.pdf`);
    writeFileSync(pdfCapa, await imprimir(chrome, arqCapa, false));
    writeFileSync(pdfMiolo, await imprimir(chrome, arqMiolo, true));

    const final = join(SAIDA, `${doc.arquivo}.pdf`);
    const paginas = juntar(pdfCapa, pdfMiolo, final);
    resumo.push({ titulo: doc.titulo, arquivo: `docs/players/${doc.arquivo}.pdf`, paginas });
    console.log(`  ${doc.titulo}: ${paginas} páginas`);
  }
} finally {
  chrome.fechar();
}

console.log('\nPronto.');
for (const r of resumo) console.log(`  ${r.arquivo}  (${r.paginas} páginas)`);
