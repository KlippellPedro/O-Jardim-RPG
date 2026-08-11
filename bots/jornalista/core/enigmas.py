"""Enigmas dos baús, classificados por dificuldade e tema.

As respostas são comparadas sem acento, diferença de caixa ou espaços
duplicados. O banco mistura fatos estáveis do RPG com charadas clássicas,
lógica, observação e situações da vida cotidiana.
"""

from __future__ import annotations

import random
import unicodedata
from dataclasses import dataclass
from typing import Optional, Tuple


def normalizar(texto: object) -> str:
    t = unicodedata.normalize("NFKD", str(texto))
    t = "".join(c for c in t if not unicodedata.combining(c))
    return " ".join(t.strip().lower().split())


@dataclass(frozen=True)
class Enigma:
    pergunta: str
    respostas: Tuple[str, ...]
    dificuldade: str = "facil"
    categoria: str = "Geral"


ENIGMAS = (
    # Fáceis: conhecimento do Jardim e charadas populares diretas.
    Enigma("Quantas Árvores existem no Jardim?", ("10", "dez"), "facil", "O Jardim"),
    Enigma("Quantos Lunaris equivalem a 1 Solar?", ("100", "cem"), "facil", "Economia"),
    Enigma("Qual bot cuida da economia: Banqueiro ou Jornalista?", ("banqueiro", "o banqueiro"), "facil", "Bots"),
    Enigma("Qual bot publica as notícias do Jardim?", ("jornalista", "o jornalista"), "facil", "Bots"),
    Enigma("Quantas estações existem no ciclo completo do Jardim?", ("6", "seis"), "facil", "O Jardim"),
    Enigma("Qual comando mostra um planejamento privado de roubo?", ("roubo_planejar", "/roubo_planejar"), "facil", "Banqueiro"),
    Enigma("Quantos dias formam uma semana?", ("7", "sete"), "facil", "Vida cotidiana"),
    Enigma("Tenho dentes, mas não mordo. O que sou?", ("pente", "um pente"), "facil", "Charada clássica"),
    Enigma("Quanto mais seco, mais molhado fico. O que sou?", ("toalha", "uma toalha"), "facil", "Charada clássica"),
    Enigma("Tenho ponteiros, mas não tenho braços. O que sou?", ("relogio", "um relogio"), "facil", "Objetos"),
    Enigma("O que sobe e nunca volta a descer?", ("idade", "a idade", "sua idade"), "facil", "Vida cotidiana"),
    Enigma("Qual mês tem 28 dias?", ("todos", "todos os meses"), "facil", "Pegadinha"),

    # Médios: regras atuais, linguagem e deduções curtas.
    Enigma("Qual estação normalmente traz mais loot raro: Verão ou Inverno?", ("verao",), "medio", "O Jardim"),
    Enigma("Qual é a cor da raridade Mítica no RPG?", ("vermelho", "vermelha"), "medio", "Raridades"),
    Enigma("Em qual página da ficha ficam propriedades e veículos?", ("bens", "pagina bens", "aba bens"), "medio", "Ficha"),
    Enigma("Pertence a você, mas as outras pessoas usam mais. O que é?", ("nome", "seu nome", "o nome"), "medio", "Charada clássica"),
    Enigma("Tenho muitas teclas, mas nenhuma abre fechaduras. O que sou?", ("piano", "um piano", "teclado", "um teclado"), "medio", "Objetos"),
    Enigma("Viajo o mundo inteiro sem sair do canto. O que sou?", ("selo", "um selo"), "medio", "Charada clássica"),
    Enigma("Tenho cidades sem casas, rios sem água e florestas sem árvores. O que sou?", ("mapa", "um mapa"), "medio", "Charada clássica"),
    Enigma("O que se quebra assim que seu nome é dito?", ("silencio", "o silencio"), "medio", "Charada clássica"),
    Enigma("Tenho um olho, mas não consigo ver. O que sou?", ("agulha", "uma agulha"), "medio", "Objetos"),
    Enigma("O que pode encher uma sala sem ocupar espaço?", ("luz", "a luz"), "medio", "Charada clássica"),
    Enigma("Se você me alimentar, vivo; se me der água, morro. O que sou?", ("fogo", "o fogo"), "medio", "Natureza"),
    Enigma("Uma dúzia representa quantas unidades?", ("12", "doze"), "medio", "Vida cotidiana"),

    # Difíceis: problemas clássicos com uma etapa de raciocínio.
    Enigma("Dois pais e dois filhos dividiram três maçãs, uma para cada pessoa. Quantas pessoas havia?", ("3", "tres"), "dificil", "Lógica"),
    Enigma("Um homem barbeia várias pessoas por dia, mas continua barbado. Qual é sua profissão?", ("barbeiro", "um barbeiro"), "dificil", "Lógica"),
    Enigma("Nasço grande e morro pequena, iluminando enquanto vivo. O que sou?", ("vela", "uma vela"), "dificil", "Charada clássica"),
    Enigma("Cinco irmãs estão ocupadas: quatro leem, cozinham, jogam xadrez e lavam roupa. O que a quinta faz?", ("joga xadrez", "jogando xadrez", "xadrez"), "dificil", "Lógica"),
    Enigma("De manhã tenho quatro pernas, ao meio-dia duas e à noite três. Quem sou?", ("ser humano", "humano", "homem", "uma pessoa", "pessoa"), "dificil", "Charada clássica"),
    Enigma("Tenho doze filhos; cada filho tem cerca de trinta filhos. Quem sou?", ("ano", "um ano", "o ano"), "dificil", "Tempo"),
    Enigma("Um fazendeiro tinha 17 ovelhas. Todas, menos 9, morreram. Quantas sobraram?", ("9", "nove"), "dificil", "Pegadinha"),
    Enigma("Um médico entrega três comprimidos e manda tomar um a cada 30 minutos. Em quanto tempo os três acabam?", ("1 hora", "uma hora", "60 minutos"), "dificil", "Vida cotidiana"),
    Enigma("Uma mulher tem quatro filhas, e todas compartilham o mesmo irmão. Quantos filhos ela tem?", ("5", "cinco"), "dificil", "Lógica"),
    Enigma("Complete a sequência: 2, 6, 12, 20, 30, ...", ("42", "quarenta e dois"), "dificil", "Sequência"),

    # Lendários: problemas que exigem mais de uma etapa ou reconhecer um padrão.
    Enigma("Complete a sequência descritiva: 1, 11, 21, 1211, 111221, ...", ("312211",), "lendario", "Sequência"),
    Enigma("Três caixas dizem Maçãs, Laranjas e Mista, mas todos os rótulos estão errados. De qual caixa você tira uma fruta primeiro?", ("mista", "caixa mista", "da caixa mista"), "lendario", "Lógica"),
    Enigma("Uma corda é acesa nas duas pontas e outra em uma ponta. Quando a primeira acaba, acende-se a outra ponta da segunda. Quanto tempo passou quando a segunda acaba?", ("45 minutos", "45", "quarenta e cinco minutos"), "lendario", "Lógica"),
    Enigma("Há oito bolas iguais, mas uma é mais pesada. Qual o mínimo de pesagens numa balança de pratos para encontrá-la?", ("2", "duas", "duas pesagens"), "lendario", "Lógica"),
    Enigma("Um relógio leva 5 segundos para dar 6 badaladas. Quanto leva para dar 12 badaladas?", ("11 segundos", "11", "onze segundos"), "lendario", "Tempo"),
    Enigma("Um caracol sobe 3 metros de dia e desce 2 à noite. Em qual dia alcança o topo de um muro de 10 metros?", ("8", "oitavo", "oitavo dia", "dia 8"), "lendario", "Lógica"),
    Enigma("Um taco e uma bola custam 1,10; o taco custa 1,00 a mais que a bola. Quanto custa a bola?", ("0,05", "0.05", "5 centavos", "cinco centavos"), "lendario", "Lógica"),
    Enigma("Uma planta dobra de tamanho por dia e cobre o lago no 48º dia. Em qual dia cobria metade?", ("47", "dia 47", "quadragesimo setimo", "quadragesimo setimo dia"), "lendario", "Lógica"),

    # Lendários: os baús mais raros usam os desafios mais exigentes.
    Enigma("Quatro pessoas atravessam uma ponte à noite em 1, 2, 7 e 10 minutos. Duas por vez e com uma lanterna. Qual o menor tempo total?", ("17", "17 minutos", "dezessete minutos"), "lendario", "Lógica"),
    Enigma("Cem portas fechadas são alternadas em 100 passagens: na passagem n, alternam-se os múltiplos de n. Quantas ficam abertas?", ("10", "dez"), "lendario", "Lógica"),
    Enigma("Num programa com três portas, após o apresentador revelar uma porta vazia, qual é a chance de ganhar trocando?", ("2/3", "dois tercos", "66,7%", "66.7%"), "lendario", "Probabilidade"),
    Enigma("Um relógio marca 3h15. Qual é o menor ângulo entre os ponteiros?", ("7,5 graus", "7.5 graus", "7,5", "7.5"), "lendario", "Geometria"),
    Enigma("Você tem 9 moedas e uma é mais pesada. Qual o mínimo de pesagens numa balança de pratos para encontrá-la?", ("2", "duas", "duas pesagens"), "lendario", "Lógica"),
    Enigma("Um lago tem vitórias-régias que dobram diariamente. Se fica cheio em 30 dias, quando estava com um quarto da área?", ("28", "dia 28", "vigesimo oitavo dia"), "lendario", "Lógica"),
    Enigma("Três pessoas pagam 30, recebem 5 de troco, ficam com 1 cada e o mensageiro guarda 2. Quanto o hotel recebeu?", ("25", "25 reais", "vinte e cinco", "vinte e cinco reais"), "lendario", "Lógica"),
    Enigma("Qual é o próximo número: 1, 2, 6, 24, 120, ...?", ("720", "setecentos e vinte"), "lendario", "Sequência"),
)

DIFICULDADES = ("facil", "medio", "dificil", "lendario")


def enigmas_da_dificuldade(dificuldade: str) -> Tuple[Enigma, ...]:
    alvo = normalizar(dificuldade)
    return tuple(enigma for enigma in ENIGMAS if enigma.dificuldade == alvo)


def sortear_enigma(
    rng: Optional[random.Random] = None,
    dificuldade: Optional[str] = None,
) -> Enigma:
    gerador = rng or random
    candidatos = enigmas_da_dificuldade(dificuldade) if dificuldade else ENIGMAS
    if not candidatos:
        raise ValueError(f"dificuldade de enigma desconhecida: {dificuldade}")
    return gerador.choice(candidatos)


def checar_resposta(enigma: Enigma, resposta_usuario: str) -> bool:
    alvo = normalizar(resposta_usuario)
    return any(alvo == normalizar(certa) for certa in enigma.respostas)
