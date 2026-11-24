# Relatório A: Espírito (espirito) e catálogo de Pecados e Virtudes

Arquivos lidos: `racas/espirito.json` inteiro (3 traços de raça, 3 Naturezas, 24 degraus, 26 marcas com 6 ou 7 características cada, Provações) e `racas/_pecados-e-virtudes.json` inteiro (7 Pecados e 7 Virtudes). Regras conferidas: 00-NUCLEO (Perícias, Combate, Tipos de dano, Ferimentos, Descanso, Poderes e Habilidades, Condições, Aflições, Perigos, Magia e Fluxo, Raças) e `elementos.md`, `legados.md`, `pontos-de-relacao.md`.

Legenda: ids de traço entre crases. Nenhum `id` é tocado: só `titulo`, `descricao`, números e campos.

## Espírito (espirito)

### [INCOERÊNCIA] 60 traços com "por descanso" no texto · recuperacao
- **Hoje:** texto "Duas vezes por descanso, gaste uma ação..." (ou "Uma vez por descanso...") com `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: "Por descanso: volta no descanso completo." e "Por sessão: ... Poder de combate volta no descanso."
- **Problema:** o texto promete a janela certa (descanso), mas o campo diz `sessao`. A ficha vai zerar o uso na Nova sessão e não no Descansei. Os 60 são todos efeitos de combate, então o campo é que está errado. O valor `descanso` já existe em outras raças.
- **Correção:** trocar `"recuperacao": "sessao"` por `"recuperacao": "descanso"` em: `presenca-antiga`, `dobra-do-fluxo`, `presenca-primordial`, `eterno`, `labareda-infernal`, `pecado-absoluto`, `chuva-do-inferno`, `eterno-demonio`, `coro-redentor`, `virtude-absoluta`, `coro-dos-ceus`, `eterno-anjo`, e em todos os traços de marca de nível 40 ("Duas vezes por descanso") e de nível 60 ("Uma vez por descanso"): `primeira-alma`, `origem-de-tudo`, `nome-verdadeiro`, `verdade-nua`, `voz-do-jardim`, `fonte-perene`, `primavera`, `reescrita-do-acaso`, `tempestade-de-acasos`, `montanha-espectral`, `portal-menor`, `segundo-agora`, `parar-o-tempo`, `silencio-absoluto`, `eclipse`, `presagio-do-fim`, `ceifa`, `mente-na-rede`, `todos-os-fluxos-em-um`, `todos-os-fluxos-sem-fim`, `coroa-propria`, `trono-proprio`, `avidez-sem-fundo`, `tudo-tem-preco`, `vicio-irresistivel`, `coro-de-desejos`, `roubo-de-poder`, `troca-de-vidas`, `banquete-final`, `fome-que-devora-o-mundo`, `ira-dos-condenados`, `furia-sem-fim`, `mundo-em-camera-lenta`, `eternidade-parada`, `escudo-dos-humildes`, `todos-antes-de-mim`, `fartura`, `fartura-de-milagres`, `voto-inquebravel`, `santuario`, `divida-paga`, `divida-de-honra`, `mesa-posta`, `medida-do-mundo`, `paz-imposta`, `montanha-calma`, `mundo-em-pressa`, `dia-inteiro-numa-hora`. Ficam como estão (`sessao`, de propósito, porque o texto diz "por sessão" e é informação/história): `voz-que-atravessa`, `dobra-maior`, `fantasma-na-rede`.
- **Decisão do Pedro?** não

### [ERRO] adiantar-se (Espírito do Tempo, nível 8) · descricao
- **Hoje:** "Uma vez por cena, gaste 2 Mana ao rolar Iniciativa: role dois d20 e fique com o maior."
- **Livro:** Combate › Iniciativa: "Iniciativa aqui não se rola: é um número da ficha".
- **Problema:** o traço pede uma rolagem que não existe, então nunca dispara.
- **Correção:** "Uma vez por cena, gaste 2 Mana no começo de um combate: a sua Iniciativa sobe 5 até o fim da cena." (tipo `passiva` ou `acao_livre` conforme a ficha aceitar; tirar `reacao` se for virar passivo com custo).
- **Decisão do Pedro?** sim, porque troca o efeito (de "dois d20" para um número fixo) e o valor +5 é palpite.

### [ERRO] voz-do-jardim, mundo-em-pressa, mundo-em-camera-lenta · descricao
- **Hoje:** `voz-do-jardim` e `mundo-em-pressa`: "vantagem em Iniciativa". `mundo-em-camera-lenta`: "têm desvantagem em Iniciativa".
- **Livro:** Combate › Iniciativa: "não se rola". Condições › Lento: "Iniciativa reduzida em 2". Condições › Apressado: "Iniciativa +2".
- **Problema:** vantagem e desvantagem só valem em rolagem de d20, e a Iniciativa é número fixo.
- **Correção:** `voz-do-jardim`: "...e agem com uma ação de movimento extra por turno e +5 de Iniciativa." `mundo-em-pressa`: "...uma ação de movimento adicional por turno e +5 de Iniciativa." `mundo-em-camera-lenta`: "Falhando, perdem a ação de movimento daquele turno e ficam Lentas (Iniciativa −2) até o fim do efeito."
- **Decisão do Pedro?** não (o +5 de Iniciativa pode ser +2 do Apressado se ele preferir reaproveitar a condição)

### [ERRO] origem-de-tudo (Espírito da Origem, nível 60) · descricao
- **Hoje:** "Quem morreu há menos de 1 minuto volta com 1 de Vida."
- **Livro:** Ferimentos › Voltar da morte: "O preço: quem volta ganha Ferido 2 e 2 de Cansaço, e Arkarin fica com alguma coisa."
- **Problema:** o efeito traz gente de volta da morte sem o preço que o Livro cobra de todo retorno.
- **Correção:** "Quem morreu há menos de 1 minuto volta com 1 de Vida, com Ferido 2 e 2 de Cansaço, e o jogador e o Mestre escolhem juntos o que Arkarin fica."
- **Decisão do Pedro?** sim, porque o Pedro pode querer que esse poder de topo seja a exceção do preço.

### [LACUNA] ancora-primordial, raiz-do-pecado, voto-primordial, eterno, eterno-demonio, eterno-anjo, primeira-alma · descricao
- **Hoje:** Âncora/Raiz/Voto: "Chegando a 0 de Vida, você se dispersa e se forma de novo junto da Âncora no fim da cena, com metade da Vida máxima". Eterno: "quando sua Vida chegar a 0, você se refaz ... com a Vida cheia, de pé e livre de qualquer condição".
- **Livro:** Ferimentos › Ficar com 1 de Vida: o efeito "não vale contra a morte na hora (Déficit igual à Vida máxima), a não ser que diga isso com todas as letras". Voltar da morte: "raro e caro".
- **Problema:** (1) os textos não dizem se valem contra a morte na hora (Déficit igual à Vida máxima) nem o que acontece com Morrendo e Ferido. (2) A Âncora tem `usos`/limite nenhum: serve toda cena, de graça, sem Ferido nem Cansaço. É uma volta da morte sem o "caro". (3) Âncora e Eterno disparam no mesmo gatilho (Vida a 0): não diz qual vale. (4) "livre de qualquer condição" tira também Ferido, lesões de longo prazo e a condição permanente da Quebra de Sanidade.
- **Correção:** acrescentar em cada um: "Isso vale contra a morte na hora, e você não fica Morrendo nem ganha Ferido." (ou "não vale contra a morte na hora", se o Pedro quiser) e em Eterno trocar "livre de qualquer condição" por "livre de qualquer condição de efeito curto, menos Ferido e as condições de longo prazo". Em Âncora/Raiz/Voto acrescentar o limite: "Uma vez por descanso." Em Eterno acrescentar: "Se a Âncora já tiver feito o mesmo nesta cena, só um dos dois vale."
- **Decisão do Pedro?** sim, porque mexe no quanto o Espírito é difícil de matar e o Livro diz que voltar da morte é caro.

### [LACUNA] primavera (Espírito da Vitalidade, 60), furia-sem-fim (Demônio da Ira, 60) · descricao
- **Hoje:** `primavera`: "não conseguem cair abaixo de 1 de Vida". `furia-sem-fim`: "você não cai abaixo de 1 de Vida". (`retribuir` do Anjo da Gratidão já usa a forma certa.)
- **Livro:** Ferimentos › Ficar com 1 de Vida: "quando um aliado cair a 0 de Vida, ele fica com 1 de Vida" ... "O efeito não vale contra a morte na hora ... a não ser que diga isso com todas as letras."
- **Problema:** "não cai abaixo de 1" é mais forte do que a regra (protegeria até da morte na hora) e não diz o que acontece com o Déficit.
- **Correção:** `primavera`: "...e, sempre que um deles cair a 0 de Vida, fica com 1 de Vida." `furia-sem-fim`: "...enquanto houver um inimigo à vista, sempre que você cair a 0 de Vida, fica com 1 de Vida, e seus ataques causam +4d6 de dano."
- **Decisão do Pedro?** não

### [LACUNA] refazer-o-corpo, primeira-alma · descricao
- **Hoje:** "ele se levanta com metade da Vida máxima" / "se refazer ... com metade da Vida máxima".
- **Livro:** Ferimentos › Vida negativa: "A cura preenche o Déficit primeiro. Você só acorda quando voltar a 1 PV ou mais." Vida temporária "não conta para acordar".
- **Problema:** não diz se o Déficit é apagado ou descontado. Em Déficit grande, "metade da Vida máxima" pode ficar abaixo de 1 se somar o Déficit.
- **Correção:** "ele volta a ter metade da Vida máxima (o Déficit de Vida some), sai de Morrendo, se levanta e livre de condições que dependam do corpo." (mesmo ajuste em `primeira-alma`.)
- **Decisão do Pedro?** não

### [INCOERÊNCIA] raizes-de-alma, floresta-interior (Espírito da Vitalidade) · descricao
- **Hoje:** "encerrar uma Aflição de nível 1 nele" / "encerram uma Aflição de nível 1 ou 2".
- **Livro:** Aflições: aflição tem "estágio", não nível; "No fim de cada intervalo... sucesso reduz 1 estágio... No estágio 0 a aflição acaba."
- **Problema:** "nível" de aflição não existe. Um jogador não sabe se é o estágio ou a DT.
- **Correção:** `raizes-de-alma`: "...encerrar uma Aflição que esteja no estágio 1, ou estabilizar na hora um aliado caído a 0 de Vida, sem rolar nada." `floresta-interior`: "...aliados a até 9 m recuperam 3d6 de Vida e encerram uma Aflição que esteja no estágio 1 ou 2."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] engolir-o-som (Espírito do Vazio, 28), eclipse (Vazio, 60), furia-sem-fim (Demônio da Ira, 60) · descricao
- **Hoje:** "fica cega e surda por 2 rodadas"; "criaturas hostis ficam cegas"; "fica inconsciente por 1 rodada".
- **Livro:** Condições: **Cego**, **Surdo**, **Inconsciente** são condições com maiúscula. Condições › Inconsciente: "Não pode agir nem reagir".
- **Problema:** grafia minúscula e, no caso do Inconsciente, a condição de quem cai a 0 de Vida (com Morrendo), que não é a mesma coisa de um efeito curto. O Livro manda usar Atordoado para efeito temporário.
- **Correção:** `engolir-o-som`: "Falhando, ela fica Cega e Surda por 2 rodadas." `eclipse`: "criaturas hostis ficam Cegas". `furia-sem-fim`: "Quando termina, você sofre 3 de Cansaço e fica Atordoado por 1 rodada."
- **Decisão do Pedro?** não

### [LACUNA] eclipse (Espírito do Vazio, 60) · descricao
- **Hoje:** "criaturas hostis ficam cegas e não conseguem conjurar magia de até 8º Círculo" (18 m, 3 rodadas, sem teste).
- **Livro:** Convenções da magia: "controle tem teste repetido"; Condições › Cego: "Remova ou supere a fonte". Magia e Fluxo › Ataque e resistência: efeito em área pede resistência.
- **Problema:** Cego e bloqueio de magia em 18 m, de graça e sem teste, vale mais que os outros efeitos de controle do Espírito, que testam Vontade contra Misticismo.
- **Correção:** "...criaturas hostis a até 18 m testam Vontade contra o seu Misticismo. Falhando, ficam Cegas e não conseguem conjurar magia de até 8º Círculo por 3 rodadas, e repetem o teste no fim de cada turno delas. Você e os seus aliados enxergam normalmente." Mudar `teste` para `misticismo_vs_vontade`.
- **Decisão do Pedro?** sim, porque é efeito de nível 60 e o jogo vira com ele.

### [MELHORIA] eclipse (título) · titulo
- **Hoje:** `titulo` "Eclipse".
- **Livro:** Elementos e Derivações, derivação de Escuridão: "Eclipse não é o Fluxo do Vazio."
- **Problema:** o Livro usa o nome Eclipse para uma derivação de Escuridão e avisa expressamente que não é do Vazio. O traço de Vazio de nível 60 tem o mesmo nome.
- **Correção:** `titulo`: "Apagão do Vazio" (ou outro). O `id` fica `eclipse`.
- **Decisão do Pedro?** sim, porque é questão de nome.

### [LACUNA] presagio-do-fim (Espírito do Fim, 40) · descricao e teste
- **Hoje:** "...escolha uma criatura a até 9 m que já esteja com metade da Vida máxima ou menos: ela sofre 14d6 de dano."
- **Livro:** Magia e Fluxo › Tipo de dano das magias: "Magia que não diz o tipo causa o dano do próprio Fluxo". Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade."
- **Problema:** sem tipo de dano, sem teste e sem alcance de resistência. Dano de 14d6 sem chance de resistir é o maior golpe do nível.
- **Correção:** "...ela testa Fortitude contra o seu Misticismo e sofre 14d6 de dano do Fim, ou metade se passar. Se isso a levar a 0, você recupera 4d6 de Vida." Campo `teste`: `misticismo_vs_fortitude`.
- **Decisão do Pedro?** sim, porque o teste de resistência corta o dano esperado.

### [LACUNA] ceifa (Espírito do Fim, 60) · descricao e teste
- **Hoje:** "toda criatura hostil a até 9 m com metade da Vida máxima ou menos sofre 20d6 de dano, e você recupera Vida igual à metade do total causado."
- **Livro:** Convenções da magia valem para raça: "dano em área ... tem teste e metade no sucesso". Tipos de dano: toda fonte diz o tipo.
- **Problema:** dano em área sem teste, sem tipo.
- **Correção:** "...toda criatura hostil a até 9 m com metade da Vida máxima ou menos testa Fortitude contra o seu Misticismo e sofre 20d6 de dano do Fim, ou metade se passar. Você recupera Vida igual à metade do total causado." Campo `teste`: `misticismo_vs_fortitude`.
- **Decisão do Pedro?** sim, mesmo motivo.

### [INCOERÊNCIA] troca-de-vidas (Demônio da Inveja, 60) · descricao
- **Hoje:** "Falhando, ela sofre 10d6 de dano de Essência e você recupera Vida igual ao dano causado. Depois, vocês dois trocam a Mana atual..."
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra."
- **Problema:** quem passa no teste não sofre nada, quando a convenção dá metade do dano.
- **Correção:** "...testa Vontade contra o seu Misticismo e sofre 10d6 de dano de Essência, ou metade se passar. Você recupera Vida igual ao dano causado. Só se ela falhar, vocês dois trocam a Mana atual, cada um limitado ao próprio máximo."
- **Decisão do Pedro?** não

### [LACUNA] corpo-em-brasa (Demônio da Ira, 15) · descricao
- **Hoje:** "quem te acertar corpo a corpo sofre 1d6 de dano de fogo."
- **Livro:** Convenções da magia valem para raça: "dano em área ou de gatilho tem teste e metade no sucesso".
- **Problema:** dano de gatilho sem teste.
- **Correção:** "quem te acertar corpo a corpo testa Reflexos contra o seu Misticismo e sofre 1d6 de dano de Fogo, ou metade se passar." (e `Fogo` com maiúscula no tipo, ver Padrões).
- **Decisão do Pedro?** sim, porque mexe na rolagem que o jogador do Demônio faz toda vez que apanha.

### [INCOERÊNCIA] dano físico "comum" · nevoa-persistente, nevoa-densa, corpo-de-nevoa-solida, corpo-de-eternidade, corpo-de-pedra, escudo-dos-humildes · descricao
- **Hoje:** "Resistência 2 contra dano físico comum (corte, perfuração e impacto)"; `montanha-espectral` e `montanha-calma` usam "todo dano físico".
- **Livro:** Tipos de dano › As cinco famílias: "Físicos: corte, perfuração, impacto e balístico." E: "Resistência física geral cobre todos os danos físicos: corte, perfuração, impacto e balístico."
- **Problema:** "comum" não é termo do Livro, e a lista deixa balístico de fora. Se for de propósito (Espírito não resiste a bala), o texto precisa dizer. Os dois jeitos de escrever convivem na mesma raça.
- **Correção:** "Resistência 2 a dano físico (corte, perfuração, impacto e balístico)", igual nos seis traços. Se o Pedro quiser deixar balístico de fora: "Resistência 2 a corte, perfuração e impacto (não vale contra balístico)".
- **Decisão do Pedro?** sim, porque é decisão se balístico entra.

### [LACUNA] resistências do Espírito Físico que somam · nevoa-persistente, nevoa-densa, corpo-de-nevoa-solida, montanha-espectral, corpo-de-eternidade
- **Hoje:** Névoa Densa dá Resistência 4 física (nível 28); Corpo de Névoa Sólida soma 10 (marca Física, 40); Corpo de Eternidade soma 15 (60); Montanha Espectral soma 10 (60).
- **Livro:** Tipos de dano: "Resistências ao mesmo tipo vindas de fontes diferentes ... somam."
- **Problema:** um Espírito Físico de nível 60 com os três ligados tem 4 + 15 + 10 + 10 = 39 de Resistência física por golpe, praticamente imune a golpe físico, e mais "não pode ser movido". Pelas regras de soma isso é legal, mas é um número que ninguém planejou.
- **Correção:** deixar como está, ou escrever em `montanha-espectral`: "Esta Resistência não soma com a de Corpo de Eternidade; vale a maior." 
- **Decisão do Pedro?** sim, porque é decisão de balanço (não fere a regra).

### [INCOERÊNCIA] veu-de-luz, luz-interior (Anjo Maior e Superior), corpo-de-luz (Anjo Primordial) · descricao
- **Hoje:** "Resistência 2 contra dano de raio"; "sobe para 5 contra dano de raio"; "imune a dano de raio, a Cego, a Amedrontado e a efeitos de escuridão".
- **Livro:** Tipos de dano › Dano elemental: os sete elementos são Terra, Água, Fogo, Ar, **Raio**, **Luz** e Escuridão. Resistência vale por elemento, "quem resiste a Fogo não resiste a Raio".
- **Problema:** o traço se chama "Véu de Luz"/"Luz Interior"/"Corpo de Luz" e fala de escuridão e de cegueira, mas protege de Raio, que é outro elemento (a Luz teria Resistência a dano de Luz e suas derivações).
- **Correção:** trocar "dano de raio" por "dano de Luz" nos três ("Resistência 2 contra dano de Luz", "sobe para 5 contra dano de Luz", "imune a dano de Luz"). Lembrar que a Resistência ao elemento base vale contra as derivações.
- **Decisão do Pedro?** sim, porque pode ser Raio de propósito (anjo do trovão).

### [LACUNA] Natureza do Espírito sem corpo e a condição Incorpóreo · fisiologia
- **Hoje:** "Sem corpo ... atravessa parede" (`povo`, `descricao`), e Passagem Etérea: "atravesse até 1,5 m de material sólido... uma vez por cena". `fonte-da-cor` fala em "criatura incorpórea" (minúscula).
- **Livro:** Condições › Incorpóreo: "Atravessa criaturas e objetos... Não pode ser agarrado, derrubado nem empurrado. Sofre metade do dano físico que não venha de magia nem de arma mágica... Uma criatura que é incorpórea por natureza fica assim para sempre."
- **Problema:** não diz se o Espírito etéreo é Incorpóreo por natureza. Se for, a Resistência física 2 e 4 da Névoa vira ruído (a metade já vem do Incorpóreo), `ectoplasma-firme` e `corpo-de-eternidade` repetem "não pode ser derrubado nem empurrado", e a Passagem Etérea (1,5 m, 2 Mana, uma vez por cena) contradiz "atravessa criaturas e objetos". Se não for, o texto "atravessa parede" no `povo` promete mais do que o traço entrega.
- **Correção:** escolher uma: (a) "Enquanto está sem corpo, o Espírito não é Incorpóreo: só atravessa material pela Passagem Etérea." ou (b) "Enquanto está sem corpo, o Espírito é Incorpóreo; a Passagem Etérea vira 'passe por material sólido sem sair do movimento'". Em qualquer caso `fonte-da-cor`: "qualquer criatura Incorpórea, Invisível ou fora de fase".
- **Decisão do Pedro?** sim, porque é decisão de mecânica de raça central.

### [LACUNA] possessao, encarnacao (Naturezas demoníaca e angelical) · descricao
- **Hoje:** "Encarnado, você usa o corpo, veste armadura, precisa respirar e comer, e perde a Passagem Etérea e as Travessias; a sua Vida, a sua Mana e os seus poderes continuam sendo os da sua ficha."
- **Livro:** Sistema Base: Defesa Natural, Movimento e Estamina saem de atributos e do tamanho. Tamanho: espaço e alcance saem do tamanho.
- **Problema:** não diz de quem são Força, Destreza, Defesa, Movimento, Estamina, tamanho e perícias dentro do corpo. Também não diz o que acontece com a Defesa quando o corpo é Grande (Possessão Aprimorada) e se o Espírito usa o Misticismo ou as perícias do dono. "as Travessias" fala de traços que só a Natureza natural tem. Em `possessao`, o dono "apaga": não é claro quem repete o teste no fim de cada turno "seu".
- **Correção:** acrescentar: "Encarnado, você usa os atributos, o tamanho, a Defesa e o Movimento do corpo, e as suas perícias e Mana da ficha. Vida do corpo não conta: o dano sai da sua Vida." Trocar "e perde a Passagem Etérea e as Travessias" por "e perde a Passagem Etérea". Em `possessao`: "Quem não aceitou repete o teste no fim de cada turno dele (mesmo apagado)."
- **Decisão do Pedro?** sim, porque define o que o corpo dá.

### [LACUNA] posse-absoluta, encarnacao-absoluta (nível 60) · descricao
- **Hoje:** "Você pode manter dois corpos ... e agir por qualquer um deles no seu turno."
- **Livro:** Combate › Seu turno: uma Ação Padrão e uma de Movimento por turno.
- **Problema:** "agir por qualquer um" não diz se são duas sequências de ações por turno ou uma só dividida. Se forem duas, dobra o turno inteiro de graça.
- **Correção:** "...e escolher, no seu turno, qual deles age: você tem uma Ação Padrão e uma de Movimento por turno, divididas entre os dois como quiser."
- **Decisão do Pedro?** sim, porque define o poder.

### [INCOERÊNCIA] esperar-a-hora (Anjo da Paciência, 28) · descricao
- **Hoje:** "você adia o seu turno e age por último nesta rodada".
- **Livro:** Combate › Iniciativa: "Atrasar baixa sua posição de vez, pelo resto do combate."
- **Problema:** o traço promete uma versão limpa do Atrasar sem o custo que o Livro cobra. Pode ser de propósito, mas o texto precisa dizer se a posição volta.
- **Correção:** "você adia o seu turno e age por último nesta rodada; a sua posição na Iniciativa não muda para as próximas." (ou "como Atrasar, a sua posição baixa de vez", se o Pedro preferir a regra comum).
- **Decisão do Pedro?** sim

### [INCOERÊNCIA] sangue-sobe (Demônio da Ira, 8) · descricao
- **Hoje:** "não pode adiar o seu turno nem preparar uma ação."
- **Livro:** Combate › Seu turno: só há Ação Padrão, de Movimento, Completa e Livre; "Atrasar" existe em Iniciativa, "preparar uma ação" não existe.
- **Problema:** termo que o Livro não conhece.
- **Correção:** "Você recebe +3 em Iniciativa. Em troca, não consegue esperar: não pode Atrasar o seu turno."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] olho-comprido (Demônio da Inveja, 8) · descricao
- **Hoje:** "você tem desvantagem em testes para elogiar ou ajudar essa criatura."
- **Livro:** Ações coletivas › Ajudar: "O ajudante não rola nada."
- **Problema:** Ajudar não tem teste, então a desvantagem não faz nada. (Elogiar é Diplomacia, serve.)
- **Correção:** "Até o fim da cena, você tem desvantagem em testes para elogiar essa criatura e não pode Ajudá-la."
- **Decisão do Pedro?** não

### [LACUNA] mao-estendida (Anjo da Humildade, 1), escudo-dos-humildes (40) · descricao
- **Hoje:** `mao-estendida`: "o auxílio vale +4 em vez de +2". `escudo-dos-humildes`: "todo aliado a até 9 m recebe +4 em testes feitos com auxílio de outro".
- **Livro:** Ações coletivas › Ajudar: "+2 por ajudante, até +4" e Perícias › Rolar de novo e somar bônus: "Ajudar (+4) mantém limite próprio".
- **Problema:** o texto não diz se o +4 da Mão Estendida conta no limite de +4 do Ajudar, e se somar com um segundo ajudante dá +6. O Livro também chama a ação de "Ajudar", não "auxílio".
- **Correção:** `mao-estendida`: "...ao Ajudar o teste de um aliado a até 9 m, gaste 2 Mana: a sua Ajuda vale +4 em vez de +2, e o total de Ajudar no teste continua em +4." `escudo-dos-humildes`: "...recebe +4 em testes feitos com Ajuda de outro, somado ao limite normal da Ajuda, que não muda." Trocar "auxílio" por "Ajuda" nos textos que falam da ação.
- **Decisão do Pedro?** não

### [MELHORIA] tempestade-de-acasos (Espírito da Inconstância, 60) · descricao
- **Hoje:** "cada uma rola dois d20 em tudo nessa rodada, e você decide se vale o maior ou o menor."
- **Livro:** Perícias › Vantagem e desvantagem: "Não existe vantagem dupla"; fontes se cancelam uma a uma.
- **Problema:** "rola dois d20, maior ou menor" é vantagem ou desvantagem sob outro nome, e o texto não diz se cancela com outras fontes.
- **Correção:** "Cada uma recebe, em tudo o que rolar nessa rodada, vantagem ou desvantagem, à sua escolha, que se cancela com as outras fontes do jeito de sempre."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] desfazer-o-instante (Espírito do Tempo, 28) e a Provação do Tempo · descricao e provacao
- **Hoje:** "o dano é cancelado, ou o teste é refeito com vantagem." Provação: "Chegar a um instante que já aconteceu e mudar nele uma única coisa".
- **Livro:** Magia e Fluxo › Desgaste do Tempo: "O Tempo também não volta ao passado: o que ele restaura ou encerra acontece agora, e nada do que já aconteceu é desfeito."
- **Problema:** cancelar dano já sofrido e "mudar um instante que já aconteceu" voltam ao passado. O Livro proíbe isso para o Fluxo do Tempo.
- **Correção:** `descricao`: "...quando você ou um aliado a até 9 m for sofrer dano ou acabar de falhar num teste: o dano daquele golpe cai pela metade, ou o teste é refeito com vantagem (só uma vez)." Provação: "Salvar alguém de um destino que já estava marcado, com um único ato no instante certo." O "dano cancelado" por inteiro e "o teste refeito" (rerrolagem) são o que o Pedro pesa.
- **Decisão do Pedro?** sim, porque redefine um poder e a Provação.

### [LACUNA] instante-roubado, adiantar-se, segundo-agora, parar-o-tempo (Espírito do Tempo) · Desgaste do Tempo
- **Hoje:** `segundo-agora`: "um turno completo extra"; `parar-o-tempo`: "três turnos completos extras seguidos"; `instante-roubado`: "uma ação de movimento adicional".
- **Livro:** Magia e Fluxo › Desgaste do Tempo: toda magia de Tempo do 5º círculo em diante que dá ação ou turno extra custa 1 de Cansaço (2 no 9º e no 10º).
- **Problema:** o Livro cobra Cansaço do Tempo que dá turno extra. Os dois traços de nível 40 e 60 dão mais que qualquer magia do 10º círculo e não cobram nada. Além disso, `dobra-do-fluxo` (Primordial) faz todas as características da marca custarem 0 Mana e ganharem um uso extra, o que permite dois Parar o Tempo seguidos (seis turnos extras).
- **Correção:** acrescentar em `segundo-agora`: "Quando termina, você sofre 1 de Cansaço." Em `parar-o-tempo`: "Quando termina, você sofre 2 de Cansaço." Em `dobra-do-fluxo`: "Não vale para características que dão ação ou turno extra."
- **Decisão do Pedro?** sim, porque é número de Cansaço e restrição de combo.

### [LACUNA] possessao-de-circuito (Espírito da Tecnologia, 15) · descricao
- **Hoje:** "Construto com vontade própria tem direito a um teste de resistência para expulsar você."
- **Livro:** Condições › Possessão / Raças: DT de Espírito vem de Misticismo rolado na hora.
- **Problema:** não diz qual resistência.
- **Correção:** "Construto com vontade própria testa Vontade contra o seu Misticismo, e um sucesso expulsa você." Campo `teste`: `misticismo_vs_vontade`.
- **Decisão do Pedro?** não

### [LACUNA] punho-espectral (Espírito Físico, 15), punho-pesado (28), montanha-espectral (60) · descricao
- **Hoje:** "Você ganha uma arma natural feita de ectoplasma compactado, com dano-base 1d8." `punho-pesado`: "causa +4d6 de dano e empurra o alvo 3 m". `montanha-espectral`: "o seu Punho Espectral causa +2 dados de dano".
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força, com crítico 20/x2. Classe ou raça que der outro dano desarmado ... diz isso no próprio texto." Manobras: "Criatura duas categorias de tamanho maior ... não é empurrada." Tamanho: seis categorias, alcance pelo tamanho.
- **Problema:** falta tipo de dano, atributo, margem de crítico e a perícia do ataque. "+2 dados" não diz de que dado. O empurrão de 3 m ignora a trava de tamanho. Em Montanha Espectral, ficar "do tamanho de uma criatura Enorme" não diz o que muda (espaço, alcance, equipamento).
- **Correção:** `punho-espectral`: "...com dano 1d8 de impacto + Mod. Força, crítico 20/x2, usando Luta." `punho-pesado`: "...causa +4d6 de dano e empurra o alvo 3 m (criatura duas categorias maior que você não é empurrada)." `montanha-espectral`: "...o seu Punho Espectral causa +2d8 de dano, e você ocupa o espaço e o alcance de uma criatura Enorme."
- **Decisão do Pedro?** não

### [LACUNA] ceder-o-passo, todos-antes-de-mim (Anjo da Humildade) · descricao
- **Hoje:** `ceder-o-passo`: "você sofre metade desse dano no lugar dele, e ele não sofre nada". `todos-antes-de-mim`: "todo dano ... é reduzido a zero, e você sofre metade dele".
- **Livro:** Tipos de dano › Resistência e ordem de aplicação: vulnerabilidade, depois Resistência e redução, "até o mínimo 0". Dano verdadeiro só quando o texto diz.
- **Problema:** não diz se a metade que você leva tem o tipo original e se as suas Resistências e vulnerabilidades valem. O segundo poder soma o dano de todos os aliados por 3 rodadas sobre uma pessoa só, sem teto, o que pode matar o Anjo na hora (e não vale "Ficar com 1 de Vida").
- **Correção:** "...você sofre metade desse dano, do mesmo tipo, e as suas Resistências e vulnerabilidades valem. Em `todos-antes-de-mim`, o que você sofre por rodada não passa da sua Vida máxima."
- **Decisão do Pedro?** sim, porque é teto de dano novo.

### [LACUNA] trono-proprio (Demônio da Soberba, 60), eterno e semelhantes · descricao
- **Hoje:** "você é imune a todas as condições e recebe +10 em tudo o que fizer sem auxílio."
- **Livro:** Condições: a lista inclui Inconsciente, Concentrando, as benéficas (Apressado, Resguardado, Revigorado) e Ferido (Ferimentos).
- **Problema:** "todas as condições" inclui as que o personagem quer (Concentrando, benéficas) e a Inconsciente de quem cai a 0 de Vida. Fica ambíguo se ele não cai.
- **Correção:** "...imune a todas as condições de efeito negativo (as da lista de Condições gerais, menos Concentrando)." Ou limitar às "condições leves, médias e graves do Livro".
- **Decisão do Pedro?** sim

### [LACUNA] aprender-a-forca (Demônio da Inveja, 28) · descricao
- **Hoje:** "escolha uma criatura a até 9 m que usou uma característica nesta cena. Você a usa uma vez, sem custo, como se fosse sua."
- **Livro:** Poderes e Habilidades: uma vez por cena etc. Comparar com `roubo-de-poder` (nível 40), que só copia "de nível ou círculo até o 5º".
- **Problema:** o nível 28 não tem o teto do 40 e pode copiar qualquer característica de uma criatura de nível alto.
- **Correção:** "...Você a usa uma vez, sem custo, como se fosse sua, mas só se for de nível ou círculo até o 3º."
- **Decisão do Pedro?** sim, porque o teto é número novo.

### [LACUNA] natureza natural e o Fluxo do Fim · descricao_variantes / marca vermelho-vinho
- **Hoje:** `descricao_variantes`: "Os onze têm o mesmo peso", sem restrição; marca "Fim" listada como escolha comum.
- **Livro:** Magia e Fluxo: "Fluxo do Fim: raro, e precisa de autorização do Mestre antes de ser escolhido."
- **Problema:** a raça já exige liberação do Mestre para existir, mas não diz que o Fim exige mais uma. O Espírito é a raça em que o Fluxo é o "nativo" em qualquer Árvore, então o Fim vira escolha livre ao criar.
- **Correção:** acrescentar em `descricao_variantes`: "O Fim, por ser raro, também pede o aval do Mestre na hora de escolher."
- **Decisão do Pedro?** não

### [MELHORIA] passo-curto (Espírito do Espaço, 1) e travessia-ampliada (Maior, 15) · descricao
- **Hoje:** `passo-curto`: Passagem Etérea "atravessa até 3 m em vez de 1,5 m". `travessia-ampliada`: "atravessa até 3 m de material sólido e vale duas vezes por cena."
- **Livro:** (consistência interna.)
- **Problema:** no Maior, o ganho do Espaço some: os 3 m viram o valor-base de todo Espírito natural.
- **Correção:** `passo-curto`: "Sua Passagem Etérea atravessa 1,5 m a mais do que a dos outros espíritos." (o que mantém +1,5 m em todo degrau).
- **Decisão do Pedro?** sim, porque mexe no número da marca.

### [MELHORIA] verdade-nua, nome-verdadeiro (Espírito da Essência) · descricao
- **Hoje:** "perde disfarces, formas alternativas e ilusões sobre si"; "toda ilusão, disfarce, forma alternativa e invisibilidade deixa de funcionar".
- **Livro:** Condições › Revelado: "Perde disfarce, transformação e invisibilidade de origem mágica enquanto durar. Não pode se esconder, e ataques contra ele ignoram cobertura criada por ilusão."
- **Problema:** o Livro já tem a condição para isso.
- **Correção:** `nome-verdadeiro`: "Ela fica Revelada até o fim da cena e com desvantagem em testes contra você." `verdade-nua`: "...num raio de 18 m, toda criatura hostil fica Revelada, e tem desvantagem em testes de resistência contra você."
- **Decisão do Pedro?** não

### [MELHORIA] vazio, fonte-do-fluxo, sorvedouro, invisivel-ao-vazio · descricao
- **Hoje:** "ficar Invisível até o fim do seu próximo turno. Atacar, conjurar ou mover qualquer objeto quebra a invisibilidade na hora." `fonte-da-cor`: "incorpórea, invisível ou fora de fase".
- **Livro:** Condições benéficas › Invisível: "Termina ... quando a fonte disser que acaba, como ao atacar."
- **Problema:** só a grafia. A condição é Invisível (maiúscula) e Incorpóreo (maiúscula).
- **Correção:** `fonte-da-cor`: "qualquer criatura Incorpórea, Invisível ou fora de fase".
- **Decisão do Pedro?** não

### [MELHORIA] dobra-maior (Espírito do Espaço, 60) · descricao
- **Hoje:** "atravessam juntos para qualquer lugar da mesma Árvore que você conheça."
- **Livro:** Magia e Fluxo › Termos: "Fronteira selada ... Teleporte, portal e dobra não atravessam." "Lugar conhecido: um ponto que você já visitou em pessoa."
- **Problema:** não menciona a fronteira selada nem define "conheça".
- **Correção:** "...para qualquer lugar conhecido da mesma Árvore (um ponto que você visitou em pessoa). Fronteira selada não atravessa."
- **Decisão do Pedro?** não

### [MELHORIA] equilibrio (Anjo da Moderação, 28) · descricao
- **Hoje:** "todos os bônus temporários e vantagens dela acabam, e todas as penalidades e desvantagens também."
- **Livro:** Perícias › Vantagem do grau: do Veterano em diante o próprio grau conta como fonte de vantagem. Condições benéficas e Resistências são permanentes ou de fonte.
- **Problema:** "vantagens dela" pode incluir a vantagem do grau Veterano ou uma Resistência racial, e "acabam" não diz até quando.
- **Correção:** "Falhando, as condições benéficas e as penalidades de efeitos em andamento sobre ela acabam, e ela não recebe vantagem nem desvantagem de efeito no próximo teste. Graus de perícia, Resistências e itens não mudam."
- **Decisão do Pedro?** sim, porque redefine o escopo.

### [MELHORIA] possessao, encarnacao, encarnacao-pratica · descricao
- **Hoje:** `possessao`: "Quem não aceitou repete o teste no fim de cada turno seu, e um sucesso expulsa você na hora." `promessa-doce`, `vicio-irresistivel`: "repete o teste no fim de cada turno dela".
- **Livro:** Convenções da magia: "controle tem teste repetido". Condições: Paralisado, Amedrontado repetem "no fim de cada turno" de quem sofre.
- **Problema:** em Possessão o teste repetido é no turno do possessor; nos outros controles é no turno da vítima. Inconsistente.
- **Correção:** `possessao`: "Quem não aceitou repete o teste no fim de cada turno dele..." 
- **Decisão do Pedro?** não

### [MELHORIA] ataque de "gaste uma ação" · tipo
- **Hoje:** 100 ou mais traços dizem "gaste uma ação" e `tipo: "acao"`.
- **Livro:** Poderes e Habilidades: "Toda habilidade e todo poder dizem que ação pedem, numa destas sete... Sem isso escrito, ele é uma Ação Padrão."
- **Problema:** não é erro (a convenção "Poder com custo ... sem isso escrito é Ação Padrão" cobre), mas o texto fala "ação" e a regra tem sete nomes.
- **Correção:** onde couber, "gaste uma Ação Padrão". Nenhuma alteração obrigatória.
- **Decisão do Pedro?** não

### [LACUNA] dt do teste e `dt_efeitos` · dt_efeitos
- **Hoje:** `dt_efeitos`: pericia "misticismo", "role na hora ... uma rolagem vale para todos os alvos daquele uso".
- **Livro:** Raças: "você rola a perícia da raça na hora ... e o resultado é a DT."
- **Problema:** nada errado. O texto está igual ao Livro. Anotado só para registro. Os traços que usam `teste: misticismo_vs_vontade` e `misticismo_vs_reflexos`/`fortitude` seguem o padrão.
- **Decisão do Pedro?** não

## Catálogo de Símbolos (Pecados e Virtudes)

### [ERRO] pecado-preguica · onus
- **Hoje:** "Desvantagem em Iniciativa."
- **Livro:** Combate › Iniciativa: "não se rola".
- **Problema:** vantagem e desvantagem só valem em d20.
- **Correção:** "−3 de Iniciativa."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] pecado-preguica · bonus
- **Hoje:** "Uma vez por dia, ignore uma consequência por ter demorado a agir."
- **Livro:** Poderes e Habilidades › limite de uso: por rodada, turno, cena, descanso ou sessão. "Por dia" não existe.
- **Correção:** "Uma vez por descanso, ignore uma consequência por ter demorado a agir."
- **Decisão do Pedro?** não

### [LACUNA] pecado-preguica · bonus
- **Hoje:** "Descanso completo devolve Vida e Mana em dobro."
- **Livro:** Descanso: Péssima 10%, Ruim 25%, Boa 50%, Maravilhosa 75%, Excelente 100%, para Vida, Mana e Estamina.
- **Problema:** "em dobro" faz Boa devolver 100% e Maravilhosa passar do máximo. Estamina e Sanidade ficam de fora sem dizer.
- **Correção:** "Descanso completo devolve Vida, Mana e Estamina em dobro da porcentagem da qualidade, até o máximo."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] pecado-gula · onus
- **Hoje:** "Um dia sem comer o suficiente te dá 2 Cansaço, não 1."
- **Livro:** Perigos › Fome e sede: "você aguenta 3 + Mod.Constituição dias (mínimo 1) sem efeito. Depois disso, 1 de Cansaço no fim de cada dia sem comer."
- **Problema:** o Livro dá dias de folga e só então 1 de Cansaço. Falar "não 1" é impreciso.
- **Correção:** "Cada dia sem comer o suficiente te dá 2 de Cansaço, sem os dias de folga do Livro."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] demonio-gula · estomago-sem-fundo · descricao
- **Hoje:** "Um dia sem devorar nada rende 1 de Cansaço."
- **Livro:** Perigos › Fome e sede: 3 + Mod.Constituição dias de folga.
- **Problema:** mesmo ponto: bate em regra geral com outro número. Se o Pedro quer manter, é penalidade própria.
- **Correção:** "Um dia sem devorar nada rende 1 de Cansaço, sem os dias de folga do Livro."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] pecado-ira · bonus
- **Hoje:** "+3 em Iniciativa e imunidade a medo."
- **Livro:** Condições: **Amedrontado** é a condição de medo. `pecado-soberba` já usa "imune a Amedrontado".
- **Correção:** "+3 em Iniciativa e imune a Amedrontado."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] testes de perícia com nomes que o Livro não tem · pecado-avareza, pecado-luxuria, pecado-inveja, virtude-humildade, virtude-castidade, virtude-caridade, virtude-gratidao · bonus e onus
- **Hoje:** "testes de negociação, avaliação", "persuasão, sedução e leitura de intenção", "imitar, falsificar", "testes de intimidação", "testes sociais".
- **Livro:** Perícias › Catálogo: Diplomacia, Enganação, Intimidação, Intuição, Jogatina, Atuação. "Persuasão", "negociação" e "avaliação" não são perícias.
- **Problema:** o jogador não sabe qual perícia rolar.
- **Correção:** `pecado-avareza`: "+5 em Diplomacia para negociar e para avaliar o valor de um objeto." `pecado-luxuria`: "+5 em Diplomacia, Enganação e Intuição para seduzir, convencer e ler intenção." `pecado-inveja`: "+3 em Enganação para imitar e se passar por outra pessoa." `virtude-humildade`: "Desvantagem em Intimidação."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] pecado-inveja · onus
- **Hoje:** "Desvantagem em qualquer teste feito para ajudar outra pessoa."
- **Livro:** Ações coletivas › Ajudar: "O ajudante não rola nada."
- **Problema:** Ajudar não tem teste.
- **Correção:** "Você não pode Ajudar outra pessoa."
- **Decisão do Pedro?** sim, porque a restrição fica maior.

### [INCOERÊNCIA] pecado-soberba, virtude-humildade · bonus/onus
- **Hoje:** `pecado-soberba`: "todo bônus de ajuda alheia vira zero". `virtude-humildade`: "Auxílio que você recebe concede +4 em vez de +2. Auxílio que você presta também concede +4."
- **Livro:** Ajudar: "+2 por ajudante, até +4"; Perícias: Ajudar (+4) mantém limite próprio.
- **Problema:** "Auxílio" não é a palavra do Livro; os dois +4 não dizem se contam no limite de +4.
- **Correção:** "Quando você recebe Ajuda, cada ajudante dá +4 em vez de +2, e o total de Ajudar continua em +4." / "Quando você Ajuda, a sua Ajuda dá +4 em vez de +2."
- **Decisão do Pedro?** não

### [LACUNA] pecado-inveja · onus, dano mental
- **Hoje:** "você sofre 1d6 de dano mental."
- **Livro:** Tipos de dano › Mental: "tira Sanidade ... e Mana quando ataca diretamente o canal mágico". Condições › Sanidade: 1d4, 1d6, 1d8 ou 2d6.
- **Problema:** dano mental precisa dizer o que perde. Acontece também em `roubo-de-poder` e `voto-inquebravel` (Espírito).
- **Correção:** "você perde 1d6 de Sanidade." (idem `2d6 de dano mental` → "2d6 de Sanidade").
- **Decisão do Pedro?** não

### [LACUNA] pecado-luxuria · bonus
- **Hoje:** "quem falhar em Vontade contra você age com desvantagem contra você naquela rodada."
- **Livro:** Raças: DT de raça vem de `dt_efeitos` (Misticismo no Espírito).
- **Problema:** falta a DT e se é Ação, Reação ou passiva.
- **Correção:** "Uma vez por cena, como Ação Padrão, escolha uma criatura que veja você a até 9 m: ela testa Vontade contra a DT de Espírito. Falhando, age com desvantagem contra você até o fim da próxima rodada."
- **Decisão do Pedro?** sim

### [LACUNA] virtude-temperanca · bonus
- **Hoje:** "Você fica imune a veneno, doença e a qualquer excesso."
- **Livro:** Aflições › Imunidades: "Use a extensão exata da característica racial."
- **Problema:** "a qualquer excesso" não tem extensão (vício? embriaguez? dano?).
- **Correção:** "Você fica imune a venenos, doenças e vícios (aflições) e a embriaguez." Ou tirar "a qualquer excesso".
- **Decisão do Pedro?** sim, porque decide a extensão.

### [LACUNA] virtude-paciencia · onus
- **Hoje:** "Você age por último na primeira rodada de todo combate."
- **Livro:** Combate › Iniciativa: número fixo da ficha, Surpreendido: −5 na primeira rodada.
- **Problema:** não diz se muda a sua posição para o resto do combate. Compare `esperar-a-hora`.
- **Correção:** "Na primeira rodada de todo combate, você age por último; depois a sua posição volta à da Iniciativa."
- **Decisão do Pedro?** não

### [LACUNA] virtude-diligencia · bonus
- **Hoje:** "+6 m de deslocamento e uma ação de movimento adicional por turno."
- **Livro:** Sistema Base: Movimento 9 m + ajustes. Apressado: Movimento +3 m, Iniciativa +2.
- **Problema:** não é erro. +6 m e uma Ação de Movimento extra permanente é o dobro do Apressado. Ver `mundo-em-pressa` (mesmo efeito por 3 rodadas, custa Mana) e `passo-ligeiro`.
- **Decisão do Pedro?** sim, porque é decisão de balanço (não fere regra escrita).

## Padrões que se repetem

- **Janela errada no campo:** 60 traços com "por descanso" no texto e `recuperacao: sessao` (primeiro achado). Corrigir em lote.
- **Iniciativa tratada como rolagem:** `adiantar-se`, `voz-do-jardim`, `mundo-em-pressa`, `mundo-em-camera-lenta`, `pecado-preguica`. Em todo o jogo o certo é "+X ou −X de Iniciativa".
- **Condições em minúscula:** "cega e surda", "cegas", "inconsciente", "incorpórea", "invisível". O Livro usa Cego, Surdo, Atordoado, Incorpóreo, Invisível, Fascinado.
- **Dano mental sem dizer o que perde:** `pecado-inveja`, `roubo-de-poder`, `voto-inquebravel`. Deve dizer Sanidade (ou Mana).
- **Dano sem tipo e sem teste:** `presagio-do-fim`, `ceifa`, `troca-de-vidas`, `eclipse`, `corpo-em-brasa`. Os que já têm teste (`labareda-infernal`, `chuva-do-inferno`, `banquete-final`, `fome-que-devora-o-mundo`) estão corretos.
- **"Dano físico comum":** termo que o Livro não tem (ver achado acima).
- **Ajudar com teste:** `olho-comprido`, `pecado-inveja`. Ajudar não rola.
- **"Aflição de nível":** o Livro diz estágio.
- **Tipos de dano em minúscula:** "dano de fogo", "dano de raio" (Livro: Fogo, Raio). Só grafia.
- **Termo "auxílio":** o Livro chama de Ajuda/Ajudar; aparece em várias marcas Demônio/Anjo e nos Pecados/Virtudes.
- **Voltar da morte sem preço:** `origem-de-tudo`, Âncora, Raiz, Voto, `primeira-alma`, os Eterno.

## Conferido sem problema

- **Espírito (raça):** Vida −2, Mana +3, Movimento 0, `legados_adicionais` 1, Provação, escada de seis degraus e níveis 1/8/15/28/40/60 batem com o Livro (Raças e `descricao`). `dt_efeitos` com Misticismo está igual ao Livro. Idiomas (Anemir, Kharum, Aurelim) coerentes com a descrição. Tom do texto: sem travessão, sem "eco", sem "não é X, é Y".
- **Estágios:** valores de Vida/Mana dos degraus coerentes entre as três Naturezas. Calor do Corpo (Vida temporária 10 por cena) segue a regra de Vida temporária. Brasa Viva (+1d6 de Fogo por ataque) respeita a regra de que fogo cai uma vez.
- **Marcas:** custos, alcances e testes (`misticismo_vs_vontade`, `misticismo_vs_reflexos`, `misticismo_vs_fortitude`) conferem entre texto e campos. Os 3 traços "por sessão" de informação (`voz-que-atravessa`, `fantasma-na-rede`, `dobra-maior`) estão na janela certa. Fonte do Fluxo/Pecado/Virtude e Dobra do Fluxo estão coerentes com as 11 marcas e com o Fluxo Universal (Branco).
- **Catálogo Pecados e Virtudes:** os 14 Símbolos têm par oposto correto (id de um aponta para o outro), sete e sete, e o texto de regras (sete participantes, sem repetição) bate com o formato. Os bônus de Gula, Ganância, Soberba e Castidade não ferem regra escrita além dos pontos listados acima.
