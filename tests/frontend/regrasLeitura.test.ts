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
  ID_DA_ABERTURA,
  idDaParte,
  indiceDaParte,
  parteDoTitulo,
  partesDoIndice,
  posicaoNasPartes,
  progressoNasPartes,
  resumoDaParte,
  topicoSeDivide,
  type ParteDoTopico,
} from '../../src/pages/Regras/partesDoTopico';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { SECOES_DAS_MECANICAS } from '../../src/services/termosDoJogo';
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
  assert.deepEqual(
    lerPreferencias(serializarPreferencias({ tamanho: 4, fonte: 'sem', modo: 'inteiro' })),
    { tamanho: 4, fonte: 'sem', modo: 'inteiro' },
  );
  assert.deepEqual(lerPreferencias(JSON.stringify({ tamanho: 9, fonte: 'comic', modo: 'rolo' })), PREFERENCIAS_PADRAO);
  assert.deepEqual(
    lerPreferencias(JSON.stringify({ tamanho: 1 })),
    { tamanho: 1, fonte: PREFERENCIAS_PADRAO.fonte, modo: PREFERENCIAS_PADRAO.modo },
  );
});

test('quem já tinha preferências salvas antes do modo de leitura passa a ler em partes', () => {
  assert.equal(PREFERENCIAS_PADRAO.modo, 'partes');
  assert.deepEqual(lerPreferencias(JSON.stringify({ tamanho: 3, fonte: 'serifa' })), { tamanho: 3, fonte: 'serifa', modo: 'partes' });
});

const parte = (id: string, extra = false): ParteDoTopico => ({ id, titulo: id, resumo: '', extra });

test('a parte usa o id da seção sem o prefixo, para os links antigos de seção continuarem valendo', () => {
  assert.equal(idDaParte('secao-fome-e-sede'), 'fome-e-sede');
  assert.equal(idDaParte('catalogo'), 'catalogo');
  assert.equal(parteDoTitulo('Fome e sede'), 'fome-e-sede');
  assert.equal(parteDoTitulo('Reações'), 'reacoes');
});

test('o resumo de uma parte é a primeira frase, cortada numa palavra quando é longa', () => {
  assert.equal(resumoDaParte('Iniciativa aqui não se rola: é um número da ficha.'), 'Iniciativa aqui não se rola.');
  assert.equal(resumoDaParte('  São seis   categorias. Normal é o tamanho comum. '), 'São seis categorias.');
  assert.equal(resumoDaParte(''), '');
  const longa = resumoDaParte('Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir rolagem, use dez mais o bônus total, e quando você resiste ativamente a um perigo role o d20', 80);
  assert.ok(longa.length <= 81, longa);
  assert.ok(longa.endsWith('…'));
  assert.doesNotMatch(longa, /\s…$/);
});

test('o tópico só se divide com duas partes além da visão geral', () => {
  assert.equal(topicoSeDivide([parte(ID_DA_ABERTURA)]), false);
  assert.equal(topicoSeDivide([parte(ID_DA_ABERTURA), parte('unica')]), false);
  assert.equal(topicoSeDivide([parte(ID_DA_ABERTURA), parte('texto'), parte('catalogo', true)]), true);
  assert.deepEqual(partesDoIndice([parte(ID_DA_ABERTURA), parte('a'), parte('b')]).map((item) => item.id), ['a', 'b']);
});

test('parte pedida que não existe cai na visão geral', () => {
  const partes = [parte(ID_DA_ABERTURA), parte('iniciativa'), parte('seu-turno')];
  assert.equal(indiceDaParte(partes, 'seu-turno'), 2);
  assert.equal(indiceDaParte(partes, 'parte-que-sumiu'), 0);
  assert.equal(indiceDaParte(partes, null), 0);
});

test('o progresso em partes vai e volta sem perder a parte nem a rolagem', () => {
  assert.equal(progressoNasPartes(0, 1, 0.5), 0.5);
  assert.equal(progressoNasPartes(0, 4, 0), 0);
  assert.equal(progressoNasPartes(3, 4, 1), 1);
  assert.equal(progressoNasPartes(1, 4, 0.5), 0.375);
  assert.equal(progressoNasPartes(9, 4, Number.NaN), 0.75);
  assert.deepEqual(posicaoNasPartes(0.375, 4), { indice: 1, fracao: 0.5 });
  assert.deepEqual(posicaoNasPartes(1, 4), { indice: 3, fracao: 1 });
  assert.deepEqual(posicaoNasPartes(0.55, 1), { indice: 0, fracao: 0.55 });
  for (let indice = 0; indice < 11; indice += 1) {
    const volta = posicaoNasPartes(progressoNasPartes(indice, 11, 0.3), 11);
    assert.equal(volta.indice, indice);
    assert.ok(Math.abs(volta.fracao - 0.3) < 1e-9);
  }
});

const titulosDeSecao = (html: string) => Array.from(html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g))
  .map((achado) => achado[1].replace(/<[^>]+>/g, '').trim());

test('as seções de cada tópico viram partes com endereço único', () => {
  Object.entries(REGRAS_OFICIAIS).forEach(([id, topico]) => {
    if (id === 'mestre') return;
    const partes = titulosDeSecao(topico.corpo).map((titulo, indice) => parteDoTitulo(titulo, indice));
    // As partes extras (catálogo e bloco do Mestre) e a visão geral não podem ter o mesmo endereço de uma seção.
    ['catalogo', 'para-o-mestre', ID_DA_ABERTURA].forEach((reservado) => {
      assert.ok(!partes.includes(reservado), `${id}: uma seção ganharia o endereço reservado "${reservado}"`);
    });
    assert.equal(new Set(partes).size, partes.length, `${id}: duas seções com o mesmo título viram a mesma parte`);
  });
});

test('todo termo de mecânica cai numa parte do tópico dele', () => {
  SECOES_DAS_MECANICAS.forEach((mecanica) => {
    const topico = REGRAS_OFICIAIS[mecanica.topico];
    assert.ok(topico, `${mecanica.id}: tópico ${mecanica.topico} não existe`);
    const partes = titulosDeSecao(topico.corpo).map((titulo) => parteDoTitulo(titulo));
    assert.ok(partes.includes(parteDoTitulo(mecanica.secao)), `${mecanica.id}: a seção "${mecanica.secao}" não é parte de ${mecanica.topico}`);
  });
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
