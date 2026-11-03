"""Converte a mobília renderizada no Blender (tools/blender/gerar_mobilia.py) para o site.

    python tools/mobilia_construtor.py <pasta-png>

Grava public/assets/construtor/mobilia/<id>.webp (192 px por casa, leve para o ZIP da Discloud)
e o catálogo src/data/construtor-mobilia.json, que o construtor de mapas lê.
"""

import json
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA_IMAGENS = os.path.join(RAIZ, "public", "assets", "construtor", "mobilia")
SAIDA_CATALOGO = os.path.join(RAIZ, "src", "data", "construtor-mobilia.json")
PX_POR_CASA = 192
QUALIDADE = 82


def main():
    origem = sys.argv[1]
    with open(os.path.join(origem, "catalogo.json"), encoding="utf-8") as arquivo:
        catalogo = json.load(arquivo)
    os.makedirs(SAIDA_IMAGENS, exist_ok=True)
    pecas = []
    total = 0
    for peca in catalogo:
        imagem = Image.open(os.path.join(origem, f"{peca['id']}.png")).convert("RGBA")
        # A imagem tem a peça e uma margem em volta (para a sombra), em casas.
        largura_casas = peca["largura"] + peca["margem"] * 2
        altura_casas = peca["altura"] + peca["margem"] * 2
        tamanho = (round(largura_casas * PX_POR_CASA), round(altura_casas * PX_POR_CASA))
        imagem = imagem.resize(tamanho, Image.LANCZOS)
        caminho = os.path.join(SAIDA_IMAGENS, f"{peca['id']}.webp")
        imagem.save(caminho, "WEBP", quality=QUALIDADE, method=6)
        total += os.path.getsize(caminho)
        pecas.append({
            "id": peca["id"],
            "nome": peca["nome"],
            "categoria": peca["categoria"],
            "imagem_largura": tamanho[0],
            "imagem_altura": tamanho[1],
            # Largura da imagem em casas: é a `escala` com que a peça entra no mapa.
            "escala": round(largura_casas, 3),
        })
    with open(SAIDA_CATALOGO, "w", encoding="utf-8", newline="\n") as arquivo:
        json.dump({"pecas": pecas}, arquivo, ensure_ascii=False, indent=2)
        arquivo.write("\n")
    print(f"{len(pecas)} peças, {total / 1024:.0f} KB")


if __name__ == "__main__":
    main()
