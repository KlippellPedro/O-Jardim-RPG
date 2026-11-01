import {
  CAMPO_DE_HORA_NO_TABLET, CAMPO_DE_SUPORTE, CAMPO_DE_TEMA_NO_TABLET, cabecalhoDeApp, emTablet, icone, noPapel, painel, pilula,
  rotuloDeTela, temaAstra,
} from '../aparelho';
import type { IModeloDeDocumento } from '../modelo';
import {
  OPCOES_DE_PAPEL, TINTA, TINTA_APAGADA, TINTA_FRACA, carimbo, contornoRasgado, escrever, escreverNoQuadro, espacamento,
  fonte, linhaQueCabe, papel, sementeDe, tomDePapel, traco, type Pincel,
} from '../pincel';

const LARGURA = 1240;
const ALTURA = 1754;
const MARGEM = 130;

const CARIMBOS: Record<string, [string, string]> = {
  naoConferido: ['NÃO CONFERIDO', '#8a1f1a'],
  conferido: ['CONFERIDO', '#2f5a2a'],
  arquivado: ['ARQUIVADO', '#24407a'],
  sigiloso: ['SIGILOSO', '#8a1f1a'],
};

/** Clipe de papel preso na borda de cima. */
function clipe(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.08);
  ctx.strokeStyle = '#7d8187';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(18, 150);
  ctx.lineTo(18, 30);
  ctx.arc(38, 30, 20, Math.PI, 0);
  ctx.lineTo(58, 170);
  ctx.arc(32, 170, 26, 0, Math.PI);
  ctx.lineTo(6, 52);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(15, 140);
  ctx.lineTo(15, 34);
  ctx.stroke();
  ctx.restore();
}

export const relatorio: IModeloDeDocumento = {
  id: 'relatorio',
  nome: 'Relatório confidencial',
  categoria: 'Papéis oficiais',
  icone: 'relatorio',
  descricao: 'Registro datilografado com protocolo, trechos tarjados, carimbo e anotação à mão na margem.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 210, altura: 297 },
  campoDoTitulo: 'assunto',
  campos: [
    CAMPO_DE_SUPORTE,
    { id: 'emissor', rotulo: 'Quem registra', tipo: 'texto', padrao: 'Arquivo Prismático', maximo: 50 },
    { id: 'setor', rotulo: 'Setor ou núcleo', tipo: 'texto', padrao: 'Núcleo de registro', maximo: 50 },
    { id: 'classificacao', rotulo: 'Classificação', tipo: 'texto', padrao: 'Restrito', maximo: 20 },
    { id: 'protocolo', rotulo: 'Protocolo', tipo: 'texto', padrao: 'AP-1187', maximo: 30 },
    { id: 'assunto', rotulo: 'Assunto', tipo: 'texto', padrao: 'Aparição na pedreira de Vale Fundo', maximo: 100 },
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'Recebido no fim do outono', maximo: 50 },
    {
      id: 'corpo', rotulo: 'Relato', tipo: 'paragrafo', linhas: 10, maximo: 3600,
      dica: 'Ponha um trecho entre [[ e ]] para ele sair tarjado.',
      padrao: 'Relato colhido de dois cortadores de pedra, ouvidos em separado. Os dois descrevem uma figura alta parada na beira do poço, de [[costas para a luz]], durante a troca de turno.\n\nUm deles diz que a figura chamou pelo nome do irmão, [[morto há seis anos na mesma pedreira]]. O outro não ouviu nada.\n\nO relato aguarda conferência de um segundo núcleo e por isso ainda não entra como verdadeiro.',
    },
    { id: 'responsavel', rotulo: 'Quem registrou', tipo: 'texto', padrao: 'M. Quintela', maximo: 50 },
    { id: 'anotacao', rotulo: 'Anotação à mão na margem', tipo: 'texto', padrao: 'falar com o irmão que sobrou', maximo: 80 },
    {
      id: 'carimbo', rotulo: 'Carimbo', tipo: 'escolha', padrao: 'naoConferido',
      opcoes: [
        { valor: 'naoConferido', rotulo: 'Não conferido' },
        { valor: 'conferido', rotulo: 'Conferido' },
        { valor: 'arquivado', rotulo: 'Arquivado' },
        { valor: 'sigiloso', rotulo: 'Sigiloso' },
        { valor: 'nenhum', rotulo: 'Nenhum' },
      ],
    },
    { id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'claro', opcoes: OPCOES_DE_PAPEL, visivel: noPapel },
    CAMPO_DE_TEMA_NO_TABLET,
    CAMPO_DE_HORA_NO_TABLET,
  ],
  desenhar: (pincel, v) => {
    if (v.suporte === 'tablet') {
      relatorioNoTablet(pincel, v);
      return;
    }
    const { ctx } = pincel;
    const semente = sementeDe(v.protocolo + v.assunto);
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 4, base: 4, esquerda: 4, direita: 4 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: tomDePapel(v.papel, 'claro'), semente, manchas: 3, bordas: 0.18 });
    clipe(ctx, 180, -40);

    linhaQueCabe(ctx, v.emissor, MARGEM, 196, {
      largura: LARGURA - MARGEM * 2 - 330, maximo: 46, minimo: 26, alinhamento: 'esquerda', cor: TINTA,
      montar: (t) => fonte(ctx, 'titulo', t, 700),
    });
    fonte(ctx, 'antiga', 30, 400, true);
    escrever(ctx, v.setor, MARGEM, 238, 'esquerda', TINTA_FRACA);

    if (v.classificacao.trim()) {
      fonte(ctx, 'maquina', 30);
      espacamento(ctx, 6);
      const texto = v.classificacao.toUpperCase();
      const largura = ctx.measureText(texto).width + 40;
      ctx.strokeStyle = '#8a1f1a';
      ctx.lineWidth = 4;
      ctx.strokeRect(LARGURA - MARGEM - largura, 158, largura, 56);
      escrever(ctx, texto, LARGURA - MARGEM - largura / 2 + 3, 198, 'centro', '#8a1f1a');
      espacamento(ctx, 0);
    }
    traco(ctx, MARGEM, 272, LARGURA - MARGEM, 272, TINTA, 4);

    const linha = (rotulo: string, valor: string, y: number) => {
      fonte(ctx, 'maquina', 26);
      escrever(ctx, rotulo, MARGEM, y, 'esquerda', TINTA_APAGADA);
      linhaQueCabe(ctx, valor, MARGEM + 210, y, {
        largura: LARGURA - MARGEM * 2 - 210, maximo: 30, minimo: 18, alinhamento: 'esquerda', cor: TINTA,
        montar: (t) => fonte(ctx, 'maquina', t),
      });
    };
    linha('PROTOCOLO', v.protocolo, 336);
    linha('ASSUNTO', v.assunto, 386);
    linha('DATA', v.data, 436);
    traco(ctx, MARGEM, 470, LARGURA - MARGEM, 470, 'rgba(42, 33, 24, 0.5)', 2, [4, 6]);

    escreverNoQuadro(ctx, v.corpo, {
      x: MARGEM, topo: 504, largura: LARGURA - MARGEM * 2, altura: ALTURA - 504 - 330, maximo: 30, minimo: 18,
      entrelinha: 1.62, cor: TINTA, tarja: 'barra', entreParagrafos: 18, montar: (t) => fonte(ctx, 'maquina', t),
    });

    traco(ctx, MARGEM, ALTURA - 236, MARGEM + 460, ALTURA - 236, TINTA, 2);
    fonte(ctx, 'maquina', 24);
    escrever(ctx, `Registrado por ${v.responsavel}`.trim(), MARGEM, ALTURA - 200, 'esquerda', TINTA_FRACA);

    const marca = CARIMBOS[v.carimbo];
    if (marca) carimbo(ctx, marca[0], LARGURA - 380, ALTURA - 300, { cor: marca[1], tamanho: 74, angulo: -0.18, semente, larguraMaxima: 560 });

    if (v.anotacao.trim()) {
      ctx.save();
      ctx.translate(LARGURA - MARGEM, ALTURA - 140);
      ctx.rotate(-0.05);
      linhaQueCabe(ctx, v.anotacao, 0, 0, {
        largura: 640, maximo: 52, minimo: 28, alinhamento: 'direita', cor: '#8a2f26', montar: (t) => fonte(ctx, 'mao', t, 600),
      });
      ctx.restore();
    }
    ctx.restore();
  },
};

/** O relatório como arquivo restrito no tablet da AstraTech. */
function relatorioNoTablet(pincel: Pincel, v: Readonly<Record<string, string>>) {
  const { ctx } = pincel;
  const tema = temaAstra(v.tema);
  emTablet(pincel, tema, v.hora, (area) => {
    const margem = 44;
    const x = area.x + margem;
    const largura = area.largura - margem * 2;
    cabecalhoDeApp(ctx, area, tema, { titulo: v.emissor, subtitulo: v.setor, icone: 'cadeado', cor: tema.perigo });

    let larguraDaClasse = 0;
    if (v.classificacao.trim()) larguraDaClasse = pilula(ctx, v.classificacao, x + largura, 322, { cor: tema.perigo, alinhamento: 'direita' });
    fonte(ctx, 'tech', 36, 700);
    escrever(ctx, 'ARQUIVO', x, 334, 'esquerda', tema.texto);
    fonte(ctx, 'digital', 26);
    escrever(ctx, v.protocolo, x + largura - larguraDaClasse - 24, 331, 'direita', tema.acento);

    const ficha = { x, y: 372, largura, altura: 196 };
    painel(ctx, ficha, tema);
    ([['Protocolo', v.protocolo], ['Assunto', v.assunto], ['Data', v.data]] as const).forEach(([rotulo, valor], indice) => {
      const y = ficha.y + 56 + indice * 54;
      rotuloDeTela(ctx, rotulo, x + 30, y, tema);
      linhaQueCabe(ctx, valor, x + 220, y + 2, {
        largura: largura - 250, maximo: 28, minimo: 16, alinhamento: 'esquerda', cor: tema.texto, montar: (t) => fonte(ctx, 'digital', t),
      });
    });

    const pe = area.y + area.altura;
    const temNota = v.anotacao.trim().length > 0;
    const corpoAte = pe - (temNota ? 330 : 200);
    escreverNoQuadro(ctx, v.corpo, {
      x, topo: ficha.y + ficha.altura + 40, largura, altura: corpoAte - ficha.y - ficha.altura - 40, maximo: 29, minimo: 17,
      entrelinha: 1.55, cor: tema.texto, tarja: 'barra', corDaTarja: tema.fraco, entreParagrafos: 16,
      montar: (t) => fonte(ctx, 'digital', t),
    });

    if (temNota) {
      const nota = { x, y: corpoAte + 20, largura, altura: 110 };
      ctx.save();
      ctx.globalAlpha = 0.14;
      painel(ctx, nota, tema, { cor: tema.alerta, borda: tema.alerta });
      ctx.restore();
      painel(ctx, nota, tema, { cor: 'transparent', borda: tema.alerta });
      icone(ctx, 'mensagem', x + 44, nota.y + 55, 32, tema.alerta);
      linhaQueCabe(ctx, v.anotacao, x + 84, nota.y + 65, {
        largura: largura - 110, maximo: 30, minimo: 18, alinhamento: 'esquerda', cor: tema.alerta, montar: (t) => fonte(ctx, 'sans', t, 500, true),
      });
    }
    fonte(ctx, 'sans', 24, 400);
    escrever(ctx, `Registrado por ${v.responsavel}`, x, pe - 70, 'esquerda', tema.fraco);
    const marca = CARIMBOS[v.carimbo];
    if (marca) {
      const cor = v.carimbo === 'conferido' ? tema.ok : v.carimbo === 'arquivado' ? tema.acento : tema.perigo;
      pilula(ctx, marca[0], x + largura, pe - 78, { cor, alinhamento: 'direita' });
    }
  });
}
