/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Loja
   Moedas da carteira. Lunaris vem por padrão (é a moeda oficial
   das regras — ver "Receba um item comum e 20 Lunaris"). Outras
   moedas vêm da carteira central do personagem ativo na campanha.
   A moeda ativa decide qual preço de `conteudo.preco` aparece
   pra cada item (ver precoParaMoeda em loja.js).
   ───────────────────────────────────────────────────────── */

import { storage } from '../../core/storage.js';

const CHAVE_ATIVA = 'loja-moeda-ativa';

const MOEDA_PADRAO = { id: 'lunaris', nome: 'Lunaris', simbolo: '☾', saldo: 20 };
let moedasRemotas = [MOEDA_PADRAO];

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

function listaBruta() {
  return moedasRemotas;
}

export function definirMoedasRemotas(carteira = []) {
  moedasRemotas = Array.isArray(carteira) && carteira.length
    ? carteira.map((moeda, indice) => ({
      id: String(moeda.moeda || moeda.id || `moeda-${indice}`)
        .trim().toLocaleLowerCase('pt-BR'),
      nome: String(moeda.moeda || moeda.nome || `Moeda ${indice + 1}`),
      simbolo: moeda.simbolo || (dobrarAcentos(moeda.moeda || moeda.nome) === 'lunaris' ? '☾' : '◈'),
      saldo: Number(moeda.saldo) || 0,
    }))
    : [MOEDA_PADRAO];
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
