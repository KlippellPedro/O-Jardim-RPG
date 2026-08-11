# Regras públicas de O Jardim RPG

> Arquivo gerado de `data/regras/regras.ts`. Não edite manualmente.

## criacao-personagem

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Um roteiro completo para criar um personagem de nível 1, escolher suas opções e conferir todos os valores da ficha.

O assistente de criação da ficha segue estas sete etapas. Faça as escolhas na ordem apresentada: opções posteriores dependem da Árvore, da raça e da classe escolhidas antes.

### Antes de começar

- Combine com o Mestre o tom da campanha, o nível inicial e quais opções especiais foram liberadas.

- Crie um conceito curto: quem é o personagem, o que ele procura e por que aceita se aventurar com o grupo.

- Na criação padrão, o personagem começa no **nível 1**, com uma classe comum. Raças ou classes especiais só entram por liberação explícita do Mestre ou por uma exceção escrita na própria opção.

### 1. Nome e Árvore de origem

Escolha o nome do personagem e a Árvore à qual ele pertence. A Árvore determina quais opções exclusivas podem aparecer. Se a campanha permitir um personagem sem Árvore (para manter sua origem oculta, por exemplo), ele tem acesso a todas as opções do compêndio.

### 2. Raça e variante

- Escolha uma raça disponível para sua Árvore. A raça define fisiologia, características raciais e ajustes próprios.

- Se a raça oferecer variante, linhagem ou outra escolha obrigatória, registre uma delas antes de avançar.

- Uma opção especial precisa estar liberada para esse personagem. Estar visível no catálogo não concede acesso automático.

### 3. Classe inicial

- Escolha uma classe comum disponível. Ela concede as recompensas do nível 1 e define os ganhos de Vida e Mana por nível.

- A classe inicial começa no nível 1. Entrar em outra classe depois segue as regras de progressão e multiclasse.

- Classe especial exige **nível total 20**, liberação do Mestre e um acontecimento na história, salvo uma exceção explícita que permita começar com ela.

### 4. Divindade

Registre a Deidade associada à sua Árvore ou outra entidade que o personagem cultue. Um personagem sem Árvore pode deixar esse campo vazio. Escolher uma divindade descreve crença e vínculo narrativo; não concede poderes além dos declarados por raça, classe, item ou outra regra.

### 5. Atributos

Distribua os valores entre Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma e Fluxo. Depois disso, a ficha aplica os ajustes raciais.

- **Conjunto padrão:** 15, 14, 13, 12, 10, 8 e 8. Cada número é usado uma vez.

- **Compra por pontos:** todos começam em 8; distribua exatamente 24 pontos, pagando 1 ponto por cada +1. Nenhum atributo passa de 15 antes dos ajustes raciais.

- **Variante aleatória:** role 7d20 e distribua os sete resultados, cada dado uma vez. Esse método não é equivalente aos anteriores e só deve ser usado com concordância da mesa.

### 6. Perícias e equipamento inicial

- Escolha exatamente **seis perícias** para começar em Aprendiz. Humano escolhe sete por Adaptabilidade.

- Escolha um item comum aprovado pelo Mestre. Ele entra no inventário como item de criação e não possui preço de revenda.

- Registre **20 Lunaris**. Nenhuma nova classe escolhida no futuro concede outro equipamento ou dinheiro inicial.

### 7. Conferência da ficha

- **Nível e XP:** nível total 1 e 0 XP

- **Vida máxima:** máx. 1, (4 × Mod.Constituição) + Vida da classe, depois ajustes raciais

- **Mana máxima:** máx. 1, (3 × Mod.Sabedoria) + Mana da classe, depois ajustes raciais

- **Sanidade:** 100 de 100

- **Cansaço:** 0 de 6

- **Defesa Natural:** 10 + ⌊Nível total ÷ 2⌋ + Mod.Destreza + ajustes raciais ou naturais

- **Defesa Total:** Defesa Natural + armadura, escudo, modificações e outros ajustes ativos

- **Movimento:** 9 m + (1,5 m × Mod.Destreza) + ajuste racial ou morfológico, mínimo 4,5 m

- **Iniciativa:** 10 + ⌊Nível total ÷ 2⌋ + Mod.Destreza + bônus

**Não some ajustes duas vezes:** a ficha calcula os derivados e aplica raça e equipamento automaticamente. Use ajustes manuais apenas para efeitos que ainda não estejam representados no sistema.

### Checklist final

- Nome, raça, variante e classe estão preenchidos. Árvore e divindade podem ficar vazias quando a campanha permitir personagem sem Árvore.

- Os sete atributos usam um método válido e os ajustes raciais aparecem uma única vez.

- Seis perícias estão em Aprendiz, ou sete se o personagem for Humano.

- Vida, Mana, Sanidade, Cansaço, Defesa, Movimento e Iniciativa conferem com o resumo.

- O inventário contém um item comum de criação e a carteira contém 20 Lunaris.

- O personagem possui um motivo para participar da campanha e trabalhar com o grupo.

## sistema-base

**Categoria:** Livro do Jogador

**Status:** Regra oficial

As fórmulas fundamentais, limites de nível, multiclasse, maestrias e o papel do atributo Fluxo.

### Fórmulas fundamentais

- **Modificador:** ⌊(Atributo − 10) ÷ 2⌋

- **Teste:** d20 + Mod. de Atributo + ⌊Nível ÷ 2⌋ + Grau

- **Vida no nível 1:** máx. 1, (4 × Mod.Constituição) + Vida da classe

- **Vida por nível posterior:** ganho de Vida da classe do nível adquirido, mínimo 1

- **Mana no nível 1:** máx. 1, (3 × Mod.Sabedoria) + Mana da classe

- **Mana por nível posterior:** ganho de Mana da classe do nível adquirido, mínimo 1

- **Ajustes raciais:** bônus raciais de Vida e Mana são somados depois do cálculo correspondente

- **Defesa Natural:** 10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + ajustes raciais ou naturais

- **Movimento:** 9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m

- **Iniciativa:** 10 + ⌊Nível ÷ 2⌋ + Mod.Destreza + bônus

### Nível e multiclasse

- **Nível total** é a soma dos níveis de todas as suas classes, incluindo as especiais.

- Cada classe vai até o **nível 20**. Só com classes comuns, o teto é **40 níveis totais**; com uma classe especial, sobe para **60**.

- Você pode ter no máximo **duas classes comuns e uma especial**.

- Os níveis podem ser intercalados. Para levar uma classe ao nível 20, o personagem precisa ter pelo menos nível 10 em outra classe.

- Classe especial exige nível total 20, liberação do Mestre e um acontecimento na história que justifique, a não ser que a própria classe abra uma exceção explícita.

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

### Catálogo de perícias

Luta, Pontaria, Fortitude, Reflexos e Vontade são perícias. Fortitude, Reflexos e Vontade também fornecem as respectivas Defesas passivas.

- Perícia | Atributo | Cobre

- Atletismo | Força | Realizar esforços físicos como correr, saltar, escalar, nadar, empurrar ou sustentar peso.

- Luta | Força | Atacar e executar manobras em combate corpo a corpo, incluindo agarrar, derrubar e contra-atacar.

- Fortitude | Constituição | Resistir a doenças, venenos, exaustão, dor e outros efeitos que ameaçam o corpo.

- Acrobacia | Destreza | Manter o equilíbrio, amortecer quedas, atravessar espaços difíceis e realizar movimentos acrobáticos.

- Cavalgar | Destreza | Conduzir montarias, permanecer montado sob pressão e executar manobras durante uma cavalgada.

- Furtividade | Destreza | Mover-se sem ser percebido, esconder-se e evitar deixar sinais óbvios de sua passagem.

- Ladinagem | Destreza | Abrir fechaduras, desarmar mecanismos, bater carteiras e manipular objetos com precisão discreta.

- Pilotagem | Destreza | Conduzir veículos, controlar máquinas em movimento e reagir a manobras ou terrenos perigosos.

- Pontaria | Destreza | Atacar com armas de disparo ou arremesso e acertar alvos a distância.

- Reflexos | Destreza | Reagir rapidamente para evitar armadilhas, explosões, efeitos de área e outros perigos súbitos.

- Conhecimento | Inteligência | Recordar informações acadêmicas sobre história, geografia, ciências, culturas e assuntos gerais.

- Guerra | Inteligência | Analisar batalhas, reconhecer táticas, comandar tropas e avaliar vantagens militares.

- Investigação | Inteligência | Examinar pistas, relacionar evidências, pesquisar arquivos e reconstruir acontecimentos.

- Misticismo | Inteligência | Identificar magias, criaturas e fenômenos sobrenaturais, além de compreender teoria arcana.

- Nobreza | Inteligência | Conhecer linhagens, brasões, etiqueta, política, leis e relações entre casas de poder.

- Cura | Sabedoria | Prestar primeiros socorros, diagnosticar males, estabilizar feridos e acompanhar tratamentos.

- Intuição | Sabedoria | Perceber intenções, emoções, mentiras por comportamento e quando algo em uma situação parece errado.

- Percepção | Sabedoria | Notar sons, movimentos, detalhes escondidos, emboscadas e mudanças no ambiente.

- Religião | Sabedoria | Conhecer divindades, cultos, símbolos, dogmas, cerimônias e tradições religiosas.

- Sobrevivência | Sabedoria | Orientar-se, rastrear, encontrar abrigo e recursos e reconhecer perigos naturais.

- Vontade | Sabedoria | Resistir a medo, coerção, ilusões, encantamentos e outros efeitos que tentam dominar a mente.

- Atuação | Carisma | Entreter ou emocionar uma plateia por música, dança, interpretação, oratória ou outra arte performática.

- Diplomacia | Carisma | Negociar, persuadir, mediar conflitos, pedir favores e melhorar a atitude de outras pessoas.

- Enganação | Carisma | Mentir, blefar, disfarçar intenções, imitar comportamentos e criar distrações convincentes.

- Intimidação | Carisma | Pressionar alguém por ameaça, presença ou demonstração de força para obter cooperação.

- Jogatina | Carisma | Entender jogos de azar, blefar durante apostas e reconhecer trapaças ou padrões de outros jogadores.

- Adestramento | Carisma | Acalmar, treinar, conduzir e ensinar comandos a animais ou criaturas domesticáveis.

- Ressonância | Sabedoria | Sentir Fluxos, reconhecer sua natureza e origem, identificar interferências e resistir à influência direta de Fluxos alheios.

- Tecnologia | Inteligência | Operar, diagnosticar, programar e reparar itens A.X.I.S, sistemas eletrônicos e maquinário avançado; Ofício cobre artesanato comum.

- Sanidade | Sabedoria | Manter a lucidez diante de horrores e traumas, reconhecer crises mentais e resistir aos efeitos da perda de Sanidade.

## acoes-coletivas

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Como ajudar outro personagem e como resolver situações em que o grupo inteiro precisa passar pelo mesmo desafio.

Nem toda ação coletiva usa a mesma resolução. Se uma pessoa executa a tarefa e as outras dão suporte, use **Ajudar**. Se todos estão expostos ao mesmo desafio e cada integrante importa, use um **Teste de Grupo**.

### Ajudar

- Antes da rolagem principal, o ajudante descreve uma contribuição concreta e escolhe uma perícia adequada. Ela pode ser a mesma do líder ou outra que realmente ajude naquela situação.

- Em combate, ajudar gasta uma **Ação Padrão**. Fora de combate, gasta tempo compatível com a tarefa.

- O ajudante faz seu teste contra DT 10 em uma tarefa fixa. Em um desafio que escala por nível, use DT 10 + ⌊nível do desafio ÷ 2⌋.

- Em sucesso, o teste principal recebe +2. Em sucesso crítico, recebe vantagem em vez de +2.

- Falha não concede bônus. Falha crítica também não impõe penalidade automática, mas pode produzir uma complicação quando a tentativa já envolvia risco real.

- No máximo **dois ajudantes** concedem bônus ao mesmo teste. Dois sucessos comuns chegam a +4.

- Cada contribuição precisa ser diferente e possível na ficção. Repetir a mesma ideia com mais pessoas não multiplica o bônus.

- O líder precisa aceitar a ajuda e só rola depois que os ajudantes resolverem suas tentativas.

- O Mestre pode dispensar o teste do ajudante quando a contribuição é automática, mas ela continua ocupando ação ou tempo.

- Ajudar não transfere proficiência, poder, imunidade ou permissão especial ao líder.

### Teste de Grupo

Use quando todos precisam atravessar o mesmo perigo: o grupo inteiro se esgueirando, escalando, resistindo a uma tempestade ou mantendo uma história convincente diante de vários observadores.

- Todos os participantes expostos fazem o teste indicado contra a mesma DT.

- O grupo vence se pelo menos metade dos participantes, arredondada para cima, obtiver sucesso.

- Cada sucesso crítico conta como dois sucessos. Cada falha crítica cancela um sucesso antes da contagem.

- Se o grupo falhar, a consequência atinge o grupo ou apenas quem falhou, conforme a natureza do perigo. O Mestre informa qual leitura vale antes das rolagens.

**Exemplo:** quatro personagens fazem Furtividade. O grupo precisa de dois sucessos. Se conseguir dois sucessos comuns e uma falha crítica, a falha crítica cancela um deles e o grupo falha.

### Quando não usar Teste de Grupo

- Se só uma pessoa precisa executar a tarefa, escolha um líder e use Ajudar.

- Se cada falha gera uma consequência individual independente, resolva os testes separadamente.

- Se a ação exige treinamento ou permissão que parte do grupo não possui, quem não cumpre o requisito não pode ser escondido dentro da média.

- Não combine Ajudar e Teste de Grupo na mesma resolução, salvo quando uma habilidade disser expressamente que pode.

### Ações coletivas maiores

Projetos de vários dias usam as regras da atividade correspondente, como treinamento, ritual ou fabricação. Ataques sincronizados usam o capítulo **Ataques Combinados**. Ajudar não permite somar dano, fundir magias nem transferir efeitos entre personagens.

## ataques-combinados

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Regras para sincronizar ataques contra um alvo sem criar ações, recursos ou efeitos adicionais.

Um Ataque Combinado reúne ataques contra o mesmo alvo e resolve o dano ao mesmo tempo. Cada participante continua usando sua própria arma, magia, teste e recurso.

### Requisitos

- Participam de 2 a 4 criaturas voluntárias que possam perceber e atingir o mesmo alvo.

- Cada participante precisa ter uma Ação Padrão e uma reação disponíveis.

- Somente ataques que causam dano a um único alvo podem entrar. Cura, área, invocação e controle são resolvidos separadamente.

- O grupo escolhe um líder apenas para definir o momento da resolução. O líder não empresta bônus aos demais.

### Preparação e resolução

- No próprio turno, cada participante declara a contribuição, reserva a Ação Padrão e gasta a reação. Mana e custos que a ação exige na declaração são pagos nesse momento. Quem já gastou uma dessas ações não pode participar.

- O ataque é resolvido no primeiro turno do líder depois que todos se prepararem. A preparação de um participante expira no início do próximo turno dele. Alcance, linha de efeito e alvo precisam continuar válidos.

- Na resolução, cada participante consome munição ou carga usada pelo ataque e faz a própria rolagem. Nenhum custo é pago duas vezes.

- Cada acerto causa o dano normal da contribuição. Cada erro não causa dano e não devolve ações ou recursos.

- Aplique vulnerabilidade, redução percentual e Resistência separadamente a cada contribuição. Depois, some o dano final dos acertos.

### Críticos, reações e efeitos

- Cada contribuição verifica a própria margem de ameaça e o próprio multiplicador. O crítico de um participante não multiplica o dano dos demais.

- O alvo usa as reações que tiver disponíveis. Cada reação afeta apenas a contribuição que acionou seu gatilho, salvo texto expresso em contrário.

- Efeitos adicionais de acerto são resolvidos por contribuição, mas efeitos iguais não acumulam além do limite da própria condição.

- Se todas as contribuições errarem, o Ataque Combinado falha. Custos e ações permanecem gastos.

### Interrupção

- Uma contribuição é perdida se o participante ficar inconsciente, incapaz de agir ou sem um ataque válido antes da resolução.

- Se o líder perder a contribuição, outro participante preparado assume a liderança. Se nenhum puder, o ataque é cancelado.

- Quando o ataque é cancelado antes da resolução, ações, reações e custos pagos na declaração continuam gastos. Munição e cargas ainda não usadas são preservadas.

### Magias e Fluxos

- Cada magia precisa alcançar a própria DT de conjuração e a defesa do alvo normalmente.

- Somar danos não altera tipo, alcance, área, duração ou efeito das magias.

- Ataque Combinado entre personagens não é Fusão de Fluxos. Ele não cria um novo efeito.

## combate

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

O que você faz no seu turno, como acertar, quando dá para reagir e de que jeito o dano entra.

### Seu turno

- **Ação Padrão:** atacar, usar uma habilidade, ajudar alguém ou tentar uma manobra.

- **Ação de Movimento:** se deslocar, levantar, sacar algo ou mexer num objeto que importe na cena.

- **Ação Completa:** consome a Ação Padrão e a Ação de Movimento do turno. Não pode ser iniciada depois que uma dessas ações foi gasta.

- **Ação Livre:** um gesto, uma fala curta ou soltar um objeto. Não realiza testes, ataques nem ativa habilidades, salvo quando uma regra específica permitir.

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

Sair do nível N e chegar ao N+1 custa N × 1.000 XP.

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

### Catálogo

- **Tô ficando bom:** Recebe +1 no modificador de um atributo à escolha (Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma).
- **Esquiva:** Você aprimora significativamente sua agilidade, recebendo +2 em Defesa e Reflexos.
- **Leitura Labial:** Permite interpretar falas de pessoas a uma certa distância, desde que consiga ver a boca do ser.
- **Mãos Leves:** Você ganha a capacidade de sacar qualquer item como ação livre.
- **Artista Marcial:** Você recebe proficiência em armas ou armaduras marciais; caso escolha uma segunda vez, recebe a outra que não foi escolhida.
- **Kit Diverso:** Você pode escolher um kit de qualquer coisa. Ele é renovado quando você gasta uma ação de descanso, mas ocupa +1 espaço no inventário.
- **Não é Tão Pesado:** Reduz a penalidade de armadura ou escudo em 1. Escolhendo uma segunda vez, a penalidade reduz em 3; escolhendo uma terceira vez, conta para ambos.
- **Correntes:** Você pode arremessar suas armas e puxá-las de volta no mesmo turno como ação de movimento (o dano é o mesmo).
- **Bala Ágil:** Você adiciona seu modificador de Destreza no dano de armas à distância.
- **Sempre no x1:** Sempre que estiver em 1x1, você causa mais dano no ser (teste de Furtividade).
- **Mágico?:** Você recebe vantagem para resistir ou conjurar magias.
- **Mágico!:** Você se concentra 1 turno a menos para realizar magias.
- **Sem Chance:** Uma vez por descanso, ao ter desastre natural, repita o d20 e mantenha o novo resultado.
- **Rapidinho:** Aumenta seu deslocamento em 2m. Escolhendo uma segunda vez, aumenta em 6m adicionais.
- **Sou Bom Nisso:** Você recebe +2 ou vantagem em Luta ou Pontaria.
- **Cozinheiro:** Recebe o ofício Cozinhar. Quem comer sua comida recupera 0,5 de cansaço e melhora a condição do local em 1 (máx: Boa).
- **Mais Potente:** Caso use duas mãos para atacar com uma arma de uma mão, você recebe +4 no ataque dessa arma (apenas armas corpo a corpo).
- **Sempre Foi Assim:** Armas que já são de duas mãos passam a dar +1 dado de dano (apenas armas corpo a corpo).
- **Ainda Não:** Você tem vantagem em testes de Constituição caso entre em "morrendo" ou tome dano massivo.
- **Desonroso:** Se estiver enfrentando um oponente desarmado, tem vantagem em testes de ataque e recebe +4 para desviar de qualquer ataque.
- **Código de Ética:** Você se torna incapaz de atacar seres desarmados. Porém, se o oponente estiver armado, seus ataques causam dano adicional igual à metade do seu nível (arredondado para baixo, até um máximo de +30) e você sempre age antes dele na iniciativa.
- **Monstro:** Você passa a dobrar seu modificador de Força em ataques corpo a corpo.
- **Ossos Duros:** Recebe 5 de redução a danos físicos.
- **Bruto:** Se não estiver usando armadura, você recebe metade do seu modificador de Força como bônus de Defesa.
- **Flexível:** Você treina muito sua mobilidade e por conta disso tem +1 ação de reação por turno.
- **Instinto Animal:** Você recebe +3 na Iniciativa fixa e nunca pode ser surpreendido em combate.
- **Mão Pesada:** Se acertar um ataque corpo a corpo crítico, o alvo é empurrado 3m para longe e cai no chão.
- **Quebra Dente:** Ataques corpo a corpo causam −2 na Defesa do inimigo até o fim do combate (acumulativo até −6).
- **Sem Tempo Irmão:** Você pode realizar uma ação de movimento extra no início do combate, antes de qualquer outro agir.
- **Tô de Pé Ainda:** Enquanto estiver com menos da metade da vida, você recebe +2 na Defesa e resistência a danos físicos.
- **Sortudo pra Cacete:** Eventos ruins têm menos chance de acontecer com você.
- **Mentiroso Nato:** Você tem vantagem em testes de Enganação, e mentiras simples nunca levantam suspeita.
- **Veterano de Guerra:** Você recupera o dobro de P.V. ou F.V. em cenas de descanso.
- **Posturado:** Você não pode ser derrubado ou empurrado enquanto estiver consciente. Caso morra, morre de pé.
- **Já fui CLT:** Você não se cansa tão fácil e não recebe o efeito de cansaço leve.
- **Selvagem:** Animais e criaturas irracionais não te atacam a menos que sejam provocados.
- **Eco do Fluxo:** Uma vez por cena, após gastar pelo menos 5 Mana em uma única habilidade, recupere 2 Mana no fim do turno. Não ativa com habilidades de custo reduzido para menos de 3 Mana.
- **Passo Entre Galhos:** Uma vez por turno, depois de obter sucesso em Acrobacia ou Furtividade, mova 2 m sem provocar reações. Esse movimento não atravessa obstáculos.
- **Memória do Eclipse:** Uma vez por sessão, peça ao mestre uma pista verdadeira sobre algo que o personagem já presenciou ou role Investigação ou Conhecimento com vantagem.
- **Vínculo Lunar:** Quando um aliado a até 15 m for alvo de um ataque, use sua reação e gaste 2 Mana para conceder +4 na Defesa contra somente esse ataque.
- **Segundo Tempo:** Uma vez por descanso, quando sair de Morrendo por receber cura, recupere 1d6 de Vida adicional e reduza 1 Cansaço.
- **Âncora da Árvore:** Uma vez por cena, quando for teleportado, banido ou deslocado dimensionalmente contra a vontade, use sua reação e gaste 2 Mana para permanecer onde está.

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

- MíticoAprovação do Mestre | 6 | 3 | ±5 | Ninguém reproduz e nada mundano destrói. Todo poder passa pelo Mestre.

- Relíquia da CriaçãoAprovação do Mestre | 7 | 3 | ±7 | Sempre única. Quebra regra comum só até onde o Mestre deixar.

### Modificações e efeitos na ficha

- Toda modificação ocupa um espaço da raridade, seja ela técnica, mágica ou especial.
- Uma modificação carrega no máximo um efeito automático na ficha. Efeito além disso sai dos espaços próprios da raridade.
- Bônus, vantagem e penalidade só entram na conta enquanto o item estiver equipado. Na mochila, não valem nada.
- O teto de valor vale por efeito, não no total. Vantagem ou desvantagem sempre conta como 1 efeito.
- Efeitos iguais de itens diferentes somam, mas o Mestre pode barrar quando as duas fontes não fizerem sentido juntas.
- Consumível aplica o efeito quando é usado. Guardado, ele não dá bônus nenhum.
- Lendário, Mítico e Relíquia da Criação passam pelo Mestre antes de entrar em jogo.

Uma modificação pode conceder Vida máxima, Defesa, Ataque, atributo ou bônus em perícia. Ao guardar ou desequipar o item, a ficha remove os ajustes automaticamente.

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

O catálogo contém 51 modificações, agrupadas pela categoria do equipamento.

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

- Sedenta | Marcial | 2 | 180 L | Nenhum | No crítico, o alvo recebe a condição Sangramento (usa o dado de dano da arma no lugar do 1d6 padrão, no fim de cada turno). Reaplicar segue a regra normal de Sangramento: +1 de dano por aplicação, até +5, sem novos dados. Remove-se como qualquer Sangramento: Cura DT 15 ou qualquer cura de pelo menos 1 PV.

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

Cada raridade também possui uma manifestação por categoria. A descrição pode alterar aparência e comportamento, sem aumentar o efeito mecânico.

Arma

- **Incomum:** Temperamento: esquenta, zumbe ou brilha de leve quando quem a empunha é o dono.
- **Raro:** Voz desperta: fala ou passa impulsos simples, e com o tempo cria personalidade.
- **Épico:** Instinto de confronto: sente hostilidade por perto e tenta avisar quem a carrega.
- **Lendário:** Vontade de lenda: tem objetivos próprios e um poder único, do jeito que a descrição do item mandar.
- **Mítico:** Golpe soberano: faz uma coisa impossível, ligada à história dela, com custo e limite que o Mestre aprova.
- **Relíquia da Criação:** Corte de princípio: mexe com uma lei da realidade, escolhida quando a relíquia foi criada.

Armadura

- **Incomum:** Sempre impecável: não segura poeira, lama nem cheiro, e se ajusta sozinha a quem veste.
- **Raro:** Memória de forma: some com arranhão de superfície durante um descanso. Durabilidade perdida não volta.
- **Épico:** Guarda desperta: reage ao perigo antes de você. Se mexe, brilha ou avisa de algum jeito.
- **Lendário:** Bastião consciente: conversa com quem a veste e tem uma defesa única, descrita no item.
- **Mítico:** Corpo soberano: nada mundano a destrói enquanto a condição da história dela continuar de pé.
- **Relíquia da Criação:** Lei de proteção: impõe uma condição absoluta de defesa, combinada com o Mestre.

Consumivel

- **Incomum:** Conservação perfeita: enquanto estiver lacrado, tempo e clima comum não estragam.
- **Raro:** Dose responsiva: muda de sabor, cor ou temperatura para avisar se é seguro para aquela pessoa.
- **Épico:** Efeito excepcional: carrega uma propriedade a mais, descrita no item, gasta junto com ele.
- **Lendário:** Receita viva: se comunica por sinais e cobra uma condição especial para aceitar ser usada.
- **Mítico:** Essência soberana: produz um efeito que só ela produz, e ninguém consegue copiar.
- **Relíquia da Criação:** Semente de princípio: ao ser consumida, muda alguma coisa para sempre. O que muda, o Mestre define.

Veiculo

- **Incomum:** Partida fiel: reconhece o condutor e avisa das falhas simples antes de sair do lugar.
- **Raro:** Navegador instintivo: guarda as rotas que já percorreu e sabe apontá-las de volta.
- **Épico:** Resposta desperta: ajusta sistemas e postura sozinho quando o perigo aparece, do jeito descrito no veículo.
- **Lendário:** Companheiro de jornada: tem personalidade e um jeito extraordinário de se deslocar.
- **Mítico:** Travessia soberana: passa por um obstáculo que não deveria dar para passar, sob condição aprovada pelo Mestre.
- **Relíquia da Criação:** Caminho impossível: chega a um tipo de destino que veículo nenhum alcança.

Geral

- **Incomum:** Marca do dono: esquenta, vibra ou muda de cara quando o dono chega perto.
- **Raro:** Eco de uso: guarda impressões simples de quem já o usou, e revela por sinais.
- **Épico:** Função desperta: faz sozinho uma tarefa simples e bem delimitada.
- **Lendário:** Personalidade própria: fala, e tem um poder único que combina com a função dele.
- **Mítico:** Autoridade soberana: manda em um assunto estreito, definido na história do objeto.
- **Relíquia da Criação:** Objeto de princípio: representa um conceito e interfere nele. Qual conceito, você decide com o Mestre.

## crafting

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Regras para fabricar, programar e reparar itens com materiais, ferramentas e tempo de trabalho.

A fabricação segue uma receita ou um projeto e exige materiais, ferramenta, tempo e um teste final.

### Procedimento

- Escolha uma receita ou registre um projeto.

- Defina preço de referência, raridade, quantidade, materiais, ferramenta e perícia.

- Pague o custo de materiais. Componentes específicos são consumidos quando o trabalho começa.

- Complete os dias de trabalho. Cada dia possui **6 horas**.

- As mesmas horas não contam como descanso, relaxamento ou treinamento. Cada personagem completa um bloco por dia e ganha 1 Cansaço ao final.

- Faça um teste da perícia indicada contra a DT da raridade.

Trabalho interrompido mantém o progresso e os materiais já investidos. Trocar o responsável pelo teste exige acesso ao projeto, às ferramentas e ao trabalho realizado.

### Receitas e projetos

- Receita registra resultado, raridade, quantidade, materiais, ferramenta, perícia, DT e tempo.
- Projeto é obrigatório para item novo. O efeito e o preço de referência são definidos antes do primeiro gasto.
- Copiar um item exige uma receita válida. Possuir ou desmontar o item não concede a receita automaticamente.
- Toda mudança de efeito, quantidade ou raridade cria outro projeto e exige nova aprovação quando aplicável.

### Raridade, DT, tempo e materiais

- Raridade | DT | Trabalho | Materiais | Requisito

- Comum | 10 | 1 dia | 50% | Receita ou projeto e ferramentas adequadas.

- Incomum | 15 | 3 dias | 60% | Receita ou projeto e ferramentas adequadas.

- Raro | 20 | 7 dias | 70% | A receita indica ao menos um material específico.

- Épico | 25 | 14 dias | 80% | Receita e ao menos um material raro ligado ao efeito.

- Lendário | 30 | 30 dias | 90% | Projeto de campanha, instalação adequada e materiais únicos definidos antes do trabalho.

- Mítico | Projeto de campanha | Projeto de campanha | Definido no projeto | Não pode ser reproduzida por crafting. Criação ou restauração ocorre como projeto de campanha.

- Relíquia da Criação | Projeto de campanha | Projeto de campanha | Definido no projeto | Não pode ser fabricada, copiada ou convertida a partir de outro item.

O custo de materiais é uma porcentagem do preço normal do item, arredondada para cima. Promoções não reduzem esse custo.

### Perícias e ferramentas

- Categoria | Perícia | Ferramenta | Aplicação

- Forja e artesanato | Ofício (A especialidade deve corresponder ao objeto fabricado.) | Kit de Ofício | Armas, armaduras, ferramentas, munição e objetos mundanos. Efeitos, modificações e limites continuam sujeitos à raridade do item.

- Alquimia | Ofício (Alquimia) | Laboratório Alquímico | Poções, remédios, ácidos, venenos e outros preparados consumíveis. A receita define doses, validade, forma de uso e efeito de cada dose.

- Tecnologia A.X.I.S | Tecnologia | Oficina A.X.I.S | Dispositivos A.X.I.S, sistemas eletrônicos, programação e maquinário avançado. Software exige hardware compatível e não concede efeito que o projeto não possua.

- Cibernéticos | Tecnologia | Sala de Implante | Fabricação, configuração e instalação de implantes cibernéticos. A instalação não ignora compatibilidade, limite de implantes nem pré-requisito do item.

Sem a ferramenta exigida, o trabalho não começa. Ofício é uma perícia personalizada; a especialidade deve corresponder à tarefa. Tecnologia cobre sistemas A.X.I.S e maquinário avançado.

### Resultado do teste

- **Sucesso crítico:** Conclui uma unidade. Preserve componentes comuns de valor máximo igual a 10% do custo de materiais. Não aumenta raridade, quantidade ou efeito.
- **Sucesso:** Conclui uma unidade conforme a receita ou o projeto.
- **Falha:** O item não é concluído. O progresso permanece; uma nova tentativa exige um dia e materiais adicionais.
- **Falha crítica:** O item não é concluído. A correção exige dois dias e materiais adicionais. O projeto não é destruído automaticamente.

Materiais adicionais são calculados sobre o custo inicial do projeto. Cada nova tentativa ocorre após o tempo adicional e o pagamento indicado.

### Reparos

- O reparo usa a mesma perícia e ferramenta da fabricação.

- A DT é a DT da raridade menos 5, no mínimo 10.

- O custo é 10% do preço normal do item, arredondado para cima.

- Itens comuns e incomuns exigem 2 horas. Itens raros e épicos exigem 6 horas.

- O reparo restaura a Durabilidade atual até a Durabilidade máxima. Não recupera consumíveis, cargas gastas ou item destruído e não acrescenta efeito ou modificação.

- Item lendário, Mítico ou Relíquia da Criação não usa reparo comum. Um projeto especial precisa registrar custo, tempo, ferramenta e DT antes do primeiro gasto.

### Alquimia

- Cada preparo produz a quantidade de doses indicada na receita. Sem quantidade expressa, produz uma dose.
- Dose expirada ou usada não pode ser recuperada por reparo ou desmontagem.
- Uma fórmula de Alquimista preparada após descanso é temporária e não conta como item fabricado.
- Substância com efeito não publicado exige aprovação antes da fabricação.

### Tecnologia e cibernéticos

- Tecnologia substitui Ofício apenas para item A.X.I.S, sistema eletrônico ou maquinário avançado.
- Programação altera funções previstas pelo projeto; não cria magia, poder de classe ou bônus sem suporte do item.
- Implante exige fabricação e instalação. A instalação dura 6 horas em sala-de-implante e exige testes simultâneos de Tecnologia e Cura contra a DT da raridade.
- Se qualquer teste de instalação falhar, o implante não concede efeito. O paciente sofre 1d6 de dano físico, e outra tentativa exige um dia e 10% do custo inicial em materiais.

### Materiais, Drops e comércio

- O custo usa o preço normal, sem promoção. Item sem preço usa o valor de um item publicado de mesma raridade e função; sem comparável, o projeto não começa.
- Materiais específicos e Drops só substituem parte do custo quando a receita permitir. Cada material é consumido uma vez e vale no máximo seu preço registrado.
- Um Drop não pode ser usado, vendido e recuperado no mesmo projeto. Desmontagem nunca devolve mais valor do que foi consumido.
- Item criado para uso próprio não possui lucro ou comprador automático. Revenda depende da economia local e não gera valor acima do gasto sem contrato ou demanda definidos antes da fabricação.
- Efeitos de classe que preparam fórmulas ou engenhocas temporárias seguem a própria classe. Eles não produzem estoque permanente nem removem custos deste capítulo.
- Cada personagem completa no máximo um bloco de 6 horas de crafting por dia, mesmo que trabalhe em projetos diferentes. Ao fim do bloco, ganha 1 Cansaço.

**Classes:** Alquimista e Engenheiro usam as habilidades descritas nas próprias progressões. Nenhuma classe é obrigatória para fabricar itens comuns, desde que o personagem cumpra os requisitos da receita.

## veiculos

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Regras de condução, perseguição, combate, colisão, avarias, reparo e montarias.

### Ficha veicular

Registre categoria, tamanho, Vida, Defesa, Resistência geral, resistências por tipo, deslocamento em metros, Manobrabilidade, capacidade, cobertura, tripulação mínima, sistemas, espaços de base, armas e avarias. O chassi genérico começa com Vida 10, Defesa 10, Resistência 0, deslocamento 4,5 m, Manobrabilidade 0, cobertura nenhuma, tripulação mínima 1 e nenhum espaço de base. Valores publicados no veículo prevalecem.

### Escala de Vida e dano

- Veículos, montarias, personagens e criaturas usam a mesma escala de Vida e dano.

- Role o dano indicado pela arma. Subtraia a Resistência geral e a resistência específica ao tipo do dano. O restante reduz a Vida.

- Não multiplique dano por causa do tipo do alvo. Uma arma precisa informar dados, bônus, tipo, alcance e crítico antes de entrar em combate.

- O valor antigo chamado Dano nas peças veiculares indica o patamar da arma. Ele não é dano fixo e não substitui a fórmula de dano da arma.

### Condução e tripulação

- Veículos usam **Pilotagem**. Montarias usam **Cavalgar**. Adestramento pode acalmar ou ensinar uma montaria, mas não substitui Cavalgar durante uma manobra.

- Qualquer personagem treinado na perícia adequada pode conduzir. A classe Piloto concede benefícios próprios, mas não é pré-requisito para comprar ou conduzir um veículo.

- Um personagem sem treinamento pode conduzir em situação rotineira. Sob pressão, faz o teste com desvantagem e não pode Acelerar, usar Evasão, Fechar passagem, Abalroar nem Preparar abordagem.

- Some a Manobrabilidade da ficha aos testes de Pilotagem feitos com o veículo. Uma montaria só altera Cavalgar quando sua ficha declarar um modificador.

- O veículo não recebe ações próprias. Condutor, artilheiros, operadores e passageiros gastam as ações dos próprios turnos.

- Papel | Função | Regra

- Condutor | Move o veículo e executa manobras com Pilotagem. Em montaria, usa Cavalgar. | O veículo precisa de um condutor para mudar direção ou velocidade durante combate e perseguição.
- Artilheiro | Opera uma arma instalada e faz os ataques exigidos por ela. | Cada ataque consome a ação do artilheiro. A arma não concede uma ação adicional ao veículo.
- Operador | Ativa sensores, escudos, comunicações e outros sistemas. | O sistema informa a ação e o teste necessários. Sistemas ativos respeitam o limite do Núcleo.
- Passageiro | Age normalmente e pode usar equipamentos que não façam parte do veículo. | Atacar de um veículo em movimento segue as regras de alcance e cobertura.

### Turno veicular

- Todos rolam Iniciativa normalmente. O movimento do veículo ocorre no turno do condutor.

- Conduzir custa uma Ação de Movimento. Sem essa ação, o veículo mantém curso e velocidade; parado, permanece parado.

- Cada arma ou sistema é usado por um tripulante. Uma mesma pessoa pode ocupar mais de um papel, mas não recebe ações adicionais.

- A tripulação mínima indica quantas pessoas são necessárias para preencher os postos obrigatórios. Sem condutor, o veículo não manobra; sem operador ou artilheiro, o respectivo sistema não é usado.

- Uma arma instalada só ataca mais de uma vez no turno quando sua descrição permitir.

### Perseguições

No fim de cada rodada, o fugitivo e o perseguidor fazem um teste oposto de Pilotagem ou Cavalgar. Quem tiver o maior deslocamento recebe +2 nesse teste. O fugitivo aumenta a distância quando vence; o perseguidor reduz quando vence. Empate mantém a faixa. Uma diferença de 10 ou mais altera duas faixas; qualquer outra vitória altera uma. Nenhum resultado altera mais de duas faixas.

- Faixa | Efeito

- Contato | Até 1,5 m. Permite colisão e abordagem.

- Curta | Até 5 m. Use a faixa Curto das regras de distância.

- Média | Até 15 m. Use a faixa Médio das regras de distância.

- Longa | Até 25 m. Use a faixa Longo das regras de distância.

- Escapou | O alvo saiu da perseguição e não pode ser alcançado nesta cena.

Terreno, clima, avarias e manobras podem conceder vantagem ou desvantagem. Se mais de um veículo persegue o mesmo alvo, cada perseguidor mantém sua própria faixa.

### Manobras

- Manobra | Teste | Sucesso | Falha

- ConduzirAção movimento | Sem teste em condições normais; Pilotagem ou Cavalgar DT 15 sob perigo, salvo DT expressa da fonte. | Mova até o deslocamento e altere a direção do veículo ou da montaria. | O veículo mantém o curso anterior e o condutor não executa outra manobra neste turno.

- AcelerarAção padrão | Pilotagem ou Cavalgar, DT 15. | Mova metade do deslocamento adicional ou receba vantagem no próximo teste de perseguição desta rodada. | Não recebe o benefício e sofre −2 de Defesa até o início do próximo turno do condutor.

- EvasãoAção padrão | Pilotagem ou Cavalgar, DT 15. | Receba +2 de Defesa até o início do próximo turno do condutor. | Sofra −2 de Defesa pelo mesmo período.

- Fechar passagemAção padrão | Teste oposto de Pilotagem ou Cavalgar. | O alvo não pode aumentar a distância na resolução desta rodada. | O alvo recebe vantagem no teste de perseguição desta rodada.

- AbalroarAção padrão | Pilotagem ou Cavalgar contra a Defesa do veículo ou os Reflexos da criatura. | Aplique a colisão aos dois envolvidos. O condutor escolhe encerrar ou manter o Contato. | O alvo não sofre dano. O atacante sofre −2 de Defesa até o início do próximo turno do condutor.

- Preparar abordagemAção padrão | Teste oposto de Pilotagem ou Cavalgar. | Mantenha o Contato até o início do próximo turno do condutor. A travessia usa o movimento de cada ocupante. | A distância muda para Curta.

- Recuperar controleAção movimento | Pilotagem ou Cavalgar, DT 15. | Remova a perda de controle e escolha a direção do movimento restante. | O veículo mantém direção e velocidade até o próximo turno do condutor.

### Ataques e ocupantes

- Armas instaladas usam Pontaria, salvo indicação diferente. O ataque é feito contra a Defesa do alvo e segue alcance, crítico e Resistência normais.

- Um ataque localizado contra um sistema sofre −5. Se for crítico e causar pelo menos 1 de dano depois da Resistência, gera uma avaria escolhida pelo atacante. Se o mesmo ataque cruzar um limite de Vida, escolha essa avaria em vez de rolar outra.

- Ocupante sem cobertura pode ser alvo normalmente. Cobertura parcial concede +2 de Defesa. Cobertura total impede ataque direto enquanto o ocupante permanecer protegido.

- Dano causado ao veículo não atinge os ocupantes, salvo quando o efeito declarar área, invasão da cabine ou dano aos ocupantes.

### Colisões

- Abalroar exige a faixa Contato. Colidir com obstáculo imóvel não exige ataque quando não houver como evitá-lo.

- Cada envolvido sofre o dano correspondente ao tamanho do outro. Role separadamente e aplique Resistência.

- Velocidade não altera os dados da tabela. Uma manobra, queda ou perigo só altera o dano quando sua própria regra informar os novos dados.

- Ocupante sem fixação faz Reflexos DT 15. Em falha, sofre metade do dano causado ao veículo, arredondado para baixo. Cinto, sela ou fixação adequada concede vantagem.

- **Pequeno:** 1d6
- **Médio:** 2d6
- **Grande:** 4d6
- **Enorme:** 6d6
- **Colossal:** 8d6

### Dano e avarias

- Ao passar de mais da metade da Vida para metade ou menos, role uma avaria.

- Ao chegar a 0 de Vida, o veículo fica incapacitado e sofre outra avaria. Ele não usa Morrendo.

- Dano não reduz a Vida abaixo de 0. O veículo permanece Incapacitado até ser reparado. Só um efeito que declare destruição pode torná-lo irrecuperável.

- Uma avaria repetida aplica o efeito indicado na última coluna. Um veículo mantém no máximo seis tipos de avaria ativos.

- d6 | Avaria | Efeito | Repetição

- 1 | Controles | Desvantagem em Pilotagem até o reparo. | O veículo perde o controle e precisa da manobra Recuperar controle.

- 2 | Propulsão | Reduza o deslocamento à metade até o reparo. | O veículo não pode se mover por propulsão própria.

- 3 | Armamento | Uma arma instalada, escolhida aleatoriamente, fica inoperante. | Outra arma instalada fica inoperante. Sem outra arma, repita a rolagem de avaria.

- 4 | Defesas | Sofra −2 de Defesa até o reparo. | Reduza a Resistência em 2, mínimo 0, até o reparo.

- 5 | Núcleo | Um sistema ativo, escolhido aleatoriamente, é desligado. | Reduza em 1 o limite de sistemas ativos, mínimo 0, até o reparo.

- 6 | Casco | A cobertura dos ocupantes cai um grau: total para parcial ou parcial para nenhuma. | O próximo dano recebido ignora a Resistência; depois, remova esta repetição.

### Reparo

- **Reparo emergencial:** adjacente ao componente, ferramentas adequadas, Ação Padrão e Tecnologia ou Ofício apropriado contra DT 15. Sucesso suspende uma avaria até o fim da cena. Cada avaria aceita uma tentativa por cena.

- **Manutenção:** seis horas, ferramentas, local de trabalho e materiais no valor de 10% do preço do veículo. Faça Tecnologia ou Ofício apropriado contra DT 10 + número de avarias ativas. Sucesso remove uma avaria e restaura 10% da Vida máxima, arredondado para baixo, mínimo 1.

- Um veículo incapacitado volta a operar quando fica com pelo menos 1 de Vida e remove ao menos uma avaria adquirida ao chegar a 0.

- Habilidades, oficinas e sistemas de reparo que indiquem outro tempo ou valor substituem esta regra.

### Montarias

- A montaria mantém sua própria Vida, Defesa, Resistências e condições. Ela não recebe avarias veiculares.

- Montaria treinada age na Iniciativa do cavaleiro. O cavaleiro gasta sua Ação de Movimento para conduzi-la. Atacar com a montaria gasta a Ação Padrão do cavaleiro.

- Montaria inteligente que age sem comando mantém sua própria Iniciativa e ações. O cavaleiro não controla as decisões dela com Cavalgar.

- Montaria terrestre respeita terreno e espaço. Montaria voadora precisa manter o deslocamento exigido por sua ficha; se perder o controle, começa a cair até recuperar o controle ou pousar.

- Montaria e cavaleiro são alvos separados. O cavaleiro recebe cobertura apenas quando a anatomia ou o equipamento da montaria declarar isso.

### Tiers dos componentes

- Tier | Acesso | Uso

- T0 | Base | Chassi ou sistema sem melhoria.

- T1 | Regular | Primeiro patamar funcional do componente.

- T2 | Avançado | Componente especializado.

- T3 | Superior | Componente de alto desempenho.

- T4 | Restrito | Exige liberação do Mestre e descrição completa do componente.

- Núcleo define sistemas ativos; Estrutura ajusta deslocamento e Resistência; Armas precisam de perfil completo; Utilidades aplicam o efeito descrito.

- Os preços existentes permanecem no catálogo. Esta regra não cria preço para T4 nem altera preços publicados.

- Deslocamento escrito em metros no veículo completo prevalece sobre índices antigos de chassi ou componente.

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

- Marca e Cicatriz contam como Legado para efeitos que citem Legados. Elas não ocupam vaga de Legado.

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

- Em Ruptura, cada nova perda de Sanidade cobra Vontade DT 15; falhou, vem uma das crises abaixo.

- Em Sanidade 0 a crise é imediata, sem teste. Passada a cena, o personagem continua em 0 até descansar e ser tratado em segurança.

- A condição permanente da Quebra é definida junto com o jogador, e só muda por resolução na história ou tratamento longo.

- Crise | Duração | Efeito | Remoção

- Pânico | 1d4 rodadas. | Fique Amedrontado pela fonte e use o movimento para se afastar dela. | Vontade DT 15 no fim de cada turno encerra a crise.

- Dissociação | 1d4 rodadas. | Não pode usar reações e sofre -2 em testes de percepção e interação. | Vontade DT 15 no fim de cada turno encerra a crise.

- Paranoia | Até o fim da cena. | Não recebe bônus de ajuda e testa Vontade DT 15 para aceitar cura de outra criatura. | Termina em segurança ao fim da cena.

- Catatonia | 1d4 rodadas. | Fique Atordoado, mas receba +5 contra empurrões e agarrões. | Um aliado pode usar ação padrão e Medicina ou Persuasão DT 15.

- Compulsão | Até cumprir uma ação simples ou superar a crise. | No turno, deve realizar a ação compulsiva definida pela fonte antes de outras ações. | Vontade DT 15 no começo do turno permite agir normalmente.

- Fúria | 1d4 rodadas. | Receba +2 no dano corpo a corpo e -2 Defesa. Deve atacar uma ameaça visível se puder. | Vontade DT 15 no fim do turno encerra a crise.

### Condições gerais

- Condição | Efeito principal | Remoção

- Amedrontado | Desvantagem em testes contra a fonte do medo. Não pode se aproximar voluntariamente da fonte. | No fim do turno, Vontade contra a DT da fonte encerra a condição.

- Exposto | Defesa reduzida em 2. Exposto não acumula consigo mesmo. | Termina automaticamente no começo do próximo turno.

- Caído | Ataques corpo a corpo contra você recebem +2. Seus ataques sofrem -2. Levantar consome a ação de movimento e provoca reações. | Gaste a ação de movimento para levantar.

- Sangramento | Sofra 1d6 de dano no fim do turno. Novas aplicações aumentam o dano em +1, até +5, mas não adicionam dados. | Cura DT 15 com ação padrão ou qualquer cura de pelo menos 1 PV.

- Atordoado | Não pode usar ações nem reações. Defesa reduzida em 5. Veja também Inconsciente: mesmo efeito de base, mas para quando a causa for perder toda a Vida, não um efeito temporário. | Termina ao fim da duração. Uma nova aplicação apenas renova a duração.

- Agarrado | Movimento 0. Ataques contra alvos que não participam do agarrão sofrem -2. | Ação padrão e teste oposto de Atletismo ou Acrobacia.

- Cego | Desvantagem em testes que dependem de visão. Ataques contra você recebem +2 se o atacante puder vê-lo. | Remova ou supere a fonte da cegueira.

- Imobilizado | Movimento 0. Não pode usar ações que exijam deslocamento. | Teste indicado pela fonte como ação padrão.

- Inconsciente | Não pode agir nem reagir. Defesa reduzida em 5 e falha automaticamente em testes de Força e Destreza. Veja também Atordoado: use Atordoado para efeitos temporários que não vêm de perder toda a Vida. | Recupere-se da causa. Em Morrendo, volte a pelo menos 1 PV.

- Surpreendido | Iniciativa reduzida em 5 na primeira rodada. Sem reação até realizar o primeiro turno. | Termina depois do primeiro turno.

- Concentrando | Só pode manter um efeito de concentração por vez. Ao sofrer dano, teste Vontade DT 10 ou metade do dano, o que for maior. Falha encerra o efeito. | Encerre voluntariamente, fique incapacitado ou falhe no teste de concentração.

### Iniciativa estática

Iniciativa aqui não se rola: é um número da ficha, igual à Defesa. Você calcula uma vez e usa em todo combate.

- Iniciativa = 10 + metade do nível + Mod.Destreza + bônus.

- Empate se resolve pelo maior Mod.Sabedoria. Se persistir, personagens agem antes de NPCs.

- Surpreendido leva −5 na primeira rodada. Atrasar baixa sua posição de vez, pelo resto do combate.

### Defesas passivas

- Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir rolagem, use **10 + bônus total**.

- Quando você resiste ativamente a um perigo, role o d20 com esse mesmo bônus.

## aflicoes

**Categoria:** Combate e Mecânicas

**Status:** Regra oficial

Exposição, progressão, estágios e tratamento de venenos, doenças e vícios.

### Aplicação

- Ao sofrer exposição, teste Fortitude contra a DT da aflição. Sucesso ou sucesso crítico evita a aflição. Falha aplica o estágio 1 depois da incubação; falha crítica aplica o estágio 2.

- No fim de cada intervalo, faça outro teste. Sucesso crítico reduz 1 estágio; sucesso mantém; falha aumenta 1; falha crítica aumenta 2.

- O estágio não passa do maior valor do catálogo. Seus efeitos não se acumulam com os de estágios anteriores, salvo indicação expressa.

- Ao chegar ao estágio 0, remova a aflição e restaure qualquer atributo drenado conforme a recuperação indicada.

### Exposições repetidas

Uma nova exposição à mesma aflição exige Fortitude. Falha aumenta 1 estágio imediatamente. Esse aumento ocorre no máximo uma vez por cena. Aflições diferentes são acompanhadas separadamente.

### Tratamento

- Cura usa a DT, o tempo e o limite registrados na aflição. Sucesso reduz 1 estágio.

- O Antídoto da loja encerra um veneno ativo. Preparos específicos que citam doença também podem encerrá-la.

- Cansaço recebido ao entrar em um estágio permanece até ser reduzido pelas regras de descanso.

- Drenagem de atributo é temporária, não acumula entre estágios e não pode passar de −3 por aflição.

### Imunidades

Use a extensão exata da característica racial. Golem não contrai doenças comuns. Auleth é imune a doenças comuns e sobrenaturais. Autômato é imune a doenças e venenos enquanto não possuir Máquina Viva. Outras fisiologias só recebem imunidade quando o próprio texto determinar.

### Dependência e abstinência

- Um vício só começa quando seu gatilho de dependência for cumprido e o teste indicado falhar.

- Durante abstinência, aplique apenas os efeitos mecânicos do estágio. O jogador continua decidindo as ações do personagem.

- Usar a substância pode suspender efeitos conforme o catálogo, mas não reduz o estágio nem substitui tratamento.

### Catálogo de aflições

Toxina Paralisante

**veneno** comum · Fortitude DT 15 · incubação imediata · intervalo 1 rodada

**Exposição:** Contato da toxina com o sangue ou ingestão de uma dose.

- **Estágio 0:** Sem efeito.
- **Estágio 1:** Movimento reduzido pela metade.
- **Estágio 2:** Movimento 0. Desvantagem em testes de Força e Destreza.
- **Estágio 3:** Fica Imobilizado. Não pode usar reações.

**Tratamento:** Cura DT 15; Ação padrão. Reduza o estágio em 1. Uma tentativa por intervalo.

Peçonha Hemorrágica

**veneno** comum · Fortitude DT 16 · incubação imediata · intervalo 1 rodada

**Exposição:** Ferimento causado por presa, ferrão ou arma contaminada.

- **Estágio 0:** Sem efeito.
- **Estágio 1:** Sofra 1d6 de dano de veneno no fim do intervalo.
- **Estágio 2:** Sofra 2d6 de dano de veneno no fim do intervalo.
- **Estágio 3:** Sofra 3d6 de dano de veneno no fim do intervalo.

**Tratamento:** Cura DT 16; Ação padrão. Reduza o estágio em 1. Uma tentativa por intervalo.

Febre dos Esporos

**doenca** comum · Fortitude DT 14 · incubação 6 horas · intervalo 1 dia

**Exposição:** Uma hora em área contaminada sem proteção respiratória.

- **Estágio 0:** Sem efeito.
- **Estágio 1:** −1 em testes físicos.
- **Estágio 2:** −2 em testes físicos. Ganhe 1 Cansaço.
- **Estágio 3:** Desvantagem em testes físicos. Descanso recupera uma categoria abaixo do normal, mínimo Péssima. Ganhe 1 Cansaço.

**Tratamento:** Cura DT 14; 1 hora. Reduza o estágio em 1. Uma tentativa por dia.

Definhamento Arcano

**doenca** sobrenatural · Fortitude DT 20 · incubação 1 dia · intervalo 1 dia

**Exposição:** Contato direto com foco infeccioso sobrenatural.

- **Estágio 0:** Sem efeito.
- **Estágio 1:** −1 em Fortitude.
- **Estágio 2:** −1 em Fortitude. Drenagem temporária: −1 Constituição.
- **Estágio 3:** Desvantagem em Fortitude. Drenagem temporária: −2 Constituição.

**Tratamento:** Cura DT 20; 1 hora e um reagente mágico de 50 Lunaris, consumido na tentativa. Reduza o estágio em 1. Uma tentativa por dia.

Dependência de Estimulante

**vicio** comum · Fortitude DT 15 · incubação imediata · intervalo 1 dia

**Exposição:** Uso repetido conforme o gatilho de dependência.

- **Estágio 0:** Sem efeito.
- **Estágio 1:** −1 em Iniciativa durante abstinência.
- **Estágio 2:** −2 em Iniciativa e em testes de Inteligência durante abstinência.
- **Estágio 3:** Desvantagem em testes de Inteligência durante abstinência. Ganhe 1 Cansaço.

**Tratamento:** Cura DT 15; 1 hora de acompanhamento durante um descanso. Reduza o estágio em 1. Uma tentativa por dia.

## classes

**Categoria:** Livro do Jogador

**Status:** Catálogo oficial

Classe comum serve a qualquer Árvore. Classe especial é mais forte, só aparece nas Árvores indicadas e depende do Mestre liberar.

Nome, tipo e conceito de cada classe. Progressão completa (habilidades, poderes e eventos por nível) fica no catálogo interativo da página de Regras, que lê o mesmo arquivo.

- **Guerreiro** (comum) — Fica na frente porque alguém tem que ficar. Aguenta pancada, puxa o inimigo pra si e comanda um batalhão que luta melhor perto dele.
- **Piloto** (comum) — Não vai a pé. Luta de dentro de um veículo que ele mesmo melhora peça por peça, e o veículo cresce junto com o personagem.
- **Ninja** (comum) — Foi treinado por um clã e ainda deve satisfação a ele. Sobe na hierarquia, ganha armas e técnicas conforme o clã vai confiando, e rende muito mais quando ninguém sabe que ele está ali.
- **Pop Star** (comum) — Resolve com plateia o que os outros resolvem no braço. Fama abre porta, presença segura atenção, e uma boa apresentação costuma valer mais que uma ameaça.
- **Espadachim** (comum) — Uma espada, a vida inteira. Troca de postura no meio da luta e encadeia golpes que só fazem sentido em sequência: errar um estraga os outros.
- **Lutador** (comum) — Sem arma, sem armadura, sem desculpa. Marca o inimigo golpe a golpe e ganha a briga no fôlego, não no primeiro impacto.
- **Atirador** (comum) — Trabalha longe e chega preparado. Posição, munição e paciência valem mais que reflexo, e ele sempre sabe quantos tiros ainda tem.
- **Médico** (comum) — Mantém o grupo de pé. Diagnostica, estabiliza quem caiu e devolve gente pra luta. O que ele não faz é desfazer o que já aconteceu.
- **Guardião** (comum) — Escolhe alguém pra proteger e leva a sério. Cria vínculo, obriga o inimigo a decidir em quem bater e absorve o que vier, até onde a reação e a cena aguentarem.
- **Caçador** (comum) — Estuda a presa antes de encostar nela. Cada tipo de criatura pede um método, e o que ele aprende sobre uma vale pra todas daquela família.
- **Engenheiro** (comum) — Chega com as coisas montadas. Prepara invenções que duram pouco, melhora o equipamento do grupo e força a máquina além do limite quando a hora pede, sabendo o que isso vai custar.
- **Alquimista** (comum) — Transforma o que encontra pelo caminho em elixir. O estoque zera no descanso, então cada frasco é uma decisão: usa agora ou guarda pro que vem depois.
- **Comerciante** (comum) — Ganha a briga antes dela começar. Contato certo, informação na hora e estoque bem escolhido resolvem mais que dado. E não, ele não fabrica dinheiro.
- **Campeão Dimensional** (especial) — Classe especial de Baluarte. Corpo acima do que um corpo deveria aguentar. Os picos de poder são curtos e contados, e nenhum deles impede de morrer.
- **Pirata Amaldiçoado** (especial) — Classe especial do Abismo. Comanda maré espectral e maldição de curta duração, à frente de uma tripulação que já morreu e ainda não aceitou.
- **Cartista Arcano** (especial) — Classe especial, aberta a qualquer Árvore. Conjura por cartas preparadas antes: o baralho decide o que você tem em mãos hoje, e o Fluxo nativo decide o que cada carta faz.
- **Guia Dimensional** (especial) — Classe especial da Matriz. Conhece rota, portal e âncora: é por causa dele que o grupo chega em lugar onde não existe estrada.
- **Caçador de Entidades** (especial) — Classe especial de Anima. Caça o que ataca por dentro: possessão, coisa que come memória, coisa que veste corpo alheio.
- **Escritor de Contos** (especial) — Classe especial do Limiar. Transforma história, presságio e verdade pequena em apoio pro grupo. O que ele conta tem uma tendência incômoda a acontecer.
- **Invocador** (especial) — Classe especial, aberta a qualquer Árvore. Não luta sozinho: chama. O que atende depende inteiramente do Fluxo nativo, e nem sempre é o que ele esperava.
- **Viajante** (especial) — Classe especial da Matriz, de Éon ou de Vórtice. Vive entre Árvores e dimensões, e converte estrada rodada em capacidade de se virar em qualquer lugar.
- **Decodificador** (especial) — Classe especial de Alétheia. Lê padrão, código e mentira antes de qualquer um, e guarda o que descobriu até a hora em que aquilo vira vantagem.
- **Codificador** (especial) — Classe especial da A.X.I.S. Escreve protocolo temporário direto na realidade pra proteger, melhorar e controlar o terreno da luta.
- **Canalizador** (comum) — Fluxo puro, direto, sem intermediário nenhum. É a forma mais simples de conjurar e a mais difícil de fazer bem.
- **Sintonizador** (comum) — Alinha o Fluxo nativo a catalisadores de fora pra fazer o que ele sozinho não faria. Nada disso passa a morar na alma: é sempre empréstimo.
- **Ritualista** (comum) — Trabalha fora do combate. Ritual não tem círculo, cobra tempo e compromete a Mana desde o primeiro minuto: se interromperem, a Mana já foi.
- **Interceptador** (especial) — Classe especial da A.X.I.S. Entra na Malha pra derrubar a magia dos outros. Não conjura Fluxo natural, atrapalha quem conjura.

## racas

**Categoria:** Livro do Jogador

**Status:** Catálogo oficial

Raça comum pode nascer em qualquer Árvore. Raça especial é mais forte e só existe nas Árvores compatíveis.

Nome, tipo e ajustes iniciais de Vida, Mana e Movimento de cada raça. Fisiologia, traços e variantes completos ficam no catálogo interativo da página de Regras, que lê o mesmo arquivo.

- **Humano** (comum) — Vida +0, Mana +0
- **Vampiro** (comum) — Vida +1, Mana +0
- **Goblim** (comum) — Vida -1, Mana +1, Movimento +1.5 m
- **Anão** (comum) — Vida +2, Mana +0
- **Golem** (comum) — Vida +5, Mana -2
- **Espírito** (comum) — Vida -2, Mana +3
- **Gigante** (comum) — Vida +4, Mana -1
- **Animália** (comum) — Vida +0, Mana +0
- **Sereia / Tritão** (comum) — Vida -1, Mana +2
- **Miceliano** (comum) — Vida +1, Mana +1
- **Slime** (comum) — Vida +3, Mana -2
- **Feérico** (comum) — Vida -2, Mana +4
- **Elfo** (especial) — Vida +2, Mana +4
- **Desperto** (especial) — Vida +4, Mana +2
- **Auleth** (especial) — Vida +2, Mana +0
- **Autômato** (especial) — Vida +0, Mana +0
- **Clone** (especial) — Vida +3, Mana +3
- **Errante** (especial) — Vida +3, Mana +3
- **Amálgamo** (especial) — Vida +5, Mana +1
- **Bruxa** (especial) — Vida +1, Mana +5

## bestiario

**Categoria:** Guia do Mestre

**Status:** Regra oficial

Catálogo de seres, familiares, servos, invocações e preços por fórmula.

Bestiário: preços por FÓRMULA (faixa de nível × traços), não lista fixa. Para vender ou contratar uma criatura específica, o mestre cria uma entrada do tipo 'monstro' com o preço calculado por essas tabelas.

### Criaturas

Animais, monstros ou seres naturais capturados, domesticados ou criados em cativeiro. Variam desde feras pequenas até predadores perigosos. Suas habilidades geralmente vêm de sua natureza física ou de seu habitat.

- Nível | Espécie | Classe

- 1 a 10 | +6 L / nível | +4 L / nível

- 11 a 20 | +8 L / nível | +6 L / nível

- 21 a 30 | +15 L / nível | +15 L / nível

- 31 a 40 | +40 L / nível | +40 L / nível

- 41 a 50 | +52 L / nível | +52 L / nível

- 50+ | +62 L / nível | +62 L / nível

Extras: Arma +15 L, Perícia +12 L, Poder Ass +120 L, Legado +18 L, Variável +70 L.

### Familiares

Entidades pequenas e espirituais ou criaturas inteligentes que formam um vínculo mágico com seu dono. Oferecem suporte tático, percepção aprimorada e habilidades úteis fora de combate. São leais e sensíveis.

- Nível | Espécie | Função

- 1 a 10 | +24 L / nível | +20 L / nível

- 11 a 20 | +30 L / nível | +26 L / nível

- 21 a 30 | +42 L / nível | +38 L / nível

- 31 a 40 | +56 L / nível | +52 L / nível

- 41 a 50 | +68 L / nível | +65 L / nível

- 50+ | +84 L / nível | +80 L / nível

Extras: Arma +46 L, Perícia +24 L, Poder Ass +650 L, Legado +52 L, Variável +250 L.

### Servos

Seres criados ou treinados para cumprir tarefas. Geralmente possuem sanidade abalada (começam com 50% de sanidade e 2 traumas aleatórios). Estão ligados à alma do dono e não podem trair diretamente.

- Nível | Raça Comum | Classe Comum

- 1 a 10 | +4 L / nível | +2 L / nível

- 11 a 20 | +8 L / nível | +6 L / nível

- 21 a 30 | +12 L / nível | +10 L / nível

- 31 a 40 | +25 L / nível | +25 L / nível

- 41 a 50 | +35 L / nível | +35 L / nível

- 50+ | +50 L / nível | +50 L / nível

Extras: Arma +12 L, Perícia +8 L, Pet +14 L, Poder Ass +230 L, Legado +16 L, Variável +52 L.

### Invocações

Seres temporários trazidos por magia, rituais ou dispositivos tecnológicos. Surgem para cumprir função, proteção ou utilidade e desaparecem após certo tempo.

- Nível | Raça | Classe

- 1 a 10 | +8 L / nível | +6 L / nível

- 11 a 20 | +12 L / nível | +10 L / nível

- 21 a 30 | +18 L / nível | +14 L / nível

- 31 a 40 | +32 L / nível | +28 L / nível

- 41 a 50 | +48 L / nível | +38 L / nível

- 50+ | +60 L / nível | +46 L / nível

Extras: Arma +24 L, Perícia +14 L, Poder Ass +460 L, Legado +25 L, Variável +65 L.

### Ajudantes

Seres que oferecem seus serviços, conscientes e capazes de tomar decisões. Vistos no dia a dia, auxiliam em missões, carregam itens, curam ou lutam.

- Nível | Raça | Classe

- 1 a 10 | +6 L / nível | +4 L / nível

- 11 a 20 | +8 L / nível | +6 L / nível

- 21 a 30 | +14 L / nível | +12 L / nível

- 31 a 40 | +32 L / nível | +30 L / nível

- 41 a 50 | +50 L / nível | +48 L / nível

- 50+ | +75 L / nível | +70 L / nível

Extras: Arma +16 L, Perícia +12 L, Pet +28 L, Poder Ass +450 L, Legado +20 L, Variável +60 L.

### Seres Lendários

Criaturas raras, únicas ou extremamente poderosas. Exigem rituais complexos ou condições especiais. Servem como aliados excepcionais que mudam batalhas.

- Nível | Raça/Espécie | Classe/Função

- 1 a 10 | - | -

- 11 a 20 | +160 L / nível | +160 L / nível

- 21 a 30 | +240 L / nível | +240 L / nível

- 31 a 40 | +320 L / nível | +320 L / nível

- 41 a 50 | +450 L / nível | +450 L / nível

- 50+ | +650 L / nível | +650 L / nível

Extras: Arma +225 L, Perícia +36 L, Pet +210 L, Poder Ass +1.200 L, Legado +80 L, Variável +650 L.

### Drops de Seres

Preços que mercados pagam por partes de seres. Sem os materiais adequados o preço cai em 75%.

- Raça | Carne | Órgãos | Essência

- Humano | 10 S | 15 S | 25 S

- Vampiro | - | 80 S | 150 S

- Goblin | 5 S | 8 S | -

- Anão | 20 S | 30 S | 40 S

- Golem | - | 60 S | 120 S

- Espírito | - | - | 200 S

- Gigante | 120 S | 180 S | 250 S

- Animália | 20 S | 35 S | 25 S

- Sereia/Tritão | 35 S | 70 S | 90 S

- **Carne:** Fresca (Padrão), Conservada (-20%), Corrompida (-50% ou inutilizável).

- **Qualidade do Abate:** Abate limpo (+20%), Abate brutal (-15%).

- **Ser lendário:** x2 ou x3 no valor.

## economia

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Como funcionam as moedas de O Jardim, o câmbio entre elas e as regras de segurança e espaço do Cofre Bancário.

### Moedas Correntes

- **Lunaris (☾):** A moeda base. Cristalizada a partir da luz pálida, é usada nas transações comuns.

- **Solares (☉):** Moeda de alto valor. Brilhante e quente ao toque.

- **Fragmentos de Estrela (✧):** Moeda rara, utilizada para transações de nível celestial ou itens muito exóticos.

- **Créditos Sombrios (♆):** Moeda do submundo, usada no mercado negro e para fins escusos.

### Taxas de Câmbio

O Banqueiro realiza a conversão das moedas no Discord (valores sujeitos a taxas do sistema).

- Moeda Origem | Moeda Destino | Taxa Padrão

- 100 Lunaris | 1 Solar | 100:1

Essa taxa serve para o dia a dia — trocar Lunaris por Solares (ou o contrário) numa transação comum. Ela não torna categorias inteiras de item comparáveis entre si: um veículo precificado em Lunaris e uma arma lendária precificada em Solares seguem economias próprias, cada uma pensada pro ritmo da sua categoria, não uma equivalência de valor de jogo.

Fragmentos de Estrela e Créditos Sombrios não têm câmbio automático com nenhuma outra moeda. São obtidos por fonte própria — relíquias e artefatos concedidos pelo Mestre, mercado negro, ou outra origem narrativa — nunca só acumulando e convertendo Lunaris ou Solares.

### O Cofre Bancário

O Banco gerido pelo Banqueiro reúne depósito, reputação e segurança.

- **Reputação Bancária:** Ao depositar com frequência e participar da economia, você ganha reputação que destrava novos níveis de cofre.

- **Espaço e Limites:** O cofre possui níveis (tiers) que definem a capacidade máxima de itens e a quantidade de saldo de cada moeda que pode ser guardada. No nível máximo, esse limite se torna ilimitado.

- **Segurança:** O seu cofre pode ser alvo de roubos (eventos do bot). Evoluir a segurança do cofre aumenta a porcentagem de chance de frustrar essas tentativas.

- **Transferências:** Através da página do Cofre, você pode sacar suas economias diretamente para a ficha do seu personagem quando necessário.

## bases

**Categoria:** Guia do Mestre

**Status:** Regra oficial

Aquisição, espaços, instalações, melhorias e manutenção de propriedades imóveis ou móveis.

### Registro da base

- Registre nome, tipo, patamar, localização, responsáveis, espaços ocupados e instalações.

- Uma base imóvel permanece no local registrado. Uma base móvel depende de uma plataforma ou veículo já capaz de transportá-la.

- Estas regras não concedem deslocamento, Vida, Defesa, armas, tripulação nem componentes veiculares.

### Espaços e instalações

- A soma dos espaços ocupados não pode superar os espaços do patamar.

- O nível da instalação não pode superar o limite do patamar.

- Cada instalação ocupa apenas os espaços do nível atual. Uma melhoria substitui o nível anterior.

- Instalações de mesmo id não acumulam. Use apenas o maior nível ativo.

- Uma instalação inativa ocupa espaços, mas não concede efeitos.

- O limite de ocupantes indica quantas criaturas recebem serviços e descanso da base ao mesmo tempo. Excedentes não recebem benefícios de instalações.

- Patamar | Espaços | Ocupantes | Nível máximo | Aquisição | Manutenção

- Posto | 3 | 4 | 1 | 1 | 1
- Sede | 6 | 12 | 2 | 3 | 2
- Complexo | 10 | 30 | 3 | 6 | 4
- Fortaleza | 16 | 60 | 3 | 10 | 7

- Instalação | Nível | Espaços | Aquisição | Manutenção | Efeito

- Dormitório | 1 | 1 | 1 | 1 | Permite descanso de qualidade Boa para até 4 ocupantes.
- Dormitório | 2 | 2 | 2 | 2 | Permite descanso de qualidade Maravilhosa para até 8 ocupantes.
- Dormitório | 3 | 3 | 4 | 3 | Permite descanso de qualidade Excelente para até 12 ocupantes se Área Médica 2 ou superior estiver ativa; sem ela, a qualidade é Maravilhosa.
- Área Médica | 1 | 1 | 1 | 1 | Concede +2 em Cura para tratar um paciente por vez.
- Área Médica | 2 | 2 | 2 | 2 | Concede vantagem em Cura para tratar até 2 pacientes por vez; não aplique o +2 do nível 1.
- Área Médica | 3 | 3 | 4 | 3 | Concede vantagem e +2 em Cura para tratar até 4 pacientes por vez.
- Oficina | 1 | 1 | 1 | 1 | Equivale a um Kit de Ofício fixo e mantém 1 projeto mecânico em andamento.
- Oficina | 2 | 2 | 2 | 2 | Também equivale a uma Oficina A.X.I.S e mantém até 2 projetos mecânicos em andamento.
- Oficina | 3 | 3 | 4 | 3 | Mantém até 3 projetos mecânicos em andamento com Kit de Ofício ou Oficina A.X.I.S.
- Laboratório | 1 | 1 | 1 | 1 | Na especialidade Alquimia, equivale a um Laboratório Alquímico e mantém 1 projeto.
- Laboratório | 2 | 2 | 2 | 2 | Mantém até 2 projetos da especialidade em andamento.
- Laboratório | 3 | 3 | 4 | 3 | Com Área Médica 2 ou superior, também equivale a uma Sala de Implante e mantém até 3 projetos.
- Armazém | 1 | 1 | 1 | 1 | Armazena até 15 itens.
- Armazém | 2 | 2 | 2 | 2 | Armazena até 30 itens.
- Armazém | 3 | 3 | 4 | 3 | Armazena até 60 itens.
- Hangar ou Estábulo | 1 | 1 | 1 | 1 | Abriga 1 veículo pequeno ou até 2 montarias.
- Hangar ou Estábulo | 2 | 2 | 2 | 2 | Abriga 1 veículo médio, 2 pequenos ou até 4 montarias.
- Hangar ou Estábulo | 3 | 3 | 4 | 3 | Abriga 2 veículos médios, 4 pequenos ou até 8 montarias.
- Segurança | 1 | 1 | 1 | 1 | DT 12: Ladinagem para acesso físico, Tecnologia para acesso eletrônico ou Ofício adequado para sabotagem.
- Segurança | 2 | 2 | 2 | 2 | DT 16: Ladinagem para acesso físico, Tecnologia para acesso eletrônico ou Ofício adequado para sabotagem.
- Segurança | 3 | 3 | 4 | 3 | DT 20: Ladinagem para acesso físico, Tecnologia para acesso eletrônico ou Ofício adequado para sabotagem.

### Aquisição e melhoria

- Uma Unidade de Aquisição vale 1.000 Lunaris. Uma Unidade de Manutenção vale 100 Lunaris por mês.

- Para adquirir uma base, some o fator do patamar aos fatores das instalações iniciais.

- Para melhorar patamar ou instalação, pague somente a diferença positiva entre os fatores antigos e novos.

- Remover uma instalação libera seus espaços e não concede reembolso automático.

### Descanso e produção

- Dormitório define o limite de qualidade; duração, interrupções, alimento, água e demais requisitos continuam aplicáveis.

- Cada personagem recebe os benefícios de um único descanso. Dormitórios e efeitos equivalentes não se acumulam.

- Oficina e Laboratório apenas atendem requisitos e limitam projetos simultâneos. Materiais, tempo, testes e falhas seguem as regras do projeto.

### Manutenção

- Calcule a manutenção uma vez por mês com o fator do patamar e das instalações ativas.

- Com um pagamento atrasado, a base fica pendente e não pode iniciar melhorias.

- Com dois pagamentos atrasados, o proprietário escolhe uma instalação para ficar inativa.

- A cada novo atraso, o proprietário escolhe mais uma instalação ativa para ficar inativa.

- Quitar os atrasos reativa as instalações em 24 horas. A inadimplência não transfere nem confisca a propriedade automaticamente.

### Bases móveis

A ficha da plataforma precisa informar quantos espaços de base suporta; sem esse campo, ela não recebe instalações de base. Quando uma peça veicular e uma instalação forem equivalentes, use o efeito publicado da peça e não aplique o efeito-base. Movimento, perseguição, colisão, dano e reparo continuam sob as regras da plataforma.

## mundo-faccoes

**Categoria:** Livro do Jogador

**Status:** Regra oficial

Regras de Prestígio, Fama, acesso e reação para organizações de qualquer Árvore.

Estas regras podem ser usadas com qualquer organização da campanha, independentemente da Árvore. Cada facção registra seu próprio Prestígio; Fama continua sendo uma medida geral de visibilidade.

### Facções documentadas

Banco Lunar e AstraTech pertencem ao cenário atual. As outras três organizações são propostas e ainda não fazem parte do cânone.

- Facção | Tipo | Alcance | Atuação pública | Estado

- Banco Lunar | instituicao financeira | Todas as Árvores | Guarda, administra e investe bens. Também fornece recursos a clientes capazes de pagar. | Canônica

- AstraTech | corporacao tecnologica | Múltiplas Árvores | Desenvolve tecnologia arcana e mantém projetos capazes de operar além de Astraluna. | Canônica

- Caravana do Limiar | rede de transporte | Rotas acessíveis entre Árvores | Transporta pessoas, cargas e mensagens por passagens dimensionais conhecidas. Não atravessa rotas seladas. | Proposta

- Vigília das Raízes | ordem de contencao | Todas as Árvores alcançáveis | Investiga rupturas dimensionais, evacua áreas ameaçadas e contém criaturas que atravessam fronteiras entre Árvores. | Proposta

- Arquivo Prismático | instituicao de pesquisa | Núcleos em diferentes Árvores | Preserva registros, identifica artefatos e reúne informações verificadas sobre fenômenos de diferentes Árvores. | Proposta

### Prestígio

Prestígio registra a relação de um personagem ou grupo com uma facção específica. O valor inicial é 0.

- Nível | Estado | Reação | Acesso | Teste social | Desconto

- -3 | Inimigo | A facção recusa cooperação e pode agir contra o personagem quando tiver motivo e meios. | negado | -2 | 0%

- -2 | Adversário | A facção restringe contato e exige garantias para qualquer acordo. | negado | -1 | 0%

- -1 | Sob desconfiança | A facção mantém distância e verifica pedidos antes de responder. | publico | -1 | 0%

- 0 | Neutro | A facção trata o personagem pelas regras comuns do local. | publico | 0 | 0%

- +1 | Reconhecido | A facção aceita contato e oferece serviços de rotina quando disponíveis. | rotina | +1 | 0%

- +2 | Aliado | A facção permite solicitar recursos restritos compatíveis com a relação. | restrito | +1 | 5%

- +3 | Confiança | A facção permite contato interno e pedidos compatíveis com seus interesses. | interno | +2 | 10%

- Prestígio começa em 0 e é registrado separadamente para cada facção.
- Prestígio mede relação. Ele não mede fama, cargo, riqueza nem reputação bancária.
- O ajuste social só vale em teste no qual a relação com a facção seja relevante.
- Acesso permite solicitar. Não garante estoque, aprovação, informação sigilosa ou ordem obedecida.
- Desconto vale apenas em bem ou serviço fornecido pela própria facção. Descontos de facção não se acumulam entre si.
- Nenhum nível obriga uma criatura a obedecer, acreditar, perdoar ou agir contra os próprios interesses.
- Prestígio negativo não inicia combate automaticamente. A reação depende da situação e dos recursos da facção.

### Alterar Prestígio

- **+1:** Concluir compromisso aceito que produza benefício relevante para a facção. No máximo uma vez pelo mesmo compromisso.
- **+2:** Resolver ameaça ou objetivo central da facção em um marco de campanha. Exige consequência duradoura e não se acumula com serviço relevante pelo mesmo fato.
- **-1:** Romper compromisso aceito ou causar prejuízo relevante à facção. A mesma consequência é registrada uma vez.
- **-2:** Atacar deliberadamente um objetivo central ou usar acesso concedido contra a facção. Não se acumula com quebra de compromisso pelo mesmo fato.

Depois de aplicar a mudança, limite o resultado entre -3 e +3. Um mesmo fato não gera dois ajustes.

### Fama

Fama registra visibilidade pública. Ela usa uma escala única e não substitui a relação com cada facção.

- Nível | Título | Alcance | Anonimato

- 0 | Desconhecido | Sem reconhecimento recorrente. | +2

- 1 | Local | Reconhecido em uma comunidade ou público específico. | +1

- 2 | Regional | Reconhecido em uma região ou setor de atividade. | 0

- 3 | Ampla | Reconhecido em diferentes regiões ligadas por comunicação. | -1

- 4 | Mundial | Reconhecido na maior parte da Dimensão Padrão com acesso a notícias. | -2

- 5 | Histórica | Nome e imagem permanecem registrados além da presença atual. | -2

- Fama mede visibilidade pública de 0 a 5. Ela não indica aprovação.
- Fama só produz reconhecimento onde testemunho, registro ou comunicação possam ter chegado.
- O ajuste de anonimato vale para ocultar identidade ou passar sem reconhecimento. Ele não altera outros testes sociais.
- Reconhecimento não concede acesso, desconto, Prestígio ou controle sobre quem reconheceu o personagem.
- Quando uma habilidade de classe concede Fama mínima, use o maior valor entre a Fama atual e o valor da habilidade. Os demais efeitos permanecem na descrição da classe e não se somam a esta tabela.

### Alterar Fama

- **+1:** Realizar feito relevante diante de testemunhas ou registro verificável. Repetir o mesmo feito para o mesmo público não aumenta Fama.
- **+2:** Um marco de campanha recebe circulação pública em várias regiões. Não se acumula com feito público pelo mesmo acontecimento.
- **-1:** Um acontecimento de campanha remove registros e interrompe a associação pública com a identidade. Passagem de tempo sem exposição não reduz Fama por si só.

Depois de aplicar a mudança, limite o resultado entre 0 e 5.

**Sistemas separados:** Reputação Bancária continua sendo o valor do Banco usado para cofres, cartão e loja. Prestígio e Fama não alteram esse valor.
