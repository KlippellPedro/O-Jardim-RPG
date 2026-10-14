import { create } from 'zustand';

/**
 * Conta as publicações de conteúdo feitas pelos editores em janela (Mundo, Crônicas). As páginas que mostram o Mundo
 * (`useResolvedWorld`) refazem a leitura quando o número muda, e a pessoa vê o texto novo sem recarregar a página.
 */
interface ConteudoEditadoState {
  revisao: number;
  registrarPublicacao: () => void;
}

export const useConteudoEditadoStore = create<ConteudoEditadoState>((set) => ({
  revisao: 0,
  registrarPublicacao: () => set((estado) => ({ revisao: estado.revisao + 1 })),
}));
