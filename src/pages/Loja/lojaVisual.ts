// Ícones, mercados e cores que mais de uma parte da Loja usa.

import { Apple, Archive, Backpack, Building2, Cpu, FlaskConical, Gem, Globe2, LayoutGrid, MapPin, Shield, ShieldHalf, Skull, Sparkles, Sword, Users, Wand2, Wrench } from 'lucide-react';
import { NOMES_LOCAIS_LOJA, type ItemCategoria } from '../../services/lojaCatalogService';

export const CATEGORIAS_ICONES = {
  'Todos': LayoutGrid,
  'Armas': Sword,
  'Armaduras': Shield,
  'Escudos': ShieldHalf,
  'Modificações': Wrench,
  'Consumíveis': FlaskConical,
  'Itens Comuns': Backpack,
  'Artefatos Mágicos': Wand2,
  'Implantes Cibernéticos': Cpu,
  'Componentes': Gem,
  'Bens': Building2,
  'Mercenários': Users,
  'Frutos do Éden': Apple,
  'Relíquias da Criação': Sparkles,
  'Outros': Archive,
} as const satisfies Record<ItemCategoria | 'Todos', unknown>;

export const LOCAIS_LOJA = [
  { id: 1, curto: NOMES_LOCAIS_LOJA[0], titulo: 'Feira Local', descricao: 'Barracas de lona, cheiro de pão e ferro. Suprimentos, ferramentas e o equipamento de todo dia.', icone: MapPin, cor: '#d6a254', nivelRotulo: 'cotidiano' },
  { id: 2, curto: NOMES_LOCAIS_LOJA[1], titulo: 'Mercado da Metrópole', descricao: 'Vitrines iluminadas e balcões de pedra. Arsenal marcial, tecnologia, propriedades e veículos.', icone: Building2, cor: '#60a5fa', nivelRotulo: 'especializado' },
  { id: 3, curto: NOMES_LOCAIS_LOJA[2], titulo: 'Mercado Negro', descricao: 'Uma porta sem placa e uma senha. Contrabando, implantes, venenos e artefatos proibidos.', icone: Skull, cor: '#f87171', nivelRotulo: 'restrito' },
  { id: 4, curto: NOMES_LOCAIS_LOJA[3], titulo: 'Banco Lunar', descricao: 'Cofres de prata e escrivães que não piscam. Peças lendárias, relíquias e comércio entre mundos.', icone: Globe2, cor: '#facc15', nivelRotulo: 'multiversal' },
] as const;

export type LocalLoja = (typeof LOCAIS_LOJA)[number];

export const iconeDaCategoria = (categoria: string) => (
  CATEGORIAS_ICONES[categoria as keyof typeof CATEGORIAS_ICONES] ?? Archive
);
