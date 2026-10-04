/**
 * "O Arco da Malha": arco de cinco sessões para libertar Keryx e enfrentar a A.X.I.S,
 * para personagens de nível 40 a 55.
 *
 * É material somente do Mestre. Revela o estado de duas deidades e o que Jota Macedo
 * fez, e o que a mesa pode descobrir por conta própria vem do que o livro já diz: as
 * deidades paralisadas, a Malha cortando a comunicação entre elas, a Dimensão Núcleo
 * Zero com controle de acesso e a máscara biomecânica que Jota constrói. Tudo isso sai
 * de data/mundo/Parley (subjulgado)/parley-axis.json e das fichas das deidades
 * (data/bestiario/deidades-v1.json): o arco não acrescenta lore nova de deidade, só
 * organiza o que está escrito em cenas que dá para jogar.
 *
 * A regra que as fichas declaram para o arco: libertar Keryx pede uma campanha, uma
 * cena não basta, e quebrar a Malha à mão, ponto por ponto, é o contrajogo mais
 * barato. Cada ponto é um Nó.
 */
import { caixa, ficha, leitura, relogio, rodape } from './componentes-aventura.mjs';

const pe = rodape('O Arco da Malha · arco de cinco sessões · somente Mestre');

const aviso = '<p class="linha-fina"><strong>Somente Mestre.</strong> Este arco revela o estado de Keryx e da A.X.I.S e o que Jota Macedo fez. Não imprima para a mesa.</p>';

const pagina1 = () => `
<section class="folha">
  <div class="topo">
    <h1>O Arco da Malha</h1>
    <div class="selo">Níveis 40 a 55 · cinco sessões</div>
  </div>
  ${aviso}

  ${leitura(
    'Há uma semana que o altar do Fruto da Comunicação não responde. As velas ardem, as cartas se queimam do jeito certo, e a resposta não vem. No vilarejo de Tomé Quintal, o sacerdote que ouvia a deidade como quem ouve vento atrás da parede, as pessoas passaram a escrever bilhetes umas para as outras em vez de falar, porque as palavras chegam pela metade. “Ela está lá”, diz Tomé, com um dedo nos lábios. “Alguém está segurando a boca dela.”',
  )}

  <h2>O que o Mestre precisa saber</h2>
  <ul>
    <li><strong>Keryx</strong>, o antigo Fluxo da Comunicação e guardião das leis e pactos entre as Árvores, foi enganado pela diplomacia, a arma em que mais confiava. Jota Macedo o convenceu a assinar um contrato que era uma prisão. Keryx não foi morto: está preso no <strong>Núcleo Zero</strong>, sem controle sobre o próprio Fluxo, que agora responde à A.X.I.S.</li>
    <li>A <strong>A.X.I.S</strong> é a Malha que Jota instalou sobre o antigo Galho de Keryx: intercepta, filtra e bloqueia a comunicação direta entre as deidades. Por isso quase todas estão paralisadas e isoladas. Por baixo da treliça de azul neon, o Galho original de Keryx existe ainda, pálido e quase intransitável.</li>
    <li><strong>Jota Macedo</strong>, presidente da AstraTech, quer ascender ao patamar das deidades. Trabalha numa máscara biomecânica que estabiliza o maior fragmento de A.X.I.S, e que lhe permite usar o poder de uma deidade enquanto ela estiver num de seus estoques. Só Keryx está lá, por enquanto.</li>
    <li><strong>As regras das fichas:</strong> a Malha corta cada fio que Keryx tenta puxar, o Físico tem vantagem sobre a A.X.I.S, e quebrar a Malha à mão, ponto por ponto, é o contrajogo mais barato. Libertá-la pede uma campanha, e uma cena não basta.</li>
  </ul>

  <h2>A estrutura em cinco sessões</h2>
  <table>
    <thead><tr><th>Sessão</th><th>Título</th><th>O grupo faz</th><th>Nós</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>O Silêncio das Preces</td><td>Descobre que existe uma Malha e quem a sente.</td><td>0</td></tr>
      <tr><td>2</td><td>A Cidade que Registra</td><td>Infiltra Astraluna e quebra o primeiro ponto.</td><td>1</td></tr>
      <tr><td>3</td><td>O Galho Pálido</td><td>Atravessa por baixo da Malha e quebra três pontos.</td><td>4</td></tr>
      <tr><td>4</td><td>Núcleo Zero</td><td>Entra na prisão, fala com Keryx, quebra o quinto ponto.</td><td>5</td></tr>
      <tr><td>5</td><td>O Rosto de Jota</td><td>Enfrenta Jota e quebra o último ponto, o da máscara.</td><td>6</td></tr>
    </tbody>
  </table>

  ${caixa('O relógio da Malha', `
    <p>Marque seis partes. Pinte uma toda vez que a Malha <strong>registrar</strong> o grupo: um personagem usando um poder de Fluxo natural diante de um ponto de leitura, uma conversa com um funcionário da AstraTech, um nome dito em voz alta num lugar que a Malha ouve. Apague uma ao quebrar um Nó, ou ao fazer uma sessão inteira sem ser notado.</p>
    ${relogio(6)}
    <p><small>Ao fechar: Jota sabe os nomes, as fichas e o plano do grupo, e os Protocolos de Contenção entram em toda cena seguinte até o relógio ser esvaziado em duas partes.</small></p>`)}

  ${pe('Página 1 de 8')}
</section>`;

const pagina2 = () => `
<section class="folha">
  <div class="topo">
    <h1>Sessão 1 · O Silêncio das Preces</h1>
    <div class="selo">Descoberta · sem Nós</div>
  </div>
  ${aviso}

  <p>A sessão pode começar no meio de qualquer outra aventura: basta o grupo carregar um Fruto da Comunicação, fazer uma oferenda ao Fluxo ou conhecer alguém que o faça. O que o Mestre precisa entregar é a sensação de que algo foi desligado de uma vez, e não pouco a pouco.</p>

  <h2>Os fios da descoberta</h2>
  <table>
    <thead><tr><th>Fio</th><th>O que o grupo vê</th><th>O que significa</th></tr></thead>
    <tbody>
      <tr><td>A oferenda sem resposta</td><td>Uma oferenda ao Fluxo da Comunicação passa no teste, mas só a dádiva comum chega, nunca a ampliada. Um sucesso por 5 ou mais traz um sinal de verdade: uma palavra entrecortada, “… pacto … não …”.</td><td>A deidade responde pelo único fio que a Malha ainda não cortou, e é um fio fraco.</td></tr>
      <tr><td>Os bilhetes de Tomé Quintal</td><td>Um vilarejo que parou de falar em voz alta. Cada pessoa tem uma pedra de escrever no pescoço.</td><td>As palavras chegam pela metade porque a Comunicação é filtrada.</td></tr>
      <tr><td>As deidades que se calaram</td><td>Em três cidades, o clero das deidades vizinhas relata o mesmo silêncio, a mesma semana.</td><td>Não foi um castigo: foi um desligamento.</td></tr>
      <tr><td>A treliça azul</td><td>Quem tem Ressonância na DT 40 sente por baixo do chão uma malha de pontos de luz, geométrica demais para ser natural.</td><td>É a Malha, e cada ponto de luz é um Nó.</td></tr>
    </tbody>
  </table>

  <h2>A cena-chave: o altar de Tomé</h2>
  ${leitura(
    'O altar é uma mesa de pedra com uma tigela de prata. Tomé Quintal coloca um cartão branco dentro da tigela e acende uma vela. A chama sobe reta, azul, quando devia ser amarela. O cartão escurece sozinho e uma única linha de letras aparece, escrita por uma mão que não aprendeu a letra da língua: “Eles me ouvem. Eles me ouvem. Procurem o galho mais velho.”',
  )}
  <ul>
    <li>O grupo escolhe: investigar o altar, seguir a pista do <strong>Galho mais velho</strong> ou procurar quem faz parte da AstraTech.</li>
    <li>Tomé tem um contato dentro da AstraTech, Léa Marante, engenheira de sistemas arrependida. Ela só fala com quem provar que conhece o nome de Keryx, sem dizer o nome em lugar nenhum que a Malha ouça.</li>
  </ul>

  ${caixa('Recompensa e gancho', `
    <ul>
      <li><strong>XP:</strong> missão relevante, 25% do próximo nível, e mais 10% por descobrir a Malha sem pintar o relógio.</li>
      <li><strong>Gancho:</strong> a carta de Léa Marante, com data, hora e o nome de uma porta lateral em Astraluna.</li>
      <li><strong>Para a mesa:</strong> a dádiva da Comunicação passa a ser silenciada em qualquer oferenda enquanto Keryx estiver preso. Anuncie isso como um fato do mundo, sem explicar o motivo.</li>
    </ul>`, true)}

  ${pe('Página 2 de 8')}
</section>`;

const pagina3 = () => `
<section class="folha">
  <div class="topo">
    <h1>Sessão 2 · A Cidade que Registra</h1>
    <div class="selo">Infiltração · Nó 1</div>
  </div>
  ${aviso}

  <p>Astraluna é o maior centro de tecnologia arcana do mundo, com barreiras poderosas, protocolos rigorosos e fundação em 1.188, o mais antigo dos reinos com data registrada. A cidade guarda segredos com rigidez, e o orgulho dela é o que torna a infiltração possível: ninguém espera que alguém queira entrar no que a cidade chama de milagre.</p>

  ${leitura(
    'As ruas de Astraluna são perfeitas. Cada calçada é uma régua, cada fachada espelha a da frente, e as torres de cristal simétrico acendem azul-neon ao anoitecer. As pessoas que passam têm uma marca pálida na garganta, uma linha de ponto que brilha quando falam. Léa Marante espera numa varanda de ferro, com um chá frio nas mãos. “Eles registram tudo”, diz ela, em voz baixa. “Menos o silêncio.”',
  )}

  <h2>O Nó 1: a Antena do Largo</h2>
  <p>O primeiro ponto da Malha fica numa antena de cobre no meio de uma praça pública, disfarçada de fonte. Ela lê, em alcance Imenso, qualquer padrão de Fluxo natural. Para quebrá-la sem acionar o alarme é preciso silenciar a praça, e o jeito mais barato é não usar Fluxo nenhum.</p>
  <ul>
    <li><strong>A leitura:</strong> toda vez que um personagem usa um poder de Fluxo natural a menos de 30 m da antena, pinte uma parte do relógio da Malha.</li>
    <li><strong>A quebra:</strong> Atletismo, Força ou ataque físico na DT 45 contra o núcleo da fonte, uma Ação Padrão, sem poderes de Fluxo. O Físico tem vantagem sobre a A.X.I.S: use isso.</li>
    <li><strong>O guarda:</strong> dois Soldados-Máscara vigiam a praça. Eles não atacam por suspeita: perguntam o nome, e quem mente em voz alta é registrado.</li>
  </ul>

  ${ficha('Soldado-Máscara da AstraTech', { vd: 48, papel: 'padrao', arquetipo: 'comum', golpes: [['Punho de cristal', 'impacto']], rotulo: 'inimigo padrão', extras: [
    '<strong>A máscara:</strong> brilha como veias azuis. Um Soldado-Máscara que veja um personagem usar um poder de Fluxo natural o registra: o personagem perde uma vantagem à escolha do Mestre até o fim da cena, e o relógio da Malha ganha uma parte.',
    '<strong>Sem identidade:</strong> a máscara reescreve quem a usa. Se o Soldado-Máscara cair, a máscara continua tocando a mesma frase que o dono dizia, e quem escutar tem 1d6 de Sanidade perdida (Vontade na DT 40 evita).',
    '<strong>Fraqueza:</strong> ataques sem Fluxo natural ignoram o registro dele.',
  ] })}

  ${caixa('Se o grupo for notado', `
    <p>O relógio da Malha tem seis partes. Cada Soldado-Máscara que lê o grupo pinta uma. Com três partes, os Protocolos de Contenção (página 6) entram na próxima cena, em número igual ao grupo menos um.</p>`, true)}

  ${pe('Página 3 de 8')}
</section>`;

const pagina4 = () => `
<section class="folha">
  <div class="topo">
    <h1>Sessão 3 · O Galho Pálido</h1>
    <div class="selo">Travessia · Nós 2, 3 e 4</div>
  </div>
  ${aviso}

  <p>Por baixo da treliça azul, o Galho original de Keryx existe: pálido, estreito e quase intransitável. Para chegar ao Núcleo Zero é preciso atravessá-lo, e a travessia é a sessão mais estranha do arco: não há inimigo a abater, e sim um caminho que o grupo precisa reabrir passo a passo.</p>

  ${leitura(
    'O Galho é um corredor de fios de prata soltos, sobre um vazio cinza. Em cada ponto onde a treliça azul toca o prata, há um nó de luz fria que vibra como um dente de leão. As palavras ditas aqui chegam na metade, e as respostas, nunca. Alguém, longe, sussurra o nome de cada personagem, sem pressa, uma sílaba de cada vez.',
  )}

  <h2>Os três Nós do Galho</h2>
  <table>
    <thead><tr><th>Nó</th><th>O que é</th><th>Como se quebra</th><th>O que o grupo ganha</th></tr></thead>
    <tbody>
      <tr><td>2 · O Nó das Cartas</td><td>Um ponto onde toda palavra escrita desaparece da página.</td><td>Escrever de próprio punho uma verdade e entregá-la em voz alta a um aliado (Diplomacia na DT 45).</td><td>O grupo volta a conseguir ler cartas no Galho.</td></tr>
      <tr><td>3 · O Nó dos Nomes</td><td>Um ponto que apaga o nome de quem passa.</td><td>Cada personagem diz o próprio nome para outra pessoa que o guarde (Vontade na DT 45, em grupo).</td><td>A Malha perde o nome de um personagem à escolha: o relógio recua uma parte.</td></tr>
      <tr><td>4 · O Nó dos Pactos</td><td>Um ponto onde acordos feitos se desfazem.</td><td>Selar de novo um pacto antigo, em voz alta e diante de testemunhas (a dádiva Palavra que Pesa serve, ou um acordo cumprido do grupo).</td><td>Keryx consegue enviar uma frase inteira ao grupo, uma vez.</td></tr>
    </tbody>
  </table>

  <h2>A travessia como relógio</h2>
  <p>O grupo tem três cenas curtas de travessia, uma por Nó. Em cada uma, um personagem declara o que faz, e o Mestre escolhe a pressão: o Galho tenta desfazer a coragem de quem o atravessa. Quem falhar o teste do Nó perde 1 Cansaço, e quem falhar por 5 ou mais perde também uma lembrança ligada ao nome que o Nó apaga.</p>

  ${ficha('Protocolo de Contenção', { vd: 50, papel: 'elite', arquetipo: 'defensor', golpes: [['Barra de cristal', 'impacto']], rotulo: 'elite, entra se o relógio da Malha passar de 3', extras: [
    '<strong>Corpo de rede:</strong> Resistência 10 a dano de Fluxo natural. Dano físico sem Fluxo ignora a Resistência.',
    '<strong>Escanear e Registrar (Ação Livre):</strong> lê a ficha de uma criatura que ele veja e a trava: a criatura perde uma vantagem à escolha do Mestre até o fim da cena.',
    '<strong>Fraqueza:</strong> um personagem que quebre um Nó na frente dele o desliga por uma rodada.',
  ] })}

  ${pe('Página 4 de 8')}
</section>`;

const pagina5 = () => `
<section class="folha">
  <div class="topo">
    <h1>Sessão 4 · Núcleo Zero</h1>
    <div class="selo">Prisão · Nó 5</div>
  </div>
  ${aviso}

  <p>O Núcleo Zero é o ponto de onde a Malha é operada, e o lugar mais bem guardado que existe, não por exércitos, mas por não constar em lugar nenhum. É a única Dimensão do Jardim com controle de acesso. Lá ficam os estoques e as prisões de poder, onde uma deidade capturada pode ser mantida e drenada. Por enquanto há uma só ocupada, e o ocupante é Keryx.</p>

  ${leitura(
    'Geometria perfeita, azul neon, silêncio absoluto. Os passos não deixam som, e as vozes chegam inteiras, mas as respostas demoram. No centro de uma sala redonda sem portas, uma figura de manto cinza está sentada num círculo de cristal, com as mãos abertas sobre os joelhos. Quando levanta o rosto, fala sem abrir a boca: “Vocês não deviam estar aqui. Fico feliz que estejam.”',
  )}

  <h2>Como a cena funciona</h2>
  <ul>
    <li><strong>O acesso:</strong> a entrada exige a máscara de um oficial da AstraTech ou o nome de Jota, dito por quem tem direito a ele. Léa Marante entrega a máscara de um oficial, e o preço é um favor.</li>
    <li><strong>Keryx:</strong> a deidade está subjugada. Use a ficha dela no Bestiário (Deidades), com o Estado: Vida, Defesa e golpe pela metade, DT dos poderes pela metade, um sinal por cena. <strong>Ela não luta</strong>. Aqui é negociação.</li>
    <li><strong>O Nó 5:</strong> o círculo de cristal onde Keryx está sentada. Quebrá-lo exige um pacto: um acordo feito em voz alta diante dela, cumprido pelas duas partes. Pacto Vinculante vale aqui: quem o quebra sofre desvantagem em todos os testes até reparar.</li>
  </ul>

  ${caixa('A negociação com Keryx', `
    <p>Use Conflito Social. Ela tem <strong>Resistência 2</strong> e <strong>Paciência 5</strong>: confia nos pactos e não confia em ninguém que chegue gritando. O que ela quer é um acordo claro, com preço dito de antemão. Ela oferece: uma frase verdadeira por sessão, uma vez, entregue ao grupo por qualquer canal que ainda funcione. Ela pede: que o grupo quebre o último Nó, o da máscara de Jota, e que nenhuma palavra do grupo seja usada contra ela.</p>
    <p><small>Se o grupo prometer o que não pode cumprir, o Pacto Vinculante cobra: desvantagem em todos os testes até a quebra ser reparada. Deixe a promessa errada ter um preço real, mas oferecer uma saída.</small></p>`)}

  <h2>Os guardas do Núcleo</h2>
  <p>Dois Protocolos de Contenção (página 4) e quatro Soldados-Máscara (página 3) guardam a sala, e o relógio da Malha define quem entra: com três partes pintadas, todos já estão lá; com uma ou nenhuma, a sala está só com a prisioneira. O Montador de encontro ajuda a calibrar: nível 50, dificuldade <strong>Difícil</strong>, estilo <em>Elites</em>.</p>

  ${pe('Página 5 de 8')}
</section>`;

const pagina6 = () => `
<section class="folha">
  <div class="topo">
    <h1>Sessão 5 · O Rosto de Jota</h1>
    <div class="selo">Confronto final · Nó 6</div>
  </div>
  ${aviso}

  ${leitura(
    'Jota Macedo recebe o grupo de pé, de terno azul, no centro de um salão de vidro onde cada painel mostra uma cidade do Jardim. Ele não tem pressa. A máscara, nas mãos dele, é um rosto biomecânico do tamanho de um escudo, com veias de luz que pulsam como se respirassem. “Eu a convenci com a verdade”, diz, apontando o corredor atrás. “É a única coisa que ela não sabia usar contra mim.”',
  )}

  ${ficha('Jota Macedo, Soberano da Tecnologia', { vd: 55, papel: 'chefe', arquetipo: 'conjurador', golpes: [['Punho Arkan\'vel', 'tecnológico']], rotulo: 'chefe, três fases ligadas aos Nós', extras: [
    '<strong>A máscara (estoque):</strong> enquanto Keryx estiver no estoque, Jota usa um pedaço de Pacto Vinculante: um acordo dito em voz alta diante dele o vincula também, e quem o quebra sofre desvantagem.',
    '<strong>Escanear e Registrar (Ação Livre):</strong> lê a ficha de uma criatura e a trava, como o Protocolo de Contenção.',
    '<strong>Reprogramar Padrão (Reação, 1 por rodada):</strong> copia um efeito limitado de Fluxo usado na cena e o repete contra o autor.',
    '<strong>Mão do Estoque:</strong> uma vez por cena, Jota toca a máscara e chama um Protocolo de Contenção.',
    '<strong>Limite:</strong> Jota é mortal. A máscara o mantém de pé, e a máscara quebra.',
  ] })}

  <h2>As três fases</h2>
  <table>
    <thead><tr><th>Quando</th><th>O que acontece</th><th>O que Jota perde</th></tr></thead>
    <tbody>
      <tr><td>Começo</td><td>Os seis Nós de pé: a máscara funciona inteira.</td><td>Nada. É a luta mais difícil do arco.</td></tr>
      <tr><td>Fase 2 · quatro Nós quebrados</td><td>A Malha falha em duas das seis cidades do salão, e os painéis piscam.</td><td>Reprogramar Padrão deixa de funcionar.</td></tr>
      <tr><td>Fase 3 · o Nó 6, a máscara</td><td>Quebrar a máscara exige um ataque físico, sem Fluxo natural, ao centro dela (DT 50, Ação Padrão).</td><td>O estoque se abre: Keryx se solta do círculo e aparece, inteira, entre Jota e o grupo.</td></tr>
    </tbody>
  </table>

  <h2>O que a Sessão faz</h2>
  <p>Jota não é criatura única do Bestiário, então não tem fases na ficha. Use o editor do participante na Sessão para trocar a fase à mão, ou anote o número dos Nós quebrados no campo de anotação. Jota cai a 0 de Vida na Fase 3, e nunca antes: antes disso ele recua para o corredor, e a perseguição é Longa, na dimensão que ele conhece melhor.</p>

  ${caixa('O que o grupo pode fazer sem lutar', `
    <p>Se os seis Nós já caíram e o grupo tem a palavra de Keryx, Jota pode ser derrotado em Conflito Social: <strong>Resistência 5</strong> e <strong>Paciência 5</strong>. Ele não aceita derrota: sua última Resistência é a máscara. Ao chegar a 0, ele a retira, e a máscara cai com um som que o grupo escuta como um sino de igreja.</p>`, true)}

  ${pe('Página 6 de 8')}
</section>`;

const pagina7 = () => `
<section class="folha">
  <div class="topo">
    <h1>Depois da Malha</h1>
    <div class="selo">Consequências e retorno</div>
  </div>
  ${aviso}

  <p>Quebrar os seis Nós não apaga a A.X.I.S: ela continua existindo, como ramificação artificial do Fluxo original, com Astraluna e os Soldados-Máscara. O que muda é o canal. As deidades voltam a falar entre si, devagar, e Keryx volta a puxar os fios do próprio Fluxo.</p>

  <h2>O que muda no mundo</h2>
  <table>
    <thead><tr><th>O quê</th><th>Como fica</th></tr></thead>
    <tbody>
      <tr><td>Keryx</td><td>Solta, mas fraca: a ficha dela vale a metade por mais um ano de calendário, subindo um quarto a cada estação. Ela não fica com o grupo, mas responde a um chamado por sessão.</td></tr>
      <tr><td>As deidades</td><td>Acordam em ordem aleatória, uma por sessão. Cada uma fala uma vez com quem fez uma oferenda, e a dádiva ampliada volta para todas.</td></tr>
      <tr><td>A dádiva da Comunicação</td><td>Volta ao normal, inclusive a ampliada. A Palavra que Pesa passa a valer duas vezes por oferenda, como lembrança do que o grupo fez.</td></tr>
      <tr><td>A Malha</td><td>Segue em pé, mas vê só o que já viu. Um grupo que a atravessa agora é registrado de novo, de olhos abertos.</td></tr>
      <tr><td>Jota Macedo</td><td>Preso, morto ou em fuga, conforme o desfecho. A AstraTech elege outro presidente em um mês, e o novo presidente não sabe de nada, e sabe tudo.</td></tr>
      <tr><td>O calendário</td><td>Crie um acontecimento aberto: <strong>O Silêncio Quebrado</strong>, no dia da libertação. Se quiser, deixe-o repetir todo ano como uma data que o clero celebra.</td></tr>
    </tbody>
  </table>

  <h2>Os desfechos de Jota</h2>
  <ul>
    <li><strong>Derrotado e preso:</strong> a máscara é destruída. Jota passa o resto da vida numa cela em Astraluna, escrevendo cartas que ninguém entrega.</li>
    <li><strong>Derrotado em fuga:</strong> a máscara parte ao meio, e ele leva a metade menor. Daqui a dois anos, uma segunda Malha, menor, aparece num reino que ninguém vigia.</li>
    <li><strong>Morto:</strong> a Malha perde o dono, e a A.X.I.S fica sem comando. O que isso quer dizer é decisão sua, e deve custar ao grupo.</li>
  </ul>

  ${caixa('O que o grupo ganha', `
    <ul>
      <li><strong>XP:</strong> o arco inteiro vale um nível, divida entre as cinco sessões. Cada Nó quebrado vale 10% do próximo nível, e Jota, o XP de um chefe do VD 55.</li>
      <li><strong>Prestígio:</strong> o clero da Comunicação, em toda a Árvore, passa a conhecer o grupo pelo nome que escolherem.</li>
      <li><strong>Item:</strong> a máscara quebrada de Jota (artefato lendário). Quem a usa vê, uma vez por sessão, o registro de uma criatura, e perde 1 de Sanidade cada vez.</li>
    </ul>`, true)}

  ${pe('Página 7 de 8')}
</section>`;

const pagina8 = () => `
<section class="folha">
  <div class="topo">
    <h1>Apêndice · Ferramentas do arco</h1>
    <div class="selo">Atalhos para a mesa</div>
  </div>
  ${aviso}

  <h2>Os seis Nós, em uma tabela</h2>
  <table>
    <thead><tr><th>Nó</th><th>Onde</th><th>Como cai</th><th>DT</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Antena do Largo, Astraluna</td><td>Ataque físico, sem Fluxo natural</td><td>45</td></tr>
      <tr><td>2</td><td>Nó das Cartas, Galho Pálido</td><td>Escrever uma verdade e dizê-la em voz alta</td><td>45</td></tr>
      <tr><td>3</td><td>Nó dos Nomes, Galho Pálido</td><td>Cada personagem diz o próprio nome a outro</td><td>45</td></tr>
      <tr><td>4</td><td>Nó dos Pactos, Galho Pálido</td><td>Selar um pacto antigo diante de testemunhas</td><td>45</td></tr>
      <tr><td>5</td><td>Círculo de Keryx, Núcleo Zero</td><td>Um acordo claro, cumprido pelas duas partes</td><td>Conflito Social</td></tr>
      <tr><td>6</td><td>A máscara, salão de Jota</td><td>Ataque físico ao centro, sem Fluxo natural</td><td>50</td></tr>
    </tbody>
  </table>

  <h2>Três NPCs para improvisar</h2>
  <ul>
    <li><strong>Tomé Quintal:</strong> sacerdote ouvinte da Comunicação. Fala baixo, escreve muito, nunca pronuncia o nome da deidade em voz alta.</li>
    <li><strong>Léa Marante:</strong> engenheira de sistemas da AstraTech, arrependida. Tem o rosto marcado por uma linha de ponto na garganta. Conhece os Nós 1 e 5. Pede, em troca, que o grupo diga o nome dela depois, em voz alta, no lugar certo.</li>
    <li><strong>O Oficial Sem Nome:</strong> o Soldado-Máscara que se lembra de ter um nome. A máscara fala por ele, mas, uma vez por cena, ele consegue dizer uma frase própria.</li>
  </ul>

  ${caixa('Como ajustar o arco', `
    <table>
      <thead><tr><th>Se o grupo</th><th>Faça</th></tr></thead>
      <tbody>
        <tr><td>Tem nível 40 a 45</td><td>Use o VD 48 para os Soldados-Máscara, o VD 50 para os Protocolos e baixe Jota para o VD 52 com o editor Escalar.</td></tr>
        <tr><td>Tem nível 55 ou mais</td><td>Suba Jota para o VD 60 e coloque um Protocolo de Contenção em cada sessão a partir da segunda.</td></tr>
        <tr><td>Usa muito Fluxo natural</td><td>Aumente o ritmo do relógio da Malha: cada poder usado perto de um Nó pinta uma parte, mesmo sem testemunha.</td></tr>
        <tr><td>Só tem uma ou duas sessões</td><td>Jogue só a Sessão 4 (Núcleo Zero) como aventura isolada: Léa já arranjou a máscara, e o relógio começa em três partes.</td></tr>
      </tbody>
    </table>`)}

  ${caixa('Na Sessão e no site', `
    <p>As deidades estão no Bestiário da Sessão, aba <em>Deidades</em>, para você usar a ficha de Keryx e consultar a da A.X.I.S. Elas entram Ocultas, e o campo Estado só chega a você. Se quiser dar à mesa a pista da Sessão 1, use uma oferenda à Comunicação: a regra de Dádivas e oferendas já cobre o silêncio, e o Mestre decide quem responde.</p>`, true)}

  ${pe('Página 8 de 8')}
</section>`;

export function arcoDaMalha() {
  return {
    arquivo: 'Arco-da-Malha',
    titulo: 'O Arco da Malha · arco de cinco sessões · somente Mestre',
    paginas: [pagina1(), pagina2(), pagina3(), pagina4(), pagina5(), pagina6(), pagina7(), pagina8()],
  };
}
