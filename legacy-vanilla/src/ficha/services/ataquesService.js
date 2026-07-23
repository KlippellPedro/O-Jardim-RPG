import {
  BONUS_GRAU,
  calcularBonusPericia,
  modificador,
  obterGrauPericiaEfetivo,
} from './calculoService.js';
import {
  listarEfeitosAtivos,
  modificadoresRolagemPericia,
  somarModificadores,
  valorAtributoEfetivo,
} from './modificadoresService.js';

const PERICIAS_ATAQUE = new Set(['luta', 'pontaria']);

function texto(valor, maximo = 200) {
  return String(valor ?? '').trim().slice(0, maximo);
}

function gerarId() {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `ataque-${token}`;
}

export function normalizarAtaque(ataque) {
  if (!ataque || typeof ataque !== 'object' || Array.isArray(ataque)) return null;
  const nome = texto(ataque.nome, 100);
  if (!nome) return null;
  return {
    id: texto(ataque.id, 140) || gerarId(),
    origemItemId: texto(ataque.origemItemId, 120),
    nome,
    pericia: PERICIAS_ATAQUE.has(ataque.pericia) ? ataque.pericia : 'luta',
    dano: texto(ataque.dano, 100),
    tipo: texto(ataque.tipo, 100),
    critico: texto(ataque.critico, 80),
    alcance: texto(ataque.alcance, 100),
    descricao: texto(ataque.descricao, 2000),
  };
}

export function normalizarAtaques(valor) {
  if (!Array.isArray(valor)) return [];
  const unicos = new Map();
  valor.slice(0, 200).forEach(ataque => {
    const normalizado = normalizarAtaque(ataque);
    if (normalizado) unicos.set(normalizado.id, normalizado);
  });
  return [...unicos.values()];
}

export function sincronizarAtaquesComInventario(inventario, ataquesAtuais) {
  const atuais = normalizarAtaques(ataquesAtuais);
  const manuais = atuais.filter(ataque => !ataque.origemItemId);
  const existentes = new Map(
    atuais.filter(ataque => ataque.origemItemId).map(ataque => [ataque.origemItemId, ataque]),
  );
  const gerados = (Array.isArray(inventario) ? inventario : [])
    .filter(item => item?.tipo === 'arma'
      && item.equipado
      && item.sincronizarAtaque !== false
      && (!item.durabilidadeMaxima || item.durabilidadeAtual > 0))
    .map(item => normalizarAtaque({
      id: existentes.get(item.id)?.id || `ataque-${item.id}`,
      origemItemId: item.id,
      nome: item.nome,
      pericia: item.pericia || 'luta',
      dano: item.dano,
      tipo: item.tipoDano,
      critico: item.critico,
      alcance: item.alcance,
      descricao: [item.propriedades, item.efeito].filter(Boolean).join(' · '),
    }))
    .filter(Boolean);
  return [...manuais, ...gerados];
}

export function dadosCalculoAtaque(personagem, ataque, catalogo) {
  const periciaId = PERICIAS_ATAQUE.has(ataque?.pericia) ? ataque.pericia : 'luta';
  const pericia = (catalogo?.pericias || []).find(item => item.id === periciaId) || {
    id: periciaId,
    titulo: periciaId === 'pontaria' ? 'Pontaria' : 'Luta',
    atributo: periciaId === 'pontaria' ? 'destreza' : 'forca',
  };
  const atributo = personagem?.atributosPericias?.[periciaId] || pericia.atributo;
  const valorAtributo = valorAtributoEfetivo(personagem, atributo) || 10;
  const modAtributo = modificador(valorAtributo);
  const nivel = Math.max(1, Number(personagem?.nivel) || 1);
  const metadeNivel = Math.floor(nivel / 2);
  const grau = obterGrauPericiaEfetivo(personagem, periciaId);
  const bonusGrau = BONUS_GRAU[grau] ?? 0;
  const bonusEfeitos = somarModificadores(personagem, 'pericia_bonus', periciaId);
  const total = calcularBonusPericia(grau, modAtributo, nivel) + bonusEfeitos;
  const manuais = personagem?.rolagensPericias?.[periciaId] || {};
  const automaticos = modificadoresRolagemPericia(personagem, periciaId);
  const rolagem = {
    vantagens: Math.max(0, Number(manuais.vantagens) || 0) + automaticos.vantagens,
    desvantagens: Math.max(0, Number(manuais.desvantagens) || 0) + automaticos.desvantagens,
  };
  return {
    pericia,
    atributo,
    valorAtributo,
    modAtributo,
    nivel,
    metadeNivel,
    grau,
    bonusGrau,
    bonusEfeitos,
    efeitosBonus: listarEfeitosAtivos(personagem, 'pericia_bonus', periciaId),
    efeitosRolagem: automaticos.fontes,
    rolagem,
    total,
  };
}
