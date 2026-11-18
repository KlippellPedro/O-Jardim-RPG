import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TAMANHO_MAXIMO_FOTO,
  cabeNoLimite,
  deCampoDataHora,
  estiloDoPapel,
  filtrarMural,
  formatarDataDaSessao,
  giroDoPapel,
  lideresDoRank,
  montarMes,
  paraCampoDataHora,
  partesDaSessao,
  planoDeReducao,
  porcentagem,
  rotuloDoMes,
  separarMural,
  sessoesPorDia,
  somarMeses,
} from '../../src/pages/Quadro/quadro';
import type { IItemMural } from '../../src/services/engajamentoApi';

test('mes monta semanas de segunda a domingo com celulas vazias nas pontas', () => {
  const semanas = montarMes('2026-09');
  assert.ok(semanas.every((semana) => semana.length === 7));
  const dias = semanas.flat().filter((celula) => celula.data);
  assert.equal(dias.length, 30);
  // 1 de setembro de 2026 e terca: uma celula vazia antes.
  assert.equal(semanas[0][0].data, null);
  assert.equal(semanas[0][1].data, '2026-09-01');
});

test('navegacao de meses vira o ano e o rotulo comeca em maiuscula', () => {
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.equal(somarMeses('2026-01', -1), '2025-12');
  assert.match(rotuloDoMes('2026-09'), /^Setembro/);
});

test('sessoes sao agrupadas por dia', () => {
  const mapa = sessoesPorDia([{ data: '2026-09-25', n: 1 }, { data: '2026-09-25', n: 2 }, { data: '2026-09-26', n: 3 }]);
  assert.equal(mapa.get('2026-09-25')?.length, 2);
  assert.equal(mapa.get('2026-09-26')?.length, 1);
});

test('data e hora fazem ida e volta com o campo do navegador', () => {
  const iso = new Date(2026, 8, 27, 20, 30).toISOString();
  const campo = paraCampoDataHora(iso);
  assert.equal(campo, '2026-09-27T20:30');
  assert.equal(deCampoDataHora(campo), iso);
  assert.equal(deCampoDataHora(''), null);
  assert.equal(deCampoDataHora('lixo'), null);
  assert.equal(paraCampoDataHora(null), '');
  assert.equal(paraCampoDataHora('nao-e-data'), '');
});

test('texto da data da sessao traz dia da semana e hora', () => {
  const texto = formatarDataDaSessao(new Date(2026, 8, 27, 20, 30).toISOString());
  assert.match(texto, /20:30/);
  assert.match(texto, /domingo|sábado|segunda|terça|quarta|quinta|sexta/i);
  assert.equal(formatarDataDaSessao('lixo'), '');
});

const item = (extra: Partial<IItemMural>): IItemMural => ({
  id: 'i', tipo: 'citacao', texto: 't', imagem: null, autor: 'a', publicado_por: 'p', sessao_id: null,
  criado_em: '2026-09-21T20:00:00Z', votos: 0, votei: false, meu: false, pode_apagar: false, melhor_da_noite: false, ...extra,
});

test('mural separa fotos e frases sem trocar a ordem', () => {
  const { fotos, frases } = separarMural([item({ id: '1', tipo: 'foto' }), item({ id: '2' }), item({ id: '3', tipo: 'foto' }), item({ id: '4' })]);
  assert.deepEqual(fotos.map((i) => i.id), ['1', '3']);
  assert.deepEqual(frases.map((i) => i.id), ['2', '4']);
});

test('plano de reducao nunca amplia a foto e vai do maior para o menor', () => {
  const plano = planoDeReducao(3000, 2000);
  assert.deepEqual(plano[0], { lado: 900, qualidade: 0.78 });
  assert.ok(plano.every((passo, i) => i === 0 || passo.lado <= plano[i - 1].lado));
  const pequena = planoDeReducao(300, 200);
  assert.ok(pequena.every((passo) => passo.lado <= 300));
  assert.equal(plano.length, 12);
});

test('limite de tamanho da foto bate com o do servidor', () => {
  assert.equal(TAMANHO_MAXIMO_FOTO, 150_000);
  assert.equal(cabeNoLimite('x'.repeat(150_000)), true);
  assert.equal(cabeNoLimite('x'.repeat(150_001)), false);
});

test('mural filtra por tipo e "tudo" devolve a lista como veio', () => {
  const lista = [item({ id: '1', tipo: 'foto' }), item({ id: '2' }), item({ id: '3', tipo: 'foto' })];
  assert.deepEqual(filtrarMural(lista, 'tudo').map((i) => i.id), ['1', '2', '3']);
  assert.deepEqual(filtrarMural(lista, 'fotos').map((i) => i.id), ['1', '3']);
  assert.deepEqual(filtrarMural(lista, 'frases').map((i) => i.id), ['2']);
});

test('papel do mural cai sempre torto do mesmo jeito, dentro do limite e nunca reto', () => {
  const ids = Array.from({ length: 200 }, (_, i) => `item-${i}`);
  ids.forEach((id) => {
    const giro = giroDoPapel(id);
    assert.equal(giro, giroDoPapel(id));
    assert.ok(Math.abs(giro) <= 2.4, `${id}: ${giro}`);
    assert.ok(Math.abs(giro) >= 0.6, `${id}: ${giro}`);
  });
  // Ids diferentes não caem todos no mesmo ângulo.
  assert.ok(new Set(ids.map((id) => giroDoPapel(id))).size > 10);
  const estilo = estiloDoPapel('abc');
  assert.deepEqual(estilo, estiloDoPapel('abc'));
  assert.match(estilo.papel, /^#[0-9a-f]{6}$/);
  assert.match(estilo.alfinete, /^#[0-9a-f]{6}$/);
});

test('rank marca o maior valor de cada coluna e zero nao lidera', () => {
  const linha = (extra: Partial<Record<string, number>>) => ({ rolagens: 0, criticos: 0, falhas: 0, dano_maximo: 0, lunaris_gastos: 0, ...extra });
  const lideres = lideresDoRank([linha({ rolagens: 14, criticos: 4 }), linha({ rolagens: 9, dano_maximo: 40 })]);
  assert.equal(lideres.rolagens, 14);
  assert.equal(lideres.criticos, 4);
  assert.equal(lideres.dano_maximo, 40);
  assert.equal(lideres.falhas, 0);
  assert.deepEqual(lideresDoRank([]), { rolagens: 0, criticos: 0, falhas: 0, dano_maximo: 0, lunaris_gastos: 0 });
});

test('porcentagem fica entre 0 e 100 e aguenta total zero', () => {
  assert.equal(porcentagem(1, 19), 5);
  assert.equal(porcentagem(19, 19), 100);
  assert.equal(porcentagem(30, 19), 100);
  assert.equal(porcentagem(3, 0), 0);
});

test('proxima sessao separa dia e hora', () => {
  const partes = partesDaSessao(new Date(2026, 10, 22, 20, 0).toISOString());
  assert.equal(partes?.hora, '20:00');
  assert.match(partes?.dia ?? '', /domingo, 22/);
  assert.equal(partesDaSessao('lixo'), null);
});
