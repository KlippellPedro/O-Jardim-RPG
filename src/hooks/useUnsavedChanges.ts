import { useCallback, useEffect } from 'react';
import { confirmar } from '../components/avisos/confirmacao';

const DEFAULT_MESSAGE = 'Existem alterações não salvas. Deseja descartá-las?';

/** A pergunta de "descartar alterações": o botão perigoso é descartar, e o foco começa em continuar editando. */
export const perguntarDescarte = (mensagem: string = DEFAULT_MESSAGE) => confirmar({
  titulo: 'Alterações não salvas',
  mensagem,
  rotuloConfirmar: 'Descartar',
  rotuloCancelar: 'Continuar editando',
  tom: 'perigo',
});

/**
 * Avisa o painel de que há alterações não salvas e protege contra perder o trabalho sem querer.
 * Devolve `confirmarDescarte(mensagem?)`: resolve true quando não há nada a perder ou a pessoa
 * aceitou descartar. A pergunta é o diálogo do site, então a função é assíncrona: use `await`.
 */
export function useUnsavedChanges(
  dirty: boolean,
  onDirtyChange?: (dirty: boolean) => void,
) {
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // O diálogo é assíncrono: o clique no link é segurado e, se a pessoa aceitar descartar, o
    // mesmo link é clicado de novo (e dessa vez passa).
    let liberado: HTMLAnchorElement | null = null;
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.download || target.target === '_blank') return;
      const destination = new URL(target.href, window.location.href);
      if (destination.href === window.location.href) return;
      if (liberado === target) {
        liberado = null;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void perguntarDescarte().then((descartar) => {
        if (!descartar) return;
        liberado = target;
        target.click();
      });
    };
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [dirty]);

  return useCallback(async (message: string = DEFAULT_MESSAGE): Promise<boolean> => (
    !dirty || perguntarDescarte(message)
  ), [dirty]);
}
