
import {
  CATEGORIAS_MODIFICACAO,
  DONS_RARIDADE_POR_CATEGORIA,
  MODIFICACOES_EQUIPAMENTO,
  RARIDADES_EQUIPAMENTO,
  REGRAS_MODIFICACOES_EQUIPAMENTO,
} from './raridadesEquipamentos';

export interface RegraTopic {
  status: string;
  resumo: string;
  destaques: string[][];
  corpo: string;
  categoria?: 'Livro do Jogador' | 'Combate e Mecânicas' | 'Guia do Mestre';
}

export type RegrasCatalog = Record<string, RegraTopic>;


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

const ROTULO_NIVEL_MODIFICACAO = { comum: 'Comum', marcial: 'Marcial' } as const;
const ORDEM_NIVEL_MODIFICACAO = { comum: 0, marcial: 1 } as const;

const tabelaModificacoesEquipamento = CATEGORIAS_MODIFICACAO.map(({ id, titulo }) => `
  <h3 class="regras-subtitle">${titulo}</h3>
  <div class="regras-table-wrap"><table class="regras-table">
    <thead><tr><th>Modificação</th><th>Nível</th><th>Valor</th><th>Pré-requisito</th><th>Efeito</th></tr></thead>
    <tbody>
      ${MODIFICACOES_EQUIPAMENTO
        .filter((modificacao) => modificacao.categoria === id)
        .sort((a, b) => ORDEM_NIVEL_MODIFICACAO[a.nivel] - ORDEM_NIVEL_MODIFICACAO[b.nivel])
        .map((modificacao) => `
        <tr>
          <td><strong>${modificacao.titulo}</strong></td>
          <td>${ROTULO_NIVEL_MODIFICACAO[modificacao.nivel]}</td>
          <td>${modificacao.valor > 0 ? modificacao.valor : 'Técnica'}</td>
          <td>${modificacao.preRequisito || 'Nenhum'}</td>
          <td>${modificacao.efeito}</td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>
`).join('');

export const REGRAS_OFICIAIS: RegrasCatalog = {
  'sistema-base': {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'Como montar um personagem do zero: atributos, Vida, Mana e as contas que você vai usar pelo resto do jogo.',
    destaques: [
      ['Teste', 'd20 + bônus vs. DT'],
      ['Atributos', 'Padrão ou 24 pontos'],
      ['Níveis', '1–40 no total'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Criação de personagem</h3>
      <ol class="regras-steps">
        <li><strong>Distribua os atributos</strong> pelo conjunto padrão ou comprando por pontos. Os dois métodos estão logo abaixo e dão no mesmo total.</li>
        <li><strong>Escolha uma raça</strong> comum e, se ela pedir, a variante. É a raça que diz como seu corpo funciona e o que ele já sabe fazer sozinho.</li>
        <li><strong>Escolha seis perícias</strong> para começar em Aprendiz. Humano escolhe sete, por Adaptabilidade.</li>
        <li><strong>Escolha uma classe</strong> comum. É dela que vêm os ganhos de Vida e Mana de cada nível daqui pra frente.</li>
        <li><strong>Pegue</strong> um item comum e 20 Lunaris. É com isso que você começa.</li>
      </ol>
      <h3 class="regras-subtitle">Métodos de atributos</h3>
      <ul class="regras-list">
        <li><strong>Conjunto padrão:</strong> 15, 14, 13, 12, 10, 8 e 8, distribuídos como você quiser entre os sete atributos. Cada número é usado uma vez só.</li>
        <li><strong>Compra por pontos:</strong> os sete atributos começam em 8 e você distribui exatamente 24 pontos, na base de 1 ponto para cada +1. Nenhum atributo passa de 15 antes dos ajustes raciais.</li>
        <li><strong>Os dois dão no mesmo:</strong> o conjunto padrão também custa exatamente 24 pontos. A diferença é só que a compra deixa você especializar mais e ficar pior nos outros.</li>
      </ul>
      <p class="regras-note"><strong>Variante aleatória:</strong> role 7d20 e organize os sete resultados, cada dado usado uma vez. Isso <strong>não</strong> é equivalente aos dois métodos acima: sai personagem muito acima ou muito abaixo da média, e você só descobre qual depois de rolar. Combine com a mesa antes de usar.</p>

      <h3 class="regras-subtitle">Fórmulas fundamentais</h3>
      <dl class="regras-kv regras-kv--boxed">
        <dt>Modificador</dt><dd>⌊(Atributo − 10) ÷ 2⌋</dd>
        <dt>Teste</dt><dd>d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau</dd>
        <dt>Vida no nível 1</dt><dd>máx. 1, (4 × Mod.Constituição) + Vida da classe</dd>
        <dt>Vida por nível posterior</dt><dd>ganho de Vida da classe do nível adquirido, mínimo 1</dd>
        <dt>Mana no nível 1</dt><dd>máx. 1, (3 × Mod.Sabedoria) + Mana da classe</dd>
        <dt>Mana por nível posterior</dt><dd>ganho de Mana da classe do nível adquirido, mínimo 1</dd>
        <dt>Ajustes raciais</dt><dd>bônus raciais de Vida e Mana são somados depois do cálculo correspondente</dd>
        <dt>Defesa Natural</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + equipamento</dd>
        <dt>Movimento</dt><dd>9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m</dd>
        <dt>Iniciativa</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus</dd>
      </dl>

      <h3 class="regras-subtitle">Nível e multiclasse</h3>
      <ul class="regras-list">
        <li><strong>Nível total</strong> é a soma dos níveis de todas as suas classes, incluindo as especiais.</li>
        <li>Cada classe vai até o <strong>nível 20</strong>. Só com classes comuns, o teto é <strong>40 níveis totais</strong>; com uma classe especial, sobe para <strong>60</strong>.</li>
        <li>Você pode ter no máximo <strong>duas classes comuns e uma especial</strong>.</li>
        <li>Dá para intercalar os níveis à vontade. Mas para levar uma classe até o 20 você precisa ter pelo menos nível 10 em outra. Ninguém chega ao topo sem ter feito outra coisa no caminho.</li>
        <li>Classe especial exige nível total 15 e um acontecimento na história que justifique, a não ser que a própria classe abra exceção.</li>
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
    `,
  },

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
        <li><strong>Ação Livre:</strong> um gesto ou uma frase curta. Se começar a virar vantagem mecânica repetida, o Mestre corta.</li>
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
      <p class="regras-note">Na prática: sair do nível N e chegar ao N+1 custa N × 1.000 XP.</p>

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
  },

  legados: {
    categoria: 'Livro do Jogador',
    status: 'Regra oficial',
    resumo: 'A cada cinco níveis totais você escolhe um Legado. É escolha permanente, e a ficha confere os pré-requisitos na hora.',
    destaques: [
      ['Catálogo', '42 Legados'],
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
    `,
  },

  equipamentos: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Quanto você carrega, o que dá para vestir junto, como a Resistência entra na conta do dano e até onde cada raridade pode ir.',
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

      <h3 class="regras-subtitle">Raridades e orçamento de poder</h3>
      <p class="regras-lead">Raridade não é um bônus fixo que todo item da mesma faixa recebe. Ela é um <strong>orçamento</strong>: diz quantas modificações, efeitos automáticos e dons aquele objeto aguenta carregar. É o que impede a ficha de virar uma pilha de +1 sem fim.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Raridade</th><th>Mods.</th><th>Efeitos próprios</th><th>Valor por efeito</th><th>Regra</th></tr></thead>
        <tbody>${tabelaRaridadesEquipamento}</tbody>
      </table></div>
      <h3 class="regras-subtitle">Modificações e efeitos na ficha</h3>
      <ul class="regras-list">${REGRAS_MODIFICACOES_EQUIPAMENTO.map((regra) => `<li>${regra}</li>`).join('')}</ul>
      <p class="regras-note">Na prática: uma modificação pode dar Vida máxima, Defesa, Ataque, atributo ou bônus numa perícia. Guardou ou desequipou o item, a ficha tira esses valores sozinha, você não precisa lembrar.</p>

      <h3 class="regras-subtitle">Catálogo de modificações</h3>
      <p class="regras-lead">Lista pronta, para ninguém precisar inventar do zero. Toda modificação cai em um de dois níveis. <strong>Comum</strong> entra em qualquer item. <strong>Marcial</strong> bate mais forte e só entra em arma marcial ou exótica, armadura pesada e item Raro ou melhor.</p>
      <ul class="regras-list">
        <li><strong>Valor:</strong> o peso do efeito automático. Compare com a coluna "Valor por efeito" da tabela ali em cima para saber de qual raridade o item precisa ser.</li>
        <li><strong>Técnica:</strong> não tem efeito automático. Ocupa espaço de modificação, mas não gasta o orçamento de efeito da raridade.</li>
        <li><strong>Pré-requisito:</strong> cobra de <em>quem usa</em>, não do item. Perdeu o requisito, a modificação desliga até você cumprir de novo.</li>
      </ul>
      ${tabelaModificacoesEquipamento}
      <p class="regras-note">Isso aqui é ponto de partida, não lista fechada. Modificação nova passa, desde que respeite o valor máximo por efeito da raridade e o nível condizente com o equipamento.</p>

      <h3 class="regras-subtitle">Dons definidos por categoria</h3>
      <p>Além dos números, cada raridade se manifesta de um jeito que combina com a categoria do item. O texto do item pode dar personalidade a essa manifestação, desde que não aumente o efeito mecânico.</p>
      ${donsRaridadeEquipamento}
    `,
  },

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
        <tbody>
          <tr><td>1º</td><td>14</td><td>10</td><td>2</td></tr>
          <tr><td>2º</td><td>18</td><td>13</td><td>4</td></tr>
          <tr><td>3º</td><td>22</td><td>16</td><td>6</td></tr>
          <tr><td>4º</td><td>26</td><td>19</td><td>8</td></tr>
          <tr><td>5º</td><td>30</td><td>22</td><td>10</td></tr>
          <tr><td>6º</td><td>34</td><td>25</td><td>13</td></tr>
          <tr><td>7º</td><td>38</td><td>28</td><td>16</td></tr>
          <tr><td>8º</td><td>42</td><td>31</td><td>20</td></tr>
          <tr><td>9º</td><td>46</td><td>34</td><td>25</td></tr>
          <tr><td>10º</td><td>50</td><td>37</td><td>30</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Esses custos são a referência do círculo. Cada entrada do catálogo declara o custo final dela, que é o que vale na mesa.</p>

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
  },

  condicoes: {
    categoria: 'Combate e Mecânicas',
    status: 'Regra oficial',
    resumo: 'Sanidade, crises e as condições que ficam grudadas no personagem, cada uma com o que faz e como sai.',
    destaques: [
      ['Sanidade', '0–100'],
      ['Iniciativa', 'valor estático'],
      ['Defesa passiva', '10 + bônus'],
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
        <li>Em Ruptura, cada nova perda cobra Vontade DT 15. Falhou, vem Pânico, Dissociação, Paranoia, Catatonia, Compulsão ou Fúria.</li>
        <li>Pânico, Dissociação, Catatonia e Fúria duram 1d4 rodadas, com Vontade DT 15 no fim do turno para sair antes.</li>
        <li>Paranoia vai até o fim da cena. Compulsão dá Vontade DT 15 no começo do turno para você agir normalmente.</li>
        <li>Em Sanidade 0 a crise é imediata, sem teste. Passada a cena, o personagem continua em 0 até descansar e ser tratado em segurança.</li>
        <li>A condição permanente da Quebra é definida junto com o jogador, e só muda por resolução na história ou tratamento longo.</li>
      </ul>

      <h3 class="regras-subtitle">Condições gerais</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Condição</th><th>Efeito principal</th><th>Remoção</th></tr></thead>
        <tbody>
          <tr><td>Amedrontado</td><td>Desvantagem contra a fonte e não se aproxima dela.</td><td>Vontade contra a DT da fonte no fim do turno.</td></tr>
          <tr><td>Exposto</td><td>-2 Defesa.</td><td>Começo do próximo turno.</td></tr>
          <tr><td>Caído</td><td>-2 em ataques; ataques corpo a corpo contra você recebem +2.</td><td>Ação de movimento para levantar.</td></tr>
          <tr><td>Sangramento</td><td>1d6 de dano no fim do turno; aplicações extras dão +1, até +5.</td><td>Cura DT 15 ou recuperar pelo menos 1 PV.</td></tr>
          <tr><td>Atordoado</td><td>Sem ações ou reações e -5 Defesa.</td><td>Fim da duração.</td></tr>
          <tr><td>Concentrando</td><td>Mantém um efeito; dano exige Vontade DT 10 ou metade do dano.</td><td>Falha no teste, incapacidade ou encerramento voluntário.</td></tr>
        </tbody>
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
  },

  classes: {
    categoria: 'Livro do Jogador',
    status: 'Catálogo oficial',
    resumo: 'Classe comum serve a qualquer Árvore. Classe especial é mais forte, só aparece nas Árvores indicadas e depende do Mestre liberar.',
    destaques: [
      ['Classes', '27 catalogadas'],
      ['Comuns / especiais', '16 / 11'],
      ['Progressões completas', '27']
    ],
    corpo: `<!-- CLASSES_DATA -->`
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
    corpo: `<!-- RACAS_DATA -->`
  },

  mestre: {
    categoria: 'Guia do Mestre',
    status: 'Somente Mestre',
    resumo: 'Ferramentas de quem conduz a mesa: dificuldades, criação de NPC, tabela de XP e tesouros.',
    destaques: [
      ['Acesso', 'Apenas Mestre']
    ],
    corpo: `
      <p class="regras-lead">Daqui para baixo é só para quem conduz a mesa.</p>
      <h3 class="regras-subtitle">Dificuldades de Teste</h3>
      <p class="regras-note">Para desafios que não dependem do nível de ninguém, use 5, 10, 15, 20, 25, 30 e 40. Para ameaças que crescem junto com os personagens, use a tabela abaixo.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Dificuldade</th><th>DT</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td>Rotineira</td><td>10 + ⌊Nível ÷ 2⌋</td><td>Personagem preparado</td></tr>
          <tr><td>Padrão</td><td>15 + ⌊Nível ÷ 2⌋</td><td>Desafio relevante</td></tr>
          <tr><td>Difícil</td><td>20 + ⌊Nível ÷ 2⌋</td><td>Especialista esperado</td></tr>
          <tr><td>Extrema</td><td>25 + ⌊Nível ÷ 2⌋</td><td>Feito excepcional</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">A DT descreve a dificuldade da situação. Escolha antes de o jogador rolar; mudar depois de ver o dado é trapaça, mesmo quando é bem-intencionada.</p>
      <div class="regras-formula">Em construção: tabelas de encontros, armadilhas e recompensas do mestre.</div>
    `
  }
};
