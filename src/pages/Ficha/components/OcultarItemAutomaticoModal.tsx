import { EyeOff } from 'lucide-react';
import { FichaModal } from './FichaModal';

interface OcultarItemAutomaticoModalProps {
  isOpen: boolean;
  tipo: 'habilidade' | 'poder';
  titulo: string;
  onClose: () => void;
  onConfirmar: () => void;
}

export function OcultarItemAutomaticoModal({
  isOpen,
  tipo,
  titulo,
  onClose,
  onConfirmar,
}: OcultarItemAutomaticoModalProps) {
  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title={`Ocultar ${tipo}`}>
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c7a44c]/25 bg-[#c7a44c]/10 text-[#c7a44c]">
            <EyeOff size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <strong className="block break-words text-white">{titulo}</strong>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">
              O conteúdo automático não será apagado. Ele sairá dos cartões principais e ficará na área compacta de {tipo === 'habilidade' ? 'habilidades' : 'poderes'} ocultos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-gray-400 transition-colors hover:border-white/25 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="min-h-11 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-all hover:bg-red-500/20 hover:shadow-[0_0_18px_rgba(248,113,113,0.12)]"
          >
            Ocultar
          </button>
        </div>
      </div>
    </FichaModal>
  );
}
