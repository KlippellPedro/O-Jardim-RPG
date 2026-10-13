import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcularDerivados, obterVarianteRacial } from '../../src/services/calculoService';
import { FLUXO_TEMAS, TEMA_UNIVERSAL } from '../../src/services/magiaService';
import {
  animalServeAMorfologia,
  escolhaRacialEstaCompleta,
  obterAnimalRacial,
  obterArmaNaturalRacial,
  obterGruposEscolhaRacial,
  obterNaturezaRacialId,
  obterEstagiosRaciais,
  obterOpcoesRaciaisSelecionadas,
  obterTamanhoRacial,
  obterTracosRaciaisDisponiveis,
  opcoesEscolhiveis,
  varianteServeANatureza,
} from '../../src/services/racaService';
import type { IRaca } from '../../src/types/catalogo';
import {
  etiquetasDoTraco,
  marcaOposta,
  marcaSelecionada,
  marcasEscolhiveis,
  nomeCurtoDoEstagio,
  organizarEspirito,
} from '../../src/redesign/raca/espirito/dados';
import { ESTILO_MARCA_PADRAO, ESTILO_POR_MARCA, estiloDaMarca } from '../../src/redesign/raca/espirito/estilos';

const racas = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
) as IRaca[];

const casosEsperados = [
  ['elfo', 'linhagemId', 6],
  ['desperto', 'condicaoAncestralId', 6],
  ['automato', 'varianteId', 8],
  ['clone', 'varianteId', 4],
  ['bruxa', 'varianteId', 4],
  ['slime', 'varianteId', 6],
  ['anao', 'varianteId', 4],
  ['gigante', 'varianteId', 4],
  ['sereia', 'varianteId', 4],
  ['golem', 'varianteId', 6],
  ['vampiro', 'varianteId', 7],
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

/** Os onze Fluxos do Espírito natural são os do jogo, e a tinta de cada um é a
 * do Fluxo que ele representa. Já escorregou uma vez: a paleta do Espírito tinha
 * sido escolhida à parte e deixou de bater com FLUXO_TEMAS. */
test('cada Fluxo do Espírito natural usa o nome e a tinta do Fluxo que representa', () => {
  const espirito = racas.find(item => item.id === 'espirito');
  assert.ok(espirito, 'Espírito ausente do catálogo');

  const nomeDaCorPorFluxo: Record<string, string> = {
    origem: 'Origem',
    essencia: 'Essência',
    comunicacao: 'Comunicação',
    vitalidade: 'Vitalidade',
    inconstancia: 'Inconstância',
    fisico: 'Físico',
    espaco: 'Espaço',
    tempo: 'Tempo',
    vazio: 'Vazio',
    fim: 'Fim',
    tecnologia: 'Tecnologia',
  };

  // O Universal (Blanc) e os Pecados não são Fluxos: têm testes próprios abaixo.
  const cores = (espirito.variantes || []).filter(variante => variante.natureza === 'natural' && variante.fluxo !== 'universal');
  assert.equal(cores.length, Object.keys(nomeDaCorPorFluxo).length);
  assert.equal(
    new Set(cores.map(cor => cor.fluxo)).size,
    cores.length,
    'dois Fluxos repetidos',
  );

  for (const cor of cores) {
    const fluxo = String(cor.fluxo);
    assert.ok(fluxo in FLUXO_TEMAS, `Fluxo desconhecido em ${cor.id}: ${fluxo}`);
    assert.equal(cor.titulo, nomeDaCorPorFluxo[fluxo], `nome do Fluxo ${fluxo}`);
  }

  // A paleta da página do Espírito é indexada pelo id da variante e precisa
  // repetir o `destaque` do Fluxo. Comparação feita sobre o texto do arquivo
  // porque os valores são literais, exigência do Tailwind.
  const pagina = readFileSync(
    new URL('../../src/redesign/raca/espirito/estilos.ts', import.meta.url),
    'utf8',
  );
  for (const cor of cores) {
    const destaque = FLUXO_TEMAS[cor.fluxo as keyof typeof FLUXO_TEMAS].destaque;
    const canais = [1, 3, 5].map(inicio => parseInt(destaque.slice(inicio, inicio + 2), 16));
    const linha = pagina
      .split('\n')
      .find(item => new RegExp(`^\\s*'?${cor.id}'?:`).test(item));
    assert.ok(linha, `Fluxo ${cor.id} ausente de ESTILO_POR_MARCA`);

    const erro = `Fluxo ${cor.id} fora da paleta do Fluxo ${cor.fluxo} (esperado ${destaque})`;
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

/** Raça de teste com Natureza: a segunda escolha (Fluxo, Virtude, Pecado)
 * depende da primeira. O Espírito do catálogo ainda só tem a natural. */
const racaComNaturezas: IRaca = {
  id: 'raca-de-teste',
  titulo: 'Raça de Teste',
  rotulo_natureza: 'Natureza',
  naturezas: [
    { id: 'a', titulo: 'A', rotulo_variante: 'Fluxo', caracteristicas: [{ id: 'traco-a', titulo: 'Traço A' }] },
    { id: 'b', titulo: 'B', rotulo_variante: 'Pecado' },
  ],
  variantes: [
    { id: 'a1', titulo: 'A1', natureza: 'a' },
    { id: 'a2', titulo: 'A2', natureza: 'a' },
    { id: 'b1', titulo: 'B1', natureza: 'b' },
    { id: 'so-mestre', titulo: 'Só do Mestre', natureza: 'a', somente_mestre: true },
  ],
};

test('com duas Naturezas, a variante só aparece depois da Natureza e só a dela', () => {
  assert.deepEqual(obterGruposEscolhaRacial(racaComNaturezas, {}).map(grupo => grupo.campo), ['naturezaId']);

  const grupoDeB = obterGruposEscolhaRacial(racaComNaturezas, { naturezaId: 'b' });
  assert.deepEqual(grupoDeB.map(grupo => grupo.campo), ['naturezaId', 'varianteId']);
  assert.equal(grupoDeB[1].rotulo, 'Pecado');
  assert.deepEqual(grupoDeB[1].opcoes.map(opcao => opcao.id), ['b1']);

  // Sem escolha informada (páginas de regras), todas as variantes aparecem.
  assert.equal(obterGruposEscolhaRacial(racaComNaturezas)[1].opcoes.length, 3);
  assert.equal(obterGruposEscolhaRacial(racaComNaturezas)[2].opcoes.length, 1);
});

test('ficha antiga que só guardou a variante infere a Natureza dela', () => {
  assert.equal(obterNaturezaRacialId(racaComNaturezas, { varianteId: 'b1' }), 'b');
  assert.equal(obterNaturezaRacialId(racaComNaturezas, {}), null);
  assert.equal(obterNaturezaRacialId(racaComNaturezas, { naturezaId: 'inexistente' }), null);
});

test('a escolha só fica completa com Natureza e uma variante dessa Natureza', () => {
  assert.equal(escolhaRacialEstaCompleta(racaComNaturezas, { naturezaId: 'a' }), false);
  assert.equal(escolhaRacialEstaCompleta(racaComNaturezas, { naturezaId: 'a', varianteId: 'a1' }), true);
  assert.equal(escolhaRacialEstaCompleta(racaComNaturezas, { naturezaId: 'a', varianteId: 'b1' }), false);
  assert.equal(escolhaRacialEstaCompleta(racaComNaturezas, { varianteId: 'b1' }), false, 'a Natureza precisa ser escolhida de forma explícita');
});

test('os traços e a variante da Natureza escolhida entram nas opções selecionadas', () => {
  const ids = obterOpcoesRaciaisSelecionadas(racaComNaturezas, { naturezaId: 'a', varianteId: 'a2' })
    .map(opcao => opcao.id);
  assert.deepEqual(ids, ['a', 'a2']);
});

test('opção só do Mestre some para o jogador, a não ser que já seja a escolha da ficha', () => {
  const opcoes = racaComNaturezas.variantes!;
  assert.ok(!opcoesEscolhiveis(opcoes, false).some(opcao => opcao.id === 'so-mestre'));
  assert.ok(opcoesEscolhiveis(opcoes, true).some(opcao => opcao.id === 'so-mestre'));
  assert.ok(opcoesEscolhiveis(opcoes, false, 'so-mestre').some(opcao => opcao.id === 'so-mestre'));
});

test('o Espírito escolhe a Natureza primeiro, e só depois o Fluxo ou o Pecado', () => {
  const espirito = racas.find(item => item.id === 'espirito');
  assert.ok(espirito);
  assert.deepEqual(espirito.naturezas?.map(natureza => natureza.id), ['natural', 'demoniaca', 'angelical']);

  assert.deepEqual(obterGruposEscolhaRacial(espirito, {}).map(grupo => grupo.campo), ['naturezaId']);

  const natural = obterGruposEscolhaRacial(espirito, { naturezaId: 'natural' });
  assert.deepEqual(natural.map(grupo => grupo.campo), ['naturezaId', 'varianteId']);
  assert.equal(natural[1].rotulo, 'Fluxo');
  assert.equal(natural[1].opcoes.length, 12, 'onze Fluxos e o Universal');

  const demoniaca = obterGruposEscolhaRacial(espirito, { naturezaId: 'demoniaca' });
  assert.equal(demoniaca[1].rotulo, 'Pecado');
  assert.equal(demoniaca[1].opcoes.length, 7);

  const angelical = obterGruposEscolhaRacial(espirito, { naturezaId: 'angelical' });
  assert.equal(angelical[1].rotulo, 'Virtude');
  assert.equal(angelical[1].opcoes.length, 7);

  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'natural', varianteId: 'vermelho-vinho' }), true);
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'demoniaca', varianteId: 'demonio-ira' }), true);
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'angelical', varianteId: 'anjo-paciencia' }), true);
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'angelical', varianteId: 'demonio-ira' }), false);
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'natural', varianteId: 'demonio-ira' }), false);
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'natural' }), false);
  assert.equal(escolhaRacialEstaCompleta(espirito, {}), false);

  // As regras mostram uma seção de variantes por Natureza, cada uma com o seu rótulo.
  assert.deepEqual(
    obterGruposEscolhaRacial(espirito).map(grupo => grupo.chave),
    ['naturezaId', 'varianteId:natural', 'varianteId:demoniaca', 'varianteId:angelical'],
  );
});

test('a Animália escolhe a Forma, depois a Morfologia e por fim o animal, que define o tamanho', () => {
  const animalia = racas.find(item => item.id === 'animalia');
  assert.ok(animalia);
  assert.equal(animalia.rotulo_natureza, 'Forma');
  assert.deepEqual(animalia.naturezas?.map(forma => forma.id), ['fera', 'hibrido', 'tracos']);
  assert.equal(animalia.natureza_padrao, 'hibrido', 'ficha antiga, que só tem a Morfologia, vira Híbrido');

  // As regras mostram as três escolhas, cada uma uma vez, na ordem em que o jogador decide.
  assert.deepEqual(obterGruposEscolhaRacial(animalia).map(grupo => grupo.campo), ['naturezaId', 'varianteId', 'animalId']);
  assert.equal(animalia.variantes?.length, 10);

  // Com a ficha na mão: sem Forma só a Forma aparece; sem Morfologia o animal ainda não aparece, e depois só aparecem os que servem a ela.
  assert.deepEqual(obterGruposEscolhaRacial(animalia, {}).map(grupo => grupo.campo), ['naturezaId']);
  assert.deepEqual(obterGruposEscolhaRacial(animalia, { naturezaId: 'fera' }).map(grupo => grupo.campo), ['naturezaId', 'varianteId']);
  const alada = obterGruposEscolhaRacial(animalia, { naturezaId: 'fera', varianteId: 'alada' });
  assert.deepEqual(alada.map(grupo => grupo.campo), ['naturezaId', 'varianteId', 'animalId']);
  const aves = alada[2].opcoes;
  assert.ok(aves.some(animal => animal.id === 'coruja') && aves.some(animal => animal.id === 'aguia'));
  assert.ok(!aves.some(animal => animal.id === 'rinoceronte'), 'rinoceronte não é Alada');
  assert.equal(alada[2].personalizavel, true);

  // Animal do catálogo ou animal escrito fecham a escolha; Morfologia ou animal que não servem, não.
  assert.equal(escolhaRacialEstaCompleta(animalia, { naturezaId: 'hibrido', varianteId: 'robusta', animalId: 'rinoceronte' }), true);
  assert.equal(escolhaRacialEstaCompleta(animalia, { naturezaId: 'hibrido', varianteId: 'robusta', animalPersonalizado: 'Tamanduá' }), true);
  assert.equal(escolhaRacialEstaCompleta(animalia, { naturezaId: 'hibrido', varianteId: 'robusta' }), false);
  assert.equal(escolhaRacialEstaCompleta(animalia, { naturezaId: 'hibrido', varianteId: 'robusta', animalId: 'coruja' }), false);
  assert.equal(escolhaRacialEstaCompleta(animalia, { naturezaId: 'hibrido', varianteId: 'alada', animalId: 'inventado' }), false);

  // O animal define o tamanho: o rato é Pequeno, o rinoceronte é Grande, e o animal vale mais que a Morfologia.
  assert.equal(obterTamanhoRacial(animalia, { animalId: 'rato' }), 'Pequeno');
  assert.equal(obterTamanhoRacial(animalia, { animalId: 'rinoceronte' }), 'Grande');
  assert.equal(obterTamanhoRacial(animalia, { varianteId: 'robusta', animalId: 'rato' }), 'Pequeno');
  assert.equal(obterTamanhoRacial(animalia, { varianteId: 'robusta' }), null, 'sem animal, a raça não impõe tamanho');
  assert.equal(obterAnimalRacial(animalia, { animalId: 'dragao' })?.tamanho, 'Enorme');
  assert.equal(obterTamanhoRacial(animalia, { naturezaId: 'fera', animalId: 'dragao' }), 'Enorme');
  assert.equal(obterTamanhoRacial(animalia, { naturezaId: 'hibrido', animalId: 'rato' }), 'Pequeno');
  // Traços tem corpo de pessoa: o tamanho é Normal qualquer que seja o animal, e não tem arma natural.
  assert.equal(obterTamanhoRacial(animalia, { naturezaId: 'tracos', animalId: 'dragao' }), 'Normal');
  assert.equal(obterTamanhoRacial(animalia, { naturezaId: 'tracos', animalId: 'rato' }), 'Normal');
  assert.equal(animalia.naturezas?.find(forma => forma.id === 'tracos')?.sem_arma_natural, true);
  assert.equal(animalServeAMorfologia(animalia.animais!.find(animal => animal.id === 'leao')!, 'predadora'), true);
  assert.equal(animalServeAMorfologia(animalia.animais!.find(animal => animal.id === 'leao')!, 'aquatica'), false);
});

test('o catálogo de animais da Animália é coerente e cobre cada Morfologia', () => {
  const animalia = racas.find(item => item.id === 'animalia')!;
  const animais = animalia.animais || [];
  const morfologias = new Set((animalia.variantes || []).map(variante => variante.id));
  const tamanhos = new Set(['Pequeno', 'Normal', 'Grande', 'Enorme']);

  assert.equal(new Set(animais.map(animal => animal.id)).size, animais.length, 'ids de animal repetidos');
  assert.equal(new Set(animais.map(animal => animal.titulo)).size, animais.length, 'nomes de animal repetidos');
  for (const animal of animais) {
    assert.ok(tamanhos.has(String(animal.tamanho)), `${animal.id}: tamanho "${animal.tamanho}" inválido`);
    assert.ok(animal.arma_natural, `${animal.id}: sem arma natural`);
    assert.ok(String(animal.descricao).length > 10, `${animal.id}: sem descrição`);
    assert.ok((animal.morfologias || []).length > 0, `${animal.id}: sem Morfologia`);
    for (const id of animal.morfologias || []) assert.ok(morfologias.has(id), `${animal.id}: Morfologia "${id}" não existe`);
  }
  // Cada Morfologia tem animais de sobra para o jogador montar sem pedir ao Mestre.
  for (const id of morfologias) {
    const quantos = animais.filter(animal => animal.morfologias?.includes(id)).length;
    assert.ok(quantos >= 6, `${id}: só ${quantos} animais no catálogo`);
  }
  // Os exemplos que o Pedro pediu de saída.
  for (const id of ['leao', 'gorila', 'rinoceronte', 'pantera', 'leopardo', 'coruja', 'rato', 'gato', 'dragao']) {
    assert.ok(animais.some(animal => animal.id === id), `faltou o animal "${id}"`);
  }
});

test('as dez Morfologias da Animália têm o mesmo peso e cada uma tem um traço próprio', () => {
  const animalia = racas.find(item => item.id === 'animalia')!;
  const soma = (opcao: { vida?: number; mana?: number; estamina?: number }) => (opcao.vida || 0) + (opcao.mana || 0) + (opcao.estamina || 0);
  const totais = (animalia.variantes || []).map(soma);
  // As três antigas (Ágil, Robusta, Mística) ficam como estavam; as novas ficam dentro da mesma faixa.
  assert.ok(Math.min(...totais) >= 2 && Math.max(...totais) <= 5, `faixa fora do esperado: ${totais.join(', ')}`);
  for (const morfologia of animalia.variantes || []) {
    assert.ok(morfologia.descricao, `${morfologia.id}: sem descrição`);
    assert.ok((morfologia.caracteristicas || []).length >= 1, `${morfologia.id}: sem traço`);
  }
  // As Formas pesam pouco entre si: Fera ganha corpo, Traços ganha liberdade.
  const formas = Object.fromEntries((animalia.naturezas || []).map(forma => [forma.id, soma(forma)]));
  assert.deepEqual(formas, { fera: 1, hibrido: 0, tracos: -1 });
});

test('o Fluxo Universal do Espírito é só do Mestre, tem um traço por degrau e tinta própria', () => {
  const espirito = racas.find(item => item.id === 'espirito');
  const universal = espirito?.variantes?.find(variante => variante.fluxo === 'universal');
  assert.ok(universal, 'Fluxo Universal ausente do Espírito');

  assert.equal(universal.somente_mestre, true);
  assert.equal(universal.natureza, 'natural');
  assert.deepEqual(
    (universal.caracteristicas || []).map(traco => traco.nivel_minimo),
    [1, 8, 15, 28, 40, 60],
    'um traço por degrau, como os outros onze',
  );

  // Jogador comum não vê a opção para escolher; o Mestre vê.
  const todas = obterGruposEscolhaRacial(espirito, { naturezaId: 'natural' })[1].opcoes;
  assert.ok(!opcoesEscolhiveis(todas, false).some(opcao => opcao.id === universal.id));
  assert.ok(opcoesEscolhiveis(todas, true).some(opcao => opcao.id === universal.id));

  // A ficha que já tem o Universal continua completa e mostra o próprio rótulo.
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'natural', varianteId: universal.id }), true);

  const pagina = readFileSync(new URL('../../src/redesign/raca/espirito/estilos.ts', import.meta.url), 'utf8');
  const linha = pagina.split('\n').find(item => new RegExp(`^\\s*'?${universal.id}'?:`).test(item));
  assert.ok(linha, 'Universal ausente de ESTILO_POR_MARCA');
  const canais = [1, 3, 5].map(inicio => parseInt(TEMA_UNIVERSAL.destaque.slice(inicio, inicio + 2), 16));
  assert.match(linha, new RegExp(`tinta: 'rgb\\(${canais.join(',')}\\)'`));
  assert.match(linha, new RegExp(`text: 'text-\\[${TEMA_UNIVERSAL.destaque}\\]'`));
});

const pecadosDoRito = JSON.parse(
  readFileSync(new URL('../../data/ficha/pecados-e-virtudes.json', import.meta.url), 'utf8'),
) as {
  pecados: Array<{ id: string; titulo: string; virtude_oposta: string }>;
  virtudes: Array<{ id: string; titulo: string; pecado_oposto: string }>;
};

test('o Espírito Demoníaco tem os sete Pecados do rito, com um traço por degrau', () => {
  const espirito = racas.find(item => item.id === 'espirito');
  const demonios = (espirito?.variantes || []).filter(variante => variante.natureza === 'demoniaca');
  assert.equal(demonios.length, 7);
  assert.equal(new Set((espirito?.variantes || []).map(variante => variante.id)).size, espirito?.variantes?.length, 'ids repetidos');

  for (const simbolo of pecadosDoRito.pecados) {
    const variante = demonios.find(item => item.pecado === simbolo.id);
    assert.ok(variante, `falta o Pecado ${simbolo.id}`);
    assert.equal(variante.titulo, simbolo.titulo);
    assert.equal(variante.virtude_oposta, simbolo.virtude_oposta, 'o espelho do Anjo depende dessa ligação');
    assert.deepEqual((variante.caracteristicas || []).map(traco => traco.nivel_minimo), [1, 8, 15, 28, 40, 60], variante.id);
  }
});

test('o Espírito Angelical tem as sete Virtudes do rito, cada uma espelhando um Pecado', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const anjos = (espirito.variantes || []).filter(variante => variante.natureza === 'angelical');
  const demonios = (espirito.variantes || []).filter(variante => variante.natureza === 'demoniaca');
  assert.equal(anjos.length, 7);

  for (const simbolo of pecadosDoRito.virtudes) {
    const variante = anjos.find(item => item.virtude === simbolo.id);
    assert.ok(variante, `falta a Virtude ${simbolo.id}`);
    assert.equal(variante.titulo, simbolo.titulo);
    assert.equal(variante.pecado_oposto, simbolo.pecado_oposto);
    assert.deepEqual((variante.caracteristicas || []).map(traco => traco.nivel_minimo), [1, 8, 15, 28, 40, 60], variante.id);
  }

  // O espelho fecha nos dois sentidos: o Pecado aponta a Virtude e a Virtude aponta o Pecado.
  for (const demonio of demonios) {
    const espelho = anjos.find(anjo => anjo.pecado_oposto === demonio.pecado);
    assert.ok(espelho, `${demonio.id} sem Virtude oposta`);
    assert.equal(espelho.virtude, demonio.virtude_oposta);
  }
});

test('Demônio, Anjo e Espírito natural têm o mesmo orçamento de Mana, degrau por degrau', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const mana = (natureza: string) => obterEstagiosRaciais(espirito, { naturezaId: natureza }).map(estagio => estagio.mana);
  assert.deepEqual(mana('demoniaca'), mana('natural'));
  assert.deepEqual(mana('angelical'), mana('natural'));
});

test('o corpo só abre no nível 5: Possessão para o demônio, Encarnação para o anjo, nada para o natural', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const demonio = { naturezaId: 'demoniaca', varianteId: 'demonio-ira' };
  const anjo = { naturezaId: 'angelical', varianteId: 'anjo-paciencia' };
  const natural = { naturezaId: 'natural', varianteId: 'rosa' };
  const titulos = (escolha: Record<string, string>, nivel: number) =>
    obterTracosRaciaisDisponiveis(espirito, escolha, nivel).map(traco => traco.titulo);

  assert.ok(!titulos(demonio, 4).includes('Possessão'));
  assert.ok(titulos(demonio, 5).includes('Possessão'));
  assert.ok(!titulos(demonio, 60).includes('Encarnação'));

  assert.ok(!titulos(anjo, 4).includes('Encarnação'));
  assert.ok(titulos(anjo, 5).includes('Encarnação'));
  assert.ok(!titulos(anjo, 60).includes('Possessão'));

  for (const titulo of ['Possessão', 'Encarnação']) assert.ok(!titulos(natural, 60).includes(titulo));
});

test('o anjo só encarna com permissão, e o demônio pode possuir à força', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const tracoDe = (natureza: string, id: string) =>
    espirito.naturezas?.find(item => item.id === natureza)?.caracteristicas?.find(traco => traco.id === id);

  assert.match(String(tracoDe('angelical', 'encarnacao')?.descricao), /Nunca à força/);
  assert.equal(tracoDe('angelical', 'encarnacao')?.teste, undefined, 'anjo não rola teste contra o dono do corpo');
  assert.equal(tracoDe('demoniaca', 'possessao')?.teste, 'misticismo_vs_vontade');
});

test('cada Natureza leva só a própria escada e os próprios traços', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const titulos = (escolha: Record<string, string>, nivel: number) =>
    obterTracosRaciaisDisponiveis(espirito, escolha, nivel).map(traco => traco.titulo);

  const natural = titulos({ naturezaId: 'natural', varianteId: 'rosa' }, 60);
  assert.ok(natural.includes('Travessia Irrestrita'));
  assert.ok(!natural.includes('Labareda Infernal'));
  assert.ok(!natural.includes('Ira dos Condenados'));

  const demonio = titulos({ naturezaId: 'demoniaca', varianteId: 'demonio-ira' }, 60);
  assert.ok(demonio.includes('Labareda Infernal'));
  assert.ok(demonio.includes('Ira dos Condenados'));
  assert.ok(!demonio.includes('Travessia Irrestrita'));
  assert.ok(!demonio.includes('Marca de Sangue'), 'o Fluxo dos naturais não vem junto');

  // Ficha antiga, só com o Fluxo escolhido, continua sendo natural.
  assert.ok(titulos({ varianteId: 'rosa' }, 40).includes('Travessia Irrestrita'));

  const anjo = titulos({ naturezaId: 'angelical', varianteId: 'anjo-paciencia' }, 60);
  assert.ok(anjo.includes('Coro Redentor'));
  assert.ok(anjo.includes('Paz Imposta'));
  assert.ok(!anjo.includes('Labareda Infernal'));
  assert.ok(!anjo.includes('Travessia Irrestrita'));
});

/** Texto que o jogador lê: sem travessão, sem "eco" e sem a antítese "não é X, é Y". */
test('todo o texto do Espírito segue o tom da casa', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const textos: string[] = [];
  const colher = (valor: unknown) => {
    // Id (kebab-case, sem espaço) não é texto lido pelo jogador: "eco-de-origem" é só uma chave antiga.
    if (typeof valor === 'string') { if (valor.includes(' ')) textos.push(valor); }
    else if (Array.isArray(valor)) valor.forEach(colher);
    else if (valor && typeof valor === 'object') Object.values(valor).forEach(colher);
  };
  colher(espirito);
  assert.ok(textos.length > 400);

  for (const texto of textos) {
    assert.doesNotMatch(texto, /[–—]/, `travessão em: ${texto.slice(0, 60)}`);
    assert.doesNotMatch(texto, /\beco\b/i, `"eco" em: ${texto.slice(0, 60)}`);
    assert.doesNotMatch(texto, /\bnão (é|são|foi|era)\b[^.]*,\s*(é|são|foi|era)\b/i, `antítese em: ${texto.slice(0, 60)}`);
  }
});

test('o Espírito não fala mais em Cor: o nome é o do Fluxo, do Pecado ou da Virtude', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const naturais = (espirito.variantes || []).filter(variante => variante.natureza === 'natural');
  const nomesDeCor = ['Rosa', 'Amarelo', 'Prata', 'Verde', 'Laranja', 'Marrom', 'Roxo', 'Dourado Envelhecido', 'Preto', 'Vermelho Vinho', 'Azul Neon Artificial'];
  for (const variante of naturais) {
    assert.ok(!nomesDeCor.includes(variante.titulo), `${variante.id} ainda se chama ${variante.titulo}`);
  }
  assert.equal(espirito.rotulo_variante, 'Fluxo');

  // Cada marca tem o nome completo ("Espírito da Origem") e uma Provação própria.
  for (const marca of espirito.variantes || []) {
    assert.match(String(marca.nome_completo), /^(Espírito|Demônio|Anjo) d/, marca.id);
    assert.ok(String(marca.provacao).length > 30, `${marca.id} sem Provação`);
  }
  assert.equal(naturais.find(item => item.fluxo === 'origem')?.nome_completo, 'Espírito da Origem');

  const textoDaRaca = JSON.stringify(espirito);
  assert.doesNotMatch(textoDaRaca, /Cor da Alma|Cores da Alma|sua Cor|das onze Cores/);
});

test('o traço do nível 60 de toda marca só vale com a Provação, e os outros cinco não pedem nada', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  for (const marca of espirito.variantes || []) {
    for (const traco of marca.caracteristicas || []) {
      if (traco.nivel_minimo === 60) assert.equal(traco.requer_condicao, 'provacao-primordial', `${marca.id}/${traco.id}`);
      else assert.equal(traco.requer_condicao, undefined, `${marca.id}/${traco.id}`);
    }
  }
});

test('a página do Espírito separa as três Naturezas, cada uma com as próprias marcas e estágios', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const naturezas = organizarEspirito(espirito);

  assert.deepEqual(naturezas.map(item => item.natureza.id), ['natural', 'demoniaca', 'angelical']);
  assert.deepEqual(naturezas.map(item => item.rotuloMarca), ['Fluxo', 'Pecado', 'Virtude']);
  assert.deepEqual(naturezas.map(item => item.marcas.length), [12, 7, 7]);
  assert.deepEqual(naturezas.map(marcasEscolhiveis), [11, 7, 7], 'o Universal não conta: só o Mestre concede');
  for (const item of naturezas) {
    assert.equal(item.estagios.length, 6, item.natureza.id);
    assert.ok(item.estagios.every(estagio => !estagio.natureza || estagio.natureza === item.natureza.id));
  }
  assert.deepEqual(naturezas.map(item => item.tracos.length), [0, 1, 1], 'só a demoníaca e a angelical dão corpo');
  assert.deepEqual(
    naturezas[1].estagios.map(nomeCurtoDoEstagio),
    ['Menor', 'Mediano', 'Maior', 'Superior', 'Arquidemônio', 'Primordial'],
  );
});

test('toda marca do Espírito tem paleta própria, e as de Natureza não caem na cor padrão', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  for (const marca of espirito.variantes || []) {
    assert.ok(marca.id in ESTILO_POR_MARCA, `${marca.id} sem paleta`);
    assert.notEqual(estiloDaMarca(marca.id), ESTILO_MARCA_PADRAO);
  }
  assert.equal(estiloDaMarca('marca-inexistente'), ESTILO_MARCA_PADRAO);
});

test('a página liga cada Pecado à Virtude oposta e de volta', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const naturezas = organizarEspirito(espirito);
  const demonios = naturezas[1].marcas;

  for (const demonio of demonios) {
    const ida = marcaOposta(demonio, naturezas);
    assert.ok(ida, `${demonio.id} sem oposta`);
    assert.equal(ida.natureza.natureza.id, 'angelical');
    const volta = marcaOposta(ida.marca, naturezas);
    assert.equal(volta?.marca.id, demonio.id, 'o espelho tem que fechar nos dois sentidos');
  }
  assert.equal(marcaOposta(naturezas[0].marcas[0], naturezas), null, 'Fluxo não tem oposto');
});

test('a marca aberta vem da URL, e uma marca de outra Natureza volta para a primeira', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const [natural, demoniaca] = organizarEspirito(espirito);

  assert.equal(marcaSelecionada(demoniaca, 'demonio-ira')?.id, 'demonio-ira');
  assert.equal(marcaSelecionada(demoniaca, null)?.id, demoniaca.marcas[0].id);
  assert.equal(marcaSelecionada(demoniaca, 'rosa')?.id, demoniaca.marcas[0].id, 'rosa é do natural');
  assert.equal(marcaSelecionada(natural, 'rosa')?.id, 'rosa');
});

test('catálogo antigo, sem Naturezas, ainda vira uma página com uma Natureza só', () => {
  const antigo: IRaca = {
    id: 'espirito',
    titulo: 'Espírito',
    variantes: [{ id: 'rosa', titulo: 'Rosa' }, { id: 'preto', titulo: 'Preto' }],
    estagios: [{ id: 'menor', titulo: 'Espírito Menor', nivel_minimo: 1 }],
  };
  const naturezas = organizarEspirito(antigo);
  assert.equal(naturezas.length, 1);
  assert.equal(naturezas[0].natureza.id, 'natural');
  assert.equal(naturezas[0].marcas.length, 2);
  assert.equal(naturezas[0].estagios.length, 1);
});

test('as etiquetas de um traço resumem tipo, Mana, usos e alcance', () => {
  assert.deepEqual(
    etiquetasDoTraco({ id: 'x', titulo: 'X', tipo: 'acao', custo_mana: 4, usos: 1, recuperacao: 'cena', alcance_m: 1.5 }),
    ['Ação', '4 Mana', '1 vez por cena', '1,5 m'],
  );
  assert.deepEqual(
    etiquetasDoTraco({ id: 'y', titulo: 'Y', tipo: 'acao_completa', custo_mana: 8, usos: 2, recuperacao: 'sessao' }),
    ['Ação completa', '8 Mana', '2 vezes por sessão'],
  );
  assert.deepEqual(etiquetasDoTraco({ id: 'z', titulo: 'Z', tipo: 'passiva', custo_mana: 0 }), ['Passiva']);
});

test('cada Natureza do Espírito tem a sua língua, e a tabela de idiomas do Mundo diz o mesmo', () => {
  const jardim = JSON.parse(readFileSync(new URL('../../data/mundo/Jardim/jardim.json', import.meta.url), 'utf8'));
  const idiomas = jardim.entradas.find((entrada: { id: string }) => entrada.id === 'idiomas-do-jardim');
  const tabela: string[] = idiomas.conteudo.tabela;
  const linhas = tabela.map(linha => linha.split('|').map(parte => parte.trim()));

  assert.equal(linhas.length, 16, 'treze povos e os dragões, dezesseis línguas');
  assert.deepEqual(linhas.filter(l => l[1].startsWith('Espíritos')).map(l => [l[0], l[1]]), [
    ['Enoquiano', 'Espíritos naturais'],
    ['Aramaico', 'Espíritos demoníacos'],
    ['Hebraico', 'Espíritos angelicais'],
  ]);
  assert.equal(new Set(linhas.map(l => l[0])).size, 16, 'idioma repetido');
  assert.match(idiomas.conteudo.descricao, /dezesseis línguas/);

  const espirito = racas.find(item => item.id === 'espirito')!;
  const falas = Object.fromEntries((espirito.naturezas || []).map(n => [n.id, String(n.descricao)]));
  assert.match(falas.natural, /Fala Enoquiano\.$/);
  assert.match(falas.demoniaca, /Fala Aramaico\.$/);
  assert.match(falas.angelical, /Fala Hebraico\.$/);
});

test('trocar a Forma da Animália mantém a Morfologia, mas trocar a Natureza do Espírito solta a marca', () => {
  const animalia = racas.find(item => item.id === 'animalia');
  const espirito = racas.find(item => item.id === 'espirito');
  assert.ok(animalia && espirito);
  // A Morfologia da Animália não pertence a uma Forma: vale para as três.
  for (const forma of ['fera', 'hibrido', 'tracos']) {
    assert.equal(varianteServeANatureza(animalia, 'alada', forma), true, forma);
  }
  // A marca do Espírito pertence a uma Natureza só.
  assert.equal(varianteServeANatureza(espirito, 'rosa', 'natural'), true);
  assert.equal(varianteServeANatureza(espirito, 'rosa', 'demoniaca'), false);
  assert.equal(varianteServeANatureza(espirito, 'demonio-ira', 'demoniaca'), true);
  assert.equal(varianteServeANatureza(espirito, 'demonio-ira', 'angelical'), false);
  // Sem variante escolhida não há o que invalidar.
  assert.equal(varianteServeANatureza(espirito, undefined, 'angelical'), true);
});

test('a Animália ganha a arma natural da Forma, com o nome do animal, e os Traços não têm', () => {
  const animalia = racas.find(item => item.id === 'animalia') as IRaca;
  assert.ok(animalia);
  assert.deepEqual(obterArmaNaturalRacial(animalia, { naturezaId: 'fera', varianteId: 'predadora', animalId: 'leao' }), { nome: 'Garra de Leão', dano: '1d8' });
  assert.deepEqual(obterArmaNaturalRacial(animalia, { naturezaId: 'hibrido', varianteId: 'aquatica', animalId: 'orca' }), { nome: 'Mordida de Orca', dano: '1d6' });
  assert.equal(obterArmaNaturalRacial(animalia, { naturezaId: 'tracos', varianteId: 'alada', animalId: 'coruja' }), null, 'os Traços não têm arma natural');
  // Animal escrito pelo jogador ou ainda não escolhido: a arma existe, só não tem nome de bicho.
  assert.deepEqual(obterArmaNaturalRacial(animalia, { naturezaId: 'fera', varianteId: 'agil' }), { nome: 'Arma natural', dano: '1d8' });
  // Ficha antiga, sem Forma, vale como Híbrido.
  assert.deepEqual(obterArmaNaturalRacial(animalia, { varianteId: 'agil', animalId: 'gato' }), { nome: 'Garra de Gato', dano: '1d6' });
  // Outras raças não ganham arma natural por aqui.
  assert.equal(obterArmaNaturalRacial(racas.find(item => item.id === 'humano') as IRaca, {}), null);
  assert.equal(obterArmaNaturalRacial(null, {}), null);
});

test('toda arma natural declarada na Forma traz dano em dado e todo animal diz o nome da sua arma', () => {
  const animalia = racas.find(item => item.id === 'animalia') as IRaca;
  for (const forma of animalia.naturezas ?? []) {
    if (forma.sem_arma_natural) assert.equal(forma.arma_natural_dano, undefined, `${forma.id} não pode ter dano de arma natural`);
    else assert.match(String(forma.arma_natural_dano), /^\d+d\d+$/, `${forma.id} precisa de dano de arma natural`);
  }
  for (const animal of animalia.animais ?? []) assert.ok(animal.arma_natural, `${animal.id} sem nome de arma natural`);
});
