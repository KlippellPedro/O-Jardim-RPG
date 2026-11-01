import { circuito, codigoQr, marcaAstraTech } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  cantoneira, chapado, escreverNoQuadro, espacamento, filete, fonte, imagemCobrindo, linhaQueCabe, retanguloArredondado, sementeDe,
  traco, type Pincel,
} from '../pincel';

const LARGURA = 1100;
const ALTURA = 1560;

const ESTILOS: Record<string, { fundo: string; tinta: string; enfeite: string }> = {
  marfim: { fundo: '#f4eedf', tinta: '#2a2118', enfeite: '#9a7a3a' },
  preto: { fundo: '#16141a', tinta: '#efe6d0', enfeite: '#c9a45a' },
  vinho: { fundo: '#4e1416', tinta: '#f3e6cf', enfeite: '#d8b26a' },
};

function conviteAstraTech(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx, imagem } = pincel;
  const neon = '#38b6ff';
  const semente = sementeDe(v.evento + v.anfitriao);
  ctx.save();
  retanguloArredondado(ctx, 20, 20, LARGURA - 40, ALTURA - 40, 34);
  ctx.clip();
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, '#070c16');
  fundo.addColorStop(1, '#151f38');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.save();
  ctx.globalAlpha = 0.12;
  circuito(ctx, { x: 0, y: 0, largura: LARGURA, altura: ALTURA }, neon, semente, 34);
  ctx.restore();
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = neon;
  ctx.lineWidth = 4;
  retanguloArredondado(ctx, 60, 60, LARGURA - 120, ALTURA - 120, 24);
  ctx.stroke();
  ctx.restore();
  const meio = LARGURA / 2;
  const simbolo = imagem('simbolo');
  if (simbolo) imagemCobrindo(ctx, simbolo, meio - 80, 120, 160, 140, { conter: true });
  else marcaAstraTech(ctx, meio - 50, 190, 100, neon, false);
  linhaQueCabe(ctx, v.anfitriao.toUpperCase(), meio, 340, {
    largura: LARGURA - 240, maximo: 40, minimo: 22, cor: '#8ba1c4', montar: (t) => { fonte(ctx, 'sans', t, 600); espacamento(ctx, t * 0.2); },
  });
  espacamento(ctx, 0);
  linhaQueCabe(ctx, v.chamada, meio, 400, { largura: LARGURA - 240, maximo: 32, minimo: 20, cor: '#e8f0ff', montar: (t) => fonte(ctx, 'sans', t, 400) });
  linhaQueCabe(ctx, v.convidado, meio, 480, { largura: LARGURA - 240, maximo: 44, minimo: 24, cor: '#ffffff', montar: (t) => fonte(ctx, 'sans', t, 600) });
  const pe = escreverNoQuadro(ctx, v.evento, {
    x: 130, topo: 520, largura: LARGURA - 260, altura: 220, maximo: 68, minimo: 34, meio: true, alinhamento: 'centro', cor: neon,
    entrelinha: 1.15, montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  traco(ctx, meio - 140, pe + 30, meio + 140, pe + 30, neon, 3);
  escreverNoQuadro(ctx, `${v.data}\n${v.local}`, {
    x: 130, topo: pe + 60, largura: LARGURA - 260, altura: 170, maximo: 34, minimo: 20, alinhamento: 'centro', cor: '#e8f0ff', entrelinha: 1.4,
    montar: (t) => fonte(ctx, 'sans', t, 500),
  });
  escreverNoQuadro(ctx, v.traje, {
    x: 130, topo: 1060, largura: LARGURA - 260, altura: 80, maximo: 28, minimo: 18, alinhamento: 'centro', cor: '#8ba1c4', entrelinha: 1.3,
    montar: (t) => fonte(ctx, 'sans', t, 400, true),
  });
  codigoQr(ctx, meio - 100, 1170, 200, semente, '#070c16', '#ffffff');
  linhaQueCabe(ctx, v.rsvp, meio, 1440, { largura: LARGURA - 260, maximo: 24, minimo: 16, cor: '#8ba1c4', montar: (t) => fonte(ctx, 'sans', t, 400) });
  ctx.restore();
}

export const convite: IModeloDeDocumento = {
  id: 'convite',
  nome: 'Convite',
  categoria: 'Cartões',
  icone: 'convite',
  descricao: 'Convite para baile, banquete, casamento ou funeral, com brasão ou símbolo. Também em versão AstraTech.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 148, altura: 210 },
  campoDoTitulo: 'evento',
  campos: [
    {
      id: 'estilo', rotulo: 'Estilo', tipo: 'escolha', padrao: 'marfim',
      opcoes: [
        { valor: 'marfim', rotulo: 'Marfim' }, { valor: 'preto', rotulo: 'Preto' }, { valor: 'vinho', rotulo: 'Vinho' },
        { valor: 'astratech', rotulo: 'AstraTech' },
      ],
    },
    { id: 'simbolo', rotulo: 'Brasão ou símbolo (opcional)', tipo: 'imagem', padrao: '' },
    { id: 'anfitriao', rotulo: 'Quem convida', tipo: 'texto', padrao: 'A Casa Varella', maximo: 50 },
    { id: 'chamada', rotulo: 'Chamada', tipo: 'texto', padrao: 'tem a honra de convidar', maximo: 50 },
    { id: 'convidado', rotulo: 'Convidado', tipo: 'texto', padrao: 'Vossa Senhoria', maximo: 50 },
    { id: 'evento', rotulo: 'Evento', tipo: 'texto', padrao: 'para o Baile da Colheita', maximo: 70 },
    { id: 'data', rotulo: 'Quando', tipo: 'texto', padrao: 'na última noite do outono', maximo: 60 },
    { id: 'local', rotulo: 'Onde', tipo: 'texto', padrao: 'Salão das Lanternas, Ponte Velha', maximo: 70 },
    { id: 'traje', rotulo: 'Traje ou aviso', tipo: 'texto', padrao: 'Traje de gala. Máscara obrigatória.', maximo: 80 },
    { id: 'rsvp', rotulo: 'Resposta', tipo: 'texto', padrao: 'Responda ao portador deste convite.', maximo: 70 },
  ],
  desenhar: (pincel, v) => {
    if (v.estilo === 'astratech') {
      conviteAstraTech(pincel, v);
      return;
    }
    const { ctx, imagem } = pincel;
    const estilo = ESTILOS[v.estilo] ?? ESTILOS.marfim;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = estilo.fundo;
    ctx.fillRect(20, 20, LARGURA - 40, ALTURA - 40);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(20, 20, LARGURA - 40, ALTURA - 40);
    ctx.clip();
    chapado(ctx, LARGURA, ALTURA, estilo.fundo, 0.5);
    ctx.strokeStyle = estilo.enfeite;
    ctx.lineWidth = 5;
    ctx.strokeRect(60, 60, LARGURA - 120, ALTURA - 120);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(78, 78, LARGURA - 156, ALTURA - 156);
    cantoneira(ctx, 92, 92, 70, 0, estilo.enfeite);
    cantoneira(ctx, LARGURA - 92, 92, 70, Math.PI / 2, estilo.enfeite);
    cantoneira(ctx, LARGURA - 92, ALTURA - 92, 70, Math.PI, estilo.enfeite);
    cantoneira(ctx, 92, ALTURA - 92, 70, -Math.PI / 2, estilo.enfeite);

    const meio = LARGURA / 2;
    const simbolo = imagem('simbolo');
    if (simbolo) {
      imagemCobrindo(ctx, simbolo, meio - 90, 130, 180, 160, { conter: true });
    } else {
      // Monograma com a inicial de quem convida
      ctx.strokeStyle = estilo.enfeite;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(meio, 210, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(meio, 210, 68, 0, Math.PI * 2);
      ctx.stroke();
      const inicial = v.anfitriao.replace(/^(a|o|as|os)\s+(casa|família|familia|ordem|corte)?\s*(d[aeo]s?\s+)?/i, '').trim().charAt(0).toUpperCase() || '✦';
      fonte(ctx, 'titulo', 80, 700);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = estilo.enfeite;
      ctx.fillText(inicial, meio, 214);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    linhaQueCabe(ctx, v.anfitriao.toUpperCase(), meio, 370, {
      largura: LARGURA - 260, maximo: 40, minimo: 22, cor: estilo.tinta, montar: (t) => { fonte(ctx, 'titulo', t, 700); espacamento(ctx, t * 0.1); },
    });
    espacamento(ctx, 0);
    linhaQueCabe(ctx, v.chamada, meio, 432, { largura: LARGURA - 260, maximo: 36, minimo: 20, cor: estilo.tinta, montar: (t) => fonte(ctx, 'antiga', t, 400, true) });
    linhaQueCabe(ctx, v.convidado, meio, 520, { largura: LARGURA - 260, maximo: 58, minimo: 28, cor: estilo.tinta, montar: (t) => fonte(ctx, 'mao', t, 700) });
    filete(ctx, meio - 170, 576, 340, estilo.enfeite);
    const pe = escreverNoQuadro(ctx, v.evento, {
      x: 140, topo: 610, largura: LARGURA - 280, altura: 220, maximo: 64, minimo: 32, meio: true, alinhamento: 'centro', cor: estilo.tinta,
      entrelinha: 1.15, montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    filete(ctx, meio - 170, pe + 36, 340, estilo.enfeite);
    escreverNoQuadro(ctx, `${v.data}\n${v.local}`, {
      x: 140, topo: pe + 70, largura: LARGURA - 280, altura: 200, maximo: 38, minimo: 22, alinhamento: 'centro', cor: estilo.tinta, entrelinha: 1.4,
      montar: (t) => fonte(ctx, 'antiga', t),
    });
    escreverNoQuadro(ctx, v.traje, {
      x: 140, topo: 1200, largura: LARGURA - 280, altura: 90, maximo: 30, minimo: 18, alinhamento: 'centro', cor: estilo.enfeite, entrelinha: 1.3,
      montar: (t) => fonte(ctx, 'antiga', t, 400, true),
    });
    linhaQueCabe(ctx, v.rsvp, meio, 1390, { largura: LARGURA - 280, maximo: 26, minimo: 16, cor: estilo.tinta, montar: (t) => fonte(ctx, 'antiga', t) });
    ctx.restore();
  },
};
