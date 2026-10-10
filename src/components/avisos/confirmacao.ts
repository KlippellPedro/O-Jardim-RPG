/** Confirmação com a cara do site, no lugar do `window.confirm`.
 *
 * `await confirmar('Apagar?')` devolve true só se a pessoa confirmou; `escolher` aceita uma
 * terceira saída (ex.: "Começar assim") e devolve qual botão foi usado. O diálogo em si é
 * desenhado pelo `AvisosHost`. Pedidos que chegam juntos esperam na fila, um de cada vez. */

export type TomDeConfirmacao = 'padrao' | 'perigo';
export type RespostaDeConfirmacao = 'confirmar' | 'alternativa' | 'cancelar';

export interface OpcoesDeConfirmacao {
  titulo?: string;
  mensagem: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  /** `perigo` pinta o botão de vermelho e deixa o foco inicial em Cancelar. */
  tom?: TomDeConfirmacao;
  /** Terceiro botão, entre Cancelar e Confirmar. */
  alternativa?: { rotulo: string };
}

export interface PedidoDeConfirmacao {
  id: number;
  titulo: string;
  mensagem: string;
  rotuloConfirmar: string;
  rotuloCancelar: string;
  tom: TomDeConfirmacao;
  alternativa?: { rotulo: string };
  resolver: (resposta: RespostaDeConfirmacao) => void;
}

/** Os textos padrão de um pedido; só `mensagem` é obrigatória. */
export function normalizarPedido(opcoes: OpcoesDeConfirmacao | string): Omit<PedidoDeConfirmacao, 'id' | 'resolver'> {
  const base: OpcoesDeConfirmacao = typeof opcoes === 'string' ? { mensagem: opcoes } : opcoes;
  return {
    titulo: base.titulo?.trim() || 'Confirmar',
    mensagem: base.mensagem,
    rotuloConfirmar: base.rotuloConfirmar?.trim() || 'Confirmar',
    rotuloCancelar: base.rotuloCancelar?.trim() || 'Cancelar',
    tom: base.tom ?? 'padrao',
    alternativa: base.alternativa,
  };
}

let fila: PedidoDeConfirmacao[] = [];
let proximoId = 1;
const ouvintes = new Set<() => void>();

const emitir = () => ouvintes.forEach((ouvinte) => ouvinte());

/** O pedido que está na tela agora (o primeiro da fila), ou null. */
export function pedidoAtual(): PedidoDeConfirmacao | null {
  return fila[0] ?? null;
}

export function inscreverConfirmacoes(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

export function escolher(opcoes: OpcoesDeConfirmacao | string): Promise<RespostaDeConfirmacao> {
  return new Promise<RespostaDeConfirmacao>((resolver) => {
    fila = [...fila, { ...normalizarPedido(opcoes), id: proximoId++, resolver }];
    emitir();
  });
}

export async function confirmar(opcoes: OpcoesDeConfirmacao | string): Promise<boolean> {
  return (await escolher(opcoes)) === 'confirmar';
}

/** Chamado pelo diálogo: resolve o pedido e passa para o próximo da fila. */
export function responderConfirmacao(id: number, resposta: RespostaDeConfirmacao): void {
  const pedido = fila.find((item) => item.id === id);
  if (!pedido) return;
  fila = fila.filter((item) => item.id !== id);
  emitir();
  pedido.resolver(resposta);
}

/** Troca de tela com pedido aberto: ninguém ficou para responder, então tudo vira Cancelar. */
export function cancelarConfirmacoes(): void {
  if (!fila.length) return;
  const pendentes = fila;
  fila = [];
  emitir();
  pendentes.forEach((pedido) => pedido.resolver('cancelar'));
}
