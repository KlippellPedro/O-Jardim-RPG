// Luz do dia na cena: uma escuridão na cor da hora (azul de noite, roxo no crepúsculo)
// com as luzes dos tokens abrindo caminho, e uma tinta que multiplica a cena inteira
// (laranja no amanhecer, âmbar no fim da tarde). As contas moram em ceuConta.ts.
// A troca de uma hora para outra acontece devagar, na tela de todos.

import { Container, Graphics, RenderTexture, Sprite, type Renderer } from 'pixi.js';
import { obterLuz } from './clima';
import { misturarCor, type ILuzDoCeu } from './ceuConta';
import type { FonteDeLuz } from './luzes';

/** Personagem sem luz própria ainda enxerga um pouco em volta de si à noite, em casas. */
const LUZ_PADRAO_CASAS = 3;
/** Quanto da diferença para a luz nova anda por segundo: perto de dois segundos para trocar. */
const VELOCIDADE_TROCA = 2.2;
const LADO_MAXIMO = 1024;

const APAGADO: ILuzDoCeu = { escuro: 0, corEscuro: 0x070b1f, tinta: 0xffffff, tintaForca: 0 };

export class CamadaCeu {
  readonly raiz = new Container();
  private tinta = new Sprite();
  private escuridao = new Sprite();
  private texturaTinta: RenderTexture | null = null;
  private texturaEscuro: RenderTexture | null = null;
  private renderer: Renderer;
  private alvo: ILuzDoCeu | null = null;
  private atual: ILuzDoCeu | null = null;
  private largura = 1;
  private altura = 1;
  private gestor = false;
  private chave = '';

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.raiz.eventMode = 'none';
    this.raiz.visible = false;
    this.tinta.blendMode = 'multiply';
    this.raiz.addChild(this.tinta, this.escuridao);
  }

  /** A luz que a cena deve ter. Na primeira vez (ou ao trocar de cena) ela vale na hora; depois, aos poucos. */
  definir(luz: ILuzDoCeu | null, largura: number, altura: number, gestor: boolean, imediato = false) {
    const mudouCena = largura !== this.largura || altura !== this.altura;
    this.largura = Math.max(1, largura);
    this.altura = Math.max(1, altura);
    this.gestor = gestor;
    this.alvo = luz;
    if (imediato || mudouCena || !this.atual) this.atual = luz ? { ...luz } : null;
    this.chave = '';
  }

  quadro(dt: number, luzes: FonteDeLuz[], tamanhoCasa: number) {
    if (!this.alvo && !this.atual) {
      this.raiz.visible = false;
      return;
    }
    const alvo = this.alvo ?? APAGADO;
    const atual = this.atual ?? { ...APAGADO };
    const k = 1 - Math.exp(-dt * VELOCIDADE_TROCA);
    atual.escuro += (alvo.escuro - atual.escuro) * k;
    atual.tintaForca += (alvo.tintaForca - atual.tintaForca) * k;
    atual.corEscuro = misturarCor(atual.corEscuro, alvo.corEscuro, k);
    atual.tinta = misturarCor(atual.tinta, alvo.tinta, k);
    // A cena deixou de seguir a hora e a luz já voltou ao normal: a camada some.
    if (!this.alvo && atual.escuro < 0.005 && atual.tintaForca < 0.005) {
      this.atual = null;
      this.raiz.visible = false;
      return;
    }
    this.atual = atual;
    this.raiz.visible = true;
    this.pintar(atual, luzes, tamanhoCasa);
  }

  private pintar(luz: ILuzDoCeu, luzes: FonteDeLuz[], tamanhoCasa: number) {
    const padrao = LUZ_PADRAO_CASAS * tamanhoCasa;
    const raioDe = (fonte: FonteDeLuz) => fonte.raio ?? padrao;
    // Repinta só quando a luz andou o bastante para se notar, ou uma luz de token andou ou tremeu.
    const chave = [
      Math.round(luz.escuro * 200), Math.round(luz.tintaForca * 200), luz.corEscuro >> 3, luz.tinta >> 3,
      ...luzes.map((l) => `${Math.round(l.x / 4)},${Math.round(l.y / 4)},${Math.round(raioDe(l) / 3)}`),
    ].join('|');
    if (chave === this.chave) return;
    this.chave = chave;
    const escala = Math.min(1, LADO_MAXIMO / Math.max(this.largura, this.altura));
    const w = Math.ceil(this.largura * escala);
    const h = Math.ceil(this.altura * escala);
    this.texturaEscuro = this.prepararTextura(this.texturaEscuro, w, h);
    this.texturaTinta = this.prepararTextura(this.texturaTinta, w, h);

    // A escuridão na cor da hora, com as luzes apagando um buraco.
    const escuro = new Container();
    escuro.scale.set(escala);
    escuro.addChild(new Graphics().rect(0, 0, this.largura, this.altura).fill({ color: luz.corEscuro, alpha: Math.min(0.92, luz.escuro) }));
    // A tinta da hora; perto de uma luz, a cor volta a ser a da própria cena.
    const tinta = new Container();
    tinta.scale.set(escala);
    tinta.addChild(new Graphics().rect(0, 0, this.largura, this.altura).fill(luz.tinta));
    for (const fonte of luzes) {
      const raio = raioDe(fonte);
      if (raio <= 0) continue;
      const buraco = new Sprite({ texture: obterLuz(), anchor: 0.5 });
      buraco.position.set(fonte.x, fonte.y);
      buraco.width = raio * 2;
      buraco.height = raio * 2;
      buraco.blendMode = 'erase';
      escuro.addChild(buraco);
      const claro = new Sprite({ texture: obterLuz(), anchor: 0.5 });
      claro.position.set(fonte.x, fonte.y);
      claro.width = raio * 1.6;
      claro.height = raio * 1.6;
      tinta.addChild(claro);
    }
    this.renderer.render({ container: escuro, target: this.texturaEscuro, clear: true });
    this.renderer.render({ container: tinta, target: this.texturaTinta, clear: true });
    escuro.destroy({ children: true });
    tinta.destroy({ children: true });

    this.escuridao.texture = this.texturaEscuro;
    this.escuridao.scale.set(this.largura / w, this.altura / h);
    this.tinta.texture = this.texturaTinta;
    this.tinta.scale.set(this.largura / w, this.altura / h);
    this.tinta.alpha = luz.tintaForca;
    // O Mestre enxerga através da noite para conduzir a cena.
    this.escuridao.alpha = this.gestor ? 0.55 : 1;
  }

  private prepararTextura(textura: RenderTexture | null, w: number, h: number): RenderTexture {
    if (!textura) return RenderTexture.create({ width: w, height: h, resolution: 1 });
    if (textura.width !== w || textura.height !== h) textura.source.resize(w, h);
    // As texturas morrem junto com o renderizador, quando o palco é destruído.
    return textura;
  }
}
