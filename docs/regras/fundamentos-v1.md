# O Jardim RPG - fundamentos da versão 1.0

Este documento registra as decisões confirmadas por Pedro e as soluções técnicas
de balanceamento que formam a versão oficial.

## Direcao confirmada

- Grupo de referencia: 4 a 5 jogadores e 1 mestre.
- Campanhas divididas em temporadas, normalmente com 2 a 4 anos.
- Uma temporada costuma terminar nos niveis 14 ou 15; duas podem chegar a
  18-20; campanhas mais longas podem chegar ao 25 ou alem.
- Fantasia de poder: personagens comecam vulneraveis e superam perigos mundanos,
  enquanto novas ameacas continuam relevantes.
- Letalidade media: decisoes ruins podem matar.
- Combate tatico em mapa, com posicao e alcance.
- Combate comum deve durar aproximadamente 4 a 5 rodadas.
- Especialista contra desafio padrao do proprio nivel deve ter aproximadamente
  65% de sucesso.
- Atributos naturais possuem limite 20. Itens, poderes, pactos e outros eventos
  externos podem ultrapassar esse limite.
- Limite normal de duas classes comuns e uma classe especial.
- Nivel total e a soma dos niveis de todas as classes, inclusive especiais.
- Cada classe possui no maximo 20 niveis.
- Humanos e racas especiais recebem um Legado de Ascensao na criacao.
- Racas e classes especiais devem ser raras, narrativamente marcantes e mais
  impactantes que opcoes comuns, sem tornar os outros jogadores irrelevantes.
- Magia e Fluxos (o sistema mágico) permanecem "Em desenvolvimento" até terem
  um sistema próprio.
- Revisado em 2026-07-12: Fluxo (o atributo) virou o sétimo atributo básico,
  revertendo a decisão anterior deste documento. Entra na distribuição/rolagem
  inicial junto dos outros seis, mas ainda não participa de nenhuma fórmula
  (base 10, +0 em tudo) até ganhar um uso mecânico definido.
- Forca Vital passa a se chamar Mana na interface para facilitar a leitura.
- Sanidade e uma regra frequente e todos os personagens possuem essa trilha.
- O dano que ultrapassa 0 de Vida deve aumentar a dificuldade de salvar e curar
  um personagem.
- A pagina de Regras exibira apenas a versao oficial, sem seletor de versoes antigas.
- Conteudo incompleto continuara visivel com o estado "Em desenvolvimento".
- Informacoes exclusivas do mestre ficarao em um JSON importavel e em uma
  categoria que so aparece depois da importacao.
- Segredos capazes de prejudicar investigacoes devem usar uma chave de
  descoberta ligada a pagina Mundo.

## Duas progressoes universais

O sistema usa duas progressoes diferentes para impedir abuso de multiclasse.

### Nivel total do personagem (1-40)

- Todo nivel: escolha uma classe e aumente o nivel dela em 1.
- Niveis 4, 8, 12, 16, 20, 24, 28, 32, 36 e 40: aumente um atributo em 1,
  respeitando o limite natural 20.
- Niveis 5, 10, 15, 20, 25, 30, 35 e 40: escolha um Legado de Ascensao.
- Recompensas de nivel total sao recebidas uma unica vez, independentemente da
  quantidade de classes.
- XP, bonus global e limites de grau usam o nivel total.

Essa frequencia concede tres Legados ate o fim de uma campanha de nivel 15,
quatro ate o nivel 20 e cinco ate o nivel 25. Humanos e racas especiais ficam
um Legado a frente desde a criacao.

### Nivel de classe (1-20)

Todas as classes usam a mesma tabela. Cada classe descreve somente suas cinco
Habilidades de Identidade e seu catalogo de Poderes.

| Nivel da classe | Recompensa universal |
| ---: | --- |
| 1 | Identidade I e treinamento inicial da classe |
| 2 | Poder de classe |
| 3 | Grau de pericia |
| 4 | Poder de classe |
| 5 | Identidade II |
| 6 | Poder de classe |
| 7 | Grau de pericia |
| 8 | Poder de classe |
| 9 | Poder de classe |
| 10 | Identidade III |
| 11 | Poder de classe |
| 12 | Grau de pericia |
| 13 | Poder de classe |
| 14 | Poder de classe |
| 15 | Identidade IV |
| 16 | Poder de classe |
| 17 | Grau de pericia |
| 18 | Poder de classe |
| 19 | Poder de classe |
| 20 | Identidade V |

Eventos como duelos, concursos, entrevistas e convocacoes permanecem ganchos
narrativos da classe, nao linhas obrigatorias da tabela.

## Multiclasse

- Um personagem pode permanecer em uma unica classe ate o nivel total 20 sem
  qualquer penalidade. Especializacao e uma escolha valida.
- Para ultrapassar o nivel total 20, ele precisa investir em outra classe comum
  ou em uma classe especial, pois nenhuma classe passa do nivel 20.
- Entrar em uma nova classe concede Identidade I, mas nao repete equipamento,
  dinheiro ou beneficios de criacao.
- Graus de pericia recebidos por classes diferentes ainda respeitam o limite de
  grau definido pelo nivel total.
- Classes especiais nao contam no limite de duas classes comuns, mas seus niveis
  consomem nivel total normalmente.

## Classes especiais

Classes especiais funcionam como classes de prestígio:

- requisito geral: nível total 15 e um acontecimento narrativo;
- somente uma classe especial por personagem;
- usam a mesma tabela universal de 20 niveis;
- a habilidade de entrada e balanceada para o patamar em que pode ser obtida,
  e nao comparada a uma classe comum de nivel 1;
- podem quebrar uma regra especifica, mas nao concedem multiplicadores globais,
  imunidade total, acoes ilimitadas ou morte automatica;
- raridade controla acesso, mas nao e usada como justificativa para apagar a
  participacao dos demais personagens.

Exemplo: Campeao Dimensional pode ser o unico portador do titulo em uma
dimensao. Perder o duelo pode transferir a classe, preservando a ideia original
sem precisar de +10 em todos os testes ou Vida e dano dobrados.

## Racas especiais

- Uma raca comum recebe um pacote racial completo.
- Humano troca esse pacote por um Legado inicial e maior flexibilidade.
- Raca especial recebe um pacote racial do mesmo tamanho de uma raca comum e um
  Legado inicial. Esse Legado representa sua potencia adicional.
- Toda raca especial exige uma origem ou acontecimento verificavel.
- Condicoes narrativas so contam como desvantagem quando produzem consequencias
  mecanicas reais.

Assim as racas especiais continuam mais fortes, aproximadamente por um Legado,
sem acumular varios atributos, rerrolagens, imunidades, itens e poderes sem
limite.

## Teste base e DT

Usar "DT" (Dificuldade do Teste) como termo oficial:

    Teste = d20 + Mod.Atributo + piso(Nivel Total / 2) + Grau
    DT padrao = 15 + piso(Nivel do desafio / 2)

Graus: Iniciante +0, Aprendiz +2, Treinado +4, Especialista +6, Mestre +8,
Veterano +10 e Renomado +12.

Contra uma DT padrao do mesmo nivel:

| Perfil | Exemplo de bonus alem do nivel | Chance |
| --- | ---: | ---: |
| Generalista | atributo +2, Iniciante | 40% |
| Praticante | atributo +3, Aprendiz | 55% |
| Especialista de referencia | atributo +3, Treinado | 65% |
| Especialista avancado | atributo +3, Especialista | 75% |
| Mestre | atributo +3, Mestre | 85% |

Ajustes de dificuldade sugeridos: facil -5, padrao +0, dificil +5 e extrema +10.
Um 1 natural sempre piora um grau e um 20 natural sempre melhora um grau.

## Vida negativa e Morrendo

- Vida pode ficar negativa; a cura precisa primeiro cobrir esse deficit.
- Morte imediata acontece apenas ao chegar a um valor negativo igual a Vida
  maxima.
- Ao chegar a 0 ou menos, o personagem fica inconsciente e recebe Morrendo 1.
- Gravidade e calculada pelo deficit como porcentagem da Vida maxima:
  ate 10% = 0; ate 25% = 1; ate 50% = 2; ate 75% = 3; acima disso = 4.
- DT para estabilizar ou resistir a Morrendo:

    DT = 12 + (2 x Gravidade) + Ferido

- No fim do turno, falha aumenta Morrendo em 1 e falha critica aumenta em 2.
- Morrendo 3 causa morte. Constituicao 20 aumenta esse limite para Morrendo 4.
- Cura acima de 0 remove Morrendo e aumenta Ferido em 1.
- Cura que nao chega acima de 0 reduz o deficit, mas nao desperta o personagem.

## Fluxo e Mana - em desenvolvimento

Revisado em 2026-07-12: Fluxo virou o setimo atributo basico (decisao anterior
nesta secao revertida por Pedro). Na pratica isso nao forcou recalcular fichas
existentes — nenhuma raca/classe define bonus de fluxo, entao o valor de base
so passa direto (ver aplicarModificadoresRaciais em calculoService.js), e
personagens sem magia simplesmente tem um atributo ainda sem efeito, em vez de
inutil de vez.

O que falta: Fluxo ainda nao participa de nenhuma formula (bonus de maestria
em 20, testes, etc.) — isso so sera definido junto do sistema de magia. Mana
mede a reserva gasta; Fluxo mede quanto poder o personagem consegue canalizar.

## Area do mestre

O JSON importavel deve conter:

- tabela de DTs e probabilidades;
- construcao de desafios e encontros;
- Vida, Defesa, dano e recursos sugeridos por nivel;
- recompensas, XP e ritmo por temporada;
- orientacoes de descanso, pressao e consequencias;
- chaves de spoiler e informacoes secretas;
- notas de auditoria de classes, racas e Legados.

A categoria Mestre nao aparece sem o JSON importado. Assim a pagina publica
continua sendo realmente voltada aos jogadores.

## Decisões finais

- Criação padrão: 15, 14, 13, 12, 10 e 8. A rolagem 6d20 fica somente como
  variante do mestre.
- Nome oficial do atributo: Inteligência.
- A trilha futura será chamada Fluxo.
- Classes especiais exigem nível total 15, salvo exceção narrativa explícita.
- Depois de alcançar nível 20 em uma classe, o personagem precisa investir em
  outra classe para continuar aumentando o nível total.

## Referencias matematicas

- Tormenta20 usa metade do nivel no bonus de pericia e DTs por escala:
  https://jamboeditora.com.br/wp-content/uploads/2023/06/Tormenta20-Resumo-de-Regras.pdf
- Pathfinder 2e usa graus de sucesso e DTs escaladas por nivel:
  https://2e.aonprd.com/Rules.aspx?ID=2266
- D&D 2024 separa nivel total de nivel de classe na multiclasse:
  https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character
