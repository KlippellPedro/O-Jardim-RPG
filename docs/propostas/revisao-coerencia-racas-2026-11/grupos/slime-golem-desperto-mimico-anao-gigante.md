# Relatório do grupo D: Slime, Golem, Desperto, Mímico, Anão, Gigante

Convenção: "campo `recuperacao: sessao`" é o valor do campo estruturado. Os valores aceitos que vi nos JSON são `cena`, `descanso` e `sessao`. Todo efeito de combate abaixo que diz "por descanso" no texto e traz `sessao` no campo é o mesmo erro, listado uma vez por raça.

---

## Slime (slime)

### [ERRO] poca-corrosiva, nuvem-de-esporos, erupcao, divisao-instavel · recuperacao
- **Hoje:** texto "Duas vezes por descanso" e campo `"recuperacao": "sessao"` (nos quatro poderes de nível 28).
- **Livro:** Poderes e Habilidades › Como ler a ação e o limite de uso: "Poder de combate volta no descanso." Por sessão fica para história, informação, dinheiro e sorte.
- **Problema:** texto e campo dizem janelas diferentes. A ficha vai usar o campo e devolver o uso na sessão, não no descanso.
- **Correção:** `"recuperacao": "descanso"` nos quatro.
- **Decisão do Pedro?** não

### [ERRO] secrecao-virulenta · descricao
- **Hoje:** "O próximo acerto aplica uma Aflição de veneno de nível 1 no alvo. Uma vez por cena."
- **Livro:** Aflições › Aplicação: "Ao sofrer exposição, teste Fortitude contra a DT da aflição. Sucesso evita a aflição. Falha aplica o estágio 1". Aflição tem estágios, não "nível", e vem do catálogo.
- **Problema:** mecânica antiga. Não diz qual veneno, não dá teste e não tem duração para o "próximo acerto".
- **Correção:** "Unte a sua superfície ou a arma de um aliado com a peçonha, gastando uma Ação Padrão e 3 Mana. Até o fim da cena, o próximo acerto expõe o alvo à Peçonha Hemorrágica: ele faz Fortitude contra a sua DT de Slime e, se falhar, fica no estágio 1. Uma vez por cena."
- **Decisão do Pedro?** sim, porque é escolha de qual aflição do catálogo o Slime Tóxico dá (Peçonha Hemorrágica, Toxina Paralisante ou Beladona Destilada).

### [INCOERÊNCIA] casca-prismatica (e corpo-de-aco, do Slime Metálico) · descricao
- **Hoje:** "Resistência 10 contra dano físico comum e vantagem em testes de resistência contra luz e cegueira" / "Resistência 10 contra dano físico comum".
- **Livro:** Tipos de Dano: "Resistência física geral cobre todos os danos físicos". Condições: Cego é condição. Elementos: Luz é elemento.
- **Problema:** "comum" não existe como termo no Livro (não diz se exclui arma mágica). "Luz e cegueira" mistura elemento com condição, e "testes de resistência contra luz" não diz o que testa.
- **Correção:** Cristal: "até o fim da cena você tem Resistência 10 contra dano físico e vantagem em testes contra efeitos de Luz e contra a condição Cego." Metálico: "+7 Defesa e Resistência 10 contra dano físico até o fim da cena." Se a intenção era excluir arma mágica, escrever "dano físico que não venha de magia nem de arma mágica", como em Incorpóreo.
- **Decisão do Pedro?** sim, porque "comum" pode ter sido de propósito (não valer contra arma mágica).

### [LACUNA] reflexo-faceta · descricao
- **Hoje:** "o atacante sofre metade do dano que causou, até o máximo de 10."
- **Livro:** Tipos de Dano: "Resistência... sempre apontam para uma entrada específica", então todo dano precisa de tipo.
- **Problema:** não diz o tipo do dano devolvido.
- **Correção:** "o atacante sofre metade do dano que causou, em dano de corte, até o máximo de 10."
- **Decisão do Pedro?** não

### [LACUNA] absorcao-metalica · descricao
- **Hoje:** "uma arma natural de dano-base 1d8. No início de cada cena você escolhe o formato: lâmina, martelo ou espinho."
- **Livro:** Combate › Ataque desarmado: "Classe ou raça que der outro dano desarmado... diz isso no próprio texto" (tipo, bônus de Força e crítico). Compare com Golem Obsidiana: "1d8 de corte".
- **Problema:** os três formatos não dizem o tipo de dano nem se somam Mod. Força.
- **Correção:** "...uma arma natural de dano-base 1d8 + Mod. Força, crítico 20/x2. No início de cada cena você escolhe o formato: lâmina (corte), martelo (impacto) ou espinho (perfuração)."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] superficie-gelida · descricao (frio)
- **Hoje:** "Você é imune aos efeitos ambientais de frio extremo."
- **Livro:** Perigos › Clima: graus Severo, Extremo e Mortal. "Raça ou traço que diga que não sente frio ou calor ignora o clima que o traço cobre."
- **Problema:** "frio extremo" soa como o grau Extremo e deixa dúvida sobre Severo e Mortal. O Núcleo em Brasa (Magmático) tem o mesmo problema: "o frio do ambiente não incomoda".
- **Correção:** Glacial: "Você ignora o Frio do clima, em qualquer grau." Magmático: "o Frio do clima não afeta você".
- **Decisão do Pedro?** sim, porque o Mortal ("um frio que não pertence a este mundo") pode ser de propósito fora da imunidade.

### [LACUNA] superficie-gelida · descricao (teste de Acrobacia)
- **Hoje:** "quem se mover para um espaço adjacente ao seu faz um teste de Acrobacia para não cair."
- **Livro:** Raças: "Quando um traço manda alguém testar, a raça tem a sua DT" (dt_efeitos). Perícias: Reflexos cobre "evitar armadilhas... perigos súbitos".
- **Problema:** sem DT, sem limite de frequência (a cada passo?) e a perícia é Acrobacia, que o `dt_efeitos` do Slime não lista (só Fortitude, Reflexos, Vontade, Percepção).
- **Correção:** "quem entrar num espaço adjacente ao seu faz Reflexos contra a sua DT de Slime, uma vez por turno, ou fica Caído."
- **Decisão do Pedro?** não

### [LACUNA] erupcao · descricao
- **Hoje:** "a área vira terreno em brasa por cinco rodadas."
- **Livro:** Elementos › Magma (harmônico): "Cada criatura, na primeira vez que entrar ou começar o turno ali, testa Reflexos... e sofre 1d6 de Magma, ou metade se passar." Convenção 14: zona testa ao entrar ou no começo do turno.
- **Problema:** "terreno em brasa" não tem efeito escrito (dano? terreno difícil?).
- **Correção:** "e a área vira terreno em brasa por cinco rodadas: quem entrar ali ou começar o turno ali faz Reflexos contra a sua DT de Slime e sofre 1d6 de dano de Fogo, ou metade se passar."
- **Decisão do Pedro?** sim, porque o dano da brasa é número novo.

### [LACUNA] engolir · descricao
- **Hoje:** "sofre 1d6 de dano ácido por turno. Com uma Ação Padrão e Atletismo contra a sua DT de Slime, ela volta ao lado de fora."
- **Livro:** Condições › Imobilizado: "Ação Padrão e o teste que a fonte indicar". Raças (dt_efeitos): a DT de raça cobre Fortitude, Reflexos, Vontade ou Percepção.
- **Problema:** o dano não diz quando cai (início ou fim do turno de quem). Não diz quantas criaturas cabem nem se a engolida fica Agarrada ou Imobilizada. A saída usa Atletismo contra DT de Slime, que o `dt_efeitos` do Slime não cita.
- **Correção:** "Engula uma criatura Pequena ou menor que você esteja agarrando. Ela fica Imobilizada dentro de você e sofre 1d6 de dano de ácido no início de cada turno dela. Você só engole uma criatura por vez. Para sair, ela gasta uma Ação Padrão e faz Atletismo ou Acrobacia contra a sua DT de Slime."
- **Decisão do Pedro?** não

### [LACUNA] divisao-instavel · descricao
- **Hoje:** "Você se parte em duas metades e fica assim pelo resto da cena... Se uma delas cair a 0 de Vida, as duas se fundem novamente, e você fica com a Vida da metade que sobrou."
- **Livro:** Ferimentos: cair a 0 PV dá inconsciência e Morrendo; Ficar com 1 de Vida: "o Déficit de Vida some".
- **Problema:** não diz o que acontece com a Vida quando a cena acaba sem ninguém cair (some metade da Vida?). Quando uma metade cai, o Déficit dela desaparece e o Slime não entra em Morrendo, o que age como um "ficar com Vida" não escrito. Também dobra as ações por turno sem dizer como isso conversa com "uma vez por turno" (Coreografia) e Ataque Combinado.
- **Correção:** acrescentar "Ao fim da cena as metades se fundem e sua Vida é a soma das duas. Se uma metade cair a 0 de Vida, a fusão acontece sem Morrendo e sem Déficit, e a metade que caiu não conta para a Vida que sobra. Coreografia e outros limites 'por turno' valem uma vez para as duas metades juntas."
- **Decisão do Pedro?** sim, porque é decisão sobre perder ou não a Vida da metade que cai.

### [LACUNA] dissolver-amarras · descricao
- **Hoje:** "Se o material for mágico ou reforçado, o Mestre pode pedir um teste de Fortitude."
- **Livro:** Perícias: Fortitude é teste de quem resiste. Perigos: "O esconderijo ou a trava de um item segue a raridade dele".
- **Problema:** não diz de quem é o teste nem a DT.
- **Correção:** "Se o material for mágico ou reforçado, faça Fortitude contra a DT da raridade do item para derreter."
- **Decisão do Pedro?** não

### [LACUNA] slime · fisiologia
- **Hoje:** "Corpo semissólido..." (sem tamanho).
- **Livro:** Combate › Tamanho: "São seis categorias. Normal é o tamanho de uma pessoa comum."
- **Problema:** Golem, Anão e Gigante dizem o tamanho na fisiologia. O Slime só passa a "Grande" no estágio Volumoso, sem dizer de qual tamanho vem.
- **Correção:** acrescentar em `fisiologia`: "Tamanho Normal no estágio Coeso."
- **Decisão do Pedro?** não

### [LACUNA] toque-corrosivo, agarrao-congelante, nucleo-em-brasa · descricao
- **Hoje:** "no início de cada turno" / "a cada turno em que o agarrão continuar".
- **Livro:** Condições › Queimando e Sangramento: "no fim do turno" de quem recebe. Persistentes: o dano só repete "quando a fonte... diz que continua".
- **Problema:** não diz de quem é o turno. O texto diz que continua, então a repetição é válida, mas o momento fica solto.
- **Correção:** "...sofre X de dano de Y no início de cada turno dela, enquanto o agarrão durar."
- **Decisão do Pedro?** não

### [MELHORIA] colossal (estágio) · titulo
- **Hoje:** titulo "Slime Colossal" com tamanho Enorme.
- **Livro:** Tamanho: Colossal é uma categoria acima de Enorme (6 m ou mais).
- **Problema:** o estágio se chama Colossal e o tamanho dele é Enorme, o que confunde com a categoria. A descrição também diz "de Coeso até Colossal". O Gigante usa os dois nomes certos.
- **Correção:** manter o `id`, trocar `titulo` e a frase da descrição para algo que não seja nome de categoria (por exemplo "Slime Imenso").
- **Decisão do Pedro?** sim, porque é nome de estágio.

### [MELHORIA] sangue-peconhento · descricao
- **Hoje:** "Você é imune a veneno."
- **Livro:** Aflições › Imunidades: "Use a extensão exata da característica racial."
- **Problema:** veneno é aflição, condição (Envenenado) e dano persistente. A frase não diz quais.
- **Correção:** "Você é imune à condição Envenenado, a dano de veneno e a aflições de veneno."
- **Decisão do Pedro?** não

---

## Golem (golem)

### [ERRO] permanencia, raiz-ancora, campo-de-lascas, selo-na-testa · recuperacao
- **Hoje:** "Duas vezes por descanso" e `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades: "Poder de combate volta no descanso."
- **Problema:** texto e campo discordam.
- **Correção:** `"recuperacao": "descanso"` nos quatro.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] golem · descricao
- **Hoje:** "não respira, não come e não fica doente."
- **Livro:** Aflições › Imunidades: "Golem não contrai doenças comuns." A fisiologia do próprio Golem diz "não contrai doenças comuns".
- **Problema:** "não fica doente" é mais largo que "doenças comuns" (deixaria de fora só as sobrenaturais).
- **Correção:** "Tem um corpo construído, grande ou enorme, que não respira, não come e não contrai doenças comuns."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] conducao-de-fluxo · descricao e campo `mana`
- **Hoje:** texto "você recupera 1 Mana adicional por descanso", campo `"mana": 1`.
- **Livro:** Sistema Base › Ajustes raciais: "bônus raciais de Vida, Mana e Estamina são somados depois do cálculo correspondente". Descanso: recuperação é em porcentagem do máximo.
- **Problema:** o campo é um ajuste de Mana máxima (+1), o texto é uma recuperação por descanso (que o Livro não usa em valor fixo). Os dois não dizem a mesma coisa.
- **Correção:** "O corpo conduz Mana: você tem +1 de Mana máxima e ilumina como uma tocha à vontade, na cor do seu cristal."
- **Decisão do Pedro?** sim, porque pode ter sido pensado como o efeito do texto.

### [LACUNA] massa-de-rocha · descricao (e porte-colossal, do Gigante)
- **Hoje:** "vantagem para resistir a qualquer efeito que tente empurrar, derrubar ou mover você contra a vontade."
- **Livro:** Combate › Defesas passivas: manobra é contra "10 + bônus total" da defesa, sem rolagem do alvo. Tamanho: criatura de uma categoria maior já impõe desvantagem na manobra.
- **Problema:** vantagem só existe quando o alvo rola. Na manobra ele não rola, então o traço não tem efeito claro. "Mover contra a vontade" pegaria também teleporte e magia.
- **Correção:** "Receba Resistência 3 contra dano de impacto. Quem tenta empurrar, derrubar ou agarrar você faz a manobra com desvantagem." (A mesma troca vale para `porte-colossal` do Gigante.)
- **Decisão do Pedro?** sim, porque troca vantagem por desvantagem de quem ataca.

### [LACUNA] punho-de-cantaria · descricao
- **Hoje:** "Seus golpes desarmados usam dano-base 1d10".
- **Livro:** Ataque desarmado: 1d4 de impacto + Mod. Força, crítico 20/x2; raça que dá outro dano diz isso no texto.
- **Problema:** sem tipo e sem Mod. Força.
- **Correção:** "Seus golpes desarmados causam 1d10 de impacto + Mod. Força e, contra estrutura, portão ou parede, o dobro do dano."
- **Decisão do Pedro?** não

### [LACUNA] peso-que-esmaga · descricao
- **Hoje:** "Avance até 6 m em linha reta, por cima de quem estiver no caminho. Cada criatura atingida sofre 3d6 de dano de impacto e cai no chão."
- **Livro:** Combate › Manobras: "Criatura duas categorias de tamanho maior que você não é agarrada, derrubada nem empurrada sem uma regra que autorize". Provocar reação: andar para fora do alcance provoca.
- **Problema:** o Golem é Grande (ou Enorme) e pode derrubar uma criatura Colossal. Não diz se o avanço usa a Ação de Movimento, nem se provoca reação.
- **Correção:** "Avance até 6 m em linha reta, sem provocar reação, por cima de quem estiver no caminho. Cada criatura de até uma categoria de tamanho acima da sua que for atingida sofre 3d6 de dano de impacto e fica Caída; quem passar em Reflexos contra a sua DT de Golem sofre metade e continua de pé."
- **Decisão do Pedro?** sim, porque decide se o avanço escapa de reação.

### [LACUNA] nucleo-magnetico · descricao
- **Hoje:** "criatura a até 9 m carregando metal pesado precisa passar em Atletismo para conseguir se afastar."
- **Livro:** Raças: DT de raça em `dt_efeitos`. Condições › Imobilizado: o teste de saída tem DT da fonte.
- **Problema:** sem DT, sem dizer o que "metal pesado" quer dizer e sem consequência da falha.
- **Correção:** "criatura a até 9 m que vista armadura de metal ou segure arma de metal faz Atletismo contra a sua DT de Golem para se afastar de você; se falhar, o Movimento dela é metade neste turno."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] refracao · descricao
- **Hoje:** "Quando uma magia que exige ataque tiver você como alvo... o dano cai pela metade, e o conjurador leva 1d6 de volta."
- **Livro:** Magia e Fluxo › Ataque e resistência: "resistência nunca reduz o dano de uma magia de ataque". Termo oficial: "magia de ataque".
- **Problema:** o traço reduz dano de magia de ataque. Como é efeito escrito, vale, mas o texto devia dizer que é redução do traço. O 1d6 devolvido não tem tipo.
- **Correção:** "Quando uma magia de ataque tiver você como alvo, gaste uma reação e 3 Mana para reduzir o dano dela pela metade. O conjurador sofre 1d6 de dano de Luz se estiver a até 9 m. Uma vez por cena."
- **Decisão do Pedro?** sim, porque é o tipo do dano devolvido (Luz, impacto ou o do Fluxo da magia).

### [LACUNA] selo-na-testa · descricao
- **Hoje:** "recupera metade da Vida máxima e encerra toda condição física ou Aflição que dependia da forma antiga."
- **Livro:** Ferimentos › Remover Ferido: "Poder ou tratamento que remova Ferido fora do descanso precisa dizer isso com todas as letras." Condições › Peso da condição: leve, média, grave e gravíssima.
- **Problema:** "toda condição física" pode ser lida como Ferido, lesão de longo prazo ou Mutilação. "Aflição que dependia da forma antiga" não é regra.
- **Correção:** "encerra toda condição de peso leve ou médio e baixa em 1 estágio cada Aflição. Não remove Ferido, lesão de longo prazo nem membro perdido."
- **Decisão do Pedro?** sim, porque define até onde o Golem de Argila conserta o corpo.

### [LACUNA] estilhaco · descricao
- **Hoje:** "Você sofre 1d6 de dano ao fazer isso."
- **Livro:** Tipos de Dano: todo dano tem tipo.
- **Problema:** dano ao próprio Golem sem tipo.
- **Correção:** "Você sofre 1d6 de dano de corte ao fazer isso."
- **Decisão do Pedro?** não

### [LACUNA] quinas-vivas · descricao
- **Hoje:** "Quem atacar você desarmado, agarrar você ou ser agarrado por você sofre 1d6 de dano de corte."
- **Livro:** Combate › Ataque desarmado: ataque desarmado é de quem bate com o corpo. Convenção 14: dano de gatilho tem teste e metade no sucesso.
- **Problema:** sem limite por turno (um atacante com vários golpes toma 1d6 em cada um) e sem teste.
- **Correção:** "...sofre 1d6 de dano de corte, uma vez por turno dela." (O mesmo cuidado vale para `sangue-peconhento` e `coroa-de-raios` nas outras raças.)
- **Decisão do Pedro?** não

### [INCOERÊNCIA] estrutura-monumental · descricao
- **Hoje:** "imunidade a acertos críticos causados por armas comuns."
- **Livro:** Combate › Críticos; Condições › Incorpóreo: "dano físico que não venha de magia nem de arma mágica".
- **Problema:** "armas comuns" não é termo do Livro. Também não diz o que acontece com o crítico (vira acerto normal).
- **Correção:** "imunidade a acerto crítico de arma não mágica: o golpe acerta como um acerto normal."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] nao-se-derruba · descricao
- **Hoje:** "continua agindo normalmente enquanto tiver ao menos uma parte estrutural inteira; o Mestre descreve o que sobrou."
- **Livro:** Ferimentos: "Ao chegar a 0 PV você cai inconsciente." Mutilação: perda de membro por falha em teste.
- **Problema:** lido ao pé da letra, ignora o 0 de Vida, Morrendo e a Mutilação. Não é isso que a regra de Ferimentos permite sem dizer com todas as letras. "Parte estrutural" não é termo.
- **Correção:** "Você não pode ser derrubado, empurrado ou movido por efeito que não seja mágico. Um golpe que mutilaria você só racha o corpo: você não perde membro por Mutilação."
- **Decisão do Pedro?** sim, porque o texto atual pode ter sido pensado como resistir à morte.

### [LACUNA] permanencia · descricao
- **Hoje:** "você fica com −2 de Defesa até o próximo descanso. Duas vezes por descanso."
- **Livro:** Perícias: "a mesma fonte não soma com ela mesma". Ferimentos › Ficar com 1 de Vida: não vale contra a morte na hora, a menos que o efeito diga.
- **Problema:** não diz se o segundo uso soma −2 (fica −4). Não diz se vale contra a morte na hora.
- **Correção:** "...você fica com −2 de Defesa até o próximo descanso, sem acumular. Não vale contra a morte na hora (Déficit igual à Vida máxima)."
- **Decisão do Pedro?** não

### [LACUNA] conserto-em-campo · descricao
- **Hoje:** "Um aliado com ferramentas pode fazer isso por você, gastando a ação dele no lugar da sua. Custa uma ação completa e 3 Mana."
- **Livro:** Poderes e Habilidades: "Cada poder declara o próprio custo".
- **Problema:** não diz quem paga a Mana quando o aliado faz.
- **Correção:** "...gastando a ação dele no lugar da sua. A Mana é sua."
- **Decisão do Pedro?** não

### [MELHORIA] raiz-ancora · descricao
- **Hoje:** "Enraíze-se no chão por cinco rodadas."
- **Livro:** Combate › Provocar reação: o texto de movimento precisa dizer o que acontece.
- **Problema:** não diz o que o Golem pode fazer enquanto enraizado (anda? ataca?).
- **Correção:** acrescentar "Você fica com Movimento 0 enquanto durar."
- **Decisão do Pedro?** não

### [MELHORIA] golem · fisiologia (tamanho)
- **Hoje:** "Tamanho Grande ou Enorme, definido na criação."
- **Livro:** Tamanho: Enorme dá espaço e alcance de 4,5 m. O Gigante só chega a Enorme no nível 14.
- **Problema:** o Golem escolhe Enorme no nível 1 sem custo. Não fere regra escrita, mas dá alcance e espaço maiores de graça.
- **Correção:** deixar como está, ou escrever o efeito do tamanho (espaço, alcance e trava de manobra) no próprio traço.
- **Decisão do Pedro?** sim, porque é escolha de equilíbrio.

### [MELHORIA] campo-de-lascas · descricao
- **Hoje:** "a criatura que se mover dentro dela testa Reflexos... uma vez por turno".
- **Livro:** Convenção 14: "zona testa ao entrar ou no começo do turno".
- **Problema:** quem fica parado não é afetado nunca.
- **Correção:** "a criatura que entrar na área ou começar o turno nela testa Reflexos... uma vez por turno".
- **Decisão do Pedro?** não

---

## Desperto (desperto)

### [ERRO] veredito-inacabado · recuperacao
- **Hoje:** "Uma vez por descanso" e `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades: efeito de combate volta no descanso.
- **Problema:** texto e campo discordam.
- **Correção:** `"recuperacao": "descanso"`.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] alma-fragmentada · ajustes_pericias e espirito-incompleto
- **Hoje:** Condição com `"ajustes_pericias": {"vontade": -4}` e cicatriz "Você não recebe o +4 em Vontade de Renegado da Morte. Conserva as vantagens e resistências concedidas pela característica."
- **Livro:** Perícias: bônus de fontes diferentes somam. Tipos de Dano: "Resistência" é redução de dano por tipo.
- **Problema:** a raça dá +4 em Vontade (`ajustes_pericias.vontade: 4`). Tirar o +4 e ainda aplicar −4 deixa o Desperto com −4 total, o que o texto da cicatriz não pede (pede só 0). "Resistências" não existe no traço, que só dá vantagens.
- **Correção:** tirar `ajustes_pericias` da condição (ou, ao contrário, apagar a frase da cicatriz). Texto: "Você não recebe o +4 em Vontade de Renegado da Morte. Conserva as vantagens que a característica dá."
- **Decisão do Pedro?** sim, porque pode ter sido pensado como −4 de verdade.

### [INCOERÊNCIA] ausencia-momentanea · descricao
- **Hoje:** "você fica incorpóreo, pode atravessar até 1,5 m de matéria sólida, mas não pode atacar, manipular objetos nem terminar dentro de algo."
- **Livro:** Condições benéficas › Incorpóreo: condição com maiúscula, "Atravessa criaturas e objetos, mas não pode terminar o movimento dentro deles. Não pode ser agarrado, derrubado nem empurrado. Sofre metade do dano físico que não venha de magia".
- **Problema:** minúscula, e o limite de 1,5 m contradiz a condição, que não tem limite de distância.
- **Correção:** "...você fica Incorpóreo, e não pode atacar nem manipular objetos."
- **Decisão do Pedro?** não

### [LACUNA] folego-roubado · descricao
- **Hoje:** "fazer Religião contra a Fortitude dele. Se superar a defesa, cause 2d6 + Mod.Sabedoria de dano e recupere Vida igual ao dano realmente causado."
- **Livro:** Combate › Manobras: "d20 + perícia contra 10 + Fortitude". Tipos de Dano: todo dano tem tipo. Raças: DT de raça em `dt_efeitos`.
- **Problema:** sem tipo de dano. "Contra a Fortitude dele" não diz se é 10 + bônus. O Desperto não tem `dt_efeitos`, e este é o único traço dele que testa alguém. Um dado com metade no sucesso do alvo segue a convenção 14, o texto atual inverte.
- **Correção:** "...faça Religião contra 10 + Fortitude dele. Se acertar, cause 2d6 + Mod.Sabedoria de dano de Essência e recupere Vida igual ao dano realmente causado. Se errar, cause e recupere metade."
- **Decisão do Pedro?** sim, porque é o tipo de dano (Essência ou Fim) e porque o Desperto passaria a ter um `dt_efeitos` de Religião se a escolha fosse virar teste do alvo.

### [LACUNA] laco-do-retorno · descricao
- **Hoje:** "Ela ignora o dano e os efeitos adicionais; você sofre metade desse dano e recebe os efeitos no lugar dela."
- **Livro:** Tipos de Dano › Resistência e ordem de aplicação: vulnerabilidade, depois Resistência e redução, até o mínimo 0.
- **Problema:** não diz se o seu dano passa pela sua Resistência. "Recebe os efeitos" não diz se há teste de resistência (e de quem, e contra qual DT).
- **Correção:** "...você sofre metade desse dano, depois da sua Resistência, e recebe os efeitos no lugar dela, rolando você mesmo os testes."
- **Decisão do Pedro?** sim, porque a ordem do dano muda o quanto o Desperto absorve.

### [LACUNA] recusar-o-fim · descricao
- **Hoje:** "quando morreria... a morte instantânea ou captura da alma que ativou a reação é negada."
- **Livro:** Ferimentos › Voltar da morte: "é possível, mas é raro e caro". Magia e Fluxo › Termos: "Alcançar o próprio Fim. A criatura morre, e nenhuma magia de círculo menor que o 10º a traz de volta."
- **Problema:** a reação nega "morte instantânea", o que inclui o Fim de uma magia de 10º círculo, a cada cena, por 6 Mana e Ferido +1. Não dá para saber se foi de propósito.
- **Correção:** manter, ou escrever "Não nega Alcançar o próprio Fim".
- **Decisão do Pedro?** sim, porque é decisão sobre o poder do Desperto contra o Fim.

### [MELHORIA] ecos-de-seculos-mortos · descricao
- **Hoje:** "Você pode usá-la em qualquer teste, mas deve manter o novo resultado."
- **Livro:** Perícias › Rolar de novo: "um teste, ou um dado, nunca é rolado de novo duas vezes".
- **Problema:** já está de acordo, mas não avisa que outra rerrolagem de outra fonte não soma.
- **Correção:** acrescentar "Se outra fonte também puder rolar o mesmo teste de novo, escolha uma só."
- **Decisão do Pedro?** não

### [MELHORIA] carne-refeita · descricao
- **Hoje:** "é imune a doenças e venenos comuns."
- **Livro:** Aflições › Imunidades: "Use a extensão exata da característica racial."
- **Problema:** "venenos comuns" cobre a aflição de veneno comum, mas não diz se cobre a condição Envenenado e o dano de veneno.
- **Correção:** "é imune a doenças comuns e a venenos comuns (aflições, a condição Envenenado e dano de veneno)."
- **Decisão do Pedro?** não

---

## Mímico (mimico)

### [ERRO] mais-de-um-voce, qualquer-um · recuperacao
- **Hoje:** "Duas vezes por descanso" e `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades: efeito de combate volta no descanso.
- **Problema:** texto e campo discordam.
- **Correção:** `"recuperacao": "descanso"` nos dois. (palavra-na-boca-do-outro, "duas vezes por sessão", é social e fica como está.)
- **Decisão do Pedro?** não

### [ERRO] formas-guardadas · descricao
- **Hoje:** "troca entre elas gastando só o seu Movimento".
- **Livro:** Poderes e Habilidades: as sete ações, entre elas "Ação de Movimento".
- **Problema:** "Movimento" é o deslocamento (metros), não a ação.
- **Correção:** "troca entre elas gastando uma Ação de Movimento, sem pagar Mana nem usar Forma Emprestada de novo."
- **Decisão do Pedro?** não

### [LACUNA] mimico · dt_efeitos (campo ausente)
- **Hoje:** o JSON não tem `dt_efeitos`, mas Barulho de Muitos, Palavra na Boca do Outro, Qualquer Um e Trejeito Roubado fazem o alvo testar "contra a sua Enganação".
- **Livro:** Raças: "a raça tem a sua DT, como as classes: você rola a perícia da raça na hora (Intimidação no Vampiro, Atuação na Sereia...)". A revisão de outubro já criou `dt_efeitos` para as outras raças.
- **Problema:** a DT de raça do Mímico existe na prática (Enganação) e não está no campo.
- **Correção:** `"dt_efeitos": {"rotulo": "DT de Mímico", "pericia": "enganacao", "descricao": "Quando um traço seu manda alguém testar Fortitude, Reflexos, Vontade, Intuição ou Percepção, role Enganação na hora: quem decide é o quanto a farsa convence. O resultado é a DT que a criatura precisa alcançar, e uma rolagem vale para todos os alvos daquele uso."}`. Nos traços, trocar "contra a sua Enganação" por "contra a sua DT de Mímico".
- **Decisão do Pedro?** não

### [LACUNA] forma-emprestada e bicho-grande · descricao
- **Hoje:** "assumir a forma de uma criatura de tamanho até uma categoria acima ou abaixo... Você copia só a aparência: atributos, Vida, Mana, Movimento, alcance, sentidos..." e Bicho Grande: "virar... uma fera uma categoria de tamanho acima da sua... vantagem para agarrar e derrubar".
- **Livro:** Tamanho: espaço e alcance saem da categoria; "agarrar, derrubar ou empurrar uma criatura um tamanho maior que você tem desvantagem".
- **Problema:** diz que só a aparência muda (alcance fica o seu) e ao mesmo tempo limita o tamanho da forma. Não diz se o espaço ocupado muda. Bicho Grande dá vantagem para agarrar e derrubar por ser maior, mas o alcance continuaria o mesmo. Também não diz que a forma precisa ser de algo que o Mímico observou.
- **Correção:** Forma Emprestada: "...a forma de uma criatura que você observou de perto, de tamanho até uma categoria acima ou abaixo da sua... Só a aparência muda: espaço, alcance e todo o resto continuam sendo os seus." Bicho Grande: "...a aparência de uma fera uma categoria acima da sua. Seu espaço e seu alcance também sobem para essa categoria."
- **Decisão do Pedro?** sim, porque é decisão de o tamanho ser só visual ou real.

### [LACUNA] bote-do-bau · descricao
- **Hoje:** "gaste uma reação e 3 Mana para atacar com vantagem. Acertando, o ataque causa 2d6 de dano extra e deixa a criatura agarrada até o começo do seu próximo turno."
- **Livro:** Combate › Reações: ataque de reação tem −2 e não gera crítico, se o texto não disser outra coisa. Tamanho: não agarra criatura de duas categorias acima.
- **Problema:** não diz se o ataque tem −2 e crítico. "Agarrada" é minúscula e não fala da trava de tamanho.
- **Correção:** "...atacar com vantagem, sem crítico. Acertando, o ataque causa 2d6 de dano extra e deixa a criatura Agarrada até o começo do seu próximo turno (a trava de tamanho de Agarrar continua valendo)."
- **Decisão do Pedro?** não

### [LACUNA] casco-e-garra · descricao
- **Hoje:** "ganha uma arma natural de dano-base 1d6".
- **Livro:** Combate › Ataque desarmado: dano com tipo, Mod. Força, crítico.
- **Problema:** sem tipo de dano.
- **Correção:** "uma arma natural de 1d6 + Mod. Força, de corte (garra) ou impacto (casco), à sua escolha ao assumir a forma."
- **Decisão do Pedro?** não

### [LACUNA] qualquer-um · descricao
- **Hoje:** "copiar de verdade, por uma cena, uma criatura que você tenha visto de perto. Você recebe o Movimento e os sentidos dela e escolhe uma característica racial de nível 1 que ela possua."
- **Livro:** Tamanho (acima); Raças: o Desperto tem traços de nível 1 como Recusar o Fim, que mexe com morte.
- **Problema:** sem limite de tamanho da criatura copiada (a Forma Emprestada tem). Pode escolher qualquer traço de nível 1, inclusive efeitos de morte (Recusar o Fim) ou de Mana alta.
- **Correção:** acrescentar "de tamanho até uma categoria acima ou abaixo da sua" e "A característica copiada não pode ser de morte, Fim nem de aflição."
- **Decisão do Pedro?** sim, porque define o que o Mímico pode copiar.

### [MELHORIA] barulho-de-muitos · descricao
- **Hoje:** "faz Vontade contra a sua Enganação e, falhando, gasta o próximo turno virada para o lado errado, atacando com desvantagem."
- **Livro:** Condições › Desorientado: "Desvantagem em ataques e em Percepção... Fortitude ou Vontade encerra." Convenção 14: controle tem teste repetido.
- **Problema:** descreve com palavras o que uma condição já faz. "Área de 9 m" não diz se é raio.
- **Correção:** "...cada criatura hostil num raio de 9 m faz Vontade contra a sua DT de Mímico e, se falhar, fica Desorientada até o fim do próximo turno dela."
- **Decisão do Pedro?** não

### [MELHORIA] palavra-na-boca-do-outro · descricao
- **Hoje:** "passa quatro rodadas convencida de que aquilo saiu dela, com desvantagem em Intuição e Vontade nesse tempo."
- **Livro:** Convenção 14: controle tem teste repetido.
- **Problema:** o efeito prende por quatro rodadas sem teste para sair.
- **Correção:** acrescentar "No fim de cada turno dela, ela repete a Vontade e encerra o efeito se passar."
- **Decisão do Pedro?** sim, porque encurta um efeito de nível 34.

### [MELHORIA] peso-de-mentira · descricao
- **Hoje:** "só magia que revele forma verdadeira desfaz a farsa."
- **Livro:** Condições › Revelado: "Perde disfarce, transformação e invisibilidade de origem mágica."
- **Problema:** o Livro já tem a condição que faz isso.
- **Correção:** "só uma magia que deixe você Revelado desfaz a farsa."
- **Decisão do Pedro?** não

---

## Anão (anao)

### [ERRO] obra-de-mestre · descricao
- **Hoje:** "Uma vez por arco da campanha... transforme um item comum em obra-prima: +1 permanente no dano, se for arma, ou na Defesa."
- **Livro:** Poderes e Habilidades: janelas são rodada, turno, cena, descanso e sessão. Raridades e Modificações: bônus de arma e armadura vêm de raridade e de vagas de modificação.
- **Problema:** "por arco" não é janela. "Obra-prima" não existe no Livro. Um +1 permanente fora de raridade e de vaga de modificação escapa dos limites do item.
- **Correção:** "Uma vez por sessão, com um dia de trabalho e material à mão, aplique no item uma melhoria técnica: +1 permanente no dano, se for arma, ou na Defesa, se for armadura ou escudo. Ela ocupa uma vaga de modificação do item, e cada item recebe isso uma vez só."
- **Decisão do Pedro?** sim, porque é decidir se a melhoria ocupa vaga de modificação.

### [ERRO] selo-ancestral, desabamento-calculado, engenho-de-cerco · recuperacao
- **Hoje:** "Duas vezes por descanso" e `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades: efeito de combate volta no descanso.
- **Problema:** texto e campo discordam.
- **Correção:** `"recuperacao": "descanso"` nos três.
- **Decisão do Pedro?** não

### [INCOERÊNCIA] obra-que-fica · descricao
- **Hoje:** "Duas vezes por sessão... Até o fim da sessão, ela concede +2 em ataque e dano, ou +2 de Defesa".
- **Livro:** Poderes e Habilidades: "Poder de combate volta no descanso." Têmpera Certa, do mesmo povo, dura "até o próximo descanso".
- **Problema:** é bônus de combate com janela de sessão, e dura mais que a Têmpera Certa.
- **Correção:** "Duas vezes por descanso, gaste dez minutos e 6 Mana... Até o próximo descanso, ela concede +2 em ataque e dano, ou +2 de Defesa...". Campo `recuperacao: descanso`.
- **Decisão do Pedro?** sim, porque encurta de uma sessão para um descanso.

### [LACUNA] selo-ancestral · descricao
- **Hoje:** "Enquanto você permanecer nela, seus aliados recebem +2 de Defesa e vantagem para resistir a medo e a controle. Sair da área encerra o efeito."
- **Livro:** Poderes e Habilidades: efeito precisa de duração. Condições: Amedrontado é condição.
- **Problema:** sem duração, e "sair da área" não diz quem sai (o Anão ou o aliado). "Medo" e "controle" são vagos. A área não diz se é raio.
- **Correção:** "Grave um selo no chão, num raio de 6 m, por cinco rodadas. Aliados dentro dele recebem +2 de Defesa e vantagem para resistir à condição Amedrontado e a efeitos que controlem a mente. O efeito de cada aliado acaba quando ele sai do selo."
- **Decisão do Pedro?** não

### [LACUNA] runa-de-guarda · descricao
- **Hoje:** "Marque uma superfície ou um aliado com a runa. O próximo dano que o protegido sofrer é reduzido em 10."
- **Livro:** Tipos de Dano: "A redução de dano vale contra qualquer tipo, menos o dano verdadeiro."
- **Problema:** sem duração (o "próximo dano" pode ficar guardado para sempre), sem alcance, e "superfície" não é um protegido.
- **Correção:** "Toque um aliado e marque-o com a runa. O próximo dano que ele sofrer até o fim da cena é reduzido em 10. Uma ação e 4 Mana, uma vez por cena."
- **Decisão do Pedro?** não

### [INCOERÊNCIA] mao-treinada · descricao
- **Hoje:** "você não sofre penalidade por trabalhar sem oficina adequada."
- **Livro:** Criação, Forja e Alquimia: "Sem a ferramenta exigida, o trabalho não começa." A oficina é requisito de raridade (Lendário) ou de base, não penalidade.
- **Problema:** não existe penalidade por falta de oficina no Livro.
- **Correção:** "e você pode trabalhar com ferramentas improvisadas em item Comum ou Incomum, sem o Kit de Ofício."
- **Decisão do Pedro?** sim, porque troca o benefício por um que existe.

### [MELHORIA] mao-de-mestre · descricao
- **Hoje:** "Uma falha sua em Ofício nunca destrói o material trabalhado, e uma vez por descanso você fecha em uma hora um trabalho que levaria o dia inteiro."
- **Livro:** Criação: "Cada dia de trabalho possui 6 horas", e "O projeto não é destruído automaticamente" em falha.
- **Problema:** "o dia inteiro" não bate com o dia de trabalho de 6 horas. A falha já não destrói o projeto, só custa um dia e material.
- **Correção:** "Uma falha sua em Ofício nunca perde o material já investido, e uma vez por descanso você cumpre um dia de trabalho em uma hora."
- **Decisão do Pedro?** não

### [LACUNA] reforco-de-campo · descricao
- **Hoje:** "Conserte um item danificado ali mesmo, sem oficina, ou faça uma arma quebrada voltar a funcionar por uma cena inteira."
- **Livro:** Criação › Reparos: "O reparo restaura a Durabilidade atual até a Durabilidade máxima."
- **Problema:** "danificado" e "quebrada" não são termos do Livro.
- **Correção:** "Restaure a Durabilidade de um item até o máximo, sem oficina e sem custo em Lunaris, ou faça um item com Durabilidade 0 funcionar até o fim da cena."
- **Decisão do Pedro?** sim, porque o texto novo decide o efeito exato com Durabilidade 0.

### [LACUNA] armadilha-armada · descricao
- **Hoje:** "A primeira criatura que pisar ali testa Reflexos contra a sua DT de Anão."
- **Livro:** Perigos › Armadilhas: achar, desarmar e resistir. Convenção 14.
- **Problema:** sem duração (fica armada para sempre), sem dizer se vale para aliados, e sem dizer como se acha.
- **Correção:** "A primeira criatura hostil que pisar ali até o fim da cena testa Reflexos contra a sua DT de Anão... Achar a armadilha pede Percepção contra a sua DT de Anão."
- **Decisão do Pedro?** não

### [LACUNA] engenho-de-cerco · descricao
- **Hoje:** "Pelas cinco rodadas seguintes ele atira sozinho, no seu turno, num alvo a até 18 m".
- **Livro:** Poderes e Habilidades: toda habilidade declara a ação que pede.
- **Problema:** não diz quem escolhe o alvo nem que ação gasta.
- **Correção:** "...atira no seu turno, sem gastar ação, num alvo a até 18 m que você escolhe..."
- **Decisão do Pedro?** não

### [LACUNA] escavacao-rapida · descricao
- **Hoje:** "Abra uma passagem de 1,5 m em pedra ou terra compacta".
- **Livro:** Distâncias: faixas e metros.
- **Problema:** não diz o comprimento.
- **Correção:** "Abra uma passagem de 1,5 m de largura e até 9 m de comprimento..."
- **Decisão do Pedro?** sim, porque o comprimento é número novo.

### [LACUNA] mecanismo-de-bolso · descricao
- **Hoje:** "monte um mecanismo simples (gancho, alavanca, gatilho ou alarme). Ele funciona uma vez e dura até o próximo descanso."
- **Livro:** Perigos › Armadilhas e o Kit de Ferramentas.
- **Problema:** não diz o que cada mecanismo faz mecanicamente.
- **Correção:** "...um gancho (+5 em Atletismo para escalar), uma alavanca (abre um mecanismo travado), um gatilho (aciona uma armadilha a até 9 m) ou um alarme (um aviso audível a 30 m)."
- **Decisão do Pedro?** sim, porque são números novos.

### [MELHORIA] estágios · titulo e povo
- **Hoje:** "de Aprendiz a Mestre com os anos" e estágios Aprendiz (1), Especialista (11), Mestre (26).
- **Livro:** Perícias › Graus: Aprendiz, Especialista e Mestre são graus de perícia que abrem nos níveis totais 1, 7 e 13.
- **Problema:** os nomes se confundem com graus, mas as datas são diferentes e o estágio não dá grau nenhum.
- **Correção:** manter os `id`, e talvez trocar `titulo`/povo para algo que não repita nome de grau.
- **Decisão do Pedro?** sim, porque é nome de estágio.

### [MELHORIA] maos-de-oficio · descricao
- **Hoje:** "vantagem em testes de Ofício para construir ou reparar" e, no estágio Mestre, "vantagem permanente em todos os testes de Ofício".
- **Livro:** Perícias: "Não existe vantagem dupla."
- **Problema:** não dá conflito, mas as duas vantagens não somam, e a rerrolagem não avisa da regra de rolar uma vez.
- **Correção:** acrescentar "Vantagem de mais de uma fonte vale uma só. Um teste só é rolado de novo uma vez."
- **Decisão do Pedro?** não

---

## Gigante (gigante)

### [ERRO] invernia, golpe-de-forja · recuperacao
- **Hoje:** "duas vezes por descanso" e `"recuperacao": "sessao"`.
- **Livro:** Poderes e Habilidades: efeito de combate volta no descanso.
- **Problema:** texto e campo discordam.
- **Correção:** `"recuperacao": "descanso"` nos dois.
- **Decisão do Pedro?** não

### [LACUNA] colossal-gigante (estágio) · descricao
- **Hoje:** o estágio "Porte Colossal" (nível 36) tem Passada que Abala e Peso que Não Para, e nenhum diz o tamanho. A descrição geral diz "Grande, Enorme e, no fim, Colossal".
- **Livro:** Tamanho: Colossal ocupa 6 m ou mais, alcance 6 m, e é o exemplo "Gigante no topo da escada".
- **Problema:** o Enorme é declarado em Envergadura, e o Colossal nunca é.
- **Correção:** acrescentar em `peso-que-nao-para`: "Seu tamanho passa a Colossal."
- **Decisão do Pedro?** não

### [LACUNA] porte-colossal · descricao
- **Hoje:** "Receba vantagem para resistir a empurrões e quedas causados por outra criatura."
- **Livro:** Combate › Defesas passivas e Tamanho (ver Golem, massa-de-rocha). Perigos › Queda: "queda" é dano de altura.
- **Problema:** "quedas causadas por outra criatura" confunde com a regra de Queda. O que o traço quer dizer é ser derrubado (Caído).
- **Correção:** "Quem tenta empurrar, derrubar ou agarrar você faz a manobra com desvantagem. Sua capacidade de carga é dobrada."
- **Decisão do Pedro?** sim, porque é a mesma troca de vantagem por desvantagem do Golem.

### [INCOERÊNCIA] forma-de-montanha · descricao
- **Hoje:** "ninguém consegue te mover contra a sua vontade, e você ganha Resistência 10 contra dano físico comum."
- **Livro:** Tipos de Dano: "Resistência física geral cobre todos os danos físicos". Provocar reação: teleporte não é movimento forçado por força.
- **Problema:** "comum" não é termo do Livro, e "ninguém" cobre magia e teleporte, enquanto o Golem Monumento só ignora efeito não mágico.
- **Correção:** "ninguém consegue empurrar, puxar ou arrastar você à força, e você ganha Resistência 10 contra dano físico."
- **Decisão do Pedro?** sim, porque "comum" pode ter sido para deixar arma mágica passar.

### [INCOERÊNCIA] golpe-de-forja · descricao
- **Hoje:** "sofrem 7d6 de dano de fogo e impacto e fazem um teste de Reflexos... quem passar sofre metade do dano e fica de pé, quem falhar cai no chão."
- **Livro:** Tipos de Dano: Resistência é por tipo; "Resistência de um tipo específico não faz nada contra os outros tipos."
- **Problema:** um dano de dois tipos de uma vez não tem regra de Resistência. "Fica de pé" não é efeito.
- **Correção:** "sofrem 4d6 de dano de Fogo e 3d6 de dano de impacto, e fazem Reflexos contra a sua DT de Gigante: quem passar sofre metade do dano e não cai, quem falhar fica Caído."
- **Decisão do Pedro?** sim, porque é a divisão dos dados.

### [LACUNA] arremessar-criatura · descricao
- **Hoje:** "Ela sofre 2d6 de dano e cai no chão, e quem estiver no caminho do arremesso sofre metade desse dano."
- **Livro:** Convenção 14: dano em área tem teste e metade no sucesso.
- **Problema:** sem tipo de dano, sem teste para quem está no caminho, e não diz que o agarrão acaba.
- **Correção:** "Ela sofre 2d6 de dano de impacto, fica Caída e deixa de estar Agarrada. Quem estiver no caminho faz Reflexos contra a sua DT de Gigante e, se falhar, sofre metade desse dano."
- **Decisão do Pedro?** não

### [LACUNA] coroa-de-raios · descricao
- **Hoje:** "quem te atacar corpo a corpo testa Reflexos... e sofre 4d6 de dano de raio, ou metade se passar, e cada ataque seu causa 2d8 de dano de raio a mais."
- **Livro:** Combate › Críticos: dado extra de habilidade entra uma vez só.
- **Problema:** sem limite por turno, quem ataca duas vezes leva duas vezes.
- **Correção:** "...quem te atacar corpo a corpo testa Reflexos... uma vez por turno dele."
- **Decisão do Pedro?** não

### [MELHORIA] golpe-congelante · descricao
- **Hoje:** "reduz o Movimento do alvo em 3 m até o fim do próximo turno dele."
- **Livro:** Perícias: bônus da mesma fonte não soma com ela mesma.
- **Problema:** não diz se vários acertos somam redução.
- **Correção:** acrescentar "Não acumula consigo mesmo."
- **Decisão do Pedro?** não

### [MELHORIA] peso-que-nao-para · descricao
- **Hoje:** "armas de porte grande".
- **Livro:** Tamanho › Equipamento: "arma... feitas para um tamanho".
- **Problema:** "porte grande" soma-se à categoria Grande e confunde.
- **Correção:** "armas feitas para o seu tamanho".
- **Decisão do Pedro?** não

### [MELHORIA] envergadura · descricao (e massa-colossal do Slime)
- **Hoje:** "seus ataques corpo a corpo alcançam 1,5 m além do que alcançavam antes" (Gigante) e "ganha mais 1,5 m de alcance para agarrar" (Slime).
- **Livro:** Tamanho: Grande 3 m, Enorme 4,5 m, Colossal 6 m; "o da tabela vale".
- **Problema:** o resultado bate com a tabela. O texto, porém, pode ser lido como soma extra em cima da tabela.
- **Correção:** "Seu tamanho passa a Enorme e seu alcance corpo a corpo passa a 4,5 m."
- **Decisão do Pedro?** não

---

## Padrões que se repetem

- **Campo `recuperacao: sessao` com texto "por descanso":** 18 poderes em todas as seis raças (Slime 4, Golem 4, Desperto 1, Mímico 2, Anão 3, Gigante 2, mais o gêmeo da Obra que Fica). Um único script de saneamento resolve.
- **Tipo de dano ausente:** armas naturais (Metálico, Pedra, Fera), dano devolvido, dano próprio e dano do arremesso. O Livro exige tipo.
- **"Dano físico comum" e "armas comuns":** termo que o Livro não tem. Usar "dano físico" ou "arma não mágica".
- **Vantagem para resistir a manobra:** a manobra é contra defesa passiva, sem rolagem do alvo. Trocar por "desvantagem de quem tenta".
- **"Uma ação":** vários traços escrevem "uma ação" onde o Livro pede uma das sete ações. O `tipo: acao` parece valer Ação Padrão, mas o texto devia dizer "Ação Padrão".
- **Zonas e gatilhos:** várias áreas testam só ao começar o turno ou só ao se mover. Convenção: entrar ou começar o turno.
- **Duração de zona/marca ausente:** Selo Ancestral, Runa de Guarda, Armadilha Armada.
- **Escrita dos tipos:** os traços usam "dano de gelo", "de fogo", "de raio". O Livro escreve Gelo, Fogo e Raio com maiúscula. Vale uma passada de grafia.
- **"Metade do dano" como defesa:** Slime Magmático e Gigantes de Gelo e do Fogo usam "cai pela metade". Funciona, mas o Livro tem Resistência por valor e ordem de aplicação (vulnerabilidade, depois Resistência). Vale dizer "depois da vulnerabilidade".

## Conferido sem problema

- **Slime:** Vida +3, Mana −2, Estamina +1 e Movimento 0 batem com a tabela do Livro. DT de Slime em `dt_efeitos` (Fortitude) bate com o uso nos poderes. Corpo Maleável, Amortecimento (queda pela metade, chão macio), Placas Cristalinas (Defesa 2 no campo e no texto), Liga Endurecida (Resistência por tipo), Respingo Incandescente, Sepultar em Gelo (teste repetido), estágios Volumoso e Colossal quanto a Vida e Estamina.
- **Golem:** Vida +5, Mana −2, Estamina +3 batem. Massa de Rocha (Resistência 3 impacto), Chapeamento (Defesa 3 no campo e no texto), Seiva Viva (vulnerabilidade a Fogo dobra, como o Livro), Brotar de Novo, Solda sobre Solda (+1 Defesa e Resistência 2 no campo e no texto), Corpo Construído (Ofício no lugar de Cura), Forma Refeita, Membro Improvisado. Tamanho na fisiologia confere com a tabela (Golem Grande e Golem Enorme).
- **Desperto:** Vida +4, Mana +2, Estamina +2 batem. Vontade +4 em `ajustes_pericias`, `legados_adicionais` 1 e a Herança do Retorno batem com Legados. Recusar o Fim (Ferido +1, Morrendo removido, reação mesmo inconsciente, uma vez por cena) segue Ficar com 1 de Vida e diz com todas as letras o que nega. Condições Ancestrais Julgado, Juramento, Chamado, Corpo Reconstruído (Cura trocada por Ofício ou Religião) e Retorno Profano (Fome do Túmulo) sem furo de aflição ou janela. Degrau do nível 20 já decidido.
- **Mímico:** Vida −1 e Mana +2 batem. Núcleo Exposto e Cara de Ninguém coerentes entre si. Faro Emprestado segue "Quem enxerga no escuro vê normalmente na escuridão natural". Peso de Mentira usa Resistência física geral. Boca Sem Dono, Rosto Estudado, Trejeito Roubado e Instinto de Camuflagem sem furo.
- **Anão:** Vida +2 e Estamina +3 batem. Tamanho Pequeno bate com o exemplo da tabela de Tamanho. Mãos de Ofício, Mão Treinada (usos por descanso no campo e no texto), Têmpera Certa (descanso, +1 soma por fontes diferentes), Runa Simples, Leitura da Pedra, Desabamento Calculado (impacto, metade em Reflexos, terreno difícil) e Armadilha Armada (Imobilizado com saída de Ação Padrão e Atletismo) seguem a convenção.
- **Gigante:** Vida +4, Mana −1, Estamina +3 batem. Tamanho Grande, Enorme e Colossal (nos exemplos da tabela de Tamanho: Gigante jovem, adulto e no topo da escada) e carga dobrada, que o Livro cita como exemplo. Pele de Rocha (Defesa 2 no campo e no texto), Arremesso de Rocha, Voz de Trovão (Surdo como condição), Descarga, Sopro Invernal e Bigorna Viva (clima ignorado como o Livro pede), Malho em Brasa (Fogo não repete no fim do turno).
