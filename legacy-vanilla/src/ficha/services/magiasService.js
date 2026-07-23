const TIPOS_EFEITO = new Set([
  'recurso_maximo', 'atributo', 'combate', 'pericia_bonus',
  'pericia_vantagem', 'pericia_desvantagem',
]);

const CUSTOS = new Set(['Nenhum', 'Mana', 'Vida', 'Sanidade', 'Cansaço']);

function texto(valor, maximo = 200) {
  return String(valor ?? '').trim().slice(0, maximo);
}

function gerarId() {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `magia-${token}`;
}

function normalizarEfeitos(valor) {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 50).flatMap((efeito, indice) => {
    if (!efeito || typeof efeito !== 'object' || !TIPOS_EFEITO.has(efeito.tipo)) return [];
    const alvo = texto(efeito.alvo, 100);
    const numero = Math.max(-999, Math.min(999, Math.trunc(Number(efeito.valor) || 0)));
    if (!alvo || !numero) return [];
    return [{
      id: texto(efeito.id, 100) || `efeito-${indice}`,
      tipo: efeito.tipo,
      alvo,
      valor: numero,
      modo: efeito.modo === 'sempre' ? 'sempre' : 'ao_usar',
      descricao: texto(efeito.descricao, 160),
    }];
  });
}

export function normalizarMagia(magia, indice = 0) {
  if (!magia || typeof magia !== 'object' || Array.isArray(magia)) return null;
  const nome = texto(magia.nome || magia.titulo, 100);
  if (!nome) return null;
  const custoLegado = magia.tipoCusto === 'PM' ? 'Mana' : magia.tipoCusto === 'PV' ? 'Vida' : magia.tipoCusto;
  return {
    id: texto(magia.id, 120) || `magia-importada-${indice}` || gerarId(),
    nome,
    circulo: texto(magia.circulo ?? magia.nivel, 40),
    escola: texto(magia.escola ?? magia.tipo, 80) || 'Geral',
    fonte: texto(magia.fonte, 80) || 'Grimório',
    custo: Math.max(0, Math.min(999, Math.trunc(Number(magia.custo) || 0))),
    tipoCusto: CUSTOS.has(custoLegado) ? custoLegado : 'Nenhum',
    acao: texto(magia.acao, 80),
    duracao: texto(magia.duracao, 80),
    alcance: texto(magia.alcance, 80),
    teste: texto(magia.teste, 120),
    descricao: texto(magia.descricao, 3000),
    efeitos: normalizarEfeitos(magia.efeitos),
  };
}

export function normalizarMagias(valor) {
  if (!Array.isArray(valor)) return [];
  const unicas = new Map();
  valor.slice(0, 200).forEach((magia, indice) => {
    const normalizada = normalizarMagia(magia, indice);
    if (normalizada) unicas.set(normalizada.id, normalizada);
  });
  return [...unicas.values()];
}

export function criarMagia(dados) {
  return normalizarMagia({ ...dados, id: gerarId() });
}
