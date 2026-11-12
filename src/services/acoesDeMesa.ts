import {
  caracteristicasRaciaisAutomaticas,
  habilidadesAutomaticas,
  habilidadesJardimSelecionadas,
  legadosSelecionados,
  poderesJardimSelecionados,
  poderesSelecionados,
  type IConteudoAutomatico,
} from './progressaoFichaService';

/**
 * O que um personagem pode fazer na mesa, separado pelo tipo de ação. Serve ao
 * Modo mesa: do nível 40 em diante a ficha passa de 80 itens, e na hora do
 * turno só importa o que pede decisão. Passivos e o que é de fora de combate
 * ficam contados à parte. Nada aqui muda a ficha.
 */

export type TipoAcaoMesa = 'padrao' | 'completa' | 'movimento' | 'reacao' | 'livre' | 'passivo' | 'fora';
export type JanelaDeUso = 'rodada' | 'cena' | 'descanso' | 'sessao' | 'dia';
export type FonteAcaoMesa = 'habilidade' | 'escolha' | 'poder' | 'raca' | 'legado' | 'jardim';

export interface IAcaoMesa {
  id: string;
  titulo: string;
  origem: string;
  fonte: FonteAcaoMesa;
  tipo: TipoAcaoMesa;
  /** O texto da ação como o catálogo escreve, para mostrar a nuance ("antes do ataque"). */
  acao: string;
  descricao: string;
  custoMana: number;
  custoEstamina: number;
  /** Limite de uso com contador, quando o texto declara um. */
  limite: { vezes: number; janela: JanelaDeUso; rotulo: string } | null;
}

export interface IGrupoAcoesMesa {
  tipo: TipoAcaoMesa;
  rotulo: string;
  itens: IAcaoMesa[];
}

export const ROTULO_TIPO_MESA: Record<TipoAcaoMesa, string> = {
  padrao: 'Ação',
  completa: 'Completa',
  movimento: 'Movimento',
  reacao: 'Reação',
  livre: 'Livre',
  passivo: 'Passivos',
  fora: 'Fora de combate',
};

/** Ordem dos grupos que pedem decisão no turno. */
export const ORDEM_TIPOS_MESA: readonly TipoAcaoMesa[] = ['padrao', 'completa', 'movimento', 'reacao', 'livre'];

const FORA_DE_COMBATE = /minuto|hora|\bdia\b|oficina|descanso|fora de combate|\brito\b|recado|escolhid|instalad|declarad|redigir|servir/i;

/** Tipo de ação a partir do texto do catálogo. Sem ação declarada, um item com
 * limite de uso é um gatilho que o jogador decide usar (vai junto das livres);
 * sem limite, é passivo. */
export function classificarAcaoMesa(acao: string | undefined, temLimite = false): TipoAcaoMesa {
  const texto = String(acao || '').trim();
  if (!texto) return temLimite ? 'livre' : 'passivo';
  if (/^passiv/i.test(texto)) return 'passivo';
  if (/^rea[cç][aã]o/i.test(texto)) return 'reacao';
  if (/^a[cç][aã]o livre/i.test(texto)) return 'livre';
  if (/^a[cç][aã]o padr[aã]o/i.test(texto)) return 'padrao';
  if (/^a[cç][aã]o de movimento/i.test(texto)) return 'movimento';
  if (/^a[cç][aã]o completa/i.test(texto)) return FORA_DE_COMBATE.test(texto) ? 'fora' : 'completa';
  if (FORA_DE_COMBATE.test(texto)) return 'fora';
  return 'livre';
}

const NUMEROS: Record<string, number> = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, 'três': 3, quatro: 4, cinco: 5 };
const LIMITE_POR_EXTENSO = /\b(uma|um|duas|dois|tr[eê]s|quatro|cinco|\d+)\s+vez(?:es)?\s+por\s+(turno|rodada|cena|combate|descanso(?:\s+longo|\s+curto)?|sess[aã]o|dia|rito)\b/i;
const LIMITE_CURTO = /\b(\d+)\s*\/\s*(turno|rodada|cena|combate|descanso|sess[aã]o|dia)\b/i;

function janelaDoTexto(texto: string): JanelaDeUso | null {
  const t = texto.toLowerCase();
  if (t.startsWith('turno') || t.startsWith('rodada')) return 'rodada';
  if (t.startsWith('cena') || t.startsWith('combate') || t.startsWith('rito')) return 'cena';
  if (t.startsWith('descanso')) return 'descanso';
  if (t.startsWith('sess')) return 'sessao';
  if (t.startsWith('dia')) return 'dia';
  return null;
}

const ROTULO_JANELA: Record<JanelaDeUso, string> = {
  rodada: 'por rodada',
  cena: 'por cena',
  descanso: 'por descanso',
  sessao: 'por sessão',
  dia: 'por dia',
};

/** Limite de uso ("Uma vez por cena", "2/descanso") no campo de usos ou, se
 * faltar, no começo da descrição. */
export function lerLimiteMesa(usos?: string, descricao?: string): IAcaoMesa['limite'] {
  for (const texto of [usos, descricao?.slice(0, 160)]) {
    if (!texto) continue;
    const longo = texto.match(LIMITE_POR_EXTENSO);
    const curto = longo ? null : texto.match(LIMITE_CURTO);
    const achado = longo || curto;
    if (!achado) continue;
    const bruto = achado[1].toLowerCase();
    const vezes = NUMEROS[bruto] ?? Number(bruto);
    const janela = janelaDoTexto(achado[2]);
    if (!janela || !Number.isFinite(vezes) || vezes < 1) continue;
    return { vezes: Math.min(10, vezes), janela, rotulo: `${vezes}× ${ROTULO_JANELA[janela]}` };
  }
  return null;
}

/** Legado não declara ação; a descrição diz quando ele pede uma. */
function acaoDoTexto(descricao: string): string | undefined {
  const achado = descricao.match(/\b(Rea[cç][aã]o|A[cç][aã]o Livre|A[cç][aã]o Padr[aã]o|A[cç][aã]o de Movimento|A[cç][aã]o Completa)\b/i);
  return achado ? achado[1] : undefined;
}

function deConteudo(item: IConteudoAutomatico, fonte: FonteAcaoMesa): IAcaoMesa {
  const limite = lerLimiteMesa(item.usos, item.descricao);
  return {
    id: item.id,
    titulo: item.titulo,
    origem: item.origem,
    fonte,
    tipo: classificarAcaoMesa(item.acao, Boolean(limite)),
    acao: item.acao || '',
    descricao: item.descricao,
    custoMana: Math.max(0, Number(item.custoMana) || 0),
    custoEstamina: Math.max(0, Number(item.custoEstamina) || 0),
    limite,
  };
}

/** Tudo o que a ficha tem, já classificado. */
export function acoesDeMesa(ficha: any): IAcaoMesa[] {
  const lista: IAcaoMesa[] = [
    ...habilidadesAutomaticas(ficha).map((item) => deConteudo(item, item.subtipo === 'escolha' ? 'escolha' : 'habilidade')),
    ...poderesSelecionados(ficha).map((item) => deConteudo(item, 'poder')),
    ...poderesJardimSelecionados(ficha).map((item) => deConteudo(item, 'jardim')),
    ...habilidadesJardimSelecionadas(ficha).map((item) => deConteudo(item, 'jardim')),
    ...caracteristicasRaciaisAutomaticas(ficha).map((item) => deConteudo(item, 'raca')),
    ...legadosSelecionados(ficha).map((legado, indice) => deConteudo({
      id: `legado:${legado.id}:${indice}`,
      titulo: legado.titulo,
      descricao: legado.descricao,
      origem: 'Legado',
      nivel: 0,
      ...(acaoDoTexto(legado.descricao) ? { acao: acaoDoTexto(legado.descricao) } : {}),
    }, 'legado')),
  ];
  const vistos = new Set<string>();
  return lista.filter((item) => (vistos.has(item.id) ? false : (vistos.add(item.id), true)));
}

/** Grupos do turno (só os que têm itens), mais quantos ficaram de fora. */
export function agruparAcoesMesa(lista: IAcaoMesa[]): { grupos: IGrupoAcoesMesa[]; passivos: IAcaoMesa[]; fora: IAcaoMesa[] } {
  const porTitulo = (a: IAcaoMesa, b: IAcaoMesa) => a.origem.localeCompare(b.origem, 'pt-BR') || a.titulo.localeCompare(b.titulo, 'pt-BR');
  const grupos = ORDEM_TIPOS_MESA
    .map((tipo) => ({ tipo, rotulo: ROTULO_TIPO_MESA[tipo], itens: lista.filter((item) => item.tipo === tipo).sort(porTitulo) }))
    .filter((grupo) => grupo.itens.length > 0);
  return {
    grupos,
    passivos: lista.filter((item) => item.tipo === 'passivo').sort(porTitulo),
    fora: lista.filter((item) => item.tipo === 'fora').sort(porTitulo),
  };
}

/** Contadores de uso marcados na mesa: id da ação -> vezes usadas. */
export type UsosMarcados = Record<string, number>;

/** Zera os contadores de uma janela e das menores (descansar zera a cena; nova
 * sessão zera tudo). Rodada não tem contador: é só lembrete. */
export function zerarUsos(usos: UsosMarcados, lista: IAcaoMesa[], ate: 'cena' | 'descanso' | 'sessao'): UsosMarcados {
  const janelas: Record<typeof ate, JanelaDeUso[]> = {
    cena: ['cena'],
    descanso: ['cena', 'descanso'],
    sessao: ['cena', 'descanso', 'sessao', 'dia'],
  };
  const zerar = new Set(lista.filter((item) => item.limite && janelas[ate].includes(item.limite.janela)).map((item) => item.id));
  return Object.fromEntries(Object.entries(usos).filter(([id, vezes]) => !zerar.has(id) && vezes > 0));
}

/** Marca um uso, sem passar do limite. Devolve o mesmo objeto se não couber. */
export function marcarUso(usos: UsosMarcados, item: IAcaoMesa): UsosMarcados {
  if (!item.limite || item.limite.janela === 'rodada') return usos;
  const atual = usos[item.id] || 0;
  if (atual >= item.limite.vezes) return usos;
  return { ...usos, [item.id]: atual + 1 };
}

export function desmarcarUso(usos: UsosMarcados, item: IAcaoMesa): UsosMarcados {
  const atual = usos[item.id] || 0;
  if (atual <= 0) return usos;
  const proximo = { ...usos };
  if (atual === 1) delete proximo[item.id];
  else proximo[item.id] = atual - 1;
  return proximo;
}

export function usosRestantes(usos: UsosMarcados, item: IAcaoMesa): number | null {
  if (!item.limite || item.limite.janela === 'rodada') return null;
  return Math.max(0, item.limite.vezes - (usos[item.id] || 0));
}

/** Filtro de busca por título, origem ou texto, sem acento. */
export function filtrarAcoesMesa(lista: IAcaoMesa[], busca: string): IAcaoMesa[] {
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const alvo = normalizar(busca.trim());
  if (!alvo) return lista;
  return lista.filter((item) => normalizar(`${item.titulo} ${item.origem} ${item.descricao}`).includes(alvo));
}
