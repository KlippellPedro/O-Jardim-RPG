from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.types.json import Jsonb

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
    CampaignVehicleInput,
    CampaignVehicleDeltaInput,
    CampaignVehicleInventoryItemInput,
    CampaignVehicleInventoryQuantityInput,
    CampaignVehicleMigrationInput,
    CampaignVehicleModuleInput,
    CampaignVehicleModuleToggleInput,
    CampaignVehicleOccupantInput,
)

router = APIRouter(prefix="/campanhas/{campaign_id}/veiculos", tags=["veiculos-campanha"])

def _require_vehicle_permission(connection, campaign_id: UUID, vehicle_id: UUID, user_id: UUID, required_level: str):
    """
    Validates if the user has permission to access the vehicle.
    `required_level` can be 'visualizar', 'utilizar', 'gerenciar'.
    Mestre always has full control. Proprietario always has full control.
    """
    access = campaign_access(connection, campaign_id, user_id)
    if access.manages_content: # Mestre/Assistente
        return access
        
    vehicle = connection.execute(
        """
        SELECT proprietario_personagem_id, nivel_acesso_campanha
        FROM campanha_veiculos WHERE id=%s AND campanha_id=%s
        """,
        (vehicle_id, campaign_id),
    ).fetchone()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado.")
        
    # Check if user owns the character that is the proprietor
    if vehicle["proprietario_personagem_id"]:
        char_owner = connection.execute(
            "SELECT dono_usuario_id FROM personagens WHERE id=%s AND campanha_id=%s",
            (vehicle["proprietario_personagem_id"], campaign_id)
        ).fetchone()
        if char_owner and char_owner["dono_usuario_id"] == user_id:
            return access # Full control
            
    # Check individual permission
    # For now we will allow it if campaign level access grants it
    level_map = {"nenhum": 0, "visualizar": 1, "utilizar": 2, "gerenciar": 3}
    req_score = level_map.get(required_level, 3)
    
    camp_score = level_map.get(vehicle["nivel_acesso_campanha"], 0)
    if camp_score >= req_score:
        return access
        
    # Check character permissions linked to this user
    user_chars = connection.execute(
        "SELECT id FROM personagens WHERE dono_usuario_id=%s AND campanha_id=%s",
        (user_id, campaign_id)
    ).fetchall()
    
    user_char_ids = [c["id"] for c in user_chars]
    if user_char_ids:
        perm = connection.execute(
            """
            SELECT nivel_permissao FROM campanha_veiculo_permissoes 
            WHERE veiculo_id=%s AND personagem_id = ANY(%s)
            """,
            (vehicle_id, user_char_ids)
        ).fetchall()
        for p in perm:
            if level_map.get(p["nivel_permissao"], 0) >= req_score:
                return access
                
    raise HTTPException(status_code=403, detail="Permissão insuficiente para este veículo.")


def _bump_vehicle_version(connection, vehicle_id: UUID) -> int:
    row = connection.execute(
        "UPDATE campanha_veiculos SET versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP WHERE id=%s RETURNING versao",
        (vehicle_id,)
    ).fetchone()
    return row["versao"] if row else 0


@router.get("")
def list_vehicles(
    campaign_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)

        vehicles = connection.execute(
            """
            SELECT id, proprietario_personagem_id, nome, imagem_url, vida_atual, vida_maxima,
                   combustivel_atual, combustivel_maximo, capacidade, versao, nivel_acesso_campanha
            FROM campanha_veiculos
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
                    p["veiculo_id"]
                    for p in connection.execute(
                        "SELECT DISTINCT veiculo_id FROM campanha_veiculo_permissoes WHERE personagem_id = ANY(%s)",
                        (list(user_char_ids),)
                    ).fetchall()
                }
            vehicles = [
                v for v in vehicles
                if v["nivel_acesso_campanha"] != "nenhum"
                or v["proprietario_personagem_id"] in user_char_ids
                or v["id"] in permitted_ids
            ]

    return {"veiculos": [dict(v) for v in vehicles]}


@router.get("/{vehicle_id}")
def get_vehicle(
    campaign_id: UUID,
    vehicle_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "visualizar")
        
        vehicle = connection.execute(
            "SELECT * FROM campanha_veiculos WHERE id=%s",
            (vehicle_id,)
        ).fetchone()
        
        modulos = connection.execute(
            "SELECT * FROM campanha_veiculo_modulos WHERE veiculo_id=%s",
            (vehicle_id,)
        ).fetchall()
        
        ocupantes = connection.execute(
            "SELECT * FROM campanha_veiculo_ocupantes WHERE veiculo_id=%s",
            (vehicle_id,)
        ).fetchall()
        
        inventario = connection.execute(
            "SELECT * FROM campanha_veiculo_inventario WHERE veiculo_id=%s",
            (vehicle_id,)
        ).fetchall()
        
        permissoes = connection.execute(
            "SELECT * FROM campanha_veiculo_permissoes WHERE veiculo_id=%s",
            (vehicle_id,)
        ).fetchall()
        
    res = dict(vehicle)
    res["modulos"] = [dict(m) for m in modulos]
    res["ocupantes"] = [dict(o) for o in ocupantes]
    res["inventario"] = [dict(i) for i in inventario]
    res["permissoes"] = [dict(p) for p in permissoes]
    return res


@router.post("", status_code=status.HTTP_201_CREATED)
def create_vehicle(
    campaign_id: UUID,
    payload: CampaignVehicleInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        access = campaign_access(connection, campaign_id, user.id)
        if not access.manages_content:
            raise HTTPException(status_code=403, detail="Apenas mestres/assistentes podem criar veículos diretamente.")
            
        vehicle_id = uuid4()
        connection.execute(
            """
            INSERT INTO campanha_veiculos (
                id, campanha_id, nome, imagem_url, descricao, 
                vida_maxima, vida_atual, combustivel_maximo, combustivel_atual,
                defesa, resistencia, deslocamento, manobrabilidade, cobertura,
                capacidade, tripulacao_minima, sistemas_ativos_maximos, espacos_modulos_maximos, espacos_base,
                nivel_acesso_campanha
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                vehicle_id, campaign_id, payload.nome, payload.imagem_url, payload.descricao,
                payload.vida_maxima, payload.vida_maxima, payload.combustivel_maximo, payload.combustivel_maximo,
                payload.defesa, payload.resistencia, payload.deslocamento, payload.manobrabilidade, payload.cobertura,
                payload.capacidade, payload.tripulacao_minima, payload.sistemas_ativos_maximos, payload.espacos_modulos_maximos, payload.espacos_base,
                payload.nivel_acesso_campanha
            )
        )
        
        record_audit(
            connection,
            action="veiculo.criado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_veiculo",
            target_id=str(vehicle_id),
            details={"nome": payload.nome}
        )
        
        live_session.publicar(campaign_id, "veiculo_criado", 1, {"veiculo_id": str(vehicle_id)})
        
    return {"id": vehicle_id}


@router.put("/{vehicle_id}")
def update_vehicle(
    campaign_id: UUID,
    vehicle_id: UUID,
    payload: CampaignVehicleInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")
        
        row = connection.execute(
            """
            UPDATE campanha_veiculos SET
                nome=%s, imagem_url=%s, descricao=%s,
                vida_maxima=%s, combustivel_maximo=%s,
                defesa=%s, resistencia=%s, deslocamento=%s, manobrabilidade=%s, cobertura=%s,
                capacidade=%s, tripulacao_minima=%s, sistemas_ativos_maximos=%s, espacos_modulos_maximos=%s, espacos_base=%s,
                nivel_acesso_campanha=%s,
                versao = versao + 1,
                atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND campanha_id=%s
            RETURNING versao
            """,
            (
                payload.nome, payload.imagem_url, payload.descricao,
                payload.vida_maxima, payload.combustivel_maximo,
                payload.defesa, payload.resistencia, payload.deslocamento, payload.manobrabilidade, payload.cobertura,
                payload.capacidade, payload.tripulacao_minima, payload.sistemas_ativos_maximos, payload.espacos_modulos_maximos, payload.espacos_base,
                payload.nivel_acesso_campanha,
                vehicle_id, campaign_id
            )
        ).fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")
            
        record_audit(
            connection,
            action="veiculo.atualizado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_veiculo",
            target_id=str(vehicle_id)
        )
        
        live_session.publicar(campaign_id, "veiculo_atualizado", row["versao"], {"veiculo_id": str(vehicle_id)})
        
    return {"versao": row["versao"]}


@router.patch("/{vehicle_id}/delta")
def update_vehicle_delta(
    campaign_id: UUID,
    vehicle_id: UUID,
    payload: CampaignVehicleDeltaInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "utilizar")
        
        vehicle = connection.execute(
            "SELECT vida_atual, vida_maxima, combustivel_atual, combustivel_maximo, versao FROM campanha_veiculos WHERE id=%s FOR UPDATE",
            (vehicle_id,)
        ).fetchone()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")
            
        if vehicle["versao"] != payload.versao:
            raise HTTPException(status_code=409, detail="Conflito de versão. Alguém atualizou o veículo.")
            
        new_vida = vehicle["vida_atual"]
        if payload.delta_vida is not None:
            new_vida = max(0, min(vehicle["vida_maxima"], new_vida + payload.delta_vida))
            
        new_comb = vehicle["combustivel_atual"]
        if payload.delta_combustivel is not None:
            new_comb = max(0, min(vehicle["combustivel_maximo"], new_comb + payload.delta_combustivel))
            
        row = connection.execute(
            """
            UPDATE campanha_veiculos SET
                vida_atual=%s, combustivel_atual=%s, versao=versao+1, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s
            RETURNING versao
            """,
            (new_vida, new_comb, vehicle_id)
        ).fetchone()
        
        live_session.publicar(
            campaign_id, 
            "veiculo_status_alterado", 
            row["versao"], 
            {"veiculo_id": str(vehicle_id), "vida_atual": new_vida, "combustivel_atual": new_comb}
        )
        
    return {"versao": row["versao"], "vida_atual": new_vida, "combustivel_atual": new_comb}


@router.post("/migrar", status_code=status.HTTP_201_CREATED)
def migrate_vehicle(
    campaign_id: UUID,
    payload: CampaignVehicleMigrationInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Converte um item `veiculo-completo` do inventário numa entidade real
    de campanha (PV, combustível, módulos, tripulação, permissões).

    Decisão de design (mantida deliberadamente, ver auditoria 2026-08 achado 12
    e validação pós-correção): comprar na loja NÃO chama isto automaticamente.
    A compra só cria uma linha comum de inventário (routers/shop.py não trata
    veiculo-completo de forma especial). Migrar é sempre um passo manual
    separado, disparado por quem tem posse/permissão do item.

    Por quê: enquanto o veículo é só um item de inventário, ele ainda pode ser
    negociado, dado de presente ou vendido como qualquer outro item — a
    entidade de campanha (este endpoint) não tem um fluxo de transferência
    equivalente. Automatizar a migração na compra fecharia essa janela sem
    que exista hoje um substituto para ela. Se um dia isso mudar, precisa ser
    uma decisão consciente de design, não um efeito colateral de uma correção
    técnica — por isso não foi alterado aqui."""
    with database.connection() as connection:
        # Check permissions for the character
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

        # Find item no inventário real (tabela inventario_personagem, não uma coluna em personagens)
        item = connection.execute(
            """
            SELECT titulo, dados FROM inventario_personagem
            WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s
            """,
            (campaign_id, payload.personagem_id, payload.item_id)
        ).fetchone()

        if not item:
            # Check if it was already migrated
            migrated = connection.execute(
                "SELECT id FROM campanha_veiculos WHERE origem_item_id=%s AND origem_personagem_id=%s",
                (payload.item_id, payload.personagem_id)
            ).fetchone()
            if migrated:
                return {"id": migrated["id"], "migrated_already": True}
            raise HTTPException(status_code=404, detail="Veículo não encontrado no inventário.")

        # Parse item
        nome = item["titulo"] or "Veículo"
        dados = item["dados"] or {}

        vehicle_id = uuid4()
        
        # Insert
        connection.execute(
            """
            INSERT INTO campanha_veiculos (
                id, campanha_id, proprietario_personagem_id, origem_item_id, origem_personagem_id,
                nome, vida_maxima, vida_atual, combustivel_maximo, combustivel_atual,
                defesa, resistencia, deslocamento, manobrabilidade, cobertura,
                capacidade, tripulacao_minima, sistemas_ativos_maximos, espacos_modulos_maximos, espacos_base,
                nivel_acesso_campanha
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s
            )
            """,
            (
                vehicle_id, campaign_id, payload.personagem_id, payload.item_id, payload.personagem_id,
                nome, 
                int(dados.get("vida", {}).get("maximo") or 0),
                int(dados.get("vida", {}).get("atual") or 0),
                int(dados.get("combustivel", {}).get("maximo") or 0),
                int(dados.get("combustivel", {}).get("atual") or 0),
                int(dados.get("defesa") or 0),
                int(dados.get("resistencia") or 0),
                int(dados.get("deslocamento") or 0),
                int(dados.get("manobrabilidade") or 0),
                dados.get("cobertura", "nenhuma"),
                int(dados.get("capacidade") or 0),
                int(dados.get("tripulacaoMinima") or 1),
                int(dados.get("sistemasAtivosMaximos") or 1),
                int(dados.get("sistemasAtivosMaximos") or 1), # fallback for espacos_modulos_maximos
                int(dados.get("espacosBase") or 1),
                "utilizar" if payload.compartilhar_campanha else "nenhum"
            )
        )
        
        # Remove from inventory
        connection.execute(
            "DELETE FROM inventario_personagem WHERE campanha_id=%s AND personagem_id=%s AND item_id=%s",
            (campaign_id, payload.personagem_id, payload.item_id)
        )
        
        record_audit(
            connection,
            action="veiculo.migrado",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_veiculo",
            target_id=str(vehicle_id)
        )
        
        live_session.publicar(campaign_id, "veiculo_criado", 1, {"veiculo_id": str(vehicle_id)})
        # Notify character change to refetch inventory
        live_session.publicar(campaign_id, "personagem_atualizado", 1)
        
    return {"id": vehicle_id}


@router.delete("/{vehicle_id}")
def delete_vehicle(
    campaign_id: UUID,
    vehicle_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")
        
        inv_count = connection.execute(
            "SELECT COUNT(id) AS q FROM campanha_veiculo_inventario WHERE veiculo_id=%s",
            (vehicle_id,)
        ).fetchone()
        
        if inv_count and inv_count["q"] > 0:
            raise HTTPException(status_code=400, detail="Remova todos os itens do inventário antes de deletar o veículo.")
            
        row = connection.execute(
            "DELETE FROM campanha_veiculos WHERE id=%s RETURNING id",
            (vehicle_id,)
        ).fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")
            
        record_audit(
            connection,
            action="veiculo.removido",
            actor_user_id=user.id,
            campaign_id=campaign_id,
            target_type="campanha_veiculo",
            target_id=str(vehicle_id)
        )
        
        live_session.publicar(campaign_id, "veiculo_removido", 1, {"veiculo_id": str(vehicle_id)})

    return {"id": vehicle_id}


# --- Permissões individuais ---

@router.put("/{vehicle_id}/permissoes", status_code=status.HTTP_200_OK)
def set_vehicle_permission(
    campaign_id: UUID,
    vehicle_id: UUID,
    payload: CampaignPermissionGrantInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")

        personagem = connection.execute(
            "SELECT id FROM personagens WHERE id=%s AND campanha_id=%s",
            (payload.personagem_id, campaign_id)
        ).fetchone()
        if not personagem:
            raise HTTPException(status_code=404, detail="Personagem não encontrado nesta campanha.")

        connection.execute(
            """
            INSERT INTO campanha_veiculo_permissoes (veiculo_id, personagem_id, nivel_permissao)
            VALUES (%s, %s, %s)
            ON CONFLICT (veiculo_id, personagem_id) DO UPDATE SET nivel_permissao = EXCLUDED.nivel_permissao
            """,
            (vehicle_id, payload.personagem_id, payload.nivel_permissao)
        )

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.permissao_definida", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id),
            details={"personagem_id": str(payload.personagem_id), "nivel_permissao": payload.nivel_permissao}
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


@router.delete("/{vehicle_id}/permissoes/{personagem_id}")
def remove_vehicle_permission(
    campaign_id: UUID,
    vehicle_id: UUID,
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")

        connection.execute(
            "DELETE FROM campanha_veiculo_permissoes WHERE veiculo_id=%s AND personagem_id=%s",
            (vehicle_id, personagem_id)
        )

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.permissao_removida", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id),
            details={"personagem_id": str(personagem_id)}
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


# --- Ocupantes (tripulação / passageiros) ---

@router.put("/{vehicle_id}/ocupantes", status_code=status.HTTP_200_OK)
def set_vehicle_occupant(
    campaign_id: UUID,
    vehicle_id: UUID,
    payload: CampaignVehicleOccupantInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")

        personagem = connection.execute(
            "SELECT id FROM personagens WHERE id=%s AND campanha_id=%s",
            (payload.personagem_id, campaign_id)
        ).fetchone()
        if not personagem:
            raise HTTPException(status_code=404, detail="Personagem não encontrado nesta campanha.")

        occupant_id = uuid4()
        connection.execute(
            """
            INSERT INTO campanha_veiculo_ocupantes (id, veiculo_id, personagem_id, papel, tipo)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (veiculo_id, personagem_id) DO UPDATE SET papel = EXCLUDED.papel, tipo = EXCLUDED.tipo
            RETURNING id
            """,
            (occupant_id, vehicle_id, payload.personagem_id, payload.papel, payload.tipo)
        ).fetchone()

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.ocupante_definido", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id),
            details={"personagem_id": str(payload.personagem_id), "tipo": payload.tipo}
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


@router.delete("/{vehicle_id}/ocupantes/{personagem_id}")
def remove_vehicle_occupant(
    campaign_id: UUID,
    vehicle_id: UUID,
    personagem_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")

        connection.execute(
            "DELETE FROM campanha_veiculo_ocupantes WHERE veiculo_id=%s AND personagem_id=%s",
            (vehicle_id, personagem_id)
        )

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.ocupante_removido", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id),
            details={"personagem_id": str(personagem_id)}
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


# --- Módulos ---

@router.post("/{vehicle_id}/modulos", status_code=status.HTTP_201_CREATED)
def add_vehicle_module(
    campaign_id: UUID,
    vehicle_id: UUID,
    payload: CampaignVehicleModuleInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")

        vehicle = connection.execute(
            "SELECT espacos_modulos_maximos FROM campanha_veiculos WHERE id=%s", (vehicle_id,)
        ).fetchone()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")

        usados = connection.execute(
            "SELECT COALESCE(SUM(espacos_ocupados), 0) AS total FROM campanha_veiculo_modulos WHERE veiculo_id=%s",
            (vehicle_id,)
        ).fetchone()["total"]
        if usados + payload.espacos_ocupados > vehicle["espacos_modulos_maximos"]:
            raise HTTPException(status_code=400, detail="Não há espaço suficiente para este módulo.")

        module_id = uuid4()
        connection.execute(
            """
            INSERT INTO campanha_veiculo_modulos (id, veiculo_id, nome, descricao, espacos_ocupados)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (module_id, vehicle_id, payload.nome, payload.descricao, payload.espacos_ocupados)
        )

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.modulo_adicionado", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id),
            details={"nome": payload.nome}
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"id": module_id, "versao": versao}


@router.patch("/{vehicle_id}/modulos/{module_id}")
def toggle_vehicle_module(
    campaign_id: UUID,
    vehicle_id: UUID,
    module_id: UUID,
    payload: CampaignVehicleModuleToggleInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "utilizar")

        if payload.ativo:
            vehicle = connection.execute(
                "SELECT sistemas_ativos_maximos FROM campanha_veiculos WHERE id=%s", (vehicle_id,)
            ).fetchone()
            if not vehicle:
                raise HTTPException(status_code=404, detail="Veículo não encontrado.")
            ativos = connection.execute(
                "SELECT COUNT(id) AS q FROM campanha_veiculo_modulos WHERE veiculo_id=%s AND ativo=TRUE AND id != %s",
                (vehicle_id, module_id)
            ).fetchone()["q"]
            if ativos >= vehicle["sistemas_ativos_maximos"]:
                raise HTTPException(status_code=400, detail="Número máximo de sistemas ativos atingido.")

        row = connection.execute(
            """
            UPDATE campanha_veiculo_modulos SET ativo=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND veiculo_id=%s
            RETURNING id
            """,
            (payload.ativo, module_id, vehicle_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Módulo não encontrado.")

        versao = _bump_vehicle_version(connection, vehicle_id)
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


@router.delete("/{vehicle_id}/modulos/{module_id}")
def remove_vehicle_module(
    campaign_id: UUID,
    vehicle_id: UUID,
    module_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "gerenciar")

        row = connection.execute(
            "DELETE FROM campanha_veiculo_modulos WHERE id=%s AND veiculo_id=%s RETURNING id",
            (module_id, vehicle_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Módulo não encontrado.")

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.modulo_removido", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id)
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


# --- Inventário / carga ---

@router.post("/{vehicle_id}/inventario", status_code=status.HTTP_201_CREATED)
def add_vehicle_cargo(
    campaign_id: UUID,
    vehicle_id: UUID,
    payload: CampaignVehicleInventoryItemInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "utilizar")

        vehicle = connection.execute(
            "SELECT id FROM campanha_veiculos WHERE id=%s", (vehicle_id,)
        ).fetchone()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado.")

        item_id = uuid4()
        connection.execute(
            """
            INSERT INTO campanha_veiculo_inventario
                (id, veiculo_id, item_id, nome, categoria, quantidade, espacos, descricao, dados, adicionado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                item_id, vehicle_id, str(item_id), payload.nome, payload.categoria,
                payload.quantidade, payload.espacos, payload.descricao, Jsonb(payload.dados), user.id
            )
        )

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.carga_adicionada", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id),
            details={"nome": payload.nome, "quantidade": payload.quantidade}
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"id": item_id, "versao": versao}


@router.patch("/{vehicle_id}/inventario/{item_id}")
def update_vehicle_cargo(
    campaign_id: UUID,
    vehicle_id: UUID,
    item_id: UUID,
    payload: CampaignVehicleInventoryQuantityInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "utilizar")

        row = connection.execute(
            """
            UPDATE campanha_veiculo_inventario SET quantidade=%s, atualizado_em=CURRENT_TIMESTAMP
            WHERE id=%s AND veiculo_id=%s
            RETURNING id
            """,
            (payload.quantidade, item_id, vehicle_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item não encontrado na carga do veículo.")

        versao = _bump_vehicle_version(connection, vehicle_id)
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}


@router.delete("/{vehicle_id}/inventario/{item_id}")
def remove_vehicle_cargo(
    campaign_id: UUID,
    vehicle_id: UUID,
    item_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _require_vehicle_permission(connection, campaign_id, vehicle_id, user.id, "utilizar")

        row = connection.execute(
            "DELETE FROM campanha_veiculo_inventario WHERE id=%s AND veiculo_id=%s RETURNING id",
            (item_id, vehicle_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item não encontrado na carga do veículo.")

        versao = _bump_vehicle_version(connection, vehicle_id)
        record_audit(
            connection, action="veiculo.carga_removida", actor_user_id=user.id,
            campaign_id=campaign_id, target_type="campanha_veiculo", target_id=str(vehicle_id)
        )
        live_session.publicar(campaign_id, "veiculo_atualizado", versao, {"veiculo_id": str(vehicle_id)})

    return {"versao": versao}
