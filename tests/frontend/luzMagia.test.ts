import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { faseDe, fonteDoToken, tremor } from '../../src/pages/Mapa/motor/luzesConta';
import type { ITokenMapa } from '../../src/services/mapaApi';

const token = (extra: Partial<ITokenMapa>): ITokenMapa => ({
  id: 't1', x: 0, y: 0, porte: 1, lado: 'inimigo', nome: 'Lobo', imagem: null, nivel: null, barras: [], condicoes: [],
  moldura: 'lado', enquadramento: { zoom: 1, x: 0, y: 0 }, luz: null, e_meu: false, pode_mover: false, desconhecido: false,
  ...extra,
});

test('luz: a chama treme perto do alcance escolhido e cada token treme diferente', () => {
  const valores = Array.from({ length: 200 }, (_, i) => tremor(i * 37, 1.3));
  assert.ok(Math.min(...valores) > 0.84 && Math.max(...valores) < 1.16);
  assert.ok(Math.max(...valores) - Math.min(...valores) > 0.08, 'a chama precisa mexer');
  assert.equal(faseDe('abc'), faseDe('abc'));
  assert.notEqual(faseDe('tocha-1'), faseDe('tocha-2'));
});

test('luz: quem dá luz e com que alcance', () => {
  const tocha = fonteDoToken(token({ luz: { raio: 4, cor: '#ff9a3c', tremula: false } }), 10, 20, 100, 0);
  assert.deepEqual(tocha, { id: 't1', x: 10, y: 20, raio: 400, cor: 0xff9a3c, forca: 1 });
  const chama = fonteDoToken(token({ luz: { raio: 4, cor: '#ff9a3c', tremula: true } }), 0, 0, 100, 1234)!;
  assert.ok(chama.raio! > 330 && chama.raio! < 470 && chama.raio !== 400);
  // Personagem sem luz própria abre a escuridão no alcance padrão; monstro sem luz, não.
  assert.deepEqual(fonteDoToken(token({ lado: 'jogador' }), 1, 2, 100, 0), { id: 't1', x: 1, y: 2, raio: null, cor: null, forca: 1 });
  assert.equal(fonteDoToken(token({}), 1, 2, 100, 0), null);
});

test('magia: as formas da barra são as mesmas do servidor', () => {
  const barra = readFileSync(new URL('../../src/pages/Mapa/componentes/BarraMagia.tsx', import.meta.url), 'utf-8');
  const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');
  const naBarra = [...barra.slice(barra.indexOf('const FORMAS'), barra.indexOf('const FLUXOS')).matchAll(/id: '(\w+)'/g)].map((m) => m[1]);
  const noServidor = servidor.match(/FORMAS_MAGIA = \(([^)]*)\)/)![1].match(/"(\w+)"/g)!.map((m) => m.slice(1, -1));
  assert.deepEqual(naBarra, noServidor);
});

test('luz: os atalhos e o controle do menu cabem no limite do servidor', () => {
  const menu = readFileSync(new URL('../../src/pages/Mapa/componentes/MenuToken.tsx', import.meta.url), 'utf-8');
  const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');
  const maximo = Number(servidor.match(/LUZ_MAXIMA_CASAS = (\d+)/)![1]);
  // As luzes prontas moram em luzesEAuras.ts: `luz(alcance, cor, estilo)`.
  const prontas = readFileSync(new URL('../../src/pages/Mapa/motor/luzesEAuras.ts', import.meta.url), 'utf-8');
  const raios = [...prontas.matchAll(/luz\(([\d.]+), '#[0-9a-f]{6}'/g)].map((m) => Number(m[1]));
  assert.ok(raios.length >= 16 && raios.every((r) => r >= 0.5 && r <= maximo));
  const controle = menu.match(/min=\{0\.5\} max=\{(\d+)\} step=\{0\.5\} value=\{luz\.raio\}/);
  assert.ok(controle && Number(controle[1]) <= maximo);
});
