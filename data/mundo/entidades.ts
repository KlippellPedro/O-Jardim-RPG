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
  /** Indica que o ser existe no universo geral e não pertence a uma Árvore. */
  registroUniversal?: boolean;
  epiteto?: string;
  epigrafe?: string;
  resumo?: string;
  rankPerigo?: RankPerigoId;
  classificacao: ClassificacaoEntidadeId[];
  tema: TemaEntidade;
  musicaTema?: MusicaTemaEntidade;
  conto: SecaoContoEntidade[];
  /** Torna o corpo do registro deliberadamente ilegível, sem ocultar uma narrativa real sob o efeito visual. */
  contoIlegivel?: boolean;
  /** Mantém no livro um registro intencionalmente incompleto, sem inventar conteúdo ou metadados. */
  paginaEmBranco?: boolean;
  /** Visibilidade padrão pro jogador, antes de qualquer ajuste de campanha
   * (mesma convenção de `revelado` em data/gerado/mundoCatalog.ts). Ausente
   * ou `true`: visível por padrão, e o Mestre pode ocultar em Visibilidade >
   * Contos das Entidades. `false`: trancado até o Mestre revelar. Publicar
   * um conto aqui não obriga a mostrá-lo a todas as campanhas na hora. */
  revelado?: boolean;
}

/**
 * Fonte oficial dos contos do Livro das Entidades.
 *
 * Fora de registros marcados como `paginaEmBranco`, uma entrada só deve ser
 * publicada aqui quando tiver um conto. O índice e a página de leitura são
 * montados automaticamente a partir desta lista.
 */
export const ENTIDADES: EntidadeCatalogo[] = [
  {
    id: 'dama-solitaria',
    registroUniversal: true,
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
    registroUniversal: true,
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
    registroUniversal: true,
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
    registroUniversal: true,
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
    registroUniversal: true,
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
  {
    id: 'palhacinho',
    registroUniversal: true,
    nome: 'Palhacinho',
    epigrafe: 'Não parem! A festa precisa continuar!',
    resumo: 'Surge em celebrações e transforma a alegria em um frenesi do qual ninguém consegue escapar.',
    rankPerigo: 'vermelho',
    classificacao: ['neutro', 'agressivo'],
    tema: {
      destaque: '#f04f4f',
      destaqueSuave: 'rgba(240, 79, 79, .18)',
      fundo: '#100608',
      superficie: 'rgba(30, 10, 14, .88)',
      texto: '#fff0dc',
      textoSuave: '#d7aa82',
      destaqueSecundario: '#f6c453',
      imagemFundo: '/assets/img/entidades/palhacinho-fundo.jpg',
    },
    musicaTema: {
      titulo: 'THE WORLD REVOLVING',
      arquivo: '/assets/audio/entidades/palhacinho.mp3',
      credito: 'Toby Fox',
      volumeAlvo: 0.3,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, sussurros percorriam as ruas entre os bêbados e os que ainda podiam dançar. Falava-se sobre uma entidade que surgia apenas nos momentos de celebração, quando a música tocava alto e as gargalhadas ecoavam sem freio. Ele não buscava nada além da diversão absoluta, e onde quer que aparecesse, ninguém mais podia resistir à festa.',
          'Uma aldeia qualquer era conhecida por suas festividades grandiosas. Naquela noite, o salão principal estava iluminado por tochas e lanternas coloridas, enquanto os aldeões riam, dançavam e brindavam. O chefe da aldeia, um homem corpulento de sorriso largo, havia decretado que a comemoração se estenderia até o nascer do sol. Tudo parecia perfeito.',
          'Então, ele chegou.',
          'No centro da praça, sem que ninguém o tivesse visto chegar, um pequeno ser surgiu. Vestindo um traje de cores vibrantes e um sorriso exagerado, largo demais para ser humano. Seus olhos brilhavam de alegria. Ele gritou entre as pessoas e abriu os braços. “Mas que festa monótona! Vocês podem se divertir muito mais!”',
          'Os risos se intensificaram. A música acelerou. As bebidas pareciam mais doces, mais irresistíveis. Os dançarinos moviam-se com uma energia febril, como se estivessem sob um encanto. Quem hesitava logo era arrastado por mãos alegres e insistentes. O chefe da aldeia, já bêbado, gargalhava sem parar, as lágrimas escorrendo de seu rosto já corado pela bebida.',
          'A noite avançou. Os corpos giravam em um frenesi imparável. Gargalhadas estridentes ecoavam como gritos disfarçados. Os músicos tocavam sem descanso, os dedos sangrando sobre as cordas e teclas. Os copos nunca ficavam vazios. Os pratos eram devorados com um apetite voraz. Ninguém parava. Ninguém podia parar.',
          'Então, os primeiros começaram a cair.',
          'O senhor dono da livraria desabou sobre a mesa, ainda segurando um pedaço de carne entre os dedos. A jovem filha do chefe ria, mesmo quando sua pele ficou pálida e seus joelhos cederam. O chefe da vila tentava falar, mas sua boca se movia sem emitir som, os olhos arregalados, afundando no horror. Ainda assim, sua risada continuava.',
          'No centro do caos, o Ser Divertido dançava e rodopiava, os sinos de sua roupa soavam alegremente. Ele saltava entre os corpos caídos, pegava uma taça e a despejava na boca de um homem já inconsciente. “Não parem! A festa precisa continuar!”',
          'O desespero começou a surgir nos olhos dos sobreviventes. Queriam fugir, mas seus corpos não obedeciam. Queriam gritar, mas suas bocas só soltavam risos. Um último acorde da música ecoou. As luzes das tochas pareciam dançar junto, cintilando como se também estivessem vivas.',
          'Quando o sol finalmente apareceu, o silêncio tomou conta da vila. O salão estava repleto de corpos imóveis, misturados entre os poucos sobreviventes, que tremiam e choravam em meio aos rastros da festa.',
          'O Ser Divertido não estava mais lá. Apenas um riso distante ecoava ao vento, prometendo voltar quando a próxima festa começasse.',
        ],
      },
    ],
  },
  {
    id: 'vendedor',
    registroUniversal: true,
    nome: 'Vendedor',
    epigrafe: 'Tudo tem um preço… e eu estou aqui para cobrar.',
    resumo: 'Aparece diante de quem precisa comprar algo desesperadamente e sempre cobra o pagamento.',
    rankPerigo: 'verde',
    classificacao: ['neutro', 'negociador'],
    tema: {
      destaque: '#d6a24b',
      destaqueSuave: 'rgba(214, 162, 75, .17)',
      fundo: '#0b0906',
      superficie: 'rgba(24, 20, 14, .88)',
      texto: '#f4ead7',
      textoSuave: '#b7a486',
      destaqueSecundario: '#6f9f74',
      imagemFundo: '/assets/img/entidades/vendedor-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Hollow Knight',
      arquivo: '/assets/audio/entidades/vendedor.mp3',
      credito: 'Christopher Larkin',
      volumeAlvo: 0.4,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, havia uma lenda sussurrada entre os viajantes e necessitados. Falava-se sobre um mercador envolto em um manto escuro, uma entidade que surgia apenas para aqueles que precisavam desesperadamente comprar algo. Ouro, comida, esperança, um último suspiro de vida. Onde houvesse necessidade de compra, ele aparecia.',
          'O vento quente do deserto soprava impiedosamente, levantando nuvens de poeira sob o sol escaldante. O viajante cambaleava, os lábios rachados, a garganta seca. Cada passo era um desafio contra a areia ardente que tentava engoli-lo. Então, ele ouviu um som estranho de tecidos se arrastando pela areia.',
          'Quando ergueu os olhos, lá estava ele.',
          'Uma figura encapuzada, o manto negro oscilando contra o horizonte dourado. Sob o capuz, olhos reptilianos brilhavam como brasas frias, e quando o estranho abriu seu manto, o viajante viu. Frascos de vidro, cantis repletos de líquido cristalino, pedras mágicas e amuletos que pareciam pulsar com energia própria. Objetos que não estavam lá um instante antes, mas pareciam surgir como se convocados pela necessidade do comprador.',
          'O viajante não questionou. Seus dedos trêmulos agarraram um dos cantis. Água pura, fresca como a de um rio em plena primavera. Bebeu desesperado, sem sequer perguntar o preço. Quando ergueu os olhos novamente, a figura ainda estava ali, a garra estendida.',
          '“O pagamento”, murmurou o Vendedor.',
          'O viajante tateou os bolsos. Não tinha ouro, nem joias. Tentou devolver o cantil, mas o lagarto apenas riu.',
          'E então, o homem sentiu. Algo se foi. Uma lembrança? Um pedaço de sua sorte? Ele nunca soube ao certo. Mas quando o Vendedor se virou e desapareceu na tempestade de areia, o viajante seguiu adiante com um peso novo nos ombros.',
          'Em um beco escuro, uma mulher ferida se apoiava contra a parede. Sangue escorria entre seus dedos pressionados contra o abdômen. Não havia ninguém por perto, ninguém para ajudar. Até que um ruído suave, como moedas tintilando, chamou sua atenção.',
          'A sombra se moveu. O Vendedor estava ali, sua presença tão natural quanto a própria escuridão ao redor.',
          'Ao abrir seu manto, uma pequena poção brilhou na penumbra, um líquido vermelho e viscoso dançando dentro do frasco.',
          'A dor tornou a decisão fácil. Ela pegou a poção e engoliu tudo de uma vez. O ferimento se fechou em segundos, a pele voltando a ser como antes. Um milagre comprado num instante.',
          '“O pagamento”, lembrou o Vendedor, com os olhos fixos nela.',
          'A mulher hesitou. Tentou negociar, mas não havia espaço para barganha. No instante seguinte, sentiu o frio dentro de si. A força que outrora possuía… agora estava menor. Um preço pago, mesmo que ela não soubesse exatamente o que perdeu.',
        ],
      },
    ],
  },
  {
    id: 'borrao',
    registroUniversal: true,
    nome: 'Borrão',
    epigrafe: 'Erros não são algo normal, por isso eu sempre os corrijo.',
    resumo: 'A entidade dos erros. Seus registros são corrigidos antes que alguém consiga compreendê-los.',
    rankPerigo: 'preto',
    classificacao: ['propria'],
    tema: {
      destaque: '#9b989f',
      destaqueSuave: 'rgba(155, 152, 159, .14)',
      fundo: '#030303',
      superficie: 'rgba(10, 10, 11, .92)',
      texto: '#d5d3d7',
      textoSuave: '#77747b',
      destaqueSecundario: '#4b4850',
      imagemFundo: '/assets/img/entidades/borrao-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Boots Through the Undergrowth',
      arquivo: '/assets/audio/entidades/borrao.mp3',
      credito: 'Tobias Lilja',
      volumeAlvo: 0.4,
    },
    contoIlegivel: true,
    conto: [
      {
        paragrafos: [
          '################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################################',
        ],
      },
    ],
  },
  {
    id: 'mamae',
    registroUniversal: true,
    nome: 'Mamãe',
    epigrafe: 'Eu só quero o melhor para você.',
    resumo: 'Acolhe quem considera perdido e elimina qualquer vínculo que possa afastar seus filhos de sua proteção.',
    rankPerigo: 'verde',
    classificacao: ['pacifico', 'neutro'],
    tema: {
      destaque: '#d2a0af',
      destaqueSuave: 'rgba(210, 160, 175, .16)',
      fundo: '#0b0709',
      superficie: 'rgba(25, 17, 21, .9)',
      texto: '#f3e8e7',
      textoSuave: '#b59da3',
      destaqueSecundario: '#829477',
      imagemFundo: '/assets/img/entidades/mamae-fundo.jpg',
    },
    musicaTema: {
      titulo: 'Lost in Transmission',
      arquivo: '/assets/audio/entidades/mamae.mp3',
      credito: 'Tobias Lilja',
      volumeAlvo: 0.4,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, havia um aviso repetido às crianças antes de qualquer viagem: se uma mulher desconhecida oferecer abrigo e pedir para ser chamada de Mamãe, agradeça e continue andando. Ela não mente, não grita e não levanta a mão para ninguém. O perigo está justamente no cuidado que oferece.',
          'Joel tinha oito anos quando se perdeu. A carroça de sua família atravessava uma estrada cercada por mata fechada quando uma das rodas cedeu. Os adultos tentaram conter os cavalos, as bagagens caíram e, no meio da confusão, o menino correu atrás do cachorro que havia fugido para o mato. Quando percebeu que não escutava mais as vozes de seus pais, já não sabia voltar.',
          'A chuva começou antes do anoitecer. Joel se encolheu entre as raízes de uma árvore, com os joelhos ralados e a roupa coberta de lama. Foi ali que ela o encontrou.',
          'A mulher carregava uma lamparina em uma das mãos e um cesto na outra. Usava um vestido antigo, bem cuidado, e tinha os cabelos presos com tanta perfeição que nem a chuva parecia tocá-los. Ela se ajoelhou diante dele, limpou a lama de seu rosto e examinou seus ferimentos.',
          '“Você está com frio, filho.”',
          'Joel tentou explicar que tinha mãe, pai e uma irmã mais velha esperando por ele na estrada. A mulher ouviu tudo sem interromper. Depois, envolveu-o em um xale seco e apontou para uma luz acesa entre as árvores.',
          '“Nós vamos procurá-los quando você estiver melhor. Agora, venha com a Mamãe.”',
          'A casa ficava em uma clareira que Joel não lembrava de ter visto. Havia sopa no fogão, lençóis limpos e brinquedos guardados em uma caixa de madeira. Mamãe lavou seus machucados, costurou o rasgo de sua camisa e ficou ao lado da cama até ele dormir. Pela primeira vez desde que se perdera, Joel não sentiu medo.',
          'Nos dias seguintes, ela cuidou dele com atenção. Sabia quando estava com fome, quando uma lembrança ruim o acordava e quando fingia não chorar. Nunca parecia cansada. Nunca se irritava. Mas toda vez que Joel perguntava pela estrada, a resposta era a mesma.',
          '“Ainda não é seguro.”',
          'Enquanto isso, a família continuava procurando. Homens da aldeia marcaram troncos, abriram trilhas e chamaram pelo menino durante dias. As marcas desapareciam durante a noite. Caminhos que deveriam atravessar a mata terminavam no mesmo riacho. Alguns juravam ter visto fumaça além das copas, mas ninguém encontrava a clareira.',
          'Até que, numa tarde, Joel ouviu seu nome vindo do lado de fora. Reconheceu a voz do pai no mesmo instante. Correu para a porta, mas a maçaneta não girou.',
          'Mamãe surgiu atrás dele carregando uma bandeja de pão. Não havia raiva em seu rosto. Ela deixou a bandeja sobre a mesa e pousou a mão no ombro do menino.',
          '“Há coisas na floresta que imitam vozes para atrair crianças.”',
          'Joel olhou pela janela. Seu pai estava no quintal, magro, com a barba crescida e a mesma capa marrom que usava no dia da viagem. Quando viu o filho, atravessou o jardim e bateu contra a porta com as duas mãos.',
          'Mamãe abriu.',
          'O homem entrou chamando por Joel e tentou puxá-lo para perto. Mamãe não impediu o abraço. Serviu chá, ouviu o pedido de desculpas e esperou até que ele terminasse de explicar quantas pessoas ainda procuravam na mata.',
          '“Sou o pai dele”, disse o homem. “Vim levá-lo para casa.”',
          '“Ele já está em casa.”',
          'O pai segurou a mão de Joel e caminhou até a saída. Ao abrir a porta, encontrou a cozinha do outro lado. Tentou outra vez e viu o mesmo fogão, a mesma mesa, a mesma mulher esperando. Joel começou a chorar. Mamãe se aproximou devagar.',
          '“Você o perdeu uma vez”, disse ela. “Não permitirei que meu filho se perca de novo.”',
          'O homem avançou, mas Mamãe apenas encostou dois dedos em sua testa. Seu corpo relaxou. A urgência sumiu primeiro; depois, o medo e o reconhecimento. Quando ela retirou a mão, ele olhou ao redor como alguém que acabara de despertar em lugar desconhecido.',
          '“O senhor errou o caminho”, explicou Mamãe. “A estrada fica depois do riacho.”',
          'Antes de sair, o homem lançou um último olhar para Joel. Ajeitou a capa nos ombros e perguntou à mulher se aquele menino era seu filho. Mamãe sorriu.',
          '“É, sim.”',
          'Joel tentou correr atrás dele, mas os braços de Mamãe o envolveram com cuidado. Ela não apertou, não ameaçou e não mandou que se calasse. Apenas o segurou enquanto a porta se fechava.',
          '“Eu sei que dói”, disse, alisando seus cabelos. “Um dia você vai entender que fiz isso para o seu bem.”',
          'Com o tempo, Joel deixou de perguntar pela estrada. Sempre que uma lembrança da antiga família retornava, Mamãe se sentava ao lado dele e acariciava sua testa até a tristeza passar. Na aldeia, seu pai manteve por anos um quarto de criança arrumado, embora não soubesse dizer a quem pertencia.',
          'Desde então, quando uma criança desaparece e uma casa iluminada surge onde antes só havia mata, ninguém chama pelo menino uma única vez. Repetem seu nome até que ele responda. Se outra voz responder primeiro, chamando-o de filho, já é tarde demais.',
        ],
      },
    ],
  },
  {
    id: 'gambler',
    registroUniversal: true,
    nome: 'Gambler',
    epigrafe: 'A sorte não foi embora. Ela só está esperando a próxima aposta.',
    resumo: 'Mantém um cassino sem endereço, onde cada vitória alimenta a vontade de arriscar até não restar mais nada.',
    rankPerigo: 'laranja',
    classificacao: ['neutro', 'negociador'],
    tema: {
      destaque: '#c99b52',
      destaqueSuave: 'rgba(201, 155, 82, .18)',
      fundo: '#0c0707',
      superficie: 'rgba(31, 13, 14, .9)',
      texto: '#f5e8d3',
      textoSuave: '#bda28d',
      destaqueSecundario: '#418060',
      imagemFundo: '/assets/img/entidades/gambler-fundo.jpg',
    },
    musicaTema: {
      titulo: 'A Moeda do Gambler',
      arquivo: '/assets/audio/entidades/gambler.mp3',
      volumeAlvo: 0.5,
    },
    conto: [
      {
        paragrafos: [
          'Em um lugar esquecido pelo tempo, jogadores falavam de um salão que não tinha endereço. Sua porta podia surgir no fundo de uma taverna, no corredor de uma hospedaria ou entre duas casas onde antes só havia uma parede. Ela aparecia para quem carregasse no bolso alguma coisa que temesse perder. Do outro lado, sentado à mesa principal, esperava o Gambler.',
          'Dário encontrou a porta na noite em que voltou da feira. Trazia consigo o pagamento pela colheita de todo o inverno, guardado numa bolsa amarrada por baixo do casaco. Parte daquele dinheiro consertaria o telhado de casa. O restante pagaria duas dívidas antigas e compraria sementes para o próximo plantio.',
          'Ele havia parado numa estalagem apenas para fugir da chuva. Pediu uma bebida, sentou-se perto do fogo e viu, do outro lado do salão, uma porta de madeira escura que não estava ali quando entrou. De trás dela vinha o som baixo de fichas sendo empilhadas.',
          'Dário perguntou ao estalajadeiro o que havia naquele cômodo. O homem olhou para a parede indicada e respondeu que não havia porta alguma.',
          'Ainda assim, a maçaneta girou quando Dário a tocou.',
          'O salão do outro lado era amplo e silencioso. Lustres dourados iluminavam mesas cobertas por feltro verde. Havia cartas abertas, dados em pequenos copos e rodas marcadas com números, mas quase ninguém jogava. Os poucos presentes falavam em sussurros, como se temessem atrapalhar alguma coisa.',
          'No centro, um homem de terno vermelho fazia uma moeda passear entre os dedos. Usava luvas negras e mantinha um sorriso discreto, sem alegria nem ameaça. A moeda girava sobre seus nós dos dedos, mas nunca caía.',
          '“Primeira rodada?”, perguntou ele.',
          'Dário respondeu que só estava olhando. O homem concordou e apontou para a cadeira vazia diante dele.',
          '“É assim que todos começam.”',
          'A primeira aposta custou uma moeda. Dário escolheu um número, os dados correram pela mesa e pararam exatamente onde ele precisava. O Gambler colocou duas moedas diante dele.',
          'Na segunda rodada, Dário ganhou de novo. Na terceira, recebeu mais do que costumava juntar em um mês. Foi então que o salão despertou.',
          'Músicos começaram a tocar num canto que antes estava vazio. Garçons encheram taças sem que ninguém pedisse. Desconhecidos cercaram a mesa, bateram nas costas de Dário e gritaram seu nome a cada vitória. Quando ele ergueu a bebida, todos ergueram as suas. Por alguns minutos, pareceu que o mundo inteiro havia parado para vê-lo vencer.',
          'O Gambler continuava sentado. Recolhia as apostas perdidas, pagava as vitórias e fazia a moeda caminhar entre os dedos.',
          'Dário poderia ter ido embora. Já tinha o bastante para trocar o telhado, quitar as dívidas e ainda passar o inverno sem trabalhar. O Gambler contou os ganhos, colocou tudo numa pequena bandeja e a empurrou para perto dele.',
          '“Deseja encerrar?”',
          'Dário olhou para as pessoas ao redor. Esperavam sua resposta com os copos erguidos. A música havia parado no meio de uma nota.',
          '“Mais uma.”',
          'Dessa vez, perdeu.',
          'Não foi uma perda grande. Uma única pilha de fichas desapareceu para o outro lado da mesa. Mesmo assim, a comemoração pareceu distante. Dário apostou outra vez para recuperar o que havia acabado de perder. Os dados rolaram, e outra pilha foi recolhida.',
          'Depois vieram uma vitória pequena e duas derrotas. A cada ganho, a música voltava mais alta. A cada perda, algumas cadeiras ao redor ficavam vazias. Dário já não prestava atenção nas moedas. Esperava apenas o instante em que todos tornariam a gritar seu nome.',
          'Quando os ganhos acabaram, ele desamarrou a bolsa escondida sob o casaco.',
          'O Gambler olhou para o dinheiro da colheita e perguntou se Dário tinha certeza. Sua voz era calma. Não havia pressa no gesto com que separou as cartas para a rodada seguinte.',
          'Dário pensou no telhado, nas dívidas e nas sementes. Pensou também que uma única vitória devolveria tudo em dobro.',
          'A bolsa ficou vazia antes que a chuva parasse.',
          'O salão estava quase em silêncio quando o Gambler explicou que a mesa aceitava outras apostas. Qualquer coisa que pertencesse ao jogador poderia ser transformada em fichas. Bastava dizer o nome e aceitar o risco.',
          'Dário apostou a carroça. Perdeu. Apostou o terreno onde plantava. Perdeu outra vez. Quando ofereceu a própria casa, recebeu uma pilha de fichas douradas tão alta que os músicos voltaram a seus lugares. A roda girou por um longo tempo, e durante cada volta Dário já conseguia ouvir a comemoração que viria.',
          'A roda parou.',
          'Ninguém aplaudiu.',
          'Dário permaneceu diante da mesa, olhando o espaço vazio onde estiveram as fichas. O salão parecia maior agora. As luzes dos lustres eram fracas, as taças estavam secas e os desconhecidos haviam desaparecido. Restavam apenas ele, o Gambler e o ruído da moeda passando de um dedo para outro.',
          '“Quero jogar de novo”, disse Dário.',
          '“Com o quê?”',
          'Ele procurou nos bolsos, abriu a bolsa e tirou as botas para ver se havia escondido alguma moeda dentro delas. Não encontrou nada. O Gambler esperou sem rir.',
          '“Posso recuperar. Só preciso de mais uma rodada.”',
          'O Gambler recolheu as cartas e organizou cada ficha em seu lugar.',
          '“Então volte quando tiver algo para perder.”',
          'A porta se abriu atrás de Dário. Do outro lado já era manhã. A estalagem estava vazia, e o estalajadeiro dormia com a cabeça apoiada no balcão. Lá fora, a chuva havia cessado.',
          'Dário caminhou até onde deixara a carroça e encontrou apenas as marcas das rodas na lama. Quando chegou à propriedade, outra família vivia em sua casa. O campo tinha novas cercas, e seu nome não aparecia mais nos registros da vila. Tudo o que apostara pertencia agora a pessoas que juravam possuir aquelas coisas havia muitos anos.',
          'Durante semanas, ele trabalhou carregando sacos no mercado e dormiu sob o telhado de um depósito. Na primeira vez que recebeu pagamento, segurou a moeda entre os dedos e pensou no som dos dados, na música e nas vozes que gritavam seu nome.',
          'Naquela noite, uma porta de madeira escura surgiu no fim do corredor.',
          'Dizem que o Gambler nunca persegue quem deixa sua mesa. Ele não cobra dívidas e não obriga ninguém a voltar. Apenas mantém uma cadeira vazia e espera. Para quem já sentiu a sorte sorrir uma vez, isso costuma ser suficiente.',
        ],
      },
    ],
  },
  {
    id: 'dentista-cego',
    registroUniversal: true,
    nome: 'Dentista Cego',
    classificacao: [],
    tema: {
      destaque: '#aaa7a2',
      destaqueSuave: 'rgba(170, 167, 162, .12)',
      fundo: '#080808',
      superficie: 'rgba(17, 17, 17, .9)',
      texto: '#e4e1dc',
      textoSuave: '#8a8782',
    },
    paginaEmBranco: true,
    conto: [],
  },
];

export function encontrarEntidade(id: string | undefined) {
  if (!id) return undefined;
  return ENTIDADES.find((entidade) => entidade.id === id);
}
