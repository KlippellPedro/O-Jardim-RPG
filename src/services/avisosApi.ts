import { api } from './apiClient';

/**
 * Onde o aviso mora. 'geral' é a caixa da engrenagem (o que é da pessoa); 'mestre' aparece no
 * Painel do Mestre, junto da campanha do aviso; 'admin' aparece na Administração.
 */
export type PainelDeAviso = 'geral' | 'mestre' | 'admin';

export interface IAviso {
  id: string;
  campanha_id: string | null;
  campanha_nome: string | null;
  categoria: string;
  /** Ausente quando o servidor ainda é o anterior à divisão por painel. */
  painel?: PainelDeAviso;
  titulo: string;
  mensagem: string;
  dados?: Record<string, unknown> | null;
  lida_em: string | null;
  criado_em: string;
  origem_nome?: string | null;
}

/** Não lidos por painel. `mestre` vale só para a campanha ativa; `mestre_por_campanha` traz todas as mesas. */
export interface IContagemDeAvisos {
  geral: number;
  mestre: number;
  admin: number;
  mestre_por_campanha: Record<string, number>;
  total: number;
}

export const CONTAGEM_VAZIA: IContagemDeAvisos = {
  geral: 0,
  mestre: 0,
  admin: 0,
  mestre_por_campanha: {},
  total: 0,
};

const numero = (valor: unknown): number => (typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0);

/**
 * Aceita a contagem nova e também a resposta de um servidor mais antigo, que só mandava o total
 * (`avisos_nao_lidos`): nesse caso tudo cai na caixa geral, que é onde ele ainda mostra tudo.
 */
export function normalizarContagem(bruta: unknown, totalLegado: unknown = 0): IContagemDeAvisos {
  if (!bruta || typeof bruta !== 'object') {
    const total = numero(totalLegado);
    return { ...CONTAGEM_VAZIA, geral: total, total };
  }
  const dados = bruta as Partial<IContagemDeAvisos>;
  const porCampanha: Record<string, number> = {};
  if (dados.mestre_por_campanha && typeof dados.mestre_por_campanha === 'object') {
    for (const [campanhaId, quantidade] of Object.entries(dados.mestre_por_campanha)) {
      const valor = numero(quantidade);
      if (valor > 0) porCampanha[campanhaId] = valor;
    }
  }
  const geral = numero(dados.geral);
  const mestre = numero(dados.mestre);
  const admin = numero(dados.admin);
  const total = numero(dados.total) || geral + admin + Object.values(porCampanha).reduce((soma, valor) => soma + valor, 0);
  return { geral, mestre, admin, mestre_por_campanha: porCampanha, total };
}

interface IEscopo {
  painel?: PainelDeAviso;
  campanhaId?: string | null;
}

function consulta(escopo: IEscopo, extra: Record<string, string> = {}): string {
  const parametros = new URLSearchParams(extra);
  if (escopo.painel) parametros.set('painel', escopo.painel);
  if (escopo.campanhaId) parametros.set('campanha_id', escopo.campanhaId);
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

export const avisosApi = {
  async listar(opcoes: IEscopo & { apenasNaoLidos?: boolean; limite?: number } = {}) {
    const extra: Record<string, string> = { limite: String(opcoes.limite ?? 40) };
    if (opcoes.apenasNaoLidos) extra.apenas_nao_lidos = 'true';
    const resposta = await api<{ avisos: IAviso[]; nao_lidos: number; contagens?: unknown }>(`/avisos${consulta(opcoes, extra)}`);
    return {
      avisos: resposta.avisos ?? [],
      contagens: normalizarContagem(resposta.contagens, resposta.nao_lidos),
    };
  },

  /** Sem `ids`, marca tudo do escopo (o painel e a campanha pedidos) como lido. */
  async marcarLidos(opcoes: IEscopo & { ids?: string[] } = {}) {
    const resposta = await api<{ nao_lidos: number; contagens?: unknown }>('/avisos/lidos', {
      method: 'POST',
      body: {
        ids: opcoes.ids ?? [],
        ...(opcoes.painel ? { painel: opcoes.painel } : {}),
        ...(opcoes.campanhaId ? { campanha_id: opcoes.campanhaId } : {}),
      },
    });
    return normalizarContagem(resposta.contagens, resposta.nao_lidos);
  },

  limparLidos(escopo: IEscopo = {}) {
    return api(`/avisos${consulta(escopo)}`, { method: 'DELETE' });
  },
};
