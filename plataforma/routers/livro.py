"""O Livro de Regras em PDF.

O PDF é montado fora da plataforma (`npm run docs:livro`, que usa o Chrome) e viaja com o pacote, em
`data/livro/`. Esta rota só entrega o arquivo: a edição do jogador para qualquer conta e a edição do
Mestre para quem conduz a mesa. O manifesto que o gerador escreve ao lado (`livro-manifesto.json`) diz à
tela o que ela precisa saber sem abrir o PDF: páginas, tamanho, data e a página onde cada capítulo e cada
tópico começam.

Tamanho importa: o pacote da plataforma tem um teto de upload na hospedagem e já passa de 90 MB, por
isso o build só leva a edição do jogador. Sem o arquivo no disco, a edição simplesmente não aparece.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse

from core.database import Database
from core.dependencies import AuthenticatedUser, campaign_access, get_current_user, get_database

log = logging.getLogger("jardim-plataforma.livro")

router = APIRouter(prefix="/livro", tags=["livro"])

_RAIZ_DO_APP = Path(__file__).resolve().parent.parent

NOME_DO_MANIFESTO = "livro-manifesto.json"

# O nome do arquivo de cada edição é fixo: nada que venha do cliente chega a um caminho de disco.
EDICOES: dict[str, dict[str, Any]] = {
    "jogador": {
        "arquivo": "O-Jardim-Livro-de-Regras.pdf",
        "titulo": "Livro de Regras",
        "so_gestor": False,
    },
    "mestre": {
        "arquivo": "O-Jardim-Livro-de-Regras-MESTRE.pdf",
        "titulo": "Livro de Regras, edição do Mestre",
        "so_gestor": True,
    },
}


def pastas_do_livro() -> list[Path]:
    """No pacote de produção o PDF fica em `data/livro`; no repositório, em `docs/livro`."""
    return [
        _RAIZ_DO_APP / "data" / "livro",
        _RAIZ_DO_APP.parent / "data" / "livro",
        _RAIZ_DO_APP.parent / "docs" / "livro",
    ]


def _ler_manifesto(pasta: Path) -> dict[str, Any]:
    caminho = pasta / NOME_DO_MANIFESTO
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except (OSError, ValueError):
        log.warning("Manifesto do livro ilegível em %s; o PDF segue sem metadados.", caminho)
        return {}
    return dados if isinstance(dados, dict) else {}


def localizar_edicao(edicao: str, pastas: list[Path] | None = None) -> dict[str, Any] | None:
    """O arquivo e o que o manifesto sabe dele, ou None se a edição não estiver no disco."""
    meta = EDICOES.get(edicao)
    if not meta:
        return None
    for pasta in pastas if pastas is not None else pastas_do_livro():
        caminho = pasta / meta["arquivo"]
        if not caminho.is_file():
            continue
        manifesto = _ler_manifesto(pasta)
        do_manifesto = (manifesto.get("edicoes") or {}).get(edicao) or {}
        if not isinstance(do_manifesto, dict):
            do_manifesto = {}
        estado = caminho.stat()
        sha256 = do_manifesto.get("sha256")
        return {
            "edicao": edicao,
            "titulo": meta["titulo"],
            "caminho": caminho,
            "arquivo": meta["arquivo"],
            "bytes": estado.st_size,
            "paginas": do_manifesto.get("paginas"),
            "gerado_em": do_manifesto.get("gerado_em") or manifesto.get("gerado_em"),
            "topicos": do_manifesto.get("topicos") or [],
            "capitulos": do_manifesto.get("capitulos") or [],
            # Sem manifesto, o etag sai do arquivo mesmo: muda a cada nova geração.
            "etag": f'"{sha256 or f"{estado.st_mtime_ns:x}-{estado.st_size:x}"}"',
        }
    return None


def _pode_ver(
    connection,
    user: AuthenticatedUser,
    edicao: str,
    campanha_id: UUID | None,
) -> bool:
    """Edição do jogador: qualquer conta. Edição do Mestre: admin/criador, ou quem conduz a campanha informada."""
    if not EDICOES[edicao]["so_gestor"]:
        return True
    if user.is_platform_admin:
        return True
    if campanha_id is None:
        return False
    try:
        return campaign_access(connection, campanha_id, user.id).manages_content
    except HTTPException:
        return False


def _resumo(achada: dict[str, Any]) -> dict[str, Any]:
    return {
        "edicao": achada["edicao"],
        "titulo": achada["titulo"],
        "paginas": achada["paginas"],
        "bytes": achada["bytes"],
        "gerado_em": achada["gerado_em"],
        "topicos": achada["topicos"],
        "capitulos": achada["capitulos"],
    }


@router.get("")
def edicoes_disponiveis(
    campanha_id: UUID | None = Query(default=None),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """As edições que esta conta pode baixar agora. A do Mestre só aparece para quem conduz a campanha."""
    disponiveis = []
    with database.connection() as connection:
        for edicao in EDICOES:
            achada = localizar_edicao(edicao)
            if achada and _pode_ver(connection, user, edicao, campanha_id):
                disponiveis.append(_resumo(achada))
    return {"edicoes": disponiveis}


@router.get("/pdf/{edicao}")
def pdf_da_edicao(
    edicao: str,
    request: Request,
    baixar: bool = Query(default=False),
    campanha_id: UUID | None = Query(default=None),
    user: AuthenticatedUser = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    """O PDF. Por padrão abre no navegador; com `baixar=true` o navegador salva o arquivo."""
    if edicao not in EDICOES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="edicao nao encontrada")
    with database.connection() as connection:
        if not _pode_ver(connection, user, edicao, campanha_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="permissao de mestre necessaria")
    achada = localizar_edicao(edicao)
    if not achada:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="o PDF desta edicao ainda nao foi publicado")

    cabecalhos = {
        "ETag": achada["etag"],
        # Conferir sempre, mas só baixar de novo se o arquivo mudou. É conteúdo de conta, nunca de cache público.
        "Cache-Control": "private, max-age=0, must-revalidate",
        # O PDF já vem comprimido por dentro: sem isto o GZip global gastaria CPU à toa nos 5 MB.
        "Content-Encoding": "identity",
    }
    if request.headers.get("if-none-match") == achada["etag"]:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=cabecalhos)
    return FileResponse(
        achada["caminho"],
        media_type="application/pdf",
        filename=achada["arquivo"],
        content_disposition_type="attachment" if baixar else "inline",
        headers=cabecalhos,
    )
