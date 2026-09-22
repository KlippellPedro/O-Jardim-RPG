import assert from 'node:assert/strict';
import test from 'node:test';
import catalogo from '../../data/loja/catalogo.json' with { type: 'json' };
import { ehReliquiaCriacao, lerRessonanciaReliquia } from '../../src/services/reliquiasCriacaoService';
import { itemCorrespondeCategoria, mapearCatalogoLoja, rotuloCategoriaItem, rotuloSubtipoItem } from '../../src/services/lojaCatalogService';

type Entrada = { tipo?: string; id?: string; titulo?: string; conteudo?: Record<string, unknown> };

const entradas = (catalogo as { entradas: Entrada[] }).entradas;
const reliquias = entradas.filter((entrada) => entrada.conteudo?.natureza === 'reliquia-criacao');
const armas = reliquias.filter((entrada) => entrada.tipo === 'arma');
const artefatos = reliquias.filter((entrada) => entrada.tipo === 'artefato');

test('as Relíquias da Criação cobrem armas, artefatos e os demais tipos do catálogo', () => {
  assert.equal(reliquias.length, 66, 'o catálogo ganhou ou perdeu Relíquias da Criação');
  assert.equal(armas.length, 17);
  assert.equal(artefatos.length, 16);
  const tipos = new Set(reliquias.map((entrada) => entrada.tipo));
  for (const tipo of ['implante', 'armadura', 'propriedade', 'veiculo-completo', 'consumivel']) {
    assert.ok(tipos.has(tipo), `nenhuma Relíquia da Criação do tipo ${tipo}`);
  }
  assert.ok(
    reliquias.some((entrada) => entrada.tipo === 'armadura' && entrada.conteudo?.categoria_protecao === 'escudo'),
    'nenhuma Relíquia da Criação é escudo',
  );
  const distantes = armas.filter((entrada) => ['À distância', 'Híbrida'].includes(String(entrada.conteudo?.modo)));
  assert.ok(distantes.length >= 8, 'as Relíquias voltaram a ser quase só corpo a corpo');
  for (const entrada of reliquias) {
    assert.equal(entrada.conteudo?.raridade, 'reliquia da criacao', `${entrada.titulo}: raridade fora do lugar`);
    assert.equal(entrada.conteudo?.requer_autorizacao_mestre, true, `${entrada.titulo}: liberou sem o Mestre`);
  }
});

test('nenhuma Relíquia carrega Manifestação de Princípio', () => {
  for (const entrada of reliquias) {
    const conteudo = entrada.conteudo || {};
    assert.equal(conteudo.manifestacao, undefined, `${entrada.titulo}: a Manifestação voltou ao catálogo`);
    const etiquetas = (conteudo.atributos as string[]) || [];
    assert.ok(
      !etiquetas.includes('Manifestação de Princípio'),
      `${entrada.titulo}: a vitrine ainda anuncia Manifestação de Princípio`,
    );
    assert.doesNotMatch(
      JSON.stringify(conteudo),
      /Manifestação de Princípio|DT da Relíquia/,
      `${entrada.titulo}: sobrou texto da Manifestação`,
    );
  }
});

test('Relíquia aparece na prateleira dela e também no filtro do tipo a que pertence', () => {
  const itens = mapearCatalogoLoja(entradas.map((entrada) => {
    const [moeda, valor] = Object.entries((entrada.conteudo?.preco as Record<string, number>) ?? { Solares: 0 })[0];
    return { ...entrada, preco: { moeda, valor } };
  }) as never);
  const porId = new Map(itens.map((item) => [item.id, item]));
  const esperado: Record<string, string> = {
    'reliquia-excalibur': 'Armas',
    'reliquia-olho-odin': 'Implantes Cibernéticos',
    'reliquia-pele-nemeia': 'Armaduras',
    'reliquia-escudo-svalinn': 'Escudos',
    'reliquia-ilha-avalon': 'Bens',
    'reliquia-nau-argo': 'Bens',
    'reliquia-ambrosia': 'Consumíveis',
    'reliquia-talaria': 'Artefatos Mágicos',
    'reliquia-armadura-aquiles': 'Armaduras',
    'reliquia-escudo-ajax': 'Escudos',
    'reliquia-pernas-talos': 'Implantes Cibernéticos',
    'reliquia-jardim-hesperides': 'Bens',
    'reliquia-vimana': 'Bens',
    'reliquia-bigorna-hefesto': 'Artefatos Mágicos',
  };
  for (const [id, categoria] of Object.entries(esperado)) {
    const item = porId.get(id);
    assert.ok(item, `${id}: fora do mapeamento da Loja`);
    assert.equal(item.categoria, 'Relíquias da Criação', `${id}: perdeu a prateleira de Relíquias`);
    assert.ok(itemCorrespondeCategoria(item, 'Relíquias da Criação'), `${id}: sumiu do filtro de Relíquias`);
    assert.ok(itemCorrespondeCategoria(item, categoria as never), `${id}: não aparece no filtro ${categoria}`);
    assert.ok(itemCorrespondeCategoria(item, 'Todos'));
  }
  const excalibur = porId.get('reliquia-excalibur')!;
  assert.equal(itemCorrespondeCategoria(excalibur, 'Implantes Cibernéticos'), false, 'arma vazou para o filtro de implantes');
  const mundano = itens.find((item) => item.categoria === 'Armas')!;
  assert.equal(itemCorrespondeCategoria(mundano, 'Relíquias da Criação'), false);
});

test('a vitrine da Relíquia não repete a mesma etiqueta três vezes', () => {
  const itens = mapearCatalogoLoja(entradas.map((entrada) => {
    const [moeda, valor] = Object.entries((entrada.conteudo?.preco as Record<string, number>) ?? { Solares: 0 })[0];
    return { ...entrada, preco: { moeda, valor } };
  }) as never);
  const porId = new Map(itens.map((item) => [item.id, item]));

  // A raridade já anuncia "Relíquia da Criação": a categoria tem que dizer o que
  // a peça é, e o subtipo interno não vira uma terceira etiqueta igual.
  const tipoEsperado: Record<string, string> = {
    'reliquia-excalibur': 'Armas',
    'reliquia-armadura-aquiles': 'Armaduras',
    'reliquia-escudo-ajax': 'Escudos',
    'reliquia-pernas-talos': 'Implantes Cibernéticos',
    'reliquia-vimana': 'Bens',
    'reliquia-cornucopia': 'Artefatos Mágicos',
    'reliquia-ambrosia': 'Consumíveis',
  };
  for (const [id, tipo] of Object.entries(tipoEsperado)) {
    const item = porId.get(id)!;
    assert.ok(item, `${id}: fora do mapeamento da Loja`);
    assert.equal(item.raridade, 'Relíquia da Criação', `${id}: perdeu a raridade de relíquia`);
    assert.equal(rotuloCategoriaItem(item), tipo, `${id}: a etiqueta de categoria não diz o tipo da peça`);
  }

  for (const entrada of reliquias) {
    const item = porId.get(entrada.id!);
    if (!item) continue;
    assert.notEqual(
      rotuloCategoriaItem(item),
      'Relíquias da Criação',
      `${entrada.titulo}: categoria repete o que a raridade já diz`,
    );
    const subtipo = rotuloSubtipoItem(item);
    assert.ok(
      subtipo === null || !/reliquia[- ]criacao/i.test(subtipo.normalize('NFD').replace(/[̀-ͯ]/g, '')),
      `${entrada.titulo}: subtipo vira uma terceira etiqueta dizendo relíquia`,
    );
  }

  // Item comum não muda: a categoria dele continua sendo a prateleira dele.
  const mundano = itens.find((item) => item.id === 'escamas')!;
  assert.equal(rotuloCategoriaItem(mundano), 'Armaduras');
  assert.equal(rotuloSubtipoItem(mundano), 'simples');
});

test('arma tem Ressonância escrita e artefato tem a própria habilidade', () => {
  for (const entrada of armas) {
    const ressonancia = lerRessonanciaReliquia(entrada.conteudo);
    assert.ok(ressonancia, `${entrada.titulo}: arma relíquia sem Ressonância`);
    assert.ok(ressonancia.efeito.length > 40, `${entrada.titulo}: Ressonância sem regra utilizável`);
    const atributos = (entrada.conteudo?.atributos as string[]) || [];
    assert.match(atributos[0], /de dano$/, `${entrada.titulo}: a ficha de combate sumiu da vitrine`);
  }
  for (const entrada of artefatos) {
    assert.equal(lerRessonanciaReliquia(entrada.conteudo), null, `${entrada.titulo}: artefato não usa Ressonância`);
    const conteudo = entrada.conteudo || {};
    assert.ok(String(conteudo.descricao || '').length > 120, `${entrada.titulo}: artefato ficou sem habilidade escrita`);
    assert.ok(conteudo.ativacao, `${entrada.titulo}: artefato sem ativação declarada`);
    assert.ok(conteudo.frequencia, `${entrada.titulo}: artefato sem frequência declarada`);
  }
});

test('o texto de vitrine das Relíquias sai limpo para o jogador', () => {
  for (const entrada of reliquias) {
    const conteudo = entrada.conteudo || {};
    const lore = String(conteudo.lore || '');
    const descricao = String(conteudo.descricao || '');
    assert.ok(lore.length > 80, `${entrada.titulo}: sem lore de mesa`);
    assert.ok(descricao.length > 30, `${entrada.titulo}: sem descrição de vitrine`);
    assert.doesNotMatch(`${lore} ${descricao}`, /—/, `${entrada.titulo}: travessão no texto do jogador`);
  }
});

test('Fruto do Éden não é confundido com Relíquia da Criação', () => {
  const fruto = entradas.find((entrada) => entrada.tipo === 'fruto-eden');
  assert.ok(fruto, 'catálogo sem Frutos do Éden');
  assert.equal(ehReliquiaCriacao({ ...fruto.conteudo, tipo: 'fruto-eden' }), false);
  assert.equal(ehReliquiaCriacao(armas[0].conteudo), true);
});
