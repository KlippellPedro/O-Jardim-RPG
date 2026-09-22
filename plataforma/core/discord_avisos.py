"""Avisos da mesa para o Discord.

O Jornalista já publica no servidor tudo o que entra na fila `avisos_pendentes`
(o mesmo Postgres é compartilhado entre a plataforma e os bots). Então a
plataforma só coloca o texto na fila do servidor vinculado à campanha; quem
publica, com retry e canal certo, continua sendo o bot.

Cada tipo de aviso pode ser ligado ou desligado pelo Mestre em
`campanha_agenda.avisos`. A tabela da fila pertence aos bots: se ela ainda não
existe neste banco (ambiente sem bots), o aviso simplesmente não é enviado.
"""

from __future__ import annotations

import logging
from uuid import UUID

log = logging.getLogger("jardim-plataforma")

#: Padrão de cada tipo. Crítico fica desligado no Discord: rola muito e enche o canal.
AVISOS_PADRAO: dict[str, bool] = {
    "sessao": True,
    "lembrete": True,
    "liberacao": True,
    "critico": False,
    "mural": False,
}

ROTULOS_AVISO: dict[str, str] = {
    "sessao": "A sessão começou",
    "lembrete": "Lembretes de sessão (24h e 1h antes)",
    "liberacao": "O Mestre liberou algo",
    "critico": "Crítico na mesa (20 natural)",
    "mural": "Novidades do mural",
}


#: Categoria de roteamento no Jornalista (`/jornal canal`): cada uma pode ter um canal próprio.
CATEGORIA_DISCORD: dict[str, str] = {
    "sessao": "sessao",
    "lembrete": "sessao",
    "critico": "sessao",
    "liberacao": "liberacao",
    "mural": "liberacao",
}


def avisos_da_campanha(avisos_salvos) -> dict[str, bool]:
    """Mescla o que o Mestre salvou com o padrão, ignorando chave desconhecida."""
    resultado = dict(AVISOS_PADRAO)
    if isinstance(avisos_salvos, dict):
        for chave in AVISOS_PADRAO:
            if isinstance(avisos_salvos.get(chave), bool):
                resultado[chave] = avisos_salvos[chave]
    return resultado


def avisar_discord(connection, campanha_id: UUID, tipo: str, mensagem: str) -> bool:
    """Enfileira `mensagem` para o servidor do Discord da campanha. Nunca levanta."""
    if tipo not in AVISOS_PADRAO:
        return False
    try:
        # Savepoint: um problema aqui não pode desfazer a ação que o jogador acabou de fazer.
        with connection.transaction():
            linha = connection.execute(
                """
                SELECT d.discord_guild_id, a.avisos
                FROM campanhas_discord d
                LEFT JOIN campanha_agenda a ON a.campanha_id = d.campanha_id
                WHERE d.campanha_id=%s
                """,
                (campanha_id,),
            ).fetchone()
            if not linha:
                return False
            if not avisos_da_campanha(linha["avisos"])[tipo]:
                return False
            fila = connection.execute("SELECT to_regclass('avisos_pendentes') AS tabela").fetchone()
            if not fila or not fila["tabela"]:
                return False
            # A coluna `categoria` é criada pelo Jornalista; enquanto ele não
            # subir a versão nova, o aviso segue sem categoria (canal de dinheiro/principal).
            coluna = connection.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema() AND table_name='avisos_pendentes' AND column_name='categoria'
                """
            ).fetchone()
            if coluna:
                connection.execute(
                    "INSERT INTO avisos_pendentes (guild_id, mensagem, categoria) VALUES (%s, %s, %s)",
                    (linha["discord_guild_id"], mensagem[:1800], CATEGORIA_DISCORD[tipo]),
                )
            else:
                connection.execute(
                    "INSERT INTO avisos_pendentes (guild_id, mensagem) VALUES (%s, %s)",
                    (linha["discord_guild_id"], mensagem[:1800]),
                )
        return True
    except Exception:  # noqa: BLE001 - aviso é cortesia, nunca derruba a ação principal
        log.exception("Falha ao enfileirar aviso do Discord (campanha %s)", campanha_id)
        return False
