import { storage } from '../../core/storage.js';
import { marcosAtributo, marcosLegado, totalNiveisClasse } from '../config/progressao.js';
import { ATRIBUTOS, GRAUS_PERICIA, aplicarModificadoresRaciais, calcularDerivados } from './calculoService.js';
import {
  normalizarCarteiraPersonagem,
  normalizarConfigInventario,
  normalizarInventario,
} from './inventarioService.js';
import {
  normalizarAtaques,
  sincronizarAtaquesComInventario,
} from './ataquesService.js';
import { normalizarMagias } from './magiasService.js';
import { normalizarNotas } from './notasService.js';
import { normalizarAliados } from './aliadosService.js';

const CHAVE_STORAGE = 'ficha-personagens';
const LIMITE_IMPORTACAO_CARACTERES = 5 * 1024 * 1024;

function gerarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `personagem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMapa() {
  const mapa = storage.get(CHAVE_STORAGE);
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return {};
  return Object.fromEntries(
    Object.entries(mapa).map(([id, personagem]) => [id, normalizarPersonagem(personagem)]),
  );
}

const ATRIBUTOS_PERICIA_PERSONALIZADA = new Set([
  'forca',
  'destreza',
  'constituicao',
  'inteligencia',
  'sabedoria',
  'carisma',
  'fluxo',
]);

// Teto 99 espelha o input editável da aba Ficha (marcos de atributo e itens
// podem levar um atributo além dos 20 da criação; truncar aqui silenciosamente
// desfazia a edição no próximo carregamento).
function normalizarMapaAtributos(valor, fallback = 10) {
  const origem = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  return Object.fromEntries(ATRIBUTOS.map(chave => {
    const numero = Number(origem[chave]);
    const seguro = Number.isFinite(numero) ? numero : fallback;
    return [chave, Math.max(1, Math.min(99, Math.trunc(seguro)))];
  }));
}

function numeroFinito(valor, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function inteiroNaoNegativo(valor, maximo = Number.MAX_SAFE_INTEGER) {
  return Math.max(0, Math.min(maximo, Math.trunc(numeroFinito(valor, 0))));
}

// Um import feito à mão pode trazer grau inválido ("mestre2", número...) —
// grau desconhecido quebraria a aba Perícias (GRAUS_INFO[grau] indefinido).
// "iniciante" explícito também é descartado: ausência no mapa já significa isso.
function normalizarGrausPericias(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(
    Object.entries(valor)
      .slice(0, 300)
      .filter(([id, grau]) => String(id).trim() && grau !== 'iniciante' && GRAUS_PERICIA.includes(grau))
      .map(([id, grau]) => [String(id).trim().slice(0, 80), grau]),
  );
}

const CHAVES_AJUSTES_RECURSOS = [
  'ajustesVida', 'ajustesMana', 'ajustesSanidade',
  'ajustesDefesa', 'ajustesIniciativa', 'ajustesMovimento',
];
const CHAVES_NUMERICAS_RECURSOS = [
  'armadura', 'penalidadeDefesa', 'bonusDefesa', 'bonusIniciativa', 'penalidadeMovimento',
];
const CHAVES_TEXTO_RECURSOS = ['resistencias', 'proficiencias', 'condicoesAtivas', 'status'];

function normalizarListaAjustes(valor) {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 50).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const numero = Math.max(-9999, Math.min(9999, Math.trunc(numeroFinito(item.valor))));
    if (!numero) return [];
    return [{
      valor: numero,
      motivo: String(item.motivo || '').trim().slice(0, 120),
      origem: String(item.origem || '').trim().slice(0, 40),
    }];
  });
}

// As views assumem os formatos destes campos (somaAjustes faz .reduce na
// lista, os modais fazem .map) — um import corrompido não pode derrubar a
// aba Ficha inteira. Só normaliza chaves presentes pra não inchar o save.
function sanitizarCamposRecursos(recursos) {
  CHAVES_AJUSTES_RECURSOS.forEach(chave => {
    if (chave in recursos) recursos[chave] = normalizarListaAjustes(recursos[chave]);
  });
  CHAVES_NUMERICAS_RECURSOS.forEach(chave => {
    if (chave in recursos) recursos[chave] = Math.max(-9999, Math.min(9999, numeroFinito(recursos[chave])));
  });
  CHAVES_TEXTO_RECURSOS.forEach(chave => {
    if (chave in recursos) recursos[chave] = String(recursos[chave] ?? '').slice(0, 2000);
  });
  return recursos;
}

function normalizarPericiasPersonalizadas(valor) {
  if (!Array.isArray(valor)) return [];

  const unicas = new Map();
  valor.slice(0, 50).forEach((item, indice) => {
    if (!item || typeof item !== 'object') return;
    const titulo = String(item.titulo || '').trim().slice(0, 60);
    if (!titulo) return;
    const idBruto = String(item.id || `importada-${indice}`).trim().slice(0, 80);
    const id = idBruto.startsWith('personalizada-') ? idBruto : `personalizada-${idBruto}`;
    const atributo = ATRIBUTOS_PERICIA_PERSONALIZADA.has(item.atributo)
      ? item.atributo
      : 'inteligencia';
    unicas.set(id, {
      id,
      titulo,
      tipo: item.tipo === 'oficio' ? 'oficio' : 'pericia',
      atributo,
      descricao: String(item.descricao || '').trim().slice(0, 180),
      personalizada: true,
    });
  });
  return [...unicas.values()];
}

function normalizarAtributosPericias(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(
    Object.entries(valor)
      .slice(0, 200)
      .filter(([id, atributo]) => String(id).trim() && ATRIBUTOS_PERICIA_PERSONALIZADA.has(atributo))
      .map(([id, atributo]) => [String(id).trim().slice(0, 80), atributo]),
  );
}

function normalizarRolagensPericias(valor, situacoesLegadas) {
  const temFormatoNovo = valor && typeof valor === 'object' && !Array.isArray(valor);
  const origem = temFormatoNovo ? valor : {};
  const resultado = {};
  Object.entries(origem).slice(0, 200).forEach(([id, rolagem]) => {
    if (!rolagem || typeof rolagem !== 'object') return;
    const vantagens = Math.max(0, Math.min(20, Math.trunc(Number(rolagem.vantagens) || 0)));
    const desvantagens = Math.max(0, Math.min(20, Math.trunc(Number(rolagem.desvantagens) || 0)));
    if (vantagens || desvantagens) resultado[String(id).trim().slice(0, 80)] = { vantagens, desvantagens };
  });

  // Migra fichas que usavam apenas Normal/Vantagem/Desvantagem. Depois que o
  // novo campo existe, ate um mapa vazio e considerado a fonte de verdade.
  if (!temFormatoNovo && situacoesLegadas && typeof situacoesLegadas === 'object') {
    Object.entries(situacoesLegadas).forEach(([id, situacao]) => {
      if (situacao === 'vantagem') resultado[id] = { vantagens: 1, desvantagens: 0 };
      if (situacao === 'desvantagem') resultado[id] = { vantagens: 0, desvantagens: 1 };
    });
  }
  return resultado;
}

const TIPOS_ENTRADA_FICHA = new Set(['ativa', 'passiva', 'reacao', 'sustentada', 'outro']);
const CUSTOS_ENTRADA_FICHA = new Set(['Nenhum', 'Mana', 'Vida', 'Sanidade', 'Cansaço']);
const TIPOS_EFEITO_FICHA = new Set([
  'recurso_maximo', 'atributo', 'combate', 'pericia_bonus',
  'pericia_vantagem', 'pericia_desvantagem',
]);

function normalizarEfeitosFicha(valor) {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 50).flatMap((efeito, indice) => {
    if (!efeito || typeof efeito !== 'object' || !TIPOS_EFEITO_FICHA.has(efeito.tipo)) return [];
    const alvo = String(efeito.alvo || '').trim().slice(0, 100);
    if (!alvo) return [];
    const valorNumerico = Math.max(-999, Math.min(999, Math.trunc(Number(efeito.valor) || 0)));
    if (!valorNumerico) return [];
    return [{
      id: String(efeito.id || `efeito-${indice}`).trim().slice(0, 100),
      tipo: efeito.tipo,
      alvo,
      valor: valorNumerico,
      modo: efeito.modo === 'ao_usar' ? 'ao_usar' : 'sempre',
      descricao: String(efeito.descricao || '').trim().slice(0, 160),
    }];
  });
}

function normalizarEntradasFicha(valor, prefixo) {
  if (!Array.isArray(valor)) return [];
  const unicas = new Map();
  valor.slice(0, 100).forEach((item, indice) => {
    if (!item || typeof item !== 'object') return;
    const nome = String(item.nome || item.titulo || '').trim().slice(0, 80);
    if (!nome) return;
    const idBruto = String(item.id || `${prefixo}-importado-${indice}`).trim().slice(0, 100);
    const id = idBruto.startsWith(`${prefixo}-`) ? idBruto : `${prefixo}-${idBruto}`;
    const tipo = TIPOS_ENTRADA_FICHA.has(item.tipo) ? item.tipo : 'ativa';
    let efeitos = normalizarEfeitosFicha(item.efeitos);
    if (tipo === 'passiva') efeitos = efeitos.map(efeito => ({ ...efeito, modo: 'sempre' }));
    unicas.set(id, {
      id,
      nome,
      fonte: String(item.fonte || 'Geral').trim().slice(0, 60) || 'Geral',
      tipo,
      nivel: Math.max(0, Math.min(40, Math.trunc(Number(item.nivel) || 0))),
      custo: Math.max(0, Math.min(999, Math.trunc(Number(item.custo) || 0))),
      tipoCusto: CUSTOS_ENTRADA_FICHA.has(item.tipoCusto) ? item.tipoCusto : 'Nenhum',
      acao: String(item.acao || '').trim().slice(0, 80),
      duracao: String(item.duracao || '').trim().slice(0, 80),
      alcance: String(item.alcance || '').trim().slice(0, 80),
      modificadores: String(item.modificadores || '').trim().slice(0, 500),
      efeitos,
      descricao: String(item.descricao || '').trim().slice(0, 2000),
    });
  });
  return [...unicas.values()];
}

function normalizarHistoricoUsos(valor) {
  if (!Array.isArray(valor)) return [];
  return valor.slice(-100).flatMap(item => {
    if (!item || typeof item !== 'object' || !String(item.nome || '').trim()) return [];
    return [{
      id: String(item.id || '').slice(0, 100),
      colecao: ['poderes', 'habilidades', 'magias'].includes(item.colecao)
        ? item.colecao
        : 'poderes',
      nome: String(item.nome).trim().slice(0, 80),
      custo: Math.max(0, Math.min(999, Math.trunc(Number(item.custo) || 0))),
      tipoCusto: CUSTOS_ENTRADA_FICHA.has(item.tipoCusto) ? item.tipoCusto : 'Nenhum',
      usadoEm: String(item.usadoEm || new Date(0).toISOString()).slice(0, 40),
    }];
  });
}

function normalizarEfeitosAtivos(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(
    Object.entries(valor).slice(0, 200).filter(([id, ativo]) => String(id).trim() && ativo === true),
  );
}

function normalizarPersonagem(personagem) {
  const nivel = Math.max(1, Math.min(40, Math.trunc(Number(personagem?.nivel) || 1)));
  const eraVersaoAntiga = personagem?.versaoRegras !== '1.0';
  const referenciaRaca = { id: personagem?.racaId };
  // Fluxo foi acrescentado depois das primeiras fichas. Ausência de qualquer
  // atributo em um save antigo/importado recebe a base neutra 10, evitando
  // `undefined`, NaN ou Fluxo 1 durante a migração.
  const atributosBaseMigrados = normalizarMapaAtributos(personagem?.atributosBase);
  const atributosFinaisFonte = eraVersaoAntiga && nivel === 1 && personagem?.atributosBase
    ? aplicarModificadoresRaciais(atributosBaseMigrados, referenciaRaca, {
      escolhaGigante: personagem?.escolhaRacial?.gigante,
    })
    : personagem?.atributosFinais
      || aplicarModificadoresRaciais(atributosBaseMigrados, referenciaRaca, {
        escolhaGigante: personagem?.escolhaRacial?.gigante,
      });
  const atributosFinaisMigrados = normalizarMapaAtributos(atributosFinaisFonte);
  const classesExistentes = Array.isArray(personagem?.classes)
    ? [...new Map(personagem.classes
      .filter(item => item?.id)
      .slice(0, 3)
      .map(item => [String(item.id).trim().slice(0, 80), {
        id: String(item.id).trim().slice(0, 80),
        nivel: Math.max(1, Math.min(20, Math.trunc(Number(item.nivel) || 1))),
      }])).values()]
    : [];
  const classes = classesExistentes.length > 0
    ? classesExistentes
    : personagem?.classeId
      ? [{ id: personagem.classeId, nivel: Math.min(20, nivel) }]
      : [];
  const derivadosCalculados = calcularDerivados(atributosFinaisMigrados, referenciaRaca, nivel);
  const derivadosAntigos = eraVersaoAntiga && nivel === 1
    ? derivadosCalculados
    : { ...derivadosCalculados, ...(personagem?.derivados || {}) };
  const derivados = {
    ...derivadosAntigos,
    mana: derivadosAntigos.mana ?? derivadosAntigos.forcaVital ?? 0,
  };
  const recursosAntigos = personagem?.recursos || {};
  const vidaMaximaConhecida = Math.max(1, numeroFinito(derivados.vida, 1));
  const manaMaximaConhecida = Math.max(1, numeroFinito(derivados.mana, 1));
  const recursos = sanitizarCamposRecursos({
    ...recursosAntigos,
    vidaAtual: Math.max(-vidaMaximaConhecida, numeroFinito(recursosAntigos.vidaAtual, vidaMaximaConhecida)),
    manaAtual: Math.max(0, numeroFinito(
      recursosAntigos.manaAtual ?? recursosAntigos.forcaVitalAtual,
      manaMaximaConhecida,
    )),
    sanidade: Math.max(0, Math.min(100, numeroFinito(recursosAntigos.sanidade, 100))),
    cansaco: Math.max(0, Math.min(6, Math.trunc(numeroFinito(recursosAntigos.cansaco, 0)))),
  });
  // `lunaris` existe apenas como espelho legado. Quando a ficha já possui a
  // carteira nova, ela é a fonte de verdade; reaplicar o campo antigo aqui
  // poderia desfazer uma alteração feita no modal da carteira.
  const temCarteiraEstruturada = Array.isArray(personagem?.carteira)
    || (personagem?.carteira && typeof personagem.carteira === 'object');
  const carteira = normalizarCarteiraPersonagem(
    personagem?.carteira,
    temCarteiraEstruturada ? undefined : personagem?.lunaris,
  );
  const saldoLunaris = carteira.find(moeda => moeda.id === 'lunaris' || moeda.nome.toLocaleLowerCase('pt-BR') === 'lunaris')?.saldo
    ?? Number(personagem?.lunaris)
    ?? 0;
  const legadoConcedidos = personagem?.marcosLegadoConcedidos
    ?? (eraVersaoAntiga ? marcosLegado(nivel) : 0);
  const atributoConcedidos = personagem?.marcosAtributoConcedidos
    ?? (eraVersaoAntiga ? marcosAtributo(nivel) : 0);
  const inventario = normalizarInventario(personagem?.inventario);
  const ataques = sincronizarAtaquesComInventario(
    inventario,
    normalizarAtaques(personagem?.ataques),
  );

  return {
    ...personagem,
    versaoRegras: '1.0',
    nivel,
    xp: inteiroNaoNegativo(personagem?.xp),
    classes,
    atributosBase: atributosBaseMigrados,
    atributosFinais: atributosFinaisMigrados,
    derivados,
    recursos,
    pericias: normalizarGrausPericias(personagem?.pericias),
    periciasPersonalizadas: normalizarPericiasPersonalizadas(personagem?.periciasPersonalizadas),
    atributosPericias: normalizarAtributosPericias(personagem?.atributosPericias),
    rolagensPericias: normalizarRolagensPericias(
      personagem?.rolagensPericias,
      personagem?.situacoesPericias,
    ),
    situacoesPericias: personagem?.situacoesPericias && typeof personagem.situacoesPericias === 'object'
      ? personagem.situacoesPericias
      : {},
    inventario,
    inventarioConfig: normalizarConfigInventario(personagem?.inventarioConfig),
    carteira,
    lunaris: saldoLunaris,
    poderes: normalizarEntradasFicha(personagem?.poderes, 'poder'),
    habilidades: normalizarEntradasFicha(personagem?.habilidades, 'habilidade'),
    historicoUsos: normalizarHistoricoUsos(personagem?.historicoUsos),
    efeitosAtivos: normalizarEfeitosAtivos(personagem?.efeitosAtivos),
    ataques,
    magias: normalizarMagias(personagem?.magias),
    notas: normalizarNotas(personagem?.notas),
    aliados: normalizarAliados(personagem?.aliados),
    legadosEscolhidos: Array.isArray(personagem?.legadosEscolhidos) ? personagem.legadosEscolhidos : [],
    legadosOrigemInicial: Array.isArray(personagem?.legadosOrigemInicial)
      ? personagem.legadosOrigemInicial
      : [],
    legadosIniciaisPendentes: inteiroNaoNegativo(
      personagem?.legadosIniciaisPendentes
        || (eraVersaoAntiga ? personagem?.legadosAscensaoPendentes : 0),
      40,
    ),
    legadosAscensaoPendentes: inteiroNaoNegativo(
      personagem?.legadosAscensaoPendentes,
      40,
    ) + (eraVersaoAntiga ? marcosLegado(nivel) : 0),
    marcosLegadoConcedidos: legadoConcedidos,
    aumentosAtributoPendentes: inteiroNaoNegativo(
      personagem?.aumentosAtributoPendentes,
      40,
    ) + (eraVersaoAntiga ? marcosAtributo(nivel) : 0),
    marcosAtributoConcedidos: atributoConcedidos,
    niveisClassePendentes: Math.max(0, Math.trunc(nivel - totalNiveisClasse(classes))),
    niveisRecursosPendentes: inteiroNaoNegativo(personagem?.niveisRecursosPendentes, 40),
  };
}

function salvarMapa(mapa) {
  return storage.set(CHAVE_STORAGE, mapa);
}

export function listarPersonagens() {
  return Object.values(getMapa())
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
}

export function obterPersonagem(id) {
  return getMapa()[id] || null;
}

// atributosBase: valores rolados (7d20) e distribuídos pelo jogador, antes
// de modificador racial. atributosFinais/derivados/lunarisInicial já vêm
// calculados do wizard (ver services/calculoService.js) — este serviço só
// persiste, não recalcula nada.
export function criarPersonagem({
  nome, arvoreId, racaId, classeId,
  atributosBase, atributosFinais, derivados,
  lunarisInicial, legadosAscensaoPendentes,
  pericias, inventarioInicial, escolhaRacial,
}) {
  const nomeLimpo = String(nome || '').trim();
  if (!nomeLimpo) return { ok: false, mensagem: 'Dê um nome ao personagem antes de criar.' };

  const agora = new Date().toISOString();
  const personagem = {
    id: gerarId(),
    nome: nomeLimpo,
    arvoreId: arvoreId || null,
    racaId: racaId || null,
    // Identidade solta, sem efeito mecânico — preenchida/editada na Ficha,
    // não no wizard (que já é longo o suficiente sem pedir isso na criação).
    tamanho: '',
    origem: '',
    titulo: '',
    classeId: classeId || null,
    classes: classeId ? [{ id: classeId, nivel: 1 }] : [],
    nivel: 1,
    xp: 0,
    versaoRegras: '1.0',
    atributosBase: atributosBase || null,
    atributosFinais: atributosFinais || null,
    derivados: derivados || null,
    // Recursos "atuais" (jogáveis, sobem/descem em mesa) separados dos
    // "derivados" (máximos calculados na criação) — ver views/personagem/.
    recursos: {
      vidaAtual: derivados?.vida ?? 0,
      manaAtual: derivados?.mana ?? 0,
      sanidade: 100,
      cansaco: 0,
    },
    foto: null,
    lunaris: typeof lunarisInicial === 'number' ? lunarisInicial : 20,
    legadosAscensaoPendentes: typeof legadosAscensaoPendentes === 'number' ? legadosAscensaoPendentes : 0,
    legadosIniciaisPendentes: typeof legadosAscensaoPendentes === 'number' ? legadosAscensaoPendentes : 0,
    legadosEscolhidos: [],
    legadosOrigemInicial: [],
    marcosLegadoConcedidos: 0,
    marcosAtributoConcedidos: 0,
    aumentosAtributoPendentes: 0,
    niveisClassePendentes: 0,
    niveisRecursosPendentes: 0,
    escolhaRacial: escolhaRacial || {},
    // Ausência de uma perícia neste mapa == grau "iniciante" (ver
    // calculoService.js/GRAUS_PERICIA) — só grava o que já foi treinado.
    pericias: pericias || {},
    periciasPersonalizadas: [],
    atributosPericias: {},
    rolagensPericias: {},
    situacoesPericias: {},
    inventario: normalizarInventario(inventarioInicial),
    inventarioConfig: normalizarConfigInventario(),
    carteira: normalizarCarteiraPersonagem(null, lunarisInicial),
    poderes: [],
    habilidades: [],
    historicoUsos: [],
    efeitosAtivos: {},
    ataques: [],
    magias: [],
    aliados: [],
    notas: [],
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const mapa = getMapa();
  mapa[personagem.id] = personagem;
  if (!salvarMapa(mapa)) {
    return { ok: false, mensagem: 'Não foi possível salvar o personagem no navegador.' };
  }
  return { ok: true, personagem };
}

// Atualização parcial genérica — todas as abas da ficha completa (recursos,
// perícias, poderes, inventário, ataques, aliados, notas...) passam por
// aqui em vez de terem uma função de update dedicada cada uma.
export function atualizarPersonagem(id, patch) {
  const mapa = getMapa();
  const atual = mapa[id];
  if (!atual) return { ok: false, mensagem: 'Personagem não encontrado.' };

  const alteracoes = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  const atualizado = normalizarPersonagem({
    ...atual,
    ...alteracoes,
    // O identificador e a data de criação não são campos editáveis da ficha.
    id: atual.id,
    criadoEm: atual.criadoEm,
    atualizadoEm: new Date().toISOString(),
  });
  mapa[id] = atualizado;
  if (!salvarMapa(mapa)) {
    return { ok: false, mensagem: 'Não foi possível salvar as alterações no navegador.' };
  }
  return { ok: true, personagem: atualizado };
}

export function excluirPersonagem(id) {
  const mapa = getMapa();
  if (!mapa[id]) return false;
  delete mapa[id];
  return salvarMapa(mapa);
}

// JSON completo do personagem, pra baixar como arquivo — mesmo dado que já
// existe (nada de exportação parcial), só num lugar mais prático que a Ficha.
export function exportarPersonagem(id) {
  const personagem = obterPersonagem(id);
  return personagem ? JSON.stringify(personagem, null, 2) : null;
}

// Aceita tanto um export daqui quanto uma ficha vinda de outra pessoa/outro
// PC — sempre com id novo (nunca reaproveita o do arquivo, pra não colidir
// com um personagem que já exista neste navegador). normalizarPersonagem já
// preenche/migra campos ausentes, então serve tanto pra formatos antigos
// quanto pra um JSON incompleto passado à mão.
export function importarPersonagem(raw) {
  if (typeof raw !== 'string' || raw.length > LIMITE_IMPORTACAO_CARACTERES) {
    return { ok: false, mensagem: 'Erro: o arquivo do personagem está vazio ou excede 5MB.' };
  }
  let bruto;
  try {
    bruto = JSON.parse(raw);
  } catch {
    return { ok: false, mensagem: 'Erro: arquivo inválido (JSON malformado).' };
  }

  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto) || !String(bruto.nome || '').trim()) {
    return { ok: false, mensagem: 'Erro: arquivo inválido — não parece ser um personagem (falta "nome").' };
  }

  const agora = new Date().toISOString();
  const personagem = normalizarPersonagem({
    ...bruto,
    id: gerarId(),
    criadoEm: bruto.criadoEm || agora,
    atualizadoEm: agora,
  });

  const mapa = getMapa();
  mapa[personagem.id] = personagem;
  if (!salvarMapa(mapa)) {
    return { ok: false, mensagem: 'Não foi possível salvar o personagem importado no navegador.' };
  }
  return { ok: true, personagem, mensagem: `${personagem.nome} foi importado.` };
}
