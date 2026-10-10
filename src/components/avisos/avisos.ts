/** Avisos curtos do site (o que antes era `alert()`): aparecem embaixo, somem sozinhos e
 * podem trazer um botão, como o "Desfazer" de uma exclusão.
 *
 * O estado mora num módulo comum, não num componente, para qualquer arquivo (inclusive
 * serviços e stores) poder avisar sem depender da árvore do React. O `AvisosHost` é quem
 * desenha. Quem confirma uma ação (o que antes era `window.confirm`) usa `confirmacao.ts`. */

export type TipoDeAviso = 'sucesso' | 'info' | 'aviso' | 'erro';

export interface AcaoDeAviso {
  rotulo: string;
  aoClicar: () => void | Promise<void>;
}

export interface OpcoesDeAviso {
  tipo?: TipoDeAviso;
  titulo?: string;
  texto: string;
  acao?: AcaoDeAviso;
  /** Em milissegundos; 0 deixa o aviso na tela até a pessoa fechar. */
  duracaoMs?: number;
  /** Avisos com a mesma chave trocam de lugar em vez de empilhar (padrão: tipo + texto). */
  chave?: string;
}

export interface Aviso {
  id: number;
  chave: string;
  tipo: TipoDeAviso;
  titulo?: string;
  texto: string;
  acao?: AcaoDeAviso;
  duracaoMs: number;
  /** Quantas vezes o mesmo aviso chegou enquanto ainda estava na tela. */
  repeticoes: number;
  /** Muda a cada chegada, para o relógio de fechar recomeçar. */
  versao: number;
}

/** Quantos avisos cabem na tela de uma vez; o mais antigo sai para dar lugar. */
export const LIMITE_DE_AVISOS = 4;

const DURACAO_BASE: Record<TipoDeAviso, number> = {
  sucesso: 4000,
  info: 5000,
  aviso: 7000,
  erro: 9000,
};

/** Com botão a pessoa precisa de tempo para ler e decidir (um "Desfazer" some em 9 s ou mais). */
export function duracaoPadrao(tipo: TipoDeAviso, temAcao: boolean): number {
  const base = DURACAO_BASE[tipo];
  return temAcao ? Math.max(base, 9000) : base;
}

/** Junta um aviso novo à lista: o mesmo aviso (mesma chave) só conta mais uma vez, e passou do limite sai o mais antigo. */
export function adicionarAviso(lista: readonly Aviso[], novo: Aviso, limite = LIMITE_DE_AVISOS): Aviso[] {
  const existente = lista.find((aviso) => aviso.chave === novo.chave);
  const resto = lista.filter((aviso) => aviso.chave !== novo.chave);
  const atualizado = existente
    ? { ...novo, id: existente.id, repeticoes: existente.repeticoes + 1 }
    : novo;
  const proxima = [...resto, atualizado];
  return proxima.length > limite ? proxima.slice(proxima.length - limite) : proxima;
}

let avisos: readonly Aviso[] = [];
let proximoId = 1;
let proximaVersao = 1;
const ouvintes = new Set<() => void>();

const emitir = () => ouvintes.forEach((ouvinte) => ouvinte());

export function lerAvisos(): readonly Aviso[] {
  return avisos;
}

export function inscreverAvisos(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

/** Mostra um aviso e devolve o id (serve para dispensá-lo antes da hora). */
export function notificar(opcoes: OpcoesDeAviso): number {
  const tipo = opcoes.tipo ?? 'info';
  const texto = opcoes.texto.trim();
  const chave = opcoes.chave ?? `${tipo}:${texto}`;
  // O aviso repetido guarda o id de quem já estava na tela; só o novo gasta um id.
  const id = avisos.find((aviso) => aviso.chave === chave)?.id ?? proximoId++;
  const novo: Aviso = {
    id,
    chave,
    tipo,
    titulo: opcoes.titulo,
    texto,
    acao: opcoes.acao,
    duracaoMs: opcoes.duracaoMs ?? duracaoPadrao(tipo, Boolean(opcoes.acao)),
    repeticoes: 0,
    versao: proximaVersao++,
  };
  avisos = adicionarAviso(avisos, novo);
  emitir();
  return id;
}

export function dispensarAviso(id: number): void {
  const restantes = avisos.filter((aviso) => aviso.id !== id);
  if (restantes.length === avisos.length) return;
  avisos = restantes;
  emitir();
}

export function limparAvisos(): void {
  if (!avisos.length) return;
  avisos = [];
  emitir();
}

type OpcoesRapidas = Omit<OpcoesDeAviso, 'tipo' | 'texto'>;

/** Atalhos: `avisar.erro('Não foi possível salvar.')`. */
export const avisar = {
  sucesso: (texto: string, extra?: OpcoesRapidas) => notificar({ ...extra, tipo: 'sucesso', texto }),
  info: (texto: string, extra?: OpcoesRapidas) => notificar({ ...extra, tipo: 'info', texto }),
  aviso: (texto: string, extra?: OpcoesRapidas) => notificar({ ...extra, tipo: 'aviso', texto }),
  erro: (texto: string, extra?: OpcoesRapidas) => notificar({ ...extra, tipo: 'erro', texto }),
};

/** O texto de um erro capturado (`catch`) ou o recado padrão quando ele não traz mensagem. */
export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (erro instanceof Error && erro.message.trim()) return erro.message.trim();
  if (typeof erro === 'string' && erro.trim()) return erro.trim();
  if (erro && typeof erro === 'object' && 'message' in erro) {
    const texto = (erro as { message?: unknown }).message;
    if (typeof texto === 'string' && texto.trim()) return texto.trim();
  }
  return padrao;
}

/** Atalho para o `catch`: mostra o erro (ou o texto padrão) como aviso vermelho. */
export function avisarErro(erro: unknown, padrao: string): number {
  return avisar.erro(mensagemDeErro(erro, padrao));
}
