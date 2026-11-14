import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import {
  FAIXAS,
  OFICIOS,
  faixaDoOficio,
  kitSugerido,
  kitValido,
  linhaDeRenda,
  obterFaixa,
  obterOficio,
  oficioDaFicha,
  pedidoDoKit,
  podeAcrescentar,
  raridadeNoKit,
  rendaDoTrabalho,
  vinculosIniciais,
} from '../../src/services/oficios';
import { confiancaDoVinculo, normalizarVinculos } from '../../src/pages/Ficha/utils/vinculos';
import type { LojaCatalogEntry } from '../../src/services/lojaApi';

// Ofício na criação (data/economia/oficios-v1.json): a faixa decide Lunaris,
// itens, renda e contatos. O servidor confere de novo em plataforma/core/oficios.py.
const catalogo = JSON.parse(readFileSync('data/loja/catalogo.json', 'utf8')).entradas as Array<{ id: string; tipo: string; titulo: string; conteudo: Record<string, unknown> }>;
const comoDaApi = new Map<string, LojaCatalogEntry>(catalogo.map((item) => [item.id, { ...item, preco: { moeda: 'Lunaris', valor: 1 } }]));

test('sem ofício a ficha cai na faixa de aprendiz, que é a regra antiga', () => {
  const faixa = faixaDoOficio(null);
  assert.equal(faixa.id, 'aprendiz');
  assert.equal(faixa.lunaris_iniciais, 20);
  assert.deepEqual(faixa.itens, { comum: 1, incomum: 0 });
  assert.equal(faixaDoOficio({ id: 'personalizado', titulo: 'Coveiro', faixa: 'artesao' }).id, 'artesao');
  assert.equal(oficioDaFicha({ id: 'personalizado', titulo: '', faixa: 'artesao' }), null);
  assert.deepEqual(oficioDaFicha({ id: 'ferreiro' }), { id: 'ferreiro', titulo: 'Ferreiro', faixa: 'artesao' });
});

test('quem ganha mais começa com mais, e a carteira recebe só a sobra do dia', () => {
  const lunaris = FAIXAS.map((faixa) => faixa.lunaris_iniciais);
  assert.deepEqual(lunaris, [...lunaris].sort((a, b) => a - b));
  assert.deepEqual(FAIXAS.map((faixa) => faixa.por_dia), [5, 5, 10, 25, 65]);
  // Trabalhar paga o custo de vida e sobra pouco: cerca de um quinto do ganho.
  assert.deepEqual(FAIXAS.map((faixa) => faixa.sobra_por_dia), [1, 1, 2, 5, 13]);
  FAIXAS.forEach((faixa) => assert.equal(faixa.sobra_por_dia, Math.max(1, Math.round(faixa.por_dia / 5)), faixa.id));
  assert.equal(rendaDoTrabalho(obterFaixa('artesao'), 30), 150);
  assert.equal(rendaDoTrabalho(obterFaixa('especialista'), 2), 26);
  assert.equal(rendaDoTrabalho(obterFaixa('trabalhador'), -3), 0);
});

test('a renda cheia pede o grau da tabela numa perícia do ofício', () => {
  const medico = { id: 'medico', titulo: 'Médico', faixa: 'especialista' };
  assert.equal(linhaDeRenda(medico, {}).faixa.id, 'aprendiz', 'sem Cura nem Conhecimento, só o serviço de baixo');
  assert.equal(linhaDeRenda(medico, { cura: 'aprendiz' }).faixa.id, 'trabalhador');
  assert.equal(linhaDeRenda(medico, { conhecimento: 'treinado' }).faixa.id, 'artesao');
  const cheio = linhaDeRenda(medico, { cura: 'especialista', luta: 'mestre' });
  assert.equal(cheio.faixa.id, 'especialista');
  assert.equal(cheio.falta, null);
  const nivel1 = linhaDeRenda(medico, { cura: 'aprendiz' });
  assert.equal(nivel1.teto.id, 'especialista');
  assert.deepEqual(nivel1.falta, { grau: 'especialista', rotulo: 'Especialista', pericias: ['Cura', 'Conhecimento'] });
  assert.equal(linhaDeRenda(medico, { luta: 'mestre' }).faixa.id, 'aprendiz', 'grau em perícia fora do ofício não conta');
  // Quem vem da rua e o aprendiz não pedem grau.
  assert.equal(linhaDeRenda({ id: 'pedinte' }, {}).faixa.id, 'rua');
  assert.equal(linhaDeRenda({ id: 'criado' }, {}).faixa.id, 'aprendiz');
  assert.equal(linhaDeRenda(null, {}).faixa.id, 'aprendiz');
  // Ofício escrito pela pessoa: conta o maior grau da ficha.
  assert.equal(linhaDeRenda({ id: 'personalizado', titulo: 'Coveiro', faixa: 'artesao' }, { atletismo: 'treinado' }).faixa.id, 'artesao');
});

test('o kit não aceita item que a Loja não venderia a um personagem de nível 1', () => {
  const aco = comoDaApi.get('aco')!;
  assert.equal(aco.conteudo.requisitoNivel, 5);
  assert.equal(raridadeNoKit(aco), null, 'Armadura de Aço pede nível 5');
  assert.equal(raridadeNoKit(comoDaApi.get('algemas')!), 'incomum');
  for (const oficio of OFICIOS) {
    for (const item of oficio.itens) {
      if (typeof item !== 'string') continue;
      assert.ok(comoDaApi.get(item) && raridadeNoKit(comoDaApi.get(item)!), `${oficio.id} sugere ${item}, que não cabe no kit`);
    }
  }
});

test('o kit sugerido de todo ofício sai inteiro e válido do catálogo real', () => {
  for (const oficio of OFICIOS) {
    const faixa = obterFaixa(oficio.faixa);
    const kit = kitSugerido(oficio, faixa, comoDaApi);
    assert.ok(kit.length >= 1, oficio.id);
    assert.ok(kitValido(faixa, kit), oficio.id);
    if (faixa.itens.incomum) assert.ok(kit.some((escolha) => escolha.raridade === 'incomum'), `${oficio.id} usa a vaga de incomum`);
  }
});

test('a arma vem da API com raridade de encomenda e o kit lê a raridade nativa', () => {
  const espada = comoDaApi.get('espada-curta')!;
  assert.equal(raridadeNoKit({ ...espada, conteudo: { ...espada.conteudo, raridade: 'comum', raridade_catalogo_original: 'comum' } }), 'comum');
  const longa = comoDaApi.get('espada-longa')!;
  assert.equal(raridadeNoKit(longa), null, 'patamar 2 fica de fora');
  assert.equal(raridadeNoKit({ tipo: 'monstro', conteudo: { raridade: 'comum' } }), null);
});

test('vaga de incomum aceita comum, e o contrário não', () => {
  const especialista = obterFaixa('especialista');
  const tres = [{ titulo: 'Faca', raridade: 'comum' as const }, { titulo: 'Corda', raridade: 'comum' as const }];
  assert.ok(podeAcrescentar(especialista, tres, 'comum'));
  const cheio = [...tres, { titulo: 'Pá', raridade: 'comum' as const }];
  assert.ok(kitValido(especialista, cheio));
  assert.ok(!podeAcrescentar(especialista, cheio, 'incomum'));
  const trabalhador = obterFaixa('trabalhador');
  assert.ok(!podeAcrescentar(trabalhador, [], 'incomum'));
  assert.deepEqual(pedidoDoKit([{ itemId: 'faca', titulo: 'Faca de Caça', raridade: 'comum' }, { titulo: ' Pá ', raridade: 'comum' }]), [
    { item_id: 'faca', titulo: 'Faca de Caça', quantidade: 1 },
    { titulo: 'Pá', quantidade: 1 },
  ]);
});

test('os contatos nascem nos Vínculos com a Confiança da faixa', () => {
  const rua = vinculosIniciais(obterOficio('pedinte'), obterFaixa('rua'), 'Pedinte', 1);
  const salvos = normalizarVinculos(rua);
  assert.equal(salvos.length, 2);
  assert.ok(salvos.every((vinculo) => vinculo.tipo === 'contato' && confiancaDoVinculo(vinculo.afinidade) === 2));
  assert.deepEqual(salvos.map((vinculo) => vinculo.ramo), ['informacao', 'protecao']);

  const medico = normalizarVinculos(vinculosIniciais(obterOficio('medico'), obterFaixa('especialista'), 'Médico', 1));
  assert.equal(medico.length, 2);
  assert.equal(confiancaDoVinculo(medico[0].afinidade), 1);
  assert.equal(medico[1].tipo, 'divida');
});

test('o Livro mostra a tabela de faixas tirada do mesmo arquivo', () => {
  const corpo = REGRAS_OFICIAIS['criacao-personagem'].corpo;
  for (const faixa of FAIXAS) {
    assert.match(corpo, new RegExp(`${faixa.titulo}[\\s\\S]{0,400}${faixa.lunaris_iniciais} Lunaris`));
  }
  for (const oficio of OFICIOS) assert.ok(corpo.includes(oficio.titulo), oficio.titulo);
  assert.doesNotMatch(corpo, /—/, 'texto do jogador sem travessão');
});
