// Sobe uma imagem do PC para o acervo: o navegador decodifica, corta em
// ladrilhos de 1024 px (mais a versão em 1/4 para o zoom de longe) e a
// miniatura, converte para WebP e manda um pedaço por pedido.

import { acervoApi, type IItemAcervo, type TipoItemAcervo } from '../../../services/acervoApi';
import { chavesEsperadas, LADO_LADRILHO } from '../motor/geometria';
import { LADO_MAXIMO_DO_TOKEN, tamanhoQueCabe } from './imagemConta';

const LADO_MINIATURA = 320;
const QUALIDADE = 0.9;
const ENVIOS_SIMULTANEOS = 3;

export interface ProgressoEnvio {
  arquivo: string;
  feitos: number;
  total: number;
}

async function paraBlob(tela: OffscreenCanvas): Promise<Blob> {
  // Navegador que não grava WebP devolve PNG; o servidor aceita os dois.
  return tela.convertToBlob({ type: 'image/webp', quality: QUALIDADE });
}

function recortar(fonte: ImageBitmap | OffscreenCanvas, x: number, y: number, w: number, h: number): OffscreenCanvas {
  const tela = new OffscreenCanvas(w, h);
  const ctx = tela.getContext('2d')!;
  ctx.drawImage(fonte, x, y, w, h, 0, 0, w, h);
  return tela;
}

/** Desenha cada pedaço só quando ele vai subir, para não guardar o mapa inteiro picado na memória. */
function fabricaDePedacos(imagem: ImageBitmap): (chave: string) => Promise<Blob> {
  let reduzida: OffscreenCanvas | null = null;
  return async (chave) => {
    if (chave === 'mini') {
      const escala = Math.min(1, LADO_MINIATURA / Math.max(imagem.width, imagem.height));
      const w = Math.max(1, Math.round(imagem.width * escala));
      const h = Math.max(1, Math.round(imagem.height * escala));
      const tela = new OffscreenCanvas(w, h);
      const ctx = tela.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imagem, 0, 0, w, h);
      return paraBlob(tela);
    }
    const [nivel, coluna, linha] = chave.split('/');
    const x = Number(coluna) * LADO_LADRILHO;
    const y = Number(linha) * LADO_LADRILHO;
    if (nivel === 'n0') {
      return paraBlob(recortar(imagem, x, y, Math.min(LADO_LADRILHO, imagem.width - x), Math.min(LADO_LADRILHO, imagem.height - y)));
    }
    if (!reduzida) {
      reduzida = new OffscreenCanvas(Math.ceil(imagem.width / 4), Math.ceil(imagem.height / 4));
      const ctx = reduzida.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imagem, 0, 0, reduzida.width, reduzida.height);
    }
    return paraBlob(recortar(reduzida, x, y, Math.min(LADO_LADRILHO, reduzida.width - x), Math.min(LADO_LADRILHO, reduzida.height - y)));
  };
}

export function nomeSemExtensao(nome: string): string {
  return nome.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imagem';
}

export interface OpcoesDeEnvio {
  tipo: TipoItemAcervo;
  pastaId: string | null;
  etiquetas?: string[];
  aoProgresso?: (p: ProgressoEnvio) => void;
}

/** Token grande demais é reduzido (com boa suavização) ao que o mapa entrega inteiro; as outras imagens sobem como são. */
async function reduzirSeForToken(imagem: ImageBitmap, tipo: TipoItemAcervo): Promise<{ imagem: ImageBitmap; reduzida: boolean }> {
  if (tipo !== 'token') return { imagem, reduzida: false };
  const { largura, altura } = tamanhoQueCabe(imagem.width, imagem.height, LADO_MAXIMO_DO_TOKEN);
  if (largura === imagem.width && altura === imagem.height) return { imagem, reduzida: false };
  const tela = new OffscreenCanvas(largura, altura);
  const ctx = tela.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imagem, 0, 0, largura, altura);
  return { imagem: tela.transferToImageBitmap(), reduzida: true };
}

/** Sobe uma imagem já decodificada (quem chama fecha o bitmap). Serve para peças recortadas no navegador. */
export async function subirImagemPronta(original: ImageBitmap, nome: string, opcoes: OpcoesDeEnvio): Promise<IItemAcervo> {
  const { imagem, reduzida } = await reduzirSeForToken(original, opcoes.tipo);
  try {
    return await enviarBitmap(imagem, nome, opcoes);
  } finally {
    if (reduzida) imagem.close();
  }
}

async function enviarBitmap(imagem: ImageBitmap, nome: string, opcoes: OpcoesDeEnvio): Promise<IItemAcervo> {
  const { id, chaves } = await acervoApi.criarItem({
    nome,
    tipo: opcoes.tipo,
    largura: imagem.width,
    altura: imagem.height,
    pasta_id: opcoes.pastaId,
    ...(opcoes.etiquetas?.length ? { etiquetas: opcoes.etiquetas } : {}),
  });
  // Mesmo cálculo dos dois lados; se divergir, vale o que o servidor pediu.
  const lista = chaves.length ? chaves : chavesEsperadas(imagem.width, imagem.height);
  const fabricar = fabricaDePedacos(imagem);
  let feitos = 0;
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < lista.length) {
      const chave = lista[proximo++];
      await acervoApi.subirPedaco(id, chave, await fabricar(chave));
      feitos++;
      opcoes.aoProgresso?.({ arquivo: nome, feitos, total: lista.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(ENVIOS_SIMULTANEOS, lista.length) }, trabalhador));
  return acervoApi.concluirItem(id);
}

export async function subirParaOAcervo(arquivo: File, opcoes: OpcoesDeEnvio): Promise<IItemAcervo> {
  const imagem = await createImageBitmap(arquivo);
  try {
    const item = await subirImagemPronta(imagem, nomeSemExtensao(arquivo.name), {
      ...opcoes,
      aoProgresso: opcoes.aoProgresso && ((p) => opcoes.aoProgresso?.({ ...p, arquivo: arquivo.name })),
    });
    return item;
  } finally {
    imagem.close();
  }
}

/** Arquivos de imagem escolhidos (ou de uma pasta inteira, com o caminho de cada um). */
export function imagensDaSelecao(arquivos: FileList | File[]): File[] {
  return Array.from(arquivos).filter((arquivo) => /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i.test(arquivo.type));
}

/** "Mapas/Cavernas/andar1.png" vira "Mapas/Cavernas" (pasta) para recriar a árvore no acervo. */
export function pastaDoArquivo(arquivo: File): string | null {
  const caminho = (arquivo as File & { webkitRelativePath?: string }).webkitRelativePath || '';
  const partes = caminho.split('/').filter(Boolean);
  return partes.length > 1 ? partes.slice(0, -1).join('/') : null;
}
