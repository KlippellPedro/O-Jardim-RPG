import type { RaridadeCraftingId } from './crafting';
import type { UsoMaterial } from './materiais';

export type RecursoMaterialId =
  | 'componentes-quimicos'
  | 'componentes-ritualisticos'
  | 'componentes-veiculares'
  | 'sucata'
  | 'mantimentos'
  | 'materia-prima';

export type RaridadeRecursoMaterial = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export const RARIDADES_RECURSO_MATERIAL: RaridadeRecursoMaterial[] = [
  'comum',
  'incomum',
  'raro',
  'epico',
  'lendario',
];

export const ROTULO_RARIDADE_RECURSO: Record<RaridadeRecursoMaterial, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

export type ComplexidadeRitual = 'simples' | 'complexo' | 'grandioso' | 'monumental';

/** Rituais não possuem círculo nem nível próprio. A complexidade escrita no
 * catálogo é a única régua que decide quantidade e raridade dos componentes. */
export const COMPONENTE_RITUALISTICO_POR_COMPLEXIDADE: Array<{
  complexidade: ComplexidadeRitual;
  titulo: string;
  quantidade: number;
  raridade: RaridadeRecursoMaterial;
}> = [
  { complexidade: 'simples', titulo: 'Simples', quantidade: 1, raridade: 'incomum' },
  { complexidade: 'complexo', titulo: 'Complexo', quantidade: 1, raridade: 'raro' },
  { complexidade: 'grandioso', titulo: 'Grandioso', quantidade: 2, raridade: 'epico' },
  { complexidade: 'monumental', titulo: 'Monumental', quantidade: 2, raridade: 'lendario' },
];

export function requisitoComponentesRitual(complexidade: string) {
  const requisito = COMPONENTE_RITUALISTICO_POR_COMPLEXIDADE.find(
    (item) => item.complexidade === complexidade.toLocaleLowerCase('pt-BR'),
  );
  if (!requisito) throw new RangeError(`Complexidade de ritual inválida: ${complexidade}`);
  return requisito;
}

export function raridadeComponentePorComplexidadeRitual(complexidade: string): RaridadeRecursoMaterial {
  return requisitoComponentesRitual(complexidade).raridade;
}

export const COMPONENTE_QUIMICO_POR_NIVEL_FORMULA: Array<{
  nivelFormula: number;
  niveisAlquimista: string;
  raridade: RaridadeRecursoMaterial;
}> = [
  { nivelFormula: 1, niveisAlquimista: '1–4', raridade: 'comum' },
  { nivelFormula: 2, niveisAlquimista: '5–8', raridade: 'incomum' },
  { nivelFormula: 3, niveisAlquimista: '9–12', raridade: 'raro' },
  { nivelFormula: 4, niveisAlquimista: '13–16', raridade: 'epico' },
  { nivelFormula: 5, niveisAlquimista: '17–20', raridade: 'lendario' },
];

export function raridadeComponentePorNivelFormula(nivelFormula: number): RaridadeRecursoMaterial {
  const nivel = Math.max(1, Math.min(5, Math.trunc(Number(nivelFormula) || 1)));
  return COMPONENTE_QUIMICO_POR_NIVEL_FORMULA[nivel - 1].raridade;
}

export const SUCATA_POR_NIVEL_PROJETO: Array<{
  nivelProjeto: number;
  niveisEngenheiro: string;
  raridade: RaridadeRecursoMaterial;
}> = [
  { nivelProjeto: 1, niveisEngenheiro: '3–4', raridade: 'comum' },
  { nivelProjeto: 2, niveisEngenheiro: '5–8', raridade: 'incomum' },
  { nivelProjeto: 3, niveisEngenheiro: '9–12', raridade: 'raro' },
  { nivelProjeto: 4, niveisEngenheiro: '13–16', raridade: 'epico' },
  { nivelProjeto: 5, niveisEngenheiro: '17–20', raridade: 'lendario' },
];

export function raridadeSucataPorNivelProjeto(nivelProjeto: number): RaridadeRecursoMaterial {
  const nivel = Math.max(1, Math.min(5, Math.trunc(Number(nivelProjeto) || 1)));
  return SUCATA_POR_NIVEL_PROJETO[nivel - 1].raridade;
}

export const MANTIMENTO_POR_NIVEL_RECEITA: Array<{
  nivelReceita: number;
  niveisCozinheiro: string;
  raridade: RaridadeRecursoMaterial;
}> = [
  { nivelReceita: 1, niveisCozinheiro: '1–4', raridade: 'comum' },
  { nivelReceita: 2, niveisCozinheiro: '5–8', raridade: 'incomum' },
  { nivelReceita: 3, niveisCozinheiro: '9–12', raridade: 'raro' },
  { nivelReceita: 4, niveisCozinheiro: '13–16', raridade: 'epico' },
  { nivelReceita: 5, niveisCozinheiro: '17–20', raridade: 'lendario' },
];

export function raridadeMantimentoPorNivelReceita(nivelReceita: number): RaridadeRecursoMaterial {
  const nivel = Math.max(1, Math.min(5, Math.trunc(Number(nivelReceita) || 1)));
  return MANTIMENTO_POR_NIVEL_RECEITA[nivel - 1].raridade;
}

export function normalizarRaridadeRecurso(raridade: RaridadeCraftingId): RaridadeRecursoMaterial {
  return raridade === 'reliquia' || raridade === 'reliquia da criacao' ? 'lendario' : raridade;
}

/** A manutenção acompanha a raridade do veículo, não a raridade dos módulos.
 * Relíquias usam o maior lote controlado na ficha para não criar um sexto
 * patamar dentro de um único estoque. */
export function raridadeComponenteVeicular(raridadeVeiculo: RaridadeCraftingId): RaridadeRecursoMaterial {
  return normalizarRaridadeRecurso(raridadeVeiculo);
}

/** Um veículo custa um lote por mês de uso. Cada módulo de utilidade
 * instalado aumenta esse custo em um lote, mesmo que esteja desligado. */
export function custoManutencaoVeiculo(modulosUtilidadeInstalados: number): number {
  const modulos = Math.max(0, Math.trunc(Number(modulosUtilidadeInstalados) || 0));
  return 1 + modulos;
}

export interface RecursoMaterial {
  id: RecursoMaterialId;
  titulo: string;
  singular: string;
  resumo: string;
  regra: string;
  exemplos: string;
  usoOrigem: UsoMaterial;
}

/** Os únicos seis estoques que jogadores precisam controlar. Materiais
 * nomeados continuam existindo como parte da história, tesouro e mercadoria,
 * mas viram um destes lotes quando entram numa atividade. Os quatro estoques
 * de classe e os Componentes Veiculares não se misturam. Somente Matéria-prima
 * pode aceitar materiais que também aparecem em outro catálogo. */
export const RECURSOS_MATERIAIS: RecursoMaterial[] = [
  {
    id: 'componentes-quimicos',
    titulo: 'Componentes Químicos',
    singular: 'Componente Químico',
    resumo: 'Reagentes, extratos, pós, ácidos e essências usados pela Alquimia.',
    regra: 'Gaste 1 lote da raridade do nível atual das suas fórmulas. Um lote abastece todas as doses do descanso.',
    exemplos: 'Ervas medicinais, venenos, sais, óleos, sangue preservado e essências elementais.',
    usoOrigem: 'alquimia',
  },
  {
    id: 'componentes-ritualisticos',
    titulo: 'Componentes Ritualísticos',
    singular: 'Componente Ritualístico',
    resumo: 'Símbolos, oferendas, focos e catalisadores consumidos por rituais.',
    regra: 'Simples: 1 Incomum. Complexo: 1 Raro. Grandioso: 2 Épicos. Monumental: 2 Lendários.',
    exemplos: 'Velas, incensos, inscrições, amostras pessoais, pedras marcadas e essências espirituais.',
    usoOrigem: 'ritual',
  },
  {
    id: 'componentes-veiculares',
    titulo: 'Componentes Veiculares',
    singular: 'Componente Veicular',
    resumo: 'Peças de reposição, fluidos e sistemas preparados para manter veículos em operação.',
    regra: 'Por mês em que o veículo for usado, gaste 1 lote da raridade dele, mais 1 lote por módulo de utilidade instalado.',
    exemplos: 'Filtros, juntas de casco, células de energia, atuadores, sistemas de navegação e peças de propulsão.',
    usoOrigem: 'veiculos',
  },
  {
    id: 'sucata',
    titulo: 'Sucata',
    singular: 'Sucata',
    resumo: 'Peças, fios, placas, molas e partes reaproveitáveis para Engenharia.',
    regra: 'Gaste 1 lote da raridade do nível atual dos seus projetos. Um lote abastece todas as engenhocas do descanso.',
    exemplos: 'Engrenagens, cabos, placas metálicas, mecanismos quebrados, circuitos e parafusos.',
    usoOrigem: 'engenharia',
  },
  {
    id: 'mantimentos',
    titulo: 'Mantimentos',
    singular: 'Mantimento',
    resumo: 'Comida, bebida, temperos e ingredientes conservados para a Cozinha.',
    regra: 'Gaste 1 lote da raridade do nível atual das suas receitas. Um lote abastece todas as porções do descanso.',
    exemplos: 'Grãos, ervas, carne, frutas, conservas, especiarias e água potável.',
    usoOrigem: 'cozinha',
  },
  {
    id: 'materia-prima',
    titulo: 'Matéria-prima',
    singular: 'Matéria-prima',
    resumo: 'Materiais resistentes usados em armas, armaduras e outras criações permanentes.',
    regra: 'Gaste de 1 a 6 lotes conforme a raridade do item. Este é o único estoque que também pode aproveitar itens escolhidos dos outros catálogos.',
    exemplos: 'Tábuas, lingotes, couro tratado, fibras, cristais, ossos e algumas peças ou substâncias especiais.',
    usoOrigem: 'forja',
  },
];

export const RECURSO_MATERIAL_POR_ID = new Map(
  RECURSOS_MATERIAIS.map((recurso) => [recurso.id, recurso]),
);

export const RECURSO_POR_USO: Record<UsoMaterial, RecursoMaterialId> = {
  alquimia: 'componentes-quimicos',
  ritual: 'componentes-ritualisticos',
  veiculos: 'componentes-veiculares',
  engenharia: 'sucata',
  cozinha: 'mantimentos',
  forja: 'materia-prima',
};

export const CUSTO_MATERIA_PRIMA_POR_RARIDADE: Record<RaridadeCraftingId, number> = {
  comum: 1,
  incomum: 1,
  raro: 2,
  epico: 3,
  lendario: 4,
  reliquia: 5,
  'reliquia da criacao': 6,
};

export function recursosDeUsos(usos: UsoMaterial[]): RecursoMaterialId[] {
  return [...new Set(usos.map((uso) => RECURSO_POR_USO[uso]))];
}

export function custoComponentesRitual(complexidade: string): number {
  return requisitoComponentesRitual(complexidade).quantidade;
}
