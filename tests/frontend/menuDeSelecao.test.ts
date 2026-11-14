import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  OPCOES_PARA_BUSCA,
  acharPorPrefixo,
  andar,
  ehSelectEstilizavel,
  filtrar,
  lerItens,
  opcaoInicial,
  posicionar,
  primeira,
  semAcento,
  ultima,
} from '../../src/components/ui/menuDeSelecao';

// O menu de seleção do site troca a lista nativa de todo <select> (branca no Windows).
// Aqui fica a parte sem navegador: ler as opções, filtrar, andar e posicionar.

const opcao = (value: string, text: string, extras: Record<string, unknown> = {}) => ({ tagName: 'OPTION', value, text, ...extras });
const grupo = (label: string, filhos: ReturnType<typeof opcao>[], extras: Record<string, unknown> = {}) => ({ tagName: 'OPTGROUP', label, children: filhos, ...extras });
const select = (children: unknown[], extras: Record<string, unknown> = {}) => ({ tagName: 'SELECT', children, ...extras }) as never;

test('lê as opções na ordem, com um cabeçalho por grupo, e pula o que está escondido', () => {
  const itens = lerItens(select([
    opcao('', 'Todos', { selected: true }),
    grupo('Salvos nesta mesa', [opcao('a', 'Carta de Ilda'), opcao('b', 'Mapa velho', { hidden: true })]),
    grupo('Vazio', [opcao('c', 'Escondida', { hidden: true })]),
    grupo('Universais: Fluxos', [opcao('d', 'Edital da Vigília', { disabled: true }), opcao('e', 'Aviso da Ordem')]),
  ]));
  assert.deepEqual(itens.map((item) => (item.tipo === 'grupo' ? `# ${item.rotulo}` : `${item.valor}:${item.rotulo}`)), [
    ':Todos', '# Salvos nesta mesa', 'a:Carta de Ilda', '# Universais: Fluxos', 'd:Edital da Vigília', 'e:Aviso da Ordem',
  ]);
  const marcada = itens.find((item) => item.tipo === 'opcao' && item.selecionada);
  assert.equal(marcada?.tipo === 'opcao' && marcada.valor, '');
  assert.equal(itens.some((item) => item.tipo === 'opcao' && item.valor === 'd' && item.desativada), true);
});

test('opção de grupo desativado fica desativada', () => {
  const itens = lerItens(select([grupo('Bloqueado', [opcao('x', 'X')], { disabled: true })]));
  assert.equal(itens[1].tipo === 'opcao' && itens[1].desativada, true);
});

test('só assume o select simples, ligado e que não pediu para ficar nativo', () => {
  assert.equal(ehSelectEstilizavel(select([opcao('a', 'A')])), true);
  assert.equal(ehSelectEstilizavel(select([opcao('a', 'A')], { multiple: true })), false);
  assert.equal(ehSelectEstilizavel(select([opcao('a', 'A')], { size: 4 })), false);
  assert.equal(ehSelectEstilizavel(select([opcao('a', 'A')], { disabled: true })), false);
  assert.equal(ehSelectEstilizavel(select([opcao('a', 'A')], { dataset: { menuNativo: '' } })), false);
  assert.equal(ehSelectEstilizavel(select([])), false);
  assert.equal(ehSelectEstilizavel({ tagName: 'INPUT', children: [opcao('a', 'A')] }), false);
  assert.equal(ehSelectEstilizavel(null), false);
});

test('o filtro ignora acento e caixa e mantém o cabeçalho só dos grupos que sobram', () => {
  const itens = lerItens(select([
    grupo('Cosmologia', [opcao('1', 'Lição de casa'), opcao('2', 'Almanaque')]),
    grupo('Fluxos', [opcao('3', 'Edital da Vigília'), opcao('4', 'Relatório do Arquivo')]),
  ]));
  assert.equal(filtrar(itens, '   ').length, itens.length);
  const licao = filtrar(itens, 'LICAO');
  assert.deepEqual(licao.map((item) => (item.tipo === 'grupo' ? `# ${item.rotulo}` : item.rotulo)), ['# Cosmologia', 'Lição de casa']);
  assert.deepEqual(filtrar(itens, 'vigilia').map((item) => item.rotulo), ['Fluxos', 'Edital da Vigília']);
  assert.deepEqual(filtrar(itens, 'nada disso'), []);
  assert.equal(semAcento('Ação Ç'), 'acao c');
});

test('a opção inicial é a marcada, ou a primeira que se pode escolher', () => {
  assert.equal(opcaoInicial(lerItens(select([opcao('a', 'A'), opcao('b', 'B', { selected: true })]))), 1);
  assert.equal(opcaoInicial(lerItens(select([opcao('a', 'A', { disabled: true }), opcao('b', 'B')]))), 1);
  assert.equal(opcaoInicial(lerItens(select([opcao('a', 'A', { disabled: true })]))), -1);
  assert.equal(opcaoInicial(lerItens(select([grupo('G', [opcao('a', 'A')])]))), 1, 'pula o cabeçalho');
});

test('as setas andam pelas opções, pulam grupo e desativada e dão a volta', () => {
  const itens = lerItens(select([
    opcao('a', 'A'),
    grupo('G', [opcao('b', 'B', { disabled: true }), opcao('c', 'C')]),
    opcao('d', 'D'),
  ]));
  // índices: 0 A, 1 G, 2 B (desativada), 3 C, 4 D
  assert.equal(andar(itens, 0, 1), 3);
  assert.equal(andar(itens, 3, 1), 4);
  assert.equal(andar(itens, 4, 1), 0, 'dá a volta no fim');
  assert.equal(andar(itens, 0, -1), 4, 'dá a volta no começo');
  assert.equal(andar(itens, -1, 1), 0);
  assert.equal(primeira(itens), 0);
  assert.equal(ultima(itens), 4);
  assert.equal(andar(itens, 0, 8), 4, 'passo grande para na ponta');
  assert.equal(andar([], 0, 1), -1);
});

test('digitar uma letra acha a próxima opção que começa com ela, a partir da atual', () => {
  const itens = lerItens(select([opcao('1', 'Chuva'), opcao('2', 'Cinzas'), opcao('3', 'Neve'), opcao('4', 'Cinza fria')]));
  assert.equal(acharPorPrefixo(itens, 0, 'c'), 1);
  assert.equal(acharPorPrefixo(itens, 1, 'c'), 3);
  assert.equal(acharPorPrefixo(itens, 3, 'c'), 0, 'volta ao começo');
  assert.equal(acharPorPrefixo(itens, 0, 'cinza f'), 3);
  assert.equal(acharPorPrefixo(itens, 0, 'x'), -1);
  assert.equal(acharPorPrefixo(itens, 0, ''), -1);
});

test('o menu abre embaixo do select, vira para cima sem espaço e nunca sai da janela', () => {
  const janela = { largura: 1000, altura: 700 };
  const embaixo = posicionar({ left: 100, top: 100, bottom: 130, width: 260 }, janela, 300);
  assert.deepEqual(embaixo, { top: 134, left: 100, width: 260, maxHeight: 360 });

  const emCima = posicionar({ left: 100, top: 600, bottom: 630, width: 260 }, janela, 300);
  assert.ok(emCima.top < 600 && emCima.top + Math.min(300, emCima.maxHeight) <= 600, 'termina acima do select');

  const naBorda = posicionar({ left: 900, top: 100, bottom: 130, width: 90 }, janela, 200);
  assert.equal(naBorda.width, 220, 'largura mínima para ler');
  assert.ok(naBorda.left + naBorda.width <= 1000 - 8, 'não passa da direita');

  const estreita = posicionar({ left: 0, top: 10, bottom: 40, width: 600 }, { largura: 300, altura: 700 }, 100);
  assert.ok(estreita.width <= 300 - 16 && estreita.left >= 8);
});

test('a lista passa a ter busca acima de dez opções', () => {
  assert.equal(OPCOES_PARA_BUSCA, 10);
});

test('o host está montado no App e o CSS de segurança cobre os selects que ficam nativos', () => {
  const app = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<MenusDeSelecaoHost \/>/);
  const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /select\s*\{\s*color-scheme:\s*dark/);
  assert.match(css, /select option,\s*select optgroup\s*\{[^}]*background-color/);
});
