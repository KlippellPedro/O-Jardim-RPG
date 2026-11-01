import {
  CAMPO_DE_HORA_NO_TABLET, CAMPO_DE_SUPORTE, CAMPO_DE_TEMA_NO_TABLET, avatar, botao, cabecalhoDeApp, emTablet, icone, noPapel,
  painel, pilula, temaAstra,
} from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  OPCOES_DE_PAPEL, TINTA, contornoRasgado, escrever, escreverNoQuadro, fonte, lacre, linhaQueCabe, papel, sementeDe,
  tomDePapel, traco, vinco, type Familia, type Pincel,
} from '../pincel';

const LARGURA = 1240;
const ALTURA = 1754;
const MARGEM = 150;

/** Tamanho e tinta de cada letra. A mão escreve maior e em tinta azulada. */
const LETRAS: Record<string, { familia: Familia; tamanho: number; entrelinha: number; tinta: string }> = {
  mao: { familia: 'mao', tamanho: 48, entrelinha: 1.22, tinta: '#24284a' },
  antiga: { familia: 'antiga', tamanho: 36, entrelinha: 1.45, tinta: TINTA },
  maquina: { familia: 'maquina', tamanho: 30, entrelinha: 1.55, tinta: '#262321' },
};

export const OPCOES_DE_LETRA = [
  { valor: 'mao', rotulo: 'À mão' },
  { valor: 'antiga', rotulo: 'Tipografia antiga' },
  { valor: 'maquina', rotulo: 'Máquina de escrever' },
];

export const carta: IModeloDeDocumento = {
  id: 'carta',
  nome: 'Carta',
  categoria: 'Cartas e bilhetes',
  icone: 'carta',
  descricao: 'Carta dobrada em três, com lacre de cera e pós-escrito.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 210, altura: 297 },
  campoDoTitulo: 'assinatura',
  campos: [
    CAMPO_DE_SUPORTE,
    { id: 'localData', rotulo: 'Local e data', tipo: 'texto', padrao: 'Ponte Velha, terceiro dia do inverno', maximo: 70 },
    { id: 'saudacao', rotulo: 'Saudação', tipo: 'texto', padrao: 'Querida Helena,', maximo: 60 },
    {
      id: 'corpo', rotulo: 'Texto da carta', tipo: 'paragrafo', linhas: 9, maximo: 2400,
      dica: 'Ponha um trecho entre [[ e ]] para ele sair riscado.',
      padrao: 'Escrevo depressa porque a caravana sai antes do sol. Achei o homem de quem você falou. Ele tem o seu rosto, Helena, até a cicatriz no queixo.\n\nNão confie em quem trouxer esta carta. Se o lacre chegar partido, queime sem ler o resto.\n\nVolto quando a estrada abrir.',
    },
    { id: 'despedida', rotulo: 'Despedida', tipo: 'texto', padrao: 'Com o carinho de sempre,', maximo: 60 },
    { id: 'assinatura', rotulo: 'Assinatura', tipo: 'texto', padrao: 'Tomás', maximo: 40 },
    { id: 'posEscrito', rotulo: 'Pós-escrito', tipo: 'paragrafo', linhas: 2, maximo: 240, padrao: 'P.S.: guarde a chave onde combinamos.' },
    { id: 'letra', rotulo: 'Letra', tipo: 'escolha', padrao: 'mao', opcoes: OPCOES_DE_LETRA, visivel: noPapel },
    {
      id: 'lacre', rotulo: 'Lacre', tipo: 'escolha', padrao: 'vermelho',
      opcoes: [
        { valor: 'vermelho', rotulo: 'Vermelho' },
        { valor: 'verde', rotulo: 'Verde' },
        { valor: 'azul', rotulo: 'Azul' },
        { valor: 'preto', rotulo: 'Preto' },
        { valor: 'dourado', rotulo: 'Dourado' },
        { valor: 'nenhum', rotulo: 'Sem lacre' },
      ],
    },
    { id: 'inicial', rotulo: 'Letra do lacre', tipo: 'texto', padrao: 'T', maximo: 2, visivel: noPapel },
    { id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'envelhecido', opcoes: OPCOES_DE_PAPEL, visivel: noPapel },
    CAMPO_DE_TEMA_NO_TABLET,
    CAMPO_DE_HORA_NO_TABLET,
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'tablet') {
      cartaNoTablet(pincel, v);
      return;
    }
    const { ctx } = pincel;
    const semente = sementeDe(`${v.assinatura}${v.saudacao}`);
    const letra = LETRAS[v.letra] ?? LETRAS.mao;
    const montar = (tamanho: number) => fonte(ctx, letra.familia, tamanho, letra.familia === 'mao' ? 500 : 400);

    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 6, base: 6, esquerda: 6, direita: 6 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: tomDePapel(v.papel), semente, manchas: 4, bordas: 0.28 });
    vinco(ctx, 0, ALTURA / 3, LARGURA, ALTURA / 3);
    vinco(ctx, 0, (ALTURA * 2) / 3, LARGURA, (ALTURA * 2) / 3);

    ctx.fillStyle = letra.tinta;
    montar(letra.tamanho * 0.85);
    escrever(ctx, v.localData, LARGURA - MARGEM, 220, 'direita');
    montar(letra.tamanho);
    escrever(ctx, v.saudacao, MARGEM, 330, 'esquerda');

    const reservaFinal = 460;
    const pe = escreverNoQuadro(ctx, v.corpo, {
      x: MARGEM, topo: 370, largura: LARGURA - MARGEM * 2, altura: ALTURA - 370 - reservaFinal,
      maximo: letra.tamanho, minimo: Math.round(letra.tamanho * 0.6), entrelinha: letra.entrelinha,
      alinhamento: letra.familia === 'antiga' ? 'justificado' : 'esquerda', cor: letra.tinta, montar,
      tarja: 'rabisco', entreParagrafos: letra.tamanho * 0.5,
    });

    const despedidaY = Math.min(pe + 70, ALTURA - reservaFinal + 70);
    montar(letra.tamanho);
    escrever(ctx, v.despedida, LARGURA - MARGEM - 380, despedidaY, 'esquerda', letra.tinta);
    ctx.save();
    ctx.translate(LARGURA - MARGEM - 200, despedidaY + 100);
    ctx.rotate(-0.05);
    linhaQueCabe(ctx, v.assinatura, 0, 0, {
      largura: 420, maximo: 86, minimo: 40, cor: '#1f2550', montar: (t) => fonte(ctx, 'mao', t, 700),
    });
    ctx.restore();
    if (v.assinatura.trim()) {
      ctx.save();
      ctx.strokeStyle = '#1f2550';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(LARGURA - MARGEM - 380, despedidaY + 126);
      ctx.bezierCurveTo(LARGURA - MARGEM - 240, despedidaY + 140, LARGURA - MARGEM - 120, despedidaY + 110, LARGURA - MARGEM, despedidaY + 122);
      ctx.stroke();
      ctx.restore();
    }

    escreverNoQuadro(ctx, v.posEscrito, {
      x: MARGEM, topo: ALTURA - 200, largura: LARGURA - MARGEM * 2 - 320, altura: 112,
      maximo: Math.round(letra.tamanho * 0.85), minimo: Math.round(letra.tamanho * 0.55), entrelinha: letra.entrelinha,
      cor: letra.tinta, montar, tarja: 'rabisco',
    });

    if (v.lacre !== 'nenhum') lacre(ctx, LARGURA - 210, ALTURA - 130, 92, v.lacre, v.inicial, semente);
    ctx.restore();
  },
};

/** A carta como mensagem aberta no tablet da AstraTech. O lacre vira mensagem selada. */
function cartaNoTablet(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx } = pincel;
  const tema = temaAstra(v.tema);
  const corDoSelo = ({ vermelho: tema.perigo, verde: tema.ok, azul: tema.acento, preto: tema.fraco, dourado: tema.alerta } as Record<string, string>)[v.lacre];
  emTablet(pincel, tema, v.hora, (area) => {
    const margem = 44;
    const x = area.x + margem;
    const largura = area.largura - margem * 2;
    cabecalhoDeApp(ctx, area, tema, { titulo: 'Mensagens', subtitulo: 'Caixa de entrada', icone: 'mensagem' });

    const cartao = { x, y: 300, largura, altura: area.y + area.altura - 300 - 150 };
    painel(ctx, cartao, tema, { raio: 26 });
    const dentro = x + 36;
    const larguraDentro = largura - 72;
    avatar(ctx, dentro + 38, cartao.y + 74, 38, null, v.assinatura, tema.acento);
    linhaQueCabe(ctx, v.assinatura || 'Sem remetente', dentro + 96, cartao.y + 68, {
      largura: larguraDentro - 340, maximo: 32, minimo: 20, alinhamento: 'esquerda', cor: tema.texto, montar: (t) => fonte(ctx, 'sans', t, 600),
    });
    linhaQueCabe(ctx, v.localData, dentro + 96, cartao.y + 104, {
      largura: larguraDentro - 340, maximo: 22, minimo: 16, alinhamento: 'esquerda', cor: tema.fraco, montar: (t) => fonte(ctx, 'sans', t, 400),
    });
    if (corDoSelo) {
      const larguraDaPilula = pilula(ctx, 'Mensagem selada', dentro + larguraDentro, cartao.y + 74, { cor: corDoSelo, alinhamento: 'direita', tamanho: 20 });
      icone(ctx, 'cadeado', dentro + larguraDentro - larguraDaPilula - 26, cartao.y + 74, 28, corDoSelo);
    }
    traco(ctx, dentro, cartao.y + 140, dentro + larguraDentro, cartao.y + 140, tema.linha, 2);

    fonte(ctx, 'sans', 32, 600);
    escrever(ctx, v.saudacao, dentro, cartao.y + 200, 'esquerda', tema.texto);
    const fimDoCartao = cartao.y + cartao.altura;
    const temPs = v.posEscrito.trim().length > 0;
    const pe = escreverNoQuadro(ctx, v.corpo, {
      x: dentro, topo: cartao.y + 226, largura: larguraDentro, altura: fimDoCartao - cartao.y - 226 - (temPs ? 260 : 170),
      maximo: 30, minimo: 17, entrelinha: 1.5, entreParagrafos: 16, cor: tema.texto, corDaTarja: tema.fraco,
      montar: (t) => fonte(ctx, 'sans', t, 400),
    });
    fonte(ctx, 'sans', 28, 400);
    escrever(ctx, v.despedida, dentro, pe + 48, 'esquerda', tema.texto);
    fonte(ctx, 'sans', 30, 600);
    escrever(ctx, v.assinatura, dentro, pe + 92, 'esquerda', tema.texto);
    if (temPs) {
      escreverNoQuadro(ctx, v.posEscrito, {
        x: dentro, topo: fimDoCartao - 120, largura: larguraDentro, altura: 90, maximo: 24, minimo: 16, cor: tema.fraco, entrelinha: 1.35,
        montar: (t) => fonte(ctx, 'sans', t, 400, true),
      });
    }
    const alturaDoBotao = 72;
    const fim = area.y + area.altura;
    botao(ctx, 'Responder', { x, y: fim - alturaDoBotao - 40, largura: largura * 0.48, altura: alturaDoBotao }, tema, { cheio: true });
    botao(ctx, 'Encaminhar', { x: x + largura * 0.52, y: fim - alturaDoBotao - 40, largura: largura * 0.48, altura: alturaDoBotao }, tema);
  });
}
