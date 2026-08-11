import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type CatalogEntry = {
  tipo: string;
  id: string;
  titulo: string;
  conteudo: Record<string, any>;
};

const catalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
) as { entradas: CatalogEntry[] };

const TIPOS = new Set([
  'arma', 'armadura', 'equipamento', 'modificacao', 'consumivel', 'artefato',
  'fruto-eden', 'implante', 'veiculo', 'veiculo-completo', 'monstro', 'drop',
  'propriedade',
]);
const MOEDAS = new Set(['Solares', 'Lunaris', 'Fragmentos de Estrela', 'Créditos Sombrios']);
const RARIDADES = new Set([
  'comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico', 'reliquia',
  'reliquia da criacao',
]);

const normalizar = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

const precoValido = (preco: unknown): boolean => {
  if (typeof preco === 'number') return Number.isSafeInteger(preco) && preco > 0;
  if (!preco || typeof preco !== 'object' || Array.isArray(preco)) return false;
  const pares = Object.entries(preco as Record<string, unknown>);
  return pares.length === 1
    && MOEDAS.has(pares[0][0])
    && typeof pares[0][1] === 'number'
    && Number.isSafeInteger(pares[0][1])
    && pares[0][1] > 0;
};

const lerPreco = (preco: unknown): { moeda: string; valor: number } | null => {
  if (typeof preco === 'number' && precoValido(preco)) return { moeda: 'Solares', valor: preco };
  if (!precoValido(preco)) return null;
  const [moeda, valor] = Object.entries(preco as Record<string, number>)[0];
  return { moeda, valor };
};

test('catálogo possui schema básico completo e identificadores únicos', () => {
  assert.ok(Array.isArray(catalogo.entradas) && catalogo.entradas.length > 0);
  const ids = new Set<string>();

  for (const entrada of catalogo.entradas) {
    assert.ok(TIPOS.has(entrada.tipo), `${entrada.id}: tipo desconhecido ${entrada.tipo}`);
    assert.match(entrada.id, /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u, `${entrada.id}: ID fora do padrão slug`);
    assert.equal(ids.has(entrada.id), false, `${entrada.id}: ID duplicado`);
    ids.add(entrada.id);
    assert.ok(entrada.titulo?.trim(), `${entrada.id}: título ausente`);
    assert.ok(entrada.conteudo && typeof entrada.conteudo === 'object', `${entrada.id}: conteúdo ausente`);
    assert.ok(String(entrada.conteudo.descricao ?? '').trim(), `${entrada.id}: descrição ausente`);
    assert.equal(/um item peculiar de utilidade questionável/i.test(entrada.conteudo.descricao), false, `${entrada.id}: descrição substituta`);
    assert.equal(/\u2014/.test(JSON.stringify(entrada)), false, `${entrada.id}: contém travessão`);
    assert.ok(precoValido(entrada.conteudo.preco), `${entrada.id}: preço inválido`);
    assert.ok(RARIDADES.has(normalizar(entrada.conteudo.raridade)), `${entrada.id}: raridade desconhecida`);
  }
});

test('promoções declaram preço anterior maior e na mesma moeda', () => {
  for (const entrada of catalogo.entradas.filter(item => item.conteudo.promocao?.ativa === true)) {
    const atual = lerPreco(entrada.conteudo.preco);
    const anterior = lerPreco(entrada.conteudo.preco_original);
    assert.ok(atual && anterior, `${entrada.id}: promoção sem preços válidos`);
    assert.equal(anterior.moeda, atual.moeda, `${entrada.id}: promoção muda a moeda`);
    assert.ok(anterior.valor > atual.valor, `${entrada.id}: preço promocional não é menor`);
    assert.ok(String(entrada.conteudo.promocao.rotulo ?? '').trim(), `${entrada.id}: promoção sem rótulo`);
  }
});

test('preços usam Lunaris para bens cotidianos e Solares para alto valor', () => {
  const precosCotidianos = new Map<string, number>([
    ['acessorio', 25],
    ['kit', 40],
    ['mochila', 8],
    ['mochilao', 18],
    ['algemas', 5],
    ['instrumento-musical', 12],
    ['pomada-restauradora', 10],
    ['kit-de-aventureiro', 20],
    ['lampiao', 6],
    ['odre', 2],
    ['racao-de-viagem', 1],
    ['saco-de-dormir', 4],
    ['traje', 15],
    ['traje-de-luxo', 60],
    ['algibeira', 1],
    ['pedra', 1],
  ]);
  const porId = new Map(catalogo.entradas.map(item => [item.id, item]));
  for (const [id, valor] of precosCotidianos) {
    const preco = lerPreco(porId.get(id)?.conteudo.preco);
    assert.deepEqual(preco, { moeda: 'Lunaris', valor }, `${id}: preço cotidiano divergente`);
  }

  const raridadesConvencionais = new Set(['comum', 'incomum', 'raro']);
  const convencionais = catalogo.entradas.filter(item => (
    (item.tipo === 'arma' || item.tipo === 'armadura')
      && raridadesConvencionais.has(normalizar(item.conteudo.raridade))
  ));
  for (const item of convencionais) {
    assert.equal(lerPreco(item.conteudo.preco)?.moeda, 'Lunaris', `${item.id}: bem convencional fora de Lunaris`);
  }

  const veiculos = catalogo.entradas.filter(item => item.tipo === 'veiculo' || item.tipo === 'veiculo-completo');
  for (const item of veiculos) {
    assert.equal(lerPreco(item.conteudo.preco)?.moeda, 'Lunaris', `${item.id}: veículo fora de Lunaris`);
  }

  for (const id of ['ampulheta-do-tempo', 'bazuca', 'arma-sniper-antimateria']) {
    assert.equal(lerPreco(porId.get(id)?.conteudo.preco)?.moeda, 'Solares', `${id}: item de alto valor fora de Solares`);
  }
});

test('armas publicam dano, modo e crítico mecanicamente coerentes', () => {
  const armas = catalogo.entradas.filter(item => item.tipo === 'arma');
  assert.ok(armas.length > 0);
  for (const arma of armas) {
    const { dano, modo, margem_ameaca: margem, multiplicador_critico: multiplicador, critico } = arma.conteudo;
    assert.ok(typeof dano === 'string' && /\d+d\d+/i.test(dano), `${arma.id}: dano ausente ou não rolável`);
    assert.ok(['corpo a corpo', 'a distancia', 'hibrida'].includes(normalizar(modo)), `${arma.id}: modo inválido`);
    assert.ok([18, 19, 20].includes(margem), `${arma.id}: margem de ameaça inválida`);
    assert.ok([2, 3, 4].includes(multiplicador), `${arma.id}: multiplicador crítico inválido`);
    if (margem < 20) assert.equal(multiplicador, 2, `${arma.id}: margem ampla exige x2`);
    if (multiplicador > 2) assert.equal(margem, 20, `${arma.id}: x3/x4 exige margem 20`);
    const esperado = `${margem === 20 ? '20' : `${margem}-20`}/x${multiplicador}`;
    assert.equal(normalizar(critico), esperado, `${arma.id}: texto de crítico divergente`);
  }
});

test('peças veiculares e veículos completos possuem ficha utilizável', () => {
  const pecas = catalogo.entradas.filter(item => item.tipo === 'veiculo');
  const completos = catalogo.entradas.filter(item => item.tipo === 'veiculo-completo');
  assert.ok(pecas.length > 0 && completos.length > 0);

  for (const peca of pecas) {
    assert.ok(String(peca.conteudo.sistema ?? '').trim(), `${peca.id}: sistema ausente`);
    assert.ok(String(peca.conteudo.subtipo ?? '').trim(), `${peca.id}: subtipo ausente`);
    assert.match(String(peca.conteudo.tier ?? ''), /^T[0-3]$/, `${peca.id}: tier não comercializável`);
  }

  const campos = [
    'Vida', 'Defesa', 'Resistência', 'deslocamento', 'Manobrabilidade', 'capacidade',
    'cobertura', 'tripulação mínima', 'sistemas ativos', 'espaços de base',
  ];
  for (const veiculo of completos) {
    for (const campo of campos) {
      assert.match(veiculo.conteudo.descricao, new RegExp(campo, 'i'), `${veiculo.id}: ${campo} ausente`);
    }
  }
});

test('criaturas comercializadas possuem ficha e listas estruturadas', () => {
  const monstros = catalogo.entradas.filter(item => item.tipo === 'monstro');
  assert.ok(monstros.length > 0);
  for (const monstro of monstros) {
    for (const campo of ['pv', 'nivel', 'vd', 'defesa', 'iniciativa']) {
      assert.ok(Number.isFinite(monstro.conteudo[campo]) && monstro.conteudo[campo] >= 0, `${monstro.id}: ${campo} inválido`);
    }
    assert.ok(String(monstro.conteudo.deslocamento ?? '').trim(), `${monstro.id}: deslocamento ausente`);
    assert.ok(monstro.conteudo.atributos && typeof monstro.conteudo.atributos === 'object', `${monstro.id}: atributos ausentes`);
    for (const campo of ['pericias', 'ataques', 'habilidades', 'loot']) {
      assert.ok(Array.isArray(monstro.conteudo[campo]), `${monstro.id}: ${campo} deve ser lista`);
    }
    assert.ok(monstro.conteudo.ataques.length > 0, `${monstro.id}: criatura sem ataque publicado`);
  }
});

test('itens especiais publicam marcadores para busca e filtros', () => {
  const especiais = catalogo.entradas.filter(item => [
    'consumivel', 'artefato', 'fruto-eden', 'implante', 'drop',
  ].includes(item.tipo));
  for (const item of especiais) {
    assert.ok(Array.isArray(item.conteudo.atributos) || item.tipo === 'drop', `${item.id}: atributos ausentes`);
    if (item.tipo !== 'drop') assert.ok(item.conteudo.atributos.length > 0, `${item.id}: marcadores vazios`);
  }
});

// Achado 11 da auditoria 2026-08: `aplicacao` validado como enum fechado (o
// mesmo que plataforma/core/content_seed.py exige pra sincronizar o catálogo)
// e `pre_requisitos`, quando presente, usa a mesma estrutura tipada de Legados
// — nunca um texto solto que nenhum código consegue validar.
const APLICACOES_VALIDAS = new Set(['armas', 'armaduras', 'escudos', 'itens gerais e magicos']);

const preRequisitoValido = (item: unknown): boolean => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const obj = item as Record<string, unknown>;
  if ('nivel_personagem' in obj) return typeof obj.nivel_personagem === 'number';
  if ('atributo' in obj) return typeof obj.atributo === 'string' && typeof obj.valor_minimo === 'number';
  if ('ou' in obj) return Array.isArray(obj.ou) && (obj.ou as unknown[]).every(preRequisitoValido);
  return false;
};

test('modificações declaram aplicacao dentro do enum e pre_requisitos tipados como Legados', () => {
  const modificacoes = catalogo.entradas.filter(item => item.tipo === 'modificacao');
  assert.ok(modificacoes.length > 0);
  let comPreRequisitoTipado = 0;
  for (const mod of modificacoes) {
    const aplicacaoNormalizada = normalizar(mod.conteudo.aplicacao);
    assert.ok(
      APLICACOES_VALIDAS.has(aplicacaoNormalizada),
      `${mod.id}: aplicacao ${JSON.stringify(mod.conteudo.aplicacao)} fora do enum`,
    );
    if (mod.conteudo.pre_requisito) {
      assert.ok(
        Array.isArray(mod.conteudo.pre_requisitos) && mod.conteudo.pre_requisitos.length > 0,
        `${mod.id}: tem pre_requisito em texto mas não tem pre_requisitos tipado`,
      );
      for (const requisito of mod.conteudo.pre_requisitos) {
        assert.ok(preRequisitoValido(requisito), `${mod.id}: pre_requisitos com formato inválido: ${JSON.stringify(requisito)}`);
      }
      comPreRequisitoTipado += 1;
    }
  }
  // As 15 modificações "marciais" com pré-requisito identificadas na auditoria.
  assert.equal(comPreRequisitoTipado, 15);
});
