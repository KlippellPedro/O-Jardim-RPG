from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from core.character_summary import resumir_ficha
from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_current_user, get_database


router = APIRouter(prefix="/contexto", tags=["contexto"])


@router.get("")
def bootstrap_context(
    campanha_id: UUID | None = None,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Tudo que o site precisa para abrir uma página, em uma única viagem.

    Antes o navegador encadeava /auth/eu -> /campanhas -> /campanhas/{id} +
    /personagens, quatro idas ao servidor antes de desenhar qualquer coisa. Em
    conexão remota isso era a "travada" ao entrar em cada módulo.
    """
    with database.connection() as connection:
        if user.is_creator:
            campanhas = connection.execute(
                """
                SELECT c.id, c.nome, c.descricao, c.status, c.atualizado_em,
                       c.dono_id, 'mestre' AS papel, m.personagem_ativo_id
                FROM campanhas c
                LEFT JOIN membros_campanha m
                  ON m.campanha_id=c.id AND m.usuario_id=%s AND m.status='ativo'
                WHERE c.status='ativa'
                ORDER BY c.atualizado_em DESC
                """,
                (user.id,),
            ).fetchall()
        else:
            campanhas = connection.execute(
                """
                SELECT c.id, c.nome, c.descricao, c.status, c.atualizado_em,
                       c.dono_id, m.papel, m.personagem_ativo_id
                FROM campanhas c
                JOIN membros_campanha m ON m.campanha_id=c.id
                WHERE m.usuario_id=%s AND m.status='ativo' AND c.status='ativa'
                ORDER BY c.atualizado_em DESC
                """,
                (user.id,),
            ).fetchall()

        campanhas = [dict(row) for row in campanhas]
        escolhida = None
        if campanhas:
            if campanha_id is not None:
                escolhida = next(
                    (item for item in campanhas if item["id"] == campanha_id),
                    None,
                )
            escolhida = escolhida or campanhas[0]

        detalhes = None
        personagens: list[dict] = []
        nao_lidos = connection.execute(
            """
            SELECT COUNT(*) AS total FROM notificacoes
            WHERE usuario_id=%s AND lida_em IS NULL
            """,
            (user.id,),
        ).fetchone()["total"]

        if escolhida:
            acesso = campaign_access(connection, escolhida["id"], user.id)
            discord = connection.execute(
                """
                SELECT discord_guild_id, vinculado_em
                FROM campanhas_discord WHERE campanha_id=%s
                """,
                (escolhida["id"],),
            ).fetchone()
            membros = []
            if acesso.manages_content:
                membros = connection.execute(
                    """
                    SELECT u.id, u.nome_exibicao, u.email, u.papel_plataforma,
                           u.ativo, m.papel, m.status, m.entrou_em,
                           m.personagem_ativo_id
                    FROM membros_campanha m
                    JOIN usuarios u ON u.id=m.usuario_id
                    WHERE m.campanha_id=%s AND m.status='ativo'
                    ORDER BY m.papel, u.nome_exibicao
                    """,
                    (escolhida["id"],),
                ).fetchall()
                personagens = connection.execute(
                    """
                    SELECT p.id, p.campanha_id, p.dono_usuario_id, p.nome,
                           p.ficha, p.versao, p.economia_versao, p.status,
                           p.atualizado_em, u.nome_exibicao AS dono_nome
                    -- ficha completa fica fora da resposta; ver resumir_ficha
                    FROM personagens p
                    LEFT JOIN usuarios u ON u.id=p.dono_usuario_id
                    WHERE p.campanha_id=%s AND p.status='ativo'
                    ORDER BY p.nome
                    """,
                    (escolhida["id"],),
                ).fetchall()
            else:
                personagens = connection.execute(
                    """
                    SELECT p.id, p.campanha_id, p.dono_usuario_id, p.nome,
                           p.ficha, p.versao, p.economia_versao, p.status,
                           p.atualizado_em, u.nome_exibicao AS dono_nome
                    -- ficha completa fica fora da resposta; ver resumir_ficha
                    FROM personagens p
                    LEFT JOIN usuarios u ON u.id=p.dono_usuario_id
                    WHERE p.campanha_id=%s AND p.dono_usuario_id=%s
                      AND p.status='ativo'
                    ORDER BY p.nome
                    """,
                    (escolhida["id"], user.id),
                ).fetchall()
            detalhes = {
                "meu_papel": acesso.role,
                "discord": dict(discord) if discord else None,
                "membros": [dict(row) for row in membros],
            }
            # A ficha inteira (até 1 MB por personagem) não sai daqui: o painel
            # do mestre só precisa do resumo. Quem edita a ficha é o módulo
            # Ficha, que a busca em /personagens.
            resumidos = []
            for row in personagens:
                item = dict(row)
                item["resumo"] = resumir_ficha(item.pop("ficha", None))
                resumidos.append(item)
            personagens = resumidos

    return {
        "usuario": {
            "id": user.id,
            "email": user.email,
            "nome_exibicao": user.nome_exibicao,
            "admin_plataforma": user.admin_plataforma,
            "papel_plataforma": user.papel_plataforma,
            "senha_provisoria": user.senha_provisoria,
        },
        "campanhas": campanhas,
        "campanha": escolhida,
        "detalhes": detalhes,
        "personagens": personagens,
        "avisos_nao_lidos": int(nao_lidos),
    }
