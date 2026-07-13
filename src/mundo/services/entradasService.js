import { criarRepositorioEntradas } from '../../core/entryRepository.js';
import { validarEntrada } from '../schemas/entradaSchema.js';

const repositorio = criarRepositorioEntradas({
  chaveStorage: 'mundo-entradas',
  validarEntrada,
});

export const {
  getEntradas,
  entradasPorCategoria,
  processarArquivo,
} = repositorio;
