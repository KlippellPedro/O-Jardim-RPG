import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INSTALACOES_BASE,
  PATAMARES_BASE,
  REFERENCIA_CUSTOS_BASES,
  REGRA_BASES,
  TIPOS_BASE,
} from '../../data/regras/bases.ts';

test('patamares possuem ordem, espaços e capacidade crescentes', () => {
  assert.deepEqual(PATAMARES_BASE.map(patamar => patamar.ordem), [1, 2, 3, 4]);
  assert.deepEqual(PATAMARES_BASE.map(patamar => patamar.espacos), [3, 6, 10, 16]);

  for (let indice = 1; indice < PATAMARES_BASE.length; indice += 1) {
    assert.ok(PATAMARES_BASE[indice].ocupantes > PATAMARES_BASE[indice - 1].ocupantes);
    assert.ok(PATAMARES_BASE[indice].fatorAquisicao > PATAMARES_BASE[indice - 1].fatorAquisicao);
    assert.ok(PATAMARES_BASE[indice].fatorManutencao > PATAMARES_BASE[indice - 1].fatorManutencao);
  }
});

test('patamares e instalações possuem ids únicos', () => {
  const idsPatamares = PATAMARES_BASE.map(patamar => patamar.id);
  const idsInstalacoes = INSTALACOES_BASE.map(instalacao => instalacao.id);
  assert.equal(new Set(idsPatamares).size, idsPatamares.length);
  assert.equal(new Set(idsInstalacoes).size, idsInstalacoes.length);
  assert.ok([...idsPatamares, ...idsInstalacoes].every(id => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)));
});

test('toda instalação possui três níveis com limites consistentes', () => {
  for (const instalacao of INSTALACOES_BASE) {
    assert.deepEqual(instalacao.niveis.map(nivel => nivel.nivel), [1, 2, 3], instalacao.id);
    assert.deepEqual(instalacao.niveis.map(nivel => nivel.espacos), [1, 2, 3], instalacao.id);
    assert.deepEqual(instalacao.niveis.map(nivel => nivel.fatorAquisicao), [1, 2, 4], instalacao.id);
    assert.ok(instalacao.niveis.every(nivel => nivel.efeitos.length > 0), instalacao.id);
    assert.deepEqual(instalacao.tiposPermitidos, TIPOS_BASE, instalacao.id);
    assert.ok(instalacao.limite.length > 0, instalacao.id);
  }
});

test('catálogo inclui todas as instalações essenciais', () => {
  const ids = new Set(INSTALACOES_BASE.map(instalacao => instalacao.id));
  for (const id of ['dormitorio', 'area-medica', 'oficina', 'laboratorio', 'armazem', 'hangar-estabulo', 'seguranca']) {
    assert.ok(ids.has(id), `Instalação ausente: ${id}`);
  }
});

test('Dormitório reutiliza as qualidades oficiais sem acumular descanso', () => {
  const dormitorio = INSTALACOES_BASE.find(instalacao => instalacao.id === 'dormitorio');
  assert.ok(dormitorio);
  assert.deepEqual(dormitorio.niveis.map(nivel => nivel.qualidadeDescanso), ['Boa', 'Maravilhosa', 'Excelente']);
  assert.match(dormitorio.limite, /não se acumulam/i);
  assert.match(REGRA_BASES.corpo, /benefícios de um único descanso/i);
  assert.match(REGRA_BASES.corpo, /duração, interrupções, alimento, água/i);
});

test('Oficina e Laboratório não criam recursos nem ignoram crafting', () => {
  const produtivas = INSTALACOES_BASE.filter(instalacao => ['oficina', 'laboratorio'].includes(instalacao.id));
  assert.equal(produtivas.length, 2);
  for (const instalacao of produtivas) {
    assert.match(instalacao.limite, /não fornece materiais/i);
    assert.match(instalacao.limite, /não (reduz custos|concede produção automática)/i);
    assert.deepEqual(instalacao.niveis.map(nivel => nivel.capacidade), [1, 2, 3]);
  }
  assert.match(REGRA_BASES.corpo, /Materiais, tempo, testes e falhas seguem as regras do projeto/i);
});

test('Armazém e Hangar possuem capacidades finitas', () => {
  const armazem = INSTALACOES_BASE.find(instalacao => instalacao.id === 'armazem');
  const hangar = INSTALACOES_BASE.find(instalacao => instalacao.id === 'hangar-estabulo');
  assert.ok(armazem);
  assert.ok(hangar);
  assert.deepEqual(armazem.niveis.map(nivel => nivel.capacidade), [15, 30, 60]);
  assert.deepEqual(hangar.niveis.map(nivel => nivel.capacidade), [1, 2, 4]);
  assert.match(hangar.limite, /Não concede veículo, montaria, deslocamento, arma, sistema veicular ou espaço de componente/i);
});

test('custos possuem unidades concretas em Lunaris', () => {
  assert.equal(REFERENCIA_CUSTOS_BASES.unidadeAquisicaoLunaris, 1000);
  assert.equal(REFERENCIA_CUSTOS_BASES.unidadeManutencaoLunaris, 100);
  assert.match(REGRA_BASES.corpo, /1\.000 Lunaris/i);
  assert.match(REGRA_BASES.corpo, /100 Lunaris por mês/i);
});

test('inadimplência desativa instalações sem confisco automático', () => {
  assert.match(REGRA_BASES.corpo, /um pagamento atrasado[\s\S]*não pode iniciar melhorias/i);
  assert.match(REGRA_BASES.corpo, /dois pagamentos atrasados[\s\S]*uma instalação para ficar inativa/i);
  assert.match(REGRA_BASES.corpo, /não transfere nem confisca a propriedade automaticamente/i);
  assert.match(REGRA_BASES.corpo, /Quitar os atrasos reativa as instalações em 24 horas/i);
});

test('base móvel não duplica o sistema veicular', () => {
  assert.match(REGRA_BASES.corpo, /não concedem deslocamento, Vida, Defesa, armas, tripulação nem componentes veiculares/i);
  assert.match(REGRA_BASES.corpo, /use o efeito publicado da peça e não aplique o efeito-base/i);
  assert.match(REGRA_BASES.corpo, /continuam sob as regras da plataforma/i);
});
