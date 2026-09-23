import type { EstiloMoldura } from './cartaz';

/** Desenha o cartaz de Procurado numa imagem PNG para compartilhar (Discord,
 * WhatsApp...). É um desenho próprio no canvas, sem biblioteca: o cartaz da
 * tela tem sombras e recortes CSS que não sairiam iguais numa captura. */
export interface DadosCartaz {
  nome: string;
  nivel: number;
  racaClasse: string;
  recompensa: string;
  moeda: string;
  vida: number;
  mana: number;
  /** Ausente ou zero quando a ficha ainda não calculou a Estamina: a linha some. */
  estamina?: number;
  sanidade: number | null;
  fama: number;
  emitidoEm: string;
  foto?: string | null;
  moldura: EstiloMoldura;
}

const LARGURA = 900;
const ALTURA = 1260;

const carregarImagem = (fonte: string): Promise<HTMLImageElement | null> => new Promise((resolver) => {
  const imagem = new Image();
  if (!fonte.startsWith('data:')) imagem.crossOrigin = 'anonymous';
  imagem.onload = () => resolver(imagem);
  imagem.onerror = () => resolver(null);
  imagem.src = fonte;
});

/** Contorno rasgado do papel: dentes em cima e embaixo, como no cartaz da tela. */
const caminhoRasgado = (ctx: CanvasRenderingContext2D) => {
  const dente = LARGURA / 8;
  const fundo = ALTURA * 0.03;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 1; i <= 8; i += 1) { ctx.lineTo(dente * i - dente / 2, fundo); ctx.lineTo(dente * i, 0); }
  ctx.lineTo(LARGURA, ALTURA);
  for (let i = 8; i >= 1; i -= 1) { ctx.lineTo(dente * i - dente / 2, ALTURA - fundo); ctx.lineTo(dente * (i - 1), ALTURA); }
  ctx.closePath();
};

const espacado = (ctx: CanvasRenderingContext2D, valor: string) => {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = valor;
};

const centro = (ctx: CanvasRenderingContext2D, texto: string, y: number) => ctx.fillText(texto, LARGURA / 2, y);

export async function gerarImagemCartaz(dados: DadosCartaz): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    // Pede os pesos usados no desenho: sem isso o canvas pode sair com a fonte de reserva.
    try {
      await Promise.all(['900 84px Cinzel', '700 40px Cinzel'].map((fonte) => document.fonts.load(fonte)));
      await document.fonts.ready;
    } catch { /* segue com a fonte de reserva */ }
  }
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível desenhar a imagem neste navegador.');

  // Papel envelhecido
  ctx.save();
  caminhoRasgado(ctx);
  ctx.clip();
  const papel = ctx.createLinearGradient(0, 0, LARGURA, ALTURA);
  papel.addColorStop(0, '#efe3bd');
  papel.addColorStop(0.55, '#ddc99a');
  papel.addColorStop(1, '#cbb27e');
  ctx.fillStyle = papel;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  [[0.15, 0.2, 0.38], [0.88, 0.78, 0.42], [0.5, 1, 0.55]].forEach(([x, y, raio]) => {
    const mancha = ctx.createRadialGradient(LARGURA * x, ALTURA * y, 0, LARGURA * x, ALTURA * y, LARGURA * raio);
    mancha.addColorStop(0, 'rgba(94, 66, 29, 0.2)');
    mancha.addColorStop(1, 'rgba(94, 66, 29, 0)');
    ctx.fillStyle = mancha;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  });
  // Arranhões finos, sempre nos mesmos lugares para a imagem sair igual toda vez
  ctx.strokeStyle = 'rgba(70, 48, 20, 0.07)';
  ctx.lineWidth = 1;
  for (let x = -ALTURA; x < LARGURA; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + ALTURA * 0.47, ALTURA);
    ctx.stroke();
  }
  ctx.restore();

  // Moldura por grau (a mesma escada do retrato)
  const moldura = dados.moldura;
  if (moldura.chave !== 'comum') {
    ctx.save();
    caminhoRasgado(ctx);
    ctx.clip();
    ctx.strokeStyle = moldura.fio;
    ctx.shadowColor = moldura.brilho;
    ctx.shadowBlur = 26;
    ctx.lineWidth = moldura.aro ? 14 : 9;
    ctx.strokeRect(26, 40, LARGURA - 52, ALTURA - 80);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeRect(46, 60, LARGURA - 92, ALTURA - 120);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Título
  ctx.strokeStyle = 'rgba(92, 26, 26, 0.6)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(90, 132); ctx.lineTo(LARGURA - 90, 132); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(90, 262); ctx.lineTo(LARGURA - 90, 262); ctx.stroke();
  ctx.fillStyle = '#4a1414';
  ctx.font = '900 84px Cinzel, Georgia, serif';
  espacado(ctx, '8px');
  centro(ctx, 'PROCURADO', 210);
  ctx.fillStyle = 'rgba(92, 26, 26, 0.75)';
  ctx.font = '700 26px system-ui, sans-serif';
  espacado(ctx, '14px');
  centro(ctx, 'VIVO OU MORTO', 250);
  espacado(ctx, '0px');

  // Retrato
  const retratoX = LARGURA / 2 - 170;
  const retratoY = 300;
  ctx.save();
  ctx.translate(LARGURA / 2, retratoY + 170);
  ctx.rotate(0.02);
  ctx.translate(-LARGURA / 2, -(retratoY + 170));
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#2a2118';
  ctx.fillRect(retratoX, retratoY, 340, 340);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#f5ecd8';
  ctx.fillRect(retratoX + 14, retratoY + 14, 312, 312);
  const foto = dados.foto ? await carregarImagem(dados.foto) : null;
  if (foto) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(retratoX + 24, retratoY + 24, 292, 292);
    ctx.clip();
    const escala = Math.max(292 / foto.width, 292 / foto.height);
    const w = foto.width * escala;
    const h = foto.height * escala;
    if ('filter' in ctx) ctx.filter = 'grayscale(35%) sepia(15%)';
    ctx.drawImage(foto, retratoX + 24 + (292 - w) / 2, retratoY + 24 + (292 - h) / 2, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = '#e3d6ae';
    ctx.fillRect(retratoX + 24, retratoY + 24, 292, 292);
    ctx.fillStyle = '#5a4a2f';
    ctx.font = '700 150px Cinzel, Georgia, serif';
    centro(ctx, (dados.nome.charAt(0) || '?').toUpperCase(), retratoY + 230);
  }
  ctx.fillStyle = '#7a1f1f';
  ctx.beginPath();
  ctx.arc(LARGURA / 2, retratoY - 6, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ameaça, nome e origem
  const pilulaY = 690;
  ctx.font = '700 24px system-ui, sans-serif';
  espacado(ctx, '3px');
  const textoAmeaca = `NÍVEL ${dados.nivel} DE AMEAÇA`;
  const larguraAmeaca = ctx.measureText(textoAmeaca).width + 60;
  ctx.fillStyle = 'rgba(90, 74, 47, 0.14)';
  ctx.strokeStyle = 'rgba(90, 74, 47, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // roundRect não existe em navegadores mais antigos: a pílula vira retângulo em vez de travar a imagem.
  if (typeof ctx.roundRect === 'function') ctx.roundRect(LARGURA / 2 - larguraAmeaca / 2, pilulaY - 32, larguraAmeaca, 48, 24);
  else ctx.rect(LARGURA / 2 - larguraAmeaca / 2, pilulaY - 32, larguraAmeaca, 48);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4a3b22';
  centro(ctx, textoAmeaca, pilulaY + 2);
  espacado(ctx, '0px');

  ctx.fillStyle = '#2a2118';
  let tamanhoNome = 74;
  do {
    ctx.font = `700 ${tamanhoNome}px Cinzel, Georgia, serif`;
    tamanhoNome -= 4;
  } while (ctx.measureText(dados.nome).width > LARGURA - 160 && tamanhoNome > 30);
  centro(ctx, dados.nome, 790);
  ctx.fillStyle = '#5a4a2f';
  ctx.font = '600 28px system-ui, sans-serif';
  espacado(ctx, '3px');
  centro(ctx, dados.racaClasse.toUpperCase(), 838);
  espacado(ctx, '0px');

  // Recompensa
  ctx.fillStyle = 'rgba(92, 26, 26, 0.75)';
  ctx.font = '700 22px system-ui, sans-serif';
  espacado(ctx, '9px');
  centro(ctx, 'RECOMPENSA', 900);
  espacado(ctx, '0px');
  ctx.fillStyle = '#5c1a1a';
  ctx.font = '900 76px Cinzel, Georgia, serif';
  centro(ctx, dados.recompensa, 975);
  ctx.font = '700 30px Cinzel, Georgia, serif';
  centro(ctx, dados.moeda, 1015);

  // Dossiê
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(90, 74, 47, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(120, 1046); ctx.lineTo(LARGURA - 120, 1046); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '700 28px "Cascadia Mono", Consolas, monospace';
  ctx.fillStyle = '#3a2f1c';
  ctx.textAlign = 'left';
  const linhas: Array<[string, string]> = [
    ['VIDA', String(dados.vida)],
    ['MANA', String(dados.mana)],
    ...((dados.estamina ?? 0) > 0 ? [['ESTAMINA', String(dados.estamina)] as [string, string]] : []),
    ['SANIDADE', dados.sanidade === null ? '-' : String(dados.sanidade)],
    ['FAMA', `${dados.fama}/5`],
  ];
  linhas.forEach(([rotulo, valor], indice) => {
    const coluna = indice % 2;
    const linha = Math.floor(indice / 2);
    const x = coluna === 0 ? 130 : LARGURA / 2 + 30;
    const y = 1088 + linha * 40;
    ctx.fillStyle = '#5a4a2f';
    ctx.fillText(rotulo, x, y);
    ctx.fillStyle = '#2a2118';
    ctx.textAlign = 'right';
    ctx.fillText(valor, x + 260, y);
    ctx.textAlign = 'left';
  });

  // Rodapé
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(90, 74, 47, 0.8)';
  ctx.font = '500 22px system-ui, sans-serif';
  centro(ctx, `Emitido em ${dados.emitidoEm}  ·  O Jardim RPG`, 1208);

  // Faixa do grau
  const rotuloTier = moldura.rotulo;
  if (rotuloTier) {
    ctx.save();
    ctx.translate(LARGURA - 108, 142);
    ctx.rotate(0.6);
    ctx.fillStyle = moldura.fio;
    ctx.shadowColor = moldura.brilho;
    ctx.shadowBlur = 16;
    ctx.fillRect(-120, -18, 240, 36);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#3a2a06';
    ctx.font = '900 19px Cinzel, Georgia, serif';
    espacado(ctx, '3px');
    centro(ctx, rotuloTier.toUpperCase(), 8);
    ctx.restore();
  }

  return new Promise<Blob>((resolver, rejeitar) => {
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Falha ao gerar a imagem.'))), 'image/png');
  });
}

const nomeDoArquivo = (nome: string) => `procurado-${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'personagem'}.png`;

export type ResultadoCompartilhamento = 'compartilhado' | 'copiado' | 'baixado';

export const baixarCartaz = async (dados: DadosCartaz): Promise<ResultadoCompartilhamento> => {
  const blob = await gerarImagemCartaz(dados);
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nomeDoArquivo(dados.nome);
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'baixado';
};

/** Celular: abre o compartilhar do sistema. Computador: copia a imagem para
 * colar direto no Discord. Se nenhum dos dois existir, baixa o arquivo. */
export const compartilharCartaz = async (dados: DadosCartaz): Promise<ResultadoCompartilhamento> => {
  const blob = await gerarImagemCartaz(dados);
  const arquivo = new File([blob], nomeDoArquivo(dados.nome), { type: 'image/png' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: `Procurado: ${dados.nome}` });
      return 'compartilhado';
    } catch (erro) {
      if ((erro as Error)?.name === 'AbortError') return 'compartilhado'; // a pessoa fechou o menu
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
  return baixarCartaz(dados);
};
