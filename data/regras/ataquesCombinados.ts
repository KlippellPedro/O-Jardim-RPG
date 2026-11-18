import { limitarPontosDeRelacao, type PontosDeRelacao } from './pontosDeRelacao';

export const LIMITES_ATAQUE_COMBINADO = {
  participantesMinimos: 2,
  participantesMaximos: 4,
  reacoesExigidasPorParticipante: 1,
  alvosMaximos: 1,
} as const;

/** Sintonia: o menor número de Pontos de Relação que cada aliado tem com o
 *  líder. Só entra no ataque quem tem pelo menos 1 ponto, então a tabela vai
 *  de 1 a 3. Os degraus 2 e 3 repetem Ousado e Arriscado da Coreografia, para
 *  a mesa não aprender um vocabulário novo de bônus. */
export interface IDegrauDeSintonia {
  sintonia: PontosDeRelacao;
  titulo: string;
  ataque: string;
  dano: string;
}

export const DEGRAUS_DE_SINTONIA: readonly IDegrauDeSintonia[] = [
  { sintonia: 1, titulo: 'Entrosados', ataque: '+2', dano: 'Nenhum' },
  { sintonia: 2, titulo: 'Afinados', ataque: '+2', dano: '+2' },
  { sintonia: 3, titulo: 'Uníssono', ataque: 'Vantagem', dano: '+1 dado' },
];

/** Sintonia do ataque pelos pontos que cada aliado (fora o líder) tem com o
 *  líder. Sem aliado, ou com um aliado sem pontos, dá 0: não há ataque. */
export function sintoniaDoAtaque(pontosComOLider: readonly number[]): PontosDeRelacao {
  if (!pontosComOLider.length) return 0;
  return limitarPontosDeRelacao(Math.min(...pontosComOLider.map(limitarPontosDeRelacao)));
}

/** Degrau da tabela. Sintonia 0 não tem degrau, porque ninguém entra sem ponto. */
export const degrauDeSintonia = (sintonia: number): IDegrauDeSintonia | null =>
  DEGRAUS_DE_SINTONIA.find((degrau) => degrau.sintonia === limitarPontosDeRelacao(sintonia)) || null;

/** Dano final do ataque: a Resistência do alvo sai de cada acerto, como em
 *  qualquer ataque, e os acertos se somam. */
export function danoDoAtaqueCombinado(danos: readonly number[], resistencia: number): number {
  const rd = Math.max(0, Math.trunc(resistencia));
  return danos.reduce((soma, dano) => soma + Math.max(0, Math.max(0, dano) - rd), 0);
}

const tabelaSintonia = DEGRAUS_DE_SINTONIA.map((degrau) => `
  <tr><td><strong>${degrau.sintonia}</strong></td><td>${degrau.titulo}</td><td>${degrau.ataque}</td><td>${degrau.dano}</td></tr>
`).join('');

const ALIADOS_MAXIMOS = LIMITES_ATAQUE_COMBINADO.participantesMaximos - 1;

export const REGRA_ATAQUES_COMBINADOS = {
  categoria: 'Combate e Mecânicas' as const,
  status: 'Regra oficial',
  resumo: `O líder ataca no turno dele e chama até ${ALIADOS_MAXIMOS} aliados para atacar junto, na hora. Cada aliado gasta a reação e um uso dos Pontos de Relação com o líder, e todos ganham o bônus da Sintonia.`,
  destaques: [
    ['Participantes', `o líder e até ${ALIADOS_MAXIMOS} aliados`],
    ['Custo de cada aliado', 'reação e 1 uso de ponto'],
    ['Bônus', 'pela Sintonia, de 1 a 3'],
  ],
  corpo: `
    <p class="regras-lead">Use esta regra quando o grupo quer atacar o mesmo alvo ao mesmo tempo. Tudo acontece no turno de quem lidera, e cada um rola o próprio ataque.</p>

    <div class="regras-resumo">
      <ul>
        <li>No seu turno, você ataca com a Ação Padrão e chama de 1 a ${ALIADOS_MAXIMOS} aliados que alcancem o mesmo alvo. Você é o líder.</li>
        <li>Cada aliado precisa ter pelo menos 1 <span class="regras-ref regras-ref--pontos-de-relacao">Ponto de Relação</span> com você. Ele gasta a reação e um uso desses pontos e ataca junto, na hora.</li>
        <li>A <strong>Sintonia</strong> é o menor número de pontos que os aliados têm com você. Ela dá o bônus da tabela a todos os ataques, inclusive o seu.</li>
        <li>Cada um faz a própria rolagem e causa o próprio dano. Quem errar não causa dano.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Como fazer</h3>
    <ol class="regras-steps">
      <li>No seu turno, diga que vai liderar um Ataque Combinado e contra quem.</li>
      <li>Chame os aliados. Cada um precisa ter a reação disponível, alcançar o alvo e ter pelo menos 1 ponto com você.</li>
      <li>Cada aliado gasta a reação e <strong>um uso dos pontos que tem com o líder</strong>. Mana, munição e outros custos do ataque são pagos como num ataque comum.</li>
      <li>Vejam a Sintonia na tabela abaixo.</li>
      <li>Cada um faz a própria rolagem, com o bônus da Sintonia. O dano de cada acerto entra separado no alvo.</li>
    </ol>

    <h3 class="regras-subtitle">Sintonia</h3>
    <p>Veja quantos pontos cada aliado tem com o líder. O menor desses números é a Sintonia do ataque. Se a Rafa tem 3 pontos com você e o Guerreiro tem 1, a Sintonia é 1.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Sintonia</th><th>Degrau</th><th>Ataque</th><th>Dano de cada acerto</th></tr></thead>
      <tbody>${tabelaSintonia}</tbody>
    </table></div>
    <p>O dado a mais do Uníssono é do mesmo tipo que você já rola, o da arma ou o da magia. Ele não é multiplicado no crítico, e o +2 de dano dos Afinados também não.</p>

    <h3 class="regras-subtitle">Regras do ataque</h3>
    <ul class="regras-list">
      <li>Só entram ataques que causam dano a um único alvo. Cura, área, invocação e controle são feitos separadamente, no turno de cada um.</li>
      <li>Cada ataque tem o próprio crítico. O crítico de um participante não multiplica o dano dos demais.</li>
      <li>A Resistência do alvo vale contra cada acerto, como em qualquer ataque.</li>
      <li>O alvo pode usar a reação dele contra um dos ataques, normalmente.</li>
      <li>Coreografia não entra no Ataque Combinado.</li>
      <li>Cada magia precisa alcançar a própria DT de conjuração. Atacar junto não altera tipo, alcance, área, duração ou efeito das magias, e Ataque Combinado entre personagens não é Fusão de Fluxos (ver <span class="regras-ref regras-ref--rituais-selos">Rituais, Selos e Fusão</span>).</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Duda ataca o chefe no turno dela e chama a Rafa, que tem 3 pontos com ela, e o Guerreiro, que tem 2. A Sintonia é 2, Afinados. Rafa e Guerreiro gastam a reação e um uso cada, e os três atacam na hora, com +2 no ataque e +2 no dano de cada acerto. O chefe tem Resistência 5, que sai de cada acerto.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">O Ataque Combinado acontece todo no turno do líder e não deixa ninguém esperando. Quem limita o uso são os Pontos de Relação: cada aliado gasta um uso por ataque, e os usos só voltam na sessão seguinte.</p>

    <h3 class="regras-subtitle">Quando vale a pena</h3>
    <ul class="regras-list">
      <li>É a melhor rodada do grupo contra um alvo só: chefe, elite, veículo. Os aliados atacam fora do próprio turno, então o grupo bate mais vezes na mesma rodada.</li>
      <li>O preço é a reação. Quem entrou no ataque fica sem Esquiva, Bloqueio e Proteger até o próprio turno, e isso é uma abertura sua.</li>
      <li>Grupo que ainda não tem pontos entre si não consegue combinar. É o empurrão para eles cuidarem uns dos outros na história.</li>
    </ul>

    <h3 class="regras-subtitle">Conduzir</h3>
    <ul class="regras-list">
      <li>Pergunte quem lidera e quantos pontos cada aliado tem com essa pessoa. Escolher o líder certo é parte da tática.</li>
      <li>Resolva os ataques um por vez, na ordem que a mesa preferir. O alvo pode usar a reação dele contra um deles, e ela afeta só esse ataque.</li>
    </ul>

    <h3 class="regras-subtitle">O que fica de fora</h3>
    <p>Atacar junto não é Fusão de Fluxos e não cria efeito novo. Se um jogador propuser que duas magias combinadas produzam um terceiro efeito, isso é decisão sua de mesa, tomada fora desta regra.</p>
  `,
};
