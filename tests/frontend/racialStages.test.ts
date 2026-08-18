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

/** O que interessa é a diferença entre níveis, não o valor absoluto. Constituição
 * e Sabedoria vêm acima de 10 de propósito: com modificador zero, raças de Vida ou
 * Mana negativa batem no piso de 1 que `calcularDerivados` aplica, e o piso
 * esconderia o degrau que o teste quer medir. */
const ATRIBUTOS = {
  forca: 10, destreza: 10, constituicao: 16,
  inteligencia: 10, sabedoria: 16, carisma: 10, fluxo: 10,
};

/** Cada raça com escada e os degraus que ela publica. Limiares são por raça, de
 * propósito: o Slime engorda cedo, o Elfo leva séculos. */
const ESCADAS: Array<[string, [number, number, number], string]> = [
  ['espirito', [1, 10, 20], 'varianteId'],
  ['slime', [1, 6, 14], 'varianteId'],
  ['anao', [1, 7, 13], 'varianteId'],
  ['sereia', [1, 8, 16], 'varianteId'],
  ['golem', [1, 8, 18], 'varianteId'],
  ['gigante', [1, 9, 18], 'varianteId'],
  ['vampiro', [1, 11, 21], 'varianteId'],
  ['auleth', [1, 12, 22], 'varianteId'],
  ['elfo', [1, 13, 25], 'linhagemId'],
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

  // Espírito: +2 Mana no 10, +3 no 20.
  assert.equal(recursos('espirito', 10, { varianteId: 'vermelho-vinho' }).mana,
    recursos('espirito', 9, { varianteId: 'vermelho-vinho' }).mana + 2);
  assert.equal(recursos('espirito', 20, { varianteId: 'vermelho-vinho' }).mana,
    recursos('espirito', 19, { varianteId: 'vermelho-vinho' }).mana + 3);

  // Slime: +3 Vida no 6, +6 no 14.
  assert.equal(recursos('slime', 6, { varianteId: 'acido' }).vida,
    recursos('slime', 5, { varianteId: 'acido' }).vida + 3);
  assert.equal(recursos('slime', 14, { varianteId: 'acido' }).vida,
    recursos('slime', 13, { varianteId: 'acido' }).vida + 6);

  // Gigante: +4 Vida no 9, +8 no 18.
  assert.equal(recursos('gigante', 9, { varianteId: 'pedra' }).vida,
    recursos('gigante', 8, { varianteId: 'pedra' }).vida + 4);
  assert.equal(recursos('gigante', 18, { varianteId: 'pedra' }).vida,
    recursos('gigante', 17, { varianteId: 'pedra' }).vida + 8);

  // Sereia: +2 Mana no 8, +3 no 16.
  assert.equal(recursos('sereia', 8, { varianteId: 'mare' }).mana,
    recursos('sereia', 7, { varianteId: 'mare' }).mana + 2);
  assert.equal(recursos('sereia', 16, { varianteId: 'mare' }).mana,
    recursos('sereia', 15, { varianteId: 'mare' }).mana + 3);

  // Golem: +4 Vida no 8, +8 no 18.
  assert.equal(recursos('golem', 8, { varianteId: 'ferro' }).vida,
    recursos('golem', 7, { varianteId: 'ferro' }).vida + 4);
  assert.equal(recursos('golem', 18, { varianteId: 'ferro' }).vida,
    recursos('golem', 17, { varianteId: 'ferro' }).vida + 8);

  // Vampiro: +3 Vida no 11; no 21 somam +4 Vida e +2 Mana de uma vez.
  assert.equal(recursos('vampiro', 11, { varianteId: 'strigoi' }).vida,
    recursos('vampiro', 10, { varianteId: 'strigoi' }).vida + 3);
  assert.equal(recursos('vampiro', 21, { varianteId: 'strigoi' }).vida,
    recursos('vampiro', 20, { varianteId: 'strigoi' }).vida + 4);
  assert.equal(recursos('vampiro', 21, { varianteId: 'strigoi' }).mana,
    recursos('vampiro', 20, { varianteId: 'strigoi' }).mana + 2);

  // Auleth: +2 Mana no 12; no 22 somam +3 Mana e +2 Vida de uma vez.
  assert.equal(recursos('auleth', 12, { varianteId: 'planeta' }).mana,
    recursos('auleth', 11, { varianteId: 'planeta' }).mana + 2);
  assert.equal(recursos('auleth', 22, { varianteId: 'planeta' }).mana,
    recursos('auleth', 21, { varianteId: 'planeta' }).mana + 3);
  assert.equal(recursos('auleth', 22, { varianteId: 'planeta' }).vida,
    recursos('auleth', 21, { varianteId: 'planeta' }).vida + 2);

  // Elfo: +2 Mana no 13, +3 no 25.
  assert.equal(recursos('elfo', 13, { linhagemId: 'gelo' }).mana,
    recursos('elfo', 12, { linhagemId: 'gelo' }).mana + 2);
  assert.equal(recursos('elfo', 25, { linhagemId: 'gelo' }).mana,
    recursos('elfo', 24, { linhagemId: 'gelo' }).mana + 3);
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
  assert.ok(!vinho(9).includes('Fúria Carmesim'));
  assert.ok(vinho(10).includes('Fúria Carmesim'));
  assert.ok(vinho(10).includes('Névoa Persistente'), 'o traço do estágio entra junto');
  assert.ok(!vinho(19).includes('Presságio do Fim'));
  assert.ok(vinho(20).includes('Presságio do Fim'));
  assert.ok(!vinho(20).includes('Lembrança de Vida'), 'a Cor escolhida não traz as outras');

  // Slime Ácido cresce comendo.
  const acido = (nivel: number) => titulos('slime', { varianteId: 'acido' }, nivel);
  assert.ok(acido(1).includes('Toque Corrosivo'));
  assert.ok(!acido(5).includes('Engolir'));
  assert.ok(acido(6).includes('Engolir'));
  assert.ok(!acido(13).includes('Divisão Instável'));
  assert.ok(acido(14).includes('Divisão Instável'));
  assert.ok(acido(14).includes('Poça Corrosiva'));

  // Elfo: as Linhagens só se aprofundam no Ancião e no Milenar.
  const sombras = (nivel: number) => titulos('elfo', { linhagemId: 'sombras' }, nivel);
  assert.ok(sombras(1).includes('Passo Umbral'));
  assert.ok(!sombras(12).includes('Passo Umbral Duplo'));
  assert.ok(sombras(13).includes('Passo Umbral Duplo'));
  assert.ok(sombras(13).includes('Memória Acumulada'));
  assert.ok(!sombras(24).includes('Manto sem Fim'));
  assert.ok(sombras(25).includes('Manto sem Fim'));

  // Anão: a maestria é do Ofício escolhido, e o traço-base continua valendo.
  const runista = (nivel: number) => titulos('anao', { varianteId: 'runista' }, nivel);
  assert.ok(runista(1).includes('Mãos de Ofício'));
  assert.ok(!runista(6).includes('Mão Treinada'));
  assert.ok(runista(7).includes('Mão Treinada'));
  assert.ok(runista(13).includes('Mão de Mestre'));
  assert.ok(runista(13).includes('Selo Ancestral'));
  assert.ok(!runista(13).includes('Obra de Mestre'), 'Ofício de Ferreiro não vaza para o Runista');

  // Vampiro Sangvin: o Clã escolhido não traz o poder dos outros.
  const sangvin = (nivel: number) => titulos('vampiro', { varianteId: 'sangvin' }, nivel);
  assert.ok(sangvin(1).includes('Hemofagia'), 'o traço-base do Vampiro continua valendo');
  assert.ok(sangvin(1).includes('Hemomancia'));
  assert.ok(!sangvin(10).includes('Transfusão'));
  assert.ok(sangvin(11).includes('Transfusão'));
  assert.ok(sangvin(11).includes('Hemofagia Profunda'), 'o degrau do Sangue Velho entra junto');
  assert.ok(!sangvin(20).includes('Maré Vermelha'));
  assert.ok(sangvin(21).includes('Maré Vermelha'));
  assert.ok(sangvin(21).includes('Fome de Senhor'), 'no topo a fome cobra mais caro');
  assert.ok(!sangvin(21).includes('Garras do Strigoi'), 'Clã escolhido não vaza para os outros');

  // Golem de Argila: o material decide, e os reforços valem para todo Golem.
  const argila = (nivel: number) => titulos('golem', { varianteId: 'argila' }, nivel);
  assert.ok(argila(1).includes('Forma Refeita'));
  assert.ok(!argila(7).includes('Solda sobre Solda'));
  assert.ok(argila(8).includes('Solda sobre Solda'));
  assert.ok(argila(8).includes('Membro Improvisado'));
  assert.ok(!argila(17).includes('Selo na Testa'));
  assert.ok(argila(18).includes('Selo na Testa'));
  assert.ok(argila(18).includes('Estrutura Monumental'));

  // Auleth Cometa: a Origem escolhida não traz a das outras.
  const cometa = (nivel: number) => titulos('auleth', { varianteId: 'cometa' }, nivel);
  assert.ok(cometa(1).includes('Trajetória'));
  assert.ok(cometa(1).includes('Forma sem Molde'), 'o traço-base do Auleth continua valendo');
  assert.ok(!cometa(11).includes('Reentrada'));
  assert.ok(cometa(12).includes('Reentrada'));
  assert.ok(cometa(12).includes('Molde Estável'), 'o degrau Coerente entra junto');
  assert.ok(!cometa(21).includes('Impacto'));
  assert.ok(cometa(22).includes('Impacto'));
  assert.ok(cometa(22).includes('Presença Alheia'));
  assert.ok(!cometa(22).includes('Corpo Radiante'), 'Origem escolhida não vaza para as outras');
});
