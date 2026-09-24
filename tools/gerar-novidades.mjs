// Gera src/data/novidades.json a partir de src/data/novidades-manuais.json.
// Roda sozinho antes de `npm run build`.
//
// O mural não lê commits: a cada versão que vai para o ar, escreva as novidades
// em novidades-manuais.json (uma entrada por assunto, em linguagem de quem joga).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarNovidades } from './novidades-lib.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const saida = resolve(raiz, 'src/data/novidades.json');
const manuaisCaminho = resolve(raiz, 'src/data/novidades-manuais.json');

let manuais = [];
try {
  const bruto = JSON.parse(readFileSync(manuaisCaminho, 'utf8'));
  manuais = Array.isArray(bruto.itens) ? bruto.itens : [];
} catch (erro) {
  console.error(`[novidades] não consegui ler novidades-manuais.json: ${erro.message}`);
  process.exit(1);
}

const itens = montarNovidades(manuais);
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, JSON.stringify({ itens }, null, 2) + '\n');
console.log(`[novidades] ${itens.length} novidades em src/data/novidades.json`);
