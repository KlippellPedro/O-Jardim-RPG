import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  criarTemaVisualFicha,
  obterEfeitoAtmosfericoFicha,
  obterFundoFicha,
} from '../../src/pages/Ficha/fichaTheme';
import type { IClasse, IRaca } from '../../src/types/catalogo';

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const racas = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
) as IRaca[];

test('toda raça e classe recebe cor e efeito atmosférico na ficha', () => {
  for (const classe of classes) {
    const tema = criarTemaVisualFicha(null, classe.id);
    assert.match(tema.accent, /^#[0-9a-f]{6}$/i, `cor da classe ${classe.id}`);
    assert.ok(obterEfeitoAtmosfericoFicha(classe.id), `efeito da classe ${classe.id}`);
  }

  for (const raca of racas) {
    const tema = criarTemaVisualFicha(raca.id, null);
    assert.match(tema.accent, /^#[0-9a-f]{6}$/i, `cor da raça ${raca.id}`);
    assert.ok(obterEfeitoAtmosfericoFicha(raca.id), `efeito da raça ${raca.id}`);
  }
});

test('todo fundo declarado pela ficha aponta para um asset existente', () => {
  for (const [tipo, registros] of [['classe', classes], ['raca', racas]] as const) {
    for (const registro of registros) {
      const fundo = obterFundoFicha(tipo, registro.id);
      if (!fundo) continue;
      const arquivo = new URL(`../../public${fundo}`, import.meta.url);
      assert.equal(existsSync(arquivo), true, `${tipo} ${registro.id}: ${fundo}`);
    }
  }
});

test('classe define o destaque e raça define a segunda cor do tema combinado', () => {
  const guerreiro = criarTemaVisualFicha('vampiro', 'guerreiro');
  const somenteVampiro = criarTemaVisualFicha('vampiro', null);

  assert.equal(guerreiro.accent, '#ef4444');
  assert.equal(guerreiro.secondary, '#be123c');
  assert.equal(somenteVampiro.accent, '#be123c');
  assert.equal(guerreiro.classe.fundo, '/assets/img/guerreiro_bg.webp');
  assert.equal(guerreiro.raca.fundo, '/assets/img/vampiro_bg.webp');
});

