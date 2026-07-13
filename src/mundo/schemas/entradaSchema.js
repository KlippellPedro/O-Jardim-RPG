import { TIPOS_VALIDOS } from '../config/categorias.js';

export function validarEntrada(entrada) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return 'entrada inválida';
  }

  if (typeof entrada.tipo !== 'string' || !TIPOS_VALIDOS.includes(entrada.tipo)) {
    return `tipo desconhecido: "${entrada.tipo}"`;
  }

  if (typeof entrada.id !== 'string' || !entrada.id.trim()) return 'faltando "id"';
  if (typeof entrada.titulo !== 'string' || !entrada.titulo.trim()) return 'faltando "titulo"';

  if (!entrada.conteudo || typeof entrada.conteudo !== 'object' || Array.isArray(entrada.conteudo)) {
    return 'faltando "conteudo"';
  }

  return null;
}
