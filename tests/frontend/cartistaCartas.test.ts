import assert from 'node:assert/strict';
import test from 'node:test';

import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { MAGIAS_CATALOGO, circuloSemVagaPara, magiaElegivelParaAprender, obterPerfilMagico } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (A nas duas perguntas da decisão 8): cada magia
// conhecida é uma carta, a vaga de cada classe só guarda magia até o círculo
// que ela libera, e o Cartista Arcano para em 8 vagas com teto só do 25.

const cartista = CLASSES_CATALOGO.find((classe) => classe.id === 'cartista-arcano') as any;
const textoDaClasse = JSON.stringify([cartista.descricao, cartista.habilidades, cartista.poderes]);

test('o Cartista para em 8 vagas, e nenhuma classe tem teto por círculo antes do 25', () => {
  const marcos = cartista.progressao_magia.marcos;
  assert.equal(marcos[marcos.length - 1].vagas, 8);
  assert.equal(Math.max(...marcos.map((marco: any) => marco.vagas)), 8);
  for (const classe of CLASSES_CATALOGO as any[]) {
    for (const marco of classe.progressao_magia?.marcos || []) {
      if (marco.teto_por_circulo) assert.ok(marco.nivel >= 25, `${classe.id} tem teto no nível ${marco.nivel}`);
    }
  }
});

test('carta é magia conhecida: sem compra, descarte ou volta para a mão', () => {
  assert.doesNotMatch(textoDaClasse, /compra|descart|retorna à sua mão|preparadas? antes/i);
  assert.match(cartista.habilidades.find((item: any) => item.id === 'baralho-arcano').estagios[0].descricao, /Cada magia que você conhece é uma carta/);
  const afiadas = cartista.habilidades.find((item: any) => item.id === 'cartas-afiadas').descricao;
  assert.match(afiadas, /Pontaria/);
  assert.match(afiadas, /Corte/);
  // O estágio do 20 não repete mais o Arcano Absoluto.
  const vinte = cartista.habilidades.find((item: any) => item.id === 'baralho-arcano').estagios.find((estagio: any) => estagio.nivel === 20);
  assert.equal(vinte.acao, 'Passivo');
  assert.doesNotMatch(vinte.descricao, /Uma vez por sessão/);
});

test('a vaga de uma classe só guarda magia até o círculo dela', () => {
  const sexto = MAGIAS_CATALOGO.filter((magia) => magia.circulo === 6 && magia.fluxo === 'tempo').map((magia) => magia.id);
  const perfil = { vagasPorFonte: [{ circulo: 6, vagas: 2 }, { circulo: 2, vagas: 3 }], conhecidasIds: sexto.slice(0, 2) };
  // Duas de 6º já enchem as vagas que chegam ao 6º; as do Cartista só guardam 1º e 2º.
  assert.equal(circuloSemVagaPara(perfil, 6), 6);
  assert.equal(circuloSemVagaPara(perfil, 2), null);
  assert.equal(circuloSemVagaPara(perfil, 1), null);
});

test('um Canalizador com Cartista não usa as vagas do Cartista em magia de 6º', () => {
  const ficha = {
    arvoreId: 'chronus',
    racaId: 'humano',
    classeId: 'canalizador',
    classes: [{ classeId: 'canalizador', nivel: 20 }, { classeId: 'cartista-arcano', nivel: 5 }],
    nivel: 25,
    atributosFinais: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 50 },
    pericias: { misticismo: 'aprendiz' },
    magiasConhecidasIds: [] as string[],
  };
  const perfil = obterPerfilMagico(ficha);
  const vagasCanalizador = perfil.vagasPorFonte.find((fonte) => fonte.circulo === 10)?.vagas || 0;
  assert.deepEqual(perfil.vagasPorFonte.find((fonte) => fonte.circulo === 1), { circulo: 1, vagas: 3 });

  const altas = MAGIAS_CATALOGO.filter((magia) => typeof magia.circulo === 'number' && magia.circulo >= 3 && magia.fluxo === 'tempo').slice(0, vagasCanalizador);
  assert.equal(altas.length, vagasCanalizador);
  const cheia = { ...ficha, magiasConhecidasIds: altas.map((magia) => magia.id) };
  const outraDeSexto = MAGIAS_CATALOGO.find((magia) => magia.circulo === 6 && magia.fluxo === 'tempo' && !cheia.magiasConhecidasIds.includes(magia.id));
  // O Cartista 5 ainda está no 1º círculo, então a vaga dele guarda só magia de 1º.
  const dePrimeiro = MAGIAS_CATALOGO.find((magia) => magia.circulo === 1 && magia.fluxo === 'tempo');
  assert.ok(outraDeSexto && dePrimeiro);
  const recusada = magiaElegivelParaAprender(cheia, outraDeSexto);
  assert.equal(recusada.permitido, false);
  assert.match(recusada.motivo || '', /Cartista Arcano/);
  assert.equal(magiaElegivelParaAprender(cheia, dePrimeiro).permitido, true);
});
