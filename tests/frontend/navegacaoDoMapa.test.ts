import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { filtrarComandos, normalizarBusca, pontuarComando, proximoIndice, type ComandoBase } from '../../src/pages/Mapa/componentes/paletaConta';
import { fracaoDaBarra, meuTokenDaVez } from '../../src/pages/Mapa/componentes/hudConta';
import { acrescentarDado, ajustarModificador, formulaValida, limparFormula, modificadorDaFormula, resumoDaRolagem, testeDeD20 } from '../../src/pages/Mapa/componentes/dadosConta';
import { alcanceDoToken, chaveDoMovimento, comMovimento, contornoDoAlcance, metrosRestantes, movimentoDaFicha, movimentoPadrao, normalizarMovimento, passouDoAlcance, type AjusteDeMovimento } from '../../src/pages/Mapa/motor/alcanceConta';
import { ESPERA_OCIOSA_MS, podeSumir, tempoOciosoPassou } from '../../src/pages/Mapa/componentes/interfaceOciosa';
import { MAPA_TOUR_STORAGE_VERSION, mapaTourJaVisto, obterPassosTourMapa, serializarMapaTourVisto } from '../../src/pages/Mapa/mapaTourConfig';
import { casasDoTrecho, type IGrade } from '../../src/pages/Mapa/motor/geometria';
import { LIMITE_NOME_TOKEN, NOME_MINIMO_LETRAS, abreviarNome, larguraLivreDosNomes, letrasQueCabem, nomeCabe } from '../../src/pages/Mapa/motor/geometria';

const PAGINA = readFileSync(new URL('../../src/pages/Mapa/MapaPage.tsx', import.meta.url), 'utf8');

const COMANDOS: ComandoBase[] = [
  { id: 'f:regua', grupo: 'Ferramentas', rotulo: 'Régua', palavras: 'medir distancia metros' },
  { id: 'f:nevoa', grupo: 'Ferramentas', rotulo: 'Névoa de guerra', palavras: 'revelar esconder' },
  { id: 'c:clima', grupo: 'Cena', rotulo: 'Clima da cena', descricao: 'Chuva, neblina, escuridão e outros efeitos', palavras: 'chuva tempestade neve' },
  { id: 'c:tempo', grupo: 'Cena', rotulo: 'Tempo do mundo e luz', descricao: 'Avança o relógio e muda a luz da cena', disabled: true },
  { id: 't:1', grupo: 'Ir até', rotulo: 'Lobo Cinzento', descricao: 'Personagem ou token' },
  { id: 't:2', grupo: 'Ir até', rotulo: 'Capitã Névoa', descricao: 'Personagem ou token' },
];

test('a busca ignora acento e maiúscula', () => {
  assert.equal(normalizarBusca('  NÉVOA '), 'nevoa');
  assert.ok(pontuarComando(COMANDOS[1], 'nevoa') > 0);
  assert.ok(pontuarComando(COMANDOS[1], 'NÉV') > 0);
});

test('sem busca, os comandos ficam nas seções, na ordem em que a página os deu', () => {
  const grupos = filtrarComandos(COMANDOS, '   ');
  assert.deepEqual(grupos.map((g) => g.titulo), ['Ferramentas', 'Cena', 'Ir até']);
  assert.deepEqual(grupos[0].itens.map((i) => i.id), ['f:regua', 'f:nevoa']);
});

test('uma palavra extra acha o painel certo, e só ele', () => {
  const [grupo] = filtrarComandos(COMANDOS, 'chuv');
  assert.equal(grupo.titulo, 'Resultados');
  assert.deepEqual(grupo.itens.map((i) => i.id), ['c:clima']);
});

test('o começo do nome vem antes do meio do nome', () => {
  const [grupo] = filtrarComandos(COMANDOS, 'nev');
  // "Névoa de guerra" começa com o termo; "Capitã Névoa" tem a palavra depois; o clima só cita "neve" nas extras.
  assert.deepEqual(grupo.itens.map((i) => i.id), ['f:nevoa', 't:2', 'c:clima']);
});

test('todo termo digitado precisa aparecer', () => {
  assert.equal(filtrarComandos(COMANDOS, 'lobo cinzento').length, 1);
  assert.equal(filtrarComandos(COMANDOS, 'lobo dragão').length, 0);
  assert.equal(filtrarComandos(COMANDOS, 'xyzw').length, 0);
});

test('o que não dá para usar agora vai para o fim, e as setas pulam', () => {
  const [grupo] = filtrarComandos(COMANDOS, 'cena');
  assert.equal(grupo.itens.at(-1)?.id, 'c:tempo');
  const itens = grupo.itens;
  const ultimoLigado = itens.length - 2;
  assert.equal(proximoIndice(itens, ultimoLigado, 1), 0, 'dá a volta pulando o desligado');
  assert.equal(proximoIndice(itens, 0, -1), ultimoLigado);
  assert.equal(proximoIndice([], 0, 1), -1);
});

test('a barra do HUD nunca passa de cheia nem fica negativa', () => {
  assert.equal(fracaoDaBarra({ atual: 50, maximo: 200 }), 0.25);
  assert.equal(fracaoDaBarra({ atual: 260, maximo: 200 }), 1);
  assert.equal(fracaoDaBarra({ atual: -5, maximo: 200 }), 0);
  assert.equal(fracaoDaBarra({ atual: 5, maximo: 0 }), 0);
  // Quando o servidor esconde os números, vale a fração que ele manda.
  assert.equal(fracaoDaBarra({ fracao: 0.4, atual: null, maximo: null }), 0.4);
});

test('a vez é do jogador só quando o token é dele', () => {
  const tokens = [
    { id: 'a', e_meu: false, participante_id: 'p1', personagem_id: null },
    { id: 'b', e_meu: true, participante_id: 'p2', personagem_id: 'lyra' },
    { id: 'c', e_meu: true, participante_id: null, personagem_id: 'mascote' },
  ];
  assert.equal(meuTokenDaVez(tokens, 'p1', null), null, 'vez de outro');
  assert.equal(meuTokenDaVez(tokens, 'p2', null), 'b', 'pelo participante da Sessão');
  assert.equal(meuTokenDaVez(tokens, 'p9', 'mascote'), 'c', 'pelo personagem');
  assert.equal(meuTokenDaVez(tokens, null, 'lyra'), null, 'sem combate');
});

test('a página abre a central pelo teclado e cada item dos menus diz o que faz', () => {
  assert.match(PAGINA, /evento\.key === 'k' \|\| evento\.key === 'K'/);
  assert.match(PAGINA, /evento\.key === '\/'/);
  const inicio = PAGINA.indexOf('const itemCamadas');
  const fim = PAGINA.indexOf('const exibicaoDaTela');
  assert.ok(inicio > 0 && fim > inicio);
  const itens = PAGINA.slice(inicio, fim).split('\n').filter((linha) => linha.includes('rotulo:'));
  assert.ok(itens.length >= 15, `esperava os itens dos menus, achei ${itens.length}`);
  for (const linha of itens) assert.ok(linha.includes('descricao:'), `item sem descrição: ${linha.trim().slice(0, 80)}`);
});

test('o menu do jogador não leva nada que é só do Mestre', () => {
  const linha = PAGINA.split('\n').find((l) => l.includes('] : [itemJogadores'));
  assert.ok(linha, 'lista do jogador não achada');
  assert.doesNotMatch(linha, /Clima|Documento|Montar|Construtor|Oficina/);
});

test('dados: clicar no mesmo dado soma, em outro acrescenta', () => {
  assert.equal(acrescentarDado('', 20), '1d20');
  assert.equal(acrescentarDado('1d20', 20), '2d20');
  assert.equal(acrescentarDado('d6', 6), '2d6');
  assert.equal(acrescentarDado('2d6+3', 8), '2d6+3+1d8');
  assert.equal(acrescentarDado('1d10+1d100', 10), '2d10+1d100', 'd10 não se confunde com d100');
  assert.equal(acrescentarDado('2#d20', 20), '2#2d20');
  assert.equal(acrescentarDado('30d6', 6), '30d6', 'para no teto');
});

test('dados: o modificador soma, some quando zera e não existe sem dado', () => {
  assert.equal(ajustarModificador('1d20', 1), '1d20+1');
  assert.equal(ajustarModificador('1d20+1', 1), '1d20+2');
  assert.equal(ajustarModificador('1d20+1', -1), '1d20');
  assert.equal(ajustarModificador('1d20', -1), '1d20-1');
  assert.equal(ajustarModificador('2d6+1d8-2', -1), '2d6+1d8-3');
  assert.equal(ajustarModificador('', 1), '');
  assert.equal(modificadorDaFormula('2d6 + 3'), 3);
  assert.equal(modificadorDaFormula('2d6'), 0, 'o 6 do dado não é modificador');
});

test('dados: só passa o que o servidor entende', () => {
  for (const boa of ['1d20', 'd20', '2d6+3', '1d20+1d4-2', '2#d20', '2D6 + 3', '1d100']) assert.ok(formulaValida(boa), boa);
  for (const ruim of ['', '3', '+2', '2d', 'd', '2d6+', '2d6*2', 'abc', '2x6', '1d20+fogo']) assert.ok(!formulaValida(ruim), ruim);
  assert.equal(limparFormula(' 2D6 + 3 '), '2d6+3');
});

test('dados: um d20 sozinho é teste (aceita vantagem); o resto é rolagem livre', () => {
  assert.deepEqual(testeDeD20('1d20'), { bonus: 0 });
  assert.deepEqual(testeDeD20('d20+7'), { bonus: 7 });
  assert.deepEqual(testeDeD20('1d20-2'), { bonus: -2 });
  assert.equal(testeDeD20('2d20'), null);
  assert.equal(testeDeD20('1d20+1d4'), null);
  assert.equal(testeDeD20('2#d20'), null);
});

test('dados: o histórico mostra o total e os dados que saíram', () => {
  assert.equal(resumoDaRolagem({ resultado: 11, detalhes: { dados: [4, 4] } }), '11 (4, 4)');
  assert.equal(resumoDaRolagem({ resultado: 17, detalhes: { dados: [14] } }), '17 (14)');
  assert.equal(resumoDaRolagem({ resultado: 14, detalhes: { dados: [14] } }), '14');
  assert.equal(resumoDaRolagem({ resultado: 22, detalhes: { rolagens: [{ total: 15 }, { total: 7 }], dados: [15, 7] } }), '15 e 7');
  assert.equal(resumoDaRolagem({ resultado: null, detalhes: null }), '?');
});

test('nomes de tokens: vizinhos da mesma fileira dividem o espaço; quem está sozinho fica inteiro', () => {
  const livres = larguraLivreDosNomes([
    { id: 'lyra', x: 1050, y: 850, lado: 100 },
    { id: 'goblin', x: 1150, y: 850, lado: 100 },
    { id: 'lobo', x: 1250, y: 850, lado: 100 },
    { id: 'bau', x: 650, y: 450, lado: 100 },
    { id: 'embaixo', x: 1050, y: 950, lado: 100 },
  ]);
  assert.ok(!livres.has('bau'), 'sem vizinho, sem aperto');
  assert.ok((livres.get('goblin') ?? Infinity) < 100, 'cabe no espaço até o vizinho');
  assert.equal(livres.get('lyra'), livres.get('goblin'));
  assert.ok(!livres.has('embaixo'), 'outra fileira não aperta o nome');
});

test('nomes de tokens: a largura livre vira número de letras, entre o mínimo e o limite', () => {
  assert.equal(letrasQueCabem(Infinity, 16), LIMITE_NOME_TOKEN);
  assert.equal(letrasQueCabem(1, 16), NOME_MINIMO_LETRAS);
  const cabem = letrasQueCabem(94, 16);
  assert.ok(cabem >= 8 && cabem <= 12, String(cabem));
  // De longe a letra é desenhada maior: cabem menos.
  assert.ok(letrasQueCabem(94, 32) < cabem);
  assert.ok(abreviarNome('Goblin Batedor', cabem).length <= cabem);
  assert.equal(abreviarNome('Lyra', cabem), 'Lyra');
  // Amontoado e de longe (letra seis vezes maior), nem o nome curto cabe: o token fica sem nome até o mouse passar.
  assert.ok(nomeCabe(94, 16));
  assert.ok(!nomeCabe(94, 16 * 6));
  assert.ok(nomeCabe(Infinity, 16 * 6), 'sozinho, sempre cabe');
});

test('a página liga os dados na tecla D e o painel Mesa abre um por vez com os outros', () => {
  assert.match(PAGINA, /evento\.key === 'd' \|\| evento\.key === 'D'/);
  assert.match(PAGINA, /alternarPainel\('mesa'\)/);
  assert.match(PAGINA, /mesa: setMesaAberta/);
});

test('nomes de tokens: ao lado de um nome inteiro, o vizinho cede o espaço ou fica sem nome', () => {
  const fileira = [
    { id: 'goblin', x: 1150, y: 850, lado: 100 },
    { id: 'lobo', x: 1250, y: 850, lado: 100 },
    { id: 'guarda', x: 1350, y: 850, lado: 100 },
  ];
  // "Lobo Cinzento" inteiro ocupa uns 120 de largura: sobra pouco para os dois lados.
  const livres = larguraLivreDosNomes(fileira, new Map([['lobo', 120]]));
  assert.ok(!livres.has('lobo'), 'o nome inteiro não encolhe');
  const sobra = livres.get('goblin') ?? Infinity;
  assert.ok(sobra > 0 && sobra < 94, String(sobra));
  // Um nome inteiro bem comprido cobre o vizinho: ele fica sem nome enquanto isso.
  const cobertos = larguraLivreDosNomes(fileira, new Map([['lobo', 260]]));
  assert.equal(cobertos.get('goblin'), 0);
  assert.ok(!nomeCabe(0, 16));
});

const GRADE: IGrade = { tipo: 'quadrada', tamanho: 100, x: 0, y: 0, cor: '#ffffff', opacidade: 0.3, metros: 1.5, medicao: 'euclidiana' };

test('alcance: o padrão é seis casas, na unidade da cena', () => {
  assert.equal(movimentoPadrao({ metros: 1.5 }), 9);
  assert.equal(movimentoPadrao({ metros: 5 }), 30);
  assert.equal(metrosRestantes(9, 3), 6);
  assert.equal(metrosRestantes(9, 12), 0);
  assert.ok(!passouDoAlcance(9, 9));
  assert.ok(passouDoAlcance(9, 10.5));
});

test('alcance: o número digitado vira um valor aceitável, e lixo não entra', () => {
  assert.equal(normalizarMovimento('12'), 12);
  assert.equal(normalizarMovimento('7,5'), 7.5);
  assert.equal(normalizarMovimento(-3), 0);
  assert.equal(normalizarMovimento(9999), 300);
  assert.equal(normalizarMovimento(''), null);
  assert.equal(normalizarMovimento('nove'), null);
});

test('alcance: fica guardado pelo personagem, e a lista não cresce sem fim', () => {
  assert.equal(chaveDoMovimento({ id: 'tok', personagem_id: 'lyra' }), 'p:lyra');
  assert.equal(chaveDoMovimento({ id: 'tok', personagem_id: null }), 't:tok');
  let guardados: Record<string, AjusteDeMovimento> = {};
  for (let i = 0; i < 100; i++) guardados = comMovimento(guardados, `t:${i}`, { m: 12, de: 9 });
  assert.equal(Object.keys(guardados).length, 80);
  assert.ok(!('t:0' in guardados) && 't:99' in guardados);
  assert.deepEqual(comMovimento({ 'p:a': { m: 12, de: 9 } }, 'p:a', { m: 6, de: 9 })['p:a'], { m: 6, de: 9 });
  // Nulo tira o ajuste: volta a valer o número da ficha.
  assert.deepEqual(comMovimento({ 'p:a': { m: 12, de: 9 } }, 'p:a', null), {});
});

test('alcance: o contorno bate com a régua em cada jeito de medir', () => {
  const centro = { x: 1050, y: 850 };
  for (const medicao of ['euclidiana', 'chebyshev', 'manhattan', 'alternada'] as const) {
    const grade = { ...GRADE, medicao };
    const contorno = contornoDoAlcance(centro, 9, grade);
    assert.equal(contorno.length, 72, medicao);
    for (const ponto of contorno) {
      const metros = casasDoTrecho(centro, ponto, grade) * grade.metros;
      assert.ok(Math.abs(metros - 9) < 0.06, `${medicao}: ${metros}`);
    }
  }
  // Na medida reta é um círculo de 6 casas; quando a diagonal custa igual, o canto vai mais longe.
  const reto = contornoDoAlcance(centro, 9, GRADE);
  assert.ok(reto.every((p) => Math.abs(Math.hypot(p.x - centro.x, p.y - centro.y) - 600) < 1));
  const quadrado = contornoDoAlcance(centro, 9, { ...GRADE, medicao: 'chebyshev' });
  assert.ok(Math.max(...quadrado.map((p) => Math.hypot(p.x - centro.x, p.y - centro.y))) > 800);
});

test('alcance: sem movimento sobrando não há contorno', () => {
  assert.deepEqual(contornoDoAlcance({ x: 0, y: 0 }, 0, GRADE), []);
  assert.deepEqual(contornoDoAlcance({ x: 0, y: 0 }, 9, { ...GRADE, metros: 0 }), []);
});

test('guia do mapa: quatro passos para o jogador, sem nada que é só do Mestre', () => {
  const jogador = obterPassosTourMapa(false);
  const mestre = obterPassosTourMapa(true);
  assert.equal(jogador.length, 4);
  assert.equal(mestre.length, 5);
  for (const passo of [...jogador, ...mestre]) {
    assert.ok(passo.alvos.length > 0 && passo.titulo && passo.descricao, passo.id);
    // Texto para o jogador: sem travessão.
    assert.doesNotMatch(passo.titulo + passo.descricao, /[—–]/, passo.id);
  }
  assert.doesNotMatch(jogador.map((p) => p.descricao).join(' '), /Névoa|Portais|Acervo|Construtor/);
  assert.equal(new Set(jogador.map((p) => p.id)).size, jogador.length);
  assert.equal(new Set(mestre.map((p) => p.id)).size, mestre.length);
});

test('guia do mapa: visto vale só para a versão atual', () => {
  assert.ok(mapaTourJaVisto(serializarMapaTourVisto()));
  assert.ok(!mapaTourJaVisto(null));
  assert.ok(!mapaTourJaVisto('lixo'));
  assert.ok(!mapaTourJaVisto(JSON.stringify({ versao: MAPA_TOUR_STORAGE_VERSION + 1, concluido: true })));
});

test('a página liga a câmera, o alcance e o guia', () => {
  assert.match(PAGINA, /jardim\.mapa\.seguirVez/);
  assert.match(PAGINA, /definirAlcance\(contornoAlcance\)/);
  assert.match(PAGINA, /rootSelector="\.mapa-pagina"/);
  // Com o guia aberto, as teclas do mapa ficam quietas.
  assert.match(PAGINA, /construtorAberto \|\| tourAberto/);
});

test('alcance: o Movimento da ficha vem em metros e vira a unidade da cena', () => {
  assert.equal(movimentoDaFicha(9, { metros: 1.5 }), 9);
  assert.equal(movimentoDaFicha(12, { metros: 1.5 }), 12);
  // Cena em pés (5 por casa): 9 m são 6 casas, 30 pés.
  assert.equal(movimentoDaFicha(9, { metros: 5 }), 30);
  assert.equal(movimentoDaFicha(0, { metros: 1.5 }), 0, 'Paralisado: zero é um valor, não ausência');
  assert.equal(movimentoDaFicha(null, { metros: 1.5 }), null);
  assert.equal(movimentoDaFicha(undefined, { metros: 1.5 }), null);
});

test('alcance: a ficha manda; o ajuste do aparelho vale só enquanto a ficha não mudar', () => {
  // Sem ficha (monstro): o padrão.
  assert.deepEqual(alcanceDoToken(undefined, null, 9), { alcance: 9, base: 9, ajustado: false });
  // Com ficha: o número dela.
  assert.deepEqual(alcanceDoToken(undefined, 12, 9), { alcance: 12, base: 12, ajustado: false });
  // Ajuste feito em cima de 12: vale.
  assert.deepEqual(alcanceDoToken({ m: 15, de: 12 }, 12, 9), { alcance: 15, base: 12, ajustado: true });
  // A ficha mudou (ficou Lento, 6 m): o ajuste antigo deixa de valer e a ficha volta a mandar.
  assert.deepEqual(alcanceDoToken({ m: 15, de: 12 }, 6, 9), { alcance: 6, base: 6, ajustado: false });
  // Ajuste igual ao da ficha não conta como ajuste.
  assert.equal(alcanceDoToken({ m: 12, de: 12 }, 12, 9).ajustado, false);
});

test('modo imersivo: só some depois do tempo parado e com nada em uso', () => {
  assert.ok(!tempoOciosoPassou(1000, 1000 + ESPERA_OCIOSA_MS - 1));
  assert.ok(tempoOciosoPassou(1000, 1000 + ESPERA_OCIOSA_MS));
  const tela = (foco: unknown, aberto: unknown) => ({ activeElement: foco, querySelector: () => aberto }) as unknown as Document;
  assert.ok(podeSumir(tela(null, null)));
  assert.ok(podeSumir(tela({ tagName: 'BODY' }, null)));
  assert.ok(!podeSumir(tela({ tagName: 'INPUT' }, null)), 'campo com o cursor segura a interface');
  assert.ok(!podeSumir(tela({ tagName: 'BODY' }, {})), 'painel ou menu aberto segura a interface');
});

test('a página liga o botão direito, o modo imersivo e o encerrar turno', () => {
  assert.match(PAGINA, /aoContexto: \(ponto, tela, tokenId\)/);
  assert.match(PAGINA, /jardim\.mapa\.imersivo/);
  assert.match(PAGINA, /passarMinhaVez\(\)/);
  assert.match(PAGINA, /movimentoDaFicha\(tokenDoAlcance\.movimento/);
  // O que é só do Mestre no menu de contexto fica dentro de um teste de `gestor`.
  const linhas = PAGINA.slice(PAGINA.indexOf('const itensDoContexto'), PAGINA.indexOf('const itemCamadas')).split('\n');
  for (const rotulo of ['Falar como este token', 'Tirar do mapa', 'Escrever aqui', 'Trazer os participantes para cá']) {
    const indice = linhas.findIndex((linha) => linha.includes(rotulo));
    assert.ok(indice > 0, rotulo);
    assert.ok(linhas.slice(0, indice + 1).some((linha) => linha.includes('...(gestor ? [')), `${rotulo} deveria ser só do Mestre`);
  }
});

test('o palco não escolhe nem arrasta token com o botão direito', () => {
  const palco = readFileSync(new URL('../../src/pages/Mapa/motor/palco.ts', import.meta.url), 'utf8');
  assert.match(palco, /if \(evento\.button === 2\) return;/);
  assert.match(palco, /addEventListener\('contextmenu'/);
});
