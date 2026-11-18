/** Pontos de Relação.
 *
 * O quanto um personagem do grupo confia em outro, de 0 a 3. Três porque é a
 * escada que o livro já usa para gente (Conhecido, Amigo e Leal nos contatos;
 * Ousado, Arriscado e Tudo ou Nada na Coreografia; até três laços), e porque num
 * d20 cada degrau precisa valer alguma coisa sentida na mesa: +2, depois +2 no
 * dano, depois vantagem. Mais que três viraria contabilidade.
 *
 * Cada ponto é um uso por sessão com aquela pessoa (Ajuda certa, Segurar a
 * mão, entrar no Ataque Combinado com Sintonia), e quanto mais pontos, mais a
 * Sanidade cobra quando algo acontece com ela. As DTs são as do nível 1 (10 e
 * 15) e somam o ajuste de nível do personagem, como toda DT de Sanidade:
 * viram a Rotineira e a Padrão do nível dele. O laço rompido sem pontos é
 * exatamente a linha de 1 ponto (DT Padrão, 1d6), então a regra de Contatos
 * e Laços continua valendo como está. Na ficha, os pontos saem da afinidade do
 * vínculo pela mesma escada da Confiança dos contatos (1 ou 2, 3 ou 4, 5).
 */
import { dtNoNivel } from '../../src/services/curvaCriatura';
import type { RegraTopicoDe } from './tipos';

export const PONTOS_DE_RELACAO_MAXIMOS = 3;

export type PontosDeRelacao = 0 | 1 | 2 | 3;

export const limitarPontosDeRelacao = (valor: unknown): PontosDeRelacao => {
  const numero = typeof valor === 'number' && Number.isFinite(valor) ? Math.trunc(valor) : 0;
  return Math.max(0, Math.min(PONTOS_DE_RELACAO_MAXIMOS, numero)) as PontosDeRelacao;
};

export interface IDegrauDeRelacao {
  pontos: PontosDeRelacao;
  titulo: string;
  como: string;
}

export const DEGRAUS_DE_RELACAO: readonly IDegrauDeRelacao[] = [
  { pontos: 0, titulo: 'Estranhos', como: 'Andam juntos, mas ainda não se conhecem direito.' },
  { pontos: 1, titulo: 'Companheiros', como: 'Já passaram por um perigo juntos e contam um com o outro.' },
  { pontos: 2, titulo: 'Próximos', como: 'São amigos de verdade e se entendem sem precisar falar muito.' },
  { pontos: 3, titulo: 'Inseparáveis', como: 'Confiam totalmente um no outro. Perder essa pessoa pesa muito.' },
];

export const tituloDoDegrau = (pontos: number) => DEGRAUS_DE_RELACAO[limitarPontosDeRelacao(pontos)].titulo;

// ------------------------------------------------------------------- usos

export interface IUsoDePonto {
  id: 'ajuda' | 'mao' | 'combinado';
  titulo: string;
  quando: string;
  efeito: string;
}

export const USOS_DE_PONTO: readonly IUsoDePonto[] = [
  {
    id: 'ajuda',
    titulo: 'Ajuda certa',
    quando: 'Você Ajuda essa pessoa num teste.',
    efeito: 'A ajuda dá vantagem no lugar do +2. Em combate, custa a sua reação no lugar da Ação Padrão. Continua contando no limite de dois ajudantes.',
  },
  {
    id: 'mao',
    titulo: 'Segurar a mão',
    quando: 'Essa pessoa falha num teste de Sanidade ou está numa crise, e consegue ouvir você.',
    efeito: 'Ela refaz o teste de Sanidade e fica com o melhor resultado, ou testa Vontade na hora para sair da crise, com vantagem. Em combate, custa a sua reação.',
  },
  {
    id: 'combinado',
    titulo: 'Entrar junto',
    quando: 'Essa pessoa lidera um Ataque Combinado e chama você.',
    efeito: 'Você gasta a reação e ataca junto, na hora. Os seus pontos com ela entram na Sintonia do ataque, que dá bônus a todos os ataques.',
  },
];

/** Quantos usos ainda restam nesta sessão com uma pessoa. */
export function usosRestantes(pontos: number, usados: number): number {
  const total = limitarPontosDeRelacao(pontos);
  const gastos = Math.max(0, Math.trunc(Number.isFinite(usados) ? usados : 0));
  return Math.max(0, total - gastos);
}

// -------------------------------------------------------------- Sanidade

export type EventoDeRelacao = 'cai' | 'perde';

export interface ILinhaDeSanidadeDaRelacao {
  evento: EventoDeRelacao;
  titulo: string;
  /** DT do nível 1; na mesa soma o ajuste de nível do personagem. */
  dt: number;
  /** Nome da DT no nível do personagem: 10 é a Rotineira e 15 a Padrão. */
  nomeDaDt: 'Rotineira' | 'Padrão';
  /** Perda na falha, por 1, 2 e 3 pontos. */
  perdas: readonly [string, string, string];
}

export const SANIDADE_DA_RELACAO: readonly ILinhaDeSanidadeDaRelacao[] = [
  { evento: 'cai', titulo: 'A pessoa cai à sua vista (fica Morrendo)', dt: 10, nomeDaDt: 'Rotineira', perdas: ['1d4', '1d6', '1d8'] },
  { evento: 'perde', titulo: 'A pessoa morre, some ou trai você', dt: 15, nomeDaDt: 'Padrão', perdas: ['1d6', '1d8', '2d6'] },
];

/** O teste de Sanidade que a relação cobra. Sem pontos não há teste, a menos
 *  que haja um laço e a pessoa se perca: aí vale a linha de 1 ponto, que é a
 *  regra do laço rompido. Laço e pontos juntos rolam uma vez, pelos pontos.
 *  Sem `nivel`, a DT é a do nível 1; com ele, já soma o ajuste de nível. */
export function sanidadeDaRelacao(
  evento: EventoDeRelacao,
  pontos: number,
  { laco = false, nivel }: { laco?: boolean; nivel?: number } = {},
): { dt: number; perda: string; nomeDaDt: ILinhaDeSanidadeDaRelacao['nomeDaDt'] } | null {
  const linha = SANIDADE_DA_RELACAO.find((item) => item.evento === evento);
  if (!linha) return null;
  let degrau: number = limitarPontosDeRelacao(pontos);
  if (degrau === 0 && laco && evento === 'perde') degrau = 1;
  if (degrau === 0) return null;
  const dt = nivel === undefined ? linha.dt : dtNoNivel(linha.dt, Math.max(1, nivel));
  return { dt, perda: linha.perdas[degrau - 1], nomeDaDt: linha.nomeDaDt };
}

// ---------------------------------------------------------- ganhar e perder

export const COMO_GANHAR: readonly string[] = [
  'Salvar a vida da pessoa, ou ter a vida salva por ela.',
  'Guardar um segredo dela que custaria caro se saísse.',
  'Ter uma conversa séria em que um conta ao outro algo importante sobre si.',
  'Um dia de Cuidar de quem importa, no Tempo Entre Aventuras, passado com ela.',
  'Sobreviver junto a uma cena em que os dois quase morreram.',
];

export const COMO_PERDER: readonly string[] = [
  'Mentir para ela sobre algo sério, e ela descobrir.',
  'Deixá-la para trás quando dava para voltar e ajudar.',
  'Quebrar uma promessa feita a ela.',
];

/** Pontos depois de uma mudança: +1 ou −1 por acontecimento; traição grave zera. */
export function pontosDepois(pontos: number, mudanca: 'ganha' | 'perde' | 'traicao'): PontosDeRelacao {
  if (mudanca === 'traicao') return 0;
  return limitarPontosDeRelacao(limitarPontosDeRelacao(pontos) + (mudanca === 'ganha' ? 1 : -1));
}

// ------------------------------------------------------------------ página

const tabelaDegraus = DEGRAUS_DE_RELACAO.map((degrau) => `
  <tr><td><strong>${degrau.pontos}</strong></td><td>${degrau.titulo}</td><td>${degrau.como}</td></tr>
`).join('');

const tabelaUsos = USOS_DE_PONTO.map((uso) => `
  <tr><td><strong>${uso.titulo}</strong></td><td>${uso.quando}<small class="regras-mecanica">${uso.efeito}</small></td></tr>
`).join('');

const tabelaSanidade = SANIDADE_DA_RELACAO.map((linha) => `
  <tr><td><strong>${linha.titulo}</strong></td><td>${linha.nomeDaDt}<br><small>${linha.dt} no nível 1</small></td><td>${linha.perdas[0]}</td><td>${linha.perdas[1]}</td><td>${linha.perdas[2]}</td></tr>
`).join('');

const lista = (itens: readonly string[]) => itens.map((item) => `<li>${item}</li>`).join('\n      ');

export const REGRA_PONTOS_DE_RELACAO: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'O quanto cada personagem do grupo confia em cada outro, de 0 a 3. Os pontos dão bônus para ajudar, para tirar alguém de uma crise de Sanidade e para o Ataque Combinado, e fazem você perder Sanidade quando algo ruim acontece com essa pessoa.',
  destaques: [
    ['Pontos', `0 a ${PONTOS_DE_RELACAO_MAXIMOS} por pessoa`],
    ['Usos', '1 por ponto, por sessão'],
    ['Sanidade', 'mais pontos, mais perda'],
  ],
  corpo: `
    <p class="regras-lead">Os Pontos de Relação mostram o quanto um personagem do grupo confia em outro, de 0 a ${PONTOS_DE_RELACAO_MAXIMOS}. Eles dão bônus quando vocês agem juntos, mas também fazem você perder mais Sanidade quando algo ruim acontece com essa pessoa.</p>

    <div class="regras-resumo">
      <ul>
        <li>Cada personagem tem de 0 a ${PONTOS_DE_RELACAO_MAXIMOS} pontos com cada outro personagem do grupo: os dos jogadores e os Aliados que andam com vocês.</li>
        <li>Cada ponto é um uso por sessão com aquela pessoa: <strong>Ajuda certa</strong>, <strong>Segurar a mão</strong> ou entrar num <span class="regras-ref regras-ref--ataques-combinados">Ataque Combinado</span> com Sintonia. Os usos voltam no começo da próxima sessão.</li>
        <li>Quanto mais pontos, maior a perda de Sanidade quando a pessoa cai, morre, some ou trai.</li>
        <li>Você ganha no máximo 1 ponto com a mesma pessoa por aventura. Mentira descoberta e abandono tiram 1 ponto, e traição grave zera tudo.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Os pontos</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Pontos</th><th>Degrau</th><th>Como os dois estão</th></tr></thead>
      <tbody>${tabelaDegraus}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Cada um anota os seus.</strong> Você anota os seus pontos com cada pessoa, e ela anota os dela com você. Normalmente os números são iguais, mas podem ser diferentes.</li>
      <li><strong>O máximo é ${PONTOS_DE_RELACAO_MAXIMOS}</strong> com cada pessoa, e você pode ter pontos com quantas pessoas quiser. É a mesma escada dos contatos (Conhecido, Amigo e Leal).</li>
      <li><strong>Quem é de fora do grupo</strong> usa a Confiança de <span class="regras-ref regras-ref--contatos-lacos">Contatos e Laços</span>. Quando alguém passa a andar com vocês, os pontos começam no mesmo degrau da Confiança dele.</li>
    </ul>
    <p class="regras-note">Na ficha, os pontos ficam nos Vínculos, dentro das Notas. Marque o vínculo como alguém do grupo, e os pontos são calculados pela afinidade: 1 ou 2 vale 1 ponto, 3 ou 4 vale 2 e 5 vale 3.</p>

    <h3 class="regras-subtitle">Usar os pontos</h3>
    <p>Cada ponto que você tem com alguém vale <strong>um uso por sessão</strong> com essa pessoa, e ela precisa estar na cena. Se você tem 2 pontos com a Duda, pode usar duas vezes por sessão. Gastar um uso não tira o ponto, e o uso volta na próxima sessão.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Uso</th><th>Quando, e o que faz</th></tr></thead>
      <tbody>${tabelaUsos}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>A Ajuda certa segue as regras de <span class="regras-ref regras-ref--acoes-coletivas">Ações Coletivas</span></strong>: a ajuda precisa fazer sentido na cena, e o teste continua com no máximo dois ajudantes.</li>
      <li><strong>Segurar a mão</strong> só pode ser usado uma vez por teste ou por crise, mesmo que mais de uma pessoa queira ajudar.</li>
      <li><strong>No Ataque Combinado,</strong> só entra quem tem pelo menos 1 ponto com o líder. A Sintonia é o menor número de pontos que os aliados têm com ele, e cada aliado gasta um uso. A tabela de bônus está no tópico do Ataque Combinado.</li>
    </ul>

    <h3 class="regras-subtitle">Perda de Sanidade</h3>
    <p>Quando algo acontece com uma pessoa com quem você tem pontos, você testa Sanidade pela tabela abaixo, contra a DT do seu nível: a Rotineira quando ela cai e a Padrão quando você a perde. No nível 1 as DTs são 10 e 15. Em outros níveis, some o ajuste da tabela de DT em <span class="regras-ref regras-ref--pericias">Perícias</span>. Cada pessoa causa no máximo um teste de cada linha por cena. Como sempre em <span class="regras-ref regras-ref--condicoes">Condições</span>, sucesso corta a perda pela metade e sucesso crítico evita a perda.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>O que acontece</th><th>DT</th><th>1 ponto</th><th>2 pontos</th><th>3 pontos</th></tr></thead>
      <tbody>${tabelaSanidade}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Se você tem laço e pontos com a mesma pessoa,</strong> role uma vez só, pela linha dos pontos. Um laço rompido sem pontos usa a linha de 1 ponto (DT Padrão do seu nível, 1d6), como em Contatos e Laços.</li>
      <li><strong>Perder alguém com quem você tem 3 pontos</strong> normalmente causa Luto Profundo, uma condição de longo prazo. O Mestre decide junto com o jogador.</li>
      <li><strong>Traição</strong> pede o teste da segunda linha e zera os pontos na hora.</li>
    </ul>

    <h3 class="regras-subtitle">Ganhar e perder pontos</h3>
    <p><strong>Você ganha 1 ponto</strong> com uma pessoa quando os dois passam por algo importante juntos, como nos exemplos abaixo. No máximo 1 ponto novo com a mesma pessoa por aventura.</p>
    <ul class="regras-list">
      ${lista(COMO_GANHAR)}
    </ul>
    <p><strong>Você perde 1 ponto</strong> quando faz algo que quebra a confiança:</p>
    <ul class="regras-list">
      ${lista(COMO_PERDER)}
    </ul>
    <ul class="regras-list">
      <li><strong>Traição grave</strong> (vender a pessoa, atacar de propósito, deixar morrer quando dava para salvar) zera os pontos.</li>
      <li><strong>Na criação,</strong> se dois personagens já se conheciam antes da aventura, cada um começa com 1 ponto com o outro, até 2 pontos no total por personagem.</li>
      <li><strong>O jogador pode pedir o ponto</strong>, e o Mestre confirma se a cena justificou.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Rafa tem 2 pontos com a Duda. Duda falha num teste de Sanidade ao ver uma criatura, e Rafa gasta um uso para Segurar a mão: ela refaz o teste e passa. Duas rodadas depois, Duda lidera um Ataque Combinado e chama Rafa e o Guerreiro, que tem só 1 ponto com ela. A Sintonia é 1, então cada ataque ganha +2. No fim da luta, Duda cai Morrendo, e Rafa testa Sanidade contra a DT Rotineira do próprio nível (10 no nível 1). Se falhar, perde 1d6.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">Os pontos fazem a relação entre os personagens aparecer na ficha. Preste atenção nas cenas que merecem um ponto, e lembre que perder alguém com 3 pontos pesa muito para o personagem.</p>

    <h3 class="regras-subtitle">Dar e tirar pontos</h3>
    <ul class="regras-list">
      <li>No fim de cada aventura, pergunte à mesa quem ficou mais perto de quem. Normalmente a resposta é fácil, e ela diz quem ganha o ponto.</li>
      <li>Um ponto por aventura com a mesma pessoa é o teto, de propósito. Chegar a 3 leva umas três aventuras, e é isso que dá peso ao Uníssono do Ataque Combinado.</li>
      <li>Tirar ponto é para quando a ficção já tirou. Não use como castigo por jogada ruim: quem perde o ponto deveria sentir que a mesa só anotou o que aconteceu.</li>
    </ul>

    <h3 class="regras-subtitle">Usar a Sanidade com cuidado</h3>
    <ul class="regras-list">
      <li>A linha de "cai" acontece muito em combate difícil. Uma cena, um teste: se a mesma pessoa cair duas vezes, o segundo susto não cobra de novo.</li>
      <li>A linha de "perde" é a mais forte do livro para um personagem. Morte, sumiço e traição de alguém do grupo pedem aviso na ficção e uma cena depois.</li>
      <li>Aliados também têm pontos. Um companheiro com 3 pontos que morre numa emboscada é uma das cenas mais lembradas de uma campanha.</li>
    </ul>

    <h3 class="regras-subtitle">Onde os pontos aparecem</h3>
    <ul class="regras-list">
      <li>O laço é a frase, e os pontos são o peso. Um personagem pode ter laço sem pontos (um NPC distante) e pontos sem laço (a parceira de estrada que ele nunca soube explicar).</li>
      <li>A vantagem do laço continua sendo do laço, e os usos dos pontos são à parte. Os dois juntos fazem o grupo agir pelo outro e com o outro.</li>
      <li>Lembre a mesa do Segurar a mão quando você pedir um teste de Sanidade. É o momento em que a regra mais faz o grupo se olhar.</li>
    </ul>
  `,
};
