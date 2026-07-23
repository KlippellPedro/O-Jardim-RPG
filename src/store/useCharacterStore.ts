import { create } from 'zustand';
import { personagensApi } from '../services/personagensApi';
import { useAuthStore } from './useAuthStore';
import { ICharacter } from '../types/character';
import { ICreateCharacterPayload, IUpdateCharacterPayload } from '../types/personagem';

interface CharacterStore {
  characters: ICharacter[];
  isLoading: boolean;
  error: string | null;
  // BUG-12: fetchCharacters agora usa useAuthStore.getState() como fonte única da verdade
  fetchCharacters: () => Promise<void>;
  archiveCharacter: (id: string) => Promise<boolean>;
  // BUG-07: payloads tipados corretamente
  createCharacter: (payload: ICreateCharacterPayload) => Promise<boolean>;
  updateCharacter: (id: string, payload: IUpdateCharacterPayload & Record<string, any>) => Promise<boolean>;
  // BUG-FIX: carteira/inventário centralizado vivem fora de `ficha` — este é o
  // único caminho que realmente os persiste (ver AbaInventario).
  syncEconomy: (
    id: string,
    payload: {
      carteira: { moeda: string; saldo: number; simbolo?: string }[];
      inventario: { item_id: string; titulo: string; quantidade: number; dados: Record<string, any> }[];
    }
  ) => Promise<boolean>;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  isLoading: false,
  error: null,

  fetchCharacters: async () => {
    set({ isLoading: true, error: null });
    try {
      // BUG-12: lê campanhaId de useAuthStore (fonte única da verdade) em vez do localStorage
      const campanhaId = useAuthStore.getState().campanhaAtiva?.id ?? null;

      if (!campanhaId) {
        set({ characters: [], isLoading: false, error: 'Nenhuma campanha selecionada.' });
        return;
      }

      const resposta = await personagensApi.listar(campanhaId, true);

      // Normalização básica para a visualização de lista
      const normalizedCharacters: ICharacter[] = (resposta.personagens || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        versao: item.versao || 1,
        ficha: item.ficha || {},
        nivel: item.ficha?.nivel || 1,
        criadoEm: item.criado_em || item.ficha?.criadoEm || new Date().toISOString(),
        atualizadoEm: item.atualizado_em || item.ficha?.atualizadoEm || new Date().toISOString(),
        racaId: item.ficha?.racaId,
        classeId: item.ficha?.classeId,
        arvoreId: item.ficha?.arvoreId,
        classes: item.ficha?.classes || [],
        foto: item.ficha?.foto || null,
        derivados: item.ficha?.derivados || { vida: 0, mana: 0, movimento: 0 },
        economiaVersao: item.economia_versao || 1,
        carteira: item.carteira || [],
        inventarioCentral: item.inventario_central || [],
      }));

      // Ordena por data de criação (mais antigos primeiro)
      normalizedCharacters.sort(
        (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
      );

      set({ characters: normalizedCharacters, isLoading: false });
    } catch (error: unknown) {
      const err = error as { message?: string };
      set({ error: err?.message || 'Falha ao carregar personagens.', isLoading: false });
    }
  },

  archiveCharacter: async (id: string) => {
    try {
      await personagensApi.arquivar(id);
      set((state) => ({
        characters: state.characters.filter((char) => char.id !== id),
      }));
      return true;
    } catch (error) {
      console.error('Falha ao arquivar personagem:', error);
      return false;
    }
  },

  // BUG-07: payload agora é ICreateCharacterPayload em vez de any
  createCharacter: async (payload: ICreateCharacterPayload) => {
    try {
      // BUG-12: lê campanhaId de useAuthStore
      const campanhaId = useAuthStore.getState().campanhaAtiva?.id ?? null;
      if (!campanhaId) throw new Error('Nenhuma campanha ativa');

      await personagensApi.criar(campanhaId, payload);

      // Recarrega a lista para incluir o novo personagem
      await get().fetchCharacters();
      return true;
    } catch (error) {
      console.error('Falha ao criar personagem:', error);
      return false;
    }
  },

  // BUG-07: payload agora é IUpdateCharacterPayload em vez de any
  updateCharacter: async (id: string, payload: IUpdateCharacterPayload & Record<string, any>) => {
    try {
      const char = get().characters.find((c) => c.id === id);
      if (!char) return false;

      const versaoEsperada = char.versao || 1;
      const apiPayload = {
        versao_esperada: versaoEsperada,
        nome: payload.nome || char.nome,
        ficha: payload.ficha || char.ficha || {},
      };

      const resposta = await personagensApi.atualizar(id, apiPayload);
      const versaoNova = resposta.personagem?.versao || versaoEsperada + 1;

      // Atualização otimista no store
      set((state) => ({
        characters: state.characters.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              ...payload,
              versao: versaoNova,
            };
          }
          return c;
        }),
      }));
      return true;
    } catch (error) {
      console.error('Falha ao atualizar personagem:', error);
      return false;
    }
  },

  syncEconomy: async (id, payload) => {
    try {
      const char = get().characters.find((c) => c.id === id);
      if (!char) return false;

      const versaoEsperada = char.economiaVersao || 1;
      const resposta = await personagensApi.sincronizarEconomia(id, {
        versaoEsperada,
        carteira: payload.carteira,
        inventario: payload.inventario,
      });

      set((state) => ({
        characters: state.characters.map((c) =>
          c.id === id
            ? {
                ...c,
                carteira: payload.carteira,
                inventarioCentral: payload.inventario,
                economiaVersao: resposta.economia_versao || versaoEsperada + 1,
              }
            : c
        ),
      }));
      return true;
    } catch (error) {
      console.error('Falha ao sincronizar economia do personagem:', error);
      return false;
    }
  },
}));
