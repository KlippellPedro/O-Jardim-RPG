"""Busca local e estritamente extrativa nas regras publicadas de O Jardim.

O Gerente não usa um modelo generativo: ele localiza e apresenta trechos das
fontes versionadas. Assim, uma pergunta desconhecida termina em "confirme com
o mestre" em vez de produzir uma regra que não existe.
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

ARQUIVOS_MARKDOWN = (
    "docs/regras/fundamentos-v1.md",
    "docs/regras/balanceamento-v0.2.md",
)
ARQUIVOS_JSON = (
    "data/ficha/classes.json",
    "data/ficha/legados.json",
    "data/ficha/legados-novos.json",
    "data/ficha/pericias.json",
    "data/ficha/racas.json",
)

STOPWORDS = {
    "a", "ao", "aos", "as", "ate", "com", "como", "da", "das", "de", "do", "dos",
    "e", "ela", "ele", "em", "essa", "esse", "esta", "este", "eu", "isso", "ja",
    "me", "meu", "na", "nas", "no", "nos", "o", "os", "ou", "para", "pela", "pelo",
    "por", "qual", "que", "se", "sem", "ser", "sua", "tem", "ter", "um", "uma",
}
SINONIMOS = {
    "hp": ("vida",),
    "pv": ("vida",),
    "mp": ("mana",),
    "pm": ("mana",),
    "skill": ("habilidade",),
    "skills": ("habilidade",),
    "classe": ("classes",),
    "raca": ("raças",),
    "morrer": ("morrendo", "vida"),
}


class FontesAusentes(RuntimeError):
    """O pacote foi montado sem os arquivos oficiais necessários."""


@dataclass(frozen=True)
class Trecho:
    fonte: str
    titulo: str
    texto: str
    categoria: str

    @property
    def citacao(self) -> str:
        return f"{self.fonte} · {self.titulo}"


@dataclass(frozen=True)
class Resultado:
    trecho: Trecho
    pontuacao: float


def normalizar(texto: str) -> str:
    decomposicao = unicodedata.normalize("NFKD", texto.casefold())
    sem_acentos = "".join(c for c in decomposicao if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", sem_acentos).strip()


def termos(texto: str, *, expandir: bool = True) -> list[str]:
    encontrados = [t for t in normalizar(texto).split() if len(t) >= 2 and t not in STOPWORDS]
    if not expandir:
        return encontrados
    expandidos = list(encontrados)
    for termo in encontrados:
        expandidos.extend(normalizar(s).strip() for s in SINONIMOS.get(termo, ()))
    return expandidos


def descobrir_raiz_fontes() -> Path:
    pasta_bot = Path(__file__).resolve().parent.parent
    candidatos = (pasta_bot / "fontes", pasta_bot.parent.parent)
    for candidato in candidatos:
        if all((candidato / relativo).is_file() for relativo in ARQUIVOS_MARKDOWN + ARQUIVOS_JSON):
            return candidato
    esperados = ", ".join(ARQUIVOS_MARKDOWN + ARQUIVOS_JSON)
    raise FontesAusentes(f"Não achei as fontes publicadas do Gerente: {esperados}")


def _valor_texto(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "sim" if valor else "não"
    if isinstance(valor, (str, int, float)):
        return str(valor)
    if isinstance(valor, list):
        partes = [_valor_texto(item) for item in valor]
        return "; ".join(parte for parte in partes if parte)
    if isinstance(valor, dict):
        partes = []
        for chave, item in valor.items():
            texto = _valor_texto(item)
            if texto:
                partes.append(f"{chave.replace('_', ' ')}: {texto}")
        return "; ".join(partes)
    return str(valor)


def _campos_texto(objeto: dict, ignorar: Iterable[str] = ()) -> str:
    ignorados = set(ignorar)
    linhas = []
    for chave, valor in objeto.items():
        if chave in ignorados:
            continue
        texto = _valor_texto(valor)
        if texto:
            rotulo = chave.replace("_", " ").capitalize()
            linhas.append(f"{rotulo}: {texto}.")
    return "\n".join(linhas)


class BaseConhecimento:
    def __init__(self, raiz: Optional[Path] = None):
        self.raiz = Path(raiz) if raiz else descobrir_raiz_fontes()
        self.trechos: list[Trecho] = []
        self._carregar_markdown()
        self._carregar_json()
        if not self.trechos:
            raise FontesAusentes("As fontes foram encontradas, mas não produziram nenhum trecho pesquisável.")
        self._preparar_indice()

    @property
    def fontes(self) -> tuple[str, ...]:
        return tuple(sorted({trecho.fonte for trecho in self.trechos}))

    def _adicionar(self, fonte: str, titulo: str, texto: str, categoria: str) -> None:
        texto_limpo = texto.strip()
        if len(texto_limpo) < 8:
            return
        self.trechos.append(Trecho(fonte, titulo.strip() or "Visão geral", texto_limpo, categoria))

    def _carregar_markdown(self) -> None:
        for relativo in ARQUIVOS_MARKDOWN:
            caminho = self.raiz / relativo
            if not caminho.is_file():
                raise FontesAusentes(f"Fonte obrigatória ausente: {relativo}")
            linhas = caminho.read_text(encoding="utf-8-sig").splitlines()
            hierarquia: list[str] = []
            corpo: list[str] = []

            def salvar() -> None:
                if hierarquia and corpo:
                    self._adicionar(relativo, " › ".join(hierarquia), "\n".join(corpo), "regras")

            for linha in linhas:
                cabecalho = re.match(r"^(#{1,6})\s+(.+?)\s*$", linha)
                if cabecalho:
                    salvar()
                    corpo = []
                    nivel = len(cabecalho.group(1))
                    hierarquia = hierarquia[: nivel - 1]
                    hierarquia.append(cabecalho.group(2).strip())
                else:
                    corpo.append(linha)
            salvar()

    def _ler_json(self, relativo: str):
        caminho = self.raiz / relativo
        if not caminho.is_file():
            raise FontesAusentes(f"Fonte obrigatória ausente: {relativo}")
        return json.loads(caminho.read_text(encoding="utf-8-sig"))

    def _carregar_json(self) -> None:
        fonte_classes = "data/ficha/classes.json"
        for classe in self._ler_json(fonte_classes):
            self._adicionar(fonte_classes, classe.get("titulo", classe.get("id", "Classe")), _campos_texto(classe), "classe")

        fonte_racas = "data/ficha/racas.json"
        for raca in self._ler_json(fonte_racas):
            titulo_raca = raca.get("titulo", raca.get("id", "Raça"))
            self._adicionar(fonte_racas, titulo_raca, _campos_texto(raca, {"caracteristicas"}), "raça")
            for caracteristica in raca.get("caracteristicas", []):
                titulo = caracteristica.get("titulo", caracteristica.get("id", "Característica"))
                self._adicionar(
                    fonte_racas,
                    f"{titulo_raca} › {titulo}",
                    _campos_texto(caracteristica),
                    "raça",
                )

        fonte_legados = "data/ficha/legados.json"
        legados = self._ler_json(fonte_legados)
        self._adicionar(fonte_legados, "Sobre os Legados", _campos_texto(legados, {"legados"}), "legado")
        for legado in legados.get("legados", []):
            self._adicionar(fonte_legados, legado.get("titulo", legado.get("id", "Legado")), _campos_texto(legado), "legado")

        fonte_novos = "data/ficha/legados-novos.json"
        novos = self._ler_json(fonte_novos)
        self._adicionar(fonte_novos, "Legados da versão oficial", _campos_texto(novos, {"novos"}), "legado")
        for legado in novos.get("novos", []):
            self._adicionar(fonte_novos, legado.get("titulo", legado.get("id", "Legado")), _campos_texto(legado), "legado")

        fonte_pericias = "data/ficha/pericias.json"
        pericias = self._ler_json(fonte_pericias)
        self._adicionar(
            fonte_pericias,
            "Notas sobre perícias",
            _campos_texto(pericias, {"pericias", "nao_sao_pericias"}),
            "perícia",
        )
        for item in pericias.get("nao_sao_pericias", []):
            self._adicionar(fonte_pericias, item.get("titulo", item.get("id", "Não é perícia")), _campos_texto(item), "perícia")
        for pericia in pericias.get("pericias", []):
            self._adicionar(fonte_pericias, pericia.get("titulo", pericia.get("id", "Perícia")), _campos_texto(pericia), "perícia")

    def _preparar_indice(self) -> None:
        self._contagens: list[Counter[str]] = []
        self._titulos_normalizados: list[str] = []
        self._textos_normalizados: list[str] = []
        frequencia_documentos: Counter[str] = Counter()
        for trecho in self.trechos:
            contagem = Counter(termos(f"{trecho.titulo} {trecho.texto}", expandir=False))
            self._contagens.append(contagem)
            self._titulos_normalizados.append(normalizar(trecho.titulo))
            self._textos_normalizados.append(normalizar(trecho.texto))
            frequencia_documentos.update(contagem.keys())
        total = len(self.trechos)
        self._idf = {
            termo: math.log((total + 1) / (frequencia + 1)) + 1
            for termo, frequencia in frequencia_documentos.items()
        }

    def buscar(self, consulta: str, limite: int = 3) -> list[Resultado]:
        consulta_normalizada = normalizar(consulta)
        consulta_termos = list(dict.fromkeys(termos(consulta)))
        if not consulta_termos or limite <= 0:
            return []

        resultados = []
        for indice, trecho in enumerate(self.trechos):
            contagem = self._contagens[indice]
            titulo = self._titulos_normalizados[indice]
            texto = self._textos_normalizados[indice]
            presentes = [termo for termo in consulta_termos if contagem.get(termo)]
            if not presentes:
                continue
            pontuacao = sum(
                self._idf.get(termo, 1.0) * (1 + math.log(contagem[termo]))
                for termo in presentes
            )
            pontuacao += sum(self._idf.get(termo, 1.0) * 2.5 for termo in presentes if termo in titulo.split())
            pontuacao += 4.0 * len(presentes) / len(consulta_termos)
            if consulta_normalizada and (consulta_normalizada in titulo or consulta_normalizada in texto):
                pontuacao += 6.0
            resultados.append(Resultado(trecho, pontuacao))

        resultados.sort(key=lambda item: (-item.pontuacao, item.trecho.titulo.casefold()))
        return resultados[:limite]

    def resumir(self, trecho: Trecho, consulta: str, limite: int = 820) -> str:
        """Seleciona os parágrafos mais relacionados, sem gerar texto novo."""
        blocos = [
            re.sub(r"\s+", " ", bloco).strip()
            for bloco in re.split(r"\n\s*\n", trecho.texto)
            if bloco.strip()
        ]
        q = set(termos(consulta))
        ranqueados = sorted(
            enumerate(blocos),
            key=lambda par: (-len(q.intersection(termos(par[1]))), par[0]),
        )
        escolhidos = sorted(ranqueados[:2], key=lambda par: par[0])
        resumo = "\n\n".join(bloco for _, bloco in escolhidos) if escolhidos else trecho.texto
        if len(resumo) > limite:
            resumo = resumo[: limite - 1].rsplit(" ", 1)[0] + "…"
        return resumo
