"""Converte os PNG de render_miniaturas_frutos.py em webp 256x256 recortados.

    python tools/miniaturas_frutos.py <pasta-png> [saida]

Saída padrão: public/assets/img/frutos/<id>.webp
"""
import os
import sys
import glob
from PIL import Image

TAM = 256
MARGEM = 0.06

origem = sys.argv[1]
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
saida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(raiz, "public", "assets", "img", "frutos")
os.makedirs(saida, exist_ok=True)

for caminho in sorted(glob.glob(os.path.join(origem, "*.png"))):
    img = Image.open(caminho).convert("RGBA")
    caixa = img.getchannel("A").getbbox()
    if not caixa:
        continue
    img = img.crop(caixa)
    lado = int(max(img.size) * (1 + 2 * MARGEM))
    tela = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    tela.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2), img)
    tela = tela.resize((TAM, TAM), Image.LANCZOS)
    nome = os.path.splitext(os.path.basename(caminho))[0]
    tela.save(os.path.join(saida, f"{nome}.webp"), "WEBP", quality=88, method=6)
print("ok")
