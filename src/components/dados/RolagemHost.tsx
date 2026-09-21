import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../utils/audioSynth';
import { iniciarCenaDados, type ControleCena } from './cenaDados';
import { registrarApresentadorRolagem, type CenaRolagem, type GrauRolagem } from './rolagemDados';
import './rolagem.css';

const SAIDA_MS = 320;
const LIMITE_SEM_POUSAR_MS = 9000;

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
 * na face certa. Depois do pouso o resultado FICA na tela até a pessoa clicar
 * (ou apertar Esc, Enter ou espaço), porque muitas vezes ela precisa dizer o
 * número ao Mestre. A promessa de `animarRolagem` resolve no pouso, então o
 * fluxo de quem rolou segue por baixo enquanto o resultado está à vista. Clicar
 * durante a rolagem só pula a animação. */
export const RolagemHost = memo(function RolagemHost() {
  const [emCena, setEmCena] = useState<EmCena | null>(null);
  const [pousou, setPousou] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contador = useRef(0);
  const aoClicarRef = useRef<() => void>(() => undefined);

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
    let pousouLocal = false;
    let saindoLocal = false;
    const timers: number[] = [];
    let seguranca = 0;

    const encerrar = () => {
      if (cancelado) return;
      cancelado = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      controle?.parar();
      setEmCena(null);
      terminar();
    };
    const fecharComSaida = () => {
      if (saindoLocal) return;
      saindoLocal = true;
      setSaindo(true);
      timers.push(window.setTimeout(encerrar, SAIDA_MS));
    };
    // Depois do pouso o clique fecha com fade; antes dele, só pula a cena.
    const aoClicar = () => (pousouLocal ? fecharComSaida() : encerrar());
    aoClicarRef.current = aoClicar;

    const canvas = canvasRef.current;
    if (!canvas) { encerrar(); return undefined; }

    void iniciarCenaDados(canvas, cena.dados, {
      destaque: cena.destaque,
      aoPousar: () => {
        if (cancelado) return;
        pousouLocal = true;
        window.clearTimeout(seguranca);
        setPousou(true);
        if (cena.destaque === 'critico') sfx.playCritSound();
        else if (cena.destaque === 'falha') sfx.play('error');
        else sfx.playDiceClack();
        // O fluxo de quem rolou (modal de resultado, registros) segue por
        // baixo; o resultado continua na tela até a pessoa fechar.
        terminar();
      },
    }).then((resultado) => {
      if (cancelado) { resultado?.parar(); return; }
      if (!resultado) { encerrar(); return; }
      controle = resultado;
    }).catch(encerrar);

    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' || evento.key === 'Enter' || evento.key === ' ') aoClicar();
    };
    document.addEventListener('keydown', aoTecla, true);
    // Segurança: se o dado nunca pousar, não prende a tela. Depois do pouso
    // não há prazo: o resultado fica até a pessoa fechar.
    seguranca = window.setTimeout(encerrar, LIMITE_SEM_POUSAR_MS);
    timers.push(seguranca);
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
      onClick={() => aoClicarRef.current()}
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
          <div className="rolagem__dica">Toque na tela para fechar</div>
        </div>
      )}
    </div>,
    document.body,
  );
});
