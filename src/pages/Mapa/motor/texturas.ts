// Texturas das imagens do mapa (ladrilhos, retratos de token). `Texture.from` sozinho cria a textura sem mipmap:
// ao encolher a imagem (zoom de longe, token pequeno) cada ponto da tela pega um pixel só e a imagem "cintila" e
// serrilha. Com mipmap e anisotropia o navegador filtra de verdade, e a imagem fica limpa em qualquer zoom.

import { ImageSource, Texture } from 'pixi.js';

/** Quantas amostras de anisotropia: 4 é barato e basta para a imagem não borrar quando fica inclinada ou muito reduzida. */
export const ANISOTROPIA_DAS_IMAGENS = 4;

export function texturaNitida(imagem: ImageBitmap): Texture {
  const fonte = new ImageSource({
    resource: imagem,
    scaleMode: 'linear',
    mipmapFilter: 'linear',
    autoGenerateMipmaps: true,
    maxAnisotropy: ANISOTROPIA_DAS_IMAGENS,
  });
  return new Texture({ source: fonte });
}
