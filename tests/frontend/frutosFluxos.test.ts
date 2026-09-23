import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { poderesDoFruto, efeitosFichaDoFruto, habilidadeDoFruto } from '../../src/services/frutoEdenService';
import { RECURSOS_CUSTO_VALIDOS } from '../../src/services/statusService';

type Entrada = { tipo: string; id: string; titulo: string; conteudo: Record<string, any> };

const catalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
) as { entradas: Entrada[] };
const magias = JSON.parse(
  readFileSync(new URL('../../data/ficha/magias.json', import.meta.url), 'utf8'),
) as { fluxos: Array<{ id: string; deidade: string }> };

const frutos = catalogo.entradas.filter((item) => item.tipo === 'fruto-eden');
const frutosDeFluxo = frutos.filter((item) => item.conteudo.subtipo === 'Frutos dos Fluxos');
const fichaCom = (fruto: Entrada, despertado: boolean) => ({
  frutoEdenConsumido: { itemId: fruto.id, titulo: fruto.titulo, despertado, conteudo: fruto.conteudo },
});

test('existe um Fruto para cada um dos onze Fluxos, sem repetir', () => {
  const ids = frutosDeFluxo.map((fruto) => fruto.conteudo.fluxo).sort();
  assert.deepEqual(ids, magias.fluxos.map((fluxo) => fluxo.id).sort());
  assert.equal(new Set(frutosDeFluxo.map((fruto) => fruto.id)).size, 11);
});

test('a deidade do Fruto é a do Fluxo, e as que ainda são segredo de lore ficam sem nome', () => {
  const semNome = new Set(['comunicacao']);
  for (const fruto of frutosDeFluxo) {
    const fluxo = magias.fluxos.find((item) => item.id === fruto.conteudo.fluxo)!;
    if (semNome.has(fluxo.id)) {
      assert.equal(fruto.conteudo.deidade, 'Comunicação');
      continue;
    }
    if (fluxo.id === 'tecnologia') {
      assert.equal(fruto.conteudo.deidade, 'A.X.I.S');
      continue;
    }
    assert.equal(fruto.conteudo.deidade, fluxo.deidade, `${fruto.id}: deidade diferente da do Fluxo`);
  }
});

test('texto público dos Frutos dos Fluxos não entrega segredo de lore nem usa travessão', () => {
  const proibidas = ['Keryx', 'Jota Macedo', 'paralisad', 'subjug', 'silenciad'];
  for (const fruto of frutosDeFluxo) {
    const texto = JSON.stringify(fruto);
    for (const palavra of proibidas) assert.ok(!texto.includes(palavra), `${fruto.id}: cita "${palavra}"`);
    assert.ok(!texto.includes('—'), `${fruto.id}: travessão`);
  }
});

test('cada Fruto de Fluxo tem Técnica, Dom da deidade e Comunhão só depois do Despertar', () => {
  for (const fruto of frutosDeFluxo) {
    const antes = poderesDoFruto(fichaCom(fruto, false));
    const depois = poderesDoFruto(fichaCom(fruto, true));
    assert.equal(antes.length, 2, `${fruto.id}: antes do Despertar são Técnica e Dom`);
    assert.equal(depois.length, 3, `${fruto.id}: depois do Despertar entra a Comunhão`);
    assert.ok(antes[1].nome.startsWith('Dom d'), `${fruto.id}: o segundo poder é o Dom da deidade`);
    assert.ok(depois[2].nome.startsWith('Comunhão com'), `${fruto.id}: o terceiro poder é a Comunhão`);
    assert.equal(depois[2].estagioFruto, 'despertado');
    assert.equal(depois[0].estagioFruto, 'aprimorado', `${fruto.id}: a Técnica melhora no Despertar`);
    assert.notEqual(depois[0].nome, antes[0].nome, `${fruto.id}: a Técnica aprimorada tem outro nome`);
  }
});

test('o recurso do poder segue o corpo: Vitalidade e Físico gastam Estamina, os outros nove gastam Mana', () => {
  const fisicos = new Set(['vitalidade', 'fisico']);
  for (const fruto of frutosDeFluxo) {
    const esperado = fisicos.has(fruto.conteudo.fluxo) ? 'estamina' : 'mana';
    for (const poder of poderesDoFruto(fichaCom(fruto, true))) {
      assert.equal(poder.custo.recurso, esperado, `${fruto.id}/${poder.nome}`);
      assert.ok(poder.custo.valor > 0, `${fruto.id}/${poder.nome}: custo zerado`);
      assert.ok((RECURSOS_CUSTO_VALIDOS as readonly string[]).includes(poder.custo.recurso));
    }
    const rotulo = esperado === 'estamina' ? 'Estamina' : 'Mana';
    assert.match(fruto.conteudo.custo, new RegExp(rotulo), `${fruto.id}: o campo custo cita o recurso errado`);
    assert.ok(!(esperado === 'estamina' && /Mana/.test(fruto.conteudo.custo)), `${fruto.id}: custo mistura recursos`);
  }
});

test('o custo escrito na descrição bate com o custo do poder', () => {
  for (const fruto of frutosDeFluxo) {
    const rotulo = ['vitalidade', 'fisico'].includes(fruto.conteudo.fluxo) ? 'Estamina' : 'Mana';
    for (const poder of poderesDoFruto(fichaCom(fruto, true))) {
      assert.ok(
        fruto.conteudo.descricao.includes(`${poder.custo.valor} de ${rotulo}`),
        `${fruto.id}: a descrição não cita ${poder.custo.valor} de ${rotulo} (${poder.nome})`,
      );
    }
  }
});

test('o bônus de ficha do Fruto de Fluxo entra sozinho e o Despertar substitui, sem somar', () => {
  for (const fruto of frutosDeFluxo) {
    assert.equal(fruto.conteudo.efeitosFicha.length, fruto.conteudo.efeitosFichaDespertado.length);
    const base = efeitosFichaDoFruto(fichaCom(fruto, false));
    const despertado = efeitosFichaDoFruto(fichaCom(fruto, true));
    assert.equal(base.length, 1, `${fruto.id}: um bônus de identidade`);
    assert.equal(despertado.length, 1);
    assert.equal(despertado[0].valor, base[0].valor * 2, `${fruto.id}: o Despertar dobra o bônus`);
    assert.equal(habilidadeDoFruto(fichaCom(fruto, false)).length, 1, `${fruto.id}: a passiva aparece como habilidade`);
  }
});

test('só Vitalidade e Físico mexem em recurso; a Estamina máxima do Físico entra na conta', () => {
  const fisico = frutosDeFluxo.find((fruto) => fruto.conteudo.fluxo === 'fisico')!;
  const vitalidade = frutosDeFluxo.find((fruto) => fruto.conteudo.fluxo === 'vitalidade')!;
  assert.deepEqual(
    efeitosFichaDoFruto(fichaCom(fisico, false)).map((item) => [item.categoria, item.alvo, item.valor]),
    [['recurso', 'estaminaMaxima', 10]],
  );
  assert.deepEqual(
    efeitosFichaDoFruto(fichaCom(vitalidade, true)).map((item) => [item.categoria, item.alvo, item.valor]),
    [['recurso', 'vidaMaxima', 20]],
  );
});

test('o Fruto do Fim exige a autorização do Mestre, como todo acesso ao Fim', () => {
  const fim = frutosDeFluxo.find((fruto) => fruto.conteudo.fluxo === 'fim')!;
  assert.match(fim.conteudo.descricao, /autorização do Mestre/);
  assert.ok(fim.conteudo.preco['Fragmentos de Estrela'] >= 900);
});

test('os quatro Frutos físicos antigos gastam Estamina e os elementais e espaciais seguem em Mana', () => {
  const fisicos = ['fruto-dragao', 'fruto-tremor', 'fruto-colosso', 'fruto-quimera'];
  for (const id of fisicos) {
    const fruto = frutos.find((item) => item.id === id)!;
    const poderes = poderesDoFruto(fichaCom(fruto, true));
    assert.equal(poderes.length, 2, id);
    for (const poder of poderes) assert.equal(poder.custo.recurso, 'estamina', `${id}/${poder.nome}`);
    assert.ok(!/\d+ (de )?Mana/.test(fruto.conteudo.descricao), `${id}: a descrição ainda cobra Mana`);
    assert.ok(!/Mana/.test(fruto.conteudo.custo), `${id}: o campo custo ainda cita Mana`);
  }
  for (const id of ['fruto-chamas', 'fruto-gravidade', 'fruto-trovao', 'fruto-gelo', 'fruto-luz', 'fruto-fenix', 'fruto-portais', 'fruto-instante', 'fruto-espelho']) {
    const fruto = frutos.find((item) => item.id === id)!;
    for (const poder of poderesDoFruto(fichaCom(fruto, true))) assert.equal(poder.custo.recurso, 'mana', `${id}/${poder.nome}`);
  }
});

test('preços dos Frutos dos Fluxos ficam na faixa de 720 a 950 Fragmentos e em nenhuma outra moeda', () => {
  for (const fruto of frutosDeFluxo) {
    assert.deepEqual(Object.keys(fruto.conteudo.preco), ['Fragmentos de Estrela']);
    const valor = fruto.conteudo.preco['Fragmentos de Estrela'];
    assert.ok(valor >= 720 && valor <= 950, `${fruto.id}: ${valor}`);
  }
});
