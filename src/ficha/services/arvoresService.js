// Lê a mesma chave de storage que o Mundo usa pras Árvores descobertas
// (jardim-rpg:mundo-entradas) — sem importar nada de src/mundo/, já que os
// módulos do app não se importam entre si; só compartilham a convenção da
// chave de storage, como entradasService.js do Mundo/Loja já faz.

import { storage } from '../../core/storage.js';

const CHAVE_STORAGE = 'mundo-entradas';

// Gênese é a única Árvore "conhecida" desde o início em Mundo (ver
// src/mundo/views/arvores/arvoresView.js: bloqueada = !(id === 'aethel' || ...)),
// mesmo sem uma entrada 'deidade' importada ainda — reproduzido aqui com um
// registro mínimo só pra manter a mesma regra sem duplicar o config inteiro.
const GENESE_PADRAO = { tipo: 'deidade', id: 'aethel', titulo: 'Gênese', conteudo: {} };

export function listarArvoresDisponiveis() {
  const mapa = storage.get(CHAVE_STORAGE) || {};
  const descobertas = Object.values(mapa)
    .filter(entrada => entrada && typeof entrada === 'object' && entrada.tipo === 'deidade');
  if (!descobertas.some(entrada => entrada.id === 'aethel')) {
    descobertas.unshift(GENESE_PADRAO);
  }
  return descobertas;
}
