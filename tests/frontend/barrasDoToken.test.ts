import assert from 'node:assert/strict';
import test from 'node:test';
import { CORES_BARRA_PADRAO, cabeLadoALado, medidasDasBarras, misturarCor, mostrarComRecurso, normalizarPreferenciasBarras, porcentagemDaBarra, recursoEscolhido, resolucaoDoTexto, separarBarras } from '../../src/pages/Mapa/motor/barrasToken';
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

test('a barra é alta o bastante para o rótulo caber dentro dela, em qualquer tamanho de token', () => {
  for (const lado of [20, 40, 64, 100, 160, 400]) {
    const m = medidasDasBarras(lado);
    assert.ok(m.altura >= 4 && m.altura <= 11, `lado ${lado}: altura ${m.altura}`);
    assert.ok(m.fonteNaBarra <= m.altura, `lado ${lado}: a letra (${m.fonteNaBarra}) passa da barra (${m.altura})`);
    assert.ok(m.largura >= 16 && m.largura <= 180);
  }
  const medio = medidasDasBarras(100);
  assert.ok(medio.altura > 8, 'a barra de um token médio ficou mais alta que a antiga (8 no máximo)');
  assert.ok(medidasDasBarras(400).altura === 11, 'teto da altura');
});

test('misturar cores escurece, clareia e aguenta cor inválida', () => {
  assert.equal(misturarCor('#ffffff', '#000000', 0), '#ffffff');
  assert.equal(misturarCor('#ffffff', '#000000', 1), '#000000');
  assert.equal(misturarCor('#e88a90', '#000000', 0.5), '#744548');
  assert.equal(misturarCor('#808080', '#ffffff', 0.5), '#c0c0c0');
  assert.equal(misturarCor('azul', '#000000', 0), '#808080', 'cor ruim vira cinza em vez de quebrar');
  assert.equal(misturarCor('#102030', '#ffffff', 5), '#ffffff', 'a proporção fica entre 0 e 1');
});

test('rótulo e valor só ficam lado a lado quando cabem na barra', () => {
  assert.equal(cabeLadoALado(100, 20, 30, 4), true);
  assert.equal(cabeLadoALado(60, 30, 30, 4), false);
  assert.equal(cabeLadoALado(62, 25, 25, 4), true, 'cabe exatamente');
});
