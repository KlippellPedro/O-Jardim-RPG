import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CATEGORIAS_MATERIAL,
  ELEMENTOS_OFICIAIS,
  linhaRequisitoSatisfeita,
  REGRA_MATERIAIS,
  TODAS_PROPRIEDADES,
  type LinhaRequisito,
  type MaterialComprometido,
  type MaterialFicha,
  type ReceitaMaterial,
} from '../../data/regras/materiais.ts';
import {
  RECEITAS_MATERIAIS_COZINHEIRO,
  FORMULAS_MATERIAIS_ALQUIMISTA,
  PROJETOS_MATERIAIS_ENGENHEIRO,
} from '../../data/regras/receitas-materiais.ts';
import { RARIDADE_POR_COMPLEXIDADE_RITUAL, RITUAIS } from '../../data/regras/rituais.ts';
import {
  COMPONENTE_QUIMICO_POR_NIVEL_FORMULA,
  COMPONENTE_RITUALISTICO_POR_COMPLEXIDADE,
  MANTIMENTO_POR_NIVEL_RECEITA,
  SUCATA_POR_NIVEL_PROJETO,
  RECURSOS_MATERIAIS,
  raridadeComponentePorNivelFormula,
  requisitoComponentesRitual,
  raridadeMantimentoPorNivelReceita,
  raridadeSucataPorNivelProjeto,
  raridadeComponenteVeicular,
  custoManutencaoVeiculo,
  recursosDeUsos,
} from '../../data/regras/recursos-materiais.ts';

const catalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
) as { entradas: Array<{ tipo: string; id: string; titulo: string; conteudo: Record<string, unknown> }> };

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as Array<{ id: string; habilidades?: Array<{ id: string; opcoes?: Array<{ id: string; titulo: string; descricao: string }> }> }>;

const magias = JSON.parse(
  readFileSync(new URL('../../data/ficha/magias.json', import.meta.url), 'utf8'),
) as { rituais: Array<{ id: string; titulo: string; complexidade: string; efeito: string; ingredientes?: Array<{ item_id: string; quantidade: number }> }> };

const MATERIAIS_CATALOGO = catalogo.entradas.filter((item) => item.tipo === 'drop');
const MATERIAIS_IDS = MATERIAIS_CATALOGO.map((item) => item.id);

const MATERIAIS_PILOTO_IDS = [
  'drop-vampiro-orgaos',
  'drop-vampiro-essência',
  'comp-terra-fertil',
  'comp-sementes-viaveis',
  'comp-agua-pura',
  'comp-marco-de-pedra',
  'comp-receptor-inscrito',
  'comp-amostra-biologica',
  'comp-ervas-comuns',
  'comp-amostra-elemental',
] as const;

const MATERIAIS_FASE_5_IDS = [
  'mat-minerio-de-ferro',
  'mat-cobre-nativo',
  'mat-quartzo-estavel',
  'mat-sal-purificador',
  'mat-carvao-mineral',
  'mat-liga-de-aco',
  'mat-fio-condutor-isolado',
  'mat-vidro-alquimico',
  'mat-tecido-reforcado',
  'mat-carga-estabilizada',
  'mat-resina-vegetal',
  'mat-fibra-vegetal',
  'mat-musgo-absorvente',
  'mat-raiz-fortificante',
  'mat-flor-medicinal',
] as const;

const USOS_VALIDOS = new Set(['ritual', 'alquimia', 'engenharia', 'cozinha', 'veiculos', 'forja']);
const ESTADOS_VALIDOS = new Set(['bruto', 'processado', 'refinado']);
const AFINIDADES_VALIDAS = new Set([...ELEMENTOS_OFICIAIS, 'Nenhuma', 'Escolha na compra']);

function obterMaterial(id: string): MaterialFicha {
  const entrada = catalogo.entradas.find((item) => item.tipo === 'drop' && item.id === id);
  assert.ok(entrada, `material ausente do catálogo: ${id}`);
  return entrada.conteudo as unknown as MaterialFicha;
}

test('piloto possui dez materiais com ficha completa e valores oficiais', () => {
  assert.equal(new Set(MATERIAIS_PILOTO_IDS).size, 10);

  for (const id of MATERIAIS_PILOTO_IDS) {
    const material = obterMaterial(id);
    assert.ok(CATEGORIAS_MATERIAL.includes(material.categoria), `${id}: categoria inválida`);
    assert.ok(material.origem.trim().length > 0, `${id}: origem ausente`);
    assert.ok(Number.isInteger(material.potencia) && material.potencia >= 1 && material.potencia <= 5, `${id}: potência inválida`);
    assert.ok(AFINIDADES_VALIDAS.has(material.afinidade), `${id}: afinidade inválida`);
    assert.ok(material.propriedades.length >= 1 && material.propriedades.length <= 3, `${id}: quantidade de propriedades fora da diretriz`);
    assert.ok(material.propriedades.every((propriedade) => TODAS_PROPRIEDADES.includes(propriedade)), `${id}: propriedade fora da lista fechada`);
    assert.ok(material.usos.length > 0 && material.usos.every((uso) => USOS_VALIDOS.has(uso)), `${id}: uso inválido`);
    assert.ok(ESTADOS_VALIDOS.has(material.estadoBase), `${id}: estado inválido`);
    assert.equal('qualidade' in material, false, `${id}: qualidade pertence à pilha, não ao catálogo`);
  }
});

test('piloto cobre as seis categorias compartilhadas pelas classes', () => {
  const categorias = new Set(MATERIAIS_PILOTO_IDS.map((id) => obterMaterial(id).categoria));
  assert.deepEqual([...categorias].sort(), [...CATEGORIAS_MATERIAL].sort());
});

test('afinidade elemental não é inferida por associação temática', () => {
  assert.equal(obterMaterial('comp-agua-pura').afinidade, 'Nenhuma');
  assert.equal(obterMaterial('comp-terra-fertil').afinidade, 'Nenhuma');
  assert.equal(obterMaterial('comp-amostra-elemental').afinidade, 'Escolha na compra');
});

test('catálogo expandido entrega ficha completa para os 259 materiais', () => {
  assert.equal(MATERIAIS_CATALOGO.length, 259);
  assert.equal(new Set(MATERIAIS_IDS).size, 259);

  for (const id of MATERIAIS_IDS) {
    const material = obterMaterial(id);
    assert.ok(CATEGORIAS_MATERIAL.includes(material.categoria), `${id}: categoria inválida`);
    assert.ok(material.origem.trim().length > 0, `${id}: origem ausente`);
    assert.ok(Number.isInteger(material.potencia) && material.potencia >= 1 && material.potencia <= 5, `${id}: potência inválida`);
    assert.ok(AFINIDADES_VALIDAS.has(material.afinidade), `${id}: afinidade inválida`);
    assert.ok(material.propriedades.length >= 1 && material.propriedades.length <= 3, `${id}: propriedades fora da diretriz`);
    assert.ok(material.propriedades.every((propriedade) => TODAS_PROPRIEDADES.includes(propriedade)), `${id}: propriedade fora da lista fechada`);
    assert.ok(material.usos.length > 0 && material.usos.every((uso) => USOS_VALIDOS.has(uso)), `${id}: uso inválido`);
    assert.ok(ESTADOS_VALIDOS.has(material.estadoBase), `${id}: estado inválido`);
    assert.equal('qualidade' in material, false, `${id}: qualidade pertence à pilha`);
  }
});

test('Fase 5 adiciona cinco materiais Minerais, cinco Artificiais e cinco Botânicos', () => {
  assert.equal(new Set(MATERIAIS_FASE_5_IDS).size, 15);
  const quantidades = new Map<string, number>();

  for (const id of MATERIAIS_FASE_5_IDS) {
    const material = obterMaterial(id);
    quantidades.set(material.categoria, (quantidades.get(material.categoria) ?? 0) + 1);
    assert.equal(material.afinidade, 'Nenhuma', `${id}: afinidade não deve ser inferida`);
  }

  assert.deepEqual(Object.fromEntries(quantidades), {
    Mineral: 5,
    Artificial: 5,
    'Botânico': 5,
  });
  assert.deepEqual(obterMaterial('mat-liga-de-aco').propriedades, ['Resistente']);
  assert.deepEqual(obterMaterial('mat-carga-estabilizada').propriedades, ['Explosivo', 'Estável']);
  assert.deepEqual(obterMaterial('mat-raiz-fortificante').usos, ['alquimia']);
});

function opcaoDeClasse(classeId: string, habilidadeId: string, opcaoId: string) {
  const classe = classes.find((item) => item.id === classeId);
  const habilidade = classe?.habilidades?.find((item) => item.id === habilidadeId);
  return habilidade?.opcoes?.find((item) => item.id === opcaoId);
}

function materialComprometido(id: string): MaterialComprometido {
  return {
    materialId: id,
    material: obterMaterial(id),
    qualidade: 'padrao',
  };
}

function linhaPossuiSolucaoNoCatalogo(linha: LinhaRequisito): boolean {
  for (const id of MATERIAIS_IDS) {
    const candidato = materialComprometido(id);
    const potenciaNecessaria = linha.propriedade?.valorMinimo ?? 0;
    const unidadesPorPotencia = potenciaNecessaria > 0
      ? Math.ceil(potenciaNecessaria / candidato.material.potencia)
      : 0;
    const unidades = Math.max(linha.quantidade, unidadesPorPotencia, 1);
    const teto = linha.maxUnidades ?? 3;
    if (unidades <= teto && linhaRequisitoSatisfeita(linha, Array.from({ length: unidades }, () => candidato))) {
      return true;
    }
  }
  return false;
}

test('Fase 4 adapta todos os rituais com ingredientes e preserva os pilotos das classes', () => {
  const rituaisComIngredientes = magias.rituais.filter((ritual) => ritual.ingredientes?.length);
  assert.equal(RITUAIS.length, rituaisComIngredientes.length);
  assert.equal(RITUAIS.length, 31);
  assert.equal(FORMULAS_MATERIAIS_ALQUIMISTA.length, 20);
  assert.equal(PROJETOS_MATERIAIS_ENGENHEIRO.length, 20);
  assert.equal(RECEITAS_MATERIAIS_COZINHEIRO.length, 20);

  for (const receitas of [RITUAIS, FORMULAS_MATERIAIS_ALQUIMISTA, PROJETOS_MATERIAIS_ENGENHEIRO, RECEITAS_MATERIAIS_COZINHEIRO]) {
    assert.equal(new Set(receitas.map((receita) => receita.id)).size, receitas.length);
    assert.ok(receitas.every((receita) => receita.linhas.length > 0 && receita.efeito.trim().length > 0));
  }
});

test('receitas apontam para efeitos que já existem nas fontes canônicas', () => {
  for (const receita of RITUAIS) {
    const ritual = magias.rituais.find((item) => item.id === receita.id);
    assert.ok(ritual, `ritual sem fonte canônica: ${receita.id}`);
    assert.equal(receita.titulo, ritual.titulo);
    assert.equal(receita.efeito, ritual.efeito);
    assert.equal(receita.raridade, RARIDADE_POR_COMPLEXIDADE_RITUAL[ritual.complexidade]);
    assert.deepEqual(
      receita.linhas.map((linha) => [linha.materialId, linha.quantidade]),
      ritual.ingredientes?.map((ingrediente) => [ingrediente.item_id, ingrediente.quantidade]),
    );
  }

  for (const receita of FORMULAS_MATERIAIS_ALQUIMISTA) {
    const formula = opcaoDeClasse('alquimista', 'formulas', receita.id);
    assert.ok(formula, `fórmula sem fonte canônica: ${receita.id}`);
    assert.equal(receita.titulo, formula.titulo);
    assert.equal(receita.efeito, formula.descricao);
  }

  for (const receita of PROJETOS_MATERIAIS_ENGENHEIRO) {
    const projeto = opcaoDeClasse('engenheiro', 'engenhocas', receita.id);
    assert.ok(projeto, `projeto sem fonte canônica: ${receita.id}`);
    assert.equal(receita.titulo, projeto.titulo);
    assert.ok(receita.efeito.startsWith(projeto.descricao));
  }

  for (const receita of RECEITAS_MATERIAIS_COZINHEIRO) {
    const prato = opcaoDeClasse('cozinheiro', 'cardapio', receita.id);
    assert.ok(prato, `receita sem fonte canônica: ${receita.id}`);
    assert.equal(receita.titulo, prato.titulo);
    assert.equal(receita.efeito, prato.descricao);
  }
});

test('toda linha de receita pode ser satisfeita pelos materiais disponíveis', () => {
  const receitas: ReceitaMaterial[] = [
    ...RITUAIS,
    ...FORMULAS_MATERIAIS_ALQUIMISTA,
    ...PROJETOS_MATERIAIS_ENGENHEIRO,
    ...RECEITAS_MATERIAIS_COZINHEIRO,
  ];

  for (const receita of receitas) {
    for (const linha of receita.linhas) {
      assert.ok(linhaPossuiSolucaoNoCatalogo(linha), `${receita.id}/${linha.id}: sem solução no catálogo`);
      if (linha.materialId) assert.ok(MATERIAIS_IDS.includes(linha.materialId), `${receita.id}: material nomeado ausente`);
    }
  }
});

test('catálogo inteiro converte para os seis estoques simplificados', () => {
  assert.equal(RECURSOS_MATERIAIS.length, 6);
  for (const entrada of MATERIAIS_CATALOGO) {
    const material = entrada.conteudo as unknown as MaterialFicha;
    assert.ok(recursosDeUsos(material.usos).length > 0, `${entrada.id}: sem estoque genérico`);
  }
});

test('preparos temporários das classes cobram um único lote por descanso', () => {
  const preparos = [
    ...FORMULAS_MATERIAIS_ALQUIMISTA,
    ...PROJETOS_MATERIAIS_ENGENHEIRO,
    ...RECEITAS_MATERIAIS_COZINHEIRO,
  ];
  assert.ok(preparos.every((receita) => receita.modoPreparo === 'estoque-da-classe'));
  assert.ok(preparos.every((receita) => receita.linhas.length === 1));
  assert.ok(preparos.every((receita) => receita.linhas[0].propriedade?.valorMinimo === 1));
  assert.ok(preparos.every((receita) => receita.custoRecurso?.quantidade === 1));
  assert.ok(preparos.every((receita) => receita.custoRecurso?.escopo === 'por-descanso'));
  assert.match(REGRA_MATERIAIS.corpo, /seis estoques/i);
  assert.match(REGRA_MATERIAIS.corpo, /um único estoque/i);
});

test('rituais usam somente Componentes Ritualísticos e custo por complexidade', () => {
  for (const receita of RITUAIS) {
    const fonte = magias.rituais.find((ritual) => ritual.id === receita.id)!;
    const esperado = fonte.complexidade === 'grandioso' || fonte.complexidade === 'monumental' ? 2 : 1;
    assert.equal(receita.custoRecurso?.recurso, 'componentes-ritualisticos');
    assert.equal(receita.custoRecurso?.quantidade, esperado);
    assert.equal(receita.custoRecurso?.escopo, 'por-ritual');
  }
});

test('complexidade do ritual define quantidade e raridade sem usar círculos', () => {
  assert.deepEqual(
    COMPONENTE_RITUALISTICO_POR_COMPLEXIDADE.map((faixa) => [faixa.complexidade, faixa.quantidade, faixa.raridade]),
    [
      ['simples', 1, 'incomum'],
      ['complexo', 1, 'raro'],
      ['grandioso', 2, 'epico'],
      ['monumental', 2, 'lendario'],
    ],
  );
  assert.equal(requisitoComponentesRitual('simples').raridade, 'incomum');
  assert.equal(requisitoComponentesRitual('MONUMENTAL').quantidade, 2);
  assert.throws(() => requisitoComponentesRitual('círculo 1'), /Complexidade de ritual inválida/);
  assert.match(REGRA_MATERIAIS.corpo, /Rituais não têm círculo nem nível/i);
  assert.match(REGRA_MATERIAIS.corpo, /Simples<\/td><td>1 Incomum/);
  assert.match(REGRA_MATERIAIS.corpo, /Monumental<\/td><td>2 Lendários/);
});

test('raridade química acompanha os cinco níveis da fórmula sem permitir atalho comum', () => {
  assert.deepEqual(
    COMPONENTE_QUIMICO_POR_NIVEL_FORMULA.map((faixa) => [faixa.nivelFormula, faixa.raridade]),
    [[1, 'comum'], [2, 'incomum'], [3, 'raro'], [4, 'epico'], [5, 'lendario']],
  );
  assert.equal(raridadeComponentePorNivelFormula(0), 'comum');
  assert.equal(raridadeComponentePorNivelFormula(3), 'raro');
  assert.equal(raridadeComponentePorNivelFormula(99), 'lendario');
  assert.ok(FORMULAS_MATERIAIS_ALQUIMISTA.every((receita) => receita.custoRecurso?.progressaoRaridade === 'nivel-formula-alquimista'));
  assert.match(REGRA_MATERIAIS.corpo, /Água Pura Comum abastece fórmulas de nível 1/i);
  assert.match(REGRA_MATERIAIS.corpo, /não podem ser somados/i);
});

test('raridade dos Mantimentos acompanha os cinco níveis das receitas do Chef', () => {
  assert.deepEqual(
    MANTIMENTO_POR_NIVEL_RECEITA.map((faixa) => [faixa.nivelReceita, faixa.raridade]),
    [[1, 'comum'], [2, 'incomum'], [3, 'raro'], [4, 'epico'], [5, 'lendario']],
  );
  assert.equal(raridadeMantimentoPorNivelReceita(0), 'comum');
  assert.equal(raridadeMantimentoPorNivelReceita(3), 'raro');
  assert.equal(raridadeMantimentoPorNivelReceita(99), 'lendario');
  assert.ok(RECEITAS_MATERIAIS_COZINHEIRO.every((receita) => receita.custoRecurso?.progressaoRaridade === 'nivel-receita-cozinheiro'));
  assert.match(REGRA_MATERIAIS.corpo, /Quando os Mantimentos aumentam/i);
});

test('raridade da Sucata acompanha os cinco níveis dos projetos do Engenheiro', () => {
  assert.deepEqual(
    SUCATA_POR_NIVEL_PROJETO.map((faixa) => [faixa.nivelProjeto, faixa.raridade]),
    [[1, 'comum'], [2, 'incomum'], [3, 'raro'], [4, 'epico'], [5, 'lendario']],
  );
  assert.equal(raridadeSucataPorNivelProjeto(0), 'comum');
  assert.equal(raridadeSucataPorNivelProjeto(3), 'raro');
  assert.equal(raridadeSucataPorNivelProjeto(99), 'lendario');
  assert.ok(PROJETOS_MATERIAIS_ENGENHEIRO.every((receita) => receita.custoRecurso?.progressaoRaridade === 'nivel-projeto-engenheiro'));
  assert.match(REGRA_MATERIAIS.corpo, /Quando a Sucata aumenta/i);
});

test('manutenção veicular usa a raridade do veículo e soma as utilidades instaladas', () => {
  assert.equal(raridadeComponenteVeicular('comum'), 'comum');
  assert.equal(raridadeComponenteVeicular('epico'), 'epico');
  assert.equal(raridadeComponenteVeicular('reliquia'), 'lendario');
  assert.equal(custoManutencaoVeiculo(0), 1);
  assert.equal(custoManutencaoVeiculo(2), 3);
  assert.equal(custoManutencaoVeiculo(-4), 1);
  assert.match(REGRA_MATERIAIS.corpo, /1 lote pelo veículo/i);
  assert.match(REGRA_MATERIAIS.corpo, /módulo de utilidade instalado/i);
  assert.match(REGRA_MATERIAIS.corpo, /custo atrasado não acumula/i);
});

function normalizarTitulo(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

test('lootIds liga somente correspondências textuais existentes, sem inventar drops', () => {
  const idPorTitulo = new Map(MATERIAIS_CATALOGO.map((item) => [normalizarTitulo(item.titulo), item.id]));
  const monstros = catalogo.entradas.filter((item) => item.tipo === 'monstro');

  for (const monstro of monstros) {
    const conteudo = monstro.conteudo as { loot?: string[]; lootIds?: string[] };
    const esperados = [...new Set((conteudo.loot ?? [])
      .map((loot) => loot.replace(/\s*\([^)]*\)\s*$/, ''))
      .map((loot) => idPorTitulo.get(normalizarTitulo(loot)))
      .filter((id): id is string => Boolean(id)))];
    assert.deepEqual(conteudo.lootIds ?? [], esperados, `${monstro.id}: lootIds não corresponde ao loot textual`);
    assert.ok((conteudo.lootIds ?? []).every((id) => MATERIAIS_IDS.includes(id)));
  }
});
