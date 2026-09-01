import magiasData from '../../data/ficha/magias.json';
import marcasData from '../../data/ficha/marcas-de-circulo.json';
import setesData from '../../data/ficha/pecados-e-virtudes.json';
import { ARVORES } from '../../data/mundo/arvoresCatalog';
import { BONUS_GRAU, aplicarAjustesAtributosRaciais, modificador, obterAjustesPericiasRaciais } from './calculoService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from './catalogoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from './ajustesFichaService';
import { resumirEquipamentos } from './equipamentoService';

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
  avisoFluxo?: string;
  nivelTotal: number;
  fluxo: number;
  modificadorFluxo: number;
  grauMisticismo: string;
  bonusConjuracao: number;
  componentesConjuracao: {
    modificadorFluxo: number;
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
  possuiInterceptacao: boolean;
  nivelInterceptador: number;
  nivelSintonizador: number;
  limiteCatalisadores: number;
  catalisadoresPreparadosIds: FluxoMagicoId[];
  catalisadorAtivoId: FluxoMagicoId | null;
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

const FLUXO_POR_ARVORE: Record<string, FluxoMagicoId> = {
  aethel: 'origem',
  ousias: 'essencia',
  keryx: 'tecnologia',
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
    return [{ id, nivel: Math.max(1, Math.min(20, Math.trunc(Number(item?.nivel) || 1))) }];
  });
};

const nivelDaClasse = (classes: Array<{ id: string; nivel: number }>, classeId: string): number => (
  classes.find((item) => item.id === classeId)?.nivel || 0
);

const FLUXOS_CATALISAVEIS = new Set<FluxoMagicoId>([
  'origem', 'essencia', 'comunicacao', 'vitalidade', 'inconstancia',
  'fisico', 'espaco', 'tempo', 'vazio', 'fim',
]);

/** Catalisadores ficam na ficha como uma escolha operacional, separada da
 * fonte de magia. Para o Sintonizador eles habilitam Fusões; para o
 * Interceptador registram para qual Fluxo natural a interface A.X.I.S. está
 * calibrada. Em nenhum dos casos a escolha cria, sozinha, uma fonte. */
function obterCatalisadoresDaFicha(
  ficha: any,
  limite: number,
): { preparadosIds: FluxoMagicoId[]; ativoId: FluxoMagicoId | null } {
  const configuracao = ficha?.catalisadoresFluxo;
  const preparadosIds = idsUnicos(configuracao?.preparadosIds)
    .filter((id): id is FluxoMagicoId => FLUXOS_CATALISAVEIS.has(id as FluxoMagicoId))
    .slice(0, Math.max(0, limite));
  const ativoInformado = String(configuracao?.ativoId || '') as FluxoMagicoId;
  return {
    preparadosIds,
    ativoId: preparadosIds.includes(ativoInformado) ? ativoInformado : (preparadosIds[0] || null),
  };
}

export function obterFluxoNativoId(ficha: any): FluxoMagicoId | null {
  const fluxoExplicito = String(ficha?.fluxoNativoId || '');
  if (FLUXOS_POR_ID.has(fluxoExplicito as FluxoMagicoId)) return fluxoExplicito as FluxoMagicoId;
  return FLUXO_POR_ARVORE[String(ficha?.arvoreId || '')] || null;
}

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
  const bonusConjuracao = modificador(fluxo)
    + bonusGrau
    + bonusRacial
    + bonusOrigem
    + bonusManual
    + bonusEquipamento;

  let circuloDaFonte = 0;
  let vagasConhecidas = 0;
  const fontes: string[] = [];
  classes.forEach(({ id, nivel }) => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === id);
    const fonte = classe?.progressao_magia;
    if (!fonte || !Array.isArray(fonte.marcos)) return;
    const marco = [...fonte.marcos].reverse().find((item: any) => nivel >= Number(item.nivel));
    if (!marco) return;
    fontes.push(String(fonte.fonte || classe?.titulo || id));
    circuloDaFonte = Math.max(circuloDaFonte, Number(marco.circulo) || 0);
    vagasConhecidas += Math.max(0, Number(marco.vagas) || 0);
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
    avisoFluxo: fluxoNativo?.id === 'fim' ? AVISO_FLUXO_FIM : fluxoNativo?.aviso_mestre,
    nivelTotal,
    fluxo,
    modificadorFluxo: modificador(fluxo),
    grauMisticismo,
    bonusConjuracao,
    componentesConjuracao: {
      modificadorFluxo: modificador(fluxo),
      grauMisticismo: bonusGrau,
      racial: bonusRacial,
      origem: bonusOrigem,
      ajustesManuais: bonusManual,
      equipamento: bonusEquipamento,
    },
    vantagensConjuracao: resumoEquipamento.vantagens.misticismo || 0,
    desvantagensConjuracao: resumoEquipamento.desvantagens.misticismo || 0,
    dtMagia: dtConjuracaoPorCirculo(Math.min(circuloDaFonte, circuloDoFluxo)),
    dtLimiteFluxo: dtConjuracaoPorCirculo(circuloDoFluxo),
    circuloDaFonte,
    circuloDoFluxo,
    circuloMaximo: Math.min(circuloDaFonte, circuloDoFluxo),
    vagasConhecidas,
    possuiInterceptacao,
    nivelInterceptador,
    nivelSintonizador,
    limiteCatalisadores,
    catalisadoresPreparadosIds: catalisadores.preparadosIds,
    catalisadorAtivoId: catalisadores.ativoId,
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

export function magiaElegivelParaAprender(ficha: any, magia: IMagiaCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  if (perfil.conhecidasIds.includes(magia.id)) return { permitido: false, motivo: 'Magia já conhecida.' };
  if (!perfil.possuiFonte) return { permitido: false, motivo: 'A ficha ainda não possui uma fonte de magia.' };
  if (perfil.conhecidasIds.length >= perfil.vagasConhecidas) return { permitido: false, motivo: 'Todas as vagas de magia já foram preenchidas.' };
  if (magia.circulo === 'ritual' || magia.somente_mestre) return { permitido: false, motivo: 'Rituais e concessões especiais dependem do Mestre.' };
  if (magia.circulo > perfil.circuloDaFonte) return { permitido: false, motivo: 'A fonte de magia ainda não libera este círculo.' };
  if (magia.circulo > perfil.circuloDoFluxo) return { permitido: false, motivo: `Fluxo insuficiente para o ${magia.circulo}º círculo.` };
  const isUniversalTree = ficha?.arvoreId === 'universal';
  if (!isUniversalTree) {
    if (!perfil.fluxoNativoId) return { permitido: false, motivo: 'Escolha uma Árvore para definir o Fluxo nativo da ficha.' };
    // Universal é de todo mundo: o Fluxo nativo decide o efeito, não o acesso.
    if (!magiaEhUniversal(magia) && magia.fluxo !== perfil.fluxoNativoId) {
      return { permitido: false, motivo: `Esta magia pertence ao Fluxo ${magia.tradicao}; seu Fluxo nativo é ${perfil.fluxoNativoTitulo}.` };
    }
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

/** Rituais, Selos e Encantamentos não têm "fontes_permitidas" nem círculo -
 * só Fluxo, então a elegibilidade é mais simples que a de Magia: vaga livre
 * e Fluxo compatível (Universal atravessa, igual a magiaElegivelParaAprender). */
function manifestacaoElegivelParaAprender(
  ficha: any,
  manifestacao: IManifestacaoMagicaBase,
  perfil: IPerfilMagico,
  conhecidosIds: string[],
  vagas: number,
  rotuloSingular: string,
): { permitido: boolean; motivo?: string } {
  if (conhecidosIds.includes(manifestacao.id)) return { permitido: false, motivo: `${rotuloSingular} já conhecido(a).` };
  if (conhecidosIds.length >= vagas) return { permitido: false, motivo: `Todas as vagas de ${rotuloSingular.toLowerCase()} já foram preenchidas.` };
  const isUniversalTree = ficha?.arvoreId === 'universal';
  if (!isUniversalTree) {
    if (!perfil.fluxoNativoId) return { permitido: false, motivo: 'Escolha uma Árvore para definir o Fluxo nativo da ficha.' };
    if (manifestacao.fluxo !== perfil.fluxoNativoId) {
      const fluxoTitulo = FLUXOS_POR_ID.get(manifestacao.fluxo)?.titulo || manifestacao.fluxo;
      return { permitido: false, motivo: `${rotuloSingular} pertence ao Fluxo ${fluxoTitulo}; seu Fluxo nativo é ${perfil.fluxoNativoTitulo}.` };
    }
  }
  return { permitido: true };
}

export function ritualElegivelParaAprender(ficha: any, ritual: IRitualCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return manifestacaoElegivelParaAprender(ficha, ritual, perfil, perfil.rituaisConhecidosIds, perfil.vagasRituais, 'Ritual');
}

export function seloElegivelParaAprender(ficha: any, selo: ISeloCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return manifestacaoElegivelParaAprender(ficha, selo, perfil, perfil.selosConhecidosIds, perfil.vagasSelos, 'Selo');
}

export function encantamentoElegivelParaAprender(ficha: any, encantamento: IEncantamentoCatalogo, inventarioCentral: any[] = []): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha, inventarioCentral);
  return manifestacaoElegivelParaAprender(ficha, encantamento, perfil, perfil.encantamentosConhecidosIds, perfil.vagasEncantamentos, 'Encantamento');
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
  if (!concedida && !magiaEhUniversal(magia) && !isUniversalTree && perfil.fluxoNativoId && magia.fluxo !== perfil.fluxoNativoId) {
    return { permitido: false, motivo: `A magia não pertence ao Fluxo nativo ${perfil.fluxoNativoTitulo}.` };
  }
  if (typeof magia.circulo === 'number' && magia.circulo > perfil.circuloDoFluxo) {
    return { permitido: false, motivo: `Fluxo ${perfil.fluxo} não canaliza o ${magia.circulo}º círculo com segurança.` };
  }
  return { permitido: true };
}
