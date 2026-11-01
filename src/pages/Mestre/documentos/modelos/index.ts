/**
 * Os modelos que o Mestre encontra na aba Documentos.
 *
 * Para pôr um modelo novo: crie um arquivo nesta pasta exportando um `IModeloDeDocumento` (veja
 * `bilhete.ts`, o mais curto), use as ferramentas de `../pincel.ts` para desenhar e acrescente o
 * modelo nesta lista. O `id` não muda depois de publicado, porque é ele que liga os documentos
 * salvos no banco ao desenho; trocar o nome, os textos de exemplo e o desenho pode à vontade.
 * Campo novo num modelo antigo aparece com o exemplo nos documentos que já existiam.
 */

import type { CategoriaDeModelo, IModeloDeDocumento } from '../modelo';
import { bilhete } from './bilhete';
import { carta } from './carta';
import { cartaoDeVisita } from './cartaoDeVisita';
import { cartazDeProcurado } from './procurado';
import { contrato } from './contrato';
import { credencial } from './credencial';
import { edital } from './edital';
import { recorteDeJornal } from './jornal';
import { relatorio } from './relatorio';

export const MODELOS: readonly IModeloDeDocumento[] = [
  cartazDeProcurado,
  carta,
  bilhete,
  cartaoDeVisita,
  credencial,
  edital,
  contrato,
  relatorio,
  recorteDeJornal,
];

export const ORDEM_DAS_CATEGORIAS: readonly CategoriaDeModelo[] = ['Cartazes', 'Cartas e bilhetes', 'Cartões', 'Papéis oficiais', 'Imprensa'];

export function modeloPorId(id: string): IModeloDeDocumento | null {
  return MODELOS.find((modelo) => modelo.id === id) ?? null;
}
