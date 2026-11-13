import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ATALHOS_DO_MAPA, atalhosVisiveis, letrasDeFerramenta } from '../../src/pages/Mapa/componentes/atalhosDoMapa';

const PAGINA = readFileSync(new URL('../../src/pages/Mapa/MapaPage.tsx', import.meta.url), 'utf8');

test('o jogador não vê atalho do Mestre e grupo vazio some', () => {
  const todos = atalhosVisiveis(true).flatMap((g) => g.itens).length;
  const doJogador = atalhosVisiveis(false);
  const itens = doJogador.flatMap((g) => g.itens);
  assert.ok(itens.length < todos);
  assert.ok(itens.every((item) => !item.soMestre));
  assert.ok(doJogador.every((g) => g.itens.length > 0));
  // N (névoa) é do Mestre; V (mover) é de todos.
  assert.ok(!itens.some((i) => i.teclas[0] === 'N'));
  assert.ok(itens.some((i) => i.teclas[0] === 'V'));
});

test('toda tecla de ferramenta da folha existe no tratador de teclado da página', () => {
  const letras = letrasDeFerramenta();
  assert.deepEqual([...letras].sort(), ['D', 'H', 'M', 'N', 'O', 'P', 'R', 'T', 'V']);
  for (const letra of letras) {
    assert.match(PAGINA, new RegExp(`evento\.key === '${letra.toLowerCase()}'`), `falta a tecla ${letra} na página`);
  }
  assert.match(PAGINA, /evento\.key === '\?'/);
});

test('cada botão de ferramenta da barra anuncia o atalho que a folha lista', () => {
  for (const [letra, ferramenta] of [['V', 'Mover tokens e o mapa'], ['R', 'Régua'], ['P', 'Ping'], ['M', 'Efeito de magia'], ['D', 'Rolar dados'], ['T', 'Escrever no mapa'], ['N', 'Névoa de guerra'], ['O', 'Portais']]) {
    const linha = PAGINA.split('\n').find((l) => l.includes(`rotulo="${ferramenta}`) || l.includes(`rotulo="${ferramenta} `));
    assert.ok(linha, `botão ${ferramenta} não achado`);
    assert.ok(linha.includes(`atalho="${letra}"`), `${ferramenta} deveria anunciar ${letra}`);
  }
});

test('a folha não repete a mesma combinação para coisas diferentes na mesma seção', () => {
  for (const grupo of ATALHOS_DO_MAPA) {
    const combos = grupo.itens.map((i) => `${i.teclas.join('+')}|${i.descricao}`);
    assert.equal(new Set(combos).size, combos.length, grupo.titulo);
  }
});
