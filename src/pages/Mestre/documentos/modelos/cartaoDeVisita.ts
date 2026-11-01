import { circuito, codigoQr, marcaAstraTech } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  cantoneira, chapado, escreverNoQuadro, espacamento, filete, fonte, imagemCobrindo, linhaQueCabe, retanguloArredondado, sementeDe,
  traco, type Pincel,
} from '../pincel';

const LARGURA = 1050;
const ALTURA = 680;

const ESTILOS: Record<string, { fundo: string; tinta: string; enfeite: string }> = {
  claro: { fundo: '#f4eedf', tinta: '#2a2118', enfeite: '#9a7a3a' },
  escuro: { fundo: '#18161b', tinta: '#efe6d0', enfeite: '#c9a45a' },
  rubro: { fundo: '#561615', tinta: '#f3e6cf', enfeite: '#d8b26a' },
  verde: { fundo: '#1c3227', tinta: '#efe6d0', enfeite: '#c9a45a' },
  azul: { fundo: '#17223d', tinta: '#eae3d2', enfeite: '#c2a35e' },
};

export const cartaoDeVisita: IModeloDeDocumento = {
  id: 'cartao-visita',
  nome: 'Cartão de visita',
  categoria: 'Cartões',
  icone: 'cartao',
  descricao: 'Cartão com nome, ofício e onde encontrar. Imprime oito por folha, prontos para recortar.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 85, altura: 55 },
  copiasNaFolha: true,
  campoDoTitulo: 'nome',
  campos: [
    {
      id: 'suporte', rotulo: 'Suporte', tipo: 'escolha', padrao: 'papel',
      opcoes: [{ valor: 'papel', rotulo: 'Impresso' }, { valor: 'astratech', rotulo: 'Cartão AstraTech' }],
      dica: 'O cartão AstraTech é escuro, com trilhas de circuito e código de leitura.',
    },
    { id: 'simbolo', rotulo: 'Símbolo (opcional)', tipo: 'imagem', padrao: '', dica: 'PNG com fundo transparente fica melhor.' },
    { id: 'nome', rotulo: 'Nome', tipo: 'texto', padrao: 'Iara Montenegro', maximo: 40 },
    { id: 'oficio', rotulo: 'Ofício', tipo: 'texto', padrao: 'Tradutora responsável', maximo: 50 },
    { id: 'casa', rotulo: 'Casa, guilda ou loja', tipo: 'texto', padrao: 'Casa das Línguas', maximo: 50 },
    { id: 'endereco', rotulo: 'Onde encontrar', tipo: 'texto', padrao: 'Salão norte, do meio-dia ao anoitecer', maximo: 80 },
    { id: 'frase', rotulo: 'Frase', tipo: 'texto', padrao: 'Cobro por palavra e assino o que traduzo.', maximo: 80 },
    {
      id: 'estilo', rotulo: 'Cor do cartão', tipo: 'escolha', padrao: 'claro',
      opcoes: [
        { valor: 'claro', rotulo: 'Marfim' },
        { valor: 'escuro', rotulo: 'Preto' },
        { valor: 'rubro', rotulo: 'Vinho' },
        { valor: 'verde', rotulo: 'Verde' },
        { valor: 'azul', rotulo: 'Azul' },
      ],
    },
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'astratech') {
      cartaoAstraTech(pincel, v);
      return;
    }
    const { ctx, imagem } = pincel;
    const estilo = ESTILOS[v.estilo] ?? ESTILOS.claro;
    ctx.save();
    retanguloArredondado(ctx, 0, 0, LARGURA, ALTURA, 22);
    ctx.clip();
    chapado(ctx, LARGURA, ALTURA, estilo.fundo, 0.55);

    ctx.strokeStyle = estilo.enfeite;
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, LARGURA - 60, ALTURA - 60);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(44, 44, LARGURA - 88, ALTURA - 88);
    cantoneira(ctx, 56, 56, 46, 0, estilo.enfeite);
    cantoneira(ctx, LARGURA - 56, 56, 46, Math.PI / 2, estilo.enfeite);
    cantoneira(ctx, LARGURA - 56, ALTURA - 56, 46, Math.PI, estilo.enfeite);
    cantoneira(ctx, 56, ALTURA - 56, 46, -Math.PI / 2, estilo.enfeite);

    // O bloco fica no meio do cartão: com símbolo ele é mais alto e começa mais perto da borda.
    const simbolo = imagem('simbolo');
    let y: number;
    if (simbolo) {
      imagemCobrindo(ctx, simbolo, LARGURA / 2 - 70, 92, 140, 120, { conter: true });
      y = 224;
    } else {
      filete(ctx, LARGURA / 2 - 120, 152, 240, estilo.enfeite);
      y = 190;
    }

    fonte(ctx, 'antiga', 24);
    espacamento(ctx, 7);
    linhaQueCabe(ctx, v.casa.toUpperCase(), LARGURA / 2, y + 26, {
      largura: LARGURA - 220, maximo: 26, minimo: 16, cor: estilo.enfeite,
      montar: (t) => { fonte(ctx, 'antiga', t); espacamento(ctx, t * 0.28); },
    });
    espacamento(ctx, 0);

    linhaQueCabe(ctx, v.nome, LARGURA / 2, y + 128, {
      largura: LARGURA - 200, maximo: 80, minimo: 36, cor: estilo.tinta, montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    linhaQueCabe(ctx, v.oficio, LARGURA / 2, y + 180, {
      largura: LARGURA - 220, maximo: 38, minimo: 22, cor: estilo.tinta, montar: (t) => fonte(ctx, 'antiga', t, 400, true),
    });
    filete(ctx, LARGURA / 2 - 160, y + 214, 320, estilo.enfeite);

    const fim = escreverNoQuadro(ctx, v.endereco, {
      x: 130, topo: y + 236, largura: LARGURA - 260, altura: 80, maximo: 30, minimo: 20, alinhamento: 'centro',
      cor: estilo.tinta, montar: (t) => fonte(ctx, 'antiga', t), entrelinha: 1.25,
    });
    escreverNoQuadro(ctx, v.frase, {
      x: 130, topo: fim + 14, largura: LARGURA - 260, altura: Math.max(30, ALTURA - 56 - fim - 14), maximo: 25, minimo: 17,
      alinhamento: 'centro', cor: estilo.enfeite, montar: (t) => fonte(ctx, 'antiga', t, 400, true), entrelinha: 1.2,
    });
    ctx.restore();
  },
};

const NEON: Record<string, string> = { claro: '#38b6ff', escuro: '#c9a45a', rubro: '#ff4d7a', verde: '#33d69f', azul: '#5aa8ff' };

/** O cartão de visita da AstraTech: fundo escuro, circuito, nome em letra de tela e código de leitura. */
function cartaoAstraTech(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx, imagem } = pincel;
  const neon = NEON[v.estilo] ?? NEON.claro;
  const semente = sementeDe(v.nome + v.casa);
  ctx.save();
  retanguloArredondado(ctx, 0, 0, LARGURA, ALTURA, 22);
  ctx.clip();
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, '#070c16');
  fundo.addColorStop(1, '#111c31');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.save();
  ctx.globalAlpha = 0.14;
  circuito(ctx, { x: 0, y: 0, largura: LARGURA, altura: ALTURA }, neon, semente, 22);
  ctx.restore();
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = 16;
  traco(ctx, 0, 6, LARGURA, 6, neon, 6);
  ctx.restore();

  const x = 70;
  const simbolo = imagem('simbolo');
  if (simbolo) imagemCobrindo(ctx, simbolo, x, 60, 110, 110, { conter: true });
  fonte(ctx, 'sans', 22, 600);
  espacamento(ctx, 6);
  linhaQueCabe(ctx, v.casa.toUpperCase(), simbolo ? x + 130 : x, simbolo ? 124 : 112, {
    largura: 560, maximo: 22, minimo: 14, alinhamento: 'esquerda', cor: '#8ba1c4',
    montar: (t) => { fonte(ctx, 'sans', t, 600); espacamento(ctx, t * 0.26); },
  });
  espacamento(ctx, 0);
  linhaQueCabe(ctx, v.nome, x, 270, {
    largura: 640, maximo: 62, minimo: 28, alinhamento: 'esquerda', cor: '#ffffff', montar: (t) => fonte(ctx, 'tech', t, 700),
  });
  linhaQueCabe(ctx, v.oficio, x, 322, {
    largura: 640, maximo: 32, minimo: 18, alinhamento: 'esquerda', cor: neon, montar: (t) => fonte(ctx, 'sans', t, 500),
  });
  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur = 10;
  traco(ctx, x, 356, x + 260, 356, neon, 3);
  ctx.restore();
  const fim = escreverNoQuadro(ctx, v.endereco, {
    x, topo: 380, largura: 640, altura: 90, maximo: 27, minimo: 17, cor: '#e8f0ff', entrelinha: 1.3, montar: (t) => fonte(ctx, 'sans', t, 400),
  });
  escreverNoQuadro(ctx, v.frase, {
    x, topo: Math.max(fim + 16, 500), largura: 640, altura: 80, maximo: 23, minimo: 15, cor: '#8ba1c4', entrelinha: 1.25,
    montar: (t) => fonte(ctx, 'sans', t, 400, true),
  });
  codigoQr(ctx, LARGURA - 70 - 210, 190, 210, semente, '#070c16', '#ffffff');
  ctx.save();
  ctx.globalAlpha = 0.75;
  marcaAstraTech(ctx, LARGURA - 70 - 228, ALTURA - 70, 22, '#8ba1c4');
  ctx.restore();
  ctx.restore();
}
