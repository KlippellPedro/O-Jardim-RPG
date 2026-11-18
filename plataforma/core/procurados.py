"""Quadro de procurados da Loja (aba Caçadores).

O Mestre prega cartazes dos seres que a campanha procura: nome, que ser é,
onde foi visto, o que fez, quanto vale e uma imagem tirada do acervo dele.
O jogador vê os cartazes publicados, entra na caçada com um personagem e,
quando o Mestre encerra o cartaz, a recompensa cai na carteira de quem caçou.

Regras que o servidor garante:

- rascunho (``publicado=false``) e ``notas_mestre`` nunca saem para o jogador;
- a imagem do cartaz publicado fica legível para os membros ativos da campanha
  (``pode_ler_imagem``), mesmo sem estar em cena nenhuma do mapa;
- uma recompensa só é paga uma vez (``pagamento`` preenchido trava o cartaz).
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from core.acervo import chave_do_retrato

CONDICOES = ("vivo", "morto", "vivo-ou-morto")
AMEACAS = ("baixa", "media", "alta", "extrema", "desconhecida")
STATUS = ("aberto", "capturado", "abatido", "cancelado")
#: Desfechos que pagam recompensa; "cancelado" encerra sem pagar.
DESFECHOS_PAGOS = ("capturado", "abatido")

#: Tamanho máximo de cada texto do cartaz.
LIMITES = {
    "nome": 80,
    "especie": 80,
    "descricao": 1200,
    "local": 120,
    "notas_mestre": 2000,
    "recompensa_moeda": 40,
}
MAX_POR_CAMPANHA = 200
MAX_CACADORES = 30
#: Teto de uma recompensa (mesmo teto de saldo da economia).
MAX_RECOMPENSA = 10**15


class ErroProcurado(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _texto(valor: Any, campo: str, *, obrigatorio: bool = False, multilinha: bool = False) -> str:
    limite = LIMITES[campo]
    if valor is None:
        texto = ""
    elif multilinha:
        linhas = [" ".join(linha.split()) for linha in str(valor).replace("\r\n", "\n").split("\n")]
        texto = "\n".join(linhas).strip()
        while "\n\n\n" in texto:
            texto = texto.replace("\n\n\n", "\n\n")
    else:
        texto = " ".join(str(valor).split())
    if obrigatorio and not texto:
        raise ErroProcurado(f"{campo} e obrigatorio")
    if len(texto) > limite:
        raise ErroProcurado(f"{campo} passa de {limite} caracteres")
    return texto


def _escolha(valor: Any, opcoes: tuple[str, ...], campo: str) -> str:
    texto = str(valor or "").strip().lower()
    if texto not in opcoes:
        raise ErroProcurado(f"{campo} invalido")
    return texto


def _inteiro(valor: Any, campo: str, minimo: int, maximo: int, *, nulo: bool = False) -> int | None:
    if valor is None or valor == "":
        if nulo:
            return None
        raise ErroProcurado(f"{campo} e obrigatorio")
    if isinstance(valor, bool):
        raise ErroProcurado(f"{campo} invalido")
    try:
        numero = int(valor)
    except (TypeError, ValueError) as exc:
        raise ErroProcurado(f"{campo} invalido") from exc
    if numero != valor and not (isinstance(valor, str) and str(numero) == valor.strip()):
        raise ErroProcurado(f"{campo} precisa ser inteiro")
    if not minimo <= numero <= maximo:
        raise ErroProcurado(f"{campo} fora do limite")
    return numero


#: Campo -> (normalizador, valor padrão de um cartaz novo).
CAMPOS_EDITAVEIS = (
    "nome", "especie", "descricao", "local", "condicao", "ameaca", "vd",
    "recompensa_valor", "recompensa_moeda", "imagem_id", "imagem_foco",
    "status", "publicado", "notas_mestre",
)


def normalizar(dados: dict[str, Any], atual: dict[str, Any] | None = None) -> dict[str, Any]:
    """Confere o que o Mestre mandou. Com ``atual``, só os campos presentes mudam."""
    if not isinstance(dados, dict):
        raise ErroProcurado("dados invalidos")
    desconhecidos = set(dados) - set(CAMPOS_EDITAVEIS)
    if desconhecidos:
        raise ErroProcurado(f"campo desconhecido: {sorted(desconhecidos)[0]}")
    base = dict(atual or {})
    novo = atual is None
    resultado: dict[str, Any] = {}

    def presente(campo: str) -> bool:
        return campo in dados or novo

    if presente("nome"):
        resultado["nome"] = _texto(dados.get("nome"), "nome", obrigatorio=True)
    for campo in ("especie", "local"):
        if presente(campo):
            resultado[campo] = _texto(dados.get(campo), campo)
    for campo in ("descricao", "notas_mestre"):
        if presente(campo):
            resultado[campo] = _texto(dados.get(campo), campo, multilinha=True)
    if presente("condicao"):
        resultado["condicao"] = _escolha(dados.get("condicao", "vivo-ou-morto"), CONDICOES, "condicao")
    if presente("ameaca"):
        resultado["ameaca"] = _escolha(dados.get("ameaca", "desconhecida"), AMEACAS, "ameaca")
    if presente("vd"):
        resultado["vd"] = _inteiro(dados.get("vd"), "vd", 0, 999, nulo=True)
    if presente("recompensa_valor"):
        resultado["recompensa_valor"] = _inteiro(dados.get("recompensa_valor", 0), "recompensa_valor", 0, MAX_RECOMPENSA)
    if presente("recompensa_moeda"):
        moeda = _texto(dados.get("recompensa_moeda") or "Lunaris", "recompensa_moeda")
        resultado["recompensa_moeda"] = moeda or "Lunaris"
    if presente("imagem_id"):
        bruto = dados.get("imagem_id")
        if bruto in (None, ""):
            resultado["imagem_id"] = None
        else:
            try:
                resultado["imagem_id"] = UUID(str(bruto))
            except ValueError as exc:
                raise ErroProcurado("imagem invalida") from exc
    if presente("imagem_foco"):
        resultado["imagem_foco"] = _inteiro(dados.get("imagem_foco", 35), "imagem_foco", 0, 100)
    if presente("status"):
        resultado["status"] = _escolha(dados.get("status", "aberto"), STATUS, "status")
    if presente("publicado"):
        publicado = dados.get("publicado", False)
        if not isinstance(publicado, bool):
            raise ErroProcurado("publicado invalido")
        resultado["publicado"] = publicado

    if base.get("pagamento") and "status" in resultado and resultado["status"] != base.get("status"):
        raise ErroProcurado("a recompensa ja foi paga; o desfecho nao muda mais", 409)
    return resultado


def dividir_recompensa(valor: int, quantos: int) -> list[int]:
    """Divide igual; o que sobra da divisão vai, uma moeda para cada, aos primeiros da lista."""
    if quantos <= 0:
        return []
    parte, sobra = divmod(max(0, int(valor)), quantos)
    return [parte + (1 if indice < sobra else 0) for indice in range(quantos)]


def imagem_do_cartaz(linha: dict[str, Any]) -> dict[str, Any] | None:
    """O pedaço do acervo que o cartaz mostra (a imagem inteira, no maior tamanho num arquivo só)."""
    if not linha.get("imagem_id") or linha.get("imagem_estado") != "pronto":
        return None
    largura = int(linha.get("imagem_largura") or 0)
    altura = int(linha.get("imagem_altura") or 0)
    if largura <= 0 or altura <= 0:
        return None
    return {
        "id": str(linha["imagem_id"]),
        "chave": chave_do_retrato(largura, altura),
        "largura": largura,
        "altura": altura,
    }


def serializar(linha: dict[str, Any], cacadores: list[dict[str, Any]], *, gestor: bool) -> dict[str, Any]:
    """O cartaz como a tela recebe. Jogador nunca recebe notas do Mestre nem o usuário de cada caçador."""
    pagamento = linha.get("pagamento") if isinstance(linha.get("pagamento"), dict) else None
    cartaz = {
        "id": str(linha["id"]),
        "nome": linha["nome"],
        "especie": linha["especie"],
        "descricao": linha["descricao"],
        "local": linha["local"],
        "condicao": linha["condicao"],
        "ameaca": linha["ameaca"],
        "vd": linha["vd"],
        "recompensa_valor": int(linha["recompensa_valor"]),
        "recompensa_moeda": linha["recompensa_moeda"],
        "imagem": imagem_do_cartaz(linha),
        "imagem_foco": int(linha["imagem_foco"]),
        "status": linha["status"],
        "publicado": bool(linha["publicado"]),
        "publicado_em": linha["publicado_em"].isoformat() if linha.get("publicado_em") else None,
        "atualizado_em": linha["atualizado_em"].isoformat() if linha.get("atualizado_em") else None,
        "cacadores": [
            {"personagem_id": str(c["personagem_id"]), "nome": c["nome"], "meu": bool(c.get("meu"))}
            for c in cacadores
        ],
        "pagamento": (
            {
                "moeda": pagamento.get("moeda"),
                "total": int(pagamento.get("total") or 0),
                "em": pagamento.get("em"),
                "personagens": [
                    {"id": str(p.get("id")), "nome": p.get("nome"), "valor": int(p.get("valor") or 0)}
                    for p in pagamento.get("personagens") or []
                ],
            }
            if pagamento
            else None
        ),
    }
    if gestor:
        cartaz["notas_mestre"] = linha["notas_mestre"]
        cartaz["imagem_id"] = str(linha["imagem_id"]) if linha.get("imagem_id") else None
    return cartaz


def ordenar(cartazes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Abertos primeiro (o mais novo em cima); depois os encerrados, também do mais novo."""
    por_data = sorted(
        cartazes,
        key=lambda cartaz: cartaz.get("publicado_em") or cartaz.get("atualizado_em") or "",
        reverse=True,
    )
    return sorted(por_data, key=lambda cartaz: 0 if cartaz["status"] == "aberto" else 1)


def pode_ler_imagem(connection, item_id: UUID, usuario_id: UUID) -> bool:
    """A imagem de um cartaz publicado vale para quem é membro ativo da campanha dele."""
    return bool(
        connection.execute(
            """
            SELECT 1
            FROM procurados p
            JOIN campanhas c ON c.id = p.campanha_id AND c.status = 'ativa'
            JOIN membros_campanha m ON m.campanha_id = p.campanha_id AND m.usuario_id = %s AND m.status = 'ativo'
            WHERE p.imagem_id = %s AND p.publicado
            LIMIT 1
            """,
            (usuario_id, item_id),
        ).fetchone()
    )
