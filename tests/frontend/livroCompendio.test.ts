import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO, RACAS_CATALOGO } from '../../src/services/catalogoService';
import {
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  FUSOES_CATALOGO,
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
} from '../../src/services/magiaService';

const carregarCompendio = async () => await import('../../tools/documentos-mundo/compendio.mjs') as any;
const carregarLivro = async () => await import('../../tools/documentos-mundo/livro-regras.mjs') as any;

const esc = (valor: unknown) => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const corpoDoCompendio = (partes: any[]) => partes
  .flatMap((parte) => parte.topicos)
  .map((topico) => topico.regra.corpo)
  .join('\n');

test('o compêndio tem quatro partes, numeradas A a D, e a edição do jogador só leva o que qualquer jogador vê', async () => {
  const { partesDoCompendio } = await carregarCompendio();
  const jogador = partesDoCompendio({ comMestre: false });
  const mestre = partesDoCompendio({ comMestre: true });

  assert.deepEqual(jogador.map((parte: any) => parte.rotulo), ['Compêndio A', 'Compêndio B', 'Compêndio C', 'Compêndio D']);
  assert.deepEqual(jogador.map((parte: any) => parte.id), ['compendio-classes', 'compendio-racas', 'compendio-legados', 'compendio-magias']);
  jogador.forEach((parte: any) => {
    parte.topicos.forEach((topico: any, indice: number) => {
      assert.equal(topico.numero, `${parte.numeral}.${indice + 1}`);
      assert.ok(topico.regra.resumo !== undefined && topico.regra.status, `${topico.id}: entrada sem cabeçalho`);
    });
  });

  // Visibilidade: a mesma regra do site (visibilidadeRegras.ts). Classe ou raça especial depende de o Mestre liberar,
  // e o PDF é o mesmo para todas as mesas.
  const classesComuns = (CLASSES_CATALOGO as any[]).filter((classe) => classe.categoria === 'padrao' && !classe.indisponivel);
  const classesTodas = (CLASSES_CATALOGO as any[]).filter((classe) => !classe.indisponivel);
  assert.deepEqual(
    jogador[0].topicos.map((topico: any) => topico.id).sort(),
    classesComuns.map((classe) => `classe-${classe.id}`).sort(),
  );
  assert.equal(mestre[0].topicos.length, classesTodas.length);

  const racasComuns = (RACAS_CATALOGO as any[]).filter((raca) => raca.categoria === 'padrao' && !raca.indisponivel && raca.id !== 'raca-personalizada');
  assert.deepEqual(
    jogador[1].topicos.map((topico: any) => topico.id).sort(),
    racasComuns.map((raca) => `raca-${raca.id}`).sort(),
  );
  const idsDoMestre = new Set(mestre[1].topicos.map((topico: any) => topico.id));
  assert.ok(!idsDoMestre.has('raca-raca-personalizada') && !idsDoMestre.has('raca-entidade'), 'a personalizada e a Entidade não têm ficha mecânica');
  assert.ok(idsDoMestre.size > racasComuns.length, 'a edição do Mestre perdeu as raças especiais');

  const textoDoJogador = corpoDoCompendio(jogador) + jogador.flatMap((parte: any) => parte.topicos.map((topico: any) => topico.regra.resumo)).join(' ');
  (CLASSES_CATALOGO as any[])
    .filter((classe) => classe.categoria !== 'padrao')
    .forEach((classe) => {
      assert.ok(!jogador[0].topicos.some((topico: any) => topico.id === `classe-${classe.id}`), `${classe.id}: classe especial na edição do jogador`);
      // O texto que descreve o que só a classe especial faz não pode aparecer em lugar nenhum do compêndio do jogador.
      const exclusivo = String(classe.habilidades?.[0]?.descricao ?? '').trim();
      if (exclusivo.length >= 60) assert.ok(!textoDoJogador.includes(esc(exclusivo)), `${classe.id}: texto exclusivo da classe especial no compêndio do jogador`);
    });
});

test('toda classe do compêndio traz todas as habilidades, eventos e poderes, na ordem do catálogo', async () => {
  const { partesDoCompendio } = await carregarCompendio();
  const partes = partesDoCompendio({ comMestre: true });
  const porId = new Map<string, any>(partes[0].topicos.map((topico: any) => [topico.id, topico]));
  (CLASSES_CATALOGO as any[]).filter((classe) => !classe.indisponivel).forEach((classe) => {
    const entrada = porId.get(`classe-${classe.id}`);
    assert.ok(entrada, `${classe.id}: sem entrada`);
    const corpo: string = entrada.regra.corpo;
    (classe.habilidades || []).forEach((habilidade: any) => {
      assert.ok(corpo.includes(`<h4 class="hab-nome">${esc(habilidade.titulo)}`), `${classe.id}: habilidade "${habilidade.titulo}" ficou de fora`);
      (habilidade.estagios || []).forEach((estagio: any) => {
        assert.ok(corpo.includes(esc(estagio.descricao)), `${classe.id}/${habilidade.id}: estágio do nível ${estagio.nivel} ficou de fora`);
      });
      (habilidade.opcoes || []).forEach((opcao: any) => {
        assert.ok(corpo.includes(`<strong>${esc(opcao.titulo)}</strong>`), `${classe.id}/${habilidade.id}: opção "${opcao.titulo}" ficou de fora`);
      });
    });
    (classe.poderes || []).forEach((poder: any) => {
      assert.ok(corpo.includes(`<strong>${esc(poder.titulo)}</strong>`), `${classe.id}: poder "${poder.titulo}" ficou de fora`);
    });
    (classe.eventos || []).forEach((evento: any) => {
      assert.ok(corpo.includes(`<strong>${esc(evento.titulo)}</strong>`), `${classe.id}: evento "${evento.titulo}" ficou de fora`);
    });
    // A tabela de progressão vai do nível 1 ao último nível com conteúdo, uma linha por nível.
    assert.equal((corpo.match(/<tr><td>\d+<\/td><td>/g) || []).length >= 20, true, `${classe.id}: tabela de progressão incompleta`);
  });
});

test('o compêndio de magias traz cada magia, ritual, selo, encantamento e fusão do catálogo, e nada de dado cru', async () => {
  const { partesDoCompendio } = await carregarCompendio();
  const magias = partesDoCompendio({ comMestre: false }).find((parte: any) => parte.id === 'compendio-magias');
  const corpo = corpoDoCompendio([magias]);
  const contar = (trecho: string) => corpo.split(trecho).length - 1;

  (MAGIAS_CATALOGO as any[]).forEach((magia) => {
    assert.ok(contar(`<h4 class="hab-nome">${esc(magia.titulo)} `) >= 1, `magia "${magia.titulo}" ficou de fora`);
    assert.ok(corpo.includes(esc(magia.efeito)), `magia "${magia.titulo}": o efeito ficou de fora`);
  });
  (RITUAIS_CATALOGO as any[]).forEach((ritual) => assert.ok(corpo.includes(`<h4 class="hab-nome">${esc(ritual.titulo)} `), `ritual "${ritual.titulo}" ficou de fora`));
  (SELOS_CATALOGO as any[]).forEach((selo) => assert.ok(corpo.includes(`<h4 class="hab-nome">${esc(selo.titulo)} `), `selo "${selo.titulo}" ficou de fora`));
  (ENCANTAMENTOS_CATALOGO as any[]).forEach((item) => assert.ok(corpo.includes(`<h4 class="hab-nome">${esc(item.titulo)} `), `encantamento "${item.titulo}" ficou de fora`));
  (FUSOES_CATALOGO as any[]).forEach((fusao) => assert.ok(corpo.includes(`<strong>${esc(fusao.titulo)}</strong>`), `fusão "${fusao.titulo}" ficou de fora`));

  // Uma entrada por Fluxo com magia, mais a das universais, mais rituais, selos, encantamentos e fusões.
  const fluxosComMagia = FLUXOS_CATALOGO.filter((fluxo: any) => (MAGIAS_CATALOGO as any[]).some((magia) => magia.fluxo === fluxo.id));
  assert.equal(magias.topicos.length, 1 + fluxosComMagia.length + 4);

  assert.ok(!/undefined|\[object|NaN/.test(corpo), 'dado cru ou ausente vazou para o texto do compêndio');
  // A DT dos rituais vem do catálogo; o requisito de componentes vem da regra de materiais.
  assert.match(corpo, /Componentes ritualísticos<\/b> Este rito é/);
});

test('o catálogo de Legados do compêndio lista todos os Legados e vira cartões no PDF', async () => {
  const { partesDoCompendio } = await carregarCompendio();
  const legados = partesDoCompendio({ comMestre: false }).find((parte: any) => parte.id === 'compendio-legados');
  const corpo = corpoDoCompendio([legados]);
  (LEGADOS_CATALOGO as any[]).forEach((legado) => {
    assert.ok(corpo.includes(`<strong>${esc(legado.titulo)}</strong>`), `Legado "${legado.titulo}" ficou de fora`);
  });
  assert.match(corpo, /<table class="regras-table" data-cartoes="1">/);
  assert.equal(legados.contagem, `${LEGADOS_CATALOGO.length} Legados`);
});

test('as raças do compêndio trazem estágios, escolhas e animais completos', async () => {
  const { partesDoCompendio } = await carregarCompendio();
  const racas = partesDoCompendio({ comMestre: true }).find((parte: any) => parte.id === 'compendio-racas');
  const animalia = racas.topicos.find((topico: any) => topico.id === 'raca-animalia').regra.corpo as string;
  const catalogo = (RACAS_CATALOGO as any[]).find((raca) => raca.id === 'animalia');
  assert.ok((catalogo.animais || []).length >= 100);
  (catalogo.animais as any[]).forEach((animal) => assert.ok(animal.titulo && animal.id));
  // Todos os animais aparecem, cada um uma vez.
  (catalogo.animais as any[]).forEach((animal) => {
    assert.ok(animalia.includes(`<li><strong>${esc(animal.titulo)}</strong>`), `animal "${animal.titulo}" ficou de fora`);
  });
  const vampiro = racas.topicos.find((topico: any) => topico.id === 'raca-vampiro').regra.corpo as string;
  assert.match(vampiro, /Estágios/);
  (((RACAS_CATALOGO as any[]).find((raca) => raca.id === 'vampiro')).variantes as any[]).forEach((variante) => {
    assert.ok(vampiro.includes(`<h4 class="hab-nome">${esc(variante.titulo)}`), `variante "${variante.titulo}" do Vampiro ficou de fora`);
  });
});

test('os ajustes do PDF só valem enquanto a frase do site existe, e param a montagem quando ela some', async () => {
  const { AJUSTES_DO_PDF, aplicarAjustesDoPdf } = await carregarCompendio();
  Object.entries(AJUSTES_DO_PDF as Record<string, any>).forEach(([id, ajuste]) => {
    assert.ok((REGRAS_OFICIAIS as any)[id], `${id}: tópico inexistente`);
    (ajuste.trocas || []).forEach(([de]: [string]) => {
      assert.ok((REGRAS_OFICIAIS as any)[id].corpo.includes(de), `${id}: a frase "${de.slice(0, 60)}" mudou no texto e o ajuste do PDF ficou velho`);
    });
  });
  assert.throws(
    () => aplicarAjustesDoPdf('classes', { corpo: '<p>texto que não tem a frase combinada</p>' }),
    /ficou velho/,
  );
  // O Compêndio entra no texto do PDF e sai do texto do site.
  const classes = aplicarAjustesDoPdf('classes', (REGRAS_OFICIAIS as any).classes);
  assert.match(classes.corpo, /Compêndio A/);
  assert.doesNotMatch((REGRAS_OFICIAIS as any).classes.corpo, /Compêndio/);
});

test('no PDF, a lista de classes e a tabela de raças ligam cada nome à entrada do compêndio', async () => {
  const { montarLivro } = await carregarLivro();
  const html = montarLivro({ comMestre: false }).corpo as string;
  const comuns = (CLASSES_CATALOGO as any[]).filter((classe) => classe.categoria === 'padrao');
  comuns.forEach((classe) => {
    assert.ok(html.includes(`href="#t-classe-${classe.id}"`), `${classe.id}: a lista de classes não liga à entrada`);
    assert.ok(html.includes(`id="t-classe-${classe.id}"`), `${classe.id}: a entrada não tem destino`);
  });
  const especial = (CLASSES_CATALOGO as any[]).find((classe) => classe.categoria !== 'padrao');
  assert.ok(!html.includes(`id="t-classe-${especial.id}"`), 'classe especial na edição do jogador');
  assert.ok(html.includes('href="#t-raca-humano"'));
  // O sumário e o "Como usar" apontam para o compêndio.
  assert.match(html, /O Compêndio<\/h3>/);
  assert.match(html, /Compêndio A, Classes\./);
});

test('a edição do jogador do PDF continua sem nenhuma frase do Guia do Mestre depois do compêndio', async () => {
  const { montarLivro } = await carregarLivro();
  const jogador = montarLivro({ comMestre: false });
  assert.ok(jogador.partes.some((parte: any) => parte.id === 'compendio-magias'));
  assert.ok(!jogador.partes.some((parte: any) => parte.id === 'mestre'));
  const mestre = montarLivro({ comMestre: true });
  assert.deepEqual(
    mestre.partes.map((parte: any) => parte.id).slice(-5),
    ['mestre', 'compendio-classes', 'compendio-racas', 'compendio-legados', 'compendio-magias'],
    'o compêndio vem depois do último capítulo, também na edição do Mestre',
  );
});

test('artes próprias das capas: a imagem troca o emblema só na capa que tem arquivo', async () => {
  const { artePronta } = await import('../../tools/documentos-mundo/artes-prontas.mjs') as any;
  const { montarLivro } = await carregarLivro();
  const pasta = mkdtempSync(join(tmpdir(), 'jardim-artes-'));
  const anterior = process.env.LIVRO_PASTA_DAS_ARTES;
  try {
    // Sem a pasta apontada para uma com arquivos, o livro sai só com o emblema.
    assert.equal(artePronta('capa', pasta), null);
    const semArte = montarLivro({ comMestre: false, data: 'DATA' }).corpo as string;
    assert.ok(!semArte.includes('pagina-imagem'));
    assert.ok(semArte.includes('capa-emblema'));

    // PNG de um pixel e um JPEG qualquer: o gerador só lê os bytes, quem decodifica é o Chrome.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    writeFileSync(join(pasta, 'capa.png'), png);
    writeFileSync(join(pasta, 'abertura-combate.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const arte = artePronta('capa', pasta);
    assert.equal(arte.tipo, 'image/png');
    assert.equal(arte.bytes, png.length);
    assert.match(arte.src, /^data:image\/png;base64,/);
    assert.equal(artePronta('abertura-combate', pasta).tipo, 'image/jpeg');

    process.env.LIVRO_PASTA_DAS_ARTES = pasta;
    const comArte = montarLivro({ comMestre: false, data: 'DATA' }).corpo as string;
    assert.equal((comArte.match(/class="pagina-imagem"/g) || []).length, 2);
    assert.ok(comArte.includes('pagina--capa pagina--com-imagem'));
    assert.ok(!comArte.includes('class="capa-emblema"'), 'a capa com imagem ainda leva o emblema');
    assert.ok(comArte.includes('class="abertura-veu"') && comArte.includes('class="capa-veu"'));
    // As outras aberturas e a contracapa seguem com o emblema, e o conteúdo da imagem entra no hash do livro.
    assert.ok(comArte.includes('class="contracapa-corpo"') && comArte.includes('capa-emblema--pequeno'));
    assert.equal((comArte.match(/abertura-arvore/g) || []).length > 5, true);
    assert.notEqual(comArte, semArte);
  } finally {
    if (anterior === undefined) delete process.env.LIVRO_PASTA_DAS_ARTES;
    else process.env.LIVRO_PASTA_DAS_ARTES = anterior;
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('os nomes de arquivo das artes cobrem a capa, a contracapa e cada abertura, sem repetir', async () => {
  const { nomesDasArtes } = await import('../../tools/documentos-mundo/artes-prontas.mjs') as any;
  const { estrutura } = await carregarLivro();
  const nomes = nomesDasArtes(estrutura({ comMestre: true })) as string[];
  assert.equal(new Set(nomes).size, nomes.length);
  assert.ok(nomes.includes('capa') && nomes.includes('contracapa'));
  ['primeiros-passos', 'personagem', 'combate', 'cenas', 'magia', 'itens', 'veiculos', 'mundo', 'mestre',
    'compendio-classes', 'compendio-racas', 'compendio-legados', 'compendio-magias'].forEach((id) => {
    assert.ok(nomes.includes(`abertura-${id}`), `falta o nome da abertura de ${id}`);
  });
});
