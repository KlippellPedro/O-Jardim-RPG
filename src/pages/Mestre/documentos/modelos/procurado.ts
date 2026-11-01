import {
  CAMPO_DE_HORA_NO_TABLET, CAMPO_DE_SUPORTE, CAMPO_DE_TEMA_NO_TABLET, botao, cabecalhoDeApp, emTablet, icone, noPapel, painel,
  pilula, rotuloDeTela, temaAstra, varredura, verificado,
} from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  OPCOES_DE_PAPEL, TINTA, TINTA_FRACA, carimbo, contornoRasgado, escrever, escreverNoQuadro, espacamento, fonte, furo,
  imagemCobrindo, linhaQueCabe, papel, seloRedondo, sementeDe, tomDePapel, traco, vulto, type Pincel,
} from '../pincel';

const LARGURA = 1240;
const ALTURA = 1754;
const VERMELHO = '#5c1a14';

const MARCAS: Record<string, [string, string]> = {
  urgente: ['URGENTE', '#8a1f1a'],
  capturado: ['CAPTURADO', '#8a1f1a'],
  morto: ['MORTO', '#1f1c1a'],
  cancelado: ['CANCELADO', '#1f1c1a'],
};

export const cartazDeProcurado: IModeloDeDocumento = {
  id: 'procurado',
  nome: 'Cartaz de procurado',
  categoria: 'Cartazes',
  icone: 'procurado',
  descricao: 'O aviso pregado no quadro da Guilda, com retrato, acusação e recompensa.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 210, altura: 297 },
  campoDoTitulo: 'nome',
  campos: [
    CAMPO_DE_SUPORTE,
    { id: 'emissor', rotulo: 'Quem emite', tipo: 'texto', padrao: 'Guilda dos Caçadores · quadro de procurados', maximo: 70 },
    { id: 'titulo', rotulo: 'Título', tipo: 'texto', padrao: 'Procurado', maximo: 18, dica: 'Também serve Desaparecido, Recompensa, Cuidado...' },
    { id: 'condicao', rotulo: 'Condição', tipo: 'texto', padrao: 'Vivo ou morto', maximo: 40 },
    { id: 'retrato', rotulo: 'Retrato', tipo: 'imagem', padrao: '' },
    { id: 'semRetrato', rotulo: 'Texto quando não há retrato', tipo: 'texto', padrao: 'Sem retrato conhecido', maximo: 60 },
    { id: 'nome', rotulo: 'Nome ou apelido', tipo: 'texto', padrao: 'Corvo de Três Dedos', maximo: 50 },
    {
      id: 'acusacao', rotulo: 'Acusação', tipo: 'paragrafo', linhas: 3, maximo: 320,
      padrao: 'Assalto a duas carroças do Banco Lunar na estrada baixa. Feriu um guarda e fugiu a pé pela mata, levando a caixa de selos.',
    },
    { id: 'recompensa', rotulo: 'Recompensa', tipo: 'texto', padrao: '4.500', maximo: 20 },
    { id: 'moeda', rotulo: 'Moeda', tipo: 'texto', padrao: 'Lunaris', maximo: 20 },
    {
      id: 'rodape', rotulo: 'Instruções', tipo: 'paragrafo', linhas: 2, maximo: 180,
      padrao: 'Entregue o procurado em qualquer posto da Guilda. A Guilda paga depois de conferir a entrega.',
    },
    { id: 'selo', rotulo: 'Texto do selo', tipo: 'texto', padrao: 'Guilda dos Caçadores', maximo: 40, dica: 'Deixe vazio para tirar o selo.' },
    {
      id: 'marca', rotulo: 'Carimbo por cima', tipo: 'escolha', padrao: 'nenhum',
      opcoes: [
        { valor: 'nenhum', rotulo: 'Nenhum' },
        { valor: 'urgente', rotulo: 'Urgente' },
        { valor: 'capturado', rotulo: 'Capturado' },
        { valor: 'morto', rotulo: 'Morto' },
        { valor: 'cancelado', rotulo: 'Cancelado' },
      ],
    },
    { id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'envelhecido', opcoes: OPCOES_DE_PAPEL, visivel: noPapel },
    CAMPO_DE_TEMA_NO_TABLET,
    CAMPO_DE_HORA_NO_TABLET,
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'tablet') {
      procuradoNoTablet(pincel, v);
      return;
    }
    const { ctx, imagem } = pincel;
    const semente = sementeDe(`${v.nome}${v.titulo}`);
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 34, base: 40, esquerda: 10, direita: 10 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: tomDePapel(v.papel), semente, manchas: 5, bordas: 0.36 });
    furo(ctx, 130, 92);
    furo(ctx, LARGURA - 130, 92);

    fonte(ctx, 'antiga', 30);
    espacamento(ctx, 6);
    linhaQueCabe(ctx, v.emissor.toUpperCase(), LARGURA / 2, 172, {
      largura: LARGURA - 300, maximo: 30, minimo: 20, cor: TINTA_FRACA,
      montar: (t) => { fonte(ctx, 'antiga', t); espacamento(ctx, t * 0.2); },
    });
    espacamento(ctx, 0);
    traco(ctx, 110, 200, LARGURA - 110, 200, VERMELHO, 7);
    traco(ctx, 110, 214, LARGURA - 110, 214, VERMELHO, 2);

    linhaQueCabe(ctx, v.titulo.toUpperCase(), LARGURA / 2, 382, {
      largura: LARGURA - 220, maximo: 190, minimo: 80, cor: '#3b1410',
      montar: (t) => { fonte(ctx, 'titulo', t, 700); espacamento(ctx, t * 0.05); },
    });
    espacamento(ctx, 0);
    traco(ctx, 110, 418, LARGURA - 110, 418, VERMELHO, 2);
    traco(ctx, 110, 432, LARGURA - 110, 432, VERMELHO, 7);

    linhaQueCabe(ctx, v.condicao.toUpperCase(), LARGURA / 2, 494, {
      largura: LARGURA - 260, maximo: 40, minimo: 24, cor: VERMELHO,
      montar: (t) => { fonte(ctx, 'antiga', t); espacamento(ctx, t * 0.32); },
    });
    espacamento(ctx, 0);

    // Retrato
    const lado = 540;
    const rx = (LARGURA - lado) / 2;
    const ry = 536;
    ctx.save();
    ctx.translate(LARGURA / 2, ry + lado / 2);
    ctx.rotate(-0.012);
    ctx.translate(-LARGURA / 2, -(ry + lado / 2));
    ctx.shadowColor = 'rgba(40, 25, 10, 0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(rx, ry, lado, lado);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#efe5cc';
    ctx.fillRect(rx + 16, ry + 16, lado - 32, lado - 32);
    const retrato = imagem('retrato');
    if (retrato) {
      imagemCobrindo(ctx, retrato, rx + 28, ry + 28, lado - 56, lado - 56, { foco: 'topo', filtro: 'grayscale(55%) sepia(40%) contrast(1.08)' });
    } else {
      ctx.fillStyle = '#e0d2ab';
      ctx.fillRect(rx + 28, ry + 28, lado - 56, lado - 56);
      vulto(ctx, rx + 28, ry + 28, lado - 56, lado - 56, 'rgba(70, 52, 28, 0.28)');
      escreverNoQuadro(ctx, v.semRetrato, {
        x: rx + 60, topo: ry + 36, largura: lado - 120, altura: 120, maximo: 34, minimo: 22, meio: true,
        alinhamento: 'centro', cor: TINTA_FRACA, montar: (t) => fonte(ctx, 'antiga', t, 400, true),
      });
    }
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.arc(LARGURA / 2, ry - 4, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (v.selo.trim()) seloRedondo(ctx, rx + 40, ry + lado - 20, 96, { texto: v.selo, cor: VERMELHO, semente, angulo: -0.35 });

    linhaQueCabe(ctx, v.nome, LARGURA / 2, 1170, {
      largura: LARGURA - 200, maximo: 104, minimo: 44, cor: TINTA, montar: (t) => fonte(ctx, 'titulo', t, 700),
    });

    escreverNoQuadro(ctx, v.acusacao, {
      x: 150, topo: 1196, largura: LARGURA - 300, altura: 176, maximo: 38, minimo: 24, alinhamento: 'centro',
      cor: '#3a2f1c', montar: (t) => fonte(ctx, 'antiga', t, 400, true), entrelinha: 1.3,
    });

    traco(ctx, 200, 1398, LARGURA - 200, 1398, 'rgba(90, 74, 47, 0.5)', 3, [14, 10]);
    fonte(ctx, 'antiga', 34);
    espacamento(ctx, 14);
    escrever(ctx, 'RECOMPENSA', LARGURA / 2, 1460, 'centro', VERMELHO);
    espacamento(ctx, 0);

    // Valor grande e moeda menor, centralizados juntos.
    let tamanho = 124;
    const medir = () => {
      fonte(ctx, 'titulo', tamanho, 700);
      const valor = ctx.measureText(v.recompensa).width;
      fonte(ctx, 'titulo', tamanho * 0.42, 700);
      return { valor, moeda: v.moeda ? ctx.measureText(` ${v.moeda}`).width : 0 };
    };
    let medida = medir();
    while (tamanho > 50 && medida.valor + medida.moeda > LARGURA - 240) {
      tamanho -= 4;
      medida = medir();
    }
    const inicio = (LARGURA - medida.valor - medida.moeda) / 2;
    fonte(ctx, 'titulo', tamanho, 700);
    escrever(ctx, v.recompensa, inicio, 1580, 'esquerda', VERMELHO);
    fonte(ctx, 'titulo', tamanho * 0.42, 700);
    escrever(ctx, v.moeda ? ` ${v.moeda}` : '', inicio + medida.valor, 1580, 'esquerda', VERMELHO);

    escreverNoQuadro(ctx, v.rodape, {
      x: 170, topo: 1606, largura: LARGURA - 340, altura: 80, maximo: 28, minimo: 20, alinhamento: 'centro',
      cor: TINTA_FRACA, montar: (t) => fonte(ctx, 'antiga', t), entrelinha: 1.25,
    });

    const marca = MARCAS[v.marca];
    if (marca) carimbo(ctx, marca[0], LARGURA / 2, ry + lado / 2 + 10, { cor: marca[1], tamanho: 130, angulo: -0.32, semente, larguraMaxima: 860 });
    ctx.restore();
  },
};

/** O quadro de procurados no tablet da AstraTech: a mesma ficha, em tela. */
function procuradoNoTablet(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx, imagem } = pincel;
  const tema = temaAstra(v.tema);
  emTablet(pincel, tema, v.hora, (area) => {
    const margem = 44;
    const x = area.x + margem;
    const largura = area.largura - margem * 2;
    // "Guilda dos Caçadores · quadro de procurados": o nome vai no título e o resto no subtítulo.
    const [quem, ...onde] = v.emissor.split('·').map((parte) => parte.trim());
    cabecalhoDeApp(ctx, area, tema, { titulo: quem || v.emissor, subtitulo: onde.join(' · ') || 'Quadro de procurados', icone: 'escudo', cor: tema.perigo });

    const marca = MARCAS[v.marca];
    const larguraDoStatus = pilula(ctx, marca ? marca[0] : 'Ativo', x + largura, 330, {
      cor: marca ? tema.perigo : tema.ok, tamanho: 22, alinhamento: 'direita',
    });
    linhaQueCabe(ctx, v.titulo.toUpperCase(), x, 352, {
      largura: largura - larguraDoStatus - 30, maximo: 78, minimo: 36, alinhamento: 'esquerda', cor: tema.perigo,
      montar: (t) => fonte(ctx, 'tech', t, 700),
    });
    fonte(ctx, 'sans', 26, 500);
    escrever(ctx, v.condicao, x, 396, 'esquerda', tema.fraco);

    // Retrato
    const retrato = { x, y: 430, largura: 430, altura: 520 };
    painel(ctx, retrato, tema, { raio: 18, cor: tema.painel2, borda: tema.perigo, brilho: true });
    const foto = imagem('retrato');
    const dentro = { x: retrato.x + 10, y: retrato.y + 10, largura: retrato.largura - 20, altura: retrato.altura - 20 };
    if (foto) {
      imagemCobrindo(ctx, foto, dentro.x, dentro.y, dentro.largura, dentro.altura, { foco: 'topo', filtro: 'saturate(0.85) contrast(1.06)' });
      varredura(ctx, dentro, 0.1);
    } else {
      vulto(ctx, dentro.x, dentro.y, dentro.largura, dentro.altura, tema.linha);
      escreverNoQuadro(ctx, v.semRetrato, {
        x: dentro.x + 20, topo: dentro.y + 20, largura: dentro.largura - 40, altura: 90, maximo: 26, minimo: 18, meio: true,
        alinhamento: 'centro', cor: tema.fraco, montar: (t) => fonte(ctx, 'sans', t, 500),
      });
    }
    if (marca) {
      ctx.save();
      ctx.translate(retrato.x + retrato.largura / 2, retrato.y + retrato.altura / 2);
      ctx.rotate(-0.42);
      ctx.fillStyle = 'rgba(255, 77, 94, 0.88)';
      ctx.fillRect(-340, -42, 680, 84);
      fonte(ctx, 'tech', 46, 700);
      espacamento(ctx, 6);
      ctx.textBaseline = 'middle';
      escrever(ctx, marca[0], 0, 2, 'centro', '#ffffff');
      ctx.textBaseline = 'alphabetic';
      espacamento(ctx, 0);
      ctx.restore();
    }

    // Ficha ao lado do retrato
    const cx = x + retrato.largura + 40;
    const larguraDaFicha = largura - retrato.largura - 40;
    rotuloDeTela(ctx, 'Nome', cx, 458, tema);
    escreverNoQuadro(ctx, v.nome, {
      x: cx, topo: 470, largura: larguraDaFicha, altura: 140, maximo: 54, minimo: 28, cor: tema.texto, entrelinha: 1.12,
      montar: (t) => fonte(ctx, 'sans', t, 600),
    });
    rotuloDeTela(ctx, 'Acusação', cx, 650, tema);
    escreverNoQuadro(ctx, v.acusacao, {
      x: cx, topo: 664, largura: larguraDaFicha, altura: 286, maximo: 30, minimo: 18, cor: tema.texto, entrelinha: 1.4,
      montar: (t) => fonte(ctx, 'sans', t, 400),
    });

    // Recompensa
    const caixa = { x, y: 990, largura, altura: 200 };
    painel(ctx, caixa, tema, { raio: 22, borda: tema.alerta });
    rotuloDeTela(ctx, 'Recompensa', x + largura / 2, 1040, tema, 'centro');
    linhaQueCabe(ctx, `${v.recompensa} ${v.moeda}`.trim(), x + largura / 2, 1140, {
      largura: largura - 80, maximo: 88, minimo: 40, cor: tema.alerta, montar: (t) => fonte(ctx, 'tech', t, 700),
    });

    escreverNoQuadro(ctx, v.rodape, {
      x, topo: 1220, largura, altura: 90, maximo: 26, minimo: 18, cor: tema.fraco, entrelinha: 1.35, alinhamento: 'centro',
      montar: (t) => fonte(ctx, 'sans', t, 400),
    });
    if (v.selo.trim()) {
      icone(ctx, 'escudo', x + 18, 1350, 30, tema.acento);
      fonte(ctx, 'sans', 24, 500);
      escrever(ctx, `Emitido por ${v.selo.trim()}`, x + 46, 1359, 'esquerda', tema.texto);
      const largo = ctx.measureText(`Emitido por ${v.selo.trim()}`).width;
      verificado(ctx, x + 46 + largo + 22, 1350, 13, tema.acento);
    }
    const alturaDoBotao = 76;
    const pe = area.y + area.altura - alturaDoBotao - 40;
    botao(ctx, 'Aceitar contrato', { x, y: pe, largura: largura * 0.58, altura: alturaDoBotao }, tema, { cheio: true, cor: tema.perigo });
    botao(ctx, 'Compartilhar', { x: x + largura * 0.62, y: pe, largura: largura * 0.38, altura: alturaDoBotao }, tema);
  });
}
