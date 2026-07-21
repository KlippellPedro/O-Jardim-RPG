import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  aplicarAjustesAtributosRaciais,
  capacidadeModificacoesRaciais,
  calcularDerivados,
  calcularDerivadosComClasses,
  obterAjustesAtributosRaciais,
  obterAjustesPericiasRaciais,
  obterModificacoesRaciaisInstaladas,
  obterGrauPericiaEfetivo,
  obterArvoresClassePermitidas,
  obterFragmentosRaciaisConhecidos,
  obterFragmentosRaciaisExpressos,
  capacidadeMaldicoesRaciais,
  obterMaldicoesRaciaisConhecidas,
} from '../src/ficha/services/calculoService.js';
import { RECOMPENSAS_CLASSE } from '../src/ficha/config/progressao.js';
import { ARVORES } from '../src/mundo/config/arvores.js';
import { validarPacoteMestre } from '../src/regras/schemas/masterRulesSchema.js';
import { filtrarCatalogoPorArvore } from '../src/ficha/views/wizard/selecaoCatalogo.js';
import { quantidadePericiasIniciais } from '../src/ficha/views/wizard/passoTreinamento.js';
import { somarModificadores } from '../src/ficha/services/modificadoresService.js';

// Importar os módulos alterados também funciona como verificação de sintaxe e
// de caminhos relativos, sem precisar iniciar a interface no navegador.
await Promise.all([
  import('../src/ficha/services/catalogoService.js'),
  import('../src/ficha/services/personagensService.js'),
  import('../src/ficha/views/personagem/abas/abaFicha.js'),
  import('../src/ficha/views/personagem/abas/abaHabilidades.js'),
  import('../src/ficha/views/wizard/passoPrevia.js'),
  import('../src/ficha/views/wizard/passoRaca.js'),
  import('../src/ficha/views/wizard/passoTreinamento.js'),
  import('../src/ficha/views/wizard/wizardCriacao.js'),
  import('../src/regras/config/regrasOficiais.js'),
  import('../src/regras/config/topicos.js'),
  import('../src/regras/views/catalog/classesView.js'),
  import('../src/regras/views/catalog/legaciesView.js'),
  import('../src/regras/views/catalog/racesView.js'),
]);

const lerJson = async caminho => JSON.parse(await fs.readFile(
  new URL(caminho, import.meta.url),
  'utf8',
));

const classes = await lerJson('../data/ficha/classes.json');
const racas = await lerJson('../data/ficha/racas.json');
const mestre = await lerJson('../data/regras/mestre-v1.json');
const camposAdiados = [
  'habilidades',
  'poderes',
  'progressao',
  'condicoes',
  'modificadores_atributos',
  'pericias_bonus',
];

assert.equal(classes.length, 24, 'O catálogo precisa conter 24 classes.');
assert.equal(racas.length, 21, 'O catálogo precisa conter 21 raças.');
assert.ok(
  classes.every(classe => Number.isFinite(classe.vida) && Number.isFinite(classe.mana)),
  'Toda classe precisa definir Vida e Mana numéricas.',
);
assert.ok(
  classes.every(classe => classe.vida + classe.mana === 7),
  'Toda classe precisa respeitar o orçamento de 7 pontos de Vida e Mana.',
);
assert.ok(
  classes.every(classe => ['geral', 'exclusiva'].includes(classe.disponibilidade)),
  'Toda classe precisa declarar disponibilidade geral ou exclusiva.',
);
const classesGerais = classes.filter(classe => classe.disponibilidade === 'geral');
const classesExclusivas = classes.filter(classe => classe.disponibilidade === 'exclusiva');
assert.equal(classesGerais.length, 14, 'O catálogo precisa conter 14 classes gerais.');
assert.ok(
  classesGerais.every(classe => classe.arvore === null),
  'Classes gerais não podem ficar vinculadas a uma Árvore.',
);
assert.equal(
  classesExclusivas.length,
  ARVORES.length,
  'Cada Árvore precisa ter exatamente uma classe exclusiva.',
);
assert.deepEqual(
  classesExclusivas.map(classe => classe.arvore).sort(),
  ARVORES.map(arvore => arvore.id).sort(),
  'As classes exclusivas não cobrem as dez Árvores uma única vez.',
);
assert.ok(
  classesExclusivas.every(classe => classe.categoria !== 'padrao'),
  'Classes exclusivas precisam permanecer na categoria especial.',
);
assert.deepEqual(
  classes.filter(classe => classe.nome_provisorio).map(classe => classe.id).sort(),
  ['codificador', 'decodificador'],
  'Somente Codificador e Decodificador devem estar com nome provisório.',
);
ARVORES.forEach(arvore => {
  const { itens, usandoFiltro } = filtrarCatalogoPorArvore(classes, arvore.id);
  assert.equal(usandoFiltro, true, `O filtro de classes não foi usado em ${arvore.titulo}.`);
  assert.equal(itens.length, 15, `${arvore.titulo} precisa mostrar 14 gerais e 1 exclusiva.`);
  assert.equal(
    itens.filter(classe => classe.disponibilidade === 'exclusiva')[0]?.arvore,
    arvore.id,
    `${arvore.titulo} mostrou uma classe exclusiva incompatível.`,
  );
});
assert.ok(
  racas.every(raca => Number.isFinite(raca.vida) && Number.isFinite(raca.mana)),
  'Toda raça precisa definir Vida e Mana numéricas.',
);
const racasComuns = racas.filter(raca => raca.categoria === 'padrao');
const racasEspeciais = racas.filter(raca => raca.categoria !== 'padrao');
assert.equal(racasComuns.length, 12, 'O catálogo precisa conter doze raças comuns.');
assert.equal(racasEspeciais.length, 9, 'O catálogo precisa conter nove raças especiais.');
assert.ok(
  racasComuns.every(raca => raca.disponibilidade === 'geral' && raca.recursos_provisorios === false),
  'Toda raça comum precisa estar definida e disponível em todas as Árvores.',
);
assert.ok(
  racasComuns.every(raca => Array.isArray(raca.caracteristicas) && raca.caracteristicas.length > 0),
  'Toda raça comum precisa ter pelo menos uma característica própria.',
);
assert.ok(
  racasEspeciais.every(raca => raca.disponibilidade === 'restrita'
    && raca.patamar === 'conquista'
    && raca.requer_autorizacao_mestre === true
    && Array.isArray(raca.arvores)
    && raca.formas_aquisicao?.includes('criacao_autorizada')
    && raca.formas_aquisicao?.includes('transformacao_narrativa')),
  'Toda raça especial precisa declarar restrição, autorização e formas de aquisição.',
);
const paresRaciais = racasComuns
  .filter(raca => raca.id !== 'animalia')
  .map(raca => `${raca.vida}/${raca.mana}`);
assert.equal(
  new Set(paresRaciais).size,
  paresRaciais.length,
  'As raças comuns fixas não podem repetir o mesmo par de Vida e Mana.',
);
assert.ok(
  [...classes, ...racas].every(item => camposAdiados.every(campo => !(campo in item))),
  'Os catálogos ainda contêm campos mecânicos adiados.',
);
assert.equal(validarPacoteMestre(mestre), null, 'O pacote do mestre está inválido.');

const atributos = {
  forca: 15,
  destreza: 14,
  constituicao: 13,
  inteligencia: 12,
  sabedoria: 10,
  carisma: 8,
  fluxo: 7,
};
const humano = racas.find(raca => raca.id === 'humano');
const goblim = racas.find(raca => raca.id === 'goblim');
const animalia = racas.find(raca => raca.id === 'animalia');
const miceliano = racas.find(raca => raca.id === 'miceliano');
const slime = racas.find(raca => raca.id === 'slime');
const feerico = racas.find(raca => raca.id === 'feerico');
const elfo = racas.find(raca => raca.id === 'elfo');
const desperto = racas.find(raca => raca.id === 'desperto');
const auleth = racas.find(raca => raca.id === 'auleth');
const automato = racas.find(raca => raca.id === 'automato');
const clone = racas.find(raca => raca.id === 'clone');
const errante = racas.find(raca => raca.id === 'errante');
const amalgamo = racas.find(raca => raca.id === 'amalgamo');
const bruxa = racas.find(raca => raca.id === 'bruxa');
const entidade = racas.find(raca => raca.id === 'entidade');

const nivel1 = calcularDerivados(atributos, humano, 1);
assert.equal(nivel1.vida, 16, 'Vida inicial incorreta.');
assert.equal(nivel1.mana, 8, 'Mana inicial incorreta.');
assert.equal(
  calcularDerivados(atributos, goblim, 1).vida,
  15,
  'O ajuste racial de Vida não foi aplicado.',
);
assert.equal(calcularDerivados(atributos, goblim, 1).mana, 9, 'A Mana do Goblim está incorreta.');
assert.equal(calcularDerivados(atributos, goblim, 1).movimento, 13.5, 'O Movimento do Goblim está incorreto.');
assert.equal(
  calcularDerivados(atributos, animalia, 1, { varianteId: 'robusta' }).vida,
  18,
  'A Vida da Animália Robusta está incorreta.',
);
assert.equal(
  calcularDerivados(atributos, animalia, 1, { varianteId: 'mistica' }).mana,
  10,
  'A Mana da Animália Mística está incorreta.',
);
assert.equal(
  calcularDerivados(atributos, animalia, 1, { varianteId: 'agil' }).movimento,
  13.5,
  'O Movimento da Animália Ágil está incorreto.',
);
assert.deepEqual(
  [miceliano, slime, feerico].map(raca => [
    calcularDerivados(atributos, raca, 1).vida,
    calcularDerivados(atributos, raca, 1).mana,
  ]),
  [[17, 9], [19, 6], [14, 12]],
  'Os recursos das três novas raças comuns estão incorretos.',
);
assert.equal(elfo.recursos_provisorios, false, 'O pacote-base do Elfo precisa estar definido.');
assert.deepEqual(elfo.arvores, ['aethel'], 'A origem natural do Elfo precisa ser Gênese.');
assert.equal(elfo.origem_natural?.dimensao, 'Nadalon', 'A dimensão natural do Elfo está incorreta.');
assert.equal(elfo.linhagens?.length, 7, 'O Elfo precisa listar as sete Linhagens aprovadas.');
assert.deepEqual(
  elfo.linhagens.filter(linhagem => !linhagem.efeito_pendente).map(linhagem => linhagem.id),
  ['natureza', 'sombras', 'gelo', 'fogo', 'fluxo-da-origem', 'noite-eterna', 'tempestades'],
  'As sete Linhagens Élficas precisam possuir efeitos publicados.',
);
assert.ok(
  elfo.linhagens.every(linhagem => linhagem.caracteristicas?.length === 2),
  'Cada Linhagem Élfica precisa possuir uma passiva e uma manifestação.',
);
assert.ok(
  elfo.linhagens.every(linhagem => linhagem.caracteristicas[0].tipo === 'passiva'
    && linhagem.caracteristicas[1].usos === 1
    && linhagem.caracteristicas[1].recuperacao === 'cena'
    && Number.isFinite(linhagem.caracteristicas[1].custo_mana)),
  'Toda Linhagem precisa declarar passiva, uso por cena e custo de Mana.',
);
const linhagemNatureza = elfo.linhagens.find(linhagem => linhagem.id === 'natureza');
assert.equal(linhagemNatureza.caracteristicas?.length, 2, 'Natureza precisa ter passiva e manifestação.');
assert.equal(
  linhagemNatureza.caracteristicas.find(item => item.id === 'dominio-verdejante')?.opcoes?.length,
  2,
  'Domínio Verdejante precisa oferecer cura ou controle, sem combiná-los.',
);
const linhagemSombras = elfo.linhagens.find(linhagem => linhagem.id === 'sombras');
assert.equal(linhagemSombras.caracteristicas?.length, 2, 'Sombras precisa ter passiva e manifestação.');
assert.equal(
  linhagemSombras.caracteristicas.find(item => item.id === 'passo-umbral')?.alcance_m,
  24,
  'O alcance do Passo Umbral está incorreto.',
);
assert.deepEqual(
  Object.fromEntries(elfo.linhagens.map(linhagem => [
    linhagem.id,
    linhagem.caracteristicas[1].custo_mana,
  ])),
  {
    natureza: 5,
    sombras: 4,
    gelo: 5,
    fogo: 5,
    'fluxo-da-origem': 6,
    'noite-eterna': 6,
    tempestades: 6,
  },
  'Os custos das manifestações Élficas mudaram sem revisão.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais({ ...atributos, inteligencia: 20 }, elfo),
  { ...atributos, inteligencia: 24 },
  'O bônus Élfico precisa elevar somente Inteligência até 24.',
);
assert.equal(
  calcularDerivados(atributos, elfo, 1).mana,
  16,
  'A Mana do Elfo precisa usar a Inteligência racial efetiva.',
);
assert.equal(calcularDerivados(atributos, elfo, 1).vida, 18, 'A Vida inicial do Elfo está incorreta.');
assert.equal(desperto.recursos_provisorios, false, 'O pacote-base do Desperto precisa estar definido.');
assert.deepEqual(
  desperto.arvores,
  ARVORES.map(arvore => arvore.id),
  'O Desperto precisa poder retornar em qualquer Árvore.',
);
assert.deepEqual(
  [desperto.vida, desperto.mana],
  [4, 2],
  'Os ajustes iniciais de Vida e Mana do Desperto mudaram sem revisão.',
);
assert.equal(desperto.ajustes_pericias?.vontade, 4, 'Renegado da Morte precisa conceder +4 em Vontade.');
assert.equal(
  somarModificadores({ racaId: 'desperto', ajustesPericiasRaciais: desperto.ajustes_pericias }, 'pericia_bonus', 'vontade'),
  4,
  'O bônus racial de Vontade do Desperto não entrou no cálculo da ficha.',
);
assert.equal(
  desperto.caracteristicas.find(item => item.id === 'recusar-o-fim')?.custo_mana,
  6,
  'Recusar o Fim precisa custar 6 Mana.',
);
assert.equal(desperto.condicoes_pendentes, false, 'As Condições Ancestrais aprovadas não podem ficar pendentes.');
assert.deepEqual(
  desperto.condicoes_ancestrais.map(condicao => condicao.id),
  [
    'julgado-e-rejeitado',
    'juramento-inacabado',
    'chamado-dos-vivos',
    'corpo-reconstruido',
    'alma-fragmentada',
    'retorno-profano',
  ],
  'A lista de Condições Ancestrais do Desperto mudou sem revisão.',
);
assert.ok(
  desperto.condicoes_ancestrais.every(condicao => condicao.dadiva?.descricao
    && condicao.cicatriz?.descricao),
  'Toda Condição Ancestral precisa possuir uma dádiva e uma cicatriz.',
);
assert.deepEqual(
  obterAjustesPericiasRaciais(desperto, { condicaoAncestralId: 'alma-fragmentada' }),
  {},
  'Alma Fragmentada precisa remover somente o +4 racial de Vontade.',
);
assert.deepEqual(
  obterAjustesPericiasRaciais(desperto, { condicaoAncestralId: 'retorno-profano' }),
  { vontade: 4 },
  'As demais Condições precisam conservar o +4 racial de Vontade.',
);
assert.equal(auleth.recursos_provisorios, false, 'O pacote da Auleth precisa estar definido.');
assert.deepEqual(
  auleth.arvores,
  ARVORES.map(arvore => arvore.id),
  'A Auleth precisa ser uma raça especial geral.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais(atributos, auleth),
  { ...atributos, inteligencia: 14, sabedoria: 12, carisma: 5 },
  'Os ajustes raciais da Auleth estão incorretos.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais({ ...atributos, inteligencia: 20, sabedoria: 20 }, auleth),
  { ...atributos, inteligencia: 20, sabedoria: 20, carisma: 5 },
  'Inteligência e Sabedoria da Auleth não podem ultrapassar o limite natural 20.',
);
assert.equal(
  aplicarAjustesAtributosRaciais({ ...atributos, carisma: 1 }, auleth).carisma,
  1,
  'O redutor de Carisma da Auleth não pode baixar o atributo aquém de 1.',
);
assert.deepEqual(
  [calcularDerivados(atributos, auleth, 1).vida, calcularDerivados(atributos, auleth, 1).mana],
  [18, 11],
  'Os recursos iniciais da Auleth estão incorretos.',
);
assert.equal(
  quantidadePericiasIniciais({ catalogo: { racas }, racaId: 'auleth', escolhaRacial: {} }),
  12,
  'A Auleth precisa começar com doze perícias em Aprendiz.',
);
assert.equal(auleth.conhecimentos_extremos_total, 2, 'A Auleth precisa escolher dois Conhecimentos Extremos.');
assert.deepEqual(
  auleth.caracteristicas.map(item => item.id),
  ['conhecimentos-extremos', 'forma-sem-molde', 'emocao-distante'],
  'As características recuperadas da Auleth mudaram sem revisão.',
);
assert.deepEqual(
  [auleth.beneficios_criacao?.lunaris_total, auleth.beneficios_criacao?.itens_comuns_total],
  [0, 0],
  'A Auleth autorizada não começa com dinheiro ou itens materiais.',
);
assert.equal(automato.recursos_provisorios, false, 'O pacote do Autômato precisa estar definido.');
assert.deepEqual(automato.arvores, ['keryx'], 'O Autômato precisa ser exclusivo da A.X.I.S.');
assert.equal(automato.arvore, 'keryx', 'A Árvore principal do Autômato precisa ser a A.X.I.S.');
assert.equal(automato.variantes?.length, 8, 'O Autômato precisa possuir os oito chassis aprovados.');
assert.deepEqual(
  automato.variantes.map(chassi => [
    chassi.id,
    chassi.vida,
    chassi.movimento_fixo,
    chassi.dano_natural,
  ]),
  [
    ['bipede-pequeno', 3, 6, '1d6'],
    ['bipede-normal', 5, 9, '1d8'],
    ['bipede-grande', 8, 12, '2d6'],
    ['bipede-enorme', 10, 12, '3d6'],
    ['quadrupede-pequeno', 3, 9, '1d4'],
    ['quadrupede-normal', 5, 12, '1d6'],
    ['quadrupede-grande', 8, 15, '1d8'],
    ['quadrupede-enorme', 10, 15, '2d6'],
  ],
  'Os recursos físicos dos chassis mudaram sem revisão.',
);
assert.deepEqual(
  obterAjustesAtributosRaciais(automato, { varianteId: 'bipede-normal' }),
  { forca: 2, destreza: 1 },
  'Os ajustes do chassi bípede normal não foram recuperados.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais(atributos, automato, { varianteId: 'bipede-normal' }),
  { ...atributos, forca: 17, destreza: 15 },
  'O chassi bípede normal não ajustou Força e Destreza.',
);
assert.deepEqual(
  calcularDerivados(atributos, automato, 1, { varianteId: 'bipede-normal' }),
  { vida: 23, mana: 8, movimento: 9, defesaNatural: 12, iniciativa: 12 },
  'O exemplo aprovado do chassi bípede normal não fecha.',
);
const atributosQuadrupedePequeno = {
  ...atributos,
  forca: 12,
  destreza: 15,
  constituicao: 14,
  inteligencia: 13,
};
assert.deepEqual(
  calcularDerivados(
    atributosQuadrupedePequeno,
    automato,
    1,
    { varianteId: 'quadrupede-pequeno' },
  ),
  { vida: 15, mana: 8, movimento: 9, defesaNatural: 14, iniciativa: 14 },
  'O exemplo aprovado do chassi quadrúpede pequeno não fecha.',
);
assert.deepEqual(
  calcularDerivados(atributos, automato, 1, { varianteId: 'bipede-enorme' }),
  { vida: 32, mana: 8, movimento: 12, defesaNatural: 11, iniciativa: 11 },
  'O exemplo aprovado do chassi bípede enorme não fecha.',
);
assert.deepEqual(
  [1, 4, 6, 20].map(nivel => capacidadeModificacoesRaciais(automato, nivel)),
  [1, 3, 4, 11],
  'A capacidade de modificações do núcleo está incorreta.',
);
assert.deepEqual(
  [
    automato.modificacoes.filter(item => item.categoria === 'passiva').length,
    automato.modificacoes.filter(item => item.categoria === 'ativa').length,
  ],
  [10, 8],
  'O Autômato precisa manter dez modificações passivas e oito ativas.',
);
assert.ok(
  automato.modificacoes.filter(item => item.categoria === 'ativa').every(item =>
    item.passivas_exigidas === 3
      && Number.isFinite(item.custo_mana)
      && item.tipo
      && item.descricao),
  'Toda modificação ativa precisa declarar passivas, custo, ação e efeito.',
);
const configuracaoNivel6 = {
  varianteId: 'bipede-normal',
  modificacoesIds: ['blindagem', 'combatente', 'compartimento-de-carga', 'raio-inferno'],
};
assert.deepEqual(
  obterModificacoesRaciaisInstaladas(automato, configuracaoNivel6, 6).map(item => item.id),
  configuracaoNivel6.modificacoesIds,
  'O primeiro conjunto com três passivas e uma ativa precisa funcionar no nível 6.',
);
assert.deepEqual(
  obterModificacoesRaciaisInstaladas(automato, configuracaoNivel6, 4).map(item => item.id),
  ['blindagem', 'combatente', 'compartimento-de-carga'],
  'A capacidade do nível 4 não pode aceitar uma quarta modificação ativa.',
);
assert.deepEqual(
  calcularDerivados(atributos, automato, 12, {
    varianteId: 'bipede-normal',
    modificacoesIds: ['blindagem', 'escudo', 'rodas'],
  }),
  { vida: 23, mana: 8, movimento: 18, defesaNatural: 25, iniciativa: 18 },
  'Blindagem, Escudo e Rodas não entraram corretamente nos cálculos.',
);
assert.equal(
  calcularDerivados(atributos, automato, 10, {
    varianteId: 'bipede-normal',
    modificacoesIds: ['resistente'],
  }).vida,
  43,
  'Resistente precisa conceder +2 Vida por Nível Total.',
);
assert.equal(clone.recursos_provisorios, false, 'O pacote do Clone precisa estar definido.');
assert.deepEqual(
  clone.arvores,
  ['aethel', 'ousias', 'keryx', 'haemus', 'mulher-carmesim'],
  'As cinco origens compatíveis do Clone mudaram sem revisão.',
);
assert.deepEqual(
  obterAjustesAtributosRaciais(clone, {
    atributosRaciais: ['inteligencia', 'sabedoria', 'inteligencia'],
  }),
  { inteligencia: 2, sabedoria: 2 },
  'Matriz Aperfeiçoada precisa aceitar somente dois atributos diferentes.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais(
    { ...atributos, inteligencia: 19, sabedoria: 20 },
    clone,
    { atributosRaciais: ['inteligencia', 'sabedoria'] },
  ),
  { ...atributos, inteligencia: 20, sabedoria: 20 },
  'Matriz Aperfeiçoada não pode ultrapassar o limite natural 20.',
);
assert.deepEqual(
  calcularDerivados(atributos, clone, 1, {
    varianteId: 'replica-perfeita',
    atributosRaciais: ['inteligencia', 'sabedoria'],
  }),
  { vida: 19, mana: 14, movimento: 12, defesaNatural: 12, iniciativa: 12 },
  'Os recursos iniciais aprovados do Clone não fecham.',
);
assert.equal(
  calcularDerivados(atributos, clone, 10, {
    varianteId: 'organismo-otimizado',
    atributosRaciais: ['inteligencia', 'sabedoria'],
  }).vida,
  29,
  'Organismo Otimizado precisa conceder +1 Vida por Nível Total.',
);
assert.deepEqual(
  clone.variantes.map(projeto => projeto.id),
  ['replica-perfeita', 'arquivo-vivo', 'organismo-otimizado', 'serie-continua'],
  'Os quatro Projetos de Clonagem mudaram sem revisão.',
);
assert.equal(
  obterGrauPericiaEfetivo({
    racaId: 'clone',
    nivel: 3,
    pericias: { conhecimento: 'aprendiz' },
    escolhaRacial: { varianteId: 'arquivo-vivo', periciasProjeto: ['conhecimento'] },
  }, 'conhecimento'),
  'treinado',
  'Arquivo Vivo precisa elevar em um o Grau de Treinamento escolhido.',
);
assert.equal(errante.recursos_provisorios, false, 'O pacote do Errante precisa estar definido.');
assert.deepEqual(
  errante.arvores,
  ARVORES.map(arvore => arvore.id),
  'O Errante precisa estar disponível para conversão em todas as Árvores.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais(
    { ...atributos, inteligencia: 18 },
    errante,
    { atributosRaciais: ['inteligencia'] },
  ),
  { ...atributos, inteligencia: 20 },
  'O Atributo Marcante do Errante precisa conceder +4 sem ultrapassar 20.',
);
assert.deepEqual(
  calcularDerivados(atributos, errante, 1, { atributosRaciais: ['inteligencia'] }),
  { vida: 19, mana: 15, movimento: 12, defesaNatural: 12, iniciativa: 12 },
  'Os recursos aprovados do Errante não fecham.',
);
assert.deepEqual(
  errante.assinaturas.map(item => item.id),
  ['ofensiva', 'defensiva', 'restauradora', 'movimento', 'controle', 'transformacao'],
  'Os seis formatos da Assinatura Remanescente mudaram sem revisão.',
);
assert.deepEqual(
  obterArvoresClassePermitidas({
    racaId: 'errante',
    arvoreId: 'aperion',
    escolhaRacial: { arvoreOrigemId: 'ignis' },
  }),
  ['aperion', 'ignis'],
  'O Errante precisa acessar a Árvore atual e a Árvore de origem.',
);
assert.deepEqual(
  obterArvoresClassePermitidas({
    racaId: 'humano',
    arvoreId: 'aperion',
    escolhaRacial: { arvoreOrigemId: 'ignis' },
  }),
  ['aperion'],
  'A Dupla Proveniência não pode beneficiar outras raças.',
);
assert.equal(amalgamo.recursos_provisorios, false, 'O pacote do Amálgamo precisa estar definido.');
assert.deepEqual(
  amalgamo.arvores,
  ['aethel', 'haemus', 'ignis', 'erebus', 'mulher-carmesim'],
  'As origens naturais do Amálgamo mudaram sem revisão.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais(atributos, amalgamo),
  { ...atributos, constituicao: 15, fluxo: 9 },
  'Os ajustes de Constituição e Fluxo do Amálgamo estão incorretos.',
);
const escolhaFragmentos = {
  fragmentosConhecidosIds: ['carapaca', 'orgao-fluxo', 'massa-colossal'],
  fragmentosExpressosIds: ['carapaca', 'orgao-fluxo'],
};
assert.deepEqual(
  obterFragmentosRaciaisConhecidos(amalgamo, escolhaFragmentos).map(item => item.id),
  ['carapaca', 'orgao-fluxo', 'massa-colossal'],
  'Os Fragmentos conhecidos do Amálgamo não foram preservados.',
);
assert.deepEqual(
  obterFragmentosRaciaisExpressos(amalgamo, escolhaFragmentos).map(item => item.id),
  ['carapaca', 'orgao-fluxo'],
  'O Amálgamo precisa manter somente Fragmentos conhecidos como expressos.',
);
assert.deepEqual(
  calcularDerivados(atributos, amalgamo, 1, escolhaFragmentos),
  { vida: 23, mana: 13, movimento: 12, defesaNatural: 15, iniciativa: 12 },
  'Carapaça e Órgão de Fluxo não entraram corretamente nos cálculos.',
);
assert.deepEqual(
  obterAjustesPericiasRaciais(amalgamo, {
    ...escolhaFragmentos,
    fragmentosExpressosIds: ['massa-colossal'],
  }),
  { fortitude: 4 },
  'Massa Colossal precisa conceder +4 em Fortitude quando expressa.',
);
assert.deepEqual(
  amalgamo.fragmentos.map(item => item.id),
  [
    'carapaca', 'predador', 'regenerador', 'alado', 'abissal',
    'membros-multiplos', 'orgao-fluxo', 'massa-colossal',
  ],
  'Os oito Fragmentos Constituintes mudaram sem revisão.',
);
assert.equal(bruxa.recursos_provisorios, false, 'O pacote da Bruxa precisa estar definido.');
assert.deepEqual(
  bruxa.arvores,
  ['ousias', 'haemus', 'ignis', 'chronus', 'erebus', 'mulher-carmesim'],
  'As origens naturais da Bruxa mudaram sem revisão.',
);
assert.deepEqual(
  aplicarAjustesAtributosRaciais(atributos, bruxa),
  { ...atributos, inteligencia: 14, fluxo: 9 },
  'Os ajustes de Inteligência e Fluxo da Bruxa estão incorretos.',
);
assert.deepEqual(
  obterAjustesPericiasRaciais(bruxa),
  { misticismo: 4 },
  'A Bruxa precisa receber +4 em Misticismo.',
);
assert.deepEqual(
  calcularDerivados(atributos, bruxa, 1, { varianteId: 'familiar' }),
  { vida: 17, mana: 15, movimento: 12, defesaNatural: 12, iniciativa: 12 },
  'Os recursos aprovados da Bruxa não fecham.',
);
assert.deepEqual(
  bruxa.variantes.map(item => item.id),
  ['familiar', 'grimorio', 'caldeirao', 'vassoura'],
  'Os quatro Instrumentos de Bruxaria mudaram sem revisão.',
);
assert.deepEqual(
  [
    capacidadeMaldicoesRaciais(bruxa, { varianteId: 'familiar' }),
    capacidadeMaldicoesRaciais(bruxa, { varianteId: 'grimorio' }),
  ],
  [3, 5],
  'O Grimório precisa aumentar de três para cinco Maldições conhecidas.',
);
const seisMaldicoes = {
  varianteId: 'grimorio',
  maldicoesConhecidasIds: bruxa.maldicoes.map(item => item.id),
};
assert.deepEqual(
  obterMaldicoesRaciaisConhecidas(bruxa, seisMaldicoes).map(item => item.id),
  bruxa.maldicoes.slice(0, 5).map(item => item.id),
  'O Grimório não pode ultrapassar cinco Maldições conhecidas.',
);
assert.deepEqual(
  obterMaldicoesRaciaisConhecidas(bruxa, {
    ...seisMaldicoes,
    varianteId: 'familiar',
  }).map(item => item.id),
  bruxa.maldicoes.slice(0, 3).map(item => item.id),
  'Os outros Instrumentos precisam limitar a Bruxa a três Maldições.',
);
assert.equal(entidade.indisponivel, true, 'A raça Entidade precisa permanecer indisponível.');
assert.equal(
  entidade.recursos_provisorios,
  true,
  'A Entidade não pode ser marcada como definida antes de receber seu pacote próprio.',
);
assert.equal(
  quantidadePericiasIniciais({ catalogo: { racas }, racaId: 'humano', escolhaRacial: {} }),
  7,
  'O Humano precisa escolher sete perícias iniciais.',
);
assert.equal(
  quantidadePericiasIniciais({ catalogo: { racas }, racaId: 'goblim', escolhaRacial: {} }),
  6,
  'Raças sem Adaptabilidade precisam escolher seis perícias iniciais.',
);

ARVORES.forEach(arvore => {
  const { itens } = filtrarCatalogoPorArvore(racas, arvore.id);
  assert.equal(
    itens.filter(raca => raca.disponibilidade === 'geral').length,
    12,
    `${arvore.titulo} precisa mostrar as doze raças comuns.`,
  );
  const especiaisDaArvore = itens.filter(raca => raca.disponibilidade === 'restrita');
  const especiaisEsperadas = [
    ...(arvore.id === 'aethel' ? ['elfo'] : []),
    'desperto',
    'auleth',
    ...(arvore.id === 'keryx' ? ['automato'] : []),
    ...(['aethel', 'ousias', 'keryx', 'haemus', 'mulher-carmesim'].includes(arvore.id)
      ? ['clone']
      : []),
    'errante',
    ...(['aethel', 'haemus', 'ignis', 'erebus', 'mulher-carmesim'].includes(arvore.id)
      ? ['amalgamo']
      : []),
    ...(['ousias', 'haemus', 'ignis', 'chronus', 'erebus', 'mulher-carmesim'].includes(arvore.id)
      ? ['bruxa']
      : []),
  ];
  assert.deepEqual(
    especiaisDaArvore.map(raca => raca.id),
    especiaisEsperadas,
    `${arvore.titulo} mostrou uma raça especial incompatível.`,
  );
});

const nivel2Guerreiro = calcularDerivadosComClasses(
  atributos,
  humano,
  [{ id: 'guerreiro', nivel: 2 }],
  classes,
  2,
);
assert.equal(nivel2Guerreiro.vida, 22, 'Vida do Guerreiro no nível 2 incorreta.');
assert.equal(nivel2Guerreiro.mana, 10, 'Mana do Guerreiro no nível 2 incorreta.');
assert.equal(nivel2Guerreiro.defesaNatural, 13, 'Defesa Natural no nível 2 incorreta.');

const multiclasse = calcularDerivadosComClasses(
  atributos,
  humano,
  [{ id: 'guerreiro', nivel: 1 }, { id: 'piloto', nivel: 1 }],
  classes,
  2,
);
assert.equal(multiclasse.vida, 21, 'Vida da multiclasse incorreta.');
assert.equal(multiclasse.mana, 11, 'Mana da multiclasse incorreta.');

const constituicao15 = calcularDerivadosComClasses(
  { ...atributos, constituicao: 15 },
  humano,
  [{ id: 'guerreiro', nivel: 2 }],
  classes,
  2,
);
assert.equal(
  constituicao15.vida,
  25,
  'Alterar Constituição não recalculou toda a progressão de Vida.',
);

assert.equal(RECOMPENSAS_CLASSE.length, 21, 'A tabela precisa cobrir os níveis 1 a 20.');
assert.deepEqual(
  RECOMPENSAS_CLASSE
    .map((recompensa, nivel) => recompensa?.includes('Grau de Treinamento') ? nivel : null)
    .filter(Boolean),
  [1, 3, 7, 13, 19],
  'Os Graus de Treinamento estão em níveis diferentes dos documentados.',
);

console.log('Regras válidas: catálogos, módulos, progressão e cálculos conferidos.');
