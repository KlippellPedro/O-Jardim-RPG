import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const roots = [
  'index.html',
  'src',
  'data/ficha',
  'data/gerado',
  'data/loja',
  'data/regras',
  'data/mundo',
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx']);
const forbiddenDash = '\u2014';
const fix = process.argv.includes('--fix');

const listFiles = target => {
  const absolute = path.join(projectRoot, target);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) return listFiles(path.relative(projectRoot, child));
    return textExtensions.has(path.extname(entry.name).toLowerCase()) ? [child] : [];
  });
};

const occurrences = [];
let changedFiles = 0;

for (const file of roots.flatMap(listFiles)) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(forbiddenDash)) continue;

  const relative = path.relative(projectRoot, file);
  const count = content.split(forbiddenDash).length - 1;
  occurrences.push({ relative, count });

  if (fix) {
    fs.writeFileSync(file, content.split(forbiddenDash).join('-'));
    changedFiles += 1;
  }
}

if (fix) {
  console.log(`Travessões substituídos em ${changedFiles} arquivo(s) do site.`);
  process.exit(0);
}

if (occurrences.length > 0) {
  for (const occurrence of occurrences) {
    console.error(`${occurrence.relative}: ${occurrence.count}`);
  }
  console.error(`O site ainda contém travessões em ${occurrences.length} arquivo(s).`);
  process.exit(1);
}

console.log('Tipografia válida: nenhum travessão encontrado nos arquivos do site.');
