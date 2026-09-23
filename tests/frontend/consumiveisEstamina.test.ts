import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type Entrada = { tipo: string; id: string; titulo: string; conteudo: Record<string, any> };
const catalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
) as { entradas: Entrada[] };
const item = (id: string) => {
  const achado = catalogo.entradas.find((entrada) => entrada.id === id);
  assert.ok(achado, `${id}: ausente do catálogo`);
  return achado;
};

const DEGRAUS = ['infima', 'menor', 'maior', 'suprema', 'absoluta'];

test('a Poção de Vigor tem os mesmos cinco degraus, preços e níveis da Poção de Mana', () => {
  for (const degrau of DEGRAUS) {
    const mana = item(`pocao-mana-${degrau}`).conteudo;
    const vigor = item(`pocao-vigor-${degrau}`).conteudo;
    assert.equal(vigor.raridade, mana.raridade, degrau);
    assert.equal(vigor.nivelMinimoLoja, mana.nivelMinimoLoja, degrau);
    assert.equal(vigor.espacos, 1);
    assert.equal(vigor.consumivel, true);
    assert.deepEqual(Object.keys(vigor.preco), Object.keys(mana.preco), `${degrau}: moeda diferente`);
    const dado = String(mana.descricao).match(/Restaura (\d+d\d+\+\d+|toda)/)?.[1];
    assert.ok(dado, `${degrau}: a Poção de Mana perdeu o padrão de texto`);
    assert.ok(vigor.descricao.includes(`Restaura ${dado}`), `${degrau}: a dose de Estamina difere da de Mana`);
    assert.match(vigor.descricao, /Estamina/);
    assert.ok(!/Mana/.test(vigor.descricao), `${degrau}: cita Mana`);
  }
});

test('o degrau maior de cada poção custa mais que o menor, na mesma escada da Mana', () => {
  const emLunaris = (id: string) => {
    const preco = item(id).conteudo.preco as Record<string, number>;
    return preco.Lunaris ?? (preco.Solares ?? 0) * 1000;
  };
  const valores = DEGRAUS.map((degrau) => emLunaris(`pocao-vigor-${degrau}`));
  assert.deepEqual([...valores].sort((a, b) => a - b), valores);
});

test('o Elixir de Vigor espelha o Elixir de Mana: 2d6 pelo mesmo preço e nível', () => {
  const mana = item('consumivel-elixir-mana').conteudo;
  const vigor = item('consumivel-elixir-vigor').conteudo;
  assert.deepEqual(vigor.preco, mana.preco);
  assert.equal(vigor.nivelMinimoLoja, mana.nivelMinimoLoja);
  assert.equal(vigor.efeito, 'Recupera 2d6 de Estamina');
  assert.equal(vigor.consumivel, true);
});

test('itens que devolviam Vida e Mana agora também devolvem Estamina', () => {
  assert.match(item('reliquia-ambrosia').conteudo.efeito, /Vida, Mana e Estamina/);
  assert.match(item('reliquia-ambrosia').conteudo.descricao, /toda a Estamina/);
  assert.match(item('reliquia-calice-graal').conteudo.efeito, /Vida, Mana e Estamina/);
  assert.match(item('reliquia-calice-graal').conteudo.descricao, /toda a Estamina/);
  assert.match(item('reliquia-jardim-hesperides').conteudo.descricao, /Vida, Mana e Estamina em dobro/);
  assert.match(item('elixir-do-equilibrio').conteudo.descricao, /entre Mana e Estamina/);
  assert.match(item('veiculo-util-jardim-t2').conteudo.descricao, /Mana e à Estamina recuperadas/);
  assert.match(item('veiculo-util-jardim-t3').conteudo.descricao, /Mana e à Estamina recuperadas/);
});

test('o Elixir do Equilíbrio não ficou mais forte: a dose total de recurso é a mesma de antes', () => {
  const descricao = item('elixir-do-equilibrio').conteudo.descricao as string;
  assert.equal([...descricao.matchAll(/4d6/g)].length, 2, 'duas doses de 4d6, uma de Vida e uma dividida');
});

test('os itens novos não usam travessão', () => {
  const novos = catalogo.entradas.filter((entrada) => entrada.id.startsWith('pocao-vigor-') || entrada.id === 'consumivel-elixir-vigor');
  assert.equal(novos.length, 6);
  for (const entrada of novos) assert.ok(!JSON.stringify(entrada).includes('\u2014'), entrada.id);
});
