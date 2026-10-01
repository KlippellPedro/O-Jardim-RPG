/**
 * Estilo dos cartões de mesa. Cartão de jogo, não prop: papel claro para gastar
 * pouca tinta, faixa colorida por categoria e texto que cabe em 63 x 88 mm
 * (tamanho de carta comum, cabe em capinha).
 *
 * A folha é A4 com grade 3 x 3 sem vão entre cartões. As marcas de corte ficam
 * na margem, fora de qualquer cartão.
 */
export const LARGURA_CARTAO = 63;
export const ALTURA_CARTAO = 88;
export const MARGEM_X = (210 - LARGURA_CARTAO * 3) / 2;
export const MARGEM_Y = (297 - ALTURA_CARTAO * 3) / 2;

export const CSS_CARTOES = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: "Segoe UI", Corbel, sans-serif; color: #2a2433; }

.folha {
  position: relative;
  width: 210mm; height: 297mm;
  overflow: hidden;
  break-after: page; page-break-after: always;
}
.folha:last-child { break-after: auto; page-break-after: auto; }

.grade {
  position: absolute;
  left: ${MARGEM_X}mm; top: ${MARGEM_Y}mm;
  display: grid;
  grid-template-columns: repeat(3, ${LARGURA_CARTAO}mm);
  grid-template-rows: repeat(3, ${ALTURA_CARTAO}mm);
}

.marca { position: absolute; background: #6b6578; }
.marca.v { width: .2mm; height: 4mm; }
.marca.h { height: .2mm; width: 4mm; }

.cartao {
  --cor: #6b6578;
  --fs: 9pt;
  width: ${LARGURA_CARTAO}mm; height: ${ALTURA_CARTAO}mm;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: #f7f2e6;
  border: .2mm solid #b9b0a0;
  font-size: var(--fs);
  line-height: 1.28;
}
.cartao.vazio { background: #fff; border-color: #fff; }

.cartao.fisica  { --cor: #a8480f; }
.cartao.mental  { --cor: #7a1f8f; }
.cartao.combate { --cor: #a31f2c; }

.topo {
  background: var(--cor);
  color: #fff;
  padding: 2.6mm 3.6mm 2.2mm;
  flex: none;
}
.topo .linha {
  display: flex; justify-content: space-between; align-items: baseline; gap: 2mm;
  font-size: .72em; letter-spacing: .14em; text-transform: uppercase;
  opacity: .92; font-weight: 600;
}
.topo h2 {
  margin: 1mm 0 0;
  font-family: Constantia, Cambria, Georgia, "Times New Roman", serif;
  font-size: 1.62em; line-height: 1.12; font-weight: 700;
  min-height: 2.24em; /* altura de duas linhas: a faixa fica igual em todos os cartões */
}

.miolo {
  flex: 1 1 auto; min-height: 0;
  padding: 2.2mm 3.6mm 0;
  display: flex; flex-direction: column;
}
.duracao {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm;
  font-style: italic; color: #5d5568; font-size: .92em; margin: 0 0 1.6mm;
}
.duracao .selo {
  flex: none; font-style: normal; font-weight: 700;
  font-size: .72em; letter-spacing: .1em; text-transform: uppercase;
  color: var(--cor); border: .2mm solid var(--cor); border-radius: 2mm; padding: .1mm 1.4mm;
}
.efeitos { margin: 0; padding: 0; list-style: none; }
.efeitos li { position: relative; padding-left: 2.6mm; margin: 0 0 1.1mm; }
.efeitos li::before {
  content: ""; position: absolute; left: 0; top: .55em;
  width: 1mm; height: 1mm; border-radius: 50%; background: var(--cor);
}

.saida {
  flex: none;
  margin: auto 3.6mm 3.2mm;
  padding-top: 1.6mm;
  border-top: .25mm solid var(--cor);
  font-size: .92em; color: #3a3346;
}
.saida b {
  display: block; margin-bottom: .5mm;
  font-size: .8em; letter-spacing: .14em; text-transform: uppercase; color: var(--cor);
}
`;
