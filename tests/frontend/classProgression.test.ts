import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ARVORES, filtrarPorArvore } from '../../src/data/arvoresCatalog';
import { REGRAS_OFICIAIS } from '../../src/data/regras';
import {
  contarRecompensasPorTipo,
  formatarRecompensaClasse,
  obterProximaProgressao,
} from '../../src/services/classeService';
import type { IClasse } from '../../src/types/catalogo';

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const obterClasse = (id: string) => {
  const classe = classes.find(item => item.id === id);
  assert.ok(classe, `Classe ausente: ${id}`);
  return classe;
};

test('publica as 24 classes com orçamento base consistente', () => {
  assert.equal(classes.length, 24);
  for (const classe of classes) {
    assert.equal(classe.vida + classe.mana, 7, `Orçamento inválido em ${classe.titulo}`);
    assert.equal(classe.recursos_provisorios, false, `Classe provisória: ${classe.titulo}`);
    assert.equal(classe.progressao_publicada, true, `Progressão ausente: ${classe.titulo}`);
    assert.ok(classe.descricao, `Descrição ausente: ${classe.titulo}`);
  }
});

test('todas as classes possuem progressão completa e sem níveis duplicados', () => {
  const expected = Array.from({ length: 20 }, (_, index) => index + 1);
  for (const classe of classes) {
    const levels = classe.progressao?.map(item => item.nivel) || [];
    assert.deepEqual(levels, expected, `Progressão incompleta em ${classe.titulo}`);
    assert.equal(new Set(levels).size, 20, `Nível duplicado em ${classe.titulo}`);
    assert.ok(
      classe.progressao?.find(item => item.nivel === 20)?.recompensas.some(item => item.tipo === 'habilidade_final'),
      `Habilidade final ausente em ${classe.titulo}`,
    );
    assert.equal(contarRecompensasPorTipo(classe, 20, 'poder'), 8, `Escolhas de poder inválidas em ${classe.titulo}`);
  }
});

test('separa 13 classes comuns e 11 especiais por Árvore', () => {
  const common = classes.filter(classe => classe.categoria === 'padrao');
  const special = classes.filter(classe => classe.categoria !== 'padrao');

  assert.equal(common.length, 13);
  assert.equal(special.length, 11);
  assert.ok(common.every(classe => classe.disponibilidade === 'geral' && classe.arvore === null));
  assert.ok(common.every(classe => !classe.arvores?.length));
  assert.ok(special.every(classe => classe.disponibilidade === 'restrita'));
  assert.ok(special.every(classe => classe.requer_autorizacao_mestre === true));
  assert.ok(special.every(classe => classe.arvores?.length));

  for (const tree of ARVORES) {
    const available = filtrarPorArvore(classes, tree.id);
    assert.equal(available.filter(classe => classe.categoria === 'padrao').length, 13);
    assert.ok(
      available.some(classe => classe.categoria !== 'padrao'),
      `Árvore sem classe especial: ${tree.nome}`,
    );
  }
});

test('mantém o mapa temático das classes especiais', () => {
  const expected: Record<string, string[]> = {
    aethel: ['invocador'],
    ousias: ['decodificador'],
    keryx: ['codificador'],
    haemus: ['cacador-de-entidades'],
    ignis: ['elementarista', 'viajante-classe'],
    moros: ['campeao-dimensional'],
    aperion: ['guia-dimensional', 'viajante-classe'],
    chronus: ['cartista-arcano', 'viajante-classe'],
    erebus: ['pirata-amaldicoado'],
    'mulher-carmesim': ['escritor-de-contos'],
  };

  for (const [treeId, ids] of Object.entries(expected)) {
    assert.deepEqual(
      classes
        .filter(classe => classe.categoria !== 'padrao' && classe.arvores?.includes(treeId))
        .map(classe => classe.id)
        .sort(),
      [...ids].sort(),
    );
  }
});

test('classes especiais recebem o patamar de perícia superior', () => {
  for (const classe of classes) {
    const expected = classe.categoria === 'padrao' ? 4 : 8;
    assert.equal(
      contarRecompensasPorTipo(classe, 20, 'grau_pericia'),
      expected,
      `Patamar de perícia inválido em ${classe.titulo}`,
    );
  }

  const firstSpecialReward = obterClasse('campeao-dimensional').progressao?.[0].recompensas
    .find(reward => reward.tipo === 'grau_pericia');
  assert.ok(firstSpecialReward);
  assert.equal(formatarRecompensaClasse(firstSpecialReward), 'Grau de perícia (2x)');
});

test('todas as classes oferecem escolha real e usam somente Mana', () => {
  for (const classe of classes) {
    assert.ok((classe.habilidades?.length || 0) >= 2, `Poucas habilidades em ${classe.titulo}`);
    assert.ok((classe.eventos?.length || 0) >= 1, `Evento ausente em ${classe.titulo}`);
    assert.ok((classe.poderes?.length || 0) >= 10, `Poucos poderes em ${classe.titulo}`);
    for (const poder of classe.poderes || []) {
      assert.equal(Number.isFinite(poder.custo_mana), true, `Custo inválido em ${classe.titulo}: ${poder.titulo}`);
      assert.ok(poder.custo_mana >= 0, `Custo negativo em ${classe.titulo}: ${poder.titulo}`);
      assert.equal('custo_fv' in poder, false, `Campo antigo de F.V. em ${classe.titulo}: ${poder.titulo}`);
      assert.ok(poder.descricao, `Descrição ausente em ${classe.titulo}: ${poder.titulo}`);
    }
  }
});

test('distingue material enviado de propostas originais', () => {
  const revised = classes.filter(classe => classe.origem_conteudo === 'material_enviado_revisado');
  const proposed = classes.filter(classe => classe.origem_conteudo === 'proposta_original_balanceada');

  assert.equal(revised.length, 15);
  assert.equal(proposed.length, 9);
  assert.deepEqual(
    proposed.map(classe => classe.id).sort(),
    [
      'alquimista',
      'cacador-de-entidades',
      'codificador',
      'comerciante',
      'decodificador',
      'escritor-de-contos',
      'guia-dimensional',
      'invocador',
      'viajante-classe',
    ],
  );
});

test('preserva os marcos das duas classes previamente publicadas', () => {
  for (const id of ['piloto', 'ninja']) {
    const classe = obterClasse(id);
    assert.equal(classe.vida, 4);
    assert.equal(classe.mana, 3);
    assert.deepEqual(
      classe.progressao
        ?.filter(item => item.recompensas.some(reward => reward.tipo === 'grau_pericia'))
        .map(item => item.nivel),
      [1, 6, 11, 17],
    );
  }

  assert.equal(obterProximaProgressao(obterClasse('piloto'), 5)?.nivel, 6);
  assert.equal(obterProximaProgressao(obterClasse('ninja'), 20), null);
});

test('remove o modelo provisório depois da publicação das 24 classes', () => {
  assert.doesNotMatch(REGRAS_OFICIAIS.xp.corpo, /Modelo de progressão de classe/i);
  assert.doesNotMatch(REGRAS_OFICIAIS.xp.corpo, /classes que ainda não receberam progressão própria/i);
  assert.match(REGRAS_OFICIAIS.xp.corpo, /Classes comuns podem ser escolhidas em qualquer Árvore/);
});
