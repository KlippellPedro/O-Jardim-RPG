import { useState, useEffect } from 'react';

export const useWishlist = (characterId: string) => {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!characterId) {
      setWishlist([]);
      return;
    }
    const stored = localStorage.getItem(`wishlist_${characterId}`);
    if (stored) {
      try {
        setWishlist(JSON.parse(stored));
      } catch (e) {
        setWishlist([]);
      }
    } else {
      setWishlist([]);
    }
  }, [characterId]);

  const toggleWishlist = (itemId: string) => {
    if (!characterId) return;
    setWishlist(prev => {
      const newWishlist = prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId];
      localStorage.setItem(`wishlist_${characterId}`, JSON.stringify(newWishlist));
      return newWishlist;
    });
  };

  return { wishlist, toggleWishlist };
};
