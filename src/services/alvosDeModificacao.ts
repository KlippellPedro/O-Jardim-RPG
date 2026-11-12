import { slotDeEquipamento } from './equipamentoService';

/**
 * Que itens do inventário aceitam uma modificação, pela aplicação dela.
 *
 * Segue a regra do servidor (plataforma/routers/shop.py, _ALVOS_POR_APLICACAO)
 * e é um pouco mais fina na tela: modificação de escudo só oferece escudo, e de
 * armadura só oferece armadura, embora o servidor aceite as duas na categoria
 * "armadura". Antes a tela oferecia qualquer arma, armadura ou item para
 * qualquer modificação, e o servidor recusava a compra depois.
 */

const normalizar = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim();

/** Categorias de inventário que uma modificação genérica sempre aceitou. */
const ALVOS_GENERICOS = ['arma', 'armadura', 'veiculo', 'geral'];

export function aceitaModificacao(aplicacao: unknown, itemInventario: any): boolean {
  const categoria = String(itemInventario?.dados?.categoria || '');
  switch (normalizar(aplicacao)) {
    case 'armas':
      return categoria === 'arma' || categoria === 'veiculo';
    case 'armaduras':
      return categoria === 'veiculo' || (categoria === 'armadura' && slotDeEquipamento(itemInventario) !== 'escudo');
    case 'escudos':
      return categoria === 'veiculo' || (categoria === 'armadura' && slotDeEquipamento(itemInventario) === 'escudo');
    case 'implantes':
      return categoria === 'implante';
    default:
      return ALVOS_GENERICOS.includes(categoria);
  }
}
