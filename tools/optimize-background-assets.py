from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def optimize(source: Path, quality: int, max_width: int) -> tuple[int, int, tuple[int, int], tuple[int, int]]:
    destination = source.with_suffix(".webp")
    original_bytes = source.stat().st_size

    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        original_size = image.size
        if image.width > max_width:
            target_height = round(image.height * max_width / image.width)
            image = image.resize((max_width, target_height), Image.Resampling.LANCZOS)
        output_size = image.size
        image.save(
            destination,
            format="WEBP",
            quality=quality,
            method=6,
            optimize=True,
            exif=b"",
        )

    return original_bytes, destination.stat().st_size, original_size, output_size


def main() -> None:
    parser = argparse.ArgumentParser(description="Converte fundos JPG do redesign para WebP.")
    parser.add_argument("directory", type=Path)
    parser.add_argument("--quality", type=int, default=86)
    parser.add_argument("--max-width", type=int, default=1920)
    args = parser.parse_args()

    sources = sorted(args.directory.glob("*_bg.jpg"))
    if not sources:
        raise SystemExit("Nenhum *_bg.jpg encontrado.")

    original_total = 0
    optimized_total = 0
    for source in sources:
        original, optimized, original_size, output_size = optimize(source, args.quality, args.max_width)
        original_total += original
        optimized_total += optimized
        print(
            f"{source.name}: {original / 1024:.1f} KiB -> "
            f"{optimized / 1024:.1f} KiB | {original_size[0]}x{original_size[1]} -> "
            f"{output_size[0]}x{output_size[1]}"
        )

    reduction = 100 * (1 - optimized_total / original_total)
    print(
        f"TOTAL: {original_total / 1024 / 1024:.2f} MiB -> "
        f"{optimized_total / 1024 / 1024:.2f} MiB ({reduction:.1f}% menor)"
    )


if __name__ == "__main__":
    main()
