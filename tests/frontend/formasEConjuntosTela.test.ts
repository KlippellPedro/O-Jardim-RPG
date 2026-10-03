import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/**
 * Renderiza os dois componentes novos de verdade (React, em HTML estático) sem
 * depender do Vite: o esbuild empacota os componentes junto com os serviços e o
 * Node importa o resultado. O loader dos testes não lê .tsx, por isso o caminho
 * é este.
 */
const raiz = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const resultado = await build({
  stdin: {
    resolveDir: raiz,
    sourcefile: 'entrada-tela.ts',
    loader: 'ts',
    contents: `
      import { createElement } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { FormasEConjunto } from './src/pages/Loja/components/FormasEConjunto';
      import { ResumoFormasEConjuntos } from './src/pages/Ficha/components/ResumoFormasEConjuntos';
      import { resumirEquipamentos } from './src/services/equipamentoService';
      import { CLASSES_CATALOGO } from './src/services/catalogoService';
      export const renderFormas = (props: any) => renderToStaticMarkup(createElement(FormasEConjunto, props));
      export const renderResumo = (resumo: any) => renderToStaticMarkup(createElement(ResumoFormasEConjuntos, { resumo }));
      export { resumirEquipamentos, CLASSES_CATALOGO };
    `,
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' },
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
const arquivo = join(mkdtempSync(join(tmpdir(), 'jardim-tela-')), 'tela.mjs');
writeFileSync(arquivo, resultado.outputFiles[0].text);
const modulo: any = await import(pathToFileURL(arquivo).href);

const catalogo = (await import('../../data/loja/catalogo.json', { with: { type: 'json' } })).default as any;
const entrada = (id: string) => catalogo.entradas.find((item: any) => item.id === id);

test('a Loja mostra o preço do poder, as formas e marca a forma do comprador', () => {
  const colar = entrada('artefato-colar-de-vida-emprestada');
  const html = modulo.renderFormas({ dados: colar.conteudo, itemId: colar.id, nivelDoComprador: 22 });
  assert.match(html, /Preço do poder/);
  assert.match(html, /Desperta com o dono/);
  assert.match(html, /Fio Fino/);
  assert.match(html, /Corrente/);
  assert.match(html, /−20 de Sanidade máxima/);
  // Nível 22: a forma de agora é a do nível 20, a segunda.
  assert.equal(html.split('forma do seu personagem').length - 1, 1);
  assert.ok(html.indexOf('Fio Grosso') < html.indexOf('forma do seu personagem'));
  assert.ok(html.indexOf('forma do seu personagem') < html.indexOf('Corrente'));
});

test('a Loja mostra o conjunto da peça com as peças e os bônus', () => {
  const botas = entrada('equipamento-botas-de-longa-marcha');
  const html = modulo.renderFormas({ dados: botas.conteudo, itemId: botas.id });
  assert.match(html, /Conjunto do Caminhante/);
  assert.match(html, /Capa de Caminhante/);
  assert.match(html, /Cinto de Alforjes/);
  assert.match(html, /3 peças/);
  assert.match(html, /Efeito automático na ficha/);
  assert.doesNotMatch(html, /Preço do poder/);
  assert.doesNotMatch(html, /forma do seu personagem/);
});

test('item sem forma, dilema nem conjunto não ganha bloco extra', () => {
  const lampiao = entrada('lampiao');
  assert.equal(modulo.renderFormas({ dados: lampiao.conteudo, itemId: lampiao.id }), '');
});

test('o Inventário resume a forma de agora e o progresso do conjunto', () => {
  const classeId = modulo.CLASSES_CATALOGO[0].id;
  const ficha = { atributosFinais: { forca: 10 }, classes: [{ classeId, nivel: 16 }] };
  const equipado = (id: string, titulo: string, dados: Record<string, unknown>) => ({
    item_id: id, titulo, quantidade: 1, dados: { equipado: true, catalogo_item_id: id, ...dados },
  });
  const anel = entrada('artefato-anel-do-herdeiro');
  const capa = entrada('equipamento-capa-de-caminhante');
  const resumo = modulo.resumirEquipamentos([
    equipado(anel.id, anel.titulo, { ...anel.conteudo, tipo: 'artefato', categoria: 'geral' }),
    equipado(capa.id, capa.titulo, { ...capa.conteudo, categoria: 'geral' }),
  ], ficha);
  const html = modulo.renderResumo(resumo);
  assert.match(html, /Anel do Herdeiro: Aro Lembrado/);
  assert.match(html, /\+2 em Vontade, \+5 de Sanidade máxima/);
  assert.match(html, /Próxima forma no nível total 30: Aro Herdado/);
  assert.match(html, /Conjunto do Caminhante: 1 de 3 peças/);
  assert.match(html, /Com 2 peças: \+5 de Estamina máxima/);

  assert.equal(modulo.renderResumo(modulo.resumirEquipamentos([], ficha)), '');
});
