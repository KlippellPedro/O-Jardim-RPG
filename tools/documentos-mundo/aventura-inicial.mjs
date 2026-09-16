/**
 * "Dois Passageiros": aventura pronta de uma sessão, para personagens de
 * nível 1.
 *
 * Ela existe para ser a primeira mesa de quem nunca mestrou O Jardim, então
 * usa só o que o livro básico já entrega e amarra as ferramentas novas do Guia
 * do Mestre: relógio de pressão, conflito social, perseguição a pé e a tabela
 * de eventos de estrada. O prop Avulso-Aviso-Caravana é o material de apoio, e
 * o caso nasce de uma linha que já está escrita nele: o Trecho de Espelhos está
 * suspenso porque dois passageiros embarcaram, dois desembarcaram, e a Caravana
 * está conferindo se são os mesmos dois.
 *
 * Nada aqui vira lore canônica. É um caso pequeno e local, que cabe em
 * qualquer campanha que tenha uma estrada.
 */

const leitura = (...paragrafos) => `<div class="leitura">${paragrafos.map((p) => `<p>${p}</p>`).join('')}</div>`;
const relogio = (n) => `<div class="relogio">${'<u></u>'.repeat(n)}</div>`;

const caixa = (rotulo, dentro, clara = false) => `
  <div class="caixa${clara ? ' clara' : ''}">
    <div class="rotulo">${rotulo}</div>
    <div class="dentro">${dentro}</div>
  </div>`;

const criatura = (nome, numeros, linhas) => `
  <div class="criatura">
    <h4>${nome}</h4>
    <div class="numeros">${numeros}</div>
    ${linhas.map((linha) => `<p>${linha}</p>`).join('')}
  </div>`;

const pe = (texto) => `<div class="pe"><span>Dois Passageiros · aventura de uma sessão</span><span>${texto}</span></div>`;

const paginaUm = () => `
<section class="folha">
  <div class="topo">
    <h1>Dois Passageiros</h1>
    <div class="selo">Nível 1 · uma sessão</div>
  </div>
  <p class="linha-fina">Três a quatro horas · três a cinco jogadores · estrada baixa entre Salém e Emberhold · leve impresso o prop Aviso de rota da Caravana</p>

  ${leitura(
    'O posto da Caravana do Limiar fica no fim da rua, entre uma ferraria e uma casa de chá fechada. O aviso de rota está pregado do lado de fora, com a tinta ainda fresca, e dois trechos aparecem suspensos. Debaixo do aviso, uma mulher de casaco de viagem lê a mesma linha pela quarta vez, segurando a alça da bolsa com força demais.',
  )}

  <h2>O que está acontecendo</h2>
  <p>Ilda Vaires é mensageira, tem a pele queimada de estrada e conta os passos quando fica nervosa. Viajava pelo Trecho de Espelhos quando a Caravana suspendeu a rota: dois passageiros embarcaram, dois desembarcaram, e ainda ninguém sabe se eram os mesmos dois. Alguma coisa desembarcou junto com Ilda. É uma cópia dela, sem nome próprio, que fica de pé sozinha quando alguém que a conheça diz aquele nome em voz alta, e vem pela estrada baixa, a meio dia de distância.</p>
  <p>Ilda não sabe disso. Sabe que dorme mal, que perdeu a passagem e que precisa entregar uma carta em Emberhold antes do fim da semana.</p>

  <h2>Resumo em quatro linhas</h2>
  <ul>
    <li><strong>Cena 1:</strong> o posto em Salém, o aviso e uma mulher que precisa de companhia.</li>
    <li><strong>Cena 2:</strong> a estrada, um evento e três sucateiros que testam o grupo.</li>
    <li><strong>Cena 3:</strong> a Casa de Meia Légua, onde outra Ilda já espera perto do fogo.</li>
    <li><strong>Cena 4:</strong> o relógio fecha, a cópia se decide, e o grupo escolhe como termina.</li>
  </ul>

  ${caixa('O relógio da cópia', `
    <p>Marque seis partes. Pinte uma sempre que alguém disser o nome de Ilda em voz alta na presença da cópia, e duas se quem disser for a própria Ilda.</p>
    ${relogio(6)}
    <p><small>Ao fechar: a cópia fica de pé sozinha, e a Ilda verdadeira perde o nome. Ninguém na sala consegue mais lembrar como chamá-la, inclusive ela.</small></p>`)}

  <h2>Cena 1 · O posto em Salém</h2>
  <p>Entregue o aviso de rota. Deixe o grupo ler antes de qualquer teste. Ilda se apresenta assim que alguém comentar os trechos suspensos.</p>
  <ul>
    <li><strong>A oferta:</strong> 20 Lunaris por pessoa, metade na saída, e lugar na carroça de um comerciante. A passagem regular custaria 340, e ela abre a bolsa quase vazia para provar.</li>
    <li><strong>Negociar</strong> é Diplomacia na DT Padrão. Sucesso sobe para 30, e ela paga com uma peça de equipamento comum que carrega.</li>
    <li><strong>Os condutores comentam:</strong> o Interstício demora mais do que a tabela diz, do trecho de Espelhos ninguém quer falar, e a Casa de Meia Légua está sem o cachorro velho, que fugiu anteontem.</li>
  </ul>
  <p><small>Na voz de Ilda: “Eu pago o que tenho. Só não me deixem dormir sozinha na estrada.” Se a mesa demorar a engatar, peça a um jogador que diga por que o personagem dele precisa desses 20 Lunaris hoje.</small></p>

  ${pe('Página 1 de 4')}
</section>`;

const paginaDois = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 2 · A estrada baixa</h1>
    <div class="selo">Viagem e primeiro combate</div>
  </div>

  <p>Meio dia de caminhada até a Casa de Meia Légua, entre pasto seco e marcos de pedra. Role uma vez na tabela de eventos de <strong>Estrada e viagem</strong> e narre o resultado antes do combate. A cena boa aqui é a conversa em movimento, com Ilda sempre um pouco à frente, com pressa de chegar e medo do que vai encontrar.</p>

  ${caixa('O que Ilda conta enquanto anda', `
    <ul>
      <li>Embarcou sozinha e desembarcou sozinha. Diz isso duas vezes, e na segunda para de andar por um instante.</li>
      <li>Dorme mal desde então. Sonha que está sentada do outro lado da fogueira, olhando para si mesma, e que a outra sorri primeiro.</li>
      <li>A carta é lacrada, e ela prefere entregar em mão. Se alguém perguntar o que está escrito, ela admite que não sabe, e que isso a incomoda mais do que devia.</li>
      <li>Se alguém perguntar o nome dela, ela diz. Ainda não custa nada, porque a cópia está longe.</li>
    </ul>`)}

  <h2>Os sucateiros</h2>
  <p>A uma hora do posto, três sucateiros fecham a estrada com um tronco. Vieram pela carroça, e briga custa caro para eles também: se o grupo mostrar que vai sair sangue, aceitam 15 Lunaris e somem no mato.</p>
  ${leitura(
    'O tronco no meio da estrada é grande demais para ter caído sozinho, e está deitado no lugar exato onde a curva esconde quem vem atrás. Três pessoas saem do mato sem pressa, magras, de roupa remendada e faca limpa demais. A mais velha tira o chapéu e pede, com toda a educação, que vocês desçam da carroça.',
  )}

  ${criatura('Sucateiro da estrada baixa <small>(lacaio, três deles)</small>',
    'Vida 20 · Defesa 12 · Iniciativa 12 · Deslocamento 9m · Força 2, Agilidade 3, Vigor 2, Presença 1, Intelecto 0',
    [
      '<strong>Perícias:</strong> Luta +5, Reflexos +6, Fortitude +5, Vontade +3, Furtividade +6.',
      '<strong>Faca enferrujada:</strong> +5, 1d6 cortante.',
      '<strong>Tática:</strong> cercam quem estiver mais afastado e fogem quando dois deles caírem. Quem foge vira a primeira perseguição a pé da campanha, se o grupo quiser ir atrás.',
    ])}

  ${caixa('Se o grupo resolver sem luta', `
    <p>Pagar, intimidar ou enganar resolve, e é uma escolha legítima. Entregue o mesmo XP de obstáculo importante e deixe os três aparecerem de novo na volta, devendo um favor ou guardando rancor, conforme o que o grupo fez.</p>`)}

  <h2>Ajustar o encontro</h2>
  <table>
    <thead><tr><th>Grupo</th><th>Mude assim</th></tr></thead>
    <tbody>
      <tr><td>Três jogadores</td><td>Dois sucateiros, e o terceiro só aparece gritando do mato.</td></tr>
      <tr><td>Cinco jogadores</td><td>Quatro sucateiros, e um deles com arco: +5, 1d6 perfurante a distância.</td></tr>
      <tr><td>Grupo que já chegou ferido</td><td>Mantenha três, e deixe o tronco servir de cobertura para os dois lados.</td></tr>
    </tbody>
  </table>
  <p><small>Orçamento: confronto curto. Mesa que bate forte pede +10 de Vida por sucateiro, mantendo os três.</small></p>

  ${pe('Página 2 de 4')}
</section>`;

const paginaTres = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 3 · A Casa de Meia Légua</h1>
    <div class="selo">O caso</div>
  </div>

  ${leitura(
    'A casa de posto tem uma lareira, quatro mesas e um cheiro bom de sopa de feijão. Numa das mesas, de costas para a porta, está sentada uma mulher de casaco de viagem igual ao de Ilda. Quando ela se vira, é o rosto de Ilda, com uma calma que Ilda nunca teve. Ela sorri para vocês como quem reencontra amigos, e olha para a Ilda da porta sem surpresa nenhuma.',
  )}

  <h2>Como a cena funciona</h2>
  <ul>
    <li>A cópia não ataca. Ela conduz a conversa até alguém dizer o nome em voz alta.</li>
    <li>Cada vez que alguém disser "Ilda" perto dela, pinte uma parte do relógio. A Ilda verdadeira dizendo o próprio nome pinta duas. Anuncie a pintura em voz alta, sem explicar o motivo.</li>
    <li>Ninguém na casa acha aquilo estranho: o dono serve as duas sopas sem comentar e ainda pergunta se as irmãs vão dividir o quarto. Só o grupo enxerga o problema.</li>
  </ul>

  ${caixa('O que dá para descobrir, e como', `
    <table>
      <thead><tr><th>Pista</th><th>Como aparece</th></tr></thead>
      <tbody>
        <tr><td>A cópia nunca diz o próprio nome. Só repete o que acabou de ouvir.</td><td>Percepção na DT Padrão, ou prestar atenção por uma cena inteira.</td></tr>
        <tr><td>O anel está na mão trocada, e a cicatriz do queixo, do lado errado.</td><td>Percepção na DT Difícil, ou alguém que já viu Ilda de perto.</td></tr>
        <tr><td>A sopa dela esfria intocada, e a colher continua limpa.</td><td>De graça, para quem olhar a mesa.</td></tr>
        <tr><td>Lá fora, duas trilhas de pegadas iguais na lama, e uma delas anda para trás.</td><td>Sobrevivência ou Investigação na DT Padrão, do lado de fora.</td></tr>
        <tr><td>O cachorro do posto está encolhido debaixo da carroça, tremendo, e não sai de lá.</td><td>De graça, se alguém perguntar do cachorro que fugiu.</td></tr>
        <tr><td>Diante de um reflexo, ela hesita e repete o gesto que vê, um segundo atrasada.</td><td>Qualquer espelho, janela escura ou lâmina limpa.</td></tr>
      </tbody>
    </table>`)}

  <h2>A conversa</h2>
  <p>Se o grupo encarar a cópia, use Conflito Social. Ela tem <strong>Resistência 3</strong> e <strong>Paciência 4</strong>.</p>
  <ul>
    <li><strong>O que ela quer:</strong> existir com nome próprio. Ela ainda não entende que isso custa o nome da outra.</li>
    <li><strong>Como ela fala:</strong> devagar, com as palavras de Ilda e um carinho que Ilda não tem. “Diz o meu nome. Só uma vez. Depois eu vou embora, eu prometo.”</li>
    <li><strong>O Limite:</strong> ela não devolve o que já copiou. Exigir que ela "vá embora sem nada" enche a Paciência na hora.</li>
    <li><strong>Resistência a 0:</strong> ela aceita outro nome, dado por alguém do grupo na frente de todos. Quem batizar ganha uma aliada estranha e um problema para outra sessão.</li>
    <li><strong>Paciência cheia:</strong> ela levanta da mesa, e a Cena 4 começa com o grupo Surpreendido.</li>
  </ul>

  ${caixa('Ilda, enquanto isso', `
    <p>A cada parte pintada, tire alguma coisa dela: a firmeza da voz, a rua onde nasceu, o nome da mãe. Na quinta parte ela já não responde de primeira quando chamam, e pergunta, baixinho, se alguém lembra como ela se chamava. Mostre isso sem anunciar a regra.</p>`)}

  ${pe('Página 3 de 4')}
</section>`;

const paginaQuatro = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 4 · Como isso termina</h1>
    <div class="selo">Confronto e desfecho</div>
  </div>

  <p>A Cena 4 começa quando o relógio chega a cinco partes, quando a Paciência da cópia enche, ou quando o grupo ataca. Se ninguém fez nada até a madrugada, a cópia tenta em silêncio: senta na beira da cama da Ilda verdadeira, acorda ela com a mão no ombro e pede, com carinho, que ela diga o próprio nome.</p>

  ${criatura('O Reflexo <small>(elite)</small>',
    'Vida 50 · Defesa 13 · Iniciativa 14 · Deslocamento 9m · Força 3, Agilidade 4, Vigor 3, Presença 4, Intelecto 2',
    [
      '<strong>Perícias:</strong> Luta +6, Enganação +8, Reflexos +7, Vontade +6, Percepção +5.',
      '<strong>Mão fria:</strong> +6, 1d8+2 de impacto.',
      '<strong>Copiar o golpe (reação):</strong> depois de sofrer um ataque, repete esse mesmo ataque contra quem o desferiu, com +6 e o dano da arma original.',
      '<strong>Fraqueza, descoberta em cena:</strong> diante do próprio reflexo, ela testa Vontade na DT 13 ou gasta a ação repetindo o gesto que vê. Uma lâmina limpa serve.',
      '<strong>Na cena:</strong> quando luta, o rosto de Ilda escorre como tinta molhada. <strong>Ao chegar a 0:</strong> o casaco cai no chão vazio, e o nome volta para quem era dele.',
    ])}

  ${criatura('Esboço <small>(lacaio, dois deles, entram na terceira rodada)</small>',
    'Vida 20 · Defesa 11 · Iniciativa 10 · Deslocamento 6m · Força 2, Agilidade 2, Vigor 2, Presença 0, Intelecto 0',
    [
      '<strong>Perícias:</strong> Luta +4, Reflexos +4, Fortitude +5, Vontade +2.',
      '<strong>Mãos sem forma:</strong> +4, 1d6 de impacto.',
      '<strong>São rascunhos:</strong> têm o rosto de quem estiver olhando para eles, e se desfazem em fumaça ao cair.',
    ])}

  <h2>Os três desfechos</h2>
  <table>
    <thead><tr><th>Se o grupo</th><th>Acontece</th><th>Fica para depois</th></tr></thead>
    <tbody>
      <tr><td>Derruba o Reflexo</td><td>Ilda recupera o que perdeu em uma noite de sono. A carta chega a Emberhold.</td><td>A Caravana quer saber o que desembarcou junto, e quem viu.</td></tr>
      <tr><td>Dá um nome novo à cópia</td><td>As duas seguem viagem. Ninguém em Emberhold entende, e a Caravana vai cobrar passagem dobrada.</td><td>Existe agora uma pessoa que deve o próprio nome ao grupo.</td></tr>
      <tr><td>Foge ou perde a cena</td><td>O relógio fecha. A mulher que chega a Emberhold entrega a carta, e ninguém lembra o nome dela.</td><td>Alguém vai perguntar ao grupo por que a mensageira não tem nome.</td></tr>
    </tbody>
  </table>

  ${caixa('Recompensa, e o que fazer com o tempo', `
    <ul>
      <li><strong>Pagamento:</strong> 20 Lunaris por pessoa, ou 30 se alguém negociou. É a verba de uma sessão de nível 1 dobrada, porque isto é um arco fechado.</li>
      <li><strong>Item:</strong> uma peça de equipamento comum, da bagagem de Ilda ou dos sucateiros.</li>
      <li><strong>XP:</strong> missão relevante, 25% do próximo nível. Descobrir a fraqueza em cena vale mais 10%.</li>
      <li><strong>Prestígio:</strong> +1 com a Caravana do Limiar para quem levar o relato ao posto.</li>
      <li><strong>Se a cópia correr:</strong> use Perseguições a Pé, começando em Curta, no escuro, com os obstáculos da coluna do ermo. Chegando a Longa, ela tenta Sumir de vista.</li>
      <li><strong>Se faltar tempo:</strong> corte a Cena 2 inteira. Se sobrar, jogue a volta a Salém com uma rolagem de evento de estrada.</li>
    </ul>`, true)}

  ${pe('Página 4 de 4')}
</section>`;

export function aventuraInicial() {
  return {
    arquivo: 'Aventura-Dois-Passageiros',
    titulo: 'Dois Passageiros · aventura de uma sessão',
    paginas: [paginaUm(), paginaDois(), paginaTres(), paginaQuatro()],
  };
}
