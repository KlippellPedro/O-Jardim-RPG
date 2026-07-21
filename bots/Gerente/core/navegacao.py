"""Navegação manual das regras (para o /regras por menus).

Diferente de conhecimento.py (busca por texto, aproximada), aqui a informação é
organizada por categoria → item → detalhe. Sempre correta e formatável, porque
sai direto das fontes estruturadas em vez de trechos rankeados.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Optional

from .conhecimento import descobrir_raiz_fontes

# (id, rótulo, emoji) — ordem em que aparecem no menu do /regras.
CATEGORIAS = (
    ("racas", "Raças", "🧬"),
    ("classes", "Classes", "⚔️"),
    ("pericias", "Perícias", "🎯"),
    ("legados", "Legados", "✨"),
    ("fundamentos", "Fundamentos", "📖"),
)

ATRIBUTO_ROTULO = {
    "forca": "Força",
    "destreza": "Destreza",
    "constituicao": "Constituição",
    "inteligencia": "Inteligência",
    "sabedoria": "Sabedoria",
    "carisma": "Carisma",
    "fluxo": "Fluxo",
    "misticismo": "Misticismo",
}


def normalizar(texto: str) -> str:
    decomposto = unicodedata.normalize("NFKD", str(texto).casefold())
    sem_acento = "".join(c for c in decomposto if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", sem_acento).strip()


class Navegacao:
    """Carrega as fontes estruturadas e expõe acesso por categoria/item."""

    def __init__(self, raiz: Optional[Path] = None):
        self.raiz = Path(raiz) if raiz else descobrir_raiz_fontes()
        self.racas = self._json("data/ficha/racas.json")
        self.classes = self._json("data/ficha/classes.json")
        self.pericias = self._json("data/ficha/pericias.json").get("pericias", [])
        legados = self._json("data/ficha/legados.json").get("legados", [])
        novos = self._json("data/ficha/legados-novos.json").get("novos", [])
        self.legados = legados + novos
        self.fundamentos = self._secoes_markdown("docs/regras/fundamentos-v1.md")

    def _json(self, relativo: str):
        return json.loads((self.raiz / relativo).read_text(encoding="utf-8-sig"))

    def _secoes_markdown(self, relativo: str) -> list[dict]:
        """Quebra o markdown em seções de nível 2 (##). Cada seção guarda o
        título e o texto (com as subseções ### mantidas dentro)."""
        linhas = (self.raiz / relativo).read_text(encoding="utf-8-sig").splitlines()
        secoes: list[dict] = []
        titulo: Optional[str] = None
        corpo: list[str] = []

        def fechar():
            if titulo is not None:
                texto = "\n".join(corpo).strip()
                secoes.append({"id": normalizar(titulo).replace(" ", "-"), "titulo": titulo, "texto": texto})

        for linha in linhas:
            h2 = re.match(r"^##\s+(?!#)(.+?)\s*$", linha)
            h1 = re.match(r"^#\s+(?!#)(.+?)\s*$", linha)
            if h2:
                fechar()
                titulo = h2.group(1).strip()
                corpo = []
            elif h1:
                # Um novo H1 encerra a seção corrente sem virar item próprio.
                fechar()
                titulo = None
                corpo = []
            elif titulo is not None:
                corpo.append(linha)
        fechar()
        return [s for s in secoes if s["texto"]]

    # ── Acesso por categoria ────────────────────────────────────────────────
    def itens(self, categoria: str) -> list[dict]:
        if categoria == "racas":
            return self.racas
        if categoria == "classes":
            return self.classes
        if categoria == "legados":
            return self.legados
        if categoria == "fundamentos":
            return self.fundamentos
        return []

    def item(self, categoria: str, item_id: str) -> Optional[dict]:
        for it in self.itens(categoria):
            if it.get("id") == item_id:
                return it
        return None

    def pericias_por_atributo(self) -> dict[str, list[dict]]:
        grupos: dict[str, list[dict]] = {}
        for pericia in self.pericias:
            grupos.setdefault(pericia.get("atributo", "outros"), []).append(pericia)
        return grupos

    def buscar_item(self, termo: str) -> list[tuple[str, dict]]:
        """Procura por título em raças/classes/perícias/legados. Retorna
        (categoria, item), priorizando correspondência exata."""
        alvo = normalizar(termo)
        if not alvo:
            return []
        exatos: list[tuple[str, dict]] = []
        parciais: list[tuple[str, dict]] = []
        fontes = (
            ("racas", self.racas),
            ("classes", self.classes),
            ("pericias", self.pericias),
            ("legados", self.legados),
        )
        for categoria, itens in fontes:
            for it in itens:
                titulo_norm = normalizar(it.get("titulo", ""))
                if titulo_norm == alvo:
                    exatos.append((categoria, it))
                elif alvo in titulo_norm or titulo_norm in alvo:
                    parciais.append((categoria, it))
        return exatos + parciais
