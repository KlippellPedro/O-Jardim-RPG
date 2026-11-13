import assert from 'node:assert/strict';
import test from 'node:test';
import { CORES_BARRA_PADRAO, mostrarComRecurso, normalizarPreferenciasBarras, porcentagemDaBarra, recursoEscolhido, resolucaoDoTexto, separarBarras } from '../../src/pages/Mapa/motor/barrasToken';
import type { IBarraToken } from '../../src/services/mapaApi';

const vida: IBarraToken = { tipo: 'vida', atual: 20, maximo: 40 };
const mana: IBarraToken = { tipo: 'mana', atual: 3, maximo: 6 };
const estamina: IBarraToken = { tipo: 'estamina', atual: 5, maximo: 10 };
const sanidade: IBarraToken = { tipo: 'sanidade', atual: 70, maximo: 100 };

test('o token separa Vida, um recurso e a Sanidade', () => {
  const partes = separarBarras([vida, estamina, sanidade]);
  assert.equal(partes.vida, vida);
  assert.equal(partes.recurso, estamina);
  assert.equal(partes.sanidade, sanidade);
  // Resposta antiga com as duas: a Mana fica.
  assert.equal(separarBarras([vida, mana, estamina]).recurso, mana);
  assert.equal(separarBarras([]).vida, null);
});

test('a bolinha mostra a porcentagem da Sanidade', () => {
  assert.equal(porcentagemDaBarra(sanidade), 70);
  assert.equal(porcentagemDaBarra({ tipo: 'sanidade', atual: 1, maximo: 300 }), 1);
  assert.equal(porcentagemDaBarra({ tipo: 'sanidade', atual: 0, maximo: 100 }), 0);
  assert.equal(porcentagemDaBarra({ tipo: 'sanidade', atual: 150, maximo: 100 }), 100);
});

test('o menu troca só o recurso e deixa Vida e Sanidade como estavam', () => {
  assert.deepEqual(mostrarComRecurso(['vida', 'mana', 'estamina', 'sanidade'], 'estamina'), ['vida', 'sanidade', 'estamina']);
  assert.deepEqual(mostrarComRecurso(['vida', 'mana'], 'nenhum'), ['vida']);
  assert.equal(recursoEscolhido({ mostrar: ['vida', 'mana', 'estamina'], para: 'todos' }, [vida, estamina]), 'estamina');
  assert.equal(recursoEscolhido({ mostrar: ['vida', 'mana', 'estamina'], para: 'todos' }, [vida, mana]), 'mana');
  assert.equal(recursoEscolhido({ mostrar: ['vida'], para: 'todos' }, [vida]), 'nenhum');
});

test('quem guardou as cores vivas antigas passa para as pastel; cor escolhida de verdade fica', () => {
  const antigas = normalizarPreferenciasBarras({ porTipo: { vida: { modo: 'barra', cor: '#E5484D' }, mana: { modo: 'barra', cor: '#3e63dd' }, estamina: { modo: 'barra', cor: '#123456' } } });
  assert.equal(antigas.porTipo.vida.cor, CORES_BARRA_PADRAO.vida);
  assert.equal(antigas.porTipo.mana.cor, CORES_BARRA_PADRAO.mana);
  assert.equal(antigas.porTipo.estamina.cor, '#123456');
});

test('o texto das barras ganha resolução com o zoom, em degraus, sem passar de 4', () => {
  assert.equal(resolucaoDoTexto(0.4, 1), 1);
  assert.equal(resolucaoDoTexto(1, 1), 1);
  assert.equal(resolucaoDoTexto(1.5, 1), 2);
  assert.equal(resolucaoDoTexto(3, 1), 4);
  assert.equal(resolucaoDoTexto(8, 1), 4);
  assert.equal(resolucaoDoTexto(1, 2), 2);
});
