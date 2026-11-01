import type { IModeloDeDocumento } from '../modelo';
import {
  CORES_DE_TINTA, OPCOES_DE_PAPEL, OPCOES_DE_TINTA, TINTA, TINTA_FRACA, assinatura, contornoRasgado, escrever,
  escreverNoQuadro, espacamento, filete, fonte, linhaQueCabe, papel, seloRedondo, sementeDe, tomDePapel,
} from '../pincel';

const LARGURA = 1240;
const ALTURA = 1754;
const MARGEM = 150;

export const edital: IModeloDeDocumento = {
  id: 'edital',
  nome: 'Edital',
  categoria: 'Papéis oficiais',
  icone: 'edital',
  descricao: 'Aviso público, decreto ou ordem de autoridade, com selo e assinatura.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 210, altura: 297 },
  campoDoTitulo: 'titulo',
  campos: [
    { id: 'emissor', rotulo: 'Autoridade', tipo: 'texto', padrao: 'Vigília das Raízes', maximo: 50 },
    { id: 'subtitulo', rotulo: 'Posto ou repartição', tipo: 'texto', padrao: 'Posto da fronteira leste', maximo: 60 },
    { id: 'numero', rotulo: 'Número', tipo: 'texto', padrao: 'Edital nº 17', maximo: 30 },
    { id: 'titulo', rotulo: 'Título', tipo: 'texto', padrao: 'Aviso de evacuação', maximo: 60 },
    {
      id: 'corpo', rotulo: 'Texto', tipo: 'paragrafo', linhas: 8, maximo: 2400,
      dica: 'Ponha um trecho entre [[ e ]] para ele sair tarjado.',
      padrao: 'Fica determinado que os moradores da cidade baixa deixem as casas até o pôr do sol de amanhã, levando só o que puderem carregar.\n\nA ponte velha fica fechada para carroças. Quem tiver parente acamado avise o posto, e a Vigília manda gente para ajudar.\n\nNinguém volta para a cidade baixa antes de novo aviso deste posto.',
    },
    { id: 'localData', rotulo: 'Local e data', tipo: 'texto', padrao: 'Posto da fronteira leste, segundo dia do outono', maximo: 70 },
    { id: 'assinante', rotulo: 'Quem assina', tipo: 'texto', padrao: 'Capitã Odete Rezende', maximo: 50 },
    { id: 'cargo', rotulo: 'Cargo', tipo: 'texto', padrao: 'Pela Vigília das Raízes', maximo: 50 },
    { id: 'selo', rotulo: 'Texto do selo', tipo: 'texto', padrao: 'Vigília das Raízes', maximo: 40, dica: 'Deixe vazio para tirar o selo.' },
    { id: 'tinta', rotulo: 'Tinta do selo', tipo: 'escolha', padrao: 'vermelho', opcoes: OPCOES_DE_TINTA },
    { id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'claro', opcoes: OPCOES_DE_PAPEL },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.titulo + v.numero);
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 6, base: 8, esquerda: 5, direita: 5 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: tomDePapel(v.papel, 'claro'), semente, manchas: 3, bordas: 0.24 });

    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 5;
    ctx.strokeRect(70, 70, LARGURA - 140, ALTURA - 140);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(86, 86, LARGURA - 172, ALTURA - 172);
    for (const [x, y] of [[70, 70], [LARGURA - 70, 70], [70, ALTURA - 70], [LARGURA - 70, ALTURA - 70]]) {
      ctx.fillStyle = TINTA;
      ctx.fillRect(x - 12, y - 12, 24, 24);
    }

    linhaQueCabe(ctx, v.emissor.toUpperCase(), LARGURA / 2, 226, {
      largura: LARGURA - MARGEM * 2, maximo: 60, minimo: 30, cor: TINTA,
      montar: (t) => { fonte(ctx, 'titulo', t, 700); espacamento(ctx, t * 0.1); },
    });
    espacamento(ctx, 0);
    linhaQueCabe(ctx, v.subtitulo, LARGURA / 2, 278, {
      largura: LARGURA - MARGEM * 2, maximo: 34, minimo: 22, cor: TINTA_FRACA, montar: (t) => fonte(ctx, 'antiga', t, 400, true),
    });
    filete(ctx, MARGEM + 80, 318, LARGURA - (MARGEM + 80) * 2, TINTA);

    fonte(ctx, 'antiga', 26);
    espacamento(ctx, 8);
    escrever(ctx, v.numero.toUpperCase(), LARGURA / 2, 392, 'centro', TINTA_FRACA);
    espacamento(ctx, 0);

    const peDoTitulo = escreverNoQuadro(ctx, v.titulo.toUpperCase(), {
      x: MARGEM, topo: 410, largura: LARGURA - MARGEM * 2, altura: 210, maximo: 92, minimo: 48, meio: true,
      alinhamento: 'centro', cor: TINTA, entrelinha: 1.12, montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    filete(ctx, LARGURA / 2 - 180, peDoTitulo + 34, 360, TINTA);

    const topoDoCorpo = peDoTitulo + 80;
    escreverNoQuadro(ctx, v.corpo, {
      x: MARGEM + 10, topo: topoDoCorpo, largura: LARGURA - (MARGEM + 10) * 2, altura: ALTURA - 470 - topoDoCorpo,
      maximo: 38, minimo: 22, entrelinha: 1.45, alinhamento: 'justificado', cor: TINTA, entreParagrafos: 22,
      montar: (t) => fonte(ctx, 'antiga', t),
    });

    fonte(ctx, 'antiga', 30, 400, true);
    escrever(ctx, v.localData, LARGURA - MARGEM, ALTURA - 400, 'direita', TINTA_FRACA);
    assinatura(ctx, LARGURA - MARGEM - 480, ALTURA - 236, 480, { legenda: v.assinante, nome: v.assinante, cor: TINTA });
    fonte(ctx, 'antiga', 22);
    espacamento(ctx, 5);
    escrever(ctx, v.cargo.toUpperCase(), LARGURA - MARGEM - 240, ALTURA - 166, 'centro', TINTA_FRACA);
    espacamento(ctx, 0);

    if (v.selo.trim()) {
      seloRedondo(ctx, MARGEM + 150, ALTURA - 260, 128, {
        texto: v.selo, cor: CORES_DE_TINTA[v.tinta] ?? CORES_DE_TINTA.vermelho, angulo: -0.22, semente,
      });
    }
    ctx.restore();
  },
};
