/** Viagem e exploração.
 *
 * O Transporte cuida da viagem paga, em que alguém leva o grupo. Esta página
 * cuida da jornada por conta própria, dia a dia, e da hora a hora dentro de um
 * lugar perigoso. Quase nada aqui é número novo: o dia junta peças que já
 * existiam (o evento 2d6 do Guia do Mestre, a busca de comida e o clima de
 * Perigos do Ambiente, os fatores do Descanso, o Cansaço) e dá a cada
 * personagem um papel para a estrada não virar só "vocês chegam".
 */
import type { RegraTopicoDe } from './tipos';

// ------------------------------------------------------------------ ritmo

export type RitmoDeViagem = 'cauteloso' | 'normal' | 'forcado';

export interface IRitmoDeViagem {
  id: RitmoDeViagem;
  titulo: string;
  /** Fração do caminho de um dia que o grupo cobre neste ritmo. */
  fracao: number;
  efeito: string;
}

/** Cauteloso anda a metade de propósito: é o mesmo dia de "gastar as horas
 *  procurando comida" de Perigos do Ambiente, então o Forrageiro trabalha sem
 *  penalidade. */
export const RITMOS_DE_VIAGEM: readonly IRitmoDeViagem[] = [
  { id: 'cauteloso', titulo: 'Cauteloso', fracao: 0.5, efeito: 'Guia e Batedor têm vantagem, e o Forrageiro busca sem desvantagem.' },
  { id: 'normal', titulo: 'Normal', fracao: 1, efeito: 'Sem ajuste. O Forrageiro busca com desvantagem, porque procura andando.' },
  { id: 'forcado', titulo: 'Forçado', fracao: 1.5, efeito: 'Sem Batedor nem Forrageiro. No fim do dia, Fortitude contra a DT Padrão do nível do grupo ou 1 de Cansaço.' },
];

export const DT_DA_MARCHA_FORCADA = 15;

/** Quilômetros num dia inteiro de estrada, no ritmo Normal. */
export const CAMINHO_DO_DIA_KM: Readonly<Record<'pe' | 'montaria' | 'carroca', number>> = {
  pe: 30,
  montaria: 50,
  carroca: 25,
};

// ---------------------------------------------------------------- terreno

export interface ITerrenoDeViagem {
  id: string;
  titulo: string;
  exemplos: string;
  /** DT de Sobrevivência do Guia; nulo quando o caminho se segue sozinho. */
  dtGuia: number | null;
  /** Fração do caminho do dia que o terreno deixa andar. */
  fracao: number;
}

export const TERRENOS_DE_VIAGEM: readonly ITerrenoDeViagem[] = [
  { id: 'estrada', titulo: 'Estrada', exemplos: 'Estrada calçada, trilho do trem, rio com margem limpa.', dtGuia: null, fracao: 1 },
  { id: 'trilha', titulo: 'Trilha', exemplos: 'Trilha de caçador, campo aberto, litoral.', dtGuia: 10, fracao: 1 },
  { id: 'ermo', titulo: 'Ermo', exemplos: 'Mata fechada, colinas, charneca sem caminho marcado.', dtGuia: 15, fracao: 0.75 },
  { id: 'dificil', titulo: 'Difícil', exemplos: 'Montanha, pântano, deserto, neve funda.', dtGuia: 20, fracao: 0.5 },
  { id: 'sem-referencia', titulo: 'Sem referência', exemplos: 'Névoa que não levanta, mar de dunas à noite, um lugar que muda de forma.', dtGuia: 25, fracao: 0.5 },
];

/** Quilômetros de um dia, pelo meio, pelo terreno e pelo ritmo. */
export function caminhoDoDia(
  meio: keyof typeof CAMINHO_DO_DIA_KM,
  terreno: string,
  ritmo: RitmoDeViagem = 'normal',
): number {
  const fracaoTerreno = TERRENOS_DE_VIAGEM.find((item) => item.id === terreno)?.fracao ?? 1;
  const fracaoRitmo = RITMOS_DE_VIAGEM.find((item) => item.id === ritmo)?.fracao ?? 1;
  return Math.round(CAMINHO_DO_DIA_KM[meio] * fracaoTerreno * fracaoRitmo);
}

export type ResultadoDoGuia = 'no-caminho' | 'atrasou' | 'perdido';

/** Sucesso anda o dia inteiro; falha anda metade; falhar por 5 ou mais (ou
 *  falha crítica) perde o dia, e o grupo só percebe quando ele acaba. */
export function resultadoDoGuia(resultado: number, dt: number | null, { falhaCritica = false } = {}): ResultadoDoGuia {
  if (dt === null) return 'no-caminho';
  if (falhaCritica || resultado <= dt - 5) return 'perdido';
  return resultado >= dt ? 'no-caminho' : 'atrasou';
}

export const FRACAO_DO_DIA_PELO_GUIA: Readonly<Record<ResultadoDoGuia, number>> = {
  'no-caminho': 1,
  atrasou: 0.5,
  perdido: 0,
};

// ----------------------------------------------------------------- papéis

export interface IPapelDeViagem {
  id: string;
  titulo: string;
  teste: string;
  sucesso: string;
  falha: string;
}

export const PAPEIS_DE_VIAGEM: readonly IPapelDeViagem[] = [
  {
    id: 'guia',
    titulo: 'Guia',
    teste: 'Sobrevivência contra a DT do terreno',
    sucesso: 'O grupo anda o caminho do ritmo.',
    falha: 'Anda metade. Falhar por 5 ou mais perde o dia inteiro, e o grupo só percebe quando ele acaba.',
  },
  {
    id: 'batedor',
    titulo: 'Batedor',
    teste: 'Percepção contra a DT Padrão, ou Furtividade para passar sem ser visto',
    sucesso: 'Se o dia trouxer um encontro, o grupo vê primeiro e escolhe: evitar, esperar, emboscar ou chegar conversando.',
    falha: 'O encontro vê vocês primeiro. Falha crítica deixa o grupo Surpreendido se ele for hostil.',
  },
  {
    id: 'forrageiro',
    titulo: 'Forrageiro',
    teste: 'Sobrevivência contra a DT de busca de Perigos do Ambiente',
    sucesso: 'Comida e água para ele, e para mais uma pessoa a cada 5 pontos acima da DT.',
    falha: 'Nada para comer hoje além do que está na mochila.',
  },
  {
    id: 'vigia',
    titulo: 'Vigia',
    teste: 'Percepção contra a DT Padrão, à noite',
    sucesso: 'Se a noite trouxer alguma coisa, o acampamento acorda a tempo.',
    falha: 'Quem chega encontra o grupo dormindo. Falha crítica deixa o grupo Surpreendido.',
  },
];

// ------------------------------------------------------------- exploração

export const MINUTOS_DO_TURNO_DE_EXPLORACAO = 60;

export interface IAcaoDeExploracao {
  id: string;
  titulo: string;
  efeito: string;
}

export const ACOES_DE_EXPLORACAO: readonly IAcaoDeExploracao[] = [
  { id: 'avancar', titulo: 'Avançar', efeito: 'O grupo passa para a próxima área. Quem avança na frente é quem dispara a armadilha.' },
  { id: 'procurar', titulo: 'Procurar', efeito: 'Percepção acha armadilha, passagem e esconderijo; Investigação lê o que aconteceu ali. Tudo numa área só.' },
  { id: 'mapear', titulo: 'Mapear', efeito: 'Sobrevivência ou Conhecimento contra a DT Padrão. Com o mapa, a volta não pede teste; sem ele, sair do lugar pede Sobrevivência contra a DT Padrão.' },
  { id: 'cuidar', titulo: 'Cuidar', efeito: 'Tratar um ferido (Cura contra a DT Padrão do nível do paciente, 1d6 de Vida ou um décimo da Vida máxima, o que for maior) ou, numa área segura, Relaxar como no Descanso.' },
  { id: 'vigiar', titulo: 'Vigiar', efeito: 'Fica de olho enquanto os outros trabalham. Se o evento do turno for um encontro, o grupo não é Surpreendido.' },
];

// ------------------------------------------------------------------ página

const fracaoEmTexto = (fracao: number) => ({ 0.5: 'metade', 0.75: 'três quartos', 1: 'inteiro', 1.5: 'uma vez e meia' } as Record<number, string>)[fracao] ?? String(fracao);

const tabelaRitmos = RITMOS_DE_VIAGEM.map((ritmo) => `
  <tr><td><strong>${ritmo.titulo}</strong></td><td>${fracaoEmTexto(ritmo.fracao)}</td><td>${ritmo.efeito}</td></tr>
`).join('');

const tabelaTerrenos = TERRENOS_DE_VIAGEM.map((terreno) => `
  <tr>
    <td><strong>${terreno.titulo}</strong></td>
    <td>${terreno.dtGuia === null ? 'Sem teste' : terreno.dtGuia}</td>
    <td>${fracaoEmTexto(terreno.fracao)}</td>
    <td>${terreno.exemplos}</td>
  </tr>
`).join('');

const tabelaPapeis = PAPEIS_DE_VIAGEM.map((papel) => `
  <tr><td><strong>${papel.titulo}</strong></td><td>${papel.teste}.<small class="regras-mecanica"><strong>Sucesso:</strong> ${papel.sucesso} <strong>Falha:</strong> ${papel.falha}</small></td></tr>
`).join('');

const tabelaExploracao = ACOES_DE_EXPLORACAO.map((acao) => `
  <tr><td><strong>${acao.titulo}</strong></td><td>${acao.efeito}</td></tr>
`).join('');

const exemploErmo = caminhoDoDia('pe', 'ermo');

export const REGRA_VIAGEM: RegraTopicoDe<'Livro do Jogador'> = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'A jornada por conta própria, dia a dia: ritmo, terreno, um papel para cada um e o que a estrada traz. E a hora a hora dentro de uma ruína, uma mata ou um subterrâneo.',
  destaques: [
    ['Dia de estrada', `${CAMINHO_DO_DIA_KM.pe} km a pé`],
    ['Papéis', 'Guia, Batedor, Forrageiro e Vigia'],
    ['Exploração', `turnos de ${MINUTOS_DO_TURNO_DE_EXPLORACAO} minutos`],
  ],
  corpo: `
    <p class="regras-lead">Entre a cidade e o lugar onde a história acontece existe a estrada, e a estrada também pode contar. Esta página transforma cada dia de viagem numa pequena cena: o grupo escolhe o ritmo, cada um assume um papel, o Mestre rola o que o caminho traz e a noite cobra o seu preço. Quando o grupo chega a um lugar perigoso, o tempo passa a correr de hora em hora.</p>

    <div class="regras-resumo">
      <ul>
        <li>A viagem paga (trem, aeronave) está em <span class="regras-ref regras-ref--transporte">Transporte e Viagens</span>. Aqui está a jornada por conta própria.</li>
        <li>Um dia de estrada rende ${CAMINHO_DO_DIA_KM.pe} km a pé, ${CAMINHO_DO_DIA_KM.montaria} km de montaria e ${CAMINHO_DO_DIA_KM.carroca} km de carroça. O terreno e o ritmo (Cauteloso, Normal ou Forçado) mudam esse número.</li>
        <li>Cada personagem faz um papel por dia: Guia, Batedor, Forrageiro ou Vigia. Cada papel tem o seu teste.</li>
        <li>O Mestre rola um evento por dia de estrada e um por noite fora de lugar seguro.</li>
        <li>Dentro de uma ruína, mata ou subterrâneo, o tempo anda em turnos de uma hora, e cada personagem faz uma coisa por turno.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">O dia de estrada</h3>
    <ol class="regras-steps">
      <li><strong>Ritmo e papéis.</strong> O grupo escolhe o ritmo do dia e quem faz cada papel.</li>
      <li><strong>O caminho.</strong> O Guia testa contra a DT do terreno, e o resultado diz quanto do dia vira caminho.</li>
      <li><strong>O que a estrada traz.</strong> O Mestre rola o evento do dia. Se for um encontro, o resultado do Batedor diz quem vê quem primeiro.</li>
      <li><strong>Comida.</strong> O Forrageiro testa a busca, e o grupo come do que achou ou do que carrega (<span class="regras-ref regras-ref--perigos">Perigos do Ambiente</span>).</li>
      <li><strong>A noite.</strong> O grupo monta acampamento, o Vigia testa, o Mestre rola o evento da noite e o descanso sai com os fatores do <span class="regras-ref regras-ref--descanso">Descanso</span>.</li>
    </ol>
    <p class="regras-note">Cada dia de viagem passa no calendário do mundo. Uma estrada de oito dias leva oito dias, e o mundo anda junto.</p>

    <h3 class="regras-subtitle">Ritmo</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Ritmo</th><th>Caminho do dia</th><th>Efeito</th></tr></thead>
      <tbody>${tabelaRitmos}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Terreno</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Terreno</th><th>DT do Guia</th><th>Caminho do dia</th><th>Onde</th></tr></thead>
      <tbody>${tabelaTerrenos}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Terreno e ritmo se multiplicam.</strong> No Ermo, a pé e no ritmo Normal, o grupo anda ${exemploErmo} km.</li>
      <li><strong>O grupo anda no passo de quem está mais devagar.</strong> Um personagem a pé segura a caravana inteira.</li>
      <li><strong>Viagem por água ou pelo ar</strong> usa o veículo (<span class="regras-ref regras-ref--veiculos">Condução e Tripulação</span>), e o Guia testa Pilotagem no lugar de Sobrevivência quando não há referência.</li>
    </ul>

    <h3 class="regras-subtitle">Papéis</h3>
    <p>Cada personagem faz um papel por dia. Com gente de menos, um personagem pode fazer dois, com desvantagem nos dois. Um aliado também pode assumir um papel. Quem não faz papel nenhum só anda.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Papel</th><th>Teste, e o que ele decide</th></tr></thead>
      <tbody>${tabelaPapeis}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>O Vigia dorme mal:</strong> quem fica de guarda tem o fator "Ficou de guarda" no descanso, e os outros recebem "Alguém fez a guarda por você". Revezar a vigia divide o peso, e cada um que vigiou leva o fator.</li>
      <li><strong>O clima do dia</strong> vale para todo mundo, como em Perigos do Ambiente. A Barraca de Campanha conta como abrigo.</li>
      <li><strong>Magia, item e habilidade de classe</strong> podem cumprir um papel com o teste que já usam.</li>
    </ul>

    <h3 class="regras-subtitle">Exploração</h3>
    <p>Dentro de uma ruína, de uma mata fechada ou de um subterrâneo, o dia vira hora. Cada turno de exploração dura uma hora, e nele cada personagem faz uma coisa.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Ação</th><th>O que faz</th></tr></thead>
      <tbody>${tabelaExploracao}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Uma tocha dura um turno</strong> e ilumina 6 m. Sem luz, quem não enxerga no escuro fica Cego para o que está nela (Ver e ser visto, em <span class="regras-ref regras-ref--combate">Combate</span>).</li>
      <li><strong>O Mestre rola um evento por turno,</strong> e mais um sempre que o grupo faz barulho alto: luta, porta arrombada, grito.</li>
      <li><strong>Armadilhas e perigos do lugar</strong> seguem <span class="regras-ref regras-ref--perigos">Perigos do Ambiente</span>. Procurar antes de avançar é o jeito de achar antes de pisar.</li>
      <li><strong>Dez minutos bastam</strong> para uma coisa pequena (abrir um baú, ler uma inscrição). O turno inteiro é para o que muda o lugar.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Num subterrâneo, a Caçadora procura na sala seguinte enquanto o Guerreiro vigia e o Engenheiro mapeia. Ela acha uma placa solta no chão, o Mestre rola o evento do turno (um barulho de água ao longe) e a tocha do grupo apaga no fim da hora. Acender a segunda custa a última que eles tinham.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">A estrada vale uma cena quando o caminho muda alguma coisa: o tempo que falta, a comida que acaba, quem encontra o grupo no meio. Quando ela não muda nada, diga quantos dias passaram e corte para a chegada.</p>

    <h3 class="regras-subtitle">Quando jogar o dia a dia</h3>
    <ul class="regras-list">
      <li>Jogue dia a dia quando há prazo (o relógio da campanha anda), quando a região é hostil ou quando a própria viagem é a aventura. Em estrada segura, um resumo e um evento bastam.</li>
      <li>Mais de cinco dias jogados um por um cansam a mesa. Agrupe: role um evento a cada dois ou três dias e jogue só os que saírem 2 a 4 ou 10 a 12.</li>
      <li>Diga o terreno e o ritmo possíveis antes da escolha. O grupo decide melhor quando sabe que o pântano corta o dia pela metade.</li>
    </ul>

    <h3 class="regras-subtitle">Papéis que importam</h3>
    <ul class="regras-list">
      <li>O papel é o jeito de dar a cada jogador uma decisão por dia. Se um papel não muda nada na região (Forrageiro numa estrada cheia de estalagens), deixe-o de fora.</li>
      <li>O Batedor só vale se o evento puder ser evitado. Encontro inevitável é cena, e ele só decide a posição em que ela começa.</li>
      <li>Perder-se é atraso, e a história segue. O dia perdido é a hora boa para o evento de estrada mais estranho da tabela.</li>
    </ul>

    <h3 class="regras-subtitle">Exploração com ritmo</h3>
    <ul class="regras-list">
      <li>O turno de uma hora existe para o tempo pesar: tochas, ração, o relógio do lugar. Se nada disso importa, deixe o grupo explorar à vontade.</li>
      <li>Combine com o relógio do grupo do Guia (cada sala vencida pinta uma parte a favor) e com um relógio de ameaça do lugar. Os dois correndo juntos fazem a mesa decidir quando parar.</li>
    </ul>
  `,
};
