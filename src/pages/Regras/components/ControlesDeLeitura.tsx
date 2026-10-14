import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Type } from 'lucide-react';
import type { FonteDoLeitor, PreferenciasDeLeitura, TamanhoDoLeitor } from '../regrasLeitura';

interface ControlesDeLeituraProps {
  preferencias: PreferenciasDeLeitura;
  onMudar: (proximas: PreferenciasDeLeitura) => void;
}

const FONTES: Array<{ id: FonteDoLeitor; rotulo: string; exemplo: string }> = [
  { id: 'serifa', rotulo: 'Com serifa', exemplo: 'Livro' },
  { id: 'sem', rotulo: 'Sem serifa', exemplo: 'Tela' },
];

/** Tamanho e tipo da letra do texto dos tópicos. Fica num balão para não pesar na barra. */
export const ControlesDeLeitura = ({ preferencias, onMudar }: ControlesDeLeituraProps) => {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (evento: PointerEvent) => {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    };
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto]);

  const mudarTamanho = (passo: -1 | 1) => {
    const proximo = Math.min(4, Math.max(1, preferencias.tamanho + passo)) as TamanhoDoLeitor;
    if (proximo !== preferencias.tamanho) onMudar({ ...preferencias, tamanho: proximo });
  };

  return (
    <div ref={raizRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-haspopup="true"
        aria-label="Ajustar a letra"
        title="Ajustar a letra"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition hover:border-[rgb(var(--acento)/0.5)] hover:text-[rgb(var(--acento-forte))]"
      >
        <Type size={16} />
      </button>

      {aberto ? (
        <div
          role="group"
          aria-label="Ajustes da letra"
          className="absolute right-0 top-11 z-40 w-64 rounded-2xl border border-white/12 bg-[#14121b] p-4 shadow-2xl"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Tamanho</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => mudarTamanho(-1)}
              disabled={preferencias.tamanho <= 1}
              aria-label="Diminuir a letra"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-gray-200 transition hover:border-[rgb(var(--acento)/0.5)] disabled:opacity-35"
            >
              <Minus size={15} />
            </button>
            <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((nivel) => (
                <span
                  key={nivel}
                  className={`block rounded-full transition-all ${nivel <= preferencias.tamanho ? 'bg-[rgb(var(--acento-forte))]' : 'bg-white/15'}`}
                  style={{ width: `${0.35 + nivel * 0.12}rem`, height: `${0.35 + nivel * 0.12}rem` }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => mudarTamanho(1)}
              disabled={preferencias.tamanho >= 4}
              aria-label="Aumentar a letra"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-gray-200 transition hover:border-[rgb(var(--acento)/0.5)] disabled:opacity-35"
            >
              <Plus size={15} />
            </button>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Tipo de letra</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FONTES.map((fonte) => (
              <button
                key={fonte.id}
                type="button"
                onClick={() => onMudar({ ...preferencias, fonte: fonte.id })}
                aria-pressed={preferencias.fonte === fonte.id}
                className={`rounded-xl border px-3 py-2 text-left transition ${preferencias.fonte === fonte.id
                  ? 'border-[rgb(var(--acento)/0.6)] bg-[rgb(var(--acento)/0.14)] text-[rgb(var(--acento-forte))]'
                  : 'border-white/10 text-gray-300 hover:border-white/25'}`}
              >
                <span
                  className="block text-lg leading-6"
                  style={{ fontFamily: fonte.id === 'serifa' ? "'Literata', Georgia, serif" : "'Inter', sans-serif" }}
                >
                  {fonte.exemplo}
                </span>
                <span className="block text-[11px]">{fonte.rotulo}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
