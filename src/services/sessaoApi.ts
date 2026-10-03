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
  estamina_atual?: number | null;
  estamina_maxima?: number | null;
  /** Extra acima do máximo (efeito temporário); o dano gasta ele primeiro. */
  vida_temporaria?: number;
  mana_temporaria?: number;
  estamina_temporaria?: number;
  condicoes?: Array<string | { nome: string; turnos: number | null }>;
  ataques?: AtaquePayload[];
  anotacao?: string;
  visibilidade?: NivelVisibilidade;
  /** Só usado por quem não tem ficha (NPCs, monstros). */
  defesa?: number | null;
  /** Valor de Desafio (o nível do grupo que a criatura desafia sozinha) - de onde vem o XP ao distribuir. */
  vd?: number | null;
  /** Referência rápida ("Luta +12"); não valida nada. */
  pericias?: string[];
  /** Só na criação: a criatura do Bestiário, que liga o participante à tabela de loot. */
  monstro_id?: string | null;
}

/** Uma linha do loot rolado. `entregue_para` fica vazio até o Mestre escolher quem leva. */
export interface LootLinha {
  linha: string;
  tipo: 'item' | 'moedas';
  item_id?: string;
  moeda?: string;
  titulo: string;
  raridade?: string | null;
  quantidade: number;
  rolagem: number;
  chance: number;
  entregue_para: null | { personagem_id: string; nome: string };
}

export interface LootRolado {
  monstro_id: string;
  linhas: LootLinha[];
}

/** O que a criatura pode deixar cair. Só o Mestre recebe. */
export interface TabelaDeLoot {
  monstro_id: string;
  itens: Array<{
    item_id: string;
    titulo: string;
    raridade: string | null;
    exclusivo: boolean;
    chance: number;
    quantidade: string;
  }>;
  moedas: null | { dados: string; moeda: string; chance: number };
  /** O Mestre trocou a tabela só nesta campanha. */
  ajustada?: boolean;
  /** A tabela oficial, quando a da campanha foi ajustada (para comparar ou voltar). */
  oficial?: TabelaDeLoot | null;
}

/** Tabela de loot que o Mestre grava para a campanha dele. */
export interface TabelaDeLootPayload {
  itens: Array<{ item_id: string; chance: number; quantidade: string }>;
  moedas: null | { moeda: 'Lunaris' | 'Solares'; dados: string; chance: number };
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
  estamina_atual?: number | null;
  estamina_maxima?: number | null;
  /** Extra acima do máximo; mesma regra de visibilidade da Vida. */
  vida_temporaria?: number;
  mana_temporaria?: number;
  estamina_temporaria?: number;
  ataques?: AtaquePayload[];
  /** Só vem preenchido para quem comanda a mesa - é uso interno de XP. */
  vd?: number | null;
  pericias?: string[];
  /** Anotação privada de quem comanda a mesa, usada para planejar o turno. */
  anotacao?: string;
  /** Aflições da ficha do personagem (mesma regra de visibilidade das condições). */
  aflicoes?: Array<{ aflicao_id: string; estagio: number; incubando: boolean }>;
  /** Loot: só vem para quem comanda a mesa. */
  monstro_id?: string | null;
  tem_loot?: boolean;
  loot?: LootRolado | null;
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
  /** Família do Bestiário (id de data/bestiario/familias-v1.json), quando tem. */
  familia?: string | null;
  estagio?: string | null;
  papel?: string | null;
  /** Criatura de uma versão só, sem estágios. */
  unico?: boolean;
  /** Tem tabela de loot no servidor. */
  tem_loot?: boolean;
  /** A tabela de loot foi ajustada nesta campanha. */
  loot_ajustado?: boolean;
  pv: number | null;
  defesa: number | null;
  mana: number | null;
  estamina: number | null;
  iniciativa: number | null;
  ataques: AtaquePayload[];
  pericias: string[];
  habilidades: string[];
  deslocamento?: string | null;
  /** Bloco de criatura: forca, agilidade, vigor, presenca, intelecto. */
  atributos?: Record<string, number> | null;
  raridade?: string | null;
  subtipo?: string | null;
  funcao?: string | null;
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

export interface ResumoDestaque {
  id: string;
  rotulo: string;
  personagem: string;
  valor: number;
  unidade: string;
  detalhe: string;
}

export interface ResumoJogador {
  nome: string;
  rolagens: number;
  criticos: number;
  falhas: number;
  dano_total: number;
  dano_maximo: number;
  usos: number;
  acoes: number;
  media_natural: number | null;
}

/** Resumo da sessão: só números e o que foi registrado, sem o título de rolagens de perícia. */
export interface ResumoSessaoResposta {
  sessao: {
    id: string;
    titulo: string;
    status: string;
    rodadas: number;
    duracao_min: number;
    iniciada_em: string;
    encerrada_em: string | null;
  };
  mesa: {
    rolagens: number;
    criticos: number;
    falhas: number;
    dano_total: number;
    usos: number;
    jogadores: number;
  };
  destaques: ResumoDestaque[];
  jogadores: ResumoJogador[];
}

export const sessaoApi = {
  resumoDaSessao(sessaoId: string) {
    return api<ResumoSessaoResposta>(`/sessao/${sessaoId}/resumo`);
  },

  ultimaSessaoEncerrada(campanhaId: string) {
    return api<{ sessao_id: string | null }>(`/sessao/campanha/${campanhaId}/ultima-encerrada`);
  },

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

  tabelaDeLoot(campanhaId: string, monstroId: string) {
    return api<TabelaDeLoot>(
      `/sessao/bestiario/loot/${encodeURIComponent(monstroId)}?campanha_id=${campanhaId}`,
    );
  },

  ajustarTabelaDeLoot(campanhaId: string, monstroId: string, tabela: TabelaDeLootPayload) {
    return api<TabelaDeLoot>(
      `/sessao/bestiario/loot/${encodeURIComponent(monstroId)}?campanha_id=${campanhaId}`,
      { method: 'PUT', body: tabela },
    );
  },

  restaurarTabelaDeLoot(campanhaId: string, monstroId: string) {
    return api(
      `/sessao/bestiario/loot/${encodeURIComponent(monstroId)}?campanha_id=${campanhaId}`,
      { method: 'DELETE' },
    );
  },

  /** O Mestre aplica, muda de estágio ou tira uma aflição da ficha de quem está em cena. */
  mexerNaAflicao(
    sessaoId: string,
    participanteId: string,
    payload: { acao: 'aplicar' | 'estagio' | 'remover'; aflicao_id: string; estagio?: number; incubando?: boolean; cansaco?: number },
  ) {
    return api<{ aflicoes: Array<{ aflicao_id: string; estagio: number; incubando: boolean }>; cansaco_atual: number | null; versao: number }>(
      `/sessao/${sessaoId}/participantes/${participanteId}/aflicoes`,
      { method: 'POST', body: payload },
    );
  },

  rolarLoot(sessaoId: string, participanteId: string, refazer = false) {
    return api<{ loot: LootRolado; versao: number }>(`/sessao/${sessaoId}/participantes/${participanteId}/loot`, {
      method: 'POST',
      body: { refazer },
    });
  },

  entregarLoot(sessaoId: string, participanteId: string, entregas: Array<{ linha: string; personagem_id: string }>) {
    return api<{ loot: LootRolado; entregues: Array<{ linha: string; titulo: string; quantidade: number; personagem_id: string }>; versao: number }>(
      `/sessao/${sessaoId}/participantes/${participanteId}/loot/entregar`,
      { method: 'POST', body: { entregas } },
    );
  },

  darXp(sessaoId: string, participanteIds: string[], xp: number) {
    return api<{ xp: number; personagens: Array<{ id: string; nome: string; xp: number }> }>(`/sessao/${sessaoId}/xp-direto`, {
      method: 'POST',
      body: { participante_ids: participanteIds, xp },
    });
  },

  distribuirXp(sessaoId: string, participanteIds: string[]) {
    return api<DistribuirXpResponse>(`/sessao/${sessaoId}/xp`, {
      method: 'POST',
      body: { participante_ids: participanteIds },
    });
  },
};
