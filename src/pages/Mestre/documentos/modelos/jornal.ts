import { quebrarEmLinhas, type ILinhaDeTexto, type IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, TINTA, TINTA_FRACA, contornoRasgado, desenharLinhas, escrever, escreverNoQuadro, espacamento, fonte,
  imagemCobrindo, linhaQueCabe, papel, sementeDe, traco,
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
    { id: 'jornal', rotulo: 'Nome do jornal', tipo: 'texto', padrao: 'Folha da Dimensão Padrão', maximo: 40 },
    { id: 'edicao', rotulo: 'Edição', tipo: 'texto', padrao: 'Edição de inverno', maximo: 40 },
    { id: 'secao', rotulo: 'Seção', tipo: 'texto', padrao: 'Estradas', maximo: 30 },
    { id: 'pagina', rotulo: 'Página', tipo: 'texto', padrao: 'Página 3', maximo: 20 },
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
    },
  ],
  desenhar: ({ ctx, imagem }, v) => {
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
