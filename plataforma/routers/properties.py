from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from core.audit import record_audit
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from core import live_session
from schemas import (
    CampaignPermissionGrantInput,
    CampaignPropertyInput,
    CampaignPropertyInstallationInput,
    CampaignPropertyMigrationInput,
)

router = APIRouter(prefix="/campanhas/{campaign_id}/propriedades", tags=["propriedades-campanha"])

def _require_property_permission(connection, campaign_id: UUID, property_id: UUID, user_id: UUID, required_level: str):
    access = campaign_access(connection, campaign_id, user_id)
    if access.manages_content: 
        return access
        
    prop = connection.execute(
        """
        SELECT proprietario_personagem_id, nivel_acesso_campanha
        FROM campanha_propriedades WHERE id=%s AND campanha_id=%s
        """,
        (property_id, campaign_id),
    ).fetchone()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada.")
        
    if prop["proprietario_personagem_id"]:
        char_owner = connection.execute(
            "SELECT dono_usuario_id FROM personagens WHERE id=%s AND campanha_id=%s",
            (prop["proprietario_personagem_id"], campaign_id)
        ).fetchone()
        if char_owner and char_owner["dono_usuario_id"] == user_id:
            return access 
            
    level_map = {"nenhum": 0, "visualizar": 1, "utilizar": 2, "gerenciar": 3}
    req_score = level_map.get(required_level, 3)
    
    camp_score = level_map.get(prop["nivel_acesso_campanha"], 0)
    if camp_score >= req_score:
        return access
        
    user_chars = connection.execute(
        "SELECT id FROM personagens WHERE dono_usuario_id=%s AND campanha_id=%s",
        (user_id, campaign_id)
    ).fetchall()
    
    user_char_ids = [c["id"] for c in user_chars]
    if user_char_ids:
        perm = connection.execute(
            """
            SELECT nivel_permissao FROM campanha_propriedade_permissoes 
            WHERE propriedade_id=%s AND personagem_id = ANY(%s)
            """,
            (property_id, user_char_ids)
        ).fetchall()
        for p in perm:
            if level_map.get(p["nivel_permissao"], 0) >= req_score:
                return access
                
    raise HTTPException(status_code=403, detail="Permissão insuficiente para esta propriedade.")


def _bump_property_version(connection, property_id: UUID) -> int:
    row = connection.execute(
        "UPDATE campanha_propriedades SET versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP WHERE id=%s RETURNING versao",
        (property_id,)
    ).fetchone()
    return row["versao"] if row else 0


@router.get("")
def list_properties(
    campaign_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)

        properties = connection.execute(
            """
            SELECT id, proprietario_personagem_id, nome, tipo, localizacao, versao, nivel_acesso_campanha
            FROM campanha_propriedades
            WHERE campanha_id=%s
            ORDER BY criado_em
            """,
            (campaign_id,)
        ).fetchall()

        if not access.manages_content:
            user_char_ids = {
                c["id"]
                for c in connection.execute(
                    "SELECT id FROM personagens WHERE dono_usuario_id=%s AND campanha_id=%s",
                    (user.id, campaign_id)
                ).fetchall()
            }
            permitted_ids = set()
            if user_char_ids:
                permitted_ids = {
                    p["propriedade_id"]
                    for p in connection.execute(
                        "SELECT DISTINCT propriedade_id FROM campanha_propriedade_permissoes WHERE personagem_id = ANY(%s)",
                        (list(user_char_ids),)
                    ).fetchall()
                }
            properties = [
                p for p in properties
                if p["nivel_acesso_campanha"] != "nenhum"
                or p["proprietario_personagem_id"] in user_char_ids
                or p["id"] in permitted_ids
            ]

    return {"propriedades": [dict(p) for p in properties]}


@router.get("/{property_id}")
def get_property(
    campaign_id: UUID,
    property_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "visualizar")
        
        prop = connection.execute(
            "SELECT * FROM campanha_propriedades WHERE id=%s",
            (property_id,)
        ).fetchone()
        
        instalacoes = connection.execute(
            "SELECT * FROM campanha_propriedade_instalacoes WHERE propriedade_id=%s",
            (property_id,)
        ).fetchall()
        
        permissoes = connection.execute(
            "SELECT * FROM campanha_propriedade_permissoes WHERE propriedade_id=%s",
            (property_id,)
        ).fetchall()
        
    res = dict(prop)
    res["instalacoes"] = [dict(i) for i in instalacoes]
    res["permissoes"] = [dict(p) for p in permissoes]
    return res


@router.post("", status_code=status.HTTP_201_CREATED)
def create_property(
    campaign_id: UUID,
    payload: CampaignPropertyInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if not access.manages_content:
            raise HTTPException(status_code=403, detail="Apenas mestres/assistentes podem criar propriedades diretamente.")
            
        property_id = uuid4()
        connection.execute(
            """
            INSERT INTO campanha_propriedades (
                id, campanha_id, nome, tipo, localizacao, descricao, 
                qualidade_quartos, patamar, valor_aquisicao, manutencao,
                nivel_acesso_campanha
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                property_id, campaign_id, payload.nome, payload.tipo, payload.localizacao, payload.descricao,
                payload.qualidade_quartos, payload.patamar, payload.valor_aquisicao, payload.manutencao,
                payload.nivel_acesso_campanha
            )
        )
        
        record_audit(
            connection,
            action="propriedade.criada",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_propriedade",
            target_id=str(property_id),
            details={"nome": payload.nome}
        )
        
        live_session.publicar(campaign_id, "propriedade_criada", 1, {"propriedade_id": str(property_id)})
        
    return {"id": property_id}


@router.put("/{property_id}")
def update_property(
    campaign_id: UUID,
    property_id: UUID,
    payload: CampaignPropertyInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")
        
        row = connection.execute(
            """
            UPDATE campanha_propriedades SET
                nome=%s, tipo=%s, localizacao=%s, descricao=%s,
                qualidade_quartos=%s, patamar=%s, valor_aquisicao=%s, manutencao=%s,
                nivel_acesso_campanha=%s,
                versao = versao + 1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND campanha_id=%s
            RETURNING versao
            """,
            (
                payload.nome, payload.tipo, payload.localizacao, payload.descricao,
                payload.qualidade_quartos, payload.patamar, payload.valor_aquisicao, payload.manutencao,
                payload.nivel_acesso_campanha,
                property_id, campaign_id
            )
        ).fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Propriedade não encontrada.")
            
        record_audit(
            connection,
            action="propriedade.atualizada",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_propriedade",
            target_id=str(property_id)
        )
        
        live_session.publicar(campaign_id, "propriedade_atualizada", row["versao"], {"propriedade_id": str(property_id)})
        
    return {"versao": row["versao"]}


@router.post("/migrar", status_code=status.HTTP_201_CREATED)
def migrate_property(
    campaign_id: UUID,
    payload: CampaignPropertyMigrationInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Converte uma entrada de `ficha.propriedades` numa entidade real de
    campanha (instalações, permissões por personagem, nível de acesso).

    Decisão de design (mantida deliberadamente, ver auditoria 2026-08 achado 12
    e validação pós-correção): diferente de veículo, comprar uma `propriedade`
    JÁ cria a entrada em `ficha.propriedades` automaticamente (routers/shop.py).
    Ainda assim, essa entrada só vira algo com instalações/permissões reais de
    campanha quando alguém chama este endpoint — de novo, um passo manual
    separado, pelo mesmo motivo do veículo: enquanto é só um campo da ficha,
    fica mais simples de ajustar/remover sem mexer em permissões de campanha
    inteiras. Automatizar exigiria decidir isso conscientemente, não como
    efeito colateral de uma correção técnica."""
    with database.connection() as connection:
        char_owner = connection.execute(
            "SELECT dono_usuario_id FROM personagens WHERE id=%s AND campanha_id=%s AND status='ativo'",
            (payload.personagem_id, campaign_id)
        ).fetchone()

        if not char_owner:
            raise HTTPException(status_code=404, detail="Personagem não encontrado.")

        if char_owner["dono_usuario_id"] != user.id:
            access = campaign_access(connection, campaign_id, user.id)
            if not access.manages_content:
                raise HTTPException(status_code=403, detail="Não é dono do personagem.")

        # Propriedades não vêm de um item de inventário (não são compráveis na loja):
        # nascem em ficha.propriedades e chegam prontas no payload. `propriedade_local_id`
        # serve só de chave de idempotência, como origem_item_id faz para veículos.
        already = connection.execute(
            "SELECT id FROM campanha_propriedades WHERE origem_item_id=%s AND origem_personagem_id=%s",
            (payload.propriedade_local_id, payload.personagem_id)
        ).fetchone()
        if already:
            return {"id": already["id"], "migrated_already": True}

        property_id = uuid4()

        connection.execute(
            """
            INSERT INTO campanha_propriedades (
                id, campanha_id, proprietario_personagem_id, origem_item_id, origem_personagem_id,
                nome, tipo, localizacao, descricao, qualidade_quartos, patamar,
                valor_aquisicao, manutencao, nivel_acesso_campanha
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            """,
            (
                property_id, campaign_id, payload.personagem_id, payload.propriedade_local_id, payload.personagem_id,
                payload.nome,
                payload.tipo,
                payload.localizacao,
                payload.descricao,
                payload.qualidade_quartos,
                payload.patamar,
                payload.valor_aquisicao,
                payload.manutencao,
                "utilizar" if payload.compartilhar_campanha else "nenhum"
            )
        )

        for inst in payload.instalacoes:
            connection.execute(
                """
                INSERT INTO campanha_propriedade_instalacoes (id, propriedade_id, nome, nivel, espacos_ocupados)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (uuid4(), property_id, inst.nome, inst.nivel, inst.espacos)
            )

        record_audit(
            connection,
            action="propriedade.migrada",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_propriedade",
            target_id=str(property_id)
        )
        
        live_session.publicar(campaign_id, "propriedade_criada", 1, {"propriedade_id": str(property_id)})
        live_session.publicar(campaign_id, "personagem_atualizado", 1)
        
    return {"id": property_id}


@router.delete("/{property_id}")
def delete_property(
    campaign_id: UUID,
    property_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")
        
        row = connection.execute(
            "DELETE FROM campanha_propriedades WHERE id=%s RETURNING id",
            (property_id,)
        ).fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Propriedade não encontrada.")
            
        record_audit(
            connection,
            action="propriedade.removida",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_propriedade",
            target_id=str(property_id)
        )
        
        live_session.publicar(campaign_id, "propriedade_removida", 1, {"propriedade_id": str(property_id)})

    return {"id": property_id}


# --- Permissões individuais ---

@router.put("/{property_id}/permissoes", status_code=status.HTTP_200_OK)
def set_property_permission(
    campaign_id: UUID,
    property_id: UUID,
    payload: CampaignPermissionGrantInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")

        personagem = connection.execute(
            "SELECT id FROM personagens WHERE id=%s AND campanha_id=%s",
            (payload.personagem_id, campaign_id)
        ).fetchone()
        if not personagem:
            raise HTTPException(status_code=404, detail="Personagem não encontrado nesta campanha.")

        connection.execute(
            """
            INSERT INTO campanha_propriedade_permissoes (propriedade_id, personagem_id, nivel_permissao)
            VALUES (%s, %s, %s)
            ON CONFLICT (propriedade_id, personagem_id) DO UPDATE SET nivel_permissao = EXCLUDED.nivel_permissao
            """,
            (property_id, payload.personagem_id, payload.nivel_permissao)
        )

        versao = _bump_property_version(connection, property_id)
        record_audit(
            connection, action="propriedade.permissao_definida", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_propriedade", target_id=str(property_id),
            details={"personagem_id": str(payload.personagem_id), "nivel_permissao": payload.nivel_permissao}
        )
        live_session.publicar(campaign_id, "propriedade_atualizada", versao, {"propriedade_id": str(property_id)})

    return {"versao": versao}


@router.delete("/{property_id}/permissoes/{personagem_id}")
def remove_property_permission(
    campaign_id: UUID,
    property_id: UUID,
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")

        connection.execute(
            "DELETE FROM campanha_propriedade_permissoes WHERE propriedade_id=%s AND personagem_id=%s",
            (property_id, personagem_id)
        )

        versao = _bump_property_version(connection, property_id)
        record_audit(
            connection, action="propriedade.permissao_removida", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_propriedade", target_id=str(property_id),
            details={"personagem_id": str(personagem_id)}
        )
        live_session.publicar(campaign_id, "propriedade_atualizada", versao, {"propriedade_id": str(property_id)})

    return {"versao": versao}


# --- Instalações ---

@router.post("/{property_id}/instalacoes", status_code=status.HTTP_201_CREATED)
def add_property_installation(
    campaign_id: UUID,
    property_id: UUID,
    payload: CampaignPropertyInstallationInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")

        prop = connection.execute(
            "SELECT id FROM campanha_propriedades WHERE id=%s", (property_id,)
        ).fetchone()
        if not prop:
            raise HTTPException(status_code=404, detail="Propriedade não encontrada.")

        installation_id = uuid4()
        connection.execute(
            """
            INSERT INTO campanha_propriedade_instalacoes (id, propriedade_id, nome, nivel, espacos_ocupados)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (installation_id, property_id, payload.nome, payload.nivel, payload.espacos_ocupados)
        )

        versao = _bump_property_version(connection, property_id)
        record_audit(
            connection, action="propriedade.instalacao_adicionada", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_propriedade", target_id=str(property_id),
            details={"nome": payload.nome}
        )
        live_session.publicar(campaign_id, "propriedade_atualizada", versao, {"propriedade_id": str(property_id)})

    return {"id": installation_id, "versao": versao}


@router.patch("/{property_id}/instalacoes/{installation_id}")
def update_property_installation(
    campaign_id: UUID,
    property_id: UUID,
    installation_id: UUID,
    payload: CampaignPropertyInstallationInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")

        row = connection.execute(
            """
            UPDATE campanha_propriedade_instalacoes SET nome=%s, nivel=%s, espacos_ocupados=%s
            WHERE id=%s AND propriedade_id=%s
            RETURNING id
            """,
            (payload.nome, payload.nivel, payload.espacos_ocupados, installation_id, property_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Instalação não encontrada.")

        versao = _bump_property_version(connection, property_id)
        live_session.publicar(campaign_id, "propriedade_atualizada", versao, {"propriedade_id": str(property_id)})

    return {"versao": versao}


@router.delete("/{property_id}/instalacoes/{installation_id}")
def remove_property_installation(
    campaign_id: UUID,
    property_id: UUID,
    installation_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_property_permission(connection, campaign_id, property_id, user.id, "gerenciar")

        row = connection.execute(
            "DELETE FROM campanha_propriedade_instalacoes WHERE id=%s AND propriedade_id=%s RETURNING id",
            (installation_id, property_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Instalação não encontrada.")

        versao = _bump_property_version(connection, property_id)
        record_audit(
            connection, action="propriedade.instalacao_removida", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_propriedade", target_id=str(property_id)
        )
        live_session.publicar(campaign_id, "propriedade_atualizada", versao, {"propriedade_id": str(property_id)})

    return {"versao": versao}
