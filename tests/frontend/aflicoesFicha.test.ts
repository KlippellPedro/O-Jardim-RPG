import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CATALOGO_AFLICOES } from '../../data/regras/aflicoes';
import {
  aflicaoPorId,
  avisoDeImunidade,
  estagioDaExposicao,
  estagioDaNovaExposicao,
  estagioDoIntervalo,
  estagioMaximo,
  normalizarAflicoesAtivas,
  novaAflicaoAtiva,
  resumoParaSessao,
  textoDoPeriodo,
} from '../../src/services/aflicoesFichaService';
import { calcularTestePericia } from '../../src/services/testePericiaService';

const toxina = aflicaoPorId('toxina-paralisante')!;
const febre = aflicaoPorId('febre-dos-esporos')!;

test('exposição: sucesso evita, falha entra no 1, falha crítica no 2', () => {
  assert.equal(estagioDaExposicao(toxina, 'sucesso critico'), 0);
  assert.equal(estagioDaExposicao(toxina, 'sucesso'), 0);
  assert.equal(estagioDaExposicao(toxina, 'falha'), 1);
  assert.equal(estagioDaExposicao(toxina, 'falha critica'), 2);
});

test('intervalo: crítico desce, sucesso segura, falha sobe 1, falha crítica sobe 2, sem passar do teto', () => {
  const teto = estagioMaximo(toxina);
  assert.equal(estagioDoIntervalo(toxina, 2, 'sucesso critico'), 1);
  assert.equal(estagioDoIntervalo(toxina, 2, 'sucesso'), 2);
  assert.equal(estagioDoIntervalo(toxina, 2, 'falha'), 3);
  assert.equal(estagioDoIntervalo(toxina, 2, 'falha critica'), teto);
  assert.equal(estagioDoIntervalo(toxina, 1, 'sucesso critico'), 0, 'estágio 0 remove a aflição');
});

test('nova exposição à mesma aflição só sobe 1 estágio, e só na falha', () => {
  assert.equal(estagioDaNovaExposicao(toxina, 1, 'falha critica'), 2);
  assert.equal(estagioDaNovaExposicao(toxina, 1, 'sucesso'), 1);
  assert.equal(estagioDaNovaExposicao(toxina, estagioMaximo(toxina), 'falha'), estagioMaximo(toxina));
});

test('a ficha guarda só aflição do catálogo, com estágio dentro do limite', () => {
  const lidas = normalizarAflicoesAtivas([
    { id: 'a', aflicaoId: 'toxina-paralisante', estagio: 9 },
    { id: 'b', aflicaoId: 'nao-existe', estagio: 1 },
    'lixo',
    { id: 'c', aflicaoId: 'febre-dos-esporos', estagio: 0, incubando: true },
  ]);
  assert.deepEqual(lidas.map((item) => [item.aflicaoId, item.estagio, item.incubando]), [
    ['toxina-paralisante', estagioMaximo(toxina), false],
    ['febre-dos-esporos', 1, true],
  ]);
  assert.deepEqual(resumoParaSessao(lidas).map((item) => item.titulo), ['Toxina Paralisante', 'Febre dos Esporos']);
});

test('aflição com incubação nasce incubando; sem incubação, já vale', () => {
  assert.equal(novaAflicaoAtiva(febre, 1, null).incubando, true);
  assert.equal(novaAflicaoAtiva(toxina, 1, null).incubando, false);
  assert.equal(textoDoPeriodo(febre.incubacao), '6 horas');
  assert.equal(textoDoPeriodo(toxina.intervalo), '1 rodada');
});

test('imunidade racial vira aviso, na extensão exata da regra', () => {
  const doencaSobrenatural = CATALOGO_AFLICOES.find((item) => item.tipo === 'doenca' && item.classificacao === 'sobrenatural')!;
  assert.ok(avisoDeImunidade('golem', febre));
  assert.equal(avisoDeImunidade('golem', doencaSobrenatural), null);
  assert.ok(avisoDeImunidade('auleth', doencaSobrenatural));
  assert.equal(avisoDeImunidade('auleth', toxina), null);
  assert.ok(avisoDeImunidade('automato', toxina));
  assert.equal(avisoDeImunidade('humano', toxina), null);
});

test('todo estágio do catálogo começa no 0 e sobe de um em um (o contador depende disso)', () => {
  for (const aflicao of CATALOGO_AFLICOES) {
    assert.deepEqual(aflicao.estagios.map((estagio) => estagio.numero), aflicao.estagios.map((_, indice) => indice), aflicao.id);
  }
});

test('Fortitude da aflição usa a mesma conta da aba Perícias', () => {
  const character = {
    nivel: 6,
    ficha: {
      atributosFinais: { forca: 10, destreza: 10, constituicao: 16, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10 },
      pericias: { fortitude: 'treinado' },
    },
    inventarioCentral: [],
  };
  const teste = calcularTestePericia(character, 'fortitude', 'constituicao', null, 'Fortitude');
  // CON 16 dá +3, metade do nível 6 dá +3, e o grau Treinado soma o próprio bônus.
  const semGrau = calcularTestePericia({ ...character, ficha: { ...character.ficha, pericias: {} } }, 'fortitude', 'constituicao', null);
  assert.equal(semGrau.bonus, 6);
  assert.ok(teste.bonus > semGrau.bonus);
});

test('a Sessão mostra as aflições e o card da ficha tem a seção', () => {
  const tracker = readFileSync(new URL('../../src/pages/Sessao/InitiativeTracker.tsx', import.meta.url), 'utf8');
  assert.match(tracker, /entity\.aflicoes/);
  const abaFicha = readFileSync(new URL('../../src/pages/Ficha/abas/AbaFicha.tsx', import.meta.url), 'utf8');
  assert.match(abaFicha, /<AflicoesSection/);
});
