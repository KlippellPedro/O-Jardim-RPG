import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../utils/audioSynth';
import { iniciarCenaDados, type ControleCena } from './cenaDados';
import { registrarApresentadorRolagem, type CenaRolagem, type GrauRolagem } from './rolagemDados';
import './rolagem.css';

const PAUSA_APOS_POUSO_MS = 950;
const SAIDA_MS = 320;

const ROTULO_GRAU: Record<GrauRolagem, string> = {
  'sucesso critico': 'Sucesso crítico',
  sucesso: 'Sucesso',
  falha: 'Falha',
  'falha critica': 'Falha crítica',
};

interface EmCena {
  chave: number;
  cena: CenaRolagem;
  terminar: () => void;
}

/** Overlay 3D das rolagens. O servidor já sorteou; aqui o dado só gira e pousa
 * na face certa. Clique ou tecla pula, e a promessa de `animarRolagem` só
 * resolve no fim, para o modal de resultado aparecer depois do pouso. */
export const RolagemHost = memo(function RolagemHost() {
  const [emCena, setEmCena] = useState<EmCena | null>(null);
  const [pousou, setPousou] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contador = useRef(0);

  useEffect(() => registrarApresentadorRolagem((cena, terminar) => {
    contador.current += 1;
    setPousou(false);
    setSaindo(false);
    setEmCena({ chave: contador.current, cena, terminar });
  }), []);

  useEffect(() => {
    if (!emCena) return undefined;
    const { cena, terminar } = emCena;
    let controle: ControleCena | null = null;
    let cancelado = false;
    const timers: number[] = [];

    const encerrar = () => {
      if (cancelado) return;
      cancelado = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      controle?.parar();
      setEmCena(null);
      terminar();
    };
    const fecharComSaida = () => {
      setSaindo(true);
      timers.push(window.setTimeout(encerrar, SAIDA_MS));
    };

    const canvas = canvasRef.current;
    if (!canvas) { encerrar(); return undefined; }

    void iniciarCenaDados(canvas, cena.dados, {
      destaque: cena.destaque,
      aoPousar: () => {
        if (cancelado) return;
        setPousou(true);
        sfx.play(cena.destaque === 'critico' ? 'confirm' : cena.destaque === 'falha' ? 'error' : 'select');
        timers.push(window.setTimeout(fecharComSaida, PAUSA_APOS_POUSO_MS));
      },
    }).then((resultado) => {
      if (cancelado) { resultado?.parar(); return; }
      if (!resultado) { encerrar(); return; }
      controle = resultado;
    }).catch(encerrar);

    const aoTecla = () => encerrar();
    document.addEventListener('keydown', aoTecla, true);
    // Segurança: nunca prende a tela se algo travar.
    timers.push(window.setTimeout(encerrar, 9000));
    return () => {
      document.removeEventListener('keydown', aoTecla, true);
      if (!cancelado) {
        cancelado = true;
        timers.forEach((timer) => window.clearTimeout(timer));
        controle?.parar();
        terminar();
      }
    };
  }, [emCena]);

  if (!emCena) return null;
  const { cena } = emCena;
  const classeGrau = cena.grau ? `rolagem__grau--${cena.grau.replace(' ', '-')}` : '';
  const estilo = {
    '--rol-cor': cena.destaque === 'critico' ? '#ffd76a' : cena.destaque === 'falha' ? '#ef4444' : '#c7a44c',
  } as CSSProperties;

  return createPortal(
    <div
      role="status"
      aria-label={`${cena.titulo}: ${cena.total ?? ''}`}
      className={`rolagem${saindo ? ' rolagem--saindo' : ''}${cena.destaque === 'falha' && pousou ? ' rolagem--tremor' : ''}`}
      style={estilo}
      onClick={() => { emCena.terminar(); }}
    >
      <div className="rolagem__brilho" aria-hidden="true" />
      <canvas ref={canvasRef} className="rolagem__canvas" aria-hidden="true" />
      <div className="rolagem__titulo">{cena.titulo}</div>
      {pousou && (
        <div className="rolagem__resultado">
          <div className="rolagem__total">{cena.total}</div>
          {cena.natural !== null && (
            <div className="rolagem__conta">
              {cena.natural}
              {cena.bonus !== 0 && ` ${cena.bonus > 0 ? '+' : '−'} ${Math.abs(cena.bonus)}`}
              {cena.dt !== null && <span> · DT {cena.dt}</span>}
            </div>
          )}
          {cena.natural === null && cena.formula && <div className="rolagem__conta">{cena.formula}</div>}
          {cena.grau && <div className={`rolagem__grau ${classeGrau}`}>{ROTULO_GRAU[cena.grau]}</div>}
        </div>
      )}
    </div>,
    document.body,
  );
});
