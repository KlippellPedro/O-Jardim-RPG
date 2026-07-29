import type { IClasse, IRecompensaClasse } from '../types/catalogo';

const ROTULOS_RECOMPENSA: Record<IRecompensaClasse['tipo'], string> = {
  poder: 'Poder de classe',
  habilidade: 'Habilidade de classe',
  grau_pericia: 'Grau de perícia',
  evento: 'Evento',
  habilidade_final: 'Habilidade final',
};

export const classeTemProgressaoPublicada = (classe: IClasse | undefined): boolean => (
  Boolean(classe?.progressao_publicada && classe.progressao?.length)
);

export const formatarResumoClasse = (classe: IClasse): string => (
  `Vida por nível: ${classe.vida} | Mana por nível: ${classe.mana}`
);

export const formatarRecompensaClasse = (recompensa: IRecompensaClasse): string => {
  const titulo = recompensa.titulo || ROTULOS_RECOMPENSA[recompensa.tipo];
  if (recompensa.estagio) return `${titulo} (${recompensa.estagio})`;
  if ((recompensa.quantidade || 1) > 1) return `${titulo} (${recompensa.quantidade}x)`;
  return titulo;
};

export const obterRecompensasAteNivel = (classe: IClasse, nivel: number): IRecompensaClasse[] => (
  (classe.progressao || [])
    .filter(item => item.nivel <= nivel)
    .flatMap(item => item.recompensas)
);

export const obterProximaProgressao = (classe: IClasse, nivel: number) => (
  (classe.progressao || []).find(item => item.nivel > nivel) || null
);

export const contarRecompensasPorTipo = (classe: IClasse, nivel: number, tipo: IRecompensaClasse['tipo']): number => (
  obterRecompensasAteNivel(classe, nivel)
    .filter(recompensa => recompensa.tipo === tipo)
    .reduce((total, recompensa) => total + (recompensa.quantidade || 1), 0)
);
