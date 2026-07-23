import { ATRIBUTOS, VALORES_ATRIBUTOS_PADRAO } from '../../services/calculoService.js';

function resolverDistribuicao(indices, valoresDisponiveis) {
  if (!indices) return null;
  const usados = new Set();
  const valores = {};

  for (const chave of ATRIBUTOS) {
    const indice = indices[chave];
    if (!Number.isInteger(indice) || usados.has(indice) || indice < 0 || indice >= valoresDisponiveis.length) {
      return null;
    }
    usados.add(indice);
    valores[chave] = valoresDisponiveis[indice];
  }
  return valores;
}

export function obterAtributosBase(estado) {
  if (estado.metodoAtributos === 'padrao') {
    return resolverDistribuicao(estado.atribuicaoPadrao, VALORES_ATRIBUTOS_PADRAO);
  }
  if (estado.metodoAtributos === 'dados' && estado.atributosRolados) {
    return resolverDistribuicao(estado.atribuicaoDados, estado.atributosRolados);
  }
  return null;
}
