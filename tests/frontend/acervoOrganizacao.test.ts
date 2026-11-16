import assert from 'node:assert/strict';
import test from 'node:test';
import type { IItemAcervo, IPastaAcervo } from '../../src/services/acervoApi';
import {
  arrastaItens, arrastaOrganizacao, arrastaPasta, contarPorPasta, descendentesDaPasta, emLotes, empacotarIds, intervaloDeIds, itensQueMudam, lerIds,
  MAX_ITENS_POR_ARRASTO, MIME_MOVER_ITENS, MIME_MOVER_PASTA, opcoesDePasta, ordenarItens, podarSelecao, podeMoverPasta, quantasImagens, trilhaDaPasta,
} from '../../src/pages/Mapa/acervo/organizacao';
import {
  caixaDoDesenho, cabeNoMelhorador, escalaSugerida, espalharCorDaBorda, LADO_MAXIMO_DO_TOKEN, melhoriaDemorada, pedacosDoMelhorador, tamanhoDoResultado, tamanhoQueCabe, temTransparencia, tokenGrandeDemais,
} from '../../src/pages/Mapa/acervo/imagemConta';
import {
  ALTURA_MAXIMA_LIVRE, ETIQUETA_FORMATO_LIVRE, etiquetasComFormato, etiquetasDoTexto, formatoDasEtiquetas, formatoDoEnquadramento, medidasDoTokenLivre,
  PES_DO_TOKEN_LIVRE, separarEtiquetas,
} from '../../src/pages/Mapa/motor/formatoToken';
import { areaDeCarga, ZOOM_DETALHE, ZOOM_DETALHE_MINIMO, zoomDeDetalhe } from '../../src/pages/Mapa/motor/detalheConta';
import { lerNivelDeRealce, NIVEIS_DE_REALCE, parametrosDoRealce, passoDaVizinhanca } from '../../src/pages/Mapa/motor/realceConta';

const pastas: IPastaAcervo[] = [
  { id: 'cidades', pai_id: null, nome: 'Cidades' },
  { id: 'masmorras', pai_id: null, nome: 'Masmorras' },
  { id: 'porto', pai_id: 'cidades', nome: 'Porto' },
  { id: 'docas', pai_id: 'porto', nome: 'Docas' },
  { id: 'criptas', pai_id: 'masmorras', nome: 'Criptas' },
];

const item = (id: string, nome: string, extra: Partial<IItemAcervo> = {}): IItemAcervo => ({
  id, nome, tipo: 'mapa', largura: 1000, altura: 800, pasta_id: null, etiquetas: [], estado: 'pronto', bytes: 1, chaves: [], criado_em: '2026-01-01T00:00:00Z', ...extra,
});

// ------------------------------------------------------------- arrasto e pastas

test('o pacote de ids do arrasto vai e volta, sem repetir, sem lixo e com teto', () => {
  assert.deepEqual(lerIds(empacotarIds(['a', 'b', 'a'])), ['a', 'b']);
  for (const ruim of ['', 'nao-e-json', 'null', '{}', '"a"', '[1,2]', '[""]', null, undefined]) {
    assert.deepEqual(lerIds(ruim as string | null | undefined), [], String(ruim));
  }
  assert.deepEqual(lerIds(JSON.stringify(['ok', 3, '', 'x'.repeat(65), 'tambem'])), ['ok', 'tambem']);
  const muitos = Array.from({ length: MAX_ITENS_POR_ARRASTO + 50 }, (_, i) => `i${i}`);
  assert.equal(lerIds(empacotarIds(muitos)).length, MAX_ITENS_POR_ARRASTO);
});

test('o arrasto de imagens e de pastas se reconhece pelos tipos, e arquivo do computador fica de fora', () => {
  assert.equal(arrastaItens([MIME_MOVER_ITENS, 'text/plain']), true);
  assert.equal(arrastaItens(['Files']), false);
  assert.equal(arrastaPasta([MIME_MOVER_PASTA]), true);
  assert.equal(arrastaOrganizacao([MIME_MOVER_PASTA]), true);
  assert.equal(arrastaOrganizacao(['Files']), false);
  assert.equal(arrastaOrganizacao([]), false);
});

test('as subpastas de uma pasta vêm em qualquer profundidade e nunca incluem ela mesma', () => {
  assert.deepEqual([...descendentesDaPasta(pastas, 'cidades')].sort(), ['docas', 'porto']);
  assert.deepEqual([...descendentesDaPasta(pastas, 'docas')], []);
  // Um ciclo no dado (não deveria existir) não trava a conta.
  const ciclo: IPastaAcervo[] = [{ id: 'a', pai_id: 'b', nome: 'A' }, { id: 'b', pai_id: 'a', nome: 'B' }];
  assert.deepEqual([...descendentesDaPasta(ciclo, 'a')], ['b']);
});

test('pasta só vai para onde cabe: não para dentro dela mesma, de uma filha, nem para onde já está', () => {
  assert.equal(podeMoverPasta(pastas, 'porto', 'masmorras'), true);
  assert.equal(podeMoverPasta(pastas, 'porto', null), true, 'tirar da pasta de cima');
  assert.equal(podeMoverPasta(pastas, 'cidades', null), false, 'já está na raiz');
  assert.equal(podeMoverPasta(pastas, 'cidades', 'cidades'), false);
  assert.equal(podeMoverPasta(pastas, 'cidades', 'docas'), false, 'dentro de uma neta');
  assert.equal(podeMoverPasta(pastas, 'porto', 'cidades'), false, 'já está lá');
  assert.equal(podeMoverPasta(pastas, 'nao-existe', 'cidades'), false);
  assert.equal(podeMoverPasta(pastas, 'porto', 'nao-existe'), false);
});

test('só as imagens que de fato mudam de lugar entram na mudança', () => {
  const itens = [item('1', 'A', { pasta_id: 'porto' }), item('2', 'B', { pasta_id: null }), item('3', 'C', { pasta_id: 'cidades' })];
  assert.deepEqual(itensQueMudam(itens, ['1', '2', '3'], 'porto').map((i) => i.id), ['2', '3']);
  assert.deepEqual(itensQueMudam(itens, ['1', '2', '3'], null).map((i) => i.id), ['1', '3']);
  assert.deepEqual(itensQueMudam(itens, ['9'], null), []);
});

test('a contagem de uma pasta soma as imagens prontas das subpastas, e as que ainda sobem não contam', () => {
  const itens = [
    item('1', 'A', { pasta_id: 'cidades' }),
    item('2', 'B', { pasta_id: 'porto' }),
    item('3', 'C', { pasta_id: 'docas' }),
    item('4', 'D', { pasta_id: 'docas', estado: 'enviando' }),
    item('5', 'E', { pasta_id: null }),
    item('6', 'F', { pasta_id: 'pasta-que-sumiu' }),
  ];
  const { porPasta, diretas, foraDePasta, total } = contarPorPasta(pastas, itens);
  // A grade de uma pasta mostra só o que está nela: a contagem direta não soma as subpastas.
  assert.equal(diretas.get('cidades'), 1);
  assert.equal(diretas.get('porto'), 1);
  assert.equal(diretas.get('docas'), 1);
  assert.equal(diretas.get('masmorras') ?? 0, 0);
  assert.equal(porPasta.get('cidades'), 3);
  assert.equal(porPasta.get('porto'), 2);
  assert.equal(porPasta.get('docas'), 1);
  assert.equal(porPasta.get('masmorras') ?? 0, 0);
  assert.equal(foraDePasta, 1);
  assert.equal(total, 5);
});

test('a lista para escolher pasta vem em ordem de árvore, com recuo e caminho, e pode esconder um ramo', () => {
  const lista = opcoesDePasta(pastas);
  assert.deepEqual(lista.map((o) => `${o.nivel}:${o.nome}`), ['0:Cidades', '1:Porto', '2:Docas', '0:Masmorras', '1:Criptas']);
  assert.equal(lista[2].caminho, 'Cidades › Porto › Docas');
  assert.deepEqual(opcoesDePasta(pastas, new Set(['porto', 'docas'])).map((o) => o.nome), ['Cidades', 'Masmorras', 'Criptas']);
});

test('o caminho de uma pasta vai da raiz até ela', () => {
  assert.deepEqual(trilhaDaPasta(pastas, 'docas').map((p) => p.nome), ['Cidades', 'Porto', 'Docas']);
  assert.deepEqual(trilhaDaPasta(pastas, 'nao-existe'), []);
});

// ------------------------------------------------------------------- ordem e seleção

test('a ordem das imagens: nome natural, mais novas, mais pesadas e maior resolução', () => {
  const itens = [
    item('a', 'Mapa 10', { criado_em: '2026-01-02T00:00:00Z', bytes: 5, largura: 100, altura: 100 }),
    item('b', 'Mapa 2', { criado_em: '2026-03-01T00:00:00Z', bytes: 50, largura: 400, altura: 400 }),
    item('c', 'casa', { criado_em: '2026-02-01T00:00:00Z', bytes: 20, largura: 800, altura: 100 }),
  ];
  assert.deepEqual(ordenarItens(itens, 'nome').map((i) => i.id), ['c', 'b', 'a']);
  assert.deepEqual(ordenarItens(itens, 'novas').map((i) => i.id), ['b', 'c', 'a']);
  assert.deepEqual(ordenarItens(itens, 'maiores').map((i) => i.id), ['b', 'c', 'a']);
  assert.deepEqual(ordenarItens(itens, 'tamanho').map((i) => i.id), ['b', 'c', 'a']);
  assert.deepEqual(itens.map((i) => i.id), ['a', 'b', 'c'], 'não mexe na lista original');
});

test('shift-clique escolhe o intervalo, em qualquer direção', () => {
  const ordem = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(intervaloDeIds(ordem, 'b', 'd'), ['b', 'c', 'd']);
  assert.deepEqual(intervaloDeIds(ordem, 'd', 'b'), ['b', 'c', 'd']);
  assert.deepEqual(intervaloDeIds(ordem, null, 'c'), ['c']);
  assert.deepEqual(intervaloDeIds(ordem, 'fora', 'c'), ['c']);
  assert.deepEqual(intervaloDeIds(ordem, 'a', 'fora'), []);
});

test('a seleção perde o que sumiu e mantém o mesmo conjunto quando nada mudou', () => {
  const selecao = new Set(['a', 'b']);
  assert.equal(podarSelecao(selecao, ['a', 'b', 'c']), selecao, 'mesmo objeto: a tela não redesenha à toa');
  assert.deepEqual([...podarSelecao(selecao, ['b', 'c'])], ['b']);
  assert.deepEqual([...podarSelecao(selecao, [])], []);
});

test('o texto do número de imagens concorda no plural', () => {
  assert.equal(quantasImagens(1), '1 imagem');
  assert.equal(quantasImagens(0), '0 imagens');
  assert.equal(quantasImagens(3), '3 imagens');
});

test('emLotes roda todas, respeita o limite de simultâneas e devolve só as que falharam, em ordem', async () => {
  let ativas = 0;
  let maximo = 0;
  const feitas: number[] = [];
  const falhas = await emLotes([1, 2, 3, 4, 5, 6, 7], async (n) => {
    ativas++;
    maximo = Math.max(maximo, ativas);
    await new Promise((r) => setTimeout(r, 2));
    ativas--;
    if (n % 3 === 0) throw new Error(`falhou ${n}`);
    feitas.push(n);
  }, 3);
  assert.ok(maximo <= 3, `no máximo 3 de uma vez (foi ${maximo})`);
  assert.deepEqual(feitas.sort(), [1, 2, 4, 5, 7]);
  assert.deepEqual(falhas.map((f) => f.elemento), [3, 6]);
  assert.deepEqual(await emLotes([], async () => undefined), []);
});

// ------------------------------------------------------------------- imagem

test('o token é reduzido ao que o mapa entrega inteiro, e nunca aumenta', () => {
  assert.deepEqual(tamanhoQueCabe(4096, 2048, LADO_MAXIMO_DO_TOKEN), { largura: 1024, altura: 512 });
  assert.deepEqual(tamanhoQueCabe(600, 900, LADO_MAXIMO_DO_TOKEN), { largura: 600, altura: 900 });
  assert.deepEqual(tamanhoQueCabe(1, 5000, 1024), { largura: 1, altura: 1024 }, 'lado nunca chega a zero');
  assert.equal(tokenGrandeDemais(1024, 1024), false);
  assert.equal(tokenGrandeDemais(1025, 10), true);
});

test('a escala sugerida acompanha o tamanho e o tipo, e respeita o limite do resultado', () => {
  assert.equal(escalaSugerida(800, 600, 'mapa'), 4);
  assert.equal(escalaSugerida(2000, 1500, 'mapa'), 2);
  assert.equal(escalaSugerida(5000, 4000, 'mapa'), null);
  // Token: o mapa só usa até 1024 px, então ampliar além disso é perder o trabalho.
  assert.equal(escalaSugerida(200, 300, 'token'), 2, '300 x 4 passa de 1024');
  assert.equal(escalaSugerida(200, 250, 'token'), 4);
  assert.equal(escalaSugerida(600, 700, 'token'), null);
  assert.equal(cabeNoMelhorador(4000, 3000, 4), false, '16000 x 12000 passa de 100 milhões de pixels');
  assert.equal(cabeNoMelhorador(4000, 3000, 2), true);
  assert.equal(cabeNoMelhorador(5000, 3000, 4), false, '20000 passa de 16384');
  assert.equal(cabeNoMelhorador(5000, 3000, 2), true);
  assert.equal(cabeNoMelhorador(8000, 8000, 2), false, '16000 x 16000 passa de 100 milhões de pixels');
  assert.deepEqual(tamanhoDoResultado(300, 200, 4), { largura: 1200, altura: 800 });
  assert.equal(pedacosDoMelhorador(256, 256), 1);
  assert.equal(pedacosDoMelhorador(257, 512), 4);
  assert.equal(melhoriaDemorada(800, 600), false);
  assert.equal(melhoriaDemorada(3000, 4000), true, '12 x 16 = 192 pedaços');
});

test('a transparência se reconhece, e a cor suja sob ela é trocada pela da borda sem mexer no alfa', () => {
  // 3 x 1: opaco vermelho, transparente (preto sujo), transparente (preto sujo).
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(temTransparencia(pixels), true);
  assert.equal(temTransparencia(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255])), false);
  espalharCorDaBorda(pixels, 3, 1, 4);
  assert.deepEqual([...pixels.slice(4, 7)], [255, 0, 0], 'o vizinho transparente ganha o vermelho');
  assert.deepEqual([...pixels.slice(8, 11)], [255, 0, 0], 'e o seguinte também, na volta seguinte');
  assert.deepEqual([pixels[7], pixels[11]], [0, 0], 'o alfa não muda');
  // Com poucas voltas, o que está longe da borda fica como estava.
  const curto = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0, 9, 9, 9, 0]);
  espalharCorDaBorda(curto, 3, 1, 1);
  assert.deepEqual([...curto.slice(8, 11)], [9, 9, 9]);
});

test('a caixa do desenho aponta onde há algo visível, com margem, e a imagem toda quando não há', () => {
  // 4 x 3, só o pixel (2, 1) é visível.
  const pixels = new Uint8ClampedArray(4 * 3 * 4);
  pixels[(1 * 4 + 2) * 4 + 3] = 255;
  assert.deepEqual(caixaDoDesenho(pixels, 4, 3), { x: 2, y: 1, largura: 1, altura: 1 });
  assert.deepEqual(caixaDoDesenho(pixels, 4, 3, 1), { x: 1, y: 0, largura: 3, altura: 3 });
  assert.deepEqual(caixaDoDesenho(pixels, 4, 3, 10), { x: 0, y: 0, largura: 4, altura: 3 }, 'a margem não passa da imagem');
  assert.deepEqual(caixaDoDesenho(new Uint8ClampedArray(4 * 3 * 4), 4, 3), { x: 0, y: 0, largura: 4, altura: 3 });
});

// ------------------------------------------------------------------- formato do token

test('o formato do token vem das etiquetas da imagem e do enquadramento do token', () => {
  assert.equal(formatoDasEtiquetas(['lobo', ETIQUETA_FORMATO_LIVRE]), 'livre');
  assert.equal(formatoDasEtiquetas(['lobo']), 'redondo');
  assert.equal(formatoDasEtiquetas(undefined), 'redondo');
  assert.equal(formatoDoEnquadramento({ formato: 'livre' }), 'livre');
  assert.equal(formatoDoEnquadramento({ formato: 'outro' }), 'redondo');
  assert.equal(formatoDoEnquadramento(undefined), 'redondo');
  assert.deepEqual(etiquetasComFormato(['lobo', 'casas:2'], 'livre'), ['lobo', 'casas:2', ETIQUETA_FORMATO_LIVRE]);
  assert.deepEqual(etiquetasComFormato(['lobo', ETIQUETA_FORMATO_LIVRE], 'livre'), ['lobo', ETIQUETA_FORMATO_LIVRE], 'não repete');
  assert.deepEqual(etiquetasComFormato(['lobo', ETIQUETA_FORMATO_LIVRE], 'redondo'), ['lobo']);
});

test('as etiquetas do sistema ficam fora do que a pessoa edita, e o texto digitado vira etiquetas limpas', () => {
  assert.deepEqual(separarEtiquetas(['lobo', 'casas:2.5', ETIQUETA_FORMATO_LIVRE, 'floresta']), {
    visiveis: ['lobo', 'floresta'], doSistema: ['casas:2.5', ETIQUETA_FORMATO_LIVRE],
  });
  assert.deepEqual(etiquetasDoTexto(' Lobo, floresta ;  LOBO\nnoite  escura '), ['lobo', 'floresta', 'noite escura']);
  assert.deepEqual(etiquetasDoTexto('casas:3, formato:livre, ok'), ['ok'], 'a pessoa não escreve as do sistema');
  assert.deepEqual(etiquetasDoTexto('x'.repeat(40)), ['x'.repeat(30)]);
  assert.deepEqual(etiquetasDoTexto(''), []);
});

test('a arte de corpo inteiro cabe no quadrado do token e fica em pé, com os pés perto da borda de baixo', () => {
  const lado = 100;
  const padrao = { zoom: 1, x: 0, y: 0 };
  // Boneco 1:2: a altura passa do quadrado (1,6 no máximo) e a largura encolhe junto.
  const alto = medidasDoTokenLivre(500, 1000, lado, padrao);
  assert.ok(Math.abs(alto.altura - lado * ALTURA_MAXIMA_LIVRE) < 1e-9);
  assert.ok(Math.abs(alto.largura - alto.altura / 2) < 1e-9, 'a proporção da arte se mantém');
  assert.equal(alto.pesY, lado * PES_DO_TOKEN_LIVRE);
  assert.ok(Math.abs(alto.topo - (alto.pesY - alto.altura)) < 1e-9);
  // Arte larga: a largura cabe no quadrado.
  const largo = medidasDoTokenLivre(1000, 500, lado, padrao);
  assert.equal(largo.largura, lado);
  assert.equal(largo.altura, lado / 2);
  // Zoom aumenta a arte; deslocamento a empurra (x para os lados, y para baixo).
  const grande = medidasDoTokenLivre(1000, 500, lado, { zoom: 2, x: 0.5, y: -0.5 });
  assert.equal(grande.largura, lado * 2);
  assert.equal(grande.pesX, 25);
  assert.equal(grande.pesY, lado * PES_DO_TOKEN_LIVRE - 25);
  // Imagem de tamanho zero não quebra a conta.
  const vazia = medidasDoTokenLivre(0, 0, lado, padrao);
  assert.ok(Number.isFinite(vazia.largura) && Number.isFinite(vazia.altura));
});

// ------------------------------------------------------------------- detalhe e realce

test('o zoom que troca a versão reduzida pelos ladrilhos cheios desce com a densidade da tela, com piso', () => {
  assert.equal(zoomDeDetalhe(1), ZOOM_DETALHE);
  assert.equal(zoomDeDetalhe(0.8), ZOOM_DETALHE);
  assert.ok(zoomDeDetalhe(1.5) < ZOOM_DETALHE && zoomDeDetalhe(1.5) > zoomDeDetalhe(2));
  assert.ok(zoomDeDetalhe(2) >= ZOOM_DETALHE_MINIMO);
  assert.equal(zoomDeDetalhe(3), zoomDeDetalhe(2), 'acima de 1,8 não desce mais');
  assert.equal(zoomDeDetalhe(Number.NaN), ZOOM_DETALHE);
});

test('a área de carga é a tela com uma folga em volta, proporcional ao menor lado', () => {
  const area = areaDeCarga({ x: 100, y: 200, width: 800, height: 400 }, 0.25);
  assert.deepEqual(area, { left: 0, right: 1000, top: 100, bottom: 700 });
  assert.deepEqual(areaDeCarga({ x: 0, y: 0, width: 100, height: 100 }, 0), { left: 0, right: 100, top: 0, bottom: 100 });
});

test('o realce tem três níveis, o desligado não filtra e o valor guardado torto vira o suave', () => {
  assert.deepEqual(NIVEIS_DE_REALCE.map((n) => n.id), ['desligado', 'suave', 'forte']);
  assert.equal(parametrosDoRealce('desligado'), null);
  const suave = parametrosDoRealce('suave')!;
  const forte = parametrosDoRealce('forte')!;
  assert.ok(forte.forca > suave.forca && forte.contraste > suave.contraste && forte.saturacao > suave.saturacao);
  assert.ok(suave.forca > 0 && suave.contraste >= 1 && suave.saturacao >= 1);
  assert.equal(lerNivelDeRealce('forte'), 'forte');
  assert.equal(lerNivelDeRealce('desligado'), 'desligado');
  assert.equal(lerNivelDeRealce(null), 'suave');
  assert.equal(lerNivelDeRealce('ultra'), 'suave');
  assert.equal(passoDaVizinhanca(1), 1);
  assert.ok(passoDaVizinhanca(2) > 1 && passoDaVizinhanca(2) <= 2);
  assert.equal(passoDaVizinhanca(5), 2);
});
