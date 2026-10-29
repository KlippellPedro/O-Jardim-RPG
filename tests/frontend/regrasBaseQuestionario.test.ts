import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../data/regras/condicoes-longo-prazo';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { capacidadeModificacoesRaciais } from '../../src/services/calculoService';
import { RACAS_CATALOGO } from '../../src/services/catalogoService';
import { obterFluxoNativoId } from '../../src/services/magiaService';
import { vagasLegado } from '../../src/services/progressaoFichaService';
import { fraseDaLinguaDoPovo } from '../../src/services/racaService';
import { efeitosCondicoesNoTeste } from '../../src/services/statusService';

// Rodada 1 do questionário final (docs/propostas/questionario-final.md): as
// regras base que raças e classes usavam sem existir.
const ler = (caminho: string) => readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8');
const com = (...ids: string[]) => ids.map((id) => ({ id, nome: id }));

test('as condições que as raças usavam existem, e toda condição negativa tem gravidade', () => {
  const porId = new Map(CONDICOES_OFICIAIS.map((item) => [item.id, item]));
  for (const id of ['fascinado', 'enjoado', 'invisivel']) assert.ok(porId.has(id), `faltou ${id}`);
  assert.equal(porId.get('invisivel')?.positiva, true);
  assert.ok(CONDICOES_LONGO_PRAZO.some((item) => item.id === 'surdo'), 'Surdo mora nas de longo prazo');
  const semGravidade = CONDICOES_OFICIAIS
    .filter((item) => !item.positiva && !item.gravidade)
    .map((item) => item.id)
    .sort();
  assert.deepEqual(semGravidade, ['concentrando', 'inconsciente']);
});

test('a ficha aplica Enjoado e Fascinado nos testes', () => {
  const enjoado = com('enjoado');
  assert.equal(efeitosCondicoesNoTeste(enjoado, { periciaId: 'luta', atributoId: 'forca', ataque: true }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(enjoado, { periciaId: 'acrobacia', atributoId: 'destreza' }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('fascinado'), { periciaId: 'percepcao', atributoId: 'sabedoria' }).bonus, -5);
});

test('o Livro traz as regras base novas', () => {
  const condicoes = REGRAS_OFICIAIS.condicoes.corpo;
  assert.match(condicoes, /<h3 class="regras-subtitle">Gravidade<\/h3>/);
  for (const grau of ['Leve', 'Média', 'Grave', 'Gravíssima']) assert.match(condicoes, new RegExp(`<strong>${grau}</strong>`));

  const dano = REGRAS_OFICIAIS['tipos-de-dano'].corpo;
  assert.match(dano, /Dano verdadeiro/);
  assert.match(dano, /redução de dano/);

  const combate = REGRAS_OFICIAIS.combate.corpo;
  assert.match(combate, /1d4 de impacto \+ Mod\. Força/);
  assert.match(combate, /Ver e ser visto/);
  for (const tamanho of ['Minúsculo', 'Pequeno', 'Normal', 'Grande', 'Enorme', 'Colossal']) {
    assert.match(combate, new RegExp(`<td><strong>${tamanho}</strong></td>`), `Tamanho sem ${tamanho}`);
  }

  const ferimentos = REGRAS_OFICIAIS.ferimentos.corpo;
  assert.match(ferimentos, /Tratar ferimentos/);
  assert.match(ferimentos, /Voltar da morte/);
});

test('o Médico cura de verdade, e o Socorro levanta quem caiu', () => {
  const classes = JSON.parse(ler('data/ficha/classes.json')) as Array<{ id: string; habilidades: Array<{ id: string; estagios?: Array<{ nivel: number; descricao: string }> }> }>;
  const medico = classes.find((classe) => classe.id === 'medico')!;
  const medicina = medico.habilidades.find((habilidade) => habilidade.id === 'medicina')!;
  assert.match(medicina.estagios![0].descricao, /1d6 \+ Mod\. Sabedoria/);
  const socorro = medico.habilidades.find((habilidade) => habilidade.id === 'socorro-de-emergencia')!;
  assert.match(socorro.estagios![0].descricao, /volta com 1 de Vida/);
});

// Rodada 2: DT de raça, crítico, convenções da magia e a régua de poder.
test('toda raça que manda alguém testar diz de onde sai a DT', () => {
  const pericias = new Set((JSON.parse(ler('data/ficha/pericias.json')) as { pericias: Array<{ id: string }> }).pericias.map((pericia) => pericia.id));
  const racas = JSON.parse(ler('data/ficha/racas.json')) as Array<Record<string, any>>;
  const teste = /(testa[m]?|faz(em)? (um )?teste de|passar(em)? em|falhar(em)? em) (Fortitude|Reflexos|Vontade|Percepção)/;
  const achados: string[] = [];
  for (const raca of racas) {
    const textos: Array<[string, string]> = [];
    (function juntar(no: unknown) {
      if (Array.isArray(no)) no.forEach(juntar);
      else if (no && typeof no === 'object') {
        const item = no as Record<string, unknown>;
        if (typeof item.descricao === 'string') textos.push([String(item.id), item.descricao]);
        Object.values(item).forEach(juntar);
      }
    })(raca);
    // "Depois de falhar em Vontade, rerrole" é o próprio personagem, sem alvo testando.
    const comTeste = textos.filter(([, texto]) => teste.test(texto) && !/depois de falhar em/i.test(texto));
    if (!comTeste.length) continue;
    if (!raca.dt_efeitos) {
      achados.push(`${raca.id}: manda testar e não tem DT de raça`);
      continue;
    }
    assert.ok(pericias.has(raca.dt_efeitos.pericia) || raca.dt_efeitos.pericia === 'oficio', `${raca.id}: perícia da DT não existe`);
    for (const [id, texto] of comTeste) {
      if (!/DT|Misticismo/.test(texto)) achados.push(`${raca.id}/${id}: teste sem DT`);
      if (/contra (o )?seu Carisma|Carisma contra|teste de Carisma/.test(texto)) achados.push(`${raca.id}/${id}: ainda usa Carisma`);
    }
  }
  assert.deepEqual(achados, []);
});

test('efeito de classe que alarga o crítico respeita a regra das armas', () => {
  const combate = REGRAS_OFICIAIS.combate.corpo;
  assert.match(combate, /Em arma x3 ou x4, cada passo que alargaria a margem vira \+1 dado/);
  const classes = ler('data/ficha/classes.json');
  assert.match(classes, /Golpe Certeiro e Corte Fatal são a exceção/);
  assert.match(classes, /Só em arma x2: a margem de ameaça da arma marcada/);
  assert.match(classes, /espada x2 cai em 1/);
  assert.match(classes, /em arma x3 ou x4, o crítico continua no 20 e causa \+2 dados/);
});

test('dano em área das classes dá metade a quem passa, e a régua de poder está no Guia', () => {
  const classes = JSON.parse(ler('data/ficha/classes.json')) as Array<Record<string, any>>;
  const porId = new Map<string, string>();
  (function juntar(no: unknown) {
    if (Array.isArray(no)) no.forEach(juntar);
    else if (no && typeof no === 'object') {
      const item = no as Record<string, unknown>;
      if (typeof item.id === 'string' && typeof item.descricao === 'string') porId.set(item.id, item.descricao);
      Object.values(item).forEach(juntar);
    }
  })(classes);
  for (const id of ['senhor-das-profundezas', 'chamado-das-profundezas', 'mare-profana', 'pisada', 'mina-adesiva', 'cinzas', 'fogo-magma']) {
    assert.match(porId.get(id) || '', /metade/, `${id}: dano em área sem metade no sucesso`);
  }
  assert.match(porId.get('hado-raio-branco') || '', /2d8 de dano de Essência/);
  assert.match(porId.get('kido-de-cura') || '', /Restaure 2d8 de Vida/);
  assert.match(REGRAS_OFICIAIS.classes.corpoMestre || '', /Régua para poder de dano e de cura/);
});

test('ninguém mais usa os nomes que as regras não conhecem', () => {
  const fontes = ['data/ficha/classes.json', 'data/ficha/racas.json', 'data/ficha/magias.json', 'data/loja/catalogo.json'];
  const achados: string[] = [];
  for (const fonte of fontes) {
    const texto = ler(fonte);
    for (const [padrao, motivo] of [
      [/contra todo dano(?! físico)|a todo dano(?! físico)/, 'Resistência vale por tipo; use redução de dano'],
      [/dano espiritual/, 'espiritual virou dano de Essência'],
    ] as Array<[RegExp, string]>) {
      const achado = padrao.exec(texto);
      if (achado) achados.push(`${fonte}: ${motivo}: ...${texto.slice(Math.max(0, achado.index - 40), achado.index + 30)}...`);
    }
  }
  for (const fonte of ['data/ficha/classes.json', 'data/ficha/racas.json']) {
    const texto = ler(fonte);
    for (const [padrao, motivo] of [
      [/psíquic/, 'psíquico virou dano mental'],
      [/Encantad[oa]s?\b|[Oo]fuscad/, 'use Fascinado ou o efeito escrito'],
      [/\bMiúdo\b|criatura Média|objeto Médio/, 'tamanho tem seis nomes: Minúsculo a Colossal'],
    ] as Array<[RegExp, string]>) {
      const achado = padrao.exec(texto);
      if (achado) achados.push(`${fonte}: ${motivo}: ...${texto.slice(Math.max(0, achado.index - 40), achado.index + 30)}...`);
    }
  }
  assert.deepEqual(achados, []);
});

// Rodada 3: as decisões das raças (perguntas 15 a 19, 26, 29, 30, 32 e 34).
test('as raças leves sobem até o piso, e as que não cresciam ganharam degrau', () => {
  const racas = JSON.parse(ler('data/ficha/racas.json')) as Array<Record<string, any>>;
  const porId = new Map(racas.map((raca) => [raca.id, raca]));
  const pacote = (item: Record<string, any>) => ['vida', 'mana', 'estamina'].reduce((soma, campo) => soma + (Number(item[campo]) || 0), 0);
  const topo = (id: string) => {
    const raca = porId.get(id)!;
    return pacote(raca) + (raca.estagios || []).reduce((soma: number, estagio: Record<string, any>) => soma + pacote(estagio), 0);
  };
  for (const id of ['humano', 'goblim', 'feerico', 'sereia', 'anao']) assert.equal(topo(id), 14, `${id}: topo fora do piso`);
  for (const id of ['humano', 'goblim', 'feerico']) assert.equal(porId.get(id)!.estagios.length, 3, `${id}: escada de três degraus`);
  for (const id of ['desperto', 'clone', 'anomalia', 'amalgamo', 'bruxa']) {
    assert.ok(porId.get(id)!.estagios.some((estagio: Record<string, any>) => estagio.nivel_minimo === 20), `${id}: sem degrau no 20`);
  }
  // Golem e Gigante ficam como estavam (pergunta 15, resposta C).
  assert.equal(topo('golem'), 39);
  assert.equal(topo('gigante'), 39);
});

test('o Autômato tem o pacote novo, chassi de gente e arma de dano tecnológico', () => {
  const automato = RACAS_CATALOGO.find((raca) => raca.id === 'automato')!;
  assert.equal(capacidadeModificacoesRaciais(automato, 10), 6);
  assert.equal(capacidadeModificacoesRaciais(automato, 60), 8);
  const mod = (id: string) => automato.modificacoes.find((item: { id: string }) => item.id === id);
  assert.equal(mod('corpo-macico').resistencia_fisica, 2);
  assert.equal(mod('resistente').vida_por_nivel, 1);
  assert.match(mod('pulso-estridente').descricao, /Atordoada até o fim do próximo turno/);
  assert.equal(mod('raio-inferno').usos, 1);
  assert.equal(mod('eletrificar').usos, 2);
  assert.match(mod('laser').descricao, /4d10\+4 de dano tecnológico; em sucesso, sofre metade/);
  for (const id of ['laser', 'raio-inferno', 'eletrificar']) {
    assert.match(mod(id).descricao, /dano tecnológico/, `${id}: dano da A.X.I.S`);
    assert.doesNotMatch(mod(id).descricao, /dano de (raio|fogo)/);
  }
  const bipedes = automato.variantes!.filter((item) => item.postura === 'bipede').map((item) => item.medida_m);
  assert.deepEqual(bipedes, [1, 1.8, 3, 4.5]);
  for (const id of ['bipede-pequeno', 'quadrupede-pequeno']) {
    const chassi = automato.variantes!.find((item) => item.id === id)!;
    assert.match(chassi.caracteristicas![0].descricao!, /vantagem em Furtividade e em Reflexos/);
  }
});

test('o Semideus ganha um Legado a mais, e o Domínio da Morte causa dano do Fim', () => {
  const ficha = (natureza: string) => ({
    racaId: 'divino', nivel: 1, classes: [{ classeId: 'guerreiro', nivel: 1 }], escolhaRacial: { naturezaDivinaId: natureza },
  });
  assert.equal(vagasLegado(ficha('semideus')) - vagasLegado(ficha('deus')), 1);
  const divino = RACAS_CATALOGO.find((raca) => raca.id === 'divino')!;
  const morte = divino.variantes!.find((item) => item.id === 'morte')!;
  for (const traco of morte.caracteristicas!) assert.match(traco.descricao!, /dano do Fim/, traco.id);
});

test('o Espírito natural conjura o Fluxo da própria marca', () => {
  const espirito = (varianteId: string, naturezaId: string) => ({ racaId: 'espirito', arvoreId: 'aethel', escolhaRacial: { naturezaId, varianteId } });
  assert.equal(obterFluxoNativoId(espirito('dourado', 'natural')), 'tempo');
  assert.equal(obterFluxoNativoId(espirito('preto', 'natural')), 'vazio');
  // Demônio, anjo e o Universal seguem a Árvore (Gênese é Origem).
  assert.equal(obterFluxoNativoId(espirito('demonio-ira', 'demoniaca')), 'origem');
  assert.equal(obterFluxoNativoId(espirito('anjo-paciencia', 'angelical')), 'origem');
  assert.equal(obterFluxoNativoId(espirito('branco', 'natural')), 'origem');
});

test('toda página de raça diz a língua do povo, com o nome igual ao do Alfabeto', () => {
  const idiomas = new Map((JSON.parse(ler('data/mundo/Jardim/idiomas.json')) as { entradas: Array<{ id: string; titulo: string }> }).entradas
    .map((entrada) => [entrada.id, entrada.titulo]));
  const sem = ['humano', 'mimico', 'simbionte', 'slime', 'feerico', 'auleth', 'onirico', 'divino'];
  for (const raca of RACAS_CATALOGO.filter((item) => !['entidade', 'raca-personalizada'].includes(item.id))) {
    assert.ok(Array.isArray(raca.linguas), `${raca.id}: sem o campo linguas`);
    for (const lingua of raca.linguas!) assert.equal(idiomas.get(lingua.idioma), lingua.titulo, `${raca.id}: ${lingua.idioma}`);
    if (sem.includes(raca.id)) assert.equal(raca.linguas!.length, 0, `${raca.id} fala só o Universal`);
    assert.match(fraseDaLinguaDoPovo(raca)!, /Universal/, raca.id);
  }
  const vampiro = RACAS_CATALOGO.find((raca) => raca.id === 'vampiro')!;
  assert.match(fraseDaLinguaDoPovo(vampiro)!, /^Língua do povo: Noctâr\./);
  const espirito = RACAS_CATALOGO.find((raca) => raca.id === 'espirito')!;
  assert.match(fraseDaLinguaDoPovo(espirito)!, /Anemir \(Espírito Natural\), Kharum \(Espírito Demoníaco\) e Aurelim \(Espírito Angelical\)/);
});

test('a Noite Eterna é a mesma noite no Vampiro e no Elfo', () => {
  const texto = ler('data/ficha/racas.json');
  assert.match(texto, /Uma Linhagem dos Elfos leva o mesmo nome porque nasceu da mesma noite/);
  assert.match(texto, /A noite desta Linhagem é a mesma que parou a lua de Întuneric/);
});

// Rodada 4: as decisões das classes (perguntas 22 a 25 e 35 a 38) e os achados dos relatórios.
const CLASSES = () => JSON.parse(ler('data/ficha/classes.json')) as Array<Record<string, any>>;
const daClasse = (classes: Array<Record<string, any>>, id: string) => classes.find((classe) => classe.id === id)!;
const noDaClasse = (classe: Record<string, any>, alvo: string): Record<string, any> | undefined => {
  let achado: Record<string, any> | undefined;
  (function procurar(no: unknown) {
    if (achado) return;
    if (Array.isArray(no)) no.forEach(procurar);
    else if (no && typeof no === 'object') {
      const item = no as Record<string, any>;
      if (item.id === alvo) achado = item;
      else Object.values(item).forEach(procurar);
    }
  })(classe);
  return achado;
};
const estagio = (classe: Record<string, any>, habilidade: string, nivel: number) => noDaClasse(classe, habilidade)!.estagios
  .find((item: Record<string, any>) => item.nivel === nivel);

test('as classes de fora da luta ganharam poder de combate, e o Rito Guardado chega no 5', () => {
  const classes = CLASSES();
  const poderes: Record<string, string[]> = {
    'viajante-classe': ['golpe-baixo', 'ja-sai-de-pior', 'conhece-o-terreno'],
    'guia-dimensional': ['corte-de-coordenada', 'dobra-esmagadora'],
    'pop-star': ['refrao', 'bis'],
    comerciante: ['saque-e-uso', 'demonstracao'],
    detetive: ['ja-vi-esse-golpe'],
    interceptador: ['choque-de-malha'],
  };
  for (const [classeId, ids] of Object.entries(poderes)) {
    const lista = daClasse(classes, classeId).poderes as Array<{ id: string }>;
    for (const id of ids) assert.ok(lista.some((poder) => poder.id === id), `${classeId}: falta ${id}`);
  }
  for (const [classeId, id] of [['guia-dimensional', 'corte-de-coordenada'], ['interceptador', 'choque-de-malha']]) {
    assert.match(noDaClasse(daClasse(classes, classeId), id)!.descricao, /metade/, `${id}: dano sem metade no sucesso`);
  }
  const rito = estagio(daClasse(classes, 'ritualista'), 'livro-de-rituais', 5);
  assert.equal(rito.titulo, 'Rito Guardado');
  assert.match(rito.descricao, /inclusive no meio de uma luta/);
  assert.match(REGRAS_OFICIAIS.classes.corpoMestre || '', /Classes que brilham fora da luta/);
  // O Viajante ganhou três poderes de combate: o Guia não conta quantos.
  assert.match(REGRAS_OFICIAIS.classes.corpoMestre || '', /têm poucos poderes de combate/);
});

test('o nível 20 não repete a habilidade final, e Médico e Alquimista terminam diferentes do Chef', () => {
  const classes = CLASSES();
  const descricao = (classeId: string, habilidade: string, nivel?: number) => (nivel
    ? estagio(daClasse(classes, classeId), habilidade, nivel)
    : noDaClasse(daClasse(classes, classeId), habilidade))!.descricao as string;
  assert.doesNotMatch(descricao('atirador', 'na-mira', 20), /ignora cobertura e Resistência/);
  assert.doesNotMatch(descricao('engenheiro', 'meus-filhos', 20), /6d10/);
  assert.equal(estagio(daClasse(classes, 'pirata-amaldicoado'), 'maldicao-dos-sete-mares', 20).titulo, 'Âncora Maldita');
  assert.doesNotMatch(descricao('guia-dimensional', 'cartografia-da-matriz', 20), /rota de até 1 km/);
  assert.doesNotMatch(descricao('canalizador', 'apice-do-fluxo'), /15/);
  const pacote = /metade da Vida, da Mana e da Estamina/;
  assert.match(descricao('cozinheiro', 'mesa-da-celebracao'), /metade da Vida máxima, metade da Mana máxima, metade da Estamina máxima/, 'a Mesa da Celebração fica como está');
  assert.doesNotMatch(descricao('medico', 'mestre-da-vida'), pacote);
  assert.doesNotMatch(descricao('alquimista', 'pedra-filosofal'), pacote);
  assert.doesNotMatch(descricao('alquimista', 'pedra-filosofal'), /Transmutação transforma/);
  assert.doesNotMatch(descricao('alquimista', 'grande-obra', 20), pacote);
});

test('Guardião, Lutador, Caçador, Piloto, Detetive e Devorador seguem as respostas', () => {
  const classes = CLASSES();
  const guardiao = daClasse(classes, 'guardiao');
  for (const [id, nivel] of [['muralha-de-ouro', 6], ['muralha-de-ferro', 11], ['muralha-de-diamante', 16]] as const) {
    assert.ok(noDaClasse(guardiao, id)!.pre_requisitos.includes(`Nível ${nivel} de Guardião`), id);
  }
  for (const nivel of [3, 8, 14, 20]) assert.equal(estagio(guardiao, 'provocar', nivel).usos, 'Uma vez por rodada');
  assert.match(estagio(guardiao, 'provocar', 20).descricao, /Reação para fazer um ataque/);

  assert.match(estagio(daClasse(classes, 'lutador'), 'instinto-de-combate', 10).descricao, /é de propósito: o punho bate menos/);

  const especializacao = noDaClasse(daClasse(classes, 'cacador'), 'especializacao')!;
  assert.ok(especializacao.opcoes.some((opcao: { id: string }) => opcao.id === 'humano'));
  assert.ok(especializacao.opcoes.some((opcao: { id: string }) => opcao.id === 'familia-dragao'));

  const xodo = noDaClasse(daClasse(classes, 'piloto'), 'meu-xodo')!;
  assert.match(xodo.descricao, /um veículo ou uma montaria/);
  assert.match(xodo.descricao, /Cavalgar no lugar de Pilotagem/);

  const detetive = daClasse(classes, 'detetive');
  assert.equal(detetive.categoria, 'padrao');
  assert.equal(detetive.patamar, undefined);

  assert.match(estagio(daClasse(classes, 'devorador'), 'banquete-de-poder', 1).descricao, /criatura do Bestiário[^.]*VD dela não passe do seu nível de Devorador/);
});

test('toda habilidade em estágios tem nome em cada degrau, e toda classe tem habilidade no 18', () => {
  const semTitulo: string[] = [];
  const sem18: string[] = [];
  for (const classe of CLASSES()) {
    for (const habilidade of classe.habilidades || []) {
      for (const degrau of habilidade.estagios || []) if (!degrau.titulo) semTitulo.push(`${classe.id}/${habilidade.id}/${degrau.nivel}`);
    }
    const marco = (classe.progressao || []).find((item: { nivel: number }) => item.nivel === 18);
    if (marco && !marco.recompensas.some((recompensa: { tipo: string }) => recompensa.tipo === 'habilidade' || recompensa.tipo === 'habilidade_final')) sem18.push(classe.id);
  }
  assert.deepEqual(semTitulo, []);
  assert.deepEqual(sem18, []);
});

// Rodada 5: Pecados, Virtudes, Possessão e Encarnação (docs/propostas/revisao-espirito-2026-10).
// As convenções moram na auditoria do Espírito (racialStages.test.ts); aqui ficam os espelhos.
test('a Possessão pede teste repetido, e Pecado e Virtude Absolutos são espelhos', () => {
  const espirito = RACAS_CATALOGO.find((raca) => raca.id === 'espirito')!;
  const tracos = [...espirito.variantes!, ...espirito.estagios!, ...espirito.naturezas!].flatMap((grupo) => grupo.caracteristicas || []);
  const texto = (id: string) => String(tracos.find((traco) => traco.id === id)?.descricao);
  assert.match(texto('possessao'), /repete o teste no fim de cada turno seu/);
  for (const id of ['pecado-absoluto', 'virtude-absoluta']) {
    assert.match(texto(id), /custam 0 Mana, ganham um uso a mais/, id);
    assert.match(texto(id), /a até 30 m/, id);
    assert.match(texto(id), /dobrado/, id);
  }
  for (const id of ['corpo-de-brasa-eterna', 'corpo-de-luz']) assert.match(texto(id), /Amedrontado/, id);
});

// Rodada 6: as respostas de lore (perguntas 39 a 48).
test('a lore traz as respostas do questionário, e os _o_que_falta respondidos saíram', () => {
  const entrada = (caminho: string, id: string) => {
    let achada: Record<string, any> | undefined;
    (function procurar(no: unknown) {
      if (achada) return;
      if (Array.isArray(no)) no.forEach(procurar);
      else if (no && typeof no === 'object') {
        const item = no as Record<string, any>;
        if (item.id === id) achada = item;
        else Object.values(item).forEach(procurar);
      }
    })(JSON.parse(ler(caminho)));
    return achada!;
  };
  const universais = 'data/mundo/Jardim/registros-universais.json';
  const iwagakure = entrada('data/mundo/Gênese/realidade-0-reinos.json', 'iwagakure');
  assert.match(iwagakure.conteudo.descricao, /derrotá-lo num duelo até a morte/);
  assert.equal(iwagakure._o_que_falta, undefined);
  const tribunal = entrada('data/mundo/Limiar/limiar.json', 'tribunal-de-arkarin');
  assert.match(tribunal.conteudo.descricao, /Conselho da Existência: todas as deidades/);
  assert.doesNotMatch(tribunal.conteudo.descricao, /Arauto/);
  assert.equal(tribunal._o_que_falta, undefined);
  const cataclismo = entrada('data/mundo/Gênese/realidade-0-eventos.json', 'cataclismo-do-ano-zero');
  assert.equal(cataclismo._o_que_falta, undefined);
  assert.match(cataclismo._decisao, /segredo de propósito/);
  const blanc = entrada(universais, 'blanc');
  assert.match(blanc.conteudo.descricao, /Todo espírito, de qualquer cor, começou ali/);
  assert.match(blanc.conteudo.descricao, /não serve a nenhum dos dois/);
  assert.equal(blanc._o_que_falta, 'Falta decidir se ela tem nome verdadeiro ou idade.');
  assert.equal(entrada(universais, 'ushumgal')._o_que_falta, undefined);
  // A lore trancada também vai no código do site: o texto da Circe não repete o nome do item da Loja.
  assert.match(entrada(universais, 'circe').conteudo.descricao, /Relíquia da Criação: o colar que usa até hoje/);
  assert.doesNotMatch(entrada(universais, 'circe').conteudo.descricao, /Nove Lascas/);
  for (const id of ['karnath', 'shinji-takamori', 'zero']) assert.match(entrada(universais, id)._o_que_falta, /de propósito/, id);

  // O colar existe na Loja sem entregar a dona, e o boato de Ushumgal fica na família Dragão, sem o nome.
  const colar = (JSON.parse(ler('data/loja/catalogo.json')).entradas as Array<Record<string, any>>).find((item) => item.id === 'reliquia-colar-nove-lascas')!;
  assert.equal(colar.conteudo.requer_autorizacao_mestre, true);
  assert.doesNotMatch(JSON.stringify(colar), /Circe|Jota/);
  const dragao = (JSON.parse(ler('data/bestiario/familias-v1.json')).familias as Array<Record<string, any>>).find((familia) => familia.id === 'dragao')!;
  assert.match(dragao.descricao, /parou de crescer/);
  assert.doesNotMatch(dragao.descricao, /Ushumgal/);

  const guia = REGRAS_OFICIAIS.mestre.corpo + (REGRAS_OFICIAIS.mestre.corpoMestre || '');
  assert.match(guia, /O ano da campanha/);
  assert.match(guia, /Fichas dos Soberanos/);
});
