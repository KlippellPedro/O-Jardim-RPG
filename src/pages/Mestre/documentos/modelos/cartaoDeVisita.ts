import type { IModeloDeDocumento } from '../modelo';
import {
  cantoneira, chapado, escreverNoQuadro, espacamento, filete, fonte, imagemCobrindo, linhaQueCabe, retanguloArredondado,
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
  desenhar: ({ ctx, imagem }, v) => {
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
