import type { IRaca } from '../../types/catalogo';
import * as Racas from './index';

type RacaPageComponent = (props: { raca: IRaca }) => JSX.Element;

export const RACA_PAGES: Record<string, RacaPageComponent> = {
  humano: Racas.Humano,
  vampiro: Racas.Vampiro,
  goblim: Racas.Goblim,
  anao: Racas.Anao,
  golem: Racas.Golem,
  espirito: Racas.Espirito,
  gigante: Racas.Gigante,
  animalia: Racas.Animalia,
  sereia: Racas.Sereia,
  mimico: Racas.Mimico,
  simbionte: Racas.Simbionte,
  slime: Racas.Slime,
  feerico: Racas.Feerico,
  elfo: Racas.Elfo,
  desperto: Racas.Desperto,
  auleth: Racas.Auleth,
  automato: Racas.Automato,
  clone: Racas.Clone,
  errante: Racas.Errante,
  amalgamo: Racas.Amalgamo,
  bruxa: Racas.Bruxa,
  onirico: Racas.Onirico,
  divino: Racas.Divino,
  entidade: Racas.Entidade,
  'raca-personalizada': Racas.RacaPersonalizada,
};
