import { useState, useRef, useEffect, useCallback, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  labelClassName?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Dropdown estilizado. O <select> nativo delega a lista de opções ao SO, que
 * ignora boa parte do CSS (fundo branco no Windows) - aqui a lista é HTML
 * normal, renderizada num portal pra não ser cortada por overflow do painel/
 * modal que contém o campo.
 */
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 256 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  const updateCoords = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const edge = 8;
      const width = Math.max(0, Math.min(rect.width, viewportWidth - edge * 2));
      const maxHeight = Math.max(96, Math.min(256, viewportHeight - edge * 2));
      const measuredHeight = Math.min(panelRef.current?.scrollHeight ?? maxHeight, maxHeight);
      const left = Math.max(edge, Math.min(rect.left, viewportWidth - width - edge));
      const below = rect.bottom + 6;
      const above = rect.top - measuredHeight - 6;
      const preferredTop = below + measuredHeight <= viewportHeight - edge || above < edge ? below : above;
      const top = Math.max(edge, Math.min(preferredTop, viewportHeight - measuredHeight - edge));
      setCoords({ top, left, width, maxHeight });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateCoords();
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    const firstEnabledIndex = options.findIndex((option) => !option.disabled);
    optionRefs.current[selectedIndex >= 0 ? selectedIndex : firstEnabledIndex]?.focus();
  }, [isOpen, options, updateCoords, value]);

  const handleOpen = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const handleReposition = () => updateCoords();

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, updateCoords]);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = optionRefs.current.filter((option): option is HTMLButtonElement => Boolean(option && !option.disabled));
    if (!enabled.length) return;
    const currentIndex = Math.max(0, enabled.findIndex((option) => option === document.activeElement));
    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % enabled.length;
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = enabled.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const trigger = triggerRef.current;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => {
        if (panelRef.current?.contains(element)) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const triggerIndex = trigger ? focusable.indexOf(trigger) : -1;
      const nextIndex = event.shiftKey ? triggerIndex - 1 : triggerIndex + 1;
      const next = focusable[nextIndex] ?? trigger;
      setIsOpen(false);
      window.requestAnimationFrame(() => next?.focus());
      return;
    } else return;
    event.preventDefault();
    enabled[nextIndex]?.focus();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onKeyDown={(event) => {
          if (!isOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            handleOpen();
          }
        }}
        className={`flex min-h-11 min-w-0 items-center justify-between gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
          isOpen ? 'border-primary/60' : ''
        } ${className}`}
      >
        <span className={`truncate ${selected ? `text-white ${selected.labelClassName || ''}` : 'text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            onKeyDown={handleListKeyDown}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.maxHeight }}
            className="z-[9999] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#17151f] py-1 shadow-2xl shadow-black/60 custom-scrollbar"
          >
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">Nenhuma opção disponível.</div>
            )}
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  option.value === value
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={`truncate ${option.labelClassName || ''}`}>{option.label}</span>
                {option.value === value && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};
