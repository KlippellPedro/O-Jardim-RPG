/** Perigos do ambiente: queda, fôlego, fome e sede, clima e armadilhas.
 *
 * Tudo o que machuca sem que ninguém ataque. O dano das armadilhas sai da
 * mesma referência do Guia do Mestre (src/services/referenciaBalanceamento.ts),
 * em fração da Vida média de um personagem do nível, para a tabela não descolar
 * da ficha quando as classes mudarem. O clima cobra em fração da Vida de quem
 * está exposto, porque a nevasca não sabe o nível de ninguém. A queda é a
 * exceção de propósito: ela cai por metro, e o mesmo tombo pesa menos para quem
 * tem mais Vida.
 */
import classesData from '../ficha/classes.json';
import catalogoLojaData from '../loja/catalogo.json';
import type { IClasse } from '../../src/types/catalogo';
import {
  NIVEIS_DE_REFERENCIA,
  mediaDeDados,
  referenciaDoNivel,
} from '../../src/services/referenciaBalanceamento';
import type { RegraTopicoDe } from './tipos';

// ------------------------------------------------------------------ queda

export const METROS_POR_DADO_DE_QUEDA = 3;
export const DADOS_MAXIMOS_DE_QUEDA = 20;
/** DT fixa de Acrobacia para cair de pé quando a queda foi escolhida. */
export const DT_CAIR_DE_PE = 15;

/** Quantos d6 de impacto uma queda causa. Menos de 3 m não machuca. */
export function dadosDeQueda(metros: number): number {
  if (!(metros > 0)) return 0;
  return Math.min(DADOS_MAXIMOS_DE_QUEDA, Math.floor(metros / METROS_POR_DADO_DE_QUEDA));
}

// ----------------------------------------------------------------- fôlego

/** Sem ar, cada rodada custa esta fração da Estamina máxima: de tanque cheio,
 *  dez rodadas, mais ou menos um minuto de ficção. */
export const FRACAO_DE_FOLEGO_POR_RODADA = 0.1;
export const DT_INICIAL_DE_SUFOCAR = 10;
export const PASSO_DA_DT_DE_SUFOCAR = 2;

/** Estamina que uma rodada sem ar custa. Esforço dobra; ser pego sem tempo de
 *  puxar o ar faz a primeira rodada custar o triplo. */
export function custoDeFolego(
  estaminaMaxima: number,
  { esforco = false, surpresa = false }: { esforco?: boolean; surpresa?: boolean } = {},
): number {
  const base = Math.max(1, Math.ceil(estaminaMaxima * FRACAO_DE_FOLEGO_POR_RODADA));
  return base * (surpresa ? 3 : 1) * (esforco ? 2 : 1);
}

/** DT de Fortitude na enésima rodada sem ar depois que a Estamina acabou. */
export function dtDeSufocar(rodadaSemEstamina: number): number {
  return DT_INICIAL_DE_SUFOCAR + PASSO_DA_DT_DE_SUFOCAR * Math.max(0, Math.trunc(rodadaSemEstamina) - 1);
}

// ---------------------------------------------------------- fome e sede

/** Dias sem comer que o corpo aguenta antes do primeiro Cansaço. */
export function diasDeFolgaSemComida(modConstituicao: number): number {
  return Math.max(1, 3 + Math.trunc(modConstituicao));
}

export interface ITerrenoDeBusca {
  id: string;
  titulo: string;
  dt: number;
  exemplos: string;
}

export const TERRENOS_DE_BUSCA: readonly ITerrenoDeBusca[] = [
  { id: 'farto', titulo: 'Farto', dt: 10, exemplos: 'Mata com rio, beira de lago, campo na época da colheita.' },
  { id: 'comum', titulo: 'Comum', dt: 15, exemplos: 'Floresta, campo aberto, litoral, estrada de interior.' },
  { id: 'escasso', titulo: 'Escasso', dt: 20, exemplos: 'Montanha alta, pântano, estepe seca, ruína antiga.' },
  { id: 'arido', titulo: 'Árido', dt: 25, exemplos: 'Deserto, gelo eterno, terra morta, subterrâneo fundo.' },
];

/** Quantas pessoas uma busca alimenta por um dia: quem buscou, mais uma a cada
 *  5 pontos acima da DT. Falha não alimenta ninguém. */
export function pessoasAlimentadas(resultado: number, dt: number): number {
  if (resultado < dt) return 0;
  return 1 + Math.floor((resultado - dt) / 5);
}

// ------------------------------------------------------------------ clima

export type GrauDeClima = 'severo' | 'extremo' | 'mortal';

export interface IGrauDeClima {
  id: GrauDeClima;
  titulo: string;
  frio: string;
  calor: string;
  /** DT de Fortitude; nulo quando o grau não deixa testar. */
  dt: number | null;
  intervalo: string;
  /** Fração da Vida máxima de quem está exposto, como dano de Frio ou Calor. */
  fracaoDeDano: number;
  consequencia: string;
}

export const GRAUS_DE_CLIMA: readonly IGrauDeClima[] = [
  {
    id: 'severo',
    titulo: 'Severo',
    frio: 'Nevasca, noite de montanha, chuva gelada sem abrigo.',
    calor: 'Deserto ao meio-dia, pântano abafado, porão de forja.',
    dt: 15,
    intervalo: 'a cada 4 horas',
    fracaoDeDano: 0,
    consequencia: '1 de Cansaço.',
  },
  {
    id: 'extremo',
    titulo: 'Extremo',
    frio: 'Gelo eterno, tempestade no alto da serra, água gelada até a cintura.',
    calor: 'Deserto fundo sem sombra, chuva de cinzas, encosta de vulcão.',
    dt: 20,
    intervalo: 'a cada hora',
    fracaoDeDano: 0.1,
    consequencia: '1 de Cansaço e dano de ambiente igual a um décimo da Vida máxima.',
  },
  {
    id: 'mortal',
    titulo: 'Mortal',
    frio: 'Mar congelado, um frio que não pertence a este mundo.',
    calor: 'Rio de lava a poucos passos, boca de forno, coração de incêndio.',
    dt: null,
    intervalo: 'no fim de cada turno',
    fracaoDeDano: 0.25,
    consequencia: 'Dano de ambiente igual a um quarto da Vida máxima, sem teste.',
  },
];

const ORDEM_DO_CLIMA: readonly (GrauDeClima | null)[] = [null, 'severo', 'extremo', 'mortal'];

/** Grau que vale depois da proteção. Roupa certa só anula o Severo; o Traje
 *  com Resistência àquele clima desce qualquer grau um degrau, e já conta como
 *  roupa certa. Abrigo de verdade suspende tudo enquanto se está nele. */
export function grauEfetivoDeClima(
  grau: GrauDeClima,
  { roupaCerta = false, traje = false, abrigo = false }: { roupaCerta?: boolean; traje?: boolean; abrigo?: boolean } = {},
): GrauDeClima | null {
  if (abrigo) return null;
  if (traje) return ORDEM_DO_CLIMA[ORDEM_DO_CLIMA.indexOf(grau) - 1] ?? null;
  if (roupaCerta && grau === 'severo') return null;
  return grau;
}

/** Dano de ambiente de um grau sobre a Vida máxima de quem está exposto,
 *  antes da Resistência. */
export function danoDeClima(grau: GrauDeClima, vidaMaxima: number): number {
  const fracao = GRAUS_DE_CLIMA.find((item) => item.id === grau)?.fracaoDeDano ?? 0;
  if (!fracao) return 0;
  return Math.max(1, Math.round(vidaMaxima * fracao));
}

// ------------------------------------------------------------- armadilhas

export type PesoDeArmadilha = 'leve' | 'seria' | 'mortal';
type DtDoGuia = 'padrao' | 'dificil';

export interface IPesoDeArmadilha {
  id: PesoDeArmadilha;
  titulo: string;
  /** Fração da Vida média de um personagem do nível: os degraus de lacaio,
   *  inimigo padrão e golpe de chefe anunciado do Combate. */
  fracaoDaVida: number;
  achar: DtDoGuia;
  desarmar: DtDoGuia;
  resistir: DtDoGuia;
  sentido: string;
}

export const PESOS_DE_ARMADILHA: readonly IPesoDeArmadilha[] = [
  { id: 'leve', titulo: 'Leve', fracaoDaVida: 0.1, achar: 'padrao', desarmar: 'padrao', resistir: 'padrao', sentido: 'Atrasa, faz barulho e machuca pouco.' },
  { id: 'seria', titulo: 'Séria', fracaoDaVida: 0.25, achar: 'padrao', desarmar: 'dificil', resistir: 'padrao', sentido: 'Tira um bom pedaço da Vida e muda o plano.' },
  { id: 'mortal', titulo: 'Mortal', fracaoDaVida: 0.45, achar: 'dificil', desarmar: 'dificil', resistir: 'dificil', sentido: 'Feita para matar quem entra sem cuidado. Sempre deixa um sinal.' },
];

/** Dados de d6 para uma média de dano; d12 quando os d6 passariam de dez, e um
 *  valor fixo por cima dos 20d12, como as armas de topo do arsenal. */
export function dadosParaMedia(media: number): string {
  if (media < 3) return '1d4';
  const d6 = Math.max(1, Math.round(media / 3.5));
  if (d6 <= 10) return `${d6}d6`;
  const d12 = Math.round(media / 6.5);
  if (d12 <= 20) return `${d12}d12`;
  return `20d12+${Math.max(5, Math.round((media - 130) / 5) * 5)}`;
}

export interface ILinhaDeArmadilha {
  nivel: number;
  dtPadrao: number;
  dtDificil: number;
  ataque: number;
  vidaMedia: number;
  dano: Record<PesoDeArmadilha, string>;
}

const classesComuns = classesData.filter((classe) => classe.categoria === 'padrao') as unknown as IClasse[];
const armasDeReferencia = catalogoLojaData.entradas
  .filter((item) => item.tipo === 'arma')
  .map((item) => ({
    nivelRecomendado: Number(item.conteudo?.nivel_recomendado) || null,
    raridade: String(item.conteudo?.raridade ?? ''),
    mediaNormal: mediaDeDados(item.conteudo?.dano),
  }));

export function linhaDeArmadilha(nivel: number): ILinhaDeArmadilha {
  const referencia = referenciaDoNivel(nivel, classesComuns, armasDeReferencia);
  const vidaMedia = referencia.vida.media;
  const dano = Object.fromEntries(
    PESOS_DE_ARMADILHA.map((peso) => [peso.id, dadosParaMedia(vidaMedia * peso.fracaoDaVida)]),
  ) as Record<PesoDeArmadilha, string>;
  return {
    nivel,
    dtPadrao: referencia.dt.padrao,
    dtDificil: referencia.dt.dificil,
    ataque: referencia.bonusDeAtaque,
    vidaMedia,
    dano,
  };
}

export const LINHAS_DE_ARMADILHA: readonly ILinhaDeArmadilha[] = NIVEIS_DE_REFERENCIA.map(linhaDeArmadilha);

export interface IArmadilhaPronta {
  d6: number;
  titulo: string;
  cena: string;
  regra: string;
}

export const ARMADILHAS_PRONTAS: readonly IArmadilhaPronta[] = [
  {
    d6: 1,
    titulo: 'Fosso coberto',
    cena: 'Uma laje igual às outras, só que oca. O pé afunda, a pedra gira no eixo e o escuro lá embaixo cheira a terra molhada.',
    regra: 'Reflexos. Sucesso: você se agarra na borda e fica Caído. Falha: você cai e sofre o dano de queda pela altura do fosso no lugar do dano da tabela.',
  },
  {
    d6: 2,
    titulo: 'Dardo na parede',
    cena: 'Um furo do tamanho de uma ervilha na altura do pescoço, e uma placa solta no chão bem embaixo dele.',
    regra: 'Ataque contra a Defesa. Acerto: dano de perfuração do peso da armadilha e exposição à Toxina Paralisante.',
  },
  {
    d6: 3,
    titulo: 'Lâmina de pêndulo',
    cena: 'Um rangido de corrente no teto, e uma lâmina do tamanho de uma porta descendo em arco pelo corredor.',
    regra: 'Reflexos. Dano de corte do peso da armadilha. A falha também deixa Caído.',
  },
  {
    d6: 4,
    titulo: 'Selo de chamas',
    cena: 'Letras queimadas no batente, quase apagadas, que esquentam a sola de quem pisa perto.',
    regra: 'Reflexos. Dano de Fogo do peso da armadilha. Achar pede Percepção ou Ressonância, e desarmar pede Misticismo.',
  },
  {
    d6: 5,
    titulo: 'Rede no teto',
    cena: 'O fio no chão é tão fino que só aparece quando a luz bate de lado. Em cima, uma rede de corda grossa enrolada nas vigas.',
    regra: 'Reflexos. Falha: Imobilizado embaixo da rede, sem dano. Sair custa uma Ação Padrão e Atletismo ou Acrobacia contra a DT Padrão, ou uma Ação Padrão cortando com arma de corte. Quase sempre alguém ouve e vem ver.',
  },
  {
    d6: 6,
    titulo: 'Gás do sono',
    cena: 'Um assobio baixo pelas frestas do chão, e um cheiro doce de flor passada que toma a sala em segundos.',
    regra: 'Todos na sala sofrem exposição ao Néctar Sonífero. Quem prende o fôlego a tempo não respira o gás enquanto o ar durar.',
  },
];

// ------------------------------------------------------------------ página

const linhasDeQuedaExemplo = [3, 6, 9, 15, 30, 60].map((metros) => `<tr><td>${metros} m</td><td>${dadosDeQueda(metros)}d6</td></tr>`).join('');

const tabelaClima = GRAUS_DE_CLIMA.map((grau) => `
  <tr>
    <td><strong>${grau.titulo}</strong></td>
    <td>${grau.frio}</td>
    <td>${grau.calor}</td>
    <td>${grau.dt === null ? 'Sem teste' : `Fortitude DT ${grau.dt}`}, ${grau.intervalo}.<small class="regras-mecanica">${grau.dt === null ? '' : 'Falha: '}${grau.consequencia}</small></td>
  </tr>
`).join('');

const tabelaTerrenos = TERRENOS_DE_BUSCA.map((terreno) => `
  <tr><td><strong>${terreno.titulo}</strong></td><td>${terreno.dt}</td><td>${terreno.exemplos}</td></tr>
`).join('');

const ROTULO_DT: Record<DtDoGuia, string> = { padrao: 'Padrão', dificil: 'Difícil' };

const tabelaPesos = PESOS_DE_ARMADILHA.map((peso) => `
  <tr>
    <td><strong>${peso.titulo}</strong><br><small>${peso.sentido}</small></td>
    <td>${ROTULO_DT[peso.achar]}</td>
    <td>${ROTULO_DT[peso.desarmar]}</td>
    <td>${ROTULO_DT[peso.resistir]}</td>
  </tr>
`).join('');

const tabelaArmadilhas = LINHAS_DE_ARMADILHA.map((linha) => `
  <tr>
    <td><strong>${linha.nivel}</strong></td>
    <td>${linha.dtPadrao} / ${linha.dtDificil}</td>
    <td>+${linha.ataque}</td>
    <td>${linha.dano.leve}</td>
    <td>${linha.dano.seria}</td>
    <td>${linha.dano.mortal}</td>
  </tr>
`).join('');

const tabelaProntas = ARMADILHAS_PRONTAS.map((armadilha) => `
  <tr><td>${armadilha.d6}</td><td><strong>${armadilha.titulo}.</strong> ${armadilha.cena}<small class="regras-mecanica">${armadilha.regra}</small></td></tr>
`).join('');

const exemploNivel10 = linhaDeArmadilha(10);

export const REGRA_PERIGOS: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'O que machuca sem que ninguém ataque: a queda, o ar que acaba, a fome e a sede, o frio e o calor, e o mecanismo escondido no corredor.',
  destaques: [
    ['Queda', `1d6 a cada ${METROS_POR_DADO_DE_QUEDA} m, até ${DADOS_MAXIMOS_DE_QUEDA}d6`],
    ['Sem ar', '1/10 da Estamina por rodada'],
    ['Armadilhas', 'Leve, Séria ou Mortal'],
  ],
  corpo: `
    <p class="regras-lead">Nem tudo que machuca ataca. O chão some, o ar acaba, a comida não chega, o frio entra pela roupa e o corredor esconde um mecanismo esperando um pé distraído. Cada um desses perigos tem aqui uma regra curta, para a mesa resolver sem parar a cena.</p>

    <div class="regras-resumo">
      <ul>
        <li><strong>Queda:</strong> 1d6 de impacto a cada ${METROS_POR_DADO_DE_QUEDA} m, até ${DADOS_MAXIMOS_DE_QUEDA}d6. Quem pulou por vontade própria pode cair de pé com Acrobacia.</li>
        <li><strong>Fôlego:</strong> sem ar, cada rodada gasta um décimo da sua Estamina máxima. Quando ela acaba, vem o teste de Fortitude, e quem falha apaga e começa a morrer.</li>
        <li><strong>Fome e sede:</strong> uma porção de comida e água por dia. Sem água, 1 de Cansaço por dia; sem comida, depois de alguns dias, também.</li>
        <li><strong>Clima:</strong> Severo e Extremo cobram Fortitude e Cansaço, e o Mortal tira Vida a cada turno. Roupa certa, Traje e abrigo baixam o grau.</li>
        <li><strong>Armadilhas:</strong> cada uma tem nível e peso (Leve, Séria ou Mortal). Percepção acha, Ladinagem, Misticismo ou Tecnologia desarmam, e a tabela dá DT, ataque e dano.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Queda</h3>
    <div class="regras-formula">Dano de queda = 1d6 de impacto a cada ${METROS_POR_DADO_DE_QUEDA} m, até ${DADOS_MAXIMOS_DE_QUEDA}d6</div>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Altura</th><th>Dano</th></tr></thead>
      <tbody>${linhasDeQuedaExemplo}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Menos de ${METROS_POR_DADO_DE_QUEDA} m</strong> não causa dano, mas quem cai sem querer fica Caído.</li>
      <li><strong>Quem cai fica Caído.</strong> Se você pulou por vontade própria, ou teve um instante para se preparar, teste Acrobacia contra DT ${DT_CAIR_DE_PE}: o sucesso tira 1d6 do dano e você cai de pé.</li>
      <li><strong>Chão macio</strong> (água funda, neve fofa, monte de feno, lona esticada) recebe a queda com metade do dano. Água rasa conta como chão.</li>
      <li><strong>A queda é rápida:</strong> até 150 m numa rodada. Voo, magia ou poder que segure alguém precisa agir antes do chão.</li>
      <li><strong>Cair em cima de alguém</strong> divide o dano ao meio entre os dois, e os dois ficam Caídos. Quem está embaixo e vê a queda vindo sai do caminho com Reflexos DT 15.</li>
      <li><strong>Queda que tira metade ou mais da Vida máxima</strong> conta como golpe para a tabela de trauma de <span class="regras-ref regras-ref--ferimentos">Ferimentos</span>.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Uma personagem de nível 5, com 26 de Vida, despenca de uma ponte de 12 m: ${dadosDeQueda(12)}d6 de impacto. Ela não escolheu cair, então não testa Acrobacia. Os dados somam 15, sobram 11 de Vida, e ela termina Caída na margem.</p>
    </div>

    <h3 class="regras-subtitle">Fôlego</h3>
    <p>Debaixo d'água, num quarto tomado de fumaça ou com a mão de alguém fechando a garganta, o corpo paga o ar com o mesmo combustível do esforço: a Estamina.</p>
    <div class="regras-formula">Sem ar, cada rodada custa ⌈Estamina máxima ÷ 10⌉ de Estamina</div>
    <ul class="regras-list">
      <li><strong>Com a Estamina cheia,</strong> isso dá até dez rodadas, mais ou menos um minuto. Quem já gastou Estamina na luta tem menos ar.</li>
      <li><strong>Esforço dobra o custo:</strong> a rodada em que você atacou, correu ou nadou com pressa custa duas.</li>
      <li><strong>Sem tempo de puxar o ar</strong> (caiu na água de surpresa, a sala encheu de fumaça de uma vez), a primeira rodada custa o triplo.</li>
      <li><strong>Voltar a respirar não devolve nada na hora.</strong> A Estamina gasta segurando o fôlego volta como qualquer outra, no <span class="regras-ref regras-ref--descanso">Descanso</span>.</li>
      <li><strong>Quem não respira,</strong> por raça, forma ou efeito, ignora esta seção. Quem respira debaixo d'água ignora dentro da água.</li>
    </ul>
    <p>Quando a Estamina acaba e você continua sem ar:</p>
    <ol class="regras-steps">
      <li>No fim de cada turno, teste Fortitude contra DT ${DT_INICIAL_DE_SUFOCAR}. A DT sobe ${PASSO_DA_DT_DE_SUFOCAR} a cada rodada seguinte.</li>
      <li>Na primeira falha você apaga: fica Inconsciente, a Vida cai a 0 e você recebe Morrendo 1.</li>
      <li>Enquanto continuar sem ar, o Morrendo sobe 1 no fim de cada turno seu, sem teste, e ninguém consegue estabilizar você.</li>
      <li>Tirado para o ar, você segue a regra normal de Morrendo, em <span class="regras-ref regras-ref--ferimentos">Ferimentos</span>.</li>
    </ol>
    <ul class="regras-list">
      <li><strong>Fumaça densa</strong> conta como sem ar para quem fica nela sem cobrir o rosto.</li>
      <li><strong>Gás venenoso</strong> é uma aflição (<span class="regras-ref regras-ref--aflicoes">Venenos, Doenças e Vícios</span>). Prender o fôlego evita a exposição enquanto o ar durar.</li>
      <li><strong>Pulmões Danificados</strong> dá desvantagem nesses testes de Fortitude, como diz a condição.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Um personagem com 30 de Estamina máxima gasta 3 por rodada sem ar. Depois de uma luta em que gastou 18, ele tem 12: quatro rodadas nadando com calma, ou duas nadando com pressa.</p>
    </div>

    <h3 class="regras-subtitle">Fome e sede</h3>
    <ul class="regras-list">
      <li><strong>Por dia,</strong> uma porção de comida e uns 4 litros de água. No calor Severo ou pior, o dobro de água. A Ração de viagem é uma porção, e o Kit de Aventureiro traz uma semana delas.</li>
      <li><strong>Na cidade</strong> o custo de vida (<span class="regras-ref regras-ref--entre-aventuras">Tempo Entre Aventuras</span>) já paga comida e água. Contar porção é coisa de estrada, deserto e cerco.</li>
      <li><strong>Sem água:</strong> no fim de cada dia sem beber, 1 de Cansaço.</li>
      <li><strong>Sem comida:</strong> você aguenta 3 + Mod.Constituição dias (mínimo 1) sem efeito. Depois disso, 1 de Cansaço no fim de cada dia sem comer. Meia porção conta como meio dia: dois dias de meia porção valem um dia sem comer.</li>
      <li><strong>O Cansaço de fome e sede não sai com descanso</strong> enquanto a causa continua. Depois de comer e beber, ele sai no descanso seguinte como qualquer outro.</li>
      <li><strong>Em Colapso por fome ou sede,</strong> quem não receber comida e água até o fim do dia seguinte morre.</li>
      <li><strong>Uma noite com fome ou sede</strong> também piora o descanso: é o fator "Sem comida ou água boa" do <span class="regras-ref regras-ref--descanso">Descanso</span>.</li>
    </ul>
    <p><strong>Buscar comida e água.</strong> São seis horas de procura, como uma atividade de Tempo Entre Aventuras. Na estrada, o grupo que gasta essas horas procurando faz só metade do caminho do dia. Teste Sobrevivência contra a DT do terreno.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Terreno</th><th>DT</th><th>Onde</th></tr></thead>
      <tbody>${tabelaTerrenos}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Sucesso</strong> alimenta e dá água a você por um dia, e a mais uma pessoa a cada 5 pontos acima da DT.</li>
      <li><strong>O Kit de Pesca e Forrageamento</strong> dá vantagem, e Ajudar vale como em <span class="regras-ref regras-ref--acoes-coletivas">Ações Coletivas</span>.</li>
      <li><strong>Falha crítica:</strong> alguém come o que não devia. Fortitude DT 15 ou fica Enjoado até o próximo descanso completo.</li>
    </ul>

    <h3 class="regras-subtitle">Clima</h3>
    <p>Frio e Calor são dano de ambiente (<span class="regras-ref regras-ref--tipos-de-dano">Tipos de Dano</span>). A tabela diz com que ritmo eles cobram de quem está exposto sem proteção.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Grau</th><th>Frio</th><th>Calor</th><th>Sem proteção</th></tr></thead>
      <tbody>${tabelaClima}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Roupa certa</strong> (agasalho no frio; roupa leve, água e cobertura no calor) anula o Severo. No Extremo e no Mortal ela não basta.</li>
      <li><strong>O Traje</strong> com Resistência contra aquele clima conta como roupa certa e ainda baixa um grau: o Extremo vira Severo e o Mortal vira Extremo. A Resistência dele subtrai do dano, como sempre.</li>
      <li><strong>Abrigo de verdade</strong> (caverna seca, barraca fechada, sombra com água) suspende os testes enquanto você estiver nele.</li>
      <li><strong>Resistência a Gelo ou a Fogo</strong> não vale contra o clima. Raça ou traço que diga que não sente frio ou calor ignora o clima que o traço cobre.</li>
      <li><strong>Dormir sem abrigo</strong> no Severo ou pior conta como exposição severa: o descanso fica Péssimo.</li>
      <li><strong>Falha crítica</strong> no frio Extremo deixa Congelamento, uma condição de longo prazo. No calor Extremo, ela dá 2 de Cansaço no lugar de 1.</li>
    </ul>

    <h3 class="regras-subtitle">Armadilhas</h3>
    <p>Toda armadilha tem um nível, quase sempre o do grupo ou o do lugar, e um peso. O nível escolhe a linha da tabela de baixo, e o peso escolhe a DT de cada etapa e a coluna de dano.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Peso</th><th>Achar</th><th>Desarmar</th><th>Resistir</th></tr></thead>
      <tbody>${tabelaPesos}</tbody>
    </table></div>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível</th><th>DT Padrão / Difícil</th><th>Ataque</th><th>Leve</th><th>Séria</th><th>Mortal</th></tr></thead>
      <tbody>${tabelaArmadilhas}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Achar:</strong> quem anda atento usa 10 + bônus de Percepção contra a DT de achar. Quem para e procura rola, e procurar com calma custa tempo.</li>
      <li><strong>A Mortal sempre deixa um sinal</strong> que qualquer um percebe sem teste: ossos, manchas, um aviso riscado na parede. O sinal avisa que há perigo, e o teste mostra onde ele está e como funciona.</li>
      <li><strong>Desarmar:</strong> Ladinagem para mecanismo, Misticismo para selo ou ritual, Tecnologia para sistema A.X.I.S. Leva um minuto; em combate, uma Ação Padrão com desvantagem. O Kit de Ferramentas dá vantagem nos mecanismos. Falhar por 5 ou mais dispara a armadilha em quem estava mexendo.</li>
      <li><strong>Desarmar é um caminho entre vários.</strong> Contornar, disparar de longe com uma vara ou uma pedra, ou passar correndo e aguentar também resolvem, cada um com o seu preço.</li>
      <li><strong>Resistir:</strong> Reflexos contra lâmina, fosso e pedra; Fortitude contra dardo, agulha e gás; Vontade contra selo que mexe com a mente. O sucesso leva metade do dano e nenhum efeito extra. A falha leva o dano inteiro e o efeito.</li>
      <li><strong>Armadilha que atira</strong> (besta, dardo, lança) faz um ataque: d20 + Ataque da tabela contra a Defesa. Acerto leva o dano inteiro e o efeito; erro não leva nada.</li>
      <li><strong>O tipo de dano</strong> é o do mecanismo: corte, perfuração, impacto, o Fogo de um selo. O veneno vem como aflição, e a aflição se resolve do jeito dela.</li>
      <li><strong>Dano que tira metade ou mais da Vida máxima</strong> num golpe só pede a tabela de trauma, como em <span class="regras-ref regras-ref--ferimentos">Ferimentos</span>.</li>
      <li><strong>As armadilhas vendidas na Loja,</strong> como a Armadilha de Corda e Sino, trazem o próprio número e não usam esta tabela.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Um grupo de nível 10 entra num corredor com uma lâmina de pêndulo Séria. Achar pede DT ${exemploNivel10.dtPadrao} de Percepção, desarmar pede DT ${exemploNivel10.dtDificil} de Ladinagem e resistir pede Reflexos DT ${exemploNivel10.dtPadrao}. Quem falha leva ${exemploNivel10.dano.seria} de corte e fica Caído; quem passa leva metade.</p>
    </div>
    <p><strong>Armadilhas prontas.</strong> Para quando o Mestre precisa de uma na hora, ou para inspirar a sua. Use o peso que a cena pedir.</p>
    <div class="regras-table-wrap"><table class="regras-table regras-table--dado">
      <thead><tr><th>1d6</th><th>Como é, e como se resolve</th></tr></thead>
      <tbody>${tabelaProntas}</tbody>
    </table></div>
  `,
  corpoMestre: `
    <p class="regras-lead">Perigo de ambiente serve para gastar recurso e para fazer a mesa escolher caminho. Toda vez que um aparecer, pergunte se ele dá uma decisão ao grupo. Se ele só tira Vida, corte.</p>

    <h3 class="regras-subtitle">Quando contar</h3>
    <ul class="regras-list">
      <li><strong>Fome e sede só merecem contagem</strong> quando a cena é sobre sobreviver: travessia de deserto, cerco, naufrágio. Numa viagem comum, pergunte se compraram ração e siga.</li>
      <li><strong>Clima Severo dura dias</strong> e cansa devagar. Use para dar peso a uma viagem. Extremo e Mortal são lugares onde o grupo entra sabendo, e por isso merecem aviso antes.</li>
      <li><strong>Clima de outro mundo</strong> (o frio do Vazio, o calor do Abismo) pode usar a DT Difícil do nível do grupo no lugar de 15 e 20, para continuar pesando em quem já passou do nível 20.</li>
      <li><strong>Queda a partir do nível 20</strong> deixa de ameaçar sozinha: ${DADOS_MAXIMOS_DE_QUEDA}d6 contra uns 80 de Vida. O que pesa é onde se cai: no rio de lava, no meio do bando, longe do resto do grupo.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar armadilha</h3>
    <ul class="regras-list">
      <li>Leve tira cerca de 10% da Vida de um personagem do nível, Séria 25% e Mortal 45%: os mesmos degraus de lacaio, inimigo padrão e golpe de chefe anunciado na tabela de papéis de inimigo do <span class="regras-ref regras-ref--combate">Combate</span>.</li>
      <li>Armadilha que só pede um teste e tira Vida vira imposto. A boa dá escolha: o sinal está à vista, o caminho alternativo custa tempo, o mecanismo pode ser virado contra quem vem atrás.</li>
      <li>Uma armadilha por sala cansa a mesa. Duas ou três num lugar inteiro, uma delas visível de longe, já fazem o grupo andar devagar.</li>
      <li>Armadilha combina com relógio. "A guarda percebe a invasão" pinta uma parte quando alguém dispara uma, e o relógio do grupo anda a cada uma desarmada (ver Relógios de pressão, no Guia do Mestre).</li>
    </ul>
  `,
};
