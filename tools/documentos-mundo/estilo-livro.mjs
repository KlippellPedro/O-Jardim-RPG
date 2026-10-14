/**
 * Folha de estilo do livro de regras (PDF A4, miolo em duas colunas).
 *
 * A diagramação segue o que livro de RPG impresso faz há décadas: capa e
 * abertura de capítulo escuras e sangradas, miolo em papel claro com duas
 * colunas, cabeçalho corrido com o capítulo e o tópico da página, número no
 * canto externo, tabela com cabeçalho chapado e linhas zebradas, e caixa para
 * o que não pertence ao corpo do texto (resumo, exemplo, atenção, dica, regra).
 *
 * As classes de conteúdo (regras-resumo, regras-note--exemplo, regras-ref...)
 * são as mesmas que o site usa em src/pages/Regras/leitor.css: um tópico
 * escrito uma vez serve às duas telas.
 *
 * Três coisas mandam no arquivo inteiro:
 *
 * 1. Margem espelhada. Página ímpar cai à direita da lombada, então a margem
 *    interna dela é a da esquerda; na par é o contrário. Como a largura da
 *    mancha não muda, a medição do paginador continua valendo nas duas.
 *
 * 2. Cor de capítulo. Cada capítulo do livro define --ac (cor viva, para
 *    filete, cabeçalho de tabela e moldura) e --acd (a mesma cor rebaixada,
 *    para texto sobre papel claro), os dois em "r,g,b". São declaradas em
 *    pares no gerador em vez de saírem de um filter, porque filter cria
 *    contexto de empilhamento e isso atrapalha a fragmentação em coluna.
 *
 * 3. Peso do arquivo. Gradiente com transparência e padrão repetido viram
 *    bitmap no PDF. Fundos escuros usam só cores opacas, e o resto é traço
 *    vetorial, porque o PDF viaja no pacote da plataforma, que tem teto de
 *    tamanho.
 *
 * As famílias são todas nativas do Windows de propósito: o Chrome imprime
 * offline e nenhuma webfont precisa carregar. O Chrome não hifeniza pt-BR sem
 * dicionário, então o texto corre alinhado à esquerda: justificar sem
 * hifenização abre rios de espaço nas colunas estreitas.
 */
export const CSS_LIVRO = `
@page { size: A4; margin: 0; }

:root {
  --papel: #f7f3ea;
  --papel-fundo: #efe8db;
  --papel-caixa: #fcfaf5;
  --tinta: #201b27;
  --tinta-suave: #554d61;
  --tinta-fraca: #857c91;
  --regua: #d9d0be;
  --regua-fina: #e6dfd1;
  --escuro: #16121e;
  --ac: 118,108,138;
  --acd: 86,78,104;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: Constantia, Cambria, Georgia, "Times New Roman", serif;
  font-size: 9.6pt;
  line-height: 1.5;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  text-rendering: geometricPrecision;
  font-variant-numeric: lining-nums;
}

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

/* ================= página ================= */

section.pagina {
  width: 210mm; height: 297mm;
  position: relative; overflow: hidden;
  background: var(--papel);
  break-after: page;
  display: flex; flex-direction: column;
}
section.pagina:last-of-type { break-after: auto; }

section.pagina--miolo { padding: 13mm 15mm 11mm 19mm; }
section.pagina--miolo.par { padding: 13mm 19mm 11mm 15mm; }

/* cabeçalho corrido */
.cabeca {
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7pt; letter-spacing: .19em; text-transform: uppercase;
  color: var(--tinta-fraca);
  padding-bottom: 1.6mm;
  border-bottom: 0.25mm solid var(--regua);
  margin-bottom: 4.5mm;
  flex: none;
}
.par .cabeca { flex-direction: row-reverse; }
.cabeca .dir { color: rgb(var(--acd)); font-weight: 600; }

/* rodapé com o fólio no canto externo */
.pe {
  flex: none;
  display: flex; justify-content: flex-end; align-items: center;
  padding-top: 2.5mm; margin-top: 3mm;
  border-top: 0.25mm solid var(--regua-fina);
}
.par .pe { justify-content: flex-start; }
.pe .num {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8pt; font-weight: 600; letter-spacing: .06em;
  color: rgb(var(--acd));
  min-width: 9mm; text-align: right;
}
.par .pe .num { text-align: left; }
.pagina--abertura .pe, .pagina--capa .pe, .pagina--rosto .pe, .pagina--contracapa .pe { display: none; }

/* mancha de texto */
.corpo {
  flex: 1 1 auto; min-height: 0;
  column-count: 2; column-gap: 7.5mm; column-fill: auto;
  overflow: hidden;
}
.corpo--largo { column-count: 1; }

/* Faixa de largura inteira no topo da página: tabela larga e espaço de arte de
   meia página entram aqui, e as colunas de texto ocupam o que sobra logo abaixo. */
.acima, .abaixo { flex: 0 0 auto; }
.acima:empty, .abaixo:empty { display: none; }
.abaixo { margin-top: 4mm; }

/* ================= arte própria nas capas (docs/livro/artes) ================= */

.pagina-imagem {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
}
/* Véus: escurecem de baixo para cima o que fica atrás do texto, e deixam o alto da imagem como veio. */
.capa-veu {
  position: absolute; left: 0; right: 0; bottom: 0; height: 58%;
  background: linear-gradient(to top, rgba(10, 7, 16, 0.94) 0%, rgba(10, 7, 16, 0.82) 42%, rgba(10, 7, 16, 0) 100%);
}
.abertura-veu {
  position: absolute; left: 0; right: 0; bottom: 0; height: 66%;
  background: linear-gradient(to top, rgba(12, 9, 18, 0.96) 0%, rgba(12, 9, 18, 0.88) 50%, rgba(12, 9, 18, 0) 100%);
}
.contracapa-veu { position: absolute; inset: 0; background: rgba(10, 7, 16, 0.66); }

/* ================= capa ================= */

section.pagina--capa {
  background: radial-gradient(110% 62% at 50% 34%, #30244a 0%, #1c1630 46%, #0e0a16 100%);
  color: #f4ecd8;
  padding: 0;
}
.capa-moldura {
  position: absolute; inset: 9mm;
  border: 0.45mm solid rgba(var(--ac), 0.7);
  pointer-events: none;
}
.capa-moldura--fina { inset: 12mm; border-width: 0.18mm; border-color: rgba(var(--ac), 0.45); }
.capa-selo {
  position: absolute; top: 25mm; left: 0; right: 0; text-align: center;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .38em; text-transform: uppercase;
  color: rgb(var(--ac));
}
.capa-emblema { position: absolute; top: 50mm; left: 50%; width: 92mm; margin-left: -46mm; }
.capa-emblema svg { display: block; width: 100%; height: auto; }
.capa-emblema--pequeno { position: static; width: 44mm; margin: 0 auto 8mm; }
.capa-titulo { position: absolute; top: 180mm; left: 0; right: 0; text-align: center; }
.capa-nome { font-size: 58pt; line-height: 1; letter-spacing: .012em; font-weight: 400; }
.capa-regua { width: 46mm; height: 0.5mm; background: rgb(var(--ac)); margin: 8mm auto 7mm; }
.capa-sub { font-size: 17pt; font-style: italic; color: #d8cfe6; }
.capa-edicao {
  margin-top: 6mm;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8pt; letter-spacing: .32em; text-transform: uppercase;
  color: rgb(var(--ac));
}
.capa-rodape {
  position: absolute; bottom: 22mm; left: 20mm; right: 20mm;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8pt; color: #9a90ab; text-align: center; line-height: 1.9;
}
.capa-aviso {
  display: inline-block; margin-top: 4mm;
  border: 0.3mm solid rgba(214, 120, 156, 0.7);
  color: #e0a5bf; padding: 1.4mm 4mm;
  letter-spacing: .22em; text-transform: uppercase; font-size: 7pt;
}
/* Com espaço de arte (edição de planejamento), a moldura da capa volta a ocupar o miolo. */
section.pagina--capa .arte--capa {
  position: absolute; top: 44mm; left: 20mm; right: 20mm; bottom: 78mm; margin: 0;
  border-color: rgba(var(--ac), 0.8);
}

/* ================= folha de rosto ================= */

section.pagina--rosto { padding: 40mm 26mm 20mm; text-align: center; }
.rosto-marca {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .34em; text-transform: uppercase; color: rgb(var(--acd));
}
.rosto-titulo, .pagina--rosto h1 { font-size: 32pt; font-weight: 400; margin: 8mm 0 0; letter-spacing: -0.012em; }
.pagina--rosto .sub { font-style: italic; font-size: 12pt; color: var(--tinta-suave); margin: 5mm 0 0; }
.rosto-corpo { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; }
.rosto-fio { margin: 9mm auto 0; width: 44mm; }
.rosto-fio svg, svg.fio-losango { display: block; width: 100%; height: auto; }
.rosto-ficha {
  margin: 12mm auto 0; max-width: 108mm; text-align: left;
  border-top: 0.3mm solid var(--regua); border-bottom: 0.3mm solid var(--regua);
  padding: 5mm 0;
}
.rosto-ficha .linha { display: grid; grid-template-columns: 34mm 1fr; gap: 4mm; padding: 1.3mm 0; }
.rosto-ficha dt {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7pt; letter-spacing: .16em;
  text-transform: uppercase; color: var(--tinta-fraca); padding-top: 0.7mm;
}
.rosto-ficha dd { margin: 0; font-size: 9.6pt; }
.rosto-nota { font-size: 8.6pt; color: var(--tinta-fraca); margin-top: 10mm; line-height: 1.7; text-align: center; }

/* ================= abertura de capítulo ================= */

section.pagina--abertura {
  background: linear-gradient(165deg, #1d1729 0%, #120e1b 70%, #0d0a14 100%);
  color: #efeaf6; padding: 0;
}
.abertura-marca { position: absolute; top: 24mm; left: 50%; width: 104mm; margin-left: -52mm; }
.abertura-marca svg { display: block; width: 100%; height: auto; }
.abertura-texto { position: absolute; left: 20mm; right: 20mm; bottom: 24mm; }
.abertura-numeral {
  font-size: 118pt; line-height: 0.86; font-weight: 400; letter-spacing: -0.02em;
  color: rgb(var(--ac)); margin-bottom: 3mm;
}
.abertura-titulo { margin: 0; font-weight: 400; line-height: 1.06; }
/* Os dois blocos são inline-block de linha inteira (e não block) para o marcador do PDF sair "Capítulo 3 Combate",
   e a caixa-alta é small-caps (e não text-transform), que o marcador copiaria como texto em maiúsculas. */
.abertura-num {
  display: inline-block; width: 100%;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 9.6pt; letter-spacing: .3em; font-variant-caps: all-small-caps;
  color: rgb(var(--ac)); margin-bottom: 3mm;
}
.abertura-nome { display: inline-block; width: 100%; font-size: 34pt; }
.abertura-regua { width: 24mm; height: 0.6mm; background: rgb(var(--ac)); margin: 6mm 0 5mm; }
.abertura-resumo { font-size: 11.2pt; font-style: italic; color: #c3bad2; margin: 0; max-width: 130mm; text-align: left; }
.abertura-lista {
  margin: 8mm 0 0; padding: 0; list-style: none;
  columns: 2; column-gap: 8mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8.4pt; color: #a79eb8;
}
.abertura-lista li { padding: 1mm 0; break-inside: avoid; margin: 0; }
.abertura-lista .n { color: rgb(var(--ac)); font-weight: 700; margin-right: 2.5mm; }
/* Com espaço de arte (edição de planejamento), a placa ocupa o alto e a lista continua embaixo. */
.abertura-arte {
  position: absolute; top: 14mm; left: 16mm; right: 16mm; bottom: 112mm;
  border: 0.4mm dashed rgba(var(--ac), 0.75);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 8mm;
}

/* ================= contracapa ================= */

section.pagina--contracapa {
  background: linear-gradient(165deg, #1d1729 0%, #120e1b 70%, #0d0a14 100%);
  color: #efeaf6; padding: 0; text-align: center;
}
.contracapa-corpo {
  position: absolute; left: 40mm; right: 40mm; top: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.contracapa-titulo { font-size: 30pt; font-weight: 400; letter-spacing: .02em; }
.contracapa-texto { font-size: 9.6pt; line-height: 1.7; color: #b3a9c4; margin: 0; text-align: center; }
.contracapa-data {
  margin-top: 12mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7.5pt; letter-spacing: .26em;
  text-transform: uppercase; color: #7f7690;
}

/* ================= abertura de tópico (dentro da coluna) ================= */

.abre-topico {
  flex: none; margin: 7mm 0 3.4mm; padding-top: 3.2mm;
  border-top: 0.7mm solid rgb(var(--ac));
  break-after: avoid; break-inside: avoid;
}
.abre-topico.primeiro-da-pagina { margin-top: 0; padding-top: 0; border-top: 0; }
.abre-linha {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 3mm; margin-bottom: 1.8mm;
}
.abre-num {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 6.8pt; letter-spacing: .2em; text-transform: uppercase;
  color: rgb(var(--acd)); font-weight: 600;
}
.abre-selo {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.4pt; letter-spacing: .16em;
  text-transform: uppercase; color: var(--tinta-fraca);
  border: 0.25mm solid var(--regua); padding: 0.6mm 2mm; white-space: nowrap;
}
.abre-titulo { font-size: 19pt; font-weight: 400; margin: 0; line-height: 1.1; letter-spacing: -0.01em; }
/* O número entra no próprio título, visível, para o marcador do PDF sair "3.4 Ferimentos". */
.abre-n {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8.6pt; font-weight: 700; letter-spacing: .06em;
  color: rgb(var(--ac)); margin-right: 1.4mm; vertical-align: 0.95em;
}
.abre-regua { height: 0.6mm; width: 18mm; background: rgb(var(--ac)); margin: 2.6mm 0 2.4mm; }
.abre-resumo { font-size: 9.6pt; font-style: italic; color: var(--tinta-suave); margin: 0 0 2.8mm; text-align: left; }
.abre-destaques { display: flex; flex-wrap: wrap; gap: 1.4mm; }
.abre-destaques span {
  border: 0.25mm solid rgba(var(--ac), 0.5);
  background: rgba(var(--ac), 0.08);
  padding: 0.9mm 2.4mm; font-size: 7.8pt; color: var(--tinta-suave);
}
.abre-destaques b {
  display: block;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.2pt; letter-spacing: .16em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600;
}
.abre-antes { margin: 2.4mm 0 0; font-size: 8pt; color: var(--tinta-fraca); text-align: left; }
.abre-antes b {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.4pt; letter-spacing: .16em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600; margin-right: 1.8mm;
}
.veja-tambem {
  margin: 4.2mm 0 0; padding-top: 2.2mm; border-top: .25mm solid rgba(var(--ac), .35);
  font-size: 8.4pt; color: var(--tinta-fraca); text-align: left;
}
.veja-tambem b {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.4pt; letter-spacing: .16em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600; margin-right: 1.8mm;
}

/* ================= corpo do texto ================= */

h3.regras-subtitle {
  font-size: 11pt; font-weight: 600; margin: 4.6mm 0 1.6mm;
  color: rgb(var(--acd)); break-after: avoid; line-height: 1.25;
}
h3.regras-subtitle:first-child { margin-top: 0; }
h4, .dobra-titulo {
  font-size: 9.4pt; font-weight: 700; margin: 3.4mm 0 1.2mm;
  break-after: avoid; break-inside: avoid; color: var(--tinta);
}
.dobra-titulo { color: rgb(var(--acd)); }

/* Estante do Guia do Mestre: abre página e separa as partes do guia no papel. */
h4.regras-estante-titulo {
  font-size: 15pt; font-weight: 600; letter-spacing: .02em;
  color: rgb(var(--acd)); margin: 0 0 1.2mm; padding-top: 2.4mm;
  border-top: 0.8mm solid rgb(var(--ac));
  break-after: avoid; break-inside: avoid;
}
p.regras-estante-quando {
  font-style: italic; color: var(--tinta-suave); margin: 0 0 4mm;
  text-align: left; break-before: avoid;
}
.dobra-titulo .regras-details-contagem {
  display: block; font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 6.8pt; letter-spacing: .1em; text-transform: uppercase;
  color: var(--tinta-fraca); font-weight: 400; margin-top: 0.6mm;
}

p { margin: 0 0 2.4mm; text-align: left; hyphens: manual; }
p.regras-lead { font-size: 10.2pt; color: var(--tinta-suave); margin-bottom: 3.2mm; }
.primeira::first-letter {
  float: left; font-size: 25pt; line-height: 0.84; font-weight: 600;
  padding: 1mm 1.6mm 0 0; color: rgb(var(--acd));
}

strong { font-weight: 700; }
code { font-family: Consolas, "Courier New", monospace; font-size: 8.6pt; background: var(--papel-fundo); padding: 0 0.8mm; }
small { font-size: 8pt; color: var(--tinta-fraca); }

ul, ol { margin: 1.6mm 0 3mm; padding-left: 4.6mm; }
li { margin-bottom: 1.3mm; }
ul.regras-list li::marker, ul.regras-sublist li::marker { color: rgb(var(--ac)); }

ol.regras-steps { list-style: none; padding-left: 6.5mm; counter-reset: passo; }
ol.regras-steps li { counter-increment: passo; position: relative; margin-bottom: 1.8mm; }
ol.regras-steps li::before {
  content: counter(passo);
  position: absolute; left: -6.5mm; top: 0.2mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7pt; font-weight: 700;
  color: #fff; background: rgb(var(--ac));
  width: 4.4mm; height: 4.4mm; line-height: 4.4mm; text-align: center;
}

/* Em resumo: o essencial do tópico, numa caixa no começo. */
.regras-resumo {
  background: var(--papel-caixa);
  border: 0.3mm solid rgba(var(--ac), 0.55);
  border-top: 1mm solid rgb(var(--ac));
  padding: 2.4mm 3.2mm 2.2mm; margin: 2.8mm 0 4mm;
  font-size: 9pt; line-height: 1.45;
  break-inside: avoid;
}
.regras-resumo::before {
  content: 'Em resumo'; display: block; margin-bottom: 1.6mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.6pt; font-weight: 600;
  letter-spacing: .22em; text-transform: uppercase; color: rgb(var(--acd));
}
.regras-resumo ul, .regras-resumo ol { margin: 0; padding: 0; list-style: none; }
.regras-resumo li { position: relative; padding-left: 4.6mm; margin-bottom: 1.2mm; }
.regras-resumo li:last-child { margin-bottom: 0; }
.regras-resumo li::before {
  content: ''; position: absolute; left: 0.4mm; top: 1.3mm;
  width: 2.2mm; height: 1.2mm;
  border-left: 0.35mm solid rgb(var(--ac)); border-bottom: 0.35mm solid rgb(var(--ac));
  transform: rotate(-45deg);
}
.regras-resumo p { margin: 0 0 1.2mm; }

/* Notas: genérica, exemplo, atenção, dica e regra. */
.regras-note {
  --nota: var(--ac); --nota-d: var(--acd);
  font-size: 8.8pt; line-height: 1.48; color: var(--tinta-suave);
  background: rgba(var(--nota), 0.075);
  border-left: 0.9mm solid rgb(var(--nota));
  padding: 2.4mm 3mm; margin: 2.6mm 0 3.4mm;
  break-inside: avoid; text-align: left;
}
.regras-note p { margin: 0 0 1.4mm; }
.regras-note p:last-child { margin-bottom: 0; }
.regras-note--exemplo { --nota: 40,132,150; --nota-d: 26,96,110; }
.regras-note--atencao { --nota: 200,98,40; --nota-d: 148,64,20; }
.regras-note--dica { --nota: 52,140,92; --nota-d: 32,102,64; }
.regras-note--regra { font-size: 9.2pt; color: var(--tinta); background: rgba(var(--ac), 0.11); }
.regras-note--exemplo::before, .regras-note--atencao::before, .regras-note--dica::before, .regras-note--regra::before {
  display: block; margin-bottom: 1.1mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.6pt; font-weight: 600;
  letter-spacing: .2em; text-transform: uppercase; color: rgb(var(--nota-d));
}
.regras-note--exemplo::before { content: 'Exemplo'; }
.regras-note--atencao::before { content: 'Atenção'; }
.regras-note--dica::before { content: 'Dica de mesa'; }
.regras-note--regra::before { content: 'Regra'; }

/* Quadro: variante opcional ou assunto que merece caixa própria. */
.regras-quadro {
  background: var(--papel-caixa); border: 0.3mm solid var(--regua);
  padding: 2.6mm 3.2mm 2.4mm; margin: 3mm 0 3.6mm; break-inside: avoid;
}
.regras-quadro > h4:first-child { margin-top: 0; }
.regras-quadro > p:last-child, .regras-quadro > ul:last-child { margin-bottom: 0; }

.regras-formula {
  text-align: center; font-size: 10pt; font-style: italic;
  background: var(--papel-caixa);
  border-top: 0.6mm solid rgb(var(--ac));
  border-bottom: 0.25mm solid var(--regua);
  padding: 2.6mm 3mm; margin: 3mm 0 3.6mm;
  break-inside: avoid;
}

dl.regras-kv { margin: 2mm 0 3.4mm; }
dl.regras-kv dt {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.9pt; letter-spacing: .14em;
  text-transform: uppercase; color: var(--tinta-fraca); margin-top: 1.8mm;
}
dl.regras-kv dd { margin: 0.3mm 0 0; font-size: 9.4pt; }
dl.regras-kv--boxed {
  background: var(--papel-caixa); border: 0.25mm solid var(--regua);
  border-left: 0.9mm solid rgb(var(--ac)); padding: 2.6mm 3mm; break-inside: avoid;
}
dl.regras-kv--boxed dt:first-child { margin-top: 0; }

.regras-distance-grid, .regras-xp-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.8mm 3mm;
  margin: 2mm 0 3.4mm; font-size: 8.4pt;
}
.regras-distance-grid span, .regras-xp-grid span {
  display: flex; justify-content: space-between; gap: 2mm;
  border-bottom: 0.2mm dotted var(--regua); padding: 0.7mm 0;
}
.regras-distance-grid strong, .regras-xp-grid strong { font-weight: 600; color: rgb(var(--acd)); }
.acima .regras-xp-grid { grid-template-columns: repeat(4, 1fr); }

/* Remissão para outro tópico, com a página entre parênteses. */
a.ref { color: rgb(var(--acd)); text-decoration: none; border-bottom: 0.2mm dotted rgb(var(--acd)); }
.ref-pg { font-family: "Segoe UI", Corbel, sans-serif; font-size: 0.8em; color: var(--tinta-fraca); }

/* ================= tabelas ================= */

table.regras-table {
  width: 100%; border-collapse: collapse;
  font-size: 8.3pt; line-height: 1.36;
  margin: 2.4mm 0 3.8mm;
}
table.regras-table caption {
  caption-side: top; text-align: left;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.8pt; letter-spacing: .18em;
  text-transform: uppercase; color: var(--tinta-fraca); padding-bottom: 1.2mm;
}
/* O cabeçalho nunca fica sozinho no pé da coluna, e nenhuma linha é partida
   ao meio na virada. */
table.regras-table thead { break-inside: avoid; break-after: avoid; }
table.regras-table tbody tr { break-inside: avoid; }
table.regras-table th {
  background: rgb(var(--ac)); color: #fff;
  font-family: "Segoe UI", Corbel, sans-serif; font-weight: 600;
  font-size: 6.9pt; letter-spacing: .1em; text-transform: uppercase;
  text-align: left; padding: 1.4mm 1.8mm; vertical-align: bottom;
}
table.regras-table td {
  padding: 1.2mm 1.8mm; vertical-align: top;
  border-bottom: 0.2mm solid var(--regua-fina);
}
table.regras-table tbody tr:nth-child(even) td { background: rgba(var(--ac), 0.075); }
table.regras-table tbody tr:last-child td { border-bottom: 0.3mm solid var(--regua); }
table.regras-table small { display: block; }
/* Cartões: a tabela de texto corrido, desmontada linha a linha (ver o paginador). */
.cartoes { margin: 2.4mm 0 3.8mm; }
.cartao {
  padding: 1.7mm 2mm 1.9mm 2.8mm; margin: 0;
  border-left: 0.55mm solid rgba(var(--ac), 0.7);
  border-bottom: 0.2mm solid var(--regua-fina);
  break-inside: avoid;
}
.cartao:nth-child(odd) { background: rgba(var(--ac), 0.06); }
.cartao-topo { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.6mm 3mm; margin-bottom: 0.7mm; }
.cartao-nome { font-size: 9.2pt; color: var(--tinta); }
.cartao-meta { font-size: 7.4pt; color: var(--tinta-suave); }
.cartao-meta b, .cartao p b {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.3pt; letter-spacing: .13em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600; margin-right: 1.3mm;
}
.cartao p { margin: 0.9mm 0 0; font-size: 8.4pt; line-height: 1.4; text-align: left; }
/* ================= compêndio (fichas de classe, raça, magia) ================= */

h3.comp-secao {
  font-size: 12pt; font-weight: 600; color: rgb(var(--acd)); line-height: 1.2;
  margin: 6mm 0 2.4mm; padding-bottom: 1mm; border-bottom: 0.3mm solid rgba(var(--ac), 0.55);
  break-after: avoid; break-inside: avoid;
}
h3.comp-secao:first-child { margin-top: 0; }
h4.hab-nome {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0 3mm;
  font-size: 10.4pt; font-weight: 700; color: rgb(var(--acd));
  margin: 4.2mm 0 1.4mm; padding-bottom: 0.7mm; border-bottom: 0.2mm solid var(--regua-fina);
}
.hab-niveis {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.4pt; font-weight: 600; letter-spacing: .12em;
  text-transform: uppercase; color: var(--tinta-fraca); white-space: nowrap; margin-left: auto;
}
.ficha { display: inline; font-family: "Segoe UI", Corbel, sans-serif; font-size: 7pt; color: var(--tinta-suave); }
.ficha > span { display: inline-block; max-width: 100%; margin-right: 2.4mm; }
.ficha b {
  font-size: 5.9pt; letter-spacing: .11em; text-transform: uppercase; color: rgb(var(--acd));
  font-weight: 600; margin-right: 0.9mm;
}
p.escala { font-size: 8.5pt; color: var(--tinta-suave); padding-left: 2.4mm; border-left: 0.35mm solid rgba(var(--ac), 0.6); }
p.opcoes-titulo { margin: 2.6mm 0 1.2mm; }
p.magia-descricao { font-style: italic; color: var(--tinta-suave); margin: 0 0 1.4mm; font-size: 8.8pt; }
p.aviso {
  font-size: 8.2pt; color: var(--tinta-suave); padding: 0.9mm 2.2mm; margin: 0 0 2mm;
  background: rgba(var(--ac), 0.07); border-left: 0.4mm solid rgba(var(--ac), 0.6);
}
p.aviso b, b.sinal {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.1pt; letter-spacing: .12em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600; margin-right: 1.1mm;
}
ul.estagios, ul.opcoes, ul.poderes { list-style: none; padding-left: 0; margin: 1.2mm 0 3mm; }
ul.estagios li, ul.opcoes li, ul.poderes li {
  padding: 0.9mm 0 1.1mm 2.4mm; margin: 0 0 1mm; font-size: 8.6pt; line-height: 1.38;
  border-left: 0.35mm solid rgba(var(--ac), 0.5); break-inside: avoid;
}
ul.opcoes li:nth-child(even), ul.poderes li:nth-child(even) { background: rgba(var(--ac), 0.055); }
.opcao-acao {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.2pt; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: rgb(var(--acd)); margin: 0 0.8mm;
}
.opcao-escala { display: block; margin-top: 0.7mm; font-style: italic; color: var(--tinta-suave); font-size: 8.2pt; }
.poder-req { display: block; margin-top: 0.5mm; font-family: "Segoe UI", Corbel, sans-serif; font-size: 7pt; color: var(--tinta-fraca); }
.poder-req b { font-size: 5.9pt; letter-spacing: .11em; text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600; margin-right: 0.9mm; }
table.regras-table--dado td:first-child { width: 7mm; text-align: center; font-weight: 700; color: rgb(var(--acd)); }
.regras-mecanica {
  display: block; margin-top: 1.2mm; padding-top: 1mm;
  border-top: 0.2mm dashed var(--regua); color: rgb(var(--acd)); font-size: .94em;
}
.acima table.regras-table { font-size: 8.8pt; }

/* ================= espaço de arte (edição de planejamento) ================= */

.arte {
  position: relative; break-inside: avoid;
  border: 0.4mm dashed rgba(var(--ac), 0.7);
  background: repeating-linear-gradient(45deg, rgba(var(--ac), 0.06) 0 4mm, transparent 4mm 9mm);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 5mm; margin: 2.5mm 0 4mm;
}
.arte--coluna { height: 62mm; }
.arte--faixa { height: 46mm; }
.arte--meia { height: 104mm; }
.arte--pagina { height: 100%; margin: 0; }
.arte--capa { margin: 8mm 0; border-color: rgba(var(--ac), 0.8); }
section.pagina--capa .arte-brief { color: #c0b7cf; }
section.pagina--capa .arte-medida { color: #837a96; }
.arte-codigo {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7.4pt;
  letter-spacing: .3em; text-transform: uppercase; color: rgb(var(--acd)); font-weight: 700;
}
.arte-medida {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.6pt;
  letter-spacing: .18em; text-transform: uppercase; color: var(--tinta-fraca);
  margin-top: 1.4mm;
}
.arte-brief {
  font-size: 8.4pt; font-style: italic; line-height: 1.5; color: var(--tinta-suave);
  max-width: 112mm; margin: 3mm auto 0; text-align: center;
}
.arte--coluna .arte-brief { font-size: 7.8pt; }
.abertura-arte .arte-codigo { color: rgba(var(--ac), 1); }
.abertura-arte .arte-medida { color: #7d7490; }
.abertura-arte .arte-brief { color: #b7aec6; max-width: 118mm; }

/* ================= sumário ================= */

.sumario-parte { break-inside: avoid; margin: 0 0 4.2mm; }
.sumario-cap {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7.6pt; letter-spacing: .18em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 700;
  margin: 0 0 1.6mm; padding-bottom: 1.2mm; border-bottom: 0.3mm solid rgb(var(--ac));
}
.sumario-cap .cap-num { color: rgb(var(--ac)); margin-right: 2.4mm; }
.sumario-item {
  display: flex; align-items: baseline; gap: 1.5mm;
  padding: 0.8mm 0; font-size: 9.2pt; break-inside: avoid;
  color: inherit; text-decoration: none;
}
.sumario-item .t { flex: none; max-width: 66mm; }
.sumario-item .n {
  display: inline-block; min-width: 8mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7.4pt; font-weight: 700; color: rgb(var(--ac));
}
.sumario-item .fio { flex: 1 1 auto; border-bottom: 0.2mm dotted var(--regua); transform: translateY(-0.8mm); }
.pg {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8pt; font-weight: 600;
  color: rgb(var(--acd)); min-width: 7mm; text-align: right; display: inline-block;
  font-variant-numeric: tabular-nums;
}

/* ================= apêndices ================= */

.indice-item { break-inside: avoid; padding: 0.55mm 0; line-height: 1.3; font-size: 8.2pt; border-bottom: 0.2mm dotted var(--regua-fina); }
.indice-item .t { color: var(--tinta); }
.indice-item .pgs {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7.4pt; color: rgb(var(--acd));
  font-variant-numeric: tabular-nums;
}

.mapa-artes { width: 100%; border-collapse: collapse; font-size: 8.6pt; }
.mapa-artes th {
  background: rgb(var(--ac)); color: #fff;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.9pt; letter-spacing: .1em;
  text-transform: uppercase; text-align: left; padding: 1.4mm 1.8mm;
}
.mapa-artes td { padding: 1.4mm 1.8mm; border-bottom: 0.2mm solid var(--regua-fina); vertical-align: top; }
.mapa-artes tbody tr:nth-child(even) td { background: rgba(var(--ac), 0.075); }
.mapa-artes .cod { font-family: "Segoe UI", Corbel, sans-serif; font-weight: 700; color: rgb(var(--acd)); white-space: nowrap; }
.mapa-artes .brief { font-style: italic; color: var(--tinta-suave); }

.rapida-item { break-inside: avoid; margin: 0 0 3.4mm; }
.rapida-item .onde {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.9pt; letter-spacing: .14em;
  text-transform: uppercase; color: var(--tinta-fraca); margin-bottom: 0.8mm;
}
.rapida-item .formula {
  font-size: 9.6pt; font-style: italic;
  border-left: 0.9mm solid rgb(var(--ac)); background: var(--papel-caixa);
  padding: 1.8mm 2.6mm;
}

/* ================= trecho do mestre ================= */

.mestre-abre {
  border-top: 0.6mm solid rgb(var(--ac));
  padding-top: 2.4mm; margin-top: 5mm;
}
.trecho-mestre {
  background: rgba(var(--ac), 0.055);
  border-left: 0.5mm solid rgba(var(--ac), 0.55);
  padding: 0.6mm 1.8mm 0.6mm 2.4mm;
  margin-top: 0; margin-bottom: 0;
}
h3.trecho-mestre, h4.trecho-mestre { padding-top: 3mm; }
.trecho-mestre.regras-note { border-left-width: 0.5mm; }

/* ================= texto de moldura (o que o gerador escreve) ========== */

.folha-titulo { font-size: 24pt; font-weight: 400; margin: 0 0 4mm; }
.folha-titulo + .regua-ac { margin-top: -2mm; }
.regua-ac { height: 0.7mm; width: 24mm; background: rgb(var(--ac)); margin: 0 0 5mm; }
.caixa {
  border: 0.25mm solid var(--regua); border-left: 0.9mm solid rgb(var(--ac));
  background: var(--papel-caixa); padding: 3.4mm 4mm; margin: 3mm 0 4mm;
  break-inside: avoid;
}
.caixa h4 { margin-top: 0; }
.caixa p:last-child { margin-bottom: 0; }
.rotulo {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7pt; letter-spacing: .2em;
  text-transform: uppercase; color: rgb(var(--acd)); margin-bottom: 2mm;
}
`;
