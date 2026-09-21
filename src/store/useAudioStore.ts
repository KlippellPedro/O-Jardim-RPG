import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CATEGORIAS_PADRAO, type CategoriaSom, type CategoriasLigadas } from '../utils/categoriasSom';

interface AudioState {
  /** Efeitos sonoros de interface ligados/desligados - preferência única e global. */
  enabled: boolean;
  /** Volume dos efeitos, de 0 a 1. */
  volume: number;
  /** Toque sonoro da classe por cima de momentos marcantes. Desligado por padrão. */
  somDeClasse: boolean;
  /** Liga e desliga por tipo de som (interface, acontecimentos, moedas). */
  categorias: CategoriasLigadas;
  setCategoria: (categoria: CategoriaSom, ligada: boolean) => void;
  setSomDeClasse: (ativo: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.5,
      somDeClasse: false,
      categorias: { ...CATEGORIAS_PADRAO },
      setCategoria: (categoria, ligada) => set((state) => ({ categorias: { ...state.categorias, [categoria]: ligada } })),
      setSomDeClasse: (somDeClasse) => set({ somDeClasse }),

      setEnabled: (enabled) => set({ enabled }),
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    {
      name: 'jardim-audio-store',
      storage: createJSONStorage(() => localStorage),
      // Quem já tinha preferências salvas ganha as categorias novas ligadas.
      merge: (salvo, atual) => ({ ...atual, ...(salvo as object), categorias: { ...CATEGORIAS_PADRAO, ...((salvo as { categorias?: object } | undefined)?.categorias ?? {}) } }),
    }
  )
);
