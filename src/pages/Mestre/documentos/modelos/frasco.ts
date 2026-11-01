import type { IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, TINTA, TINTA_FRACA, escrever, escreverNoQuadro, espacamento, filete, fonte, linhaQueCabe, papel, papelGrao,
  retanguloArredondado, sementeDe,
} from '../pincel';

const LARGURA = 900;
const ALTURA = 1300;

const LIQUIDOS: Record<string, [string, string]> = {
  vermelho: ['#d8443a', '#6e1410'],
  azul: ['#4aa3e8', '#123d78'],
  verde: ['#5cc56a', '#185a22'],
  roxo: ['#a46ad8', '#3b1460'],
  ambar: ['#f0b24a', '#7a4610'],
  preto: ['#4a4646', '#0c0b0b'],
  prata: ['#e6eef5', '#8a98a8'],
};

/** O contorno do vidro, do gargalo à base. */
function contornoDoFrasco(ctx: CanvasRenderingContext2D, forma: string) {
  ctx.beginPath();
  ctx.moveTo(385, 200);
  ctx.lineTo(515, 200);
  ctx.lineTo(515, 330);
  if (forma === 'redondo') {
    ctx.bezierCurveTo(515, 420, 790, 520, 790, 830);
    ctx.bezierCurveTo(790, 1080, 640, 1220, 450, 1220);
    ctx.bezierCurveTo(260, 1220, 110, 1080, 110, 830);
    ctx.bezierCurveTo(110, 520, 385, 420, 385, 330);
  } else if (forma === 'quadrado') {
    ctx.lineTo(720, 440);
    ctx.lineTo(720, 1190);
    ctx.quadraticCurveTo(720, 1220, 690, 1220);
    ctx.lineTo(210, 1220);
    ctx.quadraticCurveTo(180, 1220, 180, 1190);
    ctx.lineTo(180, 440);
    ctx.lineTo(385, 330);
  } else {
    ctx.bezierCurveTo(515, 380, 670, 380, 670, 470);
    ctx.lineTo(670, 1150);
    ctx.quadraticCurveTo(670, 1220, 600, 1220);
    ctx.lineTo(300, 1220);
    ctx.quadraticCurveTo(230, 1220, 230, 1150);
    ctx.lineTo(230, 470);
    ctx.bezierCurveTo(230, 380, 385, 380, 385, 330);
  }
  ctx.closePath();
}

export const frasco: IModeloDeDocumento = {
  id: 'frasco',
  nome: 'Frasco com rótulo',
  categoria: 'Objetos',
  icone: 'frasco',
  descricao: 'Poção, remédio ou veneno: frasco de vidro com rolha, líquido colorido e rótulo da botica.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 70, altura: 101 },
  campoDoTitulo: 'nome',
  campos: [
    { id: 'botica', rotulo: 'Quem fez', tipo: 'texto', padrao: 'Botica da Ponte', maximo: 40 },
    { id: 'nome', rotulo: 'Nome', tipo: 'texto', padrao: 'Tônico de Vigília', maximo: 40 },
    { id: 'descricao', rotulo: 'Para que serve', tipo: 'paragrafo', linhas: 2, maximo: 140, padrao: 'Uma dose mantém acordado a noite inteira.' },
    { id: 'aviso', rotulo: 'Aviso', tipo: 'texto', padrao: 'Não misturar com vinho.', maximo: 60 },
    { id: 'lote', rotulo: 'Lote', tipo: 'texto', padrao: 'Lote 12', maximo: 24 },
    {
      id: 'liquido', rotulo: 'Líquido', tipo: 'escolha', padrao: 'roxo',
      opcoes: [
        { valor: 'vermelho', rotulo: 'Vermelho' }, { valor: 'azul', rotulo: 'Azul' }, { valor: 'verde', rotulo: 'Verde' },
        { valor: 'roxo', rotulo: 'Roxo' }, { valor: 'ambar', rotulo: 'Âmbar' }, { valor: 'preto', rotulo: 'Preto' }, { valor: 'prata', rotulo: 'Prata' },
      ],
    },
    {
      id: 'nivel', rotulo: 'Quanto tem', tipo: 'escolha', padrao: 'cheio',
      opcoes: [{ valor: 'cheio', rotulo: 'Cheio' }, { valor: 'metade', rotulo: 'Pela metade' }, { valor: 'fundo', rotulo: 'Só no fundo' }],
    },
    {
      id: 'forma', rotulo: 'Frasco', tipo: 'escolha', padrao: 'redondo',
      opcoes: [{ valor: 'redondo', rotulo: 'Redondo' }, { valor: 'alto', rotulo: 'Alto' }, { valor: 'quadrado', rotulo: 'Quadrado' }],
    },
    {
      id: 'rotulo', rotulo: 'Rótulo', tipo: 'escolha', padrao: 'pergaminho',
      opcoes: [{ valor: 'pergaminho', rotulo: 'Pergaminho' }, { valor: 'branco', rotulo: 'Branco' }, { valor: 'preto', rotulo: 'Preto' }],
    },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.nome);
    const [claro, escuro] = LIQUIDOS[v.liquido] ?? LIQUIDOS.roxo;

    // Sombra no chão
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(450, 1235, 330, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Vidro
    contornoDoFrasco(ctx, v.forma);
    ctx.fillStyle = 'rgba(205, 225, 235, 0.22)';
    ctx.fill();
    ctx.save();
    contornoDoFrasco(ctx, v.forma);
    ctx.clip();
    const nivel = v.nivel === 'fundo' ? 1080 : v.nivel === 'metade' ? 820 : 560;
    const liquido = ctx.createLinearGradient(0, nivel, 0, 1220);
    liquido.addColorStop(0, claro);
    liquido.addColorStop(1, escuro);
    ctx.fillStyle = liquido;
    ctx.fillRect(0, nivel, LARGURA, ALTURA);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(450, nivel, 360, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brilho vertical do vidro
    const brilho = ctx.createLinearGradient(150, 0, 330, 0);
    brilho.addColorStop(0, 'rgba(255, 255, 255, 0)');
    brilho.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    brilho.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = brilho;
    ctx.fillRect(150, 380, 180, 760);
    ctx.restore();
    contornoDoFrasco(ctx, v.forma);
    ctx.strokeStyle = 'rgba(235, 245, 250, 0.75)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Rolha e barbante
    ctx.save();
    retanguloArredondado(ctx, 368, 110, 164, 130, 18);
    const rolha = ctx.createLinearGradient(368, 0, 532, 0);
    rolha.addColorStop(0, '#8a5a2e');
    rolha.addColorStop(0.5, '#c08a52');
    rolha.addColorStop(1, '#7a4c24');
    ctx.fillStyle = rolha;
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 35, 15, 0.35)';
    for (let i = 0; i < 14; i += 1) ctx.fillRect(380 + ((i * 37) % 140), 125 + ((i * 53) % 100), 6, 4);
    ctx.strokeStyle = '#d9c7a0';
    ctx.lineWidth = 7;
    for (const y of [262, 278]) {
      ctx.beginPath();
      ctx.moveTo(380, y);
      ctx.lineTo(520, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(520, 270);
    ctx.quadraticCurveTo(580, 300, 560, 360);
    ctx.stroke();
    ctx.restore();

    // Rótulo
    const rotulo = v.forma === 'alto' ? { x: 255, y: 640, largura: 390, altura: 360 } : { x: 245, y: 700, largura: 410, altura: 340 };
    const escuroNoRotulo = v.rotulo === 'preto';
    const tinta = escuroNoRotulo ? '#efe4c6' : TINTA;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    retanguloArredondado(ctx, rotulo.x, rotulo.y, rotulo.largura, rotulo.altura, 16);
    ctx.fillStyle = escuroNoRotulo ? '#1d1a18' : '#efe4c6';
    ctx.fill();
    ctx.restore();
    ctx.save();
    retanguloArredondado(ctx, rotulo.x, rotulo.y, rotulo.largura, rotulo.altura, 16);
    ctx.clip();
    if (v.rotulo === 'pergaminho') {
      ctx.translate(rotulo.x, rotulo.y);
      papel(ctx, rotulo.largura, rotulo.altura, { cores: PAPEIS.envelhecido, semente, manchas: 2, bordas: 0.3 });
      ctx.translate(-rotulo.x, -rotulo.y);
    } else {
      if (v.rotulo === 'branco') {
        ctx.fillStyle = '#f7f6f1';
        ctx.fillRect(rotulo.x, rotulo.y, rotulo.largura, rotulo.altura);
      }
      papelGrao(ctx, rotulo.x + rotulo.largura, rotulo.y + rotulo.altura, 0.4);
    }
    ctx.restore();
    ctx.strokeStyle = escuroNoRotulo ? '#c9a45a' : 'rgba(42, 33, 24, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rotulo.x + 14, rotulo.y + 14, rotulo.largura - 28, rotulo.altura - 28);

    const meio = rotulo.x + rotulo.largura / 2;
    fonte(ctx, 'antiga', 20);
    espacamento(ctx, 4);
    linhaQueCabe(ctx, v.botica.toUpperCase(), meio, rotulo.y + 58, {
      largura: rotulo.largura - 60, maximo: 20, minimo: 13, cor: escuroNoRotulo ? '#c9a45a' : TINTA_FRACA,
      montar: (t) => { fonte(ctx, 'antiga', t); espacamento(ctx, t * 0.2); },
    });
    espacamento(ctx, 0);
    const peDoNome = escreverNoQuadro(ctx, v.nome, {
      x: rotulo.x + 30, topo: rotulo.y + 70, largura: rotulo.largura - 60, altura: 110, maximo: 46, minimo: 24, meio: true,
      alinhamento: 'centro', cor: tinta, entrelinha: 1.05, montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    filete(ctx, meio - 90, peDoNome + 14, 180, escuroNoRotulo ? '#c9a45a' : TINTA);
    escreverNoQuadro(ctx, v.descricao, {
      x: rotulo.x + 34, topo: peDoNome + 34, largura: rotulo.largura - 68, altura: rotulo.y + rotulo.altura - 90 - peDoNome - 34,
      maximo: 24, minimo: 15, alinhamento: 'centro', cor: tinta, entrelinha: 1.25, montar: (t) => fonte(ctx, 'antiga', t, 400, true),
    });
    linhaQueCabe(ctx, v.aviso, meio, rotulo.y + rotulo.altura - 66, {
      largura: rotulo.largura - 60, maximo: 21, minimo: 13, cor: escuroNoRotulo ? '#ff8a7a' : '#8a1f1a', montar: (t) => fonte(ctx, 'antiga', t),
    });
    fonte(ctx, 'antiga', 18);
    escrever(ctx, v.lote, meio, rotulo.y + rotulo.altura - 32, 'centro', escuroNoRotulo ? '#c9a45a' : TINTA_FRACA);
  },
};
