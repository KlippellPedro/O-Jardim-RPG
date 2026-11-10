import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { modeloPorId } from '../../src/pages/Mestre/documentos/modelos/index';
import { agruparPorTema, problemasDoDocumentoUniversal } from '../../src/pages/Mestre/documentos/universais';

// O arquivo é do servidor; o teste lê direto do disco, como o servidor.
const arquivo = JSON.parse(readFileSync(new URL('../../data/documentos/universais.json', import.meta.url), 'utf8')) as {
  formato: string;
  missoes: Array<Record<string, string | string[]> & { id: string }>;
  documentos: Array<{
    id: string; tema: string; titulo: string; ensina: string; entregar: string; missao?: string; papel_na_missao?: string;
    fontes: string[]; inventado: string[]; modelo: string; campos: Record<string, string>;
  }>;
};
const documentos = arquivo.documentos;

test('o arquivo tem o formato que o servidor lê e ids únicos', () => {
  assert.equal(arquivo.formato, 'o-jardim-documentos-universais');
  assert.ok(documentos.length >= 24);
  const ids = documentos.map((doc) => doc.id);
  assert.equal(new Set(ids).size, ids.length, 'id repetido');
  for (const doc of documentos) {
    assert.match(doc.id, /^[a-z0-9][a-z0-9-]{0,47}$/, doc.id);
    for (const chave of ['tema', 'titulo', 'ensina', 'entregar'] as const) assert.ok(doc[chave].trim(), `${doc.id}: ${chave} vazio`);
  }
});

test('cada missão tem resumo completo e papéis, e todo papel aponta para uma missão que existe', () => {
  const ids = new Set(arquivo.missoes.map((missao) => missao.id));
  assert.equal(ids.size, arquivo.missoes.length, 'missão repetida');
  for (const missao of arquivo.missoes) {
    for (const chave of ['titulo', 'tamanho', 'resumo', 'relogio', 'desfecho', 'tom']) assert.ok(String(missao[chave] ?? '').trim(), `${missao.id}: ${chave} vazio`);
    assert.equal((missao.perguntas as string[]).length, (missao.pistas as string[]).length, `${missao.id}: uma linha de pistas por pergunta`);
    assert.ok(documentos.some((doc) => doc.missao === missao.id), `${missao.id}: sem papel`);
  }
  for (const doc of documentos.filter((item) => item.missao)) {
    assert.ok(ids.has(doc.missao as string), `${doc.id}: missão desconhecida`);
    assert.ok(doc.papel_na_missao?.trim(), `${doc.id}: sem papel_na_missao`);
  }
});

test('cada documento usa um modelo da Oficina, com todos os campos, opções válidas e dentro do tamanho', () => {
  assert.deepEqual(documentos.flatMap((doc) => problemasDoDocumentoUniversal(doc)), []);
});

test('a conferência acusa campo faltando, campo estranho, opção errada e texto longo demais', () => {
  const carta = modeloPorId('carta');
  assert.ok(carta);
  const completo = Object.fromEntries(carta.campos.map((campo) => [campo.id, campo.tipo === 'escolha' ? campo.padrao : 'x']));
  assert.deepEqual(problemasDoDocumentoUniversal({ id: 'ok', modelo: 'carta', campos: completo }), []);
  const { corpo: _corpo, ...semCorpo } = completo;
  const problemas = problemasDoDocumentoUniversal({
    id: 'ruim', modelo: 'carta',
    campos: { ...semCorpo, sobra: 'x', lacre: 'arco-iris', saudacao: 'x'.repeat(500) },
  });
  assert.equal(problemas.length, 4, problemas.join('\n'));
  assert.deepEqual(problemasDoDocumentoUniversal({ id: 'sem', modelo: 'nao-existe', campos: {} }), ['sem: modelo desconhecido "nao-existe"']);
});

test('o agrupamento segue a ordem em que cada tema aparece no arquivo', () => {
  const grupos = agruparPorTema(
    [{ tema: 'Fluxos', n: 1 }, { tema: 'Povos', n: 2 }, { tema: 'Fluxos', n: 3 }, { tema: ' ', n: 4 }],
    (item) => item.tema,
  );
  assert.deepEqual(grupos.map((grupo) => [grupo.tema, grupo.itens.map((item) => item.n)]), [['Fluxos', [1, 3]], ['Povos', [2]], ['Outros', [4]]]);
});

// AGENTS.md: texto para o jogador sem travessão, sem "eco" e sem a antítese "não é X, é Y".
const TRAVESSAO = /—| - (?!\d)/u;
const ECO = /(?<!\p{L})eco(?:a|am|ou|ar|ando|s)?(?!\p{L})/iu;
const ANTITESE = /(?<!\p{L})não é [^.;:!?]{1,80}?[,:;] (?:e sim |mas )?(?:ele |ela |isso |aquilo )?é(?!\p{L})|(?<!\p{L})não [^.;:!?]{1,80}, e sim(?!\p{L})/iu;

test('o texto que vai para o jogador segue o tom do Jardim', () => {
  const fora: string[] = [];
  const textosDasMissoes = arquivo.missoes.flatMap((missao) => Object.entries(missao).flatMap(([chave, valor]) => (Array.isArray(valor) ? valor : [valor]).map((texto) => [`${missao.id}.${chave}`, texto] as const)));
  for (const [rota, valor] of textosDasMissoes) {
    for (const [nome, padrao] of [['travessão', TRAVESSAO], ['"eco"', ECO], ['antítese', ANTITESE]] as const) {
      if (padrao.test(valor)) fora.push(`${rota} ${nome}`);
    }
  }
  for (const doc of documentos) {
    for (const [campo, valor] of Object.entries(doc.campos)) {
      for (const [nome, padrao] of [['travessão', TRAVESSAO], ['"eco"', ECO], ['antítese', ANTITESE]] as const) {
        const achado = padrao.exec(valor);
        if (achado) fora.push(`${doc.id}.${campo} ${nome}: ...${valor.slice(Math.max(0, achado.index - 30), achado.index + 30)}...`);
      }
    }
  }
  assert.deepEqual(fora, []);
});
