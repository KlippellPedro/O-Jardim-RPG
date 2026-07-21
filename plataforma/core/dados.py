"""Rolagem de dados no servidor.

Os dados são rolados aqui, e não no navegador, porque o log precisa valer como
prova: com a rolagem no cliente, qualquer jogador poderia escolher o resultado
pelo console. O bônus continua vindo da ficha — validá-lo exigiria reimplementar
todo o cálculo de perícias em Python —, mas ele é gravado junto com a origem
declarada, então o mestre vê de onde cada número saiu.

Regra do sistema (docs/regras/fundamentos-v1.md):

    Teste = d20 + Mod.Atributo + piso(Nível Total / 2) + bônus do Grau

Vantagem rola 2d20 e usa o maior; desvantagem usa o menor. Fontes opostas se
anulam e nunca acrescentam um terceiro dado.

A sintaxe de expressão é a mesma do Rollem, que a mesa já usava no Discord:

    2d6+3        soma os dados e o modificador
    1d20+1d4-2   quantos termos quiser
    2#d20        DUAS rolagens separadas de d20 (não é 2d20 somado)
    3#2d6+3      três rolagens de 2d6+3

O `#` é o que separa "repetir a rolagem" de "somar mais dados": `2#d20` devolve
dois resultados independentes, enquanto `2d20` devolve um só, somado.
"""

from __future__ import annotations

import re
import secrets


MAX_DADOS = 100
MAX_FACES = 1000
MAX_TERMOS = 20
MAX_REPETICOES = 20

_TERMO = re.compile(r"([+-]?)\s*(?:(\d*)d(\d+)|(\d+))", re.IGNORECASE)


class ExpressaoInvalida(ValueError):
    """Expressão mal formada ou fora dos limites de segurança."""


def rolar_dado(faces: int) -> int:
    """Um dado justo. `secrets` evita a previsibilidade do gerador padrão."""
    if faces < 1:
        raise ValueError("dado precisa ter ao menos uma face")
    return secrets.randbelow(faces) + 1


def rolar_teste(bonus: int, vantagens: int = 0, desvantagens: int = 0, dt: int | None = None) -> dict:
    """Teste de d20 do sistema, já classificado contra a DT quando informada."""
    saldo = (vantagens or 0) - (desvantagens or 0)
    dados = [rolar_dado(20)] if saldo == 0 else [rolar_dado(20), rolar_dado(20)]
    if saldo > 0:
        natural = max(dados)
        modo = "vantagem"
    elif saldo < 0:
        natural = min(dados)
        modo = "desvantagem"
    else:
        natural = dados[0]
        modo = "normal"

    total = natural + bonus
    resultado = {
        "dados": dados,
        "natural": natural,
        "modo": modo,
        "bonus": bonus,
        "total": total,
        "critico_natural": natural == 20,
        "falha_natural": natural == 1,
    }
    if dt is not None:
        resultado["dt"] = dt
        resultado["grau"] = _classificar(total, natural, dt)
    return resultado


def _classificar(total: int, natural: int, dt: int) -> str:
    """Sucesso crítico em DT+10, falha crítica em DT-10; 20 e 1 movem um grau."""
    escala = ["falha critica", "falha", "sucesso", "sucesso critico"]
    if total >= dt + 10:
        posicao = 3
    elif total >= dt:
        posicao = 2
    elif total <= dt - 10:
        posicao = 0
    else:
        posicao = 1

    if natural == 20:
        posicao += 1
    elif natural == 1:
        posicao -= 1
    return escala[max(0, min(3, posicao))]


def _separar_repeticoes(expressao: str) -> tuple[int, str]:
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
    repeticoes = int(contagem)
    if not 1 <= repeticoes <= MAX_REPETICOES:
        raise ExpressaoInvalida(f"repita de 1 a {MAX_REPETICOES} vezes.")
    if not resto:
        raise ExpressaoInvalida("falta a expressão depois do #, como em 2#d20.")
    return repeticoes, resto


def _rolar_termos(texto: str) -> dict:
    """Rola uma expressão sem `#`, somando todos os termos."""
    termos: list[dict] = []
    posicao = 0
    for encontrado in _TERMO.finditer(texto):
        if encontrado.start() != posicao:
            raise ExpressaoInvalida(f'não entendi perto de: "{texto[posicao:]}"')
        posicao = encontrado.end()

        sinal_texto, quantidade_texto, faces_texto, fixo_texto = encontrado.groups()
        sinal = -1 if sinal_texto == "-" else 1

        if faces_texto is not None:
            quantidade = int(quantidade_texto) if quantidade_texto else 1
            faces = int(faces_texto)
            if not 1 <= quantidade <= MAX_DADOS:
                raise ExpressaoInvalida(f"use de 1 a {MAX_DADOS} dados por termo.")
            if not 1 <= faces <= MAX_FACES:
                raise ExpressaoInvalida(f"o dado precisa ter de 1 a {MAX_FACES} faces.")
            valores = [rolar_dado(faces) for _ in range(quantidade)]
            termos.append({
                "tipo": "dado",
                "sinal": sinal,
                "quantidade": quantidade,
                "faces": faces,
                "valores": valores,
                "total": sinal * sum(valores),
            })
        else:
            valor = int(fixo_texto)
            termos.append({"tipo": "fixo", "sinal": sinal, "valor": valor, "total": sinal * valor})

        if len(termos) > MAX_TERMOS:
            raise ExpressaoInvalida(f"expressão com termos demais (máximo {MAX_TERMOS}).")

    if posicao != len(texto):
        raise ExpressaoInvalida(f'não entendi perto de: "{texto[posicao:]}"')
    if not termos:
        raise ExpressaoInvalida("nenhum dado ou número encontrado.")

    return {
        "termos": termos,
        # Achatado para quem só quer ver os dados que caíram.
        "dados": [valor for termo in termos if termo["tipo"] == "dado" for valor in termo["valores"]],
        "bonus": sum(termo["total"] for termo in termos if termo["tipo"] == "fixo"),
        "total": sum(termo["total"] for termo in termos),
    }


def rolar_formula(formula: str) -> dict:
    """Rola `2d6+3`, `1d20+1d4-2` ou `3#d8` (três rolagens separadas).

    Com repetições, `total` é a soma de todas — quem exibe deve mostrar cada
    rolagem, como o Rollem faz; a soma existe só para haver um número no log.
    """
    repeticoes, texto = _separar_repeticoes(formula)
    rolagens = [_rolar_termos(texto) for _ in range(repeticoes)]
    normalizada = f"{repeticoes}#{texto}" if repeticoes > 1 else texto

    if repeticoes == 1:
        return {**rolagens[0], "formula": normalizada, "repeticoes": 1}

    return {
        "formula": normalizada,
        "repeticoes": repeticoes,
        "rolagens": [{"dados": r["dados"], "total": r["total"]} for r in rolagens],
        "dados": [valor for r in rolagens for valor in r["dados"]],
        "bonus": rolagens[0]["bonus"],
        "total": sum(r["total"] for r in rolagens),
    }
