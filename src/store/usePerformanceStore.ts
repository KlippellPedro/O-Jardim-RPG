import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PerformanceState {
  /** Reduz somente efeitos cosméticos; nunca remove funcionalidades do RPG. */
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
  togglePerformanceMode: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set) => ({
      performanceMode: false,
      setPerformanceMode: (performanceMode) => set({ performanceMode }),
      togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode })),
    }),
    {
      name: 'jardim-performance-store',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ performanceMode }) => ({ performanceMode }),
    },
  ),
);
