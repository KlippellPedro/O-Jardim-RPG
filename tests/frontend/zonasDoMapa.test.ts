import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TERRENOS, armadilhaDoLivro, avisoDoGatilho, corDaZona, resumoDaZona, terrenoPorId, textoDaCobertura, zonaNova,
} from '../../src/pages/Mapa/motor/zonasConta.ts';

test('a régua diz a cobertura pelo valor que o Livro de Regras dá', () => {
  assert.equal(textoDaCobertura('parcial'), 'Cobertura parcial: +2 de Defesa');
  assert.equal(textoDaCobertura('superior'), 'Cobertura superior: +5 de Defesa');
  assert.match(textoDaCobertura('total')!, /não pode ser alvo direto/);
  assert.equal(textoDaCobertura(null), 'Sem cobertura no caminho');
  assert.equal(textoDaCobertura(undefined), undefined, 'sem resposta do servidor ainda, a régua não diz nada');
});

test('os terrenos têm cor e uma ideia de mesa, e a lista bate com a do servidor', () => {
  assert.equal(TERRENOS.length, 10);
  for (const terreno of TERRENOS) {
    assert.match(terreno.cor, /^#[0-9a-f]{6}$/i);
    assert.match(terreno.ideia, /^Ideia de mesa:/);
  }
  assert.equal(terrenoPorId('molhado')?.rotulo, 'Molhado');
  assert.equal(terrenoPorId('ouro'), undefined);
});

test('a cor da zona vem do terreno, depois da cobertura, depois do gatilho', () => {
  assert.equal(corDaZona({ terreno: { rotulo: 'lama', visivel: true }, cobertura: 'parcial', gatilho: null }), '#8b6b43');
  assert.equal(corDaZona({ terreno: null, cobertura: 'superior', gatilho: null }), '#f6ad55');
  assert.equal(corDaZona({ terreno: null, cobertura: null, gatilho: null }), '#e879f9');
});

test('o resumo diz o que a zona faz', () => {
  const gatilho = { texto_pisador: '', texto_mesa: '', quem: 'jogadores' as const, uma_vez: true, armadilha: 1 };
  assert.equal(resumoDaZona({ terreno: null, cobertura: 'parcial', gatilho: null }), 'Cobertura parcial +2');
  assert.equal(resumoDaZona({ terreno: { rotulo: 'molhado', visivel: true }, cobertura: null, gatilho }), 'Gatilho: Fosso coberto · Molhado');
  assert.equal(resumoDaZona({ terreno: null, cobertura: null, gatilho: null }), '');
});

test('uma zona nova nasce sem função, com tamanho inteiro e nunca vazia', () => {
  const zona = zonaNova({ x: 10.4, y: 20.6, w: 0.2, h: 99.5 }, 3, 'abc');
  assert.deepEqual([zona.nome, zona.x, zona.y, zona.w, zona.h, zona.cobertura, zona.gatilho, zona.terreno], ['Zona 3', 10, 21, 1, 100, null, null, null]);
});

test('as 6 armadilhas do Livro estão disponíveis e o aviso do Mestre leva o cartão da escolhida', () => {
  for (let numero = 1; numero <= 6; numero++) assert.ok(armadilhaDoLivro(numero)?.regra, `armadilha ${numero}`);
  const aviso = avisoDoGatilho('Ana', 'Laje oca', 1);
  assert.match(aviso, /^Ana pisou em "Laje oca"\. Fosso coberto: /);
  assert.equal(avisoDoGatilho('Ana', 'Sino', null), 'Ana pisou em "Sino".');
});

test('o telhado cobre o jogador até alguém do grupo entrar, e o Mestre enxerga através dele', async () => {
  const { algumDentro, alvoDoTelhado } = await import('../../src/pages/Mapa/motor/zonasConta.ts');
  assert.equal(alvoDoTelhado(false, false), 1);
  assert.equal(alvoDoTelhado(true, false), 0);
  assert.ok(alvoDoTelhado(false, true) < 0.5 && alvoDoTelhado(false, true) > alvoDoTelhado(true, true), 'o Mestre vê o telhado fraco, e mais fraco ainda com o grupo dentro');
  const casa = { x: 100, y: 100, w: 200, h: 100 };
  assert.equal(algumDentro(casa, [{ x: 50, y: 50 }, { x: 150, y: 150 }]), true);
  assert.equal(algumDentro(casa, [{ x: 50, y: 50 }, { x: 301, y: 150 }]), false);
  assert.equal(algumDentro(casa, []), false);
  assert.equal(resumoDaZona({ terreno: null, cobertura: null, gatilho: null, telhado: true }), 'Telhado');
});

test('o traço fixo do Mestre é uma duração à parte e o armazenamento do aparelho a aceita', async () => {
  const { DURACAO_FIXA_MS, DURACOES_DO_TRACO_MS, OPCOES_DE_DESENHO_PADRAO, opcoesDeDesenhoValidas } = await import('../../src/pages/Mapa/motor/tracosConta.ts');
  assert.ok(!(DURACOES_DO_TRACO_MS as readonly number[]).includes(DURACAO_FIXA_MS), 'o fixo não é um dos tempos que o servidor aceita no traço comum');
  assert.equal(opcoesDeDesenhoValidas({ forma: 'seta', duracao: DURACAO_FIXA_MS, privado: false }).duracao, DURACAO_FIXA_MS);
  assert.equal(opcoesDeDesenhoValidas({ duracao: 12345 }).duracao, OPCOES_DE_DESENHO_PADRAO.duracao);
});
