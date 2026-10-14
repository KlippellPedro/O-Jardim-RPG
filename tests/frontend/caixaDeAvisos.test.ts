import assert from 'node:assert/strict';
import test from 'node:test';
import {
  agruparPorDia, destinoDoAviso, ehPendencia, grupoDoDia, horaDoAviso, partirNegrito, rotuloDaCategoria,
} from '../../src/components/caixaDeAvisos/regrasDaCaixa';
import type { IAviso } from '../../src/services/avisosApi';

// Terça-feira, 13 de outubro de 2026, 15:00 no fuso local do teste.
const AGORA = new Date(2026, 9, 13, 15, 0, 0);
const em = (dia: number, hora = 10, minuto = 30) => new Date(2026, 9, dia, hora, minuto, 0).toISOString();

const aviso = (parcial: Partial<IAviso>): IAviso => ({
  id: 'id',
  campanha_id: null,
  campanha_nome: null,
  categoria: 'campanha',
  painel: 'geral',
  titulo: 'Titulo',
  mensagem: '',
  dados: {},
  lida_em: null,
  criado_em: em(13),
  ...parcial,
});

test('o dia do aviso: hoje, ontem, esta semana e mais antigos', () => {
  assert.equal(grupoDoDia(em(13, 0, 5), AGORA), 'hoje');
  assert.equal(grupoDoDia(em(12, 23, 59), AGORA), 'ontem');
  assert.equal(grupoDoDia(em(8), AGORA), 'semana');
  assert.equal(grupoDoDia(em(6), AGORA), 'antes');
  assert.equal(grupoDoDia(new Date(2026, 8, 24).toISOString(), AGORA), 'antes');
});

test('data estranha vai para os mais antigos e relogio adiantado conta como hoje', () => {
  assert.equal(grupoDoDia('nao e data', AGORA), 'antes');
  assert.equal(grupoDoDia(em(14, 9), AGORA), 'hoje');
});

test('agrupa mantendo a ordem recebida e esconde os blocos vazios', () => {
  const lista = [
    aviso({ id: 'a', criado_em: em(13, 14) }),
    aviso({ id: 'b', criado_em: em(13, 9) }),
    aviso({ id: 'c', criado_em: em(2) }),
    aviso({ id: 'd', criado_em: em(12, 20) }),
  ];
  const grupos = agruparPorDia(lista, AGORA);
  assert.deepEqual(grupos.map((grupo) => grupo.rotulo), ['Hoje', 'Ontem', 'Mais antigos']);
  assert.deepEqual(grupos[0].avisos.map((item) => item.id), ['a', 'b']);
  assert.deepEqual(agruparPorDia([], AGORA), []);
});

test('hora do aviso: so a hora para hoje e ontem, a data para o resto', () => {
  assert.match(horaDoAviso(em(13, 9, 5), AGORA), /^09:05$/);
  assert.match(horaDoAviso(em(12, 18, 40), AGORA), /^18:40$/);
  assert.match(horaDoAviso(em(2), AGORA), /^2 de out\.?$/);
  assert.match(horaDoAviso(new Date(2025, 11, 24).toISOString(), AGORA), /2025/);
  assert.equal(horaDoAviso('lixo', AGORA), '');
});

test('o servidor marca o destaque com dois asteriscos e a tela quebra em pedacos, sem HTML', () => {
  assert.deepEqual(partirNegrito('**Bela** recebeu 3x **Pocao**.'), [
    { texto: 'Bela', negrito: true },
    { texto: ' recebeu 3x ', negrito: false },
    { texto: 'Pocao', negrito: true },
    { texto: '.', negrito: false },
  ]);
  assert.deepEqual(partirNegrito('sem destaque'), [{ texto: 'sem destaque', negrito: false }]);
  assert.deepEqual(partirNegrito('<b>nao vira html</b>'), [{ texto: '<b>nao vira html</b>', negrito: false }]);
  assert.deepEqual(partirNegrito(''), []);
});

test('rotulo da categoria, com fallback para categoria nova', () => {
  assert.equal(rotuloDaCategoria('economia'), 'Economia');
  assert.equal(rotuloDaCategoria('sessao'), 'Sessão');
  assert.equal(rotuloDaCategoria('novidade'), 'Novidade');
});

test('reivindicacao de recompensa sem resposta e fila do Mestre, nao recado', () => {
  assert.equal(ehPendencia(aviso({ dados: { tipo: 'claim_recompensa', status: 'pendente' } })), true);
  assert.equal(ehPendencia(aviso({ dados: { tipo: 'claim_recompensa', status: 'aprovada' } })), false);
  assert.equal(ehPendencia(aviso({ dados: { status: 'pendente' } })), false);
  assert.equal(ehPendencia(aviso({ dados: null })), false);
});

test('um aviso so ganha atalho quando o lugar e obvio', () => {
  const claim = aviso({ painel: 'mestre', titulo: 'Reivindicacao de Recompensa', categoria: 'economia', dados: { tipo: 'claim_recompensa', status: 'pendente' } });
  assert.deepEqual(destinoDoAviso(claim), { rotulo: 'Resolver na Loja', caminho: '/loja' });

  assert.equal(destinoDoAviso(aviso({ painel: 'mestre', titulo: 'Arty entrou na campanha' }))?.caminho, '/mestre?aba=mesa');
  for (const titulo of ['Alerta de Regras na Ficha', 'Alerta de Regras na Criação', 'Jogador alterou classe/XP na ficha', 'Personagem entrou num patamar novo']) {
    assert.equal(destinoDoAviso(aviso({ painel: 'mestre', titulo }))?.caminho, '/mestre?aba=personagens', titulo);
  }
  assert.equal(destinoDoAviso(aviso({ painel: 'mestre', titulo: 'Infração na loja: Bela' }))?.caminho, '/mestre?aba=logs');
  assert.equal(destinoDoAviso(aviso({ painel: 'mestre', titulo: 'Outra coisa do Mestre' })), null);

  assert.equal(destinoDoAviso(aviso({ painel: 'admin', titulo: 'Pedido de senha nova', categoria: 'conta' }))?.caminho, '/admin?aba=pedidos');
  assert.equal(destinoDoAviso(aviso({ painel: 'admin', titulo: 'Outro aviso', categoria: 'conta' })), null);

  assert.equal(destinoDoAviso(aviso({ titulo: 'Recompensa nova no seu cofre', categoria: 'economia' }))?.caminho, '/cofre');
  assert.equal(destinoDoAviso(aviso({ titulo: 'A sessão começou', categoria: 'sessao' }))?.caminho, '/sessao');
  assert.equal(destinoDoAviso(aviso({ titulo: 'A sessão está chegando', categoria: 'sessao' }))?.caminho, '/sessao');
  assert.equal(destinoDoAviso(aviso({ titulo: 'Você saiu de Mesa Antiga' })), null);
});

test('mesmo titulo parecido com o do cofre nao leva ao cofre se for de outro painel', () => {
  assert.equal(destinoDoAviso(aviso({ painel: 'mestre', titulo: 'Recompensa nova no seu cofre', categoria: 'economia' })), null);
});
