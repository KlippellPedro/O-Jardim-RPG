/** Infiltração.
 *
 * Entrar onde não se é bem-vindo, pegar o que se veio buscar e sair antes que
 * alguém perceba. Mesmo molde do Conflito Social: duas contagens à vista da
 * mesa. As Etapas dizem quanto falta até o objetivo, e o Alerta é o relógio do
 * lugar (o mesmo "A guarda percebe a invasão" do Guia do Mestre, com o tamanho
 * escolhido pela vigilância). Fechou o Alerta, a infiltração acabou e a cena
 * vira fuga, luta ou rendição.
 */
import type { RegraTopicoDe } from './tipos';

export type Vigilancia = 'descuidada' | 'vigiada' | 'fechada';

export interface INivelDeVigilancia {
  id: Vigilancia;
  titulo: string;
  /** Partes do relógio de Alerta. */
  alerta: number;
  exemplos: string;
}

export const NIVEIS_DE_VIGILANCIA: readonly INivelDeVigilancia[] = [
  { id: 'descuidada', titulo: 'Descuidada', alerta: 8, exemplos: 'Armazém de porto, casa de campo, festa barulhenta, acampamento de bandidos.' },
  { id: 'vigiada', titulo: 'Vigiada', alerta: 6, exemplos: 'Mansão com guardas, quartel em tempo de paz, templo à noite, sede de guilda.' },
  { id: 'fechada', titulo: 'Fechada', alerta: 4, exemplos: 'Cofre do Banco Lunar, palácio em alerta, prisão, laboratório da A.X.I.S.' },
];

export interface ITamanhoDeLugar {
  id: string;
  titulo: string;
  /** Etapas até o objetivo, sem contar a saída. */
  etapas: number;
}

export const TAMANHOS_DE_LUGAR: readonly ITamanhoDeLugar[] = [
  { id: 'pequeno', titulo: 'Pequeno', etapas: 2 },
  { id: 'medio', titulo: 'Médio', etapas: 3 },
  { id: 'grande', titulo: 'Grande', etapas: 4 },
];

/** A saída é sempre uma etapa a mais, depois do objetivo. */
export const ETAPAS_DE_SAIDA = 1;

export interface IAbordagemDeInfiltracao {
  id: string;
  titulo: string;
  cena: string;
  teste: string;
  efeito: string;
  falha: string;
}

export const ABORDAGENS_DE_INFILTRACAO: readonly IAbordagemDeInfiltracao[] = [
  {
    id: 'escondido',
    titulo: 'Passar escondido',
    cena: 'Passar sem ser visto, aproveitando as sombras e a hora em que ninguém está olhando.',
    teste: 'Teste de Grupo de Furtividade',
    efeito: 'O grupo avança uma etapa.',
    falha: 'O Alerta sobe 1.',
  },
  {
    id: 'disfarce',
    titulo: 'Ser quem não é',
    cena: 'Se passar por alguém que pode estar ali, como um criado ou um guarda.',
    teste: 'Enganação ou Atuação; o Kit de Disfarce dá vantagem',
    efeito: 'Avança uma etapa, e o disfarce vale nas próximas onde aquele papel é esperado.',
    falha: 'O Alerta sobe 1 e o disfarce fica queimado daqui para frente.',
  },
  {
    id: 'abrir',
    titulo: 'Abrir caminho',
    cena: 'Abrir uma porta, tranca ou selo para passar por um caminho sem vigia.',
    teste: 'Ladinagem (Kit de Arrombamento dá vantagem), Misticismo para selo, Tecnologia para tranca A.X.I.S',
    efeito: 'Avança uma etapa por uma porta que ninguém vigia.',
    falha: 'O Alerta sobe 1. Falhar por 5 ou mais dispara o que protegia a porta.',
  },
  {
    id: 'calar',
    titulo: 'Calar alguém',
    cena: 'Derrubar ou imobilizar alguém sem fazer barulho.',
    teste: 'Luta ou Atletismo contra 10 + Reflexos do alvo, com vantagem se ele não viu você',
    efeito: 'Avança uma etapa e tira aquela pessoa do caminho.',
    falha: 'Vira combate ali mesmo, e o Alerta sobe 2.',
  },
  {
    id: 'distrair',
    titulo: 'Distrair',
    cena: 'Chamar a atenção dos guardas para outro lugar.',
    teste: 'Atuação, Enganação ou o teste de uma magia',
    efeito: 'Não avança, e a próxima abordagem desta etapa ganha vantagem.',
    falha: 'O Alerta sobe 1, porque alguém foi ver o que era e voltou desconfiado.',
  },
  {
    id: 'estudar',
    titulo: 'Estudar o caminho',
    cena: 'Observar a ronda, o caminho ou a troca de turno antes de agir.',
    teste: 'Investigação ou Percepção',
    efeito: 'Não avança. Revela o que há na próxima etapa (guarda, armadilha, rota) e dá vantagem na abordagem seguinte. Uma vez por etapa.',
    falha: 'Só custa o tempo.',
  },
];

export interface IEstadoDeInfiltracao {
  /** Etapas que ainda faltam, contando a saída. */
  etapas: number;
  alerta: number;
  alertaMaximo: number;
}

export type DesfechoDeInfiltracao = 'saiu' | 'alarme' | null;

/** Estado do lugar pelo Alerta: metade pintada deixa os guardas desconfiados. */
export function estadoDoAlerta(alerta: number, alertaMaximo: number): 'calmo' | 'desconfianca' | 'alarme' {
  if (alerta >= alertaMaximo) return 'alarme';
  return alerta >= Math.ceil(alertaMaximo / 2) ? 'desconfianca' : 'calmo';
}

/** Resolve uma rodada.
 *
 * Sucesso avança uma etapa. Falha sobe o Alerta (2 na falha crítica). Na
 * falha, o grupo pode escolher forçar a passagem: avança mesmo assim e o
 * Alerta sobe 1 a mais. `custoDeAlerta` cobre abordagens que sobem mais que 1
 * na falha, como Calar alguém. */
export function resolverRodadaDeInfiltracao(
  estado: IEstadoDeInfiltracao,
  rodada: { sucesso: boolean; falhaCritica?: boolean; forcar?: boolean; avanca?: boolean; custoDeAlerta?: number },
): IEstadoDeInfiltracao & { desfecho: DesfechoDeInfiltracao } {
  const avanca = rodada.avanca ?? true;
  let { etapas, alerta } = estado;
  if (rodada.sucesso) {
    if (avanca) etapas -= 1;
  } else {
    alerta += (rodada.custoDeAlerta ?? 1) + (rodada.falhaCritica ? 1 : 0);
    if (rodada.forcar && avanca) {
      etapas -= 1;
      alerta += 1;
    }
  }
  etapas = Math.max(0, etapas);
  alerta = Math.min(estado.alertaMaximo, alerta);
  const desfecho: DesfechoDeInfiltracao = alerta >= estado.alertaMaximo ? 'alarme' : etapas === 0 ? 'saiu' : null;
  return { etapas, alerta, alertaMaximo: estado.alertaMaximo, desfecho };
}

// ------------------------------------------------------------------ página

const tabelaVigilancia = NIVEIS_DE_VIGILANCIA.map((nivel) => `
  <tr><td><strong>${nivel.titulo}</strong></td><td>${nivel.alerta} partes</td><td>${nivel.exemplos}</td></tr>
`).join('');

const tabelaAbordagens = ABORDAGENS_DE_INFILTRACAO.map((abordagem) => `
  <tr>
    <td><strong>${abordagem.titulo}</strong></td>
    <td>${abordagem.cena}<small class="regras-mecanica"><strong>Teste:</strong> ${abordagem.teste}. <strong>Sucesso:</strong> ${abordagem.efeito} <strong>Falha:</strong> ${abordagem.falha}</small></td>
  </tr>
`).join('');

const etapasDoTamanho = TAMANHOS_DE_LUGAR.map((tamanho) => `${tamanho.etapas} num lugar ${tamanho.titulo.toLowerCase()}`).join(', ');

export const REGRA_INFILTRACAO: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Entrar escondido num lugar, pegar o que veio buscar e sair sem ser pego. A cena usa duas contagens: as Etapas até o objetivo e o Alerta do lugar.',
  destaques: [
    ['Etapas', '2 a 4, mais a saída'],
    ['Alerta', '4, 6 ou 8 partes'],
    ['Teste base', 'Furtividade em grupo'],
  ],
  corpo: `
    <p class="regras-lead">Use esta regra quando o grupo precisa entrar escondido num lugar vigiado, como uma mansão, um quartel ou um cofre. O caminho é dividido em etapas, e a cada rodada o grupo tenta passar por mais uma sem ser percebido.</p>

    <div class="regras-resumo">
      <ul>
        <li>O lugar tem <strong>Etapas</strong> até o objetivo (${etapasDoTamanho}) e mais ${ETAPAS_DE_SAIDA} de saída.</li>
        <li>O lugar tem um <strong>Alerta</strong> de 4, 6 ou 8 partes, conforme a vigilância. Com metade pintada os guardas desconfiam, e cheio vira alarme.</li>
        <li>A cada rodada o grupo escolhe uma abordagem para a etapa e testa. Sucesso avança; falha sobe o Alerta.</li>
        <li>Na falha, o grupo pode forçar a passagem: avança mesmo assim, e o Alerta sobe 1 a mais.</li>
        <li>Saiu com o objetivo, a infiltração deu certo. Alarme vira fuga, luta ou rendição.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">O lugar</h3>
    <p>Antes da primeira rodada, o Mestre diz o tamanho do lugar e a vigilância dele, e o grupo pode tentar descobrir mais com uma noite de observação, um mapa comprado ou alguém de dentro.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Vigilância</th><th>Alerta</th><th>Onde</th></tr></thead>
      <tbody>${tabelaVigilancia}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Etapas:</strong> ${etapasDoTamanho}. A saída é sempre mais ${ETAPAS_DE_SAIDA}, depois do objetivo.</li>
      <li><strong>DT:</strong> a Padrão do nível do lugar. A etapa do objetivo, e todas num lugar Fechado, usam a Difícil.</li>
      <li><strong>Preparação ajuda:</strong> uma planta do lugar, um uniforme roubado, um guarda subornado. Cada preparo bom dá vantagem numa etapa ou apaga 1 de Alerta antes de começar.</li>
    </ul>

    <h3 class="regras-subtitle">A rodada</h3>
    <ol class="regras-steps">
      <li>O Mestre descreve o que há entre o grupo e a próxima etapa: um pátio aberto, um corredor com ronda, uma porta trancada, uma sala cheia de gente.</li>
      <li>O grupo escolhe uma abordagem e quem vai liderar, e diz como vai fazer.</li>
      <li>Resolvam o teste. Os outros podem Ajudar, como em <span class="regras-ref regras-ref--acoes-coletivas">Ações Coletivas</span>, quando a abordagem permite.</li>
      <li>Sucesso avança uma etapa. Sucesso por 10 ou mais avança e o grupo ganha algo a mais, como um atalho, uma chave ou uma informação.</li>
      <li>Falha sobe o Alerta em 1, e a falha crítica em 2. O grupo escolhe se fica onde está ou força a passagem.</li>
    </ol>

    <h3 class="regras-subtitle">Abordagens</h3>
    <p>Diga como você faz antes de rolar. Magia, item e habilidade de classe também contam como abordagem, com o teste que já usam.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Abordagem</th><th>O que é, e como se resolve</th></tr></thead>
      <tbody>${tabelaAbordagens}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Em Passar escondido, todo mundo testa:</strong> o grupo passa se pelo menos metade passar. Armadura com penalidade atrapalha aqui.</li>
      <li><strong>O grupo pode se separar.</strong> Cada parte vira uma infiltração com as suas próprias Etapas, e o Alerta continua um só, porque o lugar é um só.</li>
      <li><strong>Armadilhas no caminho</strong> seguem <span class="regras-ref regras-ref--perigos">Perigos do Ambiente</span>. Disparar uma sobe o Alerta em 1.</li>
    </ul>

    <h3 class="regras-subtitle">O Alerta</h3>
    <ul class="regras-list">
      <li><strong>Calmo:</strong> menos da metade pintada. O lugar segue a rotina.</li>
      <li><strong>Desconfiança:</strong> metade ou mais. Os guardas ficam atentos, e todas as etapas passam a usar a DT Difícil.</li>
      <li><strong>Alarme:</strong> cheio. O lugar inteiro sabe. O grupo escolhe entre fugir (uma <span class="regras-ref regras-ref--perseguicao-a-pe">Perseguição a Pé</span> que começa em Curta), lutar (com reforço chegando a cada rodada) ou se render.</li>
      <li><strong>O Alerta só desce</strong> com uma ação concreta, como esconder alguém desacordado, devolver uma chave ou convencer um guarda de que não foi nada. Cada ação dessas leva uma rodada inteira e apaga 1.</li>
      <li><strong>Rastro na saída:</strong> se o objetivo deixou marca (cofre aberto, refém levado, corpo no chão), o Alerta sobe 1 quando a saída começa.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>O grupo invade uma mansão Vigiada de tamanho Médio: 3 etapas, mais a saída, e Alerta de 6. No jardim, passam escondidos. No corredor, a porta do escritório resiste e a Ladinagem falha: Alerta 1. Eles forçam a passagem chutando a porta, e o Alerta vai a 2. No escritório, a etapa do objetivo, a Pop Star distrai o mordomo (a etapa não avança, e a próxima abordagem ganha vantagem), e na rodada seguinte a Ladinagem com vantagem abre o cofre. Na saída, o cofre vazio deixa rastro (Alerta 3, Desconfiança) e o muro do jardim agora pede a DT Difícil.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">Infiltração é a cena em que o grupo mais planeja, e o plano é metade da diversão. Recompense o preparo, deixe o lugar reagir à vista e não peça Furtividade a cada passo: uma etapa é um pedaço inteiro do caminho.</p>

    <h3 class="regras-subtitle">Quando usar</h3>
    <ul class="regras-list">
      <li>Uma porta só, com um guarda, é um teste, e a cena segue. Use as Etapas quando o caminho tem várias partes e o lugar pode acordar.</li>
      <li>Escolha a vigilância pelo que o lugar guarda e pelo momento. A mansão é Vigiada numa noite comum e Fechada na noite do leilão.</li>
      <li>O relógio "A guarda percebe a invasão" do Guia é exatamente um Alerta de 4 partes, com os sinais da ficção prontos para cada uma.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar</h3>
    <ul class="regras-list">
      <li>Contra a DT Padrão, um grupo com um especialista e Ajuda passa em uns dois terços das rodadas. Num lugar Médio e Vigiado, isso costuma terminar com o Alerta entre 2 e 4: tenso, sem alarme.</li>
      <li>O Teste de Grupo de Furtividade pune o grupo de armadura pesada. Se a mesa tem um Guerreiro e uma Ninja, a abordagem escolhida diz muito: deixe a escolha com eles.</li>
      <li>Forçar a passagem é a decisão mais interessante da cena. Lembre a mesa dela na primeira falha.</li>
    </ul>

    <h3 class="regras-subtitle">Mostrar o Alerta</h3>
    <ul class="regras-list">
      <li>Cada parte pintada aparece na ficção: uma vela acesa num quarto que estava escuro, um guarda que para e escuta, um cachorro que late uma vez só.</li>
      <li>Diga em voz alta o que acontece quando o Alerta encher, antes da primeira rodada. Saber o que está em jogo deixa a cena mais tensa.</li>
    </ul>
  `,
};
