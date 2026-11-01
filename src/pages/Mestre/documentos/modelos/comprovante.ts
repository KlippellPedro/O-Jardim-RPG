import { codigoDeBarras } from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  contornoRasgado, escrever, escreverNoQuadro, espacamento, fonte, linhaQueCabe, papel, sementeDe, traco,
} from '../pincel';

const LARGURA = 720;
const ALTURA = 1500;
const MARGEM = 56;

/** Cada linha vira descrição e valor: "Saque em espécie ; 2.000". */
export function itensDoComprovante(texto: string): Array<[string, string]> {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const [descricao, ...valor] = linha.split(/[;|]/);
      return [descricao.trim(), valor.join(' ').trim()] as [string, string];
    });
}

export const comprovante: IModeloDeDocumento = {
  id: 'comprovante',
  nome: 'Comprovante',
  categoria: 'Papéis oficiais',
  icone: 'recibo',
  descricao: 'Tira de papel de máquina: saque, compra, aposta ou pagamento, com itens, total e código de barras.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 58, altura: 121 },
  campoDoTitulo: 'tipo',
  campos: [
    { id: 'emissor', rotulo: 'Quem emite', tipo: 'texto', padrao: 'Banco Lunar', maximo: 30 },
    { id: 'unidade', rotulo: 'Agência ou loja', tipo: 'texto', padrao: 'Agência da fronteira', maximo: 40 },
    { id: 'tipo', rotulo: 'Tipo', tipo: 'texto', padrao: 'Comprovante de saque', maximo: 40 },
    {
      id: 'itens', rotulo: 'Itens', tipo: 'paragrafo', linhas: 4, maximo: 600,
      dica: 'Um item por linha, com o valor depois de ponto e vírgula. Ex.: Taxa de urgência ; 60',
      padrao: 'Saque em espécie ; 2.000\nTaxa de urgência ; 60\nSelo de transporte ; 12',
    },
    { id: 'total', rotulo: 'Total', tipo: 'texto', padrao: '2.072 Lunaris', maximo: 30 },
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'Terceiro dia do inverno', maximo: 30 },
    { id: 'hora', rotulo: 'Hora', tipo: 'texto', padrao: '16:42', maximo: 8 },
    { id: 'conta', rotulo: 'Conta ou cliente', tipo: 'texto', padrao: 'Conta 07-3381', maximo: 40 },
    { id: 'autenticacao', rotulo: 'Autenticação', tipo: 'texto', padrao: 'A7F3-22C9-0B1E', maximo: 30 },
    { id: 'mensagem', rotulo: 'Mensagem no pé', tipo: 'texto', padrao: 'Guarde este comprovante.', maximo: 60 },
    {
      id: 'desbotado', rotulo: 'Tinta', tipo: 'escolha', padrao: 'nova',
      opcoes: [{ valor: 'nova', rotulo: 'Nova' }, { valor: 'desbotada', rotulo: 'Desbotada' }],
    },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.autenticacao + v.tipo);
    const tinta = '#262626';
    const itens = itensDoComprovante(v.itens).slice(0, 14);
    const fimDosItens = 402 + itens.length * 42;
    // A tira acaba logo depois da mensagem do pé, como a máquina corta; o resto do canvas fica transparente.
    const comprimento = Math.min(ALTURA, Math.max(1000, fimDosItens + 520));
    ctx.save();
    contornoRasgado(ctx, LARGURA, comprimento, { topo: 16, base: 16, esquerda: 0, direita: 0 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, comprimento, { cores: ['#fbfaf6', '#f1efe8', '#e2ded2'], semente, manchas: 2, bordas: 0.12, grao: 0.6 });
    ctx.globalAlpha = v.desbotado === 'desbotada' ? 0.55 : 0.92;

    const meio = LARGURA / 2;
    const largura = LARGURA - MARGEM * 2;
    linhaQueCabe(ctx, v.emissor.toUpperCase(), meio, 110, {
      largura, maximo: 46, minimo: 22, cor: tinta, montar: (t) => { fonte(ctx, 'digital', t); espacamento(ctx, t * 0.12); },
    });
    espacamento(ctx, 0);
    linhaQueCabe(ctx, v.unidade, meio, 152, { largura, maximo: 26, minimo: 16, cor: tinta, montar: (t) => fonte(ctx, 'digital', t) });
    traco(ctx, MARGEM, 186, LARGURA - MARGEM, 186, tinta, 2, [8, 8]);
    linhaQueCabe(ctx, v.tipo.toUpperCase(), meio, 236, { largura, maximo: 30, minimo: 16, cor: tinta, montar: (t) => fonte(ctx, 'digital', t) });
    fonte(ctx, 'digital', 24);
    escrever(ctx, v.data, MARGEM, 288, 'esquerda', tinta);
    escrever(ctx, v.hora, LARGURA - MARGEM, 288, 'direita', tinta);
    escrever(ctx, v.conta, MARGEM, 324, 'esquerda', tinta);
    traco(ctx, MARGEM, 352, LARGURA - MARGEM, 352, tinta, 2, [8, 8]);

    let y = 402;
    for (const [descricao, valor] of itens) {
      fonte(ctx, 'digital', 26);
      const larguraDoValor = valor ? ctx.measureText(valor).width + 24 : 0;
      linhaQueCabe(ctx, descricao, MARGEM, y, {
        largura: largura - larguraDoValor, maximo: 26, minimo: 16, alinhamento: 'esquerda', cor: tinta, montar: (t) => fonte(ctx, 'digital', t),
      });
      fonte(ctx, 'digital', 26);
      escrever(ctx, valor, LARGURA - MARGEM, y, 'direita', tinta);
      y += 42;
    }
    traco(ctx, MARGEM, y - 6, LARGURA - MARGEM, y - 6, tinta, 2, [8, 8]);
    fonte(ctx, 'digital', 32);
    escrever(ctx, 'TOTAL', MARGEM, y + 50, 'esquerda', tinta);
    linhaQueCabe(ctx, v.total, LARGURA - MARGEM, y + 50, {
      largura: largura - 140, maximo: 36, minimo: 20, alinhamento: 'direita', cor: tinta, montar: (t) => fonte(ctx, 'digital', t),
    });
    traco(ctx, MARGEM, y + 78, LARGURA - MARGEM, y + 78, tinta, 2, [8, 8]);
    fonte(ctx, 'digital', 22);
    escrever(ctx, 'AUTENTICAÇÃO', meio, y + 128, 'centro', tinta);
    escrever(ctx, v.autenticacao, meio, y + 162, 'centro', tinta);

    codigoDeBarras(ctx, MARGEM + 20, y + 200, largura - 40, 120, semente, tinta);
    escreverNoQuadro(ctx, v.mensagem, {
      x: MARGEM, topo: y + 350, largura, altura: 80, maximo: 24, minimo: 16, alinhamento: 'centro', cor: tinta, entrelinha: 1.3,
      montar: (t) => fonte(ctx, 'digital', t),
    });
    ctx.restore();
  },
};
