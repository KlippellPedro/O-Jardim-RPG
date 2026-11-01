import { codigoDeBarras, codigoQr, marcaAstraTech, rotuloDeTela, TEMAS_ASTRA } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, TINTA, TINTA_APAGADA, escrever, espacamento, fonte, linhaQueCabe, papel, sementeDe, traco, type Pincel,
} from '../pincel';

const LARGURA = 1400;
const ALTURA = 560;
const CORTE = 1060;

const CORES: Record<string, string> = { vermelho: '#8a2a22', azul: '#24407a', verde: '#2f5a3a', marrom: '#5c3d1e' };

/** O bilhete com os dois dentes do picote, e o canhoto à direita. */
function contornoDoBilhete(ctx: CanvasRenderingContext2D) {
  const raio = 26;
  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.lineTo(CORTE - raio, 18);
  ctx.arc(CORTE, 18, raio, Math.PI, 0, true);
  ctx.lineTo(LARGURA - 18, 18);
  ctx.lineTo(LARGURA - 18, ALTURA - 18);
  ctx.lineTo(CORTE + raio, ALTURA - 18);
  ctx.arc(CORTE, ALTURA - 18, raio, 0, Math.PI, true);
  ctx.lineTo(18, ALTURA - 18);
  ctx.closePath();
}

function campo(ctx: CanvasRenderingContext2D, rotulo: string, valor: string, x: number, y: number, largura: number, cor: string, rotuloCor: string, familia: 'antiga' | 'sans' = 'antiga') {
  fonte(ctx, familia === 'sans' ? 'sans' : 'antiga', 18, familia === 'sans' ? 600 : 400);
  espacamento(ctx, 3);
  escrever(ctx, rotulo.toUpperCase(), x, y, 'esquerda', rotuloCor);
  espacamento(ctx, 0);
  linhaQueCabe(ctx, valor, x, y + 38, {
    largura, maximo: 30, minimo: 16, alinhamento: 'esquerda', cor, montar: (t) => fonte(ctx, familia, t, familia === 'sans' ? 500 : 400),
  });
}

function passagemAstraTech(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx } = pincel;
  const tema = TEMAS_ASTRA.escuro;
  const semente = sementeDe(v.numero + v.passageiro);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  contornoDoBilhete(ctx);
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, '#0a1222');
  fundo.addColorStop(1, '#16253f');
  ctx.fillStyle = fundo;
  ctx.fill();
  ctx.restore();
  ctx.save();
  contornoDoBilhete(ctx);
  ctx.clip();
  ctx.fillStyle = tema.acento;
  ctx.fillRect(18, 18, CORTE - 18, 8);
  linhaQueCabe(ctx, v.emissor, 60, 92, {
    largura: 600, maximo: 38, minimo: 22, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  rotuloDeTela(ctx, v.tipo, CORTE - 50, 88, tema, 'direita');
  linhaQueCabe(ctx, v.origem, 60, 210, { largura: 400, maximo: 54, minimo: 26, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'sans', t, 600) });
  fonte(ctx, 'sans', 46, 600);
  escrever(ctx, '→', 505, 206, 'centro', tema.acento);
  linhaQueCabe(ctx, v.destino, 560, 210, { largura: 450, maximo: 54, minimo: 26, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'sans', t, 600) });
  campo(ctx, 'Data', v.data, 60, 290, 300, '#e8f0ff', tema.fraco, 'sans');
  campo(ctx, 'Partida', v.partida, 400, 290, 280, '#e8f0ff', tema.fraco, 'sans');
  campo(ctx, 'Lugar', v.lugar, 720, 290, 300, '#e8f0ff', tema.fraco, 'sans');
  campo(ctx, 'Passageiro', v.passageiro, 60, 410, 560, '#e8f0ff', tema.fraco, 'sans');
  campo(ctx, 'Valor', v.preco, 720, 410, 300, tema.alerta, tema.fraco, 'sans');
  // Canhoto
  traco(ctx, CORTE, 50, CORTE, ALTURA - 50, tema.linha, 3, [10, 10]);
  codigoQr(ctx, CORTE + 70, 110, 200, semente, '#0a1222', '#ffffff');
  fonte(ctx, 'digital', 26);
  escrever(ctx, v.numero, CORTE + 170, 384, 'centro', tema.acento);
  ctx.save();
  ctx.globalAlpha = 0.75;
  marcaAstraTech(ctx, CORTE + 70, 470, 22, tema.fraco);
  ctx.restore();
  ctx.restore();
}

export const passagem: IModeloDeDocumento = {
  id: 'passagem',
  nome: 'Passagem',
  categoria: 'Cartões',
  icone: 'passagem',
  descricao: 'Bilhete de viagem com canhoto picotado: caravana, barco ou trem. Também em versão AstraTech com código de leitura.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 150, altura: 60 },
  copiasNaFolha: true,
  campoDoTitulo: 'destino',
  campos: [
    {
      id: 'suporte', rotulo: 'Suporte', tipo: 'escolha', padrao: 'papel',
      opcoes: [{ valor: 'papel', rotulo: 'Impressa' }, { valor: 'astratech', rotulo: 'Passagem AstraTech' }],
    },
    { id: 'emissor', rotulo: 'Quem emite', tipo: 'texto', padrao: 'Caravana do Limiar', maximo: 40 },
    { id: 'tipo', rotulo: 'Tipo', tipo: 'texto', padrao: 'Passagem de ida', maximo: 30 },
    { id: 'origem', rotulo: 'De', tipo: 'texto', padrao: 'Ponte Velha', maximo: 30 },
    { id: 'destino', rotulo: 'Para', tipo: 'texto', padrao: 'Posto da Encosta', maximo: 30 },
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'Terceiro dia do inverno', maximo: 30 },
    { id: 'partida', rotulo: 'Partida', tipo: 'texto', padrao: 'Ao nascer do sol', maximo: 30 },
    { id: 'lugar', rotulo: 'Lugar', tipo: 'texto', padrao: 'Carroça 2, banco 5', maximo: 30 },
    { id: 'passageiro', rotulo: 'Passageiro', tipo: 'texto', padrao: 'Benedito Sarrafo', maximo: 40 },
    { id: 'preco', rotulo: 'Valor', tipo: 'texto', padrao: '180 Lunaris', maximo: 24 },
    { id: 'numero', rotulo: 'Número', tipo: 'texto', padrao: 'Nº 004517', maximo: 16 },
    {
      id: 'cor', rotulo: 'Cor da faixa', tipo: 'escolha', padrao: 'vermelho', visivel: (valores) => valores.suporte !== 'astratech',
      opcoes: [{ valor: 'vermelho', rotulo: 'Vermelha' }, { valor: 'azul', rotulo: 'Azul' }, { valor: 'verde', rotulo: 'Verde' }, { valor: 'marrom', rotulo: 'Marrom' }],
    },
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'astratech') {
      passagemAstraTech(pincel, v);
      return;
    }
    const { ctx } = pincel;
    const cor = CORES[v.cor] ?? CORES.vermelho;
    const semente = sementeDe(v.numero + v.destino);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    contornoDoBilhete(ctx);
    ctx.fillStyle = '#efe4c6';
    ctx.fill();
    ctx.restore();
    ctx.save();
    contornoDoBilhete(ctx);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: PAPEIS.claro, semente, manchas: 3, bordas: 0.22 });
    ctx.fillStyle = cor;
    ctx.fillRect(0, 18, CORTE, 104);
    linhaQueCabe(ctx, v.emissor.toUpperCase(), 60, 86, {
      largura: 600, maximo: 40, minimo: 22, alinhamento: 'esquerda', cor: '#f6efdc',
      montar: (t) => { fonte(ctx, 'titulo', t, 700); espacamento(ctx, t * 0.06); },
    });
    espacamento(ctx, 0);
    fonte(ctx, 'antiga', 26, 400, true);
    escrever(ctx, v.tipo, CORTE - 50, 84, 'direita', '#f6efdc');

    linhaQueCabe(ctx, v.origem, 60, 210, { largura: 400, maximo: 54, minimo: 26, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'titulo', t, 700) });
    fonte(ctx, 'antiga', 46);
    escrever(ctx, '→', 505, 206, 'centro', cor);
    linhaQueCabe(ctx, v.destino, 560, 210, { largura: 450, maximo: 54, minimo: 26, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'titulo', t, 700) });
    traco(ctx, 60, 240, CORTE - 50, 240, 'rgba(42, 33, 24, 0.35)', 2);
    campo(ctx, 'Data', v.data, 60, 290, 300, TINTA, TINTA_APAGADA);
    campo(ctx, 'Partida', v.partida, 400, 290, 280, TINTA, TINTA_APAGADA);
    campo(ctx, 'Lugar', v.lugar, 720, 290, 300, TINTA, TINTA_APAGADA);
    campo(ctx, 'Passageiro', v.passageiro, 60, 410, 560, TINTA, TINTA_APAGADA);
    campo(ctx, 'Valor', v.preco, 720, 410, 300, cor, TINTA_APAGADA);

    // Picote e canhoto
    traco(ctx, CORTE, 50, CORTE, ALTURA - 50, 'rgba(42, 33, 24, 0.55)', 3, [6, 10]);
    fonte(ctx, 'antiga', 20);
    espacamento(ctx, 4);
    escrever(ctx, 'CANHOTO', CORTE + 50, 84, 'esquerda', TINTA_APAGADA);
    espacamento(ctx, 0);
    fonte(ctx, 'maquina', 30);
    escrever(ctx, v.numero, CORTE + 50, 132, 'esquerda', '#8a1f1a');
    linhaQueCabe(ctx, v.destino, CORTE + 50, 196, { largura: 270, maximo: 34, minimo: 18, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'titulo', t, 700) });
    linhaQueCabe(ctx, v.data, CORTE + 50, 238, { largura: 270, maximo: 24, minimo: 15, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'antiga', t) });
    linhaQueCabe(ctx, v.lugar, CORTE + 50, 274, { largura: 270, maximo: 24, minimo: 15, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'antiga', t) });
    codigoDeBarras(ctx, CORTE + 50, 320, 270, 130, semente, TINTA);
    ctx.restore();
  },
};
