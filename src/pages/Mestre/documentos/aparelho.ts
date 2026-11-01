/**
 * Os aparelhos da AstraTech: tablet e celular desenhados no canvas, com a barra de status, os painéis e os
 * ícones das telas. É a versão de tecnologia dos documentos, para mesa que se passa onde a AstraTech de Jota
 * Macedo já chegou. O azul neon vem da Malha.
 *
 * Como o resto dos documentos, tudo é desenho próprio, sem imagem de fora.
 */

import type { ICampoDoModelo } from './modelo';
import {
  escrever, espacamento, fonte, linhaQueCabe, retanguloArredondado, sorteador, type Pincel,
} from './pincel';

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export const TEMAS_ASTRA = {
  escuro: {
    tela: '#060c17', painel: '#0e1829', painel2: '#15233a', linha: 'rgba(110, 170, 255, 0.18)', texto: '#e8f0ff',
    fraco: '#8ba1c4', acento: '#38b6ff', brilho: 'rgba(56, 182, 255, 0.55)', perigo: '#ff4d5e', alerta: '#ffb020', ok: '#33d69f',
  },
  claro: {
    tela: '#edf2f9', painel: '#ffffff', painel2: '#e1e9f5', linha: 'rgba(20, 50, 90, 0.13)', texto: '#0e1b2e',
    fraco: '#5a6a83', acento: '#0a84d6', brilho: 'rgba(10, 132, 214, 0.3)', perigo: '#d92d3f', alerta: '#c97700', ok: '#12a370',
  },
} as const;

export type TemaAstra = (typeof TEMAS_ASTRA)[keyof typeof TEMAS_ASTRA];

export const temaAstra = (valor: string | undefined): TemaAstra => (valor === 'claro' ? TEMAS_ASTRA.claro : TEMAS_ASTRA.escuro);

// ---------------------------------------------------------------- campos comuns

export const noTablet = (valores: Readonly<Record<string, string>>) => valores.suporte === 'tablet';
export const noPapel = (valores: Readonly<Record<string, string>>) => valores.suporte !== 'tablet';

/** O primeiro campo dos documentos que têm versão de tablet. */
export const CAMPO_DE_SUPORTE: ICampoDoModelo = {
  id: 'suporte', rotulo: 'Suporte', tipo: 'escolha', padrao: 'papel',
  opcoes: [{ valor: 'papel', rotulo: 'Papel' }, { valor: 'tablet', rotulo: 'Tablet AstraTech' }],
  dica: 'O tablet é a versão da AstraTech, para quando a cena tem tecnologia.',
};

export const CAMPO_DE_TEMA: ICampoDoModelo = {
  id: 'tema', rotulo: 'Tela', tipo: 'escolha', padrao: 'escuro',
  opcoes: [{ valor: 'escuro', rotulo: 'Escura' }, { valor: 'claro', rotulo: 'Clara' }],
};

export const CAMPO_DE_TEMA_NO_TABLET: ICampoDoModelo = { ...CAMPO_DE_TEMA, visivel: noTablet };

export const CAMPO_DE_HORA_NO_TABLET: ICampoDoModelo = {
  id: 'hora', rotulo: 'Hora na tela', tipo: 'texto', padrao: '21:47', maximo: 8, visivel: noTablet,
};

// ---------------------------------------------------------------- aparelho

/** Corpo do aparelho e a tela vazia. Devolve a tela, já pintada com o fundo do tema. */
export function aparelho(ctx: CanvasRenderingContext2D, caixa: Retangulo, tipo: 'tablet' | 'celular', tema: TemaAstra): Retangulo & { raio: number } {
  const raio = tipo === 'tablet' ? 70 : 118;
  const borda = tipo === 'tablet' ? 40 : 24;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  retanguloArredondado(ctx, caixa.x, caixa.y, caixa.largura, caixa.altura, raio);
  const corpo = ctx.createLinearGradient(caixa.x, caixa.y, caixa.x + caixa.largura, caixa.y + caixa.altura);
  corpo.addColorStop(0, '#30353d');
  corpo.addColorStop(0.5, '#15181d');
  corpo.addColorStop(1, '#262a31');
  ctx.fillStyle = corpo;
  ctx.fill();
  ctx.restore();

  // Aro metálico
  ctx.save();
  retanguloArredondado(ctx, caixa.x + 2, caixa.y + 2, caixa.largura - 4, caixa.altura - 4, raio - 2);
  const aro = ctx.createLinearGradient(caixa.x, caixa.y, caixa.x, caixa.y + caixa.altura);
  aro.addColorStop(0, 'rgba(220, 230, 245, 0.55)');
  aro.addColorStop(0.5, 'rgba(120, 130, 145, 0.25)');
  aro.addColorStop(1, 'rgba(220, 230, 245, 0.4)');
  ctx.strokeStyle = aro;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  const tela = {
    x: caixa.x + borda, y: caixa.y + borda, largura: caixa.largura - borda * 2, altura: caixa.altura - borda * 2,
    raio: Math.max(16, raio - borda * 0.75),
  };
  retanguloArredondado(ctx, tela.x, tela.y, tela.largura, tela.altura, tela.raio);
  ctx.fillStyle = tema.tela;
  ctx.fill();

  if (tipo === 'tablet') {
    ctx.fillStyle = '#0a0b0d';
    ctx.beginPath();
    ctx.arc(caixa.x + caixa.largura / 2, caixa.y + borda / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(80, 120, 200, 0.5)';
    ctx.beginPath();
    ctx.arc(caixa.x + caixa.largura / 2 - 2, caixa.y + borda / 2 - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return tela;
}

/** O que vai por cima de tudo: a ilha da câmera do celular e o reflexo do vidro. */
export function vidro(ctx: CanvasRenderingContext2D, tela: Retangulo & { raio: number }, tipo: 'tablet' | 'celular') {
  ctx.save();
  retanguloArredondado(ctx, tela.x, tela.y, tela.largura, tela.altura, tela.raio);
  ctx.clip();
  if (tipo === 'celular') {
    const largura = tela.largura * 0.3;
    retanguloArredondado(ctx, tela.x + (tela.largura - largura) / 2, tela.y + 22, largura, 44, 22);
    ctx.fillStyle = '#000';
    ctx.fill();
  }
  const reflexo = ctx.createLinearGradient(tela.x, tela.y, tela.x + tela.largura, tela.y + tela.altura);
  reflexo.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
  reflexo.addColorStop(0.35, 'rgba(255, 255, 255, 0.02)');
  reflexo.addColorStop(0.36, 'rgba(255, 255, 255, 0)');
  reflexo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = reflexo;
  ctx.fillRect(tela.x, tela.y, tela.largura, tela.altura);
  ctx.restore();
}

/** Hora à esquerda; sinal e bateria à direita. Devolve a altura ocupada. */
export function barraDeStatus(ctx: CanvasRenderingContext2D, tela: Retangulo, tema: TemaAstra, opcoes: { hora: string; bateria?: string; celular?: boolean }): number {
  const altura = opcoes.celular ? 92 : 58;
  const meio = tela.y + (opcoes.celular ? 46 : 34);
  const margem = opcoes.celular ? 58 : 34;
  fonte(ctx, 'sans', opcoes.celular ? 30 : 24, 600);
  escrever(ctx, opcoes.hora, tela.x + margem, meio + 9, 'esquerda', tema.texto);

  const nivel = Math.max(0, Math.min(100, Number.parseInt((opcoes.bateria ?? '').replace(/\D/g, ''), 10) || 80));
  const direita = tela.x + tela.largura - margem;
  const larguraDaBateria = opcoes.celular ? 46 : 40;
  const alturaDaBateria = opcoes.celular ? 22 : 19;
  ctx.save();
  ctx.strokeStyle = tema.texto;
  ctx.lineWidth = 2;
  retanguloArredondado(ctx, direita - larguraDaBateria, meio - alturaDaBateria / 2, larguraDaBateria - 4, alturaDaBateria, 5);
  ctx.stroke();
  ctx.fillStyle = tema.texto;
  ctx.fillRect(direita - 3, meio - 4, 3, 8);
  ctx.fillStyle = nivel <= 20 ? tema.perigo : tema.texto;
  ctx.fillRect(direita - larguraDaBateria + 3, meio - alturaDaBateria / 2 + 3, (larguraDaBateria - 10) * (nivel / 100), alturaDaBateria - 6);
  // Sinal
  for (let barra = 0; barra < 4; barra += 1) {
    const h = 6 + barra * 4;
    ctx.fillStyle = barra < 3 ? tema.texto : tema.fraco;
    ctx.fillRect(direita - larguraDaBateria - 52 + barra * 9, meio + 8 - h, 6, h);
  }
  ctx.restore();
  if (opcoes.bateria) {
    fonte(ctx, 'sans', opcoes.celular ? 22 : 19, 600);
    escrever(ctx, `${nivel}%`, direita - larguraDaBateria - 64, meio + 7, 'direita', tema.texto);
  }
  return altura;
}

/** A estrela da AstraTech com o nome ao lado. Devolve a largura. */
export function marcaAstraTech(ctx: CanvasRenderingContext2D, x: number, y: number, tamanho: number, cor: string, comNome = true): number {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  ctx.lineWidth = Math.max(1.5, tamanho * 0.08);
  const r = tamanho / 2;
  const cx = x + r;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const raio = i % 2 === 0 ? r : r * 0.38;
    const angulo = -Math.PI / 2 + (i * Math.PI) / 4;
    ctx.lineTo(cx + Math.cos(angulo) * raio, y + Math.sin(angulo) * raio);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, y, r * 0.78, 0, Math.PI * 2);
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.restore();
  if (!comNome) return tamanho;
  fonte(ctx, 'tech', tamanho * 0.62, 700);
  espacamento(ctx, tamanho * 0.08);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cor;
  ctx.textAlign = 'left';
  ctx.fillText('ASTRATECH', x + tamanho * 1.3, y + 1);
  const largura = tamanho * 1.3 + ctx.measureText('ASTRATECH').width;
  ctx.textBaseline = 'alphabetic';
  espacamento(ctx, 0);
  return largura;
}

export function painel(ctx: CanvasRenderingContext2D, caixa: Retangulo, tema: TemaAstra, opcoes: { raio?: number; cor?: string; borda?: string; brilho?: boolean } = {}) {
  ctx.save();
  if (opcoes.brilho) {
    ctx.shadowColor = tema.brilho;
    ctx.shadowBlur = 24;
  }
  retanguloArredondado(ctx, caixa.x, caixa.y, caixa.largura, caixa.altura, opcoes.raio ?? 22);
  ctx.fillStyle = opcoes.cor ?? tema.painel;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = opcoes.borda ?? tema.linha;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Etiqueta arredondada com texto em caixa alta. Devolve a largura. */
export function pilula(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  opcoes: { cor: string; fundo?: string; tamanho?: number; alinhamento?: 'esquerda' | 'direita' | 'centro'; contorno?: boolean },
): number {
  const tamanho = opcoes.tamanho ?? 22;
  fonte(ctx, 'sans', tamanho, 600);
  espacamento(ctx, tamanho * 0.12);
  const rotulo = texto.toUpperCase();
  const largura = ctx.measureText(rotulo).width + tamanho * 1.4;
  const altura = tamanho * 1.75;
  const inicio = opcoes.alinhamento === 'direita' ? x - largura : opcoes.alinhamento === 'centro' ? x - largura / 2 : x;
  ctx.save();
  retanguloArredondado(ctx, inicio, y - altura / 2, largura, altura, altura / 2);
  ctx.fillStyle = opcoes.fundo ?? 'transparent';
  ctx.fill();
  if (opcoes.contorno ?? !opcoes.fundo) {
    ctx.strokeStyle = opcoes.cor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  ctx.textBaseline = 'middle';
  escrever(ctx, rotulo, inicio + largura / 2 + tamanho * 0.06, y + 1, 'centro', opcoes.cor);
  ctx.textBaseline = 'alphabetic';
  espacamento(ctx, 0);
  return largura;
}

export function avatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, raio: number, imagem: HTMLImageElement | null, nome: string, cor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.clip();
  if (imagem) {
    const lado = Math.min(imagem.naturalWidth || imagem.width, imagem.naturalHeight || imagem.height);
    const sx = ((imagem.naturalWidth || imagem.width) - lado) / 2;
    const sy = ((imagem.naturalHeight || imagem.height) - lado) / 4;
    ctx.drawImage(imagem, sx, Math.max(0, sy), lado, lado, cx - raio, cy - raio, raio * 2, raio * 2);
  } else {
    const fundo = ctx.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio);
    fundo.addColorStop(0, cor);
    fundo.addColorStop(1, '#1b2a44');
    ctx.fillStyle = fundo;
    ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
    fonte(ctx, 'sans', raio * 0.9, 600);
    ctx.textBaseline = 'middle';
    escrever(ctx, (nome.trim().charAt(0) || '?').toUpperCase(), cx, cy + raio * 0.04, 'centro', '#ffffff');
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

export type NomeDoIcone =
  | 'alerta' | 'cadeado' | 'check' | 'sino' | 'mensagem' | 'chamada' | 'coracao' | 'comentario' | 'compartilhar' | 'voltar' | 'camera'
  | 'escudo' | 'documento' | 'mais';

/** Ícones de traço, do tamanho pedido, centrados em (cx, cy). */
export function icone(ctx: CanvasRenderingContext2D, nome: NomeDoIcone, cx: number, cy: number, tamanho: number, cor: string) {
  const s = tamanho / 24;
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 12 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (nome) {
    case 'alerta':
      ctx.moveTo(12, 3); ctx.lineTo(22, 20); ctx.lineTo(2, 20); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 9); ctx.lineTo(12, 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 17, 1, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cadeado':
      ctx.rect(5, 11, 14, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 11); ctx.lineTo(8, 7); ctx.arc(12, 7, 4, Math.PI, 0); ctx.lineTo(16, 11); ctx.stroke();
      break;
    case 'check':
      ctx.moveTo(5, 12.5); ctx.lineTo(10, 17); ctx.lineTo(19, 7); ctx.stroke();
      break;
    case 'sino':
      ctx.moveTo(6, 17); ctx.lineTo(6, 11); ctx.arc(12, 11, 6, Math.PI, 0); ctx.lineTo(18, 17); ctx.lineTo(20, 18); ctx.lineTo(4, 18); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 20, 2, 0, Math.PI); ctx.stroke();
      break;
    case 'mensagem':
      ctx.moveTo(4, 5); ctx.lineTo(20, 5); ctx.lineTo(20, 16); ctx.lineTo(10, 16); ctx.lineTo(5, 20); ctx.lineTo(5, 16); ctx.lineTo(4, 16); ctx.closePath(); ctx.stroke();
      break;
    case 'chamada':
      ctx.moveTo(6, 3); ctx.lineTo(9, 3); ctx.lineTo(11, 8); ctx.lineTo(8.5, 10); ctx.quadraticCurveTo(10.5, 14, 14, 15.5); ctx.lineTo(16, 13); ctx.lineTo(21, 15); ctx.lineTo(21, 18);
      ctx.quadraticCurveTo(21, 21, 18, 21); ctx.quadraticCurveTo(4, 20, 3, 6); ctx.quadraticCurveTo(3, 3, 6, 3); ctx.stroke();
      break;
    case 'coracao':
      ctx.moveTo(12, 20); ctx.bezierCurveTo(2, 13, 3, 4, 8, 4.5); ctx.bezierCurveTo(10, 4.7, 11.4, 6, 12, 7.5);
      ctx.bezierCurveTo(12.6, 6, 14, 4.7, 16, 4.5); ctx.bezierCurveTo(21, 4, 22, 13, 12, 20); ctx.closePath(); ctx.stroke();
      break;
    case 'comentario':
      ctx.arc(12, 11, 8, Math.PI * 0.75, Math.PI * 2.6); ctx.lineTo(5, 20); ctx.closePath(); ctx.stroke();
      break;
    case 'compartilhar':
      ctx.moveTo(12, 3); ctx.lineTo(12, 15); ctx.moveTo(7, 8); ctx.lineTo(12, 3); ctx.lineTo(17, 8);
      ctx.moveTo(5, 13); ctx.lineTo(5, 20); ctx.lineTo(19, 20); ctx.lineTo(19, 13); ctx.stroke();
      break;
    case 'voltar':
      ctx.moveTo(15, 4); ctx.lineTo(7, 12); ctx.lineTo(15, 20); ctx.stroke();
      break;
    case 'camera':
      ctx.rect(3, 7, 18, 13); ctx.moveTo(8, 7); ctx.lineTo(10, 4); ctx.lineTo(14, 4); ctx.lineTo(16, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 13.5, 4, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'escudo':
      ctx.moveTo(12, 3); ctx.lineTo(20, 6); ctx.lineTo(20, 12); ctx.quadraticCurveTo(20, 18, 12, 21); ctx.quadraticCurveTo(4, 18, 4, 12); ctx.lineTo(4, 6); ctx.closePath(); ctx.stroke();
      break;
    case 'documento':
      ctx.moveTo(6, 3); ctx.lineTo(14, 3); ctx.lineTo(19, 8); ctx.lineTo(19, 21); ctx.lineTo(6, 21); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 12); ctx.lineTo(16, 12); ctx.moveTo(9, 16); ctx.lineTo(16, 16); ctx.stroke();
      break;
    case 'mais':
      ctx.arc(5, 12, 1.6, 0, Math.PI * 2); ctx.arc(12, 12, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(19, 12, 1.6, 0, Math.PI * 2); ctx.fill();
      break;
  }
  ctx.restore();
}

/** Selo de conta verificada: círculo com o visto. */
export function verificado(ctx: CanvasRenderingContext2D, cx: number, cy: number, raio: number, cor: string) {
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  icone(ctx, 'check', cx, cy, raio * 1.5, '#ffffff');
}

/** Código de leitura que parece QR, sorteado pela semente. */
export function codigoQr(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number, semente: number, cor: string, fundo = '#ffffff') {
  const modulos = 25;
  const passo = lado / modulos;
  const sorte = sorteador(semente);
  ctx.save();
  ctx.fillStyle = fundo;
  ctx.fillRect(x - passo, y - passo, lado + passo * 2, lado + passo * 2);
  ctx.fillStyle = cor;
  const marcador = (mx: number, my: number) => mx < 8 && my < 8 || mx >= modulos - 8 && my < 8 || mx < 8 && my >= modulos - 8;
  for (let my = 0; my < modulos; my += 1) {
    for (let mx = 0; mx < modulos; mx += 1) {
      if (!marcador(mx, my) && sorte() < 0.48) ctx.fillRect(x + mx * passo, y + my * passo, passo + 0.5, passo + 0.5);
    }
  }
  for (const [mx, my] of [[0, 0], [modulos - 7, 0], [0, modulos - 7]]) {
    ctx.fillRect(x + mx * passo, y + my * passo, passo * 7, passo * 7);
    ctx.fillStyle = fundo;
    ctx.fillRect(x + (mx + 1) * passo, y + (my + 1) * passo, passo * 5, passo * 5);
    ctx.fillStyle = cor;
    ctx.fillRect(x + (mx + 2) * passo, y + (my + 2) * passo, passo * 3, passo * 3);
  }
  ctx.restore();
}

export function codigoDeBarras(ctx: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number, semente: number, cor: string) {
  const sorte = sorteador(semente);
  ctx.save();
  ctx.fillStyle = cor;
  let px = x;
  while (px < x + largura) {
    const barra = 2 + Math.floor(sorte() * 4) * 2;
    if (px + barra > x + largura) break;
    ctx.fillRect(px, y, barra * 0.6, altura);
    px += barra + 2 + Math.floor(sorte() * 3) * 2;
  }
  ctx.restore();
}

/** Trilhas de circuito ao fundo de cartões e crachás. */
export function circuito(ctx: CanvasRenderingContext2D, caixa: Retangulo, cor: string, semente: number, trilhas = 18) {
  const sorte = sorteador(semente);
  ctx.save();
  ctx.beginPath();
  ctx.rect(caixa.x, caixa.y, caixa.largura, caixa.altura);
  ctx.clip();
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = 2;
  for (let i = 0; i < trilhas; i += 1) {
    let x = caixa.x + sorte() * caixa.largura;
    let y = caixa.y + sorte() * caixa.altura;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let passo = 0; passo < 3; passo += 1) {
      if (sorte() < 0.5) x += (sorte() - 0.5) * 260;
      else y += (sorte() - 0.5) * 160;
      ctx.lineTo(x, y);
      if (sorte() < 0.4) {
        x += 40; y += 40;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Linhas finas por cima de uma imagem, como tela de monitor. */
export function varredura(ctx: CanvasRenderingContext2D, caixa: Retangulo, opacidade = 0.12) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${opacidade})`;
  for (let y = caixa.y; y < caixa.y + caixa.altura; y += 4) ctx.fillRect(caixa.x, y, caixa.largura, 2);
  ctx.restore();
}

// ---------------------------------------------------------------- montagens prontas

/** Tablet de pé ocupando a folha A4 (1240 × 1754), com a barra de status. `desenhar` recebe a área útil da
 * tela, já recortada, e o desenho fecha com o reflexo do vidro. */
export function emTablet(pincel: Pincel, tema: TemaAstra, hora: string, desenhar: (area: Retangulo) => void) {
  const { ctx } = pincel;
  const caixa = { x: 60, y: 50, largura: pincel.largura - 120, altura: pincel.altura - 100 };
  const tela = aparelho(ctx, caixa, 'tablet', tema);
  ctx.save();
  retanguloArredondado(ctx, tela.x, tela.y, tela.largura, tela.altura, tela.raio);
  ctx.clip();
  const status = barraDeStatus(ctx, tela, tema, { hora: hora || '21:47', bateria: '64%' });
  desenhar({ x: tela.x, y: tela.y + status, largura: tela.largura, altura: tela.altura - status });
  ctx.restore();
  vidro(ctx, tela, 'tablet');
}

/** Celular de pé ocupando o canvas inteiro. */
export function emCelular(
  pincel: Pincel,
  tema: TemaAstra,
  opcoes: { hora: string; bateria?: string; fundo?: (tela: Retangulo) => void },
  desenhar: (area: Retangulo, tela: Retangulo) => void,
) {
  const { ctx } = pincel;
  const caixa = { x: 24, y: 24, largura: pincel.largura - 48, altura: pincel.altura - 48 };
  const tela = aparelho(ctx, caixa, 'celular', tema);
  ctx.save();
  retanguloArredondado(ctx, tela.x, tela.y, tela.largura, tela.altura, tela.raio);
  ctx.clip();
  opcoes.fundo?.(tela);
  const status = barraDeStatus(ctx, tela, tema, { hora: opcoes.hora || '21:47', bateria: opcoes.bateria, celular: true });
  desenhar({ x: tela.x, y: tela.y + status, largura: tela.largura, altura: tela.altura - status }, tela);
  // Barrinha de gesto no pé da tela
  ctx.fillStyle = tema === TEMAS_ASTRA.claro ? 'rgba(14, 27, 46, 0.6)' : 'rgba(232, 240, 255, 0.7)';
  retanguloArredondado(ctx, tela.x + tela.largura / 2 - 90, tela.y + tela.altura - 26, 180, 8, 4);
  ctx.fill();
  ctx.restore();
  vidro(ctx, tela, 'celular');
}

/** Cabeçalho de aplicativo: ícone, título e subtítulo, com a marca da AstraTech à direita. Devolve o pé. */
export function cabecalhoDeApp(
  ctx: CanvasRenderingContext2D,
  area: Retangulo,
  tema: TemaAstra,
  opcoes: { titulo: string; subtitulo?: string; icone?: NomeDoIcone; cor?: string; marca?: boolean },
): number {
  const altura = 118;
  const cor = opcoes.cor ?? tema.acento;
  ctx.save();
  ctx.fillStyle = tema.painel;
  ctx.fillRect(area.x, area.y, area.largura, altura);
  ctx.fillStyle = cor;
  ctx.fillRect(area.x, area.y + altura - 3, area.largura, 3);
  ctx.restore();
  const margem = 44;
  let x = area.x + margem;
  if (opcoes.icone) {
    painel(ctx, { x, y: area.y + 26, largura: 66, altura: 66 }, tema, { raio: 18, cor: tema.painel2, borda: cor });
    icone(ctx, opcoes.icone, x + 33, area.y + 59, 36, cor);
    x += 90;
  }
  const larguraDaMarca = opcoes.marca === false ? 0 : 250;
  linhaQueCabe(ctx, opcoes.titulo, x, area.y + (opcoes.subtitulo ? 58 : 72), {
    largura: area.largura - (x - area.x) - margem - larguraDaMarca, maximo: 38, minimo: 22, alinhamento: 'esquerda', cor: tema.texto,
    montar: (t) => fonte(ctx, 'sans', t, 600),
  });
  if (opcoes.subtitulo) {
    linhaQueCabe(ctx, opcoes.subtitulo, x, area.y + 94, {
      largura: area.largura - (x - area.x) - margem - larguraDaMarca, maximo: 24, minimo: 16, alinhamento: 'esquerda', cor: tema.fraco,
      montar: (t) => fonte(ctx, 'sans', t, 400),
    });
  }
  if (opcoes.marca !== false) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    marcaAstraTech(ctx, area.x + area.largura - margem - 228, area.y + 59, 30, tema.fraco);
    ctx.restore();
  }
  return area.y + altura;
}

/** Botão de tela: cheio (ação principal) ou só com contorno. */
export function botao(ctx: CanvasRenderingContext2D, texto: string, caixa: Retangulo, tema: TemaAstra, opcoes: { cheio?: boolean; cor?: string } = {}) {
  const cor = opcoes.cor ?? tema.acento;
  ctx.save();
  retanguloArredondado(ctx, caixa.x, caixa.y, caixa.largura, caixa.altura, caixa.altura / 2);
  if (opcoes.cheio) {
    ctx.fillStyle = cor;
    ctx.fill();
  } else {
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.textBaseline = 'middle';
  linhaQueCabe(ctx, texto, caixa.x + caixa.largura / 2, caixa.y + caixa.altura / 2 + 1, {
    largura: caixa.largura - 30, maximo: Math.round(caixa.altura * 0.36), minimo: 14, cor: opcoes.cheio ? '#ffffff' : cor,
    montar: (t) => fonte(ctx, 'sans', t, 600),
  });
  ctx.textBaseline = 'alphabetic';
}

/** Rótulo pequeno em caixa alta, de formulário de tela. */
export function rotuloDeTela(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, tema: TemaAstra, alinhamento: 'esquerda' | 'direita' | 'centro' = 'esquerda') {
  fonte(ctx, 'sans', 19, 600);
  espacamento(ctx, 3);
  escrever(ctx, texto.toUpperCase(), x, y, alinhamento, tema.fraco);
  espacamento(ctx, 0);
}
