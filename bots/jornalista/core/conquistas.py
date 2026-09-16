"""Conquistas cosméticas secretas. Critérios são propostas de design do bot."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Conquista:
    chave: str
    nome: str
    metrica: str
    minimo: int
    criterio: str


CONQUISTAS = (
    Conquista("dedos_leves", "Dedos Leves", "roubos", 1, "1 roubo bem-sucedido de carteira ou cofre"),
    Conquista("sombra_lunar", "Sombra do Banco Lunar", "roubos", 10, "10 roubos bem-sucedidos"),
    Conquista("lenda_submundo", "Lenda do Submundo", "roubos", 50, "50 roubos bem-sucedidos"),
    Conquista("chave_mestra", "Chave Mestra", "cofres", 10, "10 arrombamentos de cofre bem-sucedidos"),
    Conquista("fortuna_alheia", "Fortuna Alheia", "lunaris_roubados", 5000, "5.000 Lunaris obtidos em roubos"),
    Conquista("farejador", "Farejador de Tesouros", "baus", 10, "10 baús do Jornalista com entrega concluída"),
    Conquista("colecionador", "Colecionador de Fechaduras", "baus", 50, "50 baús do Jornalista com entrega concluída"),
    Conquista("lenda_tesouros", "Lenda dos Tesouros", "baus", 100, "100 baús do Jornalista com entrega concluída"),
    Conquista("toque_mitico", "Toque do Impossível", "baus_miticos", 1, "1 baú Mítico do Jornalista com entrega concluída"),
    Conquista("decifrador", "Decifrador do Jardim", "desafios", 5, "5 desafios do jornal resolvidos"),
    Conquista("voz_jardim", "Voz do Jardim", "entrevistas", 3, "3 entrevistas publicadas"),
    Conquista("pena_lunar", "Pena da Lua", "pautas", 3, "3 pautas de sua autoria publicadas"),
    Conquista("destino", "Queridinho do Destino", "loterias", 1, "1 vitória na Loteria Dominical"),
    Conquista("olho_rua", "Olho da Rua", "furos", 5, "5 furos comprados pelo Jornalista"),
    Conquista("cacador_lendas", "Caçador de Lendas", "capturas", 5, "5 recompensas por captura recebidas"),
)
POR_CHAVE = {c.chave: c for c in CONQUISTAS}


def avaliar(metricas: dict) -> list[Conquista]:
    return [c for c in CONQUISTAS if metricas.get(c.metrica, 0) >= c.minimo]
