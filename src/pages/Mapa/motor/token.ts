// Desenho de um token: retrato redondo (ou iniciais), moldura, barras, nome e
// marcas de seleção e de vez. A moldura de personagem é a mesma escada do
// retrato da ficha (muda a cada 5 níveis até o 500); os outros tokens ganham
// um aro na cor do lado (jogador, aliado, inimigo, neutro).

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { molduraDoRetrato, type FormaJoia } from '../../Ficha/utils/retrato';
import type { IBarraToken, ITokenMapa, LadoToken } from '../../../services/mapaApi';
import { iniciais } from './geometria';

export const CORES_LADO: Record<LadoToken, string> = {
  jogador: '#4fd1c5',
  aliado: '#34d399',
  inimigo: '#ef4444',
  neutro: '#a0a0b8',
};

const CORES_BARRA: Record<IBarraToken['tipo'], string> = {
  vida: '#e5484d',
  mana: '#3e63dd',
  estamina: '#30a46c',
  sanidade: '#8e4ec6',
};

// Posição de cada joia, na mesma ordem do retrato da ficha.
const ANGULOS_JOIAS = [-135, -45, 135, 45, -90, 90, 180, 0].map((g) => (g * Math.PI) / 180);

function joia(g: Graphics, forma: FormaJoia, x: number, y: number, r: number, cor: string) {
  switch (forma) {
    case 'circulo':
      g.circle(x, y, r * 0.8);
      break;
    case 'estrela': {
      const pontos: number[] = [];
      for (let i = 0; i < 10; i++) {
        const raio = i % 2 === 0 ? r * 1.15 : r * 0.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pontos.push(x + Math.cos(a) * raio, y + Math.sin(a) * raio);
      }
      g.poly(pontos);
      break;
    }
    case 'hexagono': {
      const pontos: number[] = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        pontos.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.poly(pontos);
      break;
    }
    case 'cruz':
      g.rect(x - r * 0.3, y - r, r * 0.6, r * 2).rect(x - r, y - r * 0.3, r * 2, r * 0.6);
      break;
    default:
      g.poly([x, y - r, x + r * 0.75, y, x, y + r, x - r * 0.75, y]);
  }
  g.fill(cor).stroke({ width: Math.max(1, r * 0.25), color: '#120e18' });
}

function desenharMoldura(g: Graphics, raio: number, nivel: number | null, lado: LadoToken) {
  const espessura = Math.max(3, raio * 0.12);
  if (nivel === null) {
    g.circle(0, 0, raio + espessura / 2).stroke({ width: espessura, color: CORES_LADO[lado] });
    g.circle(0, 0, raio + espessura).stroke({ width: Math.max(1, espessura * 0.25), color: '#0b0b10', alpha: 0.8 });
    return;
  }
  const estilo = molduraDoRetrato(nivel);
  g.circle(0, 0, raio + espessura * 1.6).stroke({ width: espessura * 1.2, color: estilo.brilho });
  g.circle(0, 0, raio + espessura / 2).stroke({ width: espessura, color: estilo.fio });
  g.circle(0, 0, raio + espessura * 0.1).stroke({ width: Math.max(1, espessura * 0.35), color: estilo.fio2 });
  if (estilo.aro) g.circle(0, 0, raio + espessura * 1.35).stroke({ width: Math.max(1, espessura * 0.3), color: estilo.fio2 });
  for (let i = 0; i < estilo.aroExtra; i++) {
    g.circle(0, 0, raio + espessura * (1.9 + i * 0.5)).stroke({ width: Math.max(1, espessura * 0.25), color: estilo.fio, alpha: 0.85 });
  }
  // O lado aparece num fio fino por dentro, para distinguir aliado de inimigo de longe.
  g.circle(0, 0, raio - espessura * 0.25).stroke({ width: Math.max(1, espessura * 0.3), color: CORES_LADO[lado], alpha: 0.9 });
  ANGULOS_JOIAS.slice(0, estilo.joias).forEach((angulo) => {
    joia(g, estilo.forma, Math.cos(angulo) * (raio + espessura / 2), Math.sin(angulo) * (raio + espessura / 2), espessura * 0.9, estilo.fio2);
  });
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
  private moldura = new Graphics();
  private barras = new Graphics();
  private marcas = new Graphics();
  private vez = new Graphics();
  private nome: Text;
  private condicoes: Text;
  dados: ITokenMapa;
  private lado = 100;
  private texturaAtual: Texture | null = null;
  private selecionado = false;
  private naVez = false;

  constructor(dados: ITokenMapa, tamanhoQuadrado: number) {
    this.dados = dados;
    this.nome = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '600', fill: '#ffffff', stroke: { color: '#000000', width: 4 } } });
    this.nome.anchor.set(0.5, 0);
    this.condicoes = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontWeight: '700', fill: '#fde68a', stroke: { color: '#000000', width: 3 } } });
    this.condicoes.anchor.set(0, 1);
    this.raiz.addChild(this.vez, this.retrato, this.moldura, this.marcas, this.barras, this.nome, this.condicoes);
    this.raiz.eventMode = 'static';
    this.raiz.label = dados.id;
    this.atualizar(dados, tamanhoQuadrado);
  }

  /** Redesenha tudo a partir dos dados; a posição só muda se `posicionar`. */
  atualizar(dados: ITokenMapa, tamanhoQuadrado: number, posicionar = true) {
    this.dados = dados;
    this.lado = Math.max(20, dados.porte * tamanhoQuadrado);
    const raio = this.lado / 2 - Math.max(3, this.lado * 0.06);
    if (posicionar) this.raiz.position.set(dados.x, dados.y);
    this.raiz.alpha = dados.oculto ? 0.45 : 1;
    this.raiz.cursor = dados.pode_mover ? 'grab' : 'pointer';

    this.desenharRetrato(raio);
    this.moldura.clear();
    desenharMoldura(this.moldura, raio, dados.nivel, dados.lado);
    this.barras.clear();
    desenharBarras(this.barras, dados.barras, this.lado * 0.9, -this.lado / 2 - 4);

    this.nome.text = dados.nome;
    this.nome.style.fontSize = Math.max(11, this.lado * 0.16);
    this.nome.y = this.lado / 2 + 2;
    this.condicoes.text = dados.condicoes.length ? `✦${dados.condicoes.length}` : '';
    this.condicoes.style.fontSize = Math.max(10, this.lado * 0.15);
    this.condicoes.position.set(this.lado * 0.32, -this.lado * 0.3);
    this.desenharMarcas();
  }

  private desenharRetrato(raio: number) {
    this.retrato.removeChildren().forEach((filho) => filho.destroy());
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
    this.desenharRetrato(this.lado / 2 - Math.max(3, this.lado * 0.06));
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
    const alcance = this.lado / 2 + this.lado * (0.12 + 0.05 * Math.sin(tempo / 220));
    this.vez.circle(0, 0, alcance).stroke({ width: Math.max(3, this.lado * 0.05), color: '#fcd34d', alpha: 0.75 });
  }

  private desenharMarcas() {
    this.marcas.clear();
    if (this.selecionado) {
      this.marcas.circle(0, 0, this.lado / 2 + this.lado * 0.08).stroke({ width: Math.max(2, this.lado * 0.03), color: '#ffffff', alpha: 0.9 });
    }
  }

  destruir() {
    this.raiz.destroy({ children: true });
  }
}
