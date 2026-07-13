import { criarRepositorioEntradas } from '../../core/entryRepository.js';
import { validarEntrada } from '../schemas/entradaSchema.js';

const repositorio = criarRepositorioEntradas({
  chaveStorage: 'loja-entradas',
  validarEntrada,
});

export const {
  getEntradas,
  entradasPorCategoria,
  processarArquivo,
} = repositorio;
