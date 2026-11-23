# Revisão de coerência: marciais A (Guerreiro, Espadachim, Lutador, Atirador, Guardião)

Base de comparação: Livro de Regras de 2026-11-19 (recorte em `regras/`). Só leitura; nada foi editado no repositório. Todo texto sugerido está sem travessão, sem "eco" e sem a antítese "não é X, é Y". Nenhuma correção mexe em `id`.

Sumário de contagens

| Classe | ERRO | INCOERÊNCIA | LACUNA | MELHORIA |
|---|---|---|---|---|
| Guerreiro | 2 | 2 | 5 | 6 |
| Espadachim | 1 | 2 | 4 | 3 |
| Lutador | 0 | 4 | 4 | 5 |
| Atirador | 1 | 2 | 7 | 3 |
| Guardião | 0 | 1 | 7 | 4 |

---

## Guerreiro (guerreiro)

### [ERRO] batalhao › opção `cobertura` (Cobertura!) · escalonamento do nível 3
- **Hoje:** "Nível 3: ele também recebe Resistência 3 contra dano de área."
- **Livro:** Tipos de dano › Resistência: "Resistência vale sempre por tipo específico... nunca para 'dano' de forma genérica". Regra abolida: "Resistência contra todo dano" vira "reduza em X o dano de cada golpe".
- **Problema:** "dano de área" não é tipo de dano nenhum. É a Resistência genérica que o Livro aboliu.
- **Correção:** "Nível 2: o bônus sobe para +4. Nível 3: ele também reduz em 3 o dano de cada efeito de área que sofrer, depois da Resistência. Nível 4: o bônus sobe para +6 e alcança quem estiver adjacente a ele."
- **Decisão do Pedro?** não

### [ERRO] escudo-do-arsenal (poder) e `tarefas_bancada` linha Escudos
- **Hoje:** "Com um escudo do seu Arsenal Especial, receba +2 em Fortitude contra empurrão e queda."
- **Livro:** Combate › Manobras: Empurrar é "10 + Fortitude", mas Derrubar é "10 + Reflexos". Perigos › Queda não tem teste de Fortitude (é Acrobacia DT 15 para cair de pé, e Reflexos para sair de baixo de quem cai).
- **Problema:** não existe teste de Fortitude contra queda, e quem derruba o Guerreiro mira Reflexos, então o bônus nunca cobre o que a nota promete.
- **Correção:** poder: "Com um escudo do seu Arsenal Especial, receba +2 em Fortitude contra Empurrar e +2 em Reflexos contra Derrubar." Nota da bancada (Escudos): "Você recebe +2 em Fortitude contra Empurrar e em Reflexos contra Derrubar, com o poder Escudo do Arsenal."
- **Decisão do Pedro?** sim, porque o bônus em Reflexos é conteúdo novo (hoje o escudo só cobre Fortitude).

### [INCOERÊNCIA] batalhao › opção `mira` (Mira!) · duracao
- **Hoje:** duracao "Até o próximo ataque dele" e texto "+2 no próximo ataque ou teste que fizer".
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso (duração e texto devem dizer o mesmo).
- **Problema:** o campo diz só ataque, o texto diz ataque ou teste. No nível 3 ("dura até o fim do turno dele") a duração muda de novo sem avisar que passou a valer para vários testes.
- **Correção:** duracao "Até o próximo ataque ou teste dele". Escalonamento: "Nível 2: o bônus sobe para +3. Nível 3: o bônus vale até o fim do turno dele, em todos os ataques e testes. Nível 4: o bônus sobe para +5."
- **Decisão do Pedro?** sim, porque o nível 3 pode ou não valer para todos os testes do turno.

### [INCOERÊNCIA] arsenal-especial × tarefas_bancada (raridade)
- **Hoje:** habilidade: "de raridade Rara ou inferior". Bancada: "Peça Épica ou acima entra só com autorização do Mestre."
- **Livro:** Raridades e Modificações: Comum, Incomum, Raro, Épico, Lendário.
- **Problema:** um texto trava em Rara, o outro abre exceção.
- **Correção:** habilidade: "...de raridade Rara ou inferior (peça Épica ou acima só com autorização do Mestre)..."
- **Decisão do Pedro?** sim, porque pode ser que a regra certa seja o teto duro.

### [LACUNA] batalhao › opção `levanta` (Levanta!) · Vida temporária e nível 4
- **Hoje:** "recebe 5 de Vida temporária" e, no nível 4, "se estiver a 0 de Vida, ele estabiliza e acorda com 1 de Vida". Habilidade: "Levanta! no nível 4 é a única exceção".
- **Livro:** Ferimentos › Vida negativa/Morrendo: "A cura preenche o Déficit primeiro. Você só acorda quando voltar a 1 PV ou mais", e "Quem acorda ganha Ferido 1". "Vida temporária" só existe como efeito de um Fruto (Frutos e Implantes); nenhum tópico diz quanto dura, se soma ou se é gasta primeiro.
- **Problema:** (1) Vida temporária sem regra; (2) "sai de Caído sem gastar ação" não diz se provoca reação (levantar provoca, em Condições › Caído); (3) acordar a 0 não diz o que acontece com o Déficit e o Ferido 1; (4) "nível 4" aparece para o nível do comando, mas o leitor pode ler como nível de classe.
- **Correção:** "O aliado sai de Caído sem gastar ação e sem provocar reação, e recebe 5 de Vida temporária até o fim da cena. A Vida temporária é gasta antes da Vida e não soma com outra: vale a maior." Nível 4: "se estiver a 0 de Vida, o Déficit some, ele estabiliza e acorda com 1 de Vida, e ganha Ferido 1 como qualquer um que acorda." Habilidade: "Levanta!, quando o comando está no nível 4, é a única exceção...". Pedir ao Livro uma frase única sobre Vida temporária (ver Padrões).
- **Decisão do Pedro?** sim, porque define o termo Vida temporária para o jogo todo e decide se a ordem poupa o Ferido.

### [LACUNA] bandeira-fincada · quando o aliado "cai a 0 de Vida"
- **Hoje:** "quando um aliado do seu Batalhão cair a 0 de Vida, use a Reação: ele fica com 1 de Vida, e você dá de graça uma ordem do Batalhão, sem gastar ação."
- **Livro:** Ferimentos › Vida negativa: o dano que passa de 0 vira Déficit, e se o Déficit chega à Vida máxima "você morre na hora". Morrendo 1 vem ao chegar a 0. Batalhão: "Uma ordem por rodada".
- **Problema:** não diz se o Déficit e o Morrendo somem, se vale contra um golpe que já matou na hora, nem se a ordem grátis soma com a ordem da rodada.
- **Correção:** "Uma vez por cena, quando um aliado do seu Batalhão cair a 0 de Vida (e o Déficit ainda for menor que a Vida máxima dele), use a Reação: ele fica com 1 de Vida, sem Déficit e sem Morrendo, e você dá de graça uma ordem do Batalhão, além da ordem da rodada, sem gastar ação."
- **Decisão do Pedro?** sim, porque decide o limite entre salvar e voltar da morte (Ferimentos › Voltar da morte é raro e caro) e o Ferido 1.

### [LACUNA] estagio Errou Perto de Mim (implacavel nível 5)
- **Hoje:** "gaste a reação para atacá-la. Esse ataque não sofre o corte de −2 do Contra-Ataque comum."
- **Livro:** Combate › Reações: "Contra-Ataque | Inimigo adjacente erra você | Faça um ataque com −2. Ele não pode gerar crítico."
- **Problema:** o gatilho é idêntico ao Contra-Ataque. O texto tira o −2, mas não diz se o crítico, que o Contra-Ataque proíbe, volta a valer.
- **Correção:** "Quando uma criatura adjacente erra um ataque corpo a corpo contra você, gaste a reação para atacá-la, sem o −2 do Contra-Ataque comum. Esse ataque pode gerar crítico."
- **Decisão do Pedro?** sim, porque dar crítico muda o peso do Contra-Ataque.

### [LACUNA] batalhao › opção `ninguem-passa` (Ninguém Passa!)
- **Hoje:** "o aliado ataca de reação a primeira criatura que tentar sair de perto dele ou passar pelo espaço ao lado." Nível 4: "o segundo ataque não gasta outra Reação do aliado".
- **Livro:** Combate › Provocar reação: Ataque de Oportunidade é "−2" e "não pode gerar crítico", usa a reação, e "arma de disparo não faz".
- **Problema:** não diz se a ordem é um Ataque de Oportunidade com as mesmas travas, se gasta a reação do aliado nos níveis 1 a 3 (o nível 4 sugere que sim) nem se o ataque vale para corpo a corpo apenas.
- **Correção:** "Até o próximo turno dele, o aliado faz um Ataque de Oportunidade contra a primeira criatura que tentar sair do alcance dele ou passar pelo espaço ao lado, gastando a reação dele." Nível 2: "o ataque causa +2 de dano". Nível 3: "acertar também interrompe o movimento de quem tentou passar". Nível 4: "a ordem pode disparar contra duas criaturas diferentes na mesma rodada, e o segundo ataque não gasta outra Reação do aliado."
- **Decisão do Pedro?** não

### [LACUNA] armas-de-qualidade (poder)
- **Hoje:** "Uma vez por sessão, uma falha crítica com arma do seu Arsenal Especial vira falha comum."
- **Livro:** Combate › Ataques: "Um 1 natural sempre erra". Perícias: "falha crítica: o d20 mostra 1 natural". Nenhum tópico dá efeito próprio a uma falha crítica de ataque, então "falha comum" erra do mesmo jeito. Janelas: "Poder de combate volta no descanso."
- **Problema:** como está, o poder não muda nada num ataque. E a janela "por sessão" é a de história e sorte, mas o poder é de combate.
- **Correção:** "Uma vez por descanso, quando tirar 1 natural num ataque com arma do seu Arsenal Especial, role o d20 de novo e use o novo resultado."
- **Decisão do Pedro?** sim, porque vira uma rerrolagem de verdade.

### [MELHORIA] couro-grosso (implacavel nível 10)
- **Hoje:** "Resistência 5 a fogo, a gelo e a frio."
- **Livro:** Tipos de dano › Dano de ambiente: "Frio e Calor vêm do lugar... Resistência a um não vale para o outro", e "Resistência... ao elemento base também valem, por inteiro, contra as derivações dele".
- **Problema:** Fogo, Gelo e Frio estão certos, mas Calor ficou de fora (o par do Frio) e os tipos estão em minúscula, sem o link do Livro. Se a ideia é "tolerância a clima extremo", falta o Calor.
- **Correção:** "Você também recebe Resistência 5 a Fogo, a Gelo, a Frio e a Calor."
- **Decisão do Pedro?** sim, porque Calor é um tipo a mais de Resistência.

### [MELHORIA] comando-de-guerra (poder)
- **Hoje:** "o ataque dele soma o seu Grau em Luta ao dano."
- **Livro:** Perícias: "Grau" é o nome do degrau (Treinado, Mestre...), e "bônus do Grau" é o número.
- **Problema:** "soma o Grau" lê como o nome do degrau; não diz qual ataque do aliado e quando.
- **Correção:** "Use a reação quando um aliado seguir uma ordem sua: o primeiro ataque dele depois da ordem soma ao dano o bônus do seu grau em Luta."
- **Decisão do Pedro?** não

### [MELHORIA] correndo (poder)
- **Hoje:** "recebem +3 m de Movimento por três rodadas."
- **Livro:** Condições › Apressado: "Movimento +3 m. Iniciativa +2. Não acumula consigo mesmo."
- **Problema:** é quase a condição Apressado, sem o nome (perde o link e a regra de não acumular).
- **Correção:** "Aliados do Batalhão a até 12 m ficam Apressados por três rodadas."
- **Decisão do Pedro?** sim, porque soma Iniciativa +2.

### [MELHORIA] peito-aberto (implacavel nível 1) × Exposto
- **Hoje:** "aceite −2 de Defesa até o seu próximo turno para causar +4 de dano".
- **Livro:** Condições › Exposto: "Defesa reduzida em 2. Exposto não acumula consigo mesmo. Termina... no começo do próximo turno." Coreografia › Ousado: "Você fica Exposto: −2 de Defesa".
- **Problema:** o custo é igual a Exposto, só sem o nome, então não está claro se soma com um Exposto vindo da Coreografia (−4 de Defesa).
- **Correção:** acrescentar: "A penalidade de Defesa não soma com Exposto nem com outra penalidade igual: vale a maior."
- **Decisão do Pedro?** sim, porque define o empilhamento de penalidades de Defesa.

### [MELHORIA] sai-da-frente (implacavel nível 20) e dt_efeitos
- **Hoje:** dt_efeitos: "testar Vontade para não recuar da sua frente". Sai da Frente: "em falha ele fica Amedrontado por uma rodada".
- **Livro:** Condições › Amedrontado: "Não pode se aproximar voluntariamente da fonte"; "No fim do turno, Vontade contra a DT da fonte encerra a condição."
- **Problema:** Amedrontado impede de se aproximar, não faz recuar, então a descrição da DT não bate. E "por uma rodada" não diz se o teste de saída do fim do turno existe.
- **Correção:** dt_efeitos: "Quando um efeito seu manda alguém testar Vontade para não ficar com medo de você, role Intimidação na hora..." Estágio: "em falha ele fica Amedrontado até o fim do próximo turno dele, sem o teste de saída, e você ataca de novo na hora."
- **Decisão do Pedro?** sim, porque troca a descrição da DT e fixa a duração.

### [MELHORIA] reacao-de-veterano (poder)
- **Hoje:** "acao: Ação Livre", sem `momento`.
- **Livro:** Poderes e Habilidades: "Quando importa o momento, ele vem logo depois, como em 'Ação Livre · antes do ataque'". Combate › Reações: "recupera no começo do seu próprio turno".
- **Problema:** o gatilho ("assim que ela for gasta") está só na descrição.
- **Correção:** `momento`: "depois de gastar a reação".
- **Decisão do Pedro?** não

---

## Espadachim (espadachim)

### [ERRO] corte-cirurgico-ii (Finta) · duracao
- **Hoje:** "Se falhar, fica Exposto até o fim do seu próximo turno." Duração: "Até o fim do seu próximo turno".
- **Livro:** Condições › Exposto: "Defesa reduzida em 2... Termina automaticamente no começo do próximo turno" (do exposto).
- **Problema:** a condição oficial acaba no começo do turno do alvo. Na ordem normal de iniciativa o alvo age antes de o Espadachim agir de novo, então o Exposto da Finta acaba antes do ataque que ela deveria ajudar.
- **Correção:** "Se falhar, fica Exposto, e a condição dura até o fim do seu próximo turno, no lugar de acabar no começo do turno dele."
- **Decisão do Pedro?** sim, porque decide se Finta é para o seu próprio ataque ou para os aliados.

### [LACUNA] corte-cirurgico-ii (Finta) · dt_efeitos
- **Hoje:** dt_efeitos: "role Luta no momento do golpe". Finta: "Ele testa Vontade contra a sua DT de Espadachim."
- **Livro:** Poderes e Habilidades (a DT de classe vem de `dt_efeitos`).
- **Problema:** a Finta não é golpe; não diz quando rolar Luta.
- **Correção:** dt_efeitos: "role Luta no momento do golpe ou da finta". Finta: "Role Luta; o resultado é a DT. O alvo testa Vontade contra ela."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] golpe-em-w (Desarme)
- **Hoje:** "Faça um ataque com espada contra uma criatura que empunhe arma... Se acertar... o que ela empunha cai a até 3 m."
- **Livro:** Combate › Manobras: "Desarmar | 10 + Reflexos | Um item que o alvo segura cai no espaço dele." Manobra "usa a mesma rolagem, contra a defesa passiva do alvo".
- **Problema:** é um Desarmar contra a Defesa, enquanto a manobra oficial rola Luta contra 10 + Reflexos. Duas mecânicas para a mesma coisa.
- **Correção:** "Faça a manobra Desarmar com a espada, contra uma criatura que empunhe arma ou objeto. Se acertar, o que ela empunha cai a até 3 m, no ponto que você escolher. Arma natural e objeto preso ao corpo não podem ser tirados assim."
- **Decisão do Pedro?** sim, porque troca o alvo da rolagem (Defesa por 10 + Reflexos).

### [INCOERÊNCIA] arte-da-espada › Fio Implacável (nível 15)
- **Hoje:** sem campo `acao`; "Ao levar uma criatura relevante a 0 de Vida, recupere 2 de Estamina."
- **Livro:** Poderes e Habilidades: "Toda habilidade e todo poder dizem que ação pedem, numa destas sete".
- **Problema:** falta a ação (é Passivo) e "criatura relevante" não é termo do Livro.
- **Correção:** `acao`: "Passivo". Texto: "Ao levar uma criatura inimiga a 0 de Vida, recupere 2 de Estamina, uma vez por rodada."
- **Decisão do Pedro?** sim, porque "relevante" pode ser uma trava de propósito contra capanga.

### [LACUNA] arte-da-espada › Corte Firme (nível 5)
- **Hoje:** "use uma Reação para reduzir em seu nível o dano de um ataque que sofreria, até o mínimo 0."
- **Livro:** Combate › Reações: "Bloqueio... reduza o dano em 2 + ⌊Nível ÷ 2⌋". Tipos de dano: "A redução de dano vale contra qualquer tipo, menos o dano verdadeiro" e entra no passo 2, junto com a Resistência.
- **Problema:** "seu nível" pode ser o nível total ou o de Espadachim, e no total cresce sem limite (60 de redução por cena). Não diz que dano verdadeiro fica de fora.
- **Correção:** "Uma vez por cena, use uma Reação para reduzir em seu nível de Espadachim o dano de um ataque que sofreria, junto com a Resistência, até o mínimo 0. Não vale contra dano verdadeiro."
- **Decisão do Pedro?** sim, porque troca nível total por nível da classe.

### [LACUNA] protecao-da-espada-ii (Riposte)
- **Hoje:** "Quando um inimigo adjacente errar um ataque corpo a corpo contra você, use a Reação para fazer um ataque com espada contra ele."
- **Livro:** Combate › Reações: Contra-Ataque tem exatamente esse gatilho, com "−2" e "Ele não pode gerar crítico".
- **Problema:** repete o Contra-Ataque sem dizer o que muda (−2? crítico?).
- **Correção:** "...faça um ataque com espada contra ele, sem o −2 do Contra-Ataque, e que pode gerar crítico."
- **Decisão do Pedro?** sim, porque dar crítico é o ganho do poder.

### [LACUNA] penetrar-armadura e espirito-da-espada (ordem de "ignora Resistência")
- **Hoje:** Penetrar: "ignora 5 de Resistência (10 no nível 10)". Espírito: "ignoram metade da Resistência do alvo".
- **Livro:** Tipos de dano › Resistência: "Role o dano inteiro... Tire a Resistência do tipo de dano... até o mínimo 0".
- **Problema:** quando os dois valem no mesmo ataque, não diz qual vem primeiro.
- **Correção:** acrescentar em Espírito da Espada: "Se outro efeito também ignorar Resistência, tire primeiro o valor fixo e ignore metade do que sobrar."
- **Decisão do Pedro?** não

### [MELHORIA] combo (nível 18)
- **Hoje:** "o alvo então sofre −2 Defesa até o fim da rodada seguinte."
- **Livro:** Condições › Exposto: "Defesa reduzida em 2... não acumula consigo mesmo."
- **Problema:** é Exposto sem o nome. Sem o nome, soma com outros −2.
- **Correção:** "o alvo então fica Exposto até o fim da rodada seguinte, no lugar de acabar no começo do turno dele."
- **Decisão do Pedro?** não

### [MELHORIA] arte-da-espada › Vínculo (nível 1)
- **Hoje:** duracao "Permanente, até vincular outra espada", acao "Ação Livre".
- **Livro:** Guerreiro: "Trocar uma peça leva um descanso completo" (mesma ideia de peça favorita).
- **Problema:** vincular é Ação Livre, então dá para trocar de espada vinculada no meio da luta e as habilidades (Corte Firme, Golpe Perfeito, Espírito) passam para qualquer espada.
- **Correção:** "Vincule-se a uma espada; com ela, receba +1 em ataques. Vincular outra espada leva um descanso completo."
- **Decisão do Pedro?** sim, porque restringe quem hoje troca livre.

### [MELHORIA] corte-a-distancia (poder)
- **Hoje:** "Faça um ataque com espada contra um alvo a até 9 m... passa a 18 m."
- **Livro:** Distâncias: faixas, e "Uma faixa além do alcance custa −5 no ataque"; 9 m cai em Médio e 18 m em Longo.
- **Problema:** não diz a perícia (Luta ou Pontaria) nem se a regra de faixa além do alcance vale.
- **Correção:** "Faça um ataque de Luta com a espada contra um alvo a até 9 m (Médio); no nível 10 de Espadachim, até 18 m (Longo). Além disso, vale Distâncias: −5 por faixa além do alcance."
- **Decisão do Pedro?** não

---

## Lutador (lutador)

### [INCOERÊNCIA] guarda-aberta · ausente da `progressao`
- **Hoje:** habilidade `guarda-aberta` com `niveis: [1]`; o nível 1 da progressão lista só "Instinto de Combate" estágio 1 e "Grau de perícia".
- **Livro:** Poderes e Habilidades › A grade: "Habilidade | 1, 3, 5, 8, 10, 14, 15, 18 e 20", entregues pela progressão.
- **Problema:** a habilidade existe, mas nenhum nível a entrega.
- **Correção:** no nível 1 de `progressao`, acrescentar `{"tipo": "habilidade", "titulo": "Guarda Aberta"}`.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] dt_efeitos × Pegada × tarefas_bancada (vantagem nas manobras)
- **Hoje:** dt_efeitos: "Você tem vantagem nessas rolagens desde o nível 1" (as cinco manobras). Pegada e bancada: vantagem "em agarrar, empurrar ou derrubar".
- **Livro:** Combate › Manobras: as cinco usam a mesma rolagem.
- **Problema:** dois textos da classe discordam sobre Desarmar e Imobilizar.
- **Correção:** dt_efeitos: "Você tem vantagem em agarrar, derrubar e empurrar desde o nível 1." (ou ajustar Pegada e a bancada, se a intenção são as cinco).
- **Decisão do Pedro?** sim, porque não está claro qual leitura vale.

### [INCOERÊNCIA] estilo-de-combate › Contragolpe
- **Hoje:** "Limitação: você gasta a sua reação nele, e fica sem reação para Bloqueio ou Esquiva na rodada."
- **Livro:** Combate › Reações: "Você tem uma reação por rodada"; o Contra-Ataque já é uma reação.
- **Problema:** a limitação é a regra normal de qualquer Contra-Ataque; o estilo fica sem limitação real.
- **Correção:** "Limitação: o +1d6 vale só contra quem errou você, e você fica Exposto até o começo do seu próximo turno."
- **Decisão do Pedro?** sim, porque inventa uma limitação.

### [INCOERÊNCIA] estilo-de-combate › Capoeira
- **Hoje:** "o ataque causa +1d6 e não provoca reação de quem você deixou para trás."
- **Livro:** Combate › Provocar reação: o que provoca é o movimento de sair do alcance.
- **Problema:** quem provoca é o deslocamento, não o ataque.
- **Correção:** "o ataque causa +1d6 e esse deslocamento não provoca reação de quem você deixou para trás."
- **Decisão do Pedro?** não

### [LACUNA] estilo-de-combate › Chute Baixo
- **Hoje:** "você pode derrubá-lo sem gastar ação."
- **Livro:** Combate › Manobras: "Derrubar | 10 + Reflexos".
- **Problema:** não diz se a derrubada é automática ou rola a manobra.
- **Correção:** "você pode fazer a manobra Derrubar contra ele sem gastar ação."
- **Decisão do Pedro?** sim, porque a leitura automática dá derrubada sem teste.

### [LACUNA] instinto-de-combate › Aquele Golpe (nível 20)
- **Hoje:** "rolar os dados de dano duas vezes e ignorar metade da Resistência do alvo".
- **Livro:** Combate › Críticos: "O multiplicador diz quantas vezes você rola os dados da arma."
- **Problema:** não diz se as duas rolagens somam (sobre o x2 do crítico) ou se vale a maior.
- **Correção:** "gaste 8 de Estamina para rolar os dados do crítico duas vezes e usar o maior resultado, e ignore metade da Resistência do alvo."
- **Decisão do Pedro?** sim, porque define a escala do dano.

### [LACUNA] uma-vida-por-outra (poder)
- **Hoje:** "gaste até 9 de Vida, que sai direto e ignora Resistência."
- **Livro:** Ferimentos › Morrendo (0 de Vida derruba); Tipos de dano › Dano verdadeiro.
- **Problema:** não diz se pode levar a Vida a 0, nem se o gasto conta como dano.
- **Correção:** "gaste até 9 de Vida, sem poder ficar abaixo de 1. É perda direta de Vida, não é dano: nenhuma Resistência ou redução a alcança. A cada 3 de Vida gasta, o ataque causa +2 de dano se acertar. Errou, a Vida foi embora do mesmo jeito."
- **Decisão do Pedro?** sim, porque fixa o piso de 1 de Vida.

### [LACUNA] errou-foi (poder)
- **Hoje:** "Seus Contra-Ataques podem sair críticos, e também podem sair em falha crítica."
- **Livro:** Combate › Ataques: "Um 1 natural sempre erra". Nenhum tópico dá consequência a falha crítica de ataque.
- **Problema:** a "falha crítica" do Contra-Ataque não tem efeito escrito.
- **Correção:** "Seus Contra-Ataques podem gerar crítico. O corte de −2 da reação continua valendo." (ou escrever o custo da falha crítica).
- **Decisão do Pedro?** sim, porque pode ser desejado um custo real.

### [MELHORIA] instinto-de-combate › Fúria (nível 15)
- **Hoje:** "segure até o seu nível de Lutador dele: reduza o dano nessa quantidade e guarde o número."
- **Livro:** Condições › Crises: "Fúria" é uma crise de Sanidade.
- **Problema:** o título repete o nome de uma crise oficial (vira link errado) e o texto tem "dele" sobrando.
- **Correção:** só `titulo`: "Raiva Guardada". Texto: "Uma vez por cena, ao sofrer dano, reduza o dano em até o seu nível de Lutador e guarde esse número. O seu próximo golpe desarmado nesta cena causa o número guardado como dano a mais."
- **Decisão do Pedro?** sim, porque muda o nome visível.

### [MELHORIA] braco-de-ferro (poder)
- **Hoje:** "reduza esse dano no seu Mod. Força mais o seu Grau em Luta."
- **Livro:** Perícias: "bônus do Grau".
- **Problema:** "Grau em Luta" lê como o nome do degrau.
- **Correção:** "reduza esse dano no seu Mod. Força mais o bônus do seu grau em Luta."
- **Decisão do Pedro?** não

### [MELHORIA] instinto-de-combate › Marcas de Guerra (nível 10)
- **Hoje:** "Com 3, ele fica com −2 de Defesa... até o fim do combate."
- **Livro:** Condições › Exposto; Poderes: "Um combate inteiro é uma cena."
- **Problema:** −2 de Defesa sem o nome pode somar com Exposto; "combate" pode ser "cena".
- **Correção:** "Com 3, ele fica com −2 de Defesa (não soma com Exposto). ...As marcas ficam no corpo dele até o fim da cena..."
- **Decisão do Pedro?** não

### [MELHORIA] guarda-aberta · escada
- **Hoje:** "+2 no nível total 1, +5 no 5, +8 no 10, +15 no 15 e +24 do 25 em diante."
- **Livro:** Perícias › DT Padrão: "Num nível entre duas linhas, vale a linha do nível menor."
- **Problema:** a escada não diz o valor entre os degraus.
- **Correção:** acrescentar: "Num nível entre dois degraus, vale o degrau do nível menor."
- **Decisão do Pedro?** não

### [MELHORIA] punhos-de-ferro e kokusen
- **Hoje:** Punhos: "cada estágio soma um bônus fixo de Impacto" (Mão Fechada é só 1d6). Martelo: margem 19-20. Kokusen: crítico com 19 ou 20.
- **Livro:** Combate › Críticos: efeito de classe só alarga em arma x2.
- **Problema:** o texto geral promete bônus no estágio 1, e Martelo e Kokusen dão a mesma margem sem dizer que não somam.
- **Correção:** Punhos: "cada estágio a partir do segundo soma um bônus fixo de Impacto". Kokusen: "...crítico com resultado natural 19 ou 20, sem somar com a margem do Martelo."
- **Decisão do Pedro?** não

---

## Atirador (atirador)

### [ERRO] municao-especial · janela por sessão (habilidade nível 15 e `tarefas_bancada`)
- **Hoje:** "No início de cada sessão, escolha duas doses... o que sobrar no fim da sessão não acumula." usos: "Duas doses por sessão".
- **Livro:** Poderes e Habilidades › limite de uso: "Por sessão... história, informação, dinheiro e sorte... Poder de combate volta no descanso."
- **Problema:** munição especial é recurso de combate e usa a janela errada.
- **Correção:** "Ao fim de cada descanso completo, escolha duas doses de munição especial da lista da classe, iguais ou diferentes. Cada dose substitui um disparo normal e se gasta ao ser usada; o que sobrar não acumula para o descanso seguinte." usos: "Duas doses por descanso". Mesma troca na bancada.
- **Decisão do Pedro?** sim, porque muda a quantidade de doses por sessão.

### [INCOERÊNCIA] cobertura em Etérea, Um Só Disparo, Disparo Calculado e Mira Fantasma
- **Hoje:** Etérea: "Ignora cobertura física". Um Só Disparo: "ignora cobertura". Disparo Calculado: "ignora... cobertura parcial ou superior, mas não atravessa cobertura total". Mira Fantasma: "ignora cobertura total oferecida por uma única barreira mundana fina".
- **Livro:** Combate › Ataques e cobertura (parcial +2, superior +5) e Ver e ser visto (cobertura total: sem alvo direto).
- **Problema:** quatro textos tratam cobertura de quatro jeitos; "cobertura" solta pode incluir a total e contradiz o Disparo Calculado e a Mira Fantasma.
- **Correção:** Etérea: "Ignora cobertura parcial e superior; não atravessa cobertura total. Atinge criaturas incorpóreas normalmente." Um Só Disparo: "...ignora cobertura parcial e superior e a Resistência..."
- **Decisão do Pedro?** sim, porque Etérea pode ter sido pensada para atravessar parede.

### [INCOERÊNCIA] dois-olhares (poder) × Marca × Duas Marcas
- **Hoje:** "Marque dois alvos visíveis; até o fim da cena, alternar entre eles não encerra efeitos de Mira."
- **Livro:** Poderes e Habilidades (cada texto diz o que faz).
- **Problema:** "efeitos de Mira" não é termo da classe (há Na Mira, Marca, Mira Fria). A Marca só acaba ao acertar, então "alternar" não a encerra. O nível 20 (Duas Marcas) já dá dois alvos.
- **Correção:** "Marque dois alvos visíveis. Até o fim da cena, a Marca de Na Mira vale nos dois ao mesmo tempo."
- **Decisão do Pedro?** sim, porque fica redundante com Duas Marcas.

### [LACUNA] municao-especial › Fumaça
- **Hoje:** "Cria uma cortina de fumaça de 3 m no impacto, em vez de causar dano."
- **Livro:** Combate › Camuflagem: "ataques contra quem está camuflado têm −2".
- **Problema:** sem duração e sem dizer o efeito.
- **Correção:** "Cria uma cortina de fumaça de 3 m no impacto até o fim da rodada seguinte, em vez de causar dano. Quem estiver dentro conta como camuflado."
- **Decisão do Pedro?** sim, porque fixa a duração.

### [LACUNA] municao-especial › Explosiva
- **Hoje:** "+1 dado de dano a criaturas a até 3 m do impacto."
- **Livro:** Convenções da magia: dano em área tem metade no sucesso; todo dano tem tipo.
- **Problema:** sem tipo, sem dizer se o alvo principal conta e sem teste.
- **Correção:** "Além do dano do disparo, cada criatura a até 3 m do impacto, o alvo incluso, testa Reflexos contra a DT do Atirador: em falha sofre 1 dado da arma, em sucesso a metade, do mesmo tipo de dano do disparo."
- **Decisão do Pedro?** sim, porque troca +1 dado automático por teste.

### [LACUNA] municao-especial › Incendiária
- **Hoje:** "O alvo fica Queimando."
- **Livro:** Condições › Queimando (1d6 de Fogo no fim do turno).
- **Problema:** não diz se exige acerto.
- **Correção:** "Se o disparo acertar, o alvo fica Queimando."
- **Decisão do Pedro?** não

### [LACUNA] na-mira › Rajada (nível 10)
- **Hoje:** "até três ataques com −1 dado de dano cada; se todos atingirem o mesmo alvo, ele testa Fortitude contra a DT do Atirador."
- **Livro:** dt_efeitos da classe: "role Pontaria no momento do disparo".
- **Problema:** "−1 dado" numa arma de 1 dado deixa zero dados; e com três disparos não diz qual rolagem vira a DT.
- **Correção:** "faça até três ataques, cada um com um dado de dano a menos (no mínimo 1 dado); se todos atingirem o mesmo alvo, ele testa Fortitude contra a DT do Atirador, que é o resultado do último ataque da Rajada."
- **Decisão do Pedro?** sim, porque escolhe a rolagem que vale.

### [LACUNA] ultimo-cartucho (poder)
- **Hoje:** "você revela uma munição comum compatível que havia reservado."
- **Livro:** Equipamentos: "Arma de disparo gasta uma unidade de munição por ataque... Sem munição, não há ataque."
- **Problema:** não diz o efeito na mesa.
- **Correção:** "Uma vez por cena, quando ficar sem munição, recupere 1 unidade de munição comum da sua arma sem gastar ação."
- **Decisão do Pedro?** sim, porque escolhe 1 unidade.

### [LACUNA] mira-fantasma (poder)
- **Hoje:** "Concentre-se por uma rodada" (momento "para concentrar-se").
- **Livro:** Condições › Concentrando (só um efeito; ao sofrer dano, Vontade DT 10 ou metade do dano).
- **Problema:** usa a palavra sem dizer se vale a condição.
- **Correção:** "Gaste a Ação Padrão mirando, sem se mover, e fique Concentrando até o começo do seu próximo turno. O próximo disparo ignora cobertura total oferecida por uma única barreira mundana fina."
- **Decisão do Pedro?** não

### [LACUNA] tiro-de-impulso › Impacto e tiro-de-panico (empurrar 3 m)
- **Hoje:** "empurre o alvo 3 m".
- **Livro:** Combate › Tamanho: criatura duas categorias maior "não é... empurrada sem uma regra que autorize".
- **Problema:** não diz se o limite de tamanho vale.
- **Correção:** "...empurre o alvo 3 m na direção do disparo. Não funciona contra criatura duas categorias de tamanho maior que a sua."
- **Decisão do Pedro?** não

### [MELHORIA] tiro-limpo e olho-afiado
- **Hoje:** "Ignore uma penalidade ambiental, como pouca luz, chuva ou vento forte." / "ignore penalidade de pouca luz ao mirar".
- **Livro:** Ver e ser visto: pouca luz é desvantagem em Percepção; camuflagem é −2 no ataque. Chuva e vento não têm penalidade escrita.
- **Problema:** parte das penalidades citadas não existe.
- **Correção:** Tiro Limpo: "Ignore a desvantagem de pouca luz ou o −2 de camuflagem neste ataque." Olho Afiado: "...ignore a desvantagem de pouca luz ao mirar."
- **Decisão do Pedro?** não

### [MELHORIA] tiro-de-impulso › Alcance Estendido
- **Hoje:** "uma categoria de alcance a mais".
- **Livro:** Distâncias: "faixas".
- **Problema:** termo oficial é faixa.
- **Correção:** "Sua arma ganha uma faixa de distância a mais de alcance neste ataque, reduzindo a penalidade de distância."
- **Decisão do Pedro?** não

### [MELHORIA] tiro-de-impulso › Baixo Perfil
- **Hoje:** "quem tentar te achar sofre desvantagem."
- **Livro:** Perícias (Percepção, Furtividade).
- **Problema:** não diz qual teste.
- **Correção:** "quem tentar te achar com Percepção rola com desvantagem."
- **Decisão do Pedro?** não

---

## Guardião (guardiao)

### [INCOERÊNCIA] protegido · quem é "o protegido"
- **Hoje:** Juramento: "com um aliado". Escudo Dividido: "Proteja até dois aliados". Juramentos e Vigília: "o protegido". Último Laço: "um aliado voluntário".
- **Livro:** Poderes e Habilidades (cada texto deve se ler sozinho).
- **Problema:** com dois aliados protegidos, não está claro quem recebe Juramentos e Vigília.
- **Correção:** Escudo Dividido: "Proteja o seu protegido e mais um aliado à sua escolha..." e no Juramento: "Os Juramentos de Guarda e a Vigília valem só para o protegido."
- **Decisão do Pedro?** sim, porque decide se o segundo aliado ganha juramentos.

### [LACUNA] protegido › Último Laço (nível 20)
- **Hoje:** "quando um dos dois cair a 0 Vida, o outro pode gastar 8 Estamina para deixá-lo com 1 Vida."
- **Livro:** Ferimentos: Déficit de Vida (morte imediata se chega à Vida máxima), Morrendo, "Quem acorda ganha Ferido 1".
- **Problema:** não diz o que acontece com Déficit, Morrendo e Ferido, nem se vale contra morte imediata.
- **Correção:** "...deixá-lo com 1 Vida, sem Déficit e sem Morrendo. Não vale se o Déficit já chegou à Vida máxima dele. O vínculo então termina."
- **Decisão do Pedro?** sim, porque toca em Voltar da morte.

### [LACUNA] provocar › Provocação (nível 3): "provocado"
- **Hoje:** "Quem falhar fica provocado e sofre −2 para atacar outros alvos."
- **Livro:** Condições: lista oficial com maiúscula; "Provocado" não consta.
- **Problema:** estado não oficial (sem link e sem peso Leve/Média/Grave).
- **Correção:** "Quem falhar fica Provocado: sofre −2 para atacar outros alvos até um sucesso em Vontade contra a DT do Guardião, rolado no fim de cada turno dele." E registrar Provocado em Condições (peso leve).
- **Decisão do Pedro?** sim, porque cria condição no Livro.

### [LACUNA] escudo-humano (poder)
- **Hoje:** "Use reação para se tornar o alvo de um ataque contra criatura a até 9 m."
- **Livro:** Combate › Reações: "Proteger | Aliado adjacente é atacado | Você vira o alvo".
- **Problema:** estende Proteger a 9 m sem dizer contra qual Defesa o ataque é rolado nem se vale para efeito em área.
- **Correção:** "Use a reação quando uma criatura a até 9 m for alvo de um ataque de alvo único: o ataque passa a mirar você, contra a sua Defesa. Não muda o alvo de efeito em área."
- **Decisão do Pedro?** sim, porque define o alcance do desvio.

### [LACUNA] muralha-de-diamante (Sentinela)
- **Hoje:** "faça um ataque contra ele. Se acertar, além do dano, ele para de se mover neste turno."
- **Livro:** Combate › Provocar reação: Ataque de Oportunidade tem −2 e não gera crítico.
- **Problema:** não diz −2, crítico, nem a reação gasta.
- **Correção:** "Use a reação quando um inimigo adjacente se afastar de você ou atacar outra criatura que não seja você: faça um ataque contra ele, com −2 e sem crítico. Se acertar, além do dano, o Movimento dele vira 0 até o fim do turno."
- **Decisão do Pedro?** sim, porque iguala ao ataque de oportunidade.

### [LACUNA] bandeirao (poder) e Vida temporária
- **Hoje:** "recebem 10 Vida temporária por uma cena."
- **Livro:** nenhum tópico define Vida temporária (só o Fruto de Vitalidade a cita).
- **Problema:** sem ordem de perda, empilhamento e cura.
- **Correção:** "Até três aliados a 12 m recebem 10 de Vida temporária até o fim da cena. Ela é gasta antes da Vida, não soma com outra e não pode ser curada." Pedir a mesma frase no Livro.
- **Decisão do Pedro?** sim, porque define um termo novo.

### [LACUNA] corridao (poder)
- **Hoje:** "mover até o dobro do Movimento até um aliado recém-caído; ele ganha uma rodada a mais antes do próximo teste de Morrendo."
- **Livro:** Combate › Provocar reação; Ferimentos › Morrendo.
- **Problema:** não diz se o movimento provoca nem o que "uma rodada a mais" pula.
- **Correção:** "Use a reação para se mover até o dobro do Movimento, sem provocar reação, até um aliado que acabou de cair; ele pula o próximo teste de Morrendo, que conta como sucesso."
- **Decisão do Pedro?** sim, porque decide se o teste pulado conta como sucesso.

### [LACUNA] protegido › Juramento do Punho
- **Hoje:** "use uma Reação para atacar quem o atingiu."
- **Livro:** Combate › Reações: ataque de reação com −2 e sem crítico.
- **Problema:** não diz as travas.
- **Correção:** "...use uma Reação para atacar quem o atingiu, com −2 e sem crítico."
- **Decisão do Pedro?** não

### [MELHORIA] provocar (título)
- **Hoje:** título "Provocar".
- **Livro:** Combate › Provocar reação (Ataque de Oportunidade).
- **Problema:** mesmo verbo em dois sentidos.
- **Correção:** só `titulo`: "Desafiar".
- **Decisão do Pedro?** sim, porque troca o nome visível.

### [MELHORIA] muralha-de-ouro (Postura Firme)
- **Hoje:** "+5 nos testes para resistir a ser empurrado, puxado, derrubado ou agarrado."
- **Livro:** Combate › Defesas passivas: o alvo resiste com "10 + bônus total", sem rolar.
- **Problema:** diz "testes" e não nomeia Fortitude ou Reflexos.
- **Correção:** "Receba +5 na sua defesa passiva (Fortitude ou Reflexos, a que a manobra usa) contra efeitos que tentem empurrar, puxar, derrubar ou agarrar você."
- **Decisão do Pedro?** não

### [MELHORIA] protegido › Escudo Dividido
- **Hoje:** "dividir o dano antes das Resistências".
- **Livro:** Tipos de dano: "dobre se o alvo for vulnerável e só então tire a Resistência".
- **Problema:** a vulnerabilidade pode entrar antes ou depois da divisão.
- **Correção:** "...dividir o dano depois de rolado e antes da vulnerabilidade e da Resistência de cada um."
- **Decisão do Pedro?** não

### [MELHORIA] castelo (nível 18)
- **Hoje:** "permaneça imóvel por três rodadas".
- **Livro:** Combate › Seu turno.
- **Problema:** não diz se pode atacar.
- **Correção:** "Fique parado por três rodadas: você pode atacar e usar ações, mas não se desloca."
- **Decisão do Pedro?** não

---

## Padrões que se repetem

1. **Vida temporária sem regra.** Guerreiro (Levanta!) e Guardião (Bandeirão). O Livro só a cita no Fruto de Vitalidade. Falta uma frase: dura até quando, é gasta antes da Vida, não soma, não se cura.
2. **Voltar a 1 de Vida.** Bandeira Fincada, Levanta! nível 4 e Último Laço não dizem o que acontece com Déficit, Morrendo e Ferido 1. Escolher uma frase padrão.
3. **Ataque de reação sem as travas do Livro.** Errou Perto de Mim, Ninguém Passa!, Riposte, Sentinela, Juramento do Punho (−2 e sem crítico no Livro).
4. **Condição sem o nome.** −2 de Defesa em Peito Aberto, Combo, Impacto Brutal, Marcas de Guerra e Zigue-Zague sem usar Exposto; Finta usa Exposto com duração diferente da oficial. Decidir o empilhamento.
5. **"Grau em Luta".** Comando de Guerra e Braço de Ferro: usar "bônus do seu grau em Luta".
6. **Janela "por sessão" em recurso de combate.** Munição Especial (Atirador) e Armas de Qualidade (Guerreiro).
7. **"Este combate".** Posturas do Espadachim e Técnicas de Punho dizem "Este combate"; o Livro chama o combate de cena.
8. **Empurrar sem trava de tamanho.** Impacto e Tiro de Pânico (Atirador), Punho Sísmico (Lutador).
9. **Criatura incorpórea.** Etérea (Atirador) e Punhos Fantasma (Lutador) usam o termo, e nenhum tópico do Livro o define.
10. **Resistência genérica.** Só Cobertura! (Guerreiro) usava a forma abolida. As outras (Muralha, Pedra, Postura de Ferro, Segura!) são de "dano físico", válidas.
11. **`id` com título trocado.** Espadachim: golpe-em-w = Desarme, corte-cirurgico-ii = Finta, penetrar-armadura-ii = Aparar Projétil, protecao-da-espada-ii = Riposte, corte-a-distancia-ii = Corte Giratório. Guardião: as "muralha-de-..." são poderes diferentes. Não mexer; só ao ler o JSON.

## Conferido sem problema

- **Guerreiro:** grade; as dez ordens do Batalhão e escalonamentos; Peito Aberto; Bebe do Estrago; Sai da Frente (custo e janela por cena); Senhor da Guerra (por descanso, imunidade a Amedrontado); Arsenal Especial; Grito de Batalha; Alvo do Batalhão; Sério Isso?; Segura! (Resistência a dano físico vale).
- **Espadachim:** grade; Arte da Espada em todos os estágios; as oito Posturas (Fio Afiado e Guarda Alta seguem a regra de crítico); Golpe em Z; Corte Cirúrgico; Penetrar Armadura; Aparar Projétil; Proteção da Espada; Corte Giratório; Espírito da Espada e Golpe Perfeito (por descanso).
- **Lutador:** grade; bancada de manobras (defesas e fórmulas batem com Combate, incluindo Escapar e Empurrar); Pegada; Sai da Base; Punhos de Ferro (dados e margem); Técnicas de Punho (Gancho, Joelhada, Cabeçada, Chute Circular); outros estilos; Kokusen (por descanso); Apertão de Aço; Impacto Brutal; Guarda Inabalável; Não Levanta; Quebra-Gigante.
- **Atirador:** grade; Primeiro Tiro; Marca; Duas Marcas; Disparo Calculado (cobertura parcial e superior batem com Combate); Ponto Fraco (regra de crítico); Perfurante em Linha; Fragmentação; Recarga Rápida; High Ground; Mira Fria; Zigue-Zague; Ricochete; Arma Quente; Munição Perfurante e Silenciosa.
- **Guardião:** grade; Juramento; Provocação (custos e teste no fim do turno, como Amedrontado); Couraça Firme e Muralha Viva (redução por golpe físico); Ninguém Passa; Castelo; Coração Unificado (reduza em 10 o dano de cada golpe); Juramentos Ferro, Sangue ("condição leve" bate com a escala), Silencioso, Pedra, Vigia, Inabalável; Muralha; Guarda Compartilhada; Muralha de Grafeno; Brutamontes; Brasão.
