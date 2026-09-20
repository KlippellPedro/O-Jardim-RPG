import { memo, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { obterTemaPorId } from '../../../redesign/themeMap';
import { inscreverSubidaNivel, type SubidaNivel } from './subidaNivel';
import {
  definirVozGrandeSabioLigada,
  falarComoGrandeSabio,
  vozGrandeSabioDisponivel,
  vozGrandeSabioLigada,
} from './vozGrandeSabio';
import './subidaNivel.css';

const DURACAO_MS = 9000;
const DURACAO_MAXIMA_COM_VOZ_MS = 30000;
const PAUSA_APOS_FALA_MS = 2500;
const HEXAGONO = '50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5';

const semMovimento = () => (
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));

const montarLinhas = (subida: SubidaNivel): string[] => {
  const linhas: string[] = [
    subida.classeNova
      ? `Nova classe: ${subida.nomeClasse}`
      : `${subida.nomeClasse} chegou ao nível ${subida.nivelClasse}`,
  ];
  if (subida.ganhoVida) linhas.push(`Vida ${sinal(subida.ganhoVida)}`);
  if (subida.ganhoMana) linhas.push(`Mana ${sinal(subida.ganhoMana)}`);
  subida.recompensas.forEach((recompensa) => linhas.push(recompensa));
  return linhas;
};

/** Painel de subida de nível: um hexágono girando e as linhas aparecendo em
 * sequência, no estilo de RPG. Mostra só o que a ficha realmente concedeu
 * (Vida e Mana calculadas e recompensas publicadas da classe). Clique, Esc ou
 * o tempo fecham. Sem movimento, o mesmo conteúdo aparece parado. */
export const SubidaNivelHost = memo(function SubidaNivelHost() {
  const [subida, setSubida] = useState<SubidaNivel | null>(null);

  const [vozLigada, setVozLigada] = useState(vozGrandeSabioLigada);
  const vozDisponivel = vozGrandeSabioDisponivel();
  // Com voz, cada linha só aparece quando começa a ser falada (0 = título).
  const [linhaFalada, setLinhaFalada] = useState(-1);
  const falaAtiva = vozDisponivel && vozLigada;

  useEffect(() => inscreverSubidaNivel(setSubida), []);

  useEffect(() => {
    if (!subida) return undefined;
    const fechar = () => setSubida(null);
    let timer: number;
    let seguranca = 0;
    setLinhaFalada(-1);
    let pararVoz: () => void = () => undefined;
    if (vozDisponivel && vozLigada) {
      // O painel espera a fala terminar; o limite evita ficar preso se a voz travar.
      timer = window.setTimeout(fechar, DURACAO_MAXIMA_COM_VOZ_MS);
      // Se o navegador não avisar o início da fala, mostra tudo em vez de deixar a tela vazia.
      seguranca = window.setTimeout(() => setLinhaFalada((atual) => (atual < 0 ? 999 : atual)), 2000);
      pararVoz = falarComoGrandeSabio(
        [`Nível ${subida.nivelTotal} alcançado`, ...montarLinhas(subida)],
        (indice) => setLinhaFalada(indice),
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(fechar, PAUSA_APOS_FALA_MS);
        },
      );
    } else {
      timer = window.setTimeout(fechar, DURACAO_MS);
    }
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' || evento.key === 'Enter' || evento.key === ' ') setSubida(null);
    };
    document.addEventListener('keydown', aoTecla, true);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(seguranca);
      pararVoz();
      document.removeEventListener('keydown', aoTecla, true);
    };
  }, [subida, vozLigada, vozDisponivel]);

  const alternarVoz = () => {
    const nova = !vozLigada;
    definirVozGrandeSabioLigada(nova);
    setVozLigada(nova);
  };

  if (!subida) return null;

  const tema = obterTemaPorId(subida.classeId);
  const parado = semMovimento();
  const linhas = montarLinhas(subida);

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
            <li
              key={`${indice}-${linha}`}
              className="subida-nivel__linha"
              style={{ '--i': falaAtiva ? 0 : indice, visibility: falaAtiva && indice + 1 > linhaFalada ? 'hidden' : 'visible' } as CSSProperties}
            >
              {linha}
            </li>
          ))}
        </ul>
        {vozDisponivel && (
          <button
            type="button"
            className="subida-nivel__voz"
            aria-pressed={vozLigada}
            onClick={(evento) => { evento.stopPropagation(); alternarVoz(); }}
          >
            {vozLigada ? 'Voz ligada' : 'Voz desligada'}
          </button>
        )}
        <div className="subida-nivel__dica">Clique para fechar</div>
      </div>
    </div>,
    document.body,
  );
});
