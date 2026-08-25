import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const inputArgument = args.find((argument) => !argument.startsWith('--'));
const outputIndex = args.indexOf('--output');

if (!inputArgument) {
  throw new Error('Uso: npm run editorial:sync -- <snapshot.json> [--output caminho.json]');
}

const inputPath = path.resolve(process.cwd(), inputArgument);
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (raw?.formato !== 'o-jardim-conteudo-publicado' || raw?.versao_formato !== 1) {
  throw new Error('O arquivo não é um snapshot editorial compatível com O Jardim.');
}
if (!raw?.campanha?.id || typeof raw.campanha.id !== 'string') {
  throw new Error('O snapshot não informa uma campanha válida.');
}
if (!Array.isArray(raw.conteudo) || !Array.isArray(raw.loja)) {
  throw new Error('O snapshot precisa conter as listas conteudo e loja.');
}

const defaultOutput = path.join(root, 'data', 'editorial', 'campanhas', `${raw.campanha.id}.json`);
const outputPath = outputIndex >= 0 && args[outputIndex + 1]
  ? path.resolve(process.cwd(), args[outputIndex + 1])
  : defaultOutput;
const allowedRoot = path.resolve(root, 'data', 'editorial');
const relative = path.relative(allowedRoot, outputPath);
if ((relative.startsWith('..') || path.isAbsolute(relative)) && outputIndex < 0) {
  throw new Error('O destino padrão precisa permanecer em data/editorial.');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
console.log(`Snapshot editorial sincronizado: ${outputPath}`);
console.log(`Conteúdo: ${raw.conteudo.length} publicação(ões); loja: ${raw.loja.length} item(ns).`);
