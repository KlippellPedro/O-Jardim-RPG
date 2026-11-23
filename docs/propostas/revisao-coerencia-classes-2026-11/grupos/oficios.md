# Revisão de coerência: classes de ofício (Engenheiro, Alquimista, Chef)

Classes: Engenheiro (engenheiro), Alquimista (alquimista), Chef (cozinheiro).
Conferido contra o Livro de Regras atual (núcleo e tópicos). As cópias de receitas em `data/regras/receitas-materiais.ts` batem palavra por palavra com as classes (40 receitas de Alquimista e Chef, 20 projetos do Engenheiro); não há divergência de texto ali.

## Engenheiro (engenheiro)

### [ERRO] tarefas_bancada · itens[0].dt e descricao
- **Hoje:** "Fácil do seu nível" e "saem da tabela de DT por nível do desafio, no capítulo Sistema Base"
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: "A Rotineira fica 5 abaixo da Padrão, e a Difícil, 5 acima."
- **Problema:** DT "Fácil" não existe (os nomes são Rotineira, Padrão e Difícil), e a tabela mora em Perícias, não em Sistema Base.
- **Correção:** dt: "Rotineira do seu nível". descricao: "As DTs que você enfrenta para trabalhar saem da tabela de DT por nível, em Perícias (Rotineira, Padrão e Difícil)."
- **Decisão do Pedro?** não

### [ERRO] bobina-de-choque · descricao e escalonamento
- **Hoje:** "quem falhar sofre 1d8 de dano de raio e perde a Ação de Movimento no próximo turno" (só no nível 5 "quem passar no teste ainda sofre metade")
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra." (e convenção de dano em área, metade no sucesso)
- **Problema:** dano em área com teste deveria dar metade a quem passa desde o nível 1. Hoje quem passa não sofre nada até o nível 5.
- **Correção:** "Cada criatura na área testa Fortitude contra a sua DT de Engenheiro. Quem falhar sofre 1d8 de dano de raio e perde a Ação de Movimento no próximo turno. Quem passar sofre metade do dano e nenhum efeito extra." Escalonamento: "Nível 2: o dano sobe para 2d8. Nível 5: o dano sobe para 3d8."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] sirene-chamariz, projetor-holografico, dt_efeitos · defesa
- **Hoje:** "Percepção contra a DT do Engenheiro" (e dt_efeitos: "testar Fortitude, Reflexos, Vontade ou Percepção")
- **Livro:** Perícias › Catálogo: Vontade resiste a "medo, coerção, ilusões, encantamentos"; só Fortitude, Reflexos e Vontade têm Defesa passiva.
- **Problema:** ilusão e engodo sonoro são resistidos por Vontade no Livro. Percepção como teste de resistência não existe.
- **Correção:** trocar a defesa das duas engenhocas por "Vontade contra a DT do Engenheiro" e o dt_efeitos por "Fortitude, Reflexos ou Vontade".
- **Decisão do Pedro?** sim, porque o dt_efeitos lista Percepção de propósito.

### [INCOERÊNCIA] carga-de-fumaca · descricao
- **Hoje:** "Quem está dentro recebe camuflagem, e ataques à distância que atravessam a nuvem sofrem −2."
- **Livro:** Combate › Ver e ser visto: "Camuflagem ... ataques contra quem está camuflado têm −2".
- **Problema:** a camuflagem já dá −2. O segundo −2 ou repete a regra ou soma −4 sem dizer. (A Névoa Densa do Alquimista tem o mesmo texto.)
- **Correção:** "Enche uma esfera de 6 m por três rodadas. Quem está dentro fica camuflado: ataques contra essa criatura têm −2. Vento forte encurta a duração para uma rodada."
- **Decisão do Pedro?** sim, porque pode ter sido pensado como penalidade extra para quem atira através da nuvem.

### [INCOERÊNCIA] injetor-de-reparo, aranha-de-reparo, engenho-divino (Reparação) · dano
- **Hoje:** "Restaura 2d6 de Vida em um construto, veículo, arma, armadura ou criação sua"
- **Livro:** Criação, Forja e Alquimia › Reparos: "O reparo restaura a Durabilidade atual até a Durabilidade máxima" (arma e armadura têm Durabilidade, veículo e construto têm Vida).
- **Problema:** arma e armadura não têm Vida. Falta dizer o que o dado cura nelas.
- **Correção:** "Restaura 2d6 de Vida em um construto, veículo ou criação sua. Em arma ou armadura, o toque conserta o item no lugar de dar Vida (Durabilidade, em Criação, Forja e Alquimia)." Igual na Aranha de Reparo e na Reparação do Engenho Divino.
- **Decisão do Pedro?** sim, porque falta decidir quanta Durabilidade 2d6 devolve.

### [INCOERÊNCIA] meus-filhos · estágio 1 e tarefas_bancada (Ofício × Tecnologia × Ladinagem)
- **Hoje:** especialidade Eletrônica "terminais da A.X.I.S"; Chave Decodificadora e bancada "Forçar tranca mecânica ou eletrônica" rolam Ofício (Engenharia).
- **Livro:** Perícias › Catálogo: Tecnologia cobre "itens A.X.I.S, sistemas eletrônicos e maquinário avançado; Ofício cobre artesanato comum"; Ladinagem abre fechaduras. Criação › "Tecnologia substitui Ofício apenas para item A.X.I.S".
- **Problema:** a vantagem da especialidade só vale em Ofício (Engenharia), mas o trabalho de eletrônica, A.X.I.S e tranca cai em Tecnologia ou Ladinagem pelo Livro.
- **Correção:** acrescentar ao estágio 1: "Ofício (Engenharia) vale no lugar de Tecnologia para item A.X.I.S, sistema eletrônico e maquinário avançado, e no lugar de Ladinagem para tranca mecânica ou eletrônica."
- **Decisão do Pedro?** sim, porque muda o alcance de uma perícia de classe.

### [LACUNA] nucleo-estavel · descricao
- **Hoje:** "explode em 3 m e causa 1d10" e "10 de Vida temporária por três rodadas"
- **Livro:** Tipos de dano: "Todo dano pertence a uma destas famílias"; "Vida temporária" só aparece no Fruto de Vitalidade, sem regra.
- **Problema:** falta o tipo do dano. E a Vida temporária não tem definição no Livro (ver Padrões).
- **Correção:** "causa 1d10 de dano de impacto".
- **Decisão do Pedro?** não

### [LACUNA] engenho-divino · Artilharia
- **Hoje:** "causa 4d12 de dano de raio a um alvo em até 24 metros no fim de cada um de seus turnos"
- **Livro:** Magia e Fluxo › Ataque e resistência: dano sem rolagem de ataque nem teste de resistência não existe. A Torreta e o WALL-E rolam Ofício no lugar de Pontaria.
- **Problema:** 4d12 por turno, por três rodadas, sem ataque, sem teste e sem dizer de quem é o "seus turnos".
- **Correção:** "No fim de cada turno do engenho, ele ataca um alvo em até 24 metros, rolando o seu Ofício (Engenharia) no lugar de Pontaria, e causa 4d12 de dano de raio se acertar."
- **Decisão do Pedro?** sim, porque mexe no poder da habilidade final.

### [LACUNA] engenho-divino · Bastião
- **Hoje:** "eles reduzem em 10 o dano de cada golpe"
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: a redução vale "depois" da Resistência e não vale contra dano verdadeiro.
- **Problema:** falta a ordem e a exceção.
- **Correção:** "eles reduzem em 10 o dano de cada golpe, depois da Resistência. Dano verdadeiro ignora a redução."
- **Decisão do Pedro?** não

### [LACUNA] tarefas_bancada · "Remontar antes do descanso uma engenhoca já gasta"
- **Hoje:** "Difícil do seu nível. Falha destrói as peças, e aquela vaga só volta no descanso."
- **Livro:** Materiais › Quando o lote dos preparos aumenta: 1 lote de Sucata por descanso abastece todas as engenhocas.
- **Problema:** não diz se remontar gasta outro lote de Sucata. Sem isso, dá para fabricar engenhoca sem limite.
- **Correção:** "Remontar exige mais 1 lote de Sucata da raridade atual dos projetos, além do teste."
- **Decisão do Pedro?** sim, porque decide o custo.

### [LACUNA] salto-eletromagnetico · descricao
- **Hoje:** "Salte até 15 m em qualquer direção ignorando terreno e obstáculo"
- **Livro:** Combate › Provocar reação: sair do alcance por conta própria provoca; só teleporte não provoca.
- **Problema:** não diz se o salto provoca Ataque de Oportunidade.
- **Correção:** acrescentar "O salto não provoca reação." (ou "provoca", se for a intenção).
- **Decisão do Pedro?** sim, porque é escolha de equilíbrio.

### [LACUNA] meus-filhos · WALL-E
- **Hoje:** "Conserto de construto e o Injetor de Reparo recuperam a Vida dele."
- **Livro:** nenhuma regra chamada "Conserto de construto"; o mais próximo é a tarefa de bancada "Consertar mecanismo", dez minutos.
- **Problema:** termo sem regra.
- **Correção:** "Dez minutos de conserto (tarefa de bancada) e o Injetor de Reparo recuperam a Vida dele."
- **Decisão do Pedro?** não

### [MELHORIA] overclock (Potência Máxima) · descricao
- **Hoje:** "Conta como criação o WALL-E, a torreta, o drone e qualquer engenhoca sua em campo."
- **Livro:** Poderes e Habilidades: poder de combate volta por descanso; sem combo previsto.
- **Problema:** não diz se vale para o Engenho Divino (4d12 duas vezes por turno) nem para a Invenção Suprema.
- **Correção:** acrescentar "Não vale para o Engenho Divino nem para a Invenção Suprema."
- **Decisão do Pedro?** sim, porque define o teto do combo.

### [MELHORIA] eureca · descricao
- **Hoje:** "trate-a como uma falha comum e role novamente"
- **Livro:** Perícias › Graus de resultado: falha crítica é 1 natural.
- **Problema:** "falha comum" e "role novamente" parecem contraditórios.
- **Correção:** "Uma vez por cena, quando tirar falha crítica em Ofício (Engenharia), ignore a falha crítica e role de novo, mantendo o novo resultado. Vale também no teste que define a DT de uma criação sua e impede que a engenhoca queime."
- **Decisão do Pedro?** não

### [MELHORIA] meus-filhos · estágio 1 (vantagem e DT)
- **Hoje:** "vantagem em Ofício (Engenharia) toda vez que o teste cai dentro dela"
- **Livro:** Poderes: a DT de classe vem de `dt_efeitos` (rolagem de Ofício por acionamento).
- **Problema:** não diz se a rolagem da DT de uma engenhoca da área da especialidade ganha a vantagem.
- **Correção:** acrescentar "A vantagem não vale na rolagem que define a DT de engenhocas." (ou "vale", se a intenção for essa).
- **Decisão do Pedro?** sim

### [MELHORIA] holofote-de-campo · descricao
- **Hoje:** "perde o benefício de escuridão e de camuflagem por penumbra"
- **Livro:** Combate › Ver e ser visto: "Pouca luz", "Escuridão" e "Camuflagem" são três linhas separadas; "camuflagem por penumbra" não existe; escuridão criada por Fluxo só cede para quem a fonte disser.
- **Problema:** termo fora do Livro.
- **Correção:** "Ilumina uma esfera de 9 m por três rodadas e anula Pouca luz e Escuridão natural dentro dela. Escuridão criada por magia ou Fluxo não cede. Ataques contra alvos iluminados recebem +1."
- **Decisão do Pedro?** não

## Alquimista (alquimista)

### [ERRO] tarefas_bancada · "Fácil do seu nível" e referência à tabela
- **Hoje:** "Fácil do seu nível" e "tabela de DT por nível do desafio, no capítulo Sistema Base"
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: Rotineira, Padrão e Difícil.
- **Problema:** DT "Fácil" não existe; a tabela está em Perícias.
- **Correção:** dt: "Rotineira do seu nível"; descricao: "saem da tabela de DT por nível, em Perícias (Rotineira, Padrão e Difícil)."
- **Decisão do Pedro?** não

### [ERRO] veneno-de-contato · descricao
- **Hoje:** "em falha, sofre 2d6 de dano de veneno e fica com −2 em testes físicos"
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra." (dano de gatilho tem metade no sucesso)
- **Problema:** quem passa em Fortitude não sofre nada. Pela convenção sofreria metade do dano. O dano de veneno também não diz se continua no fim do turno (Livro: só continua quando o texto diz).
- **Correção:** "No primeiro acerto, o alvo testa Fortitude contra a sua DT de Alquimista. Em falha, sofre 2d6 de dano de veneno e fica com −2 em testes físicos até o fim do próximo turno dele. Em sucesso, sofre metade do dano e nenhum efeito extra. O dano não continua no fim do turno."
- **Decisão do Pedro?** não

### [ERRO] frasco-congelante · descricao
- **Hoje:** "causa 2d6 de dano de gelo. Quem falhar em Fortitude ... perde 3 m de Movimento"
- **Livro:** Magia e Fluxo › Ataque e resistência: com dano, o teste dá metade do dano e evita o efeito extra.
- **Problema:** o dano cai inteiro em todos e o teste só protege o efeito extra.
- **Correção:** "Estoura em 3 m. Cada criatura testa Fortitude contra a sua DT de Alquimista: quem falhar sofre 2d6 de dano de gelo e perde 3 m de Movimento até o fim do próximo turno; quem passar sofre metade do dano. Congela um palmo de água parada e trava um mecanismo simples exposto." O mesmo ajuste vale para o Ácido Corrosivo (próximo achado).
- **Decisão do Pedro?** não

### [INCOERÊNCIA] nevoa-densa, oleo-deslizante, veneno-de-contato, essencia-de-sombra, tonico-de-celeridade · acao
- **Hoje:** `acao: "Ação de Movimento"` desde o nível 1 (arremesso de 12 m na Névoa e no Óleo; toque nos outros três)
- **Livro:** Poderes e Habilidades: a ação do poder vale como escrita. Texto da própria classe: Bancada Portátil "Ação Padrão", e Mão Rápida (nível 5) "Aplicar ... passa a custar uma Ação de Movimento; arremessar continua sendo Ação Padrão".
- **Problema:** a classe diz que usar dose é Ação Padrão, que só no nível 5 aplicar em você ou adjacente vira Movimento e que arremessar nunca vira. Cinco fórmulas aprendidas a partir do nível 3 já saem em Movimento, e duas são arremessos.
- **Correção:** `acao: "Ação Padrão"` nas cinco. Mão Rápida reduz as de toque (Veneno de Contato, Essência de Sombra, Tônico de Celeridade) para Ação de Movimento no nível 5. Névoa e Óleo ficam sempre em Ação Padrão.
- **Decisão do Pedro?** sim, porque pode ser desenho intencional de utilidade rápida.

### [INCOERÊNCIA] grande-obra · estágio 20 (Dose da Pedra) · usos
- **Hoje:** "Uma vez por sessão", ação Ação Padrão, toque, encerra aflição ou condição de longo prazo
- **Livro:** Poderes e Habilidades › Como ler a ação: "Por sessão ... Fica para o que é de história, informação, dinheiro e sorte. Poder de combate volta no descanso."
- **Problema:** é um efeito de Ação Padrão que se usa em combate, e a Pedra Filosofal (mais forte) é por descanso.
- **Correção:** usos: "Uma vez por descanso".
- **Decisão do Pedro?** sim, porque pode ser freio de propósito para curar condição de longo prazo.

### [INCOERÊNCIA] antidoto · descricao
- **Hoje:** "Reduz em um estágio uma aflição de veneno ou doença ... novo teste com vantagem"
- **Livro:** Aflições › Tratamento: "O Antídoto da loja encerra um veneno ativo." (e Condições: Antídoto da Loja encerra Envenenado)
- **Problema:** mesmo nome, efeito mais fraco que o item da Loja. Fica ambíguo para quem lê.
- **Correção:** acrescentar "Esta dose não encerra o veneno por inteiro como o Antídoto da Loja: ela reduz 1 estágio e dá um novo teste de Fortitude com vantagem." (ou renomear o título).
- **Decisão do Pedro?** sim

### [INCOERÊNCIA] tarefas_bancada · "Reproduzir uma fórmula alheia a partir do frasco vazio"
- **Hoje:** "Sucesso conta como fórmula conhecida até o Mestre dizer o contrário."
- **Livro:** Criação › Receitas e projetos: "Copiar um item exige uma receita válida. Possuir ou desmontar o item não concede a receita automaticamente." Fórmulas: uma nova por estágio.
- **Problema:** a tarefa burla as duas regras (receita válida e limite de fórmulas).
- **Correção:** "Descobrir o que um frasco vazio continha | Difícil do seu nível | Um descanso completo. O sucesso dá uma pista ao Mestre. Uma fórmula nova só entra por uma vaga de Fórmulas ou pela Feira Alquímica."
- **Decisão do Pedro?** sim

### [INCOERÊNCIA] tarefas_bancada · "Preparar dose sem bancada"
- **Hoje:** "Sem laboratório improvisado, uma dose por descanso no máximo."
- **Livro:** Grande Obra: Bancada Portátil já prepara três doses sem laboratório fixo; Criação exige Laboratório Alquímico só para fabricar item.
- **Problema:** contradiz as três doses por descanso e tem dupla negação confusa.
- **Correção:** "Preparar uma dose a mais, fora do descanso, sem bancada | Difícil do seu nível | No máximo uma por descanso."
- **Decisão do Pedro?** sim

### [INCOERÊNCIA] coagulante-de-emergencia · descricao
- **Hoje:** "deixa de avançar em Morrendo por falta de estabilização"
- **Livro:** Ferimentos › Morrendo: "Estabilizado, você para de testar e continua inconsciente até voltar a 1 PV ou mais."
- **Problema:** a frase não diz o que o Livro diz. Estabilizar é parar os testes.
- **Correção:** "aplique a dose para estabilizá-la. Ela continua inconsciente e com 0 de Vida, mas para de testar Morrendo."
- **Decisão do Pedro?** não

### [LACUNA] acido-corrosivo · descricao
- **Hoje:** "Acerta uma criatura ou um objeto a até 12 m com 2d6 de dano de ácido ... Em falha no teste de Reflexos, a armadura ou a arma ... perde 1 de bônus até alguém consertar."
- **Livro:** Magia e Fluxo: dano precisa de ataque ou de teste. Criação › Reparos: conserto restaura Durabilidade.
- **Problema:** o dano não tem ataque nem teste, o Reflexos só decide o equipamento, e "perde 1 de bônus" não diz de que bônus.
- **Correção:** "Arremesse o frasco numa criatura ou objeto a até 12 m. A criatura testa Reflexos contra a sua DT de Alquimista: quem falhar sofre 2d6 de dano de ácido, ignorando 5 de Resistência, e a arma ou armadura que usa perde 1 de bônus de dano ou de Defesa até um reparo. Quem passar sofre metade e nenhuma perda."
- **Decisão do Pedro?** não

### [LACUNA] essencia-volatil · descricao
- **Hoje:** "Cause 3d8 de dano de fogo em uma criatura a até 12 m; quem estiver adjacente a ela sofre 1d8."
- **Livro:** Magia e Fluxo: dano sem ataque nem teste de resistência não existe.
- **Problema:** 3d8 certos por 5 de Estamina, sem rolagem nenhuma.
- **Correção:** "A criatura testa Reflexos contra a sua DT de Alquimista e sofre 3d8 de dano de fogo, ou metade se passar. Quem estiver adjacente a ela sofre 1d8. O dano de fogo não continua no fim do turno."
- **Decisão do Pedro?** sim, porque muda o poder.

### [LACUNA] cataplasma-de-ferro · Vida temporária
- **Hoje:** "10 de Vida temporária ... A Vida temporária que sobrar some quando a duração acaba."
- **Livro:** não existe regra de Vida temporária (só o Fruto de Vitalidade a cita).
- **Problema:** falta dizer se absorve o dano antes da Vida, se acumula e se algo cura.
- **Correção:** ver Padrões: criar uma regra única no Livro.
- **Decisão do Pedro?** sim

### [LACUNA] oleo-deslizante · descricao
- **Hoje:** "para não cair ... O óleo pega fogo se alguém encostar chama nele." (nível 5: "quem falhar no teste cai")
- **Livro:** Condições: Caído e Queimando; Magia e Fluxo: o dano de Fogo cai uma vez e só continua quando o texto diz "Queimando".
- **Problema:** "cai" deveria ser a condição Caído, e o fogo não tem dano nem condição.
- **Correção:** "quem entrar ou começar o turno nela testa Reflexos contra a sua DT de Alquimista ou fica Caído. Se alguém encostar chama no óleo, a área causa 1d6 de dano de fogo a quem estiver nela e o óleo se consome."
- **Decisão do Pedro?** sim, porque o 1d6 é um número novo.

### [LACUNA] tonico-do-folego · descricao
- **Hoje:** "respirar sem prejuízo em ar viciado, fumaça ou gás por uma cena"
- **Livro:** Perigos › Fôlego: "Gás venenoso é uma aflição. Prender o fôlego evita a exposição enquanto o ar durar."
- **Problema:** não diz se o gás venenoso deixa de causar exposição.
- **Correção:** "e fica como quem prende o fôlego pela cena: ar viciado e fumaça densa não cobram Estamina, e gás venenoso não causa exposição à aflição."
- **Decisão do Pedro?** sim

### [LACUNA] soro-adaptativo · descricao
- **Hoje:** "ignora penalidades ambientais comuns daquela escolha, mas não ignora dano"
- **Livro:** Perigos › Clima: graus Severo, Extremo e Mortal cobrem teste, Cansaço e dano; o Traje "baixa um grau".
- **Problema:** "penalidades comuns" não casa com os graus do Clima, e o Extremo cobra dano.
- **Correção:** "Escolha calor, frio, grande altitude ou ambiente tóxico. Por uma cena, o clima daquele tipo baixa um grau para a criatura (Extremo vira Severo, Mortal vira Extremo). Não protege de dano de golpe, de aflições nem de falta total de ar."
- **Decisão do Pedro?** sim

### [LACUNA] mutacao-controlada · descricao
- **Hoje:** "receba uma arma natural de 1d10"
- **Livro:** Combate › Ataque desarmado e Críticos: tipo de dano e margem vêm da arma.
- **Problema:** falta tipo de dano e crítico.
- **Correção:** "uma arma natural de 1d10 de corte, crítico 20/x2, usando Luta".
- **Decisão do Pedro?** sim, porque o tipo é escolha de desenho.

### [LACUNA] pedra-filosofal · Panaceia
- **Hoje:** "encerrarem todas as condições que estiverem sofrendo, menos as de longo prazo, e ficarem imunes a veneno, doença e Enjoado"
- **Livro:** Condições › Condição ou aflição?: aflição (veneno, doença, vício) não é condição.
- **Problema:** dá imunidade a veneno e doença, mas não encerra os que já estão ativos.
- **Correção:** "encerrarem todas as condições e aflições que estiverem sofrendo, menos as de longo prazo".
- **Decisão do Pedro?** sim

### [LACUNA] elixir-de-mana · escalonamento × formulas.escalonamento
- **Hoje:** nível geral: "Cada nível acima do primeiro soma +1 dado ao dano ou à cura"; o Elixir (2d4 de Mana) só lista melhorias sem dados.
- **Livro:** Poderes e Habilidades: o texto do estágio manda.
- **Problema:** Mana restaurada conta como cura? Fica ambíguo, e a Concentração (nível 10) também mexe em "cura".
- **Correção:** acrescentar na fórmula: "Esta fórmula não ganha dado por nível nem pela Concentração." (ou "A Mana restaurada ganha +1 dado por nível").
- **Decisão do Pedro?** sim

### [LACUNA] grande-obra · estágio 15 (Composto Duplo)
- **Hoje:** "os dois efeitos acontecem juntos, com uma ação e uma rolagem de DT para os dois"
- **Livro:** Poderes: cada poder declara a ação; reação é uma por rodada.
- **Problema:** não diz qual ação vale quando as fórmulas têm ações diferentes (Padrão, Movimento, Reação) nem qual alcance.
- **Correção:** acrescentar "Vale a ação mais lenta e o menor alcance das duas. Não dá para juntar uma fórmula de Reação."
- **Decisão do Pedro?** não

### [MELHORIA] reagente-revelador · descricao
- **Hoje:** "criatura invisível fica com o contorno visível"
- **Livro:** Condições: Revelado "perde ... invisibilidade de origem mágica ... Não pode se esconder".
- **Problema:** o jogo já tem a condição para isso.
- **Correção:** "criatura Invisível de origem mágica fica Revelada enquanto estiver na área".
- **Decisão do Pedro?** não

### [MELHORIA] tonico-de-celeridade, elixir-veloz · descricao
- **Hoje:** "aumenta o Movimento em 3 m por três rodadas" / "+3 m de Movimento"
- **Livro:** Condições benéficas: Apressado, "Movimento +3 m. Iniciativa +2. Não acumula consigo mesmo."
- **Problema:** com o Elixir Veloz, o Tônico e a Paçoca do Chef, o bônus de +3 m poderia somar três vezes.
- **Correção:** "A criatura fica Apressada por três rodadas." (a Iniciativa +2 vem junto; se não for a intenção, escreva que o efeito não soma com Apressado).
- **Decisão do Pedro?** sim

### [MELHORIA] antidoto-maior · descricao
- **Hoje:** "Reduza em um estágio uma aflição ... e conceda um novo teste imediato, com vantagem"
- **Livro:** Poderes: poder escolhido deve ser mais que a fórmula-base.
- **Problema:** é o mesmo efeito da fórmula Antídoto, que o Alquimista já tem no nível 1.
- **Correção:** "Reduza em dois estágios uma aflição de veneno ou de doença ... e conceda um novo teste imediato, com vantagem."
- **Decisão do Pedro?** sim

### [MELHORIA] dt_efeitos · descricao
- **Hoje:** "testar Fortitude, Reflexos, Vontade ou Percepção"
- **Livro:** Perícias: só Fortitude, Reflexos e Vontade têm Defesa passiva.
- **Problema:** nenhuma fórmula usa Percepção.
- **Correção:** "testar Fortitude, Reflexos ou Vontade".
- **Decisão do Pedro?** não

### [MELHORIA] homunculo · descricao
- **Hoje:** "concede +2 em um teste de Ofício por cena"
- **Livro:** Ações Coletivas › Ajudar: +2 por ajudante, no máximo dois ajudantes.
- **Problema:** não diz se conta como ajudante.
- **Correção:** "Ele conta como um ajudante (Ajudar): +2 em um teste de Ofício por cena, dentro do limite de dois ajudantes."
- **Decisão do Pedro?** não

## Chef (cozinheiro)

### [ERRO] tarefas_bancada · "Fácil do seu nível"
- **Hoje:** "Fácil do seu nível" e "Use as DTs por nível do desafio do Sistema Base"
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: Rotineira, Padrão e Difícil.
- **Problema:** DT "Fácil" não existe; a tabela está em Perícias.
- **Correção:** dt: "Rotineira do seu nível"; descricao: "Use as DTs por nível de Perícias (Rotineira, Padrão e Difícil)."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] receitas de bebida e lanche · acao × mise-en-place estágio 5 (Serviço Rápido)
- **Hoje:** todas as bebidas e lanches (Chá de Hortelã, Paçoca etc.) têm `acao: "Ação de Movimento"`; o estágio 5 diz "Servir e consumir uma bebida ou um lanche custa uma única Ação de Movimento".
- **Livro:** Poderes e Habilidades: a ação escrita vale. Texto da classe: o nível 5 é uma melhoria.
- **Problema:** se já é Ação de Movimento desde o nível 1, o Serviço Rápido não melhora nada. Se servir antes custava mais, falta dizer quanto.
- **Correção:** estágio 1 de Mise en Place: "Servir uma bebida ou um lanche em combate custa uma Ação Padrão, e a criatura consome na mesma ação." Receitas: `acao: "Ação Padrão"`. O estágio 5 continua reduzindo para Ação de Movimento.
- **Decisão do Pedro?** sim, porque pode ser que a Ação de Movimento sempre tenha sido a intenção.

### [INCOERÊNCIA] moqueca · acao e duracao
- **Hoje:** `acao: "Fora de combate"`, "dez minutos ou durante um descanso"; duração "Três rodadas"; "reduza em 2 o primeiro dano que o alvo sofrer em cada rodada".
- **Livro:** Mise en Place: "refeições são consumidas no descanso ou em dez minutos fora de perigo".
- **Problema:** a refeição é comida fora de combate e o efeito dura três rodadas, então acaba antes da luta. Só funciona com a Marmita de Combate.
- **Correção:** duração "Até o descanso seguinte" (como Feijoada e Cozido), ou virar Lanche em Ação Padrão com três rodadas. Texto: "Refeição. Até o descanso seguinte, reduza em 2 o primeiro dano que o alvo sofrer em cada rodada, depois da Resistência."
- **Decisão do Pedro?** sim

### [INCOERÊNCIA] mesa-da-celebracao · usos
- **Hoje:** "Uma vez por sessão ... recupera metade da Vida máxima, metade da Mana máxima, metade da Estamina máxima, reduz 2 de Cansaço"
- **Livro:** Poderes › Como ler a ação: "Por sessão ... história, informação, dinheiro e sorte". Descanso: Relaxar devolve 25% e Boa devolve 50% com 3 de Cansaço.
- **Problema:** é recuperação de recursos, não história. Em dez minutos entrega o que um descanso Bom entrega em oito horas, sem o limite do Relaxar.
- **Correção:** usos: "Uma vez por descanso" (e diga se conta como o Relaxar), ou manter "por sessão" como exceção declarada da habilidade final.
- **Decisão do Pedro?** sim, porque é a habilidade final da classe.

### [INCOERÊNCIA] cuscuz-nordestino · duracao
- **Hoje:** `duracao: "Até o próximo combate"`; texto: "+2 de Iniciativa no próximo combate antes do descanso seguinte".
- **Livro:** Poderes: o combate é uma cena; o campo e o texto devem concordar.
- **Problema:** o campo não traz o limite do descanso.
- **Correção:** duracao: "Até o fim do próximo combate, ou até o descanso seguinte".
- **Decisão do Pedro?** não

### [LACUNA] iogurte-com-granola, suco-de-laranja (nível 4), mise-en-place (Casa Cheia) · Vida temporária
- **Hoje:** "1d6 de Vida temporária por três rodadas", "10 de Vida temporária", "1d6 de Vida temporária por três rodadas"
- **Livro:** não existe regra de Vida temporária.
- **Problema:** ver Padrões. Em especial: Casa Cheia, Iogurte, Cataplasma do Alquimista e Núcleo Estável podem somar.
- **Correção:** criar a regra única (Padrões) e citar nas receitas.
- **Decisão do Pedro?** sim

### [LACUNA] refeições · "uma refeição por vez" e poder Harmonização
- **Hoje:** só Cozido de Carne e Feijoada dizem "A mesma criatura mantém o benefício de apenas uma refeição por vez". Risoto, Curry, Moqueca, Ramen, Sopa, Torta e Canja não dizem. Harmonização: "permita que os dois efeitos permaneçam".
- **Livro:** nada sobre acúmulo de refeições; Condições benéficas: "não acumula consigo mesmo".
- **Problema:** sem a regra geral, Risoto + Curry + Moqueca + Cozido valem juntos, e a Harmonização perde o sentido.
- **Correção:** em Cardápio, descricao: "Uma criatura mantém o benefício de uma refeição por vez. A Harmonização permite duas." Tirar a frase repetida das duas receitas.
- **Decisão do Pedro?** sim

### [LACUNA] moqueca · ordem da redução
- **Hoje:** "reduza em 2 o primeiro dano que o alvo sofrer em cada rodada"
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: a redução entra "depois" da Resistência e não vale contra dano verdadeiro.
- **Problema:** falta a ordem e a exceção.
- **Correção:** "reduza em 2 o primeiro dano que o alvo sofrer em cada rodada, depois da Resistência. Dano verdadeiro ignora a redução."
- **Decisão do Pedro?** não

### [LACUNA] dt_efeitos e prova-antes-de-servir · gatilho e janela
- **Hoje:** dt_efeitos: "Quando uma receita ou poder seu exigir resistência, role Ofício (Cozinha)"; Prova Antes de Servir: "Reação, Uma vez por teste".
- **Livro:** Poderes › Como ler a ação: janelas são rodada, turno, cena, descanso e sessão.
- **Problema:** nenhuma receita exige resistência, então a rolagem de DT e a falha crítica "estraga a porção" nunca acontecem. "Uma vez por teste" não é janela do Livro. O poder só serve nas tarefas de bancada.
- **Correção:** Prova Antes de Servir: usos "Uma vez por rodada". No dt_efeitos, acrescentar "Hoje nenhuma receita pede resistência; a regra vale para poderes e receitas futuras." (ou apagar a falha crítica).
- **Decisão do Pedro?** sim

### [LACUNA] refeições × Fome e Descanso
- **Hoje:** "Refeição ... consumida no descanso ou em dez minutos"
- **Livro:** Perigos › Fome e sede: "uma porção de comida" por dia; Descanso: Maravilhosa exige "refeição completa".
- **Problema:** a classe usa "porção" com outro sentido (prato preparado) e não diz se a refeição do Chef conta como a comida do dia ou como a refeição completa do descanso.
- **Correção:** acrescentar na Mise en Place: "Uma refeição sua conta como a comida do dia de quem a come e como a refeição completa do descanso."
- **Decisão do Pedro?** sim

### [MELHORIA] suco-de-laranja (nível 3) · escalonamento
- **Hoje:** "Nível 3: a cura sobe para 2d6 e também encerra Sangramento."
- **Livro:** Condições › Sangramento: encerra com "qualquer cura de pelo menos 1 PV".
- **Problema:** o Suco já encerra Sangramento no nível 1, então a melhoria é vazia. (Ramen e Cura Menor repetem a frase sem dano algum.)
- **Correção:** "Nível 3: a cura sobe para 2d6."
- **Decisão do Pedro?** não

### [MELHORIA] sementes-de-marcha (Paçoca) · descricao
- **Hoje:** "O Movimento do alvo aumenta em 3 m por três rodadas."
- **Livro:** Condições benéficas: Apressado, "Movimento +3 m. Iniciativa +2. Não acumula consigo mesmo."
- **Problema:** soma com Elixir Veloz e Tônico de Celeridade do Alquimista.
- **Correção:** "O alvo fica Apressado por três rodadas."
- **Decisão do Pedro?** sim

## Padrões que se repetem

- **DT "Fácil":** as três classes escrevem "Fácil do seu nível" e "Sistema Base" nas tarefas de bancada. O Livro tem Rotineira, Padrão e Difícil, em Perícias.
- **Vida temporária sem regra:** Engenheiro (Núcleo Estável), Alquimista (Cataplasma) e Chef (Iogurte, Suco nível 4, Casa Cheia) usam. O Livro só cita no Fruto de Vitalidade. Sugestão de regra única: "A Vida temporária absorve o dano antes da Vida, não é curada, não acumula (vale a maior) e some quando a duração acaba."
- **Dano com teste sem metade:** Bobina de Choque, Veneno de Contato, Frasco Congelante, Ácido Corrosivo e Essência Volátil não seguem a convenção "resistiu, sofre metade e evita o efeito extra".
- **Ação escrita no campo × regra da classe:** Alquimista (Mão Rápida) e Chef (Serviço Rápido) prometem reduzir a ação no nível 5, mas as opções já saem em Ação de Movimento.
- **Condição reescrita em vez do nome oficial:** camuflagem duplicada (Fumaça e Névoa), "cai" no lugar de Caído, movimento +3 m no lugar de Apressado, invisível no lugar de Revelado.
- **Janelas de uso:** Dose da Pedra e Mesa da Celebração usam "por sessão" para efeito de combate ou de recuperação.
- **Contato em Evento:** Feira Alquímica e Festival Gastronômico "podem conceder contato". Se forem usados, o contato nasce como Conhecido (Confiança 1), em Contatos e Laços, e conta no limite de 2 + Mod.Carisma. Concurso "rende reputação": usar Prestígio, Fama e Procura. Não é erro, só convém lembrar o Mestre.
- **Reparo de item:** "Vida" de arma e armadura (Engenheiro) e "perde 1 de bônus" (Alquimista) não conversam com a Durabilidade e o reparo de Criação.

## Conferido sem problema

- **Engenheiro:** progressão (grade de habilidades 1, 3, 5, 8, 10, 14, 15, 18, 20; 8 poderes; 4 graus; 4 eventos), as 20 engenhocas com dois marcos cada, lotes de Sucata por nível (Materiais), cobertura parcial +2 e superior +5 (Combate), Imobilizado e saída por Ação Padrão, WALL-E e torreta como poder sustentado (Aliados), Arquitetura de Campo, DT por rolagem de Ofício, Fôlego, soco e crítico (nenhum conflito), cópias em `receitas-materiais.ts` idênticas.
- **Alquimista:** progressão e 10 poderes, escada de raridade dos Componentes Químicos, Cura Menor, Elixir de Mana, Névoa (fora o −2), Cola Instantânea e Bomba de Clarão (Cego e Imobilizado), Peçonha Hemorrágica existe no catálogo de aflições, Queimando e Sangramento, Pedra Filosofal (Reconstrução bate com Voltar da morte: Ferido 2 e 2 de Cansaço), Transmutação Mestra (temporária, não gera estoque permanente), 20 fórmulas idênticas ao `receitas-materiais.ts`.
- **Chef:** progressão e 10 poderes, Mantimentos por nível da receita, Canja (categoria Boa no Descanso), Pão de Queijo, Onigiri, Feijoada (Resistência física cobre balístico), Curry (Resistência por elemento vale nas derivações), Acarajé (dado extra entra uma vez no crítico), Cuscuz (Iniciativa fixa, Surpreendido), Brigadeiro (Amedrontado), Ramen e Mesa da Celebração (condição leve na escala do Livro), Sopa e Chá (aflição e Fortitude), 20 receitas idênticas ao `receitas-materiais.ts`.
- **Tom:** nenhuma das três tem travessão, "eco" nem a antítese "não é X, é Y".
