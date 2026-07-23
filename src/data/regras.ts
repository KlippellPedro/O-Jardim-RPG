
export interface RegraTopic {
  status: string;
  resumo: string;
  destaques: string[][];
  corpo: string;
}

export type RegrasCatalog = Record<string, RegraTopic>;


export const RECOMPENSAS_CLASSE: Record<number, string> = {
  1: 'Habilidade Inicial',
  2: 'Habilidade de Classe',
  3: 'Grau de Treinamento',
  4: 'Habilidade de Classe',
  5: 'Habilidade de Classe',
  6: 'Grau de Treinamento',
  7: 'Habilidade de Classe',
  8: 'Habilidade de Classe',
  9: 'Grau de Treinamento',
  10: 'Habilidade de Classe',
  11: 'Habilidade de Classe',
  12: 'Grau de Treinamento',
  13: 'Habilidade de Classe',
  14: 'Habilidade de Classe',
  15: 'Grau de Treinamento',
  16: 'Habilidade de Classe',
  17: 'Habilidade de Classe',
  18: 'Grau de Treinamento',
  19: 'Habilidade de Classe',
  20: 'Habilidade de Classe (Ápice)'
};


function formatarXP(valor: number) {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

const tabelaXP = Array.from({ length: 40 }, (_, indice) => {
  const nivel = indice + 1;
  const xp = 500 * nivel * (nivel - 1);
  return `<span><strong>N${nivel}</strong>${formatarXP(xp)} XP</span>`;
}).join('');

const tabelaClasses = Array.from({ length: 10 }, (_, indice) => {
  const primeiro = indice + 1;
  const segundo = primeiro + 10;
  return `<tr><td>${primeiro}</td><td>${RECOMPENSAS_CLASSE[primeiro]}</td><td>${segundo}</td><td>${RECOMPENSAS_CLASSE[segundo]}</td></tr>`;
}).join('');

export const REGRAS_OFICIAIS: RegrasCatalog = {
  'sistema-base': {
    status: 'Regra oficial',
    resumo: 'Criação de personagem, atributos, Mana e as fórmulas centrais da versão 1.0.',
    destaques: [
      ['Teste', 'd20 + bônus vs. DT'],
      ['Atributos', '15, 14, 13, 12, 10, 8, 7'],
      ['Níveis', '1–40 no total'],
    ],
    corpo: `
      <p class="regras-lead">Quando uma ação tiver risco real, role um d20, some o bônus relevante e compare com a Dificuldade do Teste. Resultado igual ou maior que a DT é sucesso.</p>

      <h3 class="regras-subtitle">Criação de personagem</h3>
      <ol class="regras-steps">
        <li><strong>Distribua</strong> 15, 14, 13, 12, 10, 8 e 7 entre Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma e Fluxo.</li>
        <li><strong>Escolha</strong> uma raça comum e, quando exigido, sua variante. Ela define ajustes iniciais, fisiologia e características.</li>
        <li><strong>Escolha</strong> seis perícias para começar em Aprendiz. Humanos escolhem sete por Adaptabilidade.</li>
        <li><strong>Escolha</strong> uma classe comum. Ela define os ganhos de Vida e Mana dos níveis posteriores.</li>
        <li><strong>Receba</strong> um item comum e 20 Lunaris.</li>
      </ol>
      <p class="regras-note">Rolar 7d20 e distribuir os resultados é uma variante opcional do mestre. Ela produz personagens muito desiguais e não é usada pela regra padrão.</p>

      <h3 class="regras-subtitle">Fórmulas fundamentais</h3>
      <dl class="regras-kv regras-kv--boxed">
        <dt>Modificador</dt><dd>⌊(Atributo − 10) ÷ 2⌋</dd>
        <dt>Teste</dt><dd>d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau</dd>
        <dt>Vida inicial</dt><dd>máx. 1, 10 + (2 × Mod.Força) + (2 × Mod.Constituição) + ajuste da raça</dd>
        <dt>Vida por nível</dt><dd>ganho da classe + Mod.Constituição, mínimo 1</dd>
        <dt>Mana inicial</dt><dd>máx. 1, 6 + (2 × Mod.Inteligência) + Mod.Sabedoria + ajuste da raça</dd>
        <dt>Mana por nível</dt><dd>ganho de Mana da classe, mínimo 1</dd>
        <dt>Defesa Natural</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + equipamento</dd>
        <dt>Movimento</dt><dd>9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m</dd>
        <dt>Iniciativa</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus</dd>
      </dl>

      <h3 class="regras-subtitle">Nível e multiclasse</h3>
      <ul class="regras-list">
        <li><strong>Nível total</strong> é a soma dos níveis de todas as classes, inclusive especiais.</li>
        <li>Cada classe possui no máximo <strong>20 níveis</strong>; o personagem possui no máximo <strong>40 níveis totais</strong>.</li>
        <li>O limite é de <strong>duas classes comuns e uma classe especial</strong>.</li>
        <li>Depois de alcançar nível 20 em uma classe, escolha outra classe para continuar aumentando o nível total.</li>
        <li>Classes especiais exigem nível total 15 e um acontecimento narrativo, salvo exceção declarada pela própria classe.</li>
        <li>Classes gerais podem ser obtidas em qualquer Árvore; classes exclusivas exigem que o personagem pertença à Árvore indicada.</li>
      </ul>

      <h3 class="regras-subtitle">Maestria de atributo</h3>
      <p class="regras-note">Ao alcançar valor 20 sem itens, pactos ou efeitos temporários, receba a maestria correspondente. Intervenções externas podem elevar o atributo acima de 20, mas não concedem outra maestria. Entre os pacotes raciais publicados, somente Intelecto Élfico pode ultrapassar esse limite: +4 em Inteligência, até o máximo 24. Essa permissão não se aplica a outros atributos.</p>
      <ul class="regras-sublist regras-sublist--grid">
        <li><strong>Força</strong> — uma vez por turno, +2 no dano de um ataque corpo a corpo.</li>
        <li><strong>Destreza</strong> — +1 na Defesa Natural ou +1,5 m de movimento.</li>
        <li><strong>Constituição</strong> — você morre em Morrendo 4, em vez de Morrendo 3.</li>
        <li><strong>Inteligência</strong> — torne-se Aprendiz em duas perícias.</li>
        <li><strong>Sabedoria</strong> — reduza em 2 a primeira perda de Sanidade de cada cena.</li>
        <li><strong>Carisma</strong> — uma vez por cena, repita um teste social; mantenha o novo resultado.</li>
      </ul>

      <h3 class="regras-subtitle">Fluxo</h3>
      <p class="regras-note"><strong>Fluxo</strong> é o sétimo atributo — mede conexão e capacidade de canalização de Fluxos. Já entra na distribuição inicial e sobe como os demais, mas sua fórmula de uso em jogo e a maestria em 20 permanecem Em desenvolvimento junto do sistema de magia.</p>
    `,
  },

  pericias: {
    status: 'Regra oficial',
    resumo: 'Uma única fórmula para perícias, ataques e resistências, com DTs que acompanham o nível.',
    destaques: [
      ['Base', 'd20 + atributo + nível/2 + grau'],
      ['Graus', '7 estágios'],
      ['Crítico', 'margem de 10'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Fórmula de teste</h3>
      <div class="regras-formula">d20 + Mod. de Atributo + ⌊Nível total ÷ 2⌋ + bônus do Grau</div>
      <p class="regras-note">Luta e Pontaria usam a mesma fórmula. Fortitude, Reflexos e Vontade são perícias e também fornecem as respectivas Defesas passivas.</p>

      <h3 class="regras-subtitle">Graus de perícia</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Grau</th><th>Bônus</th><th>Nível mínimo sugerido</th></tr></thead>
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

      <h3 class="regras-subtitle">Dificuldades de Teste</h3>
      <p class="regras-note">Para desafios sem nível, use 5, 10, 15, 20, 25, 30 e 40. Para ameaças que evoluem junto dos personagens, use a tabela abaixo.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Dificuldade</th><th>DT</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td>Rotineira</td><td>10 + ⌊Nível ÷ 2⌋</td><td>Personagem preparado</td></tr>
          <tr><td>Padrão</td><td>15 + ⌊Nível ÷ 2⌋</td><td>Desafio relevante</td></tr>
          <tr><td>Difícil</td><td>20 + ⌊Nível ÷ 2⌋</td><td>Especialista esperado</td></tr>
          <tr><td>Extrema</td><td>25 + ⌊Nível ÷ 2⌋</td><td>Feito excepcional</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Graus de resultado</h3>
      <ul class="regras-list">
        <li><strong>Sucesso crítico</strong> — resultado igual ou superior à DT + 10.</li>
        <li><strong>Sucesso</strong> — resultado igual ou superior à DT.</li>
        <li><strong>Falha</strong> — resultado abaixo da DT.</li>
        <li><strong>Falha crítica</strong> — resultado igual ou inferior à DT − 10.</li>
        <li>Um 20 natural melhora o resultado em um grau; um 1 natural piora em um grau.</li>
      </ul>

      <h3 class="regras-subtitle">Vantagem e desvantagem</h3>
      <ul class="regras-list">
        <li>Role dois d20 e use o maior com vantagem ou o menor com desvantagem.</li>
        <li>Registre cada fonte de vantagem e desvantagem; elas se anulam uma a uma.</li>
        <li>Depois da anulação, qualquer saldo positivo concede uma vantagem e qualquer saldo negativo impõe uma desvantagem.</li>
        <li>O tamanho do saldo não acrescenta mais dados: ele registra quantas fontes ainda sustentam a condição.</li>
      </ul>
    `,
  },

  acoes: {
    status: 'Regra oficial',
    resumo: 'Economia de ações curta e reações com gatilhos claros, evitando ataques extras gratuitos todo turno.',
    destaques: [
      ['Turno', '1 padrão + 1 movimento'],
      ['Rodada', '1 reação'],
      ['Ataque', 'Luta/Pontaria vs. Defesa'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Seu turno</h3>
      <ul class="regras-list">
        <li><strong>Ação Padrão</strong> — atacar, usar habilidade, prestar auxílio ou realizar uma manobra.</li>
        <li><strong>Ação de Movimento</strong> — deslocar-se, levantar, sacar ou manipular um objeto relevante.</li>
        <li><strong>Ação Livre</strong> — gesto ou fala breve. O mestre limita repetições que tenham impacto mecânico.</li>
        <li>Você pode converter sua Ação Padrão em uma segunda Ação de Movimento.</li>
      </ul>

      <h3 class="regras-subtitle">Ataques e cobertura</h3>
      <div class="regras-formula">d20 + Luta ou Pontaria contra a Defesa Natural</div>
      <ul class="regras-list">
        <li>Igualar a Defesa acerta. Superá-la por 10 gera sucesso crítico.</li>
        <li>Em um crítico, dobre apenas os dados de dano; bônus fixos são somados uma vez.</li>
        <li>Cobertura parcial concede +2 de Defesa; cobertura superior concede +5.</li>
      </ul>

      <h3 class="regras-subtitle">Reações</h3>
      <p class="regras-note">Você recupera sua reação no início do próprio turno. Defesa Natural não gasta reação.</p>
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
        <li><strong>Físicos</strong> — corte, perfuração, impacto e balístico.</li>
        <li><strong>Persistentes</strong> — sangramento, fogo e veneno; causam dano no fim do turno até serem removidos.</li>
        <li><strong>Energia</strong> — elemental, Arkania, tecnologia e Fluxos.</li>
        <li><strong>Mental</strong> — afeta Sanidade ou Vida conforme a fonte.</li>
      </ul>
    `,
  },

  distancias: {
    status: 'Regra oficial',
    resumo: 'Faixas mantidas, agora com regra de alcance e conversão clara para mapas.',
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
        <li>Dentro do alcance indicado, ataque normalmente.</li>
        <li>Uma faixa além do alcance impõe −5 no ataque; duas faixas impõem −10.</li>
        <li>Acima de duas faixas, o alvo não pode ser atingido sem habilidade ou item específico.</li>
        <li>Em mapa tático, arredonde deslocamentos para múltiplos de 1,5 m.</li>
      </ul>
    `,
  },

  ferimentos: {
    status: 'Regra oficial',
    resumo: 'Vida negativa torna cada queda diferente, enquanto Morrendo dá tempo para decisões de resgate.',
    destaques: [
      ['Queda', '0 PV ou menos'],
      ['Morte', 'Morrendo 3'],
      ['DT', '12 + Gravidade × 2 + Ferido'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Vida negativa</h3>
      <ul class="regras-list">
        <li>Continue registrando o dano abaixo de 0. Esse valor é o <strong>Déficit de Vida</strong>.</li>
        <li>A cura primeiro reduz o Déficit. O personagem só desperta quando voltar a 1 PV ou mais.</li>
        <li>Se o Déficit alcançar a Vida máxima do personagem, ele morre imediatamente.</li>
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
        <li>Ao chegar a 0 PV ou menos, fique inconsciente e receba <strong>Morrendo 1</strong>.</li>
        <li>No fim de cada turno, faça Fortitude contra <strong>DT 12 + (2 × Gravidade) + Ferido</strong>.</li>
        <li>Sucesso mantém Morrendo; sucesso crítico reduz em 1; falha aumenta em 1; falha crítica aumenta em 2.</li>
        <li>Em Morrendo 3, você morre. A maestria de Constituição aumenta o limite para Morrendo 4.</li>
      </ol>
      <p class="regras-note">Um teste de Cura usa a mesma DT. Sucesso estabiliza o alvo, impedindo novos testes de Morrendo, mas somente cura suficiente para chegar a 1 PV devolve a consciência. Ao despertar, aumente Ferido em 1.</p>

      <h3 class="regras-subtitle">Quando rolar ferimento crítico</h3>
      <ul class="regras-list">
        <li>Quando um único golpe causar dano igual ou superior à metade dos seus PV máximos.</li>
        <li>Quando você obtiver falha crítica em um teste de Morrendo.</li>
        <li>Role apenas uma vez por fonte de dano, mesmo que os dois gatilhos aconteçam.</li>
      </ul>

      <h3 class="regras-subtitle">Tabela de trauma — 2d6</h3>
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
    status: 'Regra oficial',
    resumo: 'Risco escolhido antes do dado, recompensa limitada e consequências que criam cena em vez de encerrar o combate.',
    destaques: [
      ['Uso', '1 vez por turno'],
      ['Declaração', 'antes da rolagem'],
      ['Tudo ou Nada', '1 vez por cena'],
    ],
    corpo: `
      <p class="regras-lead">Em um confronto direto, descreva uma ação cinematográfica possível e escolha o risco antes de rolar. A descrição precisa mudar a ficção; não basta declarar o bônus.</p>

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
      <p class="regras-note">O mestre pode limitar uma Coreografia que não altere a ficção ou que repita a mesma descrição apenas para buscar o bônus.</p>
    `,
  },

  descanso: {
    status: 'Regra oficial',
    resumo: 'Recuperação percentual que continua útil em todos os níveis e uma trilha de Cansaço sem frações.',
    destaques: [
      ['Descanso', '8 horas'],
      ['Relaxar', '1 hora, 1 vez'],
      ['Cansaço', '0–6'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Descanso completo</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Qualidade</th><th>PV e Mana recuperados</th><th>Reduz Cansaço</th></tr></thead>
        <tbody>
          <tr><td>Péssima</td><td>10% do máximo</td><td>1</td></tr>
          <tr><td>Ruim</td><td>25% do máximo</td><td>2</td></tr>
          <tr><td>Boa</td><td>50% do máximo</td><td>3</td></tr>
          <tr><td>Maravilhosa</td><td>75% do máximo</td><td>4</td></tr>
          <tr><td>Excelente</td><td>100% do máximo</td><td>todo o Cansaço</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Relaxar</h3>
      <div class="regras-formula">Recupere 1d6 + Mod.Sabedoria + ⌊Nível ÷ 4⌋ de Mana</div>
      <ul class="regras-list">
        <li>Exige uma hora em segurança relativa e só funciona uma vez entre descansos completos.</li>
        <li>Uma atividade pessoal significativa pode recuperar também 1 ponto de Cansaço, a critério do mestre.</li>
      </ul>

      <h3 class="regras-subtitle">Cansaço</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Efeito</th></tr></thead>
        <tbody>
          <tr><td>0 — Disposto</td><td>Sem penalidade.</td></tr>
          <tr><td>1 — Cansado</td><td>−1 em testes físicos.</td></tr>
          <tr><td>2 — Fatigado</td><td>−2 em testes físicos e −1 Iniciativa.</td></tr>
          <tr><td>3 — Esgotado</td><td>−2 em todos os testes.</td></tr>
          <tr><td>4 — Exausto</td><td>Desvantagem em testes físicos; não pode treinar.</td></tr>
          <tr><td>5 — Debilitado</td><td>Movimento pela metade e sem reações.</td></tr>
          <tr><td>6 — Colapso</td><td>Inconsciente até reduzir Cansaço.</td></tr>
        </tbody>
      </table></div>
      <p class="regras-note">Combate intenso, seis horas de treino ou uma noite sem dormir geram Cansaço. Use apenas valores inteiros.</p>
    `,
  },

  treinar: {
    status: 'Regra oficial',
    resumo: 'Treino exige tempo e um Grau de Treinamento; dinheiro ou dias livres não compram sozinhos o maior bônus do jogo.',
    destaques: [
      ['Dia de treino', '6 horas'],
      ['Recurso', 'Grau de Treinamento'],
      ['Maior grau', 'Renomado'],
    ],
    corpo: `
      <p class="regras-lead">Para subir uma perícia em um grau, você precisa receber um Grau de Treinamento pela tabela de classe ou por uma recompensa explícita e cumprir o treinamento. O tempo sozinho nunca concede o avanço.</p>

      <h3 class="regras-subtitle">Progressão</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Avanço</th><th>Tempo</th><th>Requisito</th></tr></thead>
        <tbody>
          <tr><td>Iniciante → Aprendiz</td><td>3 dias</td><td>1 Grau de Treinamento; nível 1</td></tr>
          <tr><td>Aprendiz → Treinado</td><td>7 dias</td><td>1 Grau de Treinamento; nível 3</td></tr>
          <tr><td>Treinado → Especialista</td><td>14 dias</td><td>1 Grau de Treinamento; nível 7</td></tr>
          <tr><td>Especialista → Mestre</td><td>21 dias</td><td>1 Grau de Treinamento; nível 13 e instrutor</td></tr>
          <tr><td>Mestre → Veterano</td><td>32 dias</td><td>1 Grau de Treinamento; nível 19 e feito notável</td></tr>
          <tr><td>Veterano → Renomado</td><td>62 dias</td><td>1 Grau de Treinamento; nível 29, feito e item especial</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Regras de treinamento</h3>
      <ul class="regras-list">
        <li>Cada dia exige seis horas e gera 1 Cansaço ao final; descansar normalmente pode removê-lo.</li>
        <li>Um instrutor de grau superior reduz o tempo em 20%, arredondado para cima.</li>
        <li>Interrupções não apagam progresso, mas mais de 30 dias parado exigem um dia de revisão.</li>
        <li>Treinamento não exige rolagens repetidas; o custo já é tempo, oportunidade e recurso de progressão.</li>
      </ul>
    `,
  },

  xp: {
    status: 'Regra oficial',
    resumo: 'Uma progressão global para todos os personagens e um único modelo usado por todas as classes.',
    destaques: [
      ['Níveis', '1–40'],
      ['Legado', 'a cada 5 níveis'],
      ['Atributo', '+1 a cada 4 níveis'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Progressão do nível total</h3>
      <p class="regras-lead">Sempre que subir de nível, escolha uma de suas classes e aumente o nível dela em 1. As recompensas abaixo usam o nível total e nunca se repetem por multiclasse.</p>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Níveis totais</th><th>Recompensa global</th></tr></thead>
        <tbody>
          <tr><td>Todos os níveis</td><td>+1 nível em uma classe escolhida</td></tr>
          <tr><td>4, 8, 12, 16, 20, 24, 28, 32, 36 e 40</td><td>+1 em um atributo, respeitando o limite natural 20</td></tr>
          <tr><td>5, 10, 15, 20, 25, 30, 35 e 40</td><td>1 Legado de Ascensão</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Progressão universal de classe</h3>
      <p class="regras-note">Esta é a tabela que representa todas as classes do nível 1 ao 20. As Habilidades específicas permanecem sem efeito publicado nesta versão; a tabela serve para reservar os espaços e organizar o teste da ficha.</p>
      <div class="regras-table-wrap"><table class="regras-table regras-table--progression">
        <thead><tr><th>Nível da classe</th><th>Recompensa</th><th>Nível da classe</th><th>Recompensa</th></tr></thead>
        <tbody>${tabelaClasses}</tbody>
      </table></div>

      <h3 class="regras-subtitle">Especialização e multiclasse</h3>
      <ul class="regras-list">
        <li>Uma classe pode chegar ao nível 20 sem que o personagem possua outra classe.</li>
        <li>Para aumentar o nível total depois disso, invista em outra classe.</li>
        <li>Classes especiais exigem nível total 15, consomem nível normalmente e não contam no limite de duas classes comuns.</li>
        <li>Categoria e disponibilidade são independentes: Viajante é especial e geral; as outras classes especiais são exclusivas de uma Árvore.</li>
        <li>Ao entrar em uma nova classe, você não recebe novamente equipamento, dinheiro ou outros benefícios de criação.</li>
      </ul>

      <h3 class="regras-subtitle">Fórmula de progressão</h3>
      <div class="regras-formula">XP total do nível N = 500 × N × (N − 1)</div>
      <p class="regras-note">O custo para passar do nível N ao N+1 é N × 1.000 XP. A tabela antiga desviava 1.000 XP a partir do nível 24.</p>

      <h3 class="regras-subtitle">Tabela completa</h3>
      <div class="regras-xp-grid regras-xp-grid--revised">${tabelaXP}</div>

      <h3 class="regras-subtitle">Recompensas por marco</h3>
      <ul class="regras-list">
        <li><strong>Descoberta ou objetivo menor</strong> — 10% do próximo nível.</li>
        <li><strong>Missão relevante</strong> — 25% do próximo nível.</li>
        <li><strong>Fim de arco</strong> — 50% do próximo nível.</li>
        <li>Divida XP de combate pelo grupo; XP de descoberta e arco é concedido igualmente.</li>
      </ul>
    `,
  },

  'magia-fluxo': {
    status: 'Em desenvolvimento',
    resumo: 'O vocabulário está definido, mas círculos, conjuração e efeitos ainda serão balanceados em uma etapa própria.',
    destaques: [
      ['Reserva', 'Mana'],
      ['Conexão', 'Fluxo'],
      ['Publicação', 'pendente'],
    ],
    corpo: `
      <h3 class="regras-subtitle">O que já está definido</h3>
      <ul class="regras-list">
        <li><strong>Mana</strong> é a reserva gasta para ativar poderes, técnicas e futuramente magias.</li>
        <li><strong>Fluxo</strong> é o sétimo atributo — mede conexão e capacidade de canalização de Fluxos, e já recebe um valor na distribuição inicial junto dos outros seis (revisado em 2026-07-12).</li>
        <li>O uso mecânico de Fluxo em jogo (o que ele afeta além de existir na ficha) ainda está Em desenvolvimento.</li>
        <li>Cada Fluxo (do mundo — Sangue, Tecnologia, etc.) terá identidade, efeitos e formas de conjuração próprias.</li>
      </ul>

      <h3 class="regras-subtitle">O que ainda falta</h3>
      <p class="regras-note">Círculos, acesso, custos, manutenção, concentração, alcance, DT de magia e recuperação serão publicados juntos. Até isso acontecer, nenhum número antigo de magia faz parte da versão oficial.</p>
    `,
  },

  condicoes: {
    status: 'Regra oficial',
    resumo: 'Sanidade, Iniciativa e condições críticas passam a ter gatilhos e efeitos objetivos.',
    destaques: [
      ['Sanidade', '0–100'],
      ['Iniciativa', 'valor estático'],
      ['Defesa passiva', '10 + bônus'],
    ],
    corpo: `
      <h3 class="regras-subtitle">Sanidade</h3>
      <div class="regras-formula">d20 + bônus da perícia Sanidade ou Vontade contra DT 10 / 15 / 20 / 25</div>
      <ul class="regras-list">
        <li>Falha causa 1d4, 1d6, 1d8 ou 2d6 de perda, conforme a intensidade do evento.</li>
        <li>Sucesso crítico evita toda perda; sucesso reduz a perda à metade; falha crítica maximiza os dados.</li>
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

      <h3 class="regras-subtitle">Iniciativa estática</h3>
      <ul class="regras-list">
        <li>Iniciativa = 10 + metade do nível + Mod.Destreza + bônus.</li>
        <li>Empates: maior Mod.Sabedoria; persistindo, personagens agem antes de NPCs.</li>
        <li>Surpreendido impõe −5 na primeira rodada. Atrasar reduz voluntariamente sua posição pelo resto do combate.</li>
      </ul>

      <h3 class="regras-subtitle">Defesas passivas</h3>
      <ul class="regras-list">
        <li>Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir uma rolagem, use <strong>10 + bônus total</strong>.</li>
        <li>Quando você resiste diretamente a um perigo, role o d20 com o mesmo bônus.</li>
      </ul>
    `,
  },

  classes: {
    status: 'Catálogo',
    resumo: 'Lista de classes comuns e especiais disponíveis para criação de personagens.',
    destaques: [
      ['Classes', '24 catalogadas'],
      ['Progressão', 'Universal']
    ],
    corpo: `<h3 class="regras-subtitle">Guerreiro</h3><p class="regras-note">Vida inicial/nível: 5 | Mana inicial/nível: 2 | Categoria: Padrao</p><h3 class="regras-subtitle">Piloto</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Padrao</p><h3 class="regras-subtitle">Ninja</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Padrao</p><h3 class="regras-subtitle">Pop Star</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Padrao</p><h3 class="regras-subtitle">Espadachim</h3><p class="regras-note">Vida inicial/nível: 5 | Mana inicial/nível: 2 | Categoria: Padrao</p><h3 class="regras-subtitle">Lutador</h3><p class="regras-note">Vida inicial/nível: 5 | Mana inicial/nível: 2 | Categoria: Padrao</p><h3 class="regras-subtitle">Atirador</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Padrao</p><h3 class="regras-subtitle">Médico</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Padrao</p><h3 class="regras-subtitle">Guardião</h3><p class="regras-note">Vida inicial/nível: 5 | Mana inicial/nível: 2 | Categoria: Padrao</p><h3 class="regras-subtitle">Caçador</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Padrao</p><h3 class="regras-subtitle">Engenheiro</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Padrao</p><h3 class="regras-subtitle">Alquimista</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Padrao</p><h3 class="regras-subtitle">Comerciante</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Padrao</p><h3 class="regras-subtitle">Campeão Dimensional</h3><p class="regras-note">Vida inicial/nível: 5 | Mana inicial/nível: 2 | Categoria: Esquecida</p><h3 class="regras-subtitle">Pirata Amaldiçoado</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Esquecida</p><h3 class="regras-subtitle">Cartista Arcano</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p><h3 class="regras-subtitle">Guia Dimensional</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p><h3 class="regras-subtitle">Caçador de Entidades</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Esquecida</p><h3 class="regras-subtitle">Escritor de Contos</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p><h3 class="regras-subtitle">Invocador</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p><h3 class="regras-subtitle">Viajante</h3><p class="regras-note">Vida inicial/nível: 4 | Mana inicial/nível: 3 | Categoria: Esquecida</p><h3 class="regras-subtitle">Elementarista</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p><h3 class="regras-subtitle">Decodificador</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p><h3 class="regras-subtitle">Codificador</h3><p class="regras-note">Vida inicial/nível: 3 | Mana inicial/nível: 4 | Categoria: Esquecida</p>`
  },

  racas: {
    status: 'Catálogo',
    resumo: 'Espécies, fisiologias e habilidades raciais para os habitantes do universo.',
    destaques: [
      ['Raças', '21 catalogadas'],
      ['Ajustes', 'Vida, Mana e Mov.']
    ],
    corpo: `<h3 class="regras-subtitle">Humano</h3><p class="regras-note">Vida: +0 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Tamanho Normal.</li><li><strong>Adaptabilidade:</strong> Na criação, escolha uma perícia adicional para começar em Aprendiz. Assim, um Humano começa com sete perícias em Aprendiz, em vez de seis.</li></ul><h3 class="regras-subtitle">Vampiro</h3><p class="regras-note">Vida: +1 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Enxerga normalmente em escuridão natural, mas não através de escuridão criada por magia ou Fluxo.</li><li><strong>Hemofagia:</strong> Uma vez por cena, gaste uma ação para beber o sangue de um ser vivo voluntário ou incapacitado e recuperar 1d6 de Vida. Não funciona com construtos, Espíritos ou criaturas sem sangue.</li><li><strong>Fome de Sangue:</strong> Depois de 24 horas sem consumir sangue, descansos recuperam apenas metade da Mana normal, com mínimo de 1, até o Vampiro se alimentar.</li></ul><h3 class="regras-subtitle">Goblim</h3><p class="regras-note">Vida: -1 | Mana: +1 | Movimento: +1.5m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Tamanho Pequeno.</li><li><strong>Passos Ligeiros:</strong> Receba +1,5 m de Movimento.</li><li><strong>Mercador Improvisador:</strong> Receba vantagem em testes feitos para negociar a venda de um item que pertence ao Goblim.</li></ul><h3 class="regras-subtitle">Anão</h3><p class="regras-note">Vida: +2 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Tamanho Pequeno.</li><li><strong>Mãos de Ofício:</strong> Receba vantagem em testes de Ofício para construir ou reparar. Uma vez por descanso, depois de falhar em um desses testes, você pode rerrolá-lo e deve usar o novo resultado.</li></ul><h3 class="regras-subtitle">Golem</h3><p class="regras-note">Vida: +5 | Mana: -2 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Tamanho Grande ou Enorme, definido na criação.</li><li><strong>Fisiologia:</strong> Não precisa respirar, comer ou beber e não contrai doenças comuns.</li><li><strong>Corpo Construído:</strong> Ofício pode substituir Medicina para tratar o Golem, usando a mesma DT e o mesmo tempo. Tratamentos que dependam exclusivamente de uma biologia viva não funcionam nele.</li><li><strong>Estrutura Adaptada:</strong> Armaduras e vestimentas comuns precisam ser adaptadas ao corpo do Golem antes de serem equipadas.</li></ul><h3 class="regras-subtitle">Espírito</h3><p class="regras-note">Vida: -2 | Mana: +3 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Não precisa respirar, comer ou beber.</li><li><strong>Fisiologia:</strong> Enxerga normalmente em escuridão natural.</li><li><strong>Fisiologia:</strong> Não pode vestir armaduras comuns.</li><li><strong>Passagem Etérea:</strong> Uma vez por cena, gaste 2 Mana durante seu movimento para atravessar até 1,5 m de material sólido. Você precisa conhecer ou enxergar um espaço livre do outro lado, não pode terminar dentro do material nem carregar outra criatura.</li></ul><h3 class="regras-subtitle">Gigante</h3><p class="regras-note">Vida: +4 | Mana: -1 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Tamanho Grande; equipamentos precisam ter tamanho compatível.</li><li><strong>Porte Colossal:</strong> Receba vantagem para resistir a empurrões e quedas causados por outra criatura. Sua capacidade de carga é dobrada.</li></ul><h3 class="regras-subtitle">Animália</h3><p class="regras-note">Vida: +0 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> O tamanho e a aparência são definidos pelo animal representado e pela morfologia escolhida.</li><li><strong>Voz da Fauna:</strong> Você consegue comunicar ideias simples a animais e compreender suas respostas básicas. Isso não concede controle sobre eles.</li></ul><h3 class="regras-subtitle">Sereia / Tritão</h3><p class="regras-note">Vida: -1 | Mana: +2 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Anfíbio: respira no ar e na água; seu deslocamento de natação é igual ao Movimento terrestre.</li><li><strong>Canto Fascinante:</strong> Uma vez por cena, gaste uma ação e 2 Mana para fazer um teste de Carisma contra a Vontade de uma criatura a até 9 m que possa ouvir. Em sucesso, ela fica fascinada até o início do seu próximo turno; o efeito termina antes se ela sofrer dano.</li></ul><h3 class="regras-subtitle">Miceliano</h3><p class="regras-note">Vida: +1 | Mana: +1 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Organismo fúngico: alimenta-se como um ser vivo comum, mas também consegue absorver nutrientes ao permanecer em contato com solo fértil durante um descanso.</li><li><strong>Rede Micelial:</strong> Gaste uma ação para deixar esporos em uma criatura voluntária que você toque. Até o próximo descanso, vocês podem trocar silenciosamente ideias simples enquanto estiverem a até 30 m um do outro. Uma criatura só pode carregar os esporos de um Miceliano por vez.</li><li><strong>Memória do Solo:</strong> Depois de permanecer 1 minuto em contato com terra, madeira ou fungos de uma área, faça um teste de Sobrevivência para perceber se criaturas passaram por aquele local recentemente. O efeito revela presença e direção aproximada, não identidades.</li></ul><h3 class="regras-subtitle">Slime</h3><p class="regras-note">Vida: +3 | Mana: -2 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Corpo semissólido: não possui ossos nem órgãos em posições fixas.</li><li><strong>Fisiologia:</strong> Armaduras e vestimentas rígidas precisam ser adaptadas ao corpo do Slime.</li><li><strong>Corpo Maleável:</strong> Sem carregar equipamento rígido maior que a passagem, você pode atravessar aberturas de pelo menos 15 cm. O trecho apertado conta como terreno difícil e você não pode terminar o movimento dentro dele.</li><li><strong>Amortecimento Gelatinoso:</strong> Reduza pela metade o dano sofrido por quedas. Você também recebe vantagem em testes para escapar de agarrões ou amarras que não sejam hermeticamente fechadas.</li></ul><h3 class="regras-subtitle">Feérico</h3><p class="regras-note">Vida: -2 | Mana: +4 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Tamanho Pequeno ou Normal, definido na criação.</li><li><strong>Truque Feérico:</strong> Crie à vontade um efeito sensorial pequeno e inofensivo, como faíscas, um perfume, um sussurro ou uma imagem do tamanho da sua mão. O truque não causa dano, não concede bônus e não reproduz uma criatura de forma convincente.</li><li><strong>Glamour:</strong> Uma vez por cena, gaste uma ação e 2 Mana para criar uma ilusão visual e sonora de até 3 m em um ponto a até 15 m. Ela dura enquanto você mantiver concentração, por no máximo 1 minuto. Quem interagir diretamente pode testar Percepção contra seu Misticismo para reconhecer a ilusão.</li></ul><h3 class="regras-subtitle">Elfo</h3><p class="regras-note">Vida: +2 | Mana: +4 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Não envelhece e é imune a envelhecimento sobrenatural.</li><li><strong>Intelecto Élfico:</strong> Receba +4 em Inteligência. Somente esse bônus racial pode levar Inteligência acima do limite natural 20, até o máximo 24; ele não altera o limite de nenhum outro atributo.</li><li><strong>Memória Milenar:</strong> Você possui quatro rerrolagens por sessão, utilizáveis somente em testes cujo atributo seja Inteligência. Ao gastar uma, rerrole o teste e use o novo resultado.</li><li><strong>Herança Ancestral:</strong> Ao adquirir esta raça, receba um Legado adicional.</li><li><strong>Linhagem Élfica:</strong> Escolha uma das sete Linhagens Élficas. Você recebe apenas as características da Linhagem escolhida e não pode acumular efeitos de duas Linhagens.</li></ul><h3 class="regras-subtitle">Desperto</h3><p class="regras-note">Vida: +4 | Mana: +2 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Continua sendo um ser vivo, salvo alteração declarada pela Condição Ancestral escolhida.</li><li><strong>Fisiologia:</strong> Carrega um Fragmento de Arkarin ligado à própria alma.</li><li><strong>Fragmento de Arkarin:</strong> O fragmento vibra quando existe, a até 15 m, um Espírito ou alma aprisionada, um cadáver alterado sobrenaturalmente ou um efeito ligado à morte ou ao Fluxo de Arkarin. Ele revela presença e direção aproximada, mas não identidade, quantidade ou distância exata.</li><li><strong>Renegado da Morte:</strong> Receba +4 em Vontade e vantagem em testes contra morte instantânea, drenagem de Vida ou Mana, controle da alma e aprisionamento espiritual. Se um efeito tentaria capturar, consumir ou controlar sua alma sem permitir resistência, faça Vontade contra a DT do efeito.</li><li><strong>Ecos de Séculos Mortos:</strong> Para cada século completo que permaneceu morto, receba uma rerrolagem por sessão, até o máximo de cinco. Você pode usá-la em qualquer teste, mas deve manter o novo resultado. Quem permaneceu morto por menos de um século não recebe rerrolagens desta característica.</li><li><strong>Recusar o Fim:</strong> Uma vez por cena, quando morreria, gaste uma reação e 6 Mana, mesmo inconsciente. Sua Vida torna-se 1, Morrendo é removido, Ferido aumenta em 1 e a morte instantânea ou captura da alma que ativou a reação é negada. Não funciona sem Mana suficiente nem depois que a morte já foi concluída.</li><li><strong>Condição Ancestral:</strong> Escolha uma Condição Ancestral baseada no motivo do retorno. Você recebe somente a dádiva e a cicatriz da Condição escolhida.</li></ul><h3 class="regras-subtitle">Auleth</h3><p class="regras-note">Vida: +2 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Não precisa comer, beber ou dormir. Para concluir um descanso, medita pelo tempo normal e pode perceber os arredores, mas qualquer atividade além de observação simples interrompe a recuperação.</li><li><strong>Fisiologia:</strong> É imune a doenças comuns ou sobrenaturais, mas não a venenos ou outras condições que apenas produzam sintomas semelhantes.</li><li><strong>Fisiologia:</strong> Sua massa permanece aproximadamente constante quando altera o tamanho; formas pequenas tornam-se mais densas e formas grandes, mais rarefeitas.</li><li><strong>Conhecimentos Extremos:</strong> Escolha duas áreas de estudo aprovadas pelo mestre, cada uma mais estreita que uma Árvore ou Fluxo inteiro e mais ampla que um único indivíduo. Quando um teste de Conhecimento, Investigação, Misticismo, Ressonância, Tecnologia ou Ritos de Arkarin tratar diretamente de uma área escolhida, você recebe vantagem. Uma vez por sessão para cada área, depois de falhar em um desses testes, pode rerrolá-lo e deve manter o novo resultado. Isso não revela segredos sem pistas nem informações que nenhuma fonte acessível poderia fornecer.</li><li><strong>Forma sem Molde:</strong> À vontade, gaste sua ação e todo o Movimento do turno para alterar anatomia, aparência, voz e tamanho entre Minúsculo, Pequeno, Normal, Grande ou Enorme. A transformação não altera atributos, Vida, Mana, Movimento, alcance, capacidade de carga ou quantidade de ações e não concede sentidos, ataques, imunidades ou características da forma copiada. Sua massa permanece constante. Equipamentos não se transformam e caem intactos aos seus pés quando forem incompatíveis. Imitar perfeitamente uma criatura específica exige Enganação contra a Intuição de quem a conheça; a forma permanece até você mudá-la novamente.</li><li><strong>Emoção Distante:</strong> Além do ajuste de -3 em Carisma, você sofre desvantagem em Intuição para interpretar emoções e em Diplomacia para consolar, inspirar ou criar um vínculo emocional. A limitação não se aplica a negociações objetivas, análise lógica, Enganação ou Intimidação.</li></ul><h3 class="regras-subtitle">Autômato</h3><p class="regras-note">Vida: +0 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Construto consciente da A.X.I.S; Constituição representa Integridade Estrutural, mas continua sendo usada normalmente nas fórmulas e em Fortitude.</li><li><strong>Fisiologia:</strong> Não precisa respirar, comer, beber ou dormir. Para concluir um descanso, permanece inativo ou em recarga pelo tempo normal.</li><li><strong>Fisiologia:</strong> É imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos enquanto não possuir a modificação Máquina Viva.</li><li><strong>Núcleo Autônomo:</strong> Você possui vontade própria e não precisa obedecer a um criador. Seu Nível Total também é o nível do núcleo, e você pode receber níveis de classe desde o nível 1. Sua Mana representa a Energia do Núcleo e é recuperada normalmente por descanso ou Relaxar.</li><li><strong>Corpo Artificial:</strong> Você é imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos. Não precisa respirar, comer, beber ou dormir. Essas imunidades são perdidas enquanto Máquina Viva estiver instalada.</li><li><strong>Reparo Mecânico:</strong> Descanso e curas comuns ou mágicas não recuperam sua Vida. Um personagem pode gastar uma hora e fazer Ofício (Engenharia) contra DT 15 + piso do seu Nível Total dividido por 2; em sucesso, você recupera 5 de Vida. Uma nova tentativa exige outra hora. Máquina Viva substitui esta regra pela recuperação normal.</li><li><strong>Colapso do Núcleo:</strong> Ao chegar a 0 Vida ou menos, você segue normalmente as regras de Morrendo. Seu núcleo somente é destruído quando sua morte é concluída. Substituir um núcleo destruído exige um acontecimento narrativo aprovado pelo mestre.</li><li><strong>Arquitetura Modular:</strong> Seu limite de modificações instaladas é 1 + piso do Nível Total dividido por 2. Uma modificação ativa exige pelo menos três passivas instaladas, além dos demais pré-requisitos. Instalar uma modificação exige um dia de trabalho de alguém capaz de realizar Ofício (Engenharia); custos e obtenção de peças são resolvidos pelo mestre.</li></ul><h3 class="regras-subtitle">Clone</h3><p class="regras-note">Vida: +3 | Mana: +3 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> É biologicamente vivo e precisa respirar, alimentar-se, dormir e descansar normalmente.</li><li><strong>Fisiologia:</strong> A aparência pode reproduzir outra raça, mas o Clone possui somente as características raciais deste pacote.</li><li><strong>Matriz Aperfeiçoada:</strong> Escolha dois atributos diferentes. Cada um recebe +2, respeitando o limite natural 20.</li><li><strong>Cópia Biométrica:</strong> Você reproduz aparência, voz, digitais, retina e outras características físicas do Original. Receba vantagem em Enganação para se passar por ele quando aparência, voz ou identificação biométrica forem as evidências principais. Pessoas que conheçam intimamente o Original podem usar Intuição para perceber diferenças de comportamento. Você não copia automaticamente raça, classe, Habilidades, Poderes, Legados, alma, pactos, bênçãos, Fragmentos de Arkarin ou lembranças completas.</li><li><strong>Memórias Residuais:</strong> Uma vez por sessão, pergunte se possui uma lembrança relacionada ao Original. Se ele conhecia a informação no momento da clonagem, o mestre entrega uma memória curta, verdadeira e incompleta: imagem, frase, sensação, rosto ou localização aproximada. Isso não fornece senhas completas, segredos sem contexto ou conhecimentos posteriores à clonagem.</li><li><strong>Regeneração Programada:</strong> Uma vez por cena, quando sofrer dano e ficar com metade da Vida máxima ou menos, gaste uma reação e 4 Mana para recuperar 2d6 + Mod.Constituição de Vida, com mínimo de 2d6.</li><li><strong>Projeto de Clonagem:</strong> Escolha Réplica Perfeita, Arquivo Vivo, Organismo Otimizado ou Série Contínua. Você recebe somente as características do Projeto escolhido.</li></ul><h3 class="regras-subtitle">Errante</h3><p class="regras-note">Vida: +3 | Mana: +3 | Movimento: +0m</p><ul class="regras-list"><li><strong>Identidade Preservada:</strong> Conserve nome, aparência, personalidade, lembranças, relações, cicatrizes, objetivos e reputação do personagem original quando fizerem sentido. Nível, experiência, atributos, raça, classe, poderes, dinheiro e equipamentos são reconstruídos pelas regras e pelo patamar da campanha atual; nenhum número de outro sistema é importado diretamente.</li><li><strong>Memórias de Outra Campanha:</strong> Escolha três perícias relacionadas ao que fazia na campanha anterior. Receba três rerrolagens por sessão, compartilhadas entre essas perícias. Depois de rerrolar, mantenha o novo resultado.</li><li><strong>Assinatura Remanescente:</strong> Escolha uma Habilidade, magia, técnica ou poder marcante do personagem original, dê a ela um nome e converta-a para um único formato publicado. Nome, aparência e narrativa são preservados, mas somente a mecânica do formato escolhido funciona.</li><li><strong>Legado de Outra História:</strong> Receba um Legado adicional para representar uma arma, companheiro, bênção, mutação, técnica permanente ou artefato que atravessou a mudança. Use as regras de um Legado existente, embora seu nome e sua aparência possam ser diferentes.</li><li><strong>Sobrevivente de Outra História:</strong> Uma vez por sessão, quando um dano deixaria você com 0 Vida ou menos, sua Vida torna-se 1. Isso não impede morte instantânea, destruição da alma ou uma consequência narrativa que não seja causada por dano.</li><li><strong>Dupla Proveniência:</strong> Você pode cumprir os requisitos da classe exclusiva de sua Árvore atual ou de sua Árvore de origem equivalente. O acesso não concede nenhuma classe automaticamente e o limite normal de uma classe especial permanece; portanto, escolha no máximo uma das duas. Mudar a Árvore atual substitui apenas o vínculo atual e nunca acumula acesso a Árvores anteriormente visitadas.</li></ul><h3 class="regras-subtitle">Amálgamo</h3><p class="regras-note">Vida: +5 | Mana: +1 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> É um ser vivo e pode ser tratado normalmente com Medicina.</li><li><strong>Fisiologia:</strong> Seu corpo reúne diferentes criaturas, corpos, almas ou essências, mas não acumula os pacotes raciais das partes que o formaram.</li><li><strong>Anatomia Plural:</strong> Uma vez por cena, depois de falhar em Fortitude contra doença, veneno, fadiga ou alteração corporal, rerrole o teste e mantenha o novo resultado.</li><li><strong>Alma Coral:</strong> Uma vez por sessão, depois de falhar em Vontade, rerrole o teste e mantenha o novo resultado. Isso não concede acesso automático às memórias completas dos seres constituintes.</li><li><strong>Reconfiguração Visceral:</strong> Uma vez por cena, depois de sofrer dano, gaste uma reação e 4 Mana para receber Resistência 5 contra o tipo daquele dano até o começo do seu próximo turno, incluindo o dano que ativou a reação.</li><li><strong>Assimilação Controlada:</strong> Comece conhecendo três Fragmentos. Um acontecimento narrativo autorizado pelo mestre pode desbloquear outro Fragmento da lista, até o máximo de seis conhecidos. Derrotar, tocar ou consumir uma criatura não concede automaticamente características, e poderes raciais completos nunca são copiados.</li><li><strong>Surto de Convergência:</strong> Uma vez por sessão, gaste uma ação e 6 Mana para expressar um terceiro Fragmento conhecido durante três rodadas. Quando terminar, ele deixa de funcionar, todo benefício temporário ou excesso de Mana é removido e você recebe 1 ponto de Cansaço.</li></ul><h3 class="regras-subtitle">Bruxa</h3><p class="regras-note">Vida: +1 | Mana: +5 | Movimento: +0m</p><ul class="regras-list"><li><strong>Fisiologia:</strong> Bruxa é uma natureza mágica adquirida, não uma profissão nem uma identidade de gênero.</li><li><strong>Fisiologia:</strong> Permanece um ser vivo, salvo transformação narrativa posterior declarada pelo mestre.</li><li><strong>Olhar Bruxo:</strong> Você percebe a presença e a direção aproximada de maldições, pactos, possessões e rituais ativos a até 15 m, mas não identifica automaticamente o efeito. Receba vantagem para resistir a maldições, possessões e tentativas de controlar sua alma.</li><li><strong>Preço da Bruxaria:</strong> Uma vez por cena, quando não possuir Mana suficiente para uma característica racial, substitua até 3 pontos ausentes por 2 de Vida para cada ponto. Esse custo não pode ser reduzido, ignora Resistência, não pode deixar você com menos de 1 Vida e não paga custos de classes, itens ou Legados.</li><li><strong>Maldição Tecida:</strong> Uma vez por cena, gaste uma ação e 5 Mana para amaldiçoar uma criatura a até 15 m. Faça Misticismo contra a Vontade dela. Se a criatura falhar, a Maldição dura três rodadas; se resistir, dura somente até o final do próximo turno dela. Apenas uma Maldição Tecida da mesma Bruxa pode afetar uma criatura; uma nova substitui a anterior.</li><li><strong>Grande Sabá:</strong> Uma vez por sessão, gaste uma ação e 8 Mana para escolher uma Maldição conhecida e até Mod.Fluxo criaturas a até 15 m, com mínimo de uma. Faça um único teste de Misticismo e compare com a Vontade de cada alvo. A duração é determinada separadamente pelo resultado de cada criatura, seguindo Maldição Tecida.</li></ul><h3 class="regras-subtitle">Entidade</h3><p class="regras-note">Vida: +0 | Mana: +0 | Movimento: +0m</p><ul class="regras-list"></ul>`
  },

  mestre: {
    status: 'Restrito',
    resumo: 'Área exclusiva para o Mestre. (Em construção)',
    destaques: [
      ['Acesso', 'Apenas Mestre']
    ],
    corpo: `
      <p class="regras-lead">Este conteúdo é restrito e reservado para quem comanda a mesa.</p>
      <div class="regras-formula">Em construção: tabelas de encontros, armadilhas, e recompensas do mestre.</div>
    `
  }
};
