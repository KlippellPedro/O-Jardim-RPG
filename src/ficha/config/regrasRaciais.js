export const PACOTES_RACIAIS = {
  humano: {
    modificadores: {},
    lunaris: 15,
    legadoInicial: 1,
  },
  vampiro: {
    modificadores: { destreza: 1 },
    escolhaPericiaTreinada: ['enganacao', 'intimidacao'],
  },
  goblim: {
    modificadores: { inteligencia: 1 },
    vida: -1,
    movimento: 1.5,
    lunaris: 15,
    pericias: { ladinagem: 'aprendiz' },
  },
  anao: {
    modificadores: { sabedoria: 1, carisma: -1 },
  },
  golem: {
    modificadores: { constituicao: 1, destreza: -1 },
    vida: 5,
    lunaris: 0,
    semItemInicial: true,
    pericias: { fortitude: 'aprendiz' },
  },
  espirito: {
    modificadores: { forca: -1, constituicao: -1, sabedoria: 1 },
    mana: 3,
    movimento: 3,
  },
  gigante: {
    modificadores: { constituicao: 1 },
    movimento: -1.5,
    pericias: { atletismo: 'aprendiz' },
    escolhaRacial: true,
  },
  animalia: {
    modificadores: {},
    incompleto: true,
  },
  sereia: {
    modificadores: { carisma: 1, constituicao: -1 },
    pericias: { atuacao: 'aprendiz' },
  },
  elfo: {
    modificadores: { inteligencia: 1 },
    legadoInicial: 1,
  },
  desperto: {
    modificadores: {},
    legadoInicial: 1,
    pericias: { vontade: 'aprendiz' },
  },
  auleth: {
    modificadores: { inteligencia: 1, sabedoria: 1, carisma: -1 },
    vida: 2,
    legadoInicial: 1,
  },
  viajante: {
    modificadores: {},
    legadoInicial: 1,
  },
};

export function pacoteRacial(racaOuId) {
  const id = typeof racaOuId === 'string' ? racaOuId : racaOuId?.id;
  return PACOTES_RACIAIS[id] || {
    modificadores: {},
    legadoInicial: racaOuId?.categoria && racaOuId.categoria !== 'padrao' ? 1 : 0,
    incompleto: true,
  };
}

export function itemInicialPermitido(racaOuId) {
  return !pacoteRacial(racaOuId).semItemInicial;
}

export function escolhasRaciaisPendentes(racaOuId) {
  const pacote = pacoteRacial(racaOuId);
  return {
    periciaTreinada: pacote.escolhaPericiaTreinada || [],
    gigante: Boolean(pacote.escolhaRacial),
  };
}
