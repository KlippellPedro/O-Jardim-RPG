import assert from 'node:assert/strict';
import test from 'node:test';
import { MUNDO_CATALOG } from '../../data/gerado/mundoCatalog';
import { ENTIDADES } from '../../data/mundo/entidades';
import type { FaccaoDocumentada } from '../../data/regras/faccoes';
import { FACCOES_DOCUMENTADAS } from '../../data/regras/faccoes';
import { CAMINHO_DA_FORMA, identidadeDe } from '../../src/pages/Mundo/universais/identidadesFaccao';
import { identidadeDeLocal } from '../../src/pages/Mundo/universais/identidadesLocal';
import { ICONES_DE_LOCAL } from '../../src/pages/Mundo/universais/iconesDeLocal';
import { monograma, nomeETexto, raridadeDe, RARIDADES, tipoLegivel } from '../../src/pages/Mundo/universais/artefatos';
import { registrosDeFabrica } from '../../src/pages/Mundo/universais/dadosPadrao';
import type { IRegistro } from '../../src/pages/Mundo/universais/registros';

const faccao = (id: string, titulo: string, estado: 'canonica' | 'proposta' = 'canonica'): FaccaoDocumentada => ({
  id, titulo, tipo: 'instituicao-financeira', alcance: 'Todas as Árvores', atuacao_publica: 'Guarda bens.', estado, registro_universal: true, fontes: [],
});

const fabrica = (isMestre: boolean) => registrosDeFabrica({
  catalog: MUNDO_CATALOG, factions: [faccao('banco-lunar', 'Banco Lunar'), faccao('vigilia', 'Vigília das Raízes', 'proposta')],
  isMestre, loreRevelado: [], loreOculto: [], entities: ENTIDADES,
});

test('raridade dá cor, rótulo e peso, e chave desconhecida não quebra', () => {
  assert.equal(raridadeDe('reliquia da criacao').rotulo, 'Relíquia da Criação');
  assert.equal(raridadeDe('mitico').peso, 4);
  assert.equal(raridadeDe('comum').peso, 0);
  assert.equal(raridadeDe('coisa-nova').rotulo, 'Coisa-nova');
  assert.equal(raridadeDe('').rotulo, 'Sem raridade');
  for (const raridade of Object.values(RARIDADES)) assert.match(raridade.rgb, /^\d+,\d+,\d+$/);
});

test('poder "Nome: texto" se separa e texto solto fica inteiro', () => {
  assert.deepEqual(nomeETexto('Corpo Ígneo: Resistência 15 contra Fogo'), { nome: 'Corpo Ígneo', texto: 'Resistência 15 contra Fogo' });
  assert.deepEqual(nomeETexto('Só uma frase sem nome'), { nome: '', texto: 'Só uma frase sem nome' });
});

test('monograma e tipo da facção viram texto de gente', () => {
  assert.equal(monograma('Banco Lunar'), 'BL');
  assert.equal(monograma('AstraTech'), 'AS');
  assert.equal(monograma('Guilda dos Caçadores'), 'GC');
  assert.equal(tipoLegivel('instituicao-financeira'), 'Instituição financeira');
  assert.equal(tipoLegivel('tipo-novo-qualquer'), 'Tipo novo qualquer');
  assert.equal(tipoLegivel(''), '');
});

test('só entra em Artefatos e Frutos o que existe um só em todo o universo: Relíquia da Criação e Fruto do Éden', () => {
  const artefatos = fabrica(false).filter((registro) => registro.secao === 'artefatos');
  // Toda Relíquia da Criação do catálogo entra, seja arma, armadura, implante, casa ou veículo; artefato comum não.
  const titulos = new Set(artefatos.map((registro) => registro.titulo));
  assert.ok(artefatos.length >= 92);
  assert.ok(['Excalibur', 'Mjolnir', 'Ambrosia'].every((titulo) => titulos.has(titulo)), 'faltam Relíquias que não são artefato');
  assert.ok(!titulos.has('Grimório Arcano'), 'artefato comum não é registro universal');
  assert.ok(artefatos.filter((registro) => registro.subtitulo === 'Arma').length >= 17);
  for (const registro of artefatos) {
    assert.ok(registro.artefato, `${registro.titulo} sem ficha`);
    assert.match(registro.corRgb ?? '', /^\d+,\d+,\d+$/, `${registro.titulo} sem cor`);
    assert.match(registro.artefato?.raridade ?? '', /^reliquia/, `${registro.titulo} não é Relíquia da Criação nem Fruto do Éden`);
  }
  const frutos = artefatos.filter((registro) => registro.artefato?.fruto);
  assert.equal(frutos.length, 26);
  for (const fruto of frutos) assert.ok(fruto.artefato?.passivo && fruto.artefato?.fraqueza && fruto.artefato?.despertar, `${fruto.titulo} sem poderes`);
  // Os 11 Frutos ligados a uma Deidade usam a cor da Árvore dela, não a da raridade.
  const daArvore = frutos.filter((fruto) => fruto.artefato?.deidade);
  assert.equal(daArvore.length, 11);
  assert.ok(daArvore.every((fruto) => fruto.corRgb !== raridadeDe(fruto.artefato?.raridade ?? '').rgb));
  assert.ok(frutos.filter((fruto) => !fruto.artefato?.deidade).every((fruto) => fruto.corRgb === raridadeDe(fruto.artefato?.raridade ?? '').rgb));
});

test('artefato que desperta com o dono traz as formas por nível, quando tiver', () => {
  const comFormas = fabrica(false).filter((registro) => (registro.artefato?.formas.length ?? 0) > 0);
  for (const registro of comFormas) {
    const niveis = registro.artefato?.formas.map((forma) => forma.nivel) ?? [];
    assert.deepEqual(niveis, [...niveis].sort((a, b) => a - b), `${registro.titulo} com formas fora de ordem`);
  }
});

test('facção ganha ficha, e a proposta só chega ao Mestre', () => {
  const doJogador = fabrica(false).filter((registro) => registro.secao === 'faccoes');
  assert.deepEqual(doJogador.map((registro) => registro.titulo), ['Banco Lunar']);
  assert.equal(doJogador[0].faccao?.alcance, 'Todas as Árvores');
  const doMestre = fabrica(true).filter((registro) => registro.secao === 'faccoes');
  assert.equal(doMestre.length, 2);
  assert.equal(doMestre.find((registro) => registro.titulo === 'Vigília das Raízes')?.faccao?.proposta, true);
});

test('local aberto ganha ficha com onde fica, responsável e domínio; local trancado não entrega nada', () => {
  const locais = fabrica(true).filter((registro) => registro.secao === 'locais');
  const banco = locais.find((registro) => registro.titulo === 'Banco Lunar');
  assert.equal(banco?.local?.localizacao, 'Vazio');
  assert.equal(banco?.local?.responsavel, 'Amadheus Colona');
  const trancado = registrosDeFabrica({
    catalog: MUNDO_CATALOG.map((entrada) => (entrada.id === 'banco-lunar' ? { ...entrada, revelado: false } : entrada)),
    factions: [], isMestre: false, loreRevelado: [], loreOculto: [],
  }).find((registro) => registro.chave === 'padrao:locais:banco-lunar');
  assert.equal(trancado?.revelacao, 'rasurado');
  assert.equal(trancado?.local, undefined);
  assert.equal(trancado?.titulo, 'Registro retido');
});

test('o Alfabeto traz os 16 idiomas da tabela da lore, cada um com o povo e o criador', () => {
  const idiomas = fabrica(false).filter((registro) => registro.secao === 'glossario');
  assert.equal(idiomas.length, 16);
  const por = (titulo: string) => idiomas.find((registro) => registro.titulo === titulo);
  assert.equal(por('Romeno')?.idioma?.povo, 'Vampiros');
  assert.equal(por('Romeno')?.idioma?.criador, 'Davinor');
  assert.equal(por('Universal')?.idioma?.universal, true);
  assert.equal(por('Universal')?.subtitulo, 'Idioma de todos os povos');
  assert.equal(por('Latim')?.subtitulo, 'Idioma das Sereias');
  assert.equal(por('Libras')?.idioma?.criador, '');
  // Em ordem de alfabeto, cada um na letra do nome.
  assert.deepEqual(idiomas.map((registro) => registro.titulo), [...idiomas.map((registro) => registro.titulo)].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  assert.equal(por('Enoquiano')?.grupo, 'E');
  assert.equal(por('Ao Contrário')?.grupo, 'A');
});

test('a tabela de idiomas bate com o texto da lore e some quando o Mestre a esconde', () => {
  const lore = MUNDO_CATALOG.find((entrada) => entrada.id === 'idiomas-do-jardim');
  const descricao = String((lore?.conteudo as Record<string, unknown>).descricao);
  for (const registro of fabrica(true).filter((item) => item.secao === 'glossario')) {
    assert.ok(descricao.toLowerCase().includes(registro.titulo.toLowerCase()), `${registro.titulo} não está no texto da lore`);
    if (!registro.idioma?.universal) assert.ok(descricao.includes(registro.idioma?.povo ?? '?'), `${registro.idioma?.povo} não está no texto da lore`);
  }
  const escondido = registrosDeFabrica({ catalog: MUNDO_CATALOG, factions: [], isMestre: false, loreRevelado: [], loreOculto: ['idiomas-do-jardim'] });
  assert.equal(escondido.filter((registro) => registro.secao === 'glossario').length, 0);
});

test('toda facção oficial tem identidade própria: cor diferente das outras e forma de brasão válida', () => {
  const ids = FACCOES_DOCUMENTADAS.map((faccao) => faccao.id);
  assert.equal(ids.length, 12);
  const cores = new Set<string>();
  for (const id of ids) {
    const identidade = identidadeDe(id);
    assert.ok(identidade, `${id} sem identidade visual`);
    assert.match(identidade.rgb, /^\d+,\d+,\d+$/);
    assert.ok(identidade.forma in CAMINHO_DA_FORMA, `${id} com forma desconhecida`);
    assert.ok(!cores.has(identidade.rgb), `${id} repete a cor de outra facção`);
    cores.add(identidade.rgb);
  }
});

test('a ficha da facção usa a cor da identidade e não carrega marca de vilã', () => {
  const registros = registrosDeFabrica({
    catalog: MUNDO_CATALOG, isMestre: false, loreRevelado: [], loreOculto: [],
    factions: FACCOES_DOCUMENTADAS.filter((faccao) => faccao.estado === 'canonica'),
  }).filter((registro) => registro.secao === 'faccoes');
  assert.equal(registros.length, 12);
  for (const registro of registros) {
    assert.equal(registro.corRgb, identidadeDe(registro.origemId ?? '')?.rgb, registro.titulo);
    assert.equal(registro.faccao?.proposta, false);
    assert.equal('antagonista' in (registro.faccao ?? {}), false);
  }
  assert.equal(monograma('A Ordem'), 'OR');
});

test('toda facção tem a sede ligada ao local certo, nos dois sentidos, e a sede secreta some para o jogador', () => {
  const comFaccoes = (isMestre: boolean) => registrosDeFabrica({
    catalog: MUNDO_CATALOG, isMestre, loreRevelado: [], loreOculto: [], factions: FACCOES_DOCUMENTADAS, entities: ENTIDADES,
  });
  const doMestre = comFaccoes(true);
  const locais = doMestre.filter((registro) => registro.secao === 'locais');
  const faccoes = doMestre.filter((registro) => registro.secao === 'faccoes');
  for (const local of locais.filter((registro) => registro.local?.faccao)) {
    const id = local.local?.faccao?.id ?? '';
    const faccao = faccoes.find((registro) => registro.origemId === id);
    assert.ok(faccao, `${local.titulo} aponta para uma facção que não existe (${id})`);
    assert.equal(faccao?.faccao?.sede?.id, local.origemId, `${faccao?.titulo} não aponta de volta para ${local.titulo}`);
  }
  assert.equal(faccoes.find((registro) => registro.origemId === 'guilda-dos-cacadores')?.faccao?.sede?.titulo, 'Pharos');
  assert.equal(faccoes.find((registro) => registro.origemId === 'banco-lunar')?.faccao?.sede?.id, 'banco-lunar');

  // As três sedes escondidas (A Ordem, Culto Carmesim, Colhedores) só aparecem para o Mestre.
  const doJogador = comFaccoes(false);
  for (const id of ['galpoes-do-meio', 'casa-vermelha', 'pomar']) {
    const local = doJogador.find((registro) => registro.chave === `padrao:locais:${id}`);
    assert.equal(local?.revelacao, 'rasurado', `${id} deveria chegar rasurada ao jogador`);
    assert.equal(local?.titulo, 'Registro retido');
  }
  for (const id of ['a-ordem', 'culto-carmesim', 'colhedores-do-eden']) {
    assert.equal(doJogador.find((registro) => registro.origemId === id && registro.secao === 'faccoes')?.faccao?.sede, undefined);
  }
  assert.equal(doJogador.find((registro) => registro.chave === 'padrao:locais:pharos')?.revelacao, 'aberto');
});

test('os textos novos de facções e locais seguem o tom da casa: sem travessão e sem a antítese "não é X, é Y"', () => {
  const textos = [
    ...FACCOES_DOCUMENTADAS.map((faccao) => faccao.atuacao_publica),
    ...MUNDO_CATALOG.filter((entrada) => entrada.registro_universal === 'local' || entrada.id === 'sonhar-entre-as-arvores')
      .map((entrada) => String((entrada.conteudo as Record<string, unknown>).descricao ?? '')),
  ];
  for (const texto of textos) {
    assert.doesNotMatch(texto, /[—–]| - /, texto.slice(0, 50));
    assert.doesNotMatch(texto, /eco(a|u)?/i, texto.slice(0, 50));
    assert.doesNotMatch(texto, /não é [^.]{1,40}, (é|mas)/i, texto.slice(0, 50));
  }
  const pharos = String((MUNDO_CATALOG.find((entrada) => entrada.id === 'pharos')?.conteudo as Record<string, unknown>).descricao);
  assert.ok(pharos.split(/\s+/).length > 500, 'Pharos é um dos três locais que merecem texto longo');
  assert.doesNotMatch(pharos, /Seireitei|Sereitei|Gotei|Rukon|shinigami|Bankai|Kons[oō]|Claustro|Despedida|anéis|Ferrolho/i, 'a sede tem conceito próprio e não pode lembrar o lugar que a inspirou');
});

test('todo local de fábrica tem identidade: ícone, padrão e cor, e a sede usa a cor da própria facção', () => {
  const locais = MUNDO_CATALOG.filter((entrada) => entrada.registro_universal === 'local');
  assert.ok(locais.length >= 12);
  for (const local of locais) {
    const identidade = identidadeDeLocal(local.id);
    assert.ok(identidade, `${local.id} sem identidade visual`);
    assert.match(identidade.rgb, /^\d+,\d+,\d+$/);
    assert.ok(identidade.icone in ICONES_DE_LOCAL, `${local.id} com ícone desconhecido`);
    const faccaoId = String((local.conteudo as Record<string, unknown>).faccao ?? '');
    if (faccaoId) assert.equal(identidade.rgb, identidadeDe(faccaoId)?.rgb, `${local.id} deveria usar a cor de ${faccaoId}`);
  }
  const semFaccao = locais.filter((local) => !(local.conteudo as Record<string, unknown>).faccao).map((local) => identidadeDeLocal(local.id)?.rgb);
  assert.equal(new Set(semFaccao).size, semFaccao.length, 'locais sem facção não repetem cor');
});

test('a ficha do local trancado não entrega a cor, e o local aberto leva a dele', () => {
  const doJogador = registrosDeFabrica({ catalog: MUNDO_CATALOG, factions: [], isMestre: false, loreRevelado: [], loreOculto: [] });
  assert.equal(doJogador.find((registro) => registro.chave === 'padrao:locais:casa-vermelha')?.corRgb, undefined);
  assert.equal(doJogador.find((registro) => registro.chave === 'padrao:locais:pharos')?.corRgb, identidadeDe('guilda-dos-cacadores')?.rgb);
});

test('Ícaro lidera a Guilda e Zero lidera o Culto: o líder leva à facção e a facção ao líder, quando visíveis', () => {
  const comFaccoes = (isMestre: boolean, extra: Record<string, unknown> = {}) => registrosDeFabrica({
    catalog: MUNDO_CATALOG, isMestre, loreRevelado: [], loreOculto: [], factions: FACCOES_DOCUMENTADAS, entities: ENTIDADES, ...extra,
  });
  const faccaoDe = (lista: IRegistro[], id: string) => lista.find((registro) => registro.origemId === id && registro.secao === 'faccoes');
  const doMestre = comFaccoes(true);
  const shinji = doMestre.find((registro) => registro.origemId === 'shinji-takamori');
  assert.match(shinji?.href?.para ?? '', /secao=faccoes&registro=padrao:faccoes:guilda-dos-cacadores/);
  assert.equal(shinji?.href?.rotulo, 'Líder: Guilda dos Caçadores');
  assert.equal(faccaoDe(doMestre, 'guilda-dos-cacadores')?.faccao?.lider?.id, 'shinji-takamori');
  assert.equal(faccaoDe(doMestre, 'culto-carmesim')?.faccao?.lider?.titulo, 'Zero');
  // Escondidos até o Mestre liberar: o jogador não vê o líder nem o link.
  assert.equal(faccaoDe(comFaccoes(false), 'guilda-dos-cacadores')?.faccao?.lider, undefined);
  assert.equal(faccaoDe(comFaccoes(false, { loreRevelado: ['shinji-takamori'] }), 'guilda-dos-cacadores')?.faccao?.lider?.id, 'shinji-takamori');
});

test('a derrota de Keryx não é mais um contrato: Jota venceu em combate e puxa a energia dele para a máscara', () => {
  const todos = MUNDO_CATALOG
    .filter((entrada) => ['jota-macedo', 'keryx', 'keryx-remanescente'].includes(entrada.id))
    .map((entrada) => String((entrada.conteudo as Record<string, unknown>).descricao))
    .join(' ');
  assert.doesNotMatch(todos, /assinar um contrato|enganado pela diplomacia|depois do contrato/i);
  assert.match(todos, /primeiro ser humano a vencer uma deidade/);
  assert.match(todos, /casulo/);
  assert.match(todos, /máscara/);
});

test('os textos dos Soberanos seguem o tom, não citam mais as Cadeiras e não se contradizem sobre território', () => {
  const soberanos = MUNDO_CATALOG.filter((entrada) => (entrada.conteudo as Record<string, unknown>).soberano === 'sim');
  assert.ok(soberanos.length >= 9 && soberanos.length <= 10);
  for (const entrada of soberanos) {
    const texto = String((entrada.conteudo as Record<string, unknown>).descricao);
    assert.doesNotMatch(texto, /[—–]| - /, `${entrada.titulo}: travessão`);
    assert.doesNotMatch(texto, /\beco(a|u)?\b/i, `${entrada.titulo}: eco`);
    assert.doesNotMatch(texto, /não é [^.]{1,40}, (é|mas)/i, `${entrada.titulo}: antítese`);
    assert.doesNotMatch(texto, /Cadeira|assembleia|dos dez que|outros nove/i, `${entrada.titulo}: sobra das dez Cadeiras`);
    assert.match(String((entrada.conteudo as Record<string, unknown>).epiteto), /^Soberan[oa] d/, `${entrada.titulo}: sem Soberano de...`);
  }
  // Só um Soberano pode se dizer o único sem território.
  const semTerritorio = soberanos.filter((entrada) => /não governa um território|único .* sem território/i.test(String((entrada.conteudo as Record<string, unknown>).descricao)));
  assert.equal(semTerritorio.length, 0);
});

test('a lore do Mundo não tem travessão nem a assembleia dos dez, conceito que o autor abandonou', () => {
  const textos = (valor: unknown): string[] => (typeof valor === 'string' ? [valor] : Array.isArray(valor) ? valor.flatMap(textos) : []);
  for (const entrada of MUNDO_CATALOG) {
    const conteudo = entrada.conteudo as Record<string, unknown>;
    const visiveis = Object.entries(conteudo).filter(([chave]) => !chave.startsWith('_')).flatMap(([, valor]) => textos(valor));
    for (const texto of [entrada.titulo, ...visiveis]) {
      assert.doesNotMatch(texto, /[—–]| - /, `${entrada.tipo}:${entrada.id} tem travessão`);
      assert.doesNotMatch(texto, /assembleia/i, `${entrada.tipo}:${entrada.id} ainda fala da assembleia dos dez`);
    }
  }
});

test('Astraluna é a sede da AstraTech, e o Fruto da Comunicação leva o prata da Parley', () => {
  const doJogador = registrosDeFabrica({
    catalog: MUNDO_CATALOG, isMestre: false, loreRevelado: [], loreOculto: [], factions: FACCOES_DOCUMENTADAS, entities: ENTIDADES,
  });
  const astratech = doJogador.find((registro) => registro.secao === 'faccoes' && registro.origemId === 'astratech');
  assert.equal(astratech?.faccao?.sede?.id, 'astraluna-capital');
  assert.equal(astratech?.faccao?.sede?.titulo, 'Astraluna');
  const astraluna = doJogador.find((registro) => registro.chave === 'padrao:locais:astraluna-capital');
  assert.equal(astraluna?.revelacao, 'aberto');
  assert.equal(astraluna?.local?.faccao?.id, 'astratech');
  assert.equal(astraluna?.corRgb, identidadeDe('astratech')?.rgb);
  // Nenhuma facção universal fica sem sede.
  for (const registro of doJogador.filter((item) => item.secao === 'faccoes' && item.faccao && !item.faccao.proposta)) {
    if (['a-ordem', 'culto-carmesim', 'colhedores-do-eden'].includes(registro.origemId ?? '')) continue; // sedes retidas
    assert.ok(registro.faccao?.sede, `${registro.titulo} sem sede`);
  }
  const comunicacao = doJogador.find((registro) => registro.chave === 'padrao:artefatos:fruto-comunicacao');
  const tecnologia = doJogador.find((registro) => registro.chave === 'padrao:artefatos:fruto-tecnologia');
  assert.equal(comunicacao?.corRgb, '192,198,206');
  assert.notEqual(comunicacao?.corRgb, tecnologia?.corRgb);
});

test('o criador do idioma vem com a preposição certa, inclusive quando traz artigo', () => {
  const idiomas = fabrica(false).filter((registro) => registro.secao === 'glossario' && registro.idioma);
  assert.equal(idiomas.length, 16);
  const finlandes = idiomas.find((registro) => registro.titulo === 'Finlandês');
  assert.match(finlandes?.descricao ?? '', /Foi criado pelos Finwë\./);
  assert.match(idiomas.find((registro) => registro.titulo === 'Romeno')?.descricao ?? '', /Foi criado por Davinor\./);
});
