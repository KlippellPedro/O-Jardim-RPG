import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_VAULT = 'C:/Users/Pedro/OneDrive/Documentos/RPG/obsidian/O Jardim - RPG';
const SCHEMA_VERSION = 1;

const SOURCES = [
  { source: 'data/ficha/classes.json', target: '02 - Sistema/Ficha/Classes', collections: [{ key: null, mode: 'array' }] },
  { source: 'data/ficha/racas.json', target: '02 - Sistema/Ficha', fullSourceFile: 'Raças.md', title: 'Raças', renderer: 'races', collections: [{ key: null, mode: 'array' }] },
  {
    source: 'data/ficha/pericias.json',
    target: '02 - Sistema/Ficha',
    fullSourceFile: 'Perícias.md',
    title: 'Perícias',
    renderer: 'skills',
    collections: [
      { key: 'pericias', mode: 'array', folder: 'Perícias' },
      { key: 'nao_sao_pericias', mode: 'array', folder: 'Referências' },
    ],
  },
  { source: 'data/ficha/legados.json', target: '02 - Sistema/Ficha/Legados', fullSourceFile: 'Legados originais.md', title: 'Legados originais', renderer: 'legacies', collections: [{ key: 'legados', mode: 'array' }] },
  { source: 'data/ficha/legados-novos.json', target: '02 - Sistema/Ficha/Legados', fullSourceFile: 'Novos Legados.md', title: 'Novos Legados', renderer: 'newLegacies', collections: [{ key: 'novos', mode: 'array' }] },
  { source: 'data/ficha/legados-regras-v1.json', target: '02 - Sistema/Ficha/Legados', fullSourceFile: 'Balanceamento dos Legados.md', title: 'Balanceamento dos Legados', renderer: 'legacyRules', collections: [{ key: 'regras', mode: 'map' }] },
  { source: 'data/ficha/magias.json', target: '02 - Sistema/Ficha', fullSourceFile: 'Magias.md', title: 'Magias', renderer: 'spells', collections: [{ key: 'magias', mode: 'array' }] },
  { source: 'data/loja/catalogo.json', target: '03 - Loja/Catálogo', bundleBy: 'tipo', bundleKey: 'entradas', renderer: 'shop', collections: [{ key: 'entradas', mode: 'array' }] },
  { source: 'data/loja/bestiario_precos.json', target: '03 - Loja', fullSourceFile: 'Bestiário.md', title: 'Bestiário e preços', collections: [{ key: 'fontes', mode: 'map' }] },
  { source: 'data/loja/veiculos_sistema.json', target: '03 - Loja', fullSourceFile: 'Veículos.md', title: 'Veículos', collections: [{ key: 'fontes', mode: 'map' }] },
  { source: 'data/regras/mestre-v1.json', target: '02 - Sistema/Regras', fullSourceFile: 'Ferramentas do Mestre.md', title: 'Ferramentas do Mestre', collections: [{ key: 'secoes', mode: 'array' }] },
  { source: 'data/regras/balanceamento-referencia-v1.json', target: '.jardim/Modelos/Regras', fullSourceFile: 'Balanceamento de referência.md', title: 'Balanceamento de referência', collections: [{ key: null, mode: 'object' }] },
  { source: 'data/loja/_padrao.json', target: '.jardim/Modelos/Loja/Catálogo', collections: [{ key: null, mode: 'object' }] },
  { source: 'data/mundo/_padrao.json', target: '.jardim/Modelos/Mundo/Lore', collections: [{ key: null, mode: 'object' }] },
];

const MIRRORS = [
  { source: 'data/regras/regras-publicas-v1.md', target: '02 - Sistema/Regras/Publicadas/Regras públicas.md' },
  { source: 'data/regras/relatorio-balanceamento-v1.md', target: '02 - Sistema/Regras/Balanceamento/Relatório de balanceamento.md' },
  { source: 'data/loja/INSTRUCOES_CATALOGO.md', target: '00 - Início/GUIA - Catálogo da Loja.md' },
];

const BODY_FIELD_NAMES = new Set([
  'descricao', 'descrição', 'resumo', 'efeito', 'texto', 'nota', 'onde_aparece',
  '_nota', '_LEIA_ISSO_PRIMEIRO', 'observacao', 'observação', 'detalhes',
]);

const FIELD_LABELS = {
  acao: 'Ação',
  alcance: 'Alcance',
  alvo: 'Alvo',
  arvore: 'Árvore',
  atributos: 'Atributos',
  categoria: 'Categoria',
  circulo: 'Círculo',
  concentracao: 'Concentração',
  custo_mana: 'Custo de Mana',
  dano: 'Dano',
  defesa: 'Defesa',
  descricao: 'Descrição',
  disponibilidade: 'Disponibilidade',
  duracao: 'Duração',
  efeito: 'Efeito',
  estagio: 'Estágio',
  execucao: 'Execução',
  forca: 'Força',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  destreza: 'Destreza',
  carisma: 'Carisma',
  genero: 'Gênero',
  margem_ameaca: 'Margem de ameaça',
  multiplicador_critico: 'Multiplicador crítico',
  nivel: 'Nível',
  nivelMinimoLoja: 'Loja mínima',
  origem_conteudo: 'Origem do conteúdo',
  pre_requisitos: 'Pré-requisitos',
  progressao: 'Progressão',
  progressao_publicada: 'Progressão publicada',
  raridade: 'Raridade',
  tipo_de_dano: 'Tipo de dano',
  titulo: 'Título',
  versao: 'Versão',
  versao_balanceamento: 'Versão de balanceamento',
};

function parseArguments() {
  const [command = 'check', ...args] = process.argv.slice(2);
  let vault = process.env.JARDIM_OBSIDIAN_VAULT || DEFAULT_VAULT;
  let force = false;
  let source = null;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--vault') vault = args[++index];
    else if (args[index] === '--source') source = args[++index]?.replaceAll('\\', '/');
    else if (args[index] === '--force') force = true;
    else throw new Error(`Argumento desconhecido: ${args[index]}`);
  }
  if (!['import', 'export', 'check'].includes(command)) {
    throw new Error('Uso: node tools/obsidian-content.mjs <import|export|check> [--vault CAMINHO] [--source FONTE] [--force]');
  }
  return { command, vault: path.resolve(vault), force, source };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8'));
}

function humanize(value) {
  if (FIELD_LABELS[value]) return FIELD_LABELS[value];
  return String(value)
    .replace(/^_+/, '')
    .replaceAll('_', ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function safeFileName(value) {
  const cleaned = String(value || 'Sem título')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  return cleaned || 'Sem título';
}

function titleFor(record, mapKey, index) {
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    return record.titulo || record.nome || record.id || mapKey || `Entrada ${index + 1}`;
  }
  return mapKey || `Entrada ${index + 1}`;
}

function shouldMoveToBody(key, value) {
  return typeof value === 'string'
    && (BODY_FIELD_NAMES.has(key) || value.includes('\n') || value.length >= 120);
}

function splitRecord(record) {
  const frontmatter = {};
  const bodyFields = [];
  for (const [key, value] of Object.entries(record)) {
    if (shouldMoveToBody(key, value)) bodyFields.push([key, value]);
    else frontmatter[key] = value;
  }
  return { frontmatter, bodyFields };
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function scalarLabel(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return escapeCell(value);
}

function itemTitle(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return `Item ${index + 1}`;
  if (item.titulo) return item.titulo;
  if (item.nome) return item.nome;
  if (item.nivel !== undefined) return `Nível ${item.nivel}`;
  if (item.circulo !== undefined) return `Círculo ${item.circulo}`;
  return `Item ${index + 1}`;
}

function renderTable(columns, rows) {
  if (!columns?.length || !rows?.length) return '';
  const header = `| ${columns.map(escapeCell).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(scalarLabel).join(' | ')} |`).join('\n');
  return `${header}\n${divider}\n${body}`;
}

function renderObject(value, headingLevel = 3) {
  if (value.colunas && value.linhas && Array.isArray(value.colunas) && Array.isArray(value.linhas)) {
    const remaining = Object.fromEntries(Object.entries(value).filter(([key]) => !['colunas', 'linhas'].includes(key)));
    return [renderObject(remaining, headingLevel), renderTable(value.colunas, value.linhas)].filter(Boolean).join('\n\n');
  }
  const visible = Object.entries(value).filter(([key]) => !key.startsWith('_') && !['id', 'titulo', 'nome'].includes(key));
  const simple = visible.filter(([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item));
  const complex = visible.filter(([, item]) => item !== null && (Array.isArray(item) || typeof item === 'object'));
  const parts = [];
  if (simple.length) {
    parts.push(['| Campo | Valor |', '| --- | --- |', ...simple.map(([key, item]) => `| ${humanize(key)} | ${scalarLabel(item)} |`)].join('\n'));
  }
  for (const [key, item] of complex) {
    const level = Math.min(headingLevel, 6);
    parts.push(`${'#'.repeat(level)} ${humanize(key)}\n\n${renderReadable(item, level + 1)}`);
  }
  return parts.join('\n\n');
}

function renderReadable(value, headingLevel = 3) {
  if (Array.isArray(value)) {
    if (!value.length) return '_Nenhum._';
    if (value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map((item) => `- ${scalarLabel(item)}`).join('\n');
    }
    if (value.every(Array.isArray)) return value.map((row) => `- ${row.map(scalarLabel).join(' · ')}`).join('\n');
    return value.map((item, index) => {
      const level = Math.min(headingLevel, 6);
      return `${'#'.repeat(level)} ${itemTitle(item, index)}\n\n${renderReadable(item, level + 1)}`;
    }).join('\n\n');
  }
  if (value && typeof value === 'object') return renderObject(value, headingLevel);
  return scalarLabel(value);
}

function compactValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length ? value.map(compactValue).join('<br>') : '—';
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, item]) => `**${humanize(key)}:** ${compactValue(item)}`)
      .join('<br>');
  }
  return escapeCell(value);
}

function markdownTable(columns, rows) {
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(compactValue).join(' | ')} |`),
  ].join('\n');
}

function renderSkills(data) {
  const skills = markdownTable(
    ['Perícia', 'Atributo', 'Origem', 'Uso', 'Descrição'],
    (data.pericias || []).map((item) => [item.titulo, humanize(item.atributo), item.origem, item.uso, item.descricao]),
  );
  const references = markdownTable(
    ['Valor', 'Atributo', 'Descrição'],
    (data.nao_sao_pericias || []).map((item) => [item.titulo, humanize(item.atributo), item.descricao]),
  );
  return [data.nota, '## Perícias', skills, '## Outros valores da ficha', references].filter(Boolean).join('\n\n');
}

function renderSpells(data) {
  const groups = new Map();
  for (const spell of data.magias || []) {
    const key = spell.circulo ?? 'Ritual';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(spell);
  }
  const intro = [
    `**Versão:** ${data.versao || '—'}`,
    `**Status:** ${humanize(data.status || '—')}`,
  ].join('  \n');
  const sections = [...groups.entries()].map(([circle, spells]) => {
    const title = String(circle).toLocaleLowerCase('pt-BR') === 'ritual' ? 'Rituais' : `Círculo ${circle}`;
    return `## ${title}\n\n${markdownTable(
      ['Magia', 'Mana', 'Execução', 'Alcance', 'Duração', 'Defesa', 'Dano', 'Efeito'],
      spells.map((spell) => [spell.titulo, spell.custo_mana, spell.execucao, spell.alcance, spell.duracao, spell.defesa, spell.dano, spell.efeito]),
    )}`;
  });
  return [intro, ...sections].join('\n\n');
}

function renderRaces(data) {
  return markdownTable(
    ['Raça', 'Vida', 'Mana', 'Movimento', 'Árvore', 'Fisiologia', 'Características'],
    data.map((race) => [race.titulo, race.vida, race.mana, race.movimento, race.arvore, race.fisiologia, race.caracteristicas]),
  );
}

function renderLegacies(data, key) {
  return [
    data.descricao,
    markdownTable(
      ['Legado', 'Descrição', 'Pré-requisitos', 'Fonte'],
      (data[key] || []).map((legacy) => [legacy.titulo, legacy.descricao, legacy.pre_requisitos, legacy.fonte]),
    ),
  ].filter(Boolean).join('\n\n');
}

function renderLegacyRules(data) {
  return [
    data.descricao,
    markdownTable(
      ['Legado', 'Regra balanceada'],
      Object.entries(data.regras || {}).map(([id, rule]) => [rule.titulo || humanize(id), rule]),
    ),
  ].filter(Boolean).join('\n\n');
}

function renderFullSourceView(config, data) {
  if (config.renderer === 'skills') return renderSkills(data);
  if (config.renderer === 'spells') return renderSpells(data);
  if (config.renderer === 'races') return renderRaces(data);
  if (config.renderer === 'legacies') return renderLegacies(data, 'legados');
  if (config.renderer === 'newLegacies') return renderLegacies(data, 'novos');
  if (config.renderer === 'legacyRules') return renderLegacyRules(data);
  return renderReadable(data, 2);
}

function renderBundleView(config, entries) {
  const records = entries.map(({ registro }) => registro);
  if (config.renderer === 'shop') {
    const locationLabels = {
      1: 'Feira de Vila',
      2: 'Metrópole',
      3: 'Mercado Negro',
      4: 'Banco Lunar',
    };
    return markdownTable(
      ['Item', 'Preço', 'Raridade', 'Detalhes'],
      records.map((record) => {
        const content = record.conteudo || {};
        const details = Object.fromEntries(Object.entries(content)
          .filter(([key]) => !['preco', 'raridade'].includes(key))
          .map(([key, value]) => [key, key === 'nivelMinimoLoja' ? locationLabels[value] ?? value : value]));
        return [record.titulo, content.preco, content.raridade, details];
      }),
    );
  }
  return renderReadable(records, 2);
}

function readableSections(record, hiddenKeys) {
  const entries = Object.entries(record).filter(([key]) => !hiddenKeys.has(key) && !['id', 'titulo'].includes(key));
  const simple = entries.filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value));
  const complex = entries.filter(([, value]) => value !== null && (Array.isArray(value) || typeof value === 'object'));
  const parts = [];
  if (simple.length) {
    parts.push(['## Informações', '', '| Campo | Valor |', '| --- | --- |', ...simple.map(([key, value]) => `| ${humanize(key)} | ${scalarLabel(value)} |`)].join('\n'));
  }
  for (const [key, value] of complex) {
    parts.push(`## ${humanize(key)}\n\n${renderReadable(value, 3)}`);
  }
  return parts.join('\n\n');
}

function noteText({ source, collectionKey, mode, order, mapKey, record, title }) {
  const normalized = record && typeof record === 'object' && !Array.isArray(record)
    ? record
    : { dados: record };
  const { frontmatter, bodyFields } = splitRecord(normalized);
  const metadata = {
    jardim_schema: SCHEMA_VERSION,
    jardim_fonte: source.replaceAll('\\', '/'),
    jardim_colecao: collectionKey ?? '_raiz',
    jardim_formato: mode,
    jardim_ordem: order,
    ...(mapKey === undefined ? {} : { jardim_chave: mapKey }),
    ...(bodyFields.length ? { jardim_campos_texto: bodyFields.map(([key]) => key) } : {}),
    ...frontmatter,
  };
  const sections = bodyFields.map(([key, value]) => [
    `<!-- jardim:campo:${key} -->`,
    `## ${humanize(key)}`,
    '',
    value,
    `<!-- jardim:fim:${key} -->`,
  ].join('\n')).join('\n\n');
  const readable = readableSections(normalized, new Set(bodyFields.map(([key]) => key)));
  return [
    '---',
    stringifyYaml(metadata, { lineWidth: 0 }).trimEnd(),
    '---',
    '',
    `# ${title}`,
    ...(sections ? ['', sections] : []),
    ...(readable ? ['', '<!-- jardim:visualizacao:inicio -->', readable, '<!-- jardim:visualizacao:fim -->'] : []),
    '',
  ].join('\n');
}

function fullSourceNoteText(config, data) {
  const metadata = {
    jardim_schema: SCHEMA_VERSION,
    jardim_fonte: config.source,
    jardim_bundle: 'fonte_completa',
    jardim_dados: data,
  };
  return [
    '---',
    stringifyYaml(metadata, { lineWidth: 0 }).trimEnd(),
    '---',
    '',
    `# ${config.title || path.basename(config.fullSourceFile, '.md')}`,
    '',
    '<!-- jardim:visualizacao:inicio -->',
    renderFullSourceView(config, data),
    '<!-- jardim:visualizacao:fim -->',
    '',
  ].join('\n');
}

function bundleNoteText(config, group, entries) {
  const metadata = {
    jardim_schema: SCHEMA_VERSION,
    jardim_fonte: config.source,
    jardim_bundle: 'grupo',
    jardim_grupo: group,
    jardim_itens: entries,
  };
  return [
    '---',
    stringifyYaml(metadata, { lineWidth: 0 }).trimEnd(),
    '---',
    '',
    `# ${humanize(group)}`,
    '',
    '<!-- jardim:visualizacao:inicio -->',
    renderBundleView(config, entries),
    '<!-- jardim:visualizacao:fim -->',
    '',
  ].join('\n');
}

function manifestPath(vault, config) {
  const name = config.source.replaceAll('/', '__').replaceAll('\\', '__').replace(/\.json$/i, '');
  return path.join(vault, '.jardim', 'Manifestos', `${name}.md`);
}

function metadataFor(data, collections) {
  const collectionKeys = new Set(collections.map(({ key }) => key).filter((key) => key !== null));
  if (collections.some(({ key }) => key === null)) return {};
  return Object.fromEntries(Object.entries(data).filter(([key]) => !collectionKeys.has(key)));
}

function recordsFor(data, collection) {
  const value = collection.key === null ? data : data[collection.key];
  if (collection.mode === 'array') {
    assert(Array.isArray(value), `${collection.key ?? 'raiz'} deveria ser array`);
    return value.map((record, index) => ({ record, index }));
  }
  if (collection.mode === 'map') {
    assert(value && typeof value === 'object' && !Array.isArray(value), `${collection.key} deveria ser objeto`);
    return Object.entries(value).map(([mapKey, record], index) => ({ mapKey, record, index }));
  }
  return [{ record: value, index: 0 }];
}

function groupFolder(collection, record) {
  if (!collection.groupBy || !record || typeof record !== 'object') return collection.folder || '';
  const value = record[collection.groupBy];
  if (value === undefined || value === null || value === '') return collection.folder || 'Sem categoria';
  const group = `${collection.groupPrefix || ''}${humanize(value)}`;
  return path.join(collection.folder || '', safeFileName(group));
}

function uniqueNotePath(directory, title, record, occupied) {
  const base = safeFileName(title);
  let candidate = path.join(directory, `${base}.md`);
  if (!occupied.has(candidate.toLocaleLowerCase('pt-BR'))) {
    occupied.add(candidate.toLocaleLowerCase('pt-BR'));
    return candidate;
  }
  const suffix = record && typeof record === 'object' && record.id ? ` - ${safeFileName(record.id)}` : ' - duplicado';
  candidate = path.join(directory, `${base}${suffix}.md`);
  let number = 2;
  while (occupied.has(candidate.toLocaleLowerCase('pt-BR'))) {
    candidate = path.join(directory, `${base}${suffix} ${number++}.md`);
  }
  occupied.add(candidate.toLocaleLowerCase('pt-BR'));
  return candidate;
}

function writeFileSafely(filePath, contents, force) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`O arquivo já existe: ${filePath}. Use --force somente para regenerar notas importadas.`);
  }
  fs.writeFileSync(filePath, contents.replaceAll('\r\n', '\n'), 'utf8');
}

function importSource(vault, config, force) {
  const data = readJson(config.source);
  const targetRoot = path.join(vault, config.target);
  const manifest = {
    jardim_schema: SCHEMA_VERSION,
    jardim_manifesto: true,
    jardim_fonte: config.source,
    jardim_colecoes: config.collections.map(({ key, mode }) => ({ chave: key ?? '_raiz', formato: mode })),
    metadados: metadataFor(data, config.collections),
  };
  writeFileSafely(
    manifestPath(vault, config),
    ['---', stringifyYaml(manifest, { lineWidth: 0 }).trimEnd(), '---', '', `# ${path.basename(config.target)}`, '', '> Este arquivo controla a sincronização com o site. Não altere `jardim_*`.', ''].join('\n'),
    force,
  );
  if (config.fullSourceFile) {
    writeFileSafely(path.join(targetRoot, config.fullSourceFile), fullSourceNoteText(config, data), force);
    return 1;
  }
  if (config.bundleBy) {
    const sourceItems = data[config.bundleKey];
    assert(Array.isArray(sourceItems), `${config.bundleKey} deveria ser array em ${config.source}`);
    const groups = new Map();
    sourceItems.forEach((record, order) => {
      const group = record[config.bundleBy] || 'sem-categoria';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ ordem: order, registro: record });
    });
    for (const [group, entries] of groups) {
      writeFileSafely(path.join(targetRoot, `${safeFileName(humanize(group))}.md`), bundleNoteText(config, group, entries), force);
    }
    return groups.size;
  }
  const occupied = new Set();
  let count = 0;
  for (const collection of config.collections) {
    for (const { record, mapKey, index } of recordsFor(data, collection)) {
      const title = titleFor(record, mapKey, index);
      const directory = path.join(targetRoot, groupFolder(collection, record));
      const filePath = uniqueNotePath(directory, title, record, occupied);
      writeFileSafely(filePath, noteText({
        source: config.source,
        collectionKey: collection.key,
        mode: collection.mode,
        order: index,
        mapKey,
        record,
        title,
      }), force);
      count += 1;
    }
  }
  return count;
}

function extractFrontmatter(contents, filePath) {
  const match = contents.match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new Error(`Frontmatter ausente em ${filePath}`);
  return { data: parseYaml(match[1]), body: contents.slice(match[0].length) };
}

function visualizationFrom(body, filePath) {
  const start = '<!-- jardim:visualizacao:inicio -->';
  const end = '<!-- jardim:visualizacao:fim -->';
  const startIndex = body.indexOf(start);
  const endIndex = body.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`Visualização sincronizada ausente em ${filePath}`);
  return body.slice(startIndex + start.length, endIndex).trim();
}

function readBodyField(body, key, filePath) {
  const start = `<!-- jardim:campo:${key} -->`;
  const end = `<!-- jardim:fim:${key} -->`;
  const startIndex = body.indexOf(start);
  const endIndex = body.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`Campo textual ${key} inválido em ${filePath}`);
  const section = body.slice(startIndex + start.length, endIndex).trim();
  return section.replace(/^##[^\n]*\n+/, '').trim();
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function recordFromNote(filePath) {
  const { data, body } = extractFrontmatter(fs.readFileSync(filePath, 'utf8'), filePath);
  const internal = {};
  const record = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('jardim_')) internal[key] = value;
    else record[key] = value;
  }
  for (const key of internal.jardim_campos_texto || []) record[key] = readBodyField(body, key, filePath);
  if (Object.keys(record).length === 1 && Object.hasOwn(record, 'dados')) return { internal, record: record.dados };
  return { internal, record };
}

function compileSource(vault, config) {
  const targetRoot = path.join(vault, config.target);
  const sourceManifestPath = manifestPath(vault, config);
  const manifest = extractFrontmatter(fs.readFileSync(sourceManifestPath, 'utf8'), sourceManifestPath).data;
  assert.equal(manifest.jardim_schema, SCHEMA_VERSION, `Schema incompatível em ${sourceManifestPath}`);
  assert.equal(manifest.jardim_fonte, config.source, `Fonte incompatível em ${sourceManifestPath}`);
  if (config.fullSourceFile) {
    const fullSourcePath = path.join(targetRoot, config.fullSourceFile);
    const parsed = extractFrontmatter(fs.readFileSync(fullSourcePath, 'utf8'), fullSourcePath);
    const note = parsed.data;
    assert.equal(note.jardim_fonte, config.source, `Fonte incompatível em ${fullSourcePath}`);
    assert.equal(
      visualizationFrom(parsed.body, fullSourcePath),
      renderFullSourceView(config, note.jardim_dados).trim(),
      `A parte visível de ${fullSourcePath} foi editada e precisa ser sincronizada antes da exportação`,
    );
    return note.jardim_dados;
  }
  if (config.bundleBy) {
    const result = structuredClone(manifest.metadados || {});
    const bundleNotes = walkFiles(targetRoot)
      .filter((filePath) => filePath.endsWith('.md'))
      .map((filePath) => ({ filePath, ...extractFrontmatter(fs.readFileSync(filePath, 'utf8'), filePath) }))
      .filter(({ data }) => data.jardim_fonte === config.source && data.jardim_bundle === 'grupo');
    for (const note of bundleNotes) {
      assert.equal(
        visualizationFrom(note.body, note.filePath),
        renderBundleView(config, note.data.jardim_itens).trim(),
        `A parte visível de ${note.filePath} foi editada e precisa ser sincronizada antes da exportação`,
      );
    }
    const entries = bundleNotes
      .flatMap(({ data }) => data.jardim_itens)
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ registro }) => registro);
    result[config.bundleKey] = entries;
    return result;
  }
  const notes = walkFiles(targetRoot)
    .filter((filePath) => filePath.endsWith('.md') && path.basename(filePath) !== '_Coleção.md')
    .map((filePath) => ({ filePath, ...recordFromNote(filePath) }))
    .filter(({ internal }) => internal.jardim_fonte === config.source);
  const result = structuredClone(manifest.metadados || {});
  for (const collection of config.collections) {
    const collectionName = collection.key ?? '_raiz';
    const selected = notes
      .filter(({ internal }) => internal.jardim_colecao === collectionName)
      .sort((a, b) => a.internal.jardim_ordem - b.internal.jardim_ordem);
    if (collection.mode === 'array') {
      const value = selected.map(({ record }) => record);
      if (collection.key === null) return value;
      result[collection.key] = value;
    } else if (collection.mode === 'map') {
      result[collection.key] = Object.fromEntries(selected.map(({ internal, record }) => [internal.jardim_chave, record]));
    } else if (collection.key === null) {
      assert.equal(selected.length, 1, `${config.source} deve possuir uma nota raiz`);
      return selected[0].record;
    } else {
      assert.equal(selected.length, 1, `${config.source}:${collection.key} deve possuir uma nota`);
      result[collection.key] = selected[0].record;
    }
  }
  return result;
}

function importMirrors(vault, force, source) {
  const selected = source ? MIRRORS.filter((mirror) => mirror.source === source) : MIRRORS;
  for (const mirror of selected) {
    const sourceText = fs.readFileSync(path.join(REPOSITORY_ROOT, mirror.source), 'utf8');
    const warning = `<!-- Espelho de ${mirror.source}. Edite a fonte indicada ou use o fluxo documentado; esta cópia não é exportada. -->\n\n`;
    writeFileSafely(path.join(vault, mirror.target), warning + sourceText, force);
  }
  return selected.length;
}

function importAll(vault, force, source) {
  if (!fs.existsSync(vault)) throw new Error(`Cofre não encontrado: ${vault}`);
  let total = 0;
  const selected = source ? SOURCES.filter((config) => config.source === source) : SOURCES;
  for (const config of selected) {
    const count = importSource(vault, config, force);
    console.log(`Importado ${config.source}: ${count} nota(s)`);
    total += count;
  }
  const mirrorCount = importMirrors(vault, force, source);
  if (source && selected.length === 0 && mirrorCount === 0) throw new Error(`Fonte desconhecida: ${source}`);
  console.log(`Importação concluída: ${total} notas de dados e ${mirrorCount} espelhos Markdown.`);
}

function exportAll(vault, checkOnly, source) {
  let checked = 0;
  const selected = source ? SOURCES.filter((config) => config.source === source) : SOURCES;
  if (source && selected.length === 0) throw new Error(`Fonte JSON desconhecida: ${source}`);
  for (const config of selected) {
    const compiled = compileSource(vault, config);
    const destination = path.join(REPOSITORY_ROOT, config.source);
    if (checkOnly) {
      assert.deepEqual(compiled, readJson(config.source), `As notas divergem de ${config.source}`);
      console.log(`OK ${config.source}`);
    } else {
      fs.writeFileSync(destination, `${JSON.stringify(compiled, null, 2)}\n`, 'utf8');
      console.log(`Exportado ${config.source}`);
    }
    checked += 1;
  }
  console.log(`${checkOnly ? 'Validação' : 'Exportação'} concluída: ${checked} fontes.`);
}

const { command, vault, force, source } = parseArguments();
if (command === 'import') importAll(vault, force, source);
else if (command === 'export' && fs.existsSync(path.join(vault, '02 - Sistema', 'Ficha', 'Legados oficiais.md'))) {
  throw new Error('Exportação automática bloqueada: o cofre usa notas consolidadas que o adaptador legado ainda não recompõe com segurança. Sincronize pelo Codex.');
}
else exportAll(vault, command === 'check', source);
