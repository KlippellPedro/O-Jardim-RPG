import rawChronicles from '../../../data/mundo/cronicas-arvores.json';

export interface ChronicleEvent {
  id: string;
  ordem: number;
  era: string;
  titulo: string;
  resumo: string;
  arvores?: string[];
}

export interface ChroniclePlace {
  nome: string;
  tipo: string;
  resumo: string;
}

export interface TreeChronicle {
  id: string;
  nome: string;
  deidade: string;
  fluxo: string;
  epiteto: string;
  estado: string;
  tese: string;
  atmosfera: string;
  historia: string[];
  temas: string[];
  lugares: ChroniclePlace[];
  cronologia: ChronicleEvent[];
}

export interface WorldChronicleCatalog {
  versao: number;
  status: string;
  introducao: {
    titulo: string;
    subtitulo: string;
    descricao: string;
  };
  linha_tempo_geral: ChronicleEvent[];
  arvores: TreeChronicle[];
}

export const WORLD_CHRONICLES = rawChronicles as WorldChronicleCatalog;

export function getTreeChronicle(treeId: string): TreeChronicle | undefined {
  return WORLD_CHRONICLES.arvores.find((tree) => tree.id === treeId);
}

