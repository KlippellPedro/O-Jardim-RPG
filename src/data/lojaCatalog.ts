export type ItemCategoria = 'Armas' | 'Armaduras' | 'Consumíveis' | 'Itens Mágicos';
export type ItemRaridade = 'Comum' | 'Incomum' | 'Raro' | 'Épico';

export interface LojaItem {
  id: string;
  nome: string;
  categoria: ItemCategoria;
  raridade: ItemRaridade;
  precoPO: number; // Preço em Peças de Ouro (PO). Ex: 0.5 = 5 PP.
  descricao: string;
  propriedades?: string; // Ex: Dano, Efeito, Bônus de CA
  imagemPlaceholder?: string;
}

export const LOJA_CATALOGO: LojaItem[] = [
  // Armas
  {
    id: 'arma-001',
    nome: 'Espada Longa de Salém',
    categoria: 'Armas',
    raridade: 'Comum',
    precoPO: 1.5, // 1 PO e 5 PP
    descricao: 'Uma espada longa padrão, forjada no aço de Salém.',
    propriedades: 'Dano: 1d8 Cortante',
  },
  {
    id: 'arma-002',
    nome: 'Arco Recurvo Élfico',
    categoria: 'Armas',
    raridade: 'Incomum',
    precoPO: 3.0,
    descricao: 'Feito de madeira flexível do Galho 0. Excelente alcance e leveza.',
    propriedades: 'Dano: 1d8 Perfurante | Distância',
  },
  {
    id: 'arma-003',
    nome: 'Lâmina do Vazio',
    categoria: 'Armas',
    raridade: 'Épico',
    precoPO: 50.0,
    descricao: 'Fende não apenas a carne, mas a própria realidade. Diz-se ter sido forjada perto do Abismo.',
    propriedades: 'Dano: 2d10 Cortante | Ignora Resistência Mundana',
  },

  // Armaduras
  {
    id: 'arm-001',
    nome: 'Cota de Malha Imperial',
    categoria: 'Armaduras',
    raridade: 'Comum',
    precoPO: 2.0,
    descricao: 'Armadura pesada e barulhenta, porém eficaz contra cortes transversais.',
    propriedades: 'Defesa: +3 CA | Desvantagem em Furtividade',
  },
  {
    id: 'arm-002',
    nome: 'Couro de Fera Umbral',
    categoria: 'Armaduras',
    raridade: 'Incomum',
    precoPO: 5.5,
    descricao: 'Extraordinariamente leve e resistente, aborve a luz ambiente.',
    propriedades: 'Defesa: +2 CA | Vantagem em Furtividade no escuro',
  },

  // Consumíveis
  {
    id: 'cons-001',
    nome: 'Poção de Vida Menor',
    categoria: 'Consumíveis',
    raridade: 'Comum',
    precoPO: 0.5, // 5 PP
    descricao: 'Um frasco com líquido escarlate. Gosto de cereja e ferro.',
    propriedades: 'Efeito: Cura 2d4+2 HP',
  },
  {
    id: 'cons-002',
    nome: 'Frasco de Fogo Alquímico',
    categoria: 'Consumíveis',
    raridade: 'Comum',
    precoPO: 1.0,
    descricao: 'Explode em impacto, cobrindo uma pequena área com chamas persistentes.',
    propriedades: 'Dano: 1d6 Fogo (Área 1.5m)',
  },

  // Itens Mágicos
  {
    id: 'mag-001',
    nome: 'Amuleto do Guardião',
    categoria: 'Itens Mágicos',
    raridade: 'Raro',
    precoPO: 15.0,
    descricao: 'Um prisma de Aethel que vibra levemente. Aquece quando perigos se aproximam.',
    propriedades: 'Efeito: +1 em Testes de Resistência',
  },
  {
    id: 'mag-002',
    nome: 'Anel do Sussurro',
    categoria: 'Itens Mágicos',
    raridade: 'Incomum',
    precoPO: 4.0,
    descricao: 'Permite comunicação telepática com uma criatura visível a até 30 metros.',
    propriedades: 'Efeito: Telepatia',
  }
];
