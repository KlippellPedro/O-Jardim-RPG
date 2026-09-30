import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import manifest from '../../public/audio/sabio/manifest.json';
import falasSubida from '../../src/pages/Ficha/components/falasSubida.json';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE, PATAMARES_NIVEL } from '../../src/services/progressaoNiveis';
import { descreverRecompensa, falaClasseAcimaDoConteudo } from '../../src/pages/Ficha/components/subidaNivel';

// Cada linha do painel de subida é achada pelo próprio texto no manifest da voz
// gravada (tools/gerar-voz-sabio.py). Frase que falta cai na voz do navegador, e
// misturar as duas vozes no mesmo painel destoa. Este teste avisa antes.
const gravadas = new Set(Object.keys(manifest.clips));
const faltando = (frases: string[]) => frases.filter((frase) => !gravadas.has(frase));

test('as falas fixas do painel de subida estão gravadas', () => {
  const fixas = Object.entries(falasSubida)
    .filter(([chave, fala]) => !chave.startsWith('_') && !fala.includes('{n}'))
    .map(([, fala]) => fala);
  assert.ok(fixas.length >= 4);
  assert.deepEqual(faltando(fixas), []);
  assert.deepEqual(faltando([descreverRecompensa('grau_pericia', 'Grau de perícia').fala]), []);
});

test('a linha "Classe no nível N" está gravada do fim do conteúdo até o teto da classe', () => {
  const frases = Array.from(
    { length: NIVEL_MAXIMO_CLASSE - NIVEL_CONTEUDO_CLASSE },
    (_, indice) => falaClasseAcimaDoConteudo(NIVEL_CONTEUDO_CLASSE + 1 + indice),
  );
  assert.equal(frases.length, 30);
  assert.deepEqual(faltando(frases), []);
});

test('"Nível N alcançado" está gravado até o 200 e em cada patamar', () => {
  const niveis = new Set([...Array.from({ length: 199 }, (_, indice) => indice + 2), ...PATAMARES_NIVEL]);
  assert.deepEqual(faltando([...niveis].map((nivel) => `Nível ${nivel} alcançado`)), []);
});

test('até o 20, "Classe chegou ao nível N" segue gravado para todas as classes', () => {
  const frases = CLASSES_CATALOGO.flatMap((classe) => [
    `Nova classe: ${classe.titulo}`,
    ...Array.from({ length: NIVEL_CONTEUDO_CLASSE - 1 }, (_, indice) => `${classe.titulo} chegou ao nível ${indice + 2}`),
  ]);
  assert.deepEqual(faltando(frases), []);
});

test('todo nome do catálogo de conquistas do servidor tem a fala gravada', () => {
  // O painel e o aviso de conquista falam "Conquista desbloqueada" e o nome; o
  // catálogo mora em Python, então lemos o arquivo em vez de duplicar a lista.
  const fonte = readFileSync(new URL('../../plataforma/core/conquistas.py', import.meta.url), 'utf8');
  const nomes = [...fonte.matchAll(/Conquista\(\s*"[a-z0-9_]+",\s*"([^"]+)"/g)].map((achado) => achado[1]);
  assert.ok(nomes.length >= 30, `só ${nomes.length} nomes lidos`);
  assert.ok(nomes.includes('Fora do Padrão') && nomes.includes('Sem Teto') && nomes.includes('Maestria Plena'));
  assert.deepEqual(faltando(['Conquista desbloqueada', ...nomes]), []);
});
