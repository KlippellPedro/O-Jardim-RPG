"""Baixa e restaura as imagens do acervo (mapas, tokens e objetos do Mestre).

O backup diário do banco (`tools/backup-jardim.py`) NÃO leva os ladrilhos das imagens: eles são
arquivos grandes que não comprimem. Este aqui leva, em ZIP, por partes e só o que é novo:

    python tools/backup-acervo.py                      # baixa o que entrou desde a última vez
    python tools/backup-acervo.py --completo           # baixa tudo de novo, ignorando o estado
    python tools/backup-acervo.py verificar ARQUIVO    # confere um ZIP sem restaurar
    python tools/backup-acervo.py restaurar ARQUIVO    # devolve ao banco (depois do JSONL)

O download usa a rota interna da API (`/api/v1/interno/backup-acervo`), com a mesma
`SERVICE_API_KEY` dos bots. Cada parte vem com até 64 MB; o ponto onde parou fica em
`backups/acervo/estado.json`, e a próxima execução continua dali. Apagar o estado é seguro:
só baixa tudo de novo.

A restauração conecta direto no Postgres com `DATABASE_URL` e só devolve o ladrilho cujo item
existe, então restaure primeiro o backup em JSONL (`tools/backup-jardim.py restaurar`) e depois
os ZIPs, na ordem em que foram baixados.

Agendar no Windows (todo dia às 3h30):

    schtasks /create /tn "Backup Acervo Jardim" /tr "python C:\\caminho\\tools\\backup-acervo.py" /sc daily /st 03:30

Os mapas são do Mestre e podem ter material com direitos de terceiros: guarde em lugar privado.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PADRAO_API = "http://jardimapi:8080"
PADRAO_DESTINO = RAIZ / "backups" / "acervo"


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


def baixar_parte(api: str, chave: str, cursor: str | None) -> tuple[bytes, dict]:
    consulta = f"?{urllib.parse.urlencode({'apos': cursor})}" if cursor else ""
    requisicao = urllib.request.Request(
        f"{api.rstrip('/')}/api/v1/interno/backup-acervo{consulta}",
        headers={"X-Service-Key": chave, "Accept": "application/zip"},
    )
    try:
        with urllib.request.urlopen(requisicao, timeout=600) as resposta:
            cabecalhos = {
                "arquivos": int(resposta.headers.get("X-Acervo-Arquivos", "0")),
                "cursor": resposta.headers.get("X-Acervo-Cursor", "") or None,
                "mais": resposta.headers.get("X-Acervo-Mais") == "1",
            }
            return resposta.read(), cabecalhos
    except urllib.error.HTTPError as erro:
        detalhe = erro.read().decode("utf-8", "replace")[:200]
        raise SystemExit(f"A API recusou o backup do acervo ({erro.code}): {detalhe}") from None
    except urllib.error.URLError as erro:
        raise SystemExit(f"Nao consegui falar com a API em {api}: {erro.reason}") from None


def resumir(conteudo: bytes) -> dict:
    """Abre o ZIP e confere cada arquivo contra o manifesto: prova que nada veio truncado."""
    with zipfile.ZipFile(io.BytesIO(conteudo)) as pacote:
        manifesto = json.loads(pacote.read("manifesto.json"))
        if manifesto.get("formato") != "jardim-acervo":
            raise SystemExit("Este arquivo nao e um backup do acervo do Jardim.")
        total = 0
        for entrada in manifesto["arquivos"]:
            tamanho = len(pacote.read(entrada["arquivo"]))
            if tamanho != entrada["tamanho"]:
                raise SystemExit(f"Arquivo corrompido no backup: {entrada['arquivo']}")
            total += tamanho
    itens = {entrada["item_id"] for entrada in manifesto["arquivos"]}
    return {"gerado_em": manifesto.get("gerado_em"), "arquivos": len(manifesto["arquivos"]), "itens": len(itens), "bytes": total}


def comando_baixar(argumentos) -> int:
    chave = os.getenv("SERVICE_API_KEY", "").strip()
    if not chave:
        raise SystemExit("SERVICE_API_KEY nao definida (.env da raiz ou de plataforma/).")
    destino = Path(argumentos.destino)
    destino.mkdir(parents=True, exist_ok=True)
    arquivo_estado = destino / "estado.json"
    cursor = None
    if not argumentos.completo and arquivo_estado.exists():
        cursor = json.loads(arquivo_estado.read_text(encoding="utf-8")).get("cursor")

    agora = datetime.now(timezone.utc)
    parte, total_arquivos, total_bytes = 0, 0, 0
    while True:
        conteudo, cabecalhos = baixar_parte(argumentos.api, chave, cursor)
        if cabecalhos["arquivos"] == 0:
            break
        resumo = resumir(conteudo)
        parte += 1
        arquivo = destino / f"acervo-{agora:%Y%m%d-%H%M%S}-{parte:03d}.zip"
        arquivo.write_bytes(conteudo)
        cursor = cabecalhos["cursor"]
        # O estado só avança depois de a parte estar no disco e conferida.
        arquivo_estado.write_text(json.dumps({"cursor": cursor, "atualizado_em": agora.isoformat()}), encoding="utf-8")
        total_arquivos += resumo["arquivos"]
        total_bytes += resumo["bytes"]
        print(f"{arquivo.name}: {resumo['arquivos']} arquivos de {resumo['itens']} imagem(ns), {resumo['bytes'] / 1048576:.1f} MB")
        if not cabecalhos["mais"]:
            break
    if parte == 0:
        print("Nada novo no acervo desde o ultimo backup.")
    else:
        print(f"Total: {total_arquivos} arquivos, {total_bytes / 1048576:.1f} MB em {parte} parte(s).")
    return 0


def comando_verificar(argumentos) -> int:
    resumo = resumir(Path(argumentos.arquivo).read_bytes())
    print(f"Gerado em: {resumo['gerado_em']}")
    print(f"{resumo['arquivos']} arquivos de {resumo['itens']} imagem(ns), {resumo['bytes'] / 1048576:.1f} MB: tudo confere.")
    return 0


def comando_restaurar(argumentos) -> int:
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn:
        raise SystemExit("DATABASE_URL nao definida.")
    sys.path.insert(0, str(RAIZ / "plataforma"))
    try:
        from core.backup import restaurar_backup_acervo  # noqa: PLC0415
        from core.database import Database  # noqa: PLC0415
    except ImportError as erro:
        raise SystemExit(f"Dependencias da plataforma indisponiveis ({erro}). Rode dentro do venv de plataforma/.") from None

    conteudo = Path(argumentos.arquivo).read_bytes()
    resumo = resumir(conteudo)
    print(f"{resumo['arquivos']} arquivos de {resumo['itens']} imagem(ns), gerado em {resumo['gerado_em']}.")
    print(f"Banco de destino: {dsn.split('@')[-1]}")
    if input("Digite RESTAURAR para confirmar: ").strip() != "RESTAURAR":
        print("Cancelado.")
        return 1
    banco = Database(dsn)
    banco.open()
    try:
        resultado = restaurar_backup_acervo(banco, conteudo)
    finally:
        banco.close()
    print(f"Devolvidos {resultado['inseridos']} arquivos; {resultado['pulados_sem_item']} sem imagem correspondente no banco.")
    return 0


def main() -> int:
    _carregar_env()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="comando")
    for alvo in (parser, sub.add_parser("baixar", help="baixa o que e novo (padrao)")):
        alvo.add_argument("--api", default=os.getenv("JARDIM_API", PADRAO_API))
        alvo.add_argument("--destino", default=str(PADRAO_DESTINO))
        alvo.add_argument("--completo", action="store_true", help="ignora o estado e baixa tudo")
    sub.add_parser("verificar", help="confere um ZIP sem restaurar").add_argument("arquivo")
    sub.add_parser("restaurar", help="devolve um ZIP ao banco").add_argument("arquivo")
    argumentos = parser.parse_args()
    if argumentos.comando == "verificar":
        return comando_verificar(argumentos)
    if argumentos.comando == "restaurar":
        return comando_restaurar(argumentos)
    return comando_baixar(argumentos)


if __name__ == "__main__":
    raise SystemExit(main())
