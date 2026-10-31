import assert from 'node:assert/strict';
import test from 'node:test';
import { FAIXAS_DE_MORAL, resolverMoral } from '../../data/regras/moral';
import {
  ARMADILHAS_PRONTAS,
  DADOS_MAXIMOS_DE_QUEDA,
  LINHAS_DE_ARMADILHA,
  PESOS_DE_ARMADILHA,
  TERRENOS_DE_BUSCA,
  custoDeFolego,
  dadosDeQueda,
  dadosParaMedia,
  danoDeClima,
  diasDeFolgaSemComida,
  dtDeSufocar,
  grauEfetivoDeClima,
  pessoasAlimentadas,
} from '../../data/regras/perigosAmbiente';
import { mediaDeDados } from '../../src/services/referenciaBalanceamento';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes';
import { REGRA_AFLICOES } from '../../data/regras/aflicoes';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import catalogoLoja from '../../data/loja/catalogo.json';

test('queda: 1d6 a cada 3 m, nada abaixo de 3 m e teto de 20d6', () => {
  assert.equal(dadosDeQueda(2), 0);
  assert.equal(dadosDeQueda(3), 1);
  assert.equal(dadosDeQueda(12), 4);
  assert.equal(dadosDeQueda(59), 19);
  assert.equal(dadosDeQueda(500), DADOS_MAXIMOS_DE_QUEDA);
  assert.equal(dadosDeQueda(Number.NaN), 0);
});

test('fôlego: tanque cheio dura dez rodadas, esforço dobra e surpresa triplica a primeira', () => {
  assert.equal(custoDeFolego(30), 3);
  assert.equal(Math.floor(30 / custoDeFolego(30)), 10);
  assert.equal(custoDeFolego(30, { esforco: true }), 6);
  assert.equal(custoDeFolego(30, { surpresa: true }), 9);
  // Estamina pequena ainda paga pelo menos 1 por rodada.
  assert.equal(custoDeFolego(4), 1);
  assert.equal(dtDeSufocar(1), 10);
  assert.equal(dtDeSufocar(4), 16);
});

test('fome e sede: folga pela Constituição e busca que alimenta por margem', () => {
  assert.equal(diasDeFolgaSemComida(0), 3);
  assert.equal(diasDeFolgaSemComida(3), 6);
  assert.equal(diasDeFolgaSemComida(-5), 1);
  assert.equal(pessoasAlimentadas(14, 15), 0);
  assert.equal(pessoasAlimentadas(15, 15), 1);
  assert.equal(pessoasAlimentadas(24, 15), 2);
  assert.equal(pessoasAlimentadas(25, 15), 3);
  assert.deepEqual(TERRENOS_DE_BUSCA.map((terreno) => terreno.dt), [10, 15, 20, 25]);
});

test('clima: roupa só anula o Severo, Traje desce um grau e abrigo suspende tudo', () => {
  assert.equal(grauEfetivoDeClima('severo', { roupaCerta: true }), null);
  assert.equal(grauEfetivoDeClima('extremo', { roupaCerta: true }), 'extremo');
  assert.equal(grauEfetivoDeClima('extremo', { traje: true }), 'severo');
  assert.equal(grauEfetivoDeClima('mortal', { traje: true }), 'extremo');
  assert.equal(grauEfetivoDeClima('severo', { traje: true }), null);
  assert.equal(grauEfetivoDeClima('mortal', { abrigo: true }), null);
  assert.equal(danoDeClima('severo', 80), 0);
  assert.equal(danoDeClima('extremo', 80), 8);
  assert.equal(danoDeClima('mortal', 80), 20);
});

test('o Traje que o clima cita existe na Loja com Resistência a Frio ou Calor', () => {
  const nomes = ['Traje', 'Ração de viagem', 'Kit de Aventureiro', 'Kit de Pesca e Forrageamento', 'Kit de Ferramentas', 'Armadilha de Corda e Sino'];
  nomes.forEach((nome) => {
    assert.ok(catalogoLoja.entradas.some((item: any) => item.titulo === nome), `a página cita "${nome}", que não está na Loja`);
  });
  const traje = catalogoLoja.entradas.find((item: any) => item.titulo === 'Traje') as any;
  assert.match(String(traje.conteudo?.descricao ?? ''), /Resistência \d+ contra Frio ou Calor/);
});

test('armadilhas: o dano segue a fração da Vida média do nível e cresce com ele', () => {
  const pesos = PESOS_DE_ARMADILHA.map((peso) => peso.fracaoDaVida);
  assert.deepEqual(pesos, [...pesos].sort((a, b) => a - b), 'os pesos precisam subir de Leve a Mortal');

  let anterior = 0;
  LINHAS_DE_ARMADILHA.forEach((linha) => {
    PESOS_DE_ARMADILHA.forEach((peso) => {
      const media = mediaDeDados(linha.dano[peso.id]) ?? 0;
      const alvo = linha.vidaMedia * peso.fracaoDaVida;
      // Arredondar para dados inteiros erra pouco: no nível 1 a Vida é tão
      // pequena que até 1d4 passa do alvo, então a folga mínima é de 3 pontos.
      assert.ok(Math.abs(media - alvo) <= Math.max(3, alvo * 0.25), `nível ${linha.nivel}, ${peso.titulo}: ${linha.dano[peso.id]} longe de ${alvo.toFixed(1)}`);
    });
    const mortal = mediaDeDados(linha.dano.mortal) ?? 0;
    assert.ok(mortal >= anterior, `nível ${linha.nivel}: a armadilha Mortal ficou mais fraca que a do nível anterior`);
    anterior = mortal;
    assert.equal(linha.dtDificil, linha.dtPadrao + 5);
  });
  assert.equal(dadosParaMedia(2), '1d4');
  assert.equal(dadosParaMedia(35), '10d6');
  assert.equal(dadosParaMedia(130), '20d12');
});

test('as armadilhas prontas cobrem 1d6 e citam condições e aflições que existem', () => {
  assert.deepEqual(ARMADILHAS_PRONTAS.map((item) => item.d6), [1, 2, 3, 4, 5, 6]);
  const condicoes = CONDICOES_OFICIAIS.map((condicao) => condicao.titulo);
  ['Caído', 'Imobilizado', 'Enjoado', 'Inconsciente'].forEach((titulo) => assert.ok(condicoes.includes(titulo), `${titulo} sumiu das condições`));
  const corpoAflicoes = REGRA_AFLICOES.corpo;
  ['Toxina Paralisante', 'Néctar Sonífero'].forEach((aflicao) => assert.ok(corpoAflicoes.includes(aflicao), `${aflicao} sumiu das aflições`));
});

test('moral: 2d6 com ajustes cai em desiste, vacila ou segura', () => {
  assert.equal(resolverMoral(5).resultado, 'desiste');
  assert.equal(resolverMoral(6).resultado, 'vacila');
  assert.equal(resolverMoral(8).resultado, 'vacila');
  assert.equal(resolverMoral(9).resultado, 'segura');
  assert.equal(resolverMoral(7, 2).resultado, 'segura');
  assert.equal(resolverMoral(7, -2).resultado, 'desiste');
  assert.equal(resolverMoral(2, -4).resultado, 'desiste');
  assert.equal(FAIXAS_DE_MORAL.length, 3);
});

test('a moral mora no Combate e o Perigos do Ambiente fica no capítulo de Combate', () => {
  assert.match(REGRAS_OFICIAIS.combate.corpo, /<h3 class="regras-subtitle">Quando o inimigo desiste<\/h3>/);
  assert.match(REGRAS_OFICIAIS.combate.corpoMestre || '', /Moral sem dado/);
  const perigos = REGRAS_OFICIAIS.perigos;
  assert.equal(perigos.categoria, 'Combate e Mecânicas');
  ['Queda', 'Fôlego', 'Fome e sede', 'Clima', 'Armadilhas'].forEach((secao) => {
    assert.match(perigos.corpo, new RegExp(`<h3 class="regras-subtitle">${secao}</h3>`));
  });
  assert.doesNotMatch(perigos.corpo, /Calibrar armadilha/, 'a calibragem é do Mestre e mora no corpoMestre');
});
