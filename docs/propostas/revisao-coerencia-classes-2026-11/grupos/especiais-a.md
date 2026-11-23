# Revisão de coerência: classes especiais, grupo A

Classes: Campeão Dimensional, Pirata Amaldiçoado, Cartista Arcano, Guia Dimensional, Escritor de Contos, Viajante.
Base de comparação: Livro de Regras (núcleo mais os tópicos veiculos, aliados, contatos-lacos, viagem, transporte, perseguicao-a-pe, investigacao, equipamentos, descanso, treinar, poderes-habilidades).

Resumo de contagem

| Classe | ERRO | INCOERÊNCIA | LACUNA | MELHORIA |
|---|---|---|---|---|
| Campeão Dimensional | 0 | 3 | 6 | 3 |
| Pirata Amaldiçoado | 0 | 3 | 5 | 6 |
| Cartista Arcano | 0 | 3 | 5 | 3 |
| Guia Dimensional | 0 | 3 | 6 | 5 |
| Escritor de Contos | 0 | 5 | 4 | 4 |
| Viajante | 1 | 4 | 5 | 4 |

---

> **Nota da conferência:** o `quantidade: 2` do grau de perícia é de propósito. As 12 classes especiais dão dois graus por marco (o Pirata também), e a ficha lê esse campo. O furo está só no Livro, que diz "um degrau" sem citar a exceção. Ver o README.

## Campeão Dimensional (campeao-dimensional)

### [INCOERÊNCIA] rasgar · poder (dano verdadeiro)
- **Hoje:** "Teleporte-se até 15 m e cause 2d10 de dano verdadeiro a uma criatura adjacente ao destino." (Estamina 6, Ação Padrão, sem teste)
- **Livro:** Tipos de dano › Dano verdadeiro: "só aparece quando a fonte escreve com todas as letras 'dano verdadeiro', quase sempre numa habilidade de topo."
- **Problema:** Um poder escolhido a partir do nível 2, de custo baixo e sem teste nenhum, causa o dano que nenhuma Resistência nem redução reduz. O Livro reserva esse tipo a habilidades de topo (aqui só Último Round, nível 20, o usa). Além disso, o texto não diz se precisa ver o destino nem se a criatura tem teste.
- **Correção:** trocar para dano físico de impacto, com Reflexos contra a DT do Campeão Dimensional para metade: "Teleporte-se até 15 m para um ponto que você veja e cause 2d10 de dano de impacto a uma criatura adjacente ao destino. Ela testa Reflexos contra a DT do Campeão Dimensional e sofre metade em sucesso." Se o Pedro quiser manter o dano verdadeiro, subir o requisito (por exemplo, "Nível 12 de Campeão Dimensional") e o custo.
- **Decisão do Pedro?** sim, porque é escolha de poder da classe (dano verdadeiro no nível 2).

### [INCOERÊNCIA] pilar-da-dimensao · acao × descricao
- **Hoje:** acao "Ação Livre" e descrição "ative esta habilidade sem gastar ação".
- **Livro:** Poderes e Habilidades › Como ler a ação: "Toda habilidade e todo poder dizem que ação pedem, numa destas sete."
- **Problema:** "Sem gastar ação" não é uma das sete. O campo diz Ação Livre. O mesmo vale para Arcano Absoluto do Cartista.
- **Correção:** "Uma vez por descanso, ative esta habilidade com uma Ação Livre. Por três rodadas, ..." (o resto igual).
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] progressao · grau_pericia nos níveis 1, 6, 11 e 17 (`quantidade: 2`)
- **Hoje:** cada entrega de Grau de perícia traz `quantidade: 2`.
- **Livro:** Poderes e Habilidades › Grau de perícia: "Um degrau de graça em uma perícia à sua escolha"; tabela da grade: "Grau de perícia | 1, 6, 11 e 17 | 4".
- **Problema:** O Livro fala em um degrau por entrega (4 no total). A classe dá dois por entrega (8). O Pirata Amaldiçoado não tem `quantidade` e dá um. O mesmo ocorre em Cartista, Guia, Escritor e Viajante.
- **Correção:** `quantidade: 1` em todas as entregas, ou, se a intenção é dar dois graus às especiais, declarar isso no tópico Poderes e Habilidades.
- **Decisão do Pedro?** sim, porque pode ser intencional para as classes de "conquista".

### [LACUNA] ultimo-round · habilidade (nível 20)
- **Hoje:** "ao cair a 0 de Vida, permaneça com 1 de Vida e cause 4d12 de dano verdadeiro a inimigos em 6 m; depois, receba 2 Cansaços." (acao Passivo)
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade"; Ferimentos › Vida negativa: "Se o Déficit chegar à sua Vida máxima, você morre na hora, sem teste."
- **Problema:** O dano em área não tem teste nem metade. O texto também não diz se vale quando o golpe já zera a Vida com Déficit igual à Vida máxima, e o campo acao diz Passivo para algo que é gatilho (Reação).
- **Correção:** "Uma vez por descanso, quando um dano levaria você a 0 de Vida, você fica com 1 de Vida, mesmo que o Déficit chegasse à sua Vida máxima. Em seguida, inimigos a até 6 m testam Fortitude contra a DT do Campeão Dimensional e sofrem 4d12 de dano verdadeiro, ou metade em sucesso. Depois, você recebe 2 de Cansaço." acao: "Reação".
- **Decisão do Pedro?** sim, porque mexe no peso do dano verdadeiro e na morte instantânea.

### [LACUNA] avanco · poder
- **Hoje:** "criaturas no caminho testam Reflexos contra a DT do Campeão Dimensional ou sofrem 1d10 e são empurradas 1,5 m." (campo dano "1d10")
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra"; Combate › Provocar reação: sair do alcance andando provoca.
- **Problema:** Não diz o tipo do dano, nem que o sucesso leva metade, e não diz se o avanço provoca reação de quem fica para trás.
- **Correção:** "Avance até 12 m em linha, sem provocar reação. Criaturas no caminho testam Reflexos contra a DT do Campeão Dimensional: em falha, sofrem 1d10 de dano de impacto e são empurradas 1,5 m; em sucesso, sofrem metade e não são empurradas."
- **Decisão do Pedro?** não.

### [LACUNA] soco, impacto, punho · empilhamento no mesmo ataque
- **Hoje:** Soco (+1d12, +2d12 a partir do 8), Impacto (+1d10 até +3d10) e Punho (+4d12) são Ação Livre "antes do ataque" ou "no momento do ataque", cada um com seu custo de Estamina, sem limite entre si.
- **Livro:** Combate › Críticos: "Bônus fixo e dado extra vindos de habilidade, veneno ou efeito externo entram uma vez só."
- **Problema:** Nada impede somar os três no mesmo golpe (até +9d12/10d10 extras), mais Melhor Forma e Pilar. A regra da "uma vez só" fala de crítico, não de empilhar poderes.
- **Correção:** acrescentar em cada um dos três: "Só um desses poderes (Soco, Impacto ou Punho) pode valer por ataque."
- **Decisão do Pedro?** sim, porque define o teto de dano da classe.

### [LACUNA] pisada, avanco, impacto · tamanho do alvo
- **Hoje:** Pisada deixa Caído, Avanço e Impacto empurram (Impacto até 6 m, sem teste).
- **Livro:** Combate › Manobras: "Criatura duas categorias de tamanho maior que você não é agarrada, derrubada nem empurrada sem uma regra que autorize"; Empurrar testa 10 + Fortitude.
- **Problema:** Os efeitos não dizem se respeitam o limite de tamanho. Impacto empurra 6 m sem nenhum teste, enquanto Empurrar comum recua só 1,5 m.
- **Correção:** acrescentar a Pisada, Avanço e Impacto: "Criatura duas categorias de tamanho maior que você não é derrubada nem empurrada." Em Impacto, trocar por "empurre o alvo até 6 m; o alvo testa Fortitude contra a DT do Campeão Dimensional para ficar no lugar."
- **Decisão do Pedro?** não.

### [LACUNA] numero-1 · estágio 1 (Corpo de Campeão)
- **Hoje:** "vantagem em testes contra Cansaço e contra quedas".
- **Livro:** Descanso › Cansaço: o Cansaço sobe por combate intenso, treino e noite em claro, sem teste. Perigos › Queda: Acrobacia contra DT 15 mais ajuste.
- **Problema:** Quase nenhum Cansaço tem teste. Os que têm são clima (Fortitude), esforço longo e aflições. "Testes contra Cansaço" fica vazio.
- **Correção:** "vantagem em Fortitude contra Cansaço de clima ou de esforço e em Acrobacia para cair de pé".
- **Decisão do Pedro?** não.

### [LACUNA] alem-do-comum · opções (+1 em atributo, até +2)
- **Hoje:** "+1 na Força, até o teto de +2 no mesmo atributo." (permanente)
- **Livro:** Sistema Base › Maestria de atributo: "por mérito próprio, sem item, pacto ou efeito temporário segurando o número."
- **Problema:** Não diz se o bônus permanente da classe conta como mérito próprio para chegar a 20 e liberar a maestria.
- **Correção:** acrescentar "O bônus desta habilidade conta como mérito próprio para a maestria de atributo" (ou o contrário, "não conta").
- **Decisão do Pedro?** sim, porque é decisão de regra.

### [MELHORIA] carne-de-diamante, pilar-da-dimensao · ordem da redução
- **Hoje:** Carne de Diamante: "Reduza à metade um dano recebido, antes de aplicar Resistência." Pilar: "reduz em 10 o dano de cada golpe que sofre."
- **Livro:** Tipos de dano › Resistência e ordem: "Role o dano inteiro... Se o alvo for vulnerável, dobre. Tire a Resistência e a redução de dano... A redução de dano vale contra qualquer tipo, menos o dano verdadeiro."
- **Problema:** Funciona, mas falta dizer onde entra. A redução fixa do Pilar deve entrar depois da Resistência e não vale contra dano verdadeiro. A metade de Carne de Diamante deve entrar depois de dobrar por vulnerabilidade.
- **Correção:** Carne de Diamante: "Reduza à metade um dano recebido, depois de dobrar por vulnerabilidade e antes da Resistência." Pilar: "reduz em 10 o dano de cada golpe que sofre, depois da Resistência (não vale contra dano verdadeiro)".
- **Decisão do Pedro?** não.

### [MELHORIA] soco, trono-da-dimensao · "ignora X de Resistência"
- **Hoje:** Soco "ignora 8 de Resistência"; Trono "seus danos físicos ignoram 10 de Resistência".
- **Livro:** Tipos de dano: Resistência vale por tipo; "Resistência física geral cobre todos os danos físicos".
- **Problema:** Soco não diz de que tipo. Trono diz "danos físicos", mas Resistência a Gelo, Fogo etc. aparece em ataques físicos com elemento.
- **Correção:** Soco: "ignora 8 de Resistência do alvo ao tipo de dano do ataque". Trono: "ignoram 10 de Resistência a dano físico".
- **Decisão do Pedro?** não.

### [MELHORIA] impacto, punho · momento
- **Hoje:** momento "no momento do ataque".
- **Livro:** Como ler a ação: "Ação Livre · antes do ataque".
- **Problema:** O Livro usa "antes do ataque". "No momento do ataque" não é descrito. O mesmo valor aparece em Morte e O Sol (Cartista).
- **Correção:** momento "antes do ataque" (Morte e O Sol podem manter "depois do acerto" onde for o caso).
- **Decisão do Pedro?** não.

---

## Pirata Amaldiçoado (pirata-amaldicoado)

### [INCOERÊNCIA] navio-fantasma · poder
- **Hoje:** "invoque um navio espectral... Ele navega sem tripulação, atravessa névoa comum e barreiras mágicas... sem sofrer dano, e desaparece no fim da cena."
- **Livro:** Veículos › Condução e tripulação: "O veículo precisa de um condutor para mudar direção ou velocidade durante combate e perseguição"; "O veículo não recebe ações próprias."
- **Problema:** O navio navega sem tripulação, mas o Livro só deixa um veículo mudar de rumo com condutor. Falta capacidade, deslocamento, quem conduz e o que acontece numa perseguição ou combate naval. Viagem por água usa o veículo.
- **Correção:** "Uma vez por sessão, invoque um navio espectral, que sai da sua mão como veículo de tripulação mínima 1: você ou um aliado o conduz com Pilotagem. Ele leva até [N] ocupantes, nunca sofre dano e desaparece no fim da cena. Atravessa névoa comum e barreiras mágicas que não declarem bloquear seres incorpóreos ou viagem espectral."
- **Decisão do Pedro?** sim, porque falta definir capacidade e deslocamento do navio.

### [INCOERÊNCIA] pele-de-tubarao · escalonamento nível 2
- **Hoje:** "Nível 2: você tem vantagem em Fortitude para resistir a Sangramento."
- **Livro:** Condições › Sangramento: "Remoção: Cura contra a DT Padrão do nível da fonte, com ação padrão, ou qualquer cura de pelo menos 1 PV." Não existe teste de Fortitude contra Sangramento (só nas aflições e na Mutilação).
- **Problema:** A vantagem se apoia num teste que o Livro não tem.
- **Correção:** "Nível 2: o seu Sangramento acaba sozinho no fim do segundo turno seguinte." (ou, mais conservador: "você tem vantagem em Fortitude contra aflições de veneno e sangue").
- **Decisão do Pedro?** sim, porque é mudar o benefício.

### [INCOERÊNCIA] evolucao-abissal · campos × escalonamento (Voz da Fossa, Chamado da Alcateia, Bolsa de Tinta)
- **Hoje:** Voz da Fossa tem acao "Passivo", mas o nível 4 é "use uma Ação Livre... uma vez por cena... Vontade contra a DT da Maldição". Chamado da Alcateia tem alcance "12 m", mas o nível 2 sobe para 24 m. Bolsa de Tinta tem duração "Até o começo do seu próximo turno", mas o nível 3 diz duas rodadas.
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso.
- **Problema:** Os campos estruturados mostram só o nível 1. O nível 4 de Voz da Fossa tem ação, uso e defesa que não aparecem em campo nenhum.
- **Correção:** Voz da Fossa: acrescentar no nível 4 "(Ação Livre, uma vez por cena, alcance 6 m, defesa Vontade contra a DT da Maldição, duração uma rodada)". Os outros dois: citar o valor novo no texto do nível, como já está, e deixar o campo com "(sobe com o nível da mutação)".
- **Decisão do Pedro?** não.

### [LACUNA] casco-de-abismo, corpo-que-o-mar-nao-leva, corpo-encharcado · Resistência e redução somadas
- **Hoje:** Corpo que o Mar Não Leva: Resistência 10 a dano físico. Casco de Abismo nível 2 e 4: Resistência 2 e 5 a dano físico. Corpo Encharcado: reduza em 5 cada dano.
- **Livro:** Tipos de dano › Resistência e ordem: "Tire a Resistência do tipo de dano e a redução de dano, se houver, até o mínimo 0." Não diz se duas fontes de Resistência ao mesmo tipo se somam.
- **Problema:** No nível 20 de classe, com Casco no nível 4, a pessoa teria Resistência 15 a dano físico mais 5 de redução. O Livro não diz se Resistências de fontes diferentes somam.
- **Correção:** deixar escrito em Evolução Abissal: "Resistência de mutação soma com a de outras fontes" (ou "só vale a maior"), conforme a decisão.
- **Decisão do Pedro?** sim, porque depende da regra geral de empilhar Resistências.

### [LACUNA] senhor-das-profundezas · habilidade final
- **Hoje:** "tempestade de 12 m de raio ao seu redor... No começo do próprio turno, cada inimigo na área testa Fortitude... em falha, sofre 4d12 de dano de Água e fica Caído."
- **Livro:** Magia e Fluxo / convenção de zona: "zona testa no começo do turno"; Combate › Manobras: criatura duas categorias maior não é derrubada.
- **Problema:** Não diz se a tempestade acompanha você ou fica no ponto. Quem falha todo turno fica Caído de novo e gasta a Ação de Movimento para levantar (um bloqueio permanente). Falta o limite de tamanho para Caído.
- **Correção:** "A tempestade fica no ponto onde você estava ao usá-la." Acrescentar: "Uma criatura Caída pela tempestade só testa de novo depois de levantar. Criatura duas categorias maior não fica Caída."
- **Decisão do Pedro?** sim, porque muda a força do efeito.

### [LACUNA] presas-do-fundo · mutação
- **Hoje:** "A mordida usa Luta e causa 1d8 de perfuração."
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força, com crítico 20/x2."
- **Problema:** Não diz se soma Mod. Força nem a margem e o multiplicador crítico da mordida.
- **Correção:** "A mordida usa Luta e causa 1d8 de perfuração + Mod. Força, crítico 20/x2."
- **Decisão do Pedro?** não.

### [LACUNA] garras-do-abismo · poder
- **Hoje:** "Seu próximo ataque causa +1d10 de dano."
- **Livro:** Combate › Críticos: dado extra "entra uma vez só".
- **Problema:** O tipo do dano extra não aparece.
- **Correção:** "causa +1d10 de dano do mesmo tipo do ataque."
- **Decisão do Pedro?** não.

### [LACUNA] ancora-maldita, mare-profana · tamanho
- **Hoje:** Âncora Maldita puxa o inimigo sem teste de tamanho; Maré Profana empurra 6 m.
- **Livro:** Combate › Manobras: criatura duas categorias maior não é empurrada.
- **Problema:** Os dois movimentos forçados ignoram o limite de tamanho.
- **Correção:** acrescentar "Criatura duas categorias de tamanho maior que você não é puxada nem empurrada."
- **Decisão do Pedro?** não.

### [MELHORIA] corpo-encharcado · redução de dano
- **Hoje:** "reduza em 5 cada dano que sofrer".
- **Livro:** Tipos de dano › Resistência e ordem: a redução entra depois da Resistência e não vale contra dano verdadeiro.
- **Problema:** Funciona, só falta o lugar na conta.
- **Correção:** "reduza em 5 cada dano que sofrer, depois da Resistência (não vale contra dano verdadeiro)".
- **Decisão do Pedro?** não.

### [MELHORIA] mare-que-corta, capitao-dos-condenados · −2 de Defesa
- **Hoje:** "O alvo também sofre −2 de Defesa até o seu próximo turno." / "inimigos a até 6 m sofrem −2 de Defesa."
- **Livro:** Condições › Exposto: "Defesa reduzida em 2. Não acumula consigo mesmo. Termina no começo do próximo turno."
- **Problema:** É a condição Exposto escrita à mão. Usar o nome liga o texto ao Livro e evita acúmulo ambíguo (o texto de Maré já diz que repetir só renova).
- **Correção:** Maré que Corta: "O alvo fica Exposto até o seu próximo turno." Capitão: "inimigos a até 6 m ficam Expostos por duas rodadas."
- **Decisão do Pedro?** não.

### [MELHORIA] tripulacao-dos-condenados · dano do espectro
- **Hoje:** "ele causa 1d6 de dano de Água a uma criatura adjacente escolhida por você" (sem teste, toda vez que desaparece, inclusive ao fim das três rodadas).
- **Livro:** convenção de dano de gatilho (teste e metade no sucesso).
- **Problema:** Dano automático de 1d6 por espectro, também quando eles somem por tempo. Sem teste, a convenção não se aplica.
- **Correção:** "Reflexos contra a DT da Maldição para sofrer metade", ou "o dano só ocorre quando o espectro desaparece ao receber um golpe".
- **Decisão do Pedro?** sim, porque é ajuste de equilíbrio.

### [MELHORIA] sangue-gelado, sangue-de-enguia · grafia dos tipos
- **Hoje:** "dano de frio e de gelo", "dano de raio", "dano de fogo".
- **Livro:** Tipos de dano › Dano de ambiente: Frio e Calor (ambiente); Gelo e Fogo (golpe); Raio é elemento.
- **Problema:** Os nomes de tipo no Livro vão com maiúscula. Sangue Gelado cobre as duas coisas (Frio de clima e Gelo de golpe), o que faz sentido, mas conviria dizer que vale para o clima. Nível 3 repete isso ("não fica Cansado por ambientes gelados").
- **Correção:** "Você recebe Resistência 10 a dano de Frio (clima) e de Gelo (golpe)." "Resistência 5 a dano de Raio."
- **Decisão do Pedro?** não.

### [MELHORIA] dt_efeitos, sussurros-do-fundo · DT da Maldição
- **Hoje:** dt_efeitos "Quando uma habilidade sua pedir um teste..." e Sussurros "+2 em Intimidação e Enganação".
- **Livro:** Poderes e Habilidades (poderes e habilidades usam a mesma DT).
- **Problema:** Vários poderes também pedem teste e usam essa DT. Como a DT é a rolagem de Intimidação, o +2 de Sussurros sobe a DT de tudo sem estar escrito.
- **Correção:** "Quando uma habilidade ou poder seu pedir um teste..." e, em Sussurros, "(o bônus de Intimidação também vale para a DT da Maldição)" se a intenção for essa.
- **Decisão do Pedro?** sim, porque o efeito sobre a DT é bônus de poder.

### [MELHORIA] fúria-da-mare · nome da fúria
- **Hoje:** "entrar em fúria por três rodadas".
- **Livro:** Condições › Crises: Fúria é uma crise de Sanidade com −2 de Defesa e +2 de dano corpo a corpo.
- **Problema:** O texto usa o mesmo nome de uma crise com efeito diferente.
- **Correção:** "entrar em fúria" pode virar "entrar em Maré Alta" (só o texto, não o id).
- **Decisão do Pedro?** não.

---

## Cartista Arcano (cartista-arcano)

### [INCOERÊNCIA] progressao · grau_pericia (`quantidade: 2`)
- Mesmo achado do Campeão Dimensional: Livro "Um degrau", classe dá 2 por entrega nos níveis 1, 6, 11 e 17.
- **Correção:** `quantidade: 1` ou declarar a exceção no Livro. **Decisão do Pedro?** sim.

### [INCOERÊNCIA] dados-viciados · termo "desastre"
- **Hoje:** "Um 20 ou 1 natural trocado deixa de ser crítico ou desastre."
- **Livro:** Perícias › Graus de resultado: "Falha crítica: o d20 mostra 1 natural."
- **Problema:** "Desastre" não é termo do Livro. A mesma palavra está em Página Rasgada (Escritor).
- **Correção:** "Um 20 ou 1 natural trocado deixa de ser sucesso crítico ou falha crítica." Acrescentar: "Com vantagem ou desvantagem, escolha qual dos dois dados trocar."
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] arcano-absoluto · acao × descricao
- **Hoje:** acao "Ação Livre", descrição "ative esta habilidade sem gastar ação".
- **Livro:** as sete ações; ver o mesmo achado em Pilar da Dimensão.
- **Correção:** "Uma vez por descanso, use uma Ação Livre."
- **Decisão do Pedro?** não.

### [LACUNA] arcano-absoluto · margem de crítico e cartas por turno
- **Hoje:** "você joga duas cartas em cada turno... Ataques de carta (arremessos e magias de ataque) obtêm acerto crítico com 19 ou 20 natural."
- **Livro:** Combate › Críticos: "Efeito de classe... que alarga a margem só alarga em arma x2. Em arma x3 ou x4, cada passo vira +1 dado"; Magia e Fluxo › Ataque e resistência: magia de ataque "o 20 natural é crítico", sem multiplicador de arma.
- **Problema:** Cartas Afiadas diz "crítico no 20" sem multiplicador. Para valer a regra da margem é preciso dizer que é x2. Magia de ataque não tem multiplicador de arma. E "joga duas cartas por turno" não diz quanto da ação cada magia consome (magias de Ação Padrão e Ação Completa continuariam sem caber).
- **Correção:** em Cartas Afiadas: "crítico 20/x2". Em Arcano Absoluto: "...obtêm crítico com 19 ou 20 natural (a carta arremessada segue 19-20/x2). Você pode jogar duas cartas por turno, gastando a Ação Padrão e a Ação de Movimento do turno, uma em cada; cartas de Ação Completa contam como as duas."
- **Decisão do Pedro?** sim, porque depende de como o Pedro quer o fluxo de ações da classe.

### [LACUNA] cartas-afiadas · ação do arremesso
- **Hoje:** "ataque de Pontaria, alcance de 9 m, dano de Corte, crítico no 20 e nenhum custo de Mana."
- **Livro:** Combate › Seu turno: atacar é Ação Padrão.
- **Problema:** Falta a ação (Ação Padrão por padrão), e o 2d8 + Mod. Fluxo do último estágio não diz por que só ele soma modificador.
- **Correção:** "ataque de Pontaria com Ação Padrão, alcance 9 m, dano de corte, crítico 20/x2..."
- **Decisão do Pedro?** não.

### [LACUNA] carta-na-manga, roda-da-fortuna · momento e janela
- **Hoje:** Carta na Manga: Ação Livre, "dê +1d4 a um teste seu ou de aliado a 9 m antes da rolagem". Roda da Fortuna: Ação Livre, "rerrole um d20 seu que resultou 1".
- **Livro:** Combate › Seu turno: "Ação Livre: um gesto, uma fala curta... Não realiza testes... salvo quando uma regra específica permitir." Dados Viciados da mesma classe usa Reação.
- **Problema:** As duas agem na rolagem de outra pessoa ou depois do dado, muitas vezes fora do turno do Cartista. Ação Livre é ação do próprio turno. Falta `momento`.
- **Correção:** Carta na Manga: acao "Ação Livre", momento "antes da rolagem, mesmo fora do seu turno". Roda da Fortuna: momento "depois da rolagem".
- **Decisão do Pedro?** sim, porque define se funciona fora do turno.

### [LACUNA] morte · poder
- **Hoje:** "Contra um alvo abaixo de 10% da Vida, uma carta causa dano máximo."
- **Livro:** Ferimentos usa Vida máxima em percentuais.
- **Problema:** Não diz 10% de quê.
- **Correção:** "abaixo de 10% da Vida máxima".
- **Decisão do Pedro?** não.

### [LACUNA] o-sol · poder
- **Hoje:** "Uma carta deixa o alvo Queimando."
- **Livro:** Magia e Fluxo: "O alvo só segue queimando quando o texto diz que ele fica Queimando"; Condições › Queimando.
- **Problema:** Não diz se exige acerto. Com magia de ataque que erra, o Queimando não deveria entrar.
- **Correção:** "Se a carta acertar, o alvo fica Queimando até apagar."
- **Decisão do Pedro?** não.

### [MELHORIA] mao-inicial · bônus de Misticismo
- **Hoje:** "Receba +2 em Misticismo, Percepção e Enganação ao usar o baralho como foco."
- **Livro:** Magia e Fluxo › Teste e DT: o bônus de habilidade entra no teste de conjuração quando a habilidade diz.
- **Problema:** O +2 em Misticismo não diz se vale no teste de conjuração.
- **Correção:** "+2 em Misticismo (inclusive no teste de conjuração), Percepção e Enganação..."
- **Decisão do Pedro?** sim, porque é bônus fixo na conjuração.

### [MELHORIA] cartas-afiadas · naipes
- **Hoje:** naipes com `duracao "Este combate"` e "+1d4 de fogo"; Ouros "empurram o alvo em 1,5 m".
- **Livro:** Poderes e Habilidades: "Por cena... Um combate inteiro é uma cena." Tipos de dano: Fogo com maiúscula.
- **Problema:** Só vocabulário e tamanho de alvo.
- **Correção:** duracao "Uma cena"; "+1d4 de Fogo"; Ouros: "empurram o alvo em 1,5 m (criatura duas categorias maior não é empurrada)".
- **Decisão do Pedro?** não.

### [MELHORIA] mago, mesa-posta, arcano-absoluto · redução de custo empilhada
- **Hoje:** Mago "reduza em 1 o custo das cartas, mínimo 1"; Mesa Posta "custa 1 de Mana a menos (mínimo 1)"; Arcano Absoluto "custa 0".
- **Livro:** Magia e Fluxo: a Mana sai ao declarar; não há regra de empilhar reduções.
- **Problema:** A ordem e o mínimo ficam ambíguos quando os três valem juntos.
- **Correção:** "Reduções de custo de carta somam, e o mínimo continua 1, exceto o 0 de Arcano Absoluto."
- **Decisão do Pedro?** não.

---

## Guia Dimensional (guia-dimensional)

### [INCOERÊNCIA] progressao · grau_pericia (`quantidade: 2`)
- Mesmo achado do Campeão. **Decisão do Pedro?** sim.

### [INCOERÊNCIA] atalho-coletivo · duração × turno
- **Hoje:** "Até três aliados a 9 m ganham +6 m de Movimento neste turno sem provocar reações de movimento." (Ação Livre, duração "Este turno")
- **Livro:** Combate › Provocar reação: "sem provocar reação".
- **Problema:** O poder é usado no turno do Guia, mas os aliados se movem no turno deles. "Neste turno" deixa o bônus sem efeito. E o termo do Livro é "provocar reação".
- **Correção:** "Até três aliados a 9 m ganham +6 m de Movimento até o fim do próximo turno de cada um, e esse movimento não provoca reação." duracao "Até o próximo turno de cada um".
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] ancora-compartilhada · opção
- **Hoje:** "Um aliado que toque essa âncora pode usá-la como destino das suas próprias passagens, como se fosse dele."
- **Livro:** Poderes e Habilidades (cada um usa o que tem).
- **Problema:** O aliado não tem passagens. "Suas" e "dele" apontam para pessoas diferentes.
- **Correção:** "Um aliado que toque essa âncora pode usá-la como destino das passagens que o Guia abrir para levá-lo."
- **Decisão do Pedro?** não.

### [LACUNA] passagem-em-grupo · estágio 15
- **Hoje:** "Leve até dois aliados ao usar passagens próprias, e a passagem passa a custar 1 de Mana por aliado levado."
- **Livro:** Combate › Provocar reação: teleportar não provoca; Magia e Fluxo: Fronteira selada.
- **Problema:** Não diz quais passagens valem (Passagem Curta, Passo Vetorial, Corredor da Matriz) nem que Passagem Curta, que não custava Mana, passa a custar. Não diz se os aliados precisam ser voluntários e adjacentes.
- **Correção:** "Ao usar Passagem Curta ou Passo Vetorial, leve consigo até dois aliados voluntários a até 1,5 m, pagando 1 de Mana por aliado."
- **Decisão do Pedro?** sim, porque redefine o custo da Passagem Curta.

### [LACUNA] ancora-de-emergencia · opção
- **Hoje:** "quando você cai a 0 de Vida, seja transportado na hora para essa âncora, se ela ainda existir."
- **Livro:** Ferimentos › Vida negativa: Déficit igual à Vida máxima mata na hora; Magia e Fluxo › Termos: Mesma dimensão e Fronteira selada.
- **Problema:** Não diz se funciona contra o golpe que mata na hora, nem se a âncora pode estar em outra dimensão (o Livro diz que só o Passo de Órbita leva de uma Árvore a outra), nem em que estado você chega.
- **Correção:** "Uma vez por descanso, quando você cair a 0 de Vida sem morrer na hora, você é transportado para essa âncora, se ela estiver na mesma dimensão e a fronteira não estiver selada. Você chega com 0 de Vida e Morrendo 1."
- **Decisão do Pedro?** não.

### [LACUNA] cartografia-da-matriz, caminho-impossivel, passagem-em-grupo · Mal do Interstício
- **Hoje:** nenhuma habilidade fala da aflição.
- **Livro:** Aflições › Mal do Interstício: "Exposição: Atravessar entre Galhos sem guia dimensional ou âncora, ou passar uma hora no Interstício."
- **Problema:** O Livro descreve exatamente o que o Guia Dimensional e as âncoras resolvem, mas a classe não diz que protege o grupo.
- **Correção:** em Passagem em Grupo e Caminho Impossível: "Quem atravessa com você não sofre exposição ao Mal do Interstício por essa travessia."
- **Decisão do Pedro?** sim, porque dá um benefício novo.

### [LACUNA] caminho-impossivel · habilidade final
- **Hoje:** "Uma vez por sessão, use uma Ação Completa para abrir por três rodadas um portal até um local conhecido na mesma dimensão ou até uma âncora dimensional ativa em outra dimensão... Selos e efeitos que bloqueiem viagem dimensional impedem a abertura."
- **Livro:** Transporte: rota entre dimensões "exige um Portal Dimensional disponível" mais a taxa de 500 Lunaris; Magia e Fluxo › Termos: "Lugar conhecido", "Fronteira selada".
- **Problema:** Não diz se dispensa o Portal Dimensional e a taxa. Os termos do Livro são "lugar conhecido" e "Fronteira selada". "Por sessão" num portal que dura três rodadas, usável em combate, também mereceria decisão.
- **Correção:** "...até um lugar conhecido na mesma dimensão ou até uma âncora sua ativa em outra dimensão. Isso dispensa o Portal Dimensional e a taxa de acesso. Uma Fronteira selada impede a abertura."
- **Decisão do Pedro?** sim, porque mexe no custo de Transporte.

### [LACUNA] ancora-oculta · opção
- **Hoje:** "só pode ser percebida ou localizada por magia se o observador testar Percepção contra a DT do Guia Dimensional."
- **Livro:** Perícias: Ressonância "Sentir Fluxos, identificar interferências"; Investigação: "Misticismo ou Ressonância | O rastro de uma magia".
- **Problema:** Localizar por magia não se resolve com Percepção. A perícia certa é Ressonância ou Misticismo.
- **Correção:** "só pode ser percebida ou localizada se o observador testar Ressonância ou Misticismo contra a DT do Guia Dimensional."
- **Decisão do Pedro?** sim, porque troca a perícia.

### [LACUNA] selar-portal · poder
- **Hoje:** "Faça Misticismo contra a DT de conjuração de quem abriu o portal (DT 20, se ele for natural)."
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: número solto vale como DT do nível 1; a DT de conjuração sobe com o círculo.
- **Problema:** DT 20 fixa fica baixa em nível alto e não diz de que círculo falar.
- **Correção:** "contra a DT de conjuração de quem abriu o portal; num portal natural, contra a DT Difícil do nível do lugar."
- **Decisão do Pedro?** não.

### [MELHORIA] dobra-esmagadora · dano de queda
- **Hoje:** "reaparece 3 m acima... cai, sofre 2d6 de dano de impacto e fica Caída."
- **Livro:** Perigos › Queda: "1d6 de impacto a cada 3 m"; "Quem cai fica Caído."
- **Problema:** 3 m seriam 1d6. O texto dá 2d6 e também diz "cai", o que pode somar com o dano da queda.
- **Correção:** "reaparece 3 m acima e cai. Em vez do dano de queda, sofre 2d6 de dano de impacto e fica Caída."
- **Decisão do Pedro?** não.

### [MELHORIA] norte-sempre, bussola-do-vazio · Viagem
- **Hoje:** "nunca se perde em ambientes naturais ou masmorras que já mapeou"; Bússola: "Você não fica perdido por meios mundanos."
- **Livro:** Viagem › Papéis: "Guia | Sobrevivência contra a DT do terreno"; Exploração: Mapear.
- **Problema:** Os dois dizem quase a mesma coisa, e nenhum fala a língua de Viagem (papel de Guia, Mapear).
- **Correção:** Norte Sempre: acrescentar "Quando você faz o papel de Guia, o dia rende como se o teste tivesse passado em terreno Fácil ou Ermo." Bússola do Vazio: "Você percebe mudança de dimensão" (tirar a parte repetida).
- **Decisão do Pedro?** sim, porque dá vantagem em Viagem.

### [MELHORIA] janela-remota, ancora-de-vigia, corredor-da-matriz
- **Hoje:** Janela Remota "por um minuto, veja e ouça através de uma âncora"; Âncora de Vigia faz parecido por Ação Padrão; Corredor da Matriz "dois portais... atravessá-los custa 3 m".
- **Livro:** Condições › Concentrando: "Só pode manter um efeito de concentração por vez."
- **Problema:** Não diz se Janela Remota é concentração, e se sobrepõe a Âncora de Vigia. Corredor não diz quem pode atravessar (inimigos também?).
- **Correção:** Janela Remota: "(concentração)". Corredor da Matriz: "Só você e aliados voluntários atravessam."
- **Decisão do Pedro?** não.

### [MELHORIA] ancora-de-retorno · nome
- **Hoje:** "Âncora de Retorno... Volte à posição que ocupava no começo do turno, se estiver livre."
- **Problema:** Compete com os tipos de Âncora da habilidade Âncoras, e não diz de qual turno.
- **Correção:** só o título, por exemplo "Passo Atrás", e "no começo do seu turno".
- **Decisão do Pedro?** não.

### [MELHORIA] mapa-vivo · ação
- **Hoje:** acao "Ação Livre".
- **Livro:** Poderes e Habilidades: "Fora de combate" para o que é de história e informação.
- **Correção:** acao "Fora de combate".
- **Decisão do Pedro?** não.

---

## Escritor de Contos (escritor-de-contos)

### [INCOERÊNCIA] progressao · grau_pericia (`quantidade: 2`)
- Mesmo achado do Campeão. **Decisão do Pedro?** sim.

### [INCOERÊNCIA] personagens-recorrentes · Guarda-Costas
- **Hoje:** "Aparece para ajudar numa cena de combate. Usa a ficha de um humanoide do Bestiário com VD igual à metade do seu nível de Escritor... age logo depois de você e some no fim da cena ou ao chegar a 0 de Vida."
- **Livro:** Contatos e Laços: "Contato não luta pelo grupo (isso é Aliado)." Aliados › Aliado em combate: o aliado age na iniciativa dele; "A exceção são as invocações do Invocador."
- **Problema:** A habilidade diz que o contato é uma pessoa registrada, mas faz o que o Livro reserva a Aliado. A iniciativa "logo depois de você" também contradiz a regra geral (só o Invocador). E "metade do nível" não diz como arredondar.
- **Correção:** "Guarda-Costas: uma vez por sessão, o contato chega como Aliado temporário, com a ficha de um humanoide do Bestiário de VD igual à metade do seu nível de Escritor, arredondado para baixo, mínimo 1. Ele age na iniciativa dele, e some no fim da cena ou ao chegar a 0 de Vida."
- **Decisão do Pedro?** sim, porque a exceção de "age logo depois" é do Invocador.

### [INCOERÊNCIA] pagina-rasgada · termo "desastres"
- **Hoje:** "Críticos e desastres também podem mudar."
- **Livro:** Perícias: "Falha crítica".
- **Correção:** "Sucessos críticos e falhas críticas também podem mudar."
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] prenuncio · "defesa" como rolagem
- **Hoje:** "Escolha ataque, defesa ou perícia; um aliado recebe +2 na próxima rolagem desse tipo."
- **Livro:** Combate › Defesas passivas: a Defesa funciona sozinha; só se rola ataque, resistência e perícia.
- **Problema:** Não existe "rolagem de defesa".
- **Correção:** "Escolha ataque, resistência (Fortitude, Reflexos ou Vontade) ou perícia; um aliado recebe +2 na próxima rolagem desse tipo nesta cena."
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] ultimo-capitulo · acao × parte "fora de combate"
- **Hoje:** acao "Ação Padrão", mas a descrição termina com a escrita da Entidade nova, "fora de combate".
- **Livro:** Como ler a ação: "Fora de combate" é uma das sete e leva `momento`.
- **Problema:** A habilidade tem duas partes, uma de combate e uma de história, sob uma ação só.
- **Correção:** separar em texto: "Em combate: Ação Padrão... Fora de combate (momento: 'quando a história pedir'): escreva com o Mestre o conto de uma Entidade nova..."
- **Decisão do Pedro?** não.

### [LACUNA] personagens-recorrentes · como entra em Contatos
- **Hoje:** "Registre um contato real por estágio. Uma vez por sessão, um deles pode oferecer informação ou ajuda plausível se puder ser contatado."
- **Livro:** Contatos e Laços: até 2 + Mod.Carisma contatos; Confiança de 1 a 3; favor grande pede Amigo, teste e deixa Dívida; ramos Informação, Passagem, Mercadoria, Proteção e Ofício.
- **Problema:** Não diz se esses quatro contatos contam no limite, que Confiança têm, nem se deixam Dívida. Os arquétipos não dizem a que ramo pertencem. Contrabandista ("passagem difícil de achar") pode substituir o contato exigido em Transporte (Sair da Árvore), sem preço.
- **Correção:** "Os contatos desta habilidade não contam no limite de contatos, nascem com Confiança 2 (Amigo) e o favor do dia não deixa Dívida. Informante: ramo Informação. Curandeiro: ramo Ofício. Contrabandista: ramo Mercadoria ou Passagem, e o preço vem da Loja ou do Transporte." Para Sair da Árvore: "não substitui o contato exigido em Transporte".
- **Decisão do Pedro?** sim, porque define economia de contatos.

### [LACUNA] curandeiro · arquétipo
- **Hoje:** "Estabiliza ou cura um aliado fora de combate."
- **Livro:** Ferimentos › Tratar ferimentos: Cura contra a DT Padrão do nível do paciente, 1d6 de Vida ou um décimo da Vida máxima; uma vez por pessoa por descanso curto.
- **Problema:** Não diz quanto cura nem se limita por descanso, nem a DT de estabilizar.
- **Correção:** "Trata um aliado fora de combate como Tratar ferimentos (1d6 ou um décimo da Vida máxima, o que for maior) ou estabiliza quem está Morrendo, sem teste."
- **Decisão do Pedro?** não.

### [LACUNA] metafora-cortante · poder
- **Hoje:** "Ataque a Vontade de um alvo a 12 m; cause 1d6 de dano mental, que tira Sanidade, e −2 no próximo teste dele em caso de acerto."
- **Livro:** Tipos de dano › Mental: "tira Sanidade quando ataca a mente pelo lado emocional ou existencial, e Mana quando ataca diretamente o canal mágico... dados pequenos"; Condições › Sanidade: "Sucesso corta pela metade".
- **Problema:** "Ataque a Vontade" não é uma rolagem do Livro. O dano mental é de dado pequeno (1d6 está certo), mas falta dizer o que acontece com criatura sem barra de Sanidade, e o sucesso não leva metade como na convenção.
- **Correção:** "O alvo testa Vontade contra a DT do Escritor de Contos. Em falha, perde 1d6 de Sanidade (dano mental; se não tem barra de Sanidade, perde 1d6 de Mana) e sofre −2 no próximo teste. Em sucesso, perde metade e não sofre o −2."
- **Decisão do Pedro?** sim, porque define criatura sem Sanidade.

### [LACUNA] paragrafo-de-protecao · poder
- **Hoje:** "Um aliado recebe 10 de Vida temporária por uma cena."
- **Livro:** Frutos e Implantes cita "Vida temporária", mas nenhum tópico define como ela funciona.
- **Problema:** Não diz se absorve dano antes da Vida, se acumula, nem se ignora Resistência. Além disso, 10 fixo não cresce com o nível.
- **Correção:** "Um aliado recebe Vida temporária igual ao seu nível de Escritor mais 5, até o fim da cena. Ela é perdida primeiro e não acumula com outra Vida temporária."
- **Decisão do Pedro?** sim, porque falta regra geral de Vida temporária.

### [MELHORIA] epilogo · cura em dado fixo
- **Hoje:** "até três aliados a 9 m recuperam 1d6 de Vida e 1d4 de Mana ou de Estamina."
- **Livro:** Descanso: a recuperação "é em porcentagem, então vale o mesmo no nível 3 e no nível 30"; Tratar ferimentos usa "um décimo da Vida máxima".
- **Problema:** Dado fixo some em níveis altos.
- **Correção:** "recuperam um décimo da Vida máxima e um décimo da Mana ou da Estamina máxima, à escolha de cada um."
- **Decisão do Pedro?** sim, porque é equilíbrio.

### [MELHORIA] montagem · horas e cenas
- **Hoje:** "O grupo conclui em metade do tempo uma tarefa mundana de até uma hora, mas todos gastam 2 Mana." (Ação Livre)
- **Livro:** Viagem › Exploração: um turno é uma hora e "cada personagem faz uma coisa"; Descanso › Relaxar: uma hora em segurança, uma vez entre descansos.
- **Problema:** Meia hora de tarefa permite duas ações por turno de Exploração e pode encurtar Relaxar.
- **Correção:** acao "Fora de combate", e acrescentar "Não vale para Relaxar, treino nem fabricação. Em Exploração, conta como uma ação do turno."
- **Decisão do Pedro?** sim, porque mexe em ritmo de Exploração.

### [MELHORIA] revisao, pressagio, primeira-linha · limites e momento
- **Hoje:** Revisão "ao falhar num teste relacionado"; Presságio sem limite de uso; Primeira Linha "Escreva um Motivo após descanso" com ação Ação Livre.
- **Livro:** Como ler a ação e o limite de uso (a escolha de descanso aparece como "Fora de combate · escolhido no descanso completo").
- **Problema:** "Relacionado" não diz com o quê (os Motivos). Presságio "transforma um Motivo", então se gasta, mas não diz. Primeira Linha mistura a escrita no descanso com o +1d4 da cena.
- **Correção:** Revisão: "ao falhar num teste coberto por um dos seus Motivos". Presságio: "O Motivo se gasta até o próximo descanso." Primeira Linha: separar "Fora de combate (escolhido no descanso completo): escolha o Motivo" e "Ação Livre, uma vez por cena: +1d4".
- **Decisão do Pedro?** não.

---

## Viajante (viajante-classe)

### [ERRO] carona · poder
- **Hoje:** "Até três aliados acompanham seu deslocamento de viagem sem sofrer a primeira penalidade de ritmo acelerado (Transporte, nas Regras)." (Ação Padrão, Estamina 4)
- **Livro:** Viagem › Ritmo: "Forçado: No fim do dia, Fortitude contra a DT Padrão do nível do grupo ou 1 de Cansaço." Transporte trata de passagens pagas, não de ritmo.
- **Problema:** O termo "ritmo acelerado" não existe (o ritmo é Forçado) e a remissão aponta para o tópico errado. "Ação Padrão" não se aplica a um dia de viagem.
- **Correção:** acao "Fora de combate", momento "no fim do dia de viagem". Texto: "Até três aliados que viajam com você dispensam o teste de Fortitude do ritmo Forçado (Viagem) no fim do dia."
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] progressao · grau_pericia (`quantidade: 2`)
- Mesmo achado do Campeão. **Decisão do Pedro?** sim.

### [INCOERÊNCIA] conversa-de-estrada, historia-de-taverna · acao × tempo
- **Hoje:** Conversa de Estrada: "Converse por um minuto" com acao "Ação Livre". História de Taverna: troca de notícias com acao "Ação Livre".
- **Livro:** Como ler a ação: "Fora de combate" leva `momento`; Ação Livre é "um gesto, uma fala curta".
- **Correção:** Conversa de Estrada: acao "Fora de combate", momento "um minuto". História de Taverna: acao "Fora de combate", momento "durante a conversa".
- **Decisão do Pedro?** não.

### [INCOERÊNCIA] dormir-em-qualquer-lugar · poder
- **Hoje:** "Um descanso em abrigo improvisado conta como adequado, salvo ambiente letal."
- **Livro:** Descanso › Descanso completo: qualidades Péssima, Ruim, Boa, Maravilhosa e Excelente; Perigos › Clima: "Dormir sem abrigo no Severo ou pior conta como exposição severa: o descanso fica Péssimo."
- **Problema:** "Adequado" não é uma qualidade do Livro, e "ambiente letal" não é termo.
- **Correção:** "Um descanso em abrigo improvisado conta como qualidade Boa, se você tem comida e água, mesmo no clima Severo. Não vale no Extremo nem no Mortal."
- **Decisão do Pedro?** sim, porque troca o efeito.

### [INCOERÊNCIA] travessia-livre · "selos divinos"
- **Hoje:** "não ignora selos divinos nem chega a local desconhecido."
- **Livro:** Magia e Fluxo › Termos: "Fronteira selada: Um limite fechado por magia ou pelo próprio mundo... Teleporte, portal e dobra não atravessam"; "Lugar conhecido".
- **Problema:** "Selos divinos" confunde com Selos (item). "Local desconhecido" é "lugar desconhecido" no Livro. Também não diz como a habilidade conversa com Viagem (testes do Guia).
- **Correção:** "o grupo atravessa uma fronteira ou obstáculo de viagem conhecido sem rolagem, como se o Guia tivesse passado no teste do terreno. Não atravessa uma Fronteira selada nem leva a um lugar desconhecido."
- **Decisão do Pedro?** não.

### [LACUNA] sem-fronteiras · habilidade final
- **Hoje:** "ficam imunes a dano e condições causados apenas pelo ambiente."
- **Livro:** Perigos do ambiente: queda, fôlego, fome e sede, clima, armadilhas. Tipos de dano › Dano de ambiente: Frio e Calor.
- **Problema:** "Dano do ambiente" pode ser lido como queda, afogamento, lava e armadilha. Também falta alcance para os cinco aliados.
- **Correção:** "ficam imunes a dano de ambiente (Frio e Calor), a dano de queda e a Cansaço de clima. Armadilhas, criaturas e dano mágico seguem valendo. Os aliados precisam estar a até 12 m."
- **Decisão do Pedro?** sim, porque delimita a imunidade.

### [LACUNA] companheiros-de-jornada · habilidade
- **Hoje:** "até três aliados ignoram Cansaço e penalidades de viagem por uma cena; os pontos de Cansaço continuam registrados."
- **Livro:** Descanso › Cansaço: nível 6 "Colapso | Inconsciente até reduzir Cansaço."
- **Problema:** "Ignorar Cansaço" inclui o Colapso (Inconsciente)? "Penalidades de viagem" não é termo do Livro (Viagem tem ritmo Forçado, clima, fome e sede).
- **Correção:** "ignoram as penalidades do Cansaço, menos o Colapso, e o teste de Fortitude do ritmo Forçado, por uma cena."
- **Decisão do Pedro?** sim, porque é decisão de teto.

### [LACUNA] pele-de-estrada, rota-conhecida · estágios 5 e 15
- **Hoje:** "Ignore a primeira penalidade ambiental mundana de cada cena e mantenha um contato em duas regiões." / "Resistência 5 a frio e a calor, vantagem contra ambientes tóxicos."
- **Livro:** Perigos › Clima e Fôlego; Tipos de dano: Frio e Calor; Contatos e Laços: limite de 2 + Mod.Carisma; gás é aflição.
- **Problema:** "Penalidade ambiental" não é termo do Livro. "Ambientes tóxicos" também não, e o gás venenoso é aflição. O contato não diz se conta no limite.
- **Correção:** Rota Conhecida: "ignore o primeiro teste de clima da cena e mantenha um contato Conhecido em duas regiões, que não conta no limite de contatos." Pele de Estrada: "Resistência 5 a dano de Frio e de Calor (clima) e vantagem em Fortitude contra aflições de gás, fumaça e poeira."
- **Decisão do Pedro?** não.

### [LACUNA] horizonte-aberto · poder
- **Hoje:** "vantagem em testes de Sobrevivência para não se perderem e contra efeitos de confinamento."
- **Livro:** Condições › Claustrofobia: Vontade DT 12; Imobilizado.
- **Problema:** Confinamento não se resolve com Sobrevivência.
- **Correção:** "vantagem em Sobrevivência para não se perder e em Vontade contra Claustrofobia e medo de lugar fechado."
- **Decisão do Pedro?** não.

### [LACUNA] passaporte-entre-mundos · viagem entre dimensões
- **Hoje:** a classe "vive viajando entre Árvores e dimensões", mas nenhum texto cobre o custo ou o risco.
- **Livro:** Transporte: Portal Dimensional e taxa de 500 Lunaris; Sair da Árvore exige contato; Aflições › Mal do Interstício.
- **Problema:** Não diz se o Viajante dispensa o Portal ou a taxa, nem se se protege do Mal do Interstício ao cruzar sem guia.
- **Correção:** acrescentar em Rota Conhecida ou Pele de Estrada: "Você não sofre exposição ao Mal do Interstício ao atravessar entre Galhos."
- **Decisão do Pedro?** sim, porque dá um benefício novo.

### [MELHORIA] ja-sai-de-pior · duplica Esquiva
- **Hoje:** "receba +4 de Defesa contra ele e, depois do ataque, desloque-se 1,5 m sem provocar reações."
- **Livro:** Combate › Reações: "Esquiva | Antes da rolagem contra você | +4 de Defesa contra um ataque. Se errar, mova 1,5 m sem provocar reação."
- **Problema:** É a Esquiva universal, paga em Mana, com um passo extra mesmo quando o golpe acerta. O texto também usa "reações" no plural.
- **Correção:** "Quando um ataque mirar você, receba +4 de Defesa contra ele e desloque-se 1,5 m, acertando ou não, sem provocar reação. Não soma com Esquiva." (ou trocar o poder por algo que Esquiva não faz).
- **Decisão do Pedro?** sim, porque é redesenho do poder.

### [MELHORIA] ja-vi-isso, mapa-rabiscado, historia-de-taverna, ja-sai-de-pior, conhece-o-terreno · recurso
- **Hoje:** pagos em Mana, mas fazem coisa mundana (rerrolar Percepção, mapa, se esquivar, terreno).
- **Livro:** Sistema Base › Mana e Estamina: "Estamina paga o que o corpo faz... Mana paga o que é místico."
- **Problema:** O Livro liga Mana ao místico. A classe tem 3 de Mana e 2 de Estamina, então talvez seja de propósito.
- **Correção:** manter, ou trocar Já Saí de Pior e Conhece o Terreno para Estamina.
- **Decisão do Pedro?** sim, porque é critério de custo.

### [MELHORIA] farejar-perigo, mapa-rabiscado, refugio-de-emergencia · ligação com o Livro
- **Hoje:** Farejar Perigo "um teste de Sobrevivência" sem DT; Mapa Rabiscado "mapa confiável"; Refúgio "abrigo seguro para um descanso curto".
- **Livro:** Viagem › Mapear: "Com o mapa, a volta não pede teste"; Descanso: "descanso curto" é Relaxar; Clima: "Abrigo de verdade suspende os testes".
- **Correção:** Farejar Perigo: "contra a DT Padrão do nível do lugar". Mapa Rabiscado: "com o mapa, a volta não pede teste". Refúgio: "encontre um abrigo de verdade para você e o grupo fazerem Relaxar".
- **Decisão do Pedro?** não.

### [MELHORIA] mochila-impossivel · palavra "peso"
- **Hoje:** "Carregue cinco espaços adicionais de itens comuns; a mochila não altera peso de objetos enormes."
- **Livro:** Equipamentos › Carga e espaços: capacidade em espaços; "só aumentam sua capacidade quando trazem um número explícito."
- **Correção:** "Sua capacidade de carga aumenta em 5 espaços. Não vale para objetos enormes."
- **Decisão do Pedro?** não.

---

## Padrões que se repetem

1. **`grau_pericia` com `quantidade: 2`** em Campeão, Cartista, Guia, Escritor e Viajante (níveis 1, 6, 11, 17). O Livro diz "um degrau" por entrega. Pirata não declara e dá um.
2. **"Sem gastar ação"** com acao "Ação Livre" (Pilar da Dimensão e Arcano Absoluto). Resolver sempre para Ação Livre.
3. **Ação Livre usada fora do turno ou sobre a rolagem de outro** (Carta na Manga, Roda da Fortuna, Primeira Linha do Escritor) sem `momento`. Considerar Reação ou um `momento` explícito.
4. **Termo "desastre"** em Dados Viciados e Página Rasgada, no lugar de "falha crítica".
5. **Movimento forçado** (empurrar, puxar, derrubar) sem teste e sem o limite de duas categorias de tamanho do Livro: Campeão, Pirata, Cartista (Ouros), Guia (Queda Lateral).
6. **Redução fixa de dano** (Pilar, Corpo Encharcado) sem a posição "depois da Resistência" e sem a exceção do dano verdadeiro.
7. **Dano de gatilho ou de área sem teste/metade** (Último Round, Tripulação dos Condenados, Avanço).
8. **Campos `acao` e `momento` com valores que o Livro não usa** ("no momento do ataque", "dez minutos" sem `Fora de combate`, ações de dia de viagem em Ação Padrão: Carona, Montagem).
9. **Tipos de dano e condições com minúscula** (frio, gelo, fogo, raio) e "−2 de Defesa" onde o Livro tem Exposto.
10. **Termos do Livro de Magia/Viagem fora do padrão**: "local conhecido" (lugar), "selos divinos" (Fronteira selada), "ritmo acelerado" (Forçado), "penalidade ambiental".

## Conferido sem problema

- **Campeão Dimensional:** grade de habilidades, poderes (10), eventos, Vida/Mana/Estamina somando 9, defesas de Pisada, Avanço, Pulso e Punho, Fratura, DT por Intimidação, Marcha, Aura, Melhor Forma (+1 dado fixo, imunidade a Paralisado), Aprende Apanhando (Resistência por tipo).
- **Pirata Amaldiçoado:** 14 mutações e escalonamento 1 a 4, `efeitos_por_nivel` de Pele de Tubarão e Coração de Leviatã batem com o texto, DT da Maldição, Bolsa de Tinta (Cego), Âncora Maldita (Imobilizado com duração), Marca do Afogado, Olhar da Perdição (Amedrontado com duração), Navio Fantasma (janela por sessão é de história), Chamado das Profundezas (metade no sucesso, Caída), Fôlego e Sangue do Mar.
- **Cartista Arcano:** marcos de magia (1/3/4/5/6/7/8, círculo 1 e 2) iguais à tabela do Livro, limite de 4 do mesmo círculo a partir do 25, Selos e Encantamentos (1/2/3), DT por Misticismo, Eremita (Invisível), A Lua (Caído com Fortitude), Imperatriz, Enforcado (Vida paga Mana), O Sol (Queimando, "até apagar").
- **Guia Dimensional:** grade, limite de 5 âncoras (1 + 4), 4 tipos de âncora em 4 estágios, `momento` de Âncora Viva, Corte de Coordenada (Espaço, metade no sucesso), Queda Lateral, Faro de Portal, Passo Vetorial e Troca de Coordenadas, Mapa Vivo (por sessão, informação).
- **Escritor de Contos:** grade, dano mental de dado pequeno (1d6), Cliffhanger e Último Capítulo (1 PV), Retcon Menor e Quebra da Quarta Parede (por sessão, informação), Vilão da Semana, Narrador Não Confiável, Revisão e Presságio, DT por Enganação.
- **Viajante:** grade, 8 lições ligadas a perícia fora de combate, Golpe Baixo (Exposto), Passo Longo, Plano B (por descanso), Sem Fronteiras (por descanso), Memória de Mapas, Amigo dos Bichos, Sou de Fora, DT por Sobrevivência (sem uso real).
