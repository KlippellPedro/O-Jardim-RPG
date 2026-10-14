import type { GuidedTourStep } from '../../components/ui/GuidedTour';

export const REGRAS_TOUR_STORAGE_VERSION = 1;

export const REGRAS_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'sidebar',
    titulo: 'A biblioteca fica sempre à mão',
    descricao: 'O painel à esquerda lista os tópicos do livro, agrupados em capítulos. Use a busca dele para pular direto para um tópico a qualquer momento, mesmo lendo outro.',
    alvos: ['[data-tour="regras-sidebar"]'],
    opcional: true,
  },
  {
    id: 'busca',
    titulo: 'Busque por nome ou descrição',
    descricao: 'Esta busca considera o título e o resumo de cada tópico. Ela filtra a lista inteira, inclusive os capítulos mostrados logo abaixo.',
    alvos: ['[data-tour="regras-busca"]'],
  },
  {
    id: 'pdf',
    titulo: 'O livro inteiro em um PDF',
    descricao: 'Prefere ler como um livro de verdade? Baixe o PDF, com sumário, capítulos, o Compêndio de classes, raças, Legados e magias, referência rápida e índice. Depois de baixado, ele funciona sem internet.',
    alvos: ['[data-tour="regras-pdf"]'],
    opcional: true,
  },
  {
    id: 'trilhas',
    titulo: 'Por onde começar',
    descricao: 'Quatro caminhos de leitura, conforme o que você vai fazer na mesa: aprender a jogar, pegar as fórmulas, conjurar ou mestrar.',
    alvos: ['[data-tour="regras-trilhas"]'],
    opcional: true,
  },
  {
    id: 'legenda',
    titulo: 'Nem todo tópico é igual',
    descricao: '"Comece por aqui" marca o ponto de partida, "Regra oficial" explica um sistema do jogo, "Catálogo oficial" reúne listas grandes para consultar, e "Somente Mestre" só aparece para quem conduz a mesa. As caixas coloridas dentro do texto (Exemplo, Atenção, Dica de mesa e Regra) também estão explicadas aqui.',
    alvos: ['[data-tour="regras-legenda"]'],
  },
  {
    id: 'secoes',
    titulo: 'Tópicos agrupados em capítulos',
    descricao: 'Cada capítulo reúne tópicos do mesmo assunto, da criação de personagem ao guia do mestre. Clique em qualquer cartão para abrir o tópico completo.',
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
