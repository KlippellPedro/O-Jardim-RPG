"""Conquistas dos personagens (selos da ficha).

Cada conquista nasce de uma métrica que o servidor consegue provar: rolagens e
usos gravados em `registros_mesa`, sessões em que o personagem entrou, o nível
e a Fama da ficha e o saldo de Lunaris. Nada aqui é declarado pelo cliente.

O catálogo mora só neste arquivo: a API devolve nome, descrição e raridade, e a
tela não guarda cópia. Ao criar uma conquista nova, rode também
`python tools/gerar-voz-sabio.py` para o Grande Sábio ganhar a fala dela.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass

logger = logging.getLogger("jardim-plataforma")


@dataclass(frozen=True)
class Conquista:
    chave: str
    nome: str
    descricao: str
    metrica: str
    minimo: int
    raridade: str  # comum | rara | lendaria
    icone: str


CATALOGO: tuple[Conquista, ...] = (
    # Rolagens
    Conquista("primeira_rolagem", "Primeira Rolagem", "Role um dado pela primeira vez.", "rolagens", 1, "comum", "dados"),
    Conquista("mao_calejada", "Mão Calejada", "Faça 50 rolagens.", "rolagens", 50, "comum", "dados"),
    Conquista("sorte_lancada", "Sorte Lançada", "Faça 200 rolagens.", "rolagens", 200, "rara", "dados"),
    # Críticos e falhas
    Conquista("toque_de_sorte", "Toque de Sorte", "Tire um 20 natural.", "criticos", 1, "comum", "estrela"),
    Conquista("bencao_dos_dados", "Bênção dos Dados", "Tire cinco 20 naturais.", "criticos", 5, "rara", "estrela"),
    Conquista("tropeco_epico", "Tropeço Épico", "Tire um 1 natural.", "falhas", 1, "comum", "caveira"),
    Conquista("mestre_do_desastre", "Mestre do Desastre", "Tire cinco 1 naturais.", "falhas", 5, "rara", "caveira"),
    # Dano
    Conquista("golpe_pesado", "Golpe Pesado", "Cause 30 ou mais de dano numa só rolagem.", "dano_maximo", 30, "comum", "espadas"),
    Conquista("golpe_devastador", "Golpe Devastador", "Cause 60 ou mais de dano numa só rolagem.", "dano_maximo", 60, "rara", "espadas"),
    # Mesa
    Conquista("na_mesa", "Na Mesa", "Participe da sua primeira sessão.", "sessoes", 1, "comum", "grupo"),
    Conquista("frequentador", "Frequentador", "Participe de cinco sessões.", "sessoes", 5, "comum", "grupo"),
    Conquista("veterano_de_mesa", "Veterano de Mesa", "Participe de vinte sessões.", "sessoes", 20, "rara", "grupo"),
    # Poderes
    Conquista("primeiro_poder", "Primeiro Poder", "Use um poder, habilidade ou magia.", "usos", 1, "comum", "brilho"),
    Conquista("arsenal_em_uso", "Arsenal em Uso", "Use poderes, habilidades ou magias 25 vezes.", "usos", 25, "rara", "brilho"),
    # Nível
    Conquista("nivel_5", "Pé na Estrada", "Chegue ao nível 5.", "nivel", 5, "comum", "trofeu"),
    Conquista("nivel_10", "Meio Caminho", "Chegue ao nível 10.", "nivel", 10, "rara", "trofeu"),
    Conquista("nivel_15", "Veterano do Jardim", "Chegue ao nível 15.", "nivel", 15, "rara", "trofeu"),
    Conquista("nivel_20", "Ápice", "Chegue ao nível 20.", "nivel", 20, "lendaria", "trofeu"),
    # Fama
    Conquista("nome_conhecido", "Nome Conhecido", "Alcance Fama 3.", "fama", 3, "rara", "fama"),
    Conquista("lenda_viva", "Lenda Viva", "Alcance Fama 5.", "fama", 5, "lendaria", "fama"),
    # Dinheiro (Lunaris)
    Conquista("bolso_cheio", "Bolso Cheio", "Guarde 3.000 Lunaris ao mesmo tempo.", "lunaris", 3000, "comum", "moedas"),
    Conquista("fortuna", "Fortuna", "Guarde 30.000 Lunaris ao mesmo tempo.", "lunaris", 30000, "rara", "moedas"),
)

POR_CHAVE = {conquista.chave: conquista for conquista in CATALOGO}


def _inteiro(valor) -> int:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return 0
    return int(valor)


def metricas(connection, personagem_id) -> dict[str, int]:
    """Tudo que as conquistas medem, calculado no banco."""
    personagem = connection.execute(
        "SELECT ficha FROM personagens WHERE id=%s", (personagem_id,)
    ).fetchone()
    ficha = personagem["ficha"] if personagem and isinstance(personagem["ficha"], dict) else {}

    registros = connection.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE tipo='rolagem') AS rolagens,
            COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'critico_natural'='true') AS criticos,
            COUNT(*) FILTER (WHERE tipo='rolagem' AND detalhes->>'falha_natural'='true') AS falhas,
            COALESCE(MAX(resultado) FILTER (WHERE tipo='dano'), 0) AS dano_maximo,
            COUNT(*) FILTER (WHERE tipo IN ('poder', 'habilidade', 'magia')) AS usos
        FROM registros_mesa
        WHERE personagem_id=%s
        """,
        (personagem_id,),
    ).fetchone()
    sessoes = connection.execute(
        """
        SELECT COUNT(DISTINCT sp.sessao_id) AS total
        FROM sessao_participantes sp
        JOIN sessoes_mesa s ON s.id = sp.sessao_id
        WHERE sp.personagem_id=%s AND s.status IN ('aberta', 'encerrada')
        """,
        (personagem_id,),
    ).fetchone()
    lunaris = connection.execute(
        """
        SELECT COALESCE(SUM(saldo), 0) AS total FROM saldos_personagem
        WHERE personagem_id=%s AND lower(moeda)='lunaris'
        """,
        (personagem_id,),
    ).fetchone()

    return {
        "rolagens": int(registros["rolagens"]),
        "criticos": int(registros["criticos"]),
        "falhas": int(registros["falhas"]),
        "dano_maximo": int(registros["dano_maximo"]),
        "usos": int(registros["usos"]),
        "sessoes": int(sessoes["total"]),
        "nivel": _inteiro(ficha.get("nivel")),
        "fama": _inteiro(ficha.get("fama")),
        "lunaris": int(lunaris["total"]),
    }


def avaliar(connection, personagem_id) -> dict:
    """Avalia, grava as conquistas novas e devolve o catálogo com o progresso.

    `novas` traz só o que acabou de ser desbloqueado nesta chamada, para a tela
    comemorar uma vez. Chamadas repetidas não repetem a comemoração.
    """
    valores = metricas(connection, personagem_id)
    ja = {
        linha["chave"]: linha["desbloqueada_em"]
        for linha in connection.execute(
            "SELECT chave, desbloqueada_em FROM personagem_conquistas WHERE personagem_id=%s",
            (personagem_id,),
        ).fetchall()
    }

    novas: list[str] = []
    for conquista in CATALOGO:
        if conquista.chave in ja or valores.get(conquista.metrica, 0) < conquista.minimo:
            continue
        inserida = connection.execute(
            """
            INSERT INTO personagem_conquistas (personagem_id, chave)
            VALUES (%s, %s)
            ON CONFLICT (personagem_id, chave) DO NOTHING
            RETURNING desbloqueada_em
            """,
            (personagem_id, conquista.chave),
        ).fetchone()
        if inserida:
            ja[conquista.chave] = inserida["desbloqueada_em"]
            novas.append(conquista.chave)

    catalogo = []
    for conquista in CATALOGO:
        item = asdict(conquista)
        atual = valores.get(conquista.metrica, 0)
        item["desbloqueada"] = conquista.chave in ja
        item["desbloqueada_em"] = ja.get(conquista.chave)
        item["progresso"] = {"atual": min(atual, conquista.minimo), "minimo": conquista.minimo}
        catalogo.append(item)
    return {
        "catalogo": catalogo,
        "novas": [POR_CHAVE[chave].chave for chave in novas],
        "total": len(CATALOGO),
        "desbloqueadas": len(ja),
    }


def avaliar_sem_quebrar(connection, personagem_id) -> list[dict]:
    """Versão para dentro de outra operação (rolagem, uso): nunca derruba quem
    chamou. Usa um savepoint, senão um erro aqui deixaria a transação inteira
    da rolagem inutilizável. Devolve só os dados das conquistas novas."""
    if not personagem_id:
        return []
    try:
        with connection.transaction():
            resultado = avaliar(connection, personagem_id)
    except Exception:  # noqa: BLE001 - conquista é enfeite, jamais bloqueia o jogo
        logger.exception("falha ao avaliar conquistas do personagem %s", personagem_id)
        return []
    por_chave = {item["chave"]: item for item in resultado["catalogo"]}
    return [
        {
            "chave": chave,
            "nome": por_chave[chave]["nome"],
            "descricao": por_chave[chave]["descricao"],
            "raridade": por_chave[chave]["raridade"],
            "icone": por_chave[chave]["icone"],
        }
        for chave in resultado["novas"]
    ]
