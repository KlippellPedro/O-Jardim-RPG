import { api } from './apiClient';

/** A edição do jogador é para qualquer conta; a do Mestre só aparece para quem conduz a mesa. */
export type EdicaoDoLivro = 'jogador' | 'mestre';

/** Onde algo começa no PDF. `numero` é "3.4" para um tópico e 3 para um capítulo. */
export interface IPosicaoNoPdf {
  id: string;
  /** Nas partes do Compêndio não há número: vale o `rotulo` ("Compêndio A"). */
  numero: string | number | null;
  rotulo?: string;
  pagina: number;
}

export interface IEdicaoDoLivro {
  edicao: EdicaoDoLivro;
  titulo: string;
  /** Ausente quando o gerador não escreveu o manifesto. */
  paginas: number | null;
  bytes: number;
  /** Data e hora em que o PDF foi montado (ISO 8601). */
  gerado_em: string | null;
  topicos: IPosicaoNoPdf[];
  capitulos: IPosicaoNoPdf[];
}

export const livroApi = {
  /** As edições que esta conta pode baixar. Passar a campanha ativa libera a do Mestre a quem conduz a mesa. */
  edicoes: (campanhaId?: string | null) => api<{ edicoes: IEdicaoDoLivro[] }>(
    `/livro${campanhaId ? `?campanha_id=${encodeURIComponent(campanhaId)}` : ''}`,
  ),
};

interface OpcoesDaUrl {
  /** O navegador salva o arquivo em vez de abrir. */
  baixar?: boolean;
  campanhaId?: string | null;
  /** Abre o PDF já nesta página (os leitores de PDF dos navegadores entendem `#page=`). */
  pagina?: number | null;
}

/** Endereço do PDF. Fica na própria origem, com o login da pessoa. */
export function urlDoPdf(edicao: EdicaoDoLivro, { baixar = false, campanhaId, pagina }: OpcoesDaUrl = {}): string {
  const consulta = new URLSearchParams();
  if (baixar) consulta.set('baixar', 'true');
  if (campanhaId) consulta.set('campanha_id', campanhaId);
  const texto = consulta.toString();
  const base = `/api/v1/livro/pdf/${edicao}${texto ? `?${texto}` : ''}`;
  return pagina && pagina > 0 ? `${base}#page=${Math.trunc(pagina)}` : base;
}

/** "5,3 MB", "812 KB". */
export function formatarTamanhoDoArquivo(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}

/** "13 de outubro de 2026", ou '' quando a data não veio ou não faz sentido. */
export function formatarDataDaEdicao(iso: string | null | undefined): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** A página do PDF em que um tópico começa, se a edição souber. */
export function paginaDoTopico(edicao: IEdicaoDoLivro | undefined, idDoTopico: string): number | null {
  return edicao?.topicos.find((item) => item.id === idDoTopico)?.pagina ?? null;
}
