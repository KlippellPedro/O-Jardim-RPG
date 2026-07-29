import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAGIAS_CATALOGO,
  circuloPermitidoPorFluxo,
  magiaElegivelParaAprender,
  obterPerfilMagico,
  podeConjurarMagia,
} from '../../src/services/magiaService.ts';

const ficha = (classeId: string, nivel: number, fluxo: number, conhecidas: string[] = []) => ({
  racaId: 'humano',
  classeId,
  classes: [{ classeId, nivel }],
  nivel,
  atributosFinais: {
    forca: 10,
    destreza: 10,
    constituicao: 10,
    inteligencia: 10,
    sabedoria: 10,
    carisma: 10,
    fluxo,
  },
  pericias: { misticismo: 'aprendiz' },
  magiasConhecidasIds: conhecidas,
});

test('Fluxo libera os cinco círculos nos limiares publicados', () => {
  assert.deepEqual(
    [7, 8, 11, 12, 13, 14, 15, 16, 17, 18].map(circuloPermitidoPorFluxo),
    [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
  );
});

test('Elementarista combina limite da classe, Fluxo, vagas e Misticismo', () => {
  const nivel8 = obterPerfilMagico(ficha('elementarista', 8, 12));
  assert.equal(nivel8.circuloDaFonte, 2);
  assert.equal(nivel8.circuloDoFluxo, 2);
  assert.equal(nivel8.circuloMaximo, 2);
  assert.equal(nivel8.vagasConhecidas, 4);
  assert.equal(nivel8.bonusConjuracao, 7);
  assert.equal(nivel8.dtMagia, 17);

  const fluxoBaixo = obterPerfilMagico(ficha('elementarista', 20, 12));
  assert.equal(fluxoBaixo.circuloDaFonte, 4);
  assert.equal(fluxoBaixo.circuloMaximo, 2);
});

test('Cartista aprende três magias no nível 10 e quatro no nível 15', () => {
  assert.deepEqual(
    [10, 15].map((nivel) => {
      const perfil = obterPerfilMagico(ficha('cartista-arcano', nivel, 12));
      return [perfil.circuloDaFonte, perfil.vagasConhecidas];
    }),
    [[1, 3], [2, 4]],
  );
});

test('seleção impede círculo alto, ritual e excesso de vagas', () => {
  const personagem = ficha('elementarista', 8, 12);
  const circulo2 = MAGIAS_CATALOGO.find((magia) => magia.id === 'lanca-elemental')!;
  const circulo3 = MAGIAS_CATALOGO.find((magia) => magia.id === 'ruptura-elemental')!;
  const ritual = MAGIAS_CATALOGO.find((magia) => magia.circulo === 'ritual')!;
  assert.equal(magiaElegivelParaAprender(personagem, circulo2).permitido, true);
  assert.equal(magiaElegivelParaAprender(personagem, circulo3).permitido, false);
  assert.equal(magiaElegivelParaAprender(personagem, ritual).permitido, false);

  const lotado = ficha('elementarista', 8, 12, [
    'projetil-elemental',
    'surto-elemental',
    'bastiao-elemental',
    'passo-elemental',
  ]);
  assert.equal(magiaElegivelParaAprender(lotado, circulo2).permitido, false);
});

test('concessão do Mestre dá acesso, mas não ignora o limite de Fluxo', () => {
  const magia = MAGIAS_CATALOGO.find((item) => item.id === 'extincao-elemental')!;
  const concedida = {
    ...ficha('guerreiro', 20, 18),
    magiasConcedidasIds: [magia.id],
  };
  assert.equal(podeConjurarMagia(concedida, magia).permitido, true);
  assert.equal(podeConjurarMagia({ ...concedida, atributosFinais: { ...concedida.atributosFinais, fluxo: 16 } }, magia).permitido, false);
});

test('catálogo respeita custo e orçamento de dano por círculo', () => {
  const custos = [2, 4, 6, 8, 10];
  const numeradas = MAGIAS_CATALOGO.filter((magia) => typeof magia.circulo === 'number');
  assert.equal(numeradas.length, 25);
  numeradas.forEach((magia) => assert.equal(magia.custo_mana, custos[Number(magia.circulo) - 1]));
  numeradas.filter((magia) => magia.perfil === 'alvo').forEach((magia) => {
    assert.equal(magia.dano, `${Number(magia.circulo) * 2}d8`);
  });
  numeradas.filter((magia) => magia.perfil === 'area' && magia.id !== 'ruptura-elemental').forEach((magia) => {
    assert.equal(magia.dano, `${Number(magia.circulo) * 2}d6`);
  });
});
