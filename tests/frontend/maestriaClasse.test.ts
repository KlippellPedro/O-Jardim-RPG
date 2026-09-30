import assert from 'node:assert/strict';
import test from 'node:test';
import maestriaData from '../../data/ficha/maestria-classe.json';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../src/services/catalogoService';
import { calcularDerivadosComClasses } from '../../src/services/calculoService';
import {
  MARCOS_MAESTRIA,
  descreverMarcoMaestria,
  grausDeMaestria,
  marcosMaestriaAte,
  marcosMaestriaEntre,
  niveisDeReforcoDeRecursos,
  proximoMarcoMaestria,
} from '../../src/services/maestriaClasse';
import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE } from '../../src/services/progressaoNiveis';
import {
  falaClasseAcimaDoConteudo,
  ganhosDoNivelTotal,
  recompensasDeMaestria,
} from '../../src/pages/Ficha/components/subidaNivel';

// Os mesmos valores estão em plataforma/tests/test_maestria_classe.py.
const GRAUS_ESPERADOS: Array<[number, number]> = [[1, 0], [20, 0], [24, 0], [29, 0], [30, 1], [39, 1], [40, 2], [49, 2], [50, 3], [60, 3]];
const REFORCO_ESPERADO: Array<[number, number]> = [[1, 0], [24, 0], [25, 2], [34, 2], [35, 4], [44, 4], [45, 6], [50, 6], [80, 6]];

test('a Maestria fica entre o fim do conteúdo escrito e o teto da classe, de 5 em 5', () => {
  assert.equal(MARCOS_MAESTRIA.length, maestriaData.marcos.length);
  for (const marco of MARCOS_MAESTRIA) {
    assert.ok(marco.nivel > NIVEL_CONTEUDO_CLASSE && marco.nivel <= NIVEL_MAXIMO_CLASSE, `nível ${marco.nivel} fora do 21 ao teto`);
    assert.equal(marco.nivel % 5, 0, `nível ${marco.nivel} não é múltiplo de 5`);
  }
  assert.deepEqual(MARCOS_MAESTRIA.map((marco) => marco.nivel), [25, 30, 35, 40, 45, 50]);
  assert.equal(new Set(MARCOS_MAESTRIA.map((marco) => marco.nivel)).size, MARCOS_MAESTRIA.length);
});

test('graus de perícia e reforço de recursos por nível da classe', () => {
  for (const [nivel, graus] of GRAUS_ESPERADOS) assert.equal(grausDeMaestria(nivel), graus, `graus no nível ${nivel}`);
  for (const [nivel, niveis] of REFORCO_ESPERADO) assert.equal(niveisDeReforcoDeRecursos(nivel), niveis, `reforço no nível ${nivel}`);
});

test('marcos alcançados, ganhos entre dois níveis e próximo marco', () => {
  assert.deepEqual(marcosMaestriaAte(24).map((marco) => marco.nivel), []);
  assert.deepEqual(marcosMaestriaAte(35).map((marco) => marco.nivel), [25, 30, 35]);
  assert.deepEqual(marcosMaestriaEntre(24, 25).map((marco) => marco.nivel), [25]);
  assert.deepEqual(marcosMaestriaEntre(25, 26), []);
  assert.equal(marcosMaestriaEntre(20, 50).length, 6);
  assert.equal(proximoMarcoMaestria(20)?.nivel, 25);
  assert.equal(proximoMarcoMaestria(25)?.nivel, 30);
  assert.equal(proximoMarcoMaestria(50), null);
});

test('nível de classe inválido não quebra a Maestria', () => {
  assert.equal(grausDeMaestria('abc'), 0);
  assert.equal(niveisDeReforcoDeRecursos(undefined), 0);
  assert.deepEqual(marcosMaestriaAte(-5), []);
});

test('descrição curta de cada tipo de marco', () => {
  assert.equal(descreverMarcoMaestria(MARCOS_MAESTRIA[1]), 'Grau de perícia');
  assert.match(descreverMarcoMaestria(MARCOS_MAESTRIA[0]), /Reforço de recursos \(\+2 níveis/);
});

test('o reforço de recursos soma 2 níveis do perfil da própria classe, sem tocar nos níveis comuns', () => {
  const humano = RACAS_CATALOGO.find((raca) => raca.id === 'humano')!;
  const guerreiro = CLASSES_CATALOGO.find((classe) => classe.id === 'guerreiro')!;
  const atributos = { forca: 14, destreza: 12, constituicao: 12, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10 };
  const derivados = (nivel: number) => calcularDerivadosComClasses(
    atributos, humano, [{ classeId: 'guerreiro', nivel }], CLASSES_CATALOGO, nivel, {},
  );
  const ganho = (de: number, para: number) => ({
    vida: derivados(para).vida - derivados(de).vida,
    mana: derivados(para).mana - derivados(de).mana,
    estamina: derivados(para).estamina - derivados(de).estamina,
  });
  const vida = Number(guerreiro.vida);
  const mana = Math.max(1, Number(guerreiro.mana));
  const estamina = Math.max(0, Number(guerreiro.estamina) || 0);
  // Nível comum: 1 nível do perfil da classe.
  assert.deepEqual(ganho(22, 23), { vida, mana, estamina });
  assert.deepEqual(ganho(25, 26), { vida, mana, estamina });
  // Nível 25: o nível em si mais o reforço equivalente a 2 níveis.
  assert.deepEqual(ganho(24, 25), { vida: 3 * vida, mana: 3 * mana, estamina: 3 * estamina });
  assert.deepEqual(ganho(34, 35), { vida: 3 * vida, mana: 3 * mana, estamina: 3 * estamina });
  // Nível 30 dá grau de perícia, não recursos.
  assert.deepEqual(ganho(29, 30), { vida, mana, estamina });
});

test('painel de subida: Maestria e ganhos do nível total', () => {
  assert.deepEqual(recompensasDeMaestria(24, 25).map((item) => [item.rotulo, item.texto, item.fala]), [
    ['Maestria', 'Reforço de recursos', 'Maestria: reforço de recursos'],
  ]);
  assert.deepEqual(recompensasDeMaestria(29, 30).map((item) => item.fala), ['Mais um grau de perícia']);
  assert.deepEqual(recompensasDeMaestria(25, 26), []);
  assert.equal(falaClasseAcimaDoConteudo(35), 'Classe no nível 35');

  const falas = (antes: number, depois: number) => ganhosDoNivelTotal(antes, depois).map((item) => item.fala);
  assert.deepEqual(falas(4, 5), ['Mais um Legado']);
  assert.deepEqual(falas(7, 8), ['Mais um aumento de atributo', 'Mais uma vaga de item especial']);
  assert.deepEqual(falas(49, 50), ['Mais um Legado']);
  assert.deepEqual(falas(57, 58), ['Mais um aumento de atributo', 'Mais uma vaga de item especial']);
  assert.deepEqual(falas(59, 60), ['Mais um Legado']);
  assert.deepEqual(falas(60, 61), []);
});
