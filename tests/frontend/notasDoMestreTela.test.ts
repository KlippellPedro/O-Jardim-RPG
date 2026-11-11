import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/**
 * Renderiza de verdade (React, em HTML estático) as telas que mostram a nota do Mestre, como em
 * formasEConjuntosTela.test.ts: o esbuild empacota os componentes e o Node importa o resultado.
 */
const raiz = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const resultado = await build({
  stdin: {
    resolveDir: raiz,
    sourcefile: 'entrada-nota.ts',
    loader: 'ts',
    contents: `
      import { createElement } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MenuToken } from './src/pages/Mapa/componentes/MenuToken';
      import { BarraToken } from './src/pages/Mapa/componentes/BarraToken';
      import { BarraMapaColocado } from './src/pages/Mapa/componentes/BarraMapaColocado';
      import { ConfigCena } from './src/pages/Mapa/componentes/CenasDoMestre';
      const nada = () => undefined;
      export const menuToken = (props: any) => renderToStaticMarkup(createElement(MenuToken, { molduraMesa: null, onEditar: nada, onNota: nada, onMoldura: nada, onEnquadramento: nada, onFechar: nada, ...props }));
      export const barraToken = (props: any) => renderToStaticMarkup(createElement(BarraToken, { opcoesAbertas: false, onOpcoes: nada, onOculto: nada, onRemover: nada, ...props }));
      export const barraMapa = (props: any) => renderToStaticMarkup(createElement(BarraMapaColocado, { tamanhoCasa: 100, onMudar: nada, onOrdem: nada, onDuplicar: nada, onRenomear: nada, onApagar: nada, ...props }));
      export const configCena = (props: any) => renderToStaticMarkup(createElement(ConfigCena, { molduraMesa: null, onMolduraMesa: nada, onSalvar: nada, onApagar: nada, onFechar: nada, ...props }));
    `,
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  logLevel: 'silent',
  loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' },
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
const arquivo = join(mkdtempSync(join(tmpdir(), 'jardim-nota-')), 'tela.mjs');
writeFileSync(arquivo, resultado.outputFiles[0].text);
const modulo: any = await import(pathToFileURL(arquivo).href);

const NOTA = 'Guarda a chave da cripta. Fraco ao fogo.';
const token = (extra: object = {}) => ({
  id: 't1', x: 0, y: 0, porte: 1, lado: 'inimigo', nome: 'Lich', imagem: null, nivel: null, barras: [], condicoes: [], moldura: 'lado',
  enquadramento: { zoom: 1, x: 0, y: 0 }, luz: null, e_meu: false, pode_mover: true, desconhecido: false, personagem_id: null, ...extra,
});

test('nota do Mestre: as opções do token mostram a caixa só para o Mestre', () => {
  const doMestre = modulo.menuToken({ token: token({ nota_mestre: NOTA }), gestor: true });
  assert.match(doMestre, /<textarea[^>]*>/);
  assert.ok(doMestre.includes(NOTA));
  assert.match(doMestre, /Só você vê/);
  // Um jogador não vê a caixa, mesmo que o dado por engano tivesse chegado (o servidor nem o manda).
  const doJogador = modulo.menuToken({ token: token({ nota_mestre: NOTA, e_meu: true }), gestor: false });
  assert.ok(!doJogador.includes('<textarea'));
  assert.ok(!doJogador.includes(NOTA));
  assert.ok(!doJogador.includes('Nota do Mestre'));
});

test('nota do Mestre: a barra do token mostra o bilhete só quando há nota e só para o Mestre', () => {
  const com = modulo.barraToken({ token: token({ nota_mestre: NOTA }), gestor: true, onNota: () => undefined });
  assert.match(com, /aria-label="Ler a nota do Mestre deste token"/);
  assert.ok(com.includes('Nota do Mestre: Guarda a chave da cripta. Fraco ao fogo.'));
  assert.ok(!modulo.barraToken({ token: token({ nota_mestre: '  \n ' }), gestor: true, onNota: () => undefined }).includes('Ler a nota'));
  assert.ok(!modulo.barraToken({ token: token(), gestor: true, onNota: () => undefined }).includes('Ler a nota'));
  const jogador = modulo.barraToken({ token: token({ nota_mestre: NOTA }), gestor: false, onNota: () => undefined });
  assert.ok(!jogador.includes('Ler a nota') && !jogador.includes(NOTA));
});

test('nota do Mestre: a barra do mapa colocado acende o botão da nota quando ela existe', () => {
  const mapa = { id: 'm1', imagem_id: 'i1', x: 0, y: 0, escala: 1, largura: 1000, altura: 800, ladrilho: 512, chaves: [], nome: 'Sala', visivel: true, trancado: false };
  const sem = modulo.barraMapa({ mapa });
  assert.match(sem, /aria-label="Nota do Mestre sobre este mapa"/);
  assert.ok(sem.includes('os jogadores não veem'));
  const com = modulo.barraMapa({ mapa: { ...mapa, nota: 'Passagem secreta atrás da estátua' } });
  assert.ok(com.includes('Nota do Mestre: Passagem secreta atrás da estátua'));
  assert.match(com, /class="ativo"[^>]*aria-label="Nota do Mestre sobre este mapa"/);
});

test('nota do Mestre: a configuração da cena traz a nota do mapa', () => {
  const cena = { id: 'c1', nome: 'Cripta', ativa: true, versao: 1, largura: 3000, altura: 2000, livre: false, mapa: null, nota_mestre: 'Cheira a enxofre.' };
  const html = modulo.configCena({ cena });
  assert.match(html, /<textarea[^>]*>Cheira a enxofre\.<\/textarea>/);
  assert.match(html, /Nota do Mestre sobre este mapa/);
});
