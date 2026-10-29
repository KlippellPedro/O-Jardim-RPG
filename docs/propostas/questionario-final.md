# Questionário final (outubro de 2026)

Tudo o que ficou em aberto depois da polida final, num lugar só:
- a revisão das raças;
- a revisão das classes;
- as perguntas que os próprios arquivos de lore guardam;
- os Soberanos que ainda têm nome ou epíteto provisório.

**Como responder:** mande o número e a letra, por exemplo "1A, 2B, 3C". Onde houver "outra", escreva o que quiser. A opção A de cada pergunta é a minha recomendação. Não precisa responder tudo de uma vez: o que ficar sem resposta continua como está hoje.

O detalhe de cada ponto está nos relatórios:
- [raças](revisao-racas-2026-10/README.md);
- [classes](revisao-classes-2026-10/README.md).

## Respostas

Respondidas em 2026-10-28:

| Pergunta | Resposta |
|---|---|
| 1. Quanto uma cura cura | A |
| 2. DT das raças | A |
| 3. Condição leve, média e grave | A |
| 4. Fascinado, Enjoado e Surdo | A |
| 5. Visão, luz e ocultação | A |
| 6. Resistência contra todo dano | A |
| 7. Crítico nas classes | A |
| 8. Convenções da magia nas raças e classes | A |
| 9. Tamanho | A |
| 10. Soco de quem não é Lutador | B (1d4 de impacto + Mod. Força para todos) |
| 11. Voltar da morte | B (volta rara e cara, com regra em Ferimentos) |
| 12. Dano psíquico | B (dano mental, que tira Sanidade, com dados menores) |
| 13. Dano espiritual | A (dano de Essência) |
| 14. Dano verdadeiro | Outra: "dano verdadeiro é um tipo que não tem como ter resistência, por isso ele é um dos tipos de dano mais fortes". Ele entra na tabela de Tipos de Dano como tipo oficial, que nenhuma Resistência reduz. |
| 15. Vida, Mana e Estamina das raças | C (subir só as leves, sem mexer em Golem e Gigante) |
| 16. Raças que não crescem | A |
| 17. Autômato | A |
| 18. Deus × Semideus | B (o Deus fica como está, e só o Semideus ganha algo) |
| 19. Espírito natural e o Fluxo da marca | A |
| 20. Pecados e Virtudes do Espírito | A (uma rodada só disso) |
| 21. Régua de dano e cura | A |
| 22. Classes com pouco em combate | A |
| 23. Nível 20 repetido | A |
| 24. Guardião | A |
| 25. Lutador e as Marcas de Guerra | A |
| 26. Noite Eterna | A (a mesma noite) |
| 27. Pricolici e a lua | A |
| 28. Gigante Colossal | A |
| 29. Altura dos Autômatos bípedes | A |
| 30. Armas do Autômato | A (dano tecnológico) |
| 31. Engenho Divino | A (fica raio) |
| 32. Domínio da Morte do Divino | A (Fim) |
| 33. Animália: Traços | A (sempre Normal) |
| 34. A língua de cada povo | A |
| 35. Caçador: Especialização | A (raça ou família) |
| 36. Piloto e montaria | A |
| 37. Detetive | A (comum) |
| 38. Devorador contra criatura sem classe | A |
| 39. Cataclismo do Ano Zero | B (segredo de propósito, guardado para uma campanha) |
| 40. Ano atual da campanha | C (cada mesa escolhe o seu "agora") |
| 41. Sucessão de Iwagakure | A (duelo até a morte) |
| 42. Arautos e Conselho da Existência | Outra: "apaga os arautos e o conselho é formado por todas as deidades". Os Arautos saem da nota do Tribunal, e o Conselho da Existência passa a ser as deidades reunidas. |
| 43. Blanc: o Fluxo Universal | A (a origem de todos os espíritos) |
| 43b. Blanc: o epíteto | A (Soberana dos Espíritos fica) |
| 43c. Blanc, a Mulher Carmesim e Erebus | A (acompanha os espíritos até o fim e entrega a quem eles pertencem, sem servir a nenhum dos dois) |
| 44. Ushumgal: o nome | A (fica) |
| 44b. Ushumgal e os outros dragões | A (é a referência, o que todos estão crescendo para ser) |
| 44c. Ushumgal: ficha | A (VD acima das Deidades, acima de 1000) |
| 44d. Ushumgal: os jogadores sabem? | A (só por boato) |
| 45. Circe: o epíteto | A (Soberana da Magia fica) |
| 45b. Circe: o colar | A (Relíquia da Criação com ficha; nome a propor) |
| 45c. Circe: o que ela quer | A (em aberto até a campanha) |
| 46. Karnath: o nome | A (fica) |
| 46b. Karnath: ficha | A (VD acima das Deidades) |
| 47. Shinji Takamori | A (a lâmina continua segredo; aparência e idade depois) |
| 48. Zero | A (nome e epíteto ficam; a Noite Carmesim continua em aberto) |
| 46c. Karnath, o Vazio e Selah | A (em aberto) |
| 49. Contos das Entidades | B (ficam como estão) |

Todas as perguntas foram respondidas.

## O que as respostas pedem (ordem para aplicar)

Cada rodada fecha com testes, Livro e mural, como nas revisões.

**Rodada 1 aplicada em 2026-10-28 (sem commit).** O teste é `tests/frontend/regrasBaseQuestionario.test.ts`. O que entrou:
- **Condições:**
  - Fascinado, Enjoado e Invisível viraram condições oficiais, e a ficha aplica sozinha o Enjoado e o Fascinado;
  - o Surdo já existia nas condições de longo prazo, então não foi duplicado;
  - entrou a escala de gravidade, com o campo `gravidade` nas condições e a tabela no Livro.
- **Tipos de Dano:** o dano verdadeiro entrou como tipo à parte, sem Resistência, e a redução de dano entrou como último passo da ordem de aplicação. Dano mental passou a usar dados pequenos.
- **Combate:** entraram o ataque desarmado (1d4 + Força), o quadro Ver e ser visto e o tópico Tamanho.
- **Ferimentos:** entraram Tratar ferimentos e Voltar da morte.
- **Médico:**
  - a Medicina 1 cura 1d6 + Mod. Sabedoria (Cura DT 15, uma vez por criatura por cena);
  - o Socorro levanta o aliado com 1 de Vida.
- **Textos trocados:**
  - "Resistência contra todo dano" virou redução de dano em 8 efeitos de classe, num traço do Espírito, numa magia e em quatro itens da Loja;
  - "dano espiritual" virou dano de Essência no Caçador das Almas;
  - "dano psíquico" virou dano mental (Sereia 2d6, Onírico 1d8 por turno, Escritor 1d6);
  - Encantado virou Fascinado, e Ofuscado saiu;
  - "Miúdo" e "Médio" de tamanho viraram Minúsculo e Normal;
  - "Fique invisível" virou Invisível;
  - a Reconstrução aponta para a regra de Voltar da morte.

**Rodada 2 aplicada em 2026-10-28 (sem commit).** O teste continua em `regrasBaseQuestionario.test.ts`, que trava as duas rodadas. O que entrou:
- **DT de raça (pergunta 2):** campo `dt_efeitos` em 13 raças, mostrado na página da raça e no Livro:
  - Vampiro com Intimidação, Sereia com Atuação e Divino com Religião;
  - Gigante e Golem com Atletismo, Slime com Fortitude e Anão com o Ofício de Forja;
  - Auleth, Elfo, Bruxa, Onírico, Espírito e Feérico com Misticismo.

  Os 17 testes "contra o seu Carisma", os cantos da Sereia que rolavam Carisma e os testes sem número passaram a apontar para a DT da raça. A Anomalia rola a perícia da Assinatura, e o Simbionte ganhou DT 15 ou 20 no rastro.
- **Crítico (pergunta 7):** a regra entrou em Combate. Golpe Certeiro, Corte Fatal, Fio Afiado, Ponto Fraco e Predador Perfeito só alargam a margem em arma x2; em x3 ou x4, viram dado a mais no crítico. Golpe Certeiro e Corte Fatal valem uma vez por arma e não entram juntos.
- **Convenções (pergunta 8):** dano em área com teste e metade no sucesso, travas com teste repetido, e efeito de cena uma vez por cena.
  - Raças: Gigante, Sereia, Slime, Golem, Anão, Elfo, Auleth, Divino e Vampiro.
  - Classes: Pirata (4), Campeão, Engenheiro, Caçador das Almas e Elementarista.
  - Os danos sem tipo dessas habilidades ganharam tipo, e a "Redução 5" do Sepulcro Glacial virou redução de dano.
- **Régua (pergunta 21):** a tabela por custo de Mana e por Estamina entrou no Guia das classes. Hadō e Kidō de Cura descem para 2d8 (3d8 por mais Mana no 10). Soco e Impacto crescem com o nível, e a Investida Predatória dá +1 dado (+2 por 6 de Estamina).

**Rodada 3 aplicada em 2026-10-28 (sem commit).** Os testes novos estão no fim de `regrasBaseQuestionario.test.ts` e em `TestRodadaTresDasRacas` (servidor). O que entrou:
- **Pacote (15C):** Sereia e Anão sobem até 14 no topo. Golem e Gigante continuam em 39.
- **Escadas (16A):**
  - Humano (Versátil, Calejado no 12, Lenda Viva no 36), Goblim (Ligeiro, Esperto no 11, Rei do Mercado no 30) e Feérico (Faísca, Encanto Antigo no 12, Corte das Fadas no 34), todos com 14 no topo;
  - Desperto, Clone, Anomalia, Amálgamo e Bruxa ganham um degrau no 20 (+5 de recurso e o que a raça já tem crescendo).
  - O Calejado do Humano dá +2 nos testes sem grau, no lugar da perícia a mais em Aprendiz da proposta: grau de perícia fora da criação mexeria na conta de Graus de Treinamento do servidor.
  - O Organismo Otimizado do Clone segue com +1 de Vida por nível e não ganha nada no degrau.
- **Autômato (17A, 29A, 30A):**
  - Corpo Maciço com Resistência 2 a corte, perfuração e impacto, +1 a cada 10 níveis;
  - Pulso Estridente até o fim do próximo turno, Raio Inferno uma vez por cena, Laser 4d10+4 com metade, Eletrificar duas vezes por cena;
  - Resistente +1 de Vida por nível, teto de 8 modificações (ficha e servidor), vantagem em Furtividade e Reflexos no chassi pequeno;
  - bípedes com 1 / 1,8 / 3 / 4,5 m, armas com dano tecnológico, alcances na grade de 1,5 m, e o Corpo Artificial com condições oficiais e Cansaço.
- **Semideus (18B):** Legado a mais (o campo `legados_adicionais` da escolha racial conta na ficha e no servidor) e a Bênção de Sangue. O Deus ficou como estava.
- **Espírito natural (19A):** o Fluxo da marca é o nativo (`magiaService`), e o Livro diz isso em Princípios dos Fluxos. O Azul-Neon conjura Tecnologia; o Universal, demônio e anjo seguem a Árvore.
- **Noite Eterna (26A):** uma frase no Clã do Vampiro e outra na Linhagem do Elfo.
- **Domínio da Morte (32A):** os três poderes causam dano do Fim.
- **Língua (34A):**
  - campo `linguas` (id e nome da entrada de `idiomas.json`) em toda raça jogável, mostrado em "O que todo povo carrega" e no Livro;
  - Desperto, Anomalia, Amálgamo e Auleth têm uma frase própria em `linguas_nota`;
  - os documentos do Mundo passaram a ler a língua da raça, sem mapa repetido.
- **Achado do relatório do Anão:** a Obra de Mestre do Ferreiro virou obra-prima permanente (+1), uma vez por arco, e deixou de repetir a Obra que Fica.
- Perguntas 27, 28 e 33 não pediam mudança.

**Rodada 4 aplicada em 2026-10-28 (sem commit).** Os testes estão no fim de `regrasBaseQuestionario.test.ts`. O que entrou:
- **Combate (22A):**
  - Viajante (Golpe Baixo, Já Saí de Pior, Conhece o Terreno), Guia Dimensional (Corte de Coordenada, Dobra Esmagadora), Pop Star (Refrão, Bis), Comerciante (Saque e Uso, Demonstração), Detetive (Já Vi Esse Golpe, e a Leitura Rápida revela Resistência ou vulnerabilidade) e Interceptador (Choque de Malha);
  - o Rito Guardado desce para o 5 (Simples), Complexo no 10 e Grandioso no 15, e a Mão Firme foi para o 15;
  - o Guia das classes ganhou "Classes que brilham fora da luta".
- **Nível 20 (23A):** Duas Marcas (Atirador), Invenção Suprema permanente e sem dano (Engenheiro), Âncora Maldita (Pirata), Âncora Viva (Guia), Ápice do Fluxo que ignora Resistência (Canalizador). O Mestre da Vida impede morte por três rodadas e cura 4d8 + Sabedoria; a Panaceia limpa as condições; a Dose da Pedra encerra aflição ou condição de longo prazo; a Transmutação saiu da Pedra Filosofal. A Mesa da Celebração do Chef ficou igual.
- **Guardião (24A):** Muralhas de Ouro, Ferro e Diamante travadas no 6, 11 e 16; Provocar uma vez por rodada, com Vontade no fim do turno para encerrar; o 20 dá −5 e contra-ataque.
- **Lutador (25A):** a Marca de Guerra diz que o ataque a mais é a compensação do punho.
- **Caçador (35A):** as famílias do Bestiário entraram na Especialização (`familia-<id>`), e os textos falam em presa.
- **Piloto (36A):** o Xodó pode ser montaria, com Cavalgar.
- **Detetive (37A):** saiu o `patamar`.
- **Devorador (38A):** contra criatura do Bestiário, copia uma habilidade da ficha dela, com VD até o nível de Devorador.
- **Achados dos relatórios:**
  - habilidade no 18 para Guerreiro (Bandeira Fincada), Piloto (Piloto de Fuga) e Ritualista (Círculo Permanente);
  - títulos em todos os estágios das 13 habilidades que não tinham;
  - alcances na grade de 1,5 m, queima e veneno com Queimando e Envenenado, DTs e números que faltavam;
  - Cliffhanger uma vez por cena, Regeneração de Banquete uma vez por cena, Guarda-Costas com ficha, Ataque Oculto uma vez por rodada, Aplicação Inteligente com o Mod. Inteligência.
- **Ficaram de fora, por mudarem o desenho da classe** (cada um pede conversa própria):
  - os poderes do Alquimista que repetem fórmulas;
  - o Além do Comum do Campeão;
  - os bônus empilhados no teste de conjuração do Canalizador;
  - a Mana que sobra no Chef e no Piloto;
  - os poderes "versão II" do Espadachim (só o Corte à Distância II virou passivo);
  - o Arsenal Especial do Guerreiro;
  - Aterramento e Frequência Protetora do Sintonizador;
  - a Defesa sem armadura do Lutador, que a ficha não sabe somar ainda.

**Rodada 5 aplicada em 2026-10-28 (sem commit).** O relatório está em `docs/propostas/revisao-espirito-2026-10/README.md`.
- A auditoria do Espírito ganhou cinco regras das convenções, só para as Naturezas demoníaca e angelical. Elas acham 17 problemas no texto antigo e nenhum no novo.
- Correções:
  - a Possessão pede teste repetido;
  - Pecado e Virtude Absolutos viraram espelhos, assim como os dois Corpos do 60;
  - Promessa Doce, Vício Irresistível e Eternidade Parada ganharam teste repetido;
  - "encantamento" virou controle mental ou Fascinado na Castidade e na Luxúria;
  - os danos em área da Gula ganharam teste com metade;
  - os danos sem tipo ganharam o tipo Essência.
- Três decisões e uma pergunta, respondidas no mesmo dia:
  - as oito habilidades que passavam da régua de magia subiram de custo (a Chuva do Inferno foi de 12 para 56 Mana), e a auditoria ganhou a regra `acima-da-regua`;
  - a Paz Imposta continua uma vez por sessão;
  - o Dia Inteiro numa Hora fica como está;
  - o dano do corpo possuído ou encarnado sai da Vida do Espírito.

**Rodada 6 aplicada em 2026-10-28 (sem commit).** O teste está no fim de `regrasBaseQuestionario.test.ts`, e o do servidor em `test_deidades_e_ids.py`. O que entrou:
- **Cataclismo (39B, 40C):** o `_o_que_falta` virou `_decisao` (o lançador é segredo de propósito; cada mesa escolhe o ano), e o Guia ganhou "O ano da campanha" na estante O mundo reage.
- **Iwagakure (41):** a aldeia obedece ao Kage, e quem o derrota em duelo até a morte toma o lugar dele.
- **Tribunal (42):** os Arautos saíram, e o Conselho da Existência são todas as deidades, a Mulher Carmesim entre elas.
- **Blanc (43):** o Fluxo Universal é a origem de todos os espíritos, e ela os entrega à Mulher Carmesim ou a Erebus sem servir a nenhum dos dois. O epíteto fica. Também saiu um "Criação" que devia ser Origem. Fica em aberto o nome verdadeiro e a idade.
- **Ushumgal e Karnath (44, 46):**
  - ficha de Soberano no VD 1200, na lista nova `soberanos` do arquivo das Deidades (só do servidor), no Bestiário da Sessão para quem comanda a mesa e na seção "Fichas dos Soberanos" do Guia;
  - para caber, o `vd_maximo` subiu de 1000 para 1500, e a curva de criatura foi regenerada até o 1500;
  - o boato de Ushumgal entrou na família Dragão do Bestiário, sem o nome;
  - a aparência de Karnath e a relação com o Vazio e Selah continuam em aberto.
- **Circe (45):** o epíteto fica, e o colar virou o Colar das Nove Lascas, Relíquia da Criação na Loja (artefato, 700 Fragmentos de Estrela, autorização do Mestre), sem citar a dona. O que ela quer continua em aberto.
- **Shinji (47) e Zero (48):** os `_o_que_falta` ficaram só com o que segue em aberto (aparência e idade de Shinji; o Sangue de Zero, o que a Mulher Carmesim pensa dele e a Noite Carmesim).
- **Fora do questionário:** o `_o_que_falta` dos Idiomas (Auleth ou Aethel) ficou, porque não foi perguntado. Os dados já tratam o criador do Universal como um Auleth.

As entradas com versão publicada no banco só mudam no site depois de republicar pelo Painel. No snapshot global de 29/08, só o Cataclismo tinha versão publicada, e nele só mudou um campo de anotação.

Ficou para depois, sem decisão: o Bestiário tem 7 ataques com "dano psíquico" de VD alto (Olhar do Anfitrião, Palavra de Sentença e outros), fora do escopo da pergunta 12. Os veículos mantêm a escala própria de tamanho (pequeno, médio, grande, colossal).

1. **Regras base** (perguntas 1, 3, 4, 5, 6, 9, 10, 11, 12, 13 e 14). Mexe em `regras.ts`, nas Condições e em Tipos de Dano:
   - cura do Médico e tratamento para todos;
   - escala leve, média, grave e gravíssima;
   - Fascinado, Enjoado e Surdo;
   - quadro de visão, luz e ocultação, com Invisível como condição;
   - redução de dano no lugar de Resistência a todo dano;
   - tópico Tamanho com seis categorias, Colossal incluso;
   - desarmado de 1d4 + Mod. Força para todos (o Lutador segue com Mão Fechada no 3);
   - volta da morte rara e cara, com regra em Ferimentos e a Reconstrução apontando para ela;
   - psíquico vira dano mental (Sanidade, dados menores);
   - espiritual vira Essência;
   - dano verdadeiro entra na tabela como tipo oficial que nenhuma Resistência reduz.
2. **DT, crítico e convenções** (2, 7, 8 e 21):
   - DT por raça (Vampiro Intimidação, Sereia Atuação, Divino Religião);
   - regra do crítico nas classes;
   - as convenções da magia nas cerca de 30 habilidades;
   - a régua de dano e cura nos cinco poderes.
3. **Raças** (15 a 19, 26 a 30, 32 a 34):
   - subir o pacote das raças leves;
   - escadas para Humano, Goblim e Feérico e um degrau nas especiais;
   - o pacote do Autômato, com chassis de 1 / 1,8 / 3 / 4,5 m e armas de dano tecnológico;
   - Semideus com Legado a mais e Bênção sem Mana, e o Deus como está;
   - Fluxo da marca como Fluxo nativo do Espírito natural;
   - Noite Eterna como a mesma noite nas duas raças;
   - Domínio da Morte com dano do Fim;
   - a língua de cada povo nas páginas (as oito sem língua falam Universal).
4. **Classes** (22 a 25, 31, 35 a 38, e os achados dos relatórios que não dependiam de decisão):
   - poderes de combate para Viajante, Guia, Pop Star, Comerciante, Detetive e Interceptador, e o Rito Guardado no 5;
   - nível 20 sem repetição, e habilidade final própria para Médico e Alquimista;
   - Guardião com travas e Provocar novo;
   - Lutador com o ataque a mais explicado;
   - Caçador com raça ou família;
   - Piloto com montaria;
   - Detetive sem `patamar`;
   - Devorador copiando da ficha da criatura.
5. **Espírito** (20): uma rodada só dos 14 Pecados e Virtudes, da Possessão e da Encarnação.
6. **Lore** (41 a 48): as decisões abaixo entram em `data/mundo`, e os `_o_que_falta` respondidos saem.
   - Iwagakure: sucessão por duelo até a morte.
   - Tribunal: os Arautos saem, e o Conselho da Existência são as deidades.
   - Blanc: o Universal é a origem dos espíritos, ela os acompanha e entrega, e o epíteto fica.
   - Ushumgal: o nome fica, ele é a referência dos outros dragões, os jogadores sabem por boato, e a ficha é acima de VD 1000.
   - Circe: o epíteto fica, e o colar vira Relíquia da Criação (nome a propor).
   - Karnath: o nome fica, e a ficha é acima de VD 1000.
   - Shinji: a lâmina continua em segredo.
   - Zero: nome e epíteto ficam.

   As entradas com versão publicada no banco só mudam no site depois de republicar pelo Painel.

---

## Bloco 1. Regras que valem para todo mundo

Estas mudam o Livro de Regras e limpam achados de várias raças e classes de uma vez.

### 1. Quanto uma cura cura
As regras nunca dizem quanto Vida um tratamento devolve. O Médico soma +1d6 a uma cura que não existe, e o Socorro de Emergência não levanta quem caiu abaixo de 0.
- **A:** o Médico ganha uma cura própria: Ação Padrão, Cura DT 15, recupera 1d6 + Mod. Sabedoria, uma vez por alvo por cena. O Socorro levanta o aliado com 1 de Vida. Quem não é Médico pode tratar fora de combate: 10 minutos, Cura DT 15, 1d6 de Vida, uma vez por descanso curto.
- **B:** só o Médico ganha a cura base. Quem não é Médico depende de poção e magia.
- **C:** a cura vem de um Kit Médico da Loja, e o Médico soma bônus em cima dele.

### 2. DT das raças
Dezessete habilidades do Vampiro, da Sereia e do Divino mandam o alvo testar "contra o seu Carisma", e as regras não dizem o que é isso. As classes resolvem com uma perícia rolada que vira a DT.
- **A:** cada raça que impõe teste ganha uma DT própria, como as classes: Vampiro com Intimidação, Sereia com Atuação, Divino com Religião.
- **B:** todas usam Misticismo, como já fazem Elfo, Bruxa, Onírico e Espírito.
- **C:** criar nas regras o teste de atributo (d20 + Mod. + metade do nível, sem grau).

### 3. Condição leve, média e grave
O Médico, o Chef, o Guardião e a Anomalia curam "condição leve" ou "média", e essa escala não existe.
- **A:** criar a escala nas Condições:
  - **Leve:** Exposto, Caído, Lento, Enfraquecido, Desorientado, Amedrontado, Sangramento, Queimando, Envenenado e Silenciado;
  - **Média:** Cego, Imobilizado, Atordoado, Paralisado e as crises de Sanidade;
  - **Grave:** condições de longo prazo, Ferido e aflição no estágio 3 ou mais;
  - **Gravíssima:** Mutilação e maldição.
- **B:** cada habilidade passa a listar no próprio texto as condições que trata.

### 4. Condições que as raças usam e que não existem
A Canção da Sereia deixa o alvo Fascinado, o Slime deixa Enjoado, e o Espírito e o Caçador das Almas deixam Surdo.
- **A:** criar três condições oficiais. Encantado vira Fascinado, e Ofuscado sai do texto.
  - **Fascinado:** não age contra a fonte e tem −5 em Percepção; qualquer dano encerra.
  - **Enjoado:** desvantagem em ataques e em testes de Destreza; Fortitude no fim do turno encerra.
  - **Surdo:** falha em Percepção pela audição e ignora efeitos de som.
- **B:** reescrever cada habilidade com as condições que já existem.

### 5. Visão, luz e ocultação
"Camuflagem", "invisível", "pouca luz" e "escuridão" aparecem em classes, raças e magias, e nenhuma regra os define.
- **A:** um quadro curto em Combate:
  - pouca luz dá desvantagem em Percepção pela visão;
  - escuridão deixa Cego quem não enxerga no escuro;
  - camuflagem dá −2 nos ataques contra e deixa tentar se esconder;
  - Invisível vira condição: ataques contra com desvantagem, os seus com vantagem, e Revelado encerra;
  - cobertura total impede alvo direto.
- **B:** trocar, texto por texto, camuflagem por cobertura parcial e invisível por "não pode ser alvo direto".

### 6. Resistência "contra todo dano"
As regras dizem que Resistência vale sempre para um tipo, e oito efeitos de classe dão Resistência a todo dano (Ás Impossível, Coração Unificado, Pilar da Dimensão e outros).
- **A:** virar "reduza em X o dano de cada golpe", frase que o jogo já usa.
- **B:** escrever a exceção: só a habilidade final de classe pode dar Resistência a todos os tipos, até 10.
- **C:** trocar todas por Resistência a dano físico.

### 7. Crítico nas classes
As regras dizem que margem larga só anda com x2, e Ninja, Espadachim, Atirador e Caçador furam isso. O Ninja chega a x6. A Loja já respeita essa regra.
- **A:** efeito de classe que alarga a margem vale em arma x2; em arma x3 ou x4, vira +1 dado no crítico. Golpe Certeiro e Corte Fatal valem uma vez por arma e não entram juntos.
- **B:** a regra vale só para a Loja, e a classe pode chegar a 18-20/x3, com teto escrito.

### 8. As convenções da magia nas raças e nas classes
A revisão das magias fixou três convenções: dano em área dá metade no sucesso, trava tem teste repetido, e efeito de cena vale uma vez. Umas 30 habilidades de raças e classes fazem o contrário (Pirata, Gigante, Elfo, Auleth, Campeão, Engenheiro...).
- **A:** aplicar as três convenções em todas.
- **B:** manter: ápice de raça e poder de classe podem passar da magia.

### 9. Tamanho
As raças usam Minúsculo, Pequeno, Normal, Grande, Enorme e Colossal, e o Bestiário usa "médio". Nenhum tópico diz o que o tamanho muda.
- **A:** um tópico curto com as seis categorias e o que cada uma muda: equipamento, agarrão, empurrão, carga, alcance e espaço. "Normal" vira o nome único.
- **B:** só padronizar os nomes, sem regra nova.

### 10. Soco de quem não é Lutador
As regras não publicam dano desarmado. O Lutador não tem dano nos níveis 1 e 2, e o Devorador fala em "dano desarmado padrão".
- **A:** desarmado comum causa 1 de impacto, sem Mod. O Lutador causa 1d4 + Força desde o nível 1.
- **B:** desarmado comum causa 1d4 de impacto + Mod. Força.
- **C:** outra.

### 11. Voltar da morte
A Reconstrução da Pedra Filosofal (Alquimista) traz de volta quem morreu no último turno. Médico e Chef dizem que não ressuscitam ninguém, e as regras não falam disso.
- **A:** no Jardim, morte é definitiva. A Reconstrução vira "quem chegou a Morrendo 3 neste turno volta para Morrendo 2 e estabiliza".
- **B:** existe volta, rara e cara; a regra entra no tópico Ferimentos, e a Reconstrução aponta para ela.
- **C:** só por história, nunca por habilidade.

### 12. "Dano psíquico" (Sereia, Onírico e Escritor de Contos)
Psíquico não está na tabela de tipos de dano.
- **A:** dano de um tipo que tira Vida e combina com a cena: Água no Reboque dos Afogados, Escuridão na Noite Sem Fim e Fim na Metáfora Cortante.
- **B:** dano mental, que tira Sanidade, com dados menores.

### 13. "Dano espiritual" (Caçador das Almas, 21 vezes)
Também não está na tabela, e como ninguém resiste a ele, a Zanpakutō fura qualquer Resistência.
- **A:** vira dano de Essência, o Fluxo da natureza verdadeira e do nome.
- **B:** vira dano de Vitalidade, o Fluxo de Haemus.
- **C:** criar o tipo Espiritual na família Mágico, com quem resiste a ele (espíritos, mortos-vivos).

### 14. "Dano verdadeiro" (Campeão Dimensional)
- **A:** vira "impacto que ignora Resistência".
- **B:** vira dano de Espaço no Rasgar (teleporte) e impacto que ignora Resistência no Número 1.

---

## Bloco 2. Equilíbrio das raças

### 15. Vida, Mana e Estamina desiguais entre as raças comuns
No topo da escada, Golem e Gigante somam 39, e a Sereia soma 10.
- **A:** uma faixa para o topo das comuns, de 14 a 24. O último degrau de Golem e Gigante cai pela metade, e Sereia e Anão sobem até o piso.
- **B:** aceitar a diferença como identidade (corpo grande ganha mais) e escrever isso no Guia.
- **C:** subir só as leves.

### 16. Raças que não crescem
Humano, Goblim e Feérico, e as especiais Desperto, Clone, Anomalia, Amálgamo e Bruxa, não ganham nada com o nível.
- **A:** escada de três degraus para as três comuns, e um degrau leve por volta do 20 a 25 nas especiais.
- **B:** só as três comuns ganham escada.
- **C:** manter; raça sem escada é para quem quer ficha simples.

### 17. Autômato
O Corpo Maciço dá Resistência 10 no nível 1, o Pulso Estridente trava por várias rodadas e o Laser causa 52 de dano no 15.
- **A:** o pacote inteiro do relatório: Resistência 2 que cresce, Pulso até o fim do próximo turno, Raio Inferno uma vez por cena, Laser 4d10+4 com metade no sucesso, Eletrificar duas vezes por cena, Resistente +1 por nível, teto de 8 vagas e um bônus próprio para o chassi pequeno.
- **B:** só os quatro erros (Corpo Maciço, Pulso Estridente, Raio Inferno e Laser).
- **C:** manter; é especial e depende de liberação.

### 18. Deus × Semideus
O Deus começa com 25 pontos de recurso no nível 1, e o Semideus não ganha nada no lugar.
- **A:** o Deus fica com metade do bônus de hoje, e a fé continua. O Semideus ganha um Legado a mais, da família mortal, e uma Bênção Concedida por sessão sem custo de Mana.
- **B:** o Deus fica como está, e só o Semideus ganha algo.
- **C:** manter; o Mestre decide quem pode ser Deus.

### 19. Espírito natural: o Fluxo da marca
Um Espírito do Tempo nascido em Gênese conjura Origem, que é o Fluxo da Árvore, e não conjura Tempo.
- **A:** o Fluxo da marca vira o Fluxo nativo do Espírito natural. Demônio e anjo seguem a Árvore.
- **B:** a marca vira um Fluxo instalado automático, que abre as magias sem dar Marca de círculo.
- **C:** manter: a marca é só racial.

### 20. Espírito: o equilíbrio dos 14 Pecados e Virtudes, da Possessão e da Encarnação (pendente desde 12/10)
- **A:** fazer uma rodada só disso, com o mesmo método das revisões (auditoria por script e relatório).
- **B:** manter como está.

---

## Bloco 3. Equilíbrio das classes

### 21. Régua para poder de dano e de cura
Alguns poderes do nível 2 rendem mais que magia de 3º círculo: o Hadō e o Kidō de Cura (Caçador das Almas), o Soco e o Impacto (Campeão) e a Investida Predatória (Devorador).
- **A:** poder de classe rende no máximo o que a magia do círculo equivalente rende por Mana, ou +1 dado por 2 ou 3 de Estamina. Os cinco descem ou ganham trava de nível.
- **B:** aceitar nas especiais e mexer só no Kidō de Cura.

### 22. Classes com pouco a fazer em combate
Viajante, Guia Dimensional, Pop Star, Comerciante, Ritualista (até o 15), Detetive e Interceptador (sem magia na luta) quase não agem numa luta.
- **A:**
  - cada uma ganha um ou dois poderes de combate no próprio tema;
  - o Rito Guardado do Ritualista desce para o nível 5;
  - o Guia avisa quais classes brilham fora da luta.
- **B:** só as especiais (Guia e Viajante) ganham poderes de combate.
- **C:** manter e só escrever o aviso.

### 23. O nível 20 repetido
Seis classes repetem a habilidade final num estágio do mesmo nível: Atirador, Engenheiro, Pirata, Guia, Alquimista e Canalizador. Médico, Alquimista e Chef terminam com a mesma habilidade final.
- **A:** o estágio repetido vira outra coisa, e Médico e Alquimista ganham habilidade final própria. A do Chef fica, porque é fora de combate.
- **B:** só as repetições dentro da mesma classe.

### 24. Guardião
A cadeia de Muralhas dá Resistência física 10 no nível 11, e o Provocar dura uma rodada por combate.
- **A:**
  - Muralhas com trava de nível (6, 11 e 16);
  - Provocar uma vez por rodada pagando Estamina, com Vontade no fim do turno para encerrar;
  - Provocar 20 com efeito novo.
- **B:** só o Provocar 20, que hoje só aumenta o custo.

### 25. Lutador: o ataque a mais das Marcas de Guerra
Com duas marcas, o Lutador ataca duas vezes por rodada pelo resto da luta, a única ação a mais permanente do jogo.
- **A:** manter e escrever que é a compensação do punho, que bate menos que arma.
- **B:** trocar por +1d6 no próximo acerto e subir os dados do punho.

---

## Bloco 4. Perguntas de raça e classe

### 26. Noite Eterna
O Clã mais forte do Vampiro e uma Linhagem do Elfo têm o mesmo nome.
- **A:** são a mesma noite: uma ligação de lore entre os dois povos.
- **B:** são coisas diferentes, e a do Elfo muda de nome.
- **C:** são diferentes, e os nomes ficam.

### 27. Pricolici e a lua
A Pelagem Noturna fala em lua cheia, mas a lua de Întuneric parou e nunca se põe.
- **A:** a lua parada continua com fases.
- **B:** sem fases, e o texto troca "lua cheia" por "quando a lua está mais vermelha" ou outro marco.

### 28. Gigante Colossal
No nível 36 o porte vira Colossal.
- **A:** Colossal é uma categoria de tamanho nova, a sexta (junto com a pergunta 9).
- **B:** é só o nome do degrau, e o tamanho continua Enorme.

### 29. Altura dos Autômatos bípedes
Hoje são 3,5 / 5 / 6 / 9 m.
- **A:** 1 / 1,8 / 3 / 4,5 m, como os quadrúpedes.
- **B:** manter.

### 30. As armas do Autômato
O Laser, o Raio Inferno e o Eletrificar causam raio e fogo.
- **A:** causam dano tecnológico, que é o dano da A.X.I.S.
- **B:** ficam raio e fogo.

### 31. Engenho Divino do Engenheiro
A Artilharia passou de "Energia" para raio.
- **A:** fica raio.
- **B:** dano tecnológico.

### 32. Divino, Domínio da Morte
- **A:** o dano é do Fim.
- **B:** o dano é de Escuridão.

### 33. Animália: Traços
- **A:** quem escolhe a Forma Traços tem sempre tamanho Normal, seja qual for o animal.
- **B:** o tamanho segue o animal também nos Traços.

### 34. A língua de cada povo
- **A:** cada página de raça diz a língua do povo, e as oito raças sem língua própria (Humano, Mímico, Simbionte, Slime, Feérico, Auleth, Onírico e Divino) falam só o Universal.
- **B:** as páginas dizem a língua, e algumas dessas oito ganham língua própria (diga quais).
- **C:** não mostrar língua nas páginas.

### 35. Caçador: Especialização
Hoje ela escolhe só raças jogáveis, e quase tudo do Bestiário fica de fora.
- **A:** aceita também uma família do Bestiário (dragão, elemental, morto-vivo, Vazio, espírito...).
- **B:** só raças, como está.

### 36. Piloto e montaria
- **A:** montaria pode ser o Xodó, usando Cavalgar no lugar de Pilotagem.
- **B:** o Xodó é só veículo, e o Ás Impossível perde a palavra "montaria".

### 37. Detetive
Hoje ele é classe comum com `patamar` de especial.
- **A:** comum, aberta a todos.
- **B:** especial, com liberação do Mestre.

### 38. Devorador contra criatura sem classe
O Banquete de Poder copia "o que a classe da vítima tinha", e as criaturas do Bestiário não têm classe.
- **A:** contra criatura do Bestiário, copia uma habilidade da ficha dela, com o VD até o seu nível de Devorador.
- **B:** o Devorador só devora quem tem classe.

---

## Bloco 5. Lore em aberto

### 39. Quem lançou a magia do Cataclismo do Ano Zero, e o que ela pretendia?
- **A:** uma bruxa de Salém, tentando trazer de volta alguém que morreu. Isso explica por que Salém é o único reino que existiu dos dois lados do marco.
- **B:** ninguém sabe, e o segredo fica guardado de propósito para uma campanha.
- **C:** outra.

### 40. Em que ano a campanha se passa hoje?
O último marco datado é Lionês, em 1.595.
- **A:** um ano por volta de 1.700 (diga o número).
- **B:** bem mais tarde, depois de 2.000.
- **C:** cada mesa escolhe o seu "agora".

### 41. Iwagakure: quem sucede o Kage, e como?
- **A:** quem derrota o Kage em duelo até a morte, como manda a lei da aldeia.
- **B:** os anciãos escolhem entre os Jonnin.
- **C:** deixar em aberto.

### 42. Os Arautos e o Conselho da Existência (Tribunal de Arkarin)
- **A:** dez Arautos, um por Fluxo, que levam as convocações do Tribunal; o Conselho é os dez reunidos.
- **B:** poucos Arautos, e o Conselho são as deidades.
- **C:** continuar em aberto de propósito.

### 43. Blanc, a Soberana dos Espíritos
1. O Fluxo Universal é **A:** a origem de todos os espíritos ou **B:** o que sobrou depois que os outros se formaram?
2. O epíteto "Soberana dos Espíritos" **A:** fica ou **B:** muda (diga qual)?
3. Relação com a Mulher Carmesim e com Erebus: **A:** Blanc acompanha os espíritos até o fim e entrega a quem eles pertencem, sem servir a nenhum dos dois; **B:** outra.

### 44. Ushumgal, o Soberano dos Dragões
1. O nome **A:** fica ou **B:** muda?
2. A relação com Anzhur, Kurnagal e Apokalyx: **A:** é a referência, o que todos estão crescendo para ser, como o texto já sugere; **B:** parente; **C:** rival.
3. Os números: **A:** VD acima das Deidades do Bestiário (acima de 1000); **B:** sem ficha, fora do alcance da mesa.
4. Os jogadores sabem que ele existe? **A:** só por boato; **B:** não, até a cena.

### 45. Circe, a Soberana da Magia
1. O epíteto "Soberana da Magia" **A:** fica ou **B:** muda?
2. O colar que a prendia **A:** vira Relíquia da Criação com ficha e nome (diga o nome) ou **B:** fica só na história?
3. O que ela quer das novas gerações (escreva), ou **A:** deixar em aberto até a campanha chegar lá.

### 46. Karnath, o Soberano dos Monstros
1. O nome **A:** fica ou **B:** muda?
2. A relação com as aberrações do Vazio e com Selah (escreva), ou **A:** deixar em aberto.
3. Os números: **A:** VD acima das Deidades; **B:** sem ficha.

### 47. Shinji Takamori, o Soberano dos Caçadores
Faltam o nome da lâmina, a aparência e a idade.
- **A:** o nome da lâmina continua segredo dele, que é o que o texto já diz; aparência e idade você escreve quando quiser.
- **B:** responder agora (escreva).

### 48. Zero, o Soberano do Sacrifício
1. O nome e o epíteto **A:** ficam ou **B:** mudam?
2. O que é a Noite Carmesim (escreva), ou **A:** deixar em aberto como o grande mistério do Culto.

### 49. Os contos das Entidades
Os contos usam "ecoou" e "ecoava" cinco vezes, e a passada de tom não mexeu neles porque são prosa sua.
- **A:** trocar por outras palavras, mantendo o resto.
- **B:** deixar como está.

---

## Para fechar (ações, não perguntas)

- **Lore publicada no banco:** sete entradas que a passada de tom corrigiu têm versão publicada no Painel, de 29/08: Alfarn, Întuneric, Hierarquia, Crônicas, Fluxo do Fim, Castelo Carmesim e Núcleo Zero. A correção só aparece no site depois de republicar ou de voltar para a base no Painel.
- **Commits:** a revisão das raças, a das classes e povos e culturas estão sem commit. Eu commito quando você pedir, listando os arquivos.
- **Push e ZIPs:** os commits da passada de tom (1d5f9eb e 569bc95) e os que vierem estão sem push e sem ZIP da Discloud.
