import assert from 'node:assert/strict';
import test from 'node:test';

import catalogo from '../../data/loja/catalogo.json' with { type: 'json' };
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import {
  CUSTO_SANIDADE_EXTRA_NEURAL,
  CUSTO_SANIDADE_POR_RARIDADE,
  custoSanidadeDoImplante,
  faixaDaSanidade,
  resumirSanidadeDosImplantes,
} from '../../src/services/implantesService';
import { resumirEquipamentos } from '../../src/services/equipamentoService';
import { sanidadeAtualDaFicha, sanidadeMaximaDaFicha } from '../../src/services/sanidadeDaFichaService';

// Pedido do Pedro (2026-11-12): instalar implante tira Sanidade máxima, e
// quanto mais forte a peça, mais tira. Mais tipos de implante vieram junto.

const implantesDoCatalogo = (catalogo as any).entradas.filter((item: any) => item.tipo === 'implante');

const noInventario = (id: string, dados: Record<string, unknown>, equipado = true) => ({
  item_id: id,
  titulo: id,
  quantidade: 1,
  dados: { tipo: 'implante', categoria: 'implante', equipado, ...dados },
});

test('a peça cobra pela raridade, e a neural cobra a mais', () => {
  assert.deepEqual(CUSTO_SANIDADE_POR_RARIDADE, { comum: 2, incomum: 4, raro: 7, epico: 12, lendario: 18, 'reliquia da criacao': 25 });
  assert.equal(custoSanidadeDoImplante({ raridade: 'raro' }), 7);
  assert.equal(custoSanidadeDoImplante({ raridade: 'épico', sistema: 'neural' }), 12 + CUSTO_SANIDADE_EXTRA_NEURAL);
  assert.equal(custoSanidadeDoImplante({ raridade: 'lendario', custoSanidade: 9 }), 9, 'o valor do catálogo manda');
  // Peça comprada antes do campo existir cai na tabela pela raridade.
  assert.equal(custoSanidadeDoImplante(noInventario('velha', { raridade: 'incomum' })), 4);
  assert.equal(custoSanidadeDoImplante({}), 7, 'sem raridade, cobra como Raro');
});

test('todo implante do catálogo tem sistema, custo e as etiquetas que a Loja mostra', () => {
  assert.ok(implantesDoCatalogo.length >= 60);
  implantesDoCatalogo.forEach((item: any) => {
    const { sistema, custoSanidade, atributos, raridade } = item.conteudo;
    assert.ok(['neural', 'sentidos', 'membros', 'orgaos', 'pele-e-esqueleto'].includes(sistema), `${item.id}: sistema ${sistema}`);
    assert.ok(Number.isInteger(custoSanidade) && custoSanidade > 0, `${item.id}: custo ${custoSanidade}`);
    if (item.id !== 'implante-ancora-de-identidade') {
      assert.equal(custoSanidade, custoSanidadeDoImplante({ raridade, sistema }), `${item.id}: custo fora da tabela`);
    }
    assert.ok(atributos.includes(`Sanidade máxima −${custoSanidade}`), `${item.id}: sem etiqueta de Sanidade`);
    assert.ok(atributos.some((atributo: string) => atributo.startsWith('Sistema: ')), `${item.id}: sem etiqueta de sistema`);
    assert.doesNotMatch(item.conteudo.descricao, /—|\beco\b/, `${item.id}: tom do texto`);
  });
  // Quanto mais forte, mais cobra: a média sobe a cada raridade.
  const media = (raridade: string) => {
    const lista = implantesDoCatalogo.filter((item: any) => item.conteudo.raridade === raridade && item.conteudo.sistema !== 'neural');
    return lista.reduce((soma: number, item: any) => soma + item.conteudo.custoSanidade, 0) / lista.length;
  };
  const escada = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'reliquia da criacao'].map(media);
  escada.slice(1).forEach((valor, indice) => assert.ok(valor > escada[indice], `${valor} não passa de ${escada[indice]}`));
});

test('os implantes novos cobrem todas as raridades e os cinco sistemas', () => {
  const novos = [
    'relogio-subcutaneo', 'lanterna-ocular', 'tatuagem-viva', 'tendoes-trancados', 'glandula-coagulante', 'palmas-magneticas',
    'chip-de-idioma', 'laminas-de-antebraco', 'filtro-de-dor', 'bateria-muscular', 'pele-refratora', 'coracao-reserva',
    'mira-sinaptica', 'projetor-de-silhueta', 'ancora-de-identidade', 'cortex-paralelo', 'exoesqueleto-de-guerra',
  ].map((id) => implantesDoCatalogo.find((item: any) => item.id === `implante-${id}`));
  assert.ok(novos.every(Boolean), 'implante novo sumiu');
  assert.deepEqual(new Set(novos.map((item: any) => item.conteudo.raridade)), new Set(['comum', 'incomum', 'raro', 'epico', 'lendario']));
  assert.equal(new Set(novos.map((item: any) => item.conteudo.sistema)).size, 5);
});

test('só o que está instalado cobra; a Âncora alivia as outras e o Autômato paga metade', () => {
  const inventario = [
    noInventario('braco', { raridade: 'raro', custoSanidade: 7 }),
    noInventario('mira', { raridade: 'epico', custoSanidade: 15 }),
    noInventario('guardado', { raridade: 'lendario', custoSanidade: 18 }, false),
  ];
  assert.equal(resumirSanidadeDosImplantes(inventario, { racaId: 'humano' }).total, 22);

  const comAncora = [...inventario, noInventario('ancora', { raridade: 'epico', custoSanidade: 6, aliviaSanidade: 2 })];
  const resumo = resumirSanidadeDosImplantes(comAncora, { racaId: 'humano' });
  assert.deepEqual(resumo.implantes.map((item) => item.cobrado), [5, 13, 6], 'a Âncora não alivia a si mesma');
  const pecaBarata = [noInventario('relogio', { custoSanidade: 2 }), noInventario('ancora', { custoSanidade: 6, aliviaSanidade: 2 })];
  assert.equal(resumirSanidadeDosImplantes(pecaBarata, {}).implantes[0].cobrado, 1, 'nunca abaixo de 1');
  const duasAncoras = [noInventario('a1', { custoSanidade: 6, aliviaSanidade: 2 }), noInventario('a2', { custoSanidade: 6, aliviaSanidade: 2 }), noInventario('braco', { custoSanidade: 7 })];
  assert.equal(resumirSanidadeDosImplantes(duasAncoras, {}).implantes[2].cobrado, 5, 'duas âncoras não somam');

  assert.equal(resumirSanidadeDosImplantes(inventario, { racaId: 'automato' }).total, 4 + 8, 'metade, arredondada para cima');
});

test('a ficha desconta da Sanidade máxima e corta a atual no teto novo', () => {
  const personagem = {
    ficha: { racaId: 'humano', status: { sanidadeMaxima: 100, sanidadeAtual: 95 } },
    inventarioCentral: [
      noInventario('braco', { raridade: 'raro', custoSanidade: 7 }),
      noInventario('mira', { raridade: 'epico', custoSanidade: 15 }),
    ],
  };
  const efeitos = resumirEquipamentos(personagem.inventarioCentral, personagem.ficha).bonusRecursos;
  assert.equal(efeitos.sanidadeMaxima, -22);
  assert.equal(sanidadeMaximaDaFicha(personagem), 78);
  assert.equal(sanidadeAtualDaFicha(personagem), 78, 'a atual não passa do teto');
  assert.equal(faixaDaSanidade(78), 'Estável');
  assert.equal(faixaDaSanidade(60), 'Abalado');
  assert.equal(faixaDaSanidade(40), 'Enlouquecendo');
  assert.equal(faixaDaSanidade(10), 'Ruptura');

  const lotado = { ...personagem, inventarioCentral: Array.from({ length: 6 }, (_, i) => noInventario(`r${i}`, { custoSanidade: 25 })) };
  assert.equal(sanidadeMaximaDaFicha(lotado), 1, 'a máxima para em 1');
});

test('o Livro explica o custo com a mesma tabela da ficha', () => {
  const corpo = String(REGRAS_OFICIAIS['frutos-implantes'].corpo);
  assert.match(corpo, /O preço na mente/);
  Object.values(CUSTO_SANIDADE_POR_RARIDADE).forEach((custo) => {
    assert.ok(corpo.includes(`<td>−${custo}</td><td>−${custo + CUSTO_SANIDADE_EXTRA_NEURAL}</td>`), `linha de ${custo}`);
  });
  assert.doesNotMatch(corpo, /—/);
  assert.match(String(REGRAS_OFICIAIS['frutos-implantes'].corpoMestre), /freio do implante/);
});
