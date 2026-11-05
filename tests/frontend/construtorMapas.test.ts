import assert from 'node:assert/strict';
import test from 'node:test';
import {
  abrir, adicionarLuz, apagarLuz, editarLuz, luzPerto, adicionarPeca, apagar, apagarPeca, areaMudada, camadaDe, chaveDaImagem, duplicarPeca, editarPeca, grupoDasPecas, moverNaOrdem, porPronta, pecasEmOrdem, arestaPerto, arestasDaLinha, casasDoPincel, contagem, conteudoVazio, fimDaLinha, pintar, poremParedes,
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

test('camadas, ordem e duplicar peças; a mobília do Jardim tem chave própria', () => {
  const tapete = { ...PECA, id: 'a', pacote: 'tapete', imagem_id: '', camada: 'chao' as const };
  const mesa = { ...PECA, id: 'b' };
  const arvore = { ...PECA, id: 'c', camada: 'alto' as const };
  const cadeira = { ...PECA, id: 'd' };
  let c = conteudoVazio(8, 8);
  for (const peca of [arvore, mesa, tapete, cadeira]) c = adicionarPeca(c, peca);
  // Desenho: chão, objetos (na ordem da lista) e alto.
  assert.deepEqual(pecasEmOrdem(c).map((p) => p.id), ['a', 'b', 'd', 'c']);
  assert.equal(camadaDe(mesa), 'objetos');
  // A mesa vai para a frente da cadeira (a outra da camada), e não passa a árvore.
  const frente = moverNaOrdem(c, 'b', 'frente');
  assert.deepEqual(pecasEmOrdem(frente).map((p) => p.id), ['a', 'd', 'b', 'c']);
  assert.equal(moverNaOrdem(frente, 'b', 'frente'), frente, 'já está na frente da camada');
  const copia = duplicarPeca(c, 'b', 'e');
  const nova = copia.pecas.find((p) => p.id === 'e')!;
  assert.deepEqual([nova.x, nova.y, nova.imagem_id], [mesa.x + 0.5, mesa.y + 0.5, mesa.imagem_id]);
  assert.equal(chaveDaImagem(tapete), 'mobilia:tapete');
  assert.equal(chaveDaImagem(mesa), mesa.imagem_id);
  assert.equal(editarPeca(c, 'a', { pacote: 'outro' }).pecas.find((p) => p.id === 'a')!.pacote, 'tapete', 'a origem não troca pela edição');
});

test('luzes fixas entram, mudam, são achadas pelo clique e vão para a borda ao encolher o mapa', () => {
  const luz = { id: 'l1', x: 5.5, y: 3.5, raio: 4, cor: '#ffb35c', tremula: true };
  const c = adicionarLuz(conteudoVazio(8, 6), luz);
  assert.equal(adicionarLuz(c, luz), c, 'mesmo id não entra de novo');
  assert.equal(luzPerto(c, { x: 5.7, y: 3.4 })?.id, 'l1');
  assert.equal(luzPerto(c, { x: 7, y: 3.5 }), null);
  assert.equal(editarLuz(c, 'l1', { raio: 2 }).luzes[0].raio, 2);
  assert.equal(apagarLuz(c, 'l1').luzes.length, 0);
  const menor = redimensionar(c, 4, 3);
  assert.deepEqual([menor.luzes[0].x, menor.luzes[0].y], [4, 3]);
  // Luz não mexe no desenho do mapa (ela é viva na mesa): o editor não redesenha pedaços.
  assert.equal(areaMudada(conteudoVazio(8, 6), c), null);
});

test('peça pronta guarda o grupo pelo centro e volta ao mapa com ids novos no ponto do clique', () => {
  const base = { imagem_id: '', pacote: 'mesa', rotulo: 'Mesa', imagem_largura: 100, imagem_altura: 60, escala: 2, rotacao: 0, espelhada: false };
  const mesa = { ...base, id: 'm', x: 4, y: 4 };
  const cadeira = { ...base, id: 'c', pacote: 'cadeira', rotulo: 'Cadeira', x: 4, y: 5, escala: 0.8 };
  const grupo = grupoDasPecas([mesa, cadeira]);
  assert.deepEqual(grupo.map((p) => [p.x, p.y]), [[0, -0.5], [0, 0.5]]);
  assert.deepEqual(grupoDasPecas([]), []);
  let n = 0;
  const posto = porPronta(conteudoVazio(10, 10), { id: 'p', nome: 'Mesa posta', pecas: grupo }, { x: 7, y: 2 }, () => `novo${++n}`);
  assert.deepEqual(posto.ids, ['novo1', 'novo2']);
  assert.deepEqual(posto.conteudo.pecas.map((p) => [p.id, p.x, p.y, p.pacote]), [['novo1', 7, 1.5, 'mesa'], ['novo2', 7, 2.5, 'cadeira']]);
  // Mapa cheio (256 peças): nada entra e o conteúdo fica o mesmo.
  const cheio = { ...conteudoVazio(10, 10), pecas: Array.from({ length: 256 }, (_, i) => ({ ...mesa, id: `x${i}` })) };
  const nada = porPronta(cheio, { id: 'p', nome: 'Mesa posta', pecas: grupo }, { x: 1, y: 1 }, () => 'z');
  assert.equal(nada.conteudo, cheio);
  assert.deepEqual(nada.ids, []);
});

test('mapa do Acervo vira peça grande do chão, em casas pela casa do projeto', async () => {
  const { casasDoMapa, pecaDoMapa } = await import('../../src/pages/Mapa/construtor/pecas');
  const { ESCALA_PECA_MAX } = await import('../../src/pages/Mapa/construtor/projeto');
  const praca = { id: 'a'.repeat(32), nome: 'Praça', largura: 3000, altura: 2000 };
  const peca = pecaDoMapa(praca);
  assert.equal(peca.camada, 'chao');
  assert.deepEqual([peca.imagem_id, peca.pacote, peca.imagem_largura, peca.imagem_altura], [praca.id, null, 3000, 2000]);
  // 3000 px com casa de 100 px: 30 casas; casa de 70 px: 42,86 casas; nunca passa do limite do servidor.
  assert.equal(casasDoMapa(3000, 100), 30);
  assert.equal(casasDoMapa(3000, 70), 42.86);
  assert.equal(casasDoMapa(30000, 50), ESCALA_PECA_MAX);
  assert.equal(ESCALA_PECA_MAX, 120);
  // Dois mapas lado a lado entram como duas peças, na ordem escolhida, e cabem no limite de peças.
  const juntos = adicionarPeca(adicionarPeca(conteudoVazio(60, 40), { ...peca, id: 'p1', x: 15, y: 10, escala: 30, rotacao: 0, espelhada: false } as never), { ...peca, id: 'p2', imagem_id: 'b'.repeat(32), x: 45, y: 10, escala: 30, rotacao: 0, espelhada: false } as never);
  assert.deepEqual(pecasEmOrdem(juntos).map((p) => p.id), ['p1', 'p2']);
  assert.notEqual(chaveDaImagem(juntos.pecas[0]), chaveDaImagem(juntos.pecas[1]));
});
