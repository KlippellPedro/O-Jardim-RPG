import assert from 'node:assert/strict';
import test from 'node:test';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes';
import { CATALOGO_AFLICOES } from '../../data/regras/aflicoes';
import {
  buscarOpcoes, cartaDaAflicao, cartaDaCondicao, cartaDoEstado, chaveDoEstado, opcoesDeEstado, textoDaDuracao,
} from '../../src/pages/Mapa/motor/estadosToken';

test('a carta da condição traz efeitos, duração e como acabar do catálogo, sem depender de acento ou caixa', () => {
  const carta = cartaDaCondicao('caido', 2);
  const regra = CONDICOES_OFICIAIS.find((c) => c.id === 'caido')!;
  assert.equal(carta.titulo, 'Caído');
  assert.equal(carta.tom, 'ruim');
  assert.deepEqual(carta.blocos.find((b) => b.rotulo === 'Efeitos')?.linhas, regra.efeitos);
  assert.deepEqual(carta.blocos.find((b) => b.rotulo === 'Duração')?.linhas, [regra.duracao, 'Restam 2 rodadas.']);
  assert.deepEqual(carta.blocos.find((b) => b.rotulo === 'Como acabar')?.linhas, [regra.remocao]);
  assert.match(carta.rota ?? '', /^\/regras\?topico=condicoes/);
});

test('condição positiva tem tom de bom e condição escrita pelo Mestre vira carta simples', () => {
  assert.equal(cartaDaCondicao('Inspirado').tom, 'bom');
  const livre = cartaDaCondicao('Abençoado pela chuva');
  assert.equal(livre.conhecida, false);
  assert.equal(livre.tom, 'livre');
  assert.equal(livre.rota, null);
  assert.equal(livre.chip, 'Abençoado pela chuva');
});

test('a carta da aflição mostra o estágio atual, o teste e o tratamento, e avisa ao Mestre quando incuba', () => {
  const aflicao = CATALOGO_AFLICOES[0];
  const carta = cartaDaAflicao(aflicao.id, 2);
  assert.equal(carta.tom, 'aflicao');
  assert.deepEqual(carta.blocos[0].linhas, aflicao.estagios.find((e) => e.numero === 2)!.efeitos);
  assert.match(carta.blocos.map((b) => b.rotulo).join('|'), /Tratamento/);
  assert.match(carta.blocos.find((b) => b.rotulo === 'A cada intervalo')!.linhas[0], new RegExp(`DT ${aflicao.dtFortitude}`));
  assert.equal(carta.chip, `${aflicao.titulo} 2`);
  assert.equal(cartaDaAflicao(aflicao.id, 1, true).blocos[0].rotulo, 'Só o Mestre vê');
  assert.equal(cartaDaAflicao('nao-existe', 1).conhecida, false);
});

test('cartaDoEstado escolhe a carta certa e a chave junta condição pelo catálogo', () => {
  assert.equal(cartaDoEstado({ tipo: 'condicao', nome: 'Caído', turnos: null }).titulo, 'Caído');
  assert.equal(cartaDoEstado({ tipo: 'aflicao', id: CATALOGO_AFLICOES[0].id, estagio: 1 }).titulo, CATALOGO_AFLICOES[0].titulo);
  assert.equal(chaveDoEstado({ tipo: 'condicao', nome: 'CAIDO', turnos: null }), 'condicao:caido');
  assert.equal(chaveDoEstado({ tipo: 'aflicao', id: 'x', estagio: 1 }), 'aflicao:x');
});

test('duração: sem prazo não diz nada, uma rodada é a próxima', () => {
  assert.equal(textoDaDuracao(null), null);
  assert.equal(textoDaDuracao(1), 'Acaba na próxima rodada.');
  assert.equal(textoDaDuracao(4), 'Restam 4 rodadas.');
});

test('o seletor do Mestre lista condições, longo prazo e aflições, busca sem acento e esconde o que o token já tem', () => {
  const todas = opcoesDeEstado();
  const tipos = new Set(todas.map((o) => o.tipo));
  assert.deepEqual([...tipos].sort(), ['aflicao', 'condicao']);
  assert.equal(new Set(todas.map((o) => o.chave)).size, todas.length, 'cada opção tem chave única');
  assert.ok(todas.length >= CONDICOES_OFICIAIS.length + CATALOGO_AFLICOES.length);
  const achados = buscarOpcoes(todas, 'caido', new Set());
  assert.ok(achados.some((o) => o.titulo === 'Caído'));
  assert.ok(!buscarOpcoes(todas, 'caido', new Set(['condicao:caido'])).some((o) => o.titulo === 'Caído'));
  assert.equal(buscarOpcoes(todas, '', new Set(), 5).length, 5);
});
