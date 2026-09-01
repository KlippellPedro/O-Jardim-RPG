import { type CSSProperties, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { FichaTourStep } from '../fichaTourConfig';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

interface FichaGuidedTourProps {
  passos: FichaTourStep[];
  onClose: () => void;
  onFinish: () => void;
  accent: string;
}

const localizarAlvo = (passo: FichaTourStep): HTMLElement | null => {
  for (const seletor of passo.alvos) {
    const encontrado = document.querySelector<HTMLElement>(seletor);
    if (encontrado) return encontrado;
  }
  return null;
};

const medirAlvo = (alvo: HTMLElement): SpotlightRect => {
  const margem = 8;
  const limite = 10;
  const caixa = alvo.getBoundingClientRect();
  const top = Math.max(limite, caixa.top - margem);
  const left = Math.max(limite, caixa.left - margem);
  const right = Math.min(window.innerWidth - limite, caixa.right + margem);
  const bottom = Math.min(window.innerHeight - limite, caixa.bottom + margem);

  return {
    top,
    left,
    width: Math.max(24, right - left),
    height: Math.max(24, bottom - top),
    radius: Math.min(22, Math.max(12, parseFloat(window.getComputedStyle(alvo).borderRadius) || 16) + 4),
  };
};

export function FichaGuidedTour({ passos, onClose, onFinish, accent }: FichaGuidedTourProps) {
  const [passosAtivos] = useState(() => passos.filter((item) => (
    !item.opcional
    || (typeof document !== 'undefined' && item.alvos.some((seletor) => document.querySelector(seletor)))
  )));
  const [indice, setIndice] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const indiceRef = useRef(indice);
  const ultimoRef = useRef(false);
  const totalRef = useRef(passosAtivos.length);
  const passo = passosAtivos[indice];
  const ultimo = indice === passosAtivos.length - 1;

  useEffect(() => {
    indiceRef.current = indice;
    ultimoRef.current = ultimo;
    totalRef.current = passosAtivos.length;
  }, [indice, passosAtivos.length, ultimo]);

  const atualizarSpotlight = useCallback(() => {
    const alvo = localizarAlvo(passo);
    setSpotlight(alvo ? medirAlvo(alvo) : null);
  }, [passo]);

  useEffect(() => {
    const alvo = localizarAlvo(passo);
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo?.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
    setSpotlight(alvo ? medirAlvo(alvo) : null);

    const atualizarDepoisDaRolagem = window.setTimeout(atualizarSpotlight, 380);
    window.addEventListener('resize', atualizarSpotlight);
    window.addEventListener('scroll', atualizarSpotlight, true);
    return () => {
      window.clearTimeout(atualizarDepoisDaRolagem);
      window.removeEventListener('resize', atualizarSpotlight);
      window.removeEventListener('scroll', atualizarSpotlight, true);
    };
  }, [atualizarSpotlight, passo]);

  useEffect(() => {
    const ficha = document.querySelector<HTMLElement>('.ficha-shell');
    const jaEraInerte = ficha?.hasAttribute('inert') || false;
    if (!jaEraInerte) ficha?.setAttribute('inert', '');
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => fecharRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (ultimoRef.current) onFinish();
        else setIndice((atual) => Math.min(totalRef.current - 1, atual + 1));
      }
      if (event.key === 'ArrowLeft' && indiceRef.current > 0) {
        event.preventDefault();
        setIndice((atual) => Math.max(0, atual - 1));
      }
      if (event.key !== 'Tab') return;

      const botoes = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || []);
      if (!botoes.length) return;
      const primeiro = botoes[0];
      const ultimoBotao = botoes[botoes.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimoBotao.focus();
      } else if (!event.shiftKey && document.activeElement === ultimoBotao) {
        event.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      if (!jaEraInerte) ficha?.removeAttribute('inert');
      focoAnterior?.focus();
    };
  }, [onClose, onFinish]);

  if (typeof document === 'undefined' || !passo) return null;

  return createPortal(
    <div
      className={`ficha-tour ${spotlight ? '' : 'ficha-tour--locating'}`}
      style={{ '--ficha-tour-accent': accent } as CSSProperties}
    >
      {spotlight && (
        <div
          className="ficha-tour__spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: spotlight.radius,
          }}
          aria-hidden="true"
        />
      )}

      <div
        ref={dialogRef}
        className="ficha-tour__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="ficha-tour__eyebrow">Guia da ficha · {indice + 1} de {passosAtivos.length}</span>
            <h2 id={titleId} className="ficha-tour__title">{passo.titulo}</h2>
          </div>
          <button ref={fecharRef} type="button" onClick={onClose} className="ficha-tour__close" aria-label="Fechar guia da ficha">
            <X size={17} />
          </button>
        </div>

        <p id={descriptionId} className="ficha-tour__description">{passo.descricao}</p>

        <div className="ficha-tour__footer">
          <div className="ficha-tour__dots" aria-label={`Etapa ${indice + 1} de ${passosAtivos.length}`}>
            {passosAtivos.map((item, itemIndice) => (
              <span key={item.id} className={itemIndice === indice ? 'is-active' : ''} aria-hidden="true" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndice((atual) => Math.max(0, atual - 1))}
              disabled={indice === 0}
              className="ficha-tour__back"
              aria-label="Etapa anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => ultimo ? onFinish() : setIndice((atual) => atual + 1)}
              className="ficha-tour__next"
            >
              {ultimo ? 'Entendi' : 'Próximo'}
              {!ultimo && <ChevronRight size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
