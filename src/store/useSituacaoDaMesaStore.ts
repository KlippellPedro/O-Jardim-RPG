import { create } from 'zustand';
import { SEM_MESA, type EstadoDaMesa } from '../services/situacaoDaMesa';

interface SituacaoDaMesaState extends EstadoDaMesa {
  /** A campanha de que esta situação é; evita mostrar a mesa de uma campanha na outra. */
  campanhaId: string | null;
  aplicar: (campanhaId: string, estado: EstadoDaMesa) => void;
  limpar: () => void;
}

/** O que o menu e a Home mostram. Quem preenche é o `SituacaoDaMesaHost`. */
export const useSituacaoDaMesaStore = create<SituacaoDaMesaState>((set) => ({
  ...SEM_MESA,
  campanhaId: null,
  aplicar: (campanhaId, estado) => set({ ...estado, campanhaId }),
  limpar: () => set({ ...SEM_MESA, campanhaId: null }),
}));
