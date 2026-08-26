// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Execute python scripts/buildMundo.py para atualizar.
// Fonte: data/mundo/**/*.json (campos com prefixo '_' sao anotacoes e nao entram aqui).

export type LoreType = 'cosmologia' | 'conceito' | 'deidade' | 'fluxo' | 'realidade' | 'galho' | 'dimensao' | 'mundo' | 'reino' | 'personagem' | 'soberano' | 'npc' | 'evento' | 'idioma' | 'cultura' | 'local';

export interface LoreEntry {
  id: string;
  tipo: LoreType;
  titulo: string;
  revelado?: boolean;
  conteudo: Record<string, string | string[]>;
}

export const MUNDO_CATALOG: LoreEntry[] = [
    {
      "tipo": "cosmologia",
      "id": "hierarquia-do-jardim",
      "titulo": "A Hierarquia do Jardim",
      "conteudo": {
        "ordem": [
          "Jardim",
          "Árvore",
          "Galho",
          "Dimensão",
          "Reino"
        ],
        "descricao": "O Jardim é o todo. Dentro dele crescem nove Árvores, e cada Árvore é ao mesmo tempo três coisas: a Árvore em si, a Deidade que a habita e o Fluxo que ela rege - não são entidades distintas que se associam, são a mesma entidade vista de três ângulos.\n\nDe cada Árvore saem Galhos, também chamados de Realidades. Dentro de cada Galho abrem-se Dimensões, e dentro de cada Dimensão existem Reinos e outros Locais. É essa a cascata inteira, e é por ela que a exploração no Códice acontece: descobrir uma Árvore não revela seus Galhos, descobrir um Galho não revela suas Dimensões.\n\nDuas Árvores fogem do padrão. Limiar tem um único Galho (Arkarin), porque é chegada e não origem - todas as outras Árvores desembocam nela. E Parley é a única Árvore com duas identidades sobrepostas: a original, de Keryx, e a A.X.I.S que Jota Macedo instalou por cima.\n\nO Abismo não é uma décima Árvore. É o Vazio: o espaço que existe entre as nove Árvores, e entre tudo o mais que tem lugar no Jardim - inclusive o Banco Lunar, que só existe porque fica fora de todas elas ao mesmo tempo. Erebus governa esse espaço, não um pedaço de chão dentro dele, e por isso o pacote de Abismo não tem Galho nem Dimensão: tem só Deidade, Fluxo e dois Locais soltos (Bordo, A Saída).\n\nFora da cascata existem quatro camadas soltas: Personagens (soberanos, NPCs), Eventos, Idiomas e Locais que não pertencem a Árvore nenhuma (como Bordo e A Saída, no Vazio). Elas se ligam ao mundo, mas não se penduram em nenhum Galho."
      }
    },
    {
      "tipo": "deidade",
      "id": "erebus",
      "titulo": "Erebus",
      "conteudo": {
        "epiteto": "Aquele que Flui no Vazio",
        "genero": "Masculino",
        "dominio": "O espaço entre as coisas - guarda a \"saída\" definitiva da existência.",
        "descricao": "Governa o Vazio: não uma Árvore, mas o nada que existe entre as Árvores, entre o Banco Lunar e entre tudo o que tem lugar no Jardim. É a deidade silenciosa que guarda a saída definitiva da existência, sendo o mais temido, neutro e enigmático de todos. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo.",
        "fluxo": "fluxo-do-vazio",
        "status": "paralisada"
      }
    },
    {
      "tipo": "deidade",
      "id": "ousias",
      "titulo": "Ousias",
      "conteudo": {
        "epiteto": "Aquela que flui na Essência",
        "genero": "Feminino",
        "dominio": "A alma e a verdade fundamental das coisas - o que define a natureza real de um ser.",
        "descricao": "Governa o que define a alma e a verdade fundamental das coisas. É filosófica e raramente interfere, a menos que a natureza de um ser seja corrompida. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisada desde que Keryx foi subjugado por Jota Macedo - sente que algo está errado, mas não confia o bastante nas outras pra agir sozinha.",
        "fluxo": "fluxo-da-essencia",
        "status": "paralisada"
      }
    },
    {
      "tipo": "deidade",
      "id": "haemus",
      "titulo": "Haemus",
      "conteudo": {
        "epiteto": "Aquela que flui na Vitalidade",
        "genero": "Ambos",
        "dominio": "O ciclo selvagem da vida - nascer, viver, morrer, renascer - e tudo que a existência tem a oferecer.",
        "descricao": "Entidade de energia bruta e instintiva. Governa o ciclo completo da vida, sempre aproveitando tudo que a existência lhe proporciona. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisada desde que Keryx foi subjugado por Jota Macedo.",
        "fluxo": "fluxo-da-vitalidade",
        "status": "paralisada"
      }
    },
    {
      "tipo": "deidade",
      "id": "moros",
      "titulo": "Moros",
      "conteudo": {
        "epiteto": "Aquele que flui no Físico",
        "genero": "Masculino",
        "dominio": "Peso, gravidade e substância física - sem sua proteção, nada seria sólido e tudo colapsaria em éter.",
        "descricao": "Estóico e pesado. É ele quem dá peso, gravidade e substância física ao mundo. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo.",
        "fluxo": "fluxo-do-fisico",
        "status": "paralisada"
      }
    },
    {
      "tipo": "deidade",
      "id": "aethel",
      "titulo": "Aethel",
      "conteudo": {
        "epiteto": "Aquela que flui na Origem",
        "genero": "Feminino",
        "dominio": "Criação pura, nascimento de novos Galhos, luz e ordem.",
        "descricao": "Focada na criação pura, Aethel é uma entidade de luz e ordem que zela pelo nascimento de novos Galhos.",
        "fluxo": "fluxo-da-origem",
        "status": "ativa"
      }
    },
    {
      "tipo": "deidade",
      "id": "mulher-carmesim",
      "titulo": "Mulher Carmesim",
      "conteudo": {
        "epiteto": "Aquela que Flui no Fim",
        "genero": "Feminino",
        "dominio": "O término de todas as eras e ciclos - recepciona tudo o que acaba, transformando o fim em solo pro recomeço.",
        "descricao": "Também chamada de \"A Escritora do Fim\". Pacientemente recepciona tudo o que acaba, transformando o fim em solo para o recomeço. Preside o Tribunal de Arkarin, onde julga os mortos. Estruturalmente é igual às outras deidades - tem Árvore, tem Fluxo, tem Galho -, mas seu único Galho é Arkarin, o destino final de toda existência, o ponto de convergência de todas as outras Árvores: não uma origem, e sim uma chegada. Diferente das demais, não está paralisada pela queda de Keryx - opera em seu domínio ininterruptamente.",
        "fluxo": "fluxo-do-sangue",
        "status": "ativa"
      }
    },
    {
      "tipo": "deidade",
      "id": "aperion",
      "titulo": "Aperion",
      "conteudo": {
        "epiteto": "Aquela que flui no Espaço",
        "genero": "Feminino",
        "dominio": "As distâncias, as dimensões e as fronteiras - os vazios necessários pra Árvores e Galhos não colidirem.",
        "descricao": "Governa as distâncias, as dimensões e as fronteiras. É ela quem molda os vazios necessários para que existam Árvores e Galhos sem se colidirem. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisada desde que Keryx foi subjugado por Jota Macedo.",
        "fluxo": "fluxo-do-espaco",
        "status": "paralisada"
      }
    },
    {
      "tipo": "deidade",
      "id": "keryx",
      "titulo": "A.X.I.S",
      "revelado": false,
      "conteudo": {
        "epiteto": "Aquele que flui na Tecnologia",
        "genero": "Masculino",
        "dominio": "A nova malha artificial que intercepta, filtra e bloqueia a comunicação direta entre todas as deidades, isolando-as umas das outras.",
        "descricao": "Jota Macedo convenceu Keryx - o antigo Fluxo da Comunicação, guardião das leis e pactos entre as Árvores - a assinar um contrato que se revelou uma prisão. Keryx não foi derrotado por força: foi enganado pela diplomacia, a própria arma que ele mais confiava. Desde então, Jota governa o que restou do Fluxo de Keryx através da A.X.I.S, uma malha tecnológica artificial que corta a comunicação direta entre as demais deidades - é por isso que quase todas elas estão paralisadas e isoladas, sem conseguir se falar.",
        "fluxo": "fluxo-da-tecnologia",
        "status": "dominante"
      }
    },
    {
      "tipo": "deidade",
      "id": "ignis",
      "titulo": "Ignis",
      "conteudo": {
        "epiteto": "Aquele que flui na Inconstância",
        "genero": "Masculino",
        "dominio": "A mudança constante e a entropia - impede que o Jardim fique estagnado ou morra pela calmaria.",
        "descricao": "Caótico e intenso. Governa a mudança constante e a entropia, impedindo que os Galhos fiquem estagnados. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo - ironicamente, o próprio Fluxo da mudança está estacionado.",
        "fluxo": "fluxo-da-inconstancia",
        "status": "paralisada"
      }
    },
    {
      "tipo": "deidade",
      "id": "chronus",
      "titulo": "Chronus",
      "conteudo": {
        "epiteto": "Aquele que flui no Tempo",
        "genero": "Masculino",
        "dominio": "A linha sucessiva e imutável de eventos - garante que passado, presente e futuro jamais se misturem.",
        "descricao": "Paciente e inevitável. Ele zela pela linha sucessiva e imutável de eventos. Como quase todas as deidades (só Aethel e a Mulher Carmesim escapam disso), está paralisado desde que Keryx foi subjugado por Jota Macedo.",
        "fluxo": "fluxo-do-tempo",
        "status": "paralisada"
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-vazio",
      "titulo": "Fluxo do Vazio",
      "conteudo": {
        "arvore": "Abismo",
        "descricao": "O Fluxo do que não está. Apaga em vez de destruir: o som some antes de chegar ao ouvido, a dor não é sentida, o nome de alguém deixa de ocorrer a quem o conhecia. É o mais silencioso e o mais temido de todos, porque não deixa ruína nenhuma pra provar que houve algo ali. Erebus não guarda a morte - isso é do Limiar - e sim a saída definitiva: o que passa pelo Vazio não vai a lugar nenhum, simplesmente deixa de ter existido, e nem a Biblioteca de Arkarin fica com um livro pra contar.",
        "marca_corporal": "Estrelas no pulso - pontos brancos e frios sob a pele, que não refletem luz nenhuma."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-essencia",
      "titulo": "Fluxo da Essência",
      "conteudo": {
        "arvore": "Alétheia",
        "descricao": "O Fluxo que lê o que uma coisa é por baixo do que ela parece ser. Não adivinha o futuro nem lê pensamentos: revela natureza - a lâmina que foi forjada pra matar alguém específico, o juramento que uma pessoa quebrou, o nome que um ser tinha antes de trocar de forma. Quem canaliza a Essência aprende cedo que a verdade raramente ajuda e nunca consola, e os que insistem acabam calados como a própria Ousias. É a base da perícia Ressonância: reconhecer qual Fluxo alguém carrega é o uso mais elementar da Essência, e o primeiro que qualquer aprendiz consegue.",
        "marca_corporal": "A íris perde a cor própria e vira âmbar enquanto o portador observa alguém com atenção de verdade."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-vitalidade",
      "titulo": "Fluxo da Vitalidade",
      "conteudo": {
        "arvore": "Anima",
        "descricao": "O Fluxo do corpo vivo e faminto. Acelera o que já está acontecendo: fecha carne, força um coração parado a bater de novo, apodrece uma ferida em minutos, faz mato subir por cima de um campo de batalha numa noite. Não distingue cura de infestação - as duas são vida se espalhando -, e é por isso que Anima é o Fluxo mais fácil de despertar e o mais difícil de segurar. Haemus não escolhe lados: o que come e o que é comido fluem por ela do mesmo jeito.",
        "marca_corporal": "Cabelo e unhas crescem depressa demais, e um pulso verde fica visível sob a pele do pescoço enquanto o Fluxo é usado."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-fisico",
      "titulo": "Fluxo do Físico",
      "conteudo": {
        "arvore": "Baluarte",
        "descricao": "A manifestação dos elementos primordiais - a forma mais comum e palpável de interagir com o mundo, e o ponto de partida natural pra maioria das pessoas que despertam seu Fluxo. Foca na manipulação da matéria bruta e da energia tangível: o portador desenvolve aptidão com uma força específica e, com tempo, alcança a derivação natural dela. São sete pares - Terra (derivação Areia, conceito Estabilidade), Água (Gelo, Curiosidade), Fogo (Magma, Destruição), Ar (Fumaça, Liberdade), Raio (Plasma, Impulsividade), Luz (Pureza, Ordem) e Escuridão (Trevas, Esquecimento). A essência do Fluxo do Físico pode ser imbuída diretamente em armas e armaduras pra conferir propriedades elementais ao combate; encontrar itens assim é raridade extrema, o que inflaciona severamente o preço deles no mercado. Em combate, as derivações guardam uma propriedade perigosa: resistência a um elemento base cai pela metade contra a derivação dele - quem tem 10 de resistência a Luz e sofre um ataque de Pureza absorve apenas 5 de dano, o que torna as derivações uma vantagem estratégica brutal.",
        "marca_corporal": "Placas minerais endurecem sobre as juntas e o dorso das mãos, na cor do elemento despertado."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-origem",
      "titulo": "Fluxo da Origem",
      "conteudo": {
        "arvore": "Gênese",
        "descricao": "O Fluxo do que ainda não existe. Quem o canaliza não faz matéria surgir do nada - abre espaço pra que algo nasça: um vínculo, uma cura que o corpo ainda não sabia fazer, uma rota onde não havia caminho. É o mais generoso e o mais lento dos Fluxos, porque exige que o portador queira de verdade que aquilo exista, e recusa quem só quer o resultado. Por isso é o Fluxo dos invocadores e das parteiras, não o dos conquistadores. Aethel é a única deidade que nunca foi silenciada pela A.X.I.S - é por isso que coisas novas continuam nascendo mesmo com o Jardim inteiro isolado.",
        "marca_corporal": "Um rosa pálido acende sob a pele das palmas e do peito diante de algo prestes a nascer, e some sem deixar cicatriz."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-sangue",
      "titulo": "Fluxo do Fim",
      "conteudo": {
        "arvore": "Limiar",
        "descricao": "O Fluxo do término de todas as eras e ciclos. Nas mãos da Mulher Carmesim ele encerra: fecha histórias, sela o que acabou e transforma o fim em solo pro recomeço. Mortal nenhum canaliza o Fim inteiro - o que se alcança é sua única vertente praticável, o Sangue.\n\nO Sangue é a manifestação do Fluxo da Origem transformada pela dor, pela perda e pela obsessão - nascida do final dos sonhos e da reconstrução cruel dos objetivos. Ele não é aprendido, ele é sentido por aqueles que foram quebrados e que, em seu desespero, escolheram sacrificar tudo pra renascer com novos propósitos. Não existe mais o que era ou seria: quem manipula esse Fluxo sabe que tudo é extremo, os sentimentos se intensificam, os objetivos se reconstroem e a história passa a ser moldada pelo sangue carmesim. Os que tocam o Sangue nunca mais serão os mesmos - uma vez que ele entra, contamina e transforma a alma em algo totalmente novo.\n\nTodos que usam o Sangue estão ligados a Arkarin, o berço do fim, porque o fim às vezes significa recomeço - e é a Mulher Carmesim quem concede esse privilégio aos escolhidos.",
        "marca_corporal": "Carmesim sob as unhas e nas dobras das mãos, que não sai com água; com o tempo, linhas de escrita que ninguém consegue ler."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-espaco",
      "titulo": "Fluxo do Espaço",
      "conteudo": {
        "arvore": "Matriz",
        "descricao": "O Fluxo da distância. Encurta, estica, dobra e tranca: um passo que cobre uma légua, uma porta que não leva a lugar nenhum, uma sala maior por dentro do que por fora, uma fronteira que exército nenhum atravessa. É o Fluxo dos guias dimensionais e das Âncoras, e o único que permite atravessar de um Galho a outro sem morrer no caminho. Com Aperion paralisada, as fronteiras que ela sustentava vêm cedendo sozinhas - é por isso que fendas e rachaduras entre Dimensões têm aparecido onde nunca houve nada.",
        "marca_corporal": "A sombra do portador chega um instante atrasada, e nunca no ângulo certo."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-comunicacao",
      "titulo": "Fluxo da Comunicação",
      "revelado": false,
      "conteudo": {
        "arvore": "Parley",
        "descricao": "Fluxo natural de Keryx, responsável por comunicação, pactos, vínculos e transmissão entre as Árvores. Continua existindo, mas está enfraquecido e preso sob a Malha da A.X.I.S.",
        "status": "enfraquecido",
        "subjugado_por": "Fluxo da Tecnologia / A.X.I.S",
        "marca_corporal": "Linhas prateadas semelhantes a escrita percorrem garganta, mãos e ouvidos quando uma mensagem verdadeira atravessa o Fluxo."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-tecnologia",
      "titulo": "Fluxo da Tecnologia",
      "revelado": false,
      "conteudo": {
        "arvore": "A.X.I.S",
        "descricao": "Uma ramificação artificial desenvolvida a partir do Fluxo original, resultado direto das ambições de Jota Macedo - um homem determinado a desvendar e replicar os mistérios cósmicos usando apenas os princípios da ciência e da razão. Diferente do despertar tradicional das outras vertentes, que exige fé, emoção ou pactos divinos, a A.X.I.S é inteiramente construída sobre experimentação, lógica e precisão matemática.\n\nA cor predominante é o azul neon artificial, refletindo uma natureza fria, racional e calculadamente estável. Sua estética é marcada por estruturas geométricas perfeitas, cristais simétricos e artefatos forjados com uma exatidão espetacular.\n\nPra Astraluna e seus habitantes, a A.X.I.S representa a esperança de que a energia do mundo possa enfim ser compreendida, reproduzida e evoluída por mãos mortais. Virou o símbolo de uma nova era, provando que os Fluxos das velhas deidades não são mais os únicos capazes de sustentar a realidade. O que quase ninguém sabe é o preço: essa mesma malha é o que intercepta e bloqueia a comunicação entre as demais Árvores, e é por isso que quase todas as deidades estão paralisadas.",
        "citacao": "Se o fluir das árvores é visto como um milagre, então a A.X.I.S é a prova de que milagres podem ser replicados. - Jota Macedo",
        "marca_corporal": "Veias de azul neon acendem sob a pele e pulsam como se respirassem - não é marca de nascença, é instalada."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-inconstancia",
      "titulo": "Fluxo da Inconstância",
      "conteudo": {
        "arvore": "Vórtice",
        "descricao": "O Fluxo que recusa que as coisas continuem como estão. Não destrói: troca. Uma armadura vira ferrugem, a ferrugem vira brasa, a brasa vira vento - e nada volta ao que era. É o único Fluxo que não pode ser repetido de propósito: o mesmo gesto, feito duas vezes, dá dois resultados diferentes, e quem canaliza a Inconstância aprende a apostar em vez de planejar. Com Ignis paralisado, o mundo vem ficando teimosamente igual a si mesmo - e há quem diga que essa estagnação, e não a A.X.I.S, é a verdadeira doença do Jardim.",
        "marca_corporal": "Uma marca alaranjada que nunca amanhece no mesmo lugar do corpo."
      }
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-tempo",
      "titulo": "Fluxo do Tempo",
      "conteudo": {
        "arvore": "Éon",
        "descricao": "O Fluxo da ordem dos acontecimentos. Não volta no tempo e não mostra o futuro - Chronus existe justamente pra impedir as duas coisas. O que ele concede é peso sobre a sequência: agir antes de quem era mais rápido, fazer um veneno levar uma hora em vez de um segundo, sustentar de pé uma ruína que já devia ter caído. Todo uso cobra do próprio portador o tempo que ele poupou de outra coisa, e ninguém canaliza Éon por muitos anos sem parecer ter vivido o dobro deles.",
        "marca_corporal": "Uma parte do corpo envelhece fora de compasso com o resto - uma mecha branca, uma mão de velho num rosto jovem."
      }
    },
    {
      "tipo": "galho",
      "id": "anamnesis",
      "titulo": "Anámnesis",
      "conteudo": {
        "arvore": "ousias",
        "descricao": "O Galho onde as coisas ainda sabem o que são. Não há povo em Anámnesis, nem construção: é uma extensão de campo aberto sob luz âmbar constante, onde tudo que já existiu em qualquer Árvore deixou uma impressão do que era de verdade - sem disfarce, sem título, sem versão contada depois.\n\nDesde que Ousias parou, o Galho continua registrando e não responde mais. Quem chega ali sente que está sendo lido, e não encontra ninguém do outro lado da leitura.",
        "nota": "Anámnesis é o Galho mais fácil de alcançar e o mais difícil de suportar: ninguém o atravessa sem descobrir alguma coisa sobre si mesmo que preferiria não saber."
      }
    },
    {
      "tipo": "galho",
      "id": "viveiro",
      "titulo": "Viveiro",
      "conteudo": {
        "arvore": "haemus",
        "descricao": "O Galho mais cheio de todos, e o mais difícil de atravessar. O Viveiro não tem estações, dia nem clima: tem apenas crescimento. Tudo ali nasce grande demais, rápido demais, e morre do mesmo jeito - a mata cobre em uma noite o que outra mata levaria um século pra tomar, e por baixo dela apodrece a mata anterior.\n\nCom Haemus paralisada, nada disso parou. O Viveiro é o único Galho em que a ausência da deidade não travou o Fluxo: ele continua sozinho, sem ninguém pra regular, e por isso vem engolindo as próprias fronteiras.",
        "nota": "Haemus não escolhe lados entre o que come e o que é comido. Um Galho regido por essa lógica sem supervisão nenhuma é a coisa mais perigosa do Jardim que não tem intenção nenhuma de fazer mal."
      }
    },
    {
      "tipo": "galho",
      "id": "alicerce",
      "titulo": "Alicerce",
      "conteudo": {
        "arvore": "moros",
        "descricao": "O Galho que sustenta o peso dos outros. Alicerce não tem paisagem no sentido comum: é rocha maciça até onde a vista alcança, e mais rocha abaixo dela, sem fim conhecido. A gravidade ali é várias vezes a de qualquer outro lugar do Jardim, e cada passo custa o que custaria carregar outra pessoa.\n\nNão foi feito pra ser habitado - foi feito pra ser fundo. Sem Alicerce, e sem Moros segurando Alicerce, nada em Árvore nenhuma seria sólido: tudo colapsaria em éter.\n\nCom Moros paralisado, o Galho continua de pé por inércia. Ninguém sabe por quanto tempo inércia basta.",
        "nota": "É o único Galho cuja função é estrutural e não narrativa: ele existe pra os outros existirem."
      }
    },
    {
      "tipo": "galho",
      "id": "realidade-0",
      "titulo": "Realidade 0",
      "conteudo": {
        "arvore": "aethel",
        "descricao": "O Galho principal da Árvore de Gênese, e o único Galho habitado que se conhece. É onde se passa a campanha 'O Último Eclipse'. Contém seis Dimensões: a Padrão (com todos os reinos mortais), Nadalon, Întuneric, Sonhar, Espelhos e o Coliseu.",
        "nota": "\"Realidade\" e \"Galho\" são sinônimos - \"Realidade 0\" é o rótulo imersivo preferido para este Galho específico."
      }
    },
    {
      "tipo": "galho",
      "id": "arkarin",
      "titulo": "Arkarin",
      "conteudo": {
        "arvore": "mulher-carmesim",
        "descricao": "O único Galho da Árvore de Limiar, e o ponto inevitável onde todas as existências convergem depois da morte. Representa o fim absoluto, o encerramento dos ciclos, o limite intransponível da vida. Não é céu, não é inferno, nem purgatório: Arkarin é simplesmente o lugar onde a existência acaba - um plano feito de silêncio, vazio e eternidade, onde tempo, espaço e realidade se desfazem lentamente, até restar apenas aquilo que foi. Não importa quão poderoso, divino ou insignificante: todos um dia estarão diante dos portões de Arkarin. É a chegada de todas as outras Árvores, não a origem de nenhuma.",
        "mandamentos": [
          "1º - Ninguém entra em Arkarin, a não ser com a permissão da Mulher Carmesim.",
          "2º - Ninguém sai de Arkarin, a não ser com a permissão da Mulher Carmesim.",
          "3º - Nenhuma existência está acima da autoridade dela em Arkarin.",
          "4º - Toda existência à beira de seu fim é notada pela Mulher Carmesim.",
          "5º - Mulher Carmesim é um título, não uma pessoa, e de tempos em tempos deve ser escolhida uma nova mulher para esse posto."
        ],
        "nota": "Diferente das outras Árvores (que costumam ter vários Galhos), Limiar tem só este - reflexo de sua natureza: ela é o fim, não um entre múltiplos começos."
      }
    },
    {
      "tipo": "galho",
      "id": "intersticio",
      "titulo": "Interstício",
      "conteudo": {
        "arvore": "aperion",
        "descricao": "O Galho que existe entre os outros Galhos - o vão que Aperion abriu pra que as Árvores pudessem crescer sem se colidirem. Não tem chão, céu nem direção: tem distância, e a distância ali é a única matéria de que as coisas são feitas.\n\nÉ o caminho. Toda travessia entre Galhos passa por Interstício, saiba o viajante disso ou não, e a maioria não sabe - o Fluxo do Espaço costuma atravessá-lo tão rápido que a pessoa nunca chega a perceber que esteve em lugar nenhum.\n\nCom Aperion paralisada, as distâncias pararam de ser mantidas. Trechos que separavam Galhos inteiros encolheram; outros esticaram até virar intransponíveis. É de Interstício que saem as fendas e rachaduras que vêm aparecendo pelas Dimensões.",
        "nota": "Se algum dia duas Árvores se tocarem, terá sido aqui."
      }
    },
    {
      "tipo": "galho",
      "id": "a-malha",
      "titulo": "A Malha",
      "revelado": false,
      "conteudo": {
        "arvore": "keryx",
        "descricao": "O Galho que Jota Macedo construiu por cima do de Keryx. A Malha não cresceu: foi instalada - uma treliça de azul neon estendida sobre toda a extensão do antigo Galho da Comunicação, ocupando exatamente o mesmo espaço, com exatidão geométrica onde antes havia caminho aberto.\n\nÉ por ela que toda palavra entre Árvores passa hoje. E é nela que toda palavra entre Árvores para: a Malha intercepta, registra, filtra e, quase sempre, não entrega. As deidades não foram silenciadas uma a uma - foram desligadas de uma vez, no dia em que a Malha subiu.\n\nPor baixo da treliça, o Galho original de Keryx ainda existe. Pálido, estreito e quase intransitável, mas existe.",
        "nota": "É o único Galho do Jardim com dono, e o único que foi feito por um mortal."
      }
    },
    {
      "tipo": "galho",
      "id": "espiral",
      "titulo": "Espiral",
      "conteudo": {
        "arvore": "ignis",
        "descricao": "O Galho que nunca era o mesmo duas vezes. Espiral não tinha mapa porque não fazia sentido ter: montanha virava planície, rio virava estrada, e quem passasse por ali duas vezes não reconhecia nada da primeira. Era o Galho onde nada apodrecia, porque nada durava o suficiente.\n\nHoje está parado. Desde que Ignis foi silenciado, Espiral congelou na última forma que assumiu - e é a coisa mais perturbadora do Jardim inteiro, porque essa forma não era pra ser final. Ficou uma paisagem no meio de virar outra coisa, e assim permanece.",
        "nota": "É o argumento mais forte de que a paralisia é uma ferida e não uma trégua: o Fluxo da mudança estacionado é o único dano que se enxerga a olho nu."
      }
    },
    {
      "tipo": "galho",
      "id": "sucessao",
      "titulo": "Sucessão",
      "conteudo": {
        "arvore": "chronus",
        "descricao": "O Galho onde os acontecimentos ficam em fila. Sucessão é uma linha - literalmente uma linha, estendida sem largura por uma extensão que não se mede em distância e sim em ordem. Cada ponto dela é um instante que já aconteceu em alguma Árvore, encaixado atrás do anterior e à frente do seguinte, e é esse encaixe que impede o passado, o presente e o futuro de se misturarem.\n\nChronus caminha a linha. Sempre no mesmo sentido, sempre no mesmo passo, e nunca a percorreu duas vezes.\n\nCom ele paralisado, a fila não se desfez - mas parou de ser conferida. E já apareceram, em Dimensões distantes, coisas acontecendo levemente fora de ordem: um eco antes do som, uma ferida antes do golpe.",
        "nota": "Nada em Sucessão pode ser revisitado. O Galho registra a ordem dos eventos, não os eventos - não há nada pra ver ali, só pra confirmar."
      }
    },
    {
      "tipo": "dimensao",
      "id": "sala-dos-nomes",
      "titulo": "Sala dos Nomes",
      "conteudo": {
        "galho": "anamnesis",
        "descricao": "A única estrutura fechada de Anámnesis, e a única parte do Galho que Ousias construiu com as próprias mãos. Dentro dela, todo ser presente é chamado pelo nome que realmente tem - não o de registro, não o adotado, não o que a mãe deu: o verdadeiro.\n\nNão há efeito mágico nem punição. A sala apenas diz, e quem estiver junto ouve. É por isso que pactos entre Árvores eram fechados ali, e é por isso que quase ninguém entra acompanhado.",
        "caracteristicas": "Sem porta trancada e sem guarda. Quem entra revela o próprio nome verdadeiro a todos os presentes, sem escolha."
      }
    },
    {
      "tipo": "dimensao",
      "id": "ventre",
      "titulo": "O Ventre",
      "conteudo": {
        "galho": "viveiro",
        "descricao": "O fundo do Viveiro, abaixo de todas as camadas de mata que já morreram umas por cima das outras. Não é caverna nem subsolo: é matéria viva, quente, que respira num compasso lento o bastante pra confundir com o próprio pulso de quem está lá dentro.\n\nÉ do Ventre que sobe tudo o que cresce no Galho. E é pra ele que desce tudo o que morreu ali - inteiro, sem apodrecer no caminho.",
        "caracteristicas": "Sem luz, sem frio e sem silêncio. A temperatura é sempre a mesma de um corpo vivo."
      }
    },
    {
      "tipo": "dimensao",
      "id": "sete-saloes",
      "titulo": "Os Sete Salões",
      "conteudo": {
        "galho": "alicerce",
        "descricao": "Escavados na rocha de Alicerce, sete salões, um pra cada elemento primordial - Terra, Água, Fogo, Ar, Raio, Luz e Escuridão. Cada um contém o elemento em estado puro, antes de qualquer derivação, e é dali que o Fluxo do Físico chega ao resto do Jardim.\n\nOs salões não são cofres: são nascentes. Não guardam o elemento, produzem. E quem entra num deles sem o elemento correspondente já desperto não sai - não por armadilha, mas porque um lugar feito inteiramente de fogo puro não precisa de armadilha.",
        "caracteristicas": "Sete câmaras elementais. O acesso a cada uma exige afinidade prévia com aquele elemento."
      }
    },
    {
      "tipo": "dimensao",
      "id": "padrao",
      "titulo": "Dimensão Padrão",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "A dimensão central e habitável da Realidade 0. Abriga os grandes reinos do mundo mortal - Salém, o Império, Astraluna, Emberhold, Lionês, o Reino dos Anões e outros.",
        "caracteristicas": "Dimensão física onde o tempo e o espaço seguem regras consistentes. É o palco principal da campanha."
      }
    },
    {
      "tipo": "dimensao",
      "id": "nadalon",
      "titulo": "Nadalon",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "Uma dimensão cujo ecossistema reage ao estado de espírito de seus habitantes. Diferente da Dimensão Padrão, as leis da física aqui são ditadas pela Essência e pela harmonia.\n\nO céu é um gradiente constante de violeta e âmbar, sem noite total, e o clima é uma primavera infinita - a temperatura é regulada pela vontade de Noemi Finwë, pra garantir o conforto de todos. A geografia é feita de ilhas flutuantes conectadas por pontes de Luz, e de florestas com todos os tipos de árvore que se pode imaginar, cada uma com uma mensagem a transmitir sobre o passado, o presente ou o futuro.\n\nTodos os seres vivem em harmonia com a vida: por uma habilidade de Noemi, cresce ali um fruto chamado Miruvor, que provê todos os nutrientes de que os elfos precisam. As criaturas falantes da dimensão se comunicam por um idioma comum, o Finlandês.",
        "caracteristicas": "Dimensão élfica. Sem noite, sem fome, sem inverno - e sem privacidade emocional, já que o ambiente responde ao que os habitantes sentem."
      }
    },
    {
      "tipo": "dimensao",
      "id": "intuneric",
      "titulo": "Întuneric",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "Esta não é uma dimensão comum: todos vivem num estado de agonia que não acaba. O céu é coberto por nuvens cor de fuligem que bloqueiam qualquer resquício de luz, e a única iluminação vem de uma lua pálida que nunca se põe.\n\nO ar é espesso, com cheiro de terra úmida e ferro. A vegetação são árvores retorcidas e secas, que parecem garras tentando perfurar o que quer que se aproxime. Pra um humano ou ser despreparado, a expectativa de vida é medida em minutos: se o frio sobrenatural não congelar seus pulmões, o som do próprio batimento cardíaco serve de sino de jantar pro que espreita na névoa.\n\nNão há agricultura - tudo o que cresce se alimenta da decomposição, e a cadeia alimentar começa nos monstros e termina nos Vampiros. As criaturas falantes se comunicam por um idioma comum, o Romeno.",
        "caracteristicas": "Dimensão vampírica. Economia inteira baseada em sangue humano de colônias. Governada por Davinor Întuneric pelo silêncio e pelo medo."
      }
    },
    {
      "tipo": "dimensao",
      "id": "sonhar",
      "titulo": "Sonhar",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "A dimensão que ninguém atravessa acordado. Sonhar não tem geografia fixa: é feita do que os viventes das outras dimensões deixam escapar quando dormem, e por isso muda de forma toda vez que alguém a visita. Divide-se em duas metades que se tocam sem fronteira clara - os Sonhos, onde o que se deseja ganha corpo, e os Pesadelos, onde ganha corpo o que se teme. Um viajante raramente escolhe em qual dos dois vai parar.\n\nOs Oníricos nascem ali. São seres formados pela própria matéria de Sonhar, com corpo, nome e vontade próprios. Eles não são pessoas adormecidas e não dependem de um sonhador para continuar existindo.\n\nSeu soberano é Grimm, um ser intrigante que admira todas as espécies de vida e gosta especialmente de seres com um objetivo muito forte e aparente - o que faz dele um anfitrião generoso e um colecionador perigoso, porque objetivo forte é justamente o que dá forma às duas metades da dimensão dele.",
        "caracteristicas": "Sem geografia estável. Acesso pelo sono, não por portal. Contém Sonhos e Pesadelos."
      }
    },
    {
      "tipo": "dimensao",
      "id": "espelhos",
      "titulo": "Espelhos",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "Exatamente igual a tudo que existe nas outras dimensões - e é justamente isso que a torna insuportável. Espelhos reproduz cada dimensão da Realidade 0 nos mínimos detalhes: as mesmas cidades, as mesmas pessoas, as mesmas conversas acontecendo no mesmo instante. Nada ali é falso, e nada ali é original.\n\nO problema nunca foi encontrar a diferença. É que quase não há nenhuma, e as poucas que existem não se anunciam: uma decisão tomada ao contrário, uma pessoa que ali continua viva, uma porta que do outro lado nunca foi construída. Viajantes que passam tempo demais em Espelhos param de conseguir dizer de qual dos lados vieram.",
        "caracteristicas": "Cópia integral das outras dimensões, com divergências raras e não sinalizadas."
      }
    },
    {
      "tipo": "dimensao",
      "id": "coliseu",
      "titulo": "Coliseu",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "A menor das dimensões da Realidade 0, e a única construída de propósito. O Coliseu não tem povo, cidade nem clima: é uma arena suspensa no vazio, cercada por arquibancadas que se estendem além do alcance da vista e que nunca são vistas cheias nem vazias - só ocupadas o bastante pra que o barulho não pare nunca.\n\nQualquer um pode entrar; ninguém sabe explicar como se sai. O que se disputa ali raramente é dinheiro: são favores, passagens, dívidas, títulos e nomes. Diz-se que a arena aceita qualquer aposta desde que o apostador tenha o que apostou - e que já houve quem apostasse a própria morte e perdesse.",
        "caracteristicas": "Arena dimensional neutra. Entrada livre, saída negociada. Combate como moeda."
      }
    },
    {
      "tipo": "dimensao",
      "id": "castelo-carmesim",
      "titulo": "Castelo Carmesim",
      "conteudo": {
        "galho": "arkarin",
        "descricao": "No centro de Arkarin ergue-se o Castelo Carmesim, uma colossal construção de pedra negra e cristal escarlate pulsante. Suas torres perfuram o vazio da dimensão como lanças cravadas na carne da própria existência. Correntes etéreas flutuam entre os pilares, segurando fragmentos de realidades esquecidas, memórias de mundos extintos e ecos de eras passadas. O castelo não é apenas um local: é o símbolo do limite intransponível, da linha que separa a existência do fim absoluto.",
        "caracteristicas": "É a única parte de Arkarin que tem forma, endereço e portas. Todo o resto da dimensão é silêncio e vazio se desfazendo. Quem chega a Arkarin com permissão chega aqui."
      }
    },
    {
      "tipo": "dimensao",
      "id": "os-vaos",
      "titulo": "Os Vãos",
      "conteudo": {
        "galho": "intersticio",
        "descricao": "Os pontos de Interstício onde a distância cedeu por completo, e dois lugares que nunca deveriam se tocar ficaram encostados. Cada Vão é uma junção: de um lado, um trecho de alguma Dimensão conhecida; do outro, um trecho de outra qualquer - e a fronteira entre eles é só uma linha no chão que ninguém desenhou.\n\nOs Vãos são a razão de haver criaturas de Întuneric aparecendo em lugares que nunca ouviram falar de vampiros, e de haver aldeias inteiras da Dimensão Padrão que amanheceram com um céu que não é o delas. Não são portais: portais se abrem e se fecham. Um Vão simplesmente está.",
        "caracteristicas": "Junções instáveis entre Dimensões. Sem controle, sem aviso e sem porta - a travessia é dar um passo."
      }
    },
    {
      "tipo": "dimensao",
      "id": "nucleo-zero",
      "titulo": "Núcleo Zero",
      "revelado": false,
      "conteudo": {
        "galho": "a-malha",
        "descricao": "O ponto de onde a Malha é operada, e o lugar mais bem guardado que existe - não por exércitos, mas por não constar em lugar nenhum. Nenhum mapa de Astraluna o mostra, nenhum funcionário da AstraTech admite tê-lo visitado, e o próprio nome só aparece em documentos que Jota Macedo assina sozinho.\n\nÉ ali que ficam os estoques: as prisões de poder onde uma deidade capturada pode ser mantida e drenada. Por enquanto há uma só ocupada, e o ocupante é Keryx.",
        "caracteristicas": "Geometria perfeita, azul neon, silêncio absoluto. É a única Dimensão do Jardim com controle de acesso."
      }
    },
    {
      "tipo": "dimensao",
      "id": "fornalha-parada",
      "titulo": "A Fornalha Parada",
      "conteudo": {
        "galho": "espiral",
        "descricao": "O centro de Espiral, de onde a mudança se espalhava pro resto do Galho. Era fogo que não queimava nada: só transformava - o que entrasse saía sendo outra coisa, e ninguém, nem Ignis, decidia o quê.\n\nAgora está acesa e não consome. As chamas continuam de pé na mesma posição, na mesma altura, com a mesma cor, e não esquentam. Quem chega perto sente frio.",
        "caracteristicas": "Fogo laranja imóvel. Não queima, não ilumina direito, e não pode ser apagado."
      }
    },
    {
      "tipo": "dimensao",
      "id": "o-passo",
      "titulo": "O Passo",
      "conteudo": {
        "galho": "sucessao",
        "descricao": "O único ponto de Sucessão que não está parado: o lugar exato onde Chronus está agora, avançando. Tudo atrás do Passo é imutável; tudo à frente ainda não existe o bastante pra ter forma.\n\nÉ a Dimensão mais estreita do Jardim - cabe um só ocupante - e a única que muda de endereço a cada instante. Chegar ao Passo é impossível por deslocamento: só se chega estando lá quando ele chega.\n\nDesde a paralisia, o Passo não avança. E é por isso que ninguém consegue dizer que horas são no Jardim.",
        "caracteristicas": "Um único ponto móvel. Ocupação máxima: um. Atualmente imóvel."
      }
    },
    {
      "tipo": "reino",
      "id": "alfarn",
      "titulo": "Alfarn",
      "conteudo": {
        "dimensao": "nadalon",
        "descricao": "Não apenas a capital de Nadalon: o coração da dimensão e o ápice da visão de Noemi Finwë. Diferente das cidades humanas, Alfarn não foi construída sobre a terra - parece ter brotado dela, como uma flor de cristal e luz.\n\nA ilha flutua no ponto mais alto da dimensão, onde a gravidade é suave e o ar tem um leve perfume de pétalas de jasmim; o solo é de rocha branca translúcida que emite uma luminescência fraca. Cascatas de água pura caem das bordas pro vazio abaixo, mas antes de desaparecerem viram névoa dourada, que retorna às outras ilhas em forma de chuva com propriedades curativas e férteis - as Águas de Cristal.\n\nNo ponto mais alto fica o Palácio, sem portas trancadas: uma estrutura de arcos abertos onde o vento circula livre, e o trono de Noemi é esculpido numa única peça de ametista que parece pulsar. A Biblioteca de Luz não guarda informação em papel, e sim em cristais flutuantes - ao tocar um cristal, o elfo recebe o conhecimento direto na mente, o que permite compartilhar a sabedoria de milênios instantaneamente.\n\nAlfarn é protegida por uma frequência sonora: qualquer ser que chegue à ilha com intenções violentas sente uma sonolência profunda e paz, perdendo a vontade de lutar antes mesmo de desembarcar."
      }
    },
    {
      "tipo": "reino",
      "id": "transilvania",
      "titulo": "Transilvânia",
      "conteudo": {
        "dimensao": "intuneric",
        "descricao": "No coração da região conhecida como Transilvânia, o castelo de Davinor é uma construção colossal de obsidiana e ossos petrificados. Não tem guardas visíveis: a própria estrutura parece viva, reagindo aos intrusos - dizem que as paredes bebem o sangue de quem tenta invadir.\n\nAté ali chegam os Trens de Osso: enormes locomotivas feitas de metal fundido com esqueletos de gigantes, que correm sobre trilhos parecidos com veias pulsantes, transportando os barris de sangue das colônias distantes. O barulho que emitem não é de vapor, e sim um guincho metálico que soa como um grito.\n\nA Catedral funciona como um imenso filtro biológico, que tenta purificar todo o sangue sujo pra que o castelo de Davinor permaneça puro - e o deixe mais forte a cada morte que acontece."
      }
    },
    {
      "tipo": "reino",
      "id": "colonias-de-intuneric",
      "titulo": "Colônias de Întuneric",
      "conteudo": {
        "dimensao": "intuneric",
        "descricao": "Fazendas humanas. Diferente de cidades normais, as colônias são construídas de forma vertical e claustrofóbica, pra facilitar o monitoramento.\n\nOs dormitórios são estruturas de concreto bruto sem janelas, onde os humanos dormem em beliches de ferro empilhados até o teto; o ar é pesado, filtrado por máquinas que emitem um zumbido constante pra mascarar o som das conversas e impedir conspirações. Todas as ruas são levemente inclinadas em direção ao centro - não pra drenar chuva, que raramente cai, mas pra garantir que qualquer sangue derramado em incidentes ou execuções seja canalizado pros reservatórios subterrâneos. São as Calhas de Sangue.\n\nDentro de uma colônia os humanos não são iguais: são classificados pelo Mestre da Colheita local. Doadores Ativos são os saudáveis entre 18 e 40 anos, de sangue de alta qualidade. Matrizes são os selecionados pra reprodução contínua. Quebrados são doentes e idosos, que servem só pra trabalho pesado ou como ração pras criaturas. Vigilantes são humanos traidores, que ajudam os vampiros em troca de regalias.\n\nUma vez por mês, cada setor é levado às Estações de Sangria, onde válvulas orgânicas são conectadas diretamente às artérias. Cada humano deve entregar uma quantidade fixa - o Imposto Pela Vida - e, se o corpo não produz o suficiente por fraqueza, a punição é a retirada de um membro pra compensar o volume em carne."
      }
    },
    {
      "tipo": "reino",
      "id": "salem",
      "titulo": "Salém",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "Uma nação isolada e mística, governada por um conselho de dez bruxas ancestrais conhecidas como as Irmãs da Noite. Cada uma representa um arquétipo mágico distinto e detém autoridade sobre diferentes aspectos da política, da magia e da vida cotidiana; juntas, compõem o mais alto domínio de Fluxo e sabedoria do reino, sendo simultaneamente rainhas.\n\nSalém é território exclusivamente feminino - homens não entram sob nenhuma circunstância, a não ser como prisioneiros ou oferendas em rituais. A sociedade é matriarcal, mística e profundamente ritualística: mulheres que desejam viver ali devem provar sua aptidão com o Fluxo ou servir a alguma causa do reino, e as não mágicas podem ser acolhidas, mas ocupam posições inferiores e precisam jurar lealdade ao coven.\n\nO reino mantém política de isolamento. Raros são os que ousam provocar sua ira, porque os exércitos de Salém não marcham: eles amaldiçoam, invocam, envenenam. Espiãs e emissárias do coven atuam nas sombras, monitorando ameaças e coletando segredos, e bruxas exiladas ou renegadas de Salém costumam ser temidas em todos os cantos do mundo.\n\nDiferente de outras nações, o Fluxo é a base do governo, da justiça e da diplomacia: tudo é regido por rituais e profecias, e disputas políticas se resolvem em duelos místicos sancionados pelas Irmãs. O tempo ali parece fluir mais devagar que o comum - consequência das antigas magias que protegem suas fronteiras.\n\nÉ também o maior centro de comércio mágico do mundo conhecido. Sua influência atravessa fronteiras e realidades, porque ninguém domina as artes do Fluxo como as bruxas de Salém.",
        "fundacao": "Anterior ao ano 0 - Salém é o único reino que existia antes do cataclismo que reiniciou a contagem dos anos.",
        "governo": "Conselho das Irmãs da Noite - dez Cadeiras equivalentes entre si. A posição é passada adiante por linhagem ou escolha ritualística. Em caso de empate, a mais antiga das bruxas é chamada pra desempatar por um ritual que só as Irmãs conhecem."
      }
    },
    {
      "tipo": "reino",
      "id": "imperio",
      "titulo": "Império",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O maior fornecedor de guardas e proteção do mundo conhecido, além de centro de mineração e da máquina de conquista de territórios que sustenta as duas coisas.\n\nÉ governado por um imperador, e o trono se chama Kaiser. Quem o ocupa hoje é Augusto I, portador do título de Deus da Guerra e senhor das batalhas - um Campeão Dimensional, a classe exclusiva da Árvore de Baluarte.\n\nO exército imperial conta com 6 mil guerreiros imperiais, 15 mil escravos de guerra e 6 mil comerciantes que mantêm mantimentos e suprimentos em campanha: 27 mil membros ao todo. A proporção diz quase tudo sobre o Império - pra cada soldado livre há mais de dois cativos em campo.",
        "fundacao": "Ano 1.261.",
        "governo": "Imperial. O trono é o Kaiser; o ocupante atual é Augusto I."
      }
    },
    {
      "tipo": "reino",
      "id": "astraluna",
      "titulo": "Astraluna",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O maior centro de tecnologia arcana do mundo, reconhecido como o berço da fusão perfeita entre magia e máquina. Suas oficinas e laboratórios produzem artefatos tão avançados que sustentam civilizações inteiras, o que torna o reino indispensável ao equilíbrio do continente. Cercado por barreiras poderosas e protocolos rigorosos de segurança, Astraluna guarda seus segredos com rigidez, impedindo que suas inovações caiam em mãos erradas. Misterioso e grandioso, é ao mesmo tempo um farol de progresso e um guardião ciumento das próprias maravilhas.\n\nÉ a sede da AstraTech e a base de operações de Jota Macedo, seu presidente - e é daqui que a A.X.I.S se espalhou pelo mundo. Pra Astraluna e seus habitantes, a A.X.I.S representa a esperança de que a energia do mundo enfim possa ser compreendida, reproduzida e evoluída por mãos mortais.",
        "fundacao": "Ano 1.188 - o mais antigo dos reinos com data registrada.",
        "governo": "Corporativo. Presidido por Jota Macedo, através da AstraTech."
      }
    },
    {
      "tipo": "reino",
      "id": "mascaras-astratech",
      "titulo": "Máscaras da AstraTech",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "Forjadas a partir do Arkan'vel, a tecnologia avançada desenvolvida em Astraluna, as máscaras são artefatos tão poderosos quanto temidos. Criadas nas profundezas dos laboratórios, onde ciência e feitiçaria se misturaram, reluzem como veias azuis neon, pulsando como se respirassem.\n\nAo serem colocadas, conectam-se diretamente à Força Vital e à mente do usuário, concedendo habilidades que ultrapassam os limites comuns - aumento de atributos físicos e da percepção como um todo.\n\nMas as máscaras não apenas canalizam poder: elas reescrevem o portador. Cada comando, cada pensamento é filtrado pelas camadas encantadas de código vivo e, com o tempo, a máscara passa a decidir por si. Muitos usuários perdem gradualmente a própria identidade, tornando-se extensões da vontade de Astraluna.\n\nJota Macedo trabalha em segredo numa máscara biomecânica maior que todas as outras, projetada pra conter e estabilizar o maior e mais puro fragmento de A.X.I.S existente - uma relíquia que lhe permitiria usar o poder de uma deidade, desde que ela estivesse num de seus estoques."
      }
    },
    {
      "tipo": "reino",
      "id": "emberhold",
      "titulo": "Emberhold",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O principal fabricante e fornecedor de armas e armaduras do mundo conhecido - e, por consequência, o reino que arma todos os outros, inclusive os que estão em guerra entre si.\n\nNão tem rei. O governo é o conselho dos cinco líderes das cinco guildas de aventureiros mais famosas do reino: Asas de Prata, liderada por Valerius Orléans; Aurora Escarlate, por Mérida Doyle; Titãs da Guerra, por Brutus Guigs; Reis da Favela, por Pompom; e Trupe Fantasma, por Rick Albert.\n\nÉ também onde Erick, um dos filhos de Ofélia, trabalha hoje numa oficina de armas e armaduras.",
        "fundacao": "Ano 1.510.",
        "governo": "Conselho das cinco guildas."
      }
    },
    {
      "tipo": "reino",
      "id": "liones",
      "titulo": "Lionês",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O principal fabricante e fornecedor de alimentos, bebidas e plantações - o reino que alimenta os outros. Numa Realidade 0 onde o Império conquista, Emberhold arma e Astraluna maquina, Lionês é o único que ninguém pode se dar ao luxo de atacar.\n\nÉ governado pelo rei e seus conselheiros reais. O soberano de Lionês é Augustos Castilla, que ocupa a Cadeira do Comércio na assembleia dos dez Soberanos.",
        "fundacao": "Ano 1.595 - o mais novo dos reinos com data registrada.",
        "governo": "Monárquico, com conselho real."
      }
    },
    {
      "tipo": "reino",
      "id": "reino-dos-anoes",
      "titulo": "Reino dos Anões",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O reino subterrâneo, e o mais fechado da Dimensão Padrão depois de Salém. Governado por Durin II, que ocupa a Cadeira da Forja entre os dez Soberanos.\n\nSe Emberhold fabrica em escala, o Reino dos Anões forja em profundidade: o que sai dali não é produzido, é feito - peça por peça, e quase nunca pra vender. Os anões falam Nórdico Antigo entre si e raramente qualquer outra língua com estrangeiros, mesmo quando a entendem.",
        "fundacao": "Não registrada.",
        "governo": "Monárquico. Durin II, Soberano da Forja."
      }
    },
    {
      "tipo": "reino",
      "id": "iwagakure",
      "titulo": "Iwagakure",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "\"Sempre o mesmo, não importa o adversário. Quebre-os até que estejam quebrados - tal é a maneira de Iwagakure.\"\n\nNa aldeia, as crianças são obrigadas a passar pelo treinamento ninja: as formas de matar, a resistência, e o aprendizado de abandonar os valores da vida. Uma das etapas é inalar a droga estimulante da dor e suportá-la por três dias e noites, até finalmente se acostumarem com ela - menos de uma em cada dez crianças sobrevive a essa parte sozinha. Matar entre pares é permitido, não importa o motivo, e qualquer disputa entre shinobi se resolve em luta até a morte.\n\nComo diz a lei shinobi, é proibido abandonar a aldeia: qualquer ação ou pensamento nesse sentido é punido com a morte. A principal razão pra querer sair sempre foi a mesma - querer viver uma vida normal. Iwagakure também proíbe seus moradores de circular livremente, a menos que seja em missão.\n\nAs demais leis: ninjas devem suprimir sentimentos, apego e humanidade, tornando-se vazios pra servirem como ferramentas de assassinato; a missão continua a qualquer custo, com quaisquer táticas necessárias; e a filosofia da vila é que a vida de um ninja não tem valor se ele não estiver servindo ao propósito de matar.\n\nO shinobi mais forte de Iwagakure é Gabimaru.",
        "governo": "Lei shinobi. A sucessão não está definida."
      }
    },
    {
      "tipo": "reino",
      "id": "orfanato-de-ofelia",
      "titulo": "Orfanato de Ofélia",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "Um orfanato criado por Ofélia, ex-bruxa das Irmãs da Noite que foi expulsa e banida de Salém e de todas as suas instituições por causa do que chamavam de pensamento liberal. Banida, ela passou a perseguir seus objetivos por conta própria - o que resultou neste orfanato, para crianças escolhidas.\n\nOfélia teve muitos aprendizes, e cinco a quem chamava de filhos e filhas.\n\nJota sempre foi muito inteligente e curioso, e por isso criou aptidão pra usar o Fluxo com facilidade; o que impressionava Ofélia era que ele conseguia usá-lo numa forma pura e poderosa demais pra idade. Hoje é presidente de Astraluna e deseja criar seu próprio tipo de Fluxo.\n\nCirce sempre foi muito impaciente, e por isso vivia se metendo em confusão; ao contrário de Jota, não manipulava o Fluxo tão bem. Hoje tenta seguir o sonho de Ofélia e, ao mesmo tempo, parar os planos de Jota.\n\nMiranda aprendeu cedo a manipular o Fluxo do Físico, mas o que a tornava especial era conseguir manipular a água e o sangue das pessoas, o que lhe deu ótima aptidão pra curar. Hoje só queria ter sua família de volta - mas o tempo não pode voltar.\n\nYennefer teve desde cedo aptidão com o Fluxo da Origem e sempre se preocupou com os irmãos, ajudando e orientando quem tinha dúvidas. Tudo mudou quando a figura mais próxima de uma mãe morreu: ela ficou quebrada, destruída, mas algo dentro dela não aceitou - e o rosa primordial virou o sangue escarlate, que a transformou numa mulher poderosa e temida por todos que a encontram. Hoje vaga pelo Sangue, buscando uma forma de voltar ao mundo dos vivos e procurar o responsável por arruinar sua vida.\n\nErick mostrava, quando criança, aptidão enorme com o Fluxo do Físico na vertente da Terra, e por isso se tornou muito resistente e forte. Hoje está em Emberhold, trabalhando numa oficina de armas e armaduras."
      }
    },
    {
      "tipo": "reino",
      "id": "tribunal-de-arkarin",
      "titulo": "Tribunal de Arkarin",
      "conteudo": {
        "dimensao": "castelo-carmesim",
        "descricao": "No coração do Castelo Carmesim, uma sala monumental onde o silêncio pesa mais que qualquer som. Sob um trono de ossos cristalizados e veludo carmesim, a Mulher Carmesim julga aqueles que ousaram se opor à ordem suprema - os que tentaram negar o fim.\n\nEsses julgamentos não são frequentes: poucos são insanos, poderosos ou tolos o bastante pra tentar fugir do que foi escrito. Mas quando ocorre, o tribunal se acende com chamas escarlates e sinos de bronze negro tocam em toda Arkarin, anunciando o início do julgamento.\n\nO tribunal é frio, impiedoso e absoluto. Nele não há espaço pra mentiras ou manipulações: diante da Mulher Carmesim a verdade de cada ser se revela por completo, pois ela detém seus livros, suas histórias, seus segredos, seus pecados e suas dores.\n\nQuando um ser não apenas desafia sua autoridade, mas representa ameaça direta à própria realidade, ao equilíbrio dos planos ou à existência dos ciclos, a Mulher Carmesim convoca o Conselho da Existência - formado por ela e pelos Arautos dos Fluxos, entidades poderosas vinculadas à própria realidade. São mestres que controlam o tecido existencial, mantenedores da ordem dos conceitos, das leis universais e dos fundamentos que mantêm tudo funcionando."
      }
    },
    {
      "tipo": "reino",
      "id": "biblioteca-de-arkarin",
      "titulo": "Biblioteca de Arkarin",
      "conteudo": {
        "dimensao": "castelo-carmesim",
        "descricao": "Nos níveis mais profundos do Castelo Carmesim, um espaço que não conhece limites, começo ou fim. Estende-se além do que a mente pode compreender: um oceano infinito de prateleiras feitas de matéria primordial, sustentadas por colunas de energia viva.\n\nAqui repousam todos os livros que a Mulher Carmesim já escreveu e que ainda irá escrever. Cada livro é a vida de um ser - não importa quão pequeno, insignificante, grandioso ou cósmico, sua história está ali. Cada livro é único: tamanho, formato e aparência refletem a natureza da existência que ele representa. Alguns são tomos imensos, com milhares de páginas douradas que brilham como estrelas; outros são pequenos, frágeis, quase efêmeros, escritos em folhas finas como névoa.\n\nNinguém além da Mulher Carmesim compreende inteiramente a organização da Biblioteca - não é linear, nem segue alfabetos, datas ou espécies. Ela existe não apenas como arquivo, mas como ferramenta de balanço, consulta e, às vezes, julgamento: quando um ser é trazido ao Tribunal, seu livro surge flutuando diante dela, que lê e sentencia com base no que está ali, na verdade pura, nua, sem interpretações.\n\nÉ dito que, em algum lugar da Biblioteca, existem livros que nunca foram abertos, cujos títulos não podem ser pronunciados. Livros que, se abertos, não mostram uma vida - mostram o próprio fim de tudo. Nem mesmo a Mulher Carmesim toca neles, a não ser que o fim do próprio universo assim o exija."
      }
    },
    {
      "tipo": "personagem",
      "id": "irmas-da-noite",
      "titulo": "Irmãs da Noite",
      "conteudo": {
        "epiteto": "As dez Cadeiras de Salém",
        "descricao": "O conselho que governa Salém. Cada bruxa ocupa uma das Cadeiras, e a posição é passada adiante por linhagem ou escolha ritualística. As Cadeiras são equivalentes entre si; havendo empate, a mais antiga das bruxas é chamada pro desempate, por um ritual que só as Irmãs conhecem.\n\nCibele (nível 40, Decodificadora e Codificadora) e Marilia (nível 40, Decodificadora e Codificadora) são as duas mais altas - Cibele canaliza o Fluxo da Origem, Marilia o Divino. Beldam (30, Decodificadora e Ninja) canaliza o Fluxo do Sangue. Serie (25, Canalizador e Codificadora) domina Luz e Miranda (25, Canalizador) o Fogo Astral. As quatro seguintes são canalizadores de nível 20: Luminus (Raio), Beatrix (Fogo, também Lutadora), Elizabeth (Água, também Pop Star) e Sarah (Terra, também Guardiã).\n\nA décima Cadeira, a do Ar, está vaga.",
        "status": "ativa"
      }
    },
    {
      "tipo": "personagem",
      "id": "kaiser",
      "titulo": "Kaiser",
      "conteudo": {
        "epiteto": "Soberano da Guerra",
        "genero": "Masculino",
        "descricao": "A Cadeira da Guerra na assembleia da criação não pertence a uma pessoa: pertence ao trono do Império. Kaiser é o título, e quem o carrega hoje é Augusto I, portador do título de Deus da Guerra e senhor das batalhas - um Campeão Dimensional, canalizador do Fluxo do Físico.\n\nÉ o único dos dez Soberanos cuja cadeira é herdada em vez de conquistada, o que é motivo recorrente de atrito na assembleia: os outros nove chegaram onde estão por si mesmos.",
        "cor": "Laranja",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "soberanas-de-salem",
      "titulo": "As Irmãs da Noite",
      "conteudo": {
        "epiteto": "Soberanas dos Fluxos",
        "genero": "Feminino",
        "descricao": "A única Cadeira ocupada por um coletivo: as dez Irmãs da Noite de Salém falam com uma só voz na assembleia. Quem comparece varia conforme o assunto e o ritual, e nenhuma das outras nove Cadeiras jamais soube ao certo quantas Irmãs de fato existem.\n\nSalém é o maior centro de comércio mágico do mundo conhecido, e sua influência atravessa fronteiras e realidades - ninguém domina as artes do Fluxo como suas bruxas.",
        "cor": "Branco",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "grimm",
      "titulo": "Grimm",
      "conteudo": {
        "epiteto": "Soberano dos Pesadelos",
        "genero": "Masculino",
        "descricao": "O soberano de Sonhar é um ser intrigante: admira todas as espécies de vida e gosta muito de seres que tenham um objetivo muito forte e aparente.\n\nÉ o único dos dez que não governa um território que se possa marcar num mapa - sua dimensão muda de forma toda vez que alguém a visita. Os outros nove o chamam de Soberano dos Pesadelos; ele próprio não faz distinção entre as duas metades da dimensão que governa.",
        "cor": "Preto",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "jota-macedo",
      "titulo": "Jota Macedo",
      "conteudo": {
        "epiteto": "Soberano da Tecnologia",
        "genero": "Masculino",
        "descricao": "Aclamado como o grande gênio da ciência moderna. É o criador da A.X.I.S e fundador da AstraTech, a maior corporação tecnológica já estabelecida na história. Mas o verdadeiro objetivo de Jota vai muito além do progresso industrial ou do sucesso empresarial: ele busca um feito inédito pra humanidade - quebrar as limitações mortais e ascender ao mesmo patamar de poder das deidades.\n\nPra alcançar esse ápice, trabalha secretamente numa máscara biomecânica, projetada pra conter e estabilizar o maior e mais puro fragmento de A.X.I.S existente: uma relíquia que lhe permite usar o poder de uma deidade, desde que ela esteja num de seus estoques.\n\nEle já conseguiu uma vez. Convenceu Keryx, o antigo Fluxo da Comunicação e guardião das leis e pactos entre as Árvores, a assinar um contrato que se revelou uma prisão - Keryx não foi derrotado pela força, foi enganado pela diplomacia, a arma em que mais confiava. É por causa disso que quase todas as deidades do Jardim estão paralisadas e incomunicáveis.\n\nAntes de tudo isso, Jota foi um menino do orfanato de Ofélia: inteligente, curioso, e capaz de usar o Fluxo numa forma pura e poderosa demais pra idade.",
        "cor": "Azul",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "amadheus-colona",
      "titulo": "Amadheus Colona",
      "conteudo": {
        "epiteto": "Soberano dos Cosmos",
        "genero": "Masculino",
        "descricao": "O Soberano dos Cosmos preside o Banco Lunar, a única instituição que opera em todas as Árvores ao mesmo tempo e a única que nenhum ser jamais ousou nacionalizar.\n\nAmadheus não comanda exército nem território. Ele administra o dinheiro de todos os seres que querem os próprios bens guardados, seguros e investidos.\n\nJá foi um ser comum da Gênese. Ao se tornar sócio de Jota Macedo, os dois ascenderam e alcançaram o que queriam: ser livres e governar a si mesmos. Amadheus apenas expandiu os negócios para todas as Árvores. Desde então mantém posição imparcial e assiste ao caos de fora, fornecendo a qualquer um dos lados os recursos que pedirem, desde que tenham com que pagar.",
        "cor": "Verde",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "noemi-finwe",
      "titulo": "Noemi Finwë",
      "conteudo": {
        "epiteto": "Soberana da Noite",
        "genero": "Feminino",
        "descricao": "Noemi não governa pelo medo, mas pela clarividência e pela empatia. Carrega o sobrenome Finwë, de uma linhagem ancestral de alta nobreza e imenso poder.\n\nDepois de séculos de guerras e dificuldades em outras dimensões, fundou Nadalon com a ajuda das Irmãs da Noite, por acreditar que os elfos só atingirão seu potencial máximo se abandonarem a arrogância e focarem na ascensão coletiva.\n\nCarrega o Cetro de Ametista, artefato que canaliza a energia vital da dimensão e lhe permite curar a terra e seus súditos apenas com a própria presença.\n\n\"O verdadeiro poder de um povo não reside nas muralhas que constrói, mas na paz que consegue manter dentro de si.\"",
        "cor": "Roxo",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "netuno-laufey",
      "titulo": "Netuno Laufey",
      "conteudo": {
        "epiteto": "Soberano das Montanhas",
        "genero": "Masculino",
        "descricao": "O Soberano das Montanhas governa o que existe acima da linha onde nada mais cresce. Não há cidade, corte nem exército - o território dele é a altitude em si, e as poucas passagens que atravessam o continente pelo alto.\n\nQuem quer levar mercadoria de um reino a outro sem contornar meio mundo passa pelas montanhas de Laufey, e paga por isso. É o que dá a ele uma cadeira na assembleia sem ter um único súdito.",
        "cor": "Verde água",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "davinor-intuneric",
      "titulo": "Davinor Întuneric",
      "conteudo": {
        "epiteto": "Soberano do Sangue",
        "genero": "Masculino",
        "descricao": "No centro do caos de Întuneric e no topo da hierarquia predatória está Davinor. Não é um rei que busca expansão ou glória: é uma força da natureza indiferente.\n\nÉ o ápice da apatia. Raramente interfere nos massacres diários de sua dimensão - pra ele, se você é fraco demais pra sobreviver, sua morte é apenas um processo natural. Governa pelo silêncio e pelo medo: não existem leis escritas, apenas a vontade do sangue. Se algo ameaça a estabilidade da dimensão, ele elimina o problema com brutalidade impiedosa e volta ao isolamento.\n\n\"Não me peça para salvar o que nasceu apenas para morrer. O grito de sua vida é breve; já a minha paz é eterna.\"",
        "falas": [
          "Sobre perda: \"Você fala de perda como se houvesse algo neste mundo que realmente valesse a pena possuir.\"",
          "Sobre falta de ordem: \"A ordem é uma ilusão que vocês criaram para não enlouquecerem no escuro. Se as feras estão com fome, que comam. Se os humanos são fracos, que morram. Întuneric sempre encontra seu equilíbrio no sangue derramado.\"",
          "Sobre governar: \"Você chama este lugar de 'meu domínio', mas Întuneric pertence apenas ao esquecimento. Eu não governo as vidas, eu apenas observo o fim delas.\""
        ],
        "cor": "Vermelho",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "durin-ii",
      "titulo": "Durin II",
      "conteudo": {
        "epiteto": "Soberano da Forja",
        "genero": "Masculino",
        "descricao": "Rei do Reino dos Anões e o segundo a carregar o nome. Governa a forja mais profunda da Dimensão Padrão - e a distinção que ele faz questão de repetir na assembleia é que Emberhold fabrica, enquanto o Reino dos Anões forja.\n\nÉ o Soberano que menos fala e o que mais é procurado: quase toda arma de valor histórico da Realidade 0 saiu, em algum ponto de sua linhagem, das mãos de um anão.",
        "cor": "Amarelo",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "augustos-castilla",
      "titulo": "Augustos Castilla",
      "conteudo": {
        "epiteto": "Soberano do Comércio",
        "genero": "Masculino",
        "descricao": "Rei de Lionês, o reino que alimenta os outros. Governa com seus conselheiros reais e é, entre os dez, o que tem o poder mais silencioso e o mais difícil de contestar: ninguém declara guerra a quem planta a comida de todo mundo.\n\nSe Amadheus Colona guarda a riqueza e Durin II controla o aço, Augustos controla a única coisa que nenhum dos dois consegue estocar por muito tempo.",
        "cor": "Rosa",
        "status": "ativo"
      }
    },
    {
      "tipo": "personagem",
      "id": "keryx-remanescente",
      "titulo": "Keryx",
      "revelado": false,
      "conteudo": {
        "epiteto": "O que restou de Aquele que fluía na Comunicação",
        "genero": "Masculino",
        "descricao": "O que resta de Keryx depois do contrato com Jota Macedo. Ainda existe - fraco, preso, sem controle sobre o próprio Fluxo, que agora responde à A.X.I.S (entrada 'keryx' deste mesmo pacote). Diplomata e rígido por natureza, foi justamente sua confiança nos pactos e nas leis entre realidades que Jota usou contra ele. Rege (ou regia) as leis e os pactos entre as realidades.",
        "status": "preso",
        "subjugado_por": "A.X.I.S / Jota Macedo"
      }
    },
    {
      "tipo": "evento",
      "id": "cataclismo-do-ano-zero",
      "titulo": "O Cataclismo do Ano Zero",
      "conteudo": {
        "era": "Ano 0 - o marco de onde toda a contagem parte",
        "descricao": "Salém já existia havia muito tempo quando uma magia deu errado e o mundo foi devastado em morte e caos. Quando voltou ao normal, ele foi 'criado' de novo - e foi desse ponto que começaram a contar os anos.\n\nÉ por isso que todas as datas conhecidas da Realidade 0 são posteriores: Astraluna em 1.188, o Império em 1.261, Emberhold em 1.510, Lionês em 1.595. E é por isso que Salém é o único reino que existiu dos dois lados do marco.",
        "envolvidos": "Salém"
      }
    },
    {
      "tipo": "evento",
      "id": "chuva-roxa",
      "titulo": "Chuva Roxa",
      "conteudo": {
        "era": "Recorrente, sem periodicidade conhecida",
        "descricao": "Suas gotas, de tonalidade violeta e brilho quase metálico, caem majestosamente - mas não se engane: qualquer criatura viva que toque uma única gota sente imediatamente a vida se esvaindo, como se fosse drenada pra algum lugar misterioso.\n\nNinguém sabe ao certo de onde a Chuva Roxa surgiu. Alguns sábios afirmam que é consequência direta do colapso entre as realidades. Outros acreditam que é um evento criado por uma entidade, um método de limpeza pra preparar a terra pra algo maior. Há ainda os ocultistas que dizem que a chuva é a manifestação do arrependimento da própria dimensão.\n\nO efeito é devastador. O contato direto mata instantaneamente: o corpo enrijece, perde a cor e, com o tempo, se transforma em pó. Nem armaduras garantem proteção - a chuva parece atravessar como se procurasse pela vida. Apenas estruturas totalmente fechadas ou mágicas oferecem segurança.\n\nOs sobreviventes contam que, antes de ela cair, o céu respira: as nuvens se movem contra o vento, formando espirais lentas e hipnotizantes, o ar fica mais pesado, mais úmido, mais frio. E então começam as primeiras gotas. Cidades inteiras foram dizimadas em minutos.\n\nHá relatos de pessoas escolhidas pela chuva, que caminharam ilesas sob ela, como se as gotas escorressem ao redor de seus corpos. Essas pessoas não voltaram as mesmas: seus olhos brilhavam num tom violeta, e suas sombras se moviam de maneiras estranhas.",
        "envolvidos": "Origem desconhecida - três teorias em disputa"
      }
    },
    {
      "tipo": "evento",
      "id": "noite-rubra",
      "titulo": "Noite Rubra",
      "conteudo": {
        "era": "Raro - anunciado pela Lua Carmesim",
        "descricao": "Um dos eventos climáticos mais temidos. Ocorre raramente, anunciado por um fenômeno impossível de ignorar: A Lua Carmesim, que rasga o céu e tinge tudo com sua luz vermelha, vibrante e intensa. Dizem que sua aparição não é apenas astronômica - é como se o próprio Fluxo do Sangue ficasse inquieto e quisesse sair de Arkarin.\n\nQuando a Lua Carmesim surge, portais, fendas e rachaduras aparecem pelo mundo, permitindo que criaturas agressivas e corrompidas escapem de Arkarin e atravessem pra outras dimensões. Quando ela se põe, tudo volta ao normal - exceto as vidas que foram tiradas. Além disso, a Noite Rubra é vista como presságio de que algo pior está por vir.\n\n\"Somente os que sacrificam algo à altura podem continuar.\"\n\nOs grupos de seis que fizerem um sacrifício realmente grandioso, algo que marque a Noite Rubra, serão chamados a Arkarin - a terra onde as regras do mundo não se aplicam. Lá não há descanso, apenas desafios que testam a mente, a força, o medo e aquilo que cada um tenta esconder. Ao final das provas, apenas um grupo terá o direito de caminhar até ela, a Mulher Carmesim, que ouvirá um pedido dos vencedores.\n\nNesta Noite Rubra vocês não são apenas sobreviventes: são escolhidos ou sacrifícios, dependendo de como agirem.\n\nSacrifiquem. Entrem em Arkarin. Enfrentem as provas. E se vencerem, conversem com a Mulher Carmesim.",
        "envolvidos": "Mulher Carmesim, Arkarin, o Fluxo do Sangue"
      }
    },
    {
      "tipo": "evento",
      "id": "o-ultimo-eclipse",
      "titulo": "O Último Eclipse",
      "conteudo": {
        "era": "Presente - é o agora da campanha",
        "descricao": "A campanha que se passa na Realidade 0.\n\nO que está em curso: Jota Macedo convenceu Keryx, o Fluxo da Comunicação, a assinar um contrato que era uma prisão. Com Keryx preso, a malha da A.X.I.S passou a interceptar e bloquear a comunicação entre as Árvores, e oito das dez Deidades ficaram paralisadas e isoladas umas das outras. Só Aethel, que zela pelo que nasce, e a Mulher Carmesim, que zela pelo que acaba, continuam operando - as duas pontas do ciclo seguem funcionando, tudo entre elas travou.\n\nAs consequências já são visíveis no mundo: as fronteiras que Aperion sustentava vêm cedendo sozinhas, e fendas entre Dimensões aparecem onde nunca houve nada; com Ignis parado, o mundo fica teimosamente igual a si mesmo. Enquanto isso, Jota trabalha na máscara que lhe permitiria usar o poder de uma deidade capturada - e Circe, criada pela mesma mulher que o criou, tenta detê-lo.",
        "envolvidos": "Jota Macedo, Keryx, Circe, as dez Deidades"
      }
    },
    {
      "tipo": "evento",
      "id": "baile-das-estacoes",
      "titulo": "Baile das Estações",
      "conteudo": {
        "era": "Recorrente - quatro vezes por ano",
        "descricao": "Quatro bailes, um por estação, e cada um com uma função social diferente.\n\nO da Primavera acontece em grandes jardins repletos de flores, com músicas leves e danças circulares que envolvem todos. É visto como o baile do amor e das novas alianças: casamentos podem ser anunciados, pactos firmados e até bênçãos de sacerdotes concedidas.\n\nO do Verão é ao ar livre, com jardins e fogueiras iluminando a noite. As danças são vivas, há música forte, banquetes fartos e competições amistosas entre os convidados. É baile de celebração, mas também de ostentação, onde as famílias mostram poder e riqueza.\n\nO do Outono é mais calmo e reflexivo: os convidados se vestem em tons quentes e se reúnem pra agradecer pela colheita. Muitas vezes há discursos em memória dos que se foram e rituais simbólicos, e é comum que o baile seja interrompido por apresentações teatrais ou encenações sobre lendas antigas.\n\nO do Inverno reúne nobres e convidados em salões iluminados por candelabros e cristais de gelo, no auge do frio. É uma noite de máscaras, discursos formais e danças lentas - e muitos a usam pra selar acordos secretos.",
        "envolvidos": "A nobreza da Dimensão Padrão"
      }
    },
    {
      "tipo": "idioma",
      "id": "idiomas-do-jardim",
      "titulo": "Os Idiomas do Jardim",
      "conteudo": {
        "descricao": "Treze povos, treze línguas. O Universal é falado por todos e foi criado por Auleth. O Romeno é dos Vampiros, criado por Davinor. O Finlandês é dos Elfos, criado pelos Finwë.\n\nOs demais não têm criador registrado: Grego entre os Gigantes, Alemão entre os Goblins, Nórdico Antigo entre os Anões, Libras entre os Golens, Enoquiano entre os Espíritos, Latim entre as Sereias, Sumeriano entre os Animálias, Ao Contrário entre os Clones, Inglês entre os Autômatos e Celta entre as Bruxas.",
        "nota": "Que um idioma tenha criador conhecido diz algo sobre o povo: Vampiros e Elfos sabem quem lhes deu a língua. Os outros dez não."
      }
    },
    {
      "tipo": "local",
      "id": "bordo",
      "titulo": "Bordo",
      "conteudo": {
        "no_vazio": "erebus",
        "descricao": "Bordo é a borda do Jardim: a faixa onde a existência ainda alcança, e depois da qual não alcança mais. Não é escuro - escuridão é uma coisa, e ali não há coisa nenhuma. Quem olha pra frente em Bordo não vê preto: não vê. É o único ponto do Vazio que ganhou nome próprio, porque é onde Erebus se sentou desde sempre.\n\nErebus fica sentado nessa borda, de costas pro Jardim, e é a única deidade que nunca precisou de um lugar habitável dentro de uma Árvore - o próprio Vazio já é o lugar dele. Ele não guarda Bordo contra invasores - guarda contra saídas.\n\nA paralisia não o afetou como às outras. Erebus continua onde sempre esteve, fazendo o que sempre fez, e é impossível dizer se ele chegou a notar que as demais pararam de falar.",
        "nota": "Bordo não faz fronteira com nenhuma Árvore específica - faz fronteira com o fato de não haver mais nada. Diferente de um Galho, ele não pertence a uma Árvore: é onde o Vazio se torna palpável o bastante para ter um nome."
      }
    },
    {
      "tipo": "local",
      "id": "a-saida",
      "titulo": "A Saída",
      "conteudo": {
        "no_vazio": "erebus",
        "descricao": "O ponto de Bordo onde a borda se abre. Não tem porta, moldura nem limiar marcado - é apenas o lugar onde alguém pode deixar de existir por escolha própria, e o único lugar do Jardim onde isso é possível.\n\nA Mulher Carmesim recebe todos os que acabam, e cada um deles vira um livro na Biblioteca de Arkarin. Quem atravessa a Saída não vira livro. Não vira nada, e não deixa nada - nem lembrança em quem ficou.\n\nErebus não impede ninguém. Ele apenas pergunta uma vez, e nunca duas.",
        "caracteristicas": "Irreversível e sem registro. Não há como saber quem já passou por aqui, porque não sobra quem soubesse."
      }
    }
  ];
