import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ATRIBUTOS, type TAtributo } from '../../../services/calculoService';
import { FichaModal } from './FichaModal';
import { NOMES_ATRIBUTOS, TEMAS_ATRIBUTOS } from './AtributosSection';

interface GastarAumentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Valor natural de cada atributo hoje (antes de raça, equipamento e ajustes). */
  valores: Record<TAtributo, number>;
  /** Quantos aumentos de nível ainda estão disponíveis. */
  livres: number;
  onConfirmar: (distribuicao: Partial<Record<TAtributo, number>>) => void;
}

/**
 * Painel para gastar os aumentos de atributo que o nível libera. Só o que for
 * confirmado aqui conta como gasto: mexer direto no número do atributo (bênção,
 * recompensa de sessão) continua valendo, mas não consome o direito do nível.
 */
export function GastarAumentosModal({ isOpen, onClose, valores, livres, onConfirmar }: GastarAumentosModalProps) {
  const [escolhas, setEscolhas] = useState<Partial<Record<TAtributo, number>>>({});

  useEffect(() => {
    if (isOpen) setEscolhas({});
  }, [isOpen]);

  const gastos = ATRIBUTOS.reduce((total, atributo) => total + (escolhas[atributo] ?? 0), 0);
  const restantes = livres - gastos;

  const mudar = (atributo: TAtributo, passo: number) => {
    const atual = escolhas[atributo] ?? 0;
    if (passo > 0 && restantes <= 0) return;
    if (passo < 0 && atual <= 0) return;
    setEscolhas({ ...escolhas, [atributo]: atual + passo });
  };

  const confirmar = () => {
    if (gastos <= 0) return;
    onConfirmar(escolhas);
    onClose();
  };

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title="GASTAR AUMENTOS DE ATRIBUTO">
      <div className="space-y-4" data-testid="gastar-aumentos">
        <p className="text-sm text-gray-400">
          Cada aumento do nível soma +1 em um atributo. Só o que você confirmar aqui conta como gasto; se um
          atributo subiu por bênção ou recompensa de sessão, mude o número direto na ficha que o aumento do nível continua guardado.
        </p>
        <p className="text-sm font-bold text-emerald-300" data-testid="aumentos-restantes">
          {restantes} {restantes === 1 ? 'aumento restante' : 'aumentos restantes'}
        </p>
        <div className="space-y-2">
          {ATRIBUTOS.map((atributo) => {
            const quantidade = escolhas[atributo] ?? 0;
            const cor = TEMAS_ATRIBUTOS[atributo].color;
            return (
              <div key={atributo} className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#121118] p-3">
                <span className="min-w-0 flex-1 text-sm font-bold" style={{ color: cor }}>{NOMES_ATRIBUTOS[atributo]}</span>
                <span className="font-mono text-sm text-gray-400">
                  {valores[atributo]}
                  {quantidade > 0 && <span className="font-bold text-emerald-300"> → {valores[atributo] + quantidade}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => mudar(atributo, -1)}
                  disabled={quantidade <= 0}
                  aria-label={`Tirar um aumento de ${NOMES_ATRIBUTOS[atributo]}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => mudar(atributo, 1)}
                  disabled={restantes <= 0}
                  aria-label={`Gastar um aumento em ${NOMES_ATRIBUTOS[atributo]}`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-400/40 text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={confirmar}
          disabled={gastos <= 0}
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-[#c7a44c] px-4 py-2 text-sm font-bold text-black transition-all hover:bg-[#d8ba67] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {gastos > 0 ? `Gastar ${gastos} ${gastos === 1 ? 'aumento' : 'aumentos'}` : 'Escolha onde gastar'}
        </button>
      </div>
    </FichaModal>
  );
}
