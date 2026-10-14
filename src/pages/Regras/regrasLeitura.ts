/** Estado de leitura do Livro de Regras: onde a pessoa parou e como ela gosta de ler.
 *
 * Tudo mora no navegador (localStorage), por conta, e nada disso é informação da campanha: serve só
 * para "continuar de onde parou" e para lembrar tamanho e tipo da letra. Cada leitura é defensiva,
 * porque o armazenamento pode estar bloqueado, cheio ou com lixo de uma versão antiga. */

export const CHAVE_DA_LEITURA = 'jardim:regras:leitura:v1';
export const CHAVE_DAS_PREFERENCIAS = 'jardim:regras:preferencias:v1';

export interface LeituraSalva {
  topico: string;
  /** De 0 a 1: quanto do tópico já passou pela tela. */
  progresso: number;
  /** Momento do último registro, em milissegundos. */
  em: number;
}

export type FonteDoLeitor = 'serifa' | 'sem';
export type TamanhoDoLeitor = 1 | 2 | 3 | 4;

export interface PreferenciasDeLeitura {
  tamanho: TamanhoDoLeitor;
  fonte: FonteDoLeitor;
}

export const PREFERENCIAS_PADRAO: PreferenciasDeLeitura = { tamanho: 2, fonte: 'serifa' };

/** Abaixo disto a pessoa só abriu o tópico; acima de 97% ela chegou ao fim. Nos dois casos não vale "continuar". */
export const PROGRESSO_MINIMO_PARA_CONTINUAR = 0.04;
export const PROGRESSO_DE_FIM = 0.97;

export const chaveDaConta = (base: string, idDoUsuario?: string | null) => `${base}:${idDoUsuario || 'local'}`;

const ehNumeroFinito = (valor: unknown): valor is number => typeof valor === 'number' && Number.isFinite(valor);

export function lerLeituraSalva(bruto: string | null, topicosValidos: ReadonlySet<string>): LeituraSalva | null {
  if (!bruto) return null;
  try {
    const dado = JSON.parse(bruto) as Partial<LeituraSalva> | null;
    if (!dado || typeof dado.topico !== 'string' || !topicosValidos.has(dado.topico)) return null;
    if (!ehNumeroFinito(dado.progresso) || !ehNumeroFinito(dado.em)) return null;
    return { topico: dado.topico, progresso: Math.min(1, Math.max(0, dado.progresso)), em: dado.em };
  } catch {
    return null;
  }
}

export function serializarLeitura(leitura: LeituraSalva): string {
  return JSON.stringify({
    topico: leitura.topico,
    progresso: Math.round(Math.min(1, Math.max(0, leitura.progresso)) * 1000) / 1000,
    em: Math.trunc(leitura.em),
  });
}

/** Só vale "continuar" quando a pessoa passou do começo e ainda não chegou ao fim. */
export function leituraPedeContinuar(leitura: LeituraSalva | null): leitura is LeituraSalva {
  return Boolean(leitura && leitura.progresso >= PROGRESSO_MINIMO_PARA_CONTINUAR && leitura.progresso < PROGRESSO_DE_FIM);
}

export function lerPreferencias(bruto: string | null): PreferenciasDeLeitura {
  if (!bruto) return PREFERENCIAS_PADRAO;
  try {
    const dado = JSON.parse(bruto) as Partial<PreferenciasDeLeitura> | null;
    const tamanho = dado?.tamanho;
    const fonte = dado?.fonte;
    return {
      tamanho: tamanho === 1 || tamanho === 2 || tamanho === 3 || tamanho === 4 ? tamanho : PREFERENCIAS_PADRAO.tamanho,
      fonte: fonte === 'serifa' || fonte === 'sem' ? fonte : PREFERENCIAS_PADRAO.fonte,
    };
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export function serializarPreferencias(preferencias: PreferenciasDeLeitura): string {
  return JSON.stringify({ tamanho: preferencias.tamanho, fonte: preferencias.fonte });
}

/** Progresso de rolagem de um elemento: 0 no topo, 1 no fim. Conteúdo que cabe inteiro na tela conta como 0. */
export function progressoDeRolagem(rolado: number, alturaTotal: number, alturaVisivel: number): number {
  const maximo = alturaTotal - alturaVisivel;
  if (!(maximo > 1)) return 0;
  return Math.min(1, Math.max(0, rolado / maximo));
}
