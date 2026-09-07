import { type LoreEntry } from '../../../data/gerado/mundoCatalog';

const campo = (entry: LoreEntry | undefined, key: string): string => {
  const value = entry?.conteudo[key];
  return typeof value === 'string' ? value : '';
};

export function bancoLunarInfo(catalog: LoreEntry[]) {
  const bancoLunar = catalog.find(entry => entry.tipo === 'local' && entry.id === 'banco-lunar');
  const amadheus = catalog.find(entry => entry.id === 'amadheus-colona');
  return {
    nome: bancoLunar?.titulo || 'Banco Lunar',
    cor: '#4ade80',
    descricao: campo(bancoLunar, 'descricao'),
    responsavel: {
      nome: amadheus?.titulo || campo(bancoLunar, 'responsavel'),
      epiteto: campo(amadheus, 'epiteto'),
      descricao: campo(amadheus, 'descricao'),
    },
  };

}

export const BANCO_LUNAR_INFO = { nome: "Banco Lunar", cor: "#4ade80" };
