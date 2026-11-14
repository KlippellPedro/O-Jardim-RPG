import assert from 'node:assert/strict';
import test from 'node:test';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes.ts';
import { CONDICOES_LONGO_PRAZO } from '../../data/regras/condicoes-longo-prazo.ts';
import {
  FAMILIA_DA_CONDICAO, MAXIMO_DE_CONTORNOS, contornosDoToken, danoContinuoDaCondicao, danoContinuoDoToken, lembreteDoDanoContinuo,
} from '../../src/pages/Mapa/motor/condicoesVisuais.ts';

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

test('toda condição que o contorno cita existe no catálogo do Livro', () => {
  const titulos = new Set([...CONDICOES_OFICIAIS, ...CRISES_SANIDADE, ...CONDICOES_LONGO_PRAZO].flatMap((c) => [semAcento(c.titulo), semAcento(c.id.replace(/^crise-/, ''))]));
  for (const nome of Object.keys(FAMILIA_DA_CONDICAO)) assert.ok(titulos.has(nome), `${nome} não está no catálogo`);
});

test('o token ganha no máximo dois contornos, pela prioridade (fogo antes de bênção)', () => {
  assert.deepEqual(contornosDoToken(['Queimando']), ['fogo']);
  assert.deepEqual(contornosDoToken(['Inspirado', 'Queimando', 'Amedrontado', 'Envenenado']), ['fogo', 'veneno']);
  assert.equal(contornosDoToken(['Queimando', 'Sangramento', 'Envenenado', 'Paralisado']).length, MAXIMO_DE_CONTORNOS);
  assert.deepEqual(contornosDoToken(['Caído', 'Cego', 'Condição inventada']), [], 'sem desenho para o que não tem');
  assert.deepEqual(contornosDoToken(['Paralisado', 'paralisado']), ['raio'], 'a mesma família não repete');
  assert.deepEqual(contornosDoToken(['AMEDRONTADO']), ['medo'], 'maiúsculas e acentos não importam');
});

test('o dano contínuo é lido do texto do Livro de Regras', () => {
  assert.deepEqual(danoContinuoDaCondicao('Queimando'), { condicao: 'Queimando', formula: '1d6', tipo: 'Fogo', momento: 'fim' });
  assert.deepEqual(danoContinuoDaCondicao('Envenenado'), { condicao: 'Envenenado', formula: '1d6', tipo: 'veneno', momento: 'fim' });
  assert.deepEqual(danoContinuoDaCondicao('Sangramento'), { condicao: 'Sangramento', formula: '1d6', tipo: null, momento: 'fim' });
  assert.equal(danoContinuoDaCondicao('Caído'), null);
  assert.equal(danoContinuoDaCondicao('Condição inventada'), null);
});

test('nenhuma condição do catálogo que cita dano por turno escapa do leitor', () => {
  const citam = [...CONDICOES_OFICIAIS, ...CRISES_SANIDADE, ...CONDICOES_LONGO_PRAZO]
    .filter((c) => c.efeitos.some((linha) => /\d+d\d+ de dano/i.test(linha) && /no (fim|início|começo) do turno/i.test(linha)));
  assert.ok(citam.length >= 3, 'Queimando, Envenenado e Sangramento ao menos');
  for (const condicao of citam) assert.ok(danoContinuoDaCondicao(condicao.titulo), `${condicao.titulo} cita dano por turno e o leitor não achou`);
});

test('na virada do turno só entra o dano do momento certo, e o lembrete diz tudo', () => {
  assert.equal(danoContinuoDoToken(['Queimando', 'Caído'], 'fim').length, 1);
  assert.equal(danoContinuoDoToken(['Queimando'], 'inicio').length, 0);
  const lista = danoContinuoDoToken(['Queimando', 'Sangramento'], 'fim');
  assert.equal(lembreteDoDanoContinuo('Aldric', lista, 'fim'), 'Aldric terminou o turno com Queimando: 1d6 de Fogo e Sangramento: 1d6.');
});
