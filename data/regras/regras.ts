
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
    `
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
    `
  },

  bestiario: {
    categoria: 'Guia do Mestre',
    status: 'Regra oficial',
    resumo: 'Catálogo de seres, familiares, servos, invocações e preços por fórmula.',
    destaques: [
      ['Tipos', 'Criaturas, Servos, etc.'],
      ['Preços', 'Calculados por nível'],
    ],
    corpo: `
      <p class="regras-lead">Bestiário: preços por FÓRMULA (faixa de nível × traços), não lista fixa. Para vender ou contratar uma criatura específica, o mestre cria uma entrada do tipo 'monstro' com o preço calculado por essas tabelas.</p>

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
    `
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
      <h3 class="regras-subtitle">Moedas Correntes</h3>
      <ul class="regras-sublist regras-sublist--grid">
        <li><strong>Lunaris (☾):</strong> A moeda base. Cristalizada a partir da luz pálida, é usada nas transações comuns.</li>
        <li><strong>Solares (☉):</strong> Moeda de alto valor. Brilhante e quente ao toque.</li>
        <li><strong>Fragmentos de Estrela (✧):</strong> Moeda rara, utilizada para transações de nível celestial ou itens muito exóticos.</li>
        <li><strong>Créditos Sombrios (♆):</strong> Moeda do submundo, usada no mercado negro e para fins escusos.</li>
      </ul>

      <h3 class="regras-subtitle">Taxas de Câmbio</h3>
      <p class="regras-note">O Banqueiro realiza a conversão das moedas no Discord (valores sujeitos a taxas do sistema).</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Moeda Origem</th><th>Moeda Destino</th><th>Taxa Padrão</th></tr></thead>
        <tbody>
          <tr><td>100 Lunaris</td><td>1 Solar</td><td>100:1</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Essa taxa serve para o dia a dia - trocar Lunaris por Solares (ou o contrário) numa transação comum. Ela não torna categorias inteiras de item comparáveis entre si: um veículo precificado em Lunaris e uma arma lendária precificada em Solares seguem economias próprias, cada uma pensada pro ritmo da sua categoria, não uma equivalência de valor de jogo.</p>
      <p class="regras-note">Fragmentos de Estrela e Créditos Sombrios não têm câmbio automático com nenhuma outra moeda. São obtidos por fonte própria - relíquias e artefatos concedidos pelo Mestre, mercado negro, ou outra origem narrativa - nunca só acumulando e convertendo Lunaris ou Solares.</p>

      <h3 class="regras-subtitle">O Cofre Bancário</h3>
      <p class="regras-lead">O Banco gerido pelo Banqueiro reúne depósito, reputação e segurança.</p>
      <ul class="regras-list">
        <li><strong>Reputação Bancária:</strong> Ao depositar com frequência e participar da economia, você ganha reputação que destrava novos níveis de cofre.</li>
        <li><strong>Espaço e Limites:</strong> O cofre possui níveis (tiers) que definem a capacidade máxima de itens e a quantidade de saldo de cada moeda que pode ser guardada. No nível máximo, esse limite se torna ilimitado.</li>
        <li><strong>Segurança:</strong> O seu cofre pode ser alvo de roubos (eventos do bot). Evoluir a segurança do cofre aumenta a porcentagem de chance de frustrar essas tentativas.</li>
        <li><strong>Transferências:</strong> Através da página do Cofre, você pode sacar suas economias diretamente para a ficha do seu personagem quando necessário.</li>
      </ul>
    `
  },

  bases: REGRA_BASES,

  'mundo-faccoes': REGRA_MUNDO_FACCOES,

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
      <p class="regras-note">A DT descreve a dificuldade da situação. Escolha antes de o jogador rolar; mudar depois de ver o dado é trapaça, mesmo quando é bem-intencionada.</p>
      <div class="regras-formula">Em construção: tabelas de encontros, armadilhas e recompensas do mestre.</div>
    `
  }
};
