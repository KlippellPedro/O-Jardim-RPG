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
  cozinheiro: Classes.Cozinheiro,
  comerciante: Classes.Comerciante,
  'campeao-dimensional': Classes.CampeaoDimensional,
  'pirata-amaldicoado': Classes.PirataAmaldicoado,
  'cartista-arcano': Classes.CartistaArcano,
  'guia-dimensional': Classes.GuiaDimensional,
  'cacador-das-almas': Classes.CacadorDasAlmas,
  'escritor-de-contos': Classes.EscritorDeContos,
  invocador: Classes.Invocador,
  'viajante-classe': Classes.ViajanteClasse,
  canalizador: Classes.Canalizador,
  sintonizador: Classes.Sintonizador,
  ritualista: Classes.Ritualista,
  interceptador: Classes.Interceptador,
};
