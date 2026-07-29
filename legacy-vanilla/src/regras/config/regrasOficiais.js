// Arquivo gerado por tools/generate-public-rules.mjs. Não edite manualmente.
export const REGRAS_OFICIAIS = {
  "sistema-base": {
    "categoria": "Livro do Jogador",
    "status": "Regra oficial",
    "resumo": "Criação de personagem, atributos, Mana e as fórmulas centrais da versão 1.0.",
    "destaques": [
      [
        "Teste",
        "d20 + bônus vs. DT"
      ],
      [
        "Atributos",
        "Padrão ou 24 pontos"
      ],
      [
        "Níveis",
        "1–40 no total"
      ]
    ],
    "corpo": "\n      <p class=\"regras-lead\">Quando uma ação tiver risco real, role um d20, some o bônus relevante e compare com a Dificuldade do Teste. Resultado igual ou maior que a DT é sucesso.</p>\n\n      <h3 class=\"regras-subtitle\">Criação de personagem</h3>\n      <ol class=\"regras-steps\">\n        <li><strong>Defina os atributos</strong> pelo conjunto padrão ou pela compra de pontos descrita abaixo.</li>\n        <li><strong>Escolha</strong> uma raça comum e, quando exigido, sua variante. Ela define ajustes iniciais, fisiologia e características.</li>\n        <li><strong>Escolha</strong> seis perícias para começar em Aprendiz. Humanos escolhem sete por Adaptabilidade.</li>\n        <li><strong>Escolha</strong> uma classe comum. Ela define os ganhos de Vida e Mana dos níveis posteriores.</li>\n        <li><strong>Receba</strong> um item comum e 20 Lunaris.</li>\n      </ol>\n      <h3 class=\"regras-subtitle\">Métodos de atributos</h3>\n      <ul class=\"regras-list\">\n        <li><strong>Conjunto padrão:</strong> organize 15, 14, 13, 12, 10, 8 e 8 livremente entre os sete atributos. Cada valor é usado uma vez.</li>\n        <li><strong>Compra por pontos:</strong> todos os sete atributos começam em 8. Distribua exatamente 24 pontos, na proporção de 1 ponto para +1 no atributo. Nenhum atributo pode passar de 15 antes dos ajustes raciais.</li>\n        <li><strong>Equivalência:</strong> o conjunto padrão também consome exatamente 24 pontos. Assim, os dois métodos oficiais possuem o mesmo total de atributos, mas a compra permite maior especialização.</li>\n      </ul>\n      <p class=\"regras-note\"><strong>Variante aleatória:</strong> com autorização do mestre, role 7d20 e organize os sete resultados, usando cada dado uma vez. Essa opção pode criar personagens muito mais fortes ou muito mais fracos e, por isso, não é considerada equivalente aos dois métodos oficiais.</p>\n\n      <h3 class=\"regras-subtitle\">Fórmulas fundamentais</h3>\n      <dl class=\"regras-kv regras-kv--boxed\">\n        <dt>Modificador</dt><dd>⌊(Atributo − 10) ÷ 2⌋</dd>\n        <dt>Teste</dt><dd>d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau</dd>\n        <dt>Vida inicial</dt><dd>máx. 1, 10 + (2 × Mod.Força) + (2 × Mod.Constituição) + ajuste da raça</dd>\n        <dt>Vida por nível</dt><dd>ganho da classe + Mod.Constituição, mínimo 1</dd>\n        <dt>Mana inicial</dt><dd>máx. 1, 6 + (2 × Mod.Inteligência) + Mod.Sabedoria + ajuste da raça</dd>\n        <dt>Mana por nível</dt><dd>ganho de Mana da classe, mínimo 1</dd>\n        <dt>Defesa Natural</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + equipamento</dd>\n        <dt>Movimento</dt><dd>9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m</dd>\n        <dt>Iniciativa</dt><dd>10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus</dd>\n      </dl>\n\n      <h3 class=\"regras-subtitle\">Nível e multiclasse</h3>\n      <ul class=\"regras-list\">\n        <li><strong>Nível total</strong> é a soma dos níveis de todas as classes, inclusive especiais.</li>\n        <li>Cada classe possui no máximo <strong>20 níveis</strong>; o personagem possui no máximo <strong>40 níveis totais</strong>.</li>\n        <li>O limite é de <strong>duas classes comuns e uma classe especial</strong>.</li>\n        <li>Depois de alcançar nível 20 em uma classe, escolha outra classe para continuar aumentando o nível total.</li>\n        <li>Classes especiais exigem nível total 15 e um acontecimento narrativo, salvo exceção declarada pela própria classe.</li>\n        <li>Classes gerais podem ser obtidas em qualquer Árvore; classes exclusivas exigem que o personagem pertença à Árvore indicada.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Maestria de atributo</h3>\n      <p class=\"regras-note\">Ao alcançar valor 20 sem itens, pactos ou efeitos temporários, receba a maestria correspondente. Intervenções externas podem elevar o atributo acima de 20, mas não concedem outra maestria. Entre os pacotes raciais publicados, somente Intelecto Élfico pode ultrapassar esse limite: +4 em Inteligência, até o máximo 24. Essa permissão não se aplica a outros atributos.</p>\n      <ul class=\"regras-sublist regras-sublist--grid\">\n        <li><strong>Força:</strong> uma vez por turno, +2 no dano de um ataque corpo a corpo.</li>\n        <li><strong>Destreza:</strong> +1 na Defesa Natural ou +1,5 m de movimento.</li>\n        <li><strong>Constituição:</strong> você morre em Morrendo 4, em vez de Morrendo 3.</li>\n        <li><strong>Inteligência:</strong> torne-se Aprendiz em duas perícias.</li>\n        <li><strong>Sabedoria:</strong> reduza em 2 a primeira perda de Sanidade de cada cena.</li>\n        <li><strong>Carisma:</strong> uma vez por cena, repita um teste social; mantenha o novo resultado.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Fluxo</h3>\n      <p class=\"regras-note\"><strong>Fluxo</strong> é o sétimo atributo. Ele mede controle e capacidade de canalização. Em magia, substitui o atributo normalmente ligado a Misticismo e limita o maior círculo que o personagem consegue conjurar com segurança. Fluxo alto não concede magias sozinho: uma classe, habilidade, item ou decisão do Mestre precisa fornecer acesso.</p>\n    "
  },
  "pericias": {
    "categoria": "Livro do Jogador",
    "status": "Regra oficial",
    "resumo": "Uma única fórmula para perícias, ataques e resistências, com DTs que acompanham o nível.",
    "destaques": [
      [
        "Base",
        "d20 + atributo + nível/2 + grau"
      ],
      [
        "Graus",
        "7 estágios"
      ],
      [
        "Crítico",
        "20 natural"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Fórmula de teste</h3>\n      <div class=\"regras-formula\">d20 + Mod. de Atributo + ⌊Nível total ÷ 2⌋ + bônus do Grau</div>\n      <p class=\"regras-note\">Luta e Pontaria usam a mesma fórmula. Fortitude, Reflexos e Vontade são perícias e também fornecem as respectivas Defesas passivas.</p>\n\n      <h3 class=\"regras-subtitle\">Graus de perícia</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Grau</th><th>Bônus</th><th>Nível mínimo sugerido</th></tr></thead>\n        <tbody>\n          <tr><td>Iniciante</td><td>+0</td><td>1</td></tr>\n          <tr><td>Aprendiz</td><td>+2</td><td>1</td></tr>\n          <tr><td>Treinado</td><td>+4</td><td>3</td></tr>\n          <tr><td>Especialista</td><td>+6</td><td>7</td></tr>\n          <tr><td>Mestre</td><td>+8</td><td>13</td></tr>\n          <tr><td>Veterano</td><td>+10</td><td>19</td></tr>\n          <tr><td>Renomado</td><td>+12</td><td>29</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Graus de resultado</h3>\n      <ul class=\"regras-list\">\n        <li><strong>Sucesso crítico:</strong> o d20 mostra 20 natural.</li>\n        <li><strong>Sucesso:</strong> resultado igual ou superior à DT.</li>\n        <li><strong>Falha:</strong> resultado abaixo da DT.</li>\n        <li><strong>Falha crítica:</strong> o d20 mostra 1 natural.</li>\n        <li>Somar 10 ou mais acima da DT não transforma o teste em crítico.</li>\n        <li>Se uma ação for impossível, o Mestre não pede a rolagem. Quando houver rolagem, o 20 natural é um sucesso crítico.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Vantagem e desvantagem</h3>\n      <ul class=\"regras-list\">\n        <li>Role dois d20 e use o maior com vantagem ou o menor com desvantagem.</li>\n        <li>Registre cada fonte de vantagem e desvantagem; elas se anulam uma a uma.</li>\n        <li>Depois da anulação, qualquer saldo positivo concede uma vantagem e qualquer saldo negativo impõe uma desvantagem.</li>\n        <li>O tamanho do saldo não acrescenta mais dados: ele registra quantas fontes ainda sustentam a condição.</li>\n      </ul>\n    "
  },
  "combate": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Regras de turno, ações, deslocamento, vida e dano em batalha.",
    "destaques": [
      [
        "Turno",
        "1 padrão + 1 movimento"
      ],
      [
        "Rodada",
        "1 reação"
      ],
      [
        "Ataque",
        "Luta/Pontaria vs. Defesa"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Seu turno</h3>\n      <ul class=\"regras-list\">\n        <li><strong>Ação Padrão:</strong> atacar, usar habilidade, prestar auxílio ou realizar uma manobra.</li>\n        <li><strong>Ação de Movimento:</strong> deslocar-se, levantar, sacar ou manipular um objeto relevante.</li>\n        <li><strong>Ação Livre:</strong> gesto ou fala breve. O mestre limita repetições que tenham impacto mecânico.</li>\n        <li>Você pode converter sua Ação Padrão em uma segunda Ação de Movimento.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Ataques e cobertura</h3>\n      <div class=\"regras-formula\">d20 + Luta ou Pontaria contra a Defesa Natural</div>\n      <ul class=\"regras-list\">\n        <li>Igualar a Defesa acerta. Um 1 natural sempre erra.</li>\n        <li>Cada arma informa sua <strong>Margem de Ameaça</strong> e seu <strong>Multiplicador Crítico</strong>, escritos como 20/x2, 19-20/x2 ou 20/x3.</li>\n        <li>Se o número natural do d20 estiver dentro da margem da arma, o ataque acerta e se torna crítico. Não há rolagem de confirmação.</li>\n        <li>O multiplicador indica quantas vezes os dados da arma são rolados. Em x3, 2d6+4 vira 6d6+4.</li>\n        <li>Bônus fixos e dados adicionais de habilidades, venenos ou efeitos externos entram uma vez, salvo quando a própria habilidade disser o contrário.</li>\n        <li>Para balanceamento, margens 18-20 e 19-20 usam x2; multiplicadores x3 e x4 usam margem 20.</li>\n        <li>Cobertura parcial concede +2 de Defesa; cobertura superior concede +5.</li>\n      </ul>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Perfil</th><th>Chance</th><th>Aumento médio nos dados</th><th>Uso sugerido</th></tr></thead>\n        <tbody>\n          <tr><td>20/x2</td><td>5%</td><td>+5%</td><td>Arma equilibrada</td></tr>\n          <tr><td>19-20/x2</td><td>10%</td><td>+10%</td><td>Arma precisa</td></tr>\n          <tr><td>18-20/x2</td><td>15%</td><td>+15%</td><td>Arma de margem ampla</td></tr>\n          <tr><td>20/x3</td><td>5%</td><td>+10%</td><td>Arma pesada</td></tr>\n          <tr><td>20/x4</td><td>5%</td><td>+15%</td><td>Arma brutal ou excepcional</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Reações</h3>\n      <p class=\"regras-note\">Você recupera sua reação no início do próprio turno. Defesa Natural não gasta reação.</p>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Reação</th><th>Gatilho</th><th>Efeito</th></tr></thead>\n        <tbody>\n          <tr><td>Esquiva</td><td>Antes da rolagem contra você</td><td>+4 de Defesa contra um ataque. Se errar, mova 1,5 m sem provocar reação.</td></tr>\n          <tr><td>Bloqueio</td><td>Após sofrer dano físico</td><td>Reduza o dano em 2 + ⌊Nível ÷ 2⌋ + bônus do escudo. Exige escudo ou arma adequada.</td></tr>\n          <tr><td>Contra-Ataque</td><td>Inimigo adjacente erra você</td><td>Faça um ataque com −2. Ele não pode gerar crítico.</td></tr>\n          <tr><td>Proteger</td><td>Aliado adjacente é atacado</td><td>Você vira o alvo e pode usar Bloqueio, se ainda tiver reação.</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Tipos de dano</h3>\n      <ul class=\"regras-sublist regras-sublist--grid\">\n        <li><strong>Físicos:</strong> corte, perfuração, impacto e balístico.</li>\n        <li><strong>Persistentes:</strong> sangramento, fogo e veneno; causam dano no fim do turno até serem removidos.</li>\n        <li><strong>Energia:</strong> elemental, Arkania, tecnologia e Fluxos.</li>\n        <li><strong>Mental:</strong> afeta Sanidade ou Vida conforme a fonte.</li>\n      </ul>\n    "
  },
  "distancias": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Faixas mantidas, agora com regra de alcance e conversão clara para mapas.",
    "destaques": [
      [
        "Mapa",
        "1 quadrado = 1,5 m"
      ],
      [
        "Além do alcance",
        "−5 por faixa"
      ],
      [
        "Limite",
        "2 faixas adicionais"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Faixas de distância</h3>\n      <div class=\"regras-distance-grid\">\n        <span><strong>Adjacente</strong>até 1,5 m</span><span><strong>Curto</strong>até 5 m</span>\n        <span><strong>Médio</strong>até 15 m</span><span><strong>Longo</strong>até 25 m</span>\n        <span><strong>Longo+</strong>até 50 m</span><span><strong>Extremo</strong>até 90 m</span>\n        <span><strong>Colossal</strong>até 150 m</span><span><strong>Lunar</strong>até 200 m</span>\n        <span><strong>Estelar</strong>até 500 m</span><span><strong>Galáctico</strong>até 1.000 m</span>\n      </div>\n\n      <h3 class=\"regras-subtitle\">Alcance de armas e poderes</h3>\n      <ul class=\"regras-list\">\n        <li>Dentro do alcance indicado, ataque normalmente.</li>\n        <li>Uma faixa além do alcance impõe −5 no ataque; duas faixas impõem −10.</li>\n        <li>Acima de duas faixas, o alvo não pode ser atingido sem habilidade ou item específico.</li>\n        <li>Em mapa tático, arredonde deslocamentos para múltiplos de 1,5 m.</li>\n      </ul>\n    "
  },
  "ferimentos": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Vida negativa torna cada queda diferente, enquanto Morrendo dá tempo para decisões de resgate.",
    "destaques": [
      [
        "Queda",
        "0 PV ou menos"
      ],
      [
        "Morte",
        "Morrendo 3"
      ],
      [
        "DT",
        "12 + Gravidade × 2 + Ferido"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Vida negativa</h3>\n      <ul class=\"regras-list\">\n        <li>Continue registrando o dano abaixo de 0. Esse valor é o <strong>Déficit de Vida</strong>.</li>\n        <li>A cura primeiro reduz o Déficit. O personagem só desperta quando voltar a 1 PV ou mais.</li>\n        <li>Se o Déficit alcançar a Vida máxima do personagem, ele morre imediatamente.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Gravidade da queda</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Déficit em relação à Vida máxima</th><th>Gravidade</th><th>DT base</th></tr></thead>\n        <tbody>\n          <tr><td>0% a 10%</td><td>0</td><td>12 + Ferido</td></tr>\n          <tr><td>Acima de 10% até 25%</td><td>1</td><td>14 + Ferido</td></tr>\n          <tr><td>Acima de 25% até 50%</td><td>2</td><td>16 + Ferido</td></tr>\n          <tr><td>Acima de 50% até 75%</td><td>3</td><td>18 + Ferido</td></tr>\n          <tr><td>Acima de 75%</td><td>4</td><td>20 + Ferido</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Morrendo</h3>\n      <ol class=\"regras-steps\">\n        <li>Ao chegar a 0 PV ou menos, fique inconsciente e receba <strong>Morrendo 1</strong>.</li>\n        <li>No fim de cada turno, faça Fortitude contra <strong>DT 12 + (2 × Gravidade) + Ferido</strong>.</li>\n        <li>Sucesso mantém Morrendo; sucesso crítico reduz em 1; falha aumenta em 1; falha crítica aumenta em 2.</li>\n        <li>Em Morrendo 3, você morre. A maestria de Constituição aumenta o limite para Morrendo 4.</li>\n      </ol>\n      <p class=\"regras-note\">Um teste de Cura usa a mesma DT. Sucesso estabiliza o alvo, impedindo novos testes de Morrendo, mas somente cura suficiente para chegar a 1 PV devolve a consciência. Ao despertar, aumente Ferido em 1.</p>\n\n      <h3 class=\"regras-subtitle\">Remover Ferido</h3>\n      <ul class=\"regras-list\">\n        <li>Um descanso completo de qualidade Boa ou superior reduz Ferido em 1 se o personagem receber tratamento e terminar o descanso consciente.</li>\n        <li>Ferido só pode ser reduzido uma vez por descanso completo, mesmo com várias fontes de cura.</li>\n        <li>Poderes e tratamentos que removem Ferido fora do descanso precisam declarar isso explicitamente.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Quando rolar ferimento crítico</h3>\n      <ul class=\"regras-list\">\n        <li>Quando um único golpe causar dano igual ou superior à metade dos seus PV máximos.</li>\n        <li>Quando você obtiver falha crítica em um teste de Morrendo.</li>\n        <li>Role apenas uma vez por fonte de dano, mesmo que os dois gatilhos aconteçam.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Tabela de trauma (2d6)</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table regras-table--probability\">\n        <thead><tr><th>2d6</th><th>Chance</th><th>Resultado</th></tr></thead>\n        <tbody>\n          <tr><td>2</td><td>2,8%</td><td><strong>Trauma mortal:</strong> aumente Morrendo em 1.</td></tr>\n          <tr><td>3–4</td><td>13,9%</td><td><strong>Hemorragia:</strong> desvantagem no próximo teste de Morrendo até ser estabilizado.</td></tr>\n          <tr><td>5–6</td><td>25%</td><td><strong>Fratura:</strong> −2 em testes físicos até tratamento e descanso completo.</td></tr>\n          <tr><td>7–8</td><td>30,6%</td><td><strong>Choque:</strong> perca 1d4 Mana e sua próxima reação.</td></tr>\n          <tr><td>9–10</td><td>19,4%</td><td><strong>Cicatriz:</strong> consequência narrativa e −1 contextual até ser tratada.</td></tr>\n          <tr><td>11</td><td>5,6%</td><td><strong>Instinto:</strong> vantagem no próximo teste de Morrendo.</td></tr>\n          <tr><td>12</td><td>2,8%</td><td><strong>Aqui não é o final:</strong> estabilize e volte imediatamente com 1 PV.</td></tr>\n        </tbody>\n      </table></div>\n    "
  },
  "coreografia": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Risco escolhido antes do dado, recompensa limitada e consequências que criam cena em vez de encerrar o combate.",
    "destaques": [
      [
        "Uso",
        "1 vez por turno"
      ],
      [
        "Declaração",
        "antes da rolagem"
      ],
      [
        "Tudo ou Nada",
        "1 vez por cena"
      ]
    ],
    "corpo": "\n      <p class=\"regras-lead\">Em um confronto direto, descreva uma ação cinematográfica possível e escolha o risco antes de rolar. A descrição precisa mudar a ficção; não basta declarar o bônus.</p>\n\n      <h3 class=\"regras-subtitle\">Níveis de risco</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Risco</th><th>Se tiver sucesso</th><th>Se falhar</th></tr></thead>\n        <tbody>\n          <tr><td>Seguro</td><td>Reposicione-se 1,5 m após a ação.</td><td>Sem consequência adicional.</td></tr>\n          <tr><td>Ousado</td><td>+2 no teste e +2 no dano.</td><td>Fica Exposto: −2 Defesa até seu próximo turno.</td></tr>\n          <tr><td>Arriscado</td><td>Vantagem e +1 dado da arma no dano.</td><td>Sofre 1d8 de dano e perde a ação de movimento.</td></tr>\n          <tr><td>Perigoso</td><td>O ataque se torna crítico se acertar.</td><td>Cai e o inimigo recebe vantagem no próximo ataque contra você.</td></tr>\n          <tr><td>Tudo ou Nada</td><td>Crítico com dados maximizados.</td><td>Sofre um crítico do inimigo e recebe Ferido 1. Uma vez por cena.</td></tr>\n        </tbody>\n      </table></div>\n      <p class=\"regras-note\">O mestre pode limitar uma Coreografia que não altere a ficção ou que repita a mesma descrição apenas para buscar o bônus.</p>\n    "
  },
  "descanso": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Recuperação percentual que continua útil em todos os níveis e uma trilha de Cansaço sem frações.",
    "destaques": [
      [
        "Descanso",
        "8 horas"
      ],
      [
        "Relaxar",
        "1 hora, 1 vez"
      ],
      [
        "Cansaço",
        "0–6"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Descanso completo</h3>\n      <ul class=\"regras-list\">\n        <li><strong>Péssima:</strong> menos de 4 horas, duas interrupções perigosas ou exposição severa.</li>\n        <li><strong>Ruim:</strong> entre 4 e 7 horas ou local inseguro, sem abrigo, alimento ou água suficientes.</li>\n        <li><strong>Boa:</strong> 8 horas, abrigo básico, alimento, água e no máximo uma interrupção curta.</li>\n        <li><strong>Maravilhosa:</strong> 8 horas em local seguro, cama adequada, refeição completa e sem interrupções.</li>\n        <li><strong>Excelente:</strong> santuário protegido com conforto e cuidado médico ou sobrenatural. Exige autorização do mestre.</li>\n      </ul>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Qualidade</th><th>PV e Mana</th><th>Sanidade</th><th>Reduz Cansaço</th></tr></thead>\n        <tbody>\n          <tr><td>Péssima</td><td>10% do máximo</td><td>0%</td><td>1</td></tr>\n          <tr><td>Ruim</td><td>25% do máximo</td><td>5%</td><td>2</td></tr>\n          <tr><td>Boa</td><td>50% do máximo</td><td>10%</td><td>3</td></tr>\n          <tr><td>Maravilhosa</td><td>75% do máximo</td><td>20%</td><td>4</td></tr>\n          <tr><td>Excelente</td><td>100% do máximo</td><td>35%</td><td>todo o Cansaço</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Relaxar</h3>\n      <div class=\"regras-formula\">Recupere 1d6 + Mod.Sabedoria + ⌊Nível ÷ 4⌋ de Mana</div>\n      <ul class=\"regras-list\">\n        <li>Exige uma hora em segurança relativa e só funciona uma vez entre descansos completos.</li>\n        <li>Uma atividade pessoal significativa pode recuperar também 1 ponto de Cansaço, a critério do mestre.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Cansaço</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Nível</th><th>Efeito</th></tr></thead>\n        <tbody>\n          <tr><td>0: Disposto</td><td>Sem penalidade.</td></tr>\n          <tr><td>1: Cansado</td><td>−1 em testes físicos.</td></tr>\n          <tr><td>2: Fatigado</td><td>−2 em testes físicos e −1 Iniciativa.</td></tr>\n          <tr><td>3: Esgotado</td><td>−2 em todos os testes.</td></tr>\n          <tr><td>4: Exausto</td><td>Desvantagem em testes físicos; não pode treinar.</td></tr>\n          <tr><td>5: Debilitado</td><td>Movimento pela metade e sem reações.</td></tr>\n          <tr><td>6: Colapso</td><td>Inconsciente até reduzir Cansaço.</td></tr>\n        </tbody>\n      </table></div>\n      <p class=\"regras-note\">Um combate é intenso quando o personagem chega à metade dos PV, gasta metade da Mana ou entra em Morrendo. A cena gera apenas 1 Cansaço, mesmo com vários gatilhos. Seis horas de treino e uma noite sem dormir também geram 1 Cansaço. Use apenas valores inteiros.</p>\n    "
  },
  "treinar": {
    "categoria": "Livro do Jogador",
    "status": "Regra oficial",
    "resumo": "Treino exige tempo e um Grau de Treinamento; dinheiro ou dias livres não compram sozinhos o maior bônus do jogo.",
    "destaques": [
      [
        "Dia de treino",
        "6 horas"
      ],
      [
        "Recurso",
        "Grau de Treinamento"
      ],
      [
        "Maior grau",
        "Renomado"
      ]
    ],
    "corpo": "\n      <p class=\"regras-lead\">Para subir uma perícia em um grau, você precisa receber um Grau de Treinamento pela tabela de classe ou por uma recompensa explícita e cumprir o treinamento. O tempo sozinho nunca concede o avanço.</p>\n\n      <h3 class=\"regras-subtitle\">Progressão</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Avanço</th><th>Tempo</th><th>Requisito</th></tr></thead>\n        <tbody>\n          <tr><td>Iniciante → Aprendiz</td><td>3 dias</td><td>1 Grau de Treinamento; nível 1</td></tr>\n          <tr><td>Aprendiz → Treinado</td><td>7 dias</td><td>1 Grau de Treinamento; nível 3</td></tr>\n          <tr><td>Treinado → Especialista</td><td>14 dias</td><td>1 Grau de Treinamento; nível 7</td></tr>\n          <tr><td>Especialista → Mestre</td><td>21 dias</td><td>1 Grau de Treinamento; nível 13 e instrutor</td></tr>\n          <tr><td>Mestre → Veterano</td><td>32 dias</td><td>1 Grau de Treinamento; nível 19 e feito notável</td></tr>\n          <tr><td>Veterano → Renomado</td><td>62 dias</td><td>1 Grau de Treinamento; nível 29, feito e item especial</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Regras de treinamento</h3>\n      <ul class=\"regras-list\">\n        <li>Cada dia exige seis horas e gera 1 Cansaço ao final; descansar normalmente pode removê-lo.</li>\n        <li>Um instrutor de grau superior reduz o tempo em 20%, arredondado para cima.</li>\n        <li>Interrupções não apagam progresso, mas mais de 30 dias parado exigem um dia de revisão.</li>\n        <li>Treinamento não exige rolagens repetidas; o custo já é tempo, oportunidade e recurso de progressão.</li>\n      </ul>\n    "
  },
  "xp": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Uma progressão global para todos os personagens e um único modelo usado por todas as classes.",
    "destaques": [
      [
        "Níveis",
        "1–40"
      ],
      [
        "Legado",
        "a cada 5 níveis"
      ],
      [
        "Atributo",
        "+1 a cada 4 níveis"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Progressão do nível total</h3>\n      <p class=\"regras-lead\">Sempre que subir de nível, escolha uma de suas classes e aumente o nível dela em 1. As recompensas abaixo usam o nível total e nunca se repetem por multiclasse.</p>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Níveis totais</th><th>Recompensa global</th></tr></thead>\n        <tbody>\n          <tr><td>Todos os níveis</td><td>+1 nível em uma classe escolhida</td></tr>\n          <tr><td>4, 8, 12, 16, 20, 24, 28, 32, 36 e 40</td><td>+1 em um atributo, respeitando o limite natural 20</td></tr>\n          <tr><td>5, 10, 15, 20, 25, 30, 35 e 40</td><td>1 Legado de Ascensão</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Especialização e multiclasse</h3>\n      <ul class=\"regras-list\">\n        <li>Uma classe pode chegar ao nível 20 sem que o personagem possua outra classe.</li>\n        <li>Para aumentar o nível total depois disso, invista em outra classe.</li>\n        <li>Classes especiais exigem nível total 15, consomem nível normalmente e não contam no limite de duas classes comuns.</li>\n        <li>Classes comuns podem ser escolhidas em qualquer Árvore. Classes especiais exigem liberação do Mestre e só podem ser escolhidas nas Árvores indicadas em suas páginas.</li>\n        <li>Viajante é compatível com Matriz, Éon e Vórtice; possuir afinidade com várias Árvores não a torna uma classe comum.</li>\n        <li>Ao entrar em uma nova classe, você não recebe novamente equipamento, dinheiro ou outros benefícios de criação.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Fórmula de progressão</h3>\n      <div class=\"regras-formula\">XP total do nível N = 500 × N × (N − 1)</div>\n      <p class=\"regras-note\">O custo para passar do nível N ao N+1 é N × 1.000 XP. A tabela antiga desviava 1.000 XP a partir do nível 24.</p>\n\n      <h3 class=\"regras-subtitle\">Tabela completa</h3>\n      <div class=\"regras-xp-grid regras-xp-grid--revised\"><span><strong>N1</strong>0 XP</span><span><strong>N2</strong>1.000 XP</span><span><strong>N3</strong>3.000 XP</span><span><strong>N4</strong>6.000 XP</span><span><strong>N5</strong>10.000 XP</span><span><strong>N6</strong>15.000 XP</span><span><strong>N7</strong>21.000 XP</span><span><strong>N8</strong>28.000 XP</span><span><strong>N9</strong>36.000 XP</span><span><strong>N10</strong>45.000 XP</span><span><strong>N11</strong>55.000 XP</span><span><strong>N12</strong>66.000 XP</span><span><strong>N13</strong>78.000 XP</span><span><strong>N14</strong>91.000 XP</span><span><strong>N15</strong>105.000 XP</span><span><strong>N16</strong>120.000 XP</span><span><strong>N17</strong>136.000 XP</span><span><strong>N18</strong>153.000 XP</span><span><strong>N19</strong>171.000 XP</span><span><strong>N20</strong>190.000 XP</span><span><strong>N21</strong>210.000 XP</span><span><strong>N22</strong>231.000 XP</span><span><strong>N23</strong>253.000 XP</span><span><strong>N24</strong>276.000 XP</span><span><strong>N25</strong>300.000 XP</span><span><strong>N26</strong>325.000 XP</span><span><strong>N27</strong>351.000 XP</span><span><strong>N28</strong>378.000 XP</span><span><strong>N29</strong>406.000 XP</span><span><strong>N30</strong>435.000 XP</span><span><strong>N31</strong>465.000 XP</span><span><strong>N32</strong>496.000 XP</span><span><strong>N33</strong>528.000 XP</span><span><strong>N34</strong>561.000 XP</span><span><strong>N35</strong>595.000 XP</span><span><strong>N36</strong>630.000 XP</span><span><strong>N37</strong>666.000 XP</span><span><strong>N38</strong>703.000 XP</span><span><strong>N39</strong>741.000 XP</span><span><strong>N40</strong>780.000 XP</span></div>\n\n      <h3 class=\"regras-subtitle\">Recompensas por marco</h3>\n      <ul class=\"regras-list\">\n        <li><strong>Descoberta ou objetivo menor:</strong> 10% do próximo nível.</li>\n        <li><strong>Missão relevante:</strong> 25% do próximo nível.</li>\n        <li><strong>Fim de arco:</strong> 50% do próximo nível.</li>\n        <li>Divida XP de combate pelo grupo; XP de descoberta e arco é concedido igualmente.</li>\n      </ul>\n    "
  },
  "legados": {
    "categoria": "Livro do Jogador",
    "status": "Publicado para playtest",
    "resumo": "Legados são escolhas permanentes de ascensão, recebidas por nível total e validadas pela ficha.",
    "destaques": [
      [
        "Catálogo",
        "42 Legados"
      ],
      [
        "Marco",
        "a cada 5 níveis"
      ],
      [
        "Escolha",
        "permanente"
      ]
    ],
    "corpo": "\n      <p class=\"regras-lead\">Nos níveis totais 5, 10, 15, 20, 25, 30, 35 e 40, escolha um Legado de Ascensão cujos pré-requisitos sejam atendidos. A raça pode conceder vagas adicionais quando isso estiver escrito no catálogo racial.</p>\n      <ul class=\"regras-list\">\n        <li>Um Legado não pode ser removido ou trocado pelo jogador depois de adquirido.</li>\n        <li>Legados não são recompensas de classe. Multiclasse não repete os marcos.</li>\n        <li>Um Legado só pode ser escolhido novamente quando estiver marcado como repetível e respeitando seu limite.</li>\n        <li>Pré-requisitos de nível, atributo e perícia são verificados no momento da escolha.</li>\n        <li>O Mestre pode autorizar uma troca apenas para corrigir erro de criação ou mudança oficial das regras.</li>\n      </ul>\n    "
  },
  "equipamentos": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Armaduras, escudos, carga, proficiência, munição e Resistência usam limites únicos na ficha.",
    "destaques": [
      [
        "Carga",
        "10 + 2 × Mod.Força positivo + metade do nível"
      ],
      [
        "Armadura",
        "1 principal, 1 malha e 1 escudo"
      ],
      [
        "Resistência",
        "reduz dano após o crítico"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Carga e espaços</h3>\n      <div class=\"regras-formula\">Capacidade = 10 + (2 × Mod.Força positivo) + ⌊Nível total ÷ 2⌋, mínimo 5</div>\n      <ul class=\"regras-list\">\n        <li>Cada item ocupa os espaços declarados no catálogo, multiplicados pela quantidade.</li>\n        <li>Acima da capacidade, o personagem fica Sobrecarregado: movimento reduzido em 3 m e desvantagem em testes físicos.</li>\n        <li>Recipientes e habilidades só aumentam a capacidade quando trazem um valor explícito.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Armaduras e escudos</h3>\n      <ul class=\"regras-list\">\n        <li>Equipe no máximo uma armadura principal, uma malha compatível por baixo e um escudo.</li>\n        <li>Os bônus de Defesa dessas três peças somam. Duas armaduras principais nunca somam.</li>\n        <li>A penalidade total de armadura se aplica a Acrobacia, Atletismo e Furtividade.</li>\n        <li>Sem proficiência no subtipo, dobre a penalidade da peça e não use habilidades que exijam proficiência.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Resistência e tipos de dano</h3>\n      <ol class=\"regras-steps\">\n        <li>Role o dano e aplique o multiplicador crítico aos dados e modificadores que fazem parte do ataque.</li>\n        <li>Some dados extras declarados pelo efeito. Dados extras só multiplicam se a fonte disser isso.</li>\n        <li>Aplique vulnerabilidade ou redução percentual.</li>\n        <li>Subtraia a Resistência correspondente ao tipo de dano, até o mínimo 0.</li>\n      </ol>\n      <p class=\"regras-note\">Resistência física geral cobre corte, perfuração e impacto, mas não dano balístico. Resistência de um tipo específico não protege contra outros tipos.</p>\n\n      <h3 class=\"regras-subtitle\">Armas, proficiência e munição</h3>\n      <ul class=\"regras-list\">\n        <li>Armas simples podem ser usadas por qualquer personagem. Armas marciais e exóticas exigem proficiência correspondente.</li>\n        <li>Sem proficiência, o ataque sofre -5 e não pode ativar propriedades especiais da arma.</li>\n        <li>Armas de disparo gastam uma unidade de munição por ataque, salvo propriedade diferente. Sem munição, o ataque não pode ser realizado.</li>\n        <li>Recarregar um carregador usa ação de movimento. Munição avulsa e armas pesadas podem exigir ação padrão quando declarado.</li>\n      </ul>\n    "
  },
  "magia-fluxo": {
    "categoria": "Livro do Jogador",
    "status": "Regra oficial para playtest",
    "resumo": "Acesso, teste, DT, círculos, Mana, concentração, críticos e o primeiro catálogo de magia.",
    "destaques": [
      [
        "Teste",
        "d20 + Fluxo + nível/2 + Misticismo"
      ],
      [
        "Círculos",
        "1º ao 5º e Ritual"
      ],
      [
        "Custos",
        "2 / 4 / 6 / 8 / 10 Mana"
      ]
    ],
    "corpo": "\n      <p class=\"regras-lead\">Magia é uma aplicação estruturada de um Fluxo. Mana paga a manifestação, Fluxo mede o controle do conjurador e Misticismo representa treinamento. O catálogo inicial está publicado para playtest; ajustes futuros devem preservar esta matemática central.</p>\n\n      <h3 class=\"regras-subtitle\">Acesso e magias conhecidas</h3>\n      <ul class=\"regras-list\">\n        <li>Ter Fluxo alto não ensina magia. O acesso vem de uma classe, habilidade, item, Legado ou concessão do Mestre.</li>\n        <li>Cada fonte informa tradições, círculo máximo e quantidade de magias conhecidas.</li>\n        <li>Escolher uma magia conhecida é permanente. O Mestre pode permitir troca durante treinamento ou mudança narrativa.</li>\n        <li>Manifestações narrativas sem círculo não causam dano, não impõem condições e não substituem perícias.</li>\n      </ul>\n\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Fonte atual</th><th>Progressão publicada</th></tr></thead>\n        <tbody>\n          <tr><td>Elementarista</td><td>N3: 2 magias de até 1º; N8: 4 de até 2º; N14: 6 de até 3º; N20: 8 de até 4º.</td></tr>\n          <tr><td>Cartista Arcano</td><td>N10: 3 magias elementais de 1º; N15: 4 magias de até 2º.</td></tr>\n          <tr><td>5º círculo e Ritual</td><td>Exigem uma fonte específica ainda não publicada ou concessão do Mestre.</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Teste e DT de magia</h3>\n      <div class=\"regras-formula\">Teste de conjuração = d20 + Mod. Fluxo + ⌊Nível total ÷ 2⌋ + Grau de Misticismo</div>\n      <div class=\"regras-formula\">DT de magia = 10 + Mod. Fluxo + ⌊Nível total ÷ 2⌋ + Grau de Misticismo</div>\n      <ul class=\"regras-list\">\n        <li>Quando a magia indicar uma Defesa, faça um teste de conjuração e compare o mesmo resultado à Defesa passiva de cada alvo.</li>\n        <li>Magias sem Defesa funcionam sem teste, salvo pressão, interrupção ou oposição indicada pelo Mestre.</li>\n        <li>Bônus raciais de Misticismo entram nas duas fórmulas. Outros bônus só entram quando citarem magia ou conjuração.</li>\n        <li>Um 1 natural sempre falha no teste. Um 20 natural sempre acerta, mas só magias de alvo único marcadas como ataque causam crítico.</li>\n        <li>No crítico mágico, dobre apenas os dados de dano da magia. Áreas, cura, barreiras, condições e dano contínuo não são multiplicados.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Círculos, Fluxo e Mana</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Círculo</th><th>Fluxo mínimo</th><th>Custo base</th><th>Dano de alvo</th><th>Dano de área</th></tr></thead>\n        <tbody>\n          <tr><td>1º</td><td>8</td><td>2 Mana</td><td>2d8</td><td>2d6</td></tr>\n          <tr><td>2º</td><td>12</td><td>4 Mana</td><td>4d8</td><td>4d6</td></tr>\n          <tr><td>3º</td><td>14</td><td>6 Mana</td><td>6d8</td><td>6d6</td></tr>\n          <tr><td>4º</td><td>16</td><td>8 Mana</td><td>8d8</td><td>8d6</td></tr>\n          <tr><td>5º</td><td>18</td><td>10 Mana</td><td>10d8</td><td>10d6</td></tr>\n        </tbody>\n      </table></div>\n      <p class=\"regras-note\">O personagem usa o menor limite entre o círculo liberado por sua fonte e o círculo permitido por Fluxo. Uma redução nunca baixa o custo de uma magia para menos de 1 Mana, salvo uma habilidade que diga expressamente custo 0.</p>\n\n      <h3 class=\"regras-subtitle\">Concentração</h3>\n      <ul class=\"regras-list\">\n        <li>Você mantém apenas uma magia ou efeito de concentração por vez. Começar outro encerra o anterior imediatamente.</li>\n        <li>Ao sofrer dano, teste Vontade contra DT 10 ou metade do dano recebido, o que for maior. Falha encerra a concentração.</li>\n        <li>Ficar Atordoado, Inconsciente ou incapaz de agir encerra a concentração. Encerrar voluntariamente não exige ação.</li>\n        <li>A duração máxima consta na magia. Pagar Mana novamente não estende uma conjuração já ativa.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Rituais e maestria em Fluxo</h3>\n      <ul class=\"regras-list\">\n        <li>Rituais não pertencem a um círculo, não causam crítico e exigem o tempo, o alvo e o custo próprios do catálogo.</li>\n        <li>Interromper um ritual antes do final não gasta Mana. A reserva é paga quando o efeito é concluído.</li>\n        <li>Rituais não servem como ação de combate, mesmo quando o grupo tenta reduzir seu tempo.</li>\n        <li><strong>Fluxo 20:</strong> uma vez por cena, repita um teste de conjuração ou de concentração e mantenha o novo resultado.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Catálogo inicial</h3>\n      <p class=\"regras-note\">O catálogo estruturado em <strong>data/ficha/magias.json</strong> contém 25 magias elementais, cinco em cada círculo, e três rituais universais. A ficha mostra custo, execução, alcance, duração, Defesa e concentração diretamente dessa fonte.</p>\n    "
  },
  "condicoes": {
    "categoria": "Combate e Mecânicas",
    "status": "Regra oficial",
    "resumo": "Estados mentais e físicos que penalizam o personagem.",
    "destaques": [
      [
        "Sanidade",
        "0–100"
      ],
      [
        "Iniciativa",
        "valor estático"
      ],
      [
        "Defesa passiva",
        "10 + bônus"
      ]
    ],
    "corpo": "\n      <h3 class=\"regras-subtitle\">Sanidade</h3>\n      <div class=\"regras-formula\">d20 + bônus da perícia Sanidade ou Vontade contra DT 10 / 15 / 20 / 25</div>\n      <ul class=\"regras-list\">\n        <li>Falha causa 1d4, 1d6, 1d8 ou 2d6 de perda, conforme a intensidade do evento.</li>\n        <li>Sucesso crítico evita toda perda; sucesso reduz a perda à metade; falha crítica maximiza os dados.</li>\n      </ul>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Sanidade</th><th>Estado</th><th>Efeito</th></tr></thead>\n        <tbody>\n          <tr><td>76–100</td><td>Estável</td><td>Sem efeito.</td></tr>\n          <tr><td>51–75</td><td>Abalado</td><td>−1 no primeiro teste mental após perder Sanidade.</td></tr>\n          <tr><td>26–50</td><td>Enlouquecendo</td><td>Desvantagem para manter concentração sob ameaça.</td></tr>\n          <tr><td>1–25</td><td>Ruptura</td><td>Ao sofrer nova perda, teste Vontade DT 15 ou ganhe uma condição de crise.</td></tr>\n          <tr><td>0</td><td>Quebra</td><td>Crise imediata e uma condição permanente definida com o jogador.</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Crises</h3>\n      <ul class=\"regras-list\">\n        <li>Em Ruptura, cada nova perda exige Vontade DT 15. Falha gera Pânico, Dissociação, Paranoia, Catatonia, Compulsão ou Fúria.</li>\n        <li>Pânico, Dissociação, Catatonia e Fúria duram 1d4 rodadas e permitem Vontade DT 15 no fim do turno.</li>\n        <li>Paranoia dura até o fim da cena. Compulsão permite Vontade DT 15 no começo do turno para agir normalmente.</li>\n        <li>Em Sanidade 0, a crise é imediata. Depois da cena, o personagem permanece com 0 até receber descanso e tratamento em segurança.</li>\n        <li>Uma condição permanente em Quebra deve ser definida com o jogador e só muda por resolução narrativa ou tratamento prolongado.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Condições gerais</h3>\n      <div class=\"regras-table-wrap\"><table class=\"regras-table\">\n        <thead><tr><th>Condição</th><th>Efeito principal</th><th>Remoção</th></tr></thead>\n        <tbody>\n          <tr><td>Amedrontado</td><td>Desvantagem contra a fonte e não se aproxima dela.</td><td>Vontade contra a DT da fonte no fim do turno.</td></tr>\n          <tr><td>Exposto</td><td>-2 Defesa.</td><td>Começo do próximo turno.</td></tr>\n          <tr><td>Caído</td><td>-2 em ataques; ataques corpo a corpo contra você recebem +2.</td><td>Ação de movimento para levantar.</td></tr>\n          <tr><td>Sangramento</td><td>1d6 de dano no fim do turno; aplicações extras dão +1, até +5.</td><td>Cura DT 15 ou recuperar pelo menos 1 PV.</td></tr>\n          <tr><td>Atordoado</td><td>Sem ações ou reações e -5 Defesa.</td><td>Fim da duração.</td></tr>\n          <tr><td>Concentrando</td><td>Mantém um efeito; dano exige Vontade DT 10 ou metade do dano.</td><td>Falha no teste, incapacidade ou encerramento voluntário.</td></tr>\n        </tbody>\n      </table></div>\n\n      <h3 class=\"regras-subtitle\">Iniciativa estática</h3>\n      <ul class=\"regras-list\">\n        <li>Iniciativa = 10 + metade do nível + Mod.Destreza + bônus.</li>\n        <li>Empates: maior Mod.Sabedoria; persistindo, personagens agem antes de NPCs.</li>\n        <li>Surpreendido impõe −5 na primeira rodada. Atrasar reduz voluntariamente sua posição pelo resto do combate.</li>\n      </ul>\n\n      <h3 class=\"regras-subtitle\">Defesas passivas</h3>\n      <ul class=\"regras-list\">\n        <li>Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir uma rolagem, use <strong>10 + bônus total</strong>.</li>\n        <li>Quando você resiste diretamente a um perigo, role o d20 com o mesmo bônus.</li>\n      </ul>\n    "
  },
  "classes": {
    "categoria": "Livro do Jogador",
    "status": "Publicado para playtest",
    "resumo": "Classes comuns servem a qualquer Árvore; classes especiais são mais fortes, restritas às Árvores indicadas e exigem liberação do Mestre.",
    "destaques": [
      [
        "Classes",
        "24 catalogadas"
      ],
      [
        "Comuns / especiais",
        "13 / 11"
      ],
      [
        "Progressões publicadas",
        "24"
      ]
    ],
    "corpo": "<!-- CLASSES_DATA -->"
  },
  "racas": {
    "categoria": "Livro do Jogador",
    "status": "Publicado para playtest",
    "resumo": "Raças comuns podem nascer em qualquer Árvore; raças especiais são mais fortes e aparecem somente nas Árvores compatíveis.",
    "destaques": [
      [
        "Raças",
        "20 publicadas, 1 adiada"
      ],
      [
        "Comuns / especiais",
        "12 / 9"
      ],
      [
        "Ajustes",
        "Vida, Mana e Mov."
      ]
    ],
    "corpo": "<!-- RACAS_DATA -->"
  }
};

export function regraOficialPorId(id) {
  return REGRAS_OFICIAIS[id] || null;
}
