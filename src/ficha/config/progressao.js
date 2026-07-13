export const RECOMPENSAS_CLASSE = [
  null,
  'Identidade I e treinamento inicial',
  'Poder de classe',
  'Grau de Perícia',
  'Poder de classe',
  'Identidade II',
  'Poder de classe',
  'Grau de Perícia',
  'Poder de classe',
  'Poder de classe',
  'Identidade III',
  'Poder de classe',
  'Grau de Perícia',
  'Poder de classe',
  'Poder de classe',
  'Identidade IV',
  'Poder de classe',
  'Grau de Perícia',
  'Poder de classe',
  'Poder de classe',
  'Identidade V',
];

export function recompensasAteNivel(nivelClasse) {
  const limite = Math.max(0, Math.min(20, Number(nivelClasse) || 0));
  return RECOMPENSAS_CLASSE
    .map((recompensa, nivel) => ({ nivel, recompensa }))
    .filter(item => item.nivel > 0 && item.nivel <= limite);
}

export function totalNiveisClasse(classes) {
  return (Array.isArray(classes) ? classes : [])
    .reduce((total, item) => total + Math.max(0, Number(item.nivel) || 0), 0);
}

export function marcosLegado(nivelTotal) {
  return Math.floor(Math.max(1, Number(nivelTotal) || 1) / 5);
}

export function marcosAtributo(nivelTotal) {
  return Math.floor(Math.max(1, Number(nivelTotal) || 1) / 4);
}
