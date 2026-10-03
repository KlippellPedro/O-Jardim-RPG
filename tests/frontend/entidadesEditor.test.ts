import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORMULARIO_VAZIO,
  contoParaTexto,
  formularioDaEntidade,
  idDaEntidade,
  montarEntidade,
  problemasDoFormulario,
  temaDaCor,
  textoParaConto,
} from '../../src/services/entidadesEditorService.ts';

/** O mesmo padrão de cor que o servidor aceita (plataforma/routers/content.py, _ENTITY_COLOR). */
const COR_DO_SERVIDOR = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/;

const formulario = {
  ...FORMULARIO_VAZIO,
  id: 'colecionador-de-sombras',
  nome: 'Colecionador de Sombras',
  classificacao: ['negociador' as const],
  texto: 'Ele chegou com a feira.\n\nNinguém lembrou de vê-lo partir.',
};

test('o identificador sai do nome, sem acento e com hífen', () => {
  assert.equal(idDaEntidade('Colecionador de Sombras'), 'colecionador-de-sombras');
  assert.equal(idDaEntidade('  Mãe d\'Água!  '), 'mae-d-agua');
  assert.equal(idDaEntidade('Ço'), 'co');
});

test('linha em branco separa parágrafos e "# " abre uma parte nova', () => {
  const conto = textoParaConto('Primeiro parágrafo\ncontinua aqui.\n\nSegundo.\n\n# A volta\n\nTerceiro.');
  assert.deepEqual(conto, [
    { paragrafos: ['Primeiro parágrafo continua aqui.', 'Segundo.'] },
    { titulo: 'A volta', paragrafos: ['Terceiro.'] },
  ]);
  assert.deepEqual(textoParaConto('\n\n   \n'), []);
  // Parte com título e sem texto não entra.
  assert.deepEqual(textoParaConto('# Só título'), []);
});

test('o texto volta igual depois de virar conto', () => {
  const texto = 'Primeiro.\n\nSegundo.\n\n# A volta\n\nTerceiro.';
  assert.equal(contoParaTexto(textoParaConto(texto)), texto);
});

test('o tema sai de uma cor só e toda cor passa no servidor', () => {
  const tema = temaDaCor('#C9A227');
  assert.equal(tema.destaque, '#c9a227');
  assert.equal(tema.destaqueSuave, 'rgba(201, 162, 39, .15)');
  for (const cor of Object.values(tema)) assert.match(String(cor), COR_DO_SERVIDOR);
  assert.equal(temaDaCor('vermelho').destaque, FORMULARIO_VAZIO.cor);
});

test('o documento tem o formato das Entidades oficiais e deixa de fora campo vazio', () => {
  const entidade = montarEntidade({ ...formulario, epigrafe: '  ', resumo: 'Compra sombras.' });
  assert.equal(entidade.id, 'colecionador-de-sombras');
  assert.equal(entidade.registroUniversal, true);
  assert.equal(entidade.revelado, true);
  assert.equal(entidade.resumo, 'Compra sombras.');
  assert.ok(!('epigrafe' in entidade));
  assert.ok(!('epiteto' in entidade));
  assert.deepEqual(entidade.conto, [{ paragrafos: ['Ele chegou com a feira.', 'Ninguém lembrou de vê-lo partir.'] }]);
  // Só campos que o servidor aceita.
  const aceitos = new Set(['id', 'nome', 'registroUniversal', 'epiteto', 'epigrafe', 'resumo', 'rankPerigo', 'classificacao', 'tema', 'conto', 'revelado']);
  for (const chave of Object.keys(entidade)) assert.ok(aceitos.has(chave), `campo ${chave} seria recusado`);
});

test('abrir um conto salvo devolve o mesmo formulário', () => {
  const entidade = montarEntidade({ ...formulario, epiteto: 'O que compra', cor: '#336699', revelado: false });
  const volta = formularioDaEntidade(entidade, false);
  assert.deepEqual(volta, { ...formulario, epiteto: 'O que compra', cor: '#336699', revelado: false });
});

test('o formulário avisa o que falta antes de mandar para o servidor', () => {
  assert.deepEqual(problemasDoFormulario(formulario), []);
  assert.ok(problemasDoFormulario({ ...formulario, nome: ' ' }).some((p) => p.includes('nome')));
  assert.ok(problemasDoFormulario({ ...formulario, id: 'Com Espaço' }).some((p) => p.includes('identificador')));
  assert.ok(problemasDoFormulario({ ...formulario, classificacao: [] }).some((p) => p.includes('classificação')));
  assert.ok(problemasDoFormulario({ ...formulario, texto: '' }).some((p) => p.includes('conto')));
  assert.ok(problemasDoFormulario({ ...formulario, texto: 'x'.repeat(5001) }).some((p) => p.includes('5000')));
  assert.ok(problemasDoFormulario({ ...formulario, resumo: 'x'.repeat(601) }).some((p) => p.includes('resumo')));
});
