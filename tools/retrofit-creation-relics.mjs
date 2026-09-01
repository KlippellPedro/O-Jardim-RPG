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
