import { MUNDO_CATALOG } from '../gerado/mundoCatalog';

/**
 * As 9 Árvores do jogo, mais Abismo/"erebus" - que na lore NÃO é uma Árvore
 * (é o Vazio, o espaço entre as Árvores; ver data/mundo/Abismo/abismo.json e
 * "O Vazio entre as Árvores" em data/regras/regras.ts), mas continua nesta
 * lista porque mecanicamente um personagem ainda pode se originar dele -
 * raças/classes com `arvore`/`arvores` incluindo "erebus" continuam válidas,
 * e a ficha ainda precisa de uma entrada pra exibir "Abismo" como origem.
 * O `id` é o mesmo id da Deidade padroeira em `mundoCatalog.ts`
 * (ex.: "aethel", "erebus") - é esse esquema que `data/ficha/racas.json`/
 * `classes.json` já usam nos campos `arvore`/`arvores`, então reaproveitá-lo
 * evita mais um mapeamento de ids.
 * Este é o catálogo ativo e canônico da interface React.
 */
export interface ArvoreEntry {
  id: string;
  nome: string;
  deidadeTitulo: string;
  /** Gradiente Tailwind, derivado de `rgb`. */
  cor: string;
  /** Cor canônica da Árvore, no formato "r,g,b" - a mesma de
   * bots/jornalista/core/arvores.py,
   * que por sua vez seguem a tabela de referência "Estrutura do Jardim". */
  rgb: string;
  /** Só para Parley/A.X.I.S: a identidade original, por baixo da dominante.
   * Espelha `tituloSubjugada`/`rgbSubjugada` do arvores.js legacy, usados no
   * efeito de glitch do rótulo 3D. */
  subjugada?: { nome: string; deidade: string; rgb: string };
}

/**
 * As cores abaixo são a paleta CANÔNICA (tabela "Estrutura do Jardim"):
 * Gênese rosa, Alétheia amarelo, A.X.I.S azul-neon, Anima verde, Vórtice
 * laranja, Baluarte marrom, Matriz roxo, Éon dourado envelhecido, Abismo
 * preto, Limiar vermelho vinho. Antes deste arquivo divergir, existiam
 * QUATRO paletas diferentes no projeto para as mesmas Árvores.
 */
export const ARVORES: ArvoreEntry[] = [
  { id: 'aethel', nome: 'Gênese', deidadeTitulo: 'Aethel', rgb: '214,120,156', cor: 'from-pink-400/20 to-rose-300/5' },
  { id: 'ousias', nome: 'Alétheia', deidadeTitulo: 'Ousias', rgb: '222,198,88', cor: 'from-yellow-400/20 to-amber-300/5' },
  {
    id: 'keryx', nome: 'A.X.I.S', deidadeTitulo: 'A.X.I.S',
    rgb: '53,216,236', cor: 'from-cyan-400/20 to-sky-300/5',
    // Fisicamente é uma Árvore só, com duas identidades sobrepostas: a A.X.I.S
    // de Jota Macedo por cima, e a Parley de Keryx - fraca, presa - por baixo.
    subjugada: { nome: 'Parley', deidade: 'Keryx', rgb: '192,198,206' },
  },
  { id: 'haemus', nome: 'Anima', deidadeTitulo: 'Haemus', rgb: '86,172,92', cor: 'from-green-500/20 to-emerald-400/5' },
  { id: 'ignis', nome: 'Vórtice', deidadeTitulo: 'Ignis', rgb: '222,114,42', cor: 'from-orange-500/20 to-amber-500/5' },
  { id: 'moros', nome: 'Baluarte', deidadeTitulo: 'Moros', rgb: '116,82,52', cor: 'from-amber-800/25 to-stone-600/5' },
  { id: 'aperion', nome: 'Matriz', deidadeTitulo: 'Aperion', rgb: '132,84,188', cor: 'from-purple-500/20 to-violet-400/5' },
  { id: 'chronus', nome: 'Éon', deidadeTitulo: 'Chronus', rgb: '168,138,72', cor: 'from-yellow-700/25 to-amber-600/5' },
  { id: 'erebus', nome: 'Abismo', deidadeTitulo: 'Erebus', rgb: '34,30,40', cor: 'from-zinc-800/40 to-neutral-900/10' },
  { id: 'mulher-carmesim', nome: 'Limiar', deidadeTitulo: 'Mulher Carmesim', rgb: '134,28,48', cor: 'from-red-900/30 to-rose-800/5' },
  { id: 'universal', nome: 'Universal', deidadeTitulo: 'Universal', rgb: '201,196,214', cor: 'from-gray-400/20 to-slate-300/5' },
];

/** Retorna a cor canônica de uma Árvore como "r,g,b". */
export function corDaArvore(arvoreId: string): string {
  return ARVORES.find((a) => a.id === arvoreId)?.rgb || '160,160,170';
}

/** Sentinela pra "Sem Árvore": não é uma das Árvores reais (não entra em
 * `ARVORES`), é usada quando a Árvore do jogador não quer ser revelada ainda.
 * Um personagem sem Árvore tem acesso a todas as raças e classes disponíveis. */
export const SEM_ARVORE_ID = 'sem-arvore';

export interface CampanhaVisibilidadeConfig {
  arvores_oculto?: string[];
  arvores_revelado?: string[];
  racas_liberadas?: string[];
  classes_liberadas?: string[];
  /** Liberação por jogador: além do que `racas_liberadas`/`classes_liberadas`
   * libera pra campanha inteira, cada usuário pode ter sua própria lista -
   * pra recompensas individuais ("só fulano pode ser Vampiro"). Chave é o
   * `usuario.id`. */
  racas_liberadas_membros?: Record<string, string[]>;
  classes_liberadas_membros?: Record<string, string[]>;
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
  if (arvoreId === 'universal') return isMestre;
  if (isMestre) return true;
  const oculto = config.arvores_oculto || [];
  const revelado = config.arvores_revelado || [];
  if (arvoreInicialmenteRevelada(arvoreId)) return !oculto.includes(arvoreId);
  return revelado.includes(arvoreId);
}

/**
 * Mantém a Árvore já escolhida disponível para exibição na ficha, mesmo que
 * ela ainda esteja oculta no Códice da campanha. Isso evita mostrar o id
 * interno da Deidade, como "erebus", no lugar do nome "Abismo".
 */
export function arvoresVisiveisComAtual(
  visiveis: ArvoreEntry[],
  arvoreIdAtual?: string | null,
): ArvoreEntry[] {
  if (!arvoreIdAtual || visiveis.some((arvore) => arvore.id === arvoreIdAtual)) return visiveis;
  const atual = ARVORES.find((arvore) => arvore.id === arvoreIdAtual);
  return atual ? [...visiveis, atual] : visiveis;
}

interface FiltravelPorArvore {
  id: string;
  arvore?: string | null;
  arvores?: string[];
  disponibilidade?: string;
  categoria?: string;
  indisponivel?: boolean;
}

/** Filtra o catálogo por afinidade: uma raça/
 * classe cabe numa Árvore se for de disponibilidade geral, ou se a Árvore
 * escolhida bater com `arvore` (singular) ou estiver em `arvores` (lista).
 *
 * `arvoreId` vazio/nulo é o estado transitório "ainda não escolheu" (mostra
 * tudo, sem filtrar) - assim como `SEM_ARVORE_ID`, que é usado para ocultar a
 * árvore verdadeira de um jogador e, por isso, libera todas as opções para não
 * restringi-lo. `'universal'` recebe o mesmo tratamento: é a Árvore especial
 * de personagens com acesso a tudo (espelha `_compativel_com_arvore` em
 * plataforma/core/character_summary.py, que já bypassa a checagem pra ambos). */
export function filtrarPorArvore<T extends FiltravelPorArvore>(lista: T[], arvoreId: string | null): T[] {
  if (!arvoreId || arvoreId === SEM_ARVORE_ID || arvoreId === 'universal') return lista;
  return lista.filter((item) => (
    item.disponibilidade === 'geral'
    || item.arvore === arvoreId
    || (Array.isArray(item.arvores) && item.arvores.includes(arvoreId))
  ));
}

/** Raças/classes "esquecidas" (categoria especial) só entram na lista de
 * escolha se o mestre liberou explicitamente pra campanha (pra todo mundo,
 * `liberadosCampanha`) ou pra esse jogador em particular (`liberadosJogador`)
 * - e nunca se estiverem marcadas `indisponivel` (conteúdo ainda não pronto
 * pro jogo, independente de liberação). */
export function filtrarPorLiberacao<T extends FiltravelPorArvore>(
  lista: T[],
  liberadosCampanha: string[],
  liberadosJogador: string[] = [],
): T[] {
  return lista.filter((item) => (
    !item.indisponivel
    && (item.categoria !== 'esquecida' || liberadosCampanha.includes(item.id) || liberadosJogador.includes(item.id))
  ));
}
