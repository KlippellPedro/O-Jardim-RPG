import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  aplicarDanoVeiculo,
  AVARIAS_VEICULO,
  calcularDanoAposResistencia,
  calcularVidaRestauradaPorManutencao,
  DANO_COLISAO_POR_TAMANHO,
  deslocarFaixaPerseguicao,
  FAIXAS_PERSEGUICAO,
  MANOBRAS_VEICULARES,
  MAX_AVARIAS_ATIVAS,
  MAX_PASSOS_POR_DISPUTA,
  obterEstadoVeiculo,
  PAPEIS_TRIPULACAO,
  PATAMARES_TIER_VEICULO,
  REGRA_VEICULOS,
  resolverDisputaPerseguicao,
} from '../../data/regras/veiculosCombate.ts';

const catalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
) as { entradas: Array<{ tipo: string; id: string; conteudo: Record<string, any> }> };

test('usa a mesma escala de Vida e dano dos personagens', () => {
  assert.equal(calcularDanoAposResistencia(17, 5), 12);
  assert.equal(calcularDanoAposResistencia(4, 8), 0);
  assert.deepEqual(aplicarDanoVeiculo(20, 20, 12, 2), {
    danoRecebido: 10,
    vidaAtual: 10,
    estado: 'danificado',
    avariasGeradas: 1,
  });
  assert.deepEqual(aplicarDanoVeiculo(3, 20, 20, 0), {
    danoRecebido: 20,
    vidaAtual: 0,
    estado: 'incapacitado',
    avariasGeradas: 1,
  });
  assert.equal(aplicarDanoVeiculo(20, 20, 30, 0).avariasGeradas, 2);
  assert.doesNotMatch(REGRA_VEICULOS.corpo, /10\s*(?:vezes|x|×)|cada ponto[^.]{0,30}10 de dano/i);
  assert.match(REGRA_VEICULOS.corpo, /mesma escala de Vida e dano/i);
});

test('classifica estado e dimensiona manutenção pela Vida máxima', () => {
  assert.equal(obterEstadoVeiculo(51, 100), 'operacional');
  assert.equal(obterEstadoVeiculo(50, 100), 'danificado');
  assert.equal(obterEstadoVeiculo(0, 100), 'incapacitado');
  assert.equal(calcularVidaRestauradaPorManutencao(5), 1);
  assert.equal(calcularVidaRestauradaPorManutencao(80), 8);
  assert.throws(() => obterEstadoVeiculo(0, 0), /Vida máxima/);
});

test('perseguição possui quatro faixas ativas e um estado terminal', () => {
  assert.deepEqual(FAIXAS_PERSEGUICAO.map(item => item.id), [
    'contato', 'curta', 'média', 'longa', 'escapou',
  ]);
  assert.deepEqual(FAIXAS_PERSEGUICAO.map(item => item.ordem), [0, 1, 2, 3, 4]);
  assert.equal(FAIXAS_PERSEGUICAO.filter(item => item.permiteColisao).length, 1);
  assert.equal(FAIXAS_PERSEGUICAO.filter(item => item.permiteAbordagem).length, 1);
  assert.equal(deslocarFaixaPerseguicao('contato', -4), 'contato');
  assert.equal(deslocarFaixaPerseguicao('longa', 1), 'escapou');
  assert.equal(deslocarFaixaPerseguicao('escapou', -2), 'escapou');
});

test('disputa altera no máximo duas faixas e respeita empate', () => {
  assert.equal(MAX_PASSOS_POR_DISPUTA, 2);
  assert.equal(resolverDisputaPerseguicao('média', 18, 15), 'longa');
  assert.equal(resolverDisputaPerseguicao('média', 25, 15), 'escapou');
  assert.equal(resolverDisputaPerseguicao('média', 10, 20), 'contato');
  assert.equal(resolverDisputaPerseguicao('curta', 15, 15), 'curta');
});

test('manobras têm ids únicos, custo, teste e consequência de falha', () => {
  const ids = MANOBRAS_VEICULARES.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(MANOBRAS_VEICULARES.every(item => item.acao && item.teste && item.efeito && item.falha));
  assert.deepEqual(MANOBRAS_VEICULARES.find(item => item.id === 'abalroar')?.faixas, ['contato']);
  assert.deepEqual(MANOBRAS_VEICULARES.find(item => item.id === 'abordar')?.faixas, ['contato']);
  assert.match(REGRA_VEICULOS.corpo, /não pode Acelerar[^.]+Abalroar/i);
});

test('colisões usam dados comuns e cobrem cinco tamanhos', () => {
  assert.deepEqual(DANO_COLISAO_POR_TAMANHO, {
    pequeno: '1d6',
    médio: '2d6',
    grande: '4d6',
    enorme: '6d6',
    colossal: '8d6',
  });
  assert.ok(Object.values(DANO_COLISAO_POR_TAMANHO).every(dano => /^\d+d6$/.test(dano)));
  assert.match(REGRA_VEICULOS.corpo, /Cada envolvido sofre o dano correspondente ao tamanho do outro/i);
});

test('avarias são limitadas e cobrem os seis subsistemas', () => {
  assert.equal(AVARIAS_VEICULO.length, 6);
  assert.equal(MAX_AVARIAS_ATIVAS, 6);
  assert.deepEqual(AVARIAS_VEICULO.map(item => item.d6), [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(AVARIAS_VEICULO.map(item => item.id)).size, 6);
  assert.ok(AVARIAS_VEICULO.every(item => item.repeticao.length > 0));
});

test('separa papéis da tripulação sem conceder ações ao veículo', () => {
  assert.deepEqual(PAPEIS_TRIPULACAO.map(item => item.id), [
    'condutor', 'artilheiro', 'operador', 'passageiro',
  ]);
  assert.match(REGRA_VEICULOS.corpo, /veículo não recebe ações próprias/i);
  assert.match(REGRA_VEICULOS.corpo, /não recebe ações adicionais/i);
});

test('Pilotagem não é exclusiva da classe Piloto e Cavalgar rege montarias', () => {
  assert.match(REGRA_VEICULOS.corpo, /Qualquer personagem treinado[^.]+pode conduzir/i);
  assert.match(REGRA_VEICULOS.corpo, /classe Piloto[^.]+não é pré-requisito/i);
  assert.match(REGRA_VEICULOS.corpo, /Veículos usam <strong>Pilotagem<\/strong>/i);
  assert.match(REGRA_VEICULOS.corpo, /Montarias usam <strong>Cavalgar<\/strong>/i);
  assert.match(REGRA_VEICULOS.corpo, /Montaria voadora/i);
});

test('tiers preservam os patamares sem definir preços novos', () => {
  assert.deepEqual(PATAMARES_TIER_VEICULO.map(item => item.tier), ['T0', 'T1', 'T2', 'T3', 'T4']);
  assert.match(PATAMARES_TIER_VEICULO[4].uso, /Mestre/i);
  assert.match(REGRA_VEICULOS.corpo, /preços existentes permanecem no catálogo/i);
  assert.doesNotMatch(REGRA_VEICULOS.corpo, /T4[^<]{0,80}\d+[.,]?\d*\s*Lunaris/i);
});

test('texto mantém redação normativa sem diálogo ou bordão', () => {
  assert.doesNotMatch(REGRA_VEICULOS.corpo, /[“”"]{2}|o texto manda|o Mestre arbitra|em outras palavras/i);
  assert.doesNotMatch(REGRA_VEICULOS.corpo, /incrível|cinematográfic|épico demais|frase de efeito/i);
});

test('veículos completos publicam os campos necessários para combate', () => {
  const completos = catalogo.entradas.filter((entrada) => entrada.tipo === 'veiculo-completo');
  assert.equal(completos.length, 16);
  for (const veiculo of completos) {
    const texto = veiculo.conteudo.descricao ?? '';
    for (const campo of ['Vida', 'Defesa', 'Resistência', 'deslocamento', 'Manobrabilidade', 'capacidade', 'cobertura', 'tripulação mínima', 'sistemas ativos', 'espaços de base']) {
      assert.match(texto, new RegExp(campo, 'i'), `${veiculo.id}: ${campo}`);
    }
  }
});

test('veículos prontos cobrem entrada, utilidade, combate e faixas de preço', () => {
  const completos = catalogo.entradas.filter((entrada) => entrada.tipo === 'veiculo-completo');
  const novosIds = [
    'veiculo-patinete-faisca',
    'veiculo-triciclo-formiga',
    'veiculo-motoneta-andorinha',
    'veiculo-jipe-pioneiro',
    'veiculo-ambulancia-gralha',
    'veiculo-barco-arraia',
    'veiculo-van-cofre',
    'veiculo-interceptor-vespa',
    'veiculo-aerobarco-albatroz',
    'veiculo-correio-sussurro',
  ];
  const porId = new Map(completos.map(item => [item.id, item]));
  for (const id of novosIds) assert.ok(porId.has(id), `${id}: opção pronta ausente`);

  const precos = completos.map(item => Number(item.conteudo.preco?.Lunaris));
  assert.ok(precos.some(preco => preco <= 1_000), 'falta veículo de entrada até 1.000 Lunaris');
  assert.ok(precos.some(preco => preco > 1_000 && preco <= 5_000), 'falta veículo entre 1.001 e 5.000 Lunaris');
  assert.ok(precos.some(preco => preco > 5_000 && preco <= 20_000), 'falta veículo entre 5.001 e 20.000 Lunaris');
  assert.ok(precos.some(preco => preco > 20_000), 'falta veículo acima de 20.000 Lunaris');

  const raridades = new Set(completos.map(item => String(item.conteudo.raridade).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  for (const raridade of ['comum', 'incomum', 'raro', 'epico', 'lendario']) {
    assert.ok(raridades.has(raridade), `falta veículo pronto de raridade ${raridade}`);
  }

  const perfisNovos = novosIds.map((id) => {
    const item = porId.get(id)!;
    return [
      item.conteudo.vidaMaxima,
      item.conteudo.defesa,
      item.conteudo.resistencia,
      item.conteudo.deslocamentoMetros,
      item.conteudo.capacidade,
    ].join(':');
  });
  assert.equal(new Set(perfisNovos).size, novosIds.length, 'os novos veículos devem ter perfis mecânicos distintos');
});
