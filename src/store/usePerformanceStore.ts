import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PerformanceState {
  /** Reduz somente efeitos cosméticos; nunca remove funcionalidades do RPG. */
  performanceMode: boolean;
  /** Confete, brasas, moedas, "sua vez" e cartas de item. Desligar deixa só o aviso, sem o show. */
  celebracoes: boolean;
  /** O dado 3D gira e pousa; desligado, o resultado aparece direto. */
  dado3d: boolean;
  setEfeito: (efeito: 'celebracoes' | 'dado3d', ligado: boolean) => void;
  /** O modo de desempenho foi ligado sozinho por o aparelho parecer fraco (avisa uma vez). */
  ligadoAutomaticamente: boolean;
  aplicarModoLeveAutomatico: () => void;
  setPerformanceMode: (enabled: boolean) => void;
  togglePerformanceMode: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set) => ({
      performanceMode: false,
      celebracoes: true,
      dado3d: true,
      ligadoAutomaticamente: false,
      setEfeito: (efeito, ligado) => set({ [efeito]: ligado }),
      aplicarModoLeveAutomatico: () => set({ performanceMode: true, ligadoAutomaticamente: true }),
      setPerformanceMode: (performanceMode) => set({ performanceMode, ligadoAutomaticamente: false }),
      togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode, ligadoAutomaticamente: false })),
    }),
    {
      name: 'jardim-performance-store',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ performanceMode, celebracoes, dado3d, ligadoAutomaticamente }) => ({ performanceMode, celebracoes, dado3d, ligadoAutomaticamente }),
    },
  ),
);
