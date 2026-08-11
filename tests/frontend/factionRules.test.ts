import assert from 'node:assert/strict';
import test from 'node:test';

import reinosData from '../../data/mundo/Gênese/realidade-0-reinos.json';
import soberanosData from '../../data/mundo/Gênese/realidade-0-soberanos.json';
import {
  AJUSTE_SOCIAL_MAXIMO,
  DESCONTO_FACCAO_MAXIMO_PERCENTUAL,
  FACCOES_DOCUMENTADAS,
  FAMA_MAXIMA,
  FAMA_MINIMA,
  limitarFama,
  limitarPrestigio,
  PRESTIGIO_MAXIMO,
  PRESTIGIO_MINIMO,
  REGRA_MUNDO_FACCOES,
  REGRAS_FAMA,
  REGRAS_PRESTIGIO,
  REPUTACAO_BANCARIA_SEPARADA,
  TABELA_FAMA,
  TABELA_PRESTIGIO,
} from '../../data/regras/faccoes.ts';

test('Prestígio usa escala completa de -3 a +3', () => {
  assert.equal(PRESTIGIO_MINIMO, -3);
  assert.equal(PRESTIGIO_MAXIMO, 3);
  assert.deepEqual(TABELA_PRESTIGIO.map((faixa) => faixa.nivel), [-3, -2, -1, 0, 1, 2, 3]);
  assert.equal(limitarPrestigio(-20), -3);
  assert.equal(limitarPrestigio(20), 3);
  assert.equal(limitarPrestigio(1.9), 1);
  assert.throws(() => limitarPrestigio(Number.NaN), /finito/);
});

test('Fama usa escala completa de 0 a 5', () => {
  assert.equal(FAMA_MINIMA, 0);
  assert.equal(FAMA_MAXIMA, 5);
  assert.deepEqual(TABELA_FAMA.map((faixa) => faixa.nivel), [0, 1, 2, 3, 4, 5]);
  assert.equal(limitarFama(-1), 0);
  assert.equal(limitarFama(12), 5);
  assert.equal(limitarFama(3.8), 3);
  assert.throws(() => limitarFama(Number.POSITIVE_INFINITY), /finito/);
});

test('bônus sociais e anonimato respeitam o teto de ±2', () => {
  assert.equal(AJUSTE_SOCIAL_MAXIMO, 2);
  assert.ok(TABELA_PRESTIGIO.every((faixa) => Math.abs(faixa.ajusteTesteSocial) <= AJUSTE_SOCIAL_MAXIMO));
  assert.ok(TABELA_FAMA.every((faixa) => Math.abs(faixa.ajusteAnonimato) <= AJUSTE_SOCIAL_MAXIMO));
  assert.ok(TABELA_PRESTIGIO.every((faixa) => faixa.descontoPercentual <= DESCONTO_FACCAO_MAXIMO_PERCENTUAL));
  assert.equal(Math.max(...TABELA_PRESTIGIO.map((faixa) => faixa.descontoPercentual)), 10);
});

test('Prestígio não concede controle social automático', () => {
  const texto = REGRAS_PRESTIGIO.join(' ');
  assert.match(texto, /Não garante.*ordem obedecida/);
  assert.match(texto, /Nenhum nível obriga uma criatura/);
  assert.match(texto, /não inicia combate automaticamente/i);
});

test('Fama mede visibilidade e não concede relação ou benefício de facção', () => {
  const texto = REGRAS_FAMA.join(' ');
  assert.match(texto, /mede visibilidade pública/);
  assert.match(texto, /não indica aprovação/);
  assert.match(texto, /não concede acesso, desconto, Prestígio/);
  assert.match(texto, /maior valor entre a Fama atual e o valor da habilidade/i);
});

test('reputação bancária permanece separada', () => {
  assert.match(REPUTACAO_BANCARIA_SEPARADA, /Banco/);
  assert.match(REPUTACAO_BANCARIA_SEPARADA, /cofres, cartão e loja/);
  assert.match(REPUTACAO_BANCARIA_SEPARADA, /Prestígio e Fama não alteram/);
});

test('catálogo publica duas facções canônicas e três propostas transdimensionais', () => {
  assert.deepEqual(
    FACCOES_DOCUMENTADAS.map((faccao) => faccao.id),
    ['banco-lunar', 'astratech', 'caravana-do-limiar', 'vigilia-das-raizes', 'arquivo-prismatico'],
  );
  assert.equal(FACCOES_DOCUMENTADAS.filter((faccao) => faccao.estado === 'canonica').length, 2);
  assert.equal(FACCOES_DOCUMENTADAS.filter((faccao) => faccao.estado === 'proposta').length, 3);
  assert.ok(FACCOES_DOCUMENTADAS.every((faccao) => /Árvore/i.test(faccao.alcance)));
});

test('fontes das facções canônicas existem e propostas não fingem possuir fonte', () => {
  const entradasPorArquivo: Record<string, Set<string>> = {
    'data/mundo/Gênese/realidade-0-reinos.json': new Set(reinosData.entradas.map((entrada) => entrada.id)),
    'data/mundo/Gênese/realidade-0-soberanos.json': new Set(soberanosData.entradas.map((entrada) => entrada.id)),
  };

  for (const faccao of FACCOES_DOCUMENTADAS) {
    if (faccao.estado === 'proposta') {
      assert.deepEqual(faccao.fontes, [], `${faccao.titulo} ainda não deveria possuir fonte canônica`);
      continue;
    }
    assert.ok(faccao.fontes.length > 0, `${faccao.titulo} deveria possuir fonte canônica`);
    for (const fonte of faccao.fontes) {
      assert.ok(entradasPorArquivo[fonte.arquivo]?.has(fonte.entrada_id), `${faccao.titulo}: fonte ausente`);
    }
  }
});

test('capítulo não publica cenário regional junto das facções', () => {
  assert.doesNotMatch(REGRA_MUNDO_FACCOES.corpo, /Cenário público/i);
  assert.match(REGRA_MUNDO_FACCOES.corpo, /Facções documentadas/i);
  assert.doesNotMatch(
    REGRA_MUNDO_FACCOES.corpo,
    /Irmãs da Noite|Asas de Prata|Aurora Escarlate|Titãs da Guerra|Reis da Favela|Trupe Fantasma/i,
  );
  assert.match(REGRA_MUNDO_FACCOES.corpo, /qualquer organização[^.]+independentemente da Árvore/i);
  assert.match(REGRA_MUNDO_FACCOES.corpo, /Banco Lunar e AstraTech pertencem ao cenário atual/i);
  assert.match(REGRA_MUNDO_FACCOES.corpo, /ainda não fazem parte do cânone/i);
});

test('redação pública não usa citações ou falas', () => {
  assert.doesNotMatch(REGRA_MUNDO_FACCOES.corpo, /[“”]/);
  assert.doesNotMatch(REGRA_MUNDO_FACCOES.corpo, /<blockquote/);
  assert.doesNotMatch(REGRA_MUNDO_FACCOES.corpo, /\bcitação\b/i);
});
