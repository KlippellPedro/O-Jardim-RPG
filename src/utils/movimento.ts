/** Regras únicas de "quando NÃO animar". Os atributos vêm de PerformancePreferencesBridge
 * (hooks/usePerformance.ts), a partir das preferências da pessoa. */

const raiz = () => (typeof document === 'undefined' ? null : document.documentElement);

/** Movimento reduzido: preferência do sistema ou modo de desempenho. */
export const movimentoReduzido = (): boolean => (
  typeof window === 'undefined'
  || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || raiz()?.dataset.performanceMode === 'reduced'
);

/** Celebrações (conquista, sua vez, moedas, loot, círculo mágico...) sem efeitos. */
export const semMovimento = (): boolean => movimentoReduzido() || raiz()?.dataset.celebracoes === 'off';

/** O dado 3D não gira: o resultado aparece direto. */
export const semDado3d = (): boolean => movimentoReduzido() || raiz()?.dataset.dado3d === 'off';

interface ISinaisDoAparelho {
  memoriaGb?: number;
  nucleos?: number;
  economiaDeDados?: boolean;
  larguraTela?: number;
  toque?: boolean;
}

/** Aparelho que provavelmente sofre com Three.js e WebGL: pouca memória, poucos núcleos ou economia de dados. */
export function dispositivoFraco(sinais: ISinaisDoAparelho): boolean {
  if (sinais.economiaDeDados) return true;
  if (sinais.memoriaGb !== undefined && sinais.memoriaGb <= 4) return true;
  if (sinais.nucleos !== undefined && sinais.nucleos <= 4) return true;
  return Boolean(sinais.toque && sinais.larguraTela !== undefined && sinais.larguraTela <= 480 && sinais.memoriaGb !== undefined && sinais.memoriaGb <= 6);
}

export function sinaisDoAparelho(): ISinaisDoAparelho {
  if (typeof navigator === 'undefined') return {};
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return {
    memoriaGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    nucleos: navigator.hardwareConcurrency,
    economiaDeDados: Boolean(conexao?.saveData),
    larguraTela: typeof window !== 'undefined' ? window.innerWidth : undefined,
    toque: typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches),
  };
}
