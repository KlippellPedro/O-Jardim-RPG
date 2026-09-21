"""Diário automático do personagem.

Junta o que o servidor já prova (sessões em que entrou, rolagens marcantes,
primeira vez que usou cada poder, conquistas e grandes movimentos de Lunaris)
numa linha do tempo escrita na voz do próprio personagem. Nada aqui é gravado:
o diário é calculado na hora, então nunca fica defasado. As marcas do jogador
(fixar, comentar) moram na ficha, não aqui.
"""

from __future__ import annotations

from core.conquistas import POR_CHAVE

LIMITE_EVENTOS = 400
LIMITE_LUNARIS_RELEVANTE = 500
DANO_RELEVANTE = 30


def _iso(valor) -> str:
    return valor.isoformat() if hasattr(valor, "isoformat") else str(valor)


def _numero(valor) -> str:
    return f"{int(valor):,}".replace(",", ".")


def _evento(chave: str, tipo: str, quando, texto: str, **extra) -> dict:
    return {"chave": chave, "tipo": tipo, "quando": _iso(quando), "texto": texto, **extra}


def _sessoes(connection, personagem_id) -> list[dict]:
    linhas = connection.execute(
        """
        SELECT s.id, s.titulo, s.iniciada_em, s.encerrada_em, s.rodada, s.status
        FROM sessoes_mesa s
        WHERE s.id IN (
            SELECT sessao_id FROM sessao_participantes WHERE personagem_id=%s
        )
        ORDER BY s.iniciada_em
        """,
        (personagem_id,),
    ).fetchall()
    eventos = []
    for numero, linha in enumerate(linhas, start=1):
        titulo = (linha["titulo"] or "").strip()
        nome = f"“{titulo}”" if titulo else f"a sessão {numero}"
        eventos.append(_evento(
            f"sessao:{linha['id']}",
            "sessao",
            linha["iniciada_em"],
            f"Sentei à mesa para {nome}.",
            sessao_id=str(linha["id"]),
            titulo=titulo or f"Sessão {numero}",
            encerrada=linha["status"] == "encerrada",
        ))
        if linha["status"] == "encerrada" and linha["encerrada_em"]:
            rodadas = int(linha["rodada"] or 1)
            eventos.append(_evento(
                f"sessao-fim:{linha['id']}",
                "sessao",
                linha["encerrada_em"],
                f"A noite acabou depois de {rodadas} rodada{'s' if rodadas != 1 else ''}.",
                sessao_id=str(linha["id"]),
            ))
    return eventos


def _rolagens(connection, personagem_id) -> list[dict]:
    linhas = connection.execute(
        """
        SELECT id, tipo, titulo, resultado, detalhes, criado_em, sessao_id
        FROM registros_mesa
        WHERE personagem_id=%s
          AND (
            (tipo='rolagem' AND (detalhes->>'critico_natural'='true'
                                 OR detalhes->>'falha_natural'='true'))
            OR (tipo='dano' AND resultado >= %s)
          )
        ORDER BY criado_em DESC
        LIMIT %s
        """,
        (personagem_id, DANO_RELEVANTE, LIMITE_EVENTOS),
    ).fetchall()
    eventos = []
    for linha in linhas:
        detalhes = linha["detalhes"] if isinstance(linha["detalhes"], dict) else {}
        titulo = (linha["titulo"] or "um teste").strip()
        sessao_id = str(linha["sessao_id"]) if linha["sessao_id"] else None
        if linha["tipo"] == "dano":
            texto = f"Acertei {titulo} com {int(linha['resultado'])} de dano. Ninguém esqueceu."
            tipo = "dano"
        elif detalhes.get("critico_natural"):
            texto = f"20 natural em {titulo}. Os dados estavam do meu lado."
            tipo = "critico"
        else:
            texto = f"1 natural em {titulo}. Prefiro não comentar."
            tipo = "falha"
        eventos.append(_evento(
            f"registro:{linha['id']}", tipo, linha["criado_em"], texto, sessao_id=sessao_id,
        ))
    return eventos


def _primeiros_usos(connection, personagem_id) -> list[dict]:
    linhas = connection.execute(
        """
        SELECT DISTINCT ON (tipo, lower(titulo))
               id, tipo, titulo, criado_em, sessao_id
        FROM registros_mesa
        WHERE personagem_id=%s AND tipo IN ('poder', 'habilidade', 'magia')
        ORDER BY tipo, lower(titulo), criado_em
        """,
        (personagem_id,),
    ).fetchall()
    verbos = {
        "poder": "Usei o poder",
        "habilidade": "Usei a habilidade",
        "magia": "Conjurei",
    }
    eventos = []
    for linha in linhas:
        eventos.append(_evento(
            f"uso:{linha['id']}",
            "uso",
            linha["criado_em"],
            f"{verbos[linha['tipo']]} {linha['titulo']} pela primeira vez.",
            sessao_id=str(linha["sessao_id"]) if linha["sessao_id"] else None,
        ))
    return eventos


def _conquistas(connection, personagem_id) -> list[dict]:
    linhas = connection.execute(
        "SELECT chave, desbloqueada_em FROM personagem_conquistas WHERE personagem_id=%s",
        (personagem_id,),
    ).fetchall()
    eventos = []
    for linha in linhas:
        conquista = POR_CHAVE.get(linha["chave"])
        if not conquista:
            continue
        eventos.append(_evento(
            f"conquista:{conquista.chave}",
            "conquista",
            linha["desbloqueada_em"],
            f"Ganhei o selo {conquista.nome}: {conquista.descricao.rstrip('.').lower()}.",
            raridade=conquista.raridade,
        ))
    return eventos


def _dinheiro(connection, personagem_id) -> list[dict]:
    linhas = connection.execute(
        """
        SELECT id, delta, motivo, criado_em
        FROM lancamentos_economia
        WHERE personagem_id=%s AND lower(moeda)='lunaris' AND abs(delta) >= %s
        ORDER BY criado_em DESC
        LIMIT %s
        """,
        (personagem_id, LIMITE_LUNARIS_RELEVANTE, LIMITE_EVENTOS),
    ).fetchall()
    eventos = []
    for linha in linhas:
        valor = _numero(abs(linha["delta"]))
        motivo = (linha["motivo"] or "").strip().rstrip(".")
        if linha["delta"] > 0:
            texto = f"Recebi {valor} Lunaris" + (f" ({motivo.lower()})." if motivo else ".")
            tipo = "ganho"
        else:
            texto = f"Gastei {valor} Lunaris" + (f" ({motivo.lower()})." if motivo else ".")
            tipo = "gasto"
        eventos.append(_evento(f"lancamento:{linha['id']}", tipo, linha["criado_em"], texto))
    return eventos


def montar(connection, personagem_id) -> dict:
    """Linha do tempo do personagem, da mais recente para a mais antiga."""
    eventos = [
        *_sessoes(connection, personagem_id),
        *_rolagens(connection, personagem_id),
        *_primeiros_usos(connection, personagem_id),
        *_conquistas(connection, personagem_id),
        *_dinheiro(connection, personagem_id),
    ]
    eventos.sort(key=lambda evento: evento["quando"], reverse=True)
    return {"eventos": eventos[:LIMITE_EVENTOS], "total": len(eventos)}
