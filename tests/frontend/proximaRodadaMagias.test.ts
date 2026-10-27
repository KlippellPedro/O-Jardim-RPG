import assert from 'node:assert/strict';
import test from 'node:test';

import catalogoLoja from '../../data/loja/catalogo.json';
import marcasData from '../../data/ficha/marcas-de-circulo.json';
import magiasData from '../../data/ficha/magias.json';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService.ts';
import { aliadoDaInvocacao, catalogoDeInvocacoes, crescimentoDaInvocacao, nivelDasFormas } from '../../src/services/invocacoesService.ts';
import {
  MAGIAS_CATALOGO,
  interceptacaoDaFicha,
  magiaEhElemental,
  textoDaDefesa,
  tipoDeDanoDaMagia,
} from '../../src/services/magiaService.ts';

// O que sobrou da revisão de magias de 2026-10 ("Para uma próxima rodada" do README), fechado em 2026-10-27.

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id);
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};
const classe = (id: string) => {
  const encontrada = CLASSES_CATALOGO.find((item) => item.id === id) as any;
  assert.ok(encontrada, `${id} sumiu`);
  return encontrada;
};
const doGrupo = (classeId: string, grupo: 'habilidades' | 'poderes' | 'eventos', id: string) => {
  const item = classe(classeId)[grupo]?.find((entrada: any) => entrada.id === id);
  assert.ok(item, `${classeId}.${grupo}.${id}`);
  return item;
};

test('o "se hostil" mora num campo próprio, e o texto da Defesa continua o mesmo para quem lê', () => {
  assert.ok(MAGIAS_CATALOGO.every((item) => !/se hostil/i.test(String(item.defesa || ''))));
  assert.equal(textoDaDefesa(magia('ancora-do-ser')), 'Vontade, se hostil');
  assert.equal(textoDaDefesa(magia('lamina-da-verdade')), 'Vontade');
  assert.equal(textoDaDefesa(magia('escudo-material')), '');
});

test('a Tecnologia tem listas vazias e diz em campo próprio que vale contra todos', () => {
  const tecnologia = (magiasData as any).vantagens_fluxos.find((item: any) => item.fluxo === 'tecnologia');
  assert.deepEqual(tecnologia.vantagem_contra, []);
  assert.deepEqual(tecnologia.desvantagem_contra, []);
  assert.equal(tecnologia.contra_todos, true);
  assert.match(tecnologia.observacao, /se cancelam/);
  const ids = new Set((magiasData as any).fluxos.map((fluxo: any) => fluxo.id));
  for (const item of (magiasData as any).vantagens_fluxos) {
    for (const alvo of [...item.vantagem_contra, ...item.desvantagem_contra]) assert.ok(ids.has(alvo), `${item.fluxo}: "${alvo}" não é Fluxo`);
  }
});

test('o Físico sem Elementarista tem ataque próprio no 1º e no 2º círculo, de impacto e com Cartomancia', () => {
  for (const [id, circulo] of [['golpe-cinetico', 1], ['pancada-cinetica', 2]] as const) {
    const item = magia(id);
    assert.equal(item.fluxo, 'fisico');
    assert.equal(item.circulo, circulo);
    assert.equal(item.ataque, true);
    assert.equal(item.perfil, 'alvo');
    assert.equal(magiaEhElemental(item), false);
    assert.ok(!(magiasData as any).regras.acesso_elemental.magias_elementais_ids.includes(id));
    assert.ok(item.fontes_permitidas.includes('Cartomancia de Fluxo'));
    assert.equal(tipoDeDanoDaMagia(item, 'fisico'), 'de impacto');
  }
});

test('o Cartista de Físico preenche as 8 vagas com o teto de 4 por círculo', () => {
  const pool = MAGIAS_CATALOGO.filter((item) => (
    (item.fluxo === 'fisico' || item.fluxo === 'universal')
    && item.circulo !== 'ritual' && Number(item.circulo) <= 2
    && item.fontes_permitidas.includes('Cartomancia de Fluxo')
    && !magiaEhElemental(item)
  ));
  const porCirculo = [1, 2].map((circulo) => Math.min(4, pool.filter((item) => item.circulo === circulo).length));
  assert.equal(porCirculo[0] + porCirculo[1], 8);
});

test('o Vazio encerra cobrando Mana de quem mantinha o efeito e sem deixar rastro', () => {
  for (const id of ['consumir-energia', 'colapso-do-nada', 'sentenca-nula']) {
    assert.match(magia(id).efeito, /perde Mana igual/, id);
    assert.match(magia(id).efeito, /nenhum teste revela depois/i, id);
  }
  // O Fim fecha sem cobrar nada: a marca é só do Vazio.
  assert.doesNotMatch(magia('fechar-ciclo').efeito, /perde Mana/);
});

test('a Marca Nunca Igual não repete mais o Embaralhar Resultado', () => {
  const marca = (marcasData as any).por_fluxo.inconstancia.find((item: any) => item.id === 'inconstancia-nunca-igual');
  assert.doesNotMatch(marca.bonus, /repete um teste/);
  assert.match(marca.bonus, /magia diferente/);
  assert.match(marca.onus, /zera esse bônus/);
});

test('Invocador: Retorno ao Pacto com limite, Invocação Ascendida distinta e Chamado da Criação dentro do Catálogo', () => {
  const retorno = doGrupo('invocador', 'poderes', 'retorno-ao-pacto');
  assert.equal(retorno.usos, 'Uma vez por rodada');
  assert.equal(retorno.alcance, '30 m');
  const ascendida = doGrupo('invocador', 'poderes', 'avatar-da-deidade');
  assert.equal(ascendida.titulo, 'Invocação Ascendida');
  assert.doesNotMatch(ascendida.descricao, /\+2 dados/);
  assert.match(ascendida.descricao, /Convergência Primordial ao mesmo tempo/);
  assert.match(doGrupo('invocador', 'eventos', 'chamado-da-criacao').descricao, /outra ficha do Catálogo, no mesmo nível/);
  const final = doGrupo('invocador', 'habilidades', 'pacto-de-genese').estagios.find((estagio: any) => estagio.nivel === 20);
  assert.match(final.descricao, /\+3 de Vida por nível acima do 20/);
});

test('o Catálogo de Invocações vira ficha pronta, e cresce depois do 20', () => {
  const catalogo = catalogoDeInvocacoes();
  assert.equal(catalogo.length, 30);
  assert.ok(catalogo.every((item) => item.vida > 0 && item.defesa > 0 && item.movimento && item.habilidade));
  assert.equal(new Set(catalogo.map((item) => item.linha)).size, 6);
  assert.deepEqual(crescimentoDaInvocacao(20), { vida: 0, defesa: 0, dadosExtras: 0 });
  assert.deepEqual(crescimentoDaInvocacao(50), { vida: 90, defesa: 6, dadosExtras: 3 });
  assert.equal(nivelDasFormas(8), 2);

  const cacador = catalogo.find((item) => item.id === 'cacador-de-feras-5')!;
  assert.equal(cacador.nivelMinimo, 20);
  const ficha = { escolhasHabilidade: { 'invocador:formas-vinculadas': ['nucleo-firme'] }, classes: [{ id: 'invocador', nivel: 50 }] };
  const aliado = aliadoDaInvocacao(cacador, { ficha, nivelInvocador: 50, iniciativa: 4 });
  assert.equal(aliado.vidaMaxima, 170);
  assert.equal(aliado.defesa, 27);
  assert.equal(aliado.ataquePrincipal, 'Garras 3d8 + 3d6 cortante');
  assert.equal(aliado.invocacaoCatalogoId, 'cacador-de-feras-5');
  // Núcleo Firme no nível 2 da forma: o dobro do nível de Invocador.
  assert.equal(aliado.vidaTemporaria, 100);
  assert.match(aliado.observacoes, /Núcleo Firme/);

  // A Mão Extra do Duende é ajuda em perícia: não ganha os dados da maestria.
  const duende = catalogo.find((item) => item.id === 'duende-prestativo-5')!;
  assert.doesNotMatch(aliadoDaInvocacao(duende, { ficha: {}, nivelInvocador: 30, iniciativa: 0 }).ataquePrincipal, /\+ 1d6/);
  assert.equal(aliadoDaInvocacao(duende, { ficha: {}, nivelInvocador: 30, iniciativa: 0 }).vidaTemporaria, 0);
});

test('Interceptador: detecção maior, calibração com regra e Visão de Código com mecânica', () => {
  const malha = doGrupo('interceptador', 'habilidades', 'acesso-a-malha');
  const estagio = (nivel: number) => malha.estagios.find((item: any) => item.nivel === nivel);
  assert.equal(estagio(1).alcance, '18 m');
  assert.match(estagio(1).descricao, /até o conjurador ou até qualquer alvo/);
  assert.match(estagio(1).descricao, /\+2 para interceptar magia ou poder de criatura desse Fluxo/);
  assert.equal(estagio(15).alcance, '36 m');
  assert.equal(estagio(20).acao, 'Ação Livre');
  assert.match(estagio(20).descricao, /custa 0 de Mana/);

  const calibrado = interceptacaoDaFicha(5, { tipo: 'magia', circulo: 3 }, { bonusBase: 10, doFluxoCalibrado: true });
  assert.equal(calibrado.bonus, 12);
  const visao = interceptacaoDaFicha(20, { tipo: 'magia', circulo: 9 }, { bonusBase: 20, visaoDeCodigo: true });
  assert.equal(visao.custoMana, 0);
  assert.equal(visao.vantagem, true);
  const cedo = interceptacaoDaFicha(19, { tipo: 'magia', circulo: 9 }, { bonusBase: 20, visaoDeCodigo: true });
  assert.equal(cedo.vantagem, false);
  assert.equal(cedo.custoMana, 4);
});

test('Cartista: baralho na Loja, magia com forma de carta e Cassino Lunar com prêmio por nível', () => {
  const baralho = (catalogoLoja as any).entradas.find((item: any) => item.id === 'baralho-de-cartas');
  assert.ok(baralho, 'o Baralho de Cartas sumiu da Loja');
  assert.equal(baralho.tipo, 'equipamento');
  const primeiro = doGrupo('cartista-arcano', 'habilidades', 'baralho-arcano').estagios[0].descricao;
  assert.match(primeiro, /Baralho de Cartas/);
  assert.match(primeiro, /forma de carta/);
  const cassino = doGrupo('cartista-arcano', 'eventos', 'cassino-lunar').descricao;
  for (const nivel of ['4º', '7º', '12º', '18º']) assert.match(cassino, new RegExp(`No ${nivel}`), nivel);
});

test('Sintonizador: o catalisador já serve antes da primeira fusão, e o Aterramento cresce com o nível', () => {
  const sintonia = doGrupo('sintonizador', 'habilidades', 'sintonia-catalisada').estagios[0].descricao;
  assert.match(sintonia, /Antes da primeira fusão/);
  assert.match(sintonia, /reduz em 2 o dano/);
  const aterramento = doGrupo('sintonizador', 'poderes', 'aterramento').descricao;
  assert.match(aterramento, /8 \+ metade do seu nível de Sintonizador/);
  assert.match(aterramento, /poder de criatura/);
});
