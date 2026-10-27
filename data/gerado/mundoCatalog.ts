// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Execute python scripts/buildMundo.py para atualizar.
// Fonte: data/mundo/**/*.json (campos com prefixo '_' sao anotacoes e nao entram aqui).

export type LoreType = 'cosmologia' | 'conceito' | 'deidade' | 'fluxo' | 'realidade' | 'galho' | 'dimensao' | 'mundo' | 'reino' | 'personagem' | 'soberano' | 'npc' | 'evento' | 'idioma' | 'cultura' | 'local';

export interface LoreEntry {
  id: string;
  tipo: LoreType;
  titulo: string;
  revelado?: boolean;
  registro_universal?: 'ser' | 'local';
  /** Arvore dona da entrada, pela pasta de origem. Ausente no material
   *  do Jardim, que vale pro cosmos inteiro. */
  arvore_origem?: string;
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
        "descricao": "O Jardim é o todo. Dentro dele crescem nove Árvores, e cada Árvore é ao mesmo tempo três coisas: a Árvore em si, a Deidade que a habita e o Fluxo que ela rege, e as três são a mesma coisa vista de três ângulos.\n\nDe cada Árvore saem Galhos, também chamados de Realidades. Dentro de cada Galho abrem-se Dimensões, e dentro de cada Dimensão existem Reinos e outros Locais. É essa a linha inteira, e é por ela que a exploração acontece: descobrir uma Árvore não revela seus Galhos, descobrir um Galho não revela suas Dimensões.\n\nDuas Árvores fogem do padrão. Limiar tem um único Galho (Arkarin), todas as coisas das outras Árvores acabam nela. E Parley é a única Árvore com duas identidades sobrepostas: a original, de Keryx, e a A.X.I.S que Jota Macedo instalou por cima.\n\nO Abismo não é uma Árvore. É o Vazio, o espaço que existe entre as nove Árvores, entre tudo que tem e não tem no Jardim, inclusive o Banco Lunar e outros locais."
      },
      "revelado": true
    },
    {
      "tipo": "conceito",
      "id": "sonhar-entre-as-arvores",
      "titulo": "Sonhar entre as Árvores",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "arvores": [
          "aethel",
          "ousias",
          "haemus",
          "moros",
          "mulher-carmesim",
          "aperion",
          "keryx",
          "ignis",
          "chronus"
        ],
        "descricao": "Sonhar existe em todas as Árvores ao mesmo tempo, mas cada Árvore tem a sua camada, separada das outras. Quem sonha numa Árvore não vê nem encontra quem sonha em outra.\n\nNa prática, duas pessoas de Árvores diferentes podem dormir na mesma cama e passar a noite sem se cruzar uma vez. Cada uma sonha na sua camada, com os seus Sonhos e os seus Pesadelos, e acorda achando que o sono foi só dela. Quase todo mundo vive e morre assim, sem saber que existe uma camada ao lado.\n\nO que muda de uma camada para outra é o jeito das coisas. A de Gênese, a única que os habitantes de lá conhecem, tem Grimm no centro e uma hospitalidade que passa da conta. As outras têm outros donos, ou nenhum. Quem já esteve em mais de uma costuma dizer que a diferença se sente antes de se ver: o ar pesa de outro jeito, e as pessoas do sonho falam num ritmo que o visitante não reconhece.\n\nAtravessar de uma camada para outra é a parte difícil. Querer não basta, e dormir mais fundo também não ajuda. É preciso uma ruptura, uma passagem aberta por alguém ou a ajuda de Grimm, o Soberano dos Sonhos e Pesadelos, e mesmo assim quem atravessa acorda cansado, sem lembrar direito de ter dormido. Quem passou por isso conta quase sempre a mesma coisa: tudo o que conhecia da própria camada termina de repente numa borda reta, como uma folha cortada a tesoura.\n\nDo outro lado vale o que vale em Sonhar. O que se deseja ganha corpo nos Sonhos, o que se teme ganha corpo nos Pesadelos, e o visitante não escolhe em qual dos dois vai parar. Os Oníricos moram ali e não dependem de ninguém dormindo para existir. Todos sabem que visita de outra camada é coisa rara. Uns recebem com festa, outros com vontade de guardar.",
        "nota": "Cada Árvore enxerga só a sua camada de Sonhar. A que está registrada na Realidade 0 é a de Gênese, a camada que os habitantes de lá conhecem."
      }
    },
    {
      "tipo": "deidade",
      "id": "erebus",
      "titulo": "Erebus",
      "conteudo": {
        "fluxo": "fluxo-do-vazio",
        "genero": "Masculino",
        "status": "observando",
        "dominio": "O vazio entre as coisas, onde fica a saída definitiva da existência.",
        "epiteto": "Aquele que Flui no Vazio",
        "descricao": "Erebus governa o Vazio, o nada que fica entre as nove Árvores, em volta do Banco Lunar e de tudo o que não tem lugar no Jardim. É a mais calada das deidades e a mais temida também. Guarda a saída definitiva da existência e nunca tomou partido de ninguém, e quem tentou adivinhar o que ele pensa desistiu cedo."
      },
      "revelado": true,
      "arvore_origem": "erebus"
    },
    {
      "tipo": "deidade",
      "id": "ousias",
      "titulo": "Ousias",
      "conteudo": {
        "fluxo": "fluxo-da-essencia",
        "genero": "Feminino",
        "status": "paralisada",
        "dominio": "A alma e a verdade de cada coisa, aquilo que define o que um ser é de fato.",
        "epiteto": "Aquela que flui na Essência",
        "descricao": "Ousias cuida da alma e da verdade de cada coisa, o que sobra de um ser quando se tira tudo o que ele mostra. Gosta mais de pensar do que de agir e quase nunca interfere. A exceção é quando a natureza de alguém começa a se corromper: aí ela aparece."
      },
      "revelado": true,
      "arvore_origem": "ousias"
    },
    {
      "tipo": "deidade",
      "id": "haemus",
      "titulo": "Haemus",
      "conteudo": {
        "fluxo": "fluxo-da-vitalidade",
        "genero": "Ambos",
        "status": "paralisada",
        "dominio": "O ciclo selvagem da vida: nascer, viver, morrer, renascer, e tudo o que a existência tem a oferecer no caminho.",
        "epiteto": "Aquela que flui na Vitalidade",
        "descricao": "Haemus é energia bruta, instinto que vem antes do pensamento. Governa a vida inteira, do primeiro fôlego ao último e de volta ao primeiro, e não deixa passar nada do que a existência oferece: fome, festa, briga, cura. Tudo o que está vivo aproveita, e Haemus aproveita junto."
      },
      "revelado": true,
      "arvore_origem": "haemus"
    },
    {
      "tipo": "deidade",
      "id": "moros",
      "titulo": "Moros",
      "conteudo": {
        "fluxo": "fluxo-do-fisico",
        "genero": "Masculino",
        "status": "paralisada",
        "dominio": "Peso, gravidade e substância. Sem ele nada seria sólido e tudo desabaria.",
        "epiteto": "Aquele que flui no Físico",
        "descricao": "Moros é estoico e pesado, e fala como quem não tem pressa nenhuma. É ele quem dá peso, gravidade e corpo ao mundo. Cada pedra que fica no chão e cada passo que encontra apoio dependem dele."
      },
      "revelado": true,
      "arvore_origem": "moros"
    },
    {
      "tipo": "deidade",
      "id": "aethel",
      "titulo": "Aethel",
      "conteudo": {
        "fluxo": "fluxo-da-origem",
        "genero": "Feminino",
        "status": "ativa",
        "dominio": "Criação pura, nascimento de novos Galhos, luz e ordem.",
        "epiteto": "Aquela que flui na Origem",
        "descricao": "Aethel cuida do que ainda vai existir. É luz e é ordem, e cada Galho novo que brota de uma Árvore passa primeiro pelas mãos dela. É uma das poucas deidades que ainda agem, e Gênese cresce do jeito que cresce por causa disso."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "deidade",
      "id": "mulher-carmesim",
      "titulo": "Mulher Carmesim",
      "conteudo": {
        "fluxo": "fluxo-do-sangue",
        "genero": "Feminino",
        "status": "ativa",
        "dominio": "O fim de todas as coisas. Recebe tudo o que acaba e faz do fim um lugar para recomeçar.",
        "epiteto": "Aquela que Flui no Fim",
        "descricao": "Também a chamam de Escritora do Fim. Recebe com paciência tudo o que acaba e faz do fim um lugar onde dá para recomeçar. Preside o Tribunal de Arkarin, onde os mortos são julgados.\n\nTem Árvore, Fluxo e Galho como qualquer outra deidade, mas o Galho dela é um só: Arkarin, o destino final de toda existência. As outras Árvores começam as coisas. Limiar é onde todas elas chegam."
      },
      "revelado": true,
      "arvore_origem": "mulher-carmesim"
    },
    {
      "tipo": "deidade",
      "id": "aperion",
      "titulo": "Aperion",
      "conteudo": {
        "fluxo": "fluxo-do-espaco",
        "genero": "Feminino",
        "status": "paralisada",
        "dominio": "As distâncias, as dimensões e as fronteiras que impedem Árvores e Galhos de se chocarem.",
        "epiteto": "Aquela que flui no Espaço",
        "descricao": "Aperion governa as distâncias, as dimensões e as fronteiras. Foi ela quem abriu espaço entre as coisas, e é por causa dela que Árvores e Galhos crescem lado a lado sem se esmagar."
      },
      "revelado": true,
      "arvore_origem": "aperion"
    },
    {
      "tipo": "deidade",
      "id": "keryx",
      "titulo": "A.X.I.S",
      "revelado": false,
      "conteudo": {
        "fluxo": "fluxo-da-tecnologia",
        "genero": "Masculino",
        "status": "dominante",
        "dominio": "A nova malha artificial que intercepta, filtra e bloqueia a comunicação direta entre todas as deidades, isolando-as umas das outras.",
        "epiteto": "Aquele que flui na Tecnologia",
        "descricao": "Esta Árvore era de Keryx, a deidade do Fluxo da Comunicação, guardião das leis e dos pactos entre as Árvores. Jota Macedo lutou contra ele e venceu, e foi o primeiro ser humano a vencer uma deidade.\n\nKeryx não morreu. Está preso num dos casulos da Malha, e o poder dele é puxado dia após dia para dentro da máscara de Jota. O que sobrou do Fluxo agora passa pela A.X.I.S, uma malha artificial que corta a conversa direta entre as deidades. É por isso que quase todas estão paralisadas, cada uma isolada na sua Árvore, sem conseguir falar com as outras."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "deidade",
      "id": "ignis",
      "titulo": "Ignis",
      "conteudo": {
        "fluxo": "fluxo-da-inconstancia",
        "genero": "Masculino",
        "status": "paralisada",
        "dominio": "A mudança constante e a entropia, que não deixam o Jardim parar nem morrer de calmaria.",
        "epiteto": "Aquele que flui na Inconstância",
        "descricao": "Ignis é caótico e intenso, e não aguenta nada parado. Governa a mudança e a entropia. Quando um Galho começa a se acomodar, ele chega mexendo em tudo até a coisa voltar a andar."
      },
      "revelado": true,
      "arvore_origem": "ignis"
    },
    {
      "tipo": "deidade",
      "id": "chronus",
      "titulo": "Chronus",
      "conteudo": {
        "fluxo": "fluxo-do-tempo",
        "genero": "Masculino",
        "status": "paralisada",
        "dominio": "A fila dos acontecimentos, um depois do outro, que mantém passado, presente e futuro cada um no seu lugar.",
        "epiteto": "Aquele que flui no Tempo",
        "descricao": "Chronus é paciente e não há como fugir dele. Cuida da fila dos acontecimentos, um depois do outro, e não deixa nenhum furar a vez. O que já passou continua no passado porque ele está olhando."
      },
      "revelado": true,
      "arvore_origem": "chronus"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-vazio",
      "titulo": "Fluxo do Vazio",
      "conteudo": {
        "arvore": "O Vazio",
        "descricao": "O Fluxo do que não existe. Apaga em vez de destruir: o som some antes de chegar ao ouvido, a dor não é sentida, o nome de alguém deixa de ser lembrado a quem o conhecia. É o mais silencioso e o mais temido de todos, porque não deixa destruição nenhuma pra provar que houve algo ali. Erebus não guarda a morte, quem guarda é a Mulher Carmesim; ele guarda a saída definitiva. O que passa pelo Vazio não vai a lugar nenhum, simplesmente deixa de ter existido, e nem a Biblioteca de Arkarin fica com um livro pra contar essa história.",
        "marca_corporal": "Estrelas no pulso que parecem quase que transparentes."
      },
      "arvore_origem": "erebus"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-essencia",
      "titulo": "Fluxo da Essência",
      "conteudo": {
        "arvore": "Alétheia",
        "descricao": "O Fluxo que lê o que uma coisa é por baixo do que ela parece ser. Não adivinha o futuro nem lê pensamentos, mas revela a natureza de um ser. Quem canaliza a Essência aprende cedo que a verdade raramente ajuda e nunca consola, e os que insistem acabam calados como a própria Ousias. É a base da perícia Ressonância: reconhecer qual Fluxo alguém carrega é o uso mais certo da Essência, e o primeiro que qualquer aprendiz consegue.",
        "marca_corporal": "A íris perde a cor própria e vira de uma cor âmbar."
      },
      "revelado": true,
      "arvore_origem": "ousias"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-vitalidade",
      "titulo": "Fluxo da Vitalidade",
      "conteudo": {
        "arvore": "Anima",
        "descricao": "O Fluxo do corpo vivo e faminto. Acelera o que já está acontecendo fecha a carne, força um coração parado a bater de novo, apodrece uma ferida em minutos, faz mato subir por cima de um campo de batalha numa noite. Não distingue cura de infestação as duas são vida se espalhando, e é por isso que Anima é o Fluxo mais fácil de despertar e o mais difícil de controlar. Haemus não escolhe lados o que come e o que é comido fluem por ela do mesmo jeito.",
        "marca_corporal": "Sempre parecem ser jovens de mais, além de que seus cabelos e unhas crescem rápido de mais."
      },
      "revelado": true,
      "arvore_origem": "haemus"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-fisico",
      "titulo": "Fluxo do Físico",
      "conteudo": {
        "arvore": "Baluarte",
        "descricao": "A manifestação dos elementos primordiais: a forma mais comum e palpável de interagir com o mundo, e o ponto de partida natural pra maioria das pessoas que despertam seu Fluxo. Foca na manipulação da matéria bruta e da energia tangível: o portador desenvolve aptidão com uma força específica e mantém esse elemento como assinatura por toda a vida. As derivações comuns registradas são Terra/Areia (Estabilidade), Água/Gelo (Curiosidade), Fogo/Magma (Destruição), Ar/Fumaça (Liberdade), Raio/Plasma (Impulsividade), Luz/Pureza (Ordem) e Escuridão/Trevas (Esquecimento). Elementaristas aprofundam um desses pares. Uma minoria revela a aptidão de Avatar e consegue aprender os outros elementos sem apagar o primeiro, mas ainda deriva somente o elemento de origem. Derivações raras também podem existir; Cristal, Sangue, Fogo Astral, Vácuo, Magnetismo, Aurora e Eclipse são propostas em playtest e não substituem os sete pares já documentados. A essência do Fluxo do Físico pode ser imbuída diretamente em armas e armaduras pra conferir propriedades elementais ao combate; encontrar itens assim é raridade extrema, o que inflaciona severamente o preço deles no mercado. Em combate, as derivações guardam uma propriedade perigosa: resistência a um elemento base cai pela metade contra a derivação dele. Quem tem 10 de resistência a Luz e sofre um ataque de Pureza absorve apenas 5 de dano, o que torna as derivações uma vantagem estratégica brutal.",
        "marca_corporal": "Placas minerais endurecem sobre as juntas e o dorso das mãos, na cor do elemento despertado."
      },
      "arvore_origem": "moros"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-origem",
      "titulo": "Fluxo da Origem",
      "conteudo": {
        "arvore": "Gênese",
        "descricao": "O Fluxo do que ainda não existe. Quem o canaliza não faz a matéria surgir do nada, mas abre espaço pra que algo nasça, seja um vínculo, uma cura que o corpo ainda não sabia fazer, uma rota onde não havia caminho. É o mais generoso e o mais lento dos Fluxos, porque exige que o portador queira de verdade que aquilo exista, e recusa quem só quer o resultado. Aethel é a única deidade que nunca foi silenciada pela A.X.I.S, e é por isso que coisas novas continuam nascendo mesmo com o Jardim inteiro isolado.",
        "marca_corporal": "Um rosa pálido aparece sob as palmas das mãos."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-sangue",
      "titulo": "Fluxo do Fim",
      "conteudo": {
        "arvore": "Limiar",
        "descricao": "O Fluxo do término de todas as eras e ciclos. Nas mãos da Mulher Carmesim ele encerra, fecha histórias, sela o que acabou e transforma o fim em algo pro recomeço. Nenhum ser canaliza o Fim inteiro; o que se alcança é apenas uma fração utilizável desse fluxo.\n\nO Fim é a manifestação do Fluxo da Origem transformada pela dor, pela perda e pela obsessão, nascida do final dos sonhos e da reconstrução cruel dos objetivos. Só o sentem aqueles que foram quebrados e que, em seu desespero, escolheram sacrificar tudo pra renascer com novos propósitos. Não existe mais o que era ou seria, quem manipula esse Fluxo sabe que tudo é extremo, os sentimentos se intensificam, os objetivos se reconstroem e a história passa a ser moldada pelo sangue carmesim. Os que tocam o fluxo do fim nunca mais serão os mesmos, uma vez que ele entra, contamina e transforma a alma em algo totalmente novo.\n\nTodos que usam o Fim estão ligados a Arkarin, o berço do fim, porque o fim às vezes significa recomeço, e é a Mulher Carmesim quem concede esse privilégio aos escolhidos.",
        "marca_corporal": "Escritas carmesim aparecem sob partes do corpo, mostrando a todos que você não é mais o que um dia foi."
      },
      "arvore_origem": "mulher-carmesim"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-espaco",
      "titulo": "Fluxo do Espaço",
      "conteudo": {
        "arvore": "Matriz",
        "descricao": "O Fluxo da distância: ele encurta, estica, dobra e para. Uma porta que não leva a lugar nenhum, uma sala maior por dentro do que por fora, uma fronteira que não dá pra atravessar. É o Fluxo dos guias dimensionais, e o único que permite atravessar de um Galho a outro sem morrer no caminho. Com Aperion paralisada, as fronteiras que ela sustentava vêm cedendo sozinhas, e é por isso que fendas e rachaduras entre Dimensões têm aparecido onde nunca existiram.",
        "marca_corporal": "A sombra do portador nunca está no ângulo certo."
      },
      "arvore_origem": "aperion"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-comunicacao",
      "titulo": "Fluxo da Comunicação",
      "revelado": false,
      "conteudo": {
        "arvore": "Parley",
        "status": "enfraquecido",
        "descricao": "Fluxo natural de Keryx, responsável por comunicação, pactos, vínculos e transmissão entre as Árvores. Continua existindo, mas está enfraquecido e preso sob a Malha da A.X.I.S.",
        "subjugado_por": "Fluxo da Tecnologia / A.X.I.S",
        "marca_corporal": "Linhas prateadas semelhantes a escrita percorrem a garganta dos seres desse fluxo."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-tecnologia",
      "titulo": "Fluxo da Tecnologia",
      "revelado": false,
      "conteudo": {
        "arvore": "A.X.I.S",
        "citacao": "Se o fluir das árvores é visto como um milagre, então a A.X.I.S é a prova de que milagres podem ser replicados. (Jota Macedo)",
        "descricao": "Uma ramificação artificial desenvolvida a partir do Fluxo original, resultado direto das ambições de Jota Macedo um homem determinado a desvendar e replicar os mistérios cósmicos usando apenas os princípios da ciência e da razão. Diferente do despertar tradicional das outras vertentes, que exige fé, emoção ou pactos, a A.X.I.S é inteiramente construída sobre experimentação, lógica e precisão matemática.\n\nA cor predominante é o azul neon artificial, refletindo uma natureza fria, racional e calculadamente estável. Sua estética é marcada por estruturas geométricas perfeitas, cristais simétricos e artefatos forjados com uma exatidão espetacular.\n\nPra Astraluna e seus habitantes, a A.X.I.S representa a esperança de que a energia do mundo possa enfim ser compreendida, reproduzida e evoluída por mãos mortais. Virou o símbolo de uma nova era, provando que os Fluxos das velhas deidades não são mais os únicos capazes de sustentar a realidade. O que quase ninguém sabe é o preço: essa mesma malha é o que intercepta e bloqueia a comunicação entre as demais Árvores, e é por isso que quase todas as deidades estão paralisadas.",
        "marca_corporal": "Veias de azul neon acendem sob a pele e pulsam como se respirassem."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-da-inconstancia",
      "titulo": "Fluxo da Inconstância",
      "conteudo": {
        "arvore": "Vórtice",
        "descricao": "O Fluxo que recusa que as coisas continuem como estão. Uma armadura enferruja, a ferrugem vira desgasta, e ao logo do tempo some no vento e nada volta ao que era. É o único Fluxo que não pode ser repetido de propósito: o mesmo gesto, feito duas vezes, dá dois resultados diferentes, e quem canaliza a Inconstância aprende a apostar em vez de planejar.",
        "marca_corporal": "Uma marca alaranjada que nunca continua no mesmo lugar do corpo."
      },
      "revelado": true,
      "arvore_origem": "ignis"
    },
    {
      "tipo": "fluxo",
      "id": "fluxo-do-tempo",
      "titulo": "Fluxo do Tempo",
      "conteudo": {
        "arvore": "Éon",
        "descricao": "O Fluxo da ordem dos acontecimentos. Não volta no tempo e não mostra o futuro: Chronus existe justamente pra impedir as duas coisas. O que ele concede é agir antes de quem era mais rápido, fazer um veneno levar uma hora em vez de um segundo, sustentar de pé uma ruína que já devia ter caído. Todo uso cobra do próprio portador o tempo que ele poupou de outra coisa, e ninguém canaliza Éon por muitos anos sem parecer ter vivido o dobro deles.",
        "marca_corporal": "Uma parte do corpo envelhece fora de ordem com o resto do corpo. Exemplo: uma mecha branca, uma mão de velho num rosto de jovem."
      },
      "arvore_origem": "chronus"
    },
    {
      "tipo": "galho",
      "id": "anamnesis",
      "titulo": "Anámnesis",
      "conteudo": {
        "arvore": "ousias",
        "descricao": "O Galho onde as coisas ainda sabem o que são. Não há povo em Anámnesis, nem construção: esse Galho é uma extensão de campo aberto sob uma luz constante, onde tudo que já existiu em qualquer Árvore deixou uma impressão do que era de verdade, sem versões, apenas a verdade.",
        "nota": "Anámnesis é o Galho mais fácil de alcançar e o mais difícil de suportar: ninguém o atravessa sem descobrir alguma coisa sobre si mesmo que preferiria não saber."
      },
      "arvore_origem": "ousias"
    },
    {
      "tipo": "galho",
      "id": "viveiro",
      "titulo": "Viveiro",
      "conteudo": {
        "arvore": "haemus",
        "descricao": "O Galho mais cheio de todos, e o mais difícil de atravessar. O Viveiro não tem estações, dia nem clima: tem apenas crescimento. Tudo ali nasce grande demais, rápido demais, e morre do mesmo jeito: a natureza cobre em uma noite o que outra levaria um século pra tomar, e por baixo dela apodrece do mesmo jeito.",
        "nota": "Haemus não escolhe lados entre o que come e o que é comido. Um Galho regido por essa lógica sem supervisão nenhuma é a coisa mais perigosa do Jardim que não tem intenção nenhuma de fazer mal."
      },
      "arvore_origem": "haemus"
    },
    {
      "tipo": "galho",
      "id": "alicerce",
      "titulo": "Alicerce",
      "conteudo": {
        "arvore": "moros",
        "descricao": "Alicerce não tem uma paisagem comum, é apenas rocha e montanhas até onde a vista alcança. A gravidade ali é várias vezes a de qualquer outro lugar do Jardim, e cada passo parece ser mais pesado que o anterior.\n\nNão foi feito pra ser habitado, mas dizem que, se você quer deixar seu elemento mais forte, é pra lá que deve ir.",
        "nota": "É o único Galho cuja função é servir como provação aos que se acham fortes o suficiente para carregar mais poder do que aguentam."
      },
      "arvore_origem": "moros"
    },
    {
      "tipo": "galho",
      "id": "realidade-0",
      "titulo": "Realidade 0",
      "conteudo": {
        "arvore": "aethel",
        "descricao": "O Galho principal da Árvore de Gênese. Aqui vivem espécies inteiras que não têm outro lugar pra chamar de casa: humanos, elfos, vampiros, anões, oníricos, cada povo ligado à Dimensão que melhor sustenta sua espécie.\n\nContém seis Dimensões: a Padrão, Nadalon, Întuneric, Sonhar, Espelhos e o Coliseu.",
        "nota": "\"Realidade\" e \"Galho\" são sinônimos. \"Realidade 0\" é o rótulo imersivo preferido para este Galho específico."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "galho",
      "id": "arkarin",
      "titulo": "Arkarin",
      "conteudo": {
        "arvore": "mulher-carmesim",
        "descricao": "O único Galho da Árvore de Limiar, e o ponto inevitável onde todas as existências convergem depois da morte. Representa o fim absoluto, o encerramento dos ciclos, o limite intransponível da vida. Não é o céu, nem é o inferno, muito menos o purgatório. Na verdade, Arkarin é simplesmente o lugar onde a existência acaba: um plano feito de silêncio e eternidade, onde o tempo, espaço e a realidade se desfazem lentamente, até restar apenas aquilo que um dia foi. Não importa quão poderoso, divino ou insignificante tenha sido, todos um dia estarão diante dos portões de Arkarin.",
        "mandamentos": [
          "1º: Ninguém entra em Arkarin, a não ser com a permissão da Mulher Carmesim.",
          "2º: Ninguém sai de Arkarin, a não ser com a permissão da Mulher Carmesim.",
          "3º: Nenhuma existência está acima da autoridade dela em Arkarin.",
          "4º: Toda existência à beira de seu fim é notada pela Mulher Carmesim.",
          "5º: Mulher Carmesim é um título, não uma pessoa, e de tempos em tempos deve ser escolhida uma nova mulher para esse posto."
        ],
        "nota": "Diferente das outras Árvores (que costumam ter vários Galhos), Limiar tem só este, reflexo de sua natureza: ele é o fim, não um entre múltiplos, mas o fim sem outros finais."
      },
      "arvore_origem": "mulher-carmesim"
    },
    {
      "tipo": "galho",
      "id": "intersticio",
      "titulo": "Interstício",
      "conteudo": {
        "arvore": "aperion",
        "descricao": "O Galho que existe entre os outros Galhos: o vão que Aperion abriu pra que as Árvores pudessem crescer sem se colidirem.\n\nToda travessia entre Galhos passa por Interstício, saiba o viajante disso ou não, e a maioria não sabe: o Fluxo do Espaço costuma atravessá-lo tão rápido que a pessoa nunca chega a perceber que esteve em lugar nenhum.\n\nCom Aperion paralisada, as distâncias pararam de ser mantidas. Trechos que separavam Galhos inteiros encolheram; outros esticaram até virar intransponíveis. É de Interstício que saem as fendas e rachaduras que vêm aparecendo pelas Dimensões.",
        "nota": "Se algum dia duas Árvores se tocarem, terá sido aqui."
      },
      "arvore_origem": "aperion"
    },
    {
      "tipo": "galho",
      "id": "a-malha",
      "titulo": "A Malha",
      "revelado": false,
      "conteudo": {
        "arvore": "keryx",
        "descricao": "O \"Galho\" que Jota Macedo construiu por cima do de Keryx. A Malha não cresceu: foi instalada: uma treliça de azul neon estendida sobre toda a extensão do antigo Galho da Comunicação.\n\nÉ por ela que toda comunicação entre Árvores passa hoje. E é nela que toda comunicação entre Árvores para: afinal, a Malha intercepta, registra, filtra e, quase sempre, não deixa mensagens passar. As deidades não foram silenciadas uma a uma: foram desligadas de uma vez, no dia em que a Malha foi instalada.\n\nPor baixo da treliça, o Galho original de Keryx ainda existe. Pálido, estreito e quase intransitável, mas existe.",
        "nota": "É o único \"Galho\" do Jardim com dono, e o único que foi feito por um mortal."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "galho",
      "id": "espiral",
      "titulo": "Espiral",
      "conteudo": {
        "arvore": "ignis",
        "descricao": "O Galho que nunca é o mesmo duas vezes. Espiral não tem mapa porque não faz sentido ter, já que montanhas viravam planície, rio virava estrada, e quem passasse por ali duas vezes não reconhecia nada da primeira.",
        "nota": "É o galho que nunca se mantém o mesmo por tempo suficiente pra alguém conseguir mapear."
      },
      "arvore_origem": "ignis"
    },
    {
      "tipo": "galho",
      "id": "sucessao",
      "titulo": "Sucessão",
      "conteudo": {
        "arvore": "chronus",
        "descricao": "O Galho onde os acontecimentos ficam em fila. Sucessão é uma linha, literalmente uma linha, estendida sem largura por uma extensão que não se mede em distância e sim em ordem cronológica. Cada ponto dela é um instante que já aconteceu em alguma Árvore, encaixado atrás do anterior e à frente do seguinte, e é esse encaixe que impede o passado, o presente e o futuro de se misturarem.\n\nChronus caminha sobre a linha. Sempre no mesmo sentido, sempre no mesmo passo, e nunca a percorreu duas vezes.",
        "nota": "Nada em Sucessão pode ser revisitado. O Galho registra a ordem dos eventos, não os eventos em si."
      },
      "arvore_origem": "chronus"
    },
    {
      "tipo": "dimensao",
      "id": "sala-dos-nomes",
      "titulo": "Sala dos Nomes",
      "conteudo": {
        "galho": "anamnesis",
        "descricao": "A única estrutura fechada de Anámnesis, e a única parte do Galho que Ousias construiu com as próprias mãos. Dentro dela, todo ser presente é chamado pelo nome que realmente tem não o de registro, não o adotado, não o que a mãe deu o verdadeiro nome.\n\nA sala apenas diz, e quem estiver junto ouve. É por isso que pactos entre Árvores eram fechados ali, e é por isso que quase ninguém entra acompanhado.",
        "caracteristicas": "Quem entra revela o próprio nome verdadeiro a todos os presentes, sem escolha."
      },
      "revelado": true,
      "arvore_origem": "ousias"
    },
    {
      "tipo": "dimensao",
      "id": "ventre",
      "titulo": "O Ventre",
      "conteudo": {
        "galho": "viveiro",
        "descricao": "O fundo do Viveiro, abaixo de todas as camadas de mata que já morreram umas por cima das outras. Não é uma caverna é matéria viva, quente, que respira em uma batida lenta o bastante pra confundir com o próprio pulso de quem está lá dentro.\n\nÉ do Ventre que sobe tudo o que cresce no Galho. E é pra ele que desce tudo o que morreu ali inteiro, sem apodrecer no caminho.",
        "caracteristicas": "Sem luz, sem frio e sem silêncio. A temperatura é sempre a mesma de um corpo vivo."
      },
      "revelado": true,
      "arvore_origem": "haemus"
    },
    {
      "tipo": "dimensao",
      "id": "sete-saloes",
      "titulo": "Os Sete Salões",
      "conteudo": {
        "galho": "alicerce",
        "descricao": "Escavados na rocha de Alicerce, sete salões, um pra cada elemento primordial Terra, Água, Fogo, Ar, Raio, Luz e Escuridão. Cada um contém o elemento em estado puro, antes de qualquer derivação, e é dali que o Fluxo do Físico chega ao resto do Jardim.\n\nOs salões não são cofres, eles não guardam o elemento, eles produzem. E quem entra num deles sem o elemento correspondente não tem um final agradável, não por uma armadilha, mas porque um lugar feito inteiramente de um elemento puro não é compatível com outra coisa a não ser ele mesmo.",
        "caracteristicas": "Sete câmaras elementais. O acesso a cada uma exige afinidade com aquele elemento."
      },
      "revelado": true,
      "arvore_origem": "moros"
    },
    {
      "tipo": "dimensao",
      "id": "padrao",
      "titulo": "Dimensão Padrão",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "A dimensão central e com mais habitantes da Realidade 0. Abriga os grandes reinos como Salém, o Império, Solaria, Emberhold, Lionês, Khazad, entre outros.",
        "caracteristicas": "Dimensão onde o tempo e o espaço seguem regras consistentes."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "dimensao",
      "id": "nadalon",
      "titulo": "Nadalon",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "Uma dimensão cujo ecossistema reage ao estado de espírito de seus habitantes. Diferente da Dimensão Padrão, as leis da física aqui são ditadas pela Essência e pela harmonia.\n\nO céu é um gradiente constante de violeta e âmbar, sem noite total, e o clima é uma primavera infinita, e a temperatura é regulada pela vontade de Noemi Finwë, pra garantir o conforto de todos. A geografia é feita de ilhas flutuantes conectadas por pontes de Luz, e de florestas com todos os tipos de árvore que se pode imaginar, cada uma com uma mensagem a transmitir sobre o passado, o presente ou o futuro.\n\nTodos os seres vivem em harmonia com a vida por uma habilidade de Noemi, cresce ali um fruto chamado Miruvor, que provê todos os nutrientes de que os elfos precisam.",
        "caracteristicas": "Dimensão élfica. Sem noite, sem fome, sem inverno e sem privacidade emocional, já que o ambiente responde ao que os habitantes sentem."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "dimensao",
      "id": "intuneric",
      "titulo": "Întuneric",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "Aqui todos vivem num estado de agonia que não acaba. O céu é coberto por nuvens cor de fuligem que bloqueiam qualquer resquício de luz, e a única iluminação vem de uma lua pálida que nunca se põe.\n\nO ar é espesso, com cheiro de terra úmida e ferro. A vegetação são árvores retorcidas e secas, que parecem garras tentando perfurar o que quer que se aproxime. Pra um humano ou ser despreparado, a expectativa de vida é medida em minutos, porque se o frio sobrenatural não congelar seus pulmões, o som do próprio batimento cardíaco serve de sino de jantar pro que espreita na névoa.\n\nNão há agricultura tudo o que cresce se alimenta da decomposição, e a cadeia alimentar começa nos monstros e termina nos Vampiros.",
        "caracteristicas": "Dimensão vampírica. Economia inteira baseada em sangue humano de colônias."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "dimensao",
      "id": "sonhar",
      "titulo": "Sonhar",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "A dimensão que ninguém atravessa acordado. Sonhar não tem geografia fixa: é feita do que os viventes das outras dimensões deixam escapar quando dormem, e por isso muda de forma toda vez que alguém a visita. Divide-se em duas metades que se tocam sem fronteira clara: os Sonhos, onde o que se deseja ganha corpo, e os Pesadelos, onde ganha corpo o que se teme. Um sonhador raramente escolhe em qual dos dois vai parar.\n\nOs Oníricos nascem ali. São seres formados pela própria matéria de Sonhar, com corpo, nome e vontade próprios. Eles não são pessoas adormecidas e não dependem de um sonhador para continuar existindo.\n\nSeu soberano é Grimm, um ser intrigante que admira todas as espécies de vida e gosta especialmente de seres com um objetivo muito forte e aparente o que faz dele um anfitrião generoso e um colecionador perigoso, porque um objetivo forte é justamente o que dá forma às duas metades da dimensão dele.",
        "caracteristicas": "Sem geografia estável. Acesso pelo sonho. Contém Sonhos e Pesadelos."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "dimensao",
      "id": "espelhos",
      "titulo": "Espelhos",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "Exatamente igual a tudo que existe nas outras dimensões, e é justamente isso que a torna insuportável. Espelhos reproduz cada dimensão da Realidade 0 nos mínimos detalhes: as mesmas cidades, as mesmas pessoas, as mesmas conversas acontecendo no mesmo instante. Nada ali é falso, e nada ali é original.\n\nO problema nunca foi encontrar a diferença. É que quase não há nenhuma, e as poucas que existem não são achadas com frequência. Pessoas que passam tempo demais em Espelhos param de conseguir dizer de qual dos lados vieram.",
        "caracteristicas": "Cópia literal das outras dimensões, com mudanças raras e não sinalizadas."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "dimensao",
      "id": "coliseu",
      "titulo": "Coliseu",
      "conteudo": {
        "galho": "realidade-0",
        "descricao": "A menor das dimensões da Realidade 0, e a única construída de propósito. O Coliseu não tem povo, cidade nem clima: é uma arena suspensa, cercada por arquibancadas que se estendem além do alcance da vista e que nunca são vistas vazias.\n\nQualquer um pode entrar; porém ninguém sabe explicar como se sai. O que se disputa ali raramente é dinheiro, normalmente são favores, passagens, dívidas, títulos e nomes. Dizem que a arena aceita qualquer aposta desde que o apostador tenha o que apostou e que já houve quem apostasse a própria existencia e perdesse.",
        "caracteristicas": "Arena dimensional neutra. Entrada livre, saída nem tanto."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "dimensao",
      "id": "castelo-carmesim",
      "titulo": "Castelo Carmesim",
      "conteudo": {
        "galho": "arkarin",
        "descricao": "No centro de Arkarin ergue-se o Castelo Carmesim, uma colossal construção de pedra negra e cristal escarlate pulsante. Suas torres perfuram o vazio da dimensão como lanças cravadas na carne da própria dimensão. Correntes flutuam entre os pilares, segurando fragmentos de realidades esquecidas, memórias de mundos extintos e resquícios de eras passadas. O castelo também é o símbolo do limite intransponível, a linha que separa a existência do fim absoluto.",
        "caracteristicas": "É a única parte de Arkarin que tem forma. Todo o resto da dimensão é silêncio e vazio se desfazendo. Quem chega a Arkarin com permissão chega aqui."
      },
      "revelado": true,
      "arvore_origem": "mulher-carmesim"
    },
    {
      "tipo": "dimensao",
      "id": "os-vaos",
      "titulo": "Os Erros",
      "conteudo": {
        "galho": "intersticio",
        "descricao": "Os erros são pontos de colisão entre dois lugares que nunca deveriam se tocar. Cada erro é uma junção de um lado, um local de alguma Dimensão conhecida; com outro de outra dimensão qualquer e a fronteira entre eles é só uma \"linha\" no chão que ninguém viu aparecendo.\n\nOs erros são a razão de haver criaturas de Întuneric aparecendo em lugares que nunca ouviram falar, e de haver locais inteiros da Dimensão Padrão que amanheceram com um céu que não é o deles. Não são portais, afinal portais se abrem e se fecham. Um erro simplesmente aparece.",
        "caracteristicas": "Junções instáveis entre Dimensões. Sem controle, sem aviso e sem porta o jeito é dar um passo."
      },
      "revelado": true,
      "arvore_origem": "aperion"
    },
    {
      "tipo": "dimensao",
      "id": "nucleo-zero",
      "titulo": "Núcleo Zero",
      "revelado": false,
      "conteudo": {
        "galho": "a-malha",
        "descricao": "O ponto de onde a Malha é operada, e o lugar mais bem guardado que existe: ele não consta em lugar nenhum, e exército nenhum precisa vigiar o que ninguém sabe onde fica. Nenhum mapa de Astraluna o mostra, nenhum funcionário da AstraTech admite tê-lo visitado, e o próprio nome só aparece em documentos que Jota Macedo sabe e assina.\n\nÉ ali que ficam os estoques, as prisões de poder onde uma deidade capturada pode ser mantida e drenada. Por enquanto há uma só ocupada, e o ocupante é Keryx.",
        "caracteristicas": "Geometria perfeita, azul neon, silêncio absoluto. É a única Dimensão do Jardim com controle de acesso."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "dimensao",
      "id": "fornalha-parada",
      "titulo": "A Fornalha Parada",
      "conteudo": {
        "galho": "espiral",
        "descricao": "O centro de Espiral, de onde a mudança se espalhava pro resto do Galho. Era um fogo que não queimava nada só transformava o que entrasse saía sendo outra coisa, e ninguém, nem Ignis, decidia o quê.",
        "caracteristicas": "Fogo laranja imóvel. Não queima, não ilumina direito, e não pode ser apagado."
      },
      "revelado": true,
      "arvore_origem": "ignis"
    },
    {
      "tipo": "dimensao",
      "id": "o-passo",
      "titulo": "O Passo",
      "conteudo": {
        "galho": "sucessao",
        "descricao": "O único ponto que não está parado e ao mesmo tempo esta, esse é o lugar exato onde Chronus está agora. Tudo atrás do Passo é imutável; tudo à frente ainda não existe o bastante pra ter um formato.\n\nÉ a Dimensão mais estreita do Jardim cabe um só ocupante e a única que muda de local a cada instante. Chegar ao Passo é impossível por meio convencionais, só se chega lá quando você não esta mais lá.",
        "caracteristicas": "Um único ponto móvel. Ocupação máxima: um. Atualmente imóvel."
      },
      "revelado": true,
      "arvore_origem": "chronus"
    },
    {
      "tipo": "reino",
      "id": "alfarn",
      "titulo": "Alfarn",
      "conteudo": {
        "dimensao": "nadalon",
        "descricao": "Não apenas a capital de Nadalon, mas sim o coração da dimensão e o ápice da visão de Noemi Finwë. Diferente das cidades humanas, Alfarn não foi construída sobre o chão ou qualquer outra coisa, na verdade foi construída a partir do poder de Noemi.\n\nA ilha flutua no ponto mais alto da dimensão, onde a gravidade é suave e o ar tem um leve perfume de pétalas de jasmim; o solo é de rocha branca translúcida que emite uma luminescência fraca. Cascatas de água pura caem das bordas pro vazio abaixo, mas antes de desaparecerem viram névoa dourada, que retorna às outras ilhas em forma de chuva com propriedades curativas e férteis: as Águas de Cristal.\n\nNo ponto mais alto fica o Palácio, sem portas trancadas, ele tem uma estrutura de arcos abertos onde o vento circula livre, e o trono de Noemi é esculpido numa única peça de ametista que parece pulsar. A Biblioteca de Luz guarda tudo em cristais flutuantes, sem uma folha de papel: ao tocar um cristal, o elfo recebe o conhecimento direto na mente, o que permite compartilhar a sabedoria de milênios instantaneamente.\n\nAlfarn é protegida por uma frequência sonora: qualquer ser que chegue à ilha com intenções violentas sente uma sonolência profunda e paz, perdendo a vontade de lutar antes mesmo de desembarcar."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "transilvania",
      "titulo": "Transilvânia",
      "conteudo": {
        "dimensao": "intuneric",
        "descricao": "No coração da região conhecida como Transilvânia fica o castelo de Davinor, uma construção enorme de obsidiana e ossos petrificados. Não tem guarda à vista. A própria estrutura parece viva e reage a quem entra sem ser chamado, e dizem que as paredes bebem o sangue de quem tenta invadir.\n\nAté ali chegam os Trens de Osso, locomotivas imensas de metal fundido com esqueletos de gigantes, correndo sobre trilhos que pulsam como veias e trazendo os barris de sangue das colônias distantes. O barulho que fazem lembra mais um grito do que uma máquina, um guincho metálico que se ouve de longe.\n\nA Catedral funciona como um filtro biológico gigante. Tenta purificar todo o sangue sujo para que o castelo de Davinor continue puro, e ele fica mais forte a cada morte que acontece."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "colonias-de-intuneric",
      "titulo": "Colônias de Întuneric",
      "conteudo": {
        "dimensao": "intuneric",
        "descricao": "Fazendas humanas. Diferente de cidades normais, as colônias são construídas de forma vertical e claustrofóbica, pra facilitar o monitoramento.\n\nOs dormitórios são estruturas de concreto bruto sem janelas, onde os humanos dormem em beliches de ferro empilhados até o teto; o ar é pesado, filtrado por máquinas que emitem um zumbido constante pra mascarar o som das conversas e impedir conspirações. Todas as ruas descem de leve em direção ao centro. A chuva quase nunca cai, e a inclinação está ali pra que todo sangue derramado em incidentes ou execuções escorra pros reservatórios subterrâneos. São as Calhas de Sangue.\n\nDentro de uma colônia os humanos não são iguais: são classificados pelo Mestre da Colheita local. Doadores Ativos são os saudáveis entre 18 e 40 anos, de sangue de alta qualidade. Matrizes são os selecionados pra reprodução contínua. Quebrados são doentes e idosos, que servem só pra trabalho pesado ou como ração pras criaturas. Vigilantes são humanos traidores, que ajudam os vampiros em troca de regalias.\n\nUma vez por mês, cada setor é levado às Estações de Sangria, onde válvulas orgânicas são conectadas diretamente às artérias. Cada humano deve entregar uma quantidade fixa, o Imposto Pela Vida, e, se o corpo não produz o suficiente por fraqueza, a punição é a retirada de um membro pra compensar o volume em carne."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "salem",
      "titulo": "Salém",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "Uma nação isolada e mística, governada por um conselho de dez bruxas ancestrais conhecidas como as Irmãs da Noite. Cada uma representa um arquétipo mágico distinto e detém autoridade sobre diferentes aspectos da política, da magia e da vida cotidiana; juntas, compõem o mais alto domínio de Fluxo e sabedoria do reino, sendo simultaneamente rainhas.\n\nSalém é território exclusivamente feminino: homens não entram sob nenhuma circunstância, a não ser como prisioneiros ou oferendas em rituais. A sociedade é matriarcal, mística e profundamente ritualística: mulheres que desejam viver ali devem provar sua aptidão com o Fluxo ou servir a alguma causa do reino, e as não mágicas podem ser acolhidas, mas ocupam posições inferiores e precisam jurar lealdade ao coven.\n\nO reino mantém política de isolamento. Raros são os que ousam provocar sua ira, porque os exércitos de Salém não marcham: eles amaldiçoam, invocam, envenenam. Espiãs e emissárias do coven atuam nas sombras, monitorando ameaças e coletando segredos, e bruxas exiladas ou renegadas de Salém costumam ser temidas em todos os cantos do mundo.\n\nDiferente de outras nações, o Fluxo é a base do governo, da justiça e da diplomacia: tudo é regido por rituais e profecias, e disputas políticas se resolvem em duelos místicos sancionados pelas Irmãs. O tempo ali parece fluir mais devagar que o comum, consequência das antigas magias que protegem suas fronteiras.\n\nÉ também o maior centro de comércio mágico do mundo conhecido. Sua influência atravessa fronteiras e realidades, porque ninguém domina as artes do Fluxo como as bruxas de Salém.",
        "fundacao": "Anterior ao ano 0. Salém é o único reino que existia antes do cataclismo que reiniciou a contagem dos anos.",
        "governo": "Conselho das Irmãs da Noite: dez Cadeiras equivalentes entre si. A posição é passada adiante por linhagem ou escolha ritualística. Em caso de empate, a mais antiga das bruxas é chamada pra desempatar por um ritual que só as Irmãs conhecem."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "imperio",
      "titulo": "Império",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O maior fornecedor de guardas e proteção do mundo conhecido, além de centro de mineração e da máquina de conquista de territórios que sustenta as duas coisas.\n\nÉ governado por um imperador, e o trono se chama Kaiser. Quem o ocupa hoje é Augusto I, portador do título de Deus da Guerra e senhor das batalhas, um Campeão Dimensional nascido na Árvore de Baluarte.\n\nO exército imperial conta com 6 mil guerreiros imperiais, 15 mil escravos de guerra e 6 mil comerciantes que mantêm mantimentos e suprimentos em campanha: 27 mil membros ao todo. A proporção diz quase tudo sobre o Império: pra cada soldado livre há mais de dois cativos em campo.",
        "fundacao": "Ano 1.261.",
        "governo": "Imperial. O trono é o Kaiser; o ocupante atual é Augusto I."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "emberhold",
      "titulo": "Emberhold",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O principal fabricante e fornecedor de armas e armaduras do mundo conhecido e, por consequência, o reino que arma todos os outros, inclusive os que estão em guerra entre si.\n\nNão tem rei. O governo é o conselho dos cinco líderes das cinco guildas de aventureiros mais famosas do reino: Asas de Prata, liderada por Valerius Orléans; Aurora Escarlate, por Mérida Doyle; Titãs da Guerra, por Brutus Guigs; Reis da Favela, por Pompom; e Trupe Fantasma, por Rick Albert.\n\nÉ também onde Erick, um dos filhos de Ofélia, trabalha hoje numa oficina de armas e armaduras.",
        "fundacao": "Ano 1.510.",
        "governo": "Conselho das cinco guildas."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "liones",
      "titulo": "Lionês",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O principal fabricante e fornecedor de alimentos, bebidas e plantações, o reino que alimenta os outros. Numa Realidade 0 onde o Império conquista e Emberhold arma, Lionês é o único que ninguém pode se dar ao luxo de atacar.\n\nAs terras de Lionês são um mosaico de plantações que nunca para: trigo numa estação, uva na outra, gado pastando onde a terra descansa. Não existe fome em Lionês porque não existe estação ruim: o solo é gentil demais e chove no momento certo com uma regularidade que ninguém sabe explicar.\n\nÉ essa fartura que garante a paz. Um embargo de Lionês esvazia despensas em semanas, não em meses, e os outros quatro reinos sabem disso melhor do que ninguém, por isso nenhum exército, por maior que seja, arrisca marchar contra quem alimenta a própria tropa.\n\nÉ governado pelo rei e seus conselheiros reais. O rei de Lionês é Augustos Castilla.",
        "fundacao": "Ano 1.595. o mais novo dos reinos com data registrada.",
        "governo": "Monárquico, com conselho real."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "reino-dos-anoes",
      "titulo": "Khazad",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "O reino subterrâneo, e o mais fechado da Dimensão Padrão depois de Salém. Governado por Durin II.\n\nFica cavado nas raízes da própria Dimensão Padrão, camada sobre camada de salões e forjas que descem mais fundo do que qualquer mapa de superfície registra. Ninguém de fora sabe ao certo até onde Khazad vai, só que continua descendo.\n\nSe Emberhold fabrica em escala, Khazad forja em profundidade: cada peça sai da mão de um ferreiro, uma de cada vez, e quase nunca pra vender. Um anão vende uma peça sua uma vez na vida, no máximo duas, e o preço nunca é só em moedas: costuma vir com uma condição, um favor a ser cobrado depois, no momento que Khazad escolher. Os anões falam Grúndar entre si e raramente qualquer outra língua com estrangeiros, mesmo quando a entendem.",
        "fundacao": "Não registrada.",
        "governo": "Monárquico. Durin II, Senhor da Forja."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "reino",
      "id": "tribunal-de-arkarin",
      "titulo": "Tribunal de Arkarin",
      "conteudo": {
        "dimensao": "castelo-carmesim",
        "descricao": "No coração do Castelo Carmesim, uma sala monumental onde o silêncio pesa mais que qualquer som. Sob um trono de ossos cristalizados e veludo carmesim, a Mulher Carmesim julga aqueles que ousaram se opor à ordem suprema, os que tentaram negar o fim.\n\nEsses julgamentos não são frequentes: poucos são insanos, poderosos ou tolos o bastante pra tentar fugir do que foi escrito. Mas quando ocorre, o tribunal se acende com chamas escarlates e sinos de bronze negro tocam em todos os fluxos, anunciando o início do julgamento.\n\nO tribunal é frio, impiedoso e absoluto. Nele não há espaço pra mentiras ou manipulações: diante da Mulher Carmesim, a verdade de cada ser se revela por completo, pois ela detém seus livros, suas histórias, seus segredos, seus pecados e suas dores.\n\nQuando um ser não apenas desafia sua autoridade, mas representa ameaça direta ao próprio universo, ao equilíbrio das Árvores ou à existência dos ciclos, a Mulher Carmesim convoca o Conselho da Existência, formado por ela e pelas deidades de cada fluxo."
      },
      "arvore_origem": "mulher-carmesim"
    },
    {
      "tipo": "reino",
      "id": "astraluna",
      "titulo": "Astraluna",
      "conteudo": {
        "galho": "a-malha",
        "descricao": "O maior centro de tecnologia arcana do mundo, reconhecido como o berço da fusão perfeita entre magia e máquina. Suas oficinas e laboratórios produzem artefatos tão avançados que sustentam civilizações inteiras. Cercado por barreiras poderosas e protocolos rigorosos de segurança, Astraluna guarda seus segredos com rigidez, impedindo que suas inovações caiam em mãos erradas.\n\nÉ a sede da AstraTech e a base de operações de Jota Macedo, seu presidente, e é daqui que a A.X.I.S se espalhou pelo mundo. Pra Astraluna e seus habitantes, a A.X.I.S representa a esperança de que a energia do mundo enfim possa ser compreendida, reproduzida e evoluída por mãos mortais.",
        "fundacao": "Ano 1.188, no Galho de Gênese",
        "governo": "Corporativo. Presidido por Jota Macedo, através da AstraTech."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "reino",
      "id": "mascaras-astratech",
      "titulo": "Máscaras da AstraTech",
      "conteudo": {
        "reino": "astraluna",
        "descricao": "Forjadas a partir do Arkan'vel, a tecnologia avançada desenvolvida em Astraluna, as máscaras são artefatos tão poderosos quanto temidos. Criadas nas profundezas dos laboratórios, onde ciência e feitiçaria se misturaram, reluzem como veias azuis neon, pulsando como se respirassem.\n\nAo serem colocadas, conectam-se diretamente à Força Vital e à mente do usuário, concedendo habilidades que ultrapassam os limites comuns: aumento de atributos físicos e da percepção como um todo.\n\nMas as máscaras não apenas canalizam poder: elas reescrevem o portador. Cada comando, cada pensamento é filtrado pelas camadas encantadas de código vivo e, com o tempo, a máscara passa a decidir por si. Muitos usuários perdem gradualmente a própria identidade, tornando-se extensões da vontade de Astraluna.\n\nJota Macedo trabalha em segredo numa máscara biomecânica maior que todas as outras, projetada pra conter e estabilizar o maior e mais puro fragmento de A.X.I.S existente: uma relíquia que lhe permitiria usar o poder de uma deidade, desde que ela estivesse num de seus estoques."
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "personagem",
      "id": "irmas-da-noite",
      "titulo": "Irmãs da Noite",
      "conteudo": {
        "epiteto": "As dez Cadeiras de Salém",
        "descricao": "É o conselho que governa Salém. Cada bruxa ocupa uma Cadeira, e a Cadeira passa adiante por linhagem ou por escolha em ritual. Todas valem o mesmo. Quando dá empate, chamam a bruxa mais antiga para desempatar, num ritual que só as Irmãs conhecem.\n\nAs mais altas são Cibele e Marilia, as duas de nível 40: Cibele canaliza o Fluxo da Origem, e Marilia, o Divino. Beldam, Ninja de nível 30, canaliza o Fluxo do Fim. Serie e Miranda, Canalizadoras de nível 25, cuidam da Luz e do Fogo Astral. Depois vêm quatro canalizadoras de nível 20: Luminus no Raio, Beatrix no Fogo (também Lutadora), Elizabeth na Água (também Pop Star) e Sarah na Terra (também Guardiã).\n\nA décima Cadeira, a do Ar, continua vaga.",
        "status": "ativa"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "kaiser",
      "titulo": "Kaiser",
      "conteudo": {
        "epiteto": "Senhor da Guerra",
        "genero": "Masculino",
        "descricao": "Kaiser é um título. Quem senta no trono do Império carrega o nome. Hoje quem o carrega é Augusto I, chamado de Deus da Guerra e senhor das batalhas, Campeão Dimensional e canalizador do Fluxo do Físico.\n\nHerdou o trono em vez de conquistá-lo, e a corte não deixa ele esquecer disso. Augusto I é novo para o cargo e não esconde que quer levar o Império além de onde o pai parou.",
        "cor": "Laranja",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "grimm",
      "titulo": "Grimm",
      "registro_universal": "ser",
      "conteudo": {
        "epiteto": "Soberano dos Sonhos e Pesadelos",
        "genero": "Masculino",
        "descricao": "Grimm governa o Sonhar e é um ser curioso. Admira todo tipo de vida, e gosta mais ainda de quem carrega um objetivo forte, desses que a pessoa nem consegue esconder.\n\nO território dele não cabe num mapa, porque o Sonhar muda de forma a cada visita. Muita gente o chama de Soberano dos Pesadelos, e ele mesmo não separa as duas metades do lugar que governa.\n\nQuem entra no Sonhar sem convite quase nunca acha o caminho de volta. Grimm deixa a porta aberta, só que o Sonhar tem o costume de segurar quem desperta o interesse dele.",
        "soberano": "sim",
        "cor": "Preto",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "amadheus-colona",
      "titulo": "Amadheus Colona",
      "registro_universal": "ser",
      "conteudo": {
        "epiteto": "Soberano dos Cosmos",
        "genero": "Masculino",
        "descricao": "Amadheus Colona preside o Banco Lunar, a única instituição financeira que funciona em todas as Árvores ao mesmo tempo.\n\nNão comanda exército nem território. Cuida do dinheiro de todo ser que quer os próprios bens guardados, seguros e rendendo.\n\nJá foi um ser comum de Gênese. Virou sócio de Jota Macedo, e juntos os dois subiram até conseguir o que queriam: ser livres e mandar em si mesmos. Foi aí que Amadheus levou os negócios para todas as Árvores.\n\nContinuam sócios, mas se afastaram. Jota ficou com a AstraTech e Amadheus com o Banco Lunar inteiro. Desde então ele assiste ao caos de fora e fornece recursos a qualquer lado que peça, desde que o lado tenha como pagar.\n\nEssa neutralidade tem preço. Ele só escolhe um lado quando alguém paga o bastante, e como Jota é um dos seres mais ricos do Jardim, Amadheus quase sempre acaba do lado dele.",
        "soberano": "sim",
        "cor": "Verde",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "noemi-finwe",
      "titulo": "Noemi Finwë",
      "conteudo": {
        "epiteto": "Senhora da Noite",
        "genero": "Feminino",
        "descricao": "Noemi governa pela clarividência e pela empatia, e quase nunca precisou de medo para ser obedecida. Carrega o sobrenome Finwë, de uma linhagem antiga, de nobreza alta e poder enorme.\n\nPassou séculos em guerras e apertos em outras dimensões. Depois disso fundou Nadalon com a ajuda das Irmãs da Noite, porque acredita que os elfos só chegam ao que podem ser quando largam a arrogância e sobem juntos.\n\nCarrega o Cetro de Ametista, que puxa a energia vital da dimensão e deixa que ela cure a terra e o povo só de estar por perto.\n\n\"O verdadeiro poder de um povo não reside nas muralhas que constrói, mas na paz que consegue manter dentro de si.\"",
        "cor": "Roxo",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "bergelmir-laufey",
      "titulo": "Bergelmir Laufey",
      "conteudo": {
        "epiteto": "Senhor das Montanhas",
        "genero": "Masculino",
        "descricao": "Bergelmir manda no que fica acima da linha onde nada mais cresce. Não tem cidade, corte nem exército. O território dele é a própria altitude e as poucas passagens que cruzam o continente pelo alto.\n\nQuem quer levar carga de um reino a outro sem dar a volta no mundo passa pelas montanhas de Laufey e paga pedágio. É isso que obriga todos os reinos a tratá-lo bem sem que ele tenha um único súdito.\n\nFala pouco e cobra sempre o mesmo, seja de rei, de mercador ou de fugitivo. Dizem que nunca desceu da cordilheira, nem para negociar com rei. Manda um mensageiro no lugar, e ninguém teve coragem de reclamar disso na frente dele.",
        "cor": "Verde água",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "davinor-intuneric",
      "titulo": "Davinor Întuneric",
      "conteudo": {
        "epiteto": "Senhor do Sangue",
        "genero": "Masculino",
        "descricao": "Davinor fica no meio do caos de Întuneric, no topo da cadeia de quem caça e de quem é caçado. Expansão e glória não interessam a ele. Funciona como uma força da natureza, e a natureza não se importa com ninguém.\n\nÉ a apatia no ponto mais alto. Quase nunca se mete nos massacres de todo dia da dimensão: para ele, quem é fraco demais para sobreviver morre, e é assim que as coisas andam. Governa pelo silêncio e pelo medo. Não existe lei escrita em Întuneric, só a vontade do sangue. Quando alguma coisa ameaça o equilíbrio da dimensão, ele acaba com o problema sem piedade nenhuma e volta a se isolar.\n\n\"Não me peça para salvar o que nasceu apenas para morrer. O grito de sua vida é breve; já a minha paz é eterna.\"",
        "falas": [
          "Sobre perda: \"Você fala de perda como se houvesse algo neste mundo que realmente valesse a pena possuir.\"",
          "Sobre falta de ordem: \"A ordem é uma ilusão que vocês criaram para não enlouquecerem no escuro. Se as feras estão com fome, que comam. Se os humanos são fracos, que morram. Întuneric sempre encontra seu equilíbrio no sangue derramado.\"",
          "Sobre governar: \"Você chama este lugar de 'meu domínio', mas Întuneric pertence apenas ao esquecimento. Eu não governo as vidas, eu apenas observo o fim delas.\""
        ],
        "cor": "Vermelho",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "durin-ii",
      "titulo": "Durin II",
      "conteudo": {
        "epiteto": "Senhor da Forja",
        "genero": "Masculino",
        "descricao": "Rei de Khazad, o segundo a usar o nome. Governa a forja mais funda da Dimensão Padrão e não perde uma chance de lembrar a todo mundo que Emberhold fabrica e Khazad forja.\n\nFala pouco e é procurado o tempo todo: quase toda arma que entrou para a história da Realidade 0 passou, em algum momento, pelas mãos de um anão. Até quem não gosta dele o respeita, porque Khazad nunca quebrou um contrato, e nenhum outro reino da Dimensão Padrão pode dizer o mesmo.",
        "cor": "Amarelo",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "augustos-castilla",
      "titulo": "Augustos Castilla",
      "conteudo": {
        "epiteto": "Senhor do Comércio",
        "genero": "Masculino",
        "descricao": "Rei de Lionês, o reino que dá de comer aos outros. Governa com os conselheiros da coroa e tem o poder mais quieto de todos, e o mais difícil de enfrentar: ninguém declara guerra a quem planta a comida de todo mundo.\n\nAmadheus Colona guarda a riqueza e Durin II controla o aço. Augustos controla a única coisa que nenhum dos dois consegue estocar por muito tempo. Nunca precisou levantar a voz, porque sabe que uma safra ruim em Lionês assusta os outros governantes mais do que qualquer exército parado na fronteira.",
        "cor": "Rosa",
        "status": "ativo"
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "personagem",
      "id": "blanc",
      "titulo": "Blanc",
      "registro_universal": "ser",
      "revelado": true,
      "conteudo": {
        "epiteto": "Soberana dos Espíritos",
        "soberano": "sim",
        "cor": "Branco",
        "descricao": "Blanc é um Espírito Primordial e o único Espírito Universal que se conhece. É também o espírito natural mais forte que existe: é do Fluxo Universal e chegou mais longe do que qualquer outro.\n\nTodo espírito natural é de um Fluxo, aquele que o prendeu ao mundo: Criação, Comunicação, Fim, e assim por diante, onze ao todo. Blanc é do Fluxo Universal, o décimo segundo, que não prende ninguém a um lado só e deixa quem o carrega tocar em todos os outros. É por isso que a chamam de Espírito Universal.\n\nAo contrário da maioria dos espíritos, Blanc tem corpo, um corpo astral firme o bastante para ser visto, tocado e confundido com o de uma pessoa. Parece uma mulher de pele pálida e cabelo longo e solto, da cor da prata velha, com olhos vermelhos e um sorriso que nunca chega a ser inteiro. Veste um corpete claro de bordas douradas, um xale cor de areia caído nos ombros, luvas compridas da mesma cor e um vestido verde-escuro. Preso na gola, leva um broche com uma pedra vermelha. Costuma apoiar o queixo na mão enquanto escuta, como quem tem todo o tempo do mundo.\n\nEntre os espíritos corre uma história, e ela muda pouco de boca em boca. Antes de qualquer Fluxo ter nome existia uma coisa só, que sentia e não sabia o quê. Cada Fluxo, ao nascer, puxou um pedaço dela e deu uma cor ao pedaço, e os pedaços viraram os espíritos. Blanc seria o que sobrou depois que todos puxaram, o resto e o inteiro ao mesmo tempo. Ela nunca confirmou nem negou. Quando perguntam, responde em Anemir, devagar, e a resposta nunca é a mesma duas vezes.\n\nComo nenhum Fluxo manda sozinho nela, nenhum a reconhece como estrangeira, e ela toca em qualquer um deles sem pedir licença. É por isso que está entre os dez seres mais fortes do Jardim. O que faz com essa força é outra conversa. Blanc não sai atrás de poder nem de gente. Aparece perto de espíritos que estão para se apagar e fica até o fim, e quem presenciou conta que a cor do espírito, no último instante, fica branca por um segundo.\n\nNinguém sabe onde ela mora. Quem a procura costuma encontrar espíritos muito velhos que dizem tê-la visto na semana passada, e que já não sabem direito o que a semana quer dizer."
      }
    },
    {
      "tipo": "personagem",
      "id": "ushumgal",
      "titulo": "Ushumgal",
      "registro_universal": "ser",
      "revelado": false,
      "conteudo": {
        "epiteto": "Soberano dos Dragões",
        "soberano": "sim",
        "cor": "Dourado",
        "descricao": "Os dragões crescem a vida inteira, e quase todos morrem no meio do caminho, porque o crescimento não tem fim marcado. Ushumgal é o único que chegou ao fim dele. Parou de crescer no ponto exato em que tudo o que um dragão pode ser coube numa criatura só, e é por isso que o chamam de Dragão Verdadeiro. Os outros estão a caminho de ser o que ele é.\n\nUshumgal quer dizer grande dragão em Urrân, e é só a palavra mais próxima que os outros povos encontraram. O nome que os dragões usam entre si é uma palavra só, e os anciões a pronunciam em voz baixa, quando pronunciam.\n\nAnzhur, o Avô do Fogo, é mais velho. Kurnagal ainda cresce. Apokalyx dorme em cima do que guarda. Ushumgal é o único dos grandes que não espera nada de ninguém, nem de si mesmo, porque não falta nada a ele.\n\nNão tem território, porque território é coisa de dragão que ainda precisa defender alguma coisa. Pousa onde quer, e ninguém reclama. Quem já ficou diante dele conta que o que assusta é a calma, e que o tamanho e o fogo nem aparecem na lembrança depois."
      }
    },
    {
      "tipo": "personagem",
      "id": "selah",
      "titulo": "Selah",
      "registro_universal": "ser",
      "revelado": true,
      "conteudo": {
        "epiteto": "Soberano do Silêncio",
        "soberano": "sim",
        "cor": "Preto",
        "bestiario": "selah",
        "descricao": "Ninguém sabe quando Selah apareceu pela primeira vez, porque quem estava lá não conseguiu contar. As histórias mais antigas sobre ele começam todas do mesmo jeito: alguém tentou gritar e não saiu nada.\n\nEle vem do Vazio, mas Erebus não responde por ele. O Vazio apaga o que alcança, sem pressa e sem escolher. Selah escolhe. Chega devagar, e o começo é pequeno: um cachorro que late sem som, uma panela que cai no chão e não faz barulho. Depois somem os passos, o vento, a água. Por último some a respiração de quem está por perto, e é nessa hora que a maioria entende o que está acontecendo, quando já é tarde para correr.\n\nQuem sobreviveu aprendeu a mesma regra: ele vai atrás de quem faz barulho. Um caçador da Guilda passou uma noite inteira deitado no chão de um celeiro, de olhos abertos, enquanto Selah atravessava o lugar. Ficou contando as batidas do próprio coração até não conseguir ouvir nem elas. Saiu vivo de manhã e nunca mais falou alto. Diz que não consegue, que a voz trava no meio do caminho, como se ainda estivesse esperando permissão.\n\nNinguém sabe o que ele faz com o que tira. Uma aldeia por onde ele passou nunca mais ouviu o próprio sino. O sino continua no lugar e balança com o vento, sem tocar. Os velhos de lá dizem que o som está guardado em algum canto, junto com tudo o que as pessoas deixaram de dizer, e que um dia volta.\n\nEstá entre os dez seres mais fortes do Jardim, e ninguém que o encontrou chegou a ouvir a voz dele. Pode ser que ele não tenha nenhuma. Pode ser que tenha todas."
      }
    },
    {
      "tipo": "personagem",
      "id": "circe",
      "titulo": "Circe",
      "registro_universal": "ser",
      "revelado": false,
      "conteudo": {
        "epiteto": "Soberana da Magia",
        "soberano": "sim",
        "cor": "Roxo",
        "descricao": "Circe e Jota Macedo cresceram juntos no orfanato de Ofélia, em Gênese, e eram melhores amigos. Os dois eram muito nerds: gostavam de estudar, de dividir o que descobriam e de passar horas discutindo a mesma ideia. Jota inventava. Circe era rígida e devota aos estudos, lia tudo o que o orfanato tinha sobre magia e, quando acabou, foi atrás do que não tinha.\n\nCresceu sabendo todas as magias do Fluxo da Origem, o de Gênese, uma por uma, com o nome, o custo e o jeito certo de errar. Dizem que ela é um grimório vivo. Se alguém pergunta por uma magia de Gênese, Circe responde sem consultar nada, e quase sempre corrige a pergunta.\n\nA morte de Ofélia separou os dois. Cada um tomou um rumo totalmente diferente: Jota foi construir, até virar dono de uma Árvore e quase uma deidade, e Circe foi estudar até o fim. Os outros irmãos do orfanato se espalharam, e Jota prendeu vários deles para criar a máscara. Circe foi uma das presas, e foi na prisão que ela descobriu uma forma de usar Fluxos que não eram o dela. Roubou, aos poucos, uma lasca de matéria de cada uma das nove Árvores, juntou tudo e transformou a soma numa Relíquia da Criação: o colar que usa até hoje. Com ele, Circe usa todos os Fluxos e conhece todas as magias de todos eles. Como conseguiu fazer isso de dentro de uma cela, nunca explicou.\n\nHoje está solta e raramente se mostra. De todos os que cresceram no orfanato, os dois são os que mais aparecem pelo mundo, e ela é a maior oposição a ele: ninguém quer tanto pará-lo quanto Circe, que o conhece desde criança. Para Jota, poder é uma coisa que se constrói, se mede e se melhora. Para Circe, é uma coisa que se estuda até o fim. Os dois não se falam desde a prisão, e nenhum dos dois admite sentir falta do outro. Ela está entre os dez seres mais fortes do Jardim."
      }
    },
    {
      "tipo": "personagem",
      "id": "karnath",
      "titulo": "Karnath",
      "registro_universal": "ser",
      "revelado": false,
      "conteudo": {
        "epiteto": "Soberano dos Monstros",
        "soberano": "sim",
        "cor": "Marrom",
        "descricao": "Karnath é o primeiro. Antes de haver nome para predador, antes de haver Bestiário e de haver quem tivesse medo, existia uma coisa que caçava, e ele é essa coisa. Todo monstro de todas as Árvores, das aberrações do Vazio às feras das montanhas, carrega uma lasca do que Karnath é, e por isso nenhum deles o encara sem hesitar um segundo.\n\nOs monstros o reconhecem de longe. Os que vivem em bando se calam quando ele passa, e os que vivem sozinhos mudam de caminho. Os dragões ficam de fora: respondem a Ushumgal, e Karnath não tem nada a provar a eles.\n\nA Guilda dos Caçadores mantém no Quadro uma chapa em branco para ele, sem nome, sem valor e sem prazo. Ninguém nunca pegou. A chapa é limpa toda manhã, e quem faz isso diz que é o único serviço da Guilda que nunca atrasou."
      }
    },
    {
      "tipo": "personagem",
      "id": "shinji-takamori",
      "titulo": "Shinji Takamori",
      "registro_universal": "ser",
      "revelado": false,
      "conteudo": {
        "epiteto": "Soberano dos Caçadores",
        "soberano": "sim",
        "cor": "Laranja",
        "lidera": "guilda-dos-cacadores",
        "descricao": "Shinji Takamori comanda a Guilda dos Caçadores desde antes de o Quadro ter o tamanho que tem. É um Caçador das Almas, o mais antigo vivo, e o único que os outros chamam de Mestre sem que isso soe como cargo.\n\nA lâmina dele tem nome, como a de todos, e só ele sabe qual é. Quem já viu a lâmina inteira não costuma contar como foi, e o motivo é simples: a lembrança é curta, porque tudo acontece depressa demais para ser guardada.\n\nDorme na Lanterna, ao lado da lente, e é o Faroleiro-mor de Pharos. É ele quem apaga o Farol na Última Luz e quem lê, na escada, o nome de cada caçador que volta de uma expedição. Os guardas da escada nunca duvidam da voz dele. Dizem que um dia o nome do próprio Shinji foi esquecido por todos ao mesmo tempo, e que o feixe ficou parado sobre ele a noite inteira até alguém lembrar. Ele diz que isso nunca aconteceu."
      }
    },
    {
      "tipo": "personagem",
      "id": "zero",
      "titulo": "Zero",
      "registro_universal": "ser",
      "revelado": false,
      "conteudo": {
        "epiteto": "Soberano do Sacrifício",
        "soberano": "sim",
        "cor": "Vinho",
        "lidera": "culto-carmesim",
        "descricao": "Antes de o Culto Carmesim ter números, tinha um membro só. Zero é quem veio primeiro e quem decidiu que o nome é uma coisa que se deixa para trás. Conversa com a Mulher Carmesim todo dia e acha que ela responde.\n\nÉ o ser que mais sangue derramou em nome de outro, e o único que faz isso com delicadeza. Pede desculpa antes, agradece depois e guarda o nome de cada vítima, o que é raro num Culto que passa o resto do tempo ensinando a esquecer o próprio. O Fim, que só se alcança quebrado, ele alcançou mais fundo do que qualquer outro, e é esse o motivo de estar entre os dez seres mais fortes do Jardim.\n\nNinguém o viu sem o capuz. A Casa Vermelha é a casa dele, e onde ela estiver, ele está. O resto do Culto acredita que a Noite Carmesim começa quando ele terminar de contar, e ninguém sabe até onde ele já contou."
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
        "descricao": "É o que sobrou de Keryx depois que ele perdeu para Jota Macedo. Continua vivo, fraco, preso num casulo da Malha, e o próprio Fluxo não obedece mais a ele: responde à A.X.I.S.\n\nSempre foi diplomata e rígido. Quando Jota apareceu com a tecnologia que tinha passado anos construindo, Keryx foi enfrentá-lo e perdeu. Era ele quem cuidava das leis e dos pactos entre as realidades, e ninguém sabe dizer se ainda cuida de alguma coisa lá de dentro.",
        "status": "preso",
        "subjugado_por": "A.X.I.S / Jota Macedo"
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "personagem",
      "id": "jota-macedo",
      "titulo": "Jota Macedo",
      "registro_universal": "ser",
      "revelado": false,
      "conteudo": {
        "epiteto": "Soberano da Tecnologia",
        "genero": "Masculino",
        "descricao": "Chamam Jota Macedo de maior gênio da ciência moderna. Criou a A.X.I.S e fundou a AstraTech, a maior corporação de tecnologia que já existiu. O que ele quer fica bem longe de fábrica e de lucro: quer fazer o que nenhum humano fez, largar os limites de quem nasce mortal e chegar à altura das deidades.\n\nPara isso trabalha em segredo numa máscara biomecânica, feita para conter e estabilizar o maior e mais puro fragmento de A.X.I.S que existe. Com ela, Jota usa o poder de uma deidade, contanto que essa deidade esteja presa num dos estoques dele.\n\nUma já está. Keryx, a deidade do Fluxo da Comunicação e guardião das leis e dos pactos entre as Árvores, lutou com Jota e perdeu, e Jota virou o primeiro ser humano a vencer uma deidade. Prendeu Keryx num dos casulos da Malha e drena o poder dele até hoje. É por isso que quase todas as deidades do Jardim estão paralisadas e sem conseguir se falar.\n\nAntes de tudo isso, Jota foi um menino do orfanato de Ofélia: inteligente, curioso e incapaz de usar qualquer Fluxo. Lá, ele e Circe eram melhores amigos. Os dois eram muito nerds, adoravam estudar e dividiam tudo o que descobriam. A morte de Ofélia levou cada um para um lado, e hoje Circe é a maior oposição a ele, a que mais quer detê-lo.\n\nOs outros irmãos do orfanato também se espalharam. Para criar a máscara, Jota prendeu vários deles e drenou o poder que tinham. Circe foi uma das presas.",
        "soberano": "sim",
        "cor": "Azul",
        "status": "ativo"
      },
      "arvore_origem": "keryx"
    },
    {
      "tipo": "evento",
      "id": "cataclismo-do-ano-zero",
      "titulo": "O Cataclismo do Ano Zero",
      "conteudo": {
        "galho": "realidade-0",
        "era": "Ano 0, o marco de onde toda a contagem parte",
        "descricao": "Salém já existia havia muito tempo quando uma magia deu errado e inúmeros galhos foram devastados em morte e caos. Quando voltou ao normal, ele foi 'criado' de novo, e foi desse ponto que começaram a contar os anos.\n\nÉ por isso que todas as datas conhecidas da Realidade 0 são posteriores: Astraluna em 1.188, o Império em 1.261, Emberhold em 1.510, Lionês em 1.595. E é por isso que Salém é o único reino que existiu dos dois lados do marco.",
        "envolvidos": "Salém"
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "evento",
      "id": "chuva-roxa",
      "titulo": "Chuva Roxa",
      "conteudo": {
        "dimensao": "padrao",
        "era": "Recorrente, sem periodicidade conhecida",
        "descricao": "Suas gotas, de tonalidade violeta e brilho quase metálico, caem majestosamente, mas não se engane: qualquer criatura viva que toque uma única gota sente imediatamente a vida se esvaindo, como se fosse drenada pra algum lugar misterioso.\n\nNinguém sabe ao certo de onde a Chuva Roxa surgiu. Algumas pessoas acusam Salém e falam que é consequência direta das magias usadas pelas bruxas. Outros acreditam que é um evento criado por uma entidade, um método de limpeza pra preparar a terra pra algo maior. Há ainda os ocultistas que dizem que a chuva é a manifestação do arrependimento da própria dimensão.\n\nO efeito é devastador. O contato direto mata instantaneamente: o corpo enrijece, perde a cor e, com o tempo, se transforma em pó. Nem armaduras garantem proteção: a chuva parece atravessar como se procurasse pela vida. Apenas estruturas totalmente fechadas ou mágicas oferecem segurança.\n\nOs sobreviventes contam que, antes de ela cair, o céu meio que respira: as nuvens se movem contra o vento, formando espirais lentas e hipnotizantes, o ar fica mais pesado, mais úmido, mais frio. E então começam as primeiras gotas. Cidades inteiras foram dizimadas em minutos.\n\nHá relatos de pessoas escolhidas pela chuva, que caminharam ilesas sob ela, como se as gotas escorressem ao redor de seus corpos. Essas pessoas não voltaram as mesmas: seus olhos brilhavam num tom violeta, e suas sombras se moviam de maneiras estranhas.",
        "envolvidos": "Origem desconhecida."
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "evento",
      "id": "noite-rubra",
      "titulo": "Noite Rubra",
      "conteudo": {
        "galho": "realidade-0",
        "era": "Raro e anunciado pela Lua Carmesim",
        "descricao": "Um dos eventos climáticos mais temidos. Ocorre raramente, anunciado por um fenômeno impossível de ignorar: A Lua Carmesim, que rasga o céu e tinge tudo com sua luz vermelha, vibrante e intensa. Dizem que a aparição dela vai além da astronomia: é como se o próprio Fluxo do Fim ficasse inquieto e quisesse sair de Arkarin.\n\nQuando a Lua Carmesim surge, portais, fendas e rachaduras aparecem pelo mundo, permitindo que amalgamas agressivas e corrompidas escapem de Arkarin e atravessem pra outras dimensões. Quando ela se põe, tudo volta ao normal, exceto as vidas que foram tiradas. Além disso, a Noite Rubra é vista como presságio de que algo pior está por vir.\n\n\"Somente os que sacrificam algo à altura podem continuar.\"\n\nOs grupos de seis que fizerem um sacrifício realmente grandioso, algo que marque a Noite Rubra, serão chamados a Arkarin, a terra onde as regras do mundo não se aplicam. Lá não há um momento de descanso, apenas desafios que testam a mente, a força, o medo e aquilo que cada um tenta esconder. Ao final das provas, apenas um grupo terá o direito de caminhar até ela, a Mulher Carmesim, que ouvirá um pedido dos vencedores.",
        "envolvidos": "Mulher Carmesim, Arkarin, o Fluxo do Sangue"
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "evento",
      "id": "baile-das-estacoes",
      "titulo": "Baile das Estações",
      "conteudo": {
        "dimensao": "padrao",
        "era": "Recorrente, quatro vezes por ano",
        "descricao": "Quatro bailes, um por estação, e cada um com uma função social diferente.\n\nO da Primavera acontece em grandes jardins repletos de flores, com músicas leves e danças circulares que envolvem todos. É visto como o baile do amor e das novas alianças: casamentos podem ser anunciados, pactos firmados e até bênçãos de sacerdotes concedidas.\n\nO do Verão é ao ar livre, com jardins e fogueiras iluminando a noite. As danças são vivas, há música forte, banquetes fartos e competições amistosas entre os convidados. É baile de celebração, mas também de ostentação, onde as famílias mostram poder e riqueza.\n\nO do Outono é mais calmo e reflexivo: os convidados se vestem em tons quentes e se reúnem pra agradecer pela colheita. Muitas vezes há discursos em memória dos que se foram e rituais simbólicos, e é comum que o baile seja interrompido por apresentações teatrais ou encenações sobre lendas antigas.\n\nO do Inverno reúne nobres e convidados em salões iluminados por candelabros e cristais de gelo, no auge do frio. É uma noite de máscaras, discursos formais e danças lentas, e muitos a usam pra selar acordos secretos.",
        "envolvidos": "A nobreza da Dimensão Padrão"
      },
      "revelado": true,
      "arvore_origem": "aethel"
    },
    {
      "tipo": "idioma",
      "id": "idioma-universal",
      "titulo": "Universal",
      "revelado": true,
      "conteudo": {
        "povo": "Todos os povos",
        "criador": "Um Auleth",
        "descricao": "A língua que todo mundo aprende cedo ou tarde, porque é nela que se compra, se cobra e se pede caminho. Foi criada por um Auleth, uma consciência que veio de fora do Jardim, e isso explica o jeito dela: regular, sem exceção, com uma palavra exata para cada coisa que se pode medir, contar ou pesar.\n\nPara o que se sente ela tem pouco. Quem quer declarar amor, xingar com vontade ou rezar costuma trocar para a língua do próprio povo no meio da frase, e ninguém estranha.",
        "como_soa": "Neutro e claro, sem sotaque de origem. Cada povo põe o seu por cima, e um ouvido treinado sabe de onde a pessoa vem pela segunda palavra.",
        "escrita": "Um alfabeto de traços retos, fácil de entalhar em madeira, riscar em pedra ou cunhar em moeda. É a escrita dos contratos, das placas de estrada e dos papéis do Banco Lunar.",
        "onde_se_ouve": "Em todo mercado, porto e estrada do Jardim. No Salão das Treze Portas, a porta do Universal é a mais gasta e a única que ninguém tranca.",
        "cumprimento": "“Bom caminho”, dito na chegada e na despedida."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-vampiros",
      "titulo": "Noctâr",
      "revelado": true,
      "conteudo": {
        "povo": "Vampiros",
        "descricao": "A língua de Întuneric, falada baixo, como convém a quem vive numa noite que nunca acaba. Tem dezenas de palavras para sangue, separadas por idade, por medo e por quem bebeu primeiro, e nenhuma para manhã. Quando um vampiro precisa falar do sol, usa uma palavra emprestada e cospe depois.\n\nCada Clã tem o seu sotaque, e um vampiro velho reconhece o Clã de outro antes de ver os dentes. Os Senhores da Noite usam um registro mais antigo, cheio de formas de tratamento, e esperam ser respondidos nele. Ninguém guardou o nome de quem deu o Noctâr aos vampiros, e os próprios vampiros discutem isso há séculos.",
        "como_soa": "Sussurrado e cheio de consoantes chiadas, com vogais fechadas que quase somem no fim das palavras. Dito em voz alta, parece sempre uma ordem.",
        "escrita": "Letras altas e estreitas, ligadas por cima como as grades de um portão. Escreve-se com tinta escura sobre pergaminho, e os documentos importantes levam uma gota de sangue de quem assina.",
        "onde_se_ouve": "Em Întuneric inteira: nos salões da Transilvânia, nos vagões dos Trens de Osso e nas ordens dadas nas Colônias, onde os humanos aprendem a entender e nunca recebem permissão para responder.",
        "cumprimento": "“Vel întâr”, que a noite te esconda."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-elfos",
      "titulo": "Ilvaari",
      "revelado": true,
      "conteudo": {
        "povo": "Elfos",
        "criador": "Os Finwë",
        "descricao": "A língua dos elfos, criada pela linhagem Finwë e guardada em Nadalon. Elfo não esquece nada, e a língua acompanha: uma palavra nunca muda de sentido, e um texto escrito há mil anos se lê como uma carta de ontem. Por isso o Ilvaari cresce devagar. Cada palavra nova passa anos em discussão entre os anciãos antes de ganhar o direito de existir.\n\nAs palavras são longas e montadas por pedaços, e uma só carrega o que outra língua diz numa frase. Cada uma das seis Linhagens tem um punhado de termos que só ela usa, e um Elfo de Sombras e um de Tempestades se entendem perfeitamente, com uma ou outra sobrancelha levantada.",
        "como_soa": "Musical e lento, com vogais dobradas e consoantes macias. Um elfo falando depressa é sinal de que alguma coisa vai muito mal.",
        "escrita": "Uma escrita de curvas que se lê de cima para baixo, em colunas. Os textos mais antigos de Alfarn foram escritos com luz na rocha branca da ilha e brilham até hoje.",
        "onde_se_ouve": "Em Nadalon, nas ilhas que flutuam ao redor de Alfarn, e em qualquer lugar onde um elfo queira dizer algo que os outros não entendam.",
        "cumprimento": "“Aelë iltavaa”, que a luz te ache."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-gigantes",
      "titulo": "Brontéu",
      "revelado": true,
      "conteudo": {
        "povo": "Gigantes",
        "descricao": "A língua dos gigantes foi feita para ser ouvida longe. As palavras são curtas, de vogais abertas, e cada sílaba sai com a força de quem chama alguém do outro lado de um vale. Sussurrar em Brontéu é quase impossível, e gigante que quer segredo escreve.\n\nTem poucas palavras para coisas pequenas. Um gigante chama de “pedrinha” qualquer coisa que caiba na mão dele, de uma moeda a um goblin, e só o contexto diz qual dos dois ele quer. Para montanha, vento e peso, o vocabulário é tão grande que nenhuma outra língua alcança.",
        "como_soa": "Grave e retumbante, como trovão ao longe. Dentro de casa, faz a louça tremer.",
        "escrita": "Sinais grandes, entalhados fundo na pedra, pensados para serem lidos de longe. Um recado de gigante costuma ocupar uma parede inteira.",
        "onde_se_ouve": "Nas pedreiras, nas trilhas das terras altas e em qualquer lugar onde um gigante precise ser ouvido sem sair do lugar.",
        "cumprimento": "“Thóra megá!”, batendo no peito: que o chão te aguente."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-goblins",
      "titulo": "Krammel",
      "revelado": true,
      "conteudo": {
        "povo": "Goblins",
        "descricao": "A língua dos balcões. O Krammel junta palavras como quem junta mercadoria, uma colada na outra, até uma só significar “o preço de hoje para um cliente de quem eu ainda não sei se gosto”. Tem trinta jeitos de dizer “barato”, e nenhum deles garante desconto.\n\nGoblin aprende a contar antes de aprender a falar, e o Krammel tem números para frações que nenhuma outra língua se dá ao trabalho de nomear. Quem negocia com um goblin em Universal paga mais. Quem tenta em Krammel e erra uma terminação paga o dobro, porque a terminação errada vira compromisso.",
        "como_soa": "Rápido, anasalado e cheio de consoantes juntas. Dois goblins pechinchando soam como uma panela de pressão.",
        "escrita": "Uma letra miúda e apertada, feita para caber na margem do recibo. Quase todo texto em Krammel tem uma cláusula escrita menor ainda, no rodapé.",
        "onde_se_ouve": "Em feiras, mercados e atrás de qualquer balcão onde um goblin tenha alguma coisa para vender ou revender.",
        "cumprimento": "“Krimm, kramm?”, o que você traz?"
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-anoes",
      "titulo": "Grúndar",
      "revelado": true,
      "conteudo": {
        "povo": "Anões",
        "descricao": "A língua de Khazad, falada nos salões e nas forjas que descem mais fundo do que qualquer mapa. Os anões a usam entre si e raramente com estrangeiros, mesmo quando entendem muito bem a língua de quem está falando com eles.\n\nTodo contrato de Khazad sai em duas vias, uma em Universal e outra em Grúndar, e só a segunda vale para um anão. É uma língua de nomes de metal, de cor de brasa e de juramento: existe um tempo verbal só para promessas, e quem promete nele e não cumpre deixa de ser chamado pelo nome.",
        "como_soa": "Pesado e cheio de erres, com palavras que terminam secas, como martelo batendo na bigorna.",
        "escrita": "Runas de traço reto, feitas para serem gravadas em metal e pedra com cinzel. Toda peça forjada em Khazad leva, em algum canto, a runa de quem a fez.",
        "onde_se_ouve": "Em Khazad, do primeiro salão ao mais fundo, e em qualquer oficina onde trabalhe um anão que prefere que o cliente não entenda o que ele acha do serviço.",
        "cumprimento": "“Eld ok hárn”, fogo e ferro: que a tua forja não apague."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-golens",
      "titulo": "Mudral",
      "revelado": true,
      "conteudo": {
        "povo": "Golens",
        "descricao": "Golem não respira, e a língua dele dispensa a voz. O Mudral se fala com as mãos, os braços e o corpo inteiro: cada sinal é uma pose que se segura por um instante, com o peso de quem foi feito de pedra ou metal. Uma conversa entre dois golens parece duas estátuas trocando de posição devagar.\n\nTem sinais para ordens, tamanhos e materiais, e uma gramática de distância: o mesmo sinal feito perto do peito ou com o braço esticado muda de sentido. Quem não é golem consegue aprender, e muita gente aprende, porque o Mudral funciona em silêncio absoluto e se entende do outro lado de uma praça.",
        "como_soa": "Não tem som. O único barulho é o raspar das juntas e o estalo da pedra quando um sinal termina.",
        "escrita": "Desenhos de mãos em posição, pintados ou entalhados em sequência, como uma tira de figuras. Muitos golens trazem uma frase dessas gravada no próprio corpo, deixada por quem os ergueu.",
        "onde_se_ouve": "Onde houver golens trabalhando e entre quem precisa conversar sem ser ouvido. No Salão das Treze Portas, a porta do Mudral fica no centro do círculo e não tem maçaneta.",
        "cumprimento": "As duas mãos abertas, palmas para baixo, descendo devagar até a cintura: estou parado, pode chegar."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-espiritos-naturais",
      "titulo": "Anemir",
      "revelado": true,
      "conteudo": {
        "povo": "Espíritos naturais",
        "descricao": "A língua dos espíritos naturais, os que morreram e ficaram presos ao mundo por um Fluxo. Ela dispensa garganta: sai como um sopro frio que chega ao ouvido de quem escuta, e por isso atravessa paredes do mesmo jeito que quem a fala.\n\nQuem tem sensibilidade ao Fluxo enxerga cada palavra do Anemir com uma cor, a do Fluxo de quem fala, e dois espíritos dizem a mesma frase em cores diferentes. É nela que se pronuncia um nome verdadeiro, e espírito nenhum diz o próprio sem confiar muito em quem ouve. Blanc, quando perguntam o que ela é, responde em Anemir, e a resposta nunca é a mesma duas vezes.",
        "como_soa": "Um sopro baixo, perto do ouvido, como vento passando por uma fresta. Os vivos sentem um arrepio antes de entender a primeira palavra.",
        "escrita": "Quase não existe. Os espíritos marcam o que precisam guardar com geada na janela, poeira assentada ou uma mancha de umidade que volta toda noite no mesmo lugar.",
        "onde_se_ouve": "Em casas abandonadas, cemitérios e campos de batalha antigos, e em qualquer lugar onde alguém morreu e não foi embora.",
        "cumprimento": "“Iá anemé”, ainda estou aqui."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-espiritos-demoniacos",
      "titulo": "Kharum",
      "revelado": true,
      "conteudo": {
        "povo": "Espíritos demoníacos",
        "descricao": "A língua dos espíritos que morreram agarrados a um Pecado. É áspera, cheia de sons de garganta, e foi feita para negociar: cada frase traz um preço embutido, e uma pergunta em Kharum já pressupõe o que se vai pedir em troca. Demônio nenhum diz “obrigado” na própria língua. A palavra mais próxima quer dizer “estamos quites, por enquanto”.\n\nOs pactos se fecham em Kharum, e o texto do pacto vale ao pé da letra. Por isso quem lida com demônios aprende pelo menos a ler, e mesmo assim costuma achar a cláusula que importava tarde demais.",
        "como_soa": "Rouco e gutural, com estalos no fundo da garganta. Até um elogio em Kharum soa como ameaça feita com calma.",
        "escrita": "Sinais angulosos, que parecem riscados com unha, escritos em pele, em pedra quente ou no ar, com cinza. Um pacto escrito queima de leve na mão de quem o assinou.",
        "onde_se_ouve": "Onde um demônio estiver fazendo negócio: encruzilhadas, porões, ruínas de templo e, de vez em quando, a boca de alguém possuído.",
        "cumprimento": "“Ghar sem-tah”, diga o seu nome."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-espiritos-angelicais",
      "titulo": "Aurelim",
      "revelado": true,
      "conteudo": {
        "povo": "Espíritos angelicais",
        "descricao": "A língua dos espíritos que morreram carregando uma Virtude. Soa como lei lida em voz alta: frases completas, sem gíria, com o verbo sempre no lugar certo. Um anjo escolhe cada palavra, e uma palavra dita por ele pesa como juramento.\n\nO Aurelim tem uma forma cantada, usada nos votos e nas bênçãos, que poucos vivos conseguem ouvir sem se emocionar sem saber por quê. Mentir nela é possível e custa caro: a frase sai desafinada, e qualquer anjo por perto percebe.",
        "como_soa": "Claro e sustentado, com vogais longas que parecem durar mais do que o fôlego permitiria.",
        "escrita": "Letras douradas de traço fino, escritas da direita para a esquerda. Os votos de um anjo costumam ficar gravados no lugar onde foram feitos e ainda se leem séculos depois.",
        "onde_se_ouve": "Em santuários, diante de portas que não devem ser abertas e ao lado de quem fez um voto e está prestes a quebrá-lo.",
        "cumprimento": "“Aurel imá”, a luz te viu."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-das-sereias",
      "titulo": "Talássio",
      "revelado": true,
      "conteudo": {
        "povo": "Sereias",
        "descricao": "A língua das sereias é sempre cantada. O mesmo som em tons diferentes vira palavras diferentes, e cada frase em Talássio tem melodia própria, que muda de sentido se alguém desafinar. Debaixo d'água ela alcança muito mais longe do que no ar, e duas sereias conversam de um lado a outro de uma baía sem subir à tona.\n\nMarinheiros aprendem pedaços de ouvido e quase sempre aprendem errado. Muita lenda de porto nasceu de uma canção de sereia mal traduzida, e algumas sereias se divertem deixando a tradução errada correr.",
        "como_soa": "Uma melodia de vogais compridas e consoantes leves. Fora d'água parece canto; dentro dela vira um zumbido que se sente no peito antes de chegar ao ouvido.",
        "escrita": "Sulcos em conchas e pedras do fundo, imitando o desenho das ondas. Muitas sereias nunca escrevem nada e guardam tudo de memória, em canções.",
        "onde_se_ouve": "No mar, da costa ao abismo, e nas noites de porto em que alguém jura ter ouvido cantarem perto do cais.",
        "cumprimento": "“Thalá, thalá”, cantado em duas notas: a maré te trouxe."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-animalias",
      "titulo": "Urrân",
      "revelado": true,
      "conteudo": {
        "povo": "Animálias",
        "descricao": "A língua mais velha que se conhece. Os Animálias a falam misturando palavra com rosnado, assobio e postura, porque bicho fala com o corpo inteiro. Por isso um Animália consegue trocar coisas simples com os animais, e por isso também quem não tem cauda nem orelha que mexa nunca fala Urrân tão bem.\n\nÉ mais antiga que o Valiriano, e os dragões primordiais ainda a usam entre si. Ushumgal, o nome que os outros povos dão ao Dragão Verdadeiro, é uma palavra de Urrân e quer dizer grande dragão. Ninguém sabe quem falou Urrân primeiro, e os Animálias acham a pergunta engraçada.",
        "como_soa": "Grave e cheio de sons que não cabem em letra: um grunhido curto, um estalo de língua, um silêncio no meio da frase que também quer dizer alguma coisa.",
        "escrita": "Marcas de garra, riscos em casca de árvore e pedras empilhadas em ordem. É uma das escritas mais antigas do Jardim e das mais difíceis de ler para quem não sabe onde olhar.",
        "onde_se_ouve": "Nas matas, nos campos e em qualquer lugar onde vivam Animálias, e nas tocas dos dragões mais velhos.",
        "cumprimento": "“Hurr”, curto, com o queixo levantado: o seu cheiro não me assusta."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-dragoes",
      "titulo": "Valiriano",
      "revelado": true,
      "conteudo": {
        "povo": "Dragões",
        "descricao": "A língua dos dragões. Todo dragão a entende desde o ovo, e um filhote recém-saído já responde às broncas nela, num guincho fino que só ele acha imponente. É uma língua de poucas palavras e muita entonação: o mesmo nome, dito com fumaça ou sem, pode ser cumprimento ou aviso.\n\nGente aprende a entender o Valiriano, e alguns cavaleiros chegam a falar o bastante para dar ordens no ar. Pronunciar direito já é outra história, porque várias palavras pedem uma garganta que esquenta. Os dragões primordiais são mais velhos que o Valiriano e ainda guardam entre si o Urrân.",
        "como_soa": "Grave e arrastado, com sons que vibram no peito de quem está perto. Quando o dragão se irrita, as consoantes saem com faísca.",
        "escrita": "Dragão quase não escreve. O que existe são marcas de garra em pedra e em metal derretido, e os nomes que os cavaleiros gravam nas selas para lembrar como se diz.",
        "onde_se_ouve": "Nos ninhos, nas cavernas, no céu sobre os vulcões e nas costas de quem aprendeu a montar.",
        "cumprimento": "Dragão não cumprimenta. Quando muito, diz o próprio nome e espera o seu."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-clones",
      "titulo": "Ao Contrário",
      "revelado": true,
      "conteudo": {
        "povo": "Clones",
        "descricao": "A língua dos clones é a fala dos outros povos dita de trás para frente. Começou como um jeito de dois clones conversarem sem que o Original entendesse, e ficou. Hoje tem gramática própria, palavras que só existem invertidas e uma regra que todo clone conhece: o próprio nome se diz sempre ao contrário, para lembrar de quem ele nasceu cópia.\n\nQuem tenta aprender por esperteza, invertendo a frase na cabeça, fica sempre um passo atrás. Os clones falam Ao Contrário tão depressa quanto qualquer um fala a própria língua, e riem quando alguém de fora ainda está desmontando a primeira palavra.",
        "como_soa": "Estranho e familiar ao mesmo tempo, como uma gravação tocada de trás para frente. Dá a impressão de que a pessoa está quase dizendo algo que você entende.",
        "escrita": "A escrita do Universal, de trás para frente e espelhada. Lê-se com a página contra a luz ou diante de um espelho.",
        "onde_se_ouve": "Onde houver clones juntos, e principalmente quando há um Original por perto.",
        "cumprimento": "“Aid mob”, bom dia."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-dos-automatos",
      "titulo": "Axial",
      "revelado": true,
      "conteudo": {
        "povo": "Autômatos",
        "descricao": "A língua dos autômatos. O nome vem da A.X.I.S, de onde os primeiros saíram, e é tudo o que se sabe da origem dela. É exata como uma conta, sem duplo sentido, ironia ou palavra vaga, e cada frase diz uma coisa só. Um autômato que quer ser gentil precisa avisar antes: “isto é uma gentileza”.\n\nO Axial passa de núcleo para núcleo sem som, em pulsos de luz e de sinal, e só vira voz quando há alguém de carne na conversa. Um autômato que fala Axial em voz alta está sendo educado com você.",
        "como_soa": "Em voz alta, sílabas curtas e iguais, num ritmo de relógio. Entre autômatos, um zumbido baixo e uma luz que pisca no núcleo.",
        "escrita": "Linhas de pontos e traços, gravadas em placas de metal ou guardadas direto no núcleo. Um autômato lê um texto desses mais rápido do que você lê esta frase.",
        "onde_se_ouve": "Nas oficinas, nos lugares que a A.X.I.S deixou para trás e em qualquer canto onde dois autômatos se encontrem.",
        "cumprimento": "“Axi tel, nul”: conexão feita, sem falha."
      }
    },
    {
      "tipo": "idioma",
      "id": "idioma-das-bruxas",
      "titulo": "Nemético",
      "revelado": true,
      "conteudo": {
        "povo": "Bruxas",
        "descricao": "A língua de Salém. As bruxas a usam para conversar, para escrever e, principalmente, para fazer feitiço, e no Nemético a fronteira entre as três coisas é fina. Uma sílaba fora do lugar muda o efeito de uma maldição inteira, e por isso bruxa jovem passa anos repetindo frases antes de ter permissão para dizê-las com intenção.\n\nComo Salém vive fechada para quem é de fora, o Nemético quase não sai de lá. As poucas palavras que chegaram aos outros reinos viraram superstição: gente que nem sabe o que elas querem dizer ainda as pendura na porta para afastar azar.",
        "como_soa": "Sussurrado e rítmico, com sons aspirados e palavras que terminam num suspiro. Recitado em grupo, parece uma reza que fica mais rápida a cada volta.",
        "escrita": "Riscos curtos ao longo de uma linha reta, como marcas num cabo de vassoura ou na quina de uma pedra. Cada Cadeira das Irmãs da Noite tem um sinal próprio, e um decreto de Salém só vale com os dez.",
        "onde_se_ouve": "Em Salém, nos círculos de bruxas espalhados pelo Jardim e, baixinho, em qualquer lugar onde alguém esteja lançando uma maldição.",
        "cumprimento": "“Mhar nem, dhú”: que nenhuma maldição te ache."
      }
    },
    {
      "tipo": "idioma",
      "id": "idiomas-do-jardim",
      "titulo": "Os Idiomas do Jardim",
      "conteudo": {
        "descricao": "Dezesseis línguas correm pelo Jardim. O Universal é de todos, e é nele que se compra, se viaja e se assina contrato. Cada povo guarda também a sua. Os Vampiros falam Noctâr; os Elfos, Ilvaari; os Gigantes, Brontéu; os Goblins, Krammel; os Anões, Grúndar; os Golens, Mudral; as Sereias, Talássio; os Animálias, Urrân; os Clones, Ao Contrário; os Autômatos, Axial; e as Bruxas, Nemético.\n\nO Espírito é o único povo com mais de uma língua, uma para cada Natureza: Anemir entre os naturais, Kharum entre os demoníacos e Aurelim entre os angelicais. Os dragões não formam um povo e mesmo assim têm a sua, o Valiriano, que todo dragão entende desde o ovo. Só os primordiais, mais antigos que ele, ainda guardam entre si o Urrân.\n\nCada língua tem a sua ficha no Alfabeto dos Registros Universais, com o som, a escrita, onde se ouve e um cumprimento.",
        "nota": "Só duas línguas guardam o nome de quem as criou: o Universal, de um Auleth, e o Ilvaari, dos Finwë. Das outras, o registro se perdeu, e cada povo conta a própria versão, quando conta."
      }
    },
    {
      "tipo": "local",
      "id": "bordo",
      "titulo": "Bordo",
      "conteudo": {
        "no_vazio": "erebus",
        "descricao": "Bordo é a borda do Jardim, a faixa onde a existência ainda consegue existir, e depois de onde não alcança mais. Nem escuro chega a ser, porque escuridão já seria alguma coisa, e ali não há nada. Quem olha pra frente em Bordo não vê preto, apenas não vê. É o único ponto do Vazio que ganhou nome próprio, porque é onde Erebus normalmente fica.\n\nErebus fica sentado nessa borda, de costas pro Jardim, e é a única deidade que nunca precisou de um lugar habitável dentro de uma Árvore: o próprio Vazio já é o lugar dele.\n\nA paralisia não o afetou como às outras. Erebus continua onde sempre esteve, fazendo o que sempre fez, e é impossível dizer se ele chegou a notar que as demais pararam de falar.",
        "nota": "Bordo não faz fronteira com nenhuma Árvore específica: ele faz fronteira com o fato de não haver mais nada. Diferente de um Galho, ele não pertence a uma Árvore: ele é a demarcação do limite que se pode chegar no universo."
      },
      "arvore_origem": "erebus"
    },
    {
      "tipo": "local",
      "id": "a-saida",
      "titulo": "A Saída",
      "conteudo": {
        "descricao": "O ponto onde a borda se abre. Não tem porta, moldura nem linha marcando: é apenas o lugar onde alguém pode deixar de existir por escolha própria, e o único lugar do Jardim onde isso é possível.\n\nA Mulher Carmesim recebe todos os que acabam, e cada um deles vira um livro na Biblioteca de Arkarin. Quem atravessa a Saída não vira livro. Não vira nada, e não deixa nada nem lembrança em quem ficou.\n\nErebus não impede ninguém de sair, ele apenas pergunta se tem certeza dessa escolha.",
        "caracteristicas": "Irreversível e sem registro. Não há como saber quem já passou por aqui, porque não sobra nada.",
        "no_vazio": "erebus",
        "local_pai": "bordo"
      },
      "revelado": true,
      "arvore_origem": "erebus"
    },
    {
      "tipo": "local",
      "id": "iwagakure",
      "titulo": "Iwagakure",
      "conteudo": {
        "dimensao": "padrao",
        "descricao": "\"Sempre o mesmo, não importa o adversário. Quebre-os até que estejam quebrados: tal é a maneira de Iwagakure.\"\n\nNa aldeia, as crianças são obrigadas a passar pelo treinamento ninja que as ensina as formas de matar, a resistência, e o aprendizado de abandonar os valores da vida. Uma das etapas é inalar a droga estimulante da dor e suportá-la por três dias e noites, até finalmente se acostumarem com ela: menos de uma em cada dez crianças sobrevive a essa parte sozinha. Matar seus colegas é permitido, não importa o motivo, e qualquer disputa entre shinobi se resolve em luta até a morte.\n\nComo diz a lei shinobi, é proibido abandonar a aldeia e qualquer ação ou pensamento nesse sentido é punido com a morte. Iwagakure também proíbe seus moradores de circular livremente, a menos que seja em missão.\n\nAs demais leis ninja são suprimir sentimentos, apego e humanidade, tornando-se vazios pra servirem como ferramentas de assassinato; a missão continua a qualquer custo, com quaisquer táticas necessárias; e a filosofia da vila é que a vida de um ninja não tem valor se ele não estiver servindo ao propósito de matar.\n\nO shinobi mais forte de Iwagakure é o Gabimaru, que é um título e não uma pessoa.",
        "governo": "Lei shinobi."
      },
      "arvore_origem": "aethel"
    },
    {
      "tipo": "local",
      "id": "astraluna-capital",
      "titulo": "Astraluna",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Capital da Árvore A.X.I.S, na Dimensão Padrão",
        "responsavel": "AstraTech e Jota Macedo",
        "dominio": "Tecnologia arcana, artefatos e a fusão entre magia e máquina",
        "faccao": "astratech",
        "descricao": "Astraluna é a capital da Árvore A.X.I.S e a sede da AstraTech. Foi fundada no ano 1.188 e cresceu até virar o maior centro de tecnologia arcana do mundo, reconhecido como o berço da fusão entre magia e máquina.\n\nAs oficinas e os laboratórios da cidade produzem artefatos que sustentam civilizações inteiras. Por isso Astraluna vive cercada de barreiras poderosas e de protocolos rígidos de segurança, e guarda as próprias invenções com um ciúme que nenhuma outra cidade tem. Quem quer comprar uma peça costuma assinar mais papel do que a peça vale.\n\nO governo é corporativo. Quem decide o que se constrói, e para quem, é a AstraTech, e Jota Macedo a preside daqui. Foi desta cidade que a A.X.I.S se espalhou pelo mundo, e para quem mora nela a A.X.I.S representa a esperança de que a energia do mundo enfim possa ser compreendida, reproduzida e evoluída por mãos mortais."
      }
    },
    {
      "tipo": "local",
      "id": "banco-lunar",
      "titulo": "Banco Lunar",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Vazio",
        "responsavel": "Amadheus Colona",
        "dominio": "Cofres, empréstimos, seguros e o câmbio entre as nove Árvores",
        "faccao": "banco-lunar",
        "descricao": "O Banco Lunar é a única instituição financeira que funciona em todas as Árvores ao mesmo tempo, e ninguém nunca teve coragem de abrir outra para disputar com ele. Tem agência em todas as Árvores, mas a matriz fica no Vazio, fora de todas elas.\n\nIsso explica quase tudo o que o Banco é. Quem atende as nove Árvores não pode morar dentro de nenhuma, e um dinheiro que vale em todas precisa de uma casa que não pertença a nenhuma. Por isso um Solar compra a mesma coisa em qualquer canto do Jardim: existe um lugar fora de tudo garantindo o câmbio, e esse lugar nunca precisou tomar partido.\n\nA matriz é um bloco claro e baixo, sem janela, cercado de corredores cheios de balcões. O atendimento não para nunca, porque no Vazio não existe manhã para esperar. Os cofres ficam nos andares de baixo e são alugados por tamanho e por prazo. Ninguém confere o que tem dentro.\n\nO Banco guarda, empresta e faz seguro. Cofre para quem tem o que esconder, empréstimo para quem tem como pagar, seguro para quem tem medo do que vem pela frente. Nenhum funcionário pergunta de onde o dinheiro veio. Perguntam se ele existe e se a assinatura confere. Os cargos são poucos: o escriturário atende na agência, o gerente decide, e o que passa do tamanho de uma agência sobe até Amadheus Colona.\n\nAmadheus é o Soberano dos Cosmos e não governa um palmo de chão. Cuida do dinheiro e assiste ao resto de longe. Dois exércitos em guerra podem ser atendidos no mesmo balcão, em dias diferentes, pelo mesmo atendente, que cumprimenta os dois do mesmo jeito. Quem tentou usar o Banco contra um inimigo descobriu depressa que o inimigo também tinha conta ali.\n\nEssa neutralidade tem preço, e quase ninguém consegue pagar. Amadheus só escolhe um lado quando alguém paga o bastante. Jota Macedo está entre os seres mais ricos do Jardim, e é por isso que, nas poucas vezes em que o Banco tomou partido, quase sempre foi o dele. Os dois são sócios desde que Amadheus era um ser comum de Gênese, mas se afastaram faz tempo: Jota ficou com a AstraTech, e Amadheus com o Banco Lunar inteiro."
      }
    },
    {
      "tipo": "local",
      "id": "pharos",
      "titulo": "Pharos",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Vazio, em volta da Porta Baixa",
        "responsavel": "Os Faroleiros e os Mestres de quadro",
        "dominio": "Contratos, quadro de procurados e a formação dos Caçadores das Almas",
        "faccao": "guilda-dos-cacadores",
        "descricao": "Pharos é a sede da Guilda dos Caçadores e a única cidade do Vazio com luz própria. Cresceu em volta da Porta Baixa, a maior passagem conhecida por onde as criaturas do Vazio chegam às Árvores, e não tem muralha nenhuma. No lugar dela há o Farol.\n\nO Farol sobe de uma ilha de basalto escuro, no meio do nada, e a cidade leva o nome dele numa língua velha: Pharos, o farol. A luz dele existe para lembrar. Tudo o que está dentro do feixe guarda o próprio nome, e criatura nenhuma do Vazio atravessa a luz de bom grado. O feixe dá uma volta completa a cada hora, e é por isso que a cidade vive em turnos: enquanto a luz passa por um lado, o outro fica no escuro, e é do lado escuro que alguém precisa estar de olho. Essa tarefa se chama Ronda. Todo caçador contratado cumpre uma por semana, e quem está com a Ronda atrasada não pega contrato novo.\n\nA cidade se espalha em terraços, em espiral, no pé do Farol. O Terraço Baixo é onde chega gente: a estalagem, as forjas, o mercado e a cadeia onde esperam os procurados entregues vivos. O Terraço do Meio é onde moram os caçadores contratados e as famílias deles, em escadas estreitas onde dois carregadores mal se cruzam. No alto, logo abaixo da lente, fica a Lanterna, e só entra ali quem a Guilda aceitou de vez.\n\nNa subida do primeiro terraço fica o Quadro, uma parede de ferro de uns vinte metros onde cada contrato aberto é pregado numa chapa. Procurado, criatura do Vazio, espírito que passou da conta: tudo vira chapa, com nome, descrição, valor e prazo. Quem pega o contrato arranca a chapa e leva. Na volta, o Mestre de quadro confere o que foi trazido e só então paga: metade do que o alvo vale no mercado, porque a outra metade fica com a Guilda. Quem tem pressa paga mais caro para contratar, e a pressa nunca sai do bolso do caçador.\n\nO Vazio apaga nome. Quem passa muito tempo fora do alcance da luz começa a ser esquecido, primeiro pelos conhecidos e depois pelos colegas. Por isso cada caçador tem o nome gravado numa placa de bronze nos degraus do Farol. Quem volta de uma expedição espera no pé da escada enquanto o nome dele é lido em voz alta e o Faroleiro de turno mantém o feixe parado sobre ele, até alguém reconhecer. Em geral dura segundos. Já aconteceu de durar a noite inteira. Já aconteceu de ninguém reconhecer, e de a placa ficar na escada com um risco ao lado, e o Farol seguir girando.\n\nOs Faroleiros cuidam da lente e do óleo, são poucos, falam pouco e trabalham sempre em dupla, porque um Faroleiro sozinho no escuro acaba esquecido em uma noite. Os Caçadores das Almas, que ligam a própria alma a uma lâmina com nome e vontade próprios, são os únicos que dormem na Lanterna. A formação leva anos e se divide em quatro disciplinas: a espada, o passo, o espírito e o corpo a corpo. Ninguém aprende as quatro ao mesmo tempo, e o nome da lâmina não é ensinado. Cada um descobre o seu.\n\nNa base do Farol, de costas para a cidade, fica o Pouso, uma casa baixa de pedra, sem nenhum enfeite, onde os caçadores levam os espíritos que aceitam ir. O ritual se chama Última Luz e é curto: o Faroleiro-mor apaga o Farol por sete segundos, o único momento em que a cidade inteira fica no escuro, e o espírito atravessa. A cidade toda para de falar nesses sete segundos, de espada na mão. O que demora é a espera na porta do Pouso. Tem espírito que passa horas diante dela sem entrar, e caçador que passa as mesmas horas ao lado dele, esperando. Ninguém comenta isso depois.\n\nTudo em Pharos custa o triplo, como em todo o Vazio, e quase tudo o que se come chega pela Caravana do Limiar. A cidade reclama disso o tempo inteiro e nunca pensou em morar em outro lugar."
      }
    },
    {
      "tipo": "local",
      "id": "patio-das-rotas",
      "titulo": "Pátio das Rotas",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Vazio",
        "responsavel": "Os Mestres de caravana",
        "dominio": "Montagem das caravanas e lista das passagens abertas",
        "faccao": "caravana-do-limiar",
        "descricao": "Um pátio enorme de terra batida, sem teto, no ponto do Vazio onde as passagens conhecidas se abrem. É ali que as caravanas se montam antes de partir e se desmontam na volta. Cada passagem tem uma faixa numerada pintada no chão, e o Mestre de caravana de plantão sabe de cabeça quais estão abertas, quais cobram a mais e quais ninguém atravessa mais.\n\nComo nada nasce no Vazio, quase tudo o que se come por lá passa pelo Pátio primeiro, em fardos e barris. É por isso que os preços de todo o Vazio são o triplo, e a Caravana não finge que não sabe. Rota selada ela não atravessa, e a lista das seladas fica pregada na entrada, atualizada à mão."
      }
    },
    {
      "tipo": "local",
      "id": "agulha",
      "titulo": "A Agulha",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Vazio",
        "responsavel": "Os vigias",
        "dominio": "Vigilância das passagens e evacuação de áreas ameaçadas",
        "faccao": "vigilia-das-raizes",
        "descricao": "A Agulha é uma torre alta e fina, a mais alta do Vazio, onde a Vigília mantém vigias acordados dia e noite olhando para as passagens. Do topo se vê onde o Vazio encosta nas Árvores, e quando uma fronteira cede o primeiro aviso sai dali, uma luz acesa no alto que as outras casas da Vigília repetem uma a uma.\n\nEmbaixo ficam o alojamento, o depósito de corda, lona e carroça de evacuação, e uma sala só de mapas. Cada ruptura conhecida tem a própria folha, e cada folha tem data. A Vigília diz que a sala é maior que a torre, e quem já entrou lá confirma."
      }
    },
    {
      "tipo": "local",
      "id": "acervo-prismatico",
      "titulo": "Acervo Prismático",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Vazio",
        "responsavel": "Os arquivistas",
        "dominio": "Registros verificados, identificação de artefatos e consulta paga",
        "faccao": "arquivo-prismatico",
        "descricao": "Fica no Vazio de propósito, fora de qualquer Árvore, para que nenhuma possa reclamar o que está guardado. É um salão comprido de prateleiras de vidro fosco, e cada registro descansa numa peça que só deixa passar luz de uma cor. A cor diz de onde a informação veio. Cada Árvore tem a sua, e daí vem o nome.\n\nEntra no Acervo quem trouxe algo para guardar ou quem paga para consultar. Os arquivistas conferem tudo duas vezes, em núcleos diferentes, e quando as duas versões não batem a informação vai para uma prateleira à parte, com uma faixa preta, até alguém descobrir qual das duas mentiu."
      }
    },
    {
      "tipo": "local",
      "id": "salao-das-treze-portas",
      "titulo": "Salão das Treze Portas",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Gênese, na Dimensão Padrão",
        "responsavel": "Os tradutores",
        "dominio": "Tradução, intérpretes e o registro dos idiomas do Jardim",
        "faccao": "casa-das-linguas",
        "descricao": "Um salão redondo, em Gênese, com treze portas, uma para cada povo do Jardim. Atrás de cada porta fica uma sala de trabalho com dicionários, cartas e os tradutores daquele povo. O salão do meio serve a quem precisa de duas línguas na mesma conversa e espera a vez numa fila que anda devagar.\n\nA porta do Universal é a mais gasta e a única que ninguém tranca. A do Mudral fica no centro do círculo e não tem maçaneta, porque ali se pede licença por sinal, e quem não sabe o sinal espera que alguém de dentro o ensine."
      }
    },
    {
      "tipo": "local",
      "id": "campanario",
      "titulo": "Campanário",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Limiar, num recanto cedido pela Mulher Carmesim",
        "responsavel": "Os relatores",
        "dominio": "Registro das aparições de Entidades e venda de avisos",
        "faccao": "sociedade-do-sino",
        "descricao": "No Limiar, num recanto pequeno que a Mulher Carmesim deixa à Sociedade, fica uma torre de pedra com um único sino, rachado, que só toca quando chega o aviso de uma Entidade. Quem mora perto aprendeu a contar as batidas: uma para cada rank de perigo, do azul ao preto. Cinco batidas seguidas só aconteceram duas vezes, e as duas estão anotadas na parede da escada.\n\nEmbaixo fica a sala dos relatos, onde os relatores escrevem e guardam o que se sabe, com uma estante para cada Entidade conhecida. Cada folha diz quem encontrou, quando, onde e o que perdeu. A Sociedade vende cópia do relato mais recente a quem pede, e recusa a venda para quem diz que quer ir atrás da Entidade."
      }
    },
    {
      "tipo": "local",
      "id": "casa-do-primeiro-lume",
      "titulo": "Casa do Primeiro Lume",
      "registro_universal": "local",
      "revelado": true,
      "conteudo": {
        "localizacao": "Anima",
        "responsavel": "Os curandeiros da Ordem",
        "dominio": "Cura, socorro e a lamparina que dá nome à Ordem",
        "faccao": "ordem-do-lume",
        "descricao": "A casa-mãe da Ordem do Lume fica em Anima e é a única que nunca fechou. Dizem que o primeiro lume foi aceso ali, numa lamparina pequena ao lado da porta, e que ela nunca se apagou desde então. Os curandeiros trocam o óleo de manhã e à noite, e fazem isso sem cerimônia, como quem lava a louça.\n\nAtende qualquer ferido que chegue pelo portão, sem perguntar de que lado ele estava. Dentro, as alas se separam só pela gravidade do caso, e rivais que acabam na mesma enfermaria aprendem a conviver sem arma. Quem se recupera deixa alguma coisa na parede para quem vem depois, um nome, um desenho, uma palavra. A parede de dentro já é mais grossa que a de fora."
      }
    },
    {
      "tipo": "local",
      "id": "galpoes-do-meio",
      "titulo": "Galpões do Meio",
      "registro_universal": "local",
      "revelado": false,
      "conteudo": {
        "localizacao": "Vazio",
        "dominio": "Depósito de mercadoria não declarada",
        "faccao": "a-ordem",
        "descricao": "Uma fileira de armazéns num trecho do Vazio onde nenhuma outra facção quis construir. Por fora parecem velhos e vazios. Por dentro, a Ordem guarda caixas e barris que não foram declarados em balcão nenhum, e cada caixa leva um número que só o dono e o contador entendem.\n\nQuem negocia nos Galpões chega de capuz e sai pela porta dos fundos. Ninguém assina nada. O acordo se fecha pelo pagamento adiantado, e a Ordem cumpre, porque descumprir uma vez bastaria para acabar com o negócio de todo mundo."
      }
    },
    {
      "tipo": "local",
      "id": "casa-vermelha",
      "titulo": "Casa Vermelha",
      "registro_universal": "local",
      "revelado": false,
      "conteudo": {
        "localizacao": "Desconhecida, em alguma Árvore pequena e esquecida",
        "dominio": "Reunião das células e sacrifícios",
        "faccao": "culto-carmesim",
        "descricao": "Ninguém sabe ao certo onde fica, e provavelmente ela não fica no mesmo lugar duas vezes. O pouco que se sabe vem de quem conseguiu sair: por fora é uma casa comum, de porta baixa e janelas fechadas com tábua. Por dentro, as paredes são pintadas de vermelho escuro todo ano, por cima da tinta do ano anterior, e as camadas já pesam.\n\nÉ onde as células se reencontram para dividir o que fizeram e escolher o próximo. Existe uma sala só para a Mulher Carmesim, vazia, com uma cadeira virada para a parede. Os membros acreditam que ela escuta dali, e que o silêncio da sala é a resposta."
      }
    },
    {
      "tipo": "local",
      "id": "pomar",
      "titulo": "O Pomar",
      "registro_universal": "local",
      "revelado": false,
      "conteudo": {
        "localizacao": "Escondido, com um só caminho de acesso",
        "dominio": "Cofre dos Frutos do Éden e das relíquias colhidas",
        "faccao": "colhedores-do-eden",
        "descricao": "É onde os Colhedores guardam o que tiraram dos outros: Frutos do Éden ainda inteiros, relíquias da Criação trancadas em cofres de ferro, objetos que valem mais que a rua inteira de onde foram levados. O lugar tem um só caminho de entrada, e o caminho é vigiado.\n\nO nome começou como piada. Cada Fruto ganha uma árvore pintada na parede, e quando ele é vendido a árvore é riscada. Ninguém lembra quem começou isso. A parede do fundo já está quase toda riscada, e os Colhedores mais velhos evitam olhar para ela."
      }
    },
    {
      "tipo": "local",
      "id": "biblioteca-de-arkarin",
      "titulo": "Biblioteca de Arkarin",
      "conteudo": {
        "dimensao": "castelo-carmesim",
        "descricao": "Nos níveis mais profundos do Castelo Carmesim, um espaço que não tem limites, começo ou fim. Estende-se além do que a mente pode compreender: é um oceano infinito de prateleiras cheias de histórias dos que se foram, dos que ainda vivem e dos que irão viver.\n\nAqui repousam todos os livros que a Mulher Carmesim já escreveu e que ainda irá escrever. Cada livro é a vida de um ser: não importa quão pequeno, insignificante, grandioso ou cósmico você foi, sua história está ali. Cada livro é único: tamanho, formato e aparência refletem a natureza da existência que ele representa. Alguns são imensos, com milhares de páginas douradas que brilham como estrelas; outros são pequenos, frágeis, quase efêmeros, escritos em folhas finas que quase não se dá pra ver.\n\nNinguém além da Mulher Carmesim compreende inteiramente a organização da Biblioteca: não é linear, nem segue ordem alfabética, datas ou espécies. Ela existe não apenas como arquivo, mas como ferramenta de balanço, consulta e, às vezes, julgamento: quando um ser é trazido ao Tribunal, seu livro surge flutuando diante dela, que lê e sentencia com base no que está ali, na verdade pura, nua, sem interpretações.\n\nÉ dito que, em algum lugar da Biblioteca, existem livros que nunca foram abertos, cujos títulos não podem ser pronunciados. Livros que, se abertos, mostram o próprio fim de tudo. Nem mesmo a Mulher Carmesim toca neles, a não ser que o fim do próprio universo assim o exija."
      },
      "arvore_origem": "mulher-carmesim"
    }
  ];
