import { useCallback, useEffect } from 'react';

const DEFAULT_MESSAGE = 'Existem alterações não salvas. Deseja descartá-las?';

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
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.download || target.target === '_blank') return;
      const destination = new URL(target.href, window.location.href);
      if (destination.href === window.location.href) return;
      if (!window.confirm(DEFAULT_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [dirty]);

  return useCallback((message = DEFAULT_MESSAGE) => (
    !dirty || window.confirm(message)
  ), [dirty]);
}
