import assert from 'node:assert/strict';
import test from 'node:test';
import { rotuloDoEvento, somarMes, textoEmDias } from '../../src/pages/Mundo/calendarioMundo';
import { larguraDasFaixas } from '../../src/components/ui/rasuraUtil';
import { ApiError, MENSAGEM_RESPOSTA_INCOMPLETA } from '../../src/services/apiClient';
import { calendarioMundoApi, detalheTecnico } from '../../src/services/calendarioMundoApi';

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

// ---------------------------------------------------------------- ler o calendário sem quebrar a tela

const CALENDARIO_MINIMO = {
  hoje: { ano: 1, mes: 0, dia: 1 },
  mes: { ano: 1, mes: 0, nome: 'Gênese', dias: [] },
  proximos: [],
  gestor: false,
};
const jsonDoCalendario = () => new Response(JSON.stringify(CALENDARIO_MINIMO), { status: 200, headers: { 'content-type': 'application/json' } });
const htmlNoLugar = () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });

/** Troca o fetch por uma fila de respostas (a última se repete) e conta as chamadas. */
const comRespostas = (fila: Array<() => Response>) => {
  const fetchOriginal = globalThis.fetch;
  (globalThis as { document?: unknown }).document = { cookie: '' };
  let chamadas = 0;
  globalThis.fetch = (async () => {
    const resposta = fila[Math.min(chamadas, fila.length - 1)];
    chamadas += 1;
    return resposta();
  }) as typeof fetch;
  return {
    chamadas: () => chamadas,
    restaurar: () => {
      globalThis.fetch = fetchOriginal;
      delete (globalThis as { document?: unknown }).document;
    },
  };
};

test('o calendário chega na primeira tentativa quando a resposta é boa', async () => {
  const rede = comRespostas([jsonDoCalendario]);
  try {
    const calendario = await calendarioMundoApi.obter('c1');
    assert.equal(calendario.mes.nome, 'Gênese');
    assert.equal(rede.chamadas(), 1);
  } finally {
    rede.restaurar();
  }
});

test('resposta cortada ou trocada por HTML ganha uma segunda tentativa, e a segunda boa resolve', async () => {
  for (const ruim of [htmlNoLugar, () => new Response('{"hoje":', { status: 200, headers: { 'content-type': 'application/json' } })]) {
    const rede = comRespostas([ruim, jsonDoCalendario]);
    try {
      const calendario = await calendarioMundoApi.obter('c1', 1, 3);
      assert.equal(calendario.hoje.dia, 1);
      assert.equal(rede.chamadas(), 2);
    } finally {
      rede.restaurar();
    }
  }
});

test('se as duas tentativas vierem sem calendário, o erro diz o que o navegador recebeu', async () => {
  const rede = comRespostas([htmlNoLugar]);
  try {
    await assert.rejects(
      () => calendarioMundoApi.obter('c1'),
      (erro: unknown) => erro instanceof ApiError
        && erro.message === MENSAGEM_RESPOSTA_INCOMPLETA
        && detalheTecnico(erro) === 'HTTP 200 · text/html; charset=utf-8 · tipo inesperado',
    );
    assert.equal(rede.chamadas(), 2, 'uma tentativa a mais, não um laço');
  } finally {
    rede.restaurar();
  }
});

test('JSON de outro formato (sem mes e hoje) também é erro legível, não um quebra-tela', async () => {
  const rede = comRespostas([() => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })]);
  try {
    await assert.rejects(
      () => calendarioMundoApi.obter('c1'),
      (erro: unknown) => erro instanceof ApiError && detalheTecnico(erro) === 'application/json · formato inesperado',
    );
  } finally {
    rede.restaurar();
  }
});

test('erro do servidor (403, 404, 500) não tenta de novo e mantém a mensagem dele', async () => {
  for (const status of [403, 404, 500]) {
    const rede = comRespostas([() => new Response(JSON.stringify({ detail: 'o calendario do mundo ainda nao foi liberado' }), { status, headers: { 'content-type': 'application/json' } })]);
    try {
      await assert.rejects(
        () => calendarioMundoApi.obter('c1'),
        (erro: unknown) => erro instanceof ApiError && erro.status === status && erro.message === 'o calendario do mundo ainda nao foi liberado',
      );
      assert.equal(rede.chamadas(), 1, `status ${status}`);
    } finally {
      rede.restaurar();
    }
  }
});

test('ação do Mestre sem corpo de calendário avisa, e não repete (agir duas vezes não é a mesma coisa)', async () => {
  const rede = comRespostas([htmlNoLugar]);
  try {
    await assert.rejects(() => calendarioMundoApi.avancar('c1', 3), (erro: unknown) => erro instanceof ApiError && erro.status === 0);
    assert.equal(rede.chamadas(), 1);
  } finally {
    rede.restaurar();
  }
});

test('detalheTecnico só fala de resposta sem corpo; o resto do erro fica quieto', () => {
  assert.equal(detalheTecnico(new Error('qualquer')), '');
  assert.equal(detalheTecnico(new ApiError('o servidor disse não', 403, 'texto solto')), '');
  assert.equal(detalheTecnico(new ApiError('x', 0, { http: 0, tipo: 'application/json', motivo: 'corpo vazio' })), 'application/json · corpo vazio');
});
