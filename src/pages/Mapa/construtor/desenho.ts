// O desenho de um pedaço do mapa montado: chão, sombra das paredes, paredes e janelas. É a
// mesma função para o editor (pedaços em meia resolução) e para publicar (ladrilhos de
// 1024 px do acervo), então o que o Mestre vê é o que a mesa recebe. As portas não entram
// aqui: elas são a parte viva da cena (motor/aberturas.ts), desenhadas por cima.

import {
  camadaDe, chaveDaImagem, espessuraDaParede, lerAresta, pecasEmOrdem, trechosDeParede, VAZIO,
  type IConteudoProjeto, type IPecaProjeto, type MaterialChao, type MaterialParede,
} from './projeto';
import { LADO_TEXTURA, texturaDaParede, texturaDoChao } from './materiais';

type Contexto = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface IRegiao {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COR_VAZIO = '#121016';
/** Um ladrilho de textura cobre duas casas do mapa. */
const CASAS_POR_TEXTURA = 2;

const padroes = new WeakMap<Contexto, Map<string, CanvasPattern>>();

function padrao(ctx: Contexto, chave: string, fonte: CanvasImageSource, escalaMundo: number, girar = false): CanvasPattern | string {
  let deste = padroes.get(ctx);
  if (!deste) {
    deste = new Map();
    padroes.set(ctx, deste);
  }
  const chaveCompleta = `${chave}|${escalaMundo}|${girar}`;
  let achado = deste.get(chaveCompleta);
  if (!achado) {
    achado = ctx.createPattern(fonte, 'repeat') ?? undefined;
    if (!achado) return '#555';
    const matriz = new DOMMatrix().scale(escalaMundo, escalaMundo);
    // Parede em pé: os tijolos acompanham o comprimento dela.
    achado.setTransform(girar ? matriz.rotate(90) : matriz);
    deste.set(chaveCompleta, achado);
  }
  return achado;
}

/** Desenha a região (em px do mapa) no contexto, com a escala pedida (1 para publicar). */
export function desenharTrecho(
  ctx: Contexto,
  conteudo: IConteudoProjeto,
  casa: number,
  regiao: IRegiao,
  escala: number,
  imagensPecas: Map<string, CanvasImageSource> = new Map(),
) {
  ctx.save();
  ctx.setTransform(escala, 0, 0, escala, -regiao.x * escala, -regiao.y * escala);
  ctx.fillStyle = COR_VAZIO;
  ctx.fillRect(regiao.x, regiao.y, regiao.w, regiao.h);

  const escalaTextura = (casa * CASAS_POR_TEXTURA) / LADO_TEXTURA;
  const cx0 = Math.max(0, Math.floor(regiao.x / casa) - 1);
  const cy0 = Math.max(0, Math.floor(regiao.y / casa) - 1);
  const cx1 = Math.min(conteudo.chao[0]?.length ?? 0, Math.ceil((regiao.x + regiao.w) / casa) + 1);
  const cy1 = Math.min(conteudo.chao.length, Math.ceil((regiao.y + regiao.h) / casa) + 1);

  // Chão: um caminho por material, casa por casa (com meio pixel de folga para não abrir fresta).
  const porMaterial = new Map<string, Array<[number, number]>>();
  for (let y = cy0; y < cy1; y++) {
    const linha = conteudo.chao[y];
    for (let x = cx0; x < cx1; x++) {
      const letra = linha[x];
      if (letra === VAZIO) continue;
      if (!porMaterial.has(letra)) porMaterial.set(letra, []);
      porMaterial.get(letra)!.push([x, y]);
    }
  }
  const folga = 0.5 / escala;
  for (const [letra, casas] of porMaterial) {
    ctx.fillStyle = padrao(ctx, `chao:${letra}`, texturaDoChao(letra as MaterialChao), escalaTextura);
    ctx.beginPath();
    for (const [x, y] of casas) ctx.rect(x * casa - folga, y * casa - folga, casa + folga * 2, casa + folga * 2);
    ctx.fill();
  }

  // As peças do chão e dos objetos ficam embaixo das paredes; as do alto, por cima de tudo.
  desenharPecas(ctx, pecasEmOrdem(conteudo).filter((peca) => camadaDe(peca) !== 'alto'), casa, regiao, imagensPecas);

  const margem = casa;
  const visiveis = trechosDeParede(conteudo).filter(({ trecho: [x1, y1, x2, y2] }) => (
    Math.max(x1, x2) * casa >= regiao.x - margem && Math.min(x1, x2) * casa <= regiao.x + regiao.w + margem
    && Math.max(y1, y2) * casa >= regiao.y - margem && Math.min(y1, y2) * casa <= regiao.y + regiao.h + margem
  ));

  // Sombra das paredes no chão (a sombra do canvas é em pixels da tela, por isso vezes a escala).
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = casa * 0.22 * escala;
  ctx.shadowOffsetX = casa * 0.04 * escala;
  ctx.shadowOffsetY = casa * 0.07 * escala;
  for (const { trecho, material } of visiveis) {
    if (material === 'cerca') continue;
    tracarParede(ctx, trecho, material, casa);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = espessuraDaParede(material) * casa;
    ctx.stroke();
  }
  ctx.restore();

  for (const { trecho, material } of visiveis) desenharParede(ctx, trecho, material, casa, escalaTextura);
  desenharJanelas(ctx, conteudo, casa, regiao, margem);
  desenharSoleiras(ctx, conteudo, casa);
  desenharPecas(ctx, pecasEmOrdem(conteudo).filter((peca) => camadaDe(peca) === 'alto'), casa, regiao, imagensPecas);
  ctx.restore();
}

function desenharPecas(ctx: Contexto, pecas: IPecaProjeto[], casa: number, regiao: IRegiao, imagensPecas: Map<string, CanvasImageSource>) {
  for (const peca of pecas) {
    const imagem = imagensPecas.get(chaveDaImagem(peca));
    const proporcao = peca.imagem_altura / peca.imagem_largura;
    const largura = peca.escala * casa;
    const altura = largura * proporcao;
    const raio = Math.hypot(largura, altura) / 2;
    if (peca.x * casa + raio < regiao.x || peca.x * casa - raio > regiao.x + regiao.w
      || peca.y * casa + raio < regiao.y || peca.y * casa - raio > regiao.y + regiao.h) continue;
    ctx.save();
    ctx.translate(peca.x * casa, peca.y * casa);
    ctx.rotate((peca.rotacao * Math.PI) / 180);
    ctx.scale(peca.espelhada ? -1 : 1, 1);
    if (imagem) {
      ctx.drawImage(imagem, -largura / 2, -altura / 2, largura, altura);
    } else {
      // Ajuda a localizar uma referência que ficou indisponível no Acervo.
      ctx.fillStyle = 'rgba(248, 113, 113, 0.25)';
      ctx.fillRect(-largura / 2, -altura / 2, largura, altura);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = Math.max(2, casa * 0.025);
      ctx.strokeRect(-largura / 2, -altura / 2, largura, altura);
      ctx.beginPath();
      ctx.moveTo(-largura / 2, -altura / 2);
      ctx.lineTo(largura / 2, altura / 2);
      ctx.moveTo(largura / 2, -altura / 2);
      ctx.lineTo(-largura / 2, altura / 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** O caminho da parede: reto para pedra, tijolo e madeira; com a borda irregular na rocha. */
function tracarParede(ctx: Contexto, [x1, y1, x2, y2]: [number, number, number, number], material: MaterialParede, casa: number) {
  ctx.beginPath();
  ctx.lineCap = material === 'caverna' || material === 'sebe' ? 'round' : 'square';
  ctx.lineJoin = 'round';
  if (material !== 'caverna') {
    ctx.moveTo(x1 * casa, y1 * casa);
    ctx.lineTo(x2 * casa, y2 * casa);
    return;
  }
  // Rocha: o meio da parede desvia um pouco para os lados, sempre do mesmo jeito no mesmo lugar.
  const passos = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) * 4));
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    const x = (x1 + (x2 - x1) * t) * casa;
    const y = (y1 + (y2 - y1) * t) * casa;
    const ponta = i === 0 || i === passos;
    const desvio = ponta ? 0 : (Math.sin(x * 0.131 + y * 0.173) + Math.sin(x * 0.047 - y * 0.061)) * casa * 0.035;
    const px = y1 === y2 ? x : x + desvio;
    const py = y1 === y2 ? y + desvio : y;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

function desenharParede(
  ctx: Contexto, trecho: [number, number, number, number], material: MaterialParede, casa: number, escalaTextura: number,
) {
  const [x1, y1, x2, y2] = trecho;
  const espessura = espessuraDaParede(material) * casa;
  const emPe = x1 === x2;
  if (material === 'cerca') {
    desenharCerca(ctx, trecho, casa, escalaTextura);
    return;
  }
  if (material === 'sebe') {
    // Sebe: moitas redondas uma ao lado da outra.
    ctx.fillStyle = padrao(ctx, 'parede:sebe', texturaDaParede('sebe'), escalaTextura * 0.6);
    const comprimento = Math.hypot(x2 - x1, y2 - y1);
    const moitas = Math.max(2, Math.round(comprimento * 2.5));
    for (let i = 0; i <= moitas; i++) {
      const t = i / moitas;
      const x = (x1 + (x2 - x1) * t) * casa;
      const y = (y1 + (y2 - y1) * t) * casa;
      const raio = espessura * (0.48 + 0.08 * Math.sin(x * 0.2 + y * 0.3));
      ctx.beginPath();
      ctx.arc(x, y, raio, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10, 25, 8, 0.55)';
      ctx.lineWidth = casa * 0.015;
      ctx.stroke();
    }
    return;
  }
  tracarParede(ctx, trecho, material, casa);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = espessura + casa * 0.03;
  ctx.stroke();
  ctx.strokeStyle = padrao(ctx, `parede:${material}`, texturaDaParede(material), escalaTextura * 0.5, emPe);
  ctx.lineWidth = espessura;
  ctx.stroke();
  // Um fio de luz no meio dá a ideia de topo de parede.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = espessura * 0.35;
  ctx.stroke();
}

function desenharCerca(ctx: Contexto, [x1, y1, x2, y2]: [number, number, number, number], casa: number, escalaTextura: number) {
  const madeira = padrao(ctx, 'parede:cerca', texturaDaParede('cerca'), escalaTextura * 0.4);
  ctx.lineCap = 'butt';
  for (const desvio of [-0.05, 0.05]) {
    ctx.beginPath();
    const ox = y1 === y2 ? 0 : desvio * casa;
    const oy = y1 === y2 ? desvio * casa : 0;
    ctx.moveTo(x1 * casa + ox, y1 * casa + oy);
    ctx.lineTo(x2 * casa + ox, y2 * casa + oy);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = casa * 0.05;
    ctx.stroke();
    ctx.strokeStyle = madeira;
    ctx.lineWidth = casa * 0.035;
    ctx.stroke();
  }
  // Um mourão por canto da grade.
  const passos = Math.round(Math.hypot(x2 - x1, y2 - y1));
  for (let i = 0; i <= passos; i++) {
    const x = (x1 + ((x2 - x1) * i) / Math.max(1, passos)) * casa;
    const y = (y1 + ((y2 - y1) * i) / Math.max(1, passos)) * casa;
    const lado = casa * 0.13;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - lado / 2 - 1, y - lado / 2 - 1, lado + 2, lado + 2);
    ctx.fillStyle = madeira;
    ctx.fillRect(x - lado / 2, y - lado / 2, lado, lado);
  }
}

function desenharJanelas(ctx: Contexto, conteudo: IConteudoProjeto, casa: number, regiao: IRegiao, margem: number) {
  for (const [chave, abertura] of Object.entries(conteudo.aberturas)) {
    if (abertura.tipo !== 'janela') continue;
    const { eixo, x, y } = lerAresta(chave);
    const meioX = (eixo === 'h' ? x + 0.5 : x) * casa;
    const meioY = (eixo === 'h' ? y : y + 0.5) * casa;
    if (meioX < regiao.x - margem || meioX > regiao.x + regiao.w + margem || meioY < regiao.y - margem || meioY > regiao.y + regiao.h + margem) continue;
    const material = conteudo.paredes[chave] ?? 'pedra';
    const espessura = espessuraDaParede(material) * casa;
    const comprimento = casa * 0.7;
    const largura = Math.max(casa * 0.06, espessura * 0.5);
    ctx.save();
    ctx.translate(meioX, meioY);
    if (eixo === 'v') ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#3a2716';
    ctx.fillRect(-comprimento / 2 - casa * 0.03, -largura / 2 - casa * 0.03, comprimento + casa * 0.06, largura + casa * 0.06);
    ctx.fillStyle = 'rgba(170, 215, 245, 0.9)';
    ctx.fillRect(-comprimento / 2, -largura / 2, comprimento, largura);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(-comprimento / 2, -largura / 2, comprimento, largura * 0.3);
    ctx.fillStyle = '#3a2716';
    ctx.fillRect(-casa * 0.015, -largura / 2, casa * 0.03, largura);
    ctx.restore();
  }
}

/** O vão de cada porta ganha uma soleira; a porta em si é desenhada viva por cima, na mesa. */
function desenharSoleiras(ctx: Contexto, conteudo: IConteudoProjeto, casa: number) {
  ctx.fillStyle = 'rgba(20, 14, 10, 0.45)';
  for (const [chave, abertura] of Object.entries(conteudo.aberturas)) {
    if (abertura.tipo !== 'porta') continue;
    const { eixo, x, y } = lerAresta(chave);
    const espessura = espessuraDaParede(conteudo.paredes[chave] ?? 'pedra') * casa * 0.55;
    if (eixo === 'h') ctx.fillRect(x * casa, y * casa - espessura / 2, casa, espessura);
    else ctx.fillRect(x * casa - espessura / 2, y * casa, espessura, casa);
  }
}
