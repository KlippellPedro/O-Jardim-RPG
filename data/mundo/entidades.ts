export interface TemaEntidade {
  /** Cor principal da página, em qualquer formato CSS válido. */
  destaque: string;
  destaqueSuave: string;
  fundo: string;
  superficie: string;
  texto: string;
  textoSuave: string;
  /** Segunda cor de destaque, para entidades com paleta de duas cores (ex: chama contra veste). Padrão: repete `destaque`. */
  destaqueSecundario?: string;
  /** Imagem opcional servida pela pasta public/. */
  imagemFundo?: string;
  /**
   * 'fixa' (padrão): imagemFundo cobre a tela inteira, parada.
   * 'errante': a figura vai se reposicionando sozinha pelo fundo da página, uma aparição por vez.
   */
  modoImagem?: 'fixa' | 'errante';
  /** Aplica moldura dourada, brasão e ambientação de realeza ao redor do conto. */
  moldura?: 'realeza';
}

export interface MusicaTemaEntidade {
  titulo: string;
  arquivo: string;
  credito?: string;
  /** Fração (0-1) aplicada sobre o volume do usuário, para faixas pensadas para tocar bem baixo. Padrão: 1. */
  volumeAlvo?: number;
}

export interface SecaoContoEntidade {
  titulo?: string;
  paragrafos: string[];
}

export type RankPerigoId = 'azul' | 'verde' | 'laranja' | 'vermelho' | 'preto';
export type ClassificacaoEntidadeId = 'pacifico' | 'agressivo' | 'neutro' | 'negociador' | 'propria';

export interface RankPerigoEntidade {
  id: RankPerigoId;
  titulo: string;
  cor: string;
  descricao: string;
}

export interface ClassificacaoEntidade {
  id: ClassificacaoEntidadeId;
  titulo: string;
  descricao: string;
}

export const RANKS_PERIGO: RankPerigoEntidade[] = [
  {
    id: 'azul',
    titulo: 'Azul',
    cor: '#4ca7ff',
    descricao: 'Entidades que não apresentam grande ameaça às pessoas. Evitam brigas e discussões ao máximo.',
  },
  {
    id: 'verde',
    titulo: 'Verde',
    cor: '#55c979',
    descricao: 'Entidades capazes de causar destruição, mas que normalmente só reagem quando são incomodadas.',
  },
  {
    id: 'laranja',
    titulo: 'Laranja',
    cor: '#f59b45',
    descricao: 'Entidades pouco amigáveis. Ao encontrar uma, tome cuidado com o que diz: qualquer motivo pode fazê-la partir para cima de você.',
  },
  {
    id: 'vermelho',
    titulo: 'Vermelho',
    cor: '#ef4c4c',
    descricao: 'Entidades de enorme risco, criadas e invocadas pelo mais puro sentimento de um ser. Ao ver uma, saiba que você foi escolhido pelo sentimento que o domina naquele momento.',
  },
  {
    id: 'preto',
    titulo: 'Preto',
    cor: '#8d8797',
    descricao: 'Entidades misteriosas, com motivos próprios para existir e agir. Ninguém sabe como surgiram; sabe-se apenas que não se deve mexer com esses seres.',
  },
];

export const CLASSIFICACOES_ENTIDADE: ClassificacaoEntidade[] = [
  {
    id: 'pacifico',
    titulo: 'Pacífico',
    descricao: 'Entidades pacíficas que normalmente seguem seus próprios afazeres, sem procurar briga com outros seres.',
  },
  {
    id: 'agressivo',
    titulo: 'Agressivo',
    descricao: 'Entidades que apreciam o caos e o conflito. Se você ficar frente a frente com uma delas, espere sair machucado.',
  },
  {
    id: 'neutro',
    titulo: 'Neutro',
    descricao: 'Entidades misteriosas. É difícil saber se atacarão ou simplesmente ignorarão você; tudo depende das suas ações.',
  },
  {
    id: 'negociador',
    titulo: 'Negociador',
    descricao: 'Entidades que tentarão negociar alguma coisa com você. Aceitar uma conversa pode ser a melhor forma de evitar conflito.',
  },
  {
    id: 'propria',
    titulo: 'Própria',
    descricao: 'Entidades que não se encaixam em nenhuma das classificações anteriores e seguem uma lógica exclusiva.',
  },
];

export interface EntidadeCatalogo {
  id: string;
  nome: string;
  epiteto?: string;
  epigrafe?: string;
  resumo: string;
  rankPerigo: RankPerigoId;
  classificacao: ClassificacaoEntidadeId[];
  tema: TemaEntidade;
  musicaTema?: MusicaTemaEntidade;
  conto: SecaoContoEntidade[];
}

/**
 * Fonte oficial dos contos do Livro das Entidades.
 *
 * Uma entrada só deve ser publicada aqui quando tiver um conto. O índice e a
 * página de leitura são montados automaticamente a partir desta lista.
 */
export const ENTIDADES: EntidadeCatalogo[] = [
  {
    id: 'dama-solitaria',
    nome: 'Dama Solitária',
    epigrafe: 'A felicidade é efêmera, e a solidão é um destino inevitável.',
    resumo: 'Aparece a quem perdeu tudo e oferece um último desejo. O preço é a solidão eterna.',
    rankPerigo: 'vermelho',
    classificacao: ['pacifico', 'negociador'],
    tema: {
      destaque: '#b9c2d1',
      destaqueSuave: 'rgba(185, 194, 209, .15)',
      fundo: '#05060a',
      superficie: 'rgba(13, 15, 20, .86)',
      texto: '#eef1f5',
      textoSuave: '#9da3ae',
      imagemFundo: '/assets/img/entidades/dama-solitaria-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Never Meant to Belong',
      arquivo: '/assets/audio/entidades/dama-solitaria-never-meant-to-belong.mp3',
      volumeAlvo: 0.5,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, havia uma lenda que ecoava entre todos os cantos. Os aldeões falavam em tom de temor sobre a Dama Solitária, uma entidade que se alimentava da dor e da tristeza, aparecendo para aqueles que haviam perdido tudo.',
          'Certa noite, sob um céu carregado de nuvens escuras, Elias caminhava pela floresta, seu coração pesado como uma âncora. A morte de sua amada, Clara, havia deixado um vazio insuportável em sua vida, como se ele estivesse preso entre o mundo dos vivos e o abismo da solidão. Cada passo que dava era um lembrete da ausência dela, e a dor pulsava em seu peito como uma ferida aberta.',
          'Foi então que, em meio à neblina, um ser apareceu: a Dama Solitária, envolta em seu véu branco como a luz da lua, que parecia ampliar a solidão que ele sentia. Seus olhos, profundos, tristes e brilhantes, refletiam a dor de milhares de almas perdidas.',
          '“Você me chamou, Elias?” Sua voz era um distante lamento de um coração quebrado.',
          '“Eu não chamei ninguém”, ele respondeu, a voz embargada.',
          '“Eu sou a resposta para sua tristeza”, ela disse, com um tom que misturava compaixão e desespero. “Posso realizar um último desejo, algo que trará um breve alívio ao seu coração antes que você se afunde na solidão eterna.”',
          'Elias hesitou, a esperança e o desespero lutando dentro dele. “Eu desejo vê-la novamente”, ele murmurou, lágrimas escorrendo por seu rosto. “Quero sentir seu toque, ouvir sua voz mais uma vez.”',
          'A Dama Solitária sorriu, mas era um sorriso triste, como se ela conhecesse o peso da dor que ele carregava. “Seu desejo será atendido, mas lembre-se: a felicidade é efêmera, e a solidão é um destino inevitável.”',
          'Com um gesto de sua mão, a Dama conjurou uma visão de Clara, dançando sob a luz da lua, seu sorriso radiante iluminando a escuridão. Elias sentiu seu coração acelerar, mas, ao se aproximar, a imagem começou a se desfazer como fumaça entre seus dedos. Ele estendeu a mão, mas tudo o que tocou foi o vazio.',
          '“Clara!” ele gritou, a dor se transformando em desespero. “Não vá! Eu não posso viver sem você!”',
          'A Dama Solitária observou, impassível, enquanto a cena se desvanecia. “Agora você conhece a alegria e a dor”, ela disse, sua voz um sussurro cortante. “A solidão é o preço a pagar por um último desejo.”',
          'Elias caiu de joelhos, o lamento de sua alma ecoando pela floresta. Ele havia experimentado um momento de felicidade, mas agora estava mais perdido do que nunca. A escuridão começou a envolvê-lo, e ele sentiu a solidão se aprofundar, como se garras invisíveis o puxassem para um abismo sem fim.',
          '“Você não pode me deixar assim!” ele implorou, mas a Dama Solitária apenas balançou a cabeça, seu olhar cheio de compaixão e tristeza. “A vida é feita de escolhas, e você escolheu o desejo. Agora, você deve enfrentar o vazio.”',
          'E assim, a Dama Solitária desapareceu na escuridão, com mais uma alma em sua posse.',
        ],
      },
    ],
  },
  {
    id: 'dama-das-chamas',
    nome: 'Dama das Chamas',
    epigrafe: 'Ela não busca ouro, nem glória, mas sim o fogo da rivalidade.',
    resumo: 'Aparece onde a paz ameaça durar e semeia rivalidade só para ver o mundo pegar fogo.',
    rankPerigo: 'vermelho',
    classificacao: ['agressivo', 'negociador'],
    tema: {
      destaque: '#d6203f',
      destaqueSuave: 'rgba(214, 32, 63, .18)',
      fundo: '#0c0407',
      superficie: 'rgba(28, 10, 14, .86)',
      texto: '#f7e8ea',
      textoSuave: '#b98a91',
      destaqueSecundario: '#3ecbff',
      moldura: 'realeza',
      imagemFundo: '/assets/img/entidades/dama-das-chamas-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Tema da Dama das Chamas',
      arquivo: '/assets/audio/entidades/dama-das-chamas.mp3',
      volumeAlvo: 0.5,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, havia uma lenda sussurrada entre os viajantes e temida nas cortes. Falava-se sobre uma entidade ardente que surgia apenas onde o equilíbrio ameaçava se instalar. Diziam que, quando os conflitos se apagavam e a harmonia tomava conta, a Dama das Chamas aparecia não para oferecer consolo, mas para reacender as brasas da discórdia.',
          'A noite estava carregada de murmúrios e promessas. No grande salão do Inferno, anjos e demônios em seus trajes luxuosos deslizavam pelo piso, brindando à paz recém-estabelecida entre o céu e o inferno, depois de muitos anos de guerra.',
          'Então, ela chegou. A Dama das Chamas atravessou as portas do salão sem ser anunciada, mas sua presença foi sentida no instante em que seus pés tocaram o chão. Sua pele era pálida e linda como a neve, porém ardente e caótica como um vulcão. Vestia um longo vestido roxo que fluía como fumaça, e no topo de sua cabeça reluzia uma coroa vermelho-sangue, brilhante como a luz da lua. Ao seu redor, pequenas chamas azuis dançavam no ar.',
          'Os olhares se voltaram para ela. Alguns ficaram fascinados ao ver aquela mulher; outros já sabiam do perigo e ficaram apreensivos. A Dama das Chamas sorriu, um sorriso lindo, porém venenoso.',
          'Movendo-se entre os convidados, sua voz era um sussurro nas sombras, um convite à discórdia. Aos ouvidos dos anjos, lembrou das terras que os demônios haviam tomado, do sangue derramado e dos irmãos caídos. Ao conselheiro real dos demônios, insinuou traição, sugerindo que os anjos apenas esperavam o momento certo para um golpe. A um dos Pecados, sussurrou dúvidas sobre sua noiva, alimentando suspeitas de infidelidade. Cada palavra era um fósforo lançado em uma floresta seca.',
          'O salão começou a ferver. Primeiro, foram os olhares. Depois, os sussurros cortantes. Então, os gritos. Uma taça de vinho foi arremessada, estilhaçando-se contra uma coluna.',
          'O General Ethan ergueu a voz, acusando os demônios de traição. O conselheiro real rebateu com desdém. O Pecado virou-se contra sua noiva, exigindo explicações que ela não poderia dar. Os guardas se postaram tensos, prontos para intervir. Mas já era tarde demais.',
          'A primeira lâmina foi desembainhada. O caos se espalhou como fogo em um celeiro. O som do metal se chocando ecoou pelo salão; gritos substituíram a música. Nobres se atacavam, alianças se desintegravam em segundos.',
          'E no centro de tudo, a Dama das Chamas rodopiava entre os combatentes, sua risada se misturando ao crepitar das chamas azuis que agora se alastravam pelos candelabros e cortinas.',
          'Quando o sol nasceu, o grande salão estava em ruínas: corpos espalhados entre cacos de vidro e tecidos rasgados. O tratado de paz havia sido reduzido a cinzas, assim como qualquer esperança de harmonia entre demônios e anjos.',
          'E a Dama das Chamas? Partiu da mesma forma que chegou, sem ser anunciada, deixando apenas destruição em seu rastro. No fim, ninguém ousou dizer que ela sequer estivera ali.',
        ],
      },
    ],
  },
  {
    id: 'menino-guia',
    nome: 'Menino Guia',
    epigrafe: 'A luz do lampião nunca se apaga para aqueles que realmente precisam dela.',
    resumo: 'Aparece a quem perdeu algo precioso e guia até ele, sem pedir nada em troca.',
    rankPerigo: 'azul',
    classificacao: ['pacifico'],
    tema: {
      destaque: '#e6a855',
      destaqueSuave: 'rgba(230, 168, 85, .16)',
      fundo: '#070d13',
      superficie: 'rgba(13, 20, 27, .86)',
      texto: '#f2ecdf',
      textoSuave: '#8fa3ad',
      imagemFundo: '/assets/img/entidades/menino-guia-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Tema do Menino Guia',
      arquivo: '/assets/audio/entidades/menino-guia.mp3',
      volumeAlvo: 0.5,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, havia uma lenda sussurrada entre os viajantes e contada nas aldeias. Falava-se sobre uma entidade silenciosa que surgia apenas para aqueles que haviam perdido algo precioso: um objeto, um caminho, ou até a si mesmos.',
          'Em uma noite, a névoa se espalhava pelo bosque como um ar de tristeza. Lucas corria sem rumo, os pés afundando na terra úmida. Seu peito ardia, o coração martelava, mas ele não podia parar. Ela tinha que estar por perto.',
          'A boneca de pano de sua irmã. Pequena, remendada, de olhos costurados à mão. Um brinquedo sem valor para qualquer um, mas para Clara… era tudo. Ela não dormia sem a boneca nos braços, e agora soluçava em casa, chamando por ela entre lágrimas desesperadas. Ele tinha que encontrá-la.',
          'Mas a floresta não ajudava. O escuro parecia se fechar ao seu redor, e a névoa tornava tudo igual: árvores sem rosto, pedras sem forma. O medo se infiltrava em seus pensamentos. E se nunca encontrasse? E se Clara chorasse para sempre?',
          'Foi então que a luz apareceu. Suave e amarela, oscilando na bruma. Lucas piscou, e a silhueta surgiu: um menino, pequeno e magro, envolto em um manto negro que parecia devorar a escuridão. Seu rosto era impossível de ver, e debaixo do capuz, apenas um olho brilhava em dourado, como o fogo de sua lamparina.',
          'Ele não disse nada. Não precisava. O Menino Guia ergueu a mão livre e apontou.',
          'Lucas hesitou. Quem era aquela criança? Por que estava ali? Mas algo dentro dele, um instinto, um sussurro em seu peito, dizia para confiar. Ele seguiu a luz.',
          'Os passos do menino eram suaves, quase flutuantes. Lucas percebeu que o caminho mudava ao redor deles: a névoa recuava, os galhos pareciam se abrir. A floresta, antes labiríntica, agora fazia sentido.',
          'E então, ele a viu. A boneca, caída entre raízes retorcidas, suja de terra e umidade, mas intacta. Lucas a pegou com mãos trêmulas, segurando-a contra o peito. Um alívio quente o preencheu. Ele conseguiu. Clara não precisaria chorar esta noite.',
          'Quando se virou para agradecer, o Menino Guia não estava mais lá. A floresta, antes sufocante, parecia agora acolhedora. A névoa ainda pairava, mas de um jeito menos opressor.',
          'Com um último olhar para a floresta, Lucas apertou a boneca contra o peito e começou o caminho de volta. A luz do lampião já não era visível, mas, de alguma forma, ele sabia que ela nunca se apaga para aqueles que realmente precisam dela.',
        ],
      },
    ],
  },
  {
    id: 'gato-dos-desejos',
    nome: 'Gato dos Desejos',
    epigrafe: 'O primeiro sinal era sempre o sino.',
    resumo: 'Aparece a quem deseja algo com toda a alma e concede o desejo, sem nunca ser lembrado depois.',
    rankPerigo: 'azul',
    classificacao: ['propria'],
    tema: {
      destaque: '#dcdcdc',
      destaqueSuave: 'rgba(220, 220, 220, .14)',
      fundo: '#050505',
      superficie: 'rgba(14, 14, 14, .88)',
      texto: '#f2f0ec',
      textoSuave: '#8f8f8f',
      imagemFundo: '/assets/img/entidades/gato-dos-desejos-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Tema do Gato dos Desejos',
      arquivo: '/assets/audio/entidades/gato-dos-desejos.mp3',
      volumeAlvo: 0.5,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, havia uma lenda sussurrada entre os viajantes e contada nas aldeias. Falava-se sobre um pequeno gato de pelúcia, de olhos de botões vermelhos e um sino no pescoço, que surgia apenas para aqueles que desejavam algo com toda a sua alma. Alguns o viam como um milagre, outros como um presságio silencioso. Mas todos sabiam que, se ouvissem o tilintar do sino, uma escolha lhes seria dada.',
          'No silêncio da noite, um tilintar suave podia ser escutado. Depois, com os olhos atentos, era possível encontrá-lo: encolhido em uma prateleira empoeirada, sob uma mesa esquecida, ou em um canto onde ninguém jamais olharia.',
          'Um pequeno gato de pelúcia, de costuras delicadas, olhos de botões vermelhos que pareciam brilhar na penumbra. Ele nunca chamava, nunca se movia. Apenas esperava. E, sem falhar, sempre era encontrado.',
          'A primeira vez, foi uma criança. Pequena e de olhos inchados, perdida na tristeza de um lar que não a queria. Viu o gato no parapeito da janela e o segurou com as mãos trêmulas. “Eu queria que eles me amassem”, sussurrou. O sino tilintou e, na manhã seguinte, os braços dos pais estavam à sua volta, vozes cheias de um amor que antes não existia. A criança nunca mais olhou para o gato, afinal, ela já tinha conseguido o que queria.',
          'Depois, foi um homem. Um comerciante comum, falido e desesperado, afundado em dívidas que jamais conseguiria pagar. Encontrou o gato entre os utensílios velhos de sua loja e, com os olhos cheios de lágrimas de ódio, implorou: “Eu desejo riquezas e poder, desejo nunca mais conhecer a miséria”. O sino tilintou.',
          'No dia seguinte, a sorte virou. Um investimento inesperado, um cliente influente, uma fortuna construída sobre oportunidades que antes não existiam. Com o tempo, sua fortuna cresceu, e sua influência se espalhou, tornando-se um nome temido e respeitado no comércio. O homem nunca mais procurou o gato, afinal, ele comprava e vendia o que queria.',
          'Então, foi uma mulher. Vestida de preto, segurando um retrato desbotado entre os dedos. O gato estava aos seus pés, imóvel. “Eu só quero vê-lo de novo”, ela chorou. O sino tocou. E naquela noite, uma sombra familiar apareceu na porta, sorrindo como fazia antes de partir. Ela nunca mais foi atrás do gato, afinal, quem ela queria já estava lá.',
          'Ele sempre concedia. Sempre cumpria. Mas ninguém perguntava seu nome. Ninguém queria saber de onde vinha, para onde ia. Assim que o desejo era feito, ele era esquecido, deixado para trás como um brinquedo quebrado, até surgir para o próximo necessitado.',
          'E assim, o Gato dos Desejos continuava sua existência silenciosa, ouvindo seu próprio sino ecoar na solidão.',
        ],
      },
    ],
  },
  {
    id: 'enciclopedia',
    nome: 'Enciclopédia',
    epigrafe: 'O conhecimento sempre tem um preço.',
    resumo: 'Concede uma resposta a quem busca conhecimento, mas nunca de forma direta.',
    rankPerigo: 'azul',
    classificacao: ['pacifico'],
    tema: {
      destaque: '#d9b869',
      destaqueSuave: 'rgba(217, 184, 105, .16)',
      fundo: '#0a0906',
      superficie: 'rgba(20, 18, 14, .86)',
      texto: '#efe7d4',
      textoSuave: '#a49782',
      imagemFundo: '/assets/img/entidades/enciclopedia-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Tema da Enciclopédia',
      arquivo: '/assets/audio/entidades/enciclopedia.mp3',
      volumeAlvo: 0.5,
    },
    conto: [
      {
        paragrafos: [
          'A biblioteca era antiga, perdida no tempo, onde o ar cheirava a pergaminho e poeira. As estantes de madeira se estendiam ao infinito, e o silêncio era tão absoluto que o próprio pensamento parecia ecoar.',
          'Entre os corredores estreitos, um homem caminhava com passos hesitantes, sua mente fervilhando com uma única pergunta. Quando seus dedos deslizaram pela lombada de um livro sem título, o mundo ao seu redor pareceu mudar. As velas tremularam, e um sussurro percorreu o ar, como páginas sendo viradas por mãos invisíveis.',
          'Foi então que o ser apareceu: a Enciclopédia. Ele não tinha rosto, nem olhos, nem boca. Apenas uma forma de livros empilhados, flutuando no espaço, cada capa se readaptando como se respirasse. Sua voz não era um som, mas um pensamento que se impunha na mente do viajante.',
          '“Uma pergunta. Apenas uma. Faça-a com sabedoria.”',
          'O homem engoliu seco. Tantas dúvidas, tantos mistérios… mas ele tinha vindo ali por uma razão. “Onde estão as Pérolas das Raças?”',
          'As páginas do Ser se reviraram, folheando-se sozinhas em um turbilhão de palavras e símbolos antigos. A resposta veio lenta, envolta em enigmas.',
          '“Quatro pérolas forjadas do próprio destino… Guardiãs da força, da queda, da fé e do sangue. Uma está oculta onde a luz nunca toca, vigiada por olhos que nunca dormem. Outra repousa em um templo de fé, protegida por orações que o tempo não apagou. A terceira pertence àqueles que moldam o mundo com suas próprias mãos, mas carregam o peso de suas escolhas. A última… está nas sombras, onde a sede nunca é saciada.”',
          'O homem franziu a sobrancelha. O Ser não daria respostas diretas. Ele deveria decifrá-las, buscar, errar, aprender. Mas a informação estava ali, entregue com o peso do conhecimento antigo.',
          'Antes que pudesse perguntar mais, as páginas se fecharam, e o Ser do Conhecimento desapareceu. Os livros voltaram às prateleiras, as velas se acalmaram.',
          'O viajante ficou parado por um longo tempo, assimilando cada palavra. O conhecimento sempre tem um preço. E agora, ele precisaria pagar esse preço.',
        ],
      },
    ],
  },
];

export function encontrarEntidade(id: string | undefined) {
  if (!id) return undefined;
  return ENTIDADES.find((entidade) => entidade.id === id);
}
