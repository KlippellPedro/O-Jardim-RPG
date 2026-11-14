// A lista de documentos da janela "Mostrar um documento": os salvos da mesa e os universais numa
// lista só, agrupados, com filtro e busca. Sem React, para dar para testar.

import type { IDocumentoUniversal, IResumoDocumento } from '../../../services/documentosApi';
import { semAcento } from '../../../components/ui/menuDeSelecao';

export type OrigemDoDocumento = 'salvo' | 'universal';
export type FiltroDeOrigem = 'todos' | OrigemDoDocumento;

export interface ItemDeDocumento {
  /** `salvo:<id>` ou `universal:<id>`: o valor que a rota de mostrar entende. */
  chave: string;
  origem: OrigemDoDocumento;
  id: string;
  titulo: string;
  grupo: string;
  modelo: string;
  /** Só os universais já chegam com os campos; o salvo busca ao escolher. */
  campos: Record<string, string> | null;
  /** Anotações do Mestre (só dos universais). */
  ensina: string;
  entregar: string;
}

export interface GrupoDeDocumentos {
  titulo: string;
  itens: ItemDeDocumento[];
}

export const GRUPO_DOS_SALVOS = 'Salvos nesta mesa';

export function montarItens(salvos: IResumoDocumento[], universais: IDocumentoUniversal[]): ItemDeDocumento[] {
  return [
    ...salvos.map((documento): ItemDeDocumento => ({
      chave: `salvo:${documento.id}`,
      origem: 'salvo',
      id: documento.id,
      titulo: documento.titulo,
      grupo: GRUPO_DOS_SALVOS,
      modelo: documento.modelo,
      campos: null,
      ensina: '',
      entregar: '',
    })),
    ...universais.map((documento): ItemDeDocumento => ({
      chave: `universal:${documento.id}`,
      origem: 'universal',
      id: documento.id,
      titulo: documento.titulo,
      grupo: documento.tema.trim() || 'Outros',
      modelo: documento.modelo,
      campos: documento.campos,
      ensina: documento.ensina,
      entregar: documento.entregar,
    })),
  ];
}

/** Separa a chave `origem:id` na origem e no id (o id pode ter dois-pontos). */
export function partirChave(chave: string): { origem: OrigemDoDocumento; id: string } | null {
  const corte = chave.indexOf(':');
  if (corte < 0) return null;
  const origem = chave.slice(0, corte);
  if (origem !== 'salvo' && origem !== 'universal') return null;
  const id = chave.slice(corte + 1);
  return id ? { origem, id } : null;
}

/** Filtra por origem e por busca (título ou assunto, sem acento nem caixa) e agrupa na ordem em que cada grupo aparece. */
export function agruparDocumentos(itens: ItemDeDocumento[], filtro: FiltroDeOrigem, busca: string): GrupoDeDocumentos[] {
  const termo = semAcento(busca.trim());
  const grupos = new Map<string, ItemDeDocumento[]>();
  for (const item of itens) {
    if (filtro !== 'todos' && item.origem !== filtro) continue;
    if (termo && !semAcento(`${item.titulo} ${item.grupo}`).includes(termo)) continue;
    grupos.set(item.grupo, [...(grupos.get(item.grupo) ?? []), item]);
  }
  return [...grupos].map(([titulo, lista]) => ({ titulo, itens: lista }));
}

/** O item para escolher quando a lista muda: o atual se ainda aparece, senão o primeiro. */
export function escolhaValida(grupos: GrupoDeDocumentos[], atual: string): string {
  const todos = grupos.flatMap((grupo) => grupo.itens);
  return todos.some((item) => item.chave === atual) ? atual : todos[0]?.chave ?? '';
}

/** O item vizinho na lista que se vê (para as setas), sem dar a volta. */
export function vizinho(grupos: GrupoDeDocumentos[], atual: string, passo: 1 | -1): string {
  const todos = grupos.flatMap((grupo) => grupo.itens);
  const posicao = todos.findIndex((item) => item.chave === atual);
  if (posicao < 0) return todos[0]?.chave ?? '';
  return todos[Math.max(0, Math.min(todos.length - 1, posicao + passo))].chave;
}

export function contagemPorOrigem(itens: ItemDeDocumento[]): Record<FiltroDeOrigem, number> {
  return {
    todos: itens.length,
    salvo: itens.filter((item) => item.origem === 'salvo').length,
    universal: itens.filter((item) => item.origem === 'universal').length,
  };
}
