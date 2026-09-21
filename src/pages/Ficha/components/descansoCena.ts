import type { QualidadeDescanso } from '../../../services/descansoService';

export interface RecursoDescanso {
  rotulo: string;
  antes: number;
  depois: number;
  maximo: number;
  cor: string;
  /** Cansaço: descansar faz o número descer, e isso é o ganho. */
  inverso?: boolean;
}

export interface CenaDescanso {
  chave: number;
  qualidade: QualidadeDescanso;
  titulo: string;
  recursos: RecursoDescanso[];
}

type Ouvinte = (cena: CenaDescanso) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

export const dispararDescanso = (dados: Omit<CenaDescanso, 'chave'>) => {
  contador += 1;
  const cena = { ...dados, chave: contador };
  ouvintes.forEach((ouvinte) => ouvinte(cena));
};

export const inscreverDescanso = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
