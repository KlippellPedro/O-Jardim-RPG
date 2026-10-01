import assert from 'node:assert/strict';
import test from 'node:test';
import { DEGRAUS_CLASSE, degrauDaClasse } from '../../src/pages/Ficha/utils/degrauClasse';
import { MARCOS_MAESTRIA } from '../../src/services/maestriaClasse';
import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE, limitarNivelClasse } from '../../src/services/progressaoNiveis';

test('o card da classe é comum até o 20 e ganha um degrau novo no 21', () => {
  assert.deepEqual([1, 10, 19, 20].map((nivel) => degrauDaClasse(nivel).chave), ['comum', 'comum', 'comum', 'comum']);
  assert.equal(degrauDaClasse(20).rotulo, null);
  assert.equal(degrauDaClasse(NIVEL_CONTEUDO_CLASSE + 1).chave, 'veterano');
  assert.equal(degrauDaClasse(24).chave, 'veterano');
});

test('cada marco de Maestria abre um degrau, até o teto da classe', () => {
  assert.deepEqual(
    [25, 29, 30, 35, 40, 45, 49, 50].map((nivel) => degrauDaClasse(nivel).chave),
    ['especialista', 'especialista', 'mestre', 'grao-mestre', 'paragao', 'epitome', 'epitome', 'apoteose'],
  );
  assert.equal(DEGRAUS_CLASSE.length, 8);
  assert.equal(DEGRAUS_CLASSE.at(-1)!.nivelMinimo, NIVEL_MAXIMO_CLASSE);
  assert.deepEqual(
    DEGRAUS_CLASSE.slice(2).map((degrau) => degrau.nivelMinimo),
    MARCOS_MAESTRIA.map((marco) => marco.nivel),
    'os degraus a partir do 25 têm que seguir os marcos de Maestria',
  );
});

test('degraus têm nome único, sobem em ordem e entradas estranhas valem o comum', () => {
  assert.equal(new Set(DEGRAUS_CLASSE.map((degrau) => degrau.chave)).size, DEGRAUS_CLASSE.length);
  assert.equal(new Set(DEGRAUS_CLASSE.map((degrau) => degrau.rotulo)).size, DEGRAUS_CLASSE.length);
  DEGRAUS_CLASSE.slice(1).forEach((degrau, indice) => assert.ok(degrau.nivelMinimo > DEGRAUS_CLASSE[indice].nivelMinimo));
  assert.deepEqual([degrauDaClasse(Number.NaN).degrau, degrauDaClasse(undefined).degrau, degrauDaClasse(-5).degrau], [0, 0, 0]);
  assert.equal(degrauDaClasse(500).chave, 'apoteose');
  assert.equal(degrauDaClasse(37).degrau, 4);
});

test('uma classe nunca passa do teto de 50, mas ficha antiga acima dele ainda pode descer', () => {
  assert.equal(NIVEL_MAXIMO_CLASSE, 50);
  assert.equal(limitarNivelClasse(30, 20), 30);
  assert.equal(limitarNivelClasse(50, 49), 50);
  assert.equal(limitarNivelClasse(51, 50), 50);
  assert.equal(limitarNivelClasse(999, 20), 50);
  assert.equal(limitarNivelClasse(0, 20), 1);
  assert.equal(limitarNivelClasse(Number.NaN, 20), 1);
  // Ficha antiga que já estava no 70: pode reduzir e fica onde está, sem subir.
  assert.equal(limitarNivelClasse(60, 70), 60);
  assert.equal(limitarNivelClasse(90, 70), 70);
});
