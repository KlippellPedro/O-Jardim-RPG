import { limitarPontosDeRelacao, type PontosDeRelacao } from './pontosDeRelacao';

export const LIMITES_ATAQUE_COMBINADO = {
  participantesMinimos: 2,
  participantesMaximos: 4,
  reacoesExigidasPorParticipante: 1,
  alvosMaximos: 1,
} as const;

/** Sintonia: o menor número de Pontos de Relação que cada participante tem
 *  com o líder. Os degraus 2 e 3 repetem Ousado e Arriscado da Coreografia,
 *  para a mesa não aprender um vocabulário novo de bônus. */
export interface IDegrauDeSintonia {
  sintonia: PontosDeRelacao;
  titulo: string;
  ataque: string;
  dano: string;
  extra?: string;
}

export const DEGRAUS_DE_SINTONIA: readonly IDegrauDeSintonia[] = [
  { sintonia: 0, titulo: 'Desencontrados', ataque: 'Nenhum', dano: 'Nenhum' },
  { sintonia: 1, titulo: 'Entrosados', ataque: '+2', dano: 'Nenhum' },
  { sintonia: 2, titulo: 'Afinados', ataque: '+2', dano: '+2' },
  { sintonia: 3, titulo: 'Uníssono', ataque: 'Vantagem', dano: '+1 dado', extra: 'A Resistência do alvo vale uma vez só, contra a soma.' },
];

/** Sintonia do ataque pelos pontos que cada participante (fora o líder) tem
 *  com o líder. Quem não gasta o uso entra com 0. Sem ninguém, 0. */
export function sintoniaDoAtaque(pontosComOLider: readonly number[]): PontosDeRelacao {
  if (!pontosComOLider.length) return 0;
  return limitarPontosDeRelacao(Math.min(...pontosComOLider.map(limitarPontosDeRelacao)));
}

export const degrauDeSintonia = (sintonia: number): IDegrauDeSintonia =>
  DEGRAUS_DE_SINTONIA[limitarPontosDeRelacao(sintonia)];

/** Dano final do ataque: cada contribuição que acertou já com vulnerabilidade
 *  e redução percentual, e a Resistência do alvo. Em Uníssono ela sai uma vez
 *  da soma; nos outros degraus, de cada contribuição. */
export function danoDoAtaqueCombinado(danos: readonly number[], resistencia: number, sintonia: number): number {
  const rd = Math.max(0, Math.trunc(resistencia));
  if (limitarPontosDeRelacao(sintonia) >= 3) {
    return Math.max(0, danos.reduce((soma, dano) => soma + Math.max(0, dano), 0) - rd);
  }
  return danos.reduce((soma, dano) => soma + Math.max(0, Math.max(0, dano) - rd), 0);
}

const tabelaSintonia = DEGRAUS_DE_SINTONIA.map((degrau) => `
  <tr><td><strong>${degrau.sintonia}</strong></td><td>${degrau.titulo}</td><td>${degrau.ataque}</td><td>${degrau.dano}${degrau.extra ? `<small class="regras-mecanica">${degrau.extra}</small>` : ''}</td></tr>
`).join('');

export const REGRA_ATAQUES_COMBINADOS = {
  categoria: 'Combate e Mecânicas' as const,
  status: 'Regra oficial',
  resumo: 'Dois a quatro personagens atacam o mesmo alvo no mesmo instante. Quanto mais eles confiam no líder, maior o bônus: a Sintonia sai dos Pontos de Relação.',
  destaques: [
    ['Participantes', '2 a 4'],
    ['Custo', 'ação + reação'],
    ['Bônus', 'pela Sintonia, de 0 a 3'],
  ],
  corpo: `
    <p class="regras-lead">Um Ataque Combinado reúne ataques contra o mesmo alvo e resolve o dano ao mesmo tempo. Cada participante continua usando sua própria arma, magia, teste e recurso, e o que o grupo ganha por esperar o momento certo depende de quanto cada um confia em quem puxa o golpe.</p>

    <div class="regras-resumo">
      <ul>
        <li>Participam de ${LIMITES_ATAQUE_COMBINADO.participantesMinimos} a ${LIMITES_ATAQUE_COMBINADO.participantesMaximos} voluntários, todos contra o mesmo alvo, e cada um gasta a própria Ação Padrão e uma reação na preparação.</li>
        <li>O ataque é resolvido no primeiro turno do líder depois que todos se prepararam.</li>
        <li>A <strong>Sintonia</strong> é o menor número de <span class="regras-ref regras-ref--pontos-de-relacao">Pontos de Relação</span> que cada participante tem com o líder. Ela dá de +2 no ataque até vantagem e um dado a mais de dano em todas as contribuições.</li>
        <li>Se todas as contribuições errarem, todos os participantes ficam Expostos até o começo do próprio turno.</li>
        <li>Quem for derrubado antes da resolução perde a contribuição, e se o líder cair outro participante preparado assume.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Requisitos</h3>
    <ul class="regras-list">
      <li>Participam de ${LIMITES_ATAQUE_COMBINADO.participantesMinimos} a ${LIMITES_ATAQUE_COMBINADO.participantesMaximos} criaturas voluntárias que possam perceber e atingir o mesmo alvo.</li>
      <li>Cada participante precisa ter uma Ação Padrão e uma reação disponíveis.</li>
      <li>Somente ataques que causam dano a um único alvo podem entrar. Cura, área, invocação e controle são resolvidos separadamente.</li>
      <li>O grupo escolhe um líder. Ele define o momento da resolução, e é com ele que se conta a Sintonia.</li>
    </ul>

    <h3 class="regras-subtitle">Sintonia</h3>
    <p>Olhe quantos Pontos de Relação cada participante tem com o líder. O menor deles é a Sintonia do ataque, e o bônus dela vale para todas as contribuições, inclusive a do líder. O grupo anda no passo de quem confia menos.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Sintonia</th><th>Degrau</th><th>Ataque</th><th>Dano de cada acerto</th></tr></thead>
      <tbody>${tabelaSintonia}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Com Sintonia 1 ou mais,</strong> cada participante gasta um uso dos pontos que tem com o líder. Quem não quiser gastar entra com 0, e a Sintonia do ataque vira 0.</li>
      <li><strong>O dado a mais do Uníssono</strong> é do mesmo tipo que a contribuição já rola: o da arma, ou o da magia. Ele entra uma vez só e não multiplica no crítico. O +2 de dano dos Afinados segue a mesma regra.</li>
      <li><strong>Coreografia</strong> pode entrar em uma contribuição, mas o bônus no teste não soma com o da Sintonia: fica o maior.</li>
    </ul>

    <h3 class="regras-subtitle">Preparação e resolução</h3>
    <ol class="regras-steps">
      <li>No próprio turno, cada participante declara a contribuição, reserva a Ação Padrão e gasta a reação. Mana e custos que a ação exige na declaração são pagos nesse momento. Quem já gastou uma dessas ações não pode participar.</li>
      <li>O ataque é resolvido no primeiro turno do líder depois que todos se prepararem. A preparação de um participante expira no início do próximo turno dele. Alcance, linha de efeito e alvo precisam continuar válidos.</li>
      <li>Na resolução, cada participante consome munição ou carga usada pelo ataque e faz a própria rolagem, com o bônus da Sintonia. Nenhum custo é pago duas vezes.</li>
      <li>Cada acerto causa o dano normal da contribuição, mais o da Sintonia. Cada erro não causa dano e não devolve ações ou recursos.</li>
      <li>Aplique vulnerabilidade, redução percentual e Resistência separadamente a cada contribuição. Depois, some o dano final dos acertos. No Uníssono, aplique vulnerabilidade e redução percentual em cada contribuição, some, e só então tire a Resistência do alvo, uma vez.</li>
    </ol>

    <h3 class="regras-subtitle">Críticos, reações e efeitos</h3>
    <ul class="regras-list">
      <li>Cada contribuição verifica a própria margem de ameaça e o próprio multiplicador. O crítico de um participante não multiplica o dano dos demais.</li>
      <li>O alvo usa as reações que tiver disponíveis. Cada reação afeta apenas a contribuição que acionou seu gatilho, salvo texto expresso em contrário.</li>
      <li>Efeitos adicionais de acerto são resolvidos por contribuição, mas efeitos iguais não acumulam além do limite da própria condição.</li>
      <li><strong>Se todas as contribuições errarem,</strong> o Ataque Combinado falha: custos, ações e usos de pontos continuam gastos, e cada participante fica Exposto até o começo do próprio turno.</li>
    </ul>

    <h3 class="regras-subtitle">Interrupção</h3>
    <ul class="regras-list">
      <li>Uma contribuição é perdida se o participante ficar inconsciente, incapaz de agir ou sem um ataque válido antes da resolução.</li>
      <li>Se o líder perder a contribuição, outro participante preparado assume a liderança, e a Sintonia é contada de novo com ele. Se nenhum puder, o ataque é cancelado.</li>
      <li>Quando o ataque é cancelado antes da resolução, ações, reações, usos de pontos e custos pagos na declaração continuam gastos. Munição e cargas ainda não usadas são preservadas.</li>
      <li>Ver um participante cair durante a preparação cobra Sanidade de quem tem pontos com ele, como em Pontos de Relação.</li>
    </ul>

    <h3 class="regras-subtitle">Magias e Fluxos</h3>
    <ul class="regras-list">
      <li>Cada magia precisa alcançar a própria DT de conjuração e a defesa do alvo normalmente.</li>
      <li>Somar danos não altera tipo, alcance, área, duração ou efeito das magias.</li>
      <li>Ataque Combinado entre personagens não é Fusão de Fluxos (ver <span class="regras-ref regras-ref--rituais-selos">Rituais, Selos e Fusão</span>). Ele não cria um novo efeito.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Duda lidera. Rafa tem 3 pontos com ela e o Guerreiro tem 2: a Sintonia é 2, Afinados. Cada um gasta um uso com a Duda, e as três contribuições ganham +2 no ataque e +2 no dano. Se o Guerreiro tivesse 3 pontos com ela, seria Uníssono: vantagem, um dado a mais em cada acerto e a Resistência 5 do chefe tirada uma vez da soma, e não três.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">Ataque Combinado custa caro em tempo de mesa: quatro pessoas declaram, esperam, e só então resolvem. A Sintonia é o que faz a espera valer, e ela vem dos Pontos de Relação que a mesa conquistou na história.</p>

    <h3 class="regras-subtitle">Quando vale a pena</h3>
    <ul class="regras-list">
      <li>Com Sintonia 0, atacar separado quase sempre rende mais. Deixe a mesa descobrir isso: é o empurrão para eles cuidarem uns dos outros na história.</li>
      <li>Dos Afinados para cima, o golpe combinado é a melhor rodada do grupo contra um alvo único: chefe, elite, veículo. O Uníssono, com a Resistência tirada uma vez, é a resposta ao chefe blindado.</li>
      <li>Custa ação padrão, reação e um uso de ponto de cada participante. Um grupo que combina ataque numa rodada fica sem reação até o próprio turno seguinte, e isso é uma abertura sua.</li>
    </ul>

    <h3 class="regras-subtitle">Conduzir a resolução</h3>
    <ul class="regras-list">
      <li>Pergunte a Sintonia em voz alta antes das rolagens: quem lidera, e quantos pontos cada um tem com essa pessoa. Escolher o líder certo é parte da tática.</li>
      <li>A preparação de cada participante expira no início do próximo turno dele. Deixe o relógio correr de verdade: tirar o chefe do alcance é resposta legítima.</li>
      <li>Se todas errarem, o ataque falha, os usos ficam gastos e todos ficam Expostos. Avise que isso é possível antes da primeira vez que a mesa tentar.</li>
      <li>O alvo usa as reações que tiver, e cada uma afeta só a contribuição que a acionou. Um chefe com Bloqueio derruba uma contribuição, nunca a soma inteira.</li>
    </ul>

    <h3 class="regras-subtitle">O que fica de fora</h3>
    <p>Somar dano não é Fusão de Fluxos e não cria efeito novo. Se um jogador propuser que duas magias combinadas produzam um terceiro efeito, isso é decisão sua de mesa, tomada fora desta regra.</p>
  `,
};
