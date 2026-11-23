# Coerência das classes com as regras atuais (novembro de 2026)

Pedido do Pedro em 2026-11-19: conferir se as habilidades e os poderes das 29 classes seguem as regras que mudaram e as que foram criadas desde a revisão de outubro. Exemplos dele: uma habilidade que envenena tem de seguir o que o Livro diz sobre veneno, e o efeito que ela dá tem de ser o efeito do Livro.

- **Como foi feito:**
  - sete agentes, cada um com um grupo de classes;
  - cada um leu o núcleo do Livro inteiro (Combate, Tipos de dano, Condições, Aflições, Ferimentos, Descanso, Perigos, Magia e Fluxo, Elementos, Perícias, Ações coletivas, Poderes e Habilidades) e os tópicos que a classe toca;
  - depois, cada estágio, poder, opção de catálogo, `dt_efeitos`, bancada e evento foi conferido contra esse texto;
  - os achados graves foram conferidos de novo na sessão principal, no Livro e no código da ficha.
- **Base:** `data/ficha/classes.json` como estava em 2026-11-19 (sem alteração no worktree) e `data/regras/regras-publicas-v1.md` gerado em 2026-11-18.
- **Aplicado em 2026-11-19** (sem commit): as correções que não pediam decisão. Ver a seção "Aplicado" logo abaixo.

## Aplicado

O Pedro aprovou aplicar os achados marcados "Decisão do Pedro? não". Cada agente transformou os seus em trocas exatas, e um script conferiu cada trecho contra o arquivo antes de gravar. As listas estão em [`aplicado/`](aplicado/), uma por grupo, com o que entrou (`correcoes`) e o que ficou de fora e por quê (`pulados`).

- **250 trocas em `data/ficha/classes.json`:**
  - 242 vindas dos achados "não";
  - 8 da sessão principal: a "metade do dano no sucesso" na Bobina de Choque, no Frasco Congelante, no Veneno de Contato, no Ácido Corrosivo e no Avanço (já decidida no questionário de outubro, pergunta 8, resposta A), e a aflição do Comerciante que começava "num estágio mais alto".
- **Feito à mão:**
  - a Guarda Aberta entrou na `progressao` do Lutador, no nível 1;
  - as habilidades da Elementarista sem `acao` ganharam a ação;
  - a Marca Elemental ganhou `usos`.
- **Ficou de fora: 84 achados.** Os agentes reviram cada "não" e pularam o que, olhando de novo, criava número, limite ou benefício novo, ou dependia das regras gerais abaixo. Na conferência também saíram quatro `momento` repetidos da Hierarquia do Ninja, que ficavam confusos ao lado de Passivo.
- **Arquivos que mudaram junto:**
  - `data/regras/receitas-materiais.ts`: 8 receitas sincronizadas com as fórmulas, os projetos e o cardápio;
  - a referência de balanceamento (`npm run audit:balance`), porque o Lutador passou a ter uma habilidade a mais na grade;
  - quatro testes que travavam o texto antigo (`cartistaCartas`, `classProgression` em dois pontos, `interceptadorPacote`);
  - o mural, com a entrada `2026-11-19-classes-de-acordo-com-o-livro`.
- **Testes:** `npm run test:frontend` passa (1.879) e os testes do servidor que leem as classes passam (164 + 139).
- **Não regerado:** os PDFs do Livro. O compêndio imprime as classes, então eles ficam para quando for commitar (`npm run docs:livro` e `npm run docs:livro:mestre`).

Continua valendo tudo o que está marcado "sim" nos relatórios.

## Regras gerais decididas (2026-11-20)

O Pedro respondeu as oito perguntas das regras gerais. Tudo foi escrito no Livro (`data/regras/regras.ts`, `condicoes.ts`, `veiculosCombate.ts`), e o Livro público e o editorial foram regerados.

| Pergunta | Resposta | Onde ficou |
|---|---|---|
| Vida temporária soma? | Sim, entre fontes diferentes (o Pedro corrigiu a primeira resposta, "vale a maior") | Ferimentos › Vida temporária. A mesma fonte usada de novo troca o valor dela, como nos bônus. Na ficha, o botão +temp soma (`ganharTemporario`). |
| Fogo, veneno, ácido e sangramento fora da magia repetem? | Não: caem uma vez | Tipos de dano › As cinco famílias. Só repetem com a condição (Queimando, Envenenado, Sangramento) ou quando a fonte diz. |
| Cair com 1 de Vida | Déficit some, sem Morrendo e sem Ferido, sem salvar da morte na hora | Ferimentos › Ficar com 1 de Vida. O trauma por golpe de metade da Vida continua. |
| Resistências e reduções de fontes diferentes | Somam | Tipos de dano › Resistência e ordem de aplicação. A ficha já somava. |
| Rolar de novo | Uma vez só por teste ou dado | Perícias › Rolar de novo e somar bônus. |
| Grade das classes | Nota de exceção | Poderes e Habilidades › A grade de uma classe (Elementarista, Viajante, Ninja). |
| Incorpóreo | Definir no Livro | Condição nova, benéfica: atravessa, não é agarrado, derrubado nem empurrado, metade do dano físico que não venha de magia. |
| Bônus no mesmo teste | Somam sem teto | Perícias › Rolar de novo e somar bônus (Ajudar e Prestígio mantêm o limite próprio). |

Feito junto, sem decisão:
- **Grau de perícia:** as especiais dão dois graus por entrega.
- **Zona de Magma:** pede Reflexos com metade, como a convenção das zonas e a Elementarista.
- **Fumaça:** deixa camuflado, igual ao Combate, no Livro e na Elementarista.
- **Veículos:** a Resistência geral funciona como redução de dano.
- **Links:** "Vida temporária" virou termo com link para o Livro, e o resumo de Ferido passou a dizer "qualidade Boa".

**A sobra da cura (decidido depois, em 2026-11-20):** a ficha, a sessão e o token transformavam a cura que passa do máximo em Vida temporária. O Pedro decidiu que a sobra se perde.
- **Livro:** diz "a cura enche a Vida até o máximo, e o que passar se perde".
- **Ficha:** `atualizarStatusVital` para no máximo, e a Vida temporária entra por `ganharTemporario`, que soma com a que já havia. Ela tem um botão **+temp** ao lado do nome de cada barra (Vida, Mana, Estamina e Sanidade).
- **Sessão e token:** `sessions.py` e `recursos_token.py` também param no máximo. Na Sessão, o Mestre continua anotando a Vida temporária no campo próprio do editor.
- **Testes:** `statusRules`, `estamina`, `test_recursos_token` e `test_extra_temporario_sessao`. Este último roda só com banco e não rodou, porque o Docker não subiu.

## Decisões por classe (2026-11-23)

O Pedro delegou as decisões que sobraram ("pode tomar as decisões você mesmo"). A sessão principal escreveu os critérios ([`aplicado/decisoes/CRITERIOS.md`](aplicado/decisoes/CRITERIOS.md)). Os sete agentes aplicaram esses critérios a todo achado "sim" e a todo achado pulado na primeira rodada, e a sessão principal leu cada troca antes de gravar. As listas por grupo estão em [`aplicado/decisoes/`](aplicado/decisoes/): o que entrou (`correcoes`), o que uma regra geral já resolveu (`resolvidos`) e o que ficou como está, com o motivo (`mantidos`).

- **Em números:** 419 trocas gravadas, 38 achados resolvidos pelas regras gerais e 38 mantidos de propósito.
- **Os critérios, em resumo:**
  - o Livro manda, e a exceção que a classe precisa vem escrita com todas as letras;
  - combate volta por descanso, e história e informação, por sessão;
  - dano verdadeiro só do nível 15 em diante;
  - todo dano tem tipo e rolagem;
  - ataques de reação com o −2 do Contra-Ataque, a não ser que o poder diga outra coisa;
  - empurrões com a trava de tamanho do Livro;
  - Defesa contra magia vale também nas resistências;
  - itens de graça não se vendem nem se seguram;
  - contatos de classe como Conhecido ou Amigo, fora do limite;
  - na dúvida, texto coerente sem mudar a força do poder.
- **Ajustes da conferência:**
  - o Socorro de Emergência voltou a não salvar da morte na hora: o agente tinha deixado salvar, e isso fortalecia demais uma Reação de três usos por cena;
  - a Mesa da Celebração ficou como estava;
  - nove durações "Este combate" e cinco frases com "combate" viraram "cena";
  - o Instinto Predador, a Descarga do Catalisador e o Mago deixaram de citar pelo nome habilidades de nível alto, que exigiriam pré-requisito;
  - a Invocação Ascendida e o Socorro de Emergência foram reescritos para não quebrar os testes que já os cobriam.
- **Testes que travavam o texto antigo:** cinco asserções de `classProgression` foram atualizadas (Munição Especial, Milagre, Estrela Eterna, Levanta!, ficha técnica de Meus Filhos). A trava nova (`revisaoClasses.test.ts`) passa sem nenhum caso.
- **Receitas:** mais 12 cópias sincronizadas em `receitas-materiais.ts`.

## Em números

465 achados: **31 erros**, **100 incoerências**, **210 lacunas** e **124 melhorias**. Em 241 deles o agente marcou que a correção depende de você.

- **Erro:** contradiz o Livro.
- **Incoerência:** o campo da ficha diz uma coisa e o texto outra, ou duas partes da classe discordam.
- **Lacuna:** falta um dado que a regra exige (duração, teste, tipo de dano, como sair).
- **Melhoria:** funciona, mas fica mais claro ou mais ligado ao Livro.

| Grupo | Classes | Achados | Relatório |
|---|---|---|---|
| Marciais A | Guerreiro 15, Espadachim 10, Lutador 13, Atirador 13, Guardião 12 | 63 | [marciais-a](grupos/marciais-a.md) |
| Marciais B | Ninja 17, Caçador 20, Piloto 22, Interceptador 15 | 74 | [marciais-b](grupos/marciais-b.md) |
| Sociais | Médico 25, Pop Star 18, Comerciante 21, Detetive 15 | 79 | [sociais](grupos/sociais.md) |
| Ofícios | Engenheiro 16, Alquimista 24, Chef 12 | 52 | [oficios](grupos/oficios.md) |
| Mágicas | Canalizador 14, Sintonizador 16, Ritualista 13, Elementarista 11 | 54 | [magicas](grupos/magicas.md) |
| Especiais A | Campeão 12, Pirata 14, Cartista 11, Guia 14, Escritor 12, Viajante 14 | 77 | [especiais-a](grupos/especiais-a.md) |
| Especiais B | Caçador das Almas 27, Invocador 19, Devorador 20 | 66 | [especiais-b](grupos/especiais-b.md) |

Cada achado traz o trecho atual, o trecho do Livro que ele contraria, o problema e um texto pronto para colar. Nenhuma sugestão troca `id`.

## O que está bom

- **As sete ações:** as 1.117 entradas com ação usam só Passivo, Ação Livre, Ação de Movimento, Ação Padrão, Ação Completa, Reação ou Fora de combate.
- **Tipos de dano do questionário:** não sobrou dano "psíquico", "espiritual" nem "de Energia". "Espiritual" ainda aparece no Caçador das Almas, mas só como descrição (chamas espirituais, controle espiritual), e o dano é de Essência.
- **Receitas:** as cópias em `data/regras/receitas-materiais.ts` batem palavra por palavra com o Alquimista, o Chef e o Engenheiro.
- **Tom:** nenhum relatório achou travessão, "eco" nem a antítese nos textos das classes.
- **A maior parte das janelas** já foi para "por descanso" na troca de 2026-11-12. Sobraram os casos listados abaixo.

## Achados que a conferência corrigiu

- **Grau de perícia duplo das especiais:** os dois agentes das especiais apontaram o `quantidade: 2` como erro. É de propósito: as 12 classes especiais dão dois graus por marco (o Pirata também, ao contrário do que um relatório diz), e a ficha lê o campo (`classeService`, `subidaNivel`). O furo é do Livro: "Grau de perícia" diz "um degrau" e não cita a exceção. Correção: uma frase em Poderes e Habilidades.
- **Guarda Aberta (Lutador):** é a única habilidade das 29 classes que nenhum nível da `progressao` entrega. A Defesa sem armadura funciona porque `equipamentoService` soma pela classe, mas o card não chega pela grade.

## Furos que estão no Livro, não nas classes

Estes pedem uma regra geral. Cada uma resolve dezenas de achados de uma vez.

1. **Vida temporária.**
   - Aparece 25 vezes nas classes (mais 3 de Mana ou Estamina temporária).
   - O Livro só cita o termo na dádiva Vitalidade e nunca diz como funciona.
   - A ficha já trata: guarda à parte, acima do máximo, gasta primeiro (`statusService.gastarComTemporario`) e zera no descanso.
   - Falta escrever se duas fontes somam ou se vale a maior, quando acaba e se a cura repõe.
   - **Proposta A:** "A Vida temporária é gasta antes da Vida. Ela não soma com outra (vale a maior), a cura não repõe, e ela some no fim da duração da fonte ou no descanso." O mesmo para Mana e Estamina temporárias.
2. **Dano de Fogo, veneno, ácido e sangramento fora da magia.**
   - Tipos de dano diz que essa família "bate de novo no fim do turno até alguém remover".
   - Só a magia tem exceção ("o dano de Fogo de uma magia cai uma vez").
   - Golpes de classe com Fogo, veneno ou ácido (Cinzas do Fim, Essência Adaptável, Fagulha da Salamandra, Presa da Aranha, Veneno de Contato, Ácido Corrosivo) ficam sem saber se repetem.
   - **Proposta A:** a exceção vale para toda fonte. O dano cai uma vez, e só continua quando o texto deixa a condição (Queimando, Envenenado, Sangramento) ou diz que continua.
3. **"Fica com 1 de Vida" ao cair.**
   - Uns dez efeitos fazem isso: Bandeira Fincada, Levanta! e Último Laço (Guerreiro e Guardião), Último Round, Socorro de Emergência, Mestre da Vida, Estrela Eterna, Âncora de Emergência, Memória da Última Refeição.
   - Nenhum diz o que acontece com o Déficit, com a morte na hora (Déficit igual à Vida máxima), com Morrendo, com Ferido 1 e com a tabela de trauma.
   - **Proposta A:** uma frase em Ferimentos: "Efeito que deixa você com 1 de Vida ao cair apaga o Déficit, e você não fica Morrendo nem ganha Ferido. Ele não vale contra a morte na hora, salvo se disser."
4. **Rerrolagem em cima de rerrolagem.**
   - Mão Experiente, Mão Firme e Eu Sei Curar (Médico), Bis (Pop Star), Cláusula de Saída (Comerciante) e a maestria de Carisma podem cair no mesmo dado.
   - **Proposta A:** "Cada dado ou teste só é rolado de novo uma vez, venha de onde vier."
5. **Empilhamento.** O Livro não diz se somam:
   - duas Resistências ao mesmo tipo vindas de fontes diferentes (Pirata);
   - duas reduções de dano (as três do Sintonizador quase zeram dano de magia do Fluxo);
   - dois −2 de Defesa iguais ao Exposto mas sem o nome;
   - bônus sociais de classe (a Pop Star chega a +13 num teste).
6. **Grau de perícia das especiais:** escrever a exceção (ver acima).
7. **A grade das classes.** O Livro diz que as 29 seguem a mesma grade, mas:
   - a Elementarista tem 10 habilidades, 13 poderes e só 3 eventos (falta o do 12);
   - o Viajante tem 13 poderes (o Livro diz de dez a doze);
   - o Ninja tem um evento a mais no 17.
   - Ou o Livro ganha uma nota de exceção, ou as classes se ajustam.
8. **Criatura incorpórea:** a Etérea (Atirador), os Punhos Fantasma (Lutador) e o Navio Fantasma usam o termo, e nenhum tópico o define.
9. **O Livro contra ele mesmo:**
   - a zona de Magma em Elementos não tem teste, e a Elementarista pede Reflexos com metade (pela convenção das zonas, a classe está certa);
   - a Fumaça em Elementos dá "cobertura parcial" e o Combate trata fumaça como camuflagem;
   - Veículos ainda manda "subtrair a Resistência geral" do veículo, contra a regra de Resistência por tipo.

## Padrões nas classes (corrigir texto, sem decisão)

- **DT:**
  - "Fácil do seu nível" nas bancadas do Engenheiro, Alquimista, Chef e Comerciante (o Livro tem Rotineira, Padrão e Difícil, em Perícias, e não em Sistema Base);
  - DT 15 fixa nas manobras do Piloto (o Livro manda a DT Padrão do nível da cena);
  - "15 + metade do VD" no Interceptador e no Detetive (no VD 20 dá 25, e a tabela diz 30);
  - o teste do rito do Ritualista sem a metade do nível;
  - Cura DT 15 do Médico, Atuação DT 15/20 da Pop Star e Pulo Duplo DT 18 do Ninja sem ajuste de nível.
- **Ajudar:** a bancada do Ritualista ainda dá DT 10 a quem ajuda, e o Assistente Treinado resolve um problema que a regra nova não tem mais.
- **Palavras que o Livro não conhece:**
  - descanso "Bom", "Ótimo" e "adequado" (Caçador, Pop Star, Viajante; o certo é Boa e Maravilhosa);
  - "desastre" e "falha comum" (Cartista, Escritor, Guerreiro, Engenheiro);
  - "ritmo acelerado" no lugar de Forçado (Viajante);
  - "terreno ruim", "penalidade ambiental" e "ambiente tóxico";
  - "por missão", "por rito", "uma vez por teste" e "a cada cinco sessões";
  - "combate" no lugar de cena ("este combate", "cada combate", "fim do combate");
  - "Grau em Luta" no lugar de "bônus do grau";
  - "categoria de alcance" no lugar de faixa;
  - Percepção para notar mentira, quando o certo é Intuição (Detetive).
- **Resistência genérica abolida:**
  - "Resistência 3 contra dano de área" (Cobertura!, Guerreiro);
  - "Resistência 5 a dano de área" (Cabine, Piloto);
  - "Resistência 5 contra dano vindo de fora" (Proteção, Ritualista);
  - todas viram "reduza em X o dano de cada golpe".
- **Janela "por sessão" em efeito de combate:**
  - Munição Especial (Atirador) e Armas de Qualidade (Guerreiro);
  - Grande Oficiante (Ritualista) e Dose da Pedra (Alquimista);
  - Mesa da Celebração (Chef) e Banquete Final (Devorador);
  - Escapa Sozinho (Piloto) e Plantão (Médico).
  - No sentido contrário, a Rede de Informantes do Detetive dá informação por cena, e informação é por sessão.
- **Ações:**
  - "sem gastar ação" com o campo em Ação Livre (Pilar da Dimensão, Arcano Absoluto, Voz da Deidade, Convergência Segura, Sombra Suprema, Ás Impossível);
  - Passivo em coisa que o jogador aciona;
  - Ação Padrão ou Completa em coisa que é de fora de combate;
  - ação faltando (Elementarista, instintos do Devorador, Fio Implacável);
  - a Latência do Interceptador é Reação e depende de outra Reação na mesma rodada, então nunca roda.
- **Dano com teste e sem metade no sucesso** (a convenção que o questionário mandou valer nas classes): Bobina de Choque, Veneno de Contato, Frasco Congelante, Avanço, Último Round, Munição Explosiva. Dano sem ataque e sem teste: Ácido Corrosivo, Essência Volátil, Artilharia do Engenho Divino.
- **Magia:**
  - bônus de Defesa "contra magia" não vale contra magia de efeito, que não rola contra a Defesa (Contrafluxo, Ressonância Compartilhada, Convergência Segura, Firewall de Fluxo);
  - "+2 na DT de conjuração" piora a magia, porque essa DT é o número fixo do círculo (Forma de Área, Voz da Deidade).
- **Condição escrita sem o nome:**
  - −2 de Defesa no lugar de Exposto (uns dez casos);
  - +3 m de Movimento no lugar de Apressado (quatro);
  - "cai" no lugar de Caído e "invisível" no lugar de Invisível ou Revelado;
  - +2 de Defesa no lugar de Resguardado.
  - Sem o nome, não vira link e soma com a condição de verdade.
  - Na Finta, no Combo e no Núcleo Exposto, o Exposto tem outra duração e o texto não avisa que muda a regra.
- **Nomes que colidem com regra:** Fúria (crise de Sanidade), "Provocado", Prestígio de Caçador, Camuflagem, Fôlego Extra, Contra o Choque, Reputação de Bom Pagador.
- **Ataques de reação** (Errou Perto de Mim, Riposte, Sentinela, Juramento do Punho, Ninguém Passa!) sem dizer se mantêm o −2 e o "sem crítico" do Contra-Ataque e do Ataque de Oportunidade.
- **Empurrar, puxar e derrubar** sem a trava de duas categorias de tamanho (Campeão, Pirata, Cartista, Atirador, Lutador).
- **Redução de dano** sem "depois da Resistência" e sem a exceção do dano verdadeiro.
- **Dano sem tipo** (dado extra, mordida, arma natural, "dano físico" solto).
- **Contatos de classe** sem Confiança, ramo, limite de contatos, Favor e Dívida (Piloto, Escritor, Viajante, Ninja, Caçador, Comerciante, Detetive, Pop Star).
- **Aliados no turno do dono:**
  - o Livro só abre essa exceção para o Invocador;
  - o Companheiro do Caçador, o Guarda-Costas do Escritor e o espectro das Cinzas do Fim agem no seu turno sem declarar a exceção.

## Os erros mais graves, um por linha

- **Detetive, Primeira Leitura:** diz que a pista central depende do teste, e o Livro dá a pista essencial sem rolar.
- **Médico, Milagre:** devolve membro perdido sem ser Regeneração de Fluxo, e usa "a cada cinco sessões".
- **Ritualista:** bancada com DT 10 para quem ajuda e teste do rito sem a metade do nível.
- **Interceptador:** DT de criatura "15 + metade do VD" e a Latência que nunca roda.
- **Piloto:** DT 15 fixa nas manobras e "Resistência a dano de área" na Cabine.
- **Canalizador:** Forma de Área piora a magia, e Contrafluxo e Voz da Deidade misturam a Defesa e a DT.
- **Campeão Dimensional, Rasgar:** dano verdadeiro num poder do nível 2, sem teste. O Livro guarda esse dano para habilidade de topo.
- **Caçador das Almas, Máscara do Vazio:** descreve dano verdadeiro sem usar o nome.
- **Espadachim, Finta:** o Exposto acaba no começo do turno do alvo, antes do ataque que ele deveria ajudar.
- **Comerciante, Mercado Mundial e Seguro:**
  - "itens publicados" inclui criatura, propriedade, implante e Fruto, que não "voltam ao fornecedor";
  - o Seguro paga metade do valor de um item recebido de graça.
- **Devorador:**
  - não existe regra para esvaziar um slot;
  - o Banquete Final pode gravar a Reconstrução (voltar da morte) e habilidades de Deidade.
- **Alquimista e Chef:** as opções já saem em Ação de Movimento, então a melhoria do nível 5 (Mão Rápida, Serviço Rápido) não muda nada.

## Ordem sugerida

1. **Correções sem decisão:** feitas em 2026-11-19 (ver "Aplicado"). A lista de padrões acima continua útil para o que foi pulado.
2. **As regras gerais** desta página: Vida temporária, dano persistente fora da magia, cair com 1 de Vida, rerrolagem e empilhamento. Cada uma fecha de 10 a 30 achados de uma vez.
3. **As decisões por classe**, marcadas "sim" em cada relatório. As maiores:
   - o dano verdadeiro do Rasgar;
   - o Milagre do Médico;
   - a Primeira Leitura do Detetive;
   - o Seguro do Comerciante;
   - os slots do Devorador;
   - as reduções somadas do Sintonizador;
   - a Troca Instantânea, que reativa o catalisador.
4. **Uma trava em teste** no molde do `revisaoClasses.test.ts`. Ela proibiria a volta de:
   - "Fácil do seu nível" e "15 + metade do VD";
   - "Resistência ... a dano de área";
   - "este combate";
   - "sem gastar ação";
   - descanso "Bom".

Mudar os textos das classes mexe também nos PDFs do Livro (o compêndio imprime as classes) e, se o jogador notar, pede uma entrada no mural de novidades.
