import assert from 'node:assert/strict';
import test from 'node:test';
import catalogo from '../../data/loja/catalogo.json';
import { MUNDO_CATALOG } from '../../data/gerado/mundoCatalog';
import { ENTIDADES } from '../../data/mundo/entidades';
import {
  DEGRAUS,
  agruparHabilidades,
  degrauDoVd,
  faixaDoDegrau,
  numeroDaPericia,
  rgbDoDegrau,
  separarHabilidade,
} from '../../src/pages/Mundo/universais/bestiario';
import { registrosDeFabrica } from '../../src/pages/Mundo/universais/dadosPadrao';
import {
  GRUPO_GENTE_NOTAVEL,
  conteudoBasico,
  dadosAjustados,
  filtrarRegistros,
  gruposDaLista,
  mesclarRegistros,
  secaoNaTela,
  tiposDeCriatura,
  type IRegistro,
} from '../../src/pages/Mundo/universais/registros';
import { hexParaRgb, rgbValido } from '../../src/pages/Mundo/universais/temas';
import type { IRegistroDoServidor } from '../../src/services/registrosUniversaisApi';

const monstros = (catalogo.entradas as Array<{ tipo: string; id: string; conteudo: { habilidades: string[]; vd: number } }>).filter((entrada) => entrada.tipo === 'monstro');

// ---------------------------------------------------------------- habilidades

test('habilidade com selo de uso e frequência vira nome, selos e regra limpa', () => {
  const reacao = separarHabilidade('Pausa (Reação, 1/rodada: quando uma criatura em alcance Longo fala, ela faz Vontade DT 265)');
  assert.equal(reacao.nome, 'Pausa');
  assert.deepEqual(reacao.selos, ['Reação', '1 por rodada']);
  assert.match(reacao.regra, /^Quando uma criatura em alcance Longo fala/);

  const medo = separarHabilidade('Voz Que Falhou (Presença Aterradora: cada personagem que o veja faz Vontade DT 265)');
  assert.deepEqual(medo.selos, ['Medo']);
  assert.match(medo.regra, /^Cada personagem/);

  const porDia = separarHabilidade('O Sorvedouro (3/dia: todas as criaturas em 12 m fazem Reflexos DT 26)');
  assert.deepEqual(porDia.selos, ['3 por dia']);
  assert.match(porDia.regra, /^Todas as criaturas/);

  const arrancar = separarHabilidade('Arrancar (gatilho: uma criatura Agarrada falha no teste; Fortitude DT 27)');
  assert.deepEqual(arrancar.selos, ['Gatilho', 'Mutilação']);
});

test('texto sem parênteses fica inteiro como regra, sem nome', () => {
  const solta = separarHabilidade('sem forma de nome');
  assert.equal(solta.nome, '');
  assert.equal(solta.regra, 'Sem forma de nome');
});

test('sinais e como evitar saem das habilidades e características curtas ficam recolhidas', () => {
  const grupos = agruparHabilidades([
    'Presença Aterradora (cada personagem faz Vontade DT 25; em falha, perde 2d6 de Sanidade)',
    'Presa ao Estreito (não se move do trecho de mar que habita; fora d\'água, ela não age)',
    'Sinais (o mar fica liso como vidro num trecho só)',
    'Como Evitar (ela não sai do estreito)',
  ]);
  assert.deepEqual(grupos.ativas.map((item) => item.nome), ['Presença Aterradora']);
  assert.deepEqual(grupos.passivas.map((item) => item.nome), ['Presa ao Estreito']);
  assert.equal(grupos.sinais[0].regra, 'O mar fica liso como vidro num trecho só');
  assert.equal(grupos.evitar[0].regra, 'Ela não sai do estreito');
});

test('toda habilidade das 165 criaturas do catálogo é separada sem perder nem duplicar linha', () => {
  assert.ok(monstros.length >= 165);
  let total = 0;
  let sinais = 0;
  let evitar = 0;
  for (const monstro of monstros) {
    const grupos = agruparHabilidades(monstro.conteudo.habilidades);
    const separadas = grupos.ativas.length + grupos.passivas.length + grupos.sinais.length + grupos.evitar.length;
    assert.equal(separadas, monstro.conteudo.habilidades.length, `${monstro.id} perdeu habilidade na separação`);
    for (const habilidade of [...grupos.ativas, ...grupos.passivas, ...grupos.sinais, ...grupos.evitar]) {
      assert.ok(habilidade.regra.trim().length > 0, `${monstro.id}: habilidade sem regra`);
      assert.ok(!/^[a-zà-ú]/.test(habilidade.regra), `${monstro.id}: regra deve começar em maiúscula (${habilidade.regra.slice(0, 20)})`);
      assert.ok(!/^\w+\s*:/.test(habilidade.regra) || !/^(Reação|Gatilho|Golpe Anunciado|Presença Aterradora)/.test(habilidade.regra), `${monstro.id}: selo ficou no texto`);
    }
    total += separadas;
    sinais += grupos.sinais.length;
    evitar += grupos.evitar.length;
  }
  assert.ok(total > 400);
  assert.ok(sinais >= 19 && evitar >= 18, 'Sinais e Como Evitar saem de todas as criaturas que os têm');
});

test('perícia quebra em nome e número', () => {
  assert.deepEqual(numeroDaPericia('Luta +287'), { nome: 'Luta', valor: '+287' });
  assert.deepEqual(numeroDaPericia('Percepção - 3'), { nome: 'Percepção', valor: '-3' });
  assert.deepEqual(numeroDaPericia('Furtividade'), { nome: 'Furtividade', valor: '' });
});

// ---------------------------------------------------------------- degraus

test('o degrau sobe com o VD e cobre todo o catálogo', () => {
  assert.deepEqual([1, 10, 11, 25, 26, 44, 45, 99, 100, 500].map((vd) => degrauDoVd(vd).id), [
    'comum', 'comum', 'perigosa', 'perigosa', 'temivel', 'temivel', 'calamidade', 'calamidade', 'lenda', 'lenda',
  ]);
  assert.equal(degrauDoVd(null).id, 'comum');
  assert.equal(degrauDoVd(undefined).id, 'comum');
  const contagem = new Map<string, number>();
  for (const monstro of monstros) contagem.set(degrauDoVd(monstro.conteudo.vd).id, (contagem.get(degrauDoVd(monstro.conteudo.vd).id) ?? 0) + 1);
  assert.equal([...contagem.values()].reduce((soma, valor) => soma + valor, 0), monstros.length);
  for (const degrau of DEGRAUS) assert.ok((contagem.get(degrau.id) ?? 0) > 0, `o degrau ${degrau.id} ficou sem nenhuma criatura`);
});

test('as faixas dos degraus se encostam sem buraco e as cores viram r,g,b', () => {
  DEGRAUS.slice(0, -1).forEach((degrau, indice) => assert.equal((degrau.ate as number) + 1, DEGRAUS[indice + 1].de));
  assert.equal(faixaDoDegrau(DEGRAUS[0]), 'VD 1 a 10');
  assert.equal(faixaDoDegrau(DEGRAUS[DEGRAUS.length - 1]), 'VD 100+');
  assert.equal(rgbDoDegrau(DEGRAUS[1]), '217,164,65');
  assert.equal(hexParaRgb('#4ca7ff'), '76,167,255');
  assert.equal(hexParaRgb('azul'), undefined);
  assert.equal(rgbValido('10, 20, 30'), '10,20,30');
  assert.equal(rgbValido('10,20,999'), undefined);
});

// ---------------------------------------------------------------- ajustes do Mestre

const padrao = (extra: Partial<IRegistro> = {}): IRegistro => ({
  chave: 'padrao:bestiario:lobo', secao: 'bestiario', origemId: 'lobo', serverId: null, titulo: 'Lobo', subtitulo: 'Animal',
  descricao: 'Um lobo.', campos: [['VD', '5']], blocos: [{ titulo: 'Habilidades', itens: ['Uivo'] }], etiquetas: ['Animal'],
  revelacao: 'aberto', editado: false, proprio: false, editor: 'servidor', ...extra,
});
const servidor = (extra: Partial<IRegistroDoServidor> & { id: string }): IRegistroDoServidor => ({ secao: 'bestiario', origem_id: 'lobo', revelacao: 'aberto', dados: {}, ...extra });

test('o editor só grava o que mudou em relação ao original de fábrica', () => {
  const original = conteudoBasico(padrao());
  assert.deepEqual(dadosAjustados(original, original), {});
  assert.deepEqual(dadosAjustados({ ...original, descricao: 'Um lobo da mesa.' }, original), { descricao: 'Um lobo da mesa.' });
  assert.deepEqual(dadosAjustados({ ...original, blocos: [] }, original), { blocos: [] });
  // Registro do Mestre não tem original: vai tudo.
  assert.equal(dadosAjustados(original, undefined).titulo, 'Lobo');
});

test('ajuste antigo com cópia igual ao original não tranca a ficha montada', () => {
  const [copia] = mesclarRegistros([padrao()], [servidor({ id: 's1', dados: { campos: [['VD', '5']], blocos: [{ titulo: 'Habilidades', itens: ['Uivo'] }], descricao: 'Um lobo.' } })], false);
  assert.equal(copia.camposAjustados, false);
  assert.equal(copia.blocosAjustados, false);
  assert.equal(copia.original?.descricao, 'Um lobo.');

  const [mexido] = mesclarRegistros([padrao()], [servidor({ id: 's2', dados: { blocos: [{ titulo: 'Habilidades', itens: ['Uivo', 'Mordida'] }] } })], false);
  assert.equal(mexido.blocosAjustados, true);
  assert.equal(mexido.camposAjustados, false);
});

test('pessoa notável do Mestre nasce no grupo Gente notável e vive na aba Seres', () => {
  const lista = mesclarRegistros([], [servidor({ id: 'p1', secao: 'personagens', origem_id: null, dados: { titulo: 'Dona Marta' } })], true);
  assert.equal(lista[0].grupo, GRUPO_GENTE_NOTAVEL);
  assert.equal(secaoNaTela('personagens'), 'seres');
  assert.equal(secaoNaTela('bestiario'), 'bestiario');
});

test('filtro por grupo e contagem de grupos respeitam a ordem pedida', () => {
  const registros = [padrao({ grupo: 'Animal' }), padrao({ chave: 'b', grupo: 'Aberração' }), padrao({ chave: 'c', grupo: 'Animal' })];
  assert.equal(filtrarRegistros(registros, '', '', true, 'Animal').length, 2);
  assert.deepEqual(gruposDaLista(registros), [{ grupo: 'Animal', total: 2 }, { grupo: 'Aberração', total: 1 }]);
  assert.deepEqual(gruposDaLista(registros, ['Aberração', 'Animal']).map((item) => item.grupo), ['Aberração', 'Animal']);
});

// ---------------------------------------------------------------- fábrica

const fabrica = (isMestre: boolean, extra: Record<string, unknown> = {}) => registrosDeFabrica({
  catalog: MUNDO_CATALOG, factions: [], isMestre, loreRevelado: [], loreOculto: [], entities: ENTIDADES, ...extra,
});

test('cada criatura do catálogo vira ficha com VD, categoria e habilidades', () => {
  const bestiario = fabrica(false).filter((registro) => registro.secao === 'bestiario');
  assert.equal(bestiario.length, monstros.length);
  for (const registro of bestiario) {
    assert.ok(registro.criatura, `${registro.titulo} sem ficha`);
    assert.equal(registro.vd, registro.criatura?.vd);
    assert.equal(registro.grupo, registro.criatura?.categoria || undefined);
  }
});

test('Seres reúne Soberanos, Deidades e Entidades, e Soberano é a lista dos dez seres mais fortes, não os antigos de Gênese', () => {
  const doMestre = fabrica(true).filter((registro) => registro.secao === 'seres');
  const doJogador = fabrica(false).filter((registro) => registro.secao === 'seres');
  const grupos = (lista: IRegistro[]) => new Set(lista.map((registro) => registro.grupo));
  for (const grupo of ['Soberanos', 'Deidades', 'Entidades']) assert.ok(grupos(doMestre).has(grupo), `Mestre sem ${grupo}`);
  for (const grupo of ['Soberanos', 'Deidades', 'Entidades']) assert.ok(grupos(doJogador).has(grupo), `jogador sem ${grupo}`);
  assert.ok(doMestre.length >= doJogador.length);

  // Os Soberanos de hoje: Amadheus, Jota, Grimm, Blanc, Ushumgal, Selah, Circe, Shinji, Karnath e Zero.
  const soberanos = (lista: IRegistro[]) => lista.filter((registro) => registro.grupo === 'Soberanos').map((registro) => registro.origemId).sort();
  assert.deepEqual(soberanos(doMestre), ['amadheus-colona', 'blanc', 'circe', 'grimm', 'jota-macedo', 'karnath', 'selah', 'shinji-takamori', 'ushumgal', 'zero']);
  // O top é de dez. O Pedro tirou o Soberano dos Mortais quando chegou a onze.
  assert.ok(soberanos(doMestre).length <= 10);
  // Todo Soberano é Soberano de alguma coisa.
  for (const registro of doMestre.filter((item) => item.grupo === 'Soberanos')) assert.match(registro.subtitulo, /^Soberan[oa] d/, `${registro.titulo} sem Soberano de...`);

  // Os Soberanos de Gênese não fazem parte de Seres: nem para o Mestre, nem liberados.
  const antigos = ['Kaiser', 'Noemi Finwë', 'Bergelmir Laufey', 'Davinor Întuneric', 'Durin II', 'Augustos Castilla', 'As Irmãs da Noite'];
  const liberados = fabrica(false, { loreRevelado: ['kaiser', 'noemi-finwe'] }).filter((registro) => registro.secao === 'seres');
  for (const titulo of antigos) {
    assert.ok(!doMestre.some((registro) => registro.titulo === titulo), `${titulo} não é universal`);
    assert.ok(!liberados.some((registro) => registro.titulo === titulo), `${titulo} não aparece nem liberado`);
  }

  // Jota Macedo e o Dragão chegam rasurados ao jogador: o texto de Jota é spoiler da campanha.
  for (const id of ['jota-macedo', 'ushumgal', 'circe', 'karnath', 'shinji-takamori', 'zero']) {
    const visto = doJogador.find((registro) => registro.origemId === id);
    assert.equal(visto?.revelacao, 'rasurado', `${id} deveria chegar rasurado`);
    assert.equal(visto?.titulo, 'Registro retido');
    assert.equal(visto?.descricao, '');
  }
  assert.equal(doMestre.find((registro) => registro.origemId === 'blanc')?.revelacao, 'aberto');
  // Selah é público (já está no Bestiário) e leva para a ficha dele.
  const selah = doJogador.find((registro) => registro.origemId === 'selah');
  assert.equal(selah?.revelacao, 'aberto');
  assert.match(selah?.href?.para ?? '', /secao=bestiario&registro=padrao:bestiario:selah/);
  assert.equal(doJogador.find((registro) => registro.origemId === 'blanc')?.grupo, 'Soberanos');

  const titulosDoJogador = doJogador.map((registro) => registro.titulo);
  assert.ok(!titulosDoJogador.includes('A.X.I.S'), 'a Deidade ainda não revelada não aparece para o jogador');
  // O Mestre libera Jota na Visibilidade do Mundo e ele passa a aparecer para a mesa.
  const jota = fabrica(false, { loreRevelado: ['jota-macedo'] }).find((registro) => registro.origemId === 'jota-macedo');
  assert.equal(jota?.revelacao, 'aberto');
  assert.equal(jota?.titulo, 'Jota Macedo');
});

test('Árvore trancada leva embora a Deidade dela, e Entidade trancada some', () => {
  const comArvore = fabrica(false).filter((registro) => registro.secao === 'seres' && registro.grupo === 'Deidades').length;
  const semGenese = fabrica(false, { arvoresTrancadas: ['aethel'] }).filter((registro) => registro.secao === 'seres' && registro.grupo === 'Deidades');
  assert.equal(semGenese.length, comArvore - 1);
  assert.ok(!semGenese.some((registro) => registro.titulo === 'Aethel'));
  // Mestre vê a Árvore trancada do mesmo jeito.
  assert.ok(fabrica(true, { arvoresTrancadas: ['aethel'] }).some((registro) => registro.titulo === 'Aethel'));

  const entidades = ENTIDADES.filter((entidade) => entidade.registroUniversal);
  const trancada = fabrica(false, { entidadesOculto: [entidades[0].id] }).filter((registro) => registro.grupo === 'Entidades');
  assert.equal(trancada.length, entidades.length - 1);
});

test('Deidade e Soberano da lore saem só da Busca por Árvore, a Entidade leva ao conto', () => {
  const seres = fabrica(true).filter((registro) => registro.secao === 'seres');
  const deidade = seres.find((registro) => registro.titulo === 'Aethel');
  assert.equal(deidade?.indexadoNoMundo, true);
  assert.match(deidade?.href?.para ?? '', /^\/mundo\/arvores\/aethel\/deidade\/aethel$/);
  const entidade = seres.find((registro) => registro.grupo === 'Entidades');
  assert.equal(entidade?.indexadoNoMundo, undefined);
  assert.match(entidade?.href?.para ?? '', /^\/entidades\//);
  assert.match(entidade?.corRgb ?? '', /^\d+,\d+,\d+$/);
});

test("os filtros do Bestiário: marcas completas, sem repetir a categoria, e um Tipo para separar criaturas de aliados", () => {
  const criaturas = registrosDeFabrica({ catalog: MUNDO_CATALOG, factions: [], isMestre: true, loreRevelado: [], loreOculto: [], entities: ENTIDADES })
    .filter((registro) => registro.secao === "bestiario");
  const com = (marca: string) => criaturas.filter((registro) => registro.etiquetas.includes(marca));
  const monstros = (catalogo.entradas as Array<{ tipo: string; id: string; conteudo: Record<string, unknown> }>).filter((entrada) => entrada.tipo === "monstro");

  // Cada marca cobre todas as criaturas que o catálogo diz que têm aquela característica.
  assert.equal(com("Única").length, monstros.filter((entrada) => entrada.conteudo.unico === true).length);
  assert.equal(com("Chefe").length, monstros.filter((entrada) => entrada.conteudo.papel === "chefe").length);
  assert.equal(com("Contratável").length, monstros.filter((entrada) => entrada.conteudo.funcao).length);
  for (const [familia, marca] of [["vazio", "Vazio"], ["golem", "Golem"], ["mar", "Marítima"]]) {
    const esperadas = monstros.filter((entrada) => entrada.conteudo.familia === familia).map((entrada) => entrada.id);
    for (const id of esperadas) assert.ok(criaturas.find((registro) => registro.origemId === id)?.etiquetas.includes(marca), id + " sem a marca " + marca);
  }
  // Os anjos e os demônios do Espírito, inclusive os mais antigos, carregam a marca da Natureza.
  for (const id of ["anjo-guardiao", "ezrakael", "seraquiel", "miraquel"]) assert.ok(criaturas.find((registro) => registro.origemId === id)?.etiquetas.includes("Angelical"), id);
  for (const id of ["demonio-menor", "belzarak"]) assert.ok(criaturas.find((registro) => registro.origemId === id)?.etiquetas.includes("Demoníaco"), id);

  // Mercenário é uma marca só (e não uma por nível), e nenhuma marca repete a categoria nem fica sozinha com um nome técnico.
  assert.equal(com("Mercenário").length, 3);
  const todas = new Set(criaturas.flatMap((registro) => registro.etiquetas));
  for (const proibida of ["Mercenário básico", "Mercenário avançado", "Mercenário mestre", "merc-basico"]) assert.ok(!todas.has(proibida), proibida);
  for (const registro of criaturas) {
    assert.ok(!registro.etiquetas.includes(registro.grupo ?? ""), registro.titulo + " repete a categoria nas marcas");
    assert.equal(new Set(registro.etiquetas).size, registro.etiquetas.length, registro.titulo + " tem marca repetida");
  }

  // O Tipo cobre o catálogo inteiro, na ordem de quem se enfrenta para quem a mesa convoca.
  const tipos = tiposDeCriatura(criaturas);
  assert.deepEqual(tipos.map((item) => item.tipo), ["Criatura", "Ser Lendário", "Ajudante", "Invocação", "Servo", "Familiar"]);
  assert.equal(tipos.reduce((soma, item) => soma + item.total, 0), criaturas.length);
});
