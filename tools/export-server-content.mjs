import fs from 'node:fs';
import { FACCOES_DOCUMENTADAS } from '../data/regras/faccoes.ts';
import { ENTIDADES } from '../data/mundo/entidades.ts';
import { MUNDO_CATALOG } from '../data/gerado/mundoCatalog.ts';

// Arquivo de seed do backend. Nunca vai para public/ nem para os assets Vite.
const target = new URL('../data/gerado/conteudo-servidor.json', import.meta.url);
const content = JSON.stringify({
  versao: 1,
  entidades: ENTIDADES,
  faccoes: FACCOES_DOCUMENTADAS,
  mundo_metadados: MUNDO_CATALOG.map(({ id, tipo, arvore_origem, registro_universal }) => ({ id, tipo, arvore_origem, registro_universal })),
}, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) throw new Error('Seed reservado desatualizado. Execute npm run generate:server-content.');
} else fs.writeFileSync(target, content);
