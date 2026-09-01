import type { GuidedTourStep } from '../../components/ui/GuidedTour';

export const REGRAS_TOUR_STORAGE_VERSION = 1;

export const REGRAS_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'sidebar',
    titulo: 'A biblioteca fica sempre à mão',
    descricao: 'O painel à esquerda lista todos os capítulos agrupados por assunto. Use a busca dele pra pular direto pra um capítulo específico a qualquer momento, mesmo lendo outro.',
    alvos: ['[data-tour="regras-sidebar"]'],
    opcional: true,
  },
  {
    id: 'busca',
    titulo: 'Busque por nome ou descrição',
    descricao: 'Esta busca considera o título e o resumo de cada capítulo. Ela filtra tanto os capítulos quanto as seções mostradas logo abaixo.',
    alvos: ['[data-tour="regras-busca"]'],
  },
  {
    id: 'legenda',
    titulo: 'Nem todo capítulo é igual',
    descricao: '"Comece por aqui" marca o ponto de partida, "Regra oficial" explica um sistema do jogo, "Catálogo oficial" reúne listas grandes pra consultar, e "Somente Mestre" só aparece pra quem conduz a mesa.',
    alvos: ['[data-tour="regras-legenda"]'],
  },
  {
    id: 'secoes',
    titulo: 'Capítulos agrupados por seção',
    descricao: 'Cada seção reúne capítulos do mesmo assunto, da criação de personagem ao guia do mestre. Clique em qualquer cartão pra abrir o capítulo completo.',
    alvos: ['[data-tour="regras-secoes"]'],
  },
];

export function regrasTourJaVisto(valor: string | null): boolean {
  if (!valor) return false;
  try {
    const salvo = JSON.parse(valor);
    return salvo?.versao === REGRAS_TOUR_STORAGE_VERSION && salvo?.concluido === true;
  } catch {
    return false;
  }
}

export function serializarRegrasTourVisto(): string {
  return JSON.stringify({ versao: REGRAS_TOUR_STORAGE_VERSION, concluido: true });
}
