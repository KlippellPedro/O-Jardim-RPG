import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../utils/audioSynth';
import { inscreverSuaVez, type AvisoSuaVez } from './suaVez';
import { useVezAvisoRelampago } from '../avisosRelampago/useVezAvisoRelampago';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { notificarForaDaAba } from '../../utils/notificacoesNavegador';
import './suaVez.css';
import { semMovimento } from '../../utils/movimento';

const DURACAO_MS = 3400;


/** Faixa dourada "É a sua vez!" com gongo (e vibração no celular). Não captura
 * clique e some sozinha. Com "reduzir movimento" ou desempenho reduzido, só o
 * som e o texto simples, sem clarão. Se a aba estiver em segundo plano e a
 * pessoa tiver ligado a preferência, também dispara uma notificação do
 * navegador, para ela saber mesmo com outra aba aberta. */
export const SuaVezHost = memo(function SuaVezHost() {
  const [aviso, setAviso] = useState<AvisoSuaVez | null>(null);
  const notificarLigado = usePerformanceStore((state) => state.notificarSuaVez);
  // Loot, conquista e "é sua vez" disputam a mesma tela: só toca som e aparece
  // quando é a vez dele, em vez de brigar com os outros avisos-relâmpago.
  const temVez = useVezAvisoRelampago('suaVez', aviso !== null);

  useEffect(() => inscreverSuaVez(setAviso), []);

  useEffect(() => {
    if (!aviso || !temVez) return undefined;
    sfx.play('gongo');
    try { navigator.vibrate?.([140, 70, 140]); } catch { /* sem vibração neste aparelho */ }
    if (notificarLigado) {
      notificarForaDaAba('É a sua vez!', `Rodada ${aviso.rodada} · ${aviso.nome}`, 'jardim-sua-vez');
    }
    const timer = window.setTimeout(() => setAviso(null), DURACAO_MS);
    return () => window.clearTimeout(timer);
  }, [aviso, temVez, notificarLigado]);

  if (!aviso || !temVez) return null;
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
