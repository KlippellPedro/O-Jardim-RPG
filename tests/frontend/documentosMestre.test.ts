import assert from 'node:assert/strict';
import test from 'node:test';

import {
  camposParaSalvar, itensDaLista, limparTextos, nomeDoArquivo, quebrarEmLinhas, segmentarTarjas, tituloSugerido, valoresComPadrao,
} from '../../src/pages/Mestre/documentos/modelo';
import { MODELOS, ORDEM_DAS_CATEGORIAS, modeloPorId } from '../../src/pages/Mestre/documentos/modelos/index';

// Medida falsa e previsível: cada letra vale 10 px.
const medir = (texto: string) => texto.length * 10;
const texto = (linha: { palavras: Array<{ texto: string }> }) => linha.palavras.map((palavra) => palavra.texto).join(' ');

test('quebra o texto em linhas que cabem e respeita os parágrafos', () => {
  const linhas = quebrarEmLinhas('um dois tres quatro\n\ncinco', 110, medir);
  assert.deepEqual(linhas.map(texto), ['um dois', 'tres quatro', '', 'cinco']);
  assert.deepEqual(linhas.map((linha) => linha.fimDeParagrafo), [false, true, true, true]);
});

test('palavra maior que a linha é cortada por letra, sem vazar', () => {
  const linhas = quebrarEmLinhas('abcdefghijkl', 50, medir);
  assert.deepEqual(linhas.map(texto), ['abcde', 'fghij', 'kl']);
  assert.ok(linhas.every((linha) => medir(texto(linha)) <= 50));
});

test('trecho entre colchetes duplos sai marcado como tarja, palavra por palavra', () => {
  assert.deepEqual(segmentarTarjas('viu [[o rosto]] dele'), [
    { texto: 'viu ', tarja: false },
    { texto: 'o rosto', tarja: true },
    { texto: ' dele', tarja: false },
  ]);
  assert.deepEqual(segmentarTarjas('[[]] nada'), [{ texto: ' nada', tarja: false }]);
  const [linha] = quebrarEmLinhas('viu [[o rosto]] dele', 1000, medir);
  assert.deepEqual(linha.palavras.map((palavra) => palavra.tarja), [false, true, true, false]);
});

test('cláusulas saem uma por linha, sem numeração repetida e sem linha vazia', () => {
  assert.deepEqual(itensDaLista('1. Primeira\n\n2) Segunda\n- Terceira\n  quarta  '), ['Primeira', 'Segunda', 'Terceira', 'quarta']);
});

test('valores salvos ganham do exemplo, e campo novo do modelo aparece com o exemplo', () => {
  const procurado = modeloPorId('procurado');
  assert.ok(procurado);
  const valores = valoresComPadrao(procurado, { nome: 'Lia', acusacao: '', marca: 'opcao-que-nao-existe', sobra: 'x' });
  assert.equal(valores.nome, 'Lia');
  assert.equal(valores.acusacao, '', 'campo apagado de propósito continua vazio');
  assert.equal(valores.marca, 'nenhum', 'escolha desconhecida volta ao padrão');
  assert.equal(valores.titulo, 'Procurado');
  assert.ok(!('sobra' in camposParaSalvar(procurado, { ...valores, sobra: 'x' })), 'sobra de modelo antigo não vai ao servidor');
  const limpos = limparTextos(procurado, valores);
  assert.equal(limpos.nome, '');
  assert.equal(limpos.papel, valores.papel, 'escolha não é texto e fica');
});

test('nome do documento e do arquivo', () => {
  const procurado = modeloPorId('procurado')!;
  assert.equal(tituloSugerido(procurado, { nome: '  Corvo  de [[Três]] Dedos ' }), 'Cartaz de procurado: Corvo de Três Dedos');
  assert.equal(tituloSugerido(procurado, { nome: '' }), 'Cartaz de procurado');
  assert.equal(nomeDoArquivo('Cartaz de procurado: Corvo de Três Dedos'), 'cartaz-de-procurado-corvo-de-tres-dedos.png');
  assert.equal(nomeDoArquivo('???'), 'documento.png');
});

test('os modelos estão completos e batem com o que o servidor aceita', () => {
  const ids = new Set<string>();
  for (const modelo of MODELOS) {
    assert.match(modelo.id, /^[a-z0-9][a-z0-9-]{0,47}$/, `${modelo.id}: id no formato de core/documentos.py`);
    assert.ok(!ids.has(modelo.id), `${modelo.id} repetido`);
    ids.add(modelo.id);
    assert.ok(ORDEM_DAS_CATEGORIAS.includes(modelo.categoria), `${modelo.id}: categoria fora da lista`);
    assert.ok(modelo.campos.length <= 40, `${modelo.id}: o servidor guarda até 40 campos`);
    assert.ok(modelo.largura > 0 && modelo.altura > 0 && modelo.impressao.largura > 0 && modelo.impressao.altura > 0);
    const proporcao = (modelo.largura / modelo.altura) / (modelo.impressao.largura / modelo.impressao.altura);
    assert.ok(Math.abs(proporcao - 1) < 0.03, `${modelo.id}: o desenho e a peça impressa têm a mesma proporção`);
    const campos = new Set<string>();
    for (const campo of modelo.campos) {
      assert.match(campo.id, /^[A-Za-z][A-Za-z0-9_]{0,39}$/, `${modelo.id}.${campo.id}: chave no formato do servidor`);
      assert.ok(!campos.has(campo.id), `${modelo.id}.${campo.id} repetido`);
      campos.add(campo.id);
      if (campo.tipo === 'escolha') {
        assert.ok(campo.opcoes?.some((opcao) => opcao.valor === campo.padrao), `${modelo.id}.${campo.id}: padrão fora das opções`);
      }
      if (campo.tipo === 'imagem') assert.equal(campo.padrao, '', `${modelo.id}.${campo.id}: imagem começa vazia`);
      if (campo.maximo && campo.tipo !== 'imagem') {
        assert.ok(campo.padrao.length <= campo.maximo, `${modelo.id}.${campo.id}: exemplo maior que o limite do campo`);
      }
    }
    assert.ok(campos.has(modelo.campoDoTitulo), `${modelo.id}: campoDoTitulo aponta para campo que não existe`);
  }
});

test('o texto de exemplo segue o tom do Jardim: sem travessão e sem "eco"', () => {
  for (const modelo of MODELOS) {
    const textos = [modelo.nome, modelo.descricao, ...modelo.campos.flatMap((campo) => [
      campo.rotulo, campo.padrao, campo.dica ?? '', ...(campo.opcoes ?? []).map((opcao) => opcao.rotulo),
    ])];
    for (const trecho of textos) {
      assert.ok(!/[—–]/.test(trecho), `${modelo.id}: travessão em "${trecho.slice(0, 50)}"`);
      assert.ok(!/(?<!\p{L})ecos?(?!\p{L})/iu.test(trecho), `${modelo.id}: "eco" em "${trecho.slice(0, 50)}"`);
      assert.ok(!/(?<!\p{L})não é [^.;:!?]{1,80}?[,:;] (?:e sim |mas )?é(?!\p{L})/iu.test(trecho), `${modelo.id}: antítese em "${trecho.slice(0, 50)}"`);
    }
  }
});
