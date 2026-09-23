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

/** Efeitos extras que a carta ganha conforme a raridade. */
export interface EfeitosCarta {
  /** Clarão branco no instante em que a carta vira. */
  clarao: boolean;
  /** Onda de choque que sai da carta ao virar. */
  onda: boolean;
  /** A tela treme ao virar. */
  tremor: boolean;
  /** Quantidade de faíscas que sobem. */
  faiscas: number;
  /** Quantidade de brasas que caem do alto (só do épico para cima). */
  chuva: number;
  /** Anéis de luz girando atrás da carta. */
  aneis: number;
}

export const efeitosDaCarta = (nivel: number): EfeitosCarta => ({
  clarao: nivel >= 1,
  onda: nivel >= 2,
  tremor: nivel >= 5,
  faiscas: nivel >= 3 ? 14 + (nivel - 3) * 6 : nivel >= 1 ? 6 : 0,
  chuva: nivel >= 3 ? 10 + (nivel - 3) * 6 : 0,
  aneis: nivel >= 4 ? nivel - 3 : 0,
});

// Cartas que ainda não foram reveladas. Compra na Loja não abre a carta na hora:
// ela espera guardada em ficha.lootPendente (sincronizada pelo autosave normal
// da ficha) até a pessoa abrir a ficha de quem comprou - em qualquer aparelho,
// não só no navegador onde a compra foi feita.
const LIMITE_PENDENTES = 30;

/** Novo valor de ficha.lootPendente somando o que já esperava com os itens da compra. */
export const proximosPendentes = (
  atuais: ItemLoot[] | null | undefined,
  itens: ItemLoot[] | null | undefined,
): ItemLoot[] => {
  const validos = (itens ?? []).filter((item) => item?.nome);
  if (validos.length === 0) return Array.isArray(atuais) ? atuais : [];
  const base = Array.isArray(atuais) ? atuais : [];
  return [...base, ...validos].slice(-LIMITE_PENDENTES);
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
