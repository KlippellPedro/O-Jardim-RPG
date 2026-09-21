import assert from 'node:assert/strict';
import test from 'node:test';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { TABELA_XP } from '../../src/services/calculoService';
import {
  aplicarCenario,
  cenarioInicial,
  formatarDelta,
  formatarValorLinha,
  limitarAjusteAtributo,
  simularCenario,
  slotsDaFicha,
} from '../../src/pages/Ficha/utils/simuladorNivel';

const classe = CLASSES_CATALOGO.find((item) => item.id === 'guerreiro' && item.progressao?.length)
  ?? CLASSES_CATALOGO.find((item) => item.progressao?.length && item.poderes?.length)!;

const fichaNivel = (nivel: number, extra: Record<string, unknown> = {}) => ({
  racaId: 'humano',
  classes: [{ classeId: classe.id, nivel }],
  nivel,
  xp: 0,
  atributosFinais: { forca: 14, destreza: 12, constituicao: 12, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10 },
  ...extra,
});

const linha = (resultado: ReturnType<typeof simularCenario>, chave: string) => resultado.linhas.find((item) => item.chave === chave)!;

test('cenario igual a ficha nao muda nada', () => {
  const ficha = fichaNivel(3);
  const resultado = simularCenario(ficha, cenarioInicial(ficha));
  assert.equal(resultado.mudou, false);
  assert.equal(resultado.nivelAtual, 3);
  assert.equal(resultado.nivelSimulado, 3);
  assert.ok(resultado.linhas.every((item) => item.delta === 0));
  assert.equal(resultado.recompensas.length, 0);
});

test('subir de nivel soma vida e mana por nivel da classe', () => {
  const ficha = fichaNivel(3);
  const resultado = simularCenario(ficha, { niveis: { [classe.id]: 8 }, atributos: {} });
  assert.equal(resultado.mudou, true);
  assert.equal(resultado.nivelSimulado, 8);
  assert.equal(linha(resultado, 'vida').delta, 5 * Math.max(1, Number(classe.vida)));
  assert.equal(linha(resultado, 'mana').delta, 5 * Math.max(1, Number(classe.mana)));
});

test('recompensas listadas ficam entre o nivel atual e o simulado, em ordem', () => {
  const ficha = fichaNivel(3);
  const resultado = simularCenario(ficha, { niveis: { [classe.id]: 10 }, atributos: {} });
  assert.ok(resultado.recompensas.length > 0);
  assert.ok(resultado.recompensas.every((item) => item.nivel > 3 && item.nivel <= 10));
  const niveis = resultado.recompensas.map((item) => item.nivel);
  assert.deepEqual(niveis, [...niveis].sort((a, b) => a - b));
});

test('so simula para frente: nunca abaixo do nivel atual nem acima do 20', () => {
  const ficha = fichaNivel(3);
  assert.equal(simularCenario(ficha, { niveis: { [classe.id]: 99 }, atributos: {} }).nivelSimulado, 20);
  const abaixo = simularCenario(ficha, { niveis: { [classe.id]: 1 }, atributos: {} });
  assert.equal(abaixo.nivelSimulado, 3);
  assert.equal(abaixo.mudou, false);
});

test('atributo a mais muda o modificador e a vida, sem tocar na ficha original', () => {
  const ficha = fichaNivel(3);
  const copia = JSON.parse(JSON.stringify(ficha));
  const resultado = simularCenario(ficha, { niveis: cenarioInicial(ficha).niveis, atributos: { constituicao: 4 } });
  const mod = linha(resultado, 'constituicao');
  assert.equal(mod.grupo, 'atributos');
  assert.equal(mod.delta, 2);
  assert.equal(linha(resultado, 'vida').delta, 4 * 2);
  assert.deepEqual(ficha, copia);
});

test('ajuste de atributo e limitado a mais ou menos 10', () => {
  assert.equal(limitarAjusteAtributo(50), 10);
  assert.equal(limitarAjusteAtributo(-50), -10);
  assert.equal(limitarAjusteAtributo('abc'), 0);
});

test('xp necessario acompanha a tabela e nunca fica negativo', () => {
  const ficha = fichaNivel(3, { xp: 999_999 });
  const resultado = simularCenario(ficha, { niveis: { [classe.id]: 6 }, atributos: {} });
  assert.equal(resultado.xp.necessario, TABELA_XP[5]);
  assert.equal(resultado.xp.faltam, 0);
  const pobre = simularCenario(fichaNivel(3, { xp: 0 }), { niveis: { [classe.id]: 6 }, atributos: {} });
  assert.equal(pobre.xp.faltam, TABELA_XP[5]);
});

test('poderes: subir de nivel libera vagas e marca o que passa a poder ser escolhido', () => {
  const ficha = fichaNivel(1);
  const resultado = simularCenario(ficha, { niveis: { [classe.id]: 20 }, atributos: {} });
  const grupo = resultado.poderes.find((item) => item.classeId === classe.id);
  assert.ok(grupo, 'a classe deveria aparecer nos poderes');
  assert.ok(grupo!.vagasSimuladas >= grupo!.vagasAtuais);
  assert.ok(grupo!.opcoes.length > 0);
  const situacoes = grupo!.opcoes.map((opcao) => opcao.situacao);
  const ordem = { libera: 0, agora: 1, bloqueado: 2 } as const;
  assert.deepEqual(situacoes, [...situacoes].sort((a, b) => ordem[a] - ordem[b]));
  assert.ok(grupo!.opcoes.filter((opcao) => opcao.situacao === 'bloqueado').every((opcao) => opcao.motivo));
});

test('aplicarCenario preserva o resto da ficha e recalcula o nivel total', () => {
  const ficha = fichaNivel(3, { titulo: 'A Tempestade' });
  const simulada = aplicarCenario(ficha, { niveis: { [classe.id]: 7 }, atributos: {} });
  assert.equal(simulada.titulo, 'A Tempestade');
  assert.equal(simulada.nivel, 7);
  assert.deepEqual(slotsDaFicha(simulada), [{ classeId: classe.id, nivel: 7 }]);
});

test('ficha antiga so com classeId tambem simula', () => {
  const antiga = { racaId: 'humano', classeId: classe.id, nivel: 2, atributosFinais: fichaNivel(2).atributosFinais };
  assert.deepEqual(slotsDaFicha(antiga), [{ classeId: classe.id, nivel: 2 }]);
  assert.equal(simularCenario(antiga, { niveis: { [classe.id]: 5 }, atributos: {} }).nivelSimulado, 5);
});

test('formatacao de valores e deltas', () => {
  assert.equal(formatarValorLinha(3, 'modificador'), '+3');
  assert.equal(formatarValorLinha(-1, 'modificador'), '-1');
  assert.equal(formatarValorLinha(10.5, 'decimal'), '10,5');
  assert.equal(formatarDelta(0, 'inteiro'), '=');
  assert.equal(formatarDelta(12, 'inteiro'), '+12');
  assert.equal(formatarDelta(-1.5, 'decimal'), '−1,5');
});
