import { getEntradas } from '../../loja/services/entradasService.js';
import { getMoedas } from '../../loja/services/moedasService.js';

export const TIPOS_INVENTARIO = [
  { id: 'arma', titulo: 'Arma', icone: '⚔', equipavel: true },
  { id: 'armadura', titulo: 'Armadura', icone: '⬡', equipavel: true },
  { id: 'equipamento', titulo: 'Equipamento', icone: '◆', equipavel: true },
  { id: 'consumivel', titulo: 'Consumível', icone: '✦', consumivel: true },
  { id: 'material', titulo: 'Material / Drop', icone: '◇' },
  { id: 'veiculo', titulo: 'Veículo', icone: '⚙' },
  { id: 'outro', titulo: 'Outro', icone: '◈' },
];

export const RARIDADES_INVENTARIO = [
  { id: 'comum', titulo: 'Comum' },
  { id: 'incomum', titulo: 'Incomum' },
  { id: 'raro', titulo: 'Raro' },
  { id: 'epico', titulo: 'Épico' },
  { id: 'lendario', titulo: 'Lendário' },
];

const TIPOS = new Set(TIPOS_INVENTARIO.map(item => item.id));
const RARIDADES = new Set(RARIDADES_INVENTARIO.map(item => item.id));

function texto(valor, maximo = 200) {
  return String(valor ?? '').trim().slice(0, maximo);
}

function numero(valor, { minimo = 0, maximo = 999999, inteiro = false, padrao = 0 } = {}) {
  const recebido = Number(valor);
  const base = Number.isFinite(recebido) ? recebido : padrao;
  const limitado = Math.max(minimo, Math.min(maximo, base));
  return inteiro ? Math.trunc(limitado) : limitado;
}

function slugTipo(valor) {
  const bruto = texto(valor, 40).toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (bruto === 'drop') return 'material';
  if (bruto === 'veículo') return 'veiculo';
  return TIPOS.has(bruto) ? bruto : 'equipamento';
}

function raridade(valor) {
  const normalizada = texto(valor, 30).toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return RARIDADES.has(normalizada) ? normalizada : 'comum';
}

function gerarId(prefixo = 'item') {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefixo}-${token}`;
}

function normalizarIdMoeda(valor, fallback = 'moeda') {
  const id = texto(valor, 60).toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  return id || fallback;
}

export function normalizarCarteiraPersonagem(valor, lunarisLegado) {
  const salvas = Array.isArray(valor)
    ? valor
    : valor && typeof valor === 'object'
      ? Object.entries(valor).map(([id, saldo]) => ({ id, nome: id, saldo }))
      : [];
  const porId = new Map();
  salvas.slice(0, 30).forEach((moeda, indice) => {
    if (!moeda || typeof moeda !== 'object') return;
    const nome = texto(moeda.nome || moeda.id, 40);
    if (!nome) return;
    const id = normalizarIdMoeda(moeda.id || nome, `moeda-${indice + 1}`);
    porId.set(id, {
      id,
      nome,
      simbolo: texto(moeda.simbolo, 3) || '◈',
      saldo: numero(moeda.saldo, { minimo: -999999999, maximo: 999999999 }),
    });
  });

  getMoedas().slice(0, 30).forEach((moeda, indice) => {
    const nome = texto(moeda.nome, 40);
    if (!nome) return;
    const id = normalizarIdMoeda(moeda.id || nome, `moeda-loja-${indice + 1}`);
    const existente = porId.get(id);
    porId.set(id, {
      id,
      nome,
      simbolo: texto(moeda.simbolo, 3) || existente?.simbolo || '◈',
      saldo: existente?.saldo ?? 0,
    });
  });

  const idLunaris = [...porId.values()].find(moeda => normalizarIdMoeda(moeda.nome) === 'lunaris')?.id || 'lunaris';
  if (!porId.has(idLunaris)) {
    porId.set(idLunaris, { id: idLunaris, nome: 'Lunaris', simbolo: '☾', saldo: 0 });
  }
  if (Number.isFinite(Number(lunarisLegado))) {
    porId.set(idLunaris, { ...porId.get(idLunaris), saldo: Number(lunarisLegado) });
  }
  return [...porId.values()].sort((a, b) => {
    if (a.id === idLunaris) return -1;
    if (b.id === idLunaris) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

function normalizarImagem(valor) {
  const imagem = texto(valor, 500);
  if (!imagem) return '';
  if (/^(?:https?:\/\/|\.\.\/|\.\/|\/|assets\/)/i.test(imagem)) return imagem;
  return '';
}

function normalizarPrecos(valor) {
  if (typeof valor === 'number') return { Lunaris: numero(valor) };
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(
    Object.entries(valor).slice(0, 10).flatMap(([moeda, preco]) => {
      const nome = texto(moeda, 30);
      return nome ? [[nome, numero(preco)]] : [];
    }),
  );
}

function normalizarExtras(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  return Object.fromEntries(
    Object.entries(valor).slice(0, 30).flatMap(([chave, conteudo]) => {
      const nome = texto(chave, 50);
      if (!nome || nome.startsWith('_') || nome === '__proto__' || nome === 'constructor') return [];
      if (['string', 'number', 'boolean'].includes(typeof conteudo)) {
        return [[nome, typeof conteudo === 'string' ? texto(conteudo, 300) : conteudo]];
      }
      if (Array.isArray(conteudo)) {
        return [[nome, conteudo.slice(0, 12).map(item => texto(item, 120)).filter(Boolean)]];
      }
      return [];
    }),
  );
}

function normalizarOrigem(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const id = texto(valor.id, 100);
  if (!id) return null;
  return {
    id,
    tipo: texto(valor.tipo, 40),
    titulo: texto(valor.titulo, 100),
    importadoEm: texto(valor.importadoEm, 40),
  };
}

export function normalizarItemInventario(item, indice = 0) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const nome = texto(item.nome || item.titulo, 100);
  if (!nome) return null;
  const tipo = slugTipo(item.tipo);
  const integridadeMaxima = numero(item.integridadeMaxima ?? item.integridade_maxima, { minimo: 1, maximo: 999999, inteiro: true });
  const combustivelMaximo = numero(item.combustivelMaximo ?? item.combustivel_maximo, { maximo: 999999, inteiro: true });
  const usosMaximos = numero(item.usosMaximos ?? item.usos_maximos, { maximo: 9999, inteiro: true });
  const durabilidadeMaxima = numero(item.durabilidadeMaxima ?? item.durabilidade_maxima, { maximo: 999999, inteiro: true });
  const municaoMaxima = numero(item.municaoMaxima ?? item.municao_maxima, { maximo: 9999, inteiro: true });
  const cargaMaxima = numero(item.cargaMaxima ?? item.carga_maxima, { maximo: 999999 });
  return {
    id: texto(item.id, 120) || gerarId(tipo === 'veiculo' ? 'veiculo' : `item-${indice}`),
    nome,
    tipo,
    quantidade: tipo === 'veiculo' ? 1 : numero(item.quantidade ?? 1, { minimo: 1, maximo: 9999, inteiro: true }),
    descricao: texto(item.descricao, 2000),
    notas: texto(item.notas, 1200),
    raridade: raridade(item.raridade),
    imagem: normalizarImagem(item.imagem),
    equipado: tipo !== 'veiculo' && Boolean(item.equipado),
    emUso: tipo === 'veiculo' && Boolean(item.emUso),
    favorito: Boolean(item.favorito),
    espacos: numero(item.espacos ?? item.espaços ?? 1, { maximo: 9999 }),
    peso: numero(item.peso, { maximo: 999999 }),
    localizacao: texto(item.localizacao || item.localização || 'Mochila', 60) || 'Mochila',
    localTipo: item.localTipo === 'veiculo' ? 'veiculo' : 'personagem',
    localId: texto(item.localId, 120),
    efeito: texto(item.efeito, 500),
    dano: texto(item.dano, 100),
    tipoDano: texto(item.tipoDano ?? item.tipo_de_dano, 100),
    alcance: texto(item.alcance, 100),
    propriedades: texto(item.propriedades, 500),
    pericia: ['luta', 'pontaria'].includes(item.pericia) ? item.pericia : 'luta',
    critico: texto(item.critico, 80),
    sincronizarAtaque: tipo === 'arma' && item.sincronizarAtaque !== false,
    municaoAtual: Math.min(municaoMaxima, numero(item.municaoAtual ?? item.municao_atual, { maximo: 9999, inteiro: true })),
    municaoMaxima,
    defesa: numero(item.defesa, { minimo: -999, maximo: 999 }),
    penalidade: numero(item.penalidade, { minimo: -999, maximo: 999 }),
    usosAtuais: Math.min(usosMaximos, numero(item.usosAtuais ?? item.usos_atuais ?? usosMaximos, { maximo: 9999, inteiro: true })),
    usosMaximos,
    durabilidadeAtual: Math.min(durabilidadeMaxima, numero(item.durabilidadeAtual ?? item.durabilidade_atual ?? durabilidadeMaxima, { maximo: 999999, inteiro: true })),
    durabilidadeMaxima,
    categoriaVeiculo: texto(item.categoriaVeiculo ?? item.categoria_veiculo ?? item.categoria, 80),
    velocidade: texto(item.velocidade, 100),
    tripulacao: texto(item.tripulacao ?? item.tripulação, 100),
    passageiros: numero(item.passageiros, { maximo: 9999, inteiro: true }),
    integridadeAtual: Math.min(integridadeMaxima, numero(item.integridadeAtual ?? item.integridade_atual ?? integridadeMaxima, { maximo: 999999, inteiro: true })),
    integridadeMaxima,
    combustivelAtual: Math.min(combustivelMaximo, numero(item.combustivelAtual ?? item.combustivel_atual ?? combustivelMaximo, { maximo: 999999, inteiro: true })),
    combustivelMaximo,
    cargaAtual: Math.min(cargaMaxima, numero(item.cargaAtual ?? item.carga_atual, { maximo: 999999 })),
    cargaMaxima,
    precos: normalizarPrecos(item.precos ?? item.preco),
    origemCatalogo: normalizarOrigem(item.origemCatalogo),
    extras: normalizarExtras(item.extras),
  };
}

export function normalizarInventario(valor) {
  if (!Array.isArray(valor)) return [];
  const unicos = new Map();
  valor.slice(0, 300).forEach((item, indice) => {
    const normalizado = normalizarItemInventario(item, indice);
    if (normalizado) unicos.set(normalizado.id, normalizado);
  });
  const lista = [...unicos.values()];
  const veiculos = new Set(lista.filter(item => item.tipo === 'veiculo').map(item => item.id));
  return lista.map(item => item.localTipo === 'veiculo' && !veiculos.has(item.localId)
    ? { ...item, localTipo: 'personagem', localId: '', localizacao: 'Mochila' }
    : item);
}

export function normalizarConfigInventario(valor) {
  const origem = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  return {
    limiteEspacos: numero(origem.limiteEspacos, { maximo: 999999 }),
  };
}

export function tipoInventario(tipo) {
  return TIPOS_INVENTARIO.find(item => item.id === tipo) || TIPOS_INVENTARIO.at(-1);
}

export function raridadeInventario(valor) {
  return RARIDADES_INVENTARIO.find(item => item.id === valor) || RARIDADES_INVENTARIO[0];
}

export function resumirInventario(inventario, config = {}) {
  const itens = (inventario || []).filter(item => item.tipo !== 'veiculo');
  const veiculos = (inventario || []).filter(item => item.tipo === 'veiculo');
  return {
    unidades: itens.reduce((total, item) => total + item.quantidade, 0),
    entradas: itens.length,
    equipados: itens.filter(item => item.equipado).length,
    favoritos: itens.filter(item => item.favorito).length,
    veiculos: veiculos.length,
    espacosUsados: itens
      .filter(item => item.localTipo !== 'veiculo')
      .reduce((total, item) => total + (item.espacos * item.quantidade), 0),
    limiteEspacos: numero(config.limiteEspacos, { maximo: 999999 }),
  };
}

function primeiro(...valores) {
  return valores.find(valor => valor !== undefined && valor !== null && valor !== '');
}

export function entradaLojaParaInventario(entrada) {
  if (!entrada || typeof entrada !== 'object') return null;
  const conteudo = entrada.conteudo && typeof entrada.conteudo === 'object' && !Array.isArray(entrada.conteudo)
    ? entrada.conteudo
    : {};
  const tipo = slugTipo(entrada.tipo);
  const reservados = new Set([
    'descricao', 'imagem', 'raridade', 'preco', 'atributos', 'nivel', 'classe',
    'dano', 'tipo_de_dano', 'tipoDano', 'alcance', 'propriedades', 'defesa', 'penalidade',
    'municao', 'municao_maxima', 'efeito', 'capacidade', 'categoria', 'velocidade',
    'tripulacao', 'passageiros', 'integridade', 'integridade_maxima', 'combustivel',
    'combustivel_maximo', 'carga', 'carga_maxima', 'espacos', 'peso',
  ]);
  const extras = Object.fromEntries(Object.entries(conteudo).filter(([chave]) => !reservados.has(chave)));
  const integridadeMaxima = primeiro(conteudo.integridade_maxima, conteudo.integridade, tipo === 'veiculo' ? 100 : 0);
  const combustivelMaximo = primeiro(conteudo.combustivel_maximo, conteudo.combustivel, 0);
  return normalizarItemInventario({
    id: gerarId(tipo === 'veiculo' ? 'veiculo' : 'item'),
    nome: entrada.titulo,
    tipo,
    quantidade: 1,
    descricao: conteudo.descricao,
    raridade: conteudo.raridade,
    imagem: conteudo.imagem,
    espacos: primeiro(conteudo.espacos, 1),
    peso: conteudo.peso,
    efeito: Array.isArray(conteudo.atributos) ? conteudo.atributos.join(' · ') : conteudo.efeito,
    dano: conteudo.dano,
    tipoDano: primeiro(conteudo.tipo_de_dano, conteudo.tipoDano),
    alcance: conteudo.alcance,
    propriedades: conteudo.propriedades,
    pericia: conteudo.pericia,
    critico: conteudo.critico,
    sincronizarAtaque: true,
    municaoAtual: primeiro(conteudo.municao, conteudo.municao_maxima, 0),
    municaoMaxima: primeiro(conteudo.municao_maxima, conteudo.municao, 0),
    defesa: conteudo.defesa,
    penalidade: conteudo.penalidade,
    durabilidadeAtual: primeiro(conteudo.durabilidade, conteudo.durabilidade_maxima, 0),
    durabilidadeMaxima: primeiro(conteudo.durabilidade_maxima, conteudo.durabilidade, 0),
    categoriaVeiculo: conteudo.categoria,
    velocidade: conteudo.velocidade,
    tripulacao: primeiro(conteudo.tripulacao, conteudo.capacidade),
    passageiros: conteudo.passageiros,
    integridadeAtual: integridadeMaxima,
    integridadeMaxima,
    combustivelAtual: combustivelMaximo,
    combustivelMaximo,
    cargaAtual: primeiro(conteudo.carga, 0),
    cargaMaxima: primeiro(conteudo.carga_maxima, 0),
    precos: conteudo.preco,
    origemCatalogo: {
      id: entrada.id,
      tipo: entrada.tipo,
      titulo: entrada.titulo,
      importadoEm: entrada.importadoEm,
    },
    extras,
  });
}

export function listarCatalogoLojaInventario() {
  const aceitos = new Set(['arma', 'armadura', 'equipamento', 'veiculo', 'drop']);
  return Object.values(getEntradas())
    .filter(entrada => aceitos.has(entrada.tipo))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}
