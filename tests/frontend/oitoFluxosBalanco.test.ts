import assert from 'node:assert/strict';
import test from 'node:test';

import classesData from '../../data/ficha/classes.json';
import magiasData from '../../data/ficha/magias.json';
import marcasData from '../../data/ficha/marcas-de-circulo.json';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (balanceamento dos outros oito Fluxos, caminho C):
// primeiro os erros e as incoerências dos relatórios de Inconstância, Espaço,
// Vitalidade, Essência, Origem, Comunicação, Tecnologia e Físico, com as seis
// respostas de design: Mod. Fluxo nos ataques de Comunicação, tabelas da
// Inconstância, Julgamento Essencial com +2d8, carne de caça no lugar de Carne
// de Humano, Registrar Padrão até o 8º e Sopro de Anima para seis aliados.

const todas = [
  ...MAGIAS_CATALOGO,
  ...(magiasData.rituais as any[]),
  ...(magiasData.selos as any[]),
  ...(magiasData.encantamentos as any[]),
] as any[];

const item = (id: string) => {
  const encontrado = todas.find((entrada) => entrada.id === id);
  assert.ok(encontrado, `${id} sumiu do catálogo`);
  return encontrado;
};
const variacao = (id: string, fluxo: string) => String(item(id).efeitos_por_fluxo?.[fluxo] || '');

test('Inconstância: as quatro tabelas existem e as magias apontam para elas', () => {
  const regras = Object.values(REGRAS_OFICIAIS).map((regra: any) => regra.corpo).join('\n');
  assert.match(regras, /Sorteios da Inconstância/);
  for (const tabela of ['Tipo (1d4)', 'Direção (1d8)', 'Resistência (1d6)', 'Reescrita (1d4)']) {
    assert.ok(regras.includes(tabela), tabela);
  }
  assert.match(item('onda-caotica').efeito, /tabela de Tipo/);
  assert.match(item('mutabilidade').efeito, /tabela de Resistência/);
  assert.match(item('reescrita-instavel').efeito, /tabela de Reescrita/);
  assert.match(item('detonacao-improvavel').efeito, /1 o conjurador sofre/);
  assert.doesNotMatch(item('detonacao-improvavel').efeito, /sorteado pelo Mestre/);
  assert.match(item('mundo-instavel').efeito, /esta magia fica de fora/);
  assert.match(item('reviravolta').efeito, /antes de qualquer consequência/);
  assert.doesNotMatch(item('sorte-trocada').efeito, /pior dos dois/);
  assert.doesNotMatch(item('propriedade-mutavel').efeito, /impacto|frio/);
  assert.equal(item('entropia-vortice').duracao, 'Cena');
});

test('Espaço: carga em espaços, Portal Maior abaixo da Dobra e teleporte só de quem aceita', () => {
  assert.match(item('bolso-dobrado').efeito, /\+5 espaços/);
  assert.doesNotMatch(item('cofre-dobrado').efeito, /grama|kg/);
  assert.match(item('portal-maior').efeito, /Médias ou menores/);
  assert.match(item('dobra-de-exercito').alcance, /área de 15 m/);
  assert.equal(item('ruptura-espacial').duracao, 'Três rodadas');
  assert.match(item('passo-selado').efeito, /voluntárias/);
  assert.match(item('sentenca-do-vao').efeito, /^Além do dano/);
  assert.match(item('fenda-absoluta').efeito, /^Além do dano/);
});

test('Vitalidade: cura em área com teto, contágio com regra e nada de Carne de Humano', () => {
  assert.match(item('sopro-de-anima').alvo, /Até seis aliados/);
  assert.match(item('vigor-desmedido').efeito, /2 × Mod\. Fluxo/);
  assert.match(item('colapso-biologico').efeito, /Paralisado/);
  assert.match(variacao('lei-do-fluxo', 'vitalidade'), /Fim ou do Vazio/);
  assert.match(variacao('singularidade', 'vitalidade'), /personagem de jogador cai Morrendo/);
  assert.doesNotMatch(variacao('clone-de-fluxo', 'vitalidade'), /carne viva/);
  assert.doesNotMatch(JSON.stringify(magiasData.rituais), /drop-humano-carne/);
});

test('Essência: tetos de círculo, teste na Palavra Justa e um 9º com efeito próprio', () => {
  assert.match(item('julgamento-essencial').efeito, /\+2d8/);
  assert.doesNotMatch(item('julgamento-essencial').efeito, /dobro/);
  assert.match(item('custodia-da-alma').efeito, /até 5º círculo/);
  assert.match(item('espelho-veridico').efeito, /até 3º círculo/);
  assert.match(item('ancora-vestida').efeito, /Uma vez por cena/);
  assert.match(item('palavra-justa').efeito, /Vontade/);
  assert.match(item('nome-verdadeiro').efeito, /natureza dele/);
  assert.doesNotMatch(item('dissipacao-veridica').efeito, /todos os efeitos mágicos/);
});

test('Origem: ajuda pela regra, sem voltar no tempo e sem criar item acabado', () => {
  assert.doesNotMatch(item('vinculo-inaugural').efeito, /reação/);
  assert.match(item('linhagem-nascente').efeito, /12 × Mod\. Fluxo/);
  assert.doesNotMatch(item('recomeco-absoluto').efeito, /estado em que começou/);
  assert.match(item('genese').efeito, /até 50 m/);
  assert.match(item('genese-menor').efeito, /sem metal, vidro nem mecanismo/);
  const germinacao = (magiasData.fusoes as any[]).find((fusao) => fusao.id === 'germinacao');
  assert.match(germinacao.efeito, /não exige concentração/);
  assert.match(JSON.stringify(classesData), /foco existir, o efeito não exige concentração/);
});

test('Comunicação: todo ataque de alvo único soma o Mod. Fluxo, e ninguém lê mente', () => {
  const ataques = MAGIAS_CATALOGO.filter((magia: any) => magia.fluxo === 'comunicacao' && magia.ataque && magia.dano);
  assert.ok(ataques.length >= 7);
  for (const magia of ataques as any[]) assert.match(magia.dano, /Mod\. Fluxo/, magia.id);
  assert.doesNotMatch(variacao('singularidade', 'comunicacao'), /sabia/);
  assert.match(item('acordo-breve').efeito, /limitado a \+4/);
  assert.match(item('decreto-registrado').defesa, /Vontade/);
  assert.match(item('mensagem-prateada').efeito, /10 km/);
});

test('Tecnologia: registrar até o 8º, reprodução que fecha a conta e durações certas', () => {
  assert.match(item('registrar-padrao').efeito, /até 8º círculo/);
  assert.match(item('registrar-padrao').efeito, /Mod\. Fluxo/);
  assert.equal(item('reproducao-total').duracao, 'Instantânea');
  assert.equal(item('sentenca-do-axis').duracao, 'Cena');
  assert.equal(item('rotina-automatizada').concentracao, false);
  assert.notEqual(item('aniquilador-de-padroes').efeito, variacao('sentenca-do-fluxo', 'tecnologia'));
  assert.match(item('fabrica-de-campo').efeito, /duas torres/);
});

test('Físico: Resistência por tipo, sucesso escrito e Marcas para quem não é Elementarista', () => {
  for (const id of ['armadura-de-materia', 'pele-de-aco', 'baluarte', 'armadura-absoluta', 'placas-do-baluarte']) {
    assert.doesNotMatch(item(id).efeito, /redução de \d/, id);
  }
  assert.match(item('terremoto-menor').efeito, /em sucesso/);
  assert.equal(item('controle-de-massa').dano, '6d6');
  assert.doesNotMatch(variacao('avatar-do-fluxo', 'fisico'), /sete elementos/);
  assert.doesNotMatch(JSON.stringify(marcasData), /elemento despertado/);
});
