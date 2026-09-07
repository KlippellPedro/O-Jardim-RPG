import type { LoreEntry } from '../../../data/gerado/mundoCatalog';
import type { WorldChronicleCatalog } from './worldChronicles';

export function vazioInfo(catalog: LoreEntry[], chronicles: WorldChronicleCatalog) {
  const entry = (id: string, tipo: string) => {
    const found = catalog.find(item => item.id === id && item.tipo === tipo);
    const text = (key: string) => typeof found?.conteudo[key] === 'string' ? String(found.conteudo[key]) : '';
    return { id, tipo, nome: found?.titulo || 'Conhecimento oculto', epiteto: text('epiteto'), descricao: text('descricao') };
  };
  return {
    nome: 'O Vazio', cor: '#9b96ad',
    descricao: chronicles.arvores.find(tree => tree.id === 'erebus')?.tese || '',
    deidade: entry('erebus', 'deidade'), fluxo: entry('fluxo-do-vazio', 'fluxo'),
    locais: catalog.filter(item => item.tipo === 'local' && item.conteudo.no_vazio === 'erebus')
      .map(item => ({ ...entry(item.id, item.tipo), resumo: String(item.conteudo.descricao || '') })),
  };
}

// Identidade visual estrutural da cena, sem conteúdo de lore.
export const VAZIO_INFO = { nome: "O Vazio", cor: "#9b96ad" };
