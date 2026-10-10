import assert from 'node:assert/strict';
import test from 'node:test';
import { MUNDO_CATALOG, type LoreEntry } from '../../data/gerado/mundoCatalog';
import type { RegrasCatalog } from '../../data/regras/regras';
import {
  buscar,
  indexar,
  limparHtml,
  normalizarBusca,
  sugestoesIniciais,
  trechoEmVolta,
  type EntradaDaBusca,
} from '../../src/services/buscaDoJardim';
import {
  atalhosDaBusca,
  fichasDaBusca,
  itensDaBusca,
  mercadosAbertos,
  mundoDaBusca,
  regrasDaBusca,
  registrosDaBusca,
  type ContextoDaBusca,
} from '../../src/services/buscaDoJardimFontes';
import type { IRegistro } from '../../src/pages/Mundo/universais/registros';
import type { LojaItem } from '../../src/services/lojaCatalogService';
import type { ICharacter } from '../../src/types/character';

const jogador: ContextoDaBusca = {
  isMestre: false, gestorDaCampanha: false, isCriador: false, isAdmin: false, temCampanha: true, usuarioId: 'u1', config: {},
};
const mestre: ContextoDaBusca = { ...jogador, isMestre: true, gestorDaCampanha: true };

const entrada = (id: string, titulo: string, extra: Partial<EntradaDaBusca> = {}): EntradaDaBusca => ({
  id, grupo: 'regra', titulo, rota: `/${id}`, ...extra,
});

// ── O miolo: normalizar, casar e ranquear ─────────────────────────────────────

test('acento e caixa não atrapalham', () => {
  assert.equal(normalizarBusca('Ignição DA Árvore'), 'ignicao da arvore');
  const indice = indexar([entrada('a', 'Ignição')]);
  assert.equal(buscar(indice, 'ignicao').length, 1);
  assert.equal(buscar(indice, 'IGNIÇÃO').length, 1);
});

test('consulta vazia não devolve nada', () => {
  const indice = indexar([entrada('a', 'Combate')]);
  assert.deepEqual(buscar(indice, ''), []);
  assert.deepEqual(buscar(indice, '   '), []);
});

test('todos os termos precisam aparecer, em qualquer lugar da entrada', () => {
  const indice = indexar([
    entrada('a', 'Bola de Fogo', { detalhe: 'Magia · 3º círculo' }),
    entrada('b', 'Bola de Neve'),
  ]);
  assert.deepEqual(buscar(indice, 'bola fogo').map((r) => r.entrada.id), ['a']);
  assert.deepEqual(buscar(indice, 'bola circulo').map((r) => r.entrada.id), ['a']);
  assert.deepEqual(buscar(indice, 'bola lava'), []);
});

test('o título vale mais do que o texto corrido', () => {
  const indice = indexar([
    entrada('corpo', 'Descanso', { corpo: 'Quem usa a espada recupera Vida.' }),
    entrada('titulo', 'Espada Longa'),
    entrada('comeca', 'Espadachim'),
  ]);
  const ids = buscar(indice, 'espada').map((r) => r.entrada.id);
  assert.equal(ids.at(-1), 'corpo', 'quem só tem a palavra no texto corrido vem por último');
  assert.deepEqual(ids.slice(0, 2).sort(), ['comeca', 'titulo']);
});

test('começo do título, palavra do título e meio da palavra se distinguem', () => {
  const indice = indexar([
    entrada('meio', 'Contraespada'),
    entrada('palavra', 'A Lâmina da Espada'),
    entrada('inicio', 'Espada Curta'),
    entrada('igual', 'Espada'),
  ]);
  assert.deepEqual(buscar(indice, 'espada').map((r) => r.entrada.id), ['igual', 'inicio', 'palavra', 'meio']);
});

test('o trecho aparece só quando foi o texto corrido que casou', () => {
  const corpo = 'Muito antes do primeiro Galho existir, a Árvore guardava um segredo sobre o Fluxo da Ignição.';
  const indice = indexar([entrada('a', 'Origem', { corpo })]);
  const [achado] = buscar(indice, 'ignicao');
  assert.ok(achado.trecho?.includes('Ignição'), 'o trecho mostra o texto original, com acento');
  const [pelo_titulo] = buscar(indice, 'origem');
  assert.equal(pelo_titulo.trecho, undefined);
});

test('trechoEmVolta corta nas pontas e põe reticências', () => {
  const corpo = `${'a '.repeat(80)}ALVO${' b'.repeat(80)}`;
  const trecho = trechoEmVolta(corpo, 'alvo', 10);
  assert.ok(trecho.startsWith('…') && trecho.endsWith('…'));
  assert.ok(trecho.toLowerCase().includes('alvo'));
  assert.ok(trecho.length < 40);
});

test('cada grupo mostra no máximo o seu limite e o total também é limitado', () => {
  const muitos = Array.from({ length: 12 }, (_, i) => entrada(`r${i}`, `Espada ${i}`));
  const itens = Array.from({ length: 12 }, (_, i) => entrada(`i${i}`, `Espada ${i}`, { grupo: 'item' }));
  const indice = indexar([...muitos, ...itens]);
  const resultados = buscar(indice, 'espada', { limitePorGrupo: 4, limite: 6 });
  assert.equal(resultados.length, 6);
  assert.ok(resultados.filter((r) => r.entrada.grupo === 'regra').length <= 4);
});

test('o grupo com o melhor resultado vem primeiro', () => {
  const indice = indexar([
    entrada('ficha', 'Kael Revisor', { grupo: 'ficha' }),
    entrada('regra', 'Revisão de regras', { grupo: 'regra', corpo: 'kael' }),
  ]);
  assert.equal(buscar(indice, 'kael')[0].entrada.grupo, 'ficha');
});

test('limparHtml tira marcas e comprime espaços', () => {
  assert.equal(limparHtml('<p>Olá&nbsp;<b>mundo</b></p>\n\n<p>fim</p>'), 'Olá mundo fim');
});

test('sem digitar nada, a caixa sugere atalhos e fichas', () => {
  const todas = [
    entrada('ir1', 'Loja', { grupo: 'ir' }),
    entrada('f1', 'Kael', { grupo: 'ficha' }),
    entrada('r1', 'Combate', { grupo: 'regra' }),
  ];
  assert.deepEqual(sugestoesIniciais(todas).map((e) => e.id), ['ir1', 'f1']);
});

// ── As fontes: cada pessoa só encontra o que a tela mostraria a ela ───────────

test('o atalho do Painel do Mestre segue o papel na campanha, e não o cargo de plataforma', () => {
  const adminDePlataforma = { ...jogador, isMestre: true, isAdmin: true };
  const caminhos = (contexto: ContextoDaBusca) => atalhosDaBusca(contexto).map((a) => a.rota);
  assert.ok(!caminhos(jogador).includes('/mestre'));
  assert.ok(!caminhos(adminDePlataforma).includes('/mestre'), 'a rota /mestre exige papel de Mestre ou assistente na campanha');
  assert.ok(caminhos(mestre).includes('/mestre'));
  assert.ok(caminhos(adminDePlataforma).includes('/admin'));
  assert.ok(!caminhos(jogador).includes('/admin'));
  assert.ok(!caminhos(jogador).includes('/criador'));
  assert.ok(caminhos({ ...jogador, isCriador: true }).includes('/criador'));
});

test('sem campanha ativa os atalhos que dependem dela somem', () => {
  const caminhos = atalhosDaBusca({ ...jogador, temCampanha: false }).map((a) => a.rota);
  for (const rota of ['/ficha', '/loja', '/sessao', '/quadro', '/campanha', '/mundo/calendario', '/mestre']) {
    assert.ok(!caminhos.includes(rota), rota);
  }
  assert.ok(caminhos.includes('/regras') && caminhos.includes('/mundo'));
});

test('páginas gerais escondidas pelo Mestre somem dos atalhos dos jogadores', () => {
  const config = { calendario_oculto: true, cronologia_geral_oculta: true, registros_universais_ocultos: true };
  const dosJogadores = atalhosDaBusca({ ...jogador, config }).map((a) => a.rota);
  for (const rota of ['/mundo/calendario', '/mundo/cronologia', '/mundo/universal']) assert.ok(!dosJogadores.includes(rota), rota);
  const doMestre = atalhosDaBusca({ ...mestre, config }).map((a) => a.rota);
  for (const rota of ['/mundo/calendario', '/mundo/cronologia', '/mundo/universal']) assert.ok(doMestre.includes(rota), rota);
});

test('fichas viram resultados com o caminho da ficha', () => {
  const personagens = [{ id: 'abc', nome: 'Kael Revisor', nivel: 3 }, { id: '', nome: 'Sem id', nivel: 1 }] as unknown as ICharacter[];
  const [ficha, ...resto] = fichasDaBusca(personagens);
  assert.equal(resto.length, 0);
  assert.equal(ficha.rota, '/ficha/abc');
  assert.equal(ficha.detalhe, 'Ficha · nível 3');
});

const regrasDeTeste = {
  basico: { status: 'ok', resumo: 'O básico.', destaques: [], corpo: '<p>Texto do jogador sobre iniciativa.</p>', corpoMestre: '<p>SEGREDO-DO-MESTRE: calibre a DT.</p>' },
  mestre: { status: 'ok', resumo: 'Guia.', destaques: [], corpo: '<p>GUIA-INTEIRO-DO-MESTRE</p>' },
} as unknown as RegrasCatalog;
const fonteDeRegras = {
  regras: regrasDeTeste,
  titulos: {},
  classes: [
    { id: 'guerreiro', titulo: 'Guerreiro', descricao: 'Luta de perto.' },
    { id: 'sumida', titulo: 'Classe Sumida', categoria: 'esquecida' },
    { id: 'quebrada', titulo: 'Classe Quebrada', indisponivel: true },
    { id: 'liberada', titulo: 'Classe Liberada', categoria: 'esquecida' },
  ],
  racas: [
    { id: 'humano', titulo: 'Humano' },
    { id: 'entidade', titulo: 'Entidade', indisponivel: true },
    { id: 'perdida', titulo: 'Raça Perdida', categoria: 'esquecida' },
  ],
} as unknown as Parameters<typeof regrasDaBusca>[0];

const textoDe = (entradas: EntradaDaBusca[]) => entradas.map((e) => `${e.titulo} ${e.corpo ?? ''}`).join(' ');

test('o jogador nunca encontra o Guia do Mestre nem o texto reservado das regras', () => {
  const entradas = regrasDaBusca(fonteDeRegras, jogador);
  assert.ok(!entradas.some((e) => e.id === 'regra:mestre'));
  assert.ok(!textoDe(entradas).includes('SEGREDO-DO-MESTRE'));
  assert.ok(!textoDe(entradas).includes('GUIA-INTEIRO-DO-MESTRE'));
  assert.ok(entradas.some((e) => e.id === 'regra:basico'));
});

test('o Mestre encontra o Guia e o texto reservado', () => {
  const entradas = regrasDaBusca(fonteDeRegras, mestre);
  assert.ok(entradas.some((e) => e.id === 'regra:mestre'));
  assert.ok(textoDe(entradas).includes('SEGREDO-DO-MESTRE'));
});

test('classes e raças esquecidas ou indisponíveis só aparecem quando liberadas, como no Livro', () => {
  const ids = (contexto: ContextoDaBusca) => regrasDaBusca(fonteDeRegras, contexto).map((e) => e.id).filter((id) => /classe:|raca:/.test(id));
  assert.deepEqual(ids(jogador).sort(), ['regra:classe:guerreiro', 'regra:raca:entidade', 'regra:raca:humano']);
  const liberado = { ...jogador, config: { classes_liberadas_membros: { u1: ['liberada'] }, racas_liberadas: ['perdida'] } };
  assert.deepEqual(
    ids(liberado).sort(),
    ['regra:classe:guerreiro', 'regra:classe:liberada', 'regra:raca:entidade', 'regra:raca:humano', 'regra:raca:perdida'],
  );
  assert.equal(ids(mestre).length, 7, 'o Mestre vê todas');
});

const tipos = (entradas: EntradaDaBusca[]) => new Set(entradas.map((e) => e.id));

test('lore trancado não é encontrado, nem o que está pendurado nele', () => {
  const todas = mundoDaBusca(MUNDO_CATALOG, mestre);
  assert.ok(todas.length > 20, 'o Mestre encontra o códice inteiro');

  const deidade = MUNDO_CATALOG.find((e) => e.tipo === 'deidade' && e.id !== 'erebus' && e.revelado !== false) as LoreEntry;
  const galho = MUNDO_CATALOG.find((e) => e.tipo === 'galho' && (e.conteudo as Record<string, unknown>).arvore === deidade.id) as LoreEntry | undefined;
  const livres = tipos(mundoDaBusca(MUNDO_CATALOG, jogador));
  assert.ok(livres.has(`mundo:deidade:${deidade.id}`));

  const comOculto = tipos(mundoDaBusca(MUNDO_CATALOG, { ...jogador, config: { lore_oculto: [deidade.id] } }));
  assert.ok(!comOculto.has(`mundo:deidade:${deidade.id}`), 'a entrada oculta some');
  if (galho) assert.ok(livres.has(`mundo:galho:${galho.id}`));
});

test('uma Árvore trancada some inteira da busca dos jogadores, mas não da do Mestre', () => {
  const trancada = MUNDO_CATALOG.find((e) => e.tipo === 'deidade' && e.id !== 'erebus' && e.revelado !== false) as LoreEntry;
  const config = { arvores_oculto: [trancada.id] };
  const dosJogadores = tipos(mundoDaBusca(MUNDO_CATALOG, { ...jogador, config }));
  assert.ok(!dosJogadores.has(`mundo:deidade:${trancada.id}`));
  assert.ok(tipos(mundoDaBusca(MUNDO_CATALOG, { ...mestre, config })).has(`mundo:deidade:${trancada.id}`));
});

test('a entrada que ainda não foi revelada só aparece depois de liberada', () => {
  const fechada = MUNDO_CATALOG.find((e) => e.revelado === false && e.tipo === 'deidade');
  if (!fechada) return;
  assert.ok(!tipos(mundoDaBusca(MUNDO_CATALOG, jogador)).has(`mundo:deidade:${fechada.id}`));
  assert.ok(tipos(mundoDaBusca(MUNDO_CATALOG, { ...jogador, config: { lore_revelado: [fechada.id], arvores_revelado: [fechada.id] } })).has(`mundo:deidade:${fechada.id}`));
});

const registro = (chave: string, titulo: string, revelacao: IRegistro['revelacao'], secao: IRegistro['secao'] = 'bestiario'): IRegistro => ({
  chave, secao, origemId: null, serverId: null, titulo, subtitulo: '', descricao: 'Descrição.', campos: [['Vida', '10']], blocos: [],
  etiquetas: [], revelacao, editado: false, proprio: true, editor: 'servidor',
});

test('registro rasurado ou oculto e seção escondida não aparecem para os jogadores', () => {
  const registros = [
    registro('a', 'Aberto', 'aberto'),
    registro('b', 'Rasurado', 'rasurado'),
    registro('c', 'Oculto', 'oculto'),
    registro('d', 'Em seção escondida', 'aberto', 'rumores'),
  ];
  const config = { registros_universais_secoes_ocultas: ['rumores'] };
  assert.deepEqual(registrosDaBusca(registros, { ...jogador, config }).map((e) => e.titulo), ['Aberto']);
  assert.equal(registrosDaBusca(registros, { ...mestre, config }).length, 4);
});

test('a página de Registros Universais escondida some inteira da busca', () => {
  const registros = [registro('a', 'Aberto', 'aberto')];
  assert.deepEqual(registrosDaBusca(registros, { ...jogador, config: { registros_universais_ocultos: true } }), []);
  assert.equal(registrosDaBusca(registros, { ...mestre, config: { registros_universais_ocultos: true } }).length, 1);
});

test('o registro leva à seção e ao próprio registro', () => {
  const [resultado] = registrosDaBusca([registro('padrao:bestiario:lobo', 'Lobo', 'aberto')], jogador);
  assert.equal(resultado.rota, '/mundo/universal?secao=bestiario&registro=padrao%3Abestiario%3Alobo');
});

const item = (id: string, nome: string, nivelLoja: number): LojaItem => ({
  id, nome, nivelLoja, tipoOrigem: 'arma', categoria: 'Armas', raridade: 'Raro', moedaPreco: 'Lunaris', valorOriginal: 100, descricao: 'Uma arma.',
});

test('os mercados escondidos (por padrão o Negro e o Banco Lunar) não entram na busca dos jogadores', () => {
  assert.deepEqual(mercadosAbertos({}, false), [1, 2]);
  assert.deepEqual(mercadosAbertos({}, true), [1, 2, 3, 4]);
  assert.deepEqual(mercadosAbertos({ locais_ocultos: [] }, false), [1, 2, 3, 4]);
  const itens = [item('a', 'Faca', 1), item('b', 'Fuzil', 2), item('c', 'Veneno', 3), item('d', 'Relíquia', 4)];
  assert.deepEqual(itensDaBusca(itens, jogador).map((e) => e.titulo), ['Faca', 'Fuzil']);
  assert.equal(itensDaBusca(itens, mestre).length, 4);
});

test('a prateleira é cumulativa: com o Negro escondido e o Banco aberto, o item do Negro ainda aparece', () => {
  const itens = [item('c', 'Veneno', 3)];
  const config = { locais_ocultos: [3] };
  const [resultado] = itensDaBusca(itens, { ...jogador, config });
  assert.ok(resultado, 'o Banco Lunar mostra o nível dele e os de baixo');
  assert.ok(resultado.rota.endsWith('localizacao=4'), 'e o link abre o mercado que está aberto, não o escondido');
});

test('o item leva à Loja já filtrado pelo nome', () => {
  const [resultado] = itensDaBusca([item('a', 'Espada & Escudo', 2)], jogador);
  assert.equal(resultado.rota, '/loja?busca=Espada%20%26%20Escudo&localizacao=2');
});
