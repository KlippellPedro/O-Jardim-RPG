import {
  RARIDADES_RECURSO_MATERIAL,
  requisitoComponentesRitual,
  type ComplexidadeRitual,
  type RaridadeRecursoMaterial,
  type RecursoMaterialId,
} from '../../data/regras/recursos-materiais';

export type ClassePreparo = 'alquimista' | 'engenheiro' | 'cozinheiro';
export type EstoquePorRaridade = Partial<Record<RaridadeRecursoMaterial, number>>;
export type EstoquesMateriais = Partial<Record<RecursoMaterialId, number | EstoquePorRaridade>>;

interface IPreparoDaClasse {
  recurso: RecursoMaterialId;
  /** Primeiro nível de classe em que o preparo existe. */
  nivelInicial: number;
  rotulo: string;
}

/** As três classes que gastam 1 lote a cada descanso (regra em data/regras/recursos-materiais.ts). */
export const PREPAROS_POR_CLASSE: Record<ClassePreparo, IPreparoDaClasse> = {
  alquimista: { recurso: 'componentes-quimicos', nivelInicial: 1, rotulo: 'Alquimia: preparar as doses' },
  engenheiro: { recurso: 'sucata', nivelInicial: 3, rotulo: 'Engenharia: montar as engenhocas' },
  cozinheiro: { recurso: 'mantimentos', nivelInicial: 1, rotulo: 'Cozinha: fazer as porções' },
};

const indiceDaRaridade = (raridade: RaridadeRecursoMaterial) => RARIDADES_RECURSO_MATERIAL.indexOf(raridade);

/** Comum nos níveis 1-4 de classe, Incomum nos 5-8, Raro 9-12, Épico 13-16, Lendário 17-20. */
export function raridadeDoPreparo(classe: ClassePreparo, nivelDaClasse: number): RaridadeRecursoMaterial | null {
  const nivel = Math.trunc(Number(nivelDaClasse) || 0);
  if (nivel < PREPAROS_POR_CLASSE[classe].nivelInicial) return null;
  const degrau = Math.min(RARIDADES_RECURSO_MATERIAL.length - 1, Math.floor((nivel - 1) / 4));
  return RARIDADES_RECURSO_MATERIAL[degrau];
}

/** Estoque de um recurso; o contador antigo, sem raridade, vale como Comum. */
export function estoqueDoRecurso(estoques: EstoquesMateriais | undefined, recurso: RecursoMaterialId): EstoquePorRaridade {
  const salvo = estoques?.[recurso];
  if (typeof salvo === 'number') return { comum: Math.max(0, salvo) };
  return salvo && typeof salvo === 'object' ? salvo : {};
}

export function quantidadeAteRaridade(estoque: EstoquePorRaridade, minima: RaridadeRecursoMaterial): number {
  return RARIDADES_RECURSO_MATERIAL.slice(indiceDaRaridade(minima))
    .reduce((soma, raridade) => soma + Math.max(0, Number(estoque[raridade]) || 0), 0);
}

export interface IGasto {
  estoque: EstoquePorRaridade;
  /** O que saiu: um lote superior pode pagar por um inferior, e a tela mostra isso. */
  usados: Array<{ raridade: RaridadeRecursoMaterial; quantidade: number }>;
}

/** Tira `quantidade` lotes de raridade `minima` ou superior, começando pelos mais baratos.
 * Lotes inferiores nunca se somam para virar um superior. Devolve null se não houver o bastante. */
export function gastarLotes(estoque: EstoquePorRaridade, minima: RaridadeRecursoMaterial, quantidade: number): IGasto | null {
  if (quantidadeAteRaridade(estoque, minima) < quantidade) return null;
  const novo: EstoquePorRaridade = { ...estoque };
  const usados: IGasto['usados'] = [];
  let faltam = quantidade;
  for (const raridade of RARIDADES_RECURSO_MATERIAL.slice(indiceDaRaridade(minima))) {
    if (faltam <= 0) break;
    const tem = Math.max(0, Number(novo[raridade]) || 0);
    const tira = Math.min(tem, faltam);
    if (tira > 0) {
      novo[raridade] = tem - tira;
      usados.push({ raridade, quantidade: tira });
      faltam -= tira;
    }
  }
  return { estoque: novo, usados };
}

export interface IPreparoPendente {
  classe: ClassePreparo;
  recurso: RecursoMaterialId;
  raridade: RaridadeRecursoMaterial;
  nivel: number;
  /** Já foi pago neste descanso. */
  feito: boolean;
}

/** Quais preparos de classe a ficha tem e se cada um já foi pago depois do último descanso. */
export function preparosDaFicha(
  classes: Array<{ classeId: string; nivel: number }>,
  ficha: { contadorDescansos?: number; preparoDescanso?: Record<string, number> } | undefined,
): IPreparoPendente[] {
  const contador = Math.max(0, Math.trunc(Number(ficha?.contadorDescansos) || 0));
  const feitos = ficha?.preparoDescanso ?? {};
  const resultado: IPreparoPendente[] = [];
  (Object.keys(PREPAROS_POR_CLASSE) as ClassePreparo[]).forEach((classe) => {
    const nivel = classes.filter((item) => item.classeId === classe).reduce((maior, item) => Math.max(maior, Number(item.nivel) || 0), 0);
    const raridade = raridadeDoPreparo(classe, nivel);
    if (!raridade) return;
    resultado.push({ classe, recurso: PREPAROS_POR_CLASSE[classe].recurso, raridade, nivel, feito: feitos[classe] === contador });
  });
  return resultado;
}

export const COMPLEXIDADES_RITUAL: ComplexidadeRitual[] = ['simples', 'complexo', 'grandioso', 'monumental'];

/** O custo de um ritual pela complexidade: quantos lotes e de qual raridade. */
export function custoDoRitual(complexidade: ComplexidadeRitual) {
  const requisito = requisitoComponentesRitual(complexidade);
  return { quantidade: requisito.quantidade, raridade: requisito.raridade, titulo: requisito.titulo };
}

interface IReceitaParaCobertura {
  classe: string;
  raridade: string;
  custoRecurso?: { recurso: RecursoMaterialId; quantidade: number };
}

/** A receita cabe nos lotes do personagem agora? `null` quando a regra não se aplica a ele
 * (a classe da receita não é dele), para a tela não confundir "não posso" com "não é meu". */
export function receitaCobertaPorLotes(
  receita: IReceitaParaCobertura,
  estoques: EstoquesMateriais | undefined,
  classes: Array<{ classeId: string; nivel: number }>,
): boolean | null {
  const custo = receita.custoRecurso;
  if (!custo) return null;
  const estoque = estoqueDoRecurso(estoques, custo.recurso);
  if (receita.classe === 'ritualista') {
    return quantidadeAteRaridade(estoque, receita.raridade as RaridadeRecursoMaterial) >= custo.quantidade;
  }
  if (!(receita.classe in PREPAROS_POR_CLASSE)) return null;
  const nivel = classes.filter((item) => item.classeId === receita.classe).reduce((maior, item) => Math.max(maior, Number(item.nivel) || 0), 0);
  const raridadeDaClasse = raridadeDoPreparo(receita.classe as ClassePreparo, nivel);
  if (!raridadeDaClasse) return null;
  // A fórmula precisa estar ao alcance do nível, e o lote do descanso precisa existir.
  if (indiceDaRaridade(receita.raridade as RaridadeRecursoMaterial) > indiceDaRaridade(raridadeDaClasse)) return false;
  return quantidadeAteRaridade(estoque, raridadeDaClasse) >= custo.quantidade;
}
