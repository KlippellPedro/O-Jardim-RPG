import magiasData from '../../data/ficha/magias.json';
import marcasData from '../../data/ficha/marcas-de-circulo.json';
import setesData from '../../data/ficha/pecados-e-virtudes.json';
import { ARVORES } from '../../data/mundo/arvoresCatalog';
import { vantagensDoGrau } from './progressaoNiveis';
import { BONUS_GRAU, aplicarAjustesAtributosRaciais, modificador, obterAjustesPericiasRaciais } from './calculoService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from './catalogoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from './ajustesFichaService';
import { resumirEquipamentos } from './equipamentoService';
import { dtPadraoDoVd, vdValido } from './curvaCriatura';

export type CirculoMagia = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'ritual';
export type FluxoMagicoId = 'origem' | 'essencia' | 'comunicacao' | 'vitalidade' | 'inconstancia'
  | 'fisico' | 'espaco' | 'tempo' | 'vazio' | 'fim' | 'tecnologia';

/** Uma magia universal não pertence a Fluxo nenhum: qualquer Fluxo a aprende e o
 * efeito muda conforme quem canaliza. Por isso ela não entra em FLUXO_TEMAS nem
 * na contagem por Fluxo do catálogo. */
export type FluxoDeMagia = FluxoMagicoId | 'universal';

export interface FluxoTema {
  arvore: string;
  base: string;
  destaque: string;
  texto: string;
  fundo: string;
  borda: string;
  brilho: string;
}

const rgbParaHex = (rgb: string): string => `#${rgb
  .split(',')
  .map((canal) => Math.max(0, Math.min(255, Number(canal) || 0)).toString(16).padStart(2, '0'))
  .join('')}`;

const corArvore = (arvoreId: string, subjugada = false): string => {
  const arvore = ARVORES.find((item) => item.id === arvoreId);
  const rgb = subjugada ? arvore?.subjugada?.rgb : arvore?.rgb;
  return rgbParaHex(rgb || '160,160,170');
};

/** Paleta canônica das Árvores aplicada às manifestações mágicas.
 * Comunicação conserva o prata da Parley subjugada; Tecnologia usa o
 * azul-neon da A.X.I.S. O Vazio fica no preto de Erebus, com contorno cinza
 * apenas para continuar legível sobre o fundo escuro do site. */
export const FLUXO_TEMAS: Record<FluxoMagicoId, FluxoTema> = {
  origem: {
    arvore: 'Gênese', base: corArvore('aethel'), destaque: '#ef9fbe', texto: '#f5bfd4',
    fundo: 'rgba(214, 120, 156, 0.12)', borda: 'rgba(214, 120, 156, 0.45)', brilho: 'rgba(214, 120, 156, 0.22)',
  },
  essencia: {
    arvore: 'Alétheia', base: corArvore('ousias'), destaque: '#f0dc78', texto: '#f4e89f',
    fundo: 'rgba(222, 198, 88, 0.12)', borda: 'rgba(222, 198, 88, 0.45)', brilho: 'rgba(222, 198, 88, 0.2)',
  },
  comunicacao: {
    arvore: 'Parley', base: corArvore('keryx', true), destaque: '#dce1e7', texto: '#e8ebef',
    fundo: 'rgba(192, 198, 206, 0.1)', borda: 'rgba(192, 198, 206, 0.4)', brilho: 'rgba(192, 198, 206, 0.18)',
  },
  vitalidade: {
    arvore: 'Anima', base: corArvore('haemus'), destaque: '#79d17f', texto: '#a8e7ac',
    fundo: 'rgba(86, 172, 92, 0.12)', borda: 'rgba(86, 172, 92, 0.45)', brilho: 'rgba(86, 172, 92, 0.22)',
  },
  inconstancia: {
    arvore: 'Vórtice', base: corArvore('ignis'), destaque: '#f39555', texto: '#ffc08f',
    fundo: 'rgba(222, 114, 42, 0.12)', borda: 'rgba(222, 114, 42, 0.48)', brilho: 'rgba(222, 114, 42, 0.22)',
  },
  fisico: {
    arvore: 'Baluarte', base: corArvore('moros'), destaque: '#b48258', texto: '#d8b38f',
    fundo: 'rgba(116, 82, 52, 0.18)', borda: 'rgba(180, 130, 88, 0.42)', brilho: 'rgba(116, 82, 52, 0.28)',
  },
  espaco: {
    arvore: 'Matriz', base: corArvore('aperion'), destaque: '#ad7de1', texto: '#cfaff0',
    fundo: 'rgba(132, 84, 188, 0.14)', borda: 'rgba(132, 84, 188, 0.5)', brilho: 'rgba(132, 84, 188, 0.24)',
  },
  tempo: {
    arvore: 'Éon', base: corArvore('chronus'), destaque: '#cfad63', texto: '#e4cc91',
    fundo: 'rgba(168, 138, 72, 0.14)', borda: 'rgba(168, 138, 72, 0.48)', brilho: 'rgba(168, 138, 72, 0.22)',
  },
  vazio: {
    arvore: 'O Vazio', base: corArvore('erebus'), destaque: '#77707f', texto: '#d1ccd8',
    fundo: 'rgba(10, 9, 13, 0.88)', borda: 'rgba(119, 112, 127, 0.55)', brilho: 'rgba(0, 0, 0, 0.72)',
  },
  fim: {
    arvore: 'Limiar', base: corArvore('mulher-carmesim'), destaque: '#d24b66', texto: '#f09bad',
    fundo: 'rgba(134, 28, 48, 0.18)', borda: 'rgba(210, 75, 102, 0.48)', brilho: 'rgba(134, 28, 48, 0.3)',
  },
  tecnologia: {
    arvore: 'A.X.I.S', base: corArvore('keryx'), destaque: '#70edfa', texto: '#a6f4fb',
    fundo: 'rgba(53, 216, 236, 0.11)', borda: 'rgba(53, 216, 236, 0.48)', brilho: 'rgba(53, 216, 236, 0.22)',
  },
};

/** Magia universal não tem Árvore, então não herda paleta de nenhuma: usa um
 * prisma neutro, que é como ela aparece antes de um Fluxo canalizá-la. */
export const TEMA_UNIVERSAL: FluxoTema = {
  arvore: 'Universal', base: '#c9c4d6', destaque: '#e7e2f2', texto: '#f1eef8',
  fundo: 'rgba(201, 196, 214, 0.12)', borda: 'rgba(201, 196, 214, 0.45)', brilho: 'rgba(201, 196, 214, 0.22)',
};

export function temaDoFluxo(fluxoId: FluxoDeMagia): FluxoTema {
  return fluxoId === 'universal' ? TEMA_UNIVERSAL : FLUXO_TEMAS[fluxoId];
}

export interface IFluxoMagico {
  id: FluxoMagicoId;
  titulo: string;
  arvore_id: string | null;
  arvore: string;
  deidade: string;
  natureza: 'natural' | 'artificial';
  essencia: string;
  possibilidades: string[];
  limites: string[];
  aviso_mestre?: string;
}

export interface IFusaoFluxo {
  id: string;
  titulo: string;
  fluxo_secundario: FluxoMagicoId;
  efeito: string;
}

interface IManifestacaoMagicaBase {
  id: string;
  titulo: string;
  /** O que a manifestação é e o que se faz com ela, em linguagem de mesa. Vem
   * antes do `efeito` justamente para o jogador entender a cena antes da regra. */
  descricao: string;
  fluxo: FluxoMagicoId;
  custo_mana: number;
  efeito: string;
}

/** Item comprável na Loja (categoria "Componentes", tipo `drop`) que o ritual consome. */
export interface IIngredienteRitual {
  item_id: string;
  quantidade: number;
}

export interface IRitualCatalogo extends IManifestacaoMagicaBase {
  complexidade: string;
  dt: number;
  tempo: string;
  requisito: string;
  /** Materiais compráveis que o rito consome, além do que `requisito` já narra
   * (participantes, tempo, consentimento). Vazio quando o rito usa só o que já
   * está em cena (o próprio alvo, um vestígio, uma âncora feita por outro rito). */
  ingredientes?: IIngredienteRitual[];
  falha: string;
  aviso_mestre?: string;
}

export interface ISeloCatalogo extends IManifestacaoMagicaBase {
  grau: number;
  dt_inscricao: number;
  tempo: string;
  ativacao: string;
  aviso_mestre?: string;
}

export interface IEncantamentoCatalogo extends IManifestacaoMagicaBase {
  grau: number;
  dt: number;
  tempo: string;
  aplicacao: string;
  aviso_mestre?: string;
}

export interface IMagiaCatalogo {
  id: string;
  titulo: string;
  /** O que a magia é e como ela aparece na mesa, antes de o `efeito` dizer a
   * regra. Nas universais descreve o tronco comum, e não a variante do Fluxo. */
  descricao: string;
  circulo: CirculoMagia;
  tradicao: string;
  fluxo: FluxoDeMagia;
  /** Só nas universais: o efeito que cada Fluxo produz ao canalizar a magia. */
  efeitos_por_fluxo?: Record<FluxoMagicoId, string>;
  fontes_permitidas: string[];
  papel: string;
  perfil: 'alvo' | 'area' | 'defesa' | 'movimento' | 'controle' | 'ritual';
  custo_mana: number;
  execucao: string;
  alcance: string;
  alvo: string;
  duracao: string;
  concentracao: boolean;
  ataque: boolean;
  defesa: string | null;
  /** A resistência só é rolada por quem não quer o efeito ("Vontade, se hostil"). */
  somente_hostil?: boolean;
  dano?: string;
  efeito: string;
  somente_mestre?: boolean;
  aviso_mestre?: string;
}

export interface IPerfilMagico {
  possuiFonte: boolean;
  fontes: string[];
  fluxoNativoId: FluxoMagicoId | null;
  fluxoNativoTitulo: string | null;
  /** Fluxos que o Mestre instalou na ficha, além do nativo (ver fluxosInstaladosDaFicha). */
  fluxosInstaladosIds: FluxoMagicoId[];
  avisoFluxo?: string;
  nivelTotal: number;
  fluxo: number;
  modificadorFluxo: number;
  grauMisticismo: string;
  bonusConjuracao: number;
  componentesConjuracao: {
    modificadorFluxo: number;
    metadeDoNivel: number;
    grauMisticismo: number;
    racial: number;
    origem: number;
    ajustesManuais: number;
    equipamento: number;
  };
  vantagensConjuracao: number;
  desvantagensConjuracao: number;
  dtMagia: number;
  dtLimiteFluxo: number;
  circuloDaFonte: number;
  circuloDoFluxo: number;
  circuloMaximo: number;
  vagasConhecidas: number;
  /** Vagas de cada classe-fonte com o maior círculo que ela libera: a vaga só guarda magia até esse círculo. */
  vagasPorFonte: Array<{ circulo: number; vagas: number }>;
  /** Quantas magias do mesmo círculo a ficha pode conhecer; null quando nenhuma fonte declara teto. */
  tetoPorCirculo: number | null;
  possuiInterceptacao: boolean;
  nivelInterceptador: number;
  nivelSintonizador: number;
  limiteCatalisadores: number;
  catalisadoresPreparadosIds: FluxoMagicoId[];
  catalisadorAtivoId: FluxoMagicoId | null;
  /** Preparados já gastos numa fusão; voltam com os dez minutos de Sintonia Catalisada. */
  catalisadoresDesativadosIds: FluxoMagicoId[];
  conhecidasIds: string[];
  concedidasIds: string[];
  vagasRituais: number;
  rituaisConhecidosIds: string[];
  rituaisConcedidosIds: string[];
  vagasSelos: number;
  selosConhecidosIds: string[];
  selosConcedidosIds: string[];
  vagasEncantamentos: number;
  encantamentosConhecidosIds: string[];
  encantamentosConcedidosIds: string[];
}

export const MAGIAS_CATALOGO = (magiasData.magias as unknown as IMagiaCatalogo[]);
export const MAGIAS_POR_ID = new Map(MAGIAS_CATALOGO.map((magia) => [magia.id, magia]));
export const FLUXOS_CATALOGO = magiasData.fluxos as unknown as IFluxoMagico[];
export const FLUXOS_POR_ID = new Map(FLUXOS_CATALOGO.map((fluxo) => [fluxo.id, fluxo]));
export const FUSOES_CATALOGO = magiasData.fusoes as unknown as IFusaoFluxo[];
export const RITUAIS_CATALOGO = magiasData.rituais as unknown as IRitualCatalogo[];
export const RITUAIS_POR_ID = new Map(RITUAIS_CATALOGO.map((ritual) => [ritual.id, ritual]));
export const SELOS_CATALOGO = magiasData.selos as unknown as ISeloCatalogo[];
export const SELOS_POR_ID = new Map(SELOS_CATALOGO.map((selo) => [selo.id, selo]));
export const ENCANTAMENTOS_CATALOGO = magiasData.encantamentos as unknown as IEncantamentoCatalogo[];
export const ENCANTAMENTOS_POR_ID = new Map(ENCANTAMENTOS_CATALOGO.map((encantamento) => [encantamento.id, encantamento]));
export const AVISO_FLUXO_FIM = magiasData.regras.acesso_fim.aviso;
export const MAGIAS_UNIVERSAIS = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === 'universal');
const ACESSO_ELEMENTAL = magiasData.regras.acesso_elemental;
const MAGIAS_ELEMENTAIS_IDS = new Set<string>(ACESSO_ELEMENTAL.magias_elementais_ids);
const MAGIAS_AVATAR_IDS = new Set<string>(ACESSO_ELEMENTAL.magias_exclusivas_avatar_ids);

export const ELEMENTOS_FISICOS = ACESSO_ELEMENTAL.elementos as Array<'terra' | 'agua' | 'fogo' | 'ar' | 'raio' | 'luz' | 'escuridao'>;

export function magiaEhElemental(magia: IMagiaCatalogo): boolean {
  return magia.fluxo === 'fisico' && MAGIAS_ELEMENTAIS_IDS.has(magia.id);
}

export function magiaExigeAvatar(magia: IMagiaCatalogo): boolean {
  return magiaEhElemental(magia) && MAGIAS_AVATAR_IDS.has(magia.id);
}

export function magiaEhUniversal(magia: IMagiaCatalogo): boolean {
  return magia.fluxo === 'universal';
}

/** O texto que vale na mesa para esta ficha. Universal muda conforme o Fluxo que
 * canaliza; sem Fluxo definido, sobra só a descrição comum da magia. */
export function efeitoDaMagia(magia: IMagiaCatalogo, fluxoId: FluxoMagicoId | null): string {
  if (!magiaEhUniversal(magia) || !fluxoId) return magia.efeito;
  const variante = magia.efeitos_por_fluxo?.[fluxoId];
  return variante ? `${magia.efeito} ${variante}` : magia.efeito;
}

/** As onze manifestações de uma universal, para o Grimório mostrar lado a lado. */
export function variantesDaMagia(magia: IMagiaCatalogo): Array<{ fluxo: IFluxoMagico; efeito: string }> {
  if (!magiaEhUniversal(magia) || !magia.efeitos_por_fluxo) return [];
  return FLUXOS_CATALOGO.flatMap((fluxo) => {
    const efeito = magia.efeitos_por_fluxo?.[fluxo.id];
    return efeito ? [{ fluxo, efeito }] : [];
  });
}

/** "Cada alma nasce com um Fluxo natural, e só um" (Magia e Fluxo): o da Árvore
 * em que ela nasceu. A Árvore da A.X.I.S é a Parley de Keryx por baixo, então
 * quem nasce nela tem Comunicação; a Tecnologia nunca é nativa, só se instala
 * (ver FLUXO_DA_RACA e fluxosInstaladosDaFicha). */
const FLUXO_POR_ARVORE: Record<string, FluxoMagicoId> = {
  aethel: 'origem',
  ousias: 'essencia',
  keryx: 'comunicacao',
  haemus: 'vitalidade',
  ignis: 'inconstancia',
  moros: 'fisico',
  aperion: 'espaco',
  chronus: 'tempo',
  erebus: 'vazio',
  'mulher-carmesim': 'fim',
};
const CIRCULOS_CONFIG = (magiasData.regras?.circulos || []) as Array<{
  circulo: number;
  fluxo_minimo: number;
  dt_conjuracao: number;
}>;

const idsUnicos = (valor: unknown): string[] => [...new Set(
  (Array.isArray(valor) ? valor : [])
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean),
)];

const referenciasClasse = (ficha: any): Array<{ id: string; nivel: number }> => {
  const bruto = Array.isArray(ficha?.classes) && ficha.classes.length
    ? ficha.classes
    : ficha?.classeId ? [{ classeId: ficha.classeId, nivel: ficha.nivel || 1 }] : [];
  return bruto.flatMap((item: any) => {
    const id = String(item?.classeId || item?.id || '');
    if (!CLASSES_CATALOGO.some((classe) => classe.id === id)) return [];
    return [{ id, nivel: Math.max(1, Math.trunc(Number(item?.nivel) || 1)) }];
  });
};

const nivelDaClasse = (classes: Array<{ id: string; nivel: number }>, classeId: string): number => (
  classes.find((item) => item.id === classeId)?.nivel || 0
);

const idsEscolhidos = (ficha: any, chave: string): string[] => idsUnicos(ficha?.escolhasHabilidade?.[chave]);

export function elementosElementaristaDaFicha(ficha: any): string[] {
  return [...new Set([
    ...idsEscolhidos(ficha, 'elementarista:afinidade-elemental'),
    ...idsEscolhidos(ficha, 'elementarista:caminho-do-avatar'),
    // Compatibilidade com fichas montadas durante a primeira versão da classe.
    ...idsEscolhidos(ficha, 'elementarista:polifonia-elemental'),
  ])].filter((id) => ELEMENTOS_FISICOS.includes(id as (typeof ELEMENTOS_FISICOS)[number]));
}

export function possuiAptidaoAvatar(ficha: any): boolean {
  return idsEscolhidos(ficha, 'elementarista:julgamento-da-aptidao').includes('avatar-desperto');
}

/** Círculo que os níveis de Elementarista liberam, lido da progressão da
 * própria classe. É o teto das magias Elementais que a ficha aprende (decisão
 * de 2026-10-20): 1 nível de Elementarista sobre um Canalizador 20 não abre
 * as Elementais até o 10º só porque o Canalizador chega lá. */
/** Nível de Invocador da ficha. As invocações dele atacam com o teste de
 * conjuração (decisão de 2026-10-20), mesmo sem fonte de magia. */
export function nivelDeInvocador(ficha: any): number {
  return nivelDaClasse(referenciasClasse(ficha), 'invocador');
}

export function circuloDaElementarista(ficha: any): number {
  const nivel = nivelDaClasse(referenciasClasse(ficha), ACESSO_ELEMENTAL.classe_id);
  if (nivel < 1) return 0;
  const marcos = CLASSES_CATALOGO.find((item) => item.id === ACESSO_ELEMENTAL.classe_id)?.progressao_magia?.marcos || [];
  return marcos
    .filter((marco: any) => nivel >= Number(marco.nivel))
    .reduce((maior: number, marco: any) => Math.max(maior, Number(marco.circulo) || 0), 0);
}

function restricaoMagiaElemental(ficha: any, magia: IMagiaCatalogo): { permitido: boolean; motivo?: string } {
  if (!magiaEhElemental(magia)) return { permitido: true };
  if (nivelDaClasse(referenciasClasse(ficha), ACESSO_ELEMENTAL.classe_id) < 1) {
    return { permitido: false, motivo: 'Magias Elementais do Fluxo Físico exigem a classe Elementarista.' };
  }
  if (!elementosElementaristaDaFicha(ficha).length) {
    return { permitido: false, motivo: 'Escolha o elemento de origem da Elementarista antes de aprender esta magia.' };
  }
  if (magiaExigeAvatar(magia) && !possuiAptidaoAvatar(ficha)) {
    return { permitido: false, motivo: 'Esta magia combina vários elementos e exige Avatar desperto.' };
  }
  return { permitido: true };
}

const FLUXOS_CATALISAVEIS = new Set<FluxoMagicoId>([
  'origem', 'essencia', 'comunicacao', 'vitalidade', 'inconstancia',
  'fisico', 'espaco', 'tempo', 'vazio', 'fim',
]);

/** Fluxos que a ficha pode usar como catalisador: os dez naturais e, para o
 * Sintonizador, a Tecnologia quando o Mestre a instalou (decisão de
 * 2026-10-20). A calibração do Interceptador segue só com os naturais. */
export function fluxosCatalisaveisDaFicha(ficha: any): Set<FluxoMagicoId> {
  const permitidos = new Set(FLUXOS_CATALISAVEIS);
  if (nivelDaClasse(referenciasClasse(ficha), 'sintonizador') > 0 && fluxosInstaladosDaFicha(ficha).includes('tecnologia')) {
    permitidos.add('tecnologia');
  }
  return permitidos;
}

/** Catalisadores ficam na ficha como uma escolha operacional, separada da
 * fonte de magia. Para o Sintonizador eles habilitam Fusões; para o
 * Interceptador registram para qual Fluxo natural a interface A.X.I.S. está
 * calibrada. Em nenhum dos casos a escolha cria, sozinha, uma fonte.
 * Desativado é o preparado que já foi gasto numa fusão e só volta com os dez
 * minutos de Sintonia Catalisada. */
function obterCatalisadoresDaFicha(
  ficha: any,
  limite: number,
): { preparadosIds: FluxoMagicoId[]; ativoId: FluxoMagicoId | null; desativadosIds: FluxoMagicoId[] } {
  const configuracao = ficha?.catalisadoresFluxo;
  const permitidos = fluxosCatalisaveisDaFicha(ficha);
  const preparadosIds = idsUnicos(configuracao?.preparadosIds)
    .filter((id): id is FluxoMagicoId => permitidos.has(id as FluxoMagicoId))
    .slice(0, Math.max(0, limite));
  const ativoInformado = String(configuracao?.ativoId || '') as FluxoMagicoId;
  return {
    preparadosIds,
    ativoId: preparadosIds.includes(ativoInformado) ? ativoInformado : (preparadosIds[0] || null),
    desativadosIds: idsUnicos(configuracao?.desativadosIds)
      .filter((id): id is FluxoMagicoId => preparadosIds.includes(id as FluxoMagicoId)),
  };
}

/** Fusões que o Sintonizador pode usar agora: as que aprendeu em Fusão
 * Controlada (a primeira vem no nível 3), menos a do próprio Fluxo nativo,
 * porque o catalisador precisa ser de outro Fluxo. */
export function fusoesDaFicha(ficha: any): typeof FUSOES_CATALOGO {
  if (nivelDaClasse(referenciasClasse(ficha), 'sintonizador') < 3) return [];
  const aprendidas = new Set(idsUnicos(ficha?.escolhasHabilidade?.['sintonizador:fusao-controlada']));
  const nativo = obterFluxoNativoId(ficha);
  return FUSOES_CATALOGO.filter((fusao) => aprendidas.has(fusao.id) && fusao.fluxo_secundario !== nativo);
}

/** O Autômato não nasce: é montado na A.X.I.S, e o núcleo dele já é a Tecnologia
 * instalada. É a única raça cujo Fluxo vem do corpo, não da Árvore. */
const FLUXO_DA_RACA: Record<string, FluxoMagicoId> = { automato: 'tecnologia' };

const FLUXOS_NATURAIS_IDS = new Set(
  FLUXOS_CATALOGO.filter((fluxo) => fluxo.natureza !== 'artificial').map((fluxo) => fluxo.id),
);

/** Ordem: Árvore Universal não tem um nativo (ela atravessa todos), depois a
 * raça com Fluxo próprio, depois a Árvore. Ficha sem Árvore usa o Fluxo que o
 * Canalizador escolheu na Canalização Nativa, que só vale nesse caso. */
export function obterFluxoNativoId(ficha: any): FluxoMagicoId | null {
  const arvoreId = String(ficha?.arvoreId || '');
  if (arvoreId === 'universal') return null;
  const daRaca = FLUXO_DA_RACA[String(ficha?.racaId || '')];
  if (daRaca) return daRaca;
  const daArvore = FLUXO_POR_ARVORE[arvoreId];
  if (daArvore) return daArvore;
  if (nivelDaClasse(referenciasClasse(ficha), 'canalizador') <= 0) return null;
  const escolhido = idsEscolhidos(ficha, 'canalizador:canalizacao-nativa')[0];
  return escolhido && FLUXOS_NATURAIS_IDS.has(escolhido as FluxoMagicoId) ? escolhido as FluxoMagicoId : null;
}

/** Segundo Fluxo "sempre vem de fora, por artefato, relíquia ou núcleo
 * tecnológico, e nunca passa a morar na alma" (Magia e Fluxo, parte do Mestre).
 * Só o Mestre concede (o servidor recusa a mudança vinda do jogador). Abre as
 * magias, rituais, selos e encantamentos daquele Fluxo, mas não dá Marca de
 * círculo: a Marca é da alma, e o Fluxo instalado não mora nela. */
export function fluxosInstaladosDaFicha(ficha: any): FluxoMagicoId[] {
  const nativo = obterFluxoNativoId(ficha);
  return idsUnicos(ficha?.fluxosInstaladosIds)
    .filter((id): id is FluxoMagicoId => FLUXOS_POR_ID.has(id as FluxoMagicoId) && id !== nativo);
}

/** O Fluxo nativo ou um Fluxo instalado: o que a ficha pode aprender e conjurar. */
export const fluxoAcessivel = (perfil: Pick<IPerfilMagico, 'fluxoNativoId' | 'fluxosInstaladosIds'>, fluxoId: string): boolean => (
  fluxoId === perfil.fluxoNativoId || perfil.fluxosInstaladosIds.includes(fluxoId as FluxoMagicoId)
);

const titulosDosFluxos = (ids: FluxoMagicoId[]): string => ids.map((id) => FLUXOS_POR_ID.get(id)?.titulo || id).join(', ');

/** Motivo de recusa quando o Fluxo da entrada não é o nativo nem um instalado. */
const motivoForaDosFluxos = (perfil: IPerfilMagico, rotulo: string, fluxoTitulo: string): string => {
  if (!perfil.fluxoNativoId && !perfil.fluxosInstaladosIds.length) return 'Escolha uma Árvore para definir o Fluxo nativo da ficha.';
  const instalados = perfil.fluxosInstaladosIds.length ? `, e o Fluxo instalado, ${titulosDosFluxos(perfil.fluxosInstaladosIds)}` : '';
  return `${rotulo} pertence ao Fluxo ${fluxoTitulo}; seu Fluxo nativo é ${perfil.fluxoNativoTitulo || 'indefinido'}${instalados}.`;
};

export function obterFluxoNativo(ficha: any): IFluxoMagico | null {
  const id = obterFluxoNativoId(ficha);
  return id ? FLUXOS_POR_ID.get(id) || null : null;
}

export function circuloPermitidoPorFluxo(fluxo: unknown): number {
  const valor = Math.trunc(Number(fluxo) || 0);
  return [...CIRCULOS_CONFIG]
    .sort((a, b) => b.circulo - a.circulo)
    .find((item) => valor >= item.fluxo_minimo)?.circulo || 0;
}

export function dtConjuracaoPorCirculo(circulo: CirculoMagia | number): number {
  if (circulo === 'ritual') return 0;
  return CIRCULOS_CONFIG.find((item) => item.circulo === Number(circulo))?.dt_conjuracao || 0;
}

// Pacote Descartado, a interceptação do Interceptador (decisão de 2026-10-20):
// habilidade do nível 1; DT da magia (7 + 3 × círculo) ou, contra poder de
// criatura, a DT padrão do VD; +2 do nível 10 (Assinatura Reconhecida) e +5 com
// o Acesso Administrador ativo, que também tira 3 do custo.
export type AlvoDaInterceptacao = { tipo: 'magia'; circulo: number } | { tipo: 'criatura'; vd: number };

export interface IInterceptacao {
  dt: number;
  bonus: number;
  custoMana: number;
  rotulo: string;
  /** A Visão de Código (nível 20) rola a interceptação com vantagem. */
  vantagem: boolean;
}

const CUSTO_DO_PACOTE_DESCARTADO = Math.max(0, Number(
  CLASSES_CATALOGO.find((classe) => classe.id === 'interceptador')?.habilidades
    ?.find((habilidade) => habilidade.id === 'pacote-descartado')?.custo_mana,
) || 0);

/** Bônus da interceptação: +2 da Assinatura Reconhecida (10), +2 contra o Fluxo calibrado no Acesso à Malha,
 * +5 do Acesso Administrador (20). A Visão de Código (20) zera a Mana do Pacote e dá vantagem por três rodadas. */
export function interceptacaoDaFicha(
  nivelInterceptador: number,
  alvo: AlvoDaInterceptacao,
  opcoes: { bonusBase: number; administradorAtivo?: boolean; doFluxoCalibrado?: boolean; visaoDeCodigo?: boolean },
): IInterceptacao {
  const administrador = Boolean(opcoes.administradorAtivo) && nivelInterceptador >= 20;
  const visaoDeCodigo = Boolean(opcoes.visaoDeCodigo) && nivelInterceptador >= 20;
  const calibrado = Boolean(opcoes.doFluxoCalibrado) && nivelInterceptador >= 1;
  const circulo = alvo.tipo === 'magia' ? Math.min(10, Math.max(1, Math.trunc(alvo.circulo) || 1)) : 0;
  return {
    dt: alvo.tipo === 'magia' ? dtConjuracaoPorCirculo(circulo) : dtPadraoDoVd(alvo.vd),
    bonus: opcoes.bonusBase + (nivelInterceptador >= 10 ? 2 : 0) + (calibrado ? 2 : 0) + (administrador ? 5 : 0),
    custoMana: visaoDeCodigo ? 0 : Math.max(0, CUSTO_DO_PACOTE_DESCARTADO - (administrador ? 3 : 0)),
    rotulo: alvo.tipo === 'magia' ? `magia de ${circulo}º círculo` : `poder de criatura de VD ${vdValido(alvo.vd)}`,
    vantagem: visaoDeCodigo,
  };
}

// Convenção de ataque e resistência (decisão de 2026-10-20, tópico Magia e
// Fluxo): a magia de ataque lê o total contra a Defesa, e a resistência que ela
// lista vale só para o efeito extra; na magia de efeito, o alvo rola a
// resistência contra o total. "Se hostil" só é rolada por quem não quer o efeito.
type MagiaContraOAlvo = Pick<IMagiaCatalogo, 'ataque' | 'defesa' | 'dano' | 'somente_hostil'>;

// Tipo de dano das magias (decisão de 2026-10-20): a que não diz o tipo causa o
// dano do próprio Fluxo; a Tecnologia causa dano tecnológico; a universal causa
// o do Fluxo que a canaliza; o Físico sem elemento causa impacto.
function danoDoFluxo(fluxoId: FluxoMagicoId): string {
  if (fluxoId === 'tecnologia') return 'tecnológico';
  if (fluxoId === 'fisico') return 'de impacto';
  const titulo = FLUXOS_POR_ID.get(fluxoId)?.titulo || fluxoId;
  return `${fluxoId === 'fim' ? 'do' : 'de'} ${titulo}`;
}

const TIPO_SORTEADO = /Role (?:1d\d+[^.]*(?:tipo|fogo)|na tabela de Tipo)/i;

/** "de Vazio", "tecnológico", "do elemento declarado"...: o que vem depois de "Dano 2d8" no cartão. */
export function tipoDeDanoDaMagia(magia: IMagiaCatalogo, fluxoNativoId: FluxoMagicoId | null): string | null {
  if (!magia.dano) return null;
  if (magiaEhUniversal(magia)) {
    if (!fluxoNativoId) return 'do Fluxo que a canaliza';
    const variacao = String(magia.efeitos_por_fluxo?.[fluxoNativoId] || '');
    if (TIPO_SORTEADO.test(variacao)) return 'de tipo sorteado';
    if (/corte, perfuração ou impacto/i.test(variacao)) return 'de corte, perfuração ou impacto';
    return danoDoFluxo(fluxoNativoId);
  }
  if (magia.fluxo === 'fisico') return magiaEhElemental(magia) ? 'do elemento declarado' : 'de impacto';
  if (TIPO_SORTEADO.test(magia.efeito)) return 'de tipo sorteado';
  return danoDoFluxo(magia.fluxo as FluxoMagicoId);
}

function resistenciaDaMagia(magia: MagiaContraOAlvo): { nome: string; seHostil: boolean } | null {
  const nome = String(magia.defesa || '').trim();
  if (!nome) return null;
  return { nome, seHostil: Boolean(magia.somente_hostil) };
}

/** O campo Defesa como se lê no catálogo e no livro: "Vontade", "Vontade, se hostil" ou vazio. */
export function textoDaDefesa(magia: Pick<IMagiaCatalogo, 'defesa' | 'somente_hostil'>): string {
  const resistencia = resistenciaDaMagia({ ataque: false, ...magia });
  if (!resistencia) return '';
  return resistencia.seHostil ? `${resistencia.nome}, se hostil` : resistencia.nome;
}

/** Etiquetas do cartão da magia: contra o que ela é lida e o que a resistência faz. */
export function rotulosContraOAlvo(magia: MagiaContraOAlvo): string[] {
  const resistencia = resistenciaDaMagia(magia);
  if (magia.ataque) {
    return [
      'Contra a Defesa',
      ...(resistencia ? [`Efeito extra: ${resistencia.nome}`] : []),
      'Crítico no 20 natural',
    ];
  }
  if (!resistencia) return [];
  if (resistencia.seHostil) return [`Resistência: ${resistencia.nome}, se hostil`];
  return [magia.dano ? `Resistência: ${resistencia.nome}, metade do dano` : `Resistência: ${resistencia.nome}`];
}

/** Frase que acompanha o resultado da conjuração, dizendo como ler o total contra o alvo. */
export function leituraContraOAlvo(magia: MagiaContraOAlvo, resultado: number, defesaInformada = 0): string {
  const resistencia = resistenciaDaMagia(magia);
  if (magia.ataque) {
    const extra = resistencia ? `alvo rola ${resistencia.nome} contra ${resultado} para evitar o efeito extra.` : '';
    if (defesaInformada <= 0) return `Compare com a Defesa do alvo.${extra ? ` Se acertar, o ${extra}` : ''}`;
    if (resultado < defesaInformada) return `Não alcança a Defesa ${defesaInformada}.`;
    return `Acerta a Defesa ${defesaInformada}.${extra ? ` O ${extra}` : ''}`;
  }
  if (!resistencia) return '';
  if (resistencia.seHostil) return `Se não quiser o efeito, o alvo rola ${resistencia.nome} contra ${resultado}.`;
  return magia.dano
    ? `O alvo rola ${resistencia.nome} contra ${resultado}; quem resistir sofre metade do dano e evita o efeito extra.`
    : `O alvo rola ${resistencia.nome} contra ${resultado} para resistir.`;
}

/** Rituais, Selos e Encantamentos não têm círculo nem fonte com "vagas" no
 * mesmo formato de progressao_magia - só marcos de nível com `vagas` direto,
 * lidos de `progressao_rituais`/`progressao_selos`/`progressao_encantamentos`
 * na classe (ver data/ficha/classes.json). Espelha o loop de vagasConhecidas
 * abaixo, mas sem círculo/fonte/tradições. */
function contarVagasPorProgressao(classes: Array<{ id: string; nivel: number }>, campo: string): number {
  let total = 0;
  classes.forEach(({ id, nivel }) => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === id);
    const fonte = (classe as any)?.[campo];
    if (!fonte || !Array.isArray(fonte.marcos)) return;
    const marco = [...fonte.marcos].reverse().find((item: any) => nivel >= Number(item.nivel));
    if (marco) total += Math.max(0, Number(marco.vagas) || 0);
  });
  return total;
}

export function obterPerfilMagico(
  ficha: any,
  inventarioCentral: any[] = [],
  aliadosCompartilhados: any[] = [],
): IPerfilMagico {
  const classes = referenciasClasse(ficha);
  const nivelTotal = classes.reduce((total, item) => total + item.nivel, 0);
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId) || null;
  const resumoEquipamento = resumirEquipamentos(inventarioCentral, ficha, aliadosCompartilhados);
  const atributosBase = Object.fromEntries(
    ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'].map((atributo) => [
      atributo,
      Number(ficha?.atributosFinais?.[atributo] ?? 10)
        + ajusteOrigem(ficha, 'atributo', atributo)
        + totalAjustesManuais(ficha, chaveAjuste('atributo', atributo))
        + (resumoEquipamento.bonusAtributos[atributo] || 0),
    ]),
  );
  const atributos = raca
    ? aplicarAjustesAtributosRaciais(atributosBase, raca, ficha?.escolhaRacial)
    : atributosBase;
  const fluxo = Math.max(1, Math.trunc(Number(atributos?.fluxo) || 1));
  const grauMisticismo = String(ficha?.pericias?.misticismo || 'iniciante').toLowerCase();
  const bonusGrau = BONUS_GRAU[grauMisticismo] || 0;
  const bonusRacial = raca ? (obterAjustesPericiasRaciais(raca, ficha?.escolhaRacial).misticismo || 0) : 0;
  const bonusOrigem = ajusteOrigem(ficha, 'pericia', 'misticismo');
  const bonusManual = totalAjustesManuais(ficha, chaveAjuste('pericia', 'misticismo'));
  const bonusEquipamento = resumoEquipamento.bonusPericias.misticismo || 0;
  // A rolagem de magia soma metade do nível total, como todo teste da ficha.
  const metadeDoNivel = Math.floor(nivelTotal / 2);
  const bonusConjuracao = modificador(fluxo)
    + metadeDoNivel
    + bonusGrau
    + bonusRacial
    + bonusOrigem
    + bonusManual
    + bonusEquipamento;

  let circuloDaFonte = 0;
  let vagasConhecidas = 0;
  let tetoPorCirculo: number | null = null;
  const fontes: string[] = [];
  const vagasPorFonte: Array<{ circulo: number; vagas: number }> = [];
  classes.forEach(({ id, nivel }) => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === id);
    const fonte = classe?.progressao_magia;
    if (!fonte || !Array.isArray(fonte.marcos)) return;
    const marco = [...fonte.marcos].reverse().find((item: any) => nivel >= Number(item.nivel));
    if (!marco) return;
    fontes.push(String(fonte.fonte || classe?.titulo || id));
    circuloDaFonte = Math.max(circuloDaFonte, Number(marco.circulo) || 0);
    vagasConhecidas += Math.max(0, Number(marco.vagas) || 0);
    vagasPorFonte.push({ circulo: Number(marco.circulo) || 0, vagas: Math.max(0, Number(marco.vagas) || 0) });
    if (Number(marco.teto_por_circulo) > 0) tetoPorCirculo = Math.max(tetoPorCirculo ?? 0, Number(marco.teto_por_circulo));
  });
  const circuloDoFluxo = circuloPermitidoPorFluxo(fluxo);
  const fluxoNativo = obterFluxoNativo(ficha);
  const nivelInterceptador = nivelDaClasse(classes, 'interceptador');
  const nivelSintonizador = nivelDaClasse(classes, 'sintonizador');
  const possuiInterceptacao = nivelInterceptador > 0;
  const limiteBaseSintonizador = nivelSintonizador >= 15 ? 3 : nivelSintonizador >= 5 ? 2 : nivelSintonizador > 0 ? 1 : 0;
  const possuiFocoReserva = (Array.isArray(ficha?.poderesClasseSelecionados) ? ficha.poderesClasseSelecionados : [])
    .some((item: any) => item?.classeId === 'sintonizador' && item?.poderId === 'foco-reserva');
  const limiteCatalisadores = Math.max(possuiInterceptacao ? 1 : 0, limiteBaseSintonizador + (possuiFocoReserva ? 1 : 0));
  const catalisadores = obterCatalisadoresDaFicha(ficha, limiteCatalisadores);
  // Universal transcende os Fluxos: não tem um `fluxoNativoId` (nenhum dos
  // dez é "o" nativo, e magiaElegivelParaAprender/podeConjurarMagia já
  // liberam tudo via isUniversalTree) - mas o título ainda aparece na ficha
  // pra não sobrar "Escolha uma Árvore"/"não definido" pra quem já escolheu.
  const isUniversalTree = ficha?.arvoreId === 'universal';

  return {
    possuiFonte: fontes.length > 0,
    fontes,
    fluxoNativoId: fluxoNativo?.id || null,
    fluxoNativoTitulo: fluxoNativo?.titulo || (isUniversalTree ? 'Universal' : null),
    fluxosInstaladosIds: fluxosInstaladosDaFicha(ficha),
    avisoFluxo: fluxoNativo?.id === 'fim' ? AVISO_FLUXO_FIM : fluxoNativo?.aviso_mestre,
    nivelTotal,
    fluxo,
    modificadorFluxo: modificador(fluxo),
    grauMisticismo,
    bonusConjuracao,
    componentesConjuracao: {
      modificadorFluxo: modificador(fluxo),
      metadeDoNivel,
      grauMisticismo: bonusGrau,
      racial: bonusRacial,
      origem: bonusOrigem,
      ajustesManuais: bonusManual,
      equipamento: bonusEquipamento,
    },
    vantagensConjuracao: (resumoEquipamento.vantagens.misticismo || 0) + vantagensDoGrau(grauMisticismo),
    desvantagensConjuracao: resumoEquipamento.desvantagens.misticismo || 0,
    dtMagia: dtConjuracaoPorCirculo(circuloDaFonte),
    dtLimiteFluxo: dtConjuracaoPorCirculo(circuloDoFluxo),
    circuloDaFonte,
    circuloDoFluxo,
    circuloMaximo: Math.min(circuloDaFonte, circuloDoFluxo),
    vagasConhecidas,
    vagasPorFonte,
    tetoPorCirculo,
    possuiInterceptacao,
    nivelInterceptador,
    nivelSintonizador,
    limiteCatalisadores,
    catalisadoresPreparadosIds: catalisadores.preparadosIds,
    catalisadorAtivoId: catalisadores.ativoId,
    catalisadoresDesativadosIds: catalisadores.desativadosIds,
    conhecidasIds: idsUnicos(ficha?.magiasConhecidasIds),
    concedidasIds: idsUnicos(ficha?.magiasConcedidasIds),
    vagasRituais: contarVagasPorProgressao(classes, 'progressao_rituais'),
    rituaisConhecidosIds: idsUnicos(ficha?.rituaisConhecidosIds),
    rituaisConcedidosIds: idsUnicos(ficha?.rituaisConcedidosIds),
    vagasSelos: contarVagasPorProgressao(classes, 'progressao_selos'),
    selosConhecidosIds: idsUnicos(ficha?.selosConhecidosIds),
    selosConcedidosIds: idsUnicos(ficha?.selosConcedidosIds),
    vagasEncantamentos: contarVagasPorProgressao(classes, 'progressao_encantamentos'),
    encantamentosConhecidosIds: idsUnicos(ficha?.encantamentosConhecidosIds),
    encantamentosConcedidosIds: idsUnicos(ficha?.encantamentosConcedidosIds),
  };
}

export function circuloRotulo(circulo: CirculoMagia): string {
  return circulo === 'ritual' ? 'Ritual' : `${circulo}º Círculo`;
}

/** O papel de uma magia como se lê na tela e no livro: o id não tem acento nem espaço ("ataque-controle"). */
const ROTULO_PAPEL_MAGIA: Record<string, string> = {
  ataque: 'Ataque',
  defesa: 'Defesa',
  cura: 'Cura',
  suporte: 'Suporte',
  utilidade: 'Utilidade',
  investigacao: 'Investigação',
  controle: 'Controle',
  movimento: 'Movimento',
  'ataque-controle': 'Ataque e controle',
  'ataque-risco': 'Ataque arriscado',
  'suporte-movimento': 'Suporte e movimento',
  'controle-utilidade': 'Controle e utilidade',
};

export function rotuloPapelMagia(papel: string): string {
  return ROTULO_PAPEL_MAGIA[papel] ?? papel;
}

/** A vaga de cada classe só guarda magia até o círculo que ela libera (decisão
 * de 2026-10-20): o Cartista Arcano, que para no 2º, não abre vaga de 6º círculo
 * em cima de um Canalizador. As fontes são aninhadas pelo círculo, então basta
 * conferir, para cada círculo k até o da magia nova, que as magias de círculo k
 * ou maior cabem nas vagas das fontes que chegam a k. Devolve o círculo da fonte
 * que falta, ou null quando há vaga. */
export function circuloSemVagaPara(
  perfil: Pick<IPerfilMagico, 'vagasPorFonte' | 'conhecidasIds'>,
  circulo: number,
): number | null {
  const circulosConhecidos = perfil.conhecidasIds.flatMap((id) => {
    const valor = MAGIAS_POR_ID.get(id)?.circulo;
    return typeof valor === 'number' ? [valor] : [];
  });
  for (let k = circulo; k >= 1; k -= 1) {
    const ocupadas = circulosConhecidos.filter((valor) => valor >= k).length + 1;
    const vagas = perfil.vagasPorFonte.filter((fonte) => fonte.circulo >= k).reduce((soma, fonte) => soma + fonte.vagas, 0);
    if (ocupadas > vagas) return k;
  }
  return null;
}

export function magiaElegivelParaAprender(ficha: any, magia: IMagiaCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  if (perfil.conhecidasIds.includes(magia.id)) return { permitido: false, motivo: 'Magia já conhecida.' };
  if (!perfil.possuiFonte) return { permitido: false, motivo: 'A ficha ainda não possui uma fonte de magia.' };
  if (perfil.conhecidasIds.length >= perfil.vagasConhecidas) return { permitido: false, motivo: 'Todas as vagas de magia já foram preenchidas.' };
  if (magia.circulo === 'ritual' || magia.somente_mestre) return { permitido: false, motivo: 'Rituais e concessões especiais dependem do Mestre.' };
  if (magia.circulo > perfil.circuloDaFonte) return { permitido: false, motivo: 'A fonte de magia ainda não libera este círculo.' };
  if (typeof magia.circulo === 'number' && circuloSemVagaPara(perfil, magia.circulo) !== null) {
    return { permitido: false, motivo: 'As vagas que sobram são de uma classe que não chega a este círculo, como as do Cartista Arcano, que só guardam magias de 1º e 2º círculo.' };
  }
  // O Fluxo mínimo do círculo é só recomendação (ver avisoDeFluxoDaMagia): quem
  // tenta conjurar um círculo acima do próprio bônus falha sozinho, porque a
  // rolagem não alcança a DT do círculo.
  if (perfil.tetoPorCirculo !== null) {
    const doMesmoCirculo = perfil.conhecidasIds.filter((id) => MAGIAS_POR_ID.get(id)?.circulo === magia.circulo).length;
    if (doMesmoCirculo >= perfil.tetoPorCirculo) {
      return { permitido: false, motivo: `Você já conhece ${doMesmoCirculo} magias do ${magia.circulo}º círculo, o máximo da sua fonte.` };
    }
  }
  const isUniversalTree = ficha?.arvoreId === 'universal';
  if (!isUniversalTree) {
    // Universal é de todo mundo, mas o Fluxo nativo decide o efeito dela, então
    // sem nativo ela não tem variação para aprender.
    if (magiaEhUniversal(magia)) {
      if (!perfil.fluxoNativoId) return { permitido: false, motivo: 'Escolha uma Árvore para definir o Fluxo nativo da ficha.' };
    } else if (!fluxoAcessivel(perfil, magia.fluxo)) {
      return { permitido: false, motivo: motivoForaDosFluxos(perfil, 'Esta magia', magia.tradicao) };
    }
  }
  const acessoElemental = restricaoMagiaElemental(ficha, magia);
  if (!acessoElemental.permitido) return acessoElemental;
  // Só ao aprender: o que já foi aprendido acima desse círculo continua conjurável.
  if (magiaEhElemental(magia) && typeof magia.circulo === 'number' && magia.circulo > circuloDaElementarista(ficha)) {
    return {
      permitido: false,
      motivo: `Magia Elemental só até o ${circuloDaElementarista(ficha)}º círculo, o que seus níveis de Elementarista liberam.`,
    };
  }
  const fontesDaFicha = referenciasClasse(ficha).flatMap(({ id, nivel }) => {
    const fonte = CLASSES_CATALOGO.find((item) => item.id === id)?.progressao_magia;
    return fonte && Array.isArray(fonte.marcos)
      && fonte.marcos.some((marco: any) => nivel >= Number(marco.nivel))
      ? (fonte.tradicoes || [])
      : [];
  });
  if (!magia.fontes_permitidas.some((fonte) => fontesDaFicha.includes(fonte))) {
    return { permitido: false, motivo: 'Sua classe ainda não oferece uma fonte compatível com esta magia.' };
  }
  return { permitido: true };
}

export interface IMagiasPorCirculo {
  /** Um item por círculo que a fonte libera (do 1º ao maior). */
  circulos: Array<{ circulo: number; conhecidas: number; teto: number | null; restantes: number | null }>;
  /** Teto atual por círculo; null quando a fonte ainda não declara um. */
  teto: number | null;
  /** Primeiro marco de classe que passa a ter teto, para avisar antes de chegar lá. */
  tetoAPartirDoNivel: { nivel: number; teto: number } | null;
  vagasLivres: number;
}

/** Quantas magias de cada círculo a ficha conhece e quantas ainda pode escolher,
 * para a aba de magias mostrar o limite sem mandar ninguém ao livro. */
export function magiasPorCirculo(ficha: any, inventarioCentral: any[] = []): IMagiasPorCirculo {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  const teto = perfil.tetoPorCirculo;
  const contagem = new Map<number, number>();
  perfil.conhecidasIds.forEach((id) => {
    const circulo = MAGIAS_POR_ID.get(id)?.circulo;
    if (typeof circulo === 'number') contagem.set(circulo, (contagem.get(circulo) ?? 0) + 1);
  });
  const circulos = Array.from({ length: perfil.circuloDaFonte }, (_, indice) => {
    const circulo = indice + 1;
    const conhecidas = contagem.get(circulo) ?? 0;
    return { circulo, conhecidas, teto, restantes: teto === null ? null : Math.max(0, teto - conhecidas) };
  });
  let tetoAPartirDoNivel: IMagiasPorCirculo['tetoAPartirDoNivel'] = null;
  if (teto === null) {
    referenciasClasse(ficha).forEach(({ id }) => {
      const marcos = CLASSES_CATALOGO.find((item) => item.id === id)?.progressao_magia?.marcos;
      (Array.isArray(marcos) ? marcos : []).forEach((marco: any) => {
        const valor = Number(marco.teto_por_circulo);
        if (valor > 0 && (!tetoAPartirDoNivel || Number(marco.nivel) < tetoAPartirDoNivel.nivel)) {
          tetoAPartirDoNivel = { nivel: Number(marco.nivel), teto: valor };
        }
      });
    });
  }
  return { circulos, teto, tetoAPartirDoNivel, vagasLivres: Math.max(0, perfil.vagasConhecidas - perfil.conhecidasIds.length) };
}

/** Aviso (nunca trava) de que o Fluxo da ficha está abaixo do recomendado para o
 * círculo da magia. Devolve null quando o Fluxo basta ou a magia não tem círculo. */
export function avisoDeFluxoDaMagia(ficha: any, magia: IMagiaCatalogo, inventarioCentral: any[] = []): string | null {
  if (typeof magia.circulo !== 'number') return null;
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  if (magia.circulo <= perfil.circuloDoFluxo) return null;
  const minimo = CIRCULOS_CONFIG.find((item) => item.circulo === magia.circulo)?.fluxo_minimo ?? 0;
  const dt = dtConjuracaoPorCirculo(magia.circulo);
  return `Fluxo ${perfil.fluxo} abaixo do recomendado (${minimo}) para o ${magia.circulo}º círculo. Você aprende, mas para conjurar a rolagem precisa alcançar DT ${dt}; hoje ela soma ${perfil.bonusConjuracao >= 0 ? '+' : ''}${perfil.bonusConjuracao}.`;
}

export type TipoManifestacaoMagica = 'ritual' | 'selo' | 'encantamento';

/** De quais Fluxos a ficha aprende rituais, selos e encantamentos (decisão de
 * 2026-10-20). Todo mundo aprende do Fluxo nativo e dos instalados, como nas
 * magias. O Ritualista aprende de qualquer Fluxo natural, porque rito "vem de
 * família, pacto, pergaminho, tradição" e não da alma. O Sintonizador aprende
 * selo e encantamento também dos Fluxos dos catalisadores preparados na hora de
 * aprender, e o que aprendeu fica mesmo se trocar de catalisador depois. A
 * Tecnologia, que não é natural, só entra instalada (ou nativa, no Autômato). */
export function fluxosParaAprenderManifestacao(
  ficha: any,
  tipo: TipoManifestacaoMagica,
  perfil: IPerfilMagico = obterPerfilMagico(ficha),
): FluxoMagicoId[] {
  const fluxos = new Set<FluxoMagicoId>(perfil.fluxoNativoId ? [perfil.fluxoNativoId] : []);
  perfil.fluxosInstaladosIds.forEach((id) => fluxos.add(id));
  const classes = referenciasClasse(ficha);
  if (nivelDaClasse(classes, 'ritualista') > 0) FLUXOS_NATURAIS_IDS.forEach((id) => fluxos.add(id));
  if (tipo !== 'ritual' && perfil.nivelSintonizador > 0) perfil.catalisadoresPreparadosIds.forEach((id) => fluxos.add(id));
  return FLUXOS_CATALOGO.map((fluxo) => fluxo.id).filter((id) => fluxos.has(id));
}

/** Rituais, Selos e Encantamentos não têm "fontes_permitidas" nem círculo -
 * só Fluxo, então a elegibilidade é mais simples que a de Magia: vaga livre
 * e Fluxo compatível (Universal atravessa, igual a magiaElegivelParaAprender). */
function manifestacaoElegivelParaAprender(
  ficha: any,
  manifestacao: IManifestacaoMagicaBase,
  perfil: IPerfilMagico,
  conhecidosIds: string[],
  vagas: number,
  tipo: TipoManifestacaoMagica,
  rotuloSingular: string,
): { permitido: boolean; motivo?: string } {
  if (conhecidosIds.includes(manifestacao.id)) return { permitido: false, motivo: `${rotuloSingular} já conhecido(a).` };
  if (conhecidosIds.length >= vagas) return { permitido: false, motivo: `Todas as vagas de ${rotuloSingular.toLowerCase()} já foram preenchidas.` };
  const isUniversalTree = ficha?.arvoreId === 'universal';
  if (!isUniversalTree && !fluxosParaAprenderManifestacao(ficha, tipo, perfil).includes(manifestacao.fluxo as FluxoMagicoId)) {
    const fluxoTitulo = FLUXOS_POR_ID.get(manifestacao.fluxo as FluxoMagicoId)?.titulo || manifestacao.fluxo;
    const catalisadores = tipo !== 'ritual' && perfil.nivelSintonizador > 0 ? ' Como Sintonizador, você também aprende dos Fluxos dos catalisadores preparados.' : '';
    return { permitido: false, motivo: `${motivoForaDosFluxos(perfil, rotuloSingular, fluxoTitulo)}${catalisadores}` };
  }
  return { permitido: true };
}

/** O Fluxo do Fim exige autorização do Mestre (regras.acesso_fim). Quem aprende
 * algo do Fim sem ser nativo dele (o Ritualista, por exemplo) recebe o mesmo
 * aviso, sem bloqueio. */
export function avisoFluxoDaManifestacao(ficha: any, manifestacao: IManifestacaoMagicaBase): string | null {
  return manifestacao.fluxo === 'fim' && obterFluxoNativoId(ficha) !== 'fim' ? AVISO_FLUXO_FIM : null;
}

export function ritualElegivelParaAprender(ficha: any, ritual: IRitualCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return manifestacaoElegivelParaAprender(ficha, ritual, perfil, perfil.rituaisConhecidosIds, perfil.vagasRituais, 'ritual', 'Ritual');
}

export function seloElegivelParaAprender(ficha: any, selo: ISeloCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return manifestacaoElegivelParaAprender(ficha, selo, perfil, perfil.selosConhecidosIds, perfil.vagasSelos, 'selo', 'Selo');
}

export function encantamentoElegivelParaAprender(ficha: any, encantamento: IEncantamentoCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return manifestacaoElegivelParaAprender(ficha, encantamento, perfil, perfil.encantamentosConhecidosIds, perfil.vagasEncantamentos, 'encantamento', 'Encantamento');
}

export function rituaisDaFicha(ficha: any, inventarioCentral: any[] = []): IRitualCatalogo[] {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return [...new Set([...perfil.rituaisConhecidosIds, ...perfil.rituaisConcedidosIds])]
    .flatMap((id) => {
      const ritual = RITUAIS_POR_ID.get(id);
      return ritual ? [ritual] : [];
    });
}

export function selosDaFicha(ficha: any, inventarioCentral: any[] = []): ISeloCatalogo[] {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return [...new Set([...perfil.selosConhecidosIds, ...perfil.selosConcedidosIds])]
    .flatMap((id) => {
      const selo = SELOS_POR_ID.get(id);
      return selo ? [selo] : [];
    });
}

export function encantamentosDaFicha(ficha: any, inventarioCentral: any[] = []): IEncantamentoCatalogo[] {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return [...new Set([...perfil.encantamentosConhecidosIds, ...perfil.encantamentosConcedidosIds])]
    .flatMap((id) => {
      const encantamento = ENCANTAMENTOS_POR_ID.get(id);
      return encantamento ? [encantamento] : [];
    });
}

/** Ritual é a única das três manifestações que se "realiza" direto pela
 * ficha (Selo é inscrito num item e Encantamento é aplicado a um item,
 * criatura ou lugar - fora do escopo desta aba). Fora de combate, sem
 * defesa/dano: só o teste de Misticismo contra o `dt` do rito. */
export function podeRealizarRitual(ficha: any, ritual: IRitualCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  const conhecido = perfil.rituaisConhecidosIds.includes(ritual.id);
  const concedido = perfil.rituaisConcedidosIds.includes(ritual.id);
  if (!conhecido && !concedido) return { permitido: false, motivo: 'O ritual não está registrado como conhecido.' };
  return { permitido: true };
}

export interface IMarcaDeCirculo {
  circulo: number;
  id: string;
  titulo: string;
  bonus: string;
  onus: string;
}

export interface ICicatriz {
  id: string;
  titulo: string;
  bonus: string;
  onus: string;
}

export const MARCAS_REGRAS = marcasData.regras;
export const MARCAS_POR_FLUXO = marcasData.por_fluxo as unknown as Record<FluxoMagicoId, IMarcaDeCirculo[]>;
export const CICATRIZES_CATALOGO = marcasData.cicatrizes as unknown as ICicatriz[];
export const CICATRIZES_POR_ID = new Map(CICATRIZES_CATALOGO.map((item) => [item.id, item]));

/** As Marcas que a ficha carrega hoje. Não são guardadas em lugar nenhum: saem
 * do Fluxo nativo e do maior círculo alcançado, então não há como forjar uma
 * nem esquecer de aplicar. Perdeu o círculo, perdeu a Marca. */
export function marcasDaFicha(ficha: any, inventarioCentral: any[] = []): IMarcaDeCirculo[] {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  if (!perfil.fluxoNativoId) return [];
  const doFluxo = MARCAS_POR_FLUXO[perfil.fluxoNativoId] || [];
  return doFluxo.filter((marca) => perfil.circuloMaximo >= marca.circulo);
}

/** Quantas Cicatrizes a ficha tem direito: uma por magia de 10º círculo
 * aprendida. Concessão do Mestre não conta, porque não foi conquista. */
export function cicatrizesDevidas(ficha: any, inventarioCentral: any[] = []): number {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return perfil.conhecidasIds.filter((id) => MAGIAS_POR_ID.get(id)?.circulo === 10).length;
}

export function cicatrizesDaFicha(ficha: any): ICicatriz[] {
  return idsUnicos(ficha?.cicatrizesIds).flatMap((id) => {
    const cicatriz = CICATRIZES_POR_ID.get(id);
    return cicatriz ? [cicatriz] : [];
  });
}

/** Sorteia a próxima Cicatriz, sem repetir o que a ficha já carrega. */
export function sortearCicatriz(ficha: any): ICicatriz | null {
  const jaTem = new Set(idsUnicos(ficha?.cicatrizesIds));
  const disponiveis = CICATRIZES_CATALOGO.filter((item) => !jaTem.has(item.id));
  if (!disponiveis.length) return null;
  return disponiveis[Math.floor(Math.random() * disponiveis.length)];
}

export interface ISimboloDosSete {
  id: string;
  titulo: string;
  bonus: string[];
  onus: string[];
  natureza: 'pecado' | 'virtude';
  opostoId: string;
}

const montarSimbolos = (): ISimboloDosSete[] => [
  ...setesData.pecados.map((item: any) => ({
    id: item.id,
    titulo: item.titulo,
    bonus: item.bonus,
    onus: item.onus,
    natureza: 'pecado' as const,
    opostoId: item.virtude_oposta,
  })),
  ...setesData.virtudes.map((item: any) => ({
    id: item.id,
    titulo: item.titulo,
    bonus: item.bonus,
    onus: item.onus,
    natureza: 'virtude' as const,
    opostoId: item.pecado_oposto,
  })),
];

export const SIMBOLOS_DOS_SETE = montarSimbolos();
export const SIMBOLOS_POR_ID = new Map(SIMBOLOS_DOS_SETE.map((item) => [item.id, item]));
export const SETES_REGRAS = setesData.regras;

/** O Símbolo que a ficha carrega, se carregar algum. É um só: os ritos marcam
 * uma pessoa por vez, e a Virtude oposta substitui o Pecado em vez de somar. */
export function simboloDaFicha(ficha: any): ISimboloDosSete | null {
  const id = String(ficha?.simboloId || '').trim();
  return id ? SIMBOLOS_POR_ID.get(id) || null : null;
}

export const RITO_DOS_SETE_PECADOS_ID = 'rito-dos-sete-pecados';
export const RITO_DAS_SETE_VIRTUDES_ID = 'rito-das-sete-virtudes';

/** Os sete Símbolos que aquele rito concede, para o Grimório mostrar o que dá e
 * o que cobra junto do próprio ritual, em vez de numa página à parte. */
export function simbolosDoRito(ritualId: string): ISimboloDosSete[] {
  if (ritualId === RITO_DOS_SETE_PECADOS_ID) return SIMBOLOS_DOS_SETE.filter((item) => item.natureza === 'pecado');
  if (ritualId === RITO_DAS_SETE_VIRTUDES_ID) return SIMBOLOS_DOS_SETE.filter((item) => item.natureza === 'virtude');
  return [];
}

export function magiasDaFicha(ficha: any, inventarioCentral: any[] = []): IMagiaCatalogo[] {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return [...new Set([...perfil.conhecidasIds, ...perfil.concedidasIds])]
    .flatMap((id) => {
      const magia = MAGIAS_POR_ID.get(id);
      return magia ? [magia] : [];
    });
}

export function podeConjurarMagia(ficha: any, magia: IMagiaCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  const aprendida = perfil.conhecidasIds.includes(magia.id);
  const concedida = perfil.concedidasIds.includes(magia.id);
  if (!aprendida && !concedida) return { permitido: false, motivo: 'A magia não está registrada como conhecida.' };
  const isUniversalTree = ficha?.arvoreId === 'universal';
  const temFluxoDefinido = Boolean(perfil.fluxoNativoId || perfil.fluxosInstaladosIds.length);
  if (!concedida && !magiaEhUniversal(magia) && !isUniversalTree && temFluxoDefinido && !fluxoAcessivel(perfil, magia.fluxo)) {
    return { permitido: false, motivo: `A magia não pertence ao Fluxo nativo ${perfil.fluxoNativoTitulo || 'da ficha'} nem a um Fluxo instalado.` };
  }
  if (!concedida) {
    const acessoElemental = restricaoMagiaElemental(ficha, magia);
    if (!acessoElemental.permitido) return acessoElemental;
  }
  return { permitido: true };
}
