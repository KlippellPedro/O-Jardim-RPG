/**
 * Os modelos que o Mestre encontra na aba Documentos.
 *
 * Para pôr um modelo novo: crie um arquivo nesta pasta exportando um `IModeloDeDocumento` (veja
 * `bilhete.ts`, o mais curto), use as ferramentas de `../pincel.ts` para desenhar e acrescente o
 * modelo nesta lista. O `id` não muda depois de publicado, porque é ele que liga os documentos
 * salvos no banco ao desenho; trocar o nome, os textos de exemplo e o desenho pode à vontade.
 * Campo novo num modelo antigo aparece com o exemplo nos documentos que já existiam.
 *
 * Versão de tecnologia: o campo `suporte` (ver `../aparelho.ts`) troca o papel pelo tablet ou pelo cartão da
 * AstraTech sem mudar os outros campos; os campos que só servem num dos dois levam `visivel`.
 */

import type { CategoriaDeModelo, IModeloDeDocumento } from '../modelo';
import { bilhete } from './bilhete';
import { carta } from './carta';
import { cartaoDeVisita } from './cartaoDeVisita';
import { conversa, postDeRede, telaDeBloqueio } from './celular';
import { chave } from './chave';
import { comprovante } from './comprovante';
import { contrato } from './contrato';
import { convite } from './convite';
import { credencial } from './credencial';
import { diario } from './diario';
import { edital } from './edital';
import { fita } from './fita';
import { fotografia } from './fotografia';
import { frasco } from './frasco';
import { recorteDeJornal } from './jornal';
import { passagem } from './passagem';
import { cartazDeProcurado } from './procurado';
import { relatorio } from './relatorio';

export const MODELOS: readonly IModeloDeDocumento[] = [
  cartazDeProcurado,
  carta,
  bilhete,
  diario,
  cartaoDeVisita,
  credencial,
  passagem,
  convite,
  edital,
  contrato,
  relatorio,
  comprovante,
  recorteDeJornal,
  chave,
  fita,
  fotografia,
  frasco,
  postDeRede,
  conversa,
  telaDeBloqueio,
];

export const ORDEM_DAS_CATEGORIAS: readonly CategoriaDeModelo[] = [
  'Cartazes', 'Cartas e bilhetes', 'Cartões', 'Papéis oficiais', 'Imprensa', 'Objetos', 'AstraTech',
];

export function modeloPorId(id: string): IModeloDeDocumento | null {
  return MODELOS.find((modelo) => modelo.id === id) ?? null;
}
