/**
 * Quatro aventuras prontas de uma sessão, para subir de patamar depois de "Dois
 * Passageiros" (nível 1): níveis 5, 12, 30 e 45.
 *
 * Cada uma tem quatro páginas no mesmo molde da primeira (abertura, estrada,
 * caso, desfecho) e puxa uma ferramenta diferente do sistema:
 *
 *   nível 5   O Moinho da Terceira Roda     relógio, conflito social, escolha sem vilão
 *   nível 12  O Leilão da Casa Vazia        infiltração, perseguição a pé, mercadoria quente
 *   nível 30  O Redemoinho de Caribdis      viagem de navio, criatura única com fases
 *   nível 45  A Queda do Leviatã Espelhado  Livro da Verdade, manchete e selos de lenda
 *
 * Nada aqui vira lore canônica: são casos locais, que cabem em qualquer campanha
 * com uma estrada, um porto ou uma cidade. As fichas de criatura inventadas saem
 * da curva do Bestiário (componentes-aventura.mjs). As duas criaturas únicas das
 * últimas aventuras são as do próprio Bestiário, com as fases que a Sessão avisa.
 */
import { caixa, ficha, leitura, relogio, rodape } from './componentes-aventura.mjs';

// ───────────────────────────────────────────────────────────── nível 5

const pe1 = rodape('O Moinho da Terceira Roda · aventura de uma sessão');

const moinho1 = () => `
<section class="folha">
  <div class="topo">
    <h1>O Moinho da Terceira Roda</h1>
    <div class="selo">Nível 5 · uma sessão</div>
  </div>
  <p class="linha-fina">Três a quatro horas · três a cinco jogadores · uma vila de colina, a um dia de qualquer estrada grande · DT Padrão 17</p>

  ${leitura(
    'Fornalha de Cima tem vinte casas, uma praça de terra batida e um moinho velho no alto da colina. Ao meio-dia, a praça está limpa demais. As pessoas varrem a frente das casas com o mesmo gesto, na mesma hora, e param todas juntas quando vocês passam. Uma mulher de avental pergunta, com educação, se já almoçaram, e pergunta de novo meio minuto depois.',
  )}

  <h2>O que está acontecendo</h2>
  <p>Teodora Brás é a moleira de Fornalha de Cima. O marido dela, Anselmo, morreu faz três invernos, e ela nunca se despediu: pediu a ele, na última noite, que ficasse mais um dia. No porão do moinho existe uma terceira roda de pedra, esquecida desde antes de Teodora nascer, e naquela noite ela começou a girar sozinha. Desde então, toda madrugada a roda mói um dia da vila e o vira em farinha. Quem come o pão feito com ela acorda sem lembrar de ontem.</p>
  <p>Anselmo voltou junto com a roda. Ele não sabe que morreu. Sabe que acorda todo dia na mesma cama, que a mulher lhe serve o mesmo café, e que há um dia a mais para viver. A vila perde um dia por semana, e Teodora tem o seu marido de volta por um dia depois do outro.</p>

  <h2>Resumo em quatro linhas</h2>
  <ul>
    <li><strong>Cena 1:</strong> a praça, a prefeita e o pão que todo mundo comeu.</li>
    <li><strong>Cena 2:</strong> a subida da colina, de noite, e o moinho que trabalha sem vento.</li>
    <li><strong>Cena 3:</strong> o porto da roda: Teodora, Anselmo e a conversa que ninguém queria ter.</li>
    <li><strong>Cena 4:</strong> o grupo escolhe quem perde o quê.</li>
  </ul>

  ${caixa('O relógio da moagem', `
    <p>Marque seis partes. Pinte uma a cada madrugada em que a roda gira sem ser parada, e uma sempre que um personagem comer o pão do moinho em cena. Anuncie a pintura em voz alta.</p>
    ${relogio(6)}
    <p><small>Ao fechar: a vila esquece o próprio nome por uma noite, e a roda mói o dia seguinte antes de ele chegar. Fornalha de Cima fica presa em ontem, e quem sair do vale lembra dela como um lugar que nunca visitou.</small></p>`)}

  <h2>Cena 1 · A praça</h2>
  <p>Deixe o grupo perceber o que está errado antes de qualquer teste. A prefeita Lúcia Torres os recebe com um caderno cheio de anotações do mesmo dia repetidas, e contrata o grupo por 30 Lunaris cada: ela quer saber por que ninguém consegue passar de terça-feira.</p>
  <ul>
    <li><strong>O pão:</strong> toda casa tem uma broa do moinho. Quem prova uma fatia perde a manhã inteira, e ainda sente fome de verdade depois, como quem comeu sem jantar. Dar a fatia a um aliado é uma má ideia que merece uma cena.</li>
    <li><strong>O que as pessoas sabem:</strong> o moinho trabalha de noite, e ninguém sobe lá faz semanas. Os mais velhos dizem que a vila tem três rodas, mas só se lembram de duas.</li>
    <li><strong>A pista de graça:</strong> as pegadas na colina descem, todas, em direção à vila. Ninguém volta do moinho com as mesmas botas.</li>
  </ul>

  ${pe1('Página 1 de 4')}
</section>`;

const moinho2 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 2 · A subida</h1>
    <div class="selo">Viagem curta e primeiro combate</div>
  </div>

  <p>A colina leva uma hora a pé. À noite, o moinho aparece de longe com a roda grande girando e nenhum vento, nenhuma água no canal. Quem tem Percepção na DT Padrão repara que a farinha que escorre do telhado não cai no chão: sobe de volta, devagar, como poeira numa janela com sol.</p>

  ${leitura(
    'A porta do moinho está aberta. Lá dentro há sacos empilhados até o teto, e todos eles respiram. Um deles, alto como uma pessoa, vira devagar e abre uma boca de pano onde deveria haver rosto. Cada saco tem um nome costurado na barriga: Tereza, Fernão, Maria das Dores. Os nomes da vila, um dia de cada vez.',
  )}

  ${ficha('Saco de Farinha Vivo', { vd: 5, papel: 'lacaio', golpes: [['Pancada de saco', 'impacto']], rotulo: 'lacaio, três deles', extras: [
    '<strong>Tática:</strong> cercam quem estiver mais perto da porta. Ao cair, estouram numa nuvem de farinha: quem estiver adjacente faz Fortitude na DT 15 ou fica Cego até o fim do próximo turno.',
    '<strong>Nome na barriga:</strong> se um personagem ler o nome em voz alta, o saco hesita por uma rodada (perde a ação). Nomes de gente da vila que o grupo já conheceu valem em dobro: o saco desmancha em farinha comum.',
  ] })}

  ${ficha('A Mó Solta', { vd: 5, papel: 'elite', arquetipo: 'bruto', golpes: [['Rolar sobre', 'impacto']], rotulo: 'elite, entra na terceira rodada', extras: [
    '<strong>Descer do eixo:</strong> uma pedra de moer solta do teto rola em linha reta de 9 m. Quem estiver na linha faz Reflexos na DT 17 ou sofre o golpe e fica Caído. O caminho dela deixa um sulco, e o sulco vira terreno difícil.',
    '<strong>Fraqueza:</strong> é pedra velha. Um ataque que acerte as três rachaduras do topo (Percepção na DT 17 para achar) causa o dobro do dano uma vez.',
  ] })}

  ${caixa('Ajustar o encontro', `
    <table>
      <thead><tr><th>Grupo</th><th>Mude assim</th></tr></thead>
      <tbody>
        <tr><td>Três jogadores</td><td>Dois sacos, e a Mó só rola uma vez antes de travar no chão.</td></tr>
        <tr><td>Cinco jogadores</td><td>Quatro sacos, e um deles já nasce cheio de farinha: o estouro cega em 3 m.</td></tr>
        <tr><td>Grupo que comeu o pão</td><td>Quem comeu não reconhece os nomes nos sacos e perde a vantagem de lê-los. Deixe isso doer, não puna.</td></tr>
      </tbody>
    </table>
    <p><small>Orçamento: confronto padrão. Se o grupo preferir ir pelo porão sem lutar, deixe: os sacos só atacam quem tenta levar farinha embora.</small></p>`, true)}

  ${pe1('Página 2 de 4')}
</section>`;

const moinho3 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 3 · A terceira roda</h1>
    <div class="selo">O caso</div>
  </div>

  ${leitura(
    'O porão tem cheiro de pão quente e de pedra molhada. No centro, uma roda de moinho do tamanho de uma mesa gira devagar, sozinha, e deixa uma farinha fina que brilha como sal no escuro. Ao lado dela, sentada num banco, há uma mulher de cabelo branco cantando baixo. Em frente, apoiado no eixo, um homem de camisa de linho sorri para vocês como quem recebe visita.',
  )}

  <h2>Quem são os dois</h2>
  <ul>
    <li><strong>Teodora Brás:</strong> sabe que a roda mói dias e sabe de quem eram os nomes nos sacos. Desceu na primeira semana e nunca mais teve coragem de subir. Dorme no banco.</li>
    <li><strong>Anselmo, o Moleiro que Fica:</strong> a lembrança de um homem feliz. Cumprimenta o grupo pelo nome do dia anterior, que ele não sabe que já esqueceu. É gentil, e tem medo de uma coisa só: que a mulher pare de sorrir.</li>
  </ul>

  ${caixa('O que dá para descobrir, e como', `
    <table>
      <thead><tr><th>Pista</th><th>Como aparece</th></tr></thead>
      <tbody>
        <tr><td>Anselmo conta o mesmo dia três vezes, com as mesmas palavras.</td><td>De graça, depois de uma conversa de dez minutos.</td></tr>
        <tr><td>A farinha da roda é feita de gestos: ao se espalhar no chão, desenha o formato de uma mão, de uma xícara, de um abraço.</td><td>Percepção na DT Padrão.</td></tr>
        <tr><td>A roda tem a data da inauguração gravada no eixo, e uma segunda data riscada por cima.</td><td>Investigação na DT Padrão, olhando por baixo.</td></tr>
        <tr><td>Teodora parou de ver o marido mudar. Ela o vê igual todo dia, e é isso que ela chama de milagre.</td><td>Intuição na DT Padrão, ou deixar ela falar.</td></tr>
        <tr><td>Parar a roda não apaga os dias já moídos: eles ficam guardados no farelo do porão e podem ser devolvidos a quem os perdeu.</td><td>Misticismo ou Religião na DT Difícil, ou perguntar a Anselmo, que sempre soube.</td></tr>
      </tbody>
    </table>`)}

  <h2>A conversa</h2>
  <p>Se o grupo encarar Teodora, use Conflito Social. Ela tem <strong>Resistência 3</strong> e <strong>Paciência 4</strong>.</p>
  <ul>
    <li><strong>O que ela quer:</strong> que Anselmo continue. Não pede nada à vila, e acha que o preço é pequeno.</li>
    <li><strong>Como ela fala:</strong> baixo, sem levantar os olhos. “Ele me chama pelo nome toda manhã. O que a vila perde, a vila nem sente.”</li>
    <li><strong>O Limite:</strong> ela não aceita que Anselmo seja chamado de “sombra” ou de “mentira”. Dizer isso enche a Paciência na hora.</li>
    <li><strong>Resistência a 0:</strong> ela aceita se despedir, desde que seja feito direito e com as pessoas presentes.</li>
    <li><strong>Paciência cheia:</strong> ela pede a Anselmo que faça os visitantes esquecerem, e o grupo perde um dia inteiro sem perceber (descanso longo roubado, nada mais).</li>
  </ul>

  ${caixa('Anselmo, enquanto isso', `
    <p>Deixe-o oferecer um copo d'água ao grupo, perguntar das famílias de cada personagem e lembrar uma coisa que o personagem contou ontem, mesmo que o grupo nunca tenha estado aqui. É o dia que a roda mói, devolvido em pedaços. Se um jogador tiver coragem de contar a verdade a ele, Anselmo não se zanga: ele já sabia, e escolheu não saber.</p>`)}

  ${pe1('Página 3 de 4')}
</section>`;

const moinho4 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 4 · Quem perde o quê</h1>
    <div class="selo">Desfecho</div>
  </div>

  <p>A Cena 4 começa quando o relógio chega a cinco partes, quando Teodora aceita parar a roda, ou quando alguém quebra o eixo. Se ninguém fizer nada, ela começa na madrugada seguinte: a roda gira mais rápido, o pão da manhã já vem na mesa, e o grupo acorda sem lembrar da véspera.</p>

  <h2>Os três desfechos</h2>
  <table>
    <thead><tr><th>Se o grupo</th><th>Acontece</th><th>Fica para depois</th></tr></thead>
    <tbody>
      <tr><td>Convence Teodora a se despedir</td><td>Anselmo some ao amanhecer, devagar, com a mulher segurando a mão dele. A roda para. Os dias moídos voltam à vila, um por vez, como sonhos tardios.</td><td>Teodora vira a pessoa mais querida de Fornalha de Cima, e passa a pedir ajuda a quem a ajudou.</td></tr>
      <tr><td>Quebra o eixo à força</td><td>A roda cai em pedaços. A vila lembra de tudo, de uma vez, e Teodora grita o nome do marido na rua.</td><td>Ela não perdoa o grupo por um tempo. A vila, sim.</td></tr>
      <tr><td>Deixa a roda girar</td><td>Fornalha de Cima segue presa em terça-feira. O grupo recebe 30 Lunaris e uma broa que dura para sempre.</td><td>Daqui a um ano, uma estrada nova passa pela vila. O prefeito de lá não se lembra de ter assinado nada.</td></tr>
    </tbody>
  </table>

  ${caixa('Recompensa, e o que fazer com o tempo', `
    <ul>
      <li><strong>Pagamento:</strong> 30 Lunaris por pessoa da prefeita, mais 30 de Teodora se ela se despedir. É a verba de uma sessão desse nível, dobrada, porque isto é um arco fechado.</li>
      <li><strong>Item:</strong> um saco de farinha da roda (consumível comum): quem o come lembra de um dia que esqueceu, uma vez.</li>
      <li><strong>XP:</strong> missão relevante, 25% do próximo nível. Acertar a Intuição sobre Teodora, ou ouvir Anselmo até o fim, vale mais 10%.</li>
      <li><strong>Se faltar tempo:</strong> corte a Cena 2 e comece no porão, com os sacos já estourando pelas escadas.</li>
      <li><strong>Se sobrar:</strong> jogue a volta à vila, com os dias devolvidos. Cada jogador diz uma coisa que a vila lembrou e que o grupo ainda não sabia.</li>
    </ul>`, true)}

  ${caixa('Para usar na Sessão', `
    <p>O Montador de encontro ajuda a ajustar a Cena 2: nível 5, quatro jogadores, dificuldade <strong>Padrão</strong>, estilo <em>Bando</em>. Substitua os sacos pelas fichas acima e mantenha a Mó como elite. Se algum personagem comer o pão em cena, marque a Condição de longo prazo que o Mestre achar justa, mas deixe o jogador decidir como o personagem reage à lacuna.</p>`)}

  ${pe1('Página 4 de 4')}
</section>`;

export function aventuraMoinho() {
  return {
    arquivo: 'Aventura-O-Moinho-da-Terceira-Roda',
    titulo: 'O Moinho da Terceira Roda · aventura de uma sessão',
    paginas: [moinho1(), moinho2(), moinho3(), moinho4()],
  };
}

// ───────────────────────────────────────────────────────────── nível 12

const pe2 = rodape('O Leilão da Casa Vazia · aventura de uma sessão');

const leilao1 = () => `
<section class="folha">
  <div class="topo">
    <h1>O Leilão da Casa Vazia</h1>
    <div class="selo">Nível 12 · uma sessão</div>
  </div>
  <p class="linha-fina">Quatro horas · três a cinco jogadores · uma cidade grande, uma noite de leilão · DT Padrão 21 · usa Perseguições a Pé</p>

  ${leitura(
    'A Casa Alvarenga fica no fim de uma rua de lampiões azuis, e hoje não tem nenhuma janela acesa. A porta está aberta mesmo assim. Dentro, trinta cadeiras de veludo olham para um púlpito, e um homem de colete cinza ajeita os punhos como quem vai ler um testamento. Ele sorri para vocês antes de qualquer um falar. “Os senhores vieram pelo Lote Treze. Todo mundo veio.”',
  )}

  <h2>O que está acontecendo</h2>
  <p>O colecionador Hélio Alvarenga morreu sem herdeiros, e a casa dele vai a leilão em doze lotes. O décimo terceiro não consta no catálogo: é uma caixa de ferro selada, trazida de madrugada, que ninguém declara possuir. Dentro dela há o Códice de Pagamentos, o livro-razão de uma quadrilha que lavou ouro roubado por quinze anos, com o nome de cada comprador. Quem comprar o lote compra o poder de chantagear metade da cidade, e quem o perder será chantageado por quem comprar.</p>
  <p>O grupo foi contratado pela Guilda dos Caçadores para trazer a caixa fechada. A Guilda paga em dobro se o Códice chegar intacto, e não quer saber como.</p>

  <h2>Resumo em quatro linhas</h2>
  <ul>
    <li><strong>Cena 1:</strong> a entrada, o catálogo e a decisão de como entrar.</li>
    <li><strong>Cena 2:</strong> o salão: lances, olhares e quem está comprando para quem.</li>
    <li><strong>Cena 3:</strong> o Lote Treze: o cofre, o cão e a mão que se mexe primeiro.</li>
    <li><strong>Cena 4:</strong> a fuga pelos telhados, e o que cada um leva no bolso.</li>
  </ul>

  ${caixa('O relógio da casa', `
    <p>Marque seis partes. Pinte uma a cada ação ruidosa, a cada identidade que cair e a cada vez que alguém tocar no Lote Treze sem ter declarado. Anuncie o que cada parte significa: a guarda da casa já está desconfiada.</p>
    ${relogio(6)}
    <p><small>Ao fechar: as portas se trancam e as janelas descem. O leilão acaba, e a Guarda da Casa assume o salão.</small></p>`)}

  <h2>Cena 1 · A entrada</h2>
  <p>O leiloeiro, Orfeu Nacar, entrega o catálogo aos recém-chegados e explica as regras: lances só em Lunaris, depósito de 60 Lunaris por paleta, identidade verificada na porta. Há três caminhos para entrar.</p>
  <ul>
    <li><strong>Pela porta, como compradores:</strong> exige o depósito e uma identidade. Um personagem com Nobreza ou Atuação na DT Padrão passa por convidado de casa grande.</li>
    <li><strong>Como equipe de serviço:</strong> a copeira precisa de mãos. Furtividade ou Enganação na DT Padrão consegue as roupas e uma bandeja. É o caminho de menos risco, e de menos acesso.</li>
    <li><strong>Pelo telhado:</strong> acesso direto ao Lote Treze pelo porão, com Acrobacia ou Atletismo na DT Difícil e a Guarda cobrindo os cantos.</li>
  </ul>

  ${pe2('Página 1 de 4')}
</section>`;

const leilao2 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 2 · O salão</h1>
    <div class="selo">Intriga e Conflito Social</div>
  </div>

  <p>Doze lotes, vinte minutos cada. Entre um lote e outro, o salão conversa em voz baixa, e é aqui que a sessão acontece: quem quer o Códice, quem tem medo dele e quem finge indiferença melhor que os outros.</p>

  <h2>Quem está na sala</h2>
  <ul>
    <li><strong>Orfeu Nacar:</strong> o leiloeiro. Cortês até o último segundo. Sabe do Lote Treze e finge que não. Se for confrontado em particular, usa Conflito Social com <strong>Resistência 4</strong> e <strong>Paciência 3</strong>: ele quer que o lote saia da casa sem que o nome dele conste em nenhum papel.</li>
    <li><strong>A Viúva Saldanha:</strong> compradora de cabelo preto e luvas de cetim. Representa o homem que mais tem a perder com o Códice. Dá 1.000 Lunaris ao grupo para que a caixa nunca seja aberta, e depois some.</li>
    <li><strong>O Rapaz do Cais:</strong> comprador de verdade, nervoso, pagando com dinheiro emprestado. Sabe que alguém vai matá-lo se perder. Pode virar aliado por uma saída segura.</li>
    <li><strong>A Guarda da Casa:</strong> oito homens de colete azul, treinados, que giram pelo salão sem parar. Dois ficam de olho em quem fala com o leiloeiro.</li>
  </ul>

  ${caixa('O que dá para fazer no salão', `
    <table>
      <thead><tr><th>Se o grupo</th><th>Faça</th></tr></thead>
      <tbody>
        <tr><td>Dá lance no Lote Treze</td><td>Ele só aparece por último. Vence quem tiver 600 Lunaris na mão, e o resto vira dívida. O leiloeiro anuncia o vencedor em voz alta.</td></tr>
        <tr><td>Foca em outro lote para distrair</td><td>Um lote barato bem disputado vale uma parte apagada do relógio: o salão olha para outro lugar.</td></tr>
        <tr><td>Investiga o catálogo</td><td>Investigação na DT Padrão: o Lote Nove (um espelho de mão) foi vendido três vezes na semana passada. É a isca da Guarda.</td></tr>
        <tr><td>Fala com a Viúva</td><td>Intuição na DT Padrão: ela mente sobre o nome do homem que representa, mas não sobre o medo dele.</td></tr>
        <tr><td>Rouba um objeto de outro lote</td><td>Ladinagem na DT Difícil. Vale como mercadoria quente (ver a última página).</td></tr>
      </tbody>
    </table>`)}

  ${ficha('Guarda da Casa Alvarenga', { vd: 12, papel: 'padrao', golpes: [['Cassetete de ferro', 'impacto']], rotulo: 'inimigo padrão, oito na casa', extras: [
    '<strong>Tática:</strong> prendem em vez de matar. Quem é preso por dois guardas fica Agarrado e é levado ao porão. Fogem para pedir reforço se três caírem.',
    '<strong>Apito:</strong> uma Ação de Movimento pinta uma parte do relógio da casa.',
  ] })}

  ${pe2('Página 2 de 4')}
</section>`;

const leilao3 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 3 · O Lote Treze</h1>
    <div class="selo">O cofre e o cão</div>
  </div>

  ${leitura(
    'O porão da Casa Alvarenga é um corredor de pedra com seis portas e um cheiro de óleo de armas. A última porta está aberta. No centro do cômodo, sobre uma mesa baixa, está a caixa de ferro, sem fechadura, com a tampa soldada. Ao lado dela, deitado de lado como um cachorro dormindo, há um cão de latão do tamanho de um cavalo pequeno, e o olho dele acompanha vocês pelo canto.',
  )}

  <h2>A caixa</h2>
  <p>Ela abre de três jeitos: o sinete do leiloeiro (no bolso de Orfeu Nacar), o dobro de força de uma arma pesada (Atletismo na DT Difícil, e faz barulho), ou desligar a solda com Tecnologia ou Ladinagem na DT Difícil. Dentro está o Códice, um livro grosso de capa preta. Quem o abrir sem luvas de cera tem um nome apagado de uma das páginas, e perde uma lembrança que o Mestre escolhe.</p>

  ${ficha('O Cão de Cofre', { vd: 12, papel: 'elite', arquetipo: 'defensor', golpes: [['Mordida de latão', 'cortante']], rotulo: 'elite, acorda quando a caixa se mexe', extras: [
    '<strong>Corpo de latão:</strong> Resistência 5 a cortante e perfurante. Dano de impacto e de raio ignora a Resistência.',
    '<strong>Latido de alarme (reação, uma vez):</strong> quando acorda, pinta duas partes do relógio da casa e chama a Guarda em 3 rodadas.',
    '<strong>Fraqueza:</strong> o cão obedece a quem tiver o sinete de Orfeu. Mostrado a ele com Presença ou Enganação na DT Padrão, ele deita de novo por uma cena.',
  ] })}

  ${caixa('Se o grupo foi pelo telhado', `
    <p>O porão não tem vigia, e o cão dorme até alguém tocar na caixa. É uma infiltração limpa, mas o grupo chega sem identidade e sem dinheiro: se algo der errado, não há a quem recorrer. Pinte uma parte do relógio se a equipe falar alto ou usar luz forte no corredor.</p>`, true)}

  <h2>A mão que se mexe primeiro</h2>
  <p>Quem estiver de olho no Lote Treze se mexe quando o grupo se mexe. A Viúva, o Rapaz do Cais e o leiloeiro têm uma pessoa cada no porão. Se o grupo demorar, as três chegam ao mesmo tempo, e cada uma quer o Códice por um motivo que não é o do grupo.</p>
  <ul>
    <li>A pessoa da Viúva tenta comprar o silêncio por 1.000 Lunaris.</li>
    <li>O Rapaz do Cais implora, com uma faca na mão, que ele fique com a caixa para provar que o dono do nome é outro.</li>
    <li>O homem de Orfeu tenta pegar a caixa e fugir com ela pela porta de serviço.</li>
  </ul>

  ${pe2('Página 3 de 4')}
</section>`;

const leilao4 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 4 · A fuga pelos telhados</h1>
    <div class="selo">Perseguição a pé e desfecho</div>
  </div>

  <p>Com a caixa na mão ou sem ela, a casa acorda. Use <strong>Perseguições a Pé</strong>, começando em Média: os guardas descem a escada pelos fundos, e quem corre pelo telhado enfrenta lampiões, calhas e a distância entre uma casa e outra. Cada rodada o grupo escolhe um obstáculo ou larga o Códice para ir mais leve.</p>

  <h2>Os desfechos</h2>
  <table>
    <thead><tr><th>Se o grupo</th><th>Acontece</th><th>Fica para depois</th></tr></thead>
    <tbody>
      <tr><td>Entrega o Códice fechado à Guilda</td><td>Pagamento dobrado, e a Guilda queima o livro sem abrir. Metade da cidade dorme em paz sem saber por quê.</td><td>A Viúva Saldanha descobre quem a deixou de mãos vazias.</td></tr>
      <tr><td>Abre o Códice e copia nomes</td><td>Cada nome copiado vale uma chantagem. O grupo vira uma casa grande de segredos, com tudo que isso custa.</td><td>Alguém na lista reconhece o grupo na rua.</td></tr>
      <tr><td>Devolve o Códice ao Rapaz do Cais</td><td>Ele sobrevive e vira aliado. A Guilda cobra o dobro do adiantamento.</td><td>Daqui a três meses, o Rapaz vai estar numa cadeira que ninguém esperava.</td></tr>
      <tr><td>Perde o Códice na fuga</td><td>Alguém na cidade passa a ter o poder, e o grupo não sabe quem.</td><td>Os nomes do grupo estavam no catálogo da porta.</td></tr>
    </tbody>
  </table>

  ${caixa('Recompensa, e o que fazer com o tempo', `
    <ul>
      <li><strong>Pagamento da Guilda:</strong> 240 Lunaris por pessoa, 480 se o Códice chegar fechado. É a verba de uma sessão desse nível, dobrada e dobrada de novo.</li>
      <li><strong>Itens do leilão:</strong> o grupo pode sair com um ou dois objetos dos lotes, mercadoria quente se for roubada.</li>
      <li><strong>XP:</strong> missão relevante, 25% do próximo nível. Passar pelo salão sem pintar o relógio vale mais 10%.</li>
      <li><strong>Se faltar tempo:</strong> pule a Cena 2 e comece no porão, com o relógio já em duas partes.</li>
    </ul>`, true)}

  ${caixa('Mercadoria quente no Discord', `
    <p>Se o grupo saiu com itens roubados, use <strong>/mestre_mercadoria_quente</strong> no Discord para marcar quantas unidades de cada item são quentes. Quem vender isso ao doleiro soma 4 de Calor por unidade vendida, e o doleiro não encosta em mercadoria quente de quem já está com 90 de Calor. Calor decai sozinho, 5 pontos por hora, e é o mesmo Calor que deixa o /roubar mais lento. Deixe o jogador saber disso: é uma escolha dele.</p>`)}

  ${pe2('Página 4 de 4')}
</section>`;

export function aventuraLeilao() {
  return {
    arquivo: 'Aventura-O-Leilao-da-Casa-Vazia',
    titulo: 'O Leilão da Casa Vazia · aventura de uma sessão',
    paginas: [leilao1(), leilao2(), leilao3(), leilao4()],
  };
}

// ───────────────────────────────────────────────────────────── nível 30

const pe3 = rodape('O Redemoinho de Caribdis · aventura de uma sessão');

const redemoinho1 = () => `
<section class="folha">
  <div class="topo">
    <h1>O Redemoinho de Caribdis</h1>
    <div class="selo">Nível 30 · uma sessão</div>
  </div>
  <p class="linha-fina">Quatro a cinco horas · três a cinco jogadores · um porto de estreito e um navio emprestado · DT Padrão 30 · criatura única do Bestiário: Caribdis (VD 33)</p>

  ${leitura(
    'Porto Cinzento vive de uma coisa só: o estreito. Navios entram por um lado, saem pelo outro, e pagam uma taxa pelo caminho. Faz seis semanas que nenhum navio sai. O cais está cheio de marinheiros parados, com as mãos nos bolsos, olhando a água. Uma mulher de oleado sobe numa caixa de peixe e anuncia, sem gritar: “Quem tem coragem de passar?”',
  )}

  <h2>O que está acontecendo</h2>
  <p>O estreito tem uma boca do Vazio no meio. Chama-se Caribdis, e em geral dorme: alterna longos períodos de calma com ataques violentos. Há seis semanas, a calma começou a durar demais, e dois navios que passaram longe da corrente central foram puxados mesmo assim. A Companhia do Estreito contrata o grupo para abrir a rota, de um jeito ou de outro.</p>
  <p>O ponto central da aventura é uma decisão que o Bestiário já escreveu para o Mestre: <strong>ela não sai do estreito</strong>. Qualquer rota que passe a mais de 12 m da corrente central é segura. O que a Companhia não sabe é que o navio mais lento do porto, <em>a Gaivota Teimosa</em>, foi puxado porque estava carregado demais, e que os náufragos ainda estão vivos na Roda.</p>

  <h2>Resumo em quatro linhas</h2>
  <ul>
    <li><strong>Cena 1:</strong> o cais, a Companhia e os Sinais que ninguém quis ler.</li>
    <li><strong>Cena 2:</strong> a preparação do casco silencioso e a escolha da rota.</li>
    <li><strong>Cena 3:</strong> a passagem pelo estreito, com um relógio de silêncio.</li>
    <li><strong>Cena 4:</strong> Caribdis, a Roda dos Náufragos e como a água fecha.</li>
  </ul>

  ${caixa('O relógio do silêncio', `
    <p>Marque seis partes. Pinte uma a cada barulho a bordo (grito, explosão, fogo, ferida aberta), e duas se alguém jogar sangue na água. Apague uma quando um personagem usar uma ação inteira para acalmar a tripulação ou abafar o casco.</p>
    ${relogio(6)}
    <p><small>Ao fechar: o mar fica liso como vidro e o navio começa a girar devagar. Caribdis acorda, e a cena de combate começa com o grupo no meio do Sorvedouro.</small></p>`)}

  <h2>Cena 1 · O cais</h2>
  <p>A capitã Ívia Saldanha, da Companhia do Estreito, oferece 400 Solares por pessoa, mais o navio. Ela não menciona o preço do silêncio: três tripulantes morreram tentando ir pela corrente central.</p>
  <ul>
    <li><strong>Sinais de graça:</strong> o mar liso como vidro num trecho só, destroços girando devagar no mesmo lugar, nenhuma gaivota por perto.</li>
    <li><strong>Com Sobrevivência ou Conhecimento (DT Padrão):</strong> a corrente central é o único trecho perigoso, e qualquer rota a mais de 12 m dela é segura.</li>
    <li><strong>Com Investigação em quem sobreviveu (DT Padrão):</strong> os dois navios puxados estavam fazendo barulho (um comemorava, outro carregava gado).</li>
  </ul>

  ${pe3('Página 1 de 4')}
</section>`;

const redemoinho2 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 2 · O casco silencioso</h1>
    <div class="selo">Preparação e Cena de ação em navio</div>
  </div>

  <p>A <em>Gaivota Teimosa</em> é um navio mercante de mastro duplo, com tripulação de doze. O grupo tem até o fim da tarde para decidir como passar. Use as regras de combate de veículos para o que for necessário e narre o resto.</p>

  ${caixa('Escolhas de rota', `
    <table>
      <thead><tr><th>Rota</th><th>O que pede</th><th>Risco</th></tr></thead>
      <tbody>
        <tr><td>Pela margem, a 15 m da corrente</td><td>Casco silencioso: sem fogo, sem gado, sem ferido aberto, tripulação em silêncio.</td><td>O relógio do silêncio, e só.</td></tr>
        <tr><td>Pelo meio, correndo</td><td>Pilotagem na DT Difícil, três vezes seguidas.</td><td>O Sorvedouro puxa o casco: cada falha sofre 3d10 de dano de estrutura.</td></tr>
        <tr><td>Por cima, em voo</td><td>Um veículo aéreo ou magia de voo para todo o grupo.</td><td>Caribdis ataca se alguém fizer barulho, mas só quem estiver a menos de 12 m da água.</td></tr>
        <tr><td>Enfrentar a criatura</td><td>Navio parado na borda do Sorvedouro, fogo e arpões.</td><td>É a Cena 4, sem o relógio.</td></tr>
      </tbody>
    </table>`)}

  <h2>A tripulação</h2>
  <ul>
    <li><strong>Ívia Saldanha:</strong> capitã e quem dá a ordem final. Sabe mais do que diz. Conflito Social: <strong>Resistência 3</strong> e <strong>Paciência 4</strong>.</li>
    <li><strong>O contramestre Tavão:</strong> forte e supersticioso. Se alguém tocar na água com sangue na mão, ele para o navio e faz o grupo desembarcar na margem mais próxima.</li>
    <li><strong>Mica, a grumete:</strong> a única que viu o outro navio ser puxado. Fala pouco, desenha muito.</li>
  </ul>

  ${caixa('O que a tripulação conta no caminho', `
    <ul>
      <li>O estreito não era assim. Os mais velhos dizem que o Vazio chegou junto com o último navio da Frota de Seda.</li>
      <li>Há uma canção de ninar de Porto Cinzento que ninguém canta de dia, porque fala do que mora debaixo da maré.</li>
      <li>Quando o mar fica liso, ninguém conversa. É a regra mais antiga do porto, mais antiga que as outras.</li>
    </ul>`, true)}

  <p><small>Se o grupo quiser, o Montador de encontro serve para os marinheiros inimigos de uma Companhia rival que chega ao estreito no meio da cena: nível 30, dificuldade <strong>Fácil</strong>, estilo <em>Bando</em>.</small></p>

  ${pe3('Página 2 de 4')}
</section>`;

const redemoinho3 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 3 · A passagem</h1>
    <div class="selo">O relógio do silêncio</div>
  </div>

  ${leitura(
    'O sol cai atrás da margem leste e o mar vira uma folha de metal. A Gaivota desliza sem uma ripa rangendo, com os remos enrolados em pano. Ninguém fala. A bordo, doze pessoas conseguem ouvir o próprio coração. No meio do estreito, onde a água devia ter ondas, há uma superfície escura, redonda, quase imóvel, e dentro dela um navio inteiro girando devagar, de mastros para baixo.',
  )}

  <h2>Como a cena funciona</h2>
  <ul>
    <li>A passagem tem quatro trechos curtos de uma rodada cada. Em cada trecho, um personagem declara o que está fazendo e rola o teste que couber: Furtividade, Pilotagem, Atuação para a tripulação, Intimidação para quem está tremendo.</li>
    <li>Falha pinta uma parte do relógio. Falha por 5 ou mais pinta duas. Sucesso por 5 ou mais apaga uma.</li>
    <li>A água ao redor responde: a cada parte pintada, o mar fica mais liso e os destroços giram mais rápido. Narre isso sem dizer o motivo.</li>
  </ul>

  ${caixa('Imprevistos da passagem, role 1d6', `
    <table>
      <thead><tr><th>1d6</th><th>O que acontece</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Um tripulante tropeça numa corda e deixa cair um balde. Pinte uma parte do relógio.</td></tr>
        <tr><td>2</td><td>Do navio que gira sobe uma voz que chama o nome de um personagem. Vontade na DT 30 ou responder em voz alta.</td></tr>
        <tr><td>3</td><td>Uma gaivota pousa no mastro. Ela é a primeira em seis semanas, e ninguém sabe o que isso quer dizer.</td></tr>
        <tr><td>4</td><td>Mica puxa a manga de alguém e aponta: há gente viva nos destroços da Roda.</td></tr>
        <tr><td>5</td><td>O vento muda. Para quem estiver com vela alta, é preciso baixar sem barulho.</td></tr>
        <tr><td>6</td><td>Nada acontece, e é o pior resultado: o silêncio pesa. Cada personagem perde 1d4 de Sanidade.</td></tr>
      </tbody>
    </table>`)}

  <h2>Os náufragos da Roda</h2>
  <p>Quatro marinheiros da <em>Gaivota Teimosa</em> original estão numa balsa de destroços girando na borda do Sorvedouro, vivos. Para resgatá-los é preciso parar o navio a menos de 12 m da corrente, e é aí que a decisão da aventura vira cena. Cada resgatado pinta uma parte do relógio, porque o barulho da corda é inevitável. Quem não for resgatado é puxado.</p>

  ${pe3('Página 3 de 4')}
</section>`;

const redemoinho4 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 4 · Caribdis</h1>
    <div class="selo">Criatura única, com fases</div>
  </div>

  <p>A cena começa quando o relógio fecha, quando o grupo decide enfrentar a criatura ou quando um resgate dá errado. <strong>Use a ficha de Caribdis do Bestiário</strong> (VD 33, na Sessão: Bestiário, filtro de criaturas únicas). Para um grupo abaixo do nível 33, use <em>Escalar para outro VD</em> no editor da criatura até o VD do grupo.</p>

  ${caixa('O que a Sessão avisa sozinha', `
    <p>Caribdis tem duas fases: aos <strong>50% da Vida</strong> (O Estreito se Fecha) e aos <strong>20%</strong> (Maré Baixa). Quando a Vida cai ao limiar, a Sessão mostra o aviso de fase para a mesa, com a frase de cena, e entrega só para você a lista do que mudou. Leia a frase em voz alta e ajuste o terreno: as paredes de água se juntam, depois o fundo do estreito aparece.</p>`)}

  <h2>O que o grupo pode usar</h2>
  <ul>
    <li><strong>O casco:</strong> o navio é um veículo, e o dano de estrutura do Sorvedouro conta no resistente do casco. Reparos pedem Pilotagem ou Engenharia na DT Padrão e uma Ação Padrão.</li>
    <li><strong>Fogo e raio:</strong> o Corpo de Maré só recupera Vida se ela não tiver sofrido dano de fogo ou raio na rodada. Quem tiver, avise ao grupo.</li>
    <li><strong>A saída:</strong> a qualquer momento, o navio pode se afastar mais de 12 m da corrente central e a luta acaba. Caribdis não sai do estreito. Deixe o grupo perceber isso antes de morrer tentando.</li>
  </ul>

  <h2>Desfechos</h2>
  <table>
    <thead><tr><th>Se o grupo</th><th>Acontece</th><th>Fica para depois</th></tr></thead>
    <tbody>
      <tr><td>Passa em silêncio e salva os náufragos</td><td>A Companhia abre a rota por uma taxa menor, e ninguém ousa passar a menos de 12 m da corrente. Caribdis dorme de novo.</td><td>A pergunta que Mica faz ao grupo: por que não foram embora?</td></tr>
      <tr><td>Derruba Caribdis</td><td>O estreito se abre e o Vazio, sem corpo, afunda no fundo. A Companhia dobra o pagamento e o porto faz uma festa de uma semana.</td><td>O que a criatura guardava sobe à superfície, e alguém vai querer aquilo.</td></tr>
      <tr><td>Passa sem salvar ninguém</td><td>Rota aberta, quatro marinheiros perdidos.</td><td>A família deles está no cais, quando o grupo voltar.</td></tr>
    </tbody>
  </table>

  ${caixa('Recompensa, e o que fazer com o tempo', `
    <ul>
      <li><strong>Pagamento:</strong> 400 Solares por pessoa da Companhia, mais o saque da criatura se ela cair (a tabela está na Sessão: o Mestre rola e decide quem recebe).</li>
      <li><strong>Verba:</strong> a verba por sessão desse nível é de 200 Solares por jogador. A aventura paga o dobro, porque a rota abre para a campanha.</li>
      <li><strong>XP:</strong> missão relevante, 25% do próximo nível, mais o XP da criatura se for derrubada. A criatura vale o VD 33 inteiro.</li>
      <li><strong>Se faltar tempo:</strong> corte a Cena 2 e entregue a preparação resolvida: o navio já está pronto, e o relógio começa em uma parte.</li>
    </ul>`, true)}

  ${pe3('Página 4 de 4')}
</section>`;

export function aventuraRedemoinho() {
  return {
    arquivo: 'Aventura-O-Redemoinho-de-Caribdis',
    titulo: 'O Redemoinho de Caribdis · aventura de uma sessão',
    paginas: [redemoinho1(), redemoinho2(), redemoinho3(), redemoinho4()],
  };
}

// ───────────────────────────────────────────────────────────── nível 45

const pe4 = rodape('A Queda do Leviatã Espelhado · aventura de uma sessão');

const leviata1 = () => `
<section class="folha">
  <div class="topo">
    <h1>A Queda do Leviatã Espelhado</h1>
    <div class="selo">Nível 45 · uma sessão</div>
  </div>
  <p class="linha-fina">Cinco horas · três a cinco jogadores · um cais de águas profundas · DT Padrão 37 · lenda do Bestiário: Vaelthor (VD 45) · abre uma página do Livro da Verdade</p>

  ${leitura(
    'Cais de Vidro tem esse nome porque, de manhã cedo, o mar deita no porto como uma lâmina e devolve o céu inteiro. Hoje o céu devolvido tem estrelas, e é meio-dia. Os pescadores sentaram nas caixas de isca e olham para baixo. Uma astrônoma de casaco de couro pergunta, sem se apresentar: “Os senhores vão matá-lo? Eu gostaria de uma semana antes.”',
  )}

  <h2>O que está acontecendo</h2>
  <p>Há uma serpente do tamanho de um porto sob o mar de Cais de Vidro. Chama-se Vaelthor, e cada escama dela devolve o céu de outro universo. Os marinheiros contam que ele coleta o que balança, bate, sangra ou explode na superfície, e há três meses a frota de pesca só sai de casco silencioso. Ontem à noite, três barcos fizeram barulho e não voltaram.</p>
  <p>A astrônoma, Doutora Marta Saldanha, estudou as estrelas no mar por dois anos. Ela diz que o céu refletido é real, e que ao derrubar Vaelthor o grupo derruba também a única janela conhecida para outro universo. Os pescadores querem o mar de volta.</p>

  <h2>Resumo em quatro linhas</h2>
  <ul>
    <li><strong>Cena 1:</strong> o cais, as estrelas do meio-dia e a astrônoma.</li>
    <li><strong>Cena 2:</strong> a Frota Silenciosa e o ensaio de como aproximar sem barulho.</li>
    <li><strong>Cena 3:</strong> o encontro: o Leviatã, as duas fases e o que ele devolve.</li>
    <li><strong>Cena 4:</strong> o céu verdadeiro, a manchete e o Livro.</li>
  </ul>

  ${caixa('O relógio da maré', `
    <p>Marque seis partes. Pinte uma a cada ação que faça barulho na superfície (grito, explosão, fogo, ferida aberta), e duas se alguém usar um poder de som de propósito. Apague uma quando o grupo gastar uma cena inteira calando a frota.</p>
    ${relogio(6)}
    <p><small>Ao fechar: o mar espelha o céu errado até o horizonte, e Vaelthor sobe. A cena de combate começa com a frota inteira na superfície.</small></p>`)}

  <h2>Cena 1 · O cais</h2>
  <ul>
    <li><strong>O contrato:</strong> o conselho dos pescadores paga 1.200 Solares por pessoa, mais as redes de seda da guilda, se o mar voltar a ser mar.</li>
    <li><strong>A astrônoma:</strong> Conflito Social, <strong>Resistência 3</strong> e <strong>Paciência 4</strong>. Quer uma semana de observação. Em troca, entrega ao grupo um mapa do céu errado, com o ponto do mar onde a serpente respira.</li>
    <li><strong>Sinais, de graça:</strong> o mar reflete estrelas em pleno dia, e ondas correm contra o vento.</li>
    <li><strong>Como Evitar:</strong> barulho, sangue e explosões atraem. Um casco silencioso, sem fogo e sem feridos a bordo passa por cima dele.</li>
  </ul>

  ${pe4('Página 1 de 4')}
</section>`;

const leviata2 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 2 · A Frota Silenciosa</h1>
    <div class="selo">Preparação e escolha</div>
  </div>

  <p>Seis barcos de pesca estão disponíveis, e cada um é uma peça do plano. A frota inteira cabe numa baía rasa, e a baía rasa é o único lugar onde Vaelthor não alcança. O grupo pode usar isso.</p>

  ${caixa('Peças do plano', `
    <table>
      <thead><tr><th>Peça</th><th>O que pede</th><th>O que dá</th></tr></thead>
      <tbody>
        <tr><td>Casco silencioso</td><td>Pilotagem na DT Padrão, tripulação treinada.</td><td>Apaga duas partes do relógio de saída.</td></tr>
        <tr><td>Isca de ruído</td><td>Um barco vazio com um sino. Atuação na DT Padrão para soar certo.</td><td>Distrai Vaelthor por três rodadas.</td></tr>
        <tr><td>Espelho de bruma</td><td>Uma rede de cobre fundida em lâmina (Tecnologia ou Engenharia na DT Difícil).</td><td>O Reflexo Adiantado deixa de contar uma vez.</td></tr>
        <tr><td>Arpões de ferro frio</td><td>O ferreiro do cais tem três, a 40 Solares cada.</td><td>+2 em ataques à distância contra ele, mas o dano é refletido se a rolagem falhar.</td></tr>
        <tr><td>Apoio da astrônoma</td><td>Ceder a semana que ela pediu.</td><td>Ela diz o momento exato em que Vaelthor sobe: o grupo ganha a primeira rodada.</td></tr>
      </tbody>
    </table>`)}

  <h2>O que a cidade tem a dizer</h2>
  <ul>
    <li><strong>O velho Anselmo da isca:</strong> diz que o Leviatã subiu no dia em que um barco carregou um espelho para vender. Ninguém sabe do espelho.</li>
    <li><strong>A prefeita:</strong> fala em reconstruir o cais com o dinheiro do pescado que vai voltar. Ela precisa que ele caia.</li>
    <li><strong>As crianças do cais:</strong> sabem os nomes das estrelas do mar errado. Perguntar a elas rende a descoberta mais útil do dia: uma estrela some a cada vez que Vaelthor perde Vida, como uma contagem regressiva.</li>
  </ul>

  ${caixa('Para usar na Sessão', `
    <p>Entre as partes do plano, o grupo pode ajustar o encontro com o Montador: nível 45, quatro jogadores, dificuldade <strong>Mortal</strong>, estilo <em>Duelo</em>, com a opção <em>Chefe pode ser criatura única</em> ligada. O montador sorteia a lenda, mas aqui o chefe já está decidido: Vaelthor. Use os lacaios que ele traz (cardume de reflexos) como acompanhantes.</p>`, true)}

  ${pe4('Página 2 de 4')}
</section>`;

const leviata3 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 3 · O Leviatã</h1>
    <div class="selo">Lenda com fases</div>
  </div>

  ${leitura(
    'A superfície do mar parece uma tela esticada, e debaixo dela as estrelas passam como peixes. Uma escama do tamanho de uma vela sobe devagar, devolvendo o céu inteiro, e atrás dela outra, e outra. O barco mais próximo inclina para o lado sem causa. Quando o primeiro olho da serpente aparece, ele reflete os personagens com um instante de antecedência.',
  )}

  <h2>A ficha</h2>
  <p>Use a ficha de <strong>Vaelthor, o Leviatã Espelhado</strong> do Bestiário: VD 45, Vida 1.505, Defesa 31. Acrescente à Sessão com a visibilidade <em>Parcial</em>, para a mesa ver só o estado da Vida. Os números do golpe, a DT 30 do Maremoto e a DT 37 do Reflexo Adiantado estão na ficha.</p>

  ${caixa('As duas fases', `
    <table>
      <thead><tr><th>Quando</th><th>O que a Sessão avisa à mesa</th><th>O que muda (só você vê)</th></tr></thead>
      <tbody>
        <tr><td>50% da Vida</td><td>“O reflexo do mar se estilhaça, e o céu errado se despeja na água.” <em>Céu Quebrado</em>.</td><td>O Reflexo Adiantado vale a cena inteira, e os ataques à distância se refletem na primeira falha.</td></tr>
        <tr><td>20% da Vida</td><td>“As ondas correm contra o vento, e todas as estrelas da água se apagam juntas.” <em>Maré de Estrelas</em>.</td><td>O Maremoto roda toda rodada, mas ele perde o Reflexo Adiantado e fica Lento.</td></tr>
      </tbody>
    </table>`)}

  <h2>Como a cena corre</h2>
  <ul>
    <li><strong>Primeira rodada:</strong> o grupo, com a astrônoma, escolhe um primeiro golpe. Quem acerta a primeira rodada define o tom: tiros de longe contra o reflexo, ou uma abordagem corpo a corpo no lombo.</li>
    <li><strong>Fase 1:</strong> luta de movimento. Vaelthor evita o barulho, não o sangue: um ferido aberto faz ele se virar.</li>
    <li><strong>Fase 2:</strong> a água vira vidro. Quem estiver no barco enxerga o próprio reflexo se mexer antes: use isso como fonte de pistas. Quem falhar na Vontade DT 37 ataca o próprio reflexo e perde a ação.</li>
    <li><strong>Fase 3:</strong> o mar volta a ser água. Os lacaios (reflexos de pescadores mortos) tentam puxar os feridos para baixo, e é a hora do último golpe.</li>
  </ul>

  ${caixa('A decisão da cena', `
    <p>A qualquer momento, o grupo pode recuar sem matar, e Vaelthor volta ao fundo. A astrônoma pede isso. Se o grupo fizer, a aventura termina em segredo: o céu errado continua no mar, e o Cais de Vidro aprende a conviver com ele. Se o grupo continuar, a próxima cena é o que a campanha vai dizer sobre a queda.</p>`, true)}

  ${pe4('Página 3 de 4')}
</section>`;

const leviata4 = () => `
<section class="folha">
  <div class="topo">
    <h1>Cena 4 · O céu verdadeiro</h1>
    <div class="selo">A queda e o Livro da Verdade</div>
  </div>

  ${leitura(
    'A serpente afunda devagar, e as estrelas do mar vão se apagando uma por uma, até restar só o azul. O mar do Cais de Vidro está liso, com o céu de cima dentro dele, e é a primeira vez em anos que os pescadores veem o próprio sol na água. A astrônoma chora sem barulho. Alguém, lá atrás, começa a rir.',
  )}

  <h2>O que a Sessão faz sozinha</h2>
  <p>Quando a Vida de Vaelthor chega a 0 na Sessão, o servidor registra a queda. Você não precisa fazer nada, mas vale saber o que a mesa vai ver:</p>
  <ul>
    <li>A mesa inteira recebe um aviso na tela: <em>Uma lenda caiu</em>, com a consequência (“o mar passou a refletir o céu verdadeiro, e as estrelas de outro universo sumiram da água”) e um link para o Livro da Verdade.</li>
    <li>A página de Vaelthor abre no Livro, com a verdade sobre ele: a janela por onde outro universo olhava o nosso mar.</li>
    <li>O calendário do mundo ganha um acontecimento aberto, no dia de hoje: <strong>A queda de Vaelthor</strong>.</li>
    <li>No Discord, o Jornalista publica a manchete, com o nome de quem estava na mesa.</li>
    <li>Quem estava na mesa recebe o selo <strong>Matador de Vaelthor</strong>, na próxima vez que abrir a ficha.</li>
  </ul>
  <p><small>Se foi um engano, o Mestre desfaz a queda no próprio Livro, em <em>Mundo, Livro da Verdade</em>. Se o grupo preferiu recuar, nada disso acontece.</small></p>

  <h2>Desfechos</h2>
  <table>
    <thead><tr><th>Se o grupo</th><th>Acontece</th><th>Fica para depois</th></tr></thead>
    <tbody>
      <tr><td>Derruba Vaelthor</td><td>O céu verdadeiro volta. A prefeita reconstrói o cais, e o conselho dos pescadores entrega as redes de seda.</td><td>A astrônoma perde a janela. Ela fica a vida inteira olhando o céu errado em memória, e algum dia pede uma coisa ao grupo.</td></tr>
      <tr><td>Recua e dá a semana à astrônoma</td><td>Ela registra o suficiente para escrever um livro. O mar continua espelhando o céu errado, e a frota aprende a navegar em silêncio.</td><td>Alguém de longe, com razões piores, ouve falar do espelho.</td></tr>
      <tr><td>Derruba e fica com uma escama</td><td>Uma escama inteira vale uma peça de equipamento lendário, mas devolve o céu errado a quem a segura: por uma noite por mês, o portador vê estrelas que não existem.</td><td>Em algum lugar, outro universo ainda olha por aquela escama.</td></tr>
    </tbody>
  </table>

  ${caixa('Recompensa, e o que fazer com o tempo', `
    <ul>
      <li><strong>Pagamento:</strong> 1.200 Solares por pessoa do conselho, mais as redes de seda: o dobro da verba por sessão desse nível, que é de 600 Solares.</li>
      <li><strong>Saque:</strong> a tabela de Vaelthor está na Sessão; o Mestre rola e escolhe quem recebe cada linha. A tabela é do Mestre: o jogador só vê o item que chega na ficha.</li>
      <li><strong>XP:</strong> o XP da lenda (VD 45), mais 25% do próximo nível pela missão.</li>
      <li><strong>Se faltar tempo:</strong> comece na Cena 3, com a frota já no mar e o relógio em três partes.</li>
    </ul>`, true)}

  ${pe4('Página 4 de 4')}
</section>`;

export function aventuraLeviata() {
  return {
    arquivo: 'Aventura-A-Queda-do-Leviata-Espelhado',
    titulo: 'A Queda do Leviatã Espelhado · aventura de uma sessão',
    paginas: [leviata1(), leviata2(), leviata3(), leviata4()],
  };
}

export const AVENTURAS_DO_JARDIM = () => [aventuraMoinho(), aventuraLeilao(), aventuraRedemoinho(), aventuraLeviata()];
