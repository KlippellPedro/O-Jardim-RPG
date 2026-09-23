import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'data', 'loja', 'catalogo.json');
const checkOnly = process.argv.includes('--check');

/* Base compartilhada pelas 13 Relíquias da Criação. O tier de poder usa o mesmo
 * rótulo dos Frutos do Éden e de tools/normalize-arsenal-balance.mjs, para os dois
 * scripts poderem rodar em qualquer ordem sem brigar pelo campo. */
const comum = {
  natureza: 'reliquia-criacao',
  tier_poder: 'reliquia',
  nivel_recomendado: 35,
  requisitoNivel: 35,
  nivelMinimoLoja: 4,
  requer_autorizacao_mestre: true,
};

/* Armas mantêm a ficha de combate visível na vitrine. O primeiro atributo é a linha
 * de dano no formato que o normalizador do arsenal reescreve, então rodar
 * normalize:arsenal depois daqui não muda uma vírgula. */
const arma = (dano, critico, ...tags) => [
  `${dano} de dano`, `Crítico ${critico}`, 'Relíquia da Criação', 'Arma', ...tags,
];
const artefato = (...tags) => ['Relíquia da Criação', 'Artefato', ...tags];
/* Relíquias que não são arma nem artefato: implante, armadura, escudo, bem e
 * consumível. A etiqueta de tipo vem logo depois de "Relíquia da Criação" para a
 * vitrine ler igual às outras. */
const peca = (tipo, ...tags) => ['Relíquia da Criação', tipo, ...tags];

/* Campos de uma curadoria antiga que precisam sumir da entrada quando deixam de
 * ser publicados aqui. Sem isso, um campo removido do script continuaria vivo no
 * catálogo para sempre. */
const camposDescontinuados = ['efeito', 'manifestacao'];

/* Fichas das Relíquias que ainda não existem no catálogo. O bloco só é usado na
 * criação da entrada; depois disso o JSON é a fonte da ficha de combate e a
 * curadoria abaixo continua mandando no texto. */
const novas = {
  'reliquia-arco-hou-yi': {
    tipo: 'arma',
    titulo: 'Arco de Hou Yi',
    base: {
      preco: { 'Fragmentos de Estrela': 620 },
      raridade: 'reliquia da criacao',
      dano: '8d12+12', critico: '20/x4', alcance: 'Longo', tipo_de_dano: 'Luz',
      subtipo: 'reliquia-criacao', modo: 'À distância',
      margem_ameaca: 20, multiplicador_critico: 4,
      municao_maxima: 1, municao_atual: 1,
    },
  },
  'reliquia-keraunos': {
    tipo: 'arma',
    titulo: 'Keraunos',
    base: {
      preco: { 'Fragmentos de Estrela': 700 },
      raridade: 'reliquia da criacao',
      dano: '8d12+18', critico: '20/x4', alcance: 'Longo', tipo_de_dano: 'Raio',
      subtipo: 'reliquia-criacao', modo: 'À distância',
      margem_ameaca: 20, multiplicador_critico: 4,
      municao_maxima: 1, municao_atual: 1,
    },
  },
  'reliquia-sudarshana-chakra': {
    tipo: 'arma',
    titulo: 'Sudarshana Chakra',
    base: {
      preco: { 'Fragmentos de Estrela': 580 },
      raridade: 'reliquia da criacao',
      dano: '8d12+10', critico: '20/x4', alcance: 'Médio', tipo_de_dano: 'Corte',
      subtipo: 'reliquia-criacao', modo: 'À distância',
      margem_ameaca: 20, multiplicador_critico: 4,
      municao_maxima: 1, municao_atual: 1,
    },
  },
  'reliquia-jackal': {
    tipo: 'arma',
    titulo: 'Jackal',
    base: {
      preco: { 'Fragmentos de Estrela': 420 },
      raridade: 'reliquia da criacao',
      dano: '8d12+8', critico: '20/x4', alcance: 'Médio', tipo_de_dano: 'Balístico',
      subtipo: 'reliquia-criacao', modo: 'À distância',
      margem_ameaca: 20, multiplicador_critico: 4,
      municao_maxima: 6, municao_atual: 6,
    },
  },
  'reliquia-gae-bolg': {
    tipo: 'arma',
    titulo: 'Gáe Bolg',
    base: {
      preco: { 'Fragmentos de Estrela': 540 },
      raridade: 'reliquia da criacao',
      dano: '8d12+14', critico: '19-20/x2', alcance: 'Curto/Longo', tipo_de_dano: 'Perfuração',
      subtipo: 'reliquia-criacao', modo: 'Híbrida',
      margem_ameaca: 19, multiplicador_critico: 2,
    },
  },
  'reliquia-sharur': {
    tipo: 'arma',
    titulo: 'Sharur',
    base: {
      preco: { 'Fragmentos de Estrela': 460 },
      raridade: 'reliquia da criacao',
      dano: '8d12+12', critico: '20/x4', alcance: 'Curto/Longo', tipo_de_dano: 'Impacto',
      subtipo: 'reliquia-criacao', modo: 'Híbrida',
      margem_ameaca: 20, multiplicador_critico: 4,
    },
  },
  'reliquia-kusanagi': {
    tipo: 'arma',
    titulo: 'Kusanagi no Tsurugi',
    base: {
      preco: { 'Fragmentos de Estrela': 600 },
      raridade: 'reliquia da criacao',
      dano: '8d12+14', critico: '20/x4', alcance: 'Curto/Médio', tipo_de_dano: 'Ar',
      subtipo: 'reliquia-criacao', modo: 'Híbrida',
      margem_ameaca: 20, multiplicador_critico: 4,
    },
  },
  'reliquia-durandal': {
    tipo: 'arma',
    titulo: 'Durandal',
    base: {
      preco: { 'Fragmentos de Estrela': 520 },
      raridade: 'reliquia da criacao',
      dano: '10d10+12', critico: '20/x4', alcance: 'Curto', tipo_de_dano: 'Corte',
      subtipo: 'reliquia-criacao', modo: 'Corpo a corpo',
      margem_ameaca: 20, multiplicador_critico: 4,
    },
  },
  'reliquia-egide': {
    tipo: 'artefato',
    titulo: 'Égide',
    base: {
      preco: { 'Fragmentos de Estrela': 470 },
      raridade: 'reliquia da criacao',
      subtipo: 'reliquia-criacao',
    },
  },
  'reliquia-talaria': {
    tipo: 'artefato',
    titulo: 'Talaria',
    base: {
      preco: { 'Fragmentos de Estrela': 360 },
      raridade: 'reliquia da criacao',
      subtipo: 'reliquia-criacao',
    },
  },

  'reliquia-olho-odin': {
    tipo: 'implante',
    titulo: 'Olho de Odin',
    base: { preco: { 'Fragmentos de Estrela': 500 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-braco-nuada': {
    tipo: 'implante',
    titulo: 'Braço de Prata de Nuada',
    base: { preco: { 'Fragmentos de Estrela': 440 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-coracao-ouroboros': {
    tipo: 'implante',
    titulo: 'Coração de Ouroboros',
    base: { preco: { 'Fragmentos de Estrela': 560 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-pele-nemeia': {
    tipo: 'armadura',
    titulo: 'Armadura de Nemeia',
    base: {
      preco: { 'Fragmentos de Estrela': 520 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'armadura', bonus: '+30', penalidade: '-8', material: 'Pele do Leão de Nemeia', espacos: 1,
    },
  },
  'reliquia-escudo-svalinn': {
    tipo: 'armadura',
    titulo: 'Escudo de Svalinn',
    base: {
      preco: { 'Fragmentos de Estrela': 400 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'escudo', bonus: '+20', penalidade: '-6', material: 'Placa do Escudo Solar', espacos: 1,
    },
  },
  'reliquia-ilha-avalon': {
    tipo: 'propriedade',
    titulo: 'Ilha de Avalon',
    base: {
      preco: { 'Fragmentos de Estrela': 600 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao',
      tipoPropriedade: 'base', localizacao: 'A definir com o Mestre', patamar: 'enclave',
      qualidadeQuartos: 'excelente', manutencao: 0,
      instalacoes: [
        { nome: 'Dormitório', nivel: 3, espacosOcupados: 3 },
        { nome: 'Área Médica', nivel: 3, espacosOcupados: 3 },
        { nome: 'Armazém', nivel: 2, espacosOcupados: 2 },
      ],
    },
  },
  'reliquia-nau-argo': {
    tipo: 'veiculo-completo',
    titulo: 'Nau Argo',
    base: {
      preco: { 'Fragmentos de Estrela': 480 }, raridade: 'reliquia da criacao', subtipo: 'completo',
      categoria: 'aquático', tamanho: 'grande', vidaMaxima: 200, defesa: 20, resistencia: 8,
      resistenciasPorTipo: {}, deslocamentoMetros: 60, manobrabilidade: 4, capacidade: 20,
      capacidadeIncluiTripulacao: true, coberturaOcupantes: 'total', tripulacaoMinima: 1,
      sistemasAtivosMaximos: 6, espacosBase: 4, armas: [], sistemas: [],
    },
  },

  'reliquia-armadura-aquiles': {
    tipo: 'armadura',
    titulo: 'Armadura de Aquiles',
    base: {
      preco: { 'Fragmentos de Estrela': 620 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'armadura', bonus: '+35', penalidade: '-6', material: 'Bronze forjado por Hefesto', espacos: 1,
    },
  },
  'reliquia-couraca-sigurd': {
    tipo: 'armadura',
    titulo: 'Armadura de Sigurd',
    base: {
      preco: { 'Fragmentos de Estrela': 500 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'armadura', bonus: '+26', penalidade: '-5', material: 'Sangue de Fafnir', espacos: 1,
    },
  },
  'reliquia-armadura-fenix': {
    tipo: 'armadura',
    titulo: 'Armadura de Fênix',
    base: {
      preco: { 'Fragmentos de Estrela': 560 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'armadura', bonus: '+20', penalidade: '-3', material: 'Penas incandescentes', espacos: 1,
    },
  },
  'reliquia-placas-golem-praga': {
    tipo: 'armadura',
    titulo: 'Armadura de Barro do Golem',
    base: {
      preco: { 'Fragmentos de Estrela': 400 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'armadura', bonus: '+32', penalidade: '-9', material: 'Argila do Vltava', espacos: 1,
    },
  },
  'reliquia-exocarapaca-anansi': {
    tipo: 'armadura',
    titulo: 'Armadura de Teia de Anansi',
    base: {
      preco: { 'Fragmentos de Estrela': 380 }, raridade: 'reliquia da criacao', subtipo: 'simples',
      categoria_protecao: 'armadura', bonus: '+16', penalidade: '-1', material: 'Fio de teia antiga', espacos: 1,
    },
  },
  'reliquia-escudo-ajax': {
    tipo: 'armadura',
    titulo: 'Escudo de Ajax',
    base: {
      preco: { 'Fragmentos de Estrela': 420 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'escudo', bonus: '+18', penalidade: '-5', material: 'Sete camadas de couro de boi', espacos: 1,
    },
  },
  'reliquia-escudo-solar-ra': {
    tipo: 'armadura',
    titulo: 'Escudo Solar de Rá',
    base: {
      preco: { 'Fragmentos de Estrela': 480 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'escudo', bonus: '+15', penalidade: '-4', material: 'Disco de ouro polido', espacos: 1,
    },
  },
  'reliquia-broquel-bagda': {
    tipo: 'armadura',
    titulo: 'Broquel do Ladrão de Bagdá',
    base: {
      preco: { 'Fragmentos de Estrela': 360 }, raridade: 'reliquia da criacao', subtipo: 'simples',
      categoria_protecao: 'escudo', bonus: '+8', penalidade: '0', material: 'Latão gravado', espacos: 1,
    },
  },
  'reliquia-aspis-heracles': {
    tipo: 'armadura',
    titulo: 'Aspis de Héracles',
    base: {
      preco: { 'Fragmentos de Estrela': 440 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'escudo', bonus: '+17', penalidade: '-4', material: 'Bronze cravejado', espacos: 1,
    },
  },
  'reliquia-escudo-iris': {
    tipo: 'armadura',
    titulo: 'Escudo de Íris',
    base: {
      preco: { 'Fragmentos de Estrela': 460 }, raridade: 'reliquia da criacao', subtipo: 'marcial',
      categoria_protecao: 'escudo', bonus: '+14', penalidade: '-2', material: 'Vidro em sete cores', espacos: 1,
    },
  },
  'reliquia-pernas-talos': {
    tipo: 'implante',
    titulo: 'Pernas de Talos',
    base: { preco: { 'Fragmentos de Estrela': 500 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-pulmoes-enkidu': {
    tipo: 'implante',
    titulo: 'Pulmões de Enkidu',
    base: { preco: { 'Fragmentos de Estrela': 380 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-espinha-adamastor': {
    tipo: 'implante',
    titulo: 'Espinha do Adamastor',
    base: { preco: { 'Fragmentos de Estrela': 420 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-cordas-sereia': {
    tipo: 'implante',
    titulo: 'Cordas Vocais de Sereia',
    base: { preco: { 'Fragmentos de Estrela': 440 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-olhos-argos': {
    tipo: 'implante',
    titulo: 'Olhos de Argos',
    base: { preco: { 'Fragmentos de Estrela': 460 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-jardim-hesperides': {
    tipo: 'propriedade',
    titulo: 'Jardim das Hespérides',
    base: {
      preco: { 'Fragmentos de Estrela': 560 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao',
      tipoPropriedade: 'base', localizacao: 'A definir com o Mestre', patamar: 'sede',
      qualidadeQuartos: 'maravilhosa', manutencao: 0,
      instalacoes: [
        { nome: 'Área Médica', nivel: 2, espacosOcupados: 2 },
        { nome: 'Armazém', nivel: 2, espacosOcupados: 2 },
      ],
    },
  },
  'reliquia-vale-shambhala': {
    tipo: 'propriedade',
    titulo: 'Vale de Shambhala',
    base: {
      preco: { 'Fragmentos de Estrela': 620 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao',
      tipoPropriedade: 'base', localizacao: 'A definir com o Mestre', patamar: 'complexo',
      qualidadeQuartos: 'excelente', manutencao: 0,
      instalacoes: [
        { nome: 'Dormitório', nivel: 3, espacosOcupados: 3 },
        { nome: 'Área Médica', nivel: 2, espacosOcupados: 2 },
      ],
    },
  },
  'reliquia-fragmento-atlantida': {
    tipo: 'propriedade',
    titulo: 'Fragmento de Atlântida',
    base: {
      preco: { 'Fragmentos de Estrela': 540 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao',
      tipoPropriedade: 'base', localizacao: 'A definir com o Mestre', patamar: 'sede',
      qualidadeQuartos: 'boa', manutencao: 0,
      instalacoes: [
        { nome: 'Laboratório', nivel: 2, espacosOcupados: 2 },
        { nome: 'Armazém', nivel: 2, espacosOcupados: 2 },
      ],
    },
  },
  'reliquia-fragmento-babel': {
    tipo: 'propriedade',
    titulo: 'Fragmento da Torre de Babel',
    base: {
      preco: { 'Fragmentos de Estrela': 500 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao',
      tipoPropriedade: 'base', localizacao: 'A definir com o Mestre', patamar: 'sede',
      qualidadeQuartos: 'boa', manutencao: 0,
      instalacoes: [
        { nome: 'Dormitório', nivel: 2, espacosOcupados: 2 },
        { nome: 'Segurança', nivel: 1, espacosOcupados: 1 },
      ],
    },
  },
  'reliquia-oasis-zerzura': {
    tipo: 'propriedade',
    titulo: 'Oásis de Zerzura',
    base: {
      preco: { 'Fragmentos de Estrela': 400 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao',
      tipoPropriedade: 'base', localizacao: 'A definir com o Mestre', patamar: 'posto',
      qualidadeQuartos: 'boa', manutencao: 0,
      instalacoes: [
        { nome: 'Dormitório', nivel: 1, espacosOcupados: 1 },
        { nome: 'Armazém', nivel: 1, espacosOcupados: 1 },
      ],
    },
  },
  'reliquia-carruagem-helios': {
    tipo: 'veiculo-completo',
    titulo: 'Carruagem de Hélios',
    base: {
      preco: { 'Fragmentos de Estrela': 560 }, raridade: 'reliquia da criacao', subtipo: 'completo',
      categoria: 'atmosférico', tamanho: 'médio', vidaMaxima: 90, defesa: 20, resistencia: 6,
      resistenciasPorTipo: {}, deslocamentoMetros: 120, manobrabilidade: 5, capacidade: 3,
      capacidadeIncluiTripulacao: true, coberturaOcupantes: 'nenhuma', tripulacaoMinima: 1,
      sistemasAtivosMaximos: 2, espacosBase: 0, armas: [], sistemas: [],
    },
  },
  'reliquia-vimana': {
    tipo: 'veiculo-completo',
    titulo: 'Vimana',
    base: {
      preco: { 'Fragmentos de Estrela': 600 }, raridade: 'reliquia da criacao', subtipo: 'completo',
      categoria: 'atmosférico/espacial', tamanho: 'grande', vidaMaxima: 140, defesa: 18, resistencia: 7,
      resistenciasPorTipo: {}, deslocamentoMetros: 80, manobrabilidade: 3, capacidade: 12,
      capacidadeIncluiTripulacao: true, coberturaOcupantes: 'total', tripulacaoMinima: 1,
      sistemasAtivosMaximos: 4, espacosBase: 2, armas: [], sistemas: [],
    },
  },
  'reliquia-sleipnir': {
    tipo: 'veiculo-completo',
    titulo: 'Sleipnir',
    base: {
      preco: { 'Fragmentos de Estrela': 480 }, raridade: 'reliquia da criacao', subtipo: 'completo',
      categoria: 'terrestre (montaria)', tamanho: 'grande', vidaMaxima: 110, defesa: 19, resistencia: 4,
      resistenciasPorTipo: {}, deslocamentoMetros: 90, manobrabilidade: 5, capacidade: 2,
      capacidadeIncluiTripulacao: true, coberturaOcupantes: 'nenhuma', tripulacaoMinima: 1,
      sistemasAtivosMaximos: 1, espacosBase: 0, armas: [], sistemas: [],
    },
  },
  'reliquia-naglfar': {
    tipo: 'veiculo-completo',
    titulo: 'Naglfar',
    base: {
      preco: { 'Fragmentos de Estrela': 520 }, raridade: 'reliquia da criacao', subtipo: 'completo',
      categoria: 'aquático', tamanho: 'colossal', vidaMaxima: 260, defesa: 14, resistencia: 10,
      resistenciasPorTipo: {}, deslocamentoMetros: 50, manobrabilidade: 0, capacidade: 40,
      capacidadeIncluiTripulacao: true, coberturaOcupantes: 'total', tripulacaoMinima: 2,
      sistemasAtivosMaximos: 4, espacosBase: 3, armas: [], sistemas: [],
    },
  },
  'reliquia-asas-dedalo': {
    tipo: 'veiculo-completo',
    titulo: 'Asas de Dédalo',
    base: {
      preco: { 'Fragmentos de Estrela': 380 }, raridade: 'reliquia da criacao', subtipo: 'completo',
      categoria: 'atmosférico', tamanho: 'pequeno', vidaMaxima: 30, defesa: 17, resistencia: 1,
      resistenciasPorTipo: {}, deslocamentoMetros: 70, manobrabilidade: 4, capacidade: 1,
      capacidadeIncluiTripulacao: true, coberturaOcupantes: 'nenhuma', tripulacaoMinima: 1,
      sistemasAtivosMaximos: 0, espacosBase: 0, armas: [], sistemas: [],
    },
  },
  'reliquia-bigorna-hefesto': {
    tipo: 'artefato',
    titulo: 'Bigorna de Hefesto',
    base: { preco: { 'Fragmentos de Estrela': 560 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-tear-parcas': {
    tipo: 'artefato',
    titulo: 'Tear das Parcas',
    base: { preco: { 'Fragmentos de Estrela': 600 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-martelo-wayland': {
    tipo: 'artefato',
    titulo: 'Martelo de Wayland',
    base: { preco: { 'Fragmentos de Estrela': 480 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-cinta-hipolita': {
    tipo: 'artefato',
    titulo: 'Cinta de Hipólita',
    base: { preco: { 'Fragmentos de Estrela': 500 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-fio-ariadne': {
    tipo: 'artefato',
    titulo: 'Fio de Ariadne',
    base: { preco: { 'Fragmentos de Estrela': 400 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-calice-graal': {
    tipo: 'artefato',
    titulo: 'Cálice do Graal',
    base: { preco: { 'Fragmentos de Estrela': 650 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-frasco-pandora': {
    tipo: 'artefato',
    titulo: 'Frasco de Pandora',
    base: { preco: { 'Fragmentos de Estrela': 420 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-taca-dioniso': {
    tipo: 'artefato',
    titulo: 'Taça de Dioniso',
    base: { preco: { 'Fragmentos de Estrela': 440 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-lamparina-maravilhosa': {
    tipo: 'artefato',
    titulo: 'Lamparina Maravilhosa',
    base: { preco: { 'Fragmentos de Estrela': 520 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
  'reliquia-cornucopia': {
    tipo: 'artefato',
    titulo: 'Cornucópia',
    base: { preco: { 'Fragmentos de Estrela': 460 }, raridade: 'reliquia da criacao', subtipo: 'reliquia-criacao' },
  },
};

const curadoria = {
  'reliquia-excalibur': {
    ...comum,
    atributos: arma('8d12+20', '20/x4', 'Pureza'),
    lore: 'Excalibur saiu de uma guerra que ninguém venceu e voltou sem uma gota de sangue no fio. Passado o golpe, o metal volta a refletir um amanhecer que não bate com nenhum céu do Jardim. Quem empunha a espada querendo poupar alguém acha ela leve; quem empunha para terminar o serviço sente o peso subir pelo braço.',
    descricao: 'A espada que derruba sem matar. Todo golpe dela para em 1 de Vida, por mais forte que venha.',
    ressonancia: {
      nome: 'A Lâmina que Recusa o Fim',
      efeito: 'O dano de Excalibur nunca reduz uma criatura abaixo de 1 de Vida. Se esse dano a deixaria com 0 de Vida ou menos, ela permanece com 1 de Vida e fica Inconsciente até receber ao menos 1 ponto de cura ou até o fim da cena. Esse limite não impede que outra fonte a mate depois.',
    },
  },
  'reliquia-martelo-chamas': {
    ...comum,
    atributos: arma('8d12+16', '20/x4', 'Fogo Astral'),
    lore: 'Acharam o martelo ainda quente dentro de uma estrela morta. No cabo ficou a marca funda de cinco dedos, e ela não está no mesmo lugar toda vez que alguém confere. O que ele faz com a matéria leva um instante a mais que fogo comum: primeiro o metal aceita que sempre esteve queimando, depois queima.',
    descricao: 'O malho da Dama Rubra. O fogo dele passa por quem se acha imune e amolece o que for parede.',
    ressonancia: {
      nome: 'Brasa Anterior ao Fogo',
      efeito: 'O dano do martelo é Fogo Astral. Imunidade a Fogo conta como Resistência 15 contra ele, e Resistência a Fogo continua sendo aplicada normalmente. Objetos e estruturas mundanas atingidos perdem a Resistência contra o próximo dano que sofrerem antes do fim do turno seguinte.',
    },
  },
  'reliquia-triceratops': {
    ...comum,
    atributos: arma('10d10+8', '20/x4', 'Sangue Ventrue'),
    lore: 'As três marcas talhadas na guarda contam a história inteira: sangue tomado, sangue negado, sangue herdado. A katana pertenceu a um Ventrue cujo nome foi raspado de todo registro que existia, e mesmo assim ela ainda se inclina sozinha diante de trono vazio. Com alguém ferido por perto, as três marcas passam a respirar fora de ritmo.',
    descricao: 'Katana vampírica que marca o primeiro sangue da cena e sabe onde essa presa está a 30 m de distância.',
    ressonancia: {
      nome: 'As Três Marcas',
      efeito: 'A primeira criatura com sangue atingida por Triceratops em uma cena fica Marcada até o fim da cena ou até outra criatura ser marcada. Enquanto estiver a até 30 m, o portador sabe a direção da criatura e se ela está acima ou abaixo da metade da Vida máxima; invisibilidade e disfarce não escondem essa presença, mas cobertura total ainda impede ataques.',
    },
  },
  'reliquia-mjolnir': {
    ...comum,
    atributos: arma('8d12+18', '20/x4', 'Raio'),
    modo: 'À distância',
    lore: 'Mjolnir sempre volta, e ninguém concorda de onde. Entre o arremesso e o retorno ele some por um instante dentro de um céu de tempestades velhas, e às vezes chega de volta com neve, cinza ou água salgada grudada na cabeça. O trovão que vem junto traz o nome de quem teve coragem de chamar o martelo.',
    descricao: 'O martelo que volta sozinho para a mão e, no crítico, ainda cobra um segundo alvo com um raio.',
    ressonancia: {
      nome: 'O Caminho de Volta',
      efeito: 'Depois de arremessado, Mjolnir retorna à mão do portador ao fim do ataque sem gastar ação, desde que ambos estejam na mesma Dimensão. Num crítico, uma segunda criatura escolhida a até 6 m do alvo sofre 4d8 de Raio; Reflexos contra a DT de efeito do portador reduz esse dano à metade.',
    },
  },
  'reliquia-rhaast': {
    ...comum,
    atributos: arma('8d12+12', '20/x4', 'Sangue'),
    lore: 'Rhaast só fala com fome, e nunca com a própria voz. O sussurro sai das feridas abertas em volta, cada uma pedindo que a próxima seja maior. O cabo é morno igual pele com febre. A lâmina é fria igual o espaço que sobra quando alguma coisa acabou de morrer ali.',
    descricao: 'Foice que cobra dízimo: cada golpe em coisa viva devolve Vida para quem empunha.',
    ressonancia: {
      nome: 'Dízimo Rubro',
      efeito: 'Uma vez por turno, quando Rhaast causar dano a uma criatura viva, o portador recupera 1d12 de Vida. Vida recuperada além do máximo é perdida. Construtos, objetos e criaturas sem sangue ou força vital não alimentam a relíquia.',
    },
  },
  'reliquia-zangetsu': {
    ...comum,
    atributos: arma('8d12+10', '20/x4', 'Vazio'),
    lore: 'Zangetsu não devolve o rosto de quem segura ela. No metal aparece uma lua rachada, mesmo debaixo de sol aberto, e uma figura parada muito longe que nunca chega mais perto. Alimentar a lâmina com Mana encurta o caminho entre o corte e aquilo que ele resolveu alcançar.',
    descricao: 'Lâmina lunar que troca Mana por corte: quanto mais você alimenta antes do golpe, mais fundo ela chega.',
    ressonancia: {
      nome: 'Fome da Lua Partida',
      efeito: 'Uma vez por turno, antes de atacar com Zangetsu, o portador pode gastar 2, 4 ou 6 de Mana. O ataque causa respectivamente +1d12, +2d12 ou +3d12 de Vazio. A Mana é gasta mesmo se o ataque errar, e os dados adicionais multiplicam no crítico.',
    },
  },
  'reliquia-gungnir': {
    ...comum,
    atributos: arma('8d12+14', '20/x4', 'Juramento', 'Luz Solar'),
    lore: 'Gungnir cobra qualquer juramento dito de olhos abertos e nunca pergunta se ele era justo. Cada promessa feita diante dela vira uma runa nova na haste. Ninguém achou até hoje espaço suficiente para todas as promessas que essa lança já cobrou.',
    descricao: 'A lança do juramento. Cumpra o que você prometeu e ela abre qualquer defesa; volte atrás e ela cobra de você.',
    ressonancia: {
      nome: 'Juramento que Não Erra',
      efeito: 'No começo de uma cena, o portador pode declarar em voz alta um objetivo verificável que pretende cumprir até o fim dela. Enquanto agir em favor desse objetivo, os ataques de Gungnir ignoram metade da Resistência do alvo e a lança retorna após ser arremessada. Se o portador abandonar ou contrariar conscientemente o juramento, sofre uma vez o dano-base da arma, sem crítico nem redução, e Gungnir fica inerte até o próximo descanso completo.',
    },
  },
  'reliquia-masamune': {
    ...comum,
    atributos: arma('10d10+10', '20/x4', 'Metal'),
    lore: 'Masamune corta primeiro e chega depois. Quem olha com atenção vê talos de flor de metal brotando no lugar onde a lâmina ainda vai passar. O ferreiro que deu nome a ela deixou um bilhete dentro da bainha com um recado só: escolha com cuidado o que ela vai alcançar antes de você.',
    descricao: 'Lâmina que chega antes do braço: o primeiro corte de cada combate sai com vantagem.',
    ressonancia: {
      nome: 'Primeiro Corte',
      efeito: 'O primeiro ataque feito com Masamune em cada combate é rolado com vantagem. Uma vez por turno, quando esse ataque reduzir uma criatura hostil a 0 de Vida, o portador pode se deslocar até 3 m sem provocar Reações; isso não concede outra ação nem outro ataque.',
    },
  },
  'reliquia-murasame': {
    ...comum,
    atributos: arma('8d12+16', '20/x2', 'Vazio', 'Execução'),
    lore: 'A chuva começa antes de Murasame sair da bainha. Ela não molha roupa nem apaga fogo, cai só em cima de quem já está ferido e corre para cima, das poças de volta para a lâmina. A espada tem paciência com todo mundo, menos com quem já passou de certo ponto.',
    descricao: 'Espada de execução. Contra quem já está quase caindo, um golpe dela encerra a conversa.',
    ressonancia: {
      nome: 'Sentença na Ferida',
      efeito: 'Uma vez por cena, ao atingir uma criatura com no máximo 25% da Vida máxima, obrigue-a a testar Fortitude contra a DT de efeito do portador. Em falha, ela sofre +6d12 de Vazio; esse dano não multiplica no crítico. Criaturas sem Vida, objetos e alvos imunes a efeitos de execução ignoram o dano adicional.',
    },
  },
  'reliquia-coroa-primeiro-nome': {
    ...comum,
    atributos: artefato('Revela natureza', 'Resistência: Vontade'),
    lore: 'Antes dos títulos, das máscaras e das línguas, alguma coisa chamou cada ser pela primeira vez. A Coroa guarda o eco desses chamados. Ela nunca serve na cabeça de ninguém, e o que acontece é o espaço em volta se entortar até fingir que a medida sempre esteve certa.',
    descricao: 'A coroa reconhece a essência por trás de máscaras. Uma vez por cena, gaste uma Ação Padrão para escolher uma criatura percebida a até 12 m. Ela revela sua natureza sobrenatural geral; se tentar ocultá-la, faz Vontade contra a DT de efeito do portador. Sucesso impede a revelação, mas informa que houve resistência.',
    ativacao: 'Ação Padrão, alcance 12 m',
    frequencia: '1/cena',
    defesa: 'Vontade contra a DT de efeito do portador',
  },
  'reliquia-ampulheta-instante': {
    ...comum,
    atributos: artefato('Recusa a própria ação', '1/descanso completo'),
    lore: 'A areia cai para os dois lados e nunca encontra o meio. Cada grão guarda um instante que alguém se recusou a viver até o fim: a palavra engolida, a porta que ficou fechada, o golpe que o braço quis desfazer no meio do caminho. Virar a ampulheta traz esse instante de volta para ser encarado outra vez, com o mesmo corpo cansado de antes.',
    descricao: 'Uma vez por descanso completo, imediatamente depois de concluir sua própria ação, o portador pode retornar ao espaço onde a iniciou e desfazer apenas os efeitos daquela ação sobre ele. Ações, Mana, munição, cargas e outros recursos continuam gastos; dano e condições causados a terceiros, informações descobertas e reações provocadas permanecem.',
    ativacao: 'Imediatamente depois da própria ação',
    frequencia: '1/descanso completo',
  },
  'reliquia-chave-axis': {
    ...comum,
    atributos: artefato('Abertura adaptativa', 'Vantagem 1/cena'),
    lore: 'A Chave não tem dentes porque fechadura nunca foi problema dela. O que ela abre é a certeza de que duas coisas estão separadas. A A.X.I.S catalogou a peça em inventários que ainda não foram escritos, e em todos eles a coluna do proprietário continua em branco.',
    descricao: 'Adapta sua forma a fechaduras, lacres tecnológicos e portais artificiais. Uma vez por cena, gaste uma Ação Padrão para receber vantagem em um teste feito para abrir ou desativar um mecanismo adjacente. A chave não abre automaticamente e selos narrativos ainda exigem autorização do Mestre.',
    ativacao: 'Ação Padrão, mecanismo adjacente',
    frequencia: '1/cena',
  },
  'reliquia-manto-abismo': {
    ...comum,
    atributos: artefato('Invisível e intangível', 'Custo: 8 Mana'),
    lore: 'O tecido é a última sombra de um lugar que parou de existir. Por baixo dele não tem forro nem corpo, tem a lembrança de um mundo depois que a luz final se apagou. Vestir o manto é aceitar que, por alguns passos, a realidade pode esquecer de encostar em você.',
    descricao: 'Uma vez por cena, gaste uma Ação de Movimento e 8 de Mana para ficar invisível e intangível até o começo do próximo turno. Enquanto durar, você atravessa espaços ocupados, mas não barreiras seladas, e não pode terminar dentro de matéria sólida. Atacar, conjurar ou interagir com um objeto encerra o efeito imediatamente.',
    ativacao: 'Ação de Movimento',
    frequencia: '1/cena',
    duracao: 'Até o começo do próximo turno',
    custo: '8 Mana',
  },
  'reliquia-arco-hou-yi': {
    ...comum,
    atributos: arma('8d12+12', '20/x4', 'Luz', 'Munição 1'),
    lore: 'Havia dez sóis no céu e a terra estava cozinhando embaixo deles. Hou Yi derrubou nove e escolheu deixar o décimo de pé. O arco guarda essa conta: quem levanta ele sente na corda o peso do tiro que ficou sem ser dado.',
    descricao: 'O arco que derrubou nove sóis. A flecha dele sai reta demais para caber atrás de qualquer proteção.',
    ressonancia: {
      nome: 'Sol Abatido',
      efeito: 'Uma vez por cena, gaste uma Ação Padrão para um disparo com alcance dobrado que ignora cobertura parcial e camuflagem. Em acerto, o alvo sofre +4d12 de Luz; se estiver voando, faz Reflexos contra a DT de efeito do portador e, em falha, desce até o solo sem sofrer dano de queda e fica Caído.',
    },
  },
  'reliquia-keraunos': {
    ...comum,
    atributos: arma('8d12+18', '20/x4', 'Raio', 'Munição 1'),
    lore: 'Os ciclopes dobraram um raio inteiro até ele caber numa mão e entregaram a peça a Zeus. Ela some da palma no instante do arremesso e se refaz no lugar de onde saiu, ainda quente. Perto dela, cabelo se levanta sozinho e todo metal por perto canta baixinho.',
    descricao: 'O raio de Zeus dobrado em forma de arma. Some da mão ao ser lançado e volta a existir no mesmo lugar.',
    ressonancia: {
      nome: 'Sentença do Céu',
      efeito: 'O arremesso do Keraunos não sofre penalidade por distância, clima ou cobertura parcial, e a arma se refaz na mão do portador no começo do turno dele. Em céu aberto, o primeiro arremesso de cada cena é rolado com vantagem.',
    },
  },
  'reliquia-sudarshana-chakra': {
    ...comum,
    atributos: arma('8d12+10', '20/x4', 'Corte', 'Munição 1'),
    lore: 'O disco gira sozinho e nunca esquenta. Quem chega perto conta mil raios no lugar de seis, e nenhum deles parado. Ele volta sempre para a mão que o lançou, inclusive quando essa mão já mudou de ideia no meio do arremesso.',
    descricao: 'O disco de Vishnu. Sai da mão, cobra de até três alvos na mesma volta e retorna sozinho.',
    ressonancia: {
      nome: 'Roda que Não Para',
      efeito: 'Ao arremessar o disco, escolha até três criaturas separadas por no máximo 6 m uma da outra e faça um ataque contra cada uma, na ordem escolhida. A primeira sofre o dano completo e as demais sofrem metade. O disco retorna à mão do portador ao fim do ataque, sem gastar ação.',
    },
  },
  'reliquia-jackal': {
    ...comum,
    atributos: arma('8d12+8', '20/x4', 'Balístico', 'Munição 6'),
    lore: 'Uma pistola preta de cano longo, pesada demais para a maioria das mãos vivas segurar sem apoio. As balas são de prata derretida de uma cruz de igreja, e o cano leva gravado em latim um pedido que ninguém traduz em voz alta. Quem dispara sente o coice na coluna, não no braço.',
    descricao: 'Pistola antimonstro. Contra morto-vivo, demônio e coisa sustentada por Escuridão, ela passa por qualquer couro.',
    ressonancia: {
      nome: 'Prata Bendita',
      efeito: 'O dano do Jackal ignora a Resistência de criaturas mortas-vivas, demoníacas ou sustentadas por magia de Escuridão, e impede que elas recuperem Vida até o fim do próprio turno seguinte. Contra qualquer outro alvo, a arma funciona apenas pela ficha de combate acima.',
    },
  },
  'reliquia-gae-bolg': {
    ...comum,
    atributos: arma('8d12+14', '19-20/x2', 'Perfuração', 'Arremesso que retorna'),
    lore: 'A lança foi lascada do osso de um monstro do mar e nunca perdoou o que atravessa. Quem sobreviveu a ela conta que a dor chegou antes do golpe. Cú Chulainn a usou uma vez contra o próprio irmão de criação, e desde esse dia a haste pesa na mão de quem hesita.',
    descricao: 'A lança que abre ferida que não fecha. Vai arremessada, cobra o preço e volta para a mão.',
    ressonancia: {
      nome: 'Ferida que Não Fecha',
      efeito: 'Uma vez por cena, ao arremessar Gáe Bolg, resolva o ataque sem contar escudo nem cobertura parcial do alvo. Em acerto, ele sofre Sangramento e não recupera Vida até o fim da cena; no fim de cada turno dele, uma Fortitude contra a DT de efeito do portador encerra os dois efeitos. A lança volta à mão ao fim do ataque, sem gastar ação.',
    },
  },
  'reliquia-sharur': {
    ...comum,
    atributos: arma('8d12+12', '20/x4', 'Impacto', 'Arremesso que retorna'),
    lore: 'Sharur fala, e fala demais. A maça contava a Ninurta o que tinha visto do outro lado do campo, discutia a estratégia e reclamava quando a ordem era burra. Depois de voltar para a mão, ela ainda leva alguns segundos terminando a frase.',
    descricao: 'A maça que voa, volta e conta o que viu. Depois de acertar, ela entrega em voz alta uma fraqueza do alvo.',
    ressonancia: {
      nome: 'A Arma que Conta o que Viu',
      efeito: 'Quando Sharur atinge uma criatura num arremesso, volta à mão do portador sem gastar ação e diz em voz alta uma Resistência, vulnerabilidade ou imunidade que aquela criatura realmente possui, escolhida pelo Mestre. Cada criatura entrega no máximo uma informação por cena.',
    },
  },
  'reliquia-kusanagi': {
    ...comum,
    atributos: arma('8d12+14', '20/x4', 'Ar', 'Alcance de 9 m'),
    lore: 'Saiu da cauda de uma serpente de oito cabeças, e o ferreiro que a limpou jurou que o metal estava seco depois de anos dentro do bicho. Ela corta o vento antes de cortar o alvo. Em dia parado, quem está por perto ouve um assobio que não vem de lugar nenhum.',
    descricao: 'A espada dos ventos. O corte dela sai da lâmina e continua pelo ar até nove metros.',
    ressonancia: {
      nome: 'Ceifa de Vento',
      efeito: 'Os ataques da Kusanagi alcançam qualquer criatura a até 9 m em linha reta, cortando o ar entre as duas. Uma vez por turno, quando um desses ataques acerta, o portador escolhe empurrar o alvo 3 m ou limpar toda névoa, fumaça e gás de uma linha de 9 m.',
    },
  },
  'reliquia-durandal': {
    ...comum,
    atributos: arma('10d10+12', '20/x4', 'Corte', 'Indestrutível'),
    lore: 'Roland tentou quebrar Durandal contra a pedra dos Pirenéus para que ela não caísse na mão errada. A pedra rachou e a espada não. Contam que ela segue encravada numa parede de rocha em Rocamadour, o que não explica as vezes em que foi vista bem longe dali.',
    descricao: 'A espada que se recusou a quebrar. Nada mundano a danifica, e o que ela apara chega mais fraco.',
    ressonancia: {
      nome: 'A Lâmina que Não Cede',
      efeito: 'Durandal não pode ser destruída, danificada, desarmada nem desviada por nada que não seja outra Relíquia da Criação. Uma vez por rodada, o portador pode gastar uma Reação para aparar um ataque corpo a corpo que o tenha acertado, reduzindo o dano em 4d12.',
    },
  },
  'reliquia-egide': {
    ...comum,
    atributos: artefato('Amedronta', 'Resistência: Vontade'),
    lore: 'A pele é de uma cabra que amamentou um deus, e o rosto costurado no meio dela ainda tem opinião sobre quem chega perto. Ninguém encara a peça por muito tempo. Quem tenta descreve depois uma vontade repentina de estar em qualquer outro lugar.',
    descricao: 'Uma vez por cena, gaste uma Ação Padrão para descobrir o rosto da Égide. Criaturas hostis a até 12 m que puderem ver a peça fazem Vontade contra a DT de efeito do portador; em falha, ficam Amedrontadas até o fim do próprio turno seguinte e não podem se aproximar do portador enquanto durar. Criaturas cegas, sem mente ou que já viram a Égide na mesma cena ignoram o efeito.',
    ativacao: 'Ação Padrão, alcance 12 m',
    frequencia: '1/cena',
    defesa: 'Vontade contra a DT de efeito do portador',
  },
  'reliquia-talaria': {
    ...comum,
    atributos: artefato('Voo curto', 'Custo: 6 Mana'),
    lore: 'O que sai dos calcanhares parece asa, mas se mexe como o começo de um passo que ainda não aconteceu. Hermes calçava as sandálias para entregar recado e, quando dava vontade, para chegar antes da própria notícia. Quem usa elas descobre que a pressa deixa de ser sensação e vira direção.',
    descricao: 'Uma vez por cena, gaste uma Ação de Movimento e 6 de Mana para voar até o dobro do seu Movimento até o fim do turno. Esse deslocamento não provoca reações e atravessa terreno difícil sem custo extra. Se você terminar o turno no ar, desce até o solo sem sofrer dano de queda.',
    ativacao: 'Ação de Movimento',
    frequencia: '1/cena',
    duracao: 'Até o fim do turno',
    custo: '6 Mana',
  },

  'reliquia-olho-odin': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Vê o que é verdadeiro', 'Custo: 1d6 de Sanidade'),
    lore: 'Odin deixou um olho no fundo de um poço em troca de uma pergunta, e o poço nunca devolveu a água limpa. A lente que sobrou dessa troca ainda olha para o lado de dentro das coisas. Quem a instala passa a semana seguinte sem conseguir olhar espelho nenhum.',
    descricao: 'Uma vez por cena, gaste uma Ação Livre para enxergar o que é verdadeiro. Até o fim do seu turno, você vê através de ilusões, disfarces e invisibilidade a até 18 m e tem vantagem em Percepção e Intuição. Cada uso custa 1d6 de Sanidade.',
    ativacao: 'Ação Livre',
    frequencia: '1/cena',
    custo: '1d6 de Sanidade',
    efeito: 'Vê através de ilusões, disfarces e invisibilidade a até 18 m; vantagem em Percepção e Intuição até o fim do turno',
  },
  'reliquia-braco-nuada': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Não pode ser mutilado', 'Golpe de Prata'),
    lore: 'Nuada perdeu o braço numa batalha e o trono junto com ele, porque um rei ferido não podia reinar. A prata que lhe deram no lugar trabalhou tão bem que o trono voltou. O braço guarda a memória de ser devolvido, e recusa a ideia de ser tirado outra vez.',
    descricao: 'Este braço nunca pode ser mutilado, arrancado nem desarmado à força, e a mão que ele forma não solta o que segura contra a sua vontade. Uma vez por cena, gaste uma Ação Padrão para um golpe desarmado que causa 4d12 de dano adicional.',
    ativacao: 'Ação Padrão',
    frequencia: '1/cena',
    efeito: 'Imune a Mutilação e a desarme forçado; golpe desarmado com 4d12 de dano adicional 1/cena',
  },
  'reliquia-coracao-ouroboros': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Regeneração', 'Recusa a queda 1/descanso', 'Custo: 1 Cansaço'),
    lore: 'A serpente que engole a própria cauda nunca chegou a decidir qual ponta veio primeiro. O coração bate no ritmo dessa dúvida: cada batida termina onde a seguinte começa, sem intervalo para o corpo aproveitar e morrer. Médicos que ouvem o peito de quem o carrega pedem para ouvir de novo.',
    descricao: 'No início de cada turno seu, recupere 1d12 de Vida. Uma vez por descanso, ao chegar a 0 de Vida, você não cai: volta com metade da Vida máxima e ganha 1 Cansaço.',
    ativacao: 'Reação, ao chegar a 0 de Vida',
    frequencia: '1/descanso',
    custo: '1 Cansaço',
    efeito: 'Recupera 1d12 de Vida por turno; ao chegar a 0 de Vida, volta com metade da Vida máxima',
  },
  'reliquia-pele-nemeia': {
    ...comum,
    atributos: peca('Armadura', 'Resistência 10: Corte, Perfuração, Impacto'),
    lore: 'O leão de Nemeia teve a pele testada por todas as armas de uma cidade inteira, e nenhuma deixou marca. Só as garras dele serviram para cortá-la, e é por isso que a costura da armadura brilha como unha. Quem a veste aprende que ser difícil de ferir também pesa.',
    descricao: 'Nenhum fio comum encontra caminho nesta pele. Enquanto estiver vestida, você tem Resistência 10 contra Corte, Perfuração e Impacto.',
    efeito: 'Resistência 10 contra Corte, Perfuração e Impacto',
  },
  'reliquia-escudo-svalinn': {
    ...comum,
    atributos: peca('Escudo', 'Bloqueia raios e chamas', 'Reação 1/cena'),
    lore: 'Svalinn fica diante do sol para que a terra não queime. O escudo herdou a função inteira e a exerce com a educação de quem já foi testado por coisa maior que você. O metal esquenta quando o perigo se aproxima, sem que o portador sinta nada além de calor de lareira.',
    descricao: 'Uma vez por cena, gaste uma Reação para bloquear um ataque à distância ou um efeito de área de Fogo, Luz ou Raio que atinja você ou um aliado adjacente. O alvo não sofre dano nem condição desse efeito.',
    ativacao: 'Reação, alcance adjacente',
    frequencia: '1/cena',
    efeito: 'Bloqueia um ataque à distância ou efeito de área de Fogo, Luz ou Raio contra você ou aliado adjacente',
  },
  'reliquia-ilha-avalon': {
    ...comum,
    atributos: peca('Bem Imóvel', 'Base', 'Descanso Excelente'),
    lore: 'Avalon aparece na névoa para quem está ferido demais para procurar. Não há mapa da chegada, só a lembrança de ter sido carregado. As macieiras dão fruto o ano todo, e ninguém lembra de ter plantado nenhuma.',
    descricao: 'Uma ilha inteira que se ergue da névoa e serve de base. Vem com Dormitório 3, Área Médica 3 e Armazém 2, e não cobra manutenção.',
    localizacao: 'A definir com o Mestre',
    qualidadeQuartos: 'excelente',
  },
  'reliquia-nau-argo': {
    ...comum,
    atributos: peca('Veículo Completo', 'Aquático', 'Proa que fala'),
    lore: 'A proa foi talhada num carvalho de Dodona, uma madeira que profetiza, e a Argo nunca aprendeu a calar. Ela avisa de tempestade três dias antes e reclama de quem esquece de agradecer. Já atravessou mares que mudaram de nome enquanto ela passava.',
    descricao: 'Veículo grande aquático. Vida 200; Defesa 20; Resistência 8; deslocamento 60 m na água; Manobrabilidade +4; capacidade total 20, incluindo tripulação; cobertura total; tripulação mínima 1; até 6 sistemas ativos; espaços de base: 4; sem armas integradas. A proa fala: uma vez por cena, quem pilota pergunta o rumo e a Argo responde com o caminho mais seguro, dando vantagem em testes de navegação até o fim da cena.',
    ativacao: 'Ação Livre do piloto',
    frequencia: '1/cena',
  },

  'reliquia-armadura-aquiles': {
    ...comum,
    atributos: peca('Armadura', 'Quase invulnerável', 'Ponto fraco no calcanhar'),
    lore: 'Hefesto forjou o bronze no fogo que sobra depois de uma guerra, batendo a peça até ela esquecer o que era ferir. Uma mãe pediu a armadura para o filho e recebeu de volta um herói que nenhuma lança alcançava. O calcanhar ficou de fora por descuido, e é o único lugar do mundo que ainda lembra como doer.',
    descricao: 'Enquanto vestida, você tem Resistência 8 contra todos os tipos de dano. Um inimigo que descubra e mire especificamente no seu calcanhar (exige uma Ação Padrão de Investigação contra sua Vontade) ignora essa Resistência pelo resto da cena.',
    efeito: 'Resistência 8 contra todos os tipos de dano, exceto se o inimigo expuser o ponto fraco',
  },
  'reliquia-couraca-sigurd': {
    ...comum,
    atributos: peca('Armadura', 'Resistência: Fogo e Veneno', 'Ponto cego nas costas'),
    lore: 'Sigurd matou o dragão Fafnir e depois se banhou no sangue que escorria da ferida, e a pele parou de aceitar corte por causa disso. Uma folha de tília grudou bem entre as omoplatas antes do sangue secar, e nenhum banho seguinte alcançou aquele pedaço. Quem veste a couraça sente o calor do dragão morto até hoje, um instante antes de qualquer golpe acertar.',
    descricao: 'Enquanto vestida, você tem Resistência 8 contra Fogo e Veneno. Um ataque desferido contra você por trás, sem que você o veja vir, ignora toda a Defesa da couraça.',
    efeito: 'Resistência 8 contra Fogo e Veneno; ataque pelas costas sem ser visto ignora a Defesa da couraça',
  },
  'reliquia-armadura-fenix': {
    ...comum,
    atributos: peca('Armadura', 'Renasce das cinzas', '1/cena'),
    lore: 'A pena que sobrou de uma fênix não apaga nunca, só espera a próxima vez. Fundida em placas finas, ela ainda pulsa um calor de ninho, e quem a veste dorme mal na primeira semana, sonhando com um incêndio que nunca chega. Depois disso, o calor vira companhia.',
    descricao: 'Uma vez por cena, ao chegar a 0 de Vida enquanto veste a armadura, você se levanta imediatamente com metade da Vida máxima, envolto em chamas que não queimam você nem seus aliados.',
    ativacao: 'Reação, ao chegar a 0 de Vida',
    frequencia: '1/cena',
    efeito: 'Ao chegar a 0 de Vida, levanta com metade da Vida máxima',
  },
  'reliquia-placas-golem-praga': {
    ...comum,
    atributos: peca('Armadura', 'Defesa altíssima', 'Furtividade -4'),
    lore: 'O rabino escreveu uma palavra na testa de barro e a argila aprendeu a andar. As placas guardam o mesmo peso, o mesmo passo pesado de quem foi feito para proteger uma cidade inteira sozinho. Apagar a palavra desliga o golem; ninguém que veste a armadura esquece disso.',
    descricao: 'Enquanto vestida, você tem Resistência 6 contra todos os tipos de dano e sofre −4 em testes de Furtividade.',
    efeito: 'Resistência 6 contra todos os tipos de dano; Furtividade -4',
  },
  'reliquia-exocarapaca-anansi': {
    ...comum,
    atributos: peca('Armadura', 'Vantagem contra agarrão', 'Resistência: Veneno'),
    lore: 'Anansi conta histórias e arma teias com a mesma paciência, e esta peça guarda um pouco das duas coisas. O fio nunca corta, só prende, e sempre prendeu mais armadilha do que presa. Quem a veste aprende a escapar de qualquer coisa que tente segurá-lo com força demais.',
    descricao: 'Enquanto vestida, você tem vantagem em testes para escapar de agarrões e amarras, e Resistência 5 contra Veneno.',
    efeito: 'Vantagem para escapar de agarrões e amarras; Resistência 5 contra Veneno',
  },
  'reliquia-escudo-ajax': {
    ...comum,
    atributos: peca('Escudo', 'Cobre um aliado inteiro', '1/cena'),
    lore: 'Ájax mandou empilhar sete couros de boi e cobrir tudo com uma última camada de bronze. O escudo saiu maior que qualquer outro do acampamento, grande o bastante para esconder um amigo inteiro atrás dele. Nada que já bateu nesse escudo voltou a bater duas vezes no mesmo lugar.',
    descricao: 'Uma vez por cena, gaste uma Reação para dar cobertura total a um aliado adjacente contra um único ataque, mesmo à distância.',
    ativacao: 'Reação, alcance adjacente',
    frequencia: '1/cena',
    efeito: 'Cobertura total a um aliado adjacente contra um ataque',
  },
  'reliquia-escudo-solar-ra': {
    ...comum,
    atributos: peca('Escudo', 'Reflete luz e fogo', '1/cena'),
    lore: 'O disco viaja com o sol pelo Nun todas as noites e volta pela manhã sem uma marca de escuridão. Polido a ponto de doer olhar, ele devolve tudo que recebe da mesma cor que veio. Serpentes do submundo nunca aprenderam a se acostumar com o brilho.',
    descricao: 'Uma vez por cena, ao bloquear um ataque de Fogo ou de Luz com uma Reação, devolva metade do dano bloqueado ao atacante, se ele estiver a até 12 m.',
    ativacao: 'Reação, alcance 12 m',
    frequencia: '1/cena',
    efeito: 'Devolve metade do dano de Fogo ou Luz bloqueado ao atacante',
  },
  'reliquia-broquel-bagda': {
    ...comum,
    atributos: peca('Escudo', 'Vantagem em Furtividade', 'Invisível após bloquear'),
    lore: 'Ninguém lembra o nome de quem o roubou primeiro, só que ele desapareceu de dentro do palácio sem que os guardas piscassem. O latão gravado guarda esse talento como se fosse dele mesmo: leve nas mãos, pesado na hora de ser encontrado.',
    descricao: 'Enquanto equipado, você tem vantagem em testes de Furtividade. Uma vez por cena, ao bloquear um ataque com sucesso, fique Invisível até o fim do seu próximo turno.',
    ativacao: 'Reação, ao bloquear um ataque',
    frequencia: '1/cena',
    efeito: 'Vantagem em Furtividade; fica Invisível ao bloquear um ataque',
  },
  'reliquia-aspis-heracles': {
    ...comum,
    atributos: peca('Escudo', 'Vantagem contra Amedrontado', 'Aliados adjacentes incluídos'),
    lore: 'Um poeta contou o escudo verso por verso, cada figura de bronze cravejada narrando um feito que ninguém mais presenciou. O centro traz um rosto que assusta antes mesmo de a lâmina se erguer, e o medo alheio nunca conseguiu encostar em quem o carrega.',
    descricao: 'Enquanto equipado, você e os aliados a até 3 m têm vantagem em testes de resistência contra a condição Amedrontado.',
    efeito: 'Vantagem contra Amedrontado para você e aliados a até 3 m',
  },
  'reliquia-escudo-iris': {
    ...comum,
    atributos: peca('Escudo', 'Resistência escolhida ao ativar', '1/cena'),
    lore: 'Íris corre entre o Olimpo e o mundo deixando um arco de cor para trás, uma ponte que qualquer um pode ver mas só ela atravessa. O escudo guarda um pedaço daquele caminho: sete faixas que mudam de ordem toda vez que alguém as encara com atenção.',
    descricao: 'Uma vez por cena, gaste uma Ação Livre para escolher um tipo de dano. Até o fim da cena, você tem Resistência 6 contra esse tipo.',
    ativacao: 'Ação Livre',
    frequencia: '1/cena',
    efeito: 'Resistência 6 contra um tipo de dano escolhido, até o fim da cena',
  },
  'reliquia-pernas-talos': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Movimento dobrado', 'Ponto fraco no tornozelo'),
    lore: 'Talos rodeava Creta três vezes por dia, sozinho, sem cansar. Um único prego de bronze no calcanhar segurava toda a vida dele lá dentro, e quando alguém o arrancou, o gigante esvaziou como um jarro virado. As pernas guardam o mesmo ritmo incansável, e o mesmo prego, bem escondido.',
    descricao: 'Seu Movimento dobra. Se um inimigo descobrir e atacar especificamente o prego no seu tornozelo (exige uma Ação Padrão de Investigação contra sua Vontade), você perde esse bônus até o fim da cena.',
    efeito: 'Movimento dobrado, perdido se o prego do tornozelo for exposto e atacado',
  },
  'reliquia-pulmoes-enkidu': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Imune a doenças', 'Respira em qualquer ar'),
    lore: 'Enkidu nasceu do barro da estepe e respirou o primeiro ar sem intermediário nenhum, sem cidade filtrando nada entre ele e o mundo. Estes pulmões carregam a mesma crueza: aceitam fumaça, gás e miasma como se fossem vento comum.',
    descricao: 'Você é imune a doenças e respira normalmente em qualquer atmosfera tóxica, incluindo fumaça, gás e miasma sobrenatural.',
    efeito: 'Imune a doenças; respira em qualquer atmosfera tóxica',
  },
  'reliquia-espinha-adamastor': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Resistência: Impacto', 'Não pode ser Derrubado'),
    lore: 'O gigante da tempestade nasceu de uma promessa quebrada e virou rocha no fim de um continente, ainda de pé depois de todos esses séculos. Esta espinha guarda a mesma teimosia de ficar em pé: nenhuma onda, nenhum murro, nenhuma queda parece grande o bastante para derrubar quem a carrega.',
    descricao: 'Você tem Resistência 6 contra dano de Impacto e não pode ser Derrubado contra a sua vontade.',
    efeito: 'Resistência 6 contra Impacto; imune a Derrubar',
  },
  'reliquia-cordas-sereia': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Canto de encantamento', '1/cena'),
    lore: 'Nenhum marujo que ouviu o canto original voltou pra contar como era, só que parou de remar. As cordas guardam o formato daquela nota impossível, presas na garganta como uma promessa que nunca se cumpre inteira.',
    descricao: 'Uma vez por cena, gaste uma Ação Padrão para cantar: criaturas a até 9 m que puderem ouvir fazem Vontade contra a DT de efeito do portador ou ficam Enfeitiçadas até o fim da cena, tratando você como aliado confiável enquanto o efeito durar.',
    ativacao: 'Ação Padrão, alcance 9 m',
    frequencia: '1/cena',
    defesa: 'Vontade contra a DT de efeito do portador',
    efeito: 'Enfeitiça criaturas que ouvirem o canto, até o fim da cena',
  },
  'reliquia-olhos-argos': {
    ...comum,
    atributos: peca('Implante Cibernético', 'Percepção 360°', 'Imune a flanquear e surpresa'),
    lore: 'Argos tinha cem olhos espalhados pelo corpo inteiro, e mesmo dormindo mantinha alguns abertos. Hera colocou os últimos dele na cauda de um pavão depois que a vigília acabou, mas um par sobrou, guardado, esperando outra cabeça para servir.',
    descricao: 'Você enxerga em todas as direções ao mesmo tempo. É imune a ser flanqueado e a sofrer ataque furtivo, e nunca fica Surpreso no início de um combate.',
    efeito: 'Imune a flanquear, ataque furtivo e surpresa',
  },
  'reliquia-jardim-hesperides': {
    ...comum,
    atributos: peca('Bem Imóvel', 'Base', 'Regeneração de quem descansa'),
    lore: 'As macieiras do jardim dão fruto de ouro só uma vez por estação, mas a sombra delas já basta: quem dorme sob os galhos acorda mais inteiro do que deitou. Um dragão guardava a entrada, e ninguém sabe ao certo para onde ele foi quando o jardim trocou de dono.',
    descricao: 'Uma base com pomar próprio. Vem com Área Médica 2 e Armazém 2, sem custo de manutenção. Quem descansa completamente dentro do jardim recupera Vida, Mana e Estamina em dobro nesse descanso.',
    localizacao: 'A definir com o Mestre',
    qualidadeQuartos: 'maravilhosa',
  },
  'reliquia-vale-shambhala': {
    ...comum,
    atributos: peca('Bem Imóvel', 'Base', 'Descanso completo em metade do tempo'),
    lore: 'Ninguém chega a Shambhala seguindo um mapa, só uma disposição de ânimo que poucos sustentam até o fim da estrada. O tempo lá dentro anda mais devagar do que fora, o suficiente para uma tarde inteira caber numa hora de relógio comum.',
    descricao: 'Uma base escondida num vale onde o tempo se estica. Vem com Dormitório 3 e Área Médica 2, sem custo de manutenção. Um descanso completo dentro do vale leva metade do tempo normal.',
    localizacao: 'A definir com o Mestre',
    qualidadeQuartos: 'excelente',
  },
  'reliquia-fragmento-atlantida': {
    ...comum,
    atributos: peca('Bem Imóvel', 'Base', 'Respira debaixo d\'água'),
    lore: 'A cidade afundou numa noite só, e o que sobrou dela flutua agora entre uma Árvore e outra, meio submerso, meio lembrado. As cúpulas ainda seguram ar como seguravam há éons, e quem entra aprende a respirar de um jeito que a cidade nunca esqueceu.',
    descricao: 'Uma cúpula submersa que ainda funciona como base. Vem com Laboratório 2 e Armazém 2, sem custo de manutenção. Todo ocupante respira normalmente dentro da cúpula, mesmo estando ela debaixo d\'água.',
    localizacao: 'A definir com o Mestre',
    qualidadeQuartos: 'boa',
  },
  'reliquia-fragmento-babel': {
    ...comum,
    atributos: peca('Bem Imóvel', 'Base', 'Tradução universal'),
    lore: 'A torre parou de crescer no dia em que ninguém mais entendeu o vizinho do andaime ao lado, e a obra desmoronou em línguas. Este pedaço sobrevivente carrega a confusão inteira e, de alguma forma, a resolve: quem mora aqui volta a se entender com qualquer um.',
    descricao: 'Uma base erguida sobre o que sobrou da torre. Vem com Dormitório 2 e Segurança 1, sem custo de manutenção. Todo ocupante entende e é entendido em qualquer idioma enquanto estiver dentro da base.',
    localizacao: 'A definir com o Mestre',
    qualidadeQuartos: 'boa',
  },
  'reliquia-oasis-zerzura': {
    ...comum,
    atributos: peca('Bem Imóvel', 'Base', 'Nunca falta água ou comida'),
    lore: 'A cidade branca do deserto só aparece para quem já desistiu de procurar por ela. As tamareiras nunca secam e os poços nunca baixam. Quem passou uma noite lá volta sem conseguir explicar em que momento a fome foi embora.',
    descricao: 'Um oásis escondido que serve de base. Vem com Dormitório 1 e Armazém 1, sem custo de manutenção. A base sempre tem água potável e comida suficiente para os ocupantes, sem gastar suprimento algum.',
    localizacao: 'A definir com o Mestre',
    qualidadeQuartos: 'boa',
  },
  'reliquia-carruagem-helios': {
    ...comum,
    atributos: peca('Veículo Completo', 'Atmosférico', 'Rastro de fogo'),
    lore: 'Hélios cruza o céu todo dia na mesma carruagem, puxada por cavalos que respiram brasa em vez de ar. Faetonte pediu para guiá-la uma vez e o mundo quase queimou inteiro por causa disso. Quem assume as rédeas hoje aprende rápido que velocidade daquele tamanho não perdoa mão insegura.',
    descricao: 'Veículo médio atmosférico. Vida 90; Defesa 20; Resistência 6; deslocamento 120 m; Manobrabilidade +5; capacidade total 3, incluindo tripulação; cobertura nenhuma; tripulação mínima 1; até 2 sistemas ativos; 0 espaços de base; sem armas integradas. O rastro da carruagem incendeia vegetação seca por onde passa, e criaturas que a tocarem sem proteção sofrem 2d6 de dano de Fogo.',
    efeito: 'Quem tocar a carruagem sem proteção sofre 2d6 de Fogo',
  },
  'reliquia-vimana': {
    ...comum,
    atributos: peca('Veículo Completo', 'Espacial', 'Palácio voador'),
    lore: 'Os textos descrevem cidades inteiras voando dentro de vimanas, com jardim, salão e guarda própria, movidas por um motor que ninguém soube reconstruir depois. Esta é pequena para os padrões do mito, mas ainda cabe uma tripulação e sobra espaço para andar dentro dela em pleno voo.',
    descricao: 'Veículo grande atmosférico/espacial. Vida 140; Defesa 18; Resistência 7; deslocamento 80 m; Manobrabilidade +3; capacidade total 12, incluindo tripulação; cobertura total; tripulação mínima 1; até 4 sistemas ativos; espaços de base: 2; sem armas integradas.',
  },
  'reliquia-sleipnir': {
    ...comum,
    atributos: peca('Veículo Completo', 'Montaria', 'Atravessa qualquer terreno'),
    lore: 'Oito patas nasceram de uma aposta que Loki perdeu de um jeito complicado demais para contar em uma frase só. Odin cavalga Sleipnir entre os mundos sem que nenhuma fronteira pareça notar a passagem, e o cavalo nunca cansa de galopar onde nada mais consegue pisar.',
    descricao: 'Veículo grande terrestre (montaria). Vida 110; Defesa 19; Resistência 4; deslocamento 90 m; Manobrabilidade +5; capacidade total 2, incluindo tripulação; cobertura nenhuma; tripulação mínima 1; sistemas ativos: 1; 0 espaços de base; sem armas integradas. Sleipnir ignora terreno difícil e pode galopar sobre água ou ar por até uma rodada por vez.',
    efeito: 'Ignora terreno difícil; galopa sobre água ou ar por até 1 rodada',
  },
  'reliquia-naglfar': {
    ...comum,
    atributos: peca('Veículo Completo', 'Aquático', 'Aterroriza quem vê chegar'),
    lore: 'Construído com as unhas de quem morreu sem tê-las cortadas, o navio só zarpa quando o mundo já está acabando, ou é o que dizem. Este fragmento chegou cedo demais, ou tarde demais, e agora navega para quem tiver estômago de comandá-lo.',
    descricao: 'Veículo colossal aquático. Vida 260; Defesa 14; Resistência 10; deslocamento 50 m na água; Manobrabilidade 0; capacidade total 40, incluindo tripulação; cobertura total; tripulação mínima 2; até 4 sistemas ativos; espaços de base: 3; sem armas integradas. Criaturas que veem o Naglfar se aproximar pela primeira vez fazem Vontade contra a DT de efeito do comandante ou ficam Abaladas até o fim da cena.',
    efeito: 'Quem vê o navio se aproximar pela primeira vez pode ficar Abalado',
    // Defesa de veículo é número na ficha (VeiculoModal usa campo numérico). Uma
    // curadoria anterior gravou texto de resistência aqui, então o valor que a
    // descrição publica é reafirmado para não sobrar string no campo.
    defesa: 14,
  },
  'reliquia-asas-dedalo': {
    ...comum,
    atributos: peca('Veículo Completo', 'Voo pessoal', 'Não pode subir demais'),
    lore: 'Dédalo construiu um par para o filho e um para si mesmo, avisando para não voar alto nem baixo demais. Ícaro não ouviu, e a cera derreteu antes de o mar aparecer embaixo dele. Estas asas ainda carregam o mesmo aviso, gravado numa pena que nunca se solta.',
    descricao: 'Veículo pequeno atmosférico. Vida 30; Defesa 17; Resistência 1; deslocamento 70 m; Manobrabilidade +4; capacidade total 1, incluindo tripulação; cobertura nenhuma; tripulação mínima 1; sistemas ativos: 0; 0 espaços de base; sem armas integradas. Se voarem acima de 200 m de altitude por mais de uma rodada, a cera derrete e as asas param de funcionar até esfriarem, por 10 minutos.',
    efeito: 'Param de funcionar por 10 minutos se voarem acima de 200 m por mais de 1 rodada',
  },
  'reliquia-bigorna-hefesto': {
    ...comum,
    atributos: artefato('Repara qualquer equipamento', '1/cena'),
    lore: 'O ferreiro dos deuses nunca joga fora o que ainda pode ser martelado de volta à forma. Esta bigorna, do tamanho de um punho fechado, carrega o mesmo teimosia: nenhuma quebra parece definitiva enquanto ela ainda estiver no bolso de alguém.',
    descricao: 'Uma vez por cena, gaste uma Ação Padrão para tocar um item quebrado, gasto ou sem carga com a bigorna. Ele volta ao estado original: uma arma partida se reconecta, um item sem carga enche de novo, uma armadura amassada se endireita.',
    ativacao: 'Ação Padrão',
    frequencia: '1/cena',
    efeito: 'Repara ou recarrega por completo um item tocado',
  },
  'reliquia-tear-parcas': {
    ...comum,
    atributos: artefato('Reescreve um teste já rolado', '1/sessão'),
    lore: 'Uma das Parcas fia o fio, a outra mede, a terceira corta, e nenhuma delas erra o comprimento. Este pedaço de tear ainda vibra com a última linha que passou por ele, e quem o segura sente, por um instante, o peso de decidir o que já estava decidido.',
    descricao: 'Uma vez por sessão, gaste uma Ação Livre para refazer um teste que você ou uma criatura a até 9 m acabou de rolar, usando o novo resultado no lugar do antigo.',
    ativacao: 'Ação Livre, alcance 9 m',
    frequencia: '1/sessão',
    efeito: 'Refaz um teste recém-rolado, usando o novo resultado',
  },
  'reliquia-martelo-wayland': {
    ...comum,
    atributos: artefato('Encanta um item comum temporariamente', '1/cena'),
    lore: 'Wayland forjou para reis e para si mesmo enquanto era mantido preso numa ilha só para servir a eles, e nunca entregou um trabalho malfeito por vingança sutil. Este martelo herdou o cuidado, não o rancor: toda peça que ele toca sai melhor do que entrou.',
    descricao: 'Uma vez por cena, gaste uma Ação Padrão para tocar uma arma ou armadura comum ou incomum com o martelo. Até o fim da cena, ela ganha o efeito de uma modificação comum à sua escolha, sem ocupar espaço nem gastar preço.',
    ativacao: 'Ação Padrão',
    frequencia: '1/cena',
    efeito: 'Concede o efeito de uma modificação comum a um item tocado até o fim da cena',
  },
  'reliquia-cinta-hipolita': {
    ...comum,
    atributos: artefato('Lidera em combate', '1/cena'),
    lore: 'A rainha das Amazonas usava a cinta como sinal de comando, não de posse, e Héracles precisou de um exército inteiro de mal-entendidos para tirá-la dela. Quem a veste hoje descobre que ordens dadas com ela parecem mais fáceis de seguir, sem que ninguém saiba dizer por quê.',
    descricao: 'Uma vez por cena, gaste uma Ação Padrão para dar uma ordem simples a até três aliados que possam ouvir você. Cada um pode usar a Reação para se mover até seu Movimento ou realizar um ataque básico, fora da própria vez.',
    ativacao: 'Ação Padrão',
    frequencia: '1/cena',
    efeito: 'Até três aliados usam a Reação para se mover ou atacar fora da vez deles',
  },
  'reliquia-fio-ariadne': {
    ...comum,
    atributos: artefato('Nunca se perde', 'Imune a labirintos e ilusões de espaço'),
    ativacao: 'Passiva',
    frequencia: 'Sempre ativa',
    lore: 'Ariadne entregou o novelo sem pedir nada em troca além de um jeito de escapar do que ela mesma ajudou a esconder. O fio nunca acabou, mesmo depois de todas as voltas, e ainda encontra o caminho de volta para quem o segura, não importa quantas paredes se movam.',
    descricao: 'Você sempre sabe o caminho de volta ao ponto onde começou a usar o fio. É imune a labirintos mágicos, ilusões de espaço e efeitos que reorganizem o ambiente à sua volta.',
    efeito: 'Sempre encontra o caminho de volta; imune a labirintos mágicos e ilusões de espaço',
  },
  'reliquia-calice-graal': {
    ...comum,
    atributos: artefato('Cura total e remove maldição', '1/cena'),
    lore: 'Ninguém concorda sobre a forma do cálice, só sobre o que ele faz para quem bebe dele com o coração no lugar certo. Cavaleiros passaram a vida inteira procurando, e a maioria voltou de mãos vazias, porque o Graal escolhe, não é escolhido.',
    descricao: 'Uma vez por cena, gaste uma Ação Padrão para oferecer o cálice a uma criatura dentro do alcance. Ela recupera toda a Vida, toda a Mana e toda a Estamina, e remove uma maldição ou condição permanente.',
    ativacao: 'Ação Padrão, alcance adjacente',
    frequencia: '1/cena',
    efeito: 'Recupera toda Vida, Mana e Estamina e remove uma maldição ou condição permanente',
  },
  'reliquia-frasco-pandora': {
    ...comum,
    atributos: artefato('Libera um efeito imprevisível', '1/sessão'),
    lore: 'Abrir não era a instrução, mas curiosidade sempre foi mais forte do que aviso. O que saiu de dentro nunca voltou a caber, e o que sobrou no fundo do frasco, uma esperança pequena e teimosa, ainda mora ali, esperando outra mão sem paciência.',
    descricao: 'Uma vez por sessão, gaste uma Ação Padrão para abrir o frasco numa área de 9 m. O Mestre sorteia um efeito de caos entre praga, medo em massa, sorte reversa ou tempestade repentina, afetando todos ali menos você. Se você mantiver o frasco fechado até o fim da cena sem abri-lo, todos os aliados dentro do alcance ganham vantagem no próximo teste que fizerem.',
    ativacao: 'Ação Padrão, área 9 m',
    frequencia: '1/sessão',
    efeito: 'Libera um efeito de caos escolhido pelo Mestre entre quatro opções',
  },
  'reliquia-taca-dioniso': {
    ...comum,
    atributos: artefato('Fúria de combate', '1/cena'),
    lore: 'O vinho que enche a taça nunca é o mesmo duas vezes, e ninguém pergunta de onde ele vem enquanto está bebendo. Quem bebe começa a rir antes de entender a própria piada, e sai andando na direção do perigo com a certeza de quem já voltou de lá.',
    descricao: 'Uma vez por cena, gaste uma Ação Livre para beber da taça. Até o fim da cena, você ganha +1d6 de dano em seus ataques e sofre −2 de Defesa.',
    ativacao: 'Ação Livre',
    frequencia: '1/cena',
    efeito: '+1d6 de dano em ataques e -2 de Defesa até o fim da cena',
  },
  'reliquia-lamparina-maravilhosa': {
    ...comum,
    atributos: artefato('Invoca um auxiliar temporário', '1/sessão'),
    lore: 'Um mercador de rua vendeu a lamparina como bugiganga velha, sem imaginar o que dormia dentro dela. Quem esfrega o metal desperta uma vontade presa há séculos, ansiosa por trabalhar em troca de liberdade que nunca chega de verdade.',
    descricao: 'Uma vez por sessão, esfregue a lamparina como Ação Padrão para invocar um auxiliar com VD igual a um quarto do seu nível, obediente por até 1 hora ou até ser derrotado. Ele desaparece ao fim do prazo, sem deixar despojos.',
    ativacao: 'Ação Padrão',
    frequencia: '1/sessão',
    duracao: '1 hora',
    efeito: 'Invoca um auxiliar com VD igual a um quarto do seu nível',
  },
  'reliquia-cornucopia': {
    ...comum,
    atributos: artefato('Provisões infinitas', '1/dia'),
    lore: 'A cabra que amamentou Zeus quebrou um chifre sem querer, e o chifre nunca parou de dar o que faltava naquele momento. Comida, água, um objeto pequeno e útil: a Cornucópia entrega sem julgar o pedido, só o tamanho dele.',
    descricao: 'Uma vez por dia, gaste uma Ação Padrão para pedir à Cornucópia: ela produz comida e água suficientes para até 10 pessoas por um dia inteiro, ou um item comum não mágico à sua escolha, de até 1 espaço de carga.',
    ativacao: 'Ação Padrão',
    frequencia: '1/dia',
    efeito: 'Produz comida e água para 10 pessoas por um dia, ou um item comum de até 1 espaço',
  },
};

const source = await readFile(catalogPath, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
const catalog = JSON.parse(source);
const entries = Array.isArray(catalog?.entradas) ? catalog.entradas : [];
const found = new Set();
const criadas = [];

const porId = new Map(entries.map((entry) => [entry?.id, entry]));
for (const [id, ficha] of Object.entries(novas)) {
  if (porId.has(id)) continue;
  entries.push({ tipo: ficha.tipo, id, titulo: ficha.titulo, conteudo: { ...ficha.base } });
  criadas.push(id);
}

for (const entry of entries) {
  const curated = curadoria[entry?.id];
  if (!curated) continue;
  found.add(entry.id);
  const preserved = { ...entry.conteudo };
  for (const campo of camposDescontinuados) delete preserved[campo];
  entry.conteudo = { ...preserved, ...curated };
}

const missing = Object.keys(curadoria).filter((id) => !found.has(id));
if (missing.length) throw new Error(`Relíquias ausentes no catálogo: ${missing.join(', ')}`);

const output = `${JSON.stringify(catalog, null, 2)}\n`.replace(/\n/g, eol);
if (checkOnly) {
  if (output !== source) {
    console.error('As Relíquias da Criação do catálogo não correspondem à curadoria oficial. Execute npm run reliquias:retrofit.');
    process.exitCode = 1;
  } else {
    console.log(`${found.size} Relíquias da Criação conferidas.`);
  }
} else {
  await writeFile(catalogPath, output, 'utf8');
  console.log(`${found.size} Relíquias da Criação atualizadas${criadas.length ? `, ${criadas.length} criadas` : ''}.`);
}
