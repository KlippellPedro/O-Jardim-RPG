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

export interface ICampanha {
  id: string;
  nome: string;
  descricao?: string;
  papel: string;
}

interface AuthState {
  usuario: IUser | null;
  campanhaAtiva: ICampanha | null;
  campanhas: ICampanha[];
  avisosNaoLidos: number;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  initContexto: () => Promise<void>;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setCampanhaAtiva: (campanhaId: string) => Promise<void>;
}

// BUG-02: Zustand persist middleware para manter campanhaAtiva.id sobrevivendo ao F5.
// Apenas o ID é persistido — o objeto completo é sempre rehidratado via API no initContexto().
// Isso evita dados stale enquanto mantém a sessão agnóstica (cookie HTTP-Only é a fonte de autenticação).
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      campanhaAtiva: null,
      campanhas: [],
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
            avisosNaoLidos: contexto.avisos_nao_lidos || 0,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const err = error as { status?: number; message?: string };
          if (err?.status === 401) {
            // Not logged in — limpa tudo, inclusive campanhaAtiva persistida
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
            avisosNaoLidos: contexto.avisos_nao_lidos || 0,
            isLoading: false,
          });
        } catch (error: unknown) {
          const err = error as { message?: string };
          set({ error: err?.message || 'Erro ao trocar campanha', isLoading: false });
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
