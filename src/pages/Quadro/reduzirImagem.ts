import { cabeNoLimite, planoDeReducao } from './quadro';

const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANHO_MAXIMO_ARQUIVO = 12 * 1024 * 1024;

const carregar = (arquivo: File): Promise<HTMLImageElement> =>
  new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => { URL.revokeObjectURL(url); resolver(imagem); };
    imagem.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error('Não foi possível abrir a imagem.')); };
    imagem.src = url;
  });

/** Reduz a foto até caber no mural (JPEG, no máximo ~110 KB). Tenta lados e
 * qualidades cada vez menores; se nenhum couber, avisa em vez de enviar demais. */
export async function reduzirImagem(arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.has(arquivo.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) throw new Error('A imagem precisa ter no máximo 12 MB.');
  const imagem = await carregar(arquivo);
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('Este navegador não consegue preparar a imagem.');

  for (const { lado, qualidade } of planoDeReducao(imagem.naturalWidth, imagem.naturalHeight)) {
    const escala = lado / Math.max(imagem.naturalWidth, imagem.naturalHeight);
    canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
    contexto.fillStyle = '#000';
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const resultado = canvas.toDataURL('image/jpeg', qualidade);
    if (cabeNoLimite(resultado)) return resultado;
  }
  throw new Error('Essa foto é detalhada demais para o mural. Tente outra.');
}
