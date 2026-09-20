export interface SubidaNivel {
  chave: number;
  /** Nível total do personagem depois de subir. */
  nivelTotal: number;
  classeId: string;
  nomeClasse: string;
  /** Nível da classe que recebeu o ponto (ou 1, quando é classe nova). */
  nivelClasse: number;
  classeNova: boolean;
  especial: boolean;
  /** Ganhos reais de Vida e Mana calculados pela própria ficha. */
  ganhoVida: number;
  ganhoMana: number;
  /** Recompensas publicadas para aquele nível da classe. */
  recompensas: string[];
}

type Ouvinte = (subida: SubidaNivel) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

export const dispararSubidaNivel = (dados: Omit<SubidaNivel, 'chave'>) => {
  contador += 1;
  const subida = { ...dados, chave: contador };
  ouvintes.forEach((ouvinte) => ouvinte(subida));
};

export const inscreverSubidaNivel = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
