import type { CorRelogio, IRelogio } from '../../../services/mesaApi';

export const COR_RELOGIO: Record<CorRelogio, { rotulo: string; cheia: string; vazia: string }> = {
  perigo: { rotulo: 'Perigo', cheia: '#ef4444', vazia: 'rgba(239,68,68,0.10)' },
  ritual: { rotulo: 'Ritual', cheia: '#a78bfa', vazia: 'rgba(167,139,250,0.10)' },
  progresso: { rotulo: 'Progresso', cheia: '#4ade80', vazia: 'rgba(74,222,128,0.10)' },
  misterio: { rotulo: 'Mistério', cheia: '#38bdf8', vazia: 'rgba(56,189,248,0.10)' },
};

export const TAMANHOS_RELOGIO = [4, 6, 8, 10, 12] as const;

/** Caminho SVG de uma fatia de pizza. A fatia 0 começa no topo e o relógio gira no sentido horário. */
export function caminhoDaFatia(cx: number, cy: number, raio: number, indice: number, total: number, folga = 0.035): string {
  const passo = (Math.PI * 2) / total;
  const inicio = -Math.PI / 2 + indice * passo + folga;
  const fim = -Math.PI / 2 + (indice + 1) * passo - folga;
  const ponto = (angulo: number) => `${(cx + Math.cos(angulo) * raio).toFixed(2)} ${(cy + Math.sin(angulo) * raio).toFixed(2)}`;
  const grande = fim - inicio > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${ponto(inicio)} A ${raio} ${raio} 0 ${grande} 1 ${ponto(fim)} Z`;
}

export const relogioCompleto = (relogio: Pick<IRelogio, 'cheias' | 'fatias'>) => relogio.cheias >= relogio.fatias;

/** Relógios que acabaram de se completar entre duas leituras do estado (para tocar o gongo uma vez só). */
export function relogiosRecemCompletos(antes: IRelogio[] | null, depois: IRelogio[]): IRelogio[] {
  if (!antes) return [];
  const anteriores = new Map(antes.map((relogio) => [relogio.id, relogio]));
  return depois.filter((relogio) => {
    const anterior = anteriores.get(relogio.id);
    return anterior && !relogioCompleto(anterior) && relogioCompleto(relogio);
  });
}
