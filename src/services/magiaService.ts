import magiasData from '../../data/ficha/magias.json';
import { BONUS_GRAU, aplicarAjustesAtributosRaciais, modificador, obterAjustesPericiasRaciais } from './calculoService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from './catalogoService';

export type CirculoMagia = 1 | 2 | 3 | 4 | 5 | 'ritual';

export interface IMagiaCatalogo {
  id: string;
  titulo: string;
  circulo: CirculoMagia;
  tradicao: string;
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
}

export interface IPerfilMagico {
  possuiFonte: boolean;
  fontes: string[];
  nivelTotal: number;
  fluxo: number;
  modificadorFluxo: number;
  grauMisticismo: string;
  bonusConjuracao: number;
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

export function circuloPermitidoPorFluxo(fluxo: unknown): number {
  const valor = Math.trunc(Number(fluxo) || 0);
  if (valor >= 18) return 5;
  if (valor >= 16) return 4;
  if (valor >= 14) return 3;
  if (valor >= 12) return 2;
  if (valor >= 8) return 1;
  return 0;
}

export function obterPerfilMagico(ficha: any): IPerfilMagico {
  const classes = referenciasClasse(ficha);
  const nivelTotal = classes.reduce((total, item) => total + item.nivel, 0);
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId) || null;
  const atributosBase = ficha?.atributosFinais || {};
  const atributos = raca
    ? aplicarAjustesAtributosRaciais(atributosBase, raca, ficha?.escolhaRacial)
    : atributosBase;
  const fluxo = Math.max(1, Math.trunc(Number(atributos?.fluxo) || 1));
  const grauMisticismo = String(ficha?.pericias?.misticismo || 'iniciante').toLowerCase();
  const bonusGrau = BONUS_GRAU[grauMisticismo] || 0;
  const bonusRacial = raca ? (obterAjustesPericiasRaciais(raca, ficha?.escolhaRacial).misticismo || 0) : 0;
  const bonusConjuracao = modificador(fluxo) + Math.floor(Math.max(1, nivelTotal) / 2) + bonusGrau + bonusRacial;

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

  return {
    possuiFonte: fontes.length > 0,
    fontes,
    nivelTotal,
    fluxo,
    modificadorFluxo: modificador(fluxo),
    grauMisticismo,
    bonusConjuracao,
    dtMagia: 10 + bonusConjuracao,
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

export function magiaElegivelParaAprender(ficha: any, magia: IMagiaCatalogo): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha);
  if (perfil.conhecidasIds.includes(magia.id)) return { permitido: false, motivo: 'Magia já conhecida.' };
  if (!perfil.possuiFonte) return { permitido: false, motivo: 'A ficha ainda não possui uma fonte de magia.' };
  if (perfil.conhecidasIds.length >= perfil.vagasConhecidas) return { permitido: false, motivo: 'Todas as vagas de magia já foram preenchidas.' };
  if (magia.circulo === 'ritual' || magia.somente_mestre) return { permitido: false, motivo: 'Rituais e concessões especiais dependem do Mestre.' };
  if (magia.circulo > perfil.circuloDaFonte) return { permitido: false, motivo: 'A fonte de magia ainda não libera este círculo.' };
  if (magia.circulo > perfil.circuloDoFluxo) return { permitido: false, motivo: `Fluxo insuficiente para o ${magia.circulo}º círculo.` };
  const fontesDaFicha = referenciasClasse(ficha).flatMap(({ id, nivel }) => {
    const fonte = CLASSES_CATALOGO.find((item) => item.id === id)?.progressao_magia;
    return fonte && Array.isArray(fonte.marcos)
      && fonte.marcos.some((marco: any) => nivel >= Number(marco.nivel))
      ? (fonte.tradicoes || [])
      : [];
  });
  if (!fontesDaFicha.includes(magia.tradicao)) return { permitido: false, motivo: 'Sua fonte não ensina esta tradição.' };
  return { permitido: true };
}

export function magiasDaFicha(ficha: any): IMagiaCatalogo[] {
  const perfil = obterPerfilMagico(ficha);
  return [...new Set([...perfil.conhecidasIds, ...perfil.concedidasIds])]
    .flatMap((id) => {
      const magia = MAGIAS_POR_ID.get(id);
      return magia ? [magia] : [];
    });
}

export function podeConjurarMagia(ficha: any, magia: IMagiaCatalogo): { permitido: boolean; motivo?: string } {
  const perfil = obterPerfilMagico(ficha);
  const aprendida = perfil.conhecidasIds.includes(magia.id);
  const concedida = perfil.concedidasIds.includes(magia.id);
  if (!aprendida && !concedida) return { permitido: false, motivo: 'A magia não está registrada como conhecida.' };
  if (typeof magia.circulo === 'number' && magia.circulo > perfil.circuloDoFluxo) {
    return { permitido: false, motivo: `Fluxo ${perfil.fluxo} não canaliza o ${magia.circulo}º círculo com segurança.` };
  }
  return { permitido: true };
}
