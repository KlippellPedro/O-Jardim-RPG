/**
 * Estilo do kit do Mestre: folhas de trabalho, não props.
 *
 * A diferença é de propósito. Prop é papel que o personagem acha e precisa
 * parecer achado; isto aqui é papel que o Mestre preenche a lápis na mesa e
 * relê no escuro, então tudo é claro, seco e de alto contraste. Sem grão, sem
 * mancha e sem envelhecimento: gasta tinta da impressora e atrapalha quem
 * escreve por cima.
 *
 * As fontes são as mesmas nativas do Windows usadas no livro, pra geração
 * continuar funcionando offline.
 */
export const CSS_MESTRE = `
@page { size: A4; margin: 0; }

:root {
  --tinta: #1d1b17;
  --tinta-fraca: #55504a;
  --tinta-apagada: #8b857c;
  --regua: #c9c3b8;
  --pauta: #d7d2c7;
  --fundo-caixa: #f4f1ea;
  --ac: 166,132,58;
  --acd: 124,96,34;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0; background: #fff; color: var(--tinta);
  font-family: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  font-size: 10pt; line-height: 1.45;
  print-color-adjust: exact; -webkit-print-color-adjust: exact;
  text-rendering: geometricPrecision;
}

.folha {
  position: relative; overflow: hidden;
  width: 210mm; min-height: 297mm;
  padding: 14mm 15mm 12mm;
  break-after: page; background: #fff;
}
.folha:last-child { break-after: auto; }

/* ================= cabeçalho ================= */

.topo {
  display: flex; align-items: flex-end; justify-content: space-between;
  border-bottom: 0.7mm solid rgb(var(--ac)); padding-bottom: 2.4mm; margin-bottom: 5mm;
}
.topo h1 { font-size: 19pt; margin: 0; letter-spacing: .01em; }
.topo .selo {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.6pt; letter-spacing: .2em;
  text-transform: uppercase; color: rgb(var(--acd));
  border: 0.25mm solid var(--regua); padding: 1mm 2.4mm; white-space: nowrap;
}
.linha-fina { color: var(--tinta-fraca); font-size: 8.6pt; margin: -3mm 0 5mm; }

/* ================= caixas ================= */

.caixa { border: 0.3mm solid var(--regua); margin-bottom: 4mm; break-inside: avoid; }
.caixa > .rotulo {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 7pt; letter-spacing: .16em;
  text-transform: uppercase; color: #fff; background: rgb(var(--acd));
  padding: 1.2mm 2.6mm;
}
.caixa > .dentro { padding: 2.6mm 3mm 3mm; }
.caixa.clara > .rotulo { background: var(--fundo-caixa); color: rgb(var(--acd)); border-bottom: 0.25mm solid var(--regua); }

.grade2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.grade3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; }

/* Pauta para escrever à mão. Cada linha é uma régua pontilhada de 7,5mm, que é
   a altura confortável pra letra de adulto com caneta comum. */
.pauta { display: block; }
.pauta i { display: block; height: 7.5mm; border-bottom: 0.2mm dashed var(--pauta); }
.pauta.curta i { height: 6.5mm; }

.campo { display: flex; align-items: baseline; gap: 2mm; margin-bottom: 2.4mm; }
.campo b {
  font-family: "Segoe UI", Corbel, sans-serif; font-weight: 600; font-size: 7.4pt;
  letter-spacing: .1em; text-transform: uppercase; color: var(--tinta-fraca); white-space: nowrap;
}
.campo span { flex: 1; border-bottom: 0.2mm dashed var(--pauta); min-height: 5mm; }

/* Relógio de pressão: partes vazias pra preencher a lápis. */
.relogio { display: flex; align-items: center; gap: 1.6mm; margin: 1.6mm 0 0; }
.relogio u { display: block; width: 4.6mm; height: 4.6mm; border: 0.3mm solid rgb(var(--acd)); border-radius: 50%; }

/* ================= texto ================= */

h2 {
  font-size: 12.5pt; margin: 5mm 0 2mm; color: rgb(var(--acd));
  border-bottom: 0.25mm solid var(--regua); padding-bottom: 1mm; break-after: avoid;
}
h3 { font-size: 10pt; margin: 3.4mm 0 1.4mm; break-after: avoid; }
p { margin: 0 0 2.2mm; }
ul { margin: 0 0 2.4mm; padding-left: 4.6mm; }
li { margin-bottom: 1.2mm; }
small { color: var(--tinta-fraca); font-size: 8.4pt; }

/* Trecho para ler em voz alta. O Mestre precisa achar isso na folha sem
   procurar, então ele é a única coisa da página com fundo e barra lateral. */
.leitura {
  background: var(--fundo-caixa); border-left: 1mm solid rgb(var(--ac));
  padding: 2.6mm 3mm; margin: 0 0 3mm; font-style: italic; break-inside: avoid;
}
.leitura p:last-child { margin-bottom: 0; }

table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; font-size: 9pt; }
th, td { border: 0.2mm solid var(--regua); padding: 1.4mm 2mm; text-align: left; vertical-align: top; }
th {
  background: var(--fundo-caixa); font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.4pt; letter-spacing: .1em; text-transform: uppercase; color: rgb(var(--acd));
}

/* Ficha de criatura: bloco fechado, pra ser lido de relance no meio da luta. */
.criatura { border: 0.4mm solid rgb(var(--acd)); padding: 2.6mm 3mm; margin-bottom: 3mm; break-inside: avoid; }
.criatura h4 { margin: 0 0 1mm; font-size: 10.5pt; }
.criatura .numeros {
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 8.4pt; color: var(--tinta-fraca);
  border-bottom: 0.2mm solid var(--regua); padding-bottom: 1.4mm; margin-bottom: 1.6mm;
}
.criatura p { margin: 0 0 1.2mm; font-size: 9pt; }

.pe {
  position: absolute; left: 15mm; right: 15mm; bottom: 6mm;
  display: flex; justify-content: space-between;
  font-family: "Segoe UI", Corbel, sans-serif; font-size: 6.8pt;
  letter-spacing: .14em; text-transform: uppercase; color: var(--tinta-apagada);
  border-top: 0.2mm solid var(--regua); padding-top: 1.6mm;
}
`;
