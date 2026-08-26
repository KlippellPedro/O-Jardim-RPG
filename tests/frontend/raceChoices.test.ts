import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcularDerivados, obterVarianteRacial } from '../../src/services/calculoService';
import { FLUXO_TEMAS } from '../../src/services/magiaService';
import { escolhaRacialEstaCompleta, obterGruposEscolhaRacial } from '../../src/services/racaService';
import type { IRaca } from '../../src/types/catalogo';

const racas = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
) as IRaca[];

const casosEsperados = [
  ['animalia', 'varianteId', 3],
  ['elfo', 'linhagemId', 6],
  ['desperto', 'condicaoAncestralId', 6],
  ['automato', 'varianteId', 8],
  ['clone', 'varianteId', 4],
  ['bruxa', 'varianteId', 4],
  ['espirito', 'varianteId', 11],
  ['slime', 'varianteId', 6],
  ['anao', 'varianteId', 4],
  ['gigante', 'varianteId', 4],
  ['sereia', 'varianteId', 4],
  ['golem', 'varianteId', 6],
  ['vampiro', 'varianteId', 6],
  ['auleth', 'varianteId', 6],
  ['simbionte', 'varianteId', 4],
  ['mimico', 'varianteId', 4],
  ['onirico', 'varianteId', 5],
] as const;

test('mapeia todas as sub-raças e escolhas raciais principais do catálogo', () => {
  for (const [racaId, campo, quantidade] of casosEsperados) {
    const raca = racas.find(item => item.id === racaId);
    assert.ok(raca, `Raça ausente: ${racaId}`);
    const grupos = obterGruposEscolhaRacial(raca);
    assert.equal(grupos.length, 1, `Quantidade de grupos inesperada em ${racaId}`);
    assert.equal(grupos[0].campo, campo);
    assert.equal(grupos[0].opcoes.length, quantidade);
    assert.equal(new Set(grupos[0].opcoes.map(opcao => opcao.id)).size, quantidade);
  }
});

test('exige uma escolha válida somente quando a raça possui um grupo obrigatório', () => {
  const elfo = racas.find(item => item.id === 'elfo');
  const humano = racas.find(item => item.id === 'humano');

  assert.equal(escolhaRacialEstaCompleta(elfo, {}), false);
  assert.equal(escolhaRacialEstaCompleta(elfo, { linhagemId: 'natureza' }), true);
  assert.equal(escolhaRacialEstaCompleta(elfo, { linhagemId: 'inexistente' }), false);
  assert.equal(escolhaRacialEstaCompleta(humano, {}), true);
});

test('Divino separa Natureza Divina e Domínio em duas escolhas obrigatórias', () => {
  const divino = racas.find(item => item.id === 'divino');
  assert.ok(divino, 'Divino ausente do catálogo');

  const grupos = obterGruposEscolhaRacial(divino);
  assert.deepEqual(grupos.map(grupo => [grupo.campo, grupo.opcoes.length]), [
    ['naturezaDivinaId', 2],
    ['varianteId', 9],
  ]);
  assert.deepEqual(grupos[1].opcoes.map(opcao => opcao.id), [
    'criacao', 'vida', 'guerra', 'astucia', 'natureza',
    'conhecimento', 'tempestade', 'luz', 'morte',
  ]);
  assert.ok(!grupos[1].opcoes.some(opcao => opcao.id === 'limiar'));
  assert.equal(escolhaRacialEstaCompleta(divino, { naturezaDivinaId: 'deus' }), false);
  assert.equal(escolhaRacialEstaCompleta(divino, { varianteId: 'guerra' }), false);
  assert.equal(escolhaRacialEstaCompleta(divino, { naturezaDivinaId: 'semideus', varianteId: 'guerra' }), true);
});

test('Deus começa mais forte que Semideus, e ambos mantêm o mesmo Domínio', () => {
  const divino = racas.find(item => item.id === 'divino') || null;
  const atributos = {
    forca: 10, destreza: 10, constituicao: 16,
    inteligencia: 10, sabedoria: 16, carisma: 10, fluxo: 10,
  };
  const semideus = calcularDerivados(atributos, divino, 1, { naturezaDivinaId: 'semideus', varianteId: 'guerra' });
  const deus = calcularDerivados(atributos, divino, 1, { naturezaDivinaId: 'deus', varianteId: 'guerra' });

  assert.equal(deus.vida, semideus.vida + 6);
  assert.equal(deus.mana, semideus.mana + 8);
  assert.equal(deus.defesaNatural, semideus.defesaNatural + 2);
  assert.equal(obterVarianteRacial(divino, { naturezaDivinaId: 'deus', varianteId: 'guerra' })?.titulo, 'Domínio da Guerra');
});

test('Onírico nasce em Sonhar e não depende do sonho de uma pessoa', () => {
  const onirico = racas.find(item => item.id === 'onirico');
  assert.ok(onirico, 'Onírico ausente do catálogo');

  assert.deepEqual(onirico.formas_aquisicao, ['criacao_autorizada']);
  assert.equal(onirico.transformacao_em_qualquer_arvore, false);
  assert.match(String(onirico.origem_onirica?.descricao), /Nasceu em Sonhar/);
  assert.match(String(onirico.origem_onirica?.descricao), /não pelo sonho de uma pessoa/);
  assert.equal(onirico.rotulo_variante, 'Parte do Sonhar');

  const textoPublicado = JSON.stringify(onirico);
  assert.doesNotMatch(textoPublicado, /alguém sonhou com uma pessoa/i);
  assert.doesNotMatch(textoPublicado, /sonhador acordou/i);
  assert.doesNotMatch(textoPublicado, /outro sonhador te adotar/i);
});

test('o cálculo racial reconhece linhagem élfica e condição ancestral', () => {
  const elfo = racas.find(item => item.id === 'elfo') || null;
  const desperto = racas.find(item => item.id === 'desperto') || null;

  assert.equal(obterVarianteRacial(elfo, { linhagemId: 'tempestades' })?.titulo, 'Tempestades');
  assert.equal(
    obterVarianteRacial(desperto, { condicaoAncestralId: 'juramento-inacabado' })?.titulo,
    'Juramento Inacabado',
  );
});

/** As onze Cores da Alma são uma por Fluxo, e a cor de cada uma é a do Fluxo
 * que ela representa. Já escorregou uma vez: a paleta do Espírito tinha sido
 * escolhida à parte e deixou de bater com FLUXO_TEMAS. */
test('cada Cor da Alma usa o nome e a tinta do Fluxo que representa', () => {
  const espirito = racas.find(item => item.id === 'espirito');
  assert.ok(espirito, 'Espírito ausente do catálogo');

  const nomeDaCorPorFluxo: Record<string, string> = {
    origem: 'Rosa',
    essencia: 'Amarelo',
    comunicacao: 'Prata',
    vitalidade: 'Verde',
    inconstancia: 'Laranja',
    fisico: 'Marrom',
    espaco: 'Roxo',
    tempo: 'Dourado Envelhecido',
    vazio: 'Preto',
    fim: 'Vermelho Vinho',
    tecnologia: 'Azul Neon Artificial',
  };

  const cores = espirito.variantes || [];
  assert.equal(cores.length, Object.keys(nomeDaCorPorFluxo).length);
  assert.equal(
    new Set(cores.map(cor => cor.fluxo)).size,
    cores.length,
    'duas Cores apontando para o mesmo Fluxo',
  );

  for (const cor of cores) {
    const fluxo = String(cor.fluxo);
    assert.ok(fluxo in FLUXO_TEMAS, `Fluxo desconhecido em ${cor.id}: ${fluxo}`);
    assert.equal(cor.titulo, nomeDaCorPorFluxo[fluxo], `nome da Cor de ${fluxo}`);
  }

  // A paleta da página do Espírito é indexada pelo id da variante e precisa
  // repetir o `destaque` do Fluxo. Comparação feita sobre o texto do arquivo
  // porque os valores são literais, exigência do Tailwind.
  const pagina = readFileSync(
    new URL('../../src/redesign/raca/Espirito.tsx', import.meta.url),
    'utf8',
  );
  for (const cor of cores) {
    const destaque = FLUXO_TEMAS[cor.fluxo as keyof typeof FLUXO_TEMAS].destaque;
    const canais = [1, 3, 5].map(inicio => parseInt(destaque.slice(inicio, inicio + 2), 16));
    const linha = pagina
      .split('\n')
      .find(item => new RegExp(`^\\s*'?${cor.id}'?:`).test(item));
    assert.ok(linha, `Cor ${cor.id} ausente de ESTILO_POR_COR`);

    const erro = `Cor ${cor.id} fora da paleta do Fluxo ${cor.fluxo} (esperado ${destaque})`;
    assert.match(linha, new RegExp(`tinta: 'rgb\\(${canais.join(',')}\\)'`), `${erro} — tinta`);
    assert.match(linha, new RegExp(`text: 'text-\\[${destaque}\\]'`), `${erro} — text`);
    assert.match(linha, new RegExp(`border: 'border-\\[${destaque}\\]/`), `${erro} — border`);
  }
});

test('a raça Simbionte substitui o antigo Miceliano pelo tipo Colônia', () => {
  const miceliano = racas.find(item => item.id === 'miceliano');
  const simbionte = racas.find(item => item.id === 'simbionte');

  assert.equal(miceliano, undefined);
  assert.ok(simbionte, 'Raça ausente: simbionte');
  assert.equal(obterVarianteRacial(simbionte, { varianteId: 'colonia' })?.titulo, 'Colônia');
});

test('a raça Errante virou Anomalia', () => {
  const errante = racas.find(item => item.id === 'errante');
  const anomalia = racas.find(item => item.id === 'anomalia');

  assert.equal(errante, undefined);
  assert.ok(anomalia, 'Raça ausente: anomalia');
  assert.equal(anomalia.titulo, 'Anomalia');
});
