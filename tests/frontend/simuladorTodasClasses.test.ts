import assert from 'node:assert/strict';
import test from 'node:test';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../src/services/catalogoService';
import { cenarioInicial, simularCenario } from '../../src/pages/Ficha/utils/simuladorNivel';

const ATRIBUTOS = { forca: 12, destreza: 12, constituicao: 12, inteligencia: 12, sabedoria: 12, carisma: 12, fluxo: 12 };

// O simulador roda a cada abertura da aba Progressão, mesmo fechado. Se ele
// lançar erro para qualquer classe ou raça real, a aba inteira fica em branco.
test('simular nunca lanca erro, para toda classe e toda raca do catalogo', () => {
  const falhas: string[] = [];
  for (const classe of CLASSES_CATALOGO) {
    for (const raca of RACAS_CATALOGO) {
      for (const nivel of [1, 7, 20]) {
        const ficha = { racaId: raca.id, classes: [{ classeId: classe.id, nivel }], nivel, xp: 0, atributosFinais: ATRIBUTOS };
        try {
          simularCenario(ficha, cenarioInicial(ficha));
          simularCenario(ficha, { niveis: { [classe.id]: 20 }, atributos: { fluxo: 3 } });
        } catch (erro) {
          falhas.push(`${classe.id}/${raca.id}/nv${nivel}: ${(erro as Error).message}`);
          if (falhas.length >= 5) break;
        }
      }
    }
  }
  assert.deepEqual(falhas, []);
});

test('simular tolera ficha sem atributos, sem classe e com classe desconhecida', () => {
  const casos = [
    {},
    { racaId: 'humano' },
    { racaId: 'inexistente', classes: [{ classeId: 'nao-existe', nivel: 4 }] },
    { classes: [{ classeId: CLASSES_CATALOGO[0].id, nivel: 3 }] },
    { classes: [] , atributosFinais: ATRIBUTOS },
  ];
  for (const ficha of casos) {
    assert.doesNotThrow(() => simularCenario(ficha, cenarioInicial(ficha)), JSON.stringify(ficha));
  }
});
