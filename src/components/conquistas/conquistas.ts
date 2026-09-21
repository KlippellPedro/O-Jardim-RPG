import type { IConquistaNova } from '../../services/conquistasApi';

type Ouvinte = (novas: IConquistaNova[]) => void;

const ouvintes = new Set<Ouvinte>();
// Cada conquista é comemorada uma vez por abertura do site, mesmo que duas
// telas (a ficha e a galeria) a descubram ao mesmo tempo. A conta é por
// personagem: o mesmo selo numa segunda ficha é outra conquista.
const anunciadas = new Set<string>();

export const dispararConquistas = (novas: IConquistaNova[] | null | undefined, personagemId?: string | null) => {
  const ineditas = (novas ?? []).filter((item) => {
    const marca = `${personagemId ?? ''}:${item.chave}`;
    if (anunciadas.has(marca)) return false;
    anunciadas.add(marca);
    return true;
  });
  if (ineditas.length) ouvintes.forEach((ouvinte) => ouvinte(ineditas));
};

export const inscreverConquistas = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
