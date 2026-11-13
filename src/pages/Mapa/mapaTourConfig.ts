import type { GuidedTourStep } from '../../components/ui/GuidedTour';

/** Suba este número quando o guia mudar a ponto de valer a pena todo mundo ver de novo. */
export const MAPA_TOUR_STORAGE_VERSION = 1;

const PASSO_PAINEL: GuidedTourStep = {
  id: 'painel-da-direita',
  titulo: 'Iniciativa, fichas e rolagens',
  descricao: 'A ordem do combate, a ficha completa de cada personagem e o registro dos dados da mesa ficam neste painel. Ele recolhe e volta pelo botão do canto de cima.',
  alvos: ['.mapa-lateral', '.mapa-alca-direita'],
  opcional: true,
};

const PASSO_BUSCA: GuidedTourStep = {
  id: 'central-de-comandos',
  titulo: 'Não achou? Digite o que procura',
  descricao: 'Aperte Ctrl+K ou a tecla / e escreva o nome de um token, de um painel ou de uma ação, como régua ou trilha. Enter faz. A tecla ? mostra todos os atalhos.',
  alvos: ['.mapa-topo-busca'],
};

const PASSOS_JOGADOR: GuidedTourStep[] = [
  {
    id: 'ferramentas',
    titulo: 'Suas ferramentas ficam aqui',
    descricao: 'Mover arrasta o seu token e a tela. Régua mede a distância, Ping chama a atenção da mesa para um ponto, Magia desenha a área de um efeito e Dados rola sem sair do mapa.',
    alvos: ['.mapa-ferramentas'],
  },
  {
    id: 'meu-personagem',
    titulo: 'Seu personagem sempre à vista',
    descricao: 'Vida, Mana, Estamina, Sanidade e condições ficam no pé do mapa. Clique no retrato para a tela ir até ele. Quando chegar a sua vez, um aviso aparece no alto e este cartão ganha um brilho dourado.',
    alvos: ['.mapa-hud'],
    opcional: true,
  },
  PASSO_PAINEL,
  PASSO_BUSCA,
];

const PASSOS_MESTRE: GuidedTourStep[] = [
  {
    id: 'cenas',
    titulo: 'As cenas moram no nome',
    descricao: 'Clique no nome da cena para trocar de cena, criar outra ou pôr uma na mesa. O selo ao lado diz se os jogadores estão vendo esta cena ou se ela ainda é só sua.',
    alvos: ['.mapa-topo-titulo'],
  },
  {
    id: 'ferramentas',
    titulo: 'Ferramentas em cima, painéis embaixo',
    descricao: 'Mover, Régua, Ping, Magia e Dados são de todos. Texto, Névoa e Portais são seus. Cena, Mesa e Montar abrem o resto: clima, hora, jogadores, pausa, Acervo e Construtor.',
    alvos: ['.mapa-ferramentas'],
  },
  {
    id: 'acervo',
    titulo: 'O Acervo ao alcance da mão',
    descricao: 'Busque um mapa, um token ou um objeto e arraste para a cena. Uma imagem do computador solta em cima do mapa também entra no Acervo.',
    alvos: ['.mapa-dock'],
    opcional: true,
  },
  PASSO_PAINEL,
  PASSO_BUSCA,
];

export function obterPassosTourMapa(gestor: boolean): GuidedTourStep[] {
  return gestor ? PASSOS_MESTRE : PASSOS_JOGADOR;
}

export function mapaTourJaVisto(valor: string | null): boolean {
  if (!valor) return false;
  try {
    const salvo = JSON.parse(valor) as { versao?: number; concluido?: boolean };
    return salvo.versao === MAPA_TOUR_STORAGE_VERSION && salvo.concluido === true;
  } catch {
    return false;
  }
}

export function serializarMapaTourVisto(): string {
  return JSON.stringify({ versao: MAPA_TOUR_STORAGE_VERSION, concluido: true });
}
