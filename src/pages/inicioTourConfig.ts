import type { GuidedTourStep } from '../components/ui/GuidedTour';

export const INICIO_TOUR_STORAGE_VERSION = 1;

/** Guia do Início: o menu de cima, a busca, as configurações e o que mora na página inicial. */
export const INICIO_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'menu',
    titulo: 'O menu do Jardim',
    descricao: 'Daqui você chega em tudo: Início, Mesa (a página da campanha), Ficha, Livro de regras, Mundo, Loja, Sessão ao vivo e Quadro. Quando o Mestre prepara ou abre uma sessão, aparece um ponto colorido em Sessão: um para preparação e outro para ao vivo.',
    alvos: ['nav[aria-label="Navegação principal"]'],
  },
  {
    id: 'busca',
    titulo: 'Busca do Jardim',
    descricao: 'Procura regras, itens da Loja, criaturas, lore e partes da sua ficha de uma vez. Atalho: Ctrl+K, ou a tecla / fora de um campo de texto.',
    alvos: ['button[aria-label="Buscar no Jardim"]'],
    opcional: true,
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    descricao: 'Preferências de desempenho, sons, efeitos visuais e notificações, instalar o Jardim como aplicativo e ligar ou desligar os guias que abrem sozinhos. O botão de guia de cada página continua lá.',
    alvos: ['button[aria-label="Configurações"]'],
    opcional: true,
  },
  {
    id: 'campanha',
    titulo: 'Campanha em uso',
    descricao: 'Tudo o que você vê (fichas, Loja, sessão, calendário) é da campanha escolhida aqui. Troque quando jogar em mais de uma mesa.',
    alvos: ['[data-tour="inicio-campanha"]'],
    opcional: true,
  },
  {
    id: 'continuar',
    titulo: 'Continuar de onde parou',
    descricao: 'Atalho para o último lugar que você abriu, como a ficha em que estava mexendo.',
    alvos: ['section[aria-label="Continuar de onde você parou"]'],
    opcional: true,
  },
  {
    id: 'modulos',
    titulo: 'As cinco portas',
    descricao: 'Ficha para os seus personagens, Mundo para a lore, Livro para as regras, Loja para comprar e vender, e Sessão ao Vivo para a mesa em tempo real. Na ficha, cada aba tem o próprio guia.',
    alvos: ['[data-tour="inicio-modulos"]'],
  },
  {
    id: 'atalhos',
    titulo: 'Campanha, Quadro e Materiais',
    descricao: 'Mesa traz a capa, o Anteriormente e os jogadores da campanha. Quadro guarda descobertas, mural, ranking e agenda. Materiais mostra os estoques e as receitas de Alquimia, Rituais, Engenharia e Cozinha, e o que os seus lotes já cobrem.',
    alvos: ['[data-tour="inicio-atalhos"]'],
  },
  {
    id: 'novidades',
    titulo: 'Novidades do Jardim',
    descricao: 'O que mudou no site e nos bots, escrito para quem joga. Filtre por área para achar só o que interessa.',
    alvos: ['section[aria-label="Novidades do Jardim"]'],
  },
  {
    id: 'calendario',
    titulo: 'Calendário das sessões',
    descricao: 'A próxima sessão em destaque, as fixas da semana e as especiais ou canceladas que o Mestre marcou.',
    alvos: ['section[aria-label="Calendário de sessões"]'],
    opcional: true,
  },
];

export function inicioTourJaVisto(valor: string | null): boolean {
  if (!valor) return false;
  try {
    const salvo = JSON.parse(valor);
    return salvo?.versao === INICIO_TOUR_STORAGE_VERSION && salvo?.concluido === true;
  } catch {
    return false;
  }
}

export function serializarInicioTourVisto(): string {
  return JSON.stringify({ versao: INICIO_TOUR_STORAGE_VERSION, concluido: true });
}
