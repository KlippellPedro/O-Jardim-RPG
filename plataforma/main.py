from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from core import live_session
from core.automatic_backup import AutomaticBackup
from core.character_summary import carregar_catalogos
from core.config import load_settings
from core.content_seed import seed_world_library
from core.database import Database
from routers import (
    admin,
    auth,
    campaigns,
    characters,
    content,
    context,
    discord_links,
    internal,
    knowledge,
    notifications,
    rolls,
    sessions,
    shop,
    vault,
    bounties,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("jardim-plataforma")
settings = load_settings()
_APP_ROOT = Path(__file__).resolve().parent
_DATA_ROOT = _APP_ROOT / "data" if (_APP_ROOT / "data").exists() else _APP_ROOT.parent / "data"


def _localizar_frontend_dist(app_root: Path) -> Path:
    """Localiza o bundle Vite no repositório ou no pacote de produção.

    No desenvolvimento, ``main.py`` fica em ``plataforma/`` e o bundle em
    ``../dist``. No ZIP da Discloud, ambos ficam no mesmo diretório raiz, com
    o bundle dentro de ``dist/``.
    """

    candidatos = (app_root / "dist", app_root.parent / "dist")
    for candidato in candidatos:
        if (candidato / "index.html").is_file():
            return candidato.resolve()
    # Mantém um caminho determinístico para que a resposta de erro e os logs
    # indiquem exatamente onde o artefato deveria estar no pacote.
    return candidatos[0].resolve()


_FRONTEND_ROOT = _localizar_frontend_dist(_APP_ROOT)
_FRONTEND_INDEX = _FRONTEND_ROOT / "index.html"
if not _FRONTEND_INDEX.is_file():
    log.warning(
        "Bundle do frontend ausente em %s; execute `npm run build` antes do deploy.",
        _FRONTEND_ROOT,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate()
    if settings.production and not _FRONTEND_INDEX.is_file():
        raise RuntimeError(
            f"frontend compilado ausente: {_FRONTEND_INDEX}; "
            "gere o bundle antes de iniciar a aplicacao"
        )
    database = Database(settings.database_url, settings.startup_timeout)
    database.open()
    if not settings.has_creator_rule:
        log.warning(
            "CREATOR_USER_ID/CREATOR_EMAIL nao configurados; nenhuma conta recebera o cargo criador."
        )
    elif not database.configure_creator(settings.creator_user_id, settings.creator_email):
        # Conta ainda não cadastrada: o próprio registro promove quando o
        # e-mail configurado se cadastrar.
        log.warning(
            "Conta criador ainda nao encontrada; o cargo sera aplicado quando ela existir."
        )
    seed_world_library(database, _DATA_ROOT)
    carregar_catalogos(_DATA_ROOT)
    # As rotas são síncronas e rodam em threadpool; o canal de eventos precisa
    # do loop para entregar mensagens aos clientes conectados.
    live_session.registrar_loop(asyncio.get_running_loop())
    app.state.database = database
    app.state.settings = settings
    backup_manager = None
    backup_task = None
    if settings.automatic_backup_enabled:
        backup_directory = Path(settings.automatic_backup_directory)
        if not backup_directory.is_absolute():
            backup_directory = _APP_ROOT / backup_directory
        backup_manager = AutomaticBackup(
            database,
            backup_directory,
            interval_hours=settings.automatic_backup_interval_hours,
            retention=settings.automatic_backup_retention,
        )
        backup_task = asyncio.create_task(
            backup_manager.run(),
            name="jardim-backup-automatico",
        )
    app.state.automatic_backup = backup_manager
    log.info("Plataforma iniciada; schema central atualizado.")
    try:
        yield
    finally:
        if backup_manager and backup_task:
            backup_manager.stop()
            await backup_task
        database.close()


app = FastAPI(
    title="O Jardim RPG - Plataforma",
    version="0.1.0",
    description="API central de contas, campanhas, fichas, permissoes e integracoes Discord.",
    lifespan=lifespan,
    docs_url="/api/docs" if not settings.production else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if not settings.production else None,
)

if settings.trusted_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.trusted_hosts))

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Service-Key"],
    )

# JSON de contexto/fichas e módulos de texto encolhem bastante com compressão.
# O Starlette exclui text/event-stream, então a sessão ao vivo continua fluindo.
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=5)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    log.exception("Erro nao tratado em %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "erro interno"})


@app.get("/api/v1/saude", tags=["sistema"])
def health(request: Request):
    database: Database = request.app.state.database
    return {"status": "ok", "banco": "ok" if database.ping() else "erro"}


for api_router in (
    admin.router,
    auth.router,
    campaigns.router,
    characters.router,
    content.router,
    context.router,
    discord_links.router,
    internal.router,
    knowledge.router,
    notifications.router,
    rolls.router,
    sessions.router,
    shop.router,
    vault.router,
    bounties.router,
):
    app.include_router(api_router, prefix="/api/v1")


class _EstaticosDeDesenvolvimento(StaticFiles):
    """Evita cache do bundle compilado durante validações locais."""

    def is_not_modified(self, response_headers, request_headers) -> bool:  # noqa: D102
        return False

    def file_response(self, *args, **kwargs):  # noqa: D102
        resposta = super().file_response(*args, **kwargs)
        resposta.headers["Cache-Control"] = "no-store, must-revalidate"
        return resposta


class _EstaticosDeProducao(StaticFiles):
    """Aplica cache explícito aos arquivos estáticos compilados."""

    def __init__(
        self,
        *args,
        cache_seconds: int = 300,
        immutable: bool = False,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.cache_seconds = cache_seconds
        self.immutable = immutable

    def file_response(self, *args, **kwargs):  # noqa: D102
        resposta = super().file_response(*args, **kwargs)
        diretivas = ["public", f"max-age={self.cache_seconds}"]
        if self.immutable:
            diretivas.append("immutable")
        else:
            diretivas.append("stale-while-revalidate=86400")
        resposta.headers["Cache-Control"] = ", ".join(diretivas)
        return resposta


def _montar_diretorio_estatico(
    public_path: str,
    *,
    cache_seconds: int,
    immutable: bool = False,
) -> None:
    directory = _FRONTEND_ROOT / public_path
    if not directory.is_dir():
        return
    if settings.production:
        estaticos = _EstaticosDeProducao(
            directory=directory,
            cache_seconds=cache_seconds,
            immutable=immutable,
        )
    else:
        estaticos = _EstaticosDeDesenvolvimento(directory=directory)
    app.mount(
        f"/{public_path}",
        estaticos,
        name=f"frontend-{public_path}",
    )


# O Vite gera nomes com hash dentro de assets/, por isso esses arquivos podem
# ser imutáveis. Os modelos mantêm nomes estáveis e recebem cache mais curto.
_montar_diretorio_estatico(
    "assets",
    cache_seconds=31536000,
    immutable=True,
)
_montar_diretorio_estatico("models", cache_seconds=86400)


# Catálogos de construção da ficha/regras são públicos. Mundo e Loja não são
# montados: esses conteúdos só saem pela API depois da liberação do mestre.
for public_data in ("ficha",):
    directory = _DATA_ROOT / public_data
    if directory.exists():
        app.mount(
            f"/data/{public_data}",
            StaticFiles(directory=directory),
            name=f"data-{public_data}",
        )


def _frontend_index_response() -> FileResponse | JSONResponse:
    if not _FRONTEND_INDEX.is_file():
        return JSONResponse(
            status_code=503,
            content={"detail": "O bundle do frontend não foi encontrado."},
            headers={"Cache-Control": "no-store"},
        )
    resposta = FileResponse(_FRONTEND_INDEX, media_type="text/html")
    resposta.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resposta.headers["Pragma"] = "no-cache"
    resposta.headers["Expires"] = "0"
    return resposta


_PREFIXOS_RESERVADOS_DO_FRONTEND = frozenset({"api", "assets", "models", "data"})


def _deve_usar_fallback_spa(request: Request) -> bool:
    """Decide se um 404 representa uma navegação do React Router."""

    if request.method not in {"GET", "HEAD"}:
        return False
    if "text/html" not in request.headers.get("accept", "").lower():
        return False

    caminho = request.url.path.strip("/")
    primeiro_segmento = caminho.partition("/")[0].lower()
    if primeiro_segmento in _PREFIXOS_RESERVADOS_DO_FRONTEND:
        return False
    # Um arquivo inexistente deve continuar 404; devolver HTML como JS/CSS/GLB
    # produz erros de MIME difíceis de diagnosticar no navegador.
    return not Path(caminho).suffix


@app.exception_handler(404)
async def frontend_not_found(request: Request, exc: HTTPException):
    """Usa o shell React apenas em navegação HTML fora das áreas reservadas."""

    if _deve_usar_fallback_spa(request):
        return _frontend_index_response()
    return JSONResponse(
        status_code=404,
        content={"detail": exc.detail or "nao encontrado"},
    )


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def frontend_index():
    return _frontend_index_response()
