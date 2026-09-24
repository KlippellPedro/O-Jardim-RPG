import assert from 'node:assert/strict';
import test from 'node:test';
import { rotuloDoEvento, somarMes, textoEmDias } from '../../src/pages/Mundo/calendarioMundo';
import { larguraDasFaixas } from '../../src/components/ui/rasuraUtil';

test('navegar entre meses vira o ano nos dois sentidos', () => {
  assert.deepEqual(somarMes(3, 9, 1), { ano: 4, mes: 0 });
  assert.deepEqual(somarMes(3, 0, -1), { ano: 2, mes: 9 });
  assert.deepEqual(somarMes(1, 5, 0), { ano: 1, mes: 5 });
  assert.deepEqual(somarMes(0, 0, -1), { ano: -1, mes: 9 });
});

test('quantos dias faltam vira texto', () => {
  assert.equal(textoEmDias(0), 'hoje');
  assert.equal(textoEmDias(1), 'amanhã');
  assert.equal(textoEmDias(12), 'em 12 dias');
});

test('rotulo do evento diz o grau e se repete', () => {
  assert.equal(rotuloDoEvento({ revelacao: 'oculto', anual: false }), 'oculto');
  assert.equal(rotuloDoEvento({ revelacao: 'aberto', anual: true }), 'aberto · todo ano');
  assert.equal(rotuloDoEvento({ revelacao: 'rasurado', anual: false, repeticao: 'mensal', duracao: 3 }), 'rasurado · todo mês · 3 dias');
  assert.equal(rotuloDoEvento({ revelacao: 'oculto', anual: true, repeticao: 'anual', duracao: 7 }), 'oculto · todo ano · 7 dias');
  assert.equal(rotuloDoEvento({ revelacao: 'aberto', anual: false, duracao: 1 }), 'aberto');
});

test('rasura e repetivel, respeita os limites e nunca depende do texto real', () => {
  const a = larguraDasFaixas('registro-1', 4);
  assert.deepEqual(a, larguraDasFaixas('registro-1', 4));
  assert.notDeepEqual(a, larguraDasFaixas('registro-2', 4));
  assert.equal(a.length, 4);
  assert.ok(a.every((largura) => largura >= 18 && largura <= 96));
  assert.ok(a[3] <= 58, 'a ultima linha e mais curta, como o fim de um paragrafo');
});

import { marcarComoLido, observarRegistro, type IArmazem } from '../../src/pages/Mundo/revelacao';

const armazemFalso = (): IArmazem => {
  const dados = new Map<string, string>();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => { dados.set(chave, valor); } };
};

test('registro so e "recem-revelado" se a pessoa o viu retido antes, e o brilho some ao abrir', () => {
  const armazem = armazemFalso();
  assert.equal(observarRegistro(armazem, 'c1', 'a', false), false); // sempre foi aberto: nada de novo
  assert.equal(observarRegistro(armazem, 'c1', 'b', true), false);   // retido
  assert.equal(observarRegistro(armazem, 'c1', 'b', false), true);   // o Mestre liberou
  assert.equal(observarRegistro(armazem, 'c1', 'b', false), true);   // continua novo ate abrir
  marcarComoLido(armazem, 'c1', 'b');
  assert.equal(observarRegistro(armazem, 'c1', 'b', false), false);
  assert.equal(observarRegistro(armazem, 'c2', 'b', false), false);  // outra campanha e outra historia
});

test('armazenamento corrompido nao quebra nada', () => {
  const armazem: IArmazem = { getItem: () => '{{{', setItem: () => { throw new Error('cheio'); } };
  assert.equal(observarRegistro(armazem, 'c1', 'a', true), false);
});

test('cada mes e uma lunacao de 28 dias: Nova no dia 1, Cheia no dia 15, e o dia 29 e a Lua Carmesim', async () => {
  const { faseDaLua } = await import('../../src/pages/Mundo/calendarioMundo');
  assert.equal(faseDaLua(1).nome, 'Lua Nova');
  assert.equal(faseDaLua(15).nome, 'Lua Cheia');
  assert.equal(faseDaLua(8).nome, 'Quarto Crescente');
  assert.equal(faseDaLua(22).nome, 'Quarto Minguante');
  assert.equal(faseDaLua(28).nome, 'Lua Nova');
  assert.equal(faseDaLua(29, true).nome, 'Lua Carmesim');
  assert.equal(faseDaLua(29).nome, 'Lua Nova', 'o dia extra dos outros meses fecha a lunação');
  const indices = Array.from({ length: 28 }, (_, i) => faseDaLua(i + 1).indice);
  assert.deepEqual([...new Set(indices)].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(indices.every((atual, i) => i === 0 || atual >= indices[i - 1] || atual === 0), 'as fases avancam sem voltar atras');
});

const CONFIG_DO_ANO = {
  dias_por_mes: [28, 29, 28, 28, 28, 28, 28, 29, 29, 29],
  estacao_por_mes: ['primavera', 'primavera', 'primavera', 'verao', 'verao', 'outono', 'outono', 'outono', 'inverno', 'inverno'] as Array<'primavera' | 'verao' | 'outono' | 'inverno'>,
  dias_especiais: [{ mes: 8, dia: 29, nome: 'Dia da Lua Carmesim' }, { mes: 7, dia: 29, nome: 'Dia Fora do Tempo' }],
};

test('atalhos de tempo contam os dias ate o proximo marco, virando mes e ano', async () => {
  const { atalhosDeTempo, diasAteProximo } = await import('../../src/pages/Mundo/calendarioMundo');
  assert.equal(diasAteProximo({ mes: 0, dia: 10 }, CONFIG_DO_ANO, (data) => data.dia === 15), 5);
  assert.equal(diasAteProximo({ mes: 9, dia: 29 }, CONFIG_DO_ANO, (data) => data.dia === 1), 1, 'vira o ano');
  assert.equal(diasAteProximo({ mes: 8, dia: 28 }, CONFIG_DO_ANO, (data) => data.dia === 29), 1, 'o dia 29 existe no mes do Limiar');
  assert.equal(diasAteProximo({ mes: 0, dia: 1 }, CONFIG_DO_ANO, () => false), null);

  const atalhos = Object.fromEntries(atalhosDeTempo({ mes: 0, dia: 10 }, CONFIG_DO_ANO, [{ em_dias: 0 }, { em_dias: 40 }]).map((a) => [a.id, a.dias]));
  assert.equal(atalhos.mes, 19);
  assert.equal(atalhos.cheia, 5);
  assert.equal(atalhos.estacao, 76, 'a estacao nova comeca no dia 1 do mes 3');
  assert.equal(atalhos['especial-8-29'], 245, 'conta o dia 29 de Alétheia e o do Éon');
  assert.equal(atalhos.evento, 40, 'ignora o acontecimento de hoje');
});

test('quando ja e a Lua Cheia, a proxima e a do mes seguinte', async () => {
  const { diasAteProximo } = await import('../../src/pages/Mundo/calendarioMundo');
  assert.equal(diasAteProximo({ mes: 0, dia: 15 }, CONFIG_DO_ANO, (data) => data.dia === 15), 28);
});

test('tempoDesde escreve o tempo passado em portugues curto', async () => {
  const { tempoDesde } = await import('../../src/pages/Mundo/calendarioMundo');
  const agora = new Date('2026-09-24T12:00:00Z').getTime();
  assert.equal(tempoDesde('2026-09-24T11:59:40Z', agora), 'agora há pouco');
  assert.equal(tempoDesde('2026-09-24T11:55:00Z', agora), 'há 5 min');
  assert.equal(tempoDesde('2026-09-24T09:00:00Z', agora), 'há 3 h');
  assert.equal(tempoDesde('2026-09-21T12:00:00Z', agora), 'há 3 dias');
});
