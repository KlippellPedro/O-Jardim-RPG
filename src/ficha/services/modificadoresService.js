function entradasComOrigem(personagem) {
  return [
    ...(personagem.poderes || []).map(item => ({ item, colecao: 'poderes' })),
    ...(personagem.habilidades || []).map(item => ({ item, colecao: 'habilidades' })),
    ...(personagem.magias || []).map(item => ({ item, colecao: 'magias' })),
  ];
}

function itemFuncional(item) {
  return !item.durabilidadeMaxima || item.durabilidadeAtual > 0;
}

function efeitosEquipamentos(personagem) {
  return (personagem.inventario || []).flatMap(item => {
    if (!item.equipado || !itemFuncional(item) || item.tipo !== 'armadura') return [];
    const efeitos = [];
    const defesa = Number(item.defesa) || 0;
    const penalidade = Math.abs(Number(item.penalidade) || 0);
    if (defesa) efeitos.push({
      id: `inventario-${item.id}-defesa`,
      tipo: 'combate',
      alvo: 'defesa',
      valor: defesa,
      modo: 'equipado',
      descricao: 'Bônus da armadura equipada',
      origemId: item.id,
      origemNome: item.nome,
      colecao: 'inventario',
    });
    if (penalidade) efeitos.push({
      id: `inventario-${item.id}-movimento`,
      tipo: 'combate',
      alvo: 'movimento',
      valor: -penalidade,
      modo: 'equipado',
      descricao: 'Penalidade da armadura equipada',
      origemId: item.id,
      origemNome: item.nome,
      colecao: 'inventario',
    });
    return efeitos;
  });
}

export function listarEfeitosAtivos(personagem, tipo = null, alvo = null) {
  const configurados = entradasComOrigem(personagem).flatMap(({ item, colecao }) =>
    (item.efeitos || []).flatMap(efeito => {
      const ativo = efeito.modo === 'sempre' || personagem.efeitosAtivos?.[item.id] === true;
      if (!ativo || (tipo && efeito.tipo !== tipo) || (alvo && efeito.alvo !== alvo)) return [];
      return [{ ...efeito, origemId: item.id, origemNome: item.nome, colecao }];
    }));
  return [...configurados, ...efeitosEquipamentos(personagem)]
    .filter(efeito => (!tipo || efeito.tipo === tipo) && (!alvo || efeito.alvo === alvo));
}

export function somarModificadores(personagem, tipo, alvo) {
  return listarEfeitosAtivos(personagem, tipo, alvo)
    .reduce((total, efeito) => total + (Number(efeito.valor) || 0), 0);
}

export function valorAtributoEfetivo(personagem, atributo) {
  return (Number(personagem.atributosFinais?.[atributo]) || 0)
    + somarModificadores(personagem, 'atributo', atributo);
}

export function modificadoresRolagemPericia(personagem, periciaId) {
  const vantagens = listarEfeitosAtivos(personagem, 'pericia_vantagem', periciaId);
  const desvantagens = listarEfeitosAtivos(personagem, 'pericia_desvantagem', periciaId);
  return {
    vantagens: vantagens.reduce((total, efeito) => total + Math.max(0, Number(efeito.valor) || 0), 0),
    desvantagens: desvantagens.reduce((total, efeito) => total + Math.max(0, Number(efeito.valor) || 0), 0),
    fontes: [...vantagens, ...desvantagens],
  };
}

export function entradaTemEfeitoAoUsar(item) {
  return (item.efeitos || []).some(efeito => efeito.modo === 'ao_usar');
}
