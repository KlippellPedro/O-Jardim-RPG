import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePerformanceStore } from '../store/usePerformanceStore';
import { aparelhoEngasgando, dispositivoFraco, sinaisDoAparelho } from '../utils/movimento';
import { avisar } from '../components/avisos/avisos';

/** Espera o site terminar de abrir (os primeiros segundos sempre têm trancos) e mede por um tempo. */
const ESPERA_ANTES_DE_MEDIR_MS = 4000;
const TEMPO_DE_MEDIDA_MS = 6000;

/** Mede os quadros uma vez por abertura do site. Devolve a função que cancela a medida. */
function vigiarFluidez(): () => void {
  let quadro = 0;
  let espera = 0;
  let cancelado = false;
  const podeMedir = () => {
    const estado = usePerformanceStore.getState();
    return !estado.performanceMode && !estado.escolhaManual && typeof window.requestAnimationFrame === 'function';
  };

  const medir = () => {
    if (cancelado || !podeMedir()) return;
    // Aba escondida: o navegador para os quadros, e a medida não diria nada. Tenta quando ela voltar.
    if (document.hidden) {
      document.addEventListener('visibilitychange', () => { espera = window.setTimeout(medir, ESPERA_ANTES_DE_MEDIR_MS); }, { once: true });
      return;
    }
    const intervalos: number[] = [];
    let anterior = performance.now();
    const inicio = anterior;
    const passo = (agora: number) => {
      if (cancelado) return;
      if (document.hidden) return; // a pessoa saiu da aba no meio: descarta esta medida
      intervalos.push(agora - anterior);
      anterior = agora;
      if (agora - inicio < TEMPO_DE_MEDIDA_MS) {
        quadro = window.requestAnimationFrame(passo);
        return;
      }
      if (podeMedir() && aparelhoEngasgando(intervalos)) {
        usePerformanceStore.getState().aplicarModoLeveAutomatico();
        avisar.info('O site estava travando neste aparelho, então ligamos o modo leve. Dá para desligar em Preferências.', { titulo: 'Modo leve ligado', duracaoMs: 9000, chave: 'modo-leve-automatico' });
      }
    };
    quadro = window.requestAnimationFrame((agora) => { anterior = agora; quadro = window.requestAnimationFrame(passo); });
  };

  espera = window.setTimeout(medir, ESPERA_ANTES_DE_MEDIR_MS);
  return () => {
    cancelado = true;
    window.clearTimeout(espera);
    window.cancelAnimationFrame(quadro);
  };
}

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
  const celebracoes = usePerformanceStore((state) => state.celebracoes);
  const dado3d = usePerformanceStore((state) => state.dado3d);
  const climaDoMundo = usePerformanceStore((state) => state.climaDoMundo);

  // Primeira visita neste aparelho: se ele parece fraco, começa no modo leve (a pessoa pode desligar).
  useEffect(() => {
    try {
      if (window.localStorage.getItem('jardim:desempenho-auto')) return;
      window.localStorage.setItem('jardim:desempenho-auto', 'feito');
      if (dispositivoFraco(sinaisDoAparelho())) usePerformanceStore.getState().aplicarModoLeveAutomatico();
    } catch {
      // Sem armazenamento, o modo leve continua manual.
    }
  }, []);

  // A cada vez que o site abre, mede a fluidez de verdade por alguns segundos.
  // Se o aparelho engasga (placa de vídeo fraca, navegador que não informa a
  // memória), liga o modo leve e avisa. Nunca mexe depois de uma escolha manual.
  useEffect(() => vigiarFluidez(), []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.pageVisible = pageVisible ? 'true' : 'false';
    root.dataset.performanceMode = performanceMode ? 'reduced' : 'full';
    root.dataset.reducedMotion = prefersReducedMotion ? 'true' : 'false';
    root.dataset.celebracoes = celebracoes ? 'on' : 'off';
    root.dataset.dado3d = dado3d ? 'on' : 'off';
    root.dataset.climaMundo = climaDoMundo ? 'on' : 'off';
  }, [pageVisible, performanceMode, prefersReducedMotion, celebracoes, dado3d, climaDoMundo]);

  return null;
}
