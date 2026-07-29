# Regras públicas de O Jardim RPG

> Arquivo gerado de `src/data/regras.ts`. Não edite manualmente.

## sistema-base

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Criação de personagem, atributos, Mana e as fórmulas centrais da versão 1.0.

Quando uma ação tiver risco real, role um d20, some o bônus relevante e compare com a Dificuldade do Teste. Resultado igual ou maior que a DT é sucesso.

### Criação de personagem

- **Defina os atributos** pelo conjunto padrão ou pela compra de pontos descrita abaixo.

- **Escolha** uma raça comum e, quando exigido, sua variante. Ela define ajustes iniciais, fisiologia e características.

- **Escolha** seis perícias para começar em Aprendiz. Humanos escolhem sete por Adaptabilidade.

- **Escolha** uma classe comum. Ela define os ganhos de Vida e Mana dos níveis posteriores.

- **Receba** um item comum e 20 Lunaris.

### Métodos de atributos

- **Conjunto padrão:** organize 15, 14, 13, 12, 10, 8 e 8 livremente entre os sete atributos. Cada valor é usado uma vez.

- **Compra por pontos:** todos os sete atributos começam em 8. Distribua exatamente 24 pontos, na proporção de 1 ponto para +1 no atributo. Nenhum atributo pode passar de 15 antes dos ajustes raciais.

- **Equivalência:** o conjunto padrão também consome exatamente 24 pontos. Assim, os dois métodos oficiais possuem o mesmo total de atributos, mas a compra permite maior especialização.

**Variante aleatória:** com autorização do mestre, role 7d20 e organize os sete resultados, usando cada dado uma vez. Essa opção pode criar personagens muito mais fortes ou muito mais fracos e, por isso, não é considerada equivalente aos dois métodos oficiais.

### Fórmulas fundamentais

- **Modificador:** ⌊(Atributo − 10) ÷ 2⌋

- **Teste:** d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau

- **Vida inicial:** máx. 1, 10 + (2 × Mod.Força) + (2 × Mod.Constituição) + ajuste da raça

- **Vida por nível:** ganho da classe + Mod.Constituição, mínimo 1

- **Mana inicial:** máx. 1, 6 + (2 × Mod.Inteligência) + Mod.Sabedoria + ajuste da raça

- **Mana por nível:** ganho de Mana da classe, mínimo 1

- **Defesa Natural:** 10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + equipamento

- **Movimento:** 9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m

- **Iniciativa:** 10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus

### Nível e multiclasse

- **Nível total** é a soma dos níveis de todas as classes, inclusive especiais.

- Cada classe possui no máximo **20 níveis**; o personagem possui no máximo **40 níveis totais**.

- O limite é de **duas classes comuns e uma classe especial**.

- Depois de alcançar nível 20 em uma classe, escolha outra classe para continuar aumentando o nível total.

- Classes especiais exigem nível total 15 e um acontecimento narrativo, salvo exceção declarada pela própria classe.

- Classes gerais podem ser obtidas em qualquer Árvore; classes exclusivas exigem que o personagem pertença à Árvore indicada.

### Maestria de atributo

Ao alcançar valor 20 sem itens, pactos ou efeitos temporários, receba a maestria correspondente. Intervenções externas podem elevar o atributo acima de 20, mas não concedem outra maestria. Entre os pacotes raciais publicados, somente Intelecto Élfico pode ultrapassar esse limite: +4 em Inteligência, até o máximo 24. Essa permissão não se aplica a outros atributos.

- **Força:** uma vez por turno, +2 no dano de um ataque corpo a corpo.

- **Destreza:** +1 na Defesa Natural ou +1,5 m de movimento.

- **Constituição:** você morre em Morrendo 4, em vez de Morrendo 3.

- **Inteligência:** torne-se Aprendiz em duas perícias.

- **Sabedoria:** reduza em 2 a primeira perda de Sanidade de cada cena.

- **Carisma:** uma vez por cena, repita um teste social; mantenha o novo resultado.

### Fluxo

**Fluxo** é o sétimo atributo. Ele mede controle e capacidade de canalização. Em magia, substitui o atributo normalmente ligado a Misticismo e limita o maior círculo que o personagem consegue conjurar com segurança. Fluxo alto não concede magias sozinho: uma classe, habilidade, item ou decisão do Mestre precisa fornecer acesso.

## pericias

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Uma única fórmula para perícias, ataques e resistências, com DTs que acompanham o nível.

### Fórmula de teste

d20 + Mod. de Atributo + ⌊Nível total ÷ 2⌋ + bônus do Grau

Luta e Pontaria usam a mesma fórmula. Fortitude, Reflexos e Vontade são perícias e também fornecem as respectivas Defesas passivas.

### Graus de perícia

- Grau | Bônus | Nível mínimo sugerido

- Iniciante | +0 | 1

- Aprendiz | +2 | 1

- Treinado | +4 | 3

- Especialista | +6 | 7

- Mestre | +8 | 13

- Veterano | +10 | 19

- Renomado | +12 | 29

### Graus de resultado

- **Sucesso crítico:** o d20 mostra 20 natural.

- **Sucesso:** resultado igual ou superior à DT.

- **Falha:** resultado abaixo da DT.

- **Falha crítica:** o d20 mostra 1 natural.

- Somar 10 ou mais acima da DT não transforma o teste em crítico.

- Se uma ação for impossível, o Mestre não pede a rolagem. Quando houver rolagem, o 20 natural é um sucesso crítico.

### Vantagem e desvantagem

- Role dois d20 e use o maior com vantagem ou o menor com desvantagem.

- Registre cada fonte de vantagem e desvantagem; elas se anulam uma a uma.

- Depois da anulação, qualquer saldo positivo concede uma vantagem e qualquer saldo negativo impõe uma desvantagem.

- O tamanho do saldo não acrescenta mais dados: ele registra quantas fontes ainda sustentam a condição.

## combate

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Regras de turno, ações, deslocamento, vida e dano em batalha.

### Seu turno

- **Ação Padrão:** atacar, usar habilidade, prestar auxílio ou realizar uma manobra.

- **Ação de Movimento:** deslocar-se, levantar, sacar ou manipular um objeto relevante.

- **Ação Livre:** gesto ou fala breve. O mestre limita repetições que tenham impacto mecânico.

- Você pode converter sua Ação Padrão em uma segunda Ação de Movimento.

### Ataques e cobertura

d20 + Luta ou Pontaria contra a Defesa Natural

- Igualar a Defesa acerta. Um 1 natural sempre erra.

- Cada arma informa sua **Margem de Ameaça** e seu **Multiplicador Crítico**, escritos como 20/x2, 19-20/x2 ou 20/x3.

- Se o número natural do d20 estiver dentro da margem da arma, o ataque acerta e se torna crítico. Não há rolagem de confirmação.

- O multiplicador indica quantas vezes os dados da arma são rolados. Em x3, 2d6+4 vira 6d6+4.

- Bônus fixos e dados adicionais de habilidades, venenos ou efeitos externos entram uma vez, salvo quando a própria habilidade disser o contrário.

- Para balanceamento, margens 18-20 e 19-20 usam x2; multiplicadores x3 e x4 usam margem 20.

- Cobertura parcial concede +2 de Defesa; cobertura superior concede +5.

- Perfil | Chance | Aumento médio nos dados | Uso sugerido

- 20/x2 | 5% | +5% | Arma equilibrada

- 19-20/x2 | 10% | +10% | Arma precisa

- 18-20/x2 | 15% | +15% | Arma de margem ampla

- 20/x3 | 5% | +10% | Arma pesada

- 20/x4 | 5% | +15% | Arma brutal ou excepcional

### Reações

Você recupera sua reação no início do próprio turno. Defesa Natural não gasta reação.

- Reação | Gatilho | Efeito

- Esquiva | Antes da rolagem contra você | +4 de Defesa contra um ataque. Se errar, mova 1,5 m sem provocar reação.

- Bloqueio | Após sofrer dano físico | Reduza o dano em 2 + ⌊Nível ÷ 2⌋ + bônus do escudo. Exige escudo ou arma adequada.

- Contra-Ataque | Inimigo adjacente erra você | Faça um ataque com −2. Ele não pode gerar crítico.

- Proteger | Aliado adjacente é atacado | Você vira o alvo e pode usar Bloqueio, se ainda tiver reação.

### Tipos de dano

- **Físicos:** corte, perfuração, impacto e balístico.

- **Persistentes:** sangramento, fogo e veneno; causam dano no fim do turno até serem removidos.

- **Energia:** elemental, Arkania, tecnologia e Fluxos.

- **Mental:** afeta Sanidade ou Vida conforme a fonte.

## distancias

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Faixas mantidas, agora com regra de alcance e conversão clara para mapas.

### Faixas de distância

**Adjacente**até 1,5 m

**Curto**até 5 m

**Médio**até 15 m

**Longo**até 25 m

**Longo+**até 50 m

**Extremo**até 90 m

**Colossal**até 150 m

**Lunar**até 200 m

**Estelar**até 500 m

**Galáctico**até 1.000 m

### Alcance de armas e poderes

- Dentro do alcance indicado, ataque normalmente.

- Uma faixa além do alcance impõe −5 no ataque; duas faixas impõem −10.

- Acima de duas faixas, o alvo não pode ser atingido sem habilidade ou item específico.

- Em mapa tático, arredonde deslocamentos para múltiplos de 1,5 m.

## ferimentos

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Vida negativa torna cada queda diferente, enquanto Morrendo dá tempo para decisões de resgate.

### Vida negativa

- Continue registrando o dano abaixo de 0. Esse valor é o **Déficit de Vida**.

- A cura primeiro reduz o Déficit. O personagem só desperta quando voltar a 1 PV ou mais.

- Se o Déficit alcançar a Vida máxima do personagem, ele morre imediatamente.

### Gravidade da queda

- Déficit em relação à Vida máxima | Gravidade | DT base

- 0% a 10% | 0 | 12 + Ferido

- Acima de 10% até 25% | 1 | 14 + Ferido

- Acima de 25% até 50% | 2 | 16 + Ferido

- Acima de 50% até 75% | 3 | 18 + Ferido

- Acima de 75% | 4 | 20 + Ferido

### Morrendo

- Ao chegar a 0 PV ou menos, fique inconsciente e receba **Morrendo 1**.

- No fim de cada turno, faça Fortitude contra **DT 12 + (2 × Gravidade) + Ferido**.

- Sucesso mantém Morrendo; sucesso crítico reduz em 1; falha aumenta em 1; falha crítica aumenta em 2.

- Em Morrendo 3, você morre. A maestria de Constituição aumenta o limite para Morrendo 4.

Um teste de Cura usa a mesma DT. Sucesso estabiliza o alvo, impedindo novos testes de Morrendo, mas somente cura suficiente para chegar a 1 PV devolve a consciência. Ao despertar, aumente Ferido em 1.

### Remover Ferido

- Um descanso completo de qualidade Boa ou superior reduz Ferido em 1 se o personagem receber tratamento e terminar o descanso consciente.

- Ferido só pode ser reduzido uma vez por descanso completo, mesmo com várias fontes de cura.

- Poderes e tratamentos que removem Ferido fora do descanso precisam declarar isso explicitamente.

### Quando rolar ferimento crítico

- Quando um único golpe causar dano igual ou superior à metade dos seus PV máximos.

- Quando você obtiver falha crítica em um teste de Morrendo.

- Role apenas uma vez por fonte de dano, mesmo que os dois gatilhos aconteçam.

### Tabela de trauma (2d6)

- 2d6 | Chance | Resultado

- 2 | 2,8% | Trauma mortal: aumente Morrendo em 1.

- 3–4 | 13,9% | Hemorragia: desvantagem no próximo teste de Morrendo até ser estabilizado.

- 5–6 | 25% | Fratura: −2 em testes físicos até tratamento e descanso completo.

- 7–8 | 30,6% | Choque: perca 1d4 Mana e sua próxima reação.

- 9–10 | 19,4% | Cicatriz: consequência narrativa e −1 contextual até ser tratada.

- 11 | 5,6% | Instinto: vantagem no próximo teste de Morrendo.

- 12 | 2,8% | Aqui não é o final: estabilize e volte imediatamente com 1 PV.

## coreografia

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Risco escolhido antes do dado, recompensa limitada e consequências que criam cena em vez de encerrar o combate.

Em um confronto direto, descreva uma ação cinematográfica possível e escolha o risco antes de rolar. A descrição precisa mudar a ficção; não basta declarar o bônus.

### Níveis de risco

- Risco | Se tiver sucesso | Se falhar

- Seguro | Reposicione-se 1,5 m após a ação. | Sem consequência adicional.

- Ousado | +2 no teste e +2 no dano. | Fica Exposto: −2 Defesa até seu próximo turno.

- Arriscado | Vantagem e +1 dado da arma no dano. | Sofre 1d8 de dano e perde a ação de movimento.

- Perigoso | O ataque se torna crítico se acertar. | Cai e o inimigo recebe vantagem no próximo ataque contra você.

- Tudo ou Nada | Crítico com dados maximizados. | Sofre um crítico do inimigo e recebe Ferido 1. Uma vez por cena.

O mestre pode limitar uma Coreografia que não altere a ficção ou que repita a mesma descrição apenas para buscar o bônus.

## descanso

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Recuperação percentual que continua útil em todos os níveis e uma trilha de Cansaço sem frações.

### Descanso completo

- **Péssima:** menos de 4 horas, duas interrupções perigosas ou exposição severa.

- **Ruim:** entre 4 e 7 horas ou local inseguro, sem abrigo, alimento ou água suficientes.

- **Boa:** 8 horas, abrigo básico, alimento, água e no máximo uma interrupção curta.

- **Maravilhosa:** 8 horas em local seguro, cama adequada, refeição completa e sem interrupções.

- **Excelente:** santuário protegido com conforto e cuidado médico ou sobrenatural. Exige autorização do mestre.

- Qualidade | PV e Mana | Sanidade | Reduz Cansaço

- Péssima | 10% do máximo | 0% | 1

- Ruim | 25% do máximo | 5% | 2

- Boa | 50% do máximo | 10% | 3

- Maravilhosa | 75% do máximo | 20% | 4

- Excelente | 100% do máximo | 35% | todo o Cansaço

### Relaxar

Recupere 1d6 + Mod.Sabedoria + ⌊Nível ÷ 4⌋ de Mana

- Exige uma hora em segurança relativa e só funciona uma vez entre descansos completos.

- Uma atividade pessoal significativa pode recuperar também 1 ponto de Cansaço, a critério do mestre.

### Cansaço

- Nível | Efeito

- 0: Disposto | Sem penalidade.

- 1: Cansado | −1 em testes físicos.

- 2: Fatigado | −2 em testes físicos e −1 Iniciativa.

- 3: Esgotado | −2 em todos os testes.

- 4: Exausto | Desvantagem em testes físicos; não pode treinar.

- 5: Debilitado | Movimento pela metade e sem reações.

- 6: Colapso | Inconsciente até reduzir Cansaço.

Um combate é intenso quando o personagem chega à metade dos PV, gasta metade da Mana ou entra em Morrendo. A cena gera apenas 1 Cansaço, mesmo com vários gatilhos. Seis horas de treino e uma noite sem dormir também geram 1 Cansaço. Use apenas valores inteiros.

## treinar

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Treino exige tempo e um Grau de Treinamento; dinheiro ou dias livres não compram sozinhos o maior bônus do jogo.

Para subir uma perícia em um grau, você precisa receber um Grau de Treinamento pela tabela de classe ou por uma recompensa explícita e cumprir o treinamento. O tempo sozinho nunca concede o avanço.

### Progressão

- Avanço | Tempo | Requisito

- Iniciante → Aprendiz | 3 dias | 1 Grau de Treinamento; nível 1

- Aprendiz → Treinado | 7 dias | 1 Grau de Treinamento; nível 3

- Treinado → Especialista | 14 dias | 1 Grau de Treinamento; nível 7

- Especialista → Mestre | 21 dias | 1 Grau de Treinamento; nível 13 e instrutor

- Mestre → Veterano | 32 dias | 1 Grau de Treinamento; nível 19 e feito notável

- Veterano → Renomado | 62 dias | 1 Grau de Treinamento; nível 29, feito e item especial

### Regras de treinamento

- Cada dia exige seis horas e gera 1 Cansaço ao final; descansar normalmente pode removê-lo.

- Um instrutor de grau superior reduz o tempo em 20%, arredondado para cima.

- Interrupções não apagam progresso, mas mais de 30 dias parado exigem um dia de revisão.

- Treinamento não exige rolagens repetidas; o custo já é tempo, oportunidade e recurso de progressão.

## xp

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Uma progressão global para todos os personagens e um único modelo usado por todas as classes.

### Progressão do nível total

Sempre que subir de nível, escolha uma de suas classes e aumente o nível dela em 1. As recompensas abaixo usam o nível total e nunca se repetem por multiclasse.

- Níveis totais | Recompensa global

- Todos os níveis | +1 nível em uma classe escolhida

- 4, 8, 12, 16, 20, 24, 28, 32, 36 e 40 | +1 em um atributo, respeitando o limite natural 20

- 5, 10, 15, 20, 25, 30, 35 e 40 | 1 Legado de Ascensão

### Especialização e multiclasse

- Uma classe pode chegar ao nível 20 sem que o personagem possua outra classe.

- Para aumentar o nível total depois disso, invista em outra classe.

- Classes especiais exigem nível total 15, consomem nível normalmente e não contam no limite de duas classes comuns.

- Classes comuns podem ser escolhidas em qualquer Árvore. Classes especiais exigem liberação do Mestre e só podem ser escolhidas nas Árvores indicadas em suas páginas.

- Viajante é compatível com Matriz, Éon e Vórtice; possuir afinidade com várias Árvores não a torna uma classe comum.

- Ao entrar em uma nova classe, você não recebe novamente equipamento, dinheiro ou outros benefícios de criação.

### Fórmula de progressão

XP total do nível N = 500 × N × (N − 1)

O custo para passar do nível N ao N+1 é N × 1.000 XP. A tabela antiga desviava 1.000 XP a partir do nível 24.

### Tabela completa

**N1**0 XP

**N2**1.000 XP

**N3**3.000 XP

**N4**6.000 XP

**N5**10.000 XP

**N6**15.000 XP

**N7**21.000 XP

**N8**28.000 XP

**N9**36.000 XP

**N10**45.000 XP

**N11**55.000 XP

**N12**66.000 XP

**N13**78.000 XP

**N14**91.000 XP

**N15**105.000 XP

**N16**120.000 XP

**N17**136.000 XP

**N18**153.000 XP

**N19**171.000 XP

**N20**190.000 XP

**N21**210.000 XP

**N22**231.000 XP

**N23**253.000 XP

**N24**276.000 XP

**N25**300.000 XP

**N26**325.000 XP

**N27**351.000 XP

**N28**378.000 XP

**N29**406.000 XP

**N30**435.000 XP

**N31**465.000 XP

**N32**496.000 XP

**N33**528.000 XP

**N34**561.000 XP

**N35**595.000 XP

**N36**630.000 XP

**N37**666.000 XP

**N38**703.000 XP

**N39**741.000 XP

**N40**780.000 XP

### Recompensas por marco

- **Descoberta ou objetivo menor:** 10% do próximo nível.

- **Missão relevante:** 25% do próximo nível.

- **Fim de arco:** 50% do próximo nível.

- Divida XP de combate pelo grupo; XP de descoberta e arco é concedido igualmente.

## legados

**Categoria:** Livro do Jogador

**Status:** Publicado para playtest

Legados são escolhas permanentes de ascensão, recebidas por nível total e validadas pela ficha.

Nos níveis totais 5, 10, 15, 20, 25, 30, 35 e 40, escolha um Legado de Ascensão cujos pré-requisitos sejam atendidos. A raça pode conceder vagas adicionais quando isso estiver escrito no catálogo racial.

- Um Legado não pode ser removido ou trocado pelo jogador depois de adquirido.

- Legados não são recompensas de classe. Multiclasse não repete os marcos.

- Um Legado só pode ser escolhido novamente quando estiver marcado como repetível e respeitando seu limite.

- Pré-requisitos de nível, atributo e perícia são verificados no momento da escolha.

- O Mestre pode autorizar uma troca apenas para corrigir erro de criação ou mudança oficial das regras.

## equipamentos

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Armaduras, escudos, carga, proficiência, munição e Resistência usam limites únicos na ficha.

### Carga e espaços

Capacidade = 10 + (2 × Mod.Força positivo) + ⌊Nível total ÷ 2⌋, mínimo 5

- Cada item ocupa os espaços declarados no catálogo, multiplicados pela quantidade.

- Acima da capacidade, o personagem fica Sobrecarregado: movimento reduzido em 3 m e desvantagem em testes físicos.

- Recipientes e habilidades só aumentam a capacidade quando trazem um valor explícito.

### Armaduras e escudos

- Equipe no máximo uma armadura principal, uma malha compatível por baixo e um escudo.

- Os bônus de Defesa dessas três peças somam. Duas armaduras principais nunca somam.

- A penalidade total de armadura se aplica a Acrobacia, Atletismo e Furtividade.

- Sem proficiência no subtipo, dobre a penalidade da peça e não use habilidades que exijam proficiência.

### Resistência e tipos de dano

- Role o dano e aplique o multiplicador crítico aos dados e modificadores que fazem parte do ataque.

- Some dados extras declarados pelo efeito. Dados extras só multiplicam se a fonte disser isso.

- Aplique vulnerabilidade ou redução percentual.

- Subtraia a Resistência correspondente ao tipo de dano, até o mínimo 0.

Resistência física geral cobre corte, perfuração e impacto, mas não dano balístico. Resistência de um tipo específico não protege contra outros tipos.

### Armas, proficiência e munição

- Armas simples podem ser usadas por qualquer personagem. Armas marciais e exóticas exigem proficiência correspondente.

- Sem proficiência, o ataque sofre -5 e não pode ativar propriedades especiais da arma.

- Armas de disparo gastam uma unidade de munição por ataque, salvo propriedade diferente. Sem munição, o ataque não pode ser realizado.

- Recarregar um carregador usa ação de movimento. Munição avulsa e armas pesadas podem exigir ação padrão quando declarado.

## magia-fluxo

**Categoria:** Livro do Jogador

**Status:** Regra oficial para playtest

Acesso, teste, DT, círculos, Mana, concentração, críticos e o primeiro catálogo de magia.

Magia é uma aplicação estruturada de um Fluxo. Mana paga a manifestação, Fluxo mede o controle do conjurador e Misticismo representa treinamento. O catálogo inicial está publicado para playtest; ajustes futuros devem preservar esta matemática central.

### Acesso e magias conhecidas

- Ter Fluxo alto não ensina magia. O acesso vem de uma classe, habilidade, item, Legado ou concessão do Mestre.

- Cada fonte informa tradições, círculo máximo e quantidade de magias conhecidas.

- Escolher uma magia conhecida é permanente. O Mestre pode permitir troca durante treinamento ou mudança narrativa.

- Manifestações narrativas sem círculo não causam dano, não impõem condições e não substituem perícias.

- Fonte atual | Progressão publicada

- Elementarista | N3: 2 magias de até 1º; N8: 4 de até 2º; N14: 6 de até 3º; N20: 8 de até 4º.

- Cartista Arcano | N10: 3 magias elementais de 1º; N15: 4 magias de até 2º.

- 5º círculo e Ritual | Exigem uma fonte específica ainda não publicada ou concessão do Mestre.

### Teste e DT de magia

Teste de conjuração = d20 + Mod. Fluxo + ⌊Nível total ÷ 2⌋ + Grau de Misticismo

DT de magia = 10 + Mod. Fluxo + ⌊Nível total ÷ 2⌋ + Grau de Misticismo

- Quando a magia indicar uma Defesa, faça um teste de conjuração e compare o mesmo resultado à Defesa passiva de cada alvo.

- Magias sem Defesa funcionam sem teste, salvo pressão, interrupção ou oposição indicada pelo Mestre.

- Bônus raciais de Misticismo entram nas duas fórmulas. Outros bônus só entram quando citarem magia ou conjuração.

- Um 1 natural sempre falha no teste. Um 20 natural sempre acerta, mas só magias de alvo único marcadas como ataque causam crítico.

- No crítico mágico, dobre apenas os dados de dano da magia. Áreas, cura, barreiras, condições e dano contínuo não são multiplicados.

### Círculos, Fluxo e Mana

- Círculo | Fluxo mínimo | Custo base | Dano de alvo | Dano de área

- 1º | 8 | 2 Mana | 2d8 | 2d6

- 2º | 12 | 4 Mana | 4d8 | 4d6

- 3º | 14 | 6 Mana | 6d8 | 6d6

- 4º | 16 | 8 Mana | 8d8 | 8d6

- 5º | 18 | 10 Mana | 10d8 | 10d6

O personagem usa o menor limite entre o círculo liberado por sua fonte e o círculo permitido por Fluxo. Uma redução nunca baixa o custo de uma magia para menos de 1 Mana, salvo uma habilidade que diga expressamente custo 0.

### Concentração

- Você mantém apenas uma magia ou efeito de concentração por vez. Começar outro encerra o anterior imediatamente.

- Ao sofrer dano, teste Vontade contra DT 10 ou metade do dano recebido, o que for maior. Falha encerra a concentração.

- Ficar Atordoado, Inconsciente ou incapaz de agir encerra a concentração. Encerrar voluntariamente não exige ação.

- A duração máxima consta na magia. Pagar Mana novamente não estende uma conjuração já ativa.

### Rituais e maestria em Fluxo

- Rituais não pertencem a um círculo, não causam crítico e exigem o tempo, o alvo e o custo próprios do catálogo.

- Interromper um ritual antes do final não gasta Mana. A reserva é paga quando o efeito é concluído.

- Rituais não servem como ação de combate, mesmo quando o grupo tenta reduzir seu tempo.

- **Fluxo 20:** uma vez por cena, repita um teste de conjuração ou de concentração e mantenha o novo resultado.

### Catálogo inicial

O catálogo estruturado em **data/ficha/magias.json** contém 25 magias elementais, cinco em cada círculo, e três rituais universais. A ficha mostra custo, execução, alcance, duração, Defesa e concentração diretamente dessa fonte.

## condicoes

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Estados mentais e físicos que penalizam o personagem.

### Sanidade

d20 + bônus da perícia Sanidade ou Vontade contra DT 10 / 15 / 20 / 25

- Falha causa 1d4, 1d6, 1d8 ou 2d6 de perda, conforme a intensidade do evento.

- Sucesso crítico evita toda perda; sucesso reduz a perda à metade; falha crítica maximiza os dados.

- Sanidade | Estado | Efeito

- 76–100 | Estável | Sem efeito.

- 51–75 | Abalado | −1 no primeiro teste mental após perder Sanidade.

- 26–50 | Enlouquecendo | Desvantagem para manter concentração sob ameaça.

- 1–25 | Ruptura | Ao sofrer nova perda, teste Vontade DT 15 ou ganhe uma condição de crise.

- 0 | Quebra | Crise imediata e uma condição permanente definida com o jogador.

### Crises

- Em Ruptura, cada nova perda exige Vontade DT 15. Falha gera Pânico, Dissociação, Paranoia, Catatonia, Compulsão ou Fúria.

- Pânico, Dissociação, Catatonia e Fúria duram 1d4 rodadas e permitem Vontade DT 15 no fim do turno.

- Paranoia dura até o fim da cena. Compulsão permite Vontade DT 15 no começo do turno para agir normalmente.

- Em Sanidade 0, a crise é imediata. Depois da cena, o personagem permanece com 0 até receber descanso e tratamento em segurança.

- Uma condição permanente em Quebra deve ser definida com o jogador e só muda por resolução narrativa ou tratamento prolongado.

### Condições gerais

- Condição | Efeito principal | Remoção

- Amedrontado | Desvantagem contra a fonte e não se aproxima dela. | Vontade contra a DT da fonte no fim do turno.

- Exposto | -2 Defesa. | Começo do próximo turno.

- Caído | -2 em ataques; ataques corpo a corpo contra você recebem +2. | Ação de movimento para levantar.

- Sangramento | 1d6 de dano no fim do turno; aplicações extras dão +1, até +5. | Cura DT 15 ou recuperar pelo menos 1 PV.

- Atordoado | Sem ações ou reações e -5 Defesa. | Fim da duração.

- Concentrando | Mantém um efeito; dano exige Vontade DT 10 ou metade do dano. | Falha no teste, incapacidade ou encerramento voluntário.

### Iniciativa estática

- Iniciativa = 10 + metade do nível + Mod.Destreza + bônus.

- Empates: maior Mod.Sabedoria; persistindo, personagens agem antes de NPCs.

- Surpreendido impõe −5 na primeira rodada. Atrasar reduz voluntariamente sua posição pelo resto do combate.

### Defesas passivas

- Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir uma rolagem, use **10 + bônus total**.

- Quando você resiste diretamente a um perigo, role o d20 com o mesmo bônus.

## classes

**Categoria:** Livro do Jogador

**Status:** Publicado para playtest

Classes comuns servem a qualquer Árvore; classes especiais são mais fortes, restritas às Árvores indicadas e exigem liberação do Mestre.

Consulte o catálogo estruturado em `data/ficha/classes.json`.

## racas

**Categoria:** Livro do Jogador

**Status:** Publicado para playtest

Raças comuns podem nascer em qualquer Árvore; raças especiais são mais fortes e aparecem somente nas Árvores compatíveis.

Consulte o catálogo estruturado em `data/ficha/racas.json`.
