import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../../utils/audioSynth';
import { inscreverDescanso, type CenaDescanso, type RecursoDescanso } from './descansoCena';
import { useNumeroAnimado } from './numeroAnimado';
import './descansoCena.css';
import { semMovimento } from '../../../utils/movimento';

const FASE_BARRAS_MS = 1300;
const FASE_AMANHECER_MS = 3500;
const FASE_RESUMO_MS = 4600;
const FIM_MS = 6600;
const ESTRELAS = 46;

// Cores do amanhecer por qualidade: quanto pior o descanso, mais frio e apagado.
const ALVORADA: Record<string, [string, string, string]> = {
  pessima: ['#1b2230', '#5b6472', '#9aa3b2'],
  ruim: ['#1c2436', '#66738a', '#b9c2d0'],
  boa: ['#1d1b4b', '#c2410c', '#fbbf24'],
  maravilhosa: ['#2e2a72', '#e0527a', '#fcd34d'],
  excelente: ['#3a2c0c', '#f5c542', '#fff8d6'],
};


const LinhaRecurso = ({ recurso, fase }: { recurso: RecursoDescanso; fase: number }) => {
  const alvo = fase >= 1 ? recurso.depois : recurso.antes;
  const numero = useNumeroAnimado(alvo, 1500);
  const maximo = Math.max(1, recurso.maximo);
  const pct = Math.max(0, Math.min(100, (alvo / maximo) * 100));
  return (
    <div className="descanso-cena__linha">
      <span className="descanso-cena__rotulo">{recurso.rotulo}</span>
      <div className="descanso-cena__trilha">
        <span className="descanso-cena__barra" style={{ width: `${pct}%`, background: recurso.cor }} />
      </div>
      <span className="descanso-cena__valor">{numero}<em>/{recurso.maximo}</em></span>
    </div>
  );
};

/** Cena do descanso: anoitece, as barras se recuperam e amanhece na cor da
 * qualidade do descanso. Os valores já foram aplicados na ficha; aqui só
 * se mostra a recuperação. Clique ou tecla pula. */
export const DescansoHost = memo(function DescansoHost() {
  const [cena, setCena] = useState<CenaDescanso | null>(null);
  const [fase, setFase] = useState(0);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => inscreverDescanso((nova) => {
    if (semMovimento()) return;
    setFase(0);
    setSaindo(false);
    setCena(nova);
  }), []);

  useEffect(() => {
    if (!cena) return undefined;
    const timers = [
      window.setTimeout(() => setFase(1), FASE_BARRAS_MS),
      window.setTimeout(() => { setFase(2); sfx.play('amanhecer'); }, FASE_AMANHECER_MS),
      window.setTimeout(() => setFase(3), FASE_RESUMO_MS),
      window.setTimeout(() => setSaindo(true), FIM_MS - 350),
      window.setTimeout(() => setCena(null), FIM_MS),
    ];
    const aoTecla = () => setCena(null);
    document.addEventListener('keydown', aoTecla, true);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('keydown', aoTecla, true);
    };
  }, [cena]);

  const estrelas = useMemo(() => Array.from({ length: ESTRELAS }, () => ({
    '--e-x': `${(Math.random() * 100).toFixed(1)}%`,
    '--e-y': `${(Math.random() * 70).toFixed(1)}%`,
    '--e-tam': `${(1 + Math.random() * 2.2).toFixed(1)}px`,
    '--e-atraso': `${(Math.random() * 3).toFixed(2)}s`,
  } as CSSProperties)), [cena?.chave]);

  if (!cena) return null;
  const [c1, c2, c3] = ALVORADA[cena.qualidade] ?? ALVORADA.boa;
  const ganhos = cena.recursos.map((recurso) => {
    const diferenca = recurso.inverso ? recurso.antes - recurso.depois : recurso.depois - recurso.antes;
    return { rotulo: recurso.rotulo, diferenca, sinal: recurso.inverso ? '−' : '+' };
  }).filter((item) => item.diferenca > 0);

  return createPortal(
    <div
      role="status"
      aria-label={`Descanso ${cena.titulo}: recuperação aplicada`}
      className={`descanso-cena descanso-cena--${cena.qualidade}${fase >= 2 ? ' descanso-cena--dia' : ''}${saindo ? ' descanso-cena--saindo' : ''}`}
      style={{ '--alv-1': c1, '--alv-2': c2, '--alv-3': c3 } as CSSProperties}
      onClick={() => setCena(null)}
    >
      <div className="descanso-cena__noite" aria-hidden="true" />
      <div className="descanso-cena__aurora" aria-hidden="true" />
      <div className="descanso-cena__estrelas" aria-hidden="true">
        {estrelas.map((estilo, indice) => <i key={indice} style={estilo} />)}
      </div>
      <div className="descanso-cena__lua" aria-hidden="true" />
      <div className="descanso-cena__sol" aria-hidden="true" />
      {cena.qualidade === 'excelente' && <div className="descanso-cena__raios" aria-hidden="true" />}

      <div className="descanso-cena__conteudo">
        <div className="descanso-cena__titulo">
          {fase >= 2 ? 'Amanheceu' : 'Descansando'}
          <small>Descanso {cena.titulo.toLocaleLowerCase('pt-BR')}</small>
        </div>
        <div className="descanso-cena__painel">
          {cena.recursos.map((recurso) => <LinhaRecurso key={recurso.rotulo} recurso={recurso} fase={fase} />)}
        </div>
        <div className={`descanso-cena__ganhos${fase >= 3 ? ' descanso-cena__ganhos--visivel' : ''}`}>
          {ganhos.length
            ? ganhos.map((item) => <span key={item.rotulo}>{item.sinal}{item.diferenca} {item.rotulo}</span>)
            : <span>Nada a recuperar</span>}
        </div>
      </div>
    </div>,
    document.body,
  );
});
