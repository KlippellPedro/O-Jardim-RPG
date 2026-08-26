import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calcularDerivados } from '../../src/services/calculoService';
import {
  nivelMinimoTraco,
  obterEstagioRacialAtivo,
  obterEstagiosRaciais,
  obterEstagiosRaciaisAlcancados,
  obterGruposEscolhaRacial,
  obterTracosRaciaisDisponiveis,
} from '../../src/services/racaService';
import type { IRaca } from '../../src/types/catalogo';

const racas = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
) as IRaca[];

const porId = (id: string) => racas.find(item => item.id === id) as IRaca;
const espirito = porId('espirito');

function tracoPorId(racaId: string, tracoId: string) {
  const raca = porId(racaId);
  const colecoes = [
    raca.caracteristicas || [],
    ...(raca.estagios || []).map(item => item.caracteristicas || []),
    ...(raca.variantes || []).map(item => item.caracteristicas || []),
    ...(raca.linhagens || []).map(item => item.caracteristicas || []),
  ];
  return colecoes.flat().find(traco => traco.id === tracoId);
}

/** O que interessa é a diferença entre níveis, não o valor absoluto. Constituição
 * e Sabedoria vêm acima de 10 de propósito: com modificador zero, raças de Vida ou
 * Mana negativa batem no piso de 1 que `calcularDerivados` aplica, e o piso
 * esconderia o degrau que o teste quer medir. */
const ATRIBUTOS = {
  forca: 10, destreza: 10, constituicao: 16,
  inteligencia: 10, sabedoria: 16, carisma: 10, fluxo: 10,
};

/** Cada raça com escada e os degraus que ela publica. Limiares são por raça, de
 * propósito: o Slime engorda cedo, o Elfo leva séculos. A escada inteira foi
 * calibrada para o teto real da ficha, que é 60 e não 20: o degrau do meio caiu
 * onde ficava vezes 1,5 e o do topo vezes 2. */
const ESCADAS: Array<[string, [number, number, number], string]> = [
  ['espirito', [1, 15, 40], 'varianteId'],
  ['slime', [1, 9, 28], 'varianteId'],
  ['anao', [1, 11, 26], 'varianteId'],
  ['sereia', [1, 12, 32], 'varianteId'],
  ['golem', [1, 12, 36], 'varianteId'],
  ['gigante', [1, 14, 36], 'varianteId'],
  ['vampiro', [1, 17, 42], 'varianteId'],
  ['auleth', [1, 18, 44], 'varianteId'],
  ['elfo', [1, 20, 50], 'linhagemId'],
  ['simbionte', [1, 11, 30], 'varianteId'],
  ['mimico', [1, 12, 34], 'varianteId'],
  ['onirico', [1, 15, 40], 'varianteId'],
  ['divino', [1, 18, 48], 'varianteId'],
];

test('cada raça com escada publica os degraus esperados, em ordem', () => {
  for (const [racaId, degraus] of ESCADAS) {
    const raca = porId(racaId);
    assert.ok(raca, `raça ausente: ${racaId}`);
    assert.deepEqual(
      obterEstagiosRaciais(raca).map(nivelMinimoTraco),
      [...degraus],
      `degraus inesperados em ${racaId}`,
    );
  }
});

test('o estágio ativo vira exatamente no limiar, nunca um nível antes', () => {
  for (const [racaId, [base, meio, topo]] of ESCADAS) {
    const raca = porId(racaId);
    const estagios = obterEstagiosRaciais(raca);
    const id = (nivel: number) => obterEstagioRacialAtivo(raca, nivel)?.id;

    assert.equal(id(base), estagios[0].id, `${racaId}: nível ${base}`);
    assert.equal(id(meio - 1), estagios[0].id, `${racaId}: nível ${meio - 1} ainda é o primeiro degrau`);
    assert.equal(id(meio), estagios[1].id, `${racaId}: nível ${meio} vira o segundo degrau`);
    assert.equal(id(topo - 1), estagios[1].id, `${racaId}: nível ${topo - 1} ainda é o segundo degrau`);
    assert.equal(id(topo), estagios[2].id, `${racaId}: nível ${topo} vira o terceiro degrau`);
    assert.equal(id(60), estagios[2].id, `${racaId}: o topo não muda mais`);

    // Os degraus se acumulam - quem chegou no topo mantém o que o meio deu.
    assert.equal(obterEstagiosRaciaisAlcancados(raca, topo).length, 3, `${racaId}: acúmulo no topo`);
  }
});

test('raça sem escada não ganha estágio nenhum', () => {
  const humano = porId('humano');
  assert.equal(obterEstagiosRaciais(humano).length, 0);
  assert.equal(obterEstagioRacialAtivo(humano, 30), null);
  assert.deepEqual(obterEstagiosRaciaisAlcancados(humano, 30), []);
});

test('poderes raciais complexos publicam seus limites sem brechas de interpretação', () => {
  assert.equal(tracoPorId('gigante', 'porte-colossal')?.titulo, 'Porte de Gigante');

  const divisao = String(tracoPorId('slime', 'divisao-instavel')?.descricao);
  assert.match(divisao, /compartilham sua Mana/);
  assert.match(divisao, /única Reação/);
  assert.match(divisao, /Nenhuma metade pode usar Divisão Instável/);

  const copia = String(tracoPorId('mimico', 'qualquer-um')?.descricao);
  assert.match(copia, /característica racial de nível 1/);
  assert.match(copia, /não concede bônus de Vida, Mana ou Defesa/);
  assert.match(copia, /custos e limites de uso continuam valendo/);

  const sepulcro = String(tracoPorId('elfo', 'sepulcro-prolongado')?.descricao);
  assert.doesNotMatch(sepulcro, /em vez de três/);

  const sonhoAberto = String(tracoPorId('onirico', 'sonho-aberto')?.descricao);
  assert.match(sonhoAberto, /ninguém pode ficar Caído nem sofrer dano de queda/);
  assert.match(sonhoAberto, /nenhum som é produzido ou atravessa a área/);
  assert.match(sonhoAberto, /embora possa ficar em silêncio/);
});

test('todo traço de escolha racial destrava num degrau que a raça realmente tem', () => {
  for (const [racaId] of ESCADAS) {
    const raca = porId(racaId);
    const degraus = new Set(obterEstagiosRaciais(raca).map(nivelMinimoTraco));
    for (const grupo of obterGruposEscolhaRacial(raca)) {
      for (const opcao of grupo.opcoes) {
        for (const traco of opcao.caracteristicas || []) {
          assert.ok(
            degraus.has(nivelMinimoTraco(traco)),
            `${racaId}/${opcao.id}: "${traco.titulo}" exige nível ${nivelMinimoTraco(traco)}, que não é degrau desta raça`,
          );
        }
      }
    }
  }
});

test('Vida e Mana crescem nos limiares, e só neles', () => {
  const recursos = (racaId: string, nivel: number, escolha: Record<string, string>) => {
    const d = calcularDerivados(ATRIBUTOS, porId(racaId), nivel, escolha);
    return { vida: d.vida, mana: d.mana };
  };

  // Espírito: +3 Mana no 15, +6 no 40.
  assert.equal(recursos('espirito', 15, { varianteId: 'vermelho-vinho' }).mana,
    recursos('espirito', 14, { varianteId: 'vermelho-vinho' }).mana + 3);
  assert.equal(recursos('espirito', 40, { varianteId: 'vermelho-vinho' }).mana,
    recursos('espirito', 39, { varianteId: 'vermelho-vinho' }).mana + 6);

  // Slime: +5 Vida no 9, +12 no 28.
  assert.equal(recursos('slime', 9, { varianteId: 'acido' }).vida,
    recursos('slime', 8, { varianteId: 'acido' }).vida + 5);
  assert.equal(recursos('slime', 28, { varianteId: 'acido' }).vida,
    recursos('slime', 27, { varianteId: 'acido' }).vida + 12);

  // Gigante: +6 Vida no 14, +16 no 36.
  assert.equal(recursos('gigante', 14, { varianteId: 'pedra' }).vida,
    recursos('gigante', 13, { varianteId: 'pedra' }).vida + 6);
  assert.equal(recursos('gigante', 36, { varianteId: 'pedra' }).vida,
    recursos('gigante', 35, { varianteId: 'pedra' }).vida + 16);

  // Sereia: +3 Mana no 12, +6 no 32.
  assert.equal(recursos('sereia', 12, { varianteId: 'mare' }).mana,
    recursos('sereia', 11, { varianteId: 'mare' }).mana + 3);
  assert.equal(recursos('sereia', 32, { varianteId: 'mare' }).mana,
    recursos('sereia', 31, { varianteId: 'mare' }).mana + 6);

  // Golem: +6 Vida no 12, +16 no 36.
  assert.equal(recursos('golem', 12, { varianteId: 'ferro' }).vida,
    recursos('golem', 11, { varianteId: 'ferro' }).vida + 6);
  assert.equal(recursos('golem', 36, { varianteId: 'ferro' }).vida,
    recursos('golem', 35, { varianteId: 'ferro' }).vida + 16);

  // Vampiro: +5 Vida no 17; no 42 somam +8 Vida e +4 Mana de uma vez.
  assert.equal(recursos('vampiro', 17, { varianteId: 'strigoi' }).vida,
    recursos('vampiro', 16, { varianteId: 'strigoi' }).vida + 5);
  assert.equal(recursos('vampiro', 42, { varianteId: 'strigoi' }).vida,
    recursos('vampiro', 41, { varianteId: 'strigoi' }).vida + 8);
  assert.equal(recursos('vampiro', 42, { varianteId: 'strigoi' }).mana,
    recursos('vampiro', 41, { varianteId: 'strigoi' }).mana + 4);

  // Auleth: +3 Mana no 18; no 44 somam +6 Mana e +4 Vida de uma vez.
  assert.equal(recursos('auleth', 18, { varianteId: 'planeta' }).mana,
    recursos('auleth', 17, { varianteId: 'planeta' }).mana + 3);
  assert.equal(recursos('auleth', 44, { varianteId: 'planeta' }).mana,
    recursos('auleth', 43, { varianteId: 'planeta' }).mana + 6);
  assert.equal(recursos('auleth', 44, { varianteId: 'planeta' }).vida,
    recursos('auleth', 43, { varianteId: 'planeta' }).vida + 4);

  // Elfo: +3 Mana no 20, +6 no 50.
  assert.equal(recursos('elfo', 20, { linhagemId: 'gelo' }).mana,
    recursos('elfo', 19, { linhagemId: 'gelo' }).mana + 3);
  assert.equal(recursos('elfo', 50, { linhagemId: 'gelo' }).mana,
    recursos('elfo', 49, { linhagemId: 'gelo' }).mana + 6);

  // Simbionte: +3 Vida e +2 Mana no 11; +6 Vida e +4 Mana no 30.
  assert.equal(recursos('simbionte', 11, { varianteId: 'colonia' }).vida,
    recursos('simbionte', 10, { varianteId: 'colonia' }).vida + 3);
  assert.equal(recursos('simbionte', 30, { varianteId: 'colonia' }).mana,
    recursos('simbionte', 29, { varianteId: 'colonia' }).mana + 4);

  // Mímico: +3 Mana no 12; no 34 somam +4 Vida e +6 Mana de uma vez.
  assert.equal(recursos('mimico', 12, { varianteId: 'carne' }).mana,
    recursos('mimico', 11, { varianteId: 'carne' }).mana + 3);
  assert.equal(recursos('mimico', 34, { varianteId: 'carne' }).vida,
    recursos('mimico', 33, { varianteId: 'carne' }).vida + 4);
  assert.equal(recursos('mimico', 34, { varianteId: 'carne' }).mana,
    recursos('mimico', 33, { varianteId: 'carne' }).mana + 6);

  // Onírico: +2 Vida e +3 Mana no 15; +2 Vida e +6 Mana no 40.
  assert.equal(recursos('onirico', 15, { varianteId: 'pesadelo' }).mana,
    recursos('onirico', 14, { varianteId: 'pesadelo' }).mana + 3);
  assert.equal(recursos('onirico', 40, { varianteId: 'pesadelo' }).mana,
    recursos('onirico', 39, { varianteId: 'pesadelo' }).mana + 6);

  // Divino: +2 Vida e +3 Mana no 18; +4 Vida e +6 Mana no 48.
  assert.equal(recursos('divino', 18, { varianteId: 'guerra' }).vida,
    recursos('divino', 17, { varianteId: 'guerra' }).vida + 2);
  assert.equal(recursos('divino', 48, { varianteId: 'guerra' }).vida,
    recursos('divino', 47, { varianteId: 'guerra' }).vida + 4);
  assert.equal(recursos('divino', 48, { varianteId: 'guerra' }).mana,
    recursos('divino', 47, { varianteId: 'guerra' }).mana + 6);
});

test('Movimento declarado em traço racial entra no Movimento derivado', () => {
  const movimento = (racaId: string, varianteId: string) => calcularDerivados(
    ATRIBUTOS, porId(racaId), 1, { varianteId },
  ).movimento;

  // Trajetória (Cometa) declara +1,5 m no próprio traço; as outras Origens não.
  assert.equal(movimento('auleth', 'cometa'), movimento('auleth', 'estrela') + 1.5);
  // Morfologia Ágil declara no objeto da variante - os dois caminhos somam.
  assert.equal(movimento('animalia', 'agil'), movimento('animalia', 'robusta') + 1.5);
});

test('Defesa passiva declarada na opção racial entra na Defesa Natural', () => {
  const defesa = (racaId: string, varianteId: string) => calcularDerivados(
    ATRIBUTOS, porId(racaId), 1, { varianteId },
  ).defesaNatural;

  assert.equal(defesa('espirito', 'marrom'), defesa('espirito', 'rosa') + 2);
  assert.equal(defesa('slime', 'cristal'), defesa('slime', 'acido') + 2);
  assert.equal(defesa('gigante', 'pedra'), defesa('gigante', 'gelo') + 2);
  assert.equal(defesa('golem', 'ferro'), defesa('golem', 'madeira') + 3);
  assert.equal(defesa('auleth', 'planeta'), defesa('auleth', 'cometa') + 2);
});

test('os traços disponíveis respeitam o nível exigido, e só os da escolha feita', () => {
  const titulos = (racaId: string, escolha: Record<string, string>, nivel: number) =>
    obterTracosRaciaisDisponiveis(porId(racaId), escolha, nivel).map(traco => traco.titulo);

  // Espírito Vermelho Vinho: um traço por degrau.
  const vinho = (nivel: number) => titulos('espirito', { varianteId: 'vermelho-vinho' }, nivel);
  assert.ok(vinho(1).includes('Marca de Sangue'));
  assert.ok(!vinho(14).includes('Fúria Carmesim'));
  assert.ok(vinho(15).includes('Fúria Carmesim'));
  assert.ok(vinho(15).includes('Névoa Persistente'), 'o traço do estágio entra junto');
  assert.ok(!vinho(39).includes('Presságio do Fim'));
  assert.ok(vinho(40).includes('Presságio do Fim'));
  assert.ok(!vinho(40).includes('Lembrança de Vida'), 'a Cor escolhida não traz as outras');

  // Slime Ácido cresce comendo.
  const acido = (nivel: number) => titulos('slime', { varianteId: 'acido' }, nivel);
  assert.ok(acido(1).includes('Toque Corrosivo'));
  assert.ok(!acido(8).includes('Engolir'));
  assert.ok(acido(9).includes('Engolir'));
  assert.ok(!acido(27).includes('Divisão Instável'));
  assert.ok(acido(28).includes('Divisão Instável'));
  assert.ok(acido(28).includes('Poça Corrosiva'));

  // Elfo: as Linhagens só se aprofundam no Ancião e no Milenar.
  const sombras = (nivel: number) => titulos('elfo', { linhagemId: 'sombras' }, nivel);
  assert.ok(sombras(1).includes('Passo Umbral'));
  assert.ok(!sombras(19).includes('Passo Umbral Duplo'));
  assert.ok(sombras(20).includes('Passo Umbral Duplo'));
  assert.ok(sombras(20).includes('Memória Acumulada'));
  assert.ok(!sombras(49).includes('Manto sem Fim'));
  assert.ok(sombras(50).includes('Manto sem Fim'));

  // Anão: a maestria é do Ofício escolhido, e o traço-base continua valendo.
  const runista = (nivel: number) => titulos('anao', { varianteId: 'runista' }, nivel);
  assert.ok(runista(1).includes('Mãos de Ofício'));
  assert.ok(!runista(10).includes('Mão Treinada'));
  assert.ok(runista(11).includes('Mão Treinada'));
  assert.ok(runista(26).includes('Mão de Mestre'));
  assert.ok(runista(26).includes('Selo Ancestral'));
  assert.ok(!runista(26).includes('Obra de Mestre'), 'Ofício de Ferreiro não vaza para o Runista');

  // Vampiro Sangvin: o Clã escolhido não traz o poder dos outros.
  const sangvin = (nivel: number) => titulos('vampiro', { varianteId: 'sangvin' }, nivel);
  assert.ok(sangvin(1).includes('Hemofagia'), 'o traço-base do Vampiro continua valendo');
  assert.ok(sangvin(1).includes('Hemomancia'));
  assert.ok(!sangvin(16).includes('Transfusão'));
  assert.ok(sangvin(17).includes('Transfusão'));
  assert.ok(sangvin(17).includes('Hemofagia Profunda'), 'o degrau do Sangue Velho entra junto');
  assert.ok(!sangvin(41).includes('Maré Vermelha'));
  assert.ok(sangvin(42).includes('Maré Vermelha'));
  assert.ok(sangvin(42).includes('Fome de Senhor'), 'no topo a fome cobra mais caro');
  assert.ok(!sangvin(42).includes('Garras do Strigoi'), 'Clã escolhido não vaza para os outros');

  // Golem de Argila: o material decide, e os reforços valem para todo Golem.
  const argila = (nivel: number) => titulos('golem', { varianteId: 'argila' }, nivel);
  assert.ok(argila(1).includes('Forma Refeita'));
  assert.ok(!argila(11).includes('Solda sobre Solda'));
  assert.ok(argila(12).includes('Solda sobre Solda'));
  assert.ok(argila(12).includes('Membro Improvisado'));
  assert.ok(!argila(35).includes('Selo na Testa'));
  assert.ok(argila(36).includes('Selo na Testa'));
  assert.ok(argila(36).includes('Estrutura Monumental'));

  // Auleth Cometa: a Origem escolhida não traz a das outras.
  const cometa = (nivel: number) => titulos('auleth', { varianteId: 'cometa' }, nivel);
  assert.ok(cometa(1).includes('Trajetória'));
  assert.ok(cometa(1).includes('Forma sem Molde'), 'o traço-base do Auleth continua valendo');
  assert.ok(!cometa(17).includes('Reentrada'));
  assert.ok(cometa(18).includes('Reentrada'));
  assert.ok(cometa(18).includes('Molde Estável'), 'o degrau Coerente entra junto');
  assert.ok(!cometa(43).includes('Impacto'));
  assert.ok(cometa(44).includes('Impacto'));
  assert.ok(cometa(44).includes('Presença Alheia'));
  assert.ok(!cometa(44).includes('Corpo Radiante'), 'Origem escolhida não vaza para as outras');

  // Mímico Molde do Objeto: o baú clássico só arma o bote no segundo degrau.
  const objeto = (nivel: number) => titulos('mimico', { varianteId: 'objeto' }, nivel);
  assert.ok(objeto(1).includes('Forma Emprestada'), 'o traço-base do Mímico continua valendo');
  assert.ok(objeto(1).includes('Coisa Parada'));
  assert.ok(!objeto(11).includes('Bote do Baú'));
  assert.ok(objeto(12).includes('Bote do Baú'));
  assert.ok(objeto(12).includes('Formas Guardadas'), 'o degrau Muitos Rostos entra junto');
  assert.ok(!objeto(33).includes('Peso de Mentira'));
  assert.ok(objeto(34).includes('Peso de Mentira'));
  assert.ok(objeto(34).includes('Cara de Ninguém'));
  assert.ok(!objeto(34).includes('Rosto Estudado'), 'Molde escolhido não vaza para os outros');

  // Simbionte Enxame: a parceria só se ajusta com o tempo de convivência.
  const enxame = (nivel: number) => titulos('simbionte', { varianteId: 'enxame' }, nivel);
  assert.ok(enxame(1).includes('Metabolismo Composto'));
  assert.ok(enxame(1).includes('Corpo em Enxame'));
  assert.ok(!enxame(10).includes('Divisão Momentânea'));
  assert.ok(enxame(11).includes('Divisão Momentânea'));
  assert.ok(enxame(11).includes('Divisão de Trabalho'));
  assert.ok(!enxame(29).includes('Nuvem Viva'));
  assert.ok(enxame(30).includes('Nuvem Viva'));
  assert.ok(enxame(30).includes('Corpo Redundante'));
  assert.ok(!enxame(30).includes('Rede da Colônia'), 'Tipo escolhido não vaza para os outros');

  // Onírico Pesadelo: a parte de Sonhar escolhida só se abre quando a Vigília sobe.
  const pesadelo = (nivel: number) => titulos('onirico', { varianteId: 'pesadelo' }, nivel);
  assert.ok(pesadelo(1).includes('Passo Entre-Sonhos'));
  assert.ok(pesadelo(1).includes('Cara que Não Fecha'));
  assert.ok(!pesadelo(14).includes('Pesadelo que Pega'));
  assert.ok(pesadelo(15).includes('Pesadelo que Pega'));
  assert.ok(pesadelo(15).includes('Mão no Sonhar'));
  assert.ok(!pesadelo(39).includes('Noite Sem Fim'));
  assert.ok(pesadelo(40).includes('Noite Sem Fim'));
  assert.ok(pesadelo(40).includes('Corpo de Sonho'));
  assert.ok(!pesadelo(40).includes('Pés Fora do Chão'), 'Sonho de Origem não vaza para os outros');

  // Divino da Guerra: o Domínio cresce junto com a Ascendência.
  const guerra = (nivel: number) => titulos('divino', { naturezaDivinaId: 'semideus', varianteId: 'guerra' }, nivel);
  assert.ok(guerra(1).includes('Sangue Divino'));
  assert.ok(guerra(1).includes('Poder Herdado'));
  assert.ok(guerra(1).includes('Fúria Sagrada'));
  assert.ok(!guerra(17).includes('Investida do Deus'));
  assert.ok(guerra(18).includes('Investida do Deus'));
  assert.ok(guerra(18).includes('Domínio Desperto'));
  assert.ok(!guerra(47).includes('Nome de Batalha'));
  assert.ok(guerra(48).includes('Nome de Batalha'));
  assert.ok(guerra(48).includes('Forma Divina'));
  assert.ok(!guerra(48).includes('Toque que Cura'), 'Domínio escolhido não vaza para os outros');
});
