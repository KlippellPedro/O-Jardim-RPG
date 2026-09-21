import { temaDoFluxo, type FluxoDeMagia } from '../../../services/magiaService';

export interface CenaCirculo {
  chave: number;
  titulo: string;
  custo: number;
  /** Círculo da magia (1 a 10) ou 'ritual'; define quantos lados tem o polígono. */
  circulo: number | 'ritual';
  destaque: string;
  brilho: string;
}

type Ouvinte = (cena: CenaCirculo) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

/** Círculo mágico na cor do Fluxo, ao conjurar. Só apresentação: o custo e o
 * teste seguem exatamente como a ficha já os aplica. */
export const dispararCirculoMagico = (dados: {
  titulo: string;
  custo: number;
  circulo: number | 'ritual';
  fluxo: FluxoDeMagia | string | null | undefined;
}) => {
  let destaque = '#c4b5fd';
  let brilho = 'rgba(196, 181, 253, 0.35)';
  try {
    const tema = temaDoFluxo((dados.fluxo || 'universal') as FluxoDeMagia);
    if (tema) {
      destaque = tema.destaque;
      brilho = tema.brilho;
    }
  } catch {
    // Fluxo desconhecido: fica com a cor neutra.
  }
  contador += 1;
  const cena = { chave: contador, titulo: dados.titulo, custo: dados.custo, circulo: dados.circulo, destaque, brilho };
  ouvintes.forEach((ouvinte) => ouvinte(cena));
};

export const inscreverCirculoMagico = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
