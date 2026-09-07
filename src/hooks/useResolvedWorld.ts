import { useEffect, useState } from 'react';
import type { LoreEntry } from '../../data/gerado/mundoCatalog';
import type { FaccaoDocumentada } from '../../data/regras/faccoes';
import type { EntidadeCatalogo } from '../../data/mundo/entidades';
import type { WorldChronicleCatalog } from '../pages/Mundo/worldChronicles';
import { conteudoEditorialApi } from '../services/conteudoEditorialApi';
import { useAuthStore } from '../store/useAuthStore';

export const EMPTY_CHRONICLES: WorldChronicleCatalog = {
  versao: 1, status: '', introducao: { titulo: '', subtitulo: '', descricao: '' },
  linha_tempo_geral: [], arvores: [],
};
const EMPTY: { catalog: LoreEntry[]; entities: EntidadeCatalogo[]; factions: FaccaoDocumentada[]; chronicles: WorldChronicleCatalog } = {
  catalog: [], entities: [], factions: [], chronicles: EMPTY_CHRONICLES,
};

/** Sem fallback de lore local: falha, troca de campanha ou logout ocultam os dados. */
export function useResolvedWorld(campaignId?: string) {
  const user = useAuthStore(state => state.usuario);
  const campaign = useAuthStore(state => state.campanhaAtiva);
  const id = campaignId ?? campaign?.id;
  const key = JSON.stringify([user?.id, user?.papel_plataforma, id, campaign?.papel, campaign?.configuracoes]);
  const [state, setState] = useState<{ key: string; data: typeof EMPTY; error: string | null } | null>(null);
  useEffect(() => {
    if (!user || !id) return;
    const controller = new AbortController();
    conteudoEditorialApi.carregarMundoResolvido(id, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(response.entradas)) throw new Error('Resposta de Mundo inválida.');
      const entries = response.entradas;
      const chronology = entries.find(entry => entry.tipo === 'cronologia')?.conteudo;
      setState({ key, error: null, data: {
        catalog: entries.filter(entry => entry.tipo !== 'cronologia' && entry.tipo !== 'entidade' && entry.tipo !== 'faccao') as unknown as LoreEntry[],
        entities: entries.filter(entry => entry.tipo === 'entidade').map(entry => entry.conteudo) as unknown as EntidadeCatalogo[],
        factions: entries.filter(entry => entry.tipo === 'faccao').map(entry => entry.conteudo) as unknown as FaccaoDocumentada[],
        chronicles: chronology && Array.isArray(chronology.arvores) && Array.isArray(chronology.linha_tempo_geral)
          ? chronology as unknown as WorldChronicleCatalog : EMPTY_CHRONICLES,
      } });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, data: EMPTY, error: error?.message || 'Não foi possível carregar o Mundo.' });
    });
    return () => controller.abort();
  }, [key, id, Boolean(user)]);
  const current = user && id && state?.key === key ? state : null;
  return { ...(current?.data ?? EMPTY), loading: Boolean(user && id && !current), error: current?.error ?? null };
}
