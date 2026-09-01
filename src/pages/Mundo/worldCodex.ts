import type { LoreEntry } from '../../../data/gerado/mundoCatalog';
import { ARVORES } from '../../../data/mundo/arvoresCatalog';

export interface WorldCodexNode {
  entry: LoreEntry;
  children: WorldCodexNode[];
}

export interface TreeCodex {
  deity?: LoreEntry;
  flow?: LoreEntry;
  flows: LoreEntry[];
  roots: WorldCodexNode[];
  crossTreeConcepts: LoreEntry[];
  entries: LoreEntry[];
}

const valueList = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
);

const contentValue = (entry: LoreEntry, key: string): unknown => (
  (entry.conteudo as Record<string, unknown>)[key]
);

const isChildOf = (entry: LoreEntry, parent: LoreEntry): boolean => {
  const parentId = parent.id;
  if (contentValue(entry, 'local_pai') === parentId) return true;
  if (contentValue(entry, 'galho') === parentId) return true;
  if (contentValue(entry, 'dimensao') === parentId) return true;
  // Soberanos e figuras entram pendurados no Reino que governam. Sem isto os
  // `personagem` do catálogo não apareciam em Árvore nenhuma - só existiam no
  // painel de visibilidade do Mestre e nos Registros Universais.
  if (contentValue(entry, 'reino') === parentId) return true;
  return false;
};

const buildNode = (
  entry: LoreEntry,
  catalog: LoreEntry[],
  visited: ReadonlySet<string>,
): WorldCodexNode => {
  const identity = `${entry.tipo}:${entry.id}`;
  if (visited.has(identity)) return { entry, children: [] };
  const nextVisited = new Set(visited).add(identity);
  const children = catalog
    .filter((candidate) => candidate !== entry && isChildOf(candidate, entry))
    .map((candidate) => buildNode(candidate, catalog, nextVisited));
  return { entry, children };
};

const flattenNodes = (nodes: WorldCodexNode[]): LoreEntry[] => nodes.flatMap((node) => [
  node.entry,
  ...flattenNodes(node.children),
]);

export function buildTreeCodex(catalog: LoreEntry[], treeId: string): TreeCodex {
  const deity = catalog.find((entry) => entry.tipo === 'deidade' && entry.id === treeId);
  const flowId = deity ? contentValue(deity, 'fluxo') : undefined;
  const tree = ARVORES.find((entry) => entry.id === treeId);
  const treeNames = new Set([tree?.nome, tree?.subjugada?.nome].filter((name): name is string => Boolean(name)));
  const flows = catalog.filter((entry) => entry.tipo === 'fluxo' && (
    entry.id === flowId || treeNames.has(String(contentValue(entry, 'arvore') || ''))
  ));
  const flow = flows.find((entry) => entry.id === flowId) || flows[0];
  const roots = catalog
    .filter((entry) => (
      (entry.tipo === 'galho' && contentValue(entry, 'arvore') === treeId)
      || (entry.tipo === 'local'
        && contentValue(entry, 'no_vazio') === treeId
        && !contentValue(entry, 'local_pai'))
    ))
    .map((entry) => buildNode(entry, catalog, new Set()));
  const crossTreeConcepts = catalog.filter((entry) => (
    valueList(contentValue(entry, 'arvores')).includes(treeId)
  ));
  const entries = [deity, ...flows, ...flattenNodes(roots)].filter((entry): entry is LoreEntry => Boolean(entry));
  return { deity, flow, flows, roots, crossTreeConcepts, entries };
}

export function findCodexEntry(
  codex: TreeCodex,
  type: string | undefined,
  id: string | undefined,
): LoreEntry | undefined {
  if (!type || !id) return undefined;
  return [...codex.entries, ...codex.crossTreeConcepts]
    .find((entry) => entry.tipo === type && entry.id === id);
}

export function findCodexNode(nodes: WorldCodexNode[], entry: LoreEntry): WorldCodexNode | undefined {
  for (const node of nodes) {
    if (node.entry.tipo === entry.tipo && node.entry.id === entry.id) return node;
    const nested = findCodexNode(node.children, entry);
    if (nested) return nested;
  }
  return undefined;
}

export function findAncestorEntries(nodes: WorldCodexNode[], entry: LoreEntry): LoreEntry[] {
  for (const node of nodes) {
    if (node.entry.tipo === entry.tipo && node.entry.id === entry.id) return [];
    const nested = findAncestorEntries(node.children, entry);
    if (nested.length > 0 || node.children.some((child) => child.entry === entry)) {
      return [node.entry, ...nested];
    }
  }
  return [];
}

export function universalLoreEntries(
  catalog: LoreEntry[],
  category?: NonNullable<LoreEntry['registro_universal']>,
): LoreEntry[] {
  return catalog.filter((entry) => (
    entry.registro_universal
    && (!category || entry.registro_universal === category)
  ));
}

export function codexEntryPath(treeId: string, entry: LoreEntry): string {
  return `/mundo/arvores/${treeId}/${entry.tipo}/${entry.id}`;
}
