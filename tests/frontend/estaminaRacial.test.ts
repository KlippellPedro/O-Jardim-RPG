import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcularDerivados } from '../../src/services/calculoService';
import type { IRaca } from '../../src/types/catalogo';

const racas = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
) as IRaca[];
const porId = (id: string) => racas.find((item) => item.id === id) as IRaca;

// Força e Destreza altas de propósito: com modificador zero a Estamina bate no
// piso de 1 e esconderia o bônus racial que o teste quer medir.
const ATRIBUTOS = {
  forca: 16, destreza: 16, constituicao: 16,
  inteligencia: 10, sabedoria: 16, carisma: 10, fluxo: 10,
};
// Mede só o bônus de Estamina do pacote racial: a mesma raça, com os mesmos
// ajustes de atributo (o chassi do Autômato, por exemplo, mexe em Força), menos
// os campos `estamina` do JSON.
const semEstamina = (valor: any): any => {
  if (Array.isArray(valor)) return valor.map(semEstamina);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).filter(([chave]) => chave !== 'estamina').map(([chave, item]) => [chave, semEstamina(item)]));
  }
  return valor;
};
const comRaca = (id: string, nivel = 1, escolha: Record<string, string> = {}) => (
  calcularDerivados(ATRIBUTOS, porId(id), nivel, escolha).estamina
  - calcularDerivados(ATRIBUTOS, semEstamina(porId(id)), nivel, escolha).estamina
);

test('raça de corpo soma a Estamina do pacote racial sobre a fórmula de atributo', () => {
  assert.equal(comRaca('humano'), 0);
  assert.equal(comRaca('anao'), 3);
  assert.equal(comRaca('goblim'), 2);
  assert.equal(comRaca('gigante'), 3);
  assert.equal(comRaca('golem'), 3);
  assert.equal(comRaca('desperto'), 2);
  assert.equal(comRaca('amalgamo'), 3);
});

test('raça de Mana, de sonho ou sem corpo não ganha Estamina', () => {
  for (const id of ['humano', 'elfo', 'feerico', 'espirito', 'sereia', 'bruxa', 'onirico', 'auleth', 'entidade', 'raca-personalizada']) {
    assert.equal(comRaca(id, 60), 0, `${id} não deveria ganhar Estamina`);
  }
});

test('os estágios raciais somam Estamina no nível certo, sem perder o degrau anterior', () => {
  // Golem: base 3, Remendado (nível 12) +3, Monumento (nível 36) +8.
  assert.equal(comRaca('golem', 11), 3);
  assert.equal(comRaca('golem', 12), 6);
  assert.equal(comRaca('golem', 36), 14);
  // Gigante: mesma escada de corpo.
  assert.equal(comRaca('gigante', 14), 6);
  assert.equal(comRaca('gigante', 36), 14);
  // Vampiro: base 1, Sangue Velho (17) +3, Senhor da Noite (42) +4.
  assert.equal(comRaca('vampiro', 16), 1);
  assert.equal(comRaca('vampiro', 17), 4);
  assert.equal(comRaca('vampiro', 42), 8);
});

test('a variante escolhida soma a própria Estamina (Animália e Simbionte)', () => {
  assert.equal(comRaca('animalia', 1, { varianteId: 'agil' }), 2);
  assert.equal(comRaca('animalia', 1, { varianteId: 'robusta' }), 3);
  assert.equal(comRaca('animalia', 1, { varianteId: 'mistica' }), 0);
  assert.equal(comRaca('simbionte', 1, { varianteId: 'colonia' }), 1);
  assert.equal(comRaca('simbionte', 1, { varianteId: 'assimilador' }), 0);
});

test('o chassi do Autômato soma Estamina pelo tamanho, do pequeno ao enorme', () => {
  const chassi = (id: string) => comRaca('automato', 1, { varianteId: id });
  assert.deepEqual(
    ['bipede-pequeno', 'bipede-normal', 'bipede-grande', 'bipede-enorme'].map(chassi),
    [2, 3, 4, 5],
  );
  assert.equal(chassi('quadrupede-grande'), 4);
});

test('Deus soma a Estamina da natureza divina à base do Divino', () => {
  assert.equal(comRaca('divino', 1, { naturezaDivinaId: 'semideus' }), 1);
  assert.equal(comRaca('divino', 1, { naturezaDivinaId: 'deus' }), 5);
  assert.equal(comRaca('divino', 18, { naturezaDivinaId: 'deus' }), 6);
});

test('nenhum bônus racial de Estamina é negativo e o total nunca passa do que a Vida racial dá', () => {
  const grava = (nome: string, item: any) => {
    const estamina = Number(item.estamina) || 0;
    assert.ok(estamina >= 0, `${nome}: Estamina negativa`);
    if (estamina > 0) assert.ok(estamina <= Math.max(Number(item.vida) || 0, 3) + 5, `${nome}: Estamina maior que o corpo justifica`);
  };
  for (const raca of racas) {
    grava(raca.id, raca);
    for (const lista of ['variantes', 'estagios', 'naturezas_divinas'] as const) {
      for (const item of (raca as any)[lista] || []) grava(`${raca.id}/${item.id}`, item);
    }
  }
});

test('a Estamina racial não empurra o máximo abaixo de 1 com atributos baixos', () => {
  const fraco = { ...ATRIBUTOS, forca: 4, destreza: 4 };
  assert.equal(calcularDerivados(fraco, porId('humano'), 1, {}).estamina, 1);
  assert.ok(calcularDerivados(fraco, porId('anao'), 1, {}).estamina >= 1);
});
