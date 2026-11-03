import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brilhoDaLua, horaExtenso, luzDaCena, luzDoCeu, minutoDaCena, minutosAte, misturarCor, nomeDaLua, periodoDaHora,
} from '../../src/pages/Mapa/motor/ceuConta';
import { bocaEm, portalNovo, portalQuePergunta } from '../../src/pages/Mapa/motor/portaisConta';
import type { IPortal, ITempoMapa } from '../../src/services/mapaApi';

const TEMPO: ITempoMapa = {
  minuto: 22 * 60, hora_extenso: '22:00', estacao: 'primavera', lua: 0, lua_carmesim: false, em_uso: true, data: null,
};

test('períodos do dia e a hora por extenso', () => {
  assert.equal(periodoDaHora(0).rotulo, 'Madrugada');
  assert.equal(periodoDaHora(6 * 60).chave, 'amanhecer');
  assert.equal(periodoDaHora(9 * 60).rotulo, 'Manhã');
  assert.equal(periodoDaHora(15 * 60).chave, 'tarde');
  assert.equal(periodoDaHora(18 * 60).chave, 'entardecer');
  assert.equal(periodoDaHora(23 * 60 + 59).chave, 'noite');
  assert.equal(horaExtenso(7 * 60 + 5), '07:05');
  assert.equal(horaExtenso(1440 + 30), '00:30');
});

test('ir para o próximo amanhecer anda sempre para a frente', () => {
  assert.equal(minutosAte(5 * 60, 6 * 60), 60);
  assert.equal(minutosAte(8 * 60, 6 * 60), 22 * 60);
  assert.equal(minutosAte(6 * 60, 6 * 60), 24 * 60);
  assert.equal(minutosAte(23 * 60, 0), 60);
});

test('meio-dia é claro, meia-noite é escura e o crepúsculo fica no meio', () => {
  const meioDia = luzDoCeu(12 * 60);
  assert.equal(meioDia.escuro, 0);
  assert.equal(meioDia.tintaForca, 0);
  const meiaNoite = luzDoCeu(0);
  assert.ok(meiaNoite.escuro > 0.7);
  const crepusculo = luzDoCeu(18 * 60 + 30);
  assert.ok(crepusculo.escuro > 0.1 && crepusculo.escuro < meiaNoite.escuro);
  assert.ok(luzDoCeu(6 * 60).tintaForca > 0.2, 'o amanhecer tinge a cena');
  // A luz anda sem saltos entre um minuto e o seguinte.
  for (let minuto = 0; minuto < 1440; minuto += 1) {
    assert.ok(Math.abs(luzDoCeu(minuto + 1).escuro - luzDoCeu(minuto).escuro) < 0.02, `salto às ${horaExtenso(minuto)}`);
  }
});

test('a lua cheia clareia a noite e a Lua Carmesim a tinge de vermelho', () => {
  assert.equal(brilhoDaLua(0), 0);
  assert.equal(brilhoDaLua(0.5), 1);
  const nova = luzDoCeu(0, { lua: 0 });
  const cheia = luzDoCeu(0, { lua: 0.5 });
  assert.ok(cheia.escuro < nova.escuro);
  // De dia a lua não pesa.
  assert.equal(luzDoCeu(12 * 60, { lua: 0.5 }).escuro, 0);
  const carmesim = luzDoCeu(0, { lua: 0.5, luaCarmesim: true });
  assert.ok(((carmesim.tinta >> 16) & 0xff) > ((carmesim.tinta >> 0) & 0xff), 'tinta puxada para o vermelho');
});

test('Noite Eterna não deixa o dia nascer e o Eclipse escurece o meio-dia', () => {
  assert.deepEqual(luzDoCeu(12 * 60, { estacao: 'noite_eterna' }), luzDoCeu(0, { estacao: 'noite_eterna' }));
  assert.ok(luzDoCeu(12 * 60, { estacao: 'eclipse' }).escuro >= 0.5);
});

test('a cena escolhe de onde vem a hora', () => {
  assert.equal(minutoDaCena({ modo: 'nenhum', minuto: 0 }, TEMPO), null);
  assert.equal(minutoDaCena({ modo: 'fixo', minuto: 300 }, TEMPO), 300);
  assert.equal(minutoDaCena({ modo: 'mundo', minuto: 300 }, TEMPO), 22 * 60);
  assert.equal(minutoDaCena({ modo: 'mundo', minuto: 300 }, null), null);
  assert.equal(luzDaCena(undefined, TEMPO), null);
  // Hora fixa ignora a lua do mundo.
  const fixa = luzDaCena({ modo: 'fixo', minuto: 0 }, { ...TEMPO, lua: 0.5 });
  assert.deepEqual(fixa, luzDoCeu(0));
  assert.deepEqual(luzDaCena({ modo: 'mundo', minuto: 0 }, { ...TEMPO, lua: 0.5 }), luzDoCeu(22 * 60, { estacao: 'primavera', lua: 0.5, luaCarmesim: false }));
});

test('misturar cores e o nome da lua', () => {
  assert.equal(misturarCor(0x000000, 0xffffff, 0.5), 0x808080);
  assert.equal(misturarCor(0x123456, 0xabcdef, 0), 0x123456);
  assert.equal(nomeDaLua(0, false), 'Lua Nova');
  assert.equal(nomeDaLua(0.5, false), 'Lua Cheia');
  assert.equal(nomeDaLua(0.5, true), 'Lua Carmesim');
});

const PORTAL: IPortal = { ...portalNovo({ x: 100, y: 100 }, { x: 900, y: 500 }, 1), id: 'p1' };

test('portal novo nasce com os padrões do servidor', () => {
  const novo = portalNovo({ x: 1, y: 2 }, { x: 3, y: 4 }, 3);
  assert.equal(novo.nome, 'Portal 3');
  assert.equal(novo.id, '');
  assert.deepEqual([novo.mao, novo.usa, novo.fluxo, novo.raio, novo.visivel, novo.ligado, novo.confirmar], ['dupla', 'todos', 'espaco', 0.6, true, true, false]);
});

test('a tela só pergunta antes de atravessar o portal que pede licença', () => {
  assert.equal(portalQuePergunta([PORTAL], 100, 100, 100, false), null);
  const pergunta = { ...PORTAL, confirmar: true };
  assert.equal(portalQuePergunta([pergunta], 110, 90, 100, false)?.id, 'p1');
  assert.equal(portalQuePergunta([pergunta], 900, 500, 100, false)?.id, 'p1', 'a volta também pergunta');
  assert.equal(portalQuePergunta([{ ...pergunta, mao: 'unica' }], 900, 500, 100, false), null);
  assert.equal(portalQuePergunta([pergunta], 300, 300, 100, false), null);
  assert.equal(portalQuePergunta([{ ...pergunta, ligado: false }], 100, 100, 100, false), null);
  assert.equal(portalQuePergunta([{ ...pergunta, usa: 'mestre' }], 100, 100, 100, false), null);
  // Escondido: o jogador cai sem pergunta; o Mestre, que vê, é perguntado.
  assert.equal(portalQuePergunta([{ ...pergunta, visivel: false }], 100, 100, 100, false), null);
  assert.equal(portalQuePergunta([{ ...pergunta, visivel: false }], 100, 100, 100, true)?.id, 'p1');
  // Boca que a névoa esconde chega null e não atrapalha.
  assert.equal(portalQuePergunta([{ ...pergunta, a: null }], 100, 100, 100, false), null);
});

test('o Mestre pega a boca mais perto do clique', () => {
  const outro: IPortal = { ...PORTAL, id: 'p2', a: { x: 140, y: 100 }, b: { x: 600, y: 600 } };
  assert.deepEqual(bocaEm([PORTAL, outro], { x: 135, y: 100 }, 100), { portal: outro, lado: 'a' });
  assert.deepEqual(bocaEm([PORTAL, outro], { x: 905, y: 505 }, 100), { portal: PORTAL, lado: 'b' });
  assert.equal(bocaEm([PORTAL], { x: 400, y: 400 }, 100), null);
});
