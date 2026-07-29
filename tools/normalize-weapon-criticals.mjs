import fs from 'node:fs/promises';

const catalogUrl = new URL('../bots/banqueiro/data/catalogo.json', import.meta.url);
const catalog = JSON.parse(await fs.readFile(catalogUrl, 'utf8'));

function parseLegacyCritical(value) {
  const text = String(value ?? '').trim().toLowerCase().replace('×', 'x');
  const rangeMatch = text.match(/(?:^|\/)(1[0-9]|20)(?:\s*-\s*20)?/);
  const multiplierMatch = text.match(/x\s*(\d+)/);
  let margin = rangeMatch ? Number(rangeMatch[1]) : 20;
  let multiplier = multiplierMatch ? Number(multiplierMatch[1]) : 2;

  margin = Math.min(20, Math.max(18, margin));
  multiplier = Math.min(4, Math.max(2, multiplier));
  if (multiplier > 2) margin = 20;
  return { margin, multiplier };
}

function criticalLabel(margin, multiplier) {
  return `${margin === 20 ? '20' : `${margin}-20`}/x${multiplier}`;
}

let updated = 0;
for (const entry of catalog.entradas ?? []) {
  if (entry?.tipo !== 'arma' || !entry.conteudo || typeof entry.conteudo !== 'object') continue;
  const content = entry.conteudo;
  const parsed = parseLegacyCritical(
    content.critico ?? `${content.margem_ameaca ?? 20}/x${content.multiplicador_critico ?? 2}`,
  );
  const label = criticalLabel(parsed.margin, parsed.multiplier);

  content.margem_ameaca = parsed.margin;
  content.multiplicador_critico = parsed.multiplier;
  content.critico = label;

  const attributes = Array.isArray(content.atributos) ? content.atributos.map(String) : [];
  const criticalIndex = attributes.findIndex((attribute) => /^cr[ií]tico\b/i.test(attribute.trim()));
  if (criticalIndex >= 0) attributes[criticalIndex] = `Crítico ${label}`;
  else attributes.push(`Crítico ${label}`);
  content.atributos = attributes;
  updated += 1;
}

await fs.writeFile(catalogUrl, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`${updated} armas normalizadas com margem de ameaça e multiplicador crítico.`);
