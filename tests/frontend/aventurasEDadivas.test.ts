import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import dadivas from '../../data/regras/dadivas-v1.json';
import { modeloDeCriatura } from '../../src/services/curvaCriatura';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lerJson = (relativo: string) => JSON.parse(readFileSync(path.join(raiz, relativo), 'utf-8'));

type Documento = { arquivo: string; titulo: string; paginas: string[] };
const aventuras = (await import('../../tools/documentos-mundo/aventuras-do-jardim.mjs') as any).AVENTURAS_DO_JARDIM() as Documento[];
const arco = (await import('../../tools/documentos-mundo/arco-da-malha.mjs') as any).arcoDaMalha() as Documento;
const todos = [...aventuras, arco];
const semHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

test('são quatro aventuras novas de quatro páginas, mais o arco de oito', () => {
  assert.deepEqual(aventuras.map((doc) => doc.arquivo), [
    'Aventura-O-Moinho-da-Terceira-Roda', 'Aventura-O-Leilao-da-Casa-Vazia', 'Aventura-O-Redemoinho-de-Caribdis', 'Aventura-A-Queda-do-Leviata-Espelhado',
  ]);
  for (const doc of aventuras) assert.equal(doc.paginas.length, 4, doc.arquivo);
  assert.equal(arco.paginas.length, 8);
  assert.equal(new Set(todos.map((doc) => doc.arquivo)).size, todos.length);
});

test('o texto dos documentos segue o tom do livro', () => {
  for (const doc of todos) {
    const texto = semHtml(doc.paginas.join(' '));
    assert.doesNotMatch(texto, /[—–]/, `${doc.arquivo}: travessão`);
    assert.doesNotMatch(texto, /\beco(s)?\b/i, `${doc.arquivo}: "eco"`);
    assert.doesNotMatch(texto, /não é [^.;:]{1,60}, é /i, `${doc.arquivo}: antítese "não é X, é Y"`);
  }
});

test('toda aventura tem os blocos que o Mestre procura: leitura, relógio, recompensa e rodapé numerado', () => {
  for (const doc of aventuras) {
    const html = doc.paginas.join('\n');
    assert.ok(html.includes('class="leitura"'), `${doc.arquivo}: sem trecho para ler em voz alta`);
    assert.ok(html.includes('class="relogio"'), `${doc.arquivo}: sem relógio de pressão`);
    assert.match(html, /Recompensa, e o que fazer com o tempo/, `${doc.arquivo}: sem recompensa`);
    assert.match(html, /Se faltar tempo/, `${doc.arquivo}: sem corte de tempo`);
    doc.paginas.forEach((pagina, indice) => assert.ok(pagina.includes(`Página ${indice + 1} de 4`), `${doc.arquivo}: rodapé da página ${indice + 1}`));
  }
});

test('as fichas inventadas saem da curva do Bestiário (Vida e Defesa batem com o modelo do VD e do papel)', () => {
  const casos: Array<[string, number, 'lacaio' | 'padrao' | 'elite' | 'chefe', string]> = [
    ['Aventura-O-Moinho-da-Terceira-Roda', 5, 'lacaio', 'comum'],
    ['Aventura-O-Moinho-da-Terceira-Roda', 5, 'elite', 'bruto'],
    ['Aventura-O-Leilao-da-Casa-Vazia', 12, 'padrao', 'comum'],
    ['Aventura-O-Leilao-da-Casa-Vazia', 12, 'elite', 'defensor'],
  ];
  for (const [arquivo, vd, papel, arquetipo] of casos) {
    const modelo = modeloDeCriatura(vd, papel, arquetipo as any);
    const html = (aventuras.find((doc) => doc.arquivo === arquivo) as Documento).paginas.join('\n');
    assert.ok(html.includes(`VD ${vd} · Vida ${modelo.pv} · Defesa ${modelo.defesa}`), `${arquivo}: ${papel} ${arquetipo}`);
  }
  const arcoHtml = arco.paginas.join('\n');
  for (const [vd, papel, arquetipo] of [[48, 'padrao', 'comum'], [50, 'elite', 'defensor'], [55, 'chefe', 'conjurador']] as const) {
    const modelo = modeloDeCriatura(vd, papel, arquetipo);
    assert.ok(arcoHtml.includes(`VD ${vd} · Vida ${modelo.pv} · Defesa ${modelo.defesa}`), `arco: ${papel}`);
  }
});

test('as duas aventuras de criatura única usam a ficha do Bestiário e as fases que a Sessão avisa', () => {
  const catalogo = (lerJson('data/loja/catalogo.json').entradas as Array<{ id: string; conteudo: Record<string, any> }>);
  const caribdis = catalogo.find((entrada) => entrada.id === 'caribdis')!.conteudo;
  const vaelthor = catalogo.find((entrada) => entrada.id === 'vaelthor')!.conteudo;
  const redemoinho = semHtml((aventuras[2] as Documento).paginas.join(' '));
  const leviata = semHtml((aventuras[3] as Documento).paginas.join(' '));
  for (const fase of caribdis.fases) assert.ok(redemoinho.includes(fase.nome), `Caribdis: fase ${fase.nome}`);
  for (const fase of vaelthor.fases) {
    assert.ok(leviata.includes(fase.nome), `Vaelthor: fase ${fase.nome}`);
    assert.ok(leviata.includes(fase.anuncio.replace(/\.$/, '')), `Vaelthor: frase de cena de ${fase.nome}`);
  }
  assert.ok(leviata.includes(`Vida ${vaelthor.pv.toLocaleString('pt-BR')}`) && leviata.includes('VD 45'));
  assert.ok(redemoinho.includes('VD 33'));
  // A queda de Vaelthor é lenda: o texto cita o que a Sessão faz sozinha.
  assert.match(leviata, /Livro da Verdade/);
  assert.match(leviata, /Matador de Vaelthor/);
});

test('os valores em dinheiro das aventuras cabem na verba por sessão do nível', () => {
  const faixas = lerJson('data/economia/escala-precos-v1.json').verba_de_aventura.faixas as Array<{ niveis: string; por_sessao_lunaris: number }>;
  const verba = (nivel: number) => (faixas.find((faixa) => {
    const [inicio, fim] = faixa.niveis.replace('+', '').split('-').map(Number);
    return nivel >= inicio && (faixa.niveis.endsWith('+') || nivel <= fim);
  }) as { por_sessao_lunaris: number }).por_sessao_lunaris;
  const texto = (indice: number) => semHtml((aventuras[indice] as Documento).paginas.join(' '));
  assert.match(texto(0), /30 Lunaris por pessoa/);
  assert.equal(verba(5), 30);
  assert.match(texto(1), /240 Lunaris por pessoa, 480/);
  assert.equal(verba(12), 120, 'o leilão paga o dobro e o dobro do dobro da verba de 120 Lunaris');
  assert.match(texto(2), /400 Solares por pessoa/);
  assert.equal(verba(30) / 100, 200, 'a Companhia paga o dobro da verba de 200 Solares');
  assert.match(texto(3), /1\.200 Solares por pessoa/);
  assert.equal(verba(45) / 100, 600, 'o conselho paga o dobro da verba de 600 Solares');
});

// ------------------------------------------------------------------ o arco

test('o arco só usa o que a lore já escreve de Keryx, da A.X.I.S e de Jota Macedo', () => {
  const lore = JSON.stringify(lerJson('data/mundo/Parley (subjulgado)/parley-axis.json'));
  const texto = semHtml(arco.paginas.join(' '));
  for (const nome of ['Núcleo Zero', 'Astraluna', 'AstraTech', 'Jota Macedo', 'Arkan\'vel', 'A Malha']) {
    assert.ok(lore.includes(nome.replace('A Malha', 'a-malha').replace('Arkan\'vel', 'Arkan\'vel')) || lore.includes(nome), `a lore precisa trazer ${nome}`);
  }
  for (const nome of ['Núcleo Zero', 'Astraluna', 'AstraTech', 'Jota Macedo']) assert.ok(texto.includes(nome), `o arco cita ${nome}`);
  // As regras que a ficha das deidades declara para o arco.
  const deidades = lerJson('data/bestiario/deidades-v1.json').deidades as Array<{ id: string; habilidades: string[] }>;
  const keryx = deidades.find((ficha) => ficha.id === 'deidade-keryx')!;
  assert.ok(keryx.habilidades.some((habilidade) => /Libertá-la pede uma campanha/.test(habilidade)));
  assert.match(texto, /Libertá-la pede uma campanha, e uma cena não basta/);
  assert.match(texto, /quebrar a Malha à mão, ponto por ponto, é o contrajogo mais barato/);
});

test('o arco declara que é só do Mestre em toda página que revela o estado das deidades', () => {
  const reveladoras = arco.paginas.filter((pagina) => /Keryx|A\.X\.I\.S/.test(semHtml(pagina)));
  assert.ok(reveladoras.length >= 6);
  for (const pagina of reveladoras) assert.match(pagina, /Somente Mestre|somente Mestre/);
});

test('há seis Nós, um por ponto da Malha, e a tabela do apêndice bate com as sessões', () => {
  const texto = semHtml(arco.paginas.join(' '));
  for (const rotulo of ['Antena do Largo', 'Nó das Cartas', 'Nó dos Nomes', 'Nó dos Pactos', 'Círculo de Keryx', 'a máscara']) assert.ok(texto.includes(rotulo), rotulo);
  const nosPorSessao = [...(arco.paginas[0].match(/<td>(\d)<\/td><\/tr>/g) ?? [])].map((linha) => Number(linha.replace(/\D/g, '')));
  assert.deepEqual(nosPorSessao, [0, 1, 4, 5, 6], 'a tabela de sessões acumula 0, 1, 4, 5 e 6 Nós');
});

// ------------------------------------------------------------------ dádivas

test('há uma dádiva por Fluxo, e o catálogo de Frutos dos Fluxos cobre os mesmos onze', () => {
  const frutos = (lerJson('data/loja/catalogo.json').entradas as Array<{ id: string; conteudo: Record<string, any> }>)
    .filter((entrada) => entrada.conteudo.subtipo === 'Frutos dos Fluxos').map((entrada) => entrada.conteudo.fluxo).sort();
  assert.equal(dadivas.dadivas.length, 11);
  assert.deepEqual(dadivas.dadivas.map((dadiva) => dadiva.fluxo).sort(), frutos);
  assert.equal(dadivas.dadivas.filter((dadiva) => dadiva.autorizacao_do_mestre).length, 1);
  assert.equal(dadivas.dadivas.find((dadiva) => dadiva.autorizacao_do_mestre)?.fluxo, 'fim');
  assert.deepEqual(dadivas.oferendas.graus.map((grau) => grau.id), ['humilde', 'valiosa', 'preciosa']);
});

test('o texto público das dádivas nunca revela o estado de uma deidade', () => {
  const publico = [
    JSON.stringify(dadivas),
    REGRAS_OFICIAIS['frutos-implantes'].corpo,
  ].join(' ');
  for (const proibido of [/Keryx/i, /Jota/i, /subjug/i, /\bpresa?\b/i, /\bMalha\b/, /paralisad/i, /Núcleo Zero/, /AstraTech/]) {
    assert.doesNotMatch(publico, proibido, `texto público das dádivas cita ${proibido}`);
  }
  const mestre = REGRAS_OFICIAIS['frutos-implantes'].corpoMestre ?? '';
  assert.match(mestre, /Malha da A\.X\.I\.S/, 'o Mestre recebe o que o jogador não recebe');
  assert.match(mestre, /Jota Macedo passa a conhecer o nome/);
});

test('o texto das dádivas segue o tom do livro e a tabela do livro vem do arquivo de dados', () => {
  const corpo = REGRAS_OFICIAIS['frutos-implantes'].corpo;
  for (const dadiva of dadivas.dadivas) {
    const texto = [dadiva.nome, dadiva.gosto, dadiva.bonus, dadiva.uma_vez].join(' ');
    assert.doesNotMatch(texto, /[—–]/, dadiva.fluxo);
    assert.doesNotMatch(texto, /\beco(s)?\b/i, dadiva.fluxo);
    assert.doesNotMatch(texto, /não é [^.;:]{1,60}, é /i, dadiva.fluxo);
    assert.ok(corpo.includes(`<strong>${dadiva.nome}.</strong>`), `o livro precisa trazer ${dadiva.nome}`);
    assert.ok(corpo.includes(dadiva.rotulo_do_fluxo));
  }
  for (const regra of ['Humilde vale um quarto da verba', 'Religião ou Ressonância', 'uma dádiva ativa por vez', 'dádiva ampliada']) assert.ok(corpo.includes(regra), regra);
});

test('as dádivas são pequenas: bônus de +2 ou +3 m, e um efeito de uma vez, sem número solto de dano alto', () => {
  for (const dadiva of dadivas.dadivas) {
    assert.match(dadiva.bonus, /\+2|\+3 m|Vida temporária igual ao seu nível/, `${dadiva.fluxo}: bônus`);
    assert.match(dadiva.uma_vez, /^Uma vez/, `${dadiva.fluxo}: efeito de uma vez`);
    assert.ok(!/\d+d\d+/.test(`${dadiva.bonus} ${dadiva.uma_vez}`), `${dadiva.fluxo}: dado solto`);
  }
});
