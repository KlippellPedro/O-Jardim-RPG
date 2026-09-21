import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../../utils/audioSynth';
import {
  inscreverMoedas,
  paletaDaMoeda,
  quantidadeDeMoedas,
  type EventoMoedas,
} from './chuvaMoedas';
import './chuvaMoedas.css';

const DURACAO_MS = 3200;

const semMovimento = () => (
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

interface Moeda {
  estilo: CSSProperties;
}

const criarMoedas = (evento: EventoMoedas): Moeda[] => {
  const ganhou = evento.delta > 0;
  const total = quantidadeDeMoedas(evento.delta);
  const paleta = paletaDaMoeda(evento.moeda);
  return Array.from({ length: total }, () => {
    const tamanho = 16 + Math.random() * 10;
    const base = {
      '--m-clara': paleta.clara,
      '--m-escura': paleta.escura,
      '--m-tam': `${tamanho.toFixed(1)}px`,
      '--m-atraso': `${(Math.random() * 0.9).toFixed(2)}s`,
      '--m-dur': `${(1.3 + Math.random() * 0.9).toFixed(2)}s`,
      '--m-giro': `${Math.round(540 + Math.random() * 900)}deg`,
    } as Record<string, string>;
    if (ganhou) {
      // Chuva: cada moeda cai numa coluna aleatória da tela.
      base['--m-x'] = `${(Math.random() * 100).toFixed(1)}vw`;
      base['--m-deriva'] = `${((Math.random() - 0.5) * 12).toFixed(1)}vw`;
    } else {
      // Gasto: saem do saldo e sobem em leque.
      base['--m-x'] = `${evento.x ?? window.innerWidth / 2}px`;
      base['--m-y'] = `${evento.y ?? window.innerHeight / 2}px`;
      base['--m-deriva'] = `${Math.round((Math.random() - 0.5) * 160)}px`;
      base['--m-sobe'] = `${Math.round(70 + Math.random() * 90)}px`;
    }
    return { estilo: base as CSSProperties };
  });
};

/** Chuva de moedas quando o saldo sobe, e um jorro curto quando desce. Não
 * captura clique, respeita "reduzir movimento" e só existe enquanto dura. */
export const ChuvaMoedasHost = memo(function ChuvaMoedasHost() {
  const [evento, setEvento] = useState<EventoMoedas | null>(null);

  useEffect(() => inscreverMoedas((novo) => {
    if (semMovimento()) return;
    setEvento(novo);
  }), []);

  useEffect(() => {
    if (!evento) return undefined;
    const ganhou = evento.delta > 0;
    const timers: number[] = [];
    // Tilintar em rajada, mais longa quanto mais moedas.
    const toques = ganhou ? Math.min(6, 1 + Math.floor(quantidadeDeMoedas(evento.delta) / 8)) : 1;
    for (let i = 0; i < toques; i += 1) {
      timers.push(window.setTimeout(() => sfx.play(ganhou ? 'moeda' : 'moeda-gasto'), 120 + i * 170));
    }
    timers.push(window.setTimeout(() => setEvento(null), DURACAO_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [evento]);

  const moedas = useMemo(() => (evento ? criarMoedas(evento) : []), [evento]);

  if (!evento) return null;
  const classe = evento.delta > 0 ? 'chuva-moedas--chuva' : 'chuva-moedas--gasto';

  return createPortal(
    <div className={`chuva-moedas ${classe}`} aria-hidden="true">
      {moedas.map((moeda, indice) => (
        <span key={`${evento.chave}-${indice}`} className="chuva-moedas__moeda" style={moeda.estilo} />
      ))}
    </div>,
    document.body,
  );
});
