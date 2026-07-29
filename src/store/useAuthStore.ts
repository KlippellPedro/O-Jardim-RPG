import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../services/authApi';

export interface IUser {
  id: string;
  email: string;
  nome_exibicao: string;
  papel_plataforma: 'admin' | 'criador' | 'mestre' | 'player';
  senha_provisoria: boolean;
  admin_plataforma?: boolean; // BUG-10: campo existente na API, faltava na interface
}

export interface IMembroCampanha {
  id: string;
  nome_exibicao: string;
  email: string;
  papel_plataforma: string;
  ativo: boolean;
  papel: string;
  status: string;
  entrou_em: string;
  personagem_ativo_id: string | null;
}

export interface ICampanha {
  id: string;
  nome: string;
  descricao?: string;
  papel: string;
  dono_id?: string;
  configuracoes?: {
    lore_revelado?: string[];
    lore_oculto?: string[];
    arvores_revelado?: string[];
    arvores_oculto?: string[];
    racas_liberadas?: string[];
    classes_liberadas?: string[];
    raridades_ocultas?: string[];
    itens_ocultos?: string[];
    [key: string]: any;
  };
}

interface AuthState {
  usuario: IUser | null;
  campanhaAtiva: ICampanha | null;
  campanhas: ICampanha[];
  membrosCampanha: IMembroCampanha[];
  avisosNaoLidos: number;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  initContexto: () => Promise<void>;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setCampanhaAtiva: (campanhaId: string) => Promise<void>;
  recarregarCampanhaAtiva: () => Promise<void>;
  atualizarConfiguracoes: (novasConfig: any) => Promise<void>;
  atualizarIdentidade: (dados: { nome?: string; descricao?: string }) => Promise<void>;
}

// BUG-02: Zustand persist middleware para manter campanhaAtiva.id sobrevivendo ao F5.
// Apenas o ID é persistido - o objeto completo é sempre rehidratado via API no initContexto().
// Isso evita dados stale enquanto mantém a sessão agnóstica (cookie HTTP-Only é a fonte de autenticação).
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      campanhaAtiva: null,
      campanhas: [],
      membrosCampanha: [],
      avisosNaoLidos: 0,
      isInitialized: false,
      isLoading: false,
      error: null,

      initContexto: async () => {
        set({ isLoading: true, error: null });
        try {
          // BUG-02: lê campanhaAtiva do store persistido (não mais diretamente do localStorage)
          const savedCampanhaId = get().campanhaAtiva?.id ?? null;
          const contexto = await authApi.contexto(savedCampanhaId);

          set({
            usuario: contexto.usuario || null,
            campanhas: contexto.campanhas || [],
            campanhaAtiva: contexto.campanha || null,
            membrosCampanha: contexto.detalhes?.membros || [],
            avisosNaoLidos: contexto.avisos_nao_lidos || 0,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const err = error as { status?: number; message?: string };
          if (err?.status === 401) {
            // Not logged in - limpa tudo, inclusive campanhaAtiva persistida
            set({
              usuario: null,
              campanhas: [],
              campanhaAtiva: null,
              isInitialized: true,
              isLoading: false,
            });
          } else {
            set({
              error: err?.message || 'Erro ao carregar contexto',
              isLoading: false,
              isInitialized: true,
            });
          }
        }
      },

      login: async (email, senha) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.entrar(email, senha);
          await get().initContexto();
          return true;
        } catch (error: unknown) {
          const err = error as { message?: string };
          set({ error: err?.message || 'Credenciais inválidas', isLoading: false });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.sair();
        } catch (e) {
          console.error('Logout error', e);
        }
        set({
          usuario: null,
          campanhas: [],
          campanhaAtiva: null,
          membrosCampanha: [],
          avisosNaoLidos: 0,
          isLoading: false,
        });
      },

      setCampanhaAtiva: async (campanhaId) => {
        set({ isLoading: true, error: null });
        try {
          const contexto = await authApi.contexto(campanhaId);
          set({
            usuario: contexto.usuario || null,
            campanhas: contexto.campanhas || [],
            campanhaAtiva: contexto.campanha || null,
            membrosCampanha: contexto.detalhes?.membros || [],
            avisosNaoLidos: contexto.avisos_nao_lidos || 0,
            isLoading: false,
          });
        } catch (error: unknown) {
          const err = error as { message?: string };
          set({ error: err?.message || 'Erro ao trocar campanha', isLoading: false });
        }
      },

      atualizarConfiguracoes: async (novasConfig) => {
        const { campanhaAtiva } = get();
        if (!campanhaAtiva) return;

        // Snapshot do estado anterior para rollback em caso de falha
        const configAnterior = campanhaAtiva.configuracoes ?? {};

        // Optimistic update
        const mergedConfig = { ...configAnterior, ...novasConfig };
        set({ campanhaAtiva: { ...campanhaAtiva, configuracoes: mergedConfig } });

        try {
          // Usa dynamic import ou importa diretamente. Como não importamos campanhasApi no topo,
          // vamos fazer dinâmico para não quebrar dependências circulares.
          const { campanhasApi } = await import('../services/campanhasApi');
          await campanhasApi.editar(campanhaAtiva.id, { configuracoes: mergedConfig });
        } catch (e) {
          console.error("Falha ao salvar configurações no servidor", e);
          // Reverte o update otimista para não enganar o usuário
          set((state) => ({
            campanhaAtiva: state.campanhaAtiva
              ? { ...state.campanhaAtiva, configuracoes: configAnterior }
              : null,
          }));
        }
      },

      atualizarIdentidade: async (dados) => {
        const { campanhaAtiva } = get();
        if (!campanhaAtiva) return;

        const anterior = { nome: campanhaAtiva.nome, descricao: campanhaAtiva.descricao };
        set({ campanhaAtiva: { ...campanhaAtiva, ...dados } });

        try {
          const { campanhasApi } = await import('../services/campanhasApi');
          await campanhasApi.editar(campanhaAtiva.id, dados);
        } catch (e) {
          set((state) => ({
            campanhaAtiva: state.campanhaAtiva ? { ...state.campanhaAtiva, ...anterior } : null,
          }));
          throw e;
        }
      },

      // Refaz a busca de /contexto pra mesma campanha sem o flash de
      // isLoading global - usado depois de ações em membros/convites que só
      // essa aba precisa refletir.
      recarregarCampanhaAtiva: async () => {
        const { campanhaAtiva } = get();
        if (!campanhaAtiva) return;
        try {
          const contexto = await authApi.contexto(campanhaAtiva.id);
          set({
            usuario: contexto.usuario || null,
            campanhas: contexto.campanhas || [],
            campanhaAtiva: contexto.campanha || null,
            membrosCampanha: contexto.detalhes?.membros || [],
            avisosNaoLidos: contexto.avisos_nao_lidos || 0,
          });
        } catch (error: unknown) {
          const err = error as { message?: string };
          set({ error: err?.message || 'Erro ao atualizar a campanha' });
        }
      },

    }),
    {
      name: 'jardim-auth-store', // chave no localStorage
      storage: createJSONStorage(() => localStorage),
      // Persiste apenas campanhaAtiva (ID para rehidratação) e isInitialized
      partialize: (state) => ({
        campanhaAtiva: state.campanhaAtiva
          ? { id: state.campanhaAtiva.id, nome: state.campanhaAtiva.nome, papel: state.campanhaAtiva.papel }
          : null,
      }),
    }
  )
);
