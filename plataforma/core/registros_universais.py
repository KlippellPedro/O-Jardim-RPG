"""Registros Universais editáveis pelo Mestre (por campanha).

O site traz registros de fábrica (criaturas, facções, artefatos, seres e locais
da lore). O Mestre pode:

- editar qualquer registro de fábrica (vira um "ajuste" guardado aqui, por `origem_id`);
- criar registros próprios (personagens, glossário, rumores, criaturas novas...);
- escolher quanto os jogadores enxergam: `oculto` (nem sabem), `rasurado` (sabem que
  existe, sem texto) ou `aberto`.

O texto de um registro que não está `aberto` nunca sai do servidor para jogador.
Módulo puro: sem banco e sem HTTP.
"""

from __future__ import annotations

SECOES = ("bestiario", "seres", "faccoes", "locais", "artefatos", "personagens", "glossario", "rumores")
REVELACOES = ("oculto", "rasurado", "aberto")

MAX_REGISTROS_POR_CAMPANHA = 600
MAX_CAMPOS = 20
MAX_BLOCOS = 12
MAX_ITENS = 30
MAX_ETIQUETAS = 8


class ErroRegistro(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def _texto(valor, limite: int) -> str:
    return " ".join(str(valor or "").split())[:limite]


def _texto_longo(valor, limite: int) -> str:
    """Mantém as quebras de linha (parágrafos), só limpa o excesso de espaço em cada linha."""
    linhas = [" ".join(linha.split()) for linha in str(valor or "").replace("\r\n", "\n").split("\n")]
    texto = "\n".join(linhas).strip()
    while "\n\n\n" in texto:
        texto = texto.replace("\n\n\n", "\n\n")
    return texto[:limite]


def normalizar_dados(dados) -> dict:
    """Só guarda campos conhecidos, com tamanho limitado. Campo ausente fica de fora (não sobrescreve)."""
    if not isinstance(dados, dict):
        raise ErroRegistro("dados invalidos")
    limpo: dict = {}
    if "titulo" in dados:
        titulo = _texto(dados["titulo"], 120)
        if not titulo:
            raise ErroRegistro("o titulo nao pode ficar vazio")
        limpo["titulo"] = titulo
    if "subtitulo" in dados:
        limpo["subtitulo"] = _texto(dados["subtitulo"], 160)
    if "descricao" in dados:
        limpo["descricao"] = _texto_longo(dados["descricao"], 6000)
    if "campos" in dados:
        bruto = dados["campos"] if isinstance(dados["campos"], list) else []
        campos = []
        for item in bruto[:MAX_CAMPOS]:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                rotulo, valor = _texto(item[0], 40), _texto(item[1], 300)
                if rotulo and valor:
                    campos.append([rotulo, valor])
        limpo["campos"] = campos
    if "blocos" in dados:
        bruto = dados["blocos"] if isinstance(dados["blocos"], list) else []
        blocos = []
        for bloco in bruto[:MAX_BLOCOS]:
            if not isinstance(bloco, dict):
                continue
            titulo = _texto(bloco.get("titulo"), 60)
            itens = [_texto(item, 400) for item in (bloco.get("itens") if isinstance(bloco.get("itens"), list) else [])[:MAX_ITENS]]
            itens = [item for item in itens if item]
            if titulo and itens:
                blocos.append({"titulo": titulo, "itens": itens})
        limpo["blocos"] = blocos
    if "etiquetas" in dados:
        bruto = dados["etiquetas"] if isinstance(dados["etiquetas"], list) else []
        limpo["etiquetas"] = [etiqueta for etiqueta in (_texto(item, 30) for item in bruto[:MAX_ETIQUETAS]) if etiqueta]
    return limpo


def validar_secao(secao) -> str:
    if secao not in SECOES:
        raise ErroRegistro("secao invalida")
    return secao


def validar_revelacao(revelacao) -> str:
    if revelacao not in REVELACOES:
        raise ErroRegistro("revelacao invalida")
    return revelacao


def secoes_ocultas(configuracoes) -> set[str]:
    """Seções que o criador escondeu dos jogadores (a página inteira escondida esconde todas)."""
    config = configuracoes if isinstance(configuracoes, dict) else {}
    if config.get("registros_universais_ocultos") is True:
        return set(SECOES)
    bruto = config.get("registros_universais_secoes_ocultas")
    return {secao for secao in bruto if secao in SECOES} if isinstance(bruto, list) else set()


def visao(linha: dict, *, gestor: bool) -> dict | None:
    """O registro como o papel enxerga; `None` quando o jogador nem deve saber que ele existe."""
    revelacao = linha.get("revelacao", "aberto")
    base = {
        "id": str(linha["id"]),
        "secao": linha["secao"],
        "origem_id": linha.get("origem_id"),
        "revelacao": revelacao,
    }
    if gestor or revelacao == "aberto":
        return {**base, "dados": linha.get("dados") or {}}
    if revelacao == "rasurado":
        return {**base, "dados": {}}
    return None
