import { MUNDO_CATALOG } from './mundoCatalog';

/**
 * As 10 Árvores do jogo. O `id` é o mesmo id da Deidade padroeira em
 * `mundoCatalog.ts` (ex.: "aethel", "erebus") - é esse esquema que
 * `data/ficha/racas.json`/`classes.json` já usam nos campos `arvore`/
 * `arvores`, então reaproveitá-lo evita mais um mapeamento de ids.
 * Ver legacy-vanilla/src/mundo/config/arvores.js para a fonte original.
 */
export interface ArvoreEntry {
  id: string;
  nome: string;
  deidadeTitulo: string;
  cor: string;
}

export const ARVORES: ArvoreEntry[] = [
  { id: 'aethel', nome: 'Gênese', deidadeTitulo: 'Aethel', cor: 'from-green-500/20 to-emerald-500/5' },
  { id: 'ousias', nome: 'Alétheia', deidadeTitulo: 'Ousias', cor: 'from-blue-500/20 to-cyan-500/5' },
  { id: 'keryx', nome: 'A.X.I.S', deidadeTitulo: 'A.X.I.S', cor: 'from-slate-500/20 to-zinc-500/5' },
  { id: 'haemus', nome: 'Anima', deidadeTitulo: 'Haemus', cor: 'from-pink-500/20 to-rose-400/5' },
  { id: 'ignis', nome: 'Vórtice', deidadeTitulo: 'Ignis', cor: 'from-orange-500/20 to-red-500/5' },
  { id: 'moros', nome: 'Baluarte', deidadeTitulo: 'Moros', cor: 'from-stone-500/20 to-neutral-400/5' },
  { id: 'aperion', nome: 'Matriz', deidadeTitulo: 'Aperion', cor: 'from-indigo-500/20 to-violet-500/5' },
  { id: 'chronus', nome: 'Éon', deidadeTitulo: 'Chronus', cor: 'from-amber-500/20 to-yellow-500/5' },
  { id: 'erebus', nome: 'Abismo', deidadeTitulo: 'Erebus', cor: 'from-red-500/20 to-rose-500/5' },
  { id: 'mulher-carmesim', nome: 'Limiar', deidadeTitulo: 'Mulher Carmesim', cor: 'from-purple-500/20 to-fuchsia-500/5' },
];

export interface CampanhaVisibilidadeConfig {
  arvores_oculto?: string[];
  arvores_revelado?: string[];
  racas_liberadas?: string[];
  classes_liberadas?: string[];
  [key: string]: any;
}

/** Se a Árvore nasce visível por padrão - deriva do `revelado` da própria
 * Deidade padroeira em MUNDO_CATALOG (hoje só A.X.I.S/keryx começa trancada),
 * pra não duplicar essa informação em dois lugares. */
export function arvoreInicialmenteRevelada(arvoreId: string): boolean {
  const deidade = MUNDO_CATALOG.find((e) => e.id === arvoreId && e.tipo === 'deidade');
  return deidade?.revelado !== false;
}

export function arvoreVisivel(arvoreId: string, config: CampanhaVisibilidadeConfig, isMestre: boolean): boolean {
  if (isMestre) return true;
  const oculto = config.arvores_oculto || [];
  const revelado = config.arvores_revelado || [];
  if (arvoreInicialmenteRevelada(arvoreId)) return !oculto.includes(arvoreId);
  return revelado.includes(arvoreId);
}

interface FiltravelPorArvore {
  id: string;
  arvore?: string | null;
  arvores?: string[];
  disponibilidade?: string;
  categoria?: string;
  indisponivel?: boolean;
}

/** Réplica de `filtrarCatalogoPorArvore` (legacy-vanilla/src/ficha/views/
 * wizard/selecaoCatalogo.js), nunca portada pro wizard React: uma raça/
 * classe cabe numa Árvore se for de disponibilidade geral, ou se a Árvore
 * escolhida bater com `arvore` (singular) ou estiver em `arvores` (lista). */
export function filtrarPorArvore<T extends FiltravelPorArvore>(lista: T[], arvoreId: string | null): T[] {
  if (!arvoreId) return lista;
  return lista.filter((item) => (
    item.disponibilidade === 'geral'
    || item.arvore === arvoreId
    || (Array.isArray(item.arvores) && item.arvores.includes(arvoreId))
  ));
}

/** Raças/classes "esquecidas" (categoria especial) só entram na lista de
 * escolha se o mestre liberou explicitamente pra campanha - e nunca se
 * estiverem marcadas `indisponivel` (conteúdo ainda não pronto pro jogo). */
export function filtrarPorLiberacao<T extends FiltravelPorArvore>(lista: T[], liberados: string[]): T[] {
  return lista.filter((item) => !item.indisponivel && (item.categoria !== 'esquecida' || liberados.includes(item.id)));
}
