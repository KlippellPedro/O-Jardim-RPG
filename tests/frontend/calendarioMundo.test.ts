import assert from 'node:assert/strict';
import test from 'node:test';
import { rotuloDoEvento, somarMes, textoEmDias } from '../../src/pages/Mundo/calendarioMundo';
import { larguraDasFaixas } from '../../src/components/ui/rasuraUtil';

test('navegar entre meses vira o ano nos dois sentidos', () => {
  assert.deepEqual(somarMes(3, 11, 1), { ano: 4, mes: 0 });
  assert.deepEqual(somarMes(3, 0, -1), { ano: 2, mes: 11 });
  assert.deepEqual(somarMes(1, 5, 0), { ano: 1, mes: 5 });
  assert.deepEqual(somarMes(0, 0, -1), { ano: -1, mes: 11 });
});

test('quantos dias faltam vira texto', () => {
  assert.equal(textoEmDias(0), 'hoje');
  assert.equal(textoEmDias(1), 'amanhã');
  assert.equal(textoEmDias(12), 'em 12 dias');
});

test('rotulo do evento diz o grau e se repete', () => {
  assert.equal(rotuloDoEvento({ revelacao: 'oculto', anual: false }), 'oculto');
  assert.equal(rotuloDoEvento({ revelacao: 'aberto', anual: true }), 'aberto · todo ano');
});

test('rasura e repetivel, respeita os limites e nunca depende do texto real', () => {
  const a = larguraDasFaixas('registro-1', 4);
  assert.deepEqual(a, larguraDasFaixas('registro-1', 4));
  assert.notDeepEqual(a, larguraDasFaixas('registro-2', 4));
  assert.equal(a.length, 4);
  assert.ok(a.every((largura) => largura >= 18 && largura <= 96));
  assert.ok(a[3] <= 58, 'a ultima linha e mais curta, como o fim de um paragrafo');
});

import { marcarComoLido, observarRegistro, type IArmazem } from '../../src/pages/Mundo/revelacao';

const armazemFalso = (): IArmazem => {
  const dados = new Map<string, string>();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => { dados.set(chave, valor); } };
};

test('registro so e "recem-revelado" se a pessoa o viu retido antes, e o brilho some ao abrir', () => {
  const armazem = armazemFalso();
  assert.equal(observarRegistro(armazem, 'c1', 'a', false), false); // sempre foi aberto: nada de novo
  assert.equal(observarRegistro(armazem, 'c1', 'b', true), false);   // retido
  assert.equal(observarRegistro(armazem, 'c1', 'b', false), true);   // o Mestre liberou
  assert.equal(observarRegistro(armazem, 'c1', 'b', false), true);   // continua novo ate abrir
  marcarComoLido(armazem, 'c1', 'b');
  assert.equal(observarRegistro(armazem, 'c1', 'b', false), false);
  assert.equal(observarRegistro(armazem, 'c2', 'b', false), false);  // outra campanha e outra historia
});

test('armazenamento corrompido nao quebra nada', () => {
  const armazem: IArmazem = { getItem: () => '{{{', setItem: () => { throw new Error('cheio'); } };
  assert.equal(observarRegistro(armazem, 'c1', 'a', true), false);
});
