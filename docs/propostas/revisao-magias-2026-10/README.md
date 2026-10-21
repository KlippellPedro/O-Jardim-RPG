# Revisão das magias e das classes mágicas (outubro de 2026)

Dezenove revisores, um por Fluxo (mais um para as magias universais e as regras gerais) e um por classe mágica, leram o catálogo inteiro procurando o que está errado, incoerente, sem sentido ou que pode melhorar. Ninguém alterou o repositório: esta pasta é só leitura e proposta.

- **Revisado:** 352 magias, 35 rituais, 33 selos, 33 encantamentos, 11 fusões, a roda de vantagens e as 7 classes de `regras.classes_magicas` (Canalizador, Sintonizador, Ritualista, Invocador, Cartista Arcano, Interceptador, Elementarista), com o código que liga classe e magia (ficha, servidor, livro).
- **Achados:** 434 no total, sendo **63 erros**, **211 incoerências** e **160 melhorias**.
- **Relatórios completos:** [`fluxos/`](fluxos/) (11 Fluxos e [`universais-e-regras.md`](fluxos/universais-e-regras.md)) e [`classes/`](classes/). Cada achado traz o id, o campo, o problema e uma sugestão concreta.
- **Base:** `data/ficha/magias.json` e `data/ficha/classes.json` no commit `486e043`. Os 158 testes de magia e progressão de classe passavam no começo da revisão.

Alguns achados graves foram conferidos à mão nos dados depois dos relatórios (vantagem do Físico, campos `defesa` vazios, Palavra de Morte, pré-requisito da Ruptura Derivada, Acesso Administrador duplicado, mapa de Árvores, textos truncados). Todos se confirmaram.

## Aplicado em 2026-10-20 (sem commit)

As correções baratas da "Ordem sugerida" entraram nos dados, com uma exceção, explicada mais abaixo. Os ids ficaram iguais, então nenhuma ficha perde escolha.

- **Ruptura Derivada:** o pré-requisito virou "Derivações Harmônicas 1". Conferido na ficha e no servidor: o poder libera no nível 13 e continua bloqueado no 12.
- **Vantagem do Físico:** `fisico.vantagem_contra` ganhou `comunicacao`.
- **Campos `defesa`:**
  - Salto Improvável: "Reflexos se involuntária";
  - Labirinto Dobrado e Domínio da Matriz: "Vontade se hostil";
  - Domínio do Ritmo: "Fortitude se hostil";
  - Controle de Massa: "Fortitude".
- **Textos quebrados:** Varredura de Padrão e Colheita.
- **Títulos e textos com "eco":**
  - a fusão do Tempo virou Prorrogação, em `magias.json` e na opção do Sintonizador;
  - as magias viraram Repetição Curta e Repetição de Batalha;
  - a Marca do 6º círculo do Tempo virou Passo Repetido;
  - a técnica do Interceptador virou Refluxo Hostil, na classe e na página dela;
  - `velorio-do-ciclo` e `ultimo-adeus` trocaram "eco" por "resíduo", "lembrança do morto" e "o morto".
- **Invocador:** as Formas Vinculadas citam as seis formas, "Grito de Guerra" saiu da Convergência e o catálogo diz "30 fichas das seis linhas".
- **`regras.ts`:** "os outros nove Fluxos naturais".
- **Arquivos regerados pelos geradores do projeto:**
  - `regras-editorial.json` (`npm run generate:editorial-rules`);
  - a referência e o relatório de balanceamento (`npm run audit:balance`);
  - o mural (`npm run novidades:gerar`, com entrada nova em `novidades-manuais.json`);
  - os dois PDFs do Livro (`npm run docs:livro:mestre`), cujas páginas não mudaram.
- **Testes:** 1316 testes do front e 130 do servidor (`test_character_rules`, `test_content_seed`) passam.

### Decisão 1 (Fluxo nativo): A + 1, implementada em 2026-10-20 (sem commit)

- **Regra:** o Fluxo nativo vem da Árvore. Quem nasce na A.X.I.S tem Comunicação, e o Autômato é a única raça com Tecnologia de nascença. A Universal continua sem nativo.
  - Código: `obterFluxoNativoId` em `src/services/magiaService.ts`. O campo `fluxoNativoId`, que ninguém gravava, saiu.
- **Escolha do Canalizador:** só vale e só aparece para ficha sem Árvore.
  - Dados: `so_sem_arvore` em `escolha_opcoes`.
  - Código: `escolhasHabilidadeDisponiveis`. Uma escolha antiga que já estava salva não é apagada; o motor só a ignora.
- **Fluxo instalado:** campo `fluxosInstaladosIds` na ficha, que abre aprender e conjurar magias, rituais, selos e encantamentos daquele Fluxo, sem dar Marca.
  - Só o Mestre marca, na aba Magias, onde o jogador vê o Fluxo instalado sem poder mexer.
  - No servidor, `_validar_fluxos_instalados` faz a mudança vinda do jogador virar "Alerta de Regras na Ficha" para o Mestre, como as outras concessões.
- **Migração 56 (`fluxo_instalado_da_axis`):** a ficha da A.X.I.S que não é Autômato e já conhecia algo de Tecnologia ganha a Tecnologia instalada. A versão da ficha sobe, para nenhuma aba aberta sobrescrever a mudança.
  - A lista de ids de Tecnologia ficou congelada em `IDS_DE_TECNOLOGIA_DA_MIGRACAO_56`.
- **Textos:**
  - o capítulo Magia e Fluxo, nas duas partes, do jogador e do Mestre;
  - o aviso da A.X.I.S na criação;
  - a habilidade e a página do Canalizador;
  - o mural.

  O Livro foi regerado e o PDF do Mestre ganhou uma página.
- **Testes:**
  - `tests/frontend/fluxoNativoEInstalado.test.ts` (novo);
  - o teste do Interceptador passou a esperar Comunicação;
  - `TestFluxoInstalado` em `plataforma/tests/test_character_rules.py`;
  - `plataforma/tests/test_fluxo_instalado_da_axis.py`, que é o teste da migração no banco.

  Passam 1320 testes do front e 135 do servidor. O teste da migração também passou num Postgres descartável, onde a cadeia de migrações foi aplicada inteira até a 56.
- **Conferido na tela**, com a API apontando para o banco descartável e uma conta de teste de Mestre:
  - Lyra, humana nascida na A.X.I.S: a aba Magias mostra "Fluxo nativo: Comunicação" e a Marca de Comunicação.
  - Na mesma ficha, ao instalar a Tecnologia, apareceram "Instalado: Tecnologia" e o filtro "Meus Fluxos (Comunicação + Tecnologia)", com magias dos dois Fluxos. A ficha salvou sem alerta de regras.
  - Bram, Canalizador sem Árvore: a escolha aparece com o texto novo, e o Fluxo nativo é o Vazio. Na Lyra, que tem Árvore, a escolha não aparece.
  - Na criação, ao escolher a A.X.I.S, aparece o aviso novo.

### Decisão 2 (vagas de selo, encantamento e ritual): B, implementada em 2026-10-20 (sem commit)

- **Regra por classe:** `fluxosParaAprenderManifestacao` em `src/services/magiaService.ts`.
  - **Ritualista:** aprende ritual, selo e encantamento de qualquer Fluxo natural. O Fim dá o aviso de autorização sem bloquear (`avisoFluxoDaManifestacao`), a Tecnologia só entra instalada e os Ritos dos Sete seguem só por concessão.
  - **Sintonizador:** aprende selo e encantamento também dos Fluxos dos catalisadores preparados na hora de aprender. Ritual, não.
  - **Os outros:** só do Fluxo nativo e dos instalados.
- **Vagas:**
  - Canalizador e Cartista Arcano param em 3 de selo e de encantamento.
  - O Sintonizador continua com 11.
  - O Ritualista continua com 6 de selo e de encantamento e 7 de ritual.
- **Servidor:** quem já tinha mais do que as vagas novas (só possível na Árvore Universal) mantém o que tem e não aprende mais, sem alerta a cada salvamento (`_validar_manifestacao_magica`).
- **Aba Magias:** o filtro "Meus Fluxos" das abas de ritual, selo e encantamento segue a regra da classe, e a confirmação de aprender mostra o aviso do Fim.
- **Textos:**
  - o Livro (Magia e Fluxo; e Rituais, Selos e Fusão, com uma seção nova "De que Fluxo se aprende");
  - o Livro de Rituais do Ritualista e a Sintonia Catalisada do Sintonizador;
  - o catálogo de rituais;
  - o mural.

  Os PDFs foram regerados.
- **Testes:**
  - `tests/frontend/aprendizadoDeManifestacoes.test.ts` (novo);
  - os ajustes de vagas em `magicRules` e `progressaoMagiaClasse`; a comparação da "mesma coluna" agora olha só a parte de magia, que é o que o Livro afirma;
  - `TestVagasDeSeloQueEncolheram` no servidor.

  Passam 1324 testes do front e 136 do servidor.
- **Conferido na tela:**
  - Ritualista de Gênese: o catálogo de rituais abre em "Meus Fluxos (10 Fluxos)", com ritos de Gênese, Tempo e Vazio e sem os de Tecnologia.
  - Sintonizador com catalisador de Tempo: o catálogo de selos abre em "Meus Fluxos (Origem + Tempo)", sem os selos do Vazio.

### Decisão 3 (Físico no 2º, 6º e 9º): C, implementada em 2026-10-20 (sem commit)

- **Liberadas da lista elemental** (`regras.acesso_elemental.magias_elementais_ids`, de 21 para 18): Armadura de Matéria (2º), Muralha do Baluarte (9º) e Égide de Moros (10º).
  - A armadura e a muralha passam a ser "de pedra ou metal, ou do elemento declarado se o conjurador tiver um".
  - A descrição truncada da Muralha foi corrigida.
  - A Elementarista continua aprendendo as três.
- **Magia nova:** Poço de Gravidade (`poco-de-gravidade`, 6º, controle de área, 19 de Mana, Cena com concentração, Fortitude, sem dano). Quem falhar anda pela metade, sofre -2 em ataques à distância e em Reflexos e cai se estiver voando; os aliados escolhidos ignoram o efeito. O catálogo passa a ter 353 magias, e o Físico 31, como Espaço e Vazio.
- **Resultado:** todo círculo do Físico tem magia livre. O Cartista de Físico ganha a Armadura de Matéria, que tem Cartomancia.
- **Arquivos regerados:** a referência e o relatório de balanceamento (sem alerta para a magia nova), o mural e os PDFs do Livro. A voz do Sábio para o título novo ficou pendente, pelo mesmo erro 403 de antes.
- **Testes:** `tests/frontend/fisicoNaoElemental.test.ts` (novo). Passam 1327 testes do front e 1288 do servidor.
- **Fica para depois:** o caminho livre do Físico continua sem ataque próprio do 1º ao 9º. Se fizer falta, a Pancada Cinética proposta no relatório do Físico (2º) resolve.

### Decisão 4 (acesso elemental): A, implementada em 2026-10-20 (sem commit)

- **Regra:** uma magia Elemental só pode ser aprendida até o círculo que os níveis da própria Elementarista liberam, ou seja, os `marcos` da `progressao_magia` dela. Fica assim: 2º no nível 1, 4º no 5, 6º no 10, 8º no 15 e 10º no 20. O círculo que outra classe da ficha libera não conta mais.
  - Um Canalizador 20 que pega 1 nível de Elementarista aprende Elementais só até o 2º.
- **Na ficha:**
  - `circuloDaElementarista` (`magiaService.ts`) dá esse teto.
  - `magiaElegivelParaAprender` recusa com o motivo "Magia Elemental só até o Nº círculo...".
  - A conjuração (`podeConjurarMagia`) não mudou, então o que já foi aprendido continua conjurável.
- **No servidor:** `_erro_acesso_elemental` (`character_summary.py`, chamada em `_validar_magias`) confere só as magias Elementais novas, que não estavam na ficha anterior. Ela confere:
  - a classe Elementarista;
  - o elemento de origem (Afinidade Elemental, Caminho do Avatar ou Polifonia);
  - o Avatar desperto, para as magias do Avatar;
  - o círculo.

  Como as outras regras de ficha, o que ela encontra vira alerta para o Mestre e não bloqueia o salvamento.
- **Textos:**
  - `acesso_elemental.descricao` em `magias.json`;
  - as duas passagens de `regras.ts` sobre as Elementais;
  - uma entrada no mural.

  As regras editoriais e os PDFs do Livro foram regerados.
- **Testes:**
  - front: os testes novos em `tests/frontend/fisicoNaoElemental.test.ts`;
  - servidor: a classe `TestAcessoElemental` em `test_character_rules.py`.

  Passam 1329 testes do front e 1655 do servidor (a suíte inteira, num Postgres descartável).

### Decisão 5 (ataque × resistência): A, implementada em 2026-10-20 (sem commit)

- **Regra:** no tópico Magia e Fluxo entrou a seção "Ataque e resistência".
  - **Magia de ataque:** o total é lido contra a Defesa, com crítico no 20 natural, e o dano entra inteiro. A resistência listada vale só para o efeito extra. Sem resistência listada, o efeito extra acontece sempre que a magia acerta.
  - **Magia de efeito:** o alvo rola a resistência contra o total. Se a magia causa dano, quem resistir sofre metade.
  - **Resistência "se hostil":** só é rolada por quem não quer o efeito. Nas magias que encerram efeitos, quem rola é a criatura hostil que mantém o efeito.
- **Dados em `magias.json`:**
  - As cinco Elementais que já reduziam o dano à metade no sucesso passaram a `ataque: false`: Impacto, Rajada, Lança, Aríete e Julgamento dos Elementos. Agora são 69 magias de ataque.
  - A Lança deixou de "reduzir pela metade a redução da armadura", frase que não fazia nada, e passou a ignorar a Resistência de armadura mundana. O Julgamento perdeu o "Em falha, role".
  - 18 ataques sem efeito extra para resistir ficaram com `defesa: null`: Último Ponto, Golpe Terminal, Lança de Íons, Arma de Fluxo e outros. Os outros 51 mantêm a resistência do efeito extra.
  - O Impacto Colossal e o Corte Dissipador foram reescritos para dizer o que a resistência evita.
  - "Defesa do efeito se hostil" (5 magias de encerrar efeito) virou "Vontade se hostil", e "Reflexos se involuntária" (Salto Improvável) virou "Reflexos se hostil".
- **Aba Magias:**
  - O cartão mostra "Contra a Defesa" e "Efeito extra: X" nos ataques, e "Resistência: X, metade do dano" nas magias de efeito.
  - O campo "Defesa do alvo" só aparece em ataque.
  - O resultado da conjuração diz se acertou a Defesa informada e o que o alvo precisa rolar.
  - A origem da rolagem leva `ataque`.
  - As funções ficam em `rotulosContraOAlvo` e `leituraContraOAlvo` (`magiaService.ts`), e o Compêndio do PDF usa as mesmas etiquetas.
- **Conferido no navegador** (banco de revisão): Ruído de Canal com Defesa 14 e Grito Dissonante dão as frases certas.
- **Testes:** `tests/frontend/ataqueEResistencia.test.ts` (novo). Passam 1335 testes do front e os 139 de regras e conteúdo do servidor, que não mudou.

### Decisão 6 (Invocador): A, implementada em 2026-10-20 (sem commit)

- **O que a classe é:** o Pacto passou a ser de Fluxo de verdade. As invocações são feitas do Fluxo nativo, que dá a aparência delas, e atacam com o teste de conjuração (d20 + Mod. Fluxo + metade do nível total + Grau de Misticismo) contra a Defesa. A classe continua sem círculos e continua em `classes_magicas`.
- **O pacote**, no estágio 1 do Pacto (`pacto-de-genese`; o id não mudou):
  - até duas invocações em cena, e as outras ficam guardadas;
  - elas agem logo depois do turno do Invocador, cada uma com as próprias ações;
  - os testes de resistência delas usam os bônus do Invocador;
  - manter as invocações não custa Mana;
  - a 0 de Vida, a invocação se desfaz e volta com a Vida cheia no descanso longo.
- **Outros textos em `classes.json`:**
  - a descrição da classe agora diz "duas criaturas";
  - o `dt_efeitos` e as 5 Aranhas Tecelãs: a Presa é resistida com Fortitude contra o total do ataque, pela convenção da decisão 5;
  - o Catálogo diz que o bônus de ataque é o teste de conjuração;
  - na Fera, o Movimento passa a ser o maior entre o dela e o seu;
  - o Espírito ficou com Fogo, Gelo, Raio ou Ácido, sem "energia";
  - o Olhos Compartilhados perdeu a condição Surpreendido: o corpo fica sem reações e com Defesa -2;
  - o Chamado Rápido traz uma invocação guardada;
  - no Sacrifício, a invocação se desfaz e dá a Vida temporária;
  - a Essência Adaptável usa a mesma lista do Espírito e vale até o próximo descanso longo.
- **Regras (`regras.ts`):**
  - a linha do Invocador na tabela de classes mágicas foi reescrita;
  - o tópico Aliados ganhou a exceção das invocações: duas em cena, ficam na ficha e agem logo depois do turno do Invocador.
- **Livro:** o compêndio (`compendio.mjs`) ignora o `resumo_no_topo` e imprime sempre a tabela. As 30 fichas do Catálogo entraram no Livro do Mestre.
- **Site:**
  - a página da classe (`Invocador.tsx`) perdeu a antítese e os "pactos absolutos de mana", e ganhou o cartão "Como a invocação joga";
  - na aba Magias, quem tem nível de Invocador vê "Ataque das invocações" com o bônus do teste de conjuração (`nivelDeInvocador` em `magiaService.ts`).
- **Conferido no navegador** (banco de revisão): a página da classe mostra os textos novos. Na ficha do Bram, trocado por um momento para Invocador 5 e depois devolvido, aparece "Ataque das invocações +12".
- **Testes:** `tests/frontend/invocadorPacto.test.ts` (novo). Também mudaram os comentários de `classProgression.test.ts` e `test_character_rules.py`. Passam 1340 testes do front e 139 de regras do servidor. As regras públicas (`regras-publicas-v1.md`) foram regeradas e agora carregam as decisões 1 a 6.
- **Fica para depois:**
  - um botão na aba Aliados para criar a invocação direto do Catálogo;
  - degraus do Catálogo além do nível 20;
  - Vida temporária na ficha do aliado;
  - o Retorno ao Pacto sem limite;
  - o Avatar da Deidade repete a Convergência;
  - o Chamado da Criação traz criaturas de fora do Catálogo.

### Decisão 7 (Interceptador): A nas três perguntas, implementada em 2026-10-20 (sem commit)

- **Interceptação fixa:** o Pacote Descartado saiu da lista de poderes e virou habilidade do nível 1 (Reação, 4 de Mana). O `id` continua o mesmo.
  - Todo projeto de classe tem 10 poderes (`classProgression.test.ts`), então entrou o **Ruído Branco** no lugar dele. É uma Ação Padrão de 4 de Mana, alcance 18 m: o conjurador testa Vontade contra a DT do Interceptador e, se falhar, sofre desvantagem no próximo teste de conjuração.
  - A **migração 57** (`pacote_descartado_vira_habilidade`) tira o Pacote de `poderesClasseSelecionados` de quem o tinha escolhido e devolve a vaga. O teste é `test_pacote_descartado_habilidade.py`.
- **Criatura do Mestre:** contra poder de criatura que venha de Fluxo natural, a DT é a DT padrão do VD (15 + metade do VD), a mesma do tópico de balanceamento.
  - O texto está no Pacote e no `dt_efeitos`.
  - O código é `dtPadraoDoVd` em `curvaCriatura.ts`, que agora também alimenta o gerador.
  - O Apagão contra criatura sem Mana anotada dá desvantagem no ataque mágico dela e vantagem aos alvos para resistir.
- **Zonas:** a Quarentena e o Apagão viraram áreas fixas, e as criaturas que o Interceptador escolher ficam de fora. A Quarentena agora dá -2 no teste de conjuração de quem conjura de dentro e +2 para interceptar o que sair dali. Antes era -2 na DT, o que facilitava a conjuração do inimigo.
- **Nível 18:** entrou a Blindagem de Malha (+2 na Defesa e nos testes de resistência contra magia natural e poder de criatura de Fluxo natural). O Acesso Administrador ficou só no 20.
- **Outros textos em `classes.json`:**
  - a descrição da classe foi reescrita;
  - a Assinatura Reconhecida (+2) agora vale para magia, poder de criatura e Desmontar Selo;
  - o Hackear Fluxo diz "uma técnica por interceptação";
  - o Acesso Administrador permite "no máximo uma que troque o cancelamento" e passou de "por turno" para "por rodada".
- **Ficha (aba Magias):**
  - a interceptação escolhe entre magia de círculo (os 10 círculos, sem o corte pelo Fluxo do próprio Interceptador) e poder de criatura (VD);
  - soma o +2 do nível 10 e tem o interruptor do Acesso Administrador (+5, 3 de Mana a menos) no nível 20;
  - desconta a Mana do Pacote e diz se interceptou;
  - a conta fica em `interceptacaoDaFicha` (`magiaService.ts`);
  - saiu a antítese "acesso à Malha, não uma fonte".
- **Página da classe:** saíram o "roubando os privilégios" e o travessão, e entraram o Pacote no nível 1 e a DT de criatura.
- **Conferido no navegador** (banco de revisão), com a ficha do Bram trocada por um momento para Interceptador 20 e depois devolvida: contra uma criatura de VD 20, com o Acesso Administrador, aparece "d20 +27 contra DT 25, 1 de Mana". A rolagem deu 42 ("Interceptou"), e a Mana foi de 30 para 29.
- **Testes:** `tests/frontend/interceptadorPacote.test.ts` (novo) e `plataforma/tests/test_pacote_descartado_habilidade.py` (novo). Passam 1344 testes do front e 1658 do servidor (a suíte inteira, com a migração 57 num Postgres descartável).
- **Fica para depois:**
  - ~~a Latência repete a técnica Atrasar; o Proxy repete o Pacote com Redirecionar; o dano do Refluxo Hostil não cresce com o nível~~ (resolvidos no fechamento, mais abaixo);
  - a Visão de Código (20) é "Passivo" com uso por sessão e não acrescenta mecânica;
  - a calibração de Fluxo da ficha ainda não tem regra;
  - o alcance de detecção (12 m e 24 m) é curto perto das magias de alcance Longo.

### Decisão 8 (Cartista Arcano): A nas duas perguntas, implementada em 2026-10-20 (sem commit)

- **Carta é magia conhecida:**
  - o Baralho Arcano 1 diz que cada magia conhecida é uma carta, que a mão é o conjunto delas e que jogar uma carta é conjurar a magia, pagando a Mana dela;
  - "comprar", "descartar" e "retorna à mão" saíram dos textos;
  - o Arcano Absoluto dá duas cartas por turno (podem ser a mesma), a primeira de graça, e crítico no 19;
  - as Cartas Afiadas viraram ataque de Pontaria, 9 m, dano de Corte, crítico no 20 e sem custo de Mana, e o Mod. Fluxo entra só no último estágio.
- **Trava de círculo:**
  - a regra é geral: a vaga de cada classe só guarda magia até o círculo que essa classe libera. Assim, o Cartista sobre um Canalizador não abre vaga de 6º;
  - na ficha, `circuloSemVagaPara` e `vagasPorFonte` (`magiaService.ts`) recusam a magia em `magiaElegivelParaAprender`, com um motivo que cita o Cartista;
  - no servidor, `_erro_vagas_por_fonte` (`character_summary.py`) confere a mesma regra, tolera o excesso que a ficha já tinha e só gera alerta quando ele cresce;
  - as fontes são aninhadas pelo círculo, então basta conferir, para cada círculo k, as magias de círculo k ou maior contra as vagas das fontes que chegam a k.
- **Vagas e teto:**
  - o Cartista para em 8 vagas (níveis 1, 5, 10, 15, 20, 25 e 30), e os marcos 35 a 50 saíram;
  - o teto de 4 por círculo começa no 25, como diz o Livro;
  - um teste novo garante que nenhuma classe tem teto antes do 25.
- **Textos (`classes.json`):**
  - a descrição da classe foi reescrita;
  - os estágios do Baralho Arcano dizem quantas cartas há no total;
  - o estágio do nível 20 virou Passivo (a 6ª carta, e a primeira carta de 1º círculo de cada rodada custa 1 a menos) e deixou de repetir o Arcano Absoluto;
  - no nível 10, a Ação Completa joga duas cartas de 1º círculo, ou uma de 1º e uma de 2º;
  - os poderes Mago, Roda da Fortuna ("um d20 seu"), Imperador, Enforcado e Mundo foram reescritos, e os Dados Viciados agora dizem de quem é a rolagem.
- **Regras (`regras.ts`):** a frase "somando todas as fontes" ganhou a exceção da vaga por círculo, a linha do Cartista na tabela de classes mágicas foi reescrita, e o texto das vagas depois do 20 também.
- **Página da classe:** saíram as duas antíteses, e o texto agora diz o tamanho do baralho e como funciona o arremesso.
- **Testes:**
  - novos: `tests/frontend/cartistaCartas.test.ts` e a classe `TestVagasPorFonte` em `test_character_rules.py`;
  - em `magicRules.test.ts`, o Cartista 50 passou de 12 para 8 vagas.

  Passam 1348 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável). A trava não foi vista na tela: está coberta pelos testes.
- **Fica para depois:**
  - um item "Baralho" na Loja;
  - prêmios do Cassino Lunar por nível;
  - magias com vocabulário de carta;
  - no Físico, o Cartista continua com no máximo 6 cartas.

### Decisão 9 (catalisador do Sintonizador): C e A, implementada em 2026-10-20 (sem commit)

- **O que é o catalisador:**
  - é um objeto pessoal (uma pedra, um relógio parado, um osso) sintonizado em dez minutos a um Fluxo diferente do nativo, sem preço, raridade ou Loja;
  - se quebrar ou sumir, sintoniza-se outro;
  - os três textos que tratavam o catalisador como objeto (Sintonia Distante, Leitura de Artefato, Religação) passam a fazer sentido;
  - a modificação de Loja "Catalisador", que recupera Mana, virou **Condensador de Mana**, com o id `mod-catalisador` igual;
  - o poder Catalisador do Alquimista não mudou.
- **Estados, escritos na Sintonia Catalisada 1 e no tópico de Fusão do Livro:**
  - preparado é o catalisador sintonizado, até o limite;
  - ativo é o que a fusão usa agora, um por vez;
  - desativado é o que foi gasto numa fusão e volta com os dez minutos.

  Trocar o ativo custa uma Ação de Movimento entre os níveis 5 e 14.
- **Tecnologia:** só vira catalisador do Sintonizador quando o Mestre a instalou na ficha. A calibração do Interceptador continua só com os dez naturais. A regra está em `fluxosCatalisaveisDaFicha` (`magiaService.ts`) e em `_validar_catalisadores_fluxo` (`character_summary.py`).
- **Ficha (aba Magias):**
  - a lista de catalisadores usa a regra nova;
  - o "Ativo agora" mostra só fusão aprendida, a partir do nível 3, e sem a do Fluxo nativo (`fusoesDaFicha`); sem fusão, diz "Nenhuma fusão aprendida para este Fluxo";
  - o estado desativado fica em `catalisadoresFluxo.desativadosIds`, com o botão "Gastar numa fusão" e "Reativar (dez minutos)";
  - o servidor confere que os desativados estão entre os preparados.
- **Textos (`classes.json`):**
  - o estágio do nível 20 da Sintonia Catalisada deixou de repetir a Convergência e passou a reativar um catalisador gasto na hora, uma vez por sessão;
  - a Religação reativa o catalisador ou troca para outro preparado;
  - a Troca Instantânea e a Dupla Frequência pedem "Sintonia Catalisada 2", e a Dupla Frequência diz o ganho (usar a fusão de qualquer um dos dois);
  - a Frequência Protetora virou redução de 5 por magia, porque Resistência por Fluxo não existe nas regras;
  - a Descarga diz "+1 dado de dano do mesmo tipo";
  - a Ressonância Improvável diz que a fusão vale só na cena;
  - a Mutação perdeu a palavra "carga", também em `magias.json`;
  - a Fusão Controlada diz que a Programação pede a Tecnologia instalada e que a fusão do Fluxo nativo não tem uso.
- **Página da classe:** saíram a antítese, o "nunca fica sem reposição" e o "Tecnologia incluída".
- **Conferido no navegador** (banco de revisão), com o Toro Pedra:
  - a lista esconde a Origem (Fluxo nativo) e a Tecnologia;
  - "Nenhuma fusão aprendida" aparece;
  - "Gastar numa fusão" e "Reativar" alternam o estado, e o servidor grava `desativadosIds`.
- **Testes:** `tests/frontend/sintonizadorCatalisador.test.ts` (novo) e o teste de catalisadores do servidor, ampliado com a Tecnologia instalada e com os desativados. Passam 1351 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável).
- **Fica para depois:**
  - o Aterramento continua reduzindo dano por Fluxo de origem (8 por Reação);
  - os níveis 1 e 2 seguem sem fusão nenhuma (a primeira chega no 3).

### Decisão 10 (Vazio e "não cria"): A, implementada em 2026-10-20 (sem commit)

- **Limite novo:** o Vazio "não cria matéria nem vida". O que ele forma é ausência com contorno, que não come, não respira e some sem deixar resto. "Nada nasce no Vazio" continua valendo para comida, água e vida. A mudança está:
  - em `fluxos[vazio].limites` (`magias.json`), que alimenta os cartões de Fluxo do site;
  - no Limite de Erebus no Guia do Mestre (`regras.ts`);
  - em `data/bestiario/deidades-v1.json`.
- **Variações do Vazio reescritas, com os mesmos números:**
  - o Clone de Fluxo é "uma ausência com a forma do conjurador" que não deixa nada ao se desfazer, e saiu o "não existe de verdade";
  - a Convocação do Fluxo é "uma ausência com contorno de fera" que some sem deixar corpo.

  A Muralha Canalizada e a Arma de Fluxo do Vazio cabem no limite novo sem mudança.
- **Testes:** `tests/frontend/vazioNaoCria.test.ts` (novo). Passam 1353 testes do front e os 148 de regras, conteúdo e deidades do servidor. A suíte inteira do servidor não foi rodada de novo, porque a mudança foi só de texto e dados.
- ~~**Fica para depois:** o 31º do Vazio (Nada Pessoal repete Ausência de Si) e o encantamento Manto do Não Ser.~~ Resolvido no balanceamento do Vazio.

### Decisão 11 (Tecnologia contra Autômato): B, implementada em 2026-10-20 (sem commit)

- **Regra:** dispositivo e item energizado "param de funcionar". O Autômato, que é raça jogável, fica **Paralisado**, uma condição que já existe: não age, não reage, não se move, segue consciente, tem Defesa -2 e repete Fortitude contra a DT da fonte no fim de cada turno. Sempre há teste. Nenhuma condição nova foi criada.
- **Efeitos reescritos:**
  - **Sopro do Fluxo (Tecnologia):** Reflexos, 1 rodada.
  - **Detonação de Núcleo:** Paralisado no lugar de Atordoado (o Autômato é imune a atordoamento), com Reflexos.
  - **Erupção do Fluxo (Tecnologia):** Reflexos, até 3 rodadas.
  - **Tempestade de Íons:** Reflexos no começo de cada turno, em vez de desligar pela duração inteira.
  - **Singularidade (Tecnologia):** deixou de destruir; os itens param até o fim da cena, e o Autômato que falhar em Fortitude fica Paralisado por 1 rodada.
  - **Selo de Sobrecarga:** Fortitude para todo Autômato, não só para o "com consciência".
  - **Poder racial:** o dispositivo para de funcionar, ou o construto fica Paralisado (`racas.json`).
- **Testes:** `tests/frontend/automatoParalisado.test.ts` (novo) confere que nada desliga, atordoa ou destrói Autômato e que todo efeito que o paralisa traz o teste. Passam 1355 testes do front e os 148 de regras, conteúdo e deidades do servidor.
- ~~**Fica para depois:** a Fábrica de Campo (torres e autômatos sem números) e o Autômato Assistente.~~ Resolvido nas duas passadas dos oito Fluxos.

### Efeitos fortes sem teste: A, implementado em 2026-10-20 (sem commit)

As quatro magias de 10º círculo que tiravam um inimigo de jogo sem teste agora seguem a regra de "se hostil" da decisão 5. O inimigo tem teste repetido ou duração menor.

- **Estase** (`conservacao-absoluta`):
  - `defesa: "Vontade se hostil"`;
  - a criatura hostil repete Vontade no fim de cada turno e, quando passa, volta ao tempo;
  - criatura voluntária, objeto ou lugar ficam os 7 dias sem teste;
  - o conjurador ganha 1 de Cansaço.
- **Parada do Mundo:**
  - `defesa: "Vontade"`;
  - toda outra criatura na área testa no começo de cada rodada e, se passar, age normalmente;
  - uso de uma vez por descanso longo;
  - durante a parada, o conjurador não conjura magia de Tempo de 8º círculo ou maior.
- **Âncora do Ser:**
  - `defesa: "Vontade se hostil"`;
  - o inimigo que falhar fica ancorado até o fim da cena;
  - as 24 horas valem para quem aceita, para objeto e para lugar.
- **Zona Morta** (`nada-absoluto`):
  - `defesa: "Fortitude"` e `dano: "4d6"`;
  - "mudos" virou Silenciado, e a magia e a tecnologia ficam "suspensas" por três rodadas;
  - Fortitude a cada rodada reduz o dano à metade e evita Cego e Silenciado naquela rodada.
- **Verbo do Fluxo (Tempo):** "um ano" virou sete dias, como a Estase.
- **Testes:** `tests/frontend/controleComTeste.test.ts` (novo). Passam 1357 testes do front e os 148 de regras, conteúdo e deidades do servidor.

### Termos que não existem e condições sem saída: A nas duas, implementado em 2026-10-20 (sem commit)

- **Glossário:** o tópico Magia e Fluxo (`regras.ts`) ganhou a seção "Termos das magias". Ela define:
  - Revelado (que aponta para a condição);
  - alcançar o próprio Fim;
  - consolidado;
  - alma própria;
  - reconquista;
  - ausente (como na Saída de Erebus);
  - fronteira selada (só magia de Espaço de círculo maior que o do selo passa);
  - módulo A.X.I.S (o Núcleo Tecnológico A.X.I.S da Loja, que não é gasto).

  As magias que usam esses termos não mudaram.
- **Revelado** entrou como condição oficial (`data/regras/condicoes.ts`, ao lado de Exposto). Agora são 25 condições oficiais, e o teste da sessão foi atualizado.
- **Regra padrão das condições** (tópico de Condições):
  - a Imobilizado sem saída indicada se desfaz com uma Ação Padrão e Atletismo ou Acrobacia contra a DT da fonte (na magia, a DT de conjuração), e a `remocao` da condição diz o mesmo;
  - condição de fonte instantânea sem duração escrita vai até o fim do próximo turno de quem a recebeu.
- **Magias:**
  - a Primavera Devastadora passou a durar "até o fim do próximo turno delas";
  - a Chuva de Esporos diz como se soltar;
  - a Repetição Curta trocou "ação simples" por Ação Padrão;
  - o Ecossistema Convocado trocou "terreno seguro" por descanso de qualidade Boa.
- **Testes:** `tests/frontend/termosECondicoes.test.ts` (novo). Passam 1360 testes do front e 186 do servidor (regras, conteúdo, editorial e deidades). A condição nova não foi vista na tela, mas a ficha e a sessão leem a mesma lista.

### Tipos de dano: A, implementado em 2026-10-20 (sem commit)

- **Regra** (tópico Magia e Fluxo, seção "Tipo de dano das magias", repetida em Tipos de Dano):
  - magia que não diz o tipo causa o dano do próprio Fluxo (dano de Vazio, do Fim, de Comunicação...);
  - a Tecnologia causa dano tecnológico;
  - a universal causa o dano do Fluxo que a canaliza;
  - o Físico sem elemento causa impacto, e as Elementais causam o do elemento declarado;
  - o que o texto diz (elemento, tipo sorteado, veneno que continua) vale por cima.
- **Ficha:** o cartão mostra "Dano 2d8 de Vazio". A conta fica em `tipoDeDanoDaMagia` (`magiaService.ts`), sem campo novo nas magias, e o Compêndio do PDF usa a mesma função.
- **Desvios corrigidos em `magias.json`:**
  - os 6 ataques de Comunicação passaram de "dano mental" para dano de Comunicação, que tira Vida. O "dano mental" ficou nos castigos que atacam a mente (Pacto Vinculante, Decreto Registrado, Malha de Consciências);
  - os ataques e as variações de Vitalidade passaram de "veneno" para dano de Vitalidade. A Erupção mantém o "1d6 de veneno por rodada", que é escrito à parte;
  - no encantamento Propriedade Mutável, "frio" virou gelo.
- **Testes:** `tests/frontend/tiposDeDano.test.ts` (novo). Passam 1362 testes do front e 186 do servidor. O cartão não foi visto na tela: a função está coberta pelo teste.

### Fluxo recomendado e "bônus específico da classe": A nas duas, implementado em 2026-10-20 (sem commit)

- **Escada nova:** o `fluxo_minimo` de cada círculo (`magias.json`, `regras.circulos`) agora é 11 + círculo, de 12 no 1º a 21 no 10º. Antes ia de 14 a 50.
  - Quem põe os aumentos em Fluxo (15 na criação, +1 a cada 4 níveis) chega ao 10º por volta do nível 20.
  - As Marcas do 5º ao 9º círculo, que seguem o menor entre a fonte e o Fluxo, voltam a aparecer na carreira normal.
  - A tabela do Livro sai do mesmo dado.
  - O texto de Magia e Fluxo e o Guia do Mestre explicam a conta.
- **Fórmula:** "bônus específico da classe" virou "bônus de habilidades, poderes e itens", em `magias.json` e no Livro. Uma linha explica que são os que a própria habilidade, poder ou item manda somar, e que nenhuma classe tem bônus fixo. No exemplo, "nenhum bônus de classe" virou "nenhum bônus de habilidade ativo".
- **Testes ajustados aos números novos** (o que cada teste prova continua igual):
  - em `magicRules.test.ts`: os limiares da escada, o Canalizador 5 com Fluxo 13, o aviso com Fluxo 12, as Marcas com Fluxo 16 e 20, e o item que leva o Fluxo a 18;
  - em `test_character_rules.py`, o teste dos limiares.

  Passam 1362 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável).

### Balanceamento do Tempo: A, implementado em 2026-10-20 (sem commit)

Segue as propostas de [`fluxos/tempo.md`](fluxos/tempo.md). Antes disso já tinham sido resolvidas a Estase, a Parada do Mundo, os títulos com "eco" e a "ação simples".

- **Ação extra na escala do jogo:** só o Tempo Emprestado e a Parada do Mundo dão turno ou ação padrão extra.
  - A Aceleração, a Forma do Tempo e o Passo Canalizado dão uma ação de movimento extra.
  - O Avatar do Tempo dá um turno extra uma vez por cena.
  - A Lei do Fluxo escolhe a ordem uma vez e não deixa agir em dois turnos seguidos.
  - A Arma do Tempo gasta a reação, com -2 e sem crítico.
  - O Adiantar o Golpe ganhou gatilho de Reação e só vale se o conjurador ainda não agiu.
  - O Campo, o Território, o Elo e o Clone do Tempo foram reduzidos.
  - O Domínio do Ritmo perdeu a ação de movimento.
  - A Antecipação Tática dura três rodadas.
  - O Antecipar vale da próxima rodada e cobra 1 de Cansaço.
  - A Repetição de Batalha só repete a rodada anterior (magia até 4º).
  - A Repetição Curta só repete ataque ou magia de 1º ou 2º.
  - A Zona Acelerada cobra de quem usou a ação.
- **Escadas na ordem do círculo:**
  - a Parada de Instante tira só a Ação Padrão;
  - o Roubar Turno tira 1 turno, e o Exílio Temporal tira 2;
  - a Conservação Maior usa Vontade repetida contra inimigo;
  - o Congelar o Instante diz o que os quatro fazem.
- **Nada volta ao passado:**
  - o Restaurar o Estado dá Vida até a do começo da cena (no máximo 9d6 + Mod. Fluxo), encerra uma condição e repara um item, sem reviver ninguém;
  - a Relíquia Conservada repara o objeto;
  - o Colapso Temporal encerra os efeitos ainda ativos.
- **Desgaste do Tempo:** a regra única está em Magia e Fluxo. Magia de Tempo do 5º círculo em diante que dá ação ou turno extra, tira turno por 2 rodadas ou mais, ou dura a cena sem concentração custa 1 de Cansaço no fim da cena (2 no 9º e no 10º), a menos que o texto já cobre.
- **Itens e textos:**
  - o Séculos em um Golpe deixa o item inutilizável até o conserto;
  - na Erosão de Éon, quem falha perde itens comuns, mas os aliados escolhidos ficam de fora;
  - a Vigília dos Éons pede alvo voluntário ou inconsciente;
  - foram corrigidas as descrições da Aceleração, Aceleração Menor, Conservar, Suspensão Breve (até 200 kg), Campo Lento e Domínio do Ritmo, a do Instante Guardado (neste turno) e a da Ampulheta Marcada;
  - saíram as frases que negavam o efeito e o exagero do Passo Antecipado.
- **Testes:** `tests/frontend/tempoBalanco.test.ts` (novo). Passam 1365 testes do front e 186 do servidor (regras, conteúdo, editorial e deidades).

### Balanceamento do Fim: A, implementado em 2026-10-20 (sem commit)

Segue as propostas de [`fluxos/fim.md`](fluxos/fim.md).

- **Palavra de Morte:** só mata quem está com metade ou menos da Vida máxima e falha em Fortitude. Acima disso, o alvo sofre o dano e fica sem cura até o fim da cena. "Magia comum" virou "magia de círculo menor que o 10º", e o glossário acompanhou. A Conduzir ao Término ganhou `dano: "8d6"`.
- **Tetos de círculo:**
  - Fechar Ciclo até 4º;
  - Lâmina do Encerramento até 5º;
  - permanentes de até 8º no Término Regional e de até 9º no Fim de Todos os Ciclos, que ficam inertes e voltam depois;
  - nas variações do Fim, Égide e Passo até 2º, Muralha até 4º, Clone até 6º, Forma até 7º, Convocação e Sentença até 8º;
  - a Onda do Fim desfaz invocação até o 5º, igual aos efeitos.
- **Outras correções:**
  - o Romper Vínculo serve contra vínculo em curso, e quem o mantém resiste com Vontade;
  - a Marca do Fim bloqueia só efeito benéfico novo;
  - a Lei do Fim pune quem quebra a lei, para não repetir o Limiar Selado;
  - o Limiar Selado poupa o conjurador e os aliados escolhidos;
  - o Ponto de Não Retorno e o Selo do Término dizem "levantar de 0 de Vida", e só magia de 9º ou maior encerra o Ponto de Não Retorno;
  - a Ferida Terminal e o Fio do Limiar aplicam Sangramento;
  - a Última Palavra cai a 0 de Vida (Morrendo 1), e o dano do turno extra conta para o Déficit;
  - na Deterioração, item raro perde só 1 de Defesa;
  - a Zona de Deterioração tem teto de -10;
  - a Marca do Limiar dá +2d6;
  - "metade ou menos" virou o padrão;
  - o Sopro do Limiar não destrói o que os personagens carregam;
  - saíram as duas antíteses (Velório e Último Ato).
- **Loja e fusão:**
  - o Fruto do Fim e o Selo de Fechamento ganharam `requer_autorizacao_mestre: true`;
  - entrou o componente **Lembrança do Morto** (`comp-lembranca-do-morto`), ingrediente novo do Último Adeus no lugar de "Órgãos de Humano";
  - a fusão do Fim virou **Encerramento Rápido** (em `magias.json` e na opção do Sintonizador), com o aviso de autorização e "círculo da magia fundida, no fim do turno do conjurador".
- **Testes:** `tests/frontend/fimBalanco.test.ts` (novo). Os contadores de materiais (504, 145 de ritual) e de fichas da Loja (1279) subiram em 1 pelo componente novo. Passam 1368 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável, que também carrega a Loja com o componente novo).

### Balanceamento do Vazio: A, implementado em 2026-10-20 (sem commit)

Segue as propostas de [`fluxos/vazio.md`](fluxos/vazio.md). A Zona Morta, o clone e a convocação e os termos já tinham sido resolvidos antes.

- **Duplicatas com conteúdo novo, ids iguais (sem migração):**
  - `nada-pessoal` virou **Sentido Apagado** (3º, Médio, Vontade): apaga a visão (Cego) ou a audição de um alvo por três rodadas, com Vontade repetida;
  - `silenciar-fluxo` virou **Esquecimento** (9º, Vontade se hostil): apaga uma lembrança de até uma hora, ou o nome e o rosto de alguém, da cabeça das criaturas escolhidas;
  - o encantamento `manto-do-nao-ser` virou **Manto do Instante Ausente**;
  - a Ausência de Si "sai da percepção e do alcance" e continua no lugar, o que fecha o conflito com o limite "não preserva".
- **Tetos e regras:**
  - o Escudo do Vazio, o Avatar do Vazio e a Fivela Devoradora consomem só magia hostil com teto (8º, 8º, 3º), e cura e bênção passam;
  - o Apagar Efeito vai até o 8º, com o aval do Mestre para autoridade conceitual;
  - o Apagar do Mapa se desfaz ao atacar, conjurar contra alguém ou fazer barulho, e o ataque dirigido tem desvantagem;
  - o Apagar do Mundo tem Vontade contra invocação, perdeu "efeito permanente" do alvo e diz o que acontece com quem estava no lugar;
  - o Rito do Nada pede o Vestígio Material;
  - o Apagamento de Rastro vai até o 4º, em área de até 6 m.
- **Ninguém some sem Morrendo:**
  - no Buraco Negro e na Singularidade, o arrasto vale só para quem falha, o "ausente" vale para criatura do Mestre, e personagem de jogador cai Morrendo;
  - no Toque do Abismo, a Mana atual volta no descanso, mas o alvo fica 24 horas sem recuperar Mana de outra fonte;
  - na Aniquilação Parcial, só itens comuns e incomuns somem, e a 0 de Vida o alvo cai Morrendo.
- **Correções:**
  - a Bolha de Ausência e a Ausência Regional não cegam quem está dentro (e "calor" virou "sinal térmico");
  - o Silêncio Total deixa todos na área Silenciados;
  - a Zona de Consumo pega só inimigos, com Vontade;
  - no Sumidouro Menor, quem zera o dano consome a magia inteira;
  - a Onda de Ausência dá dano uma vez, e Cego para quem está na área;
  - o Consumir Energia arranca Mana e diz a DT contra efeito;
  - o Apagar Vestígios deixa selos e efeitos ativos intocados (e o perfil virou área);
  - a Lacuna de Sensação usa penalidades que existem;
  - a Marca Fome Interna deixou de converter vida em Mana;
  - as variações universais foram corrigidas (Égide, Erupção, Toque com 1d4, Forma);
  - a fusão Ausência não apaga a própria luz da magia.
- **Tom:** saíram as antíteses (Toque Nulo, Corte Nulo, Manto sem Rastro, Rito do Nada, Aniquilação, Buraco Negro) e a fórmula "não é guardada nem convertida", repetida em várias entradas. O Corte Nulo agora diz "ignora a redução de dano de armadura e escudo".
- **Testes:** `tests/frontend/vazioBalanco.test.ts` (novo). Os contadores de rituais com ingrediente (32) e de receitas (92) subiram com o Rito do Nada. Passam 1371 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável).
- **Fica para depois:**
  - ~~a voz do Sábio para os títulos novos~~ (gravada no fechamento);
  - a assinatura do Vazio nos encerramentos (consumir Mana do dono do efeito), que é design.

### Passada de tom: A, implementada em 2026-10-20 (sem commit)

- **Catálogo:** 33 frases de `magias.json` foram reescritas em forma afirmativa, sem mudar regra. Entre magias, rituais e encantamentos: Rito dos Sete Pecados, Grito Dissonante, Regeneração Contínua, Rede A.X.I.S, Ecossistema Convocado, Portal Permanente, Concílio do Mundo (com a ordem da frase consertada), Verdade Nua, Semeadura da Colheita Certa, Preparo de Antídoto, Portal de Soleira, Pulso Regenerador, Grande Crescimento, Lâmina do Que É, Lâmina Dimensional, Campo Germinal, Fenda Cortante, Praga Devoradora, Peste Ramificada, Reviravolta, Rito da Segunda Possibilidade, Decreto Registrado (ordem consertada), Colapso Biológico, Broto de Vigor, Distância Hostil, Passo Constante, Mordida do Nada e Encerrar Efeito Menor.
- **Ficaram como estavam:** os "em vez de" que só descrevem a mecânica (Corte Dissipador, Mediação Imposta) e as frases de limite como "Contra o que a criatura é de nascença, não adianta".
- **Classes:** cinco textos de `classes.json` (o 0 Km do Piloto, a Intimidação do Guardião e três opções do Caçador) e as páginas `Elementarista.tsx`, `Detetive.tsx`, `CampeaoDimensional.tsx`, `Guardiao.tsx`, `Guerreiro.tsx` e `Piloto.tsx`. A antítese da `AbaMagias.tsx` já tinha saído antes.
- **Trava:** `tests/frontend/tomSemAntitese.test.ts` (novo) varre todo texto de `magias.json`, `classes.json` e das páginas em `src/redesign/classe/` atrás de "não é X, é Y", "não é X: Y", "é A, não B" e "não X, e sim Y". Um caso de teste garante que a trava pega as quatro formas e deixa passar o "em vez de" mecânico.
- **Testes:** passam 1375 testes do front e os 186 testes rápidos do servidor.

### Os outros oito Fluxos, primeira passada (caminho C): implementada em 2026-10-20 (sem commit)

Entraram os erros e as incoerências dos relatórios de Inconstância, Espaço, Vitalidade, Essência, Origem, Comunicação, Tecnologia e Físico. As melhorias de texto e os números pequenos ficam para uma segunda passada. Os ids não mudaram e nenhum título mudou.

- **As seis respostas de design:**
  1. os 7 ataques de alvo único da Comunicação somam o Mod. Fluxo;
  2. a Inconstância ganhou quatro tabelas (Tipo 1d4, Direção 1d8, Resistência 1d6, Reescrita 1d4), na seção "Sorteios da Inconstância" do tópico de Magia, e as magias apontam para elas;
  3. a Essência manteve os 10 ataques: o Julgamento Essencial dá +2d8 no lugar do dano dobrado, e o Nome Verdadeiro revela a natureza do alvo (raça ou tipo, Fluxo, resistências, imunidades e vulnerabilidades);
  4. a Vigília da Carne e a Reconstrução do Corpo pedem Carne de Caça;
  5. o Registrar Padrão grava até o 8º círculo, com tantos registros quanto o Mod. Fluxo;
  6. o Sopro de Anima cura até seis aliados.
- **Inconstância:**
  - a Detonação Improvável tem tabela fechada com risco ao conjurador, e a variação da Represália tem a dela;
  - o Desfazer Padrão dura a cena e transforma imunidade em Resistência 10;
  - o Mundo Instável tem tabela própria e fica fora da própria regra;
  - o Ciclone é instantâneo, com condição no 1d4 e terreno por três rodadas;
  - a Propriedade Mutável usa fogo, gelo, raio ou ácido com +1d4;
  - a Sorte Trocada fala em fonte de vantagem;
  - a Lei Suspensa troca o bônus de ataque e teste por 1d10 e deixa o teste de conjuração de fora, senão a área calaria toda magia do 6º em diante (decisão minha, conferida contra a DT);
  - Corpo Inconstante e Mutabilidade barram só efeito hostil;
  - a Troca de Propriedades deixa o dado escolher;
  - a Reviravolta faz rolar de novo antes de valer;
  - o Campo de Inconstância sorteia a duração em 1d4;
  - as Transmutações cabem nos exemplos e voltam com defeito.
- **Espaço:**
  - Labirinto e Domínio da Matriz dizem frequência e ação;
  - a Implosão segue o molde do Cataclismo Menor;
  - o Banimento leva a um ponto que o conjurador escolhe e deixa Desorientado;
  - Bolso e Cofre Dobrado contam em espaços;
  - a Ruptura dura três rodadas;
  - o Passo Selado só leva quem aceita;
  - o Portal Maior leva criaturas Médias ou menores e a Dobra de Exército ganhou área, montaria e veículo;
  - as variações do Campo, do Verbo e da Singularidade ficaram no tamanho delas;
  - Banimento e Exílio dizem "Além do dano";
  - o Corte de Distância vale até 90 m;
  - o Colapso usa a regra de Agarrado.
- **Vitalidade:**
  - o Vigor Desmedido dá 2 × Mod. Fluxo, sem acumular, e cobra o Cansaço de cada alvo;
  - Peste Ramificada e Praga Devoradora têm regra de contágio;
  - o Colapso Biológico deixa Paralisado com teste;
  - o que cura veneno e doença fala em "comuns";
  - o Éden funciona por processos vivos e sobe uma faixa de descanso;
  - as variações (Singularidade, Clone, Verbo, Lei, Território) respeitam os limites do Fluxo e o Morrendo;
  - Ferimento Crítico virou lesão de longo prazo;
  - a Reconstrução tira 1 de Ferido;
  - o Metabolismo Alterado dura 24 horas.
- **Essência:**
  - Lâmina da Verdade, Corte Dissipador, Espelho Verídico, Olho Revelador, Âncora Vestida e Custódia da Alma ganharam teto de círculo, e a Âncora Vestida vale uma vez por cena;
  - a Verdade Nua usa a reconquista e deixa classe e itens de fora;
  - a Dissipação Verídica dissipa só falsidade;
  - a Marca de Caça perdeu a trava de forma;
  - as âncoras usam a mesma lista de ameaças;
  - a Revelação de Corrupção e o Desmascarar dão teste para o Exposto;
  - o Quebrar Defesas tem uma duração só;
  - a variação da Represália e a do Campo saíram de cima das magias próprias;
  - o Nome Gravado pede Amostra Biológica;
  - leituras e Avatar mostram o tipo de intenção, sem motivo pessoal;
  - a Palavra Justa pede Vontade.
- **Origem:**
  - o limite "não produz matéria acabada" diz o que é matéria acabada;
  - Laço de Ajuda, Ninhada e Serviçal seguem a regra de Ajudar;
  - a Linhagem Nascente tem números próprios para o Grande, e o Guardião Germinado tem Defesa 16 e ataca com o teste de conjuração;
  - o Recomeço Absoluto e o Reinício do Corpo dão começo novo, sem voltar no tempo;
  - a Semente Adormecida refaz o que ainda existe;
  - o Renascer da Ferida encerra Sangramento e Caído;
  - o Berço e a Fundação seguem a régua do descanso;
  - o Golpe Inédito resiste com Fortitude e respeita imunidade;
  - a Semente Explosiva atordoa, sem repetir a Represália;
  - a Gênese tem teto e uma criatura por vez;
  - a Gênese Menor só germina madeira, cipó, casca ou fibra;
  - a Bênção da Espécie diz o que a cura repõe;
  - a fusão Germinação dispensa concentração, aqui e no Sintonizador.
- **Comunicação:**
  - a Singularidade ouve o que foi dito, sem ler mente;
  - o Verbo e o Decreto pedem quem aceite ou dão Vontade;
  - Represália e Ruína de Sinal não se repetem;
  - Acordo Breve, Elo de Equipe, Rede de Estandarte e Elo de Fluxo respeitam o teto de +4;
  - a Erupção desorienta;
  - a Mensagem Prateada vai a 10 km e o Elo de Emergência a 100 km;
  - o Cortar Vínculos explica os dois sentidos do laço;
  - a Convocação de Vozes, o Elo de Sentidos e o Espelho de Sentidos dizem o que fazem;
  - o Pacto de Vozes Distantes pede seis símbolos.

  O "dano mental" do Decreto ficou, pela decisão dos tipos de dano.
- **Tecnologia:**
  - as Reproduções dizem custo e DT, e a Total é instantânea;
  - o Bloqueio de Fluxo dá desvantagem com Vontade para sair;
  - o Aniquilador apaga os registros e trava o maior círculo do alvo, e a variação fica com a desvantagem;
  - as variações de Território e Avatar têm teto abaixo da Interceptação Regional;
  - os módulos da Jaula e da Reprogramação têm Defesa e Vida;
  - a Fábrica de Campo tem torres, autômatos e núcleo;
  - a Rotina Automatizada dura oito horas sem concentração;
  - o Formatar dura a cena.
- **Físico:**
  - o Controle de Massa tem dano e saída;
  - Terremoto Menor, Mão de Força e Peso do Mundo dizem o que o sucesso faz. O Impacto Colossal ficou como estava, porque é magia de ataque e a resistência só evita o empurrão;
  - Avatar, Singularidade e Verbo não dão os sete elementos nem criam matéria;
  - armaduras e domos dão Resistência por tipo;
  - a Égide conta o conjurador e o custo tem tipo;
  - a Fúria dos Elementos perdeu a frase que não fazia nada;
  - a Muralha do Baluarte ficou acima da Fortaleza (24 horas, imune a dano comum);
  - as Marcas do 5º e do 9º deixam escolher o elemento.
- **Código:** `TIPO_SORTEADO` (`src/services/magiaService.ts`) reconhece "role na tabela de Tipo", para a ficha seguir mostrando "dano de tipo sorteado".
- **Tom:**
  - a trava ganhou a forma "não faz X, faz Y", com o verbo repetido;
  - saíram "não fere a pele, fere a mentira" (Lâmina da Verdade), "não nasce um guardião, nasce uma linhagem" (Linhagem Nascente) e "não fica melhor, fica teimosa" (Instrumento do Primeiro Passo).
- **Testes:**
  - `tests/frontend/oitoFluxosBalanco.test.ts` (novo);
  - `audit:balance` aprovado, com a referência regerada;
  - passam 1383 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável).
- **Segunda passada (melhorias):** feita logo abaixo.

### Segunda passada nos oito Fluxos e nas universais (caminho A): implementada em 2026-10-20 (sem commit)

Entraram as linhas [MELHORIA] dos oito relatórios e o relatório das universais. Os ids não mudaram.

- **As seis respostas de design:**
  1. a Arma de Fluxo causa 2d8 + Mod. Fluxo por golpe, ataca corpo a corpo e segue pela cena, com concentração;
  2. Firewall, Interceptação Ativa, Interceptação Regional e as variações de Território e Avatar pedem Misticismo contra a DT de conjuração da magia, como o Pacote Descartado do Interceptador, e o Módulo de Interceptação ficou igual à Fivela Devoradora (uma vez por dia, até 3º);
  3. o dano de Fogo das magias cai uma vez e não continua, salvo quando o texto diz Queimando (regra na seção "Tipo de dano das magias");
  4. `recomeco-absoluto` virou **Recomeço Absoluto** e o selo `reviravolta-inscrita` virou **Sorte Virada**;
  5. no Exílio, chefe resiste com vantagem;
  6. "mesma realidade" virou "mesma dimensão" nas 12 entradas, e o glossário ganhou "Lugar conhecido" e "Mesma dimensão".
- **Inconstância:**
  - Virar o Jogo com alvo e promessa do tamanho do efeito, e 2 Cansaço;
  - Aposta Menor só fora de combate;
  - Mudança Irrepetível troca o material do objeto;
  - Lâmina de Muitos Rostos e Roleta com frequência, e a reação extra da Roleta uma vez na cena;
  - Instabilidade Corporal com 1d4, Mutação Passageira com números e a fusão Mutação fechada (também no Sintonizador);
  - Embaralhar e Sorte Roubada antes de valer;
  - Salto Improvável com 1d4, Vórtice Menor com sucesso e Tempestade com 50%;
  - as variações universais com lista e valor;
  - a Marca Pele Instável usa a tabela de Resistência.
- **Espaço:**
  - Passo Entre Lugares com teste e falha;
  - Marco de Retorno e Passagem Preparada falam das mesmas âncoras;
  - Refúgio e Santuário dizem o fim do prazo e a qualidade do descanso;
  - o Passo de Órbita segue a órbita da cena 3D;
  - a Prisão de Fronteira se desfaz com sucesso e não vira invulnerabilidade de aliado;
  - teleportes de grupo para espaços livres e visíveis;
  - Lâmina Dimensional ignora o bônus do escudo;
  - fusão Dobra com 3 m (também no Sintonizador);
  - Reescrever Distâncias com teto de dez aliados;
  - as variações de Represália e Erupção deixam o conjurador escolher o ponto.
- **Vitalidade:**
  - Pandemia em 10%;
  - Toque com 1d4;
  - a Vigília diz 25% da Vida máxima;
  - "de Vida" nas curas das universais;
  - Seiva e Pulso não somam com a Marca;
  - o Grande Crescimento tem dano, Reflexos e frequência;
  - a Arma de Fluxo devolve um quarto do dano, uma vez por rodada, até 2 × o círculo.
- **Essência:**
  - Campo Verídico com Vontade para efeito maior;
  - Verdade Compartilhada diz o teste;
  - Alétheia responde uma pergunta em até uma frase, sem culpa, motivo nem paradeiro de caso aberto;
  - Olho da Natureza diz quais;
  - o tom da Verdade Gravada.
- **Origem:**
  - Origem Emprestada até Aprendiz, sem voo;
  - Floresta Insurgente com dano só ao nascer;
  - a Lei só segura efeito benéfico de aliado;
  - Toque, Marca, Passo e Escudo da Origem fechados;
  - Recomeço Instintivo e Lança do Primeiro Broto com texto certo.
- **Comunicação:**
  - Sentidos Ampliados só pega o que está sendo comunicado agora;
  - Cascata sem frase invertida;
  - Sobrecarga e Sopro usam Silenciado, e o Coro usa Desorientado;
  - Rede de Guerra com +2;
  - Arma de Fluxo com metade dos dados e Escudo com +2 de Defesa;
  - Concordância, Comando Combinado e Malha fechados;
  - fusão Rede (também no Sintonizador);
  - a ressalva de livre-arbítrio uma vez por entrada.
- **Tecnologia:**
  - Contramedida, Jaula e a variação do Campo em três degraus, com aliados de fora;
  - Interceptar Comando diz de quem é a Vontade;
  - Reprogramar Região, Lei e Verbo com teste;
  - o Autômato Assistente com 3 × Mod. Fluxo e regra de ataque;
  - torretas do Selo Sentinela e da Rotina com Defesa, Vida e ataque;
  - a Montagem de Autômato perde os ingredientes na falha e pede Peças Mecânicas Compatíveis por mês;
  - a reação extra do Núcleo de Comando uma vez na cena;
  - o Pulso de Interferência com alvo geral;
  - a fusão Programação diz quando rola e o que acontece sem gatilho (também no Sintonizador).
- **Físico:**
  - estruturas de elemento sem corpo sólido;
  - o Baluarte diz o que bate no domo;
  - Cataclismo com os sete elementos e Moldar Elemento com Raio, Luz e Escuridão;
  - a Rajada lista a fonte de cada elemento;
  - o Reformar o Terreno não fere nem prende;
  - os selos dizem quando o elemento é escolhido;
  - o Coração dos Sete Salões uma vez por turno;
  - Forja e Convergência com efeito e falha;
  - fusão Materialização (também no Sintonizador);
  - a Forma Elemental pede concentração.
- **Universais:**
  - a Marca de Caça soma +1d6 no primeiro ataque de cada rodada, com limite de 1 km, e diz o que a Vontade evita;
  - o Clone ataca, e o do Vazio só é atravessado por ataque mundano;
  - atravessar a Muralha de Fluxo custa 3 m, e quem atravessa sofre a variação;
  - Campo, Elo, Lei e Verbo têm efeito mínimo na base;
  - a Convocação ataca com o teste de conjuração e usa a Defesa do conjurador;
  - o Território perdeu o "às cegas";
  - a Lei do Vazio virou escuro e silêncio, e a zona sem magia ficou com o Fim;
  - Toque, Sopro e Erupção da Tecnologia também servem contra criatura comum;
  - os Ritos dos Sete trocam Símbolo nos dois sentidos, e a saída pelo Fim é o Fim de Todos os Ciclos (também na nota de `pecados-e-virtudes.json`).
- **Ficou de fora, de propósito:**
  - a quantidade do ingrediente do Concílio da Verdade, porque o rito não tem número de participantes;
  - os dois sistemas de "âncora", do Marco de Retorno e do Guia Dimensional;
  - o campo `defesa` separado de "se hostil";
  - `vantagens_fluxos.tecnologia` com "todos";
  - a frase sobre o custo dos círculos 9 e 10;
  - a Marca Nunca Igual, que repete o Embaralhar.
- **Testes:**
  - `tests/frontend/segundaPassadaFluxos.test.ts` (novo);
  - o teste do Passo de Órbita em `magicRules.test.ts` acompanha o texto novo;
  - `audit:balance` aprovado;
  - passam 1389 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável).
- ~~**Fica para depois:** a voz do Sábio para Recomeço Absoluto e Sorte Virada.~~ Gravada no fechamento.

### Fechamento das pontas soltas: feito em 2026-10-20 (sem commit)

- **Concílio da Verdade:** até seis participantes, e o ingrediente pede seis objetos pessoais.
- **Marco de Retorno:** o que o rito fixa agora se chama "marco", e a palavra "âncora" fica só para o Guia Dimensional das classes. A Passagem Preparada, o Rito de Fundação e o glossário acompanham.
- **Custo dos círculos altos:** o Livro diz que o 9º e o 10º custam bem mais de propósito.
- **Duplicatas que sobravam (`classes.json`):**
  - o poder `muralha-elemental` da Elementarista se chama Parede Elemental, com o id igual;
  - a Latência do Interceptador deixa o Atrasar segurar o efeito por uma rodada a mais;
  - o Proxy pode mandar a magia de volta ao próprio conjurador, o que o Redirecionar não faz;
  - o Refluxo Hostil ganha 1d6 a cada 5 níveis de Interceptador.
- **Voz do Sábio:** o `edge-tts` foi atualizado para a versão 7.3.1 e voltou a responder. Entraram 10 falas novas: Recomeço Absoluto, Sorte Virada, Sentido Apagado, Esquecimento, Manto do Instante Ausente, Repetição Curta, Repetição de Batalha e Poço de Gravidade, entre outras. Os áudios dos títulos antigos saíram.
- **Testes:** passam 1389 testes do front e 1660 do servidor (a suíte inteira, num Postgres descartável), e a auditoria de balanceamento aprovou.

## Para uma próxima rodada

Ficaram de fora de propósito: são estrutura de dados, conteúdo novo ou design que pede conversa.

- **Estrutura dos dados:**
  - separar o "se hostil" do campo `defesa` (hoje é texto livre dentro do campo);
  - trocar `["todos"]` em `vantagens_fluxos.tecnologia` por listas vazias e uma observação.
- **Invocador:**
  - um botão na aba Aliados para criar a invocação direto do Catálogo;
  - degraus do Catálogo além do nível 20;
  - Vida temporária na ficha do aliado;
  - o Retorno ao Pacto sem limite;
  - o Avatar da Deidade repete a Convergência;
  - o Chamado da Criação traz criaturas de fora do Catálogo.
- **Interceptador:**
  - a Visão de Código (20) não acrescenta mecânica;
  - a calibração de Fluxo da ficha ainda não tem regra;
  - o alcance de detecção (12 m e 24 m) é curto.
- **Cartista Arcano:**
  - um item Baralho na Loja;
  - prêmios do Cassino Lunar por nível;
  - magias com vocabulário de carta;
  - no Físico, no máximo 6 cartas.
- **Sintonizador:**
  - o Aterramento reduz dano por Fluxo de origem (8 por Reação);
  - os níveis 1 e 2 seguem sem fusão.
- **Físico:** o caminho livre continua sem ataque próprio do 1º ao 9º (a Pancada Cinética do relatório resolveria).
- **Vazio:** a assinatura nos encerramentos (consumir Mana do dono do efeito).
- **Marca Nunca Igual:** repete o Embaralhar Resultado para quem tem a Inconstância como Fluxo nativo.
- **Cofre do Obsidian:** fica uma versão atrás até a próxima exportação. Nenhuma nota muda de nome, porque as magias ficam em notas por círculo.

## O que está bom

- O custo de Mana de todas as 352 magias bate com a `mana_base` do círculo, e a DT (7 + 3 × círculo) confere nos 10 círculos.
- Não há id nem título duplicado em magias, rituais, selos e encantamentos.
- Cada Fluxo tem 3 magias por círculo. Espaço e Vazio têm 31 de propósito: Passo de Órbita e Véu do Nada entraram depois, no commit `9234bcc`, e têm teste.
- Os textos não têm travessão (—), e quase todos os ingredientes de ritual existem na Loja.
- Nas 7 classes, todo item da `progressao` tem entrada em `habilidades`, `poderes` ou `eventos` (a exceção é o Interceptador, logo abaixo).
- A tabela de círculos do Livro sai do próprio JSON, então não diverge.

## Problemas que atravessam tudo

Estes aparecem em vários relatórios ao mesmo tempo. Resolver cada um limpa dezenas de achados.

### 1. Classe e motor desligados (código)

1. **Fluxo nativo.** A escolha de Fluxo do Canalizador (`canalizacao-nativa`) não é lida por nada. `obterFluxoNativoId` (`src/services/magiaService.ts:387`) só olha `ficha.fluxoNativoId`, que ninguém grava, ou a Árvore pelo `FLUXO_POR_ARVORE` (`magiaService.ts:294`). Esse mapa leva `keryx` a `tecnologia` e não tem `comunicacao`, então **nenhuma ficha consegue ter Comunicação como Fluxo nativo**, e uma ficha sem Árvore só aprende as 20 universais. Isso afeta todas as classes que conjuram. *(Canalizador, Sintonizador, Cartista, Tecnologia, universais)*
2. **O servidor não confere Fluxo.** `_validar_magias` e `_validar_manifestacao_magica` (`plataforma/core/character_summary.py`) conferem vagas, círculo e fonte, mas não o Fluxo nativo, o acesso Elemental nem o Avatar. Pela API dá para salvar magia de outro Fluxo. *(Cartista, Elementarista, Ritualista)*
3. **Acesso elemental com 1 nível.** `restricaoMagiaElemental` (`magiaService.ts:349`) exige só 1 nível de Elementarista e usa o maior círculo entre todas as classes. Um Canalizador 20 que pega 1 nível de Elementarista aprende Égide de Moros (10º). O texto diz que as Elementais "exigem níveis de Elementarista". *(Elementarista)*
4. **Ruptura Derivada não pode ser escolhida.** O pré-requisito "Derivações Harmônicas" está sem número, e o parser não o reconhece. A correção é escrever "Derivações Harmônicas 1". *(Elementarista)*
5. **Sintonizador sem Tecnologia.** A tela, o serviço e o servidor tiram Tecnologia dos catalisadores (`AbaMagias.tsx:161`, `magiaService.ts:363`, `character_summary.py:42`), mas a classe oferece a fusão Programação. A tela também mostra fusões que o jogador não aprendeu (`AbaMagias.tsx:1032`). *(Sintonizador)*
6. **Interceptador na ficha.** O seletor de círculo da magia interceptada é cortado pelo Fluxo do próprio Interceptador (`AbaMagias.tsx:217`), e os bônus da classe (+2 no nível 10, Acesso Administrador) não entram na rolagem. *(Interceptador)*
7. **Escolha "permanente" que se tira.** `permanente: true` em `escolha_opcoes` não é lido: o elemento de origem e o resultado do Julgamento ganham botão "Tirar". *(Elementarista)*
8. **Catálogo do Invocador fora do PDF.** O compêndio imprime só o `resumo_no_topo` e pula as 30 fichas de invocação (`tools/documentos-mundo/compendio.mjs:145`). *(Invocador)*

### 2. Vagas sem nada para preencher

- **Selos, encantamentos e rituais.** Cada Fluxo tem só 3 de cada, e a ficha só deixa aprender do Fluxo nativo (`magiaService.ts:662-681`). Mas as vagas sobem a 11 (Canalizador e Sintonizador), 6 (Cartista) e 7/6/6 (Ritualista). Do nível 15 em diante, a maior parte das vagas fica vazia para sempre. *(Canalizador, Sintonizador, Cartista, Ritualista)*
- **Cartista Arcano.** Com o teto de 4 por círculo, o máximo real é 8 magias, mas as vagas vão a 12. O teto também começa no nível 20, enquanto o Livro diz 25. *(Cartista)*
- **Físico não elemental.** Só 9 das 30 magias do Físico ficam livres para Canalizador e Sintonizador, e não há nenhuma no 2º, 6º e 9º círculos. O Cartista de Físico tem 5 magias possíveis no total. O relatório do Físico propõe Pancada Cinética (2º) e Campo de Gravidade (6º). *(Físico, Canalizador, Cartista)*

### 3. Regras do sistema que faltam

- **Ataque × resistência.** As 74 magias com `ataque: true` trazem também uma `defesa`, mas o tópico Magia e Fluxo separa magia de ataque (contra a Defesa) de magia de efeito (resistência). O texto usa a resistência de três jeitos diferentes. Há uma proposta de convenção em três linhas em [`universais-e-regras.md`](fluxos/universais-e-regras.md#convenção-proposta-para-ataque--defesa).
- **Campos `defesa` vazios em magias que pedem resistência no texto:** `salto-improvavel`, `labirinto-dobrado`, `dominio-da-matriz`, `dominio-do-ritmo`, `controle-de-massa`. Sem o campo, a ficha não mostra o teste.
- *(Resolvido em 2026-10-20, opção A; ver acima.)* **Efeitos fortes sem teste nenhum:**
  - `conservacao-absoluta` tira qualquer criatura da cena por 7 dias;
  - `parada-do-mundo` congela todos numa área de 150 m;
  - `ancora-do-ser` trava a forma de um inimigo por 24 horas;
  - `nada-absoluto` deixa todos na área cegos e calados, inclusive os aliados.
- *(Resolvido em 2026-10-20; ver acima.)* **Termos que não existem nas regras:** "Defesa do efeito" (9 magias), "Revelado", "Desligado", "alcançar o próprio Fim", "o Fim já se consolidou", "Ferimento Crítico consolidado", "ausente", "alma própria", "reconquista", "módulo A.X.I.S", "mudo", "Nocauteado", "ação simples", "terreno seguro". A regra de "fronteira selada" também muda de uma magia para outra.
- *(Resolvido em 2026-10-20; ver acima.)* **Condições sem duração ou sem jeito de sair:** Imobilizado em `primavera-devastadora`, `chuva-de-esporos`, `implosao-dimensional` e outras.
- *(Resolvido em 2026-10-20; ver acima.)* **Tipos de dano.** Comunicação usa "dano mental", que tira Sanidade ou Mana. Vitalidade usa "veneno", um tipo persistente. Tecnologia e o Físico não material muitas vezes não dizem o tipo. Aparecem ainda "dano de energia", "frio" e "espiritual" fora da tabela. Proposta: "dano de <Fluxo>" para todo Fluxo natural.
- *(Resolvido em 2026-10-20; ver acima.)* **Fluxo recomendado inalcançável.** Sem itens, um personagem chega ao nível 20 com Fluxo perto de 20, e o recomendado do 10º círculo é 50. As Marcas do 5º ao 9º círculo só aparecem com Fluxo 30 ou mais. *(Canalizador)*
- *(Resolvido em 2026-10-20; ver acima.)* **"Bônus específico da classe"** na fórmula do teste de magia: nenhuma classe define esse bônus.
- *(Resolvido nas correções baratas.)* **Roda de vantagens:** `fisico.vantagem_contra` não tem `comunicacao`, e o Guia do Mestre diz que deveria. Sem isso, ninguém tem vantagem contra a Comunicação.
- *(Resolvido nas correções baratas.)* `regras.ts:1145` fala em "os outros dez Fluxos naturais", mas são nove.

### 4. Balanceamento que se repete

- *(Resolvido em 2026-10-20; ver acima.)* **Tempo dá ações demais.** Aceleração (4º círculo) dá mais ações que Tempo Emprestado (8º). As variações de Forma e Avatar dão ação e turno extras pela cena inteira. Algumas escadas estão invertidas: Roubar Turno (7º) tira mais turnos que Exílio Temporal (10º). E só 9 das 30 magias cobram o desgaste que o Fluxo promete.
- *(Resolvido em 2026-10-20; ver acima.)* **Morte sem limiar.** A Palavra de Morte (`sentenca-final`, 10º) mata numa falha de Fortitude, com qualquer Vida. A deidade do Fim exige metade da Vida e três falhas.
- *(Resolvido em 2026-10-20; ver acima.)* **Encerrar efeitos sem teto de círculo:** `fechar-ciclo` (4º) e as variações do Fim em 9 universais, além de `escudo-do-vazio`, `apagar-efeito`, `dissipacao-veridica` e Custódia da Alma.
- *(Resolvido em 2026-10-20: as interceptações e a Represália na primeira passada, Arma de Fluxo e Marca de Caça na segunda; ver acima.)* **Variações universais acima das magias do próprio Fluxo.** Acontece no Tempo, no Fim, na Tecnologia e na Comunicação. A base de `arma-de-fluxo` causa 4d8 + Mod. a cada golpe por uma cena. `marca-canalizada` dá +1d6 em todo ataque pela cena.
- *(Resolvido em 2026-10-20, nos oito Fluxos; ver acima.)* **Comunicação** é o único Fluxo cujos ataques não somam o Mod. Fluxo, e nada no texto explica essa perda como efeito do Fluxo enfraquecido.
- *(Resolvido em 2026-10-20. As últimas, o poder `muralha-elemental` e a Latência, saíram no fechamento.)* **Duplicatas:**
  - `nada-pessoal` (3º) repete `ausencia-de-si` (5º);
  - `silenciar-fluxo` é igual à variação do Vazio em `lei-do-fluxo`;
  - `aniquilador-de-padroes` repete a variação da Tecnologia em `sentenca-do-fluxo`;
  - a variação da Origem em `verbo-do-fluxo` repete `genese`;
  - a variação da Vitalidade em `territorio-do-fluxo` repete `coracao-incansavel`;
  - o poder `muralha-elemental` tem o mesmo id e título da magia, com números diferentes;
  - Latência faz o mesmo que a técnica Atrasar.
- *(Resolvido em 2026-10-20, nos oito Fluxos; ver acima.)* **Inconstância sem tabela.** Pelo menos 9 magias mandam rolar ou "sortear pelo Mestre" sem dar a tabela. O relatório do Fluxo propõe quatro tabelas curtas.
- *(Resolvido em 2026-10-20: o Vazio antes, o resto nos oito Fluxos; ver acima.)* **Limites do Fluxo atravessados:**
  - criar do nada: `genese-menor`, `ecossistema-convocado`, `semente-adormecida`, `eden`, o clone de Vitalidade e o clone e a convocação do Vazio;
  - ler mente: a variação da Comunicação em `singularidade`;
  - voltar no tempo: `restaurar-o-estado`, `recomeco-absoluto`, `reliquia-conservada` e `reviravolta`.

### 5. Texto para o jogador

- **"eco":**
  - a fusão do Tempo (`eco`, título "Eco");
  - as magias Eco Curto e Eco de Batalha;
  - a Marca `tempo-eco-curto`;
  - `velorio-do-ciclo` e `ultimo-adeus`;
  - a opção "Eco Hostil" do Interceptador.

  Basta trocar o `titulo` e manter o `id`. Mudar o id descartaria escolhas já gravadas nas fichas.
- *(Resolvido em 2026-10-20 na passada de tom; ver acima.)* **Antíteses "não é X, é Y" e variantes:**
  - em 18 ids de `magias.json` (lista em [`universais-e-regras.md`](fluxos/universais-e-regras.md#tom-todos-os-campos-de-texto-de-datafichamagiasjson));
  - nas páginas das classes: `Invocador.tsx`, `CartistaArcano.tsx`, `Elementarista.tsx`, `Sintonizador.tsx` e `Interceptador.tsx`;
  - em `AbaMagias.tsx:1225`.
- **" - " no lugar de travessão:** no estágio 1 do Pacto do Invocador e em `Interceptador.tsx:142`.
- **Textos quebrados:**
  - `varredura-de-padrao`: "Habilidade a varredura não copia";
  - `colheita`: "Vida o Fluxo continua não devolvendo a ninguém";
  - `decreto-registrado` e `concilio-do-mundo`: frases com a ordem invertida.

## Decisões que são suas

Estas não se resolvem só corrigindo texto. Cada uma muda regra ou arquitetura.

1. *(Decidida em 2026-10-20: A + 1, já implementada; ver acima.)* **Comunicação pode ser Fluxo nativo?** Se sim, a Parley precisa de um id de Árvore próprio, ou a Árvore `keryx` precisa oferecer a escolha entre Parley e A.X.I.S. Também falta gravar `fluxoNativoId` e decidir se a escolha do Canalizador manda no Fluxo nativo.
2. *(Decidida em 2026-10-20: B, já implementada; ver acima.)* **Selos, encantamentos e rituais.** Ampliar o catálogo (5 ou mais por Fluxo, ou criar universais), abrir outros Fluxos para quem tem muitas vagas (o Ritualista e o Sintonizador combinam com isso) ou cortar as vagas para 3.
3. *(Decidida em 2026-10-20: C, já implementada; ver acima.)* **Físico no 2º, 6º e 9º círculos.** Criar magias não elementais ou tirar algumas da lista elemental. Fortes candidatas a sair: `armadura-de-materia`, `muralha-do-baluarte` e `egide-de-moros`, esta última sem elemento no texto.
4. *(Decidida em 2026-10-20: A, já implementada; ver acima.)* **Acesso elemental.** Travar no círculo do nível da própria Elementarista ou aceitar a entrada com 1 nível e reescrever os textos.
5. *(Decidida em 2026-10-20: A, já implementada; ver acima.)* **Convenção ataque × resistência.** Mexe nas 74 magias de ataque e na Aba Magias.
6. *(Decidida em 2026-10-20: A, já implementada; ver acima.)* **Invocador.** É classe mágica de verdade? O "Pacto de Fluxo nativo" não tem nada de Fluxo, e a classe não conjura. Faltam também limite de invocações ao mesmo tempo (hoje chega a 10), Iniciativa, bônus de ataque e regra de morte e retorno.
7. *(Decidida em 2026-10-20: A nas três perguntas, já implementada; ver acima.)* **Interceptador.**
   - Pacote Descartado, que é a interceptação em si, deveria vir fixo? Hoje é um poder opcional, e sem ele metade da classe não funciona.
   - Contra criaturas do Mestre, que não têm círculo, falta uma tabela de "círculo equivalente".
   - Falta dizer se as zonas dele atingem os aliados.
8. *(Decidida em 2026-10-20: A nas duas perguntas, já implementada; ver acima.)* **Cartista Arcano.**
   - O que é carta, mão, compra e descarte? A classe promete isso e nunca define.
   - Em cima de outra classe que conjura, o limite de 2º círculo some. Aceitar ou travar?
9. *(Decidida em 2026-10-20: C e A, já implementada; ver acima.)* **Catalisador do Sintonizador.** É item físico (então entra na Loja, com raridade) ou uma sintonia abstrata? Três poderes o tratam como objeto. Também falta definir o que significam vinculado, preparado, ativo e desativado.
10. *(Decidida em 2026-10-20: A, já implementada; ver acima.)* **Vazio × limite "não cria".** O clone e a convocação do Vazio criam criaturas. Afrouxar o limite ("não cria matéria nem vida") ou reescrever as duas como lacunas sem Vida.
11. *(Decidida em 2026-10-20: B, já implementada; ver acima.)* **Tecnologia contra Autômato.** Várias magias desligam ou destroem Autômato sem teste, e Autômato é raça jogável. Falta criar a condição "Desligado" e dar teste.

## Ordem sugerida

1. **Correções baratas e certas**, que não pedem decisão:
   - Ruptura Derivada;
   - `fisico.vantagem_contra`;
   - Acesso Administrador duplicado no nível 18;
   - "Grito de Guerra" (não existe), as Formas Vinculadas (4 na descrição, 6 opções) e "25 fichas" (são 30) no Invocador;
   - "dez Fluxos" em `regras.ts`;
   - os campos `defesa` vazios;
   - os dois textos quebrados;
   - "Derivações Harmônicas 1";
   - os títulos com "eco".
2. **As decisões acima**, começando pela 1 (Fluxo nativo) e pela 2 (vagas), que destravam mais coisa.
3. **Balanceamento por Fluxo**, seguindo cada relatório. Tempo, Fim e Vazio são os que mais pedem. (Tempo, Fim e Vazio feitos; nos outros oito, as duas passadas foram feitas em 2026-10-20.)
4. **Tom do texto**: as antíteses (feito em 2026-10-20, com trava) e as frases de cena que prometem mais que a regra.

Quem for mexer no catálogo deve ler [`docs/EDITOR_CONTEUDO_CAMPANHA.md`](../../EDITOR_CONTEUDO_CAMPANHA.md) antes. Trocar o id de uma magia exige migração, então a maioria das correções deve mudar só `titulo`, `descricao`, `efeito` e números.

## Relatórios por Fluxo

| Fluxo | Achados | Principais pontos |
|---|---|---|
| [Origem](fluxos/origem.md) | 25 | Imobilizado sem saída, criação do nada, magias de "voltar ao começo" que são do Tempo, seis jeitos de refazer teste |
| [Essência](fluxos/essencia.md) | 25 | "Revelado" não existe, dissipação geral que é do Fim, 10 ataques e pouca investigação, escada de âncoras confusa |
| [Comunicação](fluxos/comunicacao.md) | 25 | "dano mental", ataques sem Mod. Fluxo, leitura de mente na Singularidade, Ajudar acima do teto de +4 |
| [Vitalidade](fluxos/vitalidade.md) | 25 | "veneno" como tipo do Fluxo, contágio sem regra, Éden e clone criando vida, curas em área fortes |
| [Inconstância](fluxos/inconstancia.md) | 26 | sorteios sem tabela (quatro tabelas propostas), Mundo Instável que se anula, Reviravolta que volta no tempo |
| [Físico](fluxos/fisico.md) | 25 | buraco no 2º, 6º e 9º círculos, magias sem tipo de dano e sem resultado de sucesso, "redução" × Resistência |
| [Espaço](fluxos/espaco.md) | 25 | "fronteira selada" sem regra única, Portal Maior melhor que Dobra de Exército, carga em kg × espaços |
| [Tempo](fluxos/tempo.md) | 25 | economia de ações quebrada, Estase sem teste, restaurar a cena é voltar ao passado, desgaste irregular, "eco" |
| [Vazio](fluxos/vazio.md) | 25 | duplicatas, "ausente" sem definição, Escudo do Vazio sem teto, clone e convocação que criam |
| [Fim](fluxos/fim.md) | 24 | Palavra de Morte sem limiar, encerrar sem teto de círculo, "ressurreição" que não existe, "eco" em dois rituais |
| [Tecnologia](fluxos/tecnologia.md) | 24 | Autômato desligado ou destruído sem teste, registrar e reproduzir que não fecham, "módulo A.X.I.S" que não existe |
| [Universais e regras](fluxos/universais-e-regras.md) | 29 | convenção ataque × defesa, Arma de Fluxo e Marca de Caça fortes, bases vazias, fusões desiguais, lista de tom |

## Relatórios por classe

| Classe | Achados | Principais pontos |
|---|---|---|
| [Canalizador](classes/canalizador.md) | 20 | escolha de Fluxo nativo ignorada, Canalização Rápida sem efeito possível, vagas de selo mortas, "DT" ambígua |
| [Sintonizador](classes/sintonizador.md) | 15 | Tecnologia fora dos catalisadores, estados do catalisador sem definição, estágio 5 dentro da Convergência |
| [Ritualista](classes/ritualista.md) | 20 | vagas além do que o Fluxo nativo tem, Rito Guardado em combate contra a regra geral, Cansaço sem fonte, fórmula sem metade do nível |
| [Invocador](classes/invocador.md) | 20 | catálogo fora do PDF, invocação sem ataque, Iniciativa ou limite, "Pacto de Fluxo" sem Fluxo, textos que não batem |
| [Cartista Arcano](classes/cartista-arcano.md) | 18 | Arcano Absoluto repete o Baralho 5, vagas 9 a 12 mortas, mecânica de cartas indefinida, limite de 2º círculo que some |
| [Interceptador](classes/interceptador.md) | 19 | interceptação é poder opcional, Acesso Administrador duplicado, nada a interceptar em criatura sem círculo, ficha sem os bônus |
| [Elementarista](classes/elementarista.md) | 19 | Ruptura Derivada inescolhível, acesso elemental com 1 nível, servidor sem checagem, escolhas "permanentes" removíveis |
