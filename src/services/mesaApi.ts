import { api } from './apiClient';

export type CorRelogio = 'perigo' | 'ritual' | 'progresso' | 'misterio';
export type EstiloBilhete = 'papel' | 'carta' | 'runa';

export interface IOpcaoVotacao {
  id: string;
  texto: string;
  votos: number;
  /** Ausente para o jogador quando a votação é anônima. */
  votantes?: string[];
}

export interface IVotacao {
  id: string;
  pergunta: string;
  anonima: boolean;
  aberta: boolean;
  opcoes: IOpcaoVotacao[];
  meu_voto: string | null;
  total_votos: number;
  total_elegiveis: number;
}

export interface IRelogio {
  id: string;
  titulo: string;
  fatias: number;
  cheias: number;
  cor: CorRelogio;
  visivel: boolean;
}

export type SituacaoCronometro = 'parado' | 'correndo' | 'pausado' | 'zerado';

/** Contagem regressiva que todos veem. `restante_s` vale no instante em que a resposta chegou. */
export interface ICronometro {
  id: string;
  titulo: string;
  cor: CorRelogio;
  visivel: boolean;
  duracao_s: number;
  restante_s: number;
  situacao: SituacaoCronometro;
}

export interface IBilhete {
  id: string;
  titulo: string;
  texto: string;
  estilo: EstiloBilhete;
  criado_em: string;
  aberto_em: string | null;
  /** Só para o Mestre. */
  para_usuario_id?: string;
  para_nome?: string;
}

export interface IEstadoMesa {
  votacao: IVotacao | null;
  ultima_votacao: IVotacao | null;
  relogios: IRelogio[];
  cronometros: ICronometro[];
  bilhetes: IBilhete[];
}

export interface IRespostaMesa {
  versao: number;
  gestor: boolean;
  usuario_id: string;
  sessao_id: string | null;
  sessao_status: 'preparacao' | 'aberta' | null;
  bloqueada: boolean;
  estado: IEstadoMesa | null;
  jogadores: Array<{ usuario_id: string; nome: string }>;
}

export interface ISessaoResumo {
  id: string;
  titulo: string;
  status: 'preparacao' | 'aberta' | 'encerrada';
  iniciada_em: string;
  encerrada_em: string | null;
  rodada: number;
}

export interface IEventoReplay {
  t: string;
  /** Segundos desde o começo da sessão. */
  s: number;
  tipo: string;
  texto: string;
  destaque: 'critico' | 'falha' | 'dano' | null;
}

export interface IReplay {
  sessao: { id: string; titulo: string; status: string; iniciada_em: string; encerrada_em: string | null };
  duracao_s: number;
  eventos: IEventoReplay[];
}

// Tudo é decidido no servidor (regras, segredos, o que cada papel enxerga). O
// cliente só pede a ação e mostra o recorte que voltou.
export const mesaApi = {
  obter(campanhaId: string) {
    return api<IRespostaMesa>(`/mesa/${encodeURIComponent(campanhaId)}`);
  },
  agir(campanhaId: string, acao: string, dados: Record<string, unknown> = {}) {
    return api<IRespostaMesa>(`/mesa/${encodeURIComponent(campanhaId)}/acoes`, {
      method: 'POST',
      body: { acao, dados },
    });
  },
  sessoes(campanhaId: string) {
    return api<{ sessoes: ISessaoResumo[] }>(`/mesa/${encodeURIComponent(campanhaId)}/sessoes`);
  },
  replay(campanhaId: string, sessaoId: string) {
    return api<IReplay>(`/mesa/${encodeURIComponent(campanhaId)}/replay/${encodeURIComponent(sessaoId)}`);
  },
};
