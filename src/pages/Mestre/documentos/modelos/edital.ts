import {
  CAMPO_DE_HORA_NO_TABLET, CAMPO_DE_SUPORTE, CAMPO_DE_TEMA_NO_TABLET, botao, cabecalhoDeApp, codigoQr, emTablet, icone, noPapel,
  painel, rotuloDeTela, temaAstra, verificado, type TemaAstra,
} from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  CORES_DE_TINTA, OPCOES_DE_PAPEL, OPCOES_DE_TINTA, TINTA, TINTA_FRACA, assinatura, contornoRasgado, escrever,
  escreverNoQuadro, espacamento, filete, fonte, linhaQueCabe, papel, seloRedondo, sementeDe, tomDePapel, type Pincel,
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
    CAMPO_DE_SUPORTE,
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
    { id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'claro', opcoes: OPCOES_DE_PAPEL, visivel: noPapel },
    CAMPO_DE_TEMA_NO_TABLET,
    CAMPO_DE_HORA_NO_TABLET,
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'tablet') {
      editalNoTablet(pincel, v);
      return;
    }
    const { ctx } = pincel;
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

/** A tinta do selo vira a cor do alerta na tela. */
function corDoAlerta(tema: TemaAstra, tinta: string): string {
  return ({ vermelho: tema.perigo, azul: tema.acento, verde: tema.ok, roxo: '#a77bff', preto: tema.fraco } as Record<string, string>)[tinta] ?? tema.perigo;
}

/** O edital como alerta oficial no tablet da AstraTech. */
function editalNoTablet(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx } = pincel;
  const tema = temaAstra(v.tema);
  const cor = corDoAlerta(tema, v.tinta);
  const semente = sementeDe(v.titulo + v.numero);
  emTablet(pincel, tema, v.hora, (area) => {
    const margem = 44;
    const x = area.x + margem;
    const largura = area.largura - margem * 2;
    let y = cabecalhoDeApp(ctx, area, tema, { titulo: v.emissor, subtitulo: v.subtitulo, icone: 'sino', cor });

    const faixa = { x, y: y + 34, largura, altura: 96 };
    ctx.save();
    ctx.globalAlpha = 0.16;
    painel(ctx, faixa, tema, { raio: 20, cor, borda: cor });
    ctx.restore();
    painel(ctx, faixa, tema, { raio: 20, cor: 'transparent', borda: cor });
    icone(ctx, 'alerta', faixa.x + 52, faixa.y + 48, 46, cor);
    fonte(ctx, 'tech', 34, 700);
    espacamento(ctx, 4);
    escrever(ctx, 'ALERTA OFICIAL', faixa.x + 98, faixa.y + 60, 'esquerda', cor);
    espacamento(ctx, 0);
    fonte(ctx, 'digital', 26);
    escrever(ctx, v.numero, faixa.x + faixa.largura - 28, faixa.y + 58, 'direita', tema.texto);

    y = escreverNoQuadro(ctx, v.titulo, {
      x, topo: faixa.y + faixa.altura + 36, largura, altura: 170, maximo: 66, minimo: 34, cor: tema.texto, entrelinha: 1.1,
      montar: (t) => fonte(ctx, 'sans', t, 600),
    });
    const pe = area.y + area.altura;
    const corpoAte = pe - 470;
    escreverNoQuadro(ctx, v.corpo, {
      x, topo: y + 30, largura, altura: corpoAte - y - 30, maximo: 32, minimo: 18, entrelinha: 1.45, cor: tema.texto,
      entreParagrafos: 18, corDaTarja: tema.fraco, montar: (t) => fonte(ctx, 'sans', t, 400),
    });
    fonte(ctx, 'sans', 24, 400);
    escrever(ctx, v.localData, x, corpoAte + 36, 'esquerda', tema.fraco);

    const assinado = { x, y: corpoAte + 66, largura, altura: 190 };
    painel(ctx, assinado, tema, { raio: 22 });
    rotuloDeTela(ctx, 'Assinado digitalmente', x + 32, assinado.y + 48, tema);
    linhaQueCabe(ctx, v.assinante, x + 32, assinado.y + 100, {
      largura: largura - 280, maximo: 36, minimo: 22, alinhamento: 'esquerda', cor: tema.texto, montar: (t) => fonte(ctx, 'sans', t, 600),
    });
    fonte(ctx, 'sans', 24, 400);
    escrever(ctx, v.cargo, x + 32, assinado.y + 138, 'esquerda', tema.fraco);
    if (v.selo.trim()) {
      fonte(ctx, 'digital', 20);
      escrever(ctx, `Selo: ${v.selo.trim().toUpperCase()}`, x + 32, assinado.y + 170, 'esquerda', cor);
    }
    verificado(ctx, x + largura - 230, assinado.y + 50, 16, tema.ok);
    codigoQr(ctx, x + largura - 170, assinado.y + 30, 130, semente, '#0e1b2e', '#ffffff');

    const alturaDoBotao = 76;
    botao(ctx, 'Entendi', { x, y: pe - alturaDoBotao - 40, largura: largura * 0.48, altura: alturaDoBotao }, tema, { cheio: true, cor });
    botao(ctx, 'Compartilhar aviso', { x: x + largura * 0.52, y: pe - alturaDoBotao - 40, largura: largura * 0.48, altura: alturaDoBotao }, tema);
  });
}
