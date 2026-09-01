import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const catalogPath = path.join(root, 'data', 'loja', 'catalogo.json');

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

const containsAny = (text, markers) => markers.some((marker) => text.includes(marker));

const rarityLevel = (rarity) => {
  switch (normalize(rarity)) {
    case 'raro': return 2;
    case 'epico': return 3;
    case 'lendario':
    case 'mitico':
    case 'mitica':
    case 'reliquia':
    case 'reliquia da criacao': return 4;
    case 'comum':
    case 'incomum': return 1;
    default: return 4;
  }
};

const priceCurrency = (price) => {
  if (!price || typeof price !== 'object' || Array.isArray(price)) return 'solares';
  return normalize(Object.keys(price)[0]);
};

const levelForMonster = (entry, text) => {
  const content = entry.conteudo;
  const monsterClass = normalize(content.classe);
  const monsterSubtype = normalize(content.subtipo);
  const monsterLevel = Number(content.nivel) || 0;

  if (monsterClass === 'ser lendario' || normalize(content.raridade) === 'lendario') return 4;
  // Criaturas do Vazio não são fauna comum. Até os exemplares mais fracos só
  // circulam contidos pela Guilda dos Caçadores e entram pelo Mercado Negro;
  // acima do nível 40, o Banco Lunar continua sendo o único balcão possível.
  if (monsterSubtype === 'vazio') return Math.max(monsterLevel > 40 ? 4 : 3, rarityLevel(content.raridade));
  if (monsterClass === 'servo') return 3;

  if (monsterClass === 'ajudante') {
    let helperLevel = monsterLevel <= 10 ? 1 : monsterLevel <= 30 ? 2 : 3;
    if (containsAny(text, ['automato', 'espirito', 'arcano', 'divino', 'espectral', 'umbral'])) {
      helperLevel = Math.max(helperLevel, 2);
    }
    return Math.max(helperLevel, rarityLevel(content.raridade));
  }

  let level = monsterLevel <= 10 ? 1 : monsterLevel <= 20 ? 2 : monsterLevel <= 40 ? 3 : 4;
  if (monsterClass === 'familiar' || monsterClass === 'invocacao') level = Math.max(level, 2);
  if (containsAny(text, ['automato', 'espirito', 'arcano', 'divino', 'espectral', 'umbral', 'demonio', 'necromante'])) {
    level = Math.max(level, 2);
  }
  return Math.max(level, rarityLevel(content.raridade));
};

export const classifyShopLocation = (entry) => {
  const content = entry.conteudo ?? {};
  const type = normalize(entry.tipo);
  const subtype = normalize(content.subtipo);
  const rarity = normalize(content.raridade);
  const id = normalize(entry.id);
  const text = normalize([
    entry.id,
    entry.titulo,
    content.descricao,
    content.material,
    content.sistema,
    content.subtipo,
    ...(Array.isArray(content.atributos) ? content.atributos : []),
  ].filter(Boolean).join(' '));
  const currency = priceCurrency(content.preco);

  let level = rarityLevel(rarity);
  if (currency === 'fragmentos de estrela') return 4;
  if (currency === 'creditos sombrios') level = Math.max(level, 3);
  if (containsAny(text, ['contrabando', 'mercado negro', 'ilegal'])) level = Math.max(level, 3);

  switch (type) {
    case 'arma': {
      if (subtype === 'reliquia-criacao') return 4;
      if (subtype === 'marcial') level = Math.max(level, 2);
      if (containsAny(text, [
        'plasma', 'monomolecular', 'minigun', 'bazuca', 'lanca-chamas',
        'canhao de mao', 'thompson', 'awp', 'fuzil de precisao', 'dardo envenenado',
      ])) level = Math.max(level, 3);
      if (containsAny(text, ['antimateria', 'obstinada'])) level = 4;
      return level;
    }

    case 'armadura':
      if (containsAny(text, ['a.x.i.s', 'nano material', 'furtividade optica', 'exoesqueleto'])) {
        level = Math.max(level, 3);
      } else if (containsAny(text, ['kevlar', 'luxuos', 'meia-armadura'])) {
        level = Math.max(level, 2);
      }
      return level;

    case 'equipamento':
      if (id === 'pergaminho-teleporte') return Math.max(level, 3);
      return level;

    case 'modificacao':
      if (normalize(content.nivel_modificacao) === 'marcial') level = Math.max(level, 2);
      if (containsAny(id, [
        'drenante', 'assombrada', 'vinculado', 'ressonante', 'autoidentificavel',
        'sensivel-a-fluxo', 'instavel', 'recarregavel',
      ])) level = Math.max(level, 2);
      if (containsAny(id, ['sedenta', 'vampirica', 'casca-do-fim'])) level = Math.max(level, 3);
      return level;

    case 'consumivel':
      return Math.max(level, rarity === 'raro' || rarity === 'epico' ? 3 : 2);

    case 'veiculo': {
      const tier = Number.parseInt(String(content.tier ?? '').replace(/\D/g, ''), 10);
      if (Number.isInteger(tier) && tier >= 1) return Math.min(4, tier + 1);
      return 2;
    }

    case 'veiculo-completo':
      if (rarity === 'raro') return 3;
      return Math.max(level, 2);

    case 'propriedade':
      return normalize(content.patamar) === 'complexo' ? 3 : 2;

    case 'monstro':
      return levelForMonster(entry, text);

    case 'drop':
      if (id.startsWith('drop-')) level = Math.max(level, 2);
      if (containsAny(id, [
        'drop-humano-', 'drop-vampiro-', 'drop-anao-', 'drop-espirito-',
        'drop-animalia-', 'drop-sereia-',
      ])) level = Math.max(level, 3);
      if (containsAny(id, [
        'comp-nucleo-tecnologico', 'comp-emissor-axis', 'comp-vestigio-material',
        'comp-simbolo-pecado', 'comp-simbolo-virtude',
      ])) level = Math.max(level, 3);
      return level;

    case 'implante':
      return 3;

    case 'artefato':
      return Math.max(level, 3);

    case 'fruto-eden':
      return 4;

    default:
      return level;
  }
};

const run = ({ checkOnly }) => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const counts = new Map();
  const mismatches = [];
  for (const entry of catalog.entradas) {
    const level = classifyShopLocation(entry);
    if (entry.conteudo.nivelMinimoLoja !== level) {
      mismatches.push(`${entry.id}: ${entry.conteudo.nivelMinimoLoja ?? 'ausente'} → ${level}`);
    }
    entry.conteudo.nivelMinimoLoja = level;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  if (checkOnly && mismatches.length > 0) {
    throw new Error(`Disponibilidade divergente em ${mismatches.length} item(ns):\n${mismatches.join('\n')}`);
  }
  if (!checkOnly) fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`${checkOnly ? 'Disponibilidade validada' : 'Disponibilidade revisada'} em ${catalog.entradas.length} itens.`);
  for (const level of [1, 2, 3, 4]) console.log(`Nível ${level}: ${counts.get(level) ?? 0}`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run({ checkOnly: process.argv.includes('--check') });
}
