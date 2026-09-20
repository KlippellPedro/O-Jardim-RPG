import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { obterTemaPorId } from '../../../redesign/themeMap';
import {
  inscreverEscolhaImpacto,
  obterFraseEscolha,
  type EscolhaImpacto,
} from './escolhaImpacto';
import './escolhaImpacto.css';

const DURACAO_ESPECIAL_MS = 2400;
const DURACAO_COMUM_MS = 1300;
const FAISCAS_ESPECIAL = 26;

const semMovimento = () => (
  typeof window !== 'undefined'
  && (Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    || document.documentElement.dataset.performanceMode === 'reduced')
);

const criarFaiscas = () => Array.from({ length: FAISCAS_ESPECIAL }, (_, i) => {
  const angulo = Math.random() * Math.PI * 2;
  const distancia = 22 + Math.random() * 30;
  return {
    alternada: i % 2 === 1,
    estilo: {
      '--dx': `${(Math.cos(angulo) * distancia).toFixed(1)}vmin`,
      '--dy': `${(Math.sin(angulo) * distancia).toFixed(1)}vmin`,
      '--tam': `${(3 + Math.random() * 5).toFixed(1)}px`,
      '--atraso': `${(Math.random() * 0.35).toFixed(2)}s`,
      '--dur': `${(1 + Math.random() * 0.9).toFixed(2)}s`,
    } as CSSProperties,
  };
});

/** Cena curta ao escolher raça ou classe. Comum: um pulso discreto com o nome.
 * Especial: brilho, ondas, faíscas e uma frase. Não bloqueia a tela, qualquer
 * tecla encerra, e sem movimento (preferência do sistema ou modo de
 * desempenho reduzido) sobra só o aviso para leitor de tela. */
export const EscolhaImpactoHost = memo(function EscolhaImpactoHost() {
  const [escolha, setEscolha] = useState<EscolhaImpacto | null>(null);

  useEffect(() => inscreverEscolhaImpacto(setEscolha), []);

  useEffect(() => {
    if (!escolha) return undefined;
    const timer = window.setTimeout(
      () => setEscolha(null),
      (escolha.especial ? DURACAO_ESPECIAL_MS : DURACAO_COMUM_MS) + 100,
    );
    const aoTecla = () => setEscolha(null);
    document.addEventListener('keydown', aoTecla, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', aoTecla, true);
    };
  }, [escolha]);

  const faiscas = useMemo(
    () => (escolha?.especial ? criarFaiscas() : []),
    [escolha],
  );

  if (!escolha) return null;

  const tema = obterTemaPorId(escolha.id);
  const frase = obterFraseEscolha(escolha);
  const animar = !semMovimento();
  const estilo = {
    '--imp-cor': tema.primary,
    '--imp-cor2': tema.secondary,
    '--imp-dur': `${escolha.especial ? DURACAO_ESPECIAL_MS : DURACAO_COMUM_MS}ms`,
  } as CSSProperties;

  return createPortal(
    <div
      role="status"
      className={`escolha-impacto ${escolha.especial ? 'escolha-impacto--especial' : 'escolha-impacto--comum'}`}
      style={estilo}
    >
      {animar ? (
        <>
          <div className="escolha-impacto__brilho" aria-hidden="true" />
          <div className="escolha-impacto__onda" aria-hidden="true" />
          {escolha.especial && <div className="escolha-impacto__onda escolha-impacto__onda--2" aria-hidden="true" />}
          {faiscas.map((faisca, indice) => (
            <span
              key={indice}
              aria-hidden="true"
              className={`escolha-impacto__faisca${faisca.alternada ? ' escolha-impacto__faisca--2' : ''}`}
              style={faisca.estilo}
            />
          ))}
        </>
      ) : null}
      <div className={animar ? 'escolha-impacto__texto' : 'sr-only'}>
        <div className="escolha-impacto__tipo">{escolha.tipo === 'raca' ? 'Raça' : 'Classe'}</div>
        <div className="escolha-impacto__titulo">{escolha.nome}</div>
        <div className="escolha-impacto__sub">{frase}</div>
      </div>
    </div>,
    document.body,
  );
});
