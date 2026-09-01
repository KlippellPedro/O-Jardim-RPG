import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';

const CHAVES = Object.keys(REGRAS_OFICIAIS);
const semHtml = (corpo: string) => corpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const classesCatalogo = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
);
const racasCatalogo = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
);
const lojaCatalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
);

test('toda página do livro está inteira', () => {
  CHAVES.forEach((chave) => {
    const pagina = REGRAS_OFICIAIS[chave];
    assert.ok(pagina.categoria, `${chave}: sem categoria, some da navegação`);
    assert.ok(pagina.status.trim(), `${chave}: sem status`);
    assert.ok(pagina.resumo.trim().length >= 40, `${chave}: resumo curto demais para dizer do que a página trata`);
    assert.ok(pagina.destaques.length >= 1, `${chave}: sem destaques`);
    assert.ok(semHtml(pagina.corpo).length >= 400, `${chave}: corpo raso demais para ser uma página`);
  });
});

test('Personagem e Progressão usa as contagens atuais dos catálogos', () => {
  const classesComuns = classesCatalogo.filter((classe: any) => classe.categoria === 'padrao').length;
  const classesEspeciais = classesCatalogo.filter((classe: any) => classe.categoria === 'esquecida').length;
  const progressõesCompletas = classesCatalogo.filter((classe: any) => classe.progressao_publicada && classe.progressao?.length).length;
  const racasMecanicas = racasCatalogo.filter((raca: any) => !raca.indisponivel && raca.id !== 'raca-personalizada');
  const racasComuns = racasMecanicas.filter((raca: any) => raca.categoria === 'padrao').length;
  const racasEspeciais = racasMecanicas.filter((raca: any) => raca.categoria === 'esquecida').length;
  const frutos = lojaCatalogo.entradas.filter((item: any) => item.tipo === 'fruto-eden').length;
  const implantes = lojaCatalogo.entradas.filter((item: any) => item.tipo === 'implante').length;
  const destaquesClasses = Object.fromEntries(REGRAS_OFICIAIS.classes.destaques);
  const destaquesRacas = Object.fromEntries(REGRAS_OFICIAIS.racas.destaques);

  assert.equal(destaquesClasses.Classes, `${classesCatalogo.length} catalogadas`);
  assert.equal(destaquesClasses['Comuns / especiais'], `${classesComuns} / ${classesEspeciais}`);
  assert.equal(destaquesClasses['Progressões completas'], String(progressõesCompletas));
  assert.match(REGRAS_OFICIAIS['sistema-base'].corpoMestre || '', new RegExp(`Todas as ${classesCatalogo.length} classes`));
  assert.match(REGRAS_OFICIAIS['poderes-habilidades'].corpo, new RegExp(`As ${classesCatalogo.length} classes`));
  assert.equal(destaquesRacas['Raças mecânicas'], String(racasMecanicas.length));
  assert.equal(destaquesRacas['Comuns / especiais'], `${racasComuns} / ${racasEspeciais}`);
  assert.match(REGRAS_OFICIAIS['frutos-implantes'].corpo, new RegExp(`São ${frutos} frutos`));
  assert.match(REGRAS_OFICIAIS['frutos-implantes'].corpo, new RegExp(`São ${implantes} peças`));
});

test('Personagem e Progressão mantém conteúdo no capítulo correto e sem duplicação visual', () => {
  const regrasPageSource = readFileSync(new URL('../../src/pages/Regras/RegrasPage.tsx', import.meta.url), 'utf8');
  const gridRacasSource = readFileSync(new URL('../../src/pages/Regras/components/GridRacas.tsx', import.meta.url), 'utf8');

  assert.equal(REGRAS_OFICIAIS.xp.categoria, 'Livro do Jogador');
  assert.match(REGRAS_OFICIAIS.xp.corpo, /<details class="regras-details regras-details--xp">/);
  assert.match(REGRAS_OFICIAIS['frutos-implantes'].corpo, /<h3 class="regras-subtitle">Os três degraus de um Fruto<\/h3>/);
  assert.doesNotMatch(REGRAS_OFICIAIS['frutos-implantes'].corpo, /<h4 class="regras-subtitle">/);
  // Os três cartões de destaque no cabeçalho de cada página foram removidos a
  // pedido do Pedro (2026-08-26): os dados continuam em `destaques` para as
  // checagens de consistência abaixo, mas não aparecem mais na tela.
  assert.doesNotMatch(regrasPageSource, /topicData\.destaques\.map/);
  assert.match(regrasPageSource, /ocultarCatalogoPericias/);
  assert.match(gridRacasSource, /id: 'entidades'/);
  assert.match(gridRacasSource, /raca\.categoria !== 'padrao' && raca\.id !== 'entidade'/);
});

test('classes e raças especiais não são apresentadas como inerentemente mais fortes', () => {
  const texto = [
    REGRAS_OFICIAIS.classes.resumo,
    REGRAS_OFICIAIS.classes.corpo,
    REGRAS_OFICIAIS.classes.corpoMestre,
    REGRAS_OFICIAIS.racas.resumo,
    REGRAS_OFICIAIS.racas.corpo,
    REGRAS_OFICIAIS.racas.corpoMestre,
  ].join(' ');

  assert.doesNotMatch(texto, /(?:classe|raça|raças) especial(?:is)? (?:é|são|nasce|nascem) mais forte/i);
});

// Uma página que promete conteúdo futuro é pior que uma página curta: o leitor
// procura o que não existe. O que ainda não foi escrito fica fora do índice.
test('nenhuma página promete conteúdo que não está lá', () => {
  const promessas = /em constru[çc][ãa]o|em breve|a ser definido|placeholder|lorem ipsum/i;
  // TODO só em caixa alta: em português "todo" é palavra comum.
  const marcador = /\bTODO\b|\bFIXME\b/;
  CHAVES.forEach((chave) => {
    const corpo = REGRAS_OFICIAIS[chave].corpo;
    assert.ok(!promessas.test(corpo), `${chave}: promete conteúdo futuro no corpo`);
    assert.ok(!marcador.test(corpo), `${chave}: marcador de trabalho pendente no corpo`);
  });
});

// O livro precisa abrir para quem nunca jogou RPG. Antes de "Como Jogar", ele
// começava direto em fórmulas, e termos como DT e Grau eram usados na página 1
// sem nunca terem sido apresentados.
test('a porta de entrada existe e apresenta o vocabulário', () => {
  assert.equal(CHAVES[0], 'como-jogar', 'a primeira página do livro precisa ser a introdução');
  const abertura = REGRAS_OFICIAIS['como-jogar'];
  assert.equal(abertura.categoria, 'Livro do Jogador');

  const texto = semHtml(abertura.corpo);
  ['DT', 'Mestre', 'ficha', 'd20', 'rodada', 'turno', 'cena'].forEach((termo) => {
    assert.ok(texto.includes(termo), `a introdução não apresenta "${termo}"`);
  });

  // O glossário é o que sustenta o resto do livro poder ser direto.
  const glossario = ['DT', 'Grau', 'Cansaço', 'Sanidade', 'Condição', 'Fluxo', 'Árvore', 'Legado', 'NPC'];
  glossario.forEach((termo) => {
    assert.ok(
      new RegExp(`<td><strong>${termo}</strong></td>`).test(abertura.corpo),
      `"${termo}" é usado no livro inteiro mas não está no glossário`,
    );
  });
});

// Uma página, dois lados: a regra para o jogador e a condução para o Mestre.
// Duas páginas separadas para o mesmo assunto sempre terminam com uma delas
// desatualizada, então o lado do Mestre mora dentro da própria página.
test('toda regra tem os dois lados', () => {
  // Única exceção, e ela é uma regra em vez de uma lista de nomes: página da
  // categoria Guia do Mestre já é inteira de quem conduz, então um bloco
  // "para quem conduz a mesa" dentro dela não teria o que separar.
  const ehSoDoMestre = (chave: string) => REGRAS_OFICIAIS[chave].categoria === 'Guia do Mestre';

  const semLadoDoMestre = CHAVES.filter((chave) => !ehSoDoMestre(chave) && !REGRAS_OFICIAIS[chave].corpoMestre);
  assert.deepEqual(
    semLadoDoMestre,
    [],
    'estas páginas precisam do bloco do Mestre; o Mestre depende de todas elas em sessão',
  );

  const redundantes = CHAVES.filter((chave) => ehSoDoMestre(chave) && REGRAS_OFICIAIS[chave].corpoMestre);
  assert.deepEqual(redundantes, [], 'página do Guia do Mestre não precisa de bloco separado: ela toda já é do Mestre');
});

test('o lado do Mestre fica na mesma página e nunca sai no arquivo público', () => {
  const publico = readFileSync(new URL('../../data/regras/regras-publicas-v1.md', import.meta.url), 'utf8');

  CHAVES.forEach((chave) => {
    const pagina = REGRAS_OFICIAIS[chave];
    if (!pagina.corpoMestre) return;

    assert.ok(
      semHtml(pagina.corpoMestre).length >= 300,
      `${chave}: bloco do Mestre raso demais para valer uma seção`,
    );
    assert.notEqual(pagina.corpoMestre, pagina.corpo, `${chave}: o bloco do Mestre repete a página do jogador`);

    // Os dois lados renderizam na mesma página, um embaixo do outro. Título
    // igual nos dois faz o Mestre achar que rolou para o lugar errado.
    const titulos = (html: string) => [...html.matchAll(/regras-subtitle">([^<]+)/g)].map((achado) => achado[1]);
    const doJogadorTitulos = titulos(pagina.corpo);
    titulos(pagina.corpoMestre).forEach((titulo) => {
      assert.ok(!doJogadorTitulos.includes(titulo), `${chave}: "${titulo}" é título dos dois lados da mesma página`);
    });

    // O arquivo público alimenta bot e site aberto. Nada que seja exclusivo do
    // bloco do Mestre pode aparecer nele. Frase que o bloco repete do corpo do
    // jogador não conta: ela está no público porque o jogador a tem, não por
    // vazamento.
    const doJogador = semHtml(pagina.corpo);
    semHtml(pagina.corpoMestre)
      .split(/(?<=\.)\s+/)
      .map((frase) => frase.trim())
      .filter((frase) => frase.length >= 60 && !doJogador.includes(frase))
      .forEach((frase) => {
        assert.ok(!publico.includes(frase), `${chave}: frase exclusiva do bloco do Mestre vazou para as regras públicas`);
      });
  });

  // Bestiário e Bases são compra de jogador: precisam estar no livro dele, com
  // a calibragem de campanha guardada no bloco do Mestre.
  ['bestiario', 'bases'].forEach((chave) => {
    assert.equal(REGRAS_OFICIAIS[chave].categoria, 'Livro do Jogador', `${chave}: saiu do livro do jogador`);
  });
});

// Mecânica que existe no sistema e não tem página vira conhecimento oral: só
// quem estava na mesa no dia sabe que ela existe.
test('toda mecânica do sistema tem uma página', () => {
  const COBERTURA: Array<[string, string]> = [
    ['como-jogar', 'o que é o jogo e como se rola um teste'],
    ['criacao-personagem', 'montar um personagem'],
    ['sistema-base', 'fórmulas, nível e multiclasse'],
    ['pericias', 'testes, graus, vantagem e desvantagem'],
    ['combate', 'ações, ataques e reações'],
    ['tipos-de-dano', 'famílias de dano, elementos e ordem de aplicar Resistência'],
    ['mesa-ao-vivo', 'a sessão compartilhada, sigilo e rolagem registrada'],
    ['distancias', 'faixas de alcance'],
    ['ferimentos', 'vida negativa, Morrendo e trauma'],
    ['coreografia', 'risco declarado antes do dado'],
    ['descanso', 'recuperação e Cansaço'],
    ['condicoes', 'Sanidade, crises e condições'],
    ['aflicoes', 'veneno, doença e vício'],
    ['acoes-coletivas', 'ajudar e teste de grupo'],
    ['ataques-combinados', 'ataque sincronizado'],
    ['xp', 'progressão e recompensa'],
    ['treinar', 'subir grau de perícia'],
    ['legados', 'escolhas permanentes a cada cinco níveis'],
    ['aliados', 'criaturas e contratados que lutam com o grupo'],
    ['frutos-implantes', 'Frutos do Éden e implantes cibernéticos'],
    ['equipamentos', 'carga, armadura e resistência'],
    ['raridades-modificacoes', 'orçamento de raridade e ganho de modificação por categoria'],
    ['modificacoes-equipamentos', 'efeitos, preços e catálogo de modificações'],
    ['crafting', 'fabricar e reparar'],
    ['materiais', 'materiais especiais e preparos de classe sem burocracia'],
    ['veiculos', 'ficha, condução e tripulação veicular'],
    ['veiculos-cenas', 'perseguição, colisão e combate veicular'],
    ['veiculos-manutencao', 'reparo, manutenção e componentes veiculares'],
    ['transporte', 'custos e requisitos de viagens'],
    ['magia-fluxo', 'Fluxos, círculos, conjuração e concentração'],
    ['marcas-cicatrizes', 'preços mágicos dos círculos altos'],
    ['rituais-selos', 'rituais, selos, encantamentos e fusão'],
    ['catalogo-magico', 'magias, manifestações e formas mágicas'],
    ['classes', 'catálogo de classes'],
    ['poderes-habilidades', 'o que a classe entrega a cada nível'],
    ['racas', 'catálogo de raças'],
    ['bestiario', 'criaturas'],
    ['economia', 'moedas, câmbio e cofre'],
    ['loja', 'onde se compra e o que cada local vende'],
    ['bases', 'propriedades e instalações'],
    ['mundo-faccoes', 'prestígio, fama e organizações'],
    ['mestre', 'conduzir a mesa'],
  ];

  COBERTURA.forEach(([chave, assunto]) => {
    assert.ok(REGRAS_OFICIAIS[chave], `sem página para ${assunto} (${chave})`);
  });

  const orfas = CHAVES.filter((chave) => !COBERTURA.some(([coberta]) => coberta === chave));
  assert.deepEqual(orfas, [], 'páginas novas precisam entrar na lista de cobertura deste teste');
});
