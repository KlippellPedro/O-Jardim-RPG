import { pacoteRacial } from '../config/regrasRaciais.js';

// Fluxo é o 7º atributo (2026-07-12) — entra na distribuição/rolagem como
// qualquer outro, mas ainda não participa de nenhuma fórmula abaixo
// (aplicarModificadoresRaciais já cobre ele: nenhuma raça define bônus de
// fluxo, então o valor de base passa direto). Ganha efeito mecânico depois.
export const ATRIBUTOS = ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'];
export const VALORES_ATRIBUTOS_PADRAO = [15, 14, 13, 12, 10, 8, 7];
export const ATRIBUTO_VALOR_MINIMO = 1;
export const ATRIBUTO_VALOR_MAXIMO = 20;

export function rolarAtributos() {
  return Array.from({ length: ATRIBUTOS.length }, () => 1 + Math.floor(Math.random() * 20));
}

export function modificador(valor) {
  return Math.floor(((Number(valor) || 0) - 10) / 2);
}

export function aplicarModificadoresRaciais(atribuicao, raca, opcoes = {}) {
  const pacote = pacoteRacial(raca);
  const modificadores = { ...pacote.modificadores };
  if (raca?.id === 'gigante' && opcoes.escolhaGigante === 'sabedoria') {
    modificadores.sabedoria = (modificadores.sabedoria || 0) + 1;
  }

  const finais = {};
  ATRIBUTOS.forEach(chave => {
    const base = Number(atribuicao?.[chave]) || 0;
    finais[chave] = Math.max(
      ATRIBUTO_VALOR_MINIMO,
      Math.min(ATRIBUTO_VALOR_MAXIMO, base + (modificadores[chave] || 0)),
    );
  });
  return finais;
}

export function calcularDerivados(atributosFinais, raca, nivel = 1) {
  const pacote = pacoteRacial(raca);
  const metadeNivel = Math.floor(Math.max(1, Number(nivel) || 1) / 2);
  const modForca = modificador(atributosFinais.forca);
  const modDestreza = modificador(atributosFinais.destreza);
  const modConstituicao = modificador(atributosFinais.constituicao);
  const modInteligencia = modificador(atributosFinais.inteligencia);
  const modSabedoria = modificador(atributosFinais.sabedoria);

  return {
    vida: Math.max(1, 10 + (2 * modForca) + (2 * modConstituicao) + (pacote.vida || 0)),
    mana: Math.max(1, 6 + (2 * modInteligencia) + modSabedoria + (pacote.mana || 0)),
    movimento: Math.max(4.5, 9 + (1.5 * modDestreza) + (pacote.movimento || 0)),
    defesaNatural: 10 + metadeNivel + modDestreza,
    iniciativa: 10 + metadeNivel + modDestreza,
  };
}

export function calcularLunarisInicial(raca) {
  const valor = pacoteRacial(raca).lunaris;
  return typeof valor === 'number' ? valor : 20;
}

export function legadosAscensaoIniciais(raca) {
  const pacote = pacoteRacial(raca);
  if (typeof pacote.legadoInicial === 'number') return pacote.legadoInicial;
  return raca?.categoria && raca.categoria !== 'padrao' ? 1 : 0;
}

export function periciasRaciaisIniciais(raca, escolhaPericia) {
  const pacote = pacoteRacial(raca);
  const pericias = { ...(pacote.pericias || {}) };
  if (pacote.escolhaPericiaTreinada?.includes(escolhaPericia)) {
    pericias[escolhaPericia] = 'treinado';
  }
  return pericias;
}

export const TABELA_XP = Array.from(
  { length: 40 },
  (_, indice) => 500 * (indice + 1) * indice,
);

export function nivelPorXp(xp) {
  const valor = typeof xp === 'number' && xp >= 0 ? xp : 0;
  let nivel = 1;
  TABELA_XP.forEach((limite, indice) => {
    if (valor >= limite) nivel = indice + 1;
  });
  return nivel;
}

export function xpProximoNivel(nivel) {
  return TABELA_XP[nivel] ?? null;
}

export const GRAUS_PERICIA = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'];

export const BONUS_GRAU = {
  iniciante: 0,
  aprendiz: 2,
  treinado: 4,
  especialista: 6,
  mestre: 8,
  veterano: 10,
  renomado: 12,
};

export const NIVEL_MINIMO_GRAU = {
  iniciante: 1,
  aprendiz: 1,
  treinado: 3,
  especialista: 7,
  mestre: 13,
  veterano: 19,
  renomado: 29,
};

export const GRAUS_INFO = Object.fromEntries(
  GRAUS_PERICIA.map(grau => [
    grau,
    {
      titulo: grau.charAt(0).toUpperCase() + grau.slice(1),
      formula: `Mod. Atributo + metade do Nível + ${BONUS_GRAU[grau]}`,
    },
  ]),
);

export function calcularBonusPericia(grau, modAtributo, nivel) {
  const bonusGrau = BONUS_GRAU[grau] ?? 0;
  return (Number(modAtributo) || 0)
    + Math.floor(Math.max(1, Number(nivel) || 1) / 2)
    + bonusGrau;
}
