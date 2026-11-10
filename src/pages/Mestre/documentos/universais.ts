/**
 * Documentos universais: as contas que não dependem da tela.
 *
 * O documento universal é um modelo da Oficina já preenchido (data/documentos/universais.json,
 * entregue pelo servidor só a quem comanda a mesa). Aqui ficam o agrupamento por tema e a
 * conferência de cada documento contra o modelo, usada pelo teste e pela aba.
 */

import type { IModeloDeDocumento } from './modelo';
import { modeloPorId } from './modelos/index';

export interface IDocumentoUniversalBruto {
  id: string;
  modelo: string;
  campos: Record<string, string>;
}

export interface IGrupoDeTema<T> {
  tema: string;
  itens: T[];
}

/** Agrupa na ordem em que cada tema aparece pela primeira vez: a ordem do arquivo é a curadoria. */
export function agruparPorTema<T>(itens: readonly T[], temaDe: (item: T) => string): IGrupoDeTema<T>[] {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const tema = temaDe(item).trim() || 'Outros';
    const lista = grupos.get(tema);
    if (lista) lista.push(item);
    else grupos.set(tema, [item]);
  }
  return [...grupos].map(([tema, lista]) => ({ tema, itens: lista }));
}

/**
 * O que impede o documento de sair do jeito que foi escrito. Lista vazia: pronto.
 * Campo de texto sem valor é problema porque o desenho poria no lugar o exemplo do modelo.
 */
export function problemasDoDocumentoUniversal(
  doc: IDocumentoUniversalBruto,
  modelo: IModeloDeDocumento | null = modeloPorId(doc.modelo),
): string[] {
  if (!modelo) return [`${doc.id}: modelo desconhecido "${doc.modelo}"`];
  const problemas: string[] = [];
  const conhecidos = new Set(modelo.campos.map((campo) => campo.id));
  for (const chave of Object.keys(doc.campos)) {
    if (!conhecidos.has(chave)) problemas.push(`campo que o modelo não tem: ${chave}`);
  }
  for (const campo of modelo.campos) {
    const valor = doc.campos[campo.id];
    const visivel = campo.visivel ? campo.visivel(doc.campos) : true;
    if (typeof valor !== 'string') {
      if (visivel && campo.tipo !== 'imagem') problemas.push(`sem valor, sairia o exemplo do modelo: ${campo.id}`);
      continue;
    }
    if (campo.tipo === 'imagem' && valor) problemas.push(`imagem não entra em documento universal: ${campo.id}`);
    if (campo.tipo === 'escolha' && campo.opcoes && !campo.opcoes.some((opcao) => opcao.valor === valor)) {
      problemas.push(`opção que o modelo não tem em ${campo.id}: ${valor}`);
    }
    if (campo.maximo && valor.length > campo.maximo) problemas.push(`${campo.id} passa de ${campo.maximo} caracteres (${valor.length})`);
  }
  return problemas.map((problema) => `${doc.id}: ${problema}`);
}
