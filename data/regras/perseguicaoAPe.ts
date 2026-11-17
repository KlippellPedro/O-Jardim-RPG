/** Perseguição a pé.
 *
 * A distância usa exatamente as mesmas faixas da perseguição veicular
 * (veiculosCombate.ts), porque a mesa não deveria aprender dois vocabulários
 * para a mesma pergunta: quão longe está quem está fugindo. A diferença entre
 * as duas cenas é o que se rola e o que o terreno cobra, e é isso que vive
 * aqui.
 */
import type { RegraTopicoDe } from './tipos';
import {
  FAIXAS_PERSEGUICAO,
  deslocarFaixaPerseguicao,
  type FaixaPerseguicaoId,
} from './veiculosCombate';

export interface IManobraAPe {
  id: string;
  titulo: string;
  /** Como a manobra aparece na ficção, para o jogador descrever antes de rolar. */
  cena: string;
  teste: string;
  faixas: 'qualquer' | FaixaPerseguicaoId[];
  efeito: string;
  falha: string;
}

export interface IObstaculoPerseguicao {
  d6: number;
  cidade: string;
  ermo: string;
}

/** Rodadas do relógio da perseguição. Fechou, a cena acabou do jeito que
 *  estiver: ninguém aguenta correr a sessão inteira. */
export const RODADAS_DE_PERSEGUICAO = 6;

/** Depois desta rodada, correr cobra Cansaço de quem correu. Uma vez por cena,
 *  na mesma lógica do combate intenso da página de Descanso. */
export const RODADA_DO_FOLEGO = 4;

/** Somando a manobra do puxador e os efeitos de apoio, a faixa anda no máximo
 *  isto a favor de cada lado numa rodada: o mesmo que uma vitória por 10. */
export const FAIXAS_MAXIMAS_POR_LADO = 2;

/** Manobras que quem não puxa a corrida pode fazer. Elas atrapalham o outro
 *  lado sem disputar a faixa com o Atletismo. */
export const MANOBRAS_DE_APOIO = ['derrubar', 'ajuda', 'alcance'] as const;

/** Passos líquidos da rodada, em direção a Contato (negativo) ou a Escapou
 *  (positivo). Cada lado soma o que ganhou na rodada, com teto de
 *  FAIXAS_MAXIMAS_POR_LADO, e os dois se descontam. */
export function passosDaRodada(aFavorDoPerseguidor: number, aFavorDoFugitivo: number): number {
  const teto = (valor: number) => Math.max(0, Math.min(FAIXAS_MAXIMAS_POR_LADO, Math.trunc(valor)));
  return teto(aFavorDoFugitivo) - teto(aFavorDoPerseguidor);
}

/** O que cada faixa parece para quem está correndo. A distância em metros mora
 *  na escala compartilhada com os veículos; isto é só o jeito de contar. */
const SENSACAO_DA_FAIXA: Record<FaixaPerseguicaoId, string> = {
  contato: 'Colado no outro. Dá para agarrar.',
  curta: 'Logo atrás, a poucos passos.',
  média: 'Ainda dá para ver o outro, mas ele some de vista nas curvas.',
  longa: 'O outro está longe e quase sumindo no meio das pessoas.',
  escapou: 'Quem fugia sumiu de vista.',
};

export const MANOBRAS_A_PE: readonly IManobraAPe[] = [
  {
    id: 'correr',
    titulo: 'Correr solto',
    cena: 'Correr o mais rápido que conseguir, sem truque.',
    teste: 'Atletismo oposto',
    faixas: 'qualquer',
    efeito: 'Quem vence move uma faixa a favor. Vitória por 10 ou mais move duas.',
    falha: 'A faixa não muda, e o outro lado escolhe a manobra da rodada seguinte antes de você.',
  },
  {
    id: 'atalho',
    titulo: 'Cortar caminho',
    cena: 'Pegar um beco, pular uma cerca ou passar por dentro de um prédio para sair na frente.',
    teste: 'Investigação na cidade, Sobrevivência no ermo',
    faixas: 'qualquer',
    efeito: 'Move uma faixa a favor e ignora o obstáculo desta rodada. Com vantagem, se o personagem conhece o lugar.',
    falha: 'O atalho não leva a lugar nenhum, e a faixa move uma contra você.',
  },
  {
    id: 'salto',
    titulo: 'Salto arriscado',
    cena: 'Pular de um telhado para outro, por cima de uma carroça ou por um vão.',
    teste: 'Acrobacia contra a DT Difícil',
    faixas: 'qualquer',
    efeito: 'Move duas faixas a favor de uma vez.',
    falha: 'Você cai: fica Caído, perde a rodada e a faixa move uma contra você.',
  },
  {
    id: 'derrubar',
    titulo: 'Derrubar um obstáculo',
    cena: 'Derrubar barris, uma barraca ou qualquer coisa no caminho de quem vem atrás.',
    teste: 'Atletismo ou Luta contra a DT Padrão',
    faixas: 'qualquer',
    efeito: 'Quem vem atrás testa Reflexos na DT Padrão ou move uma faixa contra si.',
    falha: 'Nada cai, e você perde a rodada.',
  },
  {
    id: 'alcance',
    titulo: 'Acertar de longe',
    cena: 'Parar um instante para atirar, arremessar algo ou lançar uma magia.',
    teste: 'Pontaria, magia ou o que alcançar',
    faixas: ['contato', 'curta', 'média'],
    efeito: 'Resolve normalmente. Condição que tire o movimento move uma faixa a favor de quem atirou.',
    falha: 'A faixa não muda. Mirar correndo custa a rodada de qualquer jeito.',
  },
  {
    id: 'sumir',
    titulo: 'Sumir de vista',
    cena: 'Se misturar na multidão, entrar num lugar cheio ou trocar de roupa para não ser reconhecido.',
    teste: 'Furtividade oposta à Percepção',
    faixas: ['longa'],
    efeito: 'Encerra a cena: o fugitivo Escapou.',
    falha: 'Alguém viu onde você se escondeu, e quem persegue ganha uma faixa.',
  },
  {
    id: 'ajuda',
    titulo: 'Atravessar gente no caminho',
    cena: 'Gritar "pega ladrão", mostrar um distintivo ou pedir passagem para as pessoas abrirem caminho.',
    teste: 'Diplomacia ou Intimidação contra a DT Padrão',
    faixas: 'qualquer',
    efeito: 'A rua atrapalha o outro lado, e ele sofre desvantagem na manobra seguinte.',
    falha: 'As pessoas atrapalham você, e a faixa move uma contra você.',
  },
  {
    id: 'agarrar',
    titulo: 'Agarrar',
    cena: 'Segurar quem você alcançou e derrubar no chão.',
    teste: 'Atletismo oposto, apenas em Contato',
    faixas: ['contato'],
    efeito: 'Aplica Agarrado e encerra a perseguição.',
    falha: 'Você não consegue segurar e passa direto: a faixa move uma contra você.',
  },
];

export const OBSTACULOS_PERSEGUICAO: readonly IObstaculoPerseguicao[] = [
  { d6: 1, cidade: 'Uma feira no meio da rua, cheia de barracas e de gente.', ermo: 'Raízes grossas e um tronco caído no caminho.' },
  { d6: 2, cidade: 'Uma escada estreita, onde só passa uma pessoa por vez.', ermo: 'Um barranco de terra solta, difícil de subir.' },
  { d6: 3, cidade: 'Um vão entre dois telhados.', ermo: 'Um riacho com água na cintura e pedras escorregadias.' },
  { d6: 4, cidade: 'Uma carroça parada atravessada na rua.', ermo: 'Mato alto que esconde o chão.' },
  { d6: 5, cidade: 'Um portão de ferro que alguém acabou de fechar.', ermo: 'Uma neblina baixa que atrapalha a visão.' },
  { d6: 6, cidade: 'Um guarda no fim da rua, querendo saber o que está acontecendo.', ermo: 'Um animal grande e irritado no caminho.' },
];

export function obstaculoPorD6(valor: number): IObstaculoPerseguicao {
  const obstaculo = OBSTACULOS_PERSEGUICAO.find((item) => item.d6 === valor);
  if (!obstaculo) throw new Error(`Resultado de obstáculo inválido: ${valor}`);
  return obstaculo;
}

/** Move a faixa depois de uma rodada resolvida. Perseguidor ganhando puxa em
 *  direção a Contato; fugitivo ganhando empurra em direção a Escapou. Vitória
 *  por 10 ou mais vale duas faixas. */
export function resolverRodadaAPe(
  faixa: FaixaPerseguicaoId,
  resultado: { vencedor: 'perseguidor' | 'fugitivo' | 'empate'; margem?: number },
): FaixaPerseguicaoId {
  if (resultado.vencedor === 'empate') return faixa;
  const passos = Math.abs(resultado.margem ?? 0) >= 10 ? 2 : 1;
  const sentido = resultado.vencedor === 'perseguidor' ? -1 : 1;
  return deslocarFaixaPerseguicao(faixa, passos * sentido);
}

const nomeDaFaixa = (id: FaixaPerseguicaoId) => (id === 'escapou' ? 'Escapou' : id[0].toUpperCase() + id.slice(1));

const tabelaFaixas = FAIXAS_PERSEGUICAO.map((faixa) => `
  <tr><td><strong>${nomeDaFaixa(faixa.id)}</strong></td><td>${SENSACAO_DA_FAIXA[faixa.id]}<small class="regras-mecanica">${faixa.descricao}</small></td></tr>
`).join('');

const tabelaManobras = MANOBRAS_A_PE.map((manobra) => `
  <tr>
    <td><strong>${manobra.titulo}</strong>${manobra.faixas === 'qualquer' ? '' : `<br><small>Só em ${manobra.faixas.map(nomeDaFaixa).join(', ')}</small>`}</td>
    <td>${manobra.cena}<small class="regras-mecanica"><strong>Teste:</strong> ${manobra.teste}. <strong>Sucesso:</strong> ${manobra.efeito} <strong>Falha:</strong> ${manobra.falha}</small></td>
  </tr>
`).join('');

const tabelaObstaculos = OBSTACULOS_PERSEGUICAO.map((obstaculo) => `
  <tr><td>${obstaculo.d6}</td><td>${obstaculo.cidade}</td><td>${obstaculo.ermo}</td></tr>
`).join('');

export const REGRA_PERSEGUICAO_A_PE: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Regras para quando alguém foge a pé e alguém vai atrás. A distância é medida em faixas, e a cada rodada cada lado tenta ganhar terreno.',
  destaques: [
    ['Faixas', 'Contato a Escapou'],
    ['Duração', `${RODADAS_DE_PERSEGUICAO} rodadas`],
    ['Teste base', 'Atletismo oposto'],
  ],
  corpo: `
    <p class="regras-lead">Use esta regra quando alguém foge a pé e alguém vai atrás. A distância entre os dois é medida em faixas, as mesmas da perseguição de veículos, e a cada rodada cada lado faz uma manobra para ganhar ou perder distância.</p>

    <div class="regras-resumo">
      <ul>
        <li>A distância usa as mesmas faixas da perseguição de veículos (ver <span class="regras-ref regras-ref--veiculos-cenas">Perseguições e Combate Veicular</span>), de Contato a Escapou. Quem persegue quer chegar a Contato, e quem foge quer chegar a Escapou.</li>
        <li>A cada rodada o Mestre descreve o terreno e um obstáculo, e cada lado escolhe quem puxa a corrida. Os dois puxadores declaram uma manobra e testam. Quem vence move uma faixa a favor, ou duas se vencer por 10 ou mais.</li>
        <li>Quem não puxa ajuda o puxador ou faz uma manobra de apoio. Somando tudo, a faixa anda no máximo ${FAIXAS_MAXIMAS_POR_LADO} a favor de cada lado por rodada.</li>
        <li>A perseguição dura ${RODADAS_DE_PERSEGUICAO} rodadas. A partir da rodada ${RODADA_DO_FOLEGO}, quem correu ganha 1 de Cansaço ao fim da cena, uma vez só.</li>
        <li>Em Contato, começa o combate. Em Escapou, quem fugia some. Se as rodadas acabarem antes, ninguém consegue o que queria.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">As faixas</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Faixa</th><th>Como parece, e a distância</th></tr></thead>
      <tbody>${tabelaFaixas}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>A perseguição começa na distância em que os dois estavam</strong> quando a corrida começou. Quem foge no meio de uma conversa começa em Contato; quem foge de alguém visto de longe começa em Longa.</li>
      <li><strong>Cada lado tem uma faixa só.</strong> O grupo anda na velocidade de quem está mais atrás. Quem quiser correr na frente sozinho passa a ter uma faixa própria, separada do grupo.</li>
      <li><strong>Cada lado tem um puxador por rodada,</strong> que vai na frente e decide o caminho. Só a manobra dele disputa a faixa. O puxador pode mudar de uma rodada para outra.</li>
    </ul>

    <h3 class="regras-subtitle">A rodada</h3>
    <ol class="regras-steps">
      <li>O Mestre descreve o terreno da rodada e rola 1d6 na tabela de obstáculos, ou escolhe um.</li>
      <li>Cada lado escolhe o puxador. O puxador declara uma manobra, e os outros declaram se vão Ajudar o puxador ou fazer uma manobra de apoio. Quem foge declara primeiro.</li>
      <li>Resolvam primeiro as ajudas e o apoio, depois os puxadores. Quem vence move uma faixa a favor, e vitória por 10 ou mais move duas. Somando o apoio, cada lado ganha no máximo ${FAIXAS_MAXIMAS_POR_LADO} faixas na rodada.</li>
      <li>Teste oposto é sempre contra o Atletismo do puxador do outro lado, seja qual for a manobra dele. Quando os dois puxadores passam em testes contra DT, cada um move a faixa a seu favor, e os passos se anulam.</li>
      <li>Quem não passou pelo obstáculo na própria manobra testa para passar por ele (veja Obstáculos).</li>
      <li>Marque uma rodada no relógio da perseguição.</li>
    </ol>
    <p class="regras-note">A perseguição dura ${RODADAS_DE_PERSEGUICAO} rodadas. Se ninguém chegou a Contato nem a Escapou quando elas acabarem, quem fugia sai de vista, mas quem perseguia ainda sabe para que lado ele foi e pode continuar procurando em outra cena.</p>

    <h3 class="regras-subtitle">Manobras</h3>
    <p>Cada manobra diz o que o personagem faz e, embaixo, o teste e o resultado. Diga rapidamente o que você faz antes de rolar.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Manobra</th><th>O que é, e como se resolve</th></tr></thead>
      <tbody>${tabelaManobras}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Uma manobra por personagem, por rodada.</strong> Ajudar o puxador segue as regras de <span class="regras-ref regras-ref--acoes-coletivas">Ações Coletivas</span> (no máximo dois ajudantes) e conta como a sua manobra.</li>
      <li><strong>Manobras de apoio</strong> são para quem não puxa: Derrubar um obstáculo, Atravessar gente no caminho e Acertar de longe. Elas atrapalham o outro lado sem disputar a faixa, e o puxador também pode escolher uma delas como a manobra dele. Cortar caminho, Salto arriscado, Correr solto, Sumir de vista e Agarrar são só do puxador.</li>
      <li><strong>A falha no apoio vale para o grupo todo.</strong> Quando uma manobra de apoio diz que a faixa move contra você, ela move contra o seu lado inteiro, porque a faixa é uma só.</li>
      <li><strong>Magia, item e habilidade de classe entram como manobra,</strong> com o teste que já usam. Um efeito que tire o movimento do outro lado move uma faixa a seu favor.</li>
      <li><strong>Cansaço:</strong> a partir da rodada ${RODADA_DO_FOLEGO}, quem correu ganha 1 de Cansaço ao fim da cena, uma vez só.</li>
    </ul>

    <h3 class="regras-subtitle">Obstáculos</h3>
    <div class="regras-table-wrap"><table class="regras-table regras-table--dado">
      <thead><tr><th>1d6</th><th>Na cidade</th><th>No ermo</th></tr></thead>
      <tbody>${tabelaObstaculos}</tbody>
    </table></div>
    <p>Quem não resolveu o obstáculo na própria manobra testa Acrobacia, Atletismo ou Reflexos contra a DT Padrão. A falha move uma faixa contra ele.</p>

    <h3 class="regras-subtitle">Como a cena termina</h3>
    <ul class="regras-list">
      <li><strong>Contato:</strong> a perseguição acaba e o combate começa ali mesmo, no terreno da última rodada. Quem foi alcançado fica Exposto até o começo do próximo turno dele.</li>
      <li><strong>Escapou:</strong> quem fugia sumiu. Para achar essa pessoa de novo, o grupo vai precisar investigar ou conseguir uma pista.</li>
      <li><strong>As rodadas acabaram:</strong> ninguém conseguiu o que queria, mas os dois lados descobrem algo um do outro, como o rosto ou para que lado ele foi.</li>
    </ul>
  `,
  corpoMestre: `
    <p class="regras-lead">A perseguição deixa o grupo ganhar ou perder sem que ninguém morra, e é uma boa chance de mostrar a cidade. Resolver tudo com um único teste de Atletismo desperdiça a cena.</p>

    <h3 class="regras-subtitle">Quando abrir as faixas</h3>
    <ul class="regras-list">
      <li>Abra quando o resultado importar dos dois lados. Um batedor de carteira que fugiu com uma moeda merece uma frase, e a moeda perdida.</li>
      <li>Se o grupo é claramente mais rápido, não role: eles alcançam. A cena boa é a que tem dúvida.</li>
      <li>NPC que precisa escapar para a história continuar deveria sumir antes de a cena começar. Se ele entrou numa perseguição, aceite a chance de perdê-lo.</li>
    </ul>

    <h3 class="regras-subtitle">Calibrar a dificuldade</h3>
    <ul class="regras-list">
      <li>Um fugitivo sozinho com o mesmo bônus do grupo perde uns dois terços das rodadas, porque o puxador do grupo recebe a Ajuda de dois companheiros (+4). Para segurar alguém por seis rodadas, dê a ele conhecimento do terreno, vantagem em uma manobra ou alguém atrapalhando atrás.</li>
      <li>O teto de ${FAIXAS_MAXIMAS_POR_LADO} faixas por lado existe para o grupo grande não atropelar a cena com apoio. Quatro personagens rendem uma rodada mais rica, e a perseguição continua decidida por quem puxa.</li>
      <li>O obstáculo é o seu botão de ajuste. Rolar 1d6 por rodada mantém a cena honesta; escolher o obstáculo aperta ou alivia sem mudar número nenhum.</li>
      <li>Terreno que favorece um lado deve ser dito antes da declaração de manobras. Quem foge para o telhado precisa saber que o telhado é vantagem dele.</li>
    </ul>

    <h3 class="regras-subtitle">Contar a corrida</h3>
    <ul class="regras-list">
      <li>Descreva a faixa pelo que se vê, e deixe o nome dela de lado: "você ainda vê o casaco dele virando a esquina" diz Média sem soar tabela.</li>
      <li>Use frases curtas. Narrar devagar tira a pressa da cena.</li>
      <li>Toda rodada precisa de uma escolha nova. Se as três últimas foram Correr solto contra Correr solto, jogue um obstáculo grande e feche a cena na rodada seguinte.</li>
      <li>Aproveite para mostrar a cidade: a feira, os telhados, os becos. Cada rodada pode passar por um lugar novo, e alguns deles podem voltar mais tarde na campanha.</li>
    </ul>
  `,
};
