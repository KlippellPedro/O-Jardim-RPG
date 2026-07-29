import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

export const SectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 mb-5">
    <h3 className="text-[#c7a44c] text-xs font-bold tracking-widest uppercase whitespace-nowrap">{title}</h3>
    <div className="w-full h-[1px] bg-gradient-to-r from-[#c7a44c]/30 to-transparent"></div>
  </div>
);

export const LabeledInput = ({ label, value, placeholder = '', onChange, readOnly = false, type = 'text' }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>
    <input 
      type={type} 
      value={value || (type === 'number' ? 0 : '')} 
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
    />
  </div>
);

export const LabeledSelect = ({ label, value, options, onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>
    <select 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors appearance-none cursor-pointer"
    >
      <option value="">Selecione...</option>
      {options.map((o: any) => (
        <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
      ))}
    </select>
  </div>
);

export const LabeledModalSelect = ({ label, value, options, onChange, placeholder = "Selecione..." }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((o: any) => (o.value || o) === value)?.label || value || placeholder;

  return (
    <>
      <div className="flex flex-col gap-1">
        {label && <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>}
        <div 
          onClick={() => setIsOpen(true)}
          className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 hover:border-[#c7a44c]/50 transition-colors cursor-pointer flex justify-between items-center"
        >
          <span className={!value ? "text-gray-600" : "text-gray-300"}>{selectedLabel}</span>
          <span className="text-gray-600 text-[10px] font-mono">▼</span>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[#0f0e15] border border-[#c7a44c]/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(199,164,76,0.1)] flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-[#c7a44c] font-bold tracking-widest uppercase">Selecione {label || 'uma opção'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
              {options.map((o: any) => {
                const isSelected = (o.value || o) === value;
                return (
                  <button
                    key={o.value || o}
                    onClick={() => {
                      onChange(o.value || o);
                      setIsOpen(false);
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors flex justify-between items-center ${isSelected ? 'border-[#c7a44c] bg-[#c7a44c]/10 text-[#c7a44c]' : 'border-white/5 hover:border-[#c7a44c]/30 hover:bg-[#c7a44c]/5 text-gray-300'}`}
                  >
                    <span className="font-bold">{o.label || o}</span>
                    {isSelected && <span className="text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ResourceBar = ({ label, color, current, max, onAdd, onSub, onHelpClick }: any) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  const bgColors: Record<string, { bg: string, glow: string }> = {
    vermelho: { bg: 'bg-gradient-to-r from-[#8b1c2b] to-[#dc2626]', glow: 'shadow-[0_0_15px_rgba(220,38,38,0.4)]' },
    azul: { bg: 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.4)]' },
    roxo: { bg: 'bg-gradient-to-r from-[#5b21b6] to-[#a855f7]', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' },
    cinza: { bg: 'bg-gradient-to-r from-[#334155] to-[#94a3b8]', glow: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]' }
  };
  const theme = bgColors[color] || bgColors.cinza;
  
  // Animação de pulso se tiver quase morrendo/sem mana (<= 25%) ou exausto (>= 75%)
  const isCritical = color === 'cinza' ? (percent >= 75 && current < max) : (percent <= 25 && current > 0);

  const [inputValue, setInputValue] = useState<string | undefined>();

  const handleBlur = (val: string) => {
    if (!val.trim()) {
      setInputValue(undefined);
      return;
    }
    
    let change = 0;
    if (val.startsWith('+')) {
      change = parseInt(val.substring(1)) || 0;
      onAdd(change);
    } else if (val.startsWith('-')) {
      change = parseInt(val.substring(1)) || 0;
      onSub(change);
    } else {
      const absVal = parseInt(val);
      if (!isNaN(absVal)) {
        if (absVal > current) onAdd(absVal - current);
        else if (absVal < current) onSub(current - absVal);
      }
    }
    setInputValue(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: color === 'vermelho' ? '#e53935' : color === 'azul' ? '#29b6f6' : color === 'roxo' ? '#7e57c2' : '#9e9e9e' }}>
          {label}
        </span>
        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" onClick={onHelpClick}>
          <HelpCircle size={14} className="text-[#c7a44c]" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <button onClick={() => onSub(5)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">-5</button>
          <button onClick={() => onSub(1)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">-1</button>
        </div>
        <div className={`flex-1 h-8 bg-[#050508] border ${isCritical ? 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-white/10'} rounded-lg relative overflow-hidden flex items-center justify-center group shadow-inner ring-1 ring-inset ring-white/5`}>
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ 
              width: `${percent}%`,
              opacity: isCritical ? [1, 0.5, 1] : 1
            }} 
            transition={isCritical ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { type: 'spring' }}
            className={`absolute left-0 top-0 bottom-0 ${theme.bg} ${percent > 0 ? theme.glow : ''}`} 
          >
            {/* Brilho interno animado reflexivo (glass) */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          </motion.div>
          <div className="relative z-10 flex items-center text-white font-bold text-xs font-mono drop-shadow-md">
            <input 
              type="text"
              className="bg-transparent border-none outline-none text-right w-10 text-white font-bold placeholder-white/70 group-hover:bg-white/10 rounded transition-colors"
              value={inputValue !== undefined ? inputValue : current}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={(e) => handleBlur(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
            />
            <span className="mx-1">/</span>
            <span>{max}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onAdd(1)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+1</button>
          <button onClick={() => onAdd(5)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+5</button>
        </div>
      </div>
    </div>
  );
}
