# Revisão das classes (outubro de 2026)

Revisão das classes no molde das revisões das magias e das raças: ler tudo procurando o que está errado, incoerente, sem sentido ou que pode melhorar, medir o equilíbrio com a referência do próprio jogo e ver se cada classe é legal de jogar. A leitura foi feita classe por classe, apoiada em varreduras por script:
- os dados de cada habilidade e poder contra o acerto de NPC do nível;
- o rendimento por Mana e por Estamina comparado ao das magias;
- os termos que as regras não conhecem (perícia, tipo de dano, condição);
- os bônus que o texto promete e a ficha não soma.

- **Revisado:** as 29 classes de `data/ficha/classes.json` (17 comuns e 12 especiais), com 122 habilidades, 380 opções de catálogo e 297 poderes, mais as 29 páginas de `src/redesign/classe/`. As 7 classes mágicas já tinham passado pela revisão das magias; aqui elas foram lidas de novo só no que é de classe.
- **Achados:** 158 no total, sendo **21 erros**, **56 incoerências** e **81 melhorias**. **18 já foram corrigidos** nesta rodada (lista abaixo).
- **Relatórios completos:** [`classes/`](classes/), um por classe. Cada achado traz o id, o campo, o problema e uma sugestão concreta.
- **Base:** `data/ficha/classes.json` no commit `569bc95`, que estava sem alteração no worktree.

## Aplicado em 2026-10-27 (sem commit)

Só o que não pedia decisão. Os ids ficaram iguais, então nenhuma ficha perde escolha.

- **Perícia:** a especialidade Biomédica do Engenheiro dizia "continua exigindo Medicina"; agora diz Cura.
- **Tipos de dano:**
  - o Frasco Congelante do Alquimista causava "dano de frio"; agora causa gelo (frio é dano de ambiente);
  - o Soro Adaptativo dava Resistência a "fogo" no calor extremo; agora dá a calor;
  - o Couro Grosso do Guerreiro passou a resistir a fogo, a gelo e a frio, cobrindo o golpe e o ambiente;
  - a Artilharia do Engenho Divino causava "dano de Energia", que não existe; agora causa raio, como o WALL-E e a Torreta.
- **Condições com o nome oficial:** "imunidade a medo" virou Amedrontado (Senhor da Guerra, Estrela Eterna), "imunidade a paralisia" virou Paralisado (Número 1) e "testes contra medo" virou Amedrontado (Brigadeiro).
- **Textos que não fechavam:**
  - a Pop Star chamava a própria DT de "DT de Pop Star" em dois poderes, e a classe chama de DT de Palco;
  - a Estrela Eterna esquecia de dizer que a Estamina temporária também some;
  - a Na Mira do Atirador não dizia quem não acertou quem ("contra uma criatura que você ainda não acertou");
  - o Cuscuz Nordestino do Chef dava bônus na "próxima iniciativa que rolar", e a Iniciativa não se rola; agora é +2 de Iniciativa no próximo combate, e o nível 5 tira o Surpreendido;
  - a Especialização do Caçador ainda falava em "categoria" quatro vezes, sobra da lista antiga; agora fala em raça;
  - o Não Levanta do Lutador e a Arte da Espada do Espadachim usavam "derrubar" (a manobra que deixa Caído) no sentido de levar a 0 de Vida.
- **Bônus que a ficha não somava:** seis opções prometiam bônus permanente sem o campo de efeito que a ficha lê, como a Pele de Tubarão do Pirata já tem:
  - Pele Curtida (+2 de Defesa) e Reflexos de Predador (+2 de Iniciativa), do Devorador;
  - Hohō (+3 m de Movimento), do Caçador das Almas;
  - as três opções do Além do Comum (+1 no atributo), do Campeão Dimensional.
  Conferi pelo próprio cálculo da ficha (`resumirEquipamentos`).
- **Trava nova:** `tests/frontend/revisaoClasses.test.ts` cobra os seis bônus na ficha e proíbe a volta do vocabulário corrigido.
- **Testes:**
  - 136 testes das classes, do tom e dos efeitos passam;
  - `check:balance` e `check:server-content` estão em dia.

## O que está bom

- **Orçamento:** as 29 classes dão 9 pontos de Vida + Mana + Estamina por nível, e a referência de balanceamento não acusa nenhum orçamento fora (`invalidResourceBudgets: 0`). A diferença entre classes mora no que elas fazem, e é isso que esta revisão olhou.
- **Testes por classe:** todas as 29 estão na lista de classes revisadas do `classProgression.test.ts`. Isso cobra DT declarada, ficha técnica nos catálogos, perícia que existe e poder que depende do nível 15.
- **Catálogos com escada:** a Publi, a Agência dos Caçadores, os Juramentos, as Engenhocas, as Fórmulas, o Cardápio, a Evolução Abissal, o Tuning e o Batalhão crescem em quatro ou cinco degraus. O item escolhido no nível 3 continua servindo no 20.
- **Amarração com sistemas que já existem:**
  - Pop Star na Fama e no Prestígio;
  - Piloto no capítulo de Veículos;
  - Lutador nas Manobras;
  - Ritualista na mesa de complexidades, cruzada por teste com o catálogo de rituais;
  - Elementarista na relação entre elementos.
- **Limite escrito:** Comerciante, Detetive, Escritor de Contos e Guia Dimensional dizem com todas as letras o que a habilidade não faz (não vende, não revela plano futuro, não controla NPC, não atravessa selo). É o molde para as outras.
- **Convenções:** a Elementarista já segue as convenções da revisão das magias (metade no sucesso, teste repetido na Prisão Elemental, teto de círculo).

## Problemas que atravessam tudo

### 1. Palavras que as regras não conhecem

- **Tipos de dano:**
  - "dano espiritual" é o tipo da classe inteira do Caçador das Almas (21 vezes);
  - "dano psíquico" aparece no Escritor (Metáfora Cortante);
  - "dano verdadeiro" aparece no Campeão (Número 1 e Rasgar);
  - "Energia" *(corrigido)* e "frio" como golpe *(corrigido)*; fora das classes, a modificação Guarda de Fluxo da Loja ainda fala em "dano de Energia";
  - danos sem tipo no Chamado das Profundezas (Pirata) e no Refluxo Hostil (Interceptador).
  → Decisão 10.
- **Condições:**
  - "Surdo" (Ressonância do Caçador das Almas), igual à Decisão 4 das raças;
  - medo e paralisia com nome genérico *(corrigidos)*.
- **Iniciativa rolada:** a Iniciativa é um número fixo *(corrigido no Chef)*.
- **Dano desarmado padrão:** as regras não publicam esse número, e o Lutador (níveis 1 e 2) e o Devorador (Mandíbula Reforçada) dependem dele.
- **"Rolagem de Defesa":** o Konsō do Caçador das Almas fala nela, e a Defesa não se rola.

### 2. Crítico: margem larga com multiplicador alto

O tópico Combate diz que margem larga e multiplicador alto não andam juntos: 18-20 e 19-20 sempre com x2, x3 e x4 sempre com margem 20. Quatro classes furam isso:
- **Ninja:** o Golpe Certeiro e o Corte Fatal entram na mesma arma e repetem, chegando a x6 ou a 15-20;
- **Espadachim:** o Fio Afiado alarga a margem;
- **Atirador:** o Ponto Fraco alarga a margem;
- **Caçador:** o Predador Perfeito dá 18-20 em qualquer arma.

A Loja já resolveu o mesmo caso: a modificação Margem Ampla "só entra em arma de multiplicador x2, para não furar a regra de margem larga com multiplicador alto". → Decisão 2.

### 3. Condição leve, média, grave e gravíssima

O Médico (seis vezes), o Chef (duas) e o Guardião (uma) curam ou encerram "condição leve" ou "média", e o Milagre fala em "gravíssima". As Condições não têm escala de gravidade, e a revisão das raças achou o mesmo na Anomalia. → Decisão 4.

### 4. Resistência sem tipo

O tópico Tipos de Dano diz que Resistência aponta sempre para um tipo. Oito efeitos dão "Resistência contra todo dano" ou Resistência sem tipo:
- Ás Impossível (Piloto);
- Contra o Choque (Médico);
- Coração Unificado (Guardião);
- Pilar da Dimensão (Campeão);
- Engenho Divino, modo Bastião (Engenheiro);
- Casca Guardiã e Núcleo Firme (Invocador);
- Marca do Caçador, com Resistência por criatura.

O Revestimento Elemental, da Elementarista, faz do jeito certo: Resistência 8 ao elemento escolhido e 4 a dano físico. → Decisão 3.

### 5. Visão, luz e ocultação

As classes usam "camuflagem" 10 vezes, "invisível" 6 vezes e "pouca luz" 3 vezes, e as magias usam "invisível" 14 vezes. As regras não definem nenhum desses termos, nem escuridão ou cobertura total; só a condição Revelado fala em tirar invisibilidade. Os casos nas classes:
- Engenheiro (Carga de Fumaça, Holofote, Sinalizador);
- Alquimista (Névoa Densa);
- Piloto (Camuflagem Ativa);
- Caçador (Camuflagem);
- Cartista (Eremita);
- Invocador (Sombra);
- Ninja (Onshinjutsu).

→ Decisão 5.

### 6. Dano em área sem metade no sucesso

A revisão das magias fixou que efeito de área ou de gatilho pede resistência e dá metade no sucesso. Várias classes causam o dano inteiro em todos e usam o teste só para a condição:
- Pirata: Sete Mares em Fúria, Senhor das Profundezas, Chamado das Profundezas e Maré Profana;
- Campeão: Pisada;
- Engenheiro: Mina Adesiva, sem teste nenhum;
- zonas pequenas sem teste: Cinzas (Caçador das Almas) e a derivação Magma (Elementarista).

→ Decisão 6.

### 7. Poderes que rendem mais que magia

Pela referência, uma magia de 2º círculo causa 9 de dano por 4 de Mana, e uma de 3º causa 10,5 por 7. Alguns poderes de classe passam disso no nível 2:
- Hadō (Caçador das Almas): 13,5 por 4 de Mana, com metade no sucesso;
- Kidō de Cura (Caçador das Almas): cura 13,5 por 5 de Mana, enquanto o Médico cura 1d6;
- Impacto e Soco (Campeão): +16,5 e +13 de dano no golpe, por 6 e 5 de Estamina;
- Investida Predatória (Devorador): +2 dados por 3 de Estamina, contra 6 no Golpe em W do Espadachim.

→ Decisão 7.

### 8. Classes sem papel em combate

Algumas classes não têm nada para fazer num combate, ou têm muito pouco:
- **Viajante e Guia Dimensional:** as duas são especiais e pedem liberação do Mestre. Nenhum poder do Viajante causa dano, protege ou atrapalha um inimigo. O Guia tem 5 de Mana por nível e nenhum dano.
- **Pop Star e Comerciante:** gastam a Mana só em teste social ou de negócio.
- **Ritualista:** não age em combate até o nível 15.
- **Detetive e Interceptador:** o Detetive tem dois poderes de combate. O Interceptador fica parado numa luta sem magia.

Classe de fora de combate pode existir de propósito. Mas hoje nenhum texto avisa o jogador disso, e uma classe especial luta pior que as comuns. → Decisão 8.

### 9. O nível 20 repetido

- **Dentro da própria classe:** seis classes têm, no nível 20, um estágio que repete a habilidade final:
  - Atirador: dois disparos que ignoram tudo;
  - Engenheiro: duas máquinas grandes;
  - Pirata: duas tempestades de 12 m;
  - Guia Dimensional: dois portais;
  - Alquimista: duas recuperações e três transmutações;
  - Canalizador: o poder Ápice repete o estágio 20.
- **Entre classes:** o Mestre da Vida (Médico), a Panaceia (Alquimista) e a Mesa da Celebração (Chef) são o mesmo pacote: até cinco aliados recuperam metade da Vida, da Mana e da Estamina e encerram uma condição.

→ Decisão 9.

### 10. Nível 18 e estágios sem título

- **Nível 18:** Guerreiro, Piloto e Ritualista são as únicas classes sem habilidade no 18. Os relatórios trazem uma sugestão para cada uma.
- **Estágios sem título:** 13 habilidades em 11 classes têm os estágios sem título: Arte da Espada, Na Mira, Medicina, Socorro de Emergência, Protegido, Provocar, Especialização, Número 1, Baralho Arcano, Cartografia da Matriz, Tinta Carmesim, Canalização Nativa e Sintonia Catalisada. As outras habilidades em estágio têm nome em cada degrau (Peito Aberto, Gennin, Mão Fechada), o que ajuda a mesa a falar delas.

## Decisões que são suas

Estas não se resolvem só corrigindo texto. A primeira opção de cada uma é a recomendada.

1. **Quanto uma cura cura** (Médico).
   - **A:** a Medicina 1 define a cura do Médico: Ação Padrão, toque, Cura DT 15, o alvo recupera 1d6 + Mod. Sabedoria, uma vez por alvo por cena (duas a partir do 10). O Socorro de Emergência ignora o Déficit e levanta o aliado com 1 de Vida. As regras ganham um parágrafo de tratamento para todo mundo: 10 minutos fora de combate, Cura DT 15, 1d6 de Vida, uma vez por descanso curto.
   - **B:** só o Médico ganha a cura base, e quem não é Médico depende de poção e magia.
   - **C:** a cura vem de um Kit Médico da Loja (o item define o número), e o Médico soma bônus em cima dele.
2. **Crítico nas classes** (Ninja, Espadachim, Atirador, Caçador).
   - **A:** efeito de classe que alarga a margem vale como está em arma x2; em arma x3 ou x4, vira +1 dado no dano do crítico. Golpe Certeiro e Corte Fatal valem uma vez por arma e não entram juntos.
   - **B:** a regra das armas vale só para a Loja, e a classe pode furar até 18-20/x3, com teto escrito.
3. **Resistência sem tipo** (oito efeitos).
   - **A:** "Resistência contra todo dano" vira "reduza em X o dano de cada golpe", depois da Resistência. A frase já existe no jogo (Corpo Encharcado, Provocar). A regra de Resistência por tipo fica inteira.
   - **B:** escrever a exceção nas regras: só capstone de classe pode dar Resistência a todos os tipos, e nunca acima de 10.
   - **C:** trocar todas por Resistência a dano físico.
4. **Escala de gravidade das condições** (Médico, Chef, Guardião e a Anomalia das raças).
   - **A:** definir nas Condições:
     - **Leve:** Exposto, Caído, Lento, Enfraquecido, Desorientado, Amedrontado, Sangramento, Queimando, Envenenado e Silenciado;
     - **Média:** Cego, Imobilizado, Atordoado, Paralisado e as crises de Sanidade;
     - **Grave:** as condições de longo prazo, Ferido e as aflições no estágio 3 ou mais;
     - **Gravíssima:** Mutilação e maldição.
   - **B:** cada habilidade lista no próprio texto as condições que trata.
5. **Visão, luz e ocultação.**
   - **A:** um quadro curto em Combate:
     - pouca luz dá desvantagem em Percepção pela visão;
     - escuridão deixa Cego quem não enxerga no escuro;
     - camuflagem dá −2 nos ataques contra e deixa tentar se esconder;
     - Invisível vira condição: ataques contra com desvantagem, os seus com vantagem, e Revelado encerra;
     - cobertura total impede alvo direto.
   - **B:** trocar, em cada texto, camuflagem por cobertura parcial e invisível por "não pode ser alvo direto".
6. **As convenções da magia nas classes** (problema 6).
   - **A:** aplicar: dano em área ou de gatilho com metade no sucesso, e zona com teste no começo do turno.
   - **B:** manter; poder de classe pode passar da magia.
7. **Régua para poder de dano e de cura** (problema 7).
   - **A:** um poder de classe rende no máximo o que uma magia do círculo equivalente rende por Mana (o círculo que um conjurador puro tem no mesmo nível). Por Estamina, a régua é +1 dado a cada 2 ou 3 de Estamina. Hadō, Kidō de Cura, Impacto, Soco e Investida Predatória descem ou ganham trava de nível.
   - **B:** aceitar a diferença nas especiais, que pedem liberação do Mestre, e mexer só no Kidō de Cura.
8. **Classes sem papel em combate** (problema 8).
   - **A:**
     - cada uma ganha um ou dois poderes de combate no próprio tema (as sugestões estão nos relatórios);
     - o Rito Guardado do Ritualista desce para o nível 5;
     - o Guia do Mestre ganha uma linha dizendo quais classes brilham fora da luta.
   - **B:** só as especiais (Guia Dimensional e Viajante) ganham poderes de combate.
   - **C:** manter, e só escrever o aviso no Guia e na página de cada classe.
9. **O nível 20 repetido** (problema 9).
   - **A:** o estágio 5 que repete a capstone vira outra coisa (sugestões nos relatórios), o Ápice do Fluxo vira outro poder, e o Mestre da Vida e a Panaceia ganham cara própria. Fica igual só a Mesa da Celebração do Chef, que é fora de combate.
   - **B:** só as repetições dentro da mesma classe.
10. **Tipos de dano que não existem** (espiritual, psíquico, verdadeiro).
    - **A:**
      - espiritual vira dano de Essência, o Fluxo da natureza verdadeira e do nome, que conversa com o nome da Zanpakutō;
      - psíquico vira dano do Fim, o Fluxo da Mulher Carmesim, decidido junto com a Decisão 8 das raças;
      - verdadeiro vira "impacto que ignora Resistência".
    - **B:** criar "Espiritual" como tipo da família Mágico, com quem resiste a ele (espíritos, mortos-vivos), e manter psíquico como mental (Sanidade).
11. **Guardião.**
    - **A:**
      - Muralhas com trava de nível (Ouro no 6, Ferro no 11, Diamante no 16);
      - Provocar uma vez por rodada, pagando a Estamina, com Vontade no fim do turno para encerrar;
      - Provocar 20 com efeito novo.
    - **B:** só o estágio 20 do Provocar, que hoje só aumenta o custo.
12. **Lutador: o ataque a mais das Marcas de Guerra.**
    - **A:** manter o ataque a mais por rodada com 2 marcas e escrever que é a compensação do punho, que bate menos que a arma do mesmo nível.
    - **B:** trocar por +1d6 no próximo acerto e subir os dados do Punhos de Ferro um degrau.

## Perguntas para o questionário final

Perguntas de regra e de lore que não travam nada e vão para o questionário do fim do roteiro:

1. **Caçador:** a Especialização aceita também uma família do Bestiário (dragão, elemental, morto-vivo, Vazio...), além das raças jogáveis?
2. **Morte:** o Jardim permite voltar da morte? A Reconstrução da Pedra Filosofal (Alquimista) é o único efeito de classe que faz isso, e o Médico e o Chef dizem que não ressuscitam ninguém.
3. **Piloto:** montaria pode ser o Xodó (com Cavalgar no lugar de Pilotagem)? O Ás Impossível já fala em montaria.
4. **Detetive:** é classe comum ou especial? Hoje ela é `padrao` com `patamar: conquista`.
5. **Engenheiro:** a Artilharia do Engenho Divino causa raio (como ficou) ou dano tecnológico da A.X.I.S?
6. **Desarmado:** quanto dano causa o soco de quem não é Lutador? A sugestão é 1 de impacto, sem Mod.
7. **Devorador:** a vítima sem classe (criatura do Bestiário) entrega uma habilidade da ficha dela, com teto de VD?

## Ordem sugerida

1. **Correções baratas e certas:** feitas nesta rodada.
2. **As decisões.** Comece pela 1 (cura), pela 3 (Resistência), pela 4 (gravidade) e pela 5 (visão), que mexem nas regras e limpam achados de várias classes de uma vez. Depois vêm as de equilíbrio (2, 6, 7, 11 e 12) e as de desenho (8, 9 e 10).
3. **Os achados de cada relatório que não dependem de decisão.** Por exemplo:
   - Cliffhanger sem limite (Escritor);
   - Regeneração de Banquete sem limite e o Banquete de Poder contra criatura sem classe (Devorador);
   - Arsenal Especial e os quatro poderes travados no 15 (Guerreiro);
   - Aplicação Inteligente sem número (Ninja);
   - as cinco versões II do Espadachim;
   - os poderes do Alquimista que repetem fórmulas;
   - a conta de âncoras do Guia;
   - o Provocar 20 do Guardião.
4. **Nível 18** para Guerreiro, Piloto e Ritualista, e **títulos** para os estágios sem nome.
5. **Uma auditoria permanente** (`tools/audit-classes.mjs`), no molde do `audit:balance`, rodando nos testes. Ela conferiria:
   - os termos fora das regras;
   - a margem de crítico;
   - a Resistência sem tipo;
   - o dano em área sem metade;
   - o rendimento por Mana e por Estamina;
   - o bônus permanente sem `efeitos_por_nivel`.

Trocar o id de uma classe, habilidade, opção ou poder exige migração (as escolhas ficam guardadas por id na ficha). As correções devem mudar só `titulo`, `descricao` e números.

## Relatórios por classe

| Classe | Achados | Principais pontos |
|---|---|---|
| [Guerreiro](classes/guerreiro.md) | 5 | Arsenal Especial vazio para ele e quatro poderes travados no 15, sem habilidade no 18 |
| [Piloto](classes/piloto.md) | 7 | Resistência contra todo dano, Mana sem onde gastar, montaria no Xodó, sem habilidade no 18 |
| [Ninja](classes/ninja.md) | 5 | Golpe Certeiro e Corte Fatal furam a regra do crítico, Aplicação Inteligente sem número |
| [Pop Star](classes/pop-star.md) | 5 | Mana sem uso em combate, "DT de Pop Star" |
| [Espadachim](classes/espadachim.md) | 7 | cinco poderes versão II, Fio Afiado, Guarda Alta confusa, "muda de postura" |
| [Lutador](classes/lutador.md) | 7 | soco sem dano nos níveis 1 e 2, ataque a mais permanente, "sem armadura" só no texto |
| [Atirador](classes/atirador.md) | 7 | Na Mira 20 repete Um Só Disparo, Ponto Fraco |
| [Médico](classes/medico.md) | 9 | a cura base não existe, Socorro contra o Déficit, condição leve, Resistência a todo dano |
| [Guardião](classes/guardiao.md) | 8 | Provocar 20 só encarece, Muralhas sem trava (Resistência 10 no 11), provocação de uma rodada |
| [Caçador](classes/cacador.md) | 7 | Especialização só em raças, "categoria", Predador Perfeito 18-20 |
| [Engenheiro](classes/engenheiro.md) | 7 | dano de Energia, Medicina, camuflagem, Mina sem teste, dois capstones |
| [Alquimista](classes/alquimista.md) | 7 | dano de frio, cinco poderes repetem fórmulas, três transmutações, Reconstrução |
| [Comerciante](classes/comerciante.md) | 3 | bem resolvido; falta ajuda para usar o Estoque em combate |
| [Campeão Dimensional](classes/campeao-dimensional.md) | 9 | dano verdadeiro, Soco e Impacto fortes demais no nível 2, Além do Comum que a ficha não somava |
| [Pirata Amaldiçoado](classes/pirata-amaldicoado.md) | 5 | duas tempestades no 20, dano em área sem metade |
| [Cartista Arcano](classes/cartista-arcano.md) | 4 | invisível, alcances fora da grade |
| [Guia Dimensional](classes/guia-dimensional.md) | 6 | conta de âncoras, dois portais no 20, nenhum dano |
| [Caçador das Almas](classes/cacador-das-almas.md) | 9 | dano espiritual, Hadō e Kidō acima da magia, "rolagem de Defesa", Hohō que a ficha não somava |
| [Escritor de Contos](classes/escritor-de-contos.md) | 5 | Cliffhanger sem limite, dano psíquico, Guarda-Costas sem ficha |
| [Invocador](classes/invocador.md) | 3 | Resistência sem tipo, Invisível |
| [Viajante](classes/viajante-classe.md) | 4 | nada em combate |
| [Canalizador](classes/canalizador.md) | 3 | Ápice do Fluxo igual ao estágio 20, cinco bônus no mesmo teste |
| [Sintonizador](classes/sintonizador.md) | 2 | Troca Instantânea perde a função no 15 |
| [Ritualista](classes/ritualista.md) | 3 | nada em combate até o 15, sem habilidade no 18 |
| [Interceptador](classes/interceptador.md) | 2 | Refluxo Hostil sem tipo, parado em luta sem magia |
| [Chef](classes/cozinheiro.md) | 6 | Iniciativa rolada, condição leve, capstone igual à do Médico e do Alquimista |
| [Detetive](classes/detetive.md) | 3 | `patamar` de especial numa classe comum |
| [Devorador](classes/devorador.md) | 7 | Banquete contra criatura sem classe, cura sem limite, dois bônus que a ficha não somava |
| [Elementarista](classes/elementarista.md) | 3 | já segue as convenções; Marca Elemental "persistente" |
