export type QualidadeDescanso = 'pessima' | 'ruim' | 'boa' | 'maravilhosa' | 'excelente';

export interface IRegraDescanso {
  id: QualidadeDescanso;
  titulo: string;
  recuperacao: number;
  recuperacaoSanidade: number;
  reduzCansaco: number;
  criterio: string;
}

export const REGRAS_DESCANSO: IRegraDescanso[] = [
  { id: 'pessima', titulo: 'Péssima', recuperacao: 0.10, recuperacaoSanidade: 0, reduzCansaco: 1, criterio: 'Menos de 4 horas, duas interrupções perigosas ou exposição severa.' },
  { id: 'ruim', titulo: 'Ruim', recuperacao: 0.25, recuperacaoSanidade: 0.05, reduzCansaco: 2, criterio: 'Entre 4 e 7 horas ou local inseguro, sem abrigo, alimento ou água suficientes.' },
  { id: 'boa', titulo: 'Boa', recuperacao: 0.50, recuperacaoSanidade: 0.10, reduzCansaco: 3, criterio: '8 horas, abrigo básico, alimento, água e no máximo uma interrupção curta.' },
  { id: 'maravilhosa', titulo: 'Maravilhosa', recuperacao: 0.75, recuperacaoSanidade: 0.20, reduzCansaco: 4, criterio: '8 horas em local seguro, cama adequada, refeição completa e sem interrupções.' },
  { id: 'excelente', titulo: 'Excelente', recuperacao: 1, recuperacaoSanidade: 0.35, reduzCansaco: 99, criterio: 'Santuário protegido com conforto e cuidado médico ou sobrenatural. Exige autorização do mestre.' },
];

const limitar = (valor: number, minimo: number, maximo: number) => Math.max(minimo, Math.min(maximo, valor));

export function aplicarDescansoCompleto(
  status: Record<string, any>,
  maximos: { vida: number; mana: number; sanidade?: number },
  qualidade: QualidadeDescanso,
  recebeuTratamento = false,
) {
  const regra = REGRAS_DESCANSO.find((item) => item.id === qualidade) || REGRAS_DESCANSO[2];
  const vidaMaxima = Math.max(1, Number(maximos.vida) || 1);
  const manaMaxima = Math.max(0, Number(maximos.mana) || 0);
  const sanidadeMaxima = Math.max(1, Number(maximos.sanidade) || 100);
  const vidaAtual = Number(status.vidaAtual ?? vidaMaxima);
  const manaAtual = Number(status.manaAtual ?? manaMaxima);
  const sanidadeAtual = Number(status.sanidadeAtual ?? sanidadeMaxima);
  const vidaFinal = limitar(vidaAtual + Math.ceil(vidaMaxima * regra.recuperacao), -vidaMaxima, vidaMaxima);
  const podeTratarFerido = recebeuTratamento && ['boa', 'maravilhosa', 'excelente'].includes(regra.id) && vidaFinal > 0;
  return {
    ...status,
    vidaAtual: vidaFinal,
    manaAtual: limitar(manaAtual + Math.ceil(manaMaxima * regra.recuperacao), 0, manaMaxima),
    sanidadeAtual: limitar(sanidadeAtual + Math.ceil(sanidadeMaxima * regra.recuperacaoSanidade), 0, sanidadeMaxima),
    cansacoAtual: Math.max(0, Number(status.cansacoAtual || 0) - regra.reduzCansaco),
    ferido: Math.max(0, Number(status.ferido || 0) - (podeTratarFerido ? 1 : 0)),
    morrendo: vidaFinal > 0 ? 0 : Number(status.morrendo || 0),
    estabilizado: vidaFinal > 0 ? false : Boolean(status.estabilizado),
    morto: vidaFinal > 0 ? false : Boolean(status.morto),
    relaxouDesdeDescanso: false,
    concentracaoAtiva: null,
  };
}

export function aplicarRelaxamento(status: Record<string, any>, manaMaxima: number, sabedoria: number, nivel: number, dado: number) {
  if (status.relaxouDesdeDescanso) return { status, recuperado: 0, erro: 'Relaxar só funciona uma vez entre descansos completos.' };
  const modificador = Math.floor((Number(sabedoria || 10) - 10) / 2);
  const recuperado = Math.max(0, limitar(Math.trunc(dado), 1, 6) + modificador + Math.floor(Math.max(1, nivel) / 4));
  const atual = Number(status.manaAtual ?? manaMaxima);
  const final = limitar(atual + recuperado, 0, Math.max(0, manaMaxima));
  return { status: { ...status, manaAtual: final, relaxouDesdeDescanso: true }, recuperado: final - atual };
}

export function combateFoiIntenso(evento: { caiuMetadeVida?: boolean; gastouMetadeMana?: boolean; entrouMorrendo?: boolean }): boolean {
  return Boolean(evento.caiuMetadeVida || evento.gastouMetadeMana || evento.entrouMorrendo);
}
