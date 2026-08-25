import assert from 'node:assert/strict';
import test from 'node:test';

import {
  atributoValido,
  definirAtributoPericia,
  ehPericiaCustomizada,
  obterAtributoPericia,
  obterAtributosPersonalizados,
  obterPericiasCustomizadas,
  periciasDisponiveisParaEfeitos,
  removerPericiaCustomizada,
  renomearPericiaCustomizada,
} from '../../src/services/periciasFichaService.ts';

const fichaBase = () => ({
  pericias: { alquimista: 'aprendiz', custom_1: 'treinado' },
  periciasFavoritas: ['alquimista', 'custom_1'],
  rolagensPericias: { custom_1: { vantagens: 1, desvantagens: 0 } },
  periciasAtributos: { alquimista: 'fluxo' },
  ajustesFicha: { 'pericia.custom_1': [{ id: 'a', nome: 'Tutor', valor: 2 }], 'atributo.forca': [] },
  periciasCustomizadas: [
    { id: 'custom_1', titulo: 'Forja', atributo: 'forca', descricao: 'Perícia/Ofício customizado.' },
  ],
});

test('perícia padrão aceita troca de atributo e volta ao padrão sem deixar lixo', () => {
  const ficha = fichaBase();
  assert.equal(obterAtributoPericia(ficha, 'alquimista', 'inteligencia'), 'fluxo');
  assert.equal(obterAtributoPericia(ficha, 'atletismo', 'forca'), 'forca');

  const trocado = definirAtributoPericia(ficha, 'atletismo', 'destreza', 'forca');
  assert.equal(trocado.atletismo, 'destreza');

  const devolvido = definirAtributoPericia({ ...ficha, periciasAtributos: trocado }, 'atletismo', 'forca', 'forca');
  assert.equal('atletismo' in devolvido, false);
  assert.equal(devolvido.alquimista, 'fluxo');
});

test('atributo inválido não entra na ficha', () => {
  const ficha = fichaBase();
  assert.equal(atributoValido('sorte'), false);
  assert.deepEqual(definirAtributoPericia(ficha, 'atletismo', 'sorte', 'forca'), { alquimista: 'fluxo' });
  assert.deepEqual(obterAtributosPersonalizados({ periciasAtributos: { x: 'sorte', y: 'carisma' } }), { y: 'carisma' });
  assert.deepEqual(obterAtributosPersonalizados({ periciasAtributos: null }), {});
});

test('ofício criado à mão pode ser renomeado e ter o atributo trocado', () => {
  const ficha = fichaBase();
  assert.equal(ehPericiaCustomizada(ficha, 'custom_1'), true);
  assert.equal(ehPericiaCustomizada(ficha, 'alquimista'), false);

  const renomeado = renomearPericiaCustomizada(ficha, 'custom_1', { titulo: '  Ferraria  ', atributo: 'destreza' });
  assert.deepEqual(renomeado.map((pericia) => [pericia.id, pericia.titulo, pericia.atributo]), [
    ['custom_1', 'Ferraria', 'destreza'],
  ]);

  const semNome = renomearPericiaCustomizada(ficha, 'custom_1', { titulo: '   ', atributo: 'carisma' });
  assert.equal(semNome[0].titulo, 'Forja');
  assert.equal(semNome[0].atributo, 'carisma');
});

test('excluir um ofício limpa grau, favorito, rolagem, atributo e ajustes manuais', () => {
  const ficha = fichaBase();
  const limpeza = removerPericiaCustomizada(ficha, 'custom_1');

  assert.deepEqual(limpeza.periciasCustomizadas, []);
  assert.deepEqual(limpeza.pericias, { alquimista: 'aprendiz' });
  assert.deepEqual(limpeza.periciasFavoritas, ['alquimista']);
  assert.deepEqual(limpeza.rolagensPericias, {});
  assert.deepEqual(limpeza.periciasAtributos, { alquimista: 'fluxo' });
  assert.deepEqual(Object.keys(limpeza.ajustesFicha), ['atributo.forca']);

  // A ficha original segue intacta: quem chama decide o que gravar.
  assert.equal(ficha.periciasCustomizadas.length, 1);
  assert.equal(ficha.pericias.custom_1, 'treinado');
});

test('ofícios quebrados no armazenamento não chegam na tela', () => {
  const pericias = obterPericiasCustomizadas({
    periciasCustomizadas: [
      { id: 'ok', titulo: 'Navegação', atributo: 'sabedoria' },
      { id: '  ', titulo: 'Sem id', atributo: 'forca' },
      { id: 'sem-titulo', titulo: '', atributo: 'forca' },
      { id: 'atributo-torto', titulo: 'Etiqueta', atributo: 'elegancia' },
      null,
    ],
  });

  assert.deepEqual(pericias.map((pericia) => [pericia.id, pericia.atributo]), [
    ['ok', 'sabedoria'],
    ['atributo-torto', 'forca'],
  ]);
});

test('efeitos de itens, poderes e habilidades podem escolher Ofícios da classe e da ficha', () => {
  const pericias = periciasDisponiveisParaEfeitos({
    classeId: 'engenheiro',
    nivel: 1,
    periciasCustomizadas: [
      { id: 'custom_navegacao', titulo: 'Ofício (Navegação)', atributo: 'sabedoria' },
    ],
  }, [
    { id: 'luta', titulo: 'Luta' },
  ]);

  assert.deepEqual(pericias.map((pericia) => pericia.id), [
    'luta',
    'oficio-engenharia',
    'custom_navegacao',
  ]);
});
