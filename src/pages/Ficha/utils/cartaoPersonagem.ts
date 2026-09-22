import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
import type { IResumoFicha } from './exportarFicha';
import { formatarModificador } from './exportarFicha';
import { GLIFOS, escurecerHex, iniciaisDoNome, molduraDoRetrato } from './retrato';

/** Cartão do personagem em PNG, no formato de carta: retrato no alto, moldura
 * por nível, recursos e atributos embaixo. Desenhado à mão no canvas (sem
 * biblioteca) para sair igual em qualquer navegador e caber no Discord. */
export interface IDadosCartao {
  resumo: IResumoFicha;
  destaque: string;
  segunda: string;
  efeito: EfeitoAtmosfericoFicha;
}

const LARGURA = 750;
const ALTURA = 1050;
const MARGEM = 50;
const AREA = LARGURA - MARGEM * 2;
const RETRATO_ALTURA = 470;

const carregarImagem = (fonte: string): Promise<HTMLImageElement | null> => new Promise((resolver) => {
  const imagem = new Image();
  if (!fonte.startsWith('data:')) imagem.crossOrigin = 'anonymous';
  imagem.onload = () => resolver(imagem);
  imagem.onerror = () => resolver(null);
  imagem.src = fonte;
});

const espacado = (ctx: CanvasRenderingContext2D, valor: string) => {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = valor;
};

/** roundRect não existe em navegadores antigos: cai para retângulo em vez de travar. */
const retanguloArredondado = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, raio: number) => {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, raio);
  else ctx.rect(x, y, w, h);
};

/** Reduz a fonte até o texto caber na largura pedida. */
const ajustarFonte = (ctx: CanvasRenderingContext2D, texto: string, peso: string, familia: string, maximo: number, minimo: number, largura: number) => {
  let tamanho = maximo;
  do {
    ctx.font = `${peso} ${tamanho}px ${familia}`;
    tamanho -= 2;
  } while (ctx.measureText(texto).width > largura && tamanho >= minimo);
};

const desenharGlifo = (ctx: CanvasRenderingContext2D, efeito: EfeitoAtmosfericoFicha, x: number, y: number, escala: number, cor: string, largura: number) => {
  const glifo = GLIFOS[efeito] || GLIFOS.arcano;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura / escala;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(glifo.d));
  ctx.restore();
};

export async function gerarImagemCartao(dados: IDadosCartao): Promise<Blob> {
  const { resumo, destaque, segunda, efeito } = dados;
  if (typeof document !== 'undefined' && document.fonts?.load) {
    try {
      await Promise.all(['700 60px Cinzel', '900 60px Cinzel'].map((fonte) => document.fonts.load(fonte)));
      await document.fonts.ready;
    } catch { /* segue com a fonte de reserva */ }
  }
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível desenhar a imagem neste navegador.');

  const moldura = molduraDoRetrato(resumo.nivel);
  const titulos = 'Cinzel, Georgia, serif';
  const texto = 'system-ui, sans-serif';

  // Fundo
  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  fundo.addColorStop(0, escurecerHex(destaque, 0.3));
  fundo.addColorStop(0.55, '#0c0b12');
  fundo.addColorStop(1, escurecerHex(segunda, 0.2));
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  desenharGlifo(ctx, efeito, LARGURA / 2 - 300, ALTURA - 620, 6, 'rgba(255,255,255,0.045)', 3);

  // Moldura por nível
  ctx.save();
  ctx.shadowColor = moldura.brilho;
  ctx.shadowBlur = moldura.degrau === 0 ? 6 : 24;
  ctx.strokeStyle = moldura.fio;
  ctx.lineWidth = moldura.animada ? 10 : moldura.degrau === 0 ? 4 : 7;
  retanguloArredondado(ctx, 14, 14, LARGURA - 28, ALTURA - 28, 30);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  retanguloArredondado(ctx, 30, 30, LARGURA - 60, ALTURA - 60, 22);
  ctx.stroke();
  if (moldura.joias > 0) {
    const cantos: Array<[number, number]> = [[22, 22], [LARGURA - 22, 22], [22, ALTURA - 22], [LARGURA - 22, ALTURA - 22]];
    cantos.slice(0, moldura.joias === 2 ? 2 : 4).forEach(([x, y]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = moldura.fio;
      ctx.shadowColor = moldura.brilho;
      ctx.shadowBlur = 12;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    });
  }

  // Retrato
  ctx.save();
  retanguloArredondado(ctx, MARGEM, MARGEM, AREA, RETRATO_ALTURA, 18);
  ctx.clip();
  const foto = resumo.foto ? await carregarImagem(resumo.foto) : null;
  if (foto) {
    const escala = Math.max(AREA / foto.width, RETRATO_ALTURA / foto.height);
    const w = foto.width * escala;
    const h = foto.height * escala;
    ctx.drawImage(foto, MARGEM + (AREA - w) / 2, MARGEM + (RETRATO_ALTURA - h) / 2, w, h);
  } else {
    const cx = MARGEM + AREA / 2;
    const cy = MARGEM + RETRATO_ALTURA / 2;
    const composto = ctx.createRadialGradient(cx, cy - 80, 20, cx, cy, AREA * 0.7);
    composto.addColorStop(0, `${destaque}99`);
    composto.addColorStop(0.55, escurecerHex(destaque, 0.32));
    composto.addColorStop(1, escurecerHex(segunda, 0.16));
    ctx.fillStyle = composto;
    ctx.fillRect(MARGEM, MARGEM, AREA, RETRATO_ALTURA);
    ctx.strokeStyle = `${segunda}59`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.arc(cx, cy, 190, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    desenharGlifo(ctx, efeito, cx - 175, cy - 175, 3.5, `${destaque}6b`, 5);
    const iniciais = iniciaisDoNome(resumo.nome);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${iniciais.length > 1 ? 170 : 210}px ${titulos}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.strokeText(iniciais, cx, cy + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(iniciais, cx, cy + 8);
  }
  // Escurecimento na base do retrato, para o nome ler bem se a foto for clara.
  const sombra = ctx.createLinearGradient(0, MARGEM + RETRATO_ALTURA - 120, 0, MARGEM + RETRATO_ALTURA);
  sombra.addColorStop(0, 'rgba(0,0,0,0)');
  sombra.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = sombra;
  ctx.fillRect(MARGEM, MARGEM + RETRATO_ALTURA - 120, AREA, 120);
  ctx.restore();
  ctx.strokeStyle = moldura.fio;
  ctx.lineWidth = 3;
  retanguloArredondado(ctx, MARGEM, MARGEM, AREA, RETRATO_ALTURA, 18);
  ctx.stroke();

  // Selo de nível
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#0b0a10';
  ctx.beginPath();
  ctx.arc(MARGEM + 52, MARGEM + 52, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = moldura.fio;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(MARGEM + 52, MARGEM + 52, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = moldura.fio;
  ctx.font = `700 15px ${texto}`;
  espacado(ctx, '3px');
  ctx.fillText('NÍVEL', MARGEM + 52, MARGEM + 40);
  espacado(ctx, '0px');
  ctx.fillStyle = '#fff';
  ctx.font = `900 40px ${titulos}`;
  ctx.fillText(String(resumo.nivel), MARGEM + 52, MARGEM + 78);

  // Faixa da patente
  if (moldura.rotulo) {
    ctx.save();
    ctx.translate(LARGURA - MARGEM - 24, MARGEM + 62);
    ctx.rotate(0.62);
    ctx.fillStyle = moldura.fio;
    ctx.shadowColor = moldura.brilho;
    ctx.shadowBlur = 14;
    ctx.fillRect(-120, -17, 240, 34);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a1e04';
    ctx.font = `900 18px ${titulos}`;
    espacado(ctx, '3px');
    ctx.fillText(moldura.rotulo.toUpperCase(), 0, 7);
    espacado(ctx, '0px');
    ctx.restore();
  }

  // Nome, raça e classes
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5efe0';
  ajustarFonte(ctx, resumo.nome, '700', titulos, 58, 28, AREA);
  ctx.fillText(resumo.nome, LARGURA / 2, MARGEM + RETRATO_ALTURA + 70);
  const subtitulo = `${resumo.raca} · ${resumo.classes}`.toUpperCase();
  ctx.fillStyle = destaque;
  espacado(ctx, '2px');
  ajustarFonte(ctx, subtitulo, '700', texto, 22, 13, AREA);
  ctx.fillText(subtitulo, LARGURA / 2, MARGEM + RETRATO_ALTURA + 108);
  espacado(ctx, '0px');
  if (resumo.titulo) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ajustarFonte(ctx, `“${resumo.titulo}”`, 'italic 500', 'Georgia, serif', 22, 14, AREA);
    ctx.fillText(`“${resumo.titulo}”`, LARGURA / 2, MARGEM + RETRATO_ALTURA + 140);
  }

  // Recursos
  const topoRecursos = MARGEM + RETRATO_ALTURA + 168;
  const recursos: Array<[string, string, string]> = [
    ['VIDA', String(resumo.recursos.vida.maximo), '#f87171'],
    ['MANA', String(resumo.recursos.mana.maximo), '#60a5fa'],
    ['DEFESA', String(resumo.recursos.defesa), '#fbbf24'],
    ['INICIATIVA', String(resumo.recursos.iniciativa), '#a3e635'],
  ];
  const larguraRecurso = (AREA - 3 * 12) / 4;
  recursos.forEach(([rotulo, valor, cor], indice) => {
    const x = MARGEM + indice * (larguraRecurso + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    retanguloArredondado(ctx, x, topoRecursos, larguraRecurso, 92, 14);
    ctx.fill();
    ctx.strokeStyle = `${cor}55`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = cor;
    ctx.font = `700 15px ${texto}`;
    espacado(ctx, '2px');
    ctx.fillText(rotulo, x + larguraRecurso / 2, topoRecursos + 28);
    espacado(ctx, '0px');
    ctx.fillStyle = '#fff';
    ctx.font = `900 42px ${titulos}`;
    ctx.fillText(valor, x + larguraRecurso / 2, topoRecursos + 74);
  });

  // Atributos
  const topoAtributos = topoRecursos + 112;
  const larguraAtributo = AREA / resumo.atributos.length;
  resumo.atributos.forEach((atributo, indice) => {
    const cx = MARGEM + larguraAtributo * indice + larguraAtributo / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 15px ${texto}`;
    espacado(ctx, '2px');
    ctx.fillText(atributo.rotulo.slice(0, 3).toUpperCase(), cx, topoAtributos + 18);
    espacado(ctx, '0px');
    ctx.fillStyle = '#fff';
    ctx.font = `800 38px ${titulos}`;
    ctx.fillText(String(atributo.valor), cx, topoAtributos + 62);
    ctx.fillStyle = atributo.mod >= 0 ? '#86efac' : '#fca5a5';
    ctx.font = `700 18px ${texto}`;
    ctx.fillText(formatarModificador(atributo.mod), cx, topoAtributos + 88);
  });

  // Rodapé
  ctx.fillStyle = moldura.fio;
  ctx.font = `700 22px ${texto}`;
  ctx.fillText(`${'★'.repeat(resumo.fama)}${'☆'.repeat(5 - resumo.fama)}`, LARGURA / 2, ALTURA - 62);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `500 16px ${texto}`;
  ctx.fillText(`O Jardim RPG  ·  ${resumo.geradoEm}`, LARGURA / 2, ALTURA - 38);

  return new Promise<Blob>((resolver, rejeitar) => {
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Falha ao gerar a imagem.'))), 'image/png');
  });
}

export type ResultadoEntrega = 'compartilhado' | 'copiado' | 'baixado';

export const baixarImagem = (blob: Blob, nomeArquivo: string): ResultadoEntrega => {
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nomeArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'baixado';
};

/** Celular: abre o compartilhar do sistema. Computador: copia a imagem para
 * colar direto no Discord. Se nenhum dos dois existir, baixa o arquivo. */
export async function compartilharImagem(blob: Blob, nomeArquivo: string, titulo: string): Promise<ResultadoEntrega> {
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: titulo });
      return 'compartilhado';
    } catch (erro) {
      if ((erro as Error)?.name === 'AbortError') return 'compartilhado';
    }
  }
  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'copiado';
    } catch {
      // Sem permissão para a área de transferência: cai para o download.
    }
  }
  return baixarImagem(blob, nomeArquivo);
}
