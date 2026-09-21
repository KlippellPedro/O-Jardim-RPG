import { create } from 'zustand';
import { mesaApi, type IRespostaMesa } from '../services/mesaApi';

interface MesaState {
  campanhaId: string | null;
  dados: IRespostaMesa | null;
  /** Quando `dados` chegou: os cronômetros contam a partir daqui. */
  recebidoEm: number;
  carregando: boolean;
  erro: string | null;
  /** Há uma ação em voo (evita clique duplo em votar, criar mapa...). */
  ocupado: boolean;

  iniciar: (campanhaId: string) => void;
  encerrar: () => void;
  sincronizar: () => Promise<void>;
  agir: (acao: string, dados?: Record<string, unknown>) => Promise<boolean>;
  limparErro: () => void;
}

// Cada evento SSE da própria ação volta como eco. O contador descarta resposta
// velha que chegue depois de uma mais nova.
let seq = 0;

const mensagemDe = (falha: unknown, padrao: string) => (falha instanceof Error && falha.message ? falha.message : padrao);

export const useMesaStore = create<MesaState>((set, get) => ({
  campanhaId: null,
  dados: null,
  recebidoEm: 0,
  carregando: false,
  erro: null,
  ocupado: false,

  iniciar: (campanhaId) => {
    set({ campanhaId, dados: null, carregando: true, erro: null });
    void get().sincronizar();
  },

  encerrar: () => {
    seq += 1;
    set({ campanhaId: null, dados: null, carregando: false, erro: null, ocupado: false });
  },

  sincronizar: async () => {
    const campanhaId = get().campanhaId;
    if (!campanhaId) return;
    const meu = ++seq;
    try {
      const resposta = await mesaApi.obter(campanhaId);
      if (meu !== seq || get().campanhaId !== campanhaId) return;
      set({ dados: resposta, recebidoEm: Date.now(), carregando: false, erro: null });
    } catch (falha) {
      if (meu !== seq) return;
      set({ carregando: false, erro: mensagemDe(falha, 'Não foi possível carregar a mesa.') });
    }
  },

  agir: async (acao, dados = {}) => {
    const campanhaId = get().campanhaId;
    if (!campanhaId) return false;
    set({ ocupado: true, erro: null });
    const meu = ++seq;
    try {
      const resposta = await mesaApi.agir(campanhaId, acao, dados);
      if (meu === seq && get().campanhaId === campanhaId) set({ dados: resposta, recebidoEm: Date.now() });
      return true;
    } catch (falha) {
      set({ erro: mensagemDe(falha, 'Não foi possível concluir a ação.') });
      // A tela pode ter ficado adiantada (ficha movida à toa): volta ao que o servidor tem.
      void get().sincronizar();
      return false;
    } finally {
      set({ ocupado: false });
    }
  },

  limparErro: () => set({ erro: null }),
}));
