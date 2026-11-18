import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BONUS_MAXIMO_DE_VANTAGEM,
  ORDENS_DE_BATALHA,
  PARTES_MAXIMAS_POR_FEITOS,
  REGRA_BATALHA,
  TAMANHOS_DE_EXERCITO,
  bonusDasOrdens,
  bonusDeVantagens,
  perdaDoFeito,
  perdasDoChoque,
  pontosDeMoral,
} from '../../data/regras/batalha';
import {
  NIVEIS_DE_VIGILANCIA,
  estadoDoAlerta,
  resolverRodadaDeInfiltracao,
} from '../../data/regras/infiltracao';
import { PISTAS_POR_PERGUNTA, TAMANHOS_DE_CASO, resultadoDaBusca } from '../../data/regras/investigacao';
import {
  FRACAO_DO_DIA_PELO_GUIA,
  PAPEIS_DE_VIAGEM,
  RITMOS_DE_VIAGEM,
  TERRENOS_DE_VIAGEM,
  diasDeCaminho,
  resultadoDoGuia,
} from '../../data/regras/viagem';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes';
import { GRUPOS_NAVEGACAO } from '../../data/regras/navegacao';
import { REGRA_AFLICOES } from '../../data/regras/aflicoes';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { FATORES_DESCANSO } from '../../src/services/descansoService';
import catalogoLoja from '../../data/loja/catalogo.json';
import classesData from '../../data/ficha/classes.json';

test('viagem: o dia rende pelo ritmo, e só o terreno Difícil corta pela metade', () => {
  assert.equal(diasDeCaminho('facil'), 1);
  assert.equal(diasDeCaminho('ermo'), 1);
  assert.equal(diasDeCaminho('dificil'), 0.5);
  assert.equal(diasDeCaminho('facil', 'forcado'), 1.5);
  assert.equal(diasDeCaminho('facil', 'cauteloso'), 0.5);
  assert.deepEqual(RITMOS_DE_VIAGEM.map((ritmo) => ritmo.fracao), [0.5, 1, 1.5]);
  assert.deepEqual(TERRENOS_DE_VIAGEM.map((terreno) => terreno.titulo), ['Fácil', 'Ermo', 'Difícil']);
  // Quanto pior o terreno, mais alta a DT do Guia.
  const dts = TERRENOS_DE_VIAGEM.map((terreno) => terreno.dtGuia ?? 0);
  assert.deepEqual(dts, [...dts].sort((a, b) => a - b));
  assert.doesNotMatch(REGRAS_OFICIAIS.viagem.corpo, /se multiplicam/);
});

test('viagem: o Guia faz o dia render inteiro ou metade', () => {
  assert.equal(resultadoDoGuia(3, null), 'no-caminho', 'terreno Fácil não pede teste');
  assert.equal(resultadoDoGuia(15, 15), 'no-caminho');
  assert.equal(resultadoDoGuia(10, 15), 'atrasou');
  assert.deepEqual(Object.values(FRACAO_DO_DIA_PELO_GUIA), [1, 0.5]);
  assert.deepEqual(PAPEIS_DE_VIAGEM.map((papel) => papel.titulo), ['Guia', 'Batedor', 'Forrageiro', 'Vigia']);
});

test('infiltração: sucesso avança, toda falha marca 1 de Alerta e forçar marca 1 a mais', () => {
  const inicio = { etapas: 4, alerta: 0, alertaMaximo: 4 };
  assert.deepEqual(resolverRodadaDeInfiltracao(inicio, { sucesso: true }), { etapas: 3, alerta: 0, alertaMaximo: 4, desfecho: null });
  assert.equal(resolverRodadaDeInfiltracao(inicio, { sucesso: false }).alerta, 1);
  const forcado = resolverRodadaDeInfiltracao(inicio, { sucesso: false, forcar: true });
  assert.equal(forcado.etapas, 3);
  assert.equal(forcado.alerta, 2);
  // Preparar o terreno não avança nem quando dá certo.
  assert.equal(resolverRodadaDeInfiltracao(inicio, { sucesso: true, avanca: false }).etapas, 4);
});

test('infiltração: o lugar aguenta 3, 4 ou 5 falhas, e a última toca o alarme', () => {
  const beirada = { etapas: 1, alerta: 3, alertaMaximo: 4 };
  const forcou = resolverRodadaDeInfiltracao(beirada, { sucesso: false, forcar: true });
  assert.equal(forcou.desfecho, 'alarme');
  assert.equal(forcou.alerta, 4, 'o Alerta nunca passa do máximo');
  assert.equal(resolverRodadaDeInfiltracao(beirada, { sucesso: true }).desfecho, 'saiu');
  assert.equal(estadoDoAlerta(3, 4), 'calmo');
  assert.equal(estadoDoAlerta(4, 4), 'alarme');
  assert.deepEqual(NIVEIS_DE_VIGILANCIA.map((nivel) => nivel.alerta), [5, 4, 3]);
  assert.doesNotMatch(REGRAS_OFICIAIS.infiltracao.corpo, /Desconfiança/);
});

test('investigação: a pista vem sempre e o dado decide o extra e o custo', () => {
  assert.equal(resultadoDaBusca(25, 15), 'pista-e-extra');
  assert.equal(resultadoDaBusca(15, 15), 'pista');
  assert.equal(resultadoDaBusca(14, 15), 'pista-e-custo');
  assert.equal(resultadoDaBusca(30, 15, { falhaCritica: true }), 'pista-e-dois-custos');
  assert.equal(PISTAS_POR_PERGUNTA, 3);
  assert.deepEqual(TAMANHOS_DE_CASO.map((caso) => [caso.perguntas, caso.relogio]), [[2, 4], [3, 6], [4, 8]]);
});

test('batalha: as três ordens se vencem em roda, e recuar não vence nenhuma', () => {
  assert.deepEqual(bonusDasOrdens('segurar', 'avancar'), [2, 0]);
  assert.deepEqual(bonusDasOrdens('avancar', 'flanquear'), [2, 0]);
  assert.deepEqual(bonusDasOrdens('flanquear', 'segurar'), [2, 0]);
  assert.deepEqual(bonusDasOrdens('avancar', 'segurar'), [0, 2]);
  assert.deepEqual(bonusDasOrdens('avancar', 'avancar'), [0, 0]);
  ORDENS_DE_BATALHA.forEach((ordem) => assert.deepEqual(bonusDasOrdens('recuar', ordem.id).slice(0, 1), [0]));
  const vencidas = ORDENS_DE_BATALHA.map((ordem) => ordem.vence).filter(Boolean).sort();
  assert.deepEqual(vencidas, ['avancar', 'flanquear', 'segurar'], 'cada ordem da roda é vencida por exatamente uma');
});

test('batalha: perdas do choque, teto das vantagens e pontos de moral', () => {
  assert.deepEqual(perdasDoChoque(0), [1, 1]);
  assert.deepEqual(perdasDoChoque(4), [0, 1]);
  assert.deepEqual(perdasDoChoque(10), [0, 2]);
  assert.deepEqual(perdasDoChoque(-12), [2, 0]);
  assert.deepEqual(perdasDoChoque(15, { recuaB: true }), [0, 1], 'quem recua perde no máximo 1');
  assert.equal(bonusDeVantagens(2), 4);
  assert.equal(bonusDeVantagens(5), BONUS_MAXIMO_DE_VANTAGEM);
  assert.deepEqual(pontosDeMoral(4), [2, 1]);
  assert.deepEqual(pontosDeMoral(10), [5, 2]);
  assert.deepEqual(TAMANHOS_DE_EXERCITO.map((tamanho) => tamanho.forca), [4, 6, 8, 10]);
  assert.equal(PARTES_MAXIMAS_POR_FEITOS, 2);
  // A Vida perdida no feito é fração da Vida máxima, e falhar sempre machuca mais.
  assert.equal(perdaDoFeito(60, true), 6);
  assert.equal(perdaDoFeito(60, false), 15);
  assert.equal(perdaDoFeito(33, true), 4, 'arredonda para cima');
  [10, 47, 200].forEach((vida) => assert.ok(perdaDoFeito(vida, false) > perdaDoFeito(vida, true)));
  assert.doesNotMatch(REGRA_BATALHA.corpo, /DT 10 \+ metade do nível/);
});

test('as quatro cenas novas moram nos capítulos certos e citam só o que existe', () => {
  const capitulo = (id: string) => GRUPOS_NAVEGACAO.find((grupo) => grupo.topicos.includes(id))?.id;
  assert.equal(capitulo('infiltracao'), 'cenas');
  assert.equal(capitulo('investigacao'), 'cenas');
  assert.equal(capitulo('batalha'), 'cenas');
  assert.equal(capitulo('viagem'), 'veiculos');

  const itens = new Set(catalogoLoja.entradas.map((item: any) => item.titulo));
  ['Barraca de Campanha', 'Kit de Disfarce', 'Kit de Arrombamento', 'Tocha'].forEach((nome) => assert.ok(itens.has(nome), `${nome} sumiu da Loja`));

  const condicoes = new Set(CONDICOES_OFICIAIS.map((condicao) => condicao.titulo));
  ['Surpreendido', 'Cego'].forEach((titulo) => assert.ok(condicoes.has(titulo), `${titulo} sumiu das condições`));
  assert.match(REGRA_AFLICOES.corpo, /Beladona Destilada/);

  const fatores = new Set(FATORES_DESCANSO.map((fator) => fator.titulo));
  ['Ficou de guarda', 'Alguém fez a guarda por você'].forEach((titulo) => assert.ok(fatores.has(titulo), `fator "${titulo}" sumiu do Descanso`));

  const detetive = JSON.stringify((classesData as any[]).find((classe) => classe.id === 'detetive'));
  ['Dedução Metódica', 'Golpe de Vista', 'Caso Encerrado'].forEach((nome) => assert.ok(detetive.includes(nome), `o Detetive perdeu ${nome}`));

  const guia = REGRAS_OFICIAIS.mestre.corpo;
  ['Estrada e viagem', 'Acampamento e noite no ermo', 'Ruína, mata e subterrâneo', 'A guarda percebe a invasão', 'NPCs e inimigos de nível alto'].forEach((trecho) => {
    assert.ok(guia.includes(trecho), `o Guia do Mestre perdeu "${trecho}", que as cenas novas citam`);
  });
});
