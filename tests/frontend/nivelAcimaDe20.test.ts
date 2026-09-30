import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aumentosDeAtributo,
  classesDaFicha,
  habilidadesAutomaticas,
  nivelTotalFicha,
  vagasLegado,
  vagasPoderDaClasse,
} from '../../src/services/progressaoFichaService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../src/services/catalogoService';
import { NIVEL_MAXIMO_CLASSE, NIVEL_TOTAL_PADRAO } from '../../src/services/progressaoNiveis';
import { aplicarAjusteAtributoRacial, aplicarAjustesAtributosRaciais } from '../../src/services/calculoService';
import { NIVEL_MAXIMO_SIMULADO, simularCenario, slotsDaFicha } from '../../src/pages/Ficha/utils/simuladorNivel';

const ficha = (classes: Array<{ classeId: string; nivel: number }>) => ({
  racaId: 'humano',
  classes,
  nivel: classes.reduce((total, item) => total + item.nivel, 0),
  xp: 0,
  atributosFinais: { forca: 14, destreza: 12, constituicao: 12, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10 },
});

test('o nível total conta o nível real das classes, mesmo acima do 20', () => {
  const f = ficha([{ classeId: 'guerreiro', nivel: 35 }, { classeId: 'ninja', nivel: 30 }]);
  assert.equal(nivelTotalFicha(f), 65);
  assert.deepEqual(classesDaFicha(f).map((item) => item.nivel), [35, 30]);
});

test('nível de classe vazio ou inválido continua valendo 1', () => {
  assert.equal(nivelTotalFicha(ficha([{ classeId: 'guerreiro', nivel: 0 }])), 1);
  assert.equal(nivelTotalFicha({ classes: [{ classeId: 'guerreiro', nivel: 'abc' }] }), 1);
});

test('passar do 20 não tira nem duplica nenhuma recompensa da classe', () => {
  const guerreiro = CLASSES_CATALOGO.find((item) => item.id === 'guerreiro')!;
  assert.equal(vagasPoderDaClasse(guerreiro, 35), vagasPoderDaClasse(guerreiro, 20));
  const noVinte = habilidadesAutomaticas(ficha([{ classeId: 'guerreiro', nivel: 20 }]));
  const noTrintaECinco = habilidadesAutomaticas(ficha([{ classeId: 'guerreiro', nivel: 35 }]));
  assert.deepEqual(noTrintaECinco.map((item) => item.id), noVinte.map((item) => item.id));
});

test('o simulador respeita o teto de 50 do sistema e não corta quem já passou dele', () => {
  assert.equal(NIVEL_MAXIMO_SIMULADO, NIVEL_MAXIMO_CLASSE);
  assert.equal(slotsDaFicha(ficha([{ classeId: 'guerreiro', nivel: 35 }]))[0].nivel, 35);
  assert.equal(slotsDaFicha(ficha([{ classeId: 'guerreiro', nivel: 70 }]))[0].nivel, 70);

  const subindo = simularCenario(ficha([{ classeId: 'guerreiro', nivel: 35 }]), { niveis: { guerreiro: 40 }, atributos: {} });
  assert.equal(subindo.nivelAtual, 35);
  assert.equal(subindo.nivelSimulado, 40);

  const alemDoTeto = simularCenario(ficha([{ classeId: 'guerreiro', nivel: 35 }]), { niveis: { guerreiro: 999 }, atributos: {} });
  assert.equal(alemDoTeto.nivelSimulado, NIVEL_MAXIMO_CLASSE);

  const jaAcima = simularCenario(ficha([{ classeId: 'guerreiro', nivel: 70 }]), { niveis: { guerreiro: 40 }, atributos: {} });
  assert.equal(jaAcima.nivelSimulado, 70, 'o simulador só olha para frente');
});

test('o padrão do jogo termina no primeiro patamar', () => {
  assert.equal(NIVEL_TOTAL_PADRAO, 60);
});

test('Legados seguem as faixas: 1 a cada 5 até o 50, a cada 10 até o 100, a cada 20 depois', () => {
  const semBonus = RACAS_CATALOGO.find((raca) => !raca.legados_adicionais)!;
  const legados = (nivel: number) => vagasLegado({ ...ficha([{ classeId: 'guerreiro', nivel }]), racaId: semBonus.id });
  assert.deepEqual([50, 55, 60, 100, 119, 120, 200, 500].map(legados), [10, 10, 11, 15, 15, 16, 20, 35]);
  const comBonus = RACAS_CATALOGO.find((raca) => Number(raca.legados_adicionais) > 0);
  if (comBonus) {
    assert.equal(vagasLegado({ ...ficha([{ classeId: 'guerreiro', nivel: 60 }]), racaId: comBonus.id }), 11 + Number(comBonus.legados_adicionais));
  }
});

test('contador de aumentos de atributo compara o nível com o que a ficha já subiu', () => {
  const base = { forca: 15, destreza: 14, constituicao: 13, inteligencia: 12, sabedoria: 10, carisma: 8, fluxo: 8 };
  const comAumentos = (nivel: number, extra: Record<string, number>) => ({
    ...ficha([{ classeId: 'guerreiro', nivel }]),
    atributosBase: base,
    atributosFinais: { ...base, ...Object.fromEntries(Object.entries(extra).map(([chave, valor]) => [chave, base[chave as keyof typeof base] + valor])) },
  });
  assert.deepEqual(aumentosDeAtributo(comAumentos(20, { forca: 3, constituicao: 2 })), { direito: 5, usados: 5, livres: 0 });
  assert.deepEqual(aumentosDeAtributo(comAumentos(60, { forca: 8 })), { direito: 13, usados: 8, livres: 5 });
  assert.deepEqual(aumentosDeAtributo(comAumentos(20, { forca: 9 })), { direito: 5, usados: 9, livres: 0 });
  assert.equal(aumentosDeAtributo(ficha([{ classeId: 'guerreiro', nivel: 20 }])), null, 'sem os atributos de criação não dá para saber');
});

test('bônus racial de atributo vale mesmo com o atributo já acima de 20', () => {
  const raca = (id: string) => RACAS_CATALOGO.find((item) => item.id === id)!;
  const atributos = (extra: Record<string, number>) => ({
    forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10, ...extra,
  });
  // Elfo: +4 em Inteligência. Antes parava no 24; agora soma por cima de qualquer valor.
  assert.equal(aplicarAjustesAtributosRaciais(atributos({ inteligencia: 22 }), raca('elfo'), {}).inteligencia, 26);
  // Auleth, Bruxa, Onírico e Divino tinham teto de 20 em Inteligência, Sabedoria, Carisma ou Fluxo.
  assert.equal(aplicarAjustesAtributosRaciais(atributos({ sabedoria: 20 }), raca('auleth'), {}).sabedoria, 22);
  assert.equal(aplicarAjustesAtributosRaciais(atributos({ fluxo: 21 }), raca('onirico'), {}).fluxo, 23);
  assert.equal(aplicarAjustesAtributosRaciais(atributos({ carisma: 20 }), raca('divino'), {}).carisma, 22);
  // Clone e Anomalia: bônus escolhido, sem o "respeitando o limite natural 20".
  assert.equal(aplicarAjustesAtributosRaciais(atributos({ forca: 20 }), raca('clone'), { atributosRaciais: ['forca', 'destreza'] }).forca, 22);
  assert.equal(aplicarAjustesAtributosRaciais(atributos({ forca: 21 }), raca('anomalia'), { atributosRaciais: ['forca'] }).forca, 25);
});

test('nenhuma raça ou opção racial declara mais um teto de atributo', () => {
  const temTeto = (valor: unknown): boolean => {
    if (Array.isArray(valor)) return valor.some(temTeto);
    if (!valor || typeof valor !== 'object') return false;
    return Object.entries(valor).some(([chave, filho]) => chave === 'limites_atributos' || (chave === 'limite' && typeof filho === 'number') || temTeto(filho));
  };
  assert.deepEqual(RACAS_CATALOGO.filter(temTeto).map((raca) => raca.id), []);
});

test('sem teto declarado o bônus racial vale inteiro; com teto, continua limitado', () => {
  assert.equal(aplicarAjusteAtributoRacial(10, 2), 12);
  assert.equal(aplicarAjusteAtributoRacial(30, 2, null), 32);
  assert.equal(aplicarAjusteAtributoRacial(19, 4, 20), 20, 'o mecanismo de teto por raça segue disponível para o futuro');
  assert.equal(aplicarAjusteAtributoRacial(10, -2), 8);
});
