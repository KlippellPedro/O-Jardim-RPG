import { conteudoApi } from '../../plataforma/conteudoApi.js';
import { validarEntrada } from '../schemas/entradaSchema.js';

let entradas = {};

export async function carregarEntradas(campanhaId) {
  const resposta = await conteudoApi.visivel(campanhaId, 'loja');
  entradas = Object.fromEntries((resposta.informacoes || []).flatMap(informacao => {
    const entrada = informacao.dados;
    if (!entrada || validarEntrada(entrada)) return [];
    return [[entrada.id, entrada]];
  }));
  return entradas;
}

export function getEntradas() {
  return entradas;
}

export function entradasPorCategoria(categoria) {
  return Object.values(entradas).filter(entrada => categoria.tipos.includes(entrada.tipo));
}
