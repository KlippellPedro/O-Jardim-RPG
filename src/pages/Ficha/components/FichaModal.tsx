import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
    modalStack.push(modalId);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalStack[modalStack.length - 1] === modalId) onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const indice = modalStack.lastIndexOf(modalId);
      if (indice >= 0) modalStack.splice(indice, 1);
    };
  }, [isOpen, modalId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {isOpen && (
        <div className={`fixed inset-0 ${nested ? 'z-[120]' : 'z-[100]'} flex items-center justify-center p-3 sm:p-4`}>
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            className={`relative w-full ${MODAL_WIDTH[size]} min-w-0 bg-[#0f0e15] border border-[#c7a44c]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-start gap-3">
              <h2 id={titleId} className="min-w-0 flex-1 break-words text-xl text-[#c7a44c] font-serif uppercase tracking-wider">{title}</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={`Fechar ${title}`}
                className="w-8 h-8 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
