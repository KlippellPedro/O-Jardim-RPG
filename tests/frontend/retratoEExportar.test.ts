import assert from 'node:assert/strict';
import test from 'node:test';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { GLIFOS, escurecerHex, iniciaisDoNome, molduraDoRetrato } from '../../src/pages/Ficha/utils/retrato';
import { formatarModificador, montarResumoFicha, nomeDeArquivo } from '../../src/pages/Ficha/utils/exportarFicha';

test('moldura do retrato sobe de patamar nos niveis 10, 15 e 20', () => {
  assert.equal(molduraDoRetrato(1).tier, 'comum');
  assert.equal(molduraDoRetrato(9).tier, 'comum');
  assert.equal(molduraDoRetrato(10).tier, 'prata');
  assert.equal(molduraDoRetrato(15).tier, 'ouro');
  assert.equal(molduraDoRetrato(20).tier, 'lenda');
  assert.equal(molduraDoRetrato(1).rotulo, null);
  assert.equal(molduraDoRetrato(20).rotulo, 'Lendário');
});

test('joias da moldura crescem com o patamar e so a lenda anima', () => {
  assert.deepEqual([1, 10, 15, 20].map((nivel) => molduraDoRetrato(nivel).joias), [0, 2, 4, 4]);
  assert.deepEqual([1, 10, 15, 20].map((nivel) => molduraDoRetrato(nivel).animada), [false, false, false, true]);
});

test('iniciais ignoram particulas e caracteres estranhos', () => {
  assert.equal(iniciaisDoNome('Mira de Aço'), 'MA');
  assert.equal(iniciaisDoNome('  kel  '), 'K');
  assert.equal(iniciaisDoNome('Ana Maria da Silva'), 'AM');
  assert.equal(iniciaisDoNome('***'), '?');
  assert.equal(iniciaisDoNome(''), '?');
  assert.equal(iniciaisDoNome('Éowyn'), 'É');
});

test('todo efeito atmosferico tem um glifo desenhavel', () => {
  ['arcano', 'brasas', 'cosmico', 'natureza', 'nevoa', 'ondas', 'tecnologico', 'holofote'].forEach((efeito) => {
    assert.ok((GLIFOS as Record<string, { d: string }>)[efeito]?.d.startsWith('M'), efeito);
  });
});

test('escurecer aceita hex curto e longo e devolve o resto intacto', () => {
  assert.equal(escurecerHex('#ffffff', 0.5), '#808080');
  assert.equal(escurecerHex('#fff', 0.5), '#808080');
  assert.equal(escurecerHex('rgb(1,2,3)', 0.5), 'rgb(1,2,3)');
});

const classe = CLASSES_CATALOGO.find((item) => item.progressao?.length)!;

const personagem = (extra: Record<string, unknown> = {}) => ({
  nome: 'Mira',
  nivel: 12,
  foto: null,
  ficha: {
    racaId: 'humano',
    classes: [{ classeId: classe.id, nivel: 12 }],
    nivel: 12,
    xp: 1234,
    fama: 4,
    titulo: 'A Ferreira',
    atributosFinais: { forca: 16, destreza: 12, constituicao: 14, inteligencia: 8, sabedoria: 10, carisma: 10, fluxo: 10 },
    derivados: { vida: 80, mana: 30, movimento: 9, defesaNatural: 14, iniciativa: 12 },
    status: { vidaAtual: 55, manaAtual: 10, sanidadeAtual: 90 },
    aliados: [{ nome: 'Kel' }],
    ...extra,
  },
  inventarioCentral: [
    { item_id: 'a', titulo: 'Corda', quantidade: 2, dados: {} },
    { item_id: 'b', titulo: 'Espada', quantidade: 1, dados: { equipado: true } },
  ],
  carteira: [{ moeda: 'Lunaris', saldo: 1500 }, { moeda: 'Vazia', saldo: 0 }],
});

test('resumo junta identidade, atributos, recursos e patente', () => {
  const resumo = montarResumoFicha(personagem(), new Date(2026, 8, 21));
  assert.equal(resumo.nome, 'Mira');
  assert.equal(resumo.nivel, 12);
  assert.equal(resumo.tier, 'prata');
  assert.equal(resumo.fama, 4);
  assert.equal(resumo.titulo, 'A Ferreira');
  assert.match(resumo.classes, /12$/);
  assert.equal(resumo.atributos.length, 7);
  const forca = resumo.atributos.find((atributo) => atributo.chave === 'forca')!;
  assert.deepEqual([forca.valor, forca.mod], [16, 3]);
  assert.deepEqual(resumo.recursos.vida, { atual: 55, maximo: 80 });
  assert.equal(resumo.recursos.sanidade, 90);
  assert.equal(resumo.recursos.defesa, 14);
  assert.equal(resumo.geradoEm, '21/09/2026');
});

test('inventario poe equipados primeiro e carteira ignora saldo zero', () => {
  const resumo = montarResumoFicha(personagem());
  assert.deepEqual(resumo.inventario.map((item) => [item.titulo, item.equipado]), [['Espada', true], ['Corda', false]]);
  assert.deepEqual(resumo.carteira, [{ moeda: 'Lunaris', saldo: 1500 }]);
  assert.deepEqual(resumo.aliados, ['Kel']);
});

test('ficha vazia ou incompleta nao quebra o resumo', () => {
  const resumo = montarResumoFicha({ nome: '', ficha: {} });
  assert.equal(resumo.nome, 'Desconhecido');
  assert.equal(resumo.nivel, 1);
  assert.equal(resumo.classes, 'Sem classe');
  assert.equal(resumo.atributos.length, 7);
  assert.deepEqual(resumo.inventario, []);
  assert.equal(resumo.recursos.vida.atual, null);
  assert.equal(resumo.foto, null);
});

test('foto so entra como texto nao vazio', () => {
  assert.equal(montarResumoFicha(personagem({ foto: '' })).foto, null);
  assert.equal(montarResumoFicha({ ...personagem(), foto: 'data:image/webp;base64,AAAA' }).foto, 'data:image/webp;base64,AAAA');
});

test('nome de arquivo sai sem acento nem caractere especial', () => {
  assert.equal(nomeDeArquivo('Mira de Aço!', 'cartao', 'png'), 'cartao-mira-de-aco.png');
  assert.equal(nomeDeArquivo('', 'ficha', 'pdf'), 'ficha-personagem.pdf');
  assert.equal(formatarModificador(3), '+3');
  assert.equal(formatarModificador(-2), '-2');
  assert.equal(formatarModificador(0), '0');
});
