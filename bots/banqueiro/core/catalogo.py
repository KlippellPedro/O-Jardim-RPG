"""
Catálogo do Banqueiro. Em produção, as entradas vêm do PostgreSQL central.
O leitor de JSON permanece somente para semear um banco vazio e para testes.

Aceita:
  - um arquivo com UMA entrada:  {tipo,id,titulo,conteudo}
  - um pacote:                    {"entradas": [ {…}, {…} ]}
  - moedas:                       {"moedas": [ {…} ]}  (ignoradas aqui — moeda
                                  é tratada na carteira, não no catálogo)
Campos que começam com "_" (ex.: "_exemplos") são anotações e são ignorados,
igual ao site.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .economia import normalizar

TIPOS_VALIDOS = {"arma", "armadura", "equipamento", "veiculo", "monstro", "drop"}
RARIDADES = ["comum", "incomum", "raro", "epico", "lendario"]

# tipo -> categoria (mesmo mapa de src/loja/config/categorias.js)
CATEGORIA_DE = {
    "arma": "arsenal", "armadura": "arsenal", "equipamento": "arsenal",
    "veiculo": "veiculos", "monstro": "bestiario", "drop": "drops",
}
ACAO_DA_CATEGORIA = {
    "arsenal": "Comprar", "veiculos": "Comprar",
    "drops": "Comprar", "bestiario": "Contratar",
}


def normalizar_raridade(valor: object) -> str:
    n = normalizar(valor)
    return n if n in RARIDADES else "comum"


class Item:
    def __init__(self, tipo: str, id: str, titulo: str, conteudo: dict):
        self.tipo = tipo
        self.id = id
        self.titulo = titulo
        self.conteudo = conteudo or {}

    @property
    def raridade(self) -> str:
        return normalizar_raridade(self.conteudo.get("raridade"))

    @property
    def preco(self):
        return self.conteudo.get("preco")

    @property
    def categoria(self) -> Optional[str]:
        return CATEGORIA_DE.get(self.tipo)

    @property
    def acao(self) -> str:
        return ACAO_DA_CATEGORIA.get(self.categoria or "", "Comprar")

    @property
    def atributos(self) -> List[str]:
        a = self.conteudo.get("atributos")
        return [str(x) for x in a] if isinstance(a, list) else []

    @property
    def descricao(self) -> str:
        return str(self.conteudo.get("descricao", "")).strip()

    @property
    def imagem(self) -> Optional[str]:
        valor = self.conteudo.get("imagem")
        texto = str(valor).strip() if valor else ""
        return texto or None

    def __repr__(self) -> str:
        return f"<Item {self.id} ({self.tipo})>"


def validar_entrada(e: object) -> Optional[str]:
    if not isinstance(e, dict):
        return "entrada inválida"
    if e.get("tipo") not in TIPOS_VALIDOS:
        return f'tipo desconhecido: "{e.get("tipo")}"'
    if not isinstance(e.get("id"), str) or not e["id"].strip():
        return 'faltando "id"'
    if not isinstance(e.get("titulo"), str) or not e["titulo"].strip():
        return 'faltando "titulo"'
    if not isinstance(e.get("conteudo"), dict):
        return 'faltando "conteudo"'
    return None


def _extrair_entradas(dados: object) -> Optional[List[dict]]:
    """Tira a lista de entradas de um JSON no formato do site."""
    if isinstance(dados, dict) and isinstance(dados.get("entradas"), list):
        return dados["entradas"]
    if isinstance(dados, dict) and "tipo" in dados:
        return [dados]  # entrada avulsa
    if isinstance(dados, list):
        return dados
    return None


class Catalogo:
    def __init__(self):
        self._itens: Dict[str, Item] = {}

    def __len__(self) -> int:
        return len(self._itens)

    def limpar(self) -> None:
        self._itens.clear()

    def carregar_dados(self, dados: object) -> Tuple[int, List[str]]:
        """Carrega entradas de um objeto já parseado. Retorna (sucesso, erros)."""
        entradas = _extrair_entradas(dados)
        if entradas is None:
            return 0, ["formato não reconhecido (sem 'entradas' nem 'tipo')"]
        sucesso, erros = 0, []
        for i, e in enumerate(entradas):
            erro = validar_entrada(e)
            if erro:
                erros.append(f"entrada {i + 1}: {erro}")
                continue
            item = Item(e["tipo"], e["id"].strip(), e["titulo"].strip(), e.get("conteudo") or {})
            self._itens[item.id] = item
            sucesso += 1
        return sucesso, erros

    def carregar_texto(self, raw: str) -> Tuple[int, List[str]]:
        try:
            dados = json.loads(raw)
        except json.JSONDecodeError as e:
            return 0, [f"JSON malformado: {e}"]
        return self.carregar_dados(dados)

    def carregar_arquivo(self, caminho: str) -> Tuple[int, List[str]]:
        p = Path(caminho)
        if not p.exists():
            return 0, [f"arquivo não encontrado: {caminho}"]
        try:
            return self.carregar_texto(p.read_text(encoding="utf-8"))
        except OSError as e:
            return 0, [f"erro ao ler {caminho}: {e}"]

    # ── Consulta ──────────────────────────────────────────────────────────
    def get(self, item_id: str) -> Optional[Item]:
        if item_id in self._itens:
            return self._itens[item_id]
        alvo = normalizar(item_id)
        for item in self._itens.values():
            if normalizar(item.id) == alvo or normalizar(item.titulo) == alvo:
                return item
        return None

    def buscar(self, termo: str, limite: int = 25) -> List[Item]:
        alvo = normalizar(termo)
        achados = [it for it in self._itens.values() if alvo in normalizar(it.titulo) or alvo in normalizar(it.id)]
        return sorted(achados, key=lambda it: it.titulo)[:limite]

    def listar(self, tipo: Optional[str] = None) -> List[Item]:
        itens = self._itens.values()
        if tipo:
            alvo = normalizar(tipo)
            itens = [it for it in itens if normalizar(it.tipo) == alvo]
        return sorted(itens, key=lambda it: it.titulo)

    def serializar_entradas(self) -> List[dict]:
        """Serializa a memória para a carga inicial do PostgreSQL."""
        return [
            {"tipo": it.tipo, "id": it.id, "titulo": it.titulo, "conteudo": it.conteudo}
            for it in self._itens.values()
        ]
