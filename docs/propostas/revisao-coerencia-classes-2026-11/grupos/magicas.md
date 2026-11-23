# Revisão de coerência: classes mágicas (canalizador, sintonizador, ritualista, elementarista)

Status: concluído.

## Canalizador (canalizador)

### [INCOERÊNCIA] dt_efeitos · descricao
- **Hoje:** "role Misticismo no momento em que conjura. O resultado da sua rolagem é a DT que o alvo precisa alcançar. Isso é diferente da DT de conjuração normal (7 + 2,5 × o círculo...), que já vale sozinha para toda magia que você lança."
- **Livro:** Magia e Fluxo › Teste e DT de magia: "Se houver alvo hostil, o mesmo total também é lido contra ele... É uma rolagem só, lida duas vezes." Ataque e resistência: as resistências de magia são Reflexos, Fortitude ou Vontade.
- **Problema:** o texto dá a entender que o Canalizador faz uma segunda rolagem de Misticismo, quando o Livro diz que é o mesmo total da conjuração. "Percepção" não é resistência de magia no Livro. A frase final sugere que a DT de conjuração "vale sozinha", mas ela só decide se a magia se estabiliza.
- **Correção:** "Quando uma magia sua pede Fortitude, Reflexos ou Vontade do alvo, a DT dele é o total do seu próprio teste de conjuração (d20 + Mod. Fluxo + metade do nível + Grau de Misticismo + bônus). É a mesma rolagem que precisa alcançar a DT de conjuração do círculo para a magia se estabilizar."
- **Decisão do Pedro?** sim, porque pode haver efeito de Canalizador que de fato use Percepção (confirmar se algum efeito pede esse teste).

### [LACUNA] canalizacao-nativa · estágio 10 (Conta Exata)
- **Hoje:** "Ao superar a DT por 5 ou mais, reduza o custo em 1 Mana, mínimo 1."
- **Livro:** Magia e Fluxo › Teste e DT de magia: "A Mana sai no momento em que você declara a conjuração, e não volta se o teste falhar."
- **Problema:** o custo já foi pago antes do dado, então "reduzir o custo" só funciona como devolução depois da rolagem. O texto não diz isso, e não diz se a Mana volta mesmo com mínimo 1 nem como combina com Economia Arcana (que também fala em "mínimo 1").
- **Correção:** "Ao superar a DT de conjuração por 5 ou mais, recupere 1 de Mana depois da rolagem, até o custo final ficar em 1 no mínimo. Vale uma vez por turno e se soma a Economia Arcana, sempre respeitando o mínimo de 1."
- **Decisão do Pedro?** não

### [LACUNA] canalizacao-nativa · estágio 15 (Segunda Chance)
- **Hoje:** "Uma vez por cena, repita um teste de conjuração."
- **Livro:** Sistema Base › Maestria de atributo (Fluxo): "repita um teste de conjuração que falhou. A Mana não é cobrada de novo, e vale o novo resultado."
- **Problema:** a habilidade não diz que só vale para teste que falhou, que a Mana não é cobrada de novo e que o novo resultado vale. Do jeito que está, dá para repetir um teste bem-sucedido e escolher, ou pagar Mana duas vezes. Como o Fluxo 20 dá a mesma coisa, também falta dizer que as duas se somam ou não.
- **Correção:** "Uma vez por cena, repita um teste de conjuração que falhou. A Mana não é cobrada de novo, e vale o novo resultado. Isso é à parte da maestria de Fluxo."
- **Decisão do Pedro?** não

### [LACUNA] canalizacao-nativa · estágios 5 e 20 (momento)
- **Hoje:** Ajuste Fino: "receba +2 num teste de conjuração depois de rolar." Ápice Nativo: "trate o d20 de uma conjuração como 15."
- **Livro:** Poderes e Habilidades › Como ler a ação: "Quando importa o momento, ele vem logo depois, como em 'Ação Livre · antes do ataque'".
- **Problema:** os dois têm gatilho depois da rolagem, mas o campo `momento` está vazio. No Ápice Nativo falta dizer o que acontece com quem rola com vantagem (dois d20) e que 15 não é 20 natural, então não vira crítico nem anula falha crítica de 1 natural.
- **Correção:** Ajuste Fino: `momento` = "depois de rolar o teste de conjuração". Ápice Nativo: `momento` = "depois de rolar" e texto "Uma vez por descanso, depois de rolar uma conjuração, troque o d20 usado por 15. O 15 não é 20 natural: não gera crítico, e tira a falha crítica de um 1."
- **Decisão do Pedro?** não

### [ERRO] forma-do-fluxo · opção Forma de Área
- **Hoje:** "uma magia sua que afete uma área recebe +2 na DT de conjuração."
- **Livro:** Magia e Fluxo: "DT de conjuração = 7 + ⌊2,5 × círculo⌋" é o número que a rolagem precisa alcançar; o total da rolagem é o que o alvo tem de superar.
- **Problema:** somar +2 à DT de conjuração torna a magia mais difícil de estabilizar, o oposto do que a opção quer. Pelo texto das outras formas (+2 no teste), a intenção é +2 no total que os alvos têm de superar.
- **Correção:** "Uma vez por cena, uma magia sua que afete uma área recebe +2 no total do teste de conjuração, e é esse total que os alvos têm de superar."
- **Decisão do Pedro?** não

### [ERRO] voz-da-deidade · descricao
- **Hoje:** "recebem +3 no teste de conjuração e na DT. A primeira falha de Concentração em cada rodada é considerada um sucesso."
- **Livro:** Magia e Fluxo: o teste de conjuração é lido contra a DT de conjuração do círculo e, ao mesmo tempo, contra o alvo; "Concentração" é a regra de Vontade DT 10 ou metade do dano.
- **Problema:** "+3 no teste e na DT" é ambíguo: o teste e o total lido contra o alvo são a mesma rolagem, e a DT de conjuração do círculo é um número fixo que não deveria subir. Também diz "sem gastar ação" e ao mesmo tempo é Ação Livre, e "falha de Concentração" pode ser lida como falha da conjuração.
- **Correção:** "Uma vez por descanso, ative esta habilidade como Ação Livre. Por três rodadas, suas conjurações custam 3 de Mana a menos (mínimo 1) e recebem +3 no teste de conjuração. Esse bônus vale também contra os alvos. A primeira falha em teste de Vontade para manter concentração em cada rodada conta como sucesso."
- **Decisão do Pedro?** não

### [MELHORIA] fluxo-sem-filtro · descricao
- **Hoje:** "Ainda quebra se você for nocauteado ou perder a consciência."
- **Livro:** Magia e Fluxo › Concentração: "Ficar Atordoado, Inconsciente ou incapaz de agir também derruba."
- **Problema:** termos soltos no lugar dos nomes oficiais de condição (Atordoado, Inconsciente), que viram link no Livro.
- **Correção:** "Ainda quebra se você ficar Atordoado, Inconsciente ou incapaz de agir."
- **Decisão do Pedro?** não

### [ERRO] contrafluxo · descricao
- **Hoje:** "Use reação para receber +3 na Defesa contra uma magia."
- **Livro:** Magia e Fluxo › Ataque e resistência: magia de ataque lê o total contra a Defesa; "Magia de efeito. Não há rolagem contra a Defesa", e cada alvo rola Reflexos, Fortitude ou Vontade. Combate › Reações: uma reação por rodada.
- **Problema:** Defesa só conta contra magia de ataque. Contra magia de efeito (a maioria, em área) o poder não faz nada, e o texto promete o contrário. Também falta o momento (antes da rolagem) e dizer que gasta a única reação da rodada.
- **Correção:** "Reação · antes da rolagem contra você. Receba +3 na Defesa contra uma magia de ataque. Se for uma magia de efeito, receba +3 no teste de Reflexos, Fortitude ou Vontade contra ela. Gasta a reação da rodada." (`momento`: "antes da rolagem contra você")
- **Decisão do Pedro?** sim, porque a versão para magia de efeito é decisão de equilíbrio.

### [MELHORIA] pulso-nativo (título "Mente Dividida") · descricao
- **Hoje:** "Você mantém duas magias de Concentração ao mesmo tempo, desde que uma delas seja de até 3º círculo. Um teste de concentração vale para as duas; se falhar, você escolhe qual delas termina."
- **Livro:** Condições › Concentrando: "Só pode manter um efeito de concentração por vez."; Magia e Fluxo › Concentração: "Uma magia ou efeito de concentração por vez. Começar outro encerra o anterior na hora."
- **Problema:** é uma exceção válida, mas não se declara exceção nem diz que o dano de um golpe pede um teste só (DT 10 ou metade do dano) e o que sobra depois da falha.
- **Correção:** "Exceção à regra de uma concentração por vez: você mantém duas magias de Concentração, desde que uma seja de até 3º círculo. Cada golpe pede um teste só, contra DT 10 ou metade do dano recebido, e vale para as duas. Se falhar, você escolhe qual termina; a outra continua."
- **Decisão do Pedro?** não

### [LACUNA] alcance-expandido · descricao
- **Hoje:** "Aumente em 6 m o alcance de uma magia."
- **Livro:** Distâncias › Alcance de armas e poderes: o alcance é uma faixa (Adjacente até 1,5 m, Curto até 5 m, Médio até 15 m...); "Uma faixa além do alcance custa −5 no ataque."
- **Problema:** não diz se vale para magia Pessoal ou Adjacente nem como o novo alcance conta nas faixas de penalidade. O Sintonizador usa "sobe uma faixa" para a mesma ideia.
- **Correção:** "Aumente em 6 m o alcance de uma magia que não seja Pessoal. O novo alcance vale também para contar as faixas de distância."
- **Decisão do Pedro?** não

### [LACUNA] forma-do-fluxo · opção Forma de Defesa
- **Hoje:** "recebe +2 no efeito: mais cura, ou mais Resistência concedida."
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: Resistência vale por tipo específico; Ferimentos: a cura devolve Vida em pontos.
- **Problema:** "+2 no efeito" não diz se é +2 de Vida por alvo, e a Resistência extra não diz a qual tipo de dano vale (ela é sempre por tipo).
- **Correção:** "Uma vez por cena, uma magia sua que cure ou proteja rende +2: +2 de Vida curada em cada alvo, ou +2 na Resistência que a magia concede, para o mesmo tipo de dano dela."
- **Decisão do Pedro?** não

### [MELHORIA] manifestacao-moldada · descricao
- **Hoje:** "Altere a forma de uma área sem aumentar tamanho ou dano."
- **Livro:** Magia e Fluxo › Ataque e resistência: o efeito e a resistência valem por magia; a fusão Mutação do Sintonizador cita as formas "linha" e "cone".
- **Problema:** não diz quais formas valem nem que tipo de dano, resistência e efeito ficam como estão.
- **Correção:** "Troque a forma da área de uma magia por cone, linha ou esfera, com a mesma área total. Tipo de dano, resistência e efeito continuam os mesmos."
- **Decisão do Pedro?** não

### [MELHORIA] apice-do-fluxo · descricao
- **Hoje:** "ela ignora a Resistência dos alvos ao tipo de dano dela."
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: "A redução de dano vale contra qualquer tipo, menos o dano verdadeiro."; imunidade e vulnerabilidade seguem por tipo.
- **Problema:** não diz se ignora também a imunidade e a redução de dano ("reduza em X o dano de cada golpe"). Uma mesa pode entender que a magia corta tudo.
- **Correção:** "Uma vez por descanso, ao conjurar uma magia que cause dano, ela ignora a Resistência dos alvos ao tipo de dano dela. Imunidade e redução de dano continuam valendo."
- **Decisão do Pedro?** sim, porque pode ser a intenção que corte a redução também.

### [LACUNA] canalizacao-nativa · opcoes (vantagem e desvantagem natural dos Fluxos)
- **Hoje:** "Tem vantagem natural sobre Vazio e desvantagem contra Fim." (e as nove irmãs). Comunicação: "desvantagem contra Físico"; Físico: "vantagem natural sobre Tecnologia".
- **Livro:** Magia e Fluxo não traz regra de vantagem entre Fluxos; Elementos › Como os elementos se enfrentam: "só conta quando duas manifestações elementais se enfrentam diretamente".
- **Problema:** a classe promete vantagem e desvantagem de Fluxo sem dizer quando valem. Além disso, os pares se espelham (Origem×Vazio, Essência×Vitalidade, Essência×Comunicação...), mas Comunicação perde para Físico e Físico não lista Comunicação (lista Tecnologia, que não tem entrada própria).
- **Correção:** acrescentar em Canalização Nativa: "A vantagem e a desvantagem natural só contam quando duas manifestações de Fluxo se enfrentam diretamente, como em Elementos: quem está em vantagem rola o teste com vantagem, quem está em desvantagem rola com desvantagem, e as duas se anulam. Não dão dano extra." E decidir o par Comunicação, Físico e Tecnologia.
- **Decisão do Pedro?** sim, porque é desenho da lore e da regra.

## Sintonizador (sintonizador)

### [INCOERÊNCIA] dt_efeitos · descricao
- **Hoje:** igual ao do Canalizador: "role Misticismo no momento em que conjura. O resultado da sua rolagem é a DT que o alvo precisa alcançar. Isso é diferente da DT de conjuração normal ... que já vale sozinha para toda magia."
- **Livro:** Magia e Fluxo › Teste e DT de magia: "É uma rolagem só, lida duas vezes."
- **Problema:** mesmo texto e mesmo problema do Canalizador: dá a entender uma segunda rolagem, e cita Percepção, que não é resistência de magia no Livro.
- **Correção:** "Quando uma magia sua pede Fortitude, Reflexos ou Vontade do alvo, a DT dele é o total do seu próprio teste de conjuração (d20 + Mod. Fluxo + metade do nível + Grau de Misticismo + bônus). É a mesma rolagem que precisa alcançar a DT de conjuração do círculo."
- **Decisão do Pedro?** sim, mesma pergunta sobre Percepção.

### [ERRO] aterramento · descricao
- **Hoje:** "reduzir esse dano em 8 + metade do seu nível de Sintonizador. A redução vale para o dano total, depois da Resistência, seja qual for o tipo."
- **Livro:** Tipos de dano › Dano verdadeiro e Resistência e ordem de aplicação: "A redução de dano vale contra qualquer tipo, menos o dano verdadeiro."
- **Problema:** "seja qual for o tipo" inclui o dano verdadeiro, que nenhuma redução alcança.
- **Correção:** "A redução vale para o dano total, depois da Resistência, contra qualquer tipo, menos dano verdadeiro." Preencher `momento`: "ao sofrer o dano".
- **Decisão do Pedro?** não

### [LACUNA] sintonia-catalisada · estágio 1, aterramento e frequencia-protetora
- **Hoje:** estágio 1: "reduz em 2 o dano das magias desse Fluxo que atingirem você". Frequência Protetora: "reduza em 5 o dano de cada magia do mesmo Fluxo do catalisador ativo que atingir você."
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: a redução entra no segundo passo, junto da Resistência, "até o mínimo 0", e não vale contra dano verdadeiro.
- **Problema:** as três reduções (2, 5 e 8 + metade do nível) não dizem se somam entre si, nem se entram depois da Resistência, nem que excluem dano verdadeiro. Frequência Protetora não diz se o Fluxo é o do catalisador ativo na hora do dano (trocar de catalisador muda o Fluxo no meio da cena).
- **Correção:** acrescentar nas três: "A redução entra depois da Resistência, não vale contra dano verdadeiro e (soma com / não soma com) as outras reduções do Sintonizador." Em Frequência Protetora: "do Fluxo do catalisador ativo no momento do dano."
- **Decisão do Pedro?** sim, porque somadas as três (2 + 5 + 8 + metade do nível) quase zeram dano de magia do Fluxo; decidir se soma ou se vale só a maior.

### [INCOERÊNCIA] troca-instantanea · descricao × fusao-controlada
- **Hoje:** Troca Instantânea: "A troca também reativa o catalisador que sai, se ele estava desativado só pela fusão." Fusão Controlada: "trocar para outro catalisador preparado não o recarrega."
- **Livro:** Rituais, Selos e Fusão: "desativado é o que foi gasto numa fusão e só volta com outros dez minutos."
- **Problema:** o poder contradiz a regra da habilidade sem se declarar exceção. Com ele e Troca Rápida (nível 15), o custo da fusão some em combate: basta alternar dois catalisadores a cada turno.
- **Correção:** "Exceção à regra de Fusão Controlada: ao trocar, o catalisador que sai e estava desativado só pela fusão volta a ficar preparado. Vale uma vez por cena." (ou tirar a reativação do poder)
- **Decisão do Pedro?** sim, porque mexe no principal freio da classe.

### [LACUNA] dupla-frequencia e convergencia-segura · descricao
- **Hoje:** Dupla Frequência: "a cada conjuração, use a fusão de qualquer um dos dois." Convergência Segura: "usar a fusão de qualquer um deles sem desativá-lo".
- **Livro:** Rituais, Selos e Fusão: "Classe ou habilidade capaz de fundir aplica um Fluxo secundário por magia. Um." Fusão Controlada: "no máximo uma fusão"; "Depois da conjuração, o catalisador usado fica desativado."
- **Problema:** Dupla Frequência não diz se o catalisador usado fica desativado depois da primeira conjuração (então só a primeira fusão da rodada vale) nem repete que a magia leva uma fusão só. Convergência Segura diz que não desativa, mas não repete "uma fusão por magia".
- **Correção:** Dupla Frequência: "...use a fusão de qualquer um dos dois. Cada magia leva uma fusão só, e o catalisador usado fica desativado como de costume." Convergência Segura: "...sem desativá-lo. Cada magia continua levando uma fusão só."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] convergencia-segura · descricao
- **Hoje:** "ative esta habilidade sem gastar ação ... você recebe +3 nos testes de conjuração e na Defesa durante o efeito." Campo `acao`: "Ação Livre".
- **Livro:** Poderes e Habilidades › Como ler a ação: toda habilidade declara uma das sete ações; Combate › Seu turno: a Ação Livre é um gesto que "não realiza testes, ataques nem ativa habilidades, salvo quando uma regra específica permitir".
- **Problema:** "sem gastar ação" e `acao` = Ação Livre dizem coisas diferentes (a mesma fórmula aparece na Voz da Deidade do Canalizador). O +3 "na Defesa" só protege contra magia de ataque e ataque comum (magia de efeito rola resistência, não Defesa).
- **Correção:** "Uma vez por descanso, ative esta habilidade como Ação Livre. Por três rodadas, ... você recebe +3 nos testes de conjuração e +3 na Defesa." Se a intenção for proteger também contra magia de efeito, acrescentar "e nos testes de Reflexos, Fortitude e Vontade contra magia".
- **Decisão do Pedro?** sim, porque a extensão para resistências é decisão de equilíbrio.

### [INCOERÊNCIA] ressonancia-compartilhada · descricao
- **Hoje:** "você e os aliados a até 3 m recebem +2 de Defesa contra magia e poder de criatura do mesmo Fluxo dele."
- **Livro:** Magia e Fluxo › Ataque e resistência: "Magia de efeito. Não há rolagem contra a Defesa."
- **Problema:** mesma falha do Contrafluxo do Canalizador: Defesa só entra contra magia de ataque. Contra magia de efeito, que é a maioria das magias em área do Fluxo, o poder não faz nada.
- **Correção:** "... recebem +2 de Defesa contra magia de ataque, e +2 nos testes de Reflexos, Fortitude e Vontade contra magia, do mesmo Fluxo dele."
- **Decisão do Pedro?** sim, porque a extensão para resistências é decisão de equilíbrio.

### [LACUNA] foco-reserva · descricao
- **Hoje:** "Prepare um catalisador adicional para manter em reserva."
- **Livro:** Rituais, Selos e Fusão: "Preparado é o catalisador sintonizado; ativo é o que a fusão usa agora, um por vez." Sintonia Catalisada: 1 preparado no nível 1, 2 no 5, 3 no 15.
- **Problema:** não diz se é um catalisador a mais além do limite do estágio, nem se pode ficar ativo.
- **Correção:** "Seu limite de catalisadores preparados sobe em 1. O catalisador de reserva fica preparado e pode ser tornado ativo como qualquer outro."
- **Decisão do Pedro?** não

### [LACUNA] sintonia-distante · descricao
- **Hoje:** "Ative um catalisador preparado a até 12 m."
- **Livro:** Rituais, Selos e Fusão: preparado, ativo e desativado são estados diferentes; trocar o ativo custa uma Ação de Movimento (Sintonia 5) ou Ação Livre uma vez por turno (Sintonia 15).
- **Problema:** "ativar" pode ser lido como tornar ativo ou como reativar um desativado. Também não diz onde o catalisador está (no chão, na mão de um aliado) nem se serve de Troca à distância.
- **Correção:** "Torne ativo um catalisador preparado que esteja a até 12 m de você, sem precisar tocá-lo. Não reativa catalisador desativado."
- **Decisão do Pedro?** sim, porque depende de o catalisador estar longe do dono.

### [LACUNA] leitura-de-artefato · acao e descricao
- **Hoje:** "Descubra Fluxo, função geral e um risco de um catalisador." Ação Padrão, Toque.
- **Livro:** Perícias › Misticismo: "Identificar magias, criaturas e fenômenos sobrenaturais".
- **Problema:** não diz se há teste (por exemplo, Misticismo contra a DT do objeto) nem se vale em combate; Ação Padrão em combate para ler um objeto parece uso fora de combate.
- **Correção:** "Fora de combate. Toque um objeto e descubra Fluxo, função geral e um risco dele. Sem teste, ou com Misticismo contra a DT Padrão do nível do objeto, se ele for escondido." 
- **Decisão do Pedro?** sim, porque falta decidir se rola ou é automático.

### [LACUNA] pulso-vivo (Fusão Controlada) · descricao
- **Hoje:** "Efeito benéfico concede Vida temporária igual a 2 × círculo; efeito hostil que superar Fortitude impede cura até o próximo turno."
- **Livro:** não existe regra de Vida temporária nos tópicos de combate, descanso e ferimentos (só aparece, sem definição, em Frutos e Implantes). Ataque e resistência: o alvo rola a resistência.
- **Problema:** "Vida temporária" não está definida (absorve primeiro? some quando? soma com outra?). "superar Fortitude" deixa em dúvida quem rola: pela regra, o alvo rola e quem falha sofre o efeito. "Até o próximo turno" de quem?
- **Correção:** "Efeito benéfico concede Vida temporária igual a 2 × círculo ao alvo: ela é gasta antes da Vida, não se soma a outra Vida temporária (vale a maior) e some no fim da cena. Efeito hostil: o alvo que falhar em Fortitude não recupera Vida até o começo do próximo turno do Sintonizador."
- **Decisão do Pedro?** sim, porque Vida temporária precisa de regra geral no Livro.

### [MELHORIA] revelacao (Fusão Controlada) · descricao
- **Hoje:** "Se a magia superar Vontade, o alvo hostil fica Revelado até o próximo turno do Sintonizador."
- **Livro:** Magia e Fluxo › Ataque e resistência: "cada alvo rola d20 + o bônus dela contra o seu total"; Condições › Revelado.
- **Problema:** quem rola Vontade é o alvo. "A magia superar Vontade" inverte o sentido. Magia de ataque sem resistência listada também não diz se o alvo fica Revelado ao ser atingido.
- **Correção:** "Se o alvo hostil falhar em Vontade contra a conjuração (ou, numa magia de ataque, se ela acertar), ele fica Revelado até o próximo turno do Sintonizador."
- **Decisão do Pedro?** não

### [LACUNA] materializacao (Fusão Controlada) · descricao
- **Hoje:** "Escolha um dos sete elementos ao conjurar: o dano da magia passa a ser desse elemento. Escolha também entre mover o alvo 1,5 m ou tornar 1,5 m do terreno difícil até o próximo turno."
- **Livro:** Tipos de dano › Dano elemental: "Resistência e vulnerabilidade valem por elemento"; Elementos: as magias catalogadas como Elementais exigem níveis de Elementarista.
- **Problema:** não diz o que acontece numa magia sem dano (só o segundo efeito?) nem se mover o alvo pede resistência. Também vale reforçar que a fusão não torna a magia "Elemental" nem abre derivação, para ninguém tratar o Sintonizador como Elementarista.
- **Correção:** "...o dano da magia passa a ser desse elemento (numa magia sem dano, só vale a segunda escolha). Mover o alvo pede a mesma resistência da magia, se ela tiver. A magia não vira Elemental e não ganha derivação."
- **Decisão do Pedro?** não

### [LACUNA] encerramento (Encerramento Rápido) · descricao
- **Hoje:** "encerra, no fim do turno do conjurador, um efeito temporário de círculo igual ou menor que o da magia fundida já presente no alvo."
- **Livro:** Magia e Fluxo › Ataque e resistência: "Nas magias que encerram efeitos, quem rola é a criatura hostil que mantém o efeito"; Condições › Peso da condição e Aflições.
- **Problema:** "efeito temporário" não diz se alcança condição, aflição, lesão, maldição ou Ferido, nem quem testa. Sem isso, pode ser lido como cura de aflição ou de lesão, que têm tratamento próprio.
- **Correção:** "...encerra um efeito mágico temporário de círculo igual ou menor que o da magia fundida. Se for de criatura hostil, ela rola a resistência da magia; um efeito sem dono ou de aliado termina sem teste. Não encerra aflição, lesão, Ferido nem condição de longo prazo."
- **Decisão do Pedro?** não

### [LACUNA] eco/Prorrogação e Programação (Fusão Controlada) · descricao
- **Hoje:** Prorrogação: "Atrasa a resolução até o próximo turno ou aumenta em uma rodada uma duração medida em rodadas." Programação: "O teste é rolado quando a magia sai".
- **Livro:** Magia e Fluxo › Teste e DT de magia: "A Mana sai no momento em que você declara a conjuração, e não volta se o teste falhar"; Desgaste do Tempo.
- **Problema:** Prorrogação não diz quando se rola o teste (agora ou na resolução), nem o que acontece se o alvo sair do lugar. Também não diz se Desgaste do Tempo (1 de Cansaço em magia de Tempo do 5º círculo em diante) conta, já que o Fluxo de Tempo é só o secundário.
- **Correção:** "Atrasa a resolução até o começo do próximo turno do Sintonizador: o teste é rolado nessa hora, contra o que estiver no local, e a Mana já foi paga. Ou aumenta em uma rodada uma duração medida em rodadas. Não aplica Desgaste do Tempo, que só vale para magia cujo Fluxo principal é o Tempo."
- **Decisão do Pedro?** sim, porque o Desgaste do Tempo da fusão precisa de decisão.

### [INCOERÊNCIA] descarga-do-catalisador × mutacao, reacender, religacao-de-emergencia, fusao-perfeita
- **Hoje:** Descarga: "O catalisador ativo fica desativado até o próximo descanso, em vez dos dez minutos." Mutação (resultado 4): "o catalisador não se desativa". Reacender: "reative na hora um catalisador desativado". Religação: "Uma vez por cena, ... quando o seu catalisador ativo for desativado".
- **Livro:** Rituais, Selos e Fusão: "desativado é o que foi gasto numa fusão e só volta com outros dez minutos"; Poderes e Habilidades › Por descanso.
- **Problema:** nada diz como a Descarga (que "continua desativando até o próximo descanso") se combina com estas quatro saídas. Na prática Religação (nível 18, por cena) e Reacender (nível 20) apagam o custo da Descarga, e Mutação 4 manda não desativar, o que contradiz "até o próximo descanso".
- **Correção:** "Descarga do Catalisador: o catalisador fica desativado até o próximo descanso. Mutação, Fusão Perfeita, Reacender e Religação de Emergência não desfazem isso." (ou liste o que desfaz)
- **Decisão do Pedro?** sim, porque define se a Descarga é um custo de verdade.

## Ritualista (ritualista)

### [ERRO] dt_efeitos · descricao (fórmula do teste do rito)
- **Hoje:** "Todo rito rola d20 mais Mod. Fluxo mais o seu Grau de Misticismo contra a DT escrita no próprio ritual".
- **Livro:** Perícias e Magia e Fluxo › Teste: "d20 + Mod. Fluxo + ⌊Nível total ÷ 2⌋ + Grau de Misticismo + bônus"; "A metade do nível entra aqui como em qualquer teste."
- **Problema:** a fórmula esquece a metade do nível total. Ritual de DT 15 a 30 fica mais difícil do que a regra prevê, mais ainda em nível alto. Também "faça um teste de interrupção com a mesma rolagem" parece reaproveitar o dado, e pelo texto seguinte cada ameaça pede um teste novo.
- **Correção:** "Todo rito rola d20 + Mod. Fluxo + metade do nível total + Grau de Misticismo + bônus contra a DT escrita no ritual, de 15 no simples a 30 no monumental. ... faça um teste de interrupção com o mesmo bônus contra a mesma DT, com um dado novo."
- **Decisão do Pedro?** não

### [ERRO] tarefas_bancada · linha "Ajudar no rito, com Misticismo"
- **Hoje:** "Ajudar no rito, com Misticismo | DT 10 | Cada ajudante soma +2, com teto de +4 pela regra de Ajudar."
- **Livro:** Ações Coletivas › Ajudar: "O ajudante não faz teste."; "Quem faz a tarefa soma +2 no teste para cada ajudante."; "No máximo dois ajudantes dão bônus".
- **Problema:** a linha dá DT e perícia ao ajudante, mas ajudante não rola. A frase seguinte já descreve o bônus certo, então só a DT e a perícia estão a mais. Para vantagem no lugar do +2, o Livro pede Pontos de Relação.
- **Correção:** `tarefa`: "Ajudar no rito"; `dt`: "Sem teste"; `nota`: "Cada ajudante soma +2 no teste do rito, no máximo dois ajudantes (+4). O ajudante diz o que faz de concreto; quem tem Pontos de Relação com o oficiante pode gastar um uso para dar vantagem no lugar do +2."
- **Decisão do Pedro?** não

### [ERRO] assistente-treinado · descricao
- **Hoje:** "Um participante sem treino em Misticismo ajuda no rito como se fosse Aprendiz, somando os +2 de Ajudar em vez de atrapalhar. O teto de dois ajudantes continua valendo."
- **Livro:** Ações Coletivas › Ajudar: o ajudante não rola e não precisa de treino; ajudar não passa proficiência, só dá +2 se for algo concreto.
- **Problema:** o poder resolve um problema que o Livro não tem: ninguém "atrapalha" ao ajudar, e ajudante não é Aprendiz de nada. Do jeito que está, não faz nada, e leva a crer que a tarefa da bancada exige Misticismo.
- **Correção:** trocar o efeito para algo que mude a regra de verdade, por exemplo: "Seus ajudantes no rito dão +3 em vez de +2, até o teto de +4 do Livro (o segundo ajudante soma só +1)." Ou "Um ajudante que tenha Pontos de Relação com você dá a Ajuda certa (vantagem) sem gastar o uso."
- **Decisão do Pedro?** sim, porque é preciso escolher o efeito novo do poder.

### [ERRO] grande-oficiante · usos e acao
- **Hoje:** `usos`: "Uma vez por sessão"; `acao`: "Fora de combate". Texto: "Esta é uma exceção explícita à proibição de realizar ritos em combate: use uma Ação Completa em cada um dos seus três turnos e permaneça Concentrando".
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: "Por sessão: ... Poder de combate volta no descanso."
- **Problema:** é uma habilidade de combate (três turnos de Ação Completa) com janela "por sessão", e o campo `acao` diz Fora de combate enquanto o texto manda usar Ação Completa em combate.
- **Correção:** `acao`: "Ação Completa"; `momento`: "declarado ao iniciar o rito"; `usos`: "Uma vez por descanso". No texto: "Uma vez por descanso, ...".
- **Decisão do Pedro?** sim, porque troca a janela de uso de uma habilidade final.

### [INCOERÊNCIA] grande-oficiante · "conta como quatro ajudantes" e interrupção
- **Hoje:** "Para cumprir requisitos de participantes, você conta como quatro ajudantes. Você também recebe +5 contra interrupção". Também: "permaneça Concentrando até concluir. Uma interrupção ainda pode quebrar o rito pelas regras normais."
- **Livro:** Ações Coletivas › Ajudar: "No máximo dois ajudantes dão bônus ao mesmo teste, então o máximo é +4."; Condições › Concentrando: "Ao sofrer dano, teste Vontade DT 10 ou metade do dano".
- **Problema:** "quatro ajudantes" colide com o teto de dois. Não diz se é só para o requisito de quantas pessoas o rito pede (e não para o +2 de cada ajuda). Concentrando e teste de interrupção podem pedir dois testes no mesmo golpe, e o texto não diz qual vale.
- **Correção:** "Para cumprir o número mínimo de participantes que o rito exige, você conta como quatro pessoas. Isso não muda o bônus de Ajudar, que continua limitado a +4. Um golpe que ameace o rito pede um teste de interrupção (com +5), e ele substitui o teste de concentração desse mesmo golpe."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] livro-de-rituais · estágio 5 (Rito Guardado)
- **Hoje:** "você solta com uma Ação Padrão de onde estiver, inclusive no meio de uma luta."
- **Livro:** Rituais, Selos e Fusão: "Ritual não pertence a círculo nenhum e não entra em combate."
- **Problema:** soltar o rito em combate é uma exceção ao Livro, e a habilidade não se declara exceção (a Grande Oficiante diz "exceção explícita"). Também não diz o que acontece com o rito guardado e a Mana no fim da sessão ("Ele espera até o fim da sessão") e a janela "sessão" aparece no efeito de combate, que pela regra de janelas deveria voltar por descanso.
- **Correção:** "Você solta com uma Ação Padrão, de onde estiver, inclusive no meio de uma luta (exceção à regra de que ritos não entram em combate; só vale o efeito pronto, sem novo teste de rito). Se não for solto até o fim da sessão, o rito se desfaz e a Mana comprometida se perde. Um rito guardado por vez." Trocar "Guardado até o fim da sessão" por "Guardado até o próximo descanso completo" se quiser seguir a regra de janelas.
- **Decisão do Pedro?** sim, porque define se a janela é sessão ou descanso.

### [LACUNA] livro-de-rituais · estágios 15, circulo-preparado (Economia) e circulo-permanente (reduções de tempo)
- **Hoje:** Mão Firme: "Todo rito seu leva 25% menos tempo". Economia: "reduza o tempo total em 25%" (um terço no nível 2). Círculo Permanente: "todo rito seu leva metade do tempo".
- **Livro:** Materiais › Componentes por complexidade do ritual e Ritualista (tarefas_bancada): tempo fixo por complexidade (10 minutos, 1 hora, 8 horas, 3 dias).
- **Problema:** três reduções de tempo podem acumular e não dizem se somam ou se multiplicam, nem qual o mínimo. Somando (25% + 25% + 50%) o tempo vai a zero; multiplicando, o rito Monumental de 3 dias cai para menos de 1 dia.
- **Correção:** "Reduções de tempo do Ritualista (Mão Firme, Economia, Círculo Permanente) se multiplicam, arredondando para baixo, e o tempo final nunca é menor que 1 minuto." (ou "somam, até no máximo 75%")
- **Decisão do Pedro?** sim, porque define a escala do tempo do rito.

### [LACUNA] circulo-preparado · opção Precisão, escalonamento nível 3
- **Hoje:** "quando o teste do rito falhar por 1 ou 2, trate a falha como comum e ignore qualquer consequência agravada escrita nele."
- **Livro:** Perícias › Graus de resultado: o Livro só conhece Falha e Falha crítica; Rituais, Selos e Fusão: "Se interromperem o ritual, a Mana comprometida já era."
- **Problema:** "falha comum" e "consequência agravada" não existem no Livro. Também não diz se o rito acontece (vira sucesso) ou só se perde a Mana.
- **Correção:** "Nível 3: quando o teste do rito falhar por 1 ou 2, ele conta como sucesso." (ou "como falha, e a Mana comprometida não se perde")
- **Decisão do Pedro?** sim, porque são dois efeitos bem diferentes.

### [INCOERÊNCIA] circulo-preparado · opção Proteção (nível 4) e Resistência
- **Hoje:** "Nível 4: ... quem está dentro recebe Resistência 5 contra dano vindo de fora."
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: "Resistência vale sempre por tipo específico"; Combate: "Resistência contra todo dano foi abolida: vira 'reduza em X o dano de cada golpe'" (e Resistência física geral cobre só os quatro físicos).
- **Problema:** "Resistência 5 contra dano vindo de fora" é Resistência a todo dano, que o Livro aboliu.
- **Correção:** "Nível 4: ... quem está dentro reduz em 5 o dano de cada golpe vindo de fora, depois da Resistência (não vale contra dano verdadeiro)."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] tarefas_bancada · linha "Achar um círculo que alguém escondeu" × Ocultação
- **Hoje:** tabela: "Ocultação no círculo soma +4 nessa defesa." Preparo Ocultação: "com −4"; nível 2: "a penalidade sobe para −6"; nível 4 "rastreá-lo por Fluxo também exige vencer a DT".
- **Livro:** Poderes e Habilidades: campos estruturados devem bater com o texto.
- **Problema:** a bancada fixa +4, o preparo sobe para −6 no nível 2.
- **Correção:** na `nota`: "Ocultação soma o que o preparo diz: +4 na DT (−4 para quem procura), +6 no nível 2 do círculo."
- **Decisão do Pedro?** não

### [LACUNA] ancora-ritual e vigilia · usos e acao
- **Hoje:** Âncora Ritual: Reação, "Uma vez por rito ... volta a correr no seu próximo turno de trabalho". Vigília: "Um uso por rito."
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: janelas oficiais são por rodada, turno, cena, descanso e sessão; "Por rodada ... É o limite da Reação."
- **Problema:** "por rito" e "turno de trabalho" não são janelas do Livro, e fora de combate não há rodada nem reação por rodada. O texto precisa dizer quando a Reação vale e o que é "próximo turno de trabalho".
- **Correção:** Âncora Ritual: "Uma vez por rito, quando você falhar num teste de interrupção causado pelo ambiente, o rito para no lugar e volta a correr quando o ambiente permitir, sem perder a Mana. Interrupção causada por criatura continua quebrando o rito." (`acao`: "Fora de combate", `momento`: "ao falhar no teste de interrupção")
- **Decisão do Pedro?** não

### [MELHORIA] leitura-de-pacto · acao e descricao
- **Hoje:** `acao`: "Ação Completa"; "Cláusula escondida por Fluxo pede Misticismo contra a DT de quem escondeu."
- **Livro:** Poderes e Habilidades: sete ações, incluindo Fora de combate; Perícias: DT fixa vem da tabela ou do teste de quem esconde.
- **Problema:** ler um contrato é trabalho fora de combate, e Ação Completa pede para gastar o turno inteiro. "A DT de quem escondeu" não diz qual número é.
- **Correção:** `acao`: "Fora de combate". Texto: "... Cláusula escondida por Fluxo pede Misticismo contra o total do teste de quem a escondeu."
- **Decisão do Pedro?** não

### [MELHORIA] circulo-de-protecao · descricao
- **Hoje:** "Participantes recebem +2 de Defesa contra ameaça vinda de fora do círculo. Se o preparo Proteção também estiver ativo, use apenas o maior bônus de Defesa".
- **Livro:** Poderes e Habilidades: poder com custo deve acrescentar algo; Condições › Resguardado: +2 de Defesa não acumula consigo mesmo.
- **Problema:** quem tem o preparo Proteção (+2) paga 4 de Mana por um bônus igual e não ganha nada. O poder só faz sentido para quem não tem o preparo.
- **Correção:** "+3 de Defesa contra ameaça vinda de fora, que não se soma ao do preparo Proteção (vale o maior)."
- **Decisão do Pedro?** sim, porque é número de equilíbrio.

## Elementarista (elementarista)

### [INCOERÊNCIA] derivacao-desperta · opção Fogo → Magma (fogo-magma)
- **Hoje:** "cada criatura que entrar ou começar o turno ali pela primeira vez testa Reflexos contra a DT da Elementarista e sofre 1d6 de Magma, ou metade se passar."
- **Livro:** Elementos › Derivações: "cada criatura sofre 1d6 de Magma na primeira vez que entrar ou começar o turno ali." (sem teste)
- **Problema:** a classe acrescenta um teste de Reflexos com metade no sucesso que o Livro não tem. Pela convenção das zonas, o teste faria sentido, mas os dois textos precisam concordar. "Pela primeira vez" também não diz se é por turno, por rodada ou por criatura.
- **Correção:** (se vale a classe) Livro: "cada criatura testa Reflexos na primeira vez em cada rodada que entrar ou começar o turno ali, e sofre 1d6 de Magma, ou metade se passar." (se vale o Livro) classe: "cada criatura sofre 1d6 de Magma na primeira vez em cada rodada que entrar ou começar o turno ali."
- **Decisão do Pedro?** sim, porque é escolher qual dos dois textos manda.

### [INCOERÊNCIA] derivacao-desperta · opção Ar → Fumaça × Combate
- **Hoje:** "ela concede cobertura parcial até o começo do seu próximo turno."
- **Livro:** Combate › Ver e ser visto: "Camuflagem | Fumaça, névoa, folhagem densa ou sombra: ataques contra quem está camuflado têm −2"; Cobertura parcial é +2 de Defesa por obstáculo.
- **Problema:** o Livro trata fumaça como Camuflagem (−2 em ataques contra quem está nela), e o efeito de Fumaça diz cobertura parcial (+2 de Defesa). Mesma coisa em número, nomes diferentes. Vale o mesmo para o Véu Elemental. O Elementos também diz "cobertura parcial", então os dois tópicos precisam ser alinhados.
- **Correção:** "crie uma área de fumaça de 3 m ...; quem está dentro conta como camuflado (−2 nos ataques contra ele) até o começo do seu próximo turno." Em Elementos, trocar do mesmo jeito.
- **Decisão do Pedro?** sim, porque mexe no tópico Elementos também.

### [MELHORIA] derivacao-desperta · Luz → Aurora e Pureza
- **Hoje:** Aurora: "não recebe benefício de invisibilidade nesse período." Pureza: "se Cego possuir duração medida em rodadas, reduz essa duração restante em 1 rodada".
- **Livro:** Condições › Invisível e Revelado; Cego: "Remova ou supere a fonte da cegueira."
- **Problema:** "invisibilidade" em minúscula não vira link, e o efeito não diz se a condição Invisível é suprimida ou se vira Revelado. Cego não tem duração própria no Livro, só a da fonte.
- **Correção:** Aurora: "...fica Exposta ... e não recebe os benefícios da condição Invisível nesse período." Pureza: "...encerra a condição Exposto, ou reduz em 1 rodada a duração restante de Cego quando a fonte tiver duração em rodadas."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] muralha-elemental (título "Parede Elemental") · descricao
- **Hoje:** "Ela oferece cobertura superior, bloqueia passagem e linha de efeito e desaba ao sofrer 30 de dano."
- **Livro:** Combate › Ataques e cobertura: "cobertura superior dá +5"; Ver e ser visto: "Cobertura total | Atrás de parede ou obstáculo inteiro, você não pode ser alvo direto de ataque nem de efeito que pede alvo."
- **Problema:** uma barreira que bloqueia linha de efeito é cobertura total, não superior (+5). O texto mistura as duas.
- **Correção:** "Ela dá cobertura total a quem está atrás, bloqueia passagem e linha de efeito e desaba ao sofrer 30 de dano. Efeito em área que contorne a parede ainda alcança."
- **Decisão do Pedro?** não

### [LACUNA] marca-elemental · descricao e usos
- **Hoje:** "Ela sofre 2d6 do mesmo elemento no fim de cada turno dela, até alguém gastar uma Ação Padrão e vencer a DT da Elementarista em Misticismo ou Acrobacia." Campo `usos` ausente (o texto diz "Uma vez por turno").
- **Livro:** Tipos de dano › Persistentes: "batem de novo no fim do turno até alguém remover"; Condições › Queimando e Sangramento (remoção por teste contra a DT do nível da fonte).
- **Problema:** a DT de remoção é a "da Elementarista", mas o `dt_efeitos` só cobre Fortitude, Reflexos e Vontade, não Misticismo ou Acrobacia. A marca de Fogo se parece com Queimando (1d6) e não diz como se relaciona com ela. `usos` deveria constar.
- **Correção:** `usos`: "Uma vez por turno". Texto: "... vencer a DT da Elementarista (o total do teste de Misticismo dela quando marcou) ...". Se a marca for de Fogo: "Não soma com Queimando: vale o maior dano."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] habilidades × grade do Livro
- **Hoje:** Elementarista tem 10 habilidades (Polifonia, Manifestação Natural, Julgamento, Caminho do Avatar, Maestria, Derivações, Domínio, Soberania, Território, Apogeu), entregas nos níveis 11, 12, 13 e 17, e só 3 eventos (4, 7 e 18; sem o do 12). Tem 13 poderes.
- **Livro:** Poderes e Habilidades › A grade de uma classe: habilidades nos níveis 1, 3, 5, 8, 10, 14, 15, 18 e 20, "distribuídas em 4 habilidades"; Evento nos níveis 4, 7, 12 e 18; "uma lista de dez a doze poderes".
- **Problema:** a classe foge da grade das 29 classes em quatro pontos. Pode ser de propósito (classe especial), mas o Livro diz que todas seguem a mesma grade.
- **Correção:** decidir: ou o Livro ganha uma nota de exceção para a Elementarista, ou a classe se ajusta (juntar habilidades, devolver o evento do nível 12, cortar um poder).
- **Decisão do Pedro?** sim, porque é decisão de arquitetura da classe.

### [LACUNA] habilidades sem acao e janelas "por rodada"
- **Hoje:** Polifonia, Julgamento, Caminho do Avatar, Maestria Elemental, Derivações Harmônicas, Domínio da Derivação e Soberania Elemental não têm `acao`. Maestria e Domínio dizem "Uma vez por rodada ao conjurar"; Apogeu também.
- **Livro:** Poderes e Habilidades › Como ler a ação: "Toda habilidade e todo poder dizem que ação pedem"; "Por rodada ... É o limite da Reação"; "Por turno: vale uma vez em cada turno".
- **Problema:** faltam ações (Passivo, Ação Livre, Fora de combate). "Por rodada" é a janela da Reação; para o uso do próprio conjurador o Livro usa "por turno".
- **Correção:** Polifonia, Julgamento, Caminho, Derivações: `acao` "Fora de combate" (escolha) ou "Passivo". Maestria e Soberania: "Passivo" com `usos` "Uma vez por turno". Domínio da Derivação: "Ação Livre" com `usos` "Uma vez por turno". Apogeu: trocar "uma vez por rodada" por "uma vez por turno".
- **Decisão do Pedro?** não

### [LACUNA] apogeu-elemental · Estado de Avatar
- **Hoje:** "você pode declarar dois elementos aprendidos e usar a relação de vantagem mais favorável e a menor Resistência aplicável ao alvo, sem duplicar dano ou efeitos".
- **Livro:** Tipos de dano › Dano elemental: "Resistência e vulnerabilidade valem por elemento"; Elementos › Declarar o elemento: o elemento declarado "define o tipo de dano".
- **Problema:** não diz qual elemento é o tipo do dano (o dano é um só) e se a vulnerabilidade também vale a mais favorável. "Menor Resistência aplicável" precisa dizer que é entre os dois elementos declarados.
- **Correção:** "...você declara dois elementos aprendidos: o dano é do primeiro; a relação de vantagem e a Resistência do alvo são as mais favoráveis a você entre os dois. Vulnerabilidade só conta a do primeiro."
- **Decisão do Pedro?** sim, porque define se a vulnerabilidade é do tipo de dano ou das duas.

### [LACUNA] dt_efeitos e poderes · "DT da Elementarista"
- **Hoje:** "role Misticismo usando Fluxo. O resultado é a DT que o alvo precisa alcançar." Poderes: "Reflexos contra a DT da Elementarista".
- **Livro:** Magia e Fluxo › Teste e DT: "É uma rolagem só, lida duas vezes."; Perícias › DT Padrão: DT de classe vem de `dt_efeitos`.
- **Problema:** nos poderes sem magia o texto não diz quando o total é rolado (ao usar o poder, por alvo ou uma vez só) nem que o mesmo total vale para repetições (Prisão: "pode repetir o teste" por turno).
- **Correção:** acrescentar em `dt_efeitos`: "Role uma vez ao usar o poder; esse total vale para todos os alvos e para os testes repetidos desse mesmo efeito."
- **Decisão do Pedro?** não

### [MELHORIA] ruptura-derivada · pre_requisitos e dano
- **Hoje:** "Derivações Harmônicas 1"; "sofrem 5d6 do elemento derivado".
- **Livro:** Tipos de dano › Derivações também são tipos de dano; Poderes e Habilidades: pré-requisito é nível ou habilidade.
- **Problema:** Derivações Harmônicas não tem estágios, então "1" não indica nada. Derivações como Pureza, Aurora, Fumaça ou Eclipse não têm um tipo de dano natural claro.
- **Correção:** pré-requisito "Derivações Harmônicas" (sem número). Para derivações sem dano próprio, dizer: "se a derivação não é um tipo de dano, o dano é do elemento de origem."
- **Decisão do Pedro?** sim, porque falta definir o dano de Pureza, Aurora, Fumaça e Eclipse.

### [MELHORIA] revestimento-elemental · descricao
- **Hoje:** "Receba Resistência 8 contra esse elemento e Resistência 4 contra dano físico".
- **Livro:** Tipos de dano › Resistência e ordem de aplicação; Perigos › Clima: "Resistência a Gelo ou a Fogo não vale contra o clima."
- **Problema:** não diz que vale também contra as derivações do elemento (regra do Livro) nem que não vale contra clima.
- **Correção:** "Receba Resistência 8 contra esse elemento e contra as derivações dele (não vale contra clima) e Resistência 4 contra dano físico até o começo do seu próximo turno."
- **Decisão do Pedro?** não

## Padrões que se repetem

- **Defesa contra magia de efeito:** Contrafluxo (Canalizador), Ressonância Compartilhada e Convergência Segura (Sintonizador) dão bônus de Defesa "contra magia", mas Defesa só conta em magia de ataque.
- **"+X na DT" ambíguo:** Forma de Área e Voz da Deidade somam à "DT de conjuração" (número fixo do círculo). O que se quer é somar ao total do teste, que é lido contra o alvo.
- **dt_efeitos:** Canalizador e Sintonizador usam o mesmo texto, que sugere segunda rolagem e cita Percepção. Ritualista e Elementarista têm outra redação cada.
- **"Sem gastar ação" com `acao` Ação Livre:** Voz da Deidade e Convergência Segura.
- **Janelas:** "por sessão" em habilidade de combate (Grande Oficiante); "uma vez por rodada" onde o Livro pede "por turno" (Elementarista); "por rito" (Ritualista) não existe no Livro.
- **Redução de dano e Resistência geral:** Aterramento, Frequência Protetora, Sintonia 1 e Proteção nível 4 do Ritualista esquecem dano verdadeiro, ordem de aplicação ou usam "Resistência a tudo".
- **Ajudar:** a bancada do Ritualista e Assistente Treinado ainda tratam ajudante que rola, com DT.
- **Mana paga antes do dado:** Conta Exata e Segunda Chance precisam dizer "devolva" e "não cobra de novo".
- **Campos `acao` ausentes ou `momento` vazio** em várias habilidades.

## Conferido sem problema

- **Canalizador:** grade de níveis, vagas de magia, selos e encantamentos (param em 3), Fluxos oficiais e descrições, Forma de Alvo e de Movimento, Fluxo Sem Filtro (janela e duração), Economia Arcana, Reserva Interior, Canalização Rápida, Conjuração Defensiva, eventos.
- **Sintonizador:** regra de catalisador (dez minutos, preparado/ativo/desativado), Selos e Encantamentos dos Fluxos dos catalisadores, Fusão Afinada, Troca Rápida, Dois na Mão, fusões Germinação, Rede, Dobra e Ausência, grade e vagas.
- **Ritualista:** tabela de Complexidade com Cansaço e Componentes (bate com Materiais), custo de Mana comprometida e perdida, vagas de rito, selo e encantamento, preparos Duração, Economia (sem reduzir componentes) e Amplitude, Círculo Permanente, Mãos Emprestadas, Recuperar Componente, Rito Memorável, Contrato Claro.
- **Elementarista:** tabela de vantagens elementais, Julgamento da Aptidão (1d20, 20 natural), Caminho do Avatar nos níveis 5, 8, 11, 14, 17, 20, derivações (conferidas uma a uma com a tabela de Elementos, exceto as apontadas), Domínio da Derivação (+1 Mana, uma vez por rodada), vagas de magia, Território Elemental, Corrente, Prisão (teste repetido), Contrafluxo Elemental, Passo (sem provocar reação), Cadeia, Campo, Véu e Vetor.
