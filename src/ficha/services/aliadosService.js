function texto(valor, maximo = 200) {
  return String(valor ?? '').trim().slice(0, maximo);
}

function numero(valor, { minimo = 0, maximo = 9999, padrao = 0 } = {}) {
  const recebido = Number(valor);
  const base = Number.isFinite(recebido) ? recebido : padrao;
  return Math.trunc(Math.max(minimo, Math.min(maximo, base)));
}

function gerarId() {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `aliado-${token}`;
}

export function normalizarAliado(aliado, indice = 0) {
  if (!aliado || typeof aliado !== 'object' || Array.isArray(aliado)) return null;
  const categoria = aliado.categoria === 'complexo' || aliado.personagemId ? 'complexo' : 'comum';
  if (categoria === 'complexo') {
    const personagemId = texto(aliado.personagemId, 120);
    if (!personagemId) return null;
    return {
      id: texto(aliado.id, 120) || `aliado-complexo-${indice}`,
      categoria,
      personagemId,
      papel: texto(aliado.papel, 80),
      nota: texto(aliado.nota, 2000),
      emCena: aliado.emCena !== false,
    };
  }

  const nome = texto(aliado.nome, 100);
  if (!nome) return null;
  const vidaMaxima = numero(aliado.vidaMaxima ?? aliado.vida ?? aliado.pv_max, { minimo: 1, maximo: 999999, padrao: 10 });
  const vidaAtual = numero(aliado.vidaAtual ?? aliado.vida ?? aliado.pv_atual ?? vidaMaxima, { minimo: -vidaMaxima, maximo: vidaMaxima, padrao: vidaMaxima });
  return {
    id: texto(aliado.id, 120) || `aliado-comum-${indice}`,
    categoria,
    nome,
    especie: texto(aliado.especie ?? aliado.tipo, 80) || 'Aliado',
    papel: texto(aliado.papel, 80),
    nivel: numero(aliado.nivel, { minimo: 0, maximo: 99, padrao: 1 }),
    vidaAtual,
    vidaMaxima,
    defesa: numero(aliado.defesa, { minimo: -999, maximo: 999, padrao: 10 }),
    movimento: texto(aliado.movimento ?? aliado.movimentacao, 60),
    iniciativa: numero(aliado.iniciativa, { minimo: -999, maximo: 999 }),
    ataqueNome: texto(aliado.ataqueNome ?? aliado.ataque, 100),
    bonusAtaque: numero(aliado.bonusAtaque, { minimo: -999, maximo: 999 }),
    dano: texto(aliado.dano, 100),
    alcance: texto(aliado.alcance, 80),
    habilidades: texto(aliado.habilidades, 3000),
    condicoes: texto(aliado.condicoes, 500),
    nota: texto(aliado.nota ?? aliado.descricao, 3000),
    emCena: aliado.emCena !== false,
  };
}

export function normalizarAliados(valor) {
  if (!Array.isArray(valor)) return [];
  const unicos = new Map();
  valor.slice(0, 200).forEach((aliado, indice) => {
    const normalizado = normalizarAliado(aliado, indice);
    if (normalizado) unicos.set(normalizado.id, normalizado);
  });
  return [...unicos.values()];
}

export function criarAliadoComum(dados) {
  return normalizarAliado({ ...dados, id: gerarId(), categoria: 'comum' });
}

export function criarVinculoAliado(personagemId, dados = {}) {
  return normalizarAliado({
    ...dados,
    id: gerarId(),
    categoria: 'complexo',
    personagemId,
  });
}
