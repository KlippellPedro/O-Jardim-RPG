/** Há mesa ao vivo agora? O menu, a Home e o aviso "a sessão começou" respondem a isto.
 *
 * O servidor só diz o necessário (`GET /sessao/campanha/{id}/situacao`): a preparação é privada do
 * Mestre, então para os outros ela chega como "nenhuma". O estado completo da cena continua na
 * página da Sessão. */

export type SituacaoDaMesa = 'nenhuma' | 'preparacao' | 'aberta';

export interface EstadoDaMesa {
  situacao: SituacaoDaMesa;
  titulo: string | null;
  /** Quando a mesa abriu para todos (só existe com a mesa aberta). */
  iniciadaEm: string | null;
}

export const SEM_MESA: EstadoDaMesa = { situacao: 'nenhuma', titulo: null, iniciadaEm: null };

/** Os eventos do canal ao vivo que mudam esta resposta. Os de cena (turno, vida, rolagem) não mexem nela. */
export const EVENTOS_DA_MESA: readonly string[] = ['sessao_preparada', 'sessao_aberta', 'sessao_encerrada'];

const SITUACOES: readonly SituacaoDaMesa[] = ['nenhuma', 'preparacao', 'aberta'];

/** Lê a resposta do servidor sem confiar nela: qualquer coisa estranha vira "nenhuma mesa". */
export function lerSituacaoDaMesa(resposta: unknown): EstadoDaMesa {
  if (!resposta || typeof resposta !== 'object') return SEM_MESA;
  const bruto = resposta as { situacao?: unknown; titulo?: unknown; iniciada_em?: unknown };
  const situacao = SITUACOES.find((item) => item === bruto.situacao);
  if (!situacao || situacao === 'nenhuma') return SEM_MESA;
  const titulo = typeof bruto.titulo === 'string' && bruto.titulo.trim() ? bruto.titulo.trim() : null;
  const iniciadaEm = situacao === 'aberta' && typeof bruto.iniciada_em === 'string' ? bruto.iniciada_em : null;
  return { situacao, titulo, iniciadaEm };
}

/** A mesa acabou de abrir para todos? A primeira leitura (`antes` nulo) nunca conta: quem chega com a mesa
 * já aberta não precisa de aviso, só do indicador. */
export function mesaAcabouDeAbrir(antes: EstadoDaMesa | null, depois: EstadoDaMesa): boolean {
  return antes !== null && antes.situacao !== 'aberta' && depois.situacao === 'aberta';
}

/** "agora há pouco", "há 12 min", "há 1 h 05 min": só para o cartão da Home. */
export function textoDeInicio(iniciadaEm: string | null, agora: number = Date.now()): string {
  if (!iniciadaEm) return '';
  const inicio = Date.parse(iniciadaEm);
  if (!Number.isFinite(inicio)) return '';
  const minutos = Math.max(0, Math.floor((agora - inicio) / 60000));
  if (minutos < 1) return 'começou agora há pouco';
  if (minutos < 60) return `começou há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `começou há ${horas} h${resto ? ` ${String(resto).padStart(2, '0')} min` : ''}`;
}

/** O nome que o leitor de tela e o tooltip usam no item "Sessão" do menu. */
export function rotuloDoMenuSessao(situacao: SituacaoDaMesa): string {
  if (situacao === 'aberta') return 'Sessão, ao vivo agora';
  if (situacao === 'preparacao') return 'Sessão, em preparação';
  return 'Sessão';
}
