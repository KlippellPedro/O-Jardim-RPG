import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import catalogoLoja from '../../data/loja/catalogo.json';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { calcularDerivadosComClasses } from '../../src/services/calculoService';
import { aumentosAtributoPorNivel } from '../../src/services/progressaoNiveis';
import {
  ATRIBUTOS_DE_REFERENCIA,
  ATRIBUTO_PRINCIPAL_BASE,
  CLASSE_NEUTRA,
  NIVEIS_DE_REFERENCIA,
  atributosDoNpcDeReferencia,
  classesDeReferencia,
  derivadosDeReferencia,
  mediaDeDados,
  melhorDanoDeArmaAteONivel,
  referenciaDoNivel,
  type IArmaDeReferencia,
} from '../../src/services/referenciaBalanceamento';

const guerreiro = CLASSES_CATALOGO.find((classe) => classe.id === 'guerreiro')!;
const comuns = CLASSES_CATALOGO.filter((classe) => classe.categoria === 'padrao');
const armas: IArmaDeReferencia[] = (catalogoLoja.entradas as any[])
  .filter((entrada) => entrada.tipo === 'arma')
  .map((entrada) => ({
    nivelRecomendado: entrada.conteudo.nivel_recomendado || null,
    raridade: entrada.conteudo.raridade,
    mediaNormal: mediaDeDados(entrada.conteudo.dano),
  }));

test('a referência das classes usa a fórmula da ficha, sem cópia que descole', () => {
  const direto = (nivel: number) => calcularDerivadosComClasses(
    ATRIBUTOS_DE_REFERENCIA, null, [{ classeId: 'guerreiro', nivel }], CLASSES_CATALOGO, nivel, {},
  );
  for (const nivel of [1, 5, 20, 40]) {
    const referencia = derivadosDeReferencia(guerreiro, nivel);
    assert.equal(referencia.vida, direto(nivel).vida, `Vida no nível ${nivel}`);
    assert.equal(referencia.mana, direto(nivel).mana);
    assert.equal(referencia.estamina, direto(nivel).estamina);
    assert.equal(referencia.defesaNatural, direto(nivel).defesaNatural);
  }
  // Guerreiro (5 Vida, 1 Mana, 3 Estamina) no nível 20, com os atributos de referência.
  assert.deepEqual(derivadosDeReferencia(guerreiro, 20), { vida: 108, mana: 20, estamina: 66, defesaNatural: 22 });
});

test('depois do teto da classe entram níveis de uma classe neutra que gasta os 9 pontos por igual', () => {
  assert.equal(CLASSE_NEUTRA.vida + CLASSE_NEUTRA.mana + Number(CLASSE_NEUTRA.estamina), 9);
  assert.deepEqual(classesDeReferencia(guerreiro, 30), [{ classeId: 'guerreiro', nivel: 30 }]);
  assert.deepEqual(classesDeReferencia(guerreiro, 50), [{ classeId: 'guerreiro', nivel: 50 }]);
  assert.deepEqual(classesDeReferencia(guerreiro, 60), [
    { classeId: 'guerreiro', nivel: 50 },
    { classeId: 'classe-neutra', nivel: 10 },
  ]);
  const no50 = derivadosDeReferencia(guerreiro, 50);
  const no60 = derivadosDeReferencia(guerreiro, 60);
  assert.equal(no60.vida - no50.vida, 30);
  assert.equal(no60.mana - no50.mana, 30);
  assert.equal(no60.estamina - no50.estamina, 30);
  // A Defesa acompanha só o ⌊nível ÷ 2⌋.
  assert.equal(no60.defesaNatural - no50.defesaNatural, 5);
});

test('a Maestria da classe já aparece na referência', () => {
  const ganho = (de: number, para: number) => derivadosDeReferencia(guerreiro, para).vida - derivadosDeReferencia(guerreiro, de).vida;
  assert.equal(ganho(23, 24), guerreiro.vida);
  assert.equal(ganho(24, 25), 3 * guerreiro.vida, 'o nível 25 soma o reforço de recursos');
});

test('o NPC de referência distribui os aumentos de nível em rodízio', () => {
  const base = { ...ATRIBUTOS_DE_REFERENCIA, forca: ATRIBUTO_PRINCIPAL_BASE };
  assert.deepEqual(atributosDoNpcDeReferencia(1), base);
  // 5 aumentos no nível 20: Força, Constituição, Força, Destreza, Força.
  assert.deepEqual(atributosDoNpcDeReferencia(20), { ...base, forca: 18, constituicao: 15, destreza: 15 });
  for (const nivel of [1, 4, 20, 50, 60, 100, 200, 500]) {
    const atributos = atributosDoNpcDeReferencia(nivel);
    const somaDosAumentos = Object.keys(atributos)
      .reduce((total, chave) => total + (atributos as any)[chave] - (base as any)[chave], 0);
    assert.equal(somaDosAumentos, aumentosAtributoPorNivel(nivel), `nível ${nivel}`);
  }
});

test('a melhor arma vem da raridade quando o catálogo não traz nível recomendado', () => {
  const fixas: IArmaDeReferencia[] = [
    { nivelRecomendado: null, raridade: 'comum', mediaNormal: 6 },
    { nivelRecomendado: null, raridade: 'raro', mediaNormal: 17.5 },
    { nivelRecomendado: 35, raridade: 'reliquia da criacao', mediaNormal: 72 },
    { nivelRecomendado: null, raridade: 'comum', mediaNormal: null },
  ];
  assert.equal(melhorDanoDeArmaAteONivel(fixas, 1), 6);
  assert.equal(melhorDanoDeArmaAteONivel(fixas, 9), 6);
  assert.equal(melhorDanoDeArmaAteONivel(fixas, 10), 17.5);
  assert.equal(melhorDanoDeArmaAteONivel(fixas, 34), 17.5);
  assert.equal(melhorDanoDeArmaAteONivel(fixas, 35), 72);
  assert.equal(melhorDanoDeArmaAteONivel([], 50), 0);
});

test('média de dados', () => {
  assert.equal(mediaDeDados('8d12+20'), 72);
  assert.equal(mediaDeDados('1d6+1d4+2'), 8);
  assert.equal(mediaDeDados('2d6-1'), 6);
  assert.equal(mediaDeDados('sem dado'), null);
});

test('a referência de NPCs e inimigos cresce com o nível e as DTs seguem o Guia do Mestre', () => {
  const tabela = NIVEIS_DE_REFERENCIA.map((nivel) => referenciaDoNivel(nivel, comuns, armas));
  for (const linha of tabela) {
    assert.deepEqual(linha.dt, {
      rotineira: 10 + Math.floor(linha.nivel / 2),
      padrao: 15 + Math.floor(linha.nivel / 2),
      dificil: 20 + Math.floor(linha.nivel / 2),
      extrema: 25 + Math.floor(linha.nivel / 2),
    });
    assert.ok(linha.vida.minima <= linha.vida.media && linha.vida.media <= linha.vida.maxima);
    assert.ok(linha.vidaDeInimigoPadrao > 0);
  }
  for (let indice = 1; indice < tabela.length; indice += 1) {
    const [antes, depois] = [tabela[indice - 1], tabela[indice]];
    assert.ok(depois.vida.media > antes.vida.media, `Vida média cai no nível ${depois.nivel}`);
    assert.ok(depois.defesaNatural > antes.defesaNatural, `Defesa não sobe no nível ${depois.nivel}`);
    assert.ok(depois.bonusDeAtaque > antes.bonusDeAtaque, `Ataque não sobe no nível ${depois.nivel}`);
    assert.ok(depois.danoPorAcerto >= antes.danoPorAcerto, `Dano cai no nível ${depois.nivel}`);
    assert.ok(depois.vidaDeInimigoPadrao >= antes.vidaDeInimigoPadrao, `Inimigo padrão perde Vida no nível ${depois.nivel}`);
  }
  assert.equal(tabela.find((linha) => linha.nivel === 50)?.patamar, null);
  assert.equal(tabela.find((linha) => linha.nivel === 60)?.patamar, 'Patamar I');
  assert.equal(tabela.find((linha) => linha.nivel === 100)?.patamar, 'Patamar II');
});

test('depois do nível 35 o dano da arma para de subir e só o modificador escala', () => {
  const no40 = referenciaDoNivel(40, comuns, armas);
  const no200 = referenciaDoNivel(200, comuns, armas);
  const arma = melhorDanoDeArmaAteONivel(armas, 200);
  assert.equal(melhorDanoDeArmaAteONivel(armas, 40), arma);
  assert.equal(no40.danoPorAcerto, arma + no40.modificadorPrincipal);
  assert.equal(no200.danoPorAcerto, arma + no200.modificadorPrincipal);
  assert.ok(no200.modificadorPrincipal > no40.modificadorPrincipal);
});

test('no nível 1 o NPC usa arma Comum e o grau Aprendiz', () => {
  const no1 = referenciaDoNivel(1, comuns, armas);
  const melhorComum = Math.max(...(catalogoLoja.entradas as any[])
    .filter((entrada) => entrada.tipo === 'arma' && entrada.conteudo.raridade === 'comum')
    .map((entrada) => mediaDeDados(entrada.conteudo.dano) ?? 0));
  assert.equal(no1.danoPorAcerto, melhorComum + no1.modificadorPrincipal);
  // ⌊1 ÷ 2⌋ = 0, Força 15 (+2) e Aprendiz (+2).
  assert.equal(no1.bonusDeAtaque, 0 + 2 + 2);
});

test('os arquivos gerados pela auditoria estão em dia com o código', () => {
  // `npm run audit:balance` reescreve o JSON e o relatório; se alguém mudar uma
  // fórmula, uma classe ou uma arma e esquecer de rodar, este teste avisa.
  const resultado = spawnSync(
    process.execPath,
    ['--import', './tests/frontend/registerTsLoader.mjs', 'tools/audit-balance.mjs', '--check'],
    { cwd: new URL('../../', import.meta.url), encoding: 'utf8' },
  );
  assert.equal(resultado.status, 0, `${resultado.stdout}${resultado.stderr}`);
});
