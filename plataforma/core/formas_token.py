"""Formas e fonte de um token: as contas, sem banco nem HTTP.

**Formas** são as imagens que um token do Mestre pode vestir (um lobo, o mesmo lobo ferido, o lobisomem), até 8,
cada uma uma imagem do Acervo. O Mestre troca pela tecla 1 a 9 (1 é a imagem de base) ou pelo menu do token. O
token de personagem de jogador não usa isto: ele tem as artes da própria ficha.

**Fonte** é o token que gera cópias: arrastar a partir dele deixa uma cópia numerada onde foi solto e ele volta
para o lugar. O limite (opcional) conta quantas cópias ele ainda pode gerar.
"""

from __future__ import annotations

from uuid import UUID, uuid4

MAX_FORMAS = 8
NOME_MAXIMO = 24
LIMITE_MAXIMO_DA_FONTE = 200


class ErroForma(ValueError):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _nome(valor, padrao: str) -> str:
    texto = " ".join(str(valor or "").split())[:NOME_MAXIMO]
    return texto or padrao


def _uuid_texto(valor) -> str | None:
    try:
        return str(UUID(str(valor)))
    except (ValueError, AttributeError, TypeError):
        return None


def ler_formas(bruto) -> list[dict]:
    """As formas guardadas no banco; o que está quebrado é descartado."""
    if not isinstance(bruto, list):
        return []
    saida, vistos = [], set()
    for item in bruto[:MAX_FORMAS]:
        if not isinstance(item, dict):
            continue
        identificador = item.get("id")
        imagem = _uuid_texto(item.get("imagem_id"))
        if not isinstance(identificador, str) or not 0 < len(identificador) <= 32 or identificador in vistos or imagem is None:
            continue
        vistos.add(identificador)
        saida.append({"id": identificador, "nome": _nome(item.get("nome"), f"Forma {len(saida) + 2}"), "imagem_id": imagem})
    return saida


def forma_nova(formas: list[dict], imagem_id, nome) -> dict:
    """A forma que entra no fim da lista. Erro com 8 formas ou com uma imagem que não é um id do Acervo."""
    if len(formas) >= MAX_FORMAS:
        raise ErroForma(f"um token tem no maximo {MAX_FORMAS} formas", 409)
    imagem = _uuid_texto(imagem_id)
    if imagem is None:
        raise ErroForma("escolha uma imagem do Acervo")
    return {"id": uuid4().hex[:12], "nome": _nome(nome, f"Forma {len(formas) + 2}"), "imagem_id": imagem}


def ativa_valida(ativa, formas: list[dict]) -> str | None:
    """O id da forma que vale agora; nulo (a imagem de base) quando ela não está mais na lista."""
    return ativa if isinstance(ativa, str) and any(forma["id"] == ativa for forma in formas) else None


def aplicar_forma(token: dict) -> dict:
    """Põe no token a imagem da forma ativa no lugar da de base, guardando a de base em `imagem_id_base`.

    Todo o resto do servidor (retrato, versão da imagem, rota da imagem) lê `imagem_id` e passa a ver a forma."""
    formas = ler_formas(token.get("formas"))
    token["formas"] = formas
    token["imagem_id_base"] = token.get("imagem_id")
    ativa = ativa_valida(token.get("forma_ativa"), formas)
    token["forma_ativa"] = ativa
    if ativa:
        forma = next(f for f in formas if f["id"] == ativa)
        token["imagem_id"] = UUID(forma["imagem_id"])
    return token


def lista_do_mestre(token: dict) -> dict:
    """O que o Mestre recebe de formas: o id, o nome e qual está valendo (a imagem em si segue pela rota do token)."""
    formas = ler_formas(token.get("formas"))
    return {
        "formas": [{"id": f["id"], "nome": f["nome"]} for f in formas],
        "forma_ativa": ativa_valida(token.get("forma_ativa"), formas),
    }


# ------------------------------------------------------------------ fonte

def ler_fonte(bruto) -> dict | None:
    """A fonte guardada: {"limite": int | None, "usados": int}; qualquer outra coisa é "não é fonte"."""
    if not isinstance(bruto, dict):
        return None
    limite = bruto.get("limite")
    limite = int(limite) if isinstance(limite, int) and not isinstance(limite, bool) and 1 <= limite <= LIMITE_MAXIMO_DA_FONTE else None
    usados = bruto.get("usados")
    usados = int(usados) if isinstance(usados, int) and not isinstance(usados, bool) and usados >= 0 else 0
    return {"limite": limite, "usados": usados}


def fonte_configurada(atual, ativa: bool, limite, reiniciar: bool = False) -> dict | None:
    """O que gravar: nulo desliga a fonte; senão o limite novo (nulo é sem limite) e o contador, que só zera com `reiniciar`."""
    if not ativa:
        return None
    if limite is not None and (isinstance(limite, bool) or not isinstance(limite, int) or not 1 <= limite <= LIMITE_MAXIMO_DA_FONTE):
        raise ErroForma(f"o limite de copias vai de 1 a {LIMITE_MAXIMO_DA_FONTE}")
    antes = ler_fonte(atual) or {"limite": None, "usados": 0}
    return {"limite": limite, "usados": 0 if reiniciar else antes["usados"]}


def gastar_copia(fonte: dict | None) -> dict:
    """A fonte depois de gerar uma cópia, ou erro se não é fonte ou se as cópias acabaram."""
    atual = ler_fonte(fonte)
    if atual is None:
        raise ErroForma("este token nao e uma fonte", 409)
    if atual["limite"] is not None and atual["usados"] >= atual["limite"]:
        raise ErroForma("as copias desta fonte acabaram: recarregue a fonte para gerar mais", 409)
    return {"limite": atual["limite"], "usados": atual["usados"] + 1}
