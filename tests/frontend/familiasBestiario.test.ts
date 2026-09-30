import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import catalogo from '../../data/loja/catalogo.json';
import familias from '../../data/bestiario/familias-v1.json';
import propostasArquivo from '../../data/bestiario/familias-propostas-v1.json';

const propostasPorFamilia = propostasArquivo.porFamilia as Record<string, any[]>;

const monstros = (catalogo.entradas as any[]).filter((entrada) => entrada.tipo === 'monstro');
const porId = new Map(monstros.map((entrada) => [entrada.id, entrada]));
const ferramenta = path.resolve('tools/aplicar-familias-bestiario.mjs');

function rodar(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, ['--import', './tests/frontend/registerTsLoader.mjs', ferramenta, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('o catálogo traz a família, o estágio, o papel e a marca de único do arquivo de famílias', () => {
  const resultado = rodar(['--check']);
  assert.equal(resultado.status, 0, resultado.stderr);
});

test('toda ficha escrita à mão é solo, e cada membro fica em uma família só', () => {
  const vistos = new Set<string>();
  for (const familia of familias.familias) {
    for (const membro of familia.membros) {
      assert.ok(porId.has(membro.id), `${familia.id}: ${membro.id} não existe`);
      assert.ok(!vistos.has(membro.id), `${membro.id} em duas famílias`);
      vistos.add(membro.id);
      assert.equal(porId.get(membro.id).conteudo.familia, familia.id);
    }
  }
  for (const monstro of monstros.filter((item) => !item.conteudo.geradoPorFamilia)) {
    assert.equal(monstro.conteudo.papel, 'solo', `${monstro.id}: papel`);
    if (!vistos.has(monstro.id)) assert.equal(monstro.conteudo.familia, undefined, `${monstro.id}: família sem estar no arquivo`);
  }
});

test('únicos escritos à mão são Seres Lendários sem estágios, e topo de família não é único', () => {
  assert.equal(familias.unicos.length, 13);
  for (const id of familias.unicos) {
    assert.equal(porId.get(id).conteudo.classe, 'Ser Lendário', `${id}: único que não é Ser Lendário`);
    assert.equal(porId.get(id).conteudo.unico, true);
  }
  assert.equal(porId.get('dragao-anciao').conteudo.unico, undefined);
  assert.equal(porId.get('colosso-de-obsidiana').conteudo.unico, undefined);
  const escritos = monstros.filter((item) => item.conteudo.unico && !item.conteudo.geradoPorFamilia);
  assert.equal(escritos.length, familias.unicos.length);
  // Únicos gerados: Ser Lendário, só de Bestiário, e nunca com estágio.
  for (const gerado of monstros.filter((item) => item.conteudo.unico && item.conteudo.geradoPorFamilia)) {
    assert.equal(gerado.conteudo.classe, 'Ser Lendário', gerado.id);
    assert.equal(gerado.conteudo.disponivelNaLoja, false, gerado.id);
    assert.equal(gerado.conteudo.estagio, undefined, `${gerado.id}: único com estágio`);
  }
});

test('estágios propostos: ids livres ou já gerados, VD que não repete o da família, texto sem travessão', () => {
  for (const [chave, lista] of Object.entries(propostasPorFamilia)) {
    const familia = familias.familias.find((item) => item.id === chave);
    const vdsDosMembros = new Set((familia?.membros ?? []).map((membro) => porId.get(membro.id).conteudo.vd));
    if (chave !== 'avulsas') assert.ok(familia, `proposta para família inexistente: ${chave}`);
    for (const novo of lista) {
      const existente = porId.get(novo.id);
      assert.ok(!existente || existente.conteudo.geradoPorFamilia === true, `${novo.id}: colide com ficha escrita à mão`);
      assert.ok(!vdsDosMembros.has(novo.vd), `${novo.id}: VD ${novo.vd} já é de um membro da família`);
      assert.ok(novo.vd >= 1 && ['solo', 'chefe', 'elite', 'padrao', 'lacaio'].includes(novo.papel));
      const textos = [novo.titulo, novo.descricao, ...novo.habilidades, ...novo.loot].join(' ');
      assert.doesNotMatch(textos, /[—–]/, `${novo.id}: travessão no texto`);
    }
  }
});

test('o Bestiário cobre todo o intervalo de VD: fracas embaixo, extremas em cima', () => {
  const vds = new Set(monstros.map((item) => item.conteudo.vd));
  for (const vd of [1, 2, 7, 9, 11, 12, 17, 21, 24, 29, 34, 37, 44, 47, 49, 55, 65, 70, 80, 85, 90, 100, 110, 120, 150, 200, 250, 300, 400, 500]) {
    assert.ok(vds.has(vd), `nenhuma criatura de VD ${vd}`);
  }
  // Sem buraco maior que 12 níveis entre uma criatura e a seguinte até o VD 100.
  const ordenados = [...vds].filter((vd) => vd <= 100).sort((a, b) => a - b);
  ordenados.slice(1).forEach((vd, indice) => assert.ok(vd - ordenados[indice] <= 12, `buraco de ${ordenados[indice]} a ${vd}`));
  assert.ok(monstros.filter((item) => item.conteudo.vd > 100).length >= 10);
  assert.ok(monstros.filter((item) => item.conteudo.vd <= 5).length >= 20);
});

test('--novos monta os estágios pela curva, nunca sobrescreve ficha escrita à mão e é idempotente', () => {
  const pasta = mkdtempSync(path.join(tmpdir(), 'familias-'));
  const catalogoCopia = path.join(pasta, 'catalogo.json');
  const familiasCopia = path.join(pasta, 'familias.json');
  const propostasCopia = path.join(pasta, 'propostas.json');
  copyFileSync('data/loja/catalogo.json', catalogoCopia);
  copyFileSync('data/bestiario/familias-v1.json', familiasCopia);
  copyFileSync('data/bestiario/familias-propostas-v1.json', propostasCopia);
  const env = { BESTIARIO_CATALOGO: catalogoCopia, BESTIARIO_FAMILIAS: familiasCopia, BESTIARIO_PROPOSTAS: propostasCopia };

  // Parte de um catálogo sem estágios gerados, esteja o de verdade já aplicado ou não.
  const semGerados = JSON.parse(readFileSync(catalogoCopia, 'utf8'));
  semGerados.entradas = semGerados.entradas.filter((item: any) => !item.conteudo?.geradoPorFamilia);
  writeFileSync(catalogoCopia, `${JSON.stringify(semGerados, null, 2)}
`);
  const antes = JSON.parse(readFileSync(catalogoCopia, 'utf8'));
  const primeira = rodar(['--novos'], env);
  assert.equal(primeira.status, 0, primeira.stderr);
  const depois = JSON.parse(readFileSync(catalogoCopia, 'utf8'));
  const propostos = Object.values(propostasPorFamilia).flat();
  assert.equal(depois.entradas.length, antes.entradas.length + propostos.length);
  for (const entrada of antes.entradas) {
    assert.deepEqual(depois.entradas.find((item: any) => item.id === entrada.id), entrada, `${entrada.id} mudou`);
  }
  for (const novo of propostos) {
    const entrada = depois.entradas.find((item: any) => item.id === novo.id);
    assert.equal(entrada.conteudo.vd, novo.vd);
    assert.equal(entrada.conteudo.nivel, novo.vd);
    assert.equal(entrada.conteudo.geradoPorFamilia, true);
    assert.ok(entrada.conteudo.pv > 0 && entrada.conteudo.ataques.length === novo.ataques.length);
    assert.match(entrada.conteudo.pericias[0], /^Luta \+\d+$/);
  }
  assert.equal(rodar(['--check'], env).status, 0);
  const segunda = rodar(['--novos'], env);
  assert.equal(segunda.status, 0, segunda.stderr);
  assert.deepEqual(JSON.parse(readFileSync(catalogoCopia, 'utf8')), depois);

  // Colisão: um estágio novo com o id de uma ficha escrita à mão aborta sem gravar.
  const colisao = { porFamilia: { golem: [{ ...propostos[0], id: 'golem-de-pedra', vd: 77 }] } };
  writeFileSync(propostasCopia, JSON.stringify(colisao));
  writeFileSync(catalogoCopia, `${JSON.stringify(semGerados, null, 2)}
`);
  const bruto = readFileSync(catalogoCopia, 'utf8');
  const recusada = rodar(['--novos'], env);
  assert.equal(recusada.status, 1);
  assert.match(recusada.stderr, /golem-de-pedra/);
  assert.equal(readFileSync(catalogoCopia, 'utf8'), bruto);
});

test('o site não importa os rascunhos de estágios: texto não aprovado não vai para o navegador', () => {
  const importadores: string[] = [];
  const varrer = (pasta: string) => {
    for (const nome of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = path.join(pasta, nome.name);
      if (nome.isDirectory()) varrer(caminho);
      else if (/\.(ts|tsx)$/.test(nome.name) && readFileSync(caminho, 'utf8').includes('familias-propostas')) importadores.push(caminho);
    }
  };
  varrer('src');
  varrer('data');
  assert.deepEqual(importadores, []);
});
