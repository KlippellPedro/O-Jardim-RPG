// Luzes dos tokens: tocha, vela, lanterna, luz mágica. Cada token com luz ganha
// um brilho somado ao mapa embaixo dele, na cor escolhida; a chama tremula (o
// alcance e a força oscilam juntos, num ritmo irregular). A escuridão do clima
// usa as mesmas fontes para abrir a luz (clima.ts), com o mesmo tremor: o
// buraco na escuridão e o brilho andam juntos.

import { Container, Sprite, Texture } from 'pixi.js';
import type { FonteDeLuz } from './luzesConta';

export { corDaLuz, faseDe, fonteDoToken, tremor, type FonteDeLuz } from './luzesConta';

let brilho: Texture | null = null;

/** Mancha de luz macia, branca, para tingir na cor de cada luz (e a sombra do token, em preto).
 * Vive enquanto a aba estiver aberta: o palco, ao fechar, destrói as texturas dos sprites, e esta
 * é de todos os palcos (como a Texture.EMPTY do Pixi, ela ignora o pedido de destruir). */
export function texturaDeBrilho(): Texture {
  if (brilho) return brilho;
  const lado = 128;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d')!;
  const gradiente = ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  gradiente.addColorStop(0, 'rgba(255,255,255,1)');
  gradiente.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  gradiente.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, lado, lado);
  brilho = Texture.from(canvas);
  brilho.destroy = () => {};
  return brilho;
}

export class CamadaLuzes {
  readonly raiz = new Container();
  private brilhos = new Map<string, Sprite>();

  constructor() {
    this.raiz.eventMode = 'none';
    // Luz soma: clareia o chão sem tapar o desenho.
    this.raiz.blendMode = 'add';
  }

  quadro(fontes: FonteDeLuz[]) {
    const vistas = new Set<string>();
    for (const fonte of fontes) {
      if (fonte.cor === null || fonte.raio === null) continue;
      vistas.add(fonte.id);
      let sprite = this.brilhos.get(fonte.id);
      if (!sprite) {
        sprite = new Sprite({ texture: texturaDeBrilho(), anchor: 0.5 });
        this.brilhos.set(fonte.id, sprite);
        this.raiz.addChild(sprite);
      }
      sprite.position.set(fonte.x, fonte.y);
      sprite.width = fonte.raio * 2.2;
      sprite.height = fonte.raio * 2.2;
      sprite.tint = fonte.cor;
      sprite.alpha = 0.32 * Math.min(1.2, fonte.forca);
    }
    for (const [id, sprite] of this.brilhos) {
      if (vistas.has(id)) continue;
      sprite.destroy();
      this.brilhos.delete(id);
    }
  }

  destruir() {
    this.brilhos.clear();
    this.raiz.destroy({ children: true });
  }
}
