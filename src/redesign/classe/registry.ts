import type { IClasse } from '../../types/catalogo';
import * as Classes from './index';

type ClassePageComponent = (props: { classe: IClasse }) => JSX.Element;

export const CLASSE_PAGES: Record<string, ClassePageComponent> = {
  guerreiro: Classes.Guerreiro,
  piloto: Classes.Piloto,
  ninja: Classes.Ninja,
  'pop-star': Classes.PopStar,
  espadachim: Classes.Espadachim,
  lutador: Classes.Lutador,
  atirador: Classes.Atirador,
  medico: Classes.Medico,
  guardiao: Classes.Guardiao,
  cacador: Classes.Cacador,
  engenheiro: Classes.Engenheiro,
  alquimista: Classes.Alquimista,
  comerciante: Classes.Comerciante,
  'campeao-dimensional': Classes.CampeaoDimensional,
  'pirata-amaldicoado': Classes.PirataAmaldicoado,
  'cartista-arcano': Classes.CartistaArcano,
  'guia-dimensional': Classes.GuiaDimensional,
  'cacador-de-entidades': Classes.CacadorDeEntidades,
  'escritor-de-contos': Classes.EscritorDeContos,
  invocador: Classes.Invocador,
  'viajante-classe': Classes.ViajanteClasse,
  decodificador: Classes.Decodificador,
  codificador: Classes.Codificador,
  canalizador: Classes.Canalizador,
  sintonizador: Classes.Sintonizador,
  ritualista: Classes.Ritualista,
  interceptador: Classes.Interceptador,
};
