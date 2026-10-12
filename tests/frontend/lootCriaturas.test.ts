import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

/**
 * Tabelas de loot do Bestiário (data/bestiario/loot-criaturas.json). Quem rola
 * é o servidor (plataforma/core/loot_criaturas.py); aqui fica a integridade
 * do arquivo contra o catálogo.
 */
const tabelas = JSON.parse(readFileSync(new URL('../../data/bestiario/loot-criaturas.json', import.meta.url), 'utf8')) as {
  criaturas: Record<string, {
    moedas: { dados: string; moeda: string; chance: number } | null;
    itens: Array<{ item: string; chance: number; quantidade: string }>;
  }>;
};
const catalogo = JSON.parse(readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8')) as {
  entradas: Array<{ tipo: string; id: string; titulo: string; conteudo: Record<string, any> }>;
};
const porId = new Map(catalogo.entradas.map((entrada) => [entrada.id, entrada]));
const monstros = catalogo.entradas.filter((entrada) => entrada.tipo === 'monstro');
const DADOS = /^\d{1,2}(d\d{1,3})?$/;

test('toda criatura do Bestiário tem tabela, e toda tabela é de uma criatura que existe', () => {
  const ids = new Set(Object.keys(tabelas.criaturas));
  for (const monstro of monstros) assert.ok(ids.has(monstro.id), `${monstro.id} sem tabela de loot`);
  for (const id of ids) assert.equal(porId.get(id)?.tipo, 'monstro', `${id}: tabela de uma criatura que não existe`);
});

test('cada linha aponta para um item do catálogo, com chance de 1 a 100 e quantidade em dados', () => {
  for (const [criatura, tabela] of Object.entries(tabelas.criaturas)) {
    assert.ok(tabela.itens.length > 0, `${criatura}: tabela vazia`);
    for (const linha of tabela.itens) {
      assert.ok(porId.has(linha.item), `${criatura}: ${linha.item} não existe no catálogo`);
      assert.ok(Number.isInteger(linha.chance) && linha.chance >= 1 && linha.chance <= 100, `${criatura}: chance ${linha.chance}`);
      assert.match(linha.quantidade, DADOS, `${criatura}: quantidade ${linha.quantidade}`);
      assert.notEqual(porId.get(linha.item)?.tipo, 'monstro', `${criatura}: loot não pode ser outra criatura`);
    }
    // Ao menos uma coisa sempre cai: saquear nunca volta de mãos vazias.
    assert.ok(tabela.itens.some((linha) => linha.chance === 100) || tabela.moedas?.chance === 100, `${criatura}: nada garantido`);
    if (tabela.moedas) {
      assert.match(tabela.moedas.dados, DADOS);
      assert.ok(['Lunaris', 'Solares'].includes(tabela.moedas.moeda));
      assert.ok(tabela.moedas.chance >= 1 && tabela.moedas.chance <= 100);
    }
  }
});

test('humanoides carregam moedas e bichos não carregam', () => {
  for (const monstro of monstros) {
    const tabela = tabelas.criaturas[monstro.id];
    if (monstro.conteudo.categoria === 'Humanoide') assert.ok(tabela.moedas, `${monstro.id}: humanoide sem bolsa`);
    if (monstro.conteudo.categoria === 'Animal') assert.equal(tabela.moedas, null, `${monstro.id}: bicho com moeda`);
  }
});

test('item exclusivo cai de uma criatura única só e não vende na Loja', () => {
  const usos = new Map<string, string[]>();
  for (const [criatura, tabela] of Object.entries(tabelas.criaturas)) {
    for (const linha of tabela.itens) usos.set(linha.item, [...(usos.get(linha.item) ?? []), criatura]);
  }
  const exclusivos = catalogo.entradas.filter((entrada) => entrada.conteudo.exclusivo === true);
  assert.ok(exclusivos.length >= 20);
  for (const item of exclusivos) {
    const donos = usos.get(item.id) ?? [];
    assert.equal(donos.length, 1, `${item.id} cai de ${donos.length} criaturas`);
    assert.equal(porId.get(donos[0])?.conteudo.unico, true, `${item.id}: criatura dona não é única`);
    assert.equal(item.conteudo.disponivelNaLoja, false, `${item.id}: exclusivo à venda`);
  }
});

test('toda parte de criatura nova (loot-*) cai de alguém', () => {
  const usados = new Set(Object.values(tabelas.criaturas).flatMap((tabela) => tabela.itens.map((linha) => linha.item)));
  for (const item of catalogo.entradas.filter((entrada) => entrada.id.startsWith('loot-'))) {
    assert.ok(usados.has(item.id), `${item.id} não cai de criatura nenhuma`);
    assert.equal(item.tipo, 'drop');
  }
});

test('o texto das partes novas segue o tom da mesa', () => {
  for (const item of catalogo.entradas.filter((entrada) => entrada.id.startsWith('loot-'))) {
    const texto = JSON.stringify(item);
    assert.doesNotMatch(texto, /[—–]/, `${item.id} tem travessão`);
    assert.doesNotMatch(texto, /\beco\b/i, `${item.id} usa a palavra eco`);
  }
});

const RARIDADE_ALTA = ['raro', 'epico', 'lendario'];
const TETO_DE_CHANCE: Record<string, number> = { raro: 40, epico: 30, lendario: 30 };
const linhasDeEquipamento = Object.entries(tabelas.criaturas).flatMap(([criatura, tabela]) =>
  tabela.itens
    .map((linha) => ({ criatura, linha, item: porId.get(linha.item)! }))
    .filter(({ item }) => item.tipo !== 'drop'),
);

test('a mesma linha não aparece duas vezes na tabela de uma criatura', () => {
  for (const [criatura, tabela] of Object.entries(tabelas.criaturas)) {
    const ids = tabela.itens.map((linha) => linha.item);
    assert.equal(new Set(ids).size, ids.length, `${criatura} repete um item`);
  }
});

test('equipamento raro ou melhor só cai de criatura à altura e com chance de tesouro, não de rotina', () => {
  for (const { criatura, linha, item } of linhasDeEquipamento) {
    const raridade = String(item.conteudo.raridade);
    if (!RARIDADE_ALTA.includes(raridade)) continue;
    const vd = Number(porId.get(criatura)!.conteudo.vd);
    assert.ok(vd >= 13, `${criatura} (VD ${vd}) deixa ${item.id} (${raridade})`);
    assert.ok(linha.chance <= TETO_DE_CHANCE[raridade], `${criatura}: ${item.id} com ${linha.chance}% passa do teto de ${raridade}`);
  }
});

test('Relíquia da Criação, item Mítico e Fruto do Éden não caem de criatura nenhuma', () => {
  for (const { criatura, item } of linhasDeEquipamento) {
    assert.ok(!['fruto-eden', 'veiculo', 'veiculo-completo', 'propriedade'].includes(item.tipo), `${criatura}: ${item.id} (${item.tipo})`);
    assert.ok(!['mitico', 'reliquia da criacao', 'reliquia'].includes(String(item.conteudo.raridade)), `${criatura}: ${item.id} é peça de Mestre`);
  }
});

test('o saque inclui artefatos, armas, armaduras, modificações e implantes, não só material', () => {
  const distintos = (tipo: string) => new Set(linhasDeEquipamento.filter(({ item }) => item.tipo === tipo).map(({ item }) => item.id)).size;
  assert.ok(distintos('artefato') >= 12, 'poucos artefatos no saque');
  assert.ok(distintos('arma') >= 20, 'poucas armas no saque');
  assert.ok(distintos('armadura') >= 15, 'poucas armaduras no saque');
  assert.ok(distintos('modificacao') >= 8, 'poucas modificações no saque');
  assert.ok(distintos('implante') >= 2, 'poucos implantes no saque');
});

test('nenhum arquivo do site importa a tabela de loot', () => {
  const pendentes = ['src'];
  while (pendentes.length) {
    const pasta = pendentes.pop()!;
    for (const nome of readdirSync(pasta)) {
      const caminho = join(pasta, nome);
      if (statSync(caminho).isDirectory()) pendentes.push(caminho);
      else if (/\.(ts|tsx)$/.test(nome)) {
        assert.doesNotMatch(readFileSync(caminho, 'utf8'), /loot-criaturas/, `${caminho} importa a tabela de loot`);
      }
    }
  }
});
