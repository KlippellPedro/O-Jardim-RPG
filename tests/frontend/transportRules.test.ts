import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACESSO_PORTAL_DIMENSIONAL,
  REGRA_TRANSPORTE,
  TRANSPORTES_LUNARIS,
  VIAGENS_EXCEPCIONAIS,
} from '../../data/regras/transporte';

test('a tabela de transporte preserva custos e tempos da fonte', () => {
  assert.deepEqual(TRANSPORTES_LUNARIS, [
    {
      id: 'trem',
      titulo: 'Trem',
      mesmoReino: { custoLunaris: 20, tempo: '30 min' },
      entreReinos: { custoLunaris: 50, tempo: '1–2 dias' },
      entreDimensoes: { custoLunaris: 200, tempo: '7 dias' },
    },
    {
      id: 'aeronave-comum',
      titulo: 'Aeronave Comum',
      mesmoReino: { custoLunaris: 50, tempo: '10 min' },
      entreReinos: { custoLunaris: 100, tempo: '1–2 horas' },
      entreDimensoes: { custoLunaris: 500, tempo: '2 dias' },
    },
    {
      id: 'aeronave-alto-nivel',
      titulo: 'Aeronave de Alto Nível',
      mesmoReino: { custoLunaris: 100, tempo: '1 min' },
      entreReinos: { custoLunaris: 250, tempo: '20–30 min' },
      entreDimensoes: { custoLunaris: 1_000, tempo: '1 hora' },
    },
  ]);
});

test('portal e viagem excepcional mantêm preço e requisitos explícitos', () => {
  assert.deepEqual(ACESSO_PORTAL_DIMENSIONAL, {
    id: 'portal-dimensional',
    titulo: 'Acesso ao Portal Dimensional',
    custoLunaris: 500,
    requisito: 'Portal disponível',
    observacao: 'Custo adicional ao transporte',
  });

  assert.deepEqual(VIAGENS_EXCEPCIONAIS, [
    {
      id: 'sair-da-arvore',
      destino: 'Sair da Árvore',
      custoLunaris: 10_000,
      tempo: '12 dias',
      requisito: 'Contato capaz de realizar a viagem',
      observacao: 'Dinheiro sozinho não garante acesso',
    },
  ]);
});

test('a página explica cobrança individual e taxa dimensional adicional', () => {
  assert.match(REGRA_TRANSPORTE.corpo, /preço por personagem/i);
  assert.match(REGRA_TRANSPORTE.corpo, /Some a taxa de acesso ao preço/i);
  assert.match(REGRA_TRANSPORTE.corpo, /10\.000 Lunaris/);
  assert.match(REGRA_TRANSPORTE.corpo, /regras-table-wrap/);
});
