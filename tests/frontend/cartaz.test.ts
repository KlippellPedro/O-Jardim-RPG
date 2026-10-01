import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcularRecompensa, molduraDoCartaz } from '../../src/pages/Ficha/utils/cartaz';
import { ESCADA_MOLDURAS } from '../../src/pages/Ficha/utils/retrato';

test('recompensa sobe com o nivel e com a fama', () => {
  assert.equal(calcularRecompensa(1, 0), 300);
  assert.equal(calcularRecompensa(1, 4), 500);
  assert.ok(calcularRecompensa(10, 2) > calcularRecompensa(10, 1));
});

test('recompensa fica na escala do Jardim', () => {
  assert.ok(calcularRecompensa(10, 0) < 3000);
  assert.ok(calcularRecompensa(20, 0) < 15000);
  assert.ok(calcularRecompensa(22, 0) < 30000);
});

test('recompensa até o 60 não mudou e depois cresce em linha reta, sem explodir', () => {
  // Até o 60 vale a conta de sempre: 300 x 1,22^(nível - 1), Fama somando 15% cada.
  for (const nivel of [1, 10, 20, 40, 60]) {
    assert.equal(calcularRecompensa(nivel, 2), Math.round((300 * 1.22 ** (nivel - 1) * 1.3) / 50) * 50, `nível ${nivel}`);
  }
  const no60 = calcularRecompensa(60, 0);
  assert.equal(no60, Math.round(300 * 1.22 ** 59 / 50) * 50);
  // 10% do valor do 60 a cada nível a mais: o 100 vale 5 vezes o 60.
  assert.equal(calcularRecompensa(100, 0), Math.round((300 * 1.22 ** 59 * 5) / 50) * 50);
  let anterior = calcularRecompensa(60, 0);
  for (const nivel of [61, 80, 100, 150, 250, 500, 1000, 1450]) {
    const valor = calcularRecompensa(nivel, 0);
    assert.ok(Number.isFinite(valor) && valor > anterior, `nível ${nivel}`);
    anterior = valor;
  }
  assert.ok(calcularRecompensa(1450, 5) < 1e11, 'mesmo no teto de 29 classes o cartaz fica em dezenas de bilhões, não em notação científica');
});

test('recompensa ignora valores invalidos', () => {
  assert.equal(calcularRecompensa(Number.NaN, 99), calcularRecompensa(1, 5));
  assert.equal(calcularRecompensa(-3, -2), 300);
});

test('moldura do cartaz segue a mesma escada do retrato, a cada 5 niveis', () => {
  const chaves = [1, 4, 5, 9, 10, 14, 15, 19, 20, 60, 64].map((nivel) => molduraDoCartaz(nivel).chave);
  assert.deepEqual(chaves, [
    'comum', 'comum', 'bronze', 'bronze', 'prata', 'prata', 'ouro', 'ouro', 'esmeralda', 'lenda', 'lenda',
  ]);
});

test('o cartaz também troca de moldura a cada 5 níveis depois do 60', () => {
  const chaves = [64, 65, 99, 100, 150, 250, 500].map((nivel) => molduraDoCartaz(nivel).chave);
  assert.deepEqual(chaves, ['lenda', 'topazio', 'alexandrita', 'mitico', 'cosmico', 'eterno', 'absoluto']);
});

test('moldura do cartaz e do retrato batem para o mesmo nivel', () => {
  assert.equal(molduraDoCartaz(20).rotulo, 'Esmeralda');
  assert.equal(molduraDoCartaz(1).rotulo, null);
});

test('o cartaz monta a moldura pelos dados, sem uma regra de CSS por grau', () => {
  // As cores chegam por variáveis inline e as classes genéricas precisam estar
  // escritas por inteiro no código (senão o Tailwind descarta a regra do CSS).
  const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
  const componente = readFileSync(new URL('../../src/pages/Ficha/components/PersonagemWantedCard.tsx', import.meta.url), 'utf8');
  for (const classe of ['wanted-poster--moldura', 'wanted-poster--grossa', 'wanted-poster--aros-1', 'wanted-poster--aros-2', 'wanted-poster--pulsa']) {
    assert.ok(css.includes(`.${classe}`), `sem regra de CSS para ${classe}`);
    assert.ok(componente.includes(classe), `${classe} não aparece no componente`);
  }
  assert.ok(componente.includes('--cartaz-fio') && componente.includes('--cartaz-brilho') && componente.includes('--cartaz-estilo'));
  assert.ok(ESCADA_MOLDURAS.length > 100);
});
