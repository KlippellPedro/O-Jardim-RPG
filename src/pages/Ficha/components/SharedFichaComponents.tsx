import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Search, X } from 'lucide-react';
import { AjusteButton } from './AjustesFichaModal';
import { ModalPortal } from './ModalPortal';

export const SectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 mb-5">
    <h3 className="text-[#c7a44c] text-xs font-bold tracking-widest uppercase whitespace-nowrap">{title}</h3>
    <div className="w-full h-[1px] bg-gradient-to-r from-[#c7a44c]/30 to-transparent" />
  </div>
);

export const LabeledInput = ({ label, value, placeholder = '', onChange, readOnly = false, type = 'text' }: any) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>
    <input
      aria-label={label}
      type={type}
      value={value ?? (type === 'number' ? 0 : '')}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full min-w-0 bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
    />
  </div>
);

export const LabeledSelect = ({ label, value, options, onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>
    <select
      aria-label={label}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors appearance-none cursor-pointer"
    >
      <option value="">Selecione...</option>
      {options.map((option: any) => (
        <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>
      ))}
    </select>
  </div>
);

export const LabeledModalSelect = ({ label, value, options, onChange, placeholder = 'Selecione...', disabled = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const optionValue = (option: any) => typeof option === 'object' ? option.value : option;
  const optionLabel = (option: any) => typeof option === 'object' ? option.label : option;
  const selected = options.find((option: any) => optionValue(option) === value);
  const selectedLabel = optionLabel(selected) || value || placeholder;
  const buscaNormalizada = busca.trim().toLocaleLowerCase('pt-BR');
  const opcoesFiltradas = options.filter((option: any) => (
    !buscaNormalizada
    || String(optionLabel(option) || '').toLocaleLowerCase('pt-BR').includes(buscaNormalizada)
  ));

  const fechar = () => {
    setIsOpen(false);
    setBusca('');
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        {label && <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>}
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(true); }}
          aria-disabled={disabled}
          className={`flex min-w-0 items-center justify-between rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-left text-sm text-gray-300 transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-[#c7a44c]/50 cursor-pointer'}`}
        >
          <span className={`min-w-0 truncate ${!value ? 'text-gray-600' : 'text-gray-300'}`}>{selectedLabel}</span>
          <span className="text-gray-600 text-[10px] font-mono">▼</span>
        </button>
      </div>

      {isOpen && (
        <ModalPortal onClose={fechar}>
        <div className="modal-viewport fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={fechar}>
          <div role="dialog" aria-modal="true" aria-label={`Selecionar ${label || 'opção'}`} className="modal-surface flex w-full max-w-md flex-col rounded-2xl border border-[#c7a44c]/30 bg-[#0f0e15] p-4 shadow-[0_0_50px_rgba(199,164,76,0.1)] sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-[#c7a44c] font-bold tracking-widest uppercase">Selecione {label || 'uma opção'}</h3>
              <button type="button" onClick={fechar} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/10 hover:text-white" aria-label="Fechar opções">
                <X size={20} />
              </button>
            </div>
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input
                autoFocus
                aria-label={`Pesquisar ${String(label || 'opção').toLocaleLowerCase('pt-BR')}`}
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder={`Pesquisar ${String(label || 'opção').toLocaleLowerCase('pt-BR')}...`}
                className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
              />
            </div>
            <div className="overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
              {opcoesFiltradas.map((option: any) => {
                const valorOpcao = optionValue(option);
                const rotuloOpcao = optionLabel(option);
                const isSelected = valorOpcao === value;
                return (
                  <button
                    type="button"
                    key={String(valorOpcao)}
                    onClick={() => { onChange(valorOpcao); fechar(); }}
                    className={`p-3 rounded-lg border text-left transition-colors flex justify-between items-center ${isSelected ? 'border-[#c7a44c] bg-[#c7a44c]/10 text-[#c7a44c]' : 'border-white/5 hover:border-[#c7a44c]/30 hover:bg-[#c7a44c]/5 text-gray-300'}`}
                  >
                    <span className="font-bold">{rotuloOpcao}</span>
                    {isSelected ? <span className="text-xs">✓</span> : null}
                  </button>
                );
              })}
              {opcoesFiltradas.length === 0 ? <p className="py-6 text-center text-sm text-gray-600">Nenhuma opção encontrada.</p> : null}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
};

export const ResourceBar = ({ label, color, current, max, onAdd, onSub, onHelpClick, onAdjustClick, onMaxChange }: any) => {
  const maxSeguro = Math.max(1, Number(max) || 1);
  const percent = Math.min(100, Math.max(0, (Number(current) / maxSeguro) * 100));
  const bgColors: Record<string, { bg: string; glow: string }> = {
    vermelho: { bg: 'bg-gradient-to-r from-[#8b1c2b] to-[#dc2626]', glow: 'shadow-[0_0_15px_rgba(220,38,38,0.4)]' },
    azul: { bg: 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.4)]' },
    roxo: { bg: 'bg-gradient-to-r from-[#5b21b6] to-[#a855f7]', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' },
    cinza: { bg: 'bg-gradient-to-r from-[#334155] to-[#94a3b8]', glow: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]' },
  };
  const theme = bgColors[color] || bgColors.cinza;
  const isCritical = color === 'cinza' ? (percent >= 75 && current < maxSeguro) : (percent <= 25 && current > 0);
  const [inputValue, setInputValue] = useState<string | undefined>();
  const [maxInputValue, setMaxInputValue] = useState<string | undefined>();

  const handleBlur = (val: string) => {
    if (!val.trim()) {
      setInputValue(undefined);
      return;
    }
    if (val.startsWith('+')) onAdd(parseInt(val.substring(1), 10) || 0);
    else if (val.startsWith('-')) onSub(parseInt(val.substring(1), 10) || 0);
    else {
      const absVal = parseInt(val, 10);
      if (!Number.isNaN(absVal)) {
        if (absVal > current) onAdd(absVal - current);
        else if (absVal < current) onSub(current - absVal);
      }
    }
    setInputValue(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: color === 'vermelho' ? '#e53935' : color === 'azul' ? '#29b6f6' : color === 'roxo' ? '#b39ddb' : '#9e9e9e' }}>{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" className="opacity-50 transition-opacity hover:opacity-100" onClick={onHelpClick} aria-label={`Ajuda sobre ${label}`}>
            <HelpCircle size={14} className="text-[#c7a44c]" />
          </button>
          {onAdjustClick ? <AjusteButton onClick={onAdjustClick} label={label} /> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <button type="button" onClick={() => onSub(5)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">-5</button>
          <button type="button" onClick={() => onSub(1)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">-1</button>
        </div>
        <div className={`flex-1 h-8 bg-[#050508] border ${isCritical ? 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-white/10'} rounded-lg relative overflow-hidden flex items-center justify-center group shadow-inner ring-1 ring-inset ring-white/5`}>
          <motion.div
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            className={`absolute left-0 top-0 bottom-0 ${theme.bg} ${percent > 0 ? theme.glow : ''}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </motion.div>
          <div className="relative z-10 flex items-center text-white font-bold text-xs font-mono drop-shadow-md">
            <input
              type="text"
              className="bg-transparent border-none outline-none text-right w-10 text-white font-bold placeholder-white/70 group-hover:bg-white/10 rounded transition-colors"
              value={inputValue !== undefined ? inputValue : current}
              onChange={(event) => setInputValue(event.target.value)}
              onBlur={(event) => handleBlur(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }}
              aria-label={`Valor atual de ${label}`}
            />
            <span className="mx-1">/</span>
            {onMaxChange ? (
              <input
                type="number"
                min={1}
                value={maxInputValue ?? maxSeguro}
                onChange={(event) => setMaxInputValue(event.target.value)}
                onBlur={(event) => {
                  const novoMaximo = Math.max(1, Math.trunc(Number(event.target.value) || maxSeguro));
                  onMaxChange(novoMaximo);
                  setMaxInputValue(undefined);
                }}
                onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }}
                className="w-10 rounded border-none bg-transparent text-left font-bold text-white outline-none transition-colors hover:bg-white/10 focus:bg-white/10"
                aria-label={`Máximo de ${label}`}
              />
            ) : <span>{maxSeguro}</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onAdd(1)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+1</button>
          <button type="button" onClick={() => onAdd(5)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+5</button>
        </div>
      </div>
    </div>
  );
};
