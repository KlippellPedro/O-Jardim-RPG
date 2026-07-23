import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

export const SectionTitle = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 mb-5">
    <h3 className="text-[#c7a44c] text-xs font-bold tracking-widest uppercase whitespace-nowrap">{title}</h3>
    <div className="w-full h-[1px] bg-gradient-to-r from-[#c7a44c]/30 to-transparent"></div>
  </div>
);

export const LabeledInput = ({ label, value, placeholder = '', onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</label>
    <input 
      type="text" 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700"
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

export const ResourceBar = ({ label, color, current, max, onAdd, onSub, onHelpClick }: any) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  const bgColors: Record<string, string> = {
    vermelho: 'bg-[#8b1c2b]', // Dark red from legacy screenshot
    azul: 'bg-[#29b6f6]', // Cyan from legacy
    roxo: 'bg-[#7e57c2]', // Purple
    cinza: 'bg-[#788299]' // Gray for cansaco
  };
  const gradient = bgColors[color] || bgColors.cinza;

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
        <div className="flex-1 h-8 bg-[#0a090d] border border-white/5 rounded relative overflow-hidden flex items-center justify-center">
          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`absolute left-0 top-0 bottom-0 ${gradient}`} />
          <span className="relative z-10 text-white font-bold text-xs font-mono drop-shadow-md">
            {current} / {max}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onAdd(1)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+1</button>
          <button onClick={() => onAdd(5)} className="w-8 h-8 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+5</button>
        </div>
      </div>
    </div>
  );
}
