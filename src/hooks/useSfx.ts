import { useCallback, useEffect, useRef } from 'react';
import { sfx, type SfxName } from '../utils/audioSynth';

/** Hook de áudio - único ponto que os componentes usam para disparar
 * efeitos sonoros de interface, sem conhecer detalhes de síntese/volume. */
export function useSfx() {
  const play = useCallback((name: SfxName) => sfx.play(name), []);
  return { play };
}

/** Toca "open"/"close" automaticamente conforme `isOpen` muda - cobre tanto
 * modais que alternam visibilidade (isOpen: true/false) quanto modais que só
 * existem montados enquanto abertos (chamar sempre com isOpen=true). */
export function useModalSfx(isOpen: boolean) {
  const prevRef = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = isOpen;

    if (prev === null) {
      if (isOpen) sfx.play('open');
      return;
    }
    if (!prev && isOpen) sfx.play('open');
    else if (prev && !isOpen) sfx.play('close');
  }, [isOpen]);

  // Componente desmontado enquanto ainda aberto (ex.: troca de rota) -
  // conta como fechar.
  useEffect(() => () => {
    if (prevRef.current) sfx.play('close');
  }, []);
}
