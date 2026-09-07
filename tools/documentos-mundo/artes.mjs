/**
 * Plano de arte do livro de regras.
 *
 * O livro é diagramado antes de existir ilustração, então cada espaço já nasce
 * medido e com o pedido escrito dentro dele. Quando a arte chegar, o que muda
 * é só a troca do bloco reservado pela imagem: a paginação em volta continua a
 * mesma, porque a altura reservada aqui é a altura final.
 *
 * Tamanhos disponíveis:
 *   pagina  página inteira, sem texto por cima
 *   meia    largura total da mancha, 104mm de altura
 *   coluna  dentro de uma coluna, 62mm de altura
 *   faixa   largura total da mancha, 46mm, para abrir um assunto
 *
 * Os códigos (ART-01, ART-02...) são atribuídos na ordem em que os espaços
 * aparecem no livro, pelo gerador, e reaparecem no Mapa das Artes no fim do
 * volume. Não escreva código à mão aqui.
 */

export const ARTE_CAPA = {
  tamanho: 'capa',
  brief: 'Cena vertical ocupando a metade de baixo da capa. Um grupo pequeno visto de costas, parado na beira de um galho largo o bastante para ser estrada. Ao fundo, muito maior que eles, outra Árvore atravessa o Vazio. A luz vem de trás das figuras, então elas chegam quase como silhueta. O terço superior fica limpo de detalhe, é onde o título assenta.',
};

export const ARTE_ROSTO = {
  tamanho: 'faixa',
  brief: 'Ornamento horizontal em traço fino, sem cena. Dez galhos saindo de um tronco central, cada um terminando num símbolo diferente. Serve como assinatura gráfica do livro e reaparece reduzido nas aberturas de capítulo.',
};

/** Uma placa por capítulo, na página escura de abertura. */
export const ARTES_CAPITULO = {
  'primeiros-passos': {
    tamanho: 'pagina',
    brief: 'A mesa vista de cima, à altura de quem senta. Fichas espalhadas, uma caneca esquecida, dados parados sobre papel. Uma das mãos ainda está no ar, no gesto de quem acabou de soltar o d20. Nada de fantasia na imagem: este capítulo fala das pessoas que jogam, e a fantasia começa no capítulo seguinte.',
  },
  personagem: {
    tamanho: 'pagina',
    brief: 'A mesma pessoa três vezes, lado a lado, em três momentos da vida dela. Na primeira, roupa comum e nenhuma marca. Na segunda, cicatriz e equipamento de quem já trabalhou. Na terceira, algo que não é mais inteiramente humano. Mesmo rosto nas três, mesma postura, e a diferença toda no que a vida deixou.',
  },
  combate: {
    tamanho: 'pagina',
    brief: 'Um instante travado no meio de uma troca de golpes, em plano fechado. Duas figuras se cruzando, poeira e sangue no ar, e um terceiro personagem ao fundo já caído, sendo puxado por um quarto. O foco fica na decisão de quem puxa o ferido.',
  },
  magia: {
    tamanho: 'pagina',
    brief: 'Conjurador de perfil, com uma Marca de Círculo acesa subindo pela pele do braço até o pescoço. A luz da Marca é a única fonte de luz da cena, e o rosto mostra o preço em vez do triunfo. Ao redor, o ar carrega desenho geométrico fino, quase invisível.',
  },
  itens: {
    tamanho: 'pagina',
    brief: 'Bancada de oficina vista de cima, ocupada de ponta a ponta. Uma lâmina desmontada em três peças, matéria-prima em caixas separadas, ferramenta pesada, anotação rabiscada à mão e um selo mágico ainda apagado. Nenhuma pessoa na imagem, só o trabalho parado no meio.',
  },
  veiculos: {
    tamanho: 'pagina',
    brief: 'Perseguição em estrada alta, vista de trás do veículo da frente. O que persegue vem duas faixas atrás, meio encoberto pela poeira. Uma das pessoas do veículo da frente está virada para trás, apoiada na borda, resolvendo um problema mecânico enquanto o outro conduz.',
  },
  mundo: {
    tamanho: 'pagina',
    brief: 'Praça de mercado no fim do dia, movimento de gente que trabalha. No primeiro plano, uma balança e moedas de três metais diferentes trocando de mão. Ao fundo, sem destaque, a fachada de uma agência bancária com dois guardas parados. A cena mostra dinheiro circulando, e a riqueza aparece apenas no canto.',
  },
  mestre: {
    tamanho: 'pagina',
    brief: 'A cadeira de quem conduz a mesa, vista do lado de dentro do escudo do mestre. Anotação espalhada, um mapa marcado a lápis, iniciativa numa lista e dois dados escondidos atrás do papelão. A mesa dos jogadores aparece desfocada do outro lado, longe.',
  },
};

/** Espaços de arte dentro dos capítulos. Só os assuntos que ganham imagem
 *  estão aqui: um tópico sem entrada nesta tabela é diagramado só com texto. */
export const ARTES_TOPICO = {
  'como-jogar': {
    tamanho: 'coluna',
    brief: 'Um d20 sozinho, grande, em três quartos, mostrando o 20 na face de cima. Traço de gravura antiga, sem brilho e sem efeito. É o único objeto que o livro inteiro pede que o leitor reconheça de imediato.',
  },
  'criacao-personagem': {
    tamanho: 'meia',
    brief: 'Ficha em branco sobre a mesa, cercada pelas coisas que serão escolhidas nos sete passos: um punhado de dados, dois esboços de rosto, uma lista de perícias riscada e refeita, uma bolsa com vinte moedas contadas. A ficha da imagem fica ilegível de propósito, para não competir com a ficha real.',
  },
  'sistema-base': {
    tamanho: 'coluna',
    brief: 'Diagrama ilustrado, sem realismo: a mão soltando o dado de um lado, a dificuldade do outro, e entre os dois a soma que decide. Serve para fixar a fórmula que o resto do livro usa sem repetir.',
  },
  pericias: {
    tamanho: 'coluna',
    brief: 'Sete mãos em fila, do aprendiz ao renomado, cada uma fazendo o mesmo gesto com resultado diferente. A primeira treme, a última está firme e marcada de trabalho.',
  },
  combate: {
    tamanho: 'meia',
    brief: 'Um turno inteiro desenhado como sequência de três quadros: a corrida até a posição, o golpe, e a reação de quem foi atingido. Os três quadros dividem a mesma linha do horizonte, para o leitor ler tempo em vez de ler três cenas.',
  },
  ferimentos: {
    tamanho: 'coluna',
    brief: 'Personagem caído a zero, de bruços, com um companheiro ajoelhado ao lado contando as rodadas nos dedos. A imagem tem que passar urgência sem passar morte, porque a regra dá tempo ao grupo.',
  },
  condicoes: {
    tamanho: 'meia',
    brief: 'Retrato duplo do mesmo personagem: à esquerda, inteiro; à direita, depois de uma crise de sanidade, com a mesma roupa e o olhar em outro lugar. Nada de monstro na imagem. O que assustou fica fora do quadro.',
  },
  descanso: {
    tamanho: 'coluna',
    brief: 'Acampamento pequeno na hora morta da madrugada, fogo já baixo. Uma pessoa de vigília olhando para fora do círculo de luz, e o resto do grupo dormindo em posições desconfortáveis.',
  },
  'magia-fluxo': {
    tamanho: 'meia',
    brief: 'Os onze Fluxos como onze correntes de luz saindo de um ponto só e tomando caminhos distintos. Cada corrente tem textura própria, e a Tecnologia é traçada com linha reta enquanto as outras são orgânicas.',
  },
  'marcas-cicatrizes': {
    tamanho: 'coluna',
    brief: 'Costas nuas cobertas por Marcas de Círculo, do quinto ao nono, cada uma com desenho e idade diferentes. As mais antigas já cicatrizaram na pele, as recentes ainda estão vivas.',
  },
  classes: {
    tamanho: 'meia',
    brief: 'Fila de silhuetas de corpo inteiro, ombro a ombro, com equipamento e postura suficientes para identificar o ofício de cada uma sem legenda. Rostos em sombra, para que qualquer jogador consiga se colocar ali.',
  },
  racas: {
    tamanho: 'meia',
    brief: 'Grupo reunido num mesmo enquadramento, mostrando diferença de altura, proporção e pele entre os povos. Todos vestidos para o mesmo clima e a mesma estrada, porque o que os separa é o corpo, e o que os junta é o trabalho.',
  },
  equipamentos: {
    tamanho: 'coluna',
    brief: 'Equipamento de um personagem disposto no chão em ordem, como inventário aberto: armadura principal, malha por baixo, escudo, arma e o peso que sobra para carregar comida.',
  },
  crafting: {
    tamanho: 'coluna',
    brief: 'Artesão no fim de um dia de seis horas, avaliando a peça contra a luz. A bancada atrás está bagunçada de tentativa, e há uma peça quebrada de lado, do projeto que falhou.',
  },
  materiais: {
    tamanho: 'faixa',
    brief: 'Os seis estoques lado a lado em recipientes distintos: químico, ritualístico, veicular, sucata, mantimento e matéria-prima. Vista de cima, em faixa horizontal, cada estoque ocupando o mesmo espaço.',
  },
  'veiculos-cenas': {
    tamanho: 'meia',
    brief: 'Colisão em pleno movimento, dois veículos se tocando de lado numa curva, e a avaria visível no exato ponto do contato. A tripulação aparece em ação diferente da do condutor, cada um resolvendo o seu.',
  },
  bestiario: {
    tamanho: 'meia',
    brief: 'Criatura grande deitada em repouso, com uma pessoa pequena ao lado apoiada nela sem medo. A relação entre as duas é de trabalho, e o tamanho da criatura deve deixar claro o que aconteceria se a relação mudasse.',
  },
  economia: {
    tamanho: 'coluna',
    brief: 'As quatro moedas em close, sobre madeira: Lunaris gastas e riscadas de uso, Solares limpas, um Fragmento de Estrela que ilumina o que está em volta, e um Crédito Sombrio que engole a luz.',
  },
  bases: {
    tamanho: 'meia',
    brief: 'Corte lateral de uma base, mostrando os cômodos ocupados e os espaços ainda vazios esperando instalação. Uma planta habitada, com sinal de gente morando, longe da limpeza de um projeto de arquitetura.',
  },
  'mundo-faccoes': {
    tamanho: 'coluna',
    brief: 'Três emissários de organizações diferentes na mesma antessala, esperando ser atendidos, evitando se olhar. O símbolo de cada facção aparece na roupa, discreto.',
  },
  mestre: {
    tamanho: 'coluna',
    brief: 'Mão do mestre segurando um dado ainda fechado na palma, com a outra apoiada numa anotação. O gesto é de quem já decidiu a dificuldade e agora só vai mostrar o resultado.',
  },
};
