"""Gera bots/jornalista/data/colecao_arvores.json a partir das Crônicas do Jardim.

A coleção das Dez Árvores (fragmentos que caem nos baús do Jornalista) revela,
a cada fragmento, uma camada do texto PÚBLICO e revisado de
data/mundo/cronicas-arvores.json. Nada de lore novo é escrito aqui: o arquivo
gerado só reorganiza o que as crônicas já dizem. Rode de novo quando as crônicas
mudarem e inclua o resultado no commit/ZIP do Jornalista:

    python tools/gerar-colecao-arvores.py

Camadas, na ordem em que os fragmentos chegam:
  1. atmosfera  ("o que se sente lá")
  2. tese       ("o que dizem os registros")
  3. história   (primeiro parágrafo da história da Árvore; fecha a página)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "data" / "mundo" / "cronicas-arvores.json"
DESTINO = RAIZ / "bots" / "jornalista" / "data" / "colecao_arvores.json"


def gerar() -> dict:
    cronicas = json.loads(ORIGEM.read_text(encoding="utf-8"))
    paginas = []
    for a in cronicas["arvores"]:
        historia = a.get("historia") or []
        camadas = [
            {"titulo": "O que se sente lá", "texto": a["atmosfera"]},
            {"titulo": "O que dizem os registros", "texto": a["tese"]},
            {"titulo": "O que restou escrito", "texto": historia[0] if historia else a["tese"]},
        ]
        paginas.append({
            "id": a["id"],
            "nome": a["nome"],
            "epiteto": a["epiteto"],
            "deidade": a.get("deidade", ""),
            "camadas": camadas,
        })
    intro = cronicas.get("introducao") or {}
    return {
        "_comentario": "Gerado por tools/gerar-colecao-arvores.py a partir de data/mundo/cronicas-arvores.json. Não edite à mão.",
        "epilogo": {
            "titulo": intro.get("titulo", "Crônicas do Jardim"),
            "texto": intro.get("descricao", ""),
            "subtitulo": intro.get("subtitulo", ""),
        },
        "paginas": paginas,
    }


def main() -> int:
    dados = gerar()
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(dados['paginas'])} páginas gravadas em {DESTINO.relative_to(RAIZ)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
