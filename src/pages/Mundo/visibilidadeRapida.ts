import { campanhasApi } from '../../services/campanhasApi';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Visibilidade de uma entrada do Mundo, sem passar pelo Painel do Criador. A regra é a da campanha ativa:
 * a entrada nasce visível (`revelado !== false`) e a lista `lore_oculto` a esconde, ou nasce escondida e a
 * lista `lore_revelado` a libera. As duas listas são a mesma que a aba Visibilidade do Criador edita.
 */

export interface IEntradaDeLore {
  id: string;
  revelado?: boolean;
}

export interface IListasDeLore {
  lore_revelado: string[];
  lore_oculto: string[];
}

const lista = (valor: unknown): string[] => (
  Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []
);

/** Os jogadores leem esta entrada? Vale só para ela: o que está pendurado numa entrada retida fica retido junto (worldCodex). */
export function loreVisivelParaJogadores(entrada: IEntradaDeLore, config: Record<string, unknown> | null | undefined): boolean {
  const oculto = lista(config?.lore_oculto);
  const revelado = lista(config?.lore_revelado);
  return entrada.revelado !== false ? !oculto.includes(entrada.id) : revelado.includes(entrada.id);
}

/** As duas listas inteiras, já com a entrada visível ou retida. Só a lista que importa para o tipo da entrada muda. */
export function listasDeLoreComVisibilidade(
  config: Record<string, unknown> | null | undefined,
  entrada: IEntradaDeLore,
  visivel: boolean,
): IListasDeLore {
  const revelado = lista(config?.lore_revelado);
  const oculto = lista(config?.lore_oculto);
  const sem = (itens: string[]) => itens.filter((id) => id !== entrada.id);
  if (entrada.revelado !== false) {
    return { lore_revelado: revelado, lore_oculto: visivel ? sem(oculto) : [...sem(oculto), entrada.id] };
  }
  return { lore_oculto: oculto, lore_revelado: visivel ? [...sem(revelado), entrada.id] : sem(revelado) };
}

// Duas trocas seguidas esperam uma a outra: cada uma parte da configuração que a anterior acabou de gravar.
let fila: Promise<unknown> = Promise.resolve();

/** Grava a visibilidade de uma entrada na campanha ativa e atualiza a configuração que o site já tem na mão. */
export function salvarVisibilidadeDeLore(entrada: IEntradaDeLore, visivel: boolean): Promise<void> {
  const tarefa = fila.then(async () => {
    const campanha = useAuthStore.getState().campanhaAtiva;
    if (!campanha) throw new Error('Escolha uma campanha primeiro.');
    const listas = listasDeLoreComVisibilidade(campanha.configuracoes, entrada, visivel);
    await campanhasApi.atualizarVisibilidade(campanha.id, { ...listas }, { mesclar: true });
    const atual = useAuthStore.getState().campanhaAtiva;
    // Trocou de campanha enquanto gravava: a configuração dela não é esta.
    if (atual?.id !== campanha.id) return;
    useAuthStore.setState({ campanhaAtiva: { ...atual, configuracoes: { ...(atual.configuracoes ?? {}), ...listas } } });
  });
  fila = tarefa.catch(() => undefined);
  return tarefa;
}
