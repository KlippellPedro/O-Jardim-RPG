// Fase 0 da Oficina: remover fundo e melhorar qualidade no navegador, com a
// placa de vídeo. As bibliotecas vêm do CDN só neste protótipo; no site elas
// entram como pedaço carregado sob demanda.

const CDN_TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2';
const CDN_ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
// Só para medir tempo. No site o arquivo é exportado por nós dos pesos
// oficiais do Real-ESRGAN (BSD 3) e servido pelo próprio servidor.
const MODELOS_ESRGAN = {
  geral: 'https://huggingface.co/relax123666/clearpic-models/resolve/main/realesr-general-x4v3.onnx',
  desenho: 'https://huggingface.co/relax123666/clearpic-models/resolve/main/RealESRGAN_x4plus_anime_6B.onnx',
} as const;
const MODELOS_FUNDO = {
  birefnet: 'onnx-community/BiRefNet_lite-ONNX',
  modnet: 'Xenova/modnet',
  ormbg: 'Orangebot/ormbg-ONNX',
} as const;

type Dispositivo = 'webgpu' | 'wasm';

const registro = document.getElementById('registro')!;
function anotar(texto: string) {
  const linha = document.createElement('li');
  linha.textContent = texto;
  registro.prepend(linha);
}

async function imagem(url: string): Promise<ImageBitmap> {
  return createImageBitmap(await (await fetch(url)).blob());
}

let escolhida: string | null = null;
document.getElementById('arquivo')?.addEventListener('change', (evento) => {
  const arquivo = (evento.target as HTMLInputElement).files?.[0];
  if (escolhida) URL.revokeObjectURL(escolhida);
  escolhida = arquivo ? URL.createObjectURL(arquivo) : null;
});

/** Dama Solitária (já sem fundo) colada num cenário: o recorte certo é conhecido. */
async function imagemDeTeste(): Promise<{ tela: HTMLCanvasElement; verdade: Uint8Array | null }> {
  if (escolhida) {
    const sua = await imagem(escolhida);
    const tela = document.createElement('canvas');
    tela.width = sua.width;
    tela.height = sua.height;
    tela.getContext('2d')!.drawImage(sua, 0, 0);
    return { tela, verdade: null };
  }
  const [cenario, dama] = await Promise.all([
    imagem('/assets/img/entidades/gambler-fundo.jpg'),
    imagem('/assets/img/entidades/dama-solitaria.png'),
  ]);
  const tela = document.createElement('canvas');
  tela.width = cenario.width;
  tela.height = cenario.height;
  const ctx = tela.getContext('2d')!;
  ctx.drawImage(cenario, 0, 0);
  const escala = 2.5;
  const w = dama.width * escala;
  const h = dama.height * escala;
  const x = (tela.width - w) / 2;
  const y = tela.height - h - 20;
  ctx.drawImage(dama, x, y, w, h);

  const gabarito = document.createElement('canvas');
  gabarito.width = tela.width;
  gabarito.height = tela.height;
  const g = gabarito.getContext('2d')!;
  g.drawImage(dama, x, y, w, h);
  const alfa = g.getImageData(0, 0, tela.width, tela.height).data;
  const verdade = new Uint8Array(tela.width * tela.height);
  for (let i = 0; i < verdade.length; i++) verdade[i] = alfa[i * 4 + 3] > 127 ? 1 : 0;
  return { tela, verdade };
}

function sobreposicao(canvas: HTMLCanvasElement, verdade: Uint8Array): number {
  const dados = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  let inter = 0;
  let uniao = 0;
  for (let i = 0; i < verdade.length; i++) {
    const previsto = dados[i * 4 + 3] > 127 ? 1 : 0;
    if (previsto && verdade[i]) inter++;
    if (previsto || verdade[i]) uniao++;
  }
  return +(inter / Math.max(1, uniao)).toFixed(3);
}

function mostrar(alvo: string, canvas: HTMLCanvasElement) {
  const caixa = document.getElementById(alvo)!;
  caixa.replaceChildren(canvas);
}

let transformers: Promise<any> | null = null;
function carregarTransformers() {
  transformers ??= import(/* @vite-ignore */ CDN_TRANSFORMERS);
  return transformers;
}

export async function removerFundo(
  modelo: keyof typeof MODELOS_FUNDO = 'birefnet',
  dispositivo: Dispositivo = 'webgpu',
  // O ormbg só vem em fp16 e uint8; os outros rodam em fp32 fora da placa.
  precisao: 'fp16' | 'fp32' | 'uint8' = modelo === 'ormbg' ? (dispositivo === 'wasm' ? 'uint8' : 'fp16') : dispositivo === 'webgpu' ? 'fp16' : 'fp32',
) {
  const { pipeline } = await carregarTransformers();
  const { tela, verdade } = await imagemDeTeste();
  mostrar('fundo-antes', tela);
  const blob = await new Promise<Blob>((r) => tela.toBlob((b) => r(b!), 'image/png'));
  const url = URL.createObjectURL(blob);

  const inicio = performance.now();
  const recortar = await pipeline('background-removal', MODELOS_FUNDO[modelo], {
    device: dispositivo,
    dtype: precisao,
  });
  const carga = performance.now() - inicio;

  const t1 = performance.now();
  await recortar(url);
  const primeira = performance.now() - t1;
  const t2 = performance.now();
  // A versão 4 devolve a imagem direto quando a entrada é uma só.
  const resposta = await recortar(url);
  const saida = Array.isArray(resposta) ? resposta[0] : resposta;
  const segunda = performance.now() - t2;

  // toCanvas() pode devolver OffscreenCanvas: copia para um canvas da página.
  const recortada = saida.toCanvas() as HTMLCanvasElement | OffscreenCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = recortada.width;
  canvas.height = recortada.height;
  canvas.getContext('2d')!.drawImage(recortada, 0, 0);
  mostrar('fundo-depois', canvas);
  const resultado = {
    modelo,
    dispositivo,
    precisao,
    tamanho: `${tela.width}x${tela.height}`,
    cargaMs: Math.round(carga),
    primeiraMs: Math.round(primeira),
    seguintesMs: Math.round(segunda),
    acerto: verdade ? sobreposicao(canvas, verdade) : null,
  };
  anotar(
    `Remover fundo (${modelo}, ${dispositivo}): carga ${resultado.cargaMs} ms, 1ª ${resultado.primeiraMs} ms, ` +
      `depois ${resultado.seguintesMs} ms${resultado.acerto === null ? '' : `, acerto ${resultado.acerto}`}`,
  );
  return resultado;
}

let ort: Promise<any> | null = null;
function carregarOrt() {
  ort ??= import(/* @vite-ignore */ `${CDN_ORT}ort.webgpu.min.mjs`).then((m) => {
    m.env.wasm.wasmPaths = CDN_ORT;
    return m;
  });
  return ort;
}

export async function melhorar(
  modelo: keyof typeof MODELOS_ESRGAN = 'geral',
  dispositivo: Dispositivo = 'webgpu',
  url = escolhida ?? '/assets/img/anao_fantasy_bg.webp',
  pedaco = 256,
) {
  const biblioteca = await carregarOrt();
  const inicio = performance.now();
  const sessao = await biblioteca.InferenceSession.create(MODELOS_ESRGAN[modelo], { executionProviders: [dispositivo] });
  const carga = performance.now() - inicio;
  const [entrada] = sessao.inputNames;
  const [saidaNome] = sessao.outputNames;

  const original = await imagem(url);
  const W = original.width;
  const H = original.height;
  const fonte = new OffscreenCanvas(W, H).getContext('2d')!;
  fonte.drawImage(original, 0, 0);
  const ESC = 4;
  const borda = 8;
  const saida = new ImageData(W * ESC, H * ESC);
  let pedacos = 0;
  const t0 = performance.now();
  for (let y0 = 0; y0 < H; y0 += pedaco) {
    for (let x0 = 0; x0 < W; x0 += pedaco) {
      const x1 = Math.max(0, x0 - borda);
      const y1 = Math.max(0, y0 - borda);
      const x2 = Math.min(W, x0 + pedaco + borda);
      const y2 = Math.min(H, y0 + pedaco + borda);
      const w = x2 - x1;
      const h = y2 - y1;
      const px = fonte.getImageData(x1, y1, w, h).data;
      const tensor = new Float32Array(3 * w * h);
      for (let i = 0; i < w * h; i++) {
        tensor[i] = px[i * 4] / 255;
        tensor[w * h + i] = px[i * 4 + 1] / 255;
        tensor[2 * w * h + i] = px[i * 4 + 2] / 255;
      }
      const resultado = await sessao.run({ [entrada]: new biblioteca.Tensor('float32', tensor, [1, 3, h, w]) });
      const out = resultado[saidaNome];
      const dados = out.data as Float32Array;
      const ow = w * ESC;
      const oh = h * ESC;
      // Copia só o miolo (sem a borda de emenda) para o lugar certo.
      const ix = (x0 - x1) * ESC;
      const iy = (y0 - y1) * ESC;
      const cw = Math.min(pedaco, W - x0) * ESC;
      const ch = Math.min(pedaco, H - y0) * ESC;
      for (let yy = 0; yy < ch; yy++) {
        for (let xx = 0; xx < cw; xx++) {
          const s = (iy + yy) * ow + ix + xx;
          const d = ((y0 * ESC + yy) * W * ESC + x0 * ESC + xx) * 4;
          saida.data[d] = Math.max(0, Math.min(255, dados[s] * 255));
          saida.data[d + 1] = Math.max(0, Math.min(255, dados[oh * ow + s] * 255));
          saida.data[d + 2] = Math.max(0, Math.min(255, dados[2 * oh * ow + s] * 255));
          saida.data[d + 3] = 255;
        }
      }
      pedacos++;
    }
  }
  const processamento = performance.now() - t0;

  // Comparação lado a lado de um recorte: ampliação comum x Real-ESRGAN.
  const recorte = escolhida
    ? { x: Math.max(0, Math.round(W / 2 - 100)), y: Math.max(0, Math.round(H / 2 - 75)), w: Math.min(200, W), h: Math.min(150, H) }
    : { x: 180, y: 380, w: 200, h: 150 };
  const grande = new OffscreenCanvas(W * ESC, H * ESC);
  grande.getContext('2d')!.putImageData(saida, 0, 0);
  const comparar = document.createElement('canvas');
  comparar.width = recorte.w * ESC * 2 + 8;
  comparar.height = recorte.h * ESC;
  const c = comparar.getContext('2d')!;
  c.imageSmoothingQuality = 'high';
  c.drawImage(original, recorte.x, recorte.y, recorte.w, recorte.h, 0, 0, recorte.w * ESC, recorte.h * ESC);
  c.drawImage(grande, recorte.x * ESC, recorte.y * ESC, recorte.w * ESC, recorte.h * ESC, recorte.w * ESC + 8, 0, recorte.w * ESC, recorte.h * ESC);
  mostrar('melhorar-comparacao', comparar);

  const megapixels = (W * H) / 1e6;
  const resultado = {
    modelo,
    dispositivo,
    entrada: `${W}x${H}`,
    saida: `${W * ESC}x${H * ESC}`,
    pedacos,
    cargaMs: Math.round(carga),
    processamentoMs: Math.round(processamento),
    msPorMegapixelDeEntrada: Math.round(processamento / megapixels),
  };
  anotar(`Melhorar 4x (${modelo}, ${dispositivo}): ${resultado.entrada} para ${resultado.saida} em ${resultado.processamentoMs} ms (${resultado.pedacos} pedaços, carga ${resultado.cargaMs} ms)`);
  return resultado;
}

declare global {
  interface Window {
    __oficina?: { removerFundo: typeof removerFundo; melhorar: typeof melhorar };
  }
}

window.__oficina = { removerFundo, melhorar };

for (const botao of document.querySelectorAll<HTMLButtonElement>('button[data-acao]')) {
  botao.addEventListener('click', async () => {
    botao.disabled = true;
    try {
      const [acao, modelo, dispositivo] = botao.dataset.acao!.split(':');
      if (acao === 'fundo') await removerFundo(modelo as keyof typeof MODELOS_FUNDO, dispositivo as Dispositivo);
      else await melhorar(modelo as keyof typeof MODELOS_ESRGAN, dispositivo as Dispositivo);
    } catch (erro) {
      anotar(`Erro: ${erro instanceof Error ? erro.message : String(erro)}`);
    } finally {
      botao.disabled = false;
    }
  });
}
