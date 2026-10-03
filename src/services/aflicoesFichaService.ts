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
