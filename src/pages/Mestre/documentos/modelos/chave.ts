import { codigoQr, marcaAstraTech, pilula } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import { escreverNoQuadro, fonte, linhaQueCabe, papel, retanguloArredondado, sementeDe, traco } from '../pincel';

const LARGURA = 1400;
const ALTURA = 800;

const METAIS: Record<string, [string, string, string]> = {
  ferro: ['#a4aab2', '#5d636b', '#2a2e33'],
  latao: ['#f3d98a', '#c49a3c', '#6b4c12'],
  prata: ['#f4f6f8', '#b9c0c8', '#68707a'],
};

const BARBANTES: Record<string, string> = { vermelho: '#9b2a22', cru: '#cdb88f', preto: '#26221f' };

const ehCartao = (valores: Readonly<Record<string, string>>) => valores.tipo === 'cartao';
const ehChave = (valores: Readonly<Record<string, string>>) => valores.tipo !== 'cartao';

/** Gradiente de cilindro: claro em cima, escuro embaixo, como metal redondo. */
function metal(ctx: CanvasRenderingContext2D, topo: number, base: number, cores: [string, string, string]) {
  const gradiente = ctx.createLinearGradient(0, topo, 0, base);
  gradiente.addColorStop(0, cores[1]);
  gradiente.addColorStop(0.25, cores[0]);
  gradiente.addColorStop(0.6, cores[1]);
  gradiente.addColorStop(1, cores[2]);
  return gradiente;
}

/** A chave deitada, com a argola em (330, 260). Devolve o ponto por onde passa o barbante. */
function desenharChave(ctx: CanvasRenderingContext2D, tipo: string, cores: [string, string, string]): [number, number] {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.strokeStyle = cores[2];
  ctx.lineWidth = 3;
  ctx.beginPath();
  let furo: [number, number] = [330, 330];
  let buraco: [number, number, number] = [330, 260, 80];
  if (tipo === 'moderna') {
    retanguloArredondado(ctx, 160, 140, 320, 240, 70);
    buraco = [240, 260, 36];
    // Lâmina com dentes em cima
    ctx.moveTo(480, 222);
    const dentes = [0, 26, 8, 30, 4, 22, 12, 28, 0];
    dentes.forEach((d, i) => ctx.lineTo(500 + i * 80, 222 + d));
    ctx.lineTo(1230, 250);
    ctx.lineTo(1180, 300);
    ctx.lineTo(480, 300);
    ctx.closePath();
    furo = [240, 290];
  } else {
    if (tipo === 'ornamentada') {
      for (const [dx, dy] of [[-70, 0], [0, -70], [0, 70], [60, 0]]) {
        ctx.moveTo(330 + dx + 82, 260 + dy);
        ctx.arc(330 + dx, 260 + dy, 82, 0, Math.PI * 2);
      }
      buraco = [330, 260, 46];
      furo = [330, 300];
    } else {
      ctx.moveTo(330 + 150, 260);
      ctx.arc(330, 260, 150, 0, Math.PI * 2);
      furo = [330, 330];
    }
    // Haste, colar e palhetão
    ctx.rect(470, 238, 780, 44);
    ctx.rect(472, 222, 28, 76);
    ctx.rect(520, 226, 18, 68);
    ctx.moveTo(1080, 282);
    ctx.lineTo(1250, 282);
    ctx.lineTo(1250, 410);
    ctx.lineTo(1210, 410);
    ctx.lineTo(1210, 360);
    ctx.lineTo(1170, 360);
    ctx.lineTo(1170, 410);
    ctx.lineTo(1125, 410);
    ctx.lineTo(1125, 340);
    ctx.lineTo(1080, 340);
    ctx.closePath();
  }
  ctx.fillStyle = metal(ctx, 110, 410, cores);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  // O furo da argola sai recortado depois: as partes da argola se sobrepõem e o preenchimento fecharia o buraco.
  const [bx, by, br] = buraco;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Brilho ao longo da haste
  traco(ctx, 560, tipo === 'moderna' ? 262 : 246, tipo === 'moderna' ? 1150 : 1230, tipo === 'moderna' ? 262 : 246, 'rgba(255, 255, 255, 0.45)', 4);
  return furo;
}

function etiquetaDePapel(ctx: CanvasRenderingContext2D, texto: string, nota: string, semente: number) {
  ctx.save();
  ctx.translate(150, 600);
  ctx.rotate(-0.07);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.moveTo(30, -130);
  ctx.lineTo(560, -130);
  ctx.lineTo(560, 130);
  ctx.lineTo(30, 130);
  ctx.lineTo(-40, 70);
  ctx.lineTo(-40, -70);
  ctx.closePath();
  ctx.fillStyle = '#e4cc93';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.clip();
  ctx.translate(-40, -130);
  papel(ctx, 600, 260, { cores: ['#efdcaa', '#e0c78e', '#c9ab6c'], semente, manchas: 2, bordas: 0.2 });
  ctx.restore();
  // Reforço do furo
  ctx.fillStyle = '#c9ad72';
  ctx.beginPath();
  ctx.arc(10, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(10, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const fim = escreverNoQuadro(ctx, texto, {
    x: 70, topo: -112, largura: 470, altura: nota ? 170 : 224, maximo: 62, minimo: 28, meio: true, alinhamento: 'centro',
    cor: '#1f2c55', entrelinha: 1.1, montar: (t) => fonte(ctx, 'mao', t, 700),
  });
  if (nota) {
    linhaQueCabe(ctx, nota, 305, Math.max(fim + 40, 92), {
      largura: 460, maximo: 36, minimo: 20, cor: '#8a2f26', montar: (t) => fonte(ctx, 'mao', t, 600),
    });
  }
  ctx.restore();
  return [150 + 10 * Math.cos(-0.07), 600 + 10 * Math.sin(-0.07)] as const;
}

function cartaoChave(ctx: CanvasRenderingContext2D, v: Readonly<Record<string, string>>, semente: number) {
  const x = 290;
  const y = 140;
  const largura = 820;
  const altura = 520;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  retanguloArredondado(ctx, x, y, largura, altura, 40);
  const fundo = ctx.createLinearGradient(x, y, x + largura, y + altura);
  fundo.addColorStop(0, '#0a1222');
  fundo.addColorStop(1, '#17284a');
  ctx.fillStyle = fundo;
  ctx.fill();
  ctx.restore();
  ctx.save();
  retanguloArredondado(ctx, x, y, largura, altura, 40);
  ctx.clip();
  ctx.fillStyle = '#38b6ff';
  ctx.shadowColor = '#38b6ff';
  ctx.shadowBlur = 18;
  ctx.fillRect(x, y + 120, largura, 6);
  ctx.shadowBlur = 0;
  // Fenda do cordão
  ctx.globalCompositeOperation = 'destination-out';
  retanguloArredondado(ctx, x + largura / 2 - 50, y + 34, 100, 24, 12);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.9;
  marcaAstraTech(ctx, x + 44, y + 90, 30, '#8ba1c4');
  ctx.restore();
  escreverNoQuadro(ctx, v.etiqueta, {
    x: x + 44, topo: y + 160, largura: largura - 330, altura: 180, maximo: 52, minimo: 24, cor: '#ffffff', entrelinha: 1.15,
    montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  if (v.acesso.trim()) pilula(ctx, v.acesso, x + 44, y + 400, { cor: '#38b6ff', fundo: 'rgba(56, 182, 255, 0.12)', contorno: true, tamanho: 24 });
  if (v.nota.trim()) {
    linhaQueCabe(ctx, v.nota, x + 44, y + 476, {
      largura: largura - 330, maximo: 24, minimo: 16, alinhamento: 'esquerda', cor: '#8ba1c4', montar: (t) => fonte(ctx, 'sans', t, 400, true),
    });
  }
  codigoQr(ctx, x + largura - 44 - 210, y + 170, 210, semente, '#0a1222', '#ffffff');
  // Argola do cordão
  ctx.save();
  ctx.strokeStyle = '#b9c0c8';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(x + largura / 2, y + 30, 60, 46, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();
}

export const chave: IModeloDeDocumento = {
  id: 'chave',
  nome: 'Chave com etiqueta',
  categoria: 'Objetos',
  icone: 'chave',
  descricao: 'Chave de ferro, latão ou prata com etiqueta amarrada. Também em cartão de acesso da AstraTech.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 140, altura: 80 },
  campoDoTitulo: 'etiqueta',
  campos: [
    {
      id: 'tipo', rotulo: 'Tipo', tipo: 'escolha', padrao: 'antiga',
      opcoes: [
        { valor: 'antiga', rotulo: 'Antiga' },
        { valor: 'ornamentada', rotulo: 'Ornamentada' },
        { valor: 'moderna', rotulo: 'Moderna' },
        { valor: 'cartao', rotulo: 'Cartão AstraTech' },
      ],
    },
    {
      id: 'metal', rotulo: 'Metal', tipo: 'escolha', padrao: 'ferro', visivel: ehChave,
      opcoes: [{ valor: 'ferro', rotulo: 'Ferro' }, { valor: 'latao', rotulo: 'Latão' }, { valor: 'prata', rotulo: 'Prata' }],
    },
    { id: 'etiqueta', rotulo: 'Texto da etiqueta', tipo: 'paragrafo', linhas: 2, maximo: 90, padrao: 'Quarto 7\nEstalagem do Vau' },
    { id: 'nota', rotulo: 'Recado', tipo: 'texto', padrao: 'não devolver ao balcão', maximo: 50 },
    { id: 'acesso', rotulo: 'Nível de acesso', tipo: 'texto', padrao: 'Acesso nível 3', maximo: 30, visivel: ehCartao },
    {
      id: 'barbante', rotulo: 'Barbante', tipo: 'escolha', padrao: 'vermelho', visivel: ehChave,
      opcoes: [{ valor: 'vermelho', rotulo: 'Vermelho' }, { valor: 'cru', rotulo: 'Cru' }, { valor: 'preto', rotulo: 'Preto' }],
    },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.etiqueta + v.tipo);
    if (v.tipo === 'cartao') {
      cartaoChave(ctx, v, semente);
      return;
    }
    const cores = METAIS[v.metal] ?? METAIS.ferro;
    const [fx, fy] = desenharChave(ctx, v.tipo, cores);
    const [ex, ey] = etiquetaDePapel(ctx, v.etiqueta, v.nota, semente);
    // Barbante: duas voltas da argola ao furo da etiqueta
    ctx.save();
    ctx.strokeStyle = BARBANTES[v.barbante] ?? BARBANTES.vermelho;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const desvio of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(fx + desvio, fy - 10);
      ctx.bezierCurveTo(fx + desvio + 30, fy + 120, ex + 120, ey - 160, ex + desvio * 0.5, ey);
      ctx.stroke();
    }
    ctx.restore();
  },
};
