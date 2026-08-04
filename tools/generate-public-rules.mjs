import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REGRAS_OFICIAIS } from '../data/regras/regras.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const publicRules = Object.fromEntries(
  Object.entries(REGRAS_OFICIAIS).filter(([id]) => id !== 'mestre'),
);

const decodeEntities = (value) => value
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'");

function htmlToMarkdown(html) {
  let text = String(html)
    .replace(/<!--\s*CLASSES_DATA\s*-->/g, 'Consulte o catálogo de classes na página de regras.')
    .replace(/<!--\s*RACAS_DATA\s*-->/g, 'Consulte o catálogo de raças na página de regras.')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi, '\n- **$1:** $2')
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row) => {
      const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
        .map((match) => match[1].replace(/<[^>]+>/g, '').trim());
      return cells.length ? `\n- ${cells.join(' | ')}` : '';
    })
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<[^>]+>/g, '\n');
  text = decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

const markdown = [
  '# Regras públicas de O Jardim RPG',
  '',
  '> Arquivo gerado de `data/regras/regras.ts`. Não edite manualmente.',
  '',
  ...Object.entries(publicRules).flatMap(([id, topic]) => [
    `## ${id}`,
    '',
    `**Categoria:** ${topic.categoria || 'Gerais'}`,
    '',
    `**Status:** ${topic.status}`,
    '',
    topic.resumo,
    '',
    htmlToMarkdown(topic.corpo),
    '',
  ]),
].join('\n').trimEnd() + '\n';

const outputs = new Map([
  [path.join(root, 'data', 'regras', 'regras-publicas-v1.md'), markdown],
]);

let stale = false;
for (const [target, content] of outputs) {
  let current = null;
  try {
    current = await fs.readFile(target, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (current === content) continue;
  stale = true;
  if (!checkOnly) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }
}

if (checkOnly && stale) {
  throw new Error('As fontes geradas de regras estão desatualizadas. Execute npm run generate:rules.');
}

if (!checkOnly) console.log(`Regras públicas geradas em ${outputs.size} destinos.`);
