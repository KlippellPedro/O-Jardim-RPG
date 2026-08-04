import magiasData from '../../data/ficha/magias.json';
import { ARVORES } from '../../data/mundo/arvoresCatalog';
import { BONUS_GRAU, aplicarAjustesAtributosRaciais, modificador, obterAjustesPericiasRaciais } from './calculoService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from './catalogoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from './ajustesFichaService';
import { resumirEquipamentos } from './equipamentoService';

export type CirculoMagia = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'ritual';
export type FluxoMagicoId = 'origem' | 'essencia' | 'comunicacao' | 'vitalidade' | 'inconstancia'
  | 'fisico' | 'espaco' | 'tempo' | 'vazio' | 'fim' | 'tecnologia';

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
 * azul-neon da A.X.I.S. O Vazio mantém o preto do Abismo, com contorno cinza
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
    arvore: 'Abismo', base: corArvore('erebus'), destaque: '#77707f', texto: '#d1ccd8',
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

export function temaDoFluxo(fluxoId: FluxoMagicoId): FluxoTema {
  return FLUXO_TEMAS[fluxoId];
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
  fluxo: FluxoMagicoId;
  custo_mana: number;
  efeito: string;
}

export interface IRitualCatalogo extends IManifestacaoMagicaBase {
  complexidade: string;
  dt: number;
  tempo: string;
  requisito: string;
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
  circulo: CirculoMagia;
  tradicao: string;
  fluxo: FluxoMagicoId;
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
  vantagensConjuracao: number;
  desvantagensConjuracao: number;
  dtMagia: number;
  circuloDaFonte: number;
  circuloDoFluxo: number;
  circuloMaximo: number;
  vagasConhecidas: number;
  conhecidasIds: string[];
  concedidasIds: string[];
}

export const MAGIAS_CATALOGO = (magiasData.magias as unknown as IMagiaCatalogo[]);
export const MAGIAS_POR_ID = new Map(MAGIAS_CATALOGO.map((magia) => [magia.id, magia]));
export const FLUXOS_CATALOGO = magiasData.fluxos as unknown as IFluxoMagico[];
export const FLUXOS_POR_ID = new Map(FLUXOS_CATALOGO.map((fluxo) => [fluxo.id, fluxo]));
export const FUSOES_CATALOGO = magiasData.fusoes as unknown as IFusaoFluxo[];
export const RITUAIS_CATALOGO = magiasData.rituais as unknown as IRitualCatalogo[];
export const SELOS_CATALOGO = magiasData.selos as unknown as ISeloCatalogo[];
export const ENCANTAMENTOS_CATALOGO = magiasData.encantamentos as unknown as IEncantamentoCatalogo[];
export const AVISO_FLUXO_FIM = magiasData.regras.acesso_fim.aviso;

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

export function obterPerfilMagico(ficha: any, inventarioCentral: any[] = []): IPerfilMagico {
  const classes = referenciasClasse(ficha);
  const nivelTotal = classes.reduce((total, item) => total + item.nivel, 0);
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId) || null;
  const resumoEquipamento = resumirEquipamentos(inventarioCentral, ficha);
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
  const bonusConjuracao = modificador(fluxo)
    + bonusGrau
    + bonusRacial
    + ajusteOrigem(ficha, 'pericia', 'misticismo')
    + totalAjustesManuais(ficha, chaveAjuste('pericia', 'misticismo'))
    + (resumoEquipamento.bonusPericias.misticismo || 0);

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

  return {
    possuiFonte: fontes.length > 0,
    fontes,
    fluxoNativoId: fluxoNativo?.id || null,
    fluxoNativoTitulo: fluxoNativo?.titulo || null,
    avisoFluxo: fluxoNativo?.id === 'fim' ? AVISO_FLUXO_FIM : fluxoNativo?.aviso_mestre,
    nivelTotal,
    fluxo,
    modificadorFluxo: modificador(fluxo),
    grauMisticismo,
    bonusConjuracao,
    vantagensConjuracao: resumoEquipamento.vantagensPericias.misticismo || 0,
    desvantagensConjuracao: resumoEquipamento.desvantagensPericias.misticismo || 0,
    dtMagia: dtConjuracaoPorCirculo(Math.min(circuloDaFonte, circuloDoFluxo)),
    circuloDaFonte,
    circuloDoFluxo,
    circuloMaximo: Math.min(circuloDaFonte, circuloDoFluxo),
    vagasConhecidas,
    conhecidasIds: idsUnicos(ficha?.magiasConhecidasIds),
    concedidasIds: idsUnicos(ficha?.magiasConcedidasIds),
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
  if (!perfil.fluxoNativoId) return { permitido: false, motivo: 'Escolha uma Árvore para definir o Fluxo nativo da ficha.' };
  if (magia.fluxo !== perfil.fluxoNativoId) {
    return { permitido: false, motivo: `Esta magia pertence ao Fluxo ${magia.tradicao}; seu Fluxo nativo é ${perfil.fluxoNativoTitulo}.` };
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
  if (!concedida && perfil.fluxoNativoId && magia.fluxo !== perfil.fluxoNativoId) {
    return { permitido: false, motivo: `A magia não pertence ao Fluxo nativo ${perfil.fluxoNativoTitulo}.` };
  }
  if (typeof magia.circulo === 'number' && magia.circulo > perfil.circuloDoFluxo) {
    return { permitido: false, motivo: `Fluxo ${perfil.fluxo} não canaliza o ${magia.circulo}º círculo com segurança.` };
  }
  return { permitido: true };
}
