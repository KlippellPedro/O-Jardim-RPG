import { useEffect } from 'react';

/** Escape fecha o painel de cima (detalhes, mover, melhorar) em vez de seguir para o resto da página. */
export function useFecharComEscape(aoFechar: () => void, ativo = true) {
  useEffect(() => {
    if (!ativo) return undefined;
    const tratar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      aoFechar();
    };
    document.addEventListener('keydown', tratar, true);
    return () => document.removeEventListener('keydown', tratar, true);
  }, [aoFechar, ativo]);
}
