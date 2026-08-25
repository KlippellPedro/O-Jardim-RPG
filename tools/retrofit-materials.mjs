import { readFileSync, writeFileSync } from 'node:fs';

const catalogoUrl = new URL('../data/loja/catalogo.json', import.meta.url);

const propriedadesPorEspecieEParte = {
  'Humano:Órgãos': ['Vital'],
  'Humano:Essência': ['Anímico'],
  'Vampiro:Órgãos': ['Regenerativo'],
  'Vampiro:Essência': ['Espiritual', 'Necrótico'],
  'Goblim:Órgãos': ['Estimulante'],
  'Anão:Órgãos': ['Resistente'],
  'Anão:Essência': ['Anímico'],
  'Espírito:Essência': ['Espiritual', 'Anímico'],
  'Gigante:Órgãos': ['Fortificante'],
  'Gigante:Essência': ['Anímico', 'Fortificante'],
  'Animália:Órgãos': ['Vital'],
  'Animália:Essência': ['Anímico'],
  'Sereia/Tritão:Órgãos': ['Vital'],
  'Sereia/Tritão:Essência': ['Anímico'],
};

const potenciaPorRaridade = {
  comum: 1,
  incomum: 2,
  raro: 3,
  epico: 4,
  lendario: 5,
};

function fichaCriatura(entrada) {
  const { conteudo } = entrada;
  const especie = conteudo.especie;
  const parte = conteudo.parte;

  if (especie === 'Golem' && parte === 'Órgãos') {
    return {
      categoria: 'Artificial',
      origem: 'Estrutura funcional extraída de um Golem desativado.',
      potencia: 2,
      afinidade: 'Nenhuma',
      propriedades: ['Resistente', 'Condutor'],
      usos: ['ritual', 'forja'],
      estadoBase: 'bruto',
    };
  }

  if (especie === 'Golem' && parte === 'Essência') {
    return {
      categoria: 'Arcano',
      origem: 'Núcleo arcano isolado de um Golem desativado.',
      potencia: 2,
      afinidade: 'Nenhuma',
      propriedades: ['Arcano', 'Canalizador'],
      usos: ['ritual', 'forja'],
      estadoBase: 'bruto',
    };
  }

  const essencia = parte === 'Essência';
  const carne = parte === 'Carne';
  const usos = essencia ? ['ritual'] : ['alquimia'];
  return {
    categoria: essencia ? 'Espiritual' : 'Biológico',
    origem: essencia
      ? `Resíduo espiritual isolado de ${especie}.`
      : `${parte} obtidos de ${especie} por extração adequada.`,
    potencia: potenciaPorRaridade[conteudo.raridade] ?? 1,
    afinidade: 'Nenhuma',
    propriedades: carne
      ? ['Nutritivo']
      : (propriedadesPorEspecieEParte[`${especie}:${parte}`] ?? (essencia ? ['Anímico'] : ['Vital'])),
    usos,
    estadoBase: 'bruto',
  };
}

const fichasComponentes = {
  'comp-vestigio-de-fracasso': {
    categoria: 'Artificial', origem: 'Objeto ou resíduo preservado de uma tentativa que fracassou.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Vinculante'], usos: ['ritual'], estadoBase: 'bruto',
  },
  'comp-terra-fertil': {
    categoria: 'Mineral', origem: 'Solo fértil de lavoura, jardim ou mata saudável.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Nutritivo'], usos: ['ritual', 'alquimia'], estadoBase: 'bruto',
  },
  'comp-sementes-viaveis': {
    categoria: 'Botânico', origem: 'Cultivos selecionados por germinação e vigor.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Vital'], usos: ['ritual', 'alquimia', 'cozinha'], estadoBase: 'bruto',
  },
  'comp-agua-pura': {
    categoria: 'Mineral', origem: 'Fonte natural sem contaminação mágica ou mundana.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Purificador'], usos: ['ritual', 'alquimia', 'cozinha'], estadoBase: 'bruto',
  },
  'comp-marco-de-pedra': {
    categoria: 'Mineral', origem: 'Pedra extraída, talhada e preparada para inscrições de fundação.', potencia: 2,
    afinidade: 'Nenhuma', propriedades: ['Resistente', 'Vinculante'], usos: ['ritual', 'engenharia', 'forja'], estadoBase: 'processado',
  },
  'comp-objeto-pessoal': {
    categoria: 'Artificial', origem: 'Objeto de uso contínuo entregue voluntariamente por seu dono.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Vinculante'], usos: ['ritual'], estadoBase: 'bruto',
  },
  'comp-papel-e-tinta': {
    categoria: 'Artificial', origem: 'Papel tratado e tinta preparados por um ofício ritualístico.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Arcano', 'Vinculante'], usos: ['ritual'], estadoBase: 'processado',
  },
  'comp-simbolo-pessoal': {
    categoria: 'Artificial', origem: 'Símbolo único entalhado para representar seu portador.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Vinculante'], usos: ['ritual'], estadoBase: 'processado',
  },
  'comp-receptor-inscrito': {
    categoria: 'Artificial', origem: 'Placa ou totem fabricado e gravado com runas de recepção.', potencia: 2,
    afinidade: 'Nenhuma', propriedades: ['Condutor', 'Canalizador'], usos: ['ritual', 'engenharia'], estadoBase: 'processado',
  },
  'comp-amostra-biologica': {
    categoria: 'Biológico', origem: 'Veneno ou tecido afetado por uma doença ativa, coletado e preservado.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Medicinal'], usos: ['ritual', 'alquimia'], estadoBase: 'processado',
  },
  'comp-ervas-comuns': {
    categoria: 'Botânico', origem: 'Mercados, hortas e florestas de clima temperado.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Medicinal'], usos: ['ritual', 'alquimia', 'cozinha'], estadoBase: 'bruto',
  },
  'comp-material-medicinal': {
    categoria: 'Artificial', origem: 'Ataduras, pomadas e reagentes reunidos por curandeiro ou boticário.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Medicinal'], usos: ['ritual', 'alquimia'], estadoBase: 'processado',
  },
  'comp-objeto-valor-pessoal': {
    categoria: 'Artificial', origem: 'Bem escolhido por seu valor afetivo real para o ofertante.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Anímico', 'Vinculante'], usos: ['ritual'], estadoBase: 'bruto',
  },
  'comp-materiais-diversos': {
    categoria: 'Artificial', origem: 'Lote preparado com materiais queimáveis de origens diferentes.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Inflamável'], usos: ['ritual', 'alquimia', 'engenharia'], estadoBase: 'processado',
  },
  'comp-amostra-elemental': {
    categoria: 'Arcano', origem: 'Fenômeno de um dos sete elementos capturado e estabilizado.', potencia: 3,
    afinidade: 'Escolha na compra', propriedades: ['Arcano', 'Canalizador', 'Estável'], usos: ['ritual', 'alquimia', 'engenharia', 'forja'], estadoBase: 'processado',
  },
  'comp-metal-para-forja': {
    categoria: 'Mineral', origem: 'Metal minerado, fundido e separado em barras próprias para forja.', potencia: 2,
    afinidade: 'Nenhuma', propriedades: ['Resistente', 'Condutor'], usos: ['engenharia', 'forja'], estadoBase: 'processado',
  },
  'comp-ancora-de-pedra': {
    categoria: 'Mineral', origem: 'Pedra talhada para cravação e ancoragem de terreno.', potencia: 2,
    afinidade: 'Nenhuma', propriedades: ['Resistente', 'Vinculante'], usos: ['ritual', 'engenharia', 'forja'], estadoBase: 'processado',
  },
  'comp-objeto-fixo': {
    categoria: 'Artificial', origem: 'Marco, estaca ou placa preparados para permanecer no mesmo lugar.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Resistente', 'Vinculante'], usos: ['ritual', 'engenharia'], estadoBase: 'processado',
  },
  'comp-recipiente-selavel': {
    categoria: 'Artificial', origem: 'Recipiente fabricado com fechamento hermético.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Isolante', 'Conservante'], usos: ['ritual', 'alquimia', 'engenharia', 'cozinha'], estadoBase: 'processado',
  },
  'comp-ampulheta-graduada': {
    categoria: 'Artificial', origem: 'Instrumento de medição fabricado e graduado com precisão.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Estável', 'Vinculante'], usos: ['ritual', 'engenharia'], estadoBase: 'processado',
  },
  'comp-cinza-fria': {
    categoria: 'Mineral', origem: 'Fogueira extinta há dias, depois de perder todo o calor.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Absorvente'], usos: ['ritual', 'alquimia'], estadoBase: 'bruto',
  },
  'comp-pertence-pessoal': {
    categoria: 'Artificial', origem: 'Objeto de uso cotidiano preservado depois da morte de seu dono.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Anímico', 'Vinculante'], usos: ['ritual'], estadoBase: 'bruto',
  },
  'comp-vestigio-material': {
    categoria: 'Arcano', origem: 'Fragmento arrancado diretamente de praga, maldição ou invocação persistente.', potencia: 3,
    afinidade: 'Nenhuma', propriedades: ['Corruptor', 'Vinculante'], usos: ['ritual', 'alquimia'], estadoBase: 'bruto',
  },
  'comp-ferramentas-bancada': {
    categoria: 'Artificial', origem: 'Kit fabricado de chaves, pinças e soldadores de manutenção.', potencia: 1,
    afinidade: 'Nenhuma', propriedades: ['Resistente'], usos: ['engenharia', 'forja'], estadoBase: 'processado',
  },
  'comp-nucleo-tecnologico': {
    categoria: 'Artificial', origem: 'Componente central refinado sob o protocolo tecnológico A.X.I.S.', potencia: 3,
    afinidade: 'Nenhuma', propriedades: ['Arcano', 'Canalizador', 'Condutor'], usos: ['ritual', 'engenharia'], estadoBase: 'refinado',
  },
  'comp-emissor-axis': {
    categoria: 'Artificial', origem: 'Transmissor A.X.I.S fabricado para projetar campo de interferência.', potencia: 2,
    afinidade: 'Nenhuma', propriedades: ['Condutor', 'Isolante'], usos: ['ritual', 'engenharia'], estadoBase: 'processado',
  },
  'comp-pecas-mecanicas': {
    categoria: 'Artificial', origem: 'Engrenagens, hastes e placas usinadas para montagem compatível.', potencia: 2,
    afinidade: 'Nenhuma', propriedades: ['Resistente', 'Flexível'], usos: ['engenharia', 'forja'], estadoBase: 'processado',
  },
  'comp-simbolo-pecado': {
    categoria: 'Artificial', origem: 'Símbolo único entalhado e refinado sob rito de um dos Sete Pecados.', potencia: 4,
    afinidade: 'Nenhuma', propriedades: ['Arcano', 'Corruptor', 'Vinculante'], usos: ['ritual'], estadoBase: 'refinado',
  },
  'comp-simbolo-virtude': {
    categoria: 'Artificial', origem: 'Símbolo único entalhado e refinado sob rito de uma das Sete Virtudes.', potencia: 4,
    afinidade: 'Nenhuma', propriedades: ['Arcano', 'Purificador', 'Vinculante'], usos: ['ritual'], estadoBase: 'refinado',
  },
};

const novosMateriaisFase5 = [
  {
    tipo: 'drop', id: 'mat-minerio-de-ferro', titulo: 'Minério de Ferro',
    conteudo: {
      descricao: 'Rocha ferrífera separada para fundição, ainda com impurezas naturais.',
      preco: { Lunaris: 8 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Mineral', origem: 'Veios superficiais e minas de ferro.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Resistente'], usos: ['engenharia', 'forja'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-cobre-nativo', titulo: 'Cobre Nativo',
    conteudo: {
      descricao: 'Fragmento de cobre pouco oxidado, apropriado para fios, contatos e ligas simples.',
      preco: { Lunaris: 10 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Mineral', origem: 'Veios de cobre expostos ou escavações rasas.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Condutor'], usos: ['engenharia', 'forja'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-quartzo-estavel', titulo: 'Quartzo Estável',
    conteudo: {
      descricao: 'Cristal selecionado por estrutura uniforme, capaz de conduzir energia sem afinidade elemental própria.',
      preco: { Lunaris: 25 }, raridade: 'incomum', nivelMinimoLoja: 1,
      categoria: 'Mineral', origem: 'Bolsões cristalinos preservados de fraturas e contaminação.', potencia: 2,
      afinidade: 'Nenhuma', propriedades: ['Estável', 'Canalizador'], usos: ['ritual', 'alquimia', 'engenharia'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-sal-purificador', titulo: 'Sal Purificador',
    conteudo: {
      descricao: 'Sal mineral limpo e seco, usado para conservar alimentos e delimitar preparações rituais.',
      preco: { Lunaris: 5 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Mineral', origem: 'Salinas e depósitos minerais livres de matéria orgânica.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Purificador'], usos: ['ritual', 'alquimia', 'cozinha'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-carvao-mineral', titulo: 'Carvão Mineral',
    conteudo: {
      descricao: 'Combustível fóssil seco, separado em porções uniformes para fornos e mecanismos térmicos.',
      preco: { Lunaris: 6 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Mineral', origem: 'Camadas sedimentares subterrâneas.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Inflamável'], usos: ['alquimia', 'engenharia', 'forja'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-liga-de-aco', titulo: 'Liga de Aço',
    conteudo: {
      descricao: 'Aço preparado em barras e chapas, compatível com armas, armaduras e estruturas reforçadas.',
      preco: { Lunaris: 35 }, raridade: 'incomum', nivelMinimoLoja: 1,
      categoria: 'Artificial', origem: 'Fundição controlada de ferro e carbono.', potencia: 2,
      afinidade: 'Nenhuma', propriedades: ['Resistente'], usos: ['engenharia', 'forja'], estadoBase: 'processado',
    },
  },
  {
    tipo: 'drop', id: 'mat-fio-condutor-isolado', titulo: 'Fio Condutor Isolado',
    conteudo: {
      descricao: 'Fio metálico revestido para transportar carga com menor risco de contato acidental.',
      preco: { Lunaris: 22 }, raridade: 'incomum', nivelMinimoLoja: 1,
      categoria: 'Artificial', origem: 'Oficinas de enrolamento e isolamento elétrico.', potencia: 2,
      afinidade: 'Nenhuma', propriedades: ['Condutor', 'Isolante'], usos: ['engenharia'], estadoBase: 'processado',
    },
  },
  {
    tipo: 'drop', id: 'mat-vidro-alquimico', titulo: 'Vidro Alquímico',
    conteudo: {
      descricao: 'Vidro de composição uniforme, moldado para suportar misturas e fluxos energéticos controlados.',
      preco: { Lunaris: 20 }, raridade: 'incomum', nivelMinimoLoja: 1,
      categoria: 'Artificial', origem: 'Vidrarias especializadas e bancadas alquímicas.', potencia: 2,
      afinidade: 'Nenhuma', propriedades: ['Isolante', 'Estável'], usos: ['ritual', 'alquimia', 'engenharia'], estadoBase: 'processado',
    },
  },
  {
    tipo: 'drop', id: 'mat-tecido-reforcado', titulo: 'Tecido Reforçado',
    conteudo: {
      descricao: 'Trama de fibras sobrepostas que preserva mobilidade enquanto distribui tração e impacto.',
      preco: { Lunaris: 18 }, raridade: 'incomum', nivelMinimoLoja: 1,
      categoria: 'Artificial', origem: 'Tecelagens equipadas para laminar e costurar múltiplas camadas.', potencia: 2,
      afinidade: 'Nenhuma', propriedades: ['Flexível', 'Resistente'], usos: ['engenharia', 'forja'], estadoBase: 'processado',
    },
  },
  {
    tipo: 'drop', id: 'mat-carga-estabilizada', titulo: 'Carga Estabilizada',
    conteudo: {
      descricao: 'Carga explosiva refinada com invólucro e iniciador separados, segura apenas enquanto montada corretamente.',
      preco: { Lunaris: 80 }, raridade: 'raro', nivelMinimoLoja: 2,
      categoria: 'Artificial', origem: 'Oficinas licenciadas para fabricar demolição controlada.', potencia: 3,
      afinidade: 'Nenhuma', propriedades: ['Explosivo', 'Estável'], usos: ['engenharia'], estadoBase: 'refinado',
    },
  },
  {
    tipo: 'drop', id: 'mat-resina-vegetal', titulo: 'Resina Vegetal',
    conteudo: {
      descricao: 'Seiva espessa que endurece ao ar, útil para vedar, aderir e isolar peças simples.',
      preco: { Lunaris: 5 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Botânico', origem: 'Cascas de árvores resinosas colhidas sem destruir a planta.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Isolante'], usos: ['alquimia', 'engenharia', 'forja'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-fibra-vegetal', titulo: 'Fibra Vegetal',
    conteudo: {
      descricao: 'Feixe de fibras longas, seco e limpo para cordames, tecidos e amarrações.',
      preco: { Lunaris: 4 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Botânico', origem: 'Caules fibrosos cultivados e desfibrados manualmente.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Flexível'], usos: ['engenharia', 'forja'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-musgo-absorvente', titulo: 'Musgo Absorvente',
    conteudo: {
      descricao: 'Musgo seco capaz de reter líquidos em volume útil para filtros e preparações.',
      preco: { Lunaris: 3 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Botânico', origem: 'Pedras úmidas e troncos de matas sombreadas.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Absorvente'], usos: ['alquimia', 'engenharia'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-raiz-fortificante', titulo: 'Raiz Fortificante',
    conteudo: {
      descricao: 'Raiz densa de sabor amargo, reservada para tônicos e refeições de recuperação.',
      preco: { Lunaris: 18 }, raridade: 'incomum', nivelMinimoLoja: 1,
      categoria: 'Botânico', origem: 'Cultivos de sombra colhidos apenas após maturação completa.', potencia: 2,
      afinidade: 'Nenhuma', propriedades: ['Fortificante'], usos: ['alquimia', 'cozinha'], estadoBase: 'bruto',
    },
  },
  {
    tipo: 'drop', id: 'mat-flor-medicinal', titulo: 'Flor Medicinal',
    conteudo: {
      descricao: 'Flores secas de uso medicinal, selecionadas antes de perderem seus compostos ativos.',
      preco: { Lunaris: 4 }, raridade: 'comum', nivelMinimoLoja: 1,
      categoria: 'Botânico', origem: 'Jardins medicinais e clareiras de clima ameno.', potencia: 1,
      afinidade: 'Nenhuma', propriedades: ['Medicinal'], usos: ['ritual', 'alquimia', 'cozinha'], estadoBase: 'bruto',
    },
  },
];

function mantimento({
  id,
  titulo,
  descricao,
  preco,
  raridade,
  nivelMinimoLoja,
  categoria,
  origem,
  propriedades,
  estadoBase = 'bruto',
  afinidade = 'Nenhuma',
}) {
  return {
    tipo: 'drop',
    id,
    titulo,
    conteudo: {
      descricao,
      preco,
      raridade,
      nivelMinimoLoja,
      categoria,
      origem,
      potencia: potenciaPorRaridade[raridade],
      afinidade,
      propriedades,
      usos: ['cozinha'],
      estadoBase,
    },
  };
}

// Catálogo exclusivo do Chef: ingredientes de cozinha, sem reaproveitar reagentes alquímicos.
const novosMateriaisCozinha = [
  mantimento({
    id: 'mat-cereais-secos', titulo: 'Cereais Secos', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Grãos limpos e secos para farinhas, mingaus, massas e acompanhamentos.', preco: { Lunaris: 3 },
    categoria: 'Botânico', origem: 'Lavouras de trigo, arroz, milho e aveia.', propriedades: ['Nutritivo'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-legumes-frescos', titulo: 'Legumes Frescos', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Legumes firmes para sopas, ensopados, assados e recheios.', preco: { Lunaris: 4 },
    categoria: 'Botânico', origem: 'Hortas, fazendas e mercados de alimentos frescos.', propriedades: ['Nutritivo'],
  }),
  mantimento({
    id: 'mat-frutas-da-estacao', titulo: 'Frutas da Estação', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Frutas maduras para bebidas, doces, molhos e refeições leves.', preco: { Lunaris: 5 },
    categoria: 'Botânico', origem: 'Pomares e áreas de coleta durante a estação adequada.', propriedades: ['Nutritivo', 'Vital'],
  }),
  mantimento({
    id: 'mat-leite-conservado', titulo: 'Leite Conservado', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Leite tratado para transporte, usado em cremes, massas e molhos.', preco: { Lunaris: 6 },
    categoria: 'Biológico', origem: 'Criações leiteiras com conservação adequada.', propriedades: ['Fortificante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-ovos-de-criacao', titulo: 'Ovos de Criação', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Ovos frescos para massas, recheios, caldos e refeições completas.', preco: { Lunaris: 5 },
    categoria: 'Biológico', origem: 'Aviários e pequenas criações locais.', propriedades: ['Nutritivo', 'Vital'],
  }),
  mantimento({
    id: 'mat-farinha-de-trigo', titulo: 'Farinha de Trigo', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Farinha fina usada em pães, massas, bolos e empanados.', preco: { Lunaris: 3 },
    categoria: 'Botânico', origem: 'Moinhos abastecidos por lavouras de trigo.', propriedades: ['Nutritivo'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-arroz-branco', titulo: 'Arroz Branco', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Grãos polidos de preparo rápido e combinação versátil.', preco: { Lunaris: 3 },
    categoria: 'Botânico', origem: 'Campos alagados e armazéns de grãos.', propriedades: ['Nutritivo'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-feijao-seco', titulo: 'Feijão Seco', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Grãos secos para caldos, ensopados e acompanhamentos reforçados.', preco: { Lunaris: 4 },
    categoria: 'Botânico', origem: 'Lavouras de leguminosas e despensas bem ventiladas.', propriedades: ['Nutritivo', 'Fortificante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-batatas', titulo: 'Batatas', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Tubérculos para purês, sopas, assados e frituras.', preco: { Lunaris: 3 },
    categoria: 'Botânico', origem: 'Hortas de clima ameno e depósitos secos.', propriedades: ['Nutritivo'],
  }),
  mantimento({
    id: 'mat-cebolas', titulo: 'Cebolas', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Bulbos aromáticos usados como base de molhos, caldos e refogados.', preco: { Lunaris: 2 },
    categoria: 'Botânico', origem: 'Hortas e mercados de toda vila abastecida.', propriedades: ['Nutritivo'],
  }),
  mantimento({
    id: 'mat-alho', titulo: 'Alho', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Dentes de aroma forte para temperos, marinadas e conservas.', preco: { Lunaris: 2 },
    categoria: 'Botânico', origem: 'Hortas secas e tranças armazenadas em despensas.', propriedades: ['Medicinal', 'Estimulante'],
  }),
  mantimento({
    id: 'mat-tomates', titulo: 'Tomates', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Frutos maduros usados em molhos, sopas, saladas e recheios.', preco: { Lunaris: 4 },
    categoria: 'Botânico', origem: 'Hortas ensolaradas e mercados locais.', propriedades: ['Nutritivo', 'Vital'],
  }),
  mantimento({
    id: 'mat-folhas-verdes', titulo: 'Folhas Verdes', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Verduras frescas para saladas, refogados e guarnições.', preco: { Lunaris: 3 },
    categoria: 'Botânico', origem: 'Hortas irrigadas e cultivos de meia-sombra.', propriedades: ['Nutritivo', 'Medicinal'],
  }),
  mantimento({
    id: 'mat-cogumelos-comuns', titulo: 'Cogumelos Comuns', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Fungos comestíveis de sabor terroso para molhos, recheios e ensopados.', preco: { Lunaris: 5 },
    categoria: 'Botânico', origem: 'Bosques úmidos e cultivos protegidos.', propriedades: ['Nutritivo'],
  }),
  mantimento({
    id: 'mat-carne-bovina', titulo: 'Carne Bovina', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Cortes de gado preparados para grelha, panela ou assado.', preco: { Lunaris: 9 },
    categoria: 'Biológico', origem: 'Rebanhos de fazendas e açougues fiscalizados.', propriedades: ['Nutritivo', 'Fortificante'],
  }),
  mantimento({
    id: 'mat-carne-suina', titulo: 'Carne Suína', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Cortes suínos para assados, ensopados, defumados e recheios.', preco: { Lunaris: 8 },
    categoria: 'Biológico', origem: 'Criações rurais e açougues locais.', propriedades: ['Nutritivo', 'Fortificante'],
  }),
  mantimento({
    id: 'mat-carne-de-caca', titulo: 'Carne de Caça', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Cortes de animais de caça adequados a marinadas e cozimentos longos.', preco: { Lunaris: 10 },
    categoria: 'Biológico', origem: 'Caçadores licenciados e postos de estrada.', propriedades: ['Nutritivo', 'Fortificante'],
  }),
  mantimento({
    id: 'mat-aves-preparadas', titulo: 'Aves Preparadas', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Aves limpas e porcionadas para caldos, assados e frituras.', preco: { Lunaris: 7 },
    categoria: 'Biológico', origem: 'Aviários e pequenos criadores.', propriedades: ['Nutritivo'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-peixe-fresco', titulo: 'Peixe Fresco', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Peixes limpos para grelha, sopas, ensopados e conserva.', preco: { Lunaris: 8 },
    categoria: 'Biológico', origem: 'Rios, lagos e mercados de pesca do mesmo dia.', propriedades: ['Nutritivo', 'Vital'],
  }),
  mantimento({
    id: 'mat-manteiga', titulo: 'Manteiga', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Gordura láctea para massas, molhos, frituras e finalizações.', preco: { Lunaris: 6 },
    categoria: 'Biológico', origem: 'Leiterias e cozinhas de fazenda.', propriedades: ['Nutritivo'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-queijo-curado', titulo: 'Queijo Curado', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Queijo firme para gratinar, rechear ou servir em fatias.', preco: { Lunaris: 7 },
    categoria: 'Biológico', origem: 'Queijarias rurais e adegas de maturação curta.', propriedades: ['Nutritivo', 'Conservante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-acucar-mascavo', titulo: 'Açúcar Mascavo', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Açúcar de sabor encorpado para doces, bebidas e caramelização.', preco: { Lunaris: 4 },
    categoria: 'Botânico', origem: 'Engenhos de cana e mercados de especiarias.', propriedades: ['Nutritivo', 'Estimulante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-sal-de-cozinha', titulo: 'Sal de Cozinha', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Sal limpo e moído para temperar, curar carnes e fazer conservas.', preco: { Lunaris: 2 },
    categoria: 'Mineral', origem: 'Salinas culinárias e casas de moagem.', propriedades: ['Conservante', 'Purificador'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-ervas-aromaticas', titulo: 'Ervas Aromáticas', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Mistura de ervas culinárias para temperar carnes, caldos e molhos.', preco: { Lunaris: 4 },
    categoria: 'Botânico', origem: 'Hortas culinárias e bancas de temperos.', propriedades: ['Estimulante', 'Medicinal'],
  }),
  mantimento({
    id: 'mat-oleo-vegetal', titulo: 'Óleo Vegetal', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Óleo prensado para frituras, marinadas, massas e molhos.', preco: { Lunaris: 5 },
    categoria: 'Botânico', origem: 'Prensas de sementes e frutos oleaginosos.', propriedades: ['Nutritivo'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-caldo-concentrado', titulo: 'Caldo Concentrado', raridade: 'comum', nivelMinimoLoja: 1,
    descricao: 'Base reduzida de legumes e carnes para sopas, molhos e ensopados.', preco: { Lunaris: 6 },
    categoria: 'Artificial', origem: 'Cozinhas profissionais e casas de conserva.', propriedades: ['Nutritivo', 'Conservante'], estadoBase: 'processado',
  }),

  mantimento({
    id: 'mat-mel-silvestre', titulo: 'Mel Silvestre', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Mel aromático usado como adoçante, glaceado e conservante natural.', preco: { Lunaris: 22 },
    categoria: 'Botânico', origem: 'Colmeias alimentadas por flora rara e sazonal.', propriedades: ['Nutritivo', 'Conservante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-trufa-negra', titulo: 'Trufa Negra', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Fungo subterrâneo de aroma intenso para pratos refinados.', preco: { Lunaris: 45 },
    categoria: 'Botânico', origem: 'Bosques antigos, localizada por animais treinados.', propriedades: ['Nutritivo', 'Estimulante'],
  }),
  mantimento({
    id: 'mat-acafrao-rubro', titulo: 'Açafrão Rubro', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Estigmas de aroma profundo que tingem arroz, caldos e molhos de vermelho.', preco: { Lunaris: 38 },
    categoria: 'Botânico', origem: 'Campos secos cultivados por poucas famílias de especiarias.', propriedades: ['Estimulante', 'Medicinal'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-pimenta-ignea', titulo: 'Pimenta Ígnea', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Pimenta que conserva calor por horas e exige dosagem cuidadosa.', preco: { Lunaris: 30 },
    categoria: 'Botânico', origem: 'Encostas quentes próximas a veios vulcânicos.', propriedades: ['Estimulante', 'Conservante'], afinidade: 'Fogo',
  }),
  mantimento({
    id: 'mat-cogumelo-lunar', titulo: 'Cogumelo Lunar', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Cogumelo pálido de sabor delicado que cresce apenas sob luar direto.', preco: { Lunaris: 34 },
    categoria: 'Botânico', origem: 'Clareiras úmidas colhidas durante noites sem nuvens.', propriedades: ['Nutritivo', 'Medicinal'], afinidade: 'Luz',
  }),
  mantimento({
    id: 'mat-queijo-da-caverna', titulo: 'Queijo da Caverna', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Queijo maturado em grutas frias, de casca firme e sabor mineral.', preco: { Lunaris: 40 },
    categoria: 'Biológico', origem: 'Adegas subterrâneas mantidas por mestres queijeiros.', propriedades: ['Nutritivo', 'Conservante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-carne-de-javali-real', titulo: 'Carne de Javali Real', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Corte marmorizado de javali de grande porte, ideal para assados longos.', preco: { Lunaris: 55 },
    categoria: 'Biológico', origem: 'Reservas nobres e florestas de caça controlada.', propriedades: ['Nutritivo', 'Fortificante'],
  }),
  mantimento({
    id: 'mat-fruta-nevaria', titulo: 'Fruta Nevária', raridade: 'incomum', nivelMinimoLoja: 1,
    descricao: 'Fruta azul e crocante que permanece gelada mesmo fora da neve.', preco: { Lunaris: 28 },
    categoria: 'Botânico', origem: 'Pomares de altitude cobertos por neve quase todo o ano.', propriedades: ['Vital', 'Conservante'], afinidade: 'Água',
  }),

  mantimento({
    id: 'mat-sal-safira', titulo: 'Sal Safira das Profundezas', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Cristais azuis que realçam frutos do mar e preservam o frescor do prato.', preco: { Lunaris: 120 },
    categoria: 'Mineral', origem: 'Salinas submersas acessíveis apenas na maré mais baixa.', propriedades: ['Conservante', 'Purificador'], afinidade: 'Água', estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-file-de-kraken-jovem', titulo: 'Filé de Kraken Jovem', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Carne marinha firme que amacia somente com corte e cocção precisos.', preco: { Lunaris: 210 },
    categoria: 'Biológico', origem: 'Tentáculos de krakens jovens capturados em mar aberto.', propriedades: ['Nutritivo', 'Fortificante'], afinidade: 'Água',
  }),
  mantimento({
    id: 'mat-ovas-de-serpente-marinha', titulo: 'Ovas de Serpente Marinha', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Ovas salgadas de sabor intenso, servidas em pequenas porções ou molhos.', preco: { Lunaris: 190 },
    categoria: 'Biológico', origem: 'Ninhos costeiros recolhidos sem destruir a ninhada.', propriedades: ['Nutritivo', 'Vital'], afinidade: 'Água', estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-trufa-feerica', titulo: 'Trufa Feérica', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Trufa perfumada cujo sabor muda conforme os demais ingredientes do prato.', preco: { Lunaris: 230 },
    categoria: 'Arcano', origem: 'Círculos de cogumelos em bosques tocados por magia feérica.', propriedades: ['Estimulante', 'Amplificador'], estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-pimenta-sangue-doce', titulo: 'Pimenta de Sangue-Doce', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Pimenta vermelha que combina ardência inicial com final adocicado.', preco: { Lunaris: 150 },
    categoria: 'Botânico', origem: 'Estufas aquecidas com terra rica em ferro.', propriedades: ['Estimulante', 'Vital'], afinidade: 'Fogo',
  }),
  mantimento({
    id: 'mat-queijo-de-leite-de-grifo', titulo: 'Queijo de Leite de Grifo', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Queijo aerado e picante, maturado em correntes de vento de altitude.', preco: { Lunaris: 240 },
    categoria: 'Biológico', origem: 'Criadores de grifos treinados nas montanhas.', propriedades: ['Nutritivo', 'Fortificante'], afinidade: 'Ar', estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-vinho-vinhas-sussurrantes', titulo: 'Vinho das Vinhas Sussurrantes', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Vinho aromático usado em reduções, marinadas e sobremesas.', preco: { Lunaris: 180 },
    categoria: 'Botânico', origem: 'Vinhedos antigos onde o vento nunca cessa.', propriedades: ['Estimulante', 'Conservante'], estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-cogumelo-estelar', titulo: 'Cogumelo Estelar', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Fungo salpicado de luz, de sabor terroso e leve efeito revigorante.', preco: { Lunaris: 200 },
    categoria: 'Arcano', origem: 'Cavernas abertas ao céu durante chuvas de estrelas.', propriedades: ['Medicinal', 'Vital'], afinidade: 'Luz',
  }),
  mantimento({
    id: 'mat-mel-abelha-rainha-gigante', titulo: 'Mel de Abelha-Rainha Gigante', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Mel espesso de doçura floral, capaz de conservar sobremesas por meses.', preco: { Lunaris: 240 },
    categoria: 'Biológico', origem: 'Colmeias gigantes coletadas por apicultores protegidos.', propriedades: ['Regenerativo', 'Conservante'], estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-baunilha-de-nevoa', titulo: 'Baunilha de Névoa', raridade: 'raro', nivelMinimoLoja: 2,
    descricao: 'Vagem de perfume frio usada em cremes, bebidas e sobremesas delicadas.', preco: { Lunaris: 170 },
    categoria: 'Botânico', origem: 'Orquidários escondidos em florestas permanentemente enevoadas.', propriedades: ['Estimulante', 'Conservante'], afinidade: 'Ar', estadoBase: 'processado',
  }),

  mantimento({
    id: 'mat-caviar-de-leviata', titulo: 'Caviar de Leviatã', raridade: 'epico', nivelMinimoLoja: 3,
    descricao: 'Ovas enormes e delicadas, tratadas por dias antes de poderem ser servidas.', preco: { Solares: 7 },
    categoria: 'Biológico', origem: 'Leviatãs migratórios que deixam ovas em fossas oceânicas.', propriedades: ['Nutritivo', 'Amplificador', 'Vital'], afinidade: 'Água', estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-acafrao-da-aurora', titulo: 'Açafrão da Aurora', raridade: 'epico', nivelMinimoLoja: 3,
    descricao: 'Especiaria luminosa que colore o prato como o céu do amanhecer.', preco: { Solares: 6 },
    categoria: 'Arcano', origem: 'Flores colhidas no instante exato do primeiro raio solar.', propriedades: ['Estimulante', 'Purificador', 'Amplificador'], afinidade: 'Luz', estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-carne-de-hidra-curada', titulo: 'Carne de Hidra Curada', raridade: 'epico', nivelMinimoLoja: 3,
    descricao: 'Carne regenerativa tornada segura por um longo processo de cura e defumação.', preco: { Solares: 10 },
    categoria: 'Biológico', origem: 'Hidras abatidas e processadas por açougueiros especializados.', propriedades: ['Regenerativo', 'Fortificante', 'Conservante'], estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-fruto-do-sol-nascente', titulo: 'Fruto do Sol Nascente', raridade: 'epico', nivelMinimoLoja: 3,
    descricao: 'Fruto dourado de polpa quente, usado em molhos agridoces e sobremesas.', preco: { Solares: 8 },
    categoria: 'Botânico', origem: 'Pomares plantados acima das nuvens e voltados para o leste.', propriedades: ['Vital', 'Regenerativo', 'Estimulante'], afinidade: 'Fogo',
  }),
  mantimento({
    id: 'mat-trufa-jardim-eterno', titulo: 'Trufa do Jardim Eterno', raridade: 'epico', nivelMinimoLoja: 3,
    descricao: 'Trufa de aroma mutável que amadurece sem nunca apodrecer.', preco: { Solares: 9 },
    categoria: 'Espiritual', origem: 'Jardins isolados onde as estações deixaram de passar.', propriedades: ['Conservante', 'Amplificador', 'Nutritivo'], afinidade: 'Terra',
  }),
  mantimento({
    id: 'mat-canela-arvore-imortal', titulo: 'Canela da Árvore Imortal', raridade: 'epico', nivelMinimoLoja: 3,
    descricao: 'Casca aromática que aquece bebidas e prolonga o vigor de quem as consome.', preco: { Solares: 8 },
    categoria: 'Botânico', origem: 'Galhos cedidos por árvores ancestrais que nunca secam.', propriedades: ['Fortificante', 'Regenerativo', 'Conservante'], afinidade: 'Terra', estadoBase: 'processado',
  }),

  mantimento({
    id: 'mat-maca-dourada-eden', titulo: 'Maçã Dourada do Éden', raridade: 'lendario', nivelMinimoLoja: 4,
    descricao: 'Fruto perfeito cuja polpa recupera o sabor mais feliz da memória de quem a prova.', preco: { Solares: 40 },
    categoria: 'Espiritual', origem: 'Pomares ocultos nas fronteiras do Éden.', propriedades: ['Regenerativo', 'Vital', 'Amplificador'], afinidade: 'Luz',
  }),
  mantimento({
    id: 'mat-cacau-arvore-primordial', titulo: 'Cacau da Árvore Primordial', raridade: 'lendario', nivelMinimoLoja: 4,
    descricao: 'Amêndoas de cacau que concentram sabores de incontáveis colheitas.', preco: { Solares: 28 },
    categoria: 'Botânico', origem: 'Uma única árvore anterior aos primeiros jardins cultivados.', propriedades: ['Estimulante', 'Vital', 'Amplificador'], afinidade: 'Terra', estadoBase: 'processado',
  }),
  mantimento({
    id: 'mat-sal-primeiro-oceano', titulo: 'Sal do Primeiro Oceano', raridade: 'lendario', nivelMinimoLoja: 4,
    descricao: 'Cristais intactos do mar original, usados um grão por vez.', preco: { Solares: 25 },
    categoria: 'Mineral', origem: 'Bolsões selados desde a formação do primeiro oceano.', propriedades: ['Purificador', 'Conservante', 'Amplificador'], afinidade: 'Água', estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-mel-abelhas-celestiais', titulo: 'Mel das Abelhas Celestiais', raridade: 'lendario', nivelMinimoLoja: 4,
    descricao: 'Mel luminoso de doçura leve que não cristaliza nem perde o aroma.', preco: { Solares: 35 },
    categoria: 'Espiritual', origem: 'Colmeias suspensas entre as copas das Árvores cósmicas.', propriedades: ['Regenerativo', 'Conservante', 'Vital'], afinidade: 'Luz', estadoBase: 'refinado',
  }),
  mantimento({
    id: 'mat-uva-videira-imortal', titulo: 'Uva da Videira Imortal', raridade: 'lendario', nivelMinimoLoja: 4,
    descricao: 'Uva que amadurece por séculos sem cair, destinada a molhos e vinhos incomparáveis.', preco: { Solares: 32 },
    categoria: 'Botânico', origem: 'Videiras protegidas por gerações de guardiões.', propriedades: ['Conservante', 'Regenerativo', 'Amplificador'], afinidade: 'Terra',
  }),
  mantimento({
    id: 'mat-baunilha-ultima-lua', titulo: 'Baunilha da Última Lua', raridade: 'lendario', nivelMinimoLoja: 4,
    descricao: 'Vagem prateada cujo perfume permanece mesmo depois que o prato termina.', preco: { Solares: 30 },
    categoria: 'Arcano', origem: 'Orquídeas que florescem apenas sob a derradeira lua de um mundo.', propriedades: ['Estimulante', 'Conservante', 'Amplificador'], afinidade: 'Escuridão', estadoBase: 'refinado',
  }),
];

function pecaEngenharia({
  id,
  titulo,
  raridade,
  preco,
  origem,
  propriedades,
  descricao,
  categoria = 'Artificial',
  afinidade = 'Nenhuma',
  estadoBase = 'processado',
}) {
  return {
    tipo: 'drop',
    id,
    titulo,
    conteudo: {
      descricao: descricao ?? `${titulo} separado, revisado e pronto para montagem ou reparo de engenhocas.`,
      preco,
      raridade,
      nivelMinimoLoja: raridade === 'comum' || raridade === 'incomum' ? 1 : raridade === 'raro' ? 2 : raridade === 'epico' ? 3 : 4,
      categoria,
      origem,
      potencia: potenciaPorRaridade[raridade],
      afinidade,
      propriedades,
      usos: ['engenharia'],
      estadoBase,
    },
  };
}

// Catálogo exclusivo do Engenheiro: componentes de oficina, sem reagentes ou mantimentos reaproveitados.
const novosMateriaisEngenharia = [
  pecaEngenharia({ id: 'mat-parafusos-reaproveitados', titulo: 'Parafusos Reaproveitados', raridade: 'comum', preco: { Lunaris: 2 }, origem: 'Máquinas desmontadas e caixas de ferragens.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-porcas-arruelas', titulo: 'Porcas e Arruelas', raridade: 'comum', preco: { Lunaris: 2 }, origem: 'Oficinas, depósitos e mecanismos desmontados.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-engrenagens-ferro', titulo: 'Engrenagens de Ferro', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Relógios grandes, moinhos e caixas de transmissão.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-molas-aco', titulo: 'Molas de Aço', raridade: 'comum', preco: { Lunaris: 4 }, origem: 'Fechaduras, suspensões e mecanismos de disparo.', propriedades: ['Flexível', 'Resistente'] }),
  pecaEngenharia({ id: 'mat-placas-metalicas', titulo: 'Placas Metálicas', raridade: 'comum', preco: { Lunaris: 7 }, origem: 'Carcaças cortadas e chapas de oficina.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-fios-cobre', titulo: 'Fios de Cobre', raridade: 'comum', preco: { Lunaris: 4 }, origem: 'Motores, dínamos e instalações antigas.', propriedades: ['Condutor'], categoria: 'Mineral' }),
  pecaEngenharia({ id: 'mat-cabos-isolados-oficina', titulo: 'Cabos Isolados', raridade: 'comum', preco: { Lunaris: 6 }, origem: 'Painéis elétricos e equipamentos desmontados.', propriedades: ['Condutor', 'Isolante'] }),
  pecaEngenharia({ id: 'mat-rebites-industriais', titulo: 'Rebites Industriais', raridade: 'comum', preco: { Lunaris: 3 }, origem: 'Estaleiros, funilarias e pontes reparadas.', propriedades: ['Vinculante', 'Resistente'] }),
  pecaEngenharia({ id: 'mat-canos-curtos', titulo: 'Canos Curtos', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Tubulações substituídas e caldeiras quebradas.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-rolamentos', titulo: 'Rolamentos', raridade: 'comum', preco: { Lunaris: 6 }, origem: 'Rodas, eixos e máquinas rotativas.', propriedades: ['Estável'] }),
  pecaEngenharia({ id: 'mat-correntes-curtas', titulo: 'Correntes Curtas', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Guinchos, portões e equipamentos de carga.', propriedades: ['Resistente', 'Flexível'] }),
  pecaEngenharia({ id: 'mat-correias-borracha', titulo: 'Correias de Borracha', raridade: 'comum', preco: { Lunaris: 4 }, origem: 'Motores simples e esteiras de oficina.', propriedades: ['Flexível', 'Isolante'] }),
  pecaEngenharia({ id: 'mat-chapas-perfuradas', titulo: 'Chapas Perfuradas', raridade: 'comum', preco: { Lunaris: 6 }, origem: 'Prateleiras, filtros e painéis reaproveitados.', propriedades: ['Resistente', 'Flexível'] }),
  pecaEngenharia({ id: 'mat-dobradicas-reforcadas', titulo: 'Dobradiças Reforçadas', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Portas pesadas, baús e tampas industriais.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-lentes-vidro', titulo: 'Lentes de Vidro', raridade: 'comum', preco: { Lunaris: 6 }, origem: 'Lanternas, lunetas e instrumentos quebrados.', propriedades: ['Canalizador'], categoria: 'Artificial' }),
  pecaEngenharia({ id: 'mat-baterias-simples', titulo: 'Baterias Simples', raridade: 'comum', preco: { Lunaris: 8 }, origem: 'Ferramentas portáteis e aparelhos domésticos.', propriedades: ['Condutor', 'Estável'] }),
  pecaEngenharia({ id: 'mat-interruptores', titulo: 'Interruptores', raridade: 'comum', preco: { Lunaris: 3 }, origem: 'Painéis de controle e instalações elétricas.', propriedades: ['Condutor'] }),
  pecaEngenharia({ id: 'mat-valvulas', titulo: 'Válvulas', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Bombas, caldeiras e sistemas de pressão.', propriedades: ['Estável', 'Resistente'] }),
  pecaEngenharia({ id: 'mat-tubos-borracha', titulo: 'Tubos de Borracha', raridade: 'comum', preco: { Lunaris: 4 }, origem: 'Oficinas hidráulicas e equipamentos médicos velhos.', propriedades: ['Flexível', 'Isolante'] }),
  pecaEngenharia({ id: 'mat-motores-pequenos', titulo: 'Motores Pequenos', raridade: 'comum', preco: { Lunaris: 10 }, origem: 'Ventiladores, brinquedos mecânicos e ferramentas.', propriedades: ['Condutor', 'Resistente'] }),
  pecaEngenharia({ id: 'mat-madeira-tecnica', titulo: 'Madeira Técnica', raridade: 'comum', preco: { Lunaris: 4 }, origem: 'Caixas de transporte e bancadas desmontadas.', propriedades: ['Resistente', 'Isolante'], categoria: 'Botânico' }),
  pecaEngenharia({ id: 'mat-tecido-industrial', titulo: 'Tecido Industrial', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Correias, filtros e lonas de proteção.', propriedades: ['Flexível', 'Resistente'] }),
  pecaEngenharia({ id: 'mat-cola-mecanica', titulo: 'Cola Mecânica', raridade: 'comum', preco: { Lunaris: 5 }, origem: 'Tubos de adesivo recuperados de oficinas.', propriedades: ['Vinculante'] }),
  pecaEngenharia({ id: 'mat-sucata-chassi', titulo: 'Sucata de Chassi', raridade: 'comum', preco: { Lunaris: 9 }, origem: 'Veículos desmontados e estruturas acidentadas.', propriedades: ['Resistente'] }),
  pecaEngenharia({ id: 'mat-pecas-relogio', titulo: 'Peças de Relógio', raridade: 'comum', preco: { Lunaris: 7 }, origem: 'Relógios, cronômetros e mecanismos de precisão.', propriedades: ['Estável', 'Canalizador'] }),
  pecaEngenharia({ id: 'mat-carcacas-metalicas', titulo: 'Carcaças Metálicas', raridade: 'comum', preco: { Lunaris: 8 }, origem: 'Aparelhos quebrados e ferramentas sem conserto.', propriedades: ['Resistente', 'Isolante'] }),

  pecaEngenharia({ id: 'mat-servomotor-precisao', titulo: 'Servomotor de Precisão', raridade: 'incomum', preco: { Lunaris: 42 }, origem: 'Drones, autômatos e instrumentos finos.', propriedades: ['Estável', 'Condutor'] }),
  pecaEngenharia({ id: 'mat-placa-circuito', titulo: 'Placa de Circuito', raridade: 'incomum', preco: { Lunaris: 35 }, origem: 'Terminais, sensores e equipamentos eletrônicos.', propriedades: ['Condutor', 'Canalizador'] }),
  pecaEngenharia({ id: 'mat-bateria-fluxo', titulo: 'Bateria de Fluxo', raridade: 'incomum', preco: { Lunaris: 55 }, origem: 'Equipamentos arcanotecnológicos de uso profissional.', propriedades: ['Condutor', 'Canalizador', 'Estável'], categoria: 'Arcano' }),
  pecaEngenharia({ id: 'mat-sensor-optico', titulo: 'Sensor Óptico', raridade: 'incomum', preco: { Lunaris: 38 }, origem: 'Sistemas de vigilância e drones avariados.', propriedades: ['Canalizador', 'Estável'] }),
  pecaEngenharia({ id: 'mat-liga-leve', titulo: 'Liga Metálica Leve', raridade: 'incomum', preco: { Lunaris: 48 }, origem: 'Chassis de corrida e estruturas aeronáuticas.', propriedades: ['Resistente', 'Flexível'], categoria: 'Mineral' }),
  pecaEngenharia({ id: 'mat-atuador-hidraulico', titulo: 'Atuador Hidráulico', raridade: 'incomum', preco: { Lunaris: 50 }, origem: 'Guindastes, portas blindadas e máquinas de carga.', propriedades: ['Resistente', 'Amplificador'] }),
  pecaEngenharia({ id: 'mat-bobina-magnetica', titulo: 'Bobina Magnética', raridade: 'incomum', preco: { Lunaris: 44 }, origem: 'Geradores, alto-falantes e travas eletromagnéticas.', propriedades: ['Condutor', 'Canalizador'] }),
  pecaEngenharia({ id: 'mat-cristal-calibrado', titulo: 'Cristal Calibrado', raridade: 'incomum', preco: { Lunaris: 60 }, origem: 'Instrumentos arcanotécnicos ajustados em bancada.', propriedades: ['Canalizador', 'Estável'], categoria: 'Arcano', estadoBase: 'refinado' }),

  pecaEngenharia({ id: 'mat-processador-axis', titulo: 'Processador A.X.I.S.', raridade: 'raro', preco: { Lunaris: 220 }, origem: 'Terminais militares e laboratórios da A.X.I.S.', propriedades: ['Canalizador', 'Amplificador', 'Estável'] }),
  pecaEngenharia({ id: 'mat-giroscopio-arcano', titulo: 'Giroscópio Arcano', raridade: 'raro', preco: { Lunaris: 180 }, origem: 'Veículos dimensionais e plataformas autoestáveis.', propriedades: ['Estável', 'Canalizador'], categoria: 'Arcano' }),
  pecaEngenharia({ id: 'mat-celula-energia-elemental', titulo: 'Célula de Energia Elemental', raridade: 'raro', preco: { Lunaris: 200 }, origem: 'Geradores que aprisionam uma carga elemental controlada.', propriedades: ['Condutor', 'Amplificador', 'Estável'], categoria: 'Arcano', afinidade: 'Escolha na compra', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-lente-precisao-feerica', titulo: 'Lente de Precisão Feérica', raridade: 'raro', preco: { Lunaris: 160 }, origem: 'Oficinas feéricas que lapidam vidro sob ilusões controladas.', propriedades: ['Canalizador', 'Amplificador'], categoria: 'Arcano' }),
  pecaEngenharia({ id: 'mat-liga-titanio-astral', titulo: 'Liga de Titânio Astral', raridade: 'raro', preco: { Lunaris: 240 }, origem: 'Fundidoras que misturam titânio e metal meteórico.', propriedades: ['Resistente', 'Estável'], categoria: 'Mineral', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-servo-golem', titulo: 'Servo de Golem', raridade: 'raro', preco: { Lunaris: 190 }, origem: 'Articulações recuperadas de golens industriais.', propriedades: ['Resistente', 'Amplificador'], categoria: 'Artificial' }),
  pecaEngenharia({ id: 'mat-membrana-camuflagem', titulo: 'Membrana de Camuflagem', raridade: 'raro', preco: { Lunaris: 170 }, origem: 'Trajes furtivos e criaturas artificiais miméticas.', propriedades: ['Flexível', 'Canalizador'], categoria: 'Artificial' }),
  pecaEngenharia({ id: 'mat-condensador-tempestade', titulo: 'Condensador de Tempestade', raridade: 'raro', preco: { Lunaris: 210 }, origem: 'Torres que coletam descargas de tempestades arcanas.', propriedades: ['Condutor', 'Volátil', 'Amplificador'], categoria: 'Arcano', afinidade: 'Raio', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-nanofibra-regenerativa', titulo: 'Nanofibra Regenerativa', raridade: 'raro', preco: { Lunaris: 230 }, origem: 'Laboratórios de materiais autorreparáveis.', propriedades: ['Flexível', 'Regenerativo', 'Resistente'], categoria: 'Artificial', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-reator-eter-compacto', titulo: 'Reator de Éter Compacto', raridade: 'raro', preco: { Lunaris: 240 }, origem: 'Protótipos de energia arcanotecnológica portátil.', propriedades: ['Canalizador', 'Amplificador', 'Volátil'], categoria: 'Arcano', estadoBase: 'refinado' }),

  pecaEngenharia({ id: 'mat-coracao-mecanico-colosso', titulo: 'Coração Mecânico de Colosso', raridade: 'epico', preco: { Solares: 9 }, origem: 'Colossos artificiais desativados sem destruir o núcleo motor.', propriedades: ['Resistente', 'Amplificador', 'Condutor'], estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-matriz-dobra-espacial', titulo: 'Matriz de Dobra Espacial', raridade: 'epico', preco: { Solares: 10 }, origem: 'Portais colapsados e motores dimensionais experimentais.', propriedades: ['Canalizador', 'Amplificador', 'Volátil'], categoria: 'Arcano', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-engrenagem-temporal', titulo: 'Engrenagem Temporal', raridade: 'epico', preco: { Solares: 8 }, origem: 'Mecanismos encontrados dentro de bolsões de tempo interrompido.', propriedades: ['Estável', 'Amplificador', 'Canalizador'], categoria: 'Arcano', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-circuito-luz-solida', titulo: 'Circuito de Luz Sólida', raridade: 'epico', preco: { Solares: 7 }, origem: 'Projetores capazes de sustentar matéria luminosa.', propriedades: ['Canalizador', 'Condutor', 'Amplificador'], categoria: 'Arcano', afinidade: 'Luz', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-chassi-metal-vivo', titulo: 'Chassi de Metal Vivo', raridade: 'epico', preco: { Solares: 9 }, origem: 'Forjas arcanas onde o metal aprende a recompor a própria forma.', propriedades: ['Regenerativo', 'Flexível', 'Resistente'], categoria: 'Artificial', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-motor-gravidade', titulo: 'Motor de Gravidade', raridade: 'epico', preco: { Solares: 10 }, origem: 'Plataformas suspensas e naves de travessia entre Árvores.', propriedades: ['Canalizador', 'Amplificador', 'Estável'], categoria: 'Arcano', estadoBase: 'refinado' }),

  pecaEngenharia({ id: 'mat-motor-primeiro-automato', titulo: 'Motor do Primeiro Autômato', raridade: 'lendario', preco: { Solares: 30 }, origem: 'O autômato ancestral que serviu de molde para toda robótica posterior.', propriedades: ['Regenerativo', 'Amplificador', 'Estável'], estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-nucleo-estrela-engarrafada', titulo: 'Núcleo de Estrela Engarrafada', raridade: 'lendario', preco: { Solares: 40 }, origem: 'Reatores construídos ao redor de um fragmento estelar contido.', propriedades: ['Condutor', 'Amplificador', 'Volátil'], categoria: 'Arcano', afinidade: 'Fogo', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-engrenagem-relogio-mundo', titulo: 'Engrenagem do Relógio do Mundo', raridade: 'lendario', preco: { Solares: 35 }, origem: 'Máquinas cósmicas que regulam ciclos de um mundo inteiro.', propriedades: ['Estável', 'Amplificador', 'Vinculante'], categoria: 'Arcano', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-placa-metal-celestial', titulo: 'Placa de Metal Celestial', raridade: 'lendario', preco: { Solares: 28 }, origem: 'Armaduras de guardiões celestiais e destroços de cidadelas suspensas.', propriedades: ['Resistente', 'Purificador', 'Amplificador'], categoria: 'Mineral', afinidade: 'Luz', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-matriz-axis-primordial', titulo: 'Matriz A.X.I.S. Primordial', raridade: 'lendario', preco: { Solares: 38 }, origem: 'Protótipo anterior aos sistemas modernos da A.X.I.S.', propriedades: ['Canalizador', 'Amplificador', 'Estável'], categoria: 'Artificial', estadoBase: 'refinado' }),
  pecaEngenharia({ id: 'mat-coracao-maquina-divina', titulo: 'Coração de Máquina Divina', raridade: 'lendario', preco: { Solares: 40 }, origem: 'Mecanismos construídos por entidades capazes de fabricar leis físicas.', propriedades: ['Regenerativo', 'Amplificador', 'Canalizador'], categoria: 'Arcano', estadoBase: 'refinado' }),
];

function materialEspecializado({
  id,
  titulo,
  descricao,
  preco,
  raridade,
  uso,
  categoria,
  origem,
  propriedades,
  afinidade = 'Nenhuma',
  estadoBase = 'processado',
}) {
  return {
    tipo: 'drop',
    id,
    titulo,
    conteudo: {
      descricao,
      preco,
      raridade,
      nivelMinimoLoja: raridade === 'comum' || raridade === 'incomum' ? 1 : raridade === 'raro' ? 2 : raridade === 'epico' ? 3 : 4,
      categoria,
      origem,
      potencia: potenciaPorRaridade[raridade],
      afinidade,
      propriedades,
      usos: [uso],
      estadoBase,
    },
  };
}

const reagenteAlquimico = (dados) => materialEspecializado({ ...dados, uso: 'alquimia' });
const componenteRitualistico = (dados) => materialEspecializado({ ...dados, uso: 'ritual' });
const componenteVeicular = (dados) => materialEspecializado({ ...dados, uso: 'veiculos' });
const materiaPrima = (dados) => materialEspecializado({ ...dados, uso: 'forja' });

// Peças preparadas para manutenção de veículos. Elas não são Sucata de
// engenhoca: cada item foi revisado para casco, propulsão, navegação ou
// sistemas veiculares e entra somente no estoque de Componentes Veiculares.
const novosMateriaisVeiculares = [
  componenteVeicular({ id: 'mat-kit-vedacao-casco', titulo: 'Kit de Vedação de Casco', raridade: 'comum', preco: { Lunaris: 8 }, categoria: 'Artificial', origem: 'Estaleiros, docas e oficinas de funilaria.', propriedades: ['Isolante', 'Vinculante'], descricao: 'Juntas, selante e remendos para fechar vazamentos e pequenas aberturas no casco.' }),
  componenteVeicular({ id: 'mat-fluido-transmissao', titulo: 'Fluido de Transmissão', raridade: 'comum', preco: { Lunaris: 6 }, categoria: 'Artificial', origem: 'Postos de manutenção e oficinas de motores.', propriedades: ['Estável'], descricao: 'Fluido limpo usado para reduzir o desgaste de engrenagens, eixos e transmissões.' }),
  componenteVeicular({ id: 'mat-chicote-eletrico-reforcado', titulo: 'Chicote Elétrico Reforçado', raridade: 'comum', preco: { Lunaris: 10 }, categoria: 'Artificial', origem: 'Autoelétricas e oficinas de montagem veicular.', propriedades: ['Condutor', 'Isolante'], descricao: 'Conjunto de cabos marcados e protegidos para substituir a fiação de um veículo.' }),
  componenteVeicular({ id: 'mat-conjunto-filtros-veiculares', titulo: 'Conjunto de Filtros Veiculares', raridade: 'comum', preco: { Lunaris: 7 }, categoria: 'Artificial', origem: 'Garagens, hangares e depósitos de peças.', propriedades: ['Absorvente', 'Purificador'], descricao: 'Filtros de ar, óleo e combustível separados no tamanho certo para manutenção.' }),

  componenteVeicular({ id: 'mat-celula-combustivel-estavel', titulo: 'Célula de Combustível Estável', raridade: 'incomum', preco: { Lunaris: 55 }, categoria: 'Artificial', origem: 'Hangares e fábricas de sistemas de energia.', propriedades: ['Condutor', 'Estável'], descricao: 'Célula selada que alimenta motores e sistemas sem oscilar durante uma viagem.' }),
  componenteVeicular({ id: 'mat-atuador-hidraulico-selado', titulo: 'Atuador Hidráulico Selado', raridade: 'incomum', preco: { Lunaris: 48 }, categoria: 'Artificial', origem: 'Oficinas de máquinas pesadas e portos de carga.', propriedades: ['Resistente', 'Estável'], descricao: 'Pistão reforçado para direção, pouso, suspensão e outras partes que movem muito peso.' }),
  componenteVeicular({ id: 'mat-placa-navegacao-calibrada', titulo: 'Placa de Navegação Calibrada', raridade: 'incomum', preco: { Lunaris: 60 }, categoria: 'Artificial', origem: 'Laboratórios de navegação e veículos de exploração.', propriedades: ['Canalizador', 'Estável'], descricao: 'Placa revisada que mantém sensores, mapas e instrumentos de rota em acordo.' }),
  componenteVeicular({ id: 'mat-liga-casco-leve', titulo: 'Liga de Casco Leve', raridade: 'incomum', preco: { Lunaris: 58 }, categoria: 'Mineral', origem: 'Estaleiros aéreos e fábricas de veículos rápidos.', propriedades: ['Resistente', 'Flexível'], descricao: 'Chapa leve preparada para trocar partes do casco sem desequilibrar o veículo.' }),

  componenteVeicular({ id: 'mat-nucleo-giroscopico-calibrado', titulo: 'Núcleo Giroscópico Calibrado', raridade: 'raro', preco: { Lunaris: 210 }, categoria: 'Artificial', origem: 'Naves, mechas e plataformas de estabilização avançada.', propriedades: ['Estável', 'Canalizador'], estadoBase: 'refinado', descricao: 'Giroscópio de alta precisão que corrige inclinação e vibração durante manobras bruscas.' }),
  componenteVeicular({ id: 'mat-regulador-propulsao', titulo: 'Regulador de Propulsão', raridade: 'raro', preco: { Lunaris: 230 }, categoria: 'Artificial', origem: 'Motores de corrida e propulsores de longa distância.', propriedades: ['Condutor', 'Estável', 'Amplificador'], estadoBase: 'refinado', descricao: 'Regulador que distribui energia entre os propulsores sem deixar um deles sobrecarregar.' }),
  componenteVeicular({ id: 'mat-malha-casco-autorreparavel', titulo: 'Malha de Casco Autorreparável', raridade: 'raro', preco: { Lunaris: 240 }, categoria: 'Artificial', origem: 'Laboratórios de materiais vivos e frotas militares.', propriedades: ['Regenerativo', 'Flexível', 'Resistente'], estadoBase: 'refinado', descricao: 'Malha aplicada por baixo do casco que fecha trincas pequenas antes que elas aumentem.' }),
  componenteVeicular({ id: 'mat-condensador-escudo-veicular', titulo: 'Condensador de Escudo Veicular', raridade: 'raro', preco: { Lunaris: 220 }, categoria: 'Arcano', origem: 'Geradores de escudo desmontados sob supervisão técnica.', propriedades: ['Condutor', 'Canalizador', 'Estável'], estadoBase: 'refinado', descricao: 'Peça que recebe e distribui a carga usada por escudos e outros campos de proteção.' }),

  componenteVeicular({ id: 'mat-matriz-gravitacional', titulo: 'Matriz Gravitacional', raridade: 'epico', preco: { Solares: 10 }, categoria: 'Arcano', origem: 'Plataformas suspensas e naves capazes de ignorar o próprio peso.', propriedades: ['Canalizador', 'Amplificador', 'Estável'], estadoBase: 'refinado', descricao: 'Matriz que mantém a gravidade artificial e o equilíbrio de veículos de grande porte.' }),
  componenteVeicular({ id: 'mat-coracao-dobra', titulo: 'Coração de Dobra', raridade: 'epico', preco: { Solares: 10 }, categoria: 'Arcano', origem: 'Motores dimensionais retirados de rotas entre Árvores.', propriedades: ['Canalizador', 'Amplificador', 'Volátil'], estadoBase: 'refinado', descricao: 'Câmara central de um motor de dobra, preparada para aguentar uma nova travessia.' }),
  componenteVeicular({ id: 'mat-revestimento-metal-vivo', titulo: 'Revestimento de Metal Vivo', raridade: 'epico', preco: { Solares: 9 }, categoria: 'Artificial', origem: 'Forjas que cultivam ligas capazes de recompor a própria forma.', propriedades: ['Regenerativo', 'Flexível', 'Resistente'], estadoBase: 'refinado', descricao: 'Placas finas que se ajustam ao casco e crescem sobre pontos de desgaste.' }),
  componenteVeicular({ id: 'mat-reator-eter-veicular', titulo: 'Reator de Éter Veicular', raridade: 'epico', preco: { Solares: 9 }, categoria: 'Arcano', origem: 'Cruzadores arcanotecnológicos e estações de abastecimento avançadas.', propriedades: ['Condutor', 'Amplificador', 'Estável'], estadoBase: 'refinado', descricao: 'Reator compacto ajustado para alimentar propulsão e sistemas internos ao mesmo tempo.' }),

  componenteVeicular({ id: 'mat-bussola-vazio', titulo: 'Bússola do Vazio', raridade: 'lendario', preco: { Solares: 38 }, categoria: 'Arcano', origem: 'Naves que voltaram de regiões sem estrelas ou pontos de referência.', propriedades: ['Canalizador', 'Estável', 'Vinculante'], estadoBase: 'refinado', descricao: 'Instrumento que encontra uma rota mesmo quando o espaço ao redor não oferece direção.' }),
  componenteVeicular({ id: 'mat-nucleo-estelar-estabilizado', titulo: 'Núcleo Estelar Estabilizado', raridade: 'lendario', preco: { Solares: 40 }, categoria: 'Arcano', origem: 'Reatores construídos ao redor de fragmentos de estrelas domesticadas.', propriedades: ['Condutor', 'Amplificador', 'Estável'], afinidade: 'Fogo', estadoBase: 'refinado', descricao: 'Fonte de energia estelar contida em várias camadas de proteção e controle.' }),
  componenteVeicular({ id: 'mat-motor-horizonte', titulo: 'Motor do Horizonte', raridade: 'lendario', preco: { Solares: 36 }, categoria: 'Arcano', origem: 'Destroços de naves que atravessaram o limite conhecido do Jardim.', propriedades: ['Canalizador', 'Amplificador', 'Volátil'], estadoBase: 'refinado', descricao: 'Motor que parece puxar o destino para perto em vez de empurrar o veículo para frente.' }),
  componenteVeicular({ id: 'mat-casco-luz-solida', titulo: 'Casco de Luz Sólida', raridade: 'lendario', preco: { Solares: 40 }, categoria: 'Arcano', origem: 'Estaleiros celestiais e cidadelas construídas acima das nuvens.', propriedades: ['Resistente', 'Purificador', 'Canalizador'], afinidade: 'Luz', estadoBase: 'refinado', descricao: 'Trecho de casco feito de luz endurecida, leve e quase impossível de corroer.' }),
];

// Reagentes de bancada. Estes nomes falam de mistura, extração e transformação,
// sem reaproveitar oferendas, peças de oficina ou ingredientes de cozinha.
const novosMateriaisAlquimia = [
  reagenteAlquimico({ id: 'mat-alcool-alquimico', titulo: 'Álcool Alquímico', raridade: 'incomum', preco: { Lunaris: 24 }, categoria: 'Artificial', origem: 'Destilarias e boticas.', propriedades: ['Volátil', 'Purificador'], descricao: 'Álcool forte e limpo, usado para extrair princípios ativos e conservar misturas.' }),
  reagenteAlquimico({ id: 'mat-mercurio-purificado', titulo: 'Mercúrio Purificado', raridade: 'incomum', preco: { Lunaris: 45 }, categoria: 'Mineral', origem: 'Laboratórios com equipamento para separar metais tóxicos.', propriedades: ['Volátil', 'Condutor'], descricao: 'Metal líquido guardado em ampola grossa, sem as impurezas que estragam uma fórmula.' }),
  reagenteAlquimico({ id: 'mat-sal-de-prata', titulo: 'Sal de Prata', raridade: 'incomum', preco: { Lunaris: 38 }, categoria: 'Mineral', origem: 'Oficinas químicas que dissolvem e cristalizam prata.', propriedades: ['Purificador', 'Corrosivo'], descricao: 'Cristais de prata usados em antídotos, conservantes e misturas contra corrupção.' }),
  reagenteAlquimico({ id: 'mat-extrato-de-mandragora', titulo: 'Extrato de Mandrágora', raridade: 'incomum', preco: { Lunaris: 55 }, categoria: 'Botânico', origem: 'Raízes maduras prensadas por boticários.', propriedades: ['Medicinal', 'Estimulante'], descricao: 'Extrato amargo e potente. Em pouca quantidade desperta; em excesso derruba.' }),
  reagenteAlquimico({ id: 'mat-acido-verde', titulo: 'Ácido Verde', raridade: 'incomum', preco: { Lunaris: 42 }, categoria: 'Artificial', origem: 'Bancadas alquímicas com vidro reforçado.', propriedades: ['Corrosivo'], descricao: 'Ácido de cor verde usado para dissolver metal, osso e resíduos minerais.' }),

  reagenteAlquimico({ id: 'mat-sangue-de-troll-estabilizado', titulo: 'Sangue de Troll Estabilizado', raridade: 'raro', preco: { Lunaris: 180 }, categoria: 'Biológico', origem: 'Trolls abatidos e amostras conservadas imediatamente.', propriedades: ['Regenerativo', 'Conservante'], descricao: 'Sangue espesso cuja regeneração continua mesmo depois de separado do corpo.' }),
  reagenteAlquimico({ id: 'mat-solvente-de-cristal', titulo: 'Solvente de Cristal', raridade: 'raro', preco: { Lunaris: 150 }, categoria: 'Artificial', origem: 'Laboratórios de alquimia mineral.', propriedades: ['Corrosivo', 'Estável'], descricao: 'Líquido transparente capaz de amolecer cristais sem destruir suas propriedades.' }),
  reagenteAlquimico({ id: 'mat-po-de-chifre-feerico', titulo: 'Pó de Chifre Feérico', raridade: 'raro', preco: { Lunaris: 220 }, categoria: 'Biológico', origem: 'Chifres encontrados após a troca natural de criaturas feéricas.', propriedades: ['Purificador', 'Canalizador'], descricao: 'Pó claro que reage com veneno e ajuda a manter fórmulas mágicas estáveis.' }),
  reagenteAlquimico({ id: 'mat-oleo-de-salamandra', titulo: 'Óleo de Salamandra', raridade: 'raro', preco: { Lunaris: 190 }, categoria: 'Biológico', origem: 'Glândulas de salamandras de fogo.', propriedades: ['Inflamável', 'Estável'], afinidade: 'Fogo', descricao: 'Óleo quente que só pega fogo quando entra em contato com o ar.' }),
  reagenteAlquimico({ id: 'mat-gas-de-medusa', titulo: 'Gás de Medusa', raridade: 'raro', preco: { Lunaris: 170 }, categoria: 'Biológico', origem: 'Cavidades preservadas de medusas monstruosas.', propriedades: ['Volátil', 'Corruptor'], descricao: 'Gás pálido guardado sob pressão, usado em venenos e fórmulas de imobilização.' }),
  reagenteAlquimico({ id: 'mat-plasma-de-slime-real', titulo: 'Plasma de Slime Real', raridade: 'raro', preco: { Lunaris: 160 }, categoria: 'Biológico', origem: 'Núcleos de slimes que dominaram uma colônia inteira.', propriedades: ['Absorvente', 'Regenerativo'], descricao: 'Gel vivo que absorve líquidos e volta lentamente à forma original.' }),

  reagenteAlquimico({ id: 'mat-coracao-de-magma-destilado', titulo: 'Coração de Magma Destilado', raridade: 'epico', preco: { Solares: 8 }, categoria: 'Arcano', origem: 'Câmaras magmáticas drenadas durante uma erupção.', propriedades: ['Inflamável', 'Amplificador', 'Estável'], afinidade: 'Fogo', estadoBase: 'refinado', descricao: 'Gota de magma concentrado que continua líquida mesmo longe do calor.' }),
  reagenteAlquimico({ id: 'mat-sangue-de-fenix-estabilizado', titulo: 'Sangue de Fênix Estabilizado', raridade: 'epico', preco: { Solares: 10 }, categoria: 'Biológico', origem: 'Fênix que permitiram a coleta antes de renascer.', propriedades: ['Regenerativo', 'Vital', 'Inflamável'], afinidade: 'Fogo', estadoBase: 'refinado', descricao: 'Sangue luminoso estabilizado antes que virasse cinza e começasse a renascer.' }),
  reagenteAlquimico({ id: 'mat-essencia-de-mutacao-perfeita', titulo: 'Essência de Mutação Perfeita', raridade: 'epico', preco: { Solares: 9 }, categoria: 'Arcano', origem: 'Experimentos alquímicos que sobreviveram a várias transformações.', propriedades: ['Corruptor', 'Regenerativo', 'Estável'], estadoBase: 'refinado', descricao: 'Líquido que muda de cor, mas nunca perde o equilíbrio entre suas partes.' }),
  reagenteAlquimico({ id: 'mat-catalisador-de-sete-metais', titulo: 'Catalisador de Sete Metais', raridade: 'epico', preco: { Solares: 7 }, categoria: 'Artificial', origem: 'Forjas alquímicas que trabalham sete metais numa única liga.', propriedades: ['Canalizador', 'Amplificador', 'Estável'], estadoBase: 'refinado', descricao: 'Pequena liga metálica que acelera reações sem se dissolver de imediato.' }),

  reagenteAlquimico({ id: 'mat-sangue-da-primeira-quimera', titulo: 'Sangue da Primeira Quimera', raridade: 'lendario', preco: { Solares: 32 }, categoria: 'Biológico', origem: 'A linhagem mais antiga entre as quimeras conhecidas.', propriedades: ['Vital', 'Corruptor', 'Amplificador'], afinidade: 'Escolha na compra', estadoBase: 'refinado', descricao: 'Sangue que ainda tenta assumir as formas de todas as criaturas de sua linhagem.' }),
  reagenteAlquimico({ id: 'mat-solvente-universal', titulo: 'Solvente Universal', raridade: 'lendario', preco: { Solares: 35 }, categoria: 'Artificial', origem: 'Uma fórmula preservada por mestres alquimistas de várias Árvores.', propriedades: ['Corrosivo', 'Purificador', 'Amplificador'], estadoBase: 'refinado', descricao: 'Solvente que desfaz quase qualquer matéria quando recebe o reagente certo.' }),
  reagenteAlquimico({ id: 'mat-base-da-vida-eterna', titulo: 'Base da Vida Eterna', raridade: 'lendario', preco: { Solares: 40 }, categoria: 'Arcano', origem: 'Tentativas raríssimas de reproduzir a regeneração do Éden.', propriedades: ['Regenerativo', 'Vital', 'Conservante'], estadoBase: 'refinado', descricao: 'Base transparente usada nas fórmulas que tentam impedir o corpo de envelhecer.' }),
  reagenteAlquimico({ id: 'mat-reagente-da-materia-original', titulo: 'Reagente da Matéria Original', raridade: 'lendario', preco: { Solares: 38 }, categoria: 'Arcano', origem: 'Resíduos preservados de uma criação anterior à forma atual do mundo.', propriedades: ['Canalizador', 'Amplificador', 'Estável'], estadoBase: 'refinado', descricao: 'Substância sem cor nem cheiro que aceita quase qualquer transformação.' }),
];

// Oferendas e focos mágicos. Mesmo os objetos simples têm uma função de cena
// clara, e os mais raros parecem tesouros de um grimório em vez de reagentes.
const novosMateriaisRitual = [
  componenteRitualistico({ id: 'mat-cera-lunar', titulo: 'Cera Lunar', raridade: 'incomum', preco: { Lunaris: 28 }, categoria: 'Espiritual', origem: 'Velas deixadas uma noite inteira sob luz lunar.', propriedades: ['Canalizador', 'Conservante'], descricao: 'Cera prateada que mantém a chama firme durante um rito.' }),
  componenteRitualistico({ id: 'mat-sal-consagrado', titulo: 'Sal Consagrado', raridade: 'incomum', preco: { Lunaris: 32 }, categoria: 'Espiritual', origem: 'Sal purificado em um local sagrado.', propriedades: ['Purificador', 'Vinculante'], descricao: 'Sal usado para fechar o traçado e impedir que algo atravesse sem permissão.' }),
  componenteRitualistico({ id: 'mat-incenso-de-mirra-espectral', titulo: 'Incenso de Mirra Espectral', raridade: 'incomum', preco: { Lunaris: 45 }, categoria: 'Espiritual', origem: 'Árvores que crescem perto de passagens espirituais.', propriedades: ['Anímico', 'Canalizador'], descricao: 'Incenso cuja fumaça revela movimentos que os olhos não conseguem ver.' }),
  componenteRitualistico({ id: 'mat-osso-gravado', titulo: 'Osso Gravado', raridade: 'incomum', preco: { Lunaris: 38 }, categoria: 'Biológico', origem: 'Ossos antigos limpos e marcados por um ritualista.', propriedades: ['Anímico', 'Vinculante'], descricao: 'Pequeno osso coberto por nomes, pedidos ou avisos para os mortos.' }),
  componenteRitualistico({ id: 'mat-espelho-enevoado', titulo: 'Espelho Enevoado', raridade: 'incomum', preco: { Lunaris: 55 }, categoria: 'Arcano', origem: 'Espelhos usados para observar sonhos e lugares distantes.', propriedades: ['Canalizador', 'Vinculante'], descricao: 'Espelho que embaça quando um rito encontra algo escondido.' }),
  componenteRitualistico({ id: 'mat-fio-de-prata-para-vinculos', titulo: 'Fio de Prata para Vínculos', raridade: 'incomum', preco: { Lunaris: 60 }, categoria: 'Artificial', origem: 'Ourives que trabalham para templos e círculos ritualísticos.', propriedades: ['Condutor', 'Vinculante'], descricao: 'Fio fino usado para ligar objetos, nomes e pessoas dentro do traçado.' }),

  componenteRitualistico({ id: 'mat-fio-do-destino-cortado', titulo: 'Fio do Destino Cortado', raridade: 'lendario', preco: { Solares: 36 }, categoria: 'Espiritual', origem: 'Encruzilhadas onde uma profecia deixou de se cumprir.', propriedades: ['Anímico', 'Amplificador', 'Vinculante'], estadoBase: 'refinado', descricao: 'Fio invisível enrolado num carretel vazio. Ele vibra diante de escolhas sem volta.' }),
  componenteRitualistico({ id: 'mat-eco-do-primeiro-juramento', titulo: 'Eco do Primeiro Juramento', raridade: 'lendario', preco: { Solares: 40 }, categoria: 'Arcano', origem: 'Um pacto antigo preservado por gerações sem jamais ser quebrado.', propriedades: ['Canalizador', 'Amplificador', 'Vinculante'], estadoBase: 'refinado', descricao: 'Uma promessa guardada dentro de um sino pequeno. A voz volta quando ele toca.' }),
];

// Matérias-primas próprias para objetos permanentes. A Forja também aceita
// alguns reagentes, focos e peças dos outros catálogos, definidos mais abaixo.
const novosMateriaisForja = [
  materiaPrima({ id: 'mat-couro-de-manticora-curtido', titulo: 'Couro de Mantícora Curtido', raridade: 'raro', preco: { Lunaris: 180 }, categoria: 'Biológico', origem: 'Mantícoras abatidas sem danificar o dorso.', propriedades: ['Resistente', 'Flexível'], descricao: 'Couro grosso e flexível, bom para armaduras leves que precisam aguentar cortes.' }),
  materiaPrima({ id: 'mat-madeira-de-ferro', titulo: 'Madeira de Ferro', raridade: 'raro', preco: { Lunaris: 170 }, categoria: 'Botânico', origem: 'Árvores de crescimento lento encontradas em solo mineral.', propriedades: ['Resistente', 'Isolante'], descricao: 'Madeira tão dura quanto metal, mas fácil de equilibrar em cabos e arcos.' }),
  materiaPrima({ id: 'mat-osso-de-colosso', titulo: 'Osso de Colosso', raridade: 'raro', preco: { Lunaris: 220 }, categoria: 'Biológico', origem: 'Restos de criaturas grandes demais para serem movidas inteiras.', propriedades: ['Resistente', 'Canalizador'], descricao: 'Placa de osso leve e quase impossível de quebrar com ferramentas comuns.' }),
  materiaPrima({ id: 'mat-prata-runica', titulo: 'Prata Rúnica', raridade: 'raro', preco: { Lunaris: 240 }, categoria: 'Artificial', origem: 'Lingotes de prata marcados durante a fundição.', propriedades: ['Condutor', 'Canalizador', 'Purificador'], descricao: 'Prata que recebe inscrições mágicas sem perder o desenho com o uso.' }),
  materiaPrima({ id: 'mat-seda-de-aranha-gigante', titulo: 'Seda de Aranha Gigante', raridade: 'raro', preco: { Lunaris: 160 }, categoria: 'Biológico', origem: 'Ninhos abandonados de aranhas gigantes.', propriedades: ['Flexível', 'Resistente', 'Vinculante'], descricao: 'Fio muito leve que segura mais peso do que uma corda comum.' }),
  materiaPrima({ id: 'mat-pedra-de-mana-lapidada', titulo: 'Pedra de Mana Lapidada', raridade: 'raro', preco: { Lunaris: 230 }, categoria: 'Arcano', origem: 'Veios cristalinos cortados por lapidários arcanos.', propriedades: ['Canalizador', 'Estável'], descricao: 'Cristal pronto para receber encantamentos em armas, joias e ferramentas.' }),

  materiaPrima({ id: 'mat-barra-de-adamante-negro', titulo: 'Barra de Adamante Negro', raridade: 'epico', preco: { Solares: 9 }, categoria: 'Mineral', origem: 'Minas profundas abertas apenas por curtos períodos.', propriedades: ['Resistente', 'Estável', 'Afiado'], estadoBase: 'refinado', descricao: 'Metal escuro que mantém o fio mesmo depois de atravessar pedra.' }),
  materiaPrima({ id: 'mat-couro-de-dragao-anciao', titulo: 'Couro de Dragão Ancião', raridade: 'epico', preco: { Solares: 10 }, categoria: 'Biológico', origem: 'Escamas cedidas ou retiradas de dragões anciões mortos.', propriedades: ['Resistente', 'Isolante', 'Canalizador'], afinidade: 'Escolha na compra', estadoBase: 'refinado', descricao: 'Camadas de escamas preparadas para armaduras que enfrentam magia e calor.' }),
  materiaPrima({ id: 'mat-madeira-da-arvore-mundo', titulo: 'Madeira da Árvore-Mundo', raridade: 'epico', preco: { Solares: 8 }, categoria: 'Botânico', origem: 'Galhos caídos de Árvores que sustentam florestas inteiras.', propriedades: ['Resistente', 'Regenerativo', 'Canalizador'], afinidade: 'Terra', estadoBase: 'refinado', descricao: 'Madeira viva que fecha pequenas rachaduras quando recebe água e luz.' }),
  materiaPrima({ id: 'mat-cristal-de-luz-solida', titulo: 'Cristal de Luz Sólida', raridade: 'epico', preco: { Solares: 7 }, categoria: 'Arcano', origem: 'Templos onde a luz foi mantida imóvel por séculos.', propriedades: ['Canalizador', 'Purificador', 'Resistente'], afinidade: 'Luz', estadoBase: 'refinado', descricao: 'Luz endurecida que pode ser cortada e encaixada como uma pedra preciosa.' }),
  materiaPrima({ id: 'mat-osso-de-leviata', titulo: 'Osso de Leviatã', raridade: 'epico', preco: { Solares: 9 }, categoria: 'Biológico', origem: 'Carcaças de leviatãs encontradas em mares profundos.', propriedades: ['Resistente', 'Amplificador', 'Vinculante'], afinidade: 'Água', estadoBase: 'refinado', descricao: 'Osso branco usado em cascos, escudos e armas grandes sem aumentar muito o peso.' }),
  materiaPrima({ id: 'mat-liga-de-prata-lunar', titulo: 'Liga de Prata Lunar', raridade: 'epico', preco: { Solares: 8 }, categoria: 'Artificial', origem: 'Forjas mantidas sob a luz de uma lua cheia.', propriedades: ['Condutor', 'Purificador', 'Canalizador'], afinidade: 'Luz', estadoBase: 'refinado', descricao: 'Liga clara que conduz magia e mantém o brilho mesmo coberta de sujeira.' }),

  materiaPrima({ id: 'mat-lingote-de-metal-celestial', titulo: 'Lingote de Metal Celestial', raridade: 'lendario', preco: { Solares: 35 }, categoria: 'Mineral', origem: 'Ruínas acima das nuvens e armas de guardiões celestiais.', propriedades: ['Resistente', 'Purificador', 'Amplificador'], afinidade: 'Luz', estadoBase: 'refinado', descricao: 'Metal leve que canta quando recebe o golpe certo do martelo.' }),
  materiaPrima({ id: 'mat-couro-da-serpente-mundo', titulo: 'Couro da Serpente-Mundo', raridade: 'lendario', preco: { Solares: 40 }, categoria: 'Biológico', origem: 'Escamas perdidas por serpentes capazes de envolver uma Árvore.', propriedades: ['Resistente', 'Regenerativo', 'Corruptor'], afinidade: 'Escuridão', estadoBase: 'refinado', descricao: 'Couro que se dobra como tecido e volta à forma depois de cada impacto.' }),
  materiaPrima({ id: 'mat-madeira-da-primeira-arvore', titulo: 'Madeira da Primeira Árvore', raridade: 'lendario', preco: { Solares: 32 }, categoria: 'Botânico', origem: 'Um galho preservado desde o primeiro bosque do Jardim.', propriedades: ['Regenerativo', 'Canalizador', 'Amplificador'], afinidade: 'Terra', estadoBase: 'refinado', descricao: 'Madeira antiga que ainda cria brotos quando é trabalhada.' }),
  materiaPrima({ id: 'mat-pedra-coracao-da-montanha', titulo: 'Pedra-Coração da Montanha', raridade: 'lendario', preco: { Solares: 38 }, categoria: 'Mineral', origem: 'O centro de montanhas que despertaram e voltaram a dormir.', propriedades: ['Resistente', 'Estável', 'Amplificador'], afinidade: 'Terra', estadoBase: 'refinado', descricao: 'Pedra quente e pesada que não aceita ser quebrada duas vezes no mesmo lugar.' }),
  materiaPrima({ id: 'mat-osso-do-primeiro-dragao', titulo: 'Osso do Primeiro Dragão', raridade: 'lendario', preco: { Solares: 40 }, categoria: 'Biológico', origem: 'Relíquias guardadas pelas linhagens mais antigas de dragões.', propriedades: ['Resistente', 'Canalizador', 'Amplificador'], afinidade: 'Escolha na compra', estadoBase: 'refinado', descricao: 'Fragmento de osso que mantém o calor e a afinidade de sua linhagem.' }),
  materiaPrima({ id: 'mat-tecido-do-ceu-noturno', titulo: 'Tecido do Céu Noturno', raridade: 'lendario', preco: { Solares: 34 }, categoria: 'Arcano', origem: 'Teares que trabalham durante noites sem lua.', propriedades: ['Flexível', 'Isolante', 'Canalizador'], afinidade: 'Escuridão', estadoBase: 'refinado', descricao: 'Tecido escuro que apaga reflexos e parece mais leve do que o ar.' }),
];

const novosMateriaisCurados = [
  ...novosMateriaisFase5,
  ...novosMateriaisCozinha,
  ...novosMateriaisEngenharia,
  ...novosMateriaisVeiculares,
  ...novosMateriaisAlquimia,
  ...novosMateriaisRitual,
  ...novosMateriaisForja,
];

for (const entrada of novosMateriaisCurados) {
  const { categoria, origem, potencia, afinidade, propriedades, usos, estadoBase } = entrada.conteudo;
  fichasComponentes[entrada.id] = { categoria, origem, potencia, afinidade, propriedades, usos, estadoBase };
}

// Opções de alta raridade criadas para completar o catálogo químico do Alquimista.
Object.assign(fichasComponentes, {
  'mat-mercurio-astral': {
    categoria: 'Arcano',
    origem: 'Crateras recentes e laboratórios especializados em matéria celeste.',
    potencia: 3,
    afinidade: 'Nenhuma',
    propriedades: ['Volátil', 'Canalizador'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'processado',
  },
  'mat-bile-de-basilisco': {
    categoria: 'Biológico',
    origem: 'Glândulas intactas de basiliscos abatidos sem perfurar o sistema digestivo.',
    potencia: 3,
    afinidade: 'Nenhuma',
    propriedades: ['Corrosivo', 'Estável'],
    usos: ['alquimia'],
    estadoBase: 'bruto',
  },
  'mat-esporo-carmesim': {
    categoria: 'Botânico',
    origem: 'Colônias fúngicas que crescem próximas a fontes concentradas de Vida.',
    potencia: 3,
    afinidade: 'Nenhuma',
    propriedades: ['Regenerativo', 'Estimulante'],
    usos: ['alquimia', 'cozinha'],
    estadoBase: 'bruto',
  },
  'mat-orvalho-de-eclipse': {
    categoria: 'Espiritual',
    origem: 'Coletores rituais expostos ao céu durante um eclipse completo.',
    potencia: 3,
    afinidade: 'Escuridão',
    propriedades: ['Absorvente', 'Necrótico'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'refinado',
  },
  'mat-lagrima-de-fenix': {
    categoria: 'Espiritual',
    origem: 'Fênix que ofereceu a lágrima voluntariamente ou deixou vestígio durante um renascimento.',
    potencia: 4,
    afinidade: 'Fogo',
    propriedades: ['Regenerativo', 'Inflamável', 'Vital'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'refinado',
  },
  'mat-seiva-da-arvore-imortal': {
    categoria: 'Botânico',
    origem: 'Árvores ancestrais que sobreviveram intactas a catástrofes de dimensão inteira.',
    potencia: 4,
    afinidade: 'Terra',
    propriedades: ['Regenerativo', 'Conservante', 'Vital'],
    usos: ['alquimia', 'cozinha'],
    estadoBase: 'refinado',
  },
  'mat-vazio-condensado': {
    categoria: 'Arcano',
    origem: 'Fissuras controladas entre dimensões, fechadas imediatamente após a coleta.',
    potencia: 4,
    afinidade: 'Escuridão',
    propriedades: ['Corruptor', 'Volátil', 'Canalizador'],
    usos: ['ritual', 'alquimia', 'engenharia'],
    estadoBase: 'refinado',
  },
  'mat-cristal-de-tempestade': {
    categoria: 'Mineral',
    origem: 'Picos atingidos repetidamente por tempestades arcanas durante uma mesma noite.',
    potencia: 4,
    afinidade: 'Raio',
    propriedades: ['Condutor', 'Volátil', 'Amplificador'],
    usos: ['ritual', 'alquimia', 'engenharia'],
    estadoBase: 'refinado',
  },
  'mat-polen-de-lotus-onirico': {
    categoria: 'Botânico',
    origem: 'Lótus raros que florescem em lagos compartilhados por sonhos de várias criaturas.',
    potencia: 4,
    afinidade: 'Água',
    propriedades: ['Anímico', 'Estimulante', 'Canalizador'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'processado',
  },
  'mat-icor-de-quimera': {
    categoria: 'Biológico',
    origem: 'Quimeras adultas abatidas antes que suas naturezas internas se separem.',
    potencia: 4,
    afinidade: 'Escolha na compra',
    propriedades: ['Corruptor', 'Vital', 'Volátil'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'bruto',
  },
  'mat-sangue-de-dragao-primordial': {
    categoria: 'Biológico',
    origem: 'Dragões primordiais; a coleta exige consentimento ou um confronto capaz de ferir a criatura.',
    potencia: 5,
    afinidade: 'Escolha na compra',
    propriedades: ['Amplificador', 'Vital', 'Inflamável'],
    usos: ['ritual', 'alquimia', 'forja'],
    estadoBase: 'bruto',
  },
  'mat-ambar-do-instante-eterno': {
    categoria: 'Arcano',
    origem: 'Árvores atingidas por rupturas temporais e encontradas exatamente no momento em que foram feridas.',
    potencia: 5,
    afinidade: 'Luz',
    propriedades: ['Amplificador', 'Estável', 'Conservante'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'refinado',
  },
  'mat-nectar-da-lua-morta': {
    categoria: 'Espiritual',
    origem: 'Flores espectrais que abrem somente sob a luz de luas mortas entre as Árvores.',
    potencia: 5,
    afinidade: 'Escuridão',
    propriedades: ['Necrótico', 'Canalizador', 'Conservante'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'refinado',
  },
  'mat-cinza-do-ultimo-sol': {
    categoria: 'Espiritual',
    origem: 'Restos de mundos cujo sol morreu, recolhidos antes que a escuridão consumisse seus últimos santuários.',
    potencia: 5,
    afinidade: 'Fogo',
    propriedades: ['Purificador', 'Amplificador', 'Vital'],
    usos: ['ritual', 'alquimia', 'forja'],
    estadoBase: 'refinado',
  },
  'mat-veneno-da-serpente-mundo': {
    categoria: 'Biológico',
    origem: 'Presas de serpentes primordiais grandes o bastante para circundar uma Árvore inteira.',
    potencia: 5,
    afinidade: 'Escuridão',
    propriedades: ['Corrosivo', 'Necrótico', 'Vinculante'],
    usos: ['ritual', 'alquimia'],
    estadoBase: 'bruto',
  },
  'mat-orvalho-da-fonte-do-eden': {
    categoria: 'Espiritual',
    origem: 'Fontes ocultas próximas ao Éden, recolhidas antes do primeiro raio de luz tocar a superfície.',
    potencia: 5,
    afinidade: 'Água',
    propriedades: ['Regenerativo', 'Purificador', 'Vital'],
    usos: ['ritual', 'alquimia', 'cozinha'],
    estadoBase: 'refinado',
  },
});

const idsMantimentosExclusivos = new Set(novosMateriaisCozinha.map((item) => item.id));
const idsSucataExclusivos = new Set(novosMateriaisEngenharia.map((item) => item.id));
const idsVeicularesExclusivos = new Set(novosMateriaisVeiculares.map((item) => item.id));
const idsAlquimiaPrincipais = new Set([
  ...novosMateriaisAlquimia.map((item) => item.id),
  'comp-terra-fertil', 'comp-sementes-viaveis', 'comp-agua-pura', 'comp-amostra-biologica',
  'comp-ervas-comuns', 'comp-material-medicinal', 'comp-materiais-diversos',
  'comp-recipiente-selavel', 'mat-quartzo-estavel', 'mat-sal-purificador',
  'mat-carvao-mineral', 'mat-vidro-alquimico', 'mat-resina-vegetal', 'mat-musgo-absorvente',
  'mat-raiz-fortificante', 'mat-flor-medicinal', 'mat-mercurio-astral',
  'mat-bile-de-basilisco', 'mat-esporo-carmesim', 'mat-seiva-da-arvore-imortal',
  'mat-icor-de-quimera', 'mat-sangue-de-dragao-primordial', 'mat-veneno-da-serpente-mundo',
]);
const idsRitualPrincipais = new Set([
  ...novosMateriaisRitual.map((item) => item.id),
  'comp-vestigio-de-fracasso', 'comp-marco-de-pedra', 'comp-objeto-pessoal',
  'comp-papel-e-tinta', 'comp-simbolo-pessoal', 'comp-receptor-inscrito',
  'comp-objeto-valor-pessoal', 'comp-amostra-elemental', 'comp-ancora-de-pedra',
  'comp-objeto-fixo', 'comp-ampulheta-graduada', 'comp-cinza-fria',
  'comp-pertence-pessoal', 'comp-vestigio-material', 'comp-nucleo-tecnologico',
  'comp-emissor-axis', 'comp-simbolo-pecado', 'comp-simbolo-virtude',
  'mat-orvalho-de-eclipse', 'mat-lagrima-de-fenix', 'mat-vazio-condensado',
  'mat-cristal-de-tempestade', 'mat-polen-de-lotus-onirico',
  'mat-ambar-do-instante-eterno', 'mat-nectar-da-lua-morta',
  'mat-cinza-do-ultimo-sol', 'mat-orvalho-da-fonte-do-eden',
]);
const idsForjaPrincipais = new Set([
  ...novosMateriaisForja.map((item) => item.id),
  'comp-metal-para-forja', 'comp-ferramentas-bancada', 'comp-pecas-mecanicas',
  'mat-minerio-de-ferro', 'mat-cobre-nativo', 'mat-liga-de-aco',
  'mat-fio-condutor-isolado', 'mat-tecido-reforcado', 'mat-carga-estabilizada',
  'mat-fibra-vegetal',
]);
const idsCompativeisComForja = new Set([
  // Reagentes e focos que também podem entrar em uma criação permanente.
  'mat-quartzo-estavel', 'mat-carvao-mineral', 'mat-vidro-alquimico', 'mat-resina-vegetal',
  'mat-sangue-de-dragao-primordial', 'comp-marco-de-pedra', 'comp-amostra-elemental',
  'comp-ancora-de-pedra', 'mat-cristal-de-tempestade', 'mat-ambar-do-instante-eterno',
  'mat-cinza-do-ultimo-sol',
  // Peças que funcionam tanto numa engenhoca quanto num item definitivo.
  'mat-placas-metalicas', 'mat-fios-cobre', 'mat-cabos-isolados-oficina',
  'mat-motores-pequenos', 'mat-liga-leve', 'mat-liga-titanio-astral',
  'mat-nanofibra-regenerativa', 'mat-chassi-metal-vivo', 'mat-placa-metal-celestial',
]);

for (const [id, ficha] of Object.entries(fichasComponentes)) {
  if (idsMantimentosExclusivos.has(id)) ficha.usos = ['cozinha'];
  else if (idsSucataExclusivos.has(id)) ficha.usos = ['engenharia'];
  else if (idsVeicularesExclusivos.has(id)) ficha.usos = ['veiculos'];
  else if (idsAlquimiaPrincipais.has(id)) ficha.usos = ['alquimia'];
  else if (idsRitualPrincipais.has(id)) ficha.usos = ['ritual'];
  else if (idsForjaPrincipais.has(id)) ficha.usos = ['forja'];
  else throw new Error(`Material sem catálogo principal: ${id}`);

  if (idsCompativeisComForja.has(id) && !ficha.usos.includes('forja')) ficha.usos.push('forja');
}

function semAcentos(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function nomeLoot(texto) {
  return texto.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function aplicarRetrofit(catalogo) {
  const idsExistentes = new Set(catalogo.entradas.map((entrada) => entrada.id));
  const novosAusentes = novosMateriaisCurados.filter((entrada) => !idsExistentes.has(entrada.id));
  if (novosAusentes.length) {
    const ultimoDrop = catalogo.entradas.reduce(
      (ultimo, entrada, indice) => entrada.tipo === 'drop' ? indice : ultimo,
      -1,
    );
    catalogo.entradas.splice(ultimoDrop + 1, 0, ...novosAusentes);
  }

  for (const novo of novosMateriaisCurados) {
    const entrada = catalogo.entradas.find((item) => item.id === novo.id);
    entrada.tipo = novo.tipo;
    entrada.titulo = novo.titulo;
    Object.assign(entrada.conteudo, novo.conteudo);
  }

  const drops = catalogo.entradas.filter((entrada) => entrada.tipo === 'drop');
  const idsDrops = new Set(drops.map((entrada) => entrada.id));
  const idsComponentes = new Set(Object.keys(fichasComponentes));

  for (const entrada of drops) {
    const ficha = entrada.id.startsWith('drop-') ? fichaCriatura(entrada) : fichasComponentes[entrada.id];
    if (!ficha) throw new Error(`Material sem curadoria na Fase 4: ${entrada.id}`);
    Object.assign(entrada.conteudo, ficha);
    idsComponentes.delete(entrada.id);
  }

  if (idsComponentes.size) throw new Error(`Curadoria aponta para materiais ausentes: ${[...idsComponentes].join(', ')}`);

  const dropPorTitulo = new Map(drops.map((entrada) => [semAcentos(entrada.titulo), entrada.id]));
  let linksLoot = 0;
  for (const monstro of catalogo.entradas.filter((entrada) => entrada.tipo === 'monstro')) {
    const ids = [...new Set((monstro.conteudo.loot ?? [])
      .map((loot) => dropPorTitulo.get(semAcentos(nomeLoot(loot))))
      .filter((id) => id && idsDrops.has(id)))];
    if (ids.length) {
      monstro.conteudo.lootIds = ids;
      linksLoot += ids.length;
    } else {
      delete monstro.conteudo.lootIds;
    }
  }

  return { materiais: drops.length, linksLoot };
}

const catalogo = JSON.parse(readFileSync(catalogoUrl, 'utf8'));
const antes = JSON.stringify(catalogo, null, 2) + '\n';
const resultado = aplicarRetrofit(catalogo);
const depois = JSON.stringify(catalogo, null, 2) + '\n';
const check = process.argv.includes('--check');

if (check && antes !== depois) {
  throw new Error('O retrofit de materiais está desatualizado. Execute npm run materiais:retrofit.');
}

if (!check) writeFileSync(catalogoUrl, depois, 'utf8');
console.log(`Materiais curados: ${resultado.materiais}; lootIds seguros: ${resultado.linksLoot}.`);
