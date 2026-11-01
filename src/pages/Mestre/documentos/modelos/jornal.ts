import {
  CAMPO_DE_HORA_NO_TABLET, CAMPO_DE_SUPORTE, CAMPO_DE_TEMA_NO_TABLET, avatar, botao, cabecalhoDeApp, emTablet, noPapel, pilula,
  temaAstra,
} from '../aparelho';
import { quebrarEmLinhas, type ILinhaDeTexto, type IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, TINTA, TINTA_FRACA, contornoRasgado, desenharLinhas, escrever, escreverNoQuadro, espacamento, fonte,
  imagemCobrindo, linhaQueCabe, papel, retanguloArredondado, sementeDe, traco, type Pincel,
} from '../pincel';

const LARGURA = 1240;
const ALTURA = 1640;
const MARGEM = 90;
const VAO = 44;

export const recorteDeJornal: IModeloDeDocumento = {
  id: 'jornal',
  nome: 'Recorte de jornal',
  categoria: 'Imprensa',
  icone: 'jornal',
  descricao: 'Matéria recortada da folha, com manchete, foto e texto em duas colunas.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 190, altura: 251 },
  campoDoTitulo: 'manchete',
  campos: [
    CAMPO_DE_SUPORTE,
    { id: 'jornal', rotulo: 'Nome do jornal', tipo: 'texto', padrao: 'Folha da Dimensão Padrão', maximo: 40 },
    { id: 'edicao', rotulo: 'Edição', tipo: 'texto', padrao: 'Edição de inverno', maximo: 40 },
    { id: 'secao', rotulo: 'Seção', tipo: 'texto', padrao: 'Estradas', maximo: 30 },
    { id: 'pagina', rotulo: 'Página', tipo: 'texto', padrao: 'Página 3', maximo: 20, visivel: noPapel },
    { id: 'manchete', rotulo: 'Manchete', tipo: 'texto', padrao: 'Carroças do Banco Lunar somem na estrada baixa', maximo: 110 },
    {
      id: 'linhaFina', rotulo: 'Linha fina', tipo: 'paragrafo', linhas: 2, maximo: 240,
      padrao: 'Guarda ferido diz que os assaltantes sabiam o horário da passagem. O Banco não informa o valor levado.',
    },
    { id: 'imagem', rotulo: 'Foto (opcional)', tipo: 'imagem', padrao: '' },
    { id: 'legenda', rotulo: 'Legenda da foto', tipo: 'texto', padrao: 'A estrada baixa na manhã seguinte ao assalto.', maximo: 100 },
    {
      id: 'texto', rotulo: 'Texto da matéria', tipo: 'paragrafo', linhas: 10, maximo: 4000,
      dica: 'Ponha um trecho entre [[ e ]] para ele sair tarjado.',
      padrao: 'Duas carroças do Banco Lunar que seguiam para a agência da fronteira não chegaram ao destino. Os cavalos foram achados soltos no fim da tarde, ainda arreados, a meio dia de viagem da última parada.\n\nO único guarda encontrado com vida contou que o grupo atacou na curva do rio, onde a estrada estreita, e que ninguém hesitou na hora de escolher qual carroça abrir primeiro. Ele está sob os cuidados da Ordem do Lume e não quis dar o nome.\n\nProcurado por esta Folha, o Banco Lunar disse que os clientes não terão prejuízo e que já trata do assunto com a Guilda dos Caçadores. Moradores da estrada baixa contam que viram, na mesma semana, um homem de mão enfaixada pagando bebida para os cocheiros na estalagem do vau.',
    },
    { id: 'autor', rotulo: 'Assinatura da matéria', tipo: 'texto', padrao: 'Da redação', maximo: 50 },
    {
      id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'jornal',
      opcoes: [{ valor: 'jornal', rotulo: 'Jornal' }, { valor: 'envelhecido', rotulo: 'Amarelado' }],
      visivel: noPapel,
    },
    CAMPO_DE_TEMA_NO_TABLET,
    CAMPO_DE_HORA_NO_TABLET,
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'tablet') {
      jornalNoTablet(pincel, v);
      return;
    }
    const { ctx, imagem } = pincel;
    const semente = sementeDe(v.manchete);
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 14, base: 22, esquerda: 16, direita: 16 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: v.papel === 'envelhecido' ? PAPEIS.envelhecido : PAPEIS.jornal, semente, manchas: 3, bordas: 0.22, grao: 1 });

    linhaQueCabe(ctx, v.jornal, LARGURA / 2, 156, {
      largura: LARGURA - MARGEM * 2, maximo: 104, minimo: 48, cor: '#151413', montar: (t) => fonte(ctx, 'gotica', t),
    });
    traco(ctx, MARGEM, 190, LARGURA - MARGEM, 190, '#151413', 4);
    traco(ctx, MARGEM, 199, LARGURA - MARGEM, 199, '#151413', 1.5);
    fonte(ctx, 'antiga', 22);
    espacamento(ctx, 4);
    escrever(ctx, v.edicao.toUpperCase(), MARGEM, 232, 'esquerda', '#2b2925');
    escrever(ctx, v.secao.toUpperCase(), LARGURA / 2, 232, 'centro', '#2b2925');
    escrever(ctx, v.pagina.toUpperCase(), LARGURA - MARGEM, 232, 'direita', '#2b2925');
    espacamento(ctx, 0);
    traco(ctx, MARGEM, 250, LARGURA - MARGEM, 250, '#151413', 1.5);

    let y = escreverNoQuadro(ctx, v.manchete, {
      x: MARGEM, topo: 274, largura: LARGURA - MARGEM * 2, altura: 250, maximo: 88, minimo: 46, alinhamento: 'centro',
      cor: '#121110', entrelinha: 1.08, montar: (t) => fonte(ctx, 'corpo', t, 700),
    });
    y = escreverNoQuadro(ctx, v.linhaFina, {
      x: MARGEM + 60, topo: y + 14, largura: LARGURA - (MARGEM + 60) * 2, altura: 110, maximo: 34, minimo: 22,
      alinhamento: 'centro', cor: '#2b2925', entrelinha: 1.3, montar: (t) => fonte(ctx, 'antiga', t, 400, true),
    });
    traco(ctx, MARGEM + 300, y + 22, LARGURA - MARGEM - 300, y + 22, '#151413', 1.5);
    y += 46;

    const foto = imagem('imagem');
    if (foto) {
      const alturaDaFoto = 430;
      ctx.fillStyle = '#c9c3b2';
      ctx.fillRect(MARGEM, y, LARGURA - MARGEM * 2, alturaDaFoto);
      imagemCobrindo(ctx, foto, MARGEM, y, LARGURA - MARGEM * 2, alturaDaFoto, { filtro: 'grayscale(100%) contrast(1.15) brightness(1.04)' });
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(214, 205, 182, 0.45)';
      ctx.fillRect(MARGEM, y, LARGURA - MARGEM * 2, alturaDaFoto);
      ctx.restore();
      y += alturaDaFoto + 34;
      if (v.legenda.trim()) {
        fonte(ctx, 'antiga', 23, 400, true);
        escrever(ctx, v.legenda, MARGEM, y, 'esquerda', TINTA_FRACA);
        y += 22;
      }
      y += 18;
    }

    // Texto em duas colunas justificadas; a fonte encolhe até a matéria inteira caber.
    const larguraDaColuna = (LARGURA - MARGEM * 2 - VAO) / 2;
    const fim = ALTURA - 90;
    let tamanho = 29;
    let linhas: ILinhaDeTexto[] = [];
    let porColuna = 0;
    const assinatura = v.autor.trim() ? 1 : 0;
    for (;;) {
      fonte(ctx, 'antiga', tamanho);
      linhas = quebrarEmLinhas(v.texto, larguraDaColuna, (t) => ctx.measureText(t).width);
      porColuna = Math.max(1, Math.floor((fim - y) / (tamanho * 1.3)));
      if (linhas.length + assinatura <= porColuna * 2 || tamanho <= 18) break;
      tamanho -= 1;
    }
    const alturaDaLinha = tamanho * 1.3;
    // As colunas saem com a mesma altura; só uma matéria que enche a página usa a coluna inteira.
    const naPrimeira = Math.min(porColuna, Math.ceil((linhas.length + assinatura) / 2));
    const primeira = linhas.slice(0, naPrimeira);
    const segunda = linhas.slice(naPrimeira, naPrimeira + porColuna);
    fonte(ctx, 'antiga', tamanho);
    desenharLinhas(ctx, primeira, { x: MARGEM, y: y + tamanho, largura: larguraDaColuna, alturaDaLinha, alinhamento: 'justificado', cor: TINTA });
    const peDaSegunda = desenharLinhas(ctx, segunda, {
      x: MARGEM + larguraDaColuna + VAO, y: y + tamanho, largura: larguraDaColuna, alturaDaLinha, alinhamento: 'justificado', cor: TINTA,
    });
    const usadas = Math.max(primeira.length, segunda.length);
    traco(ctx, LARGURA / 2, y, LARGURA / 2, y + usadas * alturaDaLinha, 'rgba(20, 19, 18, 0.5)', 1.5);
    if (assinatura && linhas.length <= naPrimeira + porColuna) {
      fonte(ctx, 'antiga', tamanho, 400, true);
      const colunaDaAssinatura = segunda.length ? MARGEM + larguraDaColuna + VAO + larguraDaColuna : MARGEM + larguraDaColuna;
      escrever(ctx, v.autor, colunaDaAssinatura, segunda.length ? peDaSegunda : y + tamanho + primeira.length * alturaDaLinha, 'direita', TINTA_FRACA);
    }
    ctx.restore();
  },
};

/** A matéria no portal da folha, aberta no tablet da AstraTech. */
function jornalNoTablet(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx, imagem } = pincel;
  const tema = temaAstra(v.tema);
  emTablet(pincel, tema, v.hora, (area) => {
    const margem = 50;
    const x = area.x + margem;
    const largura = area.largura - margem * 2;
    cabecalhoDeApp(ctx, area, tema, { titulo: v.jornal, subtitulo: v.edicao, icone: 'documento' });
    let y = 318;
    if (v.secao.trim()) pilula(ctx, v.secao, x, y, { cor: tema.acento, fundo: tema.painel2, contorno: true });
    fonte(ctx, 'sans', 22, 400);
    escrever(ctx, `Publicado às ${v.hora || '21:47'}`, x + largura, y + 8, 'direita', tema.fraco);

    y = escreverNoQuadro(ctx, v.manchete, {
      x, topo: y + 36, largura, altura: 230, maximo: 62, minimo: 34, cor: tema.texto, entrelinha: 1.12, montar: (t) => fonte(ctx, 'sans', t, 600),
    });
    y = escreverNoQuadro(ctx, v.linhaFina, {
      x, topo: y + 14, largura, altura: 120, maximo: 30, minimo: 20, cor: tema.fraco, entrelinha: 1.35, montar: (t) => fonte(ctx, 'sans', t, 400),
    });
    if (v.autor.trim()) {
      avatar(ctx, x + 24, y + 44, 24, null, v.autor, tema.acento);
      fonte(ctx, 'sans', 24, 600);
      escrever(ctx, v.autor, x + 62, y + 53, 'esquerda', tema.texto);
      y += 88;
    } else {
      y += 24;
    }

    const foto = imagem('imagem');
    if (foto) {
      const alturaDaFoto = 470;
      ctx.save();
      retanguloArredondado(ctx, x, y, largura, alturaDaFoto, 20);
      ctx.clip();
      ctx.fillStyle = tema.painel2;
      ctx.fillRect(x, y, largura, alturaDaFoto);
      imagemCobrindo(ctx, foto, x, y, largura, alturaDaFoto);
      ctx.restore();
      y += alturaDaFoto + 34;
      if (v.legenda.trim()) {
        fonte(ctx, 'sans', 21, 400, true);
        escrever(ctx, v.legenda, x, y, 'esquerda', tema.fraco);
        y += 20;
      }
      y += 16;
    }
    const pe = area.y + area.altura;
    escreverNoQuadro(ctx, v.texto, {
      x, topo: y, largura, altura: pe - 150 - y, maximo: 27, minimo: 16, cor: tema.texto, entrelinha: 1.5, entreParagrafos: 14,
      corDaTarja: tema.fraco, montar: (t) => fonte(ctx, 'sans', t, 400),
    });
    const alturaDoBotao = 72;
    botao(ctx, 'Compartilhar', { x, y: pe - alturaDoBotao - 40, largura: largura * 0.48, altura: alturaDoBotao }, tema, { cheio: true });
    botao(ctx, 'Salvar para depois', { x: x + largura * 0.52, y: pe - alturaDoBotao - 40, largura: largura * 0.48, altura: alturaDoBotao }, tema);
  });
}
