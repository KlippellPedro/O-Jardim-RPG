import { create } from 'zustand';
import { sessaoApi, ParticipantePayload } from '../services/sessaoApi';
import { registrosApi, IRegistro } from '../services/registrosApi';

export interface EntidadeIniciativa {
  id: string;
  nome: string;
  iniciativa: number;
  hpAtual?: number;
  hpTotal?: number;
  tipo: 'jogador' | 'aliado' | 'inimigo';
  cor?: string;
  estado_vida?: string;
  visivel?: boolean;
}

function mapParticipantes(participantes: any[] | undefined): EntidadeIniciativa[] {
  return (participantes || []).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    iniciativa: p.iniciativa,
    hpAtual: p.vida_atual,
    hpTotal: p.vida_maxima,
    tipo: p.tipo,
    cor: p.tipo === 'jogador' ? '#4FD1C5' : p.tipo === 'aliado' ? '#34d399' : '#ef4444',
    estado_vida: p.estado_vida,
    visivel: p.visivel,
  }));
}

interface SessaoState {
  campanhaId: string | null;
  sessaoId: string | null;
  comando: boolean;
  meuPapel: string | null;
  iniciativa: EntidadeIniciativa[];
  turnoAtualIndex: number;
  emCombate: boolean;
  rodada: number;
  rolagens: IRegistro[];
  eventSource: EventSource | null;
  sessaoVersao: number;

  // EventSource & Sync
  conectarSSE: (campanhaId: string) => void;
  desconectarSSE: () => void;
  fetchEstadoSessao: () => Promise<void>;
  fetchRolagens: () => Promise<void>;

  // Iniciativa
  adicionarEntidade: (entidade: ParticipantePayload) => Promise<void>;
  removerEntidade: (id: string) => Promise<void>;
  iniciarCombate: () => Promise<void>;
  encerrarCombate: () => Promise<void>;
  proximoTurno: () => Promise<void>;
  ordenarIniciativa: () => Promise<void>;
  atualizarEntidade: (id: string, payload: ParticipantePayload) => Promise<void>;

  // Rolagens
  rolarDados: (payload: any) => Promise<IRegistro | null>;
}

export const useSessaoStore = create<SessaoState>((set, get) => ({
  campanhaId: null,
  sessaoId: null,
  comando: false,
  meuPapel: null,
  iniciativa: [],
  turnoAtualIndex: 0,
  emCombate: false,
  rodada: 0,
  rolagens: [],
  eventSource: null,
  sessaoVersao: 0,

  conectarSSE: (campanhaId: string) => {
    const currentState = get();
    if (currentState.eventSource) {
      currentState.eventSource.close();
    }

    set({ campanhaId });
    get().fetchEstadoSessao();
    get().fetchRolagens();

    const es = new EventSource(`/api/v1/sessao/${campanhaId}/eventos`);
    
    es.onmessage = (event) => {
      const data = event.data;
      if (data === 'ping') return;
      if (data === 'conectado') return;
      
      try {
        const payload = JSON.parse(data);
        if (payload.tipo === 'registro') {
          get().fetchRolagens();
        } else {
          // 'turno', 'participante_adicionado', etc.
          get().fetchEstadoSessao();
        }
      } catch (e) {
        console.error("Falha ao ler evento SSE", e);
      }
    };

    set({ eventSource: es });
  },

  desconectarSSE: () => {
    const es = get().eventSource;
    if (es) {
      es.close();
      set({ eventSource: null, campanhaId: null, sessaoId: null });
    }
  },

  fetchEstadoSessao: async () => {
    const { campanhaId } = get();
    if (!campanhaId) return;

    try {
      const resp = await sessaoApi.obterSessao(campanhaId);
      if (resp && resp.sessao) {
        set({
          sessaoId: resp.sessao.id,
          comando: resp.comando,
          meuPapel: resp.meu_papel,
          iniciativa: mapParticipantes(resp.participantes),
          turnoAtualIndex: resp.sessao.turno_de?.indice || 0,
          emCombate: !!resp.sessao.em_combate,
          rodada: resp.sessao.rodada || 0,
          sessaoVersao: resp.sessao.versao,
        });
        return;
      }

      set({
        sessaoId: null,
        iniciativa: [],
        turnoAtualIndex: 0,
        emCombate: false,
        rodada: 0,
        comando: resp?.comando ?? false,
        meuPapel: resp?.meu_papel ?? null,
      });

      // Mestre chegando numa campanha sem sessão aberta: abre a mesa
      // automaticamente para não deixar o painel vazio sem nenhuma ação possível.
      if (resp?.comando) {
        await sessaoApi.abrirSessao(campanhaId, "Sessão ao vivo", true);
        const reaberta = await sessaoApi.obterSessao(campanhaId);
        if (reaberta && reaberta.sessao) {
          set({
            sessaoId: reaberta.sessao.id,
            comando: reaberta.comando,
            meuPapel: reaberta.meu_papel,
            iniciativa: mapParticipantes(reaberta.participantes),
            turnoAtualIndex: reaberta.sessao.turno_de?.indice || 0,
            emCombate: !!reaberta.sessao.em_combate,
            rodada: reaberta.sessao.rodada || 0,
            sessaoVersao: reaberta.sessao.versao,
          });
        }
      }
    } catch (error) {
      console.error("Falha ao buscar sessão", error);
    }
  },

  fetchRolagens: async () => {
    const { campanhaId } = get();
    if (!campanhaId) return;

    try {
      const resp = await registrosApi.listar(campanhaId, { apenasSessao: true, limite: 50 });
      set({ rolagens: resp.registros });
    } catch (error) {
      console.error("Falha ao buscar registros", error);
    }
  },

  adicionarEntidade: async (entidade) => {
    const { sessaoId } = get();
    if (!sessaoId) throw new Error('Nenhuma sessão ao vivo aberta.');
    await sessaoApi.adicionarParticipante(sessaoId, { ...entidade, visivel: true, vida_visivel: true });
    await get().fetchEstadoSessao();
  },

  atualizarEntidade: async (id, payload) => {
    const { sessaoId } = get();
    if (!sessaoId) return;
    await sessaoApi.atualizarParticipante(sessaoId, id, payload);
    await get().fetchEstadoSessao();
  },

  removerEntidade: async (id) => {
    const { sessaoId } = get();
    if (!sessaoId) return;
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
    if (!sessaoId) return;
    await sessaoApi.controlarTurno(sessaoId, 'encerrar');
    await get().fetchEstadoSessao();
  },

  proximoTurno: async () => {
    const { sessaoId } = get();
    if (!sessaoId) return;
    await sessaoApi.controlarTurno(sessaoId, 'proximo');
    await get().fetchEstadoSessao();
  },

  ordenarIniciativa: async () => {
    const { sessaoId } = get();
    if (!sessaoId) return;
    await sessaoApi.controlarTurno(sessaoId, 'ordenar');
    await get().fetchEstadoSessao();
  },

  rolarDados: async (payload) => {
    const { campanhaId } = get();
    if (!campanhaId) return null;
    try {
      const resp = await registrosApi.rolar({ ...payload, campanhaId });
      return resp.registro;
    } catch (e) {
      console.error("Falha ao rolar", e);
      return null;
    }
  },
}));
