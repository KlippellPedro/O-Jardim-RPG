import { api } from './apiClient';
import { animarRolagem } from '../components/dados/rolagemDados';
import { dispararConquistas } from '../components/conquistas/conquistas';
import type { IConquistaNova } from './conquistasApi';

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

// Todo dado é sorteado no servidor - o cliente nunca escolhe o resultado,
// só monta o pedido (bônus/vantagem/desvantagem/DT) e exibe a resposta.
export const registrosApi = {
  async rolar(payload: {
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
    const resposta = await api<{ registro: IRegistro; conquistas_novas?: IConquistaNova[] }>('/registros/rolagem', {
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
    // O dado já foi sorteado no servidor; a cena 3D só o mostra rolando e
    // segura a resposta até o pouso, para o modal de resultado vir depois.
    await animarRolagem(resposta.registro).catch(() => undefined);
    // Conquista nova vem depois do dado pousar, para o aviso não roubar a cena dele.
    dispararConquistas(resposta.conquistas_novas);
    return resposta;
  },

  async registrarUso(payload: {
    campanhaId: string;
    personagemId?: string | null;
    tipo: 'poder' | 'habilidade' | 'magia' | 'item' | 'anotacao';
    titulo: string;
    detalhes?: Record<string, any>;
  }) {
    const resposta = await api<{ registro: IRegistro; conquistas_novas?: IConquistaNova[] }>('/registros/uso', {
      method: 'POST',
      body: {
        campanha_id: payload.campanhaId,
        personagem_id: payload.personagemId ?? null,
        tipo: payload.tipo,
        titulo: payload.titulo,
        detalhes: payload.detalhes ?? {},
      },
    });
    dispararConquistas(resposta.conquistas_novas);
    return resposta;
  },

  listar(campanhaId: string, opts: { apenasSessao?: boolean; limite?: number } = {}) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    if (opts.apenasSessao) query.set('apenas_sessao', 'true');
    if (opts.limite) query.set('limite', String(opts.limite));
    return api<{ registros: IRegistro[]; comando: boolean }>(`/registros?${query.toString()}`);
  },
};
