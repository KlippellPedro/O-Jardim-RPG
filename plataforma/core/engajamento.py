"""Engajamento entre sessões: contagem da próxima sessão, rank da mesa e MVP.

Só regras, sem banco nem HTTP, para dar para testar sem subir nada. Quem lê e
grava é `routers/engajamento.py`.
"""

from __future__ import annotations

from datetime import datetime, timezone



class ErroEngajamento(Exception):
    def __init__(self, mensagem: str, codigo: int = 422):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.codigo = codigo


# ------------------------------------------------------------ próxima sessão

def contagem_regressiva(proxima_em: datetime | None, agora: datetime | None = None) -> dict | None:
    """Quanto falta para a próxima sessão, em palavras que cabem num cartão."""
    if proxima_em is None:
        return None
    agora = agora or datetime.now(timezone.utc)
    if proxima_em.tzinfo is None:
        proxima_em = proxima_em.replace(tzinfo=timezone.utc)
    segundos = (proxima_em - agora).total_seconds()
    if segundos < -6 * 3600:
        return {"em": proxima_em.isoformat(), "segundos": int(segundos), "passou": True, "texto": "A data marcada já passou."}
    if segundos <= 0:
        return {"em": proxima_em.isoformat(), "segundos": int(segundos), "passou": False, "texto": "É agora!"}
    minutos = int(segundos // 60)
    horas = int(segundos // 3600)
    dias = int(segundos // 86400)
    if minutos < 60:
        minutos = max(1, minutos)
        texto = f"em {minutos} minuto{'s' if minutos != 1 else ''}"
    elif horas < 24:
        texto = f"em {horas} hora{'s' if horas != 1 else ''}"
    elif dias == 1:
        texto = "amanhã"
    else:
        texto = f"em {dias} dias"
    return {"em": proxima_em.isoformat(), "segundos": int(segundos), "passou": False, "texto": texto}


# ------------------------------------------------------------------- rank

def _plural(quantidade: int, singular: str, plural: str) -> str:
    return singular if quantidade == 1 else plural


def _milhar(numero: int) -> str:
    return f"{numero:,}".replace(",", ".")


# chave, título, campo, frase(nome, valor)
_TITULOS = (
    ("rei_do_vinte", "Rei do Vinte", "criticos",
     lambda n, v: f"{n} tirou {v} {_plural(v, 'vinte natural', 'vintes naturais')}. Os dados têm favoritos."),
    ("azarao", "Azarão Oficial", "falhas",
     lambda n, v: f"{n} tirou {v} {_plural(v, 'um natural', 'uns naturais')}. A sorte volta, prometo."),
    ("mao_pesada", "Mão Pesada", "dano_maximo",
     lambda n, v: f"O maior golpe da mesa é de {n}: {v} de dano."),
    ("maquina_de_dano", "Máquina de Dano", "dano_total",
     lambda n, v: f"{n} já causou {_milhar(v)} de dano no total."),
    ("gastador", "Gastador Sem Freio", "lunaris_gastos",
     lambda n, v: f"{n} gastou {_milhar(v)} Lunaris. A Loja agradece."),
    ("pe_de_meia", "Pé-de-Meia", "lunaris_liquido",
     lambda n, v: f"{n} guardou {_milhar(v)} Lunaris a mais do que gastou."),
    ("rolador", "Rolador Compulsivo", "rolagens",
     lambda n, v: f"{n} rolou dados {v} {_plural(v, 'vez', 'vezes')}. Ninguém segura."),
    ("conjurador", "Sempre Conjurando", "usos",
     lambda n, v: f"{n} usou poderes, habilidades ou magias {v} {_plural(v, 'vez', 'vezes')}."),
)

CAMPOS_RANK = ("rolagens", "criticos", "falhas", "dano_maximo", "dano_total", "usos", "lunaris_gastos", "lunaris_ganhos")


def montar_rank(linhas: list[dict]) -> dict:
    """Títulos de brincadeira em cima das contagens de cada personagem.

    Cada título vai para quem tem o maior número naquele campo e só se o número
    passar de zero. Empate fica com quem aparece primeiro em ordem alfabética,
    e o campo `empatados` diz quantos dividem a marca.
    """
    jogadores = []
    for linha in linhas:
        item = {"personagem_id": str(linha["personagem_id"]), "nome": linha["nome"]}
        for campo in CAMPOS_RANK:
            item[campo] = int(linha.get(campo) or 0)
        item["lunaris_liquido"] = item["lunaris_ganhos"] - item["lunaris_gastos"]
        jogadores.append(item)
    jogadores.sort(key=lambda item: (-item["rolagens"], item["nome"].casefold()))

    titulos = []
    for chave, titulo, campo, frase in _TITULOS:
        candidatos = [item for item in jogadores if item[campo] > 0]
        if not candidatos:
            continue
        melhor = max(item[campo] for item in candidatos)
        empatados = sorted((item for item in candidatos if item[campo] == melhor), key=lambda item: item["nome"].casefold())
        vencedor = empatados[0]
        titulos.append({
            "chave": chave,
            "titulo": titulo,
            "personagem_id": vencedor["personagem_id"],
            "nome": vencedor["nome"],
            "valor": melhor,
            "empatados": len(empatados),
            "frase": frase(vencedor["nome"], melhor),
        })
    return {"jogadores": jogadores, "titulos": titulos}


def resultado_mvp(votos: list[dict]) -> dict:
    """Quem levou mais votos de MVP. `votos` são `{alvo_usuario_id, alvo_nome}`."""
    contagem: dict[str, dict] = {}
    for voto in votos:
        alvo = str(voto["alvo_usuario_id"])
        registro = contagem.setdefault(alvo, {"usuario_id": alvo, "nome": voto["alvo_nome"], "votos": 0})
        registro["votos"] += 1
    ranking = sorted(contagem.values(), key=lambda item: (-item["votos"], item["nome"].casefold()))
    lider = ranking[0]["votos"] if ranking else 0
    return {
        "ranking": ranking,
        "vencedores": [item for item in ranking if item["votos"] == lider and lider > 0],
        "total_votos": len(votos),
    }
