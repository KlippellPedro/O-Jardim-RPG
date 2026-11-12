import assert from 'node:assert/strict';
import test from 'node:test';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import {
  acoesDeMesa,
  agruparAcoesMesa,
  classificarAcaoMesa,
  desmarcarUso,
  filtrarAcoesMesa,
  lerLimiteMesa,
  marcarUso,
  usosRestantes,
  zerarUsos,
  type IAcaoMesa,
} from '../../src/services/acoesDeMesa';

const ficha = (classes: Array<[string, number]>, extra: Record<string, unknown> = {}) => ({
  racaId: 'humano',
  classeId: classes[0][0],
  classes: classes.map(([classeId, nivel]) => ({ classeId, nivel })),
  nivel: classes.reduce((total, [, nivel]) => total + nivel, 0),
  atributosFinais: { forca: 14, destreza: 14, constituicao: 14, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 15 },
  escolhasHabilidade: {},
  legadosSelecionados: [],
  ...extra,
});

test('classifica o texto de ação do catálogo', () => {
  assert.equal(classificarAcaoMesa('Ação Livre antes do ataque'), 'livre');
  assert.equal(classificarAcaoMesa('Reação'), 'reacao');
  assert.equal(classificarAcaoMesa('Ação Padrão'), 'padrao');
  assert.equal(classificarAcaoMesa('Ação de Movimento para comandar'), 'movimento');
  assert.equal(classificarAcaoMesa('Ação Completa'), 'completa');
  assert.equal(classificarAcaoMesa('Ação Completa durante um descanso completo'), 'fora');
  assert.equal(classificarAcaoMesa('Dez minutos ou durante um descanso'), 'fora');
  assert.equal(classificarAcaoMesa('Declarado ao iniciar o rito'), 'fora');
  assert.equal(classificarAcaoMesa('Passivo'), 'passivo');
  assert.equal(classificarAcaoMesa(undefined), 'passivo');
  assert.equal(classificarAcaoMesa(undefined, true), 'livre', 'sem ação, mas com limite de uso, é um gatilho');
});

test('lê o limite de uso no campo ou na descrição', () => {
  assert.deepEqual(lerLimiteMesa('Uma vez por cena'), { vezes: 1, janela: 'cena', rotulo: '1× por cena' });
  assert.deepEqual(lerLimiteMesa('Duas vezes por descanso completo'), { vezes: 2, janela: 'descanso', rotulo: '2× por descanso' });
  assert.deepEqual(lerLimiteMesa(undefined, 'Uma vez por sessão, repita um teste.'), { vezes: 1, janela: 'sessao', rotulo: '1× por sessão' });
  assert.deepEqual(lerLimiteMesa('1/rodada'), { vezes: 1, janela: 'rodada', rotulo: '1× por rodada' });
  // Turno e rodada são janelas diferentes: "por turno" vale em cada turno de qualquer criatura.
  assert.deepEqual(lerLimiteMesa('Uma vez por turno'), { vezes: 1, janela: 'turno', rotulo: '1× por turno' });
  assert.equal(lerLimiteMesa('Sempre'), null);
});

test('a ficha vira grupos por tipo de ação, com passivos à parte', () => {
  const lista = acoesDeMesa(ficha([['guardiao', 20]], {
    poderesClasseSelecionados: [
      { classeId: 'guardiao', poderId: 'muralha-de-cobre' },
      { classeId: 'guardiao', poderId: 'escudo-humano' },
      { classeId: 'guardiao', poderId: 'muralha-de-diamante' },
    ],
  }));
  const { grupos, passivos } = agruparAcoesMesa(lista);
  const reacoes = grupos.find((grupo) => grupo.tipo === 'reacao')?.itens.map((item) => item.titulo) ?? [];
  assert.ok(reacoes.includes('Escudo Humano'));
  assert.ok(reacoes.includes('Sentinela'));
  assert.ok(passivos.some((item) => item.titulo === 'Muralha'));
  assert.ok(!grupos.some((grupo) => grupo.tipo === 'passivo'), 'passivo nunca entra nos grupos do turno');
  // Provocar tem estágios; o que vale na mesa é o estágio mais recente que pede ação.
  const provocar = lista.find((item) => item.titulo === 'Provocar');
  assert.ok(provocar && provocar.tipo !== 'passivo');
  assert.equal(provocar?.custoEstamina, 7);
});

test('traço racial com usos por recuperação vira contador', () => {
  const lista = acoesDeMesa(ficha([['guerreiro', 5]], { racaId: 'anao' }));
  const comContador = lista.filter((item) => item.fonte === 'raca' && item.limite);
  for (const item of comContador) assert.ok(['cena', 'descanso', 'sessao', 'dia', 'rodada', 'turno'].includes(item.limite!.janela));
});

const item = (janela: 'cena' | 'descanso' | 'sessao' | 'rodada' | 'turno', vezes = 2, id = `x-${janela}`): IAcaoMesa => ({
  id, titulo: id, origem: 'Teste', fonte: 'poder', tipo: 'livre', acao: 'Ação Livre', descricao: '',
  custoMana: 0, custoEstamina: 0, limite: { vezes, janela, rotulo: '' },
});

test('contadores marcam até o limite e zeram pela janela', () => {
  const cena = item('cena');
  const descanso = item('descanso', 1);
  const sessao = item('sessao', 1);
  let usos = marcarUso({}, cena);
  usos = marcarUso(usos, cena);
  assert.equal(marcarUso(usos, cena), usos, 'não passa do limite');
  assert.equal(usosRestantes(usos, cena), 0);
  usos = marcarUso(marcarUso(usos, descanso), sessao);
  const lista = [cena, descanso, sessao];
  assert.deepEqual(zerarUsos(usos, lista, 'cena'), { [descanso.id]: 1, [sessao.id]: 1 });
  assert.deepEqual(zerarUsos(usos, lista, 'descanso'), { [sessao.id]: 1 });
  assert.deepEqual(zerarUsos(usos, lista, 'sessao'), {});
  assert.deepEqual(desmarcarUso({ [cena.id]: 1 }, cena), {});
  assert.equal(usosRestantes({}, item('rodada')), null, 'por rodada é só lembrete');
  assert.deepEqual(marcarUso({}, item('rodada')), {});
  assert.equal(usosRestantes({}, item('turno')), null, 'por turno também é só lembrete');
  assert.deepEqual(marcarUso({}, item('turno')), {});
});

test('nível 60 de três classes: menos da metade pede decisão de cada vez, e a busca acha sem acento', () => {
  const ids = ['guerreiro', 'medico', 'campeao-dimensional'];
  const poderes = ids.flatMap((classeId) => (CLASSES_CATALOGO.find((classe) => classe.id === classeId)?.poderes ?? [])
    .slice(0, 8).map((poder) => ({ classeId, poderId: poder.id })));
  const lista = acoesDeMesa(ficha(ids.map((id) => [id, 20] as [string, number]), { arvoreId: 'axis', poderesClasseSelecionados: poderes }));
  const { grupos, passivos } = agruparAcoesMesa(lista);
  assert.ok(lista.length > 20);
  assert.ok(passivos.length > 0);
  const maior = Math.max(...grupos.map((grupo) => grupo.itens.length));
  assert.ok(maior < lista.length / 2, `o maior grupo tem ${maior} de ${lista.length}`);
  const alvo = lista[0];
  const semAcento = alvo.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  assert.ok(filtrarAcoesMesa(lista, semAcento).some((achado) => achado.id === alvo.id));
});
