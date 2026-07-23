import { api } from './apiClient';

export interface IRegistro {
  id: string;
  tipo: string;
  titulo: string;
  formula: string;
  resultado: number | null;
  detalhes: Record<string, any>;
  autor_nome: string;
  criado_em: string;
}

// Todo dado é sorteado no servidor — o cliente nunca escolhe o resultado,
// só monta o pedido (bônus/vantagem/desvantagem/DT) e exibe a resposta.
export const registrosApi = {
  rolar(payload: {
    campanhaId: string;
    personagemId?: string | null;
    titulo: string;
    bonus?: number;
    vantagens?: number;
    desvantagens?: number;
    dt?: number | null;
    formula?: string | null;
    origem?: Record<string, any>;
  }) {
    return api<{ registro: IRegistro }>('/registros/rolagem', {
      method: 'POST',
      body: {
        campanha_id: payload.campanhaId,
        personagem_id: payload.personagemId ?? null,
        titulo: payload.titulo,
        bonus: payload.bonus ?? 0,
        vantagens: payload.vantagens ?? 0,
        desvantagens: payload.desvantagens ?? 0,
        dt: payload.dt ?? null,
        formula: payload.formula ?? null,
        origem: payload.origem ?? {},
      },
    });
  },

  registrarUso(payload: {
    campanhaId: string;
    personagemId?: string | null;
    tipo: 'poder' | 'habilidade' | 'magia' | 'item' | 'anotacao';
    titulo: string;
    detalhes?: Record<string, any>;
  }) {
    return api<{ registro: IRegistro }>('/registros/uso', {
      method: 'POST',
      body: {
        campanha_id: payload.campanhaId,
        personagem_id: payload.personagemId ?? null,
        tipo: payload.tipo,
        titulo: payload.titulo,
        detalhes: payload.detalhes ?? {},
      },
    });
  },

  listar(campanhaId: string, opts: { apenasSessao?: boolean; limite?: number } = {}) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    if (opts.apenasSessao) query.set('apenas_sessao', 'true');
    if (opts.limite) query.set('limite', String(opts.limite));
    return api<{ registros: IRegistro[]; comando: boolean }>(`/registros?${query.toString()}`);
  },
};
