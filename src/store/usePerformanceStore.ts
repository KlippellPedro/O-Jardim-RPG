import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PerformanceState {
  /** Reduz somente efeitos cosméticos; nunca remove funcionalidades do RPG. */
  performanceMode: boolean;
  /** Confete, brasas, moedas, "sua vez" e cartas de item. Desligar deixa só o aviso, sem o show. */
  celebracoes: boolean;
  /** O dado 3D gira e pousa; desligado, o resultado aparece direto. */
  dado3d: boolean;
  /** O fundo do site acompanha a estação e a Lua Carmesim do calendário do Mundo. */
  climaDoMundo: boolean;
  /** Cada página abre o seu guia sozinha na primeira visita. "Pular todos os guias" desliga isto. */
  guiasAutomaticos: boolean;
  /** A faixa com o 20 e o 1 natural de quem rola na Sessão ao vivo (som e vibração incluídos). */
  destaquesDaMesa: boolean;
  /** O aparelho vibra (no celular) no 20 e no 1 naturais, ao levar dano e quando é a sua vez. */
  vibracao: boolean;
  /** Notificação do navegador quando chega a vez, mas a aba está em segundo plano.
   * Só funciona depois da pessoa conceder a permissão do navegador. */
  notificarSuaVez: boolean;
  setEfeito: (efeito: 'celebracoes' | 'dado3d' | 'notificarSuaVez' | 'climaDoMundo' | 'guiasAutomaticos' | 'destaquesDaMesa' | 'vibracao', ligado: boolean) => void;
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
      climaDoMundo: true,
      guiasAutomaticos: true,
      destaquesDaMesa: true,
      vibracao: true,
      notificarSuaVez: false,
      ligadoAutomaticamente: false,
      setEfeito: (efeito, ligado) => set({ [efeito]: ligado }),
      aplicarModoLeveAutomatico: () => set({ performanceMode: true, ligadoAutomaticamente: true }),
      setPerformanceMode: (performanceMode) => set({ performanceMode, ligadoAutomaticamente: false }),
      togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode, ligadoAutomaticamente: false })),
    }),
    {
      name: 'jardim-performance-store',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ performanceMode, celebracoes, dado3d, climaDoMundo, guiasAutomaticos, destaquesDaMesa, vibracao, notificarSuaVez, ligadoAutomaticamente }) => (
        { performanceMode, celebracoes, dado3d, climaDoMundo, guiasAutomaticos, destaquesDaMesa, vibracao, notificarSuaVez, ligadoAutomaticamente }
      ),
    },
  ),
);
