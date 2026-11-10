import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  afinarAlfa, corDoFundo, dilatar, extrairPeca, juntarPecas, mascaraDeFrente, ordemDeLeitura, pecasDe, preencherCor, recortarArea, rotular, separarPeca,
  type Pixels,
} from '../../src/pages/Mapa/fatiador/corte';
import { casasDaEtiqueta, casasDaPeca, escalaDaMelhoria, etiquetaDaFolha, etiquetaDeCasas, nomeDaPeca, pxPorCasaDe } from '../../src/pages/Mapa/fatiador/escala';

type Cor = [number, number, number, number?];

/** Folha de teste: fundo liso e retângulos coloridos. */
function folha(w: number, h: number, fundo: Cor, objetos: Array<{ x: number; y: number; w: number; h: number; cor: Cor }>): Pixels {
  const dados = new Uint8ClampedArray(w * h * 4);
  const pintar = (x: number, y: number, c: Cor) => {
    const i = (y * w + x) * 4;
    dados[i] = c[0];
    dados[i + 1] = c[1];
    dados[i + 2] = c[2];
    dados[i + 3] = c[3] ?? 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pintar(x, y, fundo);
  for (const o of objetos) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) pintar(x, y, o.cor);
  return { largura: w, altura: h, dados };
}

const BRANCO: Cor = [255, 255, 255];
const VERMELHO: Cor = [200, 30, 30];
const AZUL: Cor = [30, 60, 200];
const AJUSTE = { cor: BRANCO as [number, number, number], tolerancia: 14, furos: 0 };

test('fundo: a cor que mais aparece na borda, ou transparente', () => {
  const branca = folha(20, 20, BRANCO, [{ x: 5, y: 5, w: 6, h: 6, cor: VERMELHO }]);
  assert.deepEqual(corDoFundo(branca), [255, 255, 255]);
  const creme = folha(20, 20, [240, 230, 210], [{ x: 5, y: 5, w: 6, h: 6, cor: AZUL }]);
  assert.deepEqual(corDoFundo(creme), [240, 230, 210]);
  const vazia = folha(20, 20, [0, 0, 0, 0], [{ x: 5, y: 5, w: 6, h: 6, cor: VERMELHO }]);
  assert.equal(corDoFundo(vazia), null);
});

test('recorte: dois objetos separados viram duas peças, em ordem de leitura', () => {
  const img = folha(60, 30, BRANCO, [
    { x: 30, y: 4, w: 10, h: 12, cor: AZUL },
    { x: 5, y: 4, w: 10, h: 12, cor: VERMELHO },
  ]);
  const frente = mascaraDeFrente(img, AJUSTE);
  const pecas = pecasDe(rotular(frente, 60, 30, 0, 1), 60, 30);
  assert.equal(pecas.length, 2);
  assert.deepEqual([pecas[0].x, pecas[0].y, pecas[0].largura, pecas[0].altura, pecas[0].area], [5, 4, 10, 12, 120]);
  assert.equal(pecas[1].x, 30);
});

test('recorte: partes próximas se juntam e a poeira some', () => {
  const img = folha(60, 30, BRANCO, [
    { x: 5, y: 5, w: 10, h: 10, cor: VERMELHO },
    { x: 19, y: 5, w: 10, h: 10, cor: VERMELHO }, // 4 px de vão
    { x: 50, y: 25, w: 1, h: 1, cor: AZUL }, // poeira
  ]);
  const frente = mascaraDeFrente(img, AJUSTE);
  assert.equal(pecasDe(rotular(frente, 60, 30, 0, 1), 60, 30).length, 3);
  assert.equal(pecasDe(rotular(frente, 60, 30, 1, 1), 60, 30).length, 3, 'raio 1 junta até 2 px de vão');
  const juntas = pecasDe(rotular(frente, 60, 30, 2, 4), 60, 30);
  assert.equal(juntas.length, 1, 'raio 2 junta o vão de 4 px e a poeira some');
  assert.equal(juntas[0].largura, 24);
});

test('fundo: o branco de dentro do objeto fica, e o furo só some se você pedir', () => {
  // Anel vermelho com 4x4 de branco dentro.
  const img = folha(30, 30, BRANCO, [{ x: 5, y: 5, w: 14, h: 14, cor: VERMELHO }, { x: 10, y: 10, w: 4, h: 4, cor: BRANCO }]);
  const comMiolo = mascaraDeFrente(img, AJUSTE);
  assert.equal(comMiolo[11 * 30 + 11], 1, 'miolo branco continua frente');
  const comFuro = mascaraDeFrente(img, { ...AJUSTE, furos: 10 });
  assert.equal(comFuro[11 * 30 + 11], 0, 'furo grande some');
  const pequeno = mascaraDeFrente(img, { ...AJUSTE, furos: 20 });
  assert.equal(pequeno[11 * 30 + 11], 1, 'furo menor que o pedido fica');
});

test('fundo: a tolerância pega o ruído de JPEG', () => {
  const img = folha(20, 20, [250, 250, 249], [{ x: 6, y: 6, w: 8, h: 8, cor: VERMELHO }]);
  img.dados[(2 * 20 + 2) * 4] = 238; // pixel do fundo manchado
  const frente = mascaraDeFrente(img, { cor: [250, 250, 249], tolerancia: 14, furos: 0 });
  assert.equal(frente[2 * 20 + 2], 0);
  const rigida = mascaraDeFrente(img, { cor: [250, 250, 249], tolerancia: 4, furos: 0 });
  assert.equal(rigida[2 * 20 + 2], 1, 'tolerância baixa demais trata a mancha como objeto');
});

test('edição: juntar, separar e recortar uma área mexem só nos rótulos', () => {
  const img = folha(60, 30, BRANCO, [
    { x: 5, y: 5, w: 8, h: 8, cor: VERMELHO },
    { x: 25, y: 5, w: 8, h: 8, cor: AZUL },
    { x: 45, y: 5, w: 8, h: 8, cor: VERMELHO },
  ]);
  const frente = mascaraDeFrente(img, AJUSTE);
  const rotulos = rotular(frente, 60, 30, 0, 1);
  const [a, b, c] = pecasDe(rotulos, 60, 30).map((p) => p.id);
  const ficou = juntarPecas(rotulos, [a, b]);
  assert.equal(ficou, a);
  let pecas = pecasDe(rotulos, 60, 30);
  assert.equal(pecas.length, 2);
  assert.equal(pecas[0].largura, 28, 'a peça junta cobre os dois');
  const partes = separarPeca(rotulos, 60, 30, a);
  assert.equal(partes.length, 2, 'cada corpo solto volta a ser uma peça');
  assert.equal(separarPeca(rotulos, 60, 30, c).length, 1, 'peça de um corpo só continua uma');
  assert.equal(pecasDe(rotulos, 60, 30).length, 3);
  // Retângulo que pega o meio das duas primeiras: vira uma peça só, tirando de quem estava lá.
  const nova = recortarArea(rotulos, frente, 60, 30, { x: 10, y: 3, largura: 18, altura: 12 });
  assert.ok(nova > 0);
  pecas = pecasDe(rotulos, 60, 30);
  const recortada = pecas.find((p) => p.id === nova)!;
  assert.deepEqual([recortada.x, recortada.largura], [10, 18 - 0]);
  assert.equal(recortarArea(rotulos, frente, 60, 30, { x: 0, y: 20, largura: 10, altura: 5 }), 0, 'sem frente na área, nada nasce');
});

test('extração: a borda leva a cor do objeto, não o branco do fundo', () => {
  // Objeto vermelho de 8x8 com o contorno de um pixel já misturado com o fundo (rosa claro).
  const img = folha(20, 20, BRANCO, [{ x: 5, y: 5, w: 10, h: 10, cor: [240, 160, 160] }, { x: 6, y: 6, w: 8, h: 8, cor: VERMELHO }]);
  const frente = mascaraDeFrente(img, AJUSTE);
  const rotulos = rotular(frente, 20, 20, 0, 1);
  const [peca] = pecasDe(rotulos, 20, 20);
  const saida = extrairPeca(img, [255, 255, 255], rotulos, peca, 1);
  assert.equal(saida.largura, 12);
  const px = (x: number, y: number) => Array.from(saida.dados.slice((y * saida.largura + x) * 4, (y * saida.largura + x) * 4 + 4));
  // (1,1) é o canto da peça: a cor veio do miolo vermelho, e a opacidade é cheia no miolo.
  assert.deepEqual(px(1, 1).slice(0, 3), [200, 30, 30]);
  assert.equal(px(5, 5)[3], 255);
  assert.equal(px(0, 0)[3] < 160, true, 'a margem de fora fica quase transparente');
  assert.equal(px(0, 0)[0] === 255 && px(0, 0)[1] === 255, false, 'e nunca branca');
});

test('extração: folha com transparência só separa os pixels da peça', () => {
  const img = folha(20, 10, [0, 0, 0, 0], [{ x: 2, y: 2, w: 4, h: 4, cor: [10, 20, 30, 128] }, { x: 12, y: 2, w: 4, h: 4, cor: [90, 90, 90, 255] }]);
  const frente = mascaraDeFrente(img, { cor: null, tolerancia: 14, furos: 0 });
  const rotulos = rotular(frente, 20, 10, 0, 1);
  const [primeira] = pecasDe(rotulos, 20, 10);
  const saida = extrairPeca(img, null, rotulos, primeira, 0);
  assert.equal(saida.largura, 4);
  assert.deepEqual(Array.from(saida.dados.slice(0, 4)), [10, 20, 30, 128], 'a meia transparência original fica');
});

test('dilatar: engorda em quadrado, sem passar da borda', () => {
  const m = new Uint8Array(25);
  m[12] = 1;
  const d = dilatar(m, 5, 5, 1);
  assert.equal(d.reduce((a, b) => a + b, 0), 9);
  const borda = new Uint8Array(25);
  borda[0] = 1;
  assert.equal(dilatar(borda, 5, 5, 1).reduce((a, b) => a + b, 0), 4);
});

test('ordem de leitura: linhas de cima primeiro, e da esquerda para a direita na mesma linha', () => {
  const mk = (id: number, x: number, y: number) => ({ id, x, y, largura: 10, altura: 10, area: 100 });
  const ordem = ordemDeLeitura([mk(1, 50, 52), mk(2, 5, 3), mk(3, 30, 1), mk(4, 8, 50)]).map((p) => p.id);
  assert.deepEqual(ordem, [2, 3, 4, 1]);
});

test('escala: casas ida e volta, etiqueta e limites', () => {
  assert.equal(casasDaPeca(70, 35), 2);
  assert.equal(casasDaPeca(46, 35), 1.31);
  assert.equal(casasDaPeca(1, 100), 0.1, 'peça pequena demais fica no mínimo');
  assert.equal(casasDaPeca(100000, 1), 120, 'e a enorme, no máximo do construtor');
  assert.equal(pxPorCasaDe(46, 1.3), 35.38);
  assert.equal(etiquetaDeCasas(2.3200001), 'casas:2.32');
  assert.equal(casasDaEtiqueta(['fatiado', 'casas:2.32']), 2.32);
  assert.equal(casasDaEtiqueta(['casas:abc', 'casas:0']), null);
  assert.equal(casasDaEtiqueta(undefined), null);
  assert.ok(etiquetaDeCasas(120).length <= 30, 'cabe no limite de etiqueta do servidor');
});

test('nomes: prefixo com número em ordem e etiqueta curta da folha', () => {
  assert.equal(nomeDaPeca('Quarto', 7, 24), 'Quarto 07');
  assert.equal(nomeDaPeca('', 3, 124), 'Peça 003');
  assert.equal(etiquetaDaFolha('Taverna Pack_01.PNG'), 'taverna-pack-01');
  assert.ok(etiquetaDaFolha('x'.repeat(80) + '.png').length <= 30);
});

test('melhoria: a cor da borda é esticada para o transparente, sem preto e sem mexer no que já tinha cor', () => {
  // 5x5 transparente com um pixel vermelho no meio e um azul no canto.
  const img: Pixels = { largura: 5, altura: 5, dados: new Uint8ClampedArray(5 * 5 * 4) };
  const pintar = (x: number, y: number, c: [number, number, number]) => {
    const i = (y * 5 + x) * 4;
    img.dados[i] = c[0];
    img.dados[i + 1] = c[1];
    img.dados[i + 2] = c[2];
    img.dados[i + 3] = 255;
  };
  pintar(2, 2, [200, 30, 30]);
  pintar(0, 0, [20, 40, 220]);
  const opaca = preencherCor(img);
  assert.equal(opaca.largura, 5);
  for (let i = 0; i < 25; i++) assert.equal(opaca.dados[i * 4 + 3], 255, 'tudo opaco');
  const px = (x: number, y: number) => Array.from(opaca.dados.slice((y * 5 + x) * 4, (y * 5 + x) * 4 + 3));
  assert.deepEqual(px(2, 2), [200, 30, 30], 'o que tinha cor fica igual');
  assert.deepEqual(px(0, 0), [20, 40, 220]);
  assert.deepEqual(px(3, 3), [200, 30, 30], 'vizinho do vermelho leva o vermelho');
  assert.deepEqual(px(1, 0), [20, 40, 220], 'vizinho do azul leva o azul');
  for (let i = 0; i < 25; i++) assert.ok(opaca.dados[i * 4] + opaca.dados[i * 4 + 1] + opaca.dados[i * 4 + 2] > 0, 'nada fica preto');
  // Peça vazia não quebra.
  const vazia = preencherCor({ largura: 2, altura: 2, dados: new Uint8ClampedArray(16) });
  assert.deepEqual(Array.from(vazia.dados.slice(0, 4)), [128, 128, 128, 255]);
});

test('melhoria: a curva da transparência firma a borda e mantém os extremos', () => {
  assert.equal(afinarAlfa(0), 0);
  assert.equal(afinarAlfa(255), 255);
  assert.equal(afinarAlfa(128), 128);
  assert.ok(afinarAlfa(20) <= 5, 'o rabo transparente some');
  assert.ok(afinarAlfa(235) >= 250, 'o quase opaco fecha');
  let anterior = -1;
  for (let v = 0; v <= 255; v++) {
    const atual = afinarAlfa(v);
    assert.ok(atual >= anterior, 'nunca desce');
    anterior = atual;
  }
});

test('melhoria: a escala automática leva a peça para a faixa nítida de 140 a 280 px por casa', () => {
  assert.equal(escalaDaMelhoria(32), 4);
  assert.equal(escalaDaMelhoria(69), 4);
  assert.equal(escalaDaMelhoria(70), 2);
  assert.equal(escalaDaMelhoria(139), 2);
  assert.equal(escalaDaMelhoria(140), 1);
  assert.equal(escalaDaMelhoria(300), 1);
  for (const px of [20, 35, 60, 70, 100, 139]) {
    const depois = px * escalaDaMelhoria(px);
    assert.ok(depois >= 80 && depois <= 280, `${px} px viram ${depois}`);
  }
});

test('integração: o construtor lê o tamanho da etiqueta e o servidor aceita os campos que o fatiador manda', () => {
  const construtor = readFileSync(new URL('../../src/pages/Mapa/construtor/ConstrutorMapa.tsx', import.meta.url), 'utf-8');
  assert.match(construtor, /casasDaEtiqueta\(item\.etiquetas\)/);
  const servidor = readFileSync(new URL('../../plataforma/core/acervo.py', import.meta.url), 'utf-8');
  // etiquetas: até 20, 30 letras cada, em minúsculas (o fatiador manda 3 e a etiqueta de casas tem até 10).
  assert.match(servidor, /valor\[:20\]/);
  assert.match(servidor, /\.lower\(\)\[:30\]/);
});
