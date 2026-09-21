import type { IItemMural } from '../../services/engajamentoApi';

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
