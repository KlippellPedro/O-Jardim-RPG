import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aliadosSemVinculo,
  aplicarAfinidade,
  limitarAfinidade,
  normalizarVinculos,
  ordenarVinculos,
  posicionarTeia,
  rotuloAfinidade,
} from '../../src/pages/Ficha/utils/vinculos';
import { agruparPorDia, alterarMarca, filtrarEventos, normalizarMarcas } from '../../src/pages/Ficha/utils/diario';
import type { IEventoDiario } from '../../src/services/diarioApi';

test('afinidade fica presa entre -5 e 5 e ignora lixo', () => {
  assert.equal(limitarAfinidade(99), 5);
  assert.equal(limitarAfinidade(-99), -5);
  assert.equal(limitarAfinidade('x'), 0);
  assert.equal(limitarAfinidade(2.6), 3);
});

test('normalizar descarta itens sem nome, repetidos e tipo desconhecido', () => {
  const lista = normalizarVinculos([
    { id: 'a', nome: '  Mira ', tipo: 'amor', afinidade: 9 },
    { id: 'a', nome: 'Repetido' },
    { id: 'b', nome: '' },
    { id: 'c', nome: 'Kel', tipo: 'inventado' },
    null,
  ]);
  assert.deepEqual(lista.map((v) => [v.id, v.nome, v.tipo, v.afinidade]), [
    ['a', 'Mira', 'amor', 5],
    ['c', 'Kel', 'contato', 0],
  ]);
});

test('mudar a afinidade registra no historico e sem mudanca devolve o mesmo vinculo', () => {
  const [mira] = normalizarVinculos([{ id: 'a', nome: 'Mira', afinidade: 1, criadoEm: 1, atualizadoEm: 1 }]);
  assert.equal(aplicarAfinidade(mira, 1, 'nada'), mira);
  const depois = aplicarAfinidade(mira, 4, 'Salvou minha vida', 99);
  assert.equal(depois.afinidade, 4);
  assert.deepEqual(depois.historico, [{ em: 99, de: 1, para: 4, motivo: 'Salvou minha vida' }]);
  assert.equal(depois.atualizadoEm, 99);
});

test('rotulo cobre a escala inteira', () => {
  assert.equal(rotuloAfinidade(5), 'Confiança total');
  assert.equal(rotuloAfinidade(0), 'Neutro');
  assert.equal(rotuloAfinidade(-5), 'Inimigo declarado');
});

test('ordem: fixados, depois intensidade da afinidade, depois nome', () => {
  const lista = normalizarVinculos([
    { id: '1', nome: 'Zed', afinidade: 1 },
    { id: '2', nome: 'Ana', afinidade: -4 },
    { id: '3', nome: 'Bia', afinidade: 1, fixado: true },
  ]);
  assert.deepEqual(ordenarVinculos(lista).map((v) => v.id), ['3', '2', '1']);
});

test('teia aproxima quem tem afinidade alta e afasta quem e hostil', () => {
  const lista = normalizarVinculos([
    { id: 'amigo', nome: 'A', afinidade: 5 },
    { id: 'inimigo', nome: 'B', afinidade: -5 },
  ]);
  const [amigo, inimigo] = posicionarTeia(lista, 100);
  assert.ok(Math.hypot(amigo.x, amigo.y) < Math.hypot(inimigo.x, inimigo.y));
  assert.deepEqual(posicionarTeia([], 100), []);
});

test('sugere so aliados que ainda nao viraram vinculo', () => {
  const lista = normalizarVinculos([{ id: 'v', nome: 'Kel', aliadoId: 'al-1' }]);
  const sugeridos = aliadosSemVinculo(
    [{ id: 'al-1', nome: 'Kel' }, { id: 'al-2', nome: 'Rui' }, { id: 'al-3', nome: 'kel' }, { id: '', nome: 'Sem id' }],
    lista,
  );
  assert.deepEqual(sugeridos, [{ id: 'al-2', nome: 'Rui' }]);
});

const evento = (chave: string, tipo: IEventoDiario['tipo'], quando: string): IEventoDiario => ({ chave, tipo, quando, texto: chave });

test('marcas: vazias somem e o comentario e aparado', () => {
  assert.deepEqual(normalizarMarcas({ a: { fixado: true }, b: { comentario: '  oi ' }, c: { fixado: false }, d: 3 }), {
    a: { fixado: true },
    b: { comentario: 'oi' },
  });
  let marcas = alterarMarca({}, 'x', { fixado: true });
  marcas = alterarMarca(marcas, 'x', { comentario: 'grande dia' });
  assert.deepEqual(marcas.x, { fixado: true, comentario: 'grande dia' });
  marcas = alterarMarca(alterarMarca(marcas, 'x', { fixado: false }), 'x', { comentario: '' });
  assert.deepEqual(marcas, {});
});

test('filtros e agrupamento por dia respeitam a ordem recebida', () => {
  const eventos = [
    evento('1', 'critico', '2026-09-10T20:00:00'),
    evento('2', 'sessao', '2026-09-10T18:00:00'),
    evento('3', 'ganho', '2026-09-01T12:00:00'),
  ];
  assert.deepEqual(filtrarEventos(eventos, 'critico', {}).map((e) => e.chave), ['1']);
  assert.deepEqual(filtrarEventos(eventos, 'fixados', { 3: { fixado: true } }).map((e) => e.chave), ['3']);
  const dias = agruparPorDia(eventos);
  assert.equal(dias.length, 2);
  assert.deepEqual(dias[0].eventos.map((e) => e.chave), ['1', '2']);
});

import {
  agruparPorTipo,
  filtrarVinculos,
  fotoVinculoValida,
  selecionarParaTeia,
  LIMITE_FOTOS_VINCULO,
} from '../../src/pages/Ficha/utils/vinculos';

const muitos = (quantos: number) =>
  normalizarVinculos(Array.from({ length: quantos }, (_, indice) => ({
    id: `v${indice}`,
    nome: `Pessoa ${indice}`,
    tipo: indice % 2 ? 'rival' : 'amizade',
    afinidade: (indice % 11) - 5,
    criadoEm: indice,
  })));

test('foto de vinculo so vale como data URL de imagem e pequena', () => {
  assert.equal(fotoVinculoValida('data:image/webp;base64,AAAA'), true);
  assert.equal(fotoVinculoValida('https://exemplo.com/a.png'), false);
  assert.equal(fotoVinculoValida('data:text/html;base64,AAAA'), false);
  assert.equal(fotoVinculoValida(`data:image/webp;base64,${'A'.repeat(30_000)}`), false);
});

test('normalizar guarda a foto valida e limita quantas fotos entram na ficha', () => {
  const foto = 'data:image/webp;base64,AAAA';
  const lista = normalizarVinculos([
    { id: 'a', nome: 'Com foto', foto },
    { id: 'b', nome: 'Foto ruim', foto: 'javascript:alert(1)' },
    ...Array.from({ length: LIMITE_FOTOS_VINCULO + 3 }, (_, i) => ({ id: `x${i}`, nome: `X${i}`, foto })),
  ]);
  assert.equal(lista[0].foto, foto);
  assert.equal(lista[1].foto, undefined);
  assert.equal(lista.filter((v) => v.foto).length, LIMITE_FOTOS_VINCULO);
});

test('teia so mostra os mais relevantes, mas sempre inclui fixado e selecionado', () => {
  const lista = muitos(40);
  const semExtras = selecionarParaTeia(lista, 14);
  assert.equal(semExtras.visiveis.length, 14);
  assert.equal(semExtras.ocultos, 26);
  assert.ok(semExtras.visiveis.every((v) => Math.abs(v.afinidade) >= 4));

  const fraco = lista.find((v) => v.afinidade === 0)!;
  const comSelecao = selecionarParaTeia(lista, 14, fraco.id);
  assert.ok(comSelecao.visiveis.some((v) => v.id === fraco.id));

  const fixado = lista.map((v) => (v.id === fraco.id ? { ...v, fixado: true } : v));
  assert.ok(selecionarParaTeia(fixado, 14).visiveis.some((v) => v.id === fraco.id));

  const pouca = muitos(5);
  assert.deepEqual(selecionarParaTeia(pouca, 14), { visiveis: pouca, ocultos: 0 });
});

test('posicao na teia agrupa por tipo e nao muda quando a afinidade muda', () => {
  const lista = muitos(12);
  const antes = posicionarTeia(lista, 100);
  const alterada = lista.map((v) => (v.id === 'v3' ? { ...v, afinidade: 5 } : v));
  const depois = posicionarTeia(alterada, 100);
  const angulo = (p: { x: number; y: number }) => Math.atan2(p.y, p.x);
  const a = antes.find((p) => p.id === 'v3')!;
  const d = depois.find((p) => p.id === 'v3')!;
  assert.ok(Math.abs(angulo(a) - angulo(d)) < 1e-9);
});

test('filtro combina busca sem acento, tipo e faixa de afinidade', () => {
  const lista = normalizarVinculos([
    { id: '1', nome: 'José', tipo: 'amizade', afinidade: 3, nota: 'ferreiro' },
    { id: '2', nome: 'Ana', tipo: 'rival', afinidade: -2, nota: '' },
    { id: '3', nome: 'Bia', tipo: 'amizade', afinidade: 0, nota: 'conhece o Jose', fixado: true },
  ]);
  const base = { busca: '', tipo: 'todos', faixa: 'todos' } as const;
  assert.deepEqual(filtrarVinculos(lista, { ...base, busca: 'jose' }).map((v) => v.id), ['1', '3']);
  assert.deepEqual(filtrarVinculos(lista, { ...base, tipo: 'rival' }).map((v) => v.id), ['2']);
  assert.deepEqual(filtrarVinculos(lista, { ...base, faixa: 'hostis' }).map((v) => v.id), ['2']);
  assert.deepEqual(filtrarVinculos(lista, { ...base, faixa: 'fixados' }).map((v) => v.id), ['3']);
  assert.deepEqual(filtrarVinculos(lista, { ...base, faixa: 'neutros', tipo: 'amizade' }).map((v) => v.id), ['3']);
});

test('agrupamento segue a ordem dos tipos e some com grupo vazio', () => {
  const grupos = agruparPorTipo(muitos(6));
  assert.deepEqual(grupos.map((g) => g.tipo), ['amizade', 'rival']);
  assert.equal(grupos.reduce((soma, g) => soma + g.itens.length, 0), 6);
});
