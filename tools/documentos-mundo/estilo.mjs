/**
 * Folha de estilo dos documentos de mesa do Jardim (PDF A4).
 *
 * Duas superfícies: a capa e as aberturas de capítulo são escuras e sangram até
 * a borda; o miolo é papel claro, porque o documento também existe pra ser
 * impresso e levado pra mesa. A cor de destaque de cada trecho vem da paleta
 * canônica das Árvores (data/mundo/arvoresCatalog.ts) pela variável --ac.
 *
 * As famílias tipográficas são todas nativas do Windows de propósito: o Chrome
 * roda offline na hora de gerar, então nada de webfont que possa não carregar.
 * Constantia e Cambria foram desenhadas pra texto impresso e seguram bem 11pt.
 */
export const CSS = `
@page { size: A4; margin: 0; }

:root {
  --papel: #f7f3ec;
  --papel-fundo: #efe9df;
  --tinta: #241f2b;
  --tinta-suave: #5d5568;
  --tinta-fraca: #8b8296;
  --regua: #d9d1c3;
  --escuro: #17131f;
  --ac: 150,145,160;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: Constantia, Cambria, Georgia, "Times New Roman", serif;
  font-size: 11pt;
  line-height: 1.62;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  text-rendering: geometricPrecision;
}

/* ---------- estrutura de página ---------- */

/* .fluxo é o bloco cru que sai do gerador; o paginador do navegador o recorta
   em .folha do tamanho de uma página. As duas compartilham o estilo pra que uma
   falha do paginador degrade pro comportamento antigo em vez de página branca. */
.folha, section.fluxo {
  width: 210mm;
  min-height: 297mm;
  padding: 20mm 18mm 24mm;
  background: var(--papel);
  position: relative;
  break-after: page;
}
.folha:last-child, section.fluxo:last-child { break-after: auto; }

.folha::before, section.fluxo::before {
  content: "";
  position: absolute; inset: 0 0 auto 0; height: 2.2mm;
  background: rgb(var(--ac));
}

/* ---------- capa ---------- */

.capa {
  width: 210mm; height: 297mm;
  background:
    radial-gradient(115% 80% at 50% 12%, rgba(var(--ac), 0.42), transparent 62%),
    radial-gradient(80% 55% at 50% 108%, rgba(var(--ac), 0.22), transparent 70%),
    linear-gradient(168deg, #1d1828 0%, var(--escuro) 55%, #0e0b15 100%);
  color: #efeaf5;
  display: flex; flex-direction: column;
  justify-content: space-between;
  padding: 34mm 24mm 26mm;
  position: relative; overflow: hidden;
}
.capa::after {
  content: "";
  position: absolute; inset: 12mm;
  border: 0.4mm solid rgba(var(--ac), 0.5);
  pointer-events: none;
}
.capa-topo { text-align: center; }
.capa-selo {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8pt; letter-spacing: .34em; text-transform: uppercase;
  color: rgb(var(--ac)); filter: brightness(1.45);
  margin-bottom: 14mm;
}
.capa h1 {
  font-size: 44pt; line-height: 1.02; margin: 0;
  font-weight: 400; letter-spacing: -0.012em;
}
.capa .sub {
  margin-top: 8mm; font-size: 13pt; font-style: italic;
  color: #c9c0d8; max-width: 128mm; margin-left: auto; margin-right: auto;
}
.capa-regua {
  width: 42mm; height: 0.5mm; background: rgb(var(--ac));
  margin: 12mm auto 0; filter: brightness(1.3);
}
.capa-rodape {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 8.5pt; color: #8c8399; text-align: center; line-height: 1.9;
}
.capa-rodape strong { color: #b9b0c8; font-weight: 600; }

/* ---------- abertura de capítulo ---------- */

.abertura {
  width: 210mm; height: 297mm;
  background: linear-gradient(158deg, #1d1828, var(--escuro));
  color: #efeaf5;
  padding: 0 24mm; display: flex; flex-direction: column; justify-content: center;
  position: relative; break-after: page;
}
.abertura::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(90% 60% at 18% 30%, rgba(var(--ac), 0.34), transparent 66%);
}
.abertura > * { position: relative; }
.abertura .num {
  font-size: 9pt; letter-spacing: .32em; text-transform: uppercase;
  font-family: "Segoe UI", Corbel, sans-serif;
  color: rgb(var(--ac)); filter: brightness(1.5); margin-bottom: 6mm;
}
.abertura h2 { font-size: 34pt; margin: 0; font-weight: 400; line-height: 1.08; }
.abertura .resumo {
  margin-top: 8mm; font-size: 12pt; font-style: italic; color: #c5bcd4; max-width: 122mm;
}

/* ---------- títulos ---------- */

h2.secao {
  font-size: 20pt; font-weight: 400; margin: 0 0 2mm;
  letter-spacing: -0.008em;
}
h3 {
  font-size: 13.5pt; font-weight: 600; margin: 9mm 0 2mm;
  break-after: avoid;
}
h4 {
  font-size: 11pt; font-weight: 600; margin: 5mm 0 1mm;
  break-after: avoid;
}
.rotulo {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .2em; text-transform: uppercase;
  color: rgb(var(--ac)); filter: brightness(0.72);
  margin-bottom: 2.5mm;
}
.regua { height: 0.35mm; background: var(--regua); margin: 4mm 0 6mm; }
.regua-ac { height: 0.6mm; background: rgb(var(--ac)); width: 26mm; margin: 3mm 0 6mm; }

p { margin: 0 0 3.6mm; }
p.solta { margin-bottom: 5mm; }

.capitular::first-letter {
  float: left; font-size: 30pt; line-height: 0.86; padding: 1.5mm 2mm 0 0;
  color: rgb(var(--ac)); filter: brightness(0.68); font-weight: 600;
}

/* ---------- blocos ---------- */

.caixa {
  border: 0.3mm solid var(--regua);
  border-left: 1.1mm solid rgb(var(--ac));
  background: var(--papel-fundo);
  padding: 5mm 6mm; margin: 6mm 0;
  break-inside: avoid;
}
.caixa .rotulo { margin-bottom: 1.5mm; }
.caixa p:last-child { margin-bottom: 0; }

.citacao {
  font-style: italic; font-size: 12.5pt; line-height: 1.5;
  color: var(--tinta-suave);
  border-left: 0.8mm solid rgb(var(--ac));
  padding-left: 6mm; margin: 6mm 0; break-inside: avoid;
}

.nota {
  font-size: 9.5pt; color: var(--tinta-suave); line-height: 1.55;
  break-inside: avoid;
}

/* ---------- ficha de dados (chave/valor) ---------- */

.ficha { margin: 4mm 0 5mm; break-inside: avoid; }
.ficha .linha {
  display: grid; grid-template-columns: 32mm 1fr;
  gap: 4mm; padding: 1.6mm 0;
  border-bottom: 0.25mm dotted var(--regua);
}
.ficha .linha:last-child { border-bottom: none; }
.ficha dt {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase;
  color: var(--tinta-fraca); padding-top: 0.9mm;
}
.ficha dd { margin: 0; font-size: 10.5pt; }

/* ---------- pílulas e selos ---------- */

.pilulas { display: flex; flex-wrap: wrap; gap: 2mm; margin: 3mm 0 4mm; }
.pilula {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase;
  border: 0.25mm solid rgba(var(--ac), 0.55);
  background: rgba(var(--ac), 0.1);
  color: var(--tinta-suave);
  padding: 1mm 2.6mm; border-radius: 1mm;
}
.selo-num {
  display: inline-block; min-width: 7mm; text-align: center;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8pt; font-weight: 700;
  background: rgb(var(--ac)); color: #fff; padding: 0.8mm 1.6mm;
  border-radius: 1mm; margin-right: 2.5mm; vertical-align: 1mm;
}

/* ---------- cartão (Árvore, reino, ser) ---------- */

.cartao {
  border: 0.3mm solid var(--regua);
  background: #fff;
  padding: 5mm 6mm; margin: 0 0 4mm;
  break-inside: avoid;
  position: relative;
}
.cartao::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 1.1mm;
  background: rgb(var(--ac));
}
.cartao h4 { margin: 0 0 1mm; font-size: 11.5pt; }
.cartao .ep {
  font-style: italic; color: var(--tinta-suave); font-size: 9.5pt; margin: 0 0 2.5mm;
}
.cartao p { margin-bottom: 2.4mm; font-size: 10.5pt; }
.cartao p:last-child { margin-bottom: 0; }

/* ---------- grade ---------- */

.grade-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.grade-2 > * { break-inside: avoid; }

/* ---------- linha do tempo ---------- */

.tempo { margin: 5mm 0 0; position: relative; padding-left: 9mm; }
.tempo::before {
  content: ""; position: absolute; left: 2.2mm; top: 2mm; bottom: 2mm;
  width: 0.35mm; background: var(--regua);
}
.marco { position: relative; margin-bottom: 6mm; break-inside: avoid; }
.marco::before {
  content: ""; position: absolute; left: -7.4mm; top: 2.2mm;
  width: 2.8mm; height: 2.8mm; border-radius: 50%;
  background: rgb(var(--ac)); box-shadow: 0 0 0 1.1mm var(--papel);
}
.marco .era {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .16em; text-transform: uppercase;
  color: var(--tinta-fraca);
}
.marco h4 { margin: 0.4mm 0 1mm; font-size: 11.5pt; }
.marco p { font-size: 10.5pt; margin: 0; color: var(--tinta-suave); }

/* ---------- listas ---------- */

ul.limpa { margin: 2mm 0 4mm; padding-left: 5mm; }
ul.limpa li { margin-bottom: 1.4mm; }
ul.limpa li::marker { color: rgb(var(--ac)); }

/* ---------- sumário ---------- */

.sumario .item {
  display: grid; grid-template-columns: 9mm 1fr;
  gap: 3mm; padding: 2.6mm 0;
  border-bottom: 0.25mm dotted var(--regua);
  break-inside: avoid;
}
.sumario .item .n {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8.5pt;
  color: rgb(var(--ac)); filter: brightness(0.7); font-weight: 700; padding-top: 0.9mm;
}
.sumario .item strong { font-weight: 600; font-size: 11.5pt; }
.sumario .item .d { display: block; font-size: 9.5pt; color: var(--tinta-suave); }

/* ---------- diagrama ---------- */

.diagrama { margin: 6mm 0; break-inside: avoid; text-align: center; }
.diagrama svg { max-width: 100%; }
.diagrama figcaption {
  font-size: 9pt; color: var(--tinta-fraca); margin-top: 2mm; font-style: italic;
}

/* ---------- tabela ---------- */

table.dados {
  width: 100%; border-collapse: collapse; margin: 4mm 0 5mm;
  font-size: 10pt; break-inside: avoid;
}
table.dados th {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase;
  color: var(--tinta-fraca); text-align: left; font-weight: 600;
  padding: 0 2.5mm 1.6mm 0; border-bottom: 0.35mm solid var(--regua);
}
table.dados td {
  padding: 1.8mm 2.5mm 1.8mm 0; border-bottom: 0.25mm dotted var(--regua);
  vertical-align: top;
}
table.dados tr:last-child td { border-bottom: none; }
table.dados .num { text-align: center; width: 14mm; font-variant-numeric: tabular-nums; }
`;
