import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalSfx } from '../../../hooks/useSfx';

interface FichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  nested?: boolean;
}

const MODAL_WIDTH = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

const modalStack: string[] = [];
let scrollLockCount = 0;
let originalBodyOverflow = '';

export const FichaModal: React.FC<FichaModalProps> = ({ isOpen, onClose, title, eyebrow = 'Grimório', children, size = 'md', nested = false }) => {
  const titleId = useId();
  const modalId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalSfx(isOpen);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return undefined;
    if (scrollLockCount === 0) originalBodyOverflow = document.body.style.overflow;
    scrollLockCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) document.body.style.overflow = originalBodyOverflow;
    };
  }, [isOpen]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalStack.push(modalId);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && modalStack[modalStack.length - 1] === modalId) onCloseRef.current();
      if (event.key !== 'Tab' || modalStack[modalStack.length - 1] !== modalId) return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => !element.hasAttribute('aria-hidden'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      const firstField = dialogRef.current?.querySelector<HTMLElement>(
        '[data-autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
      );
      (firstField || closeButtonRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      const indice = modalStack.lastIndexOf(modalId);
      if (indice >= 0) modalStack.splice(indice, 1);
      previouslyFocused?.focus();
    };
  }, [isOpen, modalId]);

  if (typeof document === 'undefined') return null;

  const fichaShell = isOpen ? document.querySelector<HTMLElement>('.ficha-shell') : null;
  const estilosFicha = fichaShell ? window.getComputedStyle(fichaShell) : null;
  const estiloTema = {
    '--ficha-accent': estilosFicha?.getPropertyValue('--ficha-accent').trim() || '#c7a44c',
    '--ficha-secondary': estilosFicha?.getPropertyValue('--ficha-secondary').trim() || '#92764d',
  } as React.CSSProperties;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`modal-viewport fixed inset-0 ${nested ? 'z-[120]' : 'z-[100]'} flex items-center justify-center`}
          style={estiloTema}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            onClick={onClose}
            className="ficha-modal-backdrop absolute inset-0 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            data-ficha-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`ficha-modal-surface modal-surface relative flex w-full ${MODAL_WIDTH[size]} min-w-0 flex-col overflow-hidden rounded-2xl border`}
          >
            <div className="modal-padding relative flex items-start justify-between gap-3 border-b border-white/5 p-4 sm:p-6">
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">{eyebrow}</span>
                <h2 id={titleId} className="ficha-modal-title min-w-0 break-words font-serif text-[clamp(1rem,4.2vw,1.25rem)] uppercase leading-snug tracking-wider">{title}</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={`Fechar ${title}`}
                data-sfx="off"
                className="ficha-modal-close flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-gray-400 transition-all hover:rotate-90 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-padding custom-scrollbar overscroll-contain overflow-y-auto p-4 sm:p-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
