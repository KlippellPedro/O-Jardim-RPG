import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_DADOS_LOCAIS, cenaDeDadosLocais, extrairCena } from '../../src/components/dados/rolagemDados';
import { MAX_DADOS_3D } from '../../src/components/dados/cenaDados';
import type { IRegistro } from '../../src/services/registrosApi';

const sete = [20, 17, 15, 12, 9, 6, 3];

test('os sete atributos viram uma cena de sete d20 sem soma', () => {
  const cena = cenaDeDadosLocais({ titulo: 'Atributos do personagem', valores: sete, formula: '7d20' });
  assert.ok(cena);
  assert.equal(cena.dados.length, 7);
  assert.deepEqual(cena.dados.map((dado) => dado.valor), sete);
  assert.ok(cena.dados.every((dado) => dado.faces === 20 && !dado.ignorado));
  assert.equal(cena.total, null);
  assert.deepEqual(cena.lista, sete);
  assert.equal(cena.formula, '7d20');
  assert.equal(cena.destaque, null, 'nem 20 nem 1 acendem a cena: cada dado é um atributo, não um teste');
});

test('a lista da cena é uma cópia: mexer nela não muda o que foi sorteado', () => {
  const valores = [5, 6, 7];
  const cena = cenaDeDadosLocais({ titulo: 'x', valores });
  assert.ok(cena?.lista);
  cena.lista.push(99);
  assert.deepEqual(valores, [5, 6, 7]);
});

test('sem dados, com dados demais, face sem modelo ou valor impossível não há cena', () => {
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: [] }), null);
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: Array.from({ length: MAX_DADOS_LOCAIS + 1 }, () => 5) }), null);
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: [5], faces: 7 }), null);
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: [0, 5] }), null);
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: [21] }), null);
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: [3.5] }), null);
  assert.equal(cenaDeDadosLocais({ titulo: 'x', valores: [7], faces: 6 }), null, 'o 7 não existe num d6');
});

test('o limite da rolagem local cobre os sete atributos, e o do servidor continua em seis', () => {
  assert.ok(MAX_DADOS_LOCAIS >= 7);
  assert.equal(MAX_DADOS_3D, 6);
  const registro = {
    id: 'r', titulo: 'Teste', resultado: 70, formula: '7d20',
    detalhes: { termos: [{ tipo: 'dado', faces: 20, valores: sete }] },
  } as unknown as IRegistro;
  assert.equal(extrairCena(registro), null, 'uma rolagem de servidor com sete dados continua sem 3D');
});

test('só o 20 natural entra em câmera lenta, e só na reta final', async () => {
  const { escalaDoTempo } = await import('../../src/components/dados/cenaDados');
  assert.equal(escalaDoTempo('critico', 0.2), 1, 'o início da rolagem é no ritmo normal');
  assert.ok(escalaDoTempo('critico', 0.7) < 0.6, 'a reta final desacelera');
  assert.equal(escalaDoTempo('critico', 1), 1, 'depois do pouso volta ao normal');
  assert.equal(escalaDoTempo('falha', 0.7), 1);
  assert.equal(escalaDoTempo(null, 0.7), 1);
});
