import type { GuidedTourStep } from '../../components/ui/GuidedTour';

export const MUNDO_TOUR_STORAGE_VERSION = 1;

export const MUNDO_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'geral',
    titulo: 'Duas vistas gerais do mundo',
    descricao: '"Linha do tempo geral" reúne os marcos de todas as Árvores em ordem cronológica. "Registros Universais" guarda o que não pertence a nenhuma Árvore específica.',
    alvos: ['[data-tour="mundo-nav-geral"]'],
    opcional: true,
  },
  {
    id: 'projecao',
    titulo: 'A projeção reage ao mouse',
    descricao: 'Arraste pra girar a câmera, use o scroll pra aproximar ou afastar, e clique numa Árvore pra focar nela. Clique de novo na Árvore já focada pra abrir o capítulo completo dela.',
    alvos: ['[data-tour="mundo-projecao"]'],
  },
  {
    id: 'lista',
    titulo: 'Prefere uma lista?',
    descricao: '"Ver em lista" troca a projeção 3D por uma lista simples das Árvores, útil em telas menores ou com o modo de desempenho ativado.',
    alvos: ['[data-tour="mundo-lista"]'],
    opcional: true,
  },
  {
    id: 'vazio',
    titulo: 'O Vazio não é uma Árvore',
    descricao: 'Erebus orbita fora do sistema de Árvores, mas tem crônica e locais próprios. Este botão abre o registro dele direto, sem precisar procurar no céu.',
    alvos: ['[data-tour="mundo-vazio"]'],
    opcional: true,
  },
];

export function mundoTourJaVisto(valor: string | null): boolean {
  if (!valor) return false;
  try {
    const salvo = JSON.parse(valor);
    return salvo?.versao === MUNDO_TOUR_STORAGE_VERSION && salvo?.concluido === true;
  } catch {
    return false;
  }
}

export function serializarMundoTourVisto(): string {
  return JSON.stringify({ versao: MUNDO_TOUR_STORAGE_VERSION, concluido: true });
}
