// Os mapas colocados na cena: cada um é um objeto com lugar, tamanho e ordem, desenhado em
// ladrilhos como o mapa base (versão em 1/4 de longe, ladrilho cheio de perto). Com a névoa, cada
// mapa baixa só os ladrilhos que o servidor liberou para ele. O Mestre seleciona, arrasta, puxa os
// cantos e gira pela alça de cima; o desenho da seleção mora numa camada própria, por cima dos tokens.

import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { IMapaColocado } from '../../../services/mapaApi';
import { urlPedaco } from '../../../services/mapaApi';
import { LADO_LADRILHO } from './geometria';
import { chavesDoFundo, detalheSempre } from './nevoaGeometria';
import { cantosDoMapa, liberadosDoMapa, paraODesenho, pontoDaAlcaDeGiro } from './mapasColocadosConta';

/** Com a tela mais perto que isso (escala da tela vezes a do mapa), vêm os ladrilhos cheios. */
const ZOOM_DETALHE = 0.3;
const COR_SELECAO = 0xc7a44c;
const COR_TRANCADO = 0x8b8799;
const LADO_AGARRE_PX = 11;
const RAIO_ALCA_PX = 12;

async function texturaDe(url: string): Promise<Texture> {
  const resposta = await fetch(url, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`imagem ${resposta.status}`);
  return Texture.from(await createImageBitmap(await resposta.blob()));
}

/** Um mapa na tela: a imagem em ladrilhos, dentro de um contêiner que leva o lugar e a escala dele. */
class MapaVisual {
  readonly raiz = new Container();
  private readonly placa = new Graphics();
  private readonly base = new Container();
  private readonly detalhe = new Container();
  private pedidosBase = new Set<string>();
  private pedidosDetalhe = new Set<string>();
  private vivo = true;
  dados: IMapaColocado;
  liberados: Set<string> | null;

  constructor(dados: IMapaColocado, liberados: Set<string> | null) {
    this.dados = dados;
    this.liberados = liberados;
    this.raiz.addChild(this.placa, this.base, this.detalhe);
    this.aplicar(dados, liberados);
  }

  /** Atualiza lugar, escala e transparência; mapa escondido dos jogadores aparece apagado só para o Mestre. */
  aplicar(dados: IMapaColocado, liberados: Set<string> | null) {
    const mudouImagem = dados.imagem_id !== this.dados.imagem_id;
    this.dados = dados;
    this.liberados = liberados;
    if (mudouImagem) {
      this.base.removeChildren().forEach((filho) => filho.destroy());
      this.detalhe.removeChildren().forEach((filho) => filho.destroy());
      this.pedidosBase.clear();
      this.pedidosDetalhe.clear();
    }
    this.posicionar(dados);
    this.raiz.alpha = dados.visivel === false ? 0.4 : 1;
    this.placa.clear().rect(0, 0, dados.largura, dados.altura).fill({ color: 0x15131c });
  }

  /** Lugar, escala e giro: o mapa gira em torno do centro, então o pivô é o meio do desenho e a posição é o centro na cena. */
  posicionar(dados: Pick<IMapaColocado, 'x' | 'y' | 'escala' | 'largura' | 'altura' | 'rotacao'>) {
    this.raiz.pivot.set(dados.largura / 2, dados.altura / 2);
    this.raiz.position.set(dados.x + (dados.largura * dados.escala) / 2, dados.y + (dados.altura * dados.escala) / 2);
    this.raiz.scale.set(dados.escala);
    this.raiz.rotation = ((dados.rotacao ?? 0) * Math.PI) / 180;
  }

  async carregarBase() {
    const { chaves, escala } = chavesDoFundo(this.dados.chaves, this.liberados);
    const imagem = this.dados.imagem_id;
    const novas = chaves.filter((chave) => !this.pedidosBase.has(chave));
    for (const chave of novas) this.pedidosBase.add(chave);
    await Promise.all(novas.map(async (chave) => {
      try {
        const textura = await texturaDe(urlPedaco(imagem, chave));
        if (!this.vivo || this.dados.imagem_id !== imagem) return;
        const [, coluna, linha] = chave.split('/').map(Number);
        const sprite = new Sprite(textura);
        sprite.position.set(coluna * LADO_LADRILHO * escala, linha * LADO_LADRILHO * escala);
        sprite.scale.set(escala);
        this.base.addChild(sprite);
        if (escala === 1) this.pedidosDetalhe.add(chave);
      } catch {
        // O ladrilho que não veio pode ser pedido de novo; o fundo escuro fica no lugar.
        this.pedidosBase.delete(chave);
      }
    }));
  }

  /** Ladrilhos cheios do pedaço que está na tela, só quando a tela está perto (ou a névoa segurou a versão reduzida). */
  async carregarDetalhe(visivel: Rectangle, zoomDaTela: number) {
    const { chaves, imagem_id: imagem, escala } = this.dados;
    if (!chaves.some((chave) => chave.startsWith('n2/'))) return;
    const perto = zoomDaTela * escala >= ZOOM_DETALHE;
    if (!perto && !this.liberados) return;
    // A tela, nas coordenadas do desenho do mapa (com o mapa girado, a caixa dos quatro cantos da tela).
    const cantosDaTela = [
      { x: visivel.left, y: visivel.top }, { x: visivel.right, y: visivel.top },
      { x: visivel.left, y: visivel.bottom }, { x: visivel.right, y: visivel.bottom },
    ].map((ponto) => paraODesenho(this.dados, ponto));
    const esquerda = Math.min(...cantosDaTela.map((p) => p.x));
    const direita = Math.max(...cantosDaTela.map((p) => p.x));
    const cima = Math.min(...cantosDaTela.map((p) => p.y));
    const baixo = Math.max(...cantosDaTela.map((p) => p.y));
    const pedidos: string[] = [];
    for (const chave of chaves) {
      if (!chave.startsWith('n0/') || this.pedidosDetalhe.has(chave)) continue;
      if (this.liberados && !this.liberados.has(chave)) continue;
      if (!perto && !detalheSempre(chave, this.liberados)) continue;
      const [, coluna, linha] = chave.split('/').map(Number);
      const x = coluna * LADO_LADRILHO;
      const y = linha * LADO_LADRILHO;
      if (x > direita || x + LADO_LADRILHO < esquerda || y > baixo || y + LADO_LADRILHO < cima) continue;
      pedidos.push(chave);
    }
    for (const chave of pedidos) this.pedidosDetalhe.add(chave);
    await Promise.all(pedidos.map(async (chave) => {
      try {
        const textura = await texturaDe(urlPedaco(imagem, chave));
        if (!this.vivo || this.dados.imagem_id !== imagem) return;
        const [, coluna, linha] = chave.split('/').map(Number);
        const sprite = new Sprite(textura);
        sprite.position.set(coluna * LADO_LADRILHO, linha * LADO_LADRILHO);
        this.detalhe.addChild(sprite);
      } catch {
        this.pedidosDetalhe.delete(chave);
      }
    }));
  }

  destruir() {
    this.vivo = false;
    this.raiz.destroy({ children: true });
  }
}

/** A camada dos mapas colocados e a seleção do Mestre (contorno e cantos para puxar). */
export class CamadaMapasColocados {
  readonly raiz = new Container();
  /** Contorno e cantos do mapa escolhido; fica por cima dos tokens. */
  readonly sobreposicao = new Graphics();
  private visuais = new Map<string, MapaVisual>();
  private mapas: IMapaColocado[] = [];
  private selecionado: string | null = null;
  private zoomDesenhado = NaN;
  private gestor = false;

  /** Recebe a lista da cena (de baixo para cima). `ladrilhos` é a lista da névoa; nula, tudo vem. */
  definir(mapas: IMapaColocado[], ladrilhos: readonly string[] | null | undefined, gestor: boolean) {
    this.gestor = gestor;
    this.mapas = mapas.map((mapa) => ({ ...mapa }));
    const ids = new Set(mapas.map((mapa) => mapa.id));
    for (const [id, visual] of this.visuais) {
      if (ids.has(id)) continue;
      visual.destruir();
      this.visuais.delete(id);
    }
    mapas.forEach((mapa, ordem) => {
      const liberados = liberadosDoMapa(ladrilhos, mapa.imagem_id);
      let visual = this.visuais.get(mapa.id);
      if (visual) visual.aplicar(mapa, liberados);
      else {
        visual = new MapaVisual(mapa, liberados);
        this.visuais.set(mapa.id, visual);
      }
      // A ordem da lista é a da pilha: o último fica por cima.
      const limite = this.raiz.children.length - (visual.raiz.parent === this.raiz ? 1 : 0);
      this.raiz.addChildAt(visual.raiz, Math.min(ordem, limite));
    });
    if (this.selecionado && !ids.has(this.selecionado)) this.selecionado = null;
    this.zoomDesenhado = NaN;
  }

  get tem(): boolean {
    return this.mapas.length > 0;
  }

  lista(): IMapaColocado[] {
    return this.mapas;
  }

  mapa(id: string): IMapaColocado | null {
    return this.mapas.find((mapa) => mapa.id === id) ?? null;
  }

  /** Busca os ladrilhos que faltam: a base de tudo e o detalhe do que está na tela. */
  async atualizar(visivel: Rectangle, zoomDaTela: number) {
    await Promise.all([...this.visuais.values()].map(async (visual) => {
      await visual.carregarBase();
      await visual.carregarDetalhe(visivel, zoomDaTela);
    }));
  }

  // ------------------------------------------------------------ seleção

  selecionar(id: string | null) {
    this.selecionado = id && this.visuais.has(id) ? id : null;
    this.zoomDesenhado = NaN;
  }

  get idSelecionado(): string | null {
    return this.selecionado;
  }

  /** Durante o arrasto o mapa anda, muda de tamanho ou gira na tela antes de o servidor responder. */
  previa(id: string, mudancas: Partial<Pick<IMapaColocado, 'x' | 'y' | 'escala' | 'rotacao'>>) {
    const visual = this.visuais.get(id);
    const indice = this.mapas.findIndex((mapa) => mapa.id === id);
    if (!visual || indice < 0) return;
    this.mapas[indice] = { ...this.mapas[indice], ...mudancas };
    // Os ladrilhos de perto seguem o lugar novo, senão o detalhe é pedido para onde o mapa estava.
    visual.dados = { ...visual.dados, ...mudancas };
    visual.posicionar(this.mapas[indice]);
    this.zoomDesenhado = NaN;
  }

  /** Redesenha o contorno quando a tela dá zoom (os cantos e a alça têm tamanho fixo na tela). */
  quadro(zoomDaTela: number) {
    if (zoomDaTela === this.zoomDesenhado) return;
    this.zoomDesenhado = zoomDaTela;
    const g = this.sobreposicao;
    g.clear();
    const mapa = this.selecionado ? this.mapas.find((m) => m.id === this.selecionado) : null;
    if (!mapa || !this.gestor) return;
    const cantos = cantosDoMapa(mapa);
    const cor = mapa.trancado ? COR_TRANCADO : COR_SELECAO;
    const fino = 2 / zoomDaTela;
    g.poly([cantos.no.x, cantos.no.y, cantos.ne.x, cantos.ne.y, cantos.se.x, cantos.se.y, cantos.so.x, cantos.so.y]).stroke({ width: fino, color: cor, alpha: 0.95 });
    if (mapa.trancado) return;

    // A alça de giro: um pino acima do meio da borda de cima, no sentido em que o mapa está virado.
    const topo = { x: (cantos.no.x + cantos.ne.x) / 2, y: (cantos.no.y + cantos.ne.y) / 2 };
    const alca = pontoDaAlcaDeGiro(mapa, zoomDaTela);
    g.moveTo(topo.x, topo.y).lineTo(alca.x, alca.y).stroke({ width: fino, color: cor, alpha: 0.9 });
    const raio = RAIO_ALCA_PX / zoomDaTela;
    g.circle(alca.x, alca.y, raio).fill({ color: 0x15131c }).stroke({ width: fino, color: cor });
    // O ícone: uma seta que dá a volta.
    const arco = (raio * 0.5);
    const inicio = -Math.PI * 0.35;
    const fim = Math.PI * 1.3;
    g.moveTo(alca.x + arco * Math.cos(inicio), alca.y + arco * Math.sin(inicio));
    g.arc(alca.x, alca.y, arco, inicio, fim).stroke({ width: 1.6 / zoomDaTela, color: 0xffffff });
    const ponta = { x: alca.x + arco * Math.cos(fim), y: alca.y + arco * Math.sin(fim) };
    const tangente = { x: -Math.sin(fim), y: Math.cos(fim) };
    const radial = { x: Math.cos(fim), y: Math.sin(fim) };
    const aresta = 3.2 / zoomDaTela;
    g.poly([
      ponta.x + tangente.x * aresta * 1.4, ponta.y + tangente.y * aresta * 1.4,
      ponta.x + radial.x * aresta, ponta.y + radial.y * aresta,
      ponta.x - radial.x * aresta, ponta.y - radial.y * aresta,
    ]).fill({ color: 0xffffff });

    // Os quatro cantos para mudar o tamanho.
    const lado = LADO_AGARRE_PX / zoomDaTela;
    for (const canto of Object.values(cantos)) {
      g.rect(canto.x - lado / 2, canto.y - lado / 2, lado, lado).fill({ color: 0xffffff }).stroke({ width: fino, color: cor });
    }
  }

  destruir() {
    for (const visual of this.visuais.values()) visual.destruir();
    this.visuais.clear();
    this.sobreposicao.destroy();
    this.raiz.destroy({ children: true });
  }
}
