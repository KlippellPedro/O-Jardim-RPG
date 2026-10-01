import assert from 'node:assert/strict';
import test from 'node:test';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { ESCADA_MOLDURAS, GLIFOS, escurecerHex, iniciaisDoNome, molduraDoRetrato } from '../../src/pages/Ficha/utils/retrato';
import { PATAMARES_NIVEL } from '../../src/services/progressaoNiveis';
import { formatarModificador, montarResumoFicha, nomeDeArquivo } from '../../src/pages/Ficha/utils/exportarFicha';

test('moldura do retrato muda a cada 5 niveis', () => {
  assert.equal(molduraDoRetrato(1).chave, 'comum');
  assert.equal(molduraDoRetrato(4).chave, 'comum');
  assert.equal(molduraDoRetrato(5).chave, 'bronze');
  assert.equal(molduraDoRetrato(9).chave, 'bronze');
  assert.equal(molduraDoRetrato(10).chave, 'prata');
  assert.equal(molduraDoRetrato(15).chave, 'ouro');
  assert.equal(molduraDoRetrato(22).chave, 'esmeralda');
  assert.equal(molduraDoRetrato(60).chave, 'lenda');
  assert.equal(molduraDoRetrato(64).chave, 'lenda');
  assert.equal(molduraDoRetrato(65).chave, 'topazio');
  assert.equal(molduraDoRetrato(69).chave, 'topazio');
  assert.equal(molduraDoRetrato(70).chave, 'jade');
  assert.equal(molduraDoRetrato(1).rotulo, null);
  assert.equal(molduraDoRetrato(60).rotulo, 'Lendário');
  assert.equal(molduraDoRetrato(65).rotulo, 'Topázio');
  assert.equal(molduraDoRetrato(Number.NaN).chave, 'comum');
});

test('cada degrau de 5 em 5 niveis, do 1 ao 500, tem uma moldura diferente', () => {
  const niveis = [1, ...Array.from({ length: 100 }, (_, indice) => (indice + 1) * 5)];
  const molduras = niveis.map((nivel) => molduraDoRetrato(nivel));
  assert.equal(molduras.length, 101);
  assert.equal(new Set(molduras.map((moldura) => moldura.chave)).size, 101);
  assert.equal(new Set(molduras.map((moldura) => moldura.fio + moldura.fio2)).size, 101);
  assert.equal(new Set(molduras.map((moldura) => moldura.rotulo)).size, 101);
  assert.deepEqual(molduras.map((moldura) => moldura.degrau), niveis.map((_, indice) => indice));
  assert.equal(ESCADA_MOLDURAS.length, 101);
});

test('os patamares 100, 150, 250 e 500 são marcos com visual próprio', () => {
  assert.deepEqual(
    [59, 60, 64, 99, 100, 104, 149, 150, 249, 250, 499, 500, 1450].map((nivel) => molduraDoRetrato(nivel).chave),
    ['solar', 'lenda', 'lenda', 'alexandrita', 'mitico', 'mitico', 'vanadio', 'cosmico', 'mare', 'eterno', 'insondavel', 'absoluto', 'absoluto'],
  );
  assert.deepEqual(
    [100, 150, 250, 500].map((nivel) => molduraDoRetrato(nivel).rotulo),
    ['Mítico', 'Cósmico', 'Eterno', 'Absoluto'],
  );
  // Cada patamar do arquivo de dados tem degrau próprio na escada.
  PATAMARES_NIVEL.forEach((patamar) => {
    assert.ok(ESCADA_MOLDURAS.some((degrau) => degrau.nivelMinimo === patamar), `patamar ${patamar} sem moldura`);
  });
});

test('as molduras geradas cobrem formas, padroes e movimentos variados', () => {
  const geradas = ESCADA_MOLDURAS.filter((degrau) => degrau.nivelMinimo >= 65);
  assert.equal(new Set(geradas.map((degrau) => degrau.forma)).size, 6);
  assert.equal(new Set(geradas.map((degrau) => degrau.padrao)).size, 4);
  assert.equal(new Set(geradas.map((degrau) => degrau.movimento)).size, 4);
  geradas.forEach((degrau) => {
    assert.match(degrau.fio, /^#[0-9a-f]{6}$/);
    assert.match(degrau.fio2, /^#[0-9a-f]{6}$/);
    assert.match(degrau.chave, /^[a-z0-9-]+$/);
  });
});

test('toda moldura tem cores próprias e as altas têm joia, aro e borda em movimento', () => {
  const cores = ESCADA_MOLDURAS.map((degrau) => degrau.fio + degrau.fio2);
  assert.equal(new Set(cores).size, ESCADA_MOLDURAS.length);
  assert.equal(new Set(ESCADA_MOLDURAS.map((degrau) => degrau.chave)).size, ESCADA_MOLDURAS.length);
  [65, 100, 150, 250, 500].forEach((nivel) => {
    const moldura = molduraDoRetrato(nivel);
    assert.ok(moldura.joias >= 4);
    assert.equal(moldura.aro, true);
    assert.equal(moldura.animada, true);
    assert.ok(moldura.movimento);
  });
});

test('joias, aros e brilho em movimento crescem com o degrau', () => {
  assert.deepEqual([1, 5, 10, 15, 20].map((nivel) => molduraDoRetrato(nivel).joias), [0, 2, 2, 4, 4]);
  assert.deepEqual([15, 20].map((nivel) => molduraDoRetrato(nivel).aro), [false, true]);
  assert.deepEqual([40, 45, 60].map((nivel) => molduraDoRetrato(nivel).animada), [false, true, true]);
  assert.deepEqual([65, 115, 120, 245, 250, 500].map((nivel) => molduraDoRetrato(nivel).joias), [4, 4, 6, 6, 8, 8]);
  assert.deepEqual([60, 175, 180, 325, 330, 500].map((nivel) => molduraDoRetrato(nivel).aroExtra), [0, 0, 1, 1, 2, 2]);
  // Nunca perde joia nem aro ao subir de nível.
  let joias = 0;
  let aros = 0;
  for (let nivel = 1; nivel <= 500; nivel += 5) {
    const moldura = molduraDoRetrato(nivel);
    assert.ok(moldura.joias >= joias && moldura.aroExtra >= aros, `nível ${nivel}`);
    joias = moldura.joias;
    aros = moldura.aroExtra;
  }
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
