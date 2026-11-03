import assert from 'node:assert/strict';
import test from 'node:test';
import {
  abrir, adicionarPeca, apagar, apagarPeca, areaMudada, editarPeca, arestaPerto, arestasDaLinha, casasDoPincel, contagem, conteudoVazio, fimDaLinha, pintar, poremParedes,
  redimensionar, sala, tirarParedes, trechosDeParede,
} from '../../src/pages/Mapa/construtor/projeto';

test('sala faz o chão e a parede em volta, e duas salas encostadas viram uma', () => {
  const vazio = conteudoVazio(8, 6);
  const uma = sala(vazio, { x: 1, y: 1 }, { x: 3, y: 2 }, 'L', 'pedra');
  assert.deepEqual(uma.chao.slice(0, 4), ['........', '.LLL....', '.LLL....', '........']);
  assert.equal(Object.keys(uma.paredes).length, 3 * 2 + 2 * 2);
  assert.equal(uma.paredes['h,1,1'], 'pedra');
  assert.equal(uma.paredes['v,4,2'], 'pedra');
  // A segunda sala, de tábua, encosta à direita: a parede do meio some e o chão de lá muda.
  const duas = sala(uma, { x: 4, y: 1 }, { x: 5, y: 2 }, 'T', 'tijolo');
  assert.equal(duas.chao[1], '.LLLTT..');
  assert.equal(duas.paredes['v,4,1'], 'pedra', 'a borda que já existia fica como era');
  // Uma sala por cima das duas apaga as paredes de dentro.
  const grande = sala(duas, { x: 1, y: 1 }, { x: 5, y: 2 }, 'M', 'pedra');
  assert.equal(grande.paredes['v,4,1'], undefined);
  assert.equal(grande.paredes['h,1,1'], 'pedra');
  assert.equal(grande.chao[2], '.MMMMM..');
});

test('a sala respeita a borda do mapa e a porta que já estava nela', () => {
  const comPorta = abrir(sala(conteudoVazio(4, 4), { x: 0, y: 0 }, { x: 1, y: 1 }, 'L', 'pedra'), 'h,0,2', 'porta');
  assert.equal(comPorta.aberturas['h,0,2'].tipo, 'porta');
  const vizinha = sala(comPorta, { x: 0, y: 2 }, { x: 9, y: 9 }, 'T', 'madeira');
  assert.equal(vizinha.aberturas['h,0,2'].tipo, 'porta');
  assert.equal(vizinha.chao[3], 'TTTT');
  assert.equal(sala(conteudoVazio(4, 4), { x: 9, y: 9 }, { x: 12, y: 12 }, 'L', 'pedra').chao[0], '....');
});

test('pincel e borracha de chão', () => {
  const pintado = pintar(conteudoVazio(5, 5), casasDoPincel({ x: 2.5, y: 2.5 }, 3), 'G');
  assert.deepEqual(pintado.chao, ['.....', '.GGG.', '.GGG.', '.GGG.', '.....']);
  const apagado = apagar(pintado, { x: 2.5, y: 2.5 }, 'chao', 1);
  assert.equal(apagado.chao[2], '.G.G.');
  // Pintar o mesmo material não muda nada (o histórico não ganha um passo vazio).
  assert.equal(pintar(pintado, [{ x: 1, y: 1 }], 'G'), pintado);
  assert.equal(pintar(pintado, [{ x: -1, y: 9 }], 'L'), pintado);
});

test('parede reta segue o eixo que andou mais', () => {
  assert.deepEqual(fimDaLinha({ x: 1, y: 1 }, { x: 4, y: 2 }), { x: 4, y: 1 });
  assert.deepEqual(arestasDaLinha({ x: 1, y: 1 }, { x: 4, y: 1 }), ['h,1,1', 'h,2,1', 'h,3,1']);
  assert.deepEqual(arestasDaLinha({ x: 2, y: 3 }, { x: 2, y: 0 }), ['v,2,0', 'v,2,1', 'v,2,2']);
  const com = poremParedes(conteudoVazio(4, 4), ['h,1,1', 'h,9,9'], 'cerca');
  assert.deepEqual(com.paredes, { 'h,1,1': 'cerca' });
  assert.deepEqual(tirarParedes(com, ['h,1,1']).paredes, {});
});

test('a aresta mais perto do cursor e as portas', () => {
  const base = sala(conteudoVazio(6, 6), { x: 1, y: 1 }, { x: 3, y: 3 }, 'L', 'pedra');
  assert.equal(arestaPerto(base, { x: 1.5, y: 1.1 }, 0.3, true), 'h,1,1');
  assert.equal(arestaPerto(base, { x: 2.5, y: 2.5 }, 0.3, true), null, 'longe de parede');
  assert.equal(arestaPerto(base, { x: 2.5, y: 2.1 }, 0.3, false), 'h,2,2', 'sem exigir parede pega qualquer aresta');
  let c = abrir(base, 'h,2,1', 'porta');
  assert.deepEqual(c.aberturas['h,2,1'], { tipo: 'porta', estado: 'fechada' });
  c = abrir(c, 'h,2,1', 'porta');
  assert.equal(c.aberturas['h,2,1'].estado, 'aberta');
  c = abrir(c, 'h,2,1', 'porta');
  assert.equal(c.aberturas['h,2,1'].estado, 'trancada');
  c = abrir(c, 'h,2,1', 'porta');
  assert.equal(c.aberturas['h,2,1'], undefined);
  c = abrir(c, 'v,1,2', 'janela');
  assert.equal(c.aberturas['v,1,2'].tipo, 'janela');
  assert.equal(abrir(c, 'v,1,2', 'janela').aberturas['v,1,2'], undefined);
  assert.equal(abrir(c, 'v,1,2', 'secreta').aberturas['v,1,2'].tipo, 'secreta', 'outro tipo troca');
  assert.equal(abrir(base, 'h,4,4', 'porta'), base, 'sem parede, nada');
  // A borracha de paredes leva a porta junto.
  const semParede = apagar(abrir(base, 'h,2,1', 'porta'), { x: 2.5, y: 1.05 }, 'paredes');
  assert.equal(semParede.paredes['h,2,1'], undefined);
  assert.equal(semParede.aberturas['h,2,1'], undefined);
});

test('trechos de parede: a porta abre um vão, janela e secreta continuam parede', () => {
  let c = sala(conteudoVazio(6, 4), { x: 0, y: 0 }, { x: 2, y: 1 }, 'L', 'pedra');
  c = abrir(c, 'h,1,2', 'porta');
  c = abrir(c, 'v,0,0', 'janela');
  const trechos = trechosDeParede(c).map((t) => t.trecho).sort();
  assert.deepEqual(trechos, [[0, 0, 0, 2], [0, 0, 3, 0], [0, 2, 1, 2], [2, 2, 3, 2], [3, 0, 3, 2]].sort());
  // Materiais diferentes viram trechos separados (cada um com a textura dele).
  const misturado = poremParedes(conteudoVazio(4, 4), ['h,0,0', 'h,1,0'], 'pedra');
  const comTijolo = poremParedes(misturado, ['h,2,0'], 'tijolo');
  assert.equal(trechosDeParede(comTijolo).length, 2);
});

test('mudar o tamanho corta ou completa e leva as paredes de fora', () => {
  const c = sala(conteudoVazio(6, 6), { x: 3, y: 3 }, { x: 5, y: 5 }, 'L', 'pedra');
  const menor = redimensionar(c, 4, 4);
  assert.deepEqual(menor.chao, ['....', '....', '....', '...L']);
  assert.ok(Object.keys(menor.paredes).every((k) => !k.startsWith('h,4') && !k.startsWith('v,5')));
  const maior = redimensionar(c, 8, 7);
  assert.equal(maior.chao.length, 7);
  assert.equal(maior.chao[3], '...LLL..');
  assert.equal(Object.keys(maior.paredes).length, Object.keys(c.paredes).length);
});

test('a área que mudou, com uma casa de folga, para redesenhar só ali', () => {
  const vazio = conteudoVazio(10, 10);
  assert.equal(areaMudada(vazio, vazio), null);
  const pintado = pintar(vazio, [{ x: 4, y: 5 }], 'L');
  assert.deepEqual(areaMudada(vazio, pintado), { x0: 3, y0: 4, x1: 6, y1: 7 });
  const comParede = poremParedes(vazio, ['v,8,2'], 'pedra');
  assert.deepEqual(areaMudada(vazio, comParede), { x0: 7, y0: 1, x1: 9, y1: 4 });
  assert.deepEqual(areaMudada(comParede, vazio), { x0: 7, y0: 1, x1: 9, y1: 4 }, 'tirar também conta');
});

test('a contagem do rodapé', () => {
  let c = sala(conteudoVazio(6, 6), { x: 0, y: 0 }, { x: 1, y: 1 }, 'L', 'pedra');
  c = abrir(abrir(c, 'h,0,0', 'porta'), 'h,1,0', 'janela');
  assert.deepEqual(contagem(c), { chao: 4, paredes: 8, portas: 1, janelas: 1, pecas: 0 });
});

const PECA = {
  id: '6f1c2a0e-8a4b-4c7d-9e1f-0a2b3c4d5e6f', imagem_id: '1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b', rotulo: 'Mesa',
  imagem_largura: 400, imagem_altura: 200, x: 3, y: 3, escala: 2, rotacao: 0, espelhada: false,
};

test('peças entram, mudam, saem e sobrevivem a mudar o tamanho do mapa', () => {
  const vazio = conteudoVazio(8, 8);
  const comPeca = adicionarPeca(vazio, PECA);
  assert.equal(comPeca.pecas.length, 1);
  assert.equal(adicionarPeca(comPeca, PECA), comPeca, 'o mesmo id não entra duas vezes');
  // A área que mudou cobre a peça inteira (2 x 1 casas em volta do centro), com folga.
  const area = areaMudada(vazio, comPeca)!;
  assert.ok(area.x0 <= 1 && area.x1 >= 5 && area.y0 <= 1 && area.y1 >= 5);
  const girada = editarPeca(comPeca, PECA.id, { rotacao: 90, imagem_id: 'outro' });
  assert.equal(girada.pecas[0].rotacao, 90);
  assert.equal(girada.pecas[0].imagem_id, PECA.imagem_id, 'a imagem da peça não troca pela edição');
  assert.equal(editarPeca(comPeca, 'nenhuma', { x: 1 }), comPeca);
  assert.deepEqual(redimensionar(comPeca, 4, 4).pecas, comPeca.pecas);
  assert.equal(apagarPeca(comPeca, PECA.id).pecas.length, 0);
  assert.equal(contagem(comPeca).pecas, 1);
});
