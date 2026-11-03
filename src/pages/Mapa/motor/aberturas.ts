// Portas do mapa montado no construtor: a parte viva da cena, desenhada por cima da imagem
// (que tem só o vão e a soleira). Fechada, aberta (girada na dobradiça) ou trancada (com o
// cadeado). A porta secreta é só do Mestre: um tracejado sobre a parede. A janela já vem
// desenhada na imagem do mapa. O mesmo desenho serve para o editor do construtor.

import { Container, Graphics } from 'pixi.js';
import type { IAberturaCena } from '../../../services/mapaApi';

const COR_MADEIRA = 0x7a4a26;
const COR_BORDA = 0x24140a;
const COR_CADEADO = 0xe0b84a;
const COR_SECRETA = 0xc084fc;

/** Uma abertura no Graphics. `casa` dá a grossura; `gestor` decide se a porta secreta aparece. */
export function desenharAbertura(g: Graphics, abertura: IAberturaCena, casa: number, gestor: boolean) {
  const { x1, y1, x2, y2 } = abertura;
  const comprimento = Math.hypot(x2 - x1, y2 - y1);
  if (comprimento <= 0) return;
  const ux = (x2 - x1) / comprimento;
  const uy = (y2 - y1) / comprimento;
  // A normal aponta para baixo (porta deitada) ou para a direita (porta em pé): é para onde ela abre.
  const nx = -uy;
  const ny = ux;
  const fino = Math.max(2, casa * 0.02);
  if (abertura.tipo === 'secreta') {
    if (!gestor) return;
    const pedacos = 6;
    for (let i = 0; i < pedacos; i++) {
      const a = i / pedacos;
      const b = (i + 0.55) / pedacos;
      g.moveTo(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a).lineTo(x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
    }
    g.stroke({ width: casa * 0.08, color: COR_SECRETA, alpha: 0.85, cap: 'round' });
    return;
  }
  if (abertura.tipo !== 'porta') return;
  const grossura = casa * 0.11;
  const folha = comprimento * 0.92;
  const inicioX = x1 + ux * comprimento * 0.04;
  const inicioY = y1 + uy * comprimento * 0.04;
  if (abertura.estado === 'aberta') {
    // Girada 90 graus na dobradiça, com o arco de onde ela passou.
    const fimX = inicioX + nx * folha;
    const fimY = inicioY + ny * folha;
    g.moveTo(inicioX + ux * folha, inicioY + uy * folha);
    g.arc(inicioX, inicioY, folha, Math.atan2(uy, ux), Math.atan2(ny, nx), Math.sign(ux * ny - uy * nx) < 0);
    g.stroke({ width: fino, color: 0xffffff, alpha: 0.18 });
    g.moveTo(inicioX, inicioY).lineTo(fimX, fimY).stroke({ width: grossura + fino * 2, color: COR_BORDA, cap: 'butt' });
    g.moveTo(inicioX, inicioY).lineTo(fimX, fimY).stroke({ width: grossura, color: COR_MADEIRA, cap: 'butt' });
  } else {
    const fimX = inicioX + ux * folha;
    const fimY = inicioY + uy * folha;
    g.moveTo(inicioX, inicioY).lineTo(fimX, fimY).stroke({ width: grossura + fino * 2, color: COR_BORDA, cap: 'butt' });
    g.moveTo(inicioX, inicioY).lineTo(fimX, fimY).stroke({ width: grossura, color: COR_MADEIRA, cap: 'butt' });
    // Tábuas da folha.
    for (const t of [0.33, 0.66]) {
      const px = inicioX + ux * folha * t;
      const py = inicioY + uy * folha * t;
      g.moveTo(px - nx * grossura * 0.5, py - ny * grossura * 0.5).lineTo(px + nx * grossura * 0.5, py + ny * grossura * 0.5);
    }
    g.stroke({ width: fino * 0.6, color: COR_BORDA, alpha: 0.8 });
    if (abertura.estado === 'trancada') {
      const meioX = (x1 + x2) / 2;
      const meioY = (y1 + y2) / 2;
      g.circle(meioX, meioY, casa * 0.085).fill(COR_CADEADO).stroke({ width: fino, color: COR_BORDA });
    }
  }
  // Dobradiça.
  g.circle(inicioX, inicioY, casa * 0.04).fill(0x3a2a1a);
}

/** As portas da cena na mesa: redesenha só quando a lista muda. */
export class CamadaAberturas {
  readonly raiz = new Container();
  private desenho = new Graphics();
  private chave = '';

  constructor() {
    this.raiz.eventMode = 'none';
    this.raiz.addChild(this.desenho);
  }

  definir(aberturas: IAberturaCena[], casa: number, gestor: boolean) {
    const chave = `${casa}|${gestor}|${JSON.stringify(aberturas)}`;
    if (chave === this.chave) return;
    this.chave = chave;
    this.desenho.clear();
    for (const abertura of aberturas) desenharAbertura(this.desenho, abertura, casa, gestor);
  }
}
