import { memo, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { obterTemaPorId } from '../../../redesign/themeMap';
import { inscreverSubidaNivel, type SubidaNivel } from './subidaNivel';
import './subidaNivel.css';

const DURACAO_MS = 9000;
const HEXAGONO = '50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5';

const semMovimento = () => (
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));

/** Painel de subida de nível: um hexágono girando e as linhas aparecendo em
 * sequência, no estilo de RPG. Mostra só o que a ficha realmente concedeu
 * (Vida e Mana calculadas e recompensas publicadas da classe). Clique, Esc ou
 * o tempo fecham. Sem movimento, o mesmo conteúdo aparece parado. */
export const SubidaNivelHost = memo(function SubidaNivelHost() {
  const [subida, setSubida] = useState<SubidaNivel | null>(null);

  useEffect(() => inscreverSubidaNivel(setSubida), []);

  useEffect(() => {
    if (!subida) return undefined;
    const timer = window.setTimeout(() => setSubida(null), DURACAO_MS);
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' || evento.key === 'Enter' || evento.key === ' ') setSubida(null);
    };
    document.addEventListener('keydown', aoTecla, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', aoTecla, true);
    };
  }, [subida]);

  if (!subida) return null;

  const tema = obterTemaPorId(subida.classeId);
  const parado = semMovimento();
  const linhas: string[] = [
    subida.classeNova
      ? `Nova classe: ${subida.nomeClasse}`
      : `${subida.nomeClasse} chegou ao nível ${subida.nivelClasse}`,
  ];
  if (subida.ganhoVida) linhas.push(`Vida ${sinal(subida.ganhoVida)}`);
  if (subida.ganhoMana) linhas.push(`Mana ${sinal(subida.ganhoMana)}`);
  subida.recompensas.forEach((recompensa) => linhas.push(recompensa));

  return createPortal(
    <div
      role="dialog"
      aria-label={`Nível ${subida.nivelTotal} alcançado`}
      className={`subida-nivel${parado ? ' subida-nivel--parado' : ''}${subida.especial ? ' subida-nivel--especial' : ''}`}
      style={{ '--sub-cor': tema.primary, '--sub-cor2': tema.secondary } as CSSProperties}
      onClick={() => setSubida(null)}
    >
      <div className="subida-nivel__caixa">
        <div className="subida-nivel__hex" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <polygon className="subida-nivel__hex-externo" points={HEXAGONO} />
            <polygon className="subida-nivel__hex-interno" points={HEXAGONO} />
          </svg>
          <span className="subida-nivel__numero">{subida.nivelTotal}</span>
        </div>
        <div className="subida-nivel__titulo">Nível {subida.nivelTotal} alcançado</div>
        <ul className="subida-nivel__lista">
          {linhas.map((linha, indice) => (
            <li key={`${indice}-${linha}`} className="subida-nivel__linha" style={{ '--i': indice } as CSSProperties}>{linha}</li>
          ))}
        </ul>
        <div className="subida-nivel__dica">Clique para fechar</div>
      </div>
    </div>,
    document.body,
  );
});
