import { api } from './apiClient';

/** oculto: nem aparece. desconhecido: aparece sem nome nem número (emboscada).
 * parcial: nome e estado qualitativo ("Ferido"), sem número. total: tudo. */
export type NivelVisibilidade = 'oculto' | 'desconhecido' | 'parcial' | 'total';

export interface AtaquePayload {
  nome: string;
  detalhe?: string;
}

export interface ParticipantePayload {
  nome?: string;
  tipo?: 'jogador' | 'aliado' | 'inimigo';
  iniciativa?: number;
  vida_atual?: number | null;
  vida_maxima?: number;
  dano?: number;
  cura?: number;
  mana_atual?: number | null;
  mana_maxima?: number | null;
  condicoes?: Array<string | { nome: string; turnos: number | null }>;
  ataques?: AtaquePayload[];
  anotacao?: string;
  visibilidade?: NivelVisibilidade;
  /** Só usado por quem não tem ficha (NPCs, monstros). */
  defesa?: number | null;
  /** Valor de Desafio (1-10) - de onde vem o XP ao distribuir. */
  vd?: number | null;
  /** Referência rápida ("Luta +12"); não valida nada. */
  pericias?: string[];
}

export interface SessaoParticipanteResponse {
  id: string;
  personagem_id?: string | null;
  nome: string;
  tipo: 'jogador' | 'aliado' | 'inimigo';
  iniciativa: number;
  vida_atual?: number;
  vida_maxima?: number;
  condicoes?: Array<string | { nome: string; turnos: number | null }>;
  ordem?: number;
  estado_vida?: string;
  e_meu?: boolean;
  /** Só vem preenchido para quem comanda a mesa ou para o dono do próprio
   * personagem - é o segredo do mestre, não algo que o resto da mesa lê. */
  visibilidade?: NivelVisibilidade | null;
  /** Mesma regra da Vida: só aparece para quem pode ver o número exato. */
  defesa?: number | null;
  mana_atual?: number | null;
  mana_maxima?: number | null;
  ataques?: AtaquePayload[];
  /** Só vem preenchido para quem comanda a mesa - é uso interno de XP. */
  vd?: number | null;
  pericias?: string[];
  /** Anotação privada de quem comanda a mesa, usada para planejar o turno. */
  anotacao?: string;
}

export interface BestiarioMonstro {
  id: string;
  titulo: string;
  nivel: number | null;
  classe: string | null;
  /** Grupo pra organizar o seletor (Animal, Humanoide, Monstro, Universal…). */
  categoria: string | null;
  descricao: string | null;
  vd: number | null;
  xp: number;
  pv: number | null;
  defesa: number | null;
  mana: number | null;
  iniciativa: number | null;
  ataques: AtaquePayload[];
  pericias: string[];
  habilidades: string[];
}

export interface DistribuirXpResponse {
  total_xp: number;
  xp_por_personagem: number;
  personagens: Array<{ id: string; nome: string; xp: number }>;
}

export interface SessaoResponse {
  sessao: null | {
    id: string;
    campanha_id: string;
    titulo: string;
    status: 'preparacao' | 'aberta';
    rodada: number;
    em_combate: boolean;
    versao: number;
    iniciada_em: string;
    turno_de: null | { id: string | null; nome: string; indice: number };
  };
  participantes: SessaoParticipanteResponse[];
  meu_papel: string;
  comando: boolean;
  bloqueada: boolean;
}

export const sessaoApi = {
  obterSessao(campanhaId: string) {
    return api<SessaoResponse>(`/sessao?campanha_id=${campanhaId}`);
  },

  abrirSessao(campanhaId: string, titulo: string, incluirPersonagens: boolean = false) {
    return api<SessaoResponse>('/sessao', {
      method: 'POST',
      body: { campanha_id: campanhaId, titulo, incluir_personagens: incluirPersonagens },
    });
  },

  encerrarSessao(sessaoId: string) {
    return api(`/sessao/${sessaoId}`, { method: 'DELETE' });
  },

  publicarAoVivo(sessaoId: string) {
    return api<SessaoResponse>(`/sessao/${sessaoId}/ao-vivo`, { method: 'POST' });
  },

  selecionarPersonagens(sessaoId: string, personagemIds: string[]) {
    return api<SessaoResponse>(`/sessao/${sessaoId}/personagens`, {
      method: 'POST',
      body: { personagem_ids: personagemIds },
    });
  },

  adicionarParticipante(sessaoId: string, payload: ParticipantePayload) {
    return api(`/sessao/${sessaoId}/participantes`, {
      method: 'POST',
      body: payload,
    });
  },

  atualizarParticipante(sessaoId: string, participanteId: string, payload: ParticipantePayload) {
    return api(`/sessao/${sessaoId}/participantes/${participanteId}`, {
      method: 'PUT',
      body: payload,
    });
  },

  removerParticipante(sessaoId: string, participanteId: string) {
    return api(`/sessao/${sessaoId}/participantes/${participanteId}`, { method: 'DELETE' });
  },

  controlarTurno(sessaoId: string, acao: 'iniciar' | 'encerrar' | 'proximo' | 'anterior' | 'ordenar') {
    return api(`/sessao/${sessaoId}/turno`, {
      method: 'POST',
      body: { acao },
    });
  },

  sincronizarIniciativa(sessaoId: string) {
    return api(`/sessao/${sessaoId}/iniciativa`, { method: 'POST' });
  },

  reordenarParticipantes(sessaoId: string, ordem: string[]) {
    return api(`/sessao/${sessaoId}/participantes/ordem`, {
      method: 'POST',
      body: { ordem },
    });
  },

  listarBestiario(campanhaId: string) {
    return api<{ monstros: BestiarioMonstro[] }>(`/sessao/bestiario?campanha_id=${campanhaId}`);
  },

  distribuirXp(sessaoId: string, participanteIds: string[]) {
    return api<DistribuirXpResponse>(`/sessao/${sessaoId}/xp`, {
      method: 'POST',
      body: { participante_ids: participanteIds },
    });
  },
};
