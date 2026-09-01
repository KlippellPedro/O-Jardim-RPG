import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const dialogStack: symbol[] = [];
let scrollLockDepth = 0;
let bodyOverflowBeforeLock = '';

interface DialogAccessibilityOptions<T extends HTMLElement> {
  open: boolean;
  dialogRef: RefObject<T>;
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  closeOnEscape?: boolean;
  restoreFocus?: boolean;
  /** Elemento do backdrop quando ele é irmão do diálogo (não um ancestral) -
   * sem isto, hideContentOutsideDialog o marcaria `inert` junto com o resto
   * do conteúdo de fora, e o clique-fora-fecha nunca chegaria a disparar. */
  backdropRef?: RefObject<HTMLElement>;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && !element.hasAttribute('aria-hidden');
    });
}

interface InertedSibling {
  element: HTMLElement;
  hadInert: boolean;
  ariaHidden: string | null;
}

function hideContentOutsideDialog(dialog: HTMLElement, exempt: HTMLElement | null): InertedSibling[] {
  const changed: InertedSibling[] = [];
  let branch: HTMLElement = dialog;
  let parent = branch.parentElement;

  while (parent) {
    for (const sibling of Array.from(parent.children)) {
      if (sibling === branch || sibling === exempt || !(sibling instanceof HTMLElement)) continue;
      changed.push({
        element: sibling,
        hadInert: sibling.hasAttribute('inert'),
        ariaHidden: sibling.getAttribute('aria-hidden'),
      });
      sibling.setAttribute('inert', '');
      sibling.setAttribute('aria-hidden', 'true');
    }
    if (parent === document.body) break;
    branch = parent;
    parent = parent.parentElement;
  }

  return changed;
}

/**
 * Mantém o foco dentro de diálogos e devolve-o ao gatilho ao fechar.
 * A pilha evita que um drawer abaixo de um modal aninhado trate o mesmo evento.
 */
export function useDialogAccessibility<T extends HTMLElement>({
  open,
  dialogRef,
  onClose,
  initialFocusRef,
  returnFocusRef,
  closeOnEscape = true,
  restoreFocus = true,
  backdropRef,
}: DialogAccessibilityOptions<T>) {
  const idRef = useRef(Symbol('dialog'));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const id = idRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogStack.push(id);
    if (scrollLockDepth === 0) {
      bodyOverflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockDepth += 1;

    const dialog = dialogRef.current;
    const inertedSiblings = dialog ? hideContentOutsideDialog(dialog, backdropRef?.current ?? null) : [];
    const addedTabIndex = Boolean(dialog && !dialog.hasAttribute('tabindex'));
    if (addedTabIndex) dialog?.setAttribute('tabindex', '-1');

    const focusFrame = window.requestAnimationFrame(() => {
      const currentDialog = dialogRef.current;
      if (!currentDialog || dialogStack[dialogStack.length - 1] !== id) return;
      const target = initialFocusRef?.current ?? focusableElements(currentDialog)[0] ?? currentDialog;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || dialogStack[dialogStack.length - 1] !== id) return;
      if (event.key === 'Escape' && closeOnEscape && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const currentDialog = dialogRef.current;
      if (!currentDialog) return;
      const focusable = focusableElements(currentDialog);
      if (!focusable.length) {
        event.preventDefault();
        currentDialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!currentDialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      const index = dialogStack.lastIndexOf(id);
      if (index >= 0) dialogStack.splice(index, 1);
      scrollLockDepth = Math.max(0, scrollLockDepth - 1);
      if (scrollLockDepth === 0) document.body.style.overflow = bodyOverflowBeforeLock;
      if (addedTabIndex) dialog?.removeAttribute('tabindex');
      for (const { element, hadInert, ariaHidden } of inertedSiblings) {
        if (!hadInert) element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      }
      const focusReturnTarget = returnFocusRef?.current ?? previouslyFocused;
      if (restoreFocus && focusReturnTarget?.isConnected) {
        window.requestAnimationFrame(() => focusReturnTarget.focus({ preventScroll: true }));
      }
    };
  }, [backdropRef, closeOnEscape, dialogRef, initialFocusRef, open, restoreFocus, returnFocusRef]);
}
