import { MUNDO_CATALOG, type LoreEntry } from '../../../data/gerado/mundoCatalog';

const bancoLunar = MUNDO_CATALOG.find((entry) => entry.tipo === 'local' && entry.id === 'banco-lunar');
const amadheus = MUNDO_CATALOG.find((entry) => entry.id === 'amadheus-colona');

const campo = (entry: LoreEntry | undefined, key: string): string => {
  const value = entry?.conteudo[key];
  return typeof value === 'string' ? value : '';
};

export const BANCO_LUNAR_INFO = {
  nome: bancoLunar?.titulo || 'Banco Lunar',
  cor: '#4ade80',
  descricao: campo(bancoLunar, 'descricao'),
  responsavel: {
    nome: amadheus?.titulo || campo(bancoLunar, 'responsavel'),
    epiteto: campo(amadheus, 'epiteto'),
    descricao: campo(amadheus, 'descricao'),
  },
};
