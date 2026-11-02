// Desenho de um token: retrato redondo (ou iniciais), moldura, barras, nome,
// condições e marcas de seleção e de vez. A moldura vem de molduras.ts (o mesmo
// desenho da prévia da Oficina), virada em textura e guardada para reuso.

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { IBarraToken, ITokenMapa, LadoToken } from '../../../services/mapaApi';
import { iniciais, siglaDaCondicao } from './geometria';
import { CORES_LADO, ESCALA_QUADRO, RAIO_RETRATO, desenharMoldura } from './molduras';

export { CORES_LADO };

const CORES_BARRA: Record<IBarraToken['tipo'], string> = {
  vida: '#e5484d',
  mana: '#3e63dd',
  estamina: '#30a46c',
  sanidade: '#8e4ec6',
};

const LADO_TEXTURA = 256;
const texturasDeMoldura = new Map<string, Texture>();

function texturaDaMoldura(id: string, nivel: number | null, lado: LadoToken): Texture {
  const chave = `${id}|${id === 'nivel' ? nivel : ''}|${lado}`;
  let textura = texturasDeMoldura.get(chave);
  if (!textura) {
    const tela = new OffscreenCanvas(LADO_TEXTURA, LADO_TEXTURA);
    desenharMoldura(tela.getContext('2d')!, LADO_TEXTURA, { id, nivel, lado });
    textura = Texture.from(tela.transferToImageBitmap());
    texturasDeMoldura.set(chave, textura);
  }
  return textura;
}

/** As texturas morrem com o palco; a próxima abertura do mapa desenha de novo. */
export function esquecerTexturasDeMoldura() {
  texturasDeMoldura.clear();
}

function desenharBarras(g: Graphics, barras: IBarraToken[], largura: number, topo: number) {
  const altura = Math.max(4, largura * 0.07);
  barras.forEach((barra, i) => {
    const y = topo - (i + 1) * (altura + 2);
    const fracao = barra.fracao ?? (barra.maximo ? Math.max(0, Math.min(1, (barra.atual ?? 0) / barra.maximo)) : 0);
    g.roundRect(-largura / 2, y, largura, altura, altura / 2).fill({ color: '#000000', alpha: 0.65 });
    if (fracao > 0) g.roundRect(-largura / 2, y, Math.max(altura, largura * fracao), altura, altura / 2).fill(CORES_BARRA[barra.tipo]);
  });
}

export class TokenVisual {
  readonly raiz = new Container();
  private retrato = new Container();
  private moldura = new Sprite();
  private barras = new Graphics();
  private marcas = new Graphics();
  private vez = new Graphics();
  private condicoes = new Container();
  private nome: Text;
  dados: ITokenMapa;
  private lado = 100;
  private texturaAtual: Texture | null = null;
  private selecionado = false;
  private naVez = false;

  constructor(dados: ITokenMapa, tamanhoQuadrado: number) {
    this.dados = dados;
    this.nome = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '600', fill: '#ffffff', stroke: { color: '#000000', width: 4 } } });
    this.nome.anchor.set(0.5, 0);
    this.moldura.anchor.set(0.5);
    this.raiz.addChild(this.vez, this.retrato, this.moldura, this.marcas, this.barras, this.condicoes, this.nome);
    this.raiz.eventMode = 'static';
    this.raiz.label = dados.id;
    this.atualizar(dados, tamanhoQuadrado);
  }

  private get raioRetrato() {
    return this.lado * ESCALA_QUADRO * RAIO_RETRATO;
  }

  /** Redesenha tudo a partir dos dados; a posição só muda se `posicionar`. */
  atualizar(dados: ITokenMapa, tamanhoQuadrado: number, posicionar = true) {
    this.dados = dados;
    this.lado = Math.max(20, dados.porte * tamanhoQuadrado);
    if (posicionar) this.raiz.position.set(dados.x, dados.y);
    this.raiz.alpha = dados.oculto ? 0.45 : 1;
    this.raiz.cursor = dados.pode_mover ? 'grab' : 'pointer';

    this.desenharRetrato();
    this.moldura.texture = texturaDaMoldura(dados.moldura ?? 'lado', dados.nivel, dados.lado);
    this.moldura.width = this.lado * ESCALA_QUADRO;
    this.moldura.height = this.lado * ESCALA_QUADRO;
    this.barras.clear();
    desenharBarras(this.barras, dados.barras, this.lado * 0.9, -this.lado * 0.52);

    this.nome.text = dados.nome;
    this.nome.style.fontSize = Math.max(11, this.lado * 0.16);
    this.nome.y = this.lado * 0.56;
    this.desenharCondicoes();
    this.desenharMarcas();
  }

  private desenharCondicoes() {
    this.condicoes.removeChildren().forEach((filho) => filho.destroy());
    const raio = Math.max(7, this.lado * 0.11);
    const lista = this.dados.condicoes.slice(0, 4);
    lista.forEach((nome, i) => {
      const bolinha = new Container();
      bolinha.addChild(new Graphics().circle(0, 0, raio).fill('#2b2236').stroke({ width: Math.max(1, raio * 0.18), color: '#fcd34d' }));
      const sigla = new Text({ text: siglaDaCondicao(nome), style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: raio * 1.05, fill: '#fde68a' } });
      sigla.anchor.set(0.5);
      bolinha.addChild(sigla);
      // Em arco, do alto à direita para baixo.
      const angulo = -Math.PI / 4 + i * (Math.PI / 6);
      bolinha.position.set(Math.cos(angulo) * this.lado * 0.6, Math.sin(angulo) * this.lado * 0.6);
      this.condicoes.addChild(bolinha);
    });
    if (this.dados.condicoes.length > lista.length) {
      const mais = new Text({ text: `+${this.dados.condicoes.length - lista.length}`, style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: raio * 1.1, fill: '#fde68a', stroke: { color: '#000000', width: 3 } } });
      mais.anchor.set(0, 0.5);
      mais.position.set(this.lado * 0.62, this.lado * 0.4);
      this.condicoes.addChild(mais);
    }
  }

  private desenharRetrato() {
    this.retrato.removeChildren().forEach((filho) => filho.destroy());
    const raio = this.raioRetrato;
    const fundo = new Graphics().circle(0, 0, raio).fill('#1b1b24');
    this.retrato.addChild(fundo);
    if (this.texturaAtual) {
      const foto = new Sprite(this.texturaAtual);
      foto.anchor.set(0.5);
      foto.width = raio * 2;
      foto.height = raio * 2;
      this.retrato.addChild(foto);
      return;
    }
    const cor = this.dados.desconhecido ? '#2a2333' : CORES_LADO[this.dados.lado];
    fundo.clear().circle(0, 0, raio).fill({ color: cor, alpha: 0.35 }).circle(0, 0, raio * 0.92).fill('#16131d');
    const texto = new Text({
      text: this.dados.desconhecido ? '?' : iniciais(this.dados.nome),
      style: { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: Math.max(10, raio * 0.75), fill: cor },
    });
    texto.anchor.set(0.5);
    this.retrato.addChild(texto);
  }

  /** O retrato chega depois (carregado à parte); null volta para as iniciais. */
  definirRetrato(textura: Texture | null) {
    if (this.texturaAtual === textura) return;
    this.texturaAtual = textura;
    this.desenharRetrato();
  }

  definirSelecionado(sim: boolean) {
    if (this.selecionado === sim) return;
    this.selecionado = sim;
    this.desenharMarcas();
  }

  definirVez(sim: boolean) {
    this.naVez = sim;
    this.vez.visible = sim;
  }

  /** Pulso do anel de "é a vez dele", chamado a cada quadro. */
  pulsar(tempo: number) {
    if (!this.naVez) return;
    this.vez.clear();
    const alcance = this.lado * 0.62 + this.lado * 0.05 * Math.sin(tempo / 220);
    this.vez.circle(0, 0, alcance).stroke({ width: Math.max(3, this.lado * 0.05), color: '#fcd34d', alpha: 0.75 });
  }

  private desenharMarcas() {
    this.marcas.clear();
    if (this.selecionado) {
      this.marcas.circle(0, 0, this.lado * 0.6).stroke({ width: Math.max(2, this.lado * 0.03), color: '#ffffff', alpha: 0.9 });
    }
  }

  destruir() {
    this.raiz.destroy({ children: true });
  }
}
