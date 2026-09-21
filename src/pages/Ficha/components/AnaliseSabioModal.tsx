import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { FichaModal } from './FichaModal';
import { useEstadoVital } from '../estadoVital';
import { analisarFicha, FALA_ABERTURA, type GravidadeAnalise } from '../utils/analiseSabio';
import {
  definirVozGrandeSabioLigada,
  falarSequencia,
  vozGrandeSabioDisponivel,
  vozGrandeSabioLigada,
} from './vozGrandeSabio';

interface AnaliseSabioModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendencias: Array<{ id: string; quantidade: number }>;
  condicoesAtivas: number;
  /** Porcentagens aproximadas, usadas quando a aba Ficha ainda não publicou as reais. */
  aproximado: { vida: number; mana: number; sanidade: number };
  onAbrirAba: (aba: string) => void;
}

const COR: Record<GravidadeAnalise, string> = {
  urgente: 'border-red-400/40 bg-red-500/10 text-red-200',
  atencao: 'border-amber-400/35 bg-amber-500/10 text-amber-200',
  info: 'border-cyan-400/30 bg-cyan-500/[0.07] text-cyan-200',
};

/** O Grande Sábio olha a ficha e fala o que merece atenção, uma linha por vez.
 * A voz usa frases fixas gravadas antes; os números só aparecem escritos. */
export function AnaliseSabioModal({ isOpen, onClose, pendencias, condicoesAtivas, aproximado, onAbrirAba }: AnaliseSabioModalProps) {
  const publicado = useEstadoVital();
  // Só a aba Ficha calcula os máximos com todos os bônus; sem ela, vale a conta simples.
  const vital = publicado.lidos ? publicado : aproximado;
  const [vozLigada, setVozLigada] = useState(vozGrandeSabioLigada);
  const [rodada, setRodada] = useState(0);
  // Quantas observações já foram anunciadas (-1 = ainda na abertura)
  const [reveladas, setReveladas] = useState(-1);
  const disponivel = vozGrandeSabioDisponivel();

  // A leitura é congelada ao abrir: a ficha não muda debaixo da fala.
  const observacoes = useMemo(
    () => (isOpen ? analisarFicha({ pendencias, condicoesAtivas, vida: vital.vida, mana: vital.mana, sanidade: vital.sanidade }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, rodada],
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    setReveladas(-1);
    if (!disponivel || !vozLigada) {
      setReveladas(observacoes.length);
      return undefined;
    }
    const timer = window.setTimeout(() => setReveladas((atual) => (atual < 0 ? observacoes.length : atual)), 9000);
    const parar = falarSequencia(
      [{ texto: FALA_ABERTURA }, ...observacoes.map((item) => ({ texto: item.fala }))],
      {
        aoIniciarPasso: (indice) => setReveladas((atual) => Math.max(atual, indice)),
        aoTerminar: () => setReveladas(observacoes.length),
      },
    );
    return () => { window.clearTimeout(timer); parar(); };
  }, [isOpen, observacoes, vozLigada, disponivel]);

  const alternarVoz = () => {
    const nova = !vozLigada;
    definirVozGrandeSabioLigada(nova);
    setVozLigada(nova);
  };

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title="Análise do Grande Sábio" eyebrow="Grande Sábio" size="md">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <span className="font-mono uppercase tracking-[0.2em] text-cyan-300/80">{FALA_ABERTURA}</span>
          {disponivel ? (
            <button
              type="button"
              onClick={alternarVoz}
              aria-pressed={vozLigada}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 font-bold text-gray-400 transition-colors hover:text-white"
            >
              {vozLigada ? <Volume2 size={13} /> : <VolumeX size={13} />} Voz {vozLigada ? 'ligada' : 'desligada'}
            </button>
          ) : null}
        </div>

        <ol className="space-y-2.5" aria-live="polite">
          {observacoes.map((item, indice) => (indice < reveladas || reveladas >= observacoes.length ? (
            <li key={item.id} className="analise-linha">
              <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${COR[item.gravidade]}`}>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-semibold text-white">{item.fala}</strong>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-400">{item.detalhe}</span>
                </div>
                {item.aba ? (
                  <button
                    type="button"
                    onClick={() => { onClose(); onAbrirAba(item.aba as string); }}
                    className="flex shrink-0 items-center gap-1 self-center rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                  >
                    {item.aba} <ChevronRight size={11} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </li>
          ) : null))}
        </ol>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setRodada((atual) => atual + 1)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
          >
            Ouvir de novo
          </button>
        </div>
      </div>
    </FichaModal>
  );
}
