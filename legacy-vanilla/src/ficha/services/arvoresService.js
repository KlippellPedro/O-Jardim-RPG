// Usa a mesma coleção central já liberada pelo mestre para o módulo Mundo.
import { getEntradas } from '../../mundo/services/entradasService.js';

// Gênese é a única Árvore "conhecida" desde o início em Mundo (ver
// src/mundo/views/arvores/arvoresView.js: bloqueada = !(id === 'aethel' || ...)),
// mesmo sem uma entrada 'deidade' importada ainda — reproduzido aqui com um
// registro mínimo só pra manter a mesma regra sem duplicar o config inteiro.
const GENESE_PADRAO = { tipo: 'deidade', id: 'aethel', titulo: 'Gênese', conteudo: {} };

export function listarArvoresDisponiveis() {
  const mapa = getEntradas();
  const descobertas = Object.values(mapa)
    .filter(entrada => entrada && typeof entrada === 'object' && entrada.tipo === 'deidade');
  if (!descobertas.some(entrada => entrada.id === 'aethel')) {
    descobertas.unshift(GENESE_PADRAO);
  }
  return descobertas;
}
