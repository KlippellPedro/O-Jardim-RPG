import { marcaAstraTech } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import { escrever, escreverNoQuadro, fonte, linhaQueCabe, papelGrao, retanguloArredondado, sementeDe, traco } from '../pincel';

const LARGURA = 1400;
const ALTURA = 900;

const CARCACAS: Record<string, [string, string]> = {
  preta: ['#2b2b2e', '#111113'],
  branca: ['#ecebe6', '#bdbbb3'],
  fume: ['rgba(70, 64, 60, 0.92)', 'rgba(30, 27, 25, 0.95)'],
};

const ETIQUETAS: Record<string, string> = { creme: '#efe4c6', branca: '#f6f5f0', amarela: '#f1d873' };

const naoEhDrive = (valores: Readonly<Record<string, string>>) => valores.formato !== 'drive';
const ehCassete = (valores: Readonly<Record<string, string>>) => valores.formato === 'cassete';

function parafuso(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#9a9a9a';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
  ctx.stroke();
  ctx.restore();
}

/** Carretel com a fita enrolada: o raio da fita muda de um lado para o outro. */
function carretel(ctx: CanvasRenderingContext2D, x: number, y: number, fita: number) {
  ctx.save();
  ctx.fillStyle = '#3b2a1e';
  ctx.beginPath();
  ctx.arc(x, y, fita, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2f0ea';
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b2e';
  for (let i = 0; i < 6; i += 1) {
    const angulo = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angulo) * 20, y + Math.sin(angulo) * 20, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Pedaço de fita crepe com o recado escrito à mão. */
function fitaCrepe(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, largura: number, angulo: number) {
  if (!texto.trim()) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(232, 214, 168, 0.95)';
  ctx.beginPath();
  ctx.moveTo(-largura / 2, -38);
  for (let px = -largura / 2; px <= largura / 2; px += 14) ctx.lineTo(px, -38 + (px % 28 === 0 ? 0 : 3));
  ctx.lineTo(largura / 2, 38);
  for (let px = largura / 2; px >= -largura / 2; px -= 14) ctx.lineTo(px, 38 - (px % 28 === 0 ? 0 : 3));
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  linhaQueCabe(ctx, texto, 0, 14, { largura: largura - 40, maximo: 46, minimo: 22, cor: '#26221f', montar: (t) => fonte(ctx, 'mao', t, 600) });
  ctx.restore();
}

function etiqueta(ctx: CanvasRenderingContext2D, caixa: { x: number; y: number; largura: number; altura: number }, cor: string, faixa: string) {
  ctx.save();
  retanguloArredondado(ctx, caixa.x, caixa.y, caixa.largura, caixa.altura, 14);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.clip();
  papelGrao(ctx, caixa.x + caixa.largura, caixa.y + caixa.altura, 0.5);
  ctx.fillStyle = faixa;
  ctx.fillRect(caixa.x, caixa.y + 18, caixa.largura, 12);
  ctx.restore();
}

function cassete(ctx: CanvasRenderingContext2D, v: Readonly<Record<string, string>>) {
  const [claro, escuro] = CARCACAS[v.carcaca] ?? CARCACAS.preta;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  retanguloArredondado(ctx, 100, 70, 1200, 760, 42);
  const corpo = ctx.createLinearGradient(0, 70, 0, 830);
  corpo.addColorStop(0, claro);
  corpo.addColorStop(1, escuro);
  ctx.fillStyle = corpo;
  ctx.fill();
  ctx.restore();
  for (const [x, y] of [[150, 120], [1250, 120], [150, 780], [1250, 780], [700, 790]]) parafuso(ctx, x, y);

  etiqueta(ctx, { x: 190, y: 130, largura: 1020, altura: 440 }, ETIQUETAS[v.etiqueta] ?? ETIQUETAS.creme, '#b8372c');
  for (let y = 250; y < 400; y += 54) traco(ctx, 330, y, 1170, y, 'rgba(60, 60, 90, 0.25)', 2);
  // Lado
  ctx.save();
  ctx.strokeStyle = '#26221f';
  ctx.lineWidth = 3;
  ctx.strokeRect(220, 60 + 130, 84, 84);
  ctx.restore();
  fonte(ctx, 'titulo', 62, 700);
  escrever(ctx, (v.lado.trim() || 'A').slice(0, 2).toUpperCase(), 262, 254, 'centro', '#26221f');
  escreverNoQuadro(ctx, v.titulo, {
    x: 330, topo: 175, largura: 840, altura: 140, maximo: 76, minimo: 34, alinhamento: 'esquerda', cor: '#1f2c55', entrelinha: 1.05,
    montar: (t) => fonte(ctx, 'mao', t, 700),
  });
  linhaQueCabe(ctx, v.data, 330, 382, { largura: 840, maximo: 40, minimo: 22, alinhamento: 'esquerda', cor: '#1f2c55', montar: (t) => fonte(ctx, 'mao', t, 500) });

  // Janela com os dois carretéis
  ctx.save();
  retanguloArredondado(ctx, 440, 420, 520, 130, 60);
  ctx.fillStyle = '#1b1715';
  ctx.fill();
  ctx.clip();
  carretel(ctx, 560, 485, 96);
  carretel(ctx, 840, 485, 62);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(440, 420, 520, 40);
  ctx.restore();

  // Pé trapezoidal com os furos
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(330, 830);
  ctx.lineTo(400, 660);
  ctx.lineTo(1000, 660);
  ctx.lineTo(1070, 830);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  for (const x of [470, 600, 800, 930]) {
    ctx.beginPath();
    ctx.arc(x, 760, x === 600 || x === 800 ? 22 : 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  fitaCrepe(ctx, v.observacao, 1010, 640, 420, 0.06);
}

function vhs(ctx: CanvasRenderingContext2D, v: Readonly<Record<string, string>>) {
  const [claro, escuro] = CARCACAS[v.carcaca] ?? CARCACAS.preta;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  retanguloArredondado(ctx, 60, 150, 1280, 640, 20);
  const corpo = ctx.createLinearGradient(0, 150, 0, 790);
  corpo.addColorStop(0, claro);
  corpo.addColorStop(1, escuro);
  ctx.fillStyle = corpo;
  ctx.fill();
  ctx.restore();
  // Ranhuras
  for (let y = 680; y < 770; y += 14) traco(ctx, 110, y, 1290, y, 'rgba(255, 255, 255, 0.07)', 3);
  // Janela
  ctx.save();
  retanguloArredondado(ctx, 930, 220, 360, 230, 16);
  ctx.fillStyle = '#0d0c0b';
  ctx.fill();
  ctx.clip();
  carretel(ctx, 1030, 335, 92);
  carretel(ctx, 1200, 335, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(930, 220, 360, 70);
  ctx.restore();
  etiqueta(ctx, { x: 110, y: 210, largura: 780, altura: 360 }, ETIQUETAS[v.etiqueta] ?? ETIQUETAS.branca, '#24407a');
  for (let y = 330; y < 540; y += 56) traco(ctx, 140, y, 860, y, 'rgba(60, 60, 90, 0.22)', 2);
  escreverNoQuadro(ctx, v.titulo, {
    x: 150, topo: 250, largura: 700, altura: 150, maximo: 74, minimo: 32, cor: '#1f2c55', entrelinha: 1.05,
    montar: (t) => fonte(ctx, 'mao', t, 700),
  });
  linhaQueCabe(ctx, v.data, 150, 470, { largura: 700, maximo: 40, minimo: 22, alinhamento: 'esquerda', cor: '#1f2c55', montar: (t) => fonte(ctx, 'mao', t, 500) });
  // Lingueta de gravação
  ctx.fillStyle = '#000';
  ctx.fillRect(60, 600, 34, 50);
  fitaCrepe(ctx, v.observacao, 1080, 560, 400, -0.05);
}

function drive(ctx: CanvasRenderingContext2D, v: Readonly<Record<string, string>>) {
  const semente = sementeDe(v.titulo);
  // Conector
  ctx.save();
  const prata = ctx.createLinearGradient(0, 370, 0, 530);
  prata.addColorStop(0, '#e9edf2');
  prata.addColorStop(0.5, '#9aa3ae');
  prata.addColorStop(1, '#d8dde3');
  ctx.fillStyle = prata;
  ctx.fillRect(1080, 380, 230, 140);
  ctx.fillStyle = '#2a2e35';
  ctx.fillRect(1180, 410, 40, 30);
  ctx.fillRect(1180, 460, 40, 30);
  ctx.restore();
  // Corpo
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  retanguloArredondado(ctx, 160, 320, 940, 260, 70);
  const corpo = ctx.createLinearGradient(0, 320, 0, 580);
  corpo.addColorStop(0, '#2a3346');
  corpo.addColorStop(1, '#090d15');
  ctx.fillStyle = corpo;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = '#38b6ff';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#38b6ff';
  ctx.beginPath();
  ctx.arc(250, 450, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(160, 316, 940, 4);
  ctx.restore();
  // Argola
  ctx.save();
  ctx.strokeStyle = '#b9c0c8';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(150, 450, 70, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
  // Faixa com o nome
  retanguloArredondado(ctx, 320, 380, 730, 140, 16);
  ctx.fillStyle = 'rgba(232, 240, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110, 170, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  linhaQueCabe(ctx, v.titulo, 350, 450, {
    largura: 670, maximo: 44, minimo: 20, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  linhaQueCabe(ctx, `${v.data} · ${(semente % 900 + 100)} GB`, 350, 494, {
    largura: 670, maximo: 26, minimo: 16, alinhamento: 'esquerda', cor: '#8ba1c4', montar: (t) => fonte(ctx, 'digital', t),
  });
  ctx.save();
  ctx.globalAlpha = 0.7;
  marcaAstraTech(ctx, 700, 552, 22, '#8ba1c4');
  ctx.restore();
  fitaCrepe(ctx, v.observacao, 560, 240, 460, -0.06);
}

export const fita: IModeloDeDocumento = {
  id: 'fita',
  nome: 'Fita gravada',
  categoria: 'Objetos',
  icone: 'fita',
  descricao: 'Fita cassete ou VHS com etiqueta escrita à mão, ou um pen drive da AstraTech. Boa para gravação, depoimento e prova.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 140, altura: 90 },
  campoDoTitulo: 'titulo',
  campos: [
    {
      id: 'formato', rotulo: 'Formato', tipo: 'escolha', padrao: 'cassete',
      opcoes: [{ valor: 'cassete', rotulo: 'Cassete' }, { valor: 'vhs', rotulo: 'VHS' }, { valor: 'drive', rotulo: 'Pen drive AstraTech' }],
    },
    { id: 'titulo', rotulo: 'Escrito na etiqueta', tipo: 'texto', padrao: 'Interrogatório 3', maximo: 50 },
    { id: 'lado', rotulo: 'Lado', tipo: 'texto', padrao: 'A', maximo: 2, visivel: ehCassete },
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'Noite de 14 de outono', maximo: 40 },
    { id: 'observacao', rotulo: 'Recado na fita crepe', tipo: 'texto', padrao: 'não ouvir sozinho', maximo: 40, dica: 'Deixe vazio para tirar a fita crepe.' },
    {
      id: 'carcaca', rotulo: 'Carcaça', tipo: 'escolha', padrao: 'preta', visivel: naoEhDrive,
      opcoes: [{ valor: 'preta', rotulo: 'Preta' }, { valor: 'branca', rotulo: 'Branca' }, { valor: 'fume', rotulo: 'Fumê' }],
    },
    {
      id: 'etiqueta', rotulo: 'Etiqueta', tipo: 'escolha', padrao: 'creme', visivel: naoEhDrive,
      opcoes: [{ valor: 'creme', rotulo: 'Creme' }, { valor: 'branca', rotulo: 'Branca' }, { valor: 'amarela', rotulo: 'Amarela' }],
    },
  ],
  desenhar: ({ ctx }, v) => {
    if (v.formato === 'vhs') vhs(ctx, v);
    else if (v.formato === 'drive') drive(ctx, v);
    else cassete(ctx, v);
  },
};
