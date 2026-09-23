import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularDerivadosComClasses } from '../../src/services/calculoService';
import { aplicarDescansoCompleto, aplicarRelaxamento } from '../../src/services/descansoService';
import {
  aceitaTemporario,
  atualizarStatusVital,
  campoTemporario,
  CAMPO_STATUS_RECURSO,
  custoDePoder,
  gastarComTemporario,
  obterTemporario,
  RECURSOS_CUSTO_OPCOES,
  RECURSOS_CUSTO_VALIDOS,
  ROTULO_RECURSO,
  rotuloCustoDePoder,
} from '../../src/services/statusService';
import type { IClasse } from '../../src/types/catalogo';

const atributos = (sobre: Record<string, number> = {}) => ({
  forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10, ...sobre,
});

const classeFisica: IClasse = { id: 'fisica', titulo: 'Física', vida: 5, mana: 1, estamina: 3 };
const classeSemEstamina: IClasse = { id: 'antiga', titulo: 'Antiga', vida: 5, mana: 2 };

test('Estamina aceita extra temporário como Vida e Mana, ao contrário do Cansaço', () => {
  assert.equal(aceitaTemporario('estaminaAtual'), true);
  assert.equal(aceitaTemporario('cansacoAtual'), false);
  assert.equal(campoTemporario('estaminaAtual'), 'estaminaTemporaria');
});

test('cura acima do máximo vira extra de Estamina, e o gasto paga o extra primeiro', () => {
  const curado = atualizarStatusVital({ estaminaAtual: 8 }, 'estaminaAtual', 5, 10, 10);
  assert.equal(curado.estaminaAtual, 10);
  assert.equal(curado.estaminaTemporaria, 3);
  assert.equal(obterTemporario(curado, 'estaminaAtual'), 3);

  const status = { estaminaAtual: 10, estaminaTemporaria: 4 };
  assert.deepEqual(gastarComTemporario(status, 'estaminaAtual', 10, 3), { atual: 10, temporario: 1 });
  assert.deepEqual(gastarComTemporario(status, 'estaminaAtual', 10, 7), { atual: 7, temporario: 0 });
});

test('Estamina nunca fica abaixo de zero pelos botões da ficha', () => {
  const vazio = atualizarStatusVital({ estaminaAtual: 2 }, 'estaminaAtual', -10, 10, 10);
  assert.equal(vazio.estaminaAtual, 0);
});

test('todo recurso de custo tem rótulo e campo na ficha, e Estamina está entre eles', () => {
  const valores = RECURSOS_CUSTO_OPCOES.map((opcao) => opcao.value);
  assert.ok(valores.includes('estamina'));
  assert.equal(ROTULO_RECURSO.estamina, 'Estamina');
  assert.equal(CAMPO_STATUS_RECURSO.estamina, 'estaminaAtual');

  // Invariante da consolidação: nenhuma opção (fora "nenhum") fica sem campo
  // de status, senão gastar aquele recurso não teria onde debitar.
  for (const valor of valores.filter((item) => item !== 'nenhum')) {
    assert.ok(CAMPO_STATUS_RECURSO[valor as keyof typeof CAMPO_STATUS_RECURSO], `sem campo de status para ${valor}`);
  }
  assert.deepEqual([...RECURSOS_CUSTO_VALIDOS].sort(), ['cansaco', 'estamina', 'mana', 'sanidade', 'vida']);
});

test('Estamina base é 3 vezes o melhor entre Força e Destreza: quem luta na força e na agilidade rendem igual', () => {
  const porForca = calcularDerivadosComClasses(atributos({ forca: 16 }), null, [], [], 1);
  const porDestreza = calcularDerivadosComClasses(atributos({ destreza: 16 }), null, [], [], 1);
  assert.equal(porForca.estamina, 9);
  assert.equal(porDestreza.estamina, 9);

  const misto = calcularDerivadosComClasses(atributos({ forca: 14, destreza: 16 }), null, [], [], 1);
  assert.equal(misto.estamina, 9, 'vale o maior dos dois, não a soma');
});

test('Fluxo não mexe na Estamina (Fluxo é o atributo de controle mágico)', () => {
  const baixo = calcularDerivadosComClasses(atributos({ forca: 14, fluxo: 4 }), null, [], [], 1);
  const alto = calcularDerivadosComClasses(atributos({ forca: 14, fluxo: 20 }), null, [], [], 1);
  assert.equal(baixo.estamina, alto.estamina);
});

test('cada nível de classe soma a Estamina declarada no catálogo', () => {
  const derivados = calcularDerivadosComClasses(
    atributos({ forca: 12 }),
    null,
    [{ classeId: 'fisica', nivel: 10 }],
    [classeFisica],
    10,
  );
  // 3 x mod Força (+1) = 3, mais 10 níveis x 3 de Estamina por nível.
  assert.equal(derivados.estamina, 3 + 10 * 3);
});

test('classe que ainda não declarou Estamina não ganha ponto de graça por nível', () => {
  const semClasse = calcularDerivadosComClasses(atributos({ forca: 12 }), null, [], [], 1);
  const comClasseAntiga = calcularDerivadosComClasses(
    atributos({ forca: 12 }),
    null,
    [{ classeId: 'antiga', nivel: 20 }],
    [classeSemEstamina],
    20,
  );
  assert.equal(comClasseAntiga.estamina, semClasse.estamina, 'só a fórmula de atributo vale enquanto a classe não migrou');
});

test('Estamina nunca fica abaixo de 1, mesmo com Força e Destreza baixas', () => {
  const fraco = calcularDerivadosComClasses(atributos({ forca: 4, destreza: 4 }), null, [], [], 1);
  assert.equal(fraco.estamina, 1);
});

test('descanso completo devolve Estamina na mesma proporção de Vida e Mana e zera o extra', () => {
  const resultado = aplicarDescansoCompleto(
    { vidaAtual: 10, manaAtual: 0, estaminaAtual: 2, estaminaTemporaria: 4 },
    { vida: 100, mana: 40, estamina: 20, sanidade: 100 },
    'boa',
  );
  // Descanso "boa" recupera metade (vide o teste de Vida/Mana: 40 -> +20).
  assert.equal(resultado.estaminaAtual, 12);
  assert.equal(resultado.estaminaTemporaria, 0);
});

test('descanso sem máximo de Estamina não escreve campo novo na ficha', () => {
  const resultado = aplicarDescansoCompleto(
    { vidaAtual: 10, manaAtual: 0 },
    { vida: 100, mana: 40, sanidade: 100 },
    'boa',
  );
  assert.equal('estaminaAtual' in resultado, false);
  assert.equal('estaminaTemporaria' in resultado, false);
});

test('Relaxar rola uma vez e o mesmo valor volta para Mana e para Estamina', () => {
  // d6 = 4, Sabedoria 14 (+2), nível 8 (+2) = 8 recuperados em cada pool.
  const resultado = aplicarRelaxamento({ manaAtual: 2, estaminaAtual: 1 }, 20, 14, 8, 4, 10);
  assert.equal(resultado.recuperado, 8);
  assert.equal(resultado.recuperadoEstamina, 8);
  assert.equal(resultado.status.manaAtual, 10);
  assert.equal(resultado.status.estaminaAtual, 9);
  assert.equal(resultado.status.relaxouDesdeDescanso, true);
});

test('Relaxar respeita o máximo de cada pool separadamente', () => {
  const resultado = aplicarRelaxamento({ manaAtual: 2, estaminaAtual: 8 }, 20, 14, 8, 4, 10);
  assert.equal(resultado.recuperado, 8, 'Mana tem folga pra receber tudo');
  assert.equal(resultado.recuperadoEstamina, 2, 'Estamina só cabe mais 2 até o máximo');
  assert.equal(resultado.status.estaminaAtual, 10);
});

test('Relaxar sem máximo de Estamina continua mexendo só na Mana', () => {
  const resultado = aplicarRelaxamento({ manaAtual: 2 }, 20, 14, 8, 4);
  assert.equal(resultado.recuperado, 8);
  assert.equal(resultado.recuperadoEstamina, 0);
  assert.equal('estaminaAtual' in resultado.status, false);
});

test('Relaxar continua limitado a uma vez entre descansos, para os dois recursos', () => {
  const primeira = aplicarRelaxamento({ manaAtual: 0, estaminaAtual: 0 }, 20, 14, 8, 4, 10);
  const segunda = aplicarRelaxamento(primeira.status, 20, 14, 8, 4, 10);
  assert.ok(segunda.erro);
  assert.equal(segunda.recuperadoEstamina, 0);
  assert.equal(segunda.status.estaminaAtual, primeira.status.estaminaAtual);
});

test('poder gasta Estamina quando declara custo físico, Mana quando só declara o místico, nada quando os dois são zero', () => {
  assert.deepEqual(custoDePoder({ custoMana: 0, custoEstamina: 3 }), { recurso: 'estamina', valor: 3 });
  assert.deepEqual(custoDePoder({ custoMana: 4 }), { recurso: 'mana', valor: 4 });
  assert.deepEqual(custoDePoder({ custoMana: 0, custoEstamina: 0 }), { recurso: 'nenhum', valor: 0 });
  assert.deepEqual(custoDePoder(undefined), { recurso: 'nenhum', valor: 0 });
});

test('poder nunca cobra os dois recursos: se declarar os dois, vale só a Estamina', () => {
  assert.deepEqual(custoDePoder({ custoMana: 5, custoEstamina: 2 }), { recurso: 'estamina', valor: 2 });
});

test('custo inválido ou negativo não vira gasto nenhum', () => {
  assert.deepEqual(custoDePoder({ custoMana: -3, custoEstamina: Number.NaN }), { recurso: 'nenhum', valor: 0 });
});

test('rótulo do custo diz o recurso certo e some quando o poder é passivo', () => {
  assert.equal(rotuloCustoDePoder({ custoEstamina: 3 }), '3 Estamina');
  assert.equal(rotuloCustoDePoder({ custoMana: 2 }), '2 Mana');
  assert.equal(rotuloCustoDePoder({ custoMana: 0, custoEstamina: 0 }), '');
});

test('resumo da classe mostra a Estamina quando a classe já migrou e some quando não', async () => {
  const { formatarResumoClasse } = await import('../../src/services/classeService');
  assert.equal(formatarResumoClasse(classeFisica), 'Vida: 5 | Mana: 1 | Estamina: 3');
  assert.equal(formatarResumoClasse(classeSemEstamina), 'Vida: 5 | Mana: 2');
});

test('combate intenso também vale quando gasta metade da Estamina', async () => {
  const { combateFoiIntenso } = await import('../../src/services/descansoService');
  assert.equal(combateFoiIntenso({ gastouMetadeEstamina: true }), true);
  assert.equal(combateFoiIntenso({}), false);
});
