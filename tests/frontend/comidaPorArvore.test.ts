import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Comida por Árvore (proposta aprovada em docs/propostas/comida-por-arvore.md).
 * Quase nenhum Galho é habitado: Gênese cozinha, as outras Árvores entram como
 * ingrediente. A procedência aparece no card como "Origem: ...".
 */
const catalogo = JSON.parse(readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8')) as {
  entradas: Array<{ tipo: string; id: string; titulo: string; conteudo: Record<string, any> }>;
};
const comidas = catalogo.entradas.filter((entrada) => (
  Array.isArray(entrada.conteudo.atributos)
  && entrada.conteudo.atributos.some((atributo: unknown) => String(atributo).startsWith('Origem:'))
));
const origem = (entrada: (typeof comidas)[number]) => String(entrada.conteudo.atributos.find((atributo: unknown) => String(atributo).startsWith('Origem:')));

test('as 25 comidas e bebidas por Árvore estão no catálogo', () => {
  assert.equal(comidas.length, 25);
  for (const item of comidas) {
    assert.equal(item.tipo, 'consumivel', item.id);
    assert.ok(['comida', 'bebida'].includes(item.conteudo.subtipo), item.id);
    assert.ok(item.conteudo.preco?.Lunaris > 0, `${item.id} sem preço em Lunaris`);
    assert.ok(item.conteudo.efeito, `${item.id} sem efeito`);
    assert.ok(item.conteudo.acumulo, `${item.id} sem regra de acúmulo`);
  }
});

test('toda Árvore aparece, e Gênese é quem mais cozinha', () => {
  const arvores = ['Gênese', 'Nadalon', 'Alétheia', 'A.X.I.S', 'Anima', 'Vórtice', 'Baluarte', 'Matriz', 'Éon', 'Limiar', 'O Vazio'];
  for (const arvore of arvores) {
    assert.ok(comidas.some((item) => origem(item).includes(arvore)), `nenhuma comida de ${arvore}`);
  }
  assert.ok(comidas.filter((item) => origem(item).includes('Gênese') || origem(item).includes('Nadalon')).length >= 8);
});

test('o texto segue o tom da mesa', () => {
  for (const item of comidas) {
    const texto = JSON.stringify(item);
    assert.doesNotMatch(texto, /[—–]/, `${item.id} tem travessão`);
    assert.doesNotMatch(texto, /\beco\b/i, `${item.id} usa a palavra eco`);
  }
});
