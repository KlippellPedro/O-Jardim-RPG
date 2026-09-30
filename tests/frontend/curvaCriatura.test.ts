import assert from 'node:assert/strict';
import test from 'node:test';
import catalogo from '../../data/loja/catalogo.json';
import {
  ARQUETIPOS_CRIATURA,
  ORDEM_DOS_ARQUETIPOS,
  ORDEM_DOS_PAPEIS,
  PAPEIS_CRIATURA,
  escalaDeVida,
  expressaoDeDano,
  mediaDaExpressao,
  modeloDeCriatura,
  vidaDeAliado,
  vidaDeCriatura,
  vdValido,
} from '../../src/services/curvaCriatura';
import { VD_MAXIMO, xpPorVd } from '../../src/services/progressaoNiveis';

test('todo VD de 1 ao máximo tem modelo com números inteiros e positivos', () => {
  for (let vd = 1; vd <= VD_MAXIMO; vd += 1) {
    for (const papel of ORDEM_DOS_PAPEIS) {
      const modelo = modeloDeCriatura(vd, papel);
      assert.equal(modelo.vd, vd);
      for (const campo of ['pv', 'defesa', 'iniciativa', 'mana', 'estamina', 'danoMedio', 'xp'] as const) {
        assert.ok(Number.isInteger(modelo[campo]) && modelo[campo] > 0, `VD ${vd} ${papel}: ${campo} = ${modelo[campo]}`);
      }
      assert.equal(modelo.ataques.length, 2);
      assert.equal(modelo.pericias.length, 5);
    }
  }
});

test('valores fora da faixa viram o VD mais próximo', () => {
  assert.equal(vdValido(0), 1);
  assert.equal(vdValido(-5), 1);
  assert.equal(vdValido('abc'), 1);
  assert.equal(vdValido(VD_MAXIMO + 900), VD_MAXIMO);
  assert.equal(modeloDeCriatura(0).vd, 1);
});

test('curva aprovada: ataque, Defesa, dano e Vida solo em VDs de referência', () => {
  // Valores da tabela de docs/plano-vd-e-magia-medicoes-2026-09.md (a Vida arredonda de 5 em 5).
  const esperado: Array<[number, { ataque: string; defesa: number; dano: number; pv: number }]> = [
    [20, { ataque: '+24', defesa: 19, dano: 17, pv: 410 }],
    [30, { ataque: '+31', defesa: 24, dano: 27, pv: 810 }],
    [40, { ataque: '+37', defesa: 30, dano: 36, pv: 1055 }],
    [50, { ataque: '+42', defesa: 35, dano: 45, pv: 1320 }],
    [100, { ataque: '+73', defesa: 61, dano: 81, pv: 2700 }],
    [200, { ataque: '+126', defesa: 112, dano: 145, pv: 5480 }],
    [500, { ataque: '+285', defesa: 264, dano: 336, pv: 14500 }],
  ];
  for (const [vd, valores] of esperado) {
    const modelo = modeloDeCriatura(vd, 'solo');
    assert.equal(modelo.pericias[0], `Luta ${valores.ataque}`, `VD ${vd}`);
    assert.equal(modelo.defesa, valores.defesa, `VD ${vd}`);
    assert.equal(modelo.danoMedio, valores.dano, `VD ${vd}`);
    assert.equal(modelo.pv, valores.pv, `VD ${vd}`);
  }
});

test('acima do VD 40 a Vida cresce na proporção do VD (opção B)', () => {
  assert.equal(escalaDeVida(10), 1);
  assert.equal(escalaDeVida(40), 1);
  assert.equal(escalaDeVida(100), 2.5);
  assert.equal(escalaDeVida(200), 5);
  assert.ok(vidaDeCriatura(100) >= 2.4 * vidaDeCriatura(40));
});

test('a Vida nunca diminui quando o VD sobe, em qualquer papel', () => {
  for (const papel of ORDEM_DOS_PAPEIS) {
    let anterior = 0;
    for (let vd = 1; vd <= VD_MAXIMO; vd += 1) {
      const atual = vidaDeCriatura(vd, papel);
      assert.ok(atual >= anterior, `${papel}: VD ${vd} (${atual}) abaixo do anterior (${anterior})`);
      anterior = atual;
    }
  }
});

test('papéis: lacaio < padrão < elite < chefe em Vida, e o XP segue a fatia', () => {
  for (const vd of [3, 10, 25, 48, 100, 250]) {
    const vidas = (['lacaio', 'padrao', 'elite', 'chefe'] as const).map((papel) => vidaDeCriatura(vd, papel));
    assert.deepEqual([...vidas].sort((a, b) => a - b), vidas, `VD ${vd}`);
    assert.ok(vidaDeCriatura(vd, 'solo') > vidaDeCriatura(vd, 'elite'), `VD ${vd}: solo acima do elite`);
    assert.ok(vidaDeCriatura(vd, 'solo') <= vidaDeCriatura(vd, 'chefe'), `VD ${vd}: solo acima do chefe`);
    assert.equal(modeloDeCriatura(vd, 'solo').xp, xpPorVd(vd));
    assert.equal(modeloDeCriatura(vd, 'chefe').xp, xpPorVd(vd));
    assert.equal(modeloDeCriatura(vd, 'lacaio').xp, Math.round(xpPorVd(vd) * PAPEIS_CRIATURA.lacaio.fatiaDeXp));
  }
});

test('só chefe anuncia golpe, e ele é maior que o golpe comum', () => {
  for (const vd of [1, 20, 60, 300]) {
    const chefe = modeloDeCriatura(vd, 'chefe');
    assert.ok(chefe.golpeAnunciadoMedio !== null && chefe.golpeAnunciadoMedio > chefe.danoMedio);
    assert.ok(chefe.habilidades[0].startsWith('Golpe Anunciado'));
    for (const papel of ['lacaio', 'padrao', 'elite', 'solo'] as const) {
      assert.equal(modeloDeCriatura(vd, papel).golpeAnunciadoMedio, null);
      assert.deepEqual(modeloDeCriatura(vd, papel).habilidades, []);
    }
  }
});

test('expressão de dano tem média próxima da pedida, do golpe fraco ao gigante', () => {
  for (const media of [2, 3, 5, 8, 12, 17, 27, 45, 81, 145, 336, 900, 4000]) {
    const expressao = expressaoDeDano(media);
    assert.match(expressao, /^\d+d\d+(\+\d+)?$/);
    const obtida = mediaDaExpressao(expressao);
    assert.ok(Math.abs(obtida - media) <= Math.max(1, media * 0.03), `${media} virou ${expressao} (média ${obtida})`);
  }
});

test('o gerador concorda com o bestiário escrito à mão: Vida solo perto da Vida das fichas até o VD 50', () => {
  const razoes: number[] = [];
  for (const entrada of catalogo.entradas as any[]) {
    if (entrada.tipo !== 'monstro') continue;
    const { vd, pv } = entrada.conteudo;
    if (vd > 50) continue;
    razoes.push(pv / modeloDeCriatura(vd, 'solo').pv);
  }
  assert.ok(razoes.length >= 121);
  razoes.sort((a, b) => a - b);
  const mediana = razoes[Math.floor(razoes.length / 2)];
  assert.ok(mediana > 0.9 && mediana < 1.1, `mediana ${mediana}`);
});

test('nenhum modelo genérico gravado sobrou no catálogo: o gerador cobre todo VD', () => {
  const genericos = (catalogo.entradas as any[]).filter((entrada) => entrada.id.startsWith('universal-vd-'));
  assert.deepEqual(genericos.map((entrada) => entrada.id), []);
});

test('Vida de aliado: no máximo 2x a Vida média de um personagem do VD, e nunca acima do catálogo', () => {
  // Mesmos valores em plataforma/tests/test_mercenarios_loja.py.
  const casos: Array<[number, number, number]> = [[3, 105, 38], [8, 170, 74], [20, 410, 160], [33, 850, 276], [50, 1320, 428], [100, 2700, 772]];
  for (const [vd, pv, esperado] of casos) assert.equal(vidaDeAliado(vd, pv), esperado, `VD ${vd}`);
  assert.equal(vidaDeAliado(20, 100), 100, 'criatura já fraca fica como está');
  assert.equal(vidaDeAliado(undefined, 500), 500, 'sem VD mantém a Vida do catálogo');
});

test('o aliado comprado tem bem menos Vida que o inimigo do Bestiário, do VD baixo ao alto', () => {
  const contratáveis = (catalogo.entradas as any[]).filter((e) => e.tipo === 'monstro' && e.conteudo.disponivelNaLoja !== false);
  for (const e of contratáveis) {
    const { vd, pv } = e.conteudo;
    assert.ok(vidaDeAliado(vd, pv) <= pv, `${e.id}: aliado com mais Vida que o catálogo`);
    if (vd >= 8) assert.ok(vidaDeAliado(vd, pv) <= 0.6 * pv, `${e.id}: aliado ainda com mais de 60% da Vida de inimigo`);
  }
});

test('arquétipos dão variedade sem tirar o modelo neutro: comum é idêntico ao de antes, os outros mudam de verdade', () => {
  for (const vd of [1, 8, 25, 60, 200, 500]) {
    const base = modeloDeCriatura(vd, 'solo');
    assert.deepEqual(modeloDeCriatura(vd, 'solo', 'comum'), { ...base, arquetipo: 'comum', arquetipoRotulo: 'Comum' });
    const bruto = modeloDeCriatura(vd, 'solo', 'bruto');
    const agil = modeloDeCriatura(vd, 'solo', 'agil');
    const defensor = modeloDeCriatura(vd, 'solo', 'defensor');
    const conjurador = modeloDeCriatura(vd, 'solo', 'conjurador');
    const assassino = modeloDeCriatura(vd, 'solo', 'assassino');
    if (vd >= 8) {
      assert.ok(bruto.danoMedio > base.danoMedio && bruto.pv > base.pv && bruto.defesa < base.defesa, `bruto VD ${vd}`);
      assert.ok(agil.defesa > base.defesa && agil.pv < base.pv && agil.iniciativa > base.iniciativa, `ágil VD ${vd}`);
      assert.ok(defensor.pv > base.pv && defensor.defesa > base.defesa && defensor.danoMedio < base.danoMedio, `defensor VD ${vd}`);
      assert.ok(conjurador.mana > 2 * base.mana && conjurador.pv < base.pv, `conjurador VD ${vd}`);
      assert.ok(assassino.danoMedio > base.danoMedio && assassino.pv < base.pv, `assassino VD ${vd}`);
    }
    for (const arquetipo of ORDEM_DOS_ARQUETIPOS) {
      const modelo = modeloDeCriatura(vd, 'chefe', arquetipo);
      assert.equal(modelo.ataques.length, 2);
      assert.equal(modelo.ataques[0].nome, ARQUETIPOS_CRIATURA[arquetipo].ataques[0].nome);
      assert.ok(Number.isInteger(modelo.pv) && modelo.pv > 0 && modelo.defesa >= 8);
      assert.doesNotMatch(modelo.habilidades.join(' '), /\{dt\}/, `${arquetipo}: {dt} sem trocar`);
      // O arquétipo não mexe no XP: quem paga é o papel.
      assert.equal(modelo.xp, modeloDeCriatura(vd, 'chefe').xp);
    }
  }
  assert.equal(modeloDeCriatura(30, 'solo', 'assassino').habilidades[0].startsWith('Golpe Furtivo'), true);
  assert.match(modeloDeCriatura(30, 'solo', 'bruto').habilidades[0], /DT 30/);
});
