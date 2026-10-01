import assert from 'node:assert/strict';
import test from 'node:test';
import { PERICIAS_CATALOGO, UNICOS_JARDIM_CATALOGO } from '../../src/services/catalogoService';
import { efeitosDosUnicosJardim, resumirEquipamentos } from '../../src/services/equipamentoService';
import {
  catalogoJardimUnicosDisponivel,
  comprarUnicoNoJardim,
  descricaoDoUnico,
  sementesPorVenderUnico,
  unicosComprasJardim,
  unicosJardimSelecionados,
  unicosVendaveisJardim,
  venderUnicoNoJardim,
} from '../../src/services/progressaoFichaService';

const TIPOS_VALIDOS = new Set(['ataque', 'suporte', 'utilidade']);
const TIERS_VALIDOS = new Set(['simples', 'notavel', 'extraordinaria', 'lendaria']);

const TOTAL_UNICOS = 67;
const passivosComEfeito = UNICOS_JARDIM_CATALOGO.filter((u) => u.efeitos?.length);

test('o catálogo de Únicos tem 67 exemplares (40 ativos e 27 passivos de ficha), sem id nem título repetido', () => {
  assert.equal(UNICOS_JARDIM_CATALOGO.length, TOTAL_UNICOS);
  assert.equal(new Set(UNICOS_JARDIM_CATALOGO.map((u) => u.id)).size, TOTAL_UNICOS);
  assert.equal(new Set(UNICOS_JARDIM_CATALOGO.map((u) => u.titulo)).size, TOTAL_UNICOS);
  assert.equal(passivosComEfeito.length, 27);
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
  assert.equal(catalogo.length, TOTAL_UNICOS);
  assert.ok(catalogo.every((item) => !item.jaAdquirido));

  const idAlvo = UNICOS_JARDIM_CATALOGO[3].id;
  const fichaComUnico: any = { jardim: { unicosComprados: [idAlvo] } };
  const catalogo2 = catalogoJardimUnicosDisponivel(fichaComUnico);
  assert.equal(catalogo2.length, TOTAL_UNICOS, 'já plantado continua listado, só marcado');
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

const ALVOS_RECURSO = new Set(['vidaMaxima', 'manaMaxima', 'estaminaMaxima', 'sanidadeMaxima', 'cansacoMaximo']);
const ALVOS_COMBATE = new Set(['ataque', 'dano', 'defesa', 'iniciativa', 'movimento', 'margemAmeaca', 'multiplicadorCritico']);
const ATRIBUTOS_VALIDOS = new Set(['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo']);
const PERICIAS_VALIDAS = new Set(PERICIAS_CATALOGO.map((p) => p.id));

test('todo Único passivo é Passivo, sem custo, e cada efeito mira um alvo que a ficha realmente calcula', () => {
  for (const unico of passivosComEfeito) {
    assert.equal(unico.acao, 'Passivo', `${unico.id}: ação`);
    assert.equal(Number(unico.custo_mana) || 0, 0, `${unico.id}: passivo não gasta Mana`);
    assert.equal(Number(unico.custo_estamina) || 0, 0, `${unico.id}: passivo não gasta Estamina`);
    assert.ok(unico.efeitos!.length <= 5, `${unico.id}: a ficha só aceita 5 efeitos por fonte`);
    assert.equal(new Set(unico.efeitos!.map((e) => e.id)).size, unico.efeitos!.length, `${unico.id}: ids de efeito repetidos`);
    for (const efeito of unico.efeitos!) {
      assert.ok(efeito.valor > 0, `${unico.id}: valor deve ser positivo`);
      if (efeito.categoria === 'recurso') assert.ok(ALVOS_RECURSO.has(efeito.alvo), `${unico.id}: recurso ${efeito.alvo}`);
      else if (efeito.categoria === 'combate') assert.ok(ALVOS_COMBATE.has(efeito.alvo), `${unico.id}: combate ${efeito.alvo}`);
      else if (efeito.categoria === 'atributo') assert.ok(ATRIBUTOS_VALIDOS.has(efeito.alvo), `${unico.id}: atributo ${efeito.alvo}`);
      else assert.ok(PERICIAS_VALIDAS.has(efeito.alvo), `${unico.id}: perícia ${efeito.alvo}`);
    }
  }
});

test('plantar um passivo muda mesmo a ficha: cada um aparece no resumo de equipamento', () => {
  for (const unico of passivosComEfeito) {
    const resumo = resumirEquipamentos([], { jardim: { unicosComprados: [unico.id] } }, []);
    for (const efeito of unico.efeitos!) {
      const mapa = efeito.modo === 'vantagem'
        ? resumo.vantagens
        : efeito.categoria === 'atributo' ? resumo.bonusAtributos
        : efeito.categoria === 'recurso' ? resumo.bonusRecursos
        : efeito.categoria === 'combate' ? resumo.bonusCombate
        : resumo.bonusPericias;
      assert.equal(mapa[efeito.alvo], efeito.valor, `${unico.id}: ${efeito.categoria}/${efeito.alvo}`);
    }
    assert.ok(resumo.efeitosAtivos.every((e) => e.origem === `Único do Jardim: ${unico.titulo}`), `${unico.id}: origem`);
  }
});

test('Únicos com o mesmo alvo não somam: vale o maior, em qualquer ordem de compra', () => {
  const vida = (ids: string[]) => resumirEquipamentos([], { jardim: { unicosComprados: ids } }, []).bonusRecursos.vidaMaxima;
  assert.equal(vida(['raiz-de-vigor']), 6);
  assert.equal(vida(['raiz-de-vigor', 'raiz-funda', 'tronco-do-jardim']), 20);
  assert.equal(vida(['tronco-do-jardim', 'raiz-de-vigor']), 20);
  assert.equal(vida(['arvore-inteira', 'tronco-do-jardim']), 30);
  const bonus = (ids: string[]) => resumirEquipamentos([], { jardim: { unicosComprados: ids } }, []).bonusAtributos;
  assert.equal(bonus(['braco-de-raiz', 'corpo-de-tita']).forca, 2, 'Força +2 de dois Únicos não vira +4');
  // Alvos diferentes continuam somando.
  assert.equal(bonus(['braco-de-raiz', 'casco-do-jardim']).forca, 2);
  assert.equal(bonus(['braco-de-raiz', 'casco-do-jardim']).constituicao, 2);
  assert.equal(efeitosDosUnicosJardim({ jardim: { unicosComprados: ['inexistente'] } }).length, 0);
});

test('podar o passivo tira o efeito, e o texto avisa que Únicos iguais não somam', () => {
  const ficha = { jardim: { unicosComprados: ['guarda-baixa'] } };
  assert.equal(resumirEquipamentos([], ficha, []).bonusCombate.defesa, 1);
  const podada = { jardim: { unicosComprados: venderUnicoNoJardim(ficha, 'guarda-baixa') } };
  assert.equal(resumirEquipamentos([], podada, []).bonusCombate.defesa, undefined);
  const guarda = UNICOS_JARDIM_CATALOGO.find((u) => u.id === 'guarda-baixa')!;
  assert.match(descricaoDoUnico(guarda), /Não soma com outro Único/);
  assert.equal(unicosJardimSelecionados(ficha)[0].passivo, true);
  assert.equal(unicosJardimSelecionados({ jardim: { unicosComprados: ['golpe-sem-nome'] } })[0].passivo, false);
});

test('passivos cobrem Vida, Mana, Estamina, os sete atributos, as três resistências, Defesa, ataque e iniciativa', () => {
  const alvos = new Set(passivosComEfeito.flatMap((u) => u.efeitos!.map((e) => `${e.categoria}:${e.alvo}:${e.modo}`)));
  for (const esperado of [
    'recurso:vidaMaxima:bonus', 'recurso:manaMaxima:bonus', 'recurso:estaminaMaxima:bonus',
    ...[...ATRIBUTOS_VALIDOS].map((a) => `atributo:${a}:bonus`),
    ...['fortitude', 'reflexos', 'vontade'].flatMap((p) => [`pericia:${p}:bonus`, `pericia:${p}:vantagem`]),
    'combate:defesa:bonus', 'combate:ataque:bonus', 'combate:iniciativa:bonus', 'pericia:percepcao:vantagem',
  ]) assert.ok(alvos.has(esperado), `faltou ${esperado}`);
});
