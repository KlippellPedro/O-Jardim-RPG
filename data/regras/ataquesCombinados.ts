export const LIMITES_ATAQUE_COMBINADO = {
  participantesMinimos: 2,
  participantesMaximos: 4,
  reacoesExigidasPorParticipante: 1,
  alvosMaximos: 1,
} as const;

export const REGRA_ATAQUES_COMBINADOS = {
  categoria: 'Combate e Mecânicas' as const,
  status: 'Regra oficial',
  resumo: 'Regras para sincronizar ataques contra um alvo sem criar ações, recursos ou efeitos adicionais.',
  destaques: [
    ['Participantes', '2 a 4'],
    ['Custo', 'ação + reação'],
    ['Alvo', 'uma criatura ou veículo'],
  ],
  corpo: `
    <p class="regras-lead">Um Ataque Combinado reúne ataques contra o mesmo alvo e resolve o dano ao mesmo tempo. Cada participante continua usando sua própria arma, magia, teste e recurso.</p>

    <h3 class="regras-subtitle">Requisitos</h3>
    <ul class="regras-list">
      <li>Participam de ${LIMITES_ATAQUE_COMBINADO.participantesMinimos} a ${LIMITES_ATAQUE_COMBINADO.participantesMaximos} criaturas voluntárias que possam perceber e atingir o mesmo alvo.</li>
      <li>Cada participante precisa ter uma Ação Padrão e uma reação disponíveis.</li>
      <li>Somente ataques que causam dano a um único alvo podem entrar. Cura, área, invocação e controle são resolvidos separadamente.</li>
      <li>O grupo escolhe um líder apenas para definir o momento da resolução. O líder não empresta bônus aos demais.</li>
    </ul>

    <h3 class="regras-subtitle">Preparação e resolução</h3>
    <ol class="regras-steps">
      <li>No próprio turno, cada participante declara a contribuição, reserva a Ação Padrão e gasta a reação. Mana e custos que a ação exige na declaração são pagos nesse momento. Quem já gastou uma dessas ações não pode participar.</li>
      <li>O ataque é resolvido no primeiro turno do líder depois que todos se prepararem. A preparação de um participante expira no início do próximo turno dele. Alcance, linha de efeito e alvo precisam continuar válidos.</li>
      <li>Na resolução, cada participante consome munição ou carga usada pelo ataque e faz a própria rolagem. Nenhum custo é pago duas vezes.</li>
      <li>Cada acerto causa o dano normal da contribuição. Cada erro não causa dano e não devolve ações ou recursos.</li>
      <li>Aplique vulnerabilidade, redução percentual e Resistência separadamente a cada contribuição. Depois, some o dano final dos acertos.</li>
    </ol>

    <h3 class="regras-subtitle">Críticos, reações e efeitos</h3>
    <ul class="regras-list">
      <li>Cada contribuição verifica a própria margem de ameaça e o próprio multiplicador. O crítico de um participante não multiplica o dano dos demais.</li>
      <li>O alvo usa as reações que tiver disponíveis. Cada reação afeta apenas a contribuição que acionou seu gatilho, salvo texto expresso em contrário.</li>
      <li>Efeitos adicionais de acerto são resolvidos por contribuição, mas efeitos iguais não acumulam além do limite da própria condição.</li>
      <li>Se todas as contribuições errarem, o Ataque Combinado falha. Custos e ações permanecem gastos.</li>
    </ul>

    <h3 class="regras-subtitle">Interrupção</h3>
    <ul class="regras-list">
      <li>Uma contribuição é perdida se o participante ficar inconsciente, incapaz de agir ou sem um ataque válido antes da resolução.</li>
      <li>Se o líder perder a contribuição, outro participante preparado assume a liderança. Se nenhum puder, o ataque é cancelado.</li>
      <li>Quando o ataque é cancelado antes da resolução, ações, reações e custos pagos na declaração continuam gastos. Munição e cargas ainda não usadas são preservadas.</li>
    </ul>

    <h3 class="regras-subtitle">Magias e Fluxos</h3>
    <ul class="regras-list">
      <li>Cada magia precisa alcançar a própria DT de conjuração e a defesa do alvo normalmente.</li>
      <li>Somar danos não altera tipo, alcance, área, duração ou efeito das magias.</li>
      <li>Ataque Combinado entre personagens não é Fusão de Fluxos. Ele não cria um novo efeito.</li>
    </ul>
  `,
  corpoMestre: `
    <p class="regras-lead">Ataque Combinado custa caro em tempo de mesa: quatro pessoas declaram, esperam, e só então resolvem. Ele se paga quando o alvo justifica a espera, e atrapalha quando vira rotina contra lacaio.</p>

    <h3 class="regras-subtitle">Quando vale a pena</h3>
    <ul class="regras-list">
      <li>Vale contra alvo único e resistente: chefe, elite, veículo, criatura com Resistência alta. É aí que somar contribuições supera bater separado.</li>
      <li>Não vale contra grupo de lacaios. Se a mesa começar a usar assim, o problema é que seus lacaios têm Vida demais.</li>
      <li>Custa ação padrão e reação de cada participante. Um grupo que combina ataque numa rodada é um grupo sem reação nenhuma na rodada seguinte, e isso é uma abertura sua.</li>
    </ul>

    <h3 class="regras-subtitle">Conduzir a resolução</h3>
    <ul class="regras-list">
      <li>A preparação de cada participante expira no início do próximo turno dele. Deixe o relógio correr de verdade: tirar o chefe do alcance é resposta legítima, não maldade.</li>
      <li>Cada contribuição rola sozinha, verifica a própria margem e recebe vulnerabilidade e Resistência separadamente. Some só o dano final dos acertos.</li>
      <li>Se todas errarem, o ataque falha e os custos ficam gastos. Avise que isso é possível antes da primeira vez que a mesa tentar.</li>
      <li>O alvo usa as reações que tiver, e cada uma afeta só a contribuição que a acionou. Um chefe com Bloqueio derruba uma contribuição, nunca a soma inteira.</li>
    </ul>

    <h3 class="regras-subtitle">O que não é</h3>
    <p>Somar dano não é Fusão de Fluxos e não cria efeito novo. Se um jogador propuser que duas magias combinadas produzam um terceiro efeito, isso é decisão sua de mesa, tomada fora desta regra.</p>
  `,
};
