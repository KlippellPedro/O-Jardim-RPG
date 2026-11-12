import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../data/regras/condicoes-longo-prazo';
import { CATALOGO_AFLICOES } from '../../data/regras/aflicoes';
import {
  ID_DO_TERMO,
  SECOES_DAS_MECANICAS,
  ancoraDoTermo,
  dicaDoTermo,
  dividirEmTermos,
  formasDoNome,
  termoPeloNome,
  termosDoJogo,
} from '../../src/services/termosDoJogo';
import { idDaSecao } from '../../src/pages/Regras/secaoDoLivro';

// Pedido do Pedro (2026-11-12): quando um texto cita um efeito ("fica
// Enfraquecido"), o nome leva ao lugar do Livro que explica o efeito, numa guia
// nova, para quem lê não perder onde estava.

const ligados = (texto: string, opcoes = {}) => dividirEmTermos(texto, opcoes)
  .filter((trecho): trecho is Exclude<typeof trecho, string> => typeof trecho !== 'string')
  .map((trecho) => `${trecho.texto}=${trecho.termo.id}`);

test('toda condição, crise de uso seguro, condição de longo prazo e aflição vira termo', () => {
  const ids = new Set(termosDoJogo().map((termo) => termo.id));
  CONDICOES_OFICIAIS.forEach((condicao) => assert.ok(ids.has(ID_DO_TERMO.condicao(condicao.id)), condicao.id));
  CONDICOES_LONGO_PRAZO.forEach((condicao) => assert.ok(ids.has(ID_DO_TERMO.longoPrazo(condicao.id)), condicao.id));
  CATALOGO_AFLICOES.forEach((aflicao) => assert.ok(ids.has(ID_DO_TERMO.aflicao(aflicao.id)), aflicao.id));
  assert.equal(ids.size, termosDoJogo().length, 'id de termo repetido');
});

test('nenhuma grafia aponta para dois termos', () => {
  const dono = new Map<string, string>();
  termosDoJogo().forEach((termo) => termo.formas.forEach((forma) => {
    assert.ok(!dono.has(forma) || dono.get(forma) === termo.id, `"${forma}" é de ${dono.get(forma)} e de ${termo.id}`);
    dono.set(forma, termo.id);
  }));
});

test('cada mecânica aponta para uma seção que existe no tópico do Livro', () => {
  SECOES_DAS_MECANICAS.forEach(({ id, topico, secao }) => {
    const corpo = String(REGRAS_OFICIAIS[topico]?.corpo || '');
    assert.ok(corpo, `${id}: tópico ${topico} não existe`);
    const titulos = [...corpo.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((achado) => achado[1].replace(/<[^>]+>/g, '').trim());
    assert.ok(titulos.includes(secao), `${id}: "${secao}" não é seção de ${topico}`);
  });
  const vantagem = termosDoJogo().find((termo) => termo.id === 'mecanica-vantagem')!;
  assert.equal(vantagem.rota, `/regras?topico=pericias&secao=${idDaSecao('Vantagem e desvantagem')}`);
});

test('condições e aflições levam ao cartão certo do Livro', () => {
  const caido = termoPeloNome('Caído')!;
  assert.equal(caido.rota, `/regras?topico=condicoes&secao=${ancoraDoTermo('condicao-caido')}`);
  assert.equal(termoPeloNome('Toxina Paralisante')?.topico, 'aflicoes');
  // As de longo prazo moram na tabela do tópico Condições; o leitor marca a linha pelo nome.
  const corpo = String(REGRAS_OFICIAIS.condicoes.corpo);
  CONDICOES_LONGO_PRAZO.forEach((condicao) => {
    assert.ok(corpo.includes(`<td><strong>${condicao.titulo}</strong></td>`), `${condicao.titulo} fora da tabela`);
    assert.equal(termoPeloNome(condicao.titulo)?.id, ID_DO_TERMO.longoPrazo(condicao.id));
  });
});

test('só o nome com maiúscula vira link, com gênero e número', () => {
  assert.deepEqual(
    ligados('O alvo fica Caído e Enfraquecida. Um aliado caído no chão não conta, nem um ponto cego.'),
    ['Caído=condicao-caido', 'Enfraquecida=condicao-enfraquecido'],
  );
  assert.deepEqual(formasDoNome('Amedrontado'), ['Amedrontado', 'Amedrontada', 'Amedrontados', 'Amedrontadas']);
  assert.deepEqual(formasDoNome('Invisível'), ['Invisível', 'Invisíveis']);
  assert.deepEqual(formasDoNome('Queimando'), ['Queimando']);
  assert.deepEqual(formasDoNome('Sangramento'), ['Sangramento', 'Sangramentos']);
});

test('cada termo liga só na primeira vez, e o nome mais longo ganha', () => {
  assert.deepEqual(ligados('Caído, Caído e Caído.'), ['Caído=condicao-caido']);
  assert.deepEqual(ligados('Ataques de Pânico pioram o Pânico.'), ['Ataques de Pânico=longo-prazo-ataques-de-panico', 'Pânico=crise-panico']);
  const jaLigados = new Set<string>();
  ligados('fica Caído', { jaLigados });
  assert.deepEqual(ligados('de novo Caído', { jaLigados }), [], 'o bloco lembra o que já ligou');
});

test('as mecânicas ambíguas só ligam no sentido de regra', () => {
  assert.deepEqual(ligados('Ganha Resistência 10 contra Fogo.'), ['Resistência=mecanica-resistencia']);
  assert.deepEqual(ligados('A Resistência do corpo dele impressiona.'), []);
  assert.deepEqual(ligados('Ganha a vantagem do grau Mestre.'), []);
  assert.deepEqual(ligados('Ataca com vantagem.'), ['vantagem=mecanica-vantagem']);
  assert.deepEqual(ligados('O Bloqueio de Fluxo trava a magia.'), []);
  assert.deepEqual(ligados('Fúria toma conta.'), [], 'Fúria também é nome de habilidade');
});

test('o próprio termo e o tópico aberto não viram link', () => {
  assert.deepEqual(ligados('Caído: levante com a Ação de Movimento.', { ignorar: ['condicao-caido'] }), ['Ação de Movimento=mecanica-acao-de-movimento']);
  assert.deepEqual(ligados('Fica Caído. Gaste a Reação.', { topicoAtual: 'combate' }), ['Caído=condicao-caido']);
});

test('as habilidades das classes citam condições que viram link, e o texto para o jogador segue o tom', () => {
  const classes = JSON.parse(fs.readFileSync('data/ficha/classes.json', 'utf8'));
  const textos: string[] = [];
  const coletar = (valor: unknown) => {
    if (Array.isArray(valor)) valor.forEach(coletar);
    else if (valor && typeof valor === 'object') Object.entries(valor).forEach(([chave, item]) => {
      if (chave === 'descricao' && typeof item === 'string') textos.push(item);
      else coletar(item);
    });
  };
  coletar(classes);
  const condicoesCitadas = new Set(textos.flatMap((texto) => ligados(texto)).filter((item) => item.includes('=condicao-')).map((item) => item.split('=')[1]));
  assert.ok(condicoesCitadas.size >= 15, `só ${condicoesCitadas.size} condições ligadas nas classes`);
  termosDoJogo().forEach((termo) => {
    assert.doesNotMatch(termo.resumo, /—/, `${termo.id}: travessão no resumo`);
    assert.match(dicaDoTermo(termo), /guia nova/);
  });
});
