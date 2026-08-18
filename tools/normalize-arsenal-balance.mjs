import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'data', 'loja', 'catalogo.json');
const document = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const profiles = {
  'reliquia-excalibur': ['8d12+20', 35, 'reliquia'],
  'reliquia-mjolnir': ['8d12+18', 35, 'reliquia'],
  'reliquia-martelo-chamas': ['8d12+16', 35, 'reliquia'],
  'reliquia-gungnir': ['8d12+14', 35, 'reliquia'],
  'reliquia-masamune': ['10d10+10', 35, 'reliquia'],
  'reliquia-rhaast': ['8d12+12', 35, 'reliquia'],
  'reliquia-triceratops': ['10d10+8', 35, 'reliquia'],
  'reliquia-zangetsu': ['8d12+10', 35, 'reliquia'],
};
const ammunition = {
  'arco-curto': 1, besta: 1, dardo: 1, pistola: 12, revolver: 6, submetralhadora: 30,
  mosquete: 1, 'fuzil-de-caca': 5, shuriken: 1, kunai: 1, zarabatana: 1, 'arco-longo': 1,
  'besta-pesada': 1, 'dardo-envenenado': 1, espingarda: 8, 'fuzil-de-assalto': 30,
  'shuriken-pesada': 1, 'kunai-pesada': 1, thompson: 30, minigun: 100, awp: 5, bazuca: 1,
  funda: 1, 'arco-composto': 1, 'espingarda-cano-duplo': 2, 'rifle-de-precisao': 5,
  'lanca-chamas': 10, 'canhao-de-mao': 1, 'arma-sniper-antimateria': 1,
};

let changed = 0;
for (const entry of document.entradas || []) {
  const profile = profiles[entry.id];
  if (!profile) continue;
  const [damage, recommendedLevel, tier] = profile;
  const content = entry.conteudo || (entry.conteudo = {});
  content.dano = damage;
  content.nivel_recomendado = recommendedLevel;
  content.tier_poder = tier;
  content.requer_autorizacao_mestre = true;
  const attributes = Array.isArray(content.atributos) ? content.atributos : [];
  const damageLabel = `${damage} de dano`;
  const index = attributes.findIndex((item) => /\bdano\b/i.test(String(item)));
  if (index >= 0) attributes[index] = damageLabel;
  else attributes.unshift(damageLabel);
  content.atributos = attributes;
  changed += 1;
}

let ammunitionChanged = 0;
for (const entry of document.entradas || []) {
  const capacity = ammunition[entry.id];
  if (!capacity) continue;
  const content = entry.conteudo || (entry.conteudo = {});
  content.municao_maxima = capacity;
  content.municao_atual = capacity;
  const attributes = Array.isArray(content.atributos) ? content.atributos : [];
  const label = `Munição ${capacity}`;
  const index = attributes.findIndex((item) => /muni[cç][aã]o/i.test(String(item)));
  if (index >= 0) attributes[index] = label;
  else attributes.push(label);
  content.atributos = attributes;
  ammunitionChanged += 1;
}

if (changed !== Object.keys(profiles).length) throw new Error(`Esperava ${Object.keys(profiles).length} armas, mas encontrei ${changed}.`);
if (ammunitionChanged !== Object.keys(ammunition).length) throw new Error(`Esperava munição em ${Object.keys(ammunition).length} armas, mas encontrei ${ammunitionChanged}.`);
fs.writeFileSync(catalogPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Arsenal normalizado: ${changed} armas lendárias ou relíquias e ${ammunitionChanged} armas com munição.`);
