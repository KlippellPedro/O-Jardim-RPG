import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NOTA_MAXIMA, resumoDaNota, temNota } from '../../src/pages/Mapa/motor/notasDoMestre';

const ler = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf-8');

test('nota do Mestre: o teto do site é o mesmo do servidor', () => {
  const servidor = ler('plataforma/core/mapa.py').match(/^NOTA_MAXIMA = (\d+)/m);
  assert.ok(servidor, 'NOTA_MAXIMA não achada em plataforma/core/mapa.py');
  assert.equal(NOTA_MAXIMA, Number(servidor![1]));
  // E a coluna do banco usa o mesmo número (as duas, a do token e a da cena).
  const esquema = ler('plataforma/core/schema.py');
  assert.equal([...esquema.matchAll(new RegExp(`nota_mestre TEXT NOT NULL DEFAULT '' CHECK \\(length\\(nota_mestre\\) <= ${NOTA_MAXIMA}\\)`, 'g'))].length, 2);
});

test('nota do Mestre: só espaço e quebra de linha não conta como nota', () => {
  assert.equal(temNota('Tem a chave'), true);
  for (const vazio of ['', '   ', '\n \n', null, undefined]) assert.equal(temNota(vazio), false);
});

test('nota do Mestre: a dica mostra o começo numa linha só', () => {
  assert.equal(resumoDaNota('  Fraco ao fogo.\n\nGuarda a chave  '), 'Fraco ao fogo. Guarda a chave');
  assert.equal(resumoDaNota(undefined), '');
  const longa = resumoDaNota('palavra '.repeat(40), 30);
  assert.ok(longa.length <= 30 && longa.endsWith('…'), longa);
  assert.equal(resumoDaNota('curta', 30), 'curta');
});

test('nota do Mestre: as telas só montam a nota onde o Mestre comanda', () => {
  // O servidor já não manda o texto a jogador; estas conferências travam também a tela.
  const menu = ler('src/pages/Mapa/componentes/MenuToken.tsx');
  const bloco = menu.slice(menu.indexOf('{gestor && ('), menu.indexOf("abaAtual === 'barras'"));
  assert.ok(bloco.includes('<NotaDoMestre'), 'a nota do token precisa ficar dentro do bloco do Mestre');
  assert.equal((menu.match(/<NotaDoMestre/g) ?? []).length, 1);
  assert.match(ler('src/pages/Mapa/componentes/BarraToken.tsx'), /gestor && onNota && temNota\(token\.nota_mestre\)/);
  // Cena e mapa colocado: as duas telas são do Mestre (ConfigCena abre só para ele; a barra do mapa idem).
  const pagina = ler('src/pages/Mapa/MapaPage.tsx');
  assert.match(pagina, /configAberta && cena && gestor && \(\s*<ConfigCena/);
  assert.match(pagina, /\{gestor && cena && ferramenta === 'mover' && mapaEscolhido && \(\s*<BarraAncorada[^>]*>\s*<BarraMapaColocado/);
});
