import assert from 'node:assert/strict';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { GRUPOS_NAVEGACAO } from '../../data/regras/navegacao';
import {
  ANTES_DE_LER,
  APRESENTACAO_DOS_CAPITULOS,
  CONTINUE_EM,
  TRILHAS_DE_LEITURA,
  acentoDoCapitulo,
  contarPalavras,
  cssRgb,
  localizarTopico,
  numerarLivro,
  romano,
  tempoDeLeituraEmMinutos,
} from '../../data/regras/livro';

const TOPICOS = Object.keys(REGRAS_OFICIAIS);
const semHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('os capítulos seguem a navegação e os tópicos levam o número do capítulo', () => {
  const livro = numerarLivro(TOPICOS, { comMestre: true });
  assert.deepEqual(livro.map((capitulo) => capitulo.id), GRUPOS_NAVEGACAO.map((grupo) => grupo.id));
  livro.forEach((capitulo, indice) => {
    assert.equal(capitulo.numero, indice + 1);
    capitulo.topicos.forEach((topico, posicao) => {
      assert.equal(topico.numero, `${capitulo.numero}.${posicao + 1}`, `${topico.id}: número fora de ordem`);
    });
  });
  assert.equal(livro.flatMap((capitulo) => capitulo.topicos).length, TOPICOS.length, 'tópico sumiu ou apareceu duas vezes');
});

test('o Guia do Mestre só entra no livro quando pedido, e por último', () => {
  const dosJogadores = numerarLivro(TOPICOS);
  assert.ok(!dosJogadores.some((capitulo) => capitulo.topicos.some((topico) => topico.id === 'mestre')));
  const comMestre = numerarLivro(TOPICOS, { comMestre: true });
  assert.equal(comMestre[comMestre.length - 1].id, 'mestre');
  // A numeração dos outros capítulos não muda com a presença do Mestre: link e PDF continuam valendo.
  dosJogadores.forEach((capitulo, indice) => {
    assert.equal(comMestre[indice].id, capitulo.id);
    assert.deepEqual(comMestre[indice].topicos, capitulo.topicos);
  });
});

test('só entra no livro o que está disponível, e o que sobra vai para Regras avulsas', () => {
  const livro = numerarLivro(['como-jogar', 'combate', 'topico-que-so-existe-numa-campanha']);
  assert.deepEqual(livro.map((capitulo) => capitulo.id), ['primeiros-passos', 'combate', 'avulsos']);
  const avulsos = livro[livro.length - 1];
  assert.equal(avulsos.titulo, 'Regras avulsas');
  assert.equal(avulsos.topicos[0].id, 'topico-que-so-existe-numa-campanha');
  assert.equal(avulsos.topicos[0].numero, `${avulsos.numero}.1`);
});

test('título editorial da campanha vale no livro', () => {
  const livro = numerarLivro(['combate'], { titulos: { combate: 'A Luta' } });
  assert.equal(livro[0].topicos[0].titulo, 'A Luta');
});

test('localizarTopico devolve capítulo, número e posição no livro', () => {
  const livro = numerarLivro(TOPICOS, { comMestre: true });
  const achado = localizarTopico(livro, 'ferimentos');
  assert.ok(achado);
  assert.equal(achado.capitulo.id, 'combate');
  assert.match(achado.topico.numero, /^3\.\d+$/);
  const ordem = livro.flatMap((capitulo) => capitulo.topicos.map((topico) => topico.id));
  assert.equal(achado.indiceNoLivro, ordem.indexOf('ferimentos'));
  assert.equal(localizarTopico(livro, 'nao-existe'), null);
});

test('todo capítulo tem uma apresentação própria', () => {
  GRUPOS_NAVEGACAO.forEach((grupo) => {
    const texto = APRESENTACAO_DOS_CAPITULOS[grupo.id];
    assert.ok(texto && texto.length >= 60, `${grupo.id}: capítulo sem apresentação`);
    assert.notEqual(texto, grupo.descricao, `${grupo.id}: a apresentação repete a descrição curta`);
    assert.doesNotMatch(texto, /—/, `${grupo.id}: travessão na apresentação`);
  });
});

test('as trilhas de leitura só citam tópicos que existem', () => {
  assert.ok(TRILHAS_DE_LEITURA.length >= 3);
  TRILHAS_DE_LEITURA.forEach((trilha) => {
    assert.ok(trilha.passos.length >= 2, `${trilha.id}: trilha curta demais`);
    trilha.passos.forEach((id) => assert.ok(REGRAS_OFICIAIS[id], `${trilha.id}: passo "${id}" não existe`));
    // Trilha que não termina no Guia do Mestre não pode ser marcada como só dele, e vice-versa.
    assert.equal(
      Boolean(trilha.soMestre),
      trilha.passos.some((id) => REGRAS_OFICIAIS[id].categoria === 'Guia do Mestre'),
      `${trilha.id}: soMestre diverge dos passos`,
    );
  });
});

test('"antes de ler" e "continue em" só apontam para outros tópicos que existem', () => {
  [ANTES_DE_LER, CONTINUE_EM].forEach((mapa) => {
    Object.entries(mapa).forEach(([topico, alvos]) => {
      assert.ok(REGRAS_OFICIAIS[topico], `"${topico}" não existe`);
      alvos.forEach((alvo) => {
        assert.ok(REGRAS_OFICIAIS[alvo], `${topico}: "${alvo}" não existe`);
        assert.notEqual(alvo, topico, `${topico}: aponta para si mesmo`);
      });
    });
  });
});

test('toda remissão do texto é um span simples que aponta para um tópico que existe', () => {
  const bemFormada = /<span class="regras-ref regras-ref--([a-z0-9-]+)">([^<]+)<\/span>/g;
  TOPICOS.forEach((chave) => {
    (['corpo', 'corpoMestre'] as const).forEach((campo) => {
      const html = REGRAS_OFICIAIS[chave][campo] ?? '';
      const total = (html.match(/regras-ref/g) ?? []).length;
      const bem = [...html.matchAll(bemFormada)];
      // Cada remissão tem duas ocorrências de "regras-ref" na classe (a base e a --id).
      assert.equal(total, bem.length * 2, `${chave}.${campo}: remissão malformada (use <span class="regras-ref regras-ref--id">Título</span>)`);
      bem.forEach(([, id]) => assert.ok(REGRAS_OFICIAIS[id], `${chave}.${campo}: remissão para "${id}", que não existe`));
    });
  });
});

test('romano escreve de 1 a 39', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 19, 24, 39].map(romano), [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XIV', 'XIX', 'XXIV', 'XXXIX',
  ]);
  assert.equal(romano(0), 'I');
});

test('tempo de leitura conta só o texto, nunca a marcação', () => {
  assert.equal(contarPalavras('<p class="regras-lead">Um <strong>dois</strong> três</p><style>.x{color:red}</style>'), 3);
  assert.equal(tempoDeLeituraEmMinutos('<p>pouco</p>'), 1);
  assert.equal(tempoDeLeituraEmMinutos(`<p>${'palavra '.repeat(750)}</p>`), 5);
  assert.ok(tempoDeLeituraEmMinutos(REGRAS_OFICIAIS['como-jogar'].corpo) >= 3);
});

test('o tom claro de cada capítulo é mais claro que a cor viva, e a cor sai nos dois formatos', () => {
  GRUPOS_NAVEGACAO.forEach((grupo) => {
    const acento = acentoDoCapitulo(grupo.id);
    const brilho = (cor: readonly number[]) => cor[0] + cor[1] + cor[2];
    assert.ok(brilho(acento.claro) > brilho(acento.vivo), `${grupo.id}: o tom claro não clareia`);
    assert.ok(brilho(acento.escuro) <= brilho(acento.vivo), `${grupo.id}: o tom escuro não escurece`);
  });
  const combate = acentoDoCapitulo('combate');
  assert.equal(cssRgb(combate.vivo), '160 62 74');
  assert.equal(cssRgb(combate.vivo, ','), '160,62,74');
  assert.deepEqual(acentoDoCapitulo('nao-existe'), acentoDoCapitulo(undefined));
});

// O PDF do jogador é distribuído: nada do que é do Mestre pode entrar nele. A montagem do livro roda sem
// Chrome, então dá para conferir o HTML inteiro aqui.
test('a edição do jogador do PDF não leva uma frase sequer do texto do Mestre', async () => {
  const { montarLivro } = await import('../../tools/documentos-mundo/livro-regras.mjs') as any;
  const jogador = montarLivro({ comMestre: false });
  const html = jogador.corpo as string;
  assert.ok(!html.includes('Pelo lado do Mestre'), 'o título do bloco do Mestre apareceu na edição do jogador');
  const textoDoJogador = semHtml(TOPICOS.map((chave) => REGRAS_OFICIAIS[chave].corpo).join(' '));
  TOPICOS.forEach((chave) => {
    const mestre = REGRAS_OFICIAIS[chave].corpoMestre;
    if (!mestre) return;
    semHtml(mestre)
      .split(/(?<=\.)\s+/)
      .map((frase) => frase.trim())
      .filter((frase) => frase.length >= 60 && !textoDoJogador.includes(frase))
      .forEach((frase) => {
        assert.ok(!semHtml(html).includes(frase), `${chave}: frase exclusiva do Mestre na edição do jogador: ${frase.slice(0, 70)}`);
      });
  });
  assert.ok(!jogador.partes.some((parte: any) => parte.id === 'mestre'));
  assert.equal(jogador.edicao, 'jogador');
  assert.ok(montarLivro({ comMestre: true }).partes.some((parte: any) => parte.id === 'mestre'));
});

test('todo link interno do PDF tem destino, e nenhuma remissão sobra sem resolver', async () => {
  const { montarLivro } = await import('../../tools/documentos-mundo/livro-regras.mjs') as any;
  for (const comMestre of [false, true]) {
    const html = montarLivro({ comMestre }).corpo as string;
    const destinos = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((achado) => achado[1]));
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map((achado) => achado[1]);
    assert.ok(links.length > 50, 'o livro perdeu as remissões e o sumário clicável');
    links.forEach((alvo) => {
      // Os apêndices nascem no paginador, mas o sumário aponta para eles: têm id fixo, criado lá.
      if (['ap-rapida', 'ap-artes', 'ap-indice'].includes(alvo)) return;
      assert.ok(destinos.has(alvo), `link para "#${alvo}" sem destino (${comMestre ? 'Mestre' : 'jogador'})`);
    });
    assert.ok(!/class="regras-ref/.test(html), 'sobrou remissão sem resolver no HTML do livro');
    // Cada remissão reserva o espaço do número de página, senão o texto cresce depois de medido.
    assert.ok(!/class="ref-pg"[^>]*><\/span>/.test(html), 'remissão sem espaço reservado para a página');
  }
});

test('a edição de distribuição não leva espaço de arte e a de planejamento leva', async () => {
  const { montarLivro } = await import('../../tools/documentos-mundo/livro-regras.mjs') as any;
  assert.ok(!/data-arte/.test(montarLivro({ comMestre: false }).corpo));
  assert.ok(/data-arte/.test(montarLivro({ comMestre: false, comArtes: true }).corpo));
});

test('o hash do conteúdo do livro não depende do dia em que ele é montado', async () => {
  const { montarLivro } = await import('../../tools/documentos-mundo/livro-regras.mjs') as any;
  const a = montarLivro({ comMestre: false, data: 'DATA' }).corpo;
  const b = montarLivro({ comMestre: false, data: 'DATA' }).corpo;
  assert.equal(a, b);
  assert.notEqual(a, montarLivro({ comMestre: false, data: 'OUTRO DIA' }).corpo);
});

test('no PDF, remissão dentro de "(ver ...)" leva a página com vírgula, sem parêntese dentro de parêntese', async () => {
  const { resolverRemissoes } = await import('../../tools/documentos-mundo/livro-regras.mjs') as any;
  const ids = new Set(['combate', 'descanso']);
  const dentro = resolverRemissoes('(ver <span class="regras-ref regras-ref--combate">Combate</span>)', ids);
  assert.match(dentro, /data-pg-formato=", p\. \{n\}">, p\. 000<\/span><\/a>\)$/);
  const fora = resolverRemissoes('Leia <span class="regras-ref regras-ref--descanso">Descanso</span>.', ids);
  assert.match(fora, /data-pg-formato=" \(p\. \{n\}\)"> \(p\. 000\)<\/span><\/a>\.$/);
});

test('o acabamento do PDF troca hífen por sinal de menos e fecha aspas curvas sem mexer nas tags', async () => {
  const { tipografiaDoLivro } = await import('../../tools/documentos-mundo/livro-regras.mjs') as any;
  assert.equal(tipografiaDoLivro('<td>-2 em testes, 19-20/x2</td>'), '<td>\u22122 em testes, 19-20/x2</td>');
  assert.equal(tipografiaDoLivro('<p>quer dizer "role dois dados"</p>'), '<p>quer dizer \u201crole dois dados\u201d</p>');
  // Aspas que abrem num trecho e fecham em outro (com uma tag no meio) ficam como estão.
  assert.equal(tipografiaDoLivro('<p class="a-1">"<strong>x</strong>"</p>'), '<p class="a-1">"<strong>x</strong>"</p>');
});
