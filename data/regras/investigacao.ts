/** Investigação.
 *
 * Mistério que trava num teste que falhou para a mesa inteira. A regra daqui
 * existe para isso nunca acontecer: a pista essencial vem de procurar no lugar
 * certo, e o dado decide o que vem junto e quanto custou. O relógio do caso é
 * o outro lado agindo enquanto o grupo pensa, e o Detetive continua com o que
 * é só dele (Dedução Metódica, Golpe de Vista, Caso Encerrado).
 */
import type { RegraTopicoDe } from './tipos';

export interface ITamanhoDeCaso {
  id: string;
  titulo: string;
  /** Perguntas que fecham o caso. */
  perguntas: number;
  /** Partes do relógio do caso. */
  relogio: number;
  exemplo: string;
}

export const TAMANHOS_DE_CASO: readonly ITamanhoDeCaso[] = [
  { id: 'curto', titulo: 'Curto', perguntas: 2, relogio: 4, exemplo: 'Quem roubou a carga do armazém, e para onde ela foi.' },
  { id: 'sessao', titulo: 'De uma sessão', perguntas: 3, relogio: 6, exemplo: 'Quem envenenou o cônsul, como entrou e por que agora.' },
  { id: 'arco', titulo: 'De um arco', perguntas: 4, relogio: 8, exemplo: 'Quem está apagando os nomes do registro da cidade, como, por que, e quem é o próximo.' },
];

/** Cada pergunta tem pelo menos três pistas em lugares diferentes. Basta uma
 *  para seguir; as outras são a rede de segurança da mesa. */
export const PISTAS_POR_PERGUNTA = 3;

export interface IFonteDePista {
  pericia: string;
  acha: string;
}

export const FONTES_DE_PISTA: readonly IFonteDePista[] = [
  { pericia: 'Investigação', acha: 'O que um objeto, um arquivo ou uma cena guardam: a gaveta com fundo falso, a data rasurada no livro-caixa.' },
  { pericia: 'Percepção', acha: 'O que está à vista para quem olha: a lama fresca na bota, a cortina que não combina com a sala.' },
  { pericia: 'Intuição', acha: 'O que as pessoas escondem: o nervosismo de quem mente, a pergunta que alguém evita.' },
  { pericia: 'Cura', acha: 'O que um corpo conta: a hora da morte, a ferida que não bate com a história, o veneno no lábio.' },
  { pericia: 'Sobrevivência', acha: 'Rastro de gente e de bicho, para onde foram e quantos eram.' },
  { pericia: 'Conhecimento, Nobreza ou Religião', acha: 'O que um símbolo, um brasão ou um rito querem dizer, e a quem pertencem.' },
  { pericia: 'Misticismo ou Ressonância', acha: 'O rastro de uma magia ou de um Fluxo: o que foi feito, de que Fluxo, há quanto tempo.' },
  { pericia: 'Tecnologia', acha: 'O registro de um sistema A.X.I.S, a câmera, a tranca que guarda a hora em que abriu.' },
  { pericia: 'Ladinagem', acha: 'A fechadura forçada, o cofre aberto por quem sabia a combinação.' },
  { pericia: 'Diplomacia ou Intimidação', acha: 'O que a testemunha sabe e não quer contar. Quem resiste de verdade vira Conflito Social.' },
];

export type ResultadoDaBusca = 'pista-e-extra' | 'pista' | 'pista-e-custo' | 'pista-e-dois-custos';

/** O que uma busca no lugar certo entrega. A pista vem sempre; o teste decide
 *  o resto. Sucesso por 10 ou mais traz um extra, a falha cobra um custo e a
 *  falha crítica cobra dois. */
export function resultadoDaBusca(resultado: number, dt: number, { falhaCritica = false } = {}): ResultadoDaBusca {
  if (falhaCritica) return 'pista-e-dois-custos';
  if (resultado < dt) return 'pista-e-custo';
  return resultado >= dt + 10 ? 'pista-e-extra' : 'pista';
}

export const CUSTOS_DE_BUSCA: readonly string[] = [
  'Demorou: pinte 1 parte do relógio do caso.',
  'Alguém percebeu a pergunta, e o culpado fica sabendo que vocês estão perto.',
  'O lugar fica marcado: voltar ali depois vai ser mais difícil.',
  'A testemunha se fecha: a próxima conversa com ela começa com 1 de Paciência.',
  'A pista vem estragada: ela aponta a direção certa, e a confirmação exige uma segunda.',
];

// ------------------------------------------------------------------ página

const tabelaTamanhos = TAMANHOS_DE_CASO.map((caso) => `
  <tr><td><strong>${caso.titulo}</strong></td><td>${caso.perguntas}</td><td>${caso.relogio} partes</td><td>${caso.exemplo}</td></tr>
`).join('');

const tabelaFontes = FONTES_DE_PISTA.map((fonte) => `
  <tr><td><strong>${fonte.pericia}</strong></td><td>${fonte.acha}</td></tr>
`).join('');

const listaCustos = CUSTOS_DE_BUSCA.map((custo) => `<li>${custo}</li>`).join('\n        ');

export const REGRA_INVESTIGACAO: RegraTopicoDe<'Combate e Mecânicas'> = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Um mistério quebrado em perguntas, três pistas para cada uma e um relógio do outro lado. A pista essencial vem de procurar no lugar certo, e o dado decide o que vem junto.',
  destaques: [
    ['Perguntas', '2 a 4 por caso'],
    ['Pistas', `${PISTAS_POR_PERGUNTA} por pergunta`],
    ['Relógio do caso', '4, 6 ou 8 partes'],
  ],
  corpo: `
    <p class="regras-lead">Alguém morreu, alguma coisa sumiu, um nome apareceu onde não devia. O grupo tem perguntas, o mundo tem respostas espalhadas, e do outro lado alguém trabalha para que elas continuem espalhadas. Esta página diz como achar o que está escondido sem que um dado ruim encerre a história.</p>

    <div class="regras-resumo">
      <ul>
        <li>Todo caso é uma pergunta grande quebrada em ${TAMANHOS_DE_CASO[0].perguntas} a ${TAMANHOS_DE_CASO[TAMANHOS_DE_CASO.length - 1].perguntas} perguntas menores: quem, como, por quê, onde está agora.</li>
        <li>Cada pergunta tem pelo menos ${PISTAS_POR_PERGUNTA} pistas, em lugares diferentes. Uma basta para seguir.</li>
        <li>Quem procura no lugar certo, do jeito certo, acha a pista essencial sem rolar. O teste vem depois e decide o que vem junto e quanto custou.</li>
        <li>O relógio do caso é o outro lado agindo. Ele pinta com cada custo e cada dia parado, e quando fecha o culpado faz alguma coisa.</li>
        <li>Quando o grupo travar, Ligar os pontos aponta a pergunta aberta e onde procurar.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">O caso</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Tamanho</th><th>Perguntas</th><th>Relógio</th><th>Exemplo</th></tr></thead>
      <tbody>${tabelaTamanhos}</tbody>
    </table></div>
    <p>O Mestre diz as perguntas em voz alta quando o caso começa, ou deixa o grupo chegar nelas. Responder todas fecha o caso; o que fazer com a resposta é outra cena.</p>

    <h3 class="regras-subtitle">Achar uma pista</h3>
    <ol class="regras-steps">
      <li><strong>Diga o que procura e onde.</strong> Abrir a gaveta, cheirar o copo, perguntar ao cocheiro quem desceu na esquina. "Procuro pistas na sala" é pouco: a sala tem dez lugares.</li>
      <li><strong>Lugar certo, pista na mão.</strong> Se ali há uma pista essencial e a ideia alcança, o personagem acha sem rolar.</li>
      <li><strong>O teste decide o resto,</strong> contra a DT Padrão do nível do caso:
        <ul class="regras-list">
          <li><strong>Sucesso por 10 ou mais:</strong> a pista e um extra (um segundo nome, o horário exato, vantagem no próximo teste contra o suspeito).</li>
          <li><strong>Sucesso:</strong> a pista, limpa.</li>
          <li><strong>Falha:</strong> a pista, e um custo.</li>
          <li><strong>Falha crítica:</strong> a pista, e dois custos.</li>
        </ul>
      </li>
    </ol>
    <p>Os custos de falha:</p>
    <ul class="regras-list">
        ${listaCustos}
    </ul>
    <p class="regras-note">Pistas que não são essenciais (o detalhe que enriquece, a conexão com outro caso) podem depender do teste. Só as essenciais nunca dependem.</p>

    <h3 class="regras-subtitle">Que perícia acha o quê</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Perícia</th><th>O que ela acha</th></tr></thead>
      <tbody>${tabelaFontes}</tbody>
    </table></div>

    <h3 class="regras-subtitle">O relógio do caso</h3>
    <ul class="regras-list">
      <li><strong>Pinta uma parte</strong> por custo de falha que diga "demorou", por dia inteiro sem pista nova e por barulho do grupo (uma invasão mal feita, um suspeito acusado em público).</li>
      <li><strong>Quando fecha,</strong> o culpado age: foge da cidade, queima o arquivo, cala uma testemunha, ataca de novo. O caso continua, e a ação dele deixa pistas novas.</li>
      <li><strong>O relógio zera</strong> depois que o culpado age, e o Mestre diz o que ele fará quando fechar de novo.</li>
    </ul>

    <h3 class="regras-subtitle">Ligar os pontos</h3>
    <ul class="regras-list">
      <li><strong>Quando o grupo travar,</strong> um personagem passa uma hora revendo o que tem e testa Investigação contra a DT Padrão. Sucesso: o Mestre diz qual pergunta ainda está aberta e aponta um lugar ou uma pessoa onde há pista dela. Uma vez por pergunta.</li>
      <li><strong>Apontar o culpado é escolha do grupo.</strong> O Mestre não confirma antes, e errar tem consequência na história. Quem se interroga entra em <span class="regras-ref regras-ref--conflito-social">Conflito Social</span>, onde cada ponto de Resistência que cai num interrogatório entrega uma informação.</li>
      <li><strong>O Detetive vai além:</strong> a Dedução Metódica arranca detalhes que ninguém mais vê, o Golpe de Vista aponta o que está fora do lugar e o Caso Encerrado confirma uma acusação.</li>
      <li><strong>Anotem as pistas</strong> num lugar que a mesa inteira vê. Mistério se perde mais por esquecimento que por falta de pista.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>O cônsul morreu na ceia. A Médica pede para ver o corpo: há uma pista essencial ali (o lábio arroxeado de Beladona Destilada), e ela acha sem rolar. Ela testa Cura e passa por 10: além do veneno, sabe que ele foi posto no vinho e não na comida. Depois, o Guerreiro pergunta aos criados quem serviu o vinho e falha: recebe o nome do copeiro, mas o mordomo ouviu a pergunta, e o relógio do caso pinta uma parte.</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">Mistério bom é preparado de trás para frente: primeiro a verdade, depois as perguntas que levam a ela, depois três caminhos para cada pergunta. Quem joga só vai ver os caminhos, e cada um precisa parecer o único.</p>

    <h3 class="regras-subtitle">Montar o caso</h3>
    <ol class="regras-steps">
      <li><strong>Escreva a verdade em três frases:</strong> o que aconteceu, quem fez e por quê.</li>
      <li><strong>Quebre em perguntas</strong> que o grupo precisa responder para agir. Duas para um caso curto, quatro para um arco.</li>
      <li><strong>Três pistas por pergunta,</strong> cada uma num tipo de lugar diferente (uma pessoa, um objeto, um registro) e, se der, pedindo perícias diferentes. Assim o caso não depende do único personagem com Investigação.</li>
      <li><strong>Uma pista que vem até o grupo:</strong> o culpado age quando o relógio fecha, e essa ação é a rede de segurança final. Quem ataca de novo deixa rastro.</li>
    </ol>

    <h3 class="regras-subtitle">Na mesa</h3>
    <ul class="regras-list">
      <li>Quando o jogador descreve uma busca, pergunte a você mesmo se a ideia alcança a pista. Se alcança, entregue. Conferir a perícia exata antes disso só atrasa o mistério.</li>
      <li>O custo é a ferramenta de tensão. Escolha o que mais pesa naquele momento: o relógio quando há pressa, o culpado alertado quando o grupo está perto.</li>
      <li>Se a mesa formou uma teoria errada e bonita, deixe que ela siga até bater numa pista que não encaixa. Errar uma teoria faz parte da investigação, e a pista que desmente é das melhores cenas.</li>
      <li>Ligar os pontos aponta caminho e nunca entrega a resposta. A resposta é do grupo, e a confirmação é do Caso Encerrado do Detetive.</li>
    </ul>
  `,
};
