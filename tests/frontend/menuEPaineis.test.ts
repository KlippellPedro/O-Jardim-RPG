import assert from 'node:assert/strict';
import test from 'node:test';
import {
  atalhosComRecado, avisosEmOutrasMesas, gerenciaACampanha, montarMenuDaEngrenagem, rotuloDoPapelNaMesa, totalDaEngrenagem,
} from '../../src/components/Settings/menuDaEngrenagem';
import { abaPorTecla, abaValida } from '../../src/components/painel/abas';
import { CONTAGEM_VAZIA, normalizarContagem, type IContagemDeAvisos } from '../../src/services/avisosApi';
import { classeDoPapel, podeCriarCampanha } from '../../src/pages/Campanha/campanha';
import { personagemDoCofre, personagemInicialDoCofre } from '../../src/pages/Cofre/cofre';

const contagem = (parcial: Partial<IContagemDeAvisos> = {}): IContagemDeAvisos => ({ ...CONTAGEM_VAZIA, ...parcial });
const mesa = (id: string, papel: string) => ({ id, papel });
const itensDe = (secoes: ReturnType<typeof montarMenuDaEngrenagem>) => secoes.flatMap((secao) => secao.itens.map((item) => item.id));

// ── Menu da engrenagem ───────────────────────────────────────────────────

test('jogador comum so ve a conta: sem painel de Mestre, Criador ou Administracao', () => {
  const secoes = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'player' }, campanhaAtiva: mesa('a', 'jogador'), avisos: contagem() });
  assert.deepEqual(secoes.map((secao) => secao.id), ['conta']);
  assert.deepEqual(itensDe(secoes), ['conta', 'avisos', 'cofre', 'preferencias']);
});

test('quem comanda a mesa ativa ganha o Painel do Mestre, e assistente tambem', () => {
  for (const papel of ['mestre', 'assistente']) {
    const secoes = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'mestre' }, campanhaAtiva: mesa('a', papel), avisos: contagem() });
    assert.deepEqual(itensDe(secoes), ['conta', 'avisos', 'cofre', 'preferencias', 'mestre']);
  }
  assert.equal(gerenciaACampanha(mesa('a', 'observador')), false);
  assert.equal(gerenciaACampanha(null), false);
});

test('Mestre de uma mesa e jogador em outra: o painel acompanha a mesa ativa', () => {
  const comoJogador = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'mestre' }, campanhaAtiva: mesa('b', 'jogador'), avisos: contagem() });
  assert.equal(itensDe(comoJogador).includes('mestre'), false);
});

test('administracao e criacao so para os cargos da plataforma', () => {
  const admin = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'admin' }, campanhaAtiva: mesa('a', 'jogador'), avisos: contagem() });
  assert.deepEqual(itensDe(admin).slice(-1), ['admin']);
  assert.equal(itensDe(admin).includes('criador'), false);

  const criador = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'criador' }, campanhaAtiva: mesa('a', 'mestre'), avisos: contagem() });
  assert.deepEqual(itensDe(criador).slice(-3), ['mestre', 'criador', 'admin']);
});

test('sem mesa ativa o Cofre some, porque a rota so devolveria a pessoa para a lista de mesas', () => {
  const secoes = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'player' }, campanhaAtiva: null, avisos: contagem() });
  assert.deepEqual(itensDe(secoes), ['conta', 'avisos', 'preferencias']);
});

test('mesas e campanhas nao e mais um item do menu: a mesa mora na pagina da Campanha', () => {
  const secoes = montarMenuDaEngrenagem({ usuario: { papel_plataforma: 'criador' }, campanhaAtiva: mesa('a', 'mestre'), avisos: contagem() });
  const rotulos = secoes.flatMap((secao) => secao.itens.map((item) => item.rotulo.toLowerCase()));
  assert.equal(rotulos.some((rotulo) => rotulo.includes('mesas') || rotulo.includes('campanha')), false);
});

test('cada item mostra o numero do painel dele, e o botao soma tudo que espera a pessoa', () => {
  const avisos = contagem({ geral: 3, mestre: 2, admin: 1, mestre_por_campanha: { a: 2, b: 4 }, total: 10 });
  const entrada = { usuario: { papel_plataforma: 'criador' }, campanhaAtiva: mesa('a', 'mestre'), avisos };
  const secoes = montarMenuDaEngrenagem(entrada);
  const numeros = Object.fromEntries(secoes.flatMap((secao) => secao.itens).map((item) => [item.id, item.contagem ?? 0]));
  assert.deepEqual(numeros, { conta: 0, avisos: 3, cofre: 0, preferencias: 0, mestre: 2, criador: 0, admin: 1 });
  assert.equal(avisosEmOutrasMesas(entrada), 4);
  assert.equal(totalDaEngrenagem(entrada), 3 + 2 + 1 + 4);
});

test('o botao nao conta o que a pessoa nao alcanca', () => {
  // Jogador com restos de aviso de Mestre e de admin no banco: nenhum item do menu os abre.
  const avisos = contagem({ geral: 1, mestre: 5, admin: 2 });
  const total = totalDaEngrenagem({ usuario: { papel_plataforma: 'player' }, campanhaAtiva: mesa('a', 'jogador'), avisos });
  assert.equal(total, 1);
});

test('atalhos aparecem so para o painel com recado novo, levando direto para a aba de avisos', () => {
  const avisos = contagem({ geral: 4, mestre: 2, admin: 0 });
  const atalhos = atalhosComRecado({ usuario: { papel_plataforma: 'criador' }, campanhaAtiva: mesa('a', 'mestre'), avisos });
  assert.deepEqual(atalhos, [{ id: 'mestre', rotulo: 'Painel do Mestre', quantidade: 2, caminho: '/mestre?aba=avisos' }]);
  assert.deepEqual(atalhosComRecado({ usuario: { papel_plataforma: 'player' }, campanhaAtiva: mesa('a', 'jogador'), avisos }), []);
});

test('rotulo do papel na mesa', () => {
  assert.equal(rotuloDoPapelNaMesa(mesa('a', 'assistente')), 'Assistente');
  assert.equal(rotuloDoPapelNaMesa(null), '');
});

// ── Contagem de avisos ───────────────────────────────────────────────────

test('contagem aceita a resposta nova e limpa lixo', () => {
  const lida = normalizarContagem({ geral: 2, mestre: 1, admin: 0, mestre_por_campanha: { a: 1, b: 0, c: -3 }, total: 3 });
  assert.deepEqual(lida, { geral: 2, mestre: 1, admin: 0, mestre_por_campanha: { a: 1 }, total: 3 });
});

test('servidor antigo so manda o total: tudo cai na caixa geral', () => {
  assert.deepEqual(normalizarContagem(undefined, 5), { ...CONTAGEM_VAZIA, geral: 5, total: 5 });
  assert.deepEqual(normalizarContagem(null, 'x'), CONTAGEM_VAZIA);
});

test('total ausente na contagem nova e refeito pelas partes', () => {
  const lida = normalizarContagem({ geral: 2, admin: 1, mestre_por_campanha: { a: 3 } });
  assert.equal(lida.total, 6);
});

// ── Abas dos paineis ─────────────────────────────────────────────────────

const ABAS = ['personagens', 'mesa', 'avisos'] as const;

test('aba da URL vale so se o painel conhece; senao volta para a padrao', () => {
  assert.equal(abaValida(ABAS, 'avisos', 'personagens'), 'avisos');
  assert.equal(abaValida(ABAS, 'cofre', 'personagens'), 'personagens');
  assert.equal(abaValida(ABAS, null, 'personagens'), 'personagens');
  assert.equal(abaValida(ABAS, '', 'personagens'), 'personagens');
});

test('setas dao a volta nas abas e Home e End vao as pontas', () => {
  assert.equal(abaPorTecla(ABAS, 'avisos', 'ArrowRight'), 'personagens');
  assert.equal(abaPorTecla(ABAS, 'personagens', 'ArrowLeft'), 'avisos');
  assert.equal(abaPorTecla(ABAS, 'mesa', 'Home'), 'personagens');
  assert.equal(abaPorTecla(ABAS, 'mesa', 'End'), 'avisos');
  assert.equal(abaPorTecla(ABAS, 'mesa', 'Enter'), null);
});

// ── Mesas ────────────────────────────────────────────────────────────────

test('so Mestre e Criador criam mesa, como o servidor; Administracao sozinha nao', () => {
  assert.equal(podeCriarCampanha({ papel_plataforma: 'mestre' }), true);
  assert.equal(podeCriarCampanha({ papel_plataforma: 'criador' }), true);
  assert.equal(podeCriarCampanha({ papel_plataforma: 'admin' }), false);
  assert.equal(podeCriarCampanha({ papel_plataforma: 'player' }), false);
  assert.equal(podeCriarCampanha(null), false);
});

test('cada papel de mesa tem a sua cor', () => {
  assert.notEqual(classeDoPapel('mestre'), classeDoPapel('jogador'));
  assert.match(classeDoPapel('Assistente'), /orange/);
  assert.match(classeDoPapel('observador'), /gray/);
});

// ── Cofre ────────────────────────────────────────────────────────────────

test('o Cofre ja vem com o destino quando so ha uma resposta', () => {
  const dois = [{ id: 'p1' }, { id: 'p2' }];
  assert.equal(personagemInicialDoCofre([{ id: 'p1' }]), 'p1');
  assert.equal(personagemInicialDoCofre(dois, 'p2'), 'p2');
  assert.equal(personagemInicialDoCofre(dois, 'fantasma'), '');
  assert.equal(personagemInicialDoCofre(dois, null), '');
  assert.equal(personagemInicialDoCofre([]), '');
});

test('a escolha da pessoa no Cofre nunca e trocada, a menos que o personagem suma', () => {
  const dois = [{ id: 'p1' }, { id: 'p2' }];
  assert.equal(personagemDoCofre('p1', dois, 'p2'), 'p1');
  assert.equal(personagemDoCofre('apagado', dois, 'p2'), 'p2');
  assert.equal(personagemDoCofre('', dois, null), '');
});
