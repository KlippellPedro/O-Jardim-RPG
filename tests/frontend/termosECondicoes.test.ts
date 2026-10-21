import assert from 'node:assert/strict';
import test from 'node:test';

import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes';
import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (termos e condições, A nas duas): glossário "Termos das
// magias" no tópico Magia e Fluxo, Revelado vira condição, e a Imobilizado e as
// condições de fonte instantânea ganham saída padrão.

const corpoDe = (trecho: string) => {
  const regra = Object.values(REGRAS_OFICIAIS).find((item: any) => String(item.corpo || '').includes(trecho)) as any;
  assert.ok(regra, `nenhum tópico com "${trecho}"`);
  return String(regra.corpo);
};

test('Revelado é condição oficial, e a Imobilizado tem saída mesmo quando a fonte não diz', () => {
  const revelado = CONDICOES_OFICIAIS.find((item) => item.id === 'revelado');
  assert.ok(revelado);
  assert.match(revelado.efeitos.join(' '), /disfarce/);
  const imobilizado = CONDICOES_OFICIAIS.find((item) => item.id === 'imobilizado');
  assert.match(imobilizado?.remocao || '', /Atletismo ou Acrobacia/);
  assert.match(corpoDe('Condições gerais'), /fonte instantânea/);
});

test('o tópico Magia e Fluxo explica os termos das magias', () => {
  const corpo = corpoDe('Termos das magias');
  for (const termo of ['Revelado', 'Alcançar o próprio Fim', 'Consolidado', 'Alma própria', 'Reconquista', 'Ausente', 'Fronteira selada', 'Módulo A.X.I.S']) {
    assert.ok(corpo.includes(`<strong>${termo}.</strong>`), termo);
  }
});

test('as magias sem saída ou com termo solto foram ajustadas', () => {
  const texto = (id: string) => (MAGIAS_CATALOGO.find((item) => item.id === id) as any)?.efeito || '';
  assert.match(texto('primavera-devastadora'), /até o fim do próximo turno/);
  assert.match(texto('chuva-de-esporos'), /Atletismo ou Acrobacia/);
  assert.doesNotMatch(JSON.stringify(MAGIAS_CATALOGO), /ação simples|terreno seguro/);
});
