import { useCharacterStore } from '../store/useCharacterStore';

/** Lista de desejos por personagem: vive em ficha.wishlist, sincronizada pelo
 * autosave normal da ficha para aparecer igual em qualquer aparelho. */
export const useWishlist = (characterId: string) => {
  const wishlist = useCharacterStore((state) => {
    const bruta = state.characters.find((character) => character.id === characterId)?.ficha?.wishlist;
    return Array.isArray(bruta) ? bruta.filter((id): id is string => typeof id === 'string') : [];
  });
  const patchCharacter = useCharacterStore((state) => state.patchCharacter);

  const toggleWishlist = (itemId: string) => {
    if (!characterId) return;
    const proxima = wishlist.includes(itemId)
      ? wishlist.filter((id) => id !== itemId)
      : [...wishlist, itemId];
    patchCharacter(characterId, ['ficha', 'wishlist'], proxima);
  };

  return { wishlist, toggleWishlist };
};
