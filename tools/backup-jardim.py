"""Baixa, verifica e restaura backups do banco central do Jardim.

Três modos:

    python tools/backup-jardim.py                      # baixa e guarda
    python tools/backup-jardim.py verificar ARQUIVO    # confere sem restaurar
    python tools/backup-jardim.py restaurar ARQUIVO    # devolve ao banco

O download usa a rota interna da API (`/api/v1/interno/backup`), então precisa
da mesma `SERVICE_API_KEY` dos bots. A restauração conecta direto no Postgres
com `DATABASE_URL` — é operação de emergência, não passa pela API.

Agendar no Windows (todo dia às 3h):

    schtasks /create /tn "Backup Jardim" /tr "python C:\\caminho\\tools\\backup-jardim.py" /sc daily /st 03:00

Agendar em Linux (crontab -e):

    0 3 * * * cd /caminho && python tools/backup-jardim.py

O arquivo contém e-mails e hashes de senha. Guarde em lugar privado.
"""

from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


RAIZ = Path(__file__).resolve().parent.parent
PADRAO_API = "http://jardimapi:8080"
PADRAO_DESTINO = RAIZ / "backups"
MANTER = 14


def _carregar_env() -> None:
    """Lê .env da raiz e de plataforma/ sem exigir python-dotenv."""
    for caminho in (RAIZ / ".env", RAIZ / "plataforma" / ".env"):
        if not caminho.exists():
            continue
        for linha in caminho.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            os.environ.setdefault(chave.strip(), valor.strip())


def baixar(api: str, chave: str) -> bytes:
    requisicao = urllib.request.Request(
        f"{api.rstrip('/')}/api/v1/interno/backup",
        headers={"X-Service-Key": chave, "Accept": "application/gzip"},
    )
    try:
        with urllib.request.urlopen(requisicao, timeout=300) as resposta:
            return resposta.read()
    except urllib.error.HTTPError as erro:
        detalhe = erro.read().decode("utf-8", "replace")[:200]
        raise SystemExit(f"A API recusou o backup ({erro.code}): {detalhe}") from None
    except urllib.error.URLError as erro:
        raise SystemExit(f"Nao consegui falar com a API em {api}: {erro.reason}") from None


def resumir(conteudo: bytes) -> dict:
    """Abre o arquivo e conta as linhas — prova que o gzip não veio truncado."""
    contagem: dict[str, int] = {}
    with gzip.GzipFile(fileobj=io.BytesIO(conteudo)) as arquivo:
        cabecalho = json.loads(arquivo.readline())
        if cabecalho.get("formato") != "jardim-backup":
            raise SystemExit("Este arquivo nao e um backup do Jardim.")
        for linha in arquivo:
            if linha.strip():
                tabela = json.loads(linha).get("t", "?")
                contagem[tabela] = contagem.get(tabela, 0) + 1
    return {"cabecalho": cabecalho, "tabelas": contagem, "linhas": sum(contagem.values())}


def rotacionar(destino: Path, manter: int) -> list[Path]:
    arquivos = sorted(destino.glob("jardim-backup-*.jsonl.gz"))
    excedentes = arquivos[:-manter] if len(arquivos) > manter else []
    for antigo in excedentes:
        antigo.unlink()
    return excedentes


def comando_baixar(argumentos) -> int:
    chave = os.getenv("SERVICE_API_KEY", "").strip()
    if not chave:
        raise SystemExit("SERVICE_API_KEY nao definida (.env da raiz ou de plataforma/).")

    conteudo = baixar(argumentos.api, chave)
    resumo = resumir(conteudo)

    destino = Path(argumentos.destino)
    destino.mkdir(parents=True, exist_ok=True)
    agora = datetime.now(timezone.utc)
    arquivo = destino / f"jardim-backup-{agora:%Y%m%d-%H%M}.jsonl.gz"
    arquivo.write_bytes(conteudo)

    print(f"{arquivo}  ({len(conteudo) / 1024:.0f} KB, {resumo['linhas']} registros)")
    for tabela, total in sorted(resumo["tabelas"].items()):
        print(f"   {tabela}: {total}")
    apagados = rotacionar(destino, argumentos.manter)
    if apagados:
        print(f"Rotacao: {len(apagados)} backup(s) antigo(s) removido(s).")
    return 0


def comando_verificar(argumentos) -> int:
    conteudo = Path(argumentos.arquivo).read_bytes()
    resumo = resumir(conteudo)
    print(f"Gerado em: {resumo['cabecalho'].get('gerado_em')}")
    print(f"Registros: {resumo['linhas']}")
    for tabela, total in sorted(resumo["tabelas"].items()):
        print(f"   {tabela}: {total}")
    faltando = resumo["cabecalho"].get("fora_do_backup") or []
    if faltando:
        print(f"ATENCAO: tabelas fora do backup: {', '.join(faltando)}")
    return 0


def comando_restaurar(argumentos) -> int:
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn:
        raise SystemExit("DATABASE_URL nao definida.")

    sys.path.insert(0, str(RAIZ / "plataforma"))
    try:
        from core.backup import restaurar_backup  # noqa: PLC0415
        from core.database import Database  # noqa: PLC0415
    except ImportError as erro:
        raise SystemExit(
            f"Dependencias da plataforma indisponiveis ({erro}). "
            "Rode dentro do venv de plataforma/."
        ) from None

    conteudo = Path(argumentos.arquivo).read_bytes()
    resumo = resumir(conteudo)
    print(f"Backup de {resumo['cabecalho'].get('gerado_em')} com {resumo['linhas']} registros.")
    print(f"Banco de destino: {dsn.split('@')[-1]}")
    if argumentos.limpar:
        print("MODO LIMPAR: as tabelas atuais serao esvaziadas antes.")
    if input("Digite RESTAURAR para confirmar: ").strip() != "RESTAURAR":
        print("Cancelado.")
        return 1

    banco = Database(dsn)
    banco.open()
    try:
        resultado = restaurar_backup(banco, conteudo, limpar=argumentos.limpar)
    finally:
        banco.close()
    print(f"Restaurados {resultado['linhas']} registros.")
    for tabela, total in sorted(resultado["tabelas"].items()):
        print(f"   {tabela}: {total}")
    return 0


def main() -> int:
    _carregar_env()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="comando")

    baixar_cmd = sub.add_parser("baixar", help="baixa e guarda um backup (padrao)")
    for alvo in (parser, baixar_cmd):
        alvo.add_argument("--api", default=os.getenv("JARDIM_API", PADRAO_API))
        alvo.add_argument("--destino", default=str(PADRAO_DESTINO))
        alvo.add_argument("--manter", type=int, default=MANTER)

    verificar_cmd = sub.add_parser("verificar", help="confere um arquivo sem restaurar")
    verificar_cmd.add_argument("arquivo")

    restaurar_cmd = sub.add_parser("restaurar", help="devolve o backup ao banco")
    restaurar_cmd.add_argument("arquivo")
    restaurar_cmd.add_argument("--limpar", action="store_true", help="esvazia as tabelas antes")

    argumentos = parser.parse_args()
    if argumentos.comando == "verificar":
        return comando_verificar(argumentos)
    if argumentos.comando == "restaurar":
        return comando_restaurar(argumentos)
    return comando_baixar(argumentos)


if __name__ == "__main__":
    raise SystemExit(main())
