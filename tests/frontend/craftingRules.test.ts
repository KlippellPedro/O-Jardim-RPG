import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calcularCustoMateriais,
  calcularDtReparo,
  FERRAMENTAS_CRAFTING,
  HORAS_POR_DIA_DE_TRABALHO,
  MODELOS_PROJETO_CRAFTING,
  REGRA_CRAFTING,
  REGRAS_ALQUIMIA,
  REGRAS_REPARO,
  REGRAS_TECNOLOGIA_E_CIBERNETICOS,
  RESULTADOS_CRAFTING,
  SALVAGUARDAS_ECONOMIA_CRAFTING,
  TABELA_CRAFTING_RARIDADE,
} from '../../data/regras/crafting.ts';

test('tabela de crafting cobre todas as raridades na ordem oficial', () => {
  assert.deepEqual(
    TABELA_CRAFTING_RARIDADE.map((regra) => regra.id),
    ['comum', 'incomum', 'raro', 'epico', 'lendario', 'reliquia', 'reliquia da criacao'],
  );
  assert.equal(new Set(TABELA_CRAFTING_RARIDADE.map((regra) => regra.id)).size, 7);
});

test('DT, tempo e custo aumentam até Lendário', () => {
  const fabricaveis = TABELA_CRAFTING_RARIDADE.filter((regra) => regra.dt !== null);
  assert.deepEqual(fabricaveis.map((regra) => regra.dt), [10, 15, 20, 25, 30]);
  assert.deepEqual(fabricaveis.map((regra) => regra.diasTrabalho), [1, 3, 7, 14, 30]);
  assert.deepEqual(fabricaveis.map((regra) => regra.custoMateriaisPercentual), [50, 60, 70, 80, 90]);
  assert.ok(fabricaveis.every((regra, indice, lista) => indice === 0 || (regra.dt ?? 0) > (lista[indice - 1].dt ?? 0)));
});

test('Míticos e Relíquias da Criação não entram na fabricação comum', () => {
  const restritas = TABELA_CRAFTING_RARIDADE.filter((regra) => regra.id.includes('reliquia'));
  assert.equal(restritas.length, 2);
  for (const regra of restritas) {
    assert.equal(regra.dt, null);
    assert.equal(regra.diasTrabalho, null);
    assert.equal(regra.custoMateriaisPercentual, null);
    assert.equal(regra.fabricacaoComumPermitida, false);
    assert.equal(regra.requerAprovacao, true);
  }
});

test('dia de trabalho possui seis horas e o capítulo publica esse limite', () => {
  assert.equal(HORAS_POR_DIA_DE_TRABALHO, 6);
  assert.match(REGRA_CRAFTING.corpo, /6 horas/);
  assert.deepEqual(REGRA_CRAFTING.destaques[0], ['Dia de trabalho', '6 horas']);
});

test('custo usa preço normal, arredonda para cima e rejeita entrada inválida', () => {
  assert.equal(calcularCustoMateriais(101, 'comum'), 51);
  assert.equal(calcularCustoMateriais(101, 'epico'), 81);
  assert.throws(() => calcularCustoMateriais(100, 'lendario'), /não possui custo comum/);
  assert.throws(() => calcularCustoMateriais(0, 'comum'), /positivo/);
  assert.throws(() => calcularCustoMateriais(Number.NaN, 'comum'), /positivo/);
  assert.throws(() => calcularCustoMateriais(100, 'reliquia'), /não possui custo comum/);
});

test('Ofício e Tecnologia possuem escopos separados', () => {
  const porId = Object.fromEntries(MODELOS_PROJETO_CRAFTING.map((modelo) => [modelo.id, modelo]));
  assert.equal(porId.forja.pericia, 'Ofício');
  assert.equal(porId.alquimia.pericia, 'Ofício');
  assert.equal(porId.alquimia.especialidade, 'Alquimia');
  assert.equal(porId.axis.pericia, 'Tecnologia');
  assert.equal(porId.cibernetico.pericia, 'Tecnologia');
  assert.ok(FERRAMENTAS_CRAFTING.some((ferramenta) => ferramenta.id === 'sala-de-implante'));
});

test('falhas exigem novo investimento e crítico não aumenta o produto', () => {
  const sucessoCritico = RESULTADOS_CRAFTING.find((resultado) => resultado.id === 'sucesso-critico');
  const falha = RESULTADOS_CRAFTING.find((resultado) => resultado.id === 'falha');
  const falhaCritica = RESULTADOS_CRAFTING.find((resultado) => resultado.id === 'falha-critica');
  assert.ok(sucessoCritico && falha && falhaCritica);
  assert.match(sucessoCritico.efeito, /Não aumenta raridade, quantidade ou efeito/);
  assert.equal(falha.diasAdicionais, 1);
  assert.equal(falha.materiaisAdicionaisPercentual, 10);
  assert.equal(falhaCritica.diasAdicionais, 2);
  assert.equal(falhaCritica.materiaisAdicionaisPercentual, 25);
});

test('reparo tem teto mínimo e não recria recursos consumidos', () => {
  assert.equal(calcularDtReparo('comum'), 10);
  assert.equal(calcularDtReparo('raro'), 15);
  assert.equal(calcularDtReparo('lendario'), null);
  assert.equal(calcularDtReparo('reliquia'), null);
  assert.equal(REGRAS_REPARO.custoPercentual, 10);
  assert.match(REGRAS_REPARO.regra, /Não recupera consumíveis, cargas gastas ou item destruído/);
});

test('alquimia e cibernéticos não contornam limites de classe ou de item', () => {
  assert.ok(REGRAS_ALQUIMIA.some((regra) => /não conta como item fabricado/i.test(regra)));
  assert.ok(REGRAS_TECNOLOGIA_E_CIBERNETICOS.some((regra) => /não ignora|não cria/i.test(regra)));
  assert.match(REGRA_CRAFTING.corpo, /Nenhuma classe é obrigatória/);
});

test('salvaguardas impedem duplicação de Drops e lucro automático', () => {
  const texto = SALVAGUARDAS_ECONOMIA_CRAFTING.join(' ');
  assert.match(texto, /Drop não pode ser usado, vendido e recuperado/);
  assert.match(texto, /não possui lucro ou comprador automático/);
  assert.match(texto, /no máximo um bloco de 6 horas de crafting por dia/);
  assert.match(texto, /não produzem estoque permanente/);
});
