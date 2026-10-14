import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PREFERENCIAS_PADRAO,
  PROGRESSO_DE_FIM,
  PROGRESSO_MINIMO_PARA_CONTINUAR,
  chaveDaConta,
  lerLeituraSalva,
  lerPreferencias,
  leituraPedeContinuar,
  progressoDeRolagem,
  serializarLeitura,
  serializarPreferencias,
} from '../../src/pages/Regras/regrasLeitura';
import { casaComBusca, normalizar, textoSemMarcas } from '../../src/pages/Regras/regrasBusca';
import {
  formatarDataDaEdicao,
  formatarTamanhoDoArquivo,
  paginaDoTopico,
  urlDoPdf,
  type IEdicaoDoLivro,
} from '../../src/services/livroApi';

const validos = new Set(['como-jogar', 'combate']);

test('a leitura salva volta como foi gravada', () => {
  const bruto = serializarLeitura({ topico: 'combate', progresso: 0.62345, em: 1_700_000_000_123.9 });
  assert.deepEqual(lerLeituraSalva(bruto, validos), { topico: 'combate', progresso: 0.623, em: 1_700_000_000_123 });
});

test('leitura de um tópico que não existe mais, com lixo ou sem nada é ignorada', () => {
  assert.equal(lerLeituraSalva(null, validos), null);
  assert.equal(lerLeituraSalva('', validos), null);
  assert.equal(lerLeituraSalva('{isto nao e json', validos), null);
  assert.equal(lerLeituraSalva('[]', validos), null);
  assert.equal(lerLeituraSalva(JSON.stringify({ topico: 'sumiu', progresso: 0.5, em: 1 }), validos), null);
  assert.equal(lerLeituraSalva(JSON.stringify({ topico: 'combate', progresso: 'metade', em: 1 }), validos), null);
  assert.equal(lerLeituraSalva(JSON.stringify({ topico: 'combate', progresso: 0.5 }), validos), null);
});

test('o progresso gravado fica entre 0 e 1', () => {
  const acima = lerLeituraSalva(JSON.stringify({ topico: 'combate', progresso: 7, em: 1 }), validos);
  const abaixo = lerLeituraSalva(JSON.stringify({ topico: 'combate', progresso: -3, em: 1 }), validos);
  assert.equal(acima?.progresso, 1);
  assert.equal(abaixo?.progresso, 0);
  assert.equal(JSON.parse(serializarLeitura({ topico: 'combate', progresso: 9, em: 1 })).progresso, 1);
});

test('só vale "continuar" depois do começo e antes do fim', () => {
  const com = (progresso: number) => ({ topico: 'combate', progresso, em: 1 });
  assert.equal(leituraPedeContinuar(null), false);
  assert.equal(leituraPedeContinuar(com(0)), false);
  assert.equal(leituraPedeContinuar(com(PROGRESSO_MINIMO_PARA_CONTINUAR - 0.001)), false);
  assert.equal(leituraPedeContinuar(com(PROGRESSO_MINIMO_PARA_CONTINUAR)), true);
  assert.equal(leituraPedeContinuar(com(0.5)), true);
  assert.equal(leituraPedeContinuar(com(PROGRESSO_DE_FIM)), false);
  assert.equal(leituraPedeContinuar(com(1)), false);
});

test('preferências de leitura: padrão, valores válidos e lixo', () => {
  assert.deepEqual(lerPreferencias(null), PREFERENCIAS_PADRAO);
  assert.deepEqual(lerPreferencias('{nao e json'), PREFERENCIAS_PADRAO);
  assert.deepEqual(lerPreferencias(serializarPreferencias({ tamanho: 4, fonte: 'sem' })), { tamanho: 4, fonte: 'sem' });
  assert.deepEqual(lerPreferencias(JSON.stringify({ tamanho: 9, fonte: 'comic' })), PREFERENCIAS_PADRAO);
  assert.deepEqual(lerPreferencias(JSON.stringify({ tamanho: 1 })), { tamanho: 1, fonte: PREFERENCIAS_PADRAO.fonte });
});

test('cada conta tem as próprias chaves, e sem conta vale "local"', () => {
  assert.equal(chaveDaConta('jardim:regras:leitura:v1', 'abc'), 'jardim:regras:leitura:v1:abc');
  assert.equal(chaveDaConta('jardim:regras:leitura:v1', null), 'jardim:regras:leitura:v1:local');
  assert.equal(chaveDaConta('x', undefined), 'x:local');
});

test('progresso de rolagem: 0 no topo, 1 no fim e 0 quando o texto cabe na tela', () => {
  assert.equal(progressoDeRolagem(0, 2000, 800), 0);
  assert.equal(progressoDeRolagem(600, 2000, 800), 0.5);
  assert.equal(progressoDeRolagem(1200, 2000, 800), 1);
  assert.equal(progressoDeRolagem(5000, 2000, 800), 1);
  assert.equal(progressoDeRolagem(-20, 2000, 800), 0);
  assert.equal(progressoDeRolagem(0, 700, 800), 0);
  assert.equal(progressoDeRolagem(0, 800, 800), 0);
});

test('a busca ignora acento e caixa, e exige todas as palavras', () => {
  assert.equal(normalizar('Perícias Básicas'), 'pericias basicas');
  assert.equal(casaComBusca('Ações Coletivas: ajudar e teste de grupo', normalizar('acoes grupo')), true);
  assert.equal(casaComBusca('Ações Coletivas', normalizar('acoes combate')), false);
  assert.equal(casaComBusca('qualquer coisa', ''), true);
  assert.equal(textoSemMarcas('<p>Um <strong>dois</strong></p>').replace(/\s+/g, ' ').trim(), 'Um dois');
});

const EDICAO: IEdicaoDoLivro = {
  edicao: 'jogador',
  titulo: 'Livro de Regras',
  paginas: 106,
  bytes: 3_299_290,
  gerado_em: '2026-10-13T15:30:00.000Z',
  topicos: [{ id: 'combate', numero: '3.1', pagina: 28 }],
  capitulos: [{ id: 'combate', numero: 3, pagina: 27 }],
};

test('o endereço do PDF leva a edição, o modo e a campanha, e abre na página pedida', () => {
  assert.equal(urlDoPdf('jogador'), '/api/v1/livro/pdf/jogador');
  assert.equal(urlDoPdf('jogador', { baixar: true }), '/api/v1/livro/pdf/jogador?baixar=true');
  assert.equal(urlDoPdf('mestre', { campanhaId: 'abc 123' }), '/api/v1/livro/pdf/mestre?campanha_id=abc+123');
  assert.equal(urlDoPdf('jogador', { pagina: 28 }), '/api/v1/livro/pdf/jogador#page=28');
  assert.equal(urlDoPdf('mestre', { baixar: true, campanhaId: 'x', pagina: 7.9 }), '/api/v1/livro/pdf/mestre?baixar=true&campanha_id=x#page=7');
  assert.equal(urlDoPdf('jogador', { pagina: 0 }), '/api/v1/livro/pdf/jogador');
  assert.equal(urlDoPdf('jogador', { pagina: null }), '/api/v1/livro/pdf/jogador');
});

test('tamanho do arquivo em KB e MB, com vírgula', () => {
  assert.equal(formatarTamanhoDoArquivo(0), '');
  assert.equal(formatarTamanhoDoArquivo(Number.NaN), '');
  assert.equal(formatarTamanhoDoArquivo(500), '1 KB');
  assert.equal(formatarTamanhoDoArquivo(812 * 1024), '812 KB');
  assert.equal(formatarTamanhoDoArquivo(3_299_290), '3,1 MB');
});

test('data da edição por extenso, e vazio quando não faz sentido', () => {
  assert.match(formatarDataDaEdicao('2026-10-13T15:30:00.000Z'), /^13 de outubro de 2026$/);
  assert.equal(formatarDataDaEdicao(null), '');
  assert.equal(formatarDataDaEdicao('ontem'), '');
});

test('a página de um tópico no PDF vem do manifesto, ou é nula', () => {
  assert.equal(paginaDoTopico(EDICAO, 'combate'), 28);
  assert.equal(paginaDoTopico(EDICAO, 'sumiu'), null);
  assert.equal(paginaDoTopico(undefined, 'combate'), null);
});
