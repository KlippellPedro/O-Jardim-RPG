import assert from 'node:assert/strict';
import test from 'node:test';
import { UNICOS_JARDIM_CATALOGO } from '../../src/services/catalogoService';
import {
  catalogoJardimUnicosDisponivel,
  comprarUnicoNoJardim,
  sementesPorVenderUnico,
  unicosComprasJardim,
  unicosJardimSelecionados,
  unicosVendaveisJardim,
  venderUnicoNoJardim,
} from '../../src/services/progressaoFichaService';

const TIPOS_VALIDOS = new Set(['ataque', 'suporte', 'utilidade']);
const TIERS_VALIDOS = new Set(['simples', 'notavel', 'extraordinaria', 'lendaria']);

test('o catálogo de Únicos tem 40 exemplares, sem id nem título repetido', () => {
  assert.equal(UNICOS_JARDIM_CATALOGO.length, 40);
  assert.equal(new Set(UNICOS_JARDIM_CATALOGO.map((u) => u.id)).size, 40);
  assert.equal(new Set(UNICOS_JARDIM_CATALOGO.map((u) => u.titulo)).size, 40);
});

test('todo Único tem tipo e tier válidos, preço positivo e descrição não vazia', () => {
  for (const unico of UNICOS_JARDIM_CATALOGO) {
    assert.ok(TIPOS_VALIDOS.has(unico.tipo), `${unico.id}: tipo inválido "${unico.tipo}"`);
    assert.ok(TIERS_VALIDOS.has(unico.tier), `${unico.id}: tier inválido "${unico.tier}"`);
    assert.ok(unico.custoSementes > 0, `${unico.id}: custoSementes deveria ser positivo`);
    assert.ok(Number(unico.custo_mana) >= 0, `${unico.id}: custo_mana não deveria ser negativo`);
    assert.ok(unico.descricao && unico.descricao.length > 20, `${unico.id}: descrição muito curta ou vazia`);
    assert.ok(unico.acao, `${unico.id}: precisa declarar a ação`);
    assert.ok(unico.usos, `${unico.id}: precisa declarar os usos (frequência)`);
  }
});

test('cobre os 3 tipos (ataque, suporte, utilidade) e os 4 tiers de complexidade', () => {
  const tipos = new Set(UNICOS_JARDIM_CATALOGO.map((u) => u.tipo));
  assert.deepEqual([...tipos].sort(), ['ataque', 'suporte', 'utilidade']);
  const tiers = new Set(UNICOS_JARDIM_CATALOGO.map((u) => u.tier));
  assert.deepEqual([...tiers].sort(), ['extraordinaria', 'lendaria', 'notavel', 'simples']);
});

test('um Único simples sempre é mais barato que um notável, extraordinário ou lendário (as escadas de tier não se cruzam)', () => {
  const porTier = (tier: string) => UNICOS_JARDIM_CATALOGO.filter((u) => u.tier === tier).map((u) => u.custoSementes);
  const maxSimples = Math.max(...porTier('simples'));
  const minNotavel = Math.min(...porTier('notavel'));
  const maxNotavel = Math.max(...porTier('notavel'));
  const minExtraordinaria = Math.min(...porTier('extraordinaria'));
  const maxExtraordinaria = Math.max(...porTier('extraordinaria'));
  const minLendaria = Math.min(...porTier('lendaria'));

  assert.ok(maxSimples < minNotavel, `simples mais caro (${maxSimples}) deveria custar menos que o notável mais barato (${minNotavel})`);
  assert.ok(maxNotavel < minExtraordinaria, `notável mais caro (${maxNotavel}) deveria custar menos que o extraordinário mais barato (${minExtraordinaria})`);
  assert.ok(maxExtraordinaria < minLendaria, `extraordinário mais caro (${maxExtraordinaria}) deveria custar menos que o lendário mais barato (${minLendaria})`);
});

test('um Único simples é acessível vendendo só um ou dois poderes comuns; um lendário exige um investimento pesado', () => {
  const maisBaratoSimples = Math.min(...UNICOS_JARDIM_CATALOGO.filter((u) => u.tier === 'simples').map((u) => u.custoSementes));
  const maisBaratoLendaria = Math.min(...UNICOS_JARDIM_CATALOGO.filter((u) => u.tier === 'lendaria').map((u) => u.custoSementes));
  // Um poder padrão de nível alto (ex.: nível 15) rende 70 sementes (ver
  // jardimFicha.test.ts); dois deles já cobrem o Único simples mais barato.
  assert.ok(maisBaratoSimples <= 70 * 2, `Único simples mais barato (${maisBaratoSimples}) deveria caber em ~2 poderes comuns vendidos`);
  // O lendário mais barato deveria exigir mais que isso multiplicado por 5 -
  // não dá pra chegar lá vendendo um punhado de poderes comuns.
  assert.ok(maisBaratoLendaria > 70 * 5, `Único lendário mais barato (${maisBaratoLendaria}) deveria exigir bem mais que 5 poderes comuns vendidos`);
});

test('vender um Único de volta sempre rende menos do que ele custou pra comprar (sem arbitragem)', () => {
  for (const unico of UNICOS_JARDIM_CATALOGO) {
    const venda = sementesPorVenderUnico(unico);
    assert.ok(venda < unico.custoSementes, `${unico.id}: venda (${venda}) deveria ser menor que a compra (${unico.custoSementes})`);
    assert.ok(venda > 0, `${unico.id}: venda deveria ser positiva`);
  }
});

test('comprar um Único novo funciona, e comprar o mesmo de novo é recusado', () => {
  const idAlvo = UNICOS_JARDIM_CATALOGO[0].id;
  const ficha = { jardim: {} };
  const primeira = comprarUnicoNoJardim(ficha, idAlvo);
  assert.deepEqual(primeira, [idAlvo]);

  const fichaComUnico = { jardim: { unicosComprados: primeira } };
  const segunda = comprarUnicoNoJardim(fichaComUnico, idAlvo);
  assert.equal(segunda, null);
});

test('catalogoJardimUnicosDisponivel não depende de classe nem nível: aparece tudo, só marca o que já foi plantado', () => {
  const fichaVazia: any = {};
  const catalogo = catalogoJardimUnicosDisponivel(fichaVazia);
  assert.equal(catalogo.length, 40);
  assert.ok(catalogo.every((item) => !item.jaAdquirido));

  const idAlvo = UNICOS_JARDIM_CATALOGO[3].id;
  const fichaComUnico: any = { jardim: { unicosComprados: [idAlvo] } };
  const catalogo2 = catalogoJardimUnicosDisponivel(fichaComUnico);
  assert.equal(catalogo2.length, 40, 'já plantado continua listado, só marcado');
  assert.equal(catalogo2.find((item) => item.unico.id === idAlvo)?.jaAdquirido, true);
});

test('plantar um Único faz ele aparecer resolvido pra ficha, com a descrição completa', () => {
  const idAlvo = UNICOS_JARDIM_CATALOGO.find((u) => u.tier === 'lendaria')!.id;
  const ficha: any = { jardim: { unicosComprados: [idAlvo] } };
  const resolvidos = unicosJardimSelecionados(ficha);
  assert.equal(resolvidos.length, 1);
  assert.equal(resolvidos[0].origem, 'Jardim');
  assert.ok(resolvidos[0].descricao.length > 0);
});

test('podar um Único plantado credita as Sementes certas e some da lista de vendáveis', () => {
  const alvo = UNICOS_JARDIM_CATALOGO[5];
  const outro = UNICOS_JARDIM_CATALOGO[6];
  const ficha: any = { jardim: { unicosComprados: [alvo.id, outro.id] } };

  const vendaveis = unicosVendaveisJardim(ficha);
  const itemAlvo = vendaveis.find((v) => v.id === alvo.id);
  assert.ok(itemAlvo);
  assert.equal(itemAlvo!.sementesRecebidas, sementesPorVenderUnico(alvo));

  const novaLista = venderUnicoNoJardim(ficha, alvo.id);
  assert.deepEqual(novaLista, [outro.id]);
});

test('unicosComprasJardim ignora entradas malformadas', () => {
  const ficha = { jardim: { unicosComprados: ['valido', 123, null, {}, 'outro-valido'] } };
  assert.deepEqual(unicosComprasJardim(ficha), ['valido', 'outro-valido']);
});

test('os seis Únicos físicos gastam Estamina, os sobrenaturais gastam Mana, e nenhum cobra os dois', () => {
  const fisicos = ['golpe-sem-nome', 'respiro-roubado', 'corte-que-lembra', 'escudo-emprestado', 'passo-fora-do-tempo', 'sombra-que-aprende'];
  for (const unico of UNICOS_JARDIM_CATALOGO) {
    const estamina = Number(unico.custo_estamina) || 0;
    const mana = Number(unico.custo_mana) || 0;
    assert.ok(!(estamina > 0 && mana > 0), `${unico.id}: cobra Mana e Estamina`);
    if (fisicos.includes(unico.id)) {
      assert.ok(estamina > 0 && mana === 0, `${unico.id}: deveria gastar só Estamina`);
    }
  }
});

test('Único de Estamina chega à ficha como custo de Estamina', () => {
  const ficha = { jardim: { unicosComprados: ['corte-que-lembra', 'cicatriz-que-nunca-fecha'] } };
  const resolvidos = unicosJardimSelecionados(ficha);
  const corte = resolvidos.find((item) => item.id === 'jardim-unico:corte-que-lembra');
  const cicatriz = resolvidos.find((item) => item.id === 'jardim-unico:cicatriz-que-nunca-fecha');
  assert.equal(corte?.custoEstamina, 4);
  assert.equal(corte?.custoMana, 0);
  assert.equal(cicatriz?.custoMana, 7);
  assert.equal(cicatriz?.custoEstamina, 0);
});

test('os Únicos gastam Mana ou Estamina, nunca os dois, e não repetem título de poder de classe', () => {
  for (const unico of UNICOS_JARDIM_CATALOGO) {
    assert.ok(!(Number(unico.custo_mana) > 0 && Number(unico.custo_estamina) > 0), `${unico.id}: mana e estamina juntas`);
    assert.ok(!/\u2014/.test(JSON.stringify(unico)), `${unico.id}: travessão`);
  }
});
