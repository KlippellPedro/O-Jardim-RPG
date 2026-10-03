import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formaAtualDoItem,
  idCatalogoDoItem,
  normalizarEfeitosEquipamento,
  normalizarFormasItem,
  progressoDosConjuntos,
  resumirEquipamentos,
  rotuloEfeitoEquipamento,
} from '../../src/services/equipamentoService.ts';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService.ts';
import { CONJUNTOS_EQUIPAMENTO, conjuntoDaPeca } from '../../data/regras/conjuntos.ts';
import { RARIDADES_EQUIPAMENTO } from '../../data/regras/raridadesEquipamentos.ts';

const catalogo = (await import('../../data/loja/catalogo.json', { with: { type: 'json' } })).default as any;
const entradas = catalogo.entradas as any[];
const porId = new Map(entradas.map((entrada) => [entrada.id, entrada]));

const classeId = CLASSES_CATALOGO[0].id;
/** Uma ficha cujo nível total é `nivel`, repartido numa só classe. */
const fichaNivel = (nivel: number) => ({ atributosFinais: { forca: 10 }, classes: [{ classeId, nivel }] });

const efeito = (categoria: string, alvo: string, valor: number, modo = 'bonus') => ({ categoria, alvo, valor, modo });

const itemComFormas = (extra: Record<string, unknown> = {}) => ({
  item_id: 'artefato-teste',
  titulo: 'Anel de Teste',
  quantidade: 1,
  dados: {
    tipo: 'artefato',
    categoria: 'geral',
    equipado: true,
    formas: [
      { nivel: 1, titulo: 'Primeira', descricao: '', efeitos: [efeito('pericia', 'vontade', 1)] },
      { nivel: 10, titulo: 'Segunda', descricao: '', efeitos: [efeito('pericia', 'vontade', 2), efeito('recurso', 'sanidadeMaxima', 5)] },
      { nivel: 20, titulo: 'Terceira', descricao: '', efeitos: [efeito('pericia', 'vontade', 3)] },
    ],
    ...extra,
  },
});

test('formas são ordenadas por nível, descartam nível inválido e ganham ids estáveis', () => {
  const formas = normalizarFormasItem([
    { nivel: 20, titulo: 'C', efeitos: [efeito('pericia', 'vontade', 3)] },
    { nivel: 0, titulo: 'inválida', efeitos: [] },
    { nivel: 'x', titulo: 'inválida também' },
    { nivel: 1, titulo: 'A', efeitos: [efeito('pericia', 'vontade', 1)] },
  ]);
  assert.deepEqual(formas.map((forma) => forma.titulo), ['A', 'C']);
  assert.equal(formas[0].efeitos[0].id, 'forma-1-0');
  assert.deepEqual(normalizarFormasItem(undefined), []);
});

test('a forma de agora é a de maior nível alcançado e a próxima é a seguinte', () => {
  const formas = normalizarFormasItem(itemComFormas().dados.formas);
  assert.equal(formaAtualDoItem(formas, 1).atual?.titulo, 'Primeira');
  assert.equal(formaAtualDoItem(formas, 9).atual?.titulo, 'Primeira');
  assert.equal(formaAtualDoItem(formas, 10).atual?.titulo, 'Segunda');
  assert.equal(formaAtualDoItem(formas, 10).proxima?.titulo, 'Terceira');
  assert.equal(formaAtualDoItem(formas, 99).atual?.titulo, 'Terceira');
  assert.equal(formaAtualDoItem(formas, 99).proxima, undefined);
  assert.equal(formaAtualDoItem(formas, 0).atual?.titulo, 'Primeira');
});

test('a ficha aplica só a forma de agora, e ela substitui a anterior em vez de somar', () => {
  const nivel1 = resumirEquipamentos([itemComFormas()], fichaNivel(1));
  assert.equal(nivel1.bonusPericias.vontade, 1);
  assert.equal(nivel1.bonusRecursos.sanidadeMaxima, undefined);

  const nivel12 = resumirEquipamentos([itemComFormas()], fichaNivel(12));
  assert.equal(nivel12.bonusPericias.vontade, 2);
  assert.equal(nivel12.bonusRecursos.sanidadeMaxima, 5);

  const nivel25 = resumirEquipamentos([itemComFormas()], fichaNivel(25));
  assert.equal(nivel25.bonusPericias.vontade, 3);
  assert.equal(nivel25.bonusRecursos.sanidadeMaxima, undefined);
  assert.equal(nivel25.formas[0].atual.titulo, 'Terceira');
  assert.equal(nivel25.efeitosAtivos[0].origem, 'Forma: Terceira');
});

test('forma só vale com o item equipado e sem passar do limite de itens especiais', () => {
  const guardado = resumirEquipamentos([itemComFormas({ equipado: false })], fichaNivel(12));
  assert.deepEqual(guardado.bonusPericias, {});
  assert.deepEqual(guardado.formas, []);

  // No nível 1 só cabe uma vaga especial: a segunda peça equipada fica inativa.
  const segundo = { ...itemComFormas(), item_id: 'artefato-teste-2', titulo: 'Segundo Anel' };
  const excedente = resumirEquipamentos([itemComFormas(), segundo], fichaNivel(1));
  assert.equal(excedente.bonusPericias.vontade, 1);
  assert.equal(excedente.formas.length, 1);
});

test('efeito negativo e desvantagem da forma entram na conta como custo', () => {
  const item = {
    item_id: 'artefato-custo',
    titulo: 'Colar de Teste',
    quantidade: 1,
    dados: {
      tipo: 'artefato',
      categoria: 'geral',
      equipado: true,
      formas: [{
        nivel: 1,
        titulo: 'Fio',
        efeitos: [efeito('recurso', 'vidaMaxima', 10), efeito('recurso', 'sanidadeMaxima', -10), efeito('pericia', 'percepcao', 1, 'desvantagem')],
      }],
    },
  };
  const resumo = resumirEquipamentos([item], fichaNivel(1));
  assert.equal(resumo.bonusRecursos.vidaMaxima, 10);
  assert.equal(resumo.bonusRecursos.sanidadeMaxima, -10);
  assert.equal(resumo.desvantagens.percepcao, 1);
});

const pecaEquipada = (id: string, equipado = true, extra: Record<string, unknown> = {}) => ({
  item_id: id,
  titulo: id,
  quantidade: 1,
  dados: { categoria: 'geral', equipado, catalogo_item_id: id, ...extra },
});

test('bônus de conjunto são cumulativos e dependem das peças equipadas', () => {
  const sentinela = CONJUNTOS_EQUIPAMENTO.find((conjunto) => conjunto.id === 'sentinela')!;
  const ids = sentinela.pecas.map((peca) => peca.id);

  const umaPeca = resumirEquipamentos([pecaEquipada(ids[0])], fichaNivel(1));
  assert.deepEqual(umaPeca.bonusCombate, {});
  assert.equal(umaPeca.conjuntos[0].equipadas.length, 1);
  assert.equal(umaPeca.conjuntos[0].proximo?.pecas, 2);

  const duas = resumirEquipamentos(ids.slice(0, 2).map((id) => pecaEquipada(id)), fichaNivel(1));
  assert.equal(duas.bonusCombate.iniciativa, 1);
  assert.equal(duas.bonusCombate.defesa, undefined);

  const tres = resumirEquipamentos(ids.slice(0, 3).map((id) => pecaEquipada(id)), fichaNivel(1));
  assert.equal(tres.bonusCombate.iniciativa, 1);
  assert.equal(tres.bonusCombate.defesa, 1);
  assert.equal(tres.vantagens.percepcao, undefined);

  const todas = resumirEquipamentos(ids.map((id) => pecaEquipada(id)), fichaNivel(1));
  assert.equal(todas.vantagens.percepcao, 1);
  assert.equal(todas.conjuntos[0].proximo, undefined);
  assert.equal(todas.efeitosAtivos.filter((item) => item.itemId === 'conjunto:sentinela').length, 3);
});

test('peça guardada não conta, peça repetida conta uma vez e o sufixo de raridade não atrapalha', () => {
  const caminhante = CONJUNTOS_EQUIPAMENTO.find((conjunto) => conjunto.id === 'caminhante')!;
  const [a, b] = caminhante.pecas.map((peca) => peca.id);

  const guardada = resumirEquipamentos([pecaEquipada(a), pecaEquipada(b, false)], fichaNivel(1));
  assert.deepEqual(guardada.bonusRecursos, {});

  const repetida = resumirEquipamentos([pecaEquipada(a), { ...pecaEquipada(a), item_id: `${a}::raridade::raro` }], fichaNivel(1));
  assert.deepEqual(repetida.bonusRecursos, {});
  assert.equal(repetida.conjuntos[0].equipadas.length, 1);

  assert.equal(idCatalogoDoItem({ item_id: `${a}::raridade::raro` }), a);
  assert.equal(idCatalogoDoItem({ item_id: 'x', dados: { catalogo_item_id: a } }), a);

  const completo = resumirEquipamentos([pecaEquipada(a), pecaEquipada(b)], fichaNivel(1));
  assert.equal(completo.bonusRecursos.estaminaMaxima, 5);
});

test('progressoDosConjuntos ignora conjuntos sem peça equipada', () => {
  assert.deepEqual(progressoDosConjuntos([]), []);
  assert.deepEqual(progressoDosConjuntos(['qualquer-coisa']), []);
});

test('rótulo do efeito sai como o jogador lê', () => {
  assert.equal(rotuloEfeitoEquipamento({ categoria: 'pericia', alvo: 'fortitude', modo: 'bonus', valor: 1 }), '+1 em Fortitude');
  assert.equal(rotuloEfeitoEquipamento({ categoria: 'recurso', alvo: 'sanidadeMaxima', modo: 'bonus', valor: -10 }), '−10 de Sanidade máxima');
  assert.equal(rotuloEfeitoEquipamento({ categoria: 'combate', alvo: 'movimento', modo: 'bonus', valor: 1.5 }), '+1,5 m de Movimento');
  assert.equal(rotuloEfeitoEquipamento({ categoria: 'pericia', alvo: 'percepcao', modo: 'vantagem', valor: 1 }), 'vantagem em Percepção');
  assert.equal(rotuloEfeitoEquipamento({ categoria: 'pericia', alvo: 'percepcao', modo: 'desvantagem', valor: 1 }), 'desvantagem em Percepção');
});

// ---- Integridade do catálogo e dos conjuntos ----

const comFormas = entradas.filter((entrada) => Array.isArray(entrada.conteudo.formas));
const normalizar = (valor: unknown) => String(valor ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const regraDe = (entrada: any) => RARIDADES_EQUIPAMENTO.find((regra) => regra.id === normalizar(entrada.conteudo.raridade))!;

test('toda forma do catálogo é válida: níveis crescentes, nada descartado pelo normalizador', () => {
  assert.ok(comFormas.length >= 17, `esperava pelo menos 17 itens com formas, achei ${comFormas.length}`);
  for (const entrada of comFormas) {
    const brutas = entrada.conteudo.formas as any[];
    const normalizadas = normalizarFormasItem(brutas);
    assert.equal(normalizadas.length, brutas.length, `${entrada.id}: forma descartada pelo normalizador`);
    assert.equal(normalizadas[0].nivel, 1, `${entrada.id}: a primeira forma precisa ser do nível 1`);
    assert.deepEqual(brutas.map((forma) => forma.nivel), normalizadas.map((forma) => forma.nivel), `${entrada.id}: níveis fora de ordem ou repetidos`);
    assert.equal(new Set(brutas.map((forma) => forma.nivel)).size, brutas.length, `${entrada.id}: nível repetido`);
    brutas.forEach((forma) => {
      assert.ok(forma.titulo?.trim(), `${entrada.id}: forma sem título`);
      assert.ok(forma.descricao?.trim(), `${entrada.id}: forma sem descrição`);
      assert.equal(
        normalizarEfeitosEquipamento(forma.efeitos).length, forma.efeitos.length,
        `${entrada.id}: efeito inválido na forma do nível ${forma.nivel}`,
      );
    });
  }
});

test('formas respeitam o orçamento da raridade: efeitos que ajudam e valor por efeito', () => {
  for (const entrada of comFormas.filter((item) => item.tipo === 'artefato')) {
    const regra = regraDe(entrada);
    for (const forma of entrada.conteudo.formas as any[]) {
      const ajudam = forma.efeitos.filter((e: any) => (e.modo ?? 'bonus') === 'vantagem' || (e.modo ?? 'bonus') === 'bonus' && e.valor > 0);
      assert.ok(ajudam.length <= regra.efeitosRaridadeMaximos, `${entrada.id} nível ${forma.nivel}: ${ajudam.length} efeitos que ajudam, a raridade comporta ${regra.efeitosRaridadeMaximos}`);
      for (const e of forma.efeitos) {
        // Recursos têm escala própria (Vida +5 já é atalho da ficha): o teto vale para o resto.
        if (e.categoria === 'recurso') continue;
        assert.ok(Math.abs(e.valor) <= regra.valorMaximoPorEfeito, `${entrada.id} nível ${forma.nivel}: ${rotuloEfeitoEquipamento(e)} passa de ±${regra.valorMaximoPorEfeito}`);
      }
    }
  }
});

test('item de dilema declara o preço e paga ao menos um custo automático em cada forma', () => {
  const dilemas = entradas.filter((entrada) => entrada.conteudo.dilema);
  assert.ok(dilemas.length >= 3);
  for (const entrada of dilemas) {
    assert.ok(entrada.conteudo.descricao.includes(entrada.conteudo.dilema), `${entrada.id}: a descrição precisa trazer o preço`);
    for (const forma of entrada.conteudo.formas as any[]) {
      const custos = forma.efeitos.filter((e: any) => e.modo === 'desvantagem' || e.valor < 0);
      assert.ok(custos.length > 0, `${entrada.id} nível ${forma.nivel}: sem custo automático`);
    }
  }
});

test('itens com formas contam como artefato (usam vaga) ou são peças de conjunto', () => {
  for (const entrada of comFormas) {
    const ehPeca = Boolean(entrada.conteudo.conjunto);
    assert.ok(entrada.tipo === 'artefato' || ehPeca, `${entrada.id}: item com formas fora do limite de itens especiais`);
  }
});

test('texto dos itens com formas diz o que a ficha aplica', () => {
  for (const entrada of comFormas) {
    const { descricao, formas } = entrada.conteudo;
    for (const forma of formas) {
      for (const e of forma.efeitos) {
        assert.ok(descricao.includes(rotuloEfeitoEquipamento(e)), `${entrada.id}: a descrição não cita "${rotuloEfeitoEquipamento(e)}"`);
      }
    }
  }
});

test('texto dos itens novos segue o tom da mesa: sem travessão e sem a palavra eco', () => {
  for (const entrada of comFormas) {
    const texto = JSON.stringify(entrada.conteudo);
    assert.doesNotMatch(texto, /[—–]/, `${entrada.id} tem travessão`);
    assert.doesNotMatch(texto, /\beco\b/i, `${entrada.id} usa a palavra eco`);
  }
  for (const conjunto of CONJUNTOS_EQUIPAMENTO) {
    const texto = JSON.stringify(conjunto);
    assert.doesNotMatch(texto, /[—–]/, `${conjunto.id} tem travessão`);
  }
});

test('conjuntos: toda peça existe no catálogo, aponta de volta e o bônus cresce com as peças', () => {
  const idsVistos = new Set<string>();
  for (const conjunto of CONJUNTOS_EQUIPAMENTO) {
    assert.ok(conjunto.pecas.length >= 3, `${conjunto.id}: conjunto precisa de pelo menos 3 peças`);
    assert.ok(conjunto.bonus.length >= 2, `${conjunto.id}: precisa de pelo menos 2 patamares de bônus`);
    for (const peca of conjunto.pecas) {
      assert.ok(!idsVistos.has(peca.id), `${peca.id}: peça em dois conjuntos`);
      idsVistos.add(peca.id);
      const entrada = porId.get(peca.id);
      assert.ok(entrada, `${conjunto.id}: peça ${peca.id} não existe no catálogo`);
      assert.equal(entrada.titulo, peca.titulo, `${peca.id}: nome diferente do catálogo`);
      assert.equal(entrada.conteudo.conjunto, conjunto.id, `${peca.id}: não aponta de volta para ${conjunto.id}`);
      assert.equal(entrada.tipo, 'equipamento', `${peca.id}: peça de conjunto precisa ser equipamento não configurável`);
      assert.equal(conjuntoDaPeca(peca.id)?.id, conjunto.id);
    }
    const patamares = conjunto.bonus.map((bonus) => bonus.pecas);
    assert.deepEqual(patamares, [...patamares].sort((a, b) => a - b), `${conjunto.id}: patamares fora de ordem`);
    assert.equal(new Set(patamares).size, patamares.length, `${conjunto.id}: patamar repetido`);
    assert.ok(patamares.every((valor) => valor >= 2 && valor <= conjunto.pecas.length), `${conjunto.id}: patamar fora de 2 até o total de peças`);
    assert.equal(patamares[patamares.length - 1], conjunto.pecas.length, `${conjunto.id}: o último bônus precisa ser o do conjunto completo`);
    for (const bonus of conjunto.bonus) {
      assert.ok(bonus.descricao.trim() && bonus.efeitos.length > 0, `${conjunto.id}: bônus de ${bonus.pecas} peças vazio`);
      assert.equal(normalizarEfeitosEquipamento(bonus.efeitos).length, bonus.efeitos.length, `${conjunto.id}: efeito inválido`);
    }
  }
  // Toda peça marcada no catálogo pertence a um conjunto conhecido.
  for (const entrada of entradas.filter((item) => item.conteudo.conjunto)) {
    assert.ok(idsVistos.has(entrada.id), `${entrada.id}: marca um conjunto que não lista a peça`);
  }
});

test('peças de conjunto têm um efeito próprio de valor 1 e preço de incomum', () => {
  for (const conjunto of CONJUNTOS_EQUIPAMENTO) {
    for (const peca of conjunto.pecas) {
      const entrada = porId.get(peca.id);
      assert.equal(normalizar(entrada.conteudo.raridade), 'incomum');
      const forma = entrada.conteudo.formas[0];
      assert.equal(entrada.conteudo.formas.length, 1);
      assert.equal(forma.efeitos.length, 1);
      assert.equal(Math.abs(forma.efeitos[0].valor), 1);
    }
  }
});
