import assert from 'node:assert/strict';
import test from 'node:test';
import legadosNovosData from '../../data/ficha/legados-novos.json';
import legadosRegrasData from '../../data/ficha/legados-regras-v1.json';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO } from '../../src/services/catalogoService';
import { aplicarDescansoCompleto, aplicarRelaxamento, combateFoiIntenso, descansoPermitido } from '../../src/services/descansoService';
import { aplicarResistencia, capacidadeCarga, resumirEquipamentos } from '../../src/services/equipamentoService';
import { avaliarLegado, habilidadesAutomaticas, podeSelecionarPoder, vagasLegado, vagasPoderDaClasse } from '../../src/services/progressaoFichaService';

const fichaBase = {
  racaId: 'humano',
  nivel: 10,
  classes: [{ classeId: 'guerreiro', nivel: 10 }],
  atributosFinais: { forca: 15, destreza: 14, constituicao: 13, inteligencia: 12, sabedoria: 10, carisma: 8, fluxo: 8 },
  pericias: { luta: 'mestre' },
};

test('progressão calcula habilidades, vagas de poder e Legados pelos marcos', () => {
  const guerreiro = CLASSES_CATALOGO.find((item) => item.id === 'guerreiro');
  assert.ok(guerreiro);
  assert.equal(vagasPoderDaClasse(guerreiro, 1), 0);
  assert.equal(vagasPoderDaClasse(guerreiro, 6), 2);
  assert.equal(vagasPoderDaClasse(guerreiro, 20), 8);
  assert.ok(habilidadesAutomaticas(fichaBase).some((item) => item.titulo === 'Implacável' && item.nivel === 10));
  assert.equal(vagasLegado(fichaBase), 3);
});

test('Legado respeita atributo, nível e limite de vagas', () => {
  const esquiva = LEGADOS_CATALOGO.find((item: any) => item.id === 'esquiva');
  assert.ok(esquiva);
  assert.equal(avaliarLegado(esquiva as any, fichaBase, []).permitido, true);
  const semDestreza = { ...fichaBase, atributosFinais: { ...fichaBase.atributosFinais, destreza: 13 } };
  assert.equal(avaliarLegado(esquiva as any, semDestreza, []).permitido, false);
  assert.equal(avaliarLegado(esquiva as any, fichaBase, ['to-ficando-bom', 'ainda-nao', 'rapidinho']).permitido, false);
});

test('catálogo atual incorpora as regras de Legados revisadas no frontend antigo', () => {
  const regrasMigradas = Object.keys(legadosRegrasData.regras);
  assert.equal(regrasMigradas.length, 36);
  assert.ok(regrasMigradas.every((id) => LEGADOS_CATALOGO.find((item: any) => item.id === id)?.versaoRegras === '1.0'));

  const esquiva = LEGADOS_CATALOGO.find((item: any) => item.id === 'esquiva');
  const magico = LEGADOS_CATALOGO.find((item: any) => item.id === 'magico-exclamacao');
  assert.match(esquiva?.descricao || '', /\+1 na Defesa e \+1 em Reflexos/);
  assert.deepEqual(magico?.pre_requisitos, [{ nivel_personagem: 7 }]);
});

test('Legados novos não são marcados como revisados: nunca passaram pela mesma revisão balanceada dos 36 originais', () => {
  const idsNovos = (legadosNovosData as any).novos.map((legado: any) => legado.id);
  assert.ok(idsNovos.length > 0);
  for (const id of idsNovos) {
    assert.equal(
      LEGADOS_CATALOGO.find((item: any) => item.id === id)?.versaoRegras,
      'fonte',
      `${id} não deveria aparecer como revisado (versaoRegras '1.0') sem ter passado pela revisão`,
    );
  }
});

test('poder dependente exige o poder anterior', () => {
  const espadachim = CLASSES_CATALOGO.find((item) => item.id === 'espadachim');
  const golpeW = espadachim?.poderes?.find((item) => item.id === 'golpe-em-w');
  assert.ok(espadachim && golpeW);
  assert.equal(podeSelecionarPoder(golpeW, espadachim, 20, [], fichaBase).permitido, false);
  assert.equal(podeSelecionarPoder(golpeW, espadachim, 20, [{ classeId: 'espadachim', poderId: 'golpe-em-z' }], fichaBase).permitido, true);
});

test('descanso recupera percentuais, Sanidade, Cansaço e trata Ferido uma vez', () => {
  assert.equal(descansoPermitido('excelente', false), false);
  assert.equal(descansoPermitido('excelente', true), true);
  assert.equal(descansoPermitido('boa', false), true);
  const resultado = aplicarDescansoCompleto(
    { vidaAtual: 10, manaAtual: 0, sanidadeAtual: 40, cansacoAtual: 5, ferido: 2 },
    { vida: 100, mana: 40, sanidade: 100 },
    'boa',
    true,
  );
  assert.deepEqual(
    { vida: resultado.vidaAtual, mana: resultado.manaAtual, sanidade: resultado.sanidadeAtual, cansaco: resultado.cansacoAtual, ferido: resultado.ferido },
    { vida: 60, mana: 20, sanidade: 50, cansaco: 2, ferido: 1 },
  );
  const relaxado = aplicarRelaxamento({ manaAtual: 2 }, 20, 14, 8, 4);
  assert.equal(relaxado.recuperado, 8);
  assert.equal(relaxado.status.relaxouDesdeDescanso, true);
  assert.equal(combateFoiIntenso({ gastouMetadeMana: true }), true);
});

test('equipamento aplica carga, combinações e Resistência sem dano negativo', () => {
  assert.equal(capacidadeCarga(14, 10), 19);
  const inventario = [
    { quantidade: 1, titulo: 'Aço', dados: { categoria: 'armadura', equipado: true, bonus: '+7', penalidade: '-4', espacos: 4 } },
    { quantidade: 1, titulo: 'Escudo de Espelhos', dados: { categoria: 'armadura', subtipo: 'escudo', equipado: true, bonus: '+6', penalidade: '-4', espacos: 2 } },
  ];
  const resumo = resumirEquipamentos(inventario, { nivel: 10, atributosFinais: { forca: 14 } });
  assert.equal(resumo.defesaEquipamento, 13);
  assert.equal(resumo.penalidadeArmadura, 8);
  assert.equal(resumo.sobrecarregado, false);
  assert.equal(aplicarResistencia(7, 10), 0);
});
