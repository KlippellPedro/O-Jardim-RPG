/**
 * Gera o livro de regras de O Jardim em PDF.
 *
 *   node tools/documentos-mundo/gerar-livro.mjs            (npm run docs:livro)
 *   node tools/documentos-mundo/gerar-livro.mjs --mestre    também a edição do Mestre
 *   node tools/documentos-mundo/gerar-livro.mjs --so-html   para depurar a diagramação
 *
 * O conteúdo sai de livro-regras.mjs corrido, em blocos irmãos. Quem transforma
 * isso em livro é o paginador abaixo, que roda dentro do Chrome:
 *
 *   1. arruma o HTML que veio do catálogo (details aberto, tabela sem o wrapper
 *      de rolagem que só existe na tela, tabela larga marcada);
 *   2. mede e distribui os blocos em páginas de duas colunas de verdade;
 *   3. numera as páginas em ordem de leitura, com margem espelhada;
 *   4. só então monta os apêndices, porque referência rápida, mapa das artes e
 *      índice remissivo precisam do número da página onde cada coisa caiu;
 *   5. preenche o sumário.
 *
 * Por que paginar na mão, se o Chrome quebra página sozinho: porque a quebra
 * automática não sabe repetir cabeçalho de tabela, não sabe manter a margem em
 * cada fragmento de um bloco alto e não devolve o número da página onde um
 * assunto caiu, que é justamente o que sumário e índice precisam.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { CSS_LIVRO } from './estilo-livro.mjs';
import { montarLivro } from './livro-regras.mjs';
import { RAIZ } from './dados.mjs';
import { abrirChrome, imprimir } from './render.mjs';

const SAIDA = join(RAIZ, 'docs', 'livro');
const HTML_DIR = join(SAIDA, '_html');
mkdirSync(HTML_DIR, { recursive: true });

const comMestre = process.argv.includes('--mestre');
const soHtml = process.argv.includes('--so-html');

/* ================================================================== */
/* Paginador                                                           */
/* ================================================================== */

const PAGINADOR = `
(function () {
  var doc = document;
  var MM = 96 / 25.4;
  var TITULO_LIVRO = doc.title;

  /* ---------------------------------------------------------------- */
  /* 1. Preparo do HTML vindo do catálogo de regras                    */
  /* ---------------------------------------------------------------- */

  function lista(sel, raiz) { return Array.prototype.slice.call((raiz || doc).querySelectorAll(sel)); }
  function desembrulhar(el) {
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  }

  // details/summary é recurso de tela. No papel nada fica fechado: o summary
  // vira título e o conteúdo passa a ser irmão dos outros blocos, que é o que
  // o paginador consegue medir.
  lista('details').forEach(function (det) {
    var sum = det.querySelector('summary');
    if (sum) {
      var titulo = doc.createElement('h4');
      titulo.className = 'dobra-titulo';
      titulo.innerHTML = sum.innerHTML;
      det.parentNode.insertBefore(titulo, det);
      sum.remove();
    }
    desembrulhar(det);
  });

  // O wrapper de rolagem horizontal das tabelas também é coisa de tela.
  lista('.regras-table-wrap').forEach(desembrulhar);

  // Estantes do Guia do Mestre: na tela viram um mapa navegável; no papel,
  // cada estante abre página nova com o próprio título, e o conteúdo volta a
  // ser uma sequência de blocos irmãos que o paginador sabe medir.
  // A primeira estante segue a abertura do assunto na mesma página.
  lista('.regras-estante-cabeca').forEach(function (cabeca, indice) {
    var titulo = cabeca.querySelector('.regras-estante-titulo');
    if (titulo && indice > 0) titulo.setAttribute('data-quebra', '1');
    desembrulhar(cabeca);
  });
  lista('section.regras-estante').forEach(desembrulhar);

  // Tabela com muitas colunas não cabe numa coluna de texto: vai para a
  // largura inteira da mancha, no topo de uma página.
  lista('.fluxo table').forEach(function (tabela) {
    var colunas = tabela.querySelectorAll('thead th').length;
    if (colunas >= 5) {
      tabela.setAttribute('data-cheia', '1');
      tabela.classList.add('tabela--larga');
    }
  });

  // Capitular no primeiro parágrafo de cada assunto.
  lista('.abre-topico').forEach(function (abre) {
    var alvo = abre.nextElementSibling;
    while (alvo && alvo.tagName !== 'P') alvo = alvo.nextElementSibling;
    if (alvo) alvo.classList.add('primeira');
  });

  // Trecho do Mestre: tinge tudo entre o título de abertura e o próximo assunto.
  lista('.mestre-abre').forEach(function (abre) {
    var alvo = abre.nextElementSibling;
    while (alvo && !alvo.classList.contains('abre-topico')) {
      alvo.classList.add('trecho-mestre');
      alvo = alvo.nextElementSibling;
    }
  });

  /* ---------------------------------------------------------------- */
  /* 2. Paginação                                                      */
  /* ---------------------------------------------------------------- */

  var numeroAtual = 0;   // a capa fica com 0 e não imprime número

  function registrar(folha) {
    var num = numeroAtual;
    numeroAtual += 1;
    folha.setAttribute('data-num', String(num));
    folha.classList.add(num % 2 === 0 ? 'par' : 'impar');
    return num;
  }

  function alturaDe(el) {
    var e = getComputedStyle(el);
    return el.offsetHeight + parseFloat(e.marginTop || 0) + parseFloat(e.marginBottom || 0);
  }

  function ehTitulo(el) {
    return /^H[234]$/.test(el.tagName)
      || el.classList.contains('dobra-titulo')
      || el.classList.contains('rotulo');
  }

  /** Itens divisíveis de um bloco, agrupados: cada item é a lista de nós que
   *  precisam viajar juntos para a continuação (uma linha, um li, um par
   *  dt+dd). Devolve null quando o bloco não se divide. */
  function itensDe(el) {
    var filhos = Array.prototype.slice.call(el.children);
    if (el.tagName === 'TABLE') {
      var corpo = el.querySelector('tbody');
      if (!corpo) return null;
      return Array.prototype.map.call(corpo.children, function (linha) { return [linha]; });
    }
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      return filhos.map(function (filho) { return [filho]; });
    }
    if (el.tagName === 'DL') {
      var grupos = [];
      filhos.forEach(function (filho) {
        if (filho.tagName === 'DT' || !grupos.length) grupos.push([filho]);
        else grupos[grupos.length - 1].push(filho);
      });
      return grupos;
    }
    if (/grid/.test(el.className || '')) return filhos.map(function (filho) { return [filho]; });
    return null;
  }

  function destinoDe(el) {
    return el.tagName === 'TABLE' ? el.querySelector('tbody') : el;
  }

  /** Casca vazia do mesmo bloco, para receber o que não coube. Tabela leva o
   *  cabeçalho de novo, porque uma tabela que vira a página sem cabeçalho é
   *  ilegível. */
  function continuacao(el) {
    var novo = el.cloneNode(false);
    novo.removeAttribute('id');
    novo.classList.add('continuacao');
    if (el.tagName === 'TABLE') {
      var legenda = doc.createElement('caption');
      legenda.textContent = 'continuação';
      novo.appendChild(legenda);
      var cabecalho = el.querySelector('thead');
      if (cabecalho) novo.appendChild(cabecalho.cloneNode(true));
      novo.appendChild(doc.createElement('tbody'));
    }
    if (el.tagName === 'OL') {
      var inicio = parseInt(el.getAttribute('start') || '1', 10);
      novo.setAttribute('start', String(inicio + el.children.length));
    }
    return novo;
  }

  /** Tira itens do fim do bloco até ele caber. Devolve a continuação, ou null
   *  quando dividir não resolveu (e aí nada foi mexido). */
  function dividir(el, cabe, minimo) {
    var piso = minimo || 1;
    var itens = itensDe(el);
    if (!itens || itens.length < piso + 2) return null;
    var resto = [];
    while (itens.length > piso && !cabe()) {
      var item = itens.pop();
      item.forEach(function (no) { no.remove(); });
      resto.unshift(item);
    }
    var destino = destinoDe(el);
    if (!cabe() || !resto.length) {
      resto.forEach(function (item) {
        item.forEach(function (no) { destino.appendChild(no); });
      });
      return null;
    }
    var novo = continuacao(el);
    var destinoNovo = destinoDe(novo);
    resto.forEach(function (item) {
      item.forEach(function (no) { destinoNovo.appendChild(no); });
    });
    return novo;
  }

  function paginarFluxo(fluxo) {
    var filhos = Array.prototype.filter.call(fluxo.childNodes, function (no) { return no.nodeType === 1; });
    var ac = fluxo.getAttribute('data-ac') || '118,108,138';
    var acd = fluxo.getAttribute('data-acd') || '86,78,104';
    var corrente = fluxo.getAttribute('data-parte') || '';
    var pagina = null;

    function novaPagina() {
      var folha = doc.createElement('section');
      folha.className = 'pagina pagina--miolo';
      folha.style.setProperty('--ac', ac);
      folha.style.setProperty('--acd', acd);
      var num = registrar(folha);

      var cabeca = doc.createElement('div');
      cabeca.className = 'cabeca';
      cabeca.innerHTML = '<span class="esq"></span><span class="dir"></span>';
      cabeca.querySelector('.esq').textContent = TITULO_LIVRO;
      cabeca.querySelector('.dir').textContent = corrente;
      folha.appendChild(cabeca);

      var acima = doc.createElement('div');
      acima.className = 'acima';
      folha.appendChild(acima);

      var corpo = doc.createElement('div');
      corpo.className = 'corpo';
      folha.appendChild(corpo);

      var abaixo = doc.createElement('div');
      abaixo.className = 'abaixo';
      folha.appendChild(abaixo);

      var pe = doc.createElement('div');
      pe.className = 'pe';
      pe.innerHTML = '<span class="num">' + num + '</span>';
      folha.appendChild(pe);

      fluxo.parentNode.insertBefore(folha, fluxo);
      pagina = {
        folha: folha, cabeca: cabeca, acima: acima, corpo: corpo,
        abaixo: abaixo, pe: pe, pinado: false, fechada: false,
      };
      return pagina;
    }

    /** Altura livre entre o cabeçalho corrido e o rodapé. */
    function alturaConteudo() {
      var folha = pagina.folha;
      var e = getComputedStyle(folha);
      return folha.clientHeight
        - parseFloat(e.paddingTop) - parseFloat(e.paddingBottom)
        - alturaDe(pagina.cabeca) - alturaDe(pagina.pe);
    }

    function sobraNoAcima() {
      return alturaConteudo() - pagina.acima.offsetHeight - pagina.abaixo.offsetHeight;
    }

    function cabeAcima() { return sobraNoAcima() >= 0; }

    function cabeCorpo() {
      var c = pagina.corpo;
      return c.scrollWidth <= c.clientWidth + 2 && c.scrollHeight <= c.clientHeight + 2;
    }

    /** A altura da mancha de texto precisa ser um número fixo para o navegador
     *  encher a primeira coluna antes de passar para a segunda. Fixamos depois
     *  que o topo da página já está montado. */
    function prepararCorpo() {
      if (!pagina || pagina.fechada) novaPagina();
      if (pagina.pinado) return;
      if (pagina.corpo.clientHeight < 24 * MM && (pagina.acima.children.length || pagina.corpo.children.length)) {
        novaPagina();
      }
      pagina.corpo.style.height = pagina.corpo.clientHeight + 'px';
      pagina.pinado = true;
    }

    /** Bloco de largura inteira (tabela larga, arte de meia página, abertura de
     *  assunto). Vai para a faixa do topo, e as colunas de texto ocupam o que
     *  sobrar embaixo.
     *
     *  O título que abre o bloco costuma ter caído na coluna logo antes: em vez
     *  de deixá-lo separado do que ele nomeia, ele sobe junto. É o que evita a
     *  página com uma tabela no topo e três quartos de papel em branco no
     *  catálogo de modificações, onde título e tabela se alternam. */
    function colocarNoAcima(el, jaMoveu) {
      if (!pagina || pagina.fechada) novaPagina();
      var naColuna = Array.prototype.slice.call(pagina.corpo.children);
      var soTitulos = naColuna.length > 0 && naColuna.every(ehTitulo);
      if (naColuna.length && !soTitulos) {
        var noPe = jaMoveu ? null : tentarNoPe(el);
        if (noPe) {
          if (noPe.sobra) {
            novaPagina();
            colocarNoAcima(noPe.sobra, true);
          }
          return;
        }
        novaPagina();
      } else if (soTitulos) {
        naColuna.forEach(function (titulo) { pagina.acima.appendChild(titulo); });
        pagina.corpo.style.height = '';
        pagina.pinado = false;
      }

      pagina.acima.appendChild(el);
      if (cabeAcima()) return;

      var sobra = dividir(el, cabeAcima);
      if (sobra) {
        novaPagina();
        colocarNoAcima(sobra, true);
        return;
      }

      if (jaMoveu || pagina.acima.children.length === 1) return;

      pagina.acima.removeChild(el);
      var arrastar = [];
      var ultimo = pagina.acima.lastElementChild;
      while (ultimo && ehTitulo(ultimo) && pagina.acima.children.length > 1) {
        arrastar.unshift(ultimo);
        pagina.acima.removeChild(ultimo);
        ultimo = pagina.acima.lastElementChild;
      }
      novaPagina();
      arrastar.forEach(function (titulo) { pagina.acima.appendChild(titulo); });
      colocarNoAcima(el, true);
    }

    function vazia() {
      return pagina && !pagina.acima.children.length && !pagina.corpo.children.length
        && !pagina.abaixo.children.length;
    }

    /** Encaixa um bloco largo no pé da página, sem tirar das colunas o texto
     *  que já está lá: o corpo é remedido para a altura que sobrou e, se o que
     *  ele carrega continua cabendo, a página fica cheia em vez de quebrar no
     *  meio. Depois disso nada mais entra nesta página, senão o texto seguinte
     *  apareceria acima do bloco a que ele responde. */
    function tentarNoPe(el) {
      if (!pagina.pinado) return null;
      var alturaAntes = pagina.corpo.style.height;
      pagina.abaixo.appendChild(el);

      // Cada linha tirada do bloco largo devolve altura para as colunas, então
      // o corpo é remedido a cada tentativa.
      function cabe() {
        pagina.corpo.style.height = '';
        pagina.corpo.style.height = pagina.corpo.clientHeight + 'px';
        return sobraNoAcima() >= 0 && cabeCorpo();
      }

      if (cabe()) {
        pagina.fechada = true;
        return { sobra: null };
      }
      var sobra = dividir(el, cabe, 4);
      if (sobra) {
        pagina.fechada = true;
        return { sobra: sobra };
      }
      pagina.abaixo.removeChild(el);
      pagina.corpo.style.height = alturaAntes;
      return null;
    }

    /** Abre página nova só quando a atual já tem conteúdo. Sem isto, cada
     *  assunto e cada capítulo deixariam uma folha em branco atrás de si. */
    function paginaLimpa() {
      if (!vazia()) novaPagina();
    }

    function colocar(el, jaMoveu) {
      if (el.getAttribute && el.getAttribute('data-abre') === 'topico') {
        corrente = el.getAttribute('data-topico') || corrente;
        paginaLimpa();
        pagina.cabeca.querySelector('.dir').textContent = corrente;
        pagina.acima.appendChild(el);
        return;
      }
      if (el.getAttribute && el.getAttribute('data-cheia') === '1') {
        colocarNoAcima(el, false);
        return;
      }
      if (el.getAttribute && el.getAttribute('data-quebra') === '1') paginaLimpa();

      prepararCorpo();
      pagina.corpo.appendChild(el);
      if (cabeCorpo()) return;

      var sobra = dividir(el, cabeCorpo);
      if (sobra) {
        novaPagina();
        prepararCorpo();
        colocar(sobra, false);
        return;
      }

      if (jaMoveu || pagina.corpo.children.length === 1) return;

      pagina.corpo.removeChild(el);
      var arrastar = [];
      var ultimo = pagina.corpo.lastElementChild;
      while (ultimo && ehTitulo(ultimo) && pagina.corpo.children.length > 1) {
        arrastar.unshift(ultimo);
        pagina.corpo.removeChild(ultimo);
        ultimo = pagina.corpo.lastElementChild;
      }
      novaPagina();
      prepararCorpo();
      arrastar.forEach(function (titulo) { pagina.corpo.appendChild(titulo); });
      colocar(el, true);
    }

    novaPagina();
    filhos.forEach(function (filho) { colocar(filho, false); });
    if (vazia()) { pagina.folha.remove(); numeroAtual -= 1; }
    fluxo.remove();
  }

  function paginarTudo() {
    Array.prototype.slice.call(doc.body.children).forEach(function (bloco) {
      if (!bloco.classList) return;
      if (bloco.classList.contains('pagina')) { registrar(bloco); return; }
      if (bloco.classList.contains('fluxo')) { paginarFluxo(bloco); }
    });
  }

  paginarTudo();

  /* ---------------------------------------------------------------- */
  /* 3. Apêndices, que só existem depois de as páginas terem número    */
  /* ---------------------------------------------------------------- */

  function paginaDe(el) {
    var folha = el.closest('section.pagina');
    return folha ? Number(folha.getAttribute('data-num')) : null;
  }

  function texto(el) { return (el.textContent || '').replace(/\\s+/g, ' ').trim(); }

  // Códigos das artes, na ordem em que aparecem no livro.
  var artes = [];
  lista('[data-arte]').forEach(function (espaco, indice) {
    var codigo = 'ART-' + String(indice + 1).padStart(2, '0');
    var alvo = espaco.querySelector('[data-codigo]');
    if (alvo) alvo.textContent = codigo;
    artes.push({
      codigo: codigo,
      tamanho: espaco.getAttribute('data-tamanho') || '',
      brief: espaco.getAttribute('data-brief') || '',
      pagina: paginaDe(espaco),
    });
  });

  // Fórmulas e verbetes, varridos em ordem de leitura para cada um saber a
  // que assunto pertence.
  var formulas = [];
  var verbetes = {};
  var assunto = '';
  function anotar(termo, pagina) {
    if (!termo || pagina === null) return;
    // "1. Nome e Árvore de origem" é passo de um roteiro, e não verbete.
    if (/^\d+\.\s/.test(termo)) return;
    if (!verbetes[termo]) verbetes[termo] = [];
    if (verbetes[termo].indexOf(pagina) === -1) verbetes[termo].push(pagina);
  }
  lista('.abre-topico, h3.regras-subtitle, .regras-formula').forEach(function (el) {
    var pagina = paginaDe(el);
    if (el.classList.contains('abre-topico')) {
      assunto = texto(el.querySelector('.abre-titulo'));
      anotar(assunto, pagina);
      return;
    }
    if (el.classList.contains('regras-formula')) {
      formulas.push({ assunto: assunto, texto: texto(el), pagina: pagina });
      return;
    }
    anotar(texto(el), pagina);
  });

  var termos = Object.keys(verbetes).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

  function escapar(valor) {
    return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var apendices = [];
  apendices.push(
    '<h2 class="folha-titulo" id="ap-rapida">Apêndice A · Referência rápida</h2>'
    + '<div class="regua-ac"></div>'
    + '<p class="regras-lead primeira">Todas as fórmulas fechadas do livro, na ordem em que aparecem, com a página do assunto que as explica. Serve para a mesa que já sabe a regra e só precisa do número.</p>'
  );
  formulas.forEach(function (f) {
    apendices.push(
      '<div class="rapida-item"><div class="onde">' + escapar(f.assunto) + ' · p. ' + f.pagina + '</div>'
      + '<div class="formula">' + escapar(f.texto) + '</div></div>'
    );
  });

  apendices.push(
    '<h2 class="folha-titulo" id="ap-artes" data-quebra="1">Apêndice B · Mapa das Artes</h2>'
    + '<div class="regua-ac"></div>'
    + '<p class="regras-lead">Os ' + artes.length + ' espaços reservados do volume, com tamanho final e o pedido de cada um. '
    + 'Enquanto a ilustração não chega, a moldura tracejada fica no lugar dela e a paginação já é a definitiva.</p>'
  );
  var linhasArte = artes.map(function (a) {
    // A capa e a folha de rosto não levam número impresso: na tabela elas
    // aparecem pelo nome, senão a coluna mostraria um zero sem sentido.
    var onde = a.pagina === 0 ? 'capa' : (a.pagina === 1 ? 'rosto' : String(a.pagina));
    return '<tr><td class="cod">' + a.codigo + '</td><td>' + onde + '</td><td>' + escapar(a.tamanho)
      + '</td><td class="brief">' + escapar(a.brief) + '</td></tr>';
  }).join('');
  apendices.push(
    '<table class="mapa-artes" data-cheia="1"><thead><tr><th>Código</th><th>Página</th><th>Tamanho</th><th>O que deve estar na imagem</th></tr></thead>'
    + '<tbody>' + linhasArte + '</tbody></table>'
  );

  apendices.push(
    '<h2 class="folha-titulo" id="ap-indice" data-quebra="1">Apêndice C · Índice remissivo</h2>'
    + '<div class="regua-ac"></div>'
    + '<p class="regras-lead">Assuntos e seções do livro em ordem alfabética. Um verbete com mais de uma página aparece em mais de um capítulo, e vale conferir os dois.</p>'
  );
  termos.forEach(function (termo) {
    apendices.push(
      '<div class="indice-item"><span class="t">' + escapar(termo) + '</span> '
      + '<span class="pgs">' + verbetes[termo].sort(function (a, b) { return a - b; }).join(', ') + '</span></div>'
    );
  });

  var fluxoApendice = doc.createElement('section');
  fluxoApendice.className = 'fluxo';
  fluxoApendice.setAttribute('data-parte', 'Apêndices');
  fluxoApendice.setAttribute('data-ac', '118,108,138');
  fluxoApendice.setAttribute('data-acd', '86,78,104');
  fluxoApendice.innerHTML = apendices.join('\\n');
  var marca = doc.getElementById('marca-apendices');
  marca.parentNode.insertBefore(fluxoApendice, marca);
  paginarFluxo(fluxoApendice);

  /* ---------------------------------------------------------------- */
  /* 4. Sumário                                                        */
  /* ---------------------------------------------------------------- */

  lista('[data-pg]').forEach(function (vaga) {
    var alvo = doc.getElementById(vaga.getAttribute('data-pg'));
    var num = alvo ? paginaDe(alvo) : null;
    vaga.textContent = num === null ? '--' : String(num);
  });

  doc.documentElement.setAttribute('data-paginado', 'sim');
})();`;

/* ================================================================== */
/* Verificação: nada pode ficar cortado                                */
/* ================================================================== */

const INSPECAO = `(function () {
  var achados = [];
  Array.prototype.forEach.call(document.querySelectorAll('section.pagina--miolo'), function (folha) {
    var num = folha.getAttribute('data-num');
    var assunto = (folha.querySelector('.cabeca .dir') || {}).textContent || '';
    var corpo = folha.querySelector('.corpo');
    if (corpo && corpo.scrollWidth > corpo.clientWidth + 2) {
      achados.push({ pagina: num, assunto: assunto, tipo: 'coluna' });
    }
    if (folha.scrollHeight > folha.clientHeight + 2) {
      achados.push({ pagina: num, assunto: assunto, tipo: 'altura' });
    }
  });
  return JSON.stringify({
    paginas: document.querySelectorAll('section.pagina').length,
    artes: document.querySelectorAll('[data-arte]').length,
    cortes: achados,
  });
})()`;

/* ================================================================== */
/* Execução                                                            */
/* ================================================================== */

const montagem = (livro) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${livro.titulo}</title>
<style>${CSS_LIVRO}</style>
</head><body>
${livro.corpo}
<script>${PAGINADOR}</script>
</body></html>`;

const edicoes = [montarLivro({ comMestre: false })];
if (comMestre) edicoes.push(montarLivro({ comMestre: true }));

const arquivosHtml = edicoes.map((livro) => {
  const caminho = join(HTML_DIR, `${livro.arquivo}.html`);
  writeFileSync(caminho, montagem(livro), 'utf8');
  return { livro, caminho };
});

if (soHtml) {
  console.log('HTML gerado, sem imprimir:');
  for (const { caminho } of arquivosHtml) console.log(`  ${caminho}`);
  process.exit(0);
}

const chrome = await abrirChrome({ perfil: join(HTML_DIR, '.chrome-perfil'), porta: 9413 });
const resumo = [];
let cortes = 0;

try {
  for (const { livro, caminho } of arquivosHtml) {
    const t0 = Date.now();
    process.stdout.write(`  ${livro.titulo} ... `);
    const { pdf, inspecao } = await imprimir(chrome, caminho, { espera: 4500, inspecionar: INSPECAO });
    const dados = JSON.parse(inspecao || '{}');
    console.log(`${dados.paginas} páginas, ${dados.artes} espaços de arte, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    for (const corte of dados.cortes || []) {
      const motivo = corte.tipo === 'coluna' ? 'texto passou das duas colunas' : 'bloco mais alto que a página';
      console.log(`      corte: página ${corte.pagina} (${corte.assunto}) ${motivo}`);
      cortes += 1;
    }

    writeFileSync(join(SAIDA, `${livro.arquivo}.pdf`), pdf);
    resumo.push({ arquivo: `docs/livro/${livro.arquivo}.pdf`, paginas: dados.paginas, artes: dados.artes });
  }
} finally {
  chrome.fechar();
}

console.log('');
for (const item of resumo) {
  console.log(`  ${item.arquivo}  (${item.paginas} páginas, ${item.artes} artes)`);
}
console.log(cortes ? `\nAtenção: ${cortes} bloco(s) cortado(s).` : '\nPronto, nada cortado.');
