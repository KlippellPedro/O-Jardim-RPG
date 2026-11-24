# Relatório do grupo B: Animália, Divino, Elfo

Fonte: racas/animalia.json, divino.json, elfo.json e regras/ (núcleo, legados, racas). Ordem: Divino, Elfo, Animália.

## Divino (divino)

### [ERRO] furia-sagrada · janela "por combate"
- **Hoje:** Fúria Sagrada: "vantagem no primeiro teste de ataque que fizer em cada combate, e o primeiro acerto de cada combate causa 1d6 de dano extra."
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: "Por cena: volta quando a cena acaba. Um combate inteiro é uma cena."
- **Problema:** "Por combate" não existe. O limite é por cena.
- **Correção:** "Receba vantagem no primeiro teste de ataque que fizer em cada cena, e o primeiro acerto de cada cena causa 1d6 de dano extra."
- **Decisão do Pedro?** não

### [ERRO] obra-do-nada, volta-aqui, nome-de-batalha, parar-o-coracao, mundo-selvagem, dia-sem-fim, senhor-da-tempestade, barganha-divina, forma-divina · recuperacao
- **Hoje:** texto diz "Duas vezes por descanso" (ou "Uma vez por descanso"), mas o campo traz `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso: "Por descanso: volta no descanso completo... Por sessão: fica para o que é de história, informação, dinheiro e sorte. Poder de combate volta no descanso."
- **Problema:** campo contra texto. O botão da ficha zera o uso na janela errada (Nova sessão em vez de Descansei). O valor `descanso` já existe em outras raças.
- **Correção:** trocar `recuperacao` para `"descanso"` nesses nove traços. Obra do Nada (construção) pode ficar "por sessão" se o Pedro preferir tratá-la como efeito de história, mas aí o texto deve dizer "Duas vezes por sessão".
- **Decisão do Pedro?** não (só Obra do Nada, se ele quiser por sessão: sim)

### [INCOERÊNCIA] volta-aqui · descricao
- **Hoje:** "...trazê-lo de volta com um quarto da Vida máxima e Ferido +2. A mesma criatura só volta assim uma vez."
- **Livro:** Ferimentos › Voltar da morte: "quem volta ganha Ferido 2 e 2 de Cansaço, e Arkarin fica com alguma coisa. O jogador e o Mestre escolhem juntos uma lembrança, um laço ou uma condição de longo prazo."
- **Problema:** faltam os 2 de Cansaço e o preço de Arkarin. "Ferido +2" também foge da grafia do Livro (Ferido 2).
- **Correção:** "Duas vezes por descanso, gaste uma Ação Completa e 10 Mana para tocar um aliado que morreu nesta cena e trazê-lo de volta com um quarto da Vida máxima, Ferido 2 e 2 de Cansaço. Arkarin fica com uma lembrança, um laço ou uma condição de longo prazo, escolhida pelo jogador e pelo Mestre. A mesma criatura só volta assim uma vez."
- **Decisão do Pedro?** sim, porque o Pedro pode ter pensado o Domínio da Vida como exceção barata; o Livro diz que voltar é "raro e caro".

### [INCOERÊNCIA] folego-para-todos · descricao
- **Hoje:** "...tirar de cada um deles uma condição de veneno, doença ou sangramento."
- **Livro:** Condições › Condição ou aflição?: veneno e doença são aflições; Aflições › Tratamento: "Cura reduz 1 estágio por sucesso". Sangramento e Envenenado são condições.
- **Problema:** "condição de veneno, doença" mistura os dois sistemas. Aflição não "sai", ela perde estágio.
- **Correção:** "...curar 2d6 + Mod.Carisma de Vida em cada aliado a até 9 m e, em cada um, encerrar Sangramento ou Envenenado, ou reduzir em 1 estágio uma aflição de veneno ou doença."
- **Decisão do Pedro?** não

### [LACUNA] sol-nas-maos · dano
- **Hoje:** "Ela sofre 6d6 de dano e fica Cega até o fim do próximo turno..." (campo `"dano": "6d6"`).
- **Livro:** Tipos de Dano: "Resistência... sempre apontam para uma entrada específica, nunca para 'dano' de forma genérica."
- **Problema:** sem tipo de dano. O Domínio da Luz fala em Luz, que é elemento.
- **Correção:** "Ela sofre 6d6 de dano de Luz e fica Cega até o fim do próximo turno se falhar..." e `"dano": "6d6 de Luz"`.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] raio-divino, ceu-em-furia, senhor-da-tempestade, terra-viva · tipo de dano em minúscula
- **Hoje:** "3d6 de dano de raio", "5d6 de dano de raio" (Terra Viva já usa "dano de Terra").
- **Livro:** Tipos de Dano › Dano elemental: os sete elementos têm nome próprio (Raio, Terra). Condições: "1d6 de dano de Fogo".
- **Problema:** grafia fora do Livro e fora do resto do mesmo arquivo.
- **Correção:** "dano de Raio" (e `"dano": "3d6 de Raio"`, `"5d6 de Raio"`).
- **Decisão do Pedro?** não

### [INCOERÊNCIA] nome-de-batalha, dia-sem-fim · termo "medo"
- **Hoje:** "imunidade a medo" / "não podem ficar com medo".
- **Livro:** Condições › Condições gerais: a condição se chama Amedrontado.
- **Problema:** termo que o Livro não usa. Sem o nome da condição, o Livro (e o link de termos) não reconhece.
- **Correção:** Nome de Batalha: "...+2 de Defesa, vantagem em ataque e imunidade à condição Amedrontado." Dia sem Fim: "...recebem +2 de Defesa e não podem ficar Amedrontados."
- **Decisão do Pedro?** não

### [LACUNA] barganha-divina (Acordo Divino) · controle sem teste repetido
- **Hoje:** "Se falhar, aceita e cumpre o acordo por uma cena, desde que você não mande ela morrer nem trair quem mais ama."
- **Livro:** Núcleo › regra geral de controle (convenções da magia valem para raça): "controle tem teste repetido". Condições: Fascinado termina "ao sofrer dano ou quando alguém ameaça de forma clara a criatura".
- **Problema:** efeito de comando que dura uma cena inteira sem nova chance de escapar e sem condição de saída. Uma única falha de Vontade prende o alvo para a cena toda.
- **Correção:** "...Se falhar, aceita o acordo e o cumpre até o fim da cena, desde que você não mande ela morrer nem trair quem mais ama. No fim de cada turno dela, ela repete a Vontade contra a mesma DT e, passando, o acordo se desfaz. Sofrer dano também o desfaz."
- **Decisão do Pedro?** sim, porque muda o quanto o poder de nível 48 é confiável.

### [LACUNA] toque-frio · efeito extra ignora o teste
- **Hoje:** "...e não pode recuperar Vida até o começo do seu próximo turno. Fortitude contra a sua DT de Divino reduz o dano pela metade."
- **Livro:** Magia e Fluxo › Ataque e resistência: "Se a magia causa dano, quem resistir sofre metade e evita o efeito extra."
- **Problema:** o texto só diz que o teste reduz o dano. Fica ambíguo se o bloqueio de cura vale mesmo com sucesso.
- **Correção:** "...Fortitude contra a sua DT de Divino: quem passar sofre metade do dano e não perde a cura."
- **Decisão do Pedro?** não

### [LACUNA] raizes-que-prendem · duração e saída
- **Hoje:** "Se falhar, fica Imobilizada até gastar uma ação e passar no mesmo teste."
- **Livro:** Condições › Imobilizado: "Ação Padrão e o teste que a fonte indicar". Condição de fonte instantânea sem duração vai até o fim do próximo turno de quem a recebeu.
- **Problema:** a saída existe, mas "uma ação" não é uma das sete ações, e não há limite de tempo (a raiz pode durar a cena toda, com custo de 3 Mana no nível 1).
- **Correção:** "...Se falhar, fica Imobilizada até o fim da cena. Para sair, gasta uma Ação Padrão e passa no mesmo teste."
- **Decisão do Pedro?** sim, porque "até o fim da cena" é a leitura atual literal; se ele quiser algo mais curto, escrever "até o fim do próximo turno dela".

### [LACUNA] investida-do-deus · derrubar sem trava de tamanho
- **Hoje:** "Se os dois ataques acertarem o mesmo alvo, ele fica Caído."
- **Livro:** Combate › Manobras: "Criatura duas categorias de tamanho maior que você não é... derrubada... sem uma regra que autorize." Núcleo (regra 15): derrubar respeita a trava de duas categorias.
- **Problema:** o texto não cita a trava e parece autorizar. Hoje vale a trava geral, mas fica ambíguo.
- **Correção:** acrescentar "Criatura duas categorias de tamanho maior que você não cai."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] luz-que-revela · invisibilidade e disfarce
- **Hoje:** "Dentro da luz, invisibilidade e disfarces mágicos deixam de esconder criaturas..."
- **Livro:** Condições › Revelado: "Perde disfarce, transformação e invisibilidade de origem mágica enquanto durar. Não pode se esconder."
- **Problema:** o efeito já existe como condição. A frase solta deixa de fora o "não pode se esconder" e não diz a duração.
- **Correção:** "...para iluminar 9 m ao seu redor por três rodadas. Quem estiver Invisível ou disfarçado por magia dentro da luz fica Revelado enquanto estiver nela, e seus aliados têm vantagem para resistir a ilusões."
- **Decisão do Pedro?** não

### [LACUNA] bencao-de-sangue · uso extra ou o mesmo uso
- **Hoje:** "Uma vez por sessão, use a Bênção Concedida sem gastar Mana."
- **Livro:** Poderes e Habilidades › limite de uso: o limite do poder é o que está escrito nele; Bênção Concedida tem `usos: 1` por sessão.
- **Problema:** não está claro se o Semideus tem 1 uso por sessão (que passa a custar 0 Mana) ou 2 (um grátis e um pago).
- **Correção:** "Uma vez por sessão, a Bênção Concedida do Semideus não custa Mana. Esse é um uso a mais além do que a Bênção já dá." (ou "...não é um uso a mais, só o mesmo uso sem custo").
- **Decisão do Pedro?** sim, porque são duas leituras com força diferente.

### [LACUNA] regra_fe · redução de custo repetida
- **Hoje:** Fé conhecida e Grande culto: "Uma vez por cena, reduza em 2 (ou 3) o custo de Mana de um poder do seu Domínio"; Domínio Desperto (estágio 18): "Uma vez por cena, reduza em 2... use apenas a maior redução."
- **Livro:** Perícias › Rolar de novo e somar bônus: "Bônus de fontes diferentes somam, sem teto geral. Quem tem limite próprio continua com ele."
- **Problema:** a cláusula "use apenas a maior redução" está só no estágio. Um Deus com 100 a 999 fiéis e nível 18 tem duas fontes iguais de −2 e uma delas não faz nada. Sem a cláusula nos patamares de fé, a leitura da regra geral seria somar.
- **Correção:** repetir nos patamares: "Se outro efeito também reduzir esse custo, use apenas a maior redução." E o Pedro decide se é isso mesmo ou se as duas reduções somam (então o estágio perde a cláusula).
- **Decisão do Pedro?** sim, porque é escolha de regra (somar ou só a maior).

### [MELHORIA] todos os traços de Domínio, estágio e Deus · "gaste uma ação"
- **Hoje:** "gaste uma ação e 3 Mana", "gaste uma ação completa e 9 Mana" (tipo `acao` no campo).
- **Livro:** Poderes e Habilidades: "numa destas sete: Passivo, Ação Livre, Ação de Movimento, Ação Padrão, Ação Completa, Reação ou Fora de combate" e "Sem isso escrito, ele é uma Ação Padrão."
- **Problema:** "uma ação" não é nenhuma das sete. O campo `tipo: acao` resolve na ficha, mas o texto do jogador fica solto. "ação completa" também está em minúscula.
- **Correção:** trocar "gaste uma ação" por "gaste uma Ação Padrão" e "ação completa" por "Ação Completa" em todos os traços. O Senhor da Tempestade ("sem gastar ação, lance um raio") fica como "sem gastar ação".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] povo, fisiologia · "não adoece"
- **Hoje:** povo: "Não envelhece e não adoece". Fisiologia: "não pega doenças comuns. Ainda pode ser ferido, envenenado ou amaldiçoado."
- **Livro:** Aflições › Imunidades: "Use a extensão exata da característica racial... Outras fisiologias só recebem imunidade quando o próprio texto determinar."
- **Problema:** o texto de povo promete mais do que a fisiologia dá (doenças sobrenaturais, por exemplo, continuam valendo).
- **Correção:** povo: "Não envelhece e as doenças comuns não pegam nele, e vê os mortais em volta envelhecerem e partirem."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] estagios · degraus 18 e 48
- **Hoje:** Poder Desperto no 18, Forma Maior no 48.
- **Livro:** Núcleo (decisão já aplicada de outubro): "o degrau no 20 das especiais". Elfo, Amálgamo, Anomalia, Bruxa, Clone e Desperto usam 20 e 50 (ou só 20).
- **Problema:** o Divino foge do ritmo das outras especiais. Os poderes de Domínio também caem no 1/18/48.
- **Correção:** nenhuma sem decisão. Se for igualar: degraus 20 e 50 e `nivel_minimo` dos poderes 20 e 50.
- **Decisão do Pedro?** sim, porque pode ser de propósito (Auleth também usa 18 e 44).

## Elfo (elfo)

### [ERRO] floresta-desperta, inverno-que-nao-passa, noite-sobre-o-dia, tormenta-sobre-o-campo · recuperacao
- **Hoje:** "Duas vezes por descanso", mas `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades › limite de uso: "Por descanso: volta no descanso completo... Poder de combate volta no descanso."
- **Problema:** campo contra texto, nos quatro traços de nível 50. A ficha zera na janela errada.
- **Correção:** `"recuperacao": "descanso"` nos quatro. Faltam também `duracao_rodadas: 5` em Floresta Desperta, Noite sobre o Dia e Tormenta sobre o Campo (o texto diz cinco rodadas).
- **Decisão do Pedro?** não

### [INCOERÊNCIA] raizes-aprisionadoras, sepulcro-glacial, avatar-das-chamas, reinado-da-noite, olho-da-tempestade · quem rola e contra o quê
- **Hoje:** "Faça um teste de Misticismo e compare com os Reflexos de cada inimigo" / "teste de Misticismo contra a Fortitude dela" / "compare com a Vontade de cada inimigo". Em Floresta Desperta e Tormenta: "testa Reflexos contra o seu Misticismo".
- **Livro:** Raças e dt_efeitos: "role na hora... O resultado é a DT que a criatura precisa alcançar". Combate › Defesas passivas: "sem pedir rolagem, use 10 + bônus total".
- **Problema:** duas formas no mesmo arquivo. "Compare com os Reflexos" não diz se o alvo rola ou se vale 10 + Reflexos. Na leitura de DT de raça, o alvo rola.
- **Correção:** padronizar: "Role Misticismo na hora (essa é a DT de Elfo). Cada inimigo escolhido na área testa Reflexos contra ela." (Fortitude em Sepulcro Glacial, Vontade em Reinado da Noite, Reflexos em Avatar e Olho). E o campo `teste` ("misticismo_vs_reflexos") continua como está.
- **Decisão do Pedro?** não

### [MELHORIA] domínio-verdejante, sepulcro-glacial, avatar-das-chamas, reinado-da-noite, olho-da-tempestade · "gaste uma ação"
- **Hoje:** "gaste uma ação e 5 Mana"; Passo Umbral: "gaste seu Movimento"; Sepulcro: "gaste uma ação e superar..."; Véu: "como ação livre".
- **Livro:** Poderes e Habilidades: as sete ações (Ação Padrão, Ação de Movimento, Ação Livre, Ação Completa).
- **Problema:** nome da ação fora do Livro ou em minúscula.
- **Correção:** "gaste uma Ação Padrão", "gaste sua Ação de Movimento", "como Ação Livre", "Ação Completa".
- **Decisão do Pedro?** não

### [INCOERÊNCIA] sombra-viva, veu-sem-aurora · enxergar em escuridão sobrenatural
- **Hoje:** Sombra Viva: "enxerga normalmente através de escuridão natural ou sobrenatural". Véu sem Aurora: "através de qualquer escuridão".
- **Livro:** Combate › Ver e ser visto: "Escuridão criada por magia ou Fluxo só cede para quem a fonte disser."
- **Problema:** o traço decide sozinho sobre uma escuridão cuja fonte é outra criatura ou magia. Isso inclui o Reinado da Noite do próprio Elfo (e o Eclipse do Elementarista).
- **Correção:** Sombra Viva: "Você enxerga normalmente na escuridão natural. Na escuridão criada por magia ou Fluxo, só enxerga se a fonte permitir." Véu: igual, e a escuridão do Reinado da Noite continua cedendo a você pelo próprio texto dele.
- **Decisão do Pedro?** sim, porque enfraquece a Linhagem (Noite Eterna foi feita "mais forte de propósito").

### [INCOERÊNCIA] veu-sem-aurora · "cegueira ou medo"
- **Hoje:** "é imune a cegueira ou medo causados exclusivamente pela falta de luz."
- **Livro:** Condições: Cego e Amedrontado.
- **Problema:** termos sem o nome da condição.
- **Correção:** "é imune às condições Cego e Amedrontado quando causadas só pela falta de luz."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] reinado-da-noite · escuridão sem a condição Cego
- **Hoje:** "as demais enxergam somente a 1,5 m, sofrem desvantagem em Percepção baseada em visão e não podem realizar reações contra criaturas que não enxerguem."
- **Livro:** Combate › Ver e ser visto: "Escuridão | Quem não enxerga no escuro fica Cego para o que está nela."
- **Problema:** o texto cria um estado próprio onde o Livro já tem a condição Cego (desvantagem em testes de visão, +2 de ataque contra quem enxerga). A frase "não podem realizar reações" é nova e não vem de condição nenhuma.
- **Correção:** "...as demais ficam Cegas para o que estiver a mais de 1,5 m e não podem realizar reações contra criaturas que não enxerguem." (tirar a frase da desvantagem em Percepção, que o Cego já cobre).
- **Decisão do Pedro?** sim, porque o Pedro pode querer manter a visão curta de 1,5 m em vez de Cego puro.

### [INCOERÊNCIA] coracao-invernal, coracao-incandescente, sangue-da-tormenta · "reduz pela metade o dano"
- **Hoje:** "reduz pela metade o dano causado diretamente por frio ou gelo" / "por fogo ou calor" / "o dano de raio e o dano de ar".
- **Livro:** Tipos de Dano › Resistência e ordem de aplicação: Resistência é um número por tipo, tirado depois da vulnerabilidade; "Resistências ao mesmo tipo vindas de fontes diferentes (raça, classe, item, magia) somam." Frio e Calor são dano de ambiente, Gelo e Fogo são golpe, "tipos diferentes".
- **Problema:** "pela metade" não é a Resistência do Livro. Não soma com Frutos, Trajes e outras raças, e "frio ou gelo" mistura dois tipos que o Livro separa. As outras raças usam "Resistência 2" a um tipo.
- **Correção:** trocar por Resistência numérica por tipo. Exemplo para Gelo: "Você tem Resistência 5 a Gelo." (a Resistência a Água, elemento base, já vale por inteiro contra o Gelo). Clima fica à parte (próximo achado). Mesma troca em Fogo (Resistência a Fogo) e em Tempestades (Raio e Ar).
- **Decisão do Pedro?** sim, porque é preciso escolher o número (o Livro não dá a escala de Resistência de Linhagem).

### [LACUNA] coracao-invernal, coracao-incandescente · graus do clima
- **Hoje:** "imune aos efeitos ambientais de frio extremo" / "de calor extremo".
- **Livro:** Perigos › Clima: graus Severo, Extremo e Mortal; "Raça ou traço que diga que não sente frio ou calor ignora o clima que o traço cobre."
- **Problema:** "frio extremo" coincide com o nome do grau Extremo. Não fica claro se o Mortal (dano de um quarto da Vida, sem teste) também é ignorado.
- **Correção:** "Você ignora o clima de Frio (Severo, Extremo e Mortal)." ou "...até o grau Extremo; o Mortal ainda cobra". Mesma troca para Calor.
- **Decisão do Pedro?** sim, porque define se o Elfo de Gelo ou de Fogo atravessa o Mortal.

### [INCOERÊNCIA] sepulcro-glacial · estado de "aprisionado"
- **Hoje:** "ela fica aprisionada no gelo até o final do próximo turno dela: seu Movimento vira 0, ela não pode realizar ações ou reações e reduz em 5 o dano de cada golpe que sofrer."
- **Livro:** Condições: Imobilizado (Movimento 0), Atordoado (sem ações nem reações, Defesa −5), Paralisado.
- **Problema:** é um estado inventado que parece Atordoado mais Imobilizado, com uma redução de dano que o Livro não dá a nenhuma dessas condições. Quem lê não sabe se a Defesa cai.
- **Correção:** "...ela fica Imobilizada e Atordoada até o final do próximo turno dela, mas o gelo reduz em 5 o dano de cada golpe que sofrer."
- **Decisão do Pedro?** sim, porque Atordoado tira 5 de Defesa e isso contraria a ideia de gelo protetor.

### [INCOERÊNCIA] raizes-aprisionadoras · "Movimento vira 0"
- **Hoje:** "Em falha, o Movimento da criatura vira 0 até o final do próximo turno dela."
- **Livro:** Condições › Imobilizado: "Movimento 0. Não pode usar ações que exijam deslocamento."
- **Problema:** é a condição Imobilizado sem o nome. Sem ela, não sobra regra de saída nem de interação.
- **Correção:** "Em falha, a criatura fica Imobilizada até o final do próximo turno dela."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] floresta-desperta · "agarrado" e saída
- **Hoje:** "fica Agarrada pela vegetação até se soltar com uma Ação Padrão e Atletismo contra a mesma DT. Quem já estiver agarrado sofre 5d6 de dano de impacto".
- **Livro:** Condições › Agarrado: saída "Ação padrão e Atletismo ou Acrobacia contra 10 + Luta de quem segura". Imobilizado: "o teste que a fonte indicar".
- **Problema:** a vegetação não tem Luta. A saída contra a DT do Misticismo é o texto de Imobilizado, não de Agarrado. "agarrado" também está em minúscula. "Área de 18 m" não diz se é raio (falta `raio_m`).
- **Correção:** "...fica Imobilizada pela vegetação até se soltar com uma Ação Padrão e Atletismo ou Acrobacia contra a mesma DT. Quem já estiver Imobilizado no início do seu turno sofre 5d6 de dano de impacto, ou metade se passar em Fortitude contra o seu Misticismo."
- **Decisão do Pedro?** sim, porque Agarrado ou Imobilizado muda a saída e o ataque contra o alvo.

### [INCOERÊNCIA] avatar-das-chamas · dano de contragolpe sem teste
- **Hoje:** "uma vez por turno, uma criatura que acertar você com um ataque corpo a corpo sofre 1d6 de dano de fogo."
- **Livro:** Núcleo (regra 14 do BRIEF): "dano em área ou de gatilho tem teste e metade no sucesso."
- **Problema:** dano de gatilho sem teste. "fogo" também está em minúscula (Fogo é elemento).
- **Correção:** "...uma vez por turno, uma criatura que acertar você com um ataque corpo a corpo testa Reflexos contra o seu Misticismo e sofre 1d6 de dano de Fogo, ou metade se passar."
- **Decisão do Pedro?** sim, porque o 1d6 é pequeno e ele pode preferir deixá-lo automático.

### [INCOERÊNCIA] memoria-inesgotavel · "como se tivesse tirado 20"
- **Hoje:** "Duas vezes por sessão, em vez de rerrolar, você reconhece a situação de séculos atrás e trata o d20 como se tivesse tirado 20."
- **Livro:** Perícias › Graus de resultado: "Sucesso crítico: o d20 mostra 20 natural." Combate › Críticos: "caiu na margem, é crítico."
- **Problema:** pode ser lido como 20 natural (crítico automático em ataque ou perícia) ou como 20 de valor, sem crítico. As "duas vezes" também não aparecem em `usos` (só o 10 das rerrolagens).
- **Correção:** "...e trata o d20 como um 20 que não é natural: o dado vale 20, mas não é crítico." (ou "como um 20 natural", se for essa a intenção). Escrever o limite de duas vezes também no campo.
- **Decisão do Pedro?** sim, porque a leitura crítica é muito mais forte.

### [LACUNA] memoria-milenar · regra de rolar de novo
- **Hoje:** "Ao gastar uma, rerrole o teste e use o novo resultado."
- **Livro:** Perícias › Rolar de novo: "um teste, ou um dado, nunca é rolado de novo duas vezes. Se duas fontes podem rolar de novo o mesmo teste, você escolhe uma."
- **Problema:** com 4 a 10 usos por sessão, o texto não impede gastar duas no mesmo teste. O Livro impede, mas o traço não diz.
- **Correção:** acrescentar "Um mesmo teste só pode ser rerrolado uma vez, por esta ou por qualquer outra fonte."
- **Decisão do Pedro?** não

### [LACUNA] manto-sem-fim · "ataques à distância"
- **Hoje:** "Enquanto estiver em penumbra ou escuridão, você não pode ser alvo de ataques à distância."
- **Livro:** Combate › Ver e ser visto: "Cobertura total... não pode ser alvo direto de ataque nem de efeito que pede alvo. Efeito em área que contorne o obstáculo ainda alcança."
- **Problema:** não diz se vale contra magia de ataque (que é ataque à distância pelo Livro) nem contra efeito em área.
- **Correção:** "...não pode ser alvo de ataques à distância, inclusive magia de ataque. Efeito em área ainda alcança você."
- **Decisão do Pedro?** sim, porque define se o Elfo de Sombras é imune a atiradores no nível 50.

### [MELHORIA] sepulcro-prolongado, avatar-das-chamas, olho-da-tempestade, sangue-da-tormenta, noite-sobre-o-dia · grafia dos tipos de dano e de "Círculo"
- **Hoje:** "dano de gelo", "dano de fogo", "dano de raio", "dano de ar", "luz mágica de até 5º Círculo".
- **Livro:** Tipos de Dano: Gelo é derivação de Água; Fogo, Raio e Ar são elementos com nome próprio. Magia e Fluxo escreve "5º círculo" em minúscula.
- **Problema:** grafia fora do Livro.
- **Correção:** "dano de Gelo", "dano de Fogo", "dano de Raio", "dano de Ar", "até 5º círculo".
- **Decisão do Pedro?** não

## Animália (animalia)

### [ERRO] instinto-agil · perícia errada para escalar
- **Hoje:** "...você tem vantagem em testes de Acrobacia para escalar ou se equilibrar."
- **Livro:** Perícias › Catálogo: "Atletismo | Realizar esforços físicos como correr, saltar, escalar..."; "Acrobacia | Manter o equilíbrio, amortecer quedas, atravessar espaços difíceis".
- **Problema:** escalar é Atletismo. Quem escala não rola Acrobacia, então metade da frase nunca se aplica.
- **Correção:** "Seu Movimento aumenta em 1,5 m, e você tem vantagem em Acrobacia para se equilibrar e em Atletismo para escalar."
- **Decisão do Pedro?** não

### [LACUNA] corpo-de-fera, corpo-dividido, arma_natural_dano · tipo de dano e crítico da arma natural
- **Hoje:** "A arma natural do bicho (mordida, garra, chifre) tem dano base 1d8." / "dano base 1d6". Cada animal traz só o nome (Garra, Mordida, Chute, Descarga, Toque...).
- **Livro:** Combate › Ataque desarmado: "1d4 de impacto + Mod. Força, com crítico 20/x2. Classe ou raça que der outro dano desarmado... diz isso no próprio texto." Tipos de Dano: Resistência sempre por tipo.
- **Problema:** não há tipo de dano nem diz se soma Mod. Força e se o crítico é 20/x2. Resistência de alvo (corte, perfuração, impacto) não tem onde se apoiar. Traços (sem arma natural) caem no 1d4 de impacto do Livro, o que está certo.
- **Correção:** acrescentar na Fera e no Híbrido: "O dano é 1d8 (ou 1d6) + Mod. Força, crítico 20/x2, e o tipo vem da arma: Garra e Pinça, corte; Mordida, Presa, Bico, Chifre, Ferrão, Esporão, Mandíbula e Tentáculo, perfuração; Chute, Coice, Casco, Cauda, Punho e Constrição, impacto; Descarga, Raio; Toque, veneno." (o Pedro ajusta a tabela de tipos). 
- **Decisão do Pedro?** sim, porque precisa fixar o tipo de dano de cada arma natural (Descarga e Toque, sobretudo).

### [INCOERÊNCIA] corpo-robusto · "vantagem para resistir" a empurrão e queda
- **Hoje:** "Receba vantagem para resistir a empurrões e quedas causados por outra criatura."
- **Livro:** Combate › Manobras: Empurrar e Derrubar são "contra 10 + Fortitude/Reflexos do alvo"; Defesas passivas: "sem pedir rolagem, use 10 + bônus total."
- **Problema:** contra manobra o alvo não rola, então a vantagem não tem onde entrar. "Quedas causados por outra criatura" também não usa o termo do Livro (Caído, Derrubar).
- **Correção:** "Receba +2 na Fortitude e nos Reflexos contra Empurrar e Derrubar, e vantagem nos testes que rolar para resistir a ser empurrado ou derrubado por um efeito." (o +2 é proposta).
- **Decisão do Pedro?** sim, porque exige escolher um número para a defesa passiva.

### [INCOERÊNCIA] bando · "vantagem em ações coletivas"
- **Hoje:** "Você tem vantagem em ações coletivas e recebe +1 nos ataques contra uma criatura que tenha um aliado seu adjacente."
- **Livro:** Ações Coletivas › Ajudar: "O ajudante não rola nada" e dá +2 por ajudante (até +4). Teste de Grupo: cada participante testa contra a mesma DT.
- **Problema:** Ajudar não tem rolagem, então "vantagem em ações coletivas" só faz sentido no Teste de Grupo. O texto não diz isso.
- **Correção:** "Você tem vantagem nos seus testes de Teste de Grupo, e o seu Ajudar vale +3 em vez de +2 (o limite de +4 do teste não muda). Você também recebe +1 nos ataques contra uma criatura que tenha um aliado seu adjacente."
- **Decisão do Pedro?** sim, porque o +3 no Ajudar é proposta nova de regra.

### [LACUNA] instinto-cacador · "criatura ferida"
- **Hoje:** "...rastrear um alvo ferido ou que já atacou, e seus ataques causam +1 de dano contra criatura ferida."
- **Livro:** Ferimentos e Condições: Ferido é uma condição (nível de Ferido de quem acordou de Morrendo).
- **Problema:** "ferido/ferida" em minúscula lê como a condição Ferido, que quase nenhum alvo de combate tem. A intenção parece ser "com menos que a Vida máxima".
- **Correção:** "...e seus ataques causam +1 de dano contra criatura que já perdeu Vida."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] peconha · não funciona em Traços
- **Hoje:** "Seus ataques naturais causam +1 de dano de veneno, e você recebe Resistência 2 contra veneno."
- **Livro:** Combate › Ataque desarmado (o corpo ataca com o dano que a raça diz); Condições › Envenenado (veneno cai uma vez e só repete se a fonte disser).
- **Problema:** a Forma Traços "não tem arma natural" (`sem_arma_natural: true`), então a metade ofensiva da Morfologia Peçonhenta não faz nada nessa Forma. Também não fica claro que o veneno cai uma vez e não vira Envenenado.
- **Correção:** "Seus ataques naturais (em Traços, seus ataques desarmados) causam +1 de dano de veneno, uma vez por golpe, sem deixar Envenenado, e você recebe Resistência 2 contra veneno."
- **Decisão do Pedro?** sim, porque estende a Peçonhenta a Traços.

### [INCOERÊNCIA] heranca-mitica · tipo de dano só para quatro dos doze animais
- **Hoje:** "Receba Resistência 2 contra o tipo de dano do seu animal mítico (fogo no dragão e na fênix, raio no grifo, luz no unicórnio)..."
- **Livro:** Tipos de Dano: Resistência vale por tipo; elementos têm nome próprio (Fogo, Raio, Luz).
- **Problema:** o texto só define quatro. Pégaso, Basilisco, Quimera, Mantícora, Cérbero, Hidra, Kraken e Esfinge ficam sem tipo, e a Resistência vira Resistência a nada. A grafia está em minúscula.
- **Correção:** "...(Fogo no dragão, na fênix, na quimera e no cérbero; Raio no grifo; Luz no unicórnio e na esfinge; Ar no pégaso; Água no kraken; veneno no basilisco, na mantícora e na hidra)". Para animal que o jogador escreva, o Mestre escolhe o tipo.
- **Decisão do Pedro?** sim, porque é escolha de lore e de Resistência (a lista é proposta).

### [INCOERÊNCIA] jiboia · morfologia Peçonhenta
- **Hoje:** `"morfologias": ["peconhenta","predadora"]`; descrição: "Não tem veneno e mata apertando a presa."
- **Livro:** Condições › Envenenado e Tipos de Dano: veneno é dano persistente próprio.
- **Problema:** a Jiboia ganha Peçonha (+1 de veneno e Resistência 2 a veneno) mesmo com a própria descrição dizendo que ela não tem veneno.
- **Correção:** `"morfologias": ["robusta","predadora"]` (a Constrição aperta, e Robusta é a Morfologia que mais combina com isso).
- **Decisão do Pedro?** não

### [INCOERÊNCIA] fisiologia, animais · tamanhos Minúsculo e Colossal
- **Hoje:** "O tamanho vem do animal escolhido: Pequeno, Normal, Grande ou Enorme." Rato, Formiga, Abelha, Vespa, Besouro, Mariposa, Gafanhoto, Beija-flor e Esquilo estão como Pequeno.
- **Livro:** Combate › Tamanho: seis categorias; Minúsculo: "Divide 1,5 m com outros. Precisa entrar no espaço do alvo. Exemplos: Rato, inseto"; Pequeno: "Goblim, Anão"; Colossal: "dragão ancião".
- **Problema:** pelo Livro, rato e inseto são Minúsculos, e a Animália só os traz como Pequenos (mesmo tamanho do Goblim). O limite de quatro categorias não está explicado.
- **Correção:** opção 1 (menos mexida): na fisiologia, "Animália jogável nunca é Minúsculo nem Colossal: bicho miúdo vira Pequeno e bicho gigante vira Enorme." Opção 2: marcar os insetos e o rato como Minúsculo e dar regra ao Minúsculo (jogador de espaço dividido).
- **Decisão do Pedro?** sim, porque Minúsculo como raça jogável muda espaço, alcance e manobras.

### [LACUNA] asas-e-voo-curto · ação, custo e queda
- **Hoje:** "Você não sofre dano de queda. Uma vez por cena, gaste 2 Mana para voar até o seu Movimento neste turno; ao terminar, precisa estar sobre uma superfície."
- **Livro:** Perigos › Queda: "Quem cai fica Caído", "Menos de 3 m não causa dano, mas quem cai sem querer fica Caído". Núcleo › Mana e Estamina: "Estamina paga o que o corpo faz... salto".
- **Problema:** (1) "sem dano de queda" não diz se ainda fica Caído; (2) o voo não diz a ação (é o próprio movimento, mas fica solto); (3) voar com as próprias asas é esforço do corpo, e a Mana é para o que é místico.
- **Correção:** "Você não sofre dano de queda e cai de pé. Uma vez por cena, como parte do seu movimento no turno, gaste 2 de Estamina para voar até o seu Movimento; ao terminar, precisa estar sobre uma superfície."
- **Decisão do Pedro?** sim, porque troca o custo de Mana para Estamina (a Alada tem Mana +1 e Estamina +2) e muda o campo `custo_mana`.

### [MELHORIA] morfologia alada · descrição maior que o traço
- **Hoje:** "Tem asas e voa. Águias, falcões, morcegos e papagaios."
- **Livro:** Distâncias e Perigos tratam o voo como poder próprio, com ação e duração.
- **Problema:** a descrição promete voo e o traço dá um voo por cena. Quem lê espera voar sempre.
- **Correção:** "Tem asas e dá saltos de voo curtos."
- **Decisão do Pedro?** não

### [MELHORIA] voz-da-fauna, presenca-alfa · animais e Adestramento
- **Hoje:** Presença Alfa: "Animais que não estejam sob ordem de outra criatura não atacam você, a menos que sejam provocados."
- **Livro:** Perícias › Adestramento: "Acalmar, treinar, conduzir e ensinar comandos a animais ou criaturas domesticáveis."
- **Problema:** não diz se vale para animais do Bestiário (criaturas com ficha) nem se cobre Animália inimiga. A vantagem em Adestramento já mexe com o mesmo tema.
- **Correção:** "Animais comuns (sem Fluxo e sem ficha de criatura) que não estejam sob ordem de outra criatura não atacam você, a menos que sejam provocados."
- **Decisão do Pedro?** sim, porque define o alcance para o Bestiário.

## Padrões que se repetem

- **`recuperacao: "sessao"` com texto "por descanso"** nos traços de nível 48 (Divino) e 50 (Elfo), 13 traços ao todo. Vale varrer as outras raças especiais atrás do mesmo padrão: o valor `descanso` existe e só aparece 8 vezes.
- **"Por combate"** apareceu uma vez (Fúria Sagrada). Procurar "em cada combate" nas outras raças.
- **"Gaste uma ação"** e "ação completa" em minúscula em quase todo traço ativo. O Livro tem sete ações com nome próprio.
- **Tipos de dano em minúscula** (raio, fogo, gelo, ar): Divino, Elfo e Animália (Herança Mítica). O Livro escreve Fogo, Raio, Gelo, Ar, Terra, Luz.
- **Termos soltos de condição:** "medo" (Amedrontado), "cegueira" (Cego), "agarrado" (Agarrado), "invisibilidade" (Invisível ou Revelado), "Movimento vira 0" (Imobilizado).
- **Resistência "pela metade"** nos Corações do Elfo. As outras raças usam Resistência numérica por tipo.
- **Quem rola o teste**: o Elfo mistura "compare com os Reflexos" e "testa Reflexos contra o seu Misticismo". A DT de raça pede a segunda forma.
- **Janelas de uso por sessão para poder de combate:** só aparece no campo, não no texto.
- **Escuridão sobrenatural:** os Elfos de Sombras e Noite Eterna "enxergam através de qualquer escuridão", o que passa por cima da regra de Ver e ser visto.
- **Tamanho:** a Animália fica de fora do Minúsculo e do Colossal. Os outros arquivos de raça com tamanho (Gigante, Goblim, Slime) devem ser conferidos no mesmo ponto.

## Conferido sem problema

- **Divino:** valores de Vida, Mana, Estamina e Movimento da raça (+2/+4/+1/0) batem com a tabela do Livro. Deus (+6/+8/+4, Defesa +2) bate com o texto. Semideus sem bônus. DT de Divino com Religião, e os traços "contra a sua DT de Divino" usam o rótulo certo. Poderes de Domínio com custo, alcance e duração batendo com os campos `custo_mana`, `alcance_m`, `duracao_rodadas`. Dano em área com teste e metade no sucesso (Raio Divino, Céu em Fúria, Terra Viva, Sol nas Mãos, Toque Frio, A Hora Chegou). Parar o Coração: Morrendo e 0 de Vida batem com Ferimentos. Forma Divina: Cansaço 1 ao acabar bate com o Descanso. Fé: janelas "fim da sessão ou do arco" são confirmação do Mestre, não janela de uso. Legados adicionais (1 + 1 do Semideus) citados no catálogo.
- **Elfo:** Vida +2, Mana +4 e Inteligência +4 batem com o Livro. Estágios 20 e 50 seguem o degrau das especiais (Mana +3 e +6). Rerrolagens por sessão (sorte) estão na janela certa (4, 5 e 10 com `usos` batendo). Passo Umbral: teleportar não provoca reação, como no Livro. Dano em área com teste e metade no sucesso (Avatar das Chamas, Olho da Tempestade, Chama que Não Cede, Tormenta sobre o Campo). Reflexos de Sepulcro Prolongado repete o teste todo turno (controle com teste repetido). Idioma Ilvaari ligado ao `idioma-dos-elfos`.
- **Animália:** 102 animais com id único, todas as Morfologias válidas e todas as dez com animais; tamanhos só Pequeno, Normal, Grande, Enorme, coerentes com Cavalo Grande, Elefante Enorme. Sentidos Místicos (escuridão natural) bate com Ver e ser visto. Nado Natural bate com Fôlego (quem respira debaixo d'água ignora). Couraça Natural (+1 Defesa) bate com `defesa: 1`. Valores de Vida/Mana/Estamina/Movimento das Formas e Morfologias respeitam o mínimo de 4,5 m. Estágios 13 e 36 e Instinto Maduro (+1,5 m) batem com o campo `movimento`. Raça sem `dt_efeitos` e sem traço que mande testar: correto.
