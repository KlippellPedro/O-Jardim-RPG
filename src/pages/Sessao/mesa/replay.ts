import type { IEventoReplay } from '../../../services/mesaApi';

export type FiltroReplay = 'tudo' | 'dados' | 'combate' | 'mesa';

export const FILTROS_REPLAY: Array<{ valor: FiltroReplay; rotulo: string }> = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'dados', rotulo: 'Dados e poderes' },
  { valor: 'combate', rotulo: 'Combate' },
  { valor: 'mesa', rotulo: 'Cena' },
];

const DE_DADOS = new Set(['rolagem', 'dano', 'poder', 'habilidade', 'magia', 'item', 'anotacao']);
const DE_COMBATE = new Set(['combate', 'turno']);

export function categoriaDoEvento(tipo: string): Exclude<FiltroReplay, 'tudo'> | 'sessao' {
  if (DE_DADOS.has(tipo)) return 'dados';
  if (DE_COMBATE.has(tipo)) return 'combate';
  if (tipo === 'sessao') return 'sessao';
  return 'mesa';
}

/** O começo e o fim da sessão aparecem em qualquer filtro: são as bordas da linha do tempo. */
export function filtrarEventos(eventos: IEventoReplay[], filtro: FiltroReplay): IEventoReplay[] {
  if (filtro === 'tudo') return eventos;
  return eventos.filter((evento) => {
    const categoria = categoriaDoEvento(evento.tipo);
    return categoria === 'sessao' || categoria === filtro;
  });
}

/** "1h 23min", "45min", "50s". */
export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, '0')}min`;
  if (minutos > 0) return `${minutos}min`;
  return `${total}s`;
}

/** Quantos eventos caem em cada faixa de tempo, para o gráfico de ritmo da noite. */
export function densidade(eventos: IEventoReplay[], duracao: number, faixas = 48): number[] {
  const contagem = new Array<number>(faixas).fill(0);
  if (duracao <= 0) {
    contagem[0] = eventos.length;
    return contagem;
  }
  eventos.forEach((evento) => {
    const indice = Math.min(faixas - 1, Math.max(0, Math.floor((evento.s / duracao) * faixas)));
    contagem[indice] += 1;
  });
  return contagem;
}

/** Espera antes do próximo evento na reprodução. Segue o intervalo real, mas
 * comprimido: uma noite de horas passa em poucos minutos e um silêncio longo
 * nunca deixa a tela parada. */
export function esperaEntreEventos(segundosReais: number, velocidade: number): number {
  const base = 0.5 + Math.log1p(Math.max(0, segundosReais)) * 0.22;
  const limitada = Math.min(2.6, base);
  return Math.max(0.12, limitada / Math.max(0.25, velocidade));
}

export const VELOCIDADES_REPLAY = [1, 2, 4, 8] as const;
