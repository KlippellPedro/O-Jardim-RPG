/** Conflito social.
 *
 * Um teste de Diplomacia resolve um pedido. O que esta página resolve é a
 * conversa em que a outra parte pode dizer não e tem motivo para dizer:
 * interrogatório, negociação, audiência, júri. A mecânica é uma disputa entre
 * duas contagens visíveis, Resistência e Paciência, com uma regra só para
 * todas as abordagens: sucesso tira Resistência, falha marca Paciência.
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
  /** O que o personagem faz, em uma frase simples. */
  descricao: string;
  teste: string;
  efeito: string;
  risco: string;
}

/** A conversa acaba na terceira falha. */
export const PACIENCIA_MAXIMA = 3;

/** Teto de ajuste vindo de Prestígio e Fama, igual ao da página de facções. */
export const AJUSTE_MAXIMO_REPUTACAO = 2;

export const NIVEIS_RESISTENCIA: readonly INivelResistencia[] = [
  {
    pontos: 3,
    quando: 'A pessoa até quer ajudar, só precisa de um bom motivo.',
    exemplo: 'Um escriba que não gosta do patrão; uma guarda que acha a ordem injusta.',
  },
  {
    pontos: 5,
    quando: 'Ceder custa alguma coisa a ela: dinheiro, tempo, posição ou risco.',
    exemplo: 'Uma mercadora que perde um bom contrato se vender para vocês; um capitão que vai ser punido se abrir o portão.',
  },
  {
    pontos: 8,
    quando: 'Ela tem uma posição pública ou um juramento a defender, ou está sendo forçada por alguém mais forte.',
    exemplo: 'Um juiz numa audiência pública; alguém que tem a família ameaçada por outra pessoa.',
  },
];

const REGRA_DO_TESTE = 'Sucesso tira 1 de Resistência. Falha marca 1 de Paciência.';

export const ABORDAGENS_SOCIAIS: readonly IAbordagemSocial[] = [
  {
    id: 'interesse',
    titulo: 'Convencer',
    descricao: 'Mostrar o que ela ganha ou perde com a decisão.',
    teste: 'Diplomacia',
    efeito: 'Tira 2 se o argumento usa algo que o grupo descobriu sobre ela.',
    risco: REGRA_DO_TESTE,
  },
  {
    id: 'pressao',
    titulo: 'Pressionar',
    descricao: 'Ameaçar ou intimidar a pessoa.',
    teste: 'Intimidação',
    efeito: 'Tira 2 quando a ameaça é verdadeira e a pessoa sabe disso.',
    risco: REGRA_DO_TESTE,
  },
  {
    id: 'mentira',
    titulo: 'Enganar',
    descricao: 'Contar uma mentira que ajude a convencer.',
    teste: 'Enganação',
    efeito: 'Se a mentira for descoberta depois, a pessoa volta atrás no que cedeu por causa dela.',
    risco: REGRA_DO_TESTE,
  },
  {
    id: 'prova',
    titulo: 'Provar',
    descricao: 'Mostrar um documento, objeto ou registro que prove o que vocês dizem.',
    teste: 'Investigação, Conhecimento ou Tecnologia',
    efeito: 'Tira 2. Cada prova vale uma vez.',
    risco: REGRA_DO_TESTE,
  },
  {
    id: 'status',
    titulo: 'Usar o nome',
    descricao: 'Usar o seu título, família, cargo ou fama para pesar na conversa.',
    teste: 'Nobreza ou Atuação',
    efeito: 'Tira 2 quando ela deve obediência ou respeito a esse nome: serve à sua casa, jurou à sua ordem ou depende de quem você representa.',
    risco: REGRA_DO_TESTE,
  },
  {
    id: 'oferta',
    titulo: 'Oferecer algo',
    descricao: 'Oferecer dinheiro, um favor ou algo de valor em troca.',
    teste: 'nenhum',
    efeito: 'Tira 1 de Resistência, se a oferta custa de verdade ao grupo: dinheiro, favor, segredo, Prestígio.',
    risco: 'Oferta pequena demais marca 1 de Paciência.',
  },
  {
    id: 'ceder',
    titulo: 'Ceder alguma coisa',
    descricao: 'Abrir mão de algo que o grupo queria para fechar o acordo.',
    teste: 'nenhum',
    efeito: 'Tira 2 de Resistência.',
    risco: 'A outra parte vai cobrar o que foi prometido.',
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
 * Sucesso tira `reducao` de Resistência (1, ou 2 com algo forte). Falha marca
 * `custoDePaciencia` (1). Repetir o mesmo argumento sem nada novo conta como
 * falha, e insistir no Limite da pessoa marca 1 a mais. */
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
  const sucesso = abordagem.sucesso && !abordagem.repetida;
  const reducao = sucesso ? Math.max(0, abordagem.reducao ?? 1) : 0;
  const enche = (sucesso ? 0 : Math.max(0, abordagem.custoDePaciencia ?? 1))
    + Number(Boolean(abordagem.tocouOLimite));

  const resistencia = Math.max(0, estado.resistencia - reducao);
  const paciencia = Math.min(PACIENCIA_MAXIMA, estado.paciencia + enche);
  // Paciência cheia vale primeiro: a pessoa levanta da mesa antes de ceder o
  // último ponto, e é por isso que insistir até o fim é uma aposta.
  const desfecho: DesfechoConflitoSocial = paciencia >= PACIENCIA_MAXIMA
    ? 'rompeu'
    : (resistencia === 0 ? 'cedeu' : null);

  return { resistencia, paciencia, desfecho };
}

const tabelaResistencia = NIVEIS_RESISTENCIA.map((nivel) => `
  <tr><td><strong>${nivel.pontos}</strong></td><td>${nivel.quando}<small class="regras-mecanica"><strong>Por exemplo:</strong> ${nivel.exemplo}</small></td></tr>
`).join('');

const tabelaAbordagens = ABORDAGENS_SOCIAIS.map((abordagem) => `
  <tr><td><strong>${abordagem.titulo}</strong></td><td>${abordagem.descricao}<small class="regras-mecanica"><strong>Teste:</strong> ${abordagem.teste}. ${abordagem.teste === 'nenhum' ? `${abordagem.efeito} ${abordagem.risco}` : `${abordagem.risco} ${abordagem.efeito}`}</small></td></tr>
`).join('');

export const REGRA_CONFLITO_SOCIAL: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: `Interrogatório, negociação e audiência resolvidos em rodadas: cada sucesso baixa a Resistência da outra pessoa, e ${PACIENCIA_MAXIMA} falhas encerram a conversa.`,
  destaques: [
    ['Resistência', '3, 5 ou 8'],
    ['Paciência', `${PACIENCIA_MAXIMA} falhas`],
    ['Por rodada', 'Uma abordagem por personagem'],
  ],
  corpo: `
    <p class="regras-lead">Um pedido simples se resolve com um teste só. Esta regra é para conversas difíceis, em que a outra pessoa tem motivo para dizer não: um interrogatório, uma negociação dura ou uma audiência.</p>

    <div class="regras-resumo">
      <ul>
        <li>A pessoa tem uma <strong>Resistência</strong> de 3, 5 ou 8. Quando ela chega a 0, a pessoa cede.</li>
        <li>Cada personagem faz uma abordagem por rodada: diz o que fala e rola a perícia. <strong>Sucesso tira 1 de Resistência</strong>, ou 2 com algo forte: uma prova, um segredo dela, uma ameaça verdadeira ou um nome que ela respeita.</li>
        <li><strong>Cada falha marca 1 de Paciência.</strong> Na ${PACIENCIA_MAXIMA}ª falha, a pessoa encerra a conversa.</li>
        <li>Oferecer algo de valor tira 1 de Resistência, e ceder algo que o grupo queria tira 2, sem teste.</li>
        <li>A pessoa nunca passa do próprio <strong>Limite</strong>, que é o que ela não faz de jeito nenhum.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">As contagens</h3>
    <ul class="regras-list">
      <li><strong>Resistência</strong> é o quanto falta para a pessoa ceder. Escolha pela tabela abaixo.</li>
      <li><strong>Paciência</strong> são ${PACIENCIA_MAXIMA} marcas, iguais para todo mundo. Cada falha do grupo marca uma.</li>
      <li><strong>Limite</strong> é o que ela não faz de jeito nenhum, como trair a família ou confessar um crime que a levaria à prisão. Mesmo com a Resistência a 0, ela não passa do Limite. Insistir nele marca 1 de Paciência.</li>
    </ul>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Resistência</th><th>Quando usar</th></tr></thead>
      <tbody>${tabelaResistencia}</tbody>
    </table></div>

    <h3 class="regras-subtitle">A rodada</h3>
    <ol class="regras-steps">
      <li>Cada personagem faz uma abordagem por rodada, na ordem que fizer sentido na conversa. Primeiro você diz o que o personagem fala, e só depois rola. Ajudar alguém segue as regras de <span class="regras-ref regras-ref--acoes-coletivas">Ações Coletivas</span>.</li>
      <li>A DT é a Padrão do nível do grupo. Use a Difícil quando a pessoa tem posição pública a defender ou já foi enganada antes.</li>
      <li>Sucesso tira 1 de Resistência, ou 2 com algo forte. Falha marca 1 de Paciência.</li>
      <li>Repetir o mesmo argumento sem trazer nada novo conta como falha.</li>
      <li>A outra pessoa responde: faz perguntas, pede garantias ou faz uma contraproposta. Pela resposta, o grupo vai descobrindo o que ela quer.</li>
    </ol>
    <p class="regras-note">O Prestígio com a facção da pessoa ajusta a rolagem de toda abordagem em no máximo ${AJUSTE_MAXIMO_REPUTACAO}, para cima ou para baixo, pela mesma regra de <span class="regras-ref regras-ref--mundo-faccoes">Prestígio, Fama e Procura</span>. Ele entra só na rolagem e nunca tira Resistência a mais.</p>

    <h3 class="regras-subtitle">Abordagens</h3>
    <p>Escolha a que combina com o que o personagem diz. Todas seguem a mesma regra: sucesso tira Resistência, falha marca Paciência.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Abordagem</th><th>O que é, e como se resolve</th></tr></thead>
      <tbody>${tabelaAbordagens}</tbody>
    </table></div>
    <p><strong>Ler a pessoa.</strong> No lugar de uma abordagem, um personagem pode prestar atenção nas reações dela e rolar Intuição. Sucesso: o Mestre diz o que ela quer de verdade ou qual é o Limite dela. Falha não marca Paciência, só gasta a vez.</p>

    <h3 class="regras-subtitle">Como termina</h3>
    <ul class="regras-list">
      <li><strong>Resistência a 0:</strong> a pessoa cede, dentro do que pode fazer e sem passar do Limite. Ela pode pedir algo em troca, e o grupo precisa cumprir.</li>
      <li><strong>Paciência cheia:</strong> a pessoa encerra a conversa e fica menos disposta do que antes. Para tentar de novo, vocês precisam de outra pessoa para falar, de uma prova nova ou de esperar um tempo.</li>
      <li><strong>Nenhuma das duas chegou ao fim:</strong> a conversa fica em aberto. Anotem as duas contagens: quando o assunto voltar, a conversa continua de onde parou.</li>
      <li><strong>Num interrogatório,</strong> cada ponto de Resistência que cai entrega uma informação na hora, e o grupo pode parar quando já tiver o que precisa.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>O grupo quer que o capitão abra o portão (Resistência 5). A Pop Star Convence e passa: 4. O Guerreiro Pressiona com uma ameaça vazia e falha: 1 de Paciência. A Detetive mostra a ordem assinada pelo governador, Prova e passa: tira 2, e a Resistência vai a 2. Na rodada seguinte, o grupo oferece 200 Lunaris pelo silêncio dele: 1. Mais um sucesso, e o portão abre.</p>
    </div>
    <p class="regras-note">Essas rolagens não controlam a mente de ninguém. A pessoa continua decidindo por conta própria, e por isso existe o Limite.</p>
  `,
  corpoMestre: `
    <p class="regras-lead">Escreva três coisas antes de a conversa começar: quanto de Resistência, qual o Limite e o que essa pessoa quer de verdade. Com as três na mão, você consegue improvisar a conversa inteira sem travar.</p>

    <h3 class="regras-subtitle">Escolher os números</h3>
    <ul class="regras-list">
      <li>Resistência 3 é a maioria das conversas de mesa. Guarde o 8 para quem tem a vida montada em cima de dizer não, porque uma cena de 8 pontos ocupa boa parte da sessão.</li>
      <li>A Paciência é a mesma para todo mundo: ${PACIENCIA_MAXIMA} falhas. O que muda de pessoa para pessoa é a DT e o que conta como algo forte para ela: um juiz respeita prova, um contrabandista respeita dinheiro.</li>
      <li>O Limite pode ser descoberto. Quando o grupo esbarrar nele, diga com todas as letras. A cena fica melhor quando eles sabem onde está a parede.</li>
    </ul>

    <h3 class="regras-subtitle">Mostrar as contagens no corpo</h3>
    <ul class="regras-list">
      <li><strong>Resistência caindo:</strong> descruza os braços; puxa uma cadeira para perto; tira o chapéu; serve a própria bebida e depois a de vocês; começa uma frase com "olha".</li>
      <li><strong>Paciência acabando:</strong> olha para a janela; responde com uma palavra só; chama o guarda pelo nome, sem pedir nada; empurra o copo para longe; levanta, anda até a porta e volta.</li>
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
      <li>Desenhe as ${PACIENCIA_MAXIMA} marcas de Paciência à vista de todos. O relógio "A negociação azeda", no Guia do Mestre, já traz o que cada marca parece.</li>
      <li>Ceder é a forma mais barata de o grupo ganhar: cada concessão vira gancho para uma sessão futura, porque alguém vai cobrar.</li>
      <li>O resultado mexe em Prestígio com a facção da pessoa, para cima ou para baixo, pela tabela de Prestígio e Fama. Diga isso na hora de fechar o acordo.</li>
      <li>Se a conversa azedar e virar luta, a Paciência cheia é um bom gatilho para a primeira rodada começar com o grupo Surpreendido.</li>
    </ul>
  `,
};
