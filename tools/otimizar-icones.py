"""Gera as versões web dos ícones a partir dos PNGs de origem.

Os ícones vêm da geração de arte em 1254x1254 e ~1,5 MB cada. Na tela eles
aparecem em 48 px (menu) e 64 px (cards de Regras), então o navegador baixava
até 19 MB para desenhar miniaturas. Este script produz WebP de 192 px — 4x o
maior tamanho de exibição, o que cobre telas de alta densidade com folga.

Uso:
    python tools/otimizar-icones.py [--origem PASTA] [--tamanho 192]

Os PNGs de origem não são apagados por este script; eles ficam versionados no
git e podem ser reprocessados a qualquer momento com outro tamanho.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow nao encontrado. Instale com: python -m pip install Pillow")


RAIZ = Path(__file__).resolve().parent.parent
ICONES = RAIZ / "assets" / "img" / "icons"
FAVICON_PX = 64
QUALIDADE = 86


def converter(origem: Path, tamanho: int) -> tuple[int, int]:
    """Devolve (bytes antes, bytes depois) do WebP gerado ao lado do PNG."""
    destino = origem.with_suffix(".webp")
    with Image.open(origem) as imagem:
        icone = imagem.convert("RGBA")
        icone.thumbnail((tamanho, tamanho), Image.LANCZOS)
        icone.save(destino, "WEBP", quality=QUALIDADE, method=6, alpha_quality=100)
    return origem.stat().st_size, destino.stat().st_size


def gerar_favicon(origem: Path) -> tuple[int, int]:
    """Favicon continua PNG: é o formato que todo navegador aceita na aba."""
    destino = origem.with_name("favicon-64.png")
    with Image.open(origem) as imagem:
        icone = imagem.convert("RGBA")
        icone.thumbnail((FAVICON_PX, FAVICON_PX), Image.LANCZOS)
        icone.save(destino, "PNG", optimize=True)
    return origem.stat().st_size, destino.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description="Otimiza os ícones do site.")
    parser.add_argument("--origem", type=Path, default=ICONES)
    parser.add_argument("--tamanho", type=int, default=192)
    argumentos = parser.parse_args()

    if not argumentos.origem.exists():
        sys.exit(f"Pasta de icones nao encontrada: {argumentos.origem}")

    antes = depois = 0
    for png in sorted(argumentos.origem.rglob("*.png")):
        if png.stem.endswith("-64"):
            continue
        if png.name == "favicon.png":
            origem_bytes, destino_bytes = gerar_favicon(png)
        else:
            origem_bytes, destino_bytes = converter(png, argumentos.tamanho)
        antes += origem_bytes
        depois += destino_bytes
        reducao = 100 - (destino_bytes / origem_bytes * 100)
        print(
            f"{png.relative_to(argumentos.origem)}: "
            f"{origem_bytes / 1024:.0f} KB -> {destino_bytes / 1024:.0f} KB "
            f"(-{reducao:.0f}%)"
        )

    if antes:
        print(
            f"\nTotal: {antes / 1048576:.1f} MB -> {depois / 1024:.0f} KB "
            f"(-{100 - (depois / antes * 100):.1f}%)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
