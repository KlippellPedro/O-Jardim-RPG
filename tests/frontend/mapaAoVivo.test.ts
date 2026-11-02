import assert from 'node:assert/strict';
import test from 'node:test';
import { chavesEsperadas, encaixar, iniciais, medir, type IGrade } from '../../src/pages/Mapa/motor/geometria';
import { Interpolador } from '../../src/pages/Mapa/tempoReal';

const QUADRADA: IGrade = { tipo: 'quadrada', tamanho: 100, x: 0, y: 0, cor: '#ffffff', opacidade: 0.2, metros: 1.5 };

test('token de uma casa encaixa no meio da casa; de duas, no cruzamento das linhas', () => {
  assert.deepEqual(encaixar({ x: 140, y: 260 }, QUADRADA, 1), { x: 150, y: 250 });
  assert.deepEqual(encaixar({ x: 140, y: 260 }, QUADRADA, 2), { x: 100, y: 300 });
  const deslocada = { ...QUADRADA, x: 30, y: -20 };
  assert.deepEqual(encaixar({ x: 140, y: 260 }, deslocada, 1), { x: 180, y: 230 });
});

test('grade hexagonal encaixa no centro de um hexágono, e nenhuma grade deixa onde está', () => {
  const hex: IGrade = { ...QUADRADA, tipo: 'hex' };
  const centro = encaixar({ x: 0, y: 0 }, hex);
  assert.deepEqual(centro, { x: 0, y: 0 });
  const vizinho = encaixar({ x: 95, y: 4 }, hex);
  assert.ok(Math.abs(vizinho.x - 100) < 1e-6 && Math.abs(vizinho.y) < 1e-6);
  const deCima = encaixar({ x: 52, y: 84 }, hex);
  assert.ok(Math.abs(deCima.x - 50) < 1e-6 && Math.abs(deCima.y - (100 / Math.sqrt(3)) * 1.5) < 1e-6);
  assert.deepEqual(encaixar({ x: 12.3, y: 45.6 }, { ...QUADRADA, tipo: 'nenhuma' }), { x: 12.3, y: 45.6 });
});

test('régua soma os trechos e converte casas em metros', () => {
  assert.deepEqual(medir([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 400 }], QUADRADA), { quadrados: 7, metros: 10.5 });
});

test('pedaços do acervo seguem a mesma conta do servidor', () => {
  assert.deepEqual(chavesEsperadas(800, 600), ['mini', 'n0/0/0']);
  const grande = chavesEsperadas(5000, 3000);
  assert.ok(grande.includes('n0/4/2') && !grande.includes('n0/5/0'));
  assert.ok(grande.includes('n2/1/0') && !grande.includes('n2/2/0'));
});

test('iniciais do token sem retrato', () => {
  assert.equal(iniciais('Lobo Cinzento das Sombras'), 'LS');
  assert.equal(iniciais('Mira'), 'MI');
  assert.equal(iniciais('  '), '?');
});

test('interpolador desenha no passado, liga as amostras e não volta no tempo', () => {
  const interpolador = new Interpolador(0);
  // Amostras do servidor a cada 50 ms, chegando 80 ms depois de enviadas.
  for (let i = 0; i <= 10; i++) interpolador.receber('t1', { t: 1000 + i * 50, x: i * 10, y: 0 }, 1080 + i * 50);
  interpolador.receber('t1', { t: 1000, x: 999, y: 999 }, 1700);
  assert.equal(interpolador.atraso, 80 + 50);
  const meio = interpolador.posicao('t1', 1000 + 125 + 130);
  assert.ok(meio && Math.abs(meio.x - 25) < 1e-6 && !meio.terminou);
  const fim = interpolador.posicao('t1', 5000);
  assert.ok(fim && fim.x === 100 && fim.terminou);
  interpolador.esquecer('t1');
  assert.equal(interpolador.posicao('t1', 5000), null);
});

test('molduras: as cores de Fluxo batem com FLUXO_TEMAS e os nomes batem com o servidor', async () => {
  const { CORES_FLUXO, MOLDURAS } = await import('../../src/pages/Mapa/motor/molduras');
  const { FLUXO_TEMAS } = await import('../../src/services/magiaService');
  for (const [fluxo, cor] of Object.entries(CORES_FLUXO)) {
    assert.equal(cor, FLUXO_TEMAS[fluxo as keyof typeof FLUXO_TEMAS].destaque, fluxo);
  }
  assert.equal(Object.keys(CORES_FLUXO).length, Object.keys(FLUXO_TEMAS).length);
  const { readFileSync } = await import('node:fs');
  const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');
  const base = servidor.match(/MOLDURAS = \(\s*([\s\S]*?)\*\(/)![1].match(/"([a-z-]+)"/g)!.map((m) => m.slice(1, -1));
  const fluxos = servidor.match(/FLUXOS = \(([\s\S]*?)\)/)![1].match(/"([a-z]+)"/g)!.map((m) => `fluxo-${m.slice(1, -1)}`);
  assert.deepEqual(MOLDURAS.map((m) => m.id).sort(), [...base, ...fluxos].sort());
});

test('MODNet recebe lado menor 512 e lados múltiplos de 32', async () => {
  const { tamanhoParaModnet } = await import('../../src/pages/Mapa/oficina/processar');
  assert.deepEqual(tamanhoParaModnet(1000, 869), { largura: 576, altura: 512 });
  assert.deepEqual(tamanhoParaModnet(300, 2000), { largura: 512, altura: 3424 });
});

test('sigla das condições no token', async () => {
  const { siglaDaCondicao } = await import('../../src/pages/Mapa/motor/geometria');
  assert.equal(siglaDaCondicao('caído'), 'Ca');
  assert.equal(siglaDaCondicao(' '), '?');
});

test('névoa: pincel guarda um ponto a cada pedaço do raio e retângulo vale de qualquer canto', async () => {
  const { acrescentarAoTraco, formaDoRetangulo, formaDoTraco, fechaPoligono } = await import('../../src/pages/Mapa/motor/nevoaGeometria');
  const traco = [{ x: 0, y: 0 }];
  assert.equal(acrescentarAoTraco(traco, { x: 10, y: 0 }, 100), false);
  assert.equal(acrescentarAoTraco(traco, { x: 40, y: 0 }, 100), true);
  assert.deepEqual(formaDoTraco('revelar', traco, 1), { op: 'revelar', tipo: 'pincel', raio: 4, pontos: [[0, 0], [40, 0]] });
  assert.deepEqual(formaDoRetangulo('esconder', { x: 300, y: 200 }, { x: 100.04, y: 50 }), { op: 'esconder', tipo: 'retangulo', x: 100, y: 50, w: 200, h: 150 });
  assert.equal(formaDoRetangulo('revelar', { x: 0, y: 0 }, { x: 2, y: 90 }), null);
  const pontos = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  assert.equal(fechaPoligono(pontos, { x: 6, y: 6 }, 1), true);
  assert.equal(fechaPoligono(pontos, { x: 6, y: 6 }, 0.5), true);
  assert.equal(fechaPoligono(pontos, { x: 30, y: 30 }, 1), false);
  assert.equal(fechaPoligono(pontos.slice(0, 2), { x: 0, y: 0 }, 1), false);
});

test('névoa: o jogador pede só os ladrilhos liberados e busca de perto o que a versão reduzida não cobre', async () => {
  const { chavesDoFundo, detalheSempre } = await import('../../src/pages/Mapa/motor/nevoaGeometria');
  const chaves = chavesEsperadas(8000, 6000);
  assert.deepEqual(chavesDoFundo(chaves, null), { chaves: ['n2/0/0', 'n2/0/1', 'n2/1/0', 'n2/1/1'], escala: 4 });
  const liberados = new Set(['n2/0/0', 'n0/0/0', 'n0/4/0']);
  assert.deepEqual(chavesDoFundo(chaves, liberados).chaves, ['n2/0/0']);
  assert.equal(detalheSempre('n0/0/0', liberados), false);
  assert.equal(detalheSempre('n0/4/0', liberados), true);
  assert.equal(detalheSempre('n0/5/0', liberados), false);
  assert.equal(detalheSempre('n0/4/0', null), false);
  const pequeno = chavesEsperadas(800, 600);
  assert.deepEqual(chavesDoFundo(pequeno, new Set()), { chaves: [], escala: 1 });
});

test('clima: os efeitos do painel são os mesmos do servidor', async () => {
  const { EFEITOS_CLIMA: EFEITOS, MAX_EFEITOS_CLIMA: MAX_EFEITOS } = await import('../../src/pages/Mapa/motor/climaCatalogo');
  const { readFileSync } = await import('node:fs');
  const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');
  const tipos = servidor.match(/EFEITOS_CLIMA = \(([^)]*)\)/)![1].match(/"([a-z]+)"/g)!.map((m) => m.slice(1, -1));
  assert.deepEqual(EFEITOS.map((e) => e.id), tipos);
  assert.equal(MAX_EFEITOS, Number(servidor.match(/MAX_EFEITOS_CLIMA = (\d+)/)![1]));
});
