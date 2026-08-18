import type { IClasse, IRaca } from '../types/catalogo';
import {
  obterEstagiosRaciaisAlcancados,
  obterOpcaoRacialSelecionada,
  obterTracosRaciaisDisponiveis,
} from './racaService';

export const ATRIBUTOS = ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'] as const;
export type TAtributo = typeof ATRIBUTOS[number];
export type TMetodoAtributos = 'padrao' | 'pontos' | 'rolado';

export const ROTULOS_ATRIBUTOS: Record<TAtributo, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

// O conjunto padrão custa exatamente 24 pontos quando todos os sete
// atributos começam em 8: (15-8)+(14-8)+(13-8)+(12-8)+(10-8) = 24.
export const VALORES_ATRIBUTOS_PADRAO = [15, 14, 13, 12, 10, 8, 8] as const;
export const COMPRA_PONTOS_ORCAMENTO = 24;
export const COMPRA_PONTOS_BASE = 8;
export const COMPRA_PONTOS_MAXIMO = 15;
export const ATRIBUTO_VALOR_MINIMO = 1;
export const ATRIBUTO_VALOR_MAXIMO = 20;
export const GRAUS_PERICIA = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'] as const;
export const BONUS_GRAU: Record<string, number> = {
  iniciante: 0,
  aprendiz: 2,
  treinado: 4,
  especialista: 6,
  mestre: 8,
  veterano: 10,
  renomado: 12,
};

export function distribuirValoresAtributos(valores: readonly number[]): Record<TAtributo, number> {
  return Object.fromEntries(ATRIBUTOS.map((atributo, indice) => [
    atributo,
    Number(valores[indice]) || COMPRA_PONTOS_BASE,
  ])) as Record<TAtributo, number>;
}

export function criarCompraPontosVazia(): Record<TAtributo, number> {
  return distribuirValoresAtributos(ATRIBUTOS.map(() => COMPRA_PONTOS_BASE));
}

export function calcularPontosAtributos(atribuicao: Record<string, number>): number {
  return ATRIBUTOS.reduce(
    (total, atributo) => total + (Number(atribuicao?.[atributo]) - COMPRA_PONTOS_BASE),
    0,
  );
}

export function compraPontosValida(atribuicao: Record<string, number>): boolean {
  const valoresValidos = ATRIBUTOS.every((atributo) => {
    const valor = Number(atribuicao?.[atributo]);
    return Number.isInteger(valor) && valor >= COMPRA_PONTOS_BASE && valor <= COMPRA_PONTOS_MAXIMO;
  });
  return valoresValidos && calcularPontosAtributos(atribuicao) === COMPRA_PONTOS_ORCAMENTO;
}

export function conjuntoAtributosValido(
  atribuicao: Record<string, number>,
  valores: readonly number[],
): boolean {
  const atribuidos = ATRIBUTOS.map(atributo => Number(atribuicao?.[atributo])).sort((a, b) => a - b);
  const esperados = [...valores].map(Number).sort((a, b) => a - b);
  return atribuidos.length === esperados.length
    && atribuidos.every((valor, indice) => Number.isInteger(valor) && valor === esperados[indice]);
}

export function rolarAtributos(): number[] {
  return Array.from({ length: ATRIBUTOS.length }, () => 1 + Math.floor(Math.random() * 20));
}

export function rolagemAtributosPermitida(_isMestre: boolean): boolean {
  return true;
}

export function modificador(valor: number | string): number {
  return Math.floor(((Number(valor) || 0) - 10) / 2);
}

export function bonusTesteAtributo(valor: number | string, penalidadeAtiva = 0): number {
  return modificador(valor) + (Number(penalidadeAtiva) || 0);
}

export function normalizarAtributosIniciais(atribuicao: Record<string, number>): Record<TAtributo, number> {
  const finais = {} as Record<TAtributo, number>;
  ATRIBUTOS.forEach(chave => {
    const base = Number(atribuicao?.[chave]) || 0;
    finais[chave] = Math.max(
      ATRIBUTO_VALOR_MINIMO,
      Math.min(ATRIBUTO_VALOR_MAXIMO, base),
    );
  });
  return finais;
}

export function obterVarianteRacial(raca: IRaca | null, escolhaRacial: any = {}) {
  return obterOpcaoRacialSelecionada(raca, escolhaRacial);
}

function somarMapasNumericos(...mapas: any[]) {
  const chaves = new Set(mapas.flatMap(mapa => Object.keys(mapa || {})));
  return Object.fromEntries([...chaves].flatMap(chave => {
    const total = mapas.reduce((soma, mapa) => soma + (Number(mapa?.[chave]) || 0), 0);
    return total === 0 ? [] : [[chave, total]];
  }));
}

export function obterAjustesAtributosRaciais(raca: IRaca, escolhaRacial: any = {}) {
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const configuracao = raca?.escolha_atributos;
  const campo = String(configuracao?.campo || 'atributosRaciais');
  const total = Math.max(0, Math.trunc(Number(configuracao?.total) || 0));
  const bonus = Number(configuracao?.bonus_por_escolha) || 0;
  
  const rawChoices = Array.isArray(escolhaRacial?.[campo]) ? escolhaRacial[campo] : [];
  const escolhas = [...new Set(rawChoices.filter((a: any) => ATRIBUTOS.includes(a as TAtributo)))].slice(0, total);
  
  const ajustesEscolhidos = Object.fromEntries(escolhas.map(atributo => [atributo, bonus]));
  return somarMapasNumericos(
    raca?.ajustes_atributos,
    variante?.ajustes_atributos,
    ajustesEscolhidos,
  );
}

export function obterLimitesAtributosRaciais(raca: IRaca, escolhaRacial: any = {}) {
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const configuracao = raca?.escolha_atributos;
  const campo = String(configuracao?.campo || 'atributosRaciais');
  const total = Math.max(0, Math.trunc(Number(configuracao?.total) || 0));
  const limite = Number(configuracao?.limite);
  const escolhas = [...new Set(
    (Array.isArray(escolhaRacial?.[campo]) ? escolhaRacial[campo] : [])
      .filter((atributo: unknown): atributo is TAtributo => ATRIBUTOS.includes(atributo as TAtributo)),
  )].slice(0, total);
  const limitesEscolhidos = Number.isFinite(limite)
    ? Object.fromEntries(escolhas.map(atributo => [atributo, limite]))
    : {};
  return {
    ...(raca?.limites_atributos || {}),
    ...(variante?.limites_atributos || {}),
    ...limitesEscolhidos,
  } as Record<string, number>;
}

export function obterFragmentosRaciaisConhecidos(raca: IRaca | null, escolhaRacial: any = {}) {
  if (!Array.isArray(raca?.fragmentos)) return [];
  const porId = new Map(raca.fragmentos.map((fragmento: any) => [fragmento.id, fragmento]));
  const maximo = Math.max(0, Math.trunc(Number(raca.fragmentos_config?.conhecidos_maximo) || 0));
  return [...new Set(
    (Array.isArray(escolhaRacial?.fragmentosConhecidosIds) ? escolhaRacial.fragmentosConhecidosIds : [])
      .map((id: unknown) => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, maximo).map(id => porId.get(id)).filter(Boolean) as any[];
}

export function obterFragmentosRaciaisExpressos(raca: IRaca | null, escolhaRacial: any = {}) {
  const conhecidos = obterFragmentosRaciaisConhecidos(raca, escolhaRacial);
  const porId = new Map(conhecidos.map((fragmento: any) => [fragmento.id, fragmento]));
  const maximo = Math.max(0, Math.trunc(Number(raca?.fragmentos_config?.expressos) || 0));
  return [...new Set(
    (Array.isArray(escolhaRacial?.fragmentosExpressosIds) ? escolhaRacial.fragmentosExpressosIds : [])
      .map((id: unknown) => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, maximo).map(id => porId.get(id)).filter(Boolean) as any[];
}

export function capacidadeModificacoesRaciais(raca: IRaca | null, nivel = 1) {
  if (!Array.isArray(raca?.modificacoes)) return 0;
  const base = Math.max(0, Math.trunc(Number(raca.capacidade_modificacoes?.base) || 0));
  const nivelPorSlot = Math.max(1, Math.trunc(Number(raca.capacidade_modificacoes?.nivel_por_slot) || 2));
  return base + Math.floor(Math.max(1, Number(nivel) || 1) / nivelPorSlot);
}

export function obterModificacoesRaciaisInstaladas(raca: IRaca | null, escolhaRacial: any = {}, nivel = 1) {
  if (!Array.isArray(raca?.modificacoes)) return [];
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const porId = new Map(raca.modificacoes.map((modificacao: any) => [modificacao.id, modificacao]));
  const ids = [...new Set(
    (Array.isArray(escolhaRacial?.modificacoesIds) ? escolhaRacial.modificacoesIds : [])
      .map((id: unknown) => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, capacidadeModificacoesRaciais(raca, nivel));
  const candidatas = ids
    .map(id => porId.get(id) as any)
    .filter(Boolean)
    .filter(item => Math.max(1, Number(nivel) || 1) >= Math.max(1, Number(item.nivel_minimo) || 1))
    .filter(item => !item.postura_exigida || item.postura_exigida === variante?.postura);
  const passivas = candidatas.filter(item => item.categoria === 'passiva').length;
  return candidatas.filter(item => item.categoria !== 'ativa'
    || passivas >= Math.max(0, Number(item.passivas_exigidas) || 0));
}

export function obterAjustesPericiasRaciais(raca: IRaca | null, escolhaRacial: any = {}) {
  const condicao = Array.isArray(raca?.condicoes_ancestrais)
    ? raca.condicoes_ancestrais.find((item: any) => item.id === escolhaRacial?.condicaoAncestralId)
    : null;
  const fragmentos = obterFragmentosRaciaisExpressos(raca, escolhaRacial);
  const mapas = [
    raca?.ajustes_pericias || {},
    condicao?.ajustes_pericias || {},
    ...fragmentos.map((fragmento: any) => fragmento.ajustes_pericias || {}),
  ];
  const chaves = new Set(mapas.flatMap(mapa => Object.keys(mapa)));
  return Object.fromEntries([...chaves].flatMap(chave => {
    const total = mapas.reduce((soma, mapa) => soma + (Number(mapa[chave]) || 0), 0);
    return total === 0 ? [] : [[chave, total]];
  })) as Record<string, number>;
}

export function aplicarAjusteAtributoRacial(valorBase: number, ajuste = 0, limite: number | null = null) {
  const base = Number(valorBase) || 0;
  const bonus = Number(ajuste);
  if (!Number.isFinite(bonus) || bonus === 0) return base;

  const teto = Number(limite);
  if (!Number.isFinite(teto) || bonus < 0) {
    return Math.max(ATRIBUTO_VALOR_MINIMO, base + bonus);
  }
  return Math.max(
    ATRIBUTO_VALOR_MINIMO,
    base + Math.min(bonus, Math.max(0, teto - base)),
  );
}

export function aplicarAjustesAtributosRaciais(atributosFinais: Record<string, number>, raca: IRaca, escolhaRacial: any = {}) {
  const ajustes = obterAjustesAtributosRaciais(raca, escolhaRacial);
  const limites = obterLimitesAtributosRaciais(raca, escolhaRacial);
  return Object.fromEntries(ATRIBUTOS.map(chave => [
    chave,
    aplicarAjusteAtributoRacial(
      atributosFinais?.[chave],
      ajustes[chave],
      limites[chave],
    ),
  ]));
}

export const TABELA_XP = Array.from(
  { length: 100 },
  (_, indice) => 500 * (indice + 1) * indice,
);

export function nivelPorXp(xp: number) {
  const valor = typeof xp === 'number' && xp >= 0 ? xp : 0;
  let nivel = 1;
  TABELA_XP.forEach((limite, indice) => {
    if (valor >= limite) nivel = indice + 1;
  });
  return nivel;
}

function calcularDerivadosBase(
  atributosFinais: Record<string, number>,
  raca: IRaca | null,
  nivel = 1,
  escolhaRacial: any = {},
  limitarRecursos = true,
) {
  const atributosEfetivos = raca ? aplicarAjustesAtributosRaciais(atributosFinais, raca, escolhaRacial) : atributosFinais;
  const metadeNivel = Math.floor(Math.max(1, Number(nivel) || 1) / 2);
  
  const modDestreza = modificador(atributosEfetivos.destreza);
  const modConstituicao = modificador(atributosEfetivos.constituicao);
  const modSabedoria = modificador(atributosEfetivos.sabedoria);
  
  const varianteRacial = obterVarianteRacial(raca, escolhaRacial);
  const fragmentosExpressos = obterFragmentosRaciaisExpressos(raca, escolhaRacial);
  
  // Estágios raciais (Espírito Menor/Maior/Primordial) se acumulam: quem chegou
  // no Primordial continua somando o que o Maior deu.
  const estagiosRaciais = obterEstagiosRaciaisAlcancados(raca, nivel);
  const somaEstagios = (campo: 'vida' | 'mana' | 'movimento' | 'defesa') => estagiosRaciais
    .reduce((total: number, estagio: any) => total + (Number(estagio?.[campo]) || 0), 0);

  const baseVidaRaca = Number(raca?.vida) || 0;
  const baseVidaVariante = Number(varianteRacial?.vida) || 0;
  const bonusVidaRacial = baseVidaRaca + baseVidaVariante + somaEstagios('vida');

  const baseManaRaca = Number(raca?.mana) || 0;
  const baseManaVariante = Number(varianteRacial?.mana) || 0;
  const bonusManaRacial = baseManaRaca + baseManaVariante + somaEstagios('mana')
    + fragmentosExpressos.reduce((total, fragmento: any) => total + (Number(fragmento.mana) || 0), 0);

  // Traços raciais já destravados podem declarar Defesa e Movimento (Crosta e
  // Núcleo do Auleth Planeta, Trajetória do Cometa). Somar aqui, e não só no
  // objeto da opção, é o que permite um estágio conceder os dois.
  const tracosRaciais = obterTracosRaciaisDisponiveis(raca, escolhaRacial, nivel);
  const somaTracos = (campo: 'defesa' | 'movimento') => tracosRaciais
    .reduce((total: number, traco: any) => total + (Number(traco?.[campo]) || 0), 0);

  const baseMovimentoRaca = Number(raca?.movimento) || 0;
  const baseMovimentoVariante = Number(varianteRacial?.movimento) || 0;
  const bonusMovimentoRacial = baseMovimentoRaca + baseMovimentoVariante
    + somaEstagios('movimento') + somaTracos('movimento');

  const bonusVidaVariantePorNivel = (Number(varianteRacial?.vida_por_nivel) || 0) * Math.max(1, Number(nivel) || 1);
  const modificacoes = obterModificacoesRaciaisInstaladas(raca, escolhaRacial, nivel);
  const bonusVidaModificacoes = modificacoes.reduce(
    (total: number, item: any) => total + ((Number(item.vida_por_nivel) || 0) * Math.max(1, Number(nivel) || 1)),
    0,
  );
  const bonusMovimentoModificacoes = modificacoes.reduce(
    (total: number, item: any) => total + (Number(item.movimento) || 0),
    0,
  );
  const bonusDefesaModificacoes = modificacoes.reduce((total: number, item: any) => (
    total + (Number(item.defesa) || 0) + (Number(item.defesa_por_tamanho?.[varianteRacial?.tamanho]) || 0)
  ), 0);
  const bonusDefesaFragmentos = fragmentosExpressos.reduce(
    (total: number, fragmento: any) => total + (Number(fragmento.defesa) || 0),
    0,
  );
  // Ectoplasma Denso do Espírito Marrom, Placas Cristalinas do Slime, Pele de
  // Rocha do Gigante: quem não veste armadura precisa que o pacote racial
  // apareça na Defesa Natural.
  const bonusDefesaRacial = somaTracos('defesa');

  const movimentoFixo = Number(varianteRacial?.movimento_fixo);
  const movimentoBase = Number.isFinite(movimentoFixo)
    ? movimentoFixo
    : 9 + (1.5 * modDestreza) + bonusMovimentoRacial;

  const vidaBase = (4 * modConstituicao) + bonusVidaRacial + bonusVidaVariantePorNivel + bonusVidaModificacoes;
  const manaBase = (3 * modSabedoria) + bonusManaRacial;

  return {
    vida: limitarRecursos ? Math.max(1, vidaBase) : vidaBase,
    mana: limitarRecursos ? Math.max(1, manaBase) : manaBase,
    movimento: Math.max(4.5, movimentoBase + bonusMovimentoModificacoes),
    defesaNatural: 10 + metadeNivel + modDestreza + bonusDefesaModificacoes + bonusDefesaFragmentos + bonusDefesaRacial,
    iniciativa: 10 + metadeNivel + modDestreza,
  };
}

export function calcularDerivados(atributosFinais: Record<string, number>, raca: IRaca | null, nivel = 1, escolhaRacial: any = {}) {
  return calcularDerivadosBase(atributosFinais, raca, nivel, escolhaRacial);
}

export function calcularDerivadosComClasses(
  atributosFinais: Record<string, number>,
  raca: IRaca | null,
  classesPersonagem: Array<{ id?: string; classeId?: string; nivel?: number }>,
  catalogoClasses: IClasse[],
  nivelDeReferencia: number | null = null,
  escolhaRacial: any = {},
) {
  const classes = Array.isArray(classesPersonagem) ? classesPersonagem : [];
  const catalogo = new Map((catalogoClasses || []).map(classe => [classe.id, classe]));
  const nivelTotal = classes.reduce(
    (total, classe) => total + Math.max(0, Math.trunc(Number(classe?.nivel) || 0)),
    0,
  );
  const nivelParaEscala = nivelDeReferencia !== null
    && nivelDeReferencia !== undefined
    && Number.isFinite(Number(nivelDeReferencia))
    ? Math.max(1, Number(nivelDeReferencia))
    : Math.max(1, nivelTotal);
  const derivados = calcularDerivadosBase(atributosFinais, raca, nivelParaEscala, escolhaRacial, false);
  let vida = derivados.vida;
  let mana = derivados.mana;
  let recursosDefinidos = true;

  classes.forEach((referencia) => {
    const classe = catalogo.get(String(referencia.classeId || referencia.id || ''));
    if (!classe) {
      recursosDefinidos = false;
      return;
    }
    const niveisComGanho = Math.max(0, Math.trunc(Number(referencia.nivel) || 0));
    vida += niveisComGanho * Math.max(1, Number(classe.vida));
    mana += niveisComGanho * Math.max(1, Number(classe.mana));
  });

  return {
    ...derivados,
    vida: Math.max(1, vida),
    mana: Math.max(1, mana),
    recursosDefinidos,
  };
}
