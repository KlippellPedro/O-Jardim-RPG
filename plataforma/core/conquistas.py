"""Conquistas dos personagens (selos da ficha).

Cada conquista nasce de uma métrica que o servidor consegue provar: rolagens e
usos gravados em `registros_mesa`, sessões em que o personagem entrou, o nível
e a Fama da ficha e o saldo de Lunaris. Nada aqui é declarado pelo cliente.

O catálogo mora só neste arquivo: a API devolve nome, descrição e raridade, e a
tela não guarda cópia. Ao criar uma conquista nova, rode também
`python tools/gerar-voz-sabio.py` para o Grande Sábio ganhar a fala dela.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

from core.discord_avisos import avisar_discord, texto_selo

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
    # Selo escondido: enquanto não sai, a tela só vê "uma lenda por derrubar", sem nome nem pista.
    secreta: bool = False


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
    # Nível total. Do 60 em diante cada uma marca um patamar novo (as chaves
    # batem com data/ficha/progressao-niveis.json, e um teste confere): a
    # comemoração é o aviso de "outro patamar", que aparece e some sozinho.
    Conquista("nivel_5", "Pé na Estrada", "Chegue ao nível 5.", "nivel", 5, "comum", "trofeu"),
    Conquista("nivel_10", "Meio Caminho", "Chegue ao nível 10.", "nivel", 10, "rara", "trofeu"),
    Conquista("nivel_15", "Veterano do Jardim", "Chegue ao nível 15.", "nivel", 15, "rara", "trofeu"),
    Conquista("nivel_20", "Ápice", "Chegue ao nível 20.", "nivel", 20, "lendaria", "trofeu"),
    Conquista("nivel_30", "Passo Firme", "Chegue ao nível 30.", "nivel", 30, "rara", "trofeu"),
    Conquista("nivel_40", "Nome que Pesa", "Chegue ao nível 40.", "nivel", 40, "rara", "trofeu"),
    Conquista("nivel_50", "Metade de Cem", "Chegue ao nível 50.", "nivel", 50, "lendaria", "trofeu"),
    Conquista(
        "nivel_60", "Fora do Padrão",
        "Chegue ao nível 60. As regras padrão terminam aqui: daqui em diante é outro patamar.",
        "nivel", 60, "lendaria", "montanha",
    ),
    Conquista("nivel_100", "Três Dígitos", "Chegue ao nível 100. Outro patamar.", "nivel", 100, "lendaria", "montanha"),
    Conquista("nivel_150", "Além da Conta", "Chegue ao nível 150. Outro patamar.", "nivel", 150, "lendaria", "montanha"),
    Conquista("nivel_250", "Fora do Mapa", "Chegue ao nível 250. Outro patamar.", "nivel", 250, "lendaria", "montanha"),
    Conquista("nivel_500", "Sem Teto", "Chegue ao nível 500. Outro patamar.", "nivel", 500, "lendaria", "montanha"),
    # Classe: o maior nível numa classe só. O 20 é onde ela termina de entregar
    # recompensas escritas; do 21 ao 50 vale a Maestria (data/ficha/maestria-classe.json).
    Conquista("classe_20", "Ofício Completo", "Chegue ao nível 20 em uma classe.", "classe_max", 20, "rara", "medalha"),
    Conquista("classe_30", "Mão de Mestre", "Chegue ao nível 30 em uma classe.", "classe_max", 30, "rara", "medalha"),
    Conquista("classe_40", "Sem Segredos", "Chegue ao nível 40 em uma classe.", "classe_max", 40, "rara", "medalha"),
    Conquista("classe_50", "Maestria Plena", "Chegue ao nível 50 em uma classe.", "classe_max", 50, "lendaria", "medalha"),
    # Fama
    Conquista("nome_conhecido", "Nome Conhecido", "Alcance Fama 3.", "fama", 3, "rara", "fama"),
    Conquista("lenda_viva", "Lenda Viva", "Alcance Fama 5.", "fama", 5, "lendaria", "fama"),
    # Dinheiro (Lunaris)
    Conquista("bolso_cheio", "Bolso Cheio", "Guarde 3.000 Lunaris ao mesmo tempo.", "lunaris", 3000, "comum", "moedas"),
    Conquista("fortuna", "Fortuna", "Guarde 30.000 Lunaris ao mesmo tempo.", "lunaris", 30000, "rara", "moedas"),
)



def _data_root() -> Path:
    """Mesma resolução de plataforma/main.py. Este arquivo também é lido sozinho por
    tools/gerar-voz-sabio.py, então não importa nenhum outro módulo do pacote."""
    app_root = Path(__file__).resolve().parent.parent
    local = app_root / "data"
    return local if local.exists() else app_root.parent / "data"


@lru_cache(maxsize=1)
def carregar_lendas() -> tuple[dict, ...]:
    """As lendas do Livro da Verdade (data/bestiario/lendas-v1.json, só do servidor)."""
    try:
        dados = json.loads((_data_root() / "bestiario" / "lendas-v1.json").read_text(encoding="utf-8")).get("lendas", [])
    except (OSError, json.JSONDecodeError):
        return ()
    return tuple(item for item in dados if isinstance(item, dict) and item.get("id") and item.get("nome"))


def chave_do_selo(monstro_id: str) -> str:
    return f"matador_{str(monstro_id).replace('-', '_')}"


# Um selo "Matador de ..." por lenda, mais um para o primeiro encontro com uma Deidade.
# Quem estava na mesa quando a lenda caiu ganha o selo (core/lendas.py grava a queda).
SELOS_DAS_LENDAS: tuple[Conquista, ...] = tuple(
    Conquista(
        chave_do_selo(lenda["id"]),
        f"Matador de {lenda['nome']}",
        f"Esteja na mesa quando {lenda['nome']}, {lenda['epiteto']}, cair.",
        f"lenda:{lenda['id']}",
        1,
        "lendaria",
        "lenda",
        secreta=True,
    )
    for lenda in sorted(carregar_lendas(), key=lambda item: (item.get("vd") or 0, item["nome"]))
)
SELO_DA_DEIDADE = Conquista(
    "cara_a_cara_com_um_deus",
    "Cara a Cara com um Deus",
    "Esteja na mesa quando o grupo encara uma Deidade pela primeira vez.",
    "deidades_encaradas",
    1,
    "lendaria",
    "olho",
)

CATALOGO = CATALOGO + (SELO_DA_DEIDADE,) + SELOS_DAS_LENDAS

POR_CHAVE = {conquista.chave: conquista for conquista in CATALOGO}

MASCARA_DO_SELO_SECRETO = {
    "nome": "Lenda por derrubar",
    "descricao": "Cada lenda do Jardim guarda um selo, e o nome dele só aparece depois que ela cai.",
}


def _inteiro(valor) -> int:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        return 0
    return int(valor)


def _maior_nivel_de_classe(ficha: dict) -> int:
    """O maior nível numa classe só. Ficha antiga, sem a lista de classes, tem
    uma classe só e o nível dela é o nível da ficha."""
    classes = ficha.get("classes")
    if isinstance(classes, list) and classes:
        return max((_inteiro(item.get("nivel")) for item in classes if isinstance(item, dict)), default=0)
    return _inteiro(ficha.get("nivel"))


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

    from psycopg.types.json import Jsonb  # import tardio: tools/gerar-voz-sabio.py lê este arquivo sem o psycopg

    valores_das_lendas: dict[str, int] = {}
    encaradas = 0
    for linha in connection.execute(
        "SELECT monstro_id, tipo FROM campanha_lendas WHERE personagens @> %s",
        (Jsonb([{"id": str(personagem_id)}]),),
    ).fetchall():
        if linha["tipo"] == "queda":
            valores_das_lendas[f"lenda:{linha['monstro_id']}"] = 1
        else:
            encaradas = 1

    return {
        **valores_das_lendas,
        "deidades_encaradas": encaradas,
        "rolagens": int(registros["rolagens"]),
        "criticos": int(registros["criticos"]),
        "falhas": int(registros["falhas"]),
        "dano_maximo": int(registros["dano_maximo"]),
        "usos": int(registros["usos"]),
        "sessoes": int(sessoes["total"]),
        "nivel": _inteiro(ficha.get("nivel")),
        "classe_max": _maior_nivel_de_classe(ficha),
        "fama": _inteiro(ficha.get("fama")),
        "lunaris": int(lunaris["total"]),
    }


def _anunciar_selos(connection, personagem_id, selos: list) -> None:
    """Destaque da mesa no Discord: só selos públicos, de personagens de jogadores.
    Selo secreto nunca sai (o texto de uma lenda de pé é segredo da mesa) e o selo
    de nível não repete o aviso de subida de nível."""
    # Fora: secretos; o de nível (já há o aviso de subida); o da Deidade (spoiler de lore de
    # quem comanda a mesa); e os comuns, que um jogador novo ganha em enxurrada nas primeiras sessões.
    visiveis = [
        c for c in selos
        if not c.secreta and c.metrica not in {"nivel", "deidades_encaradas"} and c.raridade != "comum"
    ]
    if not visiveis:
        return
    try:
        linha = connection.execute(
            """
            SELECT p.campanha_id, p.nome, m.papel
            FROM personagens p
            LEFT JOIN membros_campanha m
              ON m.campanha_id = p.campanha_id AND m.usuario_id = p.dono_usuario_id AND m.status = 'ativo'
            WHERE p.id = %s
            """,
            (personagem_id,),
        ).fetchone()
        if not linha or linha["papel"] != "jogador":
            return
        for selo in visiveis:
            avisar_discord(
                connection, linha["campanha_id"], "selo", texto_selo(linha["nome"], selo.nome, selo.descricao)
            )
    except Exception:  # noqa: BLE001 - destaque é cortesia, nunca derruba a conquista
        logger.exception("falha ao anunciar selo do personagem %s", personagem_id)


def avaliar(connection, personagem_id, *, gravar: bool = True) -> dict:
    """Avalia, grava as conquistas novas e devolve o catálogo com o progresso.

    `novas` traz só o que acabou de ser desbloqueado nesta chamada, para a tela
    comemorar uma vez. Chamadas repetidas não repetem a comemoração.

    Com `gravar=False` (quem consulta não é o dono da ficha: Mestre, assistente,
    vínculo somente leitura) nada é gravado e `novas` vem vazio. O selo aparece
    como conquistado, mas a comemoração fica guardada para o dono, que é quem
    precisa vê-la.
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
        if not gravar:
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

    # Tudo que desbloqueou fica gravado, mas a comemoração é uma só por métrica:
    # a maior. Quem abre pela primeira vez uma ficha de nível 100 (um NPC do
    # Mestre, por exemplo) leva um aviso, não uma fila de treze.
    maiores: dict[str, str] = {}
    for chave in novas:
        conquista = POR_CHAVE[chave]
        atual = maiores.get(conquista.metrica)
        if atual is None or conquista.minimo > POR_CHAVE[atual].minimo:
            maiores[conquista.metrica] = chave
    anunciadas = set(maiores.values())
    novas = [chave for chave in novas if chave in anunciadas]
    if novas:
        _anunciar_selos(connection, personagem_id, [POR_CHAVE[chave] for chave in novas])

    catalogo = []
    escondidas = 0
    for conquista in CATALOGO:
        item = asdict(conquista)
        atual = valores.get(conquista.metrica, 0)
        # Sem gravar, o que já bate a meta conta como conquistado na tela.
        item["desbloqueada"] = conquista.chave in ja or (not gravar and atual >= conquista.minimo)
        if conquista.secreta and not item["desbloqueada"]:
            # Nada que denuncie qual lenda é: nem nome, nem a chave, nem a métrica.
            escondidas += 1
            item.update(MASCARA_DO_SELO_SECRETO, chave=f"lenda-por-derrubar-{escondidas}", metrica="lenda")
        item["desbloqueada_em"] = ja.get(conquista.chave)
        item["progresso"] = {"atual": min(atual, conquista.minimo), "minimo": conquista.minimo}
        catalogo.append(item)
    return {
        "catalogo": catalogo,
        "novas": [POR_CHAVE[chave].chave for chave in novas],
        "total": len(CATALOGO),
        "desbloqueadas": sum(1 for item in catalogo if item["desbloqueada"]),
    }


def avaliar_sem_quebrar(connection, personagem_id, usuario_id=None) -> list[dict]:
    """Versão para dentro de outra operação (rolagem, uso): nunca derruba quem
    chamou. Usa um savepoint, senão um erro aqui deixaria a transação inteira
    da rolagem inutilizável. Devolve só os dados das conquistas novas.

    Com `usuario_id`, só avalia quando ele é o dono da ficha. Um Mestre que rola
    em nome de um jogador não gasta a comemoração dele: ela espera o dono abrir
    a ficha ou rolar."""
    if not personagem_id:
        return []
    if usuario_id is not None:
        dono = connection.execute(
            "SELECT 1 FROM personagens WHERE id=%s AND dono_usuario_id=%s",
            (personagem_id, usuario_id),
        ).fetchone()
        if not dono:
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
