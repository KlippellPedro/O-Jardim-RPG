import assert from 'node:assert/strict';
import test from 'node:test';
import { abreviarNome, chavesEsperadas, encaixar, escalaDoNome, iniciais, medir, nomeVisivel, type IGrade } from '../../src/pages/Mapa/motor/geometria';
import { Interpolador } from '../../src/pages/Mapa/tempoReal';

const QUADRADA: IGrade = { tipo: 'quadrada', tamanho: 100, x: 0, y: 0, cor: '#ffffff', opacidade: 0.2, metros: 1.5 };

test('token de uma casa encaixa no meio da casa; de duas, no cruzamento das linhas', () => {
  assert.deepEqual(encaixar({ x: 140, y: 260 }, QUADRADA, 1), { x: 150, y: 250 });
  assert.deepEqual(encaixar({ x: 140, y: 260 }, QUADRADA, 2), { x: 100, y: 300 });
  const deslocada = { ...QUADRADA, x: 30, y: -20 };
  assert.deepEqual(encaixar({ x: 140, y: 260 }, deslocada, 1), { x: 180, y: 230 });
});

test('grade hexagonal encaixa no centro de um hexágono, e nenhuma grade deixa onde está', () => {
  const hex: IGrade = { ...QUADRADA, tipo: 'hex' };
  const centro = encaixar({ x: 0, y: 0 }, hex);
  assert.deepEqual(centro, { x: 0, y: 0 });
  const vizinho = encaixar({ x: 95, y: 4 }, hex);
  assert.ok(Math.abs(vizinho.x - 100) < 1e-6 && Math.abs(vizinho.y) < 1e-6);
  const deCima = encaixar({ x: 52, y: 84 }, hex);
  assert.ok(Math.abs(deCima.x - 50) < 1e-6 && Math.abs(deCima.y - (100 / Math.sqrt(3)) * 1.5) < 1e-6);
  assert.deepEqual(encaixar({ x: 12.3, y: 45.6 }, { ...QUADRADA, tipo: 'nenhuma' }), { x: 12.3, y: 45.6 });
});

test('régua soma os trechos e converte casas em metros', () => {
  assert.deepEqual(medir([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 400 }], QUADRADA), { quadrados: 7, metros: 10.5 });
});

test('pedaços do acervo seguem a mesma conta do servidor', () => {
  assert.deepEqual(chavesEsperadas(800, 600), ['mini', 'n0/0/0']);
  const grande = chavesEsperadas(5000, 3000);
  assert.ok(grande.includes('n0/4/2') && !grande.includes('n0/5/0'));
  assert.ok(grande.includes('n2/1/0') && !grande.includes('n2/2/0'));
});

test('iniciais do token sem retrato', () => {
  assert.equal(iniciais('Lobo Cinzento das Sombras'), 'LS');
  assert.equal(iniciais('Mira'), 'MI');
  assert.equal(iniciais('  '), '?');
});

test('interpolador desenha no passado, liga as amostras e não volta no tempo', () => {
  const interpolador = new Interpolador(0);
  // Amostras do servidor a cada 50 ms, chegando 80 ms depois de enviadas.
  for (let i = 0; i <= 10; i++) interpolador.receber('t1', { t: 1000 + i * 50, x: i * 10, y: 0 }, 1080 + i * 50);
  interpolador.receber('t1', { t: 1000, x: 999, y: 999 }, 1700);
  assert.equal(interpolador.atraso, 80 + 50);
  const meio = interpolador.posicao('t1', 1000 + 125 + 130);
  assert.ok(meio && Math.abs(meio.x - 25) < 1e-6 && !meio.terminou);
  // Sem a posição seguinte, o token segue um intervalo e meio na mesma direção e espera ali.
  const fim = interpolador.posicao('t1', 5000);
  assert.ok(fim && Math.abs(fim.x - 115) < 1e-6 && fim.terminou);
  // A posição de soltar encerra o arrasto: o token para nela.
  interpolador.receber('t1', { t: 1600, x: 104, y: 0, final: true }, 1680);
  const solto = interpolador.posicao('t1', 9000);
  assert.ok(solto && solto.x === 104 && solto.terminou);
  interpolador.esquecer('t1');
  assert.equal(interpolador.posicao('t1', 5000), null);
});

test('interpolador: um pico isolado não segura o desenho e o token nunca recua', () => {
  const interpolador = new Interpolador(0);
  // 30 envios por segundo chegando 80 ms depois; um deles chega 400 ms depois.
  for (let i = 0; i < 60; i++) {
    const t = 1000 + i * 33;
    interpolador.receber('t1', { t, x: i * 10, y: 0 }, t + (i === 30 ? 400 : 80));
  }
  assert.ok(interpolador.atraso < 80 + 33 + 20, `colchão ${interpolador.atraso} ficou preso no pico`);
  // A rede piora de repente (chegadas 300 ms depois): o desenho freia, mas nunca volta.
  const desenhado: number[] = [];
  let agora = 1000 + 59 * 33 + 120;
  for (let quadro = 0; quadro < 90; quadro++, agora += 1000 / 60) {
    const i = 60 + Math.floor(quadro / 2);
    if (quadro % 2 === 0) interpolador.receber('t1', { t: 1000 + i * 33, x: i * 10, y: 0 }, agora + 300);
    const pos = interpolador.posicao('t1', agora);
    if (pos) desenhado.push(pos.x);
  }
  for (let k = 1; k < desenhado.length; k++) assert.ok(desenhado[k] >= desenhado[k - 1] - 1e-9, `recuou no quadro ${k}`);
});

test('interpolador: o relógio do desenho alcança um colchão menor aos poucos, sem salto', () => {
  const interpolador = new Interpolador(0);
  for (let i = 0; i < 30; i++) interpolador.receber('t1', { t: 1000 + i * 33, x: i * 10, y: 0 }, 1000 + i * 33 + 300);
  let agora = 1000 + 29 * 33 + 340;
  let anterior = interpolador.posicao('t1', agora)!.x;
  // A rede melhora: as próximas chegam 60 ms depois. Nenhum quadro pula mais que 10% além do normal.
  for (let i = 30; i < 120; i++) {
    interpolador.receber('t1', { t: 1000 + i * 33, x: i * 10, y: 0 }, 1000 + i * 33 + 60);
    agora += 1000 / 60;
    const x = interpolador.posicao('t1', agora)!.x;
    assert.ok(x - anterior <= (10 / 33) * (1000 / 60) * 1.1 + 1e-6, `pulou ${x - anterior} px num quadro`);
    anterior = x;
  }
});

test('molduras: as cores de Fluxo batem com FLUXO_TEMAS e os nomes batem com o servidor', async () => {
  const { CORES_FLUXO, MOLDURAS } = await import('../../src/pages/Mapa/motor/molduras');
  const { FLUXO_TEMAS } = await import('../../src/services/magiaService');
  for (const [fluxo, cor] of Object.entries(CORES_FLUXO)) {
    assert.equal(cor, FLUXO_TEMAS[fluxo as keyof typeof FLUXO_TEMAS].destaque, fluxo);
  }
  assert.equal(Object.keys(CORES_FLUXO).length, Object.keys(FLUXO_TEMAS).length);
  const { readFileSync } = await import('node:fs');
  const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');
  const base = servidor.match(/MOLDURAS = \(\s*([\s\S]*?)\*\(/)![1].match(/"([a-z-]+)"/g)!.map((m) => m.slice(1, -1));
  const fluxos = servidor.match(/FLUXOS = \(([\s\S]*?)\)/)![1].match(/"([a-z]+)"/g)!.map((m) => `fluxo-${m.slice(1, -1)}`);
  assert.deepEqual(MOLDURAS.map((m) => m.id).sort(), [...base, ...fluxos].sort());
});

test('molduras ilustradas: cada id tem a imagem no disco, escala válida, e nada sobra sem uso', async () => {
  const { readdirSync, existsSync } = await import('node:fs');
  const artes = (await import('../../src/pages/Mapa/motor/molduras-arte.json', { with: { type: 'json' } })).default as Array<{ id: string; rotulo: string; arquivo: string; escala: number }>;
  const pasta = new URL('../../public/assets/img/molduras/', import.meta.url);
  assert.equal(artes.length, 19);
  assert.equal(new Set(artes.map((a) => a.id)).size, artes.length, 'ids únicos');
  for (const arte of artes) {
    assert.match(arte.id, /^arte-[a-z-]+$/);
    assert.ok(arte.id.length <= 40, `${arte.id}: o banco aceita até 40 caracteres`);
    assert.ok(existsSync(new URL(arte.arquivo, pasta)), `${arte.arquivo} existe em public/assets/img/molduras`);
    assert.ok(arte.escala >= 1 && arte.escala <= 1.5, `${arte.id}: escala entre 1 e 1,5`);
    assert.ok(arte.rotulo.trim(), `${arte.id}: tem rótulo`);
    for (const eixo of ['dx', 'dy'] as const) {
      const valor = (arte as unknown as Record<string, number | undefined>)[eixo];
      assert.ok(valor === undefined || Math.abs(valor) <= 0.1, `${arte.id}: ${eixo} é um empurrão pequeno (até 10% da imagem)`);
    }
  }
  assert.deepEqual(readdirSync(pasta).sort(), artes.map((a) => a.arquivo).sort(), 'nenhuma imagem sem uso nem faltando');
});

test('molduras: um id que não existe mais cai no aro simples em vez de sumir', async () => {
  const { desenharMoldura } = await import('../../src/pages/Mapa/motor/molduras');
  let chamadas = 0;
  const ctx = new Proxy({}, {
    get: (_alvo, nome) => (nome === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => { chamadas += 1; }),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  desenharMoldura(ctx, 256, { id: 'moldura-que-saiu', nivel: null, lado: 'jogador' });
  assert.ok(chamadas > 0);
});

test('molduras: "Sem borda" não desenha nada e as outras desenham', async () => {
  const { desenharMoldura } = await import('../../src/pages/Mapa/motor/molduras');
  const tracos = (id: string) => {
    let chamadas = 0;
    const ctx = new Proxy({}, {
      get: (_alvo, nome) => (nome === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => { chamadas += 1; }),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    desenharMoldura(ctx, 256, { id, nivel: null, lado: 'jogador' });
    return chamadas;
  };
  assert.equal(tracos('nenhuma'), 0);
  assert.ok(tracos('lado') > 0);
  assert.ok(tracos('ouro') > 0);
});

test('MODNet recebe lado menor 512 e lados múltiplos de 32', async () => {
  const { tamanhoParaModnet } = await import('../../src/pages/Mapa/oficina/processar');
  assert.deepEqual(tamanhoParaModnet(1000, 869), { largura: 576, altura: 512 });
  assert.deepEqual(tamanhoParaModnet(300, 2000), { largura: 512, altura: 3424 });
});

test('sigla das condições no token', async () => {
  const { siglaDaCondicao } = await import('../../src/pages/Mapa/motor/geometria');
  assert.equal(siglaDaCondicao('caído'), 'Ca');
  assert.equal(siglaDaCondicao(' '), '?');
});

test('névoa: pincel guarda um ponto a cada pedaço do raio e retângulo vale de qualquer canto', async () => {
  const { acrescentarAoTraco, formaDoRetangulo, formaDoTraco, fechaPoligono } = await import('../../src/pages/Mapa/motor/nevoaGeometria');
  const traco = [{ x: 0, y: 0 }];
  assert.equal(acrescentarAoTraco(traco, { x: 10, y: 0 }, 100), false);
  assert.equal(acrescentarAoTraco(traco, { x: 40, y: 0 }, 100), true);
  assert.deepEqual(formaDoTraco('revelar', traco, 1), { op: 'revelar', tipo: 'pincel', raio: 4, pontos: [[0, 0], [40, 0]] });
  assert.deepEqual(formaDoRetangulo('esconder', { x: 300, y: 200 }, { x: 100.04, y: 50 }), { op: 'esconder', tipo: 'retangulo', x: 100, y: 50, w: 200, h: 150 });
  assert.equal(formaDoRetangulo('revelar', { x: 0, y: 0 }, { x: 2, y: 90 }), null);
  const pontos = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  assert.equal(fechaPoligono(pontos, { x: 6, y: 6 }, 1), true);
  assert.equal(fechaPoligono(pontos, { x: 6, y: 6 }, 0.5), true);
  assert.equal(fechaPoligono(pontos, { x: 30, y: 30 }, 1), false);
  assert.equal(fechaPoligono(pontos.slice(0, 2), { x: 0, y: 0 }, 1), false);
});

test('névoa: o jogador pede só os ladrilhos liberados e busca de perto o que a versão reduzida não cobre', async () => {
  const { chavesDoFundo, detalheSempre } = await import('../../src/pages/Mapa/motor/nevoaGeometria');
  const chaves = chavesEsperadas(8000, 6000);
  assert.deepEqual(chavesDoFundo(chaves, null), { chaves: ['n2/0/0', 'n2/0/1', 'n2/1/0', 'n2/1/1'], escala: 4 });
  const liberados = new Set(['n2/0/0', 'n0/0/0', 'n0/4/0']);
  assert.deepEqual(chavesDoFundo(chaves, liberados).chaves, ['n2/0/0']);
  assert.equal(detalheSempre('n0/0/0', liberados), false);
  assert.equal(detalheSempre('n0/4/0', liberados), true);
  assert.equal(detalheSempre('n0/5/0', liberados), false);
  assert.equal(detalheSempre('n0/4/0', null), false);
  const pequeno = chavesEsperadas(800, 600);
  assert.deepEqual(chavesDoFundo(pequeno, new Set()), { chaves: [], escala: 1 });
});

test('clima: os efeitos do painel são os mesmos do servidor', async () => {
  const { EFEITOS_CLIMA: EFEITOS, MAX_EFEITOS_CLIMA: MAX_EFEITOS } = await import('../../src/pages/Mapa/motor/climaCatalogo');
  const { readFileSync } = await import('node:fs');
  const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');
  const tipos = servidor.match(/EFEITOS_CLIMA = \(([^)]*)\)/)![1].match(/"([a-z]+)"/g)!.map((m) => m.slice(1, -1));
  assert.deepEqual(EFEITOS.map((e) => e.id), tipos);
  assert.equal(MAX_EFEITOS, Number(servidor.match(/MAX_EFEITOS_CLIMA = (\d+)/)![1]));
});

test('mapa: a página HTML do proxy no lugar do estado vira erro, para a página tentar de novo', async () => {
  const { mapaApi } = await import('../../src/services/mapaApi');
  const { ApiError, MENSAGEM_RESPOSTA_INCOMPLETA } = await import('../../src/services/apiClient');
  const fetchOriginal = globalThis.fetch;
  // Enquanto a Discloud troca de versão, o proxy responde 200 com uma página de "iniciando".
  globalThis.fetch = async () => new Response('<html>iniciando</html>', { status: 200, headers: { 'content-type': 'text/html' } });
  try {
    await assert.rejects(mapaApi.obter('campanha-teste'), (erro: unknown) => erro instanceof ApiError && erro.message === MENSAGEM_RESPOSTA_INCOMPLETA);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test('névoa viva: o shader do WebGL e o do WebGPU usam os mesmos uniformes e texturas', async () => {
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('../../src/pages/Mapa/motor/nevoa.ts', import.meta.url), 'utf-8');
  const gl = fonte.slice(fonte.indexOf('const FRAGMENTO_GL'), fonte.indexOf('const SHADER_WGSL'));
  const wgsl = fonte.slice(fonte.indexOf('const SHADER_WGSL'), fonte.indexOf('let ruido'));
  const nomes = ['uMascara', 'uMascaraAnterior', 'uRuido', 'uParametros', 'uTamanho', 'uCor', 'uCorFiapo'];
  for (const nome of nomes) {
    assert.ok(new RegExp(`\\b${nome}\\b`).test(gl), `${nome} no GLSL`);
    assert.ok(new RegExp(`\\b${nome}\\b`).test(wgsl), `${nome} no WGSL`);
  }
  // As mesmas amostras de ruído nos dois: um shader não pode ficar com um efeito que o outro não tem.
  const contar = (texto: string, padrao: RegExp) => (texto.match(padrao) ?? []).length;
  assert.equal(contar(gl, /texture\(uRuido/g), contar(wgsl, /textureSample\(uRuido/g));
  assert.equal(contar(gl, /texture\(uMascara/g), contar(wgsl, /textureSample\(uMascara/g));
});

test('medidor: acerta o relógio pela ida e volta mais rápida e separa rede, quem arrasta e suavização', async () => {
  const { Medidor } = await import('../../src/pages/Mapa/medidor');
  const medidor = new Medidor();
  // Este aparelho está 2 s atrasado: o servidor marca 12 000 quando aqui é 10 000.
  medidor.registrarOi(10_000, 10_300, 12_150); // ida e volta lenta (300 ms): estimativa pior
  medidor.registrarOi(11_000, 11_140, 13_070); // 140 ms: esta vale
  assert.equal(medidor.relogio, 2_000);
  assert.equal(medidor.horaDoServidor(20_000), 22_000);
  // O servidor repassou às 22 000 um gesto feito às 21 930 (70 ms até o servidor); chegou aqui às 20 070 (70 ms).
  medidor.registrarMovimento(20_070, 22_000, 21_930);
  // O interpolador desenha 150 ms atrás do relógio local mais a diferença (-2 000 + 70 + 80).
  const resumo = medidor.resumo(20_100, -1_850, 60, true);
  assert.equal(resumo.redeAteVoce, 70);
  assert.equal(resumo.quemMexeAteServidor, 70);
  assert.equal(resumo.suavizacao, 80);
  assert.equal(resumo.atrasoTotal, 220);
  assert.equal(resumo.idaEVolta, 300);
  assert.equal(resumo.movimentosPorSegundo, 1);
  // Sem arrasto chegando há mais de 10 s, a suavização não diz nada.
  assert.equal(medidor.resumo(31_000, -1_850, 60, true).suavizacao, null);
});

test('medidor: recargas e aba escondida contam só o último minuto', async () => {
  const { Medidor } = await import('../../src/pages/Mapa/medidor');
  const medidor = new Medidor();
  medidor.registrarRecarga(1_000, 180);
  medidor.registrarRecarga(2_000, 210);
  medidor.registrarAbaEscondida(3_000);
  let resumo = medidor.resumo(4_000, null, null, false);
  assert.equal(resumo.ultimaRecarga, 210);
  assert.equal(resumo.recargasPorMinuto, 2);
  assert.equal(resumo.abaEscondidaNoMinuto, 1);
  assert.equal(resumo.idaEVolta, null);
  resumo = medidor.resumo(70_000, null, null, true);
  assert.equal(resumo.recargasPorMinuto, 0);
  assert.equal(resumo.abaEscondidaNoMinuto, 0);
});

test('mapa: diferença empurrada troca e tira tokens, segue a ordem e ignora outra cena', async () => {
  const { aplicarDelta } = await import('../../src/pages/Mapa/delta');
  const token = (id: string, x = 0) => ({ id, x, y: 0, porte: 1, lado: 'neutro', nome: id, imagem: null, nivel: null, barras: [], condicoes: [], moldura: 'lado', enquadramento: { zoom: 1, x: 0, y: 0 }, e_meu: false, pode_mover: false, desconhecido: false }) as never;
  const atual = { gestor: false, usuario_id: 'ana', ao_vivo: true, bloqueado: false, cenas: [], cena: { id: 'c1' } as never, tokens: [token('a'), token('b'), token('c')], moldura_mesa: null };
  const novo = aplicarDelta(atual, { cena_id: 'c1', mudar: [token('b', 50), token('d')], tirar: ['a'] });
  assert.deepEqual(novo.tokens.map((t) => `${t.id}${t.x}`), ['b50', 'c0', 'd0']);
  assert.equal(atual.tokens.length, 3, 'o estado de antes não muda');
  const ordenado = aplicarDelta(novo, { cena_id: 'c1', ordem: ['d', 'c', 'b'] });
  assert.deepEqual(ordenado.tokens.map((t) => t.id), ['d', 'c', 'b']);
  const campos = aplicarDelta(novo, { cena_id: 'c1', ao_vivo: false, bloqueado: true });
  assert.equal(campos.ao_vivo, false);
  assert.equal(campos.bloqueado, true);
  assert.equal(campos.tokens, novo.tokens);
  assert.equal(aplicarDelta(novo, { cena_id: 'outra', tirar: ['b'] }), novo);
});

test('nome comprido embaixo do token corta numa palavra inteira; o curto fica como está', () => {
  assert.equal(abreviarNome('Mira'), 'Mira');
  assert.equal(abreviarNome('  Goblin   Batedor '), 'Goblin Batedor');
  assert.equal(abreviarNome('Guardião da Ponte de Khazad'), 'Guardião da Ponte…');
  assert.equal(abreviarNome('Anciãcorrompidadovazio'), 'Anciãcorrompidado…');
  assert.ok(abreviarNome('Senhora das Marés Que Não Dormem').length <= 18);
});

test('o nome do token cresce de longe para ter 11 px na tela e some só quando o token mal se vê', () => {
  // De perto (zoom 1) a letra de 12 px já passa de 11 px: tamanho normal.
  assert.equal(escalaDoNome(12, 1), 1);
  assert.equal(escalaDoNome(12, 2), 1);
  // Zoom 0,3: 12 px viram 3,6 px de tela; a escala leva a 11 px.
  assert.ok(Math.abs(escalaDoNome(12, 0.3) - 11 / 3.6) < 1e-9);
  // Muito longe não cresce sem fim.
  assert.equal(escalaDoNome(8, 0.04), 6);
  // Entrada torta não quebra a conta.
  assert.equal(escalaDoNome(0, 1), 1);
  assert.equal(escalaDoNome(12, 0), 1);
  assert.equal(escalaDoNome(12, Number.NaN), 1);
  // Token de 100 px: com zoom 0,3 tem 30 px na tela, o nome aparece; com 0,1 tem 10 px, só com o mouse em cima ou escolhido.
  assert.equal(nomeVisivel(100, 0.3, false), true);
  assert.equal(nomeVisivel(100, 0.1, false), false);
  assert.equal(nomeVisivel(100, 0.1, true), true);
});
