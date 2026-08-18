import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';
import {
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  FLUXO_TEMAS,
  FUSOES_CATALOGO,
  MAGIAS_CATALOGO,
  MAGIAS_UNIVERSAIS,
  MARCAS_POR_FLUXO,
  CICATRIZES_CATALOGO,
  SIMBOLOS_DOS_SETE,
  SIMBOLOS_POR_ID,
  RITO_DOS_SETE_PECADOS_ID,
  RITO_DAS_SETE_VIRTUDES_ID,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  circuloPermitidoPorFluxo,
  cicatrizesDevidas,
  dtConjuracaoPorCirculo,
  marcasDaFicha,
  simboloDaFicha,
  simbolosDoRito,
  sortearCicatriz,
  efeitoDaMagia,
  magiaElegivelParaAprender,
  obterPerfilMagico,
  temaDoFluxo,
  variantesDaMagia,
} from '../../src/services/magiaService.ts';

const ficha = (classeId: string, nivel: number, fluxo: number, arvoreId = 'aethel') => ({
  arvoreId,
  racaId: 'humano',
  classeId,
  classes: [{ classeId, nivel }],
  nivel,
  atributosFinais: {
    forca: 10,
    destreza: 10,
    constituicao: 10,
    inteligencia: 10,
    sabedoria: 10,
    carisma: 10,
    fluxo,
  },
  pericias: { misticismo: 'aprendiz' },
  magiasConhecidasIds: [],
});

test('Fluxo libera os dez círculos nos limiares publicados', () => {
  assert.deepEqual(
    [13, 14, 17, 18, 21, 22, 49, 50].map(circuloPermitidoPorFluxo),
    [0, 1, 1, 2, 2, 3, 9, 10],
  );
});

test('DT cresce três pontos por círculo', () => {
  assert.deepEqual(
    Array.from({ length: 10 }, (_, index) => dtConjuracaoPorCirculo(index + 1)),
    [10, 13, 16, 19, 22, 25, 28, 31, 34, 37],
  );
});

test('os onze Fluxos usam a paleta canônica de suas Árvores', () => {
  assert.deepEqual(Object.keys(FLUXO_TEMAS).sort(), FLUXOS_CATALOGO.map((fluxo) => fluxo.id).sort());
  assert.equal(temaDoFluxo('origem').base, '#d6789c');
  assert.equal(temaDoFluxo('vazio').base, '#221e28');
  assert.equal(temaDoFluxo('fim').base, '#861c30');
  assert.equal(temaDoFluxo('tecnologia').base, '#35d8ec');
  assert.notEqual(temaDoFluxo('comunicacao').base, temaDoFluxo('tecnologia').base);
});

test('Canalizador combina limite da classe e do Fluxo sem somar metade do nível', () => {
  const nivel5 = obterPerfilMagico(ficha('canalizador', 5, 18));
  assert.equal(nivel5.circuloDaFonte, 4);
  assert.equal(nivel5.circuloDoFluxo, 2);
  assert.equal(nivel5.circuloMaximo, 2);
  assert.equal(nivel5.vagasConhecidas, 4);
  assert.equal(nivel5.bonusConjuracao, 6);
  assert.equal(nivel5.dtMagia, 13);

  const nivel20 = obterPerfilMagico(ficha('canalizador', 20, 50));
  assert.equal(nivel20.circuloMaximo, 10);
  assert.equal(nivel20.dtMagia, 37);
  assert.equal(nivel20.bonusConjuracao, 22);
});

test('Ritualista não recebe círculos porque rituais ficam fora deles', () => {
  const perfil = obterPerfilMagico(ficha('ritualista', 20, 50));
  assert.equal(perfil.possuiFonte, false);
  assert.equal(perfil.circuloDaFonte, 0);
  assert.equal(perfil.circuloMaximo, 0);
});

test('Interceptador separa capacidade de Fluxo, DT de interceptação e fonte de conjuração', () => {
  const perfil = obterPerfilMagico({
    ...ficha('interceptador', 20, 100, 'keryx'),
    catalisadoresFluxo: { preparadosIds: ['tempo'], ativoId: 'tempo' },
  });

  assert.equal(perfil.possuiFonte, false);
  assert.equal(perfil.possuiInterceptacao, true);
  assert.equal(perfil.nivelInterceptador, 20);
  assert.equal(perfil.fluxoNativoId, 'tecnologia');
  assert.equal(perfil.circuloDoFluxo, 10);
  assert.equal(perfil.circuloDaFonte, 0);
  assert.equal(perfil.circuloMaximo, 0);
  assert.equal(perfil.dtMagia, 0);
  assert.equal(perfil.dtLimiteFluxo, 37);
  assert.equal(perfil.limiteCatalisadores, 1);
  assert.deepEqual(perfil.catalisadoresPreparadosIds, ['tempo']);
  assert.equal(perfil.catalisadorAtivoId, 'tempo');
});

test('configuração de catalisadores respeita progressão e Foco Reserva do Sintonizador', () => {
  const base = ficha('sintonizador', 15, 50);
  const perfil = obterPerfilMagico({
    ...base,
    poderesClasseSelecionados: [{ classeId: 'sintonizador', poderId: 'foco-reserva' }],
    catalisadoresFluxo: {
      preparadosIds: ['tempo', 'espaco', 'vazio', 'fim', 'tecnologia', 'inexistente'],
      ativoId: 'fim',
    },
  });

  assert.equal(perfil.limiteCatalisadores, 4);
  assert.deepEqual(perfil.catalisadoresPreparadosIds, ['tempo', 'espaco', 'vazio', 'fim']);
  assert.equal(perfil.catalisadorAtivoId, 'fim');
});

test('item equipado altera Fluxo, Misticismo e vantagens de conjuração', () => {
  const item = {
    item_id: 'foco-magico',
    titulo: 'Foco mágico',
    quantidade: 1,
    dados: {
      equipado: true,
      raridade: 'lendario',
      modificacoes: [{
        id: 'mod-foco',
        nome: 'Sintonia',
        tipo: 'especial',
        efeito: '',
        efeitos: [{ id: 'fluxo', categoria: 'atributo', alvo: 'fluxo', modo: 'bonus', valor: 4 }],
      }, {
        id: 'mod-misticismo', nome: 'Runas', tipo: 'especial', efeito: '',
        efeitos: [{ id: 'misticismo', categoria: 'pericia', alvo: 'misticismo', modo: 'bonus', valor: 3 }],
      }, {
        id: 'mod-vantagem', nome: 'Condução perfeita', tipo: 'especial', efeito: '',
        efeitos: [{ id: 'vantagem', categoria: 'pericia', alvo: 'misticismo', modo: 'vantagem', valor: 1 }],
      }],
    },
  };
  const perfil = obterPerfilMagico(ficha('canalizador', 5, 14), [item]);
  assert.equal(perfil.fluxo, 18);
  assert.equal(perfil.circuloDoFluxo, 2);
  assert.equal(perfil.bonusConjuracao, 9);
  assert.equal(perfil.vantagensConjuracao, 1);
});

// A grade de 3 por Fluxo é piso, não teto: garante que nenhum Fluxo fica órfão,
// mas não impede um Fluxo de receber uma magia a mais quando o conceito pede.
test('catálogo novo publica todas as manifestações planejadas', () => {
  assert.equal(magiasData.versao, '3.1');
  assert.equal(magiasData.regras.circulos.length, 10);
  assert.equal(FLUXOS_CATALOGO.length, 11);
  assert.ok(MAGIAS_CATALOGO.length >= 330, `catálogo encolheu: ${MAGIAS_CATALOGO.length}`);
  // Rituais universais, como os ritos dos Sete, entram por cima dos 33 da grade.
  assert.ok(RITUAIS_CATALOGO.length >= 33, `rituais encolheram: ${RITUAIS_CATALOGO.length}`);
  assert.equal(SELOS_CATALOGO.length, 33);
  assert.equal(ENCANTAMENTOS_CATALOGO.length, 33);
  assert.equal(FUSOES_CATALOGO.length, 11);
  FLUXOS_CATALOGO.forEach((fluxoCatalogo) => {
    const doFluxo = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxoCatalogo.id).length;
    assert.ok(doFluxo >= 30, `${fluxoCatalogo.titulo} ficou com ${doFluxo} magias`);
    [RITUAIS_CATALOGO, SELOS_CATALOGO, ENCANTAMENTOS_CATALOGO].forEach((catalogo) => {
      assert.equal(catalogo.filter((item) => item.fluxo === fluxoCatalogo.id).length, 3);
    });
  });
});

test('Marca aparece sozinha do 5º ao 9º e some se o círculo cair', () => {
  // Fluxo 30 e Canalizador 10 dão 5º círculo: uma Marca, a do 5º.
  const noQuinto = marcasDaFicha(ficha('canalizador', 10, 30, 'erebus'));
  assert.equal(noQuinto.length, 1);
  assert.equal(noQuinto[0].circulo, 5);

  // Fluxo 46 e Canalizador 20 dão 9º: as cinco Marcas, na ordem.
  const noNono = marcasDaFicha(ficha('canalizador', 20, 46, 'erebus'));
  assert.deepEqual(noNono.map((marca) => marca.circulo), [5, 6, 7, 8, 9]);
  noNono.forEach((marca) => {
    assert.ok(marca.bonus.trim() && marca.onus.trim(), `${marca.id} sem os dois lados`);
  });

  // Abaixo do 5º não há Marca nenhuma, e perder o círculo tira a Marca.
  assert.deepEqual(marcasDaFicha(ficha('canalizador', 5, 26, 'erebus')), []);

  // A Marca vem do Fluxo nativo: Árvores diferentes, Marcas diferentes.
  const doVazio = marcasDaFicha(ficha('canalizador', 20, 46, 'erebus'));
  const daGenese = marcasDaFicha(ficha('canalizador', 20, 46, 'aethel'));
  assert.notEqual(doVazio[0].id, daGenese[0].id);
});

test('todo Fluxo tem as cinco Marcas, e a tabela de Cicatrizes é utilizável', () => {
  FLUXOS_CATALOGO.forEach((fluxo) => {
    const escada = MARCAS_POR_FLUXO[fluxo.id];
    assert.ok(escada, `${fluxo.titulo} sem escada de Marcas`);
    assert.deepEqual(escada.map((marca) => marca.circulo), [5, 6, 7, 8, 9], fluxo.titulo);
    escada.forEach((marca) => assert.ok(marca.bonus.trim() && marca.onus.trim()));
  });

  assert.ok(CICATRIZES_CATALOGO.length >= 12);
  CICATRIZES_CATALOGO.forEach((cicatriz) => {
    assert.ok(cicatriz.bonus.trim() && cicatriz.onus.trim(), `${cicatriz.id} sem os dois lados`);
  });

  const ids = [
    ...Object.values(MARCAS_POR_FLUXO).flat().map((marca) => marca.id),
    ...CICATRIZES_CATALOGO.map((cicatriz) => cicatriz.id),
  ];
  assert.equal(new Set(ids).size, ids.length, 'id repetido entre Marcas e Cicatrizes');
});

test('Cicatriz é devida por magia de 10º círculo e o sorteio não repete', () => {
  const base = ficha('canalizador', 20, 50, 'erebus');
  assert.equal(cicatrizesDevidas(base), 0);

  const decimo = MAGIAS_CATALOGO.filter((magia) => magia.circulo === 10).slice(0, 2);
  const comDuas = { ...base, magiasConhecidasIds: decimo.map((magia) => magia.id) };
  assert.equal(cicatrizesDevidas(comDuas), 2);

  // Concessão do Mestre não gera Cicatriz: não foi conquista.
  const concedida = { ...base, magiasConcedidasIds: [decimo[0].id] };
  assert.equal(cicatrizesDevidas(concedida), 0);

  // O sorteio nunca devolve o que a ficha já carrega.
  const quaseCheia = { ...base, cicatrizesIds: CICATRIZES_CATALOGO.slice(0, -1).map((item) => item.id) };
  const sorteada = sortearCicatriz(quaseCheia);
  assert.ok(sorteada);
  assert.equal(sorteada.id, CICATRIZES_CATALOGO[CICATRIZES_CATALOGO.length - 1].id);

  const cheia = { ...base, cicatrizesIds: CICATRIZES_CATALOGO.map((item) => item.id) };
  assert.equal(sortearCicatriz(cheia), null);
});

test('os catorze Símbolos dos Sete se emparelham e cobram dos dois lados', () => {
  const pecados = SIMBOLOS_DOS_SETE.filter((item) => item.natureza === 'pecado');
  const virtudes = SIMBOLOS_DOS_SETE.filter((item) => item.natureza === 'virtude');
  assert.equal(pecados.length, 7);
  assert.equal(virtudes.length, 7);

  // "muitos buffs e debuffs": nenhum Símbolo sai com um lado só, nem com um item só.
  SIMBOLOS_DOS_SETE.forEach((simbolo) => {
    assert.ok(simbolo.bonus.length >= 2, `${simbolo.id} com poucos bônus`);
    assert.ok(simbolo.onus.length >= 2, `${simbolo.id} com poucos ônus`);
    assert.ok([...simbolo.bonus, ...simbolo.onus].every((texto) => texto.trim()));
  });

  // O par tem que fechar dos dois lados: Soberba aponta para Humildade e vice-versa.
  SIMBOLOS_DOS_SETE.forEach((simbolo) => {
    const oposto = SIMBOLOS_POR_ID.get(simbolo.opostoId);
    assert.ok(oposto, `${simbolo.id} aponta para um oposto inexistente`);
    assert.notEqual(oposto.natureza, simbolo.natureza);
    assert.equal(oposto.opostoId, simbolo.id, `${simbolo.id} e ${oposto.id} não se apontam`);
  });

  const ids = SIMBOLOS_DOS_SETE.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);

  const titulos = SIMBOLOS_DOS_SETE.map((item) => item.titulo);
  assert.equal(new Set(titulos).size, titulos.length, 'título repetido entre os catorze Símbolos');
});

test('Avareza e Temperança usam o nome popular, mas o id fica estável', () => {
  // Id não muda: uma ficha já pode ter simboloId salvo, e o servidor valida por
  // id (ver plataforma/core/character_summary.py). Só o título exibido muda.
  const ganancia = SIMBOLOS_POR_ID.get('pecado-avareza');
  const moderacao = SIMBOLOS_POR_ID.get('virtude-temperanca');
  assert.equal(ganancia?.titulo, 'Ganância');
  assert.equal(moderacao?.titulo, 'Moderação');
  assert.ok(!SIMBOLOS_DOS_SETE.some((item) => item.titulo === 'Avareza' || item.titulo === 'Temperança'));
});

test('simbolosDoRito devolve os sete Símbolos certos, e nada para outro ritual', () => {
  const doPecados = simbolosDoRito(RITO_DOS_SETE_PECADOS_ID);
  const dasVirtudes = simbolosDoRito(RITO_DAS_SETE_VIRTUDES_ID);
  assert.equal(doPecados.length, 7);
  assert.ok(doPecados.every((item) => item.natureza === 'pecado'));
  assert.equal(dasVirtudes.length, 7);
  assert.ok(dasVirtudes.every((item) => item.natureza === 'virtude'));
  assert.deepEqual(simbolosDoRito('rito-que-nao-existe'), []);
});

test('os dois ritos dos Sete são universais e exigem sete pessoas', () => {
  const ritos = RITUAIS_CATALOGO.filter((ritual) => (ritual.fluxo as string) === 'universal');
  assert.equal(ritos.length, 2);
  ritos.forEach((rito) => {
    assert.equal(rito.complexidade, 'monumental');
    assert.match(rito.requisito, /[Ss]ete participantes/);
    assert.ok(rito.falha.trim());
  });

  // Sendo universais, eles não entram na grade de três por Fluxo.
  FLUXOS_CATALOGO.forEach((fluxo) => {
    assert.equal(RITUAIS_CATALOGO.filter((r) => r.fluxo === fluxo.id).length, 3);
  });

  assert.ok(simboloDaFicha({ simboloId: 'pecado-ira' }));
  assert.equal(simboloDaFicha({ simboloId: 'nao-existe' }), null);
  assert.equal(simboloDaFicha({}), null);
});

test('cada círculo publica pelo menos duas universais', () => {
  for (let circulo = 1; circulo <= 10; circulo += 1) {
    const doCirculo = MAGIAS_UNIVERSAIS.filter((magia) => magia.circulo === circulo);
    assert.ok(doCirculo.length >= 2, `${circulo}º círculo tem ${doCirculo.length} universais`);
  }
});

test('magia universal é aprendível por qualquer Fluxo e tem as onze manifestações', () => {
  assert.ok(MAGIAS_UNIVERSAIS.length >= 20);
  assert.ok(MAGIAS_UNIVERSAIS.every((magia) => magia.fluxo === 'universal'));

  MAGIAS_UNIVERSAIS.forEach((magia) => {
    const variantes = variantesDaMagia(magia);
    assert.equal(variantes.length, FLUXOS_CATALOGO.length, `${magia.id} não cobre todos os Fluxos`);
    variantes.forEach((variante) => assert.ok(variante.efeito.trim(), `${magia.id}: ${variante.fluxo.id} vazio`));
  });

  // O Fluxo nativo decide o texto, não o acesso: duas Árvores diferentes
  // aprendem a mesma magia e leem efeitos diferentes.
  const universal = MAGIAS_UNIVERSAIS[0];
  const doVazio = efeitoDaMagia(universal, 'vazio');
  const doFisico = efeitoDaMagia(universal, 'fisico');
  assert.notEqual(doVazio, doFisico);
  assert.ok(doVazio.startsWith(universal.efeito), 'a variante soma ao texto comum');
  assert.equal(efeitoDaMagia(universal, null), universal.efeito);

  // A prova real: duas Árvores opostas aprendem a mesma universal, enquanto uma
  // magia de Fluxo alheio continua barrada para as duas.
  const clone = MAGIAS_CATALOGO.find((magia) => magia.id === 'clone-de-fluxo');
  assert.ok(clone);
  const daGenese = ficha('canalizador', 10, 34, 'aethel');
  const doAbismo = ficha('canalizador', 10, 34, 'erebus');
  assert.equal(magiaElegivelParaAprender(daGenese, clone).permitido, true);
  assert.equal(magiaElegivelParaAprender(doAbismo, clone).permitido, true);
  assert.notEqual(efeitoDaMagia(clone, 'origem'), efeitoDaMagia(clone, 'vazio'));

  const magiaDoVazio = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'vazio' && magia.circulo === 1);
  assert.ok(magiaDoVazio);
  assert.equal(magiaElegivelParaAprender(daGenese, magiaDoVazio).permitido, false);
});

test('Singularidade do Vazio é o buraco negro, e o Buraco Negro é a versão menor', () => {
  const singularidade = MAGIAS_CATALOGO.find((magia) => magia.id === 'singularidade');
  assert.ok(singularidade);
  assert.equal(singularidade.circulo, 10);
  assert.match(efeitoDaMagia(singularidade, 'vazio'), /buraco negro/i);

  // O 9º círculo do Vazio é o mesmo conceito em escala menor, e leva o nome.
  const buracoNegro = MAGIAS_CATALOGO.find((magia) => magia.id === 'abismo-aberto');
  assert.ok(buracoNegro);
  assert.equal(buracoNegro.titulo, 'Buraco Negro');
  assert.equal(buracoNegro.circulo, 9);
});

test('os títulos não caem em fôrma repetida', () => {
  const titulos = MAGIAS_CATALOGO.map((magia) => magia.titulo);

  // "Sentença X" tinha virado onze magias, e "X Absoluto" oito. Fôrma repetida
  // denuncia nome gerado em série, não nome de magia.
  const formas: Array<[string, RegExp, number]> = [
    ['Sentença', /^Sentença\b/, 2],
    ['Absoluto', /\bAbsolut[ao]\b/, 2],
    ['Canalizado', /\bCanalizad[ao]\b/, 1],
  ];
  formas.forEach(([nome, padrao, teto]) => {
    const quantos = titulos.filter((titulo) => padrao.test(titulo)).length;
    assert.ok(quantos <= teto, `${quantos} títulos com "${nome}", teto é ${teto}`);
  });

  // Nenhuma primeira palavra deve dominar o catálogo.
  const porPrimeiraPalavra = new Map<string, number>();
  titulos.forEach((titulo) => {
    const primeira = titulo.split(' ')[0];
    porPrimeiraPalavra.set(primeira, (porPrimeiraPalavra.get(primeira) || 0) + 1);
  });
  porPrimeiraPalavra.forEach((quantos, palavra) => {
    assert.ok(quantos <= 6, `"${palavra}" abre ${quantos} títulos`);
  });
});

test('Passo de Órbita anda uma casa e o Véu do Nada quebra ao agir', () => {
  const passo = MAGIAS_CATALOGO.find((magia) => magia.id === 'passo-de-orbita');
  assert.ok(passo);
  assert.equal(passo.fluxo, 'espaco');
  assert.equal(passo.circulo, 9);
  assert.match(passo.efeito, /nunca o Abismo/i);

  const veu = MAGIAS_CATALOGO.find((magia) => magia.id === 'veu-do-nada');
  assert.ok(veu);
  assert.equal(veu.fluxo, 'vazio');
  assert.equal(veu.circulo, 3);
  assert.match(veu.efeito, /encerra o efeito/i);
});

// O catálogo nasceu de uma revisão de texto corrida, e sobrou fôrma de máquina:
// toda entrada terminando em "Não X nem Y", toda falha com a mesma piada de
// dois-pontos, nenhuma explicando o que a coisa é antes de dizer a regra. Os
// tetos abaixo são folgados de propósito: a fôrma pode aparecer, só não pode
// virar padrão do catálogo.
test('toda manifestação diz o que é antes de dizer a regra', () => {
  const MANIFESTACOES = [
    ...MAGIAS_CATALOGO.map((item) => ({ ...item, tipo: 'magia' })),
    ...RITUAIS_CATALOGO.map((item) => ({ ...item, tipo: 'ritual' })),
    ...SELOS_CATALOGO.map((item) => ({ ...item, tipo: 'selo' })),
    ...ENCANTAMENTOS_CATALOGO.map((item) => ({ ...item, tipo: 'encantamento' })),
  ];

  MANIFESTACOES.forEach((item) => {
    assert.ok(item.descricao?.trim(), `${item.tipo} ${item.id} sem descrição`);
    assert.ok(item.descricao.length >= 80, `${item.tipo} ${item.id}: descrição curta demais para explicar alguma coisa`);
    assert.notEqual(item.descricao, item.efeito, `${item.tipo} ${item.id}: descrição repetindo o efeito`);
  });

  // Descrição que só parafraseia o efeito não explica nada: ela precisa trazer
  // a cena, o uso ou o preço. Vocabulário em comum é natural (as duas falam da
  // mesma magia), então o teto é folgado — o que ele barra é o eco literal.
  const conteudo = (texto: string) => new Set((texto.toLocaleLowerCase('pt-BR').match(/[a-zà-ÿ]{5,}/g) || []));
  MANIFESTACOES.forEach((item) => {
    const daDescricao = conteudo(item.descricao);
    const doEfeito = conteudo(item.efeito);
    const comuns = [...daDescricao].filter((palavra) => doEfeito.has(palavra)).length;
    const total = new Set([...daDescricao, ...doEfeito]).size;
    assert.ok(comuns / total <= 0.45, `${item.tipo} ${item.id}: descrição só repete o efeito`);
  });

  // Descrição é texto de mesa, não ficha técnica: número solto ali é sinal de
  // que a regra vazou para o lugar errado.
  const comNumeroDeRegra = MANIFESTACOES.filter((item) => /\b\d+d\d+\b|\bDT\b|\+\d/.test(item.descricao));
  assert.equal(comNumeroDeRegra.length, 0, `descrição com número de regra: ${comNumeroDeRegra.map((item) => item.id).join(', ')}`);

  // Abertura repetida é o sinal mais visível de texto gerado em série. O artigo
  // sozinho não conta: em português ele abre boa parte de qualquer frase. O que
  // denuncia é o sujeito repetido ("O conjurador...", "O alvo...") em fila.
  const proporcao = (quantos: number) => quantos / MANIFESTACOES.length;
  const porAbertura = new Map<string, number>();
  MANIFESTACOES.forEach((item) => {
    const abertura = item.descricao.toLocaleLowerCase('pt-BR').split(' ').slice(0, 2).join(' ');
    porAbertura.set(abertura, (porAbertura.get(abertura) || 0) + 1);
  });
  porAbertura.forEach((quantos, abertura) => {
    assert.ok(proporcao(quantos) <= 0.08, `"${abertura}" abre ${quantos} das ${MANIFESTACOES.length} descrições`);
  });

  // Fecho por negação ("... Não faz X nem Y.") era o jeito padrão de limitar
  // um efeito, e chegou a estar em metade dos rituais. Continua valendo onde o
  // limite importa, mas não pode voltar a ser o formato padrão do catálogo.
  const fechaNegando = MANIFESTACOES.filter((item) => /(^|\.\s)(Não|Nada|Nenhum[a]?)\b[^.]*\.$/.test(item.efeito.trim()));
  assert.ok(
    proporcao(fechaNegando.length) <= 0.08,
    `${fechaNegando.length} efeitos fecham por negação: ${fechaNegando.map((item) => item.id).join(', ')}`,
  );

  // Mesma história para a falha do ritual, que vinha quase sempre como
  // "diagnóstico curto: consequência".
  const falhaComDoisPontos = RITUAIS_CATALOGO.filter((ritual) => /^[^.:]{0,60}:\s/.test(ritual.falha));
  assert.ok(falhaComDoisPontos.length <= 8, `${falhaComDoisPontos.length} falhas com o mesmo formato: ${falhaComDoisPontos.map((item) => item.id).join(', ')}`);
});

test('rituais, selos e encantamentos cobrem várias faixas de poder', () => {
  const complexidades = new Set(RITUAIS_CATALOGO.map((ritual) => ritual.complexidade));
  assert.deepEqual([...complexidades].sort(), ['complexo', 'grandioso', 'monumental', 'simples']);
  assert.deepEqual([...new Set(SELOS_CATALOGO.map((selo) => selo.grau))].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual([...new Set(ENCANTAMENTOS_CATALOGO.map((item) => item.grau))].sort(), [1, 2, 3, 4, 5]);
});

test('a escala de DT, Mana e tempo é a mesma dentro de cada faixa', () => {
  const RITUAL = {
    simples: { dt: 15, tempo: '10 minutos', custo_mana: 4 },
    complexo: { dt: 20, tempo: '1 hora', custo_mana: 8 },
    grandioso: { dt: 25, tempo: '8 horas', custo_mana: 15 },
    monumental: { dt: 30, tempo: '3 dias', custo_mana: 25 },
  } as const;
  RITUAIS_CATALOGO.forEach((ritual) => {
    const escala = RITUAL[ritual.complexidade as keyof typeof RITUAL];
    assert.ok(escala, `${ritual.id} usa uma complexidade fora da escala`);
    assert.deepEqual(
      { dt: ritual.dt, tempo: ritual.tempo, custo_mana: ritual.custo_mana },
      escala,
      `${ritual.id} fora da escala de ${ritual.complexidade}`,
    );
    assert.ok(ritual.requisito && ritual.falha, `${ritual.id} sem requisito ou consequência de falha`);
  });

  const SELO = {
    1: { dt_inscricao: 10, custo_mana: 3, tempo: '10 minutos' },
    2: { dt_inscricao: 13, custo_mana: 6, tempo: '20 minutos' },
    3: { dt_inscricao: 16, custo_mana: 9, tempo: '40 minutos' },
    4: { dt_inscricao: 19, custo_mana: 12, tempo: '2 horas' },
    5: { dt_inscricao: 22, custo_mana: 15, tempo: '8 horas' },
  } as const;
  SELOS_CATALOGO.forEach((selo) => {
    assert.deepEqual(
      { dt_inscricao: selo.dt_inscricao, custo_mana: selo.custo_mana, tempo: selo.tempo },
      SELO[selo.grau as keyof typeof SELO],
      `${selo.id} fora da escala do grau ${selo.grau}`,
    );
    assert.ok(selo.ativacao, `${selo.id} sem condição de ativação`);
  });

  const ENCANTAMENTO = {
    1: { dt: 15, custo_mana: 4, tempo: '1 hora' },
    2: { dt: 20, custo_mana: 8, tempo: '8 horas' },
    3: { dt: 25, custo_mana: 15, tempo: '24 horas' },
    4: { dt: 30, custo_mana: 25, tempo: '3 dias' },
    5: { dt: 35, custo_mana: 40, tempo: '7 dias' },
  } as const;
  ENCANTAMENTOS_CATALOGO.forEach((item) => {
    assert.deepEqual(
      { dt: item.dt, custo_mana: item.custo_mana, tempo: item.tempo },
      ENCANTAMENTO[item.grau as keyof typeof ENCANTAMENTO],
      `${item.id} fora da escala do grau ${item.grau}`,
    );
    assert.ok(item.aplicacao, `${item.id} sem alvo de aplicação`);
  });

  // O teto de encantamento por raridade é 5, então nenhum grau pode passar disso.
  const capacidadeMaxima = Math.max(...Object.values(magiasData.regras.capacidade_encantamento_por_raridade));
  assert.equal(Math.max(...ENCANTAMENTOS_CATALOGO.map((item) => item.grau)), capacidadeMaxima);
});

test('todo Fluxo cobre os dez círculos com pelo menos três magias', () => {
  FLUXOS_CATALOGO.forEach((fluxoCatalogo) => {
    for (let circulo = 1; circulo <= 10; circulo += 1) {
      const doCirculo = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxoCatalogo.id && magia.circulo === circulo);
      assert.ok(doCirculo.length >= 3, `${fluxoCatalogo.titulo} no ${circulo}º círculo: ${doCirculo.length}`);
    }
  });
});

test('toda universal ocupa um círculo válido e nenhuma some da grade', () => {
  MAGIAS_UNIVERSAIS.forEach((magia) => {
    assert.ok(typeof magia.circulo === 'number' && magia.circulo >= 1 && magia.circulo <= 10);
    // Universal não conta para nenhum Fluxo: a grade por Fluxo ignora ela.
    assert.ok(!FLUXOS_CATALOGO.some((fluxo) => fluxo.id === (magia.fluxo as string)));
  });
});

test('a curva de Mana mantém a magia máxima como decisão, não como rotina', () => {
  const mana = magiasData.regras.circulos.map((item) => item.mana_base);
  assert.deepEqual(mana, [2, 4, 7, 10, 14, 19, 25, 32, 42, 55]);

  // Reserva de um conjurador no nível em que destrava cada círculo, tirada de
  // data/regras/balanceamento-referencia-v1.json. Se a curva ficar barata
  // demais, o topo vira rotina; cara demais, o personagem não conjura.
  const reservaPorCirculoMaximo: Array<[number, number]> = [[2, 8], [4, 24], [6, 44], [8, 64], [10, 84]];
  reservaPorCirculoMaximo.forEach(([circulo, reserva]) => {
    const conjuracoes = reserva / mana[circulo - 1];
    assert.ok(conjuracoes >= 1.4, `${circulo}º círculo: só ${conjuracoes.toFixed(1)} conjurações`);
    assert.ok(conjuracoes <= 2.6, `${circulo}º círculo: ${conjuracoes.toFixed(1)} conjurações, barato demais`);
  });
});

test('custo de Mana e fontes acompanham o círculo publicado', () => {
  const manaPorCirculo = new Map(magiasData.regras.circulos.map((item) => [item.circulo, item.mana_base]));
  MAGIAS_CATALOGO.forEach((magia) => {
    if (typeof magia.circulo !== 'number') return;
    assert.equal(magia.custo_mana, manaPorCirculo.get(magia.circulo), `${magia.id} fora do custo do círculo`);
    // Cartomancia de Fluxo para no 2º círculo, então não aparece acima dele.
    assert.equal(
      magia.fontes_permitidas.includes('Cartomancia de Fluxo'),
      magia.circulo <= 2,
      `${magia.id} com fonte incompatível`,
    );
  });
});

test('ids e títulos das magias continuam únicos', () => {
  assert.equal(new Set(MAGIAS_CATALOGO.map((magia) => magia.id)).size, MAGIAS_CATALOGO.length);
  assert.equal(new Set(MAGIAS_CATALOGO.map((magia) => magia.titulo)).size, MAGIAS_CATALOGO.length);
});

test('toda manifestação do Fim avisa sobre a autorização do Mestre', () => {
  const doFim = [
    ...MAGIAS_CATALOGO,
    ...RITUAIS_CATALOGO,
    ...SELOS_CATALOGO,
    ...ENCANTAMENTOS_CATALOGO,
  ].filter((item) => item.fluxo === 'fim');
  assert.equal(doFim.length, 39);
  doFim.forEach((item) => {
    assert.match(item.aviso_mestre || '', /autoriza[cç][aã]o do Mestre/i, `${item.id} sem aviso`);
  });
});

test('ids e títulos não colidem entre as quatro formas de manifestação', () => {
  const tudo = [...MAGIAS_CATALOGO, ...RITUAIS_CATALOGO, ...SELOS_CATALOGO, ...ENCANTAMENTOS_CATALOGO];
  assert.equal(new Set(tudo.map((item) => item.id)).size, tudo.length);
  assert.equal(new Set(tudo.map((item) => item.titulo)).size, tudo.length);
});

test('Árvore define o Fluxo nativo usado para aprender magias', () => {
  const fichaOrigem = ficha('canalizador', 1, 14, 'aethel');
  const magiaOrigem = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'origem');
  const magiaVazio = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'vazio');
  assert.ok(magiaOrigem);
  assert.ok(magiaVazio);
  assert.equal(magiaElegivelParaAprender(fichaOrigem, magiaOrigem).permitido, true);
  assert.equal(magiaElegivelParaAprender(fichaOrigem, magiaVazio).permitido, false);
});

test('Fluxo do Fim avisa sobre autorização do Mestre sem bloquear o catálogo', () => {
  const fichaFim = ficha('canalizador', 1, 14, 'mulher-carmesim');
  const magiaFim = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'fim');
  assert.ok(magiaFim);
  const perfil = obterPerfilMagico(fichaFim);
  assert.equal(perfil.fluxoNativoId, 'fim');
  assert.match(perfil.avisoFluxo || '', /autoriza[cç][aã]o do Mestre/i);
  assert.equal(magiaElegivelParaAprender(fichaFim, magiaFim).permitido, true);
});
