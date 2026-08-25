import type { Propriedade, ReceitaMaterial } from './materiais';
import type { RecursoMaterialId } from './recursos-materiais';

const RECURSO_POR_CLASSE: Partial<Record<ReceitaMaterial['classe'], RecursoMaterialId>> = {
  alquimista: 'componentes-quimicos',
  engenheiro: 'sucata',
  cozinheiro: 'mantimentos',
};

const REAGENTE_SIMPLES: Record<string, Propriedade> = {
  'cura-menor': 'Medicinal',
  'fogo-alquimico': 'Inflamável',
  antidoto: 'Purificador',
  'elixir-de-mana': 'Canalizador',
  'nevoa-densa': 'Absorvente',
  mutagenico: 'Vital',
  'acido-corrosivo': 'Corruptor',
  'oleo-deslizante': 'Isolante',
  'veneno-de-contato': 'Corruptor',
  'frasco-congelante': 'Arcano',
  'cataplasma-de-ferro': 'Regenerativo',
  'essencia-de-sombra': 'Necrótico',
  'reagente-revelador': 'Purificador',
  'tonico-do-folego': 'Estimulante',
  'bomba-de-clarao': 'Purificador',
  'cola-instantanea': 'Vinculante',
  'soro-adaptativo': 'Fortificante',
  'tonico-de-celeridade': 'Estimulante',
  'coagulante-de-emergencia': 'Regenerativo',
  'soro-da-verdade': 'Purificador',
  'barreira-dobravel': 'Resistente',
  'mina-adesiva': 'Explosivo',
  'gancho-motorizado': 'Vinculante',
  'drone-batedor': 'Condutor',
  'carga-de-fumaca': 'Absorvente',
  'sensor-de-analise': 'Canalizador',
  'bobina-de-choque': 'Condutor',
  'holofote-de-campo': 'Arcano',
  'injetor-de-reparo': 'Regenerativo',
  'sirene-chamariz': 'Estimulante',
  'pe-de-cabra-hidraulico': 'Resistente',
  'chave-decodificadora': 'Canalizador',
  'propulsor-de-salto': 'Explosivo',
  'espuma-de-contencao': 'Vinculante',
  'projetor-holografico': 'Arcano',
  'pulso-eletromagnetico': 'Condutor',
  'aranha-de-reparo': 'Regenerativo',
  'cabo-de-tirolesa': 'Flexível',
  'ancora-gravitacional': 'Canalizador',
  'sinalizador-teleguiado': 'Amplificador',
  'infusao-de-ervas-puras': 'Medicinal',
  'sementes-de-marcha': 'Vital',
  'caldo-regenerativo': 'Regenerativo',
  'pao-de-vigilia': 'Nutritivo',
  'cha-de-foco': 'Estimulante',
  'ensopado-fortificante': 'Fortificante',
  'conserva-do-caminho': 'Conservante',
  'sopa-purificadora': 'Purificador',
  'torta-revigorante': 'Vital',
  'molho-picante': 'Fortificante',
  'suco-de-laranja': 'Medicinal',
  'iogurte-com-granola': 'Fortificante',
  feijoada: 'Resistente',
  'risoto-de-cogumelos': 'Anímico',
  'curry-de-legumes': 'Isolante',
  'cuscuz-nordestino': 'Estimulante',
  'empada-de-frango': 'Resistente',
  ramen: 'Regenerativo',
  brigadeiro: 'Anímico',
  moqueca: 'Absorvente',
};

/** Uma preparação normal de classe paga um lote genérico por descanso. A
 * propriedade legada fica apenas como pista de ficção e compatibilidade. */
function simplificarPreparoClasse(receitas: ReceitaMaterial[]): ReceitaMaterial[] {
  return receitas.map((receita) => {
    const propriedade = REAGENTE_SIMPLES[receita.id];
    if (!propriedade) throw new RangeError(`Receita de classe sem reagente simples: ${receita.id}`);
    return {
      ...receita,
      modoPreparo: 'estoque-da-classe',
      custoRecurso: {
        recurso: RECURSO_POR_CLASSE[receita.classe]!,
        quantidade: 1,
        escopo: 'por-descanso',
        progressaoRaridade: receita.classe === 'alquimista'
          ? 'nivel-formula-alquimista'
          : receita.classe === 'engenheiro'
            ? 'nivel-projeto-engenheiro'
          : receita.classe === 'cozinheiro'
            ? 'nivel-receita-cozinheiro'
            : undefined,
      },
      linhas: [{
        id: 'reagente-de-referencia',
        quantidade: 1,
        propriedade: { nome: propriedade, valorMinimo: 1 },
      }],
    };
  });
}

/**
 * Perfis materiais de todas as fórmulas publicadas na classe Alquimista.
 * O efeito continua canônico em `data/ficha/classes.json`; os textos abaixo
 * são mantidos em sincronia por teste.
 */
export const FORMULAS_MATERIAIS_ALQUIMISTA: ReceitaMaterial[] = simplificarPreparoClasse([
  {
    id: 'cura-menor',
    titulo: 'Cura Menor',
    classe: 'alquimista',
    raridade: 'comum',
    linhas: [
      { id: 'extrato-medicinal', quantidade: 1, propriedade: { nome: 'Medicinal', valorMinimo: 2 } },
    ],
    efeito: 'O xarope básico de qualquer bancada. Restaura 2d6 de Vida em uma criatura viva ao toque e encerra Sangramento. Você já conhece esta fórmula desde o nível 1.',
  },
  {
    id: 'fogo-alquimico',
    titulo: 'Fogo Alquímico',
    classe: 'alquimista',
    raridade: 'comum',
    linhas: [
      { id: 'carga-inflamavel', quantidade: 1, propriedade: { nome: 'Inflamável', valorMinimo: 2 } },
      { id: 'estabilizador', quantidade: 1, propriedade: { nome: 'Estável', valorMinimo: 1 } },
    ],
    efeito: 'Arremesse o frasco num ponto a até 12 m. Criaturas em 3 m sofrem 2d8 de dano de fogo e testam Reflexos contra a sua DT de Alquimista para sofrer metade. O fogo pega em pano, óleo e mato seco. Você já conhece esta fórmula desde o nível 1.',
  },
  {
    id: 'antidoto',
    titulo: 'Antídoto',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [
      { id: 'molde-da-aflicao', quantidade: 1, materialId: 'comp-amostra-biologica' },
      { id: 'base-medicinal', quantidade: 2, materialId: 'comp-ervas-comuns' },
    ],
    efeito: 'Reduz em um estágio uma aflição de veneno ou doença que esteja afetando o alvo. Ele pode fazer imediatamente um novo teste com vantagem contra essa aflição. Você já conhece esta fórmula desde o nível 1.',
  },
  {
    id: 'elixir-de-mana',
    titulo: 'Elixir de Mana',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [
      { id: 'meio-canalizador', quantidade: 1, propriedade: { nome: 'Canalizador', valorMinimo: 2 } },
      { id: 'carga-arcana', quantidade: 1, propriedade: { nome: 'Arcano', valorMinimo: 1 } },
    ],
    efeito: 'Restaura 2d4 de Mana em uma criatura ao toque. A mesma criatura só aproveita um Elixir de Mana por cena: o segundo frasco desce sem efeito.',
  },
  {
    id: 'nevoa-densa',
    titulo: 'Névoa Densa',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [
      { id: 'meio-absorvente', quantidade: 1, propriedade: { nome: 'Absorvente', valorMinimo: 2 } },
    ],
    efeito: 'Enche uma esfera de 6 m de fumaça pesada por três rodadas. Quem está dentro recebe camuflagem, e ataques à distância que atravessam a nuvem sofrem −2. Vento forte encurta a duração para uma rodada.',
  },
  {
    id: 'mutagenico',
    titulo: 'Mutagênico',
    classe: 'alquimista',
    raridade: 'raro',
    linhas: [
      { id: 'molde-biologico', quantidade: 1, materialId: 'comp-amostra-biologica' },
      { id: 'agente-mutageno', quantidade: 1, materialId: 'comp-vestigio-material' },
    ],
    efeito: 'A criatura escolhe um atributo físico para receber +2 e outro para receber −2 por três rodadas. Quando acaba, ela fica com 1 de Cansaço. Um mutagênico por criatura por cena.',
  },
  {
    id: 'acido-corrosivo',
    titulo: 'Ácido Corrosivo',
    classe: 'alquimista',
    raridade: 'raro',
    linhas: [
      { id: 'agente-corruptor', quantidade: 1, materialId: 'comp-vestigio-material' },
      { id: 'base-mineral', quantidade: 1, categoria: 'Mineral' },
    ],
    efeito: 'Acerta uma criatura ou um objeto a até 12 m com 2d6 de dano de ácido, ignorando 5 de Resistência. Em falha no teste de Reflexos, a armadura ou a arma que o alvo estiver usando perde 1 de bônus até alguém consertar.',
  },
  {
    id: 'oleo-deslizante',
    titulo: 'Óleo Deslizante',
    classe: 'alquimista',
    raridade: 'comum',
    linhas: [
      { id: 'base-isolante', quantidade: 1, propriedade: { nome: 'Isolante', valorMinimo: 2 } },
      { id: 'aditivo-inflamavel', quantidade: 1, propriedade: { nome: 'Inflamável', valorMinimo: 1 } },
    ],
    efeito: 'Cobre uma área de 3 m por três rodadas. A área vira terreno difícil, e quem entrar ou começar o turno nela testa Reflexos contra a sua DT de Alquimista para não cair. O óleo pega fogo se alguém encostar chama nele.',
  },
  {
    id: 'veneno-de-contato',
    titulo: 'Veneno de Contato',
    classe: 'alquimista',
    raridade: 'raro',
    linhas: [
      { id: 'molde-biologico', quantidade: 1, materialId: 'comp-amostra-biologica' },
      { id: 'agente-corruptor', quantidade: 1, materialId: 'comp-vestigio-material' },
    ],
    efeito: 'Passe a dose numa arma ou em três projéteis. No primeiro acerto, o alvo testa Fortitude contra a sua DT de Alquimista; em falha, sofre 2d6 de dano de veneno e fica com −2 em testes físicos até o fim do próximo turno dele. O que sobrou seca no fim da cena.',
  },
  {
    id: 'frasco-congelante',
    titulo: 'Frasco Congelante',
    classe: 'alquimista',
    raridade: 'raro',
    linhas: [
      { id: 'carga-elemental', quantidade: 1, materialId: 'comp-amostra-elemental' },
      { id: 'frasco-isolante', quantidade: 1, propriedade: { nome: 'Isolante', valorMinimo: 1 }, estadoMinimo: 'processado' },
    ],
    efeito: 'Estoura em 3 m e causa 2d6 de dano de frio. Quem falhar em Fortitude contra a sua DT de Alquimista perde 3 m de Movimento até o fim do próximo turno. Congela um palmo de água parada e trava um mecanismo simples exposto.',
  },
  {
    id: 'cataplasma-de-ferro',
    titulo: 'Cataplasma de Ferro',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [
      { id: 'matriz-regenerativa', quantidade: 1, propriedade: { nome: 'Regenerativo', valorMinimo: 2 } },
      { id: 'estrutura-resistente', quantidade: 1, propriedade: { nome: 'Resistente', valorMinimo: 2 }, estadoMinimo: 'processado' },
    ],
    efeito: 'A criatura recebe 10 de Vida temporária e +1 de Defesa por três rodadas. A Vida temporária que sobrar some quando a duração acaba.',
  },
  {
    id: 'reagente-revelador',
    titulo: 'Reagente Revelador',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [
      { id: 'solvente-puro', quantidade: 1, propriedade: { nome: 'Purificador', valorMinimo: 1 } },
      { id: 'meio-canalizador', quantidade: 1, propriedade: { nome: 'Canalizador', valorMinimo: 2 }, estadoMinimo: 'processado' },
    ],
    efeito: 'O pó marca o que está escondido numa área de 6 m por três rodadas: criatura invisível fica com o contorno visível, ilusão ganha uma borda tremida e veneno em comida ou bebida muda de cor. Ele mostra que existe, e desfazer continua sendo com você.',
  },
  {
    id: 'essencia-de-sombra',
    titulo: 'Essência de Sombra',
    classe: 'alquimista',
    raridade: 'raro',
    linhas: [
      { id: 'essencia-necrotica', quantidade: 1, materialId: 'drop-vampiro-essência' },
    ],
    efeito: 'Por três rodadas, a criatura tem vantagem em Furtividade, não deixa rastro nem cheiro e não faz barulho ao andar. Atacar encerra o efeito.',
  },
  {
    id: 'tonico-do-folego',
    titulo: 'Tônico do Fôlego',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [
      { id: 'base-estimulante', quantidade: 1, propriedade: { nome: 'Estimulante', valorMinimo: 2 } },
      { id: 'agente-purificador', quantidade: 1, propriedade: { nome: 'Purificador', valorMinimo: 1 } },
    ],
    efeito: 'Remove 1 de Cansaço de uma criatura e deixa ela respirar sem prejuízo em ar viciado, fumaça ou gás por uma cena. Cada criatura aproveita um Tônico por descanso.',
  },
  {
    id: 'bomba-de-clarao',
    titulo: 'Bomba de Clarão',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [{ id: 'carga-purificadora', quantidade: 1, propriedade: { nome: 'Purificador', valorMinimo: 1 } }],
    efeito: 'Arremesse a ampola num ponto a até 12 m. Criaturas em 3 m testam Fortitude contra a sua DT de Alquimista; quem falhar fica Cego até o início do próximo turno. Quem passar sofre −2 no próximo teste de Percepção que fizer nesta rodada.',
  },
  {
    id: 'cola-instantanea',
    titulo: 'Cola Instantânea',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [{ id: 'resina-vinculante', quantidade: 1, propriedade: { nome: 'Vinculante', valorMinimo: 1 } }],
    efeito: 'Cubra uma criatura ou objeto com resina de secagem súbita. A criatura testa Reflexos contra a sua DT de Alquimista; em falha, fica Imobilizada até o fim do próximo turno. Ela ou uma criatura adjacente pode gastar uma Ação Padrão para romper a cola antes disso. Em objeto, a dose fecha uma porta, trava um mecanismo simples ou fixa até 25 kg.',
  },
  {
    id: 'soro-adaptativo',
    titulo: 'Soro Adaptativo',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [{ id: 'base-fortificante', quantidade: 1, propriedade: { nome: 'Fortificante', valorMinimo: 1 } }],
    efeito: 'Ao beber, escolha calor extremo, frio extremo, grande altitude ou ambiente tóxico. Por uma cena, a criatura ignora penalidades ambientais comuns daquela escolha, mas não ignora dano, aflições nem falta total de ar.',
  },
  {
    id: 'tonico-de-celeridade',
    titulo: 'Tônico de Celeridade',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [{ id: 'base-estimulante', quantidade: 1, propriedade: { nome: 'Estimulante', valorMinimo: 1 } }],
    efeito: 'A criatura aumenta o Movimento em 3 m por três rodadas. Uma criatura aproveita apenas um Tônico de Celeridade por cena; uma segunda dose não renova a duração.',
  },
  {
    id: 'coagulante-de-emergencia',
    titulo: 'Coagulante de Emergência',
    classe: 'alquimista',
    raridade: 'incomum',
    linhas: [{ id: 'agente-regenerativo', quantidade: 1, propriedade: { nome: 'Regenerativo', valorMinimo: 1 } }],
    efeito: 'Quando uma criatura viva adjacente cair a 0 de Vida sem morrer imediatamente, aplique a dose para estabilizá-la. Ela continua inconsciente e com 0 de Vida, mas deixa de avançar em Morrendo por falta de estabilização. Uma criatura aproveita esta fórmula apenas uma vez por descanso.',
  },
  {
    id: 'soro-da-verdade',
    titulo: 'Soro da Verdade',
    classe: 'alquimista',
    raridade: 'raro',
    linhas: [{ id: 'agente-purificador', quantidade: 1, propriedade: { nome: 'Purificador', valorMinimo: 1 } }],
    efeito: 'Uma criatura que ingerir a dose testa Fortitude contra a sua DT de Alquimista. Em falha, por três rodadas ela não consegue dizer algo que acredita ser falso. Ela ainda pode ficar em silêncio, responder pela metade ou se recusar a cooperar; o soro não obriga ninguém a revelar informação.',
  },
]);

function projetoEngenhoca(id: string, titulo: string, efeito: string): ReceitaMaterial {
  const propriedade = REAGENTE_SIMPLES[id];
  if (!propriedade) throw new RangeError(`Projeto de Engenheiro sem propriedade de referência: ${id}`);
  return {
    id,
    titulo,
    classe: 'engenheiro',
    raridade: 'comum',
    linhas: [{ id: 'pecas-de-referencia', quantidade: 1, propriedade: { nome: propriedade, valorMinimo: 1 } }],
    efeito,
  };
}

/** Os vinte projetos publicados na lista de Engenhocas do Engenheiro. */
export const PROJETOS_MATERIAIS_ENGENHEIRO: ReceitaMaterial[] = simplificarPreparoClasse([
  projetoEngenhoca('mina-adesiva', 'Mina Adesiva', 'Fixe a carga no seu espaço, num espaço adjacente ou em qualquer superfície a até 6 m de arremesso. A primeira criatura que entrar no espaço ou encostar nela sofre 2d6 de dano de impacto e perde 3 m de Movimento até o fim do próximo turno dela. Quem enxerga a mina consegue evitar o espaço sem teste.'),
  projetoEngenhoca('gancho-motorizado', 'Gancho Motorizado', 'Acerte uma superfície sólida a até 12 m e se puxe até lá sem teste de escalada, ou traga para a sua mão um objeto solto de até 25 kg no mesmo alcance. Puxar uma criatura exige a permissão dela.'),
  projetoEngenhoca('drone-batedor', 'Drone Batedor', 'O drone voa por três rodadas e transmite som e imagem enquanto ficar a até 18 m de você. Nesse tempo você faz testes de Percepção pelos sensores dele. Ele tem Defesa 12, Movimento 12 m de voo e cai com 5 de dano.'),
  projetoEngenhoca('holofote-de-campo', 'Holofote de Campo', 'Ilumina uma esfera de 9 m por três rodadas. Quem está dentro perde o benefício de escuridão e de camuflagem por penumbra, e ataques contra alvos iluminados recebem +1. O holofote tem Defesa 10 e apaga com 5 de dano.'),
  projetoEngenhoca('carga-de-fumaca', 'Carga de Fumaça', 'Enche uma esfera de 6 m por três rodadas. Quem está dentro recebe camuflagem, e ataques à distância que atravessam a nuvem sofrem −2. Vento forte encurta a duração para uma rodada.'),
  projetoEngenhoca('bobina-de-choque', 'Bobina de Choque', 'Descarrega em 3 m ao redor da engenhoca. Cada criatura na área testa Fortitude contra a sua DT de Engenheiro; quem falhar sofre 1d8 de dano de raio e perde a Ação de Movimento no próximo turno. Alvo dentro d\'água ou em armadura de metal pesada tem desvantagem no teste.'),
  projetoEngenhoca('barreira-dobravel', 'Barreira Dobrável', 'Desdobra uma placa de 3 m de largura num espaço a até 6 m. Quem se abriga atrás recebe cobertura parcial, +2 de Defesa. A placa tem Defesa 10 e amassa depois de 10 de dano.'),
  projetoEngenhoca('injetor-de-reparo', 'Injetor de Reparo', 'Restaura 2d6 de Vida em um construto, veículo, arma, armadura ou criação sua ao toque, incluindo WALL-E, torreta e drone. Corpo orgânico não responde ao injetor.'),
  projetoEngenhoca('sirene-chamariz', 'Sirene Chamariz', 'A engenhoca imita vozes e passos por três rodadas para quem estiver a até 12 m dela. Criaturas que ouvirem testam Percepção contra a sua DT de Engenheiro; quem falhar gasta o próximo turno indo até a fonte do som. Uma criatura testa uma vez por acionamento.'),
  projetoEngenhoca('pe-de-cabra-hidraulico', 'Pé de Cabra Hidráulico', 'Abre uma porta emperrada, uma grade ou um alçapão mecânico sem teste, ou concede vantagem e +5 em um teste de Força para erguer, entortar ou arrombar. Portão reforçado e tranca de cofre continuam exigindo o teste.'),
  projetoEngenhoca('chave-decodificadora', 'Chave Decodificadora', 'Abre uma fechadura comum, mecânica ou eletrônica, sem teste. Contra tranca protegida ou selada por Fluxo, dá vantagem e +5 no teste de Ofício (Engenharia) para forçá-la.'),
  projetoEngenhoca('propulsor-de-salto', 'Propulsor de Salto', 'Lança você ou um aliado adjacente por 9 m em linha reta, inclusive para cima, e anula o dano de queda desta rodada. Quem é lançado escolhe a direção junto com você.'),
  projetoEngenhoca('sensor-de-analise', 'Sensor de Análise', 'Aponte para uma criatura, um mecanismo ou um material a até 12 m e descubra uma informação concreta sobre ele, sem teste: a Vida atual, uma resistência, uma vulnerabilidade ou o passo que abre o mecanismo. O Mestre responde com o dado exato, e você escolhe qual dos quatro quer antes de acionar.'),
  projetoEngenhoca('espuma-de-contencao', 'Espuma de Contenção', 'Arremesse a cápsula em uma criatura a até 9 m. Ela testa Reflexos contra a sua DT de Engenheiro; em falha, fica Imobilizada até o fim do próximo turno. Uma criatura adjacente pode gastar uma Ação Padrão para romper a espuma. Em objetos, ela veda uma abertura de até 1 m por uma cena.'),
  projetoEngenhoca('projetor-holografico', 'Projetor Holográfico', 'Posicione a engenhoca a até 12 m. Por três rodadas ela projeta a imagem e o som de uma criatura ou objeto Médio. Quem interagir testa Percepção contra a sua DT de Engenheiro; em falha, acredita que a projeção é real até tocá-la ou vê-la atravessar algo.'),
  projetoEngenhoca('pulso-eletromagnetico', 'Pulso Eletromagnético', 'Arremesse o emissor num ponto a até 9 m. Máquinas e construtos em uma esfera de 3 m testam Fortitude contra a sua DT de Engenheiro; em falha, perdem reações e sofrem −2 nos ataques até o fim do próximo turno. Aparelhos comuns desligam pelo mesmo período.'),
  projetoEngenhoca('aranha-de-reparo', 'Aranha de Reparo', 'Solte um pequeno autômato que dura três rodadas, tem Defesa 12, 5 de Vida e Movimento 6 m. No fim de cada turno seu, ele restaura 1d6 de Vida de um construto, veículo, item ou criação adjacente. Você escolhe o alvo sem gastar ação.'),
  projetoEngenhoca('cabo-de-tirolesa', 'Cabo de Tirolesa', 'Fixe as duas pontas entre superfícies que estejam a até 18 m uma da outra. Até o fim da cena, qualquer criatura alcança a outra ponta gastando uma Ação de Movimento, desde que tenha uma mão livre. O cabo aguenta até duas criaturas ao mesmo tempo.'),
  projetoEngenhoca('ancora-gravitacional', 'Âncora Gravitacional', 'Arremesse a âncora num ponto a até 9 m. Por três rodadas, uma esfera de 3 m ao redor dela vira terreno difícil. Quem começar o turno na área testa Fortitude contra a sua DT de Engenheiro; em falha, não pode usar deslocamentos especiais naquele turno.'),
  projetoEngenhoca('sinalizador-teleguiado', 'Sinalizador Teleguiado', 'Marque uma criatura que você enxergue a até 18 m por três rodadas. A primeira vez por rodada que um aliado atacar o alvo marcado, recebe +1 no ataque e ignora camuflagem comum. O sinalizador termina se o alvo ficar atrás de cobertura total.'),
]);

/** Receitas oficiais da classe Cozinheiro. Os efeitos são mantidos em
 * sincronia com o Cardápio publicado em `data/ficha/classes.json`. */
export const RECEITAS_MATERIAIS_COZINHEIRO: ReceitaMaterial[] = simplificarPreparoClasse([
  {
    id: 'infusao-de-ervas-puras',
    titulo: 'Chá de Hortelã',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'ervas', quantidade: 1, propriedade: { nome: 'Medicinal', valorMinimo: 1 } }],
    efeito: 'Bebida. O alvo recebe +2 no próximo teste de Fortitude contra veneno ou doença que fizer nesta cena. Receita inicial.',
  },
  {
    id: 'sementes-de-marcha',
    titulo: 'Paçoca de Amendoim',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-vital', quantidade: 1, propriedade: { nome: 'Vital', valorMinimo: 1 } }],
    efeito: 'Lanche. O Movimento do alvo aumenta em 3 m por três rodadas. Receita inicial.',
  },
  {
    id: 'caldo-regenerativo',
    titulo: 'Canja de Galinha',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-regenerativa', quantidade: 1, propriedade: { nome: 'Regenerativo', valorMinimo: 1 } }],
    efeito: 'Refeição. A recuperação de Vida do descanso melhora em uma categoria, no máximo Boa. Receita inicial.',
  },
  {
    id: 'pao-de-vigilia',
    titulo: 'Pão de Queijo',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-nutritiva', quantidade: 1, propriedade: { nome: 'Nutritivo', valorMinimo: 1 } }],
    efeito: 'Lanche. Até o fim da cena, o alvo calcula as penalidades de Cansaço como se tivesse 1 ponto a menos; isso não remove Cansaço nem altera seus limites.',
  },
  {
    id: 'cha-de-foco',
    titulo: 'Café Expresso',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'estimulante', quantidade: 1, propriedade: { nome: 'Estimulante', valorMinimo: 1 } }],
    efeito: 'Bebida. O alvo recebe vantagem no próximo teste de Percepção ou Vontade que fizer nesta cena, à escolha de quem bebe.',
  },
  {
    id: 'ensopado-fortificante',
    titulo: 'Cozido de Carne',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-fortificante', quantidade: 1, propriedade: { nome: 'Fortificante', valorMinimo: 1 } }],
    efeito: 'Refeição. O alvo recebe +2 em Fortitude até o descanso seguinte. A mesma criatura mantém o benefício de apenas uma refeição por vez.',
  },
  {
    id: 'conserva-do-caminho',
    titulo: 'Onigiri',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'conservacao', quantidade: 1, propriedade: { nome: 'Conservante', valorMinimo: 1 } }],
    efeito: 'Lanche. Reduz 1 de Cansaço. Uma criatura aproveita esta receita apenas uma vez por descanso.',
  },
  {
    id: 'sopa-purificadora',
    titulo: 'Sopa de Legumes',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'ingrediente-purificador', quantidade: 1, propriedade: { nome: 'Purificador', valorMinimo: 1 } }],
    efeito: 'Refeição. Uma criatura afetada por veneno ou doença faz imediatamente um novo teste contra a aflição com +2. A sopa não reduz o estágio por conta própria.',
  },
  {
    id: 'torta-revigorante',
    titulo: 'Torta de Maçã',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'essencia-vital', quantidade: 1, propriedade: { nome: 'Vital', valorMinimo: 1 } }],
    efeito: 'Refeição. Restaura 1d4 de Mana. A mesma criatura aproveita esta receita apenas uma vez por descanso.',
  },
  {
    id: 'molho-picante',
    titulo: 'Acarajé',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'tempero-fortificante', quantidade: 1, propriedade: { nome: 'Fortificante', valorMinimo: 1 } }],
    efeito: 'Lanche. O próximo ataque com arma que o alvo acertar até o fim do próximo turno causa +1d6 de dano do mesmo tipo da arma. O prato não cria dano elemental.',
  },
  {
    id: 'suco-de-laranja',
    titulo: 'Suco de Laranja',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'fruta-medicinal', quantidade: 1, propriedade: { nome: 'Medicinal', valorMinimo: 1 } }],
    efeito: 'Bebida. Restaura 1d6 de Vida de uma criatura viva. A mesma criatura aproveita esta receita apenas uma vez por cena.',
  },
  {
    id: 'iogurte-com-granola',
    titulo: 'Iogurte com Granola',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-fortificante', quantidade: 1, propriedade: { nome: 'Fortificante', valorMinimo: 1 } }],
    efeito: 'Lanche. O alvo recebe 1d6 de Vida temporária por três rodadas. A Vida temporária restante desaparece quando a duração termina.',
  },
  {
    id: 'feijoada',
    titulo: 'Feijoada',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-resistente', quantidade: 1, propriedade: { nome: 'Resistente', valorMinimo: 1 } }],
    efeito: 'Refeição. O alvo recebe Resistência 2 contra dano físico até o descanso seguinte. A mesma criatura mantém o benefício de apenas uma refeição por vez.',
  },
  {
    id: 'risoto-de-cogumelos',
    titulo: 'Risoto de Cogumelos',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'ingrediente-animico', quantidade: 1, propriedade: { nome: 'Anímico', valorMinimo: 1 } }],
    efeito: 'Refeição. O alvo recebe +2 nos próximos dois testes de Percepção ou Vontade que fizer até o descanso seguinte.',
  },
  {
    id: 'curry-de-legumes',
    titulo: 'Curry de Legumes',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-isolante', quantidade: 1, propriedade: { nome: 'Isolante', valorMinimo: 1 } }],
    efeito: 'Refeição. Escolha uma afinidade elemental ao servir. O alvo recebe Resistência 3 contra dano dessa afinidade por uma cena.',
  },
  {
    id: 'cuscuz-nordestino',
    titulo: 'Cuscuz Nordestino',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-estimulante', quantidade: 1, propriedade: { nome: 'Estimulante', valorMinimo: 1 } }],
    efeito: 'Lanche. O alvo recebe +2 na próxima iniciativa que rolar antes do descanso seguinte.',
  },
  {
    id: 'empada-de-frango',
    titulo: 'Empada de Frango',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-resistente', quantidade: 1, propriedade: { nome: 'Resistente', valorMinimo: 1 } }],
    efeito: 'Lanche. O alvo recebe +1 de Defesa por três rodadas. Uma segunda porção não acumula o bônus, apenas renova a duração.',
  },
  {
    id: 'ramen',
    titulo: 'Ramen',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-regenerativa', quantidade: 1, propriedade: { nome: 'Regenerativo', valorMinimo: 1 } }],
    efeito: 'Refeição. Restaura 2d6 de Vida e encerra Sangramento. A mesma criatura aproveita esta receita apenas uma vez por descanso.',
  },
  {
    id: 'brigadeiro',
    titulo: 'Brigadeiro',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'ingrediente-animico', quantidade: 1, propriedade: { nome: 'Anímico', valorMinimo: 1 } }],
    efeito: 'Lanche. O alvo recebe +2 em Vontade por três rodadas. Uma segunda porção não acumula o bônus, apenas renova a duração.',
  },
  {
    id: 'moqueca',
    titulo: 'Moqueca',
    classe: 'cozinheiro',
    raridade: 'comum',
    linhas: [{ id: 'base-absorvente', quantidade: 1, propriedade: { nome: 'Absorvente', valorMinimo: 1 } }],
    efeito: 'Refeição. Por três rodadas, reduza em 2 o primeiro dano que o alvo sofrer em cada rodada.',
  },
]);
