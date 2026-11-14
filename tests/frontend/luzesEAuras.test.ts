import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ESTILOS_DE_AURA, estiloDaAura, pontosDaBorda, progressoDasOndas } from '../../src/pages/Mapa/motor/auras';
import { ESTILOS_DE_LUZ, estiloDaLuz, faseDe, fonteDoToken, forcaDaLuz, tremor } from '../../src/pages/Mapa/motor/luzesConta';
import {
  AURAS_PRONTAS,
  DICAS_DO_ESTILO_DE_LUZ,
  GRUPOS_DE_LUZ,
  LUZES_PRONTAS,
  ROTULOS_DO_ESTILO_DE_AURA,
  ROTULOS_DO_ESTILO_DE_LUZ,
  TAMANHOS_DE_AURA,
  auraProntaDe,
  luzProntaDe,
} from '../../src/pages/Mapa/motor/luzesEAuras';
import type { ITokenMapa } from '../../src/services/mapaApi';

// Luzes e auras do token: mais tipos prontos e um estilo para cada um. O servidor aceita os mesmos estilos
// (ESTILOS_DE_LUZ em core/mapa.py e ESTILOS_DE_AURA em core/mesa_extras.py).

const COR = /^#[0-9a-f]{6}$/i;

test('os estilos do site são os mesmos que o servidor aceita', () => {
  const mapa = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf8');
  const extras = readFileSync(new URL('../../plataforma/core/mesa_extras.py', import.meta.url), 'utf8');
  const doServidor = (texto: string, nome: string) => texto.match(new RegExp(`${nome} = \\(([^)]*)\\)`))![1].match(/"([a-z]+)"/g)!.map((m) => m.slice(1, -1));
  assert.deepEqual([...ESTILOS_DE_LUZ], doServidor(mapa, 'ESTILOS_DE_LUZ'));
  assert.deepEqual([...ESTILOS_DE_AURA], doServidor(extras, 'ESTILOS_DE_AURA'));
});

test('a luz tem mais tipos prontos, em grupos, cada um com alcance, cor e estilo válidos', () => {
  assert.ok(LUZES_PRONTAS.length >= 16, 'eram 4 (vela, tocha, lanterna, luz mágica)');
  const ids = LUZES_PRONTAS.map((pronta) => pronta.id);
  assert.equal(new Set(ids).size, ids.length);
  const grupos = new Set(GRUPOS_DE_LUZ.map((grupo) => grupo.id));
  for (const pronta of LUZES_PRONTAS) {
    assert.ok(grupos.has(pronta.grupo), pronta.id);
    assert.ok(pronta.luz.raio >= 0.5 && pronta.luz.raio <= 30, `${pronta.id}: alcance`);
    assert.match(pronta.luz.cor, COR);
    assert.ok(ESTILOS_DE_LUZ.includes(pronta.luz.estilo!), `${pronta.id}: estilo`);
    assert.equal(pronta.luz.tremula, pronta.luz.estilo !== 'fixa', `${pronta.id}: tremula acompanha o estilo`);
  }
  for (const grupo of GRUPOS_DE_LUZ) assert.ok(LUZES_PRONTAS.some((pronta) => pronta.grupo === grupo.id), `${grupo.id} vazio`);
  // As quatro de sempre continuam.
  for (const antiga of ['vela', 'tocha', 'lanterna', 'magica']) assert.ok(ids.includes(antiga), antiga);
  for (const estilo of ESTILOS_DE_LUZ) assert.ok(ROTULOS_DO_ESTILO_DE_LUZ[estilo] && DICAS_DO_ESTILO_DE_LUZ[estilo]);
  assert.ok(new Set(LUZES_PRONTAS.map((p) => p.luz.estilo)).size === ESTILOS_DE_LUZ.length, 'cada estilo tem pelo menos uma luz pronta');
});

test('a aura tem tipos prontos com cor, tamanho e estilo válidos, e o estilo mudou o jeito de desenhar', () => {
  assert.ok(AURAS_PRONTAS.length >= 10);
  const ids = AURAS_PRONTAS.map((pronta) => pronta.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const pronta of AURAS_PRONTAS) {
    assert.match(pronta.aura.cor, COR);
    assert.ok(pronta.aura.raio >= 0.5 && pronta.aura.raio <= 12, `${pronta.id}: raio`);
    assert.ok(ESTILOS_DE_AURA.includes(pronta.aura.estilo!), `${pronta.id}: estilo`);
  }
  assert.equal(new Set(AURAS_PRONTAS.map((p) => p.aura.estilo)).size, ESTILOS_DE_AURA.length, 'todos os sete estilos têm um tipo pronto');
  for (const estilo of ESTILOS_DE_AURA) assert.ok(ROTULOS_DO_ESTILO_DE_AURA[estilo]);
  assert.deepEqual([...TAMANHOS_DE_AURA], [1, 2, 3, 6], 'os tamanhos de sempre');
});

test('luz e aura de antes dos estilos continuam valendo', () => {
  assert.equal(estiloDaLuz({ tremula: true }), 'chama');
  assert.equal(estiloDaLuz({ tremula: false }), 'fixa');
  assert.equal(estiloDaLuz({ tremula: false, estilo: 'cintila' }), 'cintila');
  assert.equal(estiloDaLuz({ tremula: true, estilo: 'inventado' as never }), 'chama', 'estilo que não existe cai no campo antigo');
  assert.equal(estiloDaAura({}), 'campo');
  assert.equal(estiloDaAura({ estilo: 'chamas' }), 'chamas');
  assert.equal(estiloDaAura({ estilo: 'disco' as never }), 'campo');
});

test('a força da luz de cada estilo tem o jeito dele e fica entre 0,35 e 1,25', () => {
  const amostras = (estilo: Parameters<typeof forcaDaLuz>[0]) => Array.from({ length: 4000 }, (_, i) => forcaDaLuz(estilo, i * 25, 1.7));
  assert.ok(amostras('fixa').every((v) => v === 1));
  assert.deepEqual(amostras('chama'), Array.from({ length: 4000 }, (_, i) => tremor(i * 25, 1.7)), 'a chama é o tremor de sempre');
  for (const estilo of ESTILOS_DE_LUZ) {
    const v = amostras(estilo);
    assert.ok(Math.min(...v) >= 0.35 && Math.max(...v) <= 1.25, `${estilo}: ${Math.min(...v)} a ${Math.max(...v)}`);
  }
  const pulsa = amostras('pulsa');
  assert.ok(Math.max(...pulsa) - Math.min(...pulsa) > 0.25, 'pulsa vai e volta de verdade');
  // Pulsa é lenta: de um quadro (25 ms) para o outro quase não muda; a chama muda mais.
  const salto = (v: number[]) => Math.max(...v.slice(1).map((x, i) => Math.abs(x - v[i])));
  assert.ok(salto(pulsa) < 0.02, 'pulsa não tem salto');
  const cintila = amostras('cintila');
  assert.ok(Math.min(...cintila) < 0.8, 'cintila dá quedas');
  assert.ok(salto(cintila) > salto(pulsa) * 2, 'cintila é bem mais nervosa que pulsa');
});

test('o token com luz usa o estilo dela, e a sem estilo segue o campo antigo', () => {
  const token = (luz: ITokenMapa['luz']) => ({ id: 't1', lado: 'neutro', luz }) as unknown as ITokenMapa;
  const fase = faseDe('t1');
  const fixa = fonteDoToken(token({ raio: 4, cor: '#ff9a3c', tremula: false }), 0, 0, 100, 777)!;
  assert.equal(fixa.forca, 1);
  const antigaChama = fonteDoToken(token({ raio: 4, cor: '#ff9a3c', tremula: true }), 0, 0, 100, 777)!;
  assert.equal(antigaChama.forca, tremor(777, fase));
  const pulsa = fonteDoToken(token({ raio: 4, cor: '#b48cff', tremula: true, estilo: 'pulsa' }), 0, 0, 100, 777)!;
  assert.equal(pulsa.forca, forcaDaLuz('pulsa', 777, fase));
  assert.equal(pulsa.raio, 4 * 100 * pulsa.forca, 'o alcance acompanha a força');
});

test('o botão de uma luz ou aura pronta se marca quando o token tem a mesma', () => {
  const fogueira = LUZES_PRONTAS.find((p) => p.id === 'fogueira')!;
  assert.equal(luzProntaDe(fogueira.luz, 'chama'), 'fogueira');
  assert.equal(luzProntaDe({ ...fogueira.luz, cor: '#000000' }, 'chama'), null);
  assert.equal(luzProntaDe(null, null), null);
  const cura = AURAS_PRONTAS.find((p) => p.id === 'cura')!;
  assert.equal(auraProntaDe({ ...cura.aura, visivel: true }), 'cura');
  assert.equal(auraProntaDe({ ...cura.aura, raio: 9, visivel: false }), 'cura', 'o alcance o Mestre ajusta e o botão continua marcado');
  assert.equal(auraProntaDe({ raio: 2, cor: '#facc15', visivel: true }), 'protecao', 'aura de antes é o campo');
  assert.equal(auraProntaDe(null), null);
});

test('a borda que ondula dá uma volta fechada em torno do raio e as ondas do pulso nunca saem do intervalo', () => {
  const pontos = pontosDaBorda(100, 1234, [[7, 0.02, 1.8]], 48);
  assert.equal(pontos.length, 96);
  for (let i = 0; i < pontos.length; i += 2) {
    const distancia = Math.hypot(pontos[i], pontos[i + 1]);
    assert.ok(distancia > 97 && distancia < 103, `ponto ${i / 2} a ${distancia}`);
  }
  assert.deepEqual(pontosDaBorda(50, 0, [], 8).length, 16);
  for (const agora of [0, 600, 2399, 5000, 99999]) {
    const ondas = progressoDasOndas(agora);
    assert.equal(ondas.length, 3);
    assert.ok(ondas.every((p) => p >= 0 && p < 1), `agora ${agora}`);
    assert.equal(new Set(ondas.map((p) => p.toFixed(3))).size, 3, 'as ondas estão defasadas');
  }
});

test('o menu do token usa as luzes e auras prontas e o seletor de estilo', () => {
  const menu = readFileSync(new URL('../../src/pages/Mapa/componentes/MenuToken.tsx', import.meta.url), 'utf8');
  assert.match(menu, /LUZES_PRONTAS/);
  assert.match(menu, /AURAS_PRONTAS/);
  assert.match(menu, /aria-label="Efeito da luz"/);
  assert.match(menu, /aria-label="Estilo da aura"/);
  assert.doesNotMatch(menu, /Tremula como chama/, 'o efeito virou um seletor de quatro estilos');
});
