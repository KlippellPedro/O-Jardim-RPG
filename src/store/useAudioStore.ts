import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AudioState {
  /** Efeitos sonoros de interface ligados/desligados - preferência única e global. */
  enabled: boolean;
  /** Volume dos efeitos, de 0 a 1. */
  volume: number;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.5,

      setEnabled: (enabled) => set({ enabled }),
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    {
      name: 'jardim-audio-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
