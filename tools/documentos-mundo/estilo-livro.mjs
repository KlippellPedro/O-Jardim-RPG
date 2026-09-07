/**
 * Folha de estilo do livro de regras (PDF A4, miolo em duas colunas).
 *
 * A diagramação segue o que livro de RPG impresso faz há décadas: capa e
 * abertura de capítulo escuras e sangradas, miolo em papel claro com duas
 * colunas, cabeçalho corrido com o assunto da página, número no canto externo,
 * tabela com cabeçalho chapado e linhas zebradas, e caixa lateral para o
 * comentário que não pertence ao corpo do texto.
 *
 * Duas coisas mandam no arquivo inteiro:
 *
 * 1. Margem espelhada. Página ímpar cai à direita da lombada, então a margem
 *    interna dela é a da esquerda; na par é o contrário. Como a largura da
 *    mancha não muda, a medição do paginador continua valendo nas duas.
 *
 * 2. Cor de capítulo. Cada parte do livro define --ac (cor viva, para filete,
 *    cabeçalho de tabela e moldura) e --acd (a mesma cor rebaixada, para texto
 *    sobre papel claro). As duas são declaradas em pares no gerador em vez de
 *    saírem de um filter, porque filter cria contexto de empilhamento e isso
 *    atrapalha a fragmentação em coluna.
 *
 * As famílias são todas nativas do Windows de propósito: o Chrome imprime
 * offline e nenhuma webfont precisa carregar.
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
}

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

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
.pagina--abertura .pe, .pagina--capa .pe, .pagina--rosto .pe, .pagina--placa .pe { display: none; }

/* mancha de texto */
.corpo {
  flex: 1 1 auto; min-height: 0;
  column-count: 2; column-gap: 7.5mm; column-fill: auto;
  overflow: hidden;
}
.corpo--largo { column-count: 1; }

/* Faixa de largura inteira no topo da página: tabela larga, espaco de arte de
   meia pagina e a abertura de cada assunto entram aqui, e as colunas de texto
   ocupam o que sobra logo abaixo. */
.acima, .abaixo { flex: 0 0 auto; }
.acima:empty, .abaixo:empty { display: none; }
.abaixo { margin-top: 4mm; }

/* ================= capa ================= */

section.pagina--capa {
  background:
    radial-gradient(120% 70% at 50% 8%, rgba(var(--ac), 0.40), transparent 60%),
    radial-gradient(90% 55% at 50% 105%, rgba(var(--ac), 0.26), transparent 68%),
    linear-gradient(166deg, #1f1a2b 0%, var(--escuro) 58%, #0d0a14 100%);
  color: #f1ecf7;
  padding: 22mm 20mm 18mm;
}
.capa-moldura {
  position: absolute; inset: 10mm;
  border: 0.4mm solid rgba(var(--ac), 0.55);
  pointer-events: none;
}
.capa-topo { text-align: center; flex: none; position: relative; }
.capa-selo {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .38em; text-transform: uppercase;
  color: rgba(var(--ac), 1); margin-bottom: 9mm;
}
.capa-topo h1 { font-size: 46pt; line-height: 1.0; margin: 0; font-weight: 400; letter-spacing: -0.015em; }
.capa-topo .sub {
  margin: 7mm auto 0; font-size: 12.5pt; font-style: italic; color: #c8bfd8; max-width: 120mm;
}
.capa-regua { width: 40mm; height: 0.5mm; background: rgba(var(--ac), 1); margin: 8mm auto 0; }
.capa-rodape {
  flex: none; position: relative;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8pt; color: #8b8299; text-align: center; line-height: 1.9;
}
.capa-rodape strong { color: #bab1c9; font-weight: 600; }
.capa-aviso {
  display: inline-block; margin-top: 4mm;
  border: 0.3mm solid rgba(214, 120, 156, 0.7);
  color: #e0a5bf; padding: 1.4mm 4mm;
  letter-spacing: .22em; text-transform: uppercase; font-size: 7pt;
}

/* ================= folha de rosto ================= */

section.pagina--rosto { padding: 40mm 26mm 20mm; text-align: center; }
.rosto-marca {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .34em; text-transform: uppercase; color: rgb(var(--acd));
}
.pagina--rosto h1 { font-size: 32pt; font-weight: 400; margin: 8mm 0 0; letter-spacing: -0.012em; }
.pagina--rosto .sub { font-style: italic; font-size: 12pt; color: var(--tinta-suave); margin: 5mm 0 0; }
.rosto-corpo { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; }
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
.rosto-nota { font-size: 8.6pt; color: var(--tinta-fraca); margin-top: 10mm; line-height: 1.7; }

/* ================= abertura de capítulo ================= */

section.pagina--abertura {
  background: linear-gradient(158deg, #201a2c, var(--escuro));
  color: #efeaf6; padding: 0;
}
.abertura-arte {
  flex: 1 1 auto; margin: 14mm 16mm 0;
  border: 0.4mm dashed rgba(var(--ac), 0.75);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 8mm;
  background: repeating-linear-gradient(45deg, rgba(var(--ac), 0.10) 0 4mm, transparent 4mm 9mm);
}
.abertura-texto { flex: none; padding: 9mm 16mm 16mm; position: relative; }
.abertura-num {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8pt; letter-spacing: .34em; text-transform: uppercase;
  color: rgba(var(--ac), 1); margin-bottom: 4mm;
}
.abertura-texto h2 { font-size: 30pt; font-weight: 400; margin: 0; line-height: 1.06; }
.abertura-resumo { font-size: 11.5pt; font-style: italic; color: #c3bad2; margin: 5mm 0 0; max-width: 120mm; }
.abertura-lista {
  margin: 7mm 0 0; padding: 0; list-style: none;
  columns: 2; column-gap: 8mm;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8pt; color: #8f86a0;
}
.abertura-lista li { padding: 1mm 0; break-inside: avoid; }
.abertura-lista .n { color: rgba(var(--ac), 1); font-weight: 700; margin-right: 2.5mm; }

/* ================= abertura de tópico ================= */

.abre-topico { flex: none; margin-bottom: 5mm; }
.abre-num {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .3em; text-transform: uppercase;
  color: rgb(var(--acd)); margin-bottom: 2mm;
}
.abre-titulo { font-size: 23pt; font-weight: 400; margin: 0; line-height: 1.08; letter-spacing: -0.012em; }
.abre-regua { height: 0.7mm; width: 24mm; background: rgb(var(--ac)); margin: 3.5mm 0 3mm; }
.abre-resumo { font-size: 10.6pt; font-style: italic; color: var(--tinta-suave); margin: 0 0 3.5mm; max-width: 150mm; }
.abre-destaques { display: flex; flex-wrap: wrap; gap: 2mm; }
.abre-destaques span {
  border: 0.25mm solid rgba(var(--ac), 0.5);
  background: rgba(var(--ac), 0.08);
  padding: 1.2mm 3mm; font-size: 8.2pt; color: var(--tinta-suave);
}
.abre-destaques b {
  display: block;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.6pt; letter-spacing: .16em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 600;
}
.abre-linha {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 4mm; margin-bottom: 2mm;
}
.abre-num { margin-bottom: 0; }
.abre-selo {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.8pt; letter-spacing: .18em;
  text-transform: uppercase; color: var(--tinta-fraca);
  border: 0.25mm solid var(--regua); padding: 0.8mm 2.4mm;
}

/* ================= corpo do texto ================= */

h3.regras-subtitle {
  font-size: 11pt; font-weight: 600; margin: 4.6mm 0 1.6mm;
  color: rgb(var(--acd)); break-after: avoid; line-height: 1.25;
}
h3.regras-subtitle:first-child { margin-top: 0; }
h4, .dobra-titulo {
  font-size: 9.4pt; font-weight: 700; margin: 3.4mm 0 1.2mm;
  break-after: avoid; color: var(--tinta);
}
.dobra-titulo { color: rgb(var(--acd)); }
.dobra-titulo .regras-details-contagem {
  display: block; font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 6.8pt; letter-spacing: .1em; text-transform: uppercase;
  color: var(--tinta-fraca); font-weight: 400; margin-top: 0.6mm;
}

p { margin: 0 0 2.4mm; text-align: justify; hyphens: auto; }
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

p.regras-note {
  font-size: 8.8pt; line-height: 1.48; color: var(--tinta-suave);
  background: var(--papel-fundo);
  border-left: 0.9mm solid rgb(var(--ac));
  padding: 2.4mm 3mm; margin: 2.6mm 0 3.4mm;
  break-inside: avoid; text-align: left;
}

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
.acima table.regras-table { font-size: 8.8pt; }

/* ================= espaço de arte ================= */

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
.arte--capa { flex: 1 1 auto; margin: 8mm 0; border-color: rgba(var(--ac), 0.8); }
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

.sumario-titulo { font-size: 24pt; font-weight: 400; margin: 0 0 2mm; }
.sumario-parte {
  break-inside: avoid; margin: 0 0 4.5mm;
}
.sumario-parte h3 {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7.6pt; letter-spacing: .2em;
  text-transform: uppercase; color: rgb(var(--acd)); font-weight: 700;
  margin: 0 0 1.6mm; padding-bottom: 1.2mm; border-bottom: 0.3mm solid rgb(var(--ac));
}
.sumario-item {
  display: flex; align-items: baseline; gap: 1.5mm;
  padding: 0.9mm 0; font-size: 9.2pt; break-inside: avoid;
}
.sumario-item .t { flex: none; max-width: 62mm; }
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
