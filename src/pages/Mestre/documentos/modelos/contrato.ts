import { itensDaLista, quebrarEmLinhas, type IModeloDeDocumento } from '../modelo';
import {
  OPCOES_DE_PAPEL, TINTA, TINTA_APAGADA, TINTA_FRACA, assinatura, carimbo, contornoRasgado, desenharLinhas, escrever,
  escreverNoQuadro, espacamento, fonte, linhaQueCabe, papel, seloRedondo, sementeDe, tomDePapel, traco,
} from '../pincel';

const LARGURA = 1240;
const ALTURA = 1754;
const MARGEM = 130;

const ESTADOS: Record<string, { carimbo: string; cor: string; assinado: boolean }> = {
  aberto: { carimbo: 'EM ABERTO', cor: '#24407a', assinado: false },
  firmado: { carimbo: 'FIRMADO', cor: '#8a1f1a', assinado: true },
  cumprido: { carimbo: 'CUMPRIDO', cor: '#2f5a2a', assinado: true },
  cancelado: { carimbo: 'CANCELADO', cor: '#1f1c1a', assinado: true },
};

export const contrato: IModeloDeDocumento = {
  id: 'contrato',
  nome: 'Contrato',
  categoria: 'Papéis oficiais',
  icone: 'contrato',
  descricao: 'Contrato de serviço datilografado, com cláusulas numeradas, assinaturas e carimbo do andamento.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 210, altura: 297 },
  campoDoTitulo: 'servico',
  campos: [
    { id: 'emissor', rotulo: 'Quem registra', tipo: 'texto', padrao: 'Guilda dos Caçadores', maximo: 50 },
    { id: 'subtitulo', rotulo: 'Repartição', tipo: 'texto', padrao: 'Quadro de contratos', maximo: 50 },
    { id: 'numero', rotulo: 'Número', tipo: 'texto', padrao: 'Contrato 0213', maximo: 30 },
    { id: 'servico', rotulo: 'Serviço', tipo: 'texto', padrao: 'Escolta de carga até o Posto da Encosta', maximo: 90 },
    { id: 'contratante', rotulo: 'Contratante', tipo: 'texto', padrao: 'Abel Siqueira, dono de armazém', maximo: 60 },
    { id: 'contratado', rotulo: 'Contratado', tipo: 'texto', padrao: 'Em aberto', maximo: 60 },
    { id: 'pagamento', rotulo: 'Pagamento', tipo: 'texto', padrao: '1.200 Lunaris, metade na saída', maximo: 60 },
    { id: 'prazo', rotulo: 'Prazo', tipo: 'texto', padrao: 'Doze dias a partir da assinatura', maximo: 60 },
    {
      id: 'clausulas', rotulo: 'Cláusulas', tipo: 'paragrafo', linhas: 6, maximo: 1600,
      dica: 'Uma cláusula por linha. A numeração sai sozinha.',
      padrao: 'A carga segue lacrada e ninguém abre os baús no caminho.\nPerda de carga desconta do pagamento pelo valor declarado.\nA Guilda paga depois de conferir a entrega.\nQuem desistir no caminho devolve o adiantamento.',
    },
    { id: 'observacao', rotulo: 'Observação', tipo: 'paragrafo', linhas: 2, maximo: 300, padrao: 'O contratante pede discrição na estrada.' },
    {
      id: 'estado', rotulo: 'Andamento', tipo: 'escolha', padrao: 'aberto',
      opcoes: [
        { valor: 'aberto', rotulo: 'Em aberto' },
        { valor: 'firmado', rotulo: 'Firmado' },
        { valor: 'cumprido', rotulo: 'Cumprido' },
        { valor: 'cancelado', rotulo: 'Cancelado' },
      ],
    },
    { id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'claro', opcoes: OPCOES_DE_PAPEL },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.numero + v.servico);
    const estado = ESTADOS[v.estado] ?? ESTADOS.aberto;
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 5, base: 5, esquerda: 4, direita: 4 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: tomDePapel(v.papel, 'claro'), semente, manchas: 3, bordas: 0.2 });

    linhaQueCabe(ctx, v.emissor, MARGEM, 180, {
      largura: LARGURA - MARGEM * 2 - 360, maximo: 50, minimo: 28, alinhamento: 'esquerda', cor: TINTA,
      montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    fonte(ctx, 'antiga', 30, 400, true);
    escrever(ctx, v.subtitulo, MARGEM, 222, 'esquerda', TINTA_FRACA);
    fonte(ctx, 'maquina', 30);
    escrever(ctx, v.numero, LARGURA - MARGEM, 180, 'direita', TINTA);
    traco(ctx, MARGEM, 252, LARGURA - MARGEM, 252, TINTA, 5);
    traco(ctx, MARGEM, 262, LARGURA - MARGEM, 262, TINTA, 1.5);

    fonte(ctx, 'maquina', 40);
    espacamento(ctx, 8);
    escrever(ctx, 'CONTRATO DE SERVIÇO', LARGURA / 2, 340, 'centro', TINTA);
    espacamento(ctx, 0);

    const linhas: Array<[string, string]> = [
      ['SERVIÇO', v.servico],
      ['CONTRATANTE', v.contratante],
      ['CONTRATADO', v.contratado],
      ['PAGAMENTO', v.pagamento],
      ['PRAZO', v.prazo],
    ];
    linhas.forEach(([rotulo, valor], indice) => {
      const y = 410 + indice * 92;
      fonte(ctx, 'maquina', 22);
      espacamento(ctx, 3);
      escrever(ctx, rotulo, MARGEM, y, 'esquerda', TINTA_APAGADA);
      espacamento(ctx, 0);
      linhaQueCabe(ctx, valor, MARGEM, y + 42, {
        largura: LARGURA - MARGEM * 2, maximo: 32, minimo: 18, alinhamento: 'esquerda', cor: TINTA, montar: (t) => fonte(ctx, 'maquina', t),
      });
      traco(ctx, MARGEM, y + 56, LARGURA - MARGEM, y + 56, 'rgba(60, 50, 35, 0.4)', 2, [3, 6]);
    });

    fonte(ctx, 'maquina', 26);
    espacamento(ctx, 6);
    escrever(ctx, 'CLÁUSULAS', MARGEM, 922, 'esquerda', TINTA);
    espacamento(ctx, 0);

    // Cláusulas numeradas com recuo pendurado; a fonte encolhe até todas caberem.
    const itens = itensDaLista(v.clausulas);
    const topo = 960;
    const limite = 1360;
    const recuo = 56;
    let tamanho = 28;
    const medirAltura = () => {
      fonte(ctx, 'maquina', tamanho);
      return itens.reduce((soma, item) => soma + quebrarEmLinhas(item, LARGURA - MARGEM * 2 - recuo, (t) => ctx.measureText(t).width).length * tamanho * 1.45 + 12, 0);
    };
    while (tamanho > 16 && medirAltura() > limite - topo) tamanho -= 2;
    let y = topo + tamanho;
    itens.forEach((item, indice) => {
      fonte(ctx, 'maquina', tamanho);
      const quebradas = quebrarEmLinhas(item, LARGURA - MARGEM * 2 - recuo, (t) => ctx.measureText(t).width);
      if (y > limite) return;
      escrever(ctx, `${indice + 1}.`, MARGEM, y, 'esquerda', TINTA);
      y = desenharLinhas(ctx, quebradas, { x: MARGEM + recuo, y, largura: LARGURA - MARGEM * 2 - recuo, alturaDaLinha: tamanho * 1.45, cor: TINTA }) + 12;
    });

    if (v.observacao.trim()) {
      escreverNoQuadro(ctx, `Observação: ${v.observacao}`, {
        x: MARGEM, topo: Math.min(y + 6, 1380), largura: LARGURA - MARGEM * 2, altura: 100, maximo: 28, minimo: 18, cor: TINTA_FRACA,
        montar: (t) => fonte(ctx, 'antiga', t, 400, true), entrelinha: 1.3,
      });
    }

    const assinadoPeloContratado = estado.assinado && !/^\s*em aberto\s*$/i.test(v.contratado);
    assinatura(ctx, MARGEM, 1600, 430, { legenda: 'Pelo contratante', nome: estado.assinado ? v.contratante.split(',')[0] : '' });
    assinatura(ctx, LARGURA - MARGEM - 430, 1600, 430, { legenda: 'Pelo contratado', nome: assinadoPeloContratado ? v.contratado.split(',')[0] : '' });
    seloRedondo(ctx, LARGURA / 2, 1590, 74, { texto: v.emissor || 'registro', cor: '#5c1a14', semente, angulo: 0.18 });

    carimbo(ctx, estado.carimbo, LARGURA - 340, 1380, { cor: estado.cor, tamanho: 96, angulo: -0.22, semente, larguraMaxima: 640 });
    ctx.restore();
  },
};
