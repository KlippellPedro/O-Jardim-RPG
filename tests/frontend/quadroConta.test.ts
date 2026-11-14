import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ALTURA_DA_CARTA, ALTURA_DO_QUADRO, CORES_DA_CARTA, LARGURA_DA_CARTA, LARGURA_DO_QUADRO, MAXIMO_DE_CARTAS_DO_JOGADOR, TEXTO_MAXIMO, TITULO_MAXIMO,
  barbantesDoQuadro, cartasDe, centroDaCarta, corDaCarta, jaLigadas, limitarAoQuadro, podeEditarCarta, resumoDoQuadro,
} from '../../src/pages/Mapa/motor/quadroConta.ts';

const servidor = readFileSync(new URL('../../plataforma/core/quadro.py', import.meta.url), 'utf-8');
const numero = (nome: string) => Number(servidor.match(new RegExp(`^${nome} = ([0-9]+)`, 'm'))![1]);

test('as medidas, os limites e as cores do quadro são as mesmas do servidor', () => {
  assert.equal(LARGURA_DO_QUADRO, numero('LARGURA'));
  assert.equal(ALTURA_DO_QUADRO, numero('ALTURA'));
  assert.equal(MAXIMO_DE_CARTAS_DO_JOGADOR, numero('MAX_CARTAS_POR_JOGADOR'));
  assert.equal(TITULO_MAXIMO, numero('TITULO_MAX'));
  assert.equal(TEXTO_MAXIMO, numero('TEXTO_MAX'));
  const cores = servidor.match(/^CORES = \(([^)]*)\)/m)![1].match(/"([a-z]+)"/g)!.map((c) => c.replaceAll('"', ''));
  assert.deepEqual(CORES_DA_CARTA.map((cor) => cor.id), cores);
  assert.equal(corDaCarta('inventada').id, 'papel');
});

const carta = (id: string, x: number, y: number, extra = {}) => ({ id, titulo: id, texto: '', cor: 'papel' as const, x, y, autor: 'ana', autor_nome: 'Ana', visivel: true, ...extra });

test('o barbante vai do alfinete de uma carta ao da outra e acompanha a carta que está sendo arrastada', () => {
  const cartas = [carta('a', 100, 100), carta('b', 500, 300)];
  const [fio] = barbantesDoQuadro(cartas, [{ de: 'a', para: 'b' }]);
  assert.deepEqual([fio.x1, fio.y1, fio.x2, fio.y2], [100 + LARGURA_DA_CARTA / 2, 114, 500 + LARGURA_DA_CARTA / 2, 314]);
  const [arrastado] = barbantesDoQuadro(cartas, [{ de: 'a', para: 'b' }], { b: { x: 700, y: 300 } });
  assert.equal(arrastado.x2, 700 + LARGURA_DA_CARTA / 2, 'a posição local vale enquanto a mão está na carta');
  assert.deepEqual(barbantesDoQuadro(cartas, [{ de: 'a', para: 'sumiu' }]), [], 'barbante para carta que o jogador não vê não aparece');
  assert.deepEqual(centroDaCarta({ x: 0, y: 0 }), { x: LARGURA_DA_CARTA / 2, y: 14 });
});

test('a carta nunca sai do mural e só o autor e o Mestre editam', () => {
  assert.deepEqual(limitarAoQuadro(-40, 99999), { x: 0, y: ALTURA_DO_QUADRO - ALTURA_DA_CARTA });
  assert.deepEqual(limitarAoQuadro(99999, -1), { x: LARGURA_DO_QUADRO - LARGURA_DA_CARTA, y: 0 });
  assert.equal(podeEditarCarta({ autor: 'ana' }, 'ana', false), true);
  assert.equal(podeEditarCarta({ autor: 'ana' }, 'bia', false), false);
  assert.equal(podeEditarCarta({ autor: 'ana' }, 'bia', true), true);
  assert.equal(podeEditarCarta({ autor: null }, null, false), false, 'carta sem autor não é de ninguém');
});

test('ligações valem nos dois sentidos e o resumo conta cartas e barbantes', () => {
  assert.equal(jaLigadas([{ de: 'a', para: 'b' }], 'b', 'a'), true);
  assert.equal(jaLigadas([{ de: 'a', para: 'b' }], 'a', 'c'), false);
  assert.equal(cartasDe([carta('a', 0, 0), carta('b', 0, 0, { autor: 'bia' })], 'ana'), 1);
  assert.equal(resumoDoQuadro(undefined), 'Nenhuma carta ainda');
  assert.equal(resumoDoQuadro({ cartas: [carta('a', 0, 0)], ligacoes: [] }), '1 carta, 0 barbantes');
  assert.equal(resumoDoQuadro({ cartas: [carta('a', 0, 0), carta('b', 0, 0)], ligacoes: [{ de: 'a', para: 'b' }] }), '2 cartas, 1 barbante');
});
