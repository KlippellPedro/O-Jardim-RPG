"""Livro da Verdade: o que a campanha descobre quando uma lenda cai.

São 28 criaturas lendárias do Bestiário (as que têm "Se X cair" na ficha). Quando
uma delas chega a 0 de Vida na Sessão, o servidor grava a queda em
`campanha_lendas` e, na primeira vez em que ela cai naquela campanha:

- abre a página da lenda no Livro da Verdade (até lá a mesa só vê rasura);
- põe a consequência no calendário do mundo, como acontecimento aberto no dia de hoje;
- aplica os `efeitos` da lenda, quando ela tem: estação forçada no calendário (e no Jornalista, que
  muda o loot sazonal) e ajuste de preço na Loja do site, por alguns meses;
- avisa a mesa no site e o Jornalista publica a manchete no Discord;
- e, em toda queda, os personagens que estavam na mesa ganham o selo "Matador de ...".

O texto de cada lenda mora em data/bestiario/lendas-v1.json, que só o servidor
lê: o navegador nunca o importa, porque o texto de uma lenda que ainda está de
pé é segredo da mesa (tools/browser-content-boundary.ts barra o arquivo).

Nada aqui derruba a ação principal: quem chama usa `registrar_queda_sem_quebrar`,
que roda dentro de um savepoint.
"""

from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID, uuid4

from psycopg.types.json import Jsonb

from core import calendario as regras_calendario
from core.conquistas import carregar_lendas, chave_do_selo
from core.deidades import eh_deidade
from core.discord_avisos import avisar_discord
from core.notifications import campaign_member_ids, notify

log = logging.getLogger("jardim-plataforma")

TIPO_QUEDA = "queda"
TIPO_DEIDADE = "encontro_deidade"


def todas() -> list[dict]:
    """As lendas na ordem do Livro: da mais fraca para a mais forte."""
    return sorted(carregar_lendas(), key=lambda lenda: (lenda.get("vd") or 0, lenda["nome"]))


def por_id() -> dict[str, dict]:
    return {lenda["id"]: lenda for lenda in carregar_lendas()}


def eh_lenda(monstro_id: str | None) -> bool:
    return bool(monstro_id) and str(monstro_id) in por_id()


def _nome_completo(lenda: dict) -> str:
    return f"{lenda['nome']}, {lenda['epiteto']}"


# ------------------------------------------------------------------ quem estava lá

def grupo_da_sessao(connection, sessao_id: UUID) -> list[dict]:
    """Personagens de jogador que estão na cena. É o "grupo" de quem credita a queda."""
    linhas = connection.execute(
        """
        SELECT DISTINCT p.id, p.nome
        FROM sessao_participantes sp
        JOIN personagens p ON p.id = sp.personagem_id
        WHERE sp.sessao_id=%s AND sp.tipo='jogador' AND sp.personagem_id IS NOT NULL
        ORDER BY p.nome
        """,
        (sessao_id,),
    ).fetchall()
    return [{"id": str(linha["id"]), "nome": linha["nome"]} for linha in linhas]


def grupo_da_campanha(connection, campanha_id: UUID) -> list[dict]:
    """Sem sessão à mão, o grupo são os personagens ativos dos jogadores da mesa."""
    linhas = connection.execute(
        """
        SELECT p.id, p.nome
        FROM membros_campanha m
        JOIN personagens p ON p.id = m.personagem_ativo_id AND p.status='ativo'
        WHERE m.campanha_id=%s AND m.status='ativo' AND m.papel='jogador'
        ORDER BY p.nome
        """,
        (campanha_id,),
    ).fetchall()
    return [{"id": str(linha["id"]), "nome": linha["nome"]} for linha in linhas]


# ------------------------------------------------------------------ calendário

def _sincronizar_estacao(connection, campanha_id: UUID, antes: str, estado: dict) -> None:
    """A estação forçada por uma lenda também vale para o loot sazonal do Jornalista (se houver servidor ligado)."""
    if regras_calendario.estacao_atual(estado) == antes:
        return
    try:
        from routers.calendario import _sincronizar_discord  # import tardio: o roteador importa este módulo

        _sincronizar_discord(connection, campanha_id, antes, estado)
    except Exception:  # noqa: BLE001 - o espelho no Discord é cortesia
        log.exception("Falha ao sincronizar a estação da campanha %s depois da queda de uma lenda", campanha_id)


def _marcar_no_calendario(connection, campanha_id: UUID, lenda: dict) -> str | None:
    """A consequência vira acontecimento aberto no dia de hoje, e os efeitos da lenda entram no mundo.
    Devolve o id do evento."""
    linha = connection.execute(
        "SELECT estado FROM campanha_calendario WHERE campanha_id=%s FOR UPDATE", (campanha_id,)
    ).fetchone()
    estado = regras_calendario.completar(linha["estado"] if linha else None)
    estacao_antes = regras_calendario.estacao_atual(estado)
    hoje = estado["hoje"]
    for efeito in lenda.get("efeitos") or []:
        regras_calendario.adicionar_efeito(estado, {**efeito, "origem": lenda["id"]})
    try:
        evento = regras_calendario.adicionar_evento(
            estado,
            {
                "titulo": lenda["calendario"]["titulo"],
                "nota": lenda["calendario"]["nota"],
                "mes": hoje["mes"],
                "dia": hoje["dia"],
                "ano": hoje["ano"],
                "repeticao": "unico",
                "duracao": 1,
                "revelacao": "aberto",
            },
        )
    except regras_calendario.ErroCalendario:
        # Calendário cheio ou data estranha: a queda vale mesmo sem o marco (os efeitos já entraram).
        evento = None
    connection.execute(
        """
        INSERT INTO campanha_calendario (campanha_id, estado) VALUES (%s, %s)
        ON CONFLICT (campanha_id) DO UPDATE SET estado=EXCLUDED.estado, atualizado_em=CURRENT_TIMESTAMP
        """,
        (campanha_id, Jsonb(estado)),
    )
    _sincronizar_estacao(connection, campanha_id, estacao_antes, estado)
    return evento["id"] if evento else None


def _tirar_do_calendario(connection, campanha_id: UUID, evento_ids: list[str], origem: str | None = None) -> None:
    """Tira os marcos e, com `origem`, os efeitos que aquela lenda deixou no mundo."""
    if not evento_ids and not origem:
        return
    linha = connection.execute(
        "SELECT estado FROM campanha_calendario WHERE campanha_id=%s FOR UPDATE", (campanha_id,)
    ).fetchone()
    if not linha:
        return
    estado = regras_calendario.completar(linha["estado"])
    estacao_antes = regras_calendario.estacao_atual(estado)
    estado["eventos"] = [evento for evento in estado["eventos"] if evento.get("id") not in set(evento_ids)]
    if origem:
        regras_calendario.remover_efeitos_da_origem(estado, origem)
    connection.execute(
        "UPDATE campanha_calendario SET estado=%s, atualizado_em=CURRENT_TIMESTAMP WHERE campanha_id=%s",
        (Jsonb(estado), campanha_id),
    )
    _sincronizar_estacao(connection, campanha_id, estacao_antes, estado)


# ------------------------------------------------------------------ queda

def _texto_da_manchete(lenda: dict, grupo: list[dict]) -> str:
    linhas = [
        "🗞️ **EXTRA NO JARDIM**",
        f"**{lenda['manchete']}**",
        lenda["consequencia"],
    ]
    linhas.extend(f"📌 {efeito['texto']}" for efeito in lenda.get("efeitos") or [] if efeito.get("texto"))
    if grupo:
        nomes = [item["nome"] for item in grupo]
        quem = nomes[0] if len(nomes) == 1 else ", ".join(nomes[:-1]) + " e " + nomes[-1]
        linhas.append(f"Estavam lá: {quem}.")
    return "\n".join(linhas)


def registrar_queda(
    connection,
    *,
    campanha_id: UUID,
    monstro_id: str | None,
    sessao_id: UUID | None = None,
    participante_id: UUID | None = None,
    grupo: list[dict] | None = None,
    ator_id: UUID | None = None,
) -> dict | None:
    """Grava a queda de uma lenda. Devolve None quando não há nada novo a registrar.

    `primeira` diz se foi a primeira queda dessa lenda na campanha: só ela mexe no
    calendário e vira manchete. Quedas seguintes (a criatura voltou à cena numa
    sessão nova) só creditam o selo a quem estava na mesa."""
    lenda = por_id().get(str(monstro_id or ""))
    if not lenda:
        return None
    if grupo is None:
        grupo = grupo_da_sessao(connection, sessao_id) if sessao_id else grupo_da_campanha(connection, campanha_id)
    ja_caiu = connection.execute(
        "SELECT 1 FROM campanha_lendas WHERE campanha_id=%s AND monstro_id=%s AND tipo=%s LIMIT 1",
        (campanha_id, lenda["id"], TIPO_QUEDA),
    ).fetchone()
    inserida = connection.execute(
        """
        INSERT INTO campanha_lendas (id, campanha_id, sessao_id, participante_id, monstro_id, tipo, personagens)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (sessao_id, monstro_id, tipo) WHERE sessao_id IS NOT NULL DO NOTHING
        RETURNING id
        """,
        (uuid4(), campanha_id, sessao_id, participante_id, lenda["id"], TIPO_QUEDA, Jsonb(grupo)),
    ).fetchone()
    if not inserida:
        return None
    primeira = not ja_caiu
    if primeira:
        evento_id = _marcar_no_calendario(connection, campanha_id, lenda)
        if evento_id:
            connection.execute("UPDATE campanha_lendas SET evento_calendario_id=%s WHERE id=%s", (evento_id, inserida["id"]))
        try:
            notify(
                connection,
                user_ids=campaign_member_ids(connection, campanha_id),
                category="campanha",
                title=f"{lenda['nome']} caiu",
                message=lenda["consequencia"],
                campaign_id=campanha_id,
                actor_user_id=ator_id,
                include_actor=True,
            )
        except Exception:  # noqa: BLE001 - aviso é cortesia
            log.exception("Falha ao avisar a mesa da queda de %s (campanha %s)", lenda["id"], campanha_id)
        avisar_discord(connection, campanha_id, "manchete", _texto_da_manchete(lenda, grupo))
    return {
        "id": lenda["id"],
        "nome": lenda["nome"],
        "epiteto": lenda["epiteto"],
        "consequencia": lenda["consequencia"],
        "primeira": primeira,
        "grupo": grupo,
    }


def registrar_queda_sem_quebrar(connection, **dados) -> dict | None:
    """Versão para dentro da rota de dano: um erro aqui nunca desfaz o golpe que o Mestre deu."""
    try:
        with connection.transaction():
            return registrar_queda(connection, **dados)
    except Exception:  # noqa: BLE001 - o Livro é um bônus da mesa
        log.exception("Falha ao registrar a queda de uma lenda (campanha %s)", dados.get("campanha_id"))
        return None


def registrar_encontro_com_deidade(connection, *, campanha_id: UUID, sessao_id: UUID) -> int:
    """Marca as Deidades que estão na cena como encaradas pelo grupo (vale o selo "Cara a Cara")."""
    deidades = [
        linha["monstro_id"]
        for linha in connection.execute(
            "SELECT DISTINCT monstro_id FROM sessao_participantes WHERE sessao_id=%s AND monstro_id IS NOT NULL",
            (sessao_id,),
        ).fetchall()
        if eh_deidade(linha["monstro_id"])
    ]
    if not deidades:
        return 0
    grupo = grupo_da_sessao(connection, sessao_id)
    novas = 0
    for monstro_id in deidades:
        # Quem entra na cena depois de o combate começar também conta: a linha é regravada com o grupo de agora.
        linha = connection.execute(
            """
            INSERT INTO campanha_lendas (id, campanha_id, sessao_id, monstro_id, tipo, personagens)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (sessao_id, monstro_id, tipo) WHERE sessao_id IS NOT NULL
            DO UPDATE SET personagens=EXCLUDED.personagens
            RETURNING (xmax = 0) AS nova
            """,
            (uuid4(), campanha_id, sessao_id, monstro_id, TIPO_DEIDADE, Jsonb(grupo)),
        ).fetchone()
        novas += 1 if linha and linha["nova"] else 0
    return novas


def registrar_encontro_sem_quebrar(connection, **dados) -> int:
    try:
        with connection.transaction():
            return registrar_encontro_com_deidade(connection, **dados)
    except Exception:  # noqa: BLE001
        log.exception("Falha ao registrar o encontro com uma Deidade (campanha %s)", dados.get("campanha_id"))
        return 0


def da_sessao(connection, sessao_id: UUID) -> list[dict]:
    """As lendas que caíram nesta sessão, no formato que o estado ao vivo entrega."""
    mapa = por_id()
    linhas = connection.execute(
        """
        SELECT monstro_id, criada_em FROM campanha_lendas
        WHERE sessao_id=%s AND tipo=%s ORDER BY criada_em
        """,
        (sessao_id, TIPO_QUEDA),
    ).fetchall()
    return [
        {
            "id": linha["monstro_id"],
            "nome": mapa[linha["monstro_id"]]["nome"],
            "epiteto": mapa[linha["monstro_id"]]["epiteto"],
            "consequencia": mapa[linha["monstro_id"]]["consequencia"],
            "em": linha["criada_em"].isoformat(),
        }
        for linha in linhas
        if linha["monstro_id"] in mapa
    ]


# ------------------------------------------------------------------ o Livro

def livro(connection, campanha_id: UUID, *, gestor: bool) -> dict:
    """O Livro da Verdade como a campanha o enxerga.

    A mesa vê a página aberta das lendas que já caíram e, no lugar das outras,
    só uma página rasurada sem nome, sem número e sem pista. O Mestre vê tudo,
    com o estado de cada lenda."""
    caidas = {
        linha["monstro_id"]: linha
        for linha in connection.execute(
            """
            SELECT DISTINCT ON (monstro_id) monstro_id, criada_em, personagens, sessao_id
            FROM campanha_lendas
            WHERE campanha_id=%s AND tipo=%s
            ORDER BY monstro_id, criada_em
            """,
            (campanha_id, TIPO_QUEDA),
        ).fetchall()
    }
    titulos = {
        linha["id"]: linha["titulo"]
        for linha in connection.execute(
            "SELECT id, titulo FROM sessoes_mesa WHERE campanha_id=%s", (campanha_id,)
        ).fetchall()
    }
    abertas: list[dict] = []
    for lenda in todas():
        linha = caidas.get(lenda["id"])
        if linha is None:
            continue
        abertas.append(
            {
                "id": lenda["id"],
                "caida": True,
                "nome": lenda["nome"],
                "epiteto": lenda["epiteto"],
                "verdade": lenda["verdade"],
                "consequencia": lenda["consequencia"],
                "efeitos": [efeito["texto"] for efeito in lenda.get("efeitos") or [] if efeito.get("texto")],
                "caiu_em": linha["criada_em"].isoformat() if isinstance(linha["criada_em"], datetime) else None,
                "sessao": titulos.get(linha["sessao_id"]) or None,
                "por": [item.get("nome") for item in (linha["personagens"] or []) if isinstance(item, dict) and item.get("nome")],
            }
        )
    abertas.sort(key=lambda item: item["caiu_em"] or "")
    total = len(carregar_lendas())
    resposta: dict = {"total": total, "caidas": len(abertas), "gestor": gestor}
    if gestor:
        em_pe = [
            {
                "id": lenda["id"],
                "caida": False,
                "nome": lenda["nome"],
                "epiteto": lenda["epiteto"],
                "vd": lenda["vd"],
                "verdade": lenda["verdade"],
                "consequencia": lenda["consequencia"],
                "efeitos": [efeito["texto"] for efeito in lenda.get("efeitos") or [] if efeito.get("texto")],
            }
            for lenda in todas()
            if lenda["id"] not in caidas
        ]
        resposta["entradas"] = abertas + em_pe
    else:
        resposta["entradas"] = abertas + [
            {"id": f"retida-{indice}", "caida": False, "retida": True}
            for indice in range(total - len(abertas))
        ]
    return resposta


def desfazer_queda(connection, campanha_id: UUID, monstro_id: str) -> int:
    """Tira a queda do Livro (Mestre errou o dano, por exemplo): some a página, o marco do
    calendário e o selo de quem foi creditado. A manchete já publicada não volta atrás."""
    if monstro_id not in por_id():
        return 0
    linhas = connection.execute(
        """
        DELETE FROM campanha_lendas
        WHERE campanha_id=%s AND monstro_id=%s AND tipo=%s
        RETURNING personagens, evento_calendario_id
        """,
        (campanha_id, monstro_id, TIPO_QUEDA),
    ).fetchall()
    if not linhas:
        return 0
    _tirar_do_calendario(
        connection, campanha_id, [linha["evento_calendario_id"] for linha in linhas if linha["evento_calendario_id"]], origem=monstro_id,
    )
    chave = chave_do_selo(monstro_id)
    ids = {item["id"] for linha in linhas for item in (linha["personagens"] or []) if isinstance(item, dict) and item.get("id")}
    for personagem_id in ids:
        connection.execute(
            "DELETE FROM personagem_conquistas WHERE personagem_id=%s AND chave=%s",
            (personagem_id, chave),
        )
    return len(linhas)
