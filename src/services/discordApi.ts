import { api } from './apiClient';

export interface IDiscordVinculo {
  discord_user_id: string;
  discord_nome: string | null;
  vinculado_em: string;
}

export const discordApi = {
  obterVinculo() {
    return api<{ vinculo: IDiscordVinculo | null }>('/discord');
  },
  gerarCodigo() {
    return api<{ codigo: string; expira_em: string; instrucao: string }>('/discord/codigo', { method: 'POST' });
  },
  desvincular() {
    return api('/discord', { method: 'DELETE' });
  },
};
