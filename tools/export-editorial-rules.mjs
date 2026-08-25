import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGRAS_OFICIAIS } from '../data/regras/regras.ts';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../data/regras/condicoes.ts';
import { tituloTopico } from '../data/regras/titulos.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'data', 'regras', 'regras-editorial.json');
const conditionsOutputPath = path.join(root, 'data', 'regras', 'condicoes-editorial.json');

const payload = {
  versao: 1,
  gerado_de: 'data/regras/regras.ts',
  entradas: Object.entries(REGRAS_OFICIAIS).map(([id, conteudo]) => ({
    id,
    tipo: 'regra',
    titulo: tituloTopico(id),
    conteudo,
  })),
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const conditionsPayload = {
  versao: 1,
  gerado_de: 'data/regras/condicoes.ts',
  entradas: [
    ...CONDICOES_OFICIAIS.map((item) => ({ tipo: 'condicao', ...item })),
    ...CRISES_SANIDADE.map((item) => ({ tipo: 'crise', ...item })),
  ],
};

fs.writeFileSync(conditionsOutputPath, `${JSON.stringify(conditionsPayload, null, 2)}\n`, 'utf8');
console.log(`Regras editoriais exportadas: ${payload.entradas.length} capítulos e ${conditionsPayload.entradas.length} condições/crises.`);
