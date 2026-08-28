import { api } from './apiClient';

export type JogoCassinoGambler = 'dados' | 'vinte_um' | 'roda_fluxos' | 'sucessao' | 'vaos' | 'rolos' | 'duelo';

export interface RodadaCassinoGambler {
  id: string;
  jogo: JogoCassinoGambler;
  aposta: number;
  pagamento: number;
  status: 'ativa' | 'liquidada' | 'reembolsada';
  versao: number;
  estado: Record<string, any>;
  resultado: Record<string, any>;
}

export interface LimitesCassinoGambler {
  aposta_minima: number;
  aposta_maxima: number;
  limite_apostado_dia: number;
  limite_perda_dia: number;
  apostado: number;
  perda_liquida: number;
}

export type MoedaCassinoGambler = 'Lunaris' | 'Solares' | 'Fragmentos de Estrela' | 'Créditos Sombrios';

export interface PersonagemCassinoGambler {
  id: string;
  nome: string;
  nivel: number;
  foto?: string | null;
  saldo_fichas: number;
}

export interface ConquistaCassinoGambler {
  chave: string;
  nome: string;
  descricao: string;
  nova: boolean;
}

export interface ConquistaCatalogoCassinoGambler {
  chave: string;
  nome: string;
  descricao: string;
}

export interface EstadoCassinoGambler {
  personagem: { id: string; nome: string };
  saldo_fichas: number;
  fichas_versao: number;
  carteira: Array<{ moeda: string; saldo: number }>;
  economia_versao: number;
  limites: LimitesCassinoGambler;
  forcas?: Record<string, { nome: string; emoji: string }>;
  simbolos_rolos?: Record<string, { nome: string }>;
  cambio?: Record<MoedaCassinoGambler, number>;
  fichas_recebidas?: number;
  lunaris_recebidos?: number;
  vinte_um_ativo?: RodadaCassinoGambler | null;
  rodada?: RodadaCassinoGambler;
  sequencia_atual?: number;
  maior_sequencia?: number;
  conquistas?: ConquistaCassinoGambler[];
  conquistas_novas?: ConquistaCassinoGambler[];
  catalogo_conquistas?: ConquistaCatalogoCassinoGambler[];
}

function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const casinoApi = {
  personagens(campanhaId: string) {
    return api<{ personagens: PersonagemCassinoGambler[] }>(`/cassino-gambler/personagens?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  estado(campanhaId: string, personagemId: string) {
    return api<EstadoCassinoGambler>(`/cassino-gambler?campanha_id=${encodeURIComponent(campanhaId)}&personagem_id=${encodeURIComponent(personagemId)}`);
  },
  cambiar(campanhaId: string, personagemId: string, moeda: MoedaCassinoGambler, quantidade: number) {
    return api<EstadoCassinoGambler>('/cassino-gambler/cambio', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, idempotencia: novoId(), moeda, quantidade },
    });
  },
  resgatar(campanhaId: string, personagemId: string, quantidade: number) {
    return api<EstadoCassinoGambler>('/cassino-gambler/resgate', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, idempotencia: novoId(), quantidade },
    });
  },
  jogar(
    campanhaId: string,
    personagemId: string,
    dados: {
      jogo: Exclude<JogoCassinoGambler, 'vinte_um'>;
      aposta: number;
      escolha?: string;
      numero?: number;
    },
  ) {
    return api<EstadoCassinoGambler>('/cassino-gambler/jogar', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, idempotencia: novoId(), ...dados },
    });
  },
  iniciarVinteUm(campanhaId: string, personagemId: string, aposta: number) {
    return api<EstadoCassinoGambler>('/cassino-gambler/vinte-um/iniciar', {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, idempotencia: novoId(), aposta },
    });
  },
  agirVinteUm(campanhaId: string, personagemId: string, rodadaId: string, versao: number, acao: 'comprar' | 'parar' | 'dobrar') {
    return api<EstadoCassinoGambler>(`/cassino-gambler/vinte-um/${encodeURIComponent(rodadaId)}/agir`, {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, versao, acao },
    });
  },
  abandonarVinteUm(campanhaId: string, personagemId: string, rodadaId: string, versao: number) {
    return api<EstadoCassinoGambler>(`/cassino-gambler/vinte-um/${encodeURIComponent(rodadaId)}/abandonar`, {
      method: 'POST',
      body: { campanha_id: campanhaId, personagem_id: personagemId, versao },
    });
  },
};
