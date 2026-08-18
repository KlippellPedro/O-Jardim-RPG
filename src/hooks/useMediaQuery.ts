import { useCallback, useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}

/** Abaixo do breakpoint `md` (768px) do Tailwind, onde catálogos com lista +
 * detalhe trocam pro modal de detalhe em vez do painel lado a lado. */
export function useIsMobileViewport(): boolean {
  return useMediaQuery(MOBILE_QUERY, false);
}
