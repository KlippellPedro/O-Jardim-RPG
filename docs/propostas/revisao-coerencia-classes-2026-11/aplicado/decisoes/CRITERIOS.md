# Terceira fase: decidir o que sobrou e gerar as trocas

O Pedro delegou as decisões à sessão principal ("pode tomar as decisões você mesmo"). As decisões abaixo são da sessão principal e valem para todos os grupos. **Siga-as. Não reabra nada aqui.**

## O que entra nesta fase

Do **seu** relatório (`relatorios/<seu-grupo>.md`) e da sua lista de pulados (`patches/rodada-1/<seu-grupo>.json`, campo `pulados`):

- todo achado marcado "Decisão do Pedro? sim";
- todo achado que você pulou na rodada 1.

**Fica de fora, sem troca:**
- o grau de perícia duplo das especiais (é de propósito);
- os achados que as regras gerais abaixo já resolveram. Liste-os em `resolvidos` com a regra que resolveu.

## Atenção: o arquivo mudou

`classes/<id>.json` nesta pasta foi **atualizado** com as 250 correções da rodada 1. Copie o `de` desse arquivo novo, nunca do relatório antigo. O formato do patch é o mesmo do `PEDIDO-PATCH.md`; grave em `patches/<seu-grupo>.json`. O `aplicar.py` só lê `patches/*.json` (a rodada 1 está guardada em `patches/rodada-1/` e não é lida de novo).

## Regras gerais que já entraram no Livro (2026-11-20)

1. **Vida temporária** (Ferimentos): gasta antes da Vida; fontes diferentes **somam**; a mesma fonte usada de novo troca o valor dela; some no fim da duração da fonte ou no descanso; não conta para acordar. Mana e Estamina temporárias seguem a mesma regra. A cura para no máximo e **a sobra se perde**.
2. **Fogo, veneno, ácido e sangramento** caem uma vez, venha de onde vier. Só repetem no fim do turno se a fonte deixar a condição (Queimando, Envenenado, Sangramento) ou disser que continua.
3. **Ficar com 1 de Vida** (Ferimentos): o Déficit some, sem Morrendo e sem Ferido. Não vale contra a morte na hora (Déficit igual à Vida máxima), a não ser que o efeito diga. O trauma por golpe de metade da Vida continua.
4. **Resistências** ao mesmo tipo de fontes diferentes **somam**; **reduções de dano** de fontes diferentes também somam.
5. **Rolar de novo**: um teste ou um dado só é rolado de novo uma vez, venha de onde vier.
6. **Bônus** de fontes diferentes somam no mesmo teste, sem teto geral (Ajudar mantém +4; Prestígio e Fama, ±2). A mesma fonte não soma com ela mesma.
7. **Grade**: algumas classes fogem dela (nota no Livro). **Incorpóreo** virou condição (atravessa, não é agarrado, derrubado nem empurrado, metade do dano físico que não venha de magia; efeito que diz que atinge incorpóreos ignora a metade).
8. **Convenções da magia valem para classe** (questionário 8A): dano em área ou de gatilho tem teste e **metade no sucesso**; zona testa ao entrar ou no começo do turno; quem sofre controle repete o teste para sair.

## Critérios para decidir (aplique em ordem)

1. **O Livro manda.** Se a classe contradiz o Livro, a classe se ajusta. Se a classe precisa mesmo ser exceção, o texto diz "exceção à regra X" com todas as letras.
2. **Janelas de uso:** efeito de combate volta **por descanso**; história, informação, dinheiro e sorte, **por sessão**. "Por missão", "por rito", "uma vez por teste", "a cada cinco sessões" e afins viram a janela oficial mais próxima. "Combate" vira "cena".
3. **Dano verdadeiro** só em habilidade de nível 15 ou mais. Abaixo disso, troque pelo tipo que combina com o tema (Campeão Dimensional: dano de Espaço; físico: o tipo da arma) e dê teste com metade se não houver ataque. Dano verdadeiro como **custo pago pelo próprio personagem** (Máscara do Vazio) pode ficar, escrito com o nome "dano verdadeiro".
4. **Todo dano tem tipo** e tem rolagem: ou ataque contra a Defesa, ou teste com metade no sucesso. Dano automático sem nenhuma rolagem ganha teste de Reflexos (ou o que combinar) contra a DT da classe, com metade no sucesso.
5. **Ataques de reação** seguem o Contra-Ataque e o Ataque de Oportunidade (−2, sem crítico) quando o texto não diz nada. Poder ou estágio que existe para isso (já tira o −2, ou repete o Contra-Ataque sem ganho) passa a dizer: "sem o −2 do Contra-Ataque, e pode gerar crítico".
6. **Movimento forçado** (empurrar, puxar, derrubar, deixar Caído): acrescente "Criatura duas categorias de tamanho maior que você não é empurrada [puxada/derrubada]", como em Combate › Manobras. Empurrão longo sem teste ganha Fortitude contra a DT da classe para ficar no lugar.
7. **Condições com o nome oficial.** −2 de Defesa imposto a outro vira **Exposto**; se a duração for diferente da oficial, escreva "fica Exposto até X, no lugar de acabar no começo do turno dele". Penalidade que o próprio usuário aceita como custo (Peito Aberto, Marcas de Guerra em si) fica como número. "+3 m de Movimento" **fica como está** (não vira Apressado). Estado que não existe ("provocado", "fúria" com outro efeito) vira texto descritivo com o efeito escrito, ou ganha título que não colide com a regra (mude só `titulo`, nunca `id`).
8. **Defesa contra magia:** bônus de Defesa "contra magia" passa a valer também nos testes de resistência: "+X na Defesa contra magia de ataque e nos testes de Fortitude, Reflexos e Vontade contra magia".
9. **"+X na DT de conjuração"** sempre quer dizer +X no total do teste de conjuração (lido também contra os alvos).
10. **DT numérica solta** vira a DT do Livro: "DT Padrão do seu nível" (ou do nível da cena, do lugar, do VD). DT de classe vem de `dt_efeitos`: o efeito diz "contra a DT do/da <classe>", e `dt_efeitos` diz que é uma rolagem por acionamento, válida para todos os alvos e para os testes repetidos daquele efeito.
11. **Itens e recursos de graça** vindos de classe (amostra, consignado, estoque, Mercado Mundial, Publi) não podem ser vendidos, segurados nem virar aliado, propriedade, implante ou Fruto. O Mercado Mundial não vale para criatura, propriedade, implante nem Fruto do Éden.
12. **Contatos dados por classe:** entram como contato **Conhecido** (Confiança 1), ou **Amigo** (2) se o texto disser "de confiança" ou "confiável"; **não contam** no limite de contatos; favores seguem Contatos e Laços (favor grande deixa Dívida, a não ser que o texto diga que não).
13. **Aliados e invocações:** o Livro só deixa as invocações do Invocador agirem no turno do dono. Companheiro que é a marca da classe (Companheiro do Caçador) mantém o que faz e o texto diz "exceção à regra de Aliados". Ajudante temporário (Guarda-Costas, Escolta, espectro) age na iniciativa dele; se o texto não tem ficha, escreva uma ficha mínima (Defesa igual à sua, Vida 1, ataque com o seu bônus) ou use "um humanoide do Bestiário de VD igual à metade do seu nível na classe, para baixo, mínimo 1".
14. **Voltar da morte e membro perdido:** só por efeito que diga com todas as letras. Habilidade de topo que devolve membro (Milagre do Médico) diz "vale como a Regeneração de Ferimentos"; a janela vira "uma vez por sessão, durante um descanso completo". Devorar não grava efeito que devolva a vida nem habilidade de criatura Única, Ser Lendário ou Deidade.
15. **Números que faltam:** quando o texto precisa de um número que não existe (capacidade, duração, alcance), escolha o mais simples que combine com o resto da classe e com o Livro (duração "até o começo do seu próximo turno" ou "uma cena"; alcance em faixa oficial). Prefira o número que você já sugeriu no relatório.
16. **Desenho:** quando a escolha é entre "deixar o poder mais fraco" e "deixar o texto coerente sem mudar a força", escolha a segunda. Não suba nem baixe dano, a não ser para cumprir os critérios 3 e 4.

## Formato

`patches/<seu-grupo>.json`:

```json
{
  "correcoes": [ { "achado": "...", "classe": "...", "no": "...", "campo": "...", "de": "...", "para": "..." } ],
  "resolvidos": [ { "achado": "...", "regra": "Vida temporária (regra geral 1)" } ],
  "mantidos":   [ { "achado": "...", "motivo": "por que fica como está" } ]
}
```

Todo achado "sim" e todo pulado da rodada 1 aparece em uma das três listas. Mesmas regras de texto do `PEDIDO-PATCH.md` (sem travessão, sem "eco", sem "não é X, é Y", nunca mudar `id`). Rode `python -I aplicar.py "C:\D.E.V\T.D.S\Diversos\RPG\Pessoais\O-Jardim-RPG"` até zerar os erros do seu arquivo. Não edite o repositório.

Ao terminar, responda com: quantas correções, resolvidas e mantidas, e as 5 decisões mais importantes que você tomou, uma linha cada.
