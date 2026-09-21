import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../utils/audioSynth';
import type { IConquistaNova } from '../../services/conquistasApi';
import {
  falarSequencia,
  vozGrandeSabioDisponivel,
  vozGrandeSabioLigada,
} from '../../pages/Ficha/components/vozGrandeSabio';
import { inscreverConquistas } from './conquistas';
import { SeloConquista } from './SeloConquista';
import './conquistaToast.css';

const DURACAO_MS = 5200;
const DURACAO_LENDARIA_MS = 6400;
const ROTULO_RARIDADE = { comum: 'Conquista', rara: 'Conquista rara', lendaria: 'Conquista lendária' } as const;

const semMovimento = () => (
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

/** Aviso de conquista desbloqueada: um cartão desce do topo com o selo, o
 * Grande Sábio anuncia e o som toca. Várias conquistas de uma vez entram em
 * fila, uma por vez. Clique dispensa. */
export const ConquistaHost = memo(function ConquistaHost() {
  const [fila, setFila] = useState<IConquistaNova[]>([]);
  const [saindo, setSaindo] = useState(false);
  const atual = fila[0] ?? null;
  const parar = useRef<() => void>(() => undefined);

  useEffect(() => inscreverConquistas((novas) => setFila((anterior) => [...anterior, ...novas])), []);

  useEffect(() => {
    if (!atual) return undefined;
    setSaindo(false);
    sfx.play('estrela');
    if (vozGrandeSabioDisponivel() && vozGrandeSabioLigada()) {
      parar.current = falarSequencia(
        [{ texto: 'Conquista desbloqueada' }, { texto: atual.nome }],
        { aoIniciarPasso: () => undefined, aoTerminar: () => undefined },
      );
    }
    const duracao = atual.raridade === 'lendaria' ? DURACAO_LENDARIA_MS : DURACAO_MS;
    const timers = [
      window.setTimeout(() => setSaindo(true), duracao - 450),
      window.setTimeout(() => setFila((anterior) => anterior.slice(1)), duracao),
    ];
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      parar.current();
    };
  }, [atual]);

  if (!atual) return null;
  const lendaria = atual.raridade === 'lendaria';
  const animar = !semMovimento();

  return createPortal(
    <div className="conquista-toast-area" aria-live="polite">
      <button
        type="button"
        key={atual.chave}
        className={`conquista-toast conquista-toast--${atual.raridade}${saindo ? ' conquista-toast--saindo' : ''}`}
        onClick={() => setFila((anterior) => anterior.slice(1))}
        aria-label={`Conquista desbloqueada: ${atual.nome}. ${atual.descricao}`}
      >
        <SeloConquista raridade={atual.raridade} icone={atual.icone} tamanho={62} reluzir={animar} />
        <span className="conquista-toast__texto">
          <small>{ROTULO_RARIDADE[atual.raridade] ?? 'Conquista'} desbloqueada</small>
          <strong>{atual.nome}</strong>
          <em>{atual.descricao}</em>
        </span>
        {fila.length > 1 ? <span className="conquista-toast__fila">+{fila.length - 1}</span> : null}
        {lendaria && animar
          ? (
            <span className="conquista-toast__brasas" aria-hidden="true">
              {Array.from({ length: 12 }, (_, indice) => (
                <i key={indice} style={{ '--b-x': `${6 + indice * 8}%`, '--b-atraso': `${(indice % 5) * 0.18}s` } as CSSProperties} />
              ))}
            </span>
          )
          : null}
      </button>
    </div>,
    document.body,
  );
});
