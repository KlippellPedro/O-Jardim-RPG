import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const inputArgument = args.find((argument) => !argument.startsWith('--'));
const outputIndex = args.indexOf('--output');
const promoteToGlobal = args.includes('--global');

if (!inputArgument) {
  throw new Error('Uso: npm run editorial:sync -- <snapshot.json> [--global] [--output caminho.json]');
}

const inputPath = path.resolve(process.cwd(), inputArgument);
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const isCampaignSnapshot = raw?.formato === 'o-jardim-conteudo-publicado' && raw?.versao_formato === 1;
const isGlobalSnapshot = raw?.formato === 'o-jardim-conteudo-global' && raw?.versao_formato === 1;
if (!isCampaignSnapshot && !isGlobalSnapshot) {
  throw new Error('O arquivo não é um snapshot editorial compatível com O Jardim.');
}
if (isCampaignSnapshot && (!raw?.campanha?.id || typeof raw.campanha.id !== 'string')) {
  throw new Error('O snapshot não informa uma campanha válida.');
}
if (!Array.isArray(raw.conteudo) || (isCampaignSnapshot && !Array.isArray(raw.loja))) {
  throw new Error('O snapshot não contém as listas editoriais esperadas.');
}

const snapshot = isCampaignSnapshot && promoteToGlobal
  ? {
      formato: 'o-jardim-conteudo-global',
      versao_formato: 1,
      gerado_em: raw.gerado_em,
      conteudo: raw.conteudo
        .filter((entry) => entry?.modulo === 'mundo')
        .map(({ chave_recurso, ...entry }) => ({ ...entry, chave_origem: chave_recurso })),
    }
  : raw;
if (isGlobalSnapshot && promoteToGlobal) {
  console.warn('O snapshot de entrada já é global; --global não alterou o conteúdo.');
}
const outputIsGlobal = snapshot.formato === 'o-jardim-conteudo-global';

const defaultOutput = outputIsGlobal
  ? path.join(root, 'data', 'editorial', 'global.json')
  : path.join(root, 'data', 'editorial', 'campanhas', `${snapshot.campanha.id}.json`);
const outputPath = outputIndex >= 0 && args[outputIndex + 1]
  ? path.resolve(process.cwd(), args[outputIndex + 1])
  : defaultOutput;
const allowedRoot = path.resolve(root, 'data', 'editorial');
const relative = path.relative(allowedRoot, outputPath);
if ((relative.startsWith('..') || path.isAbsolute(relative)) && outputIndex < 0) {
  throw new Error('O destino padrão precisa permanecer em data/editorial.');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Snapshot editorial sincronizado: ${outputPath}`);
console.log(outputIsGlobal
  ? `Conteúdo global: ${snapshot.conteudo.length} publicação(ões).`
  : `Conteúdo: ${snapshot.conteudo.length} publicação(ões); loja: ${snapshot.loja.length} item(ns).`);
