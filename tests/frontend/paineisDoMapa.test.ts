import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Os painéis de configuração do mapa (token, clima, grade, trilha, portal...) eram pequenos: 280 a 340 px.
// Agora a largura vem de uma variável só.

const css = (arquivo: string) => readFileSync(new URL(`../../src/pages/Mapa/${arquivo}`, import.meta.url), 'utf8');

test('os painéis de configuração usam a largura da variável e ela passa de 340 px', () => {
  const mapa = css('mapa.css');
  const largura = Number(mapa.match(/--mapa-largura-painel:\s*(\d+)px/)![1]);
  assert.ok(largura >= 380 && largura <= 460, `largura ${largura}`);
  const usos = mapa.match(/min\(var\(--mapa-largura-painel\), calc\(100% - (24|16)px\)\)/g) ?? [];
  assert.ok(usos.length >= 10, `só ${usos.length} painéis usam a variável`);
  assert.match(css('navegacao.css'), /\.mapa-config\.mesa-painel \{[^}]*--mapa-largura-painel/);
});

test('nenhum painel de configuração ficou com a largura pequena de antes', () => {
  const todos = `${css('mapa.css')}\n${css('navegacao.css')}`;
  for (const seletor of ['.mapa-config.mapa-portal-painel', '.mapa-config.mapa-porta-painel', '.mapa-clima', '.mapa-tempo-painel', '.mapa-config.mesa-painel', '.mapa-config-barras']) {
    const bloco = todos.match(new RegExp(`${seletor.replace(/\./g, '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';
    assert.ok(bloco.includes('--mapa-largura-painel'), `${seletor} não usa a variável`);
  }
  // O menu do token (a ficha de opções do token) tinha 280 px fixos.
  const menu = todos.match(/\.mapa-menu-token,\s*\.mapa-config \{([^}]*)\}/)![1];
  assert.doesNotMatch(menu, /width:\s*280px/);
  assert.match(menu, /--mapa-largura-painel/);
});

test('no celular o painel cabe na tela', () => {
  const mapa = css('mapa.css');
  assert.match(mapa, /@media \(max-width: 760px\)[\s\S]*?\.mapa-recurso-painel \{[^}]*min\(var\(--mapa-largura-painel\), calc\(100% - 16px\)\)/);
});
