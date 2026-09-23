import { AlertTriangle } from 'lucide-react';
import { FichaModal } from './FichaModal';

interface ModalConfirmacaoProps {
  isOpen: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  onClose: () => void;
  onConfirmar: () => void;
}

export function ModalConfirmacao({
  isOpen,
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  onClose,
  onConfirmar,
}: ModalConfirmacaoProps) {
  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title={titulo}>
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <AlertTriangle size={18} aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-gray-300">{mensagem}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-gray-400 transition-colors hover:border-white/25 hover:text-white"
          >
            {rotuloCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="min-h-11 rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 py-2.5 text-sm font-bold text-[#c7a44c] transition-all hover:bg-[#c7a44c]/20 hover:shadow-[0_0_18px_rgba(199,164,76,0.12)]"
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </FichaModal>
  );
}
