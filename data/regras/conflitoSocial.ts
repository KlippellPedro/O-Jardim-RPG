/** Conflito social.
 *
 * Um teste de Diplomacia resolve um pedido. O que esta página resolve é a
 * conversa em que a outra parte pode dizer não e tem motivo para dizer:
 * interrogatório, negociação, audiência, júri. A mecânica é uma disputa entre
 * duas contagens visíveis, Resistência e Paciência, para que a mesa consiga
 * ver a conversa andando sem que o Mestre precise decidir no escuro.
 */
import type { RegraTopicoDe } from './tipos';

export interface INivelResistencia {
  pontos: number;
  quando: string;
  exemplo: string;
}

export interface IAbordagemSocial {
  id: string;
  titulo: string;
  /** Uma fala de exemplo, para o jogador lembrar que abordagem é o que o
   *  personagem diz, e não só o nome da perícia. */
  fala: string;
  teste: string;
  efeito: string;
  risco: string;
}

/** A conversa acaba quando a Paciência enche. Quatro partes: o mesmo tamanho
 *  do relógio curto do Guia do Mestre. */
export const PACIENCIA_MAXIMA = 4;

/** Teto de ajuste vindo de Prestígio e Fama, igual ao da página de facções. */
export const AJUSTE_MAXIMO_REPUTACAO = 2;

export const NIVEIS_RESISTENCIA: readonly INivelResistencia[] = [
  {
    pontos: 3,
    quando: 'A pessoa até quer ajudar, e só precisa de um motivo que a proteja depois.',
    exemplo: 'Um escriba que odeia o patrão e está esperando a desculpa certa; uma guarda que acha a ordem injusta e tem filho para criar.',
  },
  {
    pontos: 5,
    quando: 'Ceder custa alguma coisa concreta a ela: dinheiro, tempo, posição ou risco.',
    exemplo: 'Uma mercadora que perde o contrato do ano se vender para vocês; um capitão que vai responder pelo portão que abrir.',
  },
  {
    pontos: 8,
    quando: 'A posição dela é pública, jurada, ou foi imposta por alguém mais forte.',
    exemplo: 'Um juiz numa audiência cheia de gente olhando; alguém com a família nas mãos de terceiros, que sorri para não chorar.',
  },
];

export const ABORDAGENS_SOCIAIS: readonly IAbordagemSocial[] = [
  {
    id: 'interesse',
    titulo: 'Mostrar o interesse dela',
    fala: 'Pense no que acontece com o seu negócio se ele ganhar essa disputa.',
    teste: 'Diplomacia',
    efeito: 'Tira 1 de Resistência. Tira 2 se o argumento usa algo que o grupo descobriu sobre ela.',
    risco: 'Falha só custa a rodada.',
  },
  {
    id: 'pressao',
    titulo: 'Pressionar',
    fala: 'Eu sei onde a sua irmã mora. E você sabe que eu sei.',
    teste: 'Intimidação',
    efeito: 'Tira 1 de Resistência, e 2 quando a ameaça é verdadeira e a pessoa sabe disso.',
    risco: 'Falha enche 1 de Paciência. Ameaça vazia enche 1 mesmo em sucesso.',
  },
  {
    id: 'mentira',
    titulo: 'Mentir com utilidade',
    fala: 'O conselho já decidiu. A gente só veio avisar por educação.',
    teste: 'Enganação contra Intuição',
    efeito: 'Tira 1 de Resistência agora.',
    risco: 'Mentira descoberta depois devolve toda a Resistência que ela tirou.',
  },
  {
    id: 'prova',
    titulo: 'Apresentar prova',
    fala: 'Esta carta tem a sua letra e o seu selo. Quer ler em voz alta, ou eu leio?',
    teste: 'Investigação, Conhecimento ou Tecnologia',
    efeito: 'Tira 2 de Resistência. Vale uma vez por prova.',
    risco: 'Prova fraca enche 1 de Paciência.',
  },
  {
    id: 'ler',
    titulo: 'Ler a pessoa',
    fala: 'Você olhou para a porta duas vezes quando eu falei do porto.',
    teste: 'Intuição',
    efeito: 'Não tira Resistência. Em troca, entrega o que ela quer de verdade ou revela o Limite dela.',
    risco: 'Falha entrega uma leitura errada, que o Mestre diz com a mesma convicção.',
  },
  {
    id: 'status',
    titulo: 'Puxar posição ou nome',
    fala: 'Minha família serve a esta casa há três gerações. Pergunte ao seu pai.',
    teste: 'Nobreza ou Atuação',
    efeito: 'Tira 1 de Resistência, e mais 1 com Prestígio positivo na facção dela.',
    risco: 'Contra quem odeia o seu nome, enche 1 de Paciência.',
  },
  {
    id: 'oferta',
    titulo: 'Oferecer algo concreto',
    fala: 'A dívida com o Banco some amanhã, e ninguém precisa saber de onde veio o dinheiro.',
    teste: 'Sem teste',
    efeito: 'Tira 1 de Resistência por oferta que custe de verdade ao grupo: dinheiro, favor, segredo, Prestígio.',
    risco: 'Oferta pequena demais enche 1 de Paciência e queima a ideia.',
  },
  {
    id: 'ceder',
    titulo: 'Ceder alguma coisa',
    fala: 'Fique com a carga. A gente só quer o nome de quem mandou.',
    teste: 'Sem teste',
    efeito: 'Tira 2 de Resistência quando o grupo abre mão de algo que queria nesta negociação.',
    risco: 'A concessão vale, e a outra parte vai cobrar exatamente o que foi prometido.',
  },
];

export interface IEstadoConflitoSocial {
  resistencia: number;
  paciencia: number;
}

export type DesfechoConflitoSocial = 'cedeu' | 'rompeu' | null;

export interface IResultadoAbordagem extends IEstadoConflitoSocial {
  desfecho: DesfechoConflitoSocial;
}

/** Aplica uma abordagem ao estado da conversa.
 *
 * `reducao` é o que a abordagem tira de Resistência em caso de sucesso, e
 * `custoDePaciencia` é o que ela enche quando dá errado. Repetir a mesma
 * abordagem sem trazer nada novo e tocar no Limite da pessoa enchem uma parte
 * cada, em sucesso ou em falha: é aí que a conversa azeda. */
export function aplicarAbordagem(
  estado: IEstadoConflitoSocial,
  abordagem: {
    sucesso: boolean;
    reducao?: number;
    custoDePaciencia?: number;
    repetida?: boolean;
    tocouOLimite?: boolean;
  },
): IResultadoAbordagem {
  const reducao = abordagem.sucesso ? Math.max(0, abordagem.reducao ?? 1) : 0;
  const enche = (abordagem.sucesso ? 0 : Math.max(0, abordagem.custoDePaciencia ?? 0))
    + Number(Boolean(abordagem.repetida))
    + Number(Boolean(abordagem.tocouOLimite));

  const resistencia = Math.max(0, estado.resistencia - reducao);
  const paciencia = Math.min(PACIENCIA_MAXIMA, estado.paciencia + enche);
  // Paciência cheia vale primeiro: a pessoa levanta da mesa antes de ceder o
  // último ponto, e é por isso que pressionar até o fim é uma aposta.
  const desfecho: DesfechoConflitoSocial = paciencia >= PACIENCIA_MAXIMA
    ? 'rompeu'
    : (resistencia === 0 ? 'cedeu' : null);

  return { resistencia, paciencia, desfecho };
}

const tabelaResistencia = NIVEIS_RESISTENCIA.map((nivel) => `
  <tr><td><strong>${nivel.pontos}</strong></td><td>${nivel.quando}<small class="regras-mecanica"><strong>Por exemplo:</strong> ${nivel.exemplo}</small></td></tr>
`).join('');

const tabelaAbordagens = ABORDAGENS_SOCIAIS.map((abordagem) => `
  <tr><td><strong>${abordagem.titulo}</strong></td><td>“${abordagem.fala}”<small class="regras-mecanica"><strong>Teste:</strong> ${abordagem.teste}. <strong>Sucesso:</strong> ${abordagem.efeito} <strong>Risco:</strong> ${abordagem.risco}</small></td></tr>
`).join('');

export const REGRA_CONFLITO_SOCIAL: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Interrogatório, negociação e audiência resolvidos em rodadas, com a Resistência de quem está do outro lado descendo a cada bom argumento e a Paciência dele subindo a cada palavra errada.',
  destaques: [
    ['Resistência', '3, 5 ou 8'],
    ['Paciência', `${PACIENCIA_MAXIMA} partes`],
    ['Por rodada', 'Uma abordagem por personagem'],
  ],
  corpo: `
    <p class="regras-lead">Tem conversa que é luta. A pessoa do outro lado pode dizer não, tem motivo para dizer, e cada palavra errada fecha uma porta. Um pedido simples continua sendo um teste só. Esta página é para as outras conversas: arrancar a verdade de um preso, fechar preço com quem não precisa vender, convencer um conselho que já decidiu antes de vocês entrarem.</p>

    <h3 class="regras-subtitle">As duas contagens</h3>
    <ul class="regras-list">
      <li><strong>Resistência</strong> é o quanto falta para a pessoa ceder. Ela desce com argumento, prova, pressão e concessão, e a mesa vê isso acontecer: a pessoa senta, serve uma bebida, baixa a voz.</li>
      <li><strong>Paciência</strong> é o quanto falta para ela encerrar a conversa. São ${PACIENCIA_MAXIMA} partes, e elas enchem com erro, ameaça vazia, repetição e insistência no assunto errado. A mesa vê isso também: braços cruzados, um olhar para o guarda, respostas de uma palavra.</li>
      <li><strong>Limite</strong> é a única coisa que ela não faz de jeito nenhum. Entregar o próprio filho, trair o juramento, assinar a própria prisão. Resistência zerada nunca atravessa o Limite.</li>
    </ul>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Resistência</th><th>Quando usar</th></tr></thead>
      <tbody>${tabelaResistencia}</tbody>
    </table></div>

    <h3 class="regras-subtitle">A rodada</h3>
    <ol class="regras-steps">
      <li>Cada personagem faz uma abordagem por rodada, na ordem que a conversa pedir. Primeiro diz o que fala, com a voz do personagem, e só depois rola. Ajudar alguém segue as regras de Ações Coletivas.</li>
      <li>A DT é a Padrão do nível do grupo. Use a Difícil quando a pessoa tem posição pública a defender ou já foi enganada antes.</li>
      <li>Sucesso tira Resistência. Falha custa a rodada, e as abordagens agressivas ainda enchem a Paciência.</li>
      <li>Repetir a mesma abordagem sem trazer nada novo enche 1 de Paciência, mesmo quando o teste passa.</li>
      <li>A outra parte responde. Ela pergunta, pede garantia, chantageia de volta, e é nessa resposta que o grupo descobre o que ela quer.</li>
    </ol>
    <p class="regras-note">Prestígio e Fama ajustam a rolagem em no máximo ${AJUSTE_MAXIMO_REPUTACAO}, para cima ou para baixo, pela mesma regra de Prestígio e Fama. Reputação abre a porta, e o acordo ainda precisa ser conquistado lá dentro.</p>

    <h3 class="regras-subtitle">Abordagens</h3>
    <p>Cada abordagem traz uma fala de exemplo e, embaixo, como se resolve. A fala serve de faísca: diga a sua, do jeito do seu personagem.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Abordagem</th><th>Uma fala, e como se resolve</th></tr></thead>
      <tbody>${tabelaAbordagens}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Como termina</h3>
    <ul class="regras-list">
      <li><strong>Resistência a 0:</strong> a pessoa cede do jeito dela, dentro do que ela pode e dentro do Limite. Ela diz o que quer em troca, e cumprir isso passa a ser problema do grupo.</li>
      <li><strong>Paciência cheia:</strong> a conversa acaba pior do que começou. A cadeira arrasta, a porta fecha, e reabrir exige uma pessoa nova, uma prova nova ou tempo.</li>
      <li><strong>Ninguém chegou ao fim:</strong> a conversa fica em aberto. Guardem as duas contagens: quando o assunto voltar, ele volta de onde parou.</li>
      <li><strong>Num interrogatório,</strong> cada ponto de Resistência que cai entrega uma informação na hora. A verdade sai em pedaços, e o grupo decide quando já ouviu o bastante.</li>
    </ul>
    <p class="regras-note">Nenhuma dessas rolagens controla a mente de ninguém. Elas mudam a posição de uma pessoa que continua decidindo por conta própria, e é por isso que o Limite existe.</p>
  `,
  corpoMestre: `
    <p class="regras-lead">Escreva três coisas antes de a conversa começar: quanto de Resistência, qual o Limite e o que essa pessoa quer de verdade. Com as três na mão, você improvisa a cena inteira sem travar, e a pessoa do outro lado da mesa parece ter uma vida inteira atrás dela.</p>

    <h3 class="regras-subtitle">Escolher os números</h3>
    <ul class="regras-list">
      <li>Resistência 3 é a maioria das conversas de mesa. Guarde o 8 para quem tem a vida montada em cima de dizer não, porque uma cena de 8 pontos ocupa boa parte da sessão.</li>
      <li>A Paciência é a mesma para todo mundo. Quem muda o ritmo é o que enche ela, então escolha os gatilhos daquela pessoa: um juiz perde a paciência com desrespeito, um contrabandista perde com perguntas sobre nomes.</li>
      <li>O Limite pode ser descoberto. Quando o grupo esbarrar nele, diga com todas as letras. A cena fica melhor quando eles sabem onde está a parede.</li>
    </ul>

    <h3 class="regras-subtitle">Mostrar as contagens no corpo</h3>
    <ul class="regras-list">
      <li><strong>Resistência caindo:</strong> descruza os braços; puxa uma cadeira para perto; tira o chapéu; serve a própria bebida e depois a de vocês; começa uma frase com "olha".</li>
      <li><strong>Paciência enchendo:</strong> olha para a janela; responde com uma palavra só; chama o guarda pelo nome, sem pedir nada; empurra o copo para longe; levanta, anda até a porta e volta.</li>
      <li><strong>Encostando no Limite:</strong> a voz some, os olhos ficam molhados ou duros, e a pessoa repete a mesma frase duas vezes. Deixe um silêncio depois.</li>
    </ul>

    <h3 class="regras-subtitle">Conduzir</h3>
    <ul class="regras-list">
      <li>Interprete cada ponto perdido. Se a contagem cai e nada muda na interpretação, a mesa para de acreditar na mecânica.</li>
      <li>Peça o argumento antes do dado. O jogador diz o que fala, e só então rola. Sem isso, a cena vira quatro rolagens de Diplomacia em silêncio.</li>
      <li>Deixe a outra parte contra-atacar: ela pede algo, oferece menos, ou solta uma informação que o grupo preferia não ouvir na frente de quem está junto.</li>
      <li>Falha nunca encerra a história. Ela custa Paciência, tempo, uma concessão a mais ou a chance de conseguir aquilo de graça.</li>
    </ul>

    <h3 class="regras-subtitle">Onde isso se liga</h3>
    <ul class="regras-list">
      <li>A Paciência é um relógio de quatro partes, e vale desenhar do mesmo jeito, à vista de todos. O relógio "A negociação azeda", no Guia do Mestre, já traz o que cada parte parece.</li>
      <li>Ceder é a forma mais barata de o grupo ganhar: cada concessão vira gancho para uma sessão futura, porque alguém vai cobrar.</li>
      <li>O resultado mexe em Prestígio com a facção da pessoa, para cima ou para baixo, pela tabela de Prestígio e Fama. Diga isso na hora de fechar o acordo.</li>
      <li>Se a conversa azedar e virar luta, a Paciência cheia é um bom gatilho para a primeira rodada começar com o grupo Surpreendido.</li>
    </ul>
  `,
};
