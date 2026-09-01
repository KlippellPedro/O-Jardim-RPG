import { useAuthStore } from '../store/useAuthStore';

/**
 * Centraliza a distinção entre cargo global de plataforma (criador/admin) e
 * papel dentro da campanha ativa (mestre/assistente). Antes disso, a mesma
 * checagem `usuario.papel_plataforma === 'criador' || campanhaAtiva.papel === 'mestre'`
 * estava duplicada em cada página que precisava saber quem pode editar conteúdo -
 * o que tornava fácil esquecer de atualizar um lugar quando a regra mudasse.
 */
export function usePermissoes() {
  const usuario = useAuthStore((state) => state.usuario);
  const campanhaAtiva = useAuthStore((state) => state.campanhaAtiva);

  const isCreator = usuario?.papel_plataforma === 'criador';
  const isPlatformAdmin = isCreator || usuario?.papel_plataforma === 'admin';
  const isCampaignManager = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const isCampaignMaster = campanhaAtiva?.papel === 'mestre';

  return {
    isCreator,
    isPlatformAdmin,
    isCampaignManager,
    isCampaignMaster,
    /** Editar lore/regras/entidades/loja/visibilidade: exclusivo do criador da
     * plataforma, independente de papel na campanha ativa. */
    podeEditarConteudo: isCreator,
  };
}
