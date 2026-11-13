import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AJUSTE_SOCIAL_MAXIMO,
  REGRAS_PROCURA,
  REGRA_MUNDO_FACCOES,
  TABELA_PROCURA,
  limitarProcura,
  obterFaixaProcura,
  procuraDepoisDeUmMesQuieto,
} from '../../data/regras/faccoes';
import {
  PODERES_DE_FACCAO,
  TAMANHOS_DE_OBJETIVO,
  avancoDaFaccao,
  disputaEntreFaccoes,
  moverObjetivo,
} from '../../data/regras/faccoesEmMovimento';
import {
  FAVORES,
  LACOS_MAXIMOS,
  confiancaDepoisDaRecusa,
  contatosMantidos,
  podePedir,
} from '../../data/regras/contatosELacos';
import * as devocao from '../../data/regras/devocao';
import { CONDICOES_LONGO_PRAZO } from '../../data/regras/condicoes-longo-prazo';
import { GRUPOS_NAVEGACAO } from '../../data/regras/navegacao';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { tituloTopico } from '../../data/regras/titulos';

test('Procura vai de 0 a 5, por lugar, e o ajuste com a lei respeita o teto de ±2', () => {
  assert.deepEqual(TABELA_PROCURA.map((faixa) => faixa.nivel), [0, 1, 2, 3, 4, 5]);
  assert.ok(TABELA_PROCURA.every((faixa) => Math.abs(faixa.ajusteComALei) <= AJUSTE_SOCIAL_MAXIMO));
  assert.equal(limitarProcura(9), 5);
  assert.equal(limitarProcura(-2), 0);
  assert.throws(() => limitarProcura(Number.NaN), /finito/);
  assert.equal(obterFaixaProcura(3).titulo, 'Caçado');
  assert.match(REGRAS_PROCURA.join(' '), /identificado/);
});

test('o tempo apaga a Procura só até 2', () => {
  assert.equal(procuraDepoisDeUmMesQuieto(2), 1);
  assert.equal(procuraDepoisDeUmMesQuieto(1), 0);
  assert.equal(procuraDepoisDeUmMesQuieto(0), 0);
  assert.equal(procuraDepoisDeUmMesQuieto(3), 3);
  assert.equal(procuraDepoisDeUmMesQuieto(5), 5);
});

test('a página de Prestígio e Fama ganhou a Procura sem virar Calor', () => {
  assert.match(REGRA_MUNDO_FACCOES.corpo, /<h3 class="regras-subtitle">Procura<\/h3>/);
  assert.match(REGRA_MUNDO_FACCOES.corpo, /<h3 class="regras-subtitle">Alterar Procura<\/h3>/);
  assert.equal(tituloTopico('mundo-faccoes'), 'Prestígio, Fama e Procura');
  // Calor é dano de ambiente no livro; a escala da lei tem outro nome.
  assert.doesNotMatch(REGRA_MUNDO_FACCOES.corpo, /Calor \d|Calor de roubo/);
});

test('facções: 2d6 + Poder decide o avanço, e a disputa pinta de um lado e apaga do outro', () => {
  assert.equal(avancoDaFaccao(6, 0).resultado, 'emperrou');
  assert.equal(avancoDaFaccao(7, 0).resultado, 'avancou');
  assert.equal(avancoDaFaccao(4, 3).resultado, 'avancou');
  assert.equal(avancoDaFaccao(9, 1).partes, 2);
  assert.deepEqual(disputaEntreFaccoes(12, 9), [1, -1]);
  assert.deepEqual(disputaEntreFaccoes(8, 8), [0, 0]);
  assert.deepEqual(moverObjetivo({ partes: 6, pintadas: 5 }, 2), { partes: 6, pintadas: 6, fechou: true });
  assert.deepEqual(moverObjetivo({ partes: 4, pintadas: 0 }, -1), { partes: 4, pintadas: 0, fechou: false });
  assert.deepEqual(TAMANHOS_DE_OBJETIVO.map((tamanho) => tamanho.partes), [4, 6, 8]);
  assert.deepEqual(PODERES_DE_FACCAO.map((item) => item.poder), [0, 1, 2, 3]);
});

test('contatos: Confiança decide o favor, e o segundo no intervalo sobe um tamanho', () => {
  assert.equal(contatosMantidos(0), 2);
  assert.equal(contatosMantidos(3), 5);
  assert.equal(contatosMantidos(-3), 1);
  assert.equal(podePedir(1, 'pequeno'), true);
  assert.equal(podePedir(1, 'grande'), false);
  assert.equal(podePedir(2, 'grande'), true);
  assert.equal(podePedir(2, 'pequeno', { segundoNoIntervalo: true }), true);
  assert.equal(podePedir(2, 'grande', { segundoNoIntervalo: true }), false);
  assert.equal(podePedir(3, 'arriscado'), true);
  assert.equal(podePedir(3, 'arriscado', { segundoNoIntervalo: true }), false);
  assert.equal(confiancaDepoisDaRecusa(1), 0);
  assert.deepEqual(FAVORES.map((favor) => favor.confiancaMinima), [1, 2, 3]);
});

test('laços: até três, e o Luto Profundo que a página cita existe', () => {
  assert.equal(LACOS_MAXIMOS, 3);
  assert.ok(CONDICOES_LONGO_PRAZO.some((condicao) => condicao.titulo === 'Luto Profundo'));
  assert.match(REGRAS_OFICIAIS['contatos-lacos'].corpo, /Sanidade contra DT 15/);
});

test('Devoção: 0 a 3, sobe no máximo um degrau por arco', () => {
  assert.deepEqual(devocao.TABELA_DEVOCAO.map((faixa) => faixa.nivel), [0, 1, 2, 3]);
  assert.equal(devocao.devocaoNoFimDoArco(0, 3, 0), 1);
  assert.equal(devocao.devocaoNoFimDoArco(2, 1, 1), 2);
  assert.equal(devocao.devocaoNoFimDoArco(3, 1, 0), 3);
  assert.equal(devocao.devocaoNoFimDoArco(1, 0, 2), 0);
  assert.throws(() => devocao.limitarDevocao(Number.NaN), /finito/);
});

test('a Devoção mora em Frutos e Implantes e não leva o estado das deidades ao navegador', () => {
  const frutos = REGRAS_OFICIAIS['frutos-implantes'];
  assert.match(frutos.corpo, /<h3 class="regras-subtitle">Devoção<\/h3>/);
  assert.match(frutos.corpoMestre || '', /<h3 class="regras-subtitle">Conduzir a Devoção<\/h3>/);
  assert.doesNotMatch(frutos.corpo, /presa/);
  // devocao.ts é empacotado para o navegador inteiro: nada exportado dali pode
  // ser texto do Mestre (o filtro do Vite só apaga a propriedade corpoMestre).
  assert.doesNotMatch(JSON.stringify(devocao), /presa|Comunicação enquanto/);
  assert.match(REGRAS_OFICIAIS['criacao-personagem'].corpo, /dois preceitos/);
});

test('Facções em Movimento e Contatos e Laços ficam no capítulo do Mundo', () => {
  const mundo = GRUPOS_NAVEGACAO.find((grupo) => grupo.id === 'mundo');
  assert.ok(mundo?.topicos.includes('faccoes-em-movimento'));
  assert.ok(mundo?.topicos.includes('contatos-lacos'));
  assert.ok(mundo && mundo.topicos.length <= 11);
});
