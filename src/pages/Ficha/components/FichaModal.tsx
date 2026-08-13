import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalSfx } from '../../../hooks/useSfx';

interface FichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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

export const FichaModal: React.FC<FichaModalProps> = ({ isOpen, onClose, title, children, size = 'md', nested = false }) => {
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
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      const indice = modalStack.lastIndexOf(modalId);
      if (indice >= 0) modalStack.splice(indice, 1);
      previouslyFocused?.focus();
    };
  }, [isOpen, modalId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {isOpen && (
        <div className={`modal-viewport fixed inset-0 ${nested ? 'z-[120]' : 'z-[100]'} flex items-center justify-center`}>
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            className={`modal-surface relative flex w-full ${MODAL_WIDTH[size]} min-w-0 flex-col overflow-hidden rounded-2xl border border-[#c7a44c]/30 bg-[#0f0e15] shadow-2xl`}
          >
            <div className="modal-padding flex items-start justify-between gap-3 border-b border-white/5 p-4 sm:p-6">
              <h2 id={titleId} className="min-w-0 flex-1 break-words text-xl text-[#c7a44c] font-serif uppercase tracking-wider">{title}</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={`Fechar ${title}`}
                data-sfx="off"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-gray-400 transition-colors hover:border-white/30 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-padding overflow-y-auto p-4 custom-scrollbar sm:p-6">
              {children}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
