import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes';

// Não há infraestrutura de teste de componente React neste projeto (sem
// jsdom/@testing-library), então este teste verifica estaticamente que o
// editor de condições da sessão ao vivo consome a mesma fonte oficial que a
// ficha já usava — em vez de renderizar o componente, lê o arquivo-fonte e
// confirma a importação e a ausência de uma segunda lista hardcoded (achado
// 9 da auditoria 2026-08).
const codigoEditorSessao = readFileSync(
  new URL('../../src/pages/Sessao/components/EntityEditor.tsx', import.meta.url),
  'utf8',
);

test('editor de condições da sessão importa o catálogo oficial em vez de duplicar a lista', () => {
  assert.match(
    codigoEditorSessao,
    /import\s*\{\s*CONDICOES_OFICIAIS,\s*CRISES_SANIDADE\s*\}\s*from\s*'..\/..\/..\/..\/data\/regras\/condicoes'/,
    'EntityEditor.tsx deveria importar CONDICOES_OFICIAIS/CRISES_SANIDADE de data/regras/condicoes, não redefinir a lista',
  );
});

test('a seleção rápida de condições na sessão cobre as 11 condições oficiais e as 6 crises', () => {
  // Confere que o componente realmente itera sobre as duas listas
  // combinadas (não só uma das duas).
  assert.match(codigoEditorSessao, /CONDICOES_RAPIDAS\s*=\s*\[\.\.\.CONDICOES_OFICIAIS,\s*\.\.\.CRISES_SANIDADE\]/);
  assert.equal(CONDICOES_OFICIAIS.length, 11);
  assert.equal(CRISES_SANIDADE.length, 6);
});

test('editor de condições da sessão continua aceitando condição personalizada (texto livre), não só o catálogo oficial', () => {
  // O ponto do achado 9 era ADICIONAR o atalho oficial, não remover a
  // flexibilidade de anotar uma condição narrativa que não está no catálogo.
  assert.match(codigoEditorSessao, /placeholder="Nova condição/);
});
