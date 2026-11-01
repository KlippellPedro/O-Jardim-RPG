import type { IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, contornoRasgado, escrever, escreverNoQuadro, fonte, marcaDeCopo, papel, sementeDe, traco,
} from '../pincel';

const LARGURA = 1200;
const ALTURA = 860;
const PAUTA = 72;

const TINTAS: Record<string, string> = {
  preta: '#1d1a17',
  azul: '#1f3a7a',
  vermelha: '#8a1f1a',
  lapis: '#5b5852',
};

export const bilhete: IModeloDeDocumento = {
  id: 'bilhete',
  nome: 'Bilhete',
  categoria: 'Cartas e bilhetes',
  icone: 'bilhete',
  descricao: 'Pedaço de papel rasgado com um recado escrito às pressas.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 140, altura: 100 },
  campoDoTitulo: 'texto',
  campos: [
    {
      id: 'texto', rotulo: 'Recado', tipo: 'paragrafo', linhas: 5, maximo: 600,
      dica: 'Ponha um trecho entre [[ e ]] para ele sair rabiscado.',
      padrao: 'Vocês não estão sozinhos na estalagem.\nO homem do chapéu cinza ouviu tudo.\nSaiam pelos fundos depois da meia-noite.',
    },
    { id: 'assinatura', rotulo: 'Assinatura', tipo: 'texto', padrao: 'Um amigo', maximo: 40 },
    {
      id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'pautado',
      opcoes: [
        { valor: 'pautado', rotulo: 'Caderno' },
        { valor: 'liso', rotulo: 'Liso' },
        { valor: 'pardo', rotulo: 'Embrulho' },
      ],
    },
    {
      id: 'tinta', rotulo: 'Tinta', tipo: 'escolha', padrao: 'preta',
      opcoes: [
        { valor: 'preta', rotulo: 'Preta' },
        { valor: 'azul', rotulo: 'Azul' },
        { valor: 'vermelha', rotulo: 'Vermelha' },
        { valor: 'lapis', rotulo: 'Lápis' },
      ],
    },
    {
      id: 'mancha', rotulo: 'Marca de copo', tipo: 'escolha', padrao: 'sim',
      opcoes: [{ valor: 'sim', rotulo: 'Com marca' }, { valor: 'nao', rotulo: 'Limpo' }],
    },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.texto.slice(0, 40));
    const tinta = TINTAS[v.tinta] ?? TINTAS.preta;
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 30, base: 46, esquerda: 26, direita: 38 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, {
      cores: v.papel === 'pardo' ? PAPEIS.pardo : PAPEIS.claro, semente, manchas: 3, bordas: 0.22, grao: 0.9,
    });
    if (v.papel === 'pautado') {
      for (let y = 150; y < ALTURA - 30; y += PAUTA) traco(ctx, 0, y, LARGURA, y, 'rgba(70, 110, 170, 0.32)', 2);
      traco(ctx, 130, 0, 130, ALTURA, 'rgba(180, 60, 60, 0.35)', 2);
    }
    if (v.mancha === 'sim') marcaDeCopo(ctx, LARGURA * 0.82, ALTURA * 0.3, 120, semente);

    const temAssinatura = v.assinatura.trim().length > 0;
    ctx.save();
    ctx.globalAlpha = v.tinta === 'lapis' ? 0.85 : 1;
    // A linha de base cai sobre a pauta: topo da caixa uma linha acima da primeira pauta.
    escreverNoQuadro(ctx, v.texto, {
      x: 160, topo: 150 - PAUTA * 0.78 - 4, largura: LARGURA - 230, altura: ALTURA - 150 - (temAssinatura ? 150 : 60),
      maximo: 56, minimo: 30, entrelinha: PAUTA / 56, cor: tinta, tarja: 'rabisco',
      montar: (t) => fonte(ctx, 'mao', t, 500),
    });
    if (temAssinatura) {
      fonte(ctx, 'mao', 52, 700);
      escrever(ctx, v.assinatura, LARGURA - 90, ALTURA - 96, 'direita', tinta);
    }
    ctx.restore();
    ctx.restore();
  },
};
