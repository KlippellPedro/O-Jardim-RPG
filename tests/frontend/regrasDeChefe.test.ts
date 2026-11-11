import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { MAXIMO_DE_FASES, paraFormulario, paraServidor } from '../../src/pages/Sessao/fasesNoFormulario';

test('fase do Bestiário vai e volta do formulário sem perder nada', () => {
  const fases = [{ nome: 'Meia-Noite', quando: 0.5, rodada: 4, anuncio: 'O relógio para.', mudancas: ['+2 no dano', 'Voa'] }];
  assert.deepEqual(paraServidor(paraFormulario(fases)), fases);
});

test('o formulário vira o que o servidor aceita', () => {
  const enviadas = paraServidor([
    { nome: '  O Luto ', vida: '30', rodada: '', anuncio: ' Ele chora. ', mudancas: 'Ataca duas vezes\n\n  Sem reação  \n' },
    { nome: '', vida: '50', rodada: '', anuncio: '', mudancas: '' },
    { nome: 'Sem gatilho', vida: '0', rodada: '1', anuncio: '', mudancas: '' },
    { nome: 'Fora da faixa', vida: '100', rodada: '120', anuncio: '', mudancas: '' },
  ]);
  assert.deepEqual(enviadas.map((fase) => fase.nome), ['O Luto', 'Sem gatilho', 'Fora da faixa'], 'fase sem nome fica de fora');
  assert.equal(enviadas[0].quando, 0.3);
  assert.equal(enviadas[0].rodada, null);
  assert.equal(enviadas[0].anuncio, 'Ele chora.');
  assert.deepEqual(enviadas[0].mudancas, ['Ataca duas vezes', 'Sem reação']);
  assert.equal(enviadas[1].quando, null, 'Vida 0% não é gatilho');
  assert.equal(enviadas[1].rodada, null, 'a rodada 1 é o começo da luta');
  assert.equal(enviadas[2].quando, null);
  assert.equal(enviadas[2].rodada, null);
});

test('no máximo seis fases e seis mudanças por fase', () => {
  const muitas = Array.from({ length: 9 }, (_, indice) => ({
    nome: `Fase ${indice}`, vida: '', rodada: '', anuncio: '', mudancas: 'a\nb\nc\nd\ne\nf\ng\nh',
  }));
  const enviadas = paraServidor(muitas);
  assert.equal(enviadas.length, MAXIMO_DE_FASES);
  assert.equal(enviadas[0].mudancas.length, 6);
});

test('a Determinação e o covil nunca saem do bloco do Mestre no servidor', () => {
  // O jogador vê Ímpeto e Guarda; o resto do estado do chefe só vai para quem comanda.
  const fonte = readFileSync(new URL('../../plataforma/routers/sessions.py', import.meta.url), 'utf8');
  const bloco = fonte.slice(fonte.indexOf('chefe = regras_de_chefe.chefe_limpo(item["chefe"])'), fonte.indexOf('publico["chefe"] = visivel'));
  const doMestre = bloco.slice(bloco.indexOf('if manda:'));
  for (const campo of ['determinacao=', 'covil=']) {
    assert.ok(bloco.includes(campo), `${campo} sumiu do servidor`);
    assert.ok(doMestre.includes(campo), `${campo} tem que ficar dentro do if manda`);
  }
  assert.ok(fonte.includes('publico["fases_editaveis"] = fases') && /if manda and not item\["personagem_id"\]:\s+# O editor de fases/.test(fonte),
    'as fases inteiras só vão para quem comanda');
});
