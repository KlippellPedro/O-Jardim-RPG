import { useState, useEffect } from 'react';
import { Minus, Plus, Send, Loader2, User, Gem, Package } from 'lucide-react';
import { FichaModal } from '../../pages/Ficha/components/FichaModal';

interface TransferirModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 'banco' é o Cofre bancário do Banqueiro - mesma mecânica de moeda, mas
   * de outro estoque, então a tela precisa dizer de onde o saldo está saindo. */
  tipo: 'item' | 'moeda' | 'banco';
  titulo: string;
  disponivel: number;
  personagemNome: string;
  onConfirm: (quantidade: number) => Promise<void>;
}

const ROTULO_ORIGEM: Record<TransferirModalProps['tipo'], string> = {
  item: 'Disponível no cofre',
  moeda: 'Disponível no cofre',
  banco: 'Disponível no cofre bancário',
};

export const TransferirModal: React.FC<TransferirModalProps> = ({
  isOpen,
  onClose,
  tipo,
  titulo,
  disponivel,
  personagemNome,
  onConfirm,
}) => {
  const [quantidade, setQuantidade] = useState(disponivel);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantidade(disponivel);
      setErro(null);
    }
  }, [isOpen, disponivel]);

  const clamp = (valor: number) => Math.max(1, Math.min(disponivel, Math.trunc(valor) || 1));

  const handleConfirmar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await onConfirm(clamp(quantidade));
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErro(e?.message || 'Não foi possível concluir a transferência.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FichaModal
      isOpen={isOpen}
      onClose={onClose}
      title={tipo === 'banco' ? 'Sacar do cofre bancário' : `Transferir ${tipo === 'moeda' ? 'moeda' : 'item'}`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            {tipo === 'item' ? <Package size={18} /> : <Gem size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold truncate">{titulo}</p>
            <p className="text-gray-500 text-xs">
              {ROTULO_ORIGEM[tipo]}: {disponivel.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-400">
          <User size={16} className="text-gray-500 shrink-0" />
          Enviar para <span className="text-white font-semibold">{personagemNome}</span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Quantidade</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantidade((q) => clamp(q - 1))}
              disabled={quantidade <= 1}
              className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min={1}
              max={disponivel}
              value={quantidade}
              onChange={(e) => setQuantidade(clamp(Number(e.target.value)))}
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white font-mono focus:outline-none focus:border-primary/60"
            />
            <button
              type="button"
              onClick={() => setQuantidade((q) => clamp(q + 1))}
              disabled={quantidade >= disponivel}
              className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
          {quantidade !== disponivel && (
            <button
              type="button"
              onClick={() => setQuantidade(disponivel)}
              className="self-start text-xs text-primary/80 hover:text-primary transition-colors"
            >
              Transferir tudo ({disponivel.toLocaleString('pt-BR')})
            </button>
          )}
        </div>

        {erro && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {erro}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            disabled={enviando}
            className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={enviando || disponivel <= 0}
            className="px-5 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {tipo === 'banco' ? 'Sacar' : 'Transferir'}
          </button>
        </div>
      </div>
    </FichaModal>
  );
};
