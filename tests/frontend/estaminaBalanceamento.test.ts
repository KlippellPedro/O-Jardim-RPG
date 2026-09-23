import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularDerivadosComClasses } from '../../src/services/calculoService';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';

const atributos = { forca: 12, destreza: 14, constituicao: 14, inteligencia: 13, sabedoria: 10, carisma: 8, fluxo: 14 };
const comuns = CLASSES_CATALOGO.filter((classe) => classe.categoria === 'padrao');
const media = (valores: number[]) => (valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0);

function usosEfetivos(classe: (typeof comuns)[number], nivel: number): number {
  const derivados = calcularDerivadosComClasses(atributos as any, null, [{ classeId: classe.id, nivel }], [classe], nivel);
  const custosMana = (classe.poderes || []).filter((p) => !p.custo_estamina && p.custo_mana > 0).map((p) => p.custo_mana);
  const custosEstamina = (classe.poderes || []).filter((p) => (p.custo_estamina || 0) > 0).map((p) => p.custo_estamina as number);
  const total = custosMana.length + custosEstamina.length;
  const limites: number[] = [];
  if (custosMana.length) limites.push(derivados.mana / ((custosMana.length / total) * media(custosMana)));
  if (custosEstamina.length) limites.push((derivados.estamina as number) / ((custosEstamina.length / total) * media(custosEstamina)));
  return Math.min(...limites);
}

test('toda classe comum migrada fecha 9 de Vida + Mana + Estamina e nenhum recurso zerado', () => {
  for (const classe of comuns) {
    assert.ok(classe.estamina !== undefined, `${classe.titulo}: Estamina não declarada`);
    assert.equal(classe.vida + classe.mana + (classe.estamina as number), 9, `${classe.titulo}: orçamento fora de 9`);
    assert.ok(classe.mana >= 1 && (classe.estamina as number) >= 1, `${classe.titulo}: Mana e Estamina precisam ser no mínimo 1`);
  }
});

test('poder nunca cobra Mana e Estamina ao mesmo tempo', () => {
  for (const classe of comuns) {
    for (const poder of classe.poderes || []) {
      assert.ok(!(poder.custo_mana > 0 && (poder.custo_estamina || 0) > 0), `${classe.titulo}/${poder.titulo}: cobra Mana e Estamina`);
    }
  }
});

test('o poder mais caro de cada recurso cabe no pool da classe no nível 10', () => {
  for (const classe of comuns) {
    const derivados = calcularDerivadosComClasses(atributos as any, null, [{ classeId: classe.id, nivel: 10 }], [classe], 10);
    const maxMana = Math.max(0, ...(classe.poderes || []).map((p) => p.custo_mana || 0));
    const maxEstamina = Math.max(0, ...(classe.poderes || []).map((p) => p.custo_estamina || 0));
    assert.ok(derivados.mana >= maxMana, `${classe.titulo}: Mana ${derivados.mana} não paga o poder de ${maxMana}`);
    assert.ok((derivados.estamina as number) >= maxEstamina, `${classe.titulo}: Estamina ${derivados.estamina} não paga o poder de ${maxEstamina}`);
  }
});

test('nenhuma classe comum fica isolada: a maior e a menor capacidade de poderes ficam a menos de 3x', () => {
  for (const nivel of [5, 10, 20]) {
    const usos = comuns.map((classe) => ({ id: classe.id, valor: usosEfetivos(classe, nivel) }));
    const maior = usos.reduce((a, b) => (b.valor > a.valor ? b : a));
    const menor = usos.reduce((a, b) => (b.valor < a.valor ? b : a));
    assert.ok(
      maior.valor / menor.valor < 3,
      `Nível ${nivel}: ${maior.id} (${maior.valor.toFixed(1)}) contra ${menor.id} (${menor.valor.toFixed(1)}) passou de 3x`,
    );
  }
});
