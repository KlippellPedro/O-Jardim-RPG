import { lerRaridadeChave, rotuloRaridadeChave } from '../../services/lojaCatalogService';

export interface ItemLoot {
  nome: string;
  /** Rótulo ("Raro") ou chave ("raro") de raridade; o que não for reconhecido vira "Desconhecida". */
  raridade: unknown;
  categoria?: string;
  quantidade?: number;
}

export interface CartaLoot {
  nome: string;
  categoria: string;
  quantidade: number;
  rotulo: string;
  /** 0 (comum) a 6 (Relíquia da Criação): quanto mais alto, mais efeito. */
  nivel: number;
  cor: string;
  brilho: string;
  prismatica: boolean;
}

type PaletaLoot = { nivel: number; cor: string; brilho: string; prismatica?: boolean };

// Cores no mesmo sentido de classeTextoRaridade (lojaCatalogService): cinza, verde, azul, roxo, âmbar, vermelho.
const PALETA: Record<string, PaletaLoot> = {
  comum: { nivel: 0, cor: '#94a3b8', brilho: 'rgba(148, 163, 184, 0.3)' },
  incomum: { nivel: 1, cor: '#34d399', brilho: 'rgba(52, 211, 153, 0.35)' },
  raro: { nivel: 2, cor: '#60a5fa', brilho: 'rgba(96, 165, 250, 0.4)' },
  epico: { nivel: 3, cor: '#c084fc', brilho: 'rgba(192, 132, 252, 0.45)' },
  lendario: { nivel: 4, cor: '#fbbf24', brilho: 'rgba(251, 191, 36, 0.5)' },
  reliquia: { nivel: 5, cor: '#f87171', brilho: 'rgba(248, 113, 113, 0.5)' },
  'reliquia da criacao': { nivel: 6, cor: '#e0f2fe', brilho: 'rgba(240, 171, 252, 0.5)', prismatica: true },
};
const DESCONHECIDA: PaletaLoot = { nivel: 0, cor: '#fda4af', brilho: 'rgba(253, 164, 175, 0.3)' };

export const montarCarta = (item: ItemLoot): CartaLoot => {
  const chave = lerRaridadeChave(item.raridade);
  const paleta = (chave && PALETA[chave]) || DESCONHECIDA;
  return {
    nome: item.nome,
    categoria: item.categoria || '',
    quantidade: Math.max(1, Math.trunc(Number(item.quantidade) || 1)),
    rotulo: rotuloRaridadeChave(item.raridade),
    nivel: paleta.nivel,
    cor: paleta.cor,
    brilho: paleta.brilho,
    prismatica: Boolean(paleta.prismatica),
  };
};

type Ouvinte = (cartas: CartaLoot[]) => void;

const ouvintes = new Set<Ouvinte>();

/** Mostra a carta virando para cada item que chegou. As raras ficam por último. */
export const dispararLoot = (itens: ItemLoot[] | null | undefined) => {
  const cartas = (itens ?? []).filter((item) => item?.nome).map(montarCarta).sort((a, b) => a.nivel - b.nivel);
  if (cartas.length) ouvintes.forEach((ouvinte) => ouvinte(cartas));
};

export const inscreverLoot = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
