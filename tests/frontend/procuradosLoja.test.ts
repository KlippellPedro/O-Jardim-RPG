import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  AMEACAS_PROCURADO,
  chaveDoRetrato,
  dadosAmeaca,
  dividirRecompensa,
  rotuloCondicao,
  separarQuadro,
  type IProcurado,
} from '../../src/services/procuradosApi';
import { categoriaDoInventario, corDaRaridade } from '../../src/services/lojaCatalogService';
import { LOJA_TOUR_STEPS } from '../../src/pages/Loja/lojaTourConfig';

function cartaz(parcial: Partial<IProcurado>): IProcurado {
  return {
    id: 'x', nome: 'X', especie: '', descricao: '', local: '', condicao: 'vivo-ou-morto', ameaca: 'desconhecida', vd: null,
    recompensa_valor: 0, recompensa_moeda: 'Lunaris', imagem: null, imagem_foco: 35, status: 'aberto', publicado: true,
    publicado_em: null, atualizado_em: null, cacadores: [], pagamento: null, ...parcial,
  };
}

test('a prévia da divisão bate com a do servidor (partes iguais, sobra para os primeiros)', () => {
  assert.deepEqual(dividirRecompensa(1001, 2), [501, 500]);
  assert.deepEqual(dividirRecompensa(10, 3), [4, 3, 3]);
  assert.equal(dividirRecompensa(12345, 7).reduce((a, b) => a + b, 0), 12345);
  assert.deepEqual(dividirRecompensa(50, 0), []);
  assert.deepEqual(dividirRecompensa(-5, 2), [0, 0]);
});

test('o pedaço do retrato é o mesmo que o servidor escolhe (core/acervo.py)', () => {
  assert.equal(chaveDoRetrato(800, 1000), 'n0/0/0');
  assert.equal(chaveDoRetrato(1024, 1024), 'n0/0/0');
  assert.equal(chaveDoRetrato(2000, 1500), 'mini', 'entre 1024 e 2048 não existe a versão reduzida');
  assert.equal(chaveDoRetrato(3000, 2000), 'n2/0/0');
  assert.equal(chaveDoRetrato(9000, 2000), 'mini');
});

test('o quadro separa abertos, encerrados e rascunhos', () => {
  const quadro = separarQuadro([
    cartaz({ id: 'a' }),
    cartaz({ id: 'b', status: 'capturado' }),
    cartaz({ id: 'c', publicado: false }),
    cartaz({ id: 'd', status: 'cancelado', publicado: false }),
  ]);
  assert.deepEqual(quadro.abertos.map((c) => c.id), ['a']);
  assert.deepEqual(quadro.encerrados.map((c) => c.id), ['b']);
  assert.deepEqual(quadro.rascunhos.map((c) => c.id), ['c', 'd'], 'rascunho fica fora do quadro mesmo encerrado');
});

test('rótulos de ameaça e condição têm resposta para tudo', () => {
  assert.equal(rotuloCondicao('vivo'), 'Vivo');
  assert.equal(dadosAmeaca('extrema').rotulo, 'Extrema');
  assert.equal(new Set(AMEACAS_PROCURADO.map((a) => a.id)).size, AMEACAS_PROCURADO.length);
  assert.equal(dadosAmeaca('qualquer' as never).id, 'desconhecida');
});

test('item do inventário volta para a prateleira certa da Loja', () => {
  assert.equal(categoriaDoInventario('arma', {}), 'Armas');
  assert.equal(categoriaDoInventario('armadura', { categoria_protecao: 'escudo' }), 'Escudos');
  assert.equal(categoriaDoInventario('drop', {}), 'Componentes');
  assert.equal(categoriaDoInventario(null, {}), 'Outros');
  assert.equal(corDaRaridade('lendario'), corDaRaridade('Lendário'));
});

test('cada passo do guia da Loja aponta para algo que existe na tela', () => {
  const pasta = new URL('../../src/pages/Loja/', import.meta.url);
  const fontes = [
    readFileSync(new URL('LojaPage.tsx', pasta), 'utf8'),
    ...readdirSync(new URL('components/', pasta)).map((arquivo) => readFileSync(new URL(`components/${arquivo}`, pasta), 'utf8')),
  ].join('\n');
  for (const passo of LOJA_TOUR_STEPS) {
    for (const alvo of passo.alvos) {
      const nome = /data-tour="([^"]+)"/.exec(alvo)?.[1];
      assert.ok(nome && fontes.includes(`data-tour="${nome}"`), `o passo ${passo.id} aponta para ${alvo}, que não está na Loja`);
    }
  }
});

test('texto novo da Loja para o jogador não usa travessão', () => {
  const pasta = new URL('../../src/pages/Loja/', import.meta.url);
  for (const arquivo of ['lojaTourConfig.ts', 'lojaVisual.ts', 'components/BalcaoDeVenda.tsx', 'components/CartazProcurado.tsx', 'components/DetalheDoProcurado.tsx', 'components/EditorDeProcurado.tsx', 'components/QuadroDeCacadores.tsx']) {
    const texto = readFileSync(new URL(arquivo, pasta), 'utf8');
    assert.ok(!texto.includes('—'), `${arquivo} tem travessão`);
  }
});
