"""Gera o pacote da plataforma em um ZIP compatível com a Discloud."""

from __future__ import annotations

import os
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
PLATAFORMA = ROOT / "plataforma"
DESTINO = PLATAFORMA / "plataforma-discloud.zip"
TEMPORARIO = PLATAFORMA / "plataforma-discloud.tmp.zip"

DIRETORIOS = (
    (PLATAFORMA / "core", PurePosixPath("core")),
    (PLATAFORMA / "routers", PurePosixPath("routers")),
    (ROOT / "data", PurePosixPath("data")),
    (ROOT / "dist", PurePosixPath("dist")),
    (ROOT / "tools", PurePosixPath("tools")),
)

ARQUIVOS_RAIZ = (
    ".discloudignore",
    ".env.example",
    ".gitignore",
    "discloud.config",
    "main.py",
    "README.md",
    "requirements.txt",
    "schemas.py",
)

PASTAS_IGNORADAS = {
    ".git",
    ".pytest_cache",
    ".venv",
    ".venv-test",
    "__pycache__",
    "backups",
    "tests",
}

OBRIGATORIOS = {
    "main.py",
    "discloud.config",
    "dist/index.html",
    "core/character_summary.py",
    "routers/characters.py",
}


def deve_ignorar(caminho: Path) -> bool:
    return caminho.suffix.lower() == ".pyc" or any(
        parte in PASTAS_IGNORADAS for parte in caminho.parts
    )


def adicionar_arquivo(zip_file: ZipFile, origem: Path, destino: PurePosixPath) -> None:
    if not origem.is_file():
        raise FileNotFoundError(f"Arquivo obrigatório ausente: {origem}")

    info = ZipInfo.from_file(origem, str(destino), strict_timestamps=False)
    # A Discloud recusou o pacote criado pelo bsdtar, marcado como Unix
    # (create_system=3). Marcamos cada entrada como Windows/FAT, o mesmo
    # formato gerado pelo compactador padrão do Windows.
    info.create_system = 0
    info.external_attr = 0x20
    with origem.open("rb") as arquivo:
        zip_file.writestr(
            info,
            arquivo.read(),
            compress_type=ZIP_DEFLATED,
            compresslevel=9,
        )


def criar_zip() -> tuple[int, int]:
    if not (ROOT / "dist" / "index.html").is_file():
        raise FileNotFoundError("O frontend não foi compilado: dist/index.html não existe.")

    if TEMPORARIO.exists():
        TEMPORARIO.unlink()

    try:
        with ZipFile(TEMPORARIO, "w", allowZip64=False) as zip_file:
            for diretorio, prefixo in DIRETORIOS:
                if not diretorio.is_dir():
                    raise FileNotFoundError(f"Diretório obrigatório ausente: {diretorio}")
                for arquivo in sorted(diretorio.rglob("*")):
                    relativo = arquivo.relative_to(diretorio)
                    if arquivo.is_file() and not deve_ignorar(relativo):
                        adicionar_arquivo(zip_file, arquivo, prefixo / PurePosixPath(relativo.as_posix()))

            for nome in ARQUIVOS_RAIZ:
                adicionar_arquivo(zip_file, PLATAFORMA / nome, PurePosixPath(nome))

        with ZipFile(TEMPORARIO, "r") as zip_file:
            nomes = set(zip_file.namelist())
            ausentes = sorted(OBRIGATORIOS - nomes)
            proibidos = sorted(
                nome for nome in nomes
                if Path(name := nome).suffix.lower() == ".pyc"
                or any(parte in PASTAS_IGNORADAS for parte in PurePosixPath(name).parts)
            )
            sistemas = {info.create_system for info in zip_file.infolist()}
            corrompido = zip_file.testzip()

        if ausentes:
            raise RuntimeError(f"Arquivos obrigatórios ausentes: {', '.join(ausentes)}")
        if proibidos:
            raise RuntimeError(f"Arquivos proibidos no pacote: {', '.join(proibidos)}")
        if sistemas != {0}:
            raise RuntimeError(f"Formato incompatível detectado: create_system={sorted(sistemas)}")
        if corrompido:
            raise RuntimeError(f"Entrada corrompida no ZIP: {corrompido}")

        os.replace(TEMPORARIO, DESTINO)
        return len(nomes), DESTINO.stat().st_size
    finally:
        if TEMPORARIO.exists():
            TEMPORARIO.unlink()


if __name__ == "__main__":
    entradas, tamanho = criar_zip()
    print(f"ZIP criado: {DESTINO}")
    print(f"Entradas: {entradas}")
    print(f"Tamanho: {tamanho} bytes")
