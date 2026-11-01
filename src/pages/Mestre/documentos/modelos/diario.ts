import type { IModeloDeDocumento } from '../modelo';
import {
  PAPEIS, contornoRasgado, escrever, escreverNoQuadro, fonte, marcaDeCopo, papel, sementeDe, sorteador, traco,
} from '../pincel';

const LARGURA = 1100;
const ALTURA = 1560;
const PAUTA = 64;
const PRIMEIRA = 250;

const TINTAS: Record<string, string> = { azul: '#1f3a7a', preta: '#1d1a17', vermelha: '#8a1f1a', lapis: '#55524c' };

/** Respingos de sangue: gotas grandes e um borrifo de pingos pequenos. */
function sangue(ctx: CanvasRenderingContext2D, x: number, y: number, semente: number) {
  const sorte = sorteador(semente);
  ctx.save();
  ctx.fillStyle = 'rgba(110, 12, 10, 0.72)';
  ctx.beginPath();
  ctx.ellipse(x, y, 46, 38, 0.4, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 26; i += 1) {
    const angulo = sorte() * Math.PI * 2;
    const distancia = 50 + sorte() * 150;
    ctx.globalAlpha = 0.5 + sorte() * 0.5;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angulo) * distancia, y + Math.sin(angulo) * distancia, 3 + sorte() * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Mancha de água: o papel clareia e a tinta das linhas por baixo se espalha. */
function agua(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  const mancha = ctx.createRadialGradient(x, y, 20, x, y, 260);
  mancha.addColorStop(0, 'rgba(255, 252, 240, 0.35)');
  mancha.addColorStop(0.8, 'rgba(255, 252, 240, 0.12)');
  mancha.addColorStop(1, 'rgba(120, 95, 60, 0)');
  ctx.fillStyle = mancha;
  ctx.fillRect(x - 280, y - 280, 560, 560);
  ctx.strokeStyle = 'rgba(120, 90, 50, 0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 250, 220, 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export const diario: IModeloDeDocumento = {
  id: 'diario',
  nome: 'Página de diário',
  categoria: 'Cartas e bilhetes',
  icone: 'diario',
  descricao: 'Folha arrancada de caderno, escrita à mão, com data, rasuras e manchas.',
  largura: LARGURA,
  altura: ALTURA,
  impressao: { largura: 148, altura: 210 },
  campoDoTitulo: 'data',
  campos: [
    { id: 'data', rotulo: 'Data', tipo: 'texto', padrao: 'Dia 12, depois da chuva', maximo: 40 },
    {
      id: 'texto', rotulo: 'Texto', tipo: 'paragrafo', linhas: 10, maximo: 2400,
      dica: 'Ponha um trecho entre [[ e ]] para ele sair rabiscado.',
      padrao: 'Voltei ao poço hoje. A corda que deixamos amarrada estava cortada, e o corte era limpo demais para ser de pedra.\n\nO Tomás diz que eu durmo mal e que por isso escuto coisas. Pode ser. Mas eu contei os degraus da escada da torre três vezes e deu [[treze]] [[catorze]] treze.\n\nAmanhã eu desço com a lanterna. Se esta folha for a última, alguém leia o que eu escrevi na capa.',
    },
    { id: 'assinatura', rotulo: 'Assinatura', tipo: 'texto', padrao: 'L.', maximo: 30 },
    {
      id: 'pauta', rotulo: 'Folha', tipo: 'escolha', padrao: 'pautado',
      opcoes: [{ valor: 'pautado', rotulo: 'Pautada' }, { valor: 'quadriculado', rotulo: 'Quadriculada' }, { valor: 'liso', rotulo: 'Lisa' }],
    },
    {
      id: 'espiral', rotulo: 'Arrancada', tipo: 'escolha', padrao: 'sim',
      opcoes: [{ valor: 'sim', rotulo: 'Do espiral' }, { valor: 'nao', rotulo: 'Folha solta' }],
    },
    {
      id: 'mancha', rotulo: 'Mancha', tipo: 'escolha', padrao: 'cafe',
      opcoes: [{ valor: 'nenhuma', rotulo: 'Nenhuma' }, { valor: 'cafe', rotulo: 'Café' }, { valor: 'sangue', rotulo: 'Sangue' }, { valor: 'agua', rotulo: 'Água' }],
    },
    {
      id: 'tinta', rotulo: 'Tinta', tipo: 'escolha', padrao: 'azul',
      opcoes: [{ valor: 'azul', rotulo: 'Azul' }, { valor: 'preta', rotulo: 'Preta' }, { valor: 'vermelha', rotulo: 'Vermelha' }, { valor: 'lapis', rotulo: 'Lápis' }],
    },
    {
      id: 'papel', rotulo: 'Papel', tipo: 'escolha', padrao: 'claro',
      opcoes: [{ valor: 'claro', rotulo: 'Novo' }, { valor: 'envelhecido', rotulo: 'Envelhecido' }],
    },
  ],
  desenhar: ({ ctx }, v) => {
    const semente = sementeDe(v.data + v.texto.slice(0, 30));
    const tinta = TINTAS[v.tinta] ?? TINTAS.azul;
    const arrancada = v.espiral === 'sim';
    ctx.save();
    contornoRasgado(ctx, LARGURA, ALTURA, { topo: 5, base: 5, esquerda: arrancada ? 22 : 5, direita: 5 }, semente);
    ctx.clip();
    papel(ctx, LARGURA, ALTURA, { cores: v.papel === 'envelhecido' ? PAPEIS.envelhecido : PAPEIS.claro, semente, manchas: 3, bordas: 0.2 });

    if (v.pauta === 'quadriculado') {
      for (let x = 0; x < LARGURA; x += 40) traco(ctx, x, 0, x, ALTURA, 'rgba(70, 110, 170, 0.16)', 1.5);
      for (let y = 0; y < ALTURA; y += 40) traco(ctx, 0, y, LARGURA, y, 'rgba(70, 110, 170, 0.16)', 1.5);
    } else if (v.pauta === 'pautado') {
      for (let y = PRIMEIRA; y < ALTURA - 40; y += PAUTA) traco(ctx, 0, y, LARGURA, y, 'rgba(70, 110, 170, 0.3)', 2);
      traco(ctx, 150, 0, 150, ALTURA, 'rgba(180, 60, 60, 0.35)', 2);
    }
    if (arrancada) {
      // Os furos do espiral, rasgados até a borda
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let y = 60; y < ALTURA - 40; y += 72) {
        ctx.beginPath();
        ctx.ellipse(48, y, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(0, y - 6, 40, 12);
      }
      ctx.restore();
    }

    if (v.mancha === 'cafe') marcaDeCopo(ctx, LARGURA * 0.74, ALTURA * 0.78, 150, semente);
    else if (v.mancha === 'sangue') sangue(ctx, LARGURA * 0.8, ALTURA * 0.2, semente);
    else if (v.mancha === 'agua') agua(ctx, LARGURA * 0.35, ALTURA * 0.62);

    ctx.save();
    ctx.globalAlpha = v.tinta === 'lapis' ? 0.82 : 1;
    fonte(ctx, 'mao', 46, 600);
    escrever(ctx, v.data, LARGURA - 90, PRIMEIRA - PAUTA - 10, 'direita', tinta);
    const temAssinatura = v.assinatura.trim().length > 0;
    escreverNoQuadro(ctx, v.texto, {
      x: 180, topo: PRIMEIRA - PAUTA * 0.78 - 4, largura: LARGURA - 260, altura: ALTURA - PRIMEIRA - (temAssinatura ? 200 : 100),
      maximo: 48, minimo: 28, entrelinha: PAUTA / 48, cor: tinta, tarja: 'rabisco', montar: (t) => fonte(ctx, 'mao', t, 500),
    });
    if (temAssinatura) {
      fonte(ctx, 'mao', 56, 700);
      escrever(ctx, v.assinatura, LARGURA - 110, ALTURA - 110, 'direita', tinta);
    }
    ctx.restore();
    ctx.restore();
  },
};
