import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../utils/audioSynth';
import { inscreverSuaVez, type AvisoSuaVez } from './suaVez';
import './suaVez.css';

const DURACAO_MS = 3400;

const semMovimento = () => (
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

/** Faixa dourada "É a sua vez!" com gongo (e vibração no celular). Não captura
 * clique e some sozinha. Com "reduzir movimento" ou desempenho reduzido, só o
 * som e o texto simples, sem clarão. */
export const SuaVezHost = memo(function SuaVezHost() {
  const [aviso, setAviso] = useState<AvisoSuaVez | null>(null);

  useEffect(() => inscreverSuaVez(setAviso), []);

  useEffect(() => {
    if (!aviso) return undefined;
    sfx.play('gongo');
    try { navigator.vibrate?.([140, 70, 140]); } catch { /* sem vibração neste aparelho */ }
    const timer = window.setTimeout(() => setAviso(null), DURACAO_MS);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  if (!aviso) return null;
  const calmo = semMovimento();

  return createPortal(
    <div className={`sua-vez${calmo ? ' sua-vez--calmo' : ''}`} role="alert" aria-live="assertive">
      <div className="sua-vez__clarao" aria-hidden="true" />
      <div className="sua-vez__faixa">
        <span className="sua-vez__onda" aria-hidden="true" />
        <small>Rodada {aviso.rodada}</small>
        <strong>É a sua vez!</strong>
        <em>{aviso.nome}</em>
      </div>
    </div>,
    document.body,
  );
});
