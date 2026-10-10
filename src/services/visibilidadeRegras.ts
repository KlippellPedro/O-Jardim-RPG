/** O que cada pessoa vê no Livro: raças e classes "esquecidas" só aparecem depois que o Mestre as libera
 * (para a mesa toda ou só para um membro), e as marcadas como indisponíveis só o Mestre enxerga.
 *
 * Fica num módulo comum porque a página do Livro e a busca do Jardim precisam responder igual. */

interface ItemDoLivro {
  id: string;
  indisponivel?: boolean;
  categoria?: string;
}

export interface ConfigDeLiberacoes {
  racas_liberadas?: string[];
  racas_liberadas_membros?: Record<string, string[]>;
  classes_liberadas?: string[];
  classes_liberadas_membros?: Record<string, string[]>;
}

export interface LiberacoesDoMembro {
  racas: ReadonlySet<string>;
  classes: ReadonlySet<string>;
}

export function liberacoesDoMembro(config: ConfigDeLiberacoes | undefined, usuarioId: string | undefined): LiberacoesDoMembro {
  const configuracao = config ?? {};
  return {
    racas: new Set([
      ...(configuracao.racas_liberadas ?? []),
      ...((usuarioId && configuracao.racas_liberadas_membros?.[usuarioId]) ?? []),
    ]),
    classes: new Set([
      ...(configuracao.classes_liberadas ?? []),
      ...((usuarioId && configuracao.classes_liberadas_membros?.[usuarioId]) ?? []),
    ]),
  };
}

export function racasVisiveis<T extends ItemDoLivro>(racas: readonly T[], isMestre: boolean, liberadas: ReadonlySet<string>): T[] {
  if (isMestre) return [...racas];
  // A Entidade aparece para todos: ela existe no Livro, só não é jogável (nasce de um conto).
  return racas.filter((raca) => raca.id === 'entidade'
    || (!raca.indisponivel && (raca.categoria !== 'esquecida' || liberadas.has(raca.id))));
}

export function classesVisiveis<T extends ItemDoLivro>(classes: readonly T[], isMestre: boolean, liberadas: ReadonlySet<string>): T[] {
  if (isMestre) return [...classes];
  return classes.filter((classe) => !classe.indisponivel && (classe.categoria !== 'esquecida' || liberadas.has(classe.id)));
}
