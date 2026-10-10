import { slotDeEquipamento, type SlotEquipamento } from './equipamentoService';
import { temProficienciaEquipamento } from '../pages/Ficha/utils/catalogoResistProf';

const CATEGORIA_DA_PROFICIENCIA: Record<SlotEquipamento, 'armas' | 'armaduras' | 'escudos'> = {
  arma: 'armas',
  armadura: 'armaduras',
  malha: 'armaduras',
  escudo: 'escudos',
};

/**
 * Das peças que acabaram de ser compradas, quais já podem sair equipadas: as que cabem numa vaga livre do corpo.
 * Peça marcial sem a proficiência fica na mochila (equipar custa Defesa ou acerto), e o jogador decide.
 * `inventario` é o estado depois da compra; `catalogoIds` são os ids do catálogo comprados, na ordem do carrinho.
 * Devolve os `item_id` do inventário a equipar.
 */
export function escolherItensParaEquipar(
  inventario: any[],
  catalogoIds: string[],
  proficiencias: unknown,
): string[] {
  const lista = Array.isArray(inventario) ? inventario : [];
  const ocupadas = new Set<SlotEquipamento>();
  for (const item of lista) {
    const slot = slotDeEquipamento(item);
    if (slot && item?.dados?.equipado === true) ocupadas.add(slot);
  }

  const escolhidos: string[] = [];
  for (const catalogoId of catalogoIds) {
    const item = lista.find((entrada) => String(entrada?.dados?.catalogo_item_id || '') === catalogoId);
    if (!item || item.dados?.equipado === true) continue;
    const slot = slotDeEquipamento(item);
    if (!slot || ocupadas.has(slot)) continue;
    const subtipo = String(item.dados?.subtipo || '').toLowerCase();
    if (subtipo === 'marcial' && !temProficienciaEquipamento(proficiencias, CATEGORIA_DA_PROFICIENCIA[slot], 'marcial')) continue;
    ocupadas.add(slot);
    escolhidos.push(String(item.item_id));
  }
  return escolhidos;
}
