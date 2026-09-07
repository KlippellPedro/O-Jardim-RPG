/**
 * Estilo dos props de mesa: documentos que o personagem acha, e não guias que o
 * jogador consulta.
 *
 * Cada emissor tem a própria superfície, porque é assim que o jogador reconhece
 * de quem é o papel antes de ler a primeira linha. O caderno de campo é papel
 * envelhecido com pauta e anotação à mão; o Banco Lunar é impresso institucional
 * com carimbo; a Guilda é formulário datilografado; a Malha é transmissão em
 * monoespaçada com tarja por cima do que não passou.
 *
 * Nada de imagem externa: o grão do papel, as manchas e os vincos são todos
 * gradiente e ruído SVG embutido, pra que gerar o PDF continue funcionando com
 * a máquina offline e o repositório continue sem binário.
 *
 * As fontes são nativas do Windows. "Ink Free" existe no Windows 10 e 11; se
 * faltar, "Segoe Script" assume, e nenhuma das duas é usada em texto corrido
 * longo justamente porque cansa a vista.
 */
export const CSS_PROPS = `
@page { size: A4; margin: 0; }

:root {
  /* Preenchido em tempo de execução por gerar-props.mjs, que desenha o grão uma
     vez num canvas e reusa o bitmap em todas as folhas. A versão anterior usava
     um feTurbulence embutido, e o Chrome re-rasterizava o filtro em resolução de
     impressão a cada página: um caderno de 34 folhas não terminava de imprimir. */
  --grao: none;

  --tinta: #2a2118;
  --tinta-fraca: #6b5c47;
  --tinta-apagada: #8d7f6a;
  --anotacao: #8a2f26;
  --anotacao-azul: #2c4272;
  --papel-claro: #ece0c8;
  --papel-medio: #e3d4b6;
  --papel-escuro: #cbb590;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  background: #ded0b2;
  color: var(--tinta);
  font-family: "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  font-size: 11pt; line-height: 1.6;
  print-color-adjust: exact; -webkit-print-color-adjust: exact;
  text-rendering: geometricPrecision;
}

/* ================= superfície base ================= */

.prop {
  position: relative; overflow: hidden;
  width: 210mm; min-height: 297mm;
  padding: 22mm 20mm 24mm;
  break-after: page;
  background-color: var(--papel-medio);
  background-image:
    radial-gradient(58% 42% at 12% 8%, rgba(255,250,235,0.62), transparent 62%),
    radial-gradient(48% 38% at 88% 82%, rgba(150,120,74,0.20), transparent 66%),
    radial-gradient(70% 55% at 50% 50%, rgba(255,250,238,0.34), transparent 78%),
    linear-gradient(168deg, var(--papel-claro), var(--papel-medio) 55%, var(--papel-escuro));
}
.prop:last-child { break-after: auto; }

/* Grão e escurecimento das bordas: as duas coisas que mais denunciam papel
   velho no impresso.

   A borda escura sai de um gradiente, e não de box-shadow interno borrado. O
   box-shadow dava o mesmo resultado, mas um blur de 18mm por página, vezes as
   trinta e poucas páginas de um caderno, fazia a impressão do PDF passar de
   minutos. Gradiente e blend normal custam quase nada e imprimem igual. */
.prop::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: var(--grao);
  opacity: 0.14;
}
.prop::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(to right, rgba(94, 72, 38, 0.30), transparent 9%, transparent 91%, rgba(94, 72, 38, 0.30)),
    linear-gradient(to bottom, rgba(94, 72, 38, 0.28), transparent 7%, transparent 93%, rgba(94, 72, 38, 0.32)),
    radial-gradient(120% 100% at 50% 50%, transparent 52%, rgba(88, 66, 34, 0.24));
}
.prop > * { position: relative; z-index: 1; }

/* variações de superfície por emissor */
.prop.pautado > .corpo { background-image: repeating-linear-gradient(
    to bottom, transparent 0, transparent 7.4mm, rgba(90,120,140,0.20) 7.4mm, rgba(90,120,140,0.20) 7.55mm); }
.prop.oficial { background-color: #efe7d6; }
.prop.oficial { background-image:
    radial-gradient(60% 45% at 20% 10%, rgba(255,253,246,0.7), transparent 60%),
    linear-gradient(170deg, #f2ebdb, #e6dbc4 70%, #d9caae); }
.prop.tecnico {
  background-color: #dfe3e0;
  background-image:
    radial-gradient(60% 40% at 30% 12%, rgba(255,255,255,0.65), transparent 62%),
    linear-gradient(172deg, #e7eae7, #d6dbd8 72%, #c4cbc7);
  font-family: Consolas, "Cascadia Mono", "Courier New", monospace;
  font-size: 10pt;
}

/* ================= sujeira e desgaste ================= */

/* Mancha de líquido secado. O miolo fica quase limpo e a borda concentra a cor,
   que é como café e sangue secam de verdade. Um gradiente radial centrado dava
   sombreado de esfera e lia como bola, e não como sujeira, por isso o centro é
   transparente e o contorno é irregular. */
.mancha {
  position: absolute; pointer-events: none; z-index: 0;
  border-radius: 46% 54% 61% 39% / 57% 43% 57% 43%;
  background:
    radial-gradient(closest-side at 50% 50%,
      transparent 0 62%,
      rgba(122, 86, 36, 0.16) 74%,
      rgba(98, 66, 24, 0.26) 88%,
      rgba(98, 66, 24, 0.08) 96%, transparent 100%),
    radial-gradient(closest-side at 34% 62%,
      rgba(122, 86, 36, 0.10) 0 40%, transparent 72%);
}
.mancha.sangue {
  border-radius: 58% 42% 38% 62% / 44% 61% 39% 56%;
  background:
    radial-gradient(closest-side at 50% 50%,
      transparent 0 54%,
      rgba(116, 26, 22, 0.20) 70%,
      rgba(76, 12, 12, 0.34) 88%,
      rgba(76, 12, 12, 0.10) 96%, transparent 100%),
    radial-gradient(closest-side at 62% 38%,
      rgba(116, 26, 22, 0.14) 0 36%, transparent 68%);
}
.vinco {
  position: absolute; left: 0; right: 0; height: 3mm; pointer-events: none; z-index: 0;
  background: linear-gradient(to bottom,
    transparent, rgba(120, 96, 56, 0.30) 45%, rgba(255,252,242,0.45) 55%, transparent);
}
.vinco.vertical {
  left: auto; top: 0; bottom: 0; width: 3mm; height: auto;
  background: linear-gradient(to right,
    transparent, rgba(120, 96, 56, 0.30) 45%, rgba(255,252,242,0.45) 55%, transparent);
}
.furo {
  position: absolute; width: 5mm; height: 5mm; border-radius: 50%;
  background: #cdbc9c; box-shadow: inset 0 0.6mm 1mm rgba(80,60,30,0.55);
  z-index: 0;
}

/* ================= tipografia manuscrita ================= */

.mao {
  font-family: "Ink Free", "Segoe Script", "Bradley Hand ITC", "Segoe Print", cursive;
  color: var(--anotacao);
  line-height: 1.35;
}
.mao.azul { color: var(--anotacao-azul); }
.mao.grafite { color: #4a453c; }

/* anotação solta na margem, torta como quem escreve apoiado no joelho */
.margem {
  position: absolute; z-index: 3;
  font-family: "Ink Free", "Segoe Script", "Bradley Hand ITC", cursive;
  color: var(--anotacao); font-size: 11pt; line-height: 1.3;
  max-width: 48mm;
}
.margem.azul { color: var(--anotacao-azul); }
.margem.torta-1 { transform: rotate(-2.4deg); }
.margem.torta-2 { transform: rotate(1.8deg); }
.margem.torta-3 { transform: rotate(-4deg); }

.seta {
  position: absolute; z-index: 3; stroke: var(--anotacao);
  fill: none; stroke-width: 1.4; pointer-events: none;
}

/* ================= cabeçalhos ================= */

.timbre {
  display: flex; align-items: flex-end; justify-content: space-between;
  border-bottom: 0.6mm solid rgba(60, 46, 26, 0.55);
  padding-bottom: 3mm; margin-bottom: 7mm;
}
.timbre .casa {
  font-variant: small-caps; letter-spacing: .12em;
  font-size: 15pt; font-weight: 700;
}
.timbre .linha2 {
  font-size: 8.5pt; letter-spacing: .18em; text-transform: uppercase;
  color: var(--tinta-fraca);
}
.timbre .ref {
  font-size: 8.5pt; text-align: right; color: var(--tinta-fraca);
  font-family: Consolas, "Courier New", monospace; line-height: 1.7;
}

h1.titulo {
  font-size: 23pt; font-weight: 400; margin: 0 0 1.5mm;
  letter-spacing: -0.01em;
}
h2.titulo {
  font-size: 16pt; font-weight: 700; margin: 8mm 0 2mm;
  font-variant: small-caps; letter-spacing: .06em;
}
h3.titulo {
  font-size: 12.5pt; font-weight: 700; margin: 6mm 0 1.5mm;
}
.subtitulo {
  font-style: italic; color: var(--tinta-fraca); font-size: 11.5pt;
  margin: 0 0 6mm;
}
.olho {
  font-size: 8.5pt; letter-spacing: .2em; text-transform: uppercase;
  color: var(--tinta-apagada); margin-bottom: 2mm;
}

p { margin: 0 0 3.4mm; }
.recuo p + p { text-indent: 6mm; }

/* ================= carimbos e selos ================= */

.carimbo {
  position: absolute; z-index: 4; pointer-events: none;
  border: 1mm solid var(--anotacao); color: var(--anotacao);
  padding: 2.5mm 5mm; border-radius: 1.5mm;
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 13pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase;
  opacity: 0.6;
}
.carimbo.pequeno { font-size: 9.5pt; padding: 1.6mm 3.4mm; border-width: 0.6mm; }
.carimbo.azul { border-color: var(--anotacao-azul); color: var(--anotacao-azul); }
.carimbo.preto { border-color: #33302a; color: #33302a; }
.carimbo.redondo {
  border-radius: 50%; width: 34mm; height: 34mm; padding: 0;
  display: flex; align-items: center; justify-content: center; text-align: center;
  font-size: 8pt; line-height: 1.3; letter-spacing: .08em;
}

/* ================= tarja ================= */

.tarja {
  background: #1c1a17; color: #1c1a17;
  padding: 0 1mm; border-radius: 0.5mm;
  box-decoration-break: clone; -webkit-box-decoration-break: clone;
}
.tarja::selection { background: #1c1a17; }
.tarja-bloco {
  display: block; height: 4.4mm; background: #1c1a17;
  margin: 1.6mm 0; border-radius: 0.5mm;
}

/* ================= caixas ================= */

.nota-campo {
  border: 0.35mm solid rgba(70, 54, 32, 0.5);
  background: rgba(255, 251, 238, 0.5);
  padding: 4mm 5mm; margin: 5mm 0;
  break-inside: avoid;
}
.nota-campo .olho { margin-bottom: 1.5mm; }
.nota-campo p:last-child { margin-bottom: 0; }

.rasurado {
  text-decoration: line-through;
  text-decoration-color: var(--anotacao);
  text-decoration-thickness: 0.5mm;
  color: var(--tinta-apagada);
}

.grifado {
  background: linear-gradient(transparent 58%, rgba(196, 168, 60, 0.42) 58%);
}

/* ================= formulário ================= */

.campo {
  display: grid; grid-template-columns: 44mm 1fr; gap: 3mm;
  padding: 1.8mm 0; border-bottom: 0.25mm dotted rgba(70, 54, 32, 0.45);
  break-inside: avoid;
}
.campo dt {
  font-size: 8pt; letter-spacing: .14em; text-transform: uppercase;
  color: var(--tinta-fraca); padding-top: 0.8mm;
  font-family: "Segoe UI", Corbel, sans-serif;
}
.campo dd { margin: 0; }
.campo dd.preenchido {
  font-family: "Ink Free", "Segoe Script", "Bradley Hand ITC", cursive;
  color: var(--anotacao-azul); font-size: 12pt;
}
dl.formulario { margin: 4mm 0 6mm; }

table.livro {
  width: 100%; border-collapse: collapse; margin: 4mm 0 6mm;
  font-size: 10pt; break-inside: avoid;
}
table.livro th {
  font-family: "Segoe UI", Corbel, sans-serif;
  font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase;
  color: var(--tinta-fraca); text-align: left; font-weight: 600;
  border-bottom: 0.5mm solid rgba(70, 54, 32, 0.55);
  padding: 0 2.5mm 1.5mm 0;
}
table.livro td {
  padding: 1.7mm 2.5mm 1.7mm 0;
  border-bottom: 0.25mm solid rgba(70, 54, 32, 0.28);
  vertical-align: top;
}
table.livro td.valor {
  text-align: right; font-family: Consolas, "Courier New", monospace;
  white-space: nowrap;
}
table.livro tr.somatorio td {
  border-top: 0.5mm solid rgba(70, 54, 32, 0.55);
  border-bottom: none; font-weight: 700; padding-top: 2.5mm;
}

/* ================= transmissão da Malha ================= */

.tecnico .cabecalho-malha {
  border: 0.4mm solid rgba(40, 60, 70, 0.6);
  padding: 3mm 4mm; margin-bottom: 6mm;
  font-size: 9pt; line-height: 1.75;
}
.tecnico .cabecalho-malha b { letter-spacing: .1em; }
.tecnico .linha-log { margin: 0 0 1.2mm; }
.tecnico .ruido { color: #8d9691; letter-spacing: .06em; }

/* ================= assinatura ================= */

.assinatura { margin-top: 9mm; break-inside: avoid; }
.assinatura .risco {
  font-family: "Ink Free", "Segoe Script", "Bradley Hand ITC", cursive;
  font-size: 20pt; color: var(--anotacao-azul);
  transform: rotate(-2deg); display: inline-block; margin-bottom: 1mm;
}
.assinatura .cargo {
  font-size: 8.5pt; letter-spacing: .1em; text-transform: uppercase;
  color: var(--tinta-fraca); border-top: 0.3mm solid rgba(70,54,32,0.5);
  padding-top: 1.5mm; display: inline-block; min-width: 62mm;
}

/* ================= paginação à mão ================= */

.folio {
  position: absolute; bottom: 12mm; right: 20mm; z-index: 2;
  font-family: "Ink Free", "Segoe Script", "Bradley Hand ITC", cursive;
  color: var(--tinta-apagada); font-size: 12pt;
}
.folio.esquerda { right: auto; left: 20mm; }

/* ================= listas ================= */

ul.campo-lista { margin: 2mm 0 4mm; padding-left: 5mm; }
ul.campo-lista li { margin-bottom: 1.6mm; }
ul.campo-lista li::marker { color: var(--anotacao); }

ol.numerada { margin: 2mm 0 4mm; padding-left: 6mm; }
ol.numerada li { margin-bottom: 2mm; }

/* ================= recorte de jornal ================= */

.prop.jornal {
  background-color: #e6e0d0;
  background-image:
    radial-gradient(60% 45% at 25% 12%, rgba(255,255,250,0.6), transparent 62%),
    linear-gradient(172deg, #ece6d7, #ded7c5 70%, #cdc4ae);
  font-family: Georgia, "Times New Roman", serif;
}
.jornal .cabeca-jornal {
  border-top: 1.2mm solid #2a2118; border-bottom: 0.4mm solid #2a2118;
  padding: 2mm 0; margin-bottom: 5mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 8.5pt; letter-spacing: .16em; text-transform: uppercase;
}
.jornal .manchete {
  font-size: 30pt; line-height: 1.04; font-weight: 700;
  margin: 0 0 3mm; letter-spacing: -0.015em;
}
.jornal .linha-fina {
  font-size: 12pt; font-style: italic; color: var(--tinta-fraca);
  margin: 0 0 6mm; padding-bottom: 4mm;
  border-bottom: 0.3mm solid rgba(42,33,24,0.4);
}
.jornal .colunas {
  column-count: 2; column-gap: 8mm; column-rule: 0.25mm solid rgba(42,33,24,0.3);
  text-align: justify; hyphens: auto; font-size: 10pt; line-height: 1.55;
}
.jornal .colunas p:first-child::first-letter {
  float: left; font-size: 26pt; line-height: 0.86; padding: 1mm 1.6mm 0 0; font-weight: 700;
}
.jornal .credito {
  font-size: 8.5pt; letter-spacing: .1em; text-transform: uppercase;
  color: var(--tinta-apagada); margin-bottom: 4mm;
}
`;
