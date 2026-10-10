import { CATALOGO_AFLICOES, type IAflicao, type IPeriodoAflicao } from '../../data/regras/aflicoes';

/**
 * Aflições que o personagem carrega (ficha.aflicoesAtivas). A regra está em
 * data/regras/aflicoes.ts: o teste de Fortitude é rolado no servidor como
 * qualquer outro teste da ficha, e aqui só se aplica o grau que voltou.
 */

export type GrauTeste = 'sucesso critico' | 'sucesso' | 'falha' | 'falha critica';

export interface ITesteAflicao {
  quando: string;
  motivo: 'exposicao' | 'intervalo' | 'nova-exposicao';
  natural: number;
  total: number;
  grau: GrauTeste;
  de: number;
  para: number;
}

export interface IAflicaoAtiva {
  /** Id da instância (a mesma aflição pode voltar depois de curada). */
  id: string;
  aflicaoId: string;
  estagio: number;
  desde: string;
  /** Ainda na incubação: o estágio só começa a valer quando ela passa. */
  incubando: boolean;
  ultimoTeste?: ITesteAflicao | null;
}

const AFLICAO_POR_ID = new Map(CATALOGO_AFLICOES.map((aflicao) => [aflicao.id, aflicao]));

export const aflicaoPorId = (id: string): IAflicao | undefined => AFLICAO_POR_ID.get(id);

export const estagioMaximo = (aflicao: IAflicao): number => Math.max(...aflicao.estagios.map((estagio) => estagio.numero));

const GRAUS: GrauTeste[] = ['sucesso critico', 'sucesso', 'falha', 'falha critica'];

export function grauValido(valor: unknown): GrauTeste | null {
  return GRAUS.includes(valor as GrauTeste) ? (valor as GrauTeste) : null;
}

export function normalizarAflicoesAtivas(valor: unknown): IAflicaoAtiva[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const bruto = item as Record<string, unknown>;
    const aflicao = typeof bruto.aflicaoId === 'string' ? aflicaoPorId(bruto.aflicaoId) : undefined;
    if (!aflicao) return [];
    const estagio = Math.max(1, Math.min(estagioMaximo(aflicao), Math.trunc(Number(bruto.estagio) || 1)));
    return [{
      id: typeof bruto.id === 'string' && bruto.id ? bruto.id : `${aflicao.id}-${Date.now().toString(36)}`,
      aflicaoId: aflicao.id,
      estagio,
      desde: typeof bruto.desde === 'string' ? bruto.desde : new Date().toISOString(),
      incubando: bruto.incubando === true,
      ultimoTeste: bruto.ultimoTeste && typeof bruto.ultimoTeste === 'object' ? bruto.ultimoTeste as ITesteAflicao : null,
    }];
  });
}

/** Estágio depois da exposição: sucesso evita, falha entra no 1, falha crítica no 2. */
export function estagioDaExposicao(aflicao: IAflicao, grau: GrauTeste): number {
  if (grau === 'falha critica') return Math.min(2, estagioMaximo(aflicao));
  if (grau === 'falha') return 1;
  return 0;
}

/** Fim do intervalo: crítico desce 1, sucesso mantém, falha sobe 1, falha crítica sobe 2. */
export function estagioDoIntervalo(aflicao: IAflicao, atual: number, grau: GrauTeste): number {
  const passo = grau === 'sucesso critico'
    ? aflicao.progressao.sucessoCritico
    : grau === 'sucesso'
      ? aflicao.progressao.sucesso
      : grau === 'falha'
        ? aflicao.progressao.falha
        : aflicao.progressao.falhaCritica;
  return Math.max(0, Math.min(estagioMaximo(aflicao), atual + passo));
}

/** Nova exposição à mesma aflição: falha sobe 1 estágio na hora (uma vez por cena). */
export function estagioDaNovaExposicao(aflicao: IAflicao, atual: number, grau: GrauTeste): number {
  return grau === 'falha' || grau === 'falha critica'
    ? Math.min(estagioMaximo(aflicao), atual + 1)
    : atual;
}

/** Cansaço que os estágios dão ao entrar ("Ganhe 1 Cansaço."), somando cada
 * estágio atravessado entre `de` e `para`. Descer de estágio não devolve nada. */
export function cansacoAoEntrar(aflicao: IAflicao, de: number, para: number): number {
  if (para <= de) return 0;
  return aflicao.estagios
    .filter((estagio) => estagio.numero > de && estagio.numero <= para)
    .flatMap((estagio) => estagio.aoEntrar ?? [])
    .reduce((total, texto) => {
      const casamento = texto.match(/Ganhe (\d+) Cansaço/i);
      return total + (casamento ? Number(casamento[1]) : 0);
    }, 0);
}

export const CANSACO_MAXIMO = 6;

/** Perda de Sanidade que os estágios cobram ao entrar ("Perca 1d4 de Sanidade."), uma fórmula por estágio
 * atravessado entre `de` e `para`. Descer de estágio não cobra nada. */
export function sanidadeAoEntrar(aflicao: IAflicao, de: number, para: number): string[] {
  if (para <= de) return [];
  return aflicao.estagios
    .filter((estagio) => estagio.numero > de && estagio.numero <= para)
    .flatMap((estagio) => estagio.aoEntrar ?? [])
    .flatMap((texto) => {
      const casamento = texto.match(/Perca (\d*d\d+|\d+) de Sanidade/i);
      return casamento ? [casamento[1].toLowerCase()] : [];
    });
}

const ATRIBUTO_POR_NOME: Record<string, string> = {
  'Força': 'forca',
  Destreza: 'destreza',
  'Constituição': 'constituicao',
  'Inteligência': 'inteligencia',
  Sabedoria: 'sabedoria',
  Carisma: 'carisma',
};

/** A drenagem de uma aflição nunca passa disso (regra de Venenos, Doenças e Vícios). */
export const DRENAGEM_MAXIMA_POR_AFLICAO = 3;

export interface IDrenagemAtiva {
  aflicaoId: string;
  titulo: string;
  /** Id do atributo da ficha (forca, constituicao...). */
  atributo: string;
  /** Valor negativo que entra no atributo. */
  valor: number;
}

/**
 * Drenagens de atributo em vigor na ficha. Vale só a do estágio atual (não acumula entre estágios), só depois
 * da incubação, e no máximo −3 por aflição. Ao chegar ao estágio 0 a aflição sai da lista e o atributo volta.
 */
export function drenagensAtivas(valor: unknown): IDrenagemAtiva[] {
  return normalizarAflicoesAtivas(valor).flatMap((ativa) => {
    if (ativa.incubando) return [];
    const aflicao = AFLICAO_POR_ID.get(ativa.aflicaoId);
    const drenagem = aflicao?.estagios.find((estagio) => estagio.numero === ativa.estagio)?.drenagemAtributo;
    const atributo = drenagem ? ATRIBUTO_POR_NOME[drenagem.atributo] : undefined;
    if (!aflicao || !drenagem || !atributo || !(drenagem.valor > 0)) return [];
    return [{
      aflicaoId: aflicao.id,
      titulo: aflicao.titulo,
      atributo,
      valor: -Math.min(DRENAGEM_MAXIMA_POR_AFLICAO, drenagem.valor),
    }];
  });
}

export function efeitosDoEstagio(aflicao: IAflicao, estagio: number) {
  return aflicao.estagios.find((item) => item.numero === estagio) ?? { numero: estagio, efeitos: [] };
}

const UNIDADES: Record<IPeriodoAflicao['unidade'], [string, string]> = {
  rodada: ['rodada', 'rodadas'],
  minuto: ['minuto', 'minutos'],
  hora: ['hora', 'horas'],
  dia: ['dia', 'dias'],
};

export function textoDoPeriodo(periodo: IPeriodoAflicao): string {
  const [singular, plural] = UNIDADES[periodo.unidade];
  return `${periodo.quantidade} ${periodo.quantidade === 1 ? singular : plural}`;
}

/** Aviso (nunca bloqueio) quando a raça declara imunidade. Texto exato da regra de Imunidades. */
export function avisoDeImunidade(racaId: string | undefined, aflicao: IAflicao): string | null {
  if (racaId === 'auleth' && aflicao.tipo === 'doenca') return 'Auleth é imune a doenças comuns e sobrenaturais.';
  if (racaId === 'golem' && aflicao.tipo === 'doenca' && aflicao.classificacao === 'comum') return 'Golem não contrai doenças comuns.';
  if (racaId === 'automato' && (aflicao.tipo === 'doenca' || aflicao.tipo === 'veneno')) {
    return 'Autômato é imune a doenças e venenos enquanto não tiver Máquina Viva.';
  }
  return null;
}

export function novaAflicaoAtiva(aflicao: IAflicao, estagio: number, teste: ITesteAflicao | null): IAflicaoAtiva {
  const incubacao = aflicao.incubacao.quantidade > 0;
  return {
    id: `${aflicao.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    aflicaoId: aflicao.id,
    estagio,
    desde: new Date().toISOString(),
    incubando: incubacao,
    ultimoTeste: teste,
  };
}

/** Forma curta que a Sessão ao Vivo mostra no card do personagem. */
export function resumoParaSessao(valor: unknown): Array<{ titulo: string; estagio: number; maximo: number; incubando: boolean }> {
  return normalizarAflicoesAtivas(valor).map((ativa) => {
    const aflicao = aflicaoPorId(ativa.aflicaoId)!;
    return { titulo: aflicao.titulo, estagio: ativa.estagio, maximo: estagioMaximo(aflicao), incubando: ativa.incubando };
  });
}
