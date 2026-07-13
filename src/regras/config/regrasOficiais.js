function formatarXP(valor) {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

const tabelaXP = Array.from({ length: 40 }, (_, indice) => {
  const nivel = indice + 1;
  const xp = 500 * nivel * (nivel - 1);
  return `<span><strong>N${nivel}</strong>${formatarXP(xp)} XP</span>`;
}).join('');

export const REGRAS_OFICIAIS = {
  'sistema-base': {
    status: 'Regra oficial',
    resumo: 'Criação de personagem, atributos, Mana e as fórmulas centrais da versão 1.0.',
    destaques: [
      ['Teste', 'd20 + bônus vs. DT'],
      ['Atributos', '15, 14, 13, 12, 10, 8'],
      ['Níveis', '1–40 no total'],
    ],
    corpo: `
      <p class="regras-lead">Quando uma ação tiver risco real, role um d20, some o bônus relevante e compare com a Dificuldade do Teste. Resultado igual ou maior que a DT é sucesso.</p>

      <h3 class="regras-subtitle">Criação de personagem</h3>
      <ol class="regras-steps">
        <li><strong>Distribua</strong> 15, 14, 13, 12, 10 e 8 entre os seis atributos.</li>
        <li><strong>Aplique</strong> os ajustes de raça, respeitando o limite natural 20.</li>
        <li><strong>Escolha</strong> três perícias ligadas à história e três perícias livres; todas começam em Aprendiz.</li>
        <li><strong>Escolha</strong> uma classe comum. Humanos recebem um Legado inicial; raças especiais também.</li>
        <li><strong>Receba</strong> um item comum e 20 Lunaris, antes dos ajustes de raça.</li>
      </ol>
      <p class="regras-note">Rolar 6d20 e distribuir os resultados é uma variante opcional do mestre. Ela produz personagens muito desiguais e não é usada pela regra padrão.</p>

      <h3 class="regras-subtitle">Fórmulas fundamentais</h3>
      <dl class="regras-kv regras-kv--boxed">
        <dt>Modificador</dt><dd>⌊(Atributo − 10) ÷ 2⌋</dd>
        <dt>Teste</dt><dd>d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau</dd>
        <dt>Vida inicial</dt><dd>máx. 1, 10 + (2 × Mod.Força) + (2 × Mod.Constituição)</dd>
        <dt>Vida por nível</dt><dd>ganho da classe + Mod.Constituição, mínimo 1</dd>
        <dt>Mana inicial</dt><dd>máx. 1, 6 + (2 × Mod.Inteligência) + Mod.Sabedoria</dd>
        <dt>Mana por nível</dt><dd>ganho de Mana da classe, mínimo 1</dd>
        <dt>Defesa Natural</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + equipamento</dd>
        <dt>Movimento</dt><dd>9 m + (1,5 m × Mod.Destreza), mínimo 4,5 m</dd>
        <dt>Iniciativa</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus</dd>
      </dl>

      <h3 class="regras-subtitle">Nível e multiclasse</h3>
      <ul class="regras-list">
        <li><strong>Nível total</strong> é a soma dos níveis de todas as classes, inclusive especiais.</li>
        <li>Cada classe possui no máximo <strong>20 níveis</strong>; o personagem possui no máximo <strong>40 níveis totais</strong>.</li>
        <li>O limite é de <strong>duas classes comuns e uma classe especial</strong>.</li>
        <li>Depois de alcançar nível 20 em uma classe, escolha outra classe para continuar aumentando o nível total.</li>
        <li>Classes especiais exigem nível total 15 e um acontecimento narrativo, salvo exceção declarada pela própria classe.</li>
      </ul>

      <h3 class="regras-subtitle">Maestria de atributo</h3>
      <p class="regras-note">Ao alcançar valor 20 sem itens, pactos ou efeitos temporários, receba a maestria correspondente. Intervenções externas podem elevar o atributo acima de 20, mas não concedem outra maestria.</p>
      <ul class="regras-sublist regras-sublist--grid">
        <li><strong>Força</strong> — uma vez por turno, +2 no dano de um ataque corpo a corpo.</li>
        <li><strong>Destreza</strong> — +1 na Defesa Natural ou +1,5 m de movimento.</li>
        <li><strong>Constituição</strong> — você morre em Morrendo 4, em vez de Morrendo 3.</li>
        <li><strong>Inteligência</strong> — torne-se Aprendiz em duas perícias.</li>
        <li><strong>Sabedoria</strong> — reduza em 2 a primeira perda de Sanidade de cada cena.</li>
        <li><strong>Carisma</strong> — uma vez por cena, repita um teste social; mantenha o novo resultado.</li>
      </ul>

      <h3 class="regras-subtitle">Fluxo</h3>
      <p class="regras-note"><strong>Fluxo</strong> é o sétimo atributo (revisado em 2026-07-12) — mede conexão e capacidade de canalização de Fluxos. Já entra na distribuição inicial e sobe/desce como os demais, mas sua fórmula de uso em jogo e o bônus de maestria em 20 permanecem Em desenvolvimento junto do sistema de magia.</p>
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
      <p class="regras-note">Luta e Pontaria usam a mesma fórmula. Fortitude, Reflexos e Vontade não são perícias, mas usam esta escala quando uma rolagem defensiva for necessária.</p>

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
    resumo: 'Treino exige tempo e conquista de classe; dinheiro ou dias livres não compram sozinho o maior bônus do jogo.',
    destaques: [
      ['Dia de treino', '6 horas'],
      ['Recurso', 'Grau de Perícia'],
      ['Maior grau', 'Renomado'],
    ],
    corpo: `
      <p class="regras-lead">Para subir um grau, você precisa receber um Grau de Perícia por classe, legado ou evento e cumprir o treinamento. O tempo sozinho nunca concede o avanço.</p>

      <h3 class="regras-subtitle">Progressão</h3>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Avanço</th><th>Tempo</th><th>Requisito</th></tr></thead>
        <tbody>
          <tr><td>Iniciante → Aprendiz</td><td>3 dias</td><td>Instrutor, livro ou experiência relevante</td></tr>
          <tr><td>Aprendiz → Treinado</td><td>7 dias</td><td>1 Grau de Perícia; nível 3</td></tr>
          <tr><td>Treinado → Especialista</td><td>14 dias</td><td>1 Grau de Perícia; nível 7</td></tr>
          <tr><td>Especialista → Mestre</td><td>21 dias</td><td>1 Grau de Perícia; nível 13 e instrutor</td></tr>
          <tr><td>Mestre → Veterano</td><td>32 dias</td><td>1 Grau; nível 19 e feito notável</td></tr>
          <tr><td>Veterano → Renomado</td><td>62 dias</td><td>1 Grau; nível 29, feito e item especial</td></tr>
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
      <p class="regras-note">Todas as classes usam esta tabela. A ficha da classe precisa listar apenas as cinco Identidades e os Poderes disponíveis.</p>
      <div class="regras-table-wrap"><table class="regras-table regras-table--progression">
        <thead><tr><th>Nível da classe</th><th>Recompensa</th><th>Nível da classe</th><th>Recompensa</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Identidade I + treinamento inicial</td><td>11</td><td>Poder de classe</td></tr>
          <tr><td>2</td><td>Poder de classe</td><td>12</td><td>Grau de Perícia</td></tr>
          <tr><td>3</td><td>Grau de Perícia</td><td>13</td><td>Poder de classe</td></tr>
          <tr><td>4</td><td>Poder de classe</td><td>14</td><td>Poder de classe</td></tr>
          <tr><td>5</td><td>Identidade II</td><td>15</td><td>Identidade IV</td></tr>
          <tr><td>6</td><td>Poder de classe</td><td>16</td><td>Poder de classe</td></tr>
          <tr><td>7</td><td>Grau de Perícia</td><td>17</td><td>Grau de Perícia</td></tr>
          <tr><td>8</td><td>Poder de classe</td><td>18</td><td>Poder de classe</td></tr>
          <tr><td>9</td><td>Poder de classe</td><td>19</td><td>Poder de classe</td></tr>
          <tr><td>10</td><td>Identidade III</td><td>20</td><td>Identidade V</td></tr>
        </tbody>
      </table></div>

      <h3 class="regras-subtitle">Especialização e multiclasse</h3>
      <ul class="regras-list">
        <li>Uma classe pode chegar ao nível 20 sem que o personagem possua outra classe.</li>
        <li>Para aumentar o nível total depois disso, invista em outra classe.</li>
        <li>Classes especiais exigem nível total 15, consomem nível normalmente e não contam no limite de duas classes comuns.</li>
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
      <div class="regras-formula">d20 + Sanidade ou Vontade contra DT 10 / 15 / 20 / 25</div>
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
};

export function regraOficialPorId(id) {
  return REGRAS_OFICIAIS[id] || null;
}
