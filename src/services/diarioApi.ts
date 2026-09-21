import { api } from './apiClient';

export type TipoEventoDiario =
  | 'sessao'
  | 'critico'
  | 'falha'
  | 'dano'
  | 'uso'
  | 'conquista'
  | 'ganho'
  | 'gasto';

export interface IEventoDiario {
  /** Chave estável (tipo:id). É por ela que a ficha guarda fixar e comentar. */
  chave: string;
  tipo: TipoEventoDiario;
  quando: string;
  texto: string;
  sessao_id?: string | null;
  titulo?: string;
  raridade?: 'comum' | 'rara' | 'lendaria';
}

export interface IMarcaDiario {
  fixado?: boolean;
  comentario?: string;
}

// O servidor monta a linha do tempo a partir do que ele mesmo registrou; o
// cliente só a exibe e guarda as marcas do jogador na ficha.
export const diarioApi = {
  obter(personagemId: string) {
    return api<{ eventos: IEventoDiario[]; total: number }>(
      `/personagens/${encodeURIComponent(personagemId)}/diario`,
    );
  },
};
