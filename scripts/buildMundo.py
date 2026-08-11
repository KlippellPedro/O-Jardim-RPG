#!/usr/bin/env python3
"""Gera data/gerado/mundoCatalog.ts a partir dos pacotes em data/mundo/.

O cabecalho de mundoCatalog.ts sempre mandou rodar este script, mas ele nunca
existiu - o catalogo vinha sendo mantido a mao, e por isso dessincronizava do
data/mundo/ sem ninguem perceber.

Uso:
    python scripts/buildMundo.py           # regenera o catalogo
    python scripts/buildMundo.py --check   # so verifica se esta sincronizado
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "data" / "mundo"
DESTINO = RAIZ / "data" / "gerado" / "mundoCatalog.ts"

# Tipos de lore aceitos pelo catálogo React e pelos JSONs em data/mundo.
TIPOS_VALIDOS = [
    "cosmologia", "conceito",
    "deidade", "fluxo",
    "realidade", "galho", "dimensao",
    "mundo", "reino",
    "personagem", "soberano", "npc",
    "evento",
    "idioma", "cultura",
]

# Ordem de renderizacao: segue a cascata, pra o arquivo gerado ficar legivel.
ORDEM_TIPOS = {tipo: i for i, tipo in enumerate([
    "cosmologia", "conceito", "deidade", "fluxo", "galho", "realidade",
    "dimensao", "reino", "mundo", "personagem", "soberano", "npc",
    "evento", "idioma", "cultura",
])}


def limpar(entrada: dict) -> dict:
    """Remove os campos de anotacao (prefixo '_'), que o import ja ignora."""
    limpa = {k: v for k, v in entrada.items() if not k.startswith("_")}
    limpa["conteudo"] = {
        k: v for k, v in limpa.get("conteudo", {}).items() if not k.startswith("_")
    }
    return limpa


def coletar() -> list[dict]:
    entradas: list[dict] = []
    ordem_leitura: dict[str, int] = {}
    vistos: dict[str, Path] = {}

    for arquivo in sorted(ORIGEM.rglob("*.json")):
        if arquivo.name.startswith("_"):
            continue  # _padrao.json e afins sao documentacao, nao dados
        dados = json.loads(arquivo.read_text(encoding="utf-8"))
        for bruta in dados.get("entradas", []):
            entrada = limpar(bruta)
            for campo in ("tipo", "id", "titulo", "conteudo"):
                if campo not in entrada:
                    raise SystemExit(f"{arquivo}: entrada sem campo '{campo}'")
            if entrada["tipo"] not in TIPOS_VALIDOS:
                raise SystemExit(f"{arquivo}: tipo invalido '{entrada['tipo']}' em {entrada['id']}")
            if entrada["id"] in vistos:
                raise SystemExit(
                    f"id duplicado '{entrada['id']}': {arquivo} e {vistos[entrada['id']]}"
                )
            vistos[entrada["id"]] = arquivo
            ordem_leitura[entrada["id"]] = len(entradas)
            entradas.append(entrada)

    # Agrupa por tipo, mas DENTRO de cada tipo preserva a ordem em que as
    # entradas aparecem nos arquivos - que e a ordem narrativa em que foram
    # escritas. Ordenar por id alfabetico aqui faria a linha do tempo abrir
    # pelo "Baile das Estacoes" em vez do "Cataclismo do Ano Zero".
    entradas.sort(key=lambda e: (ORDEM_TIPOS.get(e["tipo"], 99), ordem_leitura[e["id"]]))
    return entradas


def validar_referencias(entradas: list[dict]) -> list[str]:
    """A armadilha registrada em genese.json: se conteudo.arvore de um Galho
    guardar o nome de exibicao em vez do id da Deidade, a secao 'Galhos desta
    Arvore' fica vazia EM SILENCIO. Aqui isso vira erro visivel."""
    ids = {e["id"] for e in entradas}
    erros = []
    # (tipo da entrada, campo que referencia, o que ele deve apontar)
    regras = [
        ("deidade", "fluxo", "fluxo"),
        ("galho", "arvore", "deidade"),
        ("realidade", "arvore", "deidade"),
        ("dimensao", "galho", "galho"),
        ("reino", "dimensao", "dimensao"),
        ("mundo", "dimensao", "dimensao"),
    ]
    por_id = {e["id"]: e for e in entradas}
    for entrada in entradas:
        for tipo, campo, tipo_alvo in regras:
            if entrada["tipo"] != tipo:
                continue
            alvo = entrada["conteudo"].get(campo)
            if not isinstance(alvo, str):
                continue
            if alvo not in ids:
                erros.append(f"{entrada['id']}.{campo} aponta pra '{alvo}', que nao existe")
            elif por_id[alvo]["tipo"] not in (tipo_alvo, "realidade" if tipo_alvo == "galho" else tipo_alvo):
                erros.append(
                    f"{entrada['id']}.{campo} aponta pra '{alvo}', "
                    f"que e '{por_id[alvo]['tipo']}' e deveria ser '{tipo_alvo}'"
                )
    return erros


def gerar(entradas: list[dict]) -> str:
    tipos = " | ".join(f"'{t}'" for t in TIPOS_VALIDOS)
    corpo = json.dumps(entradas, ensure_ascii=False, indent=2)
    # Reindenta o array pra ficar alinhado dentro da declaracao do const.
    corpo = "\n".join(("  " + linha) if linha else linha for linha in corpo.splitlines()).strip()
    return (
        "// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n"
        "// Execute python scripts/buildMundo.py para atualizar.\n"
        "// Fonte: data/mundo/**/*.json (campos com prefixo '_' sao anotacoes e nao entram aqui).\n"
        "\n"
        f"export type LoreType = {tipos};\n"
        "\n"
        "export interface LoreEntry {\n"
        "  id: string;\n"
        "  tipo: LoreType;\n"
        "  titulo: string;\n"
        "  revelado?: boolean;\n"
        "  conteudo: Record<string, string | string[]>;\n"
        "}\n"
        "\n"
        f"export const MUNDO_CATALOG: LoreEntry[] = {corpo};\n"
    )


def main() -> int:
    entradas = coletar()

    erros = validar_referencias(entradas)
    if erros:
        print("Referencias quebradas na cascata:", file=sys.stderr)
        for erro in erros:
            print(f"  - {erro}", file=sys.stderr)
        return 1

    saida = gerar(entradas)

    if "--check" in sys.argv:
        atual = DESTINO.read_text(encoding="utf-8") if DESTINO.exists() else ""
        if atual != saida:
            print("mundoCatalog.ts esta dessincronizado. Rode: python scripts/buildMundo.py", file=sys.stderr)
            return 1
        print(f"OK - {len(entradas)} entradas, sincronizado.")
        return 0

    DESTINO.write_text(saida, encoding="utf-8", newline="\n")
    contagem: dict[str, int] = {}
    for entrada in entradas:
        contagem[entrada["tipo"]] = contagem.get(entrada["tipo"], 0) + 1
    print(f"{DESTINO.relative_to(RAIZ)} gerado com {len(entradas)} entradas:")
    for tipo, n in sorted(contagem.items()):
        print(f"  {tipo:12} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
