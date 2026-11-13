// Modo imersivo do mapa: depois de uns segundos sem mexer, a interface some e fica só a cena. Qualquer
// movimento do mouse, toque ou tecla traz tudo de volta na hora. Nada some com um painel, menu ou campo em uso.

import { useEffect, useRef, useState } from 'react';

/** Quanto tempo parado até a interface sumir. */
export const ESPERA_OCIOSA_MS = 7000;

/** O que, aberto na tela, segura a interface: a pessoa está usando ou lendo alguma coisa. */
const EM_USO = [
  '.mapa-menu-mais', '.mapa-paleta', '.mapa-config', '.mapa-menu-token', '.mapa-recurso-painel', '.mapa-dados',
  '.mapa-atalhos', '.mapa-ancorada', '.mapa-barra-nevoa', '.guided-tour', '.mapa-ficha', '[role="dialog"]',
].join(', ');

/** Já passou tempo bastante parado? */
export function tempoOciosoPassou(ultimoGesto: number, agora: number, espera = ESPERA_OCIOSA_MS): boolean {
  return agora - ultimoGesto >= espera;
}

/** Nada aberto e nenhum campo com o cursor: a interface pode sumir sem atrapalhar. */
export function podeSumir(documento: Pick<Document, 'activeElement' | 'querySelector'>): boolean {
  const foco = documento.activeElement as { tagName?: string; isContentEditable?: boolean } | null;
  if (foco?.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(foco.tagName)) return false;
  if (foco?.isContentEditable) return false;
  return !documento.querySelector(EM_USO);
}

/** Verdadeiro enquanto a interface deve ficar escondida. Com `ligado` falso, nunca esconde. */
export function useInterfaceOciosa(ligado: boolean): boolean {
  const [ociosa, setOciosa] = useState(false);
  const ociosaRef = useRef(false);
  ociosaRef.current = ociosa;

  useEffect(() => {
    if (!ligado) {
      setOciosa(false);
      return undefined;
    }
    let ultimoGesto = Date.now();
    const acordar = () => {
      ultimoGesto = Date.now();
      if (ociosaRef.current) setOciosa(false);
    };
    const relogio = window.setInterval(() => {
      if (ociosaRef.current || document.visibilityState === 'hidden') return;
      if (tempoOciosoPassou(ultimoGesto, Date.now()) && podeSumir(document)) setOciosa(true);
    }, 1000);
    const gestos = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const gesto of gestos) window.addEventListener(gesto, acordar, { passive: true });
    return () => {
      window.clearInterval(relogio);
      for (const gesto of gestos) window.removeEventListener(gesto, acordar);
    };
  }, [ligado]);

  return ociosa;
}
