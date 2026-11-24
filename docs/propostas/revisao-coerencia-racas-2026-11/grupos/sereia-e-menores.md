# Relatório do grupo E: Sereia e menores

Raças revisadas: sereia, simbionte, anomalia, bruxa, clone, amálgamo, feérico, humano, goblim, entidade, raça personalizada.
Total: 49 achados (10 ERRO, 10 INCOERÊNCIA, 14 LACUNA, 15 MELHORIA). 14 pedem decisão do Pedro.

Nota de leitura: "Livro" aponta o tópico do recorte em `regras/`. Os campos citados (`recuperacao`, `usos`, `tipo`) são os do JSON em `racas/`.

---

## Sereia / Tritão (sereia)

### [ERRO] coro-do-encanto, reboque-dos-afogados, mare-que-devolve, chamado-do-fundo, dominio-das-aguas · recuperacao
- **Hoje:** texto "duas vezes por descanso" e campo `"recuperacao": "sessao"` nos cinco traços do nível 32 (variantes e estágio Abissal).
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: "Por sessão: ... Poder de combate volta no descanso."
- **Problema:** O texto diz descanso e o campo diz sessão. Todos são efeitos de combate (dano, cura, controle, terreno), então a janela certa é o descanso.
- **Correção:** `"recuperacao": "descanso"` nos cinco (usos continua 2).
- **Decisão do Pedro?** não

### [INCOERÊNCIA] canto-fascinante-cor (Canção do Fascínio) · descricao
- **Hoje:** "Sua Canção é o próprio Canto Fascinante da raça, do jeito que ele já funciona... Custa uma ação e 2 Mana, uma vez por cena."
- **Livro:** Poderes e Habilidades › Poder: "cada um uma vez só"; limite "por cena".
- **Problema:** Toda Sereia já tem Canto Fascinante no nível 1. A variante Fascínio repete o mesmo traço com os mesmos números e o mesmo `usos: 1`. Dá para ler como dois usos por cena, e a Canção do Fascínio fica sem nada próprio no nível 1, ao contrário das outras três.
- **Correção:** Duas saídas. (a) Trocar o traço do nível 1 do Fascínio por algo próprio, por exemplo "Voz Doce: o Canto Fascinante passa a alcançar 12 m". (b) Manter, mas escrever: "Este traço é o mesmo Canto Fascinante da raça: não é um segundo uso, só marca a sua Canção."
- **Decisão do Pedro?** sim, porque escolher entre dar um traço novo ao Fascínio ou só esclarecer é desenho da Canção.

### [LACUNA] canto-fascinante · usos / recuperacao / custo_mana / alcance_m
- **Hoje:** texto "Custa uma ação e 2 Mana, uma vez por cena", alcance 9 m, mas o traço base não tem os campos estruturados (a versão da variante tem).
- **Livro:** Poderes e Habilidades › Poder: "Cada poder declara o próprio custo" e a ação.
- **Problema:** Campos faltando no traço base. A ficha não controla o uso nem o custo.
- **Correção:** acrescentar `"usos": 1, "recuperacao": "cena", "custo_mana": 2, "alcance_m": 9`.
- **Decisão do Pedro?** não

### [LACUNA] coro-do-encanto, chamado-do-fundo, canto-que-atravessa · descricao (quem é alvo)
- **Hoje:** Coro: "cada criatura a até 12 m que consiga te ouvir faz um teste de Vontade"; Chamado: "Quem começa o turno ali testa Fortitude... e sofre 4d6"; Canto que Atravessa: "pegar todas as criaturas dentro do alcance".
- **Livro:** Magia e Fluxo › Ataque e resistência: efeito em área mira "alvo hostil"; Reboque dos Afogados da própria Sereia diz "hostil".
- **Problema:** Sem a palavra "hostil", o dano e a Fascinação podem pegar os aliados. O Canto que Atravessa transforma Fascinar, Lamento e Pressão em efeitos em área sobre todo mundo que ouve.
- **Correção:** Coro: "cada criatura hostil a até 12 m que consiga te ouvir". Chamado: "Toda criatura hostil que começar o turno ali". Canto que Atravessa: "pegar todas as criaturas hostis dentro do alcance que puderem ouvi-las. Canção de toque, como o Fôlego Emprestado, não muda."
- **Decisão do Pedro?** não

### [LACUNA] mare-que-devolve · descricao
- **Hoje:** "Aliados a até 12 m recuperam 7d6 de Vida, e um aliado caído a 0 volta de pé com um quarto da Vida máxima."
- **Livro:** Ferimentos › Vida negativa: "A cura preenche o Déficit primeiro. Você só acorda quando voltar a 1 PV ou mais." e "Quem acorda ganha Ferido 1."
- **Problema:** Não diz se o Déficit some, se os 7d6 também entram, se o aliado ganha Ferido 1 e se sai de Morrendo. "Caído" aqui lembra a condição Caído.
- **Correção:** "Aliados a até 12 m recuperam 7d6 de Vida. Um aliado a 0 de Vida ou menos tem o Déficit apagado e volta de pé com um quarto da Vida máxima, sem Morrendo, e ganha Ferido 1."
- **Decisão do Pedro?** sim, porque falta decidir se o Ferido 1 vale aqui (o Livro diz que quem acorda ganha) ou se a canção o poupa.

### [INCOERÊNCIA] pressao-das-profundezas · descricao
- **Hoje:** "2d6 de dano de Água, e o Movimento dela cai pela metade até o fim do próximo turno dela. Ela faz um teste de Fortitude... e, passando, sofre metade do dano."
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra." Condições: Lento = "Movimento pela metade e sem correr. Iniciativa reduzida em 2."
- **Problema:** O texto aplica o Movimento reduzido antes do teste, então parece valer mesmo no sucesso. Pela convenção, o sucesso evita o efeito extra. "Movimento pela metade" também já é o Lento oficial.
- **Correção:** "A pressão do fundo despenca sobre uma criatura a até 9 m, que faz um teste de Fortitude contra a sua DT de Sereia. Falhando, sofre 2d6 de dano de Água e fica Lento até o fim do próximo turno dela. Passando, sofre metade do dano e nada mais."
- **Decisão do Pedro?** não

### [LACUNA] chamado-do-fundo · descricao
- **Hoje:** "por cinco rodadas a área de 9 m ao seu redor fica escura e pesada. Criaturas hostis dentro dela atacam com desvantagem."
- **Livro:** Combate › Ver e ser visto: "Escuridão | Quem não enxerga no escuro fica Cego para o que está nela." e "Escuridão criada por magia ou Fluxo só cede para quem a fonte disser."
- **Problema:** Não diz se "escura" é escuridão de verdade (que deixa os aliados sem visão no escuro Cegos), se a área segue a Sereia ou fica fixa, e se "9 m" é raio. A desvantagem pode somar com Cego.
- **Correção:** "por cinco rodadas, num raio de 9 m centrado em você (a área acompanha você), a água fica pesada. Criaturas hostis dentro dela atacam com desvantagem. Não é escuridão: ninguém fica Cego por causa dela."
- **Decisão do Pedro?** sim, porque pode ser a escuridão de verdade (com Cego para quem não enxerga no escuro) e isso muda o poder.

### [LACUNA] eco-abissal (título "Escuta do Fundo") · descricao
- **Hoje:** "Isso te mostra a forma de tudo a até 18 m, mesmo no escuro completo ou na água turva."
- **Livro:** Combate › Ver e ser visto: condição Invisível e Cobertura total ("não pode ser alvo direto").
- **Problema:** "A forma de tudo" não diz se revela criatura Invisível, se atravessa parede (cobertura total) e se funciona com a Sereia Silenciada. Na prática vira uma visão 360 graus sem limite de bloqueio.
- **Correção:** "Você canta baixo e escuta o som voltar. Isso te mostra a forma de tudo que esteja à vista do som a até 18 m: não atravessa parede nem revela criatura Invisível. Não funciona enquanto você estiver Silenciada. Você não distingue cor nem lê texto."
- **Decisão do Pedro?** sim, porque revelar ou não o Invisível é escolha de desenho (sentido que vê tudo ou só a forma).

### [MELHORIA] olhos-de-profundeza · descricao
- **Hoje:** "é imune a dano e penalidades causados por pressão."
- **Livro:** Perigos e Tipos de Dano não têm "dano de pressão".
- **Problema:** Não existe tipo de dano de pressão. Alguém pode ler que a Sereia fica imune à Pressão das Profundezas da Canção do Abismo (que é dano de Água).
- **Correção:** "Você enxerga normalmente na escuridão da água e ignora os efeitos da pressão da água funda. Isso não protege contra o dano de Água de outras criaturas. Seu deslocamento de natação dobra."
- **Decisão do Pedro?** não

### [MELHORIA] dominio-das-aguas · descricao
- **Hoje:** "uma área de 12 m... seus aliados dentro dela se movem sem penalidade nenhuma e recebem +2 de Defesa."
- **Livro:** Condições benéficas: "Resguardado | +2 de Defesa. Não acumula consigo mesmo."
- **Problema:** O +2 de Defesa existe como condição oficial. Sem o nome, soma com Resguardado de outra fonte. Falta origem e raio da área.
- **Correção:** "Por cinco rodadas você manda na água num raio de 12 m ao redor de um ponto a até 12 m de você. Para criaturas hostis ela vira terreno difícil. Seus aliados dentro dela se movem sem penalidade e ficam Resguardados enquanto estiverem ali."
- **Decisão do Pedro?** não

### [MELHORIA] cancao-restauradora · descricao
- **Hoje:** "se livra do medo que estiver em cima dele."
- **Livro:** Condições › Amedrontado.
- **Problema:** "Medo" não é termo do Livro. A condição se chama Amedrontado.
- **Correção:** "recupera 2d6 de Vida e se livra da condição Amedrontado."
- **Decisão do Pedro?** não

### [MELHORIA] refrao-persistente · descricao
- **Hoje:** "o primeiro ataque que aquela criatura fizer contra você sai com desvantagem."
- **Livro:** Poderes e Habilidades › limite de uso (janelas por turno, cena, descanso).
- **Problema:** Sem fim. Pode valer indefinidamente, até na cena seguinte.
- **Correção:** "...o primeiro ataque que aquela criatura fizer contra você nesta cena sai com desvantagem."
- **Decisão do Pedro?** não

---

## Simbionte (simbionte)

### [ERRO] nuvem-viva, colonia-estendida, corpo-redundante · recuperacao
- **Hoje:** texto "duas vezes por descanso", campo `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso: "Poder de combate volta no descanso."
- **Problema:** Campo contradiz o texto, nos três traços do nível 30.
- **Correção:** `"recuperacao": "descanso"` nos três.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] metabolismo-composto · descricao
- **Hoje:** "aguenta o dobro do tempo normal sem comer, beber ou descansar... e recebe vantagem em Fortitude contra fome, sede e exaustão."
- **Livro:** Perigos › Fome e sede: "Sem água: no fim de cada dia sem beber, 1 de Cansaço." e "Sem comida: você aguenta 3 + Mod.Constituição dias... Depois disso, 1 de Cansaço no fim de cada dia". Descanso › Cansaço: "uma noite em claro vale 1".
- **Problema:** Fome e sede não têm teste de Fortitude, o Cansaço é automático. A vantagem não tem onde ser usada. "O dobro do tempo" também não diz qual tempo, já que a sede não tem folga em dias.
- **Correção:** "Você aguenta o dobro de dias sem comer antes de começar a ganhar Cansaço, e o primeiro Cansaço de sede só chega no fim do segundo dia sem beber. Duas noites em claro valem 1 de Cansaço, em vez de uma. Recebe vantagem em Fortitude contra clima Severo ou pior."
- **Decisão do Pedro?** sim, porque os números novos (dobro de dias, segundo dia de sede) são escolha de balanceamento.

### [INCOERÊNCIA] nuvem-viva · descricao
- **Hoje:** "Você não pode ser agarrado, atravessa criaturas e grades e sofre metade do dano de ataques corpo a corpo, mas não consegue atacar nem carregar equipamento pesado."
- **Livro:** Condições benéficas › Incorpóreo: "Atravessa criaturas e objetos, mas não pode terminar o movimento dentro deles. Não pode ser agarrado, derrubado nem empurrado. Sofre metade do dano físico que não venha de magia nem de arma mágica."
- **Problema:** É um Incorpóreo reescrito, com diferenças: metade de qualquer ataque corpo a corpo (inclusive o mágico) em vez de só o físico não mágico, e atravessa "grades" em vez de objetos. Fica uma regra paralela à oficial.
- **Correção:** "Duas vezes por descanso, gaste uma ação e 7 Mana para se espalhar por cinco rodadas numa nuvem de 3 m em volta de você e ficar Incorpóreo. Enquanto durar, você não consegue atacar nem carregar equipamento pesado."
- **Decisão do Pedro?** não

### [LACUNA] hospedeiro-mutuo · descricao
- **Hoje:** "se alimentar do vigor de uma criatura voluntária ou incapacitada que você toque e recuperar 1d6 de Vida."
- **Livro:** Tipos de Dano e Poderes e Habilidades: efeito que tira Vida diz o tipo e o teste.
- **Problema:** A Vida "vem do vigor" da criatura, mas o texto não diz o que ela perde. Contra incapacitada não voluntária parece dano sem tipo, sem teste e sem nome.
- **Correção:** Duas opções. (a) Voluntária: "A criatura perde 1d6 de Vida, sem teste." (b) Incapacitada: "A criatura sofre 1d6 de dano de Essência." Ou escrever que a Vida vem do próprio organismo e só a criatura toca.
- **Decisão do Pedro?** sim, porque falta decidir de onde vem a Vida (custo para a vítima ou não) e a conta do Digestão Profunda depende disso.

### [ERRO] digestao-profunda · descricao
- **Hoje:** "tirar de você uma condição de veneno, doença ou sangramento, escolhida na hora."
- **Livro:** Condições › Condição ou aflição?: veneno e doença são aflições (estágios). Tratamento: "Cura reduz 1 estágio por sucesso". Condições: Envenenado, Sangramento.
- **Problema:** Veneno e doença não são condições. Não diz o que "tirar" faz em uma aflição com vários estágios.
- **Correção:** "recuperar 5d6 de Vida e, à sua escolha, reduzir em 1 estágio uma aflição de veneno ou doença que você tenha, ou encerrar uma condição Envenenado ou Sangramento."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] duas-cabecas · tipo / custo_mana
- **Hoje:** `"tipo": "passiva"`, texto "Uma vez por rodada, gaste 4 Mana para receber uma ação de movimento adicional no seu turno." Sem campo `custo_mana`.
- **Livro:** Poderes e Habilidades › Poder: "Custo zero quer dizer passivo" e a ação vem declarada; Ações: Passivo, Ação Livre...
- **Problema:** Tem custo e exige escolha, então não é Passivo. "Ação de movimento adicional" precisa do nome oficial. "Uma vez por rodada" equivale a por turno, porque só há um turno por rodada.
- **Correção:** `"tipo": "acao_livre"`, `"custo_mana": 4`. Texto: "Ação Livre. Uma vez por turno, gaste 4 Mana para receber uma Ação de Movimento adicional neste turno. Efeito que domine, encante ou confunda a sua mente dura no máximo até o fim do seu turno."
- **Decisão do Pedro?** não

### [LACUNA] memoria-coletiva · descricao
- **Hoje:** "teste de Sobrevivência (DT 15, ou 20 se o rastro tiver mais de um dia)."
- **Livro:** Perícias › DT Padrão, DT Difícil e ajuste de nível: DT numérica é a do nível 1 e soma o ajuste; no nível 11 a Padrão é 21 e a Rotineira 16.
- **Problema:** O traço abre no nível 11. DT 15 já está abaixo da Rotineira de lá, e DT 20 abaixo da Padrão. Fica sem desafio.
- **Correção:** "faça um teste de Sobrevivência contra a DT Padrão do nível do lugar (DT Difícil se o rastro tiver mais de um dia)".
- **Decisão do Pedro?** não

### [LACUNA] assimilacao-superficial · descricao
- **Hoje:** "um sentido, uma resistência ou um jeito simples de se locomover, a critério do Mestre."
- **Livro:** Tipos de Dano: "Resistência vale sempre por tipo específico"; Resistências ao mesmo tipo somam.
- **Problema:** "Uma resistência" não diz tipo nem valor. O Mestre precisa inventar o número na hora, e o Molde Fixo transforma isso em resistência permanente.
- **Correção:** "...um sentido, uma Resistência 5 a um tipo de dano que a criatura tenha, ou um jeito simples de se locomover..."
- **Decisão do Pedro?** sim, porque o valor (5? 3?) e se pode virar permanente no Molde Fixo são decisão de balanceamento.

### [MELHORIA] colonia-estendida, corpo-redundante · descricao
- **Hoje:** Colônia: "aliados dentro dela recebem +2 de Defesa". Corpo: "sua Vida vira 1".
- **Livro:** Condições benéficas › Resguardado (+2 de Defesa). Ferimentos › Ficar com 1 de Vida.
- **Problema:** O +2 deveria usar o nome Resguardado. O Corpo Redundante pode apontar para a regra de Ficar com 1 de Vida, que já diz que o Déficit some e que não vale contra a morte na hora.
- **Correção:** Colônia: "seus aliados dentro dela ficam Resguardados". Corpo: "quando um dano deixaria você a 0 de Vida, você fica com 1 de Vida (veja Ficar com 1 de Vida, em Ferimentos)".
- **Decisão do Pedro?** não

---

## Anomalia (anomalia)

### [ERRO] sobrevivente-outra-historia, transformacao (assinatura) · recuperacao
- **Hoje:** Sobrevivente: texto "Uma vez por descanso", campo `"recuperacao": "sessao"`. Transformação: texto "Uma vez por descanso", campo `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso.
- **Problema:** Campo contra o texto, nos dois. O texto do Sobrevivente também fala "morte instantânea", termo que o Livro chama de morte na hora.
- **Correção:** `"recuperacao": "descanso"` nos dois. Texto do Sobrevivente: "Uma vez por descanso, quando um dano deixaria você com 0 de Vida ou menos, você fica com 1 de Vida (sem Morrendo e sem Ferido, como em Ficar com 1 de Vida). Isso não vale contra a morte na hora, a destruição da alma nem uma consequência narrativa que não venha de dano."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] assinatura-firmada · descricao
- **Hoje:** "Memórias de Outra Campanha passa a dar quatro rerrolagens por descanso."
- **Livro:** Poderes e Habilidades › limite de uso: "Por sessão: ... sorte (um contato, uma pista, uma rerrolagem)."
- **Problema:** No nível 1 são "três rerrolagens por sessão" (campo `recuperacao: sessao`). No estágio 20 a janela muda para descanso sem motivo.
- **Correção:** "Memórias de Outra Campanha passa a dar quatro rerrolagens por sessão."
- **Decisão do Pedro?** não

### [LACUNA] assinaturas ofensiva, defensiva, restauradora, controle · descricao
- **Hoje:** Ofensiva: "3d6 + Mod.Atributo de dano; em sucesso, metade." Defensiva: "reduzir esse dano em 2d6 + Mod.Atributo". Sem alcance, sem tipo de dano, sem dizer qual atributo.
- **Livro:** Tipos de Dano: "Todo dano do jogo cai numa destas cinco famílias"; Magia e Fluxo: convenção de dano com teste e metade no sucesso. Raças: "DT de raça vem de dt_efeitos".
- **Problema:** A Ofensiva causa dano sem tipo, sem alcance e sem atributo. A raça não tem `dt_efeitos`, e a DT vem de "a perícia da sua Assinatura", sem dizer qual é. A "resistência que o Mestre escolher" fica solta.
- **Correção:** Na aprovação da Assinatura, registrar: o tipo de dano (um tipo do Livro), o atributo do "Mod.Atributo" e a perícia da DT. Ofensiva: "...a criatura a até 9 m testa Reflexos, Fortitude ou Vontade (a que combinar com a Assinatura) contra a sua DT de Anomalia. Em falha, sofre 3d6 + Mod.Atributo de dano do tipo da Assinatura; em sucesso, metade." Acrescentar `dt_efeitos` (rótulo "DT de Anomalia", perícia fixada na aprovação) e `alcance_m: 9`.
- **Decisão do Pedro?** sim, porque criar `dt_efeitos` com perícia variável por jogador é decisão de estrutura.

### [ERRO] movimento (assinatura) · descricao
- **Hoje:** "gaste seu Movimento e 4 Mana para realizar o deslocamento especial..."
- **Livro:** Poderes e Habilidades › Como ler a ação: sete ações, entre elas Ação de Movimento.
- **Problema:** "Movimento" é o atributo da ficha, a ação se chama Ação de Movimento.
- **Correção:** "Uma vez por cena, gaste sua Ação de Movimento e 4 Mana para realizar o deslocamento especial preservado ou se teleportar..."
- **Decisão do Pedro?** não

### [MELHORIA] controle (assinatura) · descricao
- **Hoje:** "ele recebe uma condição leve aprovada pelo Mestre até o fim do próximo turno dele."
- **Livro:** Condições › Peso da condição: leves incluem Sangramento, Queimando, Envenenado; Persistentes: "o golpe cai uma vez".
- **Problema:** Uma condição leve aprovada livremente pode ser Queimando ou Sangramento, que causam dano. A Assinatura de Controle não deveria dar dano por trás.
- **Correção:** "...uma condição leve da lista de Condições que não cause dano (fora Sangramento, Queimando e Envenenado), aprovada pelo Mestre..."
- **Decisão do Pedro?** não

---

## Bruxa (bruxa)

### [ERRO] grande-saba · recuperacao
- **Hoje:** texto "Uma vez por descanso", campo `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso.
- **Problema:** Campo contra o texto.
- **Correção:** `"recuperacao": "descanso"`.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] maldicao-tecida, grande-saba · descricao
- **Hoje:** "Faça Misticismo contra a Vontade dela." e "compare com a Vontade de cada alvo." A Maldição Tecida também não diz qual Maldição aplica.
- **Livro:** Raças: "você rola a perícia da raça na hora ... e o resultado é a DT". Combate › Defesas passivas: contra Vontade sem rolagem vale "10 + bônus total". Magia e Fluxo: "cada alvo rola d20 + o bônus dela contra o seu total".
- **Problema:** A raça tem `dt_efeitos` (DT de Bruxa = Misticismo rolado), mas os dois traços descrevem um teste da Bruxa contra a Vontade. Não fica claro se o alvo rola ou usa a defesa passiva. A Maldição Tecida também não diz que a Maldição vem das conhecidas.
- **Correção:** Maldição Tecida: "Uma vez por cena, gaste uma ação e 5 Mana para amaldiçoar uma criatura a até 15 m com uma Maldição conhecida. Ela testa Vontade contra a sua DT de Bruxa. Falhando, a Maldição dura três rodadas; passando, dura só até o fim do próximo turno dela." Grande Sabá: "Role uma vez a sua DT de Bruxa. Cada alvo testa Vontade contra ela, e a duração de cada um segue a Maldição Tecida." Ajustar `teste` para `vontade_vs_dt_bruxa`.
- **Decisão do Pedro?** não

### [ERRO] passos-presos (Maldição) · descricao
- **Hoje:** "O Movimento da criatura é reduzido à metade e ela não pode realizar reações de movimento."
- **Livro:** Condições › Lento: "Movimento pela metade e sem correr. Iniciativa reduzida em 2." Combate › Reações: Esquiva, Bloqueio, Contra-Ataque, Proteger, Ataque de Oportunidade.
- **Problema:** "Reações de movimento" não existe no Livro. A metade do Movimento já é o Lento oficial.
- **Correção:** "A criatura fica Lento e não pode usar Esquiva."
- **Decisão do Pedro?** não

### [LACUNA] definhamento (Maldição) · descricao
- **Hoje:** "ela sofre 1d6 de dano no começo do turno."
- **Livro:** Tipos de Dano: "Todo dano do jogo cai numa destas cinco famílias." Persistentes caem no fim do turno, quando a fonte deixa a condição.
- **Problema:** Dano sem tipo. Sem tipo, não dá para aplicar Resistência. O momento (começo do turno) também difere do dos persistentes (fim do turno).
- **Correção:** "e sofre 1d6 de dano de Essência no começo do turno dela, a cada turno da duração."
- **Decisão do Pedro?** sim, porque escolher o tipo (Essência, Mental, Vazio...) define o tom da Maldição.

### [LACUNA] pele-exposta (Maldição) · descricao
- **Hoje:** "escolha um tipo de dano. A criatura perde Resistência contra ele e sofre +2 desse dano sempre que for atingida por ele."
- **Livro:** Tipos de Dano › Resistência e ordem de aplicação: "Role o dano inteiro... dobre se vulnerável... tire a Resistência". Resistência ao elemento base vale contra as derivações.
- **Problema:** Não diz se vale para imunidade, se zera a Resistência vinda de redução geral de dano, em que ordem entra o +2 e se cada golpe soma uma vez.
- **Correção:** "Ao aplicar, escolha um tipo de dano. A Resistência dela a esse tipo (e a redução de dano que venha dele) vale 0 enquanto a Maldição durar, e cada golpe desse tipo causa +2 de dano, somado uma vez ao total antes da Resistência. Não vale contra imunidade nem contra dano verdadeiro."
- **Decisão do Pedro?** sim, porque falta decidir se vale contra imunidade e se o +2 entra antes ou depois da Resistência.

### [LACUNA] caldeirao-bruxo · descricao
- **Hoje:** "Ao terminar um descanso, prepare duas doses. ... recupera 2d6 + Mod.Inteligência de Vida ou 2d4 de Mana."
- **Livro:** Poderes e Habilidades › Poder: "Poder com custo declara também a ação que consome. Sem isso escrito, ele é uma Ação Padrão."
- **Problema:** Não diz que ação gasta beber, nem quem pode usar a dose (só a Bruxa ou qualquer aliado).
- **Correção:** "...Usar uma dose é uma Ação Padrão, e a dose pode ser dada a uma criatura a seu alcance (toque)."
- **Decisão do Pedro?** sim, porque a dose para o grupo muda a força da variante.

### [MELHORIA] povo / descricao (Preço da Bruxaria)
- **Hoje:** "Quando a Mana acaba, paga com Vida" (povo e descrição).
- **Livro:** Poderes e Habilidades › Poder: custo próprio; o traço Preço da Bruxaria é uma vez por cena, até 3 pontos de Mana.
- **Problema:** O texto de abertura sugere que a Bruxa troca Mana por Vida sempre. A regra só vale uma vez por cena, para até 3 pontos, e só nos traços da raça.
- **Correção:** "Quando falta um pouco de Mana para um feitiço da raça, paga com Vida (uma vez por cena)."
- **Decisão do Pedro?** não

### [MELHORIA] lingua-selada, enfraquecimento (Maldições) · descricao
- **Hoje:** Língua Selada: "não pode usar características que exijam fala, canto ou palavras de ativação." Enfraquecimento: "causa 2 pontos a menos de dano em cada ataque".
- **Livro:** Condições › Silenciado: "Não fala: sem componente verbal em magia e sem ordens faladas." Enfraquecido: "−2 em testes de Força e no dano de ataques corpo a corpo."
- **Problema:** São versões novas de condições que já existem. Pode ser desejado (a Maldição vale só pelo tempo dela), mas deixa uma regra paralela.
- **Correção:** Língua Selada: "A criatura fica Silenciada." Enfraquecimento: manter (ele vale para qualquer ataque, não só corpo a corpo, e a conta é diferente), mas anotar "diferente de Enfraquecido".
- **Decisão do Pedro?** não

---

## Clone (clone)

### [INCOERÊNCIA] corpo-reserva (Série Contínua) · descricao
- **Hoje:** "Quando sua morte for concluída, sua consciência desperta nele após 24 horas... O novo corpo conserva atributos, classes e progressão, mas possui somente as memórias registradas na última sincronização."
- **Livro:** Ferimentos › Voltar da morte: "Só por efeito que diga com todas as letras", "o próprio efeito diz até quando", "O preço: quem volta ganha Ferido 2 e 2 de Cansaço, e Arkarin fica com alguma coisa", "o Mestre pode negar a volta de quem já voltou uma vez".
- **Problema:** É um jeito de voltar da morte e não paga o preço do Livro: nem Ferido 2, nem Cansaço, nem a lembrança, laço ou condição de longo prazo para Arkarin. Também não diz até quando vale (a instalação) nem que pode ser negado depois da primeira volta. "Morte concluída" não tem definição. No Projeto Amadurecido são dois corpos, ou seja, duas voltas.
- **Correção:** "Você pode manter um único corpo reserva preparado em instalação apropriada. Quando você morrer, sua consciência desperta nele após 24 horas, se a instalação e o corpo estiverem intactos. Equipamentos não são transportados. O novo corpo conserva atributos, classes e progressão, e só tem as memórias da última sincronização. Quem volta assim ganha Ferido 2 e 2 de Cansaço, e a perda das memórias desde a sincronização é o que Arkarin leva. O corpo reserva usado se perde, e o Mestre pode negar a volta de quem já voltou uma vez."
- **Decisão do Pedro?** sim, porque falta decidir se a perda de memória substitui a lembrança de Arkarin e se a volta tem limite de vezes.

### [MELHORIA] corpo-otimizado · descricao
- **Hoje:** "vantagem em Fortitude contra doenças, fadiga e venenos."
- **Livro:** Descanso › Cansaço (Cansado, Fatigado, Esgotado...).
- **Problema:** "Fadiga" não é termo do Livro, e Fortitude contra Cansaço só existe em clima e esforço longo.
- **Correção:** "vantagem em Fortitude contra doenças e venenos e contra o Cansaço de clima e de esforço prolongado."
- **Decisão do Pedro?** não

### [MELHORIA] regeneracao-programada · descricao
- **Hoje:** "quando sofrer dano e ficar com metade da Vida máxima ou menos, gaste uma reação e 4 Mana..."
- **Livro:** Condições › Inconsciente: "Não pode agir nem reagir." Ferimentos › Vida negativa.
- **Problema:** Se o golpe leva o Clone a 0 de Vida, ele fica Inconsciente e não pode reagir. O texto "metade ou menos" convida a usar no limite.
- **Correção:** "...e continuar consciente com metade da Vida máxima ou menos, gaste uma reação e 4 Mana..."
- **Decisão do Pedro?** não

---

## Amálgamo (amalgamo)

### [ERRO] surto-convergencia, convergencia-assentada · recuperacao
- **Hoje:** Surto: texto "Uma vez por descanso", campo `"recuperacao": "sessao"`. Convergência Assentada: "duas vezes por descanso", campo `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso.
- **Problema:** Campo contra o texto nos dois.
- **Correção:** `"recuperacao": "descanso"` nos dois.
- **Decisão do Pedro?** não

### [LACUNA] predador (Fragmento) · descricao
- **Hoje:** "Receba uma arma natural de dano-base 1d8."
- **Livro:** Combate › Críticos e Ataque desarmado: tipo de dano (corte, perfuração, impacto), margem 20/x2, perícia Luta e Mod. Força.
- **Problema:** Falta o tipo de dano, a margem de crítico e a perícia.
- **Correção:** "Receba uma arma natural (garra ou presa): 1d8 de corte ou perfuração (escolha ao expressar o Fragmento) + Mod. Força, usa Luta, crítico 20/x2. Vantagem em Sobrevivência para rastrear criaturas feridas."
- **Decisão do Pedro?** sim, porque o tipo fixo (corte, perfuração) é escolha de desenho.

### [ERRO] massa-colossal (Fragmento) · descricao
- **Hoje:** "vantagem contra empurrões e quedas provocadas por outras criaturas."
- **Livro:** Combate › Manobras: Derrubar é "10 + Reflexos", Empurrar "10 + Fortitude". Defesas passivas: "Quando alguém age contra sua Fortitude, Reflexos ou Vontade sem pedir rolagem, use 10 + bônus total."
- **Problema:** Quem se defende de Empurrar e Derrubar não rola, usa o valor fixo. Vantagem para quem não rola não faz nada. O +4 em Fortitude ajuda no Empurrar, mas não no Derrubar (que usa Reflexos).
- **Correção:** "Receba +4 em Fortitude, capacidade de carga dobrada, e as manobras Empurrar e Derrubar contra você têm desvantagem."
- **Decisão do Pedro?** não

### [MELHORIA] membros-multiplos (Fragmento) · descricao
- **Hoje:** "uma interação adicional com objeto por turno. Isso não concede ataques, ações ou reações adicionais."
- **Livro:** Combate › Seu turno: Ação de Movimento ("mexer num objeto que importe na cena") e Ação Livre.
- **Problema:** "Interação adicional" parece uma ação extra, o que o próprio texto nega.
- **Correção:** "uma vez por turno, mexer num objeto não gasta a sua Ação de Movimento. Isso não concede ataques, ações ou reações adicionais."
- **Decisão do Pedro?** não

### [MELHORIA] reconfiguracao-visceral · descricao
- **Hoje:** "para receber Resistência 5 contra o tipo daquele dano até o começo do seu próximo turno, incluindo o dano que ativou a reação."
- **Livro:** Tipos de Dano › Resistência e ordem de aplicação; dano verdadeiro ignora qualquer Resistência.
- **Problema:** A reação vem depois do dano. A Resistência "incluindo o dano que ativou" precisa dizer que devolve Vida. Também ignora dano verdadeiro e o Inconsciente não reage.
- **Correção:** "...recebe Resistência 5 contra o tipo daquele dano até o começo do seu próximo turno. Ela vale já para o dano que ativou a reação: você recupera até 5 de Vida do golpe. Não vale contra dano verdadeiro."
- **Decisão do Pedro?** não

### [MELHORIA] anatomia-plural · descricao
- **Hoje:** "depois de falhar em Fortitude contra doença, veneno, Cansaço ou alteração corporal."
- **Livro:** Perigos › Clima, Fome e sede; Aflições › Aplicação.
- **Problema:** Fortitude contra "Cansaço" só existe em clima, esforço e Pulmões Danificados. "Alteração corporal" não é termo do Livro.
- **Correção:** "depois de falhar em Fortitude contra aflição (doença, veneno ou vício), clima ou um efeito que mude o seu corpo".
- **Decisão do Pedro?** não

---

## Feérico (feerico)

### [ERRO] ilusao-da-corte · recuperacao
- **Hoje:** texto "Uma vez por descanso", campo `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso.
- **Problema:** Campo contra o texto.
- **Correção:** `"recuperacao": "descanso"`.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] glamour · descricao e campos
- **Hoje:** "...enquanto você mantiver concentração... pode fazer um teste de Percepção contra o seu Misticismo." Sem `usos`, `recuperacao`, `custo_mana`, `alcance_m`.
- **Livro:** Condições › Concentrando; Raças: "a raça tem a sua DT" em `dt_efeitos`.
- **Problema:** O Glamour usa "o seu Misticismo" e a Ilusão da Corte usa "a sua DT de Feérico". "Concentração" é a condição Concentrando. O traço tem custo e uso, mas sem os campos.
- **Correção:** "Uma vez por cena, gaste uma Ação Padrão e 2 Mana para montar uma ilusão de imagem e som, de até 3 m, em um ponto a até 15 m de você. Ela fica de pé enquanto você estiver Concentrando, por no máximo 1 minuto. Quem interagir diretamente com ela pode fazer um teste de Percepção contra a sua DT de Feérico para reconhecer que é ilusão." Campos: `"usos": 1, "recuperacao": "cena", "custo_mana": 2, "alcance_m": 15`.
- **Decisão do Pedro?** não

### [MELHORIA] truque-feerico · tipo
- **Hoje:** `"tipo": "passiva"`, texto "Você cria à vontade um efeito sensorial pequeno".
- **Livro:** Poderes e Habilidades › Poder: "Custo zero quer dizer passivo: ele funciona sem você fazer nada." Ação Livre: "um gesto, uma fala curta".
- **Problema:** Criar o efeito exige ação sua, então não é Passivo.
- **Correção:** `"tipo": "acao_livre"` e abrir a descrição com "Ação Livre."
- **Decisão do Pedro?** não

---

## Humano (humano)

### [INCOERÊNCIA] um-pouco-de-tudo · descricao
- **Hoje:** "Nos testes de perícia em que você não tem grau nenhum, some +2."
- **Livro:** Perícias › Graus: "Iniciante | +0" é o primeiro grau.
- **Problema:** Todo teste de perícia tem um grau, o mais baixo é Iniciante. "Sem grau nenhum" fica ambíguo.
- **Correção:** "Nos testes de perícia em que você está em Iniciante, some +2."
- **Decisão do Pedro?** não

### [MELHORIA] teimosia-humana · descricao
- **Hoje:** "depois de rolar qualquer teste de perícia, role de novo e fique com o resultado que preferir."
- **Livro:** Perícias › Rolar de novo: "um teste, ou um dado, nunca é rolado de novo duas vezes."
- **Problema:** O Livro já cobre o conflito com outra rerrolagem, mas o traço não cita.
- **Correção:** acrescentar "Vale uma rerrolagem por teste: se outra fonte já rolou de novo esse teste, você escolhe uma delas."
- **Decisão do Pedro?** não

---

## Goblim (goblim)

### [LACUNA] mercador-improvisador · descricao
- **Hoje:** "Na hora de negociar a venda de um item que seja seu, receba vantagem no teste."
- **Livro:** Loja e Economia: não descrevem teste de venda.
- **Problema:** Não diz qual teste (perícia) nem quando existe. A Loja não tem teste de venda, então a vantagem pode não ter onde cair. Freguesia Cativa, no 30, repete o problema para compra.
- **Correção:** "Na hora de negociar a venda de um item seu, faça um teste de Diplomacia ou Enganação com vantagem. O Mestre diz o que o sucesso rende (um preço melhor)." Freguesia Cativa: "o mesmo vale ao comprar".
- **Decisão do Pedro?** sim, porque falta decidir se existe um teste de venda no jogo e qual perícia ele usa.

---

## Entidade (entidade) e Outra coisa (raca-personalizada)

Sem achados. Os dois arquivos não trazem traço, número ou efeito. Entidade está marcada como indisponível e a personalizada não dá bônus.

---

## Padrões que se repetem

- **P1. `recuperacao: "sessao"` contra "por descanso" no texto.** 14 traços em 6 raças: Sereia (5), Simbionte (3), Anomalia (2), Bruxa (1), Amálgamo (2), Feérico (1). Todos efeitos de combate; corrigir o campo para `"descanso"`. Vale rodar uma busca no `data/ficha/racas.json` inteiro, porque o padrão deve estar também nas raças de outros grupos.
- **P2. "uma ação" em vez de "Ação Padrão".** Vários traços escrevem "gaste uma ação". O Livro diz que, sem a ação escrita, o poder é uma Ação Padrão, mas as sete ações pedem o nome. Vale substituir por "Ação Padrão" em massa onde é isso, e "Ação Completa" onde já é (os traços de nível 30 e 32 já escrevem "ação completa" em minúscula).
- **P3. "+2 de Defesa" em vez da condição Resguardado.** Domínio das Águas, Colônia Estendida, Transformação (Anomalia, +2 Defesa por 3 rodadas). Usar Resguardado evita soma com outra fonte do mesmo bônus.
- **P4. Vantagem em defesa passiva.** Massa Colossal dá vantagem contra manobras, mas quem se defende não rola. Vale conferir as outras raças por "vantagem contra empurrões".
- **P5. Dano sem tipo.** Ofensiva da Anomalia, Definhamento da Bruxa, Predador do Amálgamo. O Livro exige tipo de dano para aplicar Resistência.
- **P6. Condição reescrita no lugar do nome oficial.** Nuvem Viva (Incorpóreo), Passos Presos (Lento), Pressão das Profundezas (Lento), Língua Selada (Silenciado). Onde o Livro já tem a condição, o traço deveria dar a condição e não um texto parecido.
- **P7. Tipo "passiva" com custo ou ação.** Duas Cabeças (Simbionte) e Truque Feérico.
- **P8. Concordância de gênero.** As condições aparecem no feminino ("Fascinada", "Amedrontada") quando o sujeito é "criatura". Está coerente com o sujeito. Se o Pedro quiser a grafia da lista oficial (Fascinado, Amedrontado) em todo lugar, é troca em massa.

## Conferido sem problema

- **Sereia:** Anfíbio e Fôlego (Perigos): quem respira na água ignora a regra de fôlego, confere. Fôlego Emprestado dá a mesma isenção por uma hora. Canto Fascinante bate com a condição Fascinado (dano encerra, duração curta). Pranto que Corrói bate com Amedrontado. Reboque dos Afogados usa dano mental com 2d6 (dados pequenos). Valores de Vida/Mana batem com a tabela (−1 / +2). Voz que Viaja com 1 km está dentro da faixa Galáctico (até 1.000 m). Dano de Água é elemento do Livro. Atuação como DT está em `dt_efeitos`.
- **Simbionte:** Fascinação e rerrolagens batem. Divisão de Trabalho e Divisão Momentânea respeitam reação (uma por rodada). Enxerto Vivo e Rede da Colônia sem problema de janela. Tabela de recursos bate (0 / 0 / 0, com variantes).
- **Anomalia:** Memórias de Outra Campanha (por sessão) está certo como sorte. Dupla Proveniência e conversão sem mecânica nova. Estágio no nível 20 (degrau das especiais). Tabela bate (+3 / +3 / +2). Movimento da Assinatura não provoca reação, como o Livro (teleportar).
- **Bruxa:** Grande Sabá com "Mod.Fluxo criaturas" e Pacto Aprofundado (6 Maldições no catálogo, 7 seria passar do total, e o texto já diz "todas"). Familiar Minúsculo, Grimório (cinco Maldições), Vassoura sem problema de janela. DT de Bruxa em `dt_efeitos`. Tabela bate (+1 / +5).
- **Clone:** Matriz Aperfeiçoada (dois atributos +2), Memórias Residuais (informação, por sessão), rerrolagens por sessão, Projeto Amadurecido coerente. Tabela bate (+3 / +3 / +2).
- **Amálgamo:** Alma Coral (sorte, sessão), Reconfiguração Visceral (Resistência por tipo), Órgão de Fluxo e Carapaça. Tabela bate (+5 / +1 / +3). Cansaço do Surto bate com a escala de Cansaço.
- **Feérico:** Ilusão sem dano, tamanho Pequeno ou Normal e tabela (−2 / +4). Ilusão da Corte com 36 m e 10 minutos sem concentração bate com a regra de ilusão. Estágios 12 e 34 coerentes.
- **Humano:** Adaptabilidade (sete perícias em Aprendiz) bate com Criação de Personagem. Legado adicional bate com Legados. Estágios sem problema de janela.
- **Goblim:** Movimento +1,5 m (e +1,5 m no estágio 30) soma dentro da fórmula de Movimento. Tamanho Pequeno bate com a tabela. Mão Leve (por cena) sem problema.
- **Entidade e raça personalizada:** sem mecânica, nada a conferir além da coerência (Entidade fica fora da tabela de 23 raças, a personalizada também).
