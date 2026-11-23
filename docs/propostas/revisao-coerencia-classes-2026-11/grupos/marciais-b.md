# Revisão de coerência: marciais B (Ninja, Caçador, Piloto, Interceptador)

Classes do grupo: Ninja (`ninja`), Caçador (`cacador`), Piloto (`piloto`), Interceptador (`interceptador`). Nenhum `id` é alterado nas correções.

## Ninja (ninja)

### [ERRO] hierarquia · estágio 1 (Aprendiz), campo `usos`
- **Hoje:** "Uma vez por missão para consultar os arquivos do clã"
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: as janelas são por rodada, por turno, por cena, por descanso e por sessão.
- **Problema:** "por missão" não é janela do Livro. Informação é caso de "por sessão".
- **Correção:** usos: "Uma vez por sessão para consultar os arquivos do clã". Na descrição: "Uma vez por sessão, antes de uma missão, pode perguntar ao clã se já existe informação registrada sobre um alvo ou local: ..."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] hierarquia · estágios 1, 5, 10, 15 e 20 (campo `acao`)
- **Hoje:** acao "Passivo" com usos por sessão (consultar arquivos, apoio logístico, vantagem social, tarefa do aprendiz, veto). O Kage usa "Ação Completa" para requisitar apoio.
- **Livro:** Poderes e Habilidades: "Custo zero quer dizer passivo: ele funciona sem você fazer nada"; sétima ação "Fora de combate" com `momento`.
- **Problema:** o que o jogador aciona está marcado Passivo, e o Kage gasta ação de combate numa coisa que só existe fora de cena.
- **Correção:** estágios 1, 5, 10, 15: `momento: "Fora de combate para o que o clã oferece; o bônus de Furtividade é passivo"`. Estágio 20: `acao: "Fora de combate"`, `momento: "para requisitar apoio; a autoridade sobre missões e diplomacia é passiva"`.
- **Decisão do Pedro?** não

### [LACUNA] arma-ninja › fio-mortal
- **Hoje:** "A arma marcada causa +1 dado de dano."
- **Livro:** Combate › Críticos: "dado extra vindos de habilidade ... entram uma vez só". Ataques Combinados: "O dado a mais ... é do mesmo tipo que você já rola".
- **Problema:** não diz o tipo do dado nem se multiplica no crítico. Repetido até quatro vezes, pesa.
- **Correção:** "A arma marcada causa +1 dado de dano, do mesmo tipo dos dados dela. No crítico, esse dado extra entra uma vez só."
- **Decisão do Pedro?** sim, porque confirma que o dado não multiplica no crítico.

### [LACUNA] arma-ninja · regra de repetição das melhorias
- **Hoje:** "Uma melhoria pode se repetir na mesma arma somente quando concede um bônus numérico"
- **Livro:** Combate › Críticos: bônus de habilidade entram uma vez só quando o texto não manda somar.
- **Problema:** não há lista do que é numérico. Dúvidas: Precisão Cirúrgica (ignora 3), Reflexo de Lâmina (+1 Defesa, até +4), Alcance da Sombra, Fio Longo, Fio Mortal.
- **Correção:** acrescentar: "Repetíveis: Fio Mortal, Precisão Cirúrgica, Reflexo de Lâmina, Fio Longo e Alcance da Sombra. As demais valem uma vez por arma."
- **Decisão do Pedro?** sim, porque define o teto de Defesa e de dano.

### [LACUNA] arma-ninja › alcance-da-sombra
- **Hoje:** "O alcance dela aumenta em metade."
- **Livro:** Distâncias › Alcance de armas e poderes: alcance por faixa, e cada faixa além custa −5.
- **Problema:** "metade" de uma faixa não tem número nem diz onde a penalidade passa a contar.
- **Correção:** "Só numa arma de arremesso. O alcance dela, em metros, aumenta em metade (arredonde para múltiplos de 1,5 m), e o −5 por faixa passa a contar a partir do alcance novo."
- **Decisão do Pedro?** sim, porque fixa o arredondamento.

### [LACUNA] arma-ninja › precisao-cirurgica
- **Hoje:** "ignoram 3 pontos de Resistência do alvo"
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: tira-se "a Resistência do tipo de dano e a redução de dano" em separado; Resistência vale por tipo.
- **Problema:** não diz se cobre a redução de dano nem qual Resistência (a do tipo do golpe).
- **Correção:** "Golpes com a arma marcada ignoram 3 pontos da Resistência do alvo ao tipo de dano do golpe. Não afeta a redução de dano."
- **Decisão do Pedro?** sim, porque decide se fura redução de dano.

### [LACUNA] arma-ninja › golpe-certeiro e corte-fatal
- **Hoje:** Corte Fatal: "x2 vira x3; x3 vira x4". Golpe Certeiro: "19-20 vira 18-20".
- **Livro:** Combate › Críticos: "18-20 e 19-20 sempre com x2; x3 e x4 sempre com margem 20".
- **Problema:** Corte Fatal não diz o que fazer em arma x4. Golpe Certeiro não diz que a margem não passa de 18-20 quando a arma Rara já traz "margem +1".
- **Correção:** Corte Fatal: "Só em arma de margem 20 e multiplicador x2 ou x3". Golpe Certeiro: acrescentar "A margem nunca passa de 18-20."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] dano-desarmado
- **Hoje:** "seus ataques desarmados contam como Arma Ninja e causam 1d6 de dano."
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força, com crítico 20/x2. Classe ... que der outro dano desarmado diz isso no próprio texto."
- **Problema:** não diz o tipo nem o Mod. Força, e "conta como Arma Ninja" ignora o limite de quatro armas marcadas e abre dúvida sobre receber melhorias (Corte Fatal em soco 20/x2 vira x3).
- **Correção:** "Durante a cena, seus ataques desarmados causam 1d6 de impacto + Mod. Força, com crítico 20/x2, e contam como uma Arma Ninja além das marcadas: recebem as melhorias de arma corpo a corpo que você já tem."
- **Decisão do Pedro?** sim, porque escolhe se o soco herda melhorias.

### [INCOERÊNCIA] pulo-duplo
- **Hoje:** "teste de Atletismo contra DT 18"
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: a dificuldade acompanha o nível (15 no 1, 30 no 20, 56 no 60).
- **Problema:** DT fixa 18 fica trivial depois do nível 10.
- **Correção:** "faça um teste de Atletismo contra a DT Padrão do seu nível".
- **Decisão do Pedro?** sim, porque muda a dificuldade em todos os níveis.

### [INCOERÊNCIA] clone-das-sombras · `acao` e `momento`
- **Hoje:** acao "Ação de Movimento", momento "para comandar"; descrição "Crie um clone".
- **Livro:** Poderes e Habilidades › Poder: "Poder com custo declara também a ação que consome. Sem isso escrito, ele é uma Ação Padrão."
- **Problema:** os campos descrevem só o comando; criar o clone não tem ação declarada. Também falta dizer se pode haver mais de um clone.
- **Correção:** acao "Ação Padrão", momento "para criar; comandar o clone gasta a sua Ação de Movimento". Acrescentar: "Só existe um clone por vez; criar outro desfaz o anterior."
- **Decisão do Pedro?** sim, porque define a ação de criar.

### [LACUNA] kemuridama
- **Hoje:** "Crie uma nuvem de fumaça e se teleporte para um local ao alcance em que possa se esconder."
- **Livro:** Combate › Ver e ser visto: "Camuflagem | Fumaça ...: ataques contra quem está camuflado têm −2, e ele pode tentar se esconder". Provocar reação: teleportar não provoca.
- **Problema:** a nuvem não tem tamanho, duração nem efeito; o destino não exige ser visto.
- **Correção:** "Crie uma nuvem de fumaça de 3 m de raio que fica onde você estava até o começo do seu próximo turno e conta como Camuflagem. Você se teleporta para um ponto que veja, a até o dobro do seu Movimento, onde possa se esconder."
- **Decisão do Pedro?** sim, porque define tamanho e duração.

### [LACUNA] substituicao
- **Hoje:** "o ataque erra por completo, e você se desloca até o seu Movimento"
- **Livro:** Combate › Provocar reação: movimento por conta própria provoca; Esquiva traz "sem provocar reação". Magia › Ataque e resistência: magia de efeito não tem rolagem de ataque.
- **Problema:** não diz se o deslocamento provoca reação nem se vale contra magia de efeito e área.
- **Correção:** "... você se desloca até o seu Movimento, sem provocar reação, ... A Substituição vale contra ataques, e não contra efeitos de área."
- **Decisão do Pedro?** sim, porque delimita o alcance da defesa.

### [INCOERÊNCIA] sombra-suprema
- **Hoje:** "no início de cada turno, até realizar uma ação hostil, você não pode ser escolhido como alvo direto por criaturas que não consigam detectá-lo por um sentido especial"; "ative esta habilidade sem gastar ação" com acao "Ação Livre".
- **Livro:** Condições › Invisível; Combate › Cobertura total: só ela impede ser alvo direto.
- **Problema:** efeito confuso ("início de cada turno" de quem?) e mais forte que Invisível sem dizer; "sem gastar ação" repete a Ação Livre.
- **Correção:** "Uma vez por descanso, ative esta habilidade com uma Ação Livre. Por três rodadas, você fica Invisível e atacar não encerra a condição; criaturas que não o detectem por um sentido especial não podem escolhê-lo como alvo direto até você fazer uma ação hostil. ..." (resto igual).
- **Decisão do Pedro?** sim, porque mexe no poder da habilidade final.

### [MELHORIA] ataque-oculto
- **Hoje:** "ao atacar em alcance corpo a corpo ou curto um alvo que não percebeu você"
- **Livro:** Distâncias: faixas Adjacente e Curto, com maiúscula.
- **Problema:** grafia fora das faixas oficiais; falta dizer que o +1d8 entra uma vez só no crítico.
- **Correção:** "Uma vez por rodada, ao atacar um alvo a distância Adjacente ou Curto que não percebeu você, cause +1d8 de dano (uma vez só, mesmo em crítico). ..."
- **Decisão do Pedro?** não

### [MELHORIA] mensagem-oculta · `acao`
- **Hoje:** acao "Ação Completa"
- **Livro:** Poderes e Habilidades: sétima ação "Fora de combate".
- **Problema:** copiar um documento é trabalho fora de cena.
- **Correção:** acao "Fora de combate".
- **Decisão do Pedro?** não

### [MELHORIA] arma-ninja › veneno-de-contato
- **Hoje:** "o alvo sofre -2 para resistir a veneno"
- **Livro:** Aflições: veneno se resiste com Fortitude; Condições: Envenenado.
- **Problema:** não nomeia o teste.
- **Correção:** "o alvo sofre −2 nos testes de Fortitude contra veneno até o fim da cena."
- **Decisão do Pedro?** não

### [MELHORIA] dt_efeitos
- **Hoje:** "DT do Ninja ... role Furtividade no momento em que aciona."
- **Livro:** Perícias: DT de classe vem de `dt_efeitos`.
- **Problema:** nenhum poder ou habilidade do Ninja obriga teste, então a DT nunca é usada.
- **Correção:** manter como está se for reserva, ou dar a um poder um teste (ex.: Kemuridama com Percepção para quem tenta enxergar através da nuvem).
- **Decisão do Pedro?** sim, porque é escolha de desenho.

## Caçador (cacador)

### [ERRO] agencia-dos-cacadores › bases-seguras · nível 3
- **Hoje:** "o descanso ali conta como Bom, mesmo em condições ruins"
- **Livro:** Descanso: qualidades Péssima, Ruim, Boa, Maravilhosa, Excelente. Bases: "Benefícios de descanso não se acumulam."
- **Problema:** "Bom" não existe; falta o não acumular com o Dormitório.
- **Correção:** "o descanso ali tem qualidade Boa, mesmo em condições ruins, e não se soma ao Dormitório de uma base."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] agencia-dos-cacadores › cacada-em-grupo
- **Hoje:** acao "Passivo", duracao "Uma cena"; texto: "vantagem no primeiro ataque".
- **Livro:** Poderes: Passivo funciona sem ação; Condições/Combate: ação declarada.
- **Problema:** precisa ser acionada, e a duração da ficha (cena) contradiz o texto (primeiro ataque) até o nível 3.
- **Correção:** acao "Ação Livre", momento "antes do primeiro ataque", duracao "Até o primeiro ataque de cada um (nível 3: a cena)".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] poderes › companheiro · iniciativa
- **Hoje:** "Ele compartilha sua iniciativa; gastar sua Ação Padrão para atacar faz seu companheiro atacar junto"
- **Livro:** Aliados › Aliado em combate: "Não age de carona no seu turno. A exceção são as invocações do Invocador."
- **Problema:** o poder cria uma segunda exceção sem dizer que é exceção.
- **Correção:** "Por exceção à regra de Aliados, ele age no seu turno: gastar sua Ação Padrão para atacar ..."
- **Decisão do Pedro?** sim, porque confirma a exceção.

### [INCOERÊNCIA] poderes › companheiro · requisito
- **Hoje:** "de tamanho igual ou menor que o seu, não superior ao seu nível de Caçador"
- **Livro:** Bestiário: VD é o nível de desafio; Combate › Tamanho: categorias.
- **Problema:** compara tamanho com nível.
- **Correção:** "de tamanho igual ou menor que o seu e de VD não superior ao seu nível de Caçador".
- **Decisão do Pedro?** sim, porque presume que o limite é o VD.

### [LACUNA] poderes › companheiro · ataque e morte
- **Hoje:** "dano do jeito dele (garra, mordida, bico): 1d6 ... 3d8"
- **Livro:** Tipos de dano (famílias físicas); Aliados: "Bicho e contratado morrem igual"; Combate: alcance.
- **Problema:** sem tipo de dano, sem dizer se precisa alcançar o alvo quando você atira, sem regra para a morte do companheiro.
- **Correção:** "Garra causa corte; mordida e bico, perfuração. O companheiro precisa alcançar o alvo para atacar. Se morrer, você escolhe outro em um descanso completo."
- **Decisão do Pedro?** sim, porque define reposição.

### [INCOERÊNCIA] poderes › simbiose-animal
- **Hoje:** sem pré-requisito; "você não percebe os arredores do próprio corpo".
- **Livro:** Condições › Cego.
- **Problema:** depende do Companheiro e não diz como fica a Defesa de quem está "cego" para o próprio corpo.
- **Correção:** `pre_requisitos: ["Poder Companheiro"]`; acrescentar "Para ataques contra você, conta como Cego."
- **Decisão do Pedro?** sim, porque dá uma penalidade nova.

### [LACUNA] poderes › armadilha
- **Hoje:** "a primeira criatura que falhar em Reflexos contra a DT do Caçador sofre 2d8 e fica Imobilizada até o fim do turno."
- **Livro:** Perigos › Armadilhas: "O sucesso leva metade do dano e nenhum efeito extra"; "O tipo de dano é o do mecanismo"; achar com Percepção contra DT.
- **Problema:** sem tipo de dano, sem metade no sucesso, sem teste para achar, e `dt_efeitos` não diz se rola Sobrevivência ao instalar ou ao disparar.
- **Correção:** "Role Sobrevivência ao instalar: o resultado é a DT. A primeira criatura hostil a você que acione a armadilha testa Reflexos: na falha sofre 2d8 de perfuração e fica Imobilizada até o fim do turno; no sucesso, metade do dano. Quem procurar a armadilha a encontra com Percepção contra a mesma DT."
- **Decisão do Pedro?** sim, porque define tipo e metade.

### [LACUNA] habilidades › marca-do-cacador e predador-perfeito
- **Hoje:** Predador: "ignoram até 10 pontos de Resistência". Marca: "reduza em 3 o dano de cada golpe dela".
- **Livro:** Tipos de dano › Resistência e ordem: Resistência por tipo e redução de dano são coisas separadas; redução não vale contra dano verdadeiro.
- **Problema:** "ignora Resistência" não diz qual; Marca não diz a ordem.
- **Correção:** Predador: "ignoram até 10 pontos da Resistência dela ao tipo do golpe (não afeta redução de dano)". Marca: "...reduza em 3 o dano de cada golpe dela, depois da Resistência (não vale contra dano verdadeiro)".
- **Decisão do Pedro?** sim, porque decide se fura redução de dano.

### [LACUNA] poderes › instinto-predador · "sua presa"
- **Hoje:** "+1d6 uma vez por turno contra sua presa"
- **Livro:** Poderes: o texto precisa dizer quem é o alvo.
- **Problema:** "presa" é três coisas (especializada, marcada por Presa, marcada por Marca do Caçador).
- **Correção:** "contra uma criatura marcada por Presa ou pela Marca do Caçador, ou contra uma presa especializada."
- **Decisão do Pedro?** sim, porque escolhe quais valem.

### [LACUNA] agencia-dos-cacadores › arquivo-de-criaturas
- **Hoje:** acao "Ação Livre", sem `usos`.
- **Livro:** Poderes: informação volta "por sessão".
- **Problema:** sem limite de uso.
- **Correção:** usos "Uma vez por sessão".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] agencia-dos-cacadores › escolta-da-guilda
- **Hoje:** duracao "Uma missão"; "um caçador novato ... dois caçadores ... companheiro animal".
- **Livro:** Aliados: ficha própria, "no máximo o dobro da Vida média de um personagem do mesmo nível", "um aliado ativo por personagem costuma ser o limite".
- **Problema:** "missão" não é janela; sem ficha; nível 3 e 4 estouram o teto de aliados e competem com o Companheiro.
- **Correção:** duracao "Até o fim da cena". "Uma vez por sessão, a Guilda envia um caçador novato (Ajudante, VD igual à metade do seu nível de Caçador, arredondada para cima) que age na iniciativa dele." Nível 3: "dois caçadores"; nível 4: "o caçador traz um animal que conta como o aliado dele".
- **Decisão do Pedro?** sim, porque define a ficha e o teto.

### [LACUNA] agencia-dos-cacadores › contratos-exclusivos e benefícios econômicos
- **Hoje:** "o pagamento de todo contrato da Guilda sobe um degrau de raridade"; "Benefícios econômicos não se acumulam entre si."
- **Livro:** Economia: cada raridade custa 4 vezes a anterior.
- **Problema:** não lista quais são econômicos e "degrau de raridade" vira ×4.
- **Correção:** "Econômicos: Contratos Exclusivos, Avaliação de Troféus, Apoio Logístico e Financiamento de Expedição." Nível 4 de Contratos: "o pagamento sobe 50%".
- **Decisão do Pedro?** sim, porque é número de economia.

### [LACUNA] agencia-dos-cacadores › avaliacao-de-trofeus
- **Hoje:** "+10% sobre o preço de venda da Loja (metade do valor do item)"
- **Livro:** Loja/Economia (nos recortes) não trazem a regra de revenda.
- **Problema:** não consegui conferir "metade do valor" contra a cotação de venda atual.
- **Correção:** confirmar contra a cotação do servidor e escrever "+10% sobre a cotação de venda".
- **Decisão do Pedro?** sim, porque depende da regra de Vender.

### [LACUNA] poderes › presas-da-noite
- **Hoje:** "Em pouca luz, receba vantagem em Furtividade e +2 dano"
- **Livro:** Combate › Ver e ser visto: pouca luz e escuridão são linhas separadas.
- **Problema:** não diz se vale na escuridão, onde a caça é ainda melhor.
- **Correção:** "Em pouca luz ou na escuridão, ..."
- **Decisão do Pedro?** sim, porque amplia o poder.

### [MELHORIA] habilidades › terror-da-presa
- **Hoje:** "+2 em ataques e resistências"
- **Livro:** Combate: Resistência é de tipo de dano.
- **Problema:** "resistências" pode ser lido como Resistência a dano.
- **Correção:** "+2 em ataques e nos testes de Fortitude, Reflexos e Vontade contra ela".
- **Decisão do Pedro?** não

### [MELHORIA] agencia-dos-cacadores › prestigio-de-cacador
- **Hoje:** título "Prestígio de Caçador"
- **Livro:** Mundo e Facções: Prestígio é a posição do personagem numa facção.
- **Problema:** nome colide com o Prestígio de facção.
- **Correção:** `titulo: "Nome de Caçador"` (mantém o id).
- **Decisão do Pedro?** sim, porque troca nome.

### [MELHORIA] agencia-dos-cacadores › vinganca-da-guilda · nível 2
- **Hoje:** "a Guilda também cobre seu resgate ou tratamento"
- **Livro:** Ferimentos › Voltar da morte: "só por efeito que diga".
- **Problema:** pode ser lido como cobrir ressurreição.
- **Correção:** acrescentar "Não traz ninguém de volta da morte."
- **Decisão do Pedro?** não

### [MELHORIA] poderes › olhos-da-selva
- **Hoje:** "vantagem em Sobrevivência para rastrear ou navegar em ambiente natural"
- **Livro:** Viagem › Papéis: Guia e Forrageiro testam Sobrevivência.
- **Problema:** não fala a língua da Viagem.
- **Correção:** "... para rastrear, navegar ou buscar comida e água em ambiente natural, inclusive nos papéis de Guia e Forrageiro."
- **Decisão do Pedro?** sim, porque amplia a vantagem.

### [MELHORIA] poderes › camuflagem
- **Hoje:** "Fique Invisível até o começo do próximo turno ou até atacar."
- **Livro:** Condições › Invisível (coerente); Combate: "Camuflagem" é outra regra (−2).
- **Problema:** mesmo nome para duas coisas.
- **Correção:** manter o texto; opcional `titulo: "Manto de Sombra"`.
- **Decisão do Pedro?** sim, porque troca nome.

### [MELHORIA] habilidades › especializacao › Caça Lendária
- **Hoje:** "uma criatura que já derrotou"
- **Livro:** Bestiário: família/tipo.
- **Problema:** a criatura derrotada está morta.
- **Correção:** "uma criatura de um tipo que você já derrotou".
- **Decisão do Pedro?** sim, porque restringe ao tipo.

## Piloto (piloto)

### [ERRO] dt_efeitos e tarefas_bancada · DT 15 fixa
- **Hoje:** "manobra é Pilotagem contra DT 15"; itens "DT 15 sob perigo", "DT 15" (Acelerar, Evasão, Recuperar controle).
- **Livro:** Veículos e Cenas › Manobras: "contra a DT Padrão do nível da cena".
- **Problema:** DT 15 só vale no nível 1.
- **Correção:** trocar por "DT Padrão do nível da cena" no `dt_efeitos` e nos itens Conduzir, Acelerar, Evasão e Recuperar controle.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] dt_efeitos · perseguição
- **Hoje:** "cada rodada empurra o alvo uma faixa para um lado ou para o outro"
- **Livro:** Veículos e Cenas › Perseguições: vitória por 10 ou mais move duas faixas; maior deslocamento +2.
- **Problema:** omite as duas faixas e o +2.
- **Correção:** "No fim de cada rodada, fugitivo e perseguidor fazem teste oposto: vitória move uma faixa, vitória por 10 ou mais move duas, e quem tem maior deslocamento recebe +2."
- **Decisão do Pedro?** não

### [LACUNA] tarefas_bancada · manobras
- **Hoje:** seis manobras; "Fechar passagem ... Contato ou Curta".
- **Livro:** Veículos e Cenas › Manobras: sete manobras, com Preparar abordagem; Fechar passagem não limita a faixa.
- **Problema:** falta Preparar abordagem e a restrição de faixa não está no Livro.
- **Correção:** acrescentar "Preparar abordagem | Teste oposto | Ação Padrão. Só em Contato. Mantém o Contato até o início do próximo turno do condutor." Tirar "Contato ou Curta" ou levar a regra ao Livro.
- **Decisão do Pedro?** sim, porque a faixa de Fechar passagem precisa de decisão.

### [INCOERÊNCIA] habilidades › meu-xodo · montaria
- **Hoje:** "o que o texto diz do veículo vale para o animal"
- **Livro:** Veículos e Manutenção › Montarias: "Ela não recebe avarias veiculares."
- **Problema:** muita coisa da classe fala de avaria, chassi e Utilidade (Oficina na Estrada, 0 Km, Estabilizador, Reparo Rápido, Capacete, Tuning).
- **Correção:** acrescentar: "Montaria não recebe avaria nem Utilidade: o que o texto diz de avaria, chassi e Utilidade não vale para o animal."
- **Decisão do Pedro?** sim, porque define o que a montaria perde.

### [INCOERÊNCIA] tuning › suspensao
- **Hoje:** "ignora a penalidade do primeiro terreno ruim de cada cena"
- **Livro:** Condições: o termo é "terreno difícil".
- **Problema:** termo desconhecido; e Sei Onde Passa (nível 5) já ignora terreno difícil.
- **Correção:** "terreno difícil", e dar ao nível 1 da peça algo que não sobreponha o Xodó.
- **Decisão do Pedro?** sim, porque há sobreposição de efeito.

### [ERRO] tuning › cabine · T3
- **Hoje:** "os ocupantes recebem Resistência 5 a dano de área"
- **Livro:** Tipos de dano: "Resistência vale sempre por tipo específico".
- **Problema:** "dano de área" não é tipo de dano.
- **Correção:** "os ocupantes reduzem em 5 o dano de cada efeito de área, depois da Resistência."
- **Decisão do Pedro?** não

### [LACUNA] tuning › armamento · perfil
- **Hoje:** "2d8 de dano a até 24 m"
- **Livro:** Veículos: "Uma arma precisa informar dados, bônus, tipo, alcance e crítico".
- **Problema:** faltam tipo de dano e crítico.
- **Correção:** "2d8 de dano balístico, ataque com Pontaria, crítico 20/x2, alcance 24 m."
- **Decisão do Pedro?** sim, porque escolhe tipo e crítico.

### [LACUNA] tuning › armamento · T3
- **Hoje:** "dois disparos por rodada, se houver alguém no posto"
- **Livro:** Veículos › Turno veicular: "Cada ataque consome a ação do artilheiro."
- **Problema:** diz "por rodada" e não diz qual ação paga o segundo.
- **Correção:** "T3: no turno do artilheiro, a arma dispara duas vezes com uma só Ação Padrão."
- **Decisão do Pedro?** sim, porque dobra a saída.

### [LACUNA] tuning › motor · T4
- **Hoje:** "+18 m de deslocamento na primeira rodada de cada perseguição"
- **Livro:** Veículos e Cenas › Perseguições: o teste é oposto; maior deslocamento dá +2.
- **Problema:** metros não entram na perseguição por faixas.
- **Correção:** "T4: na primeira rodada de cada perseguição, você conta como o de maior deslocamento (+2 no teste)."
- **Decisão do Pedro?** sim, porque troca o efeito.

### [LACUNA] tuning · custo mensal e Núcleo
- **Hoje:** "uma modificação entra no seu veículo sem custar Lunaris"
- **Livro:** Veículos e Manutenção: cada módulo de utilidade pede +1 lote por mês; "Sistemas ativos respeitam o limite do Núcleo".
- **Problema:** não diz se Camuflagem Ativa, Torre de Sensores, Guincho, Cabine e a Utilidade extra de Oficina na Estrada contam.
- **Correção:** acrescentar: "Só o preço em Lunaris é dispensado. Camuflagem Ativa, Torre de Sensores, Guincho e Cabine contam como utilidade na manutenção mensal, e as que se ligam contam no limite de sistemas ativos."
- **Decisão do Pedro?** sim, porque define o custo.

### [LACUNA] tuning · guincho
- **Hoje:** "Prenda um veículo ou objeto grande a até 18 m e arraste", duracao "Instantânea".
- **Livro:** Combate › Manobras: prender pede teste.
- **Problema:** sem teste, e "Instantânea" contradiz o T2 (preso pela garra).
- **Correção:** "Pontaria contra a Defesa do alvo. Prende até você soltar (Ação Livre) ou o cabo ser cortado." duracao "Até soltar".
- **Decisão do Pedro?** sim, porque define teste e duração.

### [LACUNA] poderes › link-compartilhado
- **Hoje:** "Ligue a sua Rede Neural à de outro piloto", sem pré-requisito.
- **Livro:** Poderes: pré-requisito declarado.
- **Problema:** depende da Rede Neural; "maior bônus de Pilotagem" não diz se inclui o Meu Xodó.
- **Correção:** `pre_requisitos: ["Poder Rede Neural"]`; "usam o maior bônus de Pilotagem entre vocês, sem contar o bônus do Meu Xodó".
- **Decisão do Pedro?** sim, porque define o que entra.

### [LACUNA] poderes › ia
- **Hoje:** "faz Percepção com o seu Grau em Pilotagem enquanto você está ocupado"
- **Livro:** Perícias: teste = d20 + Mod. + metade do nível + grau.
- **Problema:** sem atributo, e "ocupado" é vago.
- **Correção:** "faz testes de Percepção com o grau de Pilotagem e o seu Mod. Sabedoria quando você gasta a Ação Padrão em outra coisa."
- **Decisão do Pedro?** sim, porque define atributo.

### [INCOERÊNCIA] poderes › reparo-rapido
- **Hoje:** "restaure um décimo da Vida máxima dele e suspenda uma avaria ativa até o fim da cena"
- **Livro:** Veículos e Manutenção › Reparo: reparo emergencial pede teste e só suspende avaria; os 10% de Vida são da manutenção corretiva (6 horas).
- **Problema:** junta os dois sem teste.
- **Correção:** "... sem teste, restaure um décimo da Vida máxima dele e suspenda uma avaria ativa até o fim da cena."
- **Decisão do Pedro?** sim, porque dispensa o teste.

### [LACUNA] habilidades › zero-km
- **Hoje:** "O que estava destruído continua destruído; isto só conserta o que ainda está de pé."
- **Livro:** Veículos e Cenas › Dano e avarias: 0 de Vida é Incapacitado; destruição só por efeito.
- **Problema:** não diz se um veículo Incapacitado conta como de pé.
- **Correção:** "Um veículo Incapacitado (0 de Vida) conta como de pé. Só o que um efeito declarou destruído continua perdido."
- **Decisão do Pedro?** sim, porque conserta incapacitado.

### [LACUNA] habilidades › as-impossivel
- **Hoje:** "uma Ação de Movimento adicional exclusiva para manobras veiculares"; "ative ... sem gastar ação" com Ação Livre.
- **Livro:** Veículos e Cenas › Manobras: só Conduzir e Recuperar controle custam Ação de Movimento.
- **Problema:** o resto das manobras é Ação Padrão; e se junta ao Modo Sobrevivente (+2) o Defesa vai a +6.
- **Correção:** "uma Ação de Movimento adicional, que só pode ser gasta em Conduzir ou Recuperar controle." Dizer se Modo Sobrevivente e Ás Impossível somam.
- **Decisão do Pedro?** sim, porque limita o poder.

### [LACUNA] poderes › sistema-fantasma
- **Hoje:** "quem já estava perseguindo perde uma faixa de distância na primeira rodada"
- **Livro:** Perseguições: faixas entre perseguidor e fugitivo.
- **Problema:** "perde uma faixa" não diz a direção.
- **Correção:** "a distância da perseguição aumenta uma faixa a seu favor na primeira rodada, sem teste."
- **Decisão do Pedro?** não

### [LACUNA] habilidades › tuning · o mecânico
- **Hoje:** "a habilidade te apresenta um, e esse contato passa a existir na campanha"
- **Livro:** Contatos e Laços: contato tem ramo, Confiança 1 a 3 e limite 2 + Mod.Carisma.
- **Problema:** não diz se conta no limite.
- **Correção:** "um contato do ramo Ofício, Confiança 2 (Amigo), que não conta no seu limite de contatos e faz o Tuning sem Dívida."
- **Decisão do Pedro?** sim, porque define o contato.

### [MELHORIA] poderes › caixa-preta
- **Hoje:** "Se o veículo for destruído"
- **Livro:** 0 de Vida só Incapacita.
- **Problema:** destruído exige efeito.
- **Correção:** "Se o veículo for destruído (por um efeito que declare destruição)".
- **Decisão do Pedro?** não

### [MELHORIA] habilidades › meu-xodo · Escapa Sozinho
- **Hoje:** usos "Uma vez por sessão"
- **Livro:** por sessão fica para história, informação, dinheiro e sorte.
- **Problema:** serve a perseguições e combate.
- **Correção:** "Uma vez por descanso" se for uso de cena.
- **Decisão do Pedro?** sim, porque é escolha.

### [MELHORIA] tuning › camuflagem
- **Hoje:** "o veículo parado fica invisível a olho nu enquanto não atirar"; T4 "até 6 m por rodada".
- **Livro:** Condições › Invisível.
- **Problema:** não nomeia a condição; T4 confuso.
- **Correção:** "o veículo parado fica Invisível enquanto ninguém a bordo atacar". T4: "continua ligada enquanto o veículo andar até 6 m por rodada".
- **Decisão do Pedro?** não

### [MELHORIA] habilidades › meu-xodo · compartimento
- **Hoje:** "guarda até 2 itens" e "até 12 itens"
- **Livro:** Equipamentos: itens ocupam espaços.
- **Problema:** unidade diferente.
- **Correção:** "guarda até 2 espaços de itens" e "até 12 espaços".
- **Decisão do Pedro?** sim, porque pode mudar o total.

## Interceptador (interceptador)

### [ERRO] dt_efeitos e pacote-descartado · DT de criatura
- **Hoje:** "a DT é a DT padrão do VD dela (15 + metade do VD)"
- **Livro:** Perícias › DT Padrão: tabela de ajuste; "O da ameaça: o VD da criatura".
- **Problema:** a fórmula não bate com a tabela (VD 20: 25 contra 30).
- **Correção:** "a DT é a DT Padrão do VD dela (tabela de DT em Perícias)." Nos dois lugares.
- **Decisão do Pedro?** não

### [ERRO] poderes › latencia
- **Hoje:** acao "Reação"
- **Livro:** Combate › Reações: "uma reação por rodada".
- **Problema:** a Reação já foi gasta no Pacote Descartado, então Latência nunca roda na mesma rodada.
- **Correção:** acao "Ação Livre", momento "ao interceptar com Atrasar".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] hackear-fluxo › redirecionar × proxy
- **Hoje:** Proxy: "mesmo fora do alcance original da magia, o que o Redirecionar não permite". Redirecionar: "outro alvo válido".
- **Livro:** Magia › Ataque e resistência.
- **Problema:** Redirecionar não proíbe o conjurador como alvo.
- **Correção:** Redirecionar: "outro alvo válido dentro do alcance original, que não seja o conjurador".
- **Decisão do Pedro?** não

### [LACUNA] redirecionar e proxy · novo alvo
- **Hoje:** "redirecione o efeito"; "escolha outro alvo válido".
- **Livro:** Magia › Ataque e resistência: o total é lido contra Defesa ou resistência do alvo.
- **Problema:** não diz como o novo alvo se defende.
- **Correção:** "O mesmo total de conjuração é lido contra a Defesa ou a resistência do novo alvo."
- **Decisão do Pedro?** sim, porque define quem rola.

### [LACUNA] hackear-fluxo › atrasar
- **Hoje:** "atrase o efeito interceptado até o fim do turno da fonte."
- **Livro:** Magia › Concentração e Mana.
- **Problema:** sem dizer alvos, Mana e o que acontece se a fonte não puder agir.
- **Correção:** "O efeito acontece no fim do turno da fonte, nos mesmos alvos e pontos. Se a fonte não puder mais agir, o efeito se perde."
- **Decisão do Pedro?** sim, porque define o desfecho.

### [MELHORIA] hackear-fluxo › nucleo-exposto
- **Hoje:** "a fonte fica com a Defesa reduzida em 2 até o fim do próximo turno dela"
- **Livro:** Condições › Exposto: "Defesa reduzida em 2. Não acumula consigo mesmo."
- **Problema:** é a condição Exposto, com outra duração.
- **Correção:** "a fonte fica Exposta até o fim do próximo turno dela."
- **Decisão do Pedro?** sim, porque troca a duração.

### [MELHORIA] hackear-fluxo › eco-hostil (título Refluxo Hostil)
- **Hoje:** "sofre 2d6 de dano tecnológico quando o efeito dela se desfaz"
- **Livro:** Tipos de dano: Tecnológico, com Resistência própria.
- **Problema:** "se desfaz" é vago.
- **Correção:** "sofre 2d6 de dano tecnológico no momento do cancelamento, mais 1d6 a cada 5 níveis de Interceptador."
- **Decisão do Pedro?** não

### [LACUNA] poderes › firewall-de-fluxo
- **Hoje:** "Um alvo recebe +3 na Defesa contra magia natural."
- **Livro:** Magia › Ataque e resistência: Defesa só vale contra magia de ataque.
- **Problema:** não protege contra magia de efeito; e não diz se acumula.
- **Correção:** "+3 na Defesa e nos testes de resistência contra magia natural. Não acumula consigo mesmo."
- **Decisão do Pedro?** sim, porque amplia o poder.

### [LACUNA] poderes › rastrear-assinatura
- **Hoje:** "Identifique a direção do conjurador por uma cena."
- **Livro:** Poderes: alcance declarado.
- **Problema:** qual conjurador e a que distância.
- **Correção:** "Escolha um conjurador cuja conjuração você percebeu: por uma cena, você sabe a direção dele dentro do seu alcance de detecção."
- **Decisão do Pedro?** sim, porque define o alcance.

### [LACUNA] poderes › desmontar-selo
- **Hoje:** "Role Misticismo contra a DT do selo; em sucesso, suprima-o por uma cena."
- **Livro:** Rituais e Selos: "DT de inscrição". Perigos: desarmar selo com Misticismo, "falhar por 5 ou mais dispara".
- **Problema:** nome da DT; "suprimir" sem definição.
- **Correção:** "contra a DT de inscrição do selo; em sucesso, ele não dispara por uma cena. Falhar por 5 ou mais dispara o selo contra você."
- **Decisão do Pedro?** sim, porque adota a falha do Livro.

### [LACUNA] habilidades › acesso-administrador
- **Hoje:** "pode realizar uma interceptação por rodada sem gastar sua Reação"
- **Livro:** Combate › Reações: uma por rodada.
- **Problema:** ambíguo se soma à da Reação.
- **Correção:** "além da interceptação da Reação, pode fazer uma por rodada sem gastar a Reação."
- **Decisão do Pedro?** sim, porque pode dobrar as interceptações.

### [LACUNA] habilidades › pacote-descartado
- **Hoje:** "em sucesso, você a intercepta e ela não acontece."
- **Livro:** Magia: "A Mana sai ... e não volta se o teste falhar."
- **Problema:** não diz se o conjurador recupera a Mana.
- **Correção:** acrescentar "O conjurador não recupera a Mana."
- **Decisão do Pedro?** sim, porque é custo do inimigo.

### [MELHORIA] poderes › apagao-local
- **Hoje:** "desvantagem no ataque mágico, e os alvos do poder dela têm vantagem para resistir"
- **Livro:** Magia: "magia de ataque".
- **Problema:** "ataque mágico" não é termo.
- **Correção:** "desvantagem no ataque de magia e nos poderes de Fluxo natural; quem resiste a esses poderes tem vantagem."
- **Decisão do Pedro?** não

### [MELHORIA] poderes › choque-de-malha
- **Hoje:** "que carregue item mágico, de Fluxo ou da A.X.I.S, ou que tenha Mana"
- **Livro:** Tipos de dano: Tecnológico (coerente).
- **Problema:** frase confusa.
- **Correção:** "uma criatura a até 9 m que tenha Mana ou carregue item mágico, de Fluxo ou da A.X.I.S."
- **Decisão do Pedro?** não

### [MELHORIA] habilidades › acesso-a-malha · nível 1
- **Hoje:** "troque a calibração num descanso curto"
- **Livro:** Descanso: "Relaxar é o descanso curto do jogo", uma vez entre dois descansos completos.
- **Problema:** só dá para trocar uma vez entre descansos.
- **Correção:** "troque a calibração ao Relaxar ou num descanso completo."
- **Decisão do Pedro?** não

## Padrões que se repetem

- Ação "Passivo" com parte acionável ou com limite de uso: Ninja (Hierarquia), Caçador (Caçada em Grupo), Piloto (Escapa Sozinho).
- Janelas fora da lista do Livro ("por missão", duração "Uma missão"): Ninja (Hierarquia), Caçador (Escolta da Guilda).
- "Ignora Resistência" sem dizer que é a do tipo e que não fura redução de dano: Ninja (Precisão Cirúrgica), Caçador (Predador Perfeito).
- DT numérica ou fórmula antiga no lugar da DT Padrão do nível: Ninja (Pulo Duplo, 18), Piloto (DT 15), Interceptador (15 + metade do VD).
- Efeito de condição descrito sem o nome oficial: Ninja (Sombra Suprema), Interceptador (Núcleo Exposto), Piloto (Camuflagem Ativa).
- Resistência a categoria que não é tipo de dano: Piloto (Cabine).
- Aliados e invocações que contrariam Aliados: Caçador (Companheiro, Escolta), Ninja (Clone).
- "Contato" sem a mecânica de Confiança e limite: Piloto (mecânico), Ninja (Gennin), Caçador (informantes).
- Livro de Veículos (veiculos.md) ainda diz "Subtraia a Resistência geral", contra Tipos de dano; a Blindagem do Piloto usa Resistência contra dano físico (certo), mas o tópico do Livro merece revisão.

## Conferido sem problema

- **Ninja:** Hierarquia (bônus de Furtividade), Arma Ninja (Golpe Certeiro e Corte Fatal contra a regra de crítico), Evasão, Esquiva Sobrenatural (Surpreendido), Correr Sobre Líquidos, Onshinjutsu, Aplicação Inteligente, Ataque em Movimento, Substituição como Reação, eventos.
- **Caçador:** lista de 23 raças contra racas.md; Especialização (estágios 1 a 15); crítico do Predador Perfeito contra a regra x3/x4; Camuflagem (Invisível); Abate, Caça Espiritual, Presa; demais benefícios da Agência.
- **Piloto:** Piloto de Fuga, Shield, Blindagem, Estabilizador, Casco Reforçado, Torre de Sensores, Database, Radin, Capacete, Rede Neural, eventos.
- **Interceptador:** DT de conjuração (7 + 2,5 × círculo), Quarentena Arcana, Cortar Concentração, Ruído Branco, Registro Forense, Blindagem de Malha, Visão de Código, id "eco-hostil" (mantido, título já em "Refluxo Hostil").
