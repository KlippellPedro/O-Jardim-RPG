"""Acervo do Mestre: guarda os pedaços de cada imagem e confere o que chega.

O navegador faz o trabalho pesado: decodifica a imagem, corta em ladrilhos de
1024 px (e numa versão em 1/4 do tamanho para o zoom de longe), gera a
miniatura e sobe cada pedaço num pedido próprio. Assim nenhum envio passa de
alguns megabytes, seja qual for o limite do proxy na frente do servidor.

Chaves dos pedaços:

- ``mini``: miniatura para a lista do acervo;
- ``n0/<coluna>/<linha>``: ladrilho no tamanho cheio;
- ``n2/<coluna>/<linha>``: ladrilho da versão em 1/4 (só em imagem grande).

O lugar onde os bytes moram fica atrás de `salvar`, `ler` e `apagar_item`. Hoje
é o próprio Postgres (`acervo_arquivos`); trocar por um armazenamento S3 (o
Cloudflare R2 ou o Object Storage da Discloud) é trocar só estas funções.
"""

from __future__ import annotations

import math
import re

LADO_LADRILHO = 1024
#: Acima disto (em qualquer lado) a imagem ganha também a versão em 1/4.
LIMIAR_NIVEL_REDUZIDO = 2048
MAIOR_LADO = 32768
TAMANHO_MAXIMO_PEDACO = 6 * 1024 * 1024
TIPOS = ("mapa", "token", "objeto")
#: Com que licença a imagem pode ser usada: própria, CC0, CC BY, CC BY-SA, uso pessoal (sem
#: redistribuir), comprada (licença do vendedor) ou desconhecida.
LICENCAS = ("propria", "cc0", "cc-by", "cc-by-sa", "uso-pessoal", "comprada", "desconhecida")
MIMES = {"image/webp", "image/png", "image/jpeg"}
CHAVE = re.compile(r"^(mini|n0/\d{1,3}/\d{1,3}|n2/\d{1,3}/\d{1,3})$")
#: Assinaturas dos formatos aceitos: o tipo declarado precisa bater com os bytes.
ASSINATURAS = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
}


class ErroAcervo(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


def nome_limpo(valor, limite: int, campo: str) -> str:
    texto = " ".join(str(valor or "").replace("/", " ").replace("\\", " ").split())
    if not texto:
        raise ErroAcervo(f"{campo} e obrigatorio")
    return texto[:limite]


def etiquetas_limpas(valor) -> list[str]:
    if valor is None:
        return []
    if not isinstance(valor, list):
        raise ErroAcervo("etiquetas invalidas")
    vistas: list[str] = []
    for item in valor[:20]:
        texto = " ".join(str(item or "").split()).lower()[:30]
        if texto and texto not in vistas:
            vistas.append(texto)
    return vistas


def chaves_esperadas(largura: int, altura: int) -> list[str]:
    """Todos os pedaços que uma imagem destas dimensões precisa ter."""
    if not (1 <= largura <= MAIOR_LADO and 1 <= altura <= MAIOR_LADO):
        raise ErroAcervo(f"a imagem precisa ter de 1 a {MAIOR_LADO} px de cada lado")
    chaves = ["mini"]
    for coluna in range(math.ceil(largura / LADO_LADRILHO)):
        for linha in range(math.ceil(altura / LADO_LADRILHO)):
            chaves.append(f"n0/{coluna}/{linha}")
    if max(largura, altura) > LIMIAR_NIVEL_REDUZIDO:
        reduzida_l = math.ceil(largura / 4)
        reduzida_a = math.ceil(altura / 4)
        for coluna in range(math.ceil(reduzida_l / LADO_LADRILHO)):
            for linha in range(math.ceil(reduzida_a / LADO_LADRILHO)):
                chaves.append(f"n2/{coluna}/{linha}")
    return chaves


def conferir_pedaco(chave: str, mime: str, dados: bytes, esperadas: list[str]) -> str:
    """Confere chave, tipo e tamanho de um pedaço antes de guardar. Devolve o tipo limpo."""
    if not CHAVE.match(chave or "") or chave not in esperadas:
        raise ErroAcervo("pedaco que esta imagem nao tem")
    tipo = (mime or "").split(";")[0].strip().lower()
    if tipo not in MIMES:
        raise ErroAcervo("o pedaco precisa ser WebP, PNG ou JPEG")
    if not dados:
        raise ErroAcervo("pedaco vazio")
    if len(dados) > TAMANHO_MAXIMO_PEDACO:
        raise ErroAcervo("pedaco grande demais", 413)
    if tipo == "image/webp":
        if not (dados[:4] == b"RIFF" and dados[8:12] == b"WEBP"):
            raise ErroAcervo("o conteudo nao e WebP")
    elif not dados.startswith(ASSINATURAS[tipo]):
        raise ErroAcervo("o conteudo nao bate com o tipo")
    return tipo


# ------------------------------------------------------------ onde mora

def salvar(connection, item_id, chave: str, mime: str, dados: bytes) -> None:
    connection.execute(
        """
        INSERT INTO acervo_arquivos (item_id, chave, mime, tamanho, dados)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (item_id, chave) DO UPDATE
        SET mime = EXCLUDED.mime, tamanho = EXCLUDED.tamanho, dados = EXCLUDED.dados,
            criado_em = CURRENT_TIMESTAMP
        """,
        (item_id, chave, mime, len(dados), dados),
    )


def ler(connection, item_id, chave: str) -> tuple[str, bytes] | None:
    linha = connection.execute(
        "SELECT mime, dados FROM acervo_arquivos WHERE item_id=%s AND chave=%s",
        (item_id, chave),
    ).fetchone()
    if not linha:
        return None
    return linha["mime"], bytes(linha["dados"])


def chaves_salvas(connection, item_id) -> dict[str, int]:
    return {
        linha["chave"]: int(linha["tamanho"])
        for linha in connection.execute(
            "SELECT chave, tamanho FROM acervo_arquivos WHERE item_id=%s", (item_id,)
        ).fetchall()
    }


def apagar_item(connection, item_id) -> None:
    # A linha do item leva os pedaços junto (ON DELETE CASCADE); no S3 seria
    # apagar os objetos com o prefixo do item.
    connection.execute("DELETE FROM acervo_arquivos WHERE item_id=%s", (item_id,))


def uso_do_dono(connection, dono_id) -> int:
    linha = connection.execute(
        "SELECT COALESCE(SUM(bytes), 0) AS total FROM acervo_itens WHERE dono_id=%s",
        (dono_id,),
    ).fetchone()
    return int(linha["total"])
