import type { GuidedTourStep } from '../../components/ui/GuidedTour';

export const LOJA_TOUR_STORAGE_VERSION = 1;

export const LOJA_TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 'mercados',
    titulo: 'Cada mercado tem uma prateleira',
    descricao: 'Feira, Metrópole, Mercado Negro e Banco Lunar são patamares cumulativos. Um lugar avançado também mostra os itens dos anteriores; mercados fechados dependem da campanha.',
    alvos: ['[data-tour="loja-locais"]'],
  },
  {
    id: 'operacoes',
    titulo: 'Comprar, vender ou procurar contratos',
    descricao: 'Comprar usa o catálogo publicado, Vender mostra apenas itens com origem verificável da Loja e Caçadores abre as recompensas ativas. Trocar de operação limpa o lote para evitar uma compra ou venda acidental.',
    alvos: ['[data-tour="loja-modos"]'],
  },
  {
    id: 'comprador',
    titulo: 'A operação pertence a um personagem',
    descricao: 'Escolha quem compra ou vende. A carteira mostra as quatro moedas sem converter valores silenciosamente, e a compra sempre volta para o inventário desse personagem.',
    alvos: ['[data-tour="loja-comprador"]'],
    opcional: true,
  },
  {
    id: 'regras',
    titulo: 'Regras antes do preço',
    descricao: 'Este painel resume o limite de itens especiais, o orçamento de modificações por raridade e a função dos mercados. Os links abrem o capítulo completo do Livro de Regras.',
    alvos: ['[data-tour="loja-regras"]'],
  },
  {
    id: 'filtros',
    titulo: 'Encontre uma coisa de cada vez',
    descricao: 'Busca, categoria, tipo e raridade trabalham juntos. Os filtros ativos aparecem no resumo; Limpar devolve o catálogo ao estado inicial.',
    alvos: ['[data-tour="loja-filtros"]'],
  },
  {
    id: 'catalogo',
    titulo: 'A prateleira atual',
    descricao: 'O título explica o balcão selecionado e mostra quantos resultados restaram. Cada cartão deixa visíveis só identidade, regra essencial e preço; a ficha completa abre em detalhes.',
    alvos: ['[data-tour="loja-catalogo"]'],
  },
  {
    id: 'item',
    titulo: 'Leia antes de colocar no lote',
    descricao: 'Armas, armaduras e escudos aparecem pelo preço Comum; abra o item para escolher uma raridade maior e ver o novo preço, capacidade e balcão exigido. Modificações sempre pedem o equipamento de destino.',
    alvos: ['[data-tour="loja-item"]'],
    opcional: true,
  },
  {
    id: 'carrinho',
    titulo: 'O servidor confirma a compra',
    descricao: 'O carrinho reúne o lote por moeda. Ao finalizar, o servidor confere preço publicado, disponibilidade, saldo, alvo da modificação e versão do inventário antes de alterar qualquer coisa.',
    alvos: ['[data-tour="loja-carrinho"]'],
  },
  {
    id: 'recompensas',
    titulo: 'Contratos de Caçadores',
    descricao: 'Reivindicar uma recompensa cria um pedido para a equipe da campanha. O pagamento só ocorre depois da aprovação; o valor exibido no pedido fica registrado.',
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
