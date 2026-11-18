// Quadro de procurados da Loja (aba Caçadores). Regras no servidor:
// plataforma/core/procurados.py e plataforma/routers/procurados.py.

import { api } from './apiClient';

export type CondicaoProcurado = 'vivo' | 'morto' | 'vivo-ou-morto';
export type AmeacaProcurado = 'baixa' | 'media' | 'alta' | 'extrema' | 'desconhecida';
export type StatusProcurado = 'aberto' | 'capturado' | 'abatido' | 'cancelado';
export type DesfechoProcurado = Exclude<StatusProcurado, 'aberto'>;

export interface IImagemProcurado {
  id: string;
  /** Pedaço do acervo com a imagem inteira (ver core/acervo.py, chave_do_retrato). */
  chave: string;
  largura: number;
  altura: number;
}

export interface ICacadorProcurado {
  personagem_id: string;
  nome: string;
  /** O personagem é de quem está vendo. */
  meu: boolean;
}

export interface IPagamentoProcurado {
  moeda: string;
  total: number;
  em: string | null;
  personagens: Array<{ id: string; nome: string; valor: number }>;
}

export interface IProcurado {
  id: string;
  nome: string;
  especie: string;
  descricao: string;
  local: string;
  condicao: CondicaoProcurado;
  ameaca: AmeacaProcurado;
  vd: number | null;
  recompensa_valor: number;
  recompensa_moeda: string;
  imagem: IImagemProcurado | null;
  /** 0 mostra o topo da imagem, 100 a base. */
  imagem_foco: number;
  status: StatusProcurado;
  publicado: boolean;
  publicado_em: string | null;
  atualizado_em: string | null;
  cacadores: ICacadorProcurado[];
  pagamento: IPagamentoProcurado | null;
  /** Só chegam para quem comanda a mesa. */
  notas_mestre?: string;
  imagem_id?: string | null;
}

export interface DadosProcurado {
  nome?: string;
  especie?: string;
  descricao?: string;
  local?: string;
  condicao?: CondicaoProcurado;
  ameaca?: AmeacaProcurado;
  vd?: number | null;
  recompensa_valor?: number;
  recompensa_moeda?: string;
  imagem_id?: string | null;
  imagem_foco?: number;
  status?: StatusProcurado;
  publicado?: boolean;
  notas_mestre?: string;
}

const base = (campanhaId: string) => `/campanhas/${encodeURIComponent(campanhaId)}/procurados`;

export const procuradosApi = {
  listar: (campanhaId: string, signal?: AbortSignal) =>
    api<{ procurados: IProcurado[]; gestor: boolean }>(base(campanhaId), { signal }),
  criar: (campanhaId: string, dados: DadosProcurado) =>
    api<{ procurado: IProcurado }>(base(campanhaId), { method: 'POST', body: dados }),
  editar: (campanhaId: string, id: string, dados: DadosProcurado) =>
    api<{ procurado: IProcurado }>(`${base(campanhaId)}/${id}`, { method: 'PUT', body: dados }),
  apagar: (campanhaId: string, id: string) =>
    api<null>(`${base(campanhaId)}/${id}`, { method: 'DELETE' }),
  entrar: (campanhaId: string, id: string, personagemId: string) =>
    api<{ procurado: IProcurado }>(`${base(campanhaId)}/${id}/cacadores`, { method: 'POST', body: { personagem_id: personagemId } }),
  sair: (campanhaId: string, id: string, personagemId: string) =>
    api<{ procurado: IProcurado }>(`${base(campanhaId)}/${id}/cacadores/${personagemId}`, { method: 'DELETE' }),
  encerrar: (campanhaId: string, id: string, desfecho: DesfechoProcurado, personagens: string[]) =>
    api<{ procurado: IProcurado }>(`${base(campanhaId)}/${id}/encerrar`, { method: 'POST', body: { desfecho, personagens } }),
};

export function urlImagemProcurado(imagem: IImagemProcurado): string {
  return `/api/v1/acervo/itens/${imagem.id}/arquivos/${imagem.chave}`;
}

/** Mesmo cálculo de `chave_do_retrato` (core/acervo.py): o pedaço que tem a imagem inteira, no maior tamanho num arquivo só. */
export function chaveDoRetrato(largura: number, altura: number): string {
  const maior = Math.max(largura, altura);
  if (maior <= 1024) return 'n0/0/0';
  if (maior > 2048 && Math.ceil(largura / 4) <= 1024 && Math.ceil(altura / 4) <= 1024) return 'n2/0/0';
  return 'mini';
}

export const CONDICOES_PROCURADO: Array<{ id: CondicaoProcurado; rotulo: string }> = [
  { id: 'vivo-ou-morto', rotulo: 'Vivo ou morto' },
  { id: 'vivo', rotulo: 'Vivo' },
  { id: 'morto', rotulo: 'Morto' },
];

export const AMEACAS_PROCURADO: Array<{ id: AmeacaProcurado; rotulo: string; cor: string }> = [
  { id: 'baixa', rotulo: 'Baixa', cor: '#7fb069' },
  { id: 'media', rotulo: 'Média', cor: '#d9a441' },
  { id: 'alta', rotulo: 'Alta', cor: '#d9663f' },
  { id: 'extrema', rotulo: 'Extrema', cor: '#b3202a' },
  { id: 'desconhecida', rotulo: 'Desconhecida', cor: '#8d8475' },
];

export const STATUS_PROCURADO: Record<StatusProcurado, { rotulo: string; carimbo: string | null }> = {
  aberto: { rotulo: 'Em aberto', carimbo: null },
  capturado: { rotulo: 'Capturado', carimbo: 'Capturado' },
  abatido: { rotulo: 'Abatido', carimbo: 'Abatido' },
  cancelado: { rotulo: 'Cancelado', carimbo: 'Cancelado' },
};

export const MOEDAS_RECOMPENSA = ['Lunaris', 'Solares', 'Fragmentos de Estrela', 'Créditos Sombrios'] as const;

export function rotuloCondicao(condicao: CondicaoProcurado): string {
  return CONDICOES_PROCURADO.find((item) => item.id === condicao)?.rotulo ?? 'Vivo ou morto';
}

export function dadosAmeaca(ameaca: AmeacaProcurado) {
  return AMEACAS_PROCURADO.find((item) => item.id === ameaca) ?? AMEACAS_PROCURADO[AMEACAS_PROCURADO.length - 1];
}

/** Mesma divisão do servidor: partes iguais e a sobra, uma moeda para cada, aos primeiros. */
export function dividirRecompensa(valor: number, quantos: number): number[] {
  if (quantos <= 0) return [];
  const total = Math.max(0, Math.trunc(valor));
  const parte = Math.floor(total / quantos);
  const sobra = total - parte * quantos;
  return Array.from({ length: quantos }, (_, indice) => parte + (indice < sobra ? 1 : 0));
}

/** Abertos primeiro, do mais novo para o mais velho; depois os encerrados. */
export function separarQuadro(cartazes: readonly IProcurado[]): { abertos: IProcurado[]; encerrados: IProcurado[]; rascunhos: IProcurado[] } {
  const rascunhos = cartazes.filter((cartaz) => !cartaz.publicado);
  const publicados = cartazes.filter((cartaz) => cartaz.publicado);
  return {
    abertos: publicados.filter((cartaz) => cartaz.status === 'aberto'),
    encerrados: publicados.filter((cartaz) => cartaz.status !== 'aberto'),
    rascunhos,
  };
}
