"""A página da campanha: identidade (capa, cor, frase), painel de quem joga, duplicar e epílogo.

Tudo aqui é leitura ou escrita por campanha. Ler é para qualquer membro; identidade,
duplicar e o encerramento são do Mestre.
"""

from __future__ import annotations

import base64
import binascii
import re
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from core.audit import record_audit
from core.database import Database
from core.dependencies import (
    AuthenticatedUser,
    campaign_access,
    get_current_user,
    get_database,
    require_csrf,
)
from routers.engajamento import rank_da_mesa

router = APIRouter(prefix="/campanhas", tags=["campanha-painel"])

PREFIXOS_CAPA = ("data:image/jpeg;base64,", "data:image/webp;base64,", "data:image/png;base64,")
TAMANHO_MAXIMO_CAPA = 220_000
COR = re.compile(r"^#[0-9a-fA-F]{6}$")
ANTERIORMENTE = 3


class IdentidadeInput(BaseModel):
    """Cada campo é opcional: o que não vem fica como está. `null` apaga."""

    cor: str | None = Field(default=None, max_length=7)
    frase: str | None = Field(default=None, max_length=140)
    capa: str | None = None


def _mestre(connection, campanha_id: UUID, user: AuthenticatedUser):
    acesso = campaign_access(connection, campanha_id, user.id)
    if not acesso.is_master:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="somente o mestre faz isso")
    return acesso


def _nivel_total(ficha) -> int:
    if not isinstance(ficha, dict):
        return 0
    classes = ficha.get("classes")
    if isinstance(classes, list) and classes:
        total = 0
        for item in classes:
            try:
                total += int(item.get("nivel", 0)) if isinstance(item, dict) else 0
            except (TypeError, ValueError):
                continue
        return total
    try:
        return int(ficha.get("nivel", 0) or 0)
    except (TypeError, ValueError):
        return 0


def _identidade_publica(identidade: dict | None) -> dict:
    """A identidade sem a imagem (a capa tem rota própria, com cache)."""
    identidade = identidade if isinstance(identidade, dict) else {}
    return {
        "cor": identidade.get("cor"),
        "frase": identidade.get("frase", ""),
        "tem_capa": bool(identidade.get("capa")),
        "capa_em": identidade.get("capa_em"),
    }


# ------------------------------------------------------------- identidade

@router.put("/{campanha_id}/identidade")
def definir_identidade(
    campanha_id: UUID,
    payload: IdentidadeInput,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        _mestre(connection, campanha_id, user)
        linha = connection.execute(
            "SELECT identidade FROM campanhas WHERE id=%s AND status='ativa' FOR UPDATE", (campanha_id,)
        ).fetchone()
        if not linha:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campanha nao encontrada")
        identidade = dict(linha["identidade"] or {})
        enviados = payload.model_fields_set
        if "cor" in enviados:
            if payload.cor is None:
                identidade.pop("cor", None)
            elif COR.match(payload.cor):
                identidade["cor"] = payload.cor.lower()
            else:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="cor invalida")
        if "frase" in enviados:
            identidade["frase"] = " ".join((payload.frase or "").split())
        if "capa" in enviados:
            if payload.capa is None:
                identidade.pop("capa", None)
                identidade.pop("capa_em", None)
            else:
                if not payload.capa.startswith(PREFIXOS_CAPA) or len(payload.capa) > TAMANHO_MAXIMO_CAPA:
                    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="capa invalida ou grande demais")
                identidade["capa"] = payload.capa
                identidade["capa_em"] = str(uuid4())[:8]
        connection.execute(
            "UPDATE campanhas SET identidade=%s, atualizado_em=CURRENT_TIMESTAMP WHERE id=%s",
            (Jsonb(identidade), campanha_id),
        )
        record_audit(
            connection, action="campanha.identidade_atualizada", actor_user_id=user.id,
            campaign_id=campanha_id, target_type="campanha", target_id=str(campanha_id),
        )
    return {"identidade": _identidade_publica(identidade)}


@router.get("/{campanha_id}/capa")
def capa(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        linha = connection.execute("SELECT identidade FROM campanhas WHERE id=%s", (campanha_id,)).fetchone()
    dados = ((linha or {}).get("identidade") or {}).get("capa")
    if not dados:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sem capa")
    cabecalho, _, corpo = dados.partition(",")
    try:
        conteudo = base64.b64decode(corpo, validate=True)
    except (binascii.Error, ValueError) as erro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="sem capa") from erro
    tipo = cabecalho.removeprefix("data:").removesuffix(";base64")
    return Response(content=conteudo, media_type=tipo, headers={"Cache-Control": "private, max-age=86400"})


# ------------------------------------------------------------------ painel

@router.get("/{campanha_id}/painel")
def painel(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Quem joga e o que aconteceu nas últimas noites. Hoje no mundo e próxima sessão vêm dos próprios módulos."""
    with database.connection() as connection:
        acesso = campaign_access(connection, campanha_id, user.id)
        campanha = connection.execute(
            "SELECT nome, descricao, identidade FROM campanhas WHERE id=%s", (campanha_id,)
        ).fetchone()
        membros = connection.execute(
            """
            SELECT m.usuario_id, u.nome_exibicao, m.papel, v.visto_em,
                   p.id AS personagem_id, p.nome AS personagem_nome, p.ficha
            FROM membros_campanha m
            JOIN usuarios u ON u.id = m.usuario_id
            LEFT JOIN visitas_campanha v ON v.usuario_id = m.usuario_id AND v.campanha_id = m.campanha_id
            LEFT JOIN personagens p ON p.id = m.personagem_ativo_id AND p.status='ativo'
            WHERE m.campanha_id=%s AND m.status='ativo'
            ORDER BY CASE m.papel WHEN 'mestre' THEN 0 WHEN 'assistente' THEN 1 WHEN 'jogador' THEN 2 ELSE 3 END,
                     u.nome_exibicao
            """,
            (campanha_id,),
        ).fetchall()
        sessoes = connection.execute(
            """
            SELECT s.id, s.titulo, s.iniciada_em, s.encerrada_em, s.rodada,
                   COUNT(r.id) FILTER (WHERE r.tipo='rolagem') AS rolagens,
                   COUNT(r.id) FILTER (WHERE r.tipo='rolagem' AND r.detalhes->>'critico_natural'='true') AS criticos
            FROM sessoes_mesa s
            LEFT JOIN registros_mesa r ON r.sessao_id = s.id
            WHERE s.campanha_id=%s AND s.status='encerrada'
            GROUP BY s.id
            ORDER BY s.encerrada_em DESC NULLS LAST
            LIMIT %s
            """,
            (campanha_id, ANTERIORMENTE),
        ).fetchall()
        ao_vivo = connection.execute(
            "SELECT id, titulo FROM sessoes_mesa WHERE campanha_id=%s AND status='aberta' LIMIT 1", (campanha_id,)
        ).fetchone()

    return {
        "campanha": {
            "id": str(campanha_id), "nome": campanha["nome"], "descricao": campanha["descricao"],
            "identidade": _identidade_publica(campanha["identidade"]),
        },
        "meu_papel": acesso.role,
        "gestor": acesso.manages_content,
        "ao_vivo": {"sessao_id": str(ao_vivo["id"]), "titulo": ao_vivo["titulo"]} if ao_vivo else None,
        "membros": [
            {
                "usuario_id": str(m["usuario_id"]),
                "nome": m["nome_exibicao"],
                "papel": m["papel"],
                "visto_em": m["visto_em"],
                "personagem": (
                    {"id": str(m["personagem_id"]), "nome": m["personagem_nome"], "nivel": _nivel_total(m["ficha"])}
                    if m["personagem_id"] else None
                ),
            }
            for m in membros
        ],
        "anteriormente": [
            {
                "sessao_id": str(s["id"]), "titulo": s["titulo"] or "Sessão", "encerrada_em": s["encerrada_em"],
                "duracao_min": int((s["encerrada_em"] - s["iniciada_em"]).total_seconds() // 60) if s["encerrada_em"] else None,
                "rodadas": s["rodada"], "rolagens": s["rolagens"], "criticos": s["criticos"],
            }
            for s in sessoes
        ],
    }


# ------------------------------------------------------------------ epílogo

@router.get("/{campanha_id}/epilogo")
def epilogo(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """Os números finais da campanha, para a tela de encerramento."""
    with database.connection() as connection:
        campaign_access(connection, campanha_id, user.id)
        geral = connection.execute(
            """
            SELECT COUNT(*) AS sessoes,
                   COALESCE(SUM(EXTRACT(EPOCH FROM (encerrada_em - iniciada_em))) / 60, 0)::int AS minutos,
                   MIN(iniciada_em) AS primeira, MAX(encerrada_em) AS ultima
            FROM sessoes_mesa WHERE campanha_id=%s AND status='encerrada'
            """,
            (campanha_id,),
        ).fetchone()
        totais = connection.execute(
            """
            SELECT COUNT(*) FILTER (WHERE tipo='rolagem') AS rolagens,
                   COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'critico_natural'='true') AS criticos,
                   COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'falha_natural'='true') AS falhas
            FROM registros_mesa WHERE campanha_id=%s
            """,
            (campanha_id,),
        ).fetchone()
        jogadores = connection.execute(
            "SELECT COUNT(*) AS total FROM membros_campanha WHERE campanha_id=%s AND status='ativo' AND papel='jogador'",
            (campanha_id,),
        ).fetchone()
        mvp = connection.execute(
            """
            SELECT u.nome_exibicao AS nome, COUNT(*) AS votos
            FROM mvp_votos v
            JOIN sessoes_mesa s ON s.id = v.sessao_id
            JOIN usuarios u ON u.id = v.alvo_usuario_id
            WHERE s.campanha_id=%s
            GROUP BY u.id, u.nome_exibicao
            ORDER BY votos DESC, u.nome_exibicao LIMIT 1
            """,
            (campanha_id,),
        ).fetchone()
    rank = rank_da_mesa(campanha_id, periodo="campanha", user=user, database=database)
    return {
        "sessoes": geral["sessoes"],
        "minutos": geral["minutos"],
        "primeira": geral["primeira"],
        "ultima": geral["ultima"],
        "jogadores": jogadores["total"],
        "rolagens": totais["rolagens"],
        "criticos": totais["criticos"],
        "falhas": totais["falhas"],
        "mvp": dict(mvp) if mvp else None,
        "titulos": rank.get("titulos", []),
    }


# ---------------------------------------------------------------- duplicar

@router.post("/{campanha_id}/duplicar", status_code=status.HTTP_201_CREATED)
def duplicar(
    campanha_id: UUID,
    user: AuthenticatedUser = Depends(require_csrf),
    database: Database = Depends(get_database),
):
    """Cria uma campanha nova a partir desta, só com o conteúdo: sem fichas, economia, sessões ou membros."""
    if not user.can_create_campaign:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="somente contas mestre ou criador criam campanhas")
    nova = uuid4()
    with database.connection() as connection:
        _mestre(connection, campanha_id, user)
        origem = connection.execute(
            "SELECT nome, descricao, configuracoes, identidade FROM campanhas WHERE id=%s AND status='ativa'", (campanha_id,)
        ).fetchone()
        if not origem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campanha nao encontrada")
        nome = f"{origem['nome']} (cópia)"[:100]
        connection.execute(
            "INSERT INTO campanhas (id, dono_id, nome, descricao, configuracoes, identidade) VALUES (%s, %s, %s, %s, %s, %s)",
            (nova, user.id, nome, origem["descricao"], Jsonb(_configuracoes_da_copia(origem["configuracoes"])), Jsonb(origem["identidade"] or {})),
        )
        connection.execute(
            "INSERT INTO membros_campanha (campanha_id, usuario_id, papel) VALUES (%s, %s, 'mestre')", (nova, user.id)
        )
        # Catálogo da Loja da campanha (rascunho e o que estava publicado).
        connection.execute(
            """
            INSERT INTO catalogo_itens_campanha (id, campanha_id, item_id, rascunho, publicado, criado_por, atualizado_por)
            SELECT gen_random_uuid(), %s, item_id, rascunho, publicado, %s, %s
            FROM catalogo_itens_campanha WHERE campanha_id=%s
            """,
            (nova, user.id, user.id, campanha_id),
        )
        # Informações do Mestre (rumores, dados parciais e completos), sem as liberações individuais.
        connection.execute(
            """
            INSERT INTO informacoes_campanha
                (id, campanha_id, tipo, chave_recurso, titulo, resumo_rumor, dados_parciais, dados_completos, acesso_padrao, criado_por)
            SELECT gen_random_uuid(), %s, tipo, chave_recurso, titulo, resumo_rumor, dados_parciais, dados_completos, acesso_padrao, %s
            FROM informacoes_campanha WHERE campanha_id=%s
            """,
            (nova, user.id, campanha_id),
        )
        # Sessão fixa da semana e calendário do mundo (nomes dos meses e acontecimentos), sem "hoje" nem cancelamentos.
        connection.execute(
            """
            INSERT INTO campanha_agenda (campanha_id, recorrencia)
            SELECT %s, recorrencia FROM campanha_agenda WHERE campanha_id=%s
            """,
            (nova, campanha_id),
        )
        connection.execute(
            """
            INSERT INTO campanha_calendario (campanha_id, estado)
            SELECT %s, jsonb_build_object(
                'versao', estado->'versao',
                'config', COALESCE(estado->'config', '{}'::jsonb) || '{"sincronizar_discord": false}'::jsonb,
                'eventos', COALESCE(estado->'eventos', '[]'::jsonb)
            ) FROM campanha_calendario WHERE campanha_id=%s
            """,
            (nova, campanha_id),
        )
        # Ajustes e registros próprios dos Registros Universais.
        connection.execute(
            """
            INSERT INTO campanha_registros_universais (id, campanha_id, secao, origem_id, revelacao, dados)
            SELECT gen_random_uuid(), %s, secao, origem_id, revelacao, dados
            FROM campanha_registros_universais WHERE campanha_id=%s
            """,
            (nova, campanha_id),
        )
        record_audit(
            connection, action="campanha.duplicada", actor_user_id=user.id, campaign_id=nova,
            target_type="campanha", target_id=str(nova), details={"origem": str(campanha_id)},
        )
    return {"id": str(nova), "nome": nome}


_CHAVES_DE_LIBERACAO_INDIVIDUAL = ("racas_liberadas_membros", "classes_liberadas_membros")


def _configuracoes_da_copia(configuracoes) -> dict:
    """As regras de visibilidade vão; o que é amarrado a jogadores da campanha antiga (por conta) fica para trás."""
    copia = dict(configuracoes or {})
    for chave in _CHAVES_DE_LIBERACAO_INDIVIDUAL:
        copia.pop(chave, None)
    return copia
