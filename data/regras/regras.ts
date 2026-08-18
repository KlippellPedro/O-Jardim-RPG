
import classesData from '../ficha/classes.json';
import legadosData from '../ficha/legados.json';
import legadosNovosData from '../ficha/legados-novos.json';
import magiasData from '../ficha/magias.json';
import marcasCirculoData from '../ficha/marcas-de-circulo.json';
import periciasData from '../ficha/pericias.json';
import racasData from '../ficha/racas.json';
import { REGRA_AFLICOES } from './aflicoes';
import { REGRA_ATAQUES_COMBINADOS } from './ataquesCombinados';
import { REGRA_BASES } from './bases';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from './condicoes';
import { REGRA_CRAFTING } from './crafting';
import { REGRA_MUNDO_FACCOES } from './faccoes';
import {
  CATEGORIAS_MODIFICACAO,
  DONS_RARIDADE_POR_CATEGORIA,
  MODIFICACOES_EQUIPAMENTO,
  PRECO_MODIFICACAO_POR_VALOR,
  RARIDADES_EQUIPAMENTO,
  REGRAS_MODIFICACOES_EQUIPAMENTO,
  ROTULO_RARIDADE_MINIMA_MODIFICACAO,
} from './raridadesEquipamentos';
import { REGRA_VEICULOS } from './veiculosCombate';

import type { RegrasCatalog } from './tipos';

export type { CategoriaRegra, RegraTopic, RegrasCatalog } from './tipos';


function formatarXP(valor: number) {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

const tabelaXP = Array.from({ length: 60 }, (_, indice) => {
  const nivel = indice + 1;
  const xp = 500 * nivel * (nivel - 1);
  return `<span><strong>N${nivel}</strong>${formatarXP(xp)} XP</span>`;
}).join('');

const tabelaRaridadesEquipamento = RARIDADES_EQUIPAMENTO.map((raridade) => `
  <tr>
    <td><strong>${raridade.titulo}</strong>${raridade.requerMestre ? '<br><small>Aprovação do Mestre</small>' : ''}</td>
    <td>${raridade.modificacoesMaximas}</td>
    <td>${raridade.efeitosRaridadeMaximos}</td>
    <td>±${raridade.valorMaximoPorEfeito}</td>
    <td>${raridade.principio}</td>
  </tr>
`).join('');

const donsRaridadeEquipamento = Object.entries(DONS_RARIDADE_POR_CATEGORIA).map(([categoria, dons]) => `
  <details class="regras-details">
    <summary>${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</summary>
    <ul class="regras-list">
      ${RARIDADES_EQUIPAMENTO.filter((raridade) => raridade.id !== 'comum').map((raridade) => `<li><strong>${raridade.titulo}:</strong> ${dons[raridade.id]}</li>`).join('')}
    </ul>
  </details>
`).join('');

/** Gerado de data/regras/condicoes.ts para o livro público nunca divergir do
 * que a ficha e a sessão ao vivo realmente aplicam. */
const tabelaCondicoesGerais = CONDICOES_OFICIAIS.map((condicao) => `
  <tr>
    <td><strong>${condicao.titulo}</strong></td>
    <td>${condicao.efeitos.join(' ')}</td>
    <td>${condicao.remocao}</td>
  </tr>
`).join('');

const tabelaCrisesSanidade = CRISES_SANIDADE.map((crise) => `
  <tr>
    <td><strong>${crise.titulo}</strong></td>
    <td>${crise.duracao}</td>
    <td>${crise.efeitos.join(' ')}</td>
    <td>${crise.remocao}</td>
  </tr>
`).join('');

/** Geradas de data/ficha/classes.json e racas.json: o livro público lista nome,
 * tipo e conceito de cada entrada em vez de repetir a progressão inteira, que
 * já vive no catálogo interativo da página de Regras. */
const listaClassesPublicas = classesData
  .map((classe) => `<li><strong>${classe.titulo}</strong> (${classe.categoria === 'esquecida' ? 'especial' : 'comum'}) - ${classe.descricao}</li>`)
  .join('');

const listaRacasPublicas = racasData
  .filter((raca) => !raca.indisponivel && raca.id !== 'raca-personalizada')
  .map((raca) => `<li><strong>${raca.titulo}</strong> (${raca.categoria === 'esquecida' ? 'especial' : 'comum'}) - Vida ${raca.vida >= 0 ? '+' : ''}${raca.vida}, Mana ${raca.mana >= 0 ? '+' : ''}${raca.mana}${raca.movimento ? `, Movimento +${raca.movimento} m` : ''}</li>`)
  .join('');

const listaLegadosPublicos = [...(legadosData.legados || []), ...(legadosNovosData.novos || [])]
  .map((legado) => `<li><strong>${legado.titulo}:</strong> ${legado.descricao}</li>`)
  .join('');

const NOME_ATRIBUTO_PERICIA: Record<string, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

const tabelaPericiasPublicas = (periciasData.pericias || [])
  .map((pericia) => `
    <tr>
      <td><strong>${pericia.titulo}</strong></td>
      <td>${NOME_ATRIBUTO_PERICIA[pericia.atributo] || pericia.atributo}</td>
      <td>${pericia.descricao}</td>
    </tr>
  `).join('');

/** Sai de data/ficha/magias.json para o quadro publicado nunca divergir do
 * custo que a ficha cobra de verdade. */
const tabelaCirculos = magiasData.regras.circulos.map((circulo) => `
  <tr>
    <td>${circulo.circulo}º</td>
    <td>${circulo.fluxo_minimo}</td>
    <td>${circulo.dt_conjuracao}</td>
    <td>${circulo.mana_base}</td>
  </tr>
`).join('');

/** Mesmo rótulo de Árvore usado em FLUXO_TEMAS (src/services/magiaService.ts),
 * repetido aqui para não puxar o front inteiro só por um nome de exibição. */
const NOME_ARVORE_POR_FLUXO: Record<string, string> = {
  origem: 'Gênese', essencia: 'Alétheia', comunicacao: 'Parley', vitalidade: 'Anima',
  inconstancia: 'Vórtice', fisico: 'Baluarte', espaco: 'Matriz', tempo: 'Éon',
  vazio: 'Abismo', fim: 'Limiar', tecnologia: 'A.X.I.S',
};

const tabelaMarcasPorFluxo = Object.entries(marcasCirculoData.por_fluxo).map(([fluxoId, marcas]) => `
  <details class="regras-details">
    <summary>${NOME_ARVORE_POR_FLUXO[fluxoId] ?? fluxoId}</summary>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Círculo</th><th>Marca</th><th>Ganho</th><th>Ônus</th></tr></thead>
      <tbody>
        ${marcas.map((marca) => `
          <tr>
            <td>${marca.circulo}º</td>
            <td>${marca.titulo}</td>
            <td>${marca.bonus}</td>
            <td>${marca.onus}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
  </details>
`).join('');

const tabelaCicatrizes = marcasCirculoData.cicatrizes.map((cicatriz) => `
  <tr>
    <td>${cicatriz.titulo}</td>
    <td>${cicatriz.bonus}</td>
    <td>${cicatriz.onus}</td>
  </tr>
`).join('');

const ROTULO_NIVEL_MODIFICACAO = { comum: 'Comum', marcial: 'Marcial' } as const;
const ORDEM_NIVEL_MODIFICACAO = { comum: 0, marcial: 1 } as const;

/** As modificações ficam agrupadas por categoria para reduzir a extensão inicial da página. */
const tabelaModificacoesEquipamento = CATEGORIAS_MODIFICACAO.map(({ id, titulo }) => {
  const daCategoria = MODIFICACOES_EQUIPAMENTO
    .filter((modificacao) => modificacao.categoria === id)
    .sort((a, b) => ORDEM_NIVEL_MODIFICACAO[a.nivel] - ORDEM_NIVEL_MODIFICACAO[b.nivel]);
  const comuns = daCategoria.filter((modificacao) => modificacao.nivel === 'comum').length;
  return `
  <details class="regras-details">
    <summary>${titulo} <span class="regras-details-contagem">${daCategoria.length} modificações · ${comuns} comuns · ${daCategoria.length - comuns} marciais</span></summary>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Modificação</th><th>Nível</th><th>Valor</th><th>Preço</th><th>Pré-requisito</th><th>Efeito</th></tr></thead>
      <tbody>
        ${daCategoria.map((modificacao) => `
        <tr>
          <td><strong>${modificacao.titulo}</strong></td>
          <td>${ROTULO_NIVEL_MODIFICACAO[modificacao.nivel]}</td>
          <td>${modificacao.valor > 0 ? modificacao.valor : 'Técnica'}</td>
          <td>${PRECO_MODIFICACAO_POR_VALOR[modificacao.valor as 0 | 1 | 2 | 3]} L</td>
          <td>${modificacao.preRequisito || 'Nenhum'}</td>
          <td>${modificacao.efeito}</td>
        </tr>
      `).join('')}
      </tbody>
    </table></div>
  </details>
`;
}).join('');

const tabelaPrecoModificacoes = Object.entries(PRECO_MODIFICACAO_POR_VALOR).map(([valor, preco]) => `
  <tr>
    <td><strong>${Number(valor) > 0 ? `Valor ${valor}` : 'Técnica'}</strong></td>
    <td>${preco} Lunaris</td>
    <td>${ROTULO_RARIDADE_MINIMA_MODIFICACAO[Number(valor) as 0 | 1 | 2 | 3]}</td>
  </tr>
`).join('');

export const REGRAS_OFICIAIS: RegrasCatalog = {
  'como-jogar': {
    categoria: 'Livro do Jogador',
    status: 'Comece por aqui',
    resumo: 'O que é este jogo, quem faz o quê na mesa, como uma jogada se resolve e o significado das palavras que o resto do livro usa sem explicar de novo.',
    destaques: [
      ['Dado', 'Um d20 resolve quase tudo'],
      ['Conta', 'd20 + bônus contra uma DT'],
      ['Se nunca jogou', 'Leia só esta página primeiro'],
    ],
    corpo: `
      <p class="regras-lead">Esta é a primeira página do livro e a única que não pressupõe nada. Se você nunca jogou RPG, ela sozinha já basta para sentar na mesa. Se você já joga há anos, pule para o Vocabulário no fim: é lá que estão as poucas palavras que O Jardim usa de um jeito próprio.</p>

      <h3 class="regras-subtitle">O que é um RPG de mesa</h3>
      <p>Um grupo de pessoas conta uma história junta. Cada jogador controla um personagem e decide o que ele tenta fazer. Uma pessoa, o Mestre, descreve o mundo, interpreta todo o resto e diz o que acontece depois de cada escolha.</p>
      <p>Ninguém ganha e ninguém perde. O que existe é uma história que sai melhor quando todo mundo empurra junto. As regras deste livro entram só quando o resultado de uma tentativa é incerto e ninguém quer decidir no dedo: aí o dado decide.</p>

      <h3 class="regras-subtitle">Quem faz o quê</h3>
      <ul class="regras-list">
        <li><strong>Jogador:</strong> descreve o que o personagem faz, rola os dados dele e cuida da própria ficha.</li>
        <li><strong>Mestre:</strong> descreve a cena, controla os inimigos e os personagens do mundo, escolhe a dificuldade das tentativas e narra o resultado. É juiz e narrador, não adversário.</li>
        <li><strong>Ficha:</strong> a página do seu personagem no site. Guarda os números, o inventário, as magias e o histórico. Ela faz as contas sozinha; você decide o que fazer com elas.</li>
        <li><strong>Dados:</strong> escritos como 2d6, que quer dizer "role dois dados de seis lados e some". O dado principal do jogo é o d20, de vinte lados.</li>
      </ul>

      <h3 class="regras-subtitle">Como uma jogada se resolve</h3>
      <p>Quase tudo neste jogo passa pela mesma conta. Você rola um d20, soma seus bônus e compara com um número de dificuldade que o Mestre escolheu, chamado de DT.</p>
      <div class="regras-formula">d20 + bônus do personagem contra a DT da situação</div>
      <ul class="regras-list">
        <li>Deu igual ou mais que a DT, deu certo. Deu menos, não deu.</li>
        <li>O bônus sai da ficha: o atributo que a tarefa pede, metade do seu nível e o quanto você treinou aquela perícia.</li>
        <li>Um 20 no dado é sucesso crítico e um 1 é falha crítica, sem depender do bônus.</li>
        <li>Às vezes você rola dois d20 e usa o melhor (vantagem) ou o pior (desvantagem).</li>
      </ul>
      <p class="regras-note">Exemplo: sua personagem quer arrombar uma fechadura. O Mestre diz que a DT é 15. Ela tem Destreza 16 (bônus +3), está no nível 4 (mais 2) e é Aprendiz em Ladinagem (mais 2). O bônus total é +7. Você rola o d20, tira 9, soma 7 e chega a 16. Passou de 15: a fechadura abre.</p>

      <h3 class="regras-subtitle">Como uma sessão anda</h3>
      <p>Fora de combate o jogo é conversa: o Mestre descreve, você responde, e só se rola dado quando há risco de verdade. Quando a briga começa, o tempo é fatiado para caber todo mundo.</p>
      <ul class="regras-list">
        <li><strong>Cena:</strong> um trecho contínuo de história. A conversa com o guarda é uma cena; a emboscada logo depois é outra.</li>
        <li><strong>Rodada:</strong> dentro de um combate, o intervalo em que todo mundo age uma vez. São mais ou menos seis segundos de ficção.</li>
        <li><strong>Turno:</strong> a sua vez dentro da rodada. Você tem uma ação principal, um deslocamento e uma reação guardada para o turno dos outros.</li>
        <li><strong>Iniciativa:</strong> a ordem em que as pessoas agem. Aqui ela não se rola: é um número fixo da ficha.</li>
      </ul>

      <h3 class="regras-subtitle">Vocabulário</h3>
      <p>Estas palavras aparecem no livro inteiro sem serem explicadas de novo. Se travar em alguma no meio de outro capítulo, volte aqui.</p>
      <div class="regras-table-wrap">
        <table class="regras-table">
          <thead><tr><th>Termo</th><th>O que quer dizer</th></tr></thead>
          <tbody>
            <tr><td><strong>DT</strong></td><td>Dificuldade do Teste. O número que sua rolagem precisa alcançar.</td></tr>
            <tr><td><strong>Teste</strong></td><td>Qualquer rolagem de d20 contra uma DT.</td></tr>
            <tr><td><strong>Grau</strong></td><td>O quanto você treinou uma perícia, de Iniciante a Renomado. Cada degrau vale um bônus fixo.</td></tr>
            <tr><td><strong>Atributo</strong></td><td>Os sete números que descrevem o personagem: Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma e Fluxo.</td></tr>
            <tr><td><strong>Vida e Mana</strong></td><td>Quanto dano você aguenta e quanto combustível mágico você tem.</td></tr>
            <tr><td><strong>Sanidade</strong></td><td>Uma terceira barra, de 0 a 100, que cai diante de horror e trauma.</td></tr>
            <tr><td><strong>Cansaço</strong></td><td>Uma trilha de 0 a 6 que mede desgaste acumulado. Quanto mais alto, pior você joga.</td></tr>
            <tr><td><strong>Condição</strong></td><td>Um estado que gruda no personagem por um tempo, como Caído, Cego ou Sangramento.</td></tr>
            <tr><td><strong>Defesa</strong></td><td>O número que um inimigo precisa alcançar para acertar você.</td></tr>
            <tr><td><strong>Fluxo</strong></td><td>A energia que atravessa tudo neste mundo, e também o atributo que mede seu controle sobre ela. Toda magia sai de um Fluxo.</td></tr>
            <tr><td><strong>Árvore</strong></td><td>A realidade de onde seu personagem vem. Cada Árvore tem sua deidade, seus povos e suas opções exclusivas.</td></tr>
            <tr><td><strong>Legado</strong></td><td>Uma escolha permanente que você faz a cada cinco níveis e que muda como o personagem funciona.</td></tr>
            <tr><td><strong>NPC</strong></td><td>Qualquer personagem controlado pelo Mestre, de um taverneiro a um dragão.</td></tr>
            <tr><td><strong>⌊ ⌋</strong></td><td>Arredonde para baixo e ignore a fração. ⌊Nível ÷ 2⌋ no nível 7 dá 3, não 3,5.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="regras-subtitle">Por onde continuar</h3>
      <ul class="regras-list">
        <li><strong>Nunca jogou:</strong> vá para Criação de Personagem e monte um com o Mestre do lado. Depois leia Perícias e Combate, nessa ordem. O resto você consulta quando aparecer na mesa.</li>
        <li><strong>Já joga RPG:</strong> leia Sistema Base e Perícias para pegar as fórmulas, depois Combate e Ferimentos, que é onde O Jardim mais se afasta do que você já conhece.</li>
        <li><strong>Vai conjurar:</strong> Magia e Fluxos é a página mais longa do livro de propósito. Leia até "Teste e DT de magia" e volte ao resto quando subir de círculo.</li>
        <li><strong>Vai mestrar:</strong> comece pelo Guia do Mestre e tenha Condições e Ferimentos abertos na primeira sessão.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Se alguém na sua mesa nunca jogou RPG, a primeira sessão não é sobre a sua história: é sobre essa pessoa descobrir que consegue jogar. Tudo o mais pode esperar uma semana.</p>

      <h3 class="regras-subtitle">Não ensine o sistema</h3>
      <ul class="regras-list">
        <li>Ensine uma coisa só: role o d20, some o bônus, compare com o número que eu disser. O resto entra quando aparecer, e só o pedaço que apareceu.</li>
        <li>Diga a DT em voz alta nas primeiras sessões. Saber que precisa de 15 transforma a rolagem em decisão; rolar às cegas é só torcer.</li>
        <li>Peça descrição, não nome de regra. Quem começou hoje sabe dizer que quer empurrar o guarda contra a parede, e não sabe dizer que quer usar Atletismo. A tradução é sua.</li>
        <li>Quando alguém propuser algo que o sistema não cobre, resolva na hora com a DT que parecer justa e siga. Parar para procurar a regra certa é o jeito mais rápido de perder a mesa.</li>
      </ul>

      <h3 class="regras-subtitle">A primeira sessão</h3>
      <ul class="regras-list">
        <li>Faça as fichas juntos, no mesmo dia. Quem monta personagem sozinho em casa chega sem entender metade dos próprios números.</li>
        <li>Comece com o grupo já em movimento e já reunido. Explicar por que aquelas pessoas estão juntas é trabalho da criação, não da primeira cena.</li>
        <li>Deixe a primeira rolagem ser fácil e sem risco. A pessoa precisa ver o dado funcionar antes de ver o dado doer.</li>
        <li>Segure o combate para a segunda metade da sessão, quando todo mundo já resolveu alguma coisa conversando. Combate tem mais regras que qualquer outra cena.</li>
        <li>Uma cena de investigação, uma de conversa e uma de luta cobrem o sistema inteiro que um iniciante precisa nas primeiras horas.</li>
      </ul>

      <h3 class="regras-subtitle">O que combinar antes de qualquer ficha</h3>
      <ul class="regras-list">
        <li>O tom da campanha. As mesmas regras servem investigação sombria e comédia de estrada, e a mesa precisa saber qual das duas vai jogar.</li>
        <li>O que fica fora. Este livro tem Sanidade, vício, mutilação e morte. Pergunte antes o que ninguém quer ver na mesa, e respeite sem negociar.</li>
        <li>Quanto tempo vocês têm por sessão e de quanto em quanto tempo jogam. Isso decide o tamanho dos seus arcos mais que qualquer outra coisa.</li>
        <li>Que a ficha faz as contas. Muita gente trava achando que precisa saber matemática: mostre o site somando sozinho e essa preocupação some.</li>
      </ul>

      <h3 class="regras-subtitle">Jogador experiente na mesma mesa</h3>
      <ul class="regras-list">
        <li>Quem já jogou vai querer otimizar e vai conhecer outros sistemas. Aponte para Ferimentos, Coreografia e Iniciativa estática: é onde O Jardim se afasta do que essa pessoa espera.</li>
        <li>Peça que ela não responda pelos outros. Um veterano ansioso ensina rápido e cala a mesa inteira sem perceber.</li>
        <li>Distribua os holofotes por cena, não por rodada. A cena social é de quem tem Carisma, e a de perseguição é de quem tem Pilotagem: assim ninguém precisa competir por espaço.</li>
      </ul>
    `,
  },
  'criacao-personagem': {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Um roteiro completo para criar um personagem de nível 1, escolher suas opções e conferir todos os valores da ficha.',
    destaques: [
      ['Etapas', '7 passos'],
      ['Perícias', '6 em Aprendiz'],
      ['Recursos', '1 item comum + 20 Lunaris'],
    ],
    corpo: `
      <p class="regras-lead">O assistente de criação da ficha segue estas sete etapas. Faça as escolhas na ordem apresentada: opções posteriores dependem da Árvore, da raça e da classe escolhidas antes.</p>

      <h3 class="regras-subtitle">Antes de começar</h3>
      <ul class="regras-list">
        <li>Combine com o Mestre o tom da campanha, o nível inicial e quais opções especiais foram liberadas.</li>
        <li>Crie um conceito curto: quem é o personagem, o que ele procura e por que aceita se aventurar com o grupo.</li>
        <li>Na criação padrão, o personagem começa no <strong>nível 1</strong>, com uma classe comum. Raças ou classes especiais só entram por liberação explícita do Mestre ou por uma exceção escrita na própria opção.</li>
      </ul>

      <h3 class="regras-subtitle">1. Nome e Árvore de origem</h3>
      <p>Escolha o nome do personagem e a Árvore à qual ele pertence. A Árvore determina quais opções exclusivas podem aparecer. Se a campanha permitir um personagem sem Árvore (para manter sua origem oculta, por exemplo), ele tem acesso a todas as opções do compêndio.</p>

      <h3 class="regras-subtitle">2. Raça e variante</h3>
      <ul class="regras-list">
        <li>Escolha uma raça disponível para sua Árvore. A raça define fisiologia, características raciais e ajustes próprios.</li>
        <li>Se a raça oferecer variante, linhagem ou outra escolha obrigatória, registre uma delas antes de avançar.</li>
        <li>Uma opção especial precisa estar liberada para esse personagem. Estar visível no catálogo não concede acesso automático.</li>
      </ul>

      <h3 class="regras-subtitle">3. Classe inicial</h3>
      <ul class="regras-list">
        <li>Escolha uma classe comum disponível. Ela concede as recompensas do nível 1 e define os ganhos de Vida e Mana por nível.</li>
        <li>A classe inicial começa no nível 1. Entrar em outra classe depois segue as regras de progressão e multiclasse.</li>
        <li>Classe especial exige <strong>nível total 20</strong>, liberação do Mestre e um acontecimento na história, salvo uma exceção explícita que permita começar com ela.</li>
      </ul>

      <h3 class="regras-subtitle">4. Divindade</h3>
      <p>Registre a Deidade associada à sua Árvore ou outra entidade que o personagem cultue. Um personagem sem Árvore pode deixar esse campo vazio. Escolher uma divindade descreve crença e vínculo narrativo; não concede poderes além dos declarados por raça, classe, item ou outra regra.</p>

      <h3 class="regras-subtitle">5. Atributos</h3>
      <p>Distribua os valores entre Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma e Fluxo. Depois disso, a ficha aplica os ajustes raciais.</p>
      <ul class="regras-list">
        <li><strong>Conjunto padrão:</strong> 15, 14, 13, 12, 10, 8 e 8. Cada número é usado uma vez.</li>
        <li><strong>Compra por pontos:</strong> todos começam em 8; distribua exatamente 24 pontos, pagando 1 ponto por cada +1. Nenhum atributo passa de 15 antes dos ajustes raciais.</li>
        <li><strong>Variante aleatória:</strong> role 7d20 e distribua os sete resultados, cada dado uma vez. Esse método não é equivalente aos anteriores e só deve ser usado com concordância da mesa.</li>
      </ul>

      <h3 class="regras-subtitle">6. Perícias e equipamento inicial</h3>
      <ul class="regras-list">
        <li>Escolha exatamente <strong>seis perícias</strong> para começar em Aprendiz. Humano escolhe sete por Adaptabilidade.</li>
        <li>Escolha um item comum aprovado pelo Mestre. Ele entra no inventário como item de criação e não possui preço de revenda.</li>
        <li>Registre <strong>20 Lunaris</strong>. Nenhuma nova classe escolhida no futuro concede outro equipamento ou dinheiro inicial.</li>
      </ul>

      <h3 class="regras-subtitle">7. Conferência da ficha</h3>
      <dl class="regras-kv regras-kv--boxed">
        <dt>Nível e XP</dt><dd>nível total 1 e 0 XP</dd>
        <dt>Vida máxima</dt><dd>máx. 1, (4 × Mod.Constituição) + Vida da classe, depois ajustes raciais</dd>
        <dt>Mana máxima</dt><dd>máx. 1, (3 × Mod.Sabedoria) + Mana da classe, depois ajustes raciais</dd>
        <dt>Sanidade</dt><dd>100 de 100</dd>
        <dt>Cansaço</dt><dd>0 de 6</dd>
        <dt>Defesa Natural</dt><dd>10 + ⌊Nível total ÷ 2⌋ + Mod.Destreza + ajustes raciais ou naturais</dd>
        <dt>Defesa Total</dt><dd>Defesa Natural + armadura, escudo, modificações e outros ajustes ativos</dd>
        <dt>Movimento</dt><dd>9 m + (1,5 m × Mod.Destreza) + ajuste racial ou morfológico, mínimo 4,5 m</dd>
        <dt>Iniciativa</dt><dd>10 + ⌊Nível total ÷ 2⌋ + Mod.Destreza + bônus</dd>
      </dl>
      <p class="regras-note"><strong>Não some ajustes duas vezes:</strong> a ficha calcula os derivados e aplica raça e equipamento automaticamente. Use ajustes manuais apenas para efeitos que ainda não estejam representados no sistema.</p>

      <h3 class="regras-subtitle">Checklist final</h3>
      <ul class="regras-list">
        <li>Nome, raça, variante e classe estão preenchidos. Árvore e divindade podem ficar vazias quando a campanha permitir personagem sem Árvore.</li>
        <li>Os sete atributos usam um método válido e os ajustes raciais aparecem uma única vez.</li>
        <li>Seis perícias estão em Aprendiz, ou sete se o personagem for Humano.</li>
        <li>Vida, Mana, Sanidade, Cansaço, Defesa, Movimento e Iniciativa conferem com o resumo.</li>
        <li>O inventário contém um item comum de criação e a carteira contém 20 Lunaris.</li>
        <li>O personagem possui um motivo para participar da campanha e trabalhar com o grupo.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">A criação é a única sessão em que você decide quase tudo antes de qualquer dado rolar. As três decisões que mais afetam a campanha inteira são o método de atributos, o que está liberado e se existe personagem sem Árvore.</p>

      <h3 class="regras-subtitle">Escolher o método de atributos</h3>
      <ul class="regras-list">
        <li>Conjunto padrão e compra por pontos produzem fichas equivalentes. Escolha um dos dois e use para a mesa inteira: misturar cria disparidade sem que ninguém tenha pedido.</li>
        <li>A variante de 7d20 não é equivalente às outras duas e o próprio texto avisa isso. Ela só entra com concordância de todo mundo, e vale lembrar que a diferença entre a melhor e a pior ficha vai durar a campanha inteira.</li>
        <li>Depois de distribuídos, os ajustes raciais entram uma vez só. O erro mais comum de mesa nova é somar de novo à mão o que a ficha já aplicou.</li>
      </ul>

      <h3 class="regras-subtitle">O que liberar</h3>
      <ul class="regras-list">
        <li>Aparecer no catálogo não é permissão. Raça e classe especiais precisam de liberação explícita sua, e o padrão é começar só com as comuns.</li>
        <li>Diga o que está liberado antes de alguém se apaixonar por um conceito. É muito mais fácil negar uma opção na conversa inicial do que depois da ficha pronta.</li>
        <li>Personagem sem Árvore ganha acesso a todas as opções do compêndio. É uma abertura grande: libere quando a origem oculta for de fato o ponto do personagem, não como atalho de acesso.</li>
      </ul>

      <h3 class="regras-subtitle">A conversa que evita metade dos problemas</h3>
      <ul class="regras-list">
        <li>Combine o tom antes das fichas. Investigação sombria e comédia de estrada usam estas mesmas regras e produzem mesas incompatíveis.</li>
        <li>Peça um motivo concreto para o personagem trabalhar com o grupo. O checklist da página cobra isso, e é a linha que mais evita sessão travada.</li>
        <li>Nível 1 com um item comum e 20 Lunaris é pouco de propósito. Se a sua campanha começa depois disso, entregue o extra de forma igual para todos e anuncie.</li>
      </ul>
    `,
  },

  'sistema-base': {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'As fórmulas fundamentais, limites de nível, multiclasse, maestrias e o papel do atributo Fluxo.',
    destaques: [
      ['Teste', 'd20 + bônus vs. DT'],
      ['Classes', '2 comuns + 1 especial'],
      ['Teto', '40 / 60 níveis totais'],
    ],
    corpo: `
      <p class="regras-lead">Esta é a página de consulta: todas as contas que a ficha faz por você, reunidas num lugar só. Você não precisa decorar nenhuma delas para jogar. Dois avisos de leitura: ⌊ ⌋ quer dizer "arredonde para baixo", e "Mod." é o modificador de um atributo, que sai da primeira linha da tabela.</p>

      <h3 class="regras-subtitle">Fórmulas fundamentais</h3>
      <dl class="regras-kv regras-kv--boxed">
        <dt>Modificador</dt><dd>⌊(Atributo − 10) ÷ 2⌋</dd>
        <dt>Teste</dt><dd>d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau</dd>
        <dt>Vida no nível 1</dt><dd>máx. 1, (4 × Mod.Constituição) + Vida da classe</dd>
        <dt>Vida por nível posterior</dt><dd>ganho de Vida da classe do nível adquirido, mínimo 1</dd>
        <dt>Mana no nível 1</dt><dd>máx. 1, (3 × Mod.Sabedoria) + Mana da classe</dd>
        <dt>Mana por nível posterior</dt><dd>ganho de Mana da classe do nível adquirido, mínimo 1</dd>
        <dt>Ajustes raciais</dt><dd>bônus raciais de Vida e Mana são somados depois do cálculo correspondente</dd>
        <dt>Defesa Natural</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + ajustes raciais ou naturais</dd>
        <dt>Movimento</dt><dd>9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m</dd>
        <dt>Iniciativa</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus</dd>
      </dl>

      <h3 class="regras-subtitle">Nível e multiclasse</h3>
      <ul class="regras-list">
        <li><strong>Nível total</strong> é a soma dos níveis de todas as suas classes, incluindo as especiais.</li>
        <li>Cada classe vai até o <strong>nível 20</strong>. Só com classes comuns, o teto é <strong>40 níveis totais</strong>; com uma classe especial, sobe para <strong>60</strong>.</li>
        <li>Você pode ter no máximo <strong>duas classes comuns e uma especial</strong>.</li>
        <li>Os níveis podem ser intercalados. Para levar uma classe ao nível 20, o personagem precisa ter pelo menos nível 10 em outra classe.</li>
        <li>Classe especial exige nível total 20, liberação do Mestre e um acontecimento na história que justifique, a não ser que a própria classe abra uma exceção explícita.</li>
        <li>Classe geral serve a qualquer Árvore. Classe exclusiva só se você pertencer à Árvore indicada.</li>
      </ul>

      <h3 class="regras-subtitle">Maestria de atributo</h3>
      <p class="regras-note">Quando um atributo chega a 20 <strong>por mérito próprio</strong>, sem item, pacto ou efeito temporário segurando o número, você ganha a maestria dele. Coisa de fora pode empurrar o atributo acima de 20, e não dá maestria nenhuma. E só uma característica que declare explicitamente um limite maior consegue passar de 20.</p>
      <ul class="regras-sublist regras-sublist--grid">
        <li><strong>Força:</strong> uma vez por turno, +2 no dano de um ataque corpo a corpo.</li>
        <li><strong>Destreza:</strong> +1 na Defesa Natural ou +1,5 m de movimento.</li>
        <li><strong>Constituição:</strong> você morre em Morrendo 4, em vez de Morrendo 3.</li>
        <li><strong>Inteligência:</strong> torne-se Aprendiz em duas perícias.</li>
        <li><strong>Sabedoria:</strong> reduza em 2 a primeira perda de Sanidade de cada cena.</li>
        <li><strong>Carisma:</strong> uma vez por cena, repita um teste social; mantenha o novo resultado.</li>
      </ul>

      <h3 class="regras-subtitle">Fluxo</h3>
      <p class="regras-note"><strong>Fluxo</strong> é o sétimo atributo, e mede o quanto você controla aquilo que canaliza. Em magia ele entra no lugar do atributo que normalmente acompanharia Misticismo, e é ele que limita o maior círculo que você conjura com segurança. Fluxo alto sozinho não ensina magia nenhuma: alguém precisa te dar acesso, seja uma classe, uma habilidade, um item ou o Mestre.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">Esta é a página que você consulta para saber com quem está lidando. As fórmulas são as mesmas para todo mundo, então dá para prever a ficha de um personagem sabendo só o nível e o tipo de classe dele.</p>

      <h3 class="regras-subtitle">O personagem de referência</h3>
      <p>Todas as 27 classes gastam o mesmo orçamento de 7 pontos por nível, distribuído entre Vida e Mana em três proporções. A tabela abaixo é o personagem médio de cada proporção, calculada com Constituição 14 e Sabedoria 10. Use como piso ao montar encontro.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Marcial 5/2</th><th>Misto 4/3</th><th>Conjurador 3/4</th><th>Defesa</th><th>Poderes</th></tr></thead>
        <tbody>
          <tr><td><strong>1</strong></td><td>16 / 8</td><td>16 / 8</td><td>16 / 8</td><td>11</td><td>0</td></tr>
          <tr><td><strong>5</strong></td><td>44 / 16</td><td>40 / 20</td><td>36 / 24</td><td>13</td><td>1</td></tr>
          <tr><td><strong>10</strong></td><td>79 / 26</td><td>70 / 35</td><td>61 / 44</td><td>16</td><td>3</td></tr>
          <tr><td><strong>15</strong></td><td>114 / 36</td><td>100 / 50</td><td>86 / 64</td><td>18</td><td>5</td></tr>
          <tr><td><strong>20</strong></td><td>149 / 46</td><td>130 / 65</td><td>111 / 84</td><td>21</td><td>8</td></tr>
          <tr><td><strong>30</strong></td><td>204 / 81</td><td>185 / 100</td><td>166 / 119</td><td>26</td><td>8</td></tr>
          <tr><td><strong>40</strong></td><td>259 / 116</td><td>240 / 135</td><td>221 / 154</td><td>31</td><td>8</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Cinco classes são marciais, oito são mistas e catorze são conjuradoras. Num grupo comum de quatro, some as Vidas da coluna certa e multiplique o dano do grupo por rodada por 4,5: sai a Vida efetiva do encontro padrão.</p>

      <h3 class="regras-subtitle">Conferir maestria</h3>
      <ul class="regras-list">
        <li>Maestria só nasce de mérito próprio: item, pacto ou efeito temporário empurram o número acima de 20 e não concedem nada. Confira isso quando alguém anunciar maestria nova.</li>
        <li>A de Constituição empurra a morte para Morrendo 4. É a única maestria que muda diretamente o quanto o grupo aguenta, e vale saber quem tem.</li>
        <li>A de Carisma repete um teste social por cena. Numa campanha de intriga, ela vale mais que qualquer outra: monte as negociações sabendo disso.</li>
      </ul>

      <h3 class="regras-subtitle">Multiclasse e classe especial</h3>
      <ul class="regras-list">
        <li>O teto é 40 níveis com classes comuns e 60 com uma especial. Uma campanha que pretende chegar lá é uma campanha de anos: combine a altura antes de começar.</li>
        <li>Classe especial exige nível total 20 e um acontecimento na história. O acontecimento é seu, e é o que impede a especial de virar só a próxima caixa marcada.</li>
        <li>Duas classes comuns mais uma especial é o teto rígido. Não abra exceção sem perceber que ela vale para a mesa inteira dali em diante.</li>
      </ul>
    `,
  },

  pericias: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Uma fórmula só, usada em perícia, ataque e resistência. Sete graus, e vantagem e desvantagem que se cancelam uma a uma.',
    destaques: [
      ['Base', 'd20 + atributo + nível/2 + grau'],
      ['Graus', '7 estágios'],
      ['Crítico', '20 natural'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Fórmula de teste</h3>
      <p class="regras-lead">É esta conta, e é sempre esta conta. Perícia, ataque, resistência: muda o atributo e muda o grau, o resto é igual.</p>
      <div class="regras-formula">d20 + Mod. de Atributo + ⌊Nível total ÷ 2⌋ + bônus do Grau</div>

      <h3 class="regras-subtitle">Graus de perícia</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Grau</th><th>Bônus</th><th>Nível mínimo</th></tr></thead>
        <tbody>
          <tr><td>Iniciante</td><td>+0</td><td>1</td></tr>
          <tr><td>Aprendiz</td><td>+2</td><td>1</td></tr>
          <tr><td>Treinado</td><td>+4</td><td>3</td></tr>
          <tr><td>Especialista</td><td>+6</td><td>7</td></tr>
          <tr><td>Mestre</td><td>+8</td><td>13</td></tr>
          <tr><td>Veterano</td><td>+10</td><td>19</td></tr>
          <tr><td>Renomado</td><td>+12</td><td>29</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Graus de resultado</h3>
      <ul class="regras-list">
        <li><strong>Sucesso crítico:</strong> o d20 mostra 20 natural.</li>
        <li><strong>Sucesso:</strong> resultado igual ou superior à DT.</li>
        <li><strong>Falha:</strong> resultado abaixo da DT.</li>
        <li><strong>Falha crítica:</strong> o d20 mostra 1 natural.</li>
      </ul>

      <h3 class="regras-subtitle">Vantagem e desvantagem</h3>
      <ul class="regras-list">
        <li>Role dois d20 e use o maior com vantagem, ou o menor com desvantagem.</li>
        <li>Anote cada fonte de vantagem e cada fonte de desvantagem. Elas se cancelam uma a uma, não em bloco.</li>
        <li>O que sobrar decide: qualquer saldo positivo vira <em>uma</em> vantagem, qualquer saldo negativo vira <em>uma</em> desvantagem. Não existe vantagem dupla.</li>
      </ul>

      <h3 class="regras-subtitle">Catálogo de perícias</h3>
      <p class="regras-lead">${periciasData.nota}</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Perícia</th><th>Atributo</th><th>Cobre</th></tr></thead>
        <tbody>${tabelaPericiasPublicas}</tbody>
      </table></div>
    `,
    corpoMestre: `
      <p class="regras-lead">Você só precisa saber uma coisa para escolher DT com confiança: contra a DT Padrão do próprio nível, um especialista Treinado acerta cerca de 65%. Todo o resto sai dessa âncora.</p>

      <h3 class="regras-subtitle">Chance real por perfil</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Perfil</th><th>Normal</th><th>Vantagem</th><th>Desvantagem</th></tr></thead>
        <tbody>
          <tr><td><strong>Generalista</strong> (atributo +2, Iniciante)</td><td>40%</td><td>64%</td><td>16%</td></tr>
          <tr><td><strong>Praticante</strong> (atributo +3, Aprendiz)</td><td>55%</td><td>79,8%</td><td>30,3%</td></tr>
          <tr><td><strong>Especialista</strong> (atributo +3, Treinado)</td><td>65%</td><td>87,8%</td><td>42,3%</td></tr>
          <tr><td><strong>Especialista avançado</strong> (atributo +3, Especialista)</td><td>75%</td><td>93,8%</td><td>56,3%</td></tr>
          <tr><td><strong>Mestre</strong> (atributo +3, Mestre)</td><td>85%</td><td>97,8%</td><td>72,3%</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Vantagem vale muito mais para quem é ruim: leva o generalista de 40% para 64%. Desvantagem, ao contrário, arrasa quem é bom. Isso significa que conceder vantagem a quem não é treinado é a forma mais barata de deixar um jogador participar de uma cena que não é a dele.</p>

      <h3 class="regras-subtitle">DT por nível do desafio</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Fácil</th><th>Padrão</th><th>Difícil</th><th>Extrema</th></tr></thead>
        <tbody>
          <tr><td><strong>1</strong></td><td>10</td><td>15</td><td>20</td><td>25</td></tr>
          <tr><td><strong>5</strong></td><td>12</td><td>17</td><td>22</td><td>27</td></tr>
          <tr><td><strong>10</strong></td><td>15</td><td>20</td><td>25</td><td>30</td></tr>
          <tr><td><strong>15</strong></td><td>17</td><td>22</td><td>27</td><td>32</td></tr>
          <tr><td><strong>20</strong></td><td>20</td><td>25</td><td>30</td><td>35</td></tr>
          <tr><td><strong>30</strong></td><td>25</td><td>30</td><td>35</td><td>40</td></tr>
          <tr><td><strong>40</strong></td><td>30</td><td>35</td><td>40</td><td>45</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Cancelamento e defesas passivas</h3>
      <ul class="regras-list">
        <li>Vantagem e desvantagem se cancelam uma a uma, não em bloco. Conte as fontes em voz alta antes da rolagem: a mesa costuma achar que duas vantagens contra uma desvantagem ainda dão vantagem dupla, e não dão.</li>
        <li>Quando você age contra Fortitude, Reflexos ou Vontade sem pedir rolagem, use 10 mais o bônus total do alvo. É assim que se resolve armadilha, gás e efeito ambiental sem parar a mesa.</li>
        <li>Use a defesa passiva quando o jogador não deveria saber que está sendo testado. Pedir rolagem já entrega que há algo ali.</li>
      </ul>
    `,
  },

  'acoes-coletivas': {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Como ajudar outro personagem e como resolver situações em que o grupo inteiro precisa passar pelo mesmo desafio.',
    destaques: [
      ['Ajudar', '+2, máximo +4'],
      ['Teste de Grupo', 'metade do grupo'],
      ['Declaração', 'antes da rolagem'],
    ],
    corpo: `
      <p class="regras-lead">Nem toda ação coletiva usa a mesma resolução. Se uma pessoa executa a tarefa e as outras dão suporte, use <strong>Ajudar</strong>. Se todos estão expostos ao mesmo desafio e cada integrante importa, use um <strong>Teste de Grupo</strong>.</p>

      <h3 class="regras-subtitle">Ajudar</h3>
      <ol class="regras-steps">
        <li>Antes da rolagem principal, o ajudante descreve uma contribuição concreta e escolhe uma perícia adequada. Ela pode ser a mesma do líder ou outra que realmente ajude naquela situação.</li>
        <li>Em combate, ajudar gasta uma <strong>Ação Padrão</strong>. Fora de combate, gasta tempo compatível com a tarefa.</li>
        <li>O ajudante faz seu teste contra DT 10 em uma tarefa fixa. Em um desafio que escala por nível, use DT 10 + ⌊nível do desafio ÷ 2⌋.</li>
        <li>Em sucesso, o teste principal recebe +2. Em sucesso crítico, recebe vantagem em vez de +2.</li>
        <li>Falha não concede bônus. Falha crítica também não impõe penalidade automática, mas pode produzir uma complicação quando a tentativa já envolvia risco real.</li>
      </ol>
      <ul class="regras-list">
        <li>No máximo <strong>dois ajudantes</strong> concedem bônus ao mesmo teste. Dois sucessos comuns chegam a +4.</li>
        <li>Cada contribuição precisa ser diferente e possível na ficção. Repetir a mesma ideia com mais pessoas não multiplica o bônus.</li>
        <li>O líder precisa aceitar a ajuda e só rola depois que os ajudantes resolverem suas tentativas.</li>
        <li>O Mestre pode dispensar o teste do ajudante quando a contribuição é automática, mas ela continua ocupando ação ou tempo.</li>
        <li>Ajudar não transfere proficiência, poder, imunidade ou permissão especial ao líder.</li>
      </ul>

      <h3 class="regras-subtitle">Teste de Grupo</h3>
      <p>Use quando todos precisam atravessar o mesmo perigo: o grupo inteiro se esgueirando, escalando, resistindo a uma tempestade ou mantendo uma história convincente diante de vários observadores.</p>
      <ol class="regras-steps">
        <li>Todos os participantes expostos fazem o teste indicado contra a mesma DT.</li>
        <li>O grupo vence se pelo menos metade dos participantes, arredondada para cima, obtiver sucesso.</li>
        <li>Cada sucesso crítico conta como dois sucessos. Cada falha crítica cancela um sucesso antes da contagem.</li>
        <li>Se o grupo falhar, a consequência atinge o grupo ou apenas quem falhou, conforme a natureza do perigo. O Mestre informa qual leitura vale antes das rolagens.</li>
      </ol>
      <p class="regras-note"><strong>Exemplo:</strong> quatro personagens fazem Furtividade. O grupo precisa de dois sucessos. Se conseguir dois sucessos comuns e uma falha crítica, a falha crítica cancela um deles e o grupo falha.</p>

      <h3 class="regras-subtitle">Quando não usar Teste de Grupo</h3>
      <ul class="regras-list">
        <li>Se só uma pessoa precisa executar a tarefa, escolha um líder e use Ajudar.</li>
        <li>Se cada falha gera uma consequência individual independente, resolva os testes separadamente.</li>
        <li>Se a ação exige treinamento ou permissão que parte do grupo não possui, quem não cumpre o requisito não pode ser escondido dentro da média.</li>
        <li>Não combine Ajudar e Teste de Grupo na mesma resolução, salvo quando uma habilidade disser expressamente que pode.</li>
      </ul>

      <h3 class="regras-subtitle">Ações coletivas maiores</h3>
      <p class="regras-note">Projetos de vários dias usam as regras da atividade correspondente, como treinamento, ritual ou fabricação. Ataques sincronizados usam o capítulo <strong>Ataques Combinados</strong>. Ajudar não permite somar dano, fundir magias nem transferir efeitos entre personagens.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">A pergunta que resolve quase toda dúvida aqui é uma só: uma pessoa executa e as outras apoiam, ou todo mundo está exposto ao mesmo perigo? A primeira é Ajudar, a segunda é Teste de Grupo, e misturar as duas é o erro comum.</p>

      <h3 class="regras-subtitle">A armadilha do sucesso único</h3>
      <ul class="regras-list">
        <li>Quando todos podem tentar e um sucesso resolve a cena, o teste vira uma questão de quantas pessoas há na mesa. Suba a DT ou decida quem tem contexto para tentar, e diga qual dos dois você escolheu antes das rolagens.</li>
        <li>Ajudar tem teto de dois ajudantes, então o máximo é mais 4. Esse teto existe justamente para que o grupo grande não anule a DT: não abra exceção sem motivo forte.</li>
        <li>Cobre a contribuição em voz alta antes de aceitar o bônus. Três pessoas segurando a mesma corda é uma ajuda só, e é você quem faz essa conta.</li>
      </ul>

      <h3 class="regras-subtitle">Conduzir o Teste de Grupo</h3>
      <ul class="regras-list">
        <li>Diga antes das rolagens se a consequência da falha atinge o grupo todo ou só quem falhou. Decidir depois parece ajuste de resultado, mesmo quando não é.</li>
        <li>Metade dos participantes, arredondando para cima, precisa passar. Falha crítica cancela um sucesso, então um grupo grande não é automaticamente mais seguro.</li>
        <li>Quem não cumpre um requisito de treinamento não se esconde na média. Se a tarefa exige proficiência, quem não tem fica de fora da contagem.</li>
      </ul>

      <h3 class="regras-subtitle">Quando não pedir nada</h3>
      <p>Se o grupo se preparou bem e a tarefa não tem mais risco, deixe passar. Ajudar e Teste de Grupo existem para distribuir tensão, e chamar rolagem numa cena sem tensão só ensina a mesa que rolar dado é perda de tempo.</p>
    `,
  },

  'ataques-combinados': REGRA_ATAQUES_COMBINADOS,

  combate: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'O que você faz no seu turno, como acertar, quando dá para reagir e de que jeito o dano entra.',
    destaques: [
      ['Turno', '1 padrão + 1 movimento'],
      ['Rodada', '1 reação'],
      ['Ataque', 'Luta/Pontaria vs. Defesa'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Seu turno</h3>
      <ul class="regras-list">
        <li><strong>Ação Padrão:</strong> atacar, usar uma habilidade, ajudar alguém ou tentar uma manobra.</li>
        <li><strong>Ação de Movimento:</strong> se deslocar, levantar, sacar algo ou mexer num objeto que importe na cena.</li>
        <li><strong>Ação Completa:</strong> consome a Ação Padrão e a Ação de Movimento do turno. Não pode ser iniciada depois que uma dessas ações foi gasta.</li>
        <li><strong>Ação Livre:</strong> um gesto, uma fala curta ou soltar um objeto. Não realiza testes, ataques nem ativa habilidades, salvo quando uma regra específica permitir.</li>
        <li>Dá para trocar sua Ação Padrão por uma segunda Ação de Movimento. Correr custa o ataque.</li>
      </ul>

      <h3 class="regras-subtitle">Ataques e cobertura</h3>
      <div class="regras-formula">d20 + Luta ou Pontaria contra a Defesa Natural</div>
      <ul class="regras-list">
        <li>Empatar com a Defesa já acerta. Um 1 natural sempre erra, não importa o bônus.</li>
        <li>Cada arma traz sua <strong>Margem de Ameaça</strong> e seu <strong>Multiplicador Crítico</strong>, escritos como 20/x2, 19-20/x2 ou 20/x3.</li>
        <li>Se o número natural do d20 cair dentro da margem da arma, o ataque acerta e é crítico. Não existe rolagem de confirmação: caiu na margem, é crítico.</li>
        <li>O multiplicador diz quantas vezes você rola os dados da arma. Em x3, 2d6+4 vira 6d6+4.</li>
        <li>Bônus fixo e dado extra vindos de habilidade, veneno ou efeito externo entram <strong>uma vez só</strong>. Eles só multiplicam se a própria habilidade disser que multiplica.</li>
        <li>Margem larga e multiplicador alto não andam juntos: 18-20 e 19-20 sempre com x2; x3 e x4 sempre com margem 20.</li>
        <li>Cobertura parcial dá +2 de Defesa; cobertura superior dá +5.</li>
      </ul>

      <h3 class="regras-subtitle">Reações</h3>
      <p class="regras-note">Você tem uma reação por rodada e recupera ela no começo do seu próprio turno. Defesa Natural funciona sozinha e não gasta reação nenhuma.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Reação</th><th>Gatilho</th><th>Efeito</th></tr></thead>
        <tbody>
          <tr><td>Esquiva</td><td>Antes da rolagem contra você</td><td>+4 de Defesa contra um ataque. Se errar, mova 1,5 m sem provocar reação.</td></tr>
          <tr><td>Bloqueio</td><td>Após sofrer dano físico</td><td>Reduza o dano em 2 + ⌊Nível ÷ 2⌋ + bônus do escudo. Exige escudo ou arma adequada.</td></tr>
          <tr><td>Contra-Ataque</td><td>Inimigo adjacente erra você</td><td>Faça um ataque com −2. Ele não pode gerar crítico.</td></tr>
          <tr><td>Proteger</td><td>Aliado adjacente é atacado</td><td>Você vira o alvo e pode usar Bloqueio, se ainda tiver reação.</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Tipos de dano</h3>
      <ul class="regras-sublist regras-sublist--grid">
        <li><strong>Físicos:</strong> corte, perfuração, impacto e balístico.</li>
        <li><strong>Persistentes:</strong> sangramento, fogo e veneno; batem de novo no fim do turno até alguém remover.</li>
        <li><strong>Energia:</strong> elemental, tecnologia e Fluxos.</li>
        <li><strong>Mental:</strong> tira Sanidade ou Vida, dependendo de onde vem.</li>
      </ul>

      <h3 class="regras-subtitle">Dano elemental</h3>
      <p class="regras-lead">São estes sete, e não existe um oitavo. Quem conjura pelo Fluxo do Físico escolhe um deles ao aprender a magia: é o <strong>elemento despertado</strong>, e ele vale para todas as magias de Físico daquela ficha. Modificação de arma, encantamento e Selo que pedem "um elemento" puxam da mesma lista.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Elemento</th><th>Como costuma se manifestar</th></tr></thead>
        <tbody>
          <tr><td><strong>Terra</strong></td><td>Pedra, areia e metal bruto. Bom para barreira, terreno difícil e derrubar.</td></tr>
          <tr><td><strong>Água</strong></td><td>Líquido, gelo e vapor. Empurra, prende e apaga fogo.</td></tr>
          <tr><td><strong>Fogo</strong></td><td>Chama e brasa. É o elemento que mais deixa dano persistente para trás.</td></tr>
          <tr><td><strong>Ar</strong></td><td>Vento e pressão. Move criaturas e objetos, e limpa nuvem e gás.</td></tr>
          <tr><td><strong>Raio</strong></td><td>Descarga elétrica. Salta entre alvos próximos e desliga o que é energizado.</td></tr>
          <tr><td><strong>Luz</strong></td><td>Claridade que revela. Atinge o que se esconde e cega quem olha de perto.</td></tr>
          <tr><td><strong>Escuridão</strong></td><td>Sombra que engole. Esconde, confunde e apaga a luz mundana da área.</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Resistência e vulnerabilidade valem por elemento, nunca para o grupo inteiro: quem resiste a Fogo não resiste a Raio. Trocar o elemento despertado depois exige aval do Mestre.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">Um encontro se monta de trás para frente: você decide quantas rodadas ele deve durar, e daí sai a Vida dos inimigos. Começar escolhendo o monstro e torcer é o caminho mais curto para um combate de dez rodadas que ninguém queria.</p>

      <h3 class="regras-subtitle">Papéis de inimigo</h3>
      <p>Cada papel tem uma faixa de acerto e de dano calibrada contra o alvo apropriado, que costuma ser um personagem de linha de frente para golpe físico e um personagem exposto para ameaça de posicionamento.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Papel</th><th>Chance de acertar</th><th>Dano por acerto, sobre a Vida máxima do alvo</th></tr></thead>
        <tbody>
          <tr><td><strong>Lacaio</strong></td><td>40% a 50%</td><td>10% a 15%</td></tr>
          <tr><td><strong>Inimigo padrão</strong></td><td>55% a 60%</td><td>20% a 25%</td></tr>
          <tr><td><strong>Elite</strong></td><td>60% a 65%</td><td>30% a 35%</td></tr>
          <tr><td><strong>Golpe de chefe anunciado</strong></td><td>60% a 65%</td><td>40% a 50%</td></tr>
          <tr><td><strong>Efeito de área</strong></td><td>DT padrão do nível</td><td>15% a 25% por alvo</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Golpe de chefe que tira metade da Vida precisa ser anunciado na rodada anterior. Sem aviso, ele não é um desafio: é um imposto.</p>

      <h3 class="regras-subtitle">Orçamento do encontro</h3>
      <ul class="regras-list">
        <li>Meça o dano real do grupo por rodada antes de fechar a Vida dos inimigos. Anotação de mesa erra bem menos que estimativa no papel.</li>
        <li>A Vida efetiva de um encontro padrão é o dano do grupo por rodada multiplicado por 4,5. Use 3 para confronto curto e 6 para chefe resistente.</li>
        <li>As ações inimigas por rodada devem ficar entre 80% e 110% das ações relevantes do grupo. Acima disso o grupo apanha sem jogar.</li>
        <li>Chefe sozinho precisa de reação, fase ou ação de cenário. Só empilhar Vida produz combate longo e parado.</li>
      </ul>

      <h3 class="regras-subtitle">Cobertura, elemento e reação</h3>
      <ul class="regras-list">
        <li>Cobertura parcial vale +2 e superior vale +5. São números grandes: distribua cobertura no mapa de propósito, porque ela decide para onde o grupo corre.</li>
        <li>Resistência e vulnerabilidade valem por elemento, nunca em bloco. Um inimigo que resiste a Fogo continua aberto a Raio, e isso premia o grupo que investigou antes.</li>
        <li>Todo mundo tem uma reação por rodada. Se você quer que o grupo gaste a dele, ataque com mais de um inimigo por rodada em vez de um golpe único enorme.</li>
        <li>Não tire o turno inteiro de um jogador por mais de uma rodada seguida. Ficar olhando não é jogar.</li>
      </ul>
    `,
  },

  'mesa-ao-vivo': {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Como o combate roda na tela compartilhada: ordem de iniciativa, vida em tempo real, o que cada pessoa enxerga do inimigo e por que o dado é rolado no servidor.',
    destaques: [
      ['Iniciativa', 'Lista única, sincronizada'],
      ['Sigilo', '4 graus de visibilidade'],
      ['Dado', 'Rolado no servidor e registrado'],
    ],
    corpo: `
      <p class="regras-lead">Dá para jogar O Jardim inteiro no papel. Mas a mesa ao vivo existe para resolver as três coisas que sempre travam um combate: quem age agora, quanta vida sobrou em quem e se aquele 19 foi mesmo um 19.</p>

      <h3 class="regras-subtitle">Abrir a mesa</h3>
      <ul class="regras-list">
        <li>Quem conduz a campanha abre a sessão e escolhe quais personagens entram. Aliados e inimigos já preparados continuam de uma sessão para a outra.</li>
        <li>Todo participante vira uma linha na lista: personagem, aliado ou inimigo, cada um com Vida, Defesa, Iniciativa e condições ativas.</li>
        <li>A ordem sai da Iniciativa da ficha, que aqui não se rola. Quem comanda pode reordenar à mão quando a ficção pedir.</li>
      </ul>

      <h3 class="regras-subtitle">Turno e rodada</h3>
      <ul class="regras-list">
        <li>Passar o turno anda na lista e devolve a reação de quem está começando o próprio turno.</li>
        <li>Ao virar a rodada, as condições com prazo contam um passo sozinhas. Ninguém precisa lembrar que o Exposto do inimigo já venceu.</li>
        <li>Vida e Mana editadas na sessão chegam a todo mundo na hora, sem recarregar a página.</li>
      </ul>

      <h3 class="regras-subtitle">O que cada um enxerga</h3>
      <p>O sigilo do inimigo é decidido no servidor, não no navegador de quem olha. Isso importa: não adianta abrir o inspetor do site para descobrir a Vida do chefe, porque o número não chega a ser enviado.</p>
      <div class="regras-table-wrap">
        <table class="regras-table">
          <thead><tr><th>Grau</th><th>O que a mesa vê</th><th>Serve para</th></tr></thead>
          <tbody>
            <tr><td><strong>Oculto</strong></td><td>Nada. A criatura nem aparece na lista.</td><td>O que ainda não entrou em cena.</td></tr>
            <tr><td><strong>Desconhecido</strong></td><td>Uma linha sem nome e sem número.</td><td>A emboscada, o vulto no fim do corredor.</td></tr>
            <tr><td><strong>Parcial</strong></td><td>Nome e estado por descrição, como "Ferido", sem número exato.</td><td>O padrão de quase todo combate.</td></tr>
            <tr><td><strong>Total</strong></td><td>Tudo, inclusive a Vida exata, os ataques e as perícias.</td><td>Aliado do grupo, ou inimigo já estudado.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="regras-note">Quem comanda a mesa vê tudo sempre, e o dono de um personagem vê o próprio personagem por inteiro, seja qual for o grau. O segredo é entre o Mestre e o resto da mesa, nunca entre o jogador e a ficha dele.</p>

      <h3 class="regras-subtitle">Rolagens registradas</h3>
      <ul class="regras-list">
        <li>O dado é rolado no servidor. O site mostra o resultado, mas quem o produziu foi o servidor, então nenhum lado da mesa consegue escolher o número.</li>
        <li>Cada rolagem fica gravada com autor, personagem, título, fórmula, o que saiu em cada dado e a DT, quando havia uma.</li>
        <li>Vantagem e desvantagem entram na própria rolagem: os dois d20 ficam registrados, e dá para conferir depois qual foi usado.</li>
        <li>Usos de poder entram no mesmo registro das rolagens, então o histórico da sessão conta a cena em ordem.</li>
        <li>Quem está assistindo a campanha como observador não rola dados.</li>
      </ul>
      <p>Rolar fora do site continua valendo: quem prefere dado físico anuncia o resultado e a mesa aceita, como sempre foi. O registro existe para quando alguém quiser conferir, não para obrigar ninguém.</p>

      <h3 class="regras-subtitle">Fechar a sessão</h3>
      <ul class="regras-list">
        <li>O XP do encontro é distribuído pela própria sessão e cai nas fichas escolhidas, seguindo as regras do capítulo de Experiência.</li>
        <li>Encerrar a sessão guarda o estado. O que estava preparado continua preparado para a próxima.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">O sigilo é decidido no servidor, então você pode confiar nele. O que a ferramenta não decide é qual grau cabe em cada cena, e errar isso custa mais tensão do que qualquer número de inimigo.</p>

      <h3 class="regras-subtitle">Qual grau usar</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Cena</th><th>Grau</th><th>Por quê</th></tr></thead>
        <tbody>
          <tr><td><strong>Reforço que ainda vai chegar</strong></td><td>Oculto</td><td>A criatura nem consta na lista, então ninguém conta cabeças antes da hora.</td></tr>
          <tr><td><strong>Emboscada, vulto, coisa no escuro</strong></td><td>Desconhecido</td><td>O grupo sabe que há algo na ordem de iniciativa e não sabe o quê.</td></tr>
          <tr><td><strong>Combate comum</strong></td><td>Parcial</td><td>Nome e estado por descrição bastam para decidir em quem bater.</td></tr>
          <tr><td><strong>Aliado, ou inimigo já estudado</strong></td><td>Total</td><td>Recompensa quem investigou: os números aparecem.</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Subir o grau no meio do combate é uma recompensa barata e muito eficaz. Passar um inimigo de Desconhecido para Parcial depois de um bom teste de Investigação faz a perícia valer a pena sem custar nada do seu orçamento.</p>

      <h3 class="regras-subtitle">Conduzir a lista</h3>
      <ul class="regras-list">
        <li>Vire a rodada pela ferramenta, não de cabeça. As condições com prazo contam sozinhas, e é isso que impede o Exposto do inimigo de durar até alguém lembrar.</li>
        <li>Ajuste Vida na lista assim que o dano sair. O valor chega a todo mundo na hora, e o grupo joga melhor vendo o inimigo encolher.</li>
        <li>Aliados e inimigos preparados ficam de uma sessão para outra. Monte o encontro seguinte antes de encerrar, enquanto ainda está fresco.</li>
      </ul>

      <h3 class="regras-subtitle">O registro de rolagens</h3>
      <ul class="regras-list">
        <li>O dado sai do servidor, então nem você nem o jogador escolhem o número. Isso vale nos dois sentidos: seu crítico contra o grupo também está registrado.</li>
        <li>Use o registro para conferir depois, não para vigiar durante. Uma mesa em que o Mestre audita cada rolagem em tempo real é uma mesa desconfortável.</li>
        <li>Quem prefere dado físico continua rolando e anunciando. O registro é ferramenta, não obrigação.</li>
      </ul>
    `,
  },
  distancias: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'As dez faixas de distância, o que acontece quando você atira longe demais e como converter tudo para o mapa.',
    destaques: [
      ['Mapa', '1 quadrado = 1,5 m'],
      ['Além do alcance', '−5 por faixa'],
      ['Limite', '2 faixas adicionais'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Faixas de distância</h3>
      <div class="regras-distance-grid">
        <span><strong>Adjacente</strong>até 1,5 m</span><span><strong>Curto</strong>até 5 m</span>
        <span><strong>Médio</strong>até 15 m</span><span><strong>Longo</strong>até 25 m</span>
        <span><strong>Longo+</strong>até 50 m</span><span><strong>Extremo</strong>até 90 m</span>
        <span><strong>Colossal</strong>até 150 m</span><span><strong>Lunar</strong>até 200 m</span>
        <span><strong>Estelar</strong>até 500 m</span><span><strong>Galáctico</strong>até 1.000 m</span>
      </div>

      <h3 class="regras-subtitle">Alcance de armas e poderes</h3>
      <ul class="regras-list">
        <li>Dentro do alcance que a arma ou o poder informa, ataque normalmente.</li>
        <li>Uma faixa além do alcance custa −5 no ataque. Duas faixas custam −10.</li>
        <li>Passou de duas faixas, o alvo simplesmente não pode ser atingido, a não ser que uma habilidade ou item diga o contrário.</li>
        <li>Em mapa tático, arredonde os deslocamentos para múltiplos de 1,5 m e siga o jogo.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Dez faixas parecem muitas até você perceber que quase todo combate vive em três: Adjacente, Curto e Médio. As faixas grandes existem para viagem, cerco e magia de topo, e usá-las em briga de corredor só atrasa a mesa.</p>

      <h3 class="regras-subtitle">Montar o espaço</h3>
      <ul class="regras-list">
        <li>Diga a distância em faixa, não em metro. "O arqueiro está em Médio" resolve a rodada; "está a treze metros e meio" abre uma discussão de régua.</li>
        <li>Um mapa aberto favorece quem atira, um mapa fechado favorece quem luta perto. Se a campanha só tem corredor, o Atirador do grupo nunca joga o personagem dele.</li>
        <li>A penalidade de estender alcance é dura de propósito: menos 5 por faixa, e nada além de duas. Serve para o tiro desesperado, não para a rotina.</li>
      </ul>

      <h3 class="regras-subtitle">Onde as faixas grandes valem</h3>
      <ul class="regras-list">
        <li>Extremo e Colossal são território de magia de círculo alto e de arma de cerco. Se elas aparecem numa cena, a cena precisa ter espaço para isso, senão vira alcance decorativo.</li>
        <li>Lunar, Estelar e Galáctico são escala de viagem e de ameaça de fim de campanha. Trate como ficção, não como distância de mapa tático.</li>
        <li>Em mapa quadriculado, um quadrado é 1,5 m. Arredonde e siga: parar a mesa para acertar meio quadrado nunca melhorou uma cena.</li>
      </ul>
    `,
  },

  ferimentos: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Cair a 0 não é o fim: o quanto você passou de 0 define o tamanho do buraco, e Morrendo dá ao grupo algumas rodadas para resolver.',
    destaques: [
      ['Queda', '0 PV ou menos'],
      ['Morte', 'Morrendo 3'],
      ['DT', '12 + Gravidade × 2 + Ferido'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Vida negativa</h3>
      <p class="regras-lead">Chegar a 0 não zera a conta. O dano continua sendo anotado abaixo de zero, e é esse número que decide se a queda foi um tropeço ou um desastre.</p>
      <ul class="regras-list">
        <li>Continue registrando o dano abaixo de 0. Esse valor é o seu <strong>Déficit de Vida</strong>.</li>
        <li>A cura preenche o Déficit primeiro. Você só acorda quando voltar a 1 PV ou mais.</li>
        <li>Se o Déficit chegar à sua Vida máxima, você morre na hora, sem teste.</li>
      </ul>

      <h3 class="regras-subtitle">Gravidade da queda</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Déficit em relação à Vida máxima</th><th>Gravidade</th><th>DT base</th></tr></thead>
        <tbody>
          <tr><td>0% a 10%</td><td>0</td><td>12 + Ferido</td></tr>
          <tr><td>Acima de 10% até 25%</td><td>1</td><td>14 + Ferido</td></tr>
          <tr><td>Acima de 25% até 50%</td><td>2</td><td>16 + Ferido</td></tr>
          <tr><td>Acima de 50% até 75%</td><td>3</td><td>18 + Ferido</td></tr>
          <tr><td>Acima de 75%</td><td>4</td><td>20 + Ferido</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Morrendo</h3>
      <ol class="regras-steps">
        <li>Ao chegar a 0 PV ou menos, você cai inconsciente e recebe <strong>Morrendo 1</strong>.</li>
        <li>No fim de cada turno seu, role Fortitude contra <strong>DT 12 + (2 × Gravidade) + Ferido</strong>.</li>
        <li>Sucesso segura onde está; sucesso crítico reduz em 1; falha aumenta em 1; falha crítica aumenta em 2.</li>
        <li>Em Morrendo 3, você morre. A maestria de Constituição empurra esse limite para Morrendo 4.</li>
      </ol>
      <p class="regras-note">Um teste de Cura usa a mesma DT. Sucesso estabiliza, o que interrompe os testes de Morrendo. Mas acordar é outra coisa: só cura suficiente para chegar a 1 PV traz a pessoa de volta. Quem acorda ganha Ferido 1.</p>

      <h3 class="regras-subtitle">Remover Ferido</h3>
      <ul class="regras-list">
        <li>Um descanso completo de qualidade Boa ou melhor tira 1 de Ferido, se o personagem for tratado e terminar o descanso consciente.</li>
        <li>É uma redução por descanso completo, mesmo que várias pessoas curem a mesma pessoa.</li>
        <li>Poder ou tratamento que remova Ferido fora do descanso precisa dizer isso com todas as letras.</li>
      </ul>

      <h3 class="regras-subtitle">Quando rolar ferimento crítico</h3>
      <ul class="regras-list">
        <li>Quando um único golpe tirar metade ou mais dos seus PV máximos.</li>
        <li>Quando você tirar falha crítica num teste de Morrendo.</li>
        <li>Uma rolagem por fonte de dano, mesmo que os dois gatilhos aconteçam juntos.</li>
      </ul>

      <h3 class="regras-subtitle">Tabela de trauma (2d6)</h3>
      <div class="regras-table-wrap"><table class="regras-table regras-table--probability">
        <thead><tr><th>2d6</th><th>Chance</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr><td>2</td><td>2,8%</td><td><strong>Trauma mortal:</strong> aumente Morrendo em 1.</td></tr>
          <tr><td>3–4</td><td>13,9%</td><td><strong>Hemorragia:</strong> desvantagem no próximo teste de Morrendo até ser estabilizado.</td></tr>
          <tr><td>5–6</td><td>25%</td><td><strong>Fratura:</strong> −2 em testes físicos até tratamento e descanso completo.</td></tr>
          <tr><td>7–8</td><td>30,6%</td><td><strong>Choque:</strong> perca 1d4 Mana e sua próxima reação.</td></tr>
          <tr><td>9–10</td><td>19,4%</td><td><strong>Cicatriz:</strong> consequência narrativa e −1 contextual até ser tratada.</td></tr>
          <tr><td>11</td><td>5,6%</td><td><strong>Instinto:</strong> vantagem no próximo teste de Morrendo.</td></tr>
          <tr><td>12</td><td>2,8%</td><td><strong>Aqui não é o final:</strong> estabilize e volte imediatamente com 1 PV.</td></tr>
        </tbody>
      </table></div>
    `,
    corpoMestre: `
      <p class="regras-lead">Cair a 0 aqui não é o fim, é o começo de um relógio. Morrendo dá ao grupo algumas rodadas para decidir se resgatam ou se seguem em frente, e essa decisão é a parte boa da regra. Aproveite o relógio em vez de encurtá-lo.</p>

      <h3 class="regras-subtitle">Deixar o relógio correr</h3>
      <ul class="regras-list">
        <li>A Gravidade sai do quanto o golpe passou de 0, então um lacaio derruba com Gravidade baixa e um chefe derruba com Gravidade alta. Isso já diferencia o resgate sem você mexer em nada.</li>
        <li>Anuncie a DT do teste de Morrendo em voz alta. O grupo precisa saber se levantar aquele personagem é viável antes de gastar o turno tentando.</li>
        <li>Estabilizar interrompe os testes, mas não acorda ninguém. Deixe isso claro na primeira vez: muita mesa acha que estabilizou é o mesmo que voltou.</li>
        <li>Inimigo raramente deve executar quem caiu. Se um deles fizer isso, que seja característica anunciada daquela criatura, não descuido de condução.</li>
      </ul>

      <h3 class="regras-subtitle">Ferimento crítico</h3>
      <ul class="regras-list">
        <li>Os dois gatilhos são objetivos: um golpe que tira metade da Vida máxima, ou falha crítica no teste de Morrendo. Não improvise um terceiro.</li>
        <li>Role a tabela na frente da mesa. Ela tem um resultado bom no 12 e um instinto no 11, e esconder isso faz a tabela parecer só uma punição.</li>
        <li>Uma rolagem por fonte de dano, mesmo quando os dois gatilhos acontecem juntos.</li>
      </ul>

      <h3 class="regras-subtitle">Ferido é o custo real</h3>
      <ul class="regras-list">
        <li>Quem acorda ganha Ferido 1, e Ferido entra na DT dos testes de Morrendo seguintes. É assim que uma sessão difícil pesa na próxima sem você precisar tirar Vida de ninguém.</li>
        <li>Sai 1 por descanso completo de qualidade Boa ou melhor, com tratamento. Se a campanha não dá espaço para descanso bom, o Ferido acumula e o grupo entra em espiral: esse é o aviso para afrouxar o ritmo.</li>
      </ul>
    `,
  },

  coreografia: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Você escolhe o risco antes do dado. Deu certo, virou cena; deu errado, virou problema, e o problema nunca encerra o combate sozinho.',
    destaques: [
      ['Uso', '1 vez por turno'],
      ['Declaração', 'antes da rolagem'],
      ['Tudo ou Nada', '1 vez por cena'],
    ],
    corpo: `
      <p class="regras-lead">Descreva uma jogada de cinema que caiba na cena e escolha o risco <strong>antes</strong> de rolar. A descrição tem que mudar alguma coisa na ficção: pular do lustre, chutar a mesa no meio do caminho, usar o sujeito como escudo. Dizer "uso Arriscado" e rolar o dado não é Coreografia.</p>

      <h3 class="regras-subtitle">Níveis de risco</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Risco</th><th>Se tiver sucesso</th><th>Se falhar</th></tr></thead>
        <tbody>
          <tr><td>Seguro</td><td>Reposicione-se 1,5 m após a ação.</td><td>Sem consequência adicional.</td></tr>
          <tr><td>Ousado</td><td>+2 no teste e +2 no dano.</td><td>Fica Exposto: −2 Defesa até seu próximo turno.</td></tr>
          <tr><td>Arriscado</td><td>Vantagem e +1 dado da arma no dano.</td><td>Sofre 1d8 de dano e perde a ação de movimento.</td></tr>
          <tr><td>Perigoso</td><td>O ataque se torna crítico se acertar.</td><td>Cai e o inimigo recebe vantagem no próximo ataque contra você.</td></tr>
          <tr><td>Tudo ou Nada</td><td>Crítico com dados maximizados.</td><td>Sofre um crítico do inimigo e recebe Ferido 1. Uma vez por cena.</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Se a descrição não muda nada na cena, ou se é a mesma de sempre só para pegar o bônus, o Mestre pode negar a Coreografia.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">Esta é a única regra do livro em que você é o filtro. O sistema entrega os bônus, e cabe a você decidir se a descrição merece. Um Mestre que aceita tudo transforma Coreografia num imposto de bônus; um que nunca aceita mata a melhor regra da mesa.</p>

      <h3 class="regras-subtitle">Quando aceitar</h3>
      <ul class="regras-list">
        <li>Aceite quando a descrição muda alguma coisa no mundo: a mesa vira, o lustre cai, o inimigo fica sem cobertura. Se a cena continua idêntica depois, não foi Coreografia.</li>
        <li>Aceite descrição repetida quando a situação mudou. Pular do parapeito de novo, numa sala diferente, continua valendo.</li>
        <li>Negue quando a fala for só o nome do risco. "Uso Arriscado" com um ataque comum atrás é exatamente o que a regra existe para não premiar.</li>
        <li>Negue quando a descrição não cabe fisicamente na cena. Não há lustre numa caverna, e apontar isso é condução, não implicância.</li>
      </ul>

      <h3 class="regras-subtitle">Deixar o risco pesar</h3>
      <ul class="regras-list">
        <li>A falha de Arriscado para cima já é dura sozinha. Não some consequência narrativa por cima do custo mecânico: o jogador aceitou um preço, e ele já pagou.</li>
        <li>Tudo ou Nada é uma vez por cena e cobra um crítico do inimigo mais Ferido 1. Quando alguém declarar, confirme em voz alta que a pessoa sabe o tamanho da conta.</li>
        <li>A declaração vem antes do dado, sempre. Deixar escolher o risco depois de ver o resultado desmonta a regra inteira.</li>
        <li>Inimigo também pode usar Coreografia, e é uma das formas mais baratas de tornar um Elite memorável. Descreva o risco dele em voz alta, do mesmo jeito.</li>
      </ul>
    `,
  },

  descanso: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Recuperação em porcentagem, que continua valendo no nível 30 igual valia no 3, e uma trilha de Cansaço de 0 a 6 sem meio-termo.',
    destaques: [
      ['Descanso', '8 horas'],
      ['Relaxar', '1 hora, 1 vez'],
      ['Cansaço', '0–6'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Descanso completo</h3>
      <ul class="regras-list">
        <li><strong>Péssima:</strong> menos de 4 horas, duas interrupções perigosas ou exposição severa.</li>
        <li><strong>Ruim:</strong> entre 4 e 7 horas, ou local inseguro, sem abrigo, alimento ou água suficientes.</li>
        <li><strong>Boa:</strong> 8 horas, abrigo básico, alimento, água e no máximo uma interrupção curta.</li>
        <li><strong>Maravilhosa:</strong> 8 horas em local seguro, cama de verdade, refeição completa e nenhuma interrupção.</li>
        <li><strong>Excelente:</strong> santuário protegido, com conforto e cuidado médico ou sobrenatural. Depende de autorização do Mestre.</li>
      </ul>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Qualidade</th><th>PV e Mana</th><th>Sanidade</th><th>Reduz Cansaço</th></tr></thead>
        <tbody>
          <tr><td>Péssima</td><td>10% do máximo</td><td>0%</td><td>1</td></tr>
          <tr><td>Ruim</td><td>25% do máximo</td><td>5%</td><td>2</td></tr>
          <tr><td>Boa</td><td>50% do máximo</td><td>10%</td><td>3</td></tr>
          <tr><td>Maravilhosa</td><td>75% do máximo</td><td>20%</td><td>4</td></tr>
          <tr><td>Excelente</td><td>100% do máximo</td><td>35%</td><td>todo o Cansaço</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Relaxar</h3>
      <div class="regras-formula">Recupere 1d6 + Mod.Sabedoria + ⌊Nível ÷ 4⌋ de Mana</div>
      <ul class="regras-list">
        <li>Exige uma hora em segurança relativa, e vale uma vez só entre dois descansos completos.</li>
        <li>Se a hora foi gasta em algo que significa alguma coisa para o personagem, o Mestre pode devolver 1 ponto de Cansaço junto.</li>
      </ul>

      <h3 class="regras-subtitle">Cansaço</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Efeito</th></tr></thead>
        <tbody>
          <tr><td>0: Disposto</td><td>Sem penalidade.</td></tr>
          <tr><td>1: Cansado</td><td>−1 em testes físicos.</td></tr>
          <tr><td>2: Fatigado</td><td>−2 em testes físicos e −1 Iniciativa.</td></tr>
          <tr><td>3: Esgotado</td><td>−2 em todos os testes.</td></tr>
          <tr><td>4: Exausto</td><td>Desvantagem em testes físicos; não pode treinar.</td></tr>
          <tr><td>5: Debilitado</td><td>Movimento pela metade e sem reações.</td></tr>
          <tr><td>6: Colapso</td><td>Inconsciente até reduzir Cansaço.</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Um combate conta como intenso quando o personagem desce à metade dos PV, gasta metade da Mana ou entra em Morrendo. A cena inteira gera <strong>1</strong> Cansaço, mesmo que os três gatilhos aconteçam. Seis horas de treino e uma noite em claro também valem 1 cada. Sempre em números inteiros, porque não existe meio Cansaço.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">A escala de qualidade do descanso é o seu botão de ritmo mais preciso. Você não precisa tirar Vida de ninguém para apertar uma campanha: basta o grupo dormir mal duas noites seguidas.</p>

      <h3 class="regras-subtitle">A escala como mostrador</h3>
      <ul class="regras-list">
        <li>Péssima devolve 10% e tira 1 de Cansaço; Excelente devolve tudo e zera a trilha inteira. É uma diferença enorme, e ela é decidida pelo mundo que você descreve, não por rolagem.</li>
        <li>Excelente depende da sua autorização por escrito na regra. Trate como recompensa de lugar: um santuário, uma base com Área Médica, um aliado poderoso hospedando o grupo.</li>
        <li>Descanso de qualidade Boa ou melhor também tira 1 de Ferido. Negar descanso bom por muitas sessões não atrasa só a recuperação: acumula Ferido, que sobe a DT de Morrendo e empurra o grupo para uma espiral. Quando notar isso, afrouxe.</li>
        <li>Relaxar existe e a mesa esquece. Uma hora em segurança relativa, uma vez entre descansos completos, devolve Mana. Ofereça em voz alta quando houver uma pausa.</li>
      </ul>

      <h3 class="regras-subtitle">Pressão sem trapaça</h3>
      <ul class="regras-list">
        <li>Descanso nunca falha só porque você não queria. O custo vem do mundo continuar andando: o inimigo se reposiciona, a pista esfria, o prazo encolhe.</li>
        <li>Use relógio visível. Anuncie o que está correndo antes de o grupo escolher parar, para a escolha ser informada.</li>
        <li>Interromper descanso em lugar hostil é legítimo, desde que a ameaça tenha sido apresentada antes da decisão de dormir ali.</li>
        <li>Não puna planejamento eficiente. Grupo que conquistou segurança merece receber o benefício inteiro, e tirar isso ensina a mesa que preparar não adianta.</li>
        <li>Compare encontros por recurso gasto, não por quantidade fixa entre descansos. Três lutas fáceis podem custar menos que uma difícil.</li>
      </ul>

      <h3 class="regras-subtitle">Ler a trilha de Cansaço</h3>
      <ul class="regras-list">
        <li>Os gatilhos são objetivos: cena intensa, seis horas de treino, noite em claro. Cada um vale 1, e a cena inteira gera 1 mesmo que os três gatilhos apareçam juntos.</li>
        <li>O degrau 3 é onde a trilha começa a doer de verdade, porque a penalidade passa a valer para todos os testes. Se o grupo vive no 3, o problema é de ritmo da campanha, não de escolha dos jogadores.</li>
        <li>Cansaço 6 derruba a pessoa. Chegar lá deve ser resultado de uma sequência de decisões visíveis, nunca surpresa de contabilidade.</li>
      </ul>
    `,
  },

  treinar: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Grau dado pela classe sobe na hora. Grau conquistado por treino cobra tempo, nível e, mais para frente, alguém que te ensine.',
    destaques: [
      ['Dia de treino', '6 horas'],
      ['Requisito', 'Nível total e condição adicional'],
      ['Maior grau', 'Renomado'],
    ],
    corpo: `
      <p class="regras-lead">São dois caminhos diferentes e vale não confundir. Quando uma <strong>classe</strong> te dá um Grau de Treinamento, escolha uma perícia e suba um grau imediatamente, sem tempo, sem tabela e sem requisito. Quando você quer subir <strong>por treino</strong>, aí sim cumpre o tempo da linha, o Nível Total mínimo e o requisito extra, quando existir.</p>

      <h3 class="regras-subtitle">Progressão</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Avanço</th><th>Tempo</th><th>Nível Total e requisito adicional</th></tr></thead>
        <tbody>
          <tr><td>Iniciante → Aprendiz</td><td>3 dias</td><td>Nível Total 1</td></tr>
          <tr><td>Aprendiz → Treinado</td><td>7 dias</td><td>Nível Total 3</td></tr>
          <tr><td>Treinado → Especialista</td><td>14 dias</td><td>Nível Total 7</td></tr>
          <tr><td>Especialista → Mestre</td><td>21 dias</td><td>Nível Total 13 e instrutor</td></tr>
          <tr><td>Mestre → Veterano</td><td>32 dias</td><td>Nível Total 19 e feito notável</td></tr>
          <tr><td>Veterano → Renomado</td><td>62 dias</td><td>Nível Total 29, feito e item especial</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Regras de treinamento</h3>
      <ul class="regras-list">
        <li>Cada dia custa seis horas e deixa 1 de Cansaço no fim. Uma noite normal de sono resolve.</li>
        <li>Um instrutor de grau superior ao seu corta 20% do tempo, arredondando para cima.</li>
        <li>Parar no meio não apaga o que já foi feito. Mas mais de 30 dias largado cobra um dia de revisão antes de continuar.</li>
        <li>Não se rola nada para treinar. Cumpriu o tempo, o Nível Total e o requisito da linha, subiu.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Treinar não custa dado nenhum: custa dias. Isso transfere a decisão inteira para você, porque quem controla o calendário da campanha controla se essa regra existe ou não.</p>

      <h3 class="regras-subtitle">Conceder tempo</h3>
      <ul class="regras-list">
        <li>Subir de Aprendiz para Treinado leva 7 dias; de Treinado para Especialista, 14. Se a campanha nunca dá duas semanas de folga, ninguém passa de Aprendiz, e é justo avisar isso antes de o grupo planejar em cima do treino.</li>
        <li>Um intervalo entre arcos é o lugar natural. Diga quantos dias o grupo tem e deixe cada um decidir como gastar: treino, fabricação, ritual ou descanso.</li>
        <li>Cada dia de treino deixa 1 de Cansaço, então treinar não é férias. Um grupo que treina até a véspera chega na aventura seguinte já desgastado, e essa é uma escolha legítima deles.</li>
      </ul>

      <h3 class="regras-subtitle">Os requisitos são ganchos</h3>
      <ul class="regras-list">
        <li>Os três últimos degraus não abrem só com tempo. Especialista para Mestre pede um instrutor; Mestre para Veterano pede um feito notável; Veterano para Renomado pede feito e um item especial.</li>
        <li>Trate cada um desses como aventura pequena. Encontrar quem ensina, provar o feito e conseguir o item são três sessões prontas que o próprio jogador pediu.</li>
        <li>Um instrutor de grau superior corta 20% do tempo. Isso torna o NPC professor uma recompensa concreta, e não só um nome no mapa.</li>
        <li>Interromper não apaga o progresso. Mas passar de 30 dias largado cobra um dia de revisão, o que é motivo suficiente para o jogador querer voltar.</li>
      </ul>

      <h3 class="regras-subtitle">Não confundir com o grau da classe</h3>
      <p>O grau que a classe entrega nos níveis 1, 6, 11 e 17 sobe na hora, sem tempo nem requisito. Se um jogador reclamar que treinar é lento, confira se ele não está falando do outro caminho: são dois sistemas separados e os dois continuam valendo.</p>
    `,
  },

  xp: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Uma tabela de XP só, do nível 1 ao 60, com recompensas que saem do nível total, nunca de cada classe separada.',
    destaques: [
      ['Níveis', '1–60'],
      ['Legado', 'a cada 5 níveis'],
      ['Atributo', '+1 a cada 4 níveis'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Progressão do nível total</h3>
      <p class="regras-lead">Toda vez que você sobe de nível, escolhe uma das suas classes e aumenta o nível dela em 1. As recompensas da tabela olham para o <strong>nível total</strong>, então multiclasse não recebe nada em dobro.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Níveis totais</th><th>Recompensa global</th></tr></thead>
        <tbody>
          <tr><td>Todos os níveis</td><td>+1 nível em uma classe escolhida</td></tr>
          <tr><td>4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56 e 60</td><td>+1 em um atributo, respeitando o limite natural 20</td></tr>
          <tr><td>5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 e 60</td><td>1 Legado de Ascensão</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Especialização e multiclasse</h3>
      <ul class="regras-list">
        <li>Uma classe só chega ao nível 20 se você já tiver nível 10 em outra classe. Não dá para maximizar uma classe sozinha.</li>
        <li>Fora essa trava, subir de nível é livre: escolha qualquer classe que já tenha entre suas classes atuais.</li>
        <li>Classe especial exige nível total 20, consome nível como qualquer outra e não ocupa uma das duas vagas de classe comum.</li>
        <li>Classe comum serve a qualquer Árvore. Classe especial depende de liberação do Mestre e só aparece nas Árvores indicadas na página dela.</li>
        <li>Ao entrar numa classe nova você não ganha equipamento, dinheiro ou qualquer outro benefício de criação de novo.</li>
      </ul>

      <h3 class="regras-subtitle">Fórmula de progressão</h3>
      <div class="regras-formula">XP total do nível N = 500 × N × (N − 1)</div>
      <p class="regras-note">Sair do nível N e chegar ao N+1 custa N × 1.000 XP.</p>

      <h3 class="regras-subtitle">Tabela completa</h3>
      <div class="regras-xp-grid regras-xp-grid--revised">${tabelaXP}</div>

      <h3 class="regras-subtitle">Recompensas por marco</h3>
      <ul class="regras-list">
        <li><strong>Descoberta ou objetivo menor:</strong> 10% do próximo nível.</li>
        <li><strong>Missão relevante:</strong> 25% do próximo nível.</li>
        <li><strong>Fim de arco:</strong> 50% do próximo nível.</li>
        <li>XP de combate se divide pelo grupo. XP de descoberta e de arco vai inteiro para cada um.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">A tabela é fechada e a fórmula é simples: sair do nível N custa N mil de experiência. Do 1 para o 2 são mil; do 19 para o 20 são dezenove mil. Isso quer dizer que o mesmo tesouro de XP vale cada vez menos, e é por isso que a recompensa por marco é dada em porcentagem, não em número.</p>

      <h3 class="regras-subtitle">Distribuir por marco</h3>
      <ul class="regras-list">
        <li>Descoberta ou objetivo menor vale 10% do próximo nível; missão relevante, 25%; fim de arco, 50%. Trabalhando com esses três, o grupo sobe um nível a cada arco mais algumas conquistas no caminho.</li>
        <li>XP de combate se divide pelo grupo, mas XP de descoberta e de arco vai inteiro para cada um. Um grupo grande sobe mais devagar pela luta e na mesma velocidade pela história: use isso se a mesa tiver seis pessoas.</li>
        <li>Prefira anunciar o marco quando ele acontece, em vez de somar tudo no fim da sessão. O grupo joga melhor quando sabe que aquilo ali contou.</li>
      </ul>

      <h3 class="regras-subtitle">Os níveis que mudam o jogo</h3>
      <ul class="regras-list">
        <li>A cada 4 níveis totais entra +1 em um atributo, e a cada 5 entra um Legado de Ascensão. Nos níveis 20, 40 e 60 os dois caem juntos: são os saltos maiores da campanha.</li>
        <li>Quando o grupo cruzar um desses, recalibre a Vida do encontro antes de reaproveitar ficha de inimigo antiga. Um Legado muda mais o encontro que dois níveis.</li>
        <li>Multiclasse não recebe nada em dobro, porque a tabela olha o nível total. Deixe isso claro na primeira vez que alguém abrir uma segunda classe: a dúvida aparece sempre.</li>
      </ul>

      <h3 class="regras-subtitle">A trava do nível 20</h3>
      <p>Uma classe só chega ao 20 se outra já estiver no 10. Quem quer maximizar uma classe sozinho vai travar no 19, e é melhor avisar isso quando o personagem estiver no 15 do que quando ele bater na parede.</p>
    `,
  },

  legados: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'A cada cinco níveis totais você escolhe um Legado. É escolha permanente, e a ficha confere os pré-requisitos na hora.',
    destaques: [
      ['Catálogo', `${(legadosData.legados?.length || 0) + (legadosNovosData.novos?.length || 0)} Legados`],
      ['Marco', 'a cada 5 níveis'],
      ['Escolha', 'permanente']
    ],
    corpo: `
      <p class="regras-lead">A cada cinco níveis totais, ou seja, no 5, no 10, no 15 e assim por diante até o 60, escolha um Legado de Ascensão cujos pré-requisitos você já cumpre. Algumas raças dão vagas extras, e quando dão está escrito no catálogo racial.</p>
      <ul class="regras-list">
        <li>Legado escolhido não volta atrás. O jogador não pode remover nem trocar depois.</li>
        <li>Legado não é recompensa de classe. Multiclasse não repete os marcos.</li>
        <li>Só dá para escolher o mesmo Legado de novo se ele estiver marcado como repetível, e dentro do limite dele.</li>
        <li>Nível, atributo e perícia são conferidos no momento da escolha. Perder o requisito depois não tira o Legado.</li>
        <li>O Mestre só autoriza troca em dois casos: erro de criação ou mudança oficial nas regras.</li>
      </ul>

      <h3 class="regras-subtitle">Catálogo</h3>
      <ul class="regras-list">${listaLegadosPublicos}</ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Legado é a escolha mais pesada que o jogador faz depois da classe, e ela é permanente. A ficha confere os pré-requisitos sozinha, então o seu trabalho aqui é de ficção, não de auditoria.</p>

      <h3 class="regras-subtitle">O ritmo dos marcos</h3>
      <ul class="regras-list">
        <li>Um Legado a cada 5 níveis totais. Numa campanha que vai até o 20, são quatro escolhas por personagem, e elas definem mais a identidade dele do que a classe.</li>
        <li>O marco é um bom lugar para uma cena. Um Legado de Ascensão que aparece do nada na ficha rende bem menos que um que apareceu depois de alguma coisa acontecer.</li>
        <li>Marca de Círculo e Cicatriz contam como Legado para efeitos que citem Legados, sem ocupar vaga. Um conjurador de círculo alto acumula os dois tipos, e é bom você saber disso ao ler a ficha dele.</li>
      </ul>

      <h3 class="regras-subtitle">Permanência</h3>
      <ul class="regras-list">
        <li>A escolha não se desfaz. Se um jogador escolher mal e a mesa concordar em reverter, faça disso um acontecimento na história em vez de uma edição silenciosa da ficha.</li>
        <li>Um Legado que deixou de fazer sentido para o personagem é melhor gancho que problema. Pergunte por que aquilo mudou antes de oferecer troca.</li>
      </ul>
    `,
  },

  aliados: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Como uma criatura comprada no Bestiário vira uma ficha de aliado editável, quem manda nela e o que ela faz quando o combate começa.',
    destaques: [
      ['Origem', 'Compra, história ou invocação'],
      ['Ficha', 'Editável pelo dono'],
      ['Na mesa', 'Entra na iniciativa como todo mundo'],
    ],
    corpo: `
      <p class="regras-lead">Nem todo mundo que luta ao seu lado é um personagem de jogador. Cavalo, cão de guarda, guarda-costas contratado, criatura invocada: tudo isso vira um aliado, e aliado neste sistema tem ficha própria, não é um parágrafo nas suas anotações.</p>

      <h3 class="regras-subtitle">De onde vem um aliado</h3>
      <ul class="regras-list">
        <li><strong>Compra:</strong> comprar uma criatura do Bestiário na Loja cria o aliado direto na sua ficha, já com Vida, Defesa, Iniciativa, deslocamento e ataque principal preenchidos. Comprou três, aparecem três, cada um com sua ficha separada.</li>
        <li><strong>História:</strong> o Mestre pode entregar um aliado sem venda nenhuma. É a mesma ficha, criada à mão.</li>
        <li><strong>Poder ou magia:</strong> invocações e servos que um poder seu sustenta seguem o texto do próprio poder. Eles somem quando o poder acaba, então não viram entrada permanente.</li>
      </ul>

      <h3 class="regras-subtitle">A ficha do aliado</h3>
      <p>Cada aliado ocupa uma entrada na aba Aliados, com os mesmos campos que o Mestre usa para qualquer criatura: nome, espécie, papel, nível, Vida atual e máxima, Defesa, Movimento, Iniciativa, ataque principal, condições ativas e observações.</p>
      <ul class="regras-list">
        <li>Tudo ali é editável. O aliado que veio da Loja chega com os números do catálogo, e você ajusta conforme a história muda: ele treina, se fere, ganha equipamento, cria mania.</li>
        <li>Marque quem está em cena. Aliado guardado no estábulo continua na lista sem ocupar espaço na mesa.</li>
        <li>Vida do aliado é sua responsabilidade, não do Mestre. Se ele apanhou, anote.</li>
      </ul>

      <h3 class="regras-subtitle">Aliado em combate</h3>
      <ul class="regras-list">
        <li>Ele entra na ordem de iniciativa como qualquer criatura, com a Iniciativa da ficha dele. Não age de carona no seu turno.</li>
        <li>Quem controla é o dono, salvo quando o Mestre disser que aquela criatura tem vontade própria naquele momento.</li>
        <li>Um aliado age por conta: ele tem as ações dele, e não empresta ação nem reação para você.</li>
        <li>Ele pode Ajudar, e vale a mesma regra de todo mundo: no máximo dois ajudantes por teste.</li>
        <li>Quando cai a 0 de Vida, aplique as mesmas regras de Ferimentos. Bicho e contratado morrem igual.</li>
      </ul>
      <p class="regras-note">Um grupo com muitos aliados atrasa a mesa inteira. Combine um teto com o Mestre antes de encher a ficha: geralmente um aliado ativo por personagem já é o suficiente para o combate continuar andando.</p>

      <h3 class="regras-subtitle">Contratados e lealdade</h3>
      <ul class="regras-list">
        <li>Quem foi comprado foi contratado, não escravizado. O acordo vale enquanto o combinado for cumprido, e o Mestre decide o que acontece quando não for.</li>
        <li>Salário, manutenção e alimento são assunto de mesa. Se a campanha usa esse controle, ele entra como despesa recorrente, do mesmo jeito que a manutenção de uma base.</li>
        <li>Aliado não é item: ele não volta para a Loja, não tem preço de revenda e não entra no Cofre.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Aliado é o item de loja que mais afeta o seu trabalho, porque cada um é mais um turno por rodada. Um grupo de quatro com quatro bichos anda pela metade da velocidade.</p>

      <h3 class="regras-subtitle">O teto que vale a pena combinar</h3>
      <ul class="regras-list">
        <li>Um aliado ativo por personagem é o ponto onde o combate ainda anda. Combine isso antes de a primeira compra acontecer, não depois.</li>
        <li>Aliado guardado não ocupa mesa. Incentive a marcação de quem está em cena: o resto continua na ficha sem custo de tempo.</li>
        <li>Se a mesa quiser um exército, dê um NPC único e forte em vez de seis fracos. O efeito na ficção é o mesmo e a rodada não dobra de tamanho.</li>
      </ul>

      <h3 class="regras-subtitle">Quem controla</h3>
      <ul class="regras-list">
        <li>O padrão é o dono controlar. Puxe o controle para você só quando a criatura tiver motivo próprio para agir diferente, e diga que está fazendo isso.</li>
        <li>Contratado tem acordo, e acordo pode ser quebrado dos dois lados. Salário atrasado, ordem suicida ou traição do grupo são ganchos prontos que o próprio sistema entrega.</li>
        <li>Aliado morre pelas mesmas regras de Ferimentos. Deixe morrer quando for a consequência honesta: aliado imortal esvazia a decisão de levá-lo.</li>
      </ul>
    `,
  },
  'frutos-implantes': {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Duas formas de ganhar poder sem subir de nível: comer um Fruto do Éden, que se liga à alma, ou instalar um implante, que é peça de máquina no corpo.',
    destaques: [
      ['Fruto', '1 por criatura, permanente'],
      ['Despertar', 'Escolha só de ida'],
      ['Implante', 'Fica no corpo, não na mochila'],
    ],
    corpo: `
      <p class="regras-lead">Nível e Legado são o caminho normal de ficar mais forte. Estes dois são o caminho caro: você compra, aceita o que vem junto e não desfaz depois.</p>

      <h3 class="regras-subtitle">Frutos do Éden</h3>
      <p>São quinze frutos, cada um com um poder próprio, vendidos por Fragmentos de Estrela e classificados como relíquia da criação. Comprar é a parte fácil: o preço em Fragmentos costuma significar uma campanha inteira atrás de um.</p>
      <ul class="regras-list">
        <li>O fruto entra no inventário como qualquer item. Comer é uma decisão à parte, feita na aba Inventário.</li>
        <li>Ao ser consumido, ele sai do inventário e se liga à ficha para sempre. Não dá para vender, emprestar nem cuspir de volta.</li>
        <li>Uma criatura sustenta um Fruto por vez. Comer um segundo substitui o primeiro em definitivo, e o poder antigo se perde.</li>
        <li>Todo fruto traz uma fraqueza declarada, e água do mar aparece em quase todas. Enquanto a fraqueza estiver atuando, os poderes do fruto desligam.</li>
      </ul>

      <h4 class="regras-subtitle">Os três degraus de um Fruto</h4>
      <ul class="regras-list">
        <li><strong>Vínculo:</strong> a passiva que vale o tempo todo, sem custo nem ação. É o que muda o corpo do personagem, como a Resistência elemental do Fruto das Chamas.</li>
        <li><strong>Técnica:</strong> o poder ativo do dia a dia, na faixa de 3 a 4 de Mana. Custa uma ação e costuma valer uma vez por rodada.</li>
        <li><strong>Despertar:</strong> o poder grande, na faixa de 9 a 14 de Mana e quase sempre uma vez por cena. Ele fica trancado até o fruto ser despertado.</li>
      </ul>
      <p class="regras-note">Despertar é um botão na aba Poderes e só anda para frente: uma vez despertado, o fruto fica assim para sempre naquela ficha. As técnicas normais continuam funcionando; o que muda é que o poder grande passa a existir. Combine com o Mestre o acontecimento da história que justifica o despertar, porque a ficha não pergunta duas vezes.</p>
      <p>Os efeitos numéricos do fruto entram na ficha sozinhos e os poderes aparecem na aba Poderes, junto dos poderes de classe. O texto completo de cada um dos quinze está no catálogo da Loja.</p>

      <h3 class="regras-subtitle">Implantes cibernéticos</h3>
      <p>Enquanto o Fruto mexe na alma, o implante mexe na carne. São dez peças vendidas em Créditos Sombrios, todas exigindo nível 3 ou mais, porque instalar exige um corpo que aguente a cirurgia.</p>
      <ul class="regras-list">
        <li>Implante não vai na mochila. Ele fica numa seção própria do inventário, porque está instalado no corpo e ocupa uma parte dele.</li>
        <li>Cada peça declara o que substitui: um olho, um braço, o coração, os pulmões. Duas peças que disputam a mesma parte do corpo não convivem.</li>
        <li>O benefício vale enquanto o implante estiver funcional. Dano suficiente, campo de interferência ou sobrecarga podem desligá-lo, e a regra da peça diz quando isso acontece.</li>
        <li>Alguns implantes cobram o próprio uso em dano interno que ignora Resistência. Esse dano é parte do preço, não um efeito colateral opcional.</li>
      </ul>
      <p class="regras-note">Créditos Sombrios não se compram com Lunaris. Um implante nunca é uma compra de rotina: é resultado de uma ida ao mercado negro, com tudo que isso costuma cobrar em história.</p>

      <h3 class="regras-subtitle">Os dois juntos</h3>
      <ul class="regras-list">
        <li>Fruto e implante não competem entre si: o mesmo personagem pode carregar um fruto e vários implantes.</li>
        <li>Nenhum dos dois ocupa vaga de Legado nem conta como magia aprendida.</li>
        <li>Os dois são visíveis para quem olhar. Braço de metal e pele de brasa mudam como o mundo trata seu personagem, e essa parte não tem número.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Estes são os dois únicos poderes do jogo que o dinheiro compra e o nível não concede. Por isso os dois passam por você, e o Despertar é a decisão mais irreversível da ficha.</p>

      <h3 class="regras-subtitle">Autorizar o Despertar</h3>
      <ul class="regras-list">
        <li>Despertar libera um poder na faixa de 9 a 14 de Mana, quase sempre uma vez por cena, e não tem volta na ficha. Combine o acontecimento da história antes: o botão não pergunta duas vezes.</li>
        <li>Um fruto desperto muda o teto do encontro. Depois de autorizar, recalibre a Vida do próximo chefe do mesmo jeito que faria com um salto de nível.</li>
        <li>Um Fruto por criatura. Se alguém quiser trocar, o poder antigo se perde para sempre: confirme que a pessoa entendeu antes de deixar consumir o segundo.</li>
      </ul>

      <h3 class="regras-subtitle">Usar a fraqueza</h3>
      <ul class="regras-list">
        <li>Todo fruto declara uma fraqueza, e água do mar aparece em quase todas. Isso é desenho, não descuido: é o que permite montar uma cena em que o portador não é a resposta.</li>
        <li>Use com parcimônia. Anular o fruto em toda sessão apaga a compra mais cara que o jogador fez.</li>
      </ul>

      <h3 class="regras-subtitle">Implantes</h3>
      <ul class="regras-list">
        <li>Pagos em Créditos Sombrios, então você controla o acesso pela moeda antes de controlar pela Loja.</li>
        <li>Cada peça ocupa uma parte do corpo, e duas peças da mesma parte não convivem. Confira isso na hora da instalação, porque a ficha não impede.</li>
        <li>Implante desligado é gancho: campo de interferência, sobrecarga e dano estrutural são formas de tirar a vantagem sem tirar o item.</li>
      </ul>
    `,
  },
  equipamentos: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Quanto você carrega, o que dá para vestir junto e como a Resistência entra na conta do dano. Raridade e modificação ficam no capítulo seguinte.',
    destaques: [
      ['Carga', '10 + 2 × Mod.Força positivo + metade do nível'],
      ['Armadura', '1 principal, 1 malha e 1 escudo'],
      ['Resistência', 'reduz dano após o crítico']
    ],
    corpo: `
      <h3 class="regras-subtitle">Carga e espaços</h3>
      <div class="regras-formula">Capacidade = 10 + (2 × Mod.Força positivo) + ⌊Nível total ÷ 2⌋, mínimo 5</div>
      <ul class="regras-list">
        <li>Cada item ocupa os espaços que o catálogo declara, multiplicados pela quantidade.</li>
        <li>Passou da capacidade, você fica Sobrecarregado: 3 m a menos de movimento e desvantagem em testes físicos.</li>
        <li>Mochila, bolsa ou habilidade só aumentam sua capacidade quando trazem um número explícito. "Guarda bastante coisa" não conta.</li>
      </ul>

      <h3 class="regras-subtitle">Armaduras e escudos</h3>
      <ul class="regras-list">
        <li>No máximo uma armadura principal, uma malha compatível por baixo e um escudo.</li>
        <li>A Defesa dessas três peças soma. Duas armaduras principais nunca somam, por mais criativa que seja a justificativa.</li>
        <li>A penalidade total de armadura cai sobre Acrobacia, Atletismo e Furtividade.</li>
        <li>Sem proficiência no subtipo, a penalidade da peça dobra e você não usa habilidades que exijam proficiência.</li>
      </ul>

      <h3 class="regras-subtitle">Resistência e tipos de dano</h3>
      <p class="regras-lead">A ordem importa: multiplicar depois de subtrair a Resistência daria um número completamente diferente. Faça sempre nesta sequência.</p>
      <ol class="regras-steps">
        <li>Role o dano e aplique o multiplicador crítico aos dados e modificadores que fazem parte do ataque.</li>
        <li>Some os dados extras declarados pelo efeito. Dado extra só multiplica se a fonte disser que multiplica.</li>
        <li>Aplique vulnerabilidade ou redução percentual.</li>
        <li>Subtraia a Resistência do tipo de dano correspondente, até o mínimo 0.</li>
      </ol>
      <p class="regras-note">Resistência física geral cobre corte, perfuração e impacto. Balístico fica de fora, de propósito. E Resistência de um tipo específico não faz nada contra os outros tipos.</p>

      <h3 class="regras-subtitle">Armas, proficiência e munição</h3>
      <ul class="regras-list">
        <li>Arma simples qualquer um usa. Marcial e exótica exigem a proficiência correspondente.</li>
        <li>Sem proficiência, o ataque leva −5 e as propriedades especiais da arma ficam desligadas.</li>
        <li>Arma de disparo gasta uma unidade de munição por ataque, salvo propriedade que diga outra coisa. Sem munição, não há ataque.</li>
        <li>Trocar um carregador usa a ação de movimento. Munição avulsa e arma pesada podem cobrar ação padrão quando a arma declarar isso.</li>
      </ul>

      <p class="regras-note">Raridade, orçamento de poder e o catálogo de modificações ficam no capítulo <strong>Raridades e Modificações</strong>, logo em seguida.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">Equipamento é o eixo que você controla sem tocar na ficha de ninguém. Vida e Defesa vêm do nível; dano e Resistência vêm do que o grupo carrega, e é aí que você mexe.</p>

      <h3 class="regras-subtitle">O teto do arsenal</h3>
      <p>A referência de balanceamento mede as armas publicadas, e o topo é bem alto. Use estes números antes de soltar qualquer arma acima de Épico.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Faixa</th><th>Dano médio no topo</th><th>Nível recomendado</th></tr></thead>
        <tbody>
          <tr><td><strong>Lendário</strong></td><td>Cerca de 45 por acerto</td><td>25</td></tr>
          <tr><td><strong>Relíquia da Criação</strong></td><td>De 62 a 72 por acerto</td><td>35</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Um personagem marcial de nível 10 tem 79 de Vida. Uma Relíquia numa mesa desse nível resolve qualquer inimigo em um ou dois golpes, e é exatamente por isso que as duas faixas exigem sua autorização.</p>

      <h3 class="regras-subtitle">Carga e Resistência</h3>
      <ul class="regras-list">
        <li>Carga só vira decisão se você pesar o inventário de vez em quando. Se ninguém nunca conferiu, a regra não existe, e tudo bem: só não a invoque de surpresa num momento ruim.</li>
        <li>Resistência entra depois do multiplicador crítico. A ordem importa muito: subtrair antes daria um número completamente diferente, e a mesa erra isso com frequência.</li>
        <li>Resistência física geral não cobre balístico, de propósito. Se a sua campanha tem arma de fogo, esse detalhe decide o equilíbrio entre armadura e tiro.</li>
        <li>Sem proficiência são menos 5 e as propriedades da arma desligam. É punição suficiente: não some nada por cima.</li>
      </ul>
    `,
  },

  'raridades-modificacoes': {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Até onde cada raridade pode ir, como uma modificação entra na ficha e as 51 modificações prontas, com preço de encomenda.',
    destaques: [
      ['Raridade', 'é orçamento, não bônus fixo'],
      ['Modificação', '1 efeito automático cada'],
      ['Catálogo', '51 modificações com preço']
    ],
    corpo: `
      <h3 class="regras-subtitle">Raridades e orçamento de poder</h3>
      <p class="regras-lead">Raridade não é um bônus fixo que todo item da mesma faixa recebe. Ela é um <strong>orçamento</strong>: diz quantas modificações, efeitos automáticos e dons aquele objeto aguenta carregar. É o que impede a ficha de virar uma pilha de +1 sem fim.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Raridade</th><th>Mods.</th><th>Efeitos próprios</th><th>Valor por efeito</th><th>Regra</th></tr></thead>
        <tbody>${tabelaRaridadesEquipamento}</tbody>
      </table></div>

      <h3 class="regras-subtitle">Modificações e efeitos na ficha</h3>
      <ul class="regras-list">${REGRAS_MODIFICACOES_EQUIPAMENTO.map((regra) => `<li>${regra}</li>`).join('')}</ul>
      <p class="regras-note">Uma modificação pode conceder Vida máxima, Defesa, Ataque, atributo ou bônus em perícia. Ao guardar ou desequipar o item, a ficha remove os ajustes automaticamente.</p>

      <h3 class="regras-subtitle">Como ler uma modificação</h3>
      <ul class="regras-list">
        <li><strong>Nível:</strong> <strong>Comum</strong> entra em qualquer item. <strong>Marcial</strong> bate mais forte e só entra em arma marcial ou exótica, armadura pesada e item Raro ou melhor.</li>
        <li><strong>Valor:</strong> o peso do efeito automático. Compare com a coluna "Valor por efeito" da tabela ali em cima para saber de qual raridade o item precisa ser.</li>
        <li><strong>Técnica:</strong> não tem efeito automático. Ocupa espaço de modificação, mas não gasta o orçamento de efeito da raridade.</li>
        <li><strong>Pré-requisito:</strong> cobra de <em>quem usa</em>, não do item. Perdeu o requisito, a modificação desliga até você cumprir de novo.</li>
      </ul>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Faixa</th><th>Preço de encomenda</th><th>Raridade mínima do item</th></tr></thead>
        <tbody>${tabelaPrecoModificacoes}</tbody>
      </table></div>
      <p class="regras-note">A Loja vende cada uma delas na categoria <strong>Modificações</strong>, com o preço já aplicado. Marcial só aparece a partir da Metrópole.</p>

      <h3 class="regras-subtitle">Catálogo de modificações</h3>
      <p class="regras-lead">O catálogo contém ${MODIFICACOES_EQUIPAMENTO.length} modificações, agrupadas pela categoria do equipamento.</p>
      ${tabelaModificacoesEquipamento}
      <p class="regras-note">Isso aqui é ponto de partida, não lista fechada. Modificação nova passa, desde que respeite o valor máximo por efeito da raridade e o nível condizente com o equipamento.</p>

      <h3 class="regras-subtitle">Dons definidos por categoria</h3>
      <p>Cada raridade também possui uma manifestação por categoria. A descrição pode alterar aparência e comportamento, sem aumentar o efeito mecânico.</p>
      ${donsRaridadeEquipamento}
    `,
    corpoMestre: `
      <p class="regras-lead">Raridade não é bônus, é orçamento. O que ela diz é quanto poder cabe naquele item, e as três faixas de cima passam por você antes de existir.</p>

      <h3 class="regras-subtitle">O que cada faixa comporta</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Raridade</th><th>Modificações</th><th>Efeitos</th><th>Valor por efeito</th><th>Aprovação</th></tr></thead>
        <tbody>
          <tr><td><strong>Comum</strong></td><td>1</td><td>0</td><td>±1</td><td>livre</td></tr>
          <tr><td><strong>Incomum</strong></td><td>2</td><td>1</td><td>±1</td><td>livre</td></tr>
          <tr><td><strong>Raro</strong></td><td>3</td><td>1</td><td>±2</td><td>livre</td></tr>
          <tr><td><strong>Épico</strong></td><td>4</td><td>2</td><td>±3</td><td>livre</td></tr>
          <tr><td><strong>Lendário</strong></td><td>5</td><td>2</td><td>±4</td><td>sua</td></tr>
          <tr><td><strong>Mítico</strong></td><td>6</td><td>3</td><td>±5</td><td>sua</td></tr>
          <tr><td><strong>Relíquia da Criação</strong></td><td>7</td><td>3</td><td>±7</td><td>sua</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Aprovar bem</h3>
      <ul class="regras-list">
        <li>A diferença entre Épico e Relíquia é quase o dobro de orçamento. Ao subir uma faixa, você não está dando um item melhor: está dando um item que faz mais coisas ao mesmo tempo.</li>
        <li>Efeito de raridade é o que muda a matemática; modificação costuma mudar o uso. Se quiser dar sabor sem inflar o poder, aprove modificação e segure o efeito.</li>
        <li>Cada modificação tem preço de encomenda publicado. Deixar o grupo encomendar é mais saudável que você sortear item: eles pagam, escolhem e ninguém fica com peça inútil.</li>
        <li>Item que o grupo montou peça por peça vale mais na mesa que item achado pronto, e custa menos do seu orçamento de poder.</li>
      </ul>
    `,
  },

  crafting: REGRA_CRAFTING,

  veiculos: REGRA_VEICULOS,

  'magia-fluxo': {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Onze Fluxos aproveitáveis em magia, ritual, selo e encantamento, mais a fusão entre um Fluxo principal e um secundário.',
    destaques: [
      ['Teste', 'd20 + Mod. Fluxo + Misticismo + classe'],
      ['Círculos', '1º ao 10º'],
      ['Catálogo', '33 magias + 33 manifestações'],
    ],
    corpo: `
      <p class="regras-lead">A classe diz <strong>como</strong> você manipula a magia; o Fluxo nativo diz <strong>o que</strong> sai dali. São dez Fluxos naturais mais o artificial da Tecnologia: onze formas utilizáveis no total.</p>

      <h3 class="regras-subtitle">Princípios dos Fluxos</h3>
      <ul class="regras-list">
        <li>Cada alma nasce com um Fluxo natural, e só um. Exceção precisa estar escrita na história do personagem.</li>
        <li>Um segundo Fluxo sempre vem de fora: artefato, relíquia, núcleo tecnológico. Ele nunca passa a morar na alma.</li>
        <li>Fluxo alto não ensina magia. O acesso vem de classe, habilidade, item, Legado ou concessão do Mestre.</li>
        <li>Magia aprendida é permanente, a não ser que uma regra explícita fale em substituição.</li>
      </ul>
      <p class="regras-note"><strong>Fluxos oficiais:</strong> Origem, Essência, Comunicação, Vitalidade, Inconstância, Físico, Espaço, Tempo, Vazio, Fim e Tecnologia. A Tecnologia é o único artificial, e é por isso que ela é a única que se instala.</p>
      <p class="regras-note"><strong>Fluxo do Fim:</strong> raro, e precisa de autorização do Mestre antes de ser escolhido. Autorizado, funciona como qualquer outro.</p>

      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Classe mágica</th><th>Técnica</th></tr></thead>
        <tbody>
          <tr><td>Canalizador</td><td>Domínio direto e puro do Fluxo nativo.</td></tr>
          <tr><td>Sintonizador</td><td>Fusão do Fluxo nativo com catalisadores externos.</td></tr>
          <tr><td>Ritualista</td><td>Pactos e preparações prolongadas fora do combate.</td></tr>
          <tr><td>Invocador</td><td>Vínculo com seres e manifestações do Fluxo nativo.</td></tr>
          <tr><td>Cartista Arcano</td><td>Magias limitadas e organizadas por cartas preparadas.</td></tr>
          <tr><td>Interceptador</td><td>Interferência tecnológica da A.X.I.S contra Fluxos naturais.</td></tr>
        </tbody>
      </table></div>
      <h3 class="regras-subtitle">Teste e DT de magia</h3>
      <div class="regras-formula">Teste = d20 + Mod. Fluxo + Grau de Misticismo + bônus específico da classe</div>
      <div class="regras-formula">DT de conjuração = 7 + (3 × círculo)</div>
      <ul class="regras-list">
        <li>Toda magia de círculo precisa alcançar a DT do próprio círculo para se estabilizar.</li>
        <li>Se houver alvo hostil, compare a <em>mesma</em> rolagem também com Reflexos, Fortitude ou Vontade dele.</li>
        <li>Ou seja: a magia pode estabilizar e ainda assim ser resistida. É uma rolagem só, lida duas vezes.</li>
        <li>Metade do nível não entra aqui. Essa fórmula é diferente da fórmula geral de testes, de propósito.</li>
        <li>A Mana sai no momento em que você declara a conjuração, e não volta se o teste falhar.</li>
      </ul>

      <h3 class="regras-subtitle">Círculos, Fluxo e DT</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Círculo</th><th>Fluxo mínimo</th><th>DT</th><th>Mana base</th></tr></thead>
        <tbody>${tabelaCirculos}</tbody>
      </table></div>
      <p class="regras-note">Esses custos são a referência do círculo. Cada entrada do catálogo declara o custo final dela, que é o que vale na mesa.</p>

      <h3 class="regras-subtitle">O preço dos círculos altos</h3>
      <p class="regras-lead">Magia grande não sai de graça. A partir do 5º círculo, o Fluxo começa a deixar marca em quem o carrega, e no 10º ele cobra por magia aprendida. Todo preço tem os dois lados: um ganho concreto e um ônus concreto.</p>
      <ul class="regras-list">
        <li><strong>Marca do Fluxo (5º ao 9º):</strong> ao alcançar cada um desses círculos, você recebe a Marca daquele círculo no seu Fluxo nativo. Ela não se escolhe e não se rola: é fixa por Fluxo, então dá para saber de antemão o que te espera. Perdeu o círculo, perdeu a Marca.</li>
        <li><strong>Cicatriz (10º):</strong> cada magia de 10º círculo aprendida sorteia uma Cicatriz na tabela comum. Ela é mais pesada dos dois lados, e a mesma não sai duas vezes para o mesmo personagem.</li>
        <li>Marca e Cicatriz contam como Legado para efeitos que citem Legados. Elas não ocupam vaga de Legado.</li>
        <li>Concessão do Mestre não gera Cicatriz. Só conta magia de 10º que você aprendeu.</li>
      </ul>
      <p class="regras-note">A ficha aplica as Marcas sozinha, porque elas saem do seu Fluxo e do seu círculo. A Cicatriz é sorteada na hora de aprender a magia e fica registrada.</p>

      <h3 class="regras-subtitle">Marcas por Fluxo (5º ao 9º círculo)</h3>
      ${tabelaMarcasPorFluxo}

      <h3 class="regras-subtitle">Cicatrizes (10º círculo)</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Cicatriz</th><th>Ganho</th><th>Ônus</th></tr></thead>
        <tbody>${tabelaCicatrizes}</tbody>
      </table></div>

      <h3 class="regras-subtitle">Concentração</h3>
      <ul class="regras-list">
        <li>Uma magia ou efeito de concentração por vez. Começar outro encerra o anterior na hora, sem aviso.</li>
        <li>Ao sofrer dano, role Vontade contra DT 10 ou metade do dano recebido, o que for maior. Falhou, a concentração cai.</li>
        <li>Ficar Atordoado, Inconsciente ou incapaz de agir também derruba. Largar de propósito não custa ação nenhuma.</li>
        <li>A duração máxima está escrita na magia. Pagar Mana de novo não estica uma conjuração que já está de pé.</li>
      </ul>

      <h3 class="regras-subtitle">Rituais</h3>
      <ul class="regras-list">
        <li>Ritual não pertence a círculo nenhum e não entra em combate.</li>
        <li>A Mana fica comprometida no momento em que o ritual começa.</li>
        <li>Se interromperem o ritual, a Mana comprometida já era. Esse é o risco.</li>
        <li>Cada ritual vem de algum lugar: família, pacto, pergaminho, tradição. Ritual não se aprende sozinho.</li>
      </ul>

      <h3 class="regras-subtitle">Fusão de Fluxos</h3>
      <ul class="regras-list">
        <li>Toda magia tem um Fluxo principal, que define a identidade e o efeito central dela.</li>
        <li>Classe ou habilidade capaz de fundir aplica <strong>um</strong> Fluxo secundário por magia. Um.</li>
        <li>O secundário acrescenta a assinatura dele por cima. Não substitui o nativo, e não abre caminho para fusão tripla.</li>
        <li>Chegar ao Fluxo secundário exige o catalisador ou recurso que a fonte da fusão indicar.</li>
      </ul>

      <h3 class="regras-subtitle">Selos e encantamentos</h3>
      <ul class="regras-list">
        <li>Selo é efeito escrito antes, quase sempre consumível, que qualquer um pode disparar se cumprir a condição inscrita.</li>
        <li>Encantamento é padrão permanente, aplicado a um item, uma criatura ou um lugar.</li>
        <li>Quantos encantamentos cabem por raridade: Comum 1, Incomum 2, Raro 3, Épico 4 e Lendário 5.</li>
      </ul>

      <h3 class="regras-subtitle">Catálogo</h3>
      <p>Use os filtros abaixo para procurar magias, rituais, selos, encantamentos e assinaturas de fusão.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">Magia aqui tem dois portões, e os dois são seus: quem tem acesso a um Fluxo e quem chega ao círculo alto. Fluxo alto sozinho não ensina magia nenhuma, então a torneira nunca abre por acidente.</p>

      <h3 class="regras-subtitle">Conceder acesso</h3>
      <ul class="regras-list">
        <li>Cada alma nasce com um Fluxo natural e só um. Segundo Fluxo sempre vem de fora, por artefato, relíquia ou núcleo tecnológico, e nunca passa a morar na alma. Quando entregar um desses itens, você está entregando um Fluxo inteiro: pese como tal.</li>
        <li>O Fluxo do Fim exige sua autorização antes da escolha. Autorizado, funciona como qualquer outro, então a decisão é de tom de campanha, não de balanceamento.</li>
        <li>Concessão de magia fora da classe não gera Cicatriz. Se você quer o poder sem o preço, é esse o caminho, e ele é legítimo.</li>
      </ul>

      <h3 class="regras-subtitle">A DT de conjuração trabalha por você</h3>
      <ul class="regras-list">
        <li>A DT é 7 mais três vezes o círculo, e a Mana sai na declaração, mesmo se o teste falhar. Um conjurador que tenta o círculo máximo dele está apostando recurso, não gastando de graça.</li>
        <li>A mesma rolagem é lida duas vezes: contra a DT do círculo para estabilizar e contra a defesa do alvo. Estabilizar e ser resistido acontece, e vale explicar na primeira vez.</li>
        <li>Metade do nível não entra nessa fórmula, de propósito. Isso mantém o conjurador dependente do atributo Fluxo e do grau de Misticismo, e não do nível puro.</li>
      </ul>

      <h3 class="regras-subtitle">Conduzir Marca e Cicatriz</h3>
      <ul class="regras-list">
        <li>Do 5º ao 9º, cada círculo alcançado entrega a Marca daquele círculo no Fluxo nativo. Elas são fixas e públicas, então o jogador escolhe subir sabendo o que vem. Não improvise Marca nova.</li>
        <li>Toda Marca tem ganho e ônus, e o ônus costuma ser social ou de rotina, não numérico. Use na ficção: o rastro verde da Germinação Involuntária é uma pista que qualquer perseguidor segue.</li>
        <li>No 10º, cada magia aprendida sorteia uma Cicatriz, e a mesma não sai duas vezes para a mesma pessoa. Sorteie na mesa, na hora de aprender.</li>
        <li>Marca e Cicatriz contam como Legado para efeitos que citam Legados, mas não ocupam vaga. Confira isso quando um jogador tentar somar as duas coisas.</li>
      </ul>

      <h3 class="regras-subtitle">Ritual, Selo e Encantamento</h3>
      <ul class="regras-list">
        <li>Ritual não tem círculo e compromete a Mana desde o primeiro minuto: interromper já custou. É a ferramenta certa para efeito grande fora de combate, e a errada para resolver a cena atual.</li>
        <li>Selo e Encantamento acontecem na mesa, com você. Nenhum dos dois se aplica sozinho pela ficha, então é sua a decisão de quando o personagem teve bancada e tempo.</li>
      </ul>
    `,
  },

  condicoes: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Sanidade, crises e as condições que ficam grudadas no personagem, cada uma com o que faz e como sai.',
    destaques: [
      ['Sanidade', '0–100'],
      ['Condições', `${CONDICOES_OFICIAIS.length} oficiais`],
      ['Crises', `${CRISES_SANIDADE.length} catalogadas`],
    ],
    corpo: `
      <h3 class="regras-subtitle">Sanidade</h3>
      <div class="regras-formula">d20 + bônus da perícia Sanidade ou Vontade contra DT 10 / 15 / 20 / 25</div>
      <ul class="regras-list">
        <li>Falhar custa 1d4, 1d6, 1d8 ou 2d6 de Sanidade, conforme o tamanho do que você viu.</li>
        <li>Sucesso crítico evita a perda inteira; sucesso corta pela metade; falha crítica maximiza os dados.</li>
      </ul>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Sanidade</th><th>Estado</th><th>Efeito</th></tr></thead>
        <tbody>
          <tr><td>76–100</td><td>Estável</td><td>Sem efeito.</td></tr>
          <tr><td>51–75</td><td>Abalado</td><td>−1 no primeiro teste mental após perder Sanidade.</td></tr>
          <tr><td>26–50</td><td>Enlouquecendo</td><td>Desvantagem para manter concentração sob ameaça.</td></tr>
          <tr><td>1–25</td><td>Ruptura</td><td>Ao sofrer nova perda, teste Vontade DT 15 ou ganhe uma condição de crise.</td></tr>
          <tr><td>0</td><td>Quebra</td><td>Crise imediata e uma condição permanente definida com o jogador.</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Crises</h3>
      <ul class="regras-list">
        <li>Em Ruptura, cada nova perda de Sanidade cobra Vontade DT 15; falhou, vem uma das crises abaixo.</li>
        <li>Em Sanidade 0 a crise é imediata, sem teste. Passada a cena, o personagem continua em 0 até descansar e ser tratado em segurança.</li>
        <li>A condição permanente da Quebra é definida junto com o jogador, e só muda por resolução na história ou tratamento longo.</li>
      </ul>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Crise</th><th>Duração</th><th>Efeito</th><th>Remoção</th></tr></thead>
        <tbody>${tabelaCrisesSanidade}</tbody>
      </table></div>

      <h3 class="regras-subtitle">Condições gerais</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Condição</th><th>Efeito principal</th><th>Remoção</th></tr></thead>
        <tbody>${tabelaCondicoesGerais}</tbody>
      </table></div>

      <h3 class="regras-subtitle">Iniciativa estática</h3>
      <p class="regras-lead">Iniciativa aqui não se rola: é um número da ficha, igual à Defesa. Você calcula uma vez e usa em todo combate.</p>
      <ul class="regras-list">
        <li>Iniciativa = 10 + metade do nível + Mod.Destreza + bônus.</li>
        <li>Empate se resolve pelo maior Mod.Sabedoria. Se persistir, personagens agem antes de NPCs.</li>
        <li>Surpreendido leva −5 na primeira rodada. Atrasar baixa sua posição de vez, pelo resto do combate.</li>
      </ul>

      <h3 class="regras-subtitle">Defesas passivas</h3>
      <ul class="regras-list">
        <li>Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir rolagem, use <strong>10 + bônus total</strong>.</li>
        <li>Quando você resiste ativamente a um perigo, role o d20 com esse mesmo bônus.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Sanidade é a única barra do jogo que você controla sozinho: nada a consome sem você pedir um teste. Por isso ela vira ferramenta de tom, e não de dano.</p>

      <h3 class="regras-subtitle">Quando pedir teste de Sanidade</h3>
      <ul class="regras-list">
        <li>Peça quando o personagem encara algo que reorganiza o que ele achava do mundo, não quando a cena é só desagradável. Sangue não custa Sanidade; entender o que fez aquele sangue, sim.</li>
        <li>Escolha a DT e o dado da perda antes de descrever a cena, e diga a DT em voz alta. Escolher depois da reação da mesa é o mesmo erro de mudar DT depois do dado.</li>
        <li>Uma cena, um teste. Repetir o teste porque a criatura continua na sala transforma horror em contabilidade.</li>
        <li>Em campanha de tom leve, é legítimo não usar a barra. Diga isso na primeira sessão em vez de simplesmente nunca pedir.</li>
      </ul>

      <h3 class="regras-subtitle">Aplicar uma crise</h3>
      <ul class="regras-list">
        <li>Crise é mecânica, não interpretação obrigatória. Aplique o efeito e deixe o jogador decidir como o personagem se comporta dentro dele.</li>
        <li>Pânico, Dissociação, Catatonia e Fúria duram 1d4 rodadas e saem com Vontade DT 15. Lembre o jogador de que ele tem o teste no fim do turno: crise que ninguém sabe como sair vira só frustração.</li>
        <li>A condição permanente da Quebra em Sanidade 0 é definida com o jogador, nunca imposta. Se ele não quiser aquele tipo de sequela, escolham outra juntos.</li>
      </ul>

      <h3 class="regras-subtitle">Condições em cena</h3>
      <ul class="regras-list">
        <li>Toda condição precisa de uma saída conhecida. Se o jogador não sabe como sair, você não aplicou uma condição, aplicou uma sentença.</li>
        <li>Exposto não acumula consigo mesmo e Atordoado só renova duração. Segure a tentação de empilhar: duas fontes da mesma condição não valem o dobro.</li>
        <li>Iniciativa é número fixo de ficha. Surpreendido tira 5 na primeira rodada, e é assim que uma emboscada bem armada se paga, sem precisar de dano extra.</li>
      </ul>
    `,
  },

  aflicoes: REGRA_AFLICOES,

  classes: {
    categoria: 'Livro do Jogador',
    status: 'Catálogo oficial',
    resumo: 'Classe comum serve a qualquer Árvore. Classe especial é mais forte, só aparece nas Árvores indicadas e depende do Mestre liberar.',
    destaques: [
      ['Classes', '27 catalogadas'],
      ['Comuns / especiais', '16 / 11'],
      ['Progressões completas', '27']
    ],
    corpo: `
      <p class="regras-lead">Nome, tipo e conceito de cada classe. Progressão completa (habilidades, poderes e eventos por nível) fica no catálogo interativo da página de Regras, que lê o mesmo arquivo.</p>
      <ul class="regras-list">${listaClassesPublicas}</ul>
    `,
    corpoMestre: `
      <p class="regras-lead">As 27 classes fecham no mesmo orçamento, então nenhuma é mais forte no papel. O que diferencia uma mesa da outra são os efeitos que mudam economia de ação, e esses estão marcados na referência de balanceamento.</p>

      <h3 class="regras-subtitle">Onde olhar antes da campanha</h3>
      <ul class="regras-list">
        <li>Seis classes carregam alerta qualitativo na referência: Pop Star, Lutador, Atirador, Campeão Dimensional, Cartista Arcano e Ritualista. O alerta não quer dizer forte demais: quer dizer que aquele efeito muda escala ou economia de ação e precisa de cenário de mesa para ser medido.</li>
        <li>Leia a lista de poderes das classes que entraram na sua mesa antes do nível 2. São de dez a doze opções por classe, e as escolhas dos jogadores decidem o formato dos seus encontros mais que o nível deles.</li>
        <li>Classe especial exige nível total 20, liberação sua e um acontecimento. As onze especiais também são presas a Árvores específicas, exceto Cartista Arcano e Invocador: confira isso antes de prometer.</li>
      </ul>

      <h3 class="regras-subtitle">Liberar uma especial</h3>
      <ul class="regras-list">
        <li>A especial não ocupa vaga de classe comum, então quem a ganha fica com três classes. É um salto real de versatilidade, não só de poder.</li>
        <li>Peça que o acontecimento venha da história do personagem. Uma especial concedida como recompensa genérica desperdiça o único momento em que ela poderia significar alguma coisa.</li>
      </ul>
    `,
  },

  'poderes-habilidades': {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'As cinco coisas que uma classe entrega conforme você sobe: Habilidade, Poder, Habilidade Final, Grau de perícia e Evento. O que é cada uma, qual você escolhe e qual vem pronta.',
    destaques: [
      ['Poderes', '8 vagas até o nível 20'],
      ['Habilidades', 'Automáticas, sobem em estágios'],
      ['Eventos', 'Gancho de história, não poder'],
    ],
    corpo: `
      <p class="regras-lead">Subir de nível numa classe sempre entrega alguma coisa, e essa coisa tem cinco formatos diferentes. A confusão mais comum da mesa é tratar Habilidade e Poder como sinônimos: uma vem sozinha e a outra você escolhe.</p>

      <h3 class="regras-subtitle">A grade de uma classe</h3>
      <p>As 27 classes seguem a mesma grade, contada pelo nível daquela classe. Se você tem duas classes, cada uma corre a própria grade separadamente.</p>
      <div class="regras-table-wrap">
        <table class="regras-table">
          <thead><tr><th>Recompensa</th><th>Nos níveis</th><th>Quantas</th></tr></thead>
          <tbody>
            <tr><td><strong>Habilidade</strong></td><td>1, 3, 5, 8, 10, 14, 15, 18 e 20</td><td>Cerca de 10 entregas, distribuídas em 4 habilidades</td></tr>
            <tr><td><strong>Poder</strong></td><td>2, 6, 9, 11, 13, 16, 17 e 19</td><td>8 vagas</td></tr>
            <tr><td><strong>Grau de perícia</strong></td><td>1, 6, 11 e 17</td><td>4</td></tr>
            <tr><td><strong>Evento</strong></td><td>4, 7, 12 e 18</td><td>4</td></tr>
            <tr><td><strong>Habilidade Final</strong></td><td>20</td><td>1</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="regras-subtitle">Habilidade</h3>
      <p>É a marca registrada da classe, e ela chega sozinha: não se escolhe, não se troca e não se rola nada. Cada classe tem quatro, e elas vêm em estágios espalhados pelos vinte níveis.</p>
      <ul class="regras-list">
        <li>Um estágio novo substitui o texto do anterior quando reescreve a mesma coisa, e soma quando descreve algo novo. O texto do estágio diz qual dos dois é.</li>
        <li>Habilidade que fala em "por estágio" cresce a cada entrega. O Batalhão do Guerreiro, por exemplo, escolhe mais um aliado a cada estágio.</li>
        <li>Perder o nível que concedeu o estágio faz você voltar ao estágio anterior.</li>
      </ul>

      <h3 class="regras-subtitle">Poder</h3>
      <p>Aqui você escolhe. Cada classe publica uma lista de dez a doze poderes, e a grade te dá oito vagas até o nível 20. Escolher todos é impossível de propósito: dois Guerreiros de mesmo nível não jogam igual.</p>
      <ul class="regras-list">
        <li>A escolha é feita na hora que a vaga abre, e vale para sempre. Trocar depois exige uma regra que autorize ou a permissão do Mestre.</li>
        <li>Cada poder declara o próprio custo de Mana. Custo zero quer dizer passivo: ele funciona sem você fazer nada.</li>
        <li>Poder com custo declara também a ação que consome. Sem isso escrito, ele é uma Ação Padrão.</li>
        <li>Só dá para escolher um poder da lista da sua própria classe, e cada um uma vez só.</li>
      </ul>

      <h3 class="regras-subtitle">Habilidade Final</h3>
      <p>O fecho da classe, no nível 20, uma por classe. Ela chega sozinha como qualquer habilidade e costuma ser o efeito que define o que aquela classe virou no fim da estrada.</p>

      <h3 class="regras-subtitle">Grau de perícia</h3>
      <p>Um degrau de graça em uma perícia à sua escolha, entregue na hora, sem cumprir tempo nem requisito. É a exceção às regras do capítulo Treinar, e os dois caminhos convivem: o grau dado pela classe sobe agora, o conquistado por treino cobra os dias da tabela.</p>

      <h3 class="regras-subtitle">Evento</h3>
      <p>Evento não é poder. É um gancho que a classe entrega ao Mestre: uma arena que chama o Guerreiro, um clã que cobra o Ninja, um contato que procura o Comerciante. Ele não tem número, não gasta ação e não entra no cálculo de nada.</p>
      <ul class="regras-list">
        <li>Quando o nível do evento chega, o Mestre encaixa aquilo na campanha no momento em que fizer sentido, não obrigatoriamente na mesma sessão.</li>
        <li>O que sai dali é recompensa combinada na mesa. Evento não concede nível, dinheiro infinito nem item garantido.</li>
        <li>Se o grupo estiver no meio de outra coisa, o evento espera. Ele é oportunidade, não interrupção.</li>
      </ul>
      <p class="regras-note">Vale conferir a lista de poderes da classe antes de escolhê-la. Duas classes com a mesma Vida e a mesma Mana podem jogar de formas completamente diferentes por causa do que está nessa lista, e é ela que decide como o personagem vai se sentir no nível 10.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">Os Eventos são a única parte da progressão que cai no seu colo. Os outros quatro tipos a ficha resolve sozinha; o Evento só existe se você o colocar em cena.</p>

      <h3 class="regras-subtitle">Usar os Eventos</h3>
      <ul class="regras-list">
        <li>São quatro por classe, nos níveis 4, 7, 12 e 18. Num grupo de quatro personagens isso dá dezesseis ganchos ao longo da campanha, prontos e alinhados com o que cada jogador escolheu ser.</li>
        <li>Trate como oferta, não como roteiro. Encaixe quando a campanha der espaço e avise o jogador de que aquilo é o Evento dele: metade do valor está em ele reconhecer.</li>
        <li>Não deixe o Evento sequestrar o arco do grupo. Um gancho pessoal que toma três sessões inteiras cobra caro dos outros três jogadores.</li>
        <li>Se dois personagens atingirem o nível de Evento ao mesmo tempo, junte os dois numa cena só quando der. Vale mais que resolver em série.</li>
        <li>A recompensa é sua. O texto do Evento diz explicitamente que não concede nível nem recurso infinito: use reconhecimento, acesso, contato, item específico.</li>
      </ul>

      <h3 class="regras-subtitle">Aprovar escolha de Poder</h3>
      <ul class="regras-list">
        <li>Você não escolhe pelo jogador, mas vale ler a lista da classe dele antes do nível 2. Poder passivo de custo zero muda a matemática do encontro em silêncio, e é bom você saber qual entrou.</li>
        <li>Troca de poder já escolhido só por regra que autorize ou por decisão sua. Deixe claro na primeira sessão qual dos dois vale na sua mesa, porque isso muda como o jogador planeja a build.</li>
        <li>Um pedido de poder de outra classe é sempre não por padrão. Se abrir exceção, cobre o preço em história, e lembre que isso abre precedente para os outros jogadores.</li>
      </ul>

      <h3 class="regras-subtitle">Onde a grade pesa no encontro</h3>
      <ul class="regras-list">
        <li>Os saltos que mais mudam o jogo são o 2 (primeiro poder), o 10 (metade das habilidades já entregues) e o 20 (Habilidade Final). Se o grupo acabou de cruzar um deles, recalibre a Vida do encontro antes de reutilizar uma ficha de inimigo antiga.</li>
        <li>As vagas de poder saem de 0 no nível 1 para 8 no nível 20. A referência de balanceamento traz esse número por classe e por nível, junto de Vida e Mana, nas Notas Internas.</li>
      </ul>
    `,
  },
  racas: {
    categoria: 'Livro do Jogador',
    status: 'Catálogo oficial',
    resumo: 'Raça comum pode nascer em qualquer Árvore. Raça especial é mais forte e só existe nas Árvores compatíveis.',
    destaques: [
      ['Raças disponíveis', '20'],
      ['Comuns / especiais', '12 / 9'],
      ['Ajustes', 'Vida, Mana e Mov.']
    ],
    corpo: `
      <p class="regras-lead">Nome, tipo e ajustes iniciais de Vida, Mana e Movimento de cada raça. Fisiologia, traços e variantes completos ficam no catálogo interativo da página de Regras, que lê o mesmo arquivo.</p>
      <ul class="regras-list">${listaRacasPublicas}</ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Raça mexe pouco em número e muito em ficção. Os ajustes vão de menos 2 a mais 5 de Vida e de menos 2 a mais 5 de Mana, o que no nível 1 é enorme e no nível 20 é ruído.</p>

      <h3 class="regras-subtitle">Comum e especial</h3>
      <ul class="regras-list">
        <li>Doze raças comuns nascem em qualquer Árvore. As nove especiais são mais fortes e só existem nas Árvores compatíveis, então liberar uma é também uma decisão sobre de onde o personagem vem.</li>
        <li>Estar visível no catálogo não concede acesso. Diga na criação quais especiais estão abertas, em vez de negar depois.</li>
      </ul>

      <h3 class="regras-subtitle">O que a raça muda na sua mesa</h3>
      <ul class="regras-list">
        <li>As imunidades raciais são o efeito mecânico que mais aparece em jogo. Golem, Auleth e Autômato ignoram faixas inteiras de aflição: monte encontro sabendo quem no grupo simplesmente não sente aquilo.</li>
        <li>Fisiologia estranha é a parte que rende. Um Slime ou um Espírito na mesa muda como o mundo reage ao grupo antes de mudar qualquer número, e essa é a parte que vale conduzir.</li>
        <li>O ajuste de Movimento é o único que continua pesando no nível alto, porque ele não escala com nada. Um Goblim com mais 1,5 m continua chegando primeiro no nível 30.</li>
      </ul>
    `,
  },

  bestiario: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'As quatro formas de ter uma criatura ao seu lado, o que muda entre elas e como uma criatura comprada vira um aliado na sua ficha.',
    destaques: [
      ['Tipos', 'Criatura, Familiar, Servo, Invocação'],
      ['Compra', 'Vira aliado na ficha'],
      ['Preço', 'Por fórmula, não por lista'],
    ],
    corpo: `
      <p class="regras-lead">Criatura neste jogo não é item de mochila: é alguém que anda com você. O Bestiário reúne as quatro formas de ter uma criatura ao lado, e todas elas terminam do mesmo jeito, como um aliado com ficha própria.</p>

      <h3 class="regras-subtitle">As quatro formas</h3>
      <ul class="regras-list">
        <li><strong>Criaturas:</strong> animais, monstros e seres naturais capturados, domesticados ou criados em cativeiro. O que elas sabem fazer vem do corpo e do habitat, não de treino.</li>
        <li><strong>Familiares:</strong> entidades pequenas ou criaturas inteligentes ligadas ao dono por vínculo mágico. Rendem mais fora de combate que dentro dele: percepção, apoio, recado.</li>
        <li><strong>Servos:</strong> seres criados ou treinados para cumprir tarefa, ligados à alma do dono e incapazes de traí-lo diretamente. Chegam com a sanidade abalada, em metade da barra e com dois traumas, e isso é parte do que eles são.</li>
        <li><strong>Invocações:</strong> seres temporários trazidos por magia, ritual ou dispositivo. Cumprem a função e vão embora no prazo do efeito que os chamou.</li>
      </ul>

      <h3 class="regras-subtitle">Como uma criatura chega até você</h3>
      <ul class="regras-list">
        <li>Comprar no catálogo da Loja cria o aliado direto na sua ficha, com Vida, Defesa, Iniciativa e ataque principal preenchidos. Comprou três, aparecem três fichas.</li>
        <li>Daí em diante ela é sua responsabilidade: vida anotada, condições anotadas, turno próprio na iniciativa. O capítulo Aliados e Contratados explica como ela se comporta na mesa.</li>
        <li>Invocação sustentada por um poder seu não vira entrada permanente: ela existe enquanto o poder existir.</li>
        <li>O que aparece à venda depende da campanha. Uma criatura que o Mestre não liberou não está no catálogo, e isso não é falha do sistema.</li>
      </ul>
      <p class="regras-note">Servo é o único tipo que já nasce com um problema junto. Antes de comprar um, combine com a mesa o que a sanidade abalada dele significa na sua história, porque essa parte não se resolve com número.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">O Bestiário não publica uma lista fechada de preços: publica a fórmula. Você monta a criatura, aplica a faixa de nível e os traços, e o preço sai daí. Para vender ou contratar uma criatura específica, crie uma entrada do tipo monstro na Loja com o preço calculado por estas tabelas.</p>

      <h3 class="regras-subtitle">Criaturas</h3>
      <p>Animais, monstros ou seres naturais capturados, domesticados ou criados em cativeiro. Variam desde feras pequenas até predadores perigosos. Suas habilidades geralmente vêm de sua natureza física ou de seu habitat.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Espécie</th><th>Classe</th></tr></thead>
        <tbody>
          <tr><td>1 a 10</td><td>+6 L / nível</td><td>+4 L / nível</td></tr>
          <tr><td>11 a 20</td><td>+8 L / nível</td><td>+6 L / nível</td></tr>
          <tr><td>21 a 30</td><td>+15 L / nível</td><td>+15 L / nível</td></tr>
          <tr><td>31 a 40</td><td>+40 L / nível</td><td>+40 L / nível</td></tr>
          <tr><td>41 a 50</td><td>+52 L / nível</td><td>+52 L / nível</td></tr>
          <tr><td>50+</td><td>+62 L / nível</td><td>+62 L / nível</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Extras: Arma +15 L, Perícia +12 L, Poder Ass +120 L, Legado +18 L, Variável +70 L.</p>

      <h3 class="regras-subtitle">Familiares</h3>
      <p>Entidades pequenas e espirituais ou criaturas inteligentes que formam um vínculo mágico com seu dono. Oferecem suporte tático, percepção aprimorada e habilidades úteis fora de combate. São leais e sensíveis.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Espécie</th><th>Função</th></tr></thead>
        <tbody>
          <tr><td>1 a 10</td><td>+24 L / nível</td><td>+20 L / nível</td></tr>
          <tr><td>11 a 20</td><td>+30 L / nível</td><td>+26 L / nível</td></tr>
          <tr><td>21 a 30</td><td>+42 L / nível</td><td>+38 L / nível</td></tr>
          <tr><td>31 a 40</td><td>+56 L / nível</td><td>+52 L / nível</td></tr>
          <tr><td>41 a 50</td><td>+68 L / nível</td><td>+65 L / nível</td></tr>
          <tr><td>50+</td><td>+84 L / nível</td><td>+80 L / nível</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Extras: Arma +46 L, Perícia +24 L, Poder Ass +650 L, Legado +52 L, Variável +250 L.</p>

      <h3 class="regras-subtitle">Servos</h3>
      <p>Seres criados ou treinados para cumprir tarefas. Geralmente possuem sanidade abalada (começam com 50% de sanidade e 2 traumas aleatórios). Estão ligados à alma do dono e não podem trair diretamente.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Raça Comum</th><th>Classe Comum</th></tr></thead>
        <tbody>
          <tr><td>1 a 10</td><td>+4 L / nível</td><td>+2 L / nível</td></tr>
          <tr><td>11 a 20</td><td>+8 L / nível</td><td>+6 L / nível</td></tr>
          <tr><td>21 a 30</td><td>+12 L / nível</td><td>+10 L / nível</td></tr>
          <tr><td>31 a 40</td><td>+25 L / nível</td><td>+25 L / nível</td></tr>
          <tr><td>41 a 50</td><td>+35 L / nível</td><td>+35 L / nível</td></tr>
          <tr><td>50+</td><td>+50 L / nível</td><td>+50 L / nível</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Extras: Arma +12 L, Perícia +8 L, Pet +14 L, Poder Ass +230 L, Legado +16 L, Variável +52 L.</p>

      <h3 class="regras-subtitle">Invocações</h3>
      <p>Seres temporários trazidos por magia, rituais ou dispositivos tecnológicos. Surgem para cumprir função, proteção ou utilidade e desaparecem após certo tempo.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Raça</th><th>Classe</th></tr></thead>
        <tbody>
          <tr><td>1 a 10</td><td>+8 L / nível</td><td>+6 L / nível</td></tr>
          <tr><td>11 a 20</td><td>+12 L / nível</td><td>+10 L / nível</td></tr>
          <tr><td>21 a 30</td><td>+18 L / nível</td><td>+14 L / nível</td></tr>
          <tr><td>31 a 40</td><td>+32 L / nível</td><td>+28 L / nível</td></tr>
          <tr><td>41 a 50</td><td>+48 L / nível</td><td>+38 L / nível</td></tr>
          <tr><td>50+</td><td>+60 L / nível</td><td>+46 L / nível</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Extras: Arma +24 L, Perícia +14 L, Poder Ass +460 L, Legado +25 L, Variável +65 L.</p>

      <h3 class="regras-subtitle">Ajudantes</h3>
      <p>Seres que oferecem seus serviços, conscientes e capazes de tomar decisões. Vistos no dia a dia, auxiliam em missões, carregam itens, curam ou lutam.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Raça</th><th>Classe</th></tr></thead>
        <tbody>
          <tr><td>1 a 10</td><td>+6 L / nível</td><td>+4 L / nível</td></tr>
          <tr><td>11 a 20</td><td>+8 L / nível</td><td>+6 L / nível</td></tr>
          <tr><td>21 a 30</td><td>+14 L / nível</td><td>+12 L / nível</td></tr>
          <tr><td>31 a 40</td><td>+32 L / nível</td><td>+30 L / nível</td></tr>
          <tr><td>41 a 50</td><td>+50 L / nível</td><td>+48 L / nível</td></tr>
          <tr><td>50+</td><td>+75 L / nível</td><td>+70 L / nível</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Extras: Arma +16 L, Perícia +12 L, Pet +28 L, Poder Ass +450 L, Legado +20 L, Variável +60 L.</p>

      <h3 class="regras-subtitle">Seres Lendários</h3>
      <p>Criaturas raras, únicas ou extremamente poderosas. Exigem rituais complexos ou condições especiais. Servem como aliados excepcionais que mudam batalhas.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Raça/Espécie</th><th>Classe/Função</th></tr></thead>
        <tbody>
          <tr><td>1 a 10</td><td>-</td><td>-</td></tr>
          <tr><td>11 a 20</td><td>+160 L / nível</td><td>+160 L / nível</td></tr>
          <tr><td>21 a 30</td><td>+240 L / nível</td><td>+240 L / nível</td></tr>
          <tr><td>31 a 40</td><td>+320 L / nível</td><td>+320 L / nível</td></tr>
          <tr><td>41 a 50</td><td>+450 L / nível</td><td>+450 L / nível</td></tr>
          <tr><td>50+</td><td>+650 L / nível</td><td>+650 L / nível</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Extras: Arma +225 L, Perícia +36 L, Pet +210 L, Poder Ass +1.200 L, Legado +80 L, Variável +650 L.</p>

      <h3 class="regras-subtitle">Drops de Seres</h3>
      <p>Preços que mercados pagam por partes de seres. Sem os materiais adequados o preço cai em 75%.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Raça</th><th>Carne</th><th>Órgãos</th><th>Essência</th></tr></thead>
        <tbody>
          <tr><td>Humano</td><td>10 S</td><td>15 S</td><td>25 S</td></tr>
          <tr><td>Vampiro</td><td>-</td><td>80 S</td><td>150 S</td></tr>
          <tr><td>Goblin</td><td>5 S</td><td>8 S</td><td>-</td></tr>
          <tr><td>Anão</td><td>20 S</td><td>30 S</td><td>40 S</td></tr>
          <tr><td>Golem</td><td>-</td><td>60 S</td><td>120 S</td></tr>
          <tr><td>Espírito</td><td>-</td><td>-</td><td>200 S</td></tr>
          <tr><td>Gigante</td><td>120 S</td><td>180 S</td><td>250 S</td></tr>
          <tr><td>Animália</td><td>20 S</td><td>35 S</td><td>25 S</td></tr>
          <tr><td>Sereia/Tritão</td><td>35 S</td><td>70 S</td><td>90 S</td></tr>
        </tbody>
      </table></div>
      <ul class="regras-list">
        <li><strong>Carne:</strong> Fresca (Padrão), Conservada (-20%), Corrompida (-50% ou inutilizável).</li>
        <li><strong>Qualidade do Abate:</strong> Abate limpo (+20%), Abate brutal (-15%).</li>
        <li><strong>Ser lendário:</strong> x2 ou x3 no valor.</li>
      </ul>
    
      <h3 class="regras-subtitle">Na mesa</h3>
      <ul class="regras-list">
        <li>Cada aliado em cena é mais um turno por rodada. Um combate com quatro personagens e quatro bichos anda pela metade da velocidade: combine um teto antes de liberar a compra.</li>
        <li>Criatura comprada não deve resolver o problema que o encontro propôs. Se um servo de nível alto apaga a cena, o preço estava barato demais para aquela campanha.</li>
        <li>Servo chega com sanidade abalada por regra. Use isso: é gancho pronto, e é o que impede o tipo de virar só um personagem extra mais barato.</li>
      </ul>
    `,
  },

  economia: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Como funcionam as moedas de O Jardim, o câmbio entre elas e as regras de segurança e espaço do Cofre Bancário.',
    destaques: [
      ['Moedas', 'Lunaris, Solares, Fragmentos, Créditos'],
      ['Câmbio', 'Conversão via Banqueiro'],
      ['Cofre', 'Proteção e limite de itens'],
    ],
    corpo: `
      <p class="regras-lead">São quatro moedas, e elas não são degraus da mesma escada. Cada uma circula num lugar diferente do mundo, e é por isso que nem todas se trocam entre si.</p>

      <h3 class="regras-subtitle">As quatro moedas</h3>
      <ul class="regras-sublist regras-sublist--grid">
        <li><strong>Lunaris (☾):</strong> a moeda do dia a dia, cristalizada a partir da luz pálida. É com ela que você compra quase tudo.</li>
        <li><strong>Solares (☉):</strong> brilhante e quente ao toque. Aparece quando o valor da compra passa do que caberia num bolso de Lunaris.</li>
        <li><strong>Fragmentos de Estrela (✧):</strong> raros. Compram o que não deveria estar à venda: relíquia, artefato, coisa de escala celestial.</li>
        <li><strong>Créditos Sombrios (♆):</strong> a moeda do submundo. Circula no mercado negro, e quem aceita costuma cobrar mais que o preço.</li>
      </ul>

      <h3 class="regras-subtitle">Câmbio</h3>
      <p>O Banqueiro converte qualquer par de moedas no Discord, sempre passando pelo Solar. Toda conversão cobra 2% de taxa do banco, arredondada a favor da casa.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Moeda</th><th>Vale em Solares</th><th>Vale em Lunaris</th></tr></thead>
        <tbody>
          <tr><td><strong>1 Fragmento de Estrela ✧</strong></td><td>50 Solares</td><td>5.000 Lunaris</td></tr>
          <tr><td><strong>1 Crédito Sombrio ♆</strong></td><td>2 Solares</td><td>200 Lunaris</td></tr>
          <tr><td><strong>1 Solar ☉</strong></td><td>1 Solar</td><td>100 Lunaris</td></tr>
          <tr><td><strong>100 Lunaris ☾</strong></td><td>1 Solar</td><td>100 Lunaris</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">A conta é sempre a mesma: converta para Solares, converta para a moeda de destino e desconte os 2%. Trocar 10 Fragmentos por Lunaris dá 500 Solares, ou seja 50.000 Lunaris, menos a taxa: você recebe 49.000.</p>
      <p>Converter resolve o troco, e só. Um veículo cotado em Lunaris e uma arma lendária cotada em Solares seguem economias separadas, cada uma pensada para o ritmo da própria categoria. Juntar Lunaris a vida inteira não é o caminho previsto para comprar um Fruto do Éden: Fragmentos e Créditos costumam vir de relíquia concedida pelo Mestre, de negócio no mercado negro ou de pagamento de quem não usa moeda comum.</p>

      <h3 class="regras-subtitle">O Cofre</h3>
      <p>O banco do Banqueiro guarda dinheiro e item, e cresce com o quanto você o usa.</p>
      <ul class="regras-list">
        <li>Depositar com frequência rende reputação, e reputação destrava níveis maiores de cofre.</li>
        <li>Cada nível define quantos itens cabem e quanto saldo de cada moeda pode ficar guardado. No último nível, esse teto some.</li>
        <li>Cofre pode ser roubado: o bot dispara esses eventos sozinho. Investir em segurança aumenta a chance de a tentativa fracassar.</li>
        <li>Pela página do Cofre você saca o que precisar direto para a ficha do personagem.</li>
      </ul>
    `,
    corpoMestre: `
      <p class="regras-lead">Dinheiro só é ferramenta de ritmo enquanto houver o que comprar. Antes de decidir quanto entregar, olhe qual patamar de Loja você abriu: os dois números precisam conversar.</p>

      <h3 class="regras-subtitle">O que cada moeda significa</h3>
      <ul class="regras-list">
        <li>Lunaris e Solares são a economia do dia a dia, e se convertem livremente a 100 para 1, com 2% de taxa. Dar muito Lunaris a um grupo que só compra na Feira de Vila é dar nada.</li>
        <li>Um Fragmento de Estrela vale 5.000 Lunaris. Entregar um punhado deles é entregar a chave do Banco Lunar, mesmo que você não tenha aberto o Banco Lunar.</li>
        <li>Um Crédito Sombrio vale 200 Lunaris e é a única porta para implante. Se você não quer implante na campanha, não distribua Créditos.</li>
        <li>A conversão funciona nos dois sentidos. Não existe recompensa em moeda alta que não vire poder de compra em moeda baixa: leve isso em conta antes de dar Fragmento como prêmio simbólico.</li>
      </ul>

      <h3 class="regras-subtitle">O Cofre e o roubo</h3>
      <ul class="regras-list">
        <li>Os eventos de roubo são disparados pelo bot, não por você. Vale avisar a mesa que isso existe antes do primeiro, para não parecer decisão sua contra um jogador.</li>
        <li>Investir em segurança do cofre é uma escolha econômica legítima. Se o grupo reclama de roubo e nunca investiu, a resposta já está no sistema.</li>
        <li>Reputação bancária cresce com uso. Um grupo que movimenta dinheiro destrava mais espaço, o que premia quem participa da economia em vez de guardar tudo embaixo do colchão.</li>
      </ul>
    `,
  },

  loja: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Os quatro lugares onde se compra em O Jardim, o que cada um vende, por que um item some do catálogo e o que acontece quando a compra não é um objeto.',
    destaques: [
      ['Locais', 'Vila, Metrópole, Mercado Negro, Banco Lunar'],
      ['Padrão', 'Os dois últimos começam trancados'],
      ['Compra', 'Pode virar aliado, base ou vínculo'],
    ],
    corpo: `
      <p class="regras-lead">O catálogo inteiro tem quase quinhentos itens, e você nunca vê todos de uma vez. Cada item declara o lugar mínimo onde ele existe, e é o lugar em que o grupo está comprando que decide o que aparece na prateleira.</p>

      <h3 class="regras-subtitle">Os quatro locais</h3>
      <div class="regras-table-wrap">
        <table class="regras-table">
          <thead><tr><th>Local</th><th>O que vende</th><th>Itens</th></tr></thead>
          <tbody>
            <tr><td><strong>Feira de Vila</strong></td><td>O cotidiano: armas simples, proteção comum, ferramentas, suprimentos e criaturas mundanas de nível baixo.</td><td>107</td></tr>
            <tr><td><strong>Metrópole</strong></td><td>Armas marciais, proteção rara, selos básicos, veículos civis, propriedades, especialistas e criaturas intermediárias.</td><td>144</td></tr>
            <tr><td><strong>Mercado Negro</strong></td><td>Contrabando, veneno, armamento militar, implantes, artefatos épicos, material de origem proibida e criaturas perigosas.</td><td>122</td></tr>
            <tr><td><strong>Banco Lunar</strong></td><td>Lendário, mítico, Relíquia da Criação, Frutos do Éden, tecnologia extrema e seres lendários.</td><td>89</td></tr>
          </tbody>
        </table>
      </div>
      <p>Comprar num local mostra tudo daquele nível para baixo: quem está na Metrópole enxerga também a Feira de Vila. O contrário não vale, e tentar comprar um item acima do local é recusado na hora.</p>

      <h3 class="regras-subtitle">O que decide o local de um item</h3>
      <ul class="regras-list">
        <li>A raridade dá a base: comum e incomum na Vila, raro na Metrópole, épico no Mercado Negro, lendário e acima no Banco Lunar.</li>
        <li>A natureza do item pode subir esse piso. Arma marcial começa na Metrópole mesmo sendo comum, e tecnologia de plasma começa no Mercado Negro mesmo sendo incomum.</li>
        <li>Qualquer coisa cotada em Fragmentos de Estrela vai para o Banco Lunar, e qualquer coisa cotada em Créditos Sombrios vai para o Mercado Negro. A moeda denuncia o balcão.</li>
        <li>Implante, artefato e o que a descrição marca como ilegal, contrabando ou veneno caem no Mercado Negro por natureza.</li>
      </ul>

      <h3 class="regras-subtitle">Por que um item some</h3>
      <p>Se um item que você viu antes não está mais lá, é uma destas três coisas, e nenhuma delas é falha do sistema:</p>
      <ul class="regras-list">
        <li><strong>O local não está liberado.</strong> Mercado Negro e Banco Lunar começam trancados por padrão em toda campanha. Abrir os dois é decisão do Mestre, e costuma custar história.</li>
        <li><strong>A campanha escondeu aquela raridade.</strong> O Mestre pode fechar uma faixa inteira de raridade, e ela some do catálogo para todo mundo.</li>
        <li><strong>Aquele item específico foi escondido.</strong> Serve para segurar uma peça até a hora dela aparecer na história.</li>
      </ul>

      <h3 class="regras-subtitle">Quando a compra não é um objeto</h3>
      <p>Três categorias não terminam no inventário. Elas criam uma entrada viva na sua ficha, e a partir daí você é responsável por ela:</p>
      <ul class="regras-list">
        <li><strong>Criatura:</strong> vira um aliado com ficha própria, editável. Ver Aliados e Contratados.</li>
        <li><strong>Propriedade:</strong> vira uma base registrada, com espaços, instalações e conta mensal. Ver Bases e Propriedades.</li>
        <li><strong>Fruto do Éden:</strong> entra no inventário, mas só vale quando consumido, e aí se liga à ficha para sempre. Ver Frutos do Éden e Implantes.</li>
      </ul>
      <p class="regras-note">Antes de comprar algo caro, confirme com a mesa em que local vocês estão. O mesmo item pode estar a duas prateleiras de distância, e ir até a prateleira certa costuma ser uma sessão inteira.</p>
    `,
    corpoMestre: `
      <p class="regras-lead">A Loja é o seu controle de ritmo mais direto. Não é a carteira do grupo que decide o que eles alcançam: é qual balcão você abriu.</p>

      <h3 class="regras-subtitle">Abrir os locais</h3>
      <ul class="regras-list">
        <li>Mercado Negro e Banco Lunar nascem trancados em toda campanha. Isso é padrão do sistema, não esquecimento: abrir os dois cedo entrega implante, artefato e relíquia antes de a campanha ter contexto para eles.</li>
        <li>Abra por acontecimento, nunca por nível. O grupo conheceu um contato, pagou uma dívida, chegou à cidade certa. Assim a abertura vira recompensa em vez de virar aviso de sistema.</li>
        <li>Abrir não precisa ser permanente. Um Mercado Negro que existe numa cidade e não existe na próxima é mais interessante que uma chave que nunca mais se fecha.</li>
      </ul>

      <h3 class="regras-subtitle">Esconder raridade e item</h3>
      <ul class="regras-list">
        <li>Esconder uma faixa de raridade é o corte mais grosso e o mais útil no começo. Uma campanha de nível baixo funciona bem com épico e acima fora do catálogo.</li>
        <li>Esconder um item específico serve para segurar a peça que você quer entregar na história, e não vender. Guarde a arma do vilão assim.</li>
        <li>Item escondido não some das fichas de quem já comprou. O corte vale para a prateleira, não para o inventário.</li>
      </ul>

      <h3 class="regras-subtitle">O que soltar cedo demais custa</h3>
      <ul class="regras-list">
        <li>O arsenal tem teto declarado: arma lendária é calibrada para o nível 25, e Relíquia da Criação para o 35. As duas faixas exigem sua autorização justamente porque a média de dano delas passa de 45 e de 70 respectivamente. Numa mesa de nível 10, uma dessas encerra qualquer encontro que você tinha preparado.</li>
        <li>Fruto do Éden é permanente e sem volta. Liberar o Banco Lunar sem combinar isso antes significa que alguém pode se ligar a um poder para sempre entre uma sessão e outra.</li>
        <li>Implante exige nível 3 e é pago em Créditos Sombrios, que não se compram com Lunaris. Se você quer implante na campanha, precisa entregar Créditos por alguma via, e isso é uma decisão de tom.</li>
        <li>Veículo e propriedade abrem mecânicas inteiras, com manutenção mensal. Libere quando a campanha comportar a contabilidade, não antes.</li>
      </ul>

      <h3 class="regras-subtitle">Quanto dinheiro entregar</h3>
      <ul class="regras-list">
        <li>Compare o tesouro do arco com o preço do balcão aberto, não com a riqueza acumulada. Se o grupo só compra na Vila, muito dinheiro parado é um problema seu, não deles.</li>
        <li>Fragmentos de Estrela e Créditos Sombrios não devem virar recompensa de rotina. A conversão existe nos dois sentidos, então entregar Fragmento com frequência é o mesmo que entregar acesso permanente ao Banco Lunar.</li>
      </ul>
    `,
  },
  bases: REGRA_BASES,

  'mundo-faccoes': REGRA_MUNDO_FACCOES,

  mestre: {
    categoria: 'Guia do Mestre',
    status: 'Somente Mestre',
    resumo: 'O que fazer na primeira sessão, como escolher a dificuldade de um teste, como montar um encontro que não trava e o que nunca deve virar segredo.',
    destaques: [
      ['Acesso', 'Apenas Mestre'],
      ['DT padrão', '15 + metade do nível'],
      ['Regra de ouro', 'Escolha a DT antes do dado'],
    ],
    corpo: `
      <p class="regras-lead">Daqui para baixo é só para quem conduz a mesa. Se você nunca mestrou, a boa notícia é que este sistema pede pouca preparação numérica: uma DT, um punhado de inimigos e a disposição de dizer "sim, e" com mais frequência do que "não".</p>

      <h3 class="regras-subtitle">Sua primeira sessão</h3>
      <ul class="regras-list">
        <li>Combine o tom antes de qualquer ficha existir. Investigação sombria e comédia de estrada usam as mesmas regras e produzem mesas completamente diferentes.</li>
        <li>Crie os personagens juntos, no mesmo dia. Um grupo que se conheceu na criação já começa com motivo para andar junto.</li>
        <li>Tenha à mão apenas três páginas: Condições, Ferimentos e esta. O resto você consulta quando aparecer.</li>
        <li>Abra a primeira cena com o grupo já em movimento. Taverna vazia é um começo caro em tempo de mesa.</li>
        <li>Anote o que os jogadores inventaram sobre o mundo. Metade da sua preparação da semana seguinte sai daí.</li>
      </ul>

      <h3 class="regras-subtitle">Quando pedir um teste</h3>
      <ul class="regras-list">
        <li>Peça quando existir risco, custo ou consequência. Sem nenhum dos três, deixe acontecer e siga.</li>
        <li>Se todos podem tentar e um sucesso resolve a cena, ou você sobe a DT, ou decide quem tem contexto para tentar. Do contrário, a rolagem vira só uma questão de quantas pessoas há na mesa.</li>
        <li>Falha nunca deve significar que a história para. Ela custa tempo, recurso, informação ou posição, e a cena continua.</li>
      </ul>

      <h3 class="regras-subtitle">Dificuldades de Teste</h3>
      <p class="regras-note">Para desafios de DT fixa, use 5, 10, 15, 20, 25, 30 e 40. Para ameaças que escalam com os personagens, use a tabela abaixo.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Dificuldade</th><th>DT</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td>Rotineira</td><td>10 + ⌊Nível ÷ 2⌋</td><td>Personagem preparado</td></tr>
          <tr><td>Padrão</td><td>15 + ⌊Nível ÷ 2⌋</td><td>Desafio relevante</td></tr>
          <tr><td>Difícil</td><td>20 + ⌊Nível ÷ 2⌋</td><td>Especialista esperado</td></tr>
          <tr><td>Extrema</td><td>25 + ⌊Nível ÷ 2⌋</td><td>Feito excepcional</td></tr>
        </tbody>
      </table></div>
      <p>Como referência de calibragem: contra a DT Padrão do próprio nível, um especialista Treinado acerta cerca de 65% das vezes, e o generalista sem treino fica perto de 40%. Difícil derruba o especialista para uns 40%; Extrema é feito que normalmente depende de ajuda ou preparação.</p>
      <p class="regras-note">A DT descreve a dificuldade da situação, não o resultado que você queria. Escolha antes de o jogador rolar; mudar depois de ver o dado é trapaça, mesmo quando é bem-intencionada.</p>

      <h3 class="regras-subtitle">Montar um encontro</h3>
      <ul class="regras-list">
        <li>Meça o dano real do grupo por rodada antes de decidir a Vida dos inimigos. Estimativa no papel erra bem mais que anotação de mesa.</li>
        <li>Um encontro padrão costuma aguentar cerca de quatro rodadas e meia de dano do grupo. Confronto curto usa três; chefe resistente, seis.</li>
        <li>Conte ações, não corpos. As ações inimigas por rodada devem ficar perto das ações relevantes do grupo, um pouco abaixo ou um pouco acima.</li>
        <li>Chefe sozinho precisa de reação, fase ou ação de cenário. Chefe que só tem Vida alta produz um combate longo e parado.</li>
        <li>Terreno, cobertura e objetivo existem para mudar decisão, não para conceder mais um bônus numérico.</li>
        <li>Nunca tire o turno inteiro de um jogador por mais de uma rodada seguida. Ficar olhando não é jogar.</li>
      </ul>

      <h3 class="regras-subtitle">Descanso e pressão</h3>
      <ul class="regras-list">
        <li>Descanso não falha porque você não quis. O custo vem do mundo continuar andando enquanto o grupo dorme.</li>
        <li>Use relógios visíveis: o inimigo se reposiciona, a pista esfria, o refém tem menos tempo. Anuncie antes da escolha, nunca depois.</li>
        <li>Planejamento eficiente merece ser recompensado. Se o grupo conquistou um lugar seguro, entregue o descanso bom.</li>
      </ul>

      <h3 class="regras-subtitle">Segredos</h3>
      <ul class="regras-list">
        <li>Informação necessária para usar uma mecânica nunca é segredo. O jogador precisa saber como a regra funciona para decidir.</li>
        <li>Identidade verdadeira, fraqueza escondida, origem de uma entidade e o preço de um pacto podem ficar guardados atrás de uma descoberta.</li>
        <li>Antes da descoberta, mostre o rótulo e uma descrição que não entregue a solução. Depois dela, entregue a informação inteira, sem parcelar.</li>
      </ul>

      <p class="regras-note">As tabelas numéricas completas de calibragem, orçamento de encontro, probabilidade por perfil e histórico de decisões editoriais ficam nas Notas Internas, logo abaixo desta página. Elas exigem uma campanha selecionada e são visíveis apenas para quem conduz a mesa.</p>
    `
  }
};
