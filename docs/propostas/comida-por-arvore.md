# Proposta: comida por Árvore

**Aprovada pelo Pedro em 2026-10-03 e aplicada ao catálogo** (`data/loja/catalogo.json`, ids `consumivel-*`, etiqueta "Origem: ..." no card). Respostas: 1 sim; 2 não esconder comida de Árvore não revelada; 3 a Loja segue a regra que já existe (comum e incomum na Feira de Vila, raro na Metrópole); 4 o Vinho de Ferro fica; 5 o Café mexe no Cansaço; 6 ficam os 25. Teste: `tests/frontend/comidaPorArvore.test.ts`.

## Como pensei

Quase nenhum Galho é habitado: Alicerce é rocha sem fim, Anámnesis é um campo vazio, Arkarin é o fim, Bordo é onde não há nada. Quem cozinha mora no Galho principal de Gênese. Então cada Árvore entra na cozinha de dois jeitos:

- **Gênese** tem cozinha de verdade, dos reinos e das dimensões (Lionês alimenta todo mundo, Khazad assa nas forjas, Întuneric serve o que serve).
- **As outras Árvores** entram como **ingrediente**: alguma coisa que só existe naquele Galho ou que o Fluxo dele muda, e que alguém trouxe e cozinhou em Gênese. O sabor carrega o tema da Árvore.

Tudo usa regra que já existe: bônus em perícia, vantagem, recuperar Vida, Mana, Estamina ou Sanidade, as condições de cena (Focado, Apressado, Desorientado...) e o Cansaço. Nenhuma regra nova.

Preços: comum fica entre 6 e 16 Lunaris, incomum entre 25 e 70, como os 16 consumíveis que já existem. Os raros sobem pela escala.

## Gênese

**Pão de Safra Contínua** · comida · comum · ~8 Lunaris · Lionês
> Lionês assa o mesmo pão há séculos, com trigo que nunca teve ano ruim. A casca estala e o miolo continua morno muito depois de sair do forno.
>
> *Recupere 1d6 de Estamina.*

**Vinho da Chuva Certa** · bebida · incomum · ~60 Lunaris · Lionês
> Das vinhas que recebem chuva no momento certo, todo ano, sem falhar. Quem bebe fica com a calma de quem nunca passou fome.
>
> *Por 1 hora, +2 em Nobreza e vantagem no primeiro teste de Diplomacia da cena.*

**Mel de Jasmim de Alfarn** · comida · incomum · ~45 Lunaris · Nadalon
> Colhido nas flores da ilha que flutua no alto de Nadalon. Muda de sabor conforme o humor de quem prova, e quase sempre melhora o humor junto.
>
> *Por 4 horas, vantagem em Vontade contra medo, encanto e desespero.*

**Broa de Fundo de Mina** · comida · comum · ~10 Lunaris · Khazad
> Assada no calor das forjas de Khazad, dura de quebrar dente e boa por um mês na mochila. Anão nenhum desce sem uma.
>
> *Não estraga. Ao comer, +1 em Atletismo até o próximo Descanso completo.*

**Cerveja de Cadinho** · bebida · comum · ~12 Lunaris · Khazad
> Fermentada no calor que sobra da forja, grossa, escura e com gosto de fumaça.
>
> *Por 4 horas, vantagem em Fortitude contra calor e fogo. O hálito denuncia: -1 em Furtividade no mesmo tempo.*

**Chá das Dez Cadeiras** · bebida · incomum · ~40 Lunaris · Salém
> Dez ervas, uma escolhida por cada Cadeira de Salém. Nenhuma xícara sai igual à outra, e as bruxas dizem que é de propósito.
>
> *Recupere 1d4 de Mana e tenha +1 em Misticismo por 1 hora.*

**Ração de Marcha Imperial** · comida · comum · ~6 Lunaris · Império
> Biscoito duro, carne salgada e uma ordem do dia impressa no papel que embrulha tudo.
>
> *Recupere 1d6 de Estamina. Mais de uma por dia não faz efeito.*

**Vinho de Ferro** · bebida · incomum · ~50 Lunaris · Întuneric
> O que os anfitriões de Întuneric servem aos convidados que não estão no cardápio. Gosto de ferro e terra úmida.
>
> *Vampiro recupera 1d8 de Vida. Os outros têm vantagem em Fortitude contra Envenenado por 1 hora, e o estômago reclama: -1 em Percepção no mesmo tempo.*

## Alétheia

**Sal Âmbar** · tempero · comum · ~14 Lunaris
> Recolhido em Anámnesis, onde tudo deixa a marca do que é de verdade. Uma pitada, e a comida tem o gosto que realmente tem.
>
> *Ao temperar comida ou bebida, se houver veneno ou droga nela, o sal escurece na hora.*

**Infusão de Olhos Claros** · bebida · incomum · ~55 Lunaris
> Feita com flores que só abrem sob a luz âmbar. Depois de beber, as coisas param de fingir por um tempo.
>
> *Por 1 hora, +2 em Intuição. No mesmo tempo, desvantagem em Enganação: fica difícil mentir com a verdade no corpo.*

## A.X.I.S

**Cubo Nutritivo Padronizado** · comida · comum · ~12 Lunaris
> Quadrado, cinza, sem cheiro, com tudo que um corpo precisa medido em miligrama. Ninguém gosta, todo mundo come.
>
> *Recupere 1d6 de Estamina e tenha +1 em Tecnologia por 1 hora.*

**Isotônico de Malha** · bebida · incomum · ~35 Lunaris
> Brilha em ciano dentro do copo e deixa um zumbido leve atrás das orelhas.
>
> *Remove Desorientado. Por 1 hora, vantagem contra ficar Desorientado.*

## Anima

**Fruta do Viveiro** · comida · comum · ~6 Lunaris
> Cresceu de semente a fruta numa noite só. Precisa ser comida no mesmo dia: no seguinte, já apodreceu.
>
> *Recupere 1d8 de Vida. Estraga 24 horas depois de colhida.*

**Caça Gigante Defumada** · comida · incomum · ~40 Lunaris
> Tudo no Viveiro nasce grande demais. Uma fatia dessa carne alimenta um grupo inteiro.
>
> *Até 4 pessoas que comam juntas recuperam 1d6 de Estamina e têm +1 em Sobrevivência até o próximo Descanso completo.*

## Vórtice

**Pimenta de Espiral** · tempero · incomum · ~30 Lunaris
> Nunca arde igual duas vezes. Quem cozinha com ela aposta, porque planejar não adianta.
>
> *Role 1d6 ao comer: 1 ou 2, desvantagem em Percepção por 1 hora; 3 ou 4, +2 em Iniciativa por 1 hora; 5 ou 6, fica Apressado até o fim da próxima cena.*

**Licor Parado** · bebida · raro
> Destilado das frutas colhidas no último dia em que Espiral mudou de forma. Desde então, elas não mudam mais, e quem bebe também demora a mudar.
>
> *Por 1 hora, vantagem para resistir a ser empurrado, derrubado ou movido contra a vontade, e -2 em Iniciativa.*

## Baluarte

**Pão de Pedra Moída** · comida · comum · ~8 Lunaris
> Feito de um grão que cresce entre as rochas. Pesado como o nome promete.
>
> *Até o próximo Descanso completo, +1 em Fortitude e vantagem para não ser derrubado, mas -1 em Acrobacia.*

**Água de Alicerce** · bebida · incomum · ~50 Lunaris
> Desceu tão fundo que ficou mais pesada que água comum. O copo pesa o dobro na mão.
>
> *Recupere 1d6 de Estamina. Por 1 hora, vantagem em Atletismo para carregar, empurrar e erguer.*

## Matriz

**Pão de Bolso** · comida · incomum · ~35 Lunaris
> Do tamanho de uma noz. Partido ao meio, rende um prato inteiro: a massa foi dobrada pelo Fluxo do Espaço.
>
> *Ocupa o espaço de um item pequeno e serve uma refeição farta para até 2 pessoas, que recuperam 1d4 de Estamina cada.*

**Chá de Interstício** · bebida · raro
> Os guias dimensionais bebem antes de atravessar. Dizem que é o que faz a pessoa chegar do outro lado inteira.
>
> *Por 4 horas, vantagem em Fortitude e Vontade contra efeitos de travessia entre Galhos e contra ficar Desorientado.*

## Éon

**Conserva de Sucessão** · comida · incomum · ~45 Lunaris
> Lacrada num pote que não envelhece enquanto o lacre estiver inteiro. A fruta lá dentro foi colhida há cem anos e continua do dia.
>
> *Não estraga. Ao comer, +2 em Iniciativa até o fim do próximo combate.*

**Café de Hora Emprestada** · bebida · incomum · ~55 Lunaris
> Segura você acordado a noite inteira. A conta chega depois, e chega certa.
>
> *Por 8 horas, ignore as penalidades de Cansaço. Quando o efeito acabar, ganhe 1 Cansaço.*

## Limiar

**Pão de Velório** · comida · comum · ~6 Lunaris
> Assado para quem ficou. Comido em silêncio, ao lado de quem foi.
>
> *Até 6 pessoas que comam juntas recuperam 1d4 de Sanidade (uma vez entre Descansos completos).*

**Vinho Carmesim** · bebida · raro
> Escuro como sangue seco. Contam que é o que se serve em Arkarin para quem acabou de chegar.
>
> *Recupere 1d6 de Vida e 1d6 de Mana. Por 1 hora, desvantagem em Vontade contra medo.*

## O Vazio

**Água Sem Gosto** · bebida · raro
> Não tem gosto, cheiro nem cor. Depois de beber, você esquece que estava com sede, e os outros demoram a lembrar que você está ali.
>
> *Por 1 hora, +2 em Furtividade. No mesmo tempo, aliados também têm -2 para perceber você.*

## O que preciso que você decida

1. **O jeito de pensar.** Ingrediente vem do Galho e se cozinha em Gênese. Faz sentido, ou algum Galho tem gente que eu não conheço?
2. **Árvore escondida.** Comida de uma Árvore que a campanha ainda não revelou deve sumir da Loja? Dá para fazer com o campo `arvore` e a visibilidade que o Painel do Criador já controla.
3. **Onde vende.** Minha ideia: comum na Feira de Vila, incomum na Metrópole, raro no Mercado Negro (os de Vazio e Limiar talvez só como loot).
4. **Vinho de Ferro.** Mexe com o tema das colônias de Întuneric. Fica, sai ou muda?
5. **Café de Hora Emprestada.** É o único que mexe no Cansaço; quer esse efeito?
6. **Quantidade.** São 25 itens. Se for muito, me diga quais Árvores ficam com um só.
