export interface TracoRacial {
  nome: string;
  descricao: string;
}

export interface Raca {
  id: string;
  nome: string;
  ajustes: string;
  tracos: TracoRacial[];
}

export const RACAS: Raca[] = [
  {
    "id": "humano",
    "nome": "Humano",
    "ajustes": "Vida: +0 | Mana: +0 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Tamanho Normal."
      },
      {
        "nome": "Adaptabilidade",
        "descricao": "Na criação, escolha uma perícia adicional para começar em Aprendiz. Assim, um Humano começa com sete perícias em Aprendiz, em vez de seis."
      }
    ]
  },
  {
    "id": "vampiro",
    "nome": "Vampiro",
    "ajustes": "Vida: +1 | Mana: +0 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Enxerga normalmente em escuridão natural, mas não através de escuridão criada por magia ou Fluxo."
      },
      {
        "nome": "Hemofagia",
        "descricao": "Uma vez por cena, gaste uma ação para beber o sangue de um ser vivo voluntário ou incapacitado e recuperar 1d6 de Vida. Não funciona com construtos, Espíritos ou criaturas sem sangue."
      },
      {
        "nome": "Fome de Sangue",
        "descricao": "Depois de 24 horas sem consumir sangue, descansos recuperam apenas metade da Mana normal, com mínimo de 1, até o Vampiro se alimentar."
      }
    ]
  },
  {
    "id": "goblim",
    "nome": "Goblim",
    "ajustes": "Vida: -1 | Mana: +1 | Movimento: +1.5m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Tamanho Pequeno."
      },
      {
        "nome": "Passos Ligeiros",
        "descricao": "Receba +1,5 m de Movimento."
      },
      {
        "nome": "Mercador Improvisador",
        "descricao": "Receba vantagem em testes feitos para negociar a venda de um item que pertence ao Goblim."
      }
    ]
  },
  {
    "id": "anao",
    "nome": "Anão",
    "ajustes": "Vida: +2 | Mana: +0 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Tamanho Pequeno."
      },
      {
        "nome": "Mãos de Ofício",
        "descricao": "Receba vantagem em testes de Ofício para construir ou reparar. Uma vez por descanso, depois de falhar em um desses testes, você pode rerrolá-lo e deve usar o novo resultado."
      }
    ]
  },
  {
    "id": "golem",
    "nome": "Golem",
    "ajustes": "Vida: +5 | Mana: -2 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Tamanho Grande ou Enorme, definido na criação."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Não precisa respirar, comer ou beber e não contrai doenças comuns."
      },
      {
        "nome": "Corpo Construído",
        "descricao": "Ofício pode substituir Medicina para tratar o Golem, usando a mesma DT e o mesmo tempo. Tratamentos que dependam exclusivamente de uma biologia viva não funcionam nele."
      },
      {
        "nome": "Estrutura Adaptada",
        "descricao": "Armaduras e vestimentas comuns precisam ser adaptadas ao corpo do Golem antes de serem equipadas."
      }
    ]
  },
  {
    "id": "espirito",
    "nome": "Espírito",
    "ajustes": "Vida: -2 | Mana: +3 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Não precisa respirar, comer ou beber."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Enxerga normalmente em escuridão natural."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Não pode vestir armaduras comuns."
      },
      {
        "nome": "Passagem Etérea",
        "descricao": "Uma vez por cena, gaste 2 Mana durante seu movimento para atravessar até 1,5 m de material sólido. Você precisa conhecer ou enxergar um espaço livre do outro lado, não pode terminar dentro do material nem carregar outra criatura."
      }
    ]
  },
  {
    "id": "gigante",
    "nome": "Gigante",
    "ajustes": "Vida: +4 | Mana: -1 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Tamanho Grande; equipamentos precisam ter tamanho compatível."
      },
      {
        "nome": "Porte Colossal",
        "descricao": "Receba vantagem para resistir a empurrões e quedas causados por outra criatura. Sua capacidade de carga é dobrada."
      }
    ]
  },
  {
    "id": "animalia",
    "nome": "Animália",
    "ajustes": "Vida: +0 | Mana: +0 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "O tamanho e a aparência são definidos pelo animal representado e pela morfologia escolhida."
      },
      {
        "nome": "Voz da Fauna",
        "descricao": "Você consegue comunicar ideias simples a animais e compreender suas respostas básicas. Isso não concede controle sobre eles."
      }
    ]
  },
  {
    "id": "sereia---tritao",
    "nome": "Sereia / Tritão",
    "ajustes": "Vida: -1 | Mana: +2 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Anfíbio: respira no ar e na água; seu deslocamento de natação é igual ao Movimento terrestre."
      },
      {
        "nome": "Canto Fascinante",
        "descricao": "Uma vez por cena, gaste uma ação e 2 Mana para fazer um teste de Carisma contra a Vontade de uma criatura a até 9 m que possa ouvir. Em sucesso, ela fica fascinada até o início do seu próximo turno; o efeito termina antes se ela sofrer dano."
      }
    ]
  },
  {
    "id": "miceliano",
    "nome": "Miceliano",
    "ajustes": "Vida: +1 | Mana: +1 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Organismo fúngico: alimenta-se como um ser vivo comum, mas também consegue absorver nutrientes ao permanecer em contato com solo fértil durante um descanso."
      },
      {
        "nome": "Rede Micelial",
        "descricao": "Gaste uma ação para deixar esporos em uma criatura voluntária que você toque. Até o próximo descanso, vocês podem trocar silenciosamente ideias simples enquanto estiverem a até 30 m um do outro. Uma criatura só pode carregar os esporos de um Miceliano por vez."
      },
      {
        "nome": "Memória do Solo",
        "descricao": "Depois de permanecer 1 minuto em contato com terra, madeira ou fungos de uma área, faça um teste de Sobrevivência para perceber se criaturas passaram por aquele local recentemente. O efeito revela presença e direção aproximada, não identidades."
      }
    ]
  },
  {
    "id": "slime",
    "nome": "Slime",
    "ajustes": "Vida: +3 | Mana: -2 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Corpo semissólido: não possui ossos nem órgãos em posições fixas."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Armaduras e vestimentas rígidas precisam ser adaptadas ao corpo do Slime."
      },
      {
        "nome": "Corpo Maleável",
        "descricao": "Sem carregar equipamento rígido maior que a passagem, você pode atravessar aberturas de pelo menos 15 cm. O trecho apertado conta como terreno difícil e você não pode terminar o movimento dentro dele."
      },
      {
        "nome": "Amortecimento Gelatinoso",
        "descricao": "Reduza pela metade o dano sofrido por quedas. Você também recebe vantagem em testes para escapar de agarrões ou amarras que não sejam hermeticamente fechadas."
      }
    ]
  },
  {
    "id": "feerico",
    "nome": "Feérico",
    "ajustes": "Vida: -2 | Mana: +4 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Tamanho Pequeno ou Normal, definido na criação."
      },
      {
        "nome": "Truque Feérico",
        "descricao": "Crie à vontade um efeito sensorial pequeno e inofensivo, como faíscas, um perfume, um sussurro ou uma imagem do tamanho da sua mão. O truque não causa dano, não concede bônus e não reproduz uma criatura de forma convincente."
      },
      {
        "nome": "Glamour",
        "descricao": "Uma vez por cena, gaste uma ação e 2 Mana para criar uma ilusão visual e sonora de até 3 m em um ponto a até 15 m. Ela dura enquanto você mantiver concentração, por no máximo 1 minuto. Quem interagir diretamente pode testar Percepção contra seu Misticismo para reconhecer a ilusão."
      }
    ]
  },
  {
    "id": "elfo",
    "nome": "Elfo",
    "ajustes": "Vida: +2 | Mana: +4 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Não envelhece e é imune a envelhecimento sobrenatural."
      },
      {
        "nome": "Intelecto Élfico",
        "descricao": "Receba +4 em Inteligência. Somente esse bônus racial pode levar Inteligência acima do limite natural 20, até o máximo 24; ele não altera o limite de nenhum outro atributo."
      },
      {
        "nome": "Memória Milenar",
        "descricao": "Você possui quatro rerrolagens por sessão, utilizáveis somente em testes cujo atributo seja Inteligência. Ao gastar uma, rerrole o teste e use o novo resultado."
      },
      {
        "nome": "Herança Ancestral",
        "descricao": "Ao adquirir esta raça, receba um Legado adicional."
      },
      {
        "nome": "Linhagem Élfica",
        "descricao": "Escolha uma das sete Linhagens Élficas. Você recebe apenas as características da Linhagem escolhida e não pode acumular efeitos de duas Linhagens."
      }
    ]
  },
  {
    "id": "desperto",
    "nome": "Desperto",
    "ajustes": "Vida: +4 | Mana: +2 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Continua sendo um ser vivo, salvo alteração declarada pela Condição Ancestral escolhida."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Carrega um Fragmento de Arkarin ligado à própria alma."
      },
      {
        "nome": "Fragmento de Arkarin",
        "descricao": "O fragmento vibra quando existe, a até 15 m, um Espírito ou alma aprisionada, um cadáver alterado sobrenaturalmente ou um efeito ligado à morte ou ao Fluxo de Arkarin. Ele revela presença e direção aproximada, mas não identidade, quantidade ou distância exata."
      },
      {
        "nome": "Renegado da Morte",
        "descricao": "Receba +4 em Vontade e vantagem em testes contra morte instantânea, drenagem de Vida ou Mana, controle da alma e aprisionamento espiritual. Se um efeito tentaria capturar, consumir ou controlar sua alma sem permitir resistência, faça Vontade contra a DT do efeito."
      },
      {
        "nome": "Ecos de Séculos Mortos",
        "descricao": "Para cada século completo que permaneceu morto, receba uma rerrolagem por sessão, até o máximo de cinco. Você pode usá-la em qualquer teste, mas deve manter o novo resultado. Quem permaneceu morto por menos de um século não recebe rerrolagens desta característica."
      },
      {
        "nome": "Recusar o Fim",
        "descricao": "Uma vez por cena, quando morreria, gaste uma reação e 6 Mana, mesmo inconsciente. Sua Vida torna-se 1, Morrendo é removido, Ferido aumenta em 1 e a morte instantânea ou captura da alma que ativou a reação é negada. Não funciona sem Mana suficiente nem depois que a morte já foi concluída."
      },
      {
        "nome": "Condição Ancestral",
        "descricao": "Escolha uma Condição Ancestral baseada no motivo do retorno. Você recebe somente a dádiva e a cicatriz da Condição escolhida."
      }
    ]
  },
  {
    "id": "auleth",
    "nome": "Auleth",
    "ajustes": "Vida: +2 | Mana: +0 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Não precisa comer, beber ou dormir. Para concluir um descanso, medita pelo tempo normal e pode perceber os arredores, mas qualquer atividade além de observação simples interrompe a recuperação."
      },
      {
        "nome": "Fisiologia",
        "descricao": "É imune a doenças comuns ou sobrenaturais, mas não a venenos ou outras condições que apenas produzam sintomas semelhantes."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Sua massa permanece aproximadamente constante quando altera o tamanho; formas pequenas tornam-se mais densas e formas grandes, mais rarefeitas."
      },
      {
        "nome": "Conhecimentos Extremos",
        "descricao": "Escolha duas áreas de estudo aprovadas pelo mestre, cada uma mais estreita que uma Árvore ou Fluxo inteiro e mais ampla que um único indivíduo. Quando um teste de Conhecimento, Investigação, Misticismo, Ressonância, Tecnologia ou Ritos de Arkarin tratar diretamente de uma área escolhida, você recebe vantagem. Uma vez por sessão para cada área, depois de falhar em um desses testes, pode rerrolá-lo e deve manter o novo resultado. Isso não revela segredos sem pistas nem informações que nenhuma fonte acessível poderia fornecer."
      },
      {
        "nome": "Forma sem Molde",
        "descricao": "À vontade, gaste sua ação e todo o Movimento do turno para alterar anatomia, aparência, voz e tamanho entre Minúsculo, Pequeno, Normal, Grande ou Enorme. A transformação não altera atributos, Vida, Mana, Movimento, alcance, capacidade de carga ou quantidade de ações e não concede sentidos, ataques, imunidades ou características da forma copiada. Sua massa permanece constante. Equipamentos não se transformam e caem intactos aos seus pés quando forem incompatíveis. Imitar perfeitamente uma criatura específica exige Enganação contra a Intuição de quem a conheça; a forma permanece até você mudá-la novamente."
      },
      {
        "nome": "Emoção Distante",
        "descricao": "Além do ajuste de -3 em Carisma, você sofre desvantagem em Intuição para interpretar emoções e em Diplomacia para consolar, inspirar ou criar um vínculo emocional. A limitação não se aplica a negociações objetivas, análise lógica, Enganação ou Intimidação."
      }
    ]
  },
  {
    "id": "autômato",
    "nome": "Autômato",
    "ajustes": "Vida: +0 | Mana: +0 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Construto consciente da A.X.I.S; Constituição representa Integridade Estrutural, mas continua sendo usada normalmente nas fórmulas e em Fortitude."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Não precisa respirar, comer, beber ou dormir. Para concluir um descanso, permanece inativo ou em recarga pelo tempo normal."
      },
      {
        "nome": "Fisiologia",
        "descricao": "É imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos enquanto não possuir a modificação Máquina Viva."
      },
      {
        "nome": "Núcleo Autônomo",
        "descricao": "Você possui vontade própria e não precisa obedecer a um criador. Seu Nível Total também é o nível do núcleo, e você pode receber níveis de classe desde o nível 1. Sua Mana representa a Energia do Núcleo e é recuperada normalmente por descanso ou Relaxar."
      },
      {
        "nome": "Corpo Artificial",
        "descricao": "Você é imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos. Não precisa respirar, comer, beber ou dormir. Essas imunidades são perdidas enquanto Máquina Viva estiver instalada."
      },
      {
        "nome": "Reparo Mecânico",
        "descricao": "Descanso e curas comuns ou mágicas não recuperam sua Vida. Um personagem pode gastar uma hora e fazer Ofício (Engenharia) contra DT 15 + piso do seu Nível Total dividido por 2; em sucesso, você recupera 5 de Vida. Uma nova tentativa exige outra hora. Máquina Viva substitui esta regra pela recuperação normal."
      },
      {
        "nome": "Colapso do Núcleo",
        "descricao": "Ao chegar a 0 Vida ou menos, você segue normalmente as regras de Morrendo. Seu núcleo somente é destruído quando sua morte é concluída. Substituir um núcleo destruído exige um acontecimento narrativo aprovado pelo mestre."
      },
      {
        "nome": "Arquitetura Modular",
        "descricao": "Seu limite de modificações instaladas é 1 + piso do Nível Total dividido por 2. Uma modificação ativa exige pelo menos três passivas instaladas, além dos demais pré-requisitos. Instalar uma modificação exige um dia de trabalho de alguém capaz de realizar Ofício (Engenharia); custos e obtenção de peças são resolvidos pelo mestre."
      }
    ]
  },
  {
    "id": "clone",
    "nome": "Clone",
    "ajustes": "Vida: +3 | Mana: +3 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "É biologicamente vivo e precisa respirar, alimentar-se, dormir e descansar normalmente."
      },
      {
        "nome": "Fisiologia",
        "descricao": "A aparência pode reproduzir outra raça, mas o Clone possui somente as características raciais deste pacote."
      },
      {
        "nome": "Matriz Aperfeiçoada",
        "descricao": "Escolha dois atributos diferentes. Cada um recebe +2, respeitando o limite natural 20."
      },
      {
        "nome": "Cópia Biométrica",
        "descricao": "Você reproduz aparência, voz, digitais, retina e outras características físicas do Original. Receba vantagem em Enganação para se passar por ele quando aparência, voz ou identificação biométrica forem as evidências principais. Pessoas que conheçam intimamente o Original podem usar Intuição para perceber diferenças de comportamento. Você não copia automaticamente raça, classe, Habilidades, Poderes, Legados, alma, pactos, bênçãos, Fragmentos de Arkarin ou lembranças completas."
      },
      {
        "nome": "Memórias Residuais",
        "descricao": "Uma vez por sessão, pergunte se possui uma lembrança relacionada ao Original. Se ele conhecia a informação no momento da clonagem, o mestre entrega uma memória curta, verdadeira e incompleta: imagem, frase, sensação, rosto ou localização aproximada. Isso não fornece senhas completas, segredos sem contexto ou conhecimentos posteriores à clonagem."
      },
      {
        "nome": "Regeneração Programada",
        "descricao": "Uma vez por cena, quando sofrer dano e ficar com metade da Vida máxima ou menos, gaste uma reação e 4 Mana para recuperar 2d6 + Mod.Constituição de Vida, com mínimo de 2d6."
      },
      {
        "nome": "Projeto de Clonagem",
        "descricao": "Escolha Réplica Perfeita, Arquivo Vivo, Organismo Otimizado ou Série Contínua. Você recebe somente as características do Projeto escolhido."
      }
    ]
  },
  {
    "id": "errante",
    "nome": "Errante",
    "ajustes": "Vida: +3 | Mana: +3 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Identidade Preservada",
        "descricao": "Conserve nome, aparência, personalidade, lembranças, relações, cicatrizes, objetivos e reputação do personagem original quando fizerem sentido. Nível, experiência, atributos, raça, classe, poderes, dinheiro e equipamentos são reconstruídos pelas regras e pelo patamar da campanha atual; nenhum número de outro sistema é importado diretamente."
      },
      {
        "nome": "Memórias de Outra Campanha",
        "descricao": "Escolha três perícias relacionadas ao que fazia na campanha anterior. Receba três rerrolagens por sessão, compartilhadas entre essas perícias. Depois de rerrolar, mantenha o novo resultado."
      },
      {
        "nome": "Assinatura Remanescente",
        "descricao": "Escolha uma Habilidade, magia, técnica ou poder marcante do personagem original, dê a ela um nome e converta-a para um único formato publicado. Nome, aparência e narrativa são preservados, mas somente a mecânica do formato escolhido funciona."
      },
      {
        "nome": "Legado de Outra História",
        "descricao": "Receba um Legado adicional para representar uma arma, companheiro, bênção, mutação, técnica permanente ou artefato que atravessou a mudança. Use as regras de um Legado existente, embora seu nome e sua aparência possam ser diferentes."
      },
      {
        "nome": "Sobrevivente de Outra História",
        "descricao": "Uma vez por sessão, quando um dano deixaria você com 0 Vida ou menos, sua Vida torna-se 1. Isso não impede morte instantânea, destruição da alma ou uma consequência narrativa que não seja causada por dano."
      },
      {
        "nome": "Dupla Proveniência",
        "descricao": "Você pode cumprir os requisitos da classe exclusiva de sua Árvore atual ou de sua Árvore de origem equivalente. O acesso não concede nenhuma classe automaticamente e o limite normal de uma classe especial permanece; portanto, escolha no máximo uma das duas. Mudar a Árvore atual substitui apenas o vínculo atual e nunca acumula acesso a Árvores anteriormente visitadas."
      }
    ]
  },
  {
    "id": "amalgamo",
    "nome": "Amálgamo",
    "ajustes": "Vida: +5 | Mana: +1 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "É um ser vivo e pode ser tratado normalmente com Medicina."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Seu corpo reúne diferentes criaturas, corpos, almas ou essências, mas não acumula os pacotes raciais das partes que o formaram."
      },
      {
        "nome": "Anatomia Plural",
        "descricao": "Uma vez por cena, depois de falhar em Fortitude contra doença, veneno, fadiga ou alteração corporal, rerrole o teste e mantenha o novo resultado."
      },
      {
        "nome": "Alma Coral",
        "descricao": "Uma vez por sessão, depois de falhar em Vontade, rerrole o teste e mantenha o novo resultado. Isso não concede acesso automático às memórias completas dos seres constituintes."
      },
      {
        "nome": "Reconfiguração Visceral",
        "descricao": "Uma vez por cena, depois de sofrer dano, gaste uma reação e 4 Mana para receber Resistência 5 contra o tipo daquele dano até o começo do seu próximo turno, incluindo o dano que ativou a reação."
      },
      {
        "nome": "Assimilação Controlada",
        "descricao": "Comece conhecendo três Fragmentos. Um acontecimento narrativo autorizado pelo mestre pode desbloquear outro Fragmento da lista, até o máximo de seis conhecidos. Derrotar, tocar ou consumir uma criatura não concede automaticamente características, e poderes raciais completos nunca são copiados."
      },
      {
        "nome": "Surto de Convergência",
        "descricao": "Uma vez por sessão, gaste uma ação e 6 Mana para expressar um terceiro Fragmento conhecido durante três rodadas. Quando terminar, ele deixa de funcionar, todo benefício temporário ou excesso de Mana é removido e você recebe 1 ponto de Cansaço."
      }
    ]
  },
  {
    "id": "bruxa",
    "nome": "Bruxa",
    "ajustes": "Vida: +1 | Mana: +5 | Movimento: +0m",
    "tracos": [
      {
        "nome": "Fisiologia",
        "descricao": "Bruxa é uma natureza mágica adquirida, não uma profissão nem uma identidade de gênero."
      },
      {
        "nome": "Fisiologia",
        "descricao": "Permanece um ser vivo, salvo transformação narrativa posterior declarada pelo mestre."
      },
      {
        "nome": "Olhar Bruxo",
        "descricao": "Você percebe a presença e a direção aproximada de maldições, pactos, possessões e rituais ativos a até 15 m, mas não identifica automaticamente o efeito. Receba vantagem para resistir a maldições, possessões e tentativas de controlar sua alma."
      },
      {
        "nome": "Preço da Bruxaria",
        "descricao": "Uma vez por cena, quando não possuir Mana suficiente para uma característica racial, substitua até 3 pontos ausentes por 2 de Vida para cada ponto. Esse custo não pode ser reduzido, ignora Resistência, não pode deixar você com menos de 1 Vida e não paga custos de classes, itens ou Legados."
      },
      {
        "nome": "Maldição Tecida",
        "descricao": "Uma vez por cena, gaste uma ação e 5 Mana para amaldiçoar uma criatura a até 15 m. Faça Misticismo contra a Vontade dela. Se a criatura falhar, a Maldição dura três rodadas; se resistir, dura somente até o final do próximo turno dela. Apenas uma Maldição Tecida da mesma Bruxa pode afetar uma criatura; uma nova substitui a anterior."
      },
      {
        "nome": "Grande Sabá",
        "descricao": "Uma vez por sessão, gaste uma ação e 8 Mana para escolher uma Maldição conhecida e até Mod.Fluxo criaturas a até 15 m, com mínimo de uma. Faça um único teste de Misticismo e compare com a Vontade de cada alvo. A duração é determinada separadamente pelo resultado de cada criatura, seguindo Maldição Tecida."
      }
    ]
  },
  {
    "id": "entidade",
    "nome": "Entidade",
    "ajustes": "Vida: +0 | Mana: +0 | Movimento: +0m",
    "tracos": []
  }
];
