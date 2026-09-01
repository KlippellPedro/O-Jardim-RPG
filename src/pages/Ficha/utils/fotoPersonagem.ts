export const TIPOS_FOTO_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;
export const RESOLUCAO_FOTO = 512;

export function validarArquivoFoto(file: File): void {
  if (!TIPOS_FOTO_ACEITOS.has(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > TAMANHO_MAXIMO_FOTO) {
    throw new Error('A imagem precisa ter no máximo 10 MB.');
  }
}

export function carregarImagemDeSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error('Não foi possível abrir a imagem selecionada.'));
    imagem.src = src;
  });
}
