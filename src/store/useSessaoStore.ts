import { create } from 'zustand';
import { useCharacterStore } from './useCharacterStore';

export interface EntidadeIniciativa {
  id: string;
  nome: string;
  iniciativa: number;
  hpAtual?: number;
  hpTotal?: number;
  tipo: 'jogador' | 'npc' | 'monstro';
  cor?: string; // Cor visual do player/npc no painel
}

export interface Rolagem {
  id: string;
  ator: string; // nome do player ou npc
  formula: string; // ex: 1d20+5
  resultado_total: number;
  dados: number[]; // as faces roladas
  isCritico: boolean;
  isDesastre: boolean;
  timestamp: number;
}

interface SessaoState {
  iniciativa: EntidadeIniciativa[];
  turnoAtualIndex: number;
  rolagens: Rolagem[];

  // Iniciativa
  carregarJogadoresAtivos: () => void;
  adicionarEntidade: (entidade: Omit<EntidadeIniciativa, 'id'>) => void;
  removerEntidade: (id: string) => void;
  proximoTurno: () => void;
  limparIniciativa: () => void;
  ordenarIniciativa: () => void;

  // Rolagens
  adicionarRolagem: (rolagem: Omit<Rolagem, 'id' | 'timestamp'>) => void;
  limparRolagens: () => void;
}

export const useSessaoStore = create<SessaoState>((set, get) => ({
  iniciativa: [],
  turnoAtualIndex: 0,
  rolagens: [],

  carregarJogadoresAtivos: () => {
    // Busca os personagens da characterStore (que já pertencem à campanha ativa)
    const { characters } = useCharacterStore.getState();
    
    // Filtra talvez apenas personagens ativos, mas por padrão pegamos todos da store atual
    const novasEntidades: EntidadeIniciativa[] = characters.map(char => ({
      id: char.id,
      nome: char.nome,
      iniciativa: 10, // Valor placeholder até ser rolado
      hpAtual: typeof char.vida_atual === 'number' ? char.vida_atual : 10,
      hpTotal: typeof char.vida_maxima === 'number' ? char.vida_maxima : 10,
      tipo: 'jogador',
      cor: '#4FD1C5', // primary teal
    }));

    set(state => {
      // Evita adicionar duplicados
      const idsExistentes = new Set(state.iniciativa.map(e => e.id));
      const entidadesParaAdicionar = novasEntidades.filter(e => !idsExistentes.has(e.id));
      
      return {
        iniciativa: [...state.iniciativa, ...entidadesParaAdicionar]
      };
    });
  },

  adicionarEntidade: (entidadeBase) => {
    const novaEntidade: EntidadeIniciativa = {
      ...entidadeBase,
      id: crypto.randomUUID(),
    };
    
    set(state => {
      const novaLista = [...state.iniciativa, novaEntidade];
      // Ordena por maior iniciativa automaticamente
      novaLista.sort((a, b) => b.iniciativa - a.iniciativa);
      
      // Ajusta o turno atual caso a ordenação mude
      return { iniciativa: novaLista };
    });
  },

  removerEntidade: (id) => {
    set(state => {
      const novaLista = state.iniciativa.filter(e => e.id !== id);
      return { iniciativa: novaLista };
    });
  },

  proximoTurno: () => {
    set(state => {
      if (state.iniciativa.length === 0) return state;
      const proximoIndex = (state.turnoAtualIndex + 1) % state.iniciativa.length;
      return { turnoAtualIndex: proximoIndex };
    });
  },

  limparIniciativa: () => {
    set({ iniciativa: [], turnoAtualIndex: 0 });
  },

  ordenarIniciativa: () => {
    set(state => {
      const listaOrdenada = [...state.iniciativa].sort((a, b) => b.iniciativa - a.iniciativa);
      return { iniciativa: listaOrdenada, turnoAtualIndex: 0 };
    });
  },

  adicionarRolagem: (rolagemBase) => {
    const novaRolagem: Rolagem = {
      ...rolagemBase,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    set(state => ({
      // Mantém apenas as últimas 50 rolagens para evitar lixo de memória
      rolagens: [novaRolagem, ...state.rolagens].slice(0, 50)
    }));
  },

  limparRolagens: () => {
    set({ rolagens: [] });
  }
}));
