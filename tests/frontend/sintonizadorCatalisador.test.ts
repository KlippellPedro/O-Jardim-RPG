import assert from 'node:assert/strict';
import test from 'node:test';

import catalogoLoja from '../../data/loja/catalogo.json';
import magiasData from '../../data/ficha/magias.json';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { fluxosCatalisaveisDaFicha, fusoesDaFicha, obterPerfilMagico } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (decisão 9: C e A): o catalisador é um objeto pessoal,
// sem Loja; a Tecnologia só vira catalisador quando o Mestre a instalou; a
// ficha guarda o estado desativado e mostra só as fusões aprendidas.

const sintonizador = CLASSES_CATALOGO.find((classe) => classe.id === 'sintonizador') as any;
const ficha = (nivel: number, extra: Record<string, unknown> = {}) => ({
  arvoreId: 'chronus',
  racaId: 'humano',
  classeId: 'sintonizador',
  classes: [{ classeId: 'sintonizador', nivel }],
  nivel,
  atributosFinais: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 30 },
  pericias: { misticismo: 'aprendiz' },
  ...extra,
});

test('a Tecnologia só vira catalisador do Sintonizador quando está instalada', () => {
  assert.equal(fluxosCatalisaveisDaFicha(ficha(5)).has('tecnologia'), false);
  assert.equal(fluxosCatalisaveisDaFicha(ficha(5, { fluxosInstaladosIds: ['tecnologia'] })).has('tecnologia'), true);
  const interceptador = { ...ficha(5, { fluxosInstaladosIds: ['tecnologia'] }), classeId: 'interceptador', classes: [{ classeId: 'interceptador', nivel: 5 }] };
  assert.equal(fluxosCatalisaveisDaFicha(interceptador).has('tecnologia'), false);

  const perfil = obterPerfilMagico(ficha(5, {
    fluxosInstaladosIds: ['tecnologia'],
    catalisadoresFluxo: { preparadosIds: ['tecnologia', 'vazio'], ativoId: 'tecnologia', desativadosIds: ['vazio', 'fim'] },
  }));
  assert.deepEqual(perfil.catalisadoresPreparadosIds, ['tecnologia', 'vazio']);
  // Desativado só vale para quem está preparado.
  assert.deepEqual(perfil.catalisadoresDesativadosIds, ['vazio']);
});

test('a ficha mostra só as fusões aprendidas, do nível 3 em diante, sem a do Fluxo nativo', () => {
  const escolhas = { 'sintonizador:fusao-controlada': ['dobra', 'eco', 'germinacao'] };
  assert.deepEqual(fusoesDaFicha(ficha(2, { escolhasHabilidade: escolhas })), []);
  // Chronus dá Tempo como Fluxo nativo, então a fusão do Tempo (Prorrogação, id eco) sai.
  assert.deepEqual(fusoesDaFicha(ficha(8, { escolhasHabilidade: escolhas })).map((fusao) => fusao.id).sort(), ['dobra', 'germinacao']);
});

test('textos da classe: objeto pessoal, estados definidos e poderes que pedem dois catalisadores', () => {
  const sintonia = sintonizador.habilidades.find((item: any) => item.id === 'sintonia-catalisada');
  assert.match(sintonia.estagios[0].descricao, /objeto seu/);
  assert.match(sintonia.estagios[0].descricao, /desativado/);
  assert.match(sintonia.estagios[1].descricao, /Ação de Movimento/);
  assert.doesNotMatch(sintonia.estagios[4].descricao, /dois catalisadores ativos/);
  for (const id of ['troca-instantanea', 'dupla-frequencia']) {
    assert.deepEqual(sintonizador.poderes.find((item: any) => item.id === id).pre_requisitos, ['Sintonia Catalisada 2'], id);
  }
  assert.doesNotMatch(JSON.stringify(sintonizador), /carga do catalisador|Resistência 5 contra dano causado por magias/);
  assert.doesNotMatch(JSON.stringify(magiasData.fusoes), /carga do catalisador/);
  // A modificação da Loja que recupera Mana não se chama mais Catalisador.
  const mod = (catalogoLoja as any).entradas.find((item: any) => item.id === 'mod-catalisador');
  assert.equal(mod.titulo, 'Condensador de Mana');
});
