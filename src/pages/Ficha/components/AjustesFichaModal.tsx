import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FichaModal } from './FichaModal';
import type { IAjusteFicha } from '../../../services/ajustesFichaService';

interface AjustesFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  automaticos?: Array<{ nome: string; valor: number }>;
  ajustes: IAjusteFicha[];
  onChange: (ajustes: IAjusteFicha[]) => void;
}

const formatarValor = (valor: number) => `${valor > 0 ? '+' : ''}${valor}`;

export function AjustesFichaModal({
  isOpen,
  onClose,
  titulo,
  automaticos = [],
  ajustes,
  onChange,
}: AjustesFichaModalProps) {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');

  const adicionar = () => {
    const valorNumerico = Number(valor.replace(',', '.'));
    const nomeLimpo = nome.trim();
    if (!nomeLimpo || !Number.isFinite(valorNumerico) || valorNumerico === 0) return;
    onChange([
      ...ajustes,
      { id: `ajuste-${Date.now().toString(36)}`, nome: nomeLimpo, valor: valorNumerico },
    ]);
    setNome('');
    setValor('');
  };

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title={`AJUSTES: ${titulo.toUpperCase()}`}>
      <div className="space-y-5">
        <p className="text-sm text-gray-400">
          Registre de onde vem cada bônus ou penalidade. Ajustes automáticos são calculados pela ficha; os demais podem ser removidos a qualquer momento.
        </p>

        {automaticos.filter((item) => item.valor !== 0).map((item) => (
          <div key={item.nome} className="flex items-center justify-between rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
            <div>
              <strong className="block text-sm text-gray-200">{item.nome}</strong>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Automático</span>
            </div>
            <span className="font-mono font-bold text-emerald-300">{formatarValor(item.valor)}</span>
          </div>
        ))}

        <div className="space-y-2">
          {ajustes.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#121118] p-3">
              <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{item.nome}</span>
              <span className={`font-mono font-bold ${item.valor > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatarValor(item.valor)}</span>
              <button
                type="button"
                onClick={() => onChange(ajustes.filter((ajuste) => ajuste.id !== item.id))}
                className="rounded p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400"
                aria-label={`Remover ajuste ${item.nome}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 gap-3 rounded-xl border border-dashed border-[#c7a44c]/25 bg-[#c7a44c]/5 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
          <input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Fonte: item, bênção, ferimento..."
            aria-label="Fonte do ajuste"
            className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#c7a44c]/50 sm:col-span-2"
          />
          <input
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') adicionar(); }}
            inputMode="decimal"
            placeholder="Ex.: +2"
            aria-label="Valor do ajuste"
            className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#c7a44c]/50"
          />
          <button
            type="button"
            onClick={adicionar}
            disabled={!nome.trim() || !valor.trim()}
            className="flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#c7a44c] px-4 py-2 text-sm font-bold text-black transition-all hover:bg-[#d8ba67] hover:shadow-[0_0_18px_rgba(199,164,76,0.18)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>
    </FichaModal>
  );
}

export function AjusteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 min-w-6 items-center justify-center rounded-full border border-[#c7a44c]/30 px-1.5 text-xs font-bold text-[#c7a44c] opacity-60 transition-opacity hover:opacity-100"
      aria-label={`Organizar ajustes de ${label}`}
      title={`Bônus e penalidades de ${label}`}
    >
      ±
    </button>
  );
}
