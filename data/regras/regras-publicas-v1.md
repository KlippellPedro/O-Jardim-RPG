# Regras públicas de O Jardim RPG

> Arquivo gerado de `data/regras/regras.ts`. Não edite manualmente.

## sistema-base

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Como montar um personagem do zero: atributos, Vida, Mana e as contas que você vai usar pelo resto do jogo.

### Criação de personagem

- **Distribua os atributos** pelo conjunto padrão ou comprando por pontos. Os dois métodos estão logo abaixo e dão no mesmo total.

- **Escolha uma raça** comum e, se ela pedir, a variante. É a raça que diz como seu corpo funciona e o que ele já sabe fazer sozinho.

- **Escolha seis perícias** para começar em Aprendiz. Humano escolhe sete, por Adaptabilidade.

- **Escolha uma classe** comum. É dela que vêm os ganhos de Vida e Mana de cada nível daqui pra frente.

- **Pegue** um item comum e 20 Lunaris. É com isso que você começa.

### Métodos de atributos

- **Conjunto padrão:** 15, 14, 13, 12, 10, 8 e 8, distribuídos como você quiser entre os sete atributos. Cada número é usado uma vez só.

- **Compra por pontos:** os sete atributos começam em 8 e você distribui exatamente 24 pontos, na base de 1 ponto para cada +1. Nenhum atributo passa de 15 antes dos ajustes raciais.

- **Os dois dão no mesmo:** o conjunto padrão também custa exatamente 24 pontos. A diferença é só que a compra deixa você especializar mais e ficar pior nos outros.

**Variante aleatória:** role 7d20 e organize os sete resultados, cada dado usado uma vez. Isso **não** é equivalente aos dois métodos acima: sai personagem muito acima ou muito abaixo da média, e você só descobre qual depois de rolar. Combine com a mesa antes de usar.

### Fórmulas fundamentais

- **Modificador:** ⌊(Atributo − 10) ÷ 2⌋

- **Teste:** d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau

- **Vida no nível 1:** máx. 1, (4 × Mod.Constituição) + Vida da classe

- **Vida por nível posterior:** ganho de Vida da classe do nível adquirido, mínimo 1

- **Mana no nível 1:** máx. 1, (3 × Mod.Sabedoria) + Mana da classe

- **Mana por nível posterior:** ganho de Mana da classe do nível adquirido, mínimo 1

- **Ajustes raciais:** bônus raciais de Vida e Mana são somados depois do cálculo correspondente

- **Defesa Natural:** 10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + equipamento

- **Movimento:** 9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m

- **Iniciativa:** 10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus

### Nível e multiclasse

- **Nível total** é a soma dos níveis de todas as suas classes, incluindo as especiais.

- Cada classe vai até o **nível 20**. Só com classes comuns, o teto é **40 níveis totais**; com uma classe especial, sobe para **60**.

- Você pode ter no máximo **duas classes comuns e uma especial**.

- Dá para intercalar os níveis à vontade. Mas para levar uma classe até o 20 você precisa ter pelo menos nível 10 em outra. Ninguém chega ao topo sem ter feito outra coisa no caminho.

- Classe especial exige nível total 15 e um acontecimento na história que justifique, a não ser que a própria classe abra exceção.

- Classe geral serve a qualquer Árvore. Classe exclusiva só se você pertencer à Árvore indicada.

### Maestria de atributo

Quando um atributo chega a 20 **por mérito próprio**, sem item, pacto ou efeito temporário segurando o número, você ganha a maestria dele. Coisa de fora pode empurrar o atributo acima de 20, e não dá maestria nenhuma. E só uma característica que declare explicitamente um limite maior consegue passar de 20.

- **Força:** uma vez por turno, +2 no dano de um ataque corpo a corpo.

- **Destreza:** +1 na Defesa Natural ou +1,5 m de movimento.

- **Constituição:** você morre em Morrendo 4, em vez de Morrendo 3.

- **Inteligência:** torne-se Aprendiz em duas perícias.

- **Sabedoria:** reduza em 2 a primeira perda de Sanidade de cada cena.

- **Carisma:** uma vez por cena, repita um teste social; mantenha o novo resultado.

### Fluxo

**Fluxo** é o sétimo atributo, e mede o quanto você controla aquilo que canaliza. Em magia ele entra no lugar do atributo que normalmente acompanharia Misticismo, e é ele que limita o maior círculo que você conjura com segurança. Fluxo alto sozinho não ensina magia nenhuma: alguém precisa te dar acesso, seja uma classe, uma habilidade, um item ou o Mestre.

## pericias

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Uma fórmula só, usada em perícia, ataque e resistência. Sete graus, e vantagem e desvantagem que se cancelam uma a uma.

### Fórmula de teste

É esta conta, e é sempre esta conta. Perícia, ataque, resistência: muda o atributo e muda o grau, o resto é igual.

d20 + Mod. de Atributo + ⌊Nível total ÷ 2⌋ + bônus do Grau

### Graus de perícia

- Grau | Bônus | Nível mínimo

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

### Vantagem e desvantagem

- Role dois d20 e use o maior com vantagem, ou o menor com desvantagem.

- Anote cada fonte de vantagem e cada fonte de desvantagem. Elas se cancelam uma a uma, não em bloco.

- O que sobrar decide: qualquer saldo positivo vira *uma* vantagem, qualquer saldo negativo vira *uma* desvantagem. Não existe vantagem dupla.

## combate

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

O que você faz no seu turno, como acertar, quando dá para reagir e de que jeito o dano entra.

### Seu turno

- **Ação Padrão:** atacar, usar uma habilidade, ajudar alguém ou tentar uma manobra.

- **Ação de Movimento:** se deslocar, levantar, sacar algo ou mexer num objeto que importe na cena.

- **Ação Livre:** um gesto ou uma frase curta. Se começar a virar vantagem mecânica repetida, o Mestre corta.

- Dá para trocar sua Ação Padrão por uma segunda Ação de Movimento. Correr custa o ataque.

### Ataques e cobertura

d20 + Luta ou Pontaria contra a Defesa Natural

- Empatar com a Defesa já acerta. Um 1 natural sempre erra, não importa o bônus.

- Cada arma traz sua **Margem de Ameaça** e seu **Multiplicador Crítico**, escritos como 20/x2, 19-20/x2 ou 20/x3.

- Se o número natural do d20 cair dentro da margem da arma, o ataque acerta e é crítico. Não existe rolagem de confirmação: caiu na margem, é crítico.

- O multiplicador diz quantas vezes você rola os dados da arma. Em x3, 2d6+4 vira 6d6+4.

- Bônus fixo e dado extra vindos de habilidade, veneno ou efeito externo entram **uma vez só**. Eles só multiplicam se a própria habilidade disser que multiplica.

- Margem larga e multiplicador alto não andam juntos: 18-20 e 19-20 sempre com x2; x3 e x4 sempre com margem 20.

- Cobertura parcial dá +2 de Defesa; cobertura superior dá +5.

### Reações

Você tem uma reação por rodada e recupera ela no começo do seu próprio turno. Defesa Natural funciona sozinha e não gasta reação nenhuma.

- Reação | Gatilho | Efeito

- Esquiva | Antes da rolagem contra você | +4 de Defesa contra um ataque. Se errar, mova 1,5 m sem provocar reação.

- Bloqueio | Após sofrer dano físico | Reduza o dano em 2 + ⌊Nível ÷ 2⌋ + bônus do escudo. Exige escudo ou arma adequada.

- Contra-Ataque | Inimigo adjacente erra você | Faça um ataque com −2. Ele não pode gerar crítico.

- Proteger | Aliado adjacente é atacado | Você vira o alvo e pode usar Bloqueio, se ainda tiver reação.

### Tipos de dano

- **Físicos:** corte, perfuração, impacto e balístico.

- **Persistentes:** sangramento, fogo e veneno; batem de novo no fim do turno até alguém remover.

- **Energia:** elemental, tecnologia e Fluxos.

- **Mental:** tira Sanidade ou Vida, dependendo de onde vem.

### Dano elemental

São estes sete, e não existe um oitavo. Quem conjura pelo Fluxo do Físico escolhe um deles ao aprender a magia: é o **elemento despertado**, e ele vale para todas as magias de Físico daquela ficha. Modificação de arma, encantamento e Selo que pedem "um elemento" puxam da mesma lista.

- Elemento | Como costuma se manifestar

- Terra | Pedra, areia e metal bruto. Bom para barreira, terreno difícil e derrubar.

- Água | Líquido, gelo e vapor. Empurra, prende e apaga fogo.

- Fogo | Chama e brasa. É o elemento que mais deixa dano persistente para trás.

- Ar | Vento e pressão. Move criaturas e objetos, e limpa nuvem e gás.

- Raio | Descarga elétrica. Salta entre alvos próximos e desliga o que é energizado.

- Luz | Claridade que revela. Atinge o que se esconde e cega quem olha de perto.

- Escuridão | Sombra que engole. Esconde, confunde e apaga a luz mundana da área.

Resistência e vulnerabilidade valem por elemento, nunca para o grupo inteiro: quem resiste a Fogo não resiste a Raio. Trocar o elemento despertado depois exige aval do Mestre.

## distancias

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

As dez faixas de distância, o que acontece quando você atira longe demais e como converter tudo para o mapa.

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

- Dentro do alcance que a arma ou o poder informa, ataque normalmente.

- Uma faixa além do alcance custa −5 no ataque. Duas faixas custam −10.

- Passou de duas faixas, o alvo simplesmente não pode ser atingido, a não ser que uma habilidade ou item diga o contrário.

- Em mapa tático, arredonde os deslocamentos para múltiplos de 1,5 m e siga o jogo.

## ferimentos

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Cair a 0 não é o fim: o quanto você passou de 0 define o tamanho do buraco, e Morrendo dá ao grupo algumas rodadas para resolver.

### Vida negativa

Chegar a 0 não zera a conta. O dano continua sendo anotado abaixo de zero, e é esse número que decide se a queda foi um tropeço ou um desastre.

- Continue registrando o dano abaixo de 0. Esse valor é o seu **Déficit de Vida**.

- A cura preenche o Déficit primeiro. Você só acorda quando voltar a 1 PV ou mais.

- Se o Déficit chegar à sua Vida máxima, você morre na hora, sem teste.

### Gravidade da queda

- Déficit em relação à Vida máxima | Gravidade | DT base

- 0% a 10% | 0 | 12 + Ferido

- Acima de 10% até 25% | 1 | 14 + Ferido

- Acima de 25% até 50% | 2 | 16 + Ferido

- Acima de 50% até 75% | 3 | 18 + Ferido

- Acima de 75% | 4 | 20 + Ferido

### Morrendo

- Ao chegar a 0 PV ou menos, você cai inconsciente e recebe **Morrendo 1**.

- No fim de cada turno seu, role Fortitude contra **DT 12 + (2 × Gravidade) + Ferido**.

- Sucesso segura onde está; sucesso crítico reduz em 1; falha aumenta em 1; falha crítica aumenta em 2.

- Em Morrendo 3, você morre. A maestria de Constituição empurra esse limite para Morrendo 4.

Um teste de Cura usa a mesma DT. Sucesso estabiliza, o que interrompe os testes de Morrendo. Mas acordar é outra coisa: só cura suficiente para chegar a 1 PV traz a pessoa de volta. Quem acorda ganha Ferido 1.

### Remover Ferido

- Um descanso completo de qualidade Boa ou melhor tira 1 de Ferido, se o personagem for tratado e terminar o descanso consciente.

- É uma redução por descanso completo, mesmo que várias pessoas curem a mesma pessoa.

- Poder ou tratamento que remova Ferido fora do descanso precisa dizer isso com todas as letras.

### Quando rolar ferimento crítico

- Quando um único golpe tirar metade ou mais dos seus PV máximos.

- Quando você tirar falha crítica num teste de Morrendo.

- Uma rolagem por fonte de dano, mesmo que os dois gatilhos aconteçam juntos.

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

Você escolhe o risco antes do dado. Deu certo, virou cena; deu errado, virou problema, e o problema nunca encerra o combate sozinho.

Descreva uma jogada de cinema que caiba na cena e escolha o risco **antes** de rolar. A descrição tem que mudar alguma coisa na ficção: pular do lustre, chutar a mesa no meio do caminho, usar o sujeito como escudo. Dizer "uso Arriscado" e rolar o dado não é Coreografia.

### Níveis de risco

- Risco | Se tiver sucesso | Se falhar

- Seguro | Reposicione-se 1,5 m após a ação. | Sem consequência adicional.

- Ousado | +2 no teste e +2 no dano. | Fica Exposto: −2 Defesa até seu próximo turno.

- Arriscado | Vantagem e +1 dado da arma no dano. | Sofre 1d8 de dano e perde a ação de movimento.

- Perigoso | O ataque se torna crítico se acertar. | Cai e o inimigo recebe vantagem no próximo ataque contra você.

- Tudo ou Nada | Crítico com dados maximizados. | Sofre um crítico do inimigo e recebe Ferido 1. Uma vez por cena.

Se a descrição não muda nada na cena, ou se é a mesma de sempre só para pegar o bônus, o Mestre pode negar a Coreografia.

## descanso

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Recuperação em porcentagem, que continua valendo no nível 30 igual valia no 3, e uma trilha de Cansaço de 0 a 6 sem meio-termo.

### Descanso completo

- **Péssima:** menos de 4 horas, duas interrupções perigosas ou exposição severa.

- **Ruim:** entre 4 e 7 horas, ou local inseguro, sem abrigo, alimento ou água suficientes.

- **Boa:** 8 horas, abrigo básico, alimento, água e no máximo uma interrupção curta.

- **Maravilhosa:** 8 horas em local seguro, cama de verdade, refeição completa e nenhuma interrupção.

- **Excelente:** santuário protegido, com conforto e cuidado médico ou sobrenatural. Depende de autorização do Mestre.

- Qualidade | PV e Mana | Sanidade | Reduz Cansaço

- Péssima | 10% do máximo | 0% | 1

- Ruim | 25% do máximo | 5% | 2

- Boa | 50% do máximo | 10% | 3

- Maravilhosa | 75% do máximo | 20% | 4

- Excelente | 100% do máximo | 35% | todo o Cansaço

### Relaxar

Recupere 1d6 + Mod.Sabedoria + ⌊Nível ÷ 4⌋ de Mana

- Exige uma hora em segurança relativa, e vale uma vez só entre dois descansos completos.

- Se a hora foi gasta em algo que significa alguma coisa para o personagem, o Mestre pode devolver 1 ponto de Cansaço junto.

### Cansaço

- Nível | Efeito

- 0: Disposto | Sem penalidade.

- 1: Cansado | −1 em testes físicos.

- 2: Fatigado | −2 em testes físicos e −1 Iniciativa.

- 3: Esgotado | −2 em todos os testes.

- 4: Exausto | Desvantagem em testes físicos; não pode treinar.

- 5: Debilitado | Movimento pela metade e sem reações.

- 6: Colapso | Inconsciente até reduzir Cansaço.

Um combate conta como intenso quando o personagem desce à metade dos PV, gasta metade da Mana ou entra em Morrendo. A cena inteira gera **1** Cansaço, mesmo que os três gatilhos aconteçam. Seis horas de treino e uma noite em claro também valem 1 cada. Sempre em números inteiros, porque não existe meio Cansaço.

## treinar

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Grau dado pela classe sobe na hora. Grau conquistado por treino cobra tempo, nível e, mais para frente, alguém que te ensine.

São dois caminhos diferentes e vale não confundir. Quando uma **classe** te dá um Grau de Treinamento, escolha uma perícia e suba um grau imediatamente, sem tempo, sem tabela e sem requisito. Quando você quer subir **por treino**, aí sim cumpre o tempo da linha, o Nível Total mínimo e o requisito extra, quando existir.

### Progressão

- Avanço | Tempo | Nível Total e requisito adicional

- Iniciante → Aprendiz | 3 dias | Nível Total 1

- Aprendiz → Treinado | 7 dias | Nível Total 3

- Treinado → Especialista | 14 dias | Nível Total 7

- Especialista → Mestre | 21 dias | Nível Total 13 e instrutor

- Mestre → Veterano | 32 dias | Nível Total 19 e feito notável

- Veterano → Renomado | 62 dias | Nível Total 29, feito e item especial

### Regras de treinamento

- Cada dia custa seis horas e deixa 1 de Cansaço no fim. Uma noite normal de sono resolve.

- Um instrutor de grau superior ao seu corta 20% do tempo, arredondando para cima.

- Parar no meio não apaga o que já foi feito. Mas mais de 30 dias largado cobra um dia de revisão antes de continuar.

- Não se rola nada para treinar. Cumpriu o tempo, o Nível Total e o requisito da linha, subiu.

## xp

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Uma tabela de XP só, do nível 1 ao 60, com recompensas que saem do nível total, nunca de cada classe separada.

### Progressão do nível total

Toda vez que você sobe de nível, escolhe uma das suas classes e aumenta o nível dela em 1. As recompensas da tabela olham para o **nível total**, então multiclasse não recebe nada em dobro.

- Níveis totais | Recompensa global

- Todos os níveis | +1 nível em uma classe escolhida

- 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56 e 60 | +1 em um atributo, respeitando o limite natural 20

- 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 e 60 | 1 Legado de Ascensão

### Especialização e multiclasse

- Uma classe só chega ao nível 20 se você já tiver nível 10 em outra classe. Não dá para maximizar uma classe sozinha.

- Fora essa trava, subir de nível é livre: escolha qualquer classe que já tenha entre suas classes atuais.

- Classe especial exige nível total 20, consome nível como qualquer outra e não ocupa uma das duas vagas de classe comum.

- Classe comum serve a qualquer Árvore. Classe especial depende de liberação do Mestre e só aparece nas Árvores indicadas na página dela.

- Ao entrar numa classe nova você não ganha equipamento, dinheiro ou qualquer outro benefício de criação de novo.

### Fórmula de progressão

XP total do nível N = 500 × N × (N − 1)

Na prática: sair do nível N e chegar ao N+1 custa N × 1.000 XP.

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

**N41**820.000 XP

**N42**861.000 XP

**N43**903.000 XP

**N44**946.000 XP

**N45**990.000 XP

**N46**1.035.000 XP

**N47**1.081.000 XP

**N48**1.128.000 XP

**N49**1.176.000 XP

**N50**1.225.000 XP

**N51**1.275.000 XP

**N52**1.326.000 XP

**N53**1.378.000 XP

**N54**1.431.000 XP

**N55**1.485.000 XP

**N56**1.540.000 XP

**N57**1.596.000 XP

**N58**1.653.000 XP

**N59**1.711.000 XP

**N60**1.770.000 XP

### Recompensas por marco

- **Descoberta ou objetivo menor:** 10% do próximo nível.

- **Missão relevante:** 25% do próximo nível.

- **Fim de arco:** 50% do próximo nível.

- XP de combate se divide pelo grupo. XP de descoberta e de arco vai inteiro para cada um.

## legados

**Categoria:** Livro do Jogador

**Status:** Regra oficial

A cada cinco níveis totais você escolhe um Legado. É escolha permanente, e a ficha confere os pré-requisitos na hora.

A cada cinco níveis totais, ou seja, no 5, no 10, no 15 e assim por diante até o 60, escolha um Legado de Ascensão cujos pré-requisitos você já cumpre. Algumas raças dão vagas extras, e quando dão está escrito no catálogo racial.

- Legado escolhido não volta atrás. O jogador não pode remover nem trocar depois.

- Legado não é recompensa de classe. Multiclasse não repete os marcos.

- Só dá para escolher o mesmo Legado de novo se ele estiver marcado como repetível, e dentro do limite dele.

- Nível, atributo e perícia são conferidos no momento da escolha. Perder o requisito depois não tira o Legado.

- O Mestre só autoriza troca em dois casos: erro de criação ou mudança oficial nas regras.

## equipamentos

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Quanto você carrega, o que dá para vestir junto e como a Resistência entra na conta do dano. Raridade e modificação ficam no capítulo seguinte.

### Carga e espaços

Capacidade = 10 + (2 × Mod.Força positivo) + ⌊Nível total ÷ 2⌋, mínimo 5

- Cada item ocupa os espaços que o catálogo declara, multiplicados pela quantidade.

- Passou da capacidade, você fica Sobrecarregado: 3 m a menos de movimento e desvantagem em testes físicos.

- Mochila, bolsa ou habilidade só aumentam sua capacidade quando trazem um número explícito. "Guarda bastante coisa" não conta.

### Armaduras e escudos

- No máximo uma armadura principal, uma malha compatível por baixo e um escudo.

- A Defesa dessas três peças soma. Duas armaduras principais nunca somam, por mais criativa que seja a justificativa.

- A penalidade total de armadura cai sobre Acrobacia, Atletismo e Furtividade.

- Sem proficiência no subtipo, a penalidade da peça dobra e você não usa habilidades que exijam proficiência.

### Resistência e tipos de dano

A ordem importa: multiplicar depois de subtrair a Resistência daria um número completamente diferente. Faça sempre nesta sequência.

- Role o dano e aplique o multiplicador crítico aos dados e modificadores que fazem parte do ataque.

- Some os dados extras declarados pelo efeito. Dado extra só multiplica se a fonte disser que multiplica.

- Aplique vulnerabilidade ou redução percentual.

- Subtraia a Resistência do tipo de dano correspondente, até o mínimo 0.

Resistência física geral cobre corte, perfuração e impacto. Balístico fica de fora, de propósito. E Resistência de um tipo específico não faz nada contra os outros tipos.

### Armas, proficiência e munição

- Arma simples qualquer um usa. Marcial e exótica exigem a proficiência correspondente.

- Sem proficiência, o ataque leva −5 e as propriedades especiais da arma ficam desligadas.

- Arma de disparo gasta uma unidade de munição por ataque, salvo propriedade que diga outra coisa. Sem munição, não há ataque.

- Trocar um carregador usa a ação de movimento. Munição avulsa e arma pesada podem cobrar ação padrão quando a arma declarar isso.

Raridade, orçamento de poder e o catálogo de modificações ficam no capítulo **Raridades e Modificações**, logo em seguida.

## raridades-modificacoes

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Até onde cada raridade pode ir, como uma modificação entra na ficha e as 51 modificações prontas, com preço de encomenda.

### Raridades e orçamento de poder

Raridade não é um bônus fixo que todo item da mesma faixa recebe. Ela é um **orçamento**: diz quantas modificações, efeitos automáticos e dons aquele objeto aguenta carregar. É o que impede a ficha de virar uma pilha de +1 sem fim.

- Raridade | Mods. | Efeitos próprios | Valor por efeito | Regra

- Comum | 1 | 0 | ±1 | Aceita uma melhoria técnica. A raridade em si não dá vantagem nenhuma.

- Incomum | 2 | 1 | ±1 | Ganha uma esquisitice pequena e até um efeito automático de valor 1.

- Raro | 3 | 1 | ±2 | Ganha um dom desperto e até um efeito automático de valor 2.

- Épico | 4 | 2 | ±3 | Ganha um dom excepcional e até dois efeitos automáticos de valor 3.

- LendárioAprovação do Mestre | 5 | 2 | ±4 | Pode ser senciente. Os poderes e os dois efeitos de valor 4 passam pelo Mestre.

- RelíquiaAprovação do Mestre | 6 | 3 | ±5 | Ninguém reproduz e nada mundano destrói. Todo poder passa pelo Mestre.

- Relíquia da CriaçãoAprovação do Mestre | 7 | 3 | ±7 | Sempre única. Quebra regra comum só até onde o Mestre deixar.

### Modificações e efeitos na ficha

- Toda modificação ocupa um espaço da raridade, seja ela técnica, mágica ou especial.
- Uma modificação carrega no máximo um efeito automático na ficha. Efeito além disso sai dos espaços próprios da raridade.
- Bônus, vantagem e penalidade só entram na conta enquanto o item estiver equipado. Na mochila, não valem nada.
- O teto de valor vale por efeito, não no total. Vantagem ou desvantagem sempre conta como 1 efeito.
- Efeitos iguais de itens diferentes somam, mas o Mestre pode barrar quando as duas fontes não fizerem sentido juntas.
- Consumível aplica o efeito quando é usado. Guardado, ele não dá bônus nenhum.
- Lendário, Relíquia e Relíquia da Criação passam pelo Mestre antes de entrar em jogo.

Na prática: uma modificação pode dar Vida máxima, Defesa, Ataque, atributo ou bônus numa perícia. Guardou ou desequipou o item, a ficha tira esses valores sozinha, você não precisa lembrar.

### Como ler uma modificação

- **Nível:** **Comum** entra em qualquer item. **Marcial** bate mais forte e só entra em arma marcial ou exótica, armadura pesada e item Raro ou melhor.

- **Valor:** o peso do efeito automático. Compare com a coluna "Valor por efeito" da tabela ali em cima para saber de qual raridade o item precisa ser.

- **Técnica:** não tem efeito automático. Ocupa espaço de modificação, mas não gasta o orçamento de efeito da raridade.

- **Pré-requisito:** cobra de *quem usa*, não do item. Perdeu o requisito, a modificação desliga até você cumprir de novo.

- Faixa | Preço de encomenda | Raridade mínima do item

- Técnica | 25 Lunaris | Qualquer item

- Valor 1 | 60 Lunaris | Comum

- Valor 2 | 180 Lunaris | Raro

- Valor 3 | 450 Lunaris | Épico

A Loja vende cada uma delas na categoria **Modificações**, com o preço já aplicado. Marcial só aparece a partir da Metrópole.

### Catálogo de modificações

São 51 modificações prontas, para ninguém precisar inventar do zero. Abra só a categoria do equipamento que você está montando.

Armas
18 modificações · 9 comuns · 9 marciais

- Modificação | Nível | Valor | Preço | Pré-requisito | Efeito

- Afiada | Comum | 1 | 60 L | Nenhum | +1 dado de dano da arma (mesmo tipo do dado base).

- Perfurante | Comum | 1 | 60 L | Nenhum | O dano da arma ignora metade da Resistência do tipo correspondente do alvo.

- Margem Ampla | Comum | 1 | 60 L | Nenhum | Amplia a Margem de Ameaça em 2 (uma 20/x2 vira 18-20/x2). Só entra em arma de multiplicador x2, pra não furar a regra de margem larga com multiplicador alto.

- Coreografada | Comum | 1 | 60 L | Nenhum | Ao falhar numa Coreografia de risco Ousado ou maior com esta arma, sofra a consequência do risco imediatamente abaixo. Não vale para Tudo ou Nada.

- Drenante | Comum | 1 | 60 L | Nenhum | Uma vez por turno, ao acertar, o alvo perde 1d4 de Mana.

- Assombrada | Comum | 1 | 60 L | Nenhum | Uma vez por cena, force o alvo a repetir um teste de resistência que já tenha passado contra um efeito de medo seu.

- Balanceada | Comum | Técnica | 25 L | Nenhum | Ignora a penalidade de peso pesado ao empunhar com uma mão só.

- Leve | Comum | Técnica | 25 L | Nenhum | Reduz em 1 os espaços de carga que a arma ocupa, mínimo 1.

- Silenciosa | Comum | Técnica | 25 L | Nenhum | Não produz som perceptível ao ser usada em um ataque.

- Devastadora | Marcial | 2 | 180 L | Força 14, ou Destreza 14 em arma de disparo | +2 dados de dano da arma.

- Elemental | Marcial | 2 | 180 L | Nenhum | +1d6 de dano de um tipo elemental escolhido na criação do item. Esse dado extra também multiplica no crítico.

- Sedenta | Marcial | 2 | 180 L | Nenhum | No crítico, o alvo passa a sangrar: sofre 1 dado de dano da arma no início de cada turno até ser tratado. Não acumula com outra Sedenta.

- Vampírica | Marcial | 2 | 180 L | Nível total 7 | Uma vez por turno, ao causar dano, role um dado do tipo da arma e recupere esse tanto de PV.

- Sintonizada | Marcial | 2 | 180 L | Fluxo 14 | O dano da arma passa a usar o Mod. Fluxo no lugar de Força ou Destreza.

- Exaustiva | Marcial | 2 | 180 L | Nível total 7 | No crítico, o alvo ganha 1 ponto de Cansaço. Uma vez por cena por alvo.

- Assinatura de Árvore | Marcial | 2 | 180 L | Nenhum | A arma se liga a uma Árvore na criação. Contra criaturas de qualquer outra Árvore, +1 dado de dano.

- Golpe de Misericórdia | Marcial | 3 | 450 L | Nível total 10 | Contra alvo que já esteja em Morrendo, seus ataques com esta arma acertam como crítico automático.

- Implacável | Marcial | 3 | 450 L | Nível total 10 | Uma vez por cena, transforme um acerto em crítico, sem precisar cair na Margem de Ameaça. Não combina com a Coreografia Tudo ou Nada no mesmo ataque.

Armaduras
12 modificações · 6 comuns · 6 marciais

- Modificação | Nível | Valor | Preço | Pré-requisito | Efeito

- Reforçada | Comum | 1 | 60 L | Nenhum | +1 de Defesa.

- Isolante | Comum | 1 | 60 L | Nenhum | Resistência 2 contra um tipo de dano elemental escolhido na criação do item.

- Camuflada | Comum | 1 | 60 L | Nenhum | Vantagem em Furtividade em terreno compatível com o padrão da armadura.

- Trilha Serena | Comum | 1 | 60 L | Nenhum | Ao terminar um descanso completo vestindo a armadura, reduza 1 ponto de Cansaço além do que a qualidade do descanso já tira.

- Flexível | Comum | Técnica | 25 L | Nenhum | Reduz em 1 a penalidade de armadura sobre Acrobacia, Atletismo e Furtividade.

- Ajustável | Comum | Técnica | 25 L | Nenhum | Se adapta automaticamente ao corpo de quem veste, sem custo de reforma.

- Bastião | Marcial | 2 | 180 L | Constituição 14 | Reduza 1d4 do dano físico recebido a cada ataque, aplicado depois da Resistência.

- Regenerativa | Marcial | 2 | 180 L | Nível total 7 | Quem veste recupera 1d4 PV no início do próprio turno, uma vez por rodada.

- Estabilizadora | Marcial | 2 | 180 L | Nenhum | Vantagem em testes para resistir a ser derrubado, empurrado ou agarrado.

- Âncora de Sanidade | Marcial | 2 | 180 L | Sabedoria 14 | Resistência 3 contra dano Mental e vantagem nos testes para não perder Sanidade.

- Retaliadora | Marcial | 3 | 450 L | Constituição 14 | Ao sofrer um crítico, quem veste devolve 1 dado de dano de impacto no atacante, sem gastar reação.

- Casca do Fim | Marcial | 3 | 450 L | Nível total 10 | Enquanto estiver em Morrendo, a DT dos seus testes de Morrendo cai 3.

Escudos
9 modificações · 4 comuns · 5 marciais

- Modificação | Nível | Valor | Preço | Pré-requisito | Efeito

- Reforçado | Comum | 1 | 60 L | Nenhum | +1d4 na redução de dano da reação Bloqueio.

- Espinhado | Comum | 1 | 60 L | Nenhum | Quem te acerta em combate corpo a corpo sofre 1d4 de dano perfurante.

- Leve | Comum | Técnica | 25 L | Nenhum | Não soma penalidade de armadura sobre Acrobacia.

- Retrátil | Comum | Técnica | 25 L | Nenhum | Pode ser guardado ou sacado como uma ação livre.

- Amplo | Marcial | 2 | 180 L | Nenhum | A reação Proteger passa a cobrir dois aliados adjacentes em vez de um.

- Repulsor | Marcial | 2 | 180 L | Nenhum | Ao usar Bloqueio com sucesso, empurre o atacante 1,5 m para longe de você.

- Vingativo | Marcial | 2 | 180 L | Nenhum | Ao usar Bloqueio, cause 1d6 de dano de impacto no atacante, sem gastar ação extra.

- Guarda de Fluxo | Marcial | 2 | 180 L | Fluxo 12 | Bloqueio passa a funcionar também contra dano de Energia, incluindo o que vem de Fluxos.

- Contratempo | Marcial | 3 | 450 L | Nível total 10 | Depois de um Contra-Ataque bem-sucedido, recupere sua reação. Uma vez por rodada.

Itens gerais e mágicos
12 modificações · 7 comuns · 5 marciais

- Modificação | Nível | Valor | Preço | Pré-requisito | Efeito

- Vinculado | Comum | 1 | 60 L | Nenhum | Só funciona plenamente nas mãos de quem o item reconhece como dono. Qualquer outro sofre −2 ao usá-lo.

- Ressonante | Comum | 1 | 60 L | Nenhum | +1 numa perícia específica, ligada à função do item.

- Portátil | Comum | Técnica | 25 L | Nenhum | Reduz em 1 os espaços de carga que o item ocupa, mínimo 1.

- Autoidentificável | Comum | Técnica | 25 L | Nenhum | Revela sozinho suas propriedades na primeira vez que é empunhado ou vestido.

- Recarregável | Comum | Técnica | 25 L | Nenhum | Se tiver cargas, recupera todas elas após um descanso completo.

- Sensível a Fluxo | Comum | Técnica | 25 L | Nenhum | Brilha, vibra ou esquenta perto de magia ou de um Fluxo específico escolhido na criação.

- Instável | Comum | Técnica | 25 L | Nenhum | 5% de chance de gerar um efeito colateral menor a cada uso. O Mestre define qual.

- Protetor | Marcial | 2 | 180 L | Nenhum | Resistência 4 contra um tipo de dano escolhido na criação do item, enquanto estiver equipado.

- Vitalício | Marcial | 2 | 180 L | Nenhum | Uma vez por dia, ao chegar a 0 PV, recupere 1d6 PV automaticamente antes de cair inconsciente.

- Amplificador | Marcial | 2 | 180 L | Nenhum | Uma vez por cena, role com vantagem um teste de perícia específico ligado à função do item.

- Reserva de Fluxo | Marcial | 2 | 180 L | Fluxo 12 | Guarda até 5 de Mana. Você pode gastar dessa reserva no lugar da sua, e ela enche de novo a cada descanso completo.

- Selado | Marcial | 3 | 450 L | Nível total 10 e Misticismo treinado | O item carrega um Selo inscrito, escolhido na criação. Uma vez por dia ele dispara sem gastar Mana nem exigir teste de inscrição.

Isso aqui é ponto de partida, não lista fechada. Modificação nova passa, desde que respeite o valor máximo por efeito da raridade e o nível condizente com o equipamento.

### Dons definidos por categoria

Além dos números, cada raridade se manifesta de um jeito que combina com a categoria do item. O texto do item pode dar personalidade a essa manifestação, desde que não aumente o efeito mecânico.

Arma

- **Incomum:** Temperamento: esquenta, zumbe ou brilha de leve quando quem a empunha é o dono.
- **Raro:** Voz desperta: fala ou passa impulsos simples, e com o tempo cria personalidade.
- **Épico:** Instinto de confronto: sente hostilidade por perto e tenta avisar quem a carrega.
- **Lendário:** Vontade de lenda: tem objetivos próprios e um poder único, do jeito que a descrição do item mandar.
- **Relíquia:** Golpe soberano: faz uma coisa impossível, ligada à história dela, com custo e limite que o Mestre aprova.
- **Relíquia da Criação:** Corte de princípio: mexe com uma lei da realidade, escolhida quando a relíquia foi criada.

Armadura

- **Incomum:** Sempre impecável: não segura poeira, lama nem cheiro, e se ajusta sozinha a quem veste.
- **Raro:** Memória de forma: some com arranhão de superfície durante um descanso. Durabilidade perdida não volta.
- **Épico:** Guarda desperta: reage ao perigo antes de você. Se mexe, brilha ou avisa de algum jeito.
- **Lendário:** Bastião consciente: conversa com quem a veste e tem uma defesa única, descrita no item.
- **Relíquia:** Corpo soberano: nada mundano a destrói enquanto a condição da história dela continuar de pé.
- **Relíquia da Criação:** Lei de proteção: impõe uma condição absoluta de defesa, combinada com o Mestre.

Consumivel

- **Incomum:** Conservação perfeita: enquanto estiver lacrado, tempo e clima comum não estragam.
- **Raro:** Dose responsiva: muda de sabor, cor ou temperatura para avisar se é seguro para aquela pessoa.
- **Épico:** Efeito excepcional: carrega uma propriedade a mais, descrita no item, gasta junto com ele.
- **Lendário:** Receita viva: se comunica por sinais e cobra uma condição especial para aceitar ser usada.
- **Relíquia:** Essência soberana: produz um efeito que só ela produz, e ninguém consegue copiar.
- **Relíquia da Criação:** Semente de princípio: ao ser consumida, muda alguma coisa para sempre. O que muda, o Mestre define.

Veiculo

- **Incomum:** Partida fiel: reconhece o condutor e avisa das falhas simples antes de sair do lugar.
- **Raro:** Navegador instintivo: guarda as rotas que já percorreu e sabe apontá-las de volta.
- **Épico:** Resposta desperta: ajusta sistemas e postura sozinho quando o perigo aparece, do jeito descrito no veículo.
- **Lendário:** Companheiro de jornada: tem personalidade e um jeito extraordinário de se deslocar.
- **Relíquia:** Travessia soberana: passa por um obstáculo que não deveria dar para passar, sob condição aprovada pelo Mestre.
- **Relíquia da Criação:** Caminho impossível: chega a um tipo de destino que veículo nenhum alcança.

Geral

- **Incomum:** Marca do dono: esquenta, vibra ou muda de cara quando o dono chega perto.
- **Raro:** Eco de uso: guarda impressões simples de quem já o usou, e revela por sinais.
- **Épico:** Função desperta: faz sozinho uma tarefa simples e bem delimitada.
- **Lendário:** Personalidade própria: fala, e tem um poder único que combina com a função dele.
- **Relíquia:** Autoridade soberana: manda em um assunto estreito, definido na história do objeto.
- **Relíquia da Criação:** Objeto de princípio: representa um conceito e interfere nele. Qual conceito, você decide com o Mestre.

## magia-fluxo

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Onze Fluxos aproveitáveis em magia, ritual, selo e encantamento, mais a fusão entre um Fluxo principal e um secundário.

A classe diz **como** você manipula a magia; o Fluxo nativo diz **o que** sai dali. São dez Fluxos naturais mais o artificial da Tecnologia: onze formas utilizáveis no total.

### Princípios dos Fluxos

- Cada alma nasce com um Fluxo natural, e só um. Exceção precisa estar escrita na história do personagem.

- Um segundo Fluxo sempre vem de fora: artefato, relíquia, núcleo tecnológico. Ele nunca passa a morar na alma.

- Fluxo alto não ensina magia. O acesso vem de classe, habilidade, item, Legado ou concessão do Mestre.

- Magia aprendida é permanente, a não ser que uma regra explícita fale em substituição.

**Fluxos oficiais:** Origem, Essência, Comunicação, Vitalidade, Inconstância, Físico, Espaço, Tempo, Vazio, Fim e Tecnologia. A Tecnologia é o único artificial, e é por isso que ela é a única que se instala.

**Fluxo do Fim:** raro, e precisa de autorização do Mestre antes de ser escolhido. Autorizado, funciona como qualquer outro.

- Classe mágica | Técnica

- Canalizador | Domínio direto e puro do Fluxo nativo.

- Sintonizador | Fusão do Fluxo nativo com catalisadores externos.

- Ritualista | Pactos e preparações prolongadas fora do combate.

- Invocador | Vínculo com seres e manifestações do Fluxo nativo.

- Cartista Arcano | Magias limitadas e organizadas por cartas preparadas.

- Interceptador | Interferência tecnológica da A.X.I.S contra Fluxos naturais.

### Teste e DT de magia

Teste = d20 + Mod. Fluxo + Grau de Misticismo + bônus específico da classe

DT de conjuração = 7 + (3 × círculo)

- Toda magia de círculo precisa alcançar a DT do próprio círculo para se estabilizar.

- Se houver alvo hostil, compare a *mesma* rolagem também com Reflexos, Fortitude ou Vontade dele.

- Ou seja: a magia pode estabilizar e ainda assim ser resistida. É uma rolagem só, lida duas vezes.

- Metade do nível não entra aqui. Essa fórmula é diferente da fórmula geral de testes, de propósito.

- A Mana sai no momento em que você declara a conjuração, e não volta se o teste falhar.

### Círculos, Fluxo e DT

- Círculo | Fluxo mínimo | DT | Mana base

- 1º | 14 | 10 | 2

- 2º | 18 | 13 | 4

- 3º | 22 | 16 | 7

- 4º | 26 | 19 | 10

- 5º | 30 | 22 | 14

- 6º | 34 | 25 | 19

- 7º | 38 | 28 | 25

- 8º | 42 | 31 | 32

- 9º | 46 | 34 | 42

- 10º | 50 | 37 | 55

Esses custos são a referência do círculo. Cada entrada do catálogo declara o custo final dela, que é o que vale na mesa.

### O preço dos círculos altos

Magia grande não sai de graça. A partir do 5º círculo, o Fluxo começa a deixar marca em quem o carrega, e no 10º ele cobra por magia aprendida. Todo preço tem os dois lados: um ganho concreto e um ônus concreto.

- **Marca do Fluxo (5º ao 9º):** ao alcançar cada um desses círculos, você recebe a Marca daquele círculo no seu Fluxo nativo. Ela não se escolhe e não se rola: é fixa por Fluxo, então dá para saber de antemão o que te espera. Perdeu o círculo, perdeu a Marca.

- **Cicatriz (10º):** cada magia de 10º círculo aprendida sorteia uma Cicatriz na tabela comum. Ela é mais pesada dos dois lados, e a mesma não sai duas vezes para o mesmo personagem.

- Marca e Cicatriz valem como Legado: o texto manda, e o Mestre arbitra o caso duvidoso.

- Concessão do Mestre não gera Cicatriz. Só conta magia de 10º que você aprendeu.

A ficha aplica as Marcas sozinha, porque elas saem do seu Fluxo e do seu círculo. A Cicatriz é sorteada na hora de aprender a magia e fica registrada.

### Marcas por Fluxo (5º ao 9º círculo)

Gênese

- Círculo | Marca | Ganho | Ônus

- 5º | Seiva no Sangue | A cura natural durante um descanso completo rende 50% a mais. | A pele ganha textura de casca. Desvantagem em testes sociais com quem te vê pela primeira vez.

- 6º | Primeira Vez Eterna | +2 na primeira rolagem que você faz em cada cena. | A segunda rolagem do mesmo tipo na mesma cena sai com -1.

- 7º | Germinação Involuntária | Onde você dorme, brota vida: comida simples e água limpa para o grupo, todo dia. | Você deixa um rastro verde por onde passa, e qualquer um consegue seguir.

- 8º | Ninhada | Uma vez por dia, um broto seu absorve um golpe inteiro dirigido a você. | Você come e bebe o dobro. Passar o dia sem comer já rende 1 Cansaço.

- 9º | Fonte Viva | +10 de Vida máxima e você estabiliza sozinho ao chegar a 0. | Cura mágica vinda de outro Fluxo que não o seu rende metade.

Alétheia

- Círculo | Marca | Ganho | Ônus

- 5º | Olho Aberto | Você enxerga disfarce, ilusão e invisibilidade de até 3º círculo sem precisar testar. | Mentir cobra caro: testes de Enganação saem com desvantagem.

- 6º | Nome à Mostra | Ao tocar uma criatura, você sabe o nome verdadeiro dela. | A recíproca vale: quem toca em você sabe o seu.

- 7º | Peso da Verdade | +5 em testes contra ilusão, transformação e troca de identidade. | Ilusão que você percebe e não desfaz te causa 1d6 de dano mental por cena.

- 8º | Transparência | Nada te possui, copia ou apaga tua memória. | Você também não pode ser disfarçado nem ocultado por magia, nem a de aliado.

- 9º | Verbo Fixo | Tua forma é inalterável: nenhuma transformação forçada pega em você. | Transformação benéfica também não pega, inclusive a que você mesmo quiser.

Parley

- Círculo | Marca | Ganho | Ônus

- 5º | Ouvido Fino | Você escuta conversas a até 30 m, mesmo através de parede fina. | Lugar movimentado atrapalha teu sono: descanso em cidade ou acampamento cheio rende 1 Cansaço a menos de recuperação.

- 6º | Boca do Fluxo | Todo mundo entende o que você diz, em qualquer idioma. | Sob pressão, você fala o que está pensando em voz alta.

- 7º | Rede Aberta | Aliados a até 25 m compartilham tua Iniciativa se ela for melhor que a deles. | Dano mental sofrido por um aliado vinculado também te atinge pela metade.

- 8º | Coro | Uma vez por cena, uma ordem sua vira ação livre para um aliado que te escute. | Silêncio absoluto te sufoca: cada hora nele rende 1 Cansaço.

- 9º | Voz de Muitos | Você fala com qualquer pessoa que já conheceu, a qualquer distância na mesma realidade. | Você não consegue guardar segredo de quem está vinculado a você: o que você sabe, eles sentem.

Anima

- Círculo | Marca | Ganho | Ônus

- 5º | Excesso | +5 de Vida máxima. | Você come e bebe o dobro, e passar fome te dá Cansaço mais rápido que os outros.

- 6º | Carne Que Não Para | Abaixo da metade da Vida, você recupera 1d6 ao começar o turno. | Toda cicatriz vira crescimento estranho. Desvantagem em testes sociais com estranhos.

- 7º | Imunidade Bruta | Você fica imune a doença mundana e a veneno comum. | Remédio, poção e antídoto rendem metade em você.

- 8º | Metabolismo Voraz | Você aguenta três dias sem dormir sem sofrer penalidade. | Teu descanso completo exige 12 horas, não 8.

- 9º | Coração Duplo | Uma vez por dia, ao chegar a 0 de Vida, você volta com metade da Vida máxima. | Cada uso te dá 2 Cansaço na hora.

Vórtice

- Círculo | Marca | Ganho | Ônus

- 5º | Nunca Igual | Uma vez por cena, você repete um teste já resolvido. | Você aceita o novo resultado, mesmo que seja pior.

- 6º | Pele Instável | No começo de cada cena, role 1d6 para uma resistência sorteada até o fim dela. | Role de novo: você também ganha uma vulnerabilidade sorteada.

- 7º | Sorte Torta | Tua margem de ameaça aumenta em 1 em tudo o que você faz. | A margem de falha crítica aumenta em 1 junto.

- 8º | Forma Errante | Uma vez por dia, uma característica física sua muda para algo útil na situação. | Você não escolhe qual, e a mudança dura até o próximo descanso completo.

- 9º | Roleta Viva | Uma vez por cena, você copia uma habilidade simples que tenha visto naquela cena. | Uma habilidade sua, sorteada, fica indisponível até o fim da cena.

Baluarte

- Círculo | Marca | Ganho | Ônus

- 5º | Elemento na Pele | Resistência 3 contra o teu elemento despertado. | Vulnerabilidade 3 ao elemento oposto, definido pelo Mestre na primeira vez.

- 6º | Peso de Pedra | +2 contra empurrão, agarrão e queda. | -3 m de deslocamento.

- 7º | Mão Pesada | +1 dado de dano em ataques corpo a corpo. | Trabalho delicado, de fechadura a caligrafia, sai com desvantagem.

- 8º | Corpo Mineral | Redução 3 contra dano físico. | Você afunda: nadar e escalar saem com desvantagem.

- 9º | Elemento Vivo | Uma vez por cena, você vira o elemento despertado por uma rodada e fica imune a dano físico. | Enquanto estiver assim, você não age, não fala e não conjura.

Matriz

- Círculo | Marca | Ganho | Ônus

- 5º | Passo Curto | Uma vez por cena, você teleporta 4,5 m com a ação de movimento. | A chegada embrulha: -1 em testes até o fim do teu próximo turno.

- 6º | Senso de Lugar | Você sempre sabe onde está e qual o caminho de volta, mesmo sem referência. | Entrar em lugar selado ou dobrado te causa 1d6 de dano mental.

- 7º | Distância Elástica | O alcance das tuas magias aumenta em 50%. | Magia de toque exige um teste de conjuração extra para funcionar.

- 8º | Presença Dobrada | Para efeitos de alcance, você ocupa dois espaços à tua escolha, a até 9 m um do outro. | Efeito de área que pegue qualquer um dos dois pega você.

- 9º | Fora do Mapa | Nenhuma barreira mundana te prende: você sempre acha a saída. | Teleporte e portal de outra pessoa não conseguem te levar junto.

Éon

- Círculo | Marca | Ganho | Ônus

- 5º | Descompasso | +2 em Iniciativa. | Noite mal dormida te dá 1 Cansaço a mais que aos outros.

- 6º | Eco Curto | Uma vez por cena, você repete a ação de movimento que acabou de fazer. | Ao fim da cena em que usar, 1 Cansaço.

- 7º | Anos Emprestados | +1 em todos os testes. | Você envelhece um ano a cada mês de campanha.

- 8º | Pausa Interna | Uma vez por dia, você ignora um turno inteiro de um efeito contínuo sobre você. | Você perde o teu turno seguinte.

- 9º | Fora da Contagem | Você age primeiro em toda rodada, antes de qualquer criatura. | Cura e regeneração em você rendem metade: para elas, teu tempo não passa.

Abismo

- Círculo | Marca | Ganho | Ônus

- 5º | Ausência | +2 em Furtividade e ninguém te ouve chegar. | Cura mágica em você rende metade.

- 6º | Sumidouro | Uma vez por cena, você absorve uma magia de até 3º círculo dirigida a você. | Magia benéfica de aliado é absorvida do mesmo jeito, e você não escolhe.

- 7º | Fome Interna | Ao reduzir uma criatura a 0 de Vida, você recupera 1d6 de Mana. | Descanso curto não te devolve Mana nenhuma.

- 8º | Silêncio Que Anda | Os sons ao teu redor somem quando você quiser, num raio de 3 m. | Você não conjura nada que dependa de voz, palavra ou comando falado.

- 9º | Quase Nada | Uma vez por dia, você deixa de existir por uma rodada: nada te atinge. | Ao voltar, ninguém se lembra de você por um minuto, aliados incluídos.

Limiar

- Círculo | Marca | Ganho | Ônus

- 5º | Toque Final | +1d6 de dano contra alvo com metade ou menos da Vida máxima. | Efeito benéfico sobre você dura uma rodada a menos.

- 6º | Olho do Fim | Você enxerga quem está perto da morte, e quanto perto. | Os moribundos enxergam você também, e procuram você.

- 7º | Ciclo Curto | Uma vez por cena, você encerra um efeito temporário ao toque. | O teu próprio efeito de concentração cai junto.

- 8º | Peso do Limiar | Você fica imune a medo e a qualquer efeito que dependa de esperança. | Recuperação de Sanidade em você rende metade.

- 9º | Marca do Término | Quem você reduz a 0 de Vida não estabiliza sozinho. | Você também não: sem mão alheia, você não volta.

A.X.I.S

- Círculo | Marca | Ganho | Ônus

- 5º | Leitura Constante | Você identifica dispositivo, Autômato e item energizado de imediato. | Precisa de um módulo A.X.I.S em mãos. Sem ele, -2 em testes de conjuração.

- 6º | Interferência | +2 em testes contra magia de Fluxo natural. | -2 em testes contra dano e efeitos tecnológicos.

- 7º | Registro | Magia que já te acertou uma vez te acerta com -2 nas próximas. | A A.X.I.S registra por onde você passa, e quem tem acesso à Malha consegue te rastrear.

- 8º | Carcaça | Redução 3 contra dano de energia. | Pulso eletromagnético te derruba como derruba máquina.

- 9º | Protocolo Vivo | Uma vez por cena, você intercepta uma magia de até 6º círculo com a reação. | Em área sem energia, você conjura com desvantagem.

### Cicatrizes (10º círculo)

- Cicatriz | Ganho | Ônus

- Peso da Fonte | +15 de Mana máxima. | Você só recupera Mana em descanso completo. Descanso curto não devolve nada.

- Olhos Abertos Demais | Você enxerga o invisível e o oculto a até 30 m, sempre. | Luz forte e súbita te cega por uma rodada.

- Corpo Emprestado | +10 de Vida máxima. | Toda cura mágica em você rende metade.

- Nome Escrito | +5 em testes de resistência contra magia. | Criaturas nascidas de Fluxo te reconhecem de longe, e vêm atrás.

- Voz Rachada | As tuas magias de área ficam 3 m maiores. | Você não consegue mais falar baixo. Furtividade que dependa de silêncio está fora.

- Mão Que Não Fecha | +2 dados de dano nas tuas magias de alvo único. | Você não consegue empunhar arma marcial nem exótica.

- Passo Fora | Uma vez por cena, você teleporta 9 m com a ação de movimento. | Nenhuma magia alheia consegue te transportar junto.

- Sono Curto | Teu descanso completo leva 4 horas. | Você sonha com o Fluxo. O Mestre pode dar visões, e nem todas são gentis.

- Segunda Sombra | Uma vez por dia, um duplo teu absorve um golpe inteiro. | O duplo age por conta própria, e nem sempre a teu favor.

- Pele de Fluxo | Redução 5 contra o tipo de dano do teu Fluxo nativo. | Vulnerabilidade 5 ao tipo oposto, definido pelo Mestre.

- Marca Visível | +5 em testes de presença e intimidação. | Você não passa despercebido em lugar nenhum, nunca mais.

- Reserva Rachada | Uma vez por cena, você conjura uma magia sem gastar Mana. | Ao fim dessa cena, 2 Cansaço.

### Concentração

- Uma magia ou efeito de concentração por vez. Começar outro encerra o anterior na hora, sem aviso.

- Ao sofrer dano, role Vontade contra DT 10 ou metade do dano recebido, o que for maior. Falhou, a concentração cai.

- Ficar Atordoado, Inconsciente ou incapaz de agir também derruba. Largar de propósito não custa ação nenhuma.

- A duração máxima está escrita na magia. Pagar Mana de novo não estica uma conjuração que já está de pé.

### Rituais

- Ritual não pertence a círculo nenhum e não entra em combate.

- A Mana fica comprometida no momento em que o ritual começa.

- Se interromperem o ritual, a Mana comprometida já era. Esse é o risco.

- Cada ritual vem de algum lugar: família, pacto, pergaminho, tradição. Ritual não se aprende sozinho.

### Fusão de Fluxos

- Toda magia tem um Fluxo principal, que define a identidade e o efeito central dela.

- Classe ou habilidade capaz de fundir aplica **um** Fluxo secundário por magia. Um.

- O secundário acrescenta a assinatura dele por cima. Não substitui o nativo, e não abre caminho para fusão tripla.

- Chegar ao Fluxo secundário exige o catalisador ou recurso que a fonte da fusão indicar.

### Selos e encantamentos

- Selo é efeito escrito antes, quase sempre consumível, que qualquer um pode disparar se cumprir a condição inscrita.

- Encantamento é padrão permanente, aplicado a um item, uma criatura ou um lugar.

- Quantos encantamentos cabem por raridade: Comum 1, Incomum 2, Raro 3, Épico 4 e Lendário 5.

### Catálogo

Use os filtros abaixo para procurar magias, rituais, selos, encantamentos e assinaturas de fusão.

## condicoes

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Sanidade, crises e as condições que ficam grudadas no personagem, cada uma com o que faz e como sai.

### Sanidade

d20 + bônus da perícia Sanidade ou Vontade contra DT 10 / 15 / 20 / 25

- Falhar custa 1d4, 1d6, 1d8 ou 2d6 de Sanidade, conforme o tamanho do que você viu.

- Sucesso crítico evita a perda inteira; sucesso corta pela metade; falha crítica maximiza os dados.

- Sanidade | Estado | Efeito

- 76–100 | Estável | Sem efeito.

- 51–75 | Abalado | −1 no primeiro teste mental após perder Sanidade.

- 26–50 | Enlouquecendo | Desvantagem para manter concentração sob ameaça.

- 1–25 | Ruptura | Ao sofrer nova perda, teste Vontade DT 15 ou ganhe uma condição de crise.

- 0 | Quebra | Crise imediata e uma condição permanente definida com o jogador.

### Crises

- Em Ruptura, cada nova perda cobra Vontade DT 15. Falhou, vem Pânico, Dissociação, Paranoia, Catatonia, Compulsão ou Fúria.

- Pânico, Dissociação, Catatonia e Fúria duram 1d4 rodadas, com Vontade DT 15 no fim do turno para sair antes.

- Paranoia vai até o fim da cena. Compulsão dá Vontade DT 15 no começo do turno para você agir normalmente.

- Em Sanidade 0 a crise é imediata, sem teste. Passada a cena, o personagem continua em 0 até descansar e ser tratado em segurança.

- A condição permanente da Quebra é definida junto com o jogador, e só muda por resolução na história ou tratamento longo.

### Condições gerais

- Condição | Efeito principal | Remoção

- Amedrontado | Desvantagem contra a fonte e não se aproxima dela. | Vontade contra a DT da fonte no fim do turno.

- Exposto | -2 Defesa. | Começo do próximo turno.

- Caído | -2 em ataques; ataques corpo a corpo contra você recebem +2. | Ação de movimento para levantar.

- Sangramento | 1d6 de dano no fim do turno; aplicações extras dão +1, até +5. | Cura DT 15 ou recuperar pelo menos 1 PV.

- Atordoado | Sem ações ou reações e -5 Defesa. | Fim da duração.

- Concentrando | Mantém um efeito; dano exige Vontade DT 10 ou metade do dano. | Falha no teste, incapacidade ou encerramento voluntário.

### Iniciativa estática

Iniciativa aqui não se rola: é um número da ficha, igual à Defesa. Você calcula uma vez e usa em todo combate.

- Iniciativa = 10 + metade do nível + Mod.Destreza + bônus.

- Empate se resolve pelo maior Mod.Sabedoria. Se persistir, personagens agem antes de NPCs.

- Surpreendido leva −5 na primeira rodada. Atrasar baixa sua posição de vez, pelo resto do combate.

### Defesas passivas

- Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir rolagem, use **10 + bônus total**.

- Quando você resiste ativamente a um perigo, role o d20 com esse mesmo bônus.

## classes

**Categoria:** Livro do Jogador

**Status:** Catálogo oficial

Classe comum serve a qualquer Árvore. Classe especial é mais forte, só aparece nas Árvores indicadas e depende do Mestre liberar.

Consulte o catálogo de classes na página de regras.

## racas

**Categoria:** Livro do Jogador

**Status:** Catálogo oficial

Raça comum pode nascer em qualquer Árvore. Raça especial é mais forte e só existe nas Árvores compatíveis.

Consulte o catálogo de raças na página de regras.
