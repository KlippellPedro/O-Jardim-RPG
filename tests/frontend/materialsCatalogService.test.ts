import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MATERIAIS_CATALOGO,
  RECEITAS_CATALOGO,
  materialCorrespondeBusca,
  materiaisCompativeis,
  receitasParaMaterial,
} from '../../src/services/materialsCatalogService.ts';
import { itemCorrespondeBusca, itemCorrespondeSubfiltro, mapearItemLoja } from '../../src/services/lojaCatalogService.ts';

test('compêndio publica todos os materiais e receitas sem chaves duplicadas', () => {
  assert.equal(MATERIAIS_CATALOGO.length, 259);
  assert.equal(new Set(MATERIAIS_CATALOGO.map((item) => item.id)).size, 259);
  assert.equal(RECEITAS_CATALOGO.length, 91);
  assert.equal(new Set(RECEITAS_CATALOGO.map((item) => item.chave)).size, 91);
});

test('Alquimista possui alternativas químicas nos patamares altos', () => {
  const quimicos = MATERIAIS_CATALOGO.filter((item) => item.usos.includes('alquimia'));
  assert.equal(quimicos.length, 55);
  assert.ok(quimicos.every((item) => item.usos.every((uso) => uso === 'alquimia' || uso === 'forja')));
  assert.ok(quimicos.filter((item) => item.raridade === 'raro').length >= 10);
  assert.ok(quimicos.filter((item) => item.raridade === 'epico').length >= 6);
  assert.ok(quimicos.filter((item) => item.raridade === 'lendario').length >= 6);
});

test('Chef possui Mantimentos próprios em todas as raridades', () => {
  const mantimentos = MATERIAIS_CATALOGO.filter((item) => item.usos.includes('cozinha'));
  assert.equal(mantimentos.length, 56);
  for (const raridade of ['comum', 'incomum', 'raro', 'epico', 'lendario']) {
    assert.ok(mantimentos.some((item) => item.raridade === raridade), raridade);
  }
  assert.ok(mantimentos.every((item) => item.usos.length === 1 && item.usos[0] === 'cozinha'));
});

test('Engenheiro possui Sucata própria nos cinco patamares', () => {
  const sucatas = MATERIAIS_CATALOGO.filter((item) => item.usos.includes('engenharia'));
  assert.equal(sucatas.length, 56);
  for (const raridade of ['comum', 'incomum', 'raro', 'epico', 'lendario']) {
    assert.ok(sucatas.some((item) => item.raridade === raridade), raridade);
  }
  assert.ok(sucatas.every((item) => item.usos.every((uso) => uso === 'engenharia' || uso === 'forja')));
});

test('Ritualista possui focos mágicos próprios nos cinco patamares', () => {
  const ritualisticos = MATERIAIS_CATALOGO.filter((item) => item.usos.includes('ritual'));
  assert.equal(ritualisticos.length, 44);
  for (const raridade of ['comum', 'incomum', 'raro', 'epico', 'lendario']) {
    assert.ok(ritualisticos.filter((item) => item.raridade === raridade).length >= 6, raridade);
  }
  assert.ok(ritualisticos.every((item) => item.usos.every((uso) => uso === 'ritual' || uso === 'forja')));
});

test('manutenção possui Componentes Veiculares próprios em todas as raridades', () => {
  const veiculares = MATERIAIS_CATALOGO.filter((item) => item.usos.includes('veiculos'));
  assert.equal(veiculares.length, 20);
  for (const raridade of ['comum', 'incomum', 'raro', 'epico', 'lendario']) {
    assert.equal(veiculares.filter((item) => item.raridade === raridade).length, 4, raridade);
  }
  assert.ok(veiculares.every((item) => item.usos.length === 1 && item.usos[0] === 'veiculos'));
});

test('catálogos de classe não dividem materiais entre si e Matéria-prima pode misturar', () => {
  const usosDeClasse = ['alquimia', 'ritual', 'engenharia', 'cozinha', 'veiculos'];
  for (const material of MATERIAIS_CATALOGO) {
    assert.ok(material.usos.filter((uso) => usosDeClasse.includes(uso)).length <= 1, material.titulo);
  }

  const materiasPrimas = MATERIAIS_CATALOGO.filter((item) => item.usos.includes('forja'));
  assert.equal(materiasPrimas.filter((item) => item.usos.length === 1).length, 28);
  assert.ok(materiasPrimas.some((item) => item.usos.includes('alquimia')));
  assert.ok(materiasPrimas.some((item) => item.usos.includes('ritual')));
  assert.ok(materiasPrimas.some((item) => item.usos.includes('engenharia')));
});

test('toda linha de receita mostra pelo menos uma alternativa válida', () => {
  for (const receita of RECEITAS_CATALOGO) {
    for (const linha of receita.linhas) {
      assert.ok(materiaisCompativeis(linha).length > 0, `${receita.chave}/${linha.id} sem alternativa`);
    }
  }
});

test('busca do compêndio encontra nome, propriedade e uso', () => {
  const ervas = MATERIAIS_CATALOGO.find((item) => item.id === 'comp-ervas-comuns');
  assert.ok(ervas);
  assert.equal(materialCorrespondeBusca(ervas, 'ervas medicinal'), true);
  assert.equal(materialCorrespondeBusca(ervas, 'cozinha'), false);
  assert.ok(receitasParaMaterial(ervas).some(({ receita }) => receita.id === 'cura-menor'));
});

test('Loja expõe e filtra os campos estruturados de materiais', () => {
  const origem = MATERIAIS_CATALOGO.find((item) => item.id === 'comp-ervas-comuns');
  assert.ok(origem);
  const item = mapearItemLoja({
    id: origem.id,
    tipo: 'drop',
    titulo: origem.titulo,
    conteudo: origem,
    preco: { moeda: 'Lunaris', valor: 5 },
  });

  assert.equal(item.categoria, 'Componentes');
  assert.match(item.propriedades ?? '', /Componente Químico/);
  assert.equal(itemCorrespondeSubfiltro(item, 'Componentes', 'Componentes Químicos'), true);
  assert.equal(itemCorrespondeSubfiltro(item, 'Componentes', 'Mantimentos'), false);

  const ervasCulinarias = MATERIAIS_CATALOGO.find((material) => material.id === 'mat-ervas-aromaticas');
  assert.ok(ervasCulinarias);
  const mantimento = mapearItemLoja({
    id: ervasCulinarias.id,
    tipo: 'drop',
    titulo: ervasCulinarias.titulo,
    conteudo: ervasCulinarias,
    preco: { moeda: 'Lunaris', valor: 4 },
  });
  assert.equal(itemCorrespondeBusca(mantimento, 'botânico cozinha'), true);
  assert.equal(itemCorrespondeSubfiltro(mantimento, 'Componentes', 'Componentes Químicos'), false);
  assert.equal(itemCorrespondeSubfiltro(mantimento, 'Componentes', 'Mantimentos'), true);

  const componenteVeicular = MATERIAIS_CATALOGO.find((material) => material.id === 'mat-kit-vedacao-casco');
  assert.ok(componenteVeicular);
  const itemVeicular = mapearItemLoja({
    id: componenteVeicular.id,
    tipo: 'drop',
    titulo: componenteVeicular.titulo,
    conteudo: componenteVeicular,
    preco: { moeda: 'Lunaris', valor: 8 },
  });
  assert.match(itemVeicular.propriedades ?? '', /Componente Veicular/);
  assert.equal(itemCorrespondeSubfiltro(itemVeicular, 'Componentes', 'Componentes Veiculares'), true);
  assert.equal(itemCorrespondeSubfiltro(itemVeicular, 'Componentes', 'Sucata'), false);
});
