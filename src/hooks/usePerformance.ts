import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePerformanceStore } from '../store/usePerformanceStore';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const LARGE_VIEWPORT_QUERY = '(min-width: 2560px)';

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function subscribeLargeViewport(onChange: () => void) {
  const media = window.matchMedia(LARGE_VIEWPORT_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getLargeViewportSnapshot() {
  return window.matchMedia(LARGE_VIEWPORT_QUERY).matches;
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange, { passive: true });
  return () => document.removeEventListener('visibilitychange', onChange);
}

function getVisibilitySnapshot() {
  return document.visibilityState === 'visible';
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

export function usePageVisibility() {
  return useSyncExternalStore(subscribeVisibility, getVisibilitySnapshot, () => true);
}

export function usePerformanceProfile() {
  const performanceMode = usePerformanceStore((state) => state.performanceMode);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisibility();
  const largeViewport = useSyncExternalStore(
    subscribeLargeViewport,
    getLargeViewportSnapshot,
    () => false,
  );

  return useMemo(() => {
    const reduceMotion = performanceMode || prefersReducedMotion;
    return {
      performanceMode,
      prefersReducedMotion,
      reduceMotion,
      pageVisible,
      largeViewport,
      world: {
        animate: !reduceMotion && pageVisible,
        // A rotação orbital é lenta; 30 Hz preserva sua leitura visual e corta
        // pela metade o custo que antes era pago a 60 Hz continuamente.
        targetFps: !reduceMotion && pageVisible ? 30 : 0,
        // Em 4K/DPR 2, o teto 1,5 produzia 9,08 milhões de pixels. Em telas
        // largas, DPR 1 já corresponde à resolução CSS nativa e evita esse pico.
        dpr: performanceMode || largeViewport ? 1 : ([1, 1.5] as [number, number]),
        // Em desempenho, um campo menor e estático mantém a leitura de espaço
        // sem exigir um loop contínuo de renderização.
        starCount: performanceMode ? 220 : 600,
        showDecorations: !performanceMode,
      },
    };
  }, [largeViewport, pageVisible, performanceMode, prefersReducedMotion]);
}

/**
 * Traduz a preferência central para atributos CSS. Componentes que só precisam
 * reduzir blur/glow/animação não precisam assinar o store nem espalhar ifs.
 */
export function PerformancePreferencesBridge() {
  const { pageVisible, performanceMode, prefersReducedMotion } = usePerformanceProfile();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.pageVisible = pageVisible ? 'true' : 'false';
    root.dataset.performanceMode = performanceMode ? 'reduced' : 'full';
    root.dataset.reducedMotion = prefersReducedMotion ? 'true' : 'false';
  }, [pageVisible, performanceMode, prefersReducedMotion]);

  return null;
}
