# Relatório do grupo C: Autômato, Vampiro, Auleth, Onírico

Convenções: "dt_efeitos" = bloco de DT de raça. "Janela" = por rodada, turno, cena, descanso ou sessão.
Todas as correções abaixo evitam travessão, "eco" e a antítese "não é X, é Y".

## Autômato (automato)

### [INCOERÊNCIA] corpo-artificial · descricao, imunidades e fisiologia
- **Hoje:** fisiologia: "É imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos"; traço: "imune a Atordoado, Enjoado, Envenenado e Fascinado, a doenças, a Cansaço e a sono"; campo `imunidades` sem "veneno".
- **Livro:** Aflições › Imunidades: "Autômato é imune a doenças e venenos enquanto não possuir Máquina Viva." Condições: Fascinado, Atordoado e Enjoado são condições; Cansaço é a trilha de Descanso.
- **Problema:** a fisiologia fala em "encantamentos" e "fadiga" (termos que o Livro não usa nesse sentido) e o traço esquece "venenos" (aflição), que o Livro garante. As duas listas precisam dizer a mesma coisa. "Sono" também não é condição do Livro.
- **Correção:** fisiologia[2]: "É imune a Atordoado, Enjoado, Envenenado e Fascinado, a venenos e doenças, a Cansaço e ao sono, inclusive o mágico, enquanto não possuir a modificação Máquina Viva." Traço: "Você é imune a Atordoado, Enjoado, Envenenado e Fascinado, a venenos, a doenças, a Cansaço e ao sono, inclusive o mágico. Não precisa respirar, comer, beber ou dormir. Essas imunidades são perdidas enquanto Máquina Viva estiver instalada." Em `imunidades`, acrescentar "veneno".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] reparo-mecanico · descricao, dt_base, dt_metade_nivel, vida_por_sucesso
- **Hoje:** "Ofício (Engenharia) contra DT 15 + piso do seu Nível Total dividido por 2; em sucesso, você recupera 5 de Vida. Uma nova tentativa exige outra hora."
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: DT numérica é a do nível 1 mais o ajuste da tabela (nível 20 = 30, nível 60 = 56). Ferimentos › Tratar ferimentos: "1d6 de Vida ou um décimo da Vida máxima, o que for maior. Assim o curativo vale no nível 3 e no nível 30." Ferimentos › Vida negativa: "A cura preenche o Déficit primeiro."
- **Problema:** (1) a DT usa a fórmula antiga ("15 + metade do nível"): no nível 20 dá 25 em vez de 30, no 60 dá 45 em vez de 56. (2) 5 de Vida fixos não escalam: com 300 de Vida o reparo leva 60 horas. (3) Não diz que preenche o Déficit de Vida, então um Autômato caído em Morrendo fica sem regra para acordar. (4) Tecnologia "repara itens A.X.I.S" e o Autômato vem da A.X.I.S.
- **Correção:** "Descanso e curas comuns ou mágicas não recuperam sua Vida. Um personagem pode gastar uma hora e fazer Ofício (Engenharia) ou Tecnologia contra a DT Padrão do nível do Autômato; em sucesso, ele recupera 1d6 de Vida ou um décimo da Vida máxima, o que for maior. O reparo preenche o Déficit de Vida primeiro e vale uma vez por descanso curto para cada Autômato. Máquina Viva substitui esta regra pela recuperação normal." Campos: `dt_metade_nivel` sai, `vida_por_sucesso` vira "1d6 ou 10%".
- **Decisão do Pedro?** sim, porque mexe no quanto o Autômato se cura e o pacote dele já foi decidido.

### [ERRO] raio-inferno · descricao
- **Hoje:** "Faça Pontaria contra Reflexos. Em falha, ela sofre 4d6+4 de dano tecnológico; em sucesso, sofre metade."
- **Livro:** Magia e Fluxo › Ataque e resistência: magia de ataque lê o total contra a Defesa e o dano entra inteiro, sem metade; magia de efeito tem resistência e metade no sucesso. Combate › Manobras: ataque contra defesa passiva é "10 mais o bônus".
- **Problema:** mistura as duas mecânicas: rola Pontaria (ataque) e ainda dá metade de dano (resistência). Não dá para saber quem rola o quê.
- **Correção:** "Uma vez por cena, gaste uma ação e 4 Energia do Núcleo para disparar um raio quente contra uma criatura a até 18 m. Ela testa Reflexos contra a sua DT de Autômato. Em falha, sofre 4d6+4 de dano tecnológico; em sucesso, sofre metade."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] laser, eletrificar, pulso-estridente · descricao e dt_efeitos ausente
- **Hoje:** Laser: "Faça um teste de Tecnologia e compare com os Reflexos de cada criatura na linha. Em falha, ela sofre..."; Eletrificar: "teste de Tecnologia contra os Reflexos de todas as outras criaturas"; Pulso Estridente: "Tecnologia contra a Fortitude de cada outra criatura".
- **Livro:** Raças: "a raça tem a sua DT... você rola a perícia da raça na hora, e o resultado é a DT". Magia e Fluxo › Ataque e resistência: o alvo rola a resistência dele contra o total.
- **Problema:** o Autômato não tem `dt_efeitos`, ao contrário de Vampiro, Auleth e Onírico. O texto manda "comparar" com os Reflexos, e "falha" fica sem dono (do alvo ou do Autômato?).
- **Correção:** acrescentar `"dt_efeitos": {"rotulo": "DT de Autômato", "pericia": "tecnologia", "descricao": "Quando uma modificação sua manda alguém testar Fortitude, Reflexos, Vontade ou Percepção, role Tecnologia na hora: o resultado é a DT que a criatura precisa alcançar, e uma rolagem vale para todos os alvos daquele uso."}`. Laser: "...disparar uma linha de 30 m. Cada criatura na linha testa Reflexos contra a sua DT de Autômato. Em falha, sofre 4d10+4 de dano tecnológico; em sucesso, sofre metade." Eletrificar: "...Cada criatura hostil a até 4,5 m testa Reflexos contra a sua DT de Autômato. Em falha, sofre 3d8+4 de dano tecnológico; em sucesso, sofre metade." Pulso Estridente: "Cada criatura hostil a até 6 m testa Fortitude contra a sua DT de Autômato. Em falha, fica Atordoada até o fim do próximo turno dela; em sucesso, não sofre efeito."
- **Decisão do Pedro?** sim, porque a perícia da DT (Tecnologia) é escolha de design.

### [INCOERÊNCIA] eletrificar, pulso-estridente · descricao (aliados no alvo)
- **Hoje:** "contra os Reflexos de todas as outras criaturas a até 4,5 m" / "cada outra criatura a até 6 m".
- **Livro:** Magia e Fluxo (Termos): efeitos de área hostis falam em criaturas hostis; Ajudar e Ações Coletivas tratam aliados à parte.
- **Problema:** como escrito, atinge aliados, e o Pulso Estridente atordoa o grupo inteiro (Atordoado: "Não pode usar ações nem reações. Defesa reduzida em 5").
- **Correção:** trocar "todas as outras criaturas" e "cada outra criatura" por "criaturas hostis" (já incluído nos textos acima).
- **Decisão do Pedro?** não

### [INCOERÊNCIA] laser · descricao e recarga_rodadas
- **Hoje:** "Depois do disparo, o Laser precisa de 1d4+1 rodadas para recarregar." (`recarga_rodadas`: "1d4+1")
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: as janelas são por rodada, por turno, por cena, por descanso e por sessão.
- **Problema:** recarga rolada em dado é uma janela que o Livro não tem, e obriga a mesa a acompanhar um contador.
- **Correção:** "Uma vez por cena, gaste uma ação completa e 8 Energia do Núcleo para disparar uma linha de 30 m." (`usos`: 1, `recuperacao`: "cena", sai `recarga_rodadas`). Alternativa mais generosa: "duas vezes por cena".
- **Decisão do Pedro?** sim, porque troca o ritmo do Laser.

### [INCOERÊNCIA] garra-extensora · descricao
- **Hoje:** "faça Pontaria contra Reflexos; em sucesso, ela fica agarrada enquanto o cabo permanecer preso. Ela pode gastar uma ação e superar 10 + seu bônus de Pontaria com Atletismo ou Acrobacia para escapar."
- **Livro:** Combate › Manobras: "10 mais o bônus total da defesa", "Agarrado" é condição, e "Criatura duas categorias de tamanho maior que você não é agarrada". Condições: Agarrado sai com Ação Padrão e Atletismo ou Acrobacia.
- **Problema:** "Pontaria contra Reflexos" não diz que a defesa é passiva (10 + Reflexos). "agarrada" está em minúscula. Não há duração: o alvo fica com Movimento 0 enquanto o cabo durar, sem limite, por 2 de Energia. Falta a trava de tamanho.
- **Correção:** "Gaste uma ação e 2 Energia do Núcleo para disparar uma garra presa a cabos contra uma criatura ou objeto a até 12 m. Contra uma criatura, faça Pontaria contra 10 + Reflexos dela; em sucesso, ela fica Agarrada por até 3 rodadas, enquanto o cabo permanecer preso. Criatura duas categorias de tamanho maior que você não é agarrada. Ela escapa gastando uma Ação Padrão e superando 10 + seu bônus de Pontaria com Atletismo ou Acrobacia. Depois de solta ou recolhida, a garra exige uma Ação Completa para recarregar."
- **Decisão do Pedro?** sim, porque o limite de 3 rodadas é número novo.

### [INCOERÊNCIA] corpo-macico · descricao e resistencia_fisica
- **Hoje:** "Receba Resistência 2 a corte, perfuração e impacto... Ela não reduz dano verdadeiro nem o que atinge o núcleo por dentro." (`resistencia_fisica`: 2)
- **Livro:** Tipos de Dano: "Físicos: corte, perfuração, impacto e balístico." "Resistência física geral cobre todos os danos físicos." Dano verdadeiro: "Nenhuma Resistência reduz esse dano".
- **Problema:** o campo diz "física" (quatro tipos) e o texto lista três, deixando o balístico de fora enquanto o Escudo trata balístico à parte. "O que atinge o núcleo por dentro" não existe no Livro. A frase sobre dano verdadeiro só repete a regra.
- **Correção:** "Placas grossas cobrem o chassi inteiro. Receba Resistência 2 a dano físico (corte, perfuração, impacto e balístico), mais 1 a cada 10 níveis totais (3 no nível 10, 8 no nível 60)."
- **Decisão do Pedro?** sim, porque incluir balístico muda a força da modificação.

### [INCOERÊNCIA] modificações ativas · nivel_minimo contra capacidade_modificacoes
- **Hoje:** Detecção, Garra Extensora, Modo Veículo e Punho Voador com `nivel_minimo` 1; Pulso Estridente e Raio Inferno 4; Eletrificar 5; "Uma modificação ativa exige pelo menos três passivas instaladas" e limite "1 + piso do Nível Total dividido por 2".
- **Livro:** Sistema Base › Nível e multiclasse: o nível total define o que se tem; Poderes e Habilidades: requisitos escritos valem na mesa.
- **Problema:** três passivas mais uma ativa são 4 vagas, e 4 vagas só existem a partir do nível total 6 (1 + ⌊6/2⌋ = 4). Os níveis mínimos 1, 4 e 5 nunca valem de verdade. Também não diz se o Legado extra "Módulo Adicional" ocupa vaga.
- **Correção:** ou subir `nivel_minimo` das ativas de nível 1 a 5 para 6, ou acrescentar ao Arquitetura Modular: "O componente do Módulo Adicional não conta no limite de modificações." Escolher um.
- **Decisão do Pedro?** sim, porque depende de querer o Autômato com ativa antes do nível 6.

### [LACUNA] chassis (todas as variantes) · dano_natural
- **Hoje:** "arma natural com dano-base 1d8" (sem tipo de dano e sem atributo).
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força... Classe ou raça que der outro dano desarmado, como o Lutador, diz isso no próprio texto." Tipos de Dano: toda arma tem tipo.
- **Problema:** não diz o tipo (impacto? corte?), nem se soma Força, nem a margem de crítico. Vale também para Esmagador e para o Punho Voador, que usa "o dano-base de sua arma natural" com Pontaria.
- **Correção:** em cada Estrutura, acrescentar: "O ataque natural usa Luta, soma Mod. Força, causa dano de impacto e tem crítico 20/x2." No Punho Voador: "...usando o dano-base de impacto da sua arma natural, sem somar Força."
- **Decisão do Pedro?** sim, porque é escolher o tipo de dano da raça.

### [INCOERÊNCIA] chassis · movimento_fixo
- **Hoje:** `movimento_fixo` 6, 9, 12 ou 15 m, com "Destreza" em `ajustes_atributos` (de −2 a +4).
- **Livro:** Sistema Base › Defesa, movimento e iniciativa: "Movimento: 9 m + (1,5 m × Mod.Destreza) + ajuste da raça ou morfologia, mínimo 4,5 m."
- **Problema:** `movimento_fixo` aparece só no Autômato e parece trocar a fórmula inteira (ignora Mod.Destreza), mas o Livro só prevê "ajuste da raça". Hoje o Quadrúpede Pequeno (Destreza +4) fica igual a quem tem Destreza 0.
- **Correção:** confirmar a intenção. Se for para seguir o Livro: trocar para `movimento` com o ajuste (ex.: Bípede Pequeno −3, Normal 0, Grande +3 e Enorme +3; Quadrúpede Normal +3, Grande +6, Enorme +6), ou escrever no traço "Movimento fixo, sem somar Destreza".
- **Decisão do Pedro?** sim, porque são números de balanceamento.

### [LACUNA] compartimento-de-carga · descricao
- **Hoje:** "+15 espaços de carga, sem a perda de Movimento de um mochilão."
- **Livro:** Equipamentos › Carga e espaços: "Passou da capacidade, você fica Sobrecarregado: 3 m a menos de movimento e desvantagem em testes físicos." "Mochila, bolsa ou habilidade só aumentam sua capacidade quando trazem um número explícito."
- **Problema:** "mochilão" não existe no Livro e a "perda de Movimento" é a Sobrecarga.
- **Correção:** "Seu chassi possui um compartimento de carga: receba +15 espaços de capacidade de carga. Retirar um item guardado exige uma Ação de Movimento."
- **Decisão do Pedro?** não

### [LACUNA] maquina-viva · descricao (o que mais muda)
- **Hoje:** "perde todas as imunidades de Corpo Artificial e não pode usar Reparo Mecânico."
- **Livro:** Implantes › O preço na mente: "O Autômato paga metade, arredondada para cima: o corpo dele já é máquina." Fôlego e Fome e sede dependem de a raça não respirar nem comer.
- **Problema:** não diz se, com Máquina Viva, o Autômato volta a respirar, comer e dormir (o traço junta isso às imunidades) nem se ainda paga só metade dos implantes. Também não diz o que o Autômato faz quanto a Sangramento (Hemofagia o trata como construto "sem sangue").
- **Correção:** acrescentar: "Enquanto estiver instalada, você volta a precisar respirar, comer, beber e dormir, e paga a Sanidade inteira dos implantes."
- **Decisão do Pedro?** sim, porque são três regras novas ligadas ao pacote do Autômato.

### [MELHORIA] nucleo-autonomo · descricao (Fluxo nativo)
- **Hoje:** "O núcleo roda o Fluxo da Tecnologia, que é o seu Fluxo nativo."
- **Livro:** Magia e Fluxo › Princípios dos Fluxos: "O Autômato é a exceção: ele é montado, e o núcleo dele já é a Tecnologia instalada." E: "A Tecnologia é o único artificial, e é por isso que ela é a única que se instala... o Fluxo instalado abre as magias dele e não dá Marca de círculo."
- **Problema:** o Livro chama de "instalado", a raça chama de "nativo". Muda se há Marca de círculo.
- **Correção:** "O núcleo já traz o Fluxo da Tecnologia instalado, e ele é o único Fluxo do Autômato."
- **Decisão do Pedro?** sim, porque define se o Autômato ganha Marcas.

### [LACUNA] escudo · descricao
- **Hoje:** "reduza pela metade o dano balístico."
- **Livro:** Tipos de Dano › Resistência e ordem de aplicação: role o dano, dobre se vulnerável, "só então tire a Resistência". "Resistência é sempre por tipo."
- **Problema:** "metade" não tem lugar na ordem de dois passos, e soma com a Resistência do Corpo Maciço de um jeito que não está escrito (metade antes ou depois do −2?).
- **Correção:** "Receba +4 Defesa e Resistência a dano balístico igual a 4 + 1 por 10 níveis totais" ou, mantendo a metade: "reduza à metade o dano balístico, e só depois aplique a Resistência".
- **Decisão do Pedro?** sim, porque troca a mecânica ou escolhe a ordem.

### [MELHORIA] vários · grafia de ações e condições
- **Hoje:** "uma ação de movimento", "uma ação completa", "ela fica agarrada".
- **Livro:** Combate › Seu turno: "Ação de Movimento", "Ação Completa"; Condições: "Agarrado".
- **Problema:** Compartimento de Carga, Laser, Modo Veículo e Garra Extensora usam minúscula. "uma ação" solta equivale a Ação Padrão ("Sem isso escrito, ele é uma Ação Padrão").
- **Correção:** escrever "Ação de Movimento", "Ação Completa" e "Agarrada". Opcional: "uma Ação Padrão" nos poderes com tipo `acao`.
- **Decisão do Pedro?** não

## Vampiro (vampiro)

### [INCOERÊNCIA] sombra-que-engole, uivo-da-alcateia, mare-vermelha, lua-que-nao-se-poe · recuperacao
- **Hoje:** texto "duas vezes por descanso" / "uma vez por descanso", campo `recuperacao`: "sessao".
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: "Por sessão... Poder de combate volta no descanso." No Modo mesa, o botão Descansei zera "por descanso" e Nova sessão zera "por sessão".
- **Problema:** a ficha devolveria esses usos só na Nova sessão, contra o que o texto promete. Todos são efeitos de combate.
- **Correção:** `recuperacao`: "descanso" nos quatro.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] juramento-de-sangue (Voievod, 42) · descricao
- **Hoje:** "pode gastar sua reação para dar a ela uma ordem, que ela cumpre imediatamente... duas vezes por sessão."
- **Livro:** Poderes e Habilidades: por sessão é para história, informação, dinheiro e sorte. Condições: efeitos de controle saem por teste (Amedrontado, Desorientado, Paralisado).
- **Problema:** depois do vínculo, a ordem em reação não tem teste nem o limite da ordem suicida (que a Ordem Sussurrada tem). Quem bebeu o sangue, ou "de quem você bebeu", obedece sempre. Janela errada para efeito de combate.
- **Correção:** "Vincule a si uma criatura que tenha bebido do seu sangue, ou de quem você bebeu. Por uma cena, você percebe o que ela percebe e pode gastar sua reação para dar a ela uma ordem curta: ela testa Vontade contra a sua DT de Vampiro e, se falhar, cumpre a ordem na hora. Ordem abertamente suicida ela não cumpre. Uma ação completa e 8 Mana, duas vezes por descanso." (`recuperacao`: "descanso")
- **Decisão do Pedro?** sim, porque muda a força do Clã.

### [INCOERÊNCIA] investida-predadora (Strigoi, 42) · descricao
- **Hoje:** "ela testa Reflexos... e, se falhar, cai no chão agarrada por você e sofre 5d6 de dano de corte. Se ela estiver com metade da Vida ou menos, você ainda usa Hemofagia de graça."
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra." Condições: Caído e Agarrado.
- **Problema:** no sucesso não acontece nada (falta a metade). "cai no chão agarrada" não nomeia as condições. A Hemofagia só serve em ser voluntário ou incapacitado, e a vítima agarrada resiste; a exceção só existe na Coroa de Sangue. Falta a trava de tamanho.
- **Correção:** "Salte até 12 m em cima de uma criatura: ela testa Reflexos contra a sua DT de Vampiro. Em falha, fica Caída e Agarrada por você e sofre 5d6 de dano de corte; em sucesso, sofre metade. Criatura duas categorias de tamanho maior que você não é agarrada nem derrubada. Se ela estiver com metade da Vida ou menos, você pode usar Hemofagia nela mesmo que resista, sem gastar ação nem o uso da cena. Uma ação e 6 Mana, duas vezes por cena."
- **Decisão do Pedro?** não

### [LACUNA] hemofagia, mordida-esquecida · termos e campos
- **Hoje:** Hemofagia: "ser vivo voluntário ou incapacitado", "Custa uma ação", sem `usos`; Mordida Esquecida: "voluntária ou indefesa", "acorda só cansada".
- **Livro:** Condições: Inconsciente, Paralisado, Atordoado, Imobilizado. Descanso: Cansaço é número inteiro. Poderes: "Sem isso escrito, ele é uma Ação Padrão."
- **Problema:** três nomes para o alvo (incapacitado, indefeso, agarrado). "Cansada" não tem número. Hemofagia não tem `usos`/`recuperacao` (o Sangue Velho tem) e não diz o que a vítima sofre. Mordida Esquecida diz "gaste uma ação" sem dizer se é a mesma da Hemofagia.
- **Correção:** Hemofagia: "Como Ação Padrão, beba o sangue de um ser vivo voluntário, Inconsciente, Paralisado ou Imobilizado e recupere 1d6 de Vida. Vale uma vez por cena. A vítima perde 1d6 de Vida. Construto, Espírito e criatura sem sangue não servem." (`usos`: 1, `recuperacao`: "cena"). Mordida Esquecida: "Ao usar Hemofagia numa criatura voluntária ou Inconsciente, gaste 3 Mana, sem ação extra, para limpar o rastro: ela não guarda memória clara e acorda com 1 de Cansaço, sem marca visível."
- **Decisão do Pedro?** sim, porque o dano à vítima e o Cansaço são números novos.

### [LACUNA] fome-de-sangue · descricao
- **Hoje:** "seus descansos passam a devolver apenas metade da Mana normal, com mínimo de 1."
- **Livro:** Descanso: recupera % do máximo; Relaxar devolve 25% da Mana. Perigos › Fome e sede: "uma porção de comida e uns 4 litros de água" por dia.
- **Problema:** "Mana normal" não é conta do Livro e o Relaxar escapa da penalidade. Também não diz se o Vampiro ainda come e bebe (o povo "precisa de sangue para viver").
- **Correção:** "Passadas 24 horas sem consumir sangue, o descanso completo e o Relaxar devolvem só metade da Mana, até você se alimentar de novo."
- **Decisão do Pedro?** sim, porque falta decidir se o sangue substitui comida e água.

### [LACUNA] hemomancia, transfusao, mare-vermelha · custo em Vida e efeitos
- **Hoje:** Hemomancia: "1d4 da própria Vida... estancar o ferimento... causando 1d6 de dano à criatura ferida"; Maré Vermelha: "Todo o sangue derramado... metade do dano causado a uma delas... 4d6 da própria Vida".
- **Livro:** Ferimentos › Vida temporária; Condições › Sangramento: "Sofra 1d6 de dano no fim do turno... qualquer cura de pelo menos 1 PV encerra."
- **Problema:** (1) o custo em Vida não diz se usa Vida temporária nem se pode derrubar a 0. (2) "estancar" e "acelerar o sangramento" não citam a condição Sangramento. (3) o 1d6 da Hemomancia não tem teste nem tipo. (4) Maré Vermelha funciona sem sangue na área e não diz qual criatura cura.
- **Correção:** Hemomancia: "Gaste 1 Mana e 1d4 da própria Vida (que não pode deixar você abaixo de 1) para mexer em sangue já exposto a até 9 m. Escolha: encerrar Sangramento de um aliado, apagar uma poça, ou fazer uma criatura em Sangramento testar Fortitude contra a sua DT de Vampiro: em falha, sofre 1d6 de dano de Sangue; em sucesso, nada." Maré Vermelha: "...sangue derramado (poça ou criatura em Sangramento)... Você recupera Vida igual à metade do dano causado à criatura mais ferida da área." Em Transfusão e Maré: "a Vida paga não é coberta por Vida temporária e não deixa você abaixo de 1".
- **Decisão do Pedro?** sim, porque define o custo em Vida.

### [MELHORIA] veu-de-nevoa (Noite Eterna, 17) · descricao
- **Hoje:** "o dano cai pela metade e você se move até 3 m sem provocar ataque de oportunidade."
- **Livro:** Combate › Provocar reação: "sem provocar reação". Tipos de Dano: a Resistência entra por último.
- **Problema:** termo fora do Livro; a metade não diz se vem antes da Resistência.
- **Correção:** "o dano cai pela metade, antes da Resistência, e você se move até 3 m sem provocar reação."
- **Decisão do Pedro?** não

### [MELHORIA] nevoa-e-morcego (Senhor da Noite, 42) · descricao
- **Hoje:** "reduz à metade o dano físico comum... atravessa qualquer fresta."
- **Livro:** Condições › Incorpóreo: "Sofre metade do dano físico que não venha de magia nem de arma mágica."
- **Problema:** "dano físico comum" não é termo do Livro, e a forma não diz como escapa de Agarrado.
- **Correção:** "reduz à metade o dano físico que não venha de magia nem de arma mágica. Ao assumir a forma, você sai de Agarrado e de Imobilizado."
- **Decisão do Pedro?** não

### [LACUNA] coroa-de-sangue (Noite Eterna, 42) · descricao
- **Hoje:** "precisa passar num teste de Vontade contra a sua DT de Vampiro toda vez que quiser atacar você."
- **Problema:** não diz o que a falha faz nem a frequência de "toda vez".
- **Correção:** "...faz um teste de Vontade contra a sua DT de Vampiro, uma vez por turno dele, ao tentar atacar você; em falha, perde esse ataque."
- **Decisão do Pedro?** não

### [LACUNA] rosto-emprestado (Moroi, 42) · descricao
- **Hoje:** "pode notar diferenças de comportamento com um teste de Intuição."
- **Livro:** Auleth, Forma sem Molde: "Enganação contra a Intuição de quem a conheça". Infiltração › Ser quem não é: Enganação ou Atuação.
- **Problema:** teste sem DT nem lado.
- **Correção:** "Quem conhece a criatura de perto a nota com Intuição contra a sua Enganação." (`recuperacao`: "sessao" está certo, é infiltração.)
- **Decisão do Pedro?** não

### [LACUNA] presenca-de-corte (Voievod, 1) · descricao
- **Hoje:** "Servos e criaturas de vontade fraca hesitam antes de escolher você como primeiro alvo."
- **Livro:** Sangue Real, do mesmo povo: "desvantagem no primeiro ataque contra você em cada cena".
- **Problema:** "hesitam" e "vontade fraca" não se resolvem na mesa.
- **Correção:** "Contra quem sabe o que você é, receba vantagem em Diplomacia e Intimidação. Uma vez por cena, o primeiro ataque de um servo ou de uma criatura sem nome contra você sofre desvantagem."
- **Decisão do Pedro?** sim, porque cria um efeito novo.

### [LACUNA] faro-de-sangue (Strigoi, 17) · descricao
- **Hoje:** "percebe se quem está sangrando se feriu com gravidade. Uma vez por cena, gaste 2 Mana..."
- **Livro:** Ferimentos: "Gravidade" é a escala 0 a 4 da queda; Sangramento é condição.
- **Problema:** "gravidade" colide com a Gravidade de Ferimentos, e falta `usos`.
- **Correção:** "...e percebe quem está em Sangramento ou com menos da metade da Vida." (`usos`: 1, `recuperacao`: "cena")
- **Decisão do Pedro?** não

### [LACUNA] pelagem-noturna, forma-de-fera, uivo-da-alcateia (Pricolici) · descricao
- **Hoje:** "ataques desarmados passam a usar dano-base 1d8"; "seus ataques usam dano-base 1d10".
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto"; raça que muda o dano "diz isso no próprio texto".
- **Problema:** sem tipo de dano. Na Forma de Fera, "seus ataques" parece valer também para armas. O Uivo não diz que exige a Forma ativa.
- **Correção:** "dano-base 1d8 de corte"; "seus ataques desarmados usam dano-base 1d10 de corte". Uivo: "Se estiver na Forma de Fera, uive e ela fica sem limite de duração até o fim da cena."
- **Decisão do Pedro?** sim, porque escolhe corte contra impacto.

### [MELHORIA] terror-de-porao, sombra-que-engole · descricao
- **Hoje:** "criaturas a até 9 m que enxerguem você testam Vontade"; "área de 12 m".
- **Livro:** Condições › Amedrontado já impede aproximar-se; a zona testa ao entrar ou no começo do turno.
- **Problema:** o Terror atinge aliados e repete a condição; a Sombra não diz raio nem centro e só testa no começo do turno.
- **Correção:** Terror: "criaturas hostis a até 9 m que enxerguem você... ficam Amedrontadas por duas rodadas". Sombra: "uma área de 12 m de raio centrada em você... Cada criatura hostil que entrar na área ou começar o turno nela testa Vontade".
- **Decisão do Pedro?** não

### [MELHORIA] carne-que-fecha, fome-de-senhor · descricao
- **Hoje:** Fome de Senhor: "você perde a Carne que Fecha".
- **Problema:** a Carne que Fecha já exige ter se alimentado nas últimas 24 horas, então a perda já acontece sozinha. Na Noite Eterna a Fome vem em 12 h, mas a Carne segue 24 h.
- **Correção:** tirar "você perde a Carne que Fecha" e manter "desvantagem em testes de Vontade".
- **Decisão do Pedro?** não

## Auleth (auleth)

### [INCOERÊNCIA] colapso-solar, horizonte-de-eventos, peso-de-mundo, bercario, farol, impacto, forma-verdadeira · recuperacao
- **Hoje:** texto "Duas vezes por descanso", campo `recuperacao`: "sessao".
- **Livro:** Poderes e Habilidades › limite de uso: por sessão é de história e informação; combate volta no descanso.
- **Problema:** a ficha zera em Nova sessão em vez de Descansei.
- **Correção:** `recuperacao`: "descanso" nos sete.
- **Decisão do Pedro?** não

### [LACUNA] colapso-solar, pulso, reentrada, impacto · descricao (DT ausente)
- **Hoje:** "metade em Reflexos"; "com Fortitude para evitar a lentidão".
- **Livro:** Raças: a DT da raça vem de `dt_efeitos`. Os outros traços do Auleth já dizem "contra a sua DT de Auleth".
- **Problema:** não diz contra que DT.
- **Correção:** "...metade se passarem em Reflexos contra a sua DT de Auleth" (Colapso, Reentrada, Impacto); Pulso: "Fortitude contra a sua DT de Auleth".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] fotosfera (Estrela, 18) · descricao
- **Hoje:** "criaturas hostis que terminarem o turno adjacentes a você sofrem 1d6 de dano de fogo".
- **Livro:** Convenção de dano de zona: teste e metade no sucesso. Tipos de Dano: fogo repete só se a fonte disser (aqui diz).
- **Problema:** dano recorrente sem teste.
- **Correção:** "...terminarem o turno adjacentes a você testam Reflexos contra a sua DT de Auleth e sofrem 1d6 de dano de Fogo, ou metade se passarem."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] gravidade-propria (Planeta, 18) · descricao
- **Hoje:** "criaturas hostis a até 6 m têm o Movimento reduzido à metade e não conseguem saltar nem voar dentro da área."
- **Livro:** Condições › Lento ("Movimento pela metade e sem correr"); a zona testa ao entrar ou no começo do turno.
- **Problema:** controle em área sem teste, e não diz o que acontece com quem voa.
- **Correção:** "...criaturas hostis que entrarem na área ou começarem o turno nela testam Fortitude contra a sua DT de Auleth; em falha, ficam Lentas e não saltam nem voam até saírem. Quem estiver voando desce sem sofrer dano."
- **Decisão do Pedro?** sim, porque troca o efeito garantido por teste.

### [INCOERÊNCIA] pulso (Pulsar, 18) · descricao
- **Hoje:** "dispositivos não blindados param por uma rodada, e construtos ou autômatos sofrem 2d6 de dano de raio e ficam lentos... com Fortitude para evitar a lentidão."
- **Livro:** Condições: Lento. Implantes: "campo de interferência ou sobrecarga podem desligá-lo". Convenção de dano de área.
- **Problema:** dano sem teste; "lentos" em minúscula; "dispositivos" inclui implantes e itens dos aliados sem teste.
- **Correção:** "...dispositivos hostis ou sem dono param por uma rodada. Construtos e Autômatos hostis a até 9 m testam Fortitude contra a sua DT de Auleth: em falha, sofrem 2d6 de dano de Raio e ficam Lentos até o fim do próximo turno deles; em sucesso, metade e sem Lento."
- **Decisão do Pedro?** sim, porque fixa o que o Pulso desliga.

### [LACUNA] atracao-irresistivel (Buraco Negro, 18) · descricao
- **Hoje:** "puxar uma criatura a até 12 m... é arrastada e tem o Movimento reduzido à metade".
- **Livro:** Combate › Manobras: "Criatura duas categorias de tamanho maior que você não é agarrada, derrubada nem empurrada"; Provocar reação: ser puxado não provoca.
- **Problema:** não respeita a trava de tamanho e "arrastada" não é condição.
- **Correção:** "...Criatura duas categorias de tamanho maior que você não é puxada. Em falha, ela é puxada, sem provocar reação, e fica Lenta até o fim do próximo turno dela."
- **Decisão do Pedro?** não

### [LACUNA] forma-sem-molde · descricao e tipo
- **Hoje:** "gaste sua ação e todo o Movimento do turno... entre Minúsculo, Pequeno, Normal, Grande ou Enorme"; Molde Estável (campo `tipo` "acao_completa") custa "ação de movimento".
- **Livro:** Combate › Tamanho: espaço e alcance mudam com o Tamanho; manobras: duas categorias acima não são agarradas. Seu turno: "Ação Completa".
- **Problema:** não diz se o Tamanho novo vale para espaço, manobras e a trava (um Auleth Enorme seria imune a agarrar de qualquer Normal). Wording fora do Livro; Molde Estável com `tipo` errado.
- **Correção:** "Como Ação Completa, e à vontade, altere anatomia, aparência, voz e tamanho... O Tamanho novo vale para o espaço que você ocupa; para manobras e para a trava de duas categorias, vale sempre o seu Tamanho Normal." Molde Estável: `tipo` "movimento", texto "passa a custar só uma Ação de Movimento".
- **Decisão do Pedro?** sim, porque define uma vantagem tática.

### [LACUNA] presenca-alheia (Íntegro, 44) · descricao
- **Hoje:** "imune a medo, encanto e qualquer efeito que dependa de manipular a sua emoção."
- **Livro:** Condições: Amedrontado, Fascinado. Tipos de Dano › Mental: Sanidade cai por ataque "emocional ou existencial".
- **Problema:** termos soltos; não diz se vale para perda de Sanidade e dano mental.
- **Correção:** "é imune a Amedrontado e Fascinado e a efeitos que dependam de manipular a sua emoção. Perda de Sanidade e dano mental seguem a regra de sempre."
- **Decisão do Pedro?** sim, porque é escolher se o Auleth fica imune a Sanidade.

### [LACUNA] forma-verdadeira (Íntegro, 44) · descricao
- **Hoje:** "assumir sua forma original por uma cena: voo igual ao Movimento, +2 de Defesa".
- **Problema:** não diz o Tamanho da forma original nem se Forma sem Molde segue valendo nela.
- **Correção:** acrescentar "Nessa forma você tem Tamanho Grande e não usa Forma sem Molde."
- **Decisão do Pedro?** sim, porque inventa o Tamanho.

### [MELHORIA] corpo-radiante, colapso-solar, crosta-e-nucleo, bercario · texto
- **Hoje:** "reduz pela metade o dano de fogo"; "escaldante por cinco rodadas"; "empurrões, agarrões e quedas"; "cobertura sólida".
- **Livro:** Tipos de Dano (Resistência é por tipo e vem por último); Perigos › Clima (Calor é dano de ambiente); Combate (Cobertura total).
- **Problema:** "metade" não entra na ordem da Resistência. "escaldante" sem mecânica. "quedas" confunde com o perigo Queda.
- **Correção:** "Resistência a Fogo igual à metade do dano de cada golpe"; "escaldante" vira "com Calor Severo"; "empurrões, agarrões e derrubadas"; "cobertura total".
- **Decisão do Pedro?** sim, só no primeiro item (metade contra Resistência numérica).

## Onírico (onirico)

### [INCOERÊNCIA] noite-sem-fim, a-noite-que-se-repete, sonho-emprestado, o-mundo-nao-combina, sonho-aberto · recuperacao
- **Hoje:** texto "por descanso", campo `recuperacao`: "sessao".
- **Livro:** Poderes e Habilidades › limite de uso (combate volta no descanso).
- **Problema:** a ficha zera no botão errado.
- **Correção:** `recuperacao`: "descanso" nos cinco.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] leitura-de-sonhos, visita-noturna · recuperacao
- **Hoje:** "Uma vez por descanso" (`recuperacao`: "descanso"), ambos de informação ou conversa.
- **Livro:** "Por sessão... Fica para o que é de história, informação, dinheiro e sorte."
- **Problema:** efeito de informação deveria voltar por sessão.
- **Correção:** "uma vez por sessão" e `recuperacao`: "sessao".
- **Decisão do Pedro?** não

### [LACUNA] pesadelo-manifesto, delirio-contagioso, noite-sem-fim, sonho-aberto · descricao
- **Hoje:** "Faça Misticismo contra a Vontade dela. Falhando, ela fica Amedrontada"; "faz Vontade contra o seu Misticismo".
- **Livro:** Raças: o resultado da rolagem da raça é a DT; Vampiro e Auleth dizem "contra a sua DT".
- **Problema:** frase diferente do resto; "Falhando" fica sem sujeito.
- **Correção:** "ela testa Vontade contra a sua DT de Onírico. Em falha, fica Amedrontada por duas rodadas e não usa reações; em sucesso, só perde a reação até o começo do seu próximo turno." Mesma troca nas outras três.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] delirio-contagioso (Caos, 15) · descricao
- **Hoje:** "ela passa duas rodadas tratando um aliado como inimigo e um inimigo como aliado".
- **Livro:** Condições: Amedrontado, Desorientado e Paralisado saem com teste no fim do turno.
- **Problema:** controle de duas rodadas sem saída.
- **Correção:** "...ela testa Vontade contra a sua DT de Onírico; em falha, passa até duas rodadas tratando... e repete o teste no fim de cada turno dela para sair."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] o-mundo-nao-combina (Caos, 40) · descricao
- **Hoje:** "toda criatura hostil ali perde a reação."
- **Livro:** a zona testa ao entrar ou no começo do turno.
- **Problema:** perda de reação em área sem teste.
- **Correção:** "criaturas hostis na área testam Vontade contra a sua DT de Onírico e, em falha, perdem a reação até o começo do próximo turno delas."
- **Decisão do Pedro?** sim, porque o efeito deixa de ser garantido.

### [INCOERÊNCIA] passo-entre-sonhos, nunca-mais-pousar, sonho-aberto · descricao (combo)
- **Hoje:** Nunca Mais Pousar: "Passo Entre-Sonhos deixa de ter limite de usos por cena"; Sonho Aberto: "Passo Entre-Sonhos não gasta Movimento nem Mana".
- **Problema:** a Parte Céu do Sonhar no nível 40, com Sonho Aberto, dá teleporte sem ação, sem Mana e sem limite, vários por turno.
- **Correção:** Sonho Aberto: "Passo Entre-Sonhos custa só 1 Mana e uma Ação Livre, uma vez por turno, até o fim da cena."
- **Decisão do Pedro?** sim, porque mexe em combo entre Parte e estágio.

### [LACUNA] a-noite-que-se-repete (Ciclo, 40) · descricao
- **Hoje:** "anular por completo um ataque ou efeito que acabou de acertar você ou um aliado... como se aquele pedaço da rodada não tivesse acontecido."
- **Livro:** Ferimentos › Voltar da morte: "é raro e caro". Magia › Desgaste do Tempo: "nada do que já aconteceu é desfeito".
- **Problema:** desfaz até golpe de morte, e vira volta da morte sem custo.
- **Correção:** "...anule o dano e as condições desse ataque ou efeito. Não desfaz morte nem efeito que não tenha acertado."
- **Decisão do Pedro?** sim, porque é uma exceção de morte.

### [MELHORIA] de-novo-igual (Ciclo, 1) · descricao e recuperacao
- **Hoje:** "Uma vez por cena, depois de falhar num teste, rerrole".
- **Livro:** limite de uso: por sessão fica para "sorte (uma rerrolagem)". Maestria de Carisma e de Fluxo: rerrolagem por cena só em teste específico.
- **Problema:** rerrolar qualquer teste a cada cena passa a maestria e o Conhecimentos Extremos do Auleth (por sessão).
- **Correção:** "Uma vez por sessão" (`recuperacao`: "sessao") ou limitar a testes que não sejam ataque.
- **Decisão do Pedro?** sim, porque decide a força do Ciclo.

### [INCOERÊNCIA] dono-do-sonho (Laço com um Sonhador, 1) · descricao
- **Hoje:** "Enquanto essa pessoa estiver viva, você recebe vantagem em Vontade e sabe a direção aproximada dela."
- **Livro:** Contatos e Laços: "São até 3, e uma vez por sessão o teste feito por causa de um laço tem vantagem. Laço rompido pede teste de Sanidade."
- **Problema:** vantagem permanente, fora do limite por sessão; não diz se é um dos 3 laços; a morte da pessoa não cobra Sanidade.
- **Correção:** "Esse laço conta como um dos seus três laços. Enquanto a pessoa viver, você sabe a direção aproximada dela, e a vantagem do laço vale também em Vontade. Se ela morrer, vale o teste de Sanidade de laço rompido, e você perde a direção até criar um novo laço num descanso completo."
- **Decisão do Pedro?** sim, porque troca vantagem fixa por regra de laço.

### [LACUNA] visita-noturna (Ponte, 15) · descricao
- **Hoje:** "aparecer no sonho de uma criatura adormecida que você já viu de perto."
- **Livro:** Magia › Termos: "Mesma dimensão... Fronteira selada".
- **Problema:** sem alcance e sem limite de dimensão.
- **Correção:** acrescentar "na mesma dimensão" e "o sonho dura até dez minutos".
- **Decisão do Pedro?** sim, porque são limites novos.

### [MELHORIA] corpo-de-sonho (40) · descricao
- **Hoje:** "ficar incorpóreo... duas vezes por cena" (sem `usos`).
- **Livro:** Condições › Incorpóreo (já dá metade do dano físico não mágico); Resistência soma.
- **Problema:** grafia da condição; `usos`/`recuperacao` ausentes; a Resistência 10 e a metade do Incorpóreo somam sem aviso.
- **Correção:** "ficar Incorpóreo". `usos`: 2, `recuperacao`: "cena".
- **Decisão do Pedro?** não

### [LACUNA] ancoragem-fragil · descricao
- **Hoje:** "sua Mana máxima cai pela metade."
- **Problema:** não diz o que ocorre com a Mana atual.
- **Correção:** "...e a Mana atual desce junto se passar do novo máximo."
- **Decisão do Pedro?** não

### [MELHORIA] cara-que-nao-fecha, noite-sem-fim, pes-fora-do-chao · descricao
- **Hoje:** "não conseguem mais te pegar de surpresa"; "perde a ação daquele turno"; "cai de qualquer altura sem sofrer dano".
- **Livro:** Condições › Surpreendido; Combate › Seu turno (sete ações); Perigos › Queda: "Quem cai fica Caído."
- **Problema:** termos soltos.
- **Correção:** "criaturas que falharam... não deixam você Surpreendido"; "perde a Ação Padrão daquele turno"; "cai de qualquer altura sem sofrer dano e de pé".
- **Decisão do Pedro?** não

## Padrões que se repetem
- **`recuperacao: "sessao"` com texto "por descanso":** 4 no Vampiro, 7 no Auleth, 5 no Onírico (16 traços de combate). Autômato não tem o problema.
- **Efeito de informação ou conversa com `recuperacao: "descanso"`** (Leitura de Sonhos, Visita Noturna): o Livro pede sessão.
- **Falta "contra a sua DT de <raça>"** em efeitos de teste (Auleth, Onírico; Autômato sem `dt_efeitos`).
- **Dano ou controle de área sem teste** (Fotosfera, Gravidade Própria, Pulso, O Mundo Não Combina, Delírio Contagioso).
- **"Reduz pela metade"** sem lugar na ordem da Resistência (Escudo, Corpo Radiante, Véu de Névoa, Névoa e Morcego).
- **Ação e condição em minúscula** ("ação de movimento", "agarrada", "lentos", "incorpóreo", "ataque de oportunidade").
- **Vida como custo** sem regra (Vampiro Sangvin).
- **Tipo de dano ausente** em ataque natural (Autômato, Pricolici).

## Conferido sem problema
- **Autômato:** Vida, Mana, Estamina e Movimento de raça batem com a tabela de Raças; os chassis usam as seis categorias de Tamanho; Esmagador cobre todos os dados naturais; implantes pagam metade como no Livro; Colapso do Núcleo confere com Ferimentos.
- **Vampiro:** Vida +1, Estamina +1 e Noite Eterna +2/+2 batem; níveis 17 e 42 dos estágios iguais aos dos traços; `dt_efeitos` com Intimidação; visão no escuro segue Ver e ser visto; Sangue é derivação válida de Água.
- **Auleth:** Vida +2 bate; níveis 18 e 44 iguais; imunidade a doenças confere com Aflições; Conhecimentos Extremos usa por sessão e rerrolagem única; Poço Gravitacional, Corpo Difuso, Manto de Poeira e Berçário seguem Camuflagem e Cego; Peso de Mundo tem teste repetido e metade no sucesso.
- **Onírico:** Vida +1 e Mana +4 batem; níveis 15 e 40 iguais; Passo Entre-Sonhos não provoca reação como o Livro; Véu do Sonhar, Sonho Lúcido e Pesadelo que Pega coerentes; Resistência 10 física segue a família Físico.
