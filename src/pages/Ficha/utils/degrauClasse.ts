import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE } from '../../../services/progressaoNiveis';

export interface DegrauClasse {
  /** 0 é o card comum (até o fim das recompensas escritas), 7 é o do teto. */
  degrau: number;
  /** Chave estável, usada em `data-degrau` e nos testes. */
  chave: string;
  /** Nome do degrau, ou null no card comum. */
  rotulo: string | null;
  /** Primeiro nível da classe em que o degrau aparece. */
  nivelMinimo: number;
}

/** O card de uma classe ganha um degrau novo passando do nível em que acabam as
 * recompensas escritas (o 20) e a cada marco de Maestria (25, 30, 35, 40, 45 e
 * 50). Os níveis dos marcos conferem com data/ficha/maestria-classe.json num
 * teste, para a escada não se afastar do que o personagem realmente ganha. */
export const DEGRAUS_CLASSE: readonly Omit<DegrauClasse, 'degrau'>[] = [
  { chave: 'comum', rotulo: null, nivelMinimo: 1 },
  { chave: 'veterano', rotulo: 'Veterano', nivelMinimo: NIVEL_CONTEUDO_CLASSE + 1 },
  { chave: 'especialista', rotulo: 'Especialista', nivelMinimo: 25 },
  { chave: 'mestre', rotulo: 'Mestre', nivelMinimo: 30 },
  { chave: 'grao-mestre', rotulo: 'Grão-Mestre', nivelMinimo: 35 },
  { chave: 'paragao', rotulo: 'Paragão', nivelMinimo: 40 },
  { chave: 'epitome', rotulo: 'Epítome', nivelMinimo: 45 },
  { chave: 'apoteose', rotulo: 'Apoteose', nivelMinimo: NIVEL_MAXIMO_CLASSE },
];

/** Degrau do card para o nível que a classe tem. Nível inválido vale o comum. */
export function degrauDaClasse(nivelClasse: unknown): DegrauClasse {
  const nivel = Math.trunc(Number(nivelClasse) || 0);
  let degrau = 0;
  DEGRAUS_CLASSE.forEach((item, indice) => {
    if (nivel >= item.nivelMinimo) degrau = indice;
  });
  return { degrau, ...DEGRAUS_CLASSE[degrau] };
}
