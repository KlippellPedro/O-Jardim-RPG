import type { IConquistaNova } from '../../services/conquistasApi';

type Ouvinte = (novas: IConquistaNova[]) => void;

const ouvintes = new Set<Ouvinte>();
// Cada conquista é comemorada uma vez por abertura do site, mesmo que duas
// telas (a ficha e a galeria) a descubram ao mesmo tempo.
const anunciadas = new Set<string>();

export const dispararConquistas = (novas: IConquistaNova[] | null | undefined) => {
  const ineditas = (novas ?? []).filter((item) => {
    if (anunciadas.has(item.chave)) return false;
    anunciadas.add(item.chave);
    return true;
  });
  if (ineditas.length) ouvintes.forEach((ouvinte) => ouvinte(ineditas));
};

export const inscreverConquistas = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
