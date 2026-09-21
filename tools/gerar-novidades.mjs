// Gera src/data/novidades.json a partir do histórico do git e de
// src/data/novidades-manuais.json. Roda sozinho antes de `npm run build`.
//
// Sem git (por exemplo, dentro de um pacote de produção), mantém o arquivo que
// já existe: o mural continua mostrando o que foi gerado da última vez.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerLogDoGit, montarNovidades } from './novidades-lib.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const saida = resolve(raiz, 'src/data/novidades.json');
const manuaisCaminho = resolve(raiz, 'src/data/novidades-manuais.json');

function lerManuais() {
  try {
    const bruto = JSON.parse(readFileSync(manuaisCaminho, 'utf8'));
    return Array.isArray(bruto.itens) ? bruto.itens : [];
  } catch {
    return [];
  }
}

let dosCommits = null;
try {
  const log = execFileSync(
    'git',
    ['log', '-n', '500', '--date=short', '--pretty=format:%H%x1f%ad%x1f%s%x1f%b%x1e'],
    { cwd: raiz, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  );
  dosCommits = lerLogDoGit(log);
} catch {
  dosCommits = null;
}

if (dosCommits === null) {
  console.log(existsSync(saida)
    ? '[novidades] git indisponível; mantendo src/data/novidades.json como está.'
    : '[novidades] git indisponível e sem arquivo anterior; o mural começa vazio.');
  if (!existsSync(saida)) {
    mkdirSync(dirname(saida), { recursive: true });
    writeFileSync(saida, JSON.stringify({ geradoEm: null, itens: [] }, null, 2) + '\n');
  }
  process.exit(0);
}

const itens = montarNovidades(dosCommits, lerManuais());
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, JSON.stringify({ geradoEm: new Date().toISOString(), itens }, null, 2) + '\n');
console.log(`[novidades] ${itens.length} novidades (${dosCommits.length} vindas de commits) em src/data/novidades.json`);
