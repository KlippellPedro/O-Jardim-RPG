"""
Núcleo de rolagem de dados do Barista.

Puro (sem discord.py): recebe uma expressão tipo "2d6+1d4-3" ou pede um
teste de d20 (normal/vantagem/desvantagem, regra descrita em
docs/regras/fundamentos-v1.md — "com vantagem, role dois d20 e use o
maior; com desvantagem, use o menor") e devolve os valores rolados junto
do total, pra quem chama decidir como mostrar.

Sintaxe igual à do Rollem, que a mesa já usava, e igual à do site
(plataforma/core/dados.py) — o mesmo comando funciona nos dois lugares:

    2d6+3        soma os dados e o modificador
    1d20+1d4-2   quantos termos quiser
    2#d20        DUAS rolagens separadas de d20 (não é 2d20 somado)
    3#2d6+3      três rolagens de 2d6+3
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass, field
from typing import List, Optional, Union

MAX_QUANTIDADE = 100
MAX_LADOS = 1000
MAX_TERMOS = 20
MAX_REPETICOES = 20

# random.SystemRandom() lê de os.urandom() (CSPRNG do SO) em vez do Mersenne
# Twister padrão do módulo random, que é previsível: observando resultados
# suficientes dá pra reconstruir o estado interno e prever as próximas
# rolagens. Aqui não tem essa brecha.
_RNG_PADRAO = random.SystemRandom()

_TERMO = re.compile(r"([+-]?)\s*(?:(\d*)d(\d+)|(\d+))", re.IGNORECASE)

MODOS_TESTE = ("normal", "vantagem", "desvantagem")


class ExpressaoInvalida(ValueError):
    """Expressão de dados mal formada ou fora dos limites permitidos."""


@dataclass
class TermoDado:
    sinal: int
    quantidade: int
    lados: int
    valores: List[int] = field(default_factory=list)

    @property
    def total(self) -> int:
        return self.sinal * sum(self.valores)

    def texto(self, *, primeiro: bool) -> str:
        prefixo = "-" if self.sinal < 0 else ("" if primeiro else "+")
        valores = ", ".join(str(v) for v in self.valores)
        return f"{prefixo}{self.quantidade}d{self.lados} [{valores}]"


@dataclass
class TermoFixo:
    sinal: int
    valor: int

    @property
    def total(self) -> int:
        return self.sinal * self.valor

    def texto(self, *, primeiro: bool) -> str:
        prefixo = "-" if self.sinal < 0 else ("" if primeiro else "+")
        return f"{prefixo}{self.valor}"


Termo = Union[TermoDado, TermoFixo]


@dataclass
class ResultadoRolagem:
    expressao: str
    termos: List[Termo]
    total: int
    # Preenchido quando a expressão usa `N#`: uma entrada por rolagem.
    repeticoes: List["ResultadoRolagem"] = field(default_factory=list)

    @property
    def repetida(self) -> bool:
        return len(self.repeticoes) > 1

    def detalhe(self) -> str:
        if self.repetida:
            # Como o Rollem: cada rolagem aparece inteira, uma por linha.
            return "\n".join(
                f"{i + 1}) {r.detalhe()} = **{r.total}**"
                for i, r in enumerate(self.repeticoes)
            )
        return " ".join(t.texto(primeiro=i == 0) for i, t in enumerate(self.termos))

    def resumo_total(self) -> str:
        if self.repetida:
            return ", ".join(str(r.total) for r in self.repeticoes)
        return str(self.total)


def separar_repeticoes(expressao: str) -> tuple[int, str]:
    """Divide `3#2d6+1` em (3, "2d6+1"). Sem `#`, é uma repetição só."""
    texto = (expressao or "").strip().lower().replace(" ", "")
    if not texto:
        raise ExpressaoInvalida("expressão vazia.")
    if "#" not in texto:
        return 1, texto

    contagem, _, resto = texto.partition("#")
    if "#" in resto:
        raise ExpressaoInvalida("use só um # por expressão, como em 2#d20.")
    if not contagem.isdigit():
        raise ExpressaoInvalida("antes do # deve vir um número, como em 2#d20.")
    vezes = int(contagem)
    if not 1 <= vezes <= MAX_REPETICOES:
        raise ExpressaoInvalida(f"repita de 1 a {MAX_REPETICOES} vezes.")
    if not resto:
        raise ExpressaoInvalida("falta a expressão depois do #, como em 2#d20.")
    return vezes, resto


def rolar(expressao: str, rng: Optional[random.Random] = None) -> ResultadoRolagem:
    """Rola "2d6+3", "1d20+1d4-2" ou "2#d20" (duas rolagens separadas).

    Levanta ExpressaoInvalida se o texto tiver algo que não seja
    dado/número/sinal, ou se passar dos limites de segurança (evita travar o
    bot com "999d999999")."""
    vezes, texto = separar_repeticoes(expressao)
    if vezes > 1:
        rolagens = [_rolar_simples(texto, rng) for _ in range(vezes)]
        return ResultadoRolagem(
            expressao=f"{vezes}#{texto}",
            termos=rolagens[0].termos,
            total=sum(r.total for r in rolagens),
            repeticoes=rolagens,
        )
    return _rolar_simples(texto, rng, rotulo=expressao.strip())


def _rolar_simples(
    texto: str,
    rng: Optional[random.Random] = None,
    rotulo: Optional[str] = None,
) -> ResultadoRolagem:
    """Uma rolagem, sem `#`: soma todos os termos."""
    gerador = rng or _RNG_PADRAO
    termos: List[Termo] = []
    pos = 0
    for m in _TERMO.finditer(texto):
        if m.start() != pos:
            raise ExpressaoInvalida(f"não entendi perto de: \"{texto[pos:]}\"")
        pos = m.end()

        sinal_txt, qtd_txt, lados_txt, fixo_txt = m.groups()
        sinal = -1 if sinal_txt == "-" else 1

        if lados_txt is not None:
            quantidade = int(qtd_txt) if qtd_txt else 1
            lados = int(lados_txt)
            if not (1 <= quantidade <= MAX_QUANTIDADE):
                raise ExpressaoInvalida(f"quantidade de dados fora do limite (1 a {MAX_QUANTIDADE}).")
            if not (1 <= lados <= MAX_LADOS):
                raise ExpressaoInvalida(f"dado com lados fora do limite (1 a {MAX_LADOS}).")
            valores = [gerador.randint(1, lados) for _ in range(quantidade)]
            termos.append(TermoDado(sinal=sinal, quantidade=quantidade, lados=lados, valores=valores))
        else:
            termos.append(TermoFixo(sinal=sinal, valor=int(fixo_txt)))

        if len(termos) > MAX_TERMOS:
            raise ExpressaoInvalida(f"expressão com termos demais (máximo {MAX_TERMOS}).")

    if pos != len(texto):
        raise ExpressaoInvalida(f"não entendi perto de: \"{texto[pos:]}\"")
    if not termos:
        raise ExpressaoInvalida("nenhum dado ou número encontrado.")

    total = sum(t.total for t in termos)
    return ResultadoRolagem(expressao=rotulo or texto, termos=termos, total=total)


@dataclass
class ResultadoTeste:
    dados: List[int]
    escolhido: int
    modo: str
    modificador: int
    total: int


def rolar_teste(
    modificador: int = 0,
    modo: str = "normal",
    rng: Optional[random.Random] = None,
) -> ResultadoTeste:
    """Teste de d20 (Teste = d20 + modificador). Com vantagem/desvantagem rola
    dois d20 e fica com o maior/menor, como descrito nas regras do sistema."""
    if modo not in MODOS_TESTE:
        raise ExpressaoInvalida(f"modo inválido (use: {', '.join(MODOS_TESTE)}).")

    gerador = rng or _RNG_PADRAO
    quantidade = 1 if modo == "normal" else 2
    dados = [gerador.randint(1, 20) for _ in range(quantidade)]

    if modo == "vantagem":
        escolhido = max(dados)
    elif modo == "desvantagem":
        escolhido = min(dados)
    else:
        escolhido = dados[0]

    return ResultadoTeste(
        dados=dados,
        escolhido=escolhido,
        modo=modo,
        modificador=modificador,
        total=escolhido + modificador,
    )
