// Luzes e auras prontas do menu do token: cada uma é um ponto de partida (alcance, cor e jeito de
// se comportar) que o Mestre ou o dono ajusta depois. Os estilos que valem são os do servidor
// (ESTILOS_DE_LUZ em core/mapa.py e ESTILOS_DE_AURA em core/mesa_extras.py).

import type { EstiloDeAura, EstiloDeLuz, IAuraToken, ILuzToken } from '../../../services/mapaApi';

export interface LuzPronta {
  id: string;
  rotulo: string;
  grupo: 'fogo' | 'magia' | 'natureza' | 'tecnologia';
  luz: ILuzToken;
}

const luz = (raio: number, cor: string, estilo: EstiloDeLuz): ILuzToken => ({ raio, cor, estilo, tremula: estilo !== 'fixa' });

export const GRUPOS_DE_LUZ: ReadonlyArray<{ id: LuzPronta['grupo']; rotulo: string }> = [
  { id: 'fogo', rotulo: 'Fogo' },
  { id: 'magia', rotulo: 'Magia' },
  { id: 'natureza', rotulo: 'Natureza' },
  { id: 'tecnologia', rotulo: 'Tecnologia' },
];

export const LUZES_PRONTAS: readonly LuzPronta[] = [
  { id: 'vela', rotulo: 'Vela', grupo: 'fogo', luz: luz(1.5, '#ffc46b', 'chama') },
  { id: 'tocha', rotulo: 'Tocha', grupo: 'fogo', luz: luz(4, '#ff9a3c', 'chama') },
  { id: 'lampiao', rotulo: 'Lampião', grupo: 'fogo', luz: luz(5, '#ffd08a', 'chama') },
  { id: 'lanterna', rotulo: 'Lanterna', grupo: 'fogo', luz: luz(6, '#ffe2a8', 'fixa') },
  { id: 'fogueira', rotulo: 'Fogueira', grupo: 'fogo', luz: luz(5, '#ff7a2e', 'chama') },
  { id: 'brasa', rotulo: 'Brasa', grupo: 'fogo', luz: luz(2, '#ff5a1f', 'pulsa') },
  { id: 'lava', rotulo: 'Lava', grupo: 'fogo', luz: luz(4, '#ff4a1a', 'pulsa') },
  { id: 'magica', rotulo: 'Luz mágica', grupo: 'magia', luz: luz(3, '#9ecbff', 'fixa') },
  { id: 'arcana', rotulo: 'Luz arcana', grupo: 'magia', luz: luz(4, '#b48cff', 'pulsa') },
  { id: 'sagrada', rotulo: 'Luz sagrada', grupo: 'magia', luz: luz(5, '#fff1b0', 'pulsa') },
  { id: 'necrotica', rotulo: 'Luz necrótica', grupo: 'magia', luz: luz(3, '#7cff6b', 'pulsa') },
  { id: 'gelida', rotulo: 'Luz gélida', grupo: 'magia', luz: luz(4, '#a8e8ff', 'fixa') },
  { id: 'fogo-fatuo', rotulo: 'Fogo-fátuo', grupo: 'magia', luz: luz(2.5, '#7dffb0', 'cintila') },
  { id: 'luar', rotulo: 'Luar', grupo: 'natureza', luz: luz(8, '#b8c8ff', 'fixa') },
  { id: 'vaga-lumes', rotulo: 'Vaga-lumes', grupo: 'natureza', luz: luz(2, '#d6ff7a', 'cintila') },
  { id: 'relampago', rotulo: 'Faíscas', grupo: 'natureza', luz: luz(3, '#cfe8ff', 'cintila') },
  { id: 'neon', rotulo: 'Neon', grupo: 'tecnologia', luz: luz(3, '#ff4fd8', 'fixa') },
  { id: 'holograma', rotulo: 'Holograma', grupo: 'tecnologia', luz: luz(2, '#5cf2ff', 'cintila') },
];

export const ROTULOS_DO_ESTILO_DE_LUZ: Record<EstiloDeLuz, string> = {
  fixa: 'Fixa',
  chama: 'Chama',
  pulsa: 'Pulsa',
  cintila: 'Cintila',
};

export const DICAS_DO_ESTILO_DE_LUZ: Record<EstiloDeLuz, string> = {
  fixa: 'Acesa e firme.',
  chama: 'Treme rápido, como fogo.',
  pulsa: 'Respira devagar, vai e volta.',
  cintila: 'Pisca e quase apaga, como fogo-fátuo.',
};

export interface AuraPronta {
  id: string;
  rotulo: string;
  aura: Omit<IAuraToken, 'visivel'>;
}

const aura = (raio: number, cor: string, estilo: EstiloDeAura): Omit<IAuraToken, 'visivel'> => ({ raio, cor, estilo });

export const AURAS_PRONTAS: readonly AuraPronta[] = [
  { id: 'protecao', rotulo: 'Proteção', aura: aura(2, '#facc15', 'campo') },
  { id: 'cura', rotulo: 'Cura', aura: aura(3, '#4ade80', 'pulso') },
  { id: 'sagrada', rotulo: 'Sagrada', aura: aura(3, '#fde68a', 'suave') },
  { id: 'medo', rotulo: 'Medo', aura: aura(3, '#a78bfa', 'ondas') },
  { id: 'veneno', rotulo: 'Veneno', aura: aura(2, '#84cc16', 'ondas') },
  { id: 'fogo', rotulo: 'Fogo', aura: aura(2, '#fb923c', 'chamas') },
  { id: 'gelo', rotulo: 'Gelo', aura: aura(3, '#7dd3fc', 'tracejada') },
  { id: 'sombra', rotulo: 'Sombra', aura: aura(3, '#7c3aed', 'suave') },
  { id: 'arcana', rotulo: 'Arcana', aura: aura(3, '#c084fc', 'tracejada') },
  { id: 'controle', rotulo: 'Área de controle', aura: aura(4, '#f87171', 'anel') },
];

export const ROTULOS_DO_ESTILO_DE_AURA: Record<EstiloDeAura, string> = {
  campo: 'Campo',
  anel: 'Anel',
  suave: 'Suave',
  pulso: 'Pulso',
  tracejada: 'Tracejada',
  ondas: 'Ondas',
  chamas: 'Chamas',
};

/** Tamanhos de aura mais usados, em casas, para trocar só o alcance sem mexer no resto. */
export const TAMANHOS_DE_AURA = [1, 2, 3, 6] as const;

/** A luz pronta que combina com a luz do token (mesmo alcance, cor e estilo), para marcar o botão. */
export function luzProntaDe(atual: ILuzToken | null | undefined, estilo: EstiloDeLuz | null): string | null {
  if (!atual || !estilo) return null;
  return LUZES_PRONTAS.find((pronta) => pronta.luz.cor === atual.cor && pronta.luz.raio === atual.raio && pronta.luz.estilo === estilo)?.id ?? null;
}

/** A aura pronta que combina com a do token (mesma cor e estilo; o alcance o Mestre ajusta), para marcar o botão. */
export function auraProntaDe(atual: IAuraToken | null | undefined): string | null {
  if (!atual) return null;
  const estilo = atual.estilo ?? 'campo';
  return AURAS_PRONTAS.find((pronta) => pronta.aura.cor === atual.cor && pronta.aura.estilo === estilo)?.id ?? null;
}
