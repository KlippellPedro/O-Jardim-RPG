import { useState, useEffect, useCallback } from 'react';
import { cofreApi, ICofreItem, ICofreMoeda, ICofreNivel } from '../services/cofreApi';
import { discordApi, IDiscordVinculo } from '../services/discordApi';
import { personagensApi, PersonagemApiRecord } from '../services/personagensApi';

/** Estado e ações do Cofre de Recompensas, compartilhado entre o painel
 * rápido (Configurações) e a página dedicada. */
export function useCofre(campanhaId: string | undefined) {
  const [itens, setItens] = useState<ICofreItem[]>([]);
  const [moedas, setMoedas] = useState<ICofreMoeda[]>([]);
  const [vinculo, setVinculo] = useState<IDiscordVinculo | null>(null);
  const [personagens, setPersonagens] = useState<PersonagemApiRecord[]>([]);
  const [nivel, setNivel] = useState<ICofreNivel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG-FIX (histórico): o cofre é lido de /cofre (por campanha) e o vínculo
  // Discord de /discord (por conta) - são dois endpoints separados.
  const fetchTudo = useCallback(async () => {
    if (!campanhaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [cofre, discord, chars, statusNivel] = await Promise.all([
        cofreApi.obter(campanhaId),
        discordApi.obterVinculo(),
        personagensApi.listar(campanhaId),
        cofreApi.nivel(campanhaId).catch(() => null),
      ]);
      setItens(cofre.itens || []);
      setMoedas(cofre.moedas || []);
      setVinculo(discord.vinculo);
      setPersonagens(chars.personagens || []);
      setNivel(statusNivel);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Erro ao carregar o cofre');
    } finally {
      setIsLoading(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    fetchTudo();
  }, [fetchTudo]);

  const transferirItem = useCallback(
    async (personagemId: string, itemId: string, quantidade: number) => {
      if (!campanhaId) throw new Error('Nenhuma campanha selecionada.');
      await cofreApi.transferirItem(campanhaId, personagemId, itemId, quantidade);
      await fetchTudo();
    },
    [campanhaId, fetchTudo],
  );

  const transferirMoeda = useCallback(
    async (personagemId: string, moeda: string, quantidade: number) => {
      if (!campanhaId) throw new Error('Nenhuma campanha selecionada.');
      await cofreApi.transferirMoeda(campanhaId, personagemId, moeda, quantidade);
      await fetchTudo();
    },
    [campanhaId, fetchTudo],
  );

  const sacarDoBanco = useCallback(
    async (personagemId: string, moeda: string, quantidade: number) => {
      if (!campanhaId) throw new Error('Nenhuma campanha selecionada.');
      await cofreApi.sacarDoBanco(campanhaId, personagemId, moeda, quantidade);
      await fetchTudo();
    },
    [campanhaId, fetchTudo],
  );

  const desvincularDiscord = useCallback(async () => {
    await discordApi.desvincular();
    setVinculo(null);
  }, []);

  return {
    itens,
    moedas,
    vinculo,
    personagens,
    nivel,
    isLoading,
    error,
    fetchTudo,
    transferirItem,
    transferirMoeda,
    sacarDoBanco,
    desvincularDiscord,
  };
}
