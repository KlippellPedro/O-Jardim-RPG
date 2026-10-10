import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESTACOES_DO_CLIMA,
  PARTICULAS_DA_ESTACAO,
  SEM_CLIMA,
  aplicarClima,
  climaDoCalendario,
  lerClimaDaRaiz,
  limparClima,
  mesmoClima,
  quantidadeDeParticulas,
  type RaizComDataset,
} from '../../src/components/clima/climaDoMundo';
import {
  avancarParticula,
  avancarVida,
  criarParticula,
  rgba,
  type Aleatorio,
} from '../../src/components/clima/particulasDoClima';

const raizFalsa = (): RaizComDataset => ({ dataset: {} });

/** Sorteio previsível: devolve os valores em sequência e recomeça. */
const sequencia = (...valores: number[]): Aleatorio => {
  let i = 0;
  return () => valores[i++ % valores.length];
};

test('o calendário vira clima: a estação que vale hoje e a Lua Carmesim', () => {
  assert.deepEqual(climaDoCalendario({ estacao: { chave: 'outono' }, hoje_lua_carmesim: false }), { estacao: 'outono', luaCarmesim: false });
  assert.deepEqual(climaDoCalendario({ estacao: { chave: 'eclipse' }, hoje_lua_carmesim: true }), { estacao: 'eclipse', luaCarmesim: true });
  assert.deepEqual(climaDoCalendario({ estacao: { chave: 'noite_eterna' } }), { estacao: 'noite_eterna', luaCarmesim: false });
});

test('calendário vazio, sem estação ou com estação desconhecida não pinta nada', () => {
  assert.deepEqual(climaDoCalendario(null), SEM_CLIMA);
  assert.deepEqual(climaDoCalendario(undefined), SEM_CLIMA);
  assert.deepEqual(climaDoCalendario({}), SEM_CLIMA);
  assert.deepEqual(climaDoCalendario({ estacao: { chave: 'monção' as never } }), SEM_CLIMA);
  assert.equal(climaDoCalendario({ hoje_lua_carmesim: 'sim' as never }).luaCarmesim, false, 'só true de verdade conta');
});

test('comparar dois climas', () => {
  assert.equal(mesmoClima({ estacao: 'inverno', luaCarmesim: false }, { estacao: 'inverno', luaCarmesim: false }), true);
  assert.equal(mesmoClima({ estacao: 'inverno', luaCarmesim: false }, { estacao: 'inverno', luaCarmesim: true }), false);
  assert.equal(mesmoClima(SEM_CLIMA, { estacao: 'verao', luaCarmesim: false }), false);
});

test('aplicar e limpar o clima na raiz do documento', () => {
  const raiz = raizFalsa();
  aplicarClima(raiz, { estacao: 'primavera', luaCarmesim: true });
  assert.equal(raiz.dataset.climaEstacao, 'primavera');
  assert.equal(raiz.dataset.climaLua, 'on');
  aplicarClima(raiz, { estacao: 'inverno', luaCarmesim: false });
  assert.equal(raiz.dataset.climaEstacao, 'inverno');
  assert.equal('climaLua' in raiz.dataset, false, 'sem Lua Carmesim o atributo sai de vez');
  limparClima(raiz);
  assert.deepEqual(raiz.dataset, {});
});

test('o fundo lê o clima da raiz, e o interruptor desligado vence tudo', () => {
  const raiz = raizFalsa();
  assert.deepEqual(lerClimaDaRaiz(raiz), SEM_CLIMA);
  aplicarClima(raiz, { estacao: 'eclipse', luaCarmesim: true });
  assert.deepEqual(lerClimaDaRaiz(raiz), { estacao: 'eclipse', luaCarmesim: true });
  raiz.dataset.climaMundo = 'on';
  assert.deepEqual(lerClimaDaRaiz(raiz), { estacao: 'eclipse', luaCarmesim: true });
  raiz.dataset.climaMundo = 'off';
  assert.equal(lerClimaDaRaiz(raiz), null);
  raiz.dataset.climaMundo = 'on';
  raiz.dataset.climaEstacao = 'estação inventada';
  assert.equal(lerClimaDaRaiz(raiz)?.estacao, null);
});

test('toda estação tem partículas com valores que fazem sentido', () => {
  assert.deepEqual(Object.keys(PARTICULAS_DA_ESTACAO).sort(), [...ESTACOES_DO_CLIMA].sort());
  for (const estacao of ESTACOES_DO_CLIMA) {
    const spec = PARTICULAS_DA_ESTACAO[estacao];
    assert.ok(spec.quantidade > 0 && spec.quantidade <= 60, `${estacao}: quantidade`);
    assert.ok(spec.tamanho[0] > 0 && spec.tamanho[0] < spec.tamanho[1], `${estacao}: tamanho`);
    assert.ok(spec.velocidade[0] > 0 && spec.velocidade[0] < spec.velocidade[1], `${estacao}: velocidade`);
    assert.ok(spec.alfa[0] > 0 && spec.alfa[0] < spec.alfa[1] && spec.alfa[1] <= 1, `${estacao}: alfa`);
    assert.ok(spec.cores.length > 0, `${estacao}: cores`);
    for (const cor of spec.cores) assert.ok(cor.every((canal) => canal >= 0 && canal <= 255), `${estacao}: cor ${cor}`);
  }
});

test('cada estação tem o seu tipo de partícula: pétala, vaga-lume, folha, neve, vaga-lume frio e brasa', () => {
  assert.equal(PARTICULAS_DA_ESTACAO.primavera.tipo, 'petala');
  assert.equal(PARTICULAS_DA_ESTACAO.verao.tipo, 'vagalume');
  assert.equal(PARTICULAS_DA_ESTACAO.outono.tipo, 'folha');
  assert.equal(PARTICULAS_DA_ESTACAO.inverno.tipo, 'neve');
  assert.equal(PARTICULAS_DA_ESTACAO.noite_eterna.tipo, 'vagalume');
  assert.equal(PARTICULAS_DA_ESTACAO.eclipse.tipo, 'brasa');
});

test('a quantidade acompanha a área da tela, com piso e teto', () => {
  assert.equal(quantidadeDeParticulas(40, 1280, 720), 40);
  assert.equal(quantidadeDeParticulas(40, 1, 1), 20, 'tela minúscula: metade');
  assert.equal(quantidadeDeParticulas(40, 5120, 2880), 64, 'tela enorme: no máximo 1,6 vez');
  assert.ok(quantidadeDeParticulas(40, 1920, 1080) > 40);
  assert.equal(quantidadeDeParticulas(0, 1280, 720), 0);
});

test('a partícula nasce dentro das faixas da estação', () => {
  const spec = PARTICULAS_DA_ESTACAO.outono;
  for (const sorteio of [0, 0.25, 0.5, 0.999]) {
    const particula = criarParticula(spec, () => sorteio, true);
    assert.ok(particula.tam >= spec.tamanho[0] && particula.tam <= spec.tamanho[1]);
    assert.ok(particula.vel >= spec.velocidade[0] && particula.vel <= spec.velocidade[1]);
    assert.ok(particula.alfa >= spec.alfa[0] && particula.alfa <= spec.alfa[1]);
    assert.ok(spec.cores.some((cor) => cor === particula.cor));
    assert.equal(particula.vida, 0, 'entra devagar');
    assert.equal(particula.morrendo, false);
  }
});

test('depois da primeira carga, quem cai nasce acima da tela e quem sobe nasce abaixo', () => {
  const folha = criarParticula(PARTICULAS_DA_ESTACAO.outono, () => 0.5, false);
  assert.ok(folha.y < 0);
  const brasa = criarParticula(PARTICULAS_DA_ESTACAO.eclipse, () => 0.5, false);
  assert.ok(brasa.y > 1);
  const vagalume = criarParticula(PARTICULAS_DA_ESTACAO.verao, () => 0.5, false);
  assert.equal(vagalume.y, 0.5, 'vaga-lume flutua pela tela toda, nasce em qualquer lugar');
  const espalhada = criarParticula(PARTICULAS_DA_ESTACAO.outono, () => 0.5, true);
  assert.equal(espalhada.y, 0.5);
});

test('folha, pétala e neve descem; ao passar do fundo da tela voltam ao topo em outro lugar', () => {
  const folha = criarParticula(PARTICULAS_DA_ESTACAO.outono, () => 0.5, true);
  folha.y = 0.5;
  const antes = folha.y;
  avancarParticula(folha, 0.1, 1000, () => 0.5);
  assert.ok(folha.y > antes);
  folha.y = 1.2;
  avancarParticula(folha, 0.033, 1000, () => 0.123);
  assert.ok(folha.y < 0, 'voltou ao topo');
  assert.equal(folha.x, 0.123);
});

test('a brasa sobe e reaparece embaixo', () => {
  const brasa = criarParticula(PARTICULAS_DA_ESTACAO.eclipse, () => 0.5, true);
  brasa.y = 0.5;
  avancarParticula(brasa, 0.1, 0, () => 0.5);
  assert.ok(brasa.y < 0.5);
  brasa.y = -0.1;
  avancarParticula(brasa, 0.033, 0, () => 0.7);
  assert.ok(brasa.y > 1);
});

test('quem está saindo não renasce: some de vez', () => {
  const folha = criarParticula(PARTICULAS_DA_ESTACAO.outono, () => 0.5, true);
  folha.morrendo = true;
  folha.y = 1.3;
  avancarParticula(folha, 0.033, 0, () => 0.5);
  assert.ok(folha.y > 1.06, 'continua caindo, não volta ao topo');
});

test('o vaga-lume fica sempre por perto da tela', () => {
  const vagalume = criarParticula(PARTICULAS_DA_ESTACAO.verao, sequencia(0.2, 0.8, 0.5), true);
  for (let passo = 0; passo < 3000; passo += 1) {
    avancarParticula(vagalume, 1 / 30, passo * 33, () => 0.5);
    assert.ok(vagalume.x > -0.2 && vagalume.x < 1.2 && vagalume.y > -0.2 && vagalume.y < 1.2);
  }
});

test('a vida caminha para 1 quando entra e para 0 quando sai, sem passar dos limites', () => {
  const particula = criarParticula(PARTICULAS_DA_ESTACAO.inverno, () => 0.5, true);
  for (let i = 0; i < 120; i += 1) avancarVida(particula, 1 / 30);
  assert.equal(particula.vida, 1);
  particula.morrendo = true;
  for (let i = 0; i < 160; i += 1) avancarVida(particula, 1 / 30);
  assert.equal(particula.vida, 0);
});

test('o texto de cor do canvas sempre vem com a opacidade entre 0 e 1', () => {
  assert.equal(rgba([10, 20, 30], 0.5), 'rgba(10, 20, 30, 0.500)');
  assert.equal(rgba([10, 20, 30], 3), 'rgba(10, 20, 30, 1.000)');
  assert.equal(rgba([10, 20, 30], -1), 'rgba(10, 20, 30, 0.000)');
});
