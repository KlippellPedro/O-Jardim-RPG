import type { GuidedTourStep } from '../../components/ui/GuidedTour';

export const SESSAO_TOUR_STORAGE_VERSION = 1;

const PASSOS_JOGADOR: GuidedTourStep[] = [
  {
    id: 'estado-ao-vivo',
    titulo: 'A mesa se atualiza ao vivo',
    descricao: 'Aqui você confere a campanha, o nome da sessão, a rodada e quem está agindo. “Conectado” significa que turnos, Vida, Mana, condições e rolagens recebidas do servidor aparecerão sem recarregar a página.',
    alvos: ['[data-tour="session-state"]', '[data-tour="session-header"]'],
  },
  {
    id: 'mesa-tatica',
    titulo: 'Esta é a visão geral da cena',
    descricao: 'A mesa tática mantém o combate inteiro em uma única área. Durante a luta, ela acompanha a rodada e destaca automaticamente quem possui o turno atual.',
    alvos: ['[data-tour="session-table"]'],
  },
  {
    id: 'ficha-em-foco',
    titulo: 'Consulte uma ficha sem perder a cena',
    descricao: 'A ficha em foco reúne Vida, Mana, Defesa, condições, ataques e perícias disponíveis para você. Quando o turno muda ela acompanha o novo participante; você também pode escolher outra ficha nos cartões abaixo.',
    alvos: ['[data-tour="session-focus"]'],
    opcional: true,
  },
  {
    id: 'lados-da-cena',
    titulo: 'Grupo e oposição ficam separados',
    descricao: 'Heróis e aliados aparecem de um lado; inimigos e ameaças, do outro. Cada cartão resume iniciativa e recursos. Se algum número estiver oculto, a visibilidade foi definida pelo Mestre e a tela mostra apenas o estado permitido.',
    alvos: ['[data-tour="session-teams"]'],
    opcional: true,
  },
  {
    id: 'abrir-ficha',
    titulo: 'Sua ficha completa continua a um clique',
    descricao: 'Quando você tem permissão para abrir o personagem selecionado, este atalho leva à ficha completa. Volte para a sessão quando terminar; a mesa continuará recebendo as alterações ao vivo.',
    alvos: ['[data-tour="session-sheet-link"]'],
    opcional: true,
  },
  {
    id: 'ferramentas-da-mesa',
    titulo: 'Histórico, iniciativa e ferramentas',
    descricao: 'Os atalhos do cabeçalho abrem o histórico de rolagens, a fila de iniciativa em telas menores e os recursos compartilhados da campanha. No desktop, histórico e controle da cena funcionam como painéis laterais.',
    alvos: ['[data-tour="session-tools"]'],
  },
];

const PASSO_COMANDO: GuidedTourStep = {
  id: 'comando-da-mesa',
  titulo: 'Controles de quem comanda a sessão',
  descricao: 'Mestres e assistentes também encontram aqui participantes, Escudo do Mestre e publicação ao vivo. No painel “Controle da cena”, use “Por grupo” para administrar fichas ou “Fila de turnos” para ordenar e avançar o combate.',
  alvos: ['[data-tour="session-tools"]'],
};

export function obterPassosTourSessao(comando: boolean): GuidedTourStep[] {
  return comando ? [...PASSOS_JOGADOR, PASSO_COMANDO] : PASSOS_JOGADOR;
}

export function sessaoTourJaVisto(valor: string | null): boolean {
  if (!valor) return false;
  try {
    const salvo = JSON.parse(valor) as { versao?: number; concluido?: boolean };
    return salvo.versao === SESSAO_TOUR_STORAGE_VERSION && salvo.concluido === true;
  } catch {
    return false;
  }
}

export function serializarSessaoTourVisto(): string {
  return JSON.stringify({ versao: SESSAO_TOUR_STORAGE_VERSION, concluido: true });
}
