/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Loja
   Moedas da carteira. Lunaris vem por padrão (é a moeda oficial
   das regras — ver "Receba um item comum e 20 Lunaris"). Outras
   moedas chegam do mesmo jeito que os itens da Loja: import de
   JSON (ver processarArquivoMoedas, chamado pelo mesmo botão
   "Importar conteúdo" de loja.js) — moeda não é algo que o
   jogador digita na hora, é conteúdo descoberto, igual arma,
   veículo, monstro ou drop. Só trocar/remover uma já cadastrada
   continua sendo ação direta na carteira.
   A moeda ativa decide qual preço de `conteudo.preco` aparece
   pra cada item (ver precoParaMoeda em loja.js).
   ───────────────────────────────────────────────────────── */

import { storage } from '../../core/storage.js';

const CHAVE_LISTA = 'loja-moedas';
const CHAVE_ATIVA = 'loja-moeda-ativa';

const MOEDA_PADRAO = { id: 'lunaris', nome: 'Lunaris', simbolo: '☾', saldo: 20 };

// Mesma convenção de dobra de acento usada em normalizarRaridade (loja.js) —
// aceita "Solares"/"Sóis"/"SÓIS" como o mesmo nome pra fins de duplicidade/slug.
const MAPA_SEM_ACENTO = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
};

function dobrarAcentos(texto) {
  return String(texto)
    .trim()
    .toLowerCase()
    .split('')
    .map(ch => MAPA_SEM_ACENTO[ch] || ch)
    .join('');
}

function slugificar(nome) {
  return dobrarAcentos(nome).replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

function idUnico(base, moedas) {
  const raiz = base || 'moeda';
  let id = raiz;
  let sufixo = 2;
  while (moedas.some(m => m.id === id)) { id = `${raiz}-${sufixo}`; sufixo += 1; }
  return id;
}

function listaBruta() {
  const salvas = storage.get(CHAVE_LISTA);
  return Array.isArray(salvas) && salvas.length > 0 ? salvas : [MOEDA_PADRAO];
}

export function getMoedas() {
  return listaBruta();
}

export function getMoedaAtiva() {
  const moedas = listaBruta();
  const ativaId = storage.get(CHAVE_ATIVA);
  return moedas.find(m => m.id === ativaId) || moedas[0];
}

export function definirMoedaAtiva(id) {
  const moedas = listaBruta();
  if (!moedas.some(m => m.id === id)) return false;
  storage.set(CHAVE_ATIVA, id);
  return true;
}

export function adicionarMoeda(nome, simbolo, saldo) {
  const nomeLimpo = String(nome || '').trim();
  if (!nomeLimpo) return null;

  const moedas = listaBruta();
  if (moedas.some(m => dobrarAcentos(m.nome) === dobrarAcentos(nomeLimpo))) return null;

  const id = idUnico(slugificar(nomeLimpo), moedas);
  const moeda = {
    id,
    nome: nomeLimpo,
    simbolo: String(simbolo || '').trim().slice(0, 2) || '◈',
    saldo: typeof saldo === 'number' && Number.isFinite(saldo) ? saldo : 0,
  };

  storage.set(CHAVE_LISTA, [...moedas, moeda]);
  return moeda;
}

export function removerMoeda(id) {
  const moedas = listaBruta();
  if (moedas.length <= 1) return false;

  const restantes = moedas.filter(m => m.id !== id);
  if (restantes.length === moedas.length) return false;

  storage.set(CHAVE_LISTA, restantes);
  if (storage.get(CHAVE_ATIVA) === id) storage.set(CHAVE_ATIVA, restantes[0].id);
  return true;
}

// ── Import de JSON — mesma ideia de services/entradasService.js ────────
// (que por sua vez usa core/entryRepository.js), mas moeda não tem
// tipo/categoria, então ganha seu próprio candidato/validação em vez de
// reaproveitar aquele repositório genérico.

function extrairCandidatasMoedas(json) {
  if (json && Array.isArray(json.moedas)) return json.moedas;
  if (json && typeof json === 'object' && !Array.isArray(json)) return [json];
  return null;
}

function validarCandidataMoeda(candidata) {
  if (!candidata || typeof candidata !== 'object' || Array.isArray(candidata)) return 'moeda inválida';
  if (typeof candidata.nome !== 'string' || !candidata.nome.trim()) return 'faltando "nome"';
  return null;
}

export function processarArquivoMoedas(raw) {
  let json;

  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, mensagem: 'Erro: arquivo inválido (JSON malformado).' };
  }

  const candidatas = extrairCandidatasMoedas(json);
  if (!candidatas) {
    return { ok: false, mensagem: 'Erro: arquivo inválido (formato não reconhecido).' };
  }

  const erros = [];
  let sucesso = 0;

  candidatas.forEach((candidata, indice) => {
    const erro = validarCandidataMoeda(candidata);
    if (erro) { erros.push(`moeda ${indice + 1}: ${erro}`); return; }

    const criada = adicionarMoeda(candidata.nome, candidata.simbolo, candidata.saldo);
    if (!criada) { erros.push(`moeda ${indice + 1}: já existe uma moeda chamada "${candidata.nome}"`); return; }
    sucesso += 1;
  });

  if (sucesso === 0) {
    return { ok: false, mensagem: 'Erro: arquivo inválido. Nenhuma moeda pôde ser importada.', erros };
  }

  const rotulo = sucesso === 1 ? 'moeda importada' : 'moedas importadas';
  const mensagem = erros.length > 0
    ? `${sucesso} ${rotulo} com sucesso. ${erros.length} ignorada(s) por erro.`
    : `${sucesso} ${rotulo} com sucesso.`;

  return { ok: true, sucesso, erros, mensagem };
}

// Só pra decidir, no import combinado da Loja (loja.js), se um arquivo
// solto (sem "entradas"/"moedas" no topo) é uma moeda avulsa — objeto com
// "nome" e sem "tipo" — ou uma entrada avulsa (tem "tipo").
export function candidataUnicaEhMoeda(json) {
  return !!(json && typeof json === 'object' && !Array.isArray(json)
    && typeof json.nome === 'string' && json.tipo === undefined);
}
