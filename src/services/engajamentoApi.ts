import { api } from './apiClient';

export type PeriodoRank = 'campanha' | 'ultima' | 'atual';

export interface IProximaSessao {
  em: string;
  segundos: number;
  passou: boolean;
  texto: string;
  tipo: 'fixa' | 'especial';
  titulo: string;
  nota: string;
}

export interface ISessaoDoCalendario {
  em: string;
  /** Dia da sessão no fuso do grupo (AAAA-MM-DD). */
  data: string;
  tipo: 'fixa' | 'especial';
  id: string | null;
  titulo: string;
  nota: string;
  cancelada: boolean;
}

export interface IRecorrencia {
  ativa: boolean;
  dia_semana: number;
  hora: string;
  fuso: string;
  titulo: string;
  nota: string;
  texto: string;
}

export interface ICalendario {
  mes: string;
  sessoes: ISessaoDoCalendario[];
  recorrencia: IRecorrencia | null;
  proxima: IProximaSessao | null;
  gestor: boolean;
  especiais?: Array<{ id: string; em: string; titulo: string; nota: string }>;
  avisos?: Record<string, boolean>;
  avisos_rotulos?: Record<string, string>;
}

export interface IConquistaNovaHome {
  chave: string;
  nome: string;
  descricao: string;
  raridade: 'comum' | 'rara' | 'lendaria';
  personagem: string;
}

export interface IResumoHome {
  proxima_sessao: IProximaSessao | null;
  recorrencia_texto: string;
  ao_vivo: { sessao_id: string; titulo: string } | null;
  mudancas: {
    desde: string | null;
    primeira_visita: boolean;
    mural?: number;
    sessoes_encerradas?: number;
    avisos_nao_lidos?: number;
  };
  conquistas_novas: IConquistaNovaHome[];
  frase_do_mural: { texto: string; autor: string; votos: number } | null;
  gestor: boolean;
}

export interface IItemMural {
  id: string;
  tipo: 'citacao' | 'foto';
  texto: string;
  imagem: string | null;
  autor: string;
  publicado_por: string;
  sessao_id: string | null;
  criado_em: string;
  votos: number;
  votei: boolean;
  meu: boolean;
  pode_apagar: boolean;
  melhor_da_noite: boolean;
}

export interface IEntradaCronica {
  id: string;
  titulo: string;
  texto: string;
  autor: string;
  publicado_por: string;
  sessao_id: string | null;
  criado_em: string;
  atualizado_em: string;
  meu: boolean;
  pode_editar: boolean;
}

export interface IResultadoMvp {
  ranking: Array<{ usuario_id: string; nome: string; votos: number }>;
  vencedores: Array<{ usuario_id: string; nome: string; votos: number }>;
  total_votos: number;
}

export interface IMvp {
  sessao_id: string;
  candidatos: Array<{ usuario_id: string; nome: string }>;
  meu_voto: string | null;
  votaram: number;
  total_eleitores: number;
  resultado: IResultadoMvp | null;
}

export interface ITituloRank {
  chave: string;
  titulo: string;
  personagem_id: string;
  nome: string;
  valor: number;
  empatados: number;
  frase: string;
}

export interface IJogadorRank {
  personagem_id: string;
  nome: string;
  rolagens: number;
  criticos: number;
  falhas: number;
  dano_maximo: number;
  dano_total: number;
  usos: number;
  lunaris_gastos: number;
  lunaris_ganhos: number;
  lunaris_liquido: number;
}

export interface IRank {
  periodo: PeriodoRank;
  sessao: string | null;
  jogadores: IJogadorRank[];
  titulos: ITituloRank[];
}

const base = (campanhaId: string) => `/engajamento/${encodeURIComponent(campanhaId)}`;

// Regras, segredos e recompensas são decididos no servidor; o cliente só pede e mostra.
export const engajamentoApi = {
  resumo: (campanhaId: string) => api<IResumoHome>(`${base(campanhaId)}/resumo`),
  marcarVisita: (campanhaId: string) => api<void>(`${base(campanhaId)}/visita`, { method: 'POST' }),
  calendario: (campanhaId: string, mes?: string) =>
    api<ICalendario>(`${base(campanhaId)}/calendario${mes ? `?mes=${encodeURIComponent(mes)}` : ''}`),
  definirRecorrencia: (
    campanhaId: string,
    dados: { ativa: boolean; dia_semana?: number; hora?: string; titulo?: string; nota?: string },
  ) => api<{ texto: string }>(`${base(campanhaId)}/agenda/recorrencia`, { method: 'PUT', body: dados }),
  alternarCancelamento: (campanhaId: string, data: string) =>
    api<{ data: string; cancelada: boolean }>(`${base(campanhaId)}/agenda/cancelar`, { method: 'POST', body: { data } }),
  marcarEspecial: (campanhaId: string, dados: { em: string; titulo: string; nota: string }) =>
    api<{ id: string }>(`${base(campanhaId)}/agenda/especiais`, { method: 'POST', body: dados }),
  apagarEspecial: (campanhaId: string, id: string) =>
    api<void>(`${base(campanhaId)}/agenda/especiais/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  definirAvisos: (campanhaId: string, avisos: Record<string, boolean>) =>
    api<{ avisos: Record<string, boolean>; avisos_rotulos: Record<string, string> }>(`${base(campanhaId)}/avisos`, {
      method: 'PUT',
      body: { avisos },
    }),

  mural: (campanhaId: string) => api<{ itens: IItemMural[] }>(`${base(campanhaId)}/mural`),
  publicarCitacao: (campanhaId: string, texto: string, quemDisse: string) =>
    api<{ id: string }>(`${base(campanhaId)}/mural/citacoes`, { method: 'POST', body: { texto, quem_disse: quemDisse } }),
  publicarFoto: (campanhaId: string, imagem: string, legenda: string) =>
    api<{ id: string }>(`${base(campanhaId)}/mural/fotos`, { method: 'POST', body: { imagem, legenda } }),
  apagarItem: (campanhaId: string, id: string) =>
    api<void>(`${base(campanhaId)}/mural/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  alternarVoto: (campanhaId: string, id: string) =>
    api<{ votos: number; votei: boolean }>(`${base(campanhaId)}/mural/${encodeURIComponent(id)}/voto`, { method: 'POST' }),

  cronica: (campanhaId: string) => api<{ entradas: IEntradaCronica[] }>(`${base(campanhaId)}/cronica`),
  publicarCronica: (campanhaId: string, titulo: string, texto: string) =>
    api<{ id: string }>(`${base(campanhaId)}/cronica`, { method: 'POST', body: { titulo, texto } }),
  editarCronica: (campanhaId: string, id: string, titulo: string, texto: string) =>
    api<{ id: string }>(`${base(campanhaId)}/cronica/${encodeURIComponent(id)}`, { method: 'PUT', body: { titulo, texto } }),
  apagarCronica: (campanhaId: string, id: string) =>
    api<void>(`${base(campanhaId)}/cronica/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  mvp: (campanhaId: string, sessaoId: string) =>
    api<IMvp>(`${base(campanhaId)}/mvp/${encodeURIComponent(sessaoId)}`),
  votarMvp: (campanhaId: string, sessaoId: string, alvoUsuarioId: string) =>
    api<IMvp>(`${base(campanhaId)}/mvp`, { method: 'POST', body: { sessao_id: sessaoId, alvo_usuario_id: alvoUsuarioId } }),

  rank: (campanhaId: string, periodo: PeriodoRank) =>
    api<IRank>(`${base(campanhaId)}/rank?periodo=${encodeURIComponent(periodo)}`),
};
