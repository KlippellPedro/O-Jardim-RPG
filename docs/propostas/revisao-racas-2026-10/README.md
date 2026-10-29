# Revisão das raças (outubro de 2026)

Revisão das raças jogáveis no molde da revisão das magias: ler tudo procurando o que está errado, incoerente, sem sentido ou que pode melhorar, e medir o equilíbrio com a referência do próprio jogo. A leitura foi feita raça por raça, apoiada em varreduras por script. As varreduras mediram três coisas: o pacote de Vida + Mana + Estamina por nível, os dados de cada habilidade contra o acerto de NPC do nível e os termos que as regras não conhecem.

- **Revisado:** as 23 raças jogáveis de `data/ficha/racas.json` (a Entidade e a raça personalizada não têm mecânica), com 571 traços e 331 opções (Clãs, Linhagens, Formas, Moldes, estágios, modificações, Fragmentos, Maldições, Assinaturas), as 25 páginas de `src/redesign/raca/` e o tópico Raças das regras.
- **Achados:** 124 no total, sendo **30 erros**, **47 incoerências** e **47 melhorias**. **25 já foram corrigidos** nesta rodada (lista abaixo), alguns só na parte de texto.
- **Relatórios completos:** [`racas/`](racas/), um por raça. Cada achado traz o id, o campo, o problema e uma sugestão concreta.
- **Base:** `data/ficha/racas.json` no commit `569bc95`. As auditorias do Espírito (200 habilidades) e da Animália (30 combinações) passavam sem violação no começo e continuam passando.

## Aplicado em 2026-10-27 (sem commit)

Só o que não pedia decisão. Os ids ficaram iguais, então nenhuma ficha perde escolha.

- **Perícias que não existem:**
  - Persuasão virou Diplomacia (três traços do Vampiro);
  - Medicina virou Cura (Golem, na raça e na página, e Amálgamo);
  - Ritos de Arkarin, que saiu da lista de perícias, virou Religião (Fôlego Roubado e Biologia Impossível do Desperto, Conhecimentos Extremos do Auleth, inclusive no campo `teste` e na lista de perícias aplicáveis).
- **Tipos de dano da tabela:**
  - "dano elétrico" virou dano de raio (Gigante, Elfo, Auleth, Divino; 12 textos e campos);
  - "eletricidade, trovão ou vento" virou "dano de raio e dano de ar" (Elfo);
  - Frio, que é dano de ambiente, virou Gelo onde era golpe (Sepulcro Prolongado) ou onde a imunidade a frio já cobria o ambiente (Sopro Invernal).
- **Condições com o nome oficial:**
  - Derrubado virou Caído (Gigante);
  - "fica presa" virou Imobilizado (Armadilha Armada do Anão, Raiz-Âncora do Golem, Sepultar em Gelo do Slime).
- **Texto quebrado:** oito "mMestre" colados na palavra seguinte (sete no Espírito, um na regra da fé do Divino).
- **Bônus que a ficha não somava:**
  - +1,5 m de Movimento da Pelagem Noturna (Vampiro Pricolici);
  - +1 de Defesa do Ectoplasma Firme (Espírito Marrom), que leva o total de +2 a +3;
  - +1 de Defesa do Respirar Fundo (Anjo da Paciência).
- **Autômato:**
  - saiu a nota de desenvolvimento do Resistente;
  - o Compartimento de Carga passou a dar +15 espaços, e não "quinze itens equivalentes a um mochilão";
  - o Núcleo Autônomo agora diz que a Tecnologia é o Fluxo nativo, como manda a Decisão 1 da revisão das magias.
- **Lore:** o Fragmento de Arkarin do Desperto falava em "Fluxo de Arkarin". Arkarin é o Galho de Limiar, e o Fluxo de lá é o Fim.
- **Páginas:**
  - `Desperto.tsx` ainda dizia "Ecos de Séculos";
  - `Onirico.tsx` tinha a antítese "Não é uma pessoa dormindo: ...";
  - `Golem.tsx` dizia Medicina;
  - `Automato.tsx` ganhou a mesma frase do Fluxo nativo, porque escreve o Núcleo Autônomo à mão.
- **Guia do Mestre:** o tópico Raças dizia que as escadas vão "até o nível 50"; agora diz "e o Espírito até o 60".
- **Trava de tom:** `tests/frontend/tomSemAntitese.test.ts` passou a ler também as páginas de raça (antítese, "—" e "eco").
- **Arquivos regerados:** `regras-editorial.json` e `regras-publicas-v1.md`.
- **Testes:**
  - 1408 testes do front passam;
  - 141 do servidor passam (`test_character_rules`, `test_content_seed`);
  - o `tsc` passa;
  - as auditorias do Espírito e da Animália passam.

## O que está bom

- Os campos `usos`, `recuperacao` e `custo_mana` batem com o texto em todas as 23 raças (conferido por script).
- Nenhum id se repete dentro de uma raça.
- O texto do JSON já estava sem antítese, travessão e "eco" desde a passada de tom.
- As escadas têm teste por limiar (`racialStages.test.ts`), a Estamina racial tem teste próprio, e Espírito e Animália têm auditoria que roda nos testes.
- Elfo, Bruxa, Onírico e Espírito já escrevem o teste com perícia dos dois lados (campo `teste`, Misticismo contra uma resistência) e dizem o que acontece no sucesso e na falha. São o molde para as outras raças.
- A Noite Sem Fim do Onírico já traz a trava "ninguém perde a ação em duas rodadas seguidas", que a recalibragem das escadas pediu.
- Mímico, Clone e Anomalia mostram como escrever limite. A Forma Emprestada e o Qualquer Um listam o que a cópia não leva, e a Anomalia proíbe importar número de outro sistema.
- Os sete Clãs, as seis Linhagens, os seis Materiais e as quatro Canções têm identidade clara, e nenhum é cópia de outro.

## Problemas que atravessam tudo

### 1. Palavras que as regras não conhecem

O mesmo defeito em quase toda raça: a habilidade usa um nome que não está nas listas oficiais, e a ficha ou o Mestre ficam sem saber o que fazer.

- **Perícias:** Persuasão, Medicina e Ritos de Arkarin. *(Corrigido.)* A revisão das classes deve olhar o mesmo, porque `classes.json` tem Medicina 7 vezes, "elétrico" 1 vez e "psíquico" 2 vezes.
- **Tipos de dano:**
  - elétrico e Frio no lugar de Gelo *(corrigidos)*;
  - "psíquico" no Reboque dos Afogados (Sereia) e na Noite Sem Fim (Onírico) (Decisão 8);
  - cerca de dez habilidades sem tipo nenhum (Chamado do Fundo, Pressão das Profundezas, Horizonte de Eventos, Berçário, Terra Viva, Sol nas Mãos, os três da Morte do Divino, Definhamento).
- **Condições:**
  - Derrubado e "presa" *(corrigidos)*;
  - Fascinado, Encantado, Enjoado, Surdo e Ofuscado (Decisão 4).
- **Outros termos:**
  - "Redução 5" (Elfo) e "camuflagem" (Auleth);
  - "fadiga" no lugar de Cansaço (Autômato, Clone, Amálgamo) e "nocaute" (Onírico);
  - "dano físico comum", que aparece em várias raças e que as regras chamam de dano físico (corte, perfuração e impacto);
  - "armas de porte grande" (Gigante);
  - "encantar" e "encantamento" no sentido de controle mental (Simbionte, Autômato, Auleth, Espírito), que se confunde com Encantamento, uma das manifestações da magia. Sugestão: "controle mental" ou a condição que sair da Decisão 4.
- **Tamanho:**
  - as raças usam Minúsculo, Pequeno, Normal, Grande e Enorme, o Gigante fala em Colossal e a Possessão em "Média";
  - o Bestiário usa "médio" e "colossal";
  - nenhum tópico diz o que o tamanho muda (Decisão 10).

### 2. Teste "contra o seu Carisma"

Dezessete habilidades fazem o alvo testar contra um atributo: três do Vampiro, três da Sereia e onze do Divino. As regras não dizem o que é testar contra um atributo. As classes resolvem isso com uma perícia rolada que vira a DT (campo `dt_efeitos`, por exemplo "DT de Guerreiro" com Intimidação), e as raças nunca ganharam o equivalente. Também há testes sem DT nenhuma: Armadilha Armada (Anão), Engolir (Slime), Memória Coletiva (Simbionte) e as Assinaturas da Anomalia. → Decisão 1.

### 3. O pacote de Vida, Mana e Estamina

Soma de Vida + Mana + Estamina que a raça dá, no nível 1, no degrau do meio e no topo. As classes dão 7 pontos por nível, então 7 pontos de raça valem mais ou menos um nível.

| Raça | Escada | Nível 1 | Meio | Topo |
|---|---|---|---|---|
| Humano | sem escada | 0 | 0 | 0 |
| Goblim | sem escada | 2 | 2 | 2 |
| Feérico | sem escada | 2 | 2 | 2 |
| Sereia | 1 / 12 / 32 | 1 | 4 | 10 |
| Anão | 1 / 11 / 26 | 5 | 5 | 9 |
| Animália | 1 / 13 / 36 | até 6 | | 9 a 16 |
| Mímico | 1 / 12 / 34 | 1 | 4 | 16 |
| Simbionte | 1 / 11 / 30 | 1 a 3 | 8 a 10 | 21 a 23 |
| Vampiro | 1 / 17 / 42 | 2 (Noite Eterna 6) | 10 (14) | 26 (30) |
| Slime | 1 / 9 / 28 | 2 | 9 | 27 |
| Golem | 1 / 12 / 36 | 6 | 15 | **39** |
| Gigante | 1 / 14 / 36 | 6 | 15 | **39** |
| Bruxa | sem escada | 6 | 6 | 6 |
| Desperto, Anomalia | sem escada | 8 | 8 | 8 |
| Amálgamo | sem escada | 9 | 9 | 9 |
| Clone | sem escada | 8 (Otimizado 9) | 8 (+1 por nível) | 8 (Otimizado **68** no 60) |
| Autômato | sem escada | 5 a **15** pelo chassi | | + Resistente (+2 Vida por nível) |
| Elfo | 1 / 20 / 50 | 6 | 9 | 15 |
| Auleth | 1 / 18 / 44 | 2 | 5 | 15 |
| Onírico | 1 / 15 / 40 | 5 | 10 | 18 |
| Divino | 1 / 18 / 48 | 7 (Deus **25**) | 13 | 25 (Deus 43, fora a fé) |
| Espírito | 1, 8, 15, 28, 40, 60 | 1 | 22 no 40 | 49 no 60, com a Provação |

O que salta da tabela:

- Entre as comuns, o topo vai de 0 a 39. Um único degrau do Golem e do Gigante (+16 Vida, +8 Estamina no 36) vale mais que a escada inteira da Sereia.
- Três comuns e cinco especiais não crescem (Decisão 3).
- No nível 1, o Deus (25) e o Autômato Enorme (15) ficam muito acima de qualquer outra raça (que param em 9). O Clone Otimizado e o Autômato Resistente crescem por nível sem teto.

→ Decisões 2, 3, 6 e 7.

### 4. As convenções da magia que não chegaram às raças

A revisão das magias fixou três convenções: zona de dano pede resistência e dá metade no sucesso; efeito que tira ação tem teste repetido; efeito forte tem teste. Várias habilidades de ápice das raças ainda fazem o contrário.

- **Zonas e auras de dano sem teste**, doze no total:
  - Invérnia e Coroa de Raios (Gigante);
  - Chamado do Fundo (Sereia);
  - Poça Corrosiva (Slime);
  - Campo de Lascas (Golem);
  - Horizonte de Eventos e Berçário (Auleth);
  - Terra Viva (Divino);
  - Chama que Não Cede e Tormenta sobre o Campo (Elfo);
  - o Engenho de Cerco (Anão), que acerta sozinho;
  - a Sombra que Engole (Vampiro), que deixa todos Cegos sem teste.
- **Travas sem teste repetido:**
  - Sepulcro Prolongado e Inverno que Não Passa (Elfo), que tiram ação e reação por cinco rodadas;
  - Peso de Mundo (Auleth);
  - Raiz-Âncora (Golem) e Floresta Desperta (Elfo), que prendem sem teste inicial.
- **"Até o fim da cena, duas vezes por cena":** Forma de Montanha (Gigante), Casca Prismática e Corpo de Aço (Slime). Sobraram do ajuste que dobrou os usos dos ápices, e o segundo uso não faz nada.

→ Decisão 5.

### 5. A ficha não somava o que o texto prometia

Três bônus passivos estavam só no texto *(corrigidos, ver acima)*. A Fúria Sagrada do Divino faz o contrário: está marcada como automatizada sem que a ficha aplique nada.

### 6. A ligação com a magia

- A Decisão 1 da revisão das magias diz que o Fluxo nativo vem da Árvore e que só o Autômato tem Tecnologia de nascença. Nenhuma raça dizia isso; o Autômato agora diz *(corrigido)*.
- O Espírito natural tem um Fluxo como marca, mas o Fluxo nativo dele vem da Árvore: um Espírito do Tempo nascido em Gênese conjura Origem e não conjura Tempo (Decisão 9).
- Pontos que já conversam bem com a magia:
  - a Refração do Golem de Cristal usa "magia que exige ataque", como a convenção da Decisão 5 das magias;
  - a Noite sobre o Dia do Elfo apaga luz mágica "até 5º Círculo", com teto de círculo;
  - o Pulso do Auleth dá teste ao Autômato, como pede a Decisão 11 das magias.

### 7. Idioma de cada raça

Os idiomas ganharam uma entrada por língua (`data/mundo/Jardim/idiomas.json`), mas as páginas de raça não dizem que língua o povo fala. Oito raças nem têm língua própria hoje: Humano, Mímico, Simbionte, Slime, Feérico, Auleth, Onírico e Divino. → Pergunta para o questionário final.

## Decisões que são suas

Estas não se resolvem só corrigindo texto. Cada uma muda regra ou números. A primeira opção de cada uma é a recomendada.

1. **DT das raças** (Vampiro, Sereia, Divino e os testes sem DT).
   - **A:** cada raça que impõe teste ganha uma DT de raça no molde das classes (uma perícia rolada vira a DT): Vampiro com Intimidação, Sereia com Atuação, Divino com Religião. As que já usam Misticismo continuam, e os testes sem número passam a usar essa DT.
   - **B:** todas usam Misticismo, como Elfo, Bruxa, Onírico e Espírito.
   - **C:** criar nas regras o "teste de atributo" (d20 + Mod. + metade do nível, sem grau) e manter o Carisma.
2. **Pacote de recursos das comuns.**
   - **A:** uma faixa para o topo das comuns (sugestão: de 14 a 24), travada por teste como a da Animália. O último degrau de Golem e Gigante cai pela metade (+8 Vida, +4 Estamina), e Sereia e Anão sobem até o piso.
   - **B:** aceitar a diferença como identidade (corpo grande ganha mais) e escrever isso no Guia do Mestre.
   - **C:** subir só as leves, sem mexer nas grandes.
3. **Raças que não crescem.** As comuns Humano, Goblim e Feérico, e as especiais Desperto, Clone, Anomalia, Amálgamo e Bruxa.
   - **A:** escada de três degraus para as três comuns (propostas nos relatórios) e um degrau leve, por volta do 20 a 25, nas especiais, que faça o que elas já têm crescer.
   - **B:** só as três comuns ganham escada.
   - **C:** manter; raça sem escada é para quem quer ficha simples.
4. **Condições que não existem.**
   - **A:** criar três condições oficiais, e Encantado vira Fascinado e Ofuscado sai do texto:
     - Fascinado: não age contra a fonte e tem −5 em Percepção; qualquer dano ou ameaça encerra;
     - Enjoado: desvantagem em ataques e em testes de Destreza; Fortitude no fim do turno encerra;
     - Surdo: falha em Percepção pela audição e não é afetado por efeitos de som.
   - **B:** reescrever cada traço com condições que já existem (Desorientado, Enfraquecido) e descrever o resto no próprio traço.
5. **As convenções da magia nas raças** (item 4 acima).
   - **A:** aplicar as mesmas convenções:
     - zona de dano pede Reflexos ou Fortitude no começo do turno, com metade no sucesso;
     - trava pede teste repetido no fim de cada turno, ou "ninguém perde a ação em duas rodadas seguidas";
     - efeito que dura a cena vale uma vez por cena, ou passa a durar cinco rodadas.
   - **B:** manter, porque é ápice de raça e pode passar de uma magia do mesmo nível.
6. **Autômato.**
   - **A:** o pacote de ajustes do relatório:
     - Corpo Maciço com Resistência 2 que cresce com o nível;
     - Pulso Estridente até o fim do próximo turno;
     - Raio Inferno uma vez por cena;
     - Laser com 4d10+4 e metade no sucesso;
     - Eletrificar duas vezes por cena;
     - Resistente com +1 por nível;
     - teto de 8 vagas;
     - o chassi pequeno ganha vantagem em Furtividade e Reflexos.
   - **B:** só os quatro erros (Corpo Maciço, Pulso Estridente, Raio Inferno e Laser).
   - **C:** manter; o Autômato é especial e depende de liberação.
7. **Deus × Semideus.**
   - **A:** o Deus fica com metade do bônus de hoje (+3 Vida, +4 Mana, +2 Estamina, +2 Defesa), e a fé continua. O Semideus ganha o que o Deus não tem: um Legado a mais, da família mortal, e uma Bênção Concedida por sessão sem custo de Mana.
   - **B:** o Deus fica como está, e só o Semideus ganha algo.
   - **C:** manter os dois; o Mestre decide quem pode ser Deus.
8. **"Dano psíquico"** (Reboque dos Afogados, Noite Sem Fim).
   - **A:** trocar por um tipo que tira Vida e combina com a cena: Água no Reboque dos Afogados e Escuridão na Noite Sem Fim.
   - **B:** dano mental, que pela tabela tira Sanidade, com dados menores, porque a Sanidade é uma barra de 0 a 100.
9. **Espírito natural e Fluxo nativo.**
   - **A:** o Fluxo da marca é o Fluxo nativo do Espírito natural, no lugar do da Árvore. Demônio e anjo seguem a Árvore, e o Universal fica como está.
   - **B:** a marca vira um Fluxo instalado automático, que abre as magias sem dar Marca de círculo.
   - **C:** manter: a marca é só racial.
10. **Tamanho.**
    - **A:** um tópico curto, Tamanho, com seis categorias (Minúsculo, Pequeno, Normal, Grande, Enorme, Colossal). Ele diz o que cada uma muda: equipamento, agarrão, empurrão, carga, alcance corpo a corpo e espaço. "Normal" passa a ser o nome único, e o Bestiário troca "médio" por "normal".
    - **B:** deixar sem regra e só padronizar os nomes.

## Perguntas para o questionário final

Perguntas de lore e de nome, que não travam nada e vão para o questionário do fim do roteiro:

1. **Noite Eterna:** o Clã mais forte do Vampiro e a Linhagem do Elfo têm o mesmo nome. São a mesma noite ou família? Se não, um deles muda de nome?
2. **Pricolici:** a Pelagem Noturna fala em "noites de lua cheia", mas em Întuneric a lua parou no céu e nunca se põe. A lua de lá tem fases?
3. **Gigante:** no 36 o porte vira uma categoria nova (Colossal), ou o degrau só tem esse nome?
4. **Autômato:** altura dos chassis bípedes. Hoje são 3,5 / 5 / 6 / 9 m; a sugestão é 1 / 1,8 / 3 / 4,5 m.
5. **Autômato:** as armas do núcleo (Laser, Raio Inferno, Eletrificar) causam dano tecnológico, que é o dano da A.X.I.S, ou raio e fogo mesmo?
6. **Divino, Domínio da Morte:** o dano é de Escuridão ou do Fim?
7. **Animália:** os Traços têm sempre tamanho de pessoa, seja qual for o animal?
8. **Espírito:** o equilíbrio dos 14 Pecados e Virtudes, da Possessão e da Encarnação, pendente desde 12/10.
9. **Idiomas:** cada página de raça deve dizer a língua do povo? E as oito raças sem língua própria falam só o Universal?

## Ordem sugerida

1. **Correções baratas e certas:** feitas nesta rodada.
2. **As decisões.** Comece pela 1 (DT), pela 4 (condições) e pela 5 (convenções), que limpam mais achados de uma vez. Depois vêm as de equilíbrio (2, 3, 6 e 7) e as outras (8, 9 e 10).
3. **Os achados de cada relatório que não dependem de decisão.** Por exemplo: Golem de Ferro, Obra de Mestre, Engenho de Cerco, Canção do Fascínio, Duas Cabeças, Juramento de Sangue, Fúria Sagrada e os danos sem tipo.
4. **Uma auditoria permanente das raças** (`tools/audit-racas.mjs`), no molde das do Espírito e da Animália, rodando nos testes. Ela conferiria:
   - o pacote por faixa;
   - os dados contra o acerto de NPC do nível;
   - os termos fora das regras (perícia, tipo de dano, condição);
   - o campo de Defesa e Movimento que o texto promete.

Quem for mexer nas raças deve ler [`docs/EDITOR_CONTEUDO_CAMPANHA.md`](../../EDITOR_CONTEUDO_CAMPANHA.md) antes. Trocar o id de uma raça, de uma opção ou de um traço exige migração, então as correções devem mudar só `titulo`, `descricao` e números.

## Relatórios por raça

| Raça | Achados | Principais pontos |
|---|---|---|
| [Humano](racas/humano.md) | 2 | sem escada, pacote 0 do 1 ao 60 |
| [Goblim](racas/goblim.md) | 2 | sem escada, Mercador sem perícia |
| [Feérico](racas/feerico.md) | 2 | sem escada, tamanho que não vira escolha |
| [Vampiro](racas/vampiro.md) | 8 | Movimento que a ficha não somava, Persuasão, "contra o seu Carisma", Juramento de Sangue sem teste, Cegos sem teste |
| [Anão](racas/anao.md) | 6 | Obra de Mestre repetida, Engenho de Cerco que acerta sozinho, pacote baixo |
| [Golem](racas/golem.md) | 8 | Medicina, Golem de Ferro com menos Defesa que os outros, Raiz-Âncora sem teste, pacote 39 |
| [Gigante](racas/gigante.md) | 10 | frio × gelo, dano elétrico, Derrubado, "até o fim da cena, duas vezes por cena", Colossal sem tamanho |
| [Sereia](racas/sereia.md) | 8 | Fascinado sem regra, Canção do Fascínio repetida, Carisma, dano psíquico, pacote 10 |
| [Mímico](racas/mimico.md) | 3 | bem resolvida; só ajustes de texto |
| [Simbionte](racas/simbionte.md) | 3 | ação de movimento extra toda rodada, "encantar" |
| [Slime](racas/slime.md) | 5 | Enjoado, Corpo de Aço com +7 de Defesa pela cena, Poça Corrosiva sem teste |
| [Elfo](racas/elfo.md) | 8 | Sepulcro Prolongado (trava de cinco rodadas), frio × gelo, Redução 5, Floresta Desperta sem teste |
| [Desperto](racas/desperto.md) | 4 | Ritos de Arkarin, Fluxo de Arkarin, página com "Ecos", sem escada |
| [Auleth](racas/auleth.md) | 7 | Ritos de Arkarin, zonas sem teste e sem tipo, Peso de Mundo, camuflagem |
| [Autômato](racas/automato.md) | 15 | Corpo Maciço com Resistência 10 no nível 1, Pulso Estridente, Raio Inferno, Laser, chassis com 5 m de altura, vagas sem teto |
| [Clone](racas/clone.md) | 2 | Organismo Otimizado cresce, os outros Projetos não |
| [Anomalia](racas/anomalia.md) | 3 | "condição leve" sem lista, Assinatura que não cresce |
| [Amálgamo](racas/amalgamo.md) | 3 | Medicina, sem escada |
| [Bruxa](racas/bruxa.md) | 3 | sem escada, Definhamento sem tipo |
| [Onírico](racas/onirico.md) | 4 | dano psíquico, antítese na página, "nocaute" |
| [Divino](racas/divino.md) | 8 | Deus × Semideus, onze testes contra Carisma, dano elétrico, Fúria Sagrada marcada como automática |
| [Espírito](racas/espirito.md) | 8 | "mMestre", dois +1 de Defesa que a ficha não somava, Fluxo da marca × Fluxo nativo, Encantado e Surdo |
| [Animália](racas/animalia.md) | 2 | passa na auditoria; tamanho dos Traços a confirmar |
