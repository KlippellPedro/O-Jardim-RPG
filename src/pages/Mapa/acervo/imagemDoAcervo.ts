// Monta de volta, no navegador, uma imagem do Acervo que o servidor guarda em ladrilhos de 1024 px.

import type { IItemAcervo } from '../../../services/acervoApi';
import { urlPedaco } from '../../../services/mapaApi';
import { LADO_LADRILHO } from '../motor/geometria';

/** O que é preciso saber de uma imagem do Acervo para juntar os ladrilhos. */
export type ItemParaMontar = Pick<IItemAcervo, 'id' | 'largura' | 'altura' | 'chaves'>;

/** A imagem inteira, no tamanho original, juntando os ladrilhos cheios (n0). */
export async function imagemDoAcervo(item: ItemParaMontar): Promise<OffscreenCanvas> {
  const tela = new OffscreenCanvas(item.largura, item.altura);
  const ctx = tela.getContext('2d')!;
  await Promise.all(item.chaves.filter((chave) => chave.startsWith('n0/')).map(async (chave) => {
    const [, coluna, linha] = chave.split('/').map(Number);
    const resposta = await fetch(urlPedaco(item.id, chave), { credentials: 'same-origin' });
    if (!resposta.ok) throw new Error(`Faltou um pedaço da imagem (${resposta.status}).`);
    const pedaco = await createImageBitmap(await resposta.blob());
    ctx.drawImage(pedaco, coluna * LADO_LADRILHO, linha * LADO_LADRILHO);
    pedaco.close();
  }));
  return tela;
}
