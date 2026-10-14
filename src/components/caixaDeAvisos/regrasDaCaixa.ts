import type { IAviso } from '../../services/avisosApi';

/** Regras puras da caixa de avisos: agrupar por dia, quebrar o negrito do texto e achar para onde o aviso leva. */

export type GrupoDeDia = 'hoje' | 'ontem' | 'semana' | 'antes';

const ORDEM_DOS_GRUPOS: GrupoDeDia[] = ['hoje', 'ontem', 'semana', 'antes'];
const ROTULO_DO_GRUPO: Record<GrupoDeDia, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  semana: 'Esta semana',
  antes: 'Mais antigos',
};

const MS_POR_DIA = 86_400_000;

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

/** Em que bloco do dia o aviso cai. Data ilegível vai para "Mais antigos"; relógio adiantado conta como hoje. */
export function grupoDoDia(iso: string, agora: Date = new Date()): GrupoDeDia {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'antes';
  // `round` absorve os dias de 23 e 25 horas da virada do horário de verão.
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / MS_POR_DIA);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return 'semana';
  return 'antes';
}

export interface IGrupoDeAvisos {
  chave: GrupoDeDia;
  rotulo: string;
  avisos: IAviso[];
}

/** Mantém a ordem recebida (o servidor manda do mais novo para o mais velho) dentro de cada bloco e esconde os vazios. */
export function agruparPorDia(avisos: IAviso[], agora: Date = new Date()): IGrupoDeAvisos[] {
  const blocos = new Map<GrupoDeDia, IAviso[]>();
  for (const aviso of avisos) {
    const chave = grupoDoDia(aviso.criado_em, agora);
    const lista = blocos.get(chave);
    if (lista) lista.push(aviso);
    else blocos.set(chave, [aviso]);
  }
  return ORDEM_DOS_GRUPOS
    .filter((chave) => blocos.has(chave))
    .map((chave) => ({ chave, rotulo: ROTULO_DO_GRUPO[chave], avisos: blocos.get(chave) ?? [] }));
}

/** "14:32" para hoje e ontem (o bloco já diz o dia); "13 de out." para o resto, com o ano só quando é de outro ano. */
export function horaDoAviso(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const grupo = grupoDoDia(iso, agora);
  if (grupo === 'hoje' || grupo === 'ontem') {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const opcoes: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (data.getFullYear() !== agora.getFullYear()) opcoes.year = 'numeric';
  return data.toLocaleDateString('pt-BR', opcoes);
}

/** O servidor escreve **assim** o que quer em destaque (nomes de personagem, item). Vira pedaços, nunca HTML. */
export function partirNegrito(texto: string): Array<{ texto: string; negrito: boolean }> {
  return texto
    .split(/\*\*(.+?)\*\*/g)
    .map((parte, indice) => ({ texto: parte, negrito: indice % 2 === 1 }))
    .filter((parte) => parte.texto !== '');
}

export const ROTULO_DA_CATEGORIA: Record<string, string> = {
  conta: 'Conta',
  campanha: 'Campanha',
  conteudo: 'Conteúdo',
  economia: 'Economia',
  sessao: 'Sessão',
};

export function rotuloDaCategoria(categoria: string): string {
  return ROTULO_DA_CATEGORIA[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

/**
 * Reivindicação de recompensa sem resposta é fila do Mestre, não recado: ela não se marca como lida aqui,
 * sai quando o Mestre aprova ou recusa na Loja (o servidor também a protege).
 */
export function ehPendencia(aviso: Pick<IAviso, 'dados'>): boolean {
  const dados = aviso.dados;
  return Boolean(dados) && dados?.tipo === 'claim_recompensa' && dados?.status === 'pendente';
}

export interface IDestinoDoAviso {
  rotulo: string;
  caminho: string;
}

const TITULOS_DE_FICHA_DO_MESTRE = [
  'Alerta de Regras na Criação',
  'Alerta de Regras na Ficha',
  'Jogador alterou classe/XP na ficha',
  'Personagem passou do nível padrão',
  'Personagem entrou num patamar novo',
];

/**
 * Para onde um clique no aviso leva. Só os avisos que têm um lugar óbvio ganham atalho; o resto fica sem botão
 * em vez de apontar para um lugar qualquer. As rotas com `?aba=` abrem a aba certa do painel.
 */
export function destinoDoAviso(aviso: Pick<IAviso, 'categoria' | 'painel' | 'titulo' | 'dados'>): IDestinoDoAviso | null {
  const { titulo } = aviso;
  if (aviso.dados?.tipo === 'claim_recompensa') return { rotulo: 'Resolver na Loja', caminho: '/loja' };

  if (aviso.painel === 'admin') {
    return titulo === 'Pedido de senha nova' ? { rotulo: 'Ver pedidos de senha', caminho: '/admin?aba=pedidos' } : null;
  }
  if (aviso.painel === 'mestre') {
    if (titulo.endsWith(' entrou na campanha')) return { rotulo: 'Ver membros', caminho: '/mestre?aba=mesa' };
    if (TITULOS_DE_FICHA_DO_MESTRE.includes(titulo)) return { rotulo: 'Ver personagens', caminho: '/mestre?aba=personagens' };
    if (titulo.startsWith('Infração na loja')) return { rotulo: 'Ver os logs', caminho: '/mestre?aba=logs' };
    return null;
  }

  if (aviso.categoria === 'economia' && titulo === 'Recompensa nova no seu cofre') return { rotulo: 'Abrir o Cofre', caminho: '/cofre' };
  if (aviso.categoria === 'sessao' && (titulo === 'A sessão começou' || titulo === 'A sessão está chegando')) {
    return { rotulo: 'Ir para a Sessão', caminho: '/sessao' };
  }
  return null;
}
