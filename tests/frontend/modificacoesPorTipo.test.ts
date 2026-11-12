import assert from 'node:assert/strict';
import test from 'node:test';

import catalogo from '../../data/loja/catalogo.json' with { type: 'json' };
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import {
  CATEGORIAS_MODIFICACAO,
  MODIFICACOES_EQUIPAMENTO,
  PRECO_MODIFICACAO_POR_VALOR,
} from '../../data/regras/raridadesEquipamentos';
import { aceitaModificacao } from '../../src/services/alvosDeModificacao';
import { resumirSanidadeDosImplantes } from '../../src/services/implantesService';
import { requisitosEstruturados } from '../../tools/sincronizar-modificacoes.mjs';

// Pedido do Pedro (2026-11-12): mais modificações, únicas e interessantes, para
// cada tipo de item da Loja. Veio junto o grupo de Implantes.

const naLoja = (catalogo as any).entradas.filter((entrada: any) => entrada.tipo === 'modificacao');

test('todo tipo de item tem um leque de modificações, e o grupo de Implantes existe', () => {
  assert.deepEqual(CATEGORIAS_MODIFICACAO.map((categoria) => categoria.id), ['arma', 'armadura', 'escudo', 'item', 'implante']);
  for (const { id } of CATEGORIAS_MODIFICACAO) {
    const daCategoria = MODIFICACOES_EQUIPAMENTO.filter((modificacao) => modificacao.categoria === id);
    assert.ok(daCategoria.length >= 8, `${id}: só ${daCategoria.length}`);
    // Cada grupo tem peça técnica, comum e marcial para o jogador escolher pelo bolso.
    for (const valor of [0, 1, 2, 3]) assert.ok(daCategoria.some((modificacao) => modificacao.valor === valor), `${id}: falta valor ${valor}`);
  }
  assert.equal(new Set(MODIFICACOES_EQUIPAMENTO.map((modificacao) => modificacao.id)).size, MODIFICACOES_EQUIPAMENTO.length);
});

test('a Loja vende exatamente as modificações das regras, com preço pela faixa de valor', () => {
  assert.equal(naLoja.length, MODIFICACOES_EQUIPAMENTO.length);
  const porId = new Map(naLoja.map((entrada: any) => [entrada.conteudo.modificacao_id, entrada]));
  const rotulo = Object.fromEntries(CATEGORIAS_MODIFICACAO.map(({ id, titulo }) => [id, titulo]));
  for (const modificacao of MODIFICACOES_EQUIPAMENTO) {
    const entrada: any = porId.get(modificacao.id);
    assert.ok(entrada, `${modificacao.id} fora da Loja`);
    assert.equal(entrada.conteudo.aplicacao, rotulo[modificacao.categoria]);
    assert.equal(entrada.conteudo.valor_efeito, modificacao.valor);
    assert.deepEqual(entrada.conteudo.preco, { Lunaris: PRECO_MODIFICACAO_POR_VALOR[modificacao.valor as 0 | 1 | 2 | 3] });
    // Valor 2 e 3 só existem como marcial; técnica e valor 1 são comuns.
    assert.equal(modificacao.nivel, modificacao.valor >= 2 ? 'marcial' : 'comum', modificacao.id);
  }
});

test('as modificações novas seguem o tom e as marciais pedem pré-requisito', () => {
  const novas = MODIFICACOES_EQUIPAMENTO.slice(63);
  assert.equal(novas.length, 52);
  for (const modificacao of novas) {
    assert.doesNotMatch(modificacao.efeito, /—|\beco\b/, `${modificacao.id}: tom`);
    if (modificacao.nivel === 'marcial') assert.ok(modificacao.preRequisito, `${modificacao.id}: marcial sem pré-requisito`);
  }
  assert.deepEqual(requisitosEstruturados('Constituição 14 e nível total 10'), [
    { atributo: 'constituicao', valor_minimo: 14 },
    { nivel_personagem: 10 },
  ]);
  const pluma = naLoja.find((entrada: any) => entrada.id === 'mod-pluma');
  assert.deepEqual(pluma.conteudo.efeitos, [{ id: 'mod-pluma-movimento', categoria: 'combate', alvo: 'movimento', modo: 'bonus', valor: 1.5 }]);
});

test('a compra só oferece o item que aceita a modificação', () => {
  const espada = { dados: { categoria: 'arma' } };
  const peitoral = { titulo: 'Peitoral', dados: { categoria: 'armadura', categoria_protecao: 'armadura' } };
  const escudo = { titulo: 'Broquel', dados: { categoria: 'armadura', categoria_protecao: 'escudo' } };
  const olho = { dados: { categoria: 'implante' } };
  const corda = { dados: { categoria: 'geral' } };
  assert.deepEqual([espada, peitoral, escudo, olho, corda].map((item) => aceitaModificacao('Armas', item)), [true, false, false, false, false]);
  assert.deepEqual([espada, peitoral, escudo, olho, corda].map((item) => aceitaModificacao('Armaduras', item)), [false, true, false, false, false]);
  assert.deepEqual([espada, peitoral, escudo, olho, corda].map((item) => aceitaModificacao('Escudos', item)), [false, false, true, false, false]);
  assert.deepEqual([espada, peitoral, escudo, olho, corda].map((item) => aceitaModificacao('Implantes', item)), [false, false, false, true, false]);
  assert.deepEqual([espada, peitoral, escudo, olho, corda].map((item) => aceitaModificacao('Itens gerais e mágicos', item)), [true, true, true, false, true]);
});

test('o Amortecedor Neural baixa o custo de Sanidade do implante em que está', () => {
  const comAmortecedor = {
    item_id: 'braco',
    dados: {
      tipo: 'implante', categoria: 'implante', equipado: true, custoSanidade: 7,
      modificacoes: [{ id: 'x', nome: 'Amortecedor Neural', catalogo_item_id: 'mod-amortecedor-neural' }],
    },
  };
  const barato = { item_id: 'relogio', dados: { tipo: 'implante', equipado: true, custoSanidade: 2, modificacoes: [{ nome: 'Amortecedor Neural' }] } };
  assert.deepEqual(resumirSanidadeDosImplantes([comAmortecedor, barato], {}).implantes.map((item) => item.cobrado), [4, 1]);
});

test('o Livro lista o grupo de Implantes e as novas', () => {
  const corpo = String(REGRAS_OFICIAIS['modificacoes-equipamentos'].corpo);
  assert.match(corpo, /<summary>Implantes <span/);
  for (const titulo of ['Ceifadora', 'Fortaleza Viva', 'Égide', 'Ampulheta', 'Amortecedor Neural']) assert.ok(corpo.includes(`<strong>${titulo}</strong>`), titulo);
});
