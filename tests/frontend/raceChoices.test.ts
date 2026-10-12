import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcularDerivados, obterVarianteRacial } from '../../src/services/calculoService';
import { FLUXO_TEMAS, TEMA_UNIVERSAL } from '../../src/services/magiaService';
import {
  escolhaRacialEstaCompleta,
  obterGruposEscolhaRacial,
  obterNaturezaRacialId,
  obterEstagiosRaciais,
  obterOpcoesRaciaisSelecionadas,
  obterTracosRaciaisDisponiveis,
  opcoesEscolhiveis,
} from '../../src/services/racaService';
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
    new URL('../../src/redesign/raca/Espirito.tsx', import.meta.url),
    'utf8',
  );
  for (const cor of cores) {
    const destaque = FLUXO_TEMAS[cor.fluxo as keyof typeof FLUXO_TEMAS].destaque;
    const canais = [1, 3, 5].map(inicio => parseInt(destaque.slice(inicio, inicio + 2), 16));
    const linha = pagina
      .split('\n')
      .find(item => new RegExp(`^\\s*'?${cor.id}'?:`).test(item));
    assert.ok(linha, `Fluxo ${cor.id} ausente de ESTILO_POR_COR`);

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

test('o Fluxo Universal do Espírito é só do Mestre, tem um traço por degrau e tinta própria', () => {
  const espirito = racas.find(item => item.id === 'espirito');
  const universal = espirito?.variantes?.find(variante => variante.fluxo === 'universal');
  assert.ok(universal, 'Fluxo Universal ausente do Espírito');

  assert.equal(universal.somente_mestre, true);
  assert.equal(universal.natureza, 'natural');
  assert.deepEqual(
    (universal.caracteristicas || []).map(traco => traco.nivel_minimo),
    [1, 15, 40],
    'um traço por degrau, como os outros onze',
  );

  // Jogador comum não vê a opção para escolher; o Mestre vê.
  const todas = obterGruposEscolhaRacial(espirito, { naturezaId: 'natural' })[1].opcoes;
  assert.ok(!opcoesEscolhiveis(todas, false).some(opcao => opcao.id === universal.id));
  assert.ok(opcoesEscolhiveis(todas, true).some(opcao => opcao.id === universal.id));

  // A ficha que já tem o Universal continua completa e mostra o próprio rótulo.
  assert.equal(escolhaRacialEstaCompleta(espirito, { naturezaId: 'natural', varianteId: universal.id }), true);

  const pagina = readFileSync(new URL('../../src/redesign/raca/Espirito.tsx', import.meta.url), 'utf8');
  const linha = pagina.split('\n').find(item => new RegExp(`^\\s*'?${universal.id}'?:`).test(item));
  assert.ok(linha, 'Universal ausente de ESTILO_POR_COR');
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
    assert.deepEqual((variante.caracteristicas || []).map(traco => traco.nivel_minimo), [1, 15, 40], variante.id);
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
    assert.deepEqual((variante.caracteristicas || []).map(traco => traco.nivel_minimo), [1, 15, 40], variante.id);
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
test('o texto do Espírito Demoníaco e do Angelical segue o tom da casa', () => {
  const espirito = racas.find(item => item.id === 'espirito')!;
  const textos: string[] = [];
  const colher = (valor: unknown) => {
    if (typeof valor === 'string') textos.push(valor);
    else if (Array.isArray(valor)) valor.forEach(colher);
    else if (valor && typeof valor === 'object') Object.values(valor).forEach(colher);
  };
  const dosNovos = (item: { natureza?: string; id?: string }) => ['demoniaca', 'angelical'].includes(String(item.natureza ?? item.id));
  colher(espirito.naturezas?.filter(dosNovos));
  colher(espirito.variantes?.filter(dosNovos));
  colher(espirito.estagios?.filter(dosNovos));
  colher([espirito.descricao, espirito.descricao_naturezas]);
  assert.ok(textos.length > 120);

  for (const texto of textos) {
    assert.doesNotMatch(texto, /[\u2013\u2014]/, `travessão em: ${texto.slice(0, 60)}`);
    assert.doesNotMatch(texto, /\beco\b/i, `"eco" em: ${texto.slice(0, 60)}`);
    assert.doesNotMatch(texto, /\bnão (é|são|foi|era)\b[^.]*,\s*(é|são|foi|era)\b/i, `antítese em: ${texto.slice(0, 60)}`);
  }
});
