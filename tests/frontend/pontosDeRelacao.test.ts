import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEGRAUS_DE_RELACAO,
  PONTOS_DE_RELACAO_MAXIMOS,
  REGRA_PONTOS_DE_RELACAO,
  USOS_DE_PONTO,
  limitarPontosDeRelacao,
  pontosDepois,
  sanidadeDaRelacao,
  usosRestantes,
} from '../../data/regras/pontosDeRelacao';
import { DT_DE_LACO_ROMPIDO, PERDA_DE_LACO_ROMPIDO } from '../../data/regras/contatosELacos';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { GRUPOS_NAVEGACAO } from '../../data/regras/navegacao';
import { dtNoNivel, dtPadraoDoVd } from '../../src/services/curvaCriatura';
import {
  afinidadeDosPontos,
  aplicarPontos,
  devolverUsoDePonto,
  ehDoGrupo,
  filtrarVinculos,
  gastarUsoDePonto,
  normalizarVinculos,
  novaSessaoNosVinculos,
  pontosDoVinculo,
  sanidadeDoVinculo,
  usosDoVinculo,
  type IVinculo,
} from '../../src/pages/Ficha/utils/vinculos';

const vinculo = (parcial: Partial<IVinculo> = {}): IVinculo => ({
  id: 'v1',
  nome: 'Duda',
  tipo: 'amizade',
  afinidade: 3,
  nota: '',
  fixado: false,
  criadoEm: 1,
  atualizadoEm: 1,
  historico: [],
  grupo: true,
  ...parcial,
});

test('o máximo é 3 pontos, com um degrau para cada número', () => {
  assert.equal(PONTOS_DE_RELACAO_MAXIMOS, 3);
  assert.deepEqual(DEGRAUS_DE_RELACAO.map((degrau) => degrau.pontos), [0, 1, 2, 3]);
  assert.equal(limitarPontosDeRelacao(7), 3);
  assert.equal(limitarPontosDeRelacao(-2), 0);
  assert.equal(limitarPontosDeRelacao('x'), 0);
});

test('cada ponto é um uso por sessão, e gastar não tira o ponto', () => {
  assert.equal(usosRestantes(2, 0), 2);
  assert.equal(usosRestantes(2, 1), 1);
  assert.equal(usosRestantes(2, 5), 0);
  assert.deepEqual(USOS_DE_PONTO.map((uso) => uso.id), ['ajuda', 'mao', 'combinado']);
});

test('ganhar e perder andam de 1 em 1, e a traição zera', () => {
  assert.equal(pontosDepois(2, 'ganha'), 3);
  assert.equal(pontosDepois(3, 'ganha'), 3);
  assert.equal(pontosDepois(1, 'perde'), 0);
  assert.equal(pontosDepois(3, 'traicao'), 0);
});

test('mais pontos, mais perda de Sanidade; laço rompido sem pontos é a linha de 1 ponto', () => {
  assert.deepEqual(sanidadeDaRelacao('cai', 1), { dt: 10, perda: '1d4', nomeDaDt: 'Rotineira' });
  assert.deepEqual(sanidadeDaRelacao('cai', 3), { dt: 10, perda: '1d8', nomeDaDt: 'Rotineira' });
  assert.deepEqual(sanidadeDaRelacao('perde', 2), { dt: 15, perda: '1d8', nomeDaDt: 'Padrão' });
  assert.deepEqual(sanidadeDaRelacao('perde', 3), { dt: 15, perda: '2d6', nomeDaDt: 'Padrão' });
  assert.equal(sanidadeDaRelacao('cai', 0), null);
  assert.equal(sanidadeDaRelacao('cai', 0, { laco: true }), null);
  assert.deepEqual(sanidadeDaRelacao('perde', 0, { laco: true }), { dt: DT_DE_LACO_ROMPIDO, perda: PERDA_DE_LACO_ROMPIDO, nomeDaDt: 'Padrão' });
  assert.deepEqual(sanidadeDaRelacao('perde', 2, { laco: true }), { dt: 15, perda: '1d8', nomeDaDt: 'Padrão' });
});

test('as DTs de Sanidade da relação somam o ajuste de nível, como toda DT de Sanidade', () => {
  assert.equal(sanidadeDaRelacao('cai', 2, { nivel: 1 })?.dt, 10);
  assert.equal(sanidadeDaRelacao('perde', 2, { nivel: 1 })?.dt, 15);
  assert.equal(sanidadeDaRelacao('cai', 2, { nivel: 20 })?.dt, dtNoNivel(10, 20));
  assert.equal(sanidadeDaRelacao('perde', 2, { nivel: 20 })?.dt, dtNoNivel(15, 20));
  assert.equal(sanidadeDaRelacao('perde', 2, { nivel: 20 })?.dt, dtPadraoDoVd(20), 'a linha de perder é a DT Padrão do nível');
  assert.ok(dtNoNivel(15, 20) > 15);
  assert.doesNotMatch(REGRA_PONTOS_DE_RELACAO.corpo, /DT 15, 1d6/);
  assert.match(REGRA_PONTOS_DE_RELACAO.corpo, /some o ajuste/);
});

test('a página existe, mora em Cenas e Grupo e conversa com as regras vizinhas', () => {
  assert.equal(REGRAS_OFICIAIS['pontos-de-relacao'], REGRA_PONTOS_DE_RELACAO);
  const capitulo = GRUPOS_NAVEGACAO.find((grupo) => grupo.topicos.includes('pontos-de-relacao'));
  assert.equal(capitulo?.id, 'cenas');
  const corpo = REGRA_PONTOS_DE_RELACAO.corpo;
  assert.match(corpo, /regras-ref--ataques-combinados/);
  assert.match(corpo, /regras-ref--contatos-lacos/);
  assert.match(corpo, /regras-ref--acoes-coletivas/);
  assert.match(REGRAS_OFICIAIS['acoes-coletivas'].corpo, /regras-ref--pontos-de-relacao/);
  assert.match(REGRAS_OFICIAIS['contatos-lacos'].corpo, /regras-ref--pontos-de-relacao/);
});

test('o texto para o jogador segue o tom do livro', () => {
  const textos = [REGRA_PONTOS_DE_RELACAO.corpo, REGRA_PONTOS_DE_RELACAO.corpoMestre ?? '', REGRA_PONTOS_DE_RELACAO.resumo, REGRAS_OFICIAIS['ataques-combinados'].corpo];
  textos.forEach((texto) => {
    assert.doesNotMatch(texto, /—/);
    assert.doesNotMatch(texto, /\beco\b/i);
  });
});

test('na ficha, os pontos saem da afinidade pela escada da Confiança', () => {
  assert.deepEqual([-3, 0, 1, 2, 3, 4, 5].map(pontosDoVinculo), [0, 0, 1, 1, 2, 2, 3]);
  assert.equal(afinidadeDosPontos(4, 2), 4, 'mesmo degrau, afinidade intacta');
  assert.equal(afinidadeDosPontos(4, 3), 5);
  assert.equal(afinidadeDosPontos(5, 1), 1);
  assert.equal(afinidadeDosPontos(-3, 0), -3, 'zero preserva o atrito');
  assert.equal(afinidadeDosPontos(2, 0), 0);
});

test('dados antigos continuam iguais, e o grupo só aparece quando marcado', () => {
  const [antigo, doGrupo] = normalizarVinculos([
    { id: 'a', nome: 'Mira', tipo: 'contato', afinidade: 4, ramo: 'informacao', historico: [] },
    { id: 'b', nome: 'Rafa', tipo: 'amizade', afinidade: 3, grupo: true, pontosUsados: 9, historico: [] },
  ]);
  assert.equal(antigo.afinidade, 4);
  assert.equal(antigo.grupo, undefined);
  assert.equal(antigo.pontosUsados, undefined);
  assert.equal(ehDoGrupo(antigo), false);
  assert.equal(doGrupo.grupo, true);
  assert.equal(doGrupo.pontosUsados, 2, 'usos gastos não passam dos pontos');
  assert.deepEqual(filtrarVinculos([antigo, doGrupo], { busca: '', tipo: 'todos', faixa: 'grupo' }).map((item) => item.id), ['b']);
});

test('gastar, devolver e liberar usos na nova sessão', () => {
  let duda = vinculo({ afinidade: 3 });
  assert.deepEqual(usosDoVinculo(duda), { total: 2, restantes: 2 });
  duda = gastarUsoDePonto(duda, 10);
  duda = gastarUsoDePonto(duda, 11);
  assert.equal(duda.pontosUsados, 2);
  assert.equal(gastarUsoDePonto(duda, 12), duda, 'sem uso sobrando, nada muda');
  assert.equal(devolverUsoDePonto(duda, 13).pontosUsados, 1);
  assert.equal(gastarUsoDePonto(vinculo({ grupo: undefined })).pontosUsados, undefined, 'fora do grupo não gasta');
  const [livre] = novaSessaoNosVinculos([{ ...duda, laco: 'x', lacoUsado: true }]);
  assert.equal(livre.pontosUsados, undefined);
  assert.equal(livre.lacoUsado, undefined);
});

test('mudar os pontos vai para o histórico e corta os usos ao novo teto', () => {
  const duda = vinculo({ afinidade: 5, pontosUsados: 3 });
  const depois = aplicarPontos(duda, 1, 'Mentiu sobre o mapa', 20);
  assert.equal(depois.afinidade, 1);
  assert.equal(pontosDoVinculo(depois.afinidade), 1);
  assert.equal(depois.pontosUsados, 1);
  assert.deepEqual(depois.historico.at(-1), { em: 20, de: 5, para: 1, motivo: 'Mentiu sobre o mapa' });
  assert.equal(aplicarPontos(duda, 0, 'Traição', 21).pontosUsados, undefined);
});

test('o aviso de Sanidade da ficha usa os pontos e o laço', () => {
  assert.deepEqual(sanidadeDoVinculo(vinculo({ afinidade: 5 }), 'perde'), { dt: 15, perda: '2d6', nomeDaDt: 'Padrão' });
  assert.deepEqual(sanidadeDoVinculo(vinculo({ afinidade: 5, grupo: undefined, laco: 'x' }), 'perde'), { dt: 15, perda: '1d6', nomeDaDt: 'Padrão' });
  assert.equal(sanidadeDoVinculo(vinculo({ afinidade: 5 }), 'cai', 20)?.dt, dtNoNivel(10, 20));
  assert.equal(sanidadeDoVinculo(vinculo({ afinidade: 0 }), 'cai'), null);
});
