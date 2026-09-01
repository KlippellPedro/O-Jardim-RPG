import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const CONFIRMATION_FLAG = '--confirmar-base-oficial';
const PUBLIC_KEYS = ['tipo', 'id', 'titulo', 'revelado', 'conteudo'];
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function listJsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.json') ? [absolute] : [];
  });
}

function findEntrySpans(source) {
  const entriesMatch = /"entradas"\s*:\s*\[/.exec(source);
  if (!entriesMatch) return [];

  const arrayStart = entriesMatch.index + entriesMatch[0].lastIndexOf('[');
  const spans = [];
  let objectStart = -1;
  let objectDepth = 0;
  let arrayDepth = 1;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart + 1; index < source.length && arrayDepth > 0; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[') arrayDepth += 1;
    else if (char === ']') arrayDepth -= 1;

    if (arrayDepth !== 1 && objectDepth === 0) continue;
    if (char === '{') {
      if (objectDepth === 0) objectStart = index;
      objectDepth += 1;
    } else if (char === '}' && objectDepth > 0) {
      objectDepth -= 1;
      if (objectDepth === 0 && objectStart >= 0) {
        spans.push({ start: objectStart, end: index + 1 });
        objectStart = -1;
      }
    }
  }
  return spans;
}

function indentJson(value, indentation) {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${indentation}${line}`))
    .join('\n');
}

const args = process.argv.slice(2);
const exportPathArgument = args.find((arg) => arg !== CONFIRMATION_FLAG);
if (!exportPathArgument || !args.includes(CONFIRMATION_FLAG)) {
  fail(`Uso: npm run editorial:promote-lore -- <exportacao.json> ${CONFIRMATION_FLAG}\nA confirmação é obrigatória porque esta operação altera a base oficial de todas as campanhas.`);
}

const exportPath = path.resolve(exportPathArgument);
if (!fs.existsSync(exportPath)) fail(`Exportação não encontrada: ${exportPath}`);

const publication = JSON.parse(fs.readFileSync(exportPath, 'utf8').replace(/^\uFEFF/, ''));
const isCampaignSnapshot = publication?.formato === 'o-jardim-conteudo-publicado' && publication?.versao_formato === 1;
const isGlobalSnapshot = publication?.formato === 'o-jardim-conteudo-global' && publication?.versao_formato === 1;
if (!isCampaignSnapshot && !isGlobalSnapshot) {
  fail('O arquivo não é uma exportação editorial compatível (formato 1).');
}

const publishedWorldEntries = publication.conteudo.filter((item) => item.modulo === 'mundo');
const chronologyItem = publishedWorldEntries.find((item) => item.dados?.tipo === 'cronologia');
const loreEntries = publishedWorldEntries.filter((item) => item.dados?.tipo !== 'cronologia');
const chronology = chronologyItem?.dados?.conteudo;
if (chronologyItem && (!chronology || !Array.isArray(chronology.linha_tempo_geral) || !Array.isArray(chronology.arvores))) {
  fail('A publicação de cronologia não contém uma estrutura completa.');
}
const worldDir = path.join(repoRoot, 'data', 'mundo');
const sourceFiles = listJsonFiles(worldDir).filter((file) => !file.endsWith(`${path.sep}_padrao.json`));
const fileStates = new Map();
const indexedEntries = [];

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const spans = findEntrySpans(source);
  fileStates.set(file, { source, replacements: [] });
  for (const span of spans) {
    const entry = JSON.parse(source.slice(span.start, span.end));
    indexedEntries.push({ file, span, entry });
  }
}

let normalizedRelations = 0;
for (const publicationItem of loreEntries) {
  let published = publicationItem.dados;
  if (published?.excluido === true) {
    fail(`A exclusão global de ${publicationItem.chave_origem || publicationItem.chave_recurso} precisa ser revisada manualmente antes de remover a entrada de data/.`);
  }
  let matches = indexedEntries.filter(({ entry }) => entry.id === published.id && entry.tipo === published.tipo);
  if (matches.length === 0) matches = indexedEntries.filter(({ entry }) => entry.id === published.id);
  if (matches.length !== 1) {
    fail(`Não foi possível localizar uma única entrada oficial para ${published.tipo}:${published.id} (encontradas: ${matches.length}).`);
  }

  const match = matches[0];
  if (match.entry.tipo !== published.tipo && !isGlobalSnapshot) {
    const parentId = published.conteudo?.galho;
    const parent = indexedEntries.find(({ entry }) => entry.id === parentId)?.entry;
    if (match.entry.tipo === 'local' && published.tipo === 'dimensao' && parent?.tipo === 'local') {
      const { galho: _discardedParentField, ...publishedContent } = published.conteudo;
      published = {
        ...published,
        tipo: 'local',
        conteudo: {
          ...publishedContent,
          no_vazio: parent.conteudo?.no_vazio,
          local_pai: parent.id,
        },
      };
      normalizedRelations += 1;
    } else {
      fail(`A publicação tenta mudar o tipo oficial de ${match.entry.tipo}:${published.id} para ${published.tipo}. Essa migração exige uma decisão estrutural manual.`);
    }
  }
  const merged = { ...match.entry };
  for (const key of PUBLIC_KEYS) {
    if (Object.hasOwn(published, key)) merged[key] = published[key];
    else delete merged[key];
  }
  const lineStart = fileStates.get(match.file).source.lastIndexOf('\n', match.span.start) + 1;
  const indentation = fileStates.get(match.file).source.slice(lineStart, match.span.start);
  fileStates.get(match.file).replacements.push({
    ...match.span,
    value: indentJson(merged, indentation),
  });
}

for (const [file, state] of fileStates) {
  if (state.replacements.length === 0) continue;
  let nextSource = state.source;
  for (const replacement of state.replacements.sort((a, b) => b.start - a.start)) {
    nextSource = `${nextSource.slice(0, replacement.start)}${replacement.value}${nextSource.slice(replacement.end)}`;
  }
  fs.writeFileSync(file, nextSource, 'utf8');
}

if (chronologyItem) {
  fs.writeFileSync(
    path.join(worldDir, 'cronicas-arvores.json'),
    `${JSON.stringify(chronology, null, 2)}\n`,
    'utf8',
  );
}

console.log(`Lore oficial promovida: ${loreEntries.length} entrada(s)${chronologyItem ? ' e a cronologia' : ''}.`);
if (normalizedRelations > 0) console.log(`Relações estruturais normalizadas: ${normalizedRelations}.`);
console.log(isGlobalSnapshot
  ? 'Origem: snapshot editorial global.'
  : `Campanha de origem: ${publication.campanha?.nome || 'sem nome'} (${publication.campanha?.id || 'sem id'}).`);
