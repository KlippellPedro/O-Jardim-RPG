"""Banco de perguntas do quadro 'Entrevista Exclusiva' do Jornalista.

Há perguntas gerais, para qualquer jogador, e perguntas de Árvore, que só entram
quando o entrevistado tem o cargo de uma Árvore registrado. O sorteio evita as
últimas perguntas feitas no servidor, para a coluna não repetir assunto."""

from __future__ import annotations

import random
from typing import Iterable, Optional

PERGUNTAS = (
    # A mesa e o personagem
    "Qual foi o monstro mais difícil que seu grupo já enfrentou?",
    "Se pudesse escolher outra Árvore pro seu personagem, qual seria e por quê?",
    "Qual foi a decisão mais arriscada que seu personagem já tomou numa sessão?",
    "Tem algum NPC do Jardim que você adoraria ver de novo?",
    "Qual item ou baú foi o melhor achado da sua jornada até agora?",
    "O que você mais gosta na sua Árvore?",
    "Se seu personagem pudesse mandar um recado pro Jardim inteiro, o que diria?",
    "Qual foi o momento mais engraçado de uma sessão recente?",
    "Qual foi a maior bobagem que seu personagem já fez de caso pensado?",
    "Quem do seu grupo você chamaria primeiro se estivesse em apuros?",
    "Qual foi o plano que deu certo por pura sorte?",
    "Qual foi o plano perfeito que desandou na primeira cena?",
    "Qual é o maior segredo que seu personagem guarda hoje?",
    "O que seu personagem faria com um dia inteiro de folga no Jardim?",
    "Qual personagem de outro jogador você acha que daria um ótimo vilão?",
    "Qual foi a frase mais marcante dita numa sessão do seu grupo?",
    "Se o seu personagem abrisse uma loja, o que venderia?",
    "Qual foi o susto mais feio que seu personagem levou?",
    "Qual foi a luta em que você achou que ia perder tudo?",
    "Qual é a primeira coisa que seu personagem faz ao acordar?",
    # O Jardim e a vida fora das lutas
    "Qual lugar do Jardim você mais quer visitar e ainda não foi?",
    "Qual é o cheiro que você imagina quando pensa no Jardim?",
    "Se o Jardim tivesse uma festa, qual seria o prato principal?",
    "Qual criatura do bestiário você gostaria de ter como amiga?",
    "Qual criatura do bestiário você nunca quer encontrar de novo?",
    "Que profissão normal, fora de aventuras, seu personagem teria?",
    "Qual rumor do Jardim você acha que é verdade?",
    "Qual rumor do Jardim você acha que é invenção pura?",
    "Se pudesse reescrever uma cena da campanha, qual seria?",
    "Qual pequeno luxo seu personagem não abre mão?",
    # Dinheiro e sorte
    "Se ganhasse mil Lunaris agora, no que gastaria primeiro?",
    "Qual foi a pior compra que seu personagem já fez?",
    "Qual foi o melhor negócio que você fez no Banco Lunar?",
    "Você é do tipo que abre o baú na hora ou espera o momento certo?",
    "Qual é a sua superstição de jogador de RPG?",
    "Qual é o seu número da sorte nos dados e por quê?",
    # Jogar RPG
    "O que faz uma sessão ficar inesquecível pra você?",
    "Qual foi a primeira vez que você jogou RPG de mesa?",
    "Qual regra do jogo você demorou mais para entender?",
    "O que você aprendeu com o seu personagem que levou pra vida real?",
    "Se a campanha virasse livro, qual seria o título?",
    "Qual personagem de ficção você gostaria de ver cruzando o Jardim?",
    "Qual conselho você daria a quem acabou de criar a primeira ficha?",
    "Qual foi a cena em que você mais se emocionou jogando?",
    "Qual sessão você gostaria de reviver?",
    "Qual é o seu momento favorito antes de uma sessão começar?",
    "Se fosse o Mestre por um dia, o que mudaria na mesa?",
    "O que o seu personagem diria sobre você?",
)

# {arvore} vira o nome da Árvore do entrevistado.
PERGUNTAS_ARVORE = (
    "O que a Árvore {arvore} te deu que nenhuma outra daria?",
    "Como é ser da Árvore {arvore} num dia comum no Jardim?",
    "O que você diria a quem está em dúvida se escolhe a Árvore {arvore}?",
    "Qual mito sobre a Árvore {arvore} mais te diverte?",
    "Qual foi o momento em que você sentiu orgulho de ser da Árvore {arvore}?",
    "Qual Árvore rival da {arvore} você respeita mais?",
    "Se a Árvore {arvore} tivesse um lema, qual seria?",
    "O que os outros erram sobre a Árvore {arvore}?",
)

# Chance de sortear uma pergunta de Árvore quando o entrevistado tem uma.
CHANCE_ARVORE = 0.4


def perguntas_possiveis(arvore: Optional[str] = None) -> list[str]:
    gerais = list(PERGUNTAS)
    if not arvore:
        return gerais
    return gerais + [modelo.format(arvore=arvore) for modelo in PERGUNTAS_ARVORE]


def sortear_pergunta(
    rng: Optional[random.Random] = None,
    *,
    arvore: Optional[str] = None,
    recentes: Iterable[str] = (),
) -> str:
    """Sorteia uma pergunta. `arvore` é o nome da Árvore do entrevistado (se
    houver) e `recentes` são as últimas perguntas feitas, que ficam de fora
    enquanto sobrar alguma outra."""
    gerador = rng or random
    evitar = set(recentes)
    gerais = [p for p in PERGUNTAS if p not in evitar]
    da_arvore = (
        [m.format(arvore=arvore) for m in PERGUNTAS_ARVORE if m.format(arvore=arvore) not in evitar]
        if arvore else []
    )
    if da_arvore and (not gerais or gerador.random() < CHANCE_ARVORE):
        return gerador.choice(da_arvore)
    if gerais:
        return gerador.choice(gerais)
    return gerador.choice(perguntas_possiveis(arvore))
