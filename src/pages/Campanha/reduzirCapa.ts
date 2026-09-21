import { recorteDaCapa } from './campanha';

const TIPOS_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const LIMITE_CARACTERES = 210_000; // o servidor aceita até 220 mil
const LARGURAS = [1200, 960, 720, 540];
const QUALIDADES = [0.8, 0.68, 0.56];

const carregar = (arquivo: File): Promise<HTMLImageElement> =>
  new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => { URL.revokeObjectURL(url); resolver(imagem); };
    imagem.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error('Não foi possível abrir a imagem.')); };
    imagem.src = url;
  });

/** Corta a imagem em faixa 3:1 (centralizada) e reduz até caber no limite da capa. */
export async function reduzirCapa(arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.has(arquivo.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  if (arquivo.size > 15 * 1024 * 1024) throw new Error('A imagem precisa ter no máximo 15 MB.');
  const imagem = await carregar(arquivo);
  const corte = recorteDaCapa(imagem.naturalWidth, imagem.naturalHeight);
  const canvas = document.createElement('canvas');
  const contexto = canvas.getContext('2d');
  if (!contexto || corte.w === 0) throw new Error('Este navegador não consegue preparar a imagem.');
  for (const largura of LARGURAS) {
    canvas.width = Math.min(largura, corte.w);
    canvas.height = Math.round(canvas.width / 3);
    contexto.fillStyle = '#000';
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagem, corte.x, corte.y, corte.w, corte.h, 0, 0, canvas.width, canvas.height);
    for (const qualidade of QUALIDADES) {
      const resultado = canvas.toDataURL('image/jpeg', qualidade);
      if (resultado.length <= LIMITE_CARACTERES) return resultado;
    }
  }
  throw new Error('Essa imagem é detalhada demais para uma capa. Tente outra.');
}
