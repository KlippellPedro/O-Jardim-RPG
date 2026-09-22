import { useMemo } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';

const SEM_WISHLIST: string[] = [];

/** Lista de desejos por personagem: vive em ficha.wishlist, sincronizada pelo
 * autosave normal da ficha para aparecer igual em qualquer aparelho. */
export const useWishlist = (characterId: string) => {
  // O seletor do Zustand só lê a referência bruta (estável entre renders
  // quando a wishlist não muda); filtrar/normalizar aqui dentro criaria um
  // array novo a cada chamada e o useSyncExternalStore entraria em loop
  // (React error #185).
  const bruta = useCharacterStore((state) => (
    state.characters.find((character) => character.id === characterId)?.ficha?.wishlist
  ));
  const wishlist = useMemo(
    () => (Array.isArray(bruta) ? bruta.filter((id): id is string => typeof id === 'string') : SEM_WISHLIST),
    [bruta],
  );
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
