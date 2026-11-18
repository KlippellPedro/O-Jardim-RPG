import type { GuidedTourStep } from '../../components/ui/GuidedTour';

// Versão 3: a Loja ganhou layout novo (2026-11-17), então o guia volta a abrir uma vez.
export const LOJA_TOUR_STORAGE_VERSION = 3;

export const LOJA_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'mercados',
    titulo: 'Cada mercado tem uma prateleira',
    descricao: 'Feira, Metrópole, Mercado Negro e Banco Lunar são patamares que se somam: um mercado mais alto também vende o que os de baixo vendem. A campanha decide quais estão abertos.',
    alvos: ['[data-tour="loja-locais"]'],
  },
  {
    id: 'comprador',
    titulo: 'Quem negocia',
    descricao: 'Escolha o personagem que compra, vende ou caça. A bolsa ao lado mostra as moedas dele, cada uma na sua cor.',
    alvos: ['[data-tour="loja-comprador"]'],
    opcional: true,
  },
  {
    id: 'operacoes',
    titulo: 'Comprar, vender ou caçar',
    descricao: 'Comprar abre a vitrine. Vender mostra tudo que o personagem carrega e quanto o balcão paga por cada coisa. Caçadores abre o quadro de procurados. Trocar de aba esvazia o lote, para nada ser comprado ou vendido sem querer.',
    alvos: ['[data-tour="loja-modos"]'],
  },
  {
    id: 'regras',
    titulo: 'As regras do balcão',
    descricao: 'Esta faixa resume o limite de itens especiais, a raridade sob encomenda e como os mercados se somam. Abra Regras do balcão para ler mais e ir ao Livro de Regras.',
    alvos: ['[data-tour="loja-regras"]'],
    opcional: true,
  },
  {
    id: 'filtros',
    titulo: 'As prateleiras',
    descricao: 'Cada prateleira mostra quantos itens tem neste mercado. A busca e as raridades ao lado afinam a procura.',
    alvos: ['[data-tour="loja-filtros"]'],
    opcional: true,
  },
  {
    id: 'catalogo',
    titulo: 'A vitrine',
    descricao: 'Cada cartão mostra o essencial e o preço. Abra o item para ler a regra inteira antes de pôr no lote.',
    alvos: ['[data-tour="loja-catalogo"]'],
  },
  {
    id: 'item',
    titulo: 'Leia antes de levar',
    descricao: 'Armas, armaduras e escudos aparecem pelo preço Comum; no detalhe dá para encomendar uma raridade maior e ver o preço novo. Modificações sempre pedem o equipamento de destino.',
    alvos: ['[data-tour="loja-item"]'],
    opcional: true,
  },
  {
    id: 'carrinho',
    titulo: 'O servidor confere o lote',
    descricao: 'O lote soma os preços por moeda e fica flutuando no canto enquanto tiver algo dentro. Ao fechar, o servidor confere preço, saldo e inventário antes de mexer em qualquer coisa. Arma, armadura ou escudo que cabe numa vaga livre já sai equipado, com o botão Desfazer.',
    alvos: ['[data-tour="loja-carrinho"]'],
    opcional: true,
  },
  {
    id: 'recompensas',
    titulo: 'O quadro dos Caçadores',
    descricao: 'O Mestre prega cartazes dos seres procurados. Abra um cartaz para ler o contrato e aceitar a caçada com o seu personagem; a recompensa cai na bolsa quando o Mestre encerra.',
    alvos: ['[data-tour="loja-recompensas"]'],
    opcional: true,
  },
];

export function lojaTourJaVisto(valor: string | null): boolean {
  if (!valor) return false;
  try {
    const salvo = JSON.parse(valor);
    return salvo?.versao === LOJA_TOUR_STORAGE_VERSION && salvo?.concluido === true;
  } catch {
    return false;
  }
}

export function serializarLojaTourVisto(): string {
  return JSON.stringify({ versao: LOJA_TOUR_STORAGE_VERSION, concluido: true });
}
