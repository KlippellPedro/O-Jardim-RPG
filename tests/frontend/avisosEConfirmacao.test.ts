import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LIMITE_DE_AVISOS,
  adicionarAviso,
  avisar,
  dispensarAviso,
  duracaoPadrao,
  inscreverAvisos,
  lerAvisos,
  limparAvisos,
  mensagemDeErro,
  notificar,
  type Aviso,
} from '../../src/components/avisos/avisos';
import {
  cancelarConfirmacoes,
  confirmar,
  escolher,
  inscreverConfirmacoes,
  normalizarPedido,
  pedidoAtual,
  responderConfirmacao,
} from '../../src/components/avisos/confirmacao';

const aviso = (extra: Partial<Aviso>): Aviso => ({
  id: 1,
  chave: 'k',
  tipo: 'info',
  texto: 't',
  duracaoMs: 5000,
  repeticoes: 0,
  versao: 1,
  ...extra,
});

test('o mesmo aviso (mesma chave) não empilha, só conta mais uma vez', () => {
  const primeiro = aviso({ id: 7, chave: 'salvar', texto: 'Erro ao salvar', versao: 1 });
  const lista = adicionarAviso([primeiro], aviso({ id: 8, chave: 'salvar', texto: 'Erro ao salvar', versao: 2 }));
  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, 7, 'guarda o id de quem já estava na tela');
  assert.equal(lista[0].repeticoes, 1);
  assert.equal(lista[0].versao, 2, 'a versão nova faz o relógio recomeçar');
});

test('passou do limite, sai o aviso mais antigo', () => {
  let lista: Aviso[] = [];
  for (let i = 1; i <= LIMITE_DE_AVISOS + 2; i += 1) {
    lista = adicionarAviso(lista, aviso({ id: i, chave: `k${i}`, texto: `t${i}` }));
  }
  assert.equal(lista.length, LIMITE_DE_AVISOS);
  assert.deepEqual(lista.map((item) => item.id), [3, 4, 5, 6]);
});

test('avisos com botão ficam mais tempo na tela, para dar tempo de usar o Desfazer', () => {
  assert.equal(duracaoPadrao('sucesso', false), 4000);
  assert.ok(duracaoPadrao('sucesso', true) >= 9000);
  assert.equal(duracaoPadrao('erro', false), 9000);
});

test('notificar entrega o aviso a quem escuta, dedupe pela chave e dispensar tira da lista', () => {
  limparAvisos();
  let chamadas = 0;
  const parar = inscreverAvisos(() => { chamadas += 1; });
  const id = avisar.erro('Não foi possível salvar.');
  const repetido = avisar.erro('Não foi possível salvar.');
  assert.equal(repetido, id, 'o aviso repetido devolve o id do que já estava');
  assert.equal(lerAvisos().length, 1);
  assert.equal(lerAvisos()[0].repeticoes, 1);
  assert.equal(lerAvisos()[0].tipo, 'erro');
  dispensarAviso(id);
  assert.equal(lerAvisos().length, 0);
  assert.ok(chamadas >= 3);
  parar();
  limparAvisos();
});

test('o snapshot só muda quando a lista muda (precisa disso para o useSyncExternalStore)', () => {
  limparAvisos();
  const vazio = lerAvisos();
  limparAvisos();
  assert.equal(lerAvisos(), vazio);
  const id = notificar({ texto: 'oi', tipo: 'info' });
  const comUm = lerAvisos();
  assert.notEqual(comUm, vazio);
  dispensarAviso(9999);
  assert.equal(lerAvisos(), comUm, 'dispensar um id que não existe não mexe na lista');
  dispensarAviso(id);
  limparAvisos();
});

test('o aviso leva o botão de desfazer e a chave própria', () => {
  limparAvisos();
  let desfeito = false;
  notificar({ texto: 'Ataque excluído.', chave: 'ataque:1', acao: { rotulo: 'Desfazer', aoClicar: () => { desfeito = true; } } });
  const [item] = lerAvisos();
  assert.equal(item.chave, 'ataque:1');
  assert.equal(item.acao?.rotulo, 'Desfazer');
  void item.acao?.aoClicar();
  assert.equal(desfeito, true);
  limparAvisos();
});

test('mensagemDeErro usa o texto do erro e cai no padrão quando não há texto', () => {
  assert.equal(mensagemDeErro(new Error('  Sem munição.  '), 'padrão'), 'Sem munição.');
  assert.equal(mensagemDeErro('falhou', 'padrão'), 'falhou');
  assert.equal(mensagemDeErro({ message: 'do servidor' }, 'padrão'), 'do servidor');
  assert.equal(mensagemDeErro(new Error(''), 'padrão'), 'padrão');
  assert.equal(mensagemDeErro(undefined, 'padrão'), 'padrão');
  assert.equal(mensagemDeErro({ message: 42 }, 'padrão'), 'padrão');
});

test('confirmar devolve true só quando a pessoa confirma', async () => {
  cancelarConfirmacoes();
  const promessa = confirmar({ mensagem: 'Apagar a nota?', tom: 'perigo', rotuloConfirmar: 'Apagar' });
  const pedido = pedidoAtual();
  assert.ok(pedido);
  assert.equal(pedido.tom, 'perigo');
  assert.equal(pedido.rotuloConfirmar, 'Apagar');
  assert.equal(pedido.rotuloCancelar, 'Cancelar');
  responderConfirmacao(pedido.id, 'confirmar');
  assert.equal(await promessa, true);
  assert.equal(pedidoAtual(), null);

  const outra = confirmar('Continuar?');
  responderConfirmacao(pedidoAtual()!.id, 'cancelar');
  assert.equal(await outra, false);
});

test('escolher devolve qual botão foi usado, inclusive a terceira saída', async () => {
  cancelarConfirmacoes();
  const promessa = escolher({ mensagem: 'A fila não está ordenada.', alternativa: { rotulo: 'Começar assim' } });
  const pedido = pedidoAtual()!;
  assert.equal(pedido.alternativa?.rotulo, 'Começar assim');
  responderConfirmacao(pedido.id, 'alternativa');
  assert.equal(await promessa, 'alternativa');
});

test('pedidos que chegam juntos esperam na fila, um de cada vez', async () => {
  cancelarConfirmacoes();
  const primeira = confirmar('Primeira?');
  const segunda = confirmar('Segunda?');
  assert.equal(pedidoAtual()?.mensagem, 'Primeira?');
  responderConfirmacao(pedidoAtual()!.id, 'confirmar');
  assert.equal(await primeira, true);
  assert.equal(pedidoAtual()?.mensagem, 'Segunda?');
  responderConfirmacao(pedidoAtual()!.id, 'cancelar');
  assert.equal(await segunda, false);
});

test('trocar de tela cancela tudo que estava aberto, sem deixar promessa pendurada', async () => {
  cancelarConfirmacoes();
  const a = confirmar('A?');
  const b = escolher('B?');
  cancelarConfirmacoes();
  assert.equal(await a, false);
  assert.equal(await b, 'cancelar');
  assert.equal(pedidoAtual(), null);
});

test('responder a um pedido que já saiu não quebra nada', () => {
  cancelarConfirmacoes();
  responderConfirmacao(123456, 'confirmar');
  assert.equal(pedidoAtual(), null);
});

test('quem escuta as confirmações é avisado ao entrar e ao sair um pedido', async () => {
  cancelarConfirmacoes();
  let chamadas = 0;
  const parar = inscreverConfirmacoes(() => { chamadas += 1; });
  const promessa = confirmar('Oi?');
  responderConfirmacao(pedidoAtual()!.id, 'confirmar');
  await promessa;
  assert.equal(chamadas, 2);
  parar();
});

test('os textos padrão de uma confirmação', () => {
  const pedido = normalizarPedido('Tem certeza?');
  assert.equal(pedido.titulo, 'Confirmar');
  assert.equal(pedido.mensagem, 'Tem certeza?');
  assert.equal(pedido.rotuloConfirmar, 'Confirmar');
  assert.equal(pedido.rotuloCancelar, 'Cancelar');
  assert.equal(pedido.tom, 'padrao');
  assert.equal(pedido.alternativa, undefined);
  assert.equal(normalizarPedido({ mensagem: 'x', titulo: '  ' }).titulo, 'Confirmar');
});
