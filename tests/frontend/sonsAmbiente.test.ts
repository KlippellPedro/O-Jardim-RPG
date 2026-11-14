import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CATEGORIAS_DE_SOM,
  FONTE_DOS_SONS,
  MAXIMO_DE_CAMADAS,
  SONS_DE_AMBIENTE,
  alternarCamada,
  estaLigado,
  filtrarSons,
  mudarVolumeDaCamada,
  normalizarCamadas,
  somPorId,
  urlDoSom,
  volumeNoAparelho,
} from '../../src/pages/Mapa/motor/sonsAmbiente';

// Sons de ambiente da mesa: tocam de um repositório do GitHub (via jsDelivr), não do site.
// O servidor aceita só os ids deste mesmo catálogo (plataforma/core/sons_ambiente.py).

test('o catálogo tem ids únicos, categorias que existem e arquivos mp3', () => {
  const ids = SONS_DE_AMBIENTE.map((som) => som.id);
  assert.equal(new Set(ids).size, ids.length);
  const categorias = new Set(CATEGORIAS_DE_SOM.map((categoria) => categoria.id));
  for (const som of SONS_DE_AMBIENTE) {
    assert.match(som.id, /^[a-z0-9-]+$/);
    assert.ok(som.id.length <= 60, `${som.id}: o servidor aceita até 60 caracteres`);
    assert.ok(categorias.has(som.categoria), `${som.id}: categoria ${som.categoria} não existe`);
    assert.match(som.arquivo, /^[a-z]+\/[a-z0-9-]+\.mp3$/);
    assert.ok(som.volume >= 0 && som.volume <= 1);
    assert.ok(som.nome.trim());
  }
  for (const categoria of CATEGORIAS_DE_SOM) {
    assert.ok(SONS_DE_AMBIENTE.some((som) => som.categoria === categoria.id), `${categoria.id} sem nenhum som`);
  }
  // O que o Mestre mais pede: chuva, vento e fogo.
  for (const basico of ['chuva-leve', 'chuva-forte', 'trovoes', 'vento', 'fogueira', 'taverna-cheia']) {
    assert.ok(somPorId(basico), basico);
  }
});

test('o endereço aponta para o repositório com o commit fixado, nunca para um branch', () => {
  assert.match(FONTE_DOS_SONS.commit, /^[0-9a-f]{40}$/);
  assert.equal(FONTE_DOS_SONS.base, `https://cdn.jsdelivr.net/gh/remvze/moodist@${FONTE_DOS_SONS.commit}/public/sounds/`);
  assert.equal(urlDoSom(somPorId('fogueira')!), `${FONTE_DOS_SONS.base}nature/campfire.mp3`);
  for (const som of SONS_DE_AMBIENTE) assert.ok(urlDoSom(som).startsWith('https://'), som.id);
  assert.ok(FONTE_DOS_SONS.licenca.length > 10 && FONTE_DOS_SONS.repositorio.startsWith('https://github.com/'));
});

test('as camadas que chegam são limpas: só ids do catálogo, sem repetir, no limite e com volume de 0 a 1', () => {
  assert.deepEqual(normalizarCamadas(null), []);
  assert.deepEqual(normalizarCamadas('chuva-leve'), []);
  assert.deepEqual(normalizarCamadas([{ id: 'rio', volume: 2 }, { id: 'vento', volume: -1 }, { id: 'rio', volume: 0.1 }, { id: 'inventado' }, null, 7, { id: 5 }]), [
    { id: 'rio', volume: 1 }, { id: 'vento', volume: 0 },
  ]);
  assert.equal(normalizarCamadas([{ id: 'rio' }])[0].volume, somPorId('rio')!.volume, 'sem volume usa o sugerido');
  assert.equal(normalizarCamadas([{ id: 'rio', volume: Number.NaN }])[0].volume, somPorId('rio')!.volume);
  const muitas = normalizarCamadas(SONS_DE_AMBIENTE.map((som) => ({ id: som.id, volume: 0.5 })));
  assert.equal(muitas.length, MAXIMO_DE_CAMADAS);
});

test('ligar e desligar um som respeita o limite da mesa', () => {
  let camadas = alternarCamada([], 'chuva-forte');
  assert.deepEqual(camadas, [{ id: 'chuva-forte', volume: somPorId('chuva-forte')!.volume }]);
  assert.equal(estaLigado(camadas, 'chuva-forte'), true);
  camadas = alternarCamada(camadas, 'chuva-forte');
  assert.deepEqual(camadas, []);
  assert.deepEqual(alternarCamada([], 'nao-existe'), []);

  const cheia = SONS_DE_AMBIENTE.slice(0, MAXIMO_DE_CAMADAS).reduce((atual, som) => alternarCamada(atual, som.id), [] as ReturnType<typeof alternarCamada>);
  assert.equal(cheia.length, MAXIMO_DE_CAMADAS);
  const extra = SONS_DE_AMBIENTE[MAXIMO_DE_CAMADAS].id;
  assert.equal(alternarCamada(cheia, extra).length, MAXIMO_DE_CAMADAS, 'passou do limite: fica como estava');
  assert.equal(alternarCamada(cheia, cheia[0].id).length, MAXIMO_DE_CAMADAS - 1, 'desligar sempre pode');
});

test('o volume de cada camada muda sem mexer nas outras e fica entre 0 e 1', () => {
  const camadas = normalizarCamadas([{ id: 'rio', volume: 0.5 }, { id: 'vento', volume: 0.5 }]);
  assert.deepEqual(mudarVolumeDaCamada(camadas, 'rio', 0.8), [{ id: 'rio', volume: 0.8 }, { id: 'vento', volume: 0.5 }]);
  assert.equal(mudarVolumeDaCamada(camadas, 'rio', 9)[0].volume, 1);
  assert.equal(mudarVolumeDaCamada(camadas, 'rio', -9)[0].volume, 0);
});

test('o aparelho ouve o volume do Mestre vezes o ajuste, e mudo zera', () => {
  const camada = { id: 'rio', volume: 0.8 };
  assert.equal(volumeNoAparelho(camada, 1, false), 0.8);
  assert.equal(volumeNoAparelho(camada, 0.5, false), 0.4);
  assert.equal(volumeNoAparelho(camada, 0, false), 0);
  assert.equal(volumeNoAparelho(camada, 1, true), 0);
  assert.equal(volumeNoAparelho(camada, 7, false), 0.8, 'o ajuste também fica entre 0 e 1');
});

test('a busca de sons ignora acento e caixa e respeita a categoria', () => {
  assert.equal(filtrarSons(null, '').length, SONS_DE_AMBIENTE.length);
  assert.ok(filtrarSons(null, 'TROVOES').some((som) => som.id === 'trovoes'));
  assert.ok(filtrarSons('chuva', '').every((som) => som.categoria === 'chuva'));
  assert.deepEqual(filtrarSons('animais', 'chuva'), []);
  assert.ok(filtrarSons(null, 'agua').some((som) => som.id === 'debaixo-dagua'));
});

test('a plataforma e o site leem o mesmo catálogo e o pacote da Discloud leva a pasta', () => {
  const servidor = readFileSync(new URL('../../plataforma/core/sons_ambiente.py', import.meta.url), 'utf8');
  assert.match(servidor, /"mapa" \/ "sons-ambiente-v1\.json"/);
  const pacote = readFileSync(new URL('../../tools/build-discloud-packages.ps1', import.meta.url), 'utf8');
  assert.match(pacote, /'data\\mapa'/, 'sem esta pasta no ZIP o servidor da Discloud não acha o catálogo');
});

test('o painel e o reprodutor existem e o mapa liga os dois', () => {
  const pagina = readFileSync(new URL('../../src/pages/Mapa/MapaPage.tsx', import.meta.url), 'utf8');
  assert.match(pagina, /<AmbienteDaMesa/);
  assert.match(pagina, /case 'ambiente':/);
  const painel = readFileSync(new URL('../../src/pages/Mapa/componentes/PainelTrilha.tsx', import.meta.url), 'utf8');
  assert.match(painel, /definirAmbiente/);
});
