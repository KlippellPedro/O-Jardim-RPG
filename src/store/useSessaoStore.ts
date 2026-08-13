import { create } from 'zustand';
import {
  sessaoApi,
  type DistribuirXpResponse,
  type NivelVisibilidade,
  type ParticipantePayload,
  type SessaoParticipanteResponse,
} from '../services/sessaoApi';
import { registrosApi, type IRegistro } from '../services/registrosApi';

export interface SessionCondition {
  nome: string;
  turnos: number | null;
}

export interface SessionAttack {
  nome: string;
  detalhe: string;
}

export interface EntidadeIniciativa {
  id: string;
  personagemId?: string | null;
  nome: string;
  iniciativa: number;
  hpAtual?: number;
  hpTotal?: number;
  manaAtual?: number;
  manaTotal?: number;
  defesa?: number | null;
  ataques?: SessionAttack[];
  pericias?: string[];
  /** Só chega para quem comanda a mesa - usado pra distribuir XP. */
  vd?: number | null;
  tipo: 'jogador' | 'aliado' | 'inimigo';
  cor?: string;
  estado_vida?: string;
  /** Só chega para quem comanda a mesa ou para o dono do personagem. */
  visibilidade?: NivelVisibilidade | null;
  eMeu?: boolean;
  ordem?: number;
  condicoes: SessionCondition[];
}

export type SessionConnectionStatus = 'connecting' | 'online' | 'offline';

function normalizeConditions(value: unknown): SessionCondition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((condition) => {
    if (typeof condition === 'string' && condition.trim()) {
      return [{ nome: condition.trim(), turnos: null }];
    }
    if (!condition || typeof condition !== 'object') return [];
    const item = condition as Record<string, unknown>;
    if (typeof item.nome !== 'string' || !item.nome.trim()) return [];
    return [{
      nome: item.nome.trim(),
      turnos: typeof item.turnos === 'number' && Number.isInteger(item.turnos)
        ? item.turnos
        : null,
    }];
  });
}

function normalizeAttacks(value: unknown): SessionAttack[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((attack) => {
    if (!attack || typeof attack !== 'object') return [];
    const item = attack as Record<string, unknown>;
    if (typeof item.nome !== 'string' || !item.nome.trim()) return [];
    return [{
      nome: item.nome.trim(),
      detalhe: typeof item.detalhe === 'string' ? item.detalhe.trim() : '',
    }];
  });
}

function normalizePericias(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []));
}

function mapParticipantes(participantes: SessaoParticipanteResponse[] | undefined): EntidadeIniciativa[] {
  return (Array.isArray(participantes) ? participantes : []).map((participante) => {
    const tipo = participante.tipo === 'jogador' || participante.tipo === 'aliado'
      ? participante.tipo
      : 'inimigo';
    return {
      id: String(participante.id),
      personagemId: participante.personagem_id ?? null,
      nome: String(participante.nome ?? 'Entidade'),
      iniciativa: Number(participante.iniciativa) || 0,
      hpAtual: typeof participante.vida_atual === 'number' ? participante.vida_atual : undefined,
      hpTotal: typeof participante.vida_maxima === 'number' ? participante.vida_maxima : undefined,
      manaAtual: typeof participante.mana_atual === 'number' ? participante.mana_atual : undefined,
      manaTotal: typeof participante.mana_maxima === 'number' ? participante.mana_maxima : undefined,
      defesa: typeof participante.defesa === 'number' ? participante.defesa : null,
      ataques: normalizeAttacks(participante.ataques),
      pericias: normalizePericias(participante.pericias),
      vd: typeof participante.vd === 'number' ? participante.vd : null,
      tipo,
      cor: tipo === 'jogador' ? '#4FD1C5' : tipo === 'aliado' ? '#34d399' : '#ef4444',
      estado_vida: typeof participante.estado_vida === 'string' ? participante.estado_vida : undefined,
      visibilidade: participante.visibilidade ?? null,
      eMeu: !!participante.e_meu,
      ordem: typeof participante.ordem === 'number' ? participante.ordem : undefined,
      condicoes: normalizeConditions(participante.condicoes),
    };
  });
}

interface SessaoState {
  campanhaId: string | null;
  sessaoId: string | null;
  sessaoStatus: 'preparacao' | 'aberta' | null;
  tituloSessao: string | null;
  iniciadaEm: string | null;
  comando: boolean;
  meuPapel: string | null;
  bloqueada: boolean;
  iniciativa: EntidadeIniciativa[];
  turnoAtualIndex: number;
  turnoAtualId: string | null;
  emCombate: boolean;
  rodada: number;
  rolagens: IRegistro[];
  eventSource: EventSource | null;
  sessaoVersao: number;
  connectionStatus: SessionConnectionStatus;
  isLoading: boolean;
  error: string | null;

  conectarSSE: (campanhaId: string) => void;
  desconectarSSE: () => void;
  fetchEstadoSessao: () => Promise<void>;
  /** Uso interno: o corpo de fetchEstadoSessao, sem a trava de deduplicação. */
  _buscarEstadoSessao: () => Promise<void>;
  fetchRolagens: () => Promise<void>;
  publicarAoVivo: () => Promise<void>;
  encerrarSessao: () => Promise<void>;

  adicionarEntidade: (entidade: ParticipantePayload) => Promise<void>;
  removerEntidade: (id: string) => Promise<void>;
  iniciarCombate: () => Promise<void>;
  encerrarCombate: () => Promise<void>;
  proximoTurno: () => Promise<void>;
  turnoAnterior: () => Promise<void>;
  ordenarIniciativa: () => Promise<void>;
  sincronizarIniciativa: () => Promise<void>;
  atualizarEntidade: (id: string, payload: ParticipantePayload) => Promise<void>;
  reordenarIniciativa: (ordem: string[]) => Promise<void>;
  aplicarEmMassa: (ids: string[], payload: ParticipantePayload) => Promise<void>;
  distribuirXp: (participanteIds: string[]) => Promise<DistribuirXpResponse>;

  clearError: () => void;
}

// O SSE avisa "algo mudou" pro dono da própria ação também, então uma
// chamada explícita e o eco do SSE podem cair ao mesmo tempo. Sem essa trava,
// os dois viam "sem sessão ativa" e disputavam a recriação da preparação -
// um criava, o outro batia num 409.
let buscaEstadoEmVoo: Promise<void> | null = null;

export const useSessaoStore = create<SessaoState>((set, get) => ({
  campanhaId: null,
  sessaoId: null,
  sessaoStatus: null,
  tituloSessao: null,
  iniciadaEm: null,
  comando: false,
  meuPapel: null,
  bloqueada: true,
  iniciativa: [],
  turnoAtualIndex: 0,
  turnoAtualId: null,
  emCombate: false,
  rodada: 0,
  rolagens: [],
  eventSource: null,
  sessaoVersao: 0,
  connectionStatus: 'offline',
  isLoading: false,
  error: null,

  conectarSSE: (campanhaId) => {
    get().eventSource?.close();
    set({ campanhaId, connectionStatus: 'connecting', error: null });

    void get().fetchEstadoSessao().then(() => get().fetchRolagens());

    const eventSource = new EventSource(`/api/v1/sessao/${campanhaId}/eventos`);
    eventSource.onopen = () => set({ connectionStatus: 'online', error: null });
    eventSource.onerror = () => set({
      connectionStatus: 'offline',
      error: 'A conexão ao vivo foi interrompida. O navegador tentará reconectar automaticamente.',
    });
    eventSource.onmessage = (event) => {
      if (event.data === 'ping' || event.data === 'conectado') return;
      try {
        const payload = JSON.parse(event.data) as { tipo?: string };
        if (payload.tipo === 'registro') {
          void get().fetchRolagens();
        } else {
          void get().fetchEstadoSessao().then(() => get().fetchRolagens());
        }
      } catch (error) {
        console.error('Falha ao ler evento SSE', error);
      }
    };
    set({ eventSource });
  },

  desconectarSSE: () => {
    get().eventSource?.close();
    set({
      eventSource: null,
      campanhaId: null,
      sessaoId: null,
      sessaoStatus: null,
      tituloSessao: null,
      iniciadaEm: null,
      comando: false,
      meuPapel: null,
      bloqueada: true,
      iniciativa: [],
      turnoAtualIndex: 0,
      turnoAtualId: null,
      emCombate: false,
      rodada: 0,
      rolagens: [],
      sessaoVersao: 0,
      connectionStatus: 'offline',
      isLoading: false,
      error: null,
    });
  },

  fetchEstadoSessao: async () => {
    if (buscaEstadoEmVoo) return buscaEstadoEmVoo;
    buscaEstadoEmVoo = get()._buscarEstadoSessao().finally(() => {
      buscaEstadoEmVoo = null;
    });
    return buscaEstadoEmVoo;
  },

  _buscarEstadoSessao: async () => {
    const { campanhaId, sessaoId } = get();
    if (!campanhaId) return;
    const isInitialLoad = !sessaoId;
    if (isInitialLoad) set({ isLoading: true, error: null });

    try {
      const response = await sessaoApi.obterSessao(campanhaId);
      if (response?.sessao) {
        set({
          sessaoId: response.sessao.id,
          sessaoStatus: response.sessao.status,
          tituloSessao: response.sessao.titulo ?? 'Sessão ao vivo',
          iniciadaEm: response.sessao.iniciada_em ?? null,
          comando: !!response.comando,
          meuPapel: response.meu_papel ?? null,
          bloqueada: false,
          iniciativa: mapParticipantes(response.participantes),
          turnoAtualIndex: response.sessao.turno_de?.indice ?? 0,
          turnoAtualId: response.sessao.turno_de?.id ?? null,
          emCombate: !!response.sessao.em_combate,
          rodada: response.sessao.rodada ?? 0,
          sessaoVersao: response.sessao.versao ?? 0,
          error: null,
        });
        return;
      }

      set({
        sessaoId: null,
        sessaoStatus: null,
        tituloSessao: null,
        iniciadaEm: null,
        iniciativa: [],
        turnoAtualIndex: 0,
        turnoAtualId: null,
        emCombate: false,
        rodada: 0,
        comando: !!response?.comando,
        meuPapel: response?.meu_papel ?? null,
        bloqueada: response?.bloqueada ?? !response?.comando,
        rolagens: [],
      });

      if (response?.comando) {
        const reopened = await sessaoApi.abrirSessao(campanhaId, 'Sessão ao vivo', true);
        if (reopened?.sessao) {
          set({
            sessaoId: reopened.sessao.id,
            sessaoStatus: reopened.sessao.status,
            tituloSessao: reopened.sessao.titulo ?? 'Sessão ao vivo',
            iniciadaEm: reopened.sessao.iniciada_em ?? null,
            comando: !!reopened.comando,
            meuPapel: reopened.meu_papel ?? null,
            bloqueada: false,
            iniciativa: mapParticipantes(reopened.participantes),
            turnoAtualIndex: reopened.sessao.turno_de?.indice ?? 0,
            turnoAtualId: reopened.sessao.turno_de?.id ?? null,
            emCombate: !!reopened.sessao.em_combate,
            rodada: reopened.sessao.rodada ?? 0,
            sessaoVersao: reopened.sessao.versao ?? 0,
          });
        }
      }
    } catch (error) {
      console.error('Falha ao buscar sessão', error);
      set({ error: 'Não foi possível carregar o estado da sessão.' });
    } finally {
      if (isInitialLoad) set({ isLoading: false });
    }
  },

  fetchRolagens: async () => {
    const { campanhaId, comando, sessaoStatus } = get();
    if (!campanhaId) return;
    if (!comando && sessaoStatus !== 'aberta') {
      set({ rolagens: [] });
      return;
    }
    try {
      const response = await registrosApi.listar(campanhaId, { apenasSessao: true, limite: 80 });
      set({ rolagens: Array.isArray(response?.registros) ? response.registros : [] });
    } catch (error) {
      console.error('Falha ao buscar registros', error);
      set({ error: 'Não foi possível atualizar o histórico de rolagens.' });
    }
  },

  publicarAoVivo: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão preparada.');
    const response = await sessaoApi.publicarAoVivo(sessaoId);
    if (!response.sessao) throw new Error('A sessão não foi liberada pelo servidor.');
    set({
      sessaoStatus: response.sessao.status,
      iniciadaEm: response.sessao.iniciada_em ?? null,
      sessaoVersao: response.sessao.versao ?? 0,
      bloqueada: false,
      error: null,
    });
    await get().fetchRolagens();
  },

  encerrarSessao: async () => {
    const { sessaoId } = get();
    if (!sessaoId) return;
    await sessaoApi.encerrarSessao(sessaoId);
    set({
      sessaoId: null,
      sessaoStatus: null,
      tituloSessao: null,
      iniciadaEm: null,
      iniciativa: [],
      rolagens: [],
      emCombate: false,
      rodada: 0,
      bloqueada: false,
    });
    await get().fetchEstadoSessao();
  },

  adicionarEntidade: async (entidade) => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.adicionarParticipante(sessaoId, {
      ...entidade,
      visibilidade: entidade.visibilidade ?? 'parcial',
    });
    await get().fetchEstadoSessao();
  },

  atualizarEntidade: async (id, payload) => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.atualizarParticipante(sessaoId, id, payload);
    await get().fetchEstadoSessao();
  },

  removerEntidade: async (id) => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.removerParticipante(sessaoId, id);
    await get().fetchEstadoSessao();
  },

  iniciarCombate: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.controlarTurno(sessaoId, 'iniciar');
    await get().fetchEstadoSessao();
  },

  encerrarCombate: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.controlarTurno(sessaoId, 'encerrar');
    await get().fetchEstadoSessao();
  },

  proximoTurno: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.controlarTurno(sessaoId, 'proximo');
    await get().fetchEstadoSessao();
  },

  turnoAnterior: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.controlarTurno(sessaoId, 'anterior');
    await get().fetchEstadoSessao();
  },

  ordenarIniciativa: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.controlarTurno(sessaoId, 'ordenar');
    await get().fetchEstadoSessao();
  },

  sincronizarIniciativa: async () => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.sincronizarIniciativa(sessaoId);
    await get().fetchEstadoSessao();
  },

  reordenarIniciativa: async (ordem) => {
    const { sessaoId, iniciativa } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    const porId = new Map(iniciativa.map((entidade) => [entidade.id, entidade]));
    const reordenada = ordem
      .map((id) => porId.get(id))
      .filter((entidade): entidade is EntidadeIniciativa => !!entidade);
    set({ iniciativa: reordenada });
    try {
      await sessaoApi.reordenarParticipantes(sessaoId, ordem);
    } catch (error) {
      await get().fetchEstadoSessao();
      throw error;
    }
  },

  aplicarEmMassa: async (ids, payload) => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await Promise.all(ids.map((id) => sessaoApi.atualizarParticipante(sessaoId, id, payload)));
    await get().fetchEstadoSessao();
  },

  distribuirXp: async (participanteIds) => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    return sessaoApi.distribuirXp(sessaoId, participanteIds);
  },

  clearError: () => set({ error: null }),
}));
