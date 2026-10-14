import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';

interface BarraDoLeitorProps {
  /** Onde a pessoa está: "Capítulo 3 · Combate › 3.4 Ferimentos". */
  caminho: ReactNode;
  /** De 0 a 1 enquanto lê um tópico; null na página inicial, que não tem o que medir. */
  progresso: number | null;
  /** Só aparece em telas estreitas, onde a lista de tópicos vira uma gaveta. */
  onAbrirMenu: () => void;
  controles?: ReactNode;
}

/** Barra fixa no alto do leitor: onde estou, ajustes da letra e uma linha que mostra quanto já li. */
export const BarraDoLeitor = ({ caminho, progresso, onAbrirMenu, controles }: BarraDoLeitorProps) => {
  const percentual = progresso === null ? 0 : Math.round(progresso * 100);
  return (
    <div className="shrink-0 border-b border-white/10 bg-[#0d0c12]/95">
      {/* A direita fica livre para os botões fixos de busca e configurações que o app põe no canto da tela. */}
      <div className="flex items-center gap-3 py-2 pl-4 pr-24 sm:pl-6 sm:pr-28">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir tópicos"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#d8bd75] md:hidden"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1 truncate text-xs text-gray-400">{caminho}</div>
        {controles}
      </div>
      {progresso !== null ? (
        <div
          role="progressbar"
          aria-label="Quanto deste tópico você já leu"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentual}
          className="h-[3px] bg-white/[0.06]"
        >
          <div
            className="h-full bg-[rgb(var(--acento))] transition-[width] duration-150"
            style={{ width: `${percentual}%` }}
          />
        </div>
      ) : (
        <div className="h-[3px]" />
      )}
    </div>
  );
};
