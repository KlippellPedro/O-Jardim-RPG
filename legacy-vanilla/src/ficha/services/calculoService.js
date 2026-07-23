// Fluxo é o 7º atributo: entra na distribuição/rolagem como qualquer outro,
// mas ainda não participa das fórmulas desta versão técnica.
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

export function normalizarAtributosIniciais(atribuicao) {
  const finais = {};
  ATRIBUTOS.forEach(chave => {
    const base = Number(atribuicao?.[chave]) || 0;
    finais[chave] = Math.max(
      ATRIBUTO_VALOR_MINIMO,
      Math.min(ATRIBUTO_VALOR_MAXIMO, base),
    );
  });
  return finais;
}

export function obterVarianteRacial(raca, escolhaRacial = {}) {
  if (!Array.isArray(raca?.variantes)) return null;
  return raca.variantes.find(variante => variante.id === escolhaRacial?.varianteId) || null;
}

function somarMapasNumericos(...mapas) {
  const chaves = new Set(mapas.flatMap(mapa => Object.keys(mapa || {})));
  return Object.fromEntries([...chaves].flatMap(chave => {
    const total = mapas.reduce((soma, mapa) => soma + (Number(mapa?.[chave]) || 0), 0);
    return total === 0 ? [] : [[chave, total]];
  }));
}

export function obterAjustesAtributosRaciais(raca, escolhaRacial = {}) {
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const configuracao = raca?.escolha_atributos;
  const campo = String(configuracao?.campo || 'atributosRaciais');
  const total = Math.max(0, Math.trunc(Number(configuracao?.total) || 0));
  const bonus = Number(configuracao?.bonus_por_escolha) || 0;
  const escolhas = [...new Set(
    (Array.isArray(escolhaRacial?.[campo]) ? escolhaRacial[campo] : [])
      .filter(atributo => ATRIBUTOS.includes(atributo)),
  )].slice(0, total);
  const ajustesEscolhidos = Object.fromEntries(escolhas.map(atributo => [atributo, bonus]));
  return somarMapasNumericos(
    raca?.ajustes_atributos,
    variante?.ajustes_atributos,
    ajustesEscolhidos,
  );
}

export function obterLimitesAtributosRaciais(raca, escolhaRacial = {}) {
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const configuracao = raca?.escolha_atributos;
  const campo = String(configuracao?.campo || 'atributosRaciais');
  const total = Math.max(0, Math.trunc(Number(configuracao?.total) || 0));
  const limite = Number(configuracao?.limite);
  const escolhas = [...new Set(
    (Array.isArray(escolhaRacial?.[campo]) ? escolhaRacial[campo] : [])
      .filter(atributo => ATRIBUTOS.includes(atributo)),
  )].slice(0, total);
  const limitesEscolhidos = Number.isFinite(limite)
    ? Object.fromEntries(escolhas.map(atributo => [atributo, limite]))
    : {};
  return {
    ...(raca?.limites_atributos || {}),
    ...(variante?.limites_atributos || {}),
    ...limitesEscolhidos,
  };
}

export function obterArvoresClassePermitidas(personagem, arvoreAtual = personagem?.arvoreId) {
  const arvores = new Set();
  if (arvoreAtual) arvores.add(arvoreAtual);
  if (personagem?.racaId === 'errante' && personagem?.escolhaRacial?.arvoreOrigemId) {
    arvores.add(personagem.escolhaRacial.arvoreOrigemId);
  }
  return [...arvores];
}

export function obterFragmentosRaciaisConhecidos(raca, escolhaRacial = {}) {
  if (!Array.isArray(raca?.fragmentos)) return [];
  const porId = new Map(raca.fragmentos.map(fragmento => [fragmento.id, fragmento]));
  const maximo = Math.max(
    0,
    Math.trunc(Number(raca?.fragmentos_config?.conhecidos_maximo) || 0),
  );
  return [...new Set(
    (Array.isArray(escolhaRacial?.fragmentosConhecidosIds)
      ? escolhaRacial.fragmentosConhecidosIds
      : [])
      .map(id => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, maximo).map(id => porId.get(id)).filter(Boolean);
}

export function obterFragmentosRaciaisExpressos(raca, escolhaRacial = {}) {
  const conhecidos = obterFragmentosRaciaisConhecidos(raca, escolhaRacial);
  const porId = new Map(conhecidos.map(fragmento => [fragmento.id, fragmento]));
  const maximo = Math.max(0, Math.trunc(Number(raca?.fragmentos_config?.expressos) || 0));
  return [...new Set(
    (Array.isArray(escolhaRacial?.fragmentosExpressosIds)
      ? escolhaRacial.fragmentosExpressosIds
      : [])
      .map(id => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, maximo).map(id => porId.get(id)).filter(Boolean);
}

export function capacidadeMaldicoesRaciais(raca, escolhaRacial = {}) {
  if (!Array.isArray(raca?.maldicoes)) return 0;
  const variante = obterVarianteRacial(raca, escolhaRacial);
  return Math.max(
    0,
    Math.trunc(Number(variante?.maldicoes_conhecidas)
      || Number(raca?.maldicoes_config?.conhecidas_base)
      || 0),
  );
}

export function obterMaldicoesRaciaisConhecidas(raca, escolhaRacial = {}) {
  if (!Array.isArray(raca?.maldicoes)) return [];
  const campo = String(raca?.maldicoes_config?.campo || 'maldicoesConhecidasIds');
  const porId = new Map(raca.maldicoes.map(maldicao => [maldicao.id, maldicao]));
  const capacidade = capacidadeMaldicoesRaciais(raca, escolhaRacial);
  return [...new Set(
    (Array.isArray(escolhaRacial?.[campo]) ? escolhaRacial[campo] : [])
      .map(id => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, capacidade).map(id => porId.get(id)).filter(Boolean);
}

export function capacidadeModificacoesRaciais(raca, nivel = 1) {
  if (!Array.isArray(raca?.modificacoes)) return 0;
  const base = Math.max(0, Math.trunc(Number(raca?.capacidade_modificacoes?.base) || 0));
  const nivelPorSlot = Math.max(
    1,
    Math.trunc(Number(raca?.capacidade_modificacoes?.nivel_por_slot) || 2),
  );
  return base + Math.floor(Math.max(1, Number(nivel) || 1) / nivelPorSlot);
}

export function obterModificacoesRaciaisInstaladas(
  raca,
  escolhaRacial = {},
  nivel = 1,
) {
  if (!Array.isArray(raca?.modificacoes)) return [];
  const variante = obterVarianteRacial(raca, escolhaRacial);
  const porId = new Map(raca.modificacoes.map(modificacao => [modificacao.id, modificacao]));
  const capacidade = capacidadeModificacoesRaciais(raca, nivel);
  const ids = [...new Set(
    (Array.isArray(escolhaRacial?.modificacoesIds) ? escolhaRacial.modificacoesIds : [])
      .map(id => String(id || '').trim())
      .filter(Boolean),
  )].slice(0, capacidade);
  const candidatas = ids
    .map(id => porId.get(id))
    .filter(Boolean)
    .filter(modificacao => Math.max(1, Number(nivel) || 1)
      >= Math.max(1, Number(modificacao.nivel_minimo) || 1))
    .filter(modificacao => !modificacao.postura_exigida
      || modificacao.postura_exigida === variante?.postura);
  const passivasInstaladas = candidatas.filter(item => item.categoria === 'passiva').length;
  return candidatas.filter(modificacao => modificacao.categoria !== 'ativa'
    || passivasInstaladas >= Math.max(0, Number(modificacao.passivas_exigidas) || 0));
}

export function obterCondicaoAncestral(raca, escolhaRacial = {}) {
  if (!Array.isArray(raca?.condicoes_ancestrais)) return null;
  return raca.condicoes_ancestrais.find(
    condicao => condicao.id === escolhaRacial?.condicaoAncestralId,
  ) || null;
}

export function obterAjustesPericiasRaciais(raca, escolhaRacial = {}) {
  const condicao = obterCondicaoAncestral(raca, escolhaRacial);
  const fragmentos = obterFragmentosRaciaisExpressos(raca, escolhaRacial);
  const mapas = [
    raca?.ajustes_pericias || {},
    condicao?.ajustes_pericias || {},
    ...fragmentos.map(fragmento => fragmento.ajustes_pericias || {}),
  ];
  const chaves = new Set(mapas.flatMap(mapa => Object.keys(mapa)));
  return Object.fromEntries([...chaves].flatMap(chave => {
    const total = mapas.reduce((soma, mapa) => soma + (Number(mapa[chave]) || 0), 0);
    return total === 0 ? [] : [[chave, total]];
  }));
}

function somarValorRacial(raca, variante, campo) {
  const base = Number(raca?.[campo]);
  const adicional = Number(variante?.[campo]);
  return (Number.isFinite(base) ? base : 0) + (Number.isFinite(adicional) ? adicional : 0);
}

export function aplicarAjusteAtributoRacial(valorBase, ajuste = 0, limite = null) {
  const base = Number(valorBase) || 0;
  const bonus = Number(ajuste);
  if (!Number.isFinite(bonus) || bonus === 0) return base;

  const teto = Number(limite);
  if (!Number.isFinite(teto) || bonus < 0) {
    return Math.max(ATRIBUTO_VALOR_MINIMO, base + bonus);
  }

  // O teto limita apenas o que o pacote racial acrescenta. Se uma intervenção
  // externa já deixou o atributo acima dele, a raça não reduz esse valor.
  return Math.max(
    ATRIBUTO_VALOR_MINIMO,
    base + Math.min(bonus, Math.max(0, teto - base)),
  );
}

export function aplicarAjustesAtributosRaciais(atributosFinais, raca, escolhaRacial = {}) {
  const ajustes = obterAjustesAtributosRaciais(raca, escolhaRacial);
  const limites = obterLimitesAtributosRaciais(raca, escolhaRacial);
  return Object.fromEntries(ATRIBUTOS.map(chave => [
    chave,
    aplicarAjusteAtributoRacial(
      atributosFinais?.[chave],
      ajustes[chave],
      limites[chave],
    ),
  ]));
}

export function calcularDerivados(atributosFinais, raca, nivel = 1, escolhaRacial = {}) {
  const atributosEfetivos = aplicarAjustesAtributosRaciais(
    atributosFinais,
    raca,
    escolhaRacial,
  );
  const metadeNivel = Math.floor(Math.max(1, Number(nivel) || 1) / 2);
  const modForca = modificador(atributosEfetivos.forca);
  const modDestreza = modificador(atributosEfetivos.destreza);
  const modConstituicao = modificador(atributosEfetivos.constituicao);
  const modInteligencia = modificador(atributosEfetivos.inteligencia);
  const modSabedoria = modificador(atributosEfetivos.sabedoria);
  const varianteRacial = obterVarianteRacial(raca, escolhaRacial);
  const fragmentosExpressos = obterFragmentosRaciaisExpressos(raca, escolhaRacial);
  const bonusVidaRacial = somarValorRacial(raca, varianteRacial, 'vida');
  const bonusManaRacial = somarValorRacial(raca, varianteRacial, 'mana')
    + fragmentosExpressos.reduce(
      (total, fragmento) => total + (Number(fragmento.mana) || 0),
      0,
    );
  const bonusMovimentoRacial = somarValorRacial(raca, varianteRacial, 'movimento');
  const modificacoes = obterModificacoesRaciaisInstaladas(raca, escolhaRacial, nivel);
  const bonusVidaModificacoes = modificacoes.reduce(
    (total, modificacao) => total
      + ((Number(modificacao.vida_por_nivel) || 0) * Math.max(1, Number(nivel) || 1)),
    0,
  );
  const bonusVidaVariantePorNivel = (Number(varianteRacial?.vida_por_nivel) || 0)
    * Math.max(1, Number(nivel) || 1);
  const bonusMovimentoModificacoes = modificacoes.reduce(
    (total, modificacao) => total + (Number(modificacao.movimento) || 0),
    0,
  );
  const bonusDefesaModificacoes = modificacoes.reduce((total, modificacao) => {
    const porTamanho = Number(modificacao.defesa_por_tamanho?.[varianteRacial?.tamanho]) || 0;
    return total + (Number(modificacao.defesa) || 0) + porTamanho;
  }, 0);
  const bonusDefesaFragmentos = fragmentosExpressos.reduce(
    (total, fragmento) => total + (Number(fragmento.defesa) || 0),
    0,
  );
  const movimentoFixo = Number(varianteRacial?.movimento_fixo);
  const movimentoBase = Number.isFinite(movimentoFixo)
    ? movimentoFixo
    : 9 + (1.5 * modDestreza) + bonusMovimentoRacial;

  return {
    vida: Math.max(1, 10 + (2 * modForca) + (2 * modConstituicao)
      + bonusVidaRacial + bonusVidaModificacoes + bonusVidaVariantePorNivel),
    mana: Math.max(1, 6 + (2 * modInteligencia) + modSabedoria
      + bonusManaRacial),
    movimento: Math.max(4.5, movimentoBase + bonusMovimentoModificacoes),
    defesaNatural: 10 + metadeNivel + modDestreza
      + bonusDefesaModificacoes + bonusDefesaFragmentos,
    iniciativa: 10 + metadeNivel + modDestreza,
  };
}

export function calcularDerivadosComClasses(
  atributosFinais,
  raca,
  classesPersonagem,
  catalogoClasses,
  nivelDeReferencia = null,
  escolhaRacial = {},
) {
  const classes = Array.isArray(classesPersonagem) ? classesPersonagem : [];
  const catalogo = new Map(
    (Array.isArray(catalogoClasses) ? catalogoClasses : []).map(classe => [classe.id, classe]),
  );
  const nivelTotal = classes.reduce(
    (total, classe) => total + Math.max(0, Math.trunc(Number(classe?.nivel) || 0)),
    0,
  );
  const temNivelDeReferencia = nivelDeReferencia !== null
    && nivelDeReferencia !== undefined
    && Number.isFinite(Number(nivelDeReferencia));
  const nivelParaEscala = temNivelDeReferencia
    ? Math.max(1, Number(nivelDeReferencia))
    : Math.max(1, nivelTotal);
  const derivados = calcularDerivados(
    atributosFinais,
    raca,
    nivelParaEscala,
    escolhaRacial,
  );
  const atributosEfetivos = aplicarAjustesAtributosRaciais(
    atributosFinais,
    raca,
    escolhaRacial,
  );
  const modConstituicao = modificador(atributosEfetivos.constituicao);
  let vida = derivados.vida;
  let mana = derivados.mana;
  let recursosDefinidos = true;

  classes.forEach((referencia, indice) => {
    const classe = catalogo.get(referencia?.id);
    const vidaClasse = Number(classe?.vida);
    const manaClasse = Number(classe?.mana);
    if (!Number.isFinite(vidaClasse) || !Number.isFinite(manaClasse)) {
      recursosDefinidos = false;
      return;
    }

    // O primeiro nível da primeira classe já está coberto pelas fórmulas
    // iniciais. Todo nível posterior, inclusive o primeiro de uma nova
    // classe, concede os recursos da classe escolhida naquele avanço.
    const niveisComGanho = Math.max(
      0,
      Math.trunc(Number(referencia.nivel) || 0) - (indice === 0 ? 1 : 0),
    );
    vida += niveisComGanho * Math.max(1, vidaClasse + modConstituicao);
    mana += niveisComGanho * Math.max(1, manaClasse);
  });

  return { ...derivados, vida, mana, recursosDefinidos };
}

export function calcularLunarisInicial() {
  return 20;
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

export function obterGrauPericiaEfetivo(personagem, periciaId) {
  const grauBase = personagem?.pericias?.[periciaId] || 'iniciante';
  const indiceBase = Math.max(0, GRAUS_PERICIA.indexOf(grauBase));
  const recebeArquivoVivo = personagem?.racaId === 'clone'
    && personagem?.escolhaRacial?.varianteId === 'arquivo-vivo'
    && personagem?.escolhaRacial?.periciasProjeto?.includes(periciaId);
  if (!recebeArquivoVivo) return GRAUS_PERICIA[indiceBase];

  const nivel = Math.max(1, Number(personagem?.nivel) || 1);
  const indiceMaximo = GRAUS_PERICIA.reduce(
    (maior, grau, indice) => nivel >= NIVEL_MINIMO_GRAU[grau] ? indice : maior,
    0,
  );
  return GRAUS_PERICIA[Math.min(indiceBase + 1, indiceMaximo)];
}

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
