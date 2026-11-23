# Revisão de coerência: classes especiais B

Grupo: Caçador das Almas, Invocador, Devorador. Só leitura; nada do repositório foi alterado.
Referência: Livro de Regras como recortado em `regras/` (núcleo + aliados, bestiário, legados).

> **Nota da conferência:** o `quantidade: 2` do grau de perícia é de propósito. As 12 classes especiais dão dois graus por marco (o Pirata também), e a ficha lê esse campo. O furo está só no Livro, que diz "um degrau" sem citar a exceção. Ver o README.

## Caçador das Almas (cacador-das-almas)

### [LACUNA] corte-da-lua · descricao (vale também para Mil Lâminas e Correntes)
- **Hoje:** "faça um ataque com a Zanpakutō contra um alvo a até 12 m."
- **Livro:** Perícias › Catálogo: "Luta: atacar... corpo a corpo" e "Pontaria: atacar com armas de disparo ou arremesso"; Distâncias: "Uma faixa além do alcance custa −5 no ataque."
- **Problema:** a Zanpakutō é arma corpo a corpo, mas o texto manda atacar a 12 m (Mil Lâminas, a 12 m e 24 m; Correntes, a 6 m e 12 m) sem dizer qual perícia rola nem se o alcance novo conta como alcance próprio da arma. Cada mesa vai decidir de um jeito.
- **Correção:** "Projete a pressão da lâmina e ataque com a Zanpakutō, usando Luta, um alvo a até 12 m. Em acerto, cause o dano normal da arma mais 1 dado de dano de Essência." Nas opções, acrescentar "usando Luta" depois de "ataques da Zanpakutō contra alvos a até 12 m" e depois de "a Zanpakutō alcança alvos a até 6 m".
- **Decisão do Pedro?** sim, porque escolher Luta ou Pontaria muda quem se dá bem na classe.

### [INCOERÊNCIA] zanpakuto · estágio 15 (Shikai Dominado)
- **Hoje:** `"custo_mana": 4, "acao": "Passivo"` e "Ativar o Shikai passa a custar 4 de Mana".
- **Livro:** Poderes e Habilidades › Poder: "Custo zero quer dizer passivo: ele funciona sem você fazer nada."
- **Problema:** o estágio é Passivo, mas tem custo de Mana preenchido. A ficha pode mostrar um gasto que ninguém paga nesse estágio; quem paga é o Shikai do estágio 10.
- **Correção:** tirar `custo_mana` do estágio 15 (deixar só no texto) ou escrever "O Shikai do nível 10 passa a custar 4 de Mana e a durar até o fim da cena."
- **Decisão do Pedro?** não

### [MELHORIA] zanpakuto · estágio 15 e várias opções · duração "até o fim do combate"
- **Hoje:** "sua duração passa a ser até o fim do combate"; "Neste combate"; "até o fim do combate" (Ressonância, Fardo, Veneno, Cinzas do Fim).
- **Livro:** Poderes e Habilidades › Como ler a ação: "Por cena: volta quando a cena acaba. Um combate inteiro é uma cena."
- **Problema:** funciona, mas o Livro só fala em cena. Usar o mesmo termo evita dúvida em cena de perseguição, infiltração ou batalha em massa.
- **Correção:** trocar "fim do combate" por "fim da cena" e "neste combate" por "nesta cena" (também na Bankai: "não pode ser ativado novamente nesta cena").
- **Decisão do Pedro?** não

### [INCOERÊNCIA] zanpakuto › opção incendio · Shikai e Bankai
- **Hoje:** "envolve o alvo em chamas espirituais, e ele fica Queimando." Bankai: "as chamas causam 1d10 por turno, no lugar de 1d6, e se espalham para uma segunda criatura adjacente ao alvo quando ele é atingido."
- **Livro:** Condições › Queimando: "Sofra 1d6 de dano de Fogo no fim do turno. Pegar fogo de novo não soma." Saída: "Ação padrão e Acrobacia ou Atletismo rolando no chão, contra a DT Rotineira do nível da fonte, ou entrar em água."
- **Problema:** "chamas espirituais" sugere Essência, mas Queimando é dano de Fogo; quem tem Resistência a Fogo reduz, e quem tem Resistência a Essência não. O Bankai não diz o tipo do 1d10 nem quem é "atingido" (por qual ataque) para espalhar.
- **Correção:** Shikai: "o primeiro acerto com a Zanpakutō deixa o alvo Queimando, com chamas vindas da lâmina." Bankai: "A condição Queimando causa 1d10 de dano de Fogo por turno no lugar de 1d6. Quando você acerta o alvo com a Zanpakutō, uma segunda criatura adjacente a ele também fica Queimando."
- **Decisão do Pedro?** não

### [LACUNA] zanpakuto › opção cinzas · Shikai e Bankai
- **Hoje:** "Uma vez por turno, uma criatura hostil que entrar nesse raio ou terminar o turno nele testa Reflexos contra a DT do Caçador das Almas e sofre 1d6 de dano de Essência, ou metade se passar."
- **Livro:** convenção das magias adotada para as classes (zona testa no começo do turno; esse trecho não aparece literal no recorte de Magia e Fluxo, vem do pedido da revisão). DT do Caçador: "role Misticismo no momento em que a aciona."
- **Problema:** (1) testa ao entrar ou ao terminar o turno, enquanto a convenção é o começo do turno; (2) "uma vez por turno" não diz de quem; (3) a DT é uma rolagem feita ao acionar, e a zona dispara várias vezes sem um novo "acionamento"; (4) a lâmina "se dissolve", mas as outras habilidades pedem a Zanpakutō na mão.
- **Correção:** "Shikai: a lâmina se dissolve em cinzas cortantes num raio de 3 m ao seu redor, e você pode recompô-la como Ação Livre. Quando você ativa o efeito, role Misticismo uma vez: o resultado é a DT da nuvem até ela acabar. A criatura hostil que entrar na nuvem ou começar o turno nela testa Reflexos contra essa DT e sofre 1d6 de dano de Essência, ou metade se passar, uma vez por turno dela."
- **Decisão do Pedro?** sim, porque define o que acontece com a arma durante o efeito.

### [LACUNA] zanpakuto › opção veneno · Shikai e Bankai
- **Hoje:** "o alvo fica Envenenado. Ele testa Fortitude contra a DT do Caçador das Almas no fim de cada turno dele, e um sucesso encerra o veneno." Bankai: "só com cura ou no fim do combate".
- **Livro:** Condições › Envenenado: "Sofra 1d6 de dano de veneno no fim do turno... O Antídoto da Loja encerra. Cura contra a DT Padrão do nível da fonte, gastando uma ação padrão, também."
- **Problema:** a opção troca a saída padrão da condição por um teste de Fortitude, o que é permitido, mas não diz que o dano é o 1d6 de veneno da condição. No Bankai, "cura" não diz qual: poção, magia, Cura, Antídoto.
- **Correção:** Shikai: "o alvo fica Envenenado (1d6 de dano de veneno no fim do turno dele). No fim de cada turno dele, ele testa Fortitude contra a DT do Caçador das Almas, e um sucesso encerra o veneno." Bankai: "o veneno não encerra com o teste, só com Antídoto, com Cura contra a DT Padrão do seu nível ou no fim da cena, e enquanto durar o alvo tem −2 de Defesa."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] zanpakuto › opção ressonancia · Shikai e Bankai
- **Hoje:** "Em falha, fica Surdo e recebe -2 na iniciativa e em testes de Percepção até o fim do combate." Bankai: "a penalidade de Percepção sobe para -4."
- **Livro:** Condições › Surdo: "Não ouve: falha automaticamente em Percepção que dependa de som... Remova ou supere a fonte." Peso da condição: Surdo é condição de longo prazo, logo Grave.
- **Problema:** Surdo já faz falhar sozinho em Percepção que dependa de som, então o −2 e o −4 só valem para Percepção de visão, o que o texto não diz. Além disso, um efeito que se repete a cada acerto aplica uma condição Grave por uma cena inteira.
- **Correção:** "Em falha, o alvo fica Surdo até o fim da cena e recebe −2 na Iniciativa." Bankai: "em falha, o alvo também perde a próxima Reação disponível, e a Iniciativa dele sofre −4." (Se quiser manter a penalidade de Percepção, escrever "−2 em Percepção que não dependa de som".)
- **Decisão do Pedro?** sim, porque mexe em quão forte é aplicar Surdo.

### [LACUNA] zanpakuto › opção palco-tragico · Bankai
- **Hoje:** "cubra um raio de 9 m ao seu redor em uma escuridão teatral... Toda criatura hostil que entrar ou começar o turno na área testa Vontade contra a DT do Caçador das Almas; em falha, fica Amedrontado por você enquanto permanecer na área."
- **Livro:** Combate › Ver e ser visto: "Escuridão: quem não enxerga no escuro fica Cego para o que está nela" e "Escuridão criada por magia ou Fluxo só cede para quem a fonte disser." Condições › Amedrontado: "No fim do turno, Vontade contra a DT da fonte encerra a condição."
- **Problema:** não diz se a "escuridão teatral" é Escuridão de verdade (deixa todos Cegos, inclusive aliados e o próprio Caçador) ou só ambientação. Também troca a saída do Amedrontado (Vontade no fim do turno) por "enquanto permanecer na área" sem dizer se há novo teste.
- **Correção:** "ao ativar a Bankai, cubra um raio de 9 m ao seu redor com uma escuridão teatral, só de cena: ela não conta como Escuridão para visão, ataque ou ocultação. Toda criatura hostil que entrar ou começar o turno na área testa Vontade contra a DT do Caçador das Almas; em falha, fica Amedrontada por você até sair da área ou até a Bankai acabar."
- **Decisão do Pedro?** sim, porque a alternativa (escuridão de verdade) seria forte para os dois lados.

### [LACUNA] zanpakuto › opção cinzas-do-fim · Shikai
- **Hoje:** "faça um ataque com a Zanpakutō que, se acertar, causa 3d8 de dano de fogo em vez do dano normal e ignora Resistência a fogo do alvo."
- **Livro:** Tipos de dano › Persistentes: "sangramento, fogo, veneno e ácido; batem de novo no fim do turno até alguém remover." Magia e Fluxo › Tipo de dano: "O dano de Fogo de uma magia cai uma vez e não continua no fim do turno." Resistência: "Resistência ao elemento vale inteira contra as derivações dele."
- **Problema:** "fogo" aparece em minúscula, como se não fosse o elemento Fogo. O Livro põe o fogo entre os persistentes, então um golpe de 3d8 de Fogo poderia bater de novo todo turno; a regra de "cai uma vez" está escrita só para magia. Também não diz se "ignora Resistência" cobre as derivações (Magma, Plasma), que contam como Fogo para Resistência.
- **Correção:** "causa 3d8 de dano de Fogo em vez do dano normal. Esse dano cai uma vez e não continua no fim do turno. Ele ignora a Resistência a Fogo do alvo e a de Magma."
- **Decisão do Pedro?** sim, porque define se golpes de classe com Fogo repetem como os persistentes.

### [LACUNA] zanpakuto › opção cinzas-do-fim · Bankai
- **Hoje:** "as cinzas dela se erguem como um espectro que luta ao seu lado até o fim do combate, atacando por você uma vez por rodada e causando 1d8 de dano físico."
- **Livro:** Aliados: "Aliado é qualquer criatura que luta ao seu lado e tem ficha própria" e "Invocações e servos que um poder seu sustenta seguem o texto do próprio poder." Tipos de dano: Físicos são "corte, perfuração, impacto e balístico."
- **Problema:** o espectro não tem Vida, Defesa nem ataque definidos, não diz se vira alvo, se age no turno de quem, se acerta com que bônus, nem quantos podem existir (um por criatura reduzida a 0 dá uma fila deles). "Dano físico" não é um tipo específico.
- **Correção:** "Quando uma criatura hostil é reduzida a 0 de Vida por esse golpe, as cinzas dela se erguem como um espectro até o fim da cena. Ele tem Defesa igual à sua, 1 de Vida, e age logo depois do seu turno: ataca uma vez por rodada, usando o seu bônus de ataque com a Zanpakutō, e causa 1d8 de dano de Essência. Só um espectro por vez; um novo substitui o anterior."
- **Decisão do Pedro?** sim, porque cria uma criatura nova no jogo.

### [LACUNA] zanpakuto › opção ala-glacial · Shikai e Bankai
- **Hoje:** "ele fica Imobilizado até o início do seu próximo turno ou até gastar uma ação para quebrar o gelo." Bankai: "uma velocidade de voo igual ao seu deslocamento; em falha, o alvo também sofre 2d6 de dano de gelo ao ficar imobilizado."
- **Livro:** Condições › Imobilizado: "Ação Padrão e o teste que a fonte indicar; se ela não indicar, Atletismo ou Acrobacia contra a DT da fonte." Tipos de dano: Gelo é derivação de Água.
- **Problema:** "gastar uma ação" não diz qual nem se há teste. No Bankai, "gelo" e "imobilizado" estão em minúscula (o Livro escreve Gelo e Imobilizado), e "velocidade de voo" não é termo do Livro (que usa Movimento e deslocamento).
- **Correção:** Shikai: "ele fica Imobilizado até o início do seu próximo turno, ou até gastar uma Ação Padrão e passar em Atletismo contra a DT do Caçador das Almas para quebrar o gelo." Bankai: "você ganha asas de gelo e voa com o seu Movimento; em falha, o alvo também sofre 2d6 de dano de Gelo ao ficar Imobilizado."
- **Decisão do Pedro?** não

### [LACUNA] zanpakuto › opção corte-espectral · Shikai
- **Hoje:** "ao acertar com a Zanpakutō, você pode dispensar o contato e disparar uma lâmina de energia espiritual em linha reta de até 9 m, atingindo automaticamente a primeira criatura hostil no caminho e causando 1d10 de dano de Essência."
- **Livro:** Magia e Fluxo › Ataque e resistência: efeito que "atinge" sem rolagem precisa dizer se é de ataque ou de efeito; Combate: ataque é "d20 + Luta ou Pontaria contra a Defesa".
- **Problema:** a frase se contradiz: "ao acertar" um alvo, "dispensar o contato" e atingir "a primeira criatura hostil no caminho" (que pode ser outra, ou o mesmo alvo). Não diz se o disparo substitui o ataque ou vem além dele, nem se o acerto automático ignora cobertura.
- **Correção:** "Shikai: uma vez por turno, no lugar de um ataque corpo a corpo, você pode disparar uma lâmina de Essência em linha reta de até 9 m. Ela atinge automaticamente a primeira criatura hostil no caminho e causa 1d10 de dano de Essência. Cobertura total bloqueia a linha."
- **Decisão do Pedro?** sim, porque "atinge automaticamente" é uma escolha de design (sem rolagem).

### [LACUNA] zanpakuto › opção barreira-escarlate · Shikai
- **Hoje:** "escolha um entre dois efeitos ao usar a Zanpakutō: dispare uma rajada carmesim a até 9 m que causa 1d8 de dano de Essência, ou use sua Reação para erguer uma barreira..."
- **Livro:** Poderes e Habilidades › Como ler a ação: toda habilidade diz a ação que pede; Magia e Fluxo › Ataque e resistência: dano em alvo hostil é de ataque ou de efeito.
- **Problema:** "ao usar a Zanpakutō" não é uma das sete ações. A rajada não diz se gasta a Ação Padrão, se rola ataque ou se o alvo testa algo. A barreira é Reação, mas "ao usar a Zanpakutō" não combina com ela.
- **Correção:** "Shikai: uma vez por rodada, escolha um dos dois efeitos. Rajada (Ação Padrão): ataque com a Zanpakutō, usando Luta, contra um alvo a até 9 m; em acerto, 1d8 de dano de Essência. Barreira (Reação): você e os aliados adjacentes recebem +2 de Defesa até o início do seu próximo turno."
- **Decisão do Pedro?** não

### [LACUNA] zanpakuto › opção eco-reverso ("Lâmina de Retorno") e Bankai · Resistência
- **Hoje:** Retorno, Bankai: "o contra-ataque passa a causar dano completo e ignora metade da Resistência do alvo." Bankai (habilidade): "ignoram metade da Resistência do alvo."
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: "Tire a Resistência do tipo de dano e a redução de dano, se houver, até o mínimo 0."
- **Problema:** com a Bankai ativa, o contra-ataque tem duas fontes de "ignora metade da Resistência". Não está escrito se somam (toda a Resistência) ou se valem uma vez. Também não diz o alcance exigido: se o atacante corpo a corpo estiver além do alcance da arma, o "acertar automaticamente" é possível?
- **Correção:** acrescentar na Bankai: "Várias fontes de 'ignora metade da Resistência' não se somam: a Resistência cai pela metade uma vez só." E na Lâmina de Retorno: "quando um atacante corpo a corpo que você alcança com a Zanpakutō lhe causar dano".
- **Decisão do Pedro?** não

### [MELHORIA] zanpakuto › opção perfuracao · Bankai
- **Hoje:** "o ataque ignora todos os bônus de Defesa do alvo, inclusive os concedidos por poderes ou magias."
- **Livro:** Combate › Ataques e cobertura: "Cobertura parcial dá +2 de Defesa; cobertura superior dá +5." Reações: Esquiva "+4 de Defesa contra um ataque".
- **Problema:** não diz se cobertura e a reação Esquiva contam como "bônus de Defesa". Qualquer leitura serve, mas sem escolha a mesa discute no momento.
- **Correção:** "ignora todos os bônus de Defesa do alvo, inclusive os de poderes, magias e da reação Esquiva. A cobertura continua valendo."
- **Decisão do Pedro?** não

### [LACUNA] treinamento-de-ceifeiro › opção hakuda
- **Hoje:** "Seus ataques desarmados causam 1d8 de dano físico ou de Essência, à sua escolha."
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força... Classe ou raça que der outro dano desarmado, como o Lutador, diz isso no próprio texto." Tipos de dano: Resistência física cobre corte, perfuração, impacto e balístico.
- **Problema:** "dano físico" não é um tipo específico (o Lutador escreve "impacto") e não diz se soma o Mod. Força, como o soco comum.
- **Correção:** "Seus ataques desarmados causam 1d8 de impacto + Mod. Força, ou 1d8 de Essência + Mod. Força, à sua escolha a cada acerto."
- **Decisão do Pedro?** não

### [LACUNA] konso-funeral-da-alma · descricao
- **Hoje:** "tocar uma alma vulnerável: qualquer alma voluntária, viva ou não... Em falha, ou se o alvo for voluntário, a alma é purificada e enviada além, removida da cena sem ser destruída pela força."
- **Livro:** Magia e Fluxo › Termos: "Alma própria. Toda criatura que pensa por conta própria: personagens, gente com nome..." e "Ausente: a criatura saiu da existência pelo Vazio sem morrer." Ferimentos › Voltar da morte.
- **Problema:** "viva ou não" permite Konsō sobre um aliado vivo e voluntário, mas o texto não diz o que acontece com ele (morre? some? volta?). Ao mesmo tempo o Caçador "absorve" 1d8 de Vida ou Mana a cada Konsō bem-sucedido, o que vira cura grátis usando um aliado.
- **Correção:** "tocar uma alma vulnerável: um espírito ou alma desencarnada voluntária, ou um espírito hostil com metade da Vida máxima ou menos." Se a ideia incluir vivos, definir o efeito com todas as letras (ex.: "um vivo voluntário fica Inconsciente por 1 hora, sem risco de morrer, e nada mais acontece").
- **Decisão do Pedro?** sim, porque define se o Konsō pode atingir vivos.

### [MELHORIA] konso-funeral-da-alma · descricao
- **Hoje:** "sofre −2 de Defesa contra o seu próximo ataque, até o fim do seu próximo turno."
- **Livro:** Condições › Exposto: "Defesa reduzida em 2... Termina automaticamente no começo do próximo turno."
- **Problema:** "o seu próximo turno" pode ser lido como o do Caçador ou o do alvo, e o efeito é o de Exposto sem usar o nome da condição.
- **Correção:** "Em sucesso, ele resiste ao ritual e fica Exposto até o começo do seu próximo turno, mas a tentativa é gasta mesmo assim."
- **Decisão do Pedro?** não

### [MELHORIA] bankai · usos × zanpakuto estágio 10
- **Hoje:** "O Shikai é ativado sem custo e, por três rodadas... Quando o efeito termina, o Shikai também termina e não pode ser ativado novamente neste combate."
- **Livro:** Como ler a ação e o limite de uso: "Por cena: volta quando a cena acaba."
- **Problema:** não diz se ativar o Shikai pelo Bankai gasta o "uma vez por cena" dele (se gasta, a frase final é redundante; se não, o Caçador pode ter dois Shikais na mesma cena).
- **Correção:** acrescentar "Ativar o Shikai por aqui gasta o uso dele nesta cena."
- **Decisão do Pedro?** não

### [ERRO] mascara-do-vazio · descricao
- **Hoje:** "você sofre 2d8 de dano que ignora Resistência e não pode ser reduzido ou transferido." (campo `dano`: "2d8 em você ao terminar")
- **Livro:** Tipos de dano › Dano verdadeiro: "Nenhuma Resistência reduz esse dano... e a redução de dano também não vale contra ele... só aparece quando a fonte escreve com todas as letras 'dano verdadeiro'."
- **Problema:** o texto descreve o dano verdadeiro sem usar o nome. Pelo Livro, é um tipo oficial; quem lê "dano que ignora Resistência" não sabe se vale também contra redução de dano, Vida temporária e a Memória de outro Devorador.
- **Correção:** "Quando a máscara termina, você sofre 2d8 de dano verdadeiro, que não pode ser transferido." Campo `dano`: "+1 dado com a Zanpakutō; 2d8 de dano verdadeiro em você ao terminar".
- **Decisão do Pedro?** sim, porque o Livro diz que dano verdadeiro é raro e de habilidade de topo; este é um poder de nível 12 que o usa contra o próprio personagem.

### [MELHORIA] pele-vazia · descricao
- **Hoje:** "Quando for atingido, deixe uma pós-imagem no lugar, reduza o dano do ataque à metade e mova-se até 3 m sem provocar Reações."
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: "Role o dano inteiro... Tire a Resistência do tipo de dano e a redução de dano."
- **Problema:** não diz se a metade vem antes ou depois da Resistência. O resultado muda (10 de dano, Resistência 4: metade antes dá 1; depois dá 3).
- **Correção:** "reduza à metade o dano do ataque, depois da Resistência, e mova-se até 3 m sem provocar Reações."
- **Decisão do Pedro?** não

### [MELHORIA] hado-raio-branco e kido-de-cura · "a partir do nível 10"
- **Hoje:** "A partir do nível 10, você pode gastar 7 de Mana no lugar de 4 para causar 3d8." (Kidō: "A partir do nível 10... 8 de Mana no lugar de 5")
- **Livro:** Sistema base › Nível e multiclasse: "O nível total é a soma dos níveis de todas as suas classes"; Poderes e Habilidades: o pré-requisito dos outros poderes usa "Nível 8 de Caçador das Almas".
- **Problema:** "nível 10" sem classe pode ser lido como nível total; os pré-requisitos dos outros poderes dizem "de Caçador das Almas".
- **Correção:** "A partir do nível 10 de Caçador das Almas, você pode gastar..."
- **Decisão do Pedro?** não

### [MELHORIA] corrente-do-destino · descricao
- **Hoje:** "receba vantagem para rastrear sua presença espiritual."
- **Livro:** Perícias › Catálogo: "Sobrevivência: Orientar-se, rastrear, encontrar abrigo e recursos."
- **Problema:** não diz em qual perícia vale a vantagem.
- **Correção:** "receba vantagem em Sobrevivência para rastrear a alma e saiba a direção aproximada dela enquanto estiver na mesma dimensão."
- **Decisão do Pedro?** não

### [MELHORIA] separacao-da-alma e corte-do-vinculo · "possessão ou controle espiritual"
- **Hoje:** "alvo de possessão ou controle espiritual, conceda +4 no teste de resistência" / "Toque uma criatura sob possessão ou controle espiritual e faça Misticismo contra a DT original do efeito."
- **Livro:** Magia e Fluxo › Ataque e resistência: o teste de resistência vem do efeito; Aflições: "Cura reduz 1 estágio por sucesso". O Livro não define "possessão" nem "controle espiritual" como condição.
- **Problema:** não diz quais efeitos contam (a magia de controle da mente? o Konsō contra hospedeiro?). No Corte do Vínculo, se a DT original foi rolada (como na DT de classe), não está escrito quando ela vale; e uma falha pode ser repetida a cada rodada por 6 de Mana.
- **Correção:** Separação: "contra um efeito que tome o controle do corpo ou da mente (possessão, dominação, controle espiritual)". Vínculo: acrescentar "Uma falha impede nova tentativa neste efeito até o fim da cena."
- **Decisão do Pedro?** sim, porque limita quanto o Caçador vira anti-controle para a mesa toda.

### [MELHORIA] zanpakuto · estágio 1 (Asauchi) · acao
- **Hoje:** `"acao": "Ação Livre", "momento": "para manifestar ou recolher"` e "Após um descanso completo, vincule uma arma corpo a corpo à sua alma."
- **Livro:** Como ler a ação: "Ritual como ação virou 'Fora de combate' + momento", ex.: "Fora de combate · escolhido no descanso completo".
- **Problema:** o estágio mistura duas ações: vincular a arma (acontece depois de um descanso completo, ou seja, Fora de combate) e manifestar ou recolher (Ação Livre). O campo `acao` só mostra a segunda.
- **Correção:** "Após um descanso completo, vincule uma arma corpo a corpo à sua alma (Fora de combate). Manifestar ou recolher a Zanpakutō é uma Ação Livre."
- **Decisão do Pedro?** não

### [LACUNA] dt_efeitos · descricao
- **Hoje:** "role Misticismo no momento em que a aciona. O resultado da sua rolagem é a DT que o alvo precisa alcançar."
- **Livro:** Perícias › DT Padrão: "Algumas DTs já crescem por outro caminho"; Magia e Fluxo: "a mesma rolagem, lida duas vezes". O Ninja escreve "É uma rolagem por acionamento, e ela vale para todos os alvos atingidos ali."
- **Problema:** falta dizer que é uma rolagem por acionamento e vale para todos os alvos (importa em Colapso, Cinzas, Pressão Espiritual, Palco Trágico), e o que acontece nos efeitos que testam depois (zonas) ou numa Reação do alvo.
- **Correção:** acrescentar no fim: "É uma rolagem por acionamento, e ela vale para todos os alvos atingidos ali. Num efeito que dura, vale o resultado da rolagem feita ao ativar."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] progressao · grau_pericia `quantidade: 2`
- **Hoje:** `{"tipo": "grau_pericia", "quantidade": 2}` nos níveis 1, 6, 11 e 17.
- **Livro:** Poderes e Habilidades › Grau de perícia: "Um degrau de graça em uma perícia à sua escolha." Quadro: "Grau de perícia | 1, 6, 11 e 17 | 4".
- **Problema:** a classe entrega 2 graus por marco (8 no total), contra 1 de qualquer outra classe comum. O mesmo vale para as especiais com `quantidade: 2` (Invocador, Devorador e outras).
- **Correção:** ou `quantidade: 1`, ou escrever no Livro que as classes especiais dão dois graus por marco.
- **Decisão do Pedro?** sim, porque decide se é uma vantagem de especiais ou erro de cópia.

## Invocador (invocador)

### [LACUNA] formas-vinculadas › nucleo-firme; circulo-de-convocacao; sacrificio-da-invocacao; avatar-da-deidade · Vida temporária
- **Hoje:** "entra em cena com Vida temporária igual ao seu nível de Invocador, que absorve dano antes da Vida real dela"; "15 de Vida temporária ao entrar na área"; "10 de Vida temporária a cada aliado"; "Vida temporária igual ao dobro do seu nível de Invocador".
- **Livro:** Tipos de dano › Resistência e ordem de aplicação só fala de Vida; o Livro só cita Vida temporária no Fruto de Vitalidade (Frutos e Implantes).
- **Problema:** não há regra geral de Vida temporária: se fontes diferentes somam ou vale a maior, quanto dura, se a cura a recompõe, em que ordem entra frente à Resistência. Quatro partes da classe dependem dela.
- **Correção:** escrever no Livro (ou em cada texto): "Vida temporária não soma entre fontes: vale a maior. Ela absorve o dano depois da Resistência, antes da Vida real, não é curada e some no fim da cena."
- **Decisão do Pedro?** sim, porque é regra geral nova.

### [INCOERÊNCIA] formas-vinculadas › broto-curador · escalonamento nível 3
- **Hoje:** base "vantagem em testes de Fortitude contra doença e veneno"; nível 3: "a vantagem passa a valer também contra ficar Amedrontado por efeito mágico."
- **Livro:** Condições › Amedrontado: "No fim do turno, Vontade contra a DT da fonte encerra a condição."
- **Problema:** a vantagem da base é em Fortitude, mas o Amedrontado se resiste com Vontade. Lido literalmente, a extensão não tem teste onde aplicar.
- **Correção:** "Nível 3: você e seus aliados também recebem vantagem em testes de Vontade contra ficar Amedrontado por efeito mágico."
- **Decisão do Pedro?** não

### [MELHORIA] formas-vinculadas › fera · nível 4
- **Hoje:** "recebe vantagem no primeiro ataque que fizer em cada combate."
- **Livro:** Como ler a ação: "Por cena... Um combate inteiro é uma cena."
- **Problema:** o Livro só usa cena.
- **Correção:** "no primeiro ataque que fizer em cada cena."
- **Decisão do Pedro?** não

### [LACUNA] formas-vinculadas › guardiao
- **Hoje:** "Uma vez por rodada, cada invocação sua pode se colocar entre um ataque e um aliado adjacente a ela, virando o alvo do ataque no lugar dele."
- **Livro:** Combate › Reações: "Proteger: Aliado adjacente é atacado | Você vira o alvo e pode usar Bloqueio, se ainda tiver reação."
- **Problema:** é o Proteger, mas não diz se gasta a Reação da invocação, se acontece antes da rolagem e se ela pode usar Bloqueio depois.
- **Correção:** "Uma vez por rodada, cada invocação sua pode usar a própria Reação para Proteger um aliado adjacente a ela, como na reação Proteger, antes da rolagem do ataque."
- **Decisão do Pedro?** não

### [LACUNA] essencia-adaptavel · acao e tipo de dano
- **Hoje:** `"acao": "Passivo"`; "Após um descanso completo, escolha Fogo, Gelo, Raio ou Ácido: o ataque das suas invocações causa esse tipo de dano até o próximo descanso completo."
- **Livro:** Como ler a ação: "Fora de combate · escolhido no descanso completo". Tipos de dano › Persistentes: "fogo, veneno e ácido; batem de novo no fim do turno". Magia e Fluxo: "O dano de Fogo de uma magia cai uma vez".
- **Problema:** a escolha é uma ação (Fora de combate), não passivo. Não diz se o tipo substitui o veneno da Aranha Tecelã (e o efeito de Imobilizar), nem se Fogo e Ácido repetem no fim do turno como persistentes.
- **Correção:** `"acao": "Fora de combate", "momento": "escolhido no descanso completo"`. Texto: "... o dano do ataque das suas invocações passa a ser desse tipo e cai uma vez, sem continuar no fim do turno. O efeito extra do ataque (como o Imobilizado da Aranha Tecelã) continua valendo."
- **Decisão do Pedro?** sim, porque define se Ácido e Fogo repetem.

### [LACUNA] tarefas_bancada › Salamandra de Fogo e Aranha Tecelã (as 5 fichas de cada)
- **Hoje:** "Fagulha 1d6 de fogo a 6 m"; "Presa Paralisante 1d6 de veneno".
- **Livro:** Tipos de dano › Persistentes: "fogo, veneno... batem de novo no fim do turno até alguém remover." Condições › Envenenado.
- **Problema:** "fogo" em minúscula (o Livro escreve Fogo). E sem dizer se o dano é de uma vez ou persistente, a Presa Paralisante pode ser lida como Envenenado a cada turno, além do Imobilizado.
- **Correção:** "Fagulha 1d6 de Fogo a 6 m (dano de uma vez)"; "Presa Paralisante 1d6 de dano de veneno (de uma vez)".
- **Decisão do Pedro?** sim, mesmo motivo do achado anterior.

### [LACUNA] sopro-restaurador · descricao
- **Hoje:** "A invocação cura 2d8 + Mod.Fluxo de uma criatura adjacente a ela, uma vez por cena." (Ação Padrão)
- **Livro:** Aliados: "Um aliado age por conta: ele tem as ações dele, e não empresta ação nem reação para você."
- **Problema:** "a invocação" não diz qual das duas, e a Ação Padrão não diz se é a sua ou a dela.
- **Correção:** "Gaste a sua Ação Padrão: uma invocação sua em cena cura 2d8 + Mod.Fluxo de uma criatura adjacente a ela. Uma vez por cena."
- **Decisão do Pedro?** não

### [LACUNA] elo-protetor · descricao
- **Hoje:** "Divida igualmente entre você e a invocação um dano recebido."
- **Livro:** Tipos de dano › ordem: "Role o dano inteiro... Tire a Resistência."
- **Problema:** não diz quem sofre o dano original, qual invocação, o alcance, se divide antes ou depois da Resistência, nem o que acontece se a invocação cai a 0.
- **Correção:** "Reação, quando você sofrer dano: uma invocação sua a até 9 m recebe metade dele, depois da sua Resistência. O dano passado mantém o tipo e usa a Resistência dela."
- **Decisão do Pedro?** sim, porque alcance e ordem são escolha de balanço.

### [MELHORIA] casca-guardia e investida-bestial · descricao
- **Hoje:** "aliados adjacentes à invocação reduzem em 5 o dano de cada golpe" / "A invocação move até 9 m e causa +1d8 em seu próximo ataque."
- **Livro:** Tipos de dano: a redução de dano vale depois da Resistência e não contra dano verdadeiro.
- **Problema:** não diz qual invocação, se "aliados" inclui você, se o movimento da Investida soma ao Movimento dela, nem a que ataque o +1d8 se aplica.
- **Correção:** Casca: "você e os aliados adjacentes a uma invocação sua, à sua escolha, reduzem em 5 o dano de cada golpe, depois da Resistência." Investida: "uma invocação sua se move até 9 m, além do Movimento dela, e causa +1d8 no próximo ataque dela."
- **Decisão do Pedro?** não

### [LACUNA] avatar-da-deidade ("Invocação Ascendida") × convergencia-primordial
- **Hoje:** "A mesma invocação não recebe este poder e a Convergência Primordial ao mesmo tempo."
- **Livro:** Poderes e Habilidades: cada efeito diz a própria janela; nada define precedência.
- **Problema:** a Convergência afeta todas as invocações, a Ascendida escolhe uma. Não diz qual vale quando coincidem.
- **Correção:** "Enquanto a Convergência Primordial durar, esta invocação não recebe os +2 dados dela; vale a Ascendida."
- **Decisão do Pedro?** não

### [LACUNA] circulo-de-convocacao · descricao
- **Hoje:** "você e todas as suas invocações dentro dela recebem +2 em testes e ataques, e 15 de Vida temporária ao entrar na área."
- **Livro:** Magia e Fluxo: o "+2 do Círculo de Convocação" soma ao teste de conjuração.
- **Problema:** "ao entrar" permite sair e entrar para repetir a Vida temporária; "testes" é amplo.
- **Correção:** "15 de Vida temporária na primeira vez que cada um entra na área nesta cena."
- **Decisão do Pedro?** não

### [LACUNA] convergencia-primordial · descricao
- **Hoje:** "causa ou concede +2 dados a mais do que o normal."
- **Livro:** Combate › Críticos: dado extra de habilidade "entra uma vez só".
- **Problema:** não diz que os dados são do mesmo tipo do original (Mão Extra, Toque Vital e Garras têm dados diferentes) nem se Toque Vital e Mão Extra, "uma vez por cena", ganham usos extras.
- **Correção:** "... causa ou concede +2 dados do mesmo tipo do que ela já usa. Os usos da habilidade não aumentam."
- **Decisão do Pedro?** não

### [LACUNA] tarefas_bancada › Duende Prestativo (Mão Extra) × Ações coletivas
- **Hoje:** "Mão Extra: +1d6 num teste de perícia fora de combate (cozinhar, limpar, cuidar, negociar), uma vez por cena"
- **Livro:** Ações coletivas › Ajudar: "+2 por ajudante... O ajudante não faz teste", "No máximo dois ajudantes".
- **Problema:** não diz se a Mão Extra é um Ajudar (e conta no limite de dois) ou um bônus à parte que soma com o +2 dos aliados.
- **Correção:** "Mão Extra conta como um ajudante e troca o +2 por +1d6." (ou "soma com o Ajudar de outras pessoas").
- **Decisão do Pedro?** sim, porque muda o teto do bônus em perícia.

### [MELHORIA] pacto-de-genese · estágio 1 × tarefas_bancada
- **Hoje:** "cada uma tem ficha pronta (Vida, Defesa, Movimento e uma habilidade)."
- **Livro:** Aliados: a ficha é editável; o Catálogo diz que a Defesa acompanha o nível total.
- **Problema:** o Pacto sugere Defesa fixa; o Catálogo diz que ela sobe com o nível total.
- **Correção:** acrescentar "A Defesa começa na da ficha e acompanha o seu nível total, como o Catálogo explica."
- **Decisão do Pedro?** não

### [MELHORIA] eventos › chamado-da-criacao
- **Hoje:** "pode trocar uma invocação vinculada por outra ficha do Catálogo, no mesmo nível da que saiu"
- **Livro:** Evento: "não tem número... não entra no cálculo de nada."
- **Problema:** o evento dá uma troca mecânica que o Pacto não permite.
- **Correção:** manter, mas escrever "com a permissão do Mestre", como o Livro prevê para trocar escolhas.
- **Decisão do Pedro?** sim.

### [LACUNA] olhos-compartilhados · descricao
- **Hoje:** "Veja e ouça por uma invocação sua enquanto se concentrar, até o fim da cena."
- **Livro:** Condições › Concentrando: ao sofrer dano, Vontade DT 10 ou metade do dano.
- **Problema:** sem alcance (qualquer distância? mesma dimensão?) e sem dizer qual invocação.
- **Correção:** "Veja e ouça por uma invocação sua em cena, a qualquer distância na mesma dimensão, enquanto se concentrar (até o fim da cena)."
- **Decisão do Pedro?** não

### [MELHORIA] tarefas_bancada › Colosso de Ferro · Resistência
- **Hoje:** "Resistência 2 a dano físico"
- **Livro:** Tipos de dano: "Resistência física geral cobre todos os danos físicos."
- **Problema:** correto, mas o nome oficial é Resistência física.
- **Correção:** "Resistência física 2" (e 4, 6, 8, 10).
- **Decisão do Pedro?** não

### [LACUNA] dt_efeitos (Invocador)
- **Hoje:** "role Misticismo no momento em que aciona..."
- **Livro:** Magia e Fluxo: a invocação ataca "com o teste de conjuração".
- **Problema:** nenhum efeito da classe usa essa DT (a invocação resiste contra o total do ataque), e falta "uma rolagem por acionamento".
- **Correção:** acrescentar "É uma rolagem por acionamento, válida para todos os alvos", ou deixar claro que a DT vale só para poderes do próprio Invocador.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] progressao · grau_pericia `quantidade: 2`
- **Hoje / Livro / Problema:** igual ao achado do Caçador das Almas (2 graus por marco contra 1 no Livro).
- **Correção:** ver Caçador.
- **Decisão do Pedro?** sim.

## Devorador (devorador)

### [INCOERÊNCIA] banquete-de-poder · estágio 1 · duracao e janela
- **Hoje:** `"acao": "Fora de combate", "duracao": "Até o fim da cena da morte"`; "pode devorá-lo até o fim da cena atual, gastando um minuto".
- **Livro:** Como ler a ação: "Por cena: volta quando a cena acaba. Um combate inteiro é uma cena."
- **Problema:** a ação é Fora de combate, mas a janela de devorar acaba com a cena, que é o combate: se o minuto só vale depois da luta, a janela pode já ter fechado. O campo `duracao` parece dizer que o poder gravado some no fim da cena, enquanto os slots, a Memória e a Última Refeição tratam o slot como duradouro.
- **Correção:** `duracao`: "Até o slot ser esvaziado". Texto: "pode devorá-lo até uma hora depois da morte, gastando um minuto junto ao corpo."
- **Decisão do Pedro?** sim.

### [LACUNA] banquete-de-poder · slots cheios
- **Hoje:** "grave-a num slot vazio... Você mantém um slot ativo por vez."
- **Livro:** Poderes e Habilidades: "A escolha é feita na hora que a vaga abre, e vale para sempre."
- **Problema:** não existe regra para esvaziar ou substituir um slot ocupado, só a Memória (automática) e a Última Refeição (poder opcional). Com os slots cheios, o Devorador não devora.
- **Correção:** "Você pode esvaziar um slot quando quiser, fora de combate, para gravar outro no lugar."
- **Decisão do Pedro?** sim.

### [LACUNA] banquete-de-poder · como o poder roubado funciona
- **Hoje:** "Escolha uma habilidade ou um poder que a classe dele tinha, limitado ao que um personagem do seu próprio nível de Devorador já teria acesso."
- **Livro:** Poderes e Habilidades: "Só dá para escolher um poder da lista da sua própria classe"; a DT de classe vem de `dt_efeitos`.
- **Problema:** não diz qual DT o poder roubado usa (a da classe original ou a DT do Devorador, rolada com Luta), se paga o custo no recurso do Devorador (pouca Mana) nem como tratar pré-requisitos "Nível X de..." (vale o nível de Devorador?).
- **Correção:** "O poder gravado usa o seu nível de Devorador onde cita nível da classe, a DT do Devorador onde cita uma DT, e o custo dele em Mana ou Estamina."
- **Decisão do Pedro?** sim.

### [LACUNA] banquete-de-poder · estágio 20 e banquete-final · o que pode ser devorado
- **Hoje:** "o teto de nível para devorar desaparece... criatura do Bestiário de qualquer VD"; "todas as habilidades da ficha dela".
- **Livro:** Ferimentos › Voltar da morte: "Só por efeito que diga com todas as letras que devolve a vida, como a Reconstrução da Pedra Filosofal do Alquimista". Bestiário: únicas, Seres Lendários e VD muito alto "servem ao Mestre".
- **Problema:** nada impede gravar a Reconstrução (que revive, "raro e caro") nem habilidades de chefe, Deidade ou criatura única (fichas só do Mestre).
- **Correção:** "O Mestre pode vetar o que for gravado: efeitos que devolvem a vida e habilidades de criatura Única, Ser Lendário ou Deidade."
- **Decisão do Pedro?** sim, porque cobre abusos de alto nível.

### [LACUNA] banquete-final · usos e duração
- **Hoje:** `"usos": "Uma vez por sessão"`, "Eles ficam ativos até o fim da cena atual".
- **Livro:** Como ler a ação: "Por sessão... Fica para o que é de história, informação, dinheiro e sorte... Poder de combate volta no descanso."
- **Problema:** efeito de combate com janela de sessão; e, como a ação é Fora de combate, os poderes gravados duram só até o fim da cena, que pode já ter acabado.
- **Correção:** "Uma vez por descanso" e "Eles ficam ativos por 1 hora".
- **Decisão do Pedro?** sim.

### [LACUNA] ecos-da-ultima-refeicao ("Memória da Última Refeição") · descricao
- **Hoje:** "quando um dano cairia sua Vida a 0, ... reduza esse dano até deixar sua Vida em 1".
- **Livro:** Ferimentos › Vida negativa: o dano continua sendo anotado abaixo de zero. Tipos de dano: redução de dano não vale contra dano verdadeiro.
- **Problema:** "a 0" não cobre o golpe que levaria abaixo de 0 (o caso que mata), e não diz o que fazer com dano verdadeiro.
- **Correção:** "quando um dano cairia sua Vida a 0 ou menos, reduza esse dano até deixar sua Vida em 1. Isso não vale contra dano verdadeiro."
- **Decisão do Pedro?** não

### [LACUNA] instintos-do-devorador › fome-voraz
- **Hoje:** "Ao devorar uma vítima com sucesso, recupere 2d6 de Vida."
- **Livro:** Banquete de Poder não tem teste.
- **Problema:** "com sucesso" não tem a que se referir.
- **Correção:** "Ao terminar de devorar uma vítima, recupere 2d6 de Vida."
- **Decisão do Pedro?** não

### [LACUNA] instintos-do-devorador › mandibula-reforcada
- **Hoje:** "Seu ataque desarmado causa 1d8, no lugar do 1d4 do ataque desarmado."
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força".
- **Problema:** não diz o tipo nem o Mod. Força.
- **Correção:** "Seu ataque desarmado causa 1d8 de corte + Mod. Força, no lugar do 1d4 de impacto."
- **Decisão do Pedro?** não

### [MELHORIA] instintos-do-devorador › metabolismo-acelerado e estomago-de-ferro
- **Hoje:** "Um descanso recupera duas vezes mais Cansaço que o normal." / "imune a veneno e doença ingeridos."
- **Livro:** Descanso: o Cansaço sai pela tabela de qualidade. Aflições › Imunidades: "Use a extensão exata".
- **Problema:** não diz que vale para descanso completo, nem que o limite é 0. A imunidade vale só para exposição por ingestão.
- **Correção:** "Cada descanso completo tira o dobro do Cansaço da tabela." / "Você é imune às aflições de veneno e doença que chegam por ingestão."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] instintos-do-devorador · opções sem `acao`
- **Hoje:** as oito opções não trazem `acao` nem `duracao`.
- **Livro:** Como ler a ação: "Toda habilidade e todo poder dizem que ação pedem."
- **Problema:** as opções do Caçador trazem "Passivo"; aqui faltam.
- **Correção:** `"acao": "Passivo"` em cada uma.
- **Decisão do Pedro?** não

### [LACUNA] presa-a-distancia · descricao
- **Hoje:** "Cuspa ou arremesse algo de dentro de você contra um alvo a 9 m, causando 1d8 + Mod.Força de dano."
- **Livro:** Tipos de dano: todo dano tem tipo; Combate: ataque rola contra a Defesa.
- **Problema:** sem tipo de dano, e sem dizer se é ataque (qual perícia) ou teste do alvo.
- **Correção:** "Faça um ataque com Pontaria contra um alvo a até 9 m; em acerto, 1d8 + Mod.Força de dano de perfuração."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] casca-endurecida · duracao
- **Hoje:** `"duracao": "Uma rodada"`, "Receba +3 de Defesa contra um ataque."
- **Livro:** Reações › Esquiva: "+4 de Defesa contra um ataque".
- **Problema:** a duração diz uma rodada e o texto diz um ataque; falta o gatilho.
- **Correção:** `"duracao": "Um ataque"`; "Reação, antes da rolagem de um ataque contra você: +3 de Defesa contra esse ataque."
- **Decisão do Pedro?** não

### [MELHORIA] regeneracao-de-banquete · titulo
- **Hoje:** "Regeneração de Banquete... recupere 2d6 + Mod.Constituição de Vida."
- **Livro:** Voltar a ter o membro: "Regeneração: só um efeito de Fluxo que diga... que restaura um membro perdido."
- **Problema:** o nome lembra a Regeneração oficial de membros.
- **Correção:** acrescentar "Não restaura membro perdido."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] paralisia-do-medo ("Olhar de Predador") · descricao
- **Hoje:** "em falha, fica Imobilizado até o fim do próximo turno dele."
- **Livro:** Condições: Amedrontado (medo) e Paralisado são condições distintas; Imobilizado não é medo.
- **Problema:** o id fala em paralisia do medo, o nome em olhar, o efeito em Imobilizado: três ideias diferentes.
- **Correção:** manter Imobilizado e descrever "o olhar prende o alvo no lugar", ou trocar a condição para Amedrontado.
- **Decisão do Pedro?** sim.

### [LACUNA] grito-dominante · descricao
- **Hoje:** "Inimigos numa área de 6 m recebem desvantagem no próximo ataque que fizerem."
- **Livro:** Combate › Quando o inimigo desiste: Intimidar bando é teste contra a DT Padrão.
- **Problema:** sem defesa, todos os inimigos na área são afetados automaticamente; falta dizer se é raio de 6 m.
- **Correção:** "Inimigos num raio de 6 m testam Vontade contra a DT do Devorador; em falha, desvantagem no próximo ataque, até o começo do seu próximo turno." (campo `defesa`: Vontade)
- **Decisão do Pedro?** sim, porque pode ser intencional sem teste.

### [LACUNA] metamorfose-parcial · descricao
- **Hoje:** "(garras, guelras, membrana) e concede vantagem numa perícia física relacionada por uma cena."
- **Livro:** Perigos › Fôlego: "Quem respira debaixo d'água ignora dentro da água."
- **Problema:** "perícia física" não é lista do Livro, e guelras não dizem se dão respiração.
- **Correção:** "vantagem em Atletismo, Acrobacia ou Furtividade, à escolha. Guelras permitem respirar debaixo d'água."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] ultima-refeicao · acao e usos
- **Hoje:** `"acao": "Passivo"`, "ao esvaziar um slot de propósito antes de dormir, recupere metade da sua Mana e da sua Estamina máximas ao acordar."
- **Livro:** Como ler a ação: "Fora de combate · escolhido no descanso completo". Descanso: Mana e Estamina voltam por qualidade.
- **Problema:** esvaziar é uma escolha, não passivo; e não diz se a metade soma ao descanso ou se vale o maior.
- **Correção:** `"acao": "Fora de combate", "momento": "antes do descanso completo"`; "...recupere, além do descanso, metade da Mana e da Estamina máximas, até o máximo."
- **Decisão do Pedro?** não

### [MELHORIA] sentidos-agucados · descricao
- **Hoje:** "perceba movimento e cheiro num raio de 18 m, mesmo no escuro."
- **Livro:** Combate › Ver e ser visto: "Escuridão criada por magia ou Fluxo só cede para quem a fonte disser."
- **Problema:** não diz se atravessa escuridão mágica.
- **Correção:** "sem depender de luz; escuridão criada por magia continua valendo como o Livro diz."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] progressao · grau_pericia `quantidade: 2`
- **Hoje / Problema:** igual ao Caçador das Almas.
- **Decisão do Pedro?** sim.

### [LACUNA] dt_efeitos (Devorador)
- **Hoje:** "role Luta no momento em que aciona."
- **Problema:** só o Olhar de Predador usa; falta "uma rolagem por acionamento" e a regra da DT de poder roubado.
- **Correção:** acrescentar "É uma rolagem por acionamento, válida para todos os alvos."
- **Decisão do Pedro?** não

## Padrões que se repetem

- `quantidade: 2` em grau de perícia nas três classes (e nas outras especiais) contra "um degrau" do Livro.
- Dano sem tipo específico ("dano físico", fogo em minúscula, veneno) e a dúvida se dano Persistente repete ou cai uma vez.
- "até o fim do combate" e "em cada combate" em vez de "cena".
- `dt_efeitos` sem "uma rolagem por acionamento" (o Ninja tem).
- Ação Passivo para algo que exige escolha (Essência Adaptável, Última Refeição, Asauchi): usar "Fora de combate" mais momento.
- Vida temporária sem regra geral.
- Efeitos que trocam a saída de uma condição (Imobilizado, Amedrontado, Envenenado) sem dizer o teste.

## Conferido sem problema

- **Caçador das Almas:** grade de recompensas (níveis 1 a 20), Vida 4 + Mana 3 + Estamina 2 = 9, Hadō (falha/metade), Passo Relâmpago, Pressão Espiritual, Bakudō, Flor do Passo, Kidō de Cura, janelas por cena e por descanso, Essência no lugar de "espiritual".
- **Invocador:** grade, 3 + 5 + 1 = 9, ataque das invocações com o teste de conjuração (bate com Magia e Fluxo e Aliados), Pacto e níveis do Catálogo (30 fichas, níveis 1/5/10/15/20), Chamado Rápido, Retorno ao Pacto (teleporte não provoca), Sacrifício, escalonamento das Formas.
- **Devorador:** grade, 4 + 2 + 3 = 9, Investida Predatória, Regeneração, Salto Bestial, instintos com efeitos estruturados (Pele Curtida, Reflexos), Banquete como Fora de combate.
