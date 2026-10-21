import assert from 'node:assert/strict';
import test from 'node:test';

import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { nivelDeInvocador } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (opção A da decisão 6): as invocações são feitas do
// Fluxo nativo, atacam com o teste de conjuração, ficam no máximo duas em cena,
// agem logo depois do turno do Invocador, não custam Mana e voltam no descanso
// longo depois de cair.

const invocador = CLASSES_CATALOGO.find((classe) => classe.id === 'invocador') as any;
const todosOsBlocos = () => [...(invocador.habilidades || []), ...(invocador.eventos || []), ...(invocador.poderes || [])];
const bloco = (id: string) => {
  const encontrado = todosOsBlocos().find((item: any) => item.id === id);
  assert.ok(encontrado, `${id} sumiu do Invocador`);
  return encontrado;
};

test('o Pacto diz como a invocação joga', () => {
  const primeiro = bloco('pacto-de-genese').estagios.find((estagio: any) => estagio.nivel === 1);
  const texto = primeiro.descricao;
  assert.match(texto, /Fluxo nativo/);
  assert.match(texto, /Até duas ficam em cena/);
  assert.match(texto, /logo depois do seu turno/);
  assert.match(texto, /teste de conjuração/);
  assert.match(texto, /não custa Mana/);
  assert.match(texto, /descanso longo/);
  assert.doesNotMatch(texto, / - /, 'travessão disfarçado');
  assert.match(invocador.descricao, /duas criaturas/);
});

test('o Catálogo não usa mais a DT do Invocador para a Presa da Aranha', () => {
  const notas = invocador.tarefas_bancada.itens.map((item: any) => item.nota).join('\n');
  assert.doesNotMatch(notas, /DT do Invocador/);
  assert.equal(invocador.tarefas_bancada.itens.filter((item: any) => /total do ataque/.test(item.nota)).length, 5);
  assert.match(invocador.tarefas_bancada.descricao, /teste de conjuração/);
});

test('poderes e formas falam a língua das regras', () => {
  assert.doesNotMatch(bloco('olhos-compartilhados').descricao, /Surpreendido/);
  assert.match(bloco('essencia-adaptavel').descricao, /Fogo, Gelo, Raio ou Ácido/);
  assert.match(bloco('chamado-rapido').descricao, /guardada/);
  const formas = bloco('formas-vinculadas').opcoes;
  assert.match(formas.find((forma: any) => forma.id === 'fera').descricao, /o maior entre o dela e o seu/);
  assert.doesNotMatch(formas.find((forma: any) => forma.id === 'espirito').escalonamento, /energia/);
});

test('a ficha reconhece o nível de Invocador', () => {
  assert.equal(nivelDeInvocador({ classeId: 'invocador', classes: [{ classeId: 'invocador', nivel: 7 }], nivel: 27 }), 7);
  assert.equal(nivelDeInvocador({ classeId: 'canalizador', classes: [{ classeId: 'canalizador', nivel: 10 }], nivel: 10 }), 0);
});

test('o Livro imprime as 30 fichas do Catálogo de Invocações', async () => {
  const { corpoDaClasse } = await import('../../tools/documentos-mundo/compendio.mjs') as any;
  const corpo = corpoDaClasse(invocador);
  for (const item of invocador.tarefas_bancada.itens) assert.ok(corpo.includes(item.tarefa), item.tarefa);
  assert.ok(!corpo.includes(invocador.tarefas_bancada.resumo_no_topo), 'a frase do site não vai para o livro');
});
