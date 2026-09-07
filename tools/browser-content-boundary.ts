import fs from 'node:fs';
import ts from 'typescript';
import type { Plugin } from 'vite';

/** A base completa serve ao backend/editor. O navegador só recebe as projeções
 * públicas daqui; conteúdo condicionado à campanha vem da API autorizada. */
export function browserContentSource(source: string, filename: string): string {
  const name = filename.replaceAll('\\', '/');
  const world = name.endsWith('/data/gerado/mundoCatalog.ts');
  const entities = name.endsWith('/data/mundo/entidades.ts');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const visit = (node: ts.Node) => {
    if (name.endsWith('/data/regras/regras.ts') && ts.isPropertyAssignment(node) && node.name.getText(ast) === 'mestre') {
      const end = source[node.end] === ',' ? node.end + 1 : node.end;
      edits.push({ start: node.getFullStart(), end, text: '' });
      return;
    }
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)
      && ((world && node.name.text === 'MUNDO_CATALOG') || (entities && node.name.text === 'ENTIDADES'))) {
      // Somente identidade e visibilidade inicial das deidades, usadas nas
      // escolhas mecânicas da ficha. Nenhum texto de lore é distribuído aqui.
      const metadata: unknown[] = [];
      if (world && ts.isArrayLiteralExpression(node.initializer)) {
        for (const item of node.initializer.elements) {
          if (!ts.isObjectLiteralExpression(item)) continue;
          const props = new Map(item.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(ast).replaceAll('"', '').replaceAll("'", ''), p.initializer]));
          if (props.get('tipo')?.getText(ast).replaceAll('"', '').replaceAll("'", '') !== 'deidade') continue;
          const id = props.get('id');
          if (id && ts.isStringLiteral(id)) metadata.push({ id: id.text, tipo: 'deidade', titulo: '', conteudo: {}, revelado: props.get('revelado')?.kind !== ts.SyntaxKind.FalseKeyword });
        }
      }
      edits.push({ start: node.initializer.getStart(ast), end: node.initializer.end, text: JSON.stringify(metadata) });
      return;
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(ast).replaceAll('"', '').replaceAll("'", '') === 'corpoMestre') {
      edits.push({ start: node.initializer.getStart(ast), end: node.initializer.end, text: "undefined" });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return edits.sort((a, b) => b.start - a.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
}

export function browserContentBoundary(): Plugin {
  return {
    name: 'jardim-browser-content-boundary',
    enforce: 'pre',
    load(id) {
      const filename = id.split('?')[0].replaceAll('\\', '/');
      if (/\/data\/(editorial\/|gerado\/conteudo-servidor\.json)|\/data\/regras\/(regras-editorial|mestre-v1)\.json$/.test(filename)) {
        throw new Error('Conteúdo reservado ao servidor não pode ser importado pelo navegador.');
      }
      const restricted = filename.endsWith('/data/gerado/mundoCatalog.ts')
        || filename.endsWith('/data/mundo/entidades.ts')
        || /\/data\/regras\/[^/]+\.ts$/.test(filename);
      if (filename.endsWith('/data/mundo/cronicas-arvores.json')) {
        if (id.includes('?')) throw new Error('Crônicas completas são reservadas ao servidor.');
        return JSON.stringify({versao:1,status:'',introducao:{titulo:'',subtitulo:'',descricao:''},linha_tempo_geral:[],arvores:[]});
      }
      if (filename.endsWith('/data/mundo/faccoes.json') && !id.includes('?')) return JSON.stringify({ faccoes: [] });
      if (/\/data\/mundo\/.*\.json$/.test(filename)) throw new Error('Lore completa só pode ser carregada pela API.');
      if (restricted) {
        if (id.includes('?')) throw new Error('Importação bruta de conteúdo reservado não permitida.');
        return browserContentSource(fs.readFileSync(filename, 'utf8'), filename);
      }
      return null;
    },
  };
}
