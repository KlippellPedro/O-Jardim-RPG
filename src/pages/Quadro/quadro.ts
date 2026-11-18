import type { IItemMural, IJogadorRank } from '../../services/engajamentoApi';

/** "sábado, 27 de set. às 20:00", no fuso de quem está olhando. */
export function formatarDataDaSessao(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const dia = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}

/** Valor para um <input type="datetime-local"> a partir de um instante ISO, no fuso local. */
export function paraCampoDataHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

/** O contrário: o valor do campo vira um instante ISO (UTC) ou null quando vazio ou inválido. */
export function deCampoDataHora(valor: string): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

/** Separa o mural em fotos e frases, mantendo a ordem (mais novo primeiro). */
export function separarMural(itens: IItemMural[]): { fotos: IItemMural[]; frases: IItemMural[] } {
  return {
    fotos: itens.filter((item) => item.tipo === 'foto'),
    frases: itens.filter((item) => item.tipo === 'citacao'),
  };
}

export type FiltroMural = 'tudo' | 'frases' | 'fotos';

export function filtrarMural(itens: IItemMural[], filtro: FiltroMural): IItemMural[] {
  if (filtro === 'frases') return itens.filter((item) => item.tipo === 'citacao');
  if (filtro === 'fotos') return itens.filter((item) => item.tipo === 'foto');
  return itens;
}

/** Número estável a partir de um texto (FNV-1a), para o mesmo papel cair sempre igual no mural. */
function semente(texto: string): number {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Quanto o papel fica torto no mural, em graus, entre -maximo e +maximo. Nunca reto demais. */
export function giroDoPapel(id: string, maximo = 2.4): number {
  const passo = (semente(id) % 1000) / 999; // 0..1
  const giro = (passo * 2 - 1) * maximo;
  const minimo = maximo * 0.25;
  const ajustado = Math.abs(giro) < minimo ? (giro < 0 ? -minimo : minimo) : giro;
  return Math.round(ajustado * 10) / 10;
}

/** Tom do papel e cor do alfinete, escolhidos pelo id do item. */
const PAPEIS = ['#efe3c2', '#f1dfc0', '#e6dcc0', '#efe6cf', '#e9d9b5'] as const;
const ALFINETES = ['#b8352b', '#2f6f9a', '#c8962e', '#3f7d4f', '#7a3f8f'] as const;

export function estiloDoPapel(id: string): { papel: string; alfinete: string; giro: number } {
  const base = semente(`papel:${id}`);
  return {
    papel: PAPEIS[base % PAPEIS.length],
    alfinete: ALFINETES[Math.floor(base / 7) % ALFINETES.length],
    giro: giroDoPapel(id),
  };
}

export type ColunaRank = 'rolagens' | 'criticos' | 'falhas' | 'dano_maximo' | 'lunaris_gastos';
export const COLUNAS_RANK: ColunaRank[] = ['rolagens', 'criticos', 'falhas', 'dano_maximo', 'lunaris_gastos'];

/** O maior valor de cada coluna da tabela, para marcar quem lidera. Zero não lidera nada. */
export function lideresDoRank(jogadores: Pick<IJogadorRank, ColunaRank>[]): Record<ColunaRank, number> {
  const lideres = {} as Record<ColunaRank, number>;
  COLUNAS_RANK.forEach((coluna) => {
    lideres[coluna] = jogadores.reduce((maior, jogador) => Math.max(maior, Number(jogador[coluna]) || 0), 0);
  });
  return lideres;
}

/** Parte do total em porcentagem inteira, sem passar de 0..100. */
export function porcentagem(parte: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((parte / total) * 100)));
}

/** "sábado, 22 de nov." e "20:00" separados, para o cartão da próxima sessão. */
export function partesDaSessao(iso: string): { dia: string; hora: string } | null {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return {
    dia: data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }),
    hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Tamanho em caracteres que o servidor mede na foto (data URL inteiro). */
export const TAMANHO_MAXIMO_FOTO = 150_000;

/** Escolhe a menor escala/qualidade que faz a foto caber no limite do servidor. */
export function planoDeReducao(largura: number, altura: number): Array<{ lado: number; qualidade: number }> {
  const maior = Math.max(largura, altura, 1);
  const lados = [900, 720, 560, 420].map((lado) => Math.min(lado, maior));
  const qualidades = [0.78, 0.66, 0.54];
  return lados.flatMap((lado) => qualidades.map((qualidade) => ({ lado, qualidade })));
}

export function cabeNoLimite(dataUrl: string): boolean {
  return dataUrl.length <= TAMANHO_MAXIMO_FOTO;
}

// ---------------------------------------------------------------- calendário

export interface IDiaDoCalendario {
  /** AAAA-MM-DD, ou null nas células vazias antes e depois do mês. */
  data: string | null;
  dia: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Semanas do mês, de segunda a domingo, com células vazias nas pontas. `mes` é AAAA-MM. */
export function montarMes(mes: string): IDiaDoCalendario[][] {
  const [ano, numero] = mes.split('-').map(Number);
  const primeiro = new Date(ano, numero - 1, 1);
  const total = new Date(ano, numero, 0).getDate();
  const deslocamento = (primeiro.getDay() + 6) % 7; // segunda = 0
  const celulas: IDiaDoCalendario[] = [
    ...Array.from({ length: deslocamento }, () => ({ data: null, dia: 0 })),
    ...Array.from({ length: total }, (_, i) => ({ data: `${ano}-${pad(numero)}-${pad(i + 1)}`, dia: i + 1 })),
  ];
  while (celulas.length % 7 !== 0) celulas.push({ data: null, dia: 0 });
  return Array.from({ length: celulas.length / 7 }, (_, i) => celulas.slice(i * 7, i * 7 + 7));
}

export const mesDe = (data: Date): string => `${data.getFullYear()}-${pad(data.getMonth() + 1)}`;

export function somarMeses(mes: string, delta: number): string {
  const [ano, numero] = mes.split('-').map(Number);
  return mesDe(new Date(ano, numero - 1 + delta, 1));
}

export function rotuloDoMes(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  const texto = new Date(ano, numero - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

/** "18:00", na hora de quem está olhando. */
export function horaLocal(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '' : `${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

export const DIAS_DA_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;
export const DIAS_CURTOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const;

/** Agrupa as sessões por dia para desenhar no calendário. */
export function sessoesPorDia<T extends { data: string }>(sessoes: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  sessoes.forEach((sessao) => mapa.set(sessao.data, [...(mapa.get(sessao.data) ?? []), sessao]));
  return mapa;
}
