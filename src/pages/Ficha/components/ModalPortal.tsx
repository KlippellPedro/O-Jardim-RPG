import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalSfx } from '../../../hooks/useSfx';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';

interface ModalPortalProps {
  children: React.ReactElement;
  onClose?: () => void;
  manageFocus?: boolean;
}

export function ModalPortal({ children, onClose, manageFocus = true }: ModalPortalProps) {
  // Só existe montado enquanto aberto - equivale a isOpen sempre true.
  useModalSfx(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogAccessibility({
    open: manageFocus,
    dialogRef,
    onClose,
    closeOnEscape: Boolean(onClose),
  });

  if (typeof document === 'undefined') return null;
  const enhancedChild = manageFocus && typeof children.type === 'string'
    ? React.cloneElement(children as React.ReactElement<any>, {
        ref: dialogRef,
        role: children.props.role ?? 'dialog',
        'aria-modal': children.props['aria-modal'] ?? true,
        tabIndex: children.props.tabIndex ?? -1,
      })
    : children;
  return createPortal(enhancedChild, document.body);
}
