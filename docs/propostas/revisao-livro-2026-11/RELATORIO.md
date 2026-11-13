# Revisão do Livro de Regras (2026-11-12)

Pedido do Pedro: uma revisão grande das regras e do livro para ver se está
tudo de acordo, bem escrito, com as contas certas, testado e jogável.

## O que foi feito

1. **Leitura inteira do livro do jogador.** Os 52 tópicos de
   `data/regras/regras-publicas-v1.md`, de Como Jogar a Prestígio, Fama e
   Procura. Cada exemplo e cada tabela foi refeito à mão.
2. **Guia do Mestre, parte mecânica.** Dificuldades de Teste, Montar um
   encontro, NPCs de nível alto, Criatura de qualquer VD, chefes (Ímpeto,
   Determinação, Guarda, covil) e Tesouro. As tabelas de descrição, NPC, boato
   e as fichas das Deidades passaram só pela varredura automática de texto.
3. **Conferência contra o código e o catálogo.** Preço real de arma e
   armadura no servidor, função de vagas, XP por VD, trava de grau por nível,
   regra de crítico por raridade, percentuais de fabricação.
4. **Testes e auditorias que já existiam.** `test:frontend` (1.654 testes),
   `check:rules-source`, `check:balance`, `check:server-content`. Tudo passa,
   antes e depois das correções.
5. **Varredura de texto.** Travessão, "eco", antítese "não é X, é Y",
   palavra repetida e frase colada: nada no livro nem no Guia.

Fora desta rodada: o texto de cada classe, raça e magia (revisados em
outubro), as telas do site e os PDFs, que **não foram regerados** (rode
`npm run docs:livro` e `npm run docs:livro:mestre` quando fechar a leva).

## Resultado curto

O livro está **jogável e bem escrito**. As contas dos exemplos fecham todas,
o tom está humano e consistente, e os testes cobrem as tabelas. O que falta
para chamar de terminado são **três buracos de regra** (itens 1 a 3), **três
furos de balanceamento** (itens 9 a 11) e uma lista de termos e contradições
pequenas. Nenhum deles impede uma sessão, mas todos aparecem na mesa.

| Assunto | Situação |
| --- | --- |
| Contas dos exemplos e tabelas | **OK.** Mais de 60 conferidas, nenhuma errada. |
| Escrita e tom | **OK.** Sem vícios; sobram termos com dois nomes (itens 20 a 24). |
| Testes | **OK.** 1.654 passam. |
| Regras que o jogador precisa e não acha | **Corrigido em parte** (DT Padrão). Falta "provocar reação" (item 1). |
| Balanceamento | **Três pontos** pedem decisão: Coreografia, preços, crítico. |

## O que conferi e fechou

- **Primeiros passos:** exemplo da fechadura (+7, 16 contra 15); conjunto
  padrão vale exatamente os 24 pontos da compra; Defesa, Movimento e
  Iniciativa do exemplo de criação.
- **Cenas:** Teste de Grupo; relógio das facções (3 → 5 → 4);
  Infiltração (Alerta 1, 2, 3 e a Desconfiança na metade de 6); Batalha
  (8 − 1 − 1 = 6); contato que sobe de Amigo para Leal.
- **Combate e dano:** exemplo da Bia (26 contra 14, crítico 2d8+4); ordem da
  Resistência (20 − 5 = 15); faixas de distância iguais nas duas
  perseguições; as sete probabilidades da tabela de trauma em 2d6.
- **Ferimentos e descanso:** Davi (30% é Gravidade 2, DT 16); descanso
  Maravilhoso (60, 30 e 15).
- **Progressão:** XP total em 60, 100, 150, 250 e 500; Legados e aumentos de
  atributo (10 e 12, 15 e 18, 20 e 24); tabela de treino igual à de graus;
  vagas de item (13 no 58, 18 no 100, 24 no 200).
- **Magia:** DT 7 + ⌊2,5 × círculo⌋ nas dez linhas; exemplo do 4º círculo
  (DT 17, precisa de 4); vagas (22 no nível 50); ciclo dos sete elementos.
- **Catálogos:** 28 condições, 47 de longo prazo, 6 crises, 29 classes
  (18 + 11), 23 raças (12 + 11), 11 Fluxos e 11 dádivas, itens por local.
- **Perigos:** queda de 12 m; fôlego (12 de Estamina, 4 ou 2 rodadas);
  armadilha de nível 10; implantes e Sanidade (100 → 78 → 60).
- **Economia e bases:** escada ×4 lida em salário mínimo; câmbio de 10
  Fragmentos; Sede com Dormitório e Oficina (5.000, 400, +1.000, 500).
- **Guia do Mestre:** Vida de inimigo padrão = dano × 4 × 0,75 × 4,5 em
  todas as linhas; Defesa de criatura = ataque + 6; solo = 80% do chefe;
  exemplo da Mãe da Lama (42 × 4,5 = 189); Ímpeto 3 e 2.

## Corrigido nesta rodada (sem commit)

| Onde | O que mudou |
| --- | --- |
| Perícias | **Seção nova "DT Padrão e DT Difícil"**, com a tabela por nível. Dez tópicos mandavam testar "contra a DT Padrão do nível" e o número só existia no Guia do Mestre. Usa a mesma conta da escada do Guia. |
| Descanso | "O Mestre pode devolver 1 ponto de Cansaço" virou "tirar". E Relaxar passou a dizer que é o descanso curto, porque Ferimentos, Marcas e a dádiva Seiva usam esse nome. |
| Treinamento e Poderes | O grau dado pela classe era descrito como "sem requisito". O servidor barra grau acima do nível total mínimo, então o texto agora diz isso. |
| Raridades | "1 vaga no começo e mais uma a cada 4 níveis" dava 13 vagas no 50; a tabela e a ficha dão 12. Frase refeita. |
| Magia e Fluxo | O resumo dizia "+ bônus da classe", e o corpo diz que nenhuma classe tem bônus fixo. Resumo alinhado. |
| Criação | A falha diz quanto custa refazer: 10% do material, ou 25% na falha crítica. O número só aparecia no exemplo. |
| Batalha | O exemplo falava em "dano Leve", coluna que não existe naquela tabela. |
| Contatos | Favor arriscado pedia "Leal ou mais"; Leal é o teto. |
| Perigos | Fôlego "dá dez rodadas" virou "até dez" (o arredondamento para cima tira rodadas de quem tem Estamina quebrada). |
| Criação de Personagem | "Capítulo Frutos e Implantes" virou "tópico". |
| Transporte | Legenda de leitor de tela dizia "transporte de Lunaris". |
| Mural | Entrada `2026-11-12-dt-padrao-no-livro`. |

Arquivos: `data/regras/regras.ts`, `batalha.ts`, `contatosELacos.ts`,
`crafting.ts`, `perigosAmbiente.ts`, `transporte.ts`, os dois gerados
(`regras-publicas-v1.md`, `regras-editorial.json`) e o mural.

## Aplicado em 2026-11-13, a pedido

O Pedro escolheu a escada ×4 e pediu para corrigir o que parecesse melhor e
mais coerente. Ficou assim (sem commit):

| Item | O que mudou |
| --- | --- |
| 10 | **Preço da encomenda na escada ×4:** Incomum ×4, Raro ×16, Épico ×64 e Lendário ×256 sobre o preço Comum do modelo (eram ×3, ×8, ×20 e ×60). Servidor (`economy_commands.py`), site (`lojaCatalogService.ts`), Raridades, Economia e `BALANCEAMENTO.md`. O fator do modelo de armadura (×2 a ×16) continua por cima. A verba do Guia não mudou: com a escada nova, a faixa de 20 a 49 passa a ter o que comprar. |
| 11 | **Crítico por raridade dentro da regra do Combate:** arma x2 alarga a margem e fica em x2; arma x3 ou x4 fica na margem do modelo e ganha +1 no multiplicador do Épico em diante. |
| 2 | **Morrendo:** dois sucessos seguidos ou um sucesso crítico estabilizam; falha crítica sobe 1 e pede a tabela de trauma (subia 2 e matava de Morrendo 1). O texto diz o que é estar estabilizado. |
| 3 | **Veneno perde força sozinho:** o sucesso no intervalo desce 1 estágio (`PROGRESSAO_DE_VENENO`, vale na ficha). Doença e vício seguem iguais. |
| 4 | **Perseguição a pé:** teste oposto é contra o Atletismo do outro lado, e dois sucessos contra DT se anulam. |
| 5 | **Tempo Entre Aventuras:** "Circular e ouvir a cidade" aponta para Contatos e Laços e não promete mais preço melhor; "Procurar uma pessoa" diz a DT. |
| 6 | **Termos:** Atordoante testa Fortitude contra o total do ataque; Guarda de Fluxo cobre dano mágico e tecnológico; Carcaça reduz dano tecnológico; as duas Marcas dizem "sofre 3 (ou 5) a mais de dano"; Retaliadora devolve 1d8. |
| 7 | **Calar alguém:** contra 10 + Reflexos do alvo. |
| 8 | **Lesão Interna:** texto sem ambiguidade. |
| 12 | **Tratar ferimentos:** 1d6 de Vida ou um décimo da Vida máxima, o que for maior. Relaxar ficou como estava. |
| 14 | **Paralisado:** Defesa −5. |
| 18 | **Agarrado:** Condições agora diz o mesmo que o Combate (contra 10 + Luta de quem segura). |
| 19 | **Piso do Mítico:** 50 Fragmentos e "mais de quinze vezes". |
| 20 | **Classe comum e especial** também em Sistema Base. |
| 22 | **Capacidade de carga:** saiu o "mínimo 5". |

Continuam abertos, porque são escolha de campanha ou de gosto: 13 (ritmo de
XP), 15 (maestria de Fluxo), 16 (fabricar raridade alta), 17 (salto da DT
entre 18 e 20), 21 (tamanho Médio nos veículos), 23 a 25 (restos de
migração, palavras com dois sentidos, caixas "Em resumo").

## Segunda leva de 2026-11-13, a pedido

| Item | O que mudou |
| --- | --- |
| 13 | **Três ritmos de XP** (Lento, Médio, Rápido), escolhidos pelo Mestre. O Lento é o de antes. Sete marcos: Cena marcante, Descoberta, Feito pessoal, Desafio vencido sem luta, Missão relevante, Fim de arco e Marco de campanha. "Quem fez, leva": XP de combate é de quem lutou e Feito pessoal é só de quem fez; Cena marcante e Feito pessoal, no máximo um por personagem por sessão. O XP de combate não muda com o ritmo. Só texto: a Sessão já distribui XP para as fichas escolhidas. |
| 15 | **Maestria de Fluxo:** uma vez por cena, repetir um teste de conjuração que falhou, sem pagar a Mana de novo. |
| 16 | **Fabricar custa 50% em toda raridade** (era 50% a 90%). DT, tempo e material continuam subindo. |
| 17 | **DT entre 18 e 20:** a DT Padrão é a mesma conta da Defesa das criaturas, então alisar o degrau mexeria na curva inteira. A tabela pública ganhou a linha do 19 (26, 28, 30) e uma frase explicando que a DT sobe quando um grau novo abre. |
| 23 | **Restos de migração** tirados de Veículos (campo Dano, preço do T4, índice de chassi). |
| 24 | **Dois sentidos:** a escala das condições passou a se chamar "Peso da condição", e "Gravidade" ficou só com a queda. Condições ganhou a nota das duas Sanidades (barra e perícia). |
| 25 | **Caixa "Em resumo"** em Coreografia, Equipamentos, Rituais e Selos, Legados e Treinamento. |

Os PDFs do Livro de Regras foram regerados (331 e 491 páginas, nada cortado).

**Item 21, resolvido:** o Pedro confirmou que o tamanho fica Normal. A tabela de
colisão agora mostra "Normal (veículo médio)", e o texto de Tamanho diz que
veículo chama esse degrau de médio, sem falar em "texto antigo".

## O que pede decisão sua

### Buracos de regra

**1. "Provocar reação" não tem regra. APLICADO em 2026-11-12, a pedido.**
O Combate ganhou a reação Ataque de Oportunidade e a seção "Provocar reação":
sair do alcance corpo a corpo por movimento próprio, ou levantar dentro dele,
abre um ataque corpo a corpo com −2 e sem crítico (o mesmo molde do
Contra-Ataque). Passo cuidadoso (a Ação de Movimento inteira para andar
1,5 m), teleporte e movimento forçado não provocam. Entrou também no
glossário de termos, na perícia Luta e na Folha de Regras de Mesa. Três
escolhas minhas que valem a sua conferência: o −2 sem crítico, o teleporte
não provocar e o passo cuidadoso custar o movimento inteiro. O achado
original:

Trinta e cinco textos de classe,
magia, raça, Legado e item falam em "provocar reações" ou "ataque de
oportunidade", além de Caído ("levantar provoca reações"), Esquiva e a
modificação Égide. O Combate lista quatro reações (Esquiva, Bloqueio,
Contra-Ataque e Proteger), e nenhuma delas é disparada por movimento. Hoje
ninguém sabe o que acontece quando um inimigo sai de perto.
*Sugestão:* uma quinta reação, Ataque de Oportunidade: quando um inimigo sai
do seu alcance corpo a corpo ou se levanta ao seu lado, um ataque corpo a
corpo. É a leitura que os 35 textos já supõem.

**2. Morrendo não tem saída sem ajuda, e o 1 natural mata.** No teste de
Morrendo o sucesso só segura, e só o 20 natural desce. A falha crítica sobe
2, então de Morrendo 1 vai direto a 3: são 5% de morte por turno caído, em
qualquer nível, com qualquer bônus. O livro também não diz o que é
"Morrendo 0" nem quando os testes param (fim da cena?).
*Sugestão:* dizer que Morrendo 0 é estabilizado, e decidir se a falha
crítica em Morrendo 1 mata ou leva a Morrendo 2 mais a tabela de trauma.

**3. Veneno de combate não acaba sozinho.** No teste de intervalo o sucesso
também só mantém. Com intervalo de uma rodada (Peçonha Hemorrágica, 1d6 a
3d6 por rodada), só Cura, Antídoto ou 20 natural encerram. Se é a intenção,
vale escrever; se não, uma duração ("até o fim da cena") resolve.

**4. Perseguição a pé: quem vence quando as manobras são diferentes?** A
rodada diz "quem vence move uma faixa", mas só Correr solto e Agarrar são
testes opostos. Se o fugitivo salta um telhado (contra DT) e o perseguidor
corta caminho (contra DT), os dois podem passar. Falta uma frase: cada
sucesso move uma faixa a favor de quem o tirou, e Correr solto se opõe ao
Atletismo do outro lado.

**5. Duas atividades do Tempo Entre Aventuras apontam para regra que não
existe.** "Circular e ouvir a cidade" promete boatos e preço melhor, com
"regra completa em Loja", e Loja não fala disso. "Procurar uma pessoa" manda
para Perícias, que também não tem. Ou se escreve a regra curta, ou a linha
passa a dizer que é teste simples a critério do Mestre.

**6. Quatro efeitos usam termo que o livro não define.**
- Modificação *Atordoante*: "teste de Constituição", sem DT. O sistema
  testa Fortitude contra uma DT.
- *Guarda de Fluxo* (escudo) e a Marca *Carcaça*: "dano de Energia", que
  não está nas cinco famílias de Tipos de Dano.
- Marcas *Elemento na Pele* e *Pele de Fluxo*: "Vulnerabilidade 3" e "5".
  Tipos de Dano define vulnerabilidade como dobrar o dano, sem número.
- *Retaliadora*: "devolve 1 dado de dano", sem dizer qual dado.

**7. Infiltração, Calar alguém:** "contra a Defesa passiva do alvo" não diz
qual das três (Fortitude, Reflexos ou Vontade).

**8. Lesão Interna:** "Descanso Excelente não recupera nada enquanto a lesão
durar" pode ser lido como "não cura a lesão" ou "não recupera Vida nenhuma".

### Balanceamento

**9. Coreografia Perigosa é crítico garantido sem limite. APLICADO em
2026-11-12, por escolha do Pedro: uma vez por cena, acertando ou errando.**
O achado original: "O ataque se
torna crítico se acertar", sem penalidade no teste e sem "uma vez por cena"
(Tudo ou Nada tem). Com 75% de acerto, é crítico três turnos em quatro, e
cada um ainda enche a Guarda do chefe. A única trava é o Mestre negar a
descrição repetida. *Sugestão:* −5 no ataque, ou uma vez por cena.

**10. A Loja usa duas réguas de preço para arma e armadura.** Economia diz
que arma e armadura são a régua do catálogo, na escada ×4 (Comum 30,
Incomum 120, Raro 480, Épico 2.000, Lendário 8.000 Lunaris) e que "uma arma
rara custa sempre mais que qualquer incomum". O balcão de verdade vende o
modelo Comum (15 a 80) e multiplica por 3, 8, 20 e 60 na encomenda. Uma arma
Lendária sai por 900 a 4.800 Lunaris, e uma simples Rara (120) custa menos
que uma marcial Incomum (240). A verba do Guia piora a conta: do nível 20 ao
49 ela paga 20 a 600 Solares por sessão por jogador, contra a regra
declarada de "um quarto de um item da faixa". No nível 30 são 20.000 Lunaris
por sessão, o bastante para quatro armas Lendárias.
*Sugestão:* ou os multiplicadores viram ×4, ×16, ×64 e ×256, ou Economia
passa a dizer que arma e armadura têm régua própria e a verba de 20 a 49
desce.

**11. Raridade quebra a regra do crítico.** Combate diz que margem larga e
multiplicador alto não andam juntos (18-20 e 19-20 sempre ×2; ×3 e ×4 sempre
com margem 20). No servidor, Épico dá margem +1 e multiplicador +1: uma
20/×2 vira 19-20/×3, e Lendária vira 18-20/×3. Com Margem Ampla (70
Lunaris), 16-20/×3. E como número dentro da margem acerta sempre, isso é 25%
de acerto automático com dano triplo, contra qualquer Defesa.
*Sugestão:* aplicar à raridade a mesma conversão que já vale para classe e
raça (em arma ×3, cada passo de margem vira +1 dado no crítico).

**12. Cura fora do descanso não acompanha o nível.** Tratar ferimentos
devolve 1d6 de Vida e Relaxar devolve 1d6 + Sabedoria + nível ÷ 4 de Mana e
Estamina, em qualquer nível. O Descanso se apresenta como "em porcentagem,
vale no 3 e no 30". No nível 20 (Vida média 80) o 1d6 já não conta.

**13. Ritmo de XP.** Uma criatura solo vale um quinto do custo do nível,
dividido pelo grupo: 5% por encontro, em todo nível. Com os marcos de 10%,
25% e 50%, dá perto de 4 a 5 sessões por nível, ou 250 a 300 sessões até o
60, que é o "jogo padrão". Se a intenção é campanha de anos, está certo; se
não, os marcos precisam pagar mais.

**14. Paralisado tira 2 de Defesa; Atordoado e Inconsciente tiram 5.** Quem
não consegue se mexer deveria ser pelo menos tão fácil de acertar quanto
quem está tonto.

**15. Fluxo não tem maestria de atributo.** São sete atributos e seis
maestrias. Se for de propósito, vale uma linha dizendo.

**16. Fabricar raridade alta não compensa em dinheiro.** Lendário pede 90%
do preço e 30 dias; os mesmos 30 dias de trabalho rendem até 1.950 Lunaris.
Só vale pelo acesso ao item. Observação, não erro.

**17. A DT Padrão salta de 26 para 30 entre os níveis 18 e 20.** É onde o
grau Veterano abre. Fica visível agora que a tabela está no livro.

### Contradições entre tópicos

**18. Soltar-se de Agarrado.** Combate: Atletismo ou Acrobacia contra 10 +
Luta de quem segura. Condições: teste oposto de Atletismo ou Acrobacia.

**19. Piso do Mítico.** Economia diz que cada faixa vai da metade ao dobro
da referência (o que daria 50 Fragmentos), e o parágrafo seguinte fala em
piso de 60. O "quase vinte vezes" só fecha com 60.

**20. Dois vocabulários de classe.** Sistema Base fala em classe "geral" e
"exclusiva"; o resto do livro, em "comum" e "especial".

**21. Tamanho "Médio".** Combate diz que o tamanho se chama Normal, e a
tabela de colisão dos veículos ainda lista Médio.

**22. Capacidade de carga "mínimo 5".** A conta só soma modificador de Força
positivo, então o mínimo real é 10.

### Texto e termos

**23. Restos de migração.** "Onde algum texto antigo disser médio", "o valor
antigo chamado Dano nas peças veiculares", "índices antigos de chassi", "esta
regra não cria preço para T4 nem altera preços publicados". Um livro pronto
não precisa falar da versão anterior.

**24. Mesma palavra, duas coisas.** "Gravidade" é a escala da queda (0 a 4)
e a da condição (Leve a Gravíssima). "Sanidade" é a barra e também a
perícia. O livro já resolve "Mestre" com uma nota; cabe o mesmo aqui.

**25. Tópicos sem a caixa "Em resumo".** Coreografia, Equipamentos, Rituais
e Selos, Legados e Treinamento são os únicos sem ela.

## Ordem sugerida

1. Itens 1, 9, 10 e 11: são os que mais mudam uma sessão.
2. Itens 2, 3 e 4: uma frase cada.
3. Itens 5 a 8 e 18 a 22: texto, sem mexer em número.
4. O resto quando sobrar tempo.
