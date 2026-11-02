// Névoa de guerra na tela. As formas, em ordem, são pintadas numa textura do
// tamanho do mapa (reduzida até 2048 px): tudo coberto, "revelar" apaga e
// "esconder" cobre de novo, com a borda suave. A textura só é refeita quando a
// névoa muda. O jogador vê a névoa opaca; o Mestre, translúcida, para enxergar
// o que está escondido. O segredo não depende desta camada: o servidor nem
// manda ao jogador os ladrilhos cobertos (plataforma/core/nevoa.py).

import { BlurFilter, Container, Graphics, RenderTexture, Sprite, Texture, type Renderer } from 'pixi.js';
import type { IFormaNevoa, INevoa } from '../../../services/mapaApi';

const LADO_MAXIMO = 2048;
const COR_JOGADOR = 0x07060b;
const COR_MESTRE = 0x1a1530;
const ALFA_MESTRE = 0.6;
/** O fundo passa da borda do mapa: o desfoque não deixa a beirada clara. */
const SOBRA = 256;

/** Desenha a forma preenchida. O pincel é uma linha grossa de pontas redondas. */
export function desenharForma(g: Graphics, forma: IFormaNevoa, cor: number | string, alpha = 1) {
  if (forma.tipo === 'retangulo') {
    g.rect(forma.x, forma.y, forma.w, forma.h).fill({ color: cor, alpha });
  } else if (forma.tipo === 'poligono') {
    g.poly(forma.pontos.flat(), true).fill({ color: cor, alpha });
  } else if (forma.pontos.length === 1) {
    g.circle(forma.pontos[0][0], forma.pontos[0][1], forma.raio).fill({ color: cor, alpha });
  } else {
    g.moveTo(forma.pontos[0][0], forma.pontos[0][1]);
    for (const [x, y] of forma.pontos.slice(1)) g.lineTo(x, y);
    g.stroke({ width: forma.raio * 2, color: cor, alpha, cap: 'round', join: 'round' });
  }
}

export class CamadaNevoa {
  readonly raiz = new Container();
  private sprite = new Sprite();
  private textura: RenderTexture | null = null;
  private renderer: Renderer;
  private formas: IFormaNevoa[] = [];
  private largura = 1;
  private altura = 1;
  private gestor = false;
  private origem: INevoa | null = null;
  private desfoque = new BlurFilter({ strength: 4, quality: 3 });
  ligada = false;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.raiz.addChild(this.sprite);
    this.raiz.visible = false;
    this.raiz.eventMode = 'none';
  }

  definir(nevoa: INevoa | null, largura: number, altura: number, gestor: boolean) {
    // A página manda a cena de novo a cada token solto: só repinta se a névoa mudou.
    if (nevoa === this.origem && largura === this.largura && altura === this.altura && gestor === this.gestor) return;
    this.origem = nevoa;
    this.ligada = Boolean(nevoa?.ligada);
    this.formas = nevoa?.formas ?? [];
    this.largura = Math.max(1, largura);
    this.altura = Math.max(1, altura);
    this.gestor = gestor;
    this.raiz.visible = this.ligada;
    if (this.ligada) this.pintar();
  }

  /** O Mestre soltou uma forma: ela aparece na hora, antes da resposta do servidor. */
  acrescentar(forma: IFormaNevoa) {
    if (!this.ligada) return;
    this.formas = [...this.formas, forma];
    this.pintar();
  }

  private pintar() {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(this.largura, this.altura));
    const w = Math.max(1, Math.ceil(this.largura * escala));
    const h = Math.max(1, Math.ceil(this.altura * escala));
    // A textura muda de tamanho em vez de ser trocada: destruir uma textura que o último
    // quadro desenhou deixa o Pixi reclamando no console.
    if (!this.textura) this.textura = RenderTexture.create({ width: w, height: h, resolution: 1 });
    else if (this.textura.width !== w || this.textura.height !== h) this.textura.source.resize(w, h);
    const desenho = new Container();
    const conteudo = new Container();
    conteudo.scale.set(escala);
    desenho.addChild(conteudo);
    conteudo.addChild(new Graphics().rect(-SOBRA, -SOBRA, this.largura + SOBRA * 2, this.altura + SOBRA * 2).fill(0xffffff));
    for (const forma of this.formas) {
      const g = new Graphics();
      desenharForma(g, forma, 0xffffff);
      // Revelar apaga a cobertura; esconder pinta por cima de novo.
      if (forma.op === 'revelar') g.blendMode = 'erase';
      conteudo.addChild(g);
    }
    conteudo.filters = [this.desfoque];
    this.renderer.render({ container: desenho, target: this.textura, clear: true });
    conteudo.filters = [];
    desenho.destroy({ children: true });
    this.sprite.texture = this.textura;
    this.sprite.scale.set(this.largura / w, this.altura / h);
    this.sprite.tint = this.gestor ? COR_MESTRE : COR_JOGADOR;
    this.sprite.alpha = this.gestor ? ALFA_MESTRE : 1;
  }

  /** Chamado depois de desmontar o renderizador. */
  destruir() {
    this.sprite.texture = Texture.EMPTY;
    this.textura?.destroy(true);
    this.textura = null;
    this.desfoque.destroy();
  }
}
