from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from core import live_session
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
    vault,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("jardim-plataforma")
settings = load_settings()
_APP_ROOT = Path(__file__).resolve().parent
_FRONTEND_ROOT = _APP_ROOT if (_APP_ROOT / "index.html").exists() else _APP_ROOT.parent
_DATA_ROOT = _APP_ROOT / "data" if (_APP_ROOT / "data").exists() else _APP_ROOT.parent / "data"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate()
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
    log.info("Plataforma iniciada; schema central atualizado.")
    try:
        yield
    finally:
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
    context.router,
    knowledge.router,
    discord_links.router,
    internal.router,
    content.router,
    notifications.router,
    rolls.router,
    sessions.router,
    vault.router,
):
    app.include_router(api_router, prefix="/api/v1")


class _EstaticosDeDesenvolvimento(StaticFiles):
    """Fora de produção, o navegador não guarda JS/CSS em cache.

    Sem isto, editar um módulo e recarregar mostrava a versão antiga — o
    navegador reaproveita módulos ES agressivamente, e a confusão de "corrigi e
    não mudou nada" custa mais caro que o cache economiza ao desenvolver.
    """

    def is_not_modified(self, response_headers, request_headers) -> bool:  # noqa: D102
        return False

    def file_response(self, *args, **kwargs):  # noqa: D102
        resposta = super().file_response(*args, **kwargs)
        resposta.headers["Cache-Control"] = "no-store, must-revalidate"
        return resposta


_Estaticos = StaticFiles if settings.production else _EstaticosDeDesenvolvimento

for public_path in ("assets", "styles", "src", "templates"):
    directory = _FRONTEND_ROOT / public_path
    if directory.exists():
        app.mount(f"/{public_path}", _Estaticos(directory=directory), name=public_path)


# Páginas do site. Sem estas rotas, "voltar para O Jardim" (../index.html) e
# qualquer endereço digitado à mão caíam no 404 JSON do FastAPI — a tela preta
# com `{"detail":"Not Found"}`. Os módulos ganham endereço limpo (/ficha) e o
# caminho antigo /templates/ficha.html continua servido pelo mount acima.
_PAGES = {
    "ficha": "ficha.html",
    "mundo": "mundo.html",
    "regras": "regras.html",
    "loja": "loja.html",
    "itens": "loja.html",
    "sessao": "sessao.html",
}

_PAGINA_404 = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Caminho perdido — O Jardim RPG</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; text-align:center;
         background:#0b0c14; color:#e8e6f0; font:16px/1.6 system-ui, sans-serif; padding:2rem; }
  h1 { font-size:1.6rem; margin:0 0 .5rem; color:#c9a227; }
  p { margin:0 0 1.5rem; color:#9fa0b5; }
  a { display:inline-block; padding:.7rem 1.2rem; border-radius:.5rem;
      background:#c9a227; color:#0b0c14; font-weight:600; text-decoration:none; }
</style></head>
<body><main>
  <h1>Este caminho não existe no Jardim</h1>
  <p>A página que você tentou abrir não faz parte da plataforma.</p>
  <a href="/">‹ Voltar para O Jardim</a>
</main></body></html>"""


def _page_response(nome_arquivo: str) -> FileResponse:
    return FileResponse(
        _FRONTEND_ROOT / "templates" / nome_arquivo,
        headers={"Cache-Control": "no-cache"},
    )


@app.exception_handler(404)
async def pagina_nao_encontrada(request: Request, exc: HTTPException):
    """Navegação errada volta pro Jardim; chamada de API continua JSON."""
    if request.url.path.startswith("/api/") or "text/html" not in request.headers.get("accept", ""):
        return JSONResponse(status_code=404, content={"detail": exc.detail or "nao encontrado"})
    return HTMLResponse(status_code=404, content=_PAGINA_404)


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def frontend_index():
    return FileResponse(
        _FRONTEND_ROOT / "index.html",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/{pagina}", include_in_schema=False)
def frontend_page(pagina: str):
    arquivo = _PAGES.get(pagina.lower().removesuffix(".html"))
    if not arquivo:
        raise HTTPException(status_code=404, detail="pagina nao encontrada")
    return _page_response(arquivo)


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
