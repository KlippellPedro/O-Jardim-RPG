import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  fluxosInstaladosDaFicha,
  magiaElegivelParaAprender,
  marcasDaFicha,
  obterFluxoNativoId,
  obterPerfilMagico,
  podeConjurarMagia,
  ritualElegivelParaAprender,
} from '../../src/services/magiaService.ts';
import { escolhasHabilidadeDisponiveis } from '../../src/services/progressaoFichaService.ts';

// Decisão de 2026-10-20: o Fluxo nativo vem da Árvore em que a alma nasceu. Quem
// nasce na A.X.I.S tem Comunicação (a Parley segue viva sob a Malha), o Autômato
// é a única raça com Tecnologia de nascença, a Tecnologia dos outros chega como
// Fluxo instalado pelo Mestre, e a escolha do Canalizador só vale sem Árvore.

const ficha = (extra: Record<string, unknown> = {}) => ({
  arvoreId: 'aethel',
  racaId: 'humano',
  classeId: 'canalizador',
  classes: [{ classeId: 'canalizador', nivel: 10 }],
  nivel: 10,
  atributosFinais: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 30 },
  pericias: { misticismo: 'aprendiz' },
  magiasConhecidasIds: [],
  ...extra,
});

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id);
  assert.ok(encontrada, `magia ${id} sumiu do catálogo`);
  return encontrada;
};

test('a Árvore define o Fluxo nativo, e a A.X.I.S dá Comunicação', () => {
  assert.equal(obterFluxoNativoId(ficha()), 'origem');
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: 'keryx' })), 'comunicacao');
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: 'erebus' })), 'vazio');
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: 'universal' })), null, 'a Universal atravessa todos e não tem um nativo');
});

test('o Autômato é a única raça que nasce com Tecnologia', () => {
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: 'keryx', racaId: 'automato' })), 'tecnologia');
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: 'keryx', racaId: 'humano' })), 'comunicacao');
});

test('a escolha da Canalização Nativa só vale para ficha sem Árvore', () => {
  const escolha = { 'canalizador:canalizacao-nativa': ['vazio'] };
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: 'sem-arvore', escolhasHabilidade: escolha })), 'vazio');
  assert.equal(obterFluxoNativoId(ficha({ arvoreId: '', escolhasHabilidade: escolha })), 'vazio');
  assert.equal(obterFluxoNativoId(ficha({ escolhasHabilidade: escolha })), 'origem', 'quem nasceu em Gênese continua com Origem');
  // Só o Canalizador tem a escolha; a Tecnologia nunca é aceita como nativa.
  assert.equal(obterFluxoNativoId(ficha({
    arvoreId: 'sem-arvore', classeId: 'sintonizador', classes: [{ classeId: 'sintonizador', nivel: 10 }], escolhasHabilidade: escolha,
  })), null);
  assert.equal(obterFluxoNativoId(ficha({
    arvoreId: 'sem-arvore', escolhasHabilidade: { 'canalizador:canalizacao-nativa': ['tecnologia'] },
  })), null);

  const temEscolha = (dados: Record<string, unknown>) => escolhasHabilidadeDisponiveis(ficha(dados))
    .some((item) => item.chave === 'canalizador:canalizacao-nativa');
  assert.equal(temEscolha({ arvoreId: 'sem-arvore' }), true);
  assert.equal(temEscolha({ arvoreId: 'aethel' }), false);
  assert.equal(temEscolha({ arvoreId: 'universal' }), false);
});

test('Fluxo instalado abre as magias dele, sem dar Marca e sem repetir o nativo', () => {
  const comTecnologia = ficha({ fluxosInstaladosIds: ['tecnologia', 'origem', 'inexistente', 'tecnologia'] });
  assert.deepEqual(fluxosInstaladosDaFicha(comTecnologia), ['tecnologia'], 'o nativo e ids inválidos não contam como instalados');
  assert.deepEqual(obterPerfilMagico(comTecnologia).fluxosInstaladosIds, ['tecnologia']);

  const pulso = magia('pulso-de-interferencia');
  assert.equal(magiaElegivelParaAprender(ficha(), pulso).permitido, false);
  assert.equal(magiaElegivelParaAprender(comTecnologia, pulso).permitido, true);
  assert.match(magiaElegivelParaAprender(comTecnologia, magia('toque-nulo')).motivo || '', /Fluxo instalado, Tecnologia/);

  const aprendida = { ...comTecnologia, magiasConhecidasIds: ['pulso-de-interferencia'] };
  assert.equal(podeConjurarMagia(aprendida, pulso).permitido, true);
  // O Mestre retirou o Fluxo: a magia continua registrada, mas não se conjura.
  assert.equal(podeConjurarMagia({ ...aprendida, fluxosInstaladosIds: [] }, pulso).permitido, false);

  const ritualDeTecnologia = RITUAIS_CATALOGO.find((item) => item.fluxo === 'tecnologia');
  assert.ok(ritualDeTecnologia);
  const ritualista = ficha({ classeId: 'ritualista', classes: [{ classeId: 'ritualista', nivel: 10 }] });
  assert.equal(ritualElegivelParaAprender(ritualista, ritualDeTecnologia).permitido, false);
  assert.equal(ritualElegivelParaAprender({ ...ritualista, fluxosInstaladosIds: ['tecnologia'] }, ritualDeTecnologia).permitido, true);

  // A Marca é da alma: só o Fluxo nativo dá Marca, nunca o instalado.
  const alto = { ...comTecnologia, classes: [{ classeId: 'canalizador', nivel: 20 }], nivel: 20, atributosFinais: { ...comTecnologia.atributosFinais, fluxo: 50 } };
  const marcas = marcasDaFicha(alto);
  assert.ok(marcas.length > 0);
  assert.ok(marcas.every((marca) => marca.id.startsWith('origem-')), 'nenhuma Marca de Tecnologia vem do Fluxo instalado');
});
