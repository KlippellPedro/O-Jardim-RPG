import type { IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, escrever, imagemCobrindo, fonte, linhaQueCabe, papel, papelGrao, sementeDe, sorteador, vulto,
} from '../pincel';

const LARGURA = 1000;
const ALTURA = 1216;

const FILTROS: Record<string, string> = {
  cores: 'saturate(0.88) contrast(1.05) brightness(1.02)',
  sepia: 'sepia(0.85) contrast(1.06)',
  pb: 'grayscale(1) contrast(1.12)',
};

function fitaAdesiva(ctx: CanvasRenderingContext2D, x: number, y: number, angulo: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.fillStyle = 'rgba(245, 240, 222, 0.72)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 6;
  ctx.fillRect(-90, -28, 180, 56);
  ctx.restore();
}

/** Borda serrilhada das fotos antigas. */
function bordaSerrilhada(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number) {
  const dente = 16;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let px = x; px < x + largura; px += dente) ctx.arc(px + dente / 2, y, dente / 2, Math.PI, 0);
  for (let py = y; py < y + altura; py += dente) ctx.arc(x + largura, py + dente / 2, dente / 2, -Math.PI / 2, Math.PI / 2);
  for (let px = x + largura; px > x; px -= dente) ctx.arc(px - dente / 2, y + altura, dente / 2, 0, Math.PI);
  for (let py = y + altura; py > y; py -= dente) ctx.arc(x, py - dente / 2, dente / 2, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
}

export const fotografia: IModeloDeDocumento = {
  id: 'fotografia',
  nome: 'Fotografia',
  categoria: 'Objetos',
  icone: 'foto',
  descricao: 'Foto instantânea ou retrato antigo de borda serrilhada, com legenda escrita à mão.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 88, altura: 107 },
  campoDoTitulo: 'legenda',
  campos: [
    { id: 'foto', rotulo: 'Foto', tipo: 'imagem', padrao: '' },
    { id: 'legenda', rotulo: 'Legenda', tipo: 'texto', padrao: 'A última noite em que o farol acendeu', maximo: 70 },
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'verão', maximo: 30 },
    {
      id: 'estilo', rotulo: 'Estilo', tipo: 'escolha', padrao: 'instantanea',
      opcoes: [{ valor: 'instantanea', rotulo: 'Instantânea' }, { valor: 'antiga', rotulo: 'Antiga' }],
    },
    {
      id: 'filtro', rotulo: 'Cor', tipo: 'escolha', padrao: 'cores',
      opcoes: [{ valor: 'cores', rotulo: 'Colorida' }, { valor: 'sepia', rotulo: 'Sépia' }, { valor: 'pb', rotulo: 'Preto e branco' }],
    },
    {
      id: 'fita', rotulo: 'Fita adesiva', tipo: 'escolha', padrao: 'sim',
      opcoes: [{ valor: 'sim', rotulo: 'Com fita' }, { valor: 'nao', rotulo: 'Sem fita' }],
    },
  ],
  desenhar: ({ ctx, imagem }, v) => {
    const semente = sementeDe(v.legenda);
    const antiga = v.estilo === 'antiga';
    const moldura = { x: 40, y: 40, largura: LARGURA - 80, altura: ALTURA - 80 };
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    if (antiga) bordaSerrilhada(ctx, moldura.x, moldura.y, moldura.largura, moldura.altura);
    else ctx.rect(moldura.x, moldura.y, moldura.largura, moldura.altura);
    ctx.fillStyle = antiga ? '#e7dcc0' : '#f5f2ea';
    ctx.fill();
    ctx.restore();
    ctx.save();
    if (antiga) bordaSerrilhada(ctx, moldura.x, moldura.y, moldura.largura, moldura.altura);
    else {
      ctx.beginPath();
      ctx.rect(moldura.x, moldura.y, moldura.largura, moldura.altura);
    }
    ctx.clip();
    if (antiga) papel(ctx, LARGURA, ALTURA, { cores: PAPEIS.envelhecido, semente, manchas: 3, bordas: 0.25 });
    else papelGrao(ctx, LARGURA, ALTURA, 0.35);

    const foto = antiga ? { x: 110, y: 110, largura: 780, altura: 760 } : { x: 90, y: 90, largura: 820, altura: 820 };
    ctx.fillStyle = '#2a2622';
    ctx.fillRect(foto.x, foto.y, foto.largura, foto.altura);
    const escolhida = imagem('foto');
    const filtro = antiga && v.filtro === 'cores' ? FILTROS.sepia : FILTROS[v.filtro] ?? FILTROS.cores;
    if (escolhida) {
      imagemCobrindo(ctx, escolhida, foto.x, foto.y, foto.largura, foto.altura, { filtro });
    } else {
      const neblina = ctx.createLinearGradient(0, foto.y, 0, foto.y + foto.altura);
      neblina.addColorStop(0, '#5d6670');
      neblina.addColorStop(1, '#2c2f33');
      ctx.fillStyle = neblina;
      ctx.fillRect(foto.x, foto.y, foto.largura, foto.altura);
      vulto(ctx, foto.x, foto.y + 120, foto.largura, foto.altura - 120, 'rgba(20, 20, 24, 0.55)');
    }
    // Desbotado e grão por cima da foto
    ctx.save();
    ctx.beginPath();
    ctx.rect(foto.x, foto.y, foto.largura, foto.altura);
    ctx.clip();
    const vinheta = ctx.createRadialGradient(foto.x + foto.largura / 2, foto.y + foto.altura / 2, foto.largura * 0.3, foto.x + foto.largura / 2, foto.y + foto.altura / 2, foto.largura * 0.75);
    vinheta.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vinheta.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = vinheta;
    ctx.fillRect(foto.x, foto.y, foto.largura, foto.altura);
    ctx.fillStyle = antiga ? 'rgba(170, 130, 70, 0.12)' : 'rgba(255, 220, 170, 0.07)';
    ctx.fillRect(foto.x, foto.y, foto.largura, foto.altura);
    papelGrao(ctx, foto.x + foto.largura, foto.y + foto.altura, 0.5);
    // Riscos de foto manuseada
    const sorte = sorteador(semente);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i += 1) {
      const x = foto.x + sorte() * foto.largura;
      ctx.beginPath();
      ctx.moveTo(x, foto.y);
      ctx.lineTo(x + (sorte() - 0.5) * 120, foto.y + foto.altura);
      ctx.stroke();
    }
    ctx.restore();

    const tinta = antiga ? '#4a3420' : '#1f2c55';
    const base = antiga ? 960 : 1010;
    ctx.save();
    ctx.translate(LARGURA / 2, base);
    ctx.rotate(-0.015);
    linhaQueCabe(ctx, v.legenda, 0, 0, { largura: 800, maximo: 62, minimo: 28, cor: tinta, montar: (t) => fonte(ctx, 'mao', t, 600) });
    ctx.restore();
    if (v.data.trim()) {
      fonte(ctx, 'mao', 42, 500);
      escrever(ctx, v.data, LARGURA - 110, base + 80, 'direita', tinta);
    }
    ctx.restore();
    if (v.fita === 'sim') {
      fitaAdesiva(ctx, 160, 60, -0.5);
      fitaAdesiva(ctx, LARGURA - 160, 60, 0.45);
    }
  },
};
