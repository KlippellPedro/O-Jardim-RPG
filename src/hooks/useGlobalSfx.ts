import { useEffect } from 'react';
import { sfx, type SfxName } from '../utils/audioSynth';

const INTERACTIVE_SELECTOR = 'button, a[href], summary, [role="button"], [role="tab"], input[type="submit"], input[type="button"]';

/** Delegação global de clique - dá som a todo botão/link do site sem exigir
 * que cada componente conheça o sistema de áudio. Qualquer elemento pode
 * ajustar o som com `data-sfx="confirm|cancel|select|navigate|..."` ou
 * silenciar com `data-sfx="off"` (o mais próximo do clique vence). */
export function useGlobalSfx() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const tagged = target.closest<HTMLElement>('[data-sfx]');
      if (tagged) {
        const value = tagged.getAttribute('data-sfx');
        if (value === 'off') return;
        if (value) sfx.play(value as SfxName);
        return;
      }

      const interactive = target.closest<HTMLElement>(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      if (interactive.hasAttribute('disabled') || interactive.getAttribute('aria-disabled') === 'true') return;

      const isLink = interactive.tagName === 'A';
      sfx.play(isLink ? 'navigate' : 'click');
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}
