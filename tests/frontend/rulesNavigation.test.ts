import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GRUPOS_NAVEGACAO,
  grupoDoTopico,
  ordenarTopicosPorNavegacao,
} from '../../data/regras/navegacao';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';

test('todo capítulo aparece uma única vez nos novos grupos', () => {
  const agrupados = GRUPOS_NAVEGACAO.flatMap((grupo) => grupo.topicos);
  const unicos = new Set(agrupados);

  assert.equal(unicos.size, agrupados.length, 'um capítulo foi repetido em mais de um grupo');
  assert.deepEqual(
    [...unicos].sort(),
    Object.keys(REGRAS_OFICIAIS).sort(),
    'a navegação precisa cobrir todas as páginas do livro',
  );
  GRUPOS_NAVEGACAO.forEach((grupo) => {
    assert.ok(grupo.topicos.length <= 11, `${grupo.titulo}: voltou a concentrar capítulos demais`);
    assert.ok(grupo.descricao.trim().length >= 20, `${grupo.titulo}: sem descrição útil na página inicial`);
  });
});

test('ordem do livro segue os grupos e preserva tópicos desconhecidos no final', () => {
  const entrada = ['mestre', 'combate', 'como-jogar', 'pagina-futura'];
  assert.deepEqual(
    ordenarTopicosPorNavegacao(entrada),
    ['como-jogar', 'combate', 'mestre', 'pagina-futura'],
  );
  assert.equal(grupoDoTopico('classes')?.titulo, 'Personagem e Progressão');
  assert.equal(grupoDoTopico('transporte')?.titulo, 'Veículos e Viagens');
});

test('capítulos extensos foram divididos pela tarefa de consulta', () => {
  assert.doesNotMatch(REGRAS_OFICIAIS['magia-fluxo'].corpo, /<h3[^>]*>Rituais<\/h3>/);
  assert.match(REGRAS_OFICIAIS['rituais-selos'].corpo, /<h3[^>]*>Rituais<\/h3>/);
  assert.match(REGRAS_OFICIAIS['marcas-cicatrizes'].corpo, /Marcas por Fluxo/);
  assert.match(REGRAS_OFICIAIS['catalogo-magico'].corpo, /O que está no catálogo/);

  assert.doesNotMatch(REGRAS_OFICIAIS.veiculos.corpo, /<h3[^>]*>Perseguições<\/h3>/);
  assert.match(REGRAS_OFICIAIS['veiculos-cenas'].corpo, /<h3[^>]*>Perseguições<\/h3>/);
  assert.match(REGRAS_OFICIAIS['veiculos-manutencao'].corpo, /<h3[^>]*>Reparo<\/h3>/);

  assert.doesNotMatch(REGRAS_OFICIAIS['raridades-modificacoes'].corpo, /Catálogo por categoria/);
  assert.match(REGRAS_OFICIAIS['modificacoes-equipamentos'].corpo, /Catálogo por categoria/);
});
