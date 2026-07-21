# O Jardim RPG — fundamentos da versão técnica atual

Este documento registra somente as regras que já podem ser usadas pela ficha.
As características das raças comuns estão publicadas; Habilidades e Poderes
específicos de classes continuam em revisão. Entre as raças especiais, o
pacote do Elfo, suas sete Linhagens, o Desperto, a Auleth, o Autômato, o Clone,
o Errante, o Amálgamo e a Bruxa estão definidos. A Entidade permanece
deliberadamente adiada e indisponível para escolha.

## Estado da versão

- Grupo de referência: quatro a cinco jogadores e um mestre.
- Nível total do personagem: 1 a 40.
- Nível máximo em uma classe: 20.
- Limite normal: duas classes comuns e uma classe especial.
- Classe especial: exige nível total 15 e um acontecimento narrativo.
- Atributos naturais: mínimo 1 e máximo 20. O bônus racial do Elfo é uma
  exceção exclusiva de Inteligência e pode elevá-la até 24.
- Mana é o nome atual da antiga Força Vital.
- Fluxo é o sétimo atributo, mas seu uso mecânico ainda está em desenvolvimento.
- Magia, Habilidades e Poderes específicos de classe não fazem parte desta
  versão técnica.
- Características das raças comuns fazem parte desta versão.

## Criação do personagem

1. Distribua `15, 14, 13, 12, 10, 8 e 7` entre Força, Destreza,
   Constituição, Inteligência, Sabedoria, Carisma e Fluxo.
2. Escolha uma raça comum e, quando exigido, sua variante. A raça define
   ajustes iniciais, fisiologia e características.
3. Escolha seis perícias para começar em Aprendiz. Humanos escolhem sete por
   causa de Adaptabilidade.
4. Escolha uma classe comum. Ela define os ganhos de Vida e Mana nos níveis
   posteriores.
5. Receba um item comum e 20 Lunaris.

Rolar `7d20` e distribuir os resultados é uma variante do mestre. A regra
padrão usa os sete valores fixos acima.

## Fórmulas da ficha

```text
Modificador = piso((Atributo - 10) / 2)
Teste = d20 + Mod.Atributo + piso(Nível Total / 2) + bônus do Grau

Vida inicial = máximo 1,
  10 + (2 x Mod.Força) + (2 x Mod.Constituição) + ajuste da raça

Mana inicial = máximo 1,
  6 + (2 x Mod.Inteligência) + Mod.Sabedoria + ajuste da raça

Vida recebida por nível = máximo 1,
  Vida da classe + Mod.Constituição

Mana recebida por nível = máximo 1,
  Mana da classe

Defesa Natural = 10 + piso(Nível Total / 2) + Mod.Destreza + equipamento
Movimento = máximo 4,5 m,
  9 m + (1,5 m x Mod.Destreza) + ajuste da raça ou morfologia
Iniciativa = 10 + piso(Nível Total / 2) + Mod.Destreza + bônus
```

O primeiro nível da primeira classe já está coberto pelas fórmulas iniciais.
Todo nível posterior concede os recursos da classe escolhida naquele avanço,
inclusive o primeiro nível de uma nova classe.

## Raças nesta versão

As doze raças comuns são gerais e podem existir em qualquer Árvore. Cada uma
possui ajustes próprios de Vida e Mana, fisiologia e características. Vida e
Mana raciais são ajustes iniciais e não se repetem ao subir de nível.

| Raça | Vida | Mana | Regra característica |
| --- | ---: | ---: | --- |
| Humano | 0 | 0 | Uma perícia adicional em Aprendiz na criação |
| Vampiro | +1 | 0 | Hemofagia e Fome de Sangue |
| Goblim | -1 | +1 | +1,5 m de Movimento e vantagem ao negociar vendas |
| Anão | +2 | 0 | Vantagem e rerrolagem limitada em Ofício |
| Golem | +5 | -2 | Corpo Construído e equipamento adaptado |
| Espírito | -2 | +3 | Passagem Etérea e restrição de armadura |
| Gigante | +4 | -1 | Resistência a empurrões e capacidade de carga dobrada |
| Animália | variável | variável | Voz da Fauna e uma morfologia obrigatória |
| Sereia / Tritão | -1 | +2 | Anfíbio e Canto Fascinante |
| Miceliano | +1 | +1 | Rede Micelial e Memória do Solo |
| Slime | +3 | -2 | Corpo Maleável e Amortecimento Gelatinoso |
| Feérico | -2 | +4 | Truque Feérico e Glamour |

Animália escolhe uma morfologia:

| Morfologia | Vida | Mana | Regra característica |
| --- | ---: | ---: | --- |
| Ágil | -1 | +1 | +1,5 m e vantagem em Acrobacia para escalar ou equilibrar |
| Robusta | +2 | 0 | Vantagem contra empurrões e quedas |
| Mística | 0 | +2 | Visão noturna e sentidos animais ampliados |

Raças especiais são recompensas ou transformações narrativas deliberadamente
mais fortes que as raças comuns. O mestre decide quem pode começar com uma,
inclusive por uma conquista obtida em outra campanha ou outro RPG, e também
pode conceder uma transformação durante a campanha atual. O sistema nunca
concede esse acesso automaticamente. Até as regras individuais serem fechadas,
elas ficam fora da criação normal. Uma raça especial substitui o pacote da raça
anterior; características de duas raças não se acumulam.

### Elfo — pacote-base aprovado

Elfos possuem origem natural em Nadalon, na Árvore de Gênese. Um personagem
pode começar como Elfo somente com autorização do mestre. Uma transformação
narrativa em Elfo pode ocorrer em qualquer Árvore e substitui a raça anterior.

- Ajuste inicial: `+2 Vida` e `+4 Mana`.
- Intelecto Élfico: `+4 Inteligência`. Somente esse bônus pode ultrapassar o
  limite natural 20, até o máximo 24; os demais atributos não recebem essa
  permissão.
- Memória Milenar: quatro rerrolagens por sessão, utilizáveis apenas em testes
  cujo atributo seja Inteligência. Cada uso obriga a manter o novo resultado.
- Herança Ancestral: ao adquirir a raça, receba um Legado adicional.
- Longevidade: não envelhece e é imune a envelhecimento sobrenatural.
- Linhagem Élfica: escolha Natureza, Sombras, Gelo, Fogo, Fluxo da Origem,
  Noite Eterna ou Tempestades. Todas possuem efeitos definidos abaixo.

Na criação autorizada, o Elfo começa com 40 Lunaris e dois itens comuns, em
vez do pacote inicial comum. Uma transformação durante a campanha não concede
dinheiro nem itens retroativamente.

#### Linhagem da Natureza

**Simbiose Primordial.** Você pode trocar ideias simples com plantas. Elas
percebem luz, água, toque, dano e movimentações próximas, mas não reconhecem
nomes, rostos ou conceitos complexos. Você ignora terreno difícil causado por
vegetação natural e recebe vantagem em Sobrevivência quando o teste envolver
plantas, florestas ou rastros deixados na vegetação.

**Domínio Verdejante.** Uma vez por cena, gaste uma ação e 5 Mana para fazer
vegetação brotar em uma área de 6 m de raio, centrada em um ponto a até 15 m.
O efeito pode nascer sobre terra, pedra ou madeira e dura três rodadas. Escolha
um dos efeitos abaixo; eles não podem ser combinados na mesma ativação:

- **Florescimento:** criaturas escolhidas na área, incluindo você, recuperam
  `2d6 + Mod.Inteligência` de Vida. Cada criatura é curada somente uma vez.
- **Raízes Aprisionadoras:** faça um teste de Misticismo e compare com os
  Reflexos de cada inimigo escolhido na área. Em falha, o Movimento da criatura
  vira 0 até o final do próximo turno dela. A área permanece terreno difícil
  para os inimigos durante toda a duração.

#### Linhagem de Sombras

**Sombra Viva.** Você enxerga normalmente através de escuridão natural ou
sobrenatural. Enquanto estiver em penumbra ou escuridão, recebe vantagem em
Furtividade e pode tentar se esconder sem cobertura física, desde que uma sombra
cubra a maior parte do corpo. Esse ocultamento termina ao entrar em luz intensa,
atacar ou realizar uma ação chamativa.

**Passo Umbral.** Uma vez por cena, gaste seu Movimento e 4 Mana para escolher
uma sombra visível a até 24 m e se teleportar para um espaço desocupado junto
dela. Você pode levar uma criatura voluntária adjacente, desde que exista espaço
para ambos no destino. O teleporte não provoca reações. Até o começo do seu
próximo turno, ataques contra você sofrem desvantagem; seu primeiro ataque
durante esse período recebe vantagem, mas encerra imediatamente essa proteção.
A habilidade não funciona sem uma sombra visível no destino.

#### Linhagem de Gelo

**Coração Invernal.** Você é imune aos efeitos ambientais de frio extremo,
ignora terreno difícil causado por gelo ou neve, reduz pela metade o dano
causado diretamente por frio ou gelo e não escorrega nem cai apenas por estar
sobre uma superfície congelada.

**Sepulcro Glacial.** Uma vez por cena, gaste uma ação e 5 Mana para escolher
uma criatura a até 15 m e fazer Misticismo contra a Fortitude dela. Uma
criatura voluntária pode escolher falhar.

- Em falha, ela fica aprisionada até o final do próximo turno dela: Movimento
  0, sem ações ou reações e Redução 5 contra danos.
- Em sucesso, seu Movimento fica reduzido pela metade e ela não pode realizar
  reações até o final do próximo turno.
- Outra criatura adjacente pode gastar uma ação e superar o resultado original
  de Misticismo com Atletismo para quebrar o gelo antecipadamente.

#### Linhagem de Fogo

**Coração Incandescente.** Você é imune aos efeitos ambientais de calor
extremo e reduz pela metade o dano causado diretamente por fogo ou calor. À
vontade, pode criar, extinguir ou moldar uma chama inofensiva do tamanho da sua
mão em um ponto a até 9 m. Isso não causa dano, não dissipa fogo sobrenatural
e não cria combustível de valor.

**Avatar das Chamas.** Uma vez por cena, gaste uma ação e 5 Mana para assumir
o Avatar durante três rodadas. Ao ativar, faça um único teste de Misticismo e
compare com os Reflexos de cada inimigo escolhido a até 6 m. Em falha, ele
sofre `2d6 + Mod.Inteligência` de dano de fogo; em sucesso, sofre metade.
Durante a manifestação:

- o primeiro ataque que você acertar em cada turno causa `+1d6` de fogo;
- uma vez por turno, uma criatura que acertar você corpo a corpo sofre `1d6`
  de fogo.

#### Linhagem do Fluxo da Origem

**Eco da Primeira Centelha.** Você recebe vantagem em Ressonância ou
Misticismo para identificar a origem, natureza ou funcionamento de um Fluxo ou
efeito sobrenatural. Uma vez por cena, ao gastar Mana em uma característica,
Habilidade ou Poder, reduza esse custo em 2 Mana, até o mínimo de 1.

**Mandato da Origem.** Uma vez por cena, gaste uma ação e 6 Mana em um ponto
ou criatura a até 15 m. Escolha apenas uma opção:

- **Gerar:** crie um objeto comum, não mágico e sem mecanismos complexos, com
  no máximo 3 m em qualquer dimensão. Ele não pode conter material raro,
  substância consumível nem valor monetário e desaparece ao final da cena.
- **Restaurar:** uma criatura recupera `3d6 + Mod.Inteligência` de Vida e
  encerra uma condição prejudicial com duração definida. Isso não remove morte,
  ferimento permanente, transformação, maldição ou consequência narrativa.
- **Desfazer:** faça Misticismo contra a Fortitude de uma criatura. Em falha,
  ela sofre `3d6 + Mod.Inteligência` de dano que ignora Redução e um efeito
  sobrenatural ativo escolhido fica suprimido até o final do próximo turno
  dela. Em sucesso, sofre metade e nenhum efeito é suprimido. Isso não suprime
  raça, classe, transformação permanente ou efeito narrativo.

#### Linhagem da Noite Eterna

**Véu sem Aurora.** Você enxerga normalmente através de qualquer escuridão e
é imune a cegueira ou medo causados exclusivamente pela falta de luz. Enquanto
não estiver sob luz intensa, recebe vantagem em Intimidação e Vontade. Uma vez
por turno, como ação livre, pode extinguir uma fonte de luz não mágica a até
9 m; isso não apaga incêndios ou fontes maiores que uma fogueira.

**Reinado da Noite.** Uma vez por cena, gaste uma ação e 6 Mana para criar
escuridão absoluta em uma área de 9 m de raio, centrada em um ponto a até 15 m,
por três rodadas. Luz comum e chamas não iluminam a área. Você e as criaturas
escolhidas ao ativar enxergam normalmente; as demais enxergam somente a 1,5 m,
sofrem desvantagem em Percepção baseada em visão e não podem realizar reações
contra criaturas que não enxerguem. Faça um único teste de Misticismo e compare
com a Vontade de cada inimigo que entrar ou começar o turno na área. Em falha,
naquele turno ele precisa escolher entre realizar ações ou usar seu Movimento,
não ambos. Efeitos que declarem dissipar escuridão sobrenatural encerram a área
normalmente.

#### Linhagem das Tempestades

**Sangue da Tormenta.** Você ignora penalidades ambientais de chuva, ventos e
tempestades comuns, reduz pela metade o dano causado diretamente por
eletricidade, trovão ou vento e sempre sabe como o clima natural da região deve
se comportar nas próximas 24 horas. Isso não revela interferências sobrenaturais
futuras.

**Olho da Tempestade.** Uma vez por cena, gaste uma ação e 6 Mana para criar
uma tempestade de 6 m de raio ao seu redor durante três rodadas. A área acompanha
você, que recebe deslocamento de voo igual ao Movimento. Se ainda estiver
voando quando o efeito terminar, desça em segurança até 9 m e caia normalmente
pelo restante. Ao ativar e uma vez no início de cada um dos seus dois próximos
turnos:

1. Escolha até `Mod.Inteligência` inimigos na área, com mínimo de um.
2. Faça um único teste de Misticismo contra os Reflexos deles.
3. Em falha, cada alvo sofre `1d6 + Mod.Inteligência` de dano elétrico e é
   empurrado 3 m; em sucesso, sofre metade e não é empurrado.

### Desperto — pacote-base aprovado

Um Desperto morreu, alcançou Arkarin no Limiar e retornou ao mundo dos vivos.
Por isso, esta raça especial pode surgir em qualquer Árvore. Ela exige
autorização do mestre na criação ou uma transformação narrativa durante a
campanha e substitui a raça anterior.

- Ajuste inicial: `+4 Vida` e `+2 Mana`.
- Renegado da Morte: `+4 Vontade` e vantagem contra morte instantânea,
  drenagem de Vida ou Mana, controle da alma e aprisionamento espiritual. Se
  um efeito tentaria capturar, consumir ou controlar a alma sem permitir
  resistência, o Desperto faz Vontade contra a DT do efeito.
- Fragmento de Arkarin: percebe presença e direção aproximada, a até 15 m, de
  Espíritos ou almas aprisionadas, cadáveres alterados sobrenaturalmente e
  efeitos ligados à morte ou ao Fluxo de Arkarin. Não revela identidade,
  quantidade ou distância exata.
- Ecos de Séculos Mortos: uma rerrolagem por sessão para cada século completo
  que permaneceu morto, até cinco. Pode ser usada em qualquer teste, mas o novo
  resultado deve ser mantido. Menos de um século não concede rerrolagem.
- Herança do Retorno: ao adquirir a raça, recebe um Legado adicional.
- Recusar o Fim: uma vez por cena, quando morreria, pode gastar uma reação e
  6 Mana, mesmo inconsciente. Sua Vida torna-se 1, Morrendo é removido, Ferido
  aumenta em 1 e a morte instantânea ou captura da alma que ativou a reação é
  negada. Não funciona sem Mana suficiente nem após a morte ser concluída.
- Condição Ancestral: escolhe somente uma Condição baseada no motivo do
  retorno. Recebe apenas a dádiva e a cicatriz da opção escolhida.

Na criação autorizada, o Desperto começa sem Lunaris e sem itens comuns. Uma
transformação durante a campanha não remove retroativamente os bens que
continuaram com o personagem.

#### Julgado e Rejeitado

O Tribunal de Arkarin recusou sua permanência entre os mortos.

- **Veredito Inacabado:** uma vez por sessão, ao usar Recusar o Fim, não gaste
  Mana nem reação. Isso ainda consome o uso daquela cena.
- **Sentença Aprofundada:** sempre que usar Recusar o Fim, receba `Ferido +2`
  em vez de `Ferido +1`.

#### Juramento Inacabado

Defina com o mestre um juramento objetivo e possível de concluir.

- **Força da Promessa:** uma vez por sessão, transforme uma falha comum em
  sucesso comum quando o teste contribuir diretamente para cumprir ou proteger
  o juramento. Isso não torna possível uma ação impossível.
- **Quebra da Palavra:** se abandonar ou contrariar voluntariamente o
  juramento, sua Mana atual torna-se 0 e não pode ser recuperada acima da
  metade do máximo até realizar uma reparação aceita pelo mestre. Coerção ou
  impossibilidade não quebram o juramento. Ao cumpri-lo, pode estabelecer outro
  depois de um descanso completo.

#### Chamado dos Vivos

Uma pessoa viva chamou sua alma de volta, aceita o vínculo e torna-se sua
Âncora.

- **Laço do Retorno:** enquanto estiverem na mesma Árvore, você sabe a direção
  da Âncora e se ela está saudável, Ferida, Morrendo ou morta. Uma vez por cena,
  quando ela sofrer dano a até 30 m, gaste uma reação e 3 Mana para se
  teleportar até um espaço adjacente. Ela ignora o dano e seus efeitos
  adicionais; você sofre metade desse dano e recebe os efeitos no lugar dela.
- **Dependência da Âncora:** a mais de 1 km da Âncora ou em outra dimensão,
  você sofre desvantagem em Vontade e não pode usar Ecos de Séculos Mortos. Se
  a Âncora morrer, isso permanece até um novo vínculo ser estabelecido por
  acontecimento narrativo aprovado pelo mestre.

#### Corpo Reconstruído

Seu corpo foi remontado, recriado ou remendado para obrigar sua alma a retornar.

- **Carne Refeita:** não precisa respirar, comer, beber ou dormir e é imune a
  doenças e venenos comuns. Um descanso exige apenas permanecer consciente e
  relativamente imóvel pelo tempo normal.
- **Biologia Impossível:** Cura não pode tratar seu corpo. Ofício ou Ritos de
  Arkarin podem substituí-la com a mesma DT e o mesmo tempo. Efeitos dependentes
  exclusivamente de biologia viva não funcionam; curas sobrenaturais que não
  dependam de anatomia continuam funcionando.

#### Alma Fragmentada

Somente parte de sua alma escapou de Arkarin; o restante continua perdido ou
aprisionado.

- **Ausência Momentânea:** uma vez por cena, quando for atingido por um ataque,
  gaste uma reação e 4 Mana para ignorar seu dano e efeitos adicionais. Até o
  começo do próximo turno, fica incorpóreo e pode atravessar até 1,5 m de
  matéria sólida, mas não pode atacar, manipular objetos nem terminar dentro
  de algo.
- **Espírito Incompleto:** não recebe o `+4 em Vontade` de Renegado da Morte,
  mas conserva suas vantagens e resistências.

#### Retorno Profano

Um ritual, entidade ou força proibida arrancou sua alma de Arkarin.

- **Fôlego Roubado:** uma vez por cena, gaste uma ação e 4 Mana para escolher
  um ser vivo a até 9 m e fazer Ritos de Arkarin contra a Fortitude dele. Se
  superar a defesa, cause `2d6 + Mod.Sabedoria` de dano e recupere Vida igual
  ao dano realmente causado. Caso contrário, cause e recupere metade. Não
  afeta Espíritos, cadáveres, construtos ou criaturas sem essência vital.
- **Fome do Túmulo:** qualquer recuperação de Vida que não venha de Fôlego
  Roubado é reduzida pela metade, com mínimo de 1.

### Auleth — pacote aprovado

Uma Auleth é uma consciência espacial ou dimensional que assume forma física.
O material recuperado não a vinculava a uma Árvore específica; nesta versão,
ela é uma raça especial geral e pode surgir em qualquer Árvore mediante
autorização do mestre ou transformação narrativa.

- Ajuste inicial: `+2 Vida` e `+0 Mana`.
- Ajustes de atributo: `+2 Inteligência`, `+2 Sabedoria` e `−3 Carisma`.
  Inteligência e Sabedoria continuam limitadas ao máximo natural 20; Carisma
  nunca pode ser reduzido abaixo de 1.
- Herança Espacial: ao adquirir a raça, recebe um Legado adicional.
- Na criação autorizada, escolhe doze perícias em Aprendiz no total, em vez de
  seis. Esse benefício de treinamento não é retroativo em uma transformação.
- Conhecimentos Extremos: escolha duas áreas de estudo aprovadas pelo mestre.
  Cada área precisa ser mais estreita que uma Árvore ou Fluxo inteiro e mais
  ampla que um único indivíduo. Em testes de Conhecimento, Investigação,
  Misticismo, Ressonância, Tecnologia ou Ritos de Arkarin diretamente ligados
  à área, recebe vantagem. Uma vez por sessão para cada área, depois de falhar,
  pode rerrolar e deve manter o novo resultado. Isso não revela segredos sem
  pistas nem informações sem uma fonte possível.
- Existência Espacial: não precisa comer, beber ou dormir e é imune a doenças
  comuns ou sobrenaturais. Para descansar, medita pelo tempo normal; pode
  perceber os arredores, mas qualquer atividade além de observação simples
  interrompe a recuperação. Isso não concede imunidade a venenos.
- Emoção Distante: além de `−3 Carisma`, sofre desvantagem em Intuição para
  interpretar emoções e em Diplomacia para consolar, inspirar ou criar vínculo
  emocional. Isso não afeta negociações objetivas, análise lógica, Enganação ou
  Intimidação.

**Forma sem Molde.** À vontade, gaste sua ação e todo o Movimento do turno para
alterar anatomia, aparência, voz e tamanho entre Minúsculo, Pequeno, Normal,
Grande ou Enorme. A mudança não altera números da ficha nem concede sentidos,
ataques, imunidades ou características copiadas. A massa permanece constante;
equipamentos incompatíveis não se transformam e caem intactos aos seus pés.
Imitar perfeitamente uma criatura específica exige Enganação contra a Intuição
de quem a conheça. A forma permanece até ser alterada novamente.

Na criação autorizada, a Auleth começa sem Lunaris e sem itens materiais. Uma
transformação posterior não remove bens sobreviventes. O efeito atual de
Conhecimentos Extremos é uma reconstrução desta versão: o registro antigo
informava apenas que a Auleth recebia duas escolhas, sem explicar sua mecânica.

### Autômato — pacote aprovado

O Autômato jogável é um construto consciente com Núcleo Autônomo e uma raça
especial exclusiva da A.X.I.S. Exige autorização do mestre na criação ou uma
transformação narrativa compatível. Seu Nível Total também é o nível do núcleo,
e ele recebe classes normalmente desde o nível 1.

- Ajuste-base: `+0 Vida` e `+0 Mana`; o chassi fornece o ajuste racial de Vida.
- Para o Autômato, Mana representa a **Energia do Núcleo**, mas usa a mesma
  fórmula, barra e formas de recuperação.
- Constituição representa Integridade Estrutural e continua participando da
  Vida, Fortitude e demais regras normalmente.
- Não precisa respirar, comer, beber ou dormir. Para descansar, permanece
  inativo ou em recarga pelo tempo normal.
- É imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos.
- Descanso e curas comuns ou mágicas não recuperam sua Vida. Uma hora de trabalho
  e Ofício (Engenharia) contra `DT 15 + piso(Nível Total / 2)` recuperam 5 Vida.
  Cada nova tentativa exige outra hora.
- Ao chegar a 0 Vida ou menos, usa Morrendo normalmente. O núcleo somente é
  destruído quando a morte é concluída.
- Máquina Viva permite recuperação normal de Vida, mas remove as imunidades e o
  Reparo Mecânico enquanto estiver instalada.

#### Chassis

Força e Destreza abaixo são ajustes raciais aplicados depois da distribuição e
respeitam o limite natural 20. O Movimento é fixo e não soma Mod.Destreza. O
dado de dano é o dano-base da arma natural.

| Chassi | Medida | Vida | Mana | Força | Destreza | Movimento | Dano natural |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Bípede Pequeno | 3 m | +3 | 0 | −2 | +2 | 6 m | 1d6 |
| Bípede Normal | 4,5 m | +5 | 0 | +2 | +1 | 9 m | 1d8 |
| Bípede Grande | 6 m | +8 | 0 | +4 | 0 | 12 m | 2d6 |
| Bípede Enorme | 9 m | +10 | 0 | +5 | −2 | 12 m | 3d6 |
| Quadrúpede Pequeno | 0,7 m | +3 | 0 | −3 | +4 | 9 m | 1d4 |
| Quadrúpede Normal | 1,5 m | +5 | 0 | 0 | +3 | 12 m | 1d6 |
| Quadrúpede Grande | 3 m | +8 | 0 | +3 | +2 | 15 m | 1d8 |
| Quadrúpede Enorme | 4,5 m | +10 | 0 | +5 | 0 | 15 m | 2d6 |

Chassis bípedes possuem manipuladores capazes de usar ferramentas e equipamentos
compatíveis. Chassis quadrúpedes não empunham armas ou ferramentas convencionais.

#### Modificações

O limite de modificações instaladas é:

```text
1 + piso(Nível Total / 2)
```

Uma modificação ativa exige pelo menos três passivas instaladas. Assim, sem um
efeito que aumente a capacidade, a primeira ativa pode ser instalada no nível 6.
Cada modificação só pode ser instalada uma vez. Instalar uma exige um dia de
trabalho de alguém capaz de realizar Ofício (Engenharia); peças, Lunaris e acesso
à tecnologia são definidos pelo mestre.

| Passiva | Pré-requisito | Efeito |
| --- | --- | --- |
| Propulsores | Nível 9 | Deslocamento de voo 12 m |
| Blindagem | — | +2/+3/+4/+6 Defesa para tamanho Pequeno/Normal/Grande/Enorme |
| Combatente | Bípede | Sabe usar armas simples e marciais |
| Compartimento de Carga | — | Capacidade para +15 itens; retirar exige ação de movimento |
| Corpo Maciço | — | Resistência 10 contra danos físicos comuns |
| Escudo | Nível 12 | +4 Defesa e metade do dano balístico recebido |
| Esmagador | — | Aumenta o dano natural em uma categoria |
| Resistente | Nível 10 | +2 Vida máxima por Nível Total |
| Máquina Viva | — | Recuperação normal de Vida, mas perde imunidades e Reparo Mecânico |
| Rodas | — | +9 m de Movimento terrestre |

A progressão de Esmagador é `1d4 → 1d6 → 1d8 → 2d6 → 3d6 → 4d6`.

| Ativa | Pré-requisito | Ativação e efeito |
| --- | --- | --- |
| Laser | Nível 15 | Ação completa, 8 Energia; Tecnologia contra Reflexos numa linha de 30 m, 8d10+8 de raio em falha e nenhum dano em sucesso; recarga 1d4+1 rodadas |
| Detecção | — | Ação, 2 Energia; até o fim da cena percebe direção aproximada de movimentos a 20 m, sem identidade, quantidade ou distância exata |
| Eletrificar | Nível 5 | Reação, 5 Energia, uma vez por rodada após sofrer ataque corpo a corpo; Tecnologia contra Reflexos das demais criaturas a 5 m, 3d8+4 de raio ou metade |
| Garra Extensora | — | Ação, 2 Energia, 12 m; Pontaria contra Reflexos agarra uma criatura; recarregar exige ação completa |
| Modo Veículo | — | Ação de movimento, 2 Energia; assume ou abandona forma de veículo sem alterar números da ficha |
| Pulso Estridente | Nível 4 | Uma vez por cena, ação, 6 Energia; Tecnologia contra Fortitude das demais criaturas a 6 m; falha causa atordoamento por 1d4+1 rodadas |
| Punho Voador | Bípede | Ação, 2 Energia; ataque de Pontaria a 12 m usando o dano natural |
| Raio Inferno | Nível 4 | Ação, 4 Energia; Pontaria contra Reflexos a 20 m, 4d6+4 de fogo ou metade |

No Modo Veículo, o Autômato transporta uma criatura do próprio tamanho, duas
de uma categoria menor, quatro de duas categorias menores e assim por diante.
Mudar de forma expulsa passageiros.

### Clone — pacote aprovado

O Clone é uma reprodução artificial de um Original. Pode saber que é uma cópia,
acreditar ser o Original ou ter desenvolvido identidade própria. Sua origem
natural pode estar em Gênese, pela Origem; Alétheia, pela Essência; A.X.I.S,
pela tecnologia; Anima, por cultivo vital; ou Limiar, pelo sangue. Uma
transformação narrativa compatível pode acontecer em qualquer Árvore.

- Ajuste-base: `+3 Vida` e `+3 Mana`.
- **Matriz Aperfeiçoada:** escolha dois atributos diferentes; cada um recebe
  `+2`, respeitando o limite natural 20.
- Recebe um Legado adicional.
- É biologicamente vivo e mantém necessidades biológicas normais.
- A aparência de outra raça não concede nenhuma característica daquela raça.
- Escolhe somente um Projeto de Clonagem.

**Cópia Biométrica.** Aparência, voz, digitais, retina e outras marcas físicas
reproduzem o Original. O Clone recebe vantagem em Enganação quando essas forem
as evidências principais, mas alguém que conheça intimamente o Original pode
usar Intuição para perceber diferenças comportamentais. Raça, classe,
Habilidades, Poderes, Legados, alma, pactos, bênçãos e Fragmentos de Arkarin não
são copiados.

**Memórias Residuais.** Uma vez por sessão, se o Original conhecia determinada
informação no momento da clonagem, o mestre pode fornecer uma memória curta,
verdadeira e incompleta. Ela não entrega senhas completas, segredos sem contexto
ou conhecimentos adquiridos posteriormente.

**Regeneração Programada.** Uma vez por cena, depois de sofrer dano e ficar com
metade da Vida máxima ou menos, o Clone pode gastar uma reação e 4 Mana para
recuperar `2d6 + Mod.Constituição` de Vida, com mínimo de `2d6`.

#### Projetos de Clonagem

| Projeto | Efeito |
| --- | --- |
| Réplica Perfeita | Três rerrolagens por sessão em Enganação, Intuição ou conhecimentos diretamente relacionados ao Original; Memórias Residuais pode ser usada duas vezes por sessão |
| Arquivo Vivo | Escolha duas perícias; cada uma sobe um Grau de Treinamento, limitado pelo Nível Total; duas rerrolagens por sessão somente nessas perícias |
| Organismo Otimizado | +1 Vida máxima por Nível Total, vantagem em Fortitude contra doenças, fadiga e venenos; Regeneração Programada passa a curar `3d6 + Mod.Constituição` |
| Série Contínua | Mantém um corpo reserva em uma instalação; após a morte concluída, desperta nele em 24 horas com as memórias da última sincronização, sem transportar equipamentos |

O corpo da Série Contínua precisa existir e permanecer intacto. O personagem
mantém atributos, classes e progressão, mas perde as lembranças posteriores à
última sincronização. A instalação, o preparo do corpo e a sincronização são
elementos concretos da campanha, sujeitos ao mestre.

### Errante — pacote aprovado

O Errante é um personagem trazido de outra Árvore, campanha, cenário ou sistema
de RPG. Ele conserva sua identidade e sua história, mas sua ficha é reconstruída
com as regras e o Nível Total da campanha atual. Números, ações, poderes,
equipamentos e recursos de outro sistema nunca são importados diretamente.

- Ajuste-base: `+3 Vida` e `+3 Mana`.
- Escolha um **Atributo Marcante** para receber `+4`, respeitando o limite 20.
- Receba um Legado adicional.
- Registre o mundo ou RPG, a campanha e uma Árvore de origem equivalente.
- Escolha três perícias para **Memórias de Outra Campanha**; elas compartilham
  três rerrolagens por sessão, sempre mantendo o novo resultado.
- **Sobrevivente de Outra História:** uma vez por sessão, quando dano deixaria o
  Errante com 0 Vida ou menos, sua Vida torna-se 1. Isso não impede morte
  instantânea, destruição da alma ou consequências que não sejam dano.

#### Conversão

| Elemento anterior | Aplicação no Jardim |
| --- | --- |
| Nome, aparência e personalidade | Preservados |
| Lembranças, relações, cicatrizes e objetivos | Preservados quando fizerem sentido na campanha |
| Nível e experiência | Ajustados ao Nível Total atual |
| Atributos | Redistribuídos pelas regras atuais |
| Raça anterior | Aparência preservada; apenas as características do Errante funcionam |
| Classe anterior | Representada pelas classes atuais |
| Poder marcante | Convertido em uma Assinatura Remanescente |
| Item importante | Pode ser representado pelo Legado adicional |
| Dinheiro e equipamentos | Ajustados pelo mestre ao patamar atual |

#### Assinatura Remanescente

Escolha somente um formato para uma Habilidade, magia, técnica ou poder marcante
do personagem anterior. Nome e aparência são livres, mas não acrescentam efeitos.

| Formato | Regra convertida |
| --- | --- |
| Ofensiva | Uma vez por cena, ação e 5 Mana; teste apropriado contra resistência, `3d6 + Mod.Atributo` de dano ou metade |
| Defensiva | Uma vez por cena, reação e 4 Mana; reduz o dano em `2d6 + Mod.Atributo`, até 0 |
| Restauradora | Uma vez por cena, ação e 5 Mana; toque recupera `2d6 + Mod.Atributo` de Vida |
| Movimento | Uma vez por cena, Movimento e 4 Mana; deslocamento especial ou teleporte visível de até 12 m, sem provocar reações |
| Controle | Uma vez por cena, ação e 5 Mana; teste contra resistência aplica uma condição leve aprovada até o fim do próximo turno |
| Transformação | Uma vez por sessão, ação e 6 Mana; por três rodadas recebe +2 Defesa e vantagem em duas perícias aprovadas |

#### Dupla Proveniência

O Errante pode cumprir os requisitos da classe exclusiva de sua **Árvore atual**
ou de sua **Árvore de origem equivalente**. Esse acesso não concede uma classe
automaticamente. O limite normal de uma classe especial continua valendo, então
o personagem escolhe no máximo uma das duas. Mudar a Árvore atual substitui o
vínculo anterior e não acumula acesso às Árvores visitadas.

### Amálgamo — pacote aprovado

O Amálgamo nasceu da união forçada ou acidental de diferentes criaturas,
corpos, almas ou essências. Suas origens naturais compatíveis são Gênese,
Anima, Vórtice, Abismo e Limiar; uma transformação narrativa pode acontecer em
qualquer Árvore após um acontecimento capaz de fundir diferentes existências.

- Ajuste-base: `+5 Vida` e `+1 Mana`.
- Recebe `+2 Constituição` e `+2 Fluxo`, respeitando o limite 20.
- É um ser vivo e pode ser tratado normalmente com Medicina.
- **Anatomia Plural:** uma vez por cena, depois de falhar em Fortitude contra
  doença, veneno, fadiga ou alteração corporal, rerrole e mantenha o resultado.
- **Alma Coral:** uma vez por sessão, depois de falhar em Vontade, rerrole e
  mantenha o resultado. Isso não entrega memórias completas dos constituintes.
- **Reconfiguração Visceral:** uma vez por cena, depois de sofrer dano, gaste
  uma reação e 4 Mana para receber Resistência 5 contra aquele tipo até o
  começo do próximo turno, incluindo o dano que ativou a reação.

#### Fragmentos Constituintes

O Amálgamo começa conhecendo três Fragmentos e mantém dois expressos. Ao
terminar um descanso, pode trocar os expressos entre aqueles que conhece.
Somente os expressos concedem benefícios.

| Fragmento | Efeito |
| --- | --- |
| Carapaça | +3 Defesa |
| Predador | Arma natural `1d8` e vantagem em Sobrevivência para rastrear criaturas feridas |
| Regenerador | Uma vez por cena, ação e 5 Mana; recupera `3d6 + Mod.Constituição` de Vida |
| Alado | Voo igual ao Movimento; não funciona usando equipamento pesado |
| Abissal | Respira debaixo d'água, enxerga no escuro e nada com deslocamento igual ao Movimento |
| Membros Múltiplos | Vantagem para agarrar ou escapar e uma interação adicional com objeto por turno; não concede ataques, ações ou reações |
| Órgão de Fluxo | +4 Mana máxima e, uma vez por cena, reduz um custo em 2 Mana, mínimo 1 |
| Massa Colossal | +4 Fortitude, capacidade de carga dobrada e vantagem contra empurrões e quedas provocadas por criaturas |

Se Órgão de Fluxo deixar de ser expresso, toda Mana atual que ultrapassar o
novo máximo é perdida.

**Assimilação Controlada.** Um acontecimento narrativo autorizado pelo mestre
pode desbloquear outro Fragmento da lista, até o máximo de seis conhecidos.
Derrotar, tocar ou consumir uma criatura não concede automaticamente suas
características, e pacotes raciais completos nunca são copiados.

**Surto de Convergência.** Uma vez por sessão, gaste uma ação e 6 Mana para
expressar um terceiro Fragmento conhecido durante três rodadas. Quando o efeito
terminar, o terceiro Fragmento deixa de funcionar, benefícios temporários e
excesso de Mana são removidos e o Amálgamo recebe 1 ponto de Cansaço.

### Bruxa — pacote aprovado

A Bruxa é alguém permanentemente transformado por pacto, ritual ou contato
prolongado com uma força sobrenatural. Bruxa descreve uma natureza mágica
adquirida, não uma profissão nem uma identidade de gênero. Suas origens naturais
compatíveis são Alétheia, Anima, Vórtice, Éon, Abismo e Limiar; uma transformação
narrativa pode ocorrer em qualquer Árvore.

- Ajuste-base: `+1 Vida` e `+5 Mana`.
- Recebe `+2 Inteligência` e `+2 Fluxo`, respeitando o limite 20.
- Recebe `+4 Misticismo` e um Legado adicional.
- **Olhar Bruxo:** percebe presença e direção aproximada de maldições, pactos,
  possessões e rituais ativos a até 15 m, sem identificá-los automaticamente;
  também recebe vantagem para resistir a maldições, possessões e controle da alma.
- **Preço da Bruxaria:** uma vez por cena, ao pagar uma característica racial,
  pode substituir até 3 pontos de Mana ausentes por 2 Vida cada. O custo ignora
  Resistência, não pode ser reduzido nem deixar a Bruxa abaixo de 1 Vida e não
  paga custos de classes, itens ou Legados.

#### Maldição Tecida

A Bruxa conhece três Maldições. Uma vez por cena, gasta uma ação e 5 Mana para
amaldiçoar uma criatura a até 15 m, usando Misticismo contra Vontade. Se a
criatura falhar, o efeito dura três rodadas; se resistir, dura até o final do
próximo turno dela. Uma nova Maldição da mesma Bruxa substitui a anterior no alvo.

| Maldição | Efeito |
| --- | --- |
| Infortúnio | Desvantagem no primeiro teste realizado em cada turno |
| Enfraquecimento | Causa 2 pontos a menos de dano em cada ataque, mínimo 0 |
| Passos Presos | Movimento pela metade e não pode realizar reações de movimento |
| Língua Selada | Não pode usar características que exijam fala, canto ou palavras de ativação |
| Definhamento | Recuperações de Vida pela metade e sofre `1d6` de dano no começo do turno |
| Pele Exposta | Perde Resistência contra um tipo de dano escolhido e sofre +2 desse dano quando atingida |

#### Instrumentos de Bruxaria

| Instrumento | Efeito |
| --- | --- |
| Familiar | Criatura Minúscula não combatente; compartilha sentidos e origina características de toque a até 18 m; desaparece ao sofrer dano e retorna no descanso |
| Grimório | Conhece cinco Maldições e rerrola um teste de Misticismo por cena, mantendo o novo resultado |
| Caldeirão | A cada descanso prepara duas doses de `2d6 + Mod.Inteligência` de Vida ou `2d4` de Mana; expiram no descanso seguinte |
| Vassoura | Uma vez por cena, ação e 3 Mana; voo igual ao Movimento até o final da cena |

**Grande Sabá.** Uma vez por sessão, gaste uma ação e 8 Mana para aplicar uma
Maldição conhecida a até `Mod.Fluxo` criaturas a 15 m, mínimo de uma. Faça um
único teste de Misticismo e compare com a Vontade de cada alvo; determine a
duração separadamente para cada criatura conforme Maldição Tecida.

### Entidade — conteúdo adiado

A raça Entidade não pode ser escolhida nesta versão. Seu conceito exige um
pacote próprio mais complexo e será desenvolvido separadamente no futuro. Até
essa definição, ela não fornece Vida, Mana, características ou opções de criação.

## Classes nesta versão

Classes mantêm apenas `vida` e `mana` no catálogo. Todas usam um orçamento de
7 pontos por nível, distribuído entre três chassis:

| Perfil | Vida | Mana |
| --- | ---: | ---: |
| Resistente | 5 | 2 |
| Híbrido | 4 | 3 |
| Canalizador | 3 | 4 |

A Vida ainda recebe o Mod.Constituição. A categoria comum ou especial não
aumenta o orçamento de recursos; a identidade completa virá das Habilidades e
dos Poderes quando esse conteúdo retornar ao sistema.

`categoria` e `disponibilidade` são regras diferentes:

- classe comum pode ser escolhida na criação;
- classe especial exige nível total 15 e um acontecimento narrativo;
- classe geral pode ser obtida por personagens de qualquer Árvore;
- classe exclusiva só pode ser obtida por personagens da Árvore indicada.

As treze classes comuns e o Viajante são gerais. As exclusivas atuais são:

| Árvore | Classe exclusiva | Vida | Mana |
| --- | --- | ---: | ---: |
| Gênese | Invocador | 3 | 4 |
| Alétheia | Decodificador | 3 | 4 |
| A.X.I.S | Codificador | 3 | 4 |
| Anima | Caçador de Entidades | 4 | 3 |
| Vórtice | Elementarista | 3 | 4 |
| Baluarte | Campeão Dimensional | 5 | 2 |
| Matriz | Guia Dimensional | 3 | 4 |
| Éon | Cartista Arcano | 3 | 4 |
| Abismo | Pirata Amaldiçoado | 4 | 3 |
| Limiar | Escritor de Contos | 3 | 4 |

`Codificador` e `Decodificador` são nomes provisórios; a associação e os
recursos das duas classes já estão definidos.

### Tabela universal de todas as classes — níveis 1 a 20

Esta tabela representa todas as classes. “Habilidade de Classe” reserva um
espaço de progressão; seu efeito específico só entra em jogo quando for
publicado novamente a partir do livro.

| Nível da classe | Recebe |
| ---: | --- |
| 1 | 1 Habilidade de Classe e 1 Grau de Treinamento |
| 2 | 1 Habilidade de Classe |
| 3 | 1 Grau de Treinamento |
| 4 | 1 Habilidade de Classe |
| 5 | 1 Habilidade de Classe |
| 6 | 1 Habilidade de Classe |
| 7 | 1 Grau de Treinamento |
| 8 | 1 Habilidade de Classe |
| 9 | 1 Habilidade de Classe |
| 10 | 1 Habilidade de Classe |
| 11 | 1 Habilidade de Classe |
| 12 | 1 Habilidade de Classe |
| 13 | 1 Grau de Treinamento |
| 14 | 1 Habilidade de Classe |
| 15 | 1 Habilidade de Classe |
| 16 | 1 Habilidade de Classe |
| 17 | 1 Habilidade de Classe |
| 18 | 1 Habilidade de Classe |
| 19 | 1 Grau de Treinamento |
| 20 | 1 Habilidade de Classe |

O nível 1 de cada classe é recebido apenas uma vez naquela classe. Entrar em
uma nova classe não repete item, dinheiro ou outros benefícios de criação.

## Nível total e multiclasse

- Nível total é a soma dos níveis de todas as classes.
- Em cada avanço, escolha uma classe e aumente o nível dela em 1.
- Bônus global, XP e limites de treinamento usam o nível total.
- Níveis 4, 8, 12, 16, 20, 24, 28, 32, 36 e 40 concedem +1 em um atributo,
  respeitando o limite natural 20.
- Níveis 5, 10, 15, 20, 25, 30, 35 e 40 concedem um Legado de Ascensão.
- Uma classe pode chegar ao nível 20 sem multiclasse.
- Para ultrapassar o nível total 20, o personagem precisa investir em outra
  classe.
- Uma classe especial consome níveis normalmente e não conta no limite de duas
  classes comuns.

## Graus e treinamento

| Grau | Bônus | Nível total mínimo |
| --- | ---: | ---: |
| Iniciante | +0 | 1 |
| Aprendiz | +2 | 1 |
| Treinado | +4 | 3 |
| Especialista | +6 | 7 |
| Mestre | +8 | 13 |
| Veterano | +10 | 19 |
| Renomado | +12 | 29 |

Um Grau de Treinamento aumenta uma perícia em um grau. O personagem precisa
respeitar o nível mínimo e cumprir o tempo de treinamento. Se ainda não cumprir
o requisito, pode guardar o Grau de Treinamento.

| Avanço | Tempo | Requisito adicional |
| --- | ---: | --- |
| Iniciante para Aprendiz | 3 dias | Nível 1 |
| Aprendiz para Treinado | 7 dias | Nível 3 |
| Treinado para Especialista | 14 dias | Nível 7 |
| Especialista para Mestre | 21 dias | Nível 13 e instrutor |
| Mestre para Veterano | 32 dias | Nível 19 e feito notável |
| Veterano para Renomado | 62 dias | Nível 29, feito e item especial |

Cada dia de treino exige seis horas e gera 1 Cansaço. Um instrutor de grau
superior reduz o tempo em 20%, arredondado para cima.

## Testes e Dificuldade do Teste

```text
Teste = d20 + Mod.Atributo + piso(Nível Total / 2) + bônus do Grau
DT padrão = 15 + piso(Nível do desafio / 2)
```

| Dificuldade | DT |
| --- | --- |
| Rotineira | 10 + piso(Nível / 2) |
| Padrão | 15 + piso(Nível / 2) |
| Difícil | 20 + piso(Nível / 2) |
| Extrema | 25 + piso(Nível / 2) |

- Sucesso crítico: resultado igual ou superior à DT + 10.
- Sucesso: resultado igual ou superior à DT.
- Falha: resultado abaixo da DT.
- Falha crítica: resultado igual ou inferior à DT - 10.
- Um 20 natural melhora o resultado em um grau.
- Um 1 natural piora o resultado em um grau.

Com vantagem, role dois d20 e use o maior. Com desvantagem, use o menor. Fontes
opostas se anulam uma a uma; o saldo não acrescenta dados além dos dois d20.

Fortitude, Reflexos e Vontade são perícias. Quando usadas como Defesa passiva,
o valor é `10 + bônus total da perícia`.

## Vida negativa e Morrendo

- Ao chegar a 0 Vida ou menos, o personagem fica inconsciente e recebe
  Morrendo 1.
- Continue registrando o dano abaixo de 0 como Déficit de Vida.
- Cura reduz primeiro o Déficit; o personagem desperta ao voltar a 1 Vida.
- Se o Déficit alcançar a Vida máxima, ocorre morte imediata.
- Gravidade: até 10% = 0; acima de 10% até 25% = 1; acima de 25% até 50% = 2;
  acima de 50% até 75% = 3; acima de 75% = 4.
- A DT para estabilizar ou resistir é `12 + (2 x Gravidade) + Ferido`.
- No fim do turno, sucesso mantém Morrendo, sucesso crítico reduz em 1, falha
  aumenta em 1 e falha crítica aumenta em 2.
- Morrendo 3 causa morte. Maestria de Constituição aumenta o limite para 4.
- Ao despertar, aumente Ferido em 1.

## Conteúdo ainda não publicado nesta versão

- Habilidades e Poderes específicos de raças e classes.
- Ajustes raciais que não sejam Vida ou Mana, exceto os pacotes especiais já
  publicados do Elfo, do Desperto e da Auleth.
- Sistema de magia e uso mecânico do atributo Fluxo.
- Maestria de Fluxo.
- Nomes definitivos de Codificador e Decodificador.
- Arsenal e Bestiário necessários para fechar dano e duração de combate.

Essas lacunas não recebem efeitos improvisados. Até serem revisadas, a ficha
usa somente os recursos e a progressão universal declarados neste documento.
