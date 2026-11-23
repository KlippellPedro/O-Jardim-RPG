# Revisão de coerência: grupo sociais (Médico, Pop Star, Comerciante, Detetive)

Estado: CONCLUÍDO.

## Médico (medico)

### [MELHORIA] medicina · estágio 1 · descricao
- **Hoje:** "Com uma Ação Padrão e um teste de Cura DT 15, trate uma criatura viva ao toque"
- **Livro:** Ferimentos › Tratar ferimentos: "um teste de Cura contra a DT Padrão do nível do paciente"
- **Problema:** DT 15 numérica e solta. A DT Padrão do nível 1 é 15, mas a classe não soma o ajuste de nível, então no nível 20 (Padrão 30) o teste fica trivial para quem tem Cura alta.
- **Correção:** "Com uma Ação Padrão e um teste de Cura contra a DT Padrão do nível do paciente, trate uma criatura viva ao toque: ela recupera 1d6 + Mod. Sabedoria de Vida."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] medicina · estágios 1, 10 e 15 · cura fora de combate
- **Hoje:** "ela recupera 1d6 + Mod. Sabedoria de Vida" (+1d6 avaliando; +2d6 no 10)
- **Livro:** Ferimentos › Tratar ferimentos: "recupera 1d6 de Vida ou um décimo da Vida máxima dele, o que for maior... O Médico cura mais, e também em combate, pelo que diz a classe dele."
- **Problema:** o dado do Médico é fixo. Num paciente com 200 de Vida o tratamento comum devolve 20, e o Tratamento do Médico de nível 15 devolve em média uns 16. A promessa do Livro ("O Médico cura mais") não se cumpre nos níveis altos.
- **Correção:** acrescentar ao estágio 1: "Fora de combate, o Tratamento devolve o que o tratamento comum devolveria (1d6 ou um décimo da Vida máxima do paciente, o que for maior) e soma a isso os dados da Medicina."
- **Decisão do Pedro?** sim, porque mexe no equilíbrio da cura e ele pode querer o Médico forte só em combate.

### [LACUNA] medicina · estágio 10 · descricao
- **Hoje:** "O bônus de cura sobe para +2d6 + Mod.Sabedoria" (campo dano: "+2d6 + Mod.Sabedoria")
- **Livro:** Poderes e Habilidades › Habilidade: "Um estágio novo substitui o texto do anterior quando reescreve a mesma coisa, e soma quando descreve algo novo."
- **Problema:** o estágio 1 já soma Mod. Sabedoria na cura e dá só +1d6 quando avalia. Não diz se o +2d6 vale sempre ou só avaliando, nem se o Mod. Sabedoria entra duas vezes.
- **Correção:** "Quando você avalia antes, o dado extra da cura sobe de +1d6 para +2d6. O Mod.Sabedoria entra uma vez só. Você pode remover duas condições leves de cada alvo. Seu diagnóstico já reconhece o problema de cara: aprenda o primeiro Tratamento Especializado da lista."
- **Decisão do Pedro?** sim, porque ele pode querer o +2d6 sempre ligado.

### [INCOERÊNCIA] medicina · estágio 1 × estágio 5 · avaliar
- **Hoje:** est. 1: "Se você a avaliou antes, com uma Ação de Movimento, some +1d6." est. 5: "Você identifica Vida, Mana e condições visíveis" (acao Ação Livre)
- **Livro:** Combate › Seu turno: "Ação Livre: um gesto, uma fala curta... Não realiza testes, ataques nem ativa habilidades, salvo quando uma regra específica permitir."
- **Problema:** do nível 5 em diante identificar passa a ser Ação Livre, e o texto não diz se isso já vale como "avaliar" (o +1d6 sem gastar a Ação de Movimento) ou se a avaliação continua custando o Movimento.
- **Correção:** estágio 5: "Você identifica Vida, Mana e condições visíveis de um alvo. Essa identificação conta como a avaliação do Tratamento, sem gastar a Ação de Movimento. Sua cura remove uma condição leve de cada alvo."
- **Decisão do Pedro?** sim, porque muda a economia de ações do Médico.

### [LACUNA] medicina/contra-o-veneno · descricao
- **Hoje:** "Se o alvo estiver sob uma aflição de veneno, a cura reduz um estágio extra dela."
- **Livro:** Venenos, Doenças e Vícios › Tratamento: "Cura usa a DT, o tempo e o limite registrados na aflição. Sucesso reduz 1 estágio." e "Uma tentativa por intervalo."
- **Problema:** diz "estágio extra", mas o Tratamento da classe só cura Vida e não reduz estágio nenhum. Não diz se a cura de Vida é um tratamento da aflição, contra qual DT, nem se respeita o limite de uma tentativa por intervalo.
- **Correção:** "Se o alvo estiver sob uma aflição de veneno, o teste de Cura do Tratamento também conta como tratamento da aflição, contra a DT dela, e um sucesso reduz 1 estágio. Respeita o limite de uma tentativa por intervalo."
- **Decisão do Pedro?** sim, porque fixa quanto o Médico vale contra veneno.

### [LACUNA] medicina/contra-a-queda · descricao
- **Hoje:** "ele pode se levantar como parte da mesma cura, sem gastar a própria Ação de Movimento."
- **Livro:** Condições › Caído: "Levantar consome a ação de movimento e provoca reações." e Combate › Provocar reação: levantar do chão dentro do alcance provoca.
- **Problema:** não diz se o levantar provoca reação. O protocolo De Pé de Novo diz "sem provocar reações"; este fica ambíguo.
- **Correção:** "Se o alvo estiver Caído, ele se levanta como parte da mesma cura, sem gastar a Ação de Movimento e sem provocar reações."
- **Decisão do Pedro?** não

### [MELHORIA] medicina · Contra o Medo e Contra a Queda × estágio 5
- **Hoje:** Diagnóstico: "sua cura remove uma condição leve de cada alvo."
- **Livro:** Condições › Peso da condição: "Leve | Amedrontado, Exposto, Revelado, Caído, Sangramento, ... Envenenado ..."
- **Problema:** Amedrontado, Caído e Sangramento já são leves e saem pela cura desde o nível 5. Contra o Medo e Contra a Queda parecem redundantes. Só deixam de ser inúteis porque dão algo a mais (novo teste de Vontade; levantar sem gastar Movimento). Vale dizer isso no texto para ninguém achar que repete.
- **Correção:** Contra o Medo: "Se o alvo estiver Amedrontado, a cura o liberta sem esperar o fim do turno dele: ele faz na hora o teste de Vontade contra a DT da fonte do medo, com +2." (a parte numérica é sugestão).
- **Decisão do Pedro?** sim, porque depende do que ele quer que esse tratamento adicione.

### [LACUNA] medicina/segunda-chance · descricao
- **Hoje:** "Se esta for a segunda vez que você cura o mesmo aliado nesta cena, some +1d6 à cura."
- **Livro:** Poderes e Habilidades › Como ler a ação: "Por cena: volta quando a cena acaba." (e o Tratamento só cura cada criatura uma vez por cena)
- **Problema:** o Tratamento só funciona uma vez por criatura por cena, então a "segunda cura" só pode vir de Socorro de Emergência, Último Recurso ou Mestre da Vida. Não diz quais curas contam, e a opção mora na lista do Tratamento, onde só vale se outra cura veio antes.
- **Correção:** "Se o aliado já recebeu outra cura sua nesta cena (de qualquer habilidade da classe), o Tratamento soma +1d6. Vale só nessa cura."
- **Decisão do Pedro?** não

### [LACUNA] medicina est. 15, socorro-de-emergencia/mao-firme, poder eu-sei-curar · rerrolagem de 1
- **Hoje:** "dados de cura que resultem 1 podem ser rerrolados uma vez"; "Sua próxima rolagem de cura... pode ser rerrolada uma vez"; "Rerrole todos os dados de cura que resultaram 1... e mantenha os novos resultados."
- **Livro:** Perícias › Vantagem e desvantagem: efeitos de fonte não se acumulam em dobro. Não há regra geral de rerrolagem.
- **Problema:** as três fontes podem ser empilhadas no mesmo dado (rerrola um 1, rerrola de novo, rerrola de novo) e o dado nunca fica em 1. Não diz que cada dado só rerrola uma vez por rolagem.
- **Correção:** acrescentar na Mão Experiente: "Cada dado de cura só pode ser rerrolado uma vez por rolagem, venha a rerrolagem de onde vier."
- **Decisão do Pedro?** não

### [LACUNA] socorro-de-emergencia · estágio 3 · Déficit, morte, Ferido e trauma
- **Hoje:** "quando um aliado a até 4,5 m cair a 0 de Vida: ele ignora o Déficit de Vida, volta com 1 de Vida e então recupera 1d6."
- **Livro:** Ferimentos › Vida negativa: "Se o Déficit chegar à sua Vida máxima, você morre na hora, sem teste." / Quando rolar ferimento crítico: "um único golpe tirar metade ou mais dos seus PV máximos." / "Quem acorda ganha Ferido 1."
- **Problema:** não diz se a reação impede a morte imediata por Déficit, se o aliado recebe Ferido 1 e se o golpe que tirou metade da Vida ainda pede a tabela de trauma.
- **Correção:** "...ele ignora o Déficit de Vida, inclusive o que mataria na hora, volta com 1 de Vida e então recupera 1d6. Ele não recebe Morrendo nem Ferido por essa queda, e esse golpe não pede a tabela de trauma."
- **Decisão do Pedro?** sim, porque a Reação passa a anular Ferido e trauma.

### [MELHORIA] socorro-de-emergencia · estágio 3 e 20 · "neste combate"
- **Hoje:** "a 2ª ativação neste combate soma +1 dado... a 3ª soma +2 dados" e dano "(+1 dado na 2ª ativação do combate...)"
- **Livro:** Poderes e Habilidades › Como ler a ação: "Por cena: ... Um combate inteiro é uma cena." O uso é "Até três vezes por cena".
- **Problema:** mistura "por cena" com "neste combate". "Por combate" não existe mais.
- **Correção:** trocar "neste combate" por "nesta cena" e "do combate" por "da cena" nos dois campos.
- **Decisão do Pedro?** não

### [LACUNA] medicina · estágio 20 · Último Recurso
- **Hoje:** "recuperar metade da Vida máxima e encerrar uma condição grave que possa ser tratada."
- **Livro:** Condições › Peso da condição: "Grave | As condições de longo prazo deste tópico, Ferido e qualquer aflição no estágio 3 ou mais." e Ferimentos › Remover Ferido: "Poder ou tratamento que remova Ferido fora do descanso precisa dizer isso com todas as letras."
- **Problema:** "grave" inclui Ferido e lesões de longo prazo, e a frase não diz com todas as letras. "Que possa ser tratada" é vago.
- **Correção:** "...encerrar uma condição grave que Cura possa tratar (lesão de longo prazo ou aflição no estágio 3 ou mais). Não remove Ferido."
- **Decisão do Pedro?** sim, porque ele pode querer que remova Ferido.

### [INCOERÊNCIA] milagre · descricao e usos
- **Hoje:** "Uma vez a cada cinco sessões... restaure um membro perdido ou remova uma condição gravíssima."
- **Livro:** Condições › Membros e sentidos perdidos: "Só volta com Regeneração de um Fluxo que cite membro perdido ou com um implante" e Ferimentos › Voltar a ter o membro: "Regeneração: só um efeito de Fluxo que diga, com todas as letras, que restaura um membro perdido."
- **Problema:** (1) a habilidade não é de Fluxo, então contradiz a regra de que só Regeneração ou implante devolvem o membro. (2) Perda de membro e de sentido já é "gravíssima" na escala, então "membro perdido ou gravíssima" repete; faltam olho, ouvido, voz e maldição. (3) "A cada cinco sessões" não é uma janela do Livro (rodada, turno, cena, descanso, sessão).
- **Correção:** "Uma vez por sessão, durante um descanso completo e com 12 Mana, restaure um membro ou sentido perdido ou encerre uma maldição. Vale como a Regeneração de Ferimentos. Não ressuscita mortos nem remove consequências narrativas sem aprovação do Mestre." Se ele quiser manter o ritmo raro, escrever "uma vez por arco".
- **Decisão do Pedro?** sim, porque é decisão de design sobre quanto o Médico contorna a perda de membro.

### [LACUNA] mestre-da-vida · descricao
- **Hoje:** "nenhum aliado a até 12 m de você morre: quem morreria fica com 1 de Vida, e quem estiver a 0 de Vida se levanta com 1 de Vida no começo do próprio turno. Ao ativar, cada aliado na área recupera 4d8 + Mod. Sabedoria"
- **Livro:** Magia e Fluxo › Termos das magias: "Alcançar o próprio Fim. A criatura morre, e nenhuma magia de círculo menor que o 10º a traz de volta." / Tipos de dano › Dano verdadeiro.
- **Problema:** "nenhum aliado morre" é absoluto, sem dizer se vale contra o Fim ou dano verdadeiro. Quem está a 0 já é curado em 4d8 ao ativar, então "se levanta com 1 de Vida" só faz sentido para quem cair depois. E "na área" não existe: o texto fala só em alcance.
- **Correção:** "Por três rodadas, nenhum aliado a até 12 m de você morre por perda de Vida: quem morreria fica com 1 de Vida e quem cair a 0 de Vida se levanta com 1 de Vida no começo do próprio turno. Isso não impede o Fim nem a morte por efeito que a descreva como tal."
- **Decisão do Pedro?** sim, porque é decisão sobre o teto da habilidade final.

### [INCOERÊNCIA] necessaire · acao e efeito
- **Hoje:** acao "Passivo", usos "Três remédios por descanso": "Cada um, com uma Ação Padrão, encerra Envenenado, Sangramento ou um degrau de Cansaço."
- **Livro:** Poderes e Habilidades › Poder: "Custo zero quer dizer passivo: ele funciona sem você fazer nada." e Condições › Envenenado: "Se o veneno for uma aflição do catálogo, use o estágio dela em vez deste dano."
- **Problema:** (1) Passivo, mas pede preparar após o descanso e gastar Ação Padrão: o campo acao deveria ser "Fora de combate" (preparo) com momento. (2) Se o veneno for aflição, "encerra Envenenado" não diz se apaga a aflição inteira (o que só o Antídoto faz) ou reduz 1 estágio. (3) "Degrau de Cansaço" não é termo do Livro (é "1 de Cansaço").
- **Correção:** acao "Fora de combate", momento "preparo após o descanso completo; usar o remédio é Ação Padrão". Descrição: "Após um descanso completo, prepare três remédios. Cada um, com uma Ação Padrão, encerra Sangramento ou Envenenado, ou tira 1 de Cansaço. Contra veneno que seja aflição, o remédio reduz 1 estágio. Eles expiram no descanso seguinte."
- **Decisão do Pedro?** não

### [LACUNA] maleta-medica · descricao
- **Hoje:** "tenha instrumentos adequados e possa tratar condições médias que exijam equipamento."
- **Livro:** Condições › Peso da condição: "Média | Atordoado, Cego, Imobilizado, Paralisado e as crises de Sanidade." / "Quem trata um degrau trata também os de baixo."
- **Problema:** não diz qual teste, qual DT, nem quais condições médias "exigem equipamento". A cura da classe só remove condição leve (e grave no 20), então a média fica sem regra.
- **Correção:** "Por uma cena, com os instrumentos na mão, a remoção de condição da sua cura também alcança uma condição média (Atordoado, Cego, Imobilizado ou Paralisado) de um alvo, com um teste de Cura contra a DT Padrão do nível do paciente."
- **Decisão do Pedro?** sim, porque define o que o poder trata.

### [MELHORIA] medico-de-campo · descricao
- **Hoje:** "ao se deslocar diretamente até um aliado caído."
- **Livro:** Condições › Caído: condição oficial ("Ataques corpo a corpo contra você recebem +2...").
- **Problema:** "caído" minúsculo é ambíguo entre a condição Caído e o aliado a 0 de Vida (que é o que o poder quer).
- **Correção:** "...ao se deslocar diretamente até um aliado a 0 de Vida ou Caído."
- **Decisão do Pedro?** não

### [LACUNA] isso-e-bom · descricao
- **Hoje:** "Ao usar um kit médico, além da cura normal, restaure 2d4 Mana do alvo, uma vez por cena."
- **Livro:** Loja/Equipamentos: não existe item "Kit Médico" (o catálogo tem Antídoto, Material Medicinal, Kit de Aventureiro). Conferido em `data/loja/catalogo.json`.
- **Problema:** o gatilho é um item que não existe. Nenhuma habilidade da classe usa kit.
- **Correção:** "Ao fazer o Tratamento, além da cura normal, restaure 2d4 Mana do alvo, uma vez por cena." Acrescentar momento "ao curar".
- **Decisão do Pedro?** sim, porque ele pode preferir criar o item na Loja.

### [INCOERÊNCIA] plantao · descricao
- **Hoje:** "Ignore a penalidade do degrau Fatigado na primeira vez em que chegar a ele na sessão."
- **Livro:** Descanso › Cansaço: "2: Fatigado | −2 em testes físicos e −1 Iniciativa." / Poderes e Habilidades: "Por sessão... Fica para o que é de história, informação, dinheiro e sorte... Poder de combate volta no descanso."
- **Problema:** "na sessão" é a janela errada (efeito de Cansaço é de corpo, volta por descanso). Também não diz por quanto tempo ignora, nem o que acontece se o Cansaço pular de 1 para 3.
- **Correção:** "Uma vez por descanso, quando o seu Cansaço chegar a 2 (Fatigado), ignore a penalidade dele até o próximo descanso completo."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] socorro-de-emergencia · protocolos Adrenalina e De Pé de Novo
- **Hoje:** Adrenalina: "vantagem no primeiro ataque que fizer neste turno" (duracao "Este turno"). De Pé de Novo: duracao "Imediato" mas "pode gastar a própria Ação de Movimento".
- **Livro:** Combate › Reações: a Reação é gasta no turno de quem causou a queda, quase sempre um inimigo.
- **Problema:** o Socorro dispara fora do turno do aliado, então "neste turno" não tem ataque do aliado para ajudar, e "Imediato" contradiz gastar uma ação que só existe no turno dele.
- **Correção:** Adrenalina: "vantagem no primeiro ataque que fizer no próximo turno dele" (duracao "Até o fim do próximo turno do aliado"). De Pé de Novo: duracao "Até o fim do próximo turno do aliado".
- **Decisão do Pedro?** não

### [MELHORIA] socorro-de-emergencia · protocolos de nome e condição
- **Hoje:** Escudo de Urgência: "+2 de Defesa até o início do seu próximo turno." Reflexo de Emergência: "caso a tivesse perdido ao cair." Contra o Choque e Fôlego Extra como títulos.
- **Livro:** Condições › Resguardado: "+2 de Defesa. Não acumula consigo mesmo." / Combate › Reações: "Você tem uma reação por rodada" / Ferimentos: "Choque" é um resultado da tabela de trauma / Perigos: Fôlego é prender o ar.
- **Problema:** Escudo de Urgência recria a condição Resguardado sem usar o nome e perde a regra de não acumular. Reflexo de Emergência fala em "perder a reação ao cair", que o Livro não define (a reação só se perde por gasto ou pelo trauma Choque). Contra o Choque e Fôlego Extra repetem nomes de regras que significam outra coisa.
- **Correção:** Escudo de Urgência: "O aliado socorrido fica Resguardado até o início do próximo turno dele." Reflexo de Emergência: "Se o aliado socorrido já gastou a Reação nesta rodada, ele a recupera." Sugestão de títulos: "Segura o Golpe" no lugar de "Contra o Choque" e "Pulso Extra" no lugar de "Fôlego Extra" (só `titulo`, mantendo `id`).
- **Decisão do Pedro?** sim, porque é escolha de nome e de dar uma segunda Reação por rodada.

### [MELHORIA] sou-medico · descricao
- **Hoje:** "Receba vantagem para resistir a doenças"
- **Livro:** Venenos, Doenças e Vícios › Aplicação: "teste Fortitude contra a DT da aflição" na exposição e no fim de cada intervalo.
- **Problema:** não diz qual teste nem se vale no intervalo.
- **Correção:** "Receba vantagem nos testes de Fortitude contra doenças, na exposição e no fim de cada intervalo, e +1 em Diplomacia ou Enganação quando se apresentar como profissional de saúde."
- **Decisão do Pedro?** não

### [LACUNA] cirurgia · descricao
- **Hoje:** "trate um aliado que entrou em Morrendo desde o último descanso; ele recupera toda a Vida, mas mantém condições não tratadas."
- **Livro:** Condições › Lesão Interna: "Cura DT 18, com ferramentas e uma hora de calma, para operar." / Manqueira: "Cirurgia de Cura DT 20" / Ferimentos › Remover Ferido.
- **Problema:** não diz se Cirurgia é o ato de operar (Lesão Interna, Manqueira) nem se tira Ferido. "Condições não tratadas" deixa dúvida sobre Ferido.
- **Correção:** "...ele recupera toda a Vida e, se o paciente tiver Ferido, tira 1 de Ferido. A Cirurgia vale como a operação de Lesão Interna e de Manqueira, sem teste. Mantém as outras condições não tratadas."
- **Decisão do Pedro?** sim, porque amplia o poder.

### [MELHORIA] eu-sei-curar e aula-de-anatomia · campos
- **Hoje:** Eu Sei Curar: Ação Livre sem `momento`. Aula de Anatomia: "vantagem contra perda de Sanidade".
- **Livro:** Condições › Sanidade: "Teste de Sanidade rola a perícia, e perder Sanidade tira pontos da barra."
- **Problema:** Eu Sei Curar deveria dizer `momento` ("depois de rolar a cura"). Aula de Anatomia mistura o teste com a perda; vantagem só existe em teste.
- **Correção:** Eu Sei Curar: momento "depois de rolar a cura". Aula de Anatomia: "Receba vantagem em testes de Sanidade contra perda causada apenas por sangue, órgãos ou procedimentos médicos."
- **Decisão do Pedro?** não

### [MELHORIA] dt_efeitos · descricao
- **Hoje:** "role Cura no momento do tratamento. O resultado da sua rolagem é a DT que o alvo precisa alcançar." (inclui Percepção)
- **Livro:** Combate › Defesas passivas: "use 10 + bônus total"; Perícias › DT Padrão.
- **Problema:** nenhuma habilidade ou poder do Médico obriga o alvo a testar contra uma DT do Médico (Contra o Medo usa a DT da fonte do medo). A regra "DT é a rolagem" não aparece no Livro, e Percepção não é defesa passiva.
- **Correção:** "Quando um efeito seu pedir teste do alvo, a DT é 10 + bônus de Cura." ou remover o bloco se nada o usar.
- **Decisão do Pedro?** sim, porque depende de planejar efeitos futuros.

## Pop Star (pop-star)

### [ERRO] publi/rede-de-estalagens · descricao e escalonamento
- **Hoje:** "O descanso ali conta como Bom." / "Nível 3: o descanso conta como Ótimo."
- **Livro:** Descanso › Descanso completo: as qualidades são "Péssima, Ruim, Boa, Maravilhosa, Excelente"; Excelente "depende de autorização do Mestre".
- **Problema:** "Bom" e "Ótimo" não são qualidades de descanso ("Ótimo" não existe).
- **Correção:** descricao: "O descanso ali conta como Boa." escalonamento: "Nível 3: o descanso conta como Maravilhosa."
- **Decisão do Pedro?** não

### [LACUNA] estrela-eterna · descricao
- **Hoje:** "recebem 8 de Mana temporária e 8 de Estamina temporária... A Mana e a Estamina temporárias desaparecem ao fim da cena e não se acumulam."
- **Livro:** Sistema base › Mana e Estamina: só existem Mana e Estamina com máximo; "temporário" só aparece em drenagem de atributo e em bônus de atributo.
- **Problema:** "Mana/Estamina temporária" não é recurso do Livro. Não diz se passa do máximo nem qual se gasta primeiro.
- **Correção:** "recebem 8 de Mana e 8 de Estamina que podem passar do máximo, são gastas antes das normais e desaparecem ao fim da cena. Não se acumulam com outra apresentação."
- **Decisão do Pedro?** sim, porque define se o recurso passa do teto.

### [LACUNA] estrela-eterna · "permanece com 1 de Vida"
- **Hoje:** "quando um desses aliados cair a 0 de Vida, ele permanece com 1 de Vida."
- **Livro:** Ferimentos › Vida negativa: "Se o Déficit chegar à sua Vida máxima, você morre na hora" / "Quem acorda ganha Ferido 1" / trauma por golpe que tira metade da Vida.
- **Problema:** mesmo vazio do Socorro de Emergência do Médico: não diz se anula morte por Déficit, Morrendo, Ferido e trauma.
- **Correção:** "...ele ignora o Déficit de Vida e fica com 1 de Vida, sem Morrendo, sem Ferido e sem tabela de trauma por esse golpe."
- **Decisão do Pedro?** sim, porque anula Ferido e trauma.

### [LACUNA] fama · estágio 5 (Fama Regional)
- **Hoje:** "Com um teste de Atuação (DT 15, ou 20 se ela estiver hostil) você acalma ou anima uma multidão pequena"
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: DT numérica de regra é a do nível 1; Conflito Social: "A DT é a Padrão do nível do grupo. Use a Difícil quando..."
- **Problema:** DT 15 e 20 soltas, sem ajuste de nível. "Acalma ou anima" não diz o efeito, a duração nem o limite de uso (sem janela, vale a cada Ação Completa).
- **Correção:** "Com uma Ação Completa e um teste de Atuação contra a DT Padrão do nível do lugar (Difícil se a multidão estiver hostil), você acalma uma multidão pequena, até umas cinquenta pessoas, que não vira tumulto até o fim da cena, ou a anima, e ela dá +1 nos testes sociais do grupo diante dela até o fim da cena. Uma vez por cena."
- **Decisão do Pedro?** sim, porque o efeito e o limite são escolha de design.

### [LACUNA] fama · estágio 15 (Fama Mundial)
- **Hoje:** "consiga na região uma audiência com quem manda, um contato de peso ou um palco livre"
- **Livro:** Contatos e Laços: contato tem ramo e Confiança de 1 a 3, e cada personagem mantém até 2 + Mod.Carisma. Prestígio, Fama e Procura: "Acesso permite solicitar. Não garante... ordem obedecida."
- **Problema:** não diz como o "contato de peso" entra na ficha, nem que a audiência é só um pedido.
- **Correção:** "Uma vez por sessão, consiga na região uma audiência com quem manda (você pode pedir, e o Mestre decide a resposta), um contato Conhecido de um ramo à sua escolha, que conta no seu limite de contatos, ou um palco livre para se apresentar."
- **Decisão do Pedro?** não

### [LACUNA] publi/energetico · Cansaço
- **Hoje:** "uma lata remove 1 de Cansaço de quem beber" / "Nível 4: três latas por sessão, e cada uma remove 2 de Cansaço."
- **Livro:** Perigos › Fome e sede: "O Cansaço de fome e sede não sai com descanso enquanto a causa continua." Descanso › Cansaço: trilha de 0 a 6.
- **Problema:** no nível 4 são até 6 de Cansaço por sessão, a trilha inteira. Também não diz que não vale contra o Cansaço de fome, sede ou aflição.
- **Correção:** "...remove 1 de Cansaço de quem beber. Não remove o Cansaço de fome e sede enquanto a causa continua." Revisar o nível 4 (sugestão: três latas de 1 de Cansaço).
- **Decisão do Pedro?** sim, porque é um número de equilíbrio.

### [LACUNA] publi/destilaria · escalonamento nível 2
- **Hoje:** "isso vale um teste de Investigação de graça."
- **Livro:** Investigações › Achar uma pista: "Falha: a pista, e um custo" (pinta o relógio do caso).
- **Problema:** "de graça" pode ser teste extra sem custo de tempo ou sucesso automático. O Livro não tem nenhum dos dois.
- **Correção:** "o dono conta o que anda ouvindo, e você faz um teste de Investigação sobre o caso sem gastar tempo, e uma falha não pinta o relógio do caso."
- **Decisão do Pedro?** não

### [LACUNA] agencia-de-marketing · descricao (Crise e Busca)
- **Hoje:** "Crise: a equipe abafa um escândalo ou um boato sobre o grupo, e quem só ouviu falar deixa de acreditar. Busca: a equipe localiza uma pessoa ou um endereço na região em até uma hora"
- **Livro:** Prestígio, Fama e Procura: Procura só cai por contato dentro da lei, suborno, cena que limpe o nome ou perdão; Entre aventuras: "Procurar uma pessoa específica... um teste por dia".
- **Problema:** Crise não diz se mexe em Procura ou Fama (pelo Livro, não). Busca pula o teste por dia da procura de pessoa.
- **Correção:** Crise: "...deixa de acreditar. Isso não baixa Procura nem Fama e não apaga o que testemunhas viram." Busca: "...contanto que a pessoa tenha rosto conhecido em algum lugar. Vale como todos os dias de Procurar uma pessoa específica, mas não entrega pista essencial de caso."
- **Decisão do Pedro?** sim, porque define se a agência limpa Procura.

### [INCOERÊNCIA] patrocinio-premium · acao
- **Hoje:** acao "Passivo", usos "Uma vez por sessão": "peça a uma das suas marcas um consumível comum"
- **Livro:** Poderes e Habilidades › Poder: "Custo zero quer dizer passivo: ele funciona sem você fazer nada."
- **Problema:** pedir à marca é um ato, não passivo. Também "consumível comum" não diz raridade.
- **Correção:** acao "Fora de combate", momento "um recado para a marca". Texto: "peça a uma das suas marcas um consumível de raridade Comum..."
- **Decisão do Pedro?** não

### [LACUNA] turne-mundial · descricao
- **Hoje:** "consiga hospedagem e transporte comuns para o grupo"
- **Livro:** Tempo Entre Aventuras › Quanto custa viver: noite em estalagem 3 Lunaris, viagem de carroça 5 por dia; Transporte: rotas pagas por personagem.
- **Problema:** não diz se cobre o custo de vida do intervalo entre aventuras nem passagem de Trem ou Aeronave. Também se sobrepõe a Rede de Estalagens e Transportadora.
- **Correção:** "...hospedagem e transporte comuns (estalagem e carroça) para o grupo. Não cobre passagem de Trem ou Aeronave nem rota entre Árvores."
- **Decisão do Pedro?** sim, porque pode querer que cubra o custo de vida.

### [LACUNA] autografo · descricao
- **Hoje:** "melhore a atitude dela em um degrau na escada do Prestígio, até o fim da cena."
- **Livro:** Prestígio, Fama e Procura: Prestígio é relação com facção, com ajuste de teste social e Acesso por nível; Conflito Social: "O Prestígio com a facção da pessoa ajusta a rolagem... em no máximo 2".
- **Problema:** usa a escada do Prestígio para a atitude de uma pessoa, e não diz se o degrau dá o ajuste de teste social, o Acesso ou o desconto, nem se altera o Prestígio guardado.
- **Correção:** "...melhore a atitude dela em um degrau na escada do Prestígio até o fim da cena. Vale o ajuste de teste social do degrau novo, e só isso: não dá Acesso nem desconto e não altera o Prestígio da ficha."
- **Decisão do Pedro?** sim, porque pode querer que dê Acesso.

### [LACUNA] pose-de-diva · descricao
- **Hoje:** "A primeira criatura que tentar atacar você testa Vontade contra a sua DT de Palco; em falha, ela gasta o ataque em outro alvo válido ao alcance dela."
- **Livro:** Combate › Reações / dt_efeitos da classe: "role Atuação na hora em que você se apresenta".
- **Problema:** não diz quando a Atuação é rolada (ao usar, não quando o inimigo ataca) nem o que acontece sem outro alvo válido.
- **Correção:** "Ao usar, role Atuação: o total é a sua DT de Palco desta rodada. ...em falha, ela gasta o ataque em outro alvo válido ao alcance dela. Se não houver, o ataque se perde."
- **Decisão do Pedro?** não

### [MELHORIA] minha-voz-vale-ouro, clipe-polemico · campos
- **Hoje:** Minha Voz: Ação Livre sem `momento`. Clipe: "desvantagem no próximo teste para consertar a sua imagem."
- **Livro:** Combate › Seu turno: Ação Livre só ativa habilidade quando a regra permitir; Prestígio, Fama e Procura: nenhum mecanismo de "imagem".
- **Problema:** falta dizer quando entra a vantagem; "consertar a imagem" não tem teste no Livro.
- **Correção:** Minha Voz: momento "antes de rolar". Clipe: "desvantagem no próximo teste de Diplomacia, Atuação ou Enganação feito para limpar o seu nome".
- **Decisão do Pedro?** não

### [LACUNA] bis · descricao
- **Hoje:** "Quando um aliado a até 9 m falhar num teste, peça bis: ele rola de novo e fica com o novo resultado."
- **Livro:** Ferimentos › Morrendo: teste de Fortitude por turno; Ações coletivas › Teste de Grupo.
- **Problema:** "teste" inclui ataque, Morrendo e Teste de Grupo. Rerrolar Morrendo e ataque pode ser mais forte do que o pretendido.
- **Correção:** "falhar num teste de perícia ou ataque (não de Morrendo)". Cada teste só pode ser rerrolado uma vez, de qualquer fonte.
- **Decisão do Pedro?** sim, porque delimita a força.

### [LACUNA] cosmeticos, pose-de-diva, lancamento-surpresa, fama · bônus sociais empilhados
- **Hoje:** Atuação +1 a +5 (Fama), Cosméticos +2 a +4, Pose de Diva +2, Lançamento Surpresa +2, e quatro fontes de vantagem.
- **Livro:** Ações coletivas › Ajudar: máximo +4; Prestígio, Fama e Procura: "O ajuste de teste social... nunca passa de ±2".
- **Problema:** sem teto, um teste social chega a +13 ou mais, com Ajuda ainda por cima. O Livro só limita os ajustes de Prestígio e Fama.
- **Correção:** "Bônus de classe em testes sociais de fontes diferentes (Cosméticos, Pose de Diva, Lançamento Surpresa) não se somam: vale o maior." (Fama em Atuação continua à parte.)
- **Decisão do Pedro?** sim, porque é teto de equilíbrio.

### [MELHORIA] casa-de-moda · escalonamento nível 3
- **Hoje:** "conta como uma armadura simples de +2 sem parecer uma."
- **Livro:** Equipamentos › Armaduras e escudos: "No máximo uma armadura principal... Duas armaduras principais nunca somam."
- **Problema:** não diz se a roupa ocupa a vaga de armadura principal.
- **Correção:** "conta como a sua armadura principal simples de +2 de Defesa, sem parecer uma, e não soma com outra armadura principal."
- **Decisão do Pedro?** não

### [MELHORIA] entrevista (evento) · descricao
- **Hoje:** "O resultado pode alterar reputação, abrir contatos ou gerar complicações narrativas."
- **Livro:** Prestígio, Fama e Procura: "Reputação Bancária é outro valor"; as escalas são Prestígio, Fama e Procura.
- **Problema:** "reputação" solta se confunde com Reputação Bancária.
- **Correção:** "O resultado pode mexer na sua Fama ou no Prestígio com uma facção, abrir contatos ou gerar complicações."
- **Decisão do Pedro?** não

### [MELHORIA] dt_efeitos · descricao
- **Hoje:** "role Atuação na hora em que você se apresenta. O resultado da rolagem é a DT... (Vontade, Reflexos ou Percepção)"
- **Livro:** Conflito Social: "Essas rolagens não controlam a mente de ninguém"; Combate › Defesas passivas.
- **Problema:** nenhum poder usa Percepção. Também não diz que, num Conflito Social, valem Resistência e Paciência e não esta DT.
- **Correção:** "Quando um poder seu manda alguém testar Vontade ou Reflexos... Dentro de um Conflito Social, valem as contagens daquela cena, e não a DT de Palco."
- **Decisão do Pedro?** não

## Comerciante (comerciante)

### [ERRO] tarefas_bancada · "Fácil do seu nível" e referência da tabela
- **Hoje:** dt "Fácil do seu nível"; descricao: "saem da tabela de DT por nível do desafio, no capítulo Sistema Base."
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: "A Rotineira fica 5 abaixo da Padrão, e a Difícil, 5 acima."
- **Problema:** "Fácil" não existe (é Rotineira) e a tabela está em Perícias.
- **Correção:** dt "Rotineira do seu nível"; descricao "...saem da tabela de DT em Perícias, pelo nível do desafio."
- **Decisão do Pedro?** não

### [ERRO] estoque/venenos-e-reagentes · escalonamento nível 4
- **Hoje:** "Nível 4: aflição rara, com o estágio inicial mais alto."
- **Livro:** Venenos, Doenças e Vícios › Aplicação: "Falha aplica o estágio 1 depois da incubação."
- **Problema:** não existe estágio inicial mais alto. Toda aflição começa no estágio 1.
- **Correção:** "Nível 4: aflição de DT Fortitude 16 ou mais (como Peçonha Hemorrágica)."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] rede-de-negocios · estágio 1 × escolha_opcoes
- **Hoje:** est. 1: "Dentro dela você tem +2... e conhece um contato confiável." Opções: "o +2, o desconto e os contatos valem onde aquele comércio acontece, em qualquer cidade que você visite."
- **Livro:** Contatos e Laços: o contato tem lugar, ramo e Confiança.
- **Problema:** "dentro dela" é a região da rede ou o tipo de mercado em qualquer cidade? As duas frases discordam.
- **Correção:** est. 1: "Escolha uma praça na lista abaixo. Em qualquer cidade, no comércio dessa praça, você tem +2 em Ofício (Comércio) e conhece um contato..." (tirar "diga ao Mestre em que região a sua rede começou" ou usá-lo só para dizer onde mora o contato).
- **Decisão do Pedro?** sim, porque define o alcance da classe.

### [LACUNA] rede-de-negocios · estágios 1 e 5 · contato
- **Hoje:** "conhece um contato confiável: alguém com nome, cara e um motivo para te atender. O contato some se você queimar ele."
- **Livro:** Contatos e Laços › Ganhar e perder contatos: "A Confiança cai quando o contato sai prejudicado... e em 0 o contato se perde." / limite de 2 + Mod.Carisma.
- **Problema:** não diz ramo, Confiança inicial nem se conta no limite de contatos. "Queimar" não é termo do Livro.
- **Correção:** "...conhece um contato Amigo (Confiança 2) do ramo da praça, que não conta no seu limite de contatos. Perder a Confiança dele segue Contatos e Laços."
- **Decisão do Pedro?** sim, porque pode querer que conte no limite.

### [MELHORIA] rede-de-negocios · estágio 5 e tarefas_bancada · "item comum" e "banda normal"
- **Hoje:** "compra por 10% menos em item comum" / "Fechar compra ou venda acima da banda normal de preço. Teto de 20%".
- **Livro:** Economia › A escada dos preços: raridade Comum; Loja: preços do catálogo; Prestígio: "Descontos de facção não se acumulam entre si".
- **Problema:** "item comum" confunde com raridade Comum, e "banda normal de preço" não existe no Livro.
- **Correção:** "compra por 10% menos item de raridade Comum" e "Teto de 20% sobre o preço do catálogo, para cima ou para baixo."
- **Decisão do Pedro?** não

### [LACUNA] rede-de-negocios · estágio 10 (Todo Mundo Deve Um Favor)
- **Hoje:** "localize um item de raridade Comum ou Incomum à venda na região"
- **Livro:** Loja › O que decide o local: veneno, implante e contrabando "caem no Mercado Negro por natureza", que "começa trancado".
- **Problema:** um item Incomum de Mercado Negro (veneno, implante) seria achado mesmo com o local fechado.
- **Correção:** "...à venda na região, nos locais de compra que a campanha tem abertos."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] rede-de-negocios · estágio 15 (A Rede Trabalha por Você)
- **Hoje:** "fornece ao grupo transporte, hospedagem ou informação comum, sem cobrar na hora. O favor entra na conta"
- **Livro:** Contatos e Laços › Favores: favor Grande pede Amigo, Diplomacia e deixa uma Dívida; "A Dívida é do contato."
- **Problema:** não usa Favor nem Dívida, e não diz que dispensa o teste.
- **Correção:** "...um contato seu faz ao grupo um favor Grande (transporte, hospedagem ou informação comum), sem teste. O contato guarda uma Dívida, como em Contatos e Laços."
- **Decisão do Pedro?** não

### [LACUNA] mercado-mundial · descricao
- **Hoje:** "até quatro itens publicados de raridade Rara ou inferior, com preço total máximo de 20.000 Lunaris... os demais retornam ao fornecedor ao fim da sessão."
- **Livro:** Loja › Quando a compra não é um objeto: criatura vira aliado, propriedade vira base, Fruto do Éden "se liga à ficha para sempre". Implantes custam Sanidade (Frutos e Implantes). Economia: Rara custa de 240 a 960 Lunaris.
- **Problema:** "itens publicados" inclui criatura, propriedade, implante e Fruto, que não "retornam". Também o teto de 20.000 só pesa para veículo e propriedade, já que quatro itens Raros custam no máximo uns 5.000.
- **Correção:** "até quatro itens publicados de raridade Rara ou inferior, que a Loja venda nos locais abertos da campanha, com preço total máximo de 20.000 Lunaris. Não vale para criatura, propriedade, implante nem Fruto do Éden."
- **Decisão do Pedro?** sim, porque pode querer incluir veículo ou ajustar o teto.

### [LACUNA] seguro × mercado-mundial, estoque, amostra-gratis · interação
- **Hoje:** Seguro: "Se ele for destruído nesta sessão, você recebe metade do valor dele em Lunaris."
- **Livro:** Economia: valores em Lunaris, Solares e Fragmentos; Mercado Mundial: itens "retornam ao fornecedor".
- **Problema:** dá para segurar um item de Mercado Mundial (até 20.000 Lunaris), de Estoque ou de Amostra Grátis e destruí-lo para receber a metade em dinheiro. Também não diz como converte item cotado em Solares.
- **Correção:** "...recebe metade do valor dele em Lunaris (convertido pelo câmbio, se for cotado em outra moeda). Não cobre item consignado, emprestado, de demonstração ou vindo de habilidade de classe, nem item destruído de propósito pelo segurado."
- **Decisão do Pedro?** não

### [LACUNA] estoque · linhas Provisões e Acampamento, Documentos e Selos
- **Hoje:** "Nível 2: o material sobe a qualidade do descanso em uma categoria. Nível 3: equipamento para clima extremo." / "Nível 4: autorização que atravessa fronteira de árvore."
- **Livro:** Descanso: "Excelente... Depende de autorização do Mestre"; Perigos › Clima: Traje conta como roupa certa e baixa um grau, abrigo suspende os testes; Transporte: rota entre dimensões pede Portal e taxa de 500 Lunaris.
- **Problema:** a categoria acima de Maravilhosa é do Mestre. "Clima extremo" não diz qual regra do clima vale. A autorização não dispensa Portal nem taxa.
- **Correção:** "...sobe a qualidade do descanso em uma categoria, até Maravilhosa." / "...equipamento que conta como roupa certa e baixa o clima um grau (Extremo vira Severo)." / "autorização que vale como papelada para atravessar fronteira de Árvore. Não dispensa o Portal nem a taxa de acesso."
- **Decisão do Pedro?** sim, porque são teto e regra de clima.

### [LACUNA] estoque/venenos-e-reagentes e contrabando · local de compra
- **Hoje:** "Mercadoria cara, ilegal em metade das praças e sempre com comprador." (Venenos não exigem praça)
- **Livro:** Loja: veneno cai "no Mercado Negro por natureza".
- **Problema:** Contrabando pede a praça Mercado Negro, mas Venenos e Reagentes entra em qualquer praça, mesmo com o Mercado Negro trancado na campanha.
- **Correção:** acrescentar em Venenos e Reagentes: "O veneno só entra no estoque se a campanha tiver aberto o Mercado Negro, ou com aval do Mestre."
- **Decisão do Pedro?** sim, porque é decisão sobre o acesso a veneno.

### [LACUNA] tarefas_bancada · "Mover mercadoria proibida"
- **Hoje:** "Falha custa a carga, e às vezes o contato."
- **Livro:** Prestígio, Fama e Procura › Alterar Procura: "+1: Crime visto ou investigado em que o personagem foi identificado."
- **Problema:** não diz se a falha pode gerar Procura.
- **Correção:** "Falha custa a carga, e às vezes o contato. Se foi identificado, a Procura sobe 1 no lugar."
- **Decisão do Pedro?** não

### [LACUNA] contrato-irrecusavel · descricao
- **Hoje:** "Quebrar o contrato conta como quebra de compromisso pela regra de Facções: menos 1 de Prestígio com a facção envolvida"
- **Livro:** Prestígio, Fama e Procura › Alterar Prestígio: "−1: Romper compromisso aceito... A mesma consequência é registrada uma vez."
- **Problema:** não diz o que vale quando nenhuma facção está no acordo (só pessoas).
- **Correção:** "...menos 1 de Prestígio com a facção envolvida, se houver uma, e a notícia corre nas suas praças."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] eu-conheco-alguem, mercado-paralelo, logistica · acao
- **Hoje:** acao "Ação Completa" para apresentar um contato, localizar item e organizar entrega.
- **Livro:** Poderes e Habilidades › Como ler a ação: "Ritual como ação virou Fora de combate + momento"; Ação Completa é turno de combate.
- **Problema:** são usos sociais e de bastidor, sem rodada. O campo deveria dizer "Fora de combate".
- **Correção:** acao "Fora de combate", momento "uma hora de conversa" (ou o tempo que o Mestre der).
- **Decisão do Pedro?** não

### [LACUNA] eu-conheco-alguem · descricao
- **Hoje:** "apresente um contato plausível... ela existe a partir de agora e lembra de você."
- **Livro:** Contatos e Laços: "Passou do limite de contatos? Um deles esfria."
- **Problema:** não diz a Confiança do contato novo nem se conta no limite.
- **Correção:** "...vira um contato Conhecido (Confiança 1) do ramo que o Mestre achar certo, e conta no seu limite de contatos."
- **Decisão do Pedro?** não

### [LACUNA] clausula-de-saida · descricao
- **Hoje:** "Use a reação para rerrolar um teste social ligado a contrato, acordo ou preço."
- **Livro:** Sistema base › Maestria de Carisma: "uma vez por cena, repita um teste social; mantenha o novo resultado."
- **Problema:** não tem gatilho (de quem é o teste, em que momento) e pode se somar à maestria e ao Bis da Pop Star sobre o mesmo teste.
- **Correção:** "Depois de rolar um teste social seu, ligado a contrato, acordo ou preço, e antes de saber o resultado final, use a Reação para rerrolar. Cada teste só pode ser rerrolado uma vez, de qualquer fonte."
- **Decisão do Pedro?** não

### [MELHORIA] reputacao-de-bom-pagador · descricao
- **Hoje:** "Receba +2 em testes para obter crédito modesto, até 500 Lunaris."
- **Livro:** Prestígio, Fama e Procura: "Reputação Bancária é outro valor... usado para cofres, cartão e loja."
- **Problema:** o nome lembra Reputação Bancária e não diz se mexe nela.
- **Correção:** acrescentar "Isto não altera a Reputação Bancária do Cofre." (ou mudar o título para "Crédito na Praça").
- **Decisão do Pedro?** não

### [MELHORIA] saque-e-uso · usos
- **Hoje:** "Uma vez por rodada, use um consumível... com uma Ação de Movimento, no lugar da Ação Padrão."
- **Livro:** Poderes e Habilidades › Como ler a ação: "Por rodada... É o limite da Reação."; "Por turno: vale uma vez em cada turno."
- **Problema:** uma ação do próprio turno é "por turno". Também "usar" munição ou explosivo pode virar ataque; não diz se o ataque com explosivo também passa para Ação de Movimento.
- **Correção:** usos "Uma vez por turno". Texto: "...use um consumível (poção, veneno, munição especial) ou prepare e arremesse um explosivo, com uma Ação de Movimento, no lugar da Ação Padrão."
- **Decisão do Pedro?** sim, porque explosivo e Ação Padrão mudam o ritmo do turno.

### [LACUNA] demonstracao, oferta-relampago · descricao
- **Hoje:** Demonstração: "soma +1 dado ao dano ou à cura que ele rolar." Oferta Relâmpago: "+2 no próximo teste para usar um item consumível ou ferramenta".
- **Livro:** Combate › Críticos: "Bônus fixo e dado extra... entram uma vez só."
- **Problema:** Demonstração não diz o tipo do dado nem que não multiplica no crítico. Oferta Relâmpago fala em "teste para usar" consumível, que normalmente não tem teste.
- **Correção:** Demonstração: "+1 dado do mesmo tipo que o consumível rola, sem multiplicar no crítico". Oferta: "+2 no próximo teste que fizerem com um consumível ou ferramenta nesta cena".
- **Decisão do Pedro?** não

### [MELHORIA] pechincha, amostra-gratis · campos
- **Hoje:** Pechincha: Ação Livre sem `momento`. Amostra Grátis: "um consumível comum de demonstração, de até 60 Lunaris".
- **Livro:** Economia: Comum vai de 15 a 60 Lunaris.
- **Problema:** falta `momento` em Pechincha. "Comum" deve dizer raridade.
- **Correção:** Pechincha: momento "antes de rolar". Amostra: "um consumível de raridade Comum, de até 60 Lunaris".
- **Decisão do Pedro?** não

### [MELHORIA] dt_efeitos · descricao
- **Hoje:** "role Ofício (Comércio)... O resultado da sua rolagem é a DT que a outra parte precisa alcançar, com Vontade... ou Intuição"
- **Livro:** Conflito Social: Resistência e Paciência resolvem conversa difícil, com DT Padrão do nível.
- **Problema:** não diz que, numa negociação dura, valem as contagens do Conflito Social, e não esta DT.
- **Correção:** acrescentar "Numa negociação difícil, use o Conflito Social: esta DT vale só para um teste isolado."
- **Decisão do Pedro?** não

## Detetive (detetive)

### [ERRO] deducao-metodica · estágio 1 (Primeira Leitura)
- **Hoje:** "role Investigação contra a DT definida pela dificuldade da pista... Mesmo numa falha, revela um detalhe real secundário, nunca a pista central."
- **Livro:** Investigações › Achar uma pista: "Procurou no lugar certo, achou. Se ali tem uma pista essencial... você acha sem rolar." / "Falha: a pista, e um custo." / "As essenciais nunca dependem [do teste]."
- **Problema:** a classe diz que a pista central depende do teste. No Livro a pista essencial vem sem rolar para qualquer um, e o teste decide o que vem junto.
- **Correção:** "Ao examinar uma cena, pessoa ou objeto por um minuto, role Investigação contra a DT Padrão do nível do caso. A pista essencial você acha sem rolar, como qualquer um. Sucesso: um detalhe relevante a mais. Falha: um detalhe real secundário e um custo, como em Investigações."
- **Decisão do Pedro?** sim, porque redefine o que a habilidade principal da classe entrega.

### [ERRO] deducao-metodica · estágio 5 (Detector de Mentiras)
- **Hoje:** "Role Investigação, em vez de Percepção, para perceber se alguém está mentindo na sua frente."
- **Livro:** Perícias › Catálogo: "Intuição | Perceber intenções, emoções, mentiras por comportamento"; Investigações: "Intuição | O que as pessoas escondem".
- **Problema:** perceber mentira é Intuição, não Percepção. A troca faz sentido para Intuição.
- **Correção:** "Role Investigação, em vez de Intuição, para perceber se alguém está mentindo na sua frente. Receba +2 em Investigação."
- **Decisão do Pedro?** não

### [LACUNA] deducao-metodica · estágio 10 e poderes golpe-certeiro-de-logica, ja-vi-esse-golpe · "ponto fraco"
- **Hoje:** Leitura Rápida revela "uma Resistência ou uma vulnerabilidade"; Golpe Certeiro: "Investigação contra 15 + metade do VD dele"; Já Vi Esse Golpe: "cujo ponto fraco você identificou".
- **Livro:** Perícias › Que nível usar: "O da ameaça: o VD da criatura"; DT numérica é a do nível 1 mais o ajuste.
- **Problema:** "ponto fraco" não é termo do Livro e não liga a Leitura Rápida (que revela Resistência) ao Golpe Certeiro (que pede Ação de Movimento e teste). 15 + metade do VD fica abaixo da DT Padrão em VD alto (VD 20: 25 contra 30).
- **Correção:** "Identificar o ponto fraco é uma Ação de Movimento e um teste de Investigação contra a DT Padrão do VD dele. Quem usou a Leitura Rápida da criatura na cena já a identificou, sem teste." Usar "DT Padrão do VD dele" nos dois poderes.
- **Decisão do Pedro?** sim, porque muda a dificuldade do poder.

### [LACUNA] golpe-certeiro-de-logica · descricao
- **Hoje:** "Seu próximo ataque contra ele, até o fim da cena, recebe +2 dados de dano."
- **Livro:** Combate › Críticos: "dado extra vindos de habilidade... entram uma vez só."
- **Problema:** não diz o tipo do dado nem que não multiplica no crítico.
- **Correção:** "recebe +2 dados de dano do mesmo tipo do dado da arma, sem multiplicar no crítico."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] caso-encerrado · descricao
- **Hoje:** "Se estiver errada, o Mestre apenas confirma o erro; a habilidade é gasta e não revela a resposta correta."
- **Livro:** Investigações › Ligar os pontos: "Quem decide o culpado é o grupo. O Mestre não confirma antes, e acusar a pessoa errada tem consequências." e "o Caso Encerrado confirma uma acusação".
- **Problema:** o Livro dá ao Caso Encerrado a confirmação, mas a classe apaga as consequências da acusação errada feita em público.
- **Correção:** acrescentar: "Se estiver errada, a acusação pública continua tendo as consequências que o Mestre decidir."
- **Decisão do Pedro?** não

### [LACUNA] deducao-metodica · estágio 20 (A Peça que Faltava)
- **Hoje:** "faça ao Mestre uma pergunta direta sobre um fato que possa ser inferido das evidências... e receba uma resposta verdadeira."
- **Livro:** Investigações: cada pergunta do caso tem pelo menos 3 pistas e o relógio do caso avança.
- **Problema:** não diz se a resposta pode ser a pista essencial de uma pergunta do caso, nem se mexe no relógio. Falta `momento` na Ação Livre.
- **Correção:** "A resposta vale como a pista essencial da pergunta do caso a que se refere, e não pinta o relógio do caso." momento "ao fim do exame"; (Golpe de Vista e Caso Encerrado também pedem `momento`.)
- **Decisão do Pedro?** sim, porque dá a pista central de graça.

### [LACUNA] perfil-do-suspeito/interrogatorio · descricao
- **Hoje:** "receba vantagem em Investigação ou Intimidação para arrancar informação verdadeira."
- **Livro:** Conflito Social: abordagens Pressionar (Intimidação) e Provar (Investigação); "Num interrogatório, cada ponto de Resistência que cai entrega uma informação"; Limite: "Mesmo com a Resistência a 0, ela não passa do Limite."
- **Problema:** não fala a língua do Conflito Social e a frase "arrancar informação verdadeira" ignora o Limite da pessoa.
- **Correção:** "Num Conflito Social contra um suspeito sob custódia ou disposto a conversar, receba vantagem nas abordagens Pressionar e Provar até o fim da cena. Ele continua sem passar do Limite dele."
- **Decisão do Pedro?** não

### [LACUNA] pergunta-certa · descricao
- **Hoje:** "testa Vontade contra a DT do Detetive. Em falha, responde com sinceridade a uma pergunta"
- **Livro:** Conflito Social: "A pessoa continua decidindo por conta própria, e por isso existe o Limite." Combate › Defesas passivas.
- **Problema:** força a resposta sem respeitar Limite e sem se ligar ao Conflito Social.
- **Correção:** "...Em falha, responde com sinceridade a uma pergunta que não passe do Limite dela. Dentro de um Conflito Social, a falha tira 1 de Resistência e entrega a resposta."
- **Decisão do Pedro?** sim, porque é compulsão de verdade.

### [INCOERÊNCIA] rede-de-informantes · acao e usos
- **Hoje:** acao "Ação Livre", "Uma vez por cena, pergunte ao Mestre um boato ou rumor de rua relevante ao caso"
- **Livro:** Poderes e Habilidades › Como ler a ação: "Por sessão... Fica para o que é de história, informação... " e Contatos e Laços: boato por "Circular e ouvir a cidade".
- **Problema:** informação é janela por sessão, e aqui volta a cada cena. Mais o "caso" não tem número de perguntas.
- **Correção:** usos "Uma vez por sessão", acao "Fora de combate", momento "uma conversa na rua".
- **Decisão do Pedro?** sim, porque é a diferença entre um boato por cena e por sessão.

### [INCOERÊNCIA] conexoes-na-delegacia · acao e favor
- **Hoje:** acao "Passivo", usos "Uma vez por sessão": "peça um favor razoável a um contato policial, jurídico ou autoridade equivalente"
- **Livro:** Contatos e Laços › Favores: Pequeno ou Grande (este pede Amigo, teste e Dívida).
- **Problema:** pedir um favor é ato, não passivo; e não diz o tipo de favor, teste nem Dívida.
- **Correção:** acao "Fora de combate", momento "uma conversa com o contato". Texto: "...peça um favor Pequeno a um contato policial... Se for Grande, ele guarda uma Dívida. O favor não supera sigilo, segurança nem a autoridade real do contato."
- **Decisão do Pedro?** não

### [MELHORIA] vigilancia · descricao
- **Hoje:** "Siga um alvo sem ser notado por horas seguidas; role Furtividade só uma vez para toda a perseguição"
- **Livro:** Perseguição a pé: distância 0 a 4, teste por rodada; Infiltração: Alerta.
- **Problema:** "perseguição" se confunde com a cena de Perseguição a pé.
- **Correção:** "...role Furtividade só uma vez para todo o acompanhamento, e não a cada intervalo. Isto não vale numa cena de Perseguição a pé, que segue a regra dela."
- **Decisão do Pedro?** não

### [MELHORIA] perfil-psicologico, pericia-forense, leitura-de-documentos · DT e defesa
- **Hoje:** Perfil: "role Investigação contra a Vontade do alvo"; Forense e Documentos: "role Investigação" / "identifique" sem DT.
- **Livro:** Combate › Defesas passivas: "use 10 + bônus total"; Investigações: "contra a DT Padrão do nível do caso".
- **Problema:** "contra a Vontade" sem 10 + bônus, e Forense e Documentos sem DT.
- **Correção:** Perfil: "contra 10 + o bônus de Vontade do alvo". Forense: "contra a DT Padrão do nível do caso". Documentos: "o teste de Investigação contra a DT Padrão do nível do caso decide o que vem junto; a falsificação grosseira se acha sem teste".
- **Decisão do Pedro?** não

### [MELHORIA] sexto-sentido · descricao
- **Hoje:** "Quando fizer um teste para perceber uma armadilha, emboscada ou ameaça escondida, gaste 3 Estamina e use uma Reação para receber vantagem."
- **Livro:** Perigos › Armadilhas › Achar: "quem anda atento usa 10 + bônus de Percepção... Quem para e procura rola."
- **Problema:** quem anda atento não rola, então o poder não liga. Não diz se vale para a Percepção passiva.
- **Correção:** "...ou, ao andar atento, passe a rolar o teste com vantagem no lugar de usar 10 + bônus."
- **Decisão do Pedro?** não

### [MELHORIA] reconstituicao-de-cena · título
- **Hoje:** opção "Reconstituição de Cena" e estágio 15 "Reconstituição".
- **Livro:** Investigações não usa o termo.
- **Problema:** dois nomes quase iguais para coisas diferentes.
- **Correção:** renomear só o `titulo` do estágio 15 para "Relato de Segunda Mão".
- **Decisão do Pedro?** não

### [MELHORIA] dt_efeitos · descricao
- **Hoje:** "role Investigação no momento em que aciona. O resultado da sua rolagem é a DT... (Fortitude, Reflexos, Vontade ou Percepção)"
- **Livro:** Combate › Defesas passivas.
- **Problema:** só A Pergunta Certa usa. Nenhum efeito pede Fortitude, Reflexos ou Percepção.
- **Correção:** "Quando um efeito seu obrigar o alvo a testar Vontade, role Investigação ao acionar: o total é a DT."
- **Decisão do Pedro?** não

## Padrões que se repetem

- **Estado de "cair a 0" sem regra completa** (Médico: Socorro de Emergência e Mestre da Vida; Pop Star: Estrela Eterna). Os três dizem "fica com 1 de Vida" sem dizer o que vale para Déficit, morte imediata, Morrendo, Ferido e trauma. Sugestão: uma frase padrão para as três.
- **Rerrolagem empilhável** (Médico: Mão Experiente, Mão Firme, Eu Sei Curar; Pop Star: Bis; Comerciante: Cláusula de Saída; maestria de Carisma). O Livro não limita. Sugestão: "cada teste ou dado só é rerrolado uma vez, de qualquer fonte".
- **Campo `acao` "Passivo" ou "Ação Completa" em coisa que é ato fora de combate** (Médico: Nécessaire; Pop Star: Patrocínio Premium; Comerciante: Eu Conheço Alguém, Mercado Paralelo, Logística; Detetive: Conexões na Delegacia, Rede de Informantes). O certo é "Fora de combate" com `momento`.
- **"Por sessão" e "por cena" trocados** (Médico: Plantão em "sessão"; Detetive: Rede de Informantes por cena; Comerciante: Saque e Uso "por rodada").
- **DT numérica solta em vez de "DT Padrão do nível"** (Médico: Cura DT 15; Pop Star: Atuação DT 15 e 20; Detetive: 15 + metade do VD).
- **dt_efeitos igual nas quatro classes**: "a rolagem é a DT", citando Percepção e outras defesas que nenhum efeito usa, e sem mencionar o Conflito Social (Pop Star, Comerciante, Detetive) nem o Livro de Defesas passivas.
- **Contatos e favores sem os termos de Contatos e Laços** (Comerciante, Pop Star Fama 15, Detetive Conexões): faltam Confiança, ramo, limite de contatos, Favor Pequeno/Grande e Dívida.
- **Mesmo termo, duas regras** (Médico: Fôlego Extra e Contra o Choque; Comerciante: Reputação de Bom Pagador; Pop Star: "reputação" na Entrevista; Detetive: Reconstituição e Vigilância/perseguição).
- **Itens "de graça" que viram dinheiro ou aliado** (Comerciante: Mercado Mundial e Seguro; Pop Star: Armaria e Farmacêutica). Vale um aviso padrão: nada recebido por habilidade de classe pode ser vendido, segurado ou virar aliado, propriedade ou implante.
- **Dado extra sem tipo** (Detetive: Golpe Certeiro; Comerciante: Demonstração), contra a regra de Críticos.

## Conferido sem problema

- **Médico:** grade de progressão (Habilidade 1,3,5,8,10,14,15,18,20; Poder 2,6,9,11,13,16,17,19; Grau 1,6,11,17; Evento 4,7,12,18); Último Recurso e Mestre da Vida em "por descanso" (combate); Primeiro Atendimento em Reação, por cena; peso leve/média/grave das condições citadas; Contra o Medo com a DT da fonte (bate com Amedrontado); De Pé de Novo e Já levantar sem reação (bate com Provocar reação); Contra o Choque como "reduza em 5 o dano de cada golpe" (formato novo); Cirurgia como Fora de combate; Saúde Perfeita (só afeta a Vida do nível 1); "não ressuscita" bate com Voltar da morte.
- **Pop Star:** tabela da Escada de Fama (níveis e Anonimato +1, 0, −1, −2, −2) bate com Fama; Fama mínima usa "o maior valor" como o Livro; Fama Ampla e Mundial com −1 e −2 de anonimato; atitude da escada do Prestígio com os sete nomes certos; "sem obrigação de obedecer" bate com Prestígio; Refrão com Inspirado (termina ao usar ou ao fim da cena); Faz o L de Luz sem dano (sem regra de metade); Lançamento Surpresa e Bis em janelas certas; Entrevista, grade e Publi com escalonamento por nível de contrato.
- **Comerciante:** grade de progressão; teto de Estoque 60, 240, 960 e 2.000 Lunaris bate com a escada de raridade (Comum 15 a 60, Incomum 60 a 240, Raro 240 a 960, Épico por volta de 2.000); Estoque como Fora de combate, por descanso; Operação Comercial com teto de 2.000; Olho para Valor e tarefas Padrão e Difícil; Contrato Irrecusável com −1 de Prestígio por quebra de compromisso (bate com Alterar Prestígio) e sem controle da mente; Amostra Grátis no teto de Comum.
- **Detetive:** grade de progressão; Instinto de Perigo como exceção explícita ao Surpreendido (bate com "Sem reação até realizar o primeiro turno"); Já Vi Esse Golpe como Reação com gatilho claro; Caso Encerrado como o Livro descreve; Rastro Não Some e Álibi Furado sem choque com regra; Memória Fotográfica e Blefe Perfeito passivos; Reconstituição de Cena sem inventar fato.
