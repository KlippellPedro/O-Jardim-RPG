from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb

from core.audit import record_audit
from core.character_summary import iniciativa_fixa, sabedoria_desempate
from core.deidades import para_o_bestiario as deidades_do_bestiario
from core.fases import fase_alcancada, fases_do_catalogo, fases_limpas
from core import lendas as livro_da_verdade
from core.progressao_niveis import xp_por_vd
from core.combate_intenso import CANSACO_MAXIMO, encerrar_combate_e_cansar, iniciar_marcas, registrar_minimos
from core.condicoes import decrementar_condicoes, normalizar_condicoes
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_campaign_manager,
    require_csrf,
)
from core import live_session
from core.mesa_eventos import registrar as registrar_evento
from core.discord_avisos import avisar_discord
from core.loot_criaturas import (
    ajustes_da_campanha,
    eh_sob_medida,
    resumo_da_tabela,
    rolar_loot,
    tabela_da_criatura,
    tabela_efetiva,
    tem_loot,
)
from core.notifications import campaign_member_ids, character_owner_ids, notify
from routers.shop import (
    _any_active_character,
    _resolved_catalog_rows,
    conceder_itens_do_catalogo,
    creditar_carteira,
)
from schemas import (
    DistributeXpInput,
    GrantXpInput,
    ParticipantCreateInput,
    LootTableInput,
    ParticipantAfflictionInput,
    ParticipantLootDeliverInput,
    ParticipantLootRollInput,
    ParticipantReorderInput,
    ParticipantUpdateInput,
    SessionCharactersInput,
    SessionOpenInput,
    SessionTurnInput,
)


router = APIRouter(prefix="/sessao", tags=["sessao-ao-vivo"])

# Faixas usadas quando o mestre esconde os números do monstro. O jogador vê o
# estado sem conseguir calcular quantos pontos faltam para derrubá-lo.
_ESTADOS_VIDA = (
    (1.0, "Ileso"),
    (0.75, "Arranhado"),
    (0.5, "Ferido"),
    (0.25, "Muito ferido"),
    (0.0001, "Quase morto"),
)


_NOME_GENERICO_POR_TIPO = {
    "inimigo": "Inimigo Desconhecido",
    "aliado": "Aliado Desconhecido",
    "jogador": "Alguém Desconhecido",
}


def _inteiro_do_catalogo(valor) -> int | None:
    """Alguns itens antigos do catálogo guardam pv/defesa como texto ("120")
    em vez de número; aceita os dois formatos sem quebrar."""
    if valor is None:
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _estado_da_vida(atual: int, maximo: int) -> str:
    if maximo <= 0:
        return "Sem ferimentos registrados"
    if atual <= 0:
        return "Fora de combate"
    proporcao = atual / maximo
    for limite, rotulo in _ESTADOS_VIDA:
        if proporcao >= limite:
            return rotulo
    return "Quase morto"


def _sessao_ativa(connection, campaign_id: UUID):
    return connection.execute(
        """
        SELECT id, campanha_id, titulo, status, rodada, turno_indice,
               em_combate, versao, aberta_por, iniciada_em
        FROM sessoes_mesa
        WHERE campanha_id=%s AND status IN ('preparacao', 'aberta')
        """,
        (campaign_id,),
    ).fetchone()


def _temporarios_da_ficha(ficha) -> tuple[int, int]:
    """Extra acima do máximo (vida, mana) guardado na ficha; nunca negativo."""
    status_ficha = ficha.get("status") if isinstance(ficha, dict) and isinstance(ficha.get("status"), dict) else {}

    def extra(chave: str) -> int:
        valor = status_ficha.get(chave)
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            return 0
        return max(0, int(valor))

    return extra("vidaTemporaria"), extra("manaTemporaria")


def _estamina_da_ficha(ficha) -> tuple[int | None, int | None, int]:
    """(máxima, atual, extra) de Estamina guardados na ficha. Ficha que ainda
    não calculou a Estamina devolve máxima None: o participante fica sem barra
    até o dono abrir a ficha, em vez de aparecer com 0 de 0."""
    derivados = ficha.get("derivados") if isinstance(ficha, dict) and isinstance(ficha.get("derivados"), dict) else {}
    status_ficha = ficha.get("status") if isinstance(ficha, dict) and isinstance(ficha.get("status"), dict) else {}

    def inteiro(valor) -> int | None:
        return int(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else None

    maxima = inteiro(derivados.get("estamina"))
    if maxima is None:
        return None, None, 0
    maxima = max(0, maxima)
    atual = inteiro(status_ficha.get("estaminaAtual"))
    atual = maxima if atual is None else max(0, min(atual, maxima))
    extra = inteiro(status_ficha.get("estaminaTemporaria"))
    return maxima, atual, max(0, extra or 0)


def _avisar_fichas_alteradas(campanha_id: UUID, fichas: list[dict]) -> None:
    """Publica `personagem_atualizado` para cada ficha que o servidor mexeu por
    conta própria (HUD do Mestre, Cansaço do combate). É o evento que a ficha
    aberta escuta para buscar a versão nova."""
    for item in fichas:
        live_session.publicar(
            campanha_id,
            "personagem_atualizado",
            int(item["versao"]),
            {"personagem_id": str(item["personagem_id"])},
        )


def _participantes(connection, sessao_id: UUID):
    return connection.execute(
        """
        SELECT id, personagem_id, nome, tipo, iniciativa, vida_atual,
               vida_maxima, condicoes, anotacao, visibilidade, ordem, defesa,
               mana_atual, mana_maxima, ataques, vd, pericias,
               vida_temporaria, mana_temporaria,
               estamina_atual, estamina_maxima, estamina_temporaria,
               monstro_id, loot, fase,
               (SELECT p.ficha->'aflicoesAtivas' FROM personagens p
                WHERE p.id=sessao_participantes.personagem_id) AS aflicoes
        FROM sessao_participantes
        WHERE sessao_id=%s
        ORDER BY ordem, iniciativa DESC, nome
        """,
        (sessao_id,),
    ).fetchall()


def _aflicoes_da_ficha(valor) -> list[dict]:
    """Só o que o card da Sessão precisa: qual aflição e em que estágio."""
    if not isinstance(valor, list):
        return []
    saida = []
    for item in valor[:20]:
        if not isinstance(item, dict) or not isinstance(item.get("aflicaoId"), str):
            continue
        estagio = item.get("estagio")
        saida.append({
            "aflicao_id": item["aflicaoId"][:80],
            "estagio": int(estagio) if isinstance(estagio, (int, float)) and not isinstance(estagio, bool) else 1,
            "incubando": item.get("incubando") is True,
        })
    return saida


def _tocar(connection, sessao_id: UUID) -> int:
    """Sobe a versão da sessão — é o que os clientes usam para detectar mudança."""
    row = connection.execute(
        """
        UPDATE sessoes_mesa
        SET versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
        WHERE id=%s RETURNING versao
        """,
        (sessao_id,),
    ).fetchone()
    return int(row["versao"])


def _montar_estado(connection, sessao, papel: str, usuario_id: UUID) -> dict:
    """Recorta o estado conforme quem está olhando."""
    manda = papel in {"mestre", "assistente"}
    linhas = _participantes(connection, sessao["id"])

    meus_personagens = {
        row["id"]
        for row in connection.execute(
            """
            SELECT id FROM personagens
            WHERE campanha_id=%s AND dono_usuario_id=%s AND status='ativo'
            """,
            (sessao["campanha_id"], usuario_id),
        ).fetchall()
    }

    ajustes_loot = ajustes_da_campanha(connection, sessao["campanha_id"]) if manda else {}
    fases_por_criatura = fases_do_catalogo(connection, (linha["monstro_id"] for linha in linhas))
    participantes = []
    for indice, linha in enumerate(linhas):
        item = dict(linha)
        proprio = item["personagem_id"] in meus_personagens
        nivel = item["visibilidade"]
        # Quatro degraus, do mais fechado ao mais aberto:
        #   oculto       nem entra na lista
        #   desconhecido entra, mas sem nome nem número — a emboscada clássica
        #   parcial      nome e estado qualitativo ("Ferido"), sem número
        #   total        tudo, inclusive o número exato de Vida
        # Quem comanda a mesa e o dono do personagem sempre veem tudo, não
        # importa o degrau — o segredo é só entre o mestre e o resto da mesa.
        revela_tudo = manda or proprio
        if not revela_tudo and nivel == "oculto":
            continue

        mostra_identidade = revela_tudo or nivel in ("parcial", "total")
        mostra_numero = revela_tudo or nivel == "total"

        publico = {
            "id": item["id"],
            "nome": item["nome"] if mostra_identidade else _NOME_GENERICO_POR_TIPO.get(item["tipo"], "Desconhecido"),
            "tipo": item["tipo"],
            "iniciativa": item["iniciativa"],
            "condicoes": normalizar_condicoes(item["condicoes"]) if mostra_identidade else [],
            # Aflições vivem na ficha (ficha.aflicoesAtivas); a Sessão só mostra.
            "aflicoes": _aflicoes_da_ficha(item["aflicoes"]) if mostra_identidade else [],
            "ordem": item["ordem"],
            "indice": indice,
            "e_meu": proprio,
            "visibilidade": nivel if revela_tudo else None,
        }
        if mostra_numero:
            publico["vida_atual"] = item["vida_atual"]
            publico["vida_maxima"] = item["vida_maxima"]
            publico["defesa"] = item["defesa"]
            publico["mana_atual"] = item["mana_atual"]
            publico["mana_maxima"] = item["mana_maxima"]
            publico["vida_temporaria"] = item["vida_temporaria"]
            publico["mana_temporaria"] = item["mana_temporaria"]
            publico["estamina_atual"] = item["estamina_atual"]
            publico["estamina_maxima"] = item["estamina_maxima"]
            publico["estamina_temporaria"] = item["estamina_temporaria"]
            publico["ataques"] = item["ataques"]
            publico["pericias"] = item["pericias"]
        if manda:
            publico["vd"] = item["vd"]
        if mostra_identidade:
            publico["estado_vida"] = _estado_da_vida(item["vida_atual"], item["vida_maxima"])
        fases = fases_por_criatura.get(item["monstro_id"]) or []
        fase_atual = int(item["fase"] or 1)
        if fases and mostra_identidade and fase_atual > 1:
            # A mesa ouve só a frase de cena da fase em que a criatura está.
            publico["fase"] = fase_atual
            publico["fase_anuncio"] = fases[min(fase_atual, len(fases) + 1) - 2]["anuncio"]
        if fases and manda:
            # O que muda de regra e o resumo das fases são do Mestre.
            publico["fase"] = fase_atual
            publico["fases_total"] = len(fases) + 1
            publico["fases_resumo"] = [{"nome": "Começo", "quando": None}] + [{"nome": f["nome"], "quando": f["quando"]} for f in fases]
            if fase_atual > 1:
                atual_da_fase = fases[min(fase_atual, len(fases) + 1) - 2]
                publico["fase_nome"] = atual_da_fase["nome"]
                publico["fase_mudancas"] = atual_da_fase["mudancas"]
        # O id da ficha abre o atalho "Abrir ficha": vai para quem comanda e
        # para o dono do personagem, nunca para quem não pode ver aquela ficha.
        if revela_tudo:
            publico["personagem_id"] = item["personagem_id"]
        if manda:
            publico["anotacao"] = item["anotacao"]
            # A tabela e o loot rolado são do Mestre: o jogador fica sabendo
            # do que caiu quando o item chega na ficha dele.
            publico["monstro_id"] = item["monstro_id"]
            publico["tem_loot"] = eh_sob_medida(item["monstro_id"]) or tem_loot(
                ajustes_loot.get(item["monstro_id"]) or tabela_da_criatura(item["monstro_id"])
            )
            publico["loot"] = item["loot"]
        participantes.append(publico)

    turno_de = None
    if sessao["em_combate"] and linhas:
        indice = sessao["turno_indice"] % len(linhas)
        atual = dict(linhas[indice])
        if manda or atual["visibilidade"] in ("parcial", "total"):
            turno_de = {"id": atual["id"], "nome": atual["nome"], "indice": indice}
        else:
            turno_de = {"id": None, "nome": "Alguém que você não vê", "indice": indice}

    return {
        "sessao": {
            "id": sessao["id"],
            "campanha_id": sessao["campanha_id"],
            "titulo": sessao["titulo"],
            "status": sessao["status"],
            "rodada": sessao["rodada"],
            "em_combate": sessao["em_combate"],
            "versao": sessao["versao"],
            "iniciada_em": sessao["iniciada_em"],
            "turno_de": turno_de,
        },
        "participantes": participantes,
        # Lendas que caíram nesta sessão (a mesa inteira vê: a queda é um fato público).
        "lendas": livro_da_verdade.da_sessao(connection, sessao["id"]),
        "meu_papel": papel,
        "comando": manda,
        "bloqueada": False,
    }


def _estado_bloqueado(papel: str) -> dict:
    """Resposta mínima: confirma o bloqueio sem vazar a preparação da cena."""
    return {
        "sessao": None,
        "participantes": [],
        "meu_papel": papel,
        "comando": False,
        "bloqueada": True,
    }


@router.get("")
def obter_sessao(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Estado atual da mesa. Sem sessão aberta, devolve `sessao: null`."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = _sessao_ativa(connection, campanha_id)
        if not sessao:
            return {
                "sessao": None,
                "participantes": [],
                "meu_papel": acesso.role,
                "comando": acesso.manages_content,
                "bloqueada": not acesso.manages_content,
            }
        if sessao["status"] == "preparacao" and not acesso.manages_content:
            return _estado_bloqueado(acesso.role)
        return _montar_estado(connection, sessao, acesso.role, user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
def abrir_sessao(
    payload: SessionOpenInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cria a mesa em preparação privada.

    Personagens só entram automaticamente para clientes legados que enviarem
    `incluir_personagens=true`; a interface atual exige a seleção do Mestre.
    """
    sessao_id = uuid4()
    with database.connection() as connection:
        access = require_campaign_manager(connection, payload.campanha_id, user.id)
        if _sessao_ativa(connection, payload.campanha_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ja existe uma sessao ativa nesta campanha",
            )
        connection.execute(
            """
            INSERT INTO sessoes_mesa (id, campanha_id, titulo, aberta_por, status)
            VALUES (%s, %s, %s, %s, 'preparacao')
            """,
            (sessao_id, payload.campanha_id, payload.titulo.strip(), user.id),
        )

        if payload.incluir_personagens:
            personagens = connection.execute(
                """
                SELECT id, nome,
                       ficha,
                       COALESCE((ficha->'derivados'->>'vida')::int, 0) AS vida_maxima,
                       COALESCE(
                           (ficha->'status'->>'vidaAtual')::int,
                           (ficha->'recursos'->>'vidaAtual')::int
                       ) AS vida_atual,
                       COALESCE((ficha->'derivados'->>'mana')::int, 0) AS mana_maxima,
                       COALESCE(
                           (ficha->'status'->>'manaAtual')::int,
                           (ficha->'recursos'->>'manaAtual')::int
                       ) AS mana_atual
                FROM personagens
                WHERE campanha_id=%s AND status='ativo'
                ORDER BY nome
                """,
                (payload.campanha_id,),
            ).fetchall()
            for ordem, personagem in enumerate(personagens):
                maximo = max(0, int(personagem["vida_maxima"] or 0))
                atual = maximo if personagem["vida_atual"] is None else int(personagem["vida_atual"])
                mana_maxima = max(0, int(personagem["mana_maxima"] or 0))
                mana_atual = (
                    mana_maxima
                    if personagem["mana_atual"] is None
                    else max(0, min(int(personagem["mana_atual"]), mana_maxima))
                )
                connection.execute(
                    """
                    INSERT INTO sessao_participantes
                        (id, sessao_id, personagem_id, nome, tipo,
                         iniciativa, vida_atual, vida_maxima, mana_atual,
                         mana_maxima, condicoes, ordem,
                         vida_temporaria, mana_temporaria,
                         estamina_maxima, estamina_atual, estamina_temporaria)
                    VALUES (%s, %s, %s, %s, 'jogador', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (uuid4(), sessao_id, personagem["id"], personagem["nome"],
                     iniciativa_fixa(personagem["ficha"]),
                     min(atual, maximo) if maximo else atual, maximo,
                     mana_atual, mana_maxima,
                     Jsonb(normalizar_condicoes(personagem["ficha"].get("condicoesAtivas"))), ordem,
                     *_temporarios_da_ficha(personagem["ficha"]),
                     *_estamina_da_ficha(personagem["ficha"])),
                )

        record_audit(
            connection,
            action="sessao.preparada",
            actor_user_id=user.id,
            campaign_id=payload.campanha_id,
            target_type="sessao",
            target_id=str(sessao_id),
        )
        sessao = _sessao_ativa(connection, payload.campanha_id)
        estado = _montar_estado(connection, sessao, access.role, user.id)
    live_session.publicar(payload.campanha_id, "sessao_preparada", estado["sessao"]["versao"])
    return estado


@router.post("/{sessao_id}/ao-vivo")
def publicar_sessao(
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Torna pública uma sessão preparada; somente então jogadores recebem a mesa."""
    with database.connection() as connection:
        sessao = connection.execute(
            """
            SELECT id, campanha_id, status FROM sessoes_mesa
            WHERE id=%s AND status IN ('preparacao', 'aberta')
            FOR UPDATE
            """,
            (sessao_id,),
        ).fetchone()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
        access = require_campaign_manager(connection, sessao["campanha_id"], user.id)
        if sessao["status"] == "preparacao":
            connection.execute(
                """
                UPDATE sessoes_mesa
                SET status='aberta', versao=versao+1,
                    iniciada_em=CURRENT_TIMESTAMP, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (sessao_id,),
            )
            notify(
                connection,
                user_ids=campaign_member_ids(connection, sessao["campanha_id"]),
                category="sessao",
                title="A sessão começou",
                message="O Mestre liberou a mesa ao vivo.",
                campaign_id=sessao["campanha_id"],
                actor_user_id=user.id,
            )
            avisar_discord(
                connection, sessao["campanha_id"], "sessao",
                "🎲 **A sessão começou!** A mesa ao vivo está aberta no site.",
            )
            record_audit(
                connection,
                action="sessao.aberta",
                actor_user_id=user.id,
                campaign_id=sessao["campanha_id"],
                target_type="sessao",
                target_id=str(sessao_id),
            )
        atualizada = _sessao_ativa(connection, sessao["campanha_id"])
        estado = _montar_estado(connection, atualizada, access.role, user.id)
    live_session.publicar(sessao["campanha_id"], "sessao_aberta", estado["sessao"]["versao"])
    return estado


_MIN_ROLAGENS_PARA_SORTE = 4


def _destaques_do_resumo(jogadores: list[dict], maior_dano, poder_favorito) -> list[dict]:
    """Os cartões do resumo. Cada um só existe se alguém de fato o mereceu."""
    destaques: list[dict] = []

    def vencedor(chave, *, menor=False, minimo=1, filtro=None):
        candidatos = [
            jogador for jogador in jogadores
            if jogador[chave] is not None and jogador[chave] >= minimo and (filtro is None or filtro(jogador))
        ]
        if not candidatos:
            return None
        return (min if menor else max)(candidatos, key=lambda jogador: (jogador[chave], jogador["nome"]))

    rei = vencedor("criticos")
    if rei:
        destaques.append({
            "id": "criticos", "rotulo": "Rei dos Críticos", "personagem": rei["nome"],
            "valor": rei["criticos"], "unidade": "20 naturais",
            "detalhe": "Ninguém tirou mais 20 naturais nesta sessão.",
        })
    azarao = vencedor("falhas")
    if azarao:
        destaques.append({
            "id": "falhas", "rotulo": "Azarão da Noite", "personagem": azarao["nome"],
            "valor": azarao["falhas"], "unidade": "1 naturais",
            "detalhe": "Os dados não estavam do seu lado.",
        })
    if maior_dano:
        destaques.append({
            "id": "maior_dano", "rotulo": "Golpe da Noite", "personagem": maior_dano["autor_nome"],
            "valor": int(maior_dano["resultado"]), "unidade": "de dano",
            "detalhe": maior_dano["titulo"],
        })
    dano = vencedor("dano_total")
    if dano:
        destaques.append({
            "id": "dano_total", "rotulo": "Mais Estrago", "personagem": dano["nome"],
            "valor": dano["dano_total"], "unidade": "de dano no total",
            "detalhe": "Somando todas as rolagens de dano.",
        })
    sorte = vencedor("media_natural", minimo=0, filtro=lambda j: j["rolagens"] >= _MIN_ROLAGENS_PARA_SORTE)
    if sorte and len(jogadores) > 1:
        destaques.append({
            "id": "sorte", "rotulo": "Sorte da Mesa", "personagem": sorte["nome"],
            "valor": sorte["media_natural"], "unidade": "de média no d20",
            "detalhe": f"Em {sorte['rolagens']} rolagens.",
        })
        azar = vencedor("media_natural", menor=True, minimo=0, filtro=lambda j: j["rolagens"] >= _MIN_ROLAGENS_PARA_SORTE)
        if azar and azar["nome"] != sorte["nome"]:
            destaques.append({
                "id": "azar", "rotulo": "Azar da Mesa", "personagem": azar["nome"],
                "valor": azar["media_natural"], "unidade": "de média no d20",
                "detalhe": f"Em {azar['rolagens']} rolagens.",
            })
    ativo = vencedor("acoes")
    if ativo and len(jogadores) > 1:
        destaques.append({
            "id": "ativo", "rotulo": "Mais Ativo", "personagem": ativo["nome"],
            "valor": ativo["acoes"], "unidade": "ações",
            "detalhe": "Rolagens e usos de poder somados.",
        })
    if poder_favorito:
        destaques.append({
            "id": "poder", "rotulo": "Favorito da Mesa", "personagem": poder_favorito["titulo"],
            "valor": int(poder_favorito["total"]), "unidade": "usos",
            "detalhe": "O poder, habilidade ou magia mais usado.",
        })
    return destaques


@router.get("/{sessao_id}/resumo")
def resumo_da_sessao(
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Resumo estilo "Wrapped" da sessão, para todos os membros da mesa.

    Só entram personagens (o que o Mestre rola por monstros fica de fora) e só
    números: o título de rolagens de perícia nunca aparece, para o resumo não
    entregar cena. O maior dano mostra o nome do golpe porque dano é público."""
    with database.connection() as connection:
        sessao = connection.execute(
            """
            SELECT id, campanha_id, titulo, status, rodada, iniciada_em, encerrada_em,
                   EXTRACT(EPOCH FROM (COALESCE(encerrada_em, CURRENT_TIMESTAMP) - iniciada_em)) AS segundos
            FROM sessoes_mesa WHERE id=%s
            """,
            (sessao_id,),
        ).fetchone()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
        campaign_access(connection, sessao["campanha_id"], user.id)

        linhas = connection.execute(
            """
            SELECT personagem_id::text AS chave,
                   MAX(autor_nome) AS nome,
                   COUNT(*) FILTER (WHERE tipo='rolagem') AS rolagens,
                   COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'critico_natural'='true') AS criticos,
                   COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'falha_natural'='true') AS falhas,
                   COALESCE(SUM(resultado) FILTER (WHERE tipo='dano'), 0) AS dano_total,
                   COALESCE(MAX(resultado) FILTER (WHERE tipo='dano'), 0) AS dano_maximo,
                   COUNT(*) FILTER (WHERE tipo IN ('poder', 'habilidade', 'magia')) AS usos,
                   ROUND(AVG((detalhes->>'natural')::numeric)
                         FILTER (WHERE tipo='rolagem' AND detalhes ? 'natural'), 1) AS media_natural
            FROM registros_mesa
            WHERE sessao_id=%s AND personagem_id IS NOT NULL
            GROUP BY personagem_id
            """,
            (sessao_id,),
        ).fetchall()
        maior_dano = connection.execute(
            """
            SELECT autor_nome, titulo, resultado FROM registros_mesa
            WHERE sessao_id=%s AND tipo='dano' AND personagem_id IS NOT NULL AND resultado IS NOT NULL
            ORDER BY resultado DESC, criado_em LIMIT 1
            """,
            (sessao_id,),
        ).fetchone()
        poder_favorito = connection.execute(
            """
            SELECT titulo, COUNT(*) AS total FROM registros_mesa
            WHERE sessao_id=%s AND tipo IN ('poder', 'habilidade', 'magia') AND personagem_id IS NOT NULL
            GROUP BY titulo ORDER BY total DESC, titulo LIMIT 1
            """,
            (sessao_id,),
        ).fetchone()

    jogadores = []
    for linha in linhas:
        media = linha["media_natural"]
        jogadores.append({
            "nome": linha["nome"],
            "rolagens": int(linha["rolagens"]),
            "criticos": int(linha["criticos"]),
            "falhas": int(linha["falhas"]),
            "dano_total": int(linha["dano_total"]),
            "dano_maximo": int(linha["dano_maximo"]),
            "usos": int(linha["usos"]),
            "acoes": int(linha["rolagens"]) + int(linha["usos"]),
            "media_natural": float(media) if media is not None else None,
        })
    jogadores.sort(key=lambda jogador: (-jogador["acoes"], jogador["nome"]))

    return {
        "sessao": {
            "id": sessao["id"],
            "titulo": sessao["titulo"],
            "status": sessao["status"],
            "rodadas": sessao["rodada"],
            "duracao_min": max(0, int(round(float(sessao["segundos"] or 0) / 60))),
            "iniciada_em": sessao["iniciada_em"],
            "encerrada_em": sessao["encerrada_em"],
        },
        "mesa": {
            "rolagens": sum(jogador["rolagens"] for jogador in jogadores),
            "criticos": sum(jogador["criticos"] for jogador in jogadores),
            "falhas": sum(jogador["falhas"] for jogador in jogadores),
            "dano_total": sum(jogador["dano_total"] for jogador in jogadores),
            "usos": sum(jogador["usos"] for jogador in jogadores),
            "jogadores": len(jogadores),
        },
        "destaques": _destaques_do_resumo(jogadores, maior_dano, poder_favorito),
        "jogadores": jogadores,
    }


@router.get("/campanha/{campanha_id}/ultima-encerrada")
def ultima_sessao_encerrada(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Id da sessão encerrada mais recente da mesa, para reabrir o resumo."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        linha = connection.execute(
            """
            SELECT id FROM sessoes_mesa
            WHERE campanha_id=%s AND status='encerrada'
            ORDER BY encerrada_em DESC NULLS LAST LIMIT 1
            """,
            (campanha_id,),
        ).fetchone()
    return {"sessao_id": linha["id"] if linha else None}


@router.get("/campanha/{campanha_id}/situacao")
def situacao_da_mesa(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Só o que o menu e a Home precisam saber: há mesa ao vivo agora?

    Sem participantes nem estado de cena. A preparação é privada do Mestre, então para os
    demais ela conta como "nenhuma", exatamente como no estado completo da sessão."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        sessao = _sessao_ativa(connection, campanha_id)
    nenhuma = {"situacao": "nenhuma", "titulo": None, "iniciada_em": None}
    if not sessao:
        return nenhuma
    if sessao["status"] == "preparacao":
        if not acesso.manages_content:
            return nenhuma
        return {"situacao": "preparacao", "titulo": sessao["titulo"], "iniciada_em": None}
    return {"situacao": "aberta", "titulo": sessao["titulo"], "iniciada_em": sessao["iniciada_em"]}


@router.delete("/{sessao_id}", status_code=status.HTTP_204_NO_CONTENT)
def encerrar_sessao(
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        sessao = connection.execute(
            "SELECT campanha_id, versao FROM sessoes_mesa WHERE id=%s AND status IN ('preparacao', 'aberta')",
            (sessao_id,),
        ).fetchone()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
        require_campaign_manager(connection, sessao["campanha_id"], user.id)
        connection.execute(
            """
            UPDATE sessoes_mesa
            SET status='encerrada', encerrada_em=CURRENT_TIMESTAMP,
                versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (sessao_id,),
        )
        record_audit(
            connection,
            action="sessao.encerrada",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao",
            target_id=str(sessao_id),
        )
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "sessao_encerrada", int(sessao["versao"]) + 1)
    return None


def _sessao_sob_comando(connection, sessao_id: UUID, user_id: UUID):
    row = connection.execute(
        """
        SELECT id, campanha_id, status, rodada, turno_indice, em_combate, versao
        FROM sessoes_mesa WHERE id=%s AND status IN ('preparacao', 'aberta')
        """,
        (sessao_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sessao nao encontrada")
    sessao = dict(row)
    access = require_campaign_manager(connection, sessao["campanha_id"], user_id)
    sessao["_papel_comando"] = access.role
    return sessao


@router.post("/{sessao_id}/personagens")
def selecionar_personagens(
    sessao_id: UUID,
    payload: SessionCharactersInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Sincroniza somente os personagens de jogador escolhidos pelo Mestre.

    Aliados e inimigos já preparados são preservados. A seleção é fechada
    antes da publicação para não trocar o elenco no meio de uma sessão ao vivo.
    """
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        if sessao["status"] != "preparacao":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="os personagens so podem ser selecionados durante a preparacao",
            )

        personagem_ids = payload.personagem_ids
        personagens = []
        if personagem_ids:
            personagens = connection.execute(
                """
                SELECT id, nome, ficha,
                       COALESCE((ficha->'derivados'->>'vida')::int, 0) AS vida_maxima,
                       COALESCE(
                           (ficha->'status'->>'vidaAtual')::int,
                           (ficha->'recursos'->>'vidaAtual')::int
                       ) AS vida_atual,
                       COALESCE((ficha->'derivados'->>'mana')::int, 0) AS mana_maxima,
                       COALESCE(
                           (ficha->'status'->>'manaAtual')::int,
                           (ficha->'recursos'->>'manaAtual')::int
                       ) AS mana_atual
                FROM personagens
                WHERE campanha_id=%s AND status='ativo' AND id = ANY(%s)
                """,
                (sessao["campanha_id"], personagem_ids),
            ).fetchall()
            encontrados = {personagem["id"] for personagem in personagens}
            ausentes = [personagem_id for personagem_id in personagem_ids if personagem_id not in encontrados]
            if ausentes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="a selecao contem personagem inexistente, arquivado ou de outra campanha",
                )

        if personagem_ids:
            connection.execute(
                """
                DELETE FROM sessao_participantes
                WHERE sessao_id=%s AND tipo='jogador' AND personagem_id IS NOT NULL
                  AND NOT (personagem_id = ANY(%s))
                """,
                (sessao_id, personagem_ids),
            )
        else:
            connection.execute(
                """
                DELETE FROM sessao_participantes
                WHERE sessao_id=%s AND tipo='jogador' AND personagem_id IS NOT NULL
                """,
                (sessao_id,),
            )

        existentes = {
            row["personagem_id"]
            for row in connection.execute(
                """
                SELECT personagem_id FROM sessao_participantes
                WHERE sessao_id=%s AND personagem_id IS NOT NULL
                """,
                (sessao_id,),
            ).fetchall()
        }
        personagens_por_id = {personagem["id"]: personagem for personagem in personagens}
        proxima_ordem = int(connection.execute(
            "SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM sessao_participantes WHERE sessao_id=%s",
            (sessao_id,),
        ).fetchone()["proxima"])

        for personagem_id in personagem_ids:
            if personagem_id in existentes:
                continue
            personagem = personagens_por_id[personagem_id]
            maximo = max(0, int(personagem["vida_maxima"] or 0))
            atual = maximo if personagem["vida_atual"] is None else int(personagem["vida_atual"])
            mana_maxima = max(0, int(personagem["mana_maxima"] or 0))
            mana_atual = (
                mana_maxima
                if personagem["mana_atual"] is None
                else max(0, min(int(personagem["mana_atual"]), mana_maxima))
            )
            connection.execute(
                """
                INSERT INTO sessao_participantes
                    (id, sessao_id, personagem_id, nome, tipo,
                     iniciativa, vida_atual, vida_maxima, mana_atual,
                     mana_maxima, condicoes, ordem,
                     vida_temporaria, mana_temporaria,
                     estamina_maxima, estamina_atual, estamina_temporaria)
                VALUES (%s, %s, %s, %s, 'jogador', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    uuid4(), sessao_id, personagem["id"], personagem["nome"],
                    iniciativa_fixa(personagem["ficha"]),
                    min(atual, maximo) if maximo else atual, maximo,
                    mana_atual, mana_maxima,
                    Jsonb(normalizar_condicoes(personagem["ficha"].get("condicoesAtivas"))),
                    proxima_ordem,
                    *_temporarios_da_ficha(personagem["ficha"]),
                    *_estamina_da_ficha(personagem["ficha"]),
                ),
            )
            proxima_ordem += 1

        versao = _tocar(connection, sessao_id)
        atualizada = _sessao_ativa(connection, sessao["campanha_id"])
        estado = _montar_estado(connection, atualizada, sessao["_papel_comando"], user.id)
        campanha_id = sessao["campanha_id"]

    live_session.publicar(campanha_id, "personagens_selecionados", versao)
    return estado


@router.post("/{sessao_id}/participantes", status_code=status.HTTP_201_CREATED)
def adicionar_participante(
    sessao_id: UUID,
    payload: ParticipantCreateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    participante_id = uuid4()
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        proxima_ordem = connection.execute(
            "SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM sessao_participantes WHERE sessao_id=%s",
            (sessao_id,),
        ).fetchone()["proxima"]
        vida = max(0, payload.vida_maxima)
        connection.execute(
            """
            INSERT INTO sessao_participantes
                (id, sessao_id, nome, tipo, iniciativa, vida_atual, vida_maxima,
                 visibilidade, ordem, defesa, mana_atual, mana_maxima, ataques, vd,
                 pericias, estamina_atual, estamina_maxima, monstro_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                participante_id,
                sessao_id,
                payload.nome,
                payload.tipo,
                payload.iniciativa,
                vida,
                vida,
                payload.visibilidade,
                proxima_ordem,
                payload.defesa,
                payload.mana_maxima,
                payload.mana_maxima,
                Jsonb(payload.ataques),
                payload.vd,
                Jsonb(payload.pericias),
                payload.estamina_maxima,
                payload.estamina_maxima,
                payload.monstro_id,
            ),
        )
        if sessao["em_combate"] and payload.monstro_id:
            livro_da_verdade.registrar_encontro_sem_quebrar(
                connection, campanha_id=sessao["campanha_id"], sessao_id=sessao_id
            )
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participante_adicionado", versao)
    return {"id": participante_id, "versao": versao}


@router.put("/{sessao_id}/participantes/{participante_id}")
def atualizar_participante(
    sessao_id: UUID,
    participante_id: UUID,
    payload: ParticipantUpdateInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Dano, cura, condições e visibilidade — tudo o que muda durante a luta."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        atual = connection.execute(
            """
            SELECT id, nome, vida_atual, vida_maxima, personagem_id,
                   vida_temporaria, mana_temporaria, estamina_temporaria,
                   monstro_id, fase
            FROM sessao_participantes
            WHERE id=%s AND sessao_id=%s FOR UPDATE
            """,
            (participante_id, sessao_id),
        ).fetchone()
        if not atual:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="participante nao encontrado")

        vida_maxima = payload.vida_maxima if payload.vida_maxima is not None else int(atual["vida_maxima"])
        vida_atual = int(atual["vida_atual"])
        vida_temporaria = int(atual["vida_temporaria"] or 0)
        if payload.vida_atual is not None:
            vida_atual = payload.vida_atual
        if payload.dano:
            # O extra temporário paga o dano primeiro.
            absorvido = min(vida_temporaria, payload.dano)
            vida_temporaria -= absorvido
            vida_atual -= payload.dano - absorvido
        if payload.cura:
            # Cura que passa do máximo vira extra temporário, como na ficha.
            excesso = max(0, vida_atual + payload.cura - vida_maxima) if vida_maxima else 0
            vida_atual += payload.cura - excesso
            vida_temporaria += excesso
        if payload.vida_temporaria is not None:
            vida_temporaria = payload.vida_temporaria
        # Vida negativa é informação de jogo (o quanto passou de zero), mas não
        # deixamos ultrapassar o máximo por cura.
        vida_atual = max(-999, min(vida_atual, vida_maxima if vida_maxima else vida_atual))

        # Fase de chefe: a Vida avança sozinha, o Mestre pode ajustar à mão, e a fase
        # nunca desce por cura. Só criatura do catálogo com `fases` tem fase.
        fase = int(atual["fase"] or 1)
        fases_da_criatura = fases_do_catalogo(connection, [atual["monstro_id"]]).get(atual["monstro_id"]) or []
        if payload.fase is not None:
            if not fases_da_criatura or payload.fase > len(fases_da_criatura) + 1:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="essa criatura nao tem essa fase")
            fase = payload.fase
        elif fases_da_criatura:
            fase = fase_alcancada(fases_da_criatura, vida_atual, vida_maxima, fase)

        row = connection.execute(
            """
            UPDATE sessao_participantes SET
                fase=%s,
                nome=COALESCE(%s, nome),
                iniciativa=COALESCE(%s, iniciativa),
                vida_atual=%s,
                vida_maxima=%s,
                vida_temporaria=%s,
                mana_atual=COALESCE(%s, mana_atual),
                mana_maxima=COALESCE(%s, mana_maxima),
                mana_temporaria=COALESCE(%s, mana_temporaria),
                estamina_atual=COALESCE(%s, estamina_atual),
                estamina_maxima=COALESCE(%s, estamina_maxima),
                estamina_temporaria=COALESCE(%s, estamina_temporaria),
                condicoes=COALESCE(%s, condicoes),
                ataques=COALESCE(%s, ataques),
                anotacao=COALESCE(%s, anotacao),
                visibilidade=COALESCE(%s, visibilidade),
                defesa=COALESCE(%s, defesa),
                vd=COALESCE(%s, vd),
                pericias=COALESCE(%s, pericias),
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND sessao_id=%s
            RETURNING id, nome, vida_atual, vida_maxima, fase
            """,
            (
                fase,
                payload.nome,
                payload.iniciativa,
                vida_atual,
                vida_maxima,
                vida_temporaria,
                payload.mana_atual,
                payload.mana_maxima,
                payload.mana_temporaria,
                payload.estamina_atual,
                payload.estamina_maxima,
                payload.estamina_temporaria,
                Jsonb(payload.condicoes) if payload.condicoes is not None else None,
                Jsonb(payload.ataques) if payload.ataques is not None else None,
                payload.anotacao,
                payload.visibilidade,
                payload.defesa,
                payload.vd,
                Jsonb(payload.pericias) if payload.pericias is not None else None,
                participante_id,
                sessao_id,
            ),
        ).fetchone()
        versao_ficha = None
        alterou_vida = (
            payload.vida_atual is not None
            or payload.vida_temporaria is not None
            or bool(payload.dano)
            or bool(payload.cura)
        )
        if atual["personagem_id"] and alterou_vida:
            linha_ficha = connection.execute(
                """
                UPDATE personagens
                SET ficha=jsonb_set(
                        jsonb_set(
                            ficha,
                            '{status}',
                            COALESCE(ficha->'status', '{}'::jsonb)
                                || jsonb_build_object('vidaAtual', %s, 'vidaTemporaria', %s),
                            true
                        ),
                        '{recursos}',
                        COALESCE(ficha->'recursos', '{}'::jsonb)
                            || jsonb_build_object('vidaAtual', %s),
                        true
                    ),
                    versao=versao+1,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND status='ativo'
                RETURNING versao
                """,
                (vida_atual, vida_temporaria, vida_atual, atual["personagem_id"]),
            ).fetchone()
            versao_ficha = int(linha_ficha["versao"]) if linha_ficha else versao_ficha
        # Mesma ideia da Vida acima: sem isso, editar Mana no HUD da sessão
        # nunca chegava na ficha, e o jogador via um número diferente do que o
        # mestre acabou de ajustar (ver auditoria 2026-08, achados 8-9).
        # O extra temporário de Mana segue o mesmo caminho: sem isso o que o
        # mestre define no HUD sumia na próxima gravação da ficha.
        campos_mana = {}
        if payload.mana_atual is not None:
            campos_mana["manaAtual"] = payload.mana_atual
        if payload.mana_temporaria is not None:
            campos_mana["manaTemporaria"] = payload.mana_temporaria
        if atual["personagem_id"] and campos_mana:
            linha_ficha = connection.execute(
                """
                UPDATE personagens
                SET ficha=jsonb_set(
                        ficha,
                        '{status}',
                        COALESCE(ficha->'status', '{}'::jsonb) || %s,
                        true
                    ),
                    versao=versao+1,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND status='ativo'
                RETURNING versao
                """,
                (Jsonb(campos_mana), atual["personagem_id"]),
            ).fetchone()
            versao_ficha = int(linha_ficha["versao"]) if linha_ficha else versao_ficha
        registrar_minimos(connection, sessao_id)
        # Lenda do Bestiário a 0 de Vida: o Livro da Verdade abre a página dela (core/lendas.py).
        calendario_mudou = False
        if alterou_vida and vida_maxima > 0 and vida_atual <= 0 and livro_da_verdade.eh_lenda(atual["monstro_id"]):
            queda = livro_da_verdade.registrar_queda_sem_quebrar(
                connection,
                campanha_id=sessao["campanha_id"],
                monstro_id=atual["monstro_id"],
                sessao_id=sessao_id,
                participante_id=participante_id,
                ator_id=user.id,
            )
            # Só a primeira queda mexe no calendário (marco do dia e efeitos no mundo).
            calendario_mudou = bool(queda and queda.get("primeira"))
        # Estamina segue o mesmo caminho da Mana: o que o Mestre ajusta no HUD
        # tem que chegar na ficha, senão o jogador vê outro número.
        campos_estamina = {}
        if payload.estamina_atual is not None:
            campos_estamina["estaminaAtual"] = payload.estamina_atual
        if payload.estamina_temporaria is not None:
            campos_estamina["estaminaTemporaria"] = payload.estamina_temporaria
        if atual["personagem_id"] and campos_estamina:
            linha_ficha = connection.execute(
                """
                UPDATE personagens
                SET ficha=jsonb_set(
                        ficha,
                        '{status}',
                        COALESCE(ficha->'status', '{}'::jsonb) || %s,
                        true
                    ),
                    versao=versao+1,
                    atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s AND status='ativo'
                RETURNING versao
                """,
                (Jsonb(campos_estamina), atual["personagem_id"]),
            ).fetchone()
            versao_ficha = int(linha_ficha["versao"]) if linha_ficha else versao_ficha
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participante_atualizado", versao)
    if calendario_mudou:
        live_session.publicar(campanha_id, "calendario", 0)
    if versao_ficha is not None:
        # A ficha do jogador mudou por aqui: avisa a ficha aberta para buscar a
        # versão nova, senão o próximo autosave dela vira conflito.
        _avisar_fichas_alteradas(
            campanha_id, [{"personagem_id": atual["personagem_id"], "versao": versao_ficha}],
        )
    return {"participante": dict(row), "versao": versao}


@router.delete("/{sessao_id}/participantes/{participante_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_participante(
    sessao_id: UUID,
    participante_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        removido = connection.execute(
            "DELETE FROM sessao_participantes WHERE id=%s AND sessao_id=%s RETURNING id",
            (participante_id, sessao_id),
        ).fetchone()
        if not removido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="participante nao encontrado")
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participante_removido", versao)
    return None


@router.post("/{sessao_id}/participantes/ordem")
def reordenar_participantes(
    sessao_id: UUID,
    payload: ParticipantReorderInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Reordena a fila na mão (arrastar e soltar) — não mexe na iniciativa."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        existentes = {
            row["id"]
            for row in connection.execute(
                "SELECT id FROM sessao_participantes WHERE sessao_id=%s",
                (sessao_id,),
            ).fetchall()
        }
        if set(payload.ordem) != existentes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="a lista precisa conter exatamente os participantes da cena",
            )
        for posicao, participante_id in enumerate(payload.ordem):
            connection.execute(
                "UPDATE sessao_participantes SET ordem=%s WHERE id=%s AND sessao_id=%s",
                (posicao, participante_id, sessao_id),
            )
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "participantes_reordenados", versao)
    return {"versao": versao}


@router.post("/{sessao_id}/xp")
def distribuir_xp(
    sessao_id: UUID,
    payload: DistributeXpInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Soma o XP (pelo VD) dos inimigos escolhidos e reparte entre os
    personagens de jogador presentes nesta sessão."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        inimigos = connection.execute(
            """
            SELECT id, vd FROM sessao_participantes
            WHERE sessao_id=%s AND id = ANY(%s) AND tipo='inimigo'
            """,
            (sessao_id, payload.participante_ids),
        ).fetchall()
        if not inimigos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="nenhum inimigo valido selecionado",
            )
        total_xp = sum(xp_por_vd(row["vd"]) for row in inimigos)
        if total_xp <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="os inimigos selecionados nao tem VD definido",
            )

        jogadores = connection.execute(
            """
            SELECT DISTINCT personagem_id FROM sessao_participantes
            WHERE sessao_id=%s AND tipo='jogador' AND personagem_id IS NOT NULL
            """,
            (sessao_id,),
        ).fetchall()
        personagem_ids = [row["personagem_id"] for row in jogadores]
        if not personagem_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="nenhum personagem de jogador nesta sessao",
            )

        xp_por_personagem = total_xp // len(personagem_ids)
        if xp_por_personagem <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="xp insuficiente para distribuir entre os presentes",
            )

        atualizados = connection.execute(
            """
            UPDATE personagens SET
                ficha = jsonb_set(
                    ficha, '{xp}',
                    to_jsonb(COALESCE((ficha->>'xp')::int, 0) + %s),
                    true
                ),
                versao = versao + 1,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ANY(%s) AND status='ativo'
            RETURNING id, nome, (ficha->>'xp')::int AS xp
            """,
            (xp_por_personagem, personagem_ids),
        ).fetchall()

        notify(
            connection,
            user_ids=character_owner_ids(connection, sessao["campanha_id"], personagem_ids),
            category="sessao",
            title="XP distribuído",
            message=f"Sua ficha recebeu {xp_por_personagem} de XP pela sessão.",
            campaign_id=sessao["campanha_id"],
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="sessao.xp_distribuido",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao",
            target_id=str(sessao_id),
            details={
                "total_xp": total_xp,
                "xp_por_personagem": xp_por_personagem,
                "personagens": len(personagem_ids),
            },
        )
        resultado = [dict(row) for row in atualizados]
    return {
        "total_xp": total_xp,
        "xp_por_personagem": xp_por_personagem,
        "personagens": resultado,
    }


@router.post("/{sessao_id}/xp-direto")
def dar_xp_direto(
    sessao_id: UUID,
    payload: GrantXpInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre dá XP direto aos jogadores escolhidos (a mesma quantia para cada um),
    sem passar por monstro derrotado: recompensa de cena, objetivo cumprido, boa ideia."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        jogadores = connection.execute(
            """
            SELECT DISTINCT personagem_id FROM sessao_participantes
            WHERE sessao_id=%s AND id = ANY(%s) AND tipo='jogador' AND personagem_id IS NOT NULL
            """,
            (sessao_id, payload.participante_ids),
        ).fetchall()
        personagem_ids = [row["personagem_id"] for row in jogadores]
        if not personagem_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="nenhum jogador valido selecionado")
        atualizados = connection.execute(
            """
            UPDATE personagens SET
                ficha = jsonb_set(
                    ficha, '{xp}',
                    to_jsonb(COALESCE((ficha->>'xp')::int, 0) + %s),
                    true
                ),
                versao = versao + 1,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ANY(%s) AND status='ativo'
            RETURNING id, nome, (ficha->>'xp')::int AS xp
            """,
            (payload.xp, personagem_ids),
        ).fetchall()
        notify(
            connection,
            user_ids=character_owner_ids(connection, sessao["campanha_id"], personagem_ids),
            category="sessao",
            title="XP recebido",
            message=f"O Mestre deu {payload.xp} de XP à sua ficha.",
            campaign_id=sessao["campanha_id"],
            actor_user_id=user.id,
        )
        record_audit(
            connection,
            action="sessao.xp_direto",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao",
            target_id=str(sessao_id),
            details={"xp": payload.xp, "personagens": len(personagem_ids)},
        )
        resultado = [dict(row) for row in atualizados]
    return {"xp": payload.xp, "personagens": resultado}


@router.get("/bestiario")
def listar_bestiario(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Monstros do catálogo, para o mestre montar a cena rápido. Só quem comanda."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        linhas = connection.execute(
            """
            SELECT id, titulo, conteudo
            FROM catalogo_itens
            WHERE tipo='monstro' AND ativo=TRUE
            ORDER BY titulo
            """
        ).fetchall()
        ajustes_loot = ajustes_da_campanha(connection, campanha_id)
    monstros = []
    for linha in linhas:
        conteudo = linha["conteudo"] or {}
        vd = conteudo.get("vd")
        monstros.append(
            {
                "id": linha["id"],
                "titulo": linha["titulo"],
                "nivel": conteudo.get("nivel"),
                "classe": conteudo.get("classe"),
                "categoria": conteudo.get("categoria"),
                "descricao": conteudo.get("descricao"),
                "vd": vd,
                "xp": xp_por_vd(vd),
                "familia": conteudo.get("familia"),
                "estagio": conteudo.get("estagio"),
                "papel": conteudo.get("papel"),
                "unico": bool(conteudo.get("unico")),
                "tem_loot": tem_loot(ajustes_loot.get(linha["id"]) or tabela_da_criatura(linha["id"])),
                "loot_ajustado": linha["id"] in ajustes_loot,
                "pv": _inteiro_do_catalogo(conteudo.get("pv")),
                "defesa": _inteiro_do_catalogo(conteudo.get("defesa")),
                "mana": _inteiro_do_catalogo(conteudo.get("mana")),
                "estamina": _inteiro_do_catalogo(conteudo.get("estamina")),
                "iniciativa": _inteiro_do_catalogo(conteudo.get("iniciativa")),
                "ataques": conteudo.get("ataques") or [],
                "pericias": conteudo.get("pericias") or [],
                "habilidades": conteudo.get("habilidades") or [],
                # Para a ficha completa que abre ao clicar no card.
                "deslocamento": conteudo.get("deslocamento"),
                "atributos": conteudo.get("atributos") if isinstance(conteudo.get("atributos"), dict) else None,
                "raridade": conteudo.get("raridade"),
                "subtipo": conteudo.get("subtipo"),
                "funcao": conteudo.get("funcao"),
                "fases": fases_limpas(conteudo.get("fases")),
            }
        )
    # As Deidades vêm de um arquivo só do servidor e só chegam a quem comanda a mesa.
    monstros.extend(deidades_do_bestiario())
    return {"monstros": monstros}


# ---------------------------------------------------------------- loot

def _catalogo_do_loot(connection, campanha_id: UUID, monstro_id: str, tabela: dict | None = None) -> dict[str, dict]:
    """Itens que a tabela da criatura cita, já com as publicações da campanha
    por cima: item que a campanha tirou do jogo (lápide) some do loot."""
    tabela = tabela if tabela is not None else (tabela_da_criatura(monstro_id) or {})
    ids = sorted({str(regra.get("item")) for regra in tabela.get("itens") or [] if regra.get("item")})
    if not ids:
        return {}
    return {row["id"]: row for row in _resolved_catalog_rows(connection, campanha_id, ids)}


@router.get("/bestiario/loot/{monstro_id}")
def tabela_de_loot(
    monstro_id: str,
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """O que uma criatura pode deixar cair, com a chance de cada linha. Só
    quem comanda a mesa vê: o jogador descobre o loot saqueando."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        tabela, ajustada = tabela_efetiva(connection, campanha_id, monstro_id)
        resumo = resumo_da_tabela(monstro_id, _catalogo_do_loot(connection, campanha_id, monstro_id, tabela), tabela) if tabela is not None else None
        oficial = None
        if ajustada and tabela_da_criatura(monstro_id) is not None:
            oficial = resumo_da_tabela(monstro_id, _catalogo_do_loot(connection, campanha_id, monstro_id))
    if resumo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="essa criatura nao tem tabela de loot")
    return {**resumo, "ajustada": ajustada, "oficial": oficial}


@router.put("/bestiario/loot/{monstro_id}")
def ajustar_tabela_de_loot(
    monstro_id: str,
    campanha_id: UUID,
    payload: LootTableInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre troca a tabela de loot de uma criatura só na campanha dele.
    A tabela oficial continua intacta para as outras mesas."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        monstro = connection.execute(
            "SELECT id FROM catalogo_itens WHERE id=%s AND tipo='monstro' AND ativo=TRUE",
            (monstro_id,),
        ).fetchone()
        if not monstro:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="criatura nao encontrada")
        ids = [linha.item_id for linha in payload.itens]
        catalogo = {row["id"]: row for row in _resolved_catalog_rows(connection, campanha_id, ids)} if ids else {}
        for item_id in ids:
            item = catalogo.get(item_id)
            if item is None:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"o item {item_id} nao existe no catalogo")
            if item["tipo"] in {"monstro", "propriedade"}:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="criatura e propriedade nao entram como loot",
                )
        tabela = {
            "moedas": payload.moedas.model_dump() if payload.moedas else None,
            "itens": [{"item": linha.item_id, "chance": linha.chance, "quantidade": linha.quantidade} for linha in payload.itens],
        }
        connection.execute(
            """
            INSERT INTO loot_campanha (campanha_id, monstro_id, tabela, atualizado_por)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (campanha_id, monstro_id) DO UPDATE SET
                tabela=EXCLUDED.tabela, atualizado_por=EXCLUDED.atualizado_por,
                atualizado_em=CURRENT_TIMESTAMP
            """,
            (campanha_id, monstro_id, Jsonb(tabela), user.id),
        )
        record_audit(
            connection,
            action="loot.tabela_ajustada",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="monstro",
            target_id=monstro_id,
            details=tabela,
        )
        resumo = resumo_da_tabela(monstro_id, _catalogo_do_loot(connection, campanha_id, monstro_id, tabela), tabela)
    return {**resumo, "ajustada": True}


@router.delete("/bestiario/loot/{monstro_id}", status_code=status.HTTP_204_NO_CONTENT)
def restaurar_tabela_de_loot(
    monstro_id: str,
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Volta a criatura para a tabela oficial nesta campanha."""
    with database.connection() as connection:
        require_campaign_manager(connection, campanha_id, user.id)
        connection.execute(
            "DELETE FROM loot_campanha WHERE campanha_id=%s AND monstro_id=%s",
            (campanha_id, monstro_id),
        )
        record_audit(
            connection,
            action="loot.tabela_restaurada",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="monstro",
            target_id=monstro_id,
        )
    return None


def _participante_travado(connection, sessao_id: UUID, participante_id: UUID):
    row = connection.execute(
        """
        SELECT id, nome, tipo, monstro_id, loot
        FROM sessao_participantes
        WHERE id=%s AND sessao_id=%s
        FOR UPDATE
        """,
        (participante_id, sessao_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="participante nao encontrado")
    return row


@router.post("/{sessao_id}/participantes/{participante_id}/loot")
def rolar_loot_do_participante(
    sessao_id: UUID,
    participante_id: UUID,
    payload: ParticipantLootRollInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Rola a tabela de loot da criatura (d100 por linha, no servidor) e guarda
    o resultado no participante, para o Mestre escolher quem leva o quê."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        participante = _participante_travado(connection, sessao_id, participante_id)
        if not participante["monstro_id"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="esse participante nao veio do Bestiario, entao nao tem tabela de loot",
            )
        atual = participante["loot"] if isinstance(participante["loot"], dict) else None
        if atual is not None:
            if not payload.refazer:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="o loot dessa criatura ja foi rolado")
            if any(linha.get("entregue_para") for linha in atual.get("linhas") or []):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="parte do loot ja foi entregue; nao da para rolar de novo",
                )
        tabela, _ajustada = tabela_efetiva(connection, sessao["campanha_id"], participante["monstro_id"])
        catalogo = _catalogo_do_loot(connection, sessao["campanha_id"], participante["monstro_id"], tabela)
        loot = rolar_loot(participante["monstro_id"], catalogo, tabela=tabela) if tabela is not None else None
        if loot is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="essa criatura nao tem tabela de loot")
        connection.execute(
            "UPDATE sessao_participantes SET loot=%s WHERE id=%s",
            (Jsonb(loot), participante_id),
        )
        record_audit(
            connection,
            action="sessao.loot_rolado",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao_participante",
            target_id=str(participante_id),
            details={
                "monstro_id": participante["monstro_id"],
                "refeito": atual is not None,
                "linhas": [
                    {k: linha.get(k) for k in ("tipo", "item_id", "moeda", "quantidade", "rolagem", "chance")}
                    for linha in loot["linhas"]
                ],
            },
        )
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "loot_rolado", versao)
    return {"loot": loot, "versao": versao}


@router.post("/{sessao_id}/participantes/{participante_id}/loot/entregar")
def entregar_loot_do_participante(
    sessao_id: UUID,
    participante_id: UUID,
    payload: ParticipantLootDeliverInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Entrega linhas do loot rolado aos personagens escolhidos pelo Mestre:
    item vai para o inventário (mesmo caminho da concessão da Loja), moeda
    vai para a carteira com lançamento no extrato. Cada linha só sai uma vez."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        campanha_id = sessao["campanha_id"]
        participante = _participante_travado(connection, sessao_id, participante_id)
        loot = participante["loot"] if isinstance(participante["loot"], dict) else None
        if loot is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="role o loot antes de entregar")
        linhas = {linha.get("linha"): linha for linha in loot.get("linhas") or []}

        pedidas: dict[str, UUID] = {}
        for entrega in payload.entregas:
            linha = linhas.get(entrega.linha)
            if linha is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="essa linha nao esta no loot rolado")
            if linha.get("entregue_para"):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"{linha.get('titulo')} ja foi entregue",
                )
            if entrega.linha in pedidas:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="a mesma linha veio duas vezes")
            pedidas[entrega.linha] = entrega.personagem_id

        por_personagem: dict[UUID, list[dict]] = {}
        for linha_id, personagem_id in pedidas.items():
            por_personagem.setdefault(personagem_id, []).append(linhas[linha_id])

        entregues: list[dict] = []
        fichas_alteradas: list[dict] = []
        destinatarios: dict[UUID, dict] = {}
        # Trava os personagens sempre na mesma ordem, como a Loja faz.
        for personagem_id in sorted(por_personagem, key=str):
            personagem = _any_active_character(connection, campanha_id, personagem_id, lock=True)
            destinatarios[personagem_id] = {"nome": personagem["nome"], "recebeu": []}
            itens = [linha for linha in por_personagem[personagem_id] if linha.get("tipo") == "item"]
            moedas = [linha for linha in por_personagem[personagem_id] if linha.get("tipo") == "moedas"]
            if itens:
                _concedidos, _economia, versao_ficha = conceder_itens_do_catalogo(
                    connection,
                    campanha_id,
                    personagem,
                    [(str(linha["item_id"]), int(linha["quantidade"])) for linha in itens],
                )
                if versao_ficha is not None:
                    fichas_alteradas.append({"personagem_id": personagem_id, "versao": versao_ficha})
            for linha in moedas:
                creditar_carteira(
                    connection,
                    campaign_id=campanha_id,
                    character_id=personagem_id,
                    currency=str(linha.get("moeda") or "Lunaris"),
                    amount=int(linha["quantidade"]),
                    actor_user_id=user.id,
                    origin="sessao.loot",
                    reason=f"Loot de {participante['nome']}",
                    idempotency=f"{participante_id}:{linha['linha']}",
                )
            if moedas and not itens:
                connection.execute(
                    """
                    UPDATE personagens
                    SET economia_versao=economia_versao+1, atualizado_em=CURRENT_TIMESTAMP
                    WHERE id=%s
                    """,
                    (personagem_id,),
                )
            for linha in [*itens, *moedas]:
                linha["entregue_para"] = {"personagem_id": str(personagem_id), "nome": personagem["nome"]}
                destinatarios[personagem_id]["recebeu"].append(f"{linha['quantidade']}x {linha['titulo']}")
                entregues.append({
                    "linha": linha["linha"],
                    "titulo": linha["titulo"],
                    "quantidade": linha["quantidade"],
                    "personagem_id": str(personagem_id),
                })

        connection.execute(
            "UPDATE sessao_participantes SET loot=%s WHERE id=%s",
            (Jsonb(loot), participante_id),
        )
        for personagem_id, info in destinatarios.items():
            notify(
                connection,
                user_ids=character_owner_ids(connection, campanha_id, [personagem_id]),
                category="sessao",
                title=f"Loot de {participante['nome']}",
                message=f"**{info['nome']}** pegou:\n" + "\n".join(f"- {texto}" for texto in info["recebeu"]),
                campaign_id=campanha_id,
                actor_user_id=user.id,
            )
        record_audit(
            connection,
            action="sessao.loot_entregue",
            actor_user_id=user.id,
            campaign_id=campanha_id,
            target_type="sessao_participante",
            target_id=str(participante_id),
            details={"monstro_id": participante["monstro_id"], "entregues": entregues},
        )
        versao = _tocar(connection, sessao_id)
    live_session.publicar(campanha_id, "loot_entregue", versao)
    _avisar_fichas_alteradas(campanha_id, fichas_alteradas)
    return {"loot": loot, "entregues": entregues, "versao": versao}


@router.post("/{sessao_id}/participantes/{participante_id}/aflicoes")
def mexer_na_aflicao(
    sessao_id: UUID,
    participante_id: UUID,
    payload: ParticipantAfflictionInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """O Mestre aplica, muda de estágio ou tira uma aflição de um personagem
    em cena. Grava na ficha (ficha.aflicoesAtivas), que é onde o jogador
    acompanha e rola os testes de intervalo."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        participante = connection.execute(
            "SELECT personagem_id, nome FROM sessao_participantes WHERE id=%s AND sessao_id=%s",
            (participante_id, sessao_id),
        ).fetchone()
        if not participante:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="participante nao encontrado")
        if not participante["personagem_id"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="aflicao fica na ficha; este participante nao tem ficha",
            )
        personagem = connection.execute(
            "SELECT id, ficha FROM personagens WHERE id=%s AND status='ativo' FOR UPDATE",
            (participante["personagem_id"],),
        ).fetchone()
        if not personagem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="personagem nao encontrado")
        ficha = dict(personagem["ficha"]) if isinstance(personagem["ficha"], dict) else {}
        ativas = [item for item in (ficha.get("aflicoesAtivas") or []) if isinstance(item, dict)]
        existente = next((item for item in ativas if item.get("aflicaoId") == payload.aflicao_id), None)

        if payload.acao == "remover":
            if existente is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="essa aflicao nao esta na ficha")
            ativas = [item for item in ativas if item is not existente]
        elif payload.acao == "estagio":
            if existente is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="essa aflicao nao esta na ficha")
            existente["estagio"] = payload.estagio
            existente["incubando"] = False
        elif existente is not None:
            # Nova exposição à mesma aflição: o Mestre decide o estágio.
            existente["estagio"] = max(int(existente.get("estagio") or 1), payload.estagio)
        else:
            ativas.append({
                "id": f"{payload.aflicao_id}-{uuid4().hex[:10]}",
                "aflicaoId": payload.aflicao_id,
                "estagio": payload.estagio,
                "desde": datetime.now(timezone.utc).isoformat(),
                "incubando": payload.incubando,
                "ultimoTeste": None,
            })
        ficha["aflicoesAtivas"] = ativas
        status_ficha = dict(ficha.get("status")) if isinstance(ficha.get("status"), dict) else {}
        if payload.cansaco and payload.acao != "remover":
            atual = status_ficha.get("cansacoAtual")
            atual = int(atual) if isinstance(atual, (int, float)) and not isinstance(atual, bool) else 0
            status_ficha["cansacoAtual"] = min(CANSACO_MAXIMO, max(0, atual) + payload.cansaco)
            ficha["status"] = status_ficha
        versao_ficha = connection.execute(
            """
            UPDATE personagens SET ficha=%s, versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s RETURNING versao
            """,
            (Jsonb(ficha), personagem["id"]),
        ).fetchone()["versao"]
        record_audit(
            connection,
            action=f"sessao.aflicao_{payload.acao}",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="personagem",
            target_id=str(personagem["id"]),
            details={"aflicao_id": payload.aflicao_id, "estagio": payload.estagio, "cansaco": payload.cansaco},
        )
        versao = _tocar(connection, sessao_id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "aflicao_atualizada", versao)
    _avisar_fichas_alteradas(campanha_id, [{"personagem_id": personagem["id"], "versao": versao_ficha}])
    return {
        "aflicoes": _aflicoes_da_ficha(ativas),
        "cansaco_atual": status_ficha.get("cansacoAtual"),
        "versao": versao,
    }


def _passar_rodada_condicoes(connection, sessao_id) -> None:
    """Passa uma rodada para as condições em cena: decrementa a duração e
    remove as que zeraram. Grava só quem mudou."""
    linhas = connection.execute(
        "SELECT id, condicoes FROM sessao_participantes WHERE sessao_id=%s",
        (sessao_id,),
    ).fetchall()
    for linha in linhas:
        antes = normalizar_condicoes(linha["condicoes"])
        depois = decrementar_condicoes(linha["condicoes"])
        if depois != antes:
            connection.execute(
                """
                UPDATE sessao_participantes
                SET condicoes=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (Jsonb(depois), linha["id"]),
            )


@router.post("/{sessao_id}/turno")
def controlar_turno(
    sessao_id: UUID,
    payload: SessionTurnInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Inicia o combate, ordena por iniciativa e anda com os turnos."""
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM sessao_participantes WHERE sessao_id=%s",
            (sessao_id,),
        ).fetchone()["total"]

        rodada = int(sessao["rodada"])
        indice = int(sessao["turno_indice"])
        em_combate = bool(sessao["em_combate"])
        nova_rodada = False

        if payload.acao == "ordenar":
            linhas = connection.execute(
                """
                SELECT id FROM sessao_participantes WHERE sessao_id=%s
                ORDER BY iniciativa DESC, nome
                """,
                (sessao_id,),
            ).fetchall()
            for posicao, linha in enumerate(linhas):
                connection.execute(
                    "UPDATE sessao_participantes SET ordem=%s WHERE id=%s",
                    (posicao, linha["id"]),
                )
            indice = 0
        elif payload.acao == "iniciar":
            if not total:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="adicione participantes antes de iniciar o combate",
                )
            em_combate = True
            rodada = 1
            indice = 0
        elif payload.acao == "encerrar":
            em_combate = False
            indice = 0
        elif payload.acao == "proximo" and total:
            indice += 1
            if indice >= total:
                indice = 0
                rodada += 1
                nova_rodada = True
        elif payload.acao == "anterior" and total:
            indice -= 1
            if indice < 0:
                indice = max(0, total - 1)
                rodada = max(1, rodada - 1)

        connection.execute(
            """
            UPDATE sessoes_mesa
            SET rodada=%s, turno_indice=%s, em_combate=%s,
                versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (rodada, indice, em_combate, sessao_id),
        )
        if nova_rodada:
            _passar_rodada_condicoes(connection, sessao_id)
        cansados: list[dict] = []
        if payload.acao == "iniciar":
            iniciar_marcas(connection, sessao_id)
            livro_da_verdade.registrar_encontro_sem_quebrar(
                connection, campanha_id=sessao["campanha_id"], sessao_id=sessao_id
            )
        elif payload.acao == "encerrar":
            cansados = encerrar_combate_e_cansar(connection, sessao_id)
        atualizada = _sessao_ativa(connection, sessao["campanha_id"])
        estado = _montar_estado(connection, atualizada, sessao["_papel_comando"], user.id)
        campanha_id = sessao["campanha_id"]
        # Quem está na vez, para a ficha do jogador avisar "É a sua vez!". Vai só
        # o id do personagem (inimigo e NPC ficam sem id): o nome de criatura
        # escondida nunca sai por aqui.
        da_vez = connection.execute(
            """
            SELECT personagem_id, nome, tipo, visibilidade FROM sessao_participantes
            WHERE sessao_id=%s
            ORDER BY ordem, iniciativa DESC, nome
            OFFSET %s LIMIT 1
            """,
            (sessao_id, indice),
        ).fetchone()
        # Linha do tempo do replay. Criatura escondida entra sem o nome.
        if payload.acao == "iniciar":
            registrar_evento(connection, campanha_id, sessao_id, "combate", "O combate começou.")
        elif payload.acao == "encerrar":
            registrar_evento(connection, campanha_id, sessao_id, "combate", "O combate terminou.")
            if cansados:
                nomes = ", ".join(item["nome"] for item in cansados)
                registrar_evento(
                    connection, campanha_id, sessao_id, "combate",
                    f"Combate intenso: {nomes} ganha 1 de Cansaço." if len(cansados) == 1
                    else f"Combate intenso: {nomes} ganham 1 de Cansaço.",
                )
        elif payload.acao in ("proximo", "anterior") and em_combate and da_vez:
            escondida = da_vez["tipo"] == "inimigo" and da_vez["visibilidade"] in ("oculto", "desconhecido")
            quem = "uma criatura desconhecida" if escondida else da_vez["nome"]
            registrar_evento(
                connection, campanha_id, sessao_id, "turno",
                f"Rodada {rodada}: vez de {quem}.",
            )
    # A ficha de quem cansou mudou no servidor: sem este aviso a ficha aberta
    # ficaria com a versão antiga e o próximo autosave viraria conflito.
    _avisar_fichas_alteradas(campanha_id, cansados)
    live_session.publicar(
        campanha_id,
        "turno",
        estado["sessao"]["versao"],
        {
            "acao": payload.acao,
            "em_combate": em_combate,
            "rodada": rodada,
            "personagem_id": str(da_vez["personagem_id"]) if da_vez and da_vez["personagem_id"] else None,
        },
    )
    return estado


@router.post("/{sessao_id}/iniciativa")
def sincronizar_iniciativa(
    sessao_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Copia a iniciativa fixa das fichas e ordena a fila, sem rolar dados.

    NPCs e inimigos sem ficha mantêm o número definido pelo mestre.
    """
    with database.connection() as connection:
        sessao = _sessao_sob_comando(connection, sessao_id, user.id)
        participantes = connection.execute(
            """
            SELECT sp.id, sp.nome, sp.tipo, sp.personagem_id, sp.iniciativa, sp.condicoes, p.ficha
            FROM sessao_participantes sp
            LEFT JOIN personagens p ON p.id=sp.personagem_id
            WHERE sp.sessao_id=%s
            """,
            (sessao_id,),
        ).fetchall()
        if not participantes:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="adicione participantes antes de ordenar a iniciativa",
            )

        iniciativas = []
        for participante in participantes:
            valor = (
                iniciativa_fixa(participante["ficha"], condicoes=participante["condicoes"])
                if participante["personagem_id"] and participante["ficha"]
                else int(participante["iniciativa"])
            )
            iniciativas.append({
                "linha": participante,
                "valor": valor,
                "sabedoria": sabedoria_desempate(participante["ficha"]),
            })
        # Empate: maior Sabedoria; persistindo, personagens agem antes de NPCs.
        iniciativas.sort(key=lambda item: (
            -item["valor"],
            -item["sabedoria"],
            0 if item["linha"]["tipo"] == "jogador" else 1,
            item["linha"]["nome"],
        ))

        for posicao, item in enumerate(iniciativas):
            connection.execute(
                """
                UPDATE sessao_participantes
                SET iniciativa=%s, ordem=%s, atualizado_em=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (item["valor"], posicao, item["linha"]["id"]),
            )

        connection.execute(
            """
            UPDATE sessoes_mesa
            SET turno_indice=0, versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (sessao_id,),
        )
        record_audit(
            connection,
            action="sessao.iniciativa_sincronizada",
            actor_user_id=user.id,
            campaign_id=sessao["campanha_id"],
            target_type="sessao",
            target_id=str(sessao_id),
            details={
                "participantes": len(iniciativas),
                "origem": "valor_fixo_da_ficha",
            },
        )
        atualizada = _sessao_ativa(connection, sessao["campanha_id"])
        estado = _montar_estado(connection, atualizada, sessao["_papel_comando"], user.id)
        campanha_id = sessao["campanha_id"]
    live_session.publicar(campanha_id, "iniciativa", estado["sessao"]["versao"])
    return estado


@router.get("/{campanha_id}/eventos")
async def acompanhar(
    campanha_id: UUID,
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Fluxo SSE: avisa que algo mudou; o cliente refaz o GET da sessão."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)

    async def eventos():
        fila = live_session.assinar(campanha_id)
        try:
            yield b": conectado\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    mensagem = await asyncio.wait_for(fila.get(), timeout=20)
                except asyncio.TimeoutError:
                    # Comentário periódico: mantém a conexão viva atravessando
                    # proxies que cortam conexões ociosas.
                    yield b": ping\n\n"
                    continue
                yield f"data: {mensagem}\n\n".encode("utf-8")
        finally:
            live_session.cancelar(campanha_id, fila)

    return StreamingResponse(
        eventos(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
