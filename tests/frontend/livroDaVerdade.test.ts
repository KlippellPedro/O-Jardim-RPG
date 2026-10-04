import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { paginaEstaRetida, type PaginaDoLivro } from '../../src/services/livroDaVerdadeApi';
import { avisosDeLendaNova } from '../../src/store/useSessaoStore';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lerJson = (relativo: string) => JSON.parse(readFileSync(path.join(raiz, relativo), 'utf-8'));

type Lenda = { id: string; nome: string; epiteto: string; vd: number; verdade: string[]; consequencia: string; manchete: string; calendario: { titulo: string; nota: string } };
const lendas: Lenda[] = lerJson('data/bestiario/lendas-v1.json').lendas;

const lenda = (id: string) => ({ id, nome: id.toUpperCase(), epiteto: 'o teste', consequencia: 'Algo mudou.' });

test('o aviso de lenda só dispara para quem caiu depois da primeira leitura da sessão', () => {
  assert.deepEqual(avisosDeLendaNova(null, [lenda('a')]), [], 'a primeira leitura da sessão nunca avisa');
  assert.deepEqual(avisosDeLendaNova([], []), []);
  assert.deepEqual(avisosDeLendaNova([{ id: 'a' }], [lenda('a')]), [], 'quem já tinha caído não avisa de novo');
  const avisos = avisosDeLendaNova([{ id: 'a' }], [lenda('a'), lenda('b')]);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].chave, 'lenda:b');
  assert.equal(avisos[0].nome, 'B');
  assert.equal(avisos[0].consequencia, 'Algo mudou.');
  assert.equal(avisosDeLendaNova([], [lenda('a'), lenda('b')]).length, 2);
});

test('a página retida é a única sem nome, e o Mestre nunca recebe página retida', () => {
  const retida: PaginaDoLivro = { id: 'retida-0', caida: false, retida: true };
  const aberta: PaginaDoLivro = { id: 'vaelthor', caida: true, nome: 'V', epiteto: 'e', verdade: [], consequencia: 'c', caiu_em: null, sessao: null, por: [] };
  assert.equal(paginaEstaRetida(retida), true);
  assert.equal(paginaEstaRetida(aberta), false);
});

test('as 28 lendas do Livro batem com as fichas do Bestiário', () => {
  const catalogo = (lerJson('data/loja/catalogo.json').entradas as Array<{ id: string; tipo: string; titulo: string; conteudo: Record<string, any> }>)
    .filter((entrada) => entrada.tipo === 'monstro');
  const comSeCair = catalogo.filter((entrada) => /Se [^,]{1,60} cair/.test(entrada.conteudo.descricao ?? '')).map((entrada) => entrada.id).sort();
  assert.equal(lendas.length, 28);
  assert.deepEqual(lendas.map((item) => item.id).sort(), comSeCair);
  for (const item of lendas) {
    const ficha = catalogo.find((entrada) => entrada.id === item.id);
    assert.ok(ficha, item.id);
    assert.equal(item.vd, ficha.conteudo.vd, `${item.id}: VD`);
    assert.ok(ficha.titulo.includes(item.nome), `${item.id}: nome`);
  }
});

test('o texto do Livro segue o tom do livro de regras', () => {
  for (const item of lendas) {
    const texto = [item.nome, item.epiteto, item.manchete, item.consequencia, ...item.verdade, item.calendario.titulo, item.calendario.nota].join(' ');
    assert.doesNotMatch(texto, /[—–]/, `${item.id}: travessão`);
    assert.doesNotMatch(texto, /\beco(s)?\b/i, `${item.id}: "eco"`);
    assert.doesNotMatch(texto, /não é [^.;:]{1,60}, é /i, `${item.id}: antítese`);
    assert.ok(item.calendario.titulo.length <= 80 && item.calendario.nota.length <= 600, `${item.id}: limite do calendário`);
  }
});

test('o navegador nunca importa o texto do Livro (só o servidor lê o arquivo)', () => {
  const achados: string[] = [];
  const varrer = (pasta: string) => {
    for (const nome of readdirSync(pasta)) {
      const caminho = path.join(pasta, nome);
      if (statSync(caminho).isDirectory()) varrer(caminho);
      else if (/\.(ts|tsx)$/.test(nome) && readFileSync(caminho, 'utf-8').includes('lendas-v1')) achados.push(caminho);
    }
  };
  varrer(path.join(raiz, 'src'));
  assert.deepEqual(achados, []);
});

test('o Guia do Mestre explica o Livro da Verdade, a manchete e os selos', () => {
  const guia = REGRAS_OFICIAIS.mestre.corpo;
  assert.match(guia, /Livro da Verdade/);
  assert.match(guia, /Matador de/);
  assert.match(guia, /manchete/i);
});

// -------------------------------------------------- efeitos no mundo

type Efeito = { tipo: 'estacao' | 'preco'; estacao?: string; alvos?: string[]; percentual?: number; meses: number; texto: string };
const efeitosDasLendas = (lerJson('data/bestiario/lendas-v1.json').lendas as Array<{ id: string; efeitos?: Efeito[] }>).filter((lenda) => lenda.efeitos?.length);
const TIPOS_AJUSTAVEIS = new Set(['equipamento', 'veiculo', 'veiculo-completo', 'artefato', 'consumivel']);

test('os efeitos das lendas são poucos, curtos e só mexem no que a Loja e o calendário aceitam', () => {
  assert.deepEqual(efeitosDasLendas.map((lenda) => lenda.id).sort(), ['anzhur', 'hiemark', 'ignarrak', 'mareia', 'marenostra']);
  for (const lenda of efeitosDasLendas) {
    for (const efeito of lenda.efeitos as Efeito[]) {
      assert.ok(efeito.meses >= 1 && efeito.meses <= 6, `${lenda.id}: duração`);
      assert.ok(efeito.texto.length >= 30 && efeito.texto.length <= 300, `${lenda.id}: texto`);
      assert.doesNotMatch(efeito.texto, /[—–]/, `${lenda.id}: travessão`);
      assert.doesNotMatch(efeito.texto, /\beco(s)?\b/i, `${lenda.id}: "eco"`);
      if (efeito.tipo === 'estacao') assert.ok(['primavera', 'verao', 'outono', 'inverno'].includes(efeito.estacao ?? ''), `${lenda.id}: estação`);
      else {
        assert.ok(efeito.alvos?.length && efeito.alvos.every((alvo) => TIPOS_AJUSTAVEIS.has(alvo)), `${lenda.id}: alvos`);
        assert.ok(efeito.percentual && Math.abs(efeito.percentual) <= 20, `${lenda.id}: percentual`);
      }
    }
  }
});

test('a página da Loja e a do Livro mostram o efeito: o tipo e a rota existem no front', () => {
  const loja = readFileSync(path.join(raiz, 'src/services/lojaCatalogService.ts'), 'utf-8');
  assert.match(loja, /efeitoDoMundo\?:/);
  assert.match(loja, /efeito_do_mundo/);
  const api = readFileSync(path.join(raiz, 'src/services/livroDaVerdadeApi.ts'), 'utf-8');
  assert.equal((api.match(/efeitos: string\[\]/g) ?? []).length, 2, 'a página aberta e a do Mestre trazem os efeitos');
});
